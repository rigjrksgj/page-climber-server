# Page Climber Prototype

This is a starter for a browser-console platformer that turns webpage elements into platforms. The player starts near the bottom of the page and climbs toward the top, can pass upward through the underside of elements, can drop down through a platform with `S`, can open loot crates, unlock achievements, and earn skins.

## What It Does

- Runs as plain JavaScript on a webpage.
- Builds one-way platforms from visible DOM elements and smaller subelements.
- Adds a player with movement, jumping, gravity, and camera follow.
- Adds run and jump animation plus a highlight on the platform you are standing on.
- Spawns loot crates with a 100-item pool.
- Saves stats, upgrades, achievements, and unlocked skins.
- Adds inventory, achievements, and skins panels.
- Adds custom level loading from `.bnm` files.
- Lets you break links by landing on them repeatedly and then travel to that page.
- Supports save export/import so progress can move between websites.

## Important Limitation

If you run code manually in the browser console, each website gets its own storage. That means:

- `localStorage` works on the current site.
- It does **not** automatically carry over to other domains.

For cross-site progression you have 3 practical options:

1. Use the built-in `PageClimber.exportSave()` and `PageClimber.importSave(payload)` methods.
2. Turn this into a userscript with Tampermonkey and use userscript storage.
3. Turn this into an extension or backend-backed game if you want seamless global sync.

## Run It

Open any webpage, open DevTools, paste the contents of [`pageclimber.js`](C:\Users\dsadmin\Documents\New project\pageclimber.js), and press Enter.

Controls:

- `A / D` or arrow keys: move
- `Space`, `W`, or `ArrowUp`: jump
- Jump while sliding against a wall: wall jump
- `S` or `ArrowDown`: drop through your current platform
- `E`: open nearby crate
- `I`: inventory
- `J`: achievements
- `K`: skins
- `L`: levels

Useful commands:

```js
PageClimber.exportSave()
PageClimber.importSave("PASTE_EXPORT_STRING")
PageClimber.listAchievements()
PageClimber.listSkins()
PageClimber.setSkin("ember")
PageClimber.openPanel("achievements")
PageClimber.pickLevelFile()
PageClimber.loadLevel(levelObjectOrJson)
PageClimber.clearLevel()
PageClimber.connectMultiplayer("ws://localhost:8787", "room-name")
PageClimber.disconnectMultiplayer()
PageClimber.secret("cloud")
PageClimber.destroy()
```

## Level Builder

There is also a separate builder script at [`pageclimber-builder.js`](C:\Users\dsadmin\Documents\New project\pageclimber-builder.js).

Use it on any page after or before the main game:

1. Paste the builder script into the console.
2. The page is covered with a blank large canvas so you are building on a clean map.
3. Use the tool buttons to place platforms, crates, start, and finish.
4. Set the level name, character speed, character jump, and map height in the builder panel.
5. Click `Save .bnm` to download a level file.
6. In the main game, press `L` or run `PageClimber.pickLevelFile()` to load that `.bnm` file.
7. If the main game is already running, click `Play` in the builder to send the level directly into the game.

`.bnm` files are JSON-based level files used by this project.
When a `.bnm` level is loaded in the main game, the page is visually blanked and the level blocks are rendered so you only see the map.

## Page Changes

If you jump to another page, pasted console code does not automatically execute again on the new page. That is a browser limitation.

For truly automatic relaunch across pages, use one of these:

1. Convert the game into a bookmarklet for one-click launch.
2. Convert it into a userscript with Tampermonkey.
3. Make it a browser extension.

## Multiplayer Prototype

There is now a simple WebSocket multiplayer prototype.

Files:

- [`multiplayer-server.js`](C:\Users\dsadmin\Documents\New project\multiplayer-server.js)
- [`package.json`](C:\Users\dsadmin\Documents\New project\package.json)

Setup:

1. In this project folder, run `npm install`.
2. Start the server with `npm run start:server`.
3. In the browser console after loading the game, run:

```js
PageClimber.connectMultiplayer("ws://localhost:8787", "test-room")
```

4. Open the same room on another browser window or another machine using the same server URL and room name.

What this first version does:

- Shows other connected players as live moving avatars.
- Syncs player position, skin color, and room membership.

What it does not do yet:

- Shared crates or achievements
- Reliable race countdowns
- Anti-cheat or authority checks
- Cross-internet hosting setup

## Good Next Steps

- Replace the generated 100-item pool with handcrafted items and rarities.
- Add enemies, moving platforms, and boss achievements.
- Convert it to a userscript so it loads on every page automatically.
- Add a real achievements panel and inventory UI.
