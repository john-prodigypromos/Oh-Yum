// ── Per-Level Environment Loader ─────────────────────────
// Spawns level-specific environment objects (asteroids, fog,
// black hole) into the scene. Returns an update function for
// per-frame effects and a cleanup function.

import * as THREE from 'three';
import { Ship3D } from '../entities/Ship3D';
import type { BoltPool } from '../entities/Bolt3D';
import { ExplosionPool } from '../entities/Explosion3D';

export interface LevelEnvironment {
  /** Per-frame update for environment effects. */
  update(dt: number, now: number, player: Ship3D, enemies: Ship3D[], boltPool?: BoltPool, camera?: THREE.PerspectiveCamera, explosions?: ExplosionPool): void;
  /** Remove all environment objects from the scene. */
  cleanup(): void;
}

// ── Level 1: Asteroid Belt ──────────────────────────────

interface Asteroid {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVel: THREE.Vector3;
  radius: number;
  hp: number;
  alive: boolean;
}

export function createAsteroidBelt(scene: THREE.Scene): LevelEnvironment {
  const asteroids: Asteroid[] = [];
  const count = 12 + Math.floor(Math.random() * 6); // 12-17

  // Simple pseudo-noise for consistent rock displacement
  function hashNoise(x: number, y: number, z: number): number {
    let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    n = n - Math.floor(n);
    return n * 2 - 1; // -1 to 1
  }

  for (let i = 0; i < count; i++) {
    // Random size: small (4-7), medium (10-16), large (18-30)
    const sizeRoll = Math.random();
    let radius: number;
    if (sizeRoll < 0.45) radius = 4 + Math.random() * 3;
    else if (sizeRoll < 0.8) radius = 10 + Math.random() * 6;
    else radius = 18 + Math.random() * 12;

    // Higher subdivision for more detailed rock surfaces
    const detail = radius > 14 ? 3 : radius > 7 ? 2 : 1;
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const posAttr = geo.attributes.position;

    // Multi-octave noise displacement for craggy, irregular rock shapes
    for (let v = 0; v < posAttr.count; v++) {
      const x = posAttr.getX(v);
      const y = posAttr.getY(v);
      const z = posAttr.getZ(v);
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len < 0.001) continue;
      const nx = x / len, ny = y / len, nz = z / len;

      // Large-scale deformation (lumpy shape)
      const big = hashNoise(nx * 2 + i, ny * 2, nz * 2) * 0.25;
      // Medium crags
      const mid = hashNoise(nx * 5 + i * 3, ny * 5, nz * 5) * 0.12;
      // Fine surface roughness
      const fine = hashNoise(nx * 12 + i * 7, ny * 12, nz * 12) * 0.06;
      // Crater-like dimples (some vertices pushed inward)
      const crater = hashNoise(nx * 8 + i, ny * 8 + i, nz * 8) > 0.6 ? -0.15 : 0;

      const displacement = 1 + big + mid + fine + crater;
      posAttr.setXYZ(v, nx * radius * displacement, ny * radius * displacement, nz * radius * displacement);
    }
    geo.computeVertexNormals();

    // Per-asteroid material with color variation
    const colorVar = Math.random();
    let baseColor: number;
    if (colorVar < 0.3) baseColor = 0x3d2b1a;       // dark brown
    else if (colorVar < 0.6) baseColor = 0x554433;   // warm brown
    else if (colorVar < 0.8) baseColor = 0x444040;   // grey rock
    else baseColor = 0x2a2520;                         // near-black iron

    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.85 + Math.random() * 0.15,
      metalness: 0.05 + Math.random() * 0.15,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);

    // Scatter within a ring around the player spawn area (avoid center)
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 500; // 80-580 units from origin
    const elevation = (Math.random() - 0.5) * 120;
    mesh.position.set(
      Math.cos(angle) * dist,
      elevation,
      Math.sin(angle) * dist,
    );

    // Random rotation
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    scene.add(mesh);

    asteroids.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 3,
      ),
      angularVel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
      ),
      radius,
      hp: Math.round(radius * 4), // bigger asteroids take more hits
      alive: true,
    });
  }

  const _tmpDiff = new THREE.Vector3();

  function update(dt: number, _now: number, player: Ship3D, enemies: Ship3D[], boltPool?: BoltPool, camera?: THREE.PerspectiveCamera, explosions?: ExplosionPool): void {
    for (const ast of asteroids) {
      if (!ast.alive) continue;

      // Slow drift
      ast.mesh.position.addScaledVector(ast.velocity, dt);
      ast.mesh.rotation.x += ast.angularVel.x * dt;
      ast.mesh.rotation.y += ast.angularVel.y * dt;
      ast.mesh.rotation.z += ast.angularVel.z * dt;

      // Collision with player
      if (player.alive) {
        _tmpDiff.subVectors(player.position, ast.mesh.position);
        const dist = _tmpDiff.length();
        const minDist = ast.radius + 20;
        if (dist < minDist) {
          _tmpDiff.normalize();
          player.position.copy(ast.mesh.position).addScaledVector(_tmpDiff, minDist);
          const dot = player.velocity.dot(_tmpDiff);
          if (dot < 0) {
            player.velocity.addScaledVector(_tmpDiff, -dot * 1.5);
          }
          player.applyDamage(3, performance.now());
        }
      }

      // Collision with enemies
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        _tmpDiff.subVectors(enemy.position, ast.mesh.position);
        const dist = _tmpDiff.length();
        const minDist = ast.radius + 20;
        if (dist < minDist) {
          _tmpDiff.normalize();
          enemy.position.copy(ast.mesh.position).addScaledVector(_tmpDiff, minDist);
          enemy.applyDamage(3, performance.now());
        }
      }

      // Bolt-asteroid collisions — asteroids take damage from lasers
      if (boltPool) {
        for (const bolt of boltPool.getActive()) {
          _tmpDiff.subVectors(bolt.mesh.position, ast.mesh.position);
          const dist = _tmpDiff.length();
          if (dist < ast.radius) {
            ast.hp -= bolt.damage;
            boltPool.deactivate(bolt);

            if (ast.hp <= 0) {
              // Asteroid destroyed — boom!
              ast.alive = false;
              ast.mesh.visible = false;
              scene.remove(ast.mesh);

              if (explosions && camera) {
                explosions.spawnDeathWorld(ast.mesh.position, camera);
              }
            } else {
              // Visual feedback — briefly brighten on hit
              const mat = ast.mesh.material as THREE.MeshStandardMaterial;
              mat.emissive.setHex(0xff4400);
              mat.emissiveIntensity = 0.5;
              setTimeout(() => {
                mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
              }, 100);
            }
          }
        }
      }
    }
  }

  function cleanup(): void {
    for (const ast of asteroids) {
      scene.remove(ast.mesh);
      ast.mesh.geometry.dispose();
    }
  }

  return { update, cleanup };
}

// ── Level 2: Nebula Fog ─────────────────────────────────

export function createNebulaFog(scene: THREE.Scene): LevelEnvironment {
  // Dense fog sphere
  const fogGeo = new THREE.SphereGeometry(800, 32, 24);
  const fogMat = new THREE.MeshBasicMaterial({
    color: 0x1a3344,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const fogSphere = new THREE.Mesh(fogGeo, fogMat);
  scene.add(fogSphere);

  // Inner fog layers for depth
  const innerFogGeo = new THREE.SphereGeometry(400, 24, 16);
  const innerFogMat = new THREE.MeshBasicMaterial({
    color: 0x2a4455,
    transparent: true,
    opacity: 0.03,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const innerFog = new THREE.Mesh(innerFogGeo, innerFogMat);
  scene.add(innerFog);

  // No scene.fog — it kills the starfield and skybox. Use visual-only atmosphere instead.

  // Reduced ambient
  const dimLight = new THREE.AmbientLight(0x112233, 0.3);
  scene.add(dimLight);

  // Lightning flash light (off by default)
  const lightningLight = new THREE.DirectionalLight(0xffffff, 0);
  lightningLight.position.set(0, 200, 0);
  scene.add(lightningLight);

  let nextLightning = 8 + Math.random() * 7; // 8-15 seconds
  let lightningTimer = 0;
  let flashTimer = 0;
  let flashing = false;

  function update(dt: number): void {
    lightningTimer += dt;

    if (!flashing && lightningTimer >= nextLightning) {
      // Trigger lightning
      flashing = true;
      flashTimer = 0;
      lightningLight.intensity = 5;
      lightningTimer = 0;
      nextLightning = 8 + Math.random() * 7;
    }

    if (flashing) {
      flashTimer += dt;
      // Quick flash then fade
      if (flashTimer < 0.05) {
        lightningLight.intensity = 5;
      } else if (flashTimer < 0.15) {
        lightningLight.intensity = 2;
      } else if (flashTimer < 0.2) {
        lightningLight.intensity = 4; // secondary flash
      } else {
        lightningLight.intensity = Math.max(0, lightningLight.intensity - dt * 15);
        if (lightningLight.intensity <= 0) {
          flashing = false;
        }
      }
    }

    // Slowly drift fog center to follow player loosely
    fogSphere.position.lerp(new THREE.Vector3(0, 0, 0), dt * 0.1);
    innerFog.position.copy(fogSphere.position);
  }

  function cleanup(): void {
    scene.remove(fogSphere);
    scene.remove(innerFog);
    scene.remove(dimLight);
    scene.remove(lightningLight);
    fogGeo.dispose();
    innerFogGeo.dispose();
    fogMat.dispose();
    innerFogMat.dispose();
  }

  return { update, cleanup };
}

// ── Level 3: Black Hole ─────────────────────────────────
// Cinematic Interstellar-style black hole with multi-layered
// accretion disk, gravitational lensing ring, volumetric glow,
// swirling gas streams, and real gravity pull.

/** Black hole world position — exported so AI behaviors can reference it. */
export const BLACK_HOLE_POS = new THREE.Vector3(600, -80, -400);

// Helper: generate a canvas texture for a radial disk with color stops
function makeAccretionTexture(
  size: number,
  stops: Array<{ pos: number; color: string }>,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const s of stops) grad.addColorStop(s.pos, s.color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function createBlackHole(scene: THREE.Scene): LevelEnvironment {
  const group = new THREE.Group();
  group.position.copy(BLACK_HOLE_POS);
  const disposables: Array<{ dispose(): void }> = [];

  const DISK_TILT = Math.PI * 0.42;

  // ── 1. Outer ambient glow (large, soft, teal-pink nebula wash) ──
  const outerGlowTex = makeAccretionTexture(512, [
    { pos: 0, color: 'rgba(180, 140, 200, 0.22)' },
    { pos: 0.15, color: 'rgba(120, 180, 200, 0.14)' },
    { pos: 0.35, color: 'rgba(80, 140, 160, 0.07)' },
    { pos: 0.6, color: 'rgba(40, 60, 80, 0.03)' },
    { pos: 1, color: 'rgba(0, 0, 0, 0)' },
  ]);
  const outerGlowMat = new THREE.SpriteMaterial({
    map: outerGlowTex, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const outerGlow = new THREE.Sprite(outerGlowMat);
  outerGlow.scale.set(900, 900, 1);
  group.add(outerGlow);
  disposables.push(outerGlowTex, outerGlowMat);

  // ── 2. Warm inner glow (orange/amber halo around singularity) ──
  const warmGlowTex = makeAccretionTexture(512, [
    { pos: 0, color: 'rgba(255, 200, 120, 0.4)' },
    { pos: 0.12, color: 'rgba(255, 140, 50, 0.3)' },
    { pos: 0.3, color: 'rgba(255, 80, 20, 0.15)' },
    { pos: 0.55, color: 'rgba(160, 40, 10, 0.05)' },
    { pos: 1, color: 'rgba(0, 0, 0, 0)' },
  ]);
  const warmGlowMat = new THREE.SpriteMaterial({
    map: warmGlowTex, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const warmGlow = new THREE.Sprite(warmGlowMat);
  warmGlow.scale.set(550, 550, 1);
  group.add(warmGlow);
  disposables.push(warmGlowTex, warmGlowMat);

  // ── 3. Singularity sphere (deep black, slightly larger for shadow) ──
  const holeGeo = new THREE.SphereGeometry(55, 48, 48);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const holeMesh = new THREE.Mesh(holeGeo, holeMat);
  group.add(holeMesh);
  disposables.push(holeGeo, holeMat);

  // ── 4. Photon ring (gravitational lensing — thin bright ring) ──
  const photonGeo = new THREE.TorusGeometry(62, 1.8, 16, 128);
  const photonMat = new THREE.MeshBasicMaterial({
    color: 0xffeedd, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const photonRing = new THREE.Mesh(photonGeo, photonMat);
  photonRing.rotation.x = DISK_TILT;
  group.add(photonRing);
  disposables.push(photonGeo, photonMat);

  // Secondary lensing ring (dimmer, slightly larger)
  const photon2Geo = new THREE.TorusGeometry(68, 1.2, 16, 128);
  const photon2Mat = new THREE.MeshBasicMaterial({
    color: 0xccbbff, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const photonRing2 = new THREE.Mesh(photon2Geo, photon2Mat);
  photonRing2.rotation.x = DISK_TILT;
  group.add(photonRing2);
  disposables.push(photon2Geo, photon2Mat);

  // ── 5. Main accretion disk — canvas-textured ring with gradient ──
  const diskTexCanvas = document.createElement('canvas');
  diskTexCanvas.width = 512;
  diskTexCanvas.height = 64;
  const dCtx = diskTexCanvas.getContext('2d')!;
  // Radial color gradient: inner white-hot → orange → deep red → transparent outer
  const dGrad = dCtx.createLinearGradient(0, 0, 512, 0);
  dGrad.addColorStop(0, 'rgba(255, 240, 220, 0.9)');   // inner edge: white-hot
  dGrad.addColorStop(0.08, 'rgba(255, 200, 100, 0.85)');
  dGrad.addColorStop(0.2, 'rgba(255, 140, 40, 0.7)');
  dGrad.addColorStop(0.4, 'rgba(220, 80, 15, 0.5)');
  dGrad.addColorStop(0.6, 'rgba(160, 40, 10, 0.3)');
  dGrad.addColorStop(0.8, 'rgba(80, 20, 5, 0.12)');
  dGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  dCtx.fillStyle = dGrad;
  dCtx.fillRect(0, 0, 512, 64);
  // Add turbulence streaks for visual complexity
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 64;
    const w = 20 + Math.random() * 60;
    const bright = Math.random();
    dCtx.fillStyle = bright > 0.5
      ? `rgba(255, ${180 + Math.random() * 75}, ${60 + Math.random() * 60}, ${0.15 + Math.random() * 0.2})`
      : `rgba(${100 + Math.random() * 80}, ${20 + Math.random() * 30}, ${5 + Math.random() * 10}, ${0.1 + Math.random() * 0.15})`;
    dCtx.fillRect(x, y, w, 1 + Math.random() * 3);
  }

  const diskTex = new THREE.CanvasTexture(diskTexCanvas);
  diskTex.wrapS = THREE.RepeatWrapping;
  diskTex.wrapT = THREE.ClampToEdgeWrapping;
  const diskGeo = new THREE.RingGeometry(60, 220, 128, 1);
  // Map UVs so inner→outer maps to left→right of the gradient texture
  const uvAttr = diskGeo.attributes.uv;
  const posAttr = diskGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getY(i); // RingGeometry is in XY plane
    const r = Math.sqrt(x * x + z * z);
    const t = (r - 60) / (220 - 60); // 0 at inner edge, 1 at outer
    const angle = Math.atan2(z, x);
    uvAttr.setXY(i, angle / (Math.PI * 2) + 0.5, t);
  }

  const diskMat = new THREE.MeshBasicMaterial({
    map: diskTex, transparent: true, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const disk = new THREE.Mesh(diskGeo, diskMat);
  disk.rotation.x = DISK_TILT;
  group.add(disk);
  disposables.push(diskTex, diskGeo, diskMat);

  // ── 6. Secondary disk layer (slightly different tilt for depth) ──
  const disk2Geo = new THREE.RingGeometry(65, 200, 96, 1);
  const disk2Mat = new THREE.MeshBasicMaterial({
    color: 0xff9944, transparent: true, opacity: 0.2,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const disk2 = new THREE.Mesh(disk2Geo, disk2Mat);
  disk2.rotation.x = DISK_TILT + 0.08; // slightly offset tilt
  disk2.rotation.z = 0.3;
  group.add(disk2);
  disposables.push(disk2Geo, disk2Mat);

  // ── 7. Inner bright accretion edge (white-hot ring) ──
  const innerEdgeGeo = new THREE.RingGeometry(56, 66, 128);
  const innerEdgeMat = new THREE.MeshBasicMaterial({
    color: 0xffeedd, transparent: true, opacity: 0.6,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const innerEdge = new THREE.Mesh(innerEdgeGeo, innerEdgeMat);
  innerEdge.rotation.x = DISK_TILT;
  group.add(innerEdge);
  disposables.push(innerEdgeGeo, innerEdgeMat);

  // ── 8. Gas stream particles (swirling matter spiraling inward) ──
  const STREAM_COUNT = 280;
  const streamGeo = new THREE.BufferGeometry();
  const streamPositions = new Float32Array(STREAM_COUNT * 3);
  const streamColors = new Float32Array(STREAM_COUNT * 3);
  const streamSizes = new Float32Array(STREAM_COUNT);
  // Per-particle state for animation
  const streamAngles = new Float32Array(STREAM_COUNT);
  const streamRadii = new Float32Array(STREAM_COUNT);
  const streamSpeeds = new Float32Array(STREAM_COUNT);
  const streamHeights = new Float32Array(STREAM_COUNT);

  for (let i = 0; i < STREAM_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 60 + Math.random() * 180;
    const height = (Math.random() - 0.5) * 30 * (1 - (radius - 60) / 180);
    streamAngles[i] = angle;
    streamRadii[i] = radius;
    streamSpeeds[i] = 0.15 + Math.random() * 0.35;
    streamHeights[i] = height;

    // Color: inner particles are hotter (white/yellow), outer are cooler (red/dark)
    const t = (radius - 60) / 180;
    const r = 1;
    const g = 0.3 + (1 - t) * 0.6;
    const b = (1 - t) * 0.4;
    streamColors[i * 3] = r;
    streamColors[i * 3 + 1] = g;
    streamColors[i * 3 + 2] = b;

    streamSizes[i] = 2 + Math.random() * 4 * (1 - t * 0.6);
  }
  streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
  streamGeo.setAttribute('color', new THREE.BufferAttribute(streamColors, 3));
  streamGeo.setAttribute('size', new THREE.BufferAttribute(streamSizes, 1));

  const streamMat = new THREE.PointsMaterial({
    size: 4, vertexColors: true, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const streamPoints = new THREE.Points(streamGeo, streamMat);
  streamPoints.rotation.x = DISK_TILT;
  group.add(streamPoints);
  disposables.push(streamGeo, streamMat);

  // ── 9. Tidal gas wisps (long curved streaks of matter) ──
  const wispGroup = new THREE.Group();
  wispGroup.rotation.x = DISK_TILT;
  const wisps: THREE.Mesh[] = [];
  for (let w = 0; w < 6; w++) {
    const curve = new THREE.CatmullRomCurve3([]);
    const startAngle = (w / 6) * Math.PI * 2 + Math.random() * 0.5;
    const startR = 70 + Math.random() * 40;
    const points: THREE.Vector3[] = [];
    for (let p = 0; p < 20; p++) {
      const t = p / 19;
      const a = startAngle + t * Math.PI * 1.5 * (0.8 + Math.random() * 0.4);
      const r = startR + t * (100 + Math.random() * 60);
      const h = (Math.random() - 0.5) * 8 * (1 - t);
      points.push(new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r));
    }
    curve.points = points;
    const tubeGeo = new THREE.TubeGeometry(curve, 30, 1.5 + Math.random() * 2, 6, false);
    const hue = Math.random();
    const wColor = hue < 0.4 ? 0xff8833 : hue < 0.7 ? 0xffaa55 : 0xcc6622;
    const tubeMat = new THREE.MeshBasicMaterial({
      color: wColor, transparent: true, opacity: 0.15 + Math.random() * 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const wispMesh = new THREE.Mesh(tubeGeo, tubeMat);
    wispGroup.add(wispMesh);
    wisps.push(wispMesh);
    disposables.push(tubeGeo, tubeMat);
  }
  group.add(wispGroup);

  // ── 10. Warm + cool point lights ──
  const warmLight = new THREE.PointLight(0xff6600, 2.5, 900);
  group.add(warmLight);
  const coolLight = new THREE.PointLight(0x4488aa, 0.8, 600);
  coolLight.position.set(0, 60, 0);
  group.add(coolLight);

  scene.add(group);

  // ── Gravity — pulls ships that fly close ──
  const GRAVITY_STRENGTH = 600;
  const EVENT_HORIZON = 55;
  const MAX_EFFECT_DIST = 600;
  const _toHole = new THREE.Vector3();

  function applyGravity(entity: Ship3D, dt: number): void {
    if (!entity.alive) return;
    _toHole.subVectors(BLACK_HOLE_POS, entity.position);
    const dist = _toHole.length();
    if (dist < EVENT_HORIZON) {
      entity.applyDamage(9999, performance.now());
      return;
    }
    if (dist < MAX_EFFECT_DIST) {
      const force = GRAVITY_STRENGTH / (dist * dist) * dt;
      _toHole.normalize();
      entity.velocity.addScaledVector(_toHole, force * 60);
    }
  }

  function update(dt: number, now: number, player: Ship3D, enemies: Ship3D[]): void {
    // Rotate accretion disk layers at different speeds
    disk.rotation.z += dt * 0.06;
    disk2.rotation.z -= dt * 0.03;
    innerEdge.rotation.z += dt * 0.08;
    wispGroup.rotation.y += dt * 0.015;

    // Animate stream particles — spiral inward
    const posArr = streamGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < STREAM_COUNT; i++) {
      streamAngles[i] += dt * streamSpeeds[i] * (200 / Math.max(streamRadii[i], 60));
      // Slowly drift inward
      streamRadii[i] -= dt * 2;
      if (streamRadii[i] < 58) {
        streamRadii[i] = 120 + Math.random() * 120;
        streamAngles[i] = Math.random() * Math.PI * 2;
      }
      const a = streamAngles[i];
      const r = streamRadii[i];
      posArr[i * 3] = Math.cos(a) * r;
      posArr[i * 3 + 1] = streamHeights[i] * (r / 200);
      posArr[i * 3 + 2] = Math.sin(a) * r;
    }
    streamGeo.attributes.position.needsUpdate = true;

    // Pulsing photon ring
    const pulse = 0.7 + 0.3 * Math.sin(now * 1.5);
    photonMat.opacity = 0.6 + 0.25 * pulse;
    photon2Mat.opacity = 0.25 + 0.15 * Math.sin(now * 2.1 + 1);

    // Gentle warm light flicker
    warmLight.intensity = 2.2 + 0.5 * Math.sin(now * 0.8);

    applyGravity(player, dt);
    for (const enemy of enemies) {
      applyGravity(enemy, dt);
    }
  }

  function cleanup(): void {
    scene.remove(group);
    for (const d of disposables) d.dispose();
  }

  return { update, cleanup };
}

// ── Factory — create environment based on level number ──

export function createLevelEnvironment(scene: THREE.Scene, level: number): LevelEnvironment | null {
  switch (level) {
    case 1: return createAsteroidBelt(scene);
    case 2: return createNebulaFog(scene);
    case 3: return createBlackHole(scene);
    default: return null;
  }
}
