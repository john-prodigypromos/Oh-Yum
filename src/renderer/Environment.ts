// ── Space Environment ────────────────────────────────────
// Starfield (8K points), nebula sprites, procedural envMap,
// hemisphere + directional lighting. Creates an immersive
// deep space backdrop for the arena.

import * as THREE from 'three';

// Seeded RNG for deterministic starfield
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createStarfield(scene: THREE.Scene): THREE.Points {
  const COUNT = 800;
  const SPREAD = 4000;
  const rng = seededRng(42);

  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;

    // Distribute on a large sphere shell so stars surround the arena
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const r = SPREAD * (0.5 + rng() * 0.5);

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    // Star colors: mostly white-blue, some warm yellow, rare red
    const roll = rng();
    if (roll < 0.05) {
      // Warm orange
      colors[i3] = 1.0; colors[i3 + 1] = 0.8; colors[i3 + 2] = 0.6;
    } else if (roll < 0.1) {
      // Cool blue
      colors[i3] = 0.7; colors[i3 + 1] = 0.8; colors[i3 + 2] = 1.0;
    } else if (roll < 0.12) {
      // Red giant
      colors[i3] = 1.0; colors[i3 + 1] = 0.5; colors[i3 + 2] = 0.3;
    } else {
      // White-ish
      colors[i3] = 0.9; colors[i3 + 1] = 0.92; colors[i3 + 2] = 1.0;
    }

    // Vary brightness via size — most dim, some bright
    sizes[i] = i < 700 ? 0.8 + rng() * 1.2 : 2.0 + rng() * 3.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    size: 2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const stars = new THREE.Points(geo, mat);
  stars.frustumCulled = false; // always visible
  scene.add(stars);
  return stars;
}

export function createNebulae(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();

  const nebulaConfigs = [
    { pos: [-800, 200, -2000], color: [0.3, 0.1, 0.5], scale: 800, opacity: 0.08 },
    { pos: [600, -300, -1800], color: [0.1, 0.2, 0.5], scale: 1000, opacity: 0.1 },
    { pos: [-200, 500, -2500], color: [0.1, 0.4, 0.3], scale: 600, opacity: 0.06 },
    { pos: [900, 100, -1500], color: [0.4, 0.15, 0.3], scale: 700, opacity: 0.07 },
    { pos: [-500, -400, -2200], color: [0.15, 0.1, 0.4], scale: 900, opacity: 0.05 },
  ];

  // Create soft cloud texture procedurally
  const cloudTexture = createCloudTexture();

  for (const cfg of nebulaConfigs) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTexture,
      color: new THREE.Color(cfg.color[0], cfg.color[1], cfg.color[2]),
      transparent: true,
      opacity: cfg.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    sprite.scale.set(cfg.scale, cfg.scale, 1);
    group.add(sprite);
  }

  scene.add(group);
  return group;
}

function createCloudTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Radial gradient — soft cloud puff
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.2)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Layer noise blobs for organic shape
  const rng = seededRng(777);
  for (let i = 0; i < 12; i++) {
    const ox = cx + (rng() - 0.5) * size * 0.4;
    const oy = cy + (rng() - 0.5) * size * 0.4;
    const r = size * (0.1 + rng() * 0.2);
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    g.addColorStop(0, `rgba(255,255,255,${0.2 + rng() * 0.3})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createLighting(scene: THREE.Scene): {
  sun: THREE.DirectionalLight;
  hemisphere: THREE.HemisphereLight;
} {
  // Hemisphere — subtle ambient fill (cool sky, dark ground)
  const hemisphere = new THREE.HemisphereLight(0x222244, 0x000000, 0.2);
  scene.add(hemisphere);

  // Sun — soft directional (not too bright for metallic ships)
  const sun = new THREE.DirectionalLight(0xfff5e6, 0.8);
  sun.position.set(200, 150, 100);
  scene.add(sun);

  return { sun, hemisphere };
}

export function createEnvironmentMap(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): THREE.CubeTexture {
  // Render the starfield + nebulae to a cube render target for PBR reflections
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });

  const cubeCamera = new THREE.CubeCamera(1, 10000, cubeRenderTarget);
  cubeCamera.position.copy(camera.position);
  cubeCamera.update(renderer, scene);

  scene.environment = cubeRenderTarget.texture;
  return cubeRenderTarget.texture;
}

export function createPlanet(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  const rng = seededRng(314);
  const W = 1024;
  const H = 512;

  // ── High-res planet surface texture ──
  const planetCanvas = document.createElement('canvas');
  planetCanvas.width = W;
  planetCanvas.height = H;
  const ctx = planetCanvas.getContext('2d')!;

  // Base: warm Jupiter-like bands
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0.00, '#c4a56a');
  base.addColorStop(0.08, '#b8956a');
  base.addColorStop(0.15, '#d4b87a');
  base.addColorStop(0.22, '#a0784a');
  base.addColorStop(0.30, '#c8a870');
  base.addColorStop(0.38, '#8a6840');
  base.addColorStop(0.45, '#c0a068');
  base.addColorStop(0.52, '#b09058');
  base.addColorStop(0.60, '#d0b478');
  base.addColorStop(0.68, '#907050');
  base.addColorStop(0.75, '#c4a468');
  base.addColorStop(0.82, '#a88a5a');
  base.addColorStop(0.90, '#b89860');
  base.addColorStop(1.00, '#c4a56a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Turbulent cloud bands — streaky horizontal noise
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < 200; i++) {
      const y = rng() * H;
      const x = rng() * W;
      const w = 40 + rng() * 200;
      const h = 1 + rng() * 4;
      const bright = rng() > 0.5;
      const alpha = 0.02 + rng() * 0.06;
      ctx.fillStyle = bright
        ? `rgba(255, 240, 200, ${alpha})`
        : `rgba(80, 50, 30, ${alpha})`;
      ctx.fillRect(x, y, w, h);
    }
  }

  // Wavy distortion bands
  for (let y = 0; y < H; y += 3) {
    if (rng() < 0.3) {
      const shift = Math.sin(y * 0.05 + rng() * 10) * (2 + rng() * 4);
      const strip = ctx.getImageData(0, y, W, 2);
      ctx.putImageData(strip, Math.round(shift), y);
    }
  }

  // Great Red Spot
  ctx.save();
  ctx.translate(W * 0.6, H * 0.42);
  ctx.rotate(0.15);
  const spotGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
  spotGrad.addColorStop(0, 'rgba(180, 80, 50, 0.5)');
  spotGrad.addColorStop(0.4, 'rgba(200, 100, 60, 0.35)');
  spotGrad.addColorStop(0.7, 'rgba(160, 90, 50, 0.15)');
  spotGrad.addColorStop(1, 'rgba(160, 90, 50, 0)');
  ctx.fillStyle = spotGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 55, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner swirl
  const innerGrad = ctx.createRadialGradient(5, -3, 0, 0, 0, 25);
  innerGrad.addColorStop(0, 'rgba(220, 120, 70, 0.4)');
  innerGrad.addColorStop(1, 'rgba(220, 120, 70, 0)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.ellipse(5, -3, 25, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Smaller storm spots
  for (let i = 0; i < 5; i++) {
    const sx = rng() * W;
    const sy = rng() * H;
    const sr = 8 + rng() * 15;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    sg.addColorStop(0, `rgba(${160 + rng() * 60}, ${80 + rng() * 40}, ${40 + rng() * 30}, 0.2)`);
    sg.addColorStop(1, 'rgba(150, 80, 40, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr * 1.5, sr * 0.6, rng() * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const planetTex = new THREE.CanvasTexture(planetCanvas);
  planetTex.wrapS = THREE.RepeatWrapping;
  planetTex.anisotropy = 4;

  const planetGeo = new THREE.SphereGeometry(300, 64, 48);
  const planetMat = new THREE.MeshStandardMaterial({
    map: planetTex,
    metalness: 0.0,
    roughness: 0.9,
  });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  group.add(planet);

  // ── Atmosphere layers ──
  // Inner glow
  const atmos1Geo = new THREE.SphereGeometry(306, 48, 36);
  const atmos1Mat = new THREE.MeshBasicMaterial({
    color: 0xddaa66,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
  });
  group.add(new THREE.Mesh(atmos1Geo, atmos1Mat));

  // Outer haze
  const atmos2Geo = new THREE.SphereGeometry(315, 32, 24);
  const atmos2Mat = new THREE.MeshBasicMaterial({
    color: 0x8899bb,
    transparent: true,
    opacity: 0.03,
    side: THREE.BackSide,
  });
  group.add(new THREE.Mesh(atmos2Geo, atmos2Mat));

  // ── Terminator shadow (dark side) ──
  const shadowGeo = new THREE.SphereGeometry(302, 48, 36);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.5,
    side: THREE.FrontSide,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  // Only render the dark half — shift it to cover the unlit side
  shadow.position.set(-80, 0, 0);
  group.add(shadow);

  // ── Ring system — multi-band with gaps ──
  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = 512;
  ringCanvas.height = 1;
  const rctx = ringCanvas.getContext('2d')!;
  for (let x = 0; x < 512; x++) {
    const t = x / 512;
    // Multiple bands with gaps (Cassini-like divisions)
    let alpha = 0;
    if (t > 0.05 && t < 0.35) alpha = (Math.sin(t * 80) * 0.5 + 0.5) * 0.35;
    if (t > 0.38 && t < 0.42) alpha = 0; // Cassini division
    if (t > 0.42 && t < 0.75) alpha = (Math.sin(t * 60) * 0.5 + 0.5) * 0.25;
    if (t > 0.80 && t < 0.95) alpha = (Math.sin(t * 100) * 0.5 + 0.5) * 0.15;

    const r = 200 + Math.sin(t * 30) * 30;
    const g = 185 + Math.sin(t * 20) * 25;
    const b = 160 + Math.sin(t * 40) * 20;
    rctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    rctx.fillRect(x, 0, 1, 1);
  }
  const ringTex = new THREE.CanvasTexture(ringCanvas);
  const ringGeo = new THREE.RingGeometry(360, 550, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI * 0.42;
  ring.rotation.z = 0.05;
  group.add(ring);

  // Position planet
  group.position.set(800, -300, -1200);
  group.rotation.y = 0.3;

  scene.add(group);
  return group;
}

export interface SpaceEnvironment {
  stars: THREE.Points;
  nebulae: THREE.Group;
  sun: THREE.DirectionalLight;
  hemisphere: THREE.HemisphereLight;
}

export function createSpaceEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
): SpaceEnvironment {
  const stars = createStarfield(scene);
  const nebulae = createNebulae(scene);
  const { sun, hemisphere } = createLighting(scene);
  createPlanet(scene);

  // Generate environment map for PBR reflections
  createEnvironmentMap(renderer, scene, camera);

  return { stars, nebulae, sun, hemisphere };
}
