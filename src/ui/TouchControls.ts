// ── Touch Controls for iPad/Mobile ─────────────────────
// Virtual joystick (left) + fire button (right)
// Auto-detected: only shown when touch input is available.
// All sizes and positions are viewport-relative for mobile compatibility.

import Phaser from 'phaser';
import { getGameSize } from '../config';

export interface TouchInput {
  rotateDir: number;  // -1, 0, or 1
  thrust: number;     // -1 to 1
  fire: boolean;
}

export class TouchControls {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private enabled: boolean;

  // Joystick state — sizes computed from viewport
  private joystickCenter: { x: number; y: number };
  private joystickRadius: number;
  private joystickOuterRadius: number;
  private joystickPointer: Phaser.Input.Pointer | null = null;
  private joystickAngle = 0;
  private joystickDistance = 0;
  private thumbRadius: number;

  // Fire button state
  private fireCenter: { x: number; y: number };
  private fireRadius: number;
  private firePressed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(200).setAlpha(0.5);
    this.enabled = scene.sys.game.device.input.touch;

    const { w, h } = getGameSize(scene);

    // Scale control sizes to viewport — smaller dimension drives sizing
    const refSize = Math.min(w, h);
    this.joystickRadius = Math.round(refSize * 0.1);
    this.joystickOuterRadius = Math.round(refSize * 0.14);
    this.fireRadius = Math.round(refSize * 0.09);
    this.thumbRadius = Math.round(refSize * 0.04);

    // Position: proportional to viewport, inset from edges
    const margin = Math.round(refSize * 0.2);
    this.joystickCenter = { x: margin, y: h - margin };
    this.fireCenter = { x: w - margin, y: h - margin };

    if (this.enabled) {
      this.setupTouchListeners();
    }
  }

  private setupTouchListeners(): void {
    this.scene.input.addPointer(2); // Support up to 3 simultaneous touches

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if this touch is on the fire button
      const fdx = pointer.x - this.fireCenter.x;
      const fdy = pointer.y - this.fireCenter.y;
      if (Math.sqrt(fdx * fdx + fdy * fdy) < this.fireRadius * 1.5) {
        this.firePressed = true;
        return;
      }

      // Check if this touch is on the left half (joystick area)
      if (pointer.x < getGameSize(this.scene).w / 2) {
        this.joystickPointer = pointer;
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointer && pointer.id === this.joystickPointer.id) {
        this.updateJoystick(pointer);
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointer && pointer.id === this.joystickPointer.id) {
        this.joystickPointer = null;
        this.joystickAngle = 0;
        this.joystickDistance = 0;
      }
      // Check if any fire touch is still held
      const activePointers = [
        this.scene.input.pointer1,
        this.scene.input.pointer2,
        this.scene.input.pointer3,
      ];
      const anyFireHeld = activePointers.some(p => {
        if (!p || !p.isDown) return false;
        const dx = p.x - this.fireCenter.x;
        const dy = p.y - this.fireCenter.y;
        return Math.sqrt(dx * dx + dy * dy) < this.fireRadius * 1.5;
      });
      if (!anyFireHeld) this.firePressed = false;
    });
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    this.joystickDistance = Math.min(Math.sqrt(dx * dx + dy * dy), this.joystickOuterRadius);
    this.joystickAngle = Math.atan2(dy, dx);
  }

  getInput(): TouchInput {
    if (!this.enabled) return { rotateDir: 0, thrust: 0, fire: false };

    let rotateDir = 0;
    let thrust = 0;

    if (this.joystickPointer && this.joystickDistance > 15) {
      // Use horizontal component for rotation
      const horizontal = Math.cos(this.joystickAngle);
      if (Math.abs(horizontal) > 0.3) {
        rotateDir = horizontal > 0 ? 1 : -1;
      }

      // Use vertical component for thrust (push up = forward, push down = reverse)
      const vertical = Math.sin(this.joystickAngle);
      if (vertical < -0.3) {
        thrust = 1;
      } else if (vertical > 0.3) {
        thrust = -1;
      }
    }

    return { rotateDir, thrust, fire: this.firePressed };
  }

  draw(): void {
    if (!this.enabled) return;

    this.graphics.clear();

    // ── Joystick base ring ──
    this.graphics.lineStyle(2, 0x88aacc, 0.3);
    this.graphics.strokeCircle(this.joystickCenter.x, this.joystickCenter.y, this.joystickOuterRadius);

    // Inner dead zone circle
    this.graphics.lineStyle(1, 0x88aacc, 0.15);
    this.graphics.strokeCircle(this.joystickCenter.x, this.joystickCenter.y, 15);

    // Joystick thumb position
    if (this.joystickPointer && this.joystickDistance > 5) {
      const thumbX = this.joystickCenter.x + Math.cos(this.joystickAngle) * this.joystickDistance;
      const thumbY = this.joystickCenter.y + Math.sin(this.joystickAngle) * this.joystickDistance;
      this.graphics.fillStyle(0x88aacc, 0.4);
      this.graphics.fillCircle(thumbX, thumbY, this.thumbRadius);
      this.graphics.lineStyle(2, 0x88aacc, 0.5);
      this.graphics.strokeCircle(thumbX, thumbY, this.thumbRadius);
    } else {
      // Resting position
      this.graphics.fillStyle(0x88aacc, 0.2);
      this.graphics.fillCircle(this.joystickCenter.x, this.joystickCenter.y, this.thumbRadius);
    }

    // ── Fire button ──
    const fireColor = this.firePressed ? 0xff4422 : 0xff6644;
    const fireAlpha = this.firePressed ? 0.5 : 0.25;
    this.graphics.fillStyle(fireColor, fireAlpha);
    this.graphics.fillCircle(this.fireCenter.x, this.fireCenter.y, this.fireRadius);
    this.graphics.lineStyle(2, fireColor, 0.5);
    this.graphics.strokeCircle(this.fireCenter.x, this.fireCenter.y, this.fireRadius);

    // Crosshair inside fire button
    const crossSize = Math.round(this.fireRadius * 0.3);
    this.graphics.lineStyle(2, fireColor, 0.4);
    this.graphics.beginPath();
    this.graphics.moveTo(this.fireCenter.x - crossSize, this.fireCenter.y);
    this.graphics.lineTo(this.fireCenter.x + crossSize, this.fireCenter.y);
    this.graphics.strokePath();
    this.graphics.beginPath();
    this.graphics.moveTo(this.fireCenter.x, this.fireCenter.y - crossSize);
    this.graphics.lineTo(this.fireCenter.x, this.fireCenter.y + crossSize);
    this.graphics.strokePath();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
