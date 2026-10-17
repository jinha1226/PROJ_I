// 층을 넘어 이어지는 파티원 성장 데이터: 레벨, 기술, 특성, 장비, 스트레스.
// 성장 규칙 (배틀하트 식):
//  - 처치 경험치는 살아 있는 파티원이 똑같이 받는다
//  - 레벨이 오르면 체력·위력(내부 스킬 수치)이 저절로 오른다. 플레이어가 숫자를 만질 일은 없다
//  - 정해진 레벨(TALENT_LEVELS)마다 직업별 특성 셋 중 하나를 고른다 → 이것이 빌드
import { CLASS_TALENTS, TALENT_LEVELS, TALENTS, type TalentDef } from '../data/talents';
import type { ClassId } from '../data/classes';
import type { MoodId } from '../data/moods';
import { makeHeroDef, type HeroComp, DEFAULT_COMP } from '../data/party';
import type { Item, ItemSlot, Prop, SkillId, TacticId, UnitDef } from './defs';
import { makeItem } from './items';
import { ALL_SKILLS, abilityStates, defaultRow, type AbilityState, type Row, type Unit } from './unit';

export const MAX_SKILL = 10;
export const MAX_ACTIVE = 4;
/** 레벨업마다 직업 스킬 · 든 무기 스킬이 오르는 양 */
const CLASS_GROWTH = 0.9;
/** 직업 스킬이 아닌 기본기(전투 · 회피 · 갑옷) */
const BASIC_GROWTH = 0.5;
const BASIC_SKILLS: SkillId[] = ['fighting', 'dodge', 'armour'];

export interface Hero {
  def: UnitDef;
  cls: ClassId;
  xl: number;
  /** 현재 레벨에서 쌓인 경험치 */
  xp: number;
  /** 내부 수치 (공식용). 화면에는 나오지 않는다 */
  skills: Record<SkillId, number>;
  abilities: AbilityState[];
  gear: Partial<Record<ItemSlot, Item>>;
  /** 특성 · 이벤트로 얻은 능력치 */
  perks: Prop[];
  /** 고른 특성 (단계 순서) */
  talents: string[];
  /** 아직 고르지 않은 특성 단계 수 */
  pending: number;
  tactic: TacticId;
  row: Row;
  autoMode: boolean;
  /** 층 시작 레벨 (쉬는 화면에서 성장 표시) */
  startXl: number;
  /** 스트레스 0~100 (sim/stress.ts) */
  stress: number;
  /** 붕괴 또는 각성. 층 사이 휴식에서 풀린다 */
  mood: MoodId | null;
  /** 쉬는 화면에 보일 스트레스 변화 */
  restNote: string;
}

export function xpToNext(xl: number): number {
  return Math.round(45 * Math.pow(1.4, xl - 1));
}

export function newHero(def: UnitDef): Hero {
  const abilities = abilityStates(def.abilities, def.autoAbilities);
  // 로테이션 기술만 처음부터 자동, 나머지는 플레이어가 쓴다 (기술 버튼 길게 누르기로 바꿀 수 있다)
  for (const a of abilities) if (!a.hidden) a.auto = a.def.control === 'auto';
  const skills = Object.fromEntries(ALL_SKILLS.map((s) => [s, def.skills?.[s] ?? 0])) as Record<SkillId, number>;
  const gear: Hero['gear'] = {};
  for (const [slot, id] of Object.entries(def.gear ?? {})) gear[slot as ItemSlot] = makeItem(id);
  return {
    def, cls: (def.cls ?? 'warrior') as ClassId, xl: 1, xp: 0, skills, gear, perks: [], talents: [], pending: 0,
    abilities,
    tactic: def.tactic, row: defaultRow(def), autoMode: false,
    startXl: 1, stress: 0, mood: null, restNote: '',
  };
}

export function newParty(comps: HeroComp[] = DEFAULT_COMP): Hero[] {
  return comps.map((c, i) => newHero(makeHeroDef(c, i)));
}

/** 층 시작: 성장 기록 시점 갱신, 재사용 대기 초기화 */
export function beginFloor(h: Hero) {
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

const hasTrait = (h: Hero, tag: string) => (h.def.traits ?? []).some((p) => p.kind === 'tag' && p.tag === tag);

/** 경험치 획득. 레벨이 오르면 true */
export function gainXp(h: Hero, amount: number): boolean {
  let leveled = false;
  h.xp += amount * (hasTrait(h, 'quick_learner') ? 1.15 : 1);
  while (h.xp >= xpToNext(h.xl)) {
    h.xp -= xpToNext(h.xl);
    h.xl++;
    leveled = true;
    const wpn = h.gear.weapon?.base.weapon?.skill ?? h.def.weapon.skill;
    const grow = new Set<SkillId>([...(h.def.classSkills ?? []), wpn]);
    for (const sk of grow) h.skills[sk] = Math.min(MAX_SKILL, h.skills[sk] + CLASS_GROWTH);
    for (const sk of BASIC_SKILLS) if (!grow.has(sk)) h.skills[sk] = Math.min(MAX_SKILL, h.skills[sk] + BASIC_GROWTH);
    if (TALENT_LEVELS.includes(h.xl) && tierCount(h) > h.talents.length + h.pending) h.pending++;
  }
  return leveled;
}

// ── 특성 ──

export function talentTiers(h: Hero): string[][] {
  return CLASS_TALENTS[h.cls] ?? [];
}

function tierCount(h: Hero) {
  return talentTiers(h).length;
}

/** 지금 골라야 할 단계 번호 (없으면 -1) */
export function nextTier(h: Hero): number {
  return h.pending > 0 ? h.talents.length : -1;
}

export function tierOptions(h: Hero, tier: number): TalentDef[] {
  return (talentTiers(h)[tier] ?? []).map((id) => TALENTS[id]);
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

export function applyTalent(h: Hero, id: string) {
  const t = TALENTS[id];
  if (!t || h.pending <= 0) return;
  if (t.learn && h.abilities.filter((a) => !a.hidden).length < MAX_ACTIVE) learnAbility(h, t.learn);
  if (t.mod) {
    const st = h.abilities.find((a) => a.def.id === t.mod!.ability);
    if (st) {
      const base = st.def;
      const patched = { ...base, ...t.mod.patch };
      patched.effects = [...(t.mod.patch?.effects ?? base.effects), ...(t.mod.addEffects ?? [])];
      patched.desc = `${base.desc} [${t.name}] ${t.desc}`;
      st.def = patched;
    }
  }
  if (t.props) h.perks.push(...t.props);
  h.talents.push(id);
  h.pending--;
}
