// ── Bolo Tie Boss AI (Level 1) ───────────────────────────
// Brute: ram charges, wide turns, slow but hits hard.
// Telegraphed charge with engine flare, 3x collision damage.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import type { AIBehavior3D } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

type Phase = 'dogfight' | 'charge_telegraph' | 'charging' | 'charge_cooldown' | 'breakaway';

export class BoloTieBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private phase: Phase = 'dogfight';
  private phaseTimer = 0;
  private timer = 0;
  private orbitAngle = 0;
  private chargeDir = new THREE.Vector3();
  private chargeCooldown = 5;

  // Pre-allocated temp objects to avoid per-frame GC pressure
  private _desiredPos = new THREE.Vector3();
  private _tmpRight = new THREE.Vector3();
  private _tmpBias = new THREE.Vector3();
  private _tmpDir = new THREE.Vector3();
  private _tmpCurveRight = new THREE.Vector3();
  private _tmpLookTarget = new THREE.Vector3();
  private _lookMat = new THREE.Matrix4();
  private _lookQuat = new THREE.Quaternion();

  constructor(
    _aimAccuracy: number,
    fireRate: number,
    _chaseRange: number,
  ) {
    this.fireRate = fireRate;
  }

  /** Whether a charge just landed (for 3x collision damage in ArenaLoop). */
  isCharging = false;

  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean } {
    if (!self.alive || !target.alive) {
      this.isCharging = false;
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.timer += dt;
    this.phaseTimer += dt;
    this.orbitAngle += dt * 0.25; // wide, slow orbit

    const distToPlayer = self.position.distanceTo(target.position);
    const desiredPos = this._desiredPos;
    this.isCharging = false;

    // ── Phase transitions ──
    switch (this.phase) {
      case 'dogfight':
        if (this.phaseTimer > this.chargeCooldown && distToPlayer < 300) {
          this.phase = 'charge_telegraph';
          this.phaseTimer = 0;
        }
        break;
      case 'charge_telegraph':
        if (this.phaseTimer > 0.5) {
          // Lock charge direction toward player
          this.chargeDir.subVectors(target.position, self.position).normalize();
          this.phase = 'charging';
          this.phaseTimer = 0;
        }
        break;
      case 'charging':
        if (this.phaseTimer > 1.5 || distToPlayer < 25) {
          this.phase = 'charge_cooldown';
          this.phaseTimer = 0;
        }
        break;
      case 'charge_cooldown':
        if (this.phaseTimer > 2) {
          this.phase = 'breakaway';
          this.phaseTimer = 0;
        }
        break;
      case 'breakaway':
        if (distToPlayer > 180 || this.phaseTimer > 3) {
          this.phase = 'dogfight';
          this.phaseTimer = 0;
        }
        break;
    }

    // ── Movement per phase ──
    switch (this.phase) {
      case 'dogfight': {
        // Standard orbit — wide turns (0.4x rotation feel via slow orbit)
        const playerFwd = target.getForward();
        this._tmpRight.set(-playerFwd.z, 0, playerFwd.x);
        this._tmpBias.copy(playerFwd).multiplyScalar(-30);
        const orbitOffset = Math.sin(this.orbitAngle) * 80;
        const verticalBob = Math.cos(this.timer * 0.4) * 20;

        desiredPos.set(
          target.position.x + this._tmpBias.x + this._tmpRight.x * orbitOffset,
          target.position.y + verticalBob,
          target.position.z + this._tmpBias.z + this._tmpRight.z * orbitOffset,
        );
        break;
      }

      case 'charge_telegraph': {
        // Hold position, face player — engine flare visual (handled by caller)
        desiredPos.copy(self.position);
        break;
      }

      case 'charging': {
        // Rush at 2x speed toward locked charge direction
        this.isCharging = true;
        desiredPos.copy(self.position).addScaledVector(this.chargeDir, 200 * dt * 2);

        // Direct position movement for charge (bypass lerp)
        self.position.addScaledVector(this.chargeDir, 160 * dt);

        // Face charge direction
        this._tmpLookTarget.copy(self.position).add(this.chargeDir);
        this._lookMat.lookAt(self.position, this._tmpLookTarget, WORLD_UP);
        this._lookQuat.setFromRotationMatrix(this._lookMat);
        self.group.quaternion.slerp(this._lookQuat, Math.min(1, dt * 8));

        return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
      }

      case 'charge_cooldown': {
        // Drift forward slowly after charge
        const fwd = self.getForward();
        desiredPos.copy(self.position).addScaledVector(fwd, 40);
        break;
      }

      case 'breakaway': {
        this._tmpDir.copy(self.position).sub(target.position).normalize();
        this._tmpCurveRight.set(-this._tmpDir.z, 0, this._tmpDir.x);
        desiredPos.copy(self.position);
        desiredPos.addScaledVector(this._tmpDir, 100);
        desiredPos.addScaledVector(this._tmpCurveRight, Math.sin(this.timer * 1.5) * 40);
        break;
      }
    }

    // Smooth movement (slower lerp = wider turns)
    const lerpRate = Math.min(1, dt * 1.5);
    self.position.x += (desiredPos.x - self.position.x) * lerpRate;
    self.position.y += (desiredPos.y - self.position.y) * lerpRate;
    self.position.z += (desiredPos.z - self.position.z) * lerpRate;

    // Face the player
    this._lookMat.lookAt(self.position, target.position, WORLD_UP);
    this._lookQuat.setFromRotationMatrix(this._lookMat);
    self.group.quaternion.slerp(this._lookQuat, Math.min(1, dt * 3));

    // Fire during dogfight and charge_cooldown
    let fire = false;
    if ((this.phase === 'dogfight' || this.phase === 'charge_cooldown') && distToPlayer < 200) {
      if (now - self.lastFireTime >= this.fireRate) {
        fire = true;
      }
    }

    return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire };
  }
}
