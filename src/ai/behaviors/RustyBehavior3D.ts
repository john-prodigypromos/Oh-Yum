// ── Rusty AI (Grunt Dogfighter) ──────────────────────────
// Top Gun maneuvers: split-S, dive-and-pull, high-G break,
// scissors, throttle-cut, Immelmann climb.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import type { AIBehavior3D, AIConfig } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';
import { steerToward, steerAway, leadIntercept, chaos } from '../Steering';

let enemyIndex = 0;

type Phase = 'chase' | 'engage' | 'overshoot' | 'evade';
type Maneuver = 'break_turn' | 'dive_pull' | 'climb_roll' | 'split_s' | 'scissors' | 'throttle_cut';

export class RustyBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private cfg: AIConfig;
  private phase: Phase = 'chase';
  private phaseTimer = 0;
  private phaseDuration = 0;
  private timer = 0;
  private idx: number;
  private seed: number;

  private maneuver: Maneuver = 'break_turn';
  private maneuverDir = 1; // +1 or -1 for left/right

  private prevYaw = 0;
  private prevPitch = 0;

  private _interceptPt = new THREE.Vector3();
  private _tmpVec = new THREE.Vector3();

  constructor(_aimAccuracy: number, fireRate: number, _chaseRange: number, cfg: AIConfig) {
    this.fireRate = fireRate;
    this.cfg = cfg;
    this.idx = enemyIndex++;
    this.seed = this.idx * 2.17;
    this.timer = this.idx * 2.5;
    this.phaseTimer = this.idx * 0.8;
    this.maneuverDir = this.idx % 2 === 0 ? 1 : -1;
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
    const engageRange = leashRange * 0.55;

    if (dist > leashRange && this.phase !== 'chase') this._setPhase('chase');

    switch (this.phase) {
      case 'chase':
        if (dist < engageRange && facing > 0.35) this._setPhase('engage');
        break;
      case 'engage':
        if (facing < -0.3 && dist < 80) this._setPhase('overshoot');
        else if (this.phaseTimer > this.phaseDuration || dist > leashRange * 0.7) this._setPhase('evade');
        else if (facing < -0.15) this._setPhase('evade');
        break;
      case 'overshoot':
        if (this.phaseTimer > this.phaseDuration) this._setPhase('chase');
        break;
      case 'evade':
        if (this.phaseTimer > this.phaseDuration) this._setPhase('chase');
        break;
    }

    let yaw = 0, pitch = 0, thrust = 0.7, fire = false;
    let smooth = true;

    switch (this.phase) {
      case 'chase': {
        leadIntercept(self.position, target.position, target.velocity, 100, this._interceptPt);
        this._interceptPt.y += (this.idx % 3 - 1) * 15;
        const steer = steerToward(self, this._interceptPt, sensitivity * 1.2, 0.5);
        yaw = steer.yaw;
        pitch = steer.pitch;
        thrust = facing > 0.3 ? 1.0 : 0.5;
        if (dist < engageRange * 1.3 && facing > this.cfg.fireCone) {
          if (now - self.lastFireTime >= this.fireRate) fire = true;
        }
        break;
      }
      case 'engage': {
        leadIntercept(self.position, target.position, target.velocity, 120, this._interceptPt);
        const steer = steerToward(self, this._interceptPt, sensitivity * 1.4, 0.6);
        yaw = steer.yaw;
        pitch = steer.pitch;
        thrust = 1.0;
        if (facing > this.cfg.fireCone) {
          if (now - self.lastFireTime >= this.fireRate * 0.5) fire = true;
        }
        break;
      }
      case 'overshoot': {
        // High-speed flyby — maintain speed, pull up
        yaw = 0;
        pitch = -0.7; // nose up
        thrust = 1.0;
        smooth = false;
        break;
      }
      case 'evade': {
        smooth = false;
        const t = this.phaseTimer;
        const d = this.maneuverDir;
        const I = 0.6 + this.cfg.aggression * 0.4; // intensity

        switch (this.maneuver) {
          case 'break_turn':
            // Sustained high-G turn in one direction — classic break
            yaw = d * I;
            pitch = -0.3 * I; // slight climb during break
            thrust = 1.0;
            break;

          case 'dive_pull':
            // Dive hard for first half, then pull up hard — altitude change
            if (t < this.phaseDuration * 0.45) {
              yaw = 0;
              pitch = 0.9 * I; // nose down — dive
              thrust = 1.0;
            } else {
              yaw = d * 0.3;
              pitch = -0.9 * I; // nose up — pull out
              thrust = 0.8;
            }
            break;

          case 'climb_roll':
            // Immelmann — climb hard then break to one side
            if (t < this.phaseDuration * 0.5) {
              yaw = 0;
              pitch = -I; // climb
              thrust = 1.0;
            } else {
              yaw = d * I; // roll into turn
              pitch = 0;
              thrust = 0.9;
            }
            break;

          case 'split_s':
            // Split-S — nose down then pull through
            if (t < this.phaseDuration * 0.3) {
              yaw = 0;
              pitch = 0.8 * I; // nose down
              thrust = 0.6;
            } else {
              yaw = d * 0.2;
              pitch = -0.7 * I; // pull through
              thrust = 1.0;
            }
            break;

          case 'scissors':
            // Tight alternating crosses — rapid direction changes
            const scissorPeriod = 0.7; // switch every 0.7s
            const scissorPhase = Math.floor(t / scissorPeriod) % 2;
            yaw = scissorPhase === 0 ? d * I : -d * I;
            pitch = (scissorPhase === 0 ? -0.3 : 0.3) * I;
            thrust = 0.7;
            break;

          case 'throttle_cut':
            // Cut throttle to force overshoot, then gun it
            if (t < this.phaseDuration * 0.35) {
              yaw = d * 0.3;
              pitch = 0;
              thrust = 0; // idle — player overshoots
            } else {
              yaw = d * I;
              pitch = -0.4 * I;
              thrust = 1.0; // burst out
            }
            break;
        }

        if (dist < engageRange && facing > this.cfg.fireCone + 0.1) {
          if (now - self.lastFireTime >= this.fireRate * 1.5) fire = true;
        }
        break;
      }
    }

    if (smooth) {
      yaw = yaw * 0.3 + this.prevYaw * 0.7;
      pitch = pitch * 0.3 + this.prevPitch * 0.7;
    }
    this.prevYaw = yaw;
    this.prevPitch = pitch;

    yaw = Math.max(-1, Math.min(1, yaw));
    pitch = Math.max(-1, Math.min(1, pitch));

    return { yaw, pitch, roll: -yaw * 0.6, thrust, fire };
  }

  private _setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTimer = 0;
    const r = (chaos(this.timer, this.seed) + 1) * 0.5;

    switch (phase) {
      case 'chase':     this.phaseDuration = 5; break;
      case 'engage':    this.phaseDuration = 1.5 + r * 2.0; break;
      case 'overshoot': this.phaseDuration = 0.8 + r * 0.5; break; // longer flyby
      case 'evade': {
        this.phaseDuration = 2.5 + r * 1.5; // 2.5-4s
        this.maneuverDir *= -1; // alternate sides each evade

        // Pick a random maneuver
        const maneuvers: Maneuver[] = [
          'break_turn', 'break_turn',  // 2x weight — most common
          'dive_pull', 'dive_pull',    // 2x weight — dramatic altitude change
          'climb_roll',                // Immelmann
          'split_s',                   // split-S
          'scissors',                  // close-range scissors
          'throttle_cut',              // speed trap
        ];
        const pick = Math.floor((chaos(this.timer * 5, this.seed) + 1) * 0.5 * maneuvers.length) % maneuvers.length;
        this.maneuver = maneuvers[pick];

        this.prevYaw = 0;
        this.prevPitch = 0;
        break;
      }
    }
  }
}
