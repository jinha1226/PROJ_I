// 소모품 표 (tactics/DESIGN.md 6절 "시제품 1의 소모품"). 물약은 마시거나 던지고, 두루마리는 읽는다. 판마다 모르는 이름이 섞인다
import type { ItemId } from '../core/types';

export interface ItemDef {
  name: string;
  /** 짧은 이름 (버튼) */
  short: string;
  cls: 'potion' | 'scroll';
  /** 마시면 / 읽으면 */
  desc: string;
  /** 던지면 (물약만) */
  throwDesc?: string;
  /** 정체를 알 때 읽는 두루마리가 고르는 것. self: 고를 칸 없음 / cell: range 안 칸 / empty: range 안 설 수 있는 빈칸 / bag: 가방의 미확인 물건 */
  target?: 'self' | 'cell' | 'empty' | 'bag';
}

export const ITEMS: Record<ItemId, ItemDef> = {
  heal: { name: '치유 물약', short: '치유', cls: 'potion', desc: '최대 체력의 40%를 회복한다', throwDesc: '3×3 안 모두 회복 (적도)' },
  fireBomb: { name: '화염 물약', short: '화염', cls: 'potion', desc: '내 칸에 불, 나에게 피해 3', throwDesc: '3×3에 불 원소, 맞은 것 피해 3' },
  frostBomb: { name: '서리 물약', short: '서리', cls: 'potion', desc: '내 칸에 서리, 2턴 못 걷는다', throwDesc: '3×3에 서리 원소, 맞은 적 2턴 빙결' },
  smoke: { name: '연막 두루마리', short: '연막', cls: 'scroll', target: 'cell', desc: '고른 칸 주변 3×3에 연기. 3턴 동안 시야 · 화살 · 마법을 막는다' },
  blink: { name: '도약 두루마리', short: '도약', cls: 'scroll', target: 'empty', desc: '4칸 안 빈칸으로 순간이동한다' },
  repel: { name: '밀쳐내기 두루마리', short: '밀쳐내기', cls: 'scroll', target: 'self', desc: '주변 8칸의 적을 2칸 밀어낸다' },
  identify: { name: '감정 두루마리', short: '감정', cls: 'scroll', target: 'bag', desc: '가방의 미확인 소모품 하나의 정체를 안다' },
};

/** 판을 시작할 때 드는 소모품 (정체를 안다) */
export const START_ITEMS: ItemId[] = ['smoke'];
/** 들 수 있는 소모품 수 */
export const ITEM_SLOTS = 6;
/** 던지기 · 칸을 고르는 두루마리의 거리 (체비쇼프) */
export const ITEM_RANGE = 4;

/** 모르는 물약의 색 (판마다 섞는다) */
export const POTION_COLORS = ['붉은', '푸른', '초록', '노란', '보라', '탁한', '은빛', '검은'];
/** 모르는 두루마리 글자를 만드는 음절 */
export const SCROLL_SYLLABLES = ['가', '르', '모', '벨', '시', '오', '타', '쿠', '레', '미', '즈', '나', '바', '케'];

/** 치유 물약: 최대 체력의 이 비율 */
export const HEAL_FRAC = 0.4;
/** 화염 물약: 맞은 것 (마시면 나) 피해 (원소 피해라 고정) */
export const FIRE_BOMB_DMG = 3;
/** 서리 물약: 던지면 적 빙결 턴, 마시면 못 걷는 턴 */
export const FROST_BOMB_TURNS = 2;
/** 밀쳐내기 두루마리: 밀어내는 칸 */
export const REPEL_DIST = 2;
