(() => {
  if (window.PageClimber?.destroy) window.PageClimber.destroy();
  const API_URL = "https://page-climber-server.onrender.com";
  const KEY = "page-climber-save-v2";
  const ROOT = "page-climber-root";
  const ITEMS = [];
  const BASE_ITEMS = [
    ["Spring Boots", "jump", 18, "common"],
    ["Turbo Laces", "speed", 14, "common"],
    ["Ghost Gloves", "drop", 1, "uncommon"],
    ["Orbital Core", "double", 1, "epic"],
    ["Moon Thread", "gravity", 20, "rare"],
    ["Lucky Pixel", "luck", 1, "common"],
    ["Crate Sniffer", "crate", 1, "uncommon"],
    ["Link Breaker", "link", 1, "epic"],
    ["Drift Cape", "gravity", 12, "uncommon"],
    ["Circuit Heart", "speed", 18, "rare"]
  ];
  for (let i = 0; i < 100; i += 1) {
    const [name, effect, amount, rarity] = BASE_ITEMS[i % BASE_ITEMS.length];
    ITEMS.push({ id: `${name.toLowerCase().replace(/\s+/g, "-")}-${i}`, name: `${name} ${i + 1}`, effect, amount, rarity });
  }

  const SKINS = {
    rookie: ["Rookie", "#4ade80", null],
    ember: ["Ember", "#fb7185", "reach-25"],
    cobalt: ["Cobalt", "#60a5fa", "crate-10"],
    glitch: ["Glitch", "#a78bfa", "combo-3"],
    sunrise: ["Sunrise", "#f59e0b", "reach-75"],
    mythic: ["Mythic", "#f43f5e", "secret-cloud"],
    chrome: ["Chrome", "#cbd5e1", "link-1"],
    moss: ["Moss", "#84cc16", "land-500"],
    void: ["Void", "#1e293b", "achievement-25"]
  };

  const ACH = {
    "reach-10": "Warm-Up", "reach-25": "Quarter Climber", "reach-50": "Halfway There",
    "reach-75": "Skyline", "reach-90": "Thin Air", "reach-100": "Roof Walker",
    finish: "Page Cleared", "crate-1": "First Prize", "crate-10": "Box Breaker",
    "crate-25": "Loot Spiral", "crate-50": "Treasure Fever", "crate-75": "Crate Constellation",
    "jump-25": "Hopscotch", "jump-100": "Knees of Steel", "jump-500": "Boing Engine",
    "site-3": "Web Hopper", "site-10": "Dimension Drifter", "collector-10": "Backpack Starter",
    "collector-20": "Pocket Full", "collector-60": "Museum Run", "fall-1": "Gravity Check",
    "fall-10": "Frequent Faller", marathon: "Horizontal Problem", "combo-3": "Air Combo",
    konami: "Old Internet Magic", "crate-42": "Answer in a Box", "secret-cloud": "Cloud Whisperer",
    "drop-1": "Trap Door", "drop-50": "Phase Walker", "land-50": "Sticky Shoes",
    "land-500": "Platform Whisperer", "link-hit-1": "Broken Bookmark", "link-1": "Hyper Hopper",
    "link-5": "Portal Pogo", "subplatform-25": "Fine Footwork", "achievement-10": "Trophy Shelf",
    "achievement-25": "Golden Cabinet", "crate-epic": "Epic Taste", "inventory-25": "Bag of Tricks",
    "skin-3": "Wardrobe Start", "skin-6": "Closet Raid", "near-top-fast": "Speed Browser",
    "secret-hover": "Hover Detective"
  };

  function fresh() {
    return {
      version: 2, createdAt: Date.now(), updatedAt: Date.now(),
      username: "",
      stats: {
        runs: 0, maxHeightPercent: 0, maxHeightPx: 0, cratesOpened: 0, jumps: 0, totalDistance: 0,
        deaths: 0, drops: 0, landings: 0, subplatformLandings: 0, linksBroken: 0, levelCompletions: 0
      },
      permanent: { speed: 255, jump: 540, gravity: 1300, doubleJump: false, crateLuck: 0, dropPower: 0 },
      inventory: {}, achievements: {}, unlockedSkins: ["rookie"], currentSkin: "rookie",
      visitedOrigins: [], panelTab: "inventory"
    };
  }

  function merge(base, incoming) {
    return {
      ...base, ...incoming,
      stats: { ...base.stats, ...(incoming.stats || {}) },
      permanent: { ...base.permanent, ...(incoming.permanent || {}) },
      inventory: { ...base.inventory, ...(incoming.inventory || {}) },
      achievements: { ...base.achievements, ...(incoming.achievements || {}) },
      unlockedSkins: [...new Set([...(base.unlockedSkins || []), ...(incoming.unlockedSkins || [])])],
      visitedOrigins: [...new Set([...(base.visitedOrigins || []), ...(incoming.visitedOrigins || [])])]
    };
  }

  const state = (() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? merge(fresh(), JSON.parse(raw)) : fresh();
    } catch { return fresh(); }
  })();
  state.permanent.speed = 255;
  state.permanent.jump = 540;
  state.permanent.gravity = 1300;
  if (!state.username) state.username = "";
  if (!state.stats.levelCompletions) state.stats.levelCompletions = 0;
  state.visitedOrigins = [...new Set([...(state.visitedOrigins || []), location.origin])];

  // ── PvP state ─────────────────────────────────────────────────
  const pvp = {
    enabled: false,
    hp: 100,
    maxHp: 100,
    dead: false,
    respawnTimer: null,
    respawnDelay: 3000,
    weapon: null,
    projectiles: [],
    lastFire: 0,
    swinging: false,
    swingTimer: null,
    kills: 0,
    deaths: 0,
    killFeed: [],
    killFeedEl: null,
    damageNumbers: []
  };

  const game = {
    running: true, keys: new Set(), platforms: [], crates: [], customLevel: null,
    multiplayer: { socket: null, room: null, playerId: null, peers: {}, lastSentAt: 0, isHost: false, pvpEnabled: false },
    linkHits: new WeakMap(), lastFrame: performance.now(), lastScan: 0, coyote: 0,
    dropTimer: 0, currentPlatform: null, currentHighlight: null, lastLandingSource: null,
    finished: false, startedAt: Date.now(),
    player: {
      width: 28, height: 38, x: 24, y: 0, vx: 0, vy: 0,
      speed: state.permanent.speed, jump: state.permanent.jump, gravity: state.permanent.gravity,
      onGround: false, canDoubleJump: !!state.permanent.doubleJump, jumpsLeft: 1, facing: 1,
      wallSide: 0, wallTimer: 0
    }
  };

  const save = () => { state.updatedAt = Date.now(); localStorage.setItem(KEY, JSON.stringify(state)); };

  const syncPlayer = () => {
    state.permanent.speed = 255; state.permanent.jump = 540; state.permanent.gravity = 1300;
    game.player.speed = 255; game.player.jump = 540; game.player.gravity = 1300;
    game.player.canDoubleJump = !!state.permanent.doubleJump;
    if (!state.unlockedSkins.includes(state.currentSkin)) state.currentSkin = state.unlockedSkins[0] || "rookie";
  };

  const getUsername = () => state.username || "Anonymous";

  // ── Styles ────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.id = `${ROOT}-style`;
  style.textContent = `
    #${ROOT}-hud,#${ROOT}-panel{position:fixed;z-index:2147483646;color:#f8fafc;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(15,23,42,.88);border:1px solid rgba(148,163,184,.35);border-radius:14px;box-shadow:0 14px 40px rgba(15,23,42,.35);backdrop-filter:blur(10px)}
    #${ROOT}-hud{left:16px;top:16px;width:340px;padding:12px;transition:width .3s ease,padding .3s ease}
    #${ROOT}-hud.${ROOT}-collapsed{width:36px;padding:8px;overflow:hidden}
    #${ROOT}-hud.${ROOT}-collapsed #${ROOT}-controls,#${ROOT}-hud.${ROOT}-collapsed p,#${ROOT}-hud.${ROOT}-collapsed h1{opacity:0;pointer-events:none;margin:0;height:0;overflow:hidden;transition:opacity .2s ease}
    #${ROOT}-hud.${ROOT}-collapsed #${ROOT}-toggle-hud{opacity:1;pointer-events:all;position:static;display:block}
    #${ROOT}-toggle-hud{position:absolute;top:8px;right:8px;width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;line-height:1;background:none;border:none;padding:0;font-family:inherit;z-index:1}
    #${ROOT}-hud h1,#${ROOT}-panel h2{margin:0 0 8px;font-size:14px} #${ROOT}-hud p{margin:4px 0}
    #${ROOT}-controls,.${ROOT}-tabs{display:flex;gap:8px;flex-wrap:wrap} #${ROOT}-controls{margin-top:8px}
    .${ROOT}-button{border:1px solid rgba(96,165,250,.5);background:rgba(30,41,59,.9);color:#fff;border-radius:999px;padding:6px 10px;cursor:pointer;font:inherit}
    .${ROOT}-button[disabled]{opacity:.45;cursor:not-allowed}
    #${ROOT}-panel{right:16px;top:16px;width:360px;max-height:min(72vh,720px);padding:12px;overflow:auto;display:none}
    #${ROOT}-panel.${ROOT}-open{display:block}
    .${ROOT}-entry{padding:8px 10px;border-radius:10px;margin-bottom:8px;background:rgba(30,41,59,.75);border:1px solid rgba(148,163,184,.2)}
    .${ROOT}-entry strong{display:block}.${ROOT}-muted{color:#cbd5e1}
    #${ROOT}-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483647;pointer-events:none}
    .${ROOT}-toast-card{margin-top:8px;padding:10px 14px;border-radius:999px;background:rgba(15,23,42,.92);color:#fff;font:12px/1.2 ui-monospace,monospace;border:1px solid rgba(96,165,250,.5);box-shadow:0 10px 25px rgba(15,23,42,.2);animation:${ROOT}-fade 2.8s ease forwards}
    @keyframes ${ROOT}-fade{0%{opacity:0;transform:translateY(-8px)}12%{opacity:1;transform:translateY(0)}88%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}
    #${ROOT}-player{position:absolute;width:28px;height:38px;z-index:2147483645;border-radius:12px 12px 6px 6px;border:2px solid rgba(255,255,255,.9);box-shadow:0 0 0 2px rgba(15,23,42,.4),0 12px 25px rgba(15,23,42,.35);pointer-events:none;transform-origin:center bottom}
    #${ROOT}-player::before,#${ROOT}-player::after{content:"";position:absolute;background:#fff}
    #${ROOT}-player::before{width:7px;height:7px;left:5px;top:8px;border-radius:50%;box-shadow:10px 0 0 #fff}
    #${ROOT}-player::after{left:6px;right:6px;height:3px;bottom:7px;border-radius:999px}
    #${ROOT}-player.${ROOT}-run{animation:${ROOT}-run .34s linear infinite}
    #${ROOT}-player.${ROOT}-jump{transform:scaleY(1.08) scaleX(.95)}
    #${ROOT}-player.${ROOT}-dead{opacity:.3;filter:grayscale(1)}
    @keyframes ${ROOT}-run{0%{transform:translateY(0) scaleX(1)}50%{transform:translateY(-2px) scaleX(.96) rotate(-2deg)}100%{transform:translateY(0) scaleX(1)}}
    #${ROOT}-finish{position:absolute;z-index:2147483644;pointer-events:none;border:2px dashed rgba(250,204,21,.95);background:repeating-linear-gradient(-45deg,rgba(250,204,21,.22),rgba(250,204,21,.22) 10px,rgba(250,204,21,.06) 10px,rgba(250,204,21,.06) 20px)}
    #${ROOT}-level-bg{position:absolute;left:0;top:0;z-index:2147483641;pointer-events:none;background:radial-gradient(circle at top, rgba(56,189,248,.18), transparent 30%),linear-gradient(180deg, #020617 0%, #0f172a 60%, #111827 100%)}
    #${ROOT}-level-geo{position:absolute;left:0;top:0;z-index:2147483642;pointer-events:none}
    .${ROOT}-level-platform{position:absolute;background:rgba(96,165,250,.24);border:2px solid rgba(96,165,250,.95);border-radius:8px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
    #${ROOT}-platform-highlight{position:absolute;z-index:2147483643;pointer-events:none;border:2px solid rgba(34,197,94,.95);background:rgba(34,197,94,.12);box-shadow:0 0 0 2px rgba(255,255,255,.14) inset;border-radius:8px;display:none}
    #${ROOT}-remote-layer{position:absolute;left:0;top:0;z-index:2147483644;pointer-events:none}
    .${ROOT}-remote-player{position:absolute;width:28px;height:38px;border-radius:12px 12px 6px 6px;border:2px solid rgba(255,255,255,.9);box-shadow:0 0 0 2px rgba(15,23,42,.4),0 12px 25px rgba(15,23,42,.2);opacity:.88}
    .${ROOT}-remote-player::before{content:"";position:absolute;left:5px;top:8px;width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:10px 0 0 #fff}
    .${ROOT}-remote-label{position:absolute;top:-18px;left:50%;transform:translateX(-50%);padding:2px 6px;border-radius:999px;background:rgba(15,23,42,.9);color:#fff;font:10px/1.2 ui-monospace,monospace;white-space:nowrap}
    .${ROOT}-crate{position:absolute;width:20px;height:20px;z-index:2147483644;background:linear-gradient(135deg,#f59e0b,#ef4444);border:2px solid rgba(255,255,255,.88);border-radius:6px;box-shadow:0 12px 24px rgba(0,0,0,.22)}
    .${ROOT}-crate::after{content:"?";position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:700 12px/1 ui-monospace,monospace}
    .${ROOT}-link-hit{outline:2px solid rgba(96,165,250,.9);outline-offset:2px}
    .${ROOT}-input{flex:1;min-width:120px;padding:6px 10px;border-radius:999px;border:1px solid rgba(96,165,250,.5);background:rgba(30,41,59,.9);color:#fff;font:inherit;outline:none}
    #${ROOT}-healthbar-wrap{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483646;display:none;flex-direction:column;align-items:center;gap:4px;pointer-events:none}
    #${ROOT}-healthbar-wrap.visible{display:flex}
    #${ROOT}-healthbar-bg{width:200px;height:12px;background:rgba(15,23,42,.8);border-radius:999px;border:1px solid rgba(148,163,184,.3);overflow:hidden}
    #${ROOT}-healthbar-fill{height:100%;border-radius:999px;transition:width .2s ease,background .3s ease;background:linear-gradient(90deg,#22c55e,#4ade80)}
    #${ROOT}-health-text{font:10px/1 ui-monospace,monospace;color:#94a3b8}
    #${ROOT}-weapon-hud{position:fixed;bottom:20px;right:20px;z-index:2147483646;display:none;background:rgba(15,23,42,.88);border:1px solid rgba(148,163,184,.35);border-radius:10px;padding:8px 12px;font:11px/1.4 ui-monospace,monospace;color:#f8fafc;pointer-events:none}
    #${ROOT}-weapon-hud.visible{display:block}
    #${ROOT}-killfeed{position:fixed;top:70px;right:16px;z-index:2147483646;display:flex;flex-direction:column;gap:4px;pointer-events:none;max-width:280px}
    .${ROOT}-killfeed-entry{background:rgba(15,23,42,.85);border:1px solid rgba(148,163,184,.2);border-radius:6px;padding:4px 10px;font:10px/1.4 ui-monospace,monospace;color:#f8fafc;animation:${ROOT}-fade 4s ease forwards}
    .${ROOT}-projectile{position:absolute;border-radius:50%;z-index:2147483645;pointer-events:none}
    .${ROOT}-swing-arc{position:absolute;z-index:2147483645;pointer-events:none;border-radius:50%;border:3px solid rgba(255,255,255,.8)}
    .${ROOT}-dmg-number{position:fixed;z-index:2147483647;font:bold 14px/1 ui-monospace,monospace;pointer-events:none;animation:${ROOT}-dmg-float 1s ease forwards}
    @keyframes ${ROOT}-dmg-float{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-40px)}}
    .${ROOT}-peer-health{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);width:40px;height:4px;background:rgba(15,23,42,.8);border-radius:999px;overflow:hidden;margin-bottom:4px}
    .${ROOT}-peer-health-fill{height:100%;background:#22c55e;border-radius:999px;transition:width .2s}
    #${ROOT}-respawn-overlay{position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,.6);display:none;align-items:center;justify-content:center;flex-direction:column;gap:8px;pointer-events:none}
    #${ROOT}-respawn-overlay.visible{display:flex}
    #${ROOT}-respawn-text{font:bold 24px/1 ui-monospace,monospace;color:#f8fafc}
    #${ROOT}-respawn-sub{font:12px/1 ui-monospace,monospace;color:#94a3b8}
    .${ROOT}-pvp-badge{display:inline-block;padding:2px 8px;background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.5);border-radius:999px;font-size:10px;color:#fca5a5;margin-left:6px}
  `;
  document.head.appendChild(style);

  // ── DOM ───────────────────────────────────────────────────────
  const hud = document.createElement("div");
  hud.id = `${ROOT}-hud`;
  hud.innerHTML = `<button id="${ROOT}-toggle-hud" title="Toggle">«</button><h1>Page Climber</h1><p id="${ROOT}-username-display">Player: ${getUsername() || "not set"}</p><p id="${ROOT}-progress">Height: 0%</p><p id="${ROOT}-stats">Speed: 0 | Jump: 0</p><p id="${ROOT}-skin">Skin: ${state.currentSkin}</p><p id="${ROOT}-crate">Crates: ${state.stats.cratesOpened}</p><p id="${ROOT}-platform">Platform: none</p><p id="${ROOT}-mode">Mode: page</p><p id="${ROOT}-help">I inventory | J achievements | K skins | L levels | M multiplayer | F attack | S drop</p><div id="${ROOT}-controls"><button class="${ROOT}-button" id="${ROOT}-open-inventory">Inventory</button><button class="${ROOT}-button" id="${ROOT}-open-achievements">Achievements</button><button class="${ROOT}-button" id="${ROOT}-open-skins">Skins</button><button class="${ROOT}-button" id="${ROOT}-open-levels">Levels</button><button class="${ROOT}-button" id="${ROOT}-open-multi">Multiplayer</button><button class="${ROOT}-button" id="${ROOT}-open-profile">Profile</button></div>`;

  const panel = document.createElement("div");
  panel.id = `${ROOT}-panel`;
  panel.innerHTML = `<div class="${ROOT}-tabs"><button class="${ROOT}-button" data-tab="inventory">Inventory</button><button class="${ROOT}-button" data-tab="achievements">Achievements</button><button class="${ROOT}-button" data-tab="skins">Skins</button><button class="${ROOT}-button" data-tab="levels">Levels</button><button class="${ROOT}-button" data-tab="multi">Multiplayer</button><button class="${ROOT}-button" data-tab="leaderboard">Leaderboard</button><button class="${ROOT}-button" data-tab="profile">Profile</button></div><div id="${ROOT}-panel-content"></div>`;

  const toast = document.createElement("div"); toast.id = `${ROOT}-toast`;
  const levelBg = document.createElement("div"); levelBg.id = `${ROOT}-level-bg`;
  const levelGeo = document.createElement("div"); levelGeo.id = `${ROOT}-level-geo`;
  const remoteLayer = document.createElement("div"); remoteLayer.id = `${ROOT}-remote-layer`;
  const playerEl = document.createElement("div"); playerEl.id = `${ROOT}-player`;
  const finish = document.createElement("div"); finish.id = `${ROOT}-finish`;
  const highlight = document.createElement("div"); highlight.id = `${ROOT}-platform-highlight`;

  // PvP UI elements
  const healthbarWrap = document.createElement("div"); healthbarWrap.id = `${ROOT}-healthbar-wrap`;
  healthbarWrap.innerHTML = `<div id="${ROOT}-healthbar-bg"><div id="${ROOT}-healthbar-fill" style="width:100%"></div></div><div id="${ROOT}-health-text">100 / 100</div>`;
  const weaponHud = document.createElement("div"); weaponHud.id = `${ROOT}-weapon-hud`;
  weaponHud.textContent = "No weapon";
  const killfeed = document.createElement("div"); killfeed.id = `${ROOT}-killfeed`;
  const respawnOverlay = document.createElement("div"); respawnOverlay.id = `${ROOT}-respawn-overlay`;
  respawnOverlay.innerHTML = `<div id="${ROOT}-respawn-text">YOU DIED</div><div id="${ROOT}-respawn-sub">Respawning in 3...</div>`;

  document.body.append(hud, panel, toast, levelBg, levelGeo, remoteLayer, playerEl, finish, highlight, healthbarWrap, weaponHud, killfeed, respawnOverlay);

  const say = (text) => {
    const card = document.createElement("div");
    card.className = `${ROOT}-toast-card`;
    card.textContent = text;
    toast.appendChild(card);
    setTimeout(() => card.remove(), 2900);
  };

  const rect = () => ({ x: game.player.x, y: game.player.y, width: game.player.width, height: game.player.height });
  const hit = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const grow = (r, n) => ({ x: r.x - n, y: r.y - n, width: r.width + n * 2, height: r.height + n * 2 });
  const depth = (node) => { let d = 0, cur = node; while (cur && cur !== document.body) { d += 1; cur = cur.parentElement; } return d; };
  const getWorldHeight = () => game.customLevel?.height || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, innerHeight);
  const isPlatformCandidate = (node, r, cs) => {
    if (node === document.body || node === document.documentElement) return false;
    if (["fixed", "sticky"].includes(cs.position)) return false;
    if (r.width < 24 || r.height < 8 || r.bottom < -120 || r.top > innerHeight * 2.5) return false;
    const hugeWidth = r.width >= innerWidth * 0.94;
    const hugeHeight = r.height >= innerHeight * 0.55;
    if (hugeWidth && hugeHeight && node.children.length) return false;
    if (r.width * r.height > innerWidth * innerHeight * 0.65 && node.children.length) return false;
    return true;
  };
  const overlapsX = (platform, x, width, inset = 4) => x + width > platform.x + inset && x < platform.x + platform.width - inset;
  const platformCenterDistance = (platform, x, width) => Math.abs(platform.x + platform.width / 2 - (x + width / 2));
  const findSpawnPlatform = () => {
    const spawnX = game.player.x;
    const worldHeight = getWorldHeight();
    const candidates = game.platforms.filter((p) => p.source !== document.body && overlapsX(p, spawnX, game.player.width, 0) && p.y < worldHeight - 12);
    candidates.sort((a, b) => b.y - a.y || platformCenterDistance(a, spawnX, game.player.width) - platformCenterDistance(b, spawnX, game.player.width));
    return candidates[0] || null;
  };
  const standOnPlatform = (platform) => {
    if (!platform) return false;
    game.player.y = platform.y - game.player.height;
    game.player.vy = 0; game.player.onGround = true;
    game.player.jumpsLeft = game.player.canDoubleJump ? 1 : 0;
    game.currentPlatform = platform; game.currentHighlight = platform;
    return true;
  };
  const renderLevelGeometry = () => {
    if (!game.customLevel) { levelBg.style.display = "none"; levelGeo.style.display = "none"; levelGeo.innerHTML = ""; return; }
    levelBg.style.display = "block"; levelGeo.style.display = "block";
    levelBg.style.width = `${game.customLevel.width}px`; levelBg.style.height = `${game.customLevel.height}px`;
    levelGeo.style.width = `${game.customLevel.width}px`; levelGeo.style.height = `${game.customLevel.height}px`;
    levelGeo.innerHTML = (game.customLevel.platforms || []).map((p) => `<div class="${ROOT}-level-platform" style="left:${p.x}px;top:${p.y}px;width:${p.width}px;height:${p.height}px"></div>`).join("");
  };
  const peerColor = (id) => { let h = 0; for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i); return `hsl(${Math.abs(h) % 360} 75% 60%)`; };

  const renderPeers = () => {
    const peers = Object.values(game.multiplayer.peers);
    remoteLayer.style.width = `${Math.max(innerWidth, game.customLevel?.width || document.documentElement.clientWidth)}px`;
    remoteLayer.style.height = `${getWorldHeight()}px`;
    remoteLayer.innerHTML = peers.map((peer) => {
      const hpPct = peer.hp !== undefined ? Math.max(0, peer.hp) : 100;
      const hpBar = game.multiplayer.pvpEnabled ? `<div class="${ROOT}-peer-health"><div class="${ROOT}-peer-health-fill" style="width:${hpPct}%;background:${hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444'}"></div></div>` : '';
      return `<div class="${ROOT}-remote-player" style="left:${peer.x}px;top:${peer.y}px;background:${peer.color || peerColor(peer.id)};opacity:${peer.dead ? 0.3 : 0.88}">
        ${hpBar}
        <div class="${ROOT}-remote-label">${peer.name || "Player"}${peer.dead ? ' 💀' : ''}</div>
      </div>`;
    }).join("");
  };
  const cleanupPeer = (id) => { delete game.multiplayer.peers[id]; renderPeers(); };

  // ── PvP functions ─────────────────────────────────────────────
  const updateHealthUI = () => {
    if (!game.multiplayer.pvpEnabled) { healthbarWrap.classList.remove("visible"); return; }
    healthbarWrap.classList.add("visible");
    const pct = Math.max(0, (pvp.hp / pvp.maxHp) * 100);
    const fill = document.getElementById(`${ROOT}-healthbar-fill`);
    const text = document.getElementById(`${ROOT}-health-text`);
    if (fill) { fill.style.width = pct + "%"; fill.style.background = pct > 50 ? "linear-gradient(90deg,#22c55e,#4ade80)" : pct > 25 ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#ef4444,#f87171)"; }
    if (text) text.textContent = `${Math.ceil(pvp.hp)} / ${pvp.maxHp}`;
  };

  const updateWeaponUI = () => {
    if (!game.multiplayer.pvpEnabled || !pvp.weapon) { weaponHud.classList.remove("visible"); return; }
    weaponHud.classList.add("visible");
    const w = pvp.weapon;
    const t = w.type;
    let line2 = "";
    if (t === "gun") line2 = `${w.stats.ammo} ammo | ${w.stats.fireRate}rps`;
    else if (t === "sword") line2 = `${w.stats.swingArc}° arc | ${w.stats.comboLength} combo`;
    else if (t === "ability") line2 = `${w.stats.cooldown}s cd | ${w.stats.radius}r`;
    else if (t === "throwable") line2 = `${w.stats.fuseTime}s fuse`;
    weaponHud.innerHTML = `<div style="color:#60a5fa;font-weight:bold">${w.name}</div><div style="color:#94a3b8;font-size:10px">${w.type.toUpperCase()} | ${line2}</div><div style="color:#cbd5e1;font-size:10px">F to attack</div>`;
  };

  const showDamageNumber = (x, y, amount, isMe) => {
    const el = document.createElement("div");
    el.className = `${ROOT}-dmg-number`;
    el.textContent = `-${Math.round(amount)}`;
    el.style.left = (x - scrollX) + "px";
    el.style.top = (y - scrollY - 20) + "px";
    el.style.color = isMe ? "#ef4444" : "#f59e0b";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  };

  const addKillFeedEntry = (text) => {
    pvp.killFeed.push(text);
    const el = document.createElement("div");
    el.className = `${ROOT}-killfeed-entry`;
    el.textContent = text;
    killfeed.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  };

  const spawnRespawn = () => {
    pvp.dead = true;
    pvp.hp = 0;
    pvp.deaths++;
    playerEl.classList.add(`${ROOT}-dead`);
    respawnOverlay.classList.add("visible");
    // Clear projectiles we fired
    pvp.projectiles.forEach(p => p.el && p.el.remove());
    pvp.projectiles = [];
    updateHealthUI();
    // Broadcast death
    sendMultiplayerState(true);
    let countdown = 3;
    const sub = document.getElementById(`${ROOT}-respawn-sub`);
    const tick = setInterval(() => {
      countdown--;
      if (sub) sub.textContent = `Respawning in ${countdown}...`;
      if (countdown <= 0) {
        clearInterval(tick);
        doRespawn();
      }
    }, 1000);
  };

  const doRespawn = () => {
    pvp.dead = false;
    pvp.hp = pvp.maxHp;
    respawnOverlay.classList.remove("visible");
    playerEl.classList.remove(`${ROOT}-dead`);
    // Move to spawn
    const worldHeight = getWorldHeight();
    if (game.customLevel?.start) {
      game.player.x = game.customLevel.start.x;
      game.player.y = game.customLevel.start.y;
    } else {
      game.player.x = 24;
      game.player.y = worldHeight - game.player.height - 24;
    }
    game.player.vx = 0; game.player.vy = 0;
    updateHealthUI();
    sendMultiplayerState(true);
    say("Respawned!");
  };

  const takeDamage = (amount, attackerId, attackerName, weaponName) => {
    if (!game.multiplayer.pvpEnabled || pvp.dead) return;
    pvp.hp = Math.max(0, pvp.hp - amount);
    showDamageNumber(game.player.x + game.player.width / 2, game.player.y, amount, true);
    updateHealthUI();
    sendMultiplayerState(true);
    if (pvp.hp <= 0) {
      addKillFeedEntry(`${attackerName} killed ${getUsername()} with ${weaponName}`);
      spawnRespawn();
      // Tell attacker they got a kill
      if (game.multiplayer.socket?.readyState === WebSocket.OPEN) {
        game.multiplayer.socket.send(JSON.stringify({
          type: "pvp-kill",
          targetId: game.multiplayer.playerId,
          attackerId
        }));
      }
    }
  };

  // ── Weapon firing ─────────────────────────────────────────────
  const fireWeapon = () => {
    if (!pvp.weapon || !game.multiplayer.pvpEnabled || pvp.dead) return;
    const w = pvp.weapon;
    const now = Date.now();
    const t = w.type;

    if (t === "gun") {
      const minInterval = 1000 / (w.stats.fireRate || 5);
      if (now - pvp.lastFire < minInterval) return;
      pvp.lastFire = now;
      for (let i = 0; i < (w.stats.bulletCount || 1); i++) {
        const spread = ((w.stats.spread || 0) * Math.PI / 180) * (Math.random() - 0.5) * 2;
        const angle = game.player.facing > 0 ? spread : Math.PI + spread;
        const spd = w.stats.speed || 400;
        const proj = {
          x: game.player.x + game.player.width / 2,
          y: game.player.y + game.player.height / 2,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          damage: w.stats.damage || 25,
          range: w.stats.range || 300,
          traveled: 0,
          size: w.stats.bulletSize || 4,
          color: w.appearance?.primaryColor || "#60a5fa",
          weaponName: w.name,
          bounces: w.stats.bounces || 0,
          el: null,
          id: Math.random().toString(36).slice(2)
        };
        const el = document.createElement("div");
        el.className = `${ROOT}-projectile`;
        el.style.width = proj.size + "px";
        el.style.height = proj.size + "px";
        el.style.background = proj.color;
        el.style.boxShadow = `0 0 6px ${proj.color}`;
        el.style.left = proj.x + "px";
        el.style.top = proj.y + "px";
        document.body.appendChild(el);
        proj.el = el;
        pvp.projectiles.push(proj);
      }
      // Broadcast shot
      if (game.multiplayer.socket?.readyState === WebSocket.OPEN) {
        game.multiplayer.socket.send(JSON.stringify({
          type: "pvp-shot",
          x: game.player.x, y: game.player.y,
          facing: game.player.facing,
          weaponName: w.name,
          damage: w.stats.damage,
          spread: w.stats.spread,
          speed: w.stats.speed,
          range: w.stats.range,
          bulletCount: w.stats.bulletCount,
          bulletSize: w.stats.bulletSize,
          color: w.appearance?.primaryColor || "#60a5fa"
        }));
      }
    } else if (t === "sword") {
      if (pvp.swinging) return;
      pvp.swinging = true;
      const arc = document.createElement("div");
      arc.className = `${ROOT}-swing-arc`;
      const arcSize = (w.stats.bladeLength || 80) * 2;
      arc.style.width = arcSize + "px";
      arc.style.height = arcSize + "px";
      arc.style.left = (game.player.x + game.player.width / 2 - arcSize / 2) + "px";
      arc.style.top = (game.player.y + game.player.height / 2 - arcSize / 2) + "px";
      arc.style.borderColor = w.appearance?.primaryColor || "#60a5fa";
      document.body.appendChild(arc);
      // Check hits on peers
      Object.values(game.multiplayer.peers).forEach(peer => {
        if (peer.dead) return;
        const dist = Math.hypot((peer.x + 14) - (game.player.x + 14), (peer.y + 19) - (game.player.y + 19));
        if (dist < arcSize / 2) {
          if (game.multiplayer.socket?.readyState === WebSocket.OPEN) {
            game.multiplayer.socket.send(JSON.stringify({
              type: "pvp-hit",
              targetId: peer.id,
              damage: w.stats.damage || 25,
              knockback: w.stats.knockback || 8,
              weaponName: w.name,
              attackerName: getUsername()
            }));
          }
          showDamageNumber(peer.x, peer.y, w.stats.damage || 25, false);
        }
      });
      setTimeout(() => { arc.remove(); pvp.swinging = false; }, 300);
    } else if (t === "ability") {
      if (now - pvp.lastFire < (w.stats.cooldown || 5) * 1000) { say(`Cooldown: ${(((w.stats.cooldown || 5) * 1000 - (now - pvp.lastFire)) / 1000).toFixed(1)}s`); return; }
      pvp.lastFire = now;
      const aoe = document.createElement("div");
      aoe.className = `${ROOT}-swing-arc`;
      const r = w.stats.radius || 100;
      aoe.style.width = r * 2 + "px"; aoe.style.height = r * 2 + "px";
      aoe.style.left = (game.player.x + game.player.width / 2 - r) + "px";
      aoe.style.top = (game.player.y + game.player.height / 2 - r) + "px";
      aoe.style.borderColor = w.appearance?.primaryColor || "#a060ff";
      aoe.style.background = (w.appearance?.primaryColor || "#a060ff") + "22";
      document.body.appendChild(aoe);
      Object.values(game.multiplayer.peers).forEach(peer => {
        if (peer.dead) return;
        const dist = Math.hypot((peer.x + 14) - (game.player.x + 14), (peer.y + 19) - (game.player.y + 19));
        if (dist < r) {
          if (game.multiplayer.socket?.readyState === WebSocket.OPEN) {
            game.multiplayer.socket.send(JSON.stringify({
              type: "pvp-hit", targetId: peer.id,
              damage: w.stats.damage || 25, knockback: w.stats.knockback || 8,
              weaponName: w.name, attackerName: getUsername()
            }));
          }
          showDamageNumber(peer.x, peer.y, w.stats.damage || 25, false);
        }
      });
      setTimeout(() => aoe.remove(), (w.stats.duration || 1) * 1000);
    } else if (t === "throwable") {
      if (now - pvp.lastFire < 500) return;
      pvp.lastFire = now;
      const angle = game.player.facing > 0 ? -0.4 : Math.PI + 0.4;
      const force = w.stats.throwForce || 600;
      const proj = {
        x: game.player.x + game.player.width / 2,
        y: game.player.y + game.player.height / 2,
        vx: Math.cos(angle) * force * 0.6,
        vy: Math.sin(angle) * force * 0.6 - 200,
        damage: w.stats.damage || 25,
        range: 2000,
        traveled: 0,
        size: (w.appearance?.throwableSize || 14),
        color: w.appearance?.primaryColor || "#f59e0b",
        weaponName: w.name,
        bounces: w.stats.bounceCount || 2,
        fuse: (w.stats.fuseTime || 2) * 1000,
        isThrowable: true,
        explRadius: w.stats.throwableRadius || 60,
        el: null,
        id: Math.random().toString(36).slice(2)
      };
      const el = document.createElement("div");
      el.className = `${ROOT}-projectile`;
      el.style.width = proj.size + "px"; el.style.height = proj.size + "px";
      el.style.background = proj.color; el.style.borderRadius = "3px";
      el.style.left = proj.x + "px"; el.style.top = proj.y + "px";
      document.body.appendChild(el);
      proj.el = el;
      pvp.projectiles.push(proj);
    }
  };

  const updateProjectiles = (dt) => {
    pvp.projectiles = pvp.projectiles.filter(proj => {
      proj.vy += 400 * dt * (proj.isThrowable ? 1 : (pvp.weapon?.stats?.projectileGravity || 0) / 100);
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.traveled += Math.hypot(proj.vx * dt, proj.vy * dt);
      if (proj.el) { proj.el.style.left = proj.x + "px"; proj.el.style.top = proj.y + "px"; }

      // Fuse for throwables
      if (proj.isThrowable) {
        proj.fuse -= dt * 1000;
        if (proj.fuse <= 0) {
          explodeProjectile(proj);
          return false;
        }
      }

      // Hit peers
      let hitSomeone = false;
      Object.values(game.multiplayer.peers).forEach(peer => {
        if (peer.dead || hitSomeone) return;
        const dx = (peer.x + 14) - proj.x;
        const dy = (peer.y + 19) - proj.y;
        if (Math.hypot(dx, dy) < 20) {
          hitSomeone = true;
          if (game.multiplayer.socket?.readyState === WebSocket.OPEN) {
            game.multiplayer.socket.send(JSON.stringify({
              type: "pvp-hit", targetId: peer.id,
              damage: proj.damage, knockback: pvp.weapon?.stats?.knockback || 8,
              weaponName: proj.weaponName, attackerName: getUsername()
            }));
          }
          showDamageNumber(peer.x, peer.y, proj.damage, false);
          if (proj.el) proj.el.remove();
        }
      });
      if (hitSomeone) return false;

      if (proj.traveled > proj.range) { if (proj.el) proj.el.remove(); return false; }
      return true;
    });
  };

  const explodeProjectile = (proj) => {
    if (proj.el) proj.el.remove();
    const expl = document.createElement("div");
    expl.className = `${ROOT}-swing-arc`;
    expl.style.width = proj.explRadius * 2 + "px"; expl.style.height = proj.explRadius * 2 + "px";
    expl.style.left = (proj.x - proj.explRadius) + "px"; expl.style.top = (proj.y - proj.explRadius) + "px";
    expl.style.borderColor = proj.color; expl.style.background = proj.color + "33";
    document.body.appendChild(expl);
    setTimeout(() => expl.remove(), 400);
    Object.values(game.multiplayer.peers).forEach(peer => {
      if (peer.dead) return;
      const dist = Math.hypot((peer.x + 14) - proj.x, (peer.y + 19) - proj.y);
      if (dist < proj.explRadius) {
        if (game.multiplayer.socket?.readyState === WebSocket.OPEN) {
          game.multiplayer.socket.send(JSON.stringify({
            type: "pvp-hit", targetId: peer.id,
            damage: proj.damage, knockback: 15,
            weaponName: proj.weaponName, attackerName: getUsername()
          }));
        }
        showDamageNumber(peer.x, peer.y, proj.damage, false);
      }
    });
  };

  // ── Panel HTML ────────────────────────────────────────────────
  const panelHtml = {
    inventory() {
      const items = Object.entries(state.inventory).sort((a, b) => b[1] - a[1]);
      return `<h2>Inventory</h2><div class="${ROOT}-entry">Unique items: ${items.length}</div>${items.length ? items.map(([id, count]) => {
        const item = ITEMS.find((e) => id.startsWith(e.id.split("-").slice(0, -1).join("-"))) || { name: id, rarity: "unknown" };
        return `<div class="${ROOT}-entry"><strong>${item.name}</strong><span class="${ROOT}-muted">Count ${count} | ${item.rarity}</span></div>`;
      }).join("") : `<div class="${ROOT}-entry">No items yet. Open crates.</div>`}<button class="${ROOT}-button" data-close="1">Close</button>`;
    },
    achievements() {
      return `<h2>Achievements</h2><div class="${ROOT}-entry">Unlocked: ${Object.keys(state.achievements).length}</div>${Object.entries(ACH).map(([id, label]) => `<div class="${ROOT}-entry"><strong>${label}</strong><span class="${ROOT}-muted">${state.achievements[id] ? "Unlocked" : "Locked"}</span></div>`).join("")}<button class="${ROOT}-button" data-close="1">Close</button>`;
    },
    skins() {
      return `<h2>Skins</h2>${Object.entries(SKINS).map(([id, skin]) => `<div class="${ROOT}-entry"><strong>${skin[0]}</strong><span class="${ROOT}-muted">${state.unlockedSkins.includes(id) ? "Unlocked" : "Locked by " + (skin[2] || "default")}</span><div style="margin-top:8px"><button class="${ROOT}-button" data-skin="${id}" ${state.unlockedSkins.includes(id) ? "" : "disabled"}>Equip</button></div></div>`).join("")}<button class="${ROOT}-button" data-close="1">Close</button>`;
    },
    profile() {
      return (
        '<h2>Profile</h2>' +
        '<div class="' + ROOT + '-entry"><strong>Username</strong>' +
        '<div style="margin-top:8px;display:flex;gap:8px">' +
        '<input id="' + ROOT + '-username-input" class="' + ROOT + '-input" placeholder="Enter username" maxlength="20" value="' + (state.username || "") + '">' +
        '<button class="' + ROOT + '-button" data-action="save-username">Save</button>' +
        '</div><span id="' + ROOT + '-username-status" class="' + ROOT + '-muted" style="display:block;margin-top:6px"></span></div>' +
        '<div class="' + ROOT + '-entry"><strong>Stats</strong>' +
        '<span class="' + ROOT + '-muted">Level completions: ' + state.stats.levelCompletions + '</span>' +
        '<span class="' + ROOT + '-muted">Crates opened: ' + state.stats.cratesOpened + '</span>' +
        '<span class="' + ROOT + '-muted">Total jumps: ' + state.stats.jumps + '</span>' +
        '<span class="' + ROOT + '-muted">PvP kills: ' + pvp.kills + ' / deaths: ' + pvp.deaths + '</span>' +
        '</div>' +
        '<button class="' + ROOT + '-button" data-close="1">Close</button>'
      );
    },
    leaderboard() {
      return (
        '<h2>Leaderboard</h2>' +
        '<div class="' + ROOT + '-entry"><span class="' + ROOT + '-muted">Most level completions.</span>' +
        '<div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="fetch-leaderboard">Refresh</button></div></div>' +
        '<div id="' + ROOT + '-leaderboard-list">Loading...</div>' +
        '<button class="' + ROOT + '-button" data-close="1">Close</button>'
      );
    },
    levels() {
      const active = game.customLevel ? game.customLevel.name : "Page Mode";
      const uploadBlock = game.customLevel ? (
        '<div class="' + ROOT + '-entry"><strong>Share this level</strong>' +
        '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<input id="' + ROOT + '-author-input" class="' + ROOT + '-input" placeholder="Your name (optional)">' +
        '<button class="' + ROOT + '-button" data-action="upload-level">Upload</button></div>' +
        '<span id="' + ROOT + '-upload-status" class="' + ROOT + '-muted" style="display:block;margin-top:6px"></span></div>'
      ) : '';
      return (
        '<h2>Levels</h2>' +
        '<div class="' + ROOT + '-entry"><strong>Current</strong><span class="' + ROOT + '-muted">' + active + '</span></div>' +
        uploadBlock +
        '<div class="' + ROOT + '-entry"><strong>Community levels</strong>' +
        '<div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="fetch-levels">Refresh list</button></div>' +
        '<div id="' + ROOT + '-level-list" style="margin-top:10px"></div></div>' +
        '<div class="' + ROOT + '-entry"><strong>Load .bnm file</strong><div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="pick-level">Choose File</button></div></div>' +
        '<div class="' + ROOT + '-entry"><strong>Return to page</strong><div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="clear-level"' + (game.customLevel ? '' : ' disabled') + '>Exit level</button></div></div>' +
        '<button class="' + ROOT + '-button" data-close="1">Close</button>'
      );
    },
    multi() {
      const connected = !!game.multiplayer.socket;
      const code = game.multiplayer.room || "";
      const isHost = game.multiplayer.isHost;
      const pvpOn = game.multiplayer.pvpEnabled;
      const weaponName = pvp.weapon ? pvp.weapon.name : "None loaded";
      return (
        '<h2>Multiplayer</h2>' +
        (connected ?
          '<div class="' + ROOT + '-entry"><strong>Connected' + (pvpOn ? '<span class="' + ROOT + '-pvp-badge">PvP ON</span>' : '') + '</strong>' +
          '<span class="' + ROOT + '-muted">Room code: <strong style="color:#fff;font-size:18px;letter-spacing:4px">' + code + '</strong></span>' +
          '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
          (isHost ? '<button class="' + ROOT + '-button" data-action="' + (pvpOn ? 'pvp-off' : 'pvp-on') + '">' + (pvpOn ? '⚔ Disable PvP' : '⚔ Enable PvP') + '</button>' : '<span class="' + ROOT + '-muted" style="margin-top:4px">Only host can toggle PvP</span>') +
          '<button class="' + ROOT + '-button" data-action="mp-leave">Leave room</button>' +
          '</div></div>' +
          '<div class="' + ROOT + '-entry"><strong>Weapon</strong>' +
          '<span class="' + ROOT + '-muted">Equipped: ' + weaponName + '</span>' +
          '<div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="load-weapon">Load .wpn File</button></div></div>' +
          '<div class="' + ROOT + '-entry"><strong>PvP Stats</strong>' +
          '<span class="' + ROOT + '-muted">Kills: ' + pvp.kills + ' | Deaths: ' + pvp.deaths + '</span></div>' :
          '<div class="' + ROOT + '-entry"><strong>Create room</strong>' +
          '<div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="mp-create">Create room</button></div></div>' +
          '<div class="' + ROOT + '-entry"><strong>Join room</strong>' +
          '<div style="margin-top:8px;display:flex;gap:8px">' +
          '<input id="' + ROOT + '-room-input" placeholder="XKQZ" maxlength="4" style="width:80px;padding:6px 10px;border-radius:999px;border:1px solid rgba(96,165,250,.5);background:rgba(30,41,59,.9);color:#fff;font:inherit;outline:none;text-transform:uppercase">' +
          '<button class="' + ROOT + '-button" data-action="mp-join">Join</button></div>' +
          '<span id="' + ROOT + '-mp-status" class="' + ROOT + '-muted" style="display:block;margin-top:6px"></span></div>'
        ) +
        '<button class="' + ROOT + '-button" data-close="1">Close</button>'
      );
    }
  };

  // ── openPanel ─────────────────────────────────────────────────
  const openPanel = (tab) => {
    if (tab === undefined) tab = "inventory";
    state.panelTab = tab;
    panel.classList.add(ROOT + "-open");
    const content = panel.querySelector("#" + ROOT + "-panel-content");
    content.innerHTML = panelHtml[tab]();
    content.querySelectorAll("[data-skin]").forEach(function(btn) { btn.addEventListener("click", function() { setSkin(btn.dataset.skin); }); });
    content.querySelectorAll("[data-action='pick-level']").forEach(function(btn) { btn.addEventListener("click", function() { pickLevelFile(); }); });
    content.querySelectorAll("[data-action='clear-level']").forEach(function(btn) { btn.addEventListener("click", function() { clearLevel(); }); });
    content.querySelectorAll("[data-close]").forEach(function(btn) { btn.addEventListener("click", function() { panel.classList.remove(ROOT + "-open"); }); });

    content.querySelectorAll("[data-action='save-username']").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var input = content.querySelector("#" + ROOT + "-username-input");
        var statusEl = content.querySelector("#" + ROOT + "-username-status");
        var val = input ? input.value.trim() : "";
        if (!val) { if (statusEl) statusEl.textContent = "Please enter a username."; return; }
        state.username = val; save();
        if (statusEl) statusEl.textContent = "Saved!";
        hud.querySelector("#" + ROOT + "-username-display").textContent = "Player: " + val;
        submitLeaderboard(val, state.stats.levelCompletions);
        say("Username set to " + val);
      });
    });

    // PvP toggles
    content.querySelectorAll("[data-action='pvp-on']").forEach(function(btn) {
      btn.addEventListener("click", function() {
        if (!game.multiplayer.isHost) return;
        if (game.multiplayer.socket?.readyState === WebSocket.OPEN) {
          game.multiplayer.socket.send(JSON.stringify({ type: "pvp-toggle", enabled: true }));
        }
      });
    });
    content.querySelectorAll("[data-action='pvp-off']").forEach(function(btn) {
      btn.addEventListener("click", function() {
        if (!game.multiplayer.isHost) return;
        if (game.multiplayer.socket?.readyState === WebSocket.OPEN) {
          game.multiplayer.socket.send(JSON.stringify({ type: "pvp-toggle", enabled: false }));
        }
      });
    });

    // Load weapon
    content.querySelectorAll("[data-action='load-weapon']").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var input = document.createElement("input");
        input.type = "file"; input.accept = ".wpn,application/json";
        input.addEventListener("change", async function() {
          var file = input.files?.[0]; if (!file) return;
          try {
            var text = await file.text();
            var wpn = JSON.parse(text);
            if (wpn.format !== "wpn") { say("Not a valid .wpn file"); return; }
            pvp.weapon = wpn;
            updateWeaponUI();
            openPanel("multi");
            say("Weapon loaded: " + wpn.name);
          } catch (e) { say("Failed to load weapon file"); }
        });
        input.click();
      });
    });

    var fetchAndRenderLeaderboard = function() {
      var listEl = content.querySelector("#" + ROOT + "-leaderboard-list");
      if (!listEl) return;
      listEl.textContent = "Loading...";
      fetch(API_URL + "/leaderboard")
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.entries || !data.entries.length) { listEl.textContent = "No entries yet."; return; }
          listEl.innerHTML = data.entries.map(function(e, i) {
            return '<div class="' + ROOT + '-entry" style="display:flex;justify-content:space-between;align-items:center">' +
              '<span style="color:#94a3b8;margin-right:8px">#' + (i + 1) + '</span>' +
              '<strong style="flex:1">' + e.username + '</strong>' +
              '<span class="' + ROOT + '-muted">' + e.completions + ' completions</span></div>';
          }).join("");
        })
        .catch(function() { listEl.textContent = "Server unreachable."; });
    };
    content.querySelectorAll("[data-action='fetch-leaderboard']").forEach(function(btn) { btn.addEventListener("click", fetchAndRenderLeaderboard); });

    var fetchAndRenderLevels = function() {
      var listEl = content.querySelector("#" + ROOT + "-level-list");
      if (!listEl) return;
      listEl.textContent = "Loading...";
      fetch(API_URL + "/levels?limit=10")
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.levels || !data.levels.length) { listEl.textContent = "No levels yet."; return; }
          listEl.innerHTML = data.levels.map(function(l) {
            return '<div class="' + ROOT + '-entry" style="margin-bottom:6px"><strong>' + l.name + '</strong>' +
              '<span class="' + ROOT + '-muted">by ' + l.author + ' \u00b7 ' + l.platformCount + ' platforms \u00b7 ' + l.plays + ' plays</span>' +
              '<div style="margin-top:6px"><button class="' + ROOT + '-button" data-load-id="' + l.id + '">Play</button></div></div>';
          }).join("");
          listEl.querySelectorAll("[data-load-id]").forEach(function(btn) {
            btn.addEventListener("click", function() {
              btn.textContent = "Loading..."; btn.disabled = true;
              fetch(API_URL + "/levels/" + btn.dataset.loadId)
                .then(function(r) { return r.json(); })
                .then(function(level) { loadLevel(level); })
                .catch(function() { say("Failed to load level."); });
            });
          });
        })
        .catch(function() { listEl.textContent = "Server unreachable."; });
    };
    content.querySelectorAll("[data-action='fetch-levels']").forEach(function(btn) { btn.addEventListener("click", fetchAndRenderLevels); });

    content.querySelectorAll("[data-action='upload-level']").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var statusEl = content.querySelector("#" + ROOT + "-upload-status");
        var authorEl = content.querySelector("#" + ROOT + "-author-input");
        var author = authorEl ? authorEl.value || getUsername() : getUsername();
        if (!game.customLevel) return;
        statusEl.textContent = "Uploading...";
        fetch(API_URL + "/levels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.assign({}, game.customLevel, { author }))
        }).then(function(r) { return r.json(); })
          .then(function(data) {
            statusEl.textContent = data.ok ? "Uploaded! ID: " + data.id : "Error: " + data.error;
            if (data.ok) say("Level shared: " + game.customLevel.name);
          })
          .catch(function() { statusEl.textContent = "Could not reach server."; });
      });
    });

    content.querySelectorAll("[data-action='mp-create']").forEach(function(btn) { btn.addEventListener("click", function() { connectMultiplayer("create"); }); });
    content.querySelectorAll("[data-action='mp-join']").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var input = content.querySelector("#" + ROOT + "-room-input");
        var code = input ? input.value.toUpperCase().trim() : "";
        var statusEl = content.querySelector("#" + ROOT + "-mp-status");
        if (code.length !== 4) { if (statusEl) statusEl.textContent = "Enter a 4-letter code."; return; }
        connectMultiplayer("join", code);
      });
    });
    content.querySelectorAll("[data-action='mp-leave']").forEach(function(btn) { btn.addEventListener("click", function() { disconnectMultiplayer(); openPanel("multi"); }); });

    if (tab === "levels") fetchAndRenderLevels();
    if (tab === "leaderboard") fetchAndRenderLeaderboard();
  };

  const submitLeaderboard = (username, completions) => {
    fetch(API_URL + "/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, completions })
    }).catch(function() {});
  };

  // ── Game functions ────────────────────────────────────────────
  const unlock = (id) => {
    if (state.achievements[id]) return;
    state.achievements[id] = { id, label: ACH[id] || id, unlockedAt: Date.now() };
    Object.entries(SKINS).forEach(([skinId, skin]) => {
      if (skin[2] === id && !state.unlockedSkins.includes(skinId)) { state.unlockedSkins.push(skinId); say(`Skin unlocked: ${skin[0]}`); }
    });
    say(`Achievement unlocked: ${state.achievements[id].label}`);
    save();
  };

  const scanPlatforms = (force = false) => {
    const now = performance.now();
    if (!force && now - game.lastScan < 1200) return;
    game.lastScan = now;
    if (game.customLevel) {
      game.platforms = (game.customLevel.platforms || []).map((p, i) => ({
        x: p.x, y: p.y, width: p.width, height: p.height,
        source: { tagName: `LEVEL-${i}` }, isSubplatform: !!p.isSubplatform, link: null
      }));
      finish.style.left = `${game.customLevel.finish?.x || 12}px`;
      finish.style.top = `${game.customLevel.finish?.y || 12}px`;
      finish.style.width = `${game.customLevel.finish?.width || Math.max(80, innerWidth - 24)}px`;
      finish.style.height = `${game.customLevel.finish?.height || 18}px`;
      return;
    }
    const maxBottom = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const nodes = Array.from(document.body.querySelectorAll("*"));
    const all = [];
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.id.startsWith(ROOT)) continue;
      const cs = getComputedStyle(node);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
      const r = node.getBoundingClientRect();
      if (!isPlatformCandidate(node, r, cs)) continue;
      const link = node.closest("a[href]");
      all.push({
        x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height, source: node,
        isSubplatform: depth(node) > 3 || r.width < 160,
        link: link instanceof HTMLAnchorElement ? link : node instanceof HTMLAnchorElement ? node : null
      });
    }
    all.push({ x: 0, y: maxBottom - 4, width: Math.max(innerWidth, document.body.scrollWidth), height: 8, source: document.body, isSubplatform: false, link: null });
    all.sort((a, b) => a.y - b.y || a.width - b.width);
    game.platforms = all.filter((p, i, arr) => !arr.slice(0, i).some((q) => Math.abs(q.x - p.x) < 6 && Math.abs(q.y - p.y) < 6 && Math.abs(q.width - p.width) < 14 && Math.abs(q.height - p.height) < 12));
    const top = game.platforms[0];
    finish.style.left = "12px";
    finish.style.top = `${Math.max(12, (top?.y || 40) - 80)}px`;
    finish.style.width = `${Math.max(innerWidth, document.documentElement.clientWidth) - 24}px`;
    finish.style.height = "18px";
    if (game.currentPlatform?.source) {
      const refreshed = game.platforms.find((p) => p.source === game.currentPlatform.source);
      game.currentPlatform = refreshed || null; game.currentHighlight = refreshed || null;
    }
  };

  const spawnCrates = () => {
    game.crates.forEach((c) => c.el.remove());
    game.crates = [];
    if (game.customLevel?.crates?.length) {
      game.customLevel.crates.forEach((crate, index) => {
        const el = document.createElement("div"); el.className = `${ROOT}-crate`;
        el.style.left = `${crate.x}px`; el.style.top = `${crate.y}px`;
        document.body.appendChild(el);
        game.crates.push({ x: crate.x, y: crate.y, width: crate.width || 20, height: crate.height || 20, opened: false, el, platform: { source: { tagName: `LEVEL-CRATE-${index}` } } });
      });
      return;
    }
    const candidates = game.platforms.filter((p, i) => i > 1 && p.width > 50);
    const count = Math.min(18, Math.max(8, Math.floor(candidates.length / 7)));
    const used = new Set();
    for (let i = 0; i < count && candidates.length; i++) {
      const p = candidates[Math.floor(Math.random() * candidates.length)];
      const key = `${Math.round(p.x)}:${Math.round(p.y)}`;
      if (used.has(key)) continue; used.add(key);
      const el = document.createElement("div"); el.className = `${ROOT}-crate`;
      const x = p.x + Math.max(5, Math.random() * Math.max(5, p.width - 26));
      const y = p.y - 22;
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      document.body.appendChild(el);
      game.crates.push({ x, y, width: 20, height: 20, opened: false, el, platform: p });
    }
  };

  const useItem = (item) => {
    if (item.effect === "double") state.permanent.doubleJump = true;
    if (item.effect === "luck") state.permanent.crateLuck += item.amount;
    if (item.effect === "drop") state.permanent.dropPower += item.amount;
    if (item.effect === "crate") spawnCrates();
    if (item.rarity === "epic") unlock("crate-epic");
    syncPlayer();
  };

  const normalizeLevel = (level) => ({
    format: "bnm", version: 1, name: level.name || "Custom Level",
    width: level.width || Math.max(innerWidth, 2400),
    height: level.height || Math.max(innerHeight * 3, 4200),
    start: { x: level.start?.x ?? 24, y: level.start?.y ?? Math.max((level.height || innerHeight * 3) - 80, 120) },
    settings: { speed: Math.max(80, level.settings?.speed || state.permanent.speed), jump: Math.max(160, level.settings?.jump || state.permanent.jump) },
    finish: { x: level.finish?.x ?? 12, y: level.finish?.y ?? 12, width: level.finish?.width ?? Math.max(120, innerWidth - 24), height: level.finish?.height ?? 18 },
    platforms: Array.isArray(level.platforms) ? level.platforms.map((p) => ({ x: p.x || 0, y: p.y || 0, width: Math.max(24, p.width || 80), height: Math.max(8, p.height || 16), isSubplatform: !!p.isSubplatform })) : [],
    crates: Array.isArray(level.crates) ? level.crates.map((c) => ({ x: c.x || 0, y: c.y || 0, width: Math.max(12, c.width || 20), height: Math.max(12, c.height || 20) })) : []
  });

  const loadLevel = (input) => {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;
    const level = normalizeLevel(parsed);
    game.customLevel = level;
    game.currentPlatform = null; game.currentHighlight = null; game.lastLandingSource = null;
    game.player.x = level.start.x; game.player.y = level.start.y;
    game.player.vx = 0; game.player.vy = 0;
    game.player.speed = level.settings.speed; game.player.jump = level.settings.jump;
    game.finished = false;
    scanPlatforms(true); renderLevelGeometry(); standOnPlatform(findSpawnPlatform()); spawnCrates(); render();
    say(`Level loaded: ${level.name}`);
    if (panel.classList.contains(`${ROOT}-open`)) openPanel("levels");
    // Sync level to multiplayer room
    if (game.multiplayer.socket?.readyState === WebSocket.OPEN) {
      game.multiplayer.socket.send(JSON.stringify({ type: "load-level", level }));
    }
    return level;
  };

  const clearLevel = () => {
    game.customLevel = null; game.currentPlatform = null; game.currentHighlight = null;
    game.lastLandingSource = null; game.finished = false;
    syncPlayer(); scanPlatforms(true); renderLevelGeometry(); standOnPlatform(findSpawnPlatform()); spawnCrates(); render();
    say("Returned to page mode.");
    if (panel.classList.contains(`${ROOT}-open`)) openPanel("levels");
  };

  const pickLevelFile = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".bnm,application/json";
    input.addEventListener("change", async () => { const file = input.files?.[0]; if (!file) return; loadLevel(await file.text()); });
    input.click();
  };

  // ── Multiplayer ───────────────────────────────────────────────
  const handleMultiplayerMessage = (message) => {
    if (message.type === "welcome") {
      game.multiplayer.playerId = message.id;
      game.multiplayer.room = message.room;
      game.multiplayer.isHost = message.isHost || false;
      say("Connected! Room code: " + message.room);
      if (panel.classList.contains(ROOT + "-open")) openPanel("multi");
      return;
    }
    if (message.type === "error") {
      say("Multiplayer: " + message.message);
      const statusEl = document.querySelector("#" + ROOT + "-mp-status");
      if (statusEl) statusEl.textContent = message.message;
      return;
    }
    if (message.type === "snapshot") {
      game.multiplayer.peers = {};
      (message.players || []).forEach((p) => {
        if (p.id !== game.multiplayer.playerId) game.multiplayer.peers[p.id] = p;
      });
      if (message.pvpEnabled !== undefined) {
        game.multiplayer.pvpEnabled = message.pvpEnabled;
        updateHealthUI(); updateWeaponUI();
        if (panel.classList.contains(ROOT + "-open") && state.panelTab === "multi") openPanel("multi");
      }
      renderPeers(); return;
    }
    if (message.type === "player-left") { cleanupPeer(message.id); return; }
    if (message.type === "player-state" && message.player?.id !== game.multiplayer.playerId) {
      game.multiplayer.peers[message.player.id] = message.player;
      renderPeers(); return;
    }
    if (message.type === "load-level") { loadLevel(message.level); return; }
    if (message.type === "pvp-state") {
      game.multiplayer.pvpEnabled = message.enabled;
      updateHealthUI(); updateWeaponUI();
      say("PvP " + (message.enabled ? "enabled" : "disabled") + " by host");
      if (panel.classList.contains(ROOT + "-open") && state.panelTab === "multi") openPanel("multi");
      return;
    }
    if (message.type === "pvp-hit" && message.targetId === game.multiplayer.playerId) {
      takeDamage(message.damage, message.attackerId, message.attackerName || "Unknown", message.weaponName || "Weapon");
      return;
    }
    if (message.type === "pvp-kill-confirm") {
      pvp.kills++;
      addKillFeedEntry(`${getUsername()} killed ${message.targetName} with ${message.weaponName}`);
      say(`You killed ${message.targetName}!`);
      return;
    }
  };

  const sendMultiplayerState = (force = false) => {
    const socket = game.multiplayer.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (!force && now - game.multiplayer.lastSentAt < 80) return;
    game.multiplayer.lastSentAt = now;
    socket.send(JSON.stringify({
      type: "player-state",
      x: Math.round(game.player.x), y: Math.round(game.player.y),
      name: getUsername(), color: SKINS[state.currentSkin]?.[1] || "#4ade80",
      hp: pvp.hp, dead: pvp.dead
    }));
  };

  const connectMultiplayer = (type, roomCode) => {
    disconnectMultiplayer();
    const wsUrl = API_URL.replace("https://", "wss://").replace("http://", "ws://");
    const socket = new WebSocket(wsUrl);
    game.multiplayer.socket = socket;
    socket.addEventListener("open", function() {
      socket.send(JSON.stringify({
        type, room: roomCode || undefined,
        name: getUsername(), color: SKINS[state.currentSkin]?.[1] || "#4ade80"
      }));
    });
    socket.addEventListener("message", function(event) {
      try { handleMultiplayerMessage(JSON.parse(event.data)); }
      catch (e) { console.warn("MP parse fail", e); }
    });
    socket.addEventListener("close", function() {
      game.multiplayer.socket = null; game.multiplayer.playerId = null;
      game.multiplayer.room = null; game.multiplayer.isHost = false;
      game.multiplayer.pvpEnabled = false;
      game.multiplayer.peers = {}; renderPeers();
      updateHealthUI(); updateWeaponUI();
      say("Multiplayer disconnected.");
      if (panel.classList.contains(ROOT + "-open")) openPanel("multi");
    });
    socket.addEventListener("error", function() { say("Multiplayer connection error."); });
  };

  const disconnectMultiplayer = () => {
    if (game.multiplayer.socket) { game.multiplayer.socket.close(); game.multiplayer.socket = null; }
    game.multiplayer.playerId = null; game.multiplayer.room = null;
    game.multiplayer.isHost = false; game.multiplayer.pvpEnabled = false;
    game.multiplayer.peers = {}; renderPeers();
    updateHealthUI(); updateWeaponUI();
  };

  const openCrate = (crate) => {
    if (crate.opened) return;
    crate.opened = true; crate.el.remove(); state.stats.cratesOpened += 1;
    const item = ITEMS[(Math.floor(Math.random() * ITEMS.length) + state.permanent.crateLuck) % ITEMS.length];
    state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;
    useItem(item); say(`Crate opened: ${item.name} (${item.rarity})`); save();
    if (panel.classList.contains(`${ROOT}-open`)) openPanel(state.panelTab);
  };

  const setSkin = (id) => {
    if (!state.unlockedSkins.includes(id)) return false;
    state.currentSkin = id; save(); say(`Skin changed to ${SKINS[id][0]}`); return true;
  };

  const breakLink = (platform) => {
    const link = platform?.link;
    if (!(link instanceof HTMLAnchorElement) || !link.href) return;
    const hits = (game.linkHits.get(link) || 0) + 1;
    game.linkHits.set(link, hits);
    link.classList.add(`${ROOT}-link-hit`);
    setTimeout(() => link.classList.remove(`${ROOT}-link-hit`), 350);
    if (hits === 1) unlock("link-hit-1");
    if (hits < 4) return say(`Link cracked ${hits}/4`);
    state.stats.linksBroken += 1; unlock("link-1");
    if (state.stats.linksBroken >= 5) unlock("link-5");
    save();
    say(`Link broken: traveling to ${new URL(link.href).hostname}`);
    setTimeout(() => { location.href = link.href; }, 500);
  };

  const updateMilestones = () => {
    const p = state.stats.maxHeightPercent, c = state.stats.cratesOpened, j = state.stats.jumps,
      inv = Object.keys(state.inventory).length, a = Object.keys(state.achievements).length,
      skins = state.unlockedSkins.length, sites = state.visitedOrigins.length;
    if (p >= 10) unlock("reach-10"); if (p >= 25) unlock("reach-25"); if (p >= 50) unlock("reach-50");
    if (p >= 75) unlock("reach-75"); if (p >= 90) unlock("reach-90"); if (p >= 100) unlock("reach-100");
    if (c >= 1) unlock("crate-1"); if (c >= 10) unlock("crate-10"); if (c >= 25) unlock("crate-25");
    if (c >= 50) unlock("crate-50"); if (c >= 75) unlock("crate-75"); if (c === 42) unlock("crate-42");
    if (j >= 25) unlock("jump-25"); if (j >= 100) unlock("jump-100"); if (j >= 500) unlock("jump-500");
    if (sites >= 3) unlock("site-3"); if (sites >= 10) unlock("site-10");
    if (inv >= 10) unlock("collector-10"); if (inv >= 20) unlock("collector-20");
    if (inv >= 25) unlock("inventory-25"); if (inv >= 60) unlock("collector-60");
    if (state.stats.deaths >= 1) unlock("fall-1"); if (state.stats.deaths >= 10) unlock("fall-10");
    if (state.stats.totalDistance >= 100000) unlock("marathon");
    if (state.stats.drops >= 1) unlock("drop-1"); if (state.stats.drops >= 50) unlock("drop-50");
    if (state.stats.landings >= 50) unlock("land-50"); if (state.stats.landings >= 500) unlock("land-500");
    if (state.stats.subplatformLandings >= 25) unlock("subplatform-25");
    if (a >= 10) unlock("achievement-10"); if (a >= 25) unlock("achievement-25");
    if (skins >= 3) unlock("skin-3"); if (skins >= 6) unlock("skin-6");
  };

  const render = () => {
    playerEl.style.left = `${game.player.x}px`; playerEl.style.top = `${game.player.y}px`;
    playerEl.style.background = SKINS[state.currentSkin]?.[1] || SKINS.rookie[1];
    playerEl.style.transform = `scaleX(${game.player.facing})`;
    playerEl.classList.toggle(`${ROOT}-run`, game.player.onGround && Math.abs(game.player.vx) > 5);
    playerEl.classList.toggle(`${ROOT}-jump`, !game.player.onGround);
    playerEl.classList.toggle(`${ROOT}-dead`, pvp.dead);
    if (game.currentPlatform) {
      highlight.style.display = "block";
      highlight.style.left = `${game.currentPlatform.x}px`; highlight.style.top = `${game.currentPlatform.y}px`;
      highlight.style.width = `${game.currentPlatform.width}px`;
      highlight.style.height = `${Math.max(8, Math.min(game.currentPlatform.height, 28))}px`;
    } else { highlight.style.display = "none"; }
    hud.querySelector(`#${ROOT}-progress`).textContent = `Height: ${state.stats.maxHeightPercent}%`;
    hud.querySelector(`#${ROOT}-stats`).textContent = `Speed: ${Math.round(game.player.speed)} | Jump: ${Math.round(game.player.jump)} | Gravity: ${Math.round(game.player.gravity)}`;
    hud.querySelector(`#${ROOT}-skin`).textContent = `Skin: ${SKINS[state.currentSkin]?.[0] || state.currentSkin}`;
    hud.querySelector(`#${ROOT}-crate`).textContent = `Crates: ${state.stats.cratesOpened} | Achievements: ${Object.keys(state.achievements).length}`;
    hud.querySelector(`#${ROOT}-platform`).textContent = `Platform: ${game.currentPlatform?.source?.tagName?.toLowerCase() || "none"}${game.currentPlatform?.isSubplatform ? " (sub)" : ""}`;
    hud.querySelector(`#${ROOT}-mode`).textContent = `Mode: ${game.customLevel ? "level - " + game.customLevel.name : "page"}${game.multiplayer.pvpEnabled ? " ⚔ PvP" : ""}`;
  };

  const jump = () => {
    if (pvp.dead) return;
    if (game.player.onGround || game.coyote > 0) {
      game.player.vy = -game.player.jump; game.player.onGround = false; game.coyote = 0;
      game.player.jumpsLeft = game.player.canDoubleJump ? 1 : 0;
      state.stats.jumps += 1; return save();
    }
    if (game.player.jumpsLeft > 0) {
      game.player.vy = -game.player.jump * 0.92; game.player.jumpsLeft -= 1;
      state.stats.jumps += 1; unlock("combo-3"); save();
    }
  };

  const drop = () => {
    if (pvp.dead) return;
    game.dropTimer = 220 + state.permanent.dropPower * 40;
    game.player.onGround = false; game.player.vy = Math.max(game.player.vy, 150);
    state.stats.drops += 1; save();
  };

  const step = (dt) => {
    updateProjectiles(dt);
    if (pvp.dead) return;
    const p = game.player;
    const prev = { x: p.x, y: p.y };
    const left = game.keys.has("a") || game.keys.has("arrowleft");
    const right = game.keys.has("d") || game.keys.has("arrowright");
    p.vx = 0;
    if (left) p.vx -= p.speed;
    if (right) p.vx += p.speed;
    if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1;
    p.vy += p.gravity * dt;
    if (game.keys.has("s") || game.keys.has("arrowdown")) p.vy += (220 + state.permanent.dropPower * 20) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = Math.max(0, Math.min(p.x, Math.max(innerWidth, document.documentElement.clientWidth) - p.width));
    p.onGround = false; p.wallSide = 0; p.wallTimer = 0;
    const previousPlatform = game.currentPlatform;
    game.currentPlatform = null;
    const prevBottom = prev.y + p.height; const nextBottom = p.y + p.height;
    if (previousPlatform && game.dropTimer <= 0 && overlapsX(previousPlatform, p.x, p.width, 0) && Math.abs(prevBottom - previousPlatform.y) <= 10 && p.vy >= 0) {
      standOnPlatform(previousPlatform);
    }
    const landings = [];
    for (const platform of game.platforms) {
      const overlapX = overlapsX(platform, p.x, p.width);
      if (!overlapX) continue;
      if (game.dropTimer > 0 && game.currentHighlight?.source === platform.source) continue;
      if (p.vy >= 0 && prevBottom <= platform.y && nextBottom >= platform.y) landings.push(platform);
    }
    game.coyote = p.onGround ? 90 : Math.max(0, game.coyote - dt * 1000);
    game.dropTimer = Math.max(0, game.dropTimer - dt * 1000);
    landings.sort((a, b) => platformCenterDistance(a, p.x, p.width) - platformCenterDistance(b, p.x, p.width) || a.width - b.width);
    const platform = game.currentPlatform || landings[0];
    if (!game.currentPlatform && platform && game.dropTimer <= 0) {
      standOnPlatform(platform); p.wallSide = 0; p.wallTimer = 0;
      state.stats.landings += 1;
      if (platform.isSubplatform) state.stats.subplatformLandings += 1;
      if (game.lastLandingSource !== platform.source) breakLink(platform);
      game.lastLandingSource = platform.source;
    }
    if (!platform) game.lastLandingSource = null;
    const worldHeight = getWorldHeight();
    if (p.y + p.height > worldHeight) { p.y = worldHeight - p.height; p.vy = 0; p.onGround = true; state.stats.deaths += 1; }
    const climbed = Math.max(0, worldHeight - (p.y + p.height));
    const percent = Math.min(100, Math.round((climbed / Math.max(1, worldHeight - innerHeight)) * 100));
    state.stats.maxHeightPx = Math.max(state.stats.maxHeightPx, climbed);
    state.stats.maxHeightPercent = Math.max(state.stats.maxHeightPercent, percent);
    state.stats.totalDistance += Math.abs(p.vx * dt);
    if (percent >= 90 && Date.now() - game.startedAt < 35000) unlock("near-top-fast");
    if (percent >= 100 && !game.finished) { game.finished = true; unlock("finish"); say("Top reached. You beat this page."); }
    if (game.customLevel?.finish && hit(rect(), game.customLevel.finish) && !game.finished) {
      game.finished = true; state.stats.levelCompletions += 1; unlock("finish");
      say("Level cleared: " + game.customLevel.name);
      if (state.username) submitLeaderboard(state.username, state.stats.levelCompletions);
      save();
    }
    for (const crate of game.crates) if (!crate.opened && hit(rect(), crate)) openCrate(crate);
    updateMilestones();
    const target = Math.max(0, p.y - innerHeight * 0.6);
    scrollTo({ top: scrollY + (target - scrollY) * 0.08, behavior: "auto" });
  };

  const loop = (now) => {
    if (!game.running) return;
    const dt = Math.min(0.032, (now - game.lastFrame) / 1000);
    game.lastFrame = now;
    scanPlatforms(false); step(dt); sendMultiplayerState(false); render();
    requestAnimationFrame(loop);
  };

  const onKeyDown = (event) => {
    if (!game.running) return;
    const key = event.key.toLowerCase();
    game.keys.add(key);
    if (event.key === " " || event.key === "ArrowUp" || key === "w") { jump(); event.preventDefault(); }
    if (key === "e") { const crate = game.crates.find((c) => !c.opened && hit(grow(rect(), 22), c)); if (crate) openCrate(crate); event.preventDefault(); }
    if (key === "s" || event.key === "ArrowDown") { drop(); event.preventDefault(); }
    if (key === "f") { fireWeapon(); event.preventDefault(); }
    if (key === "i") { openPanel("inventory"); event.preventDefault(); }
    if (key === "j") { openPanel("achievements"); event.preventDefault(); }
    if (key === "k") { openPanel("skins"); event.preventDefault(); }
    if (key === "l") { openPanel("levels"); event.preventDefault(); }
    if (key === "m") { openPanel("multi"); event.preventDefault(); }
    const combo = (window.__pcSecret = [...(window.__pcSecret || []), event.key].slice(-14)).join(",");
    if (combo.includes("ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a")) unlock("konami");
    if (combo.toLowerCase().includes("h,o,v,e,r")) unlock("secret-hover");
  };

  const onKeyUp = (event) => game.keys.delete(event.key.toLowerCase());
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  addEventListener("resize", () => { scanPlatforms(true); spawnCrates(); });
  addEventListener("scroll", () => scanPlatforms(false), { passive: true });

  hud.querySelector(`#${ROOT}-toggle-hud`).addEventListener("click", () => {
    const collapsed = hud.classList.toggle(ROOT + "-collapsed");
    hud.querySelector("#" + ROOT + "-toggle-hud").textContent = collapsed ? "»" : "«";
  });
  hud.querySelector(`#${ROOT}-open-inventory`).addEventListener("click", () => openPanel("inventory"));
  hud.querySelector(`#${ROOT}-open-achievements`).addEventListener("click", () => openPanel("achievements"));
  hud.querySelector(`#${ROOT}-open-skins`).addEventListener("click", () => openPanel("skins"));
  hud.querySelector(`#${ROOT}-open-levels`).addEventListener("click", () => openPanel("levels"));
  hud.querySelector(`#${ROOT}-open-multi`).addEventListener("click", () => openPanel("multi"));
  hud.querySelector(`#${ROOT}-open-profile`).addEventListener("click", () => openPanel("profile"));
  panel.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => openPanel(btn.dataset.tab)));

  const exportSave = () => {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    navigator.clipboard?.writeText(payload).catch(() => {});
    say("Save exported to clipboard.");
    return payload;
  };
  const importSave = (payload) => {
    const next = merge(fresh(), JSON.parse(decodeURIComponent(escape(atob(payload)))));
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, next);
    state.visitedOrigins = [...new Set([...(state.visitedOrigins || []), location.origin])];
    syncPlayer(); save(); render(); say("Save imported.");
  };
  const secret = (name) => {
    const v = String(name).toLowerCase();
    if (v === "cloud") return unlock("secret-cloud"), true;
    if (v === "hover") return unlock("secret-hover"), true;
    return false;
  };
  const resetSave = () => {
    const next = fresh();
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, next); syncPlayer(); save(); say("Save reset.");
  };
  const destroy = () => {
    game.running = false; disconnectMultiplayer();
    game.crates.forEach((c) => c.el.remove());
    pvp.projectiles.forEach(p => p.el?.remove());
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    style.remove(); hud.remove(); panel.remove(); toast.remove(); levelBg.remove();
    levelGeo.remove(); remoteLayer.remove(); playerEl.remove(); finish.remove(); highlight.remove();
    healthbarWrap.remove(); weaponHud.remove(); killfeed.remove(); respawnOverlay.remove();
    delete window.PageClimber;
  };

  syncPlayer();
  game.player.y = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, innerHeight) - game.player.height - 24;
  state.stats.runs += 1; save();
  scanPlatforms(true); renderLevelGeometry(); standOnPlatform(findSpawnPlatform()); spawnCrates(); render();
  say("Page Climber started. I inventory, J achievements, K skins, L levels, M multiplayer, F attack.");
  requestAnimationFrame(loop);

  window.PageClimber = {
    exportSave, importSave, loadLevel, clearLevel, pickLevelFile,
    connectMultiplayer, disconnectMultiplayer,
    listAchievements: () => Object.values(state.achievements),
    listSkins: () => Object.entries(SKINS).map(([id, skin]) => ({ id, label: skin[0], unlocked: state.unlockedSkins.includes(id) })),
    setSkin, openPanel,
    closePanel: () => panel.classList.remove(`${ROOT}-open`),
    loadWeapon: (wpn) => { pvp.weapon = wpn; updateWeaponUI(); say("Weapon loaded: " + wpn.name); },
    secret, resetSave, save: state, destroy
  };
})();