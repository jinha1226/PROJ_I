// 웨이브 성격: 웨이브마다 요구하는 대응이 달라야 한다 (배틀하트식).
// 몬스터를 역할로 묶고, 성격에 맞게 깊이의 '예산'(경험치 합) 안에서 채운다.
import { MONSTERS } from './units';

export type FoeKind = 'swarm' | 'diver' | 'ranged' | 'caster' | 'brute';

export interface WaveKindDef {
  id: string;
  name: string;
  /** 시작할 때 띄우는 한 줄 요령 */
  hint: string;
  color: string;
  /** 주력 무리와 섞을 호위 */
  core: FoeKind;
  escort?: FoeKind;
  /** 예산 중 주력 비율 */
  coreShare: number;
  /** 들어오는 문 */
  sides: 'both' | 'one';
}

export const WAVE_KINDS: WaveKindDef[] = [
  { id: 'swarm', name: '떼거리', hint: '몰려온다 — 뭉쳤을 때 범위 기술로 쓸어라', color: '#d8c890', core: 'swarm', coreShare: 1, sides: 'both' },
  { id: 'divers', name: '사냥개', hint: '후열을 노린다 — 도발 · 감속으로 붙잡아라', color: '#ffaa66', core: 'diver', escort: 'swarm', coreShare: 0.75, sides: 'both' },
  { id: 'archers', name: '궁수진', hint: '뒤에서 쏜다 — 앞을 뚫고 궁수부터', color: '#a8e070', core: 'ranged', escort: 'swarm', coreShare: 0.6, sides: 'one' },
  { id: 'casters', name: '주술사', hint: '시전 막대가 보이면 끊어라 (기절 · 속박)', color: '#c890ff', core: 'caster', escort: 'brute', coreShare: 0.5, sides: 'one' },
  { id: 'brutes', name: '덩치', hint: '아프게 친다 — 빨간 원을 피하고 탱커가 받아라', color: '#ff8866', core: 'brute', escort: 'swarm', coreShare: 0.75, sides: 'one' },
];

/** 몬스터 → 역할 묶음 */
export function foeKind(id: string): FoeKind | null {
  const m = MONSTERS[id];
  if (!m || m.boss || id === 'mimic' || id === 'skeleton_minion' || id === 'slimelet') return null;
  if (m.role === 'caster' || m.role === 'support') return 'caster';
  if (m.role === 'ranged') return 'ranged';
  if (m.role === 'tank' || (m.xp ?? 0) >= 20) return 'brute';
  if (m.targetPref === 'backline' || m.targetPref === 'weakest') return 'diver';
  return 'swarm';
}
