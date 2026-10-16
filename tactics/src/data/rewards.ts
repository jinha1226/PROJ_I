// 보상 3택1 표 (tactics/DESIGN.md 5절). 종류를 가중치로 뽑고, 그 안에서 내용을 고른다
import type { ItemId, StatId, WeaponId } from '../core/types';

export type Reward =
  | { kind: 'weapon'; weapon: WeaponId }
  | { kind: 'enchant' }
  | { kind: 'stat'; stat: StatId }
  | { kind: 'vigor' }
  | { kind: 'item'; item: ItemId };

/** 한 번에 보여주는 후보 수 */
export const REWARD_CHOICES = 3;
/** 종류별 뽑힐 가중치 */
export const REWARD_WEIGHTS: Record<Reward['kind'], number> = { item: 4, enchant: 2, stat: 2, weapon: 2, vigor: 1 };
/** 무기 강화: 공격 + */
export const ENCHANT_ATK = 1;
/** 단련: 최대 체력 + (회복도 같이) */
export const VIGOR_HP = 6;
/** 소모품 보상에서 나올 수 있는 것 (가중치) */
export const ITEM_WEIGHTS: Record<ItemId, number> = { heal: 3, fireBomb: 2, frostBomb: 2, smoke: 2, blink: 2, repel: 2 };
