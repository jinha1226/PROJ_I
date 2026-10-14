import type {EnemyKind, EnemyVariant} from '../types';

export const ENEMY_VARIANTS: Readonly<Record<EnemyKind, EnemyVariant>> = {
  brute: {label: '중장 해골', tint: 0xb8a28a, glow: 0x8f5435, behavior: 'charge', hp: 1.55, damage: 1.2, range: 1.45, cooldown: 1.65},
  stalker: {label: '추적 해골', tint: 0x86bfa2, glow: 0x267b49, behavior: 'hunter', hp: 0.85, damage: 1.12, range: 1.45, cooldown: 1.05},
  caster: {label: '해골 주술사', tint: 0x9b9de9, glow: 0x5555cc, behavior: 'backline', hp: 0.85, damage: 1.2, range: 5.3, cooldown: 1.85},
  boss: {label: '해골 군주', tint: 0xd9a15e, glow: 0xb04c1f, behavior: 'hunter', hp: 4.5, damage: 1.65, range: 1.8, cooldown: 1.7},
  guardian: {label: '방패 해골', tint: 0x92b9d5, glow: 0x3d76a0, behavior: 'charge', hp: 1.8, damage: 0.8, range: 1.45, cooldown: 1.6},
};

export interface EnemyStats {
  hp: number;
  damage: number;
}

/** Stage scaling shared by every dungeon room. Casters are frailer but hit harder. */
export function enemyStats(kind: EnemyKind, stage: number): EnemyStats {
  const variant = ENEMY_VARIANTS[kind];
  const caster = kind === 'caster';
  return {
    hp: Math.round((caster ? 55 : 65) * (1 + (stage - 1) * 0.12) * variant.hp),
    damage: Math.round((caster ? 12 : 10) * (1 + (stage - 1) * 0.065) * variant.damage),
  };
}

export const BOSS_SCALE = 1.6;
export const BOSS_FIRST_COOLDOWN = 4.5;
export const BOSS_REPEAT_COOLDOWN = 5.5;
export const BOSS_WARNING_SECONDS = 1.5;
export const BOSS_BLAST_RADIUS = 3.5;
