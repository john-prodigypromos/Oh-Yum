// ── Nav Beacon HUD ───────────────────────────────────────
// Screen-edge arrow that always points toward a target position.
// Shows distance in meters. Glowing cyan style.

import * as THREE from 'three';

export class NavBeacon {
  private el: HTMLDivElement;
  private arrowEl: HTMLDivElement;
  private distEl: HTMLDivElement;
  private labelEl: HTMLDivElement;
  private target: THREE.Vector3;
  private _visible = true;

  constructor(label: string = 'NAV') {
    this.target = new THREE.Vector3();

    this.el = document.createElement('div');
    this.el.style.cssText = `
      position:fixed;pointer-events:none;z-index:25;
      display:flex;flex-direction:column;align-items:center;gap:2px;
      transition:opacity 0.3s;
    `;

    this.arrowEl = document.createElement('div');
    this.arrowEl.style.cssText = `
      width:0;height:0;
      border-left:12px solid transparent;
      border-right:12px solid transparent;
      border-bottom:24px solid #00ffff;
      filter:drop-shadow(0 0 8px rgba(0,255,255,0.7));
      transition:transform 0.1s;
    `;
    this.el.appendChild(this.arrowEl);

    this.distEl = document.createElement('div');
    this.distEl.style.cssText = `
      font-family:var(--font-display,'Rajdhani',sans-serif);
      font-size:11px;font-weight:700;color:#00ffff;
      letter-spacing:2px;text-shadow:0 0 6px rgba(0,255,255,0.5);
    `;
    this.el.appendChild(this.distEl);

    this.labelEl = document.createElement('div');
    this.labelEl.textContent = label;
    this.labelEl.style.cssText = `
      font-family:var(--font-display,'Rajdhani',sans-serif);
      font-size:9px;font-weight:600;color:rgba(0,255,255,0.6);
      letter-spacing:3px;
    `;
    this.el.appendChild(this.labelEl);

    document.getElementById('ui-overlay')?.appendChild(this.el);
  }

  setTarget(pos: THREE.Vector3): void {
    this.target.copy(pos);
  }

  setLabel(label: string): void {
    this.labelEl.textContent = label;
  }

  update(camera: THREE.PerspectiveCamera, playerPos: THREE.Vector3): void {
    if (!this._visible) return;

    const dist = playerPos.distanceTo(this.target);

    // Format distance
    if (dist > 1000) {
      this.distEl.textContent = `${(dist / 1000).toFixed(1)}km`;
    } else {
      this.distEl.textContent = `${Math.round(dist)}m`;
    }

    // Project target to screen space
    const screenPos = this.target.clone().project(camera);
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;

    let sx = screenPos.x * hw + hw;
    let sy = -screenPos.y * hh + hh;

    // Check if target is behind camera
    const toTarget = new THREE.Vector3().subVectors(this.target, camera.position);
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const behind = toTarget.dot(camDir) < 0;

    if (behind) {
      // Flip to opposite side when behind
      sx = window.innerWidth - sx;
      sy = window.innerHeight - sy;
    }

    // Clamp to screen edges with margin
    const margin = 50;
    const onScreen = !behind &&
      sx > margin && sx < window.innerWidth - margin &&
      sy > margin && sy < window.innerHeight - margin;

    if (onScreen) {
      // Target is on screen — show arrow at target position
      this.el.style.left = `${sx}px`;
      this.el.style.top = `${sy}px`;
      this.el.style.transform = 'translate(-50%, -50%)';
      this.arrowEl.style.transform = 'rotate(180deg)'; // point down at target
      this.el.style.opacity = dist < 30 ? '0.3' : '0.9';
    } else {
      // Clamp to edge — arrow points toward target
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = sx - cx;
      const dy = sy - cy;
      const angle = Math.atan2(dy, dx);

      // Find edge intersection
      const edgeX = Math.max(margin, Math.min(window.innerWidth - margin, cx + Math.cos(angle) * (hw - margin)));
      const edgeY = Math.max(margin, Math.min(window.innerHeight - margin, cy + Math.sin(angle) * (hh - margin)));

      this.el.style.left = `${edgeX}px`;
      this.el.style.top = `${edgeY}px`;
      this.el.style.transform = 'translate(-50%, -50%)';
      // Rotate arrow to point toward target
      const arrowAngle = angle - Math.PI / 2; // CSS rotation offset
      this.arrowEl.style.transform = `rotate(${arrowAngle}rad)`;
      this.el.style.opacity = '1';
    }
  }

  show(): void {
    this._visible = true;
    this.el.style.display = 'flex';
  }

  hide(): void {
    this._visible = false;
    this.el.style.display = 'none';
  }

  destroy(): void {
    this.el.remove();
  }
}
