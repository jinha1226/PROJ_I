// 한 판: 무기 고르기 → 맵 → 맵 사이 → … → 보스 (tactics/DESIGN.md 1절)
import { ACT1 } from '../data/maps';
import { ITEMS, ITEM_SLOTS, START_ITEMS } from '../data/items';
import {
  ENCHANT_ATK, ITEM_WEIGHTS, REWARD_CHOICES, REWARD_WEIGHTS, VIGOR_HP, type Reward,
} from '../data/rewards';
import { CLEAR_HEAL, START_HP, STR_HP } from '../data/rules';
import { STAT_NAME, WEAPONS } from '../data/weapons';
import { heroUnit } from './board';
import { createBattle } from './game';
import { itemName, rollItemNames } from './items';
import { josa } from './josa';
import type { Battle, HeroInfo, ItemId, StatId, WeaponId } from './types';

export type RunPhase = 'battle' | 'between' | 'over' | 'victory';

export interface Run {
  hero: HeroInfo;
  mapIdx: number;
  battle: Battle;
  phase: RunPhase;
  /** 맵 사이 화면에 보여줄 결과 */
  summary: string[];
  /** 맵을 깨고 받은 보상 후보 (고르면 null). 계단으로 일찍 나가면 없다 */
  rewards: Reward[] | null;
}

/** 모든 능력치 1에서, 고른 무기의 조건을 채운 상태로 시작한다 */
export function newHero(weapon: WeaponId): HeroInfo {
  const stats: Record<StatId, number> = { str: 1, dex: 1, int: 1 };
  for (const [s, need] of Object.entries(WEAPONS[weapon].req) as [StatId, number][]) stats[s] = Math.max(stats[s], need);
  const hp = START_HP + (stats.str - 1) * STR_HP; // 힘 무기로 시작하면 체력도 조금 많다
  return { level: 1, xp: 0, points: 0, stats, weapon, spare: null, cooldown: {}, items: [...START_ITEMS], known: [...START_ITEMS], names: rollItemNames(), enchant: {}, hp, maxHp: hp };
}

export function startRun(weapon: WeaponId): Run {
  const hero = newHero(weapon);
  return { hero, mapIdx: 0, battle: createBattle(ACT1[0]!, hero), phase: 'battle', summary: [], rewards: null };
}

/** 전투가 끝났으면 판을 넘긴다. 바뀌었으면 true */
export function settle(run: Run): boolean {
  const b = run.battle;
  if (run.phase !== 'battle' || b.status === 'play') return false;
  const me = heroUnit(b);
  const h = run.hero;
  h.maxHp = me.maxHp;
  h.hp = Math.max(0, me.hp);
  h.cooldown = {};
  if (b.status === 'dead') {
    run.phase = 'over';
    run.summary = [`${b.mapName}에서 죽었다. 레벨 ${h.level}.`];
    return true;
  }
  const out: string[] = [];
  if (b.status === 'cleared') {
    const heal = Math.min(h.maxHp - h.hp, Math.ceil(h.maxHp * CLEAR_HEAL));
    h.hp += heal;
    out.push(`${b.mapName} 정리! 클리어 경험치 +${b.clearXp}, 체력 +${heal}`);
  } else {
    out.push(`${b.mapName}에서 일찍 나왔다. 처치 경험치만 얻었다.`);
  }
  if (run.mapIdx === ACT1.length - 1) {
    run.phase = 'victory';
    out.push('1막을 끝냈다!');
  } else {
    run.phase = 'between';
    run.rewards = b.status === 'cleared' ? rollRewards(h) : null;
  }
  run.summary = out;
  return true;
}

// ── 보상 3택1 (DESIGN.md 5절) ─────────────────────────────

function pick<T extends string>(weights: Record<T, number>, rand: () => number): T {
  const entries = Object.entries(weights) as [T, number][];
  let r = rand() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[entries.length - 1]![0];
}

/** 같은 보상이 두 번 나오지 않게 비교하는 열쇠 */
const rewardKey = (r: Reward) => JSON.stringify(r);

/** 후보 3개. 종류를 가중치로 뽑고 내용을 고른다 (지금 든 무기 · 예비와 같은 무기는 나오지 않는다) */
export function rollRewards(h: HeroInfo, rand: () => number = Math.random): Reward[] {
  const out: Reward[] = [];
  for (let guard = 0; out.length < REWARD_CHOICES && guard < 100; guard++) {
    let r: Reward;
    switch (pick(REWARD_WEIGHTS, rand)) {
      case 'weapon': {
        const pool = (Object.keys(WEAPONS) as WeaponId[]).filter((w) => w !== h.weapon && w !== h.spare);
        r = { kind: 'weapon', weapon: pool[Math.floor(rand() * pool.length)]! };
        break;
      }
      case 'enchant':
        r = { kind: 'enchant' };
        break;
      case 'stat': {
        const stats: StatId[] = ['str', 'dex', 'int'];
        r = { kind: 'stat', stat: stats[Math.floor(rand() * stats.length)]! };
        break;
      }
      case 'vigor':
        r = { kind: 'vigor' };
        break;
      case 'item':
        r = { kind: 'item', item: pick(ITEM_WEIGHTS, rand) };
        break;
    }
    if (!out.some((o) => rewardKey(o) === rewardKey(r))) out.push(r);
  }
  return out;
}

/** 보상 한 줄 설명 (화면 · 기록) */
export function describeReward(h: HeroInfo, r: Reward): { title: string; detail: string } {
  switch (r.kind) {
    case 'weapon':
      return {
        title: `${WEAPONS[r.weapon].name}`,
        detail: `${WEAPONS[r.weapon].desc}. 예비 칸으로${h.spare ? ` (${josa(WEAPONS[h.spare].name, '과/와')} 바꾼다)` : ''}`,
      };
    case 'enchant':
      return { title: `${WEAPONS[h.weapon].name} 강화`, detail: `지금 든 무기 공격 +${ENCHANT_ATK}` };
    case 'stat':
      return { title: `${STAT_NAME[r.stat]} +1`, detail: '능력치 하나 더' };
    case 'vigor':
      return { title: '단련', detail: `최대 체력 +${VIGOR_HP}` };
    case 'item': {
      const full = h.items.length >= ITEM_SLOTS ? ' (가방이 가득 찼다)' : '';
      if (!h.known.includes(r.item)) return { title: itemName(h, r.item), detail: `정체를 모른다. 써 보면 안다${full}` };
      return { title: ITEMS[r.item].name, detail: `${ITEMS[r.item].desc}${full}` };
    }
  }
}

/** 보상을 고른다. 고를 수 없으면 false (가방이 가득 찬 소모품) */
export function chooseReward(run: Run, idx: number): boolean {
  const r = run.rewards?.[idx];
  const h = run.hero;
  if (!r) return false;
  if (r.kind === 'item' && h.items.length >= ITEM_SLOTS) return false;
  switch (r.kind) {
    case 'weapon':
      h.spare = r.weapon;
      break;
    case 'enchant':
      h.enchant[h.weapon] = (h.enchant[h.weapon] ?? 0) + ENCHANT_ATK;
      break;
    case 'stat':
      applyStat(h, r.stat);
      break;
    case 'vigor':
      h.maxHp += VIGOR_HP;
      h.hp += VIGOR_HP;
      break;
    case 'item':
      h.items.push(r.item as ItemId);
      break;
  }
  run.summary.push(`보상: ${describeReward(h, r).title}`);
  run.rewards = null;
  return true;
}

/** 능력치 +1과 무기와 상관없는 효과 (힘 = 최대 체력) */
function applyStat(h: HeroInfo, stat: StatId): void {
  h.stats[stat]++;
  if (stat === 'str') {
    h.maxHp += STR_HP;
    h.hp += STR_HP;
  }
}

export function spendPoint(run: Run, stat: StatId): boolean {
  if (run.hero.points <= 0) return false;
  run.hero.points--;
  applyStat(run.hero, stat);
  run.summary.push(`${STAT_NAME[stat]} +1`);
  return true;
}

/** 다음 맵으로. 보상을 아직 안 골랐으면 못 간다 (건너뛰려면 skipReward) */
/** 보상을 고르지 않고 넘긴다 */
export function skipReward(run: Run): void {
  run.rewards = null;
}

export function nextMap(run: Run): void {
  if (run.phase !== 'between' || run.rewards) return;
  run.mapIdx++;
  run.battle = createBattle(ACT1[run.mapIdx]!, run.hero);
  run.phase = 'battle';
}
