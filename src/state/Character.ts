// ── Character selection ──────────────────────────────────

export type CharacterName = 'owen' | 'william';

export interface CharacterConfig {
  label: string;
  color: number;       // Ship tint accent
  imageKey: string;     // Texture key for portrait
  tagline: string;
}

export const CHARACTERS: Record<CharacterName, CharacterConfig> = {
  owen: {
    label: 'OWEN',
    color: 0xff00cc,
    imageKey: 'portrait_owen',
    tagline: 'Speed & precision',
  },
  william: {
    label: 'WILLIAM',
    color: 0xff6600,
    imageKey: 'portrait_william',
    tagline: 'Power & resilience',
  },
};

export let currentCharacter: CharacterName = 'owen';

export function setCharacter(name: CharacterName): void {
  currentCharacter = name;
}
