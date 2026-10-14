import {Rng} from '../core/rng';
import {itemDef} from '../items/catalog';
import {addAuto, emptyGrid, makeItem, type Grid} from '../items/inventory';
import {rollContainer} from '../items/loot';
import type {MercLook} from '../render/mercLook';
import {levelOf} from './upgrades';
import type {Profile} from './profile';

export type MercClass = 'tank' | 'melee' | 'ranged' | 'healer';
export type MercStatus = 'ready' | 'expedition' | 'injured' | 'dead';
export type RetreatRule = 'bag80' | 'hp50' | 'finish';
export type ExpeditionOutcome = 'great' | 'success' | 'early' | 'failure';

export interface MercEquipment {
  weapon: string | null;
  armor: string | null;
  trinket: string | null;
  belt0: string | null;
  belt1: string | null;
}

export interface Mercenary {
  id: number;
  name: string;
  cls: MercClass;
  level: number;
  xp: number;
  traits: string[];
  look: MercLook;
  equipment: MercEquipment;
  tactics: number;
  status: MercStatus;
  injuredUntil: number | null;
}

export interface MercCandidate extends Omit<Mercenary, 'status' | 'injuredUntil' | 'equipment' | 'xp'> {
  price: number;
  expiresAt: number;
}

export interface Expedition {
  id: number;
  floor: number;
  mercIds: number[];
  retreat: RetreatRule;
  startedAt: number;
  endsAt: number;
  result: ExpeditionOutcome | null;
  loot: Grid | null;
  message: string;
}

export const CLASS_NAME: Readonly<Record<MercClass, string>> = {tank: '기사', melee: '야만전사', ranged: '사냥꾼', healer: '마법사'};
export const TRAITS = [
  {id: 'ironwall', name: '철벽', good: true, power: 0.12},
  {id: 'quickhands', name: '날쌘 손', good: true, power: 0.1},
  {id: 'veteran', name: '노련함', good: true, power: 0.1},
  {id: 'treasure', name: '보물 사냥꾼', good: true, power: 0.08},
  {id: 'coward', name: '겁쟁이', good: false, power: -0.12},
  {id: 'frail', name: '허약', good: false, power: -0.08},
  {id: 'slow', name: '굼뜸', good: false, power: -0.06},
] as const;
const NAMES = ['아린', '도윤', '미라', '태오', '세린', '라온', '하린', '이안', '유나', '시온', '에다', '로웬'];
const CLASSES: readonly MercClass[] = ['tank', 'melee', 'ranged', 'healer'];
let nextMercId = 1;
let nextExpeditionId = 1;

/** Uses the project's existing KayKit mixed-part look generator. */
export function generateMerc(rng: Rng, level = 1): Mercenary {
  const cls = rng.pick(CLASSES);
  const traits = rng.shuffle([...TRAITS]).slice(0, rng.chance(0.45) ? 2 : 1).map(t => t.id);
  // Imported lazily at module load without coupling the simulation to Three.js.
  const look = makeLook(rng);
  return {id: nextMercId++, name: rng.pick(NAMES), cls, level, xp: 0, traits, look, equipment: {weapon: null, armor: null, trinket: null, belt0: null, belt1: null}, tactics: 0.45 + rng.next() * 0.4, status: 'ready', injuredUntil: null};
}

function makeLook(rng: Rng): MercLook {
  // Kept in its own module so render assets can also be reused by CampView.
  return randomMercLook(rng);
}
import {randomLook as randomMercLook} from '../render/mercLook';

export function makeCandidates(seed: number, now: number, quality = 0): MercCandidate[] {
  const rng = new Rng(seed);
  return Array.from({length: 3 + (quality >= 2 ? 1 : 0)}, () => {
    const merc = generateMerc(rng, rng.int(1, 1 + Math.min(quality, 5)));
    const price = Math.round(55 + merc.level * 35 + merc.traits.length * 18 + (merc.traits.reduce((n, id) => n + (TRAITS.find(t => t.id === id)?.good ? 18 : -8), 0)));
    return {...merc, price: Math.max(45, price), expiresAt: now + (30 / (1 + quality * 0.25)) * 60_000};
  });
}

export const mercSalary = (merc: Mercenary): number => 5 + merc.level * 3;

export function candidatePower(candidate: MercCandidate): number {
  return mercPower({...candidate, xp: 0, equipment: {weapon: null, armor: null, trinket: null, belt0: null, belt1: null}, status: 'ready', injuredUntil: null});
}

export function mercPower(merc: Mercenary): number {
  const equip = Object.values(merc.equipment).reduce((sum, id) => sum + (id ? Math.max(1, Math.sqrt(itemDef(id).value)) : 0), 0);
  const trait = merc.traits.reduce((sum, id) => sum + (TRAITS.find(t => t.id === id)?.power ?? 0), 0);
  const role = merc.cls === 'tank' || merc.cls === 'healer' ? 1.08 : 1;
  return Math.round((32 + merc.level * 18 + equip * 2.5) * (1 + trait) * role);
}

export const teamPower = (mercs: readonly Mercenary[]): number => {
  if (!mercs.length) return 0;
  const raw = mercs.reduce((sum, m) => sum + mercPower(m), 0);
  return Math.round(raw * (1 + (mercs.some(m => m.cls === 'tank') ? 0.08 : 0) + (mercs.some(m => m.cls === 'healer') ? 0.1 : 0) - (new Set(mercs.map(m => m.cls)).size === 1 ? 0.12 : 0)));
};

export function recommendedPower(floor: number): number { return Math.round(160 * Math.pow(1.62, Math.max(0, floor - 1))); }
export function expeditionDurationMs(floor: number): number { return Math.min(10, 2 + (floor - 1) * 0.7) * 60_000; }

export function resolveExpedition(expedition: Expedition, mercs: Mercenary[], now: number, seed: number): {expedition: Expedition; mercs: Mercenary[]} {
  if (expedition.result || now < expedition.endsAt) return {expedition, mercs};
  const rng = new Rng(seed ^ expedition.id ^ expedition.floor);
  const power = teamPower(mercs);
  const ratio = power / recommendedPower(expedition.floor);
  const tactics = mercs.reduce((sum, m) => sum + m.tactics, 0) / Math.max(1, mercs.length);
  const risk = expedition.retreat === 'finish' ? 0.12 : expedition.retreat === 'hp50' ? 0.04 : 0;
  const failure = Math.max(0.02, Math.min(0.7, 0.28 - Math.max(0, ratio - 0.6) * 0.42 - tactics * 0.12 + risk));
  const early = Math.max(0.04, Math.min(0.5, 0.35 - Math.max(0, ratio - 0.7) * 0.18 + risk * 0.4));
  const great = Math.max(0.02, Math.min(0.35, (ratio - 0.9) * 0.24 + tactics * 0.04));
  const roll = rng.next();
  const result: ExpeditionOutcome = roll < failure ? 'failure' : roll < failure + early ? 'early' : roll > 1 - great ? 'great' : 'success';
  const visits = Math.max(2, Math.round((2 + expedition.floor + mercs.length) * (result === 'great' ? 1.4 : result === 'failure' ? 0.55 : 1)));
  let loot = emptyGrid(12, 8);
  for (let i = 0; i < visits; i++) {
    const type = rng.weighted([['barrel', 4], ['crate', 4], ['chest', 2 + expedition.floor], ['trunk', 1 + Math.min(3, expedition.floor)]] as const);
    const found = rollContainer(type, rng, {lootSpeed: 1, lootQuantity: 1, rareFind: 1 + (expedition.floor - 1) * 0.15, oilCapacity: 1, oilDrain: 1, damageMul: 1, critBonus: 0, maxHpBonus: 0, staminaBonus: 0, healMul: 1, autoReturn: 0, autoExplore: 0, autoBattle: 0});
    for (const p of found.items) loot = addAuto(loot, p.item).grid;
  }
  if (result === 'early') loot = {...loot, items: loot.items.slice(0, Math.ceil(loot.items.length / 2))};
  if (result === 'failure') loot = emptyGrid(12, 8);
  const injuryChance = Math.max(0.03, failure + (result === 'failure' ? 0.45 : 0) - tactics * 0.12);
  const nextMercs = mercs.map(m => {
    const injured = rng.chance(injuryChance);
    return {...m, xp: m.xp + (result === 'failure' ? 18 : 35 + expedition.floor * 10), status: injured ? 'injured' as const : 'ready' as const, injuredUntil: injured ? now + 4 * 60 * 60_000 : null};
  });
  const text: Record<ExpeditionOutcome, string> = {great: '대성공! 전리품을 넉넉히 챙겨 귀환했습니다.', success: '원정을 마치고 무사히 귀환했습니다.', early: '위험을 감지해 조기 철수했습니다. 전리품 일부만 가져왔습니다.', failure: '원정에 실패했습니다. 전리품 없이 부상자가 발생했습니다.'};
  return {expedition: {...expedition, result, loot, message: text[result]}, mercs: nextMercs};
}

export function collectExpeditionLoot(expedition: Expedition, stash: Grid): {stash: Grid; loot: Grid} {
  let next = stash;
  const remaining: Grid['items'][number][] = [];
  for (const p of expedition.loot?.items ?? []) {
    const added = addAuto(next, p.item);
    next = added.grid;
    if (added.leftover) remaining.push({...p, item: added.leftover});
  }
  return {stash: next, loot: {...(expedition.loot ?? emptyGrid(12, 8)), items: remaining}};
}

export const freshExpedition = (floor: number, mercIds: number[], retreat: RetreatRule, now: number): Expedition => ({id: nextExpeditionId++, floor, mercIds, retreat, startedAt: now, endsAt: now + expeditionDurationMs(floor), result: null, loot: null, message: ''});

export function reserveGuildIds(mercs: readonly Mercenary[], expeditions: readonly Expedition[], candidates: readonly MercCandidate[] = []): void {
  nextMercId = Math.max(nextMercId, ...mercs.map(m => m.id + 1), ...candidates.map(m => m.id + 1), 1);
  nextExpeditionId = Math.max(nextExpeditionId, ...expeditions.map(e => e.id + 1), 1);
}

export function rosterLimit(profile: Pick<Profile, 'upgrades'>): number { return 4 + levelOf(profile.upgrades, 'barracks.roster'); }

export function refreshCandidates(profile: Profile, now: number, force = false): Profile | null {
  const level = levelOf(profile.upgrades, 'market.recruit');
  const count = 3 + (level >= 2 ? 1 : 0);
  const nextAt = Math.min(...profile.candidates.map(c => c.expiresAt), Infinity);
  if (!force && profile.candidates.length > 0 && now < nextAt) return profile;
  if (force && profile.gold < 35) return null;
  const nextSeed = (profile.guildSeed * 1664525 + 1013904223) >>> 0;
  return {...profile, gold: profile.gold - (force ? 35 : 0), guildSeed: nextSeed, candidates: makeCandidates(nextSeed, now, level).slice(0, count)};
}

export function hireCandidate(profile: Profile, id: number): Profile | null {
  const candidate = profile.candidates.find(c => c.id === id);
  if (!candidate || profile.mercenaries.length >= rosterLimit(profile) || profile.gold < candidate.price) return null;
  const {price: _price, expiresAt: _expires, ...merc} = candidate;
  return {...profile, gold: profile.gold - candidate.price, mercenaries: [...profile.mercenaries, {...merc, xp: 0, equipment: {weapon: null, armor: null, trinket: null, belt0: null, belt1: null}, status: 'ready', injuredUntil: null}], candidates: profile.candidates.filter(c => c.id !== id)};
}

export function dismissMercenary(profile: Profile, id: number): Profile | null {
  const merc = profile.mercenaries.find(m => m.id === id);
  if (!merc || merc.status === 'expedition' || merc.status === 'dead' || profile.mercenaries.length <= 1) return null;
  let stash = profile.stash;
  for (const defId of Object.values(merc.equipment)) {
    if (!defId) continue;
    const added = addAuto(stash, makeItem(defId));
    if (added.leftover) return null;
    stash = added.grid;
  }
  return {...profile, stash, mercenaries: profile.mercenaries.filter(m => m.id !== id)};
}

export function startExpedition(profile: Profile, floor: number, mercIds: number[], retreat: RetreatRule, now: number): Profile | null {
  if (!mercIds.length || mercIds.length > 4 || profile.expeditions.some(e => !e.result)) return null;
  const team = mercIds.map(id => profile.mercenaries.find(m => m.id === id));
  if (team.some(m => !m || m.status !== 'ready') || new Set(mercIds).size !== mercIds.length) return null;
  const selected = team as Mercenary[];
  const salary = selected.reduce((sum, m) => sum + mercSalary(m), 0);
  if (profile.gold < salary || floor > profile.frontierFloor) return null;
  const expedition = freshExpedition(floor, mercIds, retreat, now);
  return {...profile, gold: profile.gold - salary, expeditions: [...profile.expeditions, expedition], mercenaries: profile.mercenaries.map(m => mercIds.includes(m.id) ? {...m, status: 'expedition'} : m)};
}

export function estimateExpedition(mercs: Mercenary[], floor: number, retreat: RetreatRule): {power: number; recommended: number; risk: string; success: number; early: number; failure: number; great: number} {
  const power = teamPower(mercs);
  const recommended = recommendedPower(floor);
  const ratio = power / recommended;
  const tactics = mercs.reduce((sum, m) => sum + m.tactics, 0) / Math.max(1, mercs.length);
  const riskMod = retreat === 'finish' ? 0.12 : retreat === 'hp50' ? 0.04 : 0;
  const failure = Math.max(0.02, Math.min(0.7, 0.28 - Math.max(0, ratio - 0.6) * 0.42 - tactics * 0.12 + riskMod));
  const early = Math.max(0.04, Math.min(0.5, 0.35 - Math.max(0, ratio - 0.7) * 0.18 + riskMod * 0.4));
  const great = Math.max(0.02, Math.min(0.35, (ratio - 0.9) * 0.24 + tactics * 0.04));
  const success = Math.max(0, 1 - failure - early - great);
  return {power, recommended, risk: ratio < 0.6 ? '위험' : ratio < 0.9 ? '어려움' : ratio < 1.2 ? '적정' : '여유', success, early, failure, great};
}

/** Resolves finished teams and timed injuries. Called at load and while camp is open. */
export function advanceGuild(profile: Profile, now: number): {profile: Profile; changed: boolean} {
  let mercenaries = profile.mercenaries.map(m => m.status === 'injured' && m.injuredUntil !== null && m.injuredUntil <= now ? {...m, status: 'ready' as const, injuredUntil: null} : m);
  let expeditions = [...profile.expeditions];
  let changed = mercenaries.some((m, i) => m !== profile.mercenaries[i]);
  for (let i = 0; i < expeditions.length; i++) {
    const exp = expeditions[i];
    if (exp.result || now < exp.endsAt) continue;
    const team = mercenaries.filter(m => exp.mercIds.includes(m.id));
    const resolved = resolveExpedition(exp, team, exp.endsAt, profile.guildSeed);
    expeditions[i] = resolved.expedition;
    const byId = new Map(resolved.mercs.map(m => [m.id, m]));
    mercenaries = mercenaries.map(m => byId.get(m.id) ?? m);
    changed = true;
  }
  return changed ? {profile: {...profile, mercenaries, expeditions}, changed} : {profile, changed: false};
}

export function collectLoot(profile: Profile, expeditionId: number): Profile | null {
  const exp = profile.expeditions.find(e => e.id === expeditionId);
  if (!exp?.result || !exp.loot?.items.length) return null;
  const collected = collectExpeditionLoot(exp, profile.stash);
  const before = exp.loot.items.reduce((sum, p) => sum + p.item.qty, 0);
  const after = collected.loot.items.reduce((sum, p) => sum + p.item.qty, 0);
  if (before === after) return null;
  return {...profile, stash: collected.stash, expeditions: profile.expeditions.map(e => e.id === exp.id ? {...e, loot: collected.loot} : e)};
}

/** Moves an owned stash item into one mercenary slot, returning replaced gear. */
export function equipMercenary(profile: Profile, mercId: number, uid: number): Profile | null {
  const merc = profile.mercenaries.find(m => m.id === mercId);
  const placed = profile.stash.items.find(p => p.item.uid === uid);
  if (!merc || merc.status !== 'ready' || !placed) return null;
  const def = itemDef(placed.item.defId);
  const slot: keyof MercEquipment | null = def.weapon ? 'weapon' : def.armor ? 'armor' : def.category === 'relic' ? 'trinket' : def.consumable ? (!merc.equipment.belt0 ? 'belt0' : 'belt1') : null;
  if (!slot) return null;
  let stash: Grid = placed.item.qty > 1
    ? {...profile.stash, items: profile.stash.items.map(p => p.item.uid === uid ? {...p, item: {...p.item, qty: p.item.qty - 1}} : p)}
    : {...profile.stash, items: profile.stash.items.filter(p => p.item.uid !== uid)};
  const previous = merc.equipment[slot];
  if (previous) {
    const returned = addAuto(stash, makeItem(previous));
    if (returned.leftover) return null;
    stash = returned.grid;
  }
  return {...profile, stash, mercenaries: profile.mercenaries.map(m => m.id === mercId ? {...m, equipment: {...m.equipment, [slot]: placed.item.defId}} : m)};
}
