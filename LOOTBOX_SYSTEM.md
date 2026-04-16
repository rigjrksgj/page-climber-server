# 🎁 Lootbox & Weapon Addon System

## Overview
Implemented a complete CS-GO-style lootbox system where players collect lootboxes while climbing, open them with animated reveals, and use weapon addons in the weapon builder.

---

## ✨ New Features

### 1. **Lootbox Collection** (pageclimber.js)
- When players hit crates, they now get **lootboxes** (instead of instant items)
- Three rarity tiers:
  - `standard` → 1 addon reward
  - `rare` → 2 addon rewards  
  - `epic` → 3 addon rewards

### 2. **Lootbox Opening Animation**
- **CS-GO-style spinning wheel UI**
- Shows all possible rewards rotating with highlight
- 3.5 second animated opening sequence
- Auto-closes and applies rewards when complete
- Called via `openLootbox(lootboxId)`

### 3. **Weapon Addons** (24 types available)
Available addon types with stat bonuses:
- **Sights**: Laser Sight, Red Dot, Thermal Scope, Rifleman Scope, Fiber Optic, Holographic, ACOG
- **Grips**: Foregrip, Vertical Grip, Angled Grip, Bipod
- **Muzzles**: Suppressor, Muzzle Brake, Flash Hider, Compensator
- **Stocks**: Tactical Stock, Sniper Stock, Collapsible Stock
- **Handguards**: Quad Rail, Picatinny Rail, M-Lok
- **Magazines**: Extended Mag, Drum Mag, Fast Mag

Each addon has:
- Unique name
- Rarity tier (common, uncommon, rare, epic)
- Stat modifier type (accuracy, range, damage, fireRate, recoil, etc.)
- Value to apply

### 4. **Inventory System** (pageclimber.js)
Enhanced inventory panel with three sections:
- **🎁 Lootboxes** - Shows collected boxes with rarity, [OPEN] buttons
- **🔧 Weapon Addons** - Displayscollected addons with stats, [DELETE] buttons
- **Items** - Original items system (unchanged)

### 5. **Weapon Builder Integration** (weapon-builder.js)
New **🔧 Addons** tab showing:
- **Available Addons** - All collected addons from Page Climber
- **Applied Addons** - Currently active addons affecting weapon stats
- Real-time stat calculation as addons are applied/removed

#### Addon Application
- Click [APPLY] to add addon to weapon and boost stats
- Click [REMOVE] to revert addon and its stat bonuses
- Stats automatically update (damage +5, range +50, etc.)
- Addons persist in weapon export

---

## 📊 Data Structures

### Player State (localStorage: "page-climber-save-v2")
```javascript
{
  lootboxes: [
    { id: "...", type: "standard"|"rare"|"epic", collectedAt: timestamp },
    ...
  ],
  addons: [
    { 
      id: "...", 
      name: "Laser Sight",
      stat: "accuracy",
      value: 5,
      rarity: "common",
      unlockedAt: timestamp 
    },
    ...
  ]
}
```

### Weapon Builder State
```javascript
{
  appliedAddons: [addon objects],
  // All addon stat effects are applied to stats object in real-time
}
```

---

## 🎮 User Flow

### Collecting & Opening
1. Player climbs and hits crate on platform
2. Lootbox added to inventory (standard/rare/epic)
3. Player opens Inventory panel → 🎁 Lootboxes section
4. Clicks [OPEN] → CS-GO style spinning animation plays
5. Animation completes → Addons added to 🔧 Weapon Addons section

### Using in Weapon Builder
1. Open weapon builder from multiplayer panel
2. Click 🔧 Addons tab
3. View all collected addons from Page Climber
4. Click [APPLY] on desired addon
5. Addon moves to "Applied Addons" section
6. Weapon stats automatically increase/decrease
7. Export .wpn file includes applied addons

---

## 🔧 Key Functions

### pageclimber.js
- `openCrate(crate)` - Spawns lootbox instead of instant item
- `openLootbox(lootboxId)` - Opens animation and generates rewards
- `showLootboxOpening(lootboxId, count, onComplete)` - Creates modal with spinning wheel
- `getRandomAddon()` - Generates random addon with weighted rarity
- `openPanel("inventory")` - Re-renders inventory with addons sections

### weapon-builder.js
- `loadAddons()` - Reads addons from Page Climber localStorage
- `applyAddon(addon)` - Applies addon stat bonuses to weapon
- `tabContent.addons()` - Renders addons tab with apply/remove buttons
- Event listeners for [APPLY] and [REMOVE] buttons

---

## 💾 Data Persistence

- **Addons stored in**: `localStorage["page-climber-save-v2"].addons[]`
- **Applied addons stored in**: Weapon builder state (exported with .wpn file)
- **Lootboxes cleared on open** - Converted to addons
- **Addons persistent** - Survive page refreshes, available in weapon builder anytime

---

## 🎨 UI/UX Enhancements

### Lootbox Opening Animation
```css
@keyframes spin-wheel {
  0% { rotate: 0deg; scale: 0.8; opacity: 0; }
  50% { rotate: 3600deg; scale: 1; opacity: 1; }
  100% { rotate: 3630deg; scale: 1; opacity: 1; }
}
```
- Modal overlay with semi-transparent background
- Colored gradient spinning wheel
- Items popup around edges
- 3.5 second total duration

### Addon Display
- Color-coded rarity backgrounds (red/blue/green)
- Stat bonuses clearly labeled
- Delete/Remove buttons for management
- Applied addons highlighted green

---

## 🚀 Future Enhancements

- [ ] Addon rarity affects stats more significantly
- [ ] Lootbox crafting/combining
- [ ] Seasonal limited addons
- [ ] Addon trading between players
- [ ] Special boss drop crates with unique addons
- [ ] Addon stat presets for weapon types
- [ ] Addon display on weapon preview

---

## ⚙️ Installation Notes

All changes integrated into existing files:
- `pageclimber.js` - Lootbox system + inventory UI
- `weapon-builder.js` - Addon tab + application system
- `server.js` - *No changes needed (backward compatible)*

No new dependencies or breaking changes!
