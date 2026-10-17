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
}

export function newRun(): RunState {
  return { belt: ['heal_potion'], found: [], kills: {}, seen: [] };
}

export function addToBelt(run: RunState, id: ConsumableId): boolean {
  if (run.belt.length >= BELT_SIZE) return false;
  run.belt.push(id);
  return true;
}
