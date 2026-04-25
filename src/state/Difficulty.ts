// ── Difficulty presets ───────────────────────────────────

export type DifficultyLevel = 'beginner' | 'intermediate' | 'expert';

export interface DifficultyConfig {
  label: string;
  playerHull: number;
  playerShield: number;
  enemyHull: number;
  enemyShield: number;
  enemySpeedMult: number;
  enemyRotationMult: number;
  enemyFireRate: number;
  enemyChaseRange: number;
  // AI behavior tuning — scales aggression with skill level
  aiSensitivity: number;     // steering sharpness: 2.0 lazy → 5.0 razor
  aiAggression: number;      // 0.0-1.0 — pursuit relentlessness, phase duration scaling
  aiJinkIntensity: number;   // 0.0-1.0 — evasive weaving strength
  aiLeashRange: number;      // max distance before forced re-engage
  aiFireCone: number;        // dot-product threshold for allowing fire (lower = wider cone)
}

export const DIFFICULTY: Record<DifficultyLevel, DifficultyConfig> = {
  // BEGINNER — +33% aggression vs. previous baseline
  beginner: {
    label: 'BEGINNER',
    playerHull: 400,
    playerShield: 200,
    enemyHull: 200,
    enemyShield: 0,
    enemySpeedMult: 1.62,
    enemyRotationMult: 1.20,
    enemyFireRate: 677,
    enemyChaseRange: 665,
    aiSensitivity: 2.66,
    aiAggression: 0.27,
    aiJinkIntensity: 0.20,
    aiLeashRange: 226,
    aiFireCone: 0.34,
  },
  // INTERMEDIATE — +50% aggression vs. previous baseline
  intermediate: {
    label: 'INTERMEDIATE',
    playerHull: 280,
    playerShield: 140,
    enemyHull: 350,
    enemyShield: 10,
    enemySpeedMult: 1.78,
    enemyRotationMult: 1.58,
    enemyFireRate: 333,
    enemyChaseRange: 1050,
    aiSensitivity: 6.75,
    aiAggression: 0.9,
    aiJinkIntensity: 0.83,
    aiLeashRange: 147,
    aiFireCone: 0.17,
  },
  // EXPERT — +80% aggression vs. previous baseline (caps at 1.0 for aggression/jink)
  expert: {
    label: 'EXPERT',
    playerHull: 180,
    playerShield: 90,
    enemyHull: 550,
    enemyShield: 25,
    enemySpeedMult: 2.42,
    enemyRotationMult: 2.79,
    enemyFireRate: 139,
    enemyChaseRange: 1620,
    aiSensitivity: 11.7,
    aiAggression: 1.0,
    aiJinkIntensity: 1.0,
    aiLeashRange: 89,
    aiFireCone: 0.056,
  },
};

/** Global mutable selection — set by TitleScene, read by ArenaScene */
export let currentDifficulty: DifficultyLevel = 'intermediate';

export function setDifficulty(level: DifficultyLevel): void {
  currentDifficulty = level;
}
