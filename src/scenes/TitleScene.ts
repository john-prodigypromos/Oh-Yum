import Phaser from 'phaser';
import { COLORS, getGameSize } from '../config';
import { DifficultyLevel, DIFFICULTY, setDifficulty } from '../state/Difficulty';
import { createStarfieldTexture } from '../ui/Starfield';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Title' });
  }

  create(): void {
    const { w, h } = getGameSize(this);

    // Background
    if (!this.textures.exists('starfield')) {
      createStarfieldTexture(this, 'starfield');
    }
    this.add.image(w / 2, h / 2, 'starfield');
    this.cameras.main.setBackgroundColor(COLORS.arena);

    // ── Title text (no background) ──
    this.add.text(w / 2, 65, 'OH-YUM BLASTER', {
      fontSize: '42px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0);

    this.add.text(w / 2, 115, 'オー・ヤム ブラスター', {
      fontSize: '24px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // ── Select Difficulty ──
    this.add.text(w / 2, 200, 'SELECT DIFFICULTY', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0);

    const btnStartY = Math.round(h * 0.38);
    const btnSpacing = Math.round(h * 0.13);
    const levels: { key: DifficultyLevel; color: string; y: number; desc: string }[] = [
      { key: 'beginner',     color: '#44ff44', y: btnStartY, desc: 'Slow enemy  •  Extra shields  •  Relaxed pace' },
      { key: 'intermediate', color: '#ffcc00', y: btnStartY + btnSpacing, desc: 'Balanced combat  •  Standard loadout' },
      { key: 'expert',       color: '#ff4444', y: btnStartY + btnSpacing * 2, desc: 'Fast & aggressive  •  Tough enemy  •  Less armor' },
    ];

    for (const lvl of levels) {
      this.createDifficultyButton(lvl.key, lvl.color, lvl.y, lvl.desc, w);
    }

    // ── Footer ──
    this.add.text(w / 2, h - 50, 'Press a button or tap to begin', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5, 0);

    this.add.text(w - 16, h - 16, 'PRIDAY LABS', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#00ff66', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 1);

    // Keyboard shortcuts
    this.input.keyboard!.once('keydown-ONE', () => this.startGame('beginner'));
    this.input.keyboard!.once('keydown-TWO', () => this.startGame('intermediate'));
    this.input.keyboard!.once('keydown-THREE', () => this.startGame('expert'));
  }

  private createDifficultyButton(
    level: DifficultyLevel,
    color: string,
    y: number,
    desc: string,
    w: number,
  ): void {
    const cfg = DIFFICULTY[level];
    const btnW = Math.min(400, Math.round(w * 0.6));
    const btnH = 60;
    const btnX = (w - btnW) / 2;

    // Button background
    const gfx = this.add.graphics();
    gfx.fillStyle(0x111822, 0.8);
    gfx.fillRect(btnX, y, btnW, btnH);
    gfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.8);
    gfx.strokeRect(btnX, y, btnW, btnH);

    // Label
    const label = this.add.text(w / 2, y + 12, `${cfg.label}`, {
      fontSize: '22px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: color, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0);

    // Description — white, not grey
    this.add.text(w / 2, y + 38, desc, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5, 0);

    // Interactive zone
    const zone = this.add.zone(btnX, y, btnW, btnH).setOrigin(0, 0).setInteractive();
    zone.on('pointerover', () => {
      gfx.clear();
      gfx.fillStyle(0x1a2838, 0.9);
      gfx.fillRect(btnX, y, btnW, btnH);
      gfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 1);
      gfx.strokeRect(btnX, y, btnW, btnH);
      label.setScale(1.05);
    });
    zone.on('pointerout', () => {
      gfx.clear();
      gfx.fillStyle(0x111822, 0.8);
      gfx.fillRect(btnX, y, btnW, btnH);
      gfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.8);
      gfx.strokeRect(btnX, y, btnW, btnH);
      label.setScale(1);
    });
    zone.on('pointerdown', () => this.startGame(level));
  }

  private startGame(level: DifficultyLevel): void {
    setDifficulty(level);
    this.scene.start('CharacterSelect');
  }
}
