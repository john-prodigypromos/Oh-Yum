// ── Bishop Boss AI (Level 3) ─────────────────────────────
// Same chase-engage-evade dogfighter, but with HP-gated
// escalation phases that increase aggression and fire rate.
// Phase 2 (50% HP) requests 2 drones. Phase 3 (<20% HP)
// goes full berserk.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import type { AIBehavior3D, AIConfig } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';
import { steerToward, steerAway, leadIntercept, chaos, jinkOverlay } from '../Steering';

type Phase = 'chase' | 'engage' | 'overshoot' | 'evade';
type BossPhase = 'phase1' | 'phase2' | 'phase3';

export class BishopBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private cfg: AIConfig;
  private phase: Phase = 'chase';
  private phaseTimer = 0;
  private phaseDuration = 0;
  private timer = 0;
  private seed = 7.19;
  private breakDir = 1;

  // HP-gated boss phases
  private bossPhase: BossPhase = 'phase1';

  // Drone management — read by ArenaLoop
  dronesRequested = 0;
  droneRespawnTimer = 0;
  readonly DRONE_RESPAWN_DELAY = 15;

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
    const hpPct = self.hull / self.maxHull;
    const dist = self.position.distanceTo(target.position);
    const forward = self.getForward();
    const toPlayer = this._tmpVec.subVectors(target.position, self.position).normalize();
    const facing = forward.dot(toPlayer);
    const engageRange = leashRange * 0.5;

    // ── Boss HP phase transitions ──
    if (hpPct <= 0.2 && this.bossPhase !== 'phase3') {
      this.bossPhase = 'phase3';
    } else if (hpPct <= 0.5 && this.bossPhase === 'phase1') {
      this.bossPhase = 'phase2';
      this.dronesRequested = 2;
    }

    // ── Drone respawn timer (Phase 2 only) ──
    if (this.bossPhase === 'phase2') {
      this.droneRespawnTimer += dt;
    }

    // ── Effective tuning based on boss phase ──
    const effectiveSensitivity = this.bossPhase === 'phase3' ? sensitivity * 1.3
      : this.bossPhase === 'phase2' ? sensitivity * 1.1
      : sensitivity;
    const fireRateMult = this.bossPhase === 'phase3' ? 0.3
      : this.bossPhase === 'phase2' ? 0.5
      : 0.7;

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
        leadIntercept(self.position, target.position, target.velocity, 90, this._interceptPt);
        const steer = steerToward(self, this._interceptPt, effectiveSensitivity, 0.7);
        yaw = steer.yaw;
        pitch = steer.pitch;
        thrust = 0.95;
        if (dist < engageRange * 1.3 && facing > this.cfg.fireCone) {
          if (now - self.lastFireTime >= this.fireRate * fireRateMult) fire = true;
        }
        break;
      }

      case 'engage': {
        leadIntercept(self.position, target.position, target.velocity, 100, this._interceptPt);
        const steer = steerToward(self, this._interceptPt, effectiveSensitivity * 1.1, 0.8);
        yaw = steer.yaw;
        pitch = steer.pitch;
        thrust = 1.0;
        if (facing > this.cfg.fireCone) {
          if (now - self.lastFireTime >= this.fireRate * fireRateMult) fire = true;
        }
        break;
      }

      case 'overshoot': {
        const steer = steerAway(self, target.position, effectiveSensitivity * 0.7, 0.5, 0);
        yaw = steer.yaw;
        pitch = steer.pitch - 0.5;
        pitch = Math.max(-1, Math.min(1, pitch));
        thrust = 0.5;
        break;
      }

      case 'evade': {
        const steer = steerAway(self, target.position, effectiveSensitivity, 0.8, this.breakDir * 0.8);
        yaw = steer.yaw;
        pitch = steer.pitch + this.breakDir * 0.3;
        pitch = Math.max(-1, Math.min(1, pitch));
        thrust = 0.85;
        break;
      }
    }

    // ── Jink — escalates with desperation ──
    const baseJink = this.bossPhase === 'phase3' ? 1.0
      : this.bossPhase === 'phase2' ? 0.7
      : 0.4;
    const jinkScale = this.phase === 'evade' ? 1.0 : 0.25;
    const jink = jinkOverlay(this.timer, this.seed, this.cfg.jinkIntensity * baseJink * jinkScale);
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
    // Phase 3 = berserk, much shorter timers
    const berserkScale = this.bossPhase === 'phase3' ? 0.5 : 1;
    const r = (chaos(this.timer, this.seed) + 1) * 0.5;

    switch (phase) {
      case 'chase':     this.phaseDuration = 5; break;
      case 'engage':    this.phaseDuration = (2.0 + r * 2.0) * aggrScale * berserkScale; break;
      case 'overshoot': this.phaseDuration = (0.3 + r * 0.3) * berserkScale; break;
      case 'evade':     this.phaseDuration = (0.4 + r * 0.3) * aggrScale * berserkScale; break;
    }
  }
}
