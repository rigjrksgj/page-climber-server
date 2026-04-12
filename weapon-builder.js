(() => {
  if (window.__WB?.destroy) window.__WB.destroy();
  const ROOT = "wb";

  const state = {
    type: "gun", name: "My Weapon", tab: "stats",
    animTab: "idle", selectedFrame: 0, animPlaying: false,
    paintColor: "#ff4040", paintSize: 4, paintMode: "draw",
    pixels: {}, textureLayer: true,
    lore: { description: "", flavorText: "", rarity: "common", faction: "", origin: "", unlockCondition: "" },
    stats: {
      damage: 25, range: 300, speed: 400, knockback: 8, weight: 5,
      critChance: 10, critMulti: 2.0, lifesteal: 0, pierce: 0,
      fireRate: 5, ammo: 30, reloadTime: 2.0, spread: 3, recoil: 5,
      bulletSize: 4, bulletCount: 1, burstCount: 1, burstDelay: 0.1,
      projectileGravity: 0, bounces: 0, explosionRadius: 0,
      swingArc: 120, swingSpeed: 8, comboLength: 3, blockPower: 50,
      bladeLength: 80, guardSize: 15, slashTrail: 1,
      cooldown: 5, duration: 3, radius: 100, charges: 1,
      castTime: 0.3, manaCost: 30, aoeDelay: 0.5,
      fuseTime: 2.0, throwForce: 600, bounceCount: 2, stickToWalls: 0,
      throwableRadius: 60, spinRate: 5
    },
    appearance: {
      primaryColor: "#60a5fa", secondaryColor: "#1e3a5f",
      accentColor: "#f59e0b", emissiveColor: "#60a5fa",
      emissiveIntensity: 0, metalness: 70, roughness: 30,
      glowEnabled: false, trailEnabled: false, trailColor: "#60a5fa",
      particleEffect: "none", particleColor: "#ffffff",
      outlineEnabled: true, outlineColor: "#ffffff", outlineWidth: 1,
      barrelLength: 60, barrelWidth: 6, bodyWidth: 20, bodyHeight: 14,
      stockLength: 30, stockHeight: 10, gripHeight: 22, gripWidth: 8,
      scopeEnabled: false, silencerEnabled: false, flashlightEnabled: false,
      magazineSize: 12, magazineAngle: 10,
      bladeWidth: 10, bladeCurve: 0, tipStyle: "point",
      guardWidth: 30, guardHeight: 8, handleLength: 40, handleWidth: 7,
      pommelSize: 10, pommelStyle: "round",
      abilityShape: "circle", abilitySize: 60,
      throwableShape: "sphere", throwableSize: 14
    },
    effects: {
      onHit: "none", onKill: "none", onCrit: "none",
      statusEffect: "none", statusDuration: 3, statusStrength: 1,
      elementType: "none", elementDamage: 0,
      chainLightning: false, chainTargets: 3,
      poisonDps: 0, burnDps: 0, freezeDuration: 0, shockChance: 0,
      lifeOnKill: 0, ammoOnKill: 0, explosiveOnKill: false,
      screenShake: 5, hitStop: 0.05,
      muzzleFlash: true, ejectedCasings: true, bloodEffect: true, impactDecal: true
    },
    animations: {
      idle: { frames: [
        { x:0,y:0,rot:0,scaleX:1,scaleY:1,duration:500 },
        { x:0,y:1,rot:0.5,scaleX:1,scaleY:1,duration:500 }
      ]},
      attack: { frames: [
        { x:0,y:0,rot:0,scaleX:1,scaleY:1,duration:50 },
        { x:-8,y:-4,rot:-15,scaleX:1.05,scaleY:0.95,duration:80 },
        { x:4,y:2,rot:8,scaleX:0.98,scaleY:1.02,duration:120 },
        { x:0,y:0,rot:0,scaleX:1,scaleY:1,duration:150 }
      ]},
      reload: { frames: [
        { x:0,y:0,rot:0,scaleX:1,scaleY:1,duration:100 },
        { x:0,y:6,rot:20,scaleX:1,scaleY:1,duration:300 },
        { x:0,y:6,rot:20,scaleX:1,scaleY:1,duration:600 },
        { x:0,y:0,rot:0,scaleX:1,scaleY:1,duration:200 }
      ]},
      hit: { frames: [
        { x:3,y:-2,rot:5,scaleX:1.1,scaleY:0.9,duration:60 },
        { x:-2,y:1,rot:-3,scaleX:0.95,scaleY:1.05,duration:80 },
        { x:0,y:0,rot:0,scaleX:1,scaleY:1,duration:100 }
      ]},
      death: { frames: [
        { x:0,y:0,rot:0,scaleX:1,scaleY:1,duration:100 },
        { x:10,y:20,rot:90,scaleX:0.8,scaleY:0.8,duration:300 },
        { x:20,y:60,rot:180,scaleX:0.5,scaleY:0.5,duration:400 }
      ]}
    }
  };

  // Style
  const styleEl = document.createElement("style");
  styleEl.id = `${ROOT}-style`;
  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');
    #${ROOT}-overlay{position:fixed;inset:0;z-index:2147483647;background:#070b14;display:flex;flex-direction:column;font-family:'Share Tech Mono',monospace;color:#c9d8f0;overflow:hidden}
    #${ROOT}-overlay *{box-sizing:border-box}
    .${ROOT}-topbar{display:flex;align-items:center;gap:14px;padding:9px 18px;background:#0a1020;border-bottom:1px solid #1a2a4a;flex-shrink:0;flex-wrap:wrap}
    .${ROOT}-title{font-family:'Orbitron',monospace;font-size:15px;font-weight:900;color:#60a5fa;letter-spacing:3px}
    .${ROOT}-nameinput{background:transparent;border:none;border-bottom:1px solid #2a4a7a;color:#e2f0ff;font-family:'Orbitron',monospace;font-size:14px;width:200px;padding:2px 4px;outline:none}
    .${ROOT}-nameinput:focus{border-bottom-color:#60a5fa}
    .${ROOT}-typetabs{display:flex;gap:4px}
    .${ROOT}-typebtn{padding:5px 12px;border:1px solid #1a3060;background:#0d1830;color:#7a9abf;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:4px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;transition:all .15s}
    .${ROOT}-typebtn.active{background:#1a3a7a;border-color:#60a5fa;color:#e2f0ff}
    .${ROOT}-btn{padding:5px 12px;border:1px solid #1a4a7a;background:#0d2040;color:#7ac0ff;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:4px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;transition:all .15s}
    .${ROOT}-btn:hover{background:#1a3a6a;color:#e2f0ff;border-color:#60a5fa}
    .${ROOT}-btn:disabled{opacity:.4;cursor:not-allowed}
    .${ROOT}-btn.danger{border-color:#7a1a1a;background:#1a0808;color:#ff7a7a}
    .${ROOT}-btn.danger:hover{background:#2a1010;border-color:#ff4040}
    .${ROOT}-btn.success{border-color:#1a6a3a;background:#081a10;color:#7aff9a}
    .${ROOT}-btn.success:hover{background:#0f2818;border-color:#40ff70}
    .${ROOT}-main{display:flex;flex:1;overflow:hidden;min-height:0}
    .${ROOT}-sidebar{width:185px;background:#080e1c;border-right:1px solid #1a2a4a;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
    .${ROOT}-sidetab{padding:11px 14px;border-bottom:1px solid #0f1a2e;color:#5a7a9f;cursor:pointer;font-size:10px;letter-spacing:2px;text-transform:uppercase;transition:all .15s;display:flex;align-items:center;gap:8px}
    .${ROOT}-sidetab:hover{background:#0f1a30;color:#90b8e0}
    .${ROOT}-sidetab.active{background:#0f1e3a;color:#60a5fa;border-left:2px solid #60a5fa}
    .${ROOT}-content{flex:1;overflow-y:auto;padding:18px;min-width:0}
    .${ROOT}-content::-webkit-scrollbar{width:5px}
    .${ROOT}-content::-webkit-scrollbar-track{background:#080e1c}
    .${ROOT}-content::-webkit-scrollbar-thumb{background:#1a3060;border-radius:3px}
    .${ROOT}-preview-panel{width:300px;background:#080e1c;border-left:1px solid #1a2a4a;display:flex;flex-direction:column;flex-shrink:0}
    .${ROOT}-preview-title{padding:10px 14px;font-family:'Orbitron',monospace;font-size:10px;color:#4a7aaf;letter-spacing:2px;border-bottom:1px solid #1a2a4a;flex-shrink:0}
    .${ROOT}-preview-canvas{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:repeating-linear-gradient(0deg,transparent,transparent 19px,#0f1a2e 19px,#0f1a2e 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,#0f1a2e 19px,#0f1a2e 20px);position:relative}
    .${ROOT}-preview-controls{padding:10px;border-top:1px solid #1a2a4a;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0}
    .${ROOT}-section{margin-bottom:22px}
    .${ROOT}-section-title{font-family:'Orbitron',monospace;font-size:9px;color:#3a6a9f;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #1a2a4a}
    .${ROOT}-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
    .${ROOT}-label{font-size:10px;color:#6a8aaf;width:130px;flex-shrink:0}
    .${ROOT}-val{font-size:10px;color:#90b8e0;width:36px;text-align:right;flex-shrink:0}
    .${ROOT}-slider{flex:1;-webkit-appearance:none;height:3px;background:#1a2a4a;border-radius:2px;outline:none;cursor:pointer}
    .${ROOT}-slider::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;background:#60a5fa;cursor:pointer;border:1px solid #90c8ff}
    .${ROOT}-select{background:#0a1828;border:1px solid #1a3060;color:#90b8e0;font-family:'Share Tech Mono',monospace;font-size:10px;padding:3px 6px;border-radius:4px;outline:none;flex:1}
    .${ROOT}-select:focus{border-color:#60a5fa}
    .${ROOT}-colorrow{display:flex;align-items:center;gap:8px;margin-bottom:7px}
    .${ROOT}-colorpick{width:28px;height:22px;border:1px solid #2a4a7a;border-radius:3px;cursor:pointer;padding:0;background:none;flex-shrink:0}
    .${ROOT}-colorval{font-size:10px;color:#5a7a9f}
    .${ROOT}-toggle{display:flex;align-items:center;gap:8px;margin-bottom:7px;cursor:pointer;user-select:none}
    .${ROOT}-toggle-box{width:26px;height:14px;border-radius:7px;border:1px solid #1a3060;background:#0a1020;position:relative;transition:background .15s;flex-shrink:0}
    .${ROOT}-toggle-box.on{background:#1a4a8a;border-color:#60a5fa}
    .${ROOT}-toggle-box::after{content:'';position:absolute;width:8px;height:8px;border-radius:50%;background:#3a6a9f;top:2px;left:2px;transition:left .15s}
    .${ROOT}-toggle-box.on::after{left:14px;background:#90c8ff}
    .${ROOT}-toggle-label{font-size:10px;color:#6a8aaf}
    .${ROOT}-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
    .${ROOT}-anim-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
    .${ROOT}-anim-tab{padding:4px 10px;border:1px solid #1a2a4a;background:#080e1c;color:#5a7a9f;font-family:'Share Tech Mono',monospace;font-size:9px;border-radius:3px;cursor:pointer;letter-spacing:1px;text-transform:uppercase}
    .${ROOT}-anim-tab.active{background:#0f1e3a;border-color:#60a5fa;color:#90c8ff}
    .${ROOT}-timeline{background:#080e1c;border:1px solid #1a2a4a;border-radius:4px;padding:10px}
    .${ROOT}-frames{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}
    .${ROOT}-frame{width:42px;height:42px;border:1px solid #1a2a4a;border-radius:4px;background:#0a1428;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;color:#5a7a9f;transition:all .15s;flex-direction:column;gap:1px}
    .${ROOT}-frame:hover{border-color:#3a6aaf}
    .${ROOT}-frame.selected{border-color:#60a5fa;background:#0f1e3a;color:#90c8ff}
    .${ROOT}-frame.add{border-style:dashed;color:#2a4a6f}
    .${ROOT}-frame-dur{font-size:8px;color:#4a6a8f}
    .${ROOT}-frame-props{background:#0a1428;border:1px solid #1a2a4a;border-radius:4px;padding:10px;margin-top:8px}
    .${ROOT}-prop-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .${ROOT}-prop-item{display:flex;flex-direction:column;gap:3px}
    .${ROOT}-prop-label{font-size:9px;color:#4a6a8f;letter-spacing:0.5px}
    .${ROOT}-prop-input{background:#080e1c;border:1px solid #1a2a4a;color:#90b8e0;font-family:'Share Tech Mono',monospace;font-size:10px;padding:3px 5px;border-radius:3px;outline:none;width:100%}
    .${ROOT}-prop-input:focus{border-color:#60a5fa}
    .${ROOT}-paint-canvas{border:1px solid #1a2a4a;border-radius:4px;cursor:crosshair;display:block;image-rendering:pixelated;width:256px;height:256px}
    .${ROOT}-paint-tools{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
    .${ROOT}-paint-tool{padding:3px 9px;border:1px solid #1a2a4a;background:#080e1c;color:#5a7a9f;font-family:'Share Tech Mono',monospace;font-size:9px;border-radius:3px;cursor:pointer}
    .${ROOT}-paint-tool.active{background:#0f1e3a;border-color:#60a5fa;color:#90c8ff}
    .${ROOT}-textinput{background:#0a1828;border:1px solid #1a3060;color:#90b8e0;font-family:'Share Tech Mono',monospace;font-size:10px;padding:4px 7px;border-radius:4px;outline:none;width:100%}
    .${ROOT}-textinput:focus{border-color:#60a5fa}
    .${ROOT}-tip{font-size:9px;color:#3a5a7f;margin-top:6px;line-height:1.6}
    .${ROOT}-summary{padding:10px 12px;border-top:1px solid #1a2a4a;flex-shrink:0}
    .${ROOT}-summary-title{font-size:9px;color:#3a5a7f;margin-bottom:5px;letter-spacing:1px}
    .${ROOT}-summary-text{font-size:9px;color:#5a7a9f;line-height:1.9}
    .${ROOT}-close{background:none;border:none;color:#4a6a8f;font-size:18px;cursor:pointer;padding:0 2px;line-height:1;margin-left:auto}
    .${ROOT}-close:hover{color:#ff6060}
    canvas#${ROOT}-preview{display:block}
  `;
  document.head.appendChild(styleEl);

  // Build shell
  const overlay = document.createElement("div");
  overlay.id = `${ROOT}-overlay`;
  overlay.innerHTML = `
    <div class="${ROOT}-topbar">
      <div class="${ROOT}-title">⚔ WEAPON FORGE</div>
      <input class="${ROOT}-nameinput" id="${ROOT}-nameinput" value="${state.name}" placeholder="Weapon name...">
      <div class="${ROOT}-typetabs">
        <button class="${ROOT}-typebtn active" data-type="gun">Gun</button>
        <button class="${ROOT}-typebtn" data-type="sword">Sword</button>
        <button class="${ROOT}-typebtn" data-type="ability">Ability</button>
        <button class="${ROOT}-typebtn" data-type="throwable">Throwable</button>
      </div>
      <button class="${ROOT}-btn" id="${ROOT}-import-btn">Import .wpn</button>
      <button class="${ROOT}-btn success" id="${ROOT}-export-btn">Export .wpn</button>
      <button class="${ROOT}-btn" id="${ROOT}-copy-btn">Copy JSON</button>
      <button class="${ROOT}-close" id="${ROOT}-close-btn">✕</button>
    </div>
    <div class="${ROOT}-main">
      <div class="${ROOT}-sidebar">
        <div class="${ROOT}-sidetab active" data-tab="stats">⚡ Stats</div>
        <div class="${ROOT}-sidetab" data-tab="appearance">🎨 Appearance</div>
        <div class="${ROOT}-sidetab" data-tab="shape">📐 Shape</div>
        <div class="${ROOT}-sidetab" data-tab="effects">✨ Effects</div>
        <div class="${ROOT}-sidetab" data-tab="animation">▶ Animation</div>
        <div class="${ROOT}-sidetab" data-tab="texture">🖌 Texture</div>
        <div class="${ROOT}-sidetab" data-tab="lore">📖 Lore</div>
      </div>
      <div class="${ROOT}-content" id="${ROOT}-content"></div>
      <div class="${ROOT}-preview-panel">
        <div class="${ROOT}-preview-title">LIVE PREVIEW</div>
        <div class="${ROOT}-preview-canvas"><canvas id="${ROOT}-preview" width="260" height="260"></canvas></div>
        <div class="${ROOT}-preview-controls">
          <button class="${ROOT}-btn" id="${ROOT}-play-btn">▶ Play</button>
          <button class="${ROOT}-btn" id="${ROOT}-stop-btn">■ Stop</button>
          <select class="${ROOT}-select" id="${ROOT}-anim-sel" style="flex:1">
            <option value="idle">Idle</option>
            <option value="attack">Attack</option>
            <option value="reload">Reload</option>
            <option value="hit">Hit</option>
            <option value="death">Death</option>
          </select>
        </div>
        <div class="${ROOT}-summary">
          <div class="${ROOT}-summary-title">STATS SUMMARY</div>
          <div class="${ROOT}-summary-text" id="${ROOT}-summary"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Helpers ───────────────────────────────────────────────────
  const $ = id => document.getElementById(`${ROOT}-${id}`);

  const makeSlider = (key, label, min, max, step, section) => {
    section = section || 'stats';
    const val = state[section][key];
    return `<div class="${ROOT}-row">
      <span class="${ROOT}-label">${label}</span>
      <input type="range" class="${ROOT}-slider" data-key="${key}" data-sec="${section}" min="${min}" max="${max}" step="${step}" value="${val}">
      <span class="${ROOT}-val" id="${ROOT}-v-${section}-${key}">${val}</span>
    </div>`;
  };

  const makeSelect = (key, label, opts, section) => {
    section = section || 'effects';
    const val = state[section] ? state[section][key] : '';
    return `<div class="${ROOT}-row">
      <span class="${ROOT}-label">${label}</span>
      <select class="${ROOT}-select" data-key="${key}" data-sec="${section}">
        ${opts.map(([v,l]) => `<option value="${v}"${val===v?' selected':''}>${l}</option>`).join('')}
      </select>
    </div>`;
  };

  const makeToggle = (key, label, section) => {
    section = section || 'effects';
    const val = state[section] ? state[section][key] : state[key];
    return `<label class="${ROOT}-toggle">
      <div class="${ROOT}-toggle-box ${val?'on':''}" data-key="${key}" data-sec="${section}"></div>
      <span class="${ROOT}-toggle-label">${label}</span>
    </label>`;
  };

  const makeColor = (key, label, section) => {
    const val = state[section][key];
    return `<div class="${ROOT}-colorrow">
      <span class="${ROOT}-label">${label}</span>
      <input type="color" class="${ROOT}-colorpick" data-key="${key}" data-sec="${section}" value="${val}">
      <span class="${ROOT}-colorval" id="${ROOT}-cv-${section}-${key}">${val}</span>
    </div>`;
  };

  // ── Tab content ───────────────────────────────────────────────
  const tabContent = {
    stats() {
      const t = state.type;
      return `
        <div class="${ROOT}-section">
          <div class="${ROOT}-section-title">Universal</div>
          <div class="${ROOT}-stat-grid">
            ${makeSlider('damage','Damage',1,500,1)}
            ${makeSlider('range','Range',10,2000,10)}
            ${makeSlider('speed','Speed',10,2000,10)}
            ${makeSlider('knockback','Knockback',0,100,1)}
            ${makeSlider('weight','Weight',1,20,1)}
            ${makeSlider('critChance','Crit Chance %',0,100,1)}
            ${makeSlider('critMulti','Crit Multiplier',1.0,10,0.1)}
            ${makeSlider('lifesteal','Lifesteal %',0,100,1)}
            ${makeSlider('pierce','Pierce Count',0,20,1)}
          </div>
        </div>
        ${t==='gun'?`<div class="${ROOT}-section"><div class="${ROOT}-section-title">Gun</div><div class="${ROOT}-stat-grid">
          ${makeSlider('fireRate','Fire Rate (rps)',0.5,30,0.5)}
          ${makeSlider('ammo','Ammo',1,999,1)}
          ${makeSlider('reloadTime','Reload (s)',0.1,10,0.1)}
          ${makeSlider('spread','Spread (deg)',0,45,0.5)}
          ${makeSlider('recoil','Recoil',0,50,1)}
          ${makeSlider('bulletSize','Bullet Size',1,20,1)}
          ${makeSlider('bulletCount','Bullets/Shot',1,20,1)}
          ${makeSlider('burstCount','Burst Count',1,10,1)}
          ${makeSlider('burstDelay','Burst Delay (s)',0.01,1,0.01)}
          ${makeSlider('projectileGravity','Proj. Gravity',0,100,1)}
          ${makeSlider('bounces','Bounces',0,10,1)}
          ${makeSlider('explosionRadius','Explosion Radius',0,300,5)}
        </div></div>`:''}
        ${t==='sword'?`<div class="${ROOT}-section"><div class="${ROOT}-section-title">Sword</div><div class="${ROOT}-stat-grid">
          ${makeSlider('swingArc','Swing Arc (deg)',10,360,5)}
          ${makeSlider('swingSpeed','Swing Speed',1,20,1)}
          ${makeSlider('comboLength','Combo Length',1,10,1)}
          ${makeSlider('blockPower','Block Power %',0,100,1)}
          ${makeSlider('bladeLength','Blade Length',20,200,5)}
          ${makeSlider('guardSize','Guard Size',0,50,1)}
          ${makeSlider('slashTrail','Slash Trail',0,1,1)}
        </div></div>`:''}
        ${t==='ability'?`<div class="${ROOT}-section"><div class="${ROOT}-section-title">Ability</div><div class="${ROOT}-stat-grid">
          ${makeSlider('cooldown','Cooldown (s)',0.1,60,0.1)}
          ${makeSlider('duration','Duration (s)',0.1,30,0.1)}
          ${makeSlider('radius','Radius',10,500,5)}
          ${makeSlider('charges','Charges',1,10,1)}
          ${makeSlider('castTime','Cast Time (s)',0,5,0.05)}
          ${makeSlider('manaCost','Mana Cost',0,200,1)}
          ${makeSlider('aoeDelay','AoE Delay (s)',0,5,0.05)}
        </div></div>`:''}
        ${t==='throwable'?`<div class="${ROOT}-section"><div class="${ROOT}-section-title">Throwable</div><div class="${ROOT}-stat-grid">
          ${makeSlider('fuseTime','Fuse Time (s)',0,10,0.1)}
          ${makeSlider('throwForce','Throw Force',100,2000,10)}
          ${makeSlider('bounceCount','Bounces',0,10,1)}
          ${makeSlider('stickToWalls','Stick to Walls',0,1,1)}
          ${makeSlider('throwableRadius','Explosion Radius',0,300,5)}
          ${makeSlider('spinRate','Spin Rate',0,20,1)}
        </div></div>`:''}
      `;
    },
    appearance() {
      return `
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Colors</div>
          ${makeColor('primaryColor','Primary','appearance')}
          ${makeColor('secondaryColor','Secondary','appearance')}
          ${makeColor('accentColor','Accent','appearance')}
          ${makeColor('emissiveColor','Emissive / Glow','appearance')}
          ${makeColor('trailColor','Trail','appearance')}
          ${makeColor('outlineColor','Outline','appearance')}
          ${makeColor('particleColor','Particle','appearance')}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Material</div>
          ${makeSlider('metalness','Metalness %',0,100,1,'appearance')}
          ${makeSlider('roughness','Roughness %',0,100,1,'appearance')}
          ${makeSlider('emissiveIntensity','Glow Intensity',0,100,1,'appearance')}
          ${makeSlider('outlineWidth','Outline Width',0,5,0.5,'appearance')}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Toggles</div>
          ${makeToggle('glowEnabled','Enable Glow','appearance')}
          ${makeToggle('trailEnabled','Enable Trail','appearance')}
          ${makeToggle('outlineEnabled','Enable Outline','appearance')}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Particle Effect</div>
          ${makeSelect('particleEffect','Particle Type',[
            ['none','None'],['sparks','Sparks'],['smoke','Smoke'],['fire','Fire'],
            ['blood','Blood'],['magic','Magic'],['ice','Ice'],['lightning','Lightning'],
            ['poison','Poison'],['stars','Stars'],['hearts','Hearts'],['skulls','Skulls']
          ],'appearance')}
        </div>
      `;
    },
    shape() {
      const t = state.type;
      if (t==='gun') return `
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Barrel</div>
          ${makeSlider('barrelLength','Length',10,120,2,'appearance')}
          ${makeSlider('barrelWidth','Width',2,20,1,'appearance')}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Body</div>
          ${makeSlider('bodyWidth','Width',10,60,1,'appearance')}
          ${makeSlider('bodyHeight','Height',8,40,1,'appearance')}
          ${makeSlider('magazineSize','Magazine Size',4,24,1,'appearance')}
          ${makeSlider('magazineAngle','Magazine Angle',-30,30,1,'appearance')}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Stock & Grip</div>
          ${makeSlider('stockLength','Stock Length',0,80,2,'appearance')}
          ${makeSlider('stockHeight','Stock Height',4,24,1,'appearance')}
          ${makeSlider('gripHeight','Grip Height',10,40,1,'appearance')}
          ${makeSlider('gripWidth','Grip Width',4,16,1,'appearance')}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Attachments</div>
          ${makeToggle('scopeEnabled','Scope','appearance')}
          ${makeToggle('silencerEnabled','Silencer','appearance')}
          ${makeToggle('flashlightEnabled','Flashlight','appearance')}
        </div>`;
      if (t==='sword') return `
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Blade</div>
          ${makeSlider('bladeWidth','Width',4,30,1,'appearance')}
          ${makeSlider('bladeCurve','Curve',-30,30,1,'appearance')}
          ${makeSelect('tipStyle','Tip Style',[
            ['point','Point'],['flat','Flat'],['round','Round'],['double','Double Edge'],['broken','Broken']
          ],'appearance')}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Guard</div>
          ${makeSlider('guardWidth','Width',10,80,2,'appearance')}
          ${makeSlider('guardHeight','Height',4,24,1,'appearance')}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Handle</div>
          ${makeSlider('handleLength','Length',20,80,2,'appearance')}
          ${makeSlider('handleWidth','Width',4,16,1,'appearance')}
          ${makeSlider('pommelSize','Pommel Size',4,24,1,'appearance')}
          ${makeSelect('pommelStyle','Pommel Style',[
            ['round','Round'],['flat','Flat'],['diamond','Diamond'],['skull','Skull'],['gem','Gem']
          ],'appearance')}
        </div>`;
      if (t==='ability') return `
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Shape</div>
          ${makeSelect('abilityShape','Shape',[
            ['circle','Circle'],['ring','Ring'],['star','Star'],['cross','Cross'],
            ['spiral','Spiral'],['triangle','Triangle'],['hex','Hexagon']
          ],'appearance')}
          ${makeSlider('abilitySize','Size',20,200,5,'appearance')}
        </div>`;
      if (t==='throwable') return `
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Shape</div>
          ${makeSelect('throwableShape','Shape',[
            ['sphere','Sphere'],['cube','Cube'],['cylinder','Cylinder'],
            ['star','Star'],['spike','Spike Ball'],['bottle','Bottle']
          ],'appearance')}
          ${makeSlider('throwableSize','Size',6,40,1,'appearance')}
        </div>`;
      return '';
    },
    effects() {
      return `
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Trigger Effects</div>
          ${makeSelect('onHit','On Hit',[
            ['none','None'],['sparks','Sparks'],['explosion','Explosion'],['freeze','Freeze'],
            ['poison','Poison Cloud'],['chain','Chain Lightning'],['heal','Heal Pulse'],
            ['slow','Slow Field'],['burn','Ignite'],['blind','Flash Blind']
          ])}
          ${makeSelect('onKill','On Kill',[
            ['none','None'],['explode','Explode'],['heal','Restore HP'],['ammo','Restore Ammo'],
            ['speed','Speed Boost'],['rage','Rage Mode'],['clone','Create Clone'],['revive','Auto Revive']
          ])}
          ${makeSelect('onCrit','On Crit',[
            ['none','None'],['double','Double Damage'],['pierce','Pierce Through'],
            ['chain','Chain Hit'],['stun','Stun'],['execute','Execute Low HP']
          ])}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Status Effect</div>
          ${makeSelect('statusEffect','Status',[
            ['none','None'],['burn','Burn'],['poison','Poison'],['freeze','Freeze'],
            ['shock','Shock'],['bleed','Bleed'],['curse','Curse'],['charm','Charm'],
            ['blind','Blind'],['slow','Slow'],['stun','Stun'],['weaken','Weaken']
          ])}
          ${makeSlider('statusDuration','Duration (s)',0,30,0.5)}
          ${makeSlider('statusStrength','Strength',1,10,1)}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Elemental</div>
          ${makeSelect('elementType','Element',[
            ['none','None'],['fire','Fire'],['ice','Ice'],['lightning','Lightning'],
            ['poison','Poison'],['void','Void'],['holy','Holy'],['shadow','Shadow'],
            ['earth','Earth'],['wind','Wind'],['water','Water'],['arcane','Arcane']
          ])}
          ${makeSlider('elementDamage','Element Damage',0,200,5)}
          ${makeSlider('poisonDps','Poison DPS',0,100,1)}
          ${makeSlider('burnDps','Burn DPS',0,100,1)}
          ${makeSlider('freezeDuration','Freeze Duration (s)',0,10,0.1)}
          ${makeSlider('shockChance','Shock Chance %',0,100,1)}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">On Kill Bonuses</div>
          ${makeSlider('lifeOnKill','Life on Kill',0,200,1)}
          ${makeSlider('ammoOnKill','Ammo on Kill',0,50,1)}
          ${makeToggle('explosiveOnKill','Explosive on Kill')}
          ${makeToggle('chainLightning','Chain Lightning')}
          ${makeSlider('chainTargets','Chain Targets',2,10,1)}
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Hit Feel</div>
          ${makeSlider('screenShake','Screen Shake',0,20,1)}
          ${makeSlider('hitStop','Hit Stop (s)',0,0.5,0.01)}
          ${makeToggle('muzzleFlash','Muzzle Flash')}
          ${makeToggle('ejectedCasings','Ejected Casings')}
          ${makeToggle('bloodEffect','Blood Effect')}
          ${makeToggle('impactDecal','Impact Decal')}
        </div>
      `;
    },
    animation() {
      const anim = state.animations[state.animTab];
      const frames = anim.frames;
      const sel = state.selectedFrame;
      const frame = frames[sel] || frames[0];
      return `
        <div class="${ROOT}-section">
          <div class="${ROOT}-section-title">Animation Set</div>
          <div class="${ROOT}-anim-tabs">
            ${['idle','attack','reload','hit','death'].map(a =>
              `<button class="${ROOT}-anim-tab${state.animTab===a?' active':''}" data-anim="${a}">${a}</button>`
            ).join('')}
          </div>
        </div>
        <div class="${ROOT}-section">
          <div class="${ROOT}-section-title">Timeline — ${frames.length} frame${frames.length!==1?'s':''}</div>
          <div class="${ROOT}-timeline">
            <div class="${ROOT}-frames">
              ${frames.map((f,i)=>`
                <div class="${ROOT}-frame${i===sel?' selected':''}" data-frame="${i}">
                  <span>${i+1}</span>
                  <span class="${ROOT}-frame-dur">${f.duration}ms</span>
                </div>`).join('')}
              <div class="${ROOT}-frame add" id="${ROOT}-add-frame">+</div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
              <button class="${ROOT}-btn" id="${ROOT}-dup-frame">Dup</button>
              <button class="${ROOT}-btn danger" id="${ROOT}-del-frame"${frames.length<=1?' disabled':''}>Del</button>
              <button class="${ROOT}-btn" id="${ROOT}-mv-left"${sel===0?' disabled':''}>◀</button>
              <button class="${ROOT}-btn" id="${ROOT}-mv-right"${sel>=frames.length-1?' disabled':''}>▶</button>
            </div>
          </div>
          <div class="${ROOT}-frame-props">
            <div class="${ROOT}-section-title" style="margin-bottom:8px">Frame ${sel+1} Properties</div>
            <div class="${ROOT}-prop-grid">
              ${[['x','X Offset'],['y','Y Offset'],['rot','Rotation (deg)'],['scaleX','Scale X'],['scaleY','Scale Y'],['duration','Duration (ms)']].map(([p,l])=>`
                <div class="${ROOT}-prop-item">
                  <span class="${ROOT}-prop-label">${l}</span>
                  <input class="${ROOT}-prop-input" data-prop="${p}" type="number" step="${p==='duration'?10:p.startsWith('scale')?0.01:0.5}" min="${p==='duration'?10:p.startsWith('scale')?0.01:-9999}" value="${frame[p]}">
                </div>`).join('')}
            </div>
          </div>
        </div>
        <div class="${ROOT}-tip">Use Play button in the preview panel to see animations. Select frames to edit their properties.</div>
      `;
    },
    texture() {
      return `
        <div class="${ROOT}-section">
          <div class="${ROOT}-section-title">Texture Painter</div>
          <div class="${ROOT}-paint-tools">
            ${[['draw','✏ Draw'],['erase','◻ Erase'],['fill','⬛ Fill'],['eyedrop','💧 Pick']].map(([m,l])=>
              `<button class="${ROOT}-paint-tool${state.paintMode===m?' active':''}" data-paint="${m}">${l}</button>`
            ).join('')}
            <input type="color" class="${ROOT}-colorpick" id="${ROOT}-paint-color" value="${state.paintColor}">
            <input type="range" class="${ROOT}-slider" id="${ROOT}-paint-size" min="1" max="12" value="${state.paintSize}" style="width:70px">
            <span style="font-size:10px;color:#90b8e0" id="${ROOT}-paint-size-val">${state.paintSize}px</span>
          </div>
          <canvas id="${ROOT}-paint-canvas" class="${ROOT}-paint-canvas" width="256" height="256"></canvas>
          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
            <button class="${ROOT}-btn" id="${ROOT}-clear-tex">Clear</button>
            <button class="${ROOT}-btn" id="${ROOT}-flip-h">Flip H</button>
            <button class="${ROOT}-btn" id="${ROOT}-flip-v">Flip V</button>
            ${makeToggle('textureLayer','Show on Preview','state')}
          </div>
          <div class="${ROOT}-tip">Paint over the weapon guide. Colors blend with your chosen appearance colors in the live preview.</div>
        </div>
      `;
    },
    lore() {
      const l = state.lore;
      return `
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Identity</div>
          <div class="${ROOT}-row">
            <span class="${ROOT}-label">Rarity</span>
            <select class="${ROOT}-select" data-key="rarity" data-sec="lore">
              ${['common','uncommon','rare','epic','legendary','mythic'].map(r=>
                `<option value="${r}"${l.rarity===r?' selected':''}>${r[0].toUpperCase()+r.slice(1)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="${ROOT}-row"><span class="${ROOT}-label">Faction</span>
            <input class="${ROOT}-textinput" data-key="faction" data-sec="lore" value="${l.faction}" placeholder="e.g. Shadow Guild">
          </div>
          <div class="${ROOT}-row"><span class="${ROOT}-label">Origin</span>
            <input class="${ROOT}-textinput" data-key="origin" data-sec="lore" value="${l.origin}" placeholder="e.g. Forged in the void">
          </div>
          <div class="${ROOT}-row"><span class="${ROOT}-label">Unlock Condition</span>
            <input class="${ROOT}-textinput" data-key="unlockCondition" data-sec="lore" value="${l.unlockCondition}" placeholder="e.g. Reach level 50">
          </div>
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Description</div>
          <textarea class="${ROOT}-textinput" data-key="description" data-sec="lore" rows="4" placeholder="Weapon description...">${l.description}</textarea>
        </div>
        <div class="${ROOT}-section"><div class="${ROOT}-section-title">Flavor Text</div>
          <textarea class="${ROOT}-textinput" data-key="flavorText" data-sec="lore" rows="3" placeholder="Shown in tooltip as italic text...">${l.flavorText}</textarea>
        </div>
      `;
    }
  };

  // ── Render ────────────────────────────────────────────────────
  const contentEl = $('content');
  let animTimer = null;

  function render() {
    contentEl.innerHTML = tabContent[state.tab]();
    bindEvents();
    drawPreview();
    updateSummary();
    if (state.tab === 'texture') { redrawTexture(); initPaintCanvas(); }
  }

  function bindEvents() {
    // Sliders
    contentEl.querySelectorAll(`.${ROOT}-slider`).forEach(el => {
      el.addEventListener('input', () => {
        const sec = el.dataset.sec; const key = el.dataset.key;
        const v = parseFloat(el.value);
        if (sec === 'state') state[key] = v;
        else if (state[sec]) state[sec][key] = v;
        const vEl = document.getElementById(`${ROOT}-v-${sec}-${key}`);
        if (vEl) vEl.textContent = v;
        drawPreview(); updateSummary();
      });
    });
    // Selects
    contentEl.querySelectorAll(`.${ROOT}-select`).forEach(el => {
      el.addEventListener('change', () => {
        const sec = el.dataset.sec; const key = el.dataset.key;
        if (sec === 'lore') state.lore[key] = el.value;
        else if (state[sec]) state[sec][key] = el.value;
        drawPreview();
      });
    });
    // Colors
    contentEl.querySelectorAll(`.${ROOT}-colorpick`).forEach(el => {
      el.addEventListener('input', () => {
        const sec = el.dataset.sec; const key = el.dataset.key;
        if (sec && state[sec]) state[sec][key] = el.value;
        const cvEl = document.getElementById(`${ROOT}-cv-${sec}-${key}`);
        if (cvEl) cvEl.textContent = el.value;
        drawPreview();
      });
    });
    // Toggles
    contentEl.querySelectorAll(`.${ROOT}-toggle-box`).forEach(box => {
      box.closest(`.${ROOT}-toggle`).addEventListener('click', () => {
        const sec = box.dataset.sec; const key = box.dataset.key;
        if (sec === 'state') state[key] = !state[key];
        else if (state[sec]) state[sec][key] = !state[sec][key];
        box.classList.toggle('on');
        drawPreview();
      });
    });
    // Lore text
    contentEl.querySelectorAll('[data-sec="lore"]').forEach(el => {
      el.addEventListener('input', () => { state.lore[el.dataset.key] = el.value; });
    });
    // Anim tabs
    contentEl.querySelectorAll(`.${ROOT}-anim-tab`).forEach(btn => {
      btn.addEventListener('click', () => { state.animTab = btn.dataset.anim; state.selectedFrame = 0; render(); });
    });
    // Frame select
    contentEl.querySelectorAll(`.${ROOT}-frame[data-frame]`).forEach(el => {
      el.addEventListener('click', () => { state.selectedFrame = parseInt(el.dataset.frame); render(); });
    });
    // Frame props
    contentEl.querySelectorAll(`.${ROOT}-prop-input`).forEach(el => {
      el.addEventListener('input', () => {
        const f = state.animations[state.animTab].frames[state.selectedFrame];
        if (f) { f[el.dataset.prop] = parseFloat(el.value); drawPreview(); }
      });
    });
    // Add frame
    const addF = $('add-frame');
    if (addF) addF.addEventListener('click', () => {
      const fs = state.animations[state.animTab].frames;
      fs.push({...fs[fs.length-1]});
      state.selectedFrame = fs.length-1; render();
    });
    // Dup
    const dupF = $('dup-frame');
    if (dupF) dupF.addEventListener('click', () => {
      const fs = state.animations[state.animTab].frames;
      fs.splice(state.selectedFrame+1,0,{...fs[state.selectedFrame]});
      state.selectedFrame++; render();
    });
    // Del
    const delF = $('del-frame');
    if (delF) delF.addEventListener('click', () => {
      const fs = state.animations[state.animTab].frames;
      if (fs.length<=1) return;
      fs.splice(state.selectedFrame,1);
      state.selectedFrame = Math.min(state.selectedFrame,fs.length-1); render();
    });
    // Move
    const mvL = $('mv-left');
    if (mvL) mvL.addEventListener('click', () => {
      const fs = state.animations[state.animTab].frames; const i = state.selectedFrame;
      if (i>0) { [fs[i],fs[i-1]]=[fs[i-1],fs[i]]; state.selectedFrame--; render(); }
    });
    const mvR = $('mv-right');
    if (mvR) mvR.addEventListener('click', () => {
      const fs = state.animations[state.animTab].frames; const i = state.selectedFrame;
      if (i<fs.length-1) { [fs[i],fs[i+1]]=[fs[i+1],fs[i]]; state.selectedFrame++; render(); }
    });
    // Paint
    contentEl.querySelectorAll(`.${ROOT}-paint-tool`).forEach(btn => {
      btn.addEventListener('click', () => { state.paintMode = btn.dataset.paint; render(); });
    });
    const pc = $('paint-color');
    if (pc) pc.addEventListener('input', () => { state.paintColor = pc.value; });
    const ps = $('paint-size');
    if (ps) ps.addEventListener('input', () => {
      state.paintSize = parseInt(ps.value);
      const el = $('paint-size-val'); if (el) el.textContent = state.paintSize+'px';
    });
    const clearTex = $('clear-tex');
    if (clearTex) clearTex.addEventListener('click', () => { state.pixels = {}; redrawTexture(); drawPreview(); });
    const flipH = $('flip-h');
    if (flipH) flipH.addEventListener('click', () => flipPixels('h'));
    const flipV = $('flip-v');
    if (flipV) flipV.addEventListener('click', () => flipPixels('v'));
  }

  // ── Paint canvas ──────────────────────────────────────────────
  let isPainting = false;

  function initPaintCanvas() {
    const canvas = $('paint-canvas');
    if (!canvas) return;
    canvas.addEventListener('mousedown', e => { isPainting = true; paint(e, canvas); });
    canvas.addEventListener('mousemove', e => { if (isPainting) paint(e, canvas); });
    canvas.addEventListener('mouseup', () => { isPainting = false; });
    canvas.addEventListener('mouseleave', () => { isPainting = false; });
  }

  function paint(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const px = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const py = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    const sz = state.paintSize;
    if (state.paintMode === 'eyedrop') {
      const ctx = canvas.getContext('2d');
      const d = ctx.getImageData(px,py,1,1).data;
      state.paintColor = '#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
      const pcEl = $('paint-color'); if (pcEl) pcEl.value = state.paintColor;
      return;
    }
    if (state.paintMode === 'fill') { floodFill(px,py,state.paintColor,canvas); return; }
    for (let dx=-sz;dx<=sz;dx++) for (let dy=-sz;dy<=sz;dy++) {
      if (dx*dx+dy*dy<=sz*sz) {
        const k = `${px+dx},${py+dy}`;
        if (state.paintMode==='erase') delete state.pixels[k];
        else state.pixels[k] = state.paintColor;
      }
    }
    redrawTexture(); drawPreview();
  }

  function floodFill(sx,sy,color,canvas) {
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0,0,canvas.width,canvas.height);
    const ti = 4*(sy*canvas.width+sx);
    const target = [img.data[ti],img.data[ti+1],img.data[ti+2]];
    const stack = [[sx,sy]]; const vis = new Set();
    while (stack.length) {
      const [x,y] = stack.pop(); const k=`${x},${y}`;
      if (vis.has(k)||x<0||y<0||x>=canvas.width||y>=canvas.height) continue;
      vis.add(k);
      const i=4*(y*canvas.width+x);
      if (Math.abs(img.data[i]-target[0])>30||Math.abs(img.data[i+1]-target[1])>30||Math.abs(img.data[i+2]-target[2])>30) continue;
      state.pixels[k]=color;
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    redrawTexture(); drawPreview();
  }

  function redrawTexture() {
    const canvas = $('paint-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,256,256);
    ctx.strokeStyle='#1a2a4a'; ctx.lineWidth=0.5;
    for (let i=0;i<256;i+=8) {
      ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();
    }
    drawWeapon(ctx,128,128,0,0,1,1,true);
    Object.entries(state.pixels).forEach(([k,c])=>{
      const [x,y]=k.split(',').map(Number);
      ctx.fillStyle=c; ctx.fillRect(x,y,1,1);
    });
  }

  function flipPixels(dir) {
    const np={};
    Object.entries(state.pixels).forEach(([k,c])=>{
      const [x,y]=k.split(',').map(Number);
      np[`${dir==='h'?255-x:x},${dir==='v'?255-y:y}`]=c;
    });
    state.pixels=np; redrawTexture(); drawPreview();
  }

  // ── Weapon drawing ────────────────────────────────────────────
  function drawWeapon(ctx, cx, cy, dx, dy, sx, sy, guide) {
    const a = state.appearance;
    ctx.save();
    ctx.translate(cx+(dx||0), cy+(dy||0));
    ctx.scale(sx||1, sy||1);
    if (state.type==='gun') drawGun(ctx,a,guide);
    else if (state.type==='sword') drawSword(ctx,a,guide);
    else if (state.type==='ability') drawAbility(ctx,a,guide);
    else drawThrowable(ctx,a,guide);
    ctx.restore();
  }

  function drawGun(ctx,a,guide) {
    const alpha = guide?0.18:1;
    const {primaryColor:pc,secondaryColor:sc,accentColor:ac,barrelLength:bL,barrelWidth:bW,bodyWidth:bdW,bodyHeight:bdH,stockLength:stL,stockHeight:stH,gripHeight:grH,gripWidth:grW,magazineSize:magSz,magazineAngle:magA} = a;
    ctx.globalAlpha=alpha;
    if (a.glowEnabled&&!guide){ctx.shadowBlur=20*(a.emissiveIntensity/100);ctx.shadowColor=a.emissiveColor;}
    // Stock
    ctx.fillStyle=sc;
    ctx.beginPath();ctx.roundRect(-stL-bdW/2,-stH/2+2,stL,stH,3);ctx.fill();
    // Body
    ctx.fillStyle=pc;
    ctx.beginPath();ctx.roundRect(-bdW/2,-bdH/2,bdW,bdH,4);ctx.fill();
    // Grip
    ctx.fillStyle=sc;
    ctx.beginPath();ctx.roundRect(-grW/2+4,bdH/2,grW,grH,[0,0,4,4]);ctx.fill();
    // Magazine
    if (magSz>4) {
      ctx.save();ctx.translate(4,bdH/2);ctx.rotate((magA*Math.PI)/180);
      ctx.fillStyle=ac;ctx.beginPath();ctx.roundRect(-4,0,8,magSz*1.2,[0,0,3,3]);ctx.fill();ctx.restore();
    }
    // Barrel
    ctx.fillStyle=pc;ctx.beginPath();ctx.roundRect(bdW/2,-bW/2,bL,bW,[0,3,3,0]);ctx.fill();
    ctx.fillStyle=sc;ctx.beginPath();ctx.roundRect(bdW/2+bL-8,-bW/2,8,bW/2,[0,2,1,0]);ctx.fill();
    // Scope
    if (a.scopeEnabled){
      ctx.fillStyle='#1a1a2a';ctx.beginPath();ctx.roundRect(bdW/2+10,-bdH/2-10,24,10,3);ctx.fill();
      ctx.strokeStyle=ac;ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(bdW/2+22,-bdH/2-5,3,0,Math.PI*2);ctx.fill();
    }
    // Silencer
    if (a.silencerEnabled){
      ctx.fillStyle='#2a3a4a';ctx.beginPath();ctx.roundRect(bdW/2+bL,-bW-2,18,bW+4,[0,4,4,0]);ctx.fill();
    }
    // Flashlight
    if (a.flashlightEnabled){
      ctx.fillStyle='#f5e060';ctx.beginPath();ctx.roundRect(bdW/2,bdH/2-3,20,6,[0,3,3,0]);ctx.fill();
      if (!guide){ctx.fillStyle='rgba(245,224,96,0.1)';ctx.beginPath();ctx.moveTo(bdW/2+20,0);ctx.lineTo(bdW/2+80,-18);ctx.lineTo(bdW/2+80,18);ctx.closePath();ctx.fill();}
    }
    // Outline
    if (a.outlineEnabled&&!guide){
      ctx.strokeStyle=a.outlineColor;ctx.lineWidth=a.outlineWidth;ctx.globalAlpha=0.5;
      ctx.beginPath();ctx.roundRect(-stL-bdW/2-2,-bdH/2-2,stL+bL+bdW+4,bdH+4,6);ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  }

  function drawSword(ctx,a,guide) {
    const {primaryColor:pc,secondaryColor:sc,accentColor:ac,bladeWidth:bW,bladeCurve:bC,guardWidth:gW,guardHeight:gH,handleLength:hL,handleWidth:hW,pommelSize:pSz} = a;
    const bLen = state.stats.bladeLength||80;
    const alpha=guide?0.18:1;
    ctx.globalAlpha=alpha;
    if (a.glowEnabled&&!guide){ctx.shadowBlur=20*(a.emissiveIntensity/100);ctx.shadowColor=a.emissiveColor;}
    ctx.save();ctx.rotate(-Math.PI/4);
    // Pommel
    ctx.fillStyle=ac;ctx.beginPath();ctx.arc(0,hL/2+pSz/2,pSz/2,0,Math.PI*2);ctx.fill();
    // Handle
    for (let i=0;i<hL;i+=6){
      ctx.fillStyle=i%12===0?sc:pc;ctx.fillRect(-hW/2,i-hL/2,hW,6);
    }
    // Guard
    ctx.fillStyle=ac;ctx.beginPath();ctx.roundRect(-gW/2,-gH/2,gW,gH,3);ctx.fill();
    // Blade
    ctx.fillStyle=pc;ctx.beginPath();
    ctx.moveTo(-bW/2,0);ctx.quadraticCurveTo(-bW/4+bC,-bLen/2,0,-bLen);
    ctx.quadraticCurveTo(bW/4+bC,-bLen/2,bW/2,0);ctx.closePath();ctx.fill();
    if (!guide){
      ctx.strokeStyle='#fff';ctx.lineWidth=0.5;ctx.globalAlpha=0.35;
      ctx.beginPath();ctx.moveTo(bW/4,0);ctx.quadraticCurveTo(bW/4+bC,-bLen/2,0,-bLen);ctx.stroke();
    }
    ctx.restore();ctx.globalAlpha=1;ctx.shadowBlur=0;
  }

  function drawAbility(ctx,a,guide) {
    const sz=a.abilitySize/2; const shape=a.abilityShape;
    ctx.globalAlpha=guide?0.18:1;
    if (a.glowEnabled&&!guide){ctx.shadowBlur=30*(a.emissiveIntensity/100);ctx.shadowColor=a.emissiveColor;}
    ctx.strokeStyle=a.primaryColor;ctx.lineWidth=3;ctx.fillStyle=a.secondaryColor+'44';
    if (shape==='circle'){ctx.beginPath();ctx.arc(0,0,sz,0,Math.PI*2);ctx.fill();ctx.stroke();}
    else if (shape==='ring'){ctx.beginPath();ctx.arc(0,0,sz,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,sz*0.6,0,Math.PI*2);ctx.stroke();}
    else if (shape==='star'){
      ctx.beginPath();for(let i=0;i<10;i++){const r=i%2===0?sz:sz*0.4;const ang=(i*Math.PI)/5-Math.PI/2;i===0?ctx.moveTo(Math.cos(ang)*r,Math.sin(ang)*r):ctx.lineTo(Math.cos(ang)*r,Math.sin(ang)*r);}
      ctx.closePath();ctx.fill();ctx.stroke();
    }else if (shape==='cross'){
      const t=sz*0.3;ctx.beginPath();ctx.moveTo(-t,-sz);ctx.lineTo(t,-sz);ctx.lineTo(t,-t);ctx.lineTo(sz,-t);ctx.lineTo(sz,t);ctx.lineTo(t,t);ctx.lineTo(t,sz);ctx.lineTo(-t,sz);ctx.lineTo(-t,t);ctx.lineTo(-sz,t);ctx.lineTo(-sz,-t);ctx.lineTo(-t,-t);ctx.closePath();ctx.fill();ctx.stroke();
    }else if (shape==='hex'){
      ctx.beginPath();for(let i=0;i<6;i++){const ang=(i*Math.PI)/3;i===0?ctx.moveTo(Math.cos(ang)*sz,Math.sin(ang)*sz):ctx.lineTo(Math.cos(ang)*sz,Math.sin(ang)*sz);}ctx.closePath();ctx.fill();ctx.stroke();
    }else if (shape==='triangle'){
      ctx.beginPath();ctx.moveTo(0,-sz);ctx.lineTo(sz*0.866,sz*0.5);ctx.lineTo(-sz*0.866,sz*0.5);ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.fillStyle=a.accentColor;ctx.beginPath();ctx.arc(0,0,sz*0.15,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  }

  function drawThrowable(ctx,a,guide) {
    const sz=a.throwableSize||14; const shape=a.throwableShape||'sphere';
    ctx.globalAlpha=guide?0.18:1;
    const {primaryColor:pc,secondaryColor:sc,accentColor:ac}=a;
    if (shape==='sphere'){
      ctx.fillStyle=pc;ctx.beginPath();ctx.arc(0,0,sz,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=sc;ctx.beginPath();ctx.arc(-sz*0.25,-sz*0.25,sz*0.3,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=ac;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sz*0.5,-sz*0.5);ctx.lineTo(sz*0.5,-sz*1.4);ctx.stroke();
      ctx.fillStyle=ac;ctx.beginPath();ctx.arc(sz*0.5,-sz*1.4,sz*0.25,0,Math.PI*2);ctx.fill();
    }else if (shape==='cube'){
      ctx.fillStyle=pc;ctx.fillRect(-sz,-sz,sz*2,sz*2);
      ctx.fillStyle=sc;ctx.fillRect(-sz,-sz,sz,sz);ctx.fillRect(0,0,sz,sz);
      ctx.strokeStyle=ac;ctx.lineWidth=1.5;ctx.strokeRect(-sz,-sz,sz*2,sz*2);
    }else if (shape==='spike'){
      for(let i=0;i<8;i++){const ang=(i/8)*Math.PI*2;ctx.fillStyle=i%2===0?pc:ac;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(ang-0.2)*sz*0.5,Math.sin(ang-0.2)*sz*0.5);ctx.lineTo(Math.cos(ang)*sz*1.4,Math.sin(ang)*sz*1.4);ctx.lineTo(Math.cos(ang+0.2)*sz*0.5,Math.sin(ang+0.2)*sz*0.5);ctx.closePath();ctx.fill();}
    }else if (shape==='bottle'){
      ctx.fillStyle=pc;ctx.beginPath();ctx.roundRect(-sz*0.4,-sz,sz*0.8,sz*2,[4,4,sz*0.4,sz*0.4]);ctx.fill();
      ctx.fillStyle=ac;ctx.beginPath();ctx.roundRect(-sz*0.2,-sz*1.4,sz*0.4,sz*0.5,2);ctx.fill();
    }else if (shape==='cylinder'){
      ctx.fillStyle=pc;ctx.beginPath();ctx.ellipse(0,0,sz,sz*0.5,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=ac;ctx.lineWidth=2;ctx.stroke();
    }else if (shape==='star'){
      ctx.fillStyle=pc;ctx.beginPath();
      for(let i=0;i<10;i++){const r=i%2===0?sz:sz*0.45;const ang=(i*Math.PI)/5-Math.PI/2;i===0?ctx.moveTo(Math.cos(ang)*r,Math.sin(ang)*r):ctx.lineTo(Math.cos(ang)*r,Math.sin(ang)*r);}
      ctx.closePath();ctx.fill();ctx.strokeStyle=ac;ctx.lineWidth=1.5;ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  // ── Preview ───────────────────────────────────────────────────
  function drawPreview(dx, dy, drot, dsx, dsy) {
    const canvas = $('preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,260,260);
    const cx=130, cy=130;
    ctx.save();
    ctx.translate(cx+(dx||0), cy+(dy||0));
    ctx.rotate(((drot||0)*Math.PI)/180);
    ctx.scale(dsx||1, dsy||1);
    drawWeapon(ctx,0,0,0,0,1,1,false);
    if (state.textureLayer && Object.keys(state.pixels).length>0) {
      Object.entries(state.pixels).forEach(([k,c])=>{
        const [px,py]=k.split(',').map(Number);
        ctx.fillStyle=c+'99';ctx.fillRect(px-128,py-128,1,1);
      });
    }
    ctx.restore();
    if (state.appearance.trailEnabled) {
      ctx.strokeStyle=state.appearance.trailColor+'55';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(cx-50,cy+25);ctx.bezierCurveTo(cx-20,cy,cx+10,cy-10,cx+(dx||0),cy+(dy||0));ctx.stroke();
    }
  }

  function playAnim() {
    stopAnim();
    const name = $('anim-sel')?.value||'idle';
    const anim = state.animations[name]; if (!anim) return;
    let fi=0;
    function next(){
      const f=anim.frames[fi%anim.frames.length];
      drawPreview(f.x,f.y,f.rot,f.scaleX,f.scaleY);
      fi++; animTimer=setTimeout(next,f.duration);
    }
    next();
  }

  function stopAnim() {
    if (animTimer){clearTimeout(animTimer);animTimer=null;}
    drawPreview();
  }

  function updateSummary() {
    const el=$('summary'); if (!el) return;
    const s=state.stats; const t=state.type;
    const eff=state.effects;
    let lines=[
      `DMG ${s.damage}  RNG ${s.range}  SPD ${s.speed}`,
      `CRIT ${s.critChance}%×${s.critMulti}  KB ${s.knockback}  WGHT ${s.weight}`,
    ];
    if (t==='gun') lines.push(`RPM ${Math.round(s.fireRate*60)}  AMMO ${s.ammo}  RELOAD ${s.reloadTime}s`);
    if (t==='sword') lines.push(`ARC ${s.swingArc}°  COMBO ×${s.comboLength}  BLK ${s.blockPower}%`);
    if (t==='ability') lines.push(`CD ${s.cooldown}s  DUR ${s.duration}s  RAD ${s.radius}`);
    if (t==='throwable') lines.push(`FUSE ${s.fuseTime}s  FORCE ${s.throwForce}  RAD ${s.throwableRadius}`);
    if (eff.elementType!=='none') lines.push(`ELEM ${eff.elementType.toUpperCase()} +${eff.elementDamage}`);
    if (eff.statusEffect!=='none') lines.push(`STATUS ${eff.statusEffect} ${eff.statusDuration}s ×${eff.statusStrength}`);
    if (state.lore?.rarity) lines.push(`RARITY ${state.lore.rarity.toUpperCase()}`);
    el.innerHTML=lines.join('<br>');
  }

  // ── Export / Import ───────────────────────────────────────────
  function exportWpn() {
    const wpn={format:'wpn',version:1,name:state.name,type:state.type,stats:{...state.stats},appearance:{...state.appearance},effects:{...state.effects},animations:JSON.parse(JSON.stringify(state.animations)),pixels:{...state.pixels},lore:{...state.lore}};
    const blob=new Blob([JSON.stringify(wpn,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`${state.name.replace(/\s+/g,'_')}.wpn`;a.click();URL.revokeObjectURL(url);
  }

  function importWpn(json) {
    const wpn=typeof json==='string'?JSON.parse(json):json;
    if (wpn.format!=='wpn'){alert('Not a valid .wpn file');return;}
    state.name=wpn.name||'Imported';state.type=wpn.type||'gun';
    if (wpn.stats) Object.assign(state.stats,wpn.stats);
    if (wpn.appearance) Object.assign(state.appearance,wpn.appearance);
    if (wpn.effects) Object.assign(state.effects,wpn.effects);
    if (wpn.animations) Object.assign(state.animations,wpn.animations);
    if (wpn.pixels) state.pixels=wpn.pixels;
    if (wpn.lore) Object.assign(state.lore,wpn.lore);
    $('nameinput').value=state.name;
    overlay.querySelectorAll(`.${ROOT}-typebtn`).forEach(b=>b.classList.toggle('active',b.dataset.type===state.type));
    render();
  }

  // ── Wire global buttons ───────────────────────────────────────
  overlay.querySelectorAll(`.${ROOT}-typebtn`).forEach(btn=>{
    btn.addEventListener('click',()=>{
      state.type=btn.dataset.type;
      overlay.querySelectorAll(`.${ROOT}-typebtn`).forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); render();
    });
  });
  overlay.querySelectorAll(`.${ROOT}-sidetab`).forEach(tab=>{
    tab.addEventListener('click',()=>{
      state.tab=tab.dataset.tab;
      overlay.querySelectorAll(`.${ROOT}-sidetab`).forEach(t=>t.classList.remove('active'));
      tab.classList.add('active'); render();
    });
  });
  $('nameinput').addEventListener('input',e=>{state.name=e.target.value;});
  $('export-btn').addEventListener('click',exportWpn);
  $('import-btn').addEventListener('click',()=>{
    const inp=document.createElement('input');inp.type='file';inp.accept='.wpn,application/json';
    inp.addEventListener('change',async()=>{const f=inp.files?.[0];if(!f)return;importWpn(await f.text());});inp.click();
  });
  $('copy-btn').addEventListener('click',()=>{
    const wpn={format:'wpn',version:1,name:state.name,type:state.type,stats:{...state.stats},appearance:{...state.appearance},effects:{...state.effects},animations:state.animations,pixels:state.pixels,lore:state.lore};
    navigator.clipboard?.writeText(JSON.stringify(wpn,null,2)).then(()=>{
      const b=$('copy-btn');b.textContent='Copied!';setTimeout(()=>b.textContent='Copy JSON',1500);
    });
  });
  $('play-btn').addEventListener('click',playAnim);
  $('stop-btn').addEventListener('click',stopAnim);
  $('close-btn').addEventListener('click',()=>window.__WB.destroy());

  render();

  window.__WB = {
    destroy(){stopAnim();overlay.remove();styleEl.remove();delete window.__WB;},
    export: exportWpn,
    import: importWpn,
    state
  };
})();