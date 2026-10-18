// 용병단 (다키스트 던전 식): 명부 · 금고 · 묘지 · 선술집, 그리고 저장.
// 원정대는 명부에서 최대 4명. 원정에서 쓰러진 용병은 영구히 묘지로 간다.
// 저장은 층 시작 시점 기준이다 (층 도중에 끄면 그 층 처음부터 다시).
import { Rng } from '../core/rng';
import { CONTRACTS, type Contract, type ContractDef, type ContractKind } from '../data/contracts';
import { CLASS_LIST, type ClassId } from '../data/classes';
import { ITEM_BASES } from '../data/items';
import type { MoodId } from '../data/moods';
import { DEFAULT_COMP, makeHeroDef, type HeroComp } from '../data/party';
import { RACES, RACE_LIST, type RaceId } from '../data/races';
import type { MetaProgress } from '../data/unlocks';
import type { Item, ItemSlot, Prop, SkillId, TacticId } from './defs';
import { applyTalent, gainXp, newHero, reserveHeroUid, xpToNext, type Hero } from './hero';
import { itemValue, upgradeCost } from './items';
import { TALENT_LEVELS, TALENTS } from '../data/talents';
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
  /** 보관함: 원정에서 들고 온 장비 · 벗은 장비 */
  stash: Item[];
  /** 계약 게시판 (원정을 다녀올 때마다 새로 걸린다) */
  board: Contract[];
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
  loot?: SavedItem[];
  contract?: Contract | null;
  rescued?: boolean;
}

interface SaveData {
  v: 1;
  gold: number;
  roster: SavedHero[];
  graves: Grave[];
  expeditions: number;
  tavern: SavedHero[];
  stash?: SavedItem[];
  board?: Contract[];
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
    roster: c.roster.map(saveHero), tavern: c.tavern.map(saveHero), stash: c.stash.map(saveItem), board: c.board,
    current: c.current && {
      party: c.current.party, depth: c.current.depth, seed: c.current.seed,
      run: {
        belt: c.current.run.belt, seen: c.current.run.seen, gold: c.current.run.gold, loot: c.current.run.loot.map(saveItem),
        contract: c.current.run.contract, rescued: c.current.run.rescued,
      },
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
        stash: (d.stash ?? []).map(loadItem).filter((x): x is Item => !!x),
        board: d.board ?? [],
      };
      if (!c.board.length) refreshBoard(c, new Rng((Math.random() * 1e9) | 0));
      if (d.current) {
        const run = newRun();
        const { loot, ...rest } = d.current.run;
        Object.assign(run, rest);
        run.loot = (loot ?? []).map(loadItem).filter((x): x is Item => !!x);
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
    gold: START_GOLD, graves: [], expeditions: 0, current: null, stash: [], board: [],
    roster: DEFAULT_COMP.map((comp) => newHero(makeHeroDef(comp))), tavern: [],
  };
  const rng = new Rng((Math.random() * 1e9) | 0);
  refreshTavern(c, meta, rng);
  refreshBoard(c, rng);
  return c;
}

/** 계약 게시판: 토벌은 늘 걸려 있고, 나머지 둘은 무작위 (조건이 되는 것 중) */
export function refreshBoard(c: Company, rng: Rng) {
  const pool = (Object.values(CONTRACTS) as ContractDef[])
    .filter((d) => d.kind !== 'hunt' && (d.minExpeditions ?? 0) <= c.expeditions)
    .map((d) => d.kind);
  const picks: ContractKind[] = [];
  while (picks.length < 2 && pool.length) picks.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  c.board = [...picks, 'hunt' as const].map((kind) => ({ kind, seed: rng.int(1, 1e9) }));
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
  if (keepGold) {
    c.gold += run.gold;
    c.stash.push(...run.loot);
  }
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
  refreshBoard(c, rng);
  saveCompany(c);
}

// ── 거점 시설 ──
// 결과 문구를 돌려주고, 실패하면 이유를 돌려준다 (ok=false)
export interface Done { ok: boolean; text: string }
const fail = (text: string): Done => ({ ok: false, text });

/** 치료소: 스트레스를 모두 덜고 붕괴 · 각성을 푼다 */
export function treatCost(h: Hero): number {
  return Math.round(h.stress * 1.2) + (h.mood ? 40 : 0);
}
export function treat(c: Company, h: Hero): Done {
  const cost = treatCost(h);
  if (cost <= 0) return fail('치료할 것이 없다');
  if (c.gold < cost) return fail('골드가 부족하다');
  c.gold -= cost;
  h.stress = 0;
  h.mood = null;
  return { ok: true, text: `${h.def.name}이(가) 치료소에서 마음을 추슬렀다 (−${cost} 골드)` };
}

/** 대장간: 판매 · 강화 · 장착 */
export function sell(c: Company, it: Item): Done {
  const i = c.stash.indexOf(it);
  if (i < 0) return fail('보관함에 없다');
  c.stash.splice(i, 1);
  const v = itemValue(it);
  c.gold += v;
  return { ok: true, text: `${it.name}을(를) ${v} 골드에 팔았다` };
}

export function upgrade(c: Company, it: Item): Done {
  const cost = upgradeCost(it);
  if (cost === null) return fail('더 강화할 수 없다');
  if (c.gold < cost) return fail('골드가 부족하다');
  c.gold -= cost;
  it.plus++;
  return { ok: true, text: `${it.name}을(를) +${it.plus}로 강화했다 (−${cost} 골드)` };
}

/** 보관함의 장비를 용병에게 끼운다. 원래 장비는 보관함으로 */
export function equipFromStash(c: Company, it: Item, h: Hero): Done {
  const i = c.stash.indexOf(it);
  if (i < 0) return fail('보관함에 없다');
  c.stash.splice(i, 1);
  const old = h.gear[it.base.slot];
  if (old) c.stash.push(old);
  h.gear[it.base.slot] = it;
  return { ok: true, text: `${h.def.name}에게 ${it.name} 장착${old ? ` (${old.name}은(는) 보관함으로)` : ''}` };
}

export function unequip(c: Company, h: Hero, slot: ItemSlot): Done {
  const it = h.gear[slot];
  if (!it) return fail('장착한 것이 없다');
  delete h.gear[slot];
  c.stash.push(it);
  return { ok: true, text: `${h.def.name}의 ${it.name}을(를) 보관함에 넣었다` };
}

/** 훈련장: 특성 다시 고르기 (고른 특성을 모두 되돌리고 다음 원정의 쉬는 화면에서 다시 고른다) */
export function retrainCost(h: Hero): number {
  return 60 + 25 * h.talents.length;
}
export function retrain(c: Company, h: Hero): Done {
  if (!h.talents.length) return fail('되돌릴 특성이 없다');
  const cost = retrainCost(h);
  if (c.gold < cost) return fail('골드가 부족하다');
  c.gold -= cost;
  const s = saveHero(h);
  // 특성이 준 능력치를 하나씩 빼고 (이벤트로 얻은 능력치는 남긴다), 특성 목록을 비운다
  const perks = s.perks.map((p) => JSON.stringify(p));
  for (const id of s.talents)
    for (const p of (TALENTS[id]?.props ?? [])) {
      const k = perks.indexOf(JSON.stringify(p));
      if (k >= 0) perks.splice(k, 1);
    }
  s.perks = perks.map((p) => JSON.parse(p) as Prop);
  s.pending = TALENT_LEVELS.filter((l) => l <= s.xl).length;
  s.talents = [];
  const fresh = loadHero(s);
  c.roster[c.roster.indexOf(h)] = fresh;
  return { ok: true, text: `${h.def.name}의 특성을 되돌렸다 — 훈련장이나 쉬는 화면에서 다시 고른다 (−${cost} 골드)` };
}

/** 훈련장: 골드로 레벨 올리기. 명부 최고 레벨보다 1 낮은 데까지만 (신입 따라잡기용) */
export function trainCap(c: Company): number {
  return Math.max(3, Math.max(...c.roster.map((h) => h.xl), 1) - 1);
}
export function trainCost(h: Hero): number {
  return 45 * h.xl;
}
export function train(c: Company, h: Hero): Done {
  if (h.xl >= trainCap(c)) return fail(`훈련으로는 Lv${trainCap(c)}까지만 올릴 수 있다`);
  const cost = trainCost(h);
  if (c.gold < cost) return fail('골드가 부족하다');
  c.gold -= cost;
  gainXp(h, xpToNext(h.xl) - h.xp);
  return { ok: true, text: `${h.def.name}이(가) 훈련으로 Lv${h.xl}이 되었다 (−${cost} 골드)${h.pending ? ' · 고를 특성이 생겼다' : ''}` };
}
