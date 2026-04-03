import Phaser from 'phaser';
import { Ship } from '../entities/Ship';
import { COLORS, getGameSize } from '../config';
import { currentCharacter, CHARACTERS } from '../state/Character';

export class HUDSystem {
  private graphics: Phaser.GameObjects.Graphics;
  private bannerGraphics: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private titleJP: Phaser.GameObjects.Text;
  private shieldLabel: Phaser.GameObjects.Text;
  private hullLabel: Phaser.GameObjects.Text;
  private targetText: Phaser.GameObjects.Text;
  private weaponText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private studioText: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Image;
  private portraitBorder: Phaser.GameObjects.Graphics;
  private pilotName: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const { w, h } = getGameSize(scene);

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(100);

    // ── Title text (no background) ──
    this.bannerGraphics = scene.add.graphics();
    this.bannerGraphics.setDepth(99);

    this.titleText = scene.add.text(w / 2, 4, 'OH-YUM BLASTER', {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(100);

    this.titleJP = scene.add.text(w / 2, 42, 'オー・ヤム ブラスター', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(100);

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
    };

    this.shieldLabel = scene.add.text(20, 16, 'DEFLECTOR', {
      ...labelStyle, color: '#00eeff',
      stroke: '#000000', strokeThickness: 1,
    }).setDepth(100);

    this.hullLabel = scene.add.text(20, 50, 'HULL', {
      ...labelStyle, color: '#44ff44',
      stroke: '#000000', strokeThickness: 1,
    }).setDepth(100);

    this.targetText = scene.add.text(0, 0, '', {
      fontSize: '1px',
    }).setVisible(false);

    this.weaponText = scene.add.text(0, 0, '', {
      fontSize: '1px',
    }).setVisible(false);

    this.scoreText = scene.add.text(20, h - 30, 'SCORE: 0', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(100);

    this.studioText = scene.add.text(w - 16, h - 16, 'PRIDAY LABS', {
      fontSize: '22px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#00ff66',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 1).setDepth(100);

    // ── Level indicator ──
    this.levelText = scene.add.text(w / 2, 68, '', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(100);

    // ── Pilot portrait (top right) ──
    const cfg = CHARACTERS[currentCharacter];
    const portraitSize = 70;
    const px = w - 20 - portraitSize / 2;
    const py = 20 + portraitSize / 2;

    // Use the pixel version if available, otherwise original
    const pixKey = `${currentCharacter}_pixel`;
    const imgKey = scene.textures.exists(pixKey) ? pixKey : cfg.imageKey;

    this.portraitBorder = scene.add.graphics();
    this.portraitBorder.setDepth(99);
    const colorNum = cfg.color;
    this.portraitBorder.lineStyle(4, colorNum, 1);
    this.portraitBorder.strokeRect(
      px - portraitSize / 2 - 4, py - portraitSize / 2 - 4,
      portraitSize + 8, portraitSize + 8
    );

    this.portrait = scene.add.image(px, py, imgKey);
    const pScale = portraitSize / Math.max(this.portrait.width, this.portrait.height);
    this.portrait.setScale(pScale);
    this.portrait.setDepth(100);

    // Pilot name under portrait
    this.pilotName = scene.add.text(px, py + portraitSize / 2 + 10, cfg.label, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 1,
    }).setOrigin(0.5, 0).setDepth(100);
  }

  update(player: Ship, enemies: Ship[], score: number, level: number): void {
    this.graphics.clear();

    // Shield bar
    const shieldPct = player.shield / (player.maxShield || 1);
    this.drawBar(20, 32, 260, 14, shieldPct, COLORS.shield);
    // Hull bar
    const hullPct = player.hull / player.maxHull;
    this.drawBar(20, 66, 260, 14, hullPct, COLORS.hull);

    // Level indicator
    this.levelText.setText(`LEVEL ${level}/3`);

    // Enemy target indicators — compact display below player bars
    const aliveCount = enemies.filter(e => e.alive).length;
    const totalCount = enemies.length;

    if (aliveCount === 0) {
      this.targetText.setVisible(false);
    } else {
      this.targetText.setVisible(false); // keep hidden, we draw pips instead
    }

    // Draw enemy pips (small health indicators)
    const pipStartX = 20;
    const pipY = 90;
    const pipW = 60;
    const pipH = 8;
    const pipGap = 4;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const x = pipStartX + i * (pipW + pipGap + 20);

      // Label
      this.graphics.fillStyle(0xffffff, 0.7);

      if (enemy.alive) {
        const ePct = enemy.hull / enemy.maxHull;
        // Background
        this.graphics.fillStyle(0x000000, 0.5);
        this.graphics.fillRect(x, pipY, pipW, pipH);
        // Border
        this.graphics.lineStyle(1, 0xff4444, 0.8);
        this.graphics.strokeRect(x, pipY, pipW, pipH);
        // Fill
        const clamped = Math.max(0, Math.min(1, ePct));
        if (clamped > 0) {
          const color = clamped > 0.5 ? 0xff4444 : 0xff2222;
          this.graphics.fillStyle(color, 1);
          this.graphics.fillRect(x + 1, pipY + 1, (pipW - 2) * clamped, pipH - 2);
        }
      } else {
        // Dead enemy — X mark
        this.graphics.lineStyle(2, 0x666666, 0.6);
        this.graphics.lineBetween(x + 2, pipY, x + pipW - 2, pipY + pipH);
        this.graphics.lineBetween(x + 2, pipY + pipH, x + pipW - 2, pipY);
      }
    }

    // Targets remaining text
    if (totalCount > 1) {
      const targetsX = pipStartX + totalCount * (pipW + pipGap + 20);
      // Draw via graphics text isn't available, so we'll use the targetText
    }

    // Score
    this.scoreText.setText(`SCORE: ${score.toLocaleString()}  •  TARGETS: ${aliveCount}/${totalCount}`);
  }

  private drawBar(x: number, y: number, w: number, h: number, pct: number, color: number): void {
    // Dark background
    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillRect(x, y, w, h);
    // Border
    this.graphics.lineStyle(2, color, 1);
    this.graphics.strokeRect(x, y, w, h);
    // Fill
    const clamped = Math.max(0, Math.min(1, pct));
    const fillWidth = w * clamped;
    if (fillWidth > 0) {
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRect(x + 1, y + 1, fillWidth - 2, h - 2);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.bannerGraphics.destroy();
    this.titleText.destroy();
    this.titleJP.destroy();
    this.shieldLabel.destroy();
    this.hullLabel.destroy();
    this.targetText.destroy();
    this.weaponText.destroy();
    this.scoreText.destroy();
    this.studioText.destroy();
    this.portrait.destroy();
    this.portraitBorder.destroy();
    this.pilotName.destroy();
    this.levelText.destroy();
  }
}
