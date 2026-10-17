// 층을 넘어 이어지는 파티원 성장 데이터: 레벨, 스킬, 기술, 장비, 레벨업 선택.
// 성장 규칙 (DCSS 단순화):
//  - 처치 경험치는 살아 있는 파티원이 똑같이 받는다
//  - 경험치 일부가 스킬로 들어가는데, 최근에 실제로 쓴 스킬에 쓴 만큼 나뉜다 (자동 훈련)
//  - 레벨업마다 두 선택지 중 하나를 고른다 (새 기술 / 기술 강화 / 능력치)
import type { Rng } from '../core/rng';
import { ABILITIES } from '../data/abilities';
import { SKILL_NAME } from '../data/names';
import { PARTY } from '../data/units';
import type { Item, ItemSlot, Prop, SkillId, TacticId, UnitDef } from './defs';
import { makeItem, propText } from './items';
import { ALL_SKILLS, abilityStates, type AbilityState, type Unit } from './unit';

export const MAX_SKILL = 10;
export const MAX_ACTIVE = 4;
export const MAX_RANK = 3;
/** 경험치 1 당 스킬 훈련량 */
const SKILL_RATE = 0.028;

export interface Hero {
  def: UnitDef;
  xl: number;
  /** 현재 레벨에서 쌓인 경험치 */
  xp: number;
  skills: Record<SkillId, number>;
  /** 최근 사용량 (훈련 배분 비율) */
  train: Partial<Record<SkillId, number>>;
  abilities: AbilityState[];
  gear: Partial<Record<ItemSlot, Item>>;
  /** 레벨업으로 얻은 능력치 */
  perks: Prop[];
  /** 아직 고르지 않은 레벨업 수 */
  pending: number;
  offer: Perk[] | null;
  tactic: TacticId;
  autoMode: boolean;
  /** 층 시작 시점 기록 (쉬는 화면에서 성장 표시) */
  startSkills: Record<SkillId, number>;
  startXl: number;
}

export type Perk =
  | { kind: 'learn'; ability: string }
  | { kind: 'upgrade'; ability: string }
  | { kind: 'prop'; prop: Prop };

export function xpToNext(xl: number): number {
  return Math.round(45 * Math.pow(1.4, xl - 1));
}

export function newHero(def: UnitDef): Hero {
  const skills = Object.fromEntries(ALL_SKILLS.map((s) => [s, def.skills?.[s] ?? 0])) as Record<SkillId, number>;
  const gear: Hero['gear'] = {};
  for (const [slot, id] of Object.entries(def.gear ?? {})) gear[slot as ItemSlot] = makeItem(id);
  return {
    def, xl: 1, xp: 0, skills, train: {}, gear, perks: [], pending: 0, offer: null,
    abilities: abilityStates(def.abilities, def.autoAbilities),
    tactic: def.tactic, autoMode: true,
    startSkills: { ...skills }, startXl: 1,
  };
}

export function newParty(): Hero[] {
  return PARTY.map(newHero);
}

/** 층 시작: 성장 기록 시점 갱신, 재사용 대기 초기화 */
export function beginFloor(h: Hero) {
  h.startSkills = { ...h.skills };
  h.startXl = h.xl;
  for (const a of h.abilities) a.cd = 0;
}

/** 층 끝: 전투 중 바꾼 전술·자동 설정을 영웅에 남긴다 */
export function saveFromUnit(u: Unit) {
  if (!u.hero) return;
  u.hero.tactic = u.tactic;
  u.hero.autoMode = u.autoMode;
}

/** 스킬 사용 기록 (훈련 배분용) */
export function train(u: Unit, skill: SkillId, amount: number) {
  const h = u.hero;
  if (!h) return;
  h.train[skill] = (h.train[skill] ?? 0) + amount;
}

/** 스킬 1 올리는 데 드는 훈련량 (높을수록 느리다) */
function skillCost(level: number) {
  return 1 + level * 0.35;
}

/** 경험치 획득. 레벨이 오르면 true */
export function gainXp(h: Hero, amount: number): boolean {
  let leveled = false;
  h.xp += amount;
  while (h.xp >= xpToNext(h.xl)) {
    h.xp -= xpToNext(h.xl);
    h.xl++;
    h.pending++;
    leveled = true;
  }
  // 자동 훈련: 최근 사용량 비율대로 나눈다
  const entries = (Object.entries(h.train) as [SkillId, number][]).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total > 0) {
    const pool = amount * SKILL_RATE;
    for (const [sk, v] of entries) {
      if (h.skills[sk] >= MAX_SKILL) continue;
      h.skills[sk] = Math.min(MAX_SKILL, h.skills[sk] + (pool * v) / total / skillCost(h.skills[sk]));
    }
    // 오래된 사용 기록은 점점 잊는다
    for (const [sk, v] of entries) h.train[sk] = v * 0.85;
  }
  return leveled;
}

// ── 레벨업 선택 ──

function activeCount(h: Hero) {
  return h.abilities.filter((a) => !a.hidden).length;
}

function propPerks(h: Hero): Perk[] {
  const d = h.def;
  const main = d.role === 'caster' || d.role === 'support' ? 'int' : d.role === 'ranged' ? 'dex' : 'str';
  const out: Prop[] = [
    { kind: 'hp', v: 12 },
    { kind: 'ac', v: 2 },
    { kind: 'ev', v: 2 },
    { kind: 'will', v: 6 },
    { kind: 'stat', stat: main, v: 2 },
  ];
  if (d.mp > 0) out.push({ kind: 'mp', v: 8 });
  return out.map((prop) => ({ kind: 'prop', prop }));
}

/** 배울 수 있는 기술 (스킬 조건 충족, 아직 모름) */
export function learnable(h: Hero): { ability: string; skill: SkillId; level: number; ready: boolean }[] {
  return (h.def.learnable ?? [])
    .filter((l) => !h.abilities.some((a) => a.def.id === l.ability))
    .map((l) => ({ ...l, ready: h.skills[l.skill] >= l.level }));
}

/** 레벨업 선택지 두 개. 배울 기술이 있으면 하나는 그것으로 */
export function makeOffer(h: Hero, rng: Rng): Perk[] {
  const pick = <T,>(a: T[]) => a.splice(rng.int(0, a.length - 1), 1)[0];
  const learns: Perk[] =
    activeCount(h) < MAX_ACTIVE ? learnable(h).filter((l) => l.ready).map((l) => ({ kind: 'learn', ability: l.ability })) : [];
  const upgrades: Perk[] = h.abilities
    .filter((a) => !a.hidden && (a.rank ?? 0) < MAX_RANK)
    .map((a) => ({ kind: 'upgrade', ability: a.def.id }));
  const props = propPerks(h);
  const out: Perk[] = [];
  if (learns.length) out.push(pick(learns));
  if (upgrades.length && (out.length === 0 || rng.chance(0.5))) out.push(pick(upgrades));
  while (out.length < 2 && props.length) out.push(pick(props));
  return out;
}

export function applyPerk(h: Hero, p: Perk) {
  if (p.kind === 'learn') {
    const st = abilityStates([p.ability])[0];
    const firstHidden = h.abilities.findIndex((a) => a.hidden);
    h.abilities.splice(firstHidden < 0 ? h.abilities.length : firstHidden, 0, st);
    // 우선순위는 목록 순서대로 다시 매긴다 (새 기술이 마지막)
    const manual = h.abilities.filter((a) => !a.hidden);
    manual.forEach((a, i) => (a.prio = h.abilities.length - i));
  } else if (p.kind === 'upgrade') {
    const st = h.abilities.find((a) => a.def.id === p.ability);
    if (st) st.rank = (st.rank ?? 0) + 1;
  } else {
    h.perks.push(p.prop);
  }
  h.pending = Math.max(0, h.pending - 1);
  h.offer = null;
}

export function perkText(h: Hero, p: Perk): { title: string; desc: string; color: string } {
  if (p.kind === 'learn') {
    const ab = ABILITIES[p.ability];
    const l = h.def.learnable?.find((x) => x.ability === p.ability);
    return {
      title: `새 기술: ${ab.name}`,
      desc: `${ab.desc}${l ? ` (${SKILL_NAME[l.skill]} ${l.level} 달성)` : ''}`,
      color: ab.color,
    };
  }
  if (p.kind === 'upgrade') {
    const st = h.abilities.find((a) => a.def.id === p.ability)!;
    const r = (st.rank ?? 0) + 1;
    return { title: `${st.def.name} 강화 ${r}단계`, desc: '위력 +25%, 재사용 대기 -15%', color: st.def.color };
  }
  return { title: propText(p.prop), desc: '능력치가 영구히 오른다', color: '#cccccc' };
}
