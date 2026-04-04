import Phaser from 'phaser';
import { SHIP } from '../config';
import { rotationToFrame } from '../ships/ShipSpriteGenerator';

export interface ShipConfig {
  hull: number;
  shield: number;
  speedMult: number;
  rotationMult: number;
  textureKey: string;
  hitboxRadius: number;
}

export class Ship {
  sprite: Phaser.Physics.Arcade.Sprite;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  speedMult: number;
  rotationMult: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  iframesUntil: number;
  lastDamageTime: number;
  alive: boolean;
  lastFireTime: number;
  smokeEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: ShipConfig) {
    this.sprite = scene.physics.add.sprite(x, y, config.textureKey, 0);
    this.sprite.setCircle(config.hitboxRadius);
    this.sprite.setOffset(
      this.sprite.width / 2 - config.hitboxRadius,
      this.sprite.height / 2 - config.hitboxRadius,
    );

    this.hull = config.hull;
    this.maxHull = config.hull;
    this.shield = config.shield;
    this.maxShield = config.shield;
    this.speedMult = config.speedMult;
    this.rotationMult = config.rotationMult;
    this.rotation = -Math.PI / 2;
    this.velocityX = 0;
    this.velocityY = 0;
    this.iframesUntil = 0;
    this.lastDamageTime = 0;
    this.alive = true;
    this.lastFireTime = 0;
  }

  /**
   * Update the sprite frame to match the current rotation angle.
   * Call this instead of sprite.setRotation().
   */
  updateSpriteFrame(): void {
    const frame = rotationToFrame(this.rotation);
    this.sprite.setFrame(frame);
  }

  /** Check invincibility — pass current game time (ms) */
  isInvincible(time: number): boolean {
    return time < this.iframesUntil;
  }

  applyDamage(amount: number, pierceShield: boolean, time: number): number {
    if (!this.alive) return 0;

    let remaining = amount;

    if (!pierceShield && this.shield > 0) {
      const shieldAbsorb = Math.min(this.shield, remaining);
      this.shield -= shieldAbsorb;
      remaining -= shieldAbsorb;
    }

    if (remaining > 0) {
      this.hull = Math.max(0, this.hull - remaining);
    }

    this.lastDamageTime = time;

    if (this.hull <= 0) {
      this.alive = false;
    }

    return remaining;
  }

  /** Returns 0 (full health) to 1 (dead) */
  get damagePct(): number {
    return 1 - (this.hull / this.maxHull);
  }

  /**
   * Apply progressive visual damage:
   * - Tint shifts from white → orange → red as hull drops
   * - Scale gets slightly warped/uneven (looks "bent")
   * - Smoke particles at low hull
   */
  updateDamageVisuals(time: number): void {
    const dmg = this.damagePct;

    // ── Tint: white → orange → red ──
    if (dmg < 0.2) {
      this.sprite.clearTint();
    } else if (dmg < 0.5) {
      // Light orange tint
      this.sprite.setTint(0xffcc88);
    } else if (dmg < 0.75) {
      // Orange tint
      this.sprite.setTint(0xff8844);
    } else {
      // Red tint, flickering
      const flicker = Math.sin(time * 0.01) > 0 ? 0xff4422 : 0xff6633;
      this.sprite.setTint(flicker);
    }

    // ── Scale warp: ship looks bent/deformed at high damage ──
    if (dmg < 0.3) {
      this.sprite.setScale(1, 1);
    } else {
      // Asymmetric scale — one axis shrinks slightly, wobbles
      const wobble = Math.sin(time * 0.005) * dmg * 0.08;
      const shrink = 1 - dmg * 0.15;
      this.sprite.setScale(shrink + wobble, shrink - wobble);
    }

    // ── Smoke particles at < 50% hull ──
    if (this.smokeEmitter) {
      if (dmg > 0.5) {
        this.smokeEmitter.setPosition(this.sprite.x, this.sprite.y);
        this.smokeEmitter.setFrequency(dmg > 0.75 ? 30 : 80);
        if (!this.smokeEmitter.emitting) {
          this.smokeEmitter.start();
        }
      } else {
        if (this.smokeEmitter.emitting) {
          this.smokeEmitter.stop();
        }
      }
    }
  }

  updateShieldRegen(time: number): void {
    if (this.shield >= this.maxShield) return;
    if (this.maxShield === 0) return;
    if (time - this.lastDamageTime < SHIP.SHIELD_REGEN_DELAY) return;

    this.shield = Math.min(
      this.maxShield,
      this.shield + SHIP.SHIELD_REGEN_RATE / 60,
    );
  }
}
