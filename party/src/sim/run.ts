// 한 런 동안 층을 넘어 이어지는 파티 공용 상태 (영웅 데이터 외)
import { BELT_SIZE, type ConsumableId } from '../data/consumables';
import type { Item } from './defs';

export interface RunState {
  /** 소모품 벨트 (파티 공용) */
  belt: ConsumableId[];
  /** 이번 층에서 상자·제단 등으로 얻은 장비 — 쉬는 화면에서 장착하거나 버린다 */
  found: Item[];
  /** 아직 기록에 넣지 않은 처치 수 (해금 진행용) */
  kills: Record<string, number>;
  /** 이번 런에서 이미 마주친 몬스터 종류 (첫 조우 카드용) */
  seen: string[];
  /** 이번 원정에서 번 골드. 귀환하면 용병단 금고로, 전멸하면 잃는다 */
  gold: number;
  /** 들고 돌아갈 장비 (장착하지 않은 것 · 교체로 벗은 것). 귀환하면 보관함으로 */
  loot: Item[];
}

export function newRun(): RunState {
  return { belt: ['heal_potion'], found: [], kills: {}, seen: [], gold: 0, loot: [] };
}

export function addToBelt(run: RunState, id: ConsumableId): boolean {
  if (run.belt.length >= BELT_SIZE) return false;
  run.belt.push(id);
  return true;
}
