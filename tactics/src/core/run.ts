// 한 판: 무기 고르기 → 맵 → 맵 사이 → … → 보스 (tactics/DESIGN.md 1절)
import { ACT1 } from '../data/maps';
import { CLEAR_HEAL, START_HP } from '../data/rules';
import { STAT_NAME, WEAPONS } from '../data/weapons';
import { heroUnit } from './board';
import { createBattle } from './game';
import type { Battle, HeroInfo, StatId, WeaponId } from './types';

export type RunPhase = 'battle' | 'between' | 'over' | 'victory';

export interface Run {
  hero: HeroInfo;
  mapIdx: number;
  battle: Battle;
  phase: RunPhase;
  /** 맵 사이 화면에 보여줄 결과 */
  summary: string[];
}

/** 모든 능력치 1에서, 고른 무기의 조건을 채운 상태로 시작한다 */
export function newHero(weapon: WeaponId): HeroInfo {
  const stats: Record<StatId, number> = { str: 1, dex: 1, int: 1 };
  for (const [s, need] of Object.entries(WEAPONS[weapon].req) as [StatId, number][]) stats[s] = Math.max(stats[s], need);
  return { level: 1, xp: 0, points: 0, stats, weapon, spare: null, cooldown: {}, hp: START_HP, maxHp: START_HP };
}

export function startRun(weapon: WeaponId): Run {
  const hero = newHero(weapon);
  return { hero, mapIdx: 0, battle: createBattle(ACT1[0]!, hero), phase: 'battle', summary: [] };
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
  }
  run.summary = out;
  return true;
}

export function spendPoint(run: Run, stat: StatId): boolean {
  if (run.hero.points <= 0) return false;
  run.hero.points--;
  run.hero.stats[stat]++;
  run.summary.push(`${STAT_NAME[stat]} +1`);
  return true;
}

export function nextMap(run: Run): void {
  if (run.phase !== 'between') return;
  run.mapIdx++;
  run.battle = createBattle(ACT1[run.mapIdx]!, run.hero);
  run.phase = 'battle';
}
