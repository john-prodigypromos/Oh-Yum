import Phaser from 'phaser';
import { COLORS, getGameSize } from '../config';
import { getCurrentLevel } from '../state/LevelState';
import { createStarfieldTexture } from '../ui/Starfield';
import { SoundSystem } from '../systems/SoundSystem';

export class LevelIntroScene extends Phaser.Scene {
  private sound_sys!: SoundSystem;

  constructor() {
    super({ key: 'LevelIntro' });
  }

  create(): void {
    const { w, h } = getGameSize(this);
    const level = getCurrentLevel();

    // Background
    if (!this.textures.exists('starfield')) {
      createStarfieldTexture(this, 'starfield');
    }
    this.add.image(w / 2, h / 2, 'starfield');
    this.cameras.main.setBackgroundColor(COLORS.arena);

    // Sound system
    this.sound_sys = new SoundSystem();
    this.input.once('pointerdown', () => this.sound_sys.init());
    this.input.keyboard!.once('keydown', () => this.sound_sys.init());

    // ── "LEVEL N" — scales up dramatically ──
    const titleSize = Math.min(72, Math.round(h * 0.15));
    const levelText = this.add.text(w / 2, h / 2 - 60, `LEVEL ${level.level}`, {
      fontSize: `${titleSize}px`,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setAlpha(0).setScale(0.3);

    this.tweens.add({
      targets: levelText,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: 'Back.easeOut',
    });

    // ── Subtitle — fades in after delay ──
    const subSize = Math.min(28, Math.round(h * 0.06));
    const subtitleText = this.add.text(w / 2, h / 2 + 10, level.subtitle, {
      fontSize: `${subSize}px`,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setAlpha(0);

    this.tweens.add({
      targets: subtitleText,
      alpha: 1,
      duration: 400,
      delay: 300,
      ease: 'Power2',
    });

    // ── Enemy count indicator ──
    const enemyLabel = level.enemyCount === 1 ? '1 ENEMY' : `${level.enemyCount} ENEMIES`;
    const enemyText = this.add.text(w / 2, h / 2 + 60, enemyLabel, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setAlpha(0);

    this.tweens.add({
      targets: enemyText,
      alpha: 1,
      duration: 400,
      delay: 500,
      ease: 'Power2',
    });

    // ── Decorative line ──
    const line = this.add.graphics();
    line.setAlpha(0);
    line.lineStyle(2, 0xffffff, 0.4);
    line.lineBetween(w / 2 - 120, h / 2 + 90, w / 2 + 120, h / 2 + 90);

    this.tweens.add({
      targets: line,
      alpha: 1,
      duration: 300,
      delay: 600,
    });

    // Play level start sound after a beat
    this.time.delayedCall(200, () => {
      this.sound_sys.init(); // ensure init in case no user gesture yet
      this.sound_sys.levelStart();
    });

    // ── Auto-transition to Arena after 2.5 seconds ──
    this.time.delayedCall(2500, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Arena');
      });
    });

    // Allow skip with SPACE or tap
    const skip = () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Arena');
      });
    };
    this.input.keyboard!.once('keydown-SPACE', skip);
    this.input.once('pointerdown', skip);
  }
}
