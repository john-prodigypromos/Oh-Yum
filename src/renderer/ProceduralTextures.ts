// ── Procedural Textures ──────────────────────────────────
// Canvas-generated normal + roughness maps for ship hulls.
// No external texture files needed.

import * as THREE from 'three';

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Creates a normal map with panel lines, rivets, and surface detail. */
export function createNormalMap(size = 512, seed = 101): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rng = seededRng(seed);

  // Base normal (flat — pointing straight out: 128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  // Panel lines — recessed grooves (darken X/Y channels slightly)
  ctx.strokeStyle = 'rgb(120, 120, 240)';
  ctx.lineWidth = 2;
  const panelSize = size / 6;
  for (let x = panelSize; x < size; x += panelSize + rng() * 20 - 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = panelSize; y < size; y += panelSize + rng() * 20 - 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Rivets — small circular bumps
  ctx.fillStyle = 'rgb(140, 140, 255)';
  for (let i = 0; i < 60; i++) {
    const rx = rng() * size;
    const ry = rng() * size;
    ctx.beginPath();
    ctx.arc(rx, ry, 2 + rng() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scratches — thin random lines
  ctx.strokeStyle = 'rgb(135, 125, 245)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    const sx = rng() * size;
    const sy = rng() * size;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (rng() - 0.5) * 40, sy + (rng() - 0.5) * 40);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Creates a roughness map — shiny base with rougher panel grooves and wear patches. */
export function createRoughnessMap(size = 512, seed = 202): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rng = seededRng(seed);

  // Base roughness: 0.3 (shiny metal) = rgb(77, 77, 77)
  ctx.fillStyle = 'rgb(77, 77, 77)';
  ctx.fillRect(0, 0, size, size);

  // Panel line grooves: rougher (0.7) = rgb(179, 179, 179)
  ctx.strokeStyle = 'rgb(179, 179, 179)';
  ctx.lineWidth = 3;
  const panelSize = size / 6;
  for (let x = panelSize; x < size; x += panelSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = panelSize; y < size; y += panelSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Wear patches — random blobs of higher roughness
  for (let i = 0; i < 20; i++) {
    const wx = rng() * size;
    const wy = rng() * size;
    const wr = 10 + rng() * 30;
    const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
    g.addColorStop(0, `rgb(${140 + Math.floor(rng() * 60)}, ${140 + Math.floor(rng() * 60)}, ${140 + Math.floor(rng() * 60)})`);
    g.addColorStop(1, 'rgba(77, 77, 77, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
