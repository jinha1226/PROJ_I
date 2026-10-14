import type {HeroType, TacticId} from '../types';

export interface TacticInfo {
  role: HeroType;
  label: string;
  cooldown: number;
  /** One description per level (index 0 = level 1). */
  details: readonly [string, string, string];
}

export const MAX_TACTIC_LEVEL = 3;

/** Declaration order is the display order within each role. */
export const TACTIC_INFO: Readonly<Record<TacticId, TacticInfo>> = {
  taunt: {role: 'Knight', label: '도발', cooldown: 10, details: ['반경 5 도발', '반경 6.5 도발', '도발 중 받는 피해 20% 감소']},
  protect: {role: 'Knight', label: '아군 보호', cooldown: 5, details: ['피해 45% 감소', '보호 시간 6초', '보호 중 반격']},
  execute: {role: 'Rogue_Hooded', label: '약점 포착', cooldown: 5, details: ['빈사 적 집중', '집중 대상 추가 피해', '처치 시 즉시 재선정']},
  kite: {role: 'Rogue_Hooded', label: '거리 유지', cooldown: 2, details: ['적 접근 시 후퇴', '후퇴 거리 증가', '후퇴 후 공격력 증가']},
  heal: {role: 'Mage', label: '응급 치료', cooldown: 7, details: ['응급 치료', '회복량 35% 증가', '회복 후 보호막']},
  aoe: {role: 'Mage', label: '광역 마법', cooldown: 9, details: ['반경 2.8 공격', '반경 3.5 공격', '광역 피해 35% 증가']},
  ironwall: {role: 'Knight', label: '철벽 태세', cooldown: 9, details: ['자신 피해 45% 감소', '지속시간 증가', '자신 피해 65% 감소']},
  snipe: {role: 'Rogue_Hooded', label: '후방 저격', cooldown: 7, details: ['적 마법사 집중', '집중 시간 증가', '저격 대상 추가 피해']},
  barrier: {role: 'Mage', label: '보호막', cooldown: 10, details: ['피해 45% 감소', '보호 지속시간 증가', '피해 65% 감소']},
};

export const TACTIC_IDS = Object.keys(TACTIC_INFO) as TacticId[];

export function tacticsForRole(role: HeroType): TacticId[] {
  return TACTIC_IDS.filter(id => TACTIC_INFO[id].role === role);
}

export const DEFAULT_LOADOUT: Readonly<Record<HeroType, readonly TacticId[]>> = {
  Knight: ['taunt', 'protect'],
  Rogue_Hooded: ['execute', 'kite'],
  Mage: ['heal', 'aoe'],
};

export const TACTIC_UPGRADE_COSTS = [75, 200] as const;
export const BASE_LOADOUT_SLOTS = 2;
export const UNLOCKED_LOADOUT_SLOTS = 3;
