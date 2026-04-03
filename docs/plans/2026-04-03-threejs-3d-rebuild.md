# OH-YUM BLASTER — Three.js 3D Rebuild Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild OH-YUM BLASTER as a cockpit-POV 3D space combat game using Three.js with realistic, high-resolution PBR graphics — metallic ships, bloom lighting, procedural textures, and dramatic space environment.

**Architecture:** Replace Phaser entirely with Three.js. Reuse all renderer-independent modules (state, config, sound, math utils, AI logic). Build a new scene-manager state machine in TypeScript, HTML/CSS overlay for HUD and menus, Three.js for all 3D rendering. EffectComposer for bloom + FXAA. Procedural textures via Canvas for normal/roughness maps (no external texture files).

**Tech Stack:** Three.js r162+, TypeScript, Vite, Web Audio API (existing SoundSystem), HTML/CSS overlays for UI, EffectComposer (UnrealBloomPass, SMAAPass, OutputPass)

---

## File Structure (New)

```
src/
├── main.ts                          # Three.js init, renderer, composer, scene manager
├── config.ts                        # KEEP — game constants (update for 3D coords)
├── state/
│   ├── GameState.ts                 # KEEP AS-IS
│   ├── Character.ts                 # KEEP AS-IS
│   ├── Difficulty.ts                # KEEP AS-IS
│   ├── HighScores.ts                # KEEP AS-IS
│   ├── LevelState.ts                # KEEP AS-IS
│   └── SceneManager.ts             # NEW — state machine: title/charSelect/levelIntro/arena/highScore
├── renderer/
│   ├── SetupRenderer.ts            # NEW — WebGLRenderer, EffectComposer, bloom, FXAA, tone mapping
│   ├── Environment.ts              # NEW — starfield Points, nebula sprites, procedural skybox envMap
│   └── ProceduralTextures.ts       # NEW — canvas-generated normal, roughness, emissive maps
├── entities/
│   ├── Ship3D.ts                   # NEW — Ship as Object3D: hull mesh, engine glow, PBR materials
│   ├── Bolt3D.ts                   # NEW — Projectile as cylinder mesh + glow, pooled
│   └── Explosion3D.ts             # NEW — InstancedMesh particle burst + flash PointLight
├── systems/
│   ├── PhysicsSystem3D.ts          # NEW — 3D physics (extend 2D to xyz), fixed timestep
│   ├── WeaponSystem3D.ts           # NEW — bolt spawning/pooling in 3D
│   ├── DamageSystem3D.ts           # NEW — 3D distance-based collision
│   └── SoundSystem.ts              # KEEP AS-IS (pure Web Audio)
├── ai/
│   ├── AIBehavior3D.ts             # NEW — 3D AI interface
│   └── behaviors/
│       └── RustyBehavior3D.ts      # NEW — 3D chase/face/fire (pitch + yaw)
├── camera/
│   └── CockpitCamera.ts           # NEW — 1st person camera, roll on turns, crosshair
├── scenes/
│   ├── TitleOverlay.ts            # NEW — HTML/CSS title screen overlay
│   ├── CharSelectOverlay.ts       # NEW — HTML/CSS character select overlay
│   ├── LevelIntroOverlay.ts       # NEW — HTML/CSS level banner overlay
│   ├── ArenaLoop.ts               # NEW — main 3D game loop, wires all systems
│   └── HighScoreOverlay.ts        # NEW — HTML/CSS name entry + leaderboard overlay
├── ui/
│   ├── HUD3D.ts                   # NEW — HTML/CSS overlay HUD (bars, score, targets, crosshair)
│   └── TouchControls3D.ts         # NEW — native touch events, joystick = pitch/yaw
├── utils/
│   ├── math.ts                    # KEEP AS-IS
│   ├── math3d.ts                  # NEW — 3D vector helpers, quaternion utils
│   └── StateMachine.ts            # KEEP AS-IS
└── ships/
    ├── ShipGeometry.ts            # NEW — procedural 3D ship geometry (fuselage, wings, cockpit, engines)
    ├── ShipMaterials.ts           # NEW — PBR materials: metalness, roughness, envMap, emissive
    └── ShipDrawHelpers.ts         # KEEP — canvas drawing for texture baking
```

**Files kept from current codebase (copy directly):**
- `src/state/*` (all 5 files)
- `src/config.ts` (minor updates for 3D constants)
- `src/utils/math.ts`
- `src/utils/StateMachine.ts`
- `src/systems/SoundSystem.ts`
- `src/ships/ShipDrawHelpers.ts`

**Files removed (Phaser-specific, fully replaced):**
- All `src/scenes/*.ts` (Phaser scenes)
- `src/entities/Ship.ts`, `src/entities/Bolt.ts`
- `src/systems/PhysicsSystem.ts`, `src/systems/WeaponSystem.ts`, `src/systems/DamageSystem.ts`, `src/systems/HUDSystem.ts`
- `src/ui/TouchControls.ts`, `src/ui/Starfield.ts`
- `src/ships/ShipSpriteGenerator.ts`, `src/ships/PlayerShipRenderer.ts`, `src/ships/EnemyShipRenderer.ts`
- `src/ai/*` (rewrite for 3D)

---

## Task 1: Project Setup — Swap Phaser for Three.js

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Create: `src/main.ts` (rewrite)

- [ ] **Step 1: Update dependencies**
```bash
cd "$HOME/Claude Local/OH-YUM BLASTER"
npm uninstall phaser
npm install three@^0.162.0
npm install -D @types/three
```

- [ ] **Step 2: Update index.html** — strip Phaser container, add HUD overlay container
```html
<!-- Keep existing meta tags, viewport, styles -->
<!-- Replace #game-container contents: -->
<div id="game-container">
  <canvas id="game-canvas"></canvas>
  <div id="ui-overlay"></div>
  <div id="crosshair">
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(0,255,255,0.4)" stroke-width="1"/>
      <line x1="20" y1="5" x2="20" y2="14" stroke="rgba(0,255,255,0.5)" stroke-width="1"/>
      <line x1="20" y1="26" x2="20" y2="35" stroke="rgba(0,255,255,0.5)" stroke-width="1"/>
      <line x1="5" y1="20" x2="14" y2="20" stroke="rgba(0,255,255,0.5)" stroke-width="1"/>
      <line x1="26" y1="20" x2="35" y2="20" stroke="rgba(0,255,255,0.5)" stroke-width="1"/>
      <circle cx="20" cy="20" r="2" fill="rgba(0,255,255,0.6)"/>
    </svg>
  </div>
</div>
```
Add CSS for `#ui-overlay` (position:fixed, full-screen, pointer-events:none, z-index:10) and `#crosshair` (centered, pointer-events:none).

- [ ] **Step 3: Scaffold main.ts** — Three.js renderer + empty scene
```typescript
import * as THREE from 'three';
// Init renderer, scene, camera
// EffectComposer with RenderPass + UnrealBloomPass + SMAAPass + OutputPass
// Animation loop: requestAnimationFrame
// Resize handler
```

- [ ] **Step 4: Verify** — open in browser, see black screen with no errors
- [ ] **Step 5: Commit** — `git commit -m "chore: swap Phaser for Three.js, scaffold renderer"`

---

## Task 2: Renderer + Post-Processing Setup

**Files:**
- Create: `src/renderer/SetupRenderer.ts`

- [ ] **Step 1: Create renderer factory**
```typescript
export function createRenderer(canvas: HTMLCanvasElement): {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}
```
Config:
- `renderer.toneMapping = THREE.ACESFilmicToneMapping`
- `renderer.toneMappingExposure = 1.2`
- `renderer.outputColorSpace = THREE.SRGBColorSpace`
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
- EffectComposer chain: RenderPass → UnrealBloomPass(strength:1.5, radius:0.6, threshold:0.85) → SMAAPass → OutputPass

- [ ] **Step 2: Verify** — bloom glow visible on a test emissive cube
- [ ] **Step 3: Commit**

---

## Task 3: Space Environment

**Files:**
- Create: `src/renderer/Environment.ts`
- Create: `src/renderer/ProceduralTextures.ts`

- [ ] **Step 1: Starfield** — 8,000 Points with varying size/brightness/color, `sizeAttenuation: false`, moves with camera
- [ ] **Step 2: Nebula** — 4-5 large Sprites with additive blending, soft cloud textures (procedural canvas), placed far behind action
- [ ] **Step 3: Procedural environment map** — render stars + nebula to a CubeRenderTarget once at startup, assign to `scene.environment` for PBR reflections
- [ ] **Step 4: Ambient lighting** — HemisphereLight (sky: 0x222244, ground: 0x000000, intensity: 0.2) + DirectionalLight (sun, 0xfff5e6, intensity: 3.0)
- [ ] **Step 5: Grid floor** (optional arena boundary visual) — large GridHelper far below, subtle blue lines
- [ ] **Step 6: Verify** — beautiful space vista with stars, nebula glow, dramatic lighting
- [ ] **Step 7: Commit**

---

## Task 4: Procedural Ship Geometry + PBR Materials

**Files:**
- Create: `src/ships/ShipGeometry.ts`
- Create: `src/ships/ShipMaterials.ts`
- Create: `src/renderer/ProceduralTextures.ts` (normal + roughness maps)

- [ ] **Step 1: Player ship geometry** — procedural BufferGeometry
  - Fuselage: elongated octahedron/cone shape (~10 units long)
  - Wings: two flat box geometries angled back
  - Cockpit: small sphere/dome on top
  - Engine nozzles: 2 cylinders at rear
  - Total: ~3K-5K triangles
  - Return as `THREE.Group` containing all meshes

- [ ] **Step 2: Enemy ship geometry** — different silhouette
  - Rounder body, menacing angular wings
  - Single large engine
  - ~2K-3K triangles

- [ ] **Step 3: Procedural normal map** (512x512 canvas)
  - Panel line grid (indented normals)
  - Rivets (small circular normal bumps)
  - Random scratches/dents via noise

- [ ] **Step 4: Procedural roughness map** (512x512 canvas)
  - Base: 0.3 (shiny metal)
  - Panel lines: 0.7 (rougher grooves)
  - Random wear patches via noise

- [ ] **Step 5: Player ship material** — MeshPhysicalMaterial
  - `metalness: 0.95, roughness: 0.3, envMap: from environment, normalMap, roughnessMap`
  - `clearcoat: 0.5, clearcoatRoughness: 0.1`
  - Color tinted by character selection (blue-steel for Owen, warm gold for William)
  - Engine emissive: `emissive: 0x0088ff, emissiveIntensity: 2.0`

- [ ] **Step 6: Enemy ship material** — MeshStandardMaterial
  - `metalness: 0.9, roughness: 0.4, color: 0x882222`
  - Same normalMap/roughnessMap (tiled differently)
  - Engine emissive: `emissive: 0xff4400, emissiveIntensity: 2.0`

- [ ] **Step 7: Engine PointLights** — attach to each ship's engine position
  - Player: `PointLight(0x0088ff, 5, 80, 2)`
  - Enemy: `PointLight(0xff4400, 5, 80, 2)`

- [ ] **Step 8: Verify** — ships visible in scene, PBR reflections working, bloom on engines
- [ ] **Step 9: Commit**

---

## Task 5: Ship3D Entity + CockpitCamera

**Files:**
- Create: `src/entities/Ship3D.ts`
- Create: `src/camera/CockpitCamera.ts`

- [ ] **Step 1: Ship3D class**
```typescript
export class Ship3D {
  group: THREE.Group;          // the 3D model
  hull: number; maxHull: number;
  shield: number; maxShield: number;
  speedMult: number; rotationMult: number;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;       // pitch, yaw, roll
  alive: boolean;
  iframesUntil: number;
  lastFireTime: number;
  lastDamageTime: number;
  engineLight: THREE.PointLight;
  // Methods: applyDamage(), isInvincible(), updateShieldRegen(), damagePct
}
```

- [ ] **Step 2: CockpitCamera**
  - PerspectiveCamera(FOV: 75) attached to player Ship3D position
  - Offset slightly behind and above ship center (so you see the ship nose at bottom)
  - Smooth roll on yaw input (lerp camera.rotation.z toward input)
  - Slight pitch follow (camera pitches with ship but dampened)
  - Crosshair stays centered (HTML overlay, not 3D)
  - Screen shake: random camera position offset, decay over time

- [ ] **Step 3: Verify** — camera follows ship, roll feels good, crosshair visible
- [ ] **Step 4: Commit**

---

## Task 6: 3D Physics System

**Files:**
- Create: `src/systems/PhysicsSystem3D.ts`

- [ ] **Step 1: 3D physics with fixed timestep**
  - Same architecture as 2D but with Vector3 velocity
  - Input: pitch (up/down), yaw (left/right), thrust (forward/backward), roll
  - Rotation applied to ship quaternion
  - Thrust applied along ship's forward vector
  - Drag: half-life decay on velocity magnitude
  - Max velocity cap
  - Arena boundary: sphere (radius ~500) or large box. Bounce + damage on wall hit.

- [ ] **Step 2: Verify** — ship flies around, feels responsive, bounces off arena walls
- [ ] **Step 3: Commit**

---

## Task 7: Weapons + Bolts in 3D

**Files:**
- Create: `src/entities/Bolt3D.ts`
- Create: `src/systems/WeaponSystem3D.ts`

- [ ] **Step 1: Bolt3D** — object-pooled projectile
  - Geometry: CylinderGeometry(0.15, 0.15, 3, 6) — thin glowing rod
  - Material: MeshBasicMaterial (player: 0x00ffff, enemy: 0xff3322) — not affected by lighting, always bright
  - Outer glow: slightly larger transparent cylinder, additive blending
  - Pool: pre-allocate 100 bolts, activate/deactivate as needed
  - Each bolt: position, velocity (Vector3), lifetime counter, owner, damage

- [ ] **Step 2: WeaponSystem3D** — fire rate, twin bolts offset from ship nose, pool management
- [ ] **Step 3: Verify** — bolts fire from cockpit POV, travel forward, cyan glow + bloom
- [ ] **Step 4: Commit**

---

## Task 8: Damage System + Explosions

**Files:**
- Create: `src/systems/DamageSystem3D.ts`
- Create: `src/entities/Explosion3D.ts`

- [ ] **Step 1: DamageSystem3D** — 3D distance-based collision
  - Bolt-to-ship: sphere check (bolt position vs ship position, hitbox radius)
  - Ship-to-ship: sphere-sphere collision with knockback
  - Shield absorbs first, then hull
  - I-frames after hit

- [ ] **Step 2: Explosion3D** — InstancedMesh particle burst
  - 100-200 instances of small PlaneGeometry, additive blending
  - Burst outward with random velocities (spherical distribution)
  - Color: white → yellow → orange → transparent over 0.8s
  - Temporary PointLight flash (intensity 50 → 0 over 0.3s)
  - Object pooled (pre-allocate 5 explosion slots)

- [ ] **Step 3: Ship damage visuals** — material tint shift
  - Healthy: normal material
  - Damaged (50%+): emissive red tint increases, slight mesh deformation via vertex displacement
  - Critical (75%+): sparking particles (small emissive points near hull)

- [ ] **Step 4: Verify** — hits register, shields flash, explosions look dramatic with bloom
- [ ] **Step 5: Commit**

---

## Task 9: Enemy AI in 3D

**Files:**
- Create: `src/ai/AIBehavior3D.ts`
- Create: `src/ai/behaviors/RustyBehavior3D.ts`

- [ ] **Step 1: 3D AI behavior**
  - Calculate 3D angle to player (using atan2 for yaw and pitch separately)
  - Rotate toward player (yaw + pitch, rate from difficulty config)
  - Thrust when facing player and distance > minimum
  - Fire when angle difference < threshold and within chase range
  - Fire rate from difficulty × level bonus

- [ ] **Step 2: Verify** — enemies chase, face, and fire at player in 3D space
- [ ] **Step 3: Commit**

---

## Task 10: Arena Game Loop

**Files:**
- Create: `src/scenes/ArenaLoop.ts`
- Create: `src/state/SceneManager.ts`

- [ ] **Step 1: SceneManager** — state machine managing which "scene" is active
  - States: `title | charSelect | levelIntro | arena | highScore`
  - Each state has `enter()`, `update(dt)`, `exit()` methods
  - UI overlays show/hide based on state
  - 3D scene persists (environment always visible behind overlays)

- [ ] **Step 2: ArenaLoop** — main game update
  - Read input (keyboard + touch)
  - Update player physics
  - Update each enemy AI + physics
  - Update weapons (fire, move bolts, lifetime)
  - Check damage (bolts vs ships, ship vs ship collisions)
  - Per-enemy explosion on death
  - Win condition: all enemies dead → level complete or victory
  - Lose condition: player dead → game over
  - Update HUD
  - Level progression: same logic as current (LevelState carry-over)

- [ ] **Step 3: Spawn enemies** based on LevelState config (1, 2, or 3 enemies)
  - Spawn at random positions in front of player, 200-400 units away
  - Each gets a RustyBehavior3D instance

- [ ] **Step 4: Verify** — complete combat loop works, can win and lose
- [ ] **Step 5: Commit**

---

## Task 11: HUD Overlay (HTML/CSS)

**Files:**
- Create: `src/ui/HUD3D.ts`

- [ ] **Step 1: HTML/CSS HUD** — all UI as DOM elements in `#ui-overlay`
  - Top-left: DEFLECTOR bar (cyan) + HULL bar (green) — CSS width transitions
  - Top-center: "OH-YUM BLASTER" title
  - Top-right: pilot portrait image + name
  - Bottom-left: SCORE + TARGETS: X/Y
  - Bottom-right: PRIDAY LABS
  - Center: crosshair (already in HTML)
  - Level indicator: "LEVEL N/3"

- [ ] **Step 2: Update method** — `update(player, enemies, score, level)` sets DOM values
- [ ] **Step 3: Verify** — HUD visible over 3D scene, updates in real-time
- [ ] **Step 4: Commit**

---

## Task 12: Touch Controls (Native)

**Files:**
- Create: `src/ui/TouchControls3D.ts`

- [ ] **Step 1: Native touch joystick + fire button**
  - Use `touchstart`, `touchmove`, `touchend` events on canvas
  - Left side: virtual joystick (horizontal = yaw, vertical = pitch)
  - Right side: fire button
  - Viewport-scaled positions and radii (same approach as current responsive controls)
  - Draw using a small Canvas overlay or SVG elements
  - Returns: `{ pitch, yaw, thrust, fire }` input state

- [ ] **Step 2: Verify** — touch controls work on mobile, joystick drives 3D pitch/yaw
- [ ] **Step 3: Commit**

---

## Task 13: UI Overlays — Title, CharSelect, LevelIntro, HighScore

**Files:**
- Create: `src/scenes/TitleOverlay.ts`
- Create: `src/scenes/CharSelectOverlay.ts`
- Create: `src/scenes/LevelIntroOverlay.ts`
- Create: `src/scenes/HighScoreOverlay.ts`

- [ ] **Step 1: TitleOverlay** — HTML/CSS fullscreen overlay
  - Title text, Japanese subtitle, 3 difficulty buttons, high scores top 5
  - 3D space environment visible behind (semi-transparent dark bg)
  - Camera slowly rotates in environment during title (cinematic idle)

- [ ] **Step 2: CharSelectOverlay** — HTML/CSS
  - Two character cards with portraits, names, taglines
  - Click/tap to select

- [ ] **Step 3: LevelIntroOverlay** — HTML/CSS with CSS animations
  - "LEVEL N" scales up (CSS transform animation)
  - Subtitle fades in
  - Enemy count indicator
  - Auto-dismiss after 2.5s

- [ ] **Step 4: HighScoreOverlay** — HTML/CSS
  - Name entry input (same HTML input approach, iOS keyboard compatible)
  - Leaderboard table
  - 12 char max, alphanumeric filter

- [ ] **Step 5: Wire all overlays into SceneManager** transitions
- [ ] **Step 6: Verify** — full game flow: title → charSelect → levelIntro → arena → (win) → highScore → title
- [ ] **Step 7: Commit**

---

## Task 14: Sound Integration

**Files:**
- Modify: `src/systems/SoundSystem.ts` (minor — no Phaser removal needed, already pure Web Audio)

- [ ] **Step 1: Wire SoundSystem into ArenaLoop**
  - `init()` on first user interaction
  - `startMusic()` on arena enter
  - `stopMusic()` on arena exit
  - `playerShoot()`, `enemyShoot()`, `hullHit()`, `shieldHit()`, `explosion()`, `wallBounce()`, `shipCollision()` on events
  - `victory()`, `defeat()`, `yay()`, `evilLaugh()`, `levelStart()`, `levelComplete()` on transitions

- [ ] **Step 2: Verify** — all sounds play at correct moments
- [ ] **Step 3: Commit**

---

## Task 15: Polish + Performance

**Files:**
- Various

- [ ] **Step 1: Engine particle trails** — InstancedMesh particles spawned at engine position, fade + drift backward. 200 particles per trail, recycled.
- [ ] **Step 2: Bolt trails** — short fading trail behind each bolt (3-4 stretched quads)
- [ ] **Step 3: Shield flash effect** — brief emissive sphere flash on ship when shield absorbs damage
- [ ] **Step 4: Screen shake** — camera position noise on hit, fast decay
- [ ] **Step 5: Mobile performance** — cap pixel ratio at 2, bloom at half-res on mobile, reduce star count, use MeshStandardMaterial everywhere on mobile
- [ ] **Step 6: Verify** — 60fps on iPhone Safari, no visual bugs
- [ ] **Step 7: Commit**

---

## Task 16: Final Integration + Deploy

- [ ] **Step 1: Full playthrough test** — all 3 levels, all 3 difficulties, both characters
- [ ] **Step 2: Mobile test** — iPhone landscape, iPad landscape
- [ ] **Step 3: High score flow test** — win → name entry → leaderboard → title shows scores
- [ ] **Step 4: Build** — `npm run build`, verify dist output
- [ ] **Step 5: Commit + push + deploy**

---

## Performance Budget (Mobile)

| Metric | Target |
|--------|--------|
| Draw calls | < 80 |
| Triangles | < 200K |
| Texture memory | < 64MB |
| Pixel ratio | 2 (capped) |
| Post-processing passes | 4 (render, bloom half-res, SMAA, output) |
| Particle count | < 1000 active |
| Framerate | 60fps iPhone 13+ |

## Visual Quality Targets

| Element | Approach |
|---------|----------|
| Ship hulls | PBR metallic with procedural normal + roughness maps, env reflections |
| Engines | Emissive materials + PointLights + particle trails + bloom |
| Bolts | MeshBasic (always bright) + bloom glow |
| Explosions | InstancedMesh particles + flash PointLight + screen shake |
| Space | 8K star Points + nebula sprites + procedural envMap |
| Lighting | ACES filmic tonemapping, dramatic sun + subtle fill |
