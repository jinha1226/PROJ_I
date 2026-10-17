// 해금: 런에서 한 일(누적)로 새 종족 · 직업이 열린다. 강해지는 게 아니라 선택지가 늘어난다.
import type { ClassId } from './classes';
import type { RaceId } from './races';

export interface MetaProgress {
  unlocked: string[];
  /** 누적 처치 수 (몬스터 id 별) */
  kills: Record<string, number>;
  bestDepth: number;
  runs: number;
  wins: number;
}

export interface UnlockDef {
  /** 'race:orc' · 'class:berserker' */
  id: string;
  kind: 'race' | 'class';
  target: RaceId | ClassId;
  cond: string;
  /** 진행도 0..1 과 표시용 문구 */
  progress: (m: MetaProgress) => { v: number; text: string };
}

const killsOf = (id: string, need: number) => (m: MetaProgress) => {
  const n = m.kills[id] ?? 0;
  return { v: Math.min(1, n / need), text: `${Math.min(n, need)}/${need}` };
};

export const UNLOCKS: UnlockDef[] = [
  {
    id: 'race:orc', kind: 'race', target: 'orc', cond: '3층에 도달',
    progress: (m) => ({ v: Math.min(1, m.bestDepth / 3), text: `최고 ${m.bestDepth}층` }),
  },
  { id: 'race:dwarf', kind: 'race', target: 'dwarf', cond: '해골 전사 12마리 처치 (누적)', progress: killsOf('skeleton', 12) },
  { id: 'class:berserker', kind: 'class', target: 'berserker', cond: '오우거 3마리 처치 (누적)', progress: killsOf('ogre', 3) },
  { id: 'class:frost_mage', kind: 'class', target: 'frost_mage', cond: '불의 정령 12마리 처치 (누적)', progress: killsOf('fire_elemental', 12) },
];

/** 처음부터 열려 있는 것 */
export const BASE_UNLOCKED = ['race:human', 'race:deep_elf', 'race:halfling', 'class:warrior', 'class:fire_mage', 'class:hunter', 'class:priest'];
