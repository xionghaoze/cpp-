# CLAUDE.md

## Project Overview

**阻止传送 (Block Transmission)** — An HTML5 tower defense game built with Pixi.js and TypeScript. Can be packaged as a desktop app via Electron or as a mobile app via WebView.

- **Language**: TypeScript (target ES6, module ES6)
- **Node version**: 12.22.7 (original dev environment)
- **Package manager**: yarn

## Commands

```bash
# Install dependencies
yarn

# Run development server (port 9001, host 0.0.0.0)
npm run dev          # alias for npm run serve
npm run serve        # webpack serve --mode=development

# Production build
npm run build        # webpack production + copy static resources

# Watch mode
npm run watch        # webpack --watch

# Generate docs
npm run doc          # node build/docs.js && typedoc

# Specific sub-projects
npm run devgen       # Game data generator (webpack.config.gen.js)
npm run devplist     # Plist viewer (webpack.config.plist.js)
npm run devtiled     # Map/tiled editor (webpack.config.tiled.js)

npm run build:devplist   # Build plist viewer
npm run build:devtiled   # Build map editor
```

## Architecture

### Entry Points (under `example/`)

| Directory | Purpose | Webpack Config |
|---|---|---|
| `example/example/` | Main game | `webpack.config.js` |
| `example/editTiledmap/` | Map/tile editor | `webpack.config.tiled.js` |
| `example/examplegen/` | gameData.bin generator | `webpack.config.gen.js` |
| `example/seePlist/` | Plist file viewer | `webpack.config.plist.js` |

### Source Structure (`src/`)

```
src/
├── core/           # Core engine (Main class, GameMain)
│   ├── main.ts     # Central Main class — extends Msg (event system). Manages PIXI.Application, scenes, game loop, UI mounting
│   └── gameMain.ts # Game-specific main subclass
├── class/          # Core game entity classes
│   ├── message.ts      # Event/message bus base class (on/off/emit pattern)
│   ├── role.ts         # Role/character class (21KB — large, complex)
│   ├── bullet.ts       # Bullet/projectile class
│   ├── gun.ts          # Gun/weapon class
│   ├── goods.ts        # Goods/items class
│   ├── behaviorTree.ts # Behavior tree system
│   ├── tiledmap.ts     # Tile map rendering
│   ├── openApi.ts      # Scripting/open API (13KB)
│   ├── passive.ts      # Passive attributes/skills system
│   ├── camera.ts       # Camera (WIP)
│   ├── gameMenu.ts     # In-game menu
│   ├── task.ts         # Task/quest manager (mostly unused)
│   └── gameObject/     # Base game object hierarchy
│       ├── base.ts         # Base types (Base, Color, Point, Time)
│       ├── gameObject.ts   # Core GameObject
│       ├── dumpObject.ts   # Dynamic object
│       └── sportBase.ts    # Moving/sports object
├── gameClass/      # Game-specific classes (this tower defense game)
│   ├── enemy.ts         # Enemy class
│   ├── tower.ts         # Tower class
│   ├── spawnEnemies.ts  # Enemy wave spawning
│   ├── sceneUtils.ts    # Scene utilities (14KB — large)
│   └── processDialog.ts # Dialog processing
├── utils/          # Utility classes
│   ├── AStar.ts         # A* pathfinding
│   ├── enum.ts          # Enums (EVENT_TYPE, etc.)
│   ├── types.ts         # TypeScript interfaces/types
│   ├── utils.ts         # General utilities
│   ├── utilsPro.ts      # Extended game utilities (58KB — very large, core logic)
│   ├── plist.ts         # Plist file loader plugin for Pixi
│   ├── spine.ts         # Spine version compatibility
│   ├── TextMetrics.ts   # Custom text rendering (WIP)
│   └── defaultTypeEx.ts # Default type extensions
├── ui/             # UI components
│   ├── scene.ts, map.ts, roleui.ts
│   ├── towerSelect.ts, controlIcon.ts
│   ├── selectLevel.ts, timeTooltip.ts, resShow.ts
│   ├── scrollbox.ts
│   └── dialogPannel/index.ts
├── dialog/         # Win/lose dialogs
├── behavior/       # Behavior tree implementations
├── defaultData/    # Default values for scenes, mods, saves, terrain, etc.
├── view/           # Menu views (mostly unused)
├── css/            # Stylesheets
└── test/           # Test files
```

### Key Patterns

- **Event system**: `message.ts` provides an `on`/`off`/`emit` pattern. The `Main` class (and many others) extend `Msg` to inherit event capabilities. Events are typed via `EVENT_TYPE` enum in `utils/enum.ts`.
- **Game loop**: `Main` class manages the PIXI.Application ticker. `_lapseTime` tracks game time. Once-tick callbacks are managed via `onceTickId`/`onceTickCall`.
- **UI mounting**: UI components are registered in `UI_STRUCT` and mounted/destroyed through the Main class lifecycle.
- **Scene system**: Scenes are loaded with options defined in `types.ts` (`SCENE_LOAD_OPTION`). The game supports multiple scenes with camp-based factions (`CAMP`).
- **Resource loading**: Game data (spine animations, config) is bundled into `public/gameData/gameData.bin`. The `examplegen` sub-project generates this binary.

## Key Libraries

| Library | Purpose |
|---|---|
| `pixi.js@6.5.9` | 2D WebGL rendering engine |
| `pixi-spine@3.0.13` | Spine animation runtime (with custom version compatibility) |
| `@pixi/sound@^4.3.3` | Audio management |
| `pixi-filters@4.2.0` | Shader filters (blur, distortion, outline) |
| `intersects@2.7.2` | Math collision detection |
| `lodash@4.17.20` | Deep/shallow copy utilities |
| `@zip.js/zip.js@2.4.10` | Zip compression for resource packaging |

## Static Resources (`public/`)

```
public/
├── audio/          # Sound files
├── gameData/       # Game configuration & data
│   ├── config.json
│   ├── gameData.bin    # Bundled spine + base object data
│   ├── actor/          # Character dialogue JSON (zh.json)
│   ├── lang/           # i18n (zh.json)
│   └── mod/            # Mod system (res.json)
├── img/            # Images
├── plist/          # Plist sprite sheets
├── scene/          # Scene/map data
└── script/         # Core runtime JS (core.js)
```

## Electron Packaging (`eleBuild/`)

The `eleBuild/` directory contains Electron packaging config. It should be copied out to its own directory and built separately (see `build注意.txt`). Uses `@electron-forge` for packaging.

## Code Style

- ESLint with TypeScript plugin (`@typescript-eslint/*@5.33.1`)
- Prettier for formatting
- ESLint config: `standard@17.0.0` with `prettier` integration
- `strictNullChecks: false` in tsconfig (null safety is relaxed)
- `noImplicitAny: false` (implicit any allowed)

## Important Notes

- Scene IDs must be unique — duplicates will cause resize issues
- The project was originally developed with Node 12 and cnpm (Chinese npm mirror: `https://registry.npmmirror.com/`)
- The `src/utils/utilsPro.ts` file is very large (58KB) and contains much of the core game logic — refactor with caution
- `gameData.bin` is generated by the `examplegen` sub-project, not created manually
- `gameData.bin` format: XOR-encrypted (`key: [104,104,115,106]` = "hhsj") ZIP file containing a single password-protected JSON (`password: "No.1129754"`)

## Enemy Difficulty Tuning

**`modifyEnemyStats.js`** — CLI tool to modify enemy stats in `gameData.bin`:
```bash
node modifyEnemyStats.js        # Default: 2x HP, 1.5x DEF
node modifyEnemyStats.js 1.5    # 1.5x HP
node modifyEnemyStats.js 3.0    # 3x HP
node modifyEnemyStats.js --reset  # Restore from backup
```

**`modifyEnemyStats.html`** — Browser-based GUI tool (open in browser, load `public/gameData/gameData.bin`, adjust sliders, download modified version).

Enemy attributes stored in `gameData.bin` → `roles` section:
- `maxPH` (default 100) — maximum health. Bullets deal `tower.hurt` damage directly (no defense reduction in current code)
- `defense` (default 5) — defense. **Currently not used in damage calculation** (bullet.ts:307-317 does `p2.hurt` damage without defense reduction)
- `hurt` (default varies) — enemy attack damage
- `fireInterval` — attack cooldown (ms)
- `warnRange` — detection range (px radius)

Also configurable via scene files (`public/scene/allLevel/*.json`):
- `enemyWaves[].count` — enemies per wave
- `enemyWaves[].createTime` — wave spawn interval
- `config.json` → `initGold`, `initHealth` — player starting resources
