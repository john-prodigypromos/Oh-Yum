// ── Bolo Tie Boss AI (Level 1) ───────────────────────────
// Same chase-engage-evade dogfighter as Rusty, but with an
// afterburner charge during ENGAGE that deals 3x collision
// damage (consumed by ArenaLoop via `isCharging` flag).

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import type { AIBehavior3D, AIConfig } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';
import { steerToward, steerAway, leadIntercept, chaos, jinkOverlay } from '../Steering';

type Phase = 'chase' | 'engage' | 'overshoot' | 'evade';

export class BoloTieBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private cfg: AIConfig;
  private phase: Phase = 'chase';
  private phaseTimer = 0;
  private phaseDuration = 0;
  private timer = 0;
  private seed = 3.71;
  private breakDir = 1;

  /** Whether a charge is active (read by ArenaLoop for 3x collision damage). */
  isCharging = false;

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
      this.isCharging = false;
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.timer += dt;
    this.phaseTimer += dt;
    this.isCharging = false;

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
        if (dist < engageRange && facing > 0.4) {
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
        if (facing > 0.5 && dist < engageRange) {
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
        leadIntercept(self.position, target.position, target.velocity, 95, this._interceptPt);
        const steer = steerToward(self, this._interceptPt, sensitivity * 1.1, 0.7);
        yaw = steer.yaw;
        pitch = steer.pitch;
        thrust = 0.95;
        if (dist < engageRange * 1.3 && facing > this.cfg.fireCone) {
          if (now - self.lastFireTime >= this.fireRate * 0.8) fire = true;
        }
        break;
      }

      case 'engage': {
        // Afterburner charge — set flag for ArenaLoop 3x collision damage
        this.isCharging = true;
        leadIntercept(self.position, target.position, target.velocity, 110, this._interceptPt);
        const steer = steerToward(self, this._interceptPt, sensitivity, 0.8);
        yaw = steer.yaw;
        pitch = steer.pitch;
        thrust = 1.0;

        // Afterburner velocity boost
        const chargeFwd = self.getForward();
        self.velocity.addScaledVector(chargeFwd, 80 * dt);
        const spd = self.velocity.length();
        if (spd > 100 * self.speedMult) self.velocity.setLength(100 * self.speedMult);

        // Aggressive fire
        if (facing > this.cfg.fireCone) {
          if (now - self.lastFireTime >= this.fireRate * 0.4) fire = true;
        }
        break;
      }

      case 'overshoot': {
        this.isCharging = false;
        const steer = steerAway(self, target.position, sensitivity * 0.7, 0.5, 0);
        yaw = steer.yaw;
        pitch = steer.pitch - 0.5;
        pitch = Math.max(-1, Math.min(1, pitch));
        thrust = 0.5;
        break;
      }

      case 'evade': {
        const steer = steerAway(self, target.position, sensitivity, 0.8, this.breakDir * 0.9);
        yaw = steer.yaw;
        pitch = steer.pitch + this.breakDir * 0.3;
        pitch = Math.max(-1, Math.min(1, pitch));
        thrust = 0.85;
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
    if (phase !== 'engage') this.isCharging = false;
    const aggrScale = 1 - this.cfg.aggression * 0.4;
    const r = (chaos(this.timer, this.seed) + 1) * 0.5;

    switch (phase) {
      case 'chase':     this.phaseDuration = 5; break;
      case 'engage':    this.phaseDuration = (1.8 + r * 1.2) * aggrScale; break; // 1.8-3s
      case 'overshoot': this.phaseDuration = 0.3 + r * 0.3; break;
      case 'evade':     this.phaseDuration = (0.4 + r * 0.3) * aggrScale; break; // shorter breaks
    }
  }
}
