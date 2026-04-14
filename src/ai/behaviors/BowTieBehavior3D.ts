// ── Bow Tie Boss AI (Level 2) ────────────────────────────
// Fast darting dogfighter — tighter turns, quicker transitions,
// shorter evade windows. Same chase-engage-evade core.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import type { AIBehavior3D, AIConfig } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';
import { steerToward, steerAway, leadIntercept, chaos, jinkOverlay } from '../Steering';

type Phase = 'chase' | 'engage' | 'overshoot' | 'evade';

export class BowTieBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private cfg: AIConfig;
  private phase: Phase = 'chase';
  private phaseTimer = 0;
  private phaseDuration = 0;
  private timer = 0;
  private seed = 5.43;
  private breakDir = 1;

  // Pre-allocated temp vectors
  private _interceptPt = new THREE.Vector3();
  private _tmpVec = new THREE.Vector3();

  constructor(
    _aimAccuracy: number,
    fireRate: number,
    _chaseRange: number,
    cfg: AIConfig,
  ) {
    this.fireRate = fireRate;
    this.cfg = cfg;
    this._setPhase('chase');
  }

  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean } {
    if (!self.alive || !target.alive) {
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.timer += dt;
    this.phaseTimer += dt;

    const { sensitivity, leashRange } = this.cfg;
    const dist = self.position.distanceTo(target.position);
    const forward = self.getForward();
    const toPlayer = this._tmpVec.subVectors(target.position, self.position).normalize();
    const facing = forward.dot(toPlayer);
    const engageRange = leashRange * 0.5;

    // ── Distance leash ──
    if (dist > leashRange && this.phase !== 'chase') {
      this._setPhase('chase');
    }

    // ── Phase transitions ──
    switch (this.phase) {
      case 'chase':
        if (dist < engageRange && facing > 0.35) {
          this._setPhase('engage');
        }
        break;

      case 'engage':
        if (facing < -0.3 && dist < 80) {
          this._setPhase('overshoot');
        } else if (this.phaseTimer > this.phaseDuration || dist > leashRange * 0.7) {
          this.breakDir *= -1;
          this._setPhase('evade');
        } else if (facing < -0.2) {
          this.breakDir *= -1;
          this._setPhase('evade');
        }
        break;

      case 'overshoot':
        if (this.phaseTimer > this.phaseDuration) {
          this._setPhase('chase');
        }
        break;

      case 'evade':
        // Rolling scissors — quick re-engage if aligned
        if (facing > 0.45 && dist < engageRange) {
          this._setPhase('engage');
        } else if (this.phaseTimer > this.phaseDuration) {
          this._setPhase('chase');
        }
        break;
    }

    // ── Steering ──
    let yaw = 0;
    let pitch = 0;
    let thrust = 0.7;
    let fire = false;

    switch (this.phase) {
      case 'chase': {
        leadIntercept(self.position, target.position, target.velocity, 120, this._interceptPt);
        const steer = steerToward(self, this._interceptPt, sensitivity * 1.2, 0.7);
        yaw = steer.yaw;
        pitch = steer.pitch;
        thrust = 0.95;
        if (dist < engageRange * 1.3 && facing > this.cfg.fireCone) {
          if (now - self.lastFireTime >= this.fireRate * 0.7) fire = true;
        }
        break;
      }

      case 'engage': {
        leadIntercept(self.position, target.position, target.velocity, 120, this._interceptPt);
        const steer = steerToward(self, this._interceptPt, sensitivity * 1.2, 0.8);
        yaw = steer.yaw;
        pitch = steer.pitch;
        thrust = 1.0;
        // Very aggressive fire
        if (facing > this.cfg.fireCone) {
          if (now - self.lastFireTime >= this.fireRate * 0.4) fire = true;
        }
        break;
      }

      case 'overshoot': {
        const steer = steerAway(self, target.position, sensitivity * 0.8, 0.5, 0);
        yaw = steer.yaw;
        pitch = steer.pitch - 0.5;
        pitch = Math.max(-1, Math.min(1, pitch));
        thrust = 0.5;
        break;
      }

      case 'evade': {
        // Tight, fast break turns
        const steer = steerAway(self, target.position, sensitivity * 1.1, 0.8, this.breakDir * 0.9);
        yaw = steer.yaw;
        pitch = steer.pitch + this.breakDir * 0.35;
        pitch = Math.max(-1, Math.min(1, pitch));
        thrust = 0.9;
        break;
      }
    }

    // ── Jink overlay ──
    const jinkScale = this.phase === 'evade' ? 1.0 : 0.2;
    const jink = jinkOverlay(this.timer, this.seed, this.cfg.jinkIntensity * jinkScale);
    yaw += jink.yaw;
    pitch += jink.pitch;

    yaw = Math.max(-1, Math.min(1, yaw));
    pitch = Math.max(-1, Math.min(1, pitch));
    const roll = -yaw * 0.6;

    return { yaw, pitch, roll, thrust, fire };
  }

  private _setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTimer = 0;
    const aggrScale = 1 - this.cfg.aggression * 0.4;
    const r = (chaos(this.timer, this.seed) + 1) * 0.5;

    switch (phase) {
      case 'chase':     this.phaseDuration = 5; break;
      case 'engage':    this.phaseDuration = (2.0 + r * 1.5) * aggrScale; break; // longer engage
      case 'overshoot': this.phaseDuration = 0.25 + r * 0.25; break;             // quick recovery
      case 'evade':     this.phaseDuration = (0.35 + r * 0.25) * aggrScale; break; // very short breaks
    }
  }
}
