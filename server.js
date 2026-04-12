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
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "512kb" }));

// ── DB helpers ────────────────────────────────────────────────
const load = () => { try { return JSON.parse(fs.readFileSync(DB, "utf8")); } catch { return []; } };
const persist = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 2));
const loadLb = () => { try { return JSON.parse(fs.readFileSync(LB, "utf8")); } catch { return []; } };
const persistLb = (d) => fs.writeFileSync(LB, JSON.stringify(d, null, 2));

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

// ── Multiplayer rooms ─────────────────────────────────────────
// rooms[code] = { players: { id: { ws, x, y, name, color, hp, dead } }, currentLevel, pvpEnabled, hostId }
const rooms = {};

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
      if (!rooms[code]) { ws.send(JSON.stringify({ type: "error", message: "Room not found" })); return; }
      roomCode = code;
      playerId = randomUUID();
      rooms[roomCode].players[playerId] = {
        ws, x: 0, y: 0, name: msg.name || "Player",
        color: msg.color || "#4ade80", hp: 100, dead: false
      };
      ws.send(JSON.stringify({ type: "welcome", id: playerId, room: roomCode, isHost: false }));
      if (rooms[roomCode].currentLevel) {
        ws.send(JSON.stringify({ type: "load-level", level: rooms[roomCode].currentLevel }));
      }
      sendSnapshot(rooms[roomCode]);
      return;
    }

    // ── Player state update ───────────────────────────────────
    if (msg.type === "player-state" && playerId && roomCode && rooms[roomCode]) {
      const player = rooms[roomCode].players[playerId];
      if (!player) return;
      player.x = msg.x || 0;
      player.y = msg.y || 0;
      player.name = msg.name || player.name;
      player.color = msg.color || player.color;
      if (msg.hp !== undefined) player.hp = msg.hp;
      if (msg.dead !== undefined) player.dead = msg.dead;
      broadcast(rooms[roomCode], {
        type: "player-state",
        player: { id: playerId, x: player.x, y: player.y, name: player.name, color: player.color, hp: player.hp, dead: player.dead }
      }, playerId);
      return;
    }

    // ── Load level ────────────────────────────────────────────
    if (msg.type === "load-level" && playerId && roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      if (room.hostId !== playerId) return;
      room.currentLevel = msg.level;
      broadcast(room, { type: "load-level", level: msg.level }, playerId);
      return;
    }

    // ── PvP toggle (host only) ────────────────────────────────
    if (msg.type === "pvp-toggle" && playerId && roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      if (room.hostId !== playerId) return;
      room.pvpEnabled = !!msg.enabled;
      // Reset all player HP when enabling
      if (room.pvpEnabled) {
        Object.values(room.players).forEach((p) => { p.hp = 100; p.dead = false; });
      }
      broadcastAll(room, { type: "pvp-state", enabled: room.pvpEnabled });
      sendSnapshot(room);
      return;
    }

    // ── PvP hit (attacker tells server who they hit) ──────────
    if (msg.type === "pvp-hit" && playerId && roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
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
    if (msg.type === "pvp-kill" && playerId && roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
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
      sendSnapshot(room);
      return;
    }

    // ── PvP shot broadcast (for other clients to see) ─────────
    if (msg.type === "pvp-shot" && playerId && roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      if (!room.pvpEnabled) return;
      broadcast(room, { type: "pvp-shot", shooterId: playerId, ...msg }, playerId);
      return;
    }
  });

  ws.on("close", () => {
    if (!playerId || !roomCode || !rooms[roomCode]) return;
    delete rooms[roomCode].players[playerId];
    if (Object.keys(rooms[roomCode].players).length === 0) {
      delete rooms[roomCode];
    } else {
      // If host left, assign new host
      if (rooms[roomCode].hostId === playerId) {
        const newHostId = Object.keys(rooms[roomCode].players)[0];
        rooms[roomCode].hostId = newHostId;
        const newHost = rooms[roomCode].players[newHostId];
        if (newHost?.ws.readyState === WebSocket.OPEN) {
          newHost.ws.send(JSON.stringify({ type: "host-transfer", message: "You are now the host" }));
        }
      }
      broadcast(rooms[roomCode], { type: "player-left", id: playerId });
      sendSnapshot(rooms[roomCode]);
    }
  });

  ws.on("error", (err) => console.warn("WS error:", err.message));
});

// ── HTTP upgrade → WS ─────────────────────────────────────────
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
});

server.listen(PORT, () => console.log("Page Climber server running on port " + PORT));