import Phaser from 'phaser';

export class Bolt {
  graphics: Phaser.GameObjects.Graphics;
  damage: number;
  owner: 'player' | 'enemy';
  spawnTime: number;
  lifetime: number;
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;

  // Bolt colors — hardcoded, no config dependency
  private static PLAYER_COLOR = 0x00ddff;
  private static ENEMY_COLOR = 0xff3322;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    angle: number,
    speed: number,
    damage: number,
    owner: 'player' | 'enemy',
    _textureKey: string,  // kept for API compat, ignored
    lifetime: number,
    gameTime: number,
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    const color = owner === 'player' ? Bolt.PLAYER_COLOR : Bolt.ENEMY_COLOR;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(50);
    this.drawBolt(color);

    this.damage = damage;
    this.owner = owner;
    this.spawnTime = gameTime;
    this.lifetime = lifetime;
    this.alive = true;
  }

  private drawBolt(color: number): void {
    this.graphics.clear();
    // Glow
    this.graphics.fillStyle(color, 0.3);
    this.graphics.fillRect(-3, -10, 6, 20);
    // Core
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRect(-2, -8, 4, 16);
    // Bright center
    this.graphics.fillStyle(0xffffff, 0.6);
    this.graphics.fillRect(-1, -6, 2, 12);
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.graphics.setPosition(this.x, this.y);
    this.graphics.setRotation(this.angle + Math.PI / 2);
  }

  // Compatibility shim — DamageSystem reads sprite.x/y
  get sprite() {
    return {
      x: this.x,
      y: this.y,
      rotation: this.angle + Math.PI / 2,
    } as any;
  }

  isExpired(gameTime: number): boolean {
    return gameTime - this.spawnTime > this.lifetime;
  }

  isOutOfBounds(width: number, height: number): boolean {
    return this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20;
  }

  destroy(): void {
    this.alive = false;
    this.graphics.destroy();
  }
}
