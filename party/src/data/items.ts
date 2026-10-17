import type { ItemBase, Prop, ResistKey, SkillId } from '../sim/defs';

// ── 기본 아이템 ──
// 무기는 사용 스킬이 다르면 거의 쓸모가 없다 (DCSS 식). 직업 제한은 없다.
// 갑옷 무게는 회피를 깎고 마법 실패율을 올린다.
const list: ItemBase[] = [
  // 무기
  { id: 'long_sword', name: '장검', slot: 'weapon', weapon: { skill: 'sword', damage: [7, 11], delay: 1.1, range: 0.5 } },
  { id: 'short_sword', name: '단검', slot: 'weapon', weapon: { skill: 'sword', damage: [4, 7], delay: 0.8, range: 0.5 } },
  { id: 'war_axe', name: '전투 도끼', slot: 'weapon', weapon: { skill: 'axe', damage: [10, 15], delay: 1.45, range: 0.55 } },
  { id: 'mace', name: '철퇴', slot: 'weapon', weapon: { skill: 'mace', damage: [8, 12], delay: 1.25, range: 0.5 } },
  {
    id: 'short_bow', name: '단궁', slot: 'weapon',
    weapon: { skill: 'bow', damage: [5, 8], delay: 1.0, range: 7, projectile: { speed: 16, color: '#e8d8a0' } },
  },
  {
    id: 'long_bow', name: '장궁', slot: 'weapon',
    weapon: { skill: 'bow', damage: [8, 12], delay: 1.4, range: 8, projectile: { speed: 18, color: '#e8d8a0' } },
  },
  {
    id: 'sling', name: '투석구', slot: 'weapon',
    weapon: { skill: 'bow', damage: [3, 5], delay: 1.2, range: 6, projectile: { speed: 14, color: '#bbbbbb' } },
  },
  {
    id: 'staff', name: '마법 지팡이', slot: 'weapon',
    weapon: { skill: 'spellcasting', damage: [3, 5], delay: 1.2, range: 6, projectile: { speed: 12, color: '#c9a0ff' } },
  },
  // 갑옷
  { id: 'robe', name: '로브', slot: 'armour', ac: 1, weight: 0 },
  { id: 'leather', name: '가죽 갑옷', slot: 'armour', ac: 3, weight: 2 },
  { id: 'ring_mail', name: '미늘 갑옷', slot: 'armour', ac: 4, weight: 3 },
  { id: 'chain_mail', name: '사슬 갑옷', slot: 'armour', ac: 6, weight: 6 },
  { id: 'plate', name: '판금 갑옷', slot: 'armour', ac: 9, weight: 9, weightDrop: 0.6 },
  // 장신구 (항상 속성이 붙는다)
  { id: 'ring', name: '반지', slot: 'jewel' },
  { id: 'amulet', name: '목걸이', slot: 'jewel' },
];

export const ITEM_BASES: Record<string, ItemBase> = Object.fromEntries(list.map((b) => [b.id, b]));
export const ITEM_BASE_LIST = list;

// ── 속성 풀 ──
// 전술을 바꾸는 속성(저항, 적중 시 효과, 계열 위력, 시전 속도, 기절 면역)을 단순 수치보다 자주 뽑는다.
// roll(depth) 로 수치를 정한다. slots 에 없는 칸에는 붙지 않는다.
export interface PropRoll {
  w: number;
  slots?: ('weapon' | 'armour' | 'jewel')[];
  roll: (r: () => number, depth: number) => Prop;
}

const RES: ResistKey[] = ['fire', 'cold', 'elec', 'poison', 'neg'];
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const n = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const POWER_SCHOOLS: SkillId[] = ['fire', 'ice', 'faith', 'bow', 'fighting'];

export const GOOD_PROPS: PropRoll[] = [
  { w: 8, slots: ['armour', 'jewel'], roll: (r) => ({ kind: 'resist', key: pick(r, RES), v: 1 }) },
  { w: 3, roll: (r, d) => ({ kind: 'stat', stat: pick(r, ['str', 'dex', 'int'] as const), v: n(r, 2, 2 + Math.floor(d / 2)) }) },
  { w: 2, slots: ['armour', 'jewel'], roll: (r, d) => ({ kind: 'ac', v: n(r, 2, 3 + Math.floor(d / 2)) }) },
  { w: 2, roll: (r, d) => ({ kind: 'ev', v: n(r, 2, 3 + Math.floor(d / 2)) }) },
  { w: 3, slots: ['armour', 'jewel'], roll: (r) => ({ kind: 'will', v: n(r, 6, 10) }) },
  { w: 3, roll: (r, d) => ({ kind: 'hp', v: n(r, 8, 12 + d * 2) }) },
  { w: 2, slots: ['weapon', 'jewel'], roll: (r) => ({ kind: 'mp', v: n(r, 6, 10) }) },
  { w: 5, slots: ['weapon', 'jewel'], roll: (r, d) => ({ kind: 'power', school: pick(r, POWER_SCHOOLS), v: n(r, 15, 20 + d * 3) }) },
  { w: 3, slots: ['weapon', 'jewel'], roll: (r) => ({ kind: 'castSpeed', v: n(r, 15, 25) }) },
  { w: 3, slots: ['weapon'], roll: (r, d) => ({ kind: 'weaponDmg', v: n(r, 10, 15 + d * 2) }) },
  { w: 2, slots: ['weapon'], roll: (r) => ({ kind: 'acc', v: n(r, 3, 5) }) },
  {
    w: 4, slots: ['weapon'],
    roll: (r) => pick(r, [
      { kind: 'onHit', apply: { status: 'burn', duration: 3, chance: 0.3 } },
      { kind: 'onHit', apply: { status: 'poison', duration: 5, chance: 0.4 } },
      { kind: 'onHit', apply: { status: 'slow', duration: 2, chance: 0.2 } },
    ] as Prop[]),
  },
];

/** 아티팩트에만 붙는 강한 속성 */
export const RARE_PROPS: PropRoll[] = [
  { w: 3, slots: ['armour', 'jewel'], roll: (r) => ({ kind: 'resist', key: pick(r, RES.filter((k) => k !== 'poison')), v: 2 }) },
  { w: 2, slots: ['armour', 'jewel'], roll: () => ({ kind: 'tag', tag: 'unstunnable' }) },
];

/** 아티팩트 단점 */
export const BAD_PROPS: PropRoll[] = [
  { w: 3, roll: (r) => ({ kind: 'resist', key: pick(r, RES.filter((k) => k !== 'poison')), v: -1 }) },
  { w: 2, roll: (r) => ({ kind: 'hp', v: -n(r, 6, 10) }) },
  { w: 2, roll: (r) => ({ kind: 'ev', v: -n(r, 2, 4) }) },
  { w: 2, roll: (r) => ({ kind: 'will', v: -n(r, 5, 8) }) },
];

export const ARTIFACT_PREFIX = ['잿불', '서리', '폭풍', '그림자', '맹세', '망자', '여명', '독사', '거인', '방랑자', '은빛', '피바람'];
export const ARTIFACT_SUFFIX: Record<string, string[]> = {
  weapon: ['의 송곳니', '의 분노', '의 칼날', '의 일격'],
  armour: ['의 외피', '의 수호', '의 장막', '의 비늘'],
  jewel: ['의 심장', '의 눈', '의 맹약', '의 속삭임'],
};
