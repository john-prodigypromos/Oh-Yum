import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export function createStarfieldTexture(scene: Phaser.Scene, key: string): void {
  const canvas = document.createElement('canvas');
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createRadialGradient(GAME_WIDTH * 0.4, GAME_HEIGHT * 0.45, 0, GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, GAME_WIDTH * 0.7);
  bg.addColorStop(0, '#0c1828');
  bg.addColorStop(0.5, '#070e1a');
  bg.addColorStop(1, '#020508');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Nebula
  const neb = ctx.createRadialGradient(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.5, 0, GAME_WIDTH * 0.3, GAME_HEIGHT * 0.5, GAME_WIDTH * 0.3);
  neb.addColorStop(0, 'rgba(20,40,80,0.12)');
  neb.addColorStop(1, 'transparent');
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Stars
  let seed = 42;
  function rng() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  for (let i = 0; i < 500; i++) {
    const x = rng() * GAME_WIDTH;
    const y = rng() * GAME_HEIGHT;
    const size = i < 400 ? 0.3 + rng() * 0.6 : 0.8 + rng() * 1.2;
    const brightness = i < 400 ? 0.1 + rng() * 0.3 : 0.4 + rng() * 0.6;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,230,255,${brightness})`;
    ctx.fill();

    if (size > 1.2) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
      glow.addColorStop(0, `rgba(200,220,255,${brightness * 0.15})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
    }
  }

  scene.textures.addCanvas(key, canvas);
}
