(() => {
  if (window.PageClimberBuilder?.destroy) window.PageClimberBuilder.destroy();

  const ROOT = "page-climber-builder";
  const level = {
    format: "bnm",
    version: 1,
    name: "Custom Level",
    width: Math.max(innerWidth, 3200),
    height: Math.max(innerHeight * 4, 5600),
    start: { x: 40, y: Math.max(innerHeight * 4, 5600) - 120 },
    settings: { speed: 255, jump: 540 },
    finish: { x: 100, y: 80, width: Math.max(160, innerWidth - 200), height: 18 },
    platforms: [],
    crates: []
  };

  const state = {
    tool: "platform",
    dragging: false,
    dragStart: null,
    preview: null
  };

  const style = document.createElement("style");
  style.id = `${ROOT}-style`;
  style.textContent = `
    html,body{background:#020617 !important}
    #${ROOT}-blank{position:fixed;inset:0;z-index:2147483639;background:
      radial-gradient(circle at top, rgba(56,189,248,.18), transparent 30%),
      linear-gradient(180deg, #020617 0%, #0f172a 60%, #111827 100%)}
    #${ROOT}-ui{position:fixed;right:16px;top:16px;z-index:2147483647;width:340px;padding:12px;border-radius:14px;background:rgba(15,23,42,.92);color:#fff;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid rgba(148,163,184,.35);box-shadow:0 14px 40px rgba(15,23,42,.35)}
    #${ROOT}-ui h1{margin:0 0 8px;font-size:14px}
    #${ROOT}-ui p{margin:4px 0}
    #${ROOT}-buttons{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .${ROOT}-btn{border:1px solid rgba(96,165,250,.5);background:rgba(30,41,59,.9);color:#fff;border-radius:999px;padding:6px 10px;cursor:pointer;font:inherit}
    .${ROOT}-active{outline:2px solid rgba(250,204,21,.95)}
    #${ROOT}-world{position:absolute;left:0;top:0;z-index:2147483640;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:40px 40px}
    #${ROOT}-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
    #${ROOT}-fields label{display:block}
    #${ROOT}-fields input{width:100%;box-sizing:border-box;padding:6px 8px;border-radius:8px;border:1px solid rgba(148,163,184,.35);background:rgba(30,41,59,.95);color:#fff}
    .${ROOT}-platform,.${ROOT}-crate,.${ROOT}-start,.${ROOT}-finish,.${ROOT}-preview{position:absolute;z-index:2147483641}
    .${ROOT}-platform{background:rgba(96,165,250,.2);border:2px solid rgba(96,165,250,.95);border-radius:8px}
    .${ROOT}-crate{width:20px;height:20px;background:linear-gradient(135deg,#f59e0b,#ef4444);border:2px solid rgba(255,255,255,.88);border-radius:6px}
    .${ROOT}-start{width:28px;height:38px;background:#4ade80;border:2px solid #fff;border-radius:12px 12px 6px 6px}
    .${ROOT}-finish{border:2px dashed rgba(250,204,21,.95);background:repeating-linear-gradient(-45deg,rgba(250,204,21,.22),rgba(250,204,21,.22) 10px,rgba(250,204,21,.06) 10px,rgba(250,204,21,.06) 20px)}
    .${ROOT}-preview{background:rgba(244,114,182,.2);border:2px dashed rgba(244,114,182,.95);border-radius:8px}
  `;
  document.head.appendChild(style);

  const ui = document.createElement("div");
  ui.id = `${ROOT}-ui`;
  ui.innerHTML = `
    <h1>BNM Level Builder</h1>
    <p id="${ROOT}-status">Tool: platform</p>
    <p>Click-drag for platforms. Click for crates/start/finish. Right click erase.</p>
    <div id="${ROOT}-fields">
      <label>Level Name<input id="${ROOT}-name" value="Custom Level"></label>
      <label>Speed<input id="${ROOT}-speed" type="number" min="80" value="255"></label>
      <label>Jump<input id="${ROOT}-jump" type="number" min="160" value="540"></label>
      <label>Height<input id="${ROOT}-height" type="number" min="1200" value="${level.height}"></label>
    </div>
    <div id="${ROOT}-buttons">
      <button class="${ROOT}-btn" data-tool="platform">Platform</button>
      <button class="${ROOT}-btn" data-tool="crate">Crate</button>
      <button class="${ROOT}-btn" data-tool="start">Start</button>
      <button class="${ROOT}-btn" data-tool="finish">Finish</button>
      <button class="${ROOT}-btn" data-tool="erase">Erase</button>
      <button class="${ROOT}-btn" data-action="play">Play</button>
      <button class="${ROOT}-btn" data-action="save">Save .bnm</button>
      <button class="${ROOT}-btn" data-action="load">Load .bnm</button>
      <button class="${ROOT}-btn" data-action="reset">Reset</button>
    </div>
  `;
  const blank = document.createElement("div");
  blank.id = `${ROOT}-blank`;
  const world = document.createElement("div");
  world.id = `${ROOT}-world`;
  document.body.append(blank, world, ui);

  const snap = (value) => Math.round(value / 20) * 20;
  const worldPoint = (event) => ({ x: snap(event.clientX + scrollX), y: snap(event.clientY + scrollY) });

  const refreshButtons = () => {
    ui.querySelector(`#${ROOT}-status`).textContent = `Tool: ${state.tool}`;
    ui.querySelectorAll("[data-tool]").forEach((button) => button.classList.toggle(`${ROOT}-active`, button.dataset.tool === state.tool));
  };

  const render = () => {
    level.name = ui.querySelector(`#${ROOT}-name`).value || "Custom Level";
    level.settings = level.settings || { speed: 255, jump: 540 };
    level.settings.speed = Math.max(80, Number(ui.querySelector(`#${ROOT}-speed`).value) || 255);
    level.settings.jump = Math.max(160, Number(ui.querySelector(`#${ROOT}-jump`).value) || 540);
    level.height = Math.max(1200, Number(ui.querySelector(`#${ROOT}-height`).value) || level.height);
    world.style.width = `${level.width}px`;
    world.style.height = `${level.height}px`;
    world.innerHTML = "";

    level.platforms.forEach((platform, index) => {
      const el = document.createElement("div");
      el.className = `${ROOT}-platform`;
      el.dataset.kind = "platform";
      el.dataset.index = String(index);
      el.style.left = `${platform.x}px`;
      el.style.top = `${platform.y}px`;
      el.style.width = `${platform.width}px`;
      el.style.height = `${platform.height}px`;
      world.appendChild(el);
    });

    level.crates.forEach((crate, index) => {
      const el = document.createElement("div");
      el.className = `${ROOT}-crate`;
      el.dataset.kind = "crate";
      el.dataset.index = String(index);
      el.style.left = `${crate.x}px`;
      el.style.top = `${crate.y}px`;
      world.appendChild(el);
    });

    const start = document.createElement("div");
    start.className = `${ROOT}-start`;
    start.dataset.kind = "start";
    start.style.left = `${level.start.x}px`;
    start.style.top = `${level.start.y}px`;
    world.appendChild(start);

    const finish = document.createElement("div");
    finish.className = `${ROOT}-finish`;
    finish.dataset.kind = "finish";
    finish.style.left = `${level.finish.x}px`;
    finish.style.top = `${level.finish.y}px`;
    finish.style.width = `${level.finish.width}px`;
    finish.style.height = `${level.finish.height}px`;
    world.appendChild(finish);

    if (state.preview) {
      const preview = document.createElement("div");
      preview.className = `${ROOT}-preview`;
      preview.style.left = `${state.preview.x}px`;
      preview.style.top = `${state.preview.y}px`;
      preview.style.width = `${state.preview.width}px`;
      preview.style.height = `${state.preview.height}px`;
      world.appendChild(preview);
    }
  };

  const saveFile = () => {
    const blob = new Blob([JSON.stringify(level, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(level.name || "level").replace(/[^\w-]+/g, "-").toLowerCase() || "level"}.bnm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".bnm,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const parsed = JSON.parse(await file.text());
      Object.assign(level, parsed);
      ui.querySelector(`#${ROOT}-name`).value = level.name || "Custom Level";
      ui.querySelector(`#${ROOT}-speed`).value = String(level.settings?.speed || 255);
      ui.querySelector(`#${ROOT}-jump`).value = String(level.settings?.jump || 540);
      ui.querySelector(`#${ROOT}-height`).value = String(level.height || 5600);
      render();
    });
    input.click();
  };

  const playLevel = () => {
    if (!window.PageClimber?.loadLevel) {
      alert("Run pageclimber.js first, then use Play.");
      return;
    }
    window.PageClimber.loadLevel(level);
  };

  ui.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tool = button.dataset.tool;
      refreshButtons();
    });
  });

  ui.querySelector("[data-action='play']").addEventListener("click", playLevel);
  ui.querySelector("[data-action='save']").addEventListener("click", saveFile);
  ui.querySelector("[data-action='load']").addEventListener("click", loadFile);
  ui.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
  ui.querySelector("[data-action='reset']").addEventListener("click", () => {
    level.platforms = [];
    level.crates = [];
    level.start = { x: 40, y: level.height - 120 };
    level.finish = { x: 100, y: 80, width: Math.max(160, innerWidth - 200), height: 18 };
    level.settings = { speed: 255, jump: 540 };
    ui.querySelector(`#${ROOT}-name`).value = "Custom Level";
    ui.querySelector(`#${ROOT}-speed`).value = "255";
    ui.querySelector(`#${ROOT}-jump`).value = "540";
    ui.querySelector(`#${ROOT}-height`).value = String(level.height);
    render();
  });

  document.addEventListener("contextmenu", (event) => {
    if (!world.contains(event.target)) return;
    event.preventDefault();
  }, true);

  document.addEventListener("mousedown", (event) => {
    if (event.target.closest(`#${ROOT}-ui`)) return;
    const point = worldPoint(event);
    if (event.button === 2 || state.tool === "erase") {
      const platformIndex = level.platforms.findIndex((platform) => point.x >= platform.x && point.x <= platform.x + platform.width && point.y >= platform.y && point.y <= platform.y + platform.height);
      if (platformIndex >= 0) {
        level.platforms.splice(platformIndex, 1);
        return render();
      }
      const crateIndex = level.crates.findIndex((crate) => point.x >= crate.x && point.x <= crate.x + 20 && point.y >= crate.y && point.y <= crate.y + 20);
      if (crateIndex >= 0) {
        level.crates.splice(crateIndex, 1);
        return render();
      }
      return;
    }
    if (state.tool === "platform") {
      state.dragging = true;
      state.dragStart = point;
      state.preview = { x: point.x, y: point.y, width: 20, height: 20 };
      return render();
    }
    if (state.tool === "crate") {
      level.crates.push({ x: point.x, y: point.y, width: 20, height: 20 });
      return render();
    }
    if (state.tool === "start") {
      level.start = { x: point.x, y: point.y };
      return render();
    }
    if (state.tool === "finish") {
      level.finish = { x: point.x, y: point.y, width: Math.max(160, innerWidth - 200), height: 18 };
      return render();
    }
  }, true);

  document.addEventListener("mousemove", (event) => {
    if (!state.dragging || !state.dragStart) return;
    const point = worldPoint(event);
    state.preview = {
      x: Math.min(point.x, state.dragStart.x),
      y: Math.min(point.y, state.dragStart.y),
      width: Math.max(20, Math.abs(point.x - state.dragStart.x)),
      height: Math.max(20, Math.abs(point.y - state.dragStart.y))
    };
    render();
  }, true);

  document.addEventListener("mouseup", () => {
    if (!state.dragging || !state.preview) return;
    level.platforms.push({ ...state.preview });
    state.dragging = false;
    state.dragStart = null;
    state.preview = null;
    render();
  }, true);

  const destroy = () => {
    blank.remove();
    ui.remove();
    world.remove();
    style.remove();
    delete window.PageClimberBuilder;
  };

  refreshButtons();
  render();

  window.PageClimberBuilder = {
    level,
    render,
    saveFile,
    loadFile,
    playLevel,
    destroy
  };
})();
