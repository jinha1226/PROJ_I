export type ItemCategory = 'currency' | 'junk' | 'material' | 'equipment' | 'relic' | 'consumable';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type WeaponKind = '1h' | '2h';
/** Which mesh shows in the hand: a node baked into the Knight model, or a separate prop model. */
export type WeaponMesh = 'knight:1H_Sword' | 'knight:2H_Sword' | 'prop:Skeleton_Axe' | 'prop:Skeleton_Blade';

export interface WeaponStats {
  kind: WeaponKind;
  damage: number;
  /** Attack duration multiplier; >1 is slower. */
  speed: number;
  reach: number;
  mesh: WeaponMesh;
}

export interface ArmorStats {
  reduction: number;
  bonusHp: number;
  helmet: boolean;
}

export interface ConsumableStats {
  heal: number;
  useTime: number;
  /** Lantern oil restored. */
  oil?: number;
}

/** Icon is either a rendered 3D model (dungeon piece / prop / weapon) or a glyph fallback. */
export interface IconSpec {
  model?: string;
  glyph: string;
  color: string;
}

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  w: number;
  h: number;
  value: number;
  maxStack: number;
  desc: string;
  icon: IconSpec;
  weapon?: WeaponStats;
  armor?: ArmorStats;
  consumable?: ConsumableStats;
}

export const CATEGORY_LABEL: Readonly<Record<ItemCategory, string>> = {
  currency: '재화',
  junk: '고물',
  material: '재료',
  equipment: '장비',
  relic: '유물',
  consumable: '소모품',
};

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
};

export const RARITY_COLOR: Readonly<Record<Rarity, string>> = {
  common: '#9aa0a6',
  uncommon: '#5fbf6a',
  rare: '#4f9dff',
  epic: '#b46cff',
  legendary: '#ffb02e',
};

/** Seconds a search takes to reveal one item of this rarity. */
export const REVEAL_SECONDS: Readonly<Record<Rarity, number>> = {
  common: 0.3,
  uncommon: 0.45,
  rare: 0.7,
  epic: 1.0,
  legendary: 1.4,
};

const DEFS: readonly ItemDef[] = [
  // 재화
  {id: 'gold_coin', name: '금화', category: 'currency', rarity: 'common', w: 1, h: 1, value: 2, maxStack: 100, desc: '어디서나 통용되는 금화.', icon: {model: 'coin', glyph: '●', color: '#e8b830'}},
  {id: 'ruby', name: '루비', category: 'currency', rarity: 'rare', w: 1, h: 1, value: 160, maxStack: 5, desc: '작지만 비싼 보석. 칸 대비 가치가 높다.', icon: {glyph: '◆', color: '#ff4060'}},
  // 고물
  {id: 'cracked_plate', name: '금 간 접시', category: 'junk', rarity: 'common', w: 1, h: 1, value: 10, maxStack: 1, desc: '팔면 몇 푼은 받는다.', icon: {model: 'plate', glyph: '◯', color: '#c9c2b0'}},
  {id: 'dusty_bottle', name: '먼지 쌓인 술병', category: 'junk', rarity: 'common', w: 1, h: 1, value: 14, maxStack: 1, desc: '내용물은 상한 지 오래다.', icon: {model: 'bottle_B_brown', glyph: '▮', color: '#8a5a2b'}},
  {id: 'candelabra', name: '녹슨 촛대', category: 'junk', rarity: 'common', w: 1, h: 2, value: 34, maxStack: 1, desc: '녹을 벗기면 은일지도.', icon: {model: 'candle_triple', glyph: 'Ψ', color: '#d8c79a'}},
  {id: 'silverware', name: '은 식기 묶음', category: 'junk', rarity: 'uncommon', w: 2, h: 1, value: 80, maxStack: 1, desc: '귀족의 식탁에서 나온 은 식기.', icon: {model: 'plate_stack', glyph: '≡', color: '#dfe6ee'}},
  {id: 'old_keg', name: '낡은 술통', category: 'junk', rarity: 'common', w: 2, h: 2, value: 45, maxStack: 1, desc: '크고 무겁고 싸다. 정말 들고 갈 건가?', icon: {model: 'keg', glyph: '▣', color: '#8a5a2b'}},
  {id: 'broken_crest', name: '부서진 문장', category: 'junk', rarity: 'uncommon', w: 2, h: 2, value: 70, maxStack: 1, desc: '몰락한 기사단의 문장 조각.', icon: {model: 'sword_shield_broken', glyph: '⛉', color: '#9aa0a6'}},
  // 재료
  {id: 'bone_dust', name: '뼛가루', category: 'material', rarity: 'common', w: 1, h: 1, value: 16, maxStack: 10, desc: '해골에서 긁어낸 가루. 연금술 재료.', icon: {glyph: '⁂', color: '#e9e3d2'}},
  {id: 'iron_scrap', name: '쇳조각', category: 'material', rarity: 'common', w: 1, h: 1, value: 14, maxStack: 10, desc: '대장장이가 반길 쇳조각.', icon: {glyph: '▲', color: '#8e9aa6'}},
  {id: 'mana_crystal', name: '마력 결정', category: 'material', rarity: 'rare', w: 1, h: 1, value: 110, maxStack: 5, desc: '해골 마법사의 핵에서 굳은 결정.', icon: {glyph: '◈', color: '#6fb6ff'}},
  {id: 'ancient_silk', name: '고대 비단', category: 'material', rarity: 'uncommon', w: 1, h: 2, value: 75, maxStack: 1, desc: '오래된 깃발에서 뜯어낸 비단.', icon: {model: 'banner_thin_red', glyph: '▤', color: '#c0392b'}},
  // 장비
  {id: 'rusty_sword', name: '녹슨 검', category: 'equipment', rarity: 'common', w: 1, h: 3, value: 40, maxStack: 1, desc: '없는 것보단 낫다.', icon: {model: 'knight:1H_Sword', glyph: '†', color: '#b0b8c0'}, weapon: {kind: '1h', damage: 16, speed: 1, reach: 2.5, mesh: 'knight:1H_Sword'}},
  {id: 'bone_blade', name: '해골 장검', category: 'equipment', rarity: 'uncommon', w: 1, h: 3, value: 120, maxStack: 1, desc: '가볍고 날카롭다.', icon: {model: 'prop:Skeleton_Blade', glyph: '†', color: '#d9d3c0'}, weapon: {kind: '1h', damage: 21, speed: 0.92, reach: 2.6, mesh: 'prop:Skeleton_Blade'}},
  {id: 'bone_axe', name: '해골 도끼', category: 'equipment', rarity: 'rare', w: 2, h: 3, value: 210, maxStack: 1, desc: '느리지만 묵직한 한 방.', icon: {model: 'prop:Skeleton_Axe', glyph: '⚒', color: '#d9d3c0'}, weapon: {kind: '1h', damage: 30, speed: 1.15, reach: 2.5, mesh: 'prop:Skeleton_Axe'}},
  {id: 'greatsword', name: '기사의 대검', category: 'equipment', rarity: 'epic', w: 1, h: 4, value: 420, maxStack: 1, desc: '양손으로 휘두르는 대검. 넓고 무겁다.', icon: {model: 'knight:2H_Sword', glyph: '⚔', color: '#e0e6ee'}, weapon: {kind: '2h', damage: 44, speed: 1.3, reach: 3.1, mesh: 'knight:2H_Sword'}},
  {id: 'leather_armor', name: '가죽 갑옷', category: 'equipment', rarity: 'common', w: 2, h: 2, value: 90, maxStack: 1, desc: '피해 12% 감소, 최대 체력 +10.', icon: {glyph: '⛨', color: '#a0703c'}, armor: {reduction: 0.12, bonusHp: 10, helmet: false}},
  {id: 'knight_plate', name: '기사 판금 갑옷', category: 'equipment', rarity: 'rare', w: 2, h: 3, value: 340, maxStack: 1, desc: '피해 28% 감소, 최대 체력 +25. 투구 포함.', icon: {glyph: '⛨', color: '#c7d0da'}, armor: {reduction: 0.28, bonusHp: 25, helmet: true}},
  // 유물
  {id: 'lich_keyring', name: '리치의 열쇠꾸러미', category: 'relic', rarity: 'rare', w: 1, h: 1, value: 380, maxStack: 1, desc: '무엇을 여는 열쇠일까. 수집가가 비싸게 산다.', icon: {model: 'keyring', glyph: '⚷', color: '#e0c060'}},
  {id: 'golden_chalice', name: '황금 성배', category: 'relic', rarity: 'epic', w: 1, h: 2, value: 640, maxStack: 1, desc: '왕실 예배당의 성배.', icon: {glyph: '♆', color: '#ffcf4a'}},
  {id: 'bone_crown', name: '해골 군주의 왕관', category: 'relic', rarity: 'epic', w: 2, h: 2, value: 980, maxStack: 1, desc: '아직도 차가운 기운이 감돈다.', icon: {glyph: '♛', color: '#e8e0c8'}},
  {id: 'crest_trophy', name: '황금 기사단 문장', category: 'relic', rarity: 'epic', w: 2, h: 2, value: 860, maxStack: 1, desc: '기사단의 영광이 남은 전리품.', icon: {model: 'sword_shield_gold', glyph: '⛉', color: '#ffcf4a'}},
  {id: 'royal_coffer', name: '왕실 금고', category: 'relic', rarity: 'legendary', w: 2, h: 2, value: 2200, maxStack: 1, desc: '한 번의 탈출로 인생이 바뀐다.', icon: {model: 'chest_gold', glyph: '▩', color: '#ffb02e'}},
  // 소모품
  {id: 'bandage', name: '붕대', category: 'consumable', rarity: 'common', w: 1, h: 1, value: 15, maxStack: 3, desc: '빠르게 체력 18 회복.', icon: {glyph: '✚', color: '#f0f0e8'}, consumable: {heal: 18, useTime: 0.6}},
  {id: 'lamp_oil', name: '랜턴 기름병', category: 'consumable', rarity: 'common', w: 1, h: 1, value: 30, maxStack: 2, desc: '랜턴 기름 30 보충. 더 오래 머물 수 있다.', icon: {model: 'bottle_A_brown', glyph: '▼', color: '#f0a040'}, consumable: {heal: 0, oil: 30, useTime: 0.8}},
  {id: 'health_potion', name: '치유 물약', category: 'consumable', rarity: 'uncommon', w: 1, h: 1, value: 45, maxStack: 1, desc: '체력 50 회복. 마시는 데 시간이 걸린다.', icon: {model: 'bottle_A_labeled_green', glyph: '⚱', color: '#4fdb7a'}, consumable: {heal: 50, useTime: 1.1}},
];

export const ITEMS: ReadonlyMap<string, ItemDef> = new Map(DEFS.map(def => [def.id, def]));

export function itemDef(id: string): ItemDef {
  const def = ITEMS.get(id);
  if (!def) throw new Error(`Unknown item: ${id}`);
  return def;
}

export const allItemDefs = (): readonly ItemDef[] => DEFS;
