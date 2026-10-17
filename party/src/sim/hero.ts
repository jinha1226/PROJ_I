// 층을 넘어 이어지는 파티원 성장 데이터: 레벨, 스킬, 기술, 장비, 레벨업 선택.
// 성장 규칙 (DCSS 단순화):
//  - 처치 경험치는 살아 있는 파티원이 똑같이 받는다
//  - 레벨이 오르면 기본기(전투·회피·갑옷·든 무기)가 조금(+0.5) 오르고, 계열 스킬(화염·신앙·방패 등)은 투자해야 오른다.
//    세 선택지 중 하나를 고른다: ① 집중 스킬 투자(+1.5) ② 다른 관련 스킬 투자 ③ 기술 강화 / 능력치
//  - 스킬이 learnable 조건에 닿으면 그 기술을 저절로 익힌다 → 어디에 투자하느냐가 빌드
import type { Rng } from '../core/rng';
import type { MoodId } from '../data/moods';
import { ABILITIES } from '../data/abilities';
import { SKILL_NAME } from '../data/names';
import { makeHeroDef, type HeroComp } from '../data/party';
import { PARTY } from '../data/units';
import type { Item, ItemSlot, Prop, SkillId, TacticId, UnitDef } from './defs';
import { makeItem, propText } from './items';
import { ALL_SKILLS, abilityStates, defaultRow, type AbilityState, type Row, type Unit } from './unit';

export const MAX_SKILL = 10;

/** 스킬이 오르면 무엇이 좋아지는지 (선택지 설명용) */
export const SKILL_EFFECT: Partial<Record<SkillId, string>> = {
  fighting: '체력·명중·평타 위력',
  sword: '검 평타 위력·속도', axe: '도끼 평타 위력·속도', mace: '둔기 평타 위력·속도', bow: '원거리 평타·사격 기술 위력',
  armour: '갑옷 AC', dodge: '회피', shield: 'AC·방패 기술',
  spellcasting: '마나·모든 마법 실패율', fire: '화염 마법 위력·실패율', ice: '냉기 마법 위력·실패율', faith: '신앙 마법 위력·실패율',
};
export const MAX_ACTIVE = 4;
export const MAX_RANK = 3;
/** 스킬 투자 1회 */
export const SKILL_STEP = 1.5;
/** 레벨업마다 관련 스킬 전체가 오르는 양 */
const LEVEL_SKILL = 0.5;
/** 레벨업마다 저절로 오르는 기본기 */
const BASIC_SKILLS: SkillId[] = ['fighting', 'dodge', 'armour'];
/** 종족 적성 스킬이 레벨업마다 더 오르는 양 */
const APT_SKILL = 0.3;

export interface Hero {
  def: UnitDef;
  xl: number;
  /** 현재 레벨에서 쌓인 경험치 */
  xp: number;
  skills: Record<SkillId, number>;
  /** 집중 스킬: 레벨업 첫 선택지로 항상 나온다 (없으면 관련 스킬 중 가장 높은 것) */
  focus: SkillId | null;
  abilities: AbilityState[];
  gear: Partial<Record<ItemSlot, Item>>;
  /** 레벨업으로 얻은 능력치 */
  perks: Prop[];
  /** 아직 고르지 않은 레벨업 수 */
  pending: number;
  offer: Perk[] | null;
  tactic: TacticId;
  row: Row;
  autoMode: boolean;
  /** 층 시작 시점 기록 (쉬는 화면에서 성장 표시) */
  startSkills: Record<SkillId, number>;
  startXl: number;
  /** 스트레스 0~100 (sim/stress.ts) */
  stress: number;
  /** 붕괴 또는 각성. 층 사이 휴식에서 풀린다 */
  mood: MoodId | null;
  /** 쉬는 화면에 보일 스트레스 변화 */
  restNote: string;
}

export type Perk =
  | { kind: 'learn'; ability: string }
  | { kind: 'upgrade'; ability: string }
  | { kind: 'prop'; prop: Prop }
  | { kind: 'skill'; skill: SkillId; v: number };

export function xpToNext(xl: number): number {
  return Math.round(45 * Math.pow(1.4, xl - 1));
}

export function newHero(def: UnitDef): Hero {
  const skills = Object.fromEntries(ALL_SKILLS.map((s) => [s, def.skills?.[s] ?? 0])) as Record<SkillId, number>;
  const gear: Hero['gear'] = {};
  for (const [slot, id] of Object.entries(def.gear ?? {})) gear[slot as ItemSlot] = makeItem(id);
  return {
    def, xl: 1, xp: 0, skills, focus: null, gear, perks: [], pending: 0, offer: null,
    abilities: abilityStates(def.abilities, def.autoAbilities),
    tactic: def.tactic, row: defaultRow(def), autoMode: true,
    startSkills: { ...skills }, startXl: 1,
    stress: 0, mood: null, restNote: '',
  };
}

export function newParty(comps?: HeroComp[]): Hero[] {
  return comps ? comps.map((c, i) => newHero(makeHeroDef(c, i))) : PARTY.map(newHero);
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
  u.hero.row = u.row;
  u.hero.autoMode = u.autoMode;
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
    // 기본기(전투 · 회피 · 갑옷 · 든 무기)는 저절로 조금씩, 계열 스킬은 투자해야 오른다. 종족 적성은 더
    const bonus = h.def.levelSkillBonus ?? 0;
    const wpn = h.gear.weapon?.base.weapon?.skill ?? h.def.weapon.skill;
    for (const sk of relatedSkills(h)) {
      const basic = BASIC_SKILLS.includes(sk) || sk === wpn;
      h.skills[sk] = Math.min(MAX_SKILL, h.skills[sk] + (basic ? LEVEL_SKILL : 0) + bonus);
    }
    for (const sk of h.def.aptitudes ?? []) h.skills[sk] = Math.min(MAX_SKILL, h.skills[sk] + APT_SKILL);
    checkLearn(h);
  }
  return leveled;
}

/** 관련 스킬: 직업 스킬 + 장착 무기의 스킬 */
export function relatedSkills(h: Hero): SkillId[] {
  const out = [...(h.def.classSkills ?? [])];
  const wpn = h.gear.weapon?.base.weapon?.skill ?? h.def.weapon.skill;
  if (!out.includes(wpn)) out.push(wpn);
  return out;
}

export function focusSkill(h: Hero): SkillId {
  if (h.focus && relatedSkills(h).includes(h.focus)) return h.focus;
  return relatedSkills(h).reduce((a, b) => (h.skills[b] > h.skills[a] ? b : a));
}

/** 이 스킬을 v 올리면 새로 익히는 기술 */
export function unlocksAt(h: Hero, skill: SkillId, v: number): string[] {
  return learnable(h)
    .filter((l) => l.skill === skill && h.skills[skill] < l.level && h.skills[skill] + v >= l.level)
    .map((l) => l.ability);
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

/** 레벨업 선택지 세 개: ① 집중 스킬 ② 다른 관련 스킬 ③ 기술 강화 또는 능력치 */
export function makeOffer(h: Hero, rng: Rng): Perk[] {
  const pick = <T,>(a: T[]) => a.splice(rng.int(0, a.length - 1), 1)[0];
  const out: Perk[] = [];
  const open = relatedSkills(h).filter((sk) => h.skills[sk] < MAX_SKILL);
  const focus = focusSkill(h);
  if (open.includes(focus)) out.push({ kind: 'skill', skill: focus, v: SKILL_STEP });
  const others = open.filter((sk) => sk !== focus);
  if (others.length) out.push({ kind: 'skill', skill: pick(others), v: SKILL_STEP });
  const upgrades: Perk[] = h.abilities
    .filter((a) => !a.hidden && (a.rank ?? 0) < MAX_RANK)
    .map((a) => ({ kind: 'upgrade', ability: a.def.id }));
  const props = propPerks(h);
  if (upgrades.length && rng.chance(0.5)) out.push(pick(upgrades));
  while (out.length < 3 && (props.length || upgrades.length)) out.push(props.length ? pick(props) : pick(upgrades));
  return out;
}

/** 조건에 닿은 기술은 저절로 익힌다 (칸이 남아 있을 때) */
function checkLearn(h: Hero) {
  for (const l of learnable(h)) if (l.ready && activeCount(h) < MAX_ACTIVE) learnAbility(h, l.ability);
}

/** 배운 기술은 수동 전용으로 직접 쓰는 기술 목록 끝에 붙는다 */
function learnAbility(h: Hero, id: string) {
  const st = abilityStates([id])[0];
  st.auto = false;
  st.manualOnly = true;
  const firstHidden = h.abilities.findIndex((a) => a.hidden);
  h.abilities.splice(firstHidden < 0 ? h.abilities.length : firstHidden, 0, st);
  // 우선순위는 목록 순서대로 다시 매긴다 (새 기술이 마지막)
  const manual = h.abilities.filter((a) => !a.hidden);
  manual.forEach((a, i) => (a.prio = h.abilities.length - i));
}

export function applyPerk(h: Hero, p: Perk) {
  if (p.kind === 'learn') {
    learnAbility(h, p.ability);
  } else if (p.kind === 'skill') {
    h.skills[p.skill] = Math.min(MAX_SKILL, h.skills[p.skill] + p.v);
    checkLearn(h);
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
  if (p.kind === 'skill') {
    const cur = h.skills[p.skill];
    const next = Math.min(MAX_SKILL, cur + p.v);
    const learns = unlocksAt(h, p.skill, p.v).map((id) => ABILITIES[id].name);
    const full = learns.length > 0 && activeCount(h) >= MAX_ACTIVE;
    const upcoming = learnable(h).filter((l) => l.skill === p.skill && l.level > next).sort((a, b) => a.level - b.level)[0];
    return {
      title: `${SKILL_NAME[p.skill]} +${p.v}${p.skill === focusSkill(h) ? ' ★' : ''}`,
      desc:
        `${cur.toFixed(0)} → ${next.toFixed(0)}` +
        (learns.length ? (full ? ` · ${learns.join(', ')} 조건 충족 (기술 칸 가득)` : ` · ${learns.join(', ')} 습득!`) : '') +
        (!learns.length && upcoming ? ` · ${upcoming.level}에 ${ABILITIES[upcoming.ability].name}` : '') +
        ` · ${SKILL_EFFECT[p.skill] ?? '관련 기술 위력'}`,
      color: learns.length && !full ? '#ffe14d' : '#9fd0ff',
    };
  }
  if (p.kind === 'upgrade') {
    const st = h.abilities.find((a) => a.def.id === p.ability)!;
    const r = (st.rank ?? 0) + 1;
    return { title: `${st.def.name} 강화 ${r}단계`, desc: '위력 +25%, 재사용 대기 -15%', color: st.def.color };
  }
  return { title: propText(p.prop), desc: '능력치가 영구히 오른다', color: '#cccccc' };
}
