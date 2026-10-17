// 난이도: 몬스터 체력·피해 배율. 기본(base)은 1층부터, 층당(perDepth)은 깊이에 따라 더해진다.
export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface Difficulty {
  name: string;
  baseHp: number;
  baseDmg: number;
  perDepthHp: number;
  perDepthDmg: number;
  /** 보스 체력·피해 배율 */
  boss: number;
}

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  easy: { name: '쉬움', baseHp: 1, baseDmg: 1, perDepthHp: 0.4, perDepthDmg: 0.5, boss: 1 },
  normal: { name: '보통', baseHp: 1.1, baseDmg: 1.05, perDepthHp: 0.45, perDepthDmg: 0.53, boss: 1.2 },
  hard: { name: '어려움', baseHp: 1.15, baseDmg: 1.08, perDepthHp: 0.47, perDepthDmg: 0.55, boss: 1.3 },
};
