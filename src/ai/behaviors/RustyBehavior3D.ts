// ── Rusty AI Behavior (3D) ───────────────────────────────
// Enemy roams around the arena, periodically swooping in to
// attack the player then pulling away to a new position.
// Player has to look around to find them.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import { AI } from '../../config';
import type { AIBehavior3D } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';

let enemyIndex = 0;

type Phase = 'roam' | 'approach' | 'attack' | 'retreat';

export class RustyBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private timer = 0;
  private phase: Phase = 'roam';
  private phaseTimer = 0;
  private idx: number;
  private roamTarget = new THREE.Vector3();

  constructor(
    _aimAccuracy: number = AI.RUSTY_AIM_ACCURACY,
    fireRate: number = AI.RUSTY_FIRE_RATE,
    _chaseRange: number = AI.RUSTY_CHASE_RANGE,
  ) {
    this.fireRate = fireRate;
    this.idx = enemyIndex++;
    this.timer = this.idx * 3;
    this.pickNewRoamTarget();
  }

  private pickNewRoamTarget(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 40;
    const y = (Math.random() - 0.5) * 20;
    this.roamTarget.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
  }

  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean } {
    if (!self.alive || !target.alive) {
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.timer += dt;
    this.phaseTimer += dt;

    const distToPlayer = self.position.distanceTo(target.position);

    // Phase transitions
    if (this.phase === 'roam' && this.phaseTimer > 3 + this.idx) {
      this.phase = 'approach';
      this.phaseTimer = 0;
    } else if (this.phase === 'approach' && (distToPlayer < 25 || this.phaseTimer > 4)) {
      this.phase = 'attack';
      this.phaseTimer = 0;
    } else if (this.phase === 'attack' && this.phaseTimer > 3) {
      this.phase = 'retreat';
      this.phaseTimer = 0;
      this.pickNewRoamTarget();
    } else if (this.phase === 'retreat' && (distToPlayer > 40 || this.phaseTimer > 2)) {
      this.phase = 'roam';
      this.phaseTimer = 0;
      this.pickNewRoamTarget();
    }

    let desiredPos = new THREE.Vector3();

    switch (this.phase) {
      case 'roam':
        // Drift toward a random point in the arena
        desiredPos.copy(this.roamTarget);
        // Pick new target if close
        if (self.position.distanceTo(this.roamTarget) < 10) {
          this.pickNewRoamTarget();
        }
        break;

      case 'approach':
        // Fly toward the player
        desiredPos.copy(target.position);
        const approachOffset = new THREE.Vector3(
          Math.sin(this.timer * 0.8 + this.idx) * 15,
          Math.sin(this.timer * 0.5 + this.idx) * 5,
          Math.cos(this.timer * 0.8 + this.idx) * 15,
        );
        desiredPos.add(approachOffset);
        break;

      case 'attack':
        // Circle close to the player, strafing
        const attackAngle = this.timer * 1.5 + this.idx * 2;
        desiredPos.set(
          target.position.x + Math.cos(attackAngle) * 20,
          target.position.y + Math.sin(this.timer * 2) * 5,
          target.position.z + Math.sin(attackAngle) * 20,
        );
        break;

      case 'retreat':
        // Pull away to roam target
        desiredPos.copy(this.roamTarget);
        break;
    }

    // Move toward desired position
    const lerpRate = Math.min(1, dt * 2.5);
    self.position.x += (desiredPos.x - self.position.x) * lerpRate;
    self.position.y += (desiredPos.y - self.position.y) * lerpRate;
    self.position.z += (desiredPos.z - self.position.z) * lerpRate;

    // Face the player
    const lookMat = new THREE.Matrix4();
    lookMat.lookAt(self.position, target.position, new THREE.Vector3(0, 1, 0));
    const lookQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);
    self.group.quaternion.slerp(lookQuat, Math.min(1, dt * 4));

    // Only fire during approach and attack phases
    let fire = false;
    if ((this.phase === 'approach' || this.phase === 'attack') && distToPlayer < 50) {
      if (now - self.lastFireTime >= this.fireRate) {
        fire = true;
      }
    }

    return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire };
  }
}
