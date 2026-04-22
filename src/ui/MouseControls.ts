// ── Mouse/Trackpad Controls ──────────────────────────────
// Delta-based: only steers while the mouse is actively moving.
// Input decays to zero when the mouse stops — no drift.

export interface MouseInput {
  yaw: number;      // -1 to 1 (left/right turn)
  verticalMove: number; // -1 to 1 (up/down movement)
}

export class MouseControls {
  private yaw = 0;
  private verticalMove = 0;
  private enabled: boolean;

  // How quickly input decays to zero when mouse stops (per second)
  private decayRate = 8;
  // Sensitivity — how many pixels of movement = full turn
  private sensitivity = 400;

  private lastTime = 0;

  constructor() {
    // Only enable on non-touch devices
    this.enabled = !('ontouchstart' in window) || navigator.maxTouchPoints === 0;
    this.lastTime = performance.now();

    if (this.enabled) {
      window.addEventListener('mousemove', (e) => {
        // Accumulate delta movement, scaled by sensitivity
        this.yaw += e.movementX / this.sensitivity;
        this.verticalMove -= e.movementY / this.sensitivity;

        // Clamp to [-1, 1]
        this.yaw = Math.max(-1, Math.min(1, this.yaw));
        this.verticalMove = Math.max(-1, Math.min(1, this.verticalMove));
      });
    }
  }

  getInput(): MouseInput {
    if (!this.enabled) return { yaw: 0, verticalMove: 0 };

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Decay toward zero
    const decay = Math.exp(-this.decayRate * dt);
    this.yaw *= decay;
    this.verticalMove *= decay;

    // Kill tiny residual values
    if (Math.abs(this.yaw) < 0.01) this.yaw = 0;
    if (Math.abs(this.verticalMove) < 0.01) this.verticalMove = 0;

    return { yaw: this.yaw, verticalMove: this.verticalMove };
  }

  isEnabled(): boolean { return this.enabled; }
}
