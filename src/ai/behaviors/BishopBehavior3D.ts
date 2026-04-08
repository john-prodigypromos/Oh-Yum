// ── Bishop Boss AI (Level 3) ─────────────────────────────
// Mastermind: multi-phase, deploys drones, uses black hole gravity.
// Phase 1 (100-50% HP): Enhanced dogfight
// Phase 2 (50-20% HP): Evasive + 2 drones
// Phase 3 (<20% HP): Desperate charges near black hole

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import type { AIBehavior3D } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';
import { BLACK_HOLE_POS } from '../../systems/EnvironmentLoader';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

type BossPhase = 'phase1' | 'phase2' | 'phase3';
type SubPhase = 'dogfight' | 'breakaway' | 'evasive' | 'charge';

export class BishopBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private bossPhase: BossPhase = 'phase1';
  private subPhase: SubPhase = 'dogfight';
  private phaseTimer = 0;
  private timer = 0;
  private orbitAngle = 0;

  // Drone management — Bishop tells ArenaLoop to spawn drones
  dronesRequested = 0;
  droneRespawnTimer = 0;
  readonly DRONE_RESPAWN_DELAY = 15;

  // Black hole position — imported from EnvironmentLoader
  private readonly BH_POS = BLACK_HOLE_POS;

  // Pre-allocated temp objects to avoid per-frame GC pressure
  private _desiredPos = new THREE.Vector3();
  private _tmpRight = new THREE.Vector3();
  private _tmpBias = new THREE.Vector3();
  private _tmpDir = new THREE.Vector3();
  private _tmpCurveRight = new THREE.Vector3();
  private _tmpToPlayer = new THREE.Vector3();
  private _tmpToBH = new THREE.Vector3();
  private _tmpChargeDir = new THREE.Vector3();
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

  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean } {
    if (!self.alive || !target.alive) {
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.timer += dt;
    this.phaseTimer += dt;
    this.orbitAngle += dt * (0.4 + (this.bossPhase === 'phase1' ? 0.2 : 0));

    const hpPct = self.hull / self.maxHull;
    const distToPlayer = self.position.distanceTo(target.position);
    const desiredPos = this._desiredPos;

    // ── Boss phase transitions based on HP ──
    if (hpPct <= 0.2 && this.bossPhase !== 'phase3') {
      this.bossPhase = 'phase3';
      this.subPhase = 'charge';
      this.phaseTimer = 0;
    } else if (hpPct <= 0.5 && this.bossPhase === 'phase1') {
      this.bossPhase = 'phase2';
      this.subPhase = 'evasive';
      this.phaseTimer = 0;
      this.dronesRequested = 2; // Signal to spawn 2 drones
    }

    // ── Drone respawn management (Phase 2 only) ──
    if (this.bossPhase === 'phase2') {
      this.droneRespawnTimer += dt;
    }

    // ── Sub-phase transitions ──
    switch (this.bossPhase) {
      case 'phase1': {
        // Enhanced standard dogfight — faster, tighter, higher fire rate
        if (this.subPhase === 'dogfight' && this.phaseTimer > 8) {
          this.subPhase = 'breakaway';
          this.phaseTimer = 0;
        } else if (this.subPhase === 'breakaway' && (distToPlayer > 200 || this.phaseTimer > 3)) {
          this.subPhase = 'dogfight';
          this.phaseTimer = 0;
        }
        break;
      }
      case 'phase2': {
        // Evasive — longer breakaways, shorter dogfights
        if (this.subPhase === 'evasive' && this.phaseTimer > 6) {
          this.subPhase = 'dogfight';
          this.phaseTimer = 0;
        } else if (this.subPhase === 'dogfight' && this.phaseTimer > 4) {
          this.subPhase = 'evasive';
          this.phaseTimer = 0;
        }
        break;
      }
      case 'phase3': {
        // Desperate — alternating charges and tight dogfight near black hole
        if (this.subPhase === 'charge' && this.phaseTimer > 2) {
          this.subPhase = 'dogfight';
          this.phaseTimer = 0;
        } else if (this.subPhase === 'dogfight' && this.phaseTimer > 4) {
          this.subPhase = 'charge';
          this.phaseTimer = 0;
        }
        break;
      }
    }

    // ── Movement ──
    switch (this.subPhase) {
      case 'dogfight': {
        const playerFwd = target.getForward();
        this._tmpRight.set(-playerFwd.z, 0, playerFwd.x);
        const combatRadius = this.bossPhase === 'phase1'
          ? 50 + Math.sin(this.timer * 0.8) * 20  // tighter in phase 1
          : 35 + Math.sin(this.timer * 1.0) * 15;  // even tighter in phase 3

        this._tmpBias.copy(playerFwd).multiplyScalar(-35);
        const orbitOffset = Math.sin(this.orbitAngle * 1.5) * combatRadius;
        const verticalBias = Math.cos(this.timer * 0.7) * 20;

        desiredPos.set(
          target.position.x + this._tmpBias.x + this._tmpRight.x * orbitOffset,
          target.position.y + verticalBias,
          target.position.z + this._tmpBias.z + this._tmpRight.z * orbitOffset,
        );
        break;
      }

      case 'breakaway': {
        this._tmpDir.copy(self.position).sub(target.position);
        if (this._tmpDir.length() < 0.1) this._tmpDir.set(1, 0, 0);
        this._tmpDir.normalize();
        this._tmpCurveRight.set(-this._tmpDir.z, 0, this._tmpDir.x);

        desiredPos.copy(self.position);
        desiredPos.addScaledVector(this._tmpDir, 120);
        desiredPos.addScaledVector(this._tmpCurveRight, Math.sin(this.timer * 2) * 50);
        desiredPos.y += Math.sin(this.timer * 1.5) * 20;
        break;
      }

      case 'evasive': {
        // Phase 2: Stay at medium range, dodge erratically, let drones do the work
        const playerFwd = target.getForward();
        this._tmpRight.set(-playerFwd.z, 0, playerFwd.x);
        const evasiveRadius = 120 + Math.sin(this.timer * 1.5) * 40;
        const lateralDodge = Math.sin(this.timer * 3) * 60;
        const verticalDodge = Math.cos(this.timer * 2.5) * 35;

        desiredPos.copy(target.position);
        desiredPos.addScaledVector(playerFwd, evasiveRadius * 0.5);
        desiredPos.addScaledVector(this._tmpRight, lateralDodge);
        desiredPos.y += verticalDodge;
        break;
      }

      case 'charge': {
        // Phase 3: Aggressive charge toward player, pulling closer to black hole
        this._tmpToPlayer.copy(target.position).sub(self.position).normalize();

        // Bias slightly toward the black hole — high risk/reward
        this._tmpToBH.copy(this.BH_POS).sub(self.position).normalize();
        this._tmpChargeDir.copy(this._tmpToPlayer).addScaledVector(this._tmpToBH, 0.3).normalize();

        desiredPos.copy(self.position).addScaledVector(this._tmpChargeDir, 140 * dt);

        // Direct position for charge feel
        self.position.addScaledVector(this._tmpChargeDir, 100 * dt);

        // Face charge direction
        this._tmpLookTarget.copy(self.position).add(this._tmpChargeDir);
        this._lookMat.lookAt(self.position, this._tmpLookTarget, WORLD_UP);
        this._lookQuat.setFromRotationMatrix(this._lookMat);
        self.group.quaternion.slerp(this._lookQuat, Math.min(1, dt * 6));

        // Fire during charge
        const fire = distToPlayer < 250 && now - self.lastFireTime >= this.fireRate * 0.5;
        return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire };
      }
    }

    // Smooth movement
    const lerpRate = this.bossPhase === 'phase1'
      ? Math.min(1, dt * 2.8)
      : Math.min(1, dt * 2.2);
    self.position.x += (desiredPos.x - self.position.x) * lerpRate;
    self.position.y += (desiredPos.y - self.position.y) * lerpRate;
    self.position.z += (desiredPos.z - self.position.z) * lerpRate;

    // Face the player
    this._lookMat.lookAt(self.position, target.position, WORLD_UP);
    this._lookQuat.setFromRotationMatrix(this._lookMat);
    self.group.quaternion.slerp(this._lookQuat, Math.min(1, dt * 4));

    // Fire — more aggressive in later phases
    let fire = false;
    const effectiveRate = this.bossPhase === 'phase3'
      ? this.fireRate * 0.5   // rapid fire in desperation
      : this.bossPhase === 'phase2'
        ? this.fireRate * 0.8 // moderate in evasive
        : this.fireRate * 0.7; // aggressive in phase 1
    if (distToPlayer < 250 && now - self.lastFireTime >= effectiveRate) {
      fire = true;
    }

    return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire };
  }
}
