const http = require("http");
const { WebSocketServer } = require("ws");

const port = Number(process.env.PORT || 8787);
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "pageclimber-multiplayer", port }));
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

function getRoom(name) {
  if (!rooms.has(name)) rooms.set(name, new Map());
  return rooms.get(name);
}

function broadcast(roomName, payload, exceptId = null) {
  const room = getRoom(roomName);
  const data = JSON.stringify(payload);
  for (const [id, entry] of room.entries()) {
    if (id === exceptId) continue;
    if (entry.socket.readyState === entry.socket.OPEN) entry.socket.send(data);
  }
}

function snapshot(roomName) {
  return Array.from(getRoom(roomName).values()).map((entry) => entry.player).filter(Boolean);
}

wss.on("connection", (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomName = url.searchParams.get("room") || "default";
  const room = getRoom(roomName);
  const id = Math.random().toString(36).slice(2, 10);

  room.set(id, {
    socket,
    player: {
      id,
      room: roomName,
      x: 24,
      y: 24,
      name: "Rival",
      color: "#60a5fa"
    }
  });

  socket.send(JSON.stringify({ type: "welcome", id, room: roomName }));
  socket.send(JSON.stringify({ type: "snapshot", players: snapshot(roomName) }));
  broadcast(roomName, { type: "player-state", player: room.get(id).player }, id);

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(String(raw));
      if (message.type !== "player-state" || !message.player) return;
      const entry = room.get(id);
      if (!entry) return;
      entry.player = {
        ...entry.player,
        ...message.player,
        id,
        room: roomName
      };
      broadcast(roomName, { type: "player-state", player: entry.player }, id);
    } catch (error) {
      console.error("Bad multiplayer message:", error.message);
    }
  });

  socket.on("close", () => {
    room.delete(id);
    broadcast(roomName, { type: "player-left", id });
    if (room.size === 0) rooms.delete(roomName);
  });
});

server.listen(port, () => {
  console.log(`Page Climber multiplayer server running on ws://localhost:${port}`);
});
