const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { randomUUID } = require("crypto");
const { WebSocketServer, WebSocket } = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const DB = "./levels.json";
const LB = "./leaderboard.json";
const PS = "./persistent-servers.json";
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "512kb" }));

// ── DB helpers ────────────────────────────────────────────────
const load = () => { try { return JSON.parse(fs.readFileSync(DB, "utf8")); } catch { return []; } };
const persist = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 2));
const loadLb = () => { try { return JSON.parse(fs.readFileSync(LB, "utf8")); } catch { return []; } };
const persistLb = (d) => fs.writeFileSync(LB, JSON.stringify(d, null, 2));
const loadPs = () => { try { return JSON.parse(fs.readFileSync(PS, "utf8")); } catch { return []; } };
const persistPs = (d) => fs.writeFileSync(PS, JSON.stringify(d, null, 2));

// ── HTTP routes ───────────────────────────────────────────────
app.get("/", (req, res) => res.json({ ok: true, service: "page-climber-server" }));

app.post("/levels", (req, res) => {
  const { name, author, platforms, crates, finish, width, height, start, settings } = req.body;
  if (!name || !Array.isArray(platforms)) return res.status(400).json({ error: "Missing name or platforms" });
  const level = {
    id: randomUUID(), name: String(name).slice(0, 64),
    author: String(author || "Anonymous").slice(0, 32),
    uploadedAt: Date.now(), plays: 0,
    platforms, crates: crates || [], finish, width, height, start, settings
  };
  const levels = load();
  levels.unshift(level);
  persist(levels.slice(0, 500));
  res.json({ ok: true, id: level.id });
});

app.get("/levels", (req, res) => {
  const page = Math.max(0, parseInt(req.query.page) || 0);
  const limit = Math.min(20, parseInt(req.query.limit) || 10);
  const levels = load();
  res.json({
    levels: levels.slice(page * limit, page * limit + limit).map(({ id, name, author, uploadedAt, plays, platforms }) => ({
      id, name, author, uploadedAt, plays, platformCount: platforms.length
    })),
    total: levels.length
  });
});

app.get("/levels/:id", (req, res) => {
  const levels = load();
  const idx = levels.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  levels[idx].plays += 1;
  persist(levels);
  res.json(levels[idx]);
});

app.delete("/levels/:id", (req, res) => {
  const levels = load();
  const filtered = levels.filter((l) => l.id !== req.params.id);
  if (filtered.length === levels.length) return res.status(404).json({ error: "Not found" });
  persist(filtered);
  res.json({ ok: true });
});

app.put("/levels/:id", (req, res) => {
  const levels = load();
  const idx = levels.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const { name, author, platforms, crates, finish, width, height, start, settings } = req.body;
  if (!name || !Array.isArray(platforms)) return res.status(400).json({ error: "Missing name or platforms" });
  levels[idx] = { ...levels[idx], name: String(name).slice(0, 64), author: String(author || "Anonymous").slice(0, 32), updatedAt: Date.now(), platforms, crates: crates || [], finish, width, height, start, settings };
  persist(levels);
  res.json({ ok: true, id: levels[idx].id });
});

app.post("/leaderboard", (req, res) => {
  const { username, completions } = req.body;
  if (!username || completions === undefined) return res.status(400).json({ error: "Missing fields" });
  const entries = loadLb();
  const idx = entries.findIndex((e) => e.username === username);
  if (idx >= 0) entries[idx].completions = Math.max(entries[idx].completions, completions);
  else entries.push({ username: String(username).slice(0, 32), completions: Number(completions) || 0 });
  entries.sort((a, b) => b.completions - a.completions);
  persistLb(entries.slice(0, 100));
  res.json({ ok: true });
});

app.get("/leaderboard", (req, res) => res.json({ entries: loadLb().slice(0, 20) }));

// ── Persistent Servers ────────────────────────────────────────
app.post("/persistent-servers", (req, res) => {
  const { name, creatorName, levelData, maxPlayers } = req.body;
  if (!name || !levelData) return res.status(400).json({ error: "Missing name or levelData" });
  
  const roomCode = generateCode();
  const server = {
    id: randomUUID(),
    name: String(name).slice(0, 64),
    creatorName: String(creatorName || "Anonymous").slice(0, 32),
    createdAt: Date.now(),
    levelData,
    maxPlayers: Math.min(32, Math.max(1, maxPlayers || 10)),
    playerCount: 0,
    isRunning: true,
    lastActivityAt: Date.now(),
    roomCode: roomCode
  };
  
  const servers = loadPs();
  servers.unshift(server);
  persistPs(servers.slice(0, 100));
  
  // Create persistent room on server
  persistentRooms[roomCode] = {
    serverId: server.id,
    players: {},
    currentLevel: levelData,
    pvpEnabled: false,
    isPersistent: true,
    createdAt: Date.now()
  };
  
  res.json({ ok: true, id: server.id, roomCode });
});

app.get("/persistent-servers", (req, res) => {
  const page = Math.max(0, parseInt(req.query.page) || 0);
  const limit = Math.min(20, parseInt(req.query.limit) || 10);
  const servers = loadPs();
  
  res.json({
    servers: servers.slice(page * limit, page * limit + limit).map(({ id, name, creatorName, createdAt, playerCount, maxPlayers, roomCode }) => ({
      id, name, creatorName, createdAt, playerCount, maxPlayers, roomCode
    })),
    total: servers.length
  });
});

app.get("/persistent-servers/:id", (req, res) => {
  const servers = loadPs();
  const server = servers.find(s => s.id === req.params.id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  
  res.json({
    id: server.id,
    name: server.name,
    creatorName: server.creatorName,
    createdAt: server.createdAt,
    playerCount: server.playerCount,
    maxPlayers: server.maxPlayers,
    roomCode: server.roomCode,
    isRunning: server.isRunning
  });
});

app.delete("/persistent-servers/:id", (req, res) => {
  const servers = loadPs();
  const idx = servers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Server not found" });
  
  const server = servers[idx];
  // Find and delete the persistent room
  for (const [code, room] of Object.entries(persistentRooms)) {
    if (room.serverId === server.id) {
      delete persistentRooms[code];
    }
  }
  
  servers.splice(idx, 1);
  persistPs(servers);
  res.json({ ok: true });
});

// ── Multiplayer rooms ─────────────────────────────────────────
// rooms[code] = { players: { id: { ws, x, y, name, color, hp, dead } }, currentLevel, pvpEnabled, hostId }
// persistentRooms[code] = { serverId, players: {}, currentLevel, pvpEnabled, isPersistent: true }
const rooms = {};
const persistentRooms = {};

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms[code] ? generateCode() : code;
};

const broadcast = (room, message, excludeId) => {
  const data = JSON.stringify(message);
  Object.entries(room.players).forEach(([id, player]) => {
    if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) player.ws.send(data);
  });
};

const broadcastAll = (room, message) => {
  const data = JSON.stringify(message);
  Object.values(room.players).forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) player.ws.send(data);
  });
};

const sendSnapshot = (room) => {
  const playerList = Object.entries(room.players).map(([id, p]) => ({
    id, x: p.x, y: p.y, name: p.name, color: p.color, hp: p.hp, dead: p.dead
  }));
  Object.values(room.players).forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({ type: "snapshot", players: playerList, pvpEnabled: room.pvpEnabled }));
    }
  });
};

wss.on("connection", (ws) => {
  let playerId = null;
  let roomCode = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // ── Create room ───────────────────────────────────────────
    if (msg.type === "create") {
      roomCode = generateCode();
      playerId = randomUUID();
      rooms[roomCode] = { players: {}, currentLevel: null, pvpEnabled: false, hostId: playerId };
      rooms[roomCode].players[playerId] = {
        ws, x: 0, y: 0, name: msg.name || "Player",
        color: msg.color || "#4ade80", hp: 100, dead: false
      };
      ws.send(JSON.stringify({ type: "welcome", id: playerId, room: roomCode, isHost: true }));
      sendSnapshot(rooms[roomCode]);
      return;
    }

    // ── Join room ─────────────────────────────────────────────
    if (msg.type === "join") {
      const code = String(msg.room || "").toUpperCase().trim();
      let room = rooms[code] || persistentRooms[code];
      if (!room) { ws.send(JSON.stringify({ type: "error", message: "Room not found" })); return; }
      roomCode = code;
      playerId = randomUUID();
      room.players[playerId] = {
        ws, x: 0, y: 0, name: msg.name || "Player",
        color: msg.color || "#4ade80", hp: 100, dead: false
      };
      const isPersistent = room.isPersistent || false;
      ws.send(JSON.stringify({ type: "welcome", id: playerId, room: roomCode, isHost: room.isPersistent ? false : (room.hostId === playerId), isPersistent: isPersistent }));
      if (room.currentLevel) {
        ws.send(JSON.stringify({ type: "load-level", level: room.currentLevel }));
      }
      
      // Update persistent server player count
      if (room.isPersistent) {
        const servers = loadPs();
        const serverIdx = servers.findIndex(s => s.id === room.serverId);
        if (serverIdx >= 0) {
          servers[serverIdx].playerCount = Object.keys(room.players).length;
          servers[serverIdx].lastActivityAt = Date.now();
          persistPs(servers);
        }
      }
      
      const targetRoom = room;
      const playerList = Object.entries(targetRoom.players).map(([id, p]) => ({
        id, x: p.x, y: p.y, name: p.name, color: p.color, hp: p.hp, dead: p.dead
      }));
      Object.values(targetRoom.players).forEach((player) => {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({ type: "snapshot", players: playerList, pvpEnabled: targetRoom.pvpEnabled }));
        }
      });
      return;
    }

    // ── Player state update ───────────────────────────────────
    if (msg.type === "player-state" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      const player = room.players[playerId];
      if (!player) return;
      player.x = msg.x || 0;
      player.y = msg.y || 0;
      player.name = msg.name || player.name;
      player.color = msg.color || player.color;
      if (msg.hp !== undefined) player.hp = msg.hp;
      if (msg.dead !== undefined) player.dead = msg.dead;
      broadcast(room, {
        type: "player-state",
        player: { id: playerId, x: player.x, y: player.y, name: player.name, color: player.color, hp: player.hp, dead: player.dead }
      }, playerId);
      return;
    }

    // ── Load level ────────────────────────────────────────────
    if (msg.type === "load-level" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (room.hostId !== playerId && !room.isPersistent) return; // only host can in regular rooms, no one in persistent
      room.currentLevel = msg.level;
      broadcast(room, { type: "load-level", level: msg.level }, playerId);
      return;
    }

    // ── PvP toggle (host only) ────────────────────────────────
    if (msg.type === "pvp-toggle" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (!room.isPersistent && room.hostId !== playerId) return; // only host can toggle in regular rooms
      if (room.isPersistent) return; // persistent rooms don't allow PvP toggle
      room.pvpEnabled = !!msg.enabled;
      // Reset all player HP when enabling
      if (room.pvpEnabled) {
        Object.values(room.players).forEach((p) => { p.hp = 100; p.dead = false; });
      }
      broadcastAll(room, { type: "pvp-state", enabled: room.pvpEnabled });
      const playerList = Object.entries(room.players).map(([id, p]) => ({
        id, x: p.x, y: p.y, name: p.name, color: p.color, hp: p.hp, dead: p.dead
      }));
      Object.values(room.players).forEach((player) => {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({ type: "snapshot", players: playerList, pvpEnabled: room.pvpEnabled }));
        }
      });
      return;
    }

    // ── PvP hit (attacker tells server who they hit) ──────────
    if (msg.type === "pvp-hit" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (!room.pvpEnabled) return;
      const target = room.players[msg.targetId];
      if (!target || target.dead) return;
      const attacker = room.players[playerId];
      if (!attacker) return;
      // Basic server-side sanity: attacker must be reasonably close to target
      const dist = Math.hypot((target.x + 14) - (attacker.x + 14), (target.y + 19) - (attacker.y + 19));
      if (dist > 1200) return; // reject suspiciously long range hits
      // Clamp damage
      const damage = Math.min(200, Math.max(1, Number(msg.damage) || 25));
      const knockback = Math.min(50, Math.max(0, Number(msg.knockback) || 8));
      // Forward hit to target
      if (target.ws.readyState === WebSocket.OPEN) {
        target.ws.send(JSON.stringify({
          type: "pvp-hit",
          targetId: msg.targetId,
          attackerId: playerId,
          attackerName: attacker.name,
          damage,
          knockback,
          weaponName: String(msg.weaponName || "Weapon").slice(0, 32)
        }));
      }
      return;
    }

    // ── PvP kill notification ─────────────────────────────────
    if (msg.type === "pvp-kill" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (!room.pvpEnabled) return;
      const attacker = room.players[msg.attackerId];
      const target = room.players[msg.targetId];
      if (!attacker) return;
      // Mark target as dead on server
      if (target) { target.hp = 0; target.dead = true; }
      // Send kill confirmation to attacker
      if (attacker.ws.readyState === WebSocket.OPEN) {
        attacker.ws.send(JSON.stringify({
          type: "pvp-kill-confirm",
          targetId: msg.targetId,
          targetName: target ? target.name : "Unknown",
          weaponName: String(msg.weaponName || "Weapon").slice(0, 32)
        }));
      }
      // Broadcast updated snapshot
      const playerList = Object.entries(room.players).map(([id, p]) => ({
        id, x: p.x, y: p.y, name: p.name, color: p.color, hp: p.hp, dead: p.dead
      }));
      Object.values(room.players).forEach((player) => {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({ type: "snapshot", players: playerList, pvpEnabled: room.pvpEnabled }));
        }
      });
      return;
    }

    // ── PvP shot broadcast (for other clients to see) ─────────
    if (msg.type === "pvp-shot" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (!room.pvpEnabled) return;
      broadcast(room, { type: "pvp-shot", shooterId: playerId, ...msg }, playerId);
      return;
    }
  });
  });

  ws.on("close", () => {
    if (!playerId || !roomCode) return;
    
    const room = rooms[roomCode] || persistentRooms[roomCode];
    if (!room) return;
    
    delete room.players[playerId];
    
    // Update persistent server player count
    if (room.isPersistent) {
      const servers = loadPs();
      const serverIdx = servers.findIndex(s => s.id === room.serverId);
      if (serverIdx >= 0) {
        servers[serverIdx].playerCount = Object.keys(room.players).length;
        servers[serverIdx].lastActivityAt = Date.now();
        persistPs(servers);
      }
      // Persistent rooms stay alive even with 0 players
      if (Object.keys(room.players).length > 0) {
        const playerList = Object.entries(room.players).map(([id, p]) => ({
          id, x: p.x, y: p.y, name: p.name, color: p.color, hp: p.hp, dead: p.dead
        }));
        Object.values(room.players).forEach((player) => {
          if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify({ type: "snapshot", players: playerList }));
          }
        });
      }
    } else {
      // Regular rooms delete when empty
      if (Object.keys(room.players).length === 0) {
        delete rooms[roomCode];
      } else {
        // If host left, assign new host
        if (room.hostId === playerId) {
          const newHostId = Object.keys(room.players)[0];
          room.hostId = newHostId;
          const newHost = room.players[newHostId];
          if (newHost?.ws.readyState === WebSocket.OPEN) {
            newHost.ws.send(JSON.stringify({ type: "host-transfer", message: "You are now the host" }));
          }
        }
        const playerList = Object.entries(room.players).map(([id, p]) => ({
          id, x: p.x, y: p.y, name: p.name, color: p.color, hp: p.hp, dead: p.dead
        }));
        Object.values(room.players).forEach((player) => {
          if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify({ type: "snapshot", players: playerList }));
          }
        });
      }
    }
  });

  ws.on("error", (err) => console.warn("WS error:", err.message));
});

// ── HTTP upgrade → WS ─────────────────────────────────────────
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
});

server.listen(PORT, () => console.log("Page Climber server running on port " + PORT));