import Phaser from 'phaser';

export function createStarfieldTexture(scene: Phaser.Scene, key: string): void {
  // Use the live game dimensions so the starfield always covers the full canvas
  const W = scene.scale.width || 1280;
  const H = scene.scale.height || 720;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  let seed = 42;
  function rng() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  // ── Deep space gradient ──
  const bg = ctx.createRadialGradient(
    W * 0.4, H * 0.45, 0,
    W * 0.5, H * 0.5, W * 0.7
  );
  bg.addColorStop(0, '#0c1828');
  bg.addColorStop(0.5, '#070e1a');
  bg.addColorStop(1, '#020508');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Nebula clouds ──
  drawNebula(ctx, rng, W * 0.2, H * 0.25, W * 0.35,
    'rgba(60,20,80,0.08)', 'rgba(40,10,60,0.04)');
  drawNebula(ctx, rng, W * 0.75, H * 0.6, W * 0.3,
    'rgba(15,30,70,0.1)', 'rgba(10,20,50,0.05)');
  drawNebula(ctx, rng, W * 0.5, H * 0.85, W * 0.4,
    'rgba(10,50,50,0.06)', 'rgba(5,30,40,0.03)');

  // ── Ringed gas giant (Saturn-like, bottom-left, partially off-screen) ──
  const pX = W * 0.08;
  const pY = H * 1.05;
  const pR = 350;

  // Atmospheric glow — cool blue-gold wash
  const outerGlow = ctx.createRadialGradient(pX, pY, pR * 0.5, pX, pY, pR * 2);
  outerGlow.addColorStop(0, 'rgba(180,160,100,0.08)');
  outerGlow.addColorStop(0.4, 'rgba(100,120,160,0.04)');
  outerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, W, H);

  // Planet body — banded gas giant
  const bodyGrad = ctx.createLinearGradient(pX, pY - pR, pX, pY + pR);
  bodyGrad.addColorStop(0, 'rgba(200,180,130,0.85)');
  bodyGrad.addColorStop(0.15, 'rgba(180,155,100,0.8)');
  bodyGrad.addColorStop(0.3, 'rgba(210,190,140,0.85)');
  bodyGrad.addColorStop(0.45, 'rgba(170,140,90,0.8)');
  bodyGrad.addColorStop(0.55, 'rgba(195,170,120,0.85)');
  bodyGrad.addColorStop(0.7, 'rgba(160,135,85,0.8)');
  bodyGrad.addColorStop(0.85, 'rgba(185,160,110,0.85)');
  bodyGrad.addColorStop(1, 'rgba(140,120,80,0.8)');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(pX, pY, pR * 0.78, 0, Math.PI * 2);
  ctx.fill();

  // Atmospheric band detail — darker stripes
  ctx.save();
  ctx.globalAlpha = 0.15;
  const bandOffsets = [-0.5, -0.2, 0.1, 0.35, 0.6];
  for (const off of bandOffsets) {
    const bY = pY + pR * 0.78 * off;
    const bW = Math.sqrt(1 - off * off) * pR * 0.78 * 2;
    ctx.fillStyle = `rgba(100,80,50,1)`;
    ctx.fillRect(pX - bW / 2, bY - 3, bW, 6 + rng() * 4);
  }
  ctx.restore();

  // Storm spot (like Jupiter's red spot)
  ctx.save();
  ctx.globalAlpha = 0.2;
  const spotGrad = ctx.createRadialGradient(pX + pR * 0.3, pY - pR * 0.15, 0, pX + pR * 0.3, pY - pR * 0.15, 25);
  spotGrad.addColorStop(0, 'rgba(200,120,80,1)');
  spotGrad.addColorStop(0.6, 'rgba(180,100,60,0.5)');
  spotGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = spotGrad;
  ctx.beginPath();
  ctx.ellipse(pX + pR * 0.3, pY - pR * 0.15, 30, 18, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Terminator shadow (dark side gradient)
  const shadow = ctx.createLinearGradient(pX - pR, pY, pX + pR * 0.3, pY);
  shadow.addColorStop(0, 'rgba(0,0,0,0.6)');
  shadow.addColorStop(0.4, 'rgba(0,0,0,0.2)');
  shadow.addColorStop(1, 'transparent');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(pX, pY, pR * 0.78, 0, Math.PI * 2);
  ctx.fill();

  // Limb glow — thin bright edge on the light side
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ddd0a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pX, pY, pR * 0.77, -Math.PI * 0.55, -Math.PI * 0.05);
  ctx.stroke();
  ctx.restore();

  // ── Rings — drawn as tilted ellipses ──
  ctx.save();
  ctx.translate(pX, pY);
  ctx.rotate(-0.15); // slight tilt

  // Ring shadow on planet (behind rings, before drawing them)
  // Outer ring (bright, icy)
  for (let r = 0; r < 3; r++) {
    const innerR = pR * 0.9 + r * pR * 0.12;
    const outerR = innerR + pR * 0.1;
    const ringAlpha = r === 1 ? 0.35 : 0.2;
    const ringColor = r === 0 ? '200,180,140' : r === 1 ? '220,200,160' : '160,150,130';

    // Draw ring as many thin ellipses
    for (let t = innerR; t < outerR; t += 1.5) {
      ctx.globalAlpha = ringAlpha * (1 - Math.abs(t - (innerR + outerR) / 2) / ((outerR - innerR) / 2));
      ctx.strokeStyle = `rgba(${ringColor},1)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, t, t * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Ring gap (Cassini division) — dark line
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = 'rgba(5,10,20,1)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, pR * 1.02, pR * 1.02 * 0.25, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  // ── Distant galaxy smudge ──
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.translate(W * 0.6, H * 0.3);
  ctx.rotate(0.5);
  const galGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
  galGrad.addColorStop(0, 'rgba(200,180,255,1)');
  galGrad.addColorStop(0.5, 'rgba(150,130,200,0.5)');
  galGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = galGrad;
  ctx.scale(2.5, 1);
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Stars ──
  for (let i = 0; i < 700; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const size = i < 550 ? 0.3 + rng() * 0.5 : 0.8 + rng() * 1.4;
    const brightness = i < 550 ? 0.1 + rng() * 0.25 : 0.35 + rng() * 0.6;

    const colorRoll = rng();
    let r = 220, g = 230, b = 255;
    if (colorRoll < 0.1) { r = 255; g = 200; b = 150; }
    else if (colorRoll < 0.15) { r = 180; g = 200; b = 255; }
    else if (colorRoll < 0.2) { r = 255; g = 240; b = 200; }

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${brightness})`;
    ctx.fill();

    if (size > 1.2) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
      glow.addColorStop(0, `rgba(${r},${g},${b},${brightness * 0.15})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
    }
  }

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawNebula(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  cx: number, cy: number, radius: number,
  colorInner: string, colorOuter: string,
): void {
  for (let i = 0; i < 5; i++) {
    const ox = cx + (rng() - 0.5) * radius * 0.6;
    const oy = cy + (rng() - 0.5) * radius * 0.6;
    const r = radius * (0.4 + rng() * 0.6);
    const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    grad.addColorStop(0, colorInner);
    grad.addColorStop(0.6, colorOuter);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
  }
}
