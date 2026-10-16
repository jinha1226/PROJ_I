// 무기 표 (tactics/DESIGN.md 3절 ③). 동작은 core/hero.ts가 attack · skill 종류로 나눠 처리한다
import type { Element, StatId, WeaponId } from '../core/types';

/** adjacent: 붙은 한 칸 / reach2: 직선 두 칸 관통 / around: 주변 8칸 / bolt: 직선 날아가 처음 맞은 것 (모두 8방향) */
export type AttackKind = 'adjacent' | 'reach2' | 'around' | 'bolt';
/** slash: 베고 너머로 / shove: 주변 밀기 / thrust: 찌르고 두 칸 날림 / quake: 주변 기절 / burst: 3×3 원소 / freeze: 적 하나 빙결 */
export type SkillKind = 'slash' | 'shove' | 'thrust' | 'quake' | 'burst' | 'freeze';

export interface WeaponDef {
  name: string;
  req: Partial<Record<StatId, number>>;
  atk: number;
  /** 피해가 공격력 ± 이만큼 흔들린다 (최소 1) */
  spread: number;
  attack: AttackKind;
  /** 맞은 적을 이만큼 민다 (망치) */
  push?: number;
  /** 공격이 맞은 칸에 남기는 원소 (지팡이) */
  element?: Element;
  /** bolt 사거리 */
  range?: number;
  /** 붙은 적에게는 절반 (지팡이) */
  weakClose?: boolean;
  skill: { kind: SkillKind; name: string; desc: string; cd: number; range?: number; /** 원소 피해라 고정 (지형처럼) */ dmg?: number };
  desc: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  sword: {
    name: '검', req: { str: 1, dex: 1 }, atk: 2, spread: 1, attack: 'adjacent', desc: '붙은 한 칸. 균형',
    skill: { kind: 'slash', name: '베고 지나가기', desc: '붙은 적을 베고 그 너머 칸으로 간다', cd: 5 },
  },
  axe: {
    name: '도끼', req: { str: 3 }, atk: 1, spread: 1, attack: 'around', desc: '주변 8칸 전부',
    skill: { kind: 'shove', name: '휘둘러 밀기', desc: '주변의 모든 것을 한 칸 밀어낸다', cd: 5 },
  },
  spear: {
    name: '창', req: { str: 2, dex: 1 }, atk: 2, spread: 1, attack: 'reach2', desc: '직선 두 칸 관통. 다가오는 적을 먼저 찌른다',
    skill: { kind: 'thrust', name: '찌르고 밀기', desc: '붙은 적을 찌르고 두 칸 날린다', cd: 5 },
  },
  hammer: {
    name: '망치', req: { str: 4 }, atk: 4, spread: 2, attack: 'adjacent', push: 1, desc: '붙은 한 칸, 맞으면 한 칸 밀림',
    skill: { kind: 'quake', name: '땅 내려치기', desc: '주변 적을 2턴 기절시킨다', cd: 7 },
  },
  fireStaff: {
    name: '불꽃 지팡이', req: { int: 3 }, atk: 2, spread: 1, attack: 'bolt', range: 4, element: 'fire', weakClose: true,
    desc: '직선 4칸, 맞은 칸에 불. 붙은 적에게는 절반',
    skill: { kind: 'burst', name: '화염 폭발', desc: '사거리 4 안의 한 칸에 3×3 불', cd: 8, range: 4, dmg: 2 },
  },
  frostStaff: {
    name: '서리 지팡이', req: { int: 2 }, atk: 2, spread: 1, attack: 'bolt', range: 4, element: 'frost', weakClose: true,
    desc: '직선 4칸, 맞은 칸에 서리. 붙은 적에게는 절반',
    skill: { kind: 'freeze', name: '빙결', desc: '사거리 3 안의 적 하나를 3턴 얼린다 (밀면 미끄러진다)', cd: 7, range: 3 },
  },
};

/** 빙결 기술의 빙결 턴 */
export const FREEZE_TURNS = 3;
/** 땅 내려치기의 기절 턴 */
export const QUAKE_STUN = 2;

export const STAT_NAME: Record<StatId, string> = { str: '힘', dex: '민첩', int: '지능' };
