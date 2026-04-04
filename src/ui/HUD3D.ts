// ── HUD Overlay (HTML/CSS) ───────────────────────────────
// DOM-based HUD rendered over the 3D scene.
// Shield bar, hull bar, score, targets, level indicator.
// All content is static/hardcoded — no user input rendered as HTML.

import { Ship3D } from '../entities/Ship3D';

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'id') e.id = v;
    else e.style.setProperty(k, v);
  }
  if (text) e.textContent = text;
  return e;
}

export class HUD3D {
  private container: HTMLDivElement;
  private shieldBar: HTMLDivElement;
  private hullBar: HTMLDivElement;
  private scoreEl: HTMLSpanElement;
  private targetsEl: HTMLSpanElement;
  private levelEl: HTMLSpanElement;

  constructor() {
    const overlay = document.getElementById('ui-overlay')!;

    // Inject scoped styles
    const style = document.createElement('style');
    style.textContent = `
      #hud { position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:20;font-family:Arial,sans-serif; }
      .hud-top-left { position:absolute;top:16px;left:16px; }
      .hud-bar-container { width:200px;height:14px;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);border-radius:2px;margin-bottom:6px;overflow:hidden; }
      .hud-bar-fill { height:100%;transition:width 0.15s ease-out; }
      .hud-bar-label { font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px; }
      .hud-shield-fill { background:linear-gradient(90deg,#006688,#00ccff); }
      .hud-hull-fill { background:linear-gradient(90deg,#226622,#44ff44); }
      .hud-top-center { position:absolute;top:12px;left:50%;transform:translateX(-50%);font-size:14px;font-weight:bold;color:rgba(255,255,255,0.4);letter-spacing:3px; }
      .hud-bottom-left { position:absolute;bottom:16px;left:16px;font-size:14px;color:#fff; }
      .hud-score { font-size:18px;font-weight:bold;color:#ffcc00; }
      .hud-targets { font-size:13px;color:#aaa;margin-top:4px; }
      .hud-level { font-size:12px;color:#88aacc;margin-top:4px; }
      .hud-bottom-right { position:absolute;bottom:12px;right:16px;font-size:14px;font-weight:bold;color:#00ff66;letter-spacing:1px; }
    `;
    document.head.appendChild(style);

    this.container = document.createElement('div');
    this.container.id = 'hud';

    // Top-left: bars
    const topLeft = el('div', { class: 'hud-top-left' });

    topLeft.appendChild(el('div', { class: 'hud-bar-label' }, 'DEFLECTOR'));
    const shieldContainer = el('div', { class: 'hud-bar-container' });
    this.shieldBar = el('div', { class: 'hud-bar-fill hud-shield-fill' }) as HTMLDivElement;
    this.shieldBar.style.width = '100%';
    shieldContainer.appendChild(this.shieldBar);
    topLeft.appendChild(shieldContainer);

    topLeft.appendChild(el('div', { class: 'hud-bar-label' }, 'HULL'));
    const hullContainer = el('div', { class: 'hud-bar-container' });
    this.hullBar = el('div', { class: 'hud-bar-fill hud-hull-fill' }) as HTMLDivElement;
    this.hullBar.style.width = '100%';
    hullContainer.appendChild(this.hullBar);
    topLeft.appendChild(hullContainer);

    this.container.appendChild(topLeft);

    // Top-center: title
    this.container.appendChild(el('div', { class: 'hud-top-center' }, 'OH-YUM BLASTER'));

    // Bottom-left: score + targets + level
    const bottomLeft = el('div', { class: 'hud-bottom-left' });

    const scoreDiv = el('div', { class: 'hud-score' });
    scoreDiv.appendChild(document.createTextNode('SCORE: '));
    this.scoreEl = document.createElement('span');
    this.scoreEl.textContent = '0';
    scoreDiv.appendChild(this.scoreEl);
    bottomLeft.appendChild(scoreDiv);

    const targetsDiv = el('div', { class: 'hud-targets' });
    targetsDiv.appendChild(document.createTextNode('TARGETS: '));
    this.targetsEl = document.createElement('span');
    this.targetsEl.textContent = '0/0';
    targetsDiv.appendChild(this.targetsEl);
    bottomLeft.appendChild(targetsDiv);

    const levelDiv = el('div', { class: 'hud-level' });
    levelDiv.appendChild(document.createTextNode('LEVEL '));
    this.levelEl = document.createElement('span');
    this.levelEl.textContent = '1';
    levelDiv.appendChild(this.levelEl);
    levelDiv.appendChild(document.createTextNode('/3'));
    bottomLeft.appendChild(levelDiv);

    this.container.appendChild(bottomLeft);

    // Bottom-right: branding
    this.container.appendChild(el('div', { class: 'hud-bottom-right' }, 'PRIDAY LABS'));

    overlay.appendChild(this.container);
  }

  update(player: Ship3D, enemies: Ship3D[], score: number, level: number): void {
    this.shieldBar.style.width = `${player.shieldPct * 100}%`;
    this.hullBar.style.width = `${(1 - player.damagePct) * 100}%`;

    if (player.damagePct > 0.75) {
      this.hullBar.style.background = 'linear-gradient(90deg, #882222, #ff4444)';
    } else if (player.damagePct > 0.5) {
      this.hullBar.style.background = 'linear-gradient(90deg, #886622, #ffaa44)';
    } else {
      this.hullBar.style.background = 'linear-gradient(90deg, #226622, #44ff44)';
    }

    this.scoreEl.textContent = score.toLocaleString();

    const alive = enemies.filter(e => e.alive).length;
    const total = enemies.length;
    this.targetsEl.textContent = `${total - alive}/${total}`;
    this.levelEl.textContent = String(level);
  }

  show(): void { this.container.style.display = 'block'; }
  hide(): void { this.container.style.display = 'none'; }
  destroy(): void { this.container.remove(); }
}
