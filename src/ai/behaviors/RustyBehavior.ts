import Phaser from 'phaser';
import { AIBehavior } from '../AIBehavior';
import { Ship } from '../../entities/Ship';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { PhysicsSystem, InputState } from '../../systems/PhysicsSystem';
import { AI } from '../../config';
import { angleDiff } from '../../utils/math';

export class RustyBehavior implements AIBehavior {
  update(
    ship: Ship,
    target: Ship,
    _delta: number,
    scene: Phaser.Scene,
    weapons: WeaponSystem,
    physics: PhysicsSystem,
    gameTime: number,
  ): void {
    if (!ship.alive || !target.alive) return;

    const dx = target.sprite.x - ship.sprite.x;
    const dy = target.sprite.y - ship.sprite.y;
    const angleToTarget = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);

    const diff = angleDiff(ship.rotation, angleToTarget);

    // Set input for physics system (consumed inside fixed timestep)
    const input: InputState = { rotateDir: 0, thrust: 0 };

    if (Math.abs(diff) > 0.05) {
      input.rotateDir = Math.sign(diff);
    }

    if (Math.abs(diff) < 0.5 && dist > 100) {
      input.thrust = 1;
    }

    physics.setInput(ship, input);

    // Fire when facing player
    if (Math.abs(diff) < 0.3 && dist < AI.RUSTY_CHASE_RANGE) {
      weapons.fireBlaster(scene, ship, 'enemy', gameTime, AI.RUSTY_FIRE_RATE);
    }
  }
}
