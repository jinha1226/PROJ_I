// 용병단 (다키스트 던전 식): 명부 · 금고 · 묘지 · 선술집, 그리고 저장.
// 원정대는 명부에서 최대 4명. 원정에서 쓰러진 용병은 영구히 묘지로 간다.
// 저장은 층 시작 시점 기준이다 (층 도중에 끄면 그 층 처음부터 다시).
import { Rng } from '../core/rng';
import { CLASS_LIST, type ClassId } from '../data/classes';
import { ITEM_BASES } from '../data/items';
import type { MoodId } from '../data/moods';
import { DEFAULT_COMP, makeHeroDef, type HeroComp } from '../data/party';
import { RACES, RACE_LIST, type RaceId } from '../data/races';
import type { MetaProgress } from '../data/unlocks';
import type { Item, ItemSlot, Prop, SkillId, TacticId } from './defs';
import { applyTalent, newHero, reserveHeroUid, type Hero } from './hero';
import { isUnlocked } from './meta';
import { newRun, type RunState } from './run';
import { restRelief } from './stress';
import type { Row } from './unit';

export const PARTY_SIZE = 4;
export const ROSTER_MAX = 12;
export const TAVERN_SIZE = 4;
/** 선술집의 무작위 후보 / 원하는 종족 · 직업을 지정해 부르는 값 */
export const HIRE_COST = 120;
export const ORDER_COST = 260;
const START_GOLD = 250;
/** 원정에 나가지 않은 용병은 쉬면서 스트레스가 준다 */
const BENCH_RELIEF = 20;

export interface Grave {
  name: string;
  title: string;
  xl: number;
  cause: string;
  depth: number;
  expedition: number;
  kills: number;
}

export interface Company {
  gold: number;
  roster: Hero[];
  graves: Grave[];
  /** 지금까지 떠난 원정 수 */
  expeditions: number;
  tavern: Hero[];
  /** 진행 중인 원정 (층 시작 시점) */
  current: { party: number[]; depth: number; seed: number; run: RunState } | null;
}

// ── 저장 형식 ──

interface SavedItem {
  base: string;
  plus: number;
  props: Prop[];
  rarity: Item['rarity'];
  name: string;
}

interface SavedHero {
  uid: number;
  comp: HeroComp;
  xl: number;
  xp: number;
  skills: Record<SkillId, number>;
  talents: string[];
  pending: number;
  perks: Prop[];
  gear: Partial<Record<ItemSlot, SavedItem>>;
  stress: number;
  mood: MoodId | null;
  tactic: TacticId;
  row: Row;
  autoMode: boolean;
  auto: Record<string, boolean>;
  kills: number;
  expeditions: number;
}

interface SavedRun {
  belt: RunState['belt'];
  seen: string[];
  gold: number;
}

interface SaveData {
  v: 1;
  gold: number;
  roster: SavedHero[];
  graves: Grave[];
  expeditions: number;
  tavern: SavedHero[];
  current: { party: number[]; depth: number; seed: number; run: SavedRun } | null;
}

const KEY = 'bh.company.v1';

const saveItem = (it: Item): SavedItem => ({ base: it.base.id, plus: it.plus, props: it.props, rarity: it.rarity, name: it.name });

function loadItem(s: SavedItem): Item | null {
  const base = ITEM_BASES[s.base];
  return base ? { uid: Math.floor(Math.random() * 1e9), base, plus: s.plus, props: s.props, rarity: s.rarity, name: s.name } : null;
}

export function saveHero(h: Hero): SavedHero {
  const gear: SavedHero['gear'] = {};
  for (const [slot, it] of Object.entries(h.gear)) if (it) gear[slot as ItemSlot] = saveItem(it);
  return {
    uid: h.uid, comp: h.comp, xl: h.xl, xp: h.xp, skills: h.skills, talents: h.talents, pending: h.pending,
    perks: h.perks, gear, stress: h.stress, mood: h.mood, tactic: h.tactic, row: h.row, autoMode: h.autoMode,
    auto: Object.fromEntries(h.abilities.filter((a) => !a.hidden).map((a) => [a.def.id, a.auto])),
    kills: h.kills, expeditions: h.expeditions,
  };
}

export function loadHero(s: SavedHero): Hero {
  const h = newHero(makeHeroDef(s.comp));
  h.uid = s.uid;
  reserveHeroUid(s.uid);
  h.xl = s.xl;
  h.xp = s.xp;
  Object.assign(h.skills, s.skills);
  // 특성은 순서대로 다시 적용한다 (기술 습득 · 변형). 능력치는 perks 에 이미 들어 있다
  for (const id of s.talents) {
    h.pending = 1;
    applyTalent(h, id, false);
  }
  h.pending = s.pending;
  h.perks = s.perks;
  for (const [slot, it] of Object.entries(s.gear)) {
    const item = it && loadItem(it);
    if (item) h.gear[slot as ItemSlot] = item;
  }
  h.stress = s.stress;
  h.mood = s.mood;
  h.tactic = s.tactic;
  h.row = s.row;
  h.autoMode = s.autoMode;
  for (const a of h.abilities) if (s.auto[a.def.id] !== undefined) a.auto = s.auto[a.def.id];
  h.kills = s.kills;
  h.expeditions = s.expeditions;
  return h;
}

export function saveCompany(c: Company) {
  const data: SaveData = {
    v: 1, gold: c.gold, graves: c.graves, expeditions: c.expeditions,
    roster: c.roster.map(saveHero), tavern: c.tavern.map(saveHero),
    current: c.current && {
      party: c.current.party, depth: c.current.depth, seed: c.current.seed,
      run: { belt: c.current.run.belt, seen: c.current.run.seen, gold: c.current.run.gold },
    },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장소를 못 쓰면 이번 세션 동안만
  }
}

export function loadCompany(meta: MetaProgress): Company {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as SaveData;
      const c: Company = {
        gold: d.gold, graves: d.graves ?? [], expeditions: d.expeditions ?? 0,
        roster: d.roster.map(loadHero), tavern: (d.tavern ?? []).map(loadHero), current: null,
      };
      if (d.current) {
        const run = newRun();
        Object.assign(run, d.current.run);
        c.current = { party: d.current.party, depth: d.current.depth, seed: d.current.seed, run };
      }
      if (c.roster.length || c.tavern.length) return c;
    }
  } catch {
    // 깨진 저장은 새로 시작
  }
  return newCompany(meta);
}

/** 새 용병단: 기본 네 명과 약간의 골드 */
export function newCompany(meta: MetaProgress): Company {
  const c: Company = {
    gold: START_GOLD, graves: [], expeditions: 0, current: null,
    roster: DEFAULT_COMP.map((comp) => newHero(makeHeroDef(comp))), tavern: [],
  };
  refreshTavern(c, meta, new Rng((Math.random() * 1e9) | 0));
  return c;
}

export function resetCompany() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}

// ── 선술집 ──

export function randomComp(meta: MetaProgress, rng: Rng, race?: RaceId, cls?: ClassId, taken: string[] = []): HeroComp {
  const races = RACE_LIST.filter((r) => isUnlocked(meta, `race:${r.id}`));
  const classes = CLASS_LIST.filter((k) => isUnlocked(meta, `class:${k.id}`));
  const r = race ?? races[rng.int(0, races.length - 1)].id;
  const k = cls ?? classes[rng.int(0, classes.length - 1)].id;
  // 명부 · 선술집에 이미 있는 이름은 피한다 (다 쓰면 번호를 붙인다)
  const free = RACES[r].names.filter((n) => !taken.includes(n));
  const name = free.length ? free[rng.int(0, free.length - 1)] : `${RACES[r].names[0]} ${taken.length + 1}`;
  return { race: r, cls: k, name };
}

export function refreshTavern(c: Company, meta: MetaProgress, rng: Rng) {
  c.tavern = [];
  for (let i = 0; i < TAVERN_SIZE; i++) c.tavern.push(newHero(makeHeroDef(randomComp(meta, rng, undefined, undefined, takenNames(c)))));
}

export function takenNames(c: Company): string[] {
  return [...c.roster, ...c.tavern].map((h) => h.def.name);
}

export function hire(c: Company, h: Hero, cost: number): string | null {
  if (c.roster.length >= ROSTER_MAX) return `명부가 가득 찼다 (최대 ${ROSTER_MAX}명)`;
  if (c.gold < cost) return '골드가 부족하다';
  c.gold -= cost;
  c.roster.push(h);
  c.tavern = c.tavern.filter((t) => t !== h);
  return null;
}

// ── 원정 ──

/** 층을 마칠 때: 쓰러진 용병은 묘지로 (영구 사망). 살아남은 목록을 돌려준다 */
export function buryFallen(c: Company, party: Hero[], alive: Set<Hero>, depth: number): { survivors: Hero[]; fallen: Hero[] } {
  const fallen = party.filter((h) => !alive.has(h));
  for (const h of fallen) {
    c.graves.unshift({
      name: h.def.name, title: h.def.title, xl: h.xl, cause: h.deathCause ?? '쓰러짐',
      depth, expedition: c.expeditions, kills: h.kills,
    });
    c.roster = c.roster.filter((r) => r !== h);
  }
  return { survivors: party.filter((h) => alive.has(h)), fallen };
}

/** 원정이 끝났을 때: 골드 정산, 대기 인원 휴식, 선술집 새 얼굴 */
export function finishExpedition(c: Company, meta: MetaProgress, party: Hero[], run: RunState, keepGold: boolean) {
  if (keepGold) c.gold += run.gold;
  for (const h of party) {
    h.expeditions++;
    h.deathCause = null;
    restRelief(h);
  }
  for (const h of c.roster) {
    if (party.includes(h)) continue;
    h.stress = Math.max(0, h.stress - BENCH_RELIEF);
    h.mood = null;
  }
  c.current = null;
  const rng = new Rng((Math.random() * 1e9) | 0);
  // 다 잃고 고용할 돈도 없으면 떠돌이 용병 하나가 찾아온다 (막히지 않게)
  if (!c.roster.length && c.gold < HIRE_COST) c.roster.push(newHero(makeHeroDef(randomComp(meta, rng, undefined, undefined, takenNames(c)))));
  refreshTavern(c, meta, rng);
  saveCompany(c);
}
