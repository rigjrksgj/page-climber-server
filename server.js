const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { randomUUID } = require("crypto");

const app = express();
const DB = "./levels.json";
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "512kb" }));

const load = () => {
  try { return JSON.parse(fs.readFileSync(DB, "utf8")); }
  catch { return []; }
};

const persist = (levels) => {
  fs.writeFileSync(DB, JSON.stringify(levels, null, 2));
};

// Upload a level
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
    platforms,
    crates: crates || [],
    finish,
    width,
    height,
    start,
    settings
  };
  const levels = load();
  levels.unshift(level);
  persist(levels.slice(0, 500));
  res.json({ ok: true, id: level.id });
});

// List levels
app.get("/levels", (req, res) => {
  const page = Math.max(0, parseInt(req.query.page) || 0);
  const limit = Math.min(20, parseInt(req.query.limit) || 10);
  const levels = load();
  const slice = levels
    .slice(page * limit, page * limit + limit)
    .map(({ id, name, author, uploadedAt, plays, platforms }) => ({
      id, name, author, uploadedAt, plays,
      platformCount: platforms.length
    }));
  res.json({ levels: slice, total: levels.length });
});

// Get one level + bump play count
app.get("/levels/:id", (req, res) => {
  const levels = load();
  const idx = levels.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  levels[idx].plays += 1;
  persist(levels);
  res.json(levels[idx]);
});

// Delete a level (optional, by id)
app.delete("/levels/:id", (req, res) => {
  const levels = load();
  const filtered = levels.filter((l) => l.id !== req.params.id);
  if (filtered.length === levels.length) return res.status(404).json({ error: "Not found" });
  persist(filtered);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log("Page Climber server running on http://localhost:" + PORT);
});