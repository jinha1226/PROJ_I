// 소모품 표 (tactics/DESIGN.md 6절). 시제품에서는 정체를 알고 시작한다 (미확인은 나중에)
import type { ItemId } from '../core/types';

export interface ItemDef {
  name: string;
  /** 짧은 이름 (버튼) */
  short: string;
  desc: string;
  /** 고를 수 있는 칸까지 거리 (체비쇼프) */
  range: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  smoke: { name: '연막 두루마리', short: '연막', desc: '고른 칸 주변 3×3에 연기. 3턴 동안 시야 · 화살 · 마법을 막는다', range: 4 },
};

/** 판을 시작할 때 드는 소모품 */
export const START_ITEMS: ItemId[] = ['smoke'];
