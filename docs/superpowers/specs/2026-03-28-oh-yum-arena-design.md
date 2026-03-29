# OH-YUM ARENA — Game Design Specification

## Overview

A top-down 2D arena dogfight game built with Phaser 3, TypeScript, and Vite. The player is a pilot from Utah, USA, Earth who competes in the OH-YUM Arena — the galaxy's most legendary combat tournament — to reclaim the stolen Tesla Cybertruck.

**Genre:** Arena dogfight, solo vs AI, arcade combat
**Platform:** Browser (desktop)
**Stack:** Phaser 3 · TypeScript · Vite

---

## Visual Direction

Star Wars-inspired cinematic blockbuster aesthetic:

- **Ships:** Weathered mechanical hulls with panel seams, rivet rows, greeble blocks, scorch marks, and specular highlights. Canvas-rendered at boot, converted to Phaser sprite sheets (hybrid approach).
- **Weapons:** Discrete red/green laser bolts (not beams). Homing missiles with orange smoke trails. Plasma lances. Screen-clearing bomb shockwaves.
- **Explosions:** Fiery orange-amber with billowing smoke, hot shrapnel, flying sparks, fire tendrils. Not clean energy bursts.
- **Engines:** Warm orange-yellow thruster flames with heat distortion ripples.
- **Space:** Deep dark void, subtle nebula, dense procedural starfield with diffraction spikes on bright stars.
- **HUD:** Targeting computer style — deflector/hull bars, target info with class/range/bearing, weapon readout, radar scope. Monospace font, amber/cyan palette, subtle flicker.
- **Resolution:** High-detail canvas rendering. Ships drawn with layered geometry, not simple polygons. Target: visually impressive at 1080p+.

---

## Game Structure & Progression

### The Ladder

16 named AI opponents in linear progression. Beat opponent N to unlock N+1.

### Match Structure

- 1v1 fights in a tight single-screen arena
- Win: reduce enemy hull to 0
- Lose: your hull hits 0 → retry that opponent (no permadeath)
- Weapon pickups spawn randomly mid-fight on a timer (every 8-12 seconds)
- Target match duration: 60-120 seconds

### Between Fights

Hangar screen showing:
- Your ship with Utah flag decal
- Next opponent's dossier (name, ship, homeworld, fighting style description)
- Weapon loadout preview
- Comms from your mechanic back in Utah

### Scoring

- **Damage points:** 10 points per damage dealt to enemy hull
- **Pickup bonus:** 200 points per pickup collected
- **Time bonus:** `max(0, 5000 - floor(elapsedSeconds) * 50)` — rewards fast wins, max 5000 for instant kill, 0 after 100 seconds
- **Win bonus:** 1000 flat points per victory
- Running total across the ladder
- Per-opponent high score tracking
- No currency or upgrade system — pure skill + pickup luck

---

## Physics & Ship Controls

### Movement

- Newtonian thrust: force applied in facing direction
- Rotation: left/right at ~180°/sec
- Light drag: time-based exponential decay (half-life ~1.5s). Applied per fixed physics step at 60Hz, independent of render frame rate.
- Max velocity cap: 400 units/sec
- Controls: WASD or arrow keys. Thrust = W/Up, Rotate = A/D or Left/Right, Fire = Space, Special Weapon = Shift

### Arena

- Hard walls — bounce off with spark effect and minor hull damage
- Arena equals the viewport (1280x720). Camera is fixed, no scrolling or zoom. The entire fight is always visible.
- Subtle border: faint grid lines or asteroid ring along the edges

### Collision

- Ship-to-ship: both take damage proportional to relative velocity, knockback applied
- Hitboxes: simplified convex polygons, not pixel-perfect

### Feel Targets

- Rotation: fast, responsive (~180°/sec)
- Thrust: cross arena in ~2 seconds at full burn
- Goal: "arcade fighter pilot" — nimble and dangerous

---

## Weapons & Pickups

### Starting Loadout (every fight)

**OH-YUM Blaster** — fires 2 red bolts simultaneously (parallel, spaced ~8px apart from ship center), unlimited ammo, moderate fire rate (150ms between volleys).

### Pickup Weapons (timed spawn, limited ammo)

| Weapon | Behavior | Ammo | Visual |
|--------|----------|------|--------|
| OH-YUM Homing Missiles | Auto-locks nearest enemy (or Warden over drones), tracks with turn rate | 4 | Orange smoke trail |
| OH-YUM Scatter Shot | Wide 5-bolt spread, short range | 8 | Red bolt fan |
| OH-YUM Plasma Lance | Powerful single bolt (large, fast), bypasses shields dealing hull damage directly | 2 | Bright cyan oversized bolt with glow trail |
| OH-YUM Bomb | Screen-clearing shockwave | 1 | Expanding white ring |

### Defensive Pickup

**OH-YUM Shield Boost** — restores 25% deflector shield. Rarer spawn.

### Pickup Rules

- Pickups materialize at random arena positions every 8-12 seconds
- Floating crate with a glow — fly through to collect
- Only one special weapon held at a time (replaces previous)
- HUD shows current special + ammo count

### Damage Pipeline

1. Incoming damage hits **shields first**. Shield absorbs up to its remaining value.
2. Any overflow damage passes through to **hull**.
3. If shields are at 0, all damage goes directly to hull.
4. **OH-YUM Plasma Lance** bypasses shields entirely — all damage applied to hull.
5. Shields regenerate at `SHIELD_REGEN_RATE` per second after `SHIELD_REGEN_DELAY` ms of not taking damage.
6. Hull does not regenerate.
7. All AI opponents have shields and hull. Per-opponent values defined in the stat table below.

---

## AI Opponents & the Ladder

### Rounds 1-4: Rookie Tier

1. **Rusty** — Slow, predictable, barely fires. Tutorial fight.
2. **Flicker** — Erratic movement, poor aim. Teaches dodging.
3. **Needles** — Fast but fragile. Teaches leading shots.
4. **Brickwall** — Tanky, slow, heavy hitter. Teaches kiting.

### Rounds 5-8: Contender Tier

5. **Viper** — Balanced, uses pickups aggressively.
6. **Sideswipe** — Rams deliberately, high collision damage.
7. **Ghost** — Constant strafing, hard to pin down.
8. **Barrage** — Fires in bursts, favors scatter shot.

### Rounds 9-12: Elite Tier

9. **Sigma-7** — Precise aim, hangs at range with plasma lance.
10. **Havoc** — Chaotic, uses bombs, unpredictable patterns.
11. **Mirage** — Feints approach then flanks, smart positioning.
12. **Ironclad** — Heavy shields, absorbs punishment, counter-attacks.

### Rounds 13-15: Champion Tier

13. **Eclipse** — Near-perfect aim, fast rotation, aggressive.
14. **Nemesis** — Adapts to player's style mid-fight.
15. **Void** — Uses arena edges, traps player in corners.

### Round 16: Final Boss

16. **The Warden** — Guards the Tesla Cybertruck.
    - Phase 1: Standard combat, balanced stats.
    - Phase 2 (50% hull): Deploys drone wingmen.
    - Phase 3 (20% hull): Berserk — rapid-fire + homing missiles simultaneously.
    - Defeat → Cybertruck unlocked.

### Opponent Stats

Player reference: Hull 100, Shield 50, Speed 1.0x, Rotation 1.0x, Aim accuracy ~70%

| # | Name | Hull | Shield | Speed | Rotation | Aim | Notes |
|---|------|------|--------|-------|----------|-----|-------|
| 1 | Rusty | 60 | 0 | 0.5x | 0.5x | 20% | No shield, slow |
| 2 | Flicker | 60 | 10 | 0.8x | 1.2x | 25% | Erratic movement |
| 3 | Needles | 40 | 20 | 1.3x | 1.0x | 35% | Glass cannon |
| 4 | Brickwall | 140 | 30 | 0.4x | 0.4x | 40% | Tank |
| 5 | Viper | 80 | 30 | 1.0x | 1.0x | 50% | Balanced |
| 6 | Sideswipe | 120 | 20 | 1.1x | 0.8x | 40% | High collision dmg (2x) |
| 7 | Ghost | 70 | 40 | 1.2x | 1.3x | 50% | Evasive |
| 8 | Barrage | 80 | 30 | 0.9x | 0.9x | 55% | Burst fire pattern |
| 9 | Sigma-7 | 80 | 40 | 0.8x | 0.8x | 75% | Sniper |
| 10 | Havoc | 90 | 30 | 1.0x | 1.0x | 50% | Uses bombs |
| 11 | Mirage | 75 | 45 | 1.1x | 1.2x | 60% | Flanker |
| 12 | Ironclad | 120 | 70 | 0.7x | 0.6x | 55% | Shield tank |
| 13 | Eclipse | 90 | 50 | 1.2x | 1.3x | 80% | Aggressive |
| 14 | Nemesis | 100 | 50 | 1.0x | 1.0x | 70% | Adapts mid-fight |
| 15 | Void | 100 | 60 | 1.1x | 1.1x | 75% | Positional |
| 16 | The Warden | 200 | 80 | 1.0x | 1.0x | 70% | Multi-phase boss |

Speed/Rotation are multipliers relative to player values. Aim is probability of leading shots correctly.

### The Warden — Drone Specification

Phase 2 (triggered at 50% hull) deploys **2 drone wingmen**:
- Hull: 25 (no shield)
- Speed: 1.3x player (fast, harassment role)
- Weapon: single weak blaster (damage 3, fire rate 300ms)
- AI: simple chase-and-fire, no pickup seeking, no evasion
- Do not respawn if destroyed
- Destroying drones is not required to reach Phase 3 — The Warden transitions at 20% hull regardless
- Drones do not drop pickups
- Drones use a smaller, simpler ship design (wedge shape)

### AI Architecture

Each opponent has a behavior tree with weighted states:
- `idle` → `chase` → `attack` → `evade` → `seekPickup`
- State weights and transition triggers differ per opponent personality
- Higher-tier opponents have faster decision cycles, better aim prediction, and use more states

---

## Narrative & Setting

### Backstory

The player is a pilot from Utah, USA, Earth, Milky Way Galaxy. The OH-YUM Arena is the galaxy's most legendary combat tournament. The Tesla Cybertruck — a mythical vehicle from Earth — was stolen by arena champions and locked behind The Warden. Winning it back is personal.

### OH-YUM Branding Touchpoints

- **Title screen:** "OH-YUM ARENA" — tagline: "From Utah to the Stars"
- **Hangar screen:** OH-YUM Hangar, Utah Sector, Earth. Ship has Utah flag decal.
- **Pre-fight dossiers:** Player origin listed as "Utah, Earth, Milky Way"
- **Mechanic comms:** Utah-based mechanic radios encouragement between fights
- **Arena announcer:** References player as "The Utah Kid" or "Earth's Champion"
- **All weapons prefixed** with "OH-YUM" (OH-YUM Blaster, OH-YUM Homing Missiles, etc.)
- **Victory scene:** "Utah's own — OH-YUM Arena Champion"
- **Credits:** "A pilot from Utah conquered the stars. The OH-YUM legend lives on."

### The Cybertruck Prize

- Defeating The Warden triggers the OH-YUM Victory Sequence
- Screen fades to black → Tesla Cybertruck rotates center-screen, canvas-rendered in full angular detail
- Typewriter text: "CONGRATULATIONS, PILOT. YOU HAVE CONQUERED THE OH-YUM ARENA."
- Then: "THE LEGENDARY CYBERTRUCK IS YOURS."
- Victory fanfare music
- Credits roll over star field
- Post-game: Cybertruck replaces player ship in hangar. Exhibition matches can be fought piloting the Cybertruck (cosmetic only, same stats).

---

## Audio

### Music Tracks (5 total)

| Track | Where | Mood |
|-------|-------|------|
| Title Theme | TitleScene | Epic, orchestral, OH-YUM fanfare |
| Hangar Ambience | HangarScene | Calm, mechanical hum, radio chatter |
| Arena Combat | ArenaScene (rounds 1-15) | Intense, driving, uptempo |
| Warden Theme | ArenaScene (round 16) | Dark, ominous, escalating per phase |
| Victory Fanfare | VictoryScene | Triumphant, emotional, celebratory |

### Sound Effects

| SFX | Trigger |
|-----|---------|
| Blaster fire | OH-YUM Blaster shoots |
| Missile launch | Homing missile fires |
| Missile lock | Lock-on acquired tone |
| Scatter fire | Scatter shot fires |
| Plasma fire | Plasma lance fires (heavier) |
| Bomb deploy | Bomb placed |
| Bomb shockwave | Bomb detonates |
| Bolt impact | Bolt hits shield or hull |
| Shield hit | Damage absorbed by shield (higher pitch) |
| Hull hit | Damage to hull (crunch) |
| Shield down | Shield depleted warning |
| Explosion small | Minor ship damage |
| Explosion large | Ship destroyed |
| Pickup collect | Fly through crate |
| Pickup spawn | Crate materializes |
| Wall bounce | Ship hits arena wall |
| Thruster loop | Continuous while thrusting |
| Menu select | UI navigation |
| Round start | Fight begins countdown |
| Round win | Opponent destroyed |
| Round lose | Player destroyed |

Use royalty-free assets from itch.io, OpenGameArt, or Freesound. Placeholder silence is acceptable during development.

---

## Technical Architecture

### Rendering (Hybrid Approach)

1. Ships drawn to offscreen HTML5 canvases at boot using layered draw functions (hull, panels, rivets, greebles, weathering, canopy, engines, etc.)
2. Each ship rendered at 72 rotation angles (5° increments) × damage variants → output as Phaser sprite sheets
3. Runtime: Phaser sprites for ships, Phaser particle emitters for thrusters/bolts/explosions/pickups
4. Starfield + nebula rendered once to a static background texture
5. Sprite sheets cached in IndexedDB after first generation — subsequent boots skip rendering and load from cache. Cache invalidated by a version hash in ShipDefinitions.

### Scene Graph

```
BootScene        → generates ship sprite sheets, loads audio, shows loading bar
TitleScene       → "OH-YUM ARENA" logo, "From Utah to the Stars", start/continue
HangarScene      → ship view, opponent dossier, weapon preview, Utah comms
ArenaScene       → the fight: physics, AI, weapons, pickups, HUD, all gameplay
VictoryScene     → Cybertruck reveal, typewriter text, credits
```

### Systems

| System | Responsibility |
|--------|---------------|
| ShipRenderer | Canvas draw functions per ship design, outputs sprite sheets at boot |
| PhysicsSystem | Thrust, rotation, drag, velocity cap, wall bounce, collision detection |
| WeaponSystem | Bolt spawning, homing logic, spread patterns, bomb shockwave, ammo tracking |
| PickupSystem | Timed spawns, crate entities, collection detection, weapon replacement |
| AISystem | Per-opponent behavior trees, state selection, aim prediction |
| DamageSystem | Hull/shield tracking, i-frames, knockback, hit sparks, death |
| HUDSystem | Deflector/hull bars, target info, weapon status, radar, targeting brackets |
| LadderSystem | Progression state, unlock tracking, score, save/load |

### Game State

```ts
interface GameState {
  currentOpponent: number;      // 0-15 ladder position
  score: number;
  highScores: number[];         // per-opponent best, length 16
  ladderDefeated: boolean[];    // which opponents beaten, length 16
  cybertruckUnlocked: boolean;
  settings: {
    sfxVolume: number;
    musicVolume: number;
    screenShake: boolean;
  };
}
```

Persisted via `localStorage` JSON serialization.

### File Structure

```
src/
├── main.ts                         # Phaser game config, scene registration
├── config.ts                       # Constants (physics, damage, timing)
├── state/
│   └── GameState.ts                # Singleton state manager, save/load
├── scenes/
│   ├── BootScene.ts                # Ship generation, asset loading
│   ├── TitleScene.ts               # OH-YUM ARENA title screen
│   ├── HangarScene.ts              # Between-fight: dossier, loadout, comms
│   ├── ArenaScene.ts               # Core gameplay
│   └── VictoryScene.ts             # Cybertruck reveal + credits
├── ships/
│   ├── ShipRenderer.ts             # Canvas draw + sprite sheet generation
│   ├── ShipDefinitions.ts          # Data for all 17 ships (player + 16 enemies)
│   ├── ShipDrawHelpers.ts          # Shared: panels, rivets, greebles, weathering
│   └── CybertruckRenderer.ts      # Cybertruck canvas draw for victory + post-game
├── systems/
│   ├── PhysicsSystem.ts
│   ├── WeaponSystem.ts
│   ├── PickupSystem.ts
│   ├── AISystem.ts
│   ├── DamageSystem.ts
│   ├── HUDSystem.ts
│   └── LadderSystem.ts
├── entities/
│   ├── Ship.ts                     # Player + enemy ship entity
│   ├── Bolt.ts                     # Laser bolt projectile
│   ├── Missile.ts                  # Homing missile
│   ├── Pickup.ts                   # Weapon/shield crate
│   └── Explosion.ts                # Explosion particle controller
├── ai/
│   ├── AIBehavior.ts               # Base behavior interface
│   ├── behaviors/                  # One file per opponent personality
│   │   ├── RustyBehavior.ts
│   │   ├── ViperBehavior.ts
│   │   ├── TheWardenBehavior.ts
│   │   └── ...                     # 16 total
│   └── AIDirector.ts               # Selects behavior based on opponent index
├── ui/
│   ├── HealthBar.ts
│   ├── TargetBrackets.ts
│   ├── WeaponIndicator.ts
│   └── Radar.ts
└── utils/
    ├── math.ts                     # clamp, lerp, angleDiff, randomRange
    └── CanvasUtils.ts              # Drawing helpers: gradients, glow, noise
```

### Build Order

1. Scaffold — update Vite + Phaser config, empty scenes render
2. Ship renderer — canvas draw for player ship, generate sprite sheet, display in scene
3. Physics — thrust, rotation, drag, wall bounce in ArenaScene
4. Basic combat — OH-YUM Blaster bolts, one enemy (Rusty), damage + knockback
5. HUD — deflector/hull bars, weapon status, targeting brackets
6. Pickups — crate spawning, collection, weapon switching
7. All weapons — homing missiles, scatter shot, plasma lance, bomb
8. AI framework — behavior tree system, implement 4 rookie opponents
9. Hangar screen — dossier, comms, pre-fight flow
10. Ladder system — progression, save/load, unlock tracking
11. Remaining 12 opponents — contender, elite, champion tier behaviors + ship designs
12. The Warden — multi-phase final boss, drone spawning
13. Cybertruck — renderer, victory scene, post-game exhibition mode
14. Title screen — OH-YUM ARENA branding, "From Utah to the Stars"
15. Polish — screen shake, particles, sound effects, music, juice

---

## Constants Reference

```ts
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PHYSICS = {
  FIXED_TIMESTEP: 1000 / 60,       // 60Hz physics step, independent of render FPS
  THRUST: 300,
  ROTATION_SPEED: Math.PI,          // ~180°/sec
  DRAG_HALF_LIFE: 1.5,             // seconds — velocity halves every 1.5s without thrust
  MAX_VELOCITY: 400,
  WALL_BOUNCE_FACTOR: 0.6,
  WALL_DAMAGE: 2,
  COLLISION_DAMAGE_MULTIPLIER: 0.1, // per unit relative velocity
};

export const WEAPONS = {
  BLASTER_FIRE_RATE: 150,           // ms between shots
  BLASTER_BOLT_SPEED: 600,
  BLASTER_DAMAGE: 5,
  MISSILE_SPEED: 250,
  MISSILE_TURN_RATE: 3,
  MISSILE_DAMAGE: 20,
  SCATTER_SPREAD: 0.4,              // radians total spread
  SCATTER_DAMAGE: 4,
  PLASMA_DAMAGE: 40,
  BOMB_DAMAGE: 60,
  BOMB_RADIUS: 400,
};

export const SHIP = {
  PLAYER_HULL: 100,
  PLAYER_SHIELD: 50,
  SHIELD_REGEN_DELAY: 5000,         // ms before shield starts regenerating
  SHIELD_REGEN_RATE: 2,             // per second
  IFRAMES: 500,                      // ms invincibility after hit
};

export const PICKUP = {
  SPAWN_INTERVAL_MIN: 8000,
  SPAWN_INTERVAL_MAX: 12000,
  SHIELD_BOOST: 0.25,               // fraction of max shield
};

export const ROTATION_FRAMES = 72;   // 5° per frame for sprite sheets
```
