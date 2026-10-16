// 소모품 표 (tactics/DESIGN.md 6절 "시제품 1의 소모품"). 시제품에서는 정체를 알고, 쓰는 법이 하나씩이다 (미확인은 나중에)
import type { ItemId } from '../core/types';

export interface ItemDef {
  name: string;
  /** 짧은 이름 (버튼) */
  short: string;
  desc: string;
  /** self: 고를 칸 없이 바로 (마시기 · 읽기) / cell: range 안 칸 / empty: range 안 설 수 있는 빈칸 */
  target: 'self' | 'cell' | 'empty';
  /** 고를 수 있는 칸까지 거리 (체비쇼프) */
  range: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  heal: { name: '치유 물약', short: '치유', desc: '마시면 최대 체력의 40%를 회복한다', target: 'self', range: 0 },
  fireBomb: { name: '화염 물약', short: '화염', desc: '던지면 3×3에 불 원소, 맞은 것 피해 3', target: 'cell', range: 4 },
  frostBomb: { name: '서리 물약', short: '서리', desc: '던지면 3×3에 서리 원소, 맞은 적은 2턴 빙결', target: 'cell', range: 4 },
  smoke: { name: '연막 두루마리', short: '연막', desc: '고른 칸 주변 3×3에 연기. 3턴 동안 시야 · 화살 · 마법을 막는다', target: 'cell', range: 4 },
  blink: { name: '도약 두루마리', short: '도약', desc: '4칸 안 빈칸으로 순간이동한다', target: 'empty', range: 4 },
  repel: { name: '밀쳐내기 두루마리', short: '밀쳐내기', desc: '주변 8칸의 적을 2칸 밀어낸다', target: 'self', range: 0 },
};

/** 판을 시작할 때 드는 소모품 */
export const START_ITEMS: ItemId[] = ['smoke'];
/** 들 수 있는 소모품 수 */
export const ITEM_SLOTS = 6;

/** 치유 물약: 최대 체력의 이 비율 */
export const HEAL_FRAC = 0.4;
/** 화염 물약: 3×3 안에 있던 것이 받는 피해 (원소 피해라 고정) */
export const FIRE_BOMB_DMG = 3;
/** 서리 물약: 3×3 안 적의 빙결 턴 */
export const FROST_BOMB_TURNS = 2;
/** 밀쳐내기 두루마리: 밀어내는 칸 */
export const REPEL_DIST = 2;
