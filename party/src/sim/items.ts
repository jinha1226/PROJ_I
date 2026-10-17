// 장비 생성과 장비 → 능력치 보너스 합산.
// 장비 속성과 레벨업 보너스는 같은 Prop 형식이라 한 곳(Bonus)으로 모인다.
import type { Rng } from '../core/rng';
import { ARTIFACT_PREFIX, ARTIFACT_SUFFIX, BAD_PROPS, GOOD_PROPS, ITEM_BASE_LIST, ITEM_BASES, RARE_PROPS, type PropRoll } from '../data/items';
import { RES_NAME, SKILL_NAME } from '../data/names';
import { STATUSES } from '../data/statuses';
import type { Item, ItemSlot, Prop, ResistKey, SkillId, StatusApply, WeaponDef } from './defs';

/** 장비·레벨업으로 얻는 능력치 합계 */
export interface Bonus {
  ac: number;
  ev: number;
  will: number;
  hp: number;
  mp: number;
  acc: number;
  str: number;
  dex: number;
  int: number;
  resists: Partial<Record<ResistKey, number>>;
  power: Partial<Record<SkillId, number>>;
  castSpeed: number;
  weaponDmg: number;
  onHit: StatusApply[];
  tags: string[];
  /** 갑옷 무게 */
  weight: number;
}

export function emptyBonus(): Bonus {
  return {
    ac: 0, ev: 0, will: 0, hp: 0, mp: 0, acc: 0, str: 0, dex: 0, int: 0,
    resists: {}, power: {}, castSpeed: 0, weaponDmg: 0, onHit: [], tags: [], weight: 0,
  };
}

export function addProp(b: Bonus, p: Prop) {
  switch (p.kind) {
    case 'resist':
      b.resists[p.key] = (b.resists[p.key] ?? 0) + p.v;
      break;
    case 'stat':
      b[p.stat] += p.v;
      break;
    case 'power':
      b.power[p.school] = (b.power[p.school] ?? 0) + p.v;
      break;
    case 'onHit':
      b.onHit.push(p.apply);
      break;
    case 'tag':
      if (!b.tags.includes(p.tag)) b.tags.push(p.tag);
      break;
    default:
      b[p.kind] += p.v;
  }
}

export function addItem(b: Bonus, it: Item) {
  if (it.base.slot === 'armour') {
    b.ac += (it.base.ac ?? 0) + it.plus;
    b.weight += it.base.weight ?? 0;
  }
  if (it.base.slot === 'weapon') b.acc += it.plus;
  for (const p of it.props) addProp(b, p);
}

/** 장착 무기 → 무기 정의 (강화 수치는 피해 +6%/단계) */
export function weaponOf(it: Item): WeaponDef {
  const w = it.base.weapon!;
  const m = 1 + it.plus * 0.06;
  return { ...w, name: it.name, damage: [w.damage[0] * m, w.damage[1] * m] };
}

// ── 생성 ──

let nextUid = 1;

export function makeItem(baseId: string, plus = 0, props: Prop[] = [], rarity: Item['rarity'] = 'common', name?: string): Item {
  const base = ITEM_BASES[baseId];
  if (!base) throw new Error(`unknown item ${baseId}`);
  return { uid: nextUid++, base, rarity, plus, props, name: name ?? base.name };
}

function weighted<T extends { w: number }>(rng: Rng, list: T[]): T {
  const total = list.reduce((s, x) => s + x.w, 0);
  let r = rng.next() * total;
  for (const x of list) if ((r -= x.w) <= 0) return x;
  return list[list.length - 1];
}

function rollProps(rng: Rng, pool: PropRoll[], slot: ItemSlot, count: number, depth: number, out: Prop[]) {
  const ok = pool.filter((p) => !p.slots || p.slots.includes(slot));
  if (!ok.length) return;
  for (let i = 0, tries = 0; i < count && tries < 20; tries++) {
    const p = weighted(rng, ok).roll(() => rng.next(), depth);
    // 같은 종류(같은 저항 등)는 겹치지 않게
    if (out.some((q) => propKey(q) === propKey(p))) continue;
    out.push(p);
    i++;
  }
}

function propKey(p: Prop): string {
  if (p.kind === 'resist') return `r${p.key}`;
  if (p.kind === 'stat') return `s${p.stat}`;
  if (p.kind === 'power') return `p${p.school}`;
  return p.kind;
}

const RARITY_RANK: Record<Item['rarity'], number> = { common: 0, magic: 1, artifact: 2 };

/** 층 깊이에 맞는 무작위 장비. force = 등급 고정, min = 최소 등급 */
export function genItem(rng: Rng, depth: number, opts: { force?: Item['rarity']; min?: Item['rarity'] } = {}): Item {
  const slotRoll = rng.next();
  const slot: ItemSlot = slotRoll < 0.36 ? 'weapon' : slotRoll < 0.68 ? 'armour' : 'jewel';
  const bases = ITEM_BASE_LIST.filter((b) => b.slot === slot).map((b) => ({ b, w: b.weightDrop ?? 1 }));
  const base = weighted(rng, bases).b;

  const r = rng.next();
  let rarity: Item['rarity'] = opts.force ?? (r < 0.06 + depth * 0.04 ? 'artifact' : r < 0.55 ? 'magic' : 'common');
  if (slot === 'jewel' && rarity === 'common') rarity = 'magic';
  if (opts.min && RARITY_RANK[rarity] < RARITY_RANK[opts.min]) rarity = opts.min;

  const plus = slot === 'jewel' ? 0 : rng.int(0, Math.min(4, depth));
  const props: Prop[] = [];
  let name = base.name;
  if (rarity === 'magic') rollProps(rng, GOOD_PROPS, slot, 1, depth, props);
  if (rarity === 'artifact') {
    if (rng.chance(0.4)) rollProps(rng, RARE_PROPS, slot, 1, depth, props);
    rollProps(rng, GOOD_PROPS, slot, rng.chance(0.5) ? 3 : 2, depth, props);
    if (rng.chance(0.4)) rollProps(rng, BAD_PROPS, slot, 1, depth, props);
    const pre = ARTIFACT_PREFIX[rng.int(0, ARTIFACT_PREFIX.length - 1)];
    const suf = ARTIFACT_SUFFIX[slot][rng.int(0, ARTIFACT_SUFFIX[slot].length - 1)];
    name = `「${pre}${suf}」 ${base.name}`;
  }
  return { uid: nextUid++, base, rarity, plus, props, name };
}

// ── 표시 ──

const sign = (v: number) => (v >= 0 ? `+${v}` : `${v}`);
const STAT_NAME = { str: '힘', dex: '민첩', int: '지능' };

export function propText(p: Prop): string {
  switch (p.kind) {
    case 'resist':
      return `${RES_NAME[p.key]} 저항 ${p.v > 0 ? '+'.repeat(p.v) : '취약'}`;
    case 'stat':
      return `${STAT_NAME[p.stat]} ${sign(p.v)}`;
    case 'ac':
      return `AC ${sign(p.v)}`;
    case 'ev':
      return `회피 ${sign(p.v)}`;
    case 'will':
      return `의지력 ${sign(p.v)}`;
    case 'hp':
      return `체력 ${sign(p.v)}`;
    case 'mp':
      return `마나 ${sign(p.v)}`;
    case 'acc':
      return `명중 ${sign(p.v)}`;
    case 'power':
      return `${SKILL_NAME[p.school]} 기술 위력 +${p.v}%`;
    case 'castSpeed':
      return `시전 속도 +${p.v}%`;
    case 'weaponDmg':
      return `평타 피해 +${p.v}%`;
    case 'onHit':
      return `적중 시 ${STATUSES[p.apply.status].name} (${Math.round((p.apply.chance ?? 1) * 100)}%)`;
    case 'tag':
      return p.tag === 'unstunnable' ? '기절 면역' : p.tag;
  }
}

export function isBadProp(p: Prop): boolean {
  return 'v' in p && p.v < 0;
}

export const SLOT_NAME: Record<ItemSlot, string> = { weapon: '무기', armour: '갑옷', jewel: '장신구' };
export const RARITY_COLOR: Record<Item['rarity'], string> = { common: '#dddddd', magic: '#7fb0ff', artifact: '#ffcc55' };

export function itemTitle(it: Item): string {
  return it.plus ? `${it.name} +${it.plus}` : it.name;
}

/** 기본 성능 한 줄 (무기: 피해/속도, 갑옷: AC/무게) */
export function itemBaseLine(it: Item): string {
  if (it.base.weapon) {
    const w = weaponOf(it);
    return `${SKILL_NAME[w.skill]} · 피해 ${w.damage[0].toFixed(0)}~${w.damage[1].toFixed(0)} · ${w.delay}초${w.range > 1.5 ? ` · 사거리 ${w.range}` : ''}`;
  }
  if (it.base.slot === 'armour') return `AC ${(it.base.ac ?? 0) + it.plus} · 무게 ${it.base.weight}`;
  return '';
}
