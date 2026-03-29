import { Ship } from '../entities/Ship';
import { PHYSICS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { dragPerStep } from '../utils/math';

export class PhysicsSystem {
  private accumulator = 0;
  private readonly dt = PHYSICS.FIXED_TIMESTEP / 1000;

  update(delta: number, ships: Ship[]): void {
    this.accumulator += delta;

    while (this.accumulator >= PHYSICS.FIXED_TIMESTEP) {
      this.accumulator -= PHYSICS.FIXED_TIMESTEP;

      for (const ship of ships) {
        if (!ship.alive) continue;
        this.stepShip(ship);
      }
    }
  }

  private stepShip(ship: Ship): void {
    const drag = dragPerStep(PHYSICS.DRAG_HALF_LIFE, this.dt);
    ship.velocityX *= drag;
    ship.velocityY *= drag;

    const speed = Math.sqrt(ship.velocityX ** 2 + ship.velocityY ** 2);
    const maxSpeed = PHYSICS.MAX_VELOCITY * ship.speedMult;
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      ship.velocityX *= scale;
      ship.velocityY *= scale;
    }

    const newX = ship.sprite.x + ship.velocityX * this.dt;
    const newY = ship.sprite.y + ship.velocityY * this.dt;

    const r = ship.sprite.width / 2;
    let finalX = newX;
    let finalY = newY;

    if (newX - r < 0) {
      finalX = r;
      ship.velocityX = Math.abs(ship.velocityX) * PHYSICS.WALL_BOUNCE_FACTOR;
    } else if (newX + r > GAME_WIDTH) {
      finalX = GAME_WIDTH - r;
      ship.velocityX = -Math.abs(ship.velocityX) * PHYSICS.WALL_BOUNCE_FACTOR;
    }

    if (newY - r < 0) {
      finalY = r;
      ship.velocityY = Math.abs(ship.velocityY) * PHYSICS.WALL_BOUNCE_FACTOR;
    } else if (newY + r > GAME_HEIGHT) {
      finalY = GAME_HEIGHT - r;
      ship.velocityY = -Math.abs(ship.velocityY) * PHYSICS.WALL_BOUNCE_FACTOR;
    }

    ship.sprite.setPosition(finalX, finalY);
    ship.sprite.setRotation(ship.rotation + Math.PI / 2);
  }

  applyThrust(ship: Ship, amount: number): void {
    const thrust = PHYSICS.THRUST * ship.speedMult * amount;
    ship.velocityX += Math.cos(ship.rotation) * thrust * this.dt;
    ship.velocityY += Math.sin(ship.rotation) * thrust * this.dt;
  }

  applyRotation(ship: Ship, direction: number): void {
    const rotSpeed = PHYSICS.ROTATION_SPEED * ship.rotationMult;
    ship.rotation += rotSpeed * direction * this.dt;
  }
}
