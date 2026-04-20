(() => {
  if (window.PageClimber?.destroy) window.PageClimber.destroy();
  const API_URL = "https://page-climber-server.onrender.com";
  const KEY = "page-climber-save-v2";
  const AUTH_KEY = "page-climber-auth";
  const ROOT = "page-climber-root";
  
  // ── Device fingerprinting ─────────────────────────────────────
  const getDeviceFingerprint = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.fillText("fingerprint", 10, 20);
    const canvasHash = canvas.toDataURL().substring(0, 50);
    const fp = navigator.userAgent + "|" + screen.width + "x" + screen.height + "|" + navigator.language + "|" + canvasHash;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < fp.length; i++) {
      const char = fp.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };
  
  const deviceFingerprint = getDeviceFingerprint();
  
  // ── Auth utilities ────────────────────────────────────────────
  let authToken = localStorage.getItem(AUTH_KEY);
  let currentUser = null;
  
  const login = async (username, password) => {
    try {
      const res = await fetch(API_URL + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, deviceFingerprint })
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Login failed" };
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem(AUTH_KEY, authToken);
      say("Logged in as " + currentUser.username);
      return { ok: true, user: currentUser };
    } catch (e) { return { error: "Network error" }; }
  };
  
  const register = async (username, password) => {
    try {
      const res = await fetch(API_URL + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, deviceFingerprint })
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Registration failed" };
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem(AUTH_KEY, authToken);
      say("Account created! Welcome " + currentUser.username);
      return { ok: true, user: currentUser };
    } catch (e) { return { error: "Network error" }; }
  };
  
  const logout = () => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem(AUTH_KEY);
    say("Logged out");
  };
  
  const verifyAuth = async () => {
    if (!authToken) return null;
    try {
    const res = await fetch(API_URL + "/verify", {
      method: "POST",  // ADD THIS
      headers: { "Authorization": "Bearer " + authToken }
    });
      if (!res.ok) { authToken = null; localStorage.removeItem(AUTH_KEY); return null; }
      const data = await res.json();
      currentUser = data.user;
      return currentUser;
    } catch { return null; }
  };
  
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

  // ── Weapon Addons ─────────────────────────────────────────────
  const ADDON_TYPES = [
    // GUNS - Optics (20 items)
    { name: "Laser Sight", id: "laser_sight", stat: "accuracy", value: 5, rarity: "common", type: "gun" },
    { name: "Red Dot", id: "red_dot", stat: "accuracy", value: 8, rarity: "common", type: "gun" },
    { name: "Holographic Sight", id: "holo_sight", stat: "accuracy", value: 15, rarity: "rare", type: "gun" },
    { name: "ACOG Scope", id: "acog_scope", stat: "range", value: 100, rarity: "epic", type: "gun" },
    { name: "Thermal Scope", id: "thermal_scope", stat: "range", value: 50, rarity: "rare", type: "gun" },
    { name: "Thermal Scope", id: "thermal_scope", stat: "range", value: 50, rarity: "rare", type: "gun" },
    { name: "Night Vision Scope", id: "night_vision", stat: "range", value: 75, rarity: "epic", type: "gun" },
    { name: "Rifleman Scope", id: "rifleman_scope", stat: "range", value: 75, rarity: "uncommon", type: "gun" },
    { name: "Fiber Optic Sight", id: "fiber_optic", stat: "accuracy", value: 12, rarity: "uncommon", type: "gun" },
    { name: "Tritium Sight", id: "tritium_sight", stat: "accuracy", value: 10, rarity: "uncommon", type: "gun" },
    { name: "Magnified Optic", id: "mag_optic", stat: "range", value: 60, rarity: "uncommon", type: "gun" },
    { name: "Aperture Sight", id: "aperture_sight", stat: "accuracy", value: 7, rarity: "common", type: "gun" },
    { name: "Ghost Ring Sight", id: "ghost_ring", stat: "accuracy", value: 9, rarity: "uncommon", type: "gun" },
    { name: "Prism Scope", id: "prism_scope", stat: "accuracy", value: 20, rarity: "rare", type: "gun" },
    { name: "Hybrid Sight", id: "hybrid_sight", stat: "accuracy", value: 18, rarity: "rare", type: "gun" },
    { name: "Elliptical Sight", id: "elliptical_sight", stat: "accuracy", value: 14, rarity: "uncommon", type: "gun" },
    { name: "Combat Sight", id: "combat_sight", stat: "accuracy", value: 11, rarity: "common", type: "gun" },
    { name: "Reflex Sight", id: "reflex_sight", stat: "accuracy", value: 13, rarity: "uncommon", type: "gun" },
    { name: "Pixel Scope", id: "pixel_scope", stat: "accuracy", value: 25, rarity: "epic", type: "gun" },
    { name: "Quantum Sight", id: "quantum_sight", stat: "accuracy", value: 30, rarity: "epic", type: "gun" },
    
    // GUNS - Grips & Handling (15 items)
    { name: "Foregrip", id: "foregrip", stat: "recoil", value: -3, rarity: "common", type: "gun" },
    { name: "Vertical Grip", id: "vert_grip", stat: "recoil", value: -5, rarity: "uncommon", type: "gun" },
    { name: "Angled Grip", id: "angled_grip", stat: "fireRate", value: 2, rarity: "uncommon", type: "gun" },
    { name: "Ergonomic Grip", id: "ergo_grip", stat: "recoil", value: -4, rarity: "common", type: "gun" },
    { name: "Stubby Grip", id: "stubby_grip", stat: "spread", value: -2, rarity: "uncommon", type: "gun" },
    { name: "Tactical Grip", id: "tactical_grip", stat: "recoil", value: -6, rarity: "rare", type: "gun" },
    { name: "Pistol Grip", id: "pistol_grip", stat: "accuracy", value: 4, rarity: "common", type: "gun" },
    { name: "Bipod", id: "bipod", stat: "stability", value: 20, rarity: "uncommon", type: "gun" },
    { name: "Assault Bipod", id: "assault_bipod", stat: "stability", value: 25, rarity: "rare", type: "gun" },
    { name: "Monopod", id: "monopod", stat: "stability", value: 15, rarity: "uncommon", type: "gun" },
    { name: "Hand Stop", id: "hand_stop", stat: "recoil", value: -2, rarity: "common", type: "gun" },
    { name: "Magazine Rod", id: "mag_rod", stat: "fireRate", value: 1, rarity: "common", type: "gun" },
    { name: "Thumb Rest", id: "thumb_rest", stat: "accuracy", value: 6, rarity: "common", type: "gun" },
    { name: "Pressure Pad", id: "pressure_pad", stat: "fireRate", value: 3, rarity: "uncommon", type: "gun" },
    { name: "Ergonomic Pad", id: "ergo_pad", stat: "recoil", value: -7, rarity: "rare", type: "gun" },
    
    // GUNS - Muzzles & Barrels (20 items)
    { name: "Suppressor", id: "suppressor", stat: "damage", value: -2, rarity: "rare", type: "gun" },
    { name: "Muzzle Brake", id: "muzzle_brake", stat: "recoil", value: -8, rarity: "rare", type: "gun" },
    { name: "Flash Hider", id: "flash_hider", stat: "stealth", value: 15, rarity: "uncommon", type: "gun" },
    { name: "Compensator", id: "compensator", stat: "spread", value: -5, rarity: "rare", type: "gun" },
    { name: "Linear Comp", id: "linear_comp", stat: "recoil", value: -10, rarity: "epic", type: "gun" },
    { name: "Enforcer Muzzle", id: "enforcer_muzzle", stat: "damage", value: 5, rarity: "rare", type: "gun" },
    { name: "Blast Diverter", id: "blast_diverter", stat: "recoil", value: -9, rarity: "epic", type: "gun" },
    { name: "Exotic Muzzle", id: "exotic_muzzle", stat: "damage", value: 10, rarity: "epic", type: "gun" },
    { name: "Quantum Barrel", id: "quantum_barrel", stat: "range", value: 120, rarity: "epic", type: "gun" },
    { name: "Extended Barrel", id: "extended_barrel", stat: "range", value: 40, rarity: "uncommon", type: "gun" },
    { name: "Lightweight Barrel", id: "lightweight_barrel", stat: "fireRate", value: 4, rarity: "uncommon", type: "gun" },
    { name: "Heavy Barrel", id: "heavy_barrel", stat: "stability", value: 18, rarity: "uncommon", type: "gun" },
    { name: "Precision Barrel", id: "precision_barrel", stat: "accuracy", value: 16, rarity: "rare", type: "gun" },
    { name: "Archangel Barrel", id: "archangel_barrel", stat: "damage", value: 8, rarity: "rare", type: "gun" },
    { name: "Inferno Barrel", id: "inferno_barrel", stat: "damage", value: 15, rarity: "epic", type: "gun" },
    { name: "Frostbite Barrel", id: "frostbite_barrel", stat: "fireRate", value: 6, rarity: "epic", type: "gun" },
    { name: "Plasma Barrel", id: "plasma_barrel", stat: "range", value: 140, rarity: "epic", type: "gun" },
    { name: "Titanium Barrel", id: "titanium_barrel", stat: "durability", value: 50, rarity: "rare", type: "gun" },
    { name: "Carbide Barrel", id: "carbide_barrel", stat: "accuracy", value: 22, rarity: "rare", type: "gun" },
    { name: "Venom Barrel", id: "venom_barrel", stat: "damage", value: 12, rarity: "rare", type: "gun" },
    
    // GUNS - Stocks & Ammo (15 items)
    { name: "Tactical Stock", id: "stock_tactical", stat: "stability", value: 15, rarity: "common", type: "gun" },
    { name: "Sniper Stock", id: "stock_sniper", stat: "stability", value: 25, rarity: "rare", type: "gun" },
    { name: "Collapsible Stock", id: "stock_collapsible", stat: "weight", value: -3, rarity: "common", type: "gun" },
    { name: "SAS Stock", id: "stock_sas", stat: "recoil", value: -4, rarity: "uncommon", type: "gun" },
    { name: "Extended Mag", id: "mag_extended", stat: "ammo", value: 15, rarity: "uncommon", type: "gun" },
    { name: "Drum Mag", id: "mag_drum", stat: "ammo", value: 30, rarity: "rare", type: "gun" },
    { name: "Fast Mag", id: "mag_fast_reload", stat: "reloadTime", value: -0.5, rarity: "uncommon", type: "gun" },
    { name: "Quad Mag", id: "mag_quad", stat: "ammo", value: 50, rarity: "epic", type: "gun" },
    { name: "STANAG Mag", id: "stanag_mag", stat: "ammo", value: 12, rarity: "common", type: "gun" },
    { name: "Hollow Point Mag", id: "hollow_point", stat: "damage", value: 6, rarity: "uncommon", type: "gun" },
    { name: "Armor Piercing", id: "armor_piercing", stat: "pierceChance", value: 30, rarity: "rare", type: "gun" },
    { name: "Incendiary Round", id: "incendiary", stat: "burnEffect", value: 20, rarity: "rare", type: "gun" },
    { name: "Explosive Round", id: "explosive_round", stat: "explosionRadius", value: 60, rarity: "epic", type: "gun" },
    { name: "Tracer Round", id: "tracer_round", stat: "visibility", value: 40, rarity: "uncommon", type: "gun" },
    { name: "Cryo Round", id: "cryo_round", stat: "freezeEffect", value: 25, rarity: "rare", type: "gun" },
    
    // SWORDS - Blades & Edges (15 items)
    { name: "Monomolecular Edge", id: "mono_edge", stat: "bladeSharp", value: 30, rarity: "epic", type: "sword" },
    { name: "Serrated Edge", id: "serrated_edge", stat: "bleedsEffect", value: 20, rarity: "uncommon", type: "sword" },
    { name: "Curved Blade", id: "curved_blade", stat: "swingSpeed", value: 5, rarity: "uncommon", type: "sword" },
    { name: "Straight Blade", id: "straight_blade", stat: "damage", value: 8, rarity: "common", type: "sword" },
    { name: "Plasma Edge", id: "plasma_edge", stat: "damage", value: 20, rarity: "epic", type: "sword" },
    { name: "Frost Blade", id: "frost_blade", stat: "freezeChance", value: 35, rarity: "rare", type: "sword" },
    { name: "Inferno Blade", id: "inferno_blade", stat: "burnChance", value: 35, rarity: "rare", type: "sword" },
    { name: "Venom Blade", id: "venom_blade", stat: "poisonDps", value: 15, rarity: "rare", type: "sword" },
    { name: "Thunder Blade", id: "thunder_blade", stat: "shockChance", value: 40, rarity: "epic", type: "sword" },
    { name: "Shadow Blade", id: "shadow_blade", stat: "critChance", value: 25, rarity: "rare", type: "sword" },
    { name: "Diamond Edge", id: "diamond_edge", stat: "hardness", value: 50, rarity: "epic", type: "sword" },
    { name: "Obsidian Edge", id: "obsidian_edge", stat: "bladeSharp", value: 25, rarity: "rare", type: "sword" },
    { name: "Silk Blade", id: "silk_blade", stat: "swingSpeed", value: 8, rarity: "rare", type: "sword" },
    { name: "Titanium Reinforcement", id: "titanium_reinforce", stat: "durability", value: 60, rarity: "rare", type: "sword" },
    { name: "Chaotic Blade", id: "chaotic_blade", stat: "unpredictability", value: 45, rarity: "epic", type: "sword" },
    
    // SWORDS - Hilts & Handles (12 items)
    { name: "Leather Grip", id: "leather_grip", stat: "control", value: 10, rarity: "common", type: "sword" },
    { name: "Runed Hilt", id: "runed_hilt", stat: "enchantment", value: 20, rarity: "rare", type: "sword" },
    { name: "Blessed Grip", id: "blessed_grip", stat: "holiness", value: 15, rarity: "uncommon", type: "sword" },
    { name: "Soul Hilt", id: "soul_hilt", stat: "drain", value: 30, rarity: "epic", type: "sword" },
    { name: "Adaptive Grip", id: "adaptive_grip", stat: "control", value: 18, rarity: "rare", type: "sword" },
    { name: "Guardian Hilt", id: "guardian_hilt", stat: "blockPower", value: 40, rarity: "rare", type: "sword" },
    { name: "Void Grip", id: "void_grip", stat: "emptiness", value: 25, rarity: "rare", type: "sword" },
    { name: "Diamond Grip", id: "diamond_grip", stat: "luxury", value: 50, rarity: "epic", type: "sword" },
    { name: "Comfortable Grip", id: "comfortable_grip", stat: "control", value: 12, rarity: "uncommon", type: "sword" },
    { name: "Wraith Grip", id: "wraith_grip", stat: "ghostliness", value: 35, rarity: "epic", type: "sword" },
    { name: "Mystic Grip", id: "mystic_grip", stat: "magicPower", value: 28, rarity: "rare", type: "sword" },
    { name: "Iron Grip", id: "iron_grip", stat: "strength", value: 20, rarity: "uncommon", type: "sword" },
    
    // ABILITIES - Mods & Enhancers (18 items)
    { name: "Amplifier Core", id: "amplifier_core", stat: "damage", value: 25, rarity: "rare", type: "ability" },
    { name: "Haste Rune", id: "haste_rune", stat: "castTime", value: -0.3, rarity: "uncommon", type: "ability" },
    { name: "Extended Range Module", id: "extended_range", stat: "radius", value: 80, rarity: "rare", type: "ability" },
    { name: "Duration Matrix", id: "duration_matrix", stat: "duration", value: 5, rarity: "uncommon", type: "ability" },
    { name: "Crit Modifier", id: "crit_modifier", stat: "critChance", value: 35, rarity: "rare", type: "ability" },
    { name: "Chain Accelerator", id: "chain_accelerator", stat: "chainTargets", value: 5, rarity: "rare", type: "ability" },
    { name: "Cooldown Reducer", id: "cooldown_reducer", stat: "cooldown", value: -2, rarity: "uncommon", type: "ability" },
    { name: "Mana Conduit", id: "mana_conduit", stat: "efficiency", value: 30, rarity: "uncommon", type: "ability" },
    { name: "Overcharge Device", id: "overcharge", stat: "power", value: 50, rarity: "epic", type: "ability" },
    { name: "Resonance Crystal", id: "resonance_crystal", stat: "area", value: 120, rarity: "epic", type: "ability" },
    { name: "Entropy Surge", id: "entropy_surge", stat: "chaos", value: 40, rarity: "rare", type: "ability" },
    { name: "Void Tuner", id: "void_tuner", stat: "power", value: 35, rarity: "rare", type: "ability" },
    { name: "Ascension Gem", id: "ascension_gem", stat: "transcendence", value: 60, rarity: "epic", type: "ability" },
    { name: "Stellar Nexus", id: "stellar_nexus", stat: "cosmicPower", value: 70, rarity: "epic", type: "ability" },
    { name: "Quantum Fluctuator", id: "quantum_flux", stat: "unpredictability", value: 50, rarity: "epic", type: "ability" },
    { name: "Prism Splitter", id: "prism_splitter", stat: "splitDamage", value: 45, rarity: "rare", type: "ability" },
    { name: "Temporal Accelerant", id: "temporal_accel", stat: "speed", value: 55, rarity: "epic", type: "ability" },
    { name: "Cascade Module", id: "cascade_module", stat: "chainReaction", value: 65, rarity: "epic", type: "ability" },
    
    // THROWABLES - Enhancements (15 items)
    { name: "Fuse Reducer", id: "fuse_reducer", stat: "fuseTime", value: -0.5, rarity: "uncommon", type: "throwable" },
    { name: "Shrapnel Pack", id: "shrapnel_pack", stat: "explosionRadius", value: 100, rarity: "rare", type: "throwable" },
    { name: "Impact Detonator", id: "impact_detonator", stat: "triggerSpeed", value: -0.1, rarity: "uncommon", type: "throwable" },
    { name: "Sticky Adhesive", id: "sticky_adhesive", stat: "stickiness", value: 90, rarity: "uncommon", type: "throwable" },
    { name: "Bounce Enhancer", id: "bounce_enhancer", stat: "bounceCount", value: 8, rarity: "uncommon", type: "throwable" },
    { name: "Reinforced Casing", id: "reinforced_casing", stat: "durability", value: 50, rarity: "uncommon", type: "throwable" },
    { name: "Plasma Charge", id: "plasma_charge", stat: "damage", value: 30, rarity: "rare", type: "throwable" },
    { name: "Cryo Detonator", id: "cryo_detonator", stat: "freezeRadius", value: 80, rarity: "rare", type: "throwable" },
    { name: "Incendiary Charge", id: "incendiary_charge", stat: "burnRadius", value: 90, rarity: "rare", type: "throwable" },
    { name: "Toxin Disperser", id: "toxin_disperser", stat: "poisonCloud", value: 100, rarity: "rare", type: "throwable" },
    { name: "Volt Inducer", id: "volt_inducer", stat: "shockRadius", value: 70, rarity: "rare", type: "throwable" },
    { name: "Sonic Emitter", id: "sonic_emitter", stat: "sound", value: 150, rarity: "epic", type: "throwable" },
    { name: "Void Fragment", id: "void_fragment", stat: "annihilation", value: 200, rarity: "epic", type: "throwable" },
    { name: "Stellar Burst", id: "stellar_burst", stat: "brilliance", value: 180, rarity: "epic", type: "throwable" },
    { name: "Chaos Catalyst", id: "chaos_catalyst", stat: "chaos", value: 160, rarity: "epic", type: "throwable" }
  ];

  const getRandomAddon = () => {
    const rarityRoll = Math.random();
    let rarity = "common";
    if (rarityRoll > 0.8) rarity = "epic";
    else if (rarityRoll > 0.6) rarity = "rare";
    else if (rarityRoll > 0.4) rarity = "uncommon";
    
    const filtered = ADDON_TYPES.filter(a => a.rarity === rarity);
    return filtered[Math.floor(Math.random() * filtered.length)];
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
      lootboxes: [], addons: [], weapons: [],
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
      lootboxes: [...(base.lootboxes || []), ...(incoming.lootboxes || [])],
      addons: [...(base.addons || []), ...(incoming.addons || [])],
      weapons: [...(base.weapons || []), ...(incoming.weapons || [])],
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
    multiplayer: { socket: null, room: null, playerId: null, peers: {}, lastSentAt: 0, isHost: false, pvpEnabled: false, isPersistent: false },
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

  const getUsername = () => currentUser ? currentUser.username : (state.username || "Anonymous");

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
    #${ROOT}-weapon-canvas{position:absolute;left:0;top:0;z-index:2147483645;pointer-events:none;width:100%;height:100%}
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
  hud.innerHTML = `<button id="${ROOT}-toggle-hud" title="Toggle">«</button><h1>Page Climber</h1><p id="${ROOT}-username-display">Player: ${getUsername() || "not set"}</p><p id="${ROOT}-progress">Height: 0%</p><p id="${ROOT}-stats">Speed: 0 | Jump: 0</p><p id="${ROOT}-skin">Skin: ${state.currentSkin}</p><p id="${ROOT}-crate">Crates: ${state.stats.cratesOpened}</p><p id="${ROOT}-platform">Platform: none</p><p id="${ROOT}-mode">Mode: page</p><p id="${ROOT}-help">I inventory | J achievements | K skins | L levels | M multiplayer | F attack | S drop</p><div id="${ROOT}-controls"><button class="${ROOT}-button" id="${ROOT}-open-inventory">Inventory</button><button class="${ROOT}-button" id="${ROOT}-open-achievements">Achievements</button><button class="${ROOT}-button" id="${ROOT}-open-skins">Skins</button><button class="${ROOT}-button" id="${ROOT}-open-levels">Levels</button><button class="${ROOT}-button" id="${ROOT}-open-multi">Multiplayer</button><button class="${ROOT}-button" id="${ROOT}-open-profile">Account</button></div>`;

  const panel = document.createElement("div");
  panel.id = `${ROOT}-panel`;
  panel.innerHTML = `<div class="${ROOT}-tabs"><button class="${ROOT}-button" data-tab="inventory">Inventory</button><button class="${ROOT}-button" data-tab="achievements">Achievements</button><button class="${ROOT}-button" data-tab="skins">Skins</button><button class="${ROOT}-button" data-tab="levels">Levels</button><button class="${ROOT}-button" data-tab="multi">Multiplayer</button><button class="${ROOT}-button" data-tab="leaderboard">Leaderboard</button><button class="${ROOT}-button" data-tab="account">Account</button></div><div id="${ROOT}-panel-content"></div>`;

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

  // Weapon canvas for rendering weapons
  const weaponCanvas = document.createElement("canvas");
  weaponCanvas.id = `${ROOT}-weapon-canvas`;
  const weaponCtx = weaponCanvas.getContext("2d");

  document.body.append(hud, panel, toast, levelBg, levelGeo, remoteLayer, playerEl, finish, highlight, healthbarWrap, weaponHud, killfeed, respawnOverlay, weaponCanvas);

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
    const hpBar = game.multiplayer.pvpEnabled ? `...` : '';
    
    // Weapon indicator
    let weaponIcon = '';
    if (peer.weaponType && game.multiplayer.pvpEnabled) {
      const wc = peer.weaponColor || '#60a5fa';
      const icons = { gun: '🔫', sword: '⚔️', ability: '✨', throwable: '💣' };
      weaponIcon = `<div style="position:absolute;top:-28px;right:-4px;font-size:12px;
        background:rgba(15,23,42,.8);border-radius:4px;padding:1px 4px;
        border:1px solid ${wc}">${icons[peer.weaponType] || '?'}</div>`;
    }
    
    return `<div class="${ROOT}-remote-player" style="left:${peer.x}px;top:${peer.y}px;
      background:${peer.color || peerColor(peer.id)};
      transform:scaleX(${peer.facing || 1});
      opacity:${peer.dead ? 0.3 : 0.88}">
      ${hpBar}
      ${weaponIcon}
      <div class="${ROOT}-remote-label" style="transform:scaleX(${peer.facing || 1})">${peer.name || "Player"}${peer.dead ? ' 💀' : ''}</div>
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
        
        // Calculate barrel position based on weapon appearance
        let barrelOffsetX = 0;
        let barrelOffsetY = 8; // Account for gun being at hip level now
        if (w.type === 'gun' && w.appearance) {
          // For guns, fire from barrel tip
          const barrelLength = (w.appearance.barrelLength || 40);
          const bodyWidth = (w.appearance.bodyWidth || 20);
          barrelOffsetX = (bodyWidth / 2 + barrelLength) * game.player.facing;
          barrelOffsetY = 8;
        }
        
        const proj = {
          x: game.player.x + game.player.width / 2 + barrelOffsetX,
          y: game.player.y + game.player.height / 2 + barrelOffsetY,
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

  // ── Weapon Drawing Functions ───────────────────────────────────
  const drawGun = (ctx, a) => {
    const a_safe = a || {};
    const pc = a_safe.primaryColor || "#60a5fa";
    const sc = a_safe.secondaryColor || "#3b82f6";
    const ac = a_safe.accentColor || "#f59e0b";
    const bL = a_safe.barrelLength || 60;     // Increased from 40
    const bW = a_safe.barrelWidth || 10;      // Increased from 6
    const bdW = a_safe.bodyWidth || 30;       // Increased from 20
    const bdH = a_safe.bodyHeight || 18;      // Increased from 12
    const stL = a_safe.stockLength || 40;     // Increased from 30
    const stH = a_safe.stockHeight || 14;     // Increased from 10
    const grH = a_safe.gripHeight || 20;      // Increased from 15
    const grW = a_safe.gripWidth || 8;        // Increased from 6
    const magSz = a_safe.magazineSize || 16;  // Increased from 12
    const magA = a_safe.magazineAngle || 0;
    
    // Stock
    ctx.fillStyle = sc;
    ctx.fillRect(-stL - bdW / 2, -stH / 2 + 2, stL, stH);
    // Body
    ctx.fillStyle = pc;
    ctx.fillRect(-bdW / 2, -bdH / 2, bdW, bdH);
    // Grip
    ctx.fillStyle = sc;
    ctx.fillRect(-grW / 2 + 4, bdH / 2, grW, grH);
    // Magazine
    if (magSz > 4) {
      ctx.save();
      ctx.translate(4, bdH / 2);
      ctx.rotate((magA * Math.PI) / 180);
      ctx.fillStyle = ac;
      ctx.fillRect(-4, 0, 8, magSz * 1.2);
      ctx.restore();
    }
    // Barrel
    ctx.fillStyle = pc;
    ctx.fillRect(bdW / 2, -bW / 2, bL, bW);
    ctx.fillStyle = sc;
    ctx.fillRect(bdW / 2 + bL - 8, -bW / 2, 8, bW / 2);
    
    // Add outline for visibility
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(-stL - bdW / 2, -stH / 2 + 2, stL + bdW + bL, stH + bdH + grH);
  };

  const drawSword = (ctx, a) => {
    const a_safe = a || {};
    const pc = a_safe.primaryColor || "#cbd5e1";
    const sc = a_safe.secondaryColor || "#94a3b8";
    const ac = a_safe.accentColor || "#fbbf24";
    const bW = a_safe.bladeWidth || 8;       // Increased from 4
    const bC = a_safe.bladeCurve || 0;
    const gW = a_safe.guardWidth || 32;      // Increased from 20
    const gH = a_safe.guardHeight || 14;     // Increased from 10
    const hL = a_safe.handleLength || 45;    // Increased from 30
    const hW = a_safe.handleWidth || 6;      // Increased from 4
    const pSz = a_safe.pommelSize || 10;     // Increased from 6
    const bLen = (pvp.weapon?.stats?.bladeLength || 100); // Increased from 80
    
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    // Pommel
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.arc(0, hL / 2 + pSz / 2, pSz / 2, 0, Math.PI * 2);
    ctx.fill();
    // Handle
    for (let i = 0; i < hL; i += 6) {
      ctx.fillStyle = i % 12 === 0 ? sc : pc;
      ctx.fillRect(-hW / 2, i - hL / 2, hW, 6);
    }
    // Guard
    ctx.fillStyle = ac;
    ctx.fillRect(-gW / 2, -gH / 2, gW, gH);
    // Blade
    ctx.fillStyle = pc;
    ctx.beginPath();
    ctx.moveTo(-bW / 2, 0);
    ctx.quadraticCurveTo(-bW / 4 + bC, -bLen / 2, 0, -bLen);
    ctx.quadraticCurveTo(bW / 4 + bC, -bLen / 2, bW / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawAbility = (ctx, a) => {
    const a_safe = a || {};
    const pc = a_safe.primaryColor || "#8b5cf6";
    const sc = a_safe.secondaryColor || "#7c3aed";
    const ac = a_safe.accentColor || "#60a5fa";
    const shape = a_safe.abilityShape || "circle";
    const sz = (a_safe.abilitySize || 64) / 2;  // Doubled from 32
    
    ctx.strokeStyle = pc;
    ctx.lineWidth = 4;
    ctx.fillStyle = sc + '44';
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (shape === 'ring') {
      ctx.beginPath();
      ctx.arc(0, 0, sz, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, sz * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? sz : sz * 0.4;
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        i === 0 ? ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r) : ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.arc(0, 0, sz * 0.15, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawThrowable = (ctx, a) => {
    const a_safe = a || {};
    const pc = a_safe.primaryColor || "#ef4444";
    const sc = a_safe.secondaryColor || "#dc2626";
    const ac = a_safe.accentColor || "#fca5a5";
    const shape = a_safe.throwableShape || "sphere";
    const sz = a_safe.throwableSize || 28;  // Doubled from 14
    const s = sz / 2;
    
    if (shape === 'sphere' || !shape) {
      ctx.fillStyle = pc;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sc;
      ctx.beginPath();
      ctx.arc(-s * 0.25, -s * 0.25, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === 'cube') {
      ctx.fillStyle = pc;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.fillStyle = sc;
      ctx.fillRect(-s, -s, s, s);
    }
  };

  const drawWeapon = (ctx, wx, wy, facing) => {
    if (!pvp.weapon) return;
    const w = pvp.weapon;
    ctx.save();
    ctx.translate(wx, wy);
    // Don't scale by facing here since renderWeapon already handles it
    if (w.type === 'gun') drawGun(ctx, w.appearance);
    else if (w.type === 'sword') drawSword(ctx, w.appearance);
    else if (w.type === 'ability') drawAbility(ctx, w.appearance);
    else drawThrowable(ctx, w.appearance);
    ctx.restore();
  };

  const renderWeapon = () => {
    const docWidth = Math.max(window.innerWidth, document.documentElement.scrollWidth, document.body.scrollWidth);
    const docHeight = Math.max(window.innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight);
    
    weaponCanvas.width = docWidth;
    weaponCanvas.height = docHeight;
    weaponCtx.clearRect(0, 0, docWidth, docHeight);
    
    if (!pvp.weapon) return;
    
    const px = game.player.x + game.player.width / 2;
    const py = game.player.y + game.player.height / 2;
    const facing = game.player.facing > 0 ? 1 : -1;
    
    // Draw weapon at a larger, more visible scale
    weaponCtx.globalAlpha = 0.95;
    weaponCtx.save();
    weaponCtx.translate(px + (facing * 45), py + 8);
    weaponCtx.scale(facing, 1);  // flip if needed
    weaponCtx.scale(1, 1);   // enlarge weapon 2.5x
    drawWeapon(weaponCtx, 0, 0, 1);
    
    weaponCtx.restore();
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
      const lootboxes = state.lootboxes || [];
      const addons = state.addons || [];
      const weapons = state.weapons || [];
      
      let html = `<h2>Inventory</h2>`;
      
      // Weapons section
      html += `<div class="${ROOT}-entry"><strong>⚔ Weapons (${weapons.length})</strong>`;
      if (weapons.length) {
        html += weapons.map((wpn, i) => `<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center"><span class="${ROOT}-muted"><strong>${wpn.name}</strong><br><span style="font-size:10px">${wpn.type}</span></span><div style="display:flex;gap:4px"><button class="${ROOT}-button" data-load-weapon="${i}" style="padding:4px 8px;font-size:9px">LOAD</button><button class="${ROOT}-button" data-delete-weapon="${i}" style="padding:4px 8px;font-size:9px">DELETE</button></div></div>`).join("");
      } else {
        html += `<span class="${ROOT}-muted">No weapons. Build them in the weapon builder!</span>`;
      }
      html += `</div>`;
      
      // Lootboxes section
      html += `<div class="${ROOT}-entry"><strong>🎁 Lootboxes (${lootboxes.length})</strong>`;
      if (lootboxes.length) {
        html += lootboxes.map((lb, i) => `<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center"><span class="${ROOT}-muted">${lb.type.toUpperCase()}</span><button class="${ROOT}-button" data-open-lootbox="${lb.id}" style="padding:4px 8px;font-size:9px">OPEN</button></div>`).join("");
      } else {
        html += `<span class="${ROOT}-muted">No lootboxes. Collect crates!</span>`;
      }
      html += `</div>`;
      
      // Addons section
      html += `<div class="${ROOT}-entry"><strong>🔧 Weapon Addons (${addons.length})</strong>`;
      if (addons.length) {
        html += addons.map((addon, i) => `<div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;padding:6px;background:rgba(96,165,250,0.1);border-radius:6px"><span class="${ROOT}-muted"><strong>${addon.name}</strong><br><span style="font-size:10px">${addon.stat} +${addon.value}</span></span><button class="${ROOT}-button" data-delete-addon="${addon.id}" style="padding:4px 8px;font-size:9px">DELETE</button></div>`).join("");
      } else {
        html += `<span class="${ROOT}-muted">No addons yet. Open lootboxes!</span>`;
      }
      html += `</div>`;
      
      // Regular items section
      html += `<div class="${ROOT}-entry"><strong>Items (${items.length})</strong>`;
      if (items.length) {
        html += items.map(([id, count]) => {
          const item = ITEMS.find((e) => id.startsWith(e.id.split("-").slice(0, -1).join("-"))) || { name: id, rarity: "unknown" };
          return `<div class="${ROOT}-entry"><strong>${item.name}</strong><span class="${ROOT}-muted">Count ${count} | ${item.rarity}</span></div>`;
        }).join("");
      } else {
        html += `<span class="${ROOT}-muted">No items yet.</span>`;
      }
      html += `</div>`;
      
      html += `<button class="${ROOT}-button" data-close="1">Close</button>`;
      return html;
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
      const isPersistent = game.multiplayer.isPersistent;
      const pvpOn = game.multiplayer.pvpEnabled;
      const weaponName = pvp.weapon ? pvp.weapon.name : "None loaded";
      return (
        '<h2>Multiplayer</h2>' +
        (connected ?
          '<div class="' + ROOT + '-entry"><strong>Connected' + (pvpOn ? '<span class="' + ROOT + '-pvp-badge">PvP ON</span>' : '') + (isPersistent ? '<span class="' + ROOT + '-pvp-badge" style="background:#8b5cf6">PERSISTENT</span>' : '') + '</strong>' +
          '<span class="' + ROOT + '-muted">Room code: <strong style="color:#fff;font-size:18px;letter-spacing:4px">' + code + '</strong></span>' +
          '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
          (!isPersistent && isHost ? '<button class="' + ROOT + '-button" data-action="' + (pvpOn ? 'pvp-off' : 'pvp-on') + '">' + (pvpOn ? '⚔ Disable PvP' : '⚔ Enable PvP') + '</button>' : '') +
          '<button class="' + ROOT + '-button" data-action="mp-leave">Leave room</button>' +
          '</div></div>' +
          '<div class="' + ROOT + '-entry"><strong>Weapon</strong>' +
          '<span class="' + ROOT + '-muted">Equipped: ' + weaponName + '</span>' +
          '<div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="load-weapon">Load .wpn File</button></div></div>' +
          '<div class="' + ROOT + '-entry"><strong>PvP Stats</strong>' +
          '<span class="' + ROOT + '-muted">Kills: ' + pvp.kills + ' | Deaths: ' + pvp.deaths + '</span></div>' :
          '<div class="' + ROOT + '-entry"><strong>Multiplayer Rooms</strong>' +
          '<div style="margin-top:8px;display:flex;gap:8px">' +
          '<button class="' + ROOT + '-button" data-action="mp-create">Create Room</button>' +
          '<input id="' + ROOT + '-room-input" placeholder="XKQZ" maxlength="4" style="width:80px;padding:6px 10px;border-radius:999px;border:1px solid rgba(96,165,250,.5);background:rgba(30,41,59,.9);color:#fff;font:inherit;outline:none;text-transform:uppercase">' +
          '<button class="' + ROOT + '-button" data-action="mp-join">Join</button></div>' +
          '<span id="' + ROOT + '-mp-status" class="' + ROOT + '-muted" style="display:block;margin-top:6px"></span></div>' +
          '<div class="' + ROOT + '-entry"><strong>Persistent Servers</strong>' +
          '<div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="create-server">Create Server</button> <button class="' + ROOT + '-button" data-action="list-servers">Browse Servers</button></div></div>' +
          '<div id="' + ROOT + '-server-list" style="margin-top:10px"></div>'
        ) +
        '<button class="' + ROOT + '-button" data-close="1">Close</button>'
      );
    },
    account() {
      return (
        '<h2>Account</h2>' +
        (currentUser ?
          '<div class="' + ROOT + '-entry"><strong>Logged in as <span style="color:#60a5fa">' + currentUser.username + '</span></strong>' +
          '<span class="' + ROOT + '-muted">Status: ' + (currentUser.isAdmin ? 'Admin' : 'Player') + '</span>' +
          '<div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="logout">Logout</button>' +
          (currentUser.isAdmin ? ' <button class="' + ROOT + '-button" data-action="admin-panel">Admin Panel</button>' : '') +
          '</div></div>'
        :
          '<div class="' + ROOT + '-entry"><strong>Login or Register</strong>' +
          '<div style="margin-top:8px">' +
          '<input id="' + ROOT + '-username-input" placeholder="Username" maxlength="32" style="width:100%;padding:8px;border-radius:4px;border:1px solid rgba(96,165,250,.5);background:rgba(30,41,59,.9);color:#fff;font:inherit;outline:none;margin-bottom:6px">' +
          '<input id="' + ROOT + '-password-input" type="password" placeholder="Password" maxlength="64" style="width:100%;padding:8px;border-radius:4px;border:1px solid rgba(96,165,250,.5);background:rgba(30,41,59,.9);color:#fff;font:inherit;outline:none;margin-bottom:6px">' +
          '<button class="' + ROOT + '-button" data-action="login" style="width:100%">Login</button>' +
          '<button class="' + ROOT + '-button" data-action="register" style="width:100%;margin-top:6px">Create Account</button>' +
          '</div></div>'
        ) +
        '<button class="' + ROOT + '-button" data-close="1">Close</button>'
      );
    },
    admin() {
      return (
        '<h2>Admin Panel</h2>' +
        '<div class="' + ROOT + '-entry"><strong>Server Management</strong>' +
        '<div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="view-servers">View Servers</button> <button class="' + ROOT + '-button" data-action="view-users">View Users</button> <button class="' + ROOT + '-button" data-action="view-logs">View Logs</button></div></div>' +
        '<div class="' + ROOT + '-entry"><strong>Actions</strong>' +
        '<div style="margin-top:8px"><button class="' + ROOT + '-button" data-action="reset-lb">Reset Leaderboard</button></div></div>' +
        '<div id="' + ROOT + '-admin-content" style="margin-top:10px"></div>' +
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

    // Lootbox opening
    content.querySelectorAll("[data-open-lootbox]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        openLootbox(btn.dataset.openLootbox);
      });
    });

    // Addon deletion
    content.querySelectorAll("[data-delete-addon]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        const addonId = btn.dataset.deleteAddon;
        const idx = state.addons.findIndex(a => a.id === addonId);
        if (idx !== -1) {
          state.addons.splice(idx, 1);
          save();
          openPanel("inventory");
          say("Addon deleted");
        }
      });
    });

    // Weapon loading
    content.querySelectorAll("[data-load-weapon]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        const idx = parseInt(btn.dataset.loadWeapon);
        const wpn = state.weapons?.[idx];
        if (wpn) {
          pvp.weapon = wpn;
          updateWeaponUI();
          say("Weapon loaded: " + wpn.name);
          panel.classList.remove(ROOT + "-open");
        }
      });
    });

    // Weapon deletion
    content.querySelectorAll("[data-delete-weapon]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        const idx = parseInt(btn.dataset.deleteWeapon);
        if (state.weapons && idx >= 0 && idx < state.weapons.length) {
          const wpn = state.weapons[idx];
          state.weapons.splice(idx, 1);
          if (pvp.weapon === wpn) pvp.weapon = null;
          save();
          openPanel("inventory");
          say("Weapon deleted: " + wpn.name);
        }
      });
    });

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

    content.querySelectorAll("[data-action='mp-create']").forEach(function(btn) { btn.addEventListener("click", function() { 
      if (!authToken || !currentUser) { say("You must be logged in to use multiplayer!"); return; }
      connectMultiplayer("create"); 
    }); });
    content.querySelectorAll("[data-action='mp-join']").forEach(function(btn) {
      btn.addEventListener("click", function() {
        if (!authToken || !currentUser) { say("You must be logged in to use multiplayer!"); return; }
        var input = content.querySelector("#" + ROOT + "-room-input");
        var code = input ? input.value.toUpperCase().trim() : "";
        var statusEl = content.querySelector("#" + ROOT + "-mp-status");
        if (code.length !== 4) { if (statusEl) statusEl.textContent = "Enter a 4-letter code."; return; }
        connectMultiplayer("join", code);
      });
    });

    // Persistent servers
    content.querySelectorAll("[data-action='create-server']").forEach(function(btn) {
      btn.addEventListener("click", function() {
        if (!authToken || !currentUser) { say("You must be logged in to create servers!"); return; }
        if (!game.customLevel) {
          say("Load a level first to create a persistent server!");
          return;
        }
        var serverName = prompt("Enter server name:", "My Server");
        if (!serverName) return;
        var maxPlayers = prompt("Max players (1-32):", "10");
        maxPlayers = Math.min(32, Math.max(1, parseInt(maxPlayers) || 10));
        
        btn.textContent = "Creating..."; btn.disabled = true;
        fetch(API_URL + "/persistent-servers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: serverName,
            creatorName: getUsername(),
            levelData: game.customLevel,
            maxPlayers: maxPlayers
          })
        }).then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.ok) {
              say("Server created! Code: " + data.roomCode);
              connectMultiplayer("join", data.roomCode);
            } else {
              say("Failed to create server: " + (data.error || "Unknown error"));
              btn.textContent = "Create Server"; btn.disabled = false;
            }
          })
          .catch(function(e) { say("Could not reach server."); btn.textContent = "Create Server"; btn.disabled = false; });
      });
    });

    content.querySelectorAll("[data-action='list-servers']").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var listEl = content.querySelector("#" + ROOT + "-server-list");
        if (!listEl) return;
        listEl.textContent = "Loading servers...";
        fetch(API_URL + "/persistent-servers?limit=15")
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (!data.servers || !data.servers.length) { listEl.textContent = "No servers available."; return; }
            listEl.innerHTML = data.servers.map(function(s) {
              return '<div class="' + ROOT + '-entry" style="margin-bottom:6px"><strong>' + s.name + '</strong>' +
                '<span class="' + ROOT + '-muted">by ' + s.creatorName + ' \u00b7 Players: ' + s.playerCount + '/' + s.maxPlayers + '</span>' +
                '<div style="margin-top:6px"><button class="' + ROOT + '-button" data-join-server="' + s.id + '">Join Server</button></div></div>';
            }).join("");
            listEl.querySelectorAll("[data-join-server]").forEach(function(jbtn) {
              jbtn.addEventListener("click", function() {
                if (!authToken || !currentUser) { say("You must be logged in to join servers!"); return; }
                jbtn.textContent = "Connecting..."; jbtn.disabled = true;
                fetch(API_URL + "/persistent-servers/" + jbtn.dataset.joinServer)
                  .then(function(r) { return r.json(); })
                  .then(function(server) {
                    if (!server.roomCode) { say("Server info incomplete."); jbtn.disabled = false; jbtn.textContent = "Join"; return; }
                    say("Joining server: " + server.name);
                    connectMultiplayer("join", server.roomCode);
                  })
                  .catch(function() { say("Failed to join server."); jbtn.disabled = false; jbtn.textContent = "Join"; });
              });
            });
          })
          .catch(function() { listEl.textContent = "Server unreachable."; });
      });
    });
    content.querySelectorAll("[data-action='mp-leave']").forEach(function(btn) { btn.addEventListener("click", function() { disconnectMultiplayer(); openPanel("multi"); }); });

    // Auth listeners
    content.querySelectorAll("[data-action='login']").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        const username = content.querySelector("#" + ROOT + "-username-input")?.value || "";
        const password = content.querySelector("#" + ROOT + "-password-input")?.value || "";
        if (!username || !password) { say("Enter username and password"); return; }
        const result = await login(username, password);
        if (result.error) { say("Login failed: " + result.error); } else { openPanel("account"); }
      });
    });

    content.querySelectorAll("[data-action='register']").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        const username = content.querySelector("#" + ROOT + "-username-input")?.value || "";
        const password = content.querySelector("#" + ROOT + "-password-input")?.value || "";
        if (!username || !password) { say("Enter username and password"); return; }
        const result = await register(username, password);
        if (result.error) { say("Registration failed: " + result.error); } else { openPanel("account"); }
      });
    });

    content.querySelectorAll("[data-action='logout']").forEach(function(btn) {
      btn.addEventListener("click", function() { logout(); openPanel("account"); });
    });

    content.querySelectorAll("[data-action='admin-panel']").forEach(function(btn) {
      btn.addEventListener("click", function() { openPanel("admin"); });
    });

    // Admin panel listeners
    content.querySelectorAll("[data-action='view-servers']").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        const adminContent = content.querySelector("#" + ROOT + "-admin-content");
        adminContent.textContent = "Loading servers...";
        try {
          const res = await fetch(API_URL + "/admin/servers", { headers: { "Authorization": "Bearer " + authToken } });
          const data = await res.json();
          if (!res.ok) { adminContent.textContent = "Error: " + data.error; return; }
          adminContent.innerHTML = data.servers.map(function(s) {
            return '<div class="' + ROOT + '-entry" style="margin-bottom:8px"><strong>' + s.name + '</strong>' +
              '<span class="' + ROOT + '-muted">by ' + s.creatorName + ' | Players: ' + s.playerCount + '/' + s.maxPlayers + '</span>' +
              '<div style="margin-top:6px"><button class="' + ROOT + '-button" data-delete-server="' + s.id + '" style="background:#ef4444">Delete Server</button></div></div>';
          }).join("");
          adminContent.querySelectorAll("[data-delete-server]").forEach(function(dbtn) {
            dbtn.addEventListener("click", async function() {
              if (!confirm("Delete server?")) return;
              dbtn.disabled = true;
              const dres = await fetch(API_URL + "/admin/servers/" + dbtn.dataset.deleteServer, { method: "DELETE", headers: { "Authorization": "Bearer " + authToken } });
              if (dres.ok) { say("Server deleted"); content.querySelector("[data-action='view-servers']").click(); } else { say("Delete failed"); }
              dbtn.disabled = false;
            });
          });
        } catch { adminContent.textContent = "Network error"; }
      });
    });

    content.querySelectorAll("[data-action='view-users']").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        const adminContent = content.querySelector("#" + ROOT + "-admin-content");
        adminContent.textContent = "Loading users...";
        try {
          const res = await fetch(API_URL + "/admin/users", { headers: { "Authorization": "Bearer " + authToken } });
          const data = await res.json();
          if (!res.ok) { adminContent.textContent = "Error: " + data.error; return; }
          adminContent.innerHTML = data.users.map(function(u) {
            return '<div class="' + ROOT + '-entry" style="margin-bottom:8px"><strong>' + u.username + '</strong>' +
              '<span class="' + ROOT + '-muted"> | ' + (u.isAdmin ? 'Admin' : 'Player') + (u.isBanned ? ' | BANNED' : '') + (u.bannedDevice ? ' | DEVICE BANNED' : '') + '</span>' +
              '<div style="margin-top:6px">' +
              (u.isBanned ? '<button class="' + ROOT + '-button" data-unban-user="' + u.id + '" style="background:#84cc16">Unban</button>' : '<button class="' + ROOT + '-button" data-ban-user="' + u.id + '" style="background:#ef4444">Ban</button>') +
              '</div></div>';
          }).join("");
          adminContent.querySelectorAll("[data-ban-user]").forEach(function(bbtn) {
            bbtn.addEventListener("click", async function() {
              const banDevice = confirm("Also ban their device? (prevents logins from this device)");
              bbtn.disabled = true;
              const bres = await fetch(API_URL + "/admin/ban/" + bbtn.dataset.banUser, { 
                method: "POST", 
                headers: { "Authorization": "Bearer " + authToken, "Content-Type": "application/json" },
                body: JSON.stringify({ banDevice })
              });
              if (bres.ok) { 
                let msg = "User banned";
                if (banDevice) msg += " (device banned)";
                say(msg);
                content.querySelector("[data-action='view-users']").click();
              } else { say("Ban failed"); }
              bbtn.disabled = false;
            });
          });
          adminContent.querySelectorAll("[data-unban-user]").forEach(function(ubtn) {
            ubtn.addEventListener("click", async function() {
              if (!confirm("Unban user?")) return;
              ubtn.disabled = true;
              const ures = await fetch(API_URL + "/admin/unban/" + ubtn.dataset.unbanUser, { method: "POST", headers: { "Authorization": "Bearer " + authToken } });
              if (ures.ok) { say("User unbanned"); content.querySelector("[data-action='view-users']").click(); } else { say("Unban failed"); }
              ubtn.disabled = false;
            });
          });
        } catch { adminContent.textContent = "Network error"; }
      });
    });

    content.querySelectorAll("[data-action='view-logs']").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        const adminContent = content.querySelector("#" + ROOT + "-admin-content");
        adminContent.textContent = "Loading logs...";
        try {
          const res = await fetch(API_URL + "/admin/logs", { headers: { "Authorization": "Bearer " + authToken } });
          const data = await res.json();
          if (!res.ok) { adminContent.textContent = "Error: " + data.error; return; }
          adminContent.innerHTML = '<div style="font-size:12px;color:#a0aec0;max-height:400px;overflow-y:auto">' + data.logs.slice(-50).reverse().map(function(log) {
            return '<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.1)">' + new Date(log.timestamp).toLocaleTimeString() + ' - ' + log.action + '</div>';
          }).join("") + '</div>';
        } catch { adminContent.textContent = "Network error"; }
      });
    });

    content.querySelectorAll("[data-action='reset-lb']").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        if (!confirm("Reset leaderboard? This cannot be undone!")) return;
        btn.disabled = true;
        const res = await fetch(API_URL + "/admin/reset-leaderboard", { method: "POST", headers: { "Authorization": "Bearer " + authToken } });
        if (res.ok) { say("Leaderboard reset"); } else { say("Reset failed"); }
        btn.disabled = false;
      });
    });

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
    const count = Math.min(12, Math.max(4, Math.floor(candidates.length / 15)));
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
      game.multiplayer.isPersistent = message.isPersistent || false;
      say("Connected! Room code: " + message.room + (message.isPersistent ? " [PERSISTENT SERVER]" : ""));
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
    // Replace the socket.send(...) call inside sendMultiplayerState
socket.send(JSON.stringify({
  type: "player-state",
  x: Math.round(game.player.x), y: Math.round(game.player.y),
  name: getUsername(), color: SKINS[state.currentSkin]?.[1] || "#4ade80",
  hp: pvp.hp, dead: pvp.dead,
  weaponType: pvp.weapon?.type || null,
  weaponColor: pvp.weapon?.appearance?.primaryColor || null,
  facing: game.player.facing
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
    
    // Add lootbox to inventory instead of opening immediately
    const lootbox = {
      id: Math.random().toString(36).slice(2),
      type: Math.random() > 0.85 ? "epic" : Math.random() > 0.6 ? "rare" : "standard",
      collectedAt: Date.now()
    };
    state.lootboxes.push(lootbox);
    say(`Lootbox collected! (${lootbox.type})`); 
    save();
    if (panel.classList.contains(`${ROOT}-open`)) openPanel(state.panelTab);
  };

  const openLootbox = (lootboxId) => {
    const idx = state.lootboxes.findIndex(lb => lb.id === lootboxId);
    if (idx === -1) return;
    
    const lootbox = state.lootboxes[idx];
    const rewardCount = lootbox.type === "standard" ? 1 : lootbox.type === "rare" ? 2 : 3;
    
    // Generate final rewards with weighted rarity
    const finalRewards = [];
    for (let i = 0; i < rewardCount; i++) {
      finalRewards.push(getRandomAddon());
    }
    
    // Show CS-GO style opening animation
    showLootboxOpening(lootboxId, finalRewards, () => {
      // Remove lootbox and add rewards
      state.lootboxes.splice(idx, 1);
      
      const rewardNames = [];
      for (const addon of finalRewards) {
        state.addons.push({
          id: Math.random().toString(36).slice(2),
          ...addon,
          unlockedAt: Date.now()
        });
        rewardNames.push(`${addon.name} (${addon.rarity})`);
      }
      
      say(`Lootbox opened! Got: ${rewardNames.join(", ")}`);
      save();
      if (panel.classList.contains(`${ROOT}-open`)) openPanel("inventory");
    });
  };

  const showLootboxOpening = (lootboxId, finalRewards, onComplete) => {
    // Close current panel
    panel.classList.remove(`${ROOT}-open`);
    
    // Create modal overlay
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 9999; background: rgba(0, 0, 0, 0.95);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: ui-monospace, monospace; color: #f8fafc;
    `;
    
    // Title
    const title = document.createElement("div");
    title.style.cssText = `
      font-size: 24px; font-weight: bold; margin-bottom: 40px;
      color: #fbbf24; text-shadow: 0 0 20px #fbbf24;
      animation: pulse-glow 0.6s ease-out forwards;
    `;
    title.textContent = "Opening Lootbox...";
    modal.appendChild(title);
    
    // Generate many addon options for scrolling (includes final rewards)
    const rarityColors = {
      "common": "#94a3b8",
      "uncommon": "#4ade80",
      "rare": "#60a5fa",
      "epic": "#f59e0b"
    };
    
    // Create scrollable items - lots of random addons + final rewards
    const scrollItems = [];
    for (let i = 0; i < 25; i++) {
      scrollItems.push(getRandomAddon());
    }
    // Insert final rewards at the end
    for (const reward of finalRewards) {
      scrollItems.push(reward);
    }
    
    // Container for the scrolling animation
    const wheelContainer = document.createElement("div");
    wheelContainer.style.cssText = `
      position: relative; width: 500px; height: 150px;
      background: linear-gradient(90deg, rgba(15, 23, 42, 0.5), rgba(30, 58, 95, 0.8), rgba(15, 23, 42, 0.5));
      border: 3px solid #60a5fa;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 0 50px #60a5fa, inset 0 0 30px rgba(96, 165, 250, 0.2);
      display: flex;
      align-items: center;
    `;
    
    // Scrolling track
    const track = document.createElement("div");
    track.style.cssText = `
      display: flex; gap: 12px; padding: 12px;
      animation: scroll-items 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    `;
    
    // Create item elements
    scrollItems.forEach((addon, idx) => {
      const item = document.createElement("div");
      const isReward = idx >= scrollItems.length - finalRewards.length;
      const color = rarityColors[addon.rarity] || "#94a3b8";
      
      item.style.cssText = `
        flex-shrink: 0;
        width: 140px;
        height: 120px;
        padding: 12px;
        background: rgba(15, 23, 42, 0.9);
        border: 2px solid ${isReward ? color : "#475569"};
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-shadow: ${isReward ? `0 0 20px ${color}, inset 0 0 10px ${color}` : "none"};
        transition: all 0.3s;
      `;
      
      // Addon name
      const name = document.createElement("div");
      name.style.cssText = `
        font-weight: bold;
        font-size: 11px;
        color: ${isReward ? color : "#cbd5e1"};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      name.textContent = addon.name;
      item.appendChild(name);
      
      // Rarity badge
      const rarity = document.createElement("div");
      rarity.style.cssText = `
        font-size: 9px;
        color: ${color};
        font-weight: bold;
        padding: 2px 6px;
        background: rgba(${color === "#94a3b8" ? "148,163,184" : color === "#4ade80" ? "74,222,128" : color === "#60a5fa" ? "96,165,250" : "245,158,11"},0.2);
        border-radius: 3px;
        text-transform: uppercase;
      `;
      rarity.textContent = addon.rarity;
      item.appendChild(rarity);
      
      // Stat info
      const stat = document.createElement("div");
      stat.style.cssText = `
        font-size: 8px;
        color: #94a3b8;
        margin-top: 4px;
      `;
      stat.textContent = `${addon.stat}: ${addon.value > 0 ? "+" : ""}${addon.value}`;
      item.appendChild(stat);
      
      track.appendChild(item);
    });
    
    wheelContainer.appendChild(track);
    
    // Glow effect in center
    const centerGlow = document.createElement("div");
    centerGlow.style.cssText = `
      position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      width: 200px; height: 140px;
      border: 2px solid #fbbf24;
      border-radius: 8px;
      pointer-events: none;
      box-shadow: inset 0 0 40px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.5);
    `;
    wheelContainer.appendChild(centerGlow);
    
    modal.appendChild(wheelContainer);
    
    // Add CSS animations
    if (!document.getElementById(`${ROOT}-csgo-lootbox-style`)) {
      const style = document.createElement("style");
      style.id = `${ROOT}-csgo-lootbox-style`;
      style.textContent = `
        @keyframes scroll-items {
          0% {
            transform: translateX(0);
          }
          95% {
            transform: translateX(calc(-${scrollItems.length - 2} * 152px));
          }
          100% {
            transform: translateX(calc(-${scrollItems.length - 2} * 152px));
          }
        }
        @keyframes pulse-glow {
          0% { opacity: 0; text-shadow: 0 0 0 #fbbf24; }
          100% { opacity: 1; text-shadow: 0 0 20px #fbbf24; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Add result text
    const resultText = document.createElement("div");
    resultText.style.cssText = `
      margin-top: 40px;
      font-size: 14px;
      color: #cbd5e1;
      opacity: 0;
      animation: fade-in-result 0.5s ease-out 3.8s forwards;
      text-align: center;
    `;
    
    const rewardDescriptions = finalRewards.map(r => `<span style="color: ${rarityColors[r.rarity]}">${r.name}</span>`).join(", ");
    resultText.innerHTML = `Got: ${rewardDescriptions}`;
    modal.appendChild(resultText);
    
    // Add fade-in animation for result
    if (!document.getElementById(`${ROOT}-result-style`)) {
      const style = document.createElement("style");
      style.id = `${ROOT}-result-style`;
      style.textContent = `
        @keyframes fade-in-result {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(modal);
    
    // Close modal and complete after animation
    setTimeout(() => {
      modal.remove();
      onComplete();
    }, 4500);
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
    renderWeapon();
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
    // Don't trigger game actions while typing in input fields
    const activeElement = document.activeElement;
    if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") return;
    
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
  hud.querySelector(`#${ROOT}-open-profile`).addEventListener("click", () => openPanel("account"));
  panel.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => openPanel(btn.dataset.tab)));

  // Verify auth on load
  verifyAuth().then(user => {
  if (user) {
    // Sync the local state username with the logged-in account
    state.username = user.username;
    save();
    say("Welcome back, " + user.username + "!");
    const usernameDisplay = hud.querySelector("#" + ROOT + "-username-display");
    if (usernameDisplay) usernameDisplay.textContent = "Player: " + user.username;
    // Submit leaderboard with current completions under their account
    submitLeaderboard(user.username, state.stats.levelCompletions);
  } else {
    // Token was invalid/expired — clear it silently
    localStorage.removeItem(AUTH_KEY);
  }
});

  // Periodic ban check - verify user isn't banned every 10 seconds
  setInterval(async () => {
    if (!authToken || !currentUser) return;
    try {
      const res = await fetch(API_URL + "/verify", {
        method: "POST",
        headers: { "Authorization": "Bearer " + authToken }
      });
      if (res.status === 403) {
        // User was banned!
        say("You have been banned from the server.");
        // Close websocket if connected
        if (window.PageClimber?.ws) {
          try { window.PageClimber.ws.close(); } catch {}
        }
        logout();
        setTimeout(() => location.reload(), 2000);
      } else if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
      }
    } catch {}
  }, 10000);

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

  const saveWeapon = (wpn) => {
    if (!wpn || !wpn.name) return false;
    if (!state.weapons) state.weapons = [];
    const idx = state.weapons.findIndex(w => w.name === wpn.name);
    if (idx !== -1) {
      state.weapons[idx] = wpn;
      say(`Weapon updated: ${wpn.name}`);
    } else {
      state.weapons.push(wpn);
      say(`Weapon saved: ${wpn.name}`);
    }
    save();
    return true;
  };

  const getWeapons = () => state.weapons || [];

  window.PageClimber = {
    exportSave, importSave, loadLevel, clearLevel, pickLevelFile,
    connectMultiplayer, disconnectMultiplayer,
    listAchievements: () => Object.values(state.achievements),
    listSkins: () => Object.entries(SKINS).map(([id, skin]) => ({ id, label: skin[0], unlocked: state.unlockedSkins.includes(id) })),
    setSkin, openPanel,
    closePanel: () => panel.classList.remove(`${ROOT}-open`),
    loadWeapon: (wpn) => { pvp.weapon = wpn; updateWeaponUI(); say("Weapon loaded: " + wpn.name); },
    saveWeapon, getWeapons,
    secret, resetSave, save: state, destroy
  };
})();