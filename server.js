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
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "512kb" }));

const load = () => {
  try { return JSON.parse(fs.readFileSync(DB, "utf8")); }
  catch { return []; }
};
const persist = (levels) => {
  fs.writeFileSync(DB, JSON.stringify(levels, null, 2));
};

app.get("/", (req, res) => {
  res.json({ ok: true, service: "page-climber-server" });
});

app.post("/levels", (req, res) => {
  const { name, author, platforms, crates, finish, width, height, start, settings } = req.body;
  if (!name || !Array.isArray(platforms)) {
    return res.status(400).json({ error: "Missing name or platforms" });
  }
  const level = {
    id: randomUUID(),
    name: String(name).slice(0, 64),
    author: String(author || "Anonymous").slice(0, 32),
    uploadedAt: Date.now(),
    plays: 0,
    platforms, crates: crates || [],
    finish, width, height, start, settings
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
  const slice = levels
    .slice(page * limit, page * limit + limit)
    .map(({ id, name, author, uploadedAt, plays, platforms }) => ({
      id, name, author, uploadedAt, plays, platformCount: platforms.length
    }));
  res.json({ levels: slice, total: levels.length });
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
  if (!name || !Array.isArray(platforms)) {
    return res.status(400).json({ error: "Missing name or platforms" });
  }
  levels[idx] = {
    ...levels[idx],
    name: String(name).slice(0, 64),
    author: String(author || "Anonymous").slice(0, 32),
    updatedAt: Date.now(),
    platforms, crates: crates || [],
    finish, width, height, start, settings
  };
  persist(levels);
  res.json({ ok: true, id: levels[idx].id });
});

const LB = "./leaderboard.json";
const loadLb = () => { try { return JSON.parse(fs.readFileSync(LB, "utf8")); } catch { return []; } };
const persistLb = (entries) => fs.writeFileSync(LB, JSON.stringify(entries, null, 2));

app.post("/leaderboard", (req, res) => {
  const { username, completions } = req.body;
  if (!username || completions === undefined) return res.status(400).json({ error: "Missing fields" });
  const entries = loadLb();
  const idx = entries.findIndex((e) => e.username === username);
  if (idx >= 0) { entries[idx].completions = Math.max(entries[idx].completions, completions); }
  else { entries.push({ username: String(username).slice(0, 32), completions: Number(completions) || 0 }); }
  entries.sort((a, b) => b.completions - a.completions);
  persistLb(entries.slice(0, 100));
  res.json({ ok: true });
});

app.get("/leaderboard", (req, res) => {
  const entries = loadLb().slice(0, 20);
  res.json({ entries });
});

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
    if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
};

const sendSnapshot = (room) => {
  const playerList = Object.entries(room.players).map(([id, p]) => ({
    id, x: p.x, y: p.y, name: p.name, color: p.color
  }));
  Object.values(room.players).forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({ type: "snapshot", players: playerList }));
    }
  });
};

wss.on("connection", (ws) => {
  let playerId = null;
  let roomCode = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "create") {
      roomCode = generateCode();
      playerId = randomUUID();
      rooms[roomCode] = { players: {}, currentLevel: null };
      rooms[roomCode].players[playerId] = {
        ws, x: 0, y: 0,
        name: msg.name || "Player",
        color: msg.color || "#4ade80"
      };
      ws.send(JSON.stringify({ type: "welcome", id: playerId, room: roomCode }));
      sendSnapshot(rooms[roomCode]);
      return;
    }

    if (msg.type === "join") {
      const code = String(msg.room || "").toUpperCase().trim();
      if (!rooms[code]) {
        ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
        return;
      }
      roomCode = code;
      playerId = randomUUID();
      rooms[roomCode].players[playerId] = {
        ws, x: 0, y: 0,
        name: msg.name || "Player",
        color: msg.color || "#4ade80"
      };
      ws.send(JSON.stringify({ type: "welcome", id: playerId, room: roomCode }));
      if (rooms[roomCode].currentLevel) {
        ws.send(JSON.stringify({ type: "load-level", level: rooms[roomCode].currentLevel }));
      }
      sendSnapshot(rooms[roomCode]);
      return;
    }

    if (msg.type === "player-state" && playerId && roomCode && rooms[roomCode]) {
      const player = rooms[roomCode].players[playerId];
      if (!player) return;
      player.x = msg.x || 0;
      player.y = msg.y || 0;
      player.name = msg.name || player.name;
      player.color = msg.color || player.color;
      broadcast(rooms[roomCode], {
        type: "player-state",
        player: { id: playerId, x: player.x, y: player.y, name: player.name, color: player.color }
      }, playerId);
      return;
    }

    if (msg.type === "load-level" && playerId && roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      const isHost = Object.keys(room.players)[0] === playerId;
      if (!isHost) return;
      room.currentLevel = msg.level;
      broadcast(room, { type: "load-level", level: msg.level }, playerId);
      return;
    }
  });

  ws.on("close", () => {
    if (!playerId || !roomCode || !rooms[roomCode]) return;
    delete rooms[roomCode].players[playerId];
    if (Object.keys(rooms[roomCode].players).length === 0) {
      delete rooms[roomCode];
    } else {
      broadcast(rooms[roomCode], { type: "player-left", id: playerId });
      sendSnapshot(rooms[roomCode]);
    }
  });

  ws.on("error", (err) => {
    console.warn("WebSocket error:", err.message);
  });
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(PORT, () => {
  console.log("Page Climber server running on port " + PORT);
});