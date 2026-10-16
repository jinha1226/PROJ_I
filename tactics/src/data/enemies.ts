// 적 표 (tactics/DESIGN.md 2절 "적")
import type { Element, EnemyKind, TileKind } from '../core/types';

/** 공격 모양. 칸은 유닛 위치와 방향(8방향) 기준으로 계산한다 (core/enemy.ts attackCells) */
export type AttackShape = 'melee' | 'reach2' | 'sweep' | 'ray' | 'blast' | 'smite';

export interface EnemyDef {
  name: string;
  glyph: string;
  hp: number;
  dmg: number;
  /** 내가 한 번 할 때 몇 번 행동하나 (늑대 2) */
  acts: number;
  /** 두 턴에 한 번만 행동한다 (오우거) */
  slow?: boolean;
  xp: number;
  shape: AttackShape;
  /** 공격이 칸에 남기는 원소 */
  element?: Element;
  /** 들어가도 멀쩡한 타일 (불 칸은 'lava'와 함께 lizard만) */
  immune: TileKind[];
  fireproof?: boolean;
  desc: string;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  goblin: { name: '고블린', glyph: '고', hp: 6, dmg: 3, acts: 1, xp: 3, shape: 'melee', immune: [], desc: '붙은 한 칸을 때린다' },
  archer: {
    name: '고블린 궁수', glyph: '궁', hp: 4, dmg: 2, acts: 1, xp: 3, shape: 'ray', immune: [],
    desc: '8방향 직선으로 쏜다. 처음 맞는 게 당신일 때만 쏜다 (적 뒤에 숨으면 못 쏜다)',
  },
  spearman: { name: '창병', glyph: '창', hp: 7, dmg: 3, acts: 1, xp: 4, shape: 'reach2', immune: [], desc: '직선 두 칸을 찌른다. 사이에 선 것도 맞는다' },
  beetle: {
    name: '폭탄벌레', glyph: '벌', hp: 3, dmg: 5, acts: 1, xp: 2, shape: 'blast', immune: [],
    desc: '붙으면 도화선에 불이 붙고 다음 턴 3×3으로 터진다. 맞아 죽어도 터진다',
  },
  lizard: {
    name: '화염 도마뱀', glyph: '도', hp: 6, dmg: 3, acts: 1, xp: 4, shape: 'melee', element: 'fire',
    immune: ['lava'], fireproof: true, desc: '붙은 한 칸에 불을 뿜는다. 용암 · 불에 멀쩡하다',
  },
  wolf: { name: '늑대', glyph: '늑', hp: 5, dmg: 2, acts: 2, xp: 4, shape: 'melee', immune: [], desc: '빠르다 (한 턴에 두 번). 도망칠 수 없다' },
  ogre: { name: '오우거', glyph: '오', hp: 24, dmg: 7, acts: 1, slow: true, xp: 15, shape: 'sweep', immune: [], desc: '앞 세 칸을 휩쓴다. 느리다 (두 턴에 한 번)' },
  orc: { name: '오크 전사', glyph: '전', hp: 10, dmg: 3, acts: 1, xp: 5, shape: 'melee', immune: [], desc: '붙은 한 칸을 때린다. 단단하다' },
  priest: {
    name: '오크 사제', glyph: '사', hp: 6, dmg: 3, acts: 1, xp: 6, shape: 'smite', immune: [],
    desc: '보이기만 하면 사이에 누가 있든 내리친다 (바위 · 연기가 막는다). 두 턴에 한 번. 붙으면 물러난다',
  },
};

/** 오크 사제가 내리칠 수 있는 거리 (체비쇼프) */
export const SMITE_RANGE = 7;
/** 내리친 뒤 기도를 모으는 턴 (1이면 두 턴에 한 번) */
export const SMITE_CD = 1;

/** 궁수 화살이 날아가는 최대 거리 */
export const RAY_RANGE = 8;
