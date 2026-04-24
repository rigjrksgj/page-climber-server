const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { randomUUID } = require("crypto");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { WebSocketServer, WebSocket } = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "change-me-in-production";
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "").toLowerCase();
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pageclimber";
const PORT = process.env.PORT || 10000;

if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI environment variable is not set. Please set it before starting the server.");
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: "512kb" }));

// ── MongoDB Setup ─────────────────────────────────────────────
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const levelSchema = new mongoose.Schema({
  id: String,
  name: String,
  author: String,
  uploadedAt: Number,
  updatedAt: Number,
  plays: { type: Number, default: 0 },
  platforms: mongoose.Schema.Types.Mixed,
  crates: mongoose.Schema.Types.Mixed,
  finish: mongoose.Schema.Types.Mixed,
  width: Number,
  height: Number,
  start: mongoose.Schema.Types.Mixed,
  settings: mongoose.Schema.Types.Mixed
});

const userSchema = new mongoose.Schema({
  id: String,
  username: String,
  deviceFingerprint: String,
  passwordHash: String,
  isAdmin: Boolean,
  isBanned: Boolean,
  bannedDevice: Boolean,
  createdAt: Number
});

const bannedDeviceSchema = new mongoose.Schema({
  fingerprint: String,
  bannedAt: Number,
  reason: String
});

const leaderboardSchema = new mongoose.Schema({
  username: String,
  completions: Number
});

const serverSchema = new mongoose.Schema({
  id: String,
  name: String,
  creatorName: String,
  createdAt: Number,
  levelData: mongoose.Schema.Types.Mixed,
  maxPlayers: Number,
  playerCount: Number,
  isRunning: Boolean,
  lastActivityAt: Number,
  roomCode: String
});

const logSchema = new mongoose.Schema({
  timestamp: Number,
  action: String,
  details: mongoose.Schema.Types.Mixed
});

const Level = mongoose.model("Level", levelSchema);
const User = mongoose.model("User", userSchema);
const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);
const Server = mongoose.model("Server", serverSchema);
const ActivityLog = mongoose.model("ActivityLog", logSchema);
const BannedDevice = mongoose.model("BannedDevice", bannedDeviceSchema);

// ── Auth helpers ──────────────────────────────────────────────
const hashPassword = (pwd) => crypto.createHash("sha256").update(pwd).digest("hex");
const verifyPassword = (pwd, hash) => hashPassword(pwd) === hash;
const generateToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
const verifyToken = (token) => { try { return jwt.verify(token, JWT_SECRET); } catch { return null; } };

const logActivity = async (action, details) => {
  try {
    await ActivityLog.create({ timestamp: Date.now(), action, ...details });
  } catch (err) { console.error("Log error:", err); }
};

const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });
  try {
    const user = await User.findOne({ id: decoded.userId });
    if (!user || !user.isAdmin) return res.status(403).json({ error: "Admin access required" });
    req.user = user;
    next();
  } catch (err) { res.status(500).json({ error: "Auth error" }); }
};

// ── HTTP routes ───────────────────────────────────────────────
app.get("/", (req, res) => res.json({ ok: true, service: "page-climber-server" }));

// ── Levels (now MongoDB) ──────────────────────────────────────
app.post("/levels", async (req, res) => {
  try {
    const { name, author, platforms, crates, finish, width, height, start, settings } = req.body;
    if (!name || !Array.isArray(platforms)) return res.status(400).json({ error: "Missing name or platforms" });
    const level = await Level.create({
      id: randomUUID(),
      name: String(name).slice(0, 64),
      author: String(author || "Anonymous").slice(0, 32),
      uploadedAt: Date.now(),
      plays: 0,
      platforms,
      crates: crates || [],
      finish,
      width,
      height,
      start,
      settings
    });
    res.json({ ok: true, id: level.id });
  } catch (err) {
    console.error("Error creating level:", err);
    res.status(500).json({ error: "Failed to save level" });
  }
});

app.get("/levels", async (req, res) => {
  try {
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const levels = await Level.find({}).sort({ uploadedAt: -1 }).skip(page * limit).limit(limit);
    const total = await Level.countDocuments({});
    res.json({
      levels: levels.map(({ id, name, author, uploadedAt, plays, platforms }) => ({
        id, name, author, uploadedAt, plays, platformCount: platforms.length
      })),
      total
    });
  } catch (err) {
    console.error("Error fetching levels:", err);
    res.status(500).json({ error: "Failed to fetch levels" });
  }
});

app.get("/levels/:id", async (req, res) => {
  try {
    const level = await Level.findOneAndUpdate(
      { id: req.params.id },
      { $inc: { plays: 1 } },
      { new: true }
    );
    if (!level) return res.status(404).json({ error: "Not found" });
    res.json(level);
  } catch (err) {
    console.error("Error fetching level:", err);
    res.status(500).json({ error: "Failed to fetch level" });
  }
});

app.delete("/levels/:id", async (req, res) => {
  try {
    const result = await Level.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting level:", err);
    res.status(500).json({ error: "Failed to delete level" });
  }
});

app.put("/levels/:id", async (req, res) => {
  try {
    const { name, author, platforms, crates, finish, width, height, start, settings } = req.body;
    if (!name || !Array.isArray(platforms)) return res.status(400).json({ error: "Missing name or platforms" });
    const level = await Level.findOneAndUpdate(
      { id: req.params.id },
      {
        name: String(name).slice(0, 64),
        author: String(author || "Anonymous").slice(0, 32),
        updatedAt: Date.now(),
        platforms,
        crates: crates || [],
        finish,
        width,
        height,
        start,
        settings
      },
      { new: true }
    );
    if (!level) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, id: level.id });
  } catch (err) {
    console.error("Error updating level:", err);
    res.status(500).json({ error: "Failed to update level" });
  }
});

app.post("/leaderboard", async (req, res) => {
  try {
    const { username, completions } = req.body;
    if (!username || completions === undefined) return res.status(400).json({ error: "Missing fields" });
    
    const existing = await Leaderboard.findOne({ username });
    if (existing) {
      existing.completions = Math.max(existing.completions, completions);
      await existing.save();
    } else {
      await Leaderboard.create({ username: String(username).slice(0, 32), completions: Number(completions) || 0 });
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Error updating leaderboard" }); }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const entries = await Leaderboard.find({}).sort({ completions: -1 }).limit(20);
    res.json({ entries });
  } catch (err) { res.status(500).json({ error: "Error fetching leaderboard" }); }
});

// ── Authentication ────────────────────────────────────────────
app.post("/register", async (req, res) => {
  try {
    const { username, password, deviceFingerprint } = req.body;
    if (!username || !password || !deviceFingerprint) return res.status(400).json({ error: "Missing required fields" });
    if (username.length < 3 || username.length > 32) return res.status(400).json({ error: "Username must be 3-32 chars" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be 6+ chars" });
    
    const bannedDevice = await BannedDevice.findOne({ fingerprint: deviceFingerprint });
    if (bannedDevice) return res.status(403).json({ error: "This device is banned and cannot create new accounts" });
    
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Username already exists" });
    
    const userCount = await User.countDocuments({});
    const isFirstUser = userCount === 0;
    const isAdmin = isFirstUser || (ADMIN_USERNAME && username.toLowerCase() === ADMIN_USERNAME);
    
    const user = await User.create({
      id: randomUUID(),
      username: username.toLowerCase(),
      deviceFingerprint: deviceFingerprint,
      passwordHash: hashPassword(password),
      isAdmin: isAdmin,
      isBanned: false,
      bannedDevice: false,
      createdAt: Date.now()
    });
    
    await logActivity("user_registered", { userId: user.id, username: user.username, isAdmin });
    res.json({ ok: true, token: generateToken(user.id), user: { id: user.id, username: user.username, isAdmin: isAdmin } });
  } catch (err) { res.status(500).json({ error: "Registration failed" }); }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password, deviceFingerprint } = req.body;
    if (!username || !password || !deviceFingerprint) return res.status(400).json({ error: "Missing required fields" });
    
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: "Invalid credentials" });
    if (user.isBanned) return res.status(403).json({ error: "This account is banned" });
    
    const bannedDevice = await BannedDevice.findOne({ fingerprint: deviceFingerprint });
    if (bannedDevice) return res.status(403).json({ error: "This device is banned" });
    
    await logActivity("user_login", { userId: user.id, username: user.username });
    res.json({ ok: true, token: generateToken(user.id), user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  } catch (err) { res.status(500).json({ error: "Login failed" }); }
});

app.post("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });
    
    const user = await User.findOne({ id: decoded.userId });
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.isBanned) return res.status(403).json({ error: "This account is banned" });
    
    res.json({ ok: true, user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  } catch (err) { res.status(500).json({ error: "Verification failed" }); }
});

app.post("/make-admin", async (req, res) => {
  try {
    const { username, secret } = req.body;
    if (!username || !secret) return res.status(400).json({ error: "Missing username or secret" });
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: "Invalid secret" });
    
    const user = await User.findOneAndUpdate(
      { username: username.toLowerCase() },
      { isAdmin: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    
    await logActivity("admin_promoted", { username: user.username });
    res.json({ ok: true, message: `${username} is now an admin` });
  } catch (err) { res.status(500).json({ error: "Operation failed" }); }
});

// ── Persistent Servers ────────────────────────────────────────
app.post("/persistent-servers", async (req, res) => {
  try {
    const { name, creatorName, levelData, maxPlayers } = req.body;
    if (!name || !levelData) return res.status(400).json({ error: "Missing name or levelData" });
    
    const roomCode = generateCode();
    const server = await Server.create({
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
    });
    
    persistentRooms[roomCode] = {
      serverId: server.id,
      players: {},
      currentLevel: levelData,
      pvpEnabled: false,
      isPersistent: true,
      createdAt: Date.now()
    };
    
    await logActivity("server_created", { serverId: server.id, serverName: server.name });
    res.json({ ok: true, id: server.id, roomCode });
  } catch (err) { res.status(500).json({ error: "Server creation failed" }); }
});

app.get("/persistent-servers", async (req, res) => {
  try {
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    
    const servers = await Server.find({}).skip(page * limit).limit(limit);
    const total = await Server.countDocuments({});
    
    res.json({
      servers: servers.map(s => ({ id: s.id, name: s.name, creatorName: s.creatorName, createdAt: s.createdAt, playerCount: s.playerCount, maxPlayers: s.maxPlayers, roomCode: s.roomCode })),
      total
    });
  } catch (err) { res.status(500).json({ error: "Error fetching servers" }); }
});

app.get("/persistent-servers/:id", async (req, res) => {
  try {
    const server = await Server.findOne({ id: req.params.id });
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
  } catch (err) { res.status(500).json({ error: "Error fetching server" }); }
});

app.delete("/persistent-servers/:id", async (req, res) => {
  try {
    const server = await Server.findOne({ id: req.params.id });
    if (!server) return res.status(404).json({ error: "Server not found" });
    
    for (const [code, room] of Object.entries(persistentRooms)) {
      if (room.serverId === server.id) delete persistentRooms[code];
    }
    
    await Server.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Error deleting server" }); }
});

// ── Admin Routes ──────────────────────────────────────────────
app.get("/admin/logs", verifyAdmin, async (req, res) => {
  try {
    const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(100);
    res.json({ logs });
  } catch (err) { res.status(500).json({ error: "Error fetching logs" }); }
});

app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select("id username isAdmin isBanned bannedDevice createdAt");
    res.json({ users });
  } catch (err) { res.status(500).json({ error: "Error fetching users" }); }
});

app.post("/admin/ban/:userId", verifyAdmin, async (req, res) => {
  try {
    const { banDevice } = req.body;
    const user = await User.findOneAndUpdate({ id: req.params.userId }, { isBanned: true }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    
    if (banDevice && user.deviceFingerprint) {
      await BannedDevice.create({ fingerprint: user.deviceFingerprint, bannedAt: Date.now(), reason: "Account ban" });
      await User.findOneAndUpdate({ id: req.params.userId }, { bannedDevice: true });
    }
    
    await logActivity("admin_ban", { adminId: req.user.id, userId: user.id, username: user.username, banDevice });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Error banning user" }); }
});

app.post("/admin/unban/:userId", verifyAdmin, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ id: req.params.userId }, { isBanned: false }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    
    if (user.deviceFingerprint) {
      await BannedDevice.deleteOne({ fingerprint: user.deviceFingerprint });
      await User.findOneAndUpdate({ id: req.params.userId }, { bannedDevice: false });
    }
    
    await logActivity("admin_unban", { adminId: req.user.id, userId: user.id, username: user.username });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Error unbanning user" }); }
});

app.get("/admin/servers", verifyAdmin, async (req, res) => {
  try {
    const servers = await Server.find({}).select("id name creatorName playerCount maxPlayers createdAt lastActivityAt");
    res.json({ servers });
  } catch (err) { res.status(500).json({ error: "Error fetching servers" }); }
});

app.delete("/admin/servers/:id", verifyAdmin, async (req, res) => {
  try {
    const server = await Server.findOne({ id: req.params.id });
    if (!server) return res.status(404).json({ error: "Server not found" });
    
    for (const [code, room] of Object.entries(persistentRooms)) {
      if (room.serverId === server.id) delete persistentRooms[code];
    }
    
    await Server.deleteOne({ id: req.params.id });
    await logActivity("admin_delete_server", { adminId: req.user.id, serverId: server.id, serverName: server.name });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Error deleting server" }); }
});

app.post("/admin/reset-leaderboard", verifyAdmin, async (req, res) => {
  try {
    await Leaderboard.deleteMany({});
    await logActivity("admin_reset_leaderboard", { adminId: req.user.id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Error resetting leaderboard" }); }
});

// ── Multiplayer rooms ─────────────────────────────────────────
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
  let playerName = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "create") {
      roomCode = generateCode();
      playerId = randomUUID();
      playerName = msg.name || "Player";
      rooms[roomCode] = { players: {}, currentLevel: null, pvpEnabled: false, hostId: playerId };
      rooms[roomCode].players[playerId] = {
        ws, x: 0, y: 0, name: playerName,
        color: msg.color || "#4ade80", hp: 100, dead: false
      };
      ws.send(JSON.stringify({ type: "welcome", id: playerId, room: roomCode, isHost: true }));
      sendSnapshot(rooms[roomCode]);
      return;
    }

    if (msg.type === "join") {
      const code = String(msg.room || "").toUpperCase().trim();
      let room = rooms[code] || persistentRooms[code];
      if (!room) { ws.send(JSON.stringify({ type: "error", message: "Room not found" })); return; }
      roomCode = code;
      playerId = randomUUID();
      playerName = msg.name || "Player";
      room.players[playerId] = {
        ws, x: 0, y: 0, name: playerName,
        color: msg.color || "#4ade80", hp: 100, dead: false
      };
      const isPersistent = room.isPersistent || false;
      ws.send(JSON.stringify({ type: "welcome", id: playerId, room: roomCode, isHost: room.isPersistent ? false : (room.hostId === playerId), isPersistent: isPersistent }));
      if (room.currentLevel) {
        ws.send(JSON.stringify({ type: "load-level", level: room.currentLevel }));
      }
      
      if (room.isPersistent) {
        Server.findOneAndUpdate({ id: room.serverId }, { 
          playerCount: Object.keys(room.players).length,
          lastActivityAt: Date.now()
        }).catch(err => console.error("Error updating server:", err));
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

    if (msg.type === "load-level" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (room.hostId !== playerId && !room.isPersistent) return;
      room.currentLevel = msg.level;
      broadcast(room, { type: "load-level", level: msg.level }, playerId);
      return;
    }

    if (msg.type === "pvp-toggle" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (!room.isPersistent && room.hostId !== playerId) return;
      if (room.isPersistent) return;
      room.pvpEnabled = !!msg.enabled;
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

    if (msg.type === "pvp-hit" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (!room.pvpEnabled) return;
      const target = room.players[msg.targetId];
      if (!target || target.dead) return;
      const attacker = room.players[playerId];
      if (!attacker) return;
      const dist = Math.hypot((target.x + 14) - (attacker.x + 14), (target.y + 19) - (attacker.y + 19));
      if (dist > 1200) return;
      const damage = Math.min(200, Math.max(1, Number(msg.damage) || 25));
      const knockback = Math.min(50, Math.max(0, Number(msg.knockback) || 8));
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

    if (msg.type === "pvp-kill" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (!room.pvpEnabled) return;
      const attacker = room.players[msg.attackerId];
      const target = room.players[msg.targetId];
      if (!attacker) return;
      if (target) { target.hp = 0; target.dead = true; }
      if (attacker.ws.readyState === WebSocket.OPEN) {
        attacker.ws.send(JSON.stringify({
          type: "pvp-kill-confirm",
          targetId: msg.targetId,
          targetName: target ? target.name : "Unknown",
          weaponName: String(msg.weaponName || "Weapon").slice(0, 32)
        }));
      }
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

    if (msg.type === "pvp-shot" && playerId && roomCode) {
      const room = rooms[roomCode] || persistentRooms[roomCode];
      if (!room) return;
      if (!room.pvpEnabled) return;
      broadcast(room, { type: "pvp-shot", shooterId: playerId, ...msg }, playerId);
      return;
    }

    if (msg.type === "chat" && playerId && playerName) {
      const message = String(msg.message || "").trim().slice(0, 200);
      if (!message) return;
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "chat", senderName: playerName, message }));
        }
      });
      return;
    }
  });

  ws.on("close", () => {
    if (!playerId || !roomCode) return;
    
    const room = rooms[roomCode] || persistentRooms[roomCode];
    if (!room) return;
    
    delete room.players[playerId];
    
    if (room.isPersistent) {
      Server.findOneAndUpdate({ id: room.serverId }, { 
        playerCount: Object.keys(room.players).length,
        lastActivityAt: Date.now()
      }).catch(err => console.error("Error updating server:", err));
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
      if (Object.keys(room.players).length === 0) {
        delete rooms[roomCode];
      } else {
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