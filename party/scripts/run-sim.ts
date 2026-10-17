// 렌더링 없이 런 전체(5층)를 자동으로 돌려 밸런스와 성장 곡선을 점검한다.
// 자동 탐험 + 자동전투, 보상은 비교 점수가 가장 높은 장비를, 레벨업은 무작위로 고른다.
// 사용: npm run sim -- [seed] [runs] [auto|skilled]
//   auto    : 손을 놓은 플레이어 (수동 전용 기술 안 씀, 피하기·끊기 없음)
//   skilled : 개입하는 플레이어 흉내 (수동 기술을 AI 가 대신 씀 + 예고 공격 피하기 + 방패 강타로 시전 끊기)
import { dist, Rng } from '../src/core/rng';
import type { DifficultyId } from '../src/data/difficulty';
import { areaCenter } from '../src/sim/abilities';
import type { Unit } from '../src/sim/unit';
import { FLOORS } from '../src/data/encounters';
import { SKILL_NAME } from '../src/data/names';
import { genFloor } from '../src/sim/gen';
import { applyPerk, makeOffer, newParty, saveFromUnit, type Hero } from '../src/sim/hero';
import { itemTitle } from '../src/sim/items';
import { resolvePrompt, useConsumable } from '../src/sim/objects';
import { compareItem, rewardChoices } from '../src/sim/reward';
import { newRun, type RunState } from '../src/sim/run';
import { World } from '../src/sim/world';

function rest(heroes: Hero[], run: RunState, rng: Rng, depth: number, log: string[]) {
  // 찾은 장비: 점수가 양수인 영웅에게
  for (const it of run.found) {
    let best: { h: Hero; s: number } | null = null;
    for (const h of heroes) {
      const sc = compareItem(h, it).score;
      if (!best || sc > best.s) best = { h, s: sc };
    }
    if (best && best.s > 0) {
      best.h.gear[it.base.slot] = it;
      log.push(`  찾은 장비 ${itemTitle(it)} → ${best.h.def.name}`);
    }
  }
  run.found.length = 0;
  // 보상: 모든 (장비, 영웅) 조합 중 점수 최고
  let best: { h: Hero; it: ReturnType<typeof rewardChoices>[0]; s: number } | null = null;
  for (const it of rewardChoices(rng, depth, heroes))
    for (const h of heroes) {
      const s = compareItem(h, it).score;
      if (!best || s > best.s) best = { h, it, s };
    }
  if (best && best.s > 0) {
    best.h.gear[best.it.base.slot] = best.it;
    log.push(`  보상 ${itemTitle(best.it)} → ${best.h.def.name}`);
  }
  for (const h of heroes)
    while (h.pending > 0) {
      const offer = makeOffer(h, rng);
      // 대개 집중 스킬(첫 선택지)에 투자한다
      applyPerk(h, rng.chance(0.6) ? offer[0] : offer[rng.int(0, offer.length - 1)]);
    }
}

/** 개입하는 플레이어 흉내: 매 틱 호출 */
// 난이도: DIFF=easy|normal|hard (기본 easy)
const DIFF = (process.env.DIFF ?? 'easy') as DifficultyId;

// 개입 요소를 따로 켜고 끌 수 있다: ASSIST=learn,dodge,interrupt (기본 전부)
const PARTS = (process.env.ASSIST ?? 'learn,dodge,interrupt,items,explore').split(',');

function assist(w: World, dodging: Map<Unit, number>) {
  for (const [p, until] of dodging)
    if (w.time > until) {
      p.holdPos = null;
      dodging.delete(p);
    }
  for (const e of w.units) {
    if (!e.alive || e.faction !== 'enemy' || !e.cast || !w.isVisible(e)) continue;
    const ab = e.abilities[e.cast.slot].def;
    // 예고 범위 공격 피하기
    if (ab.radius && PARTS.includes('dodge')) {
      const c = areaCenter(ab, e, e.cast.x, e.cast.y);
      for (const p of w.party) {
        if (!p.alive || dodging.has(p) || dist(p, c) > ab.radius + p.radius + 0.3) continue;
        const d = dist(p, c) || 1;
        const t = w.map.nearestFloor(c.x + ((p.x - c.x) / d) * (ab.radius + 1.3), c.y + ((p.y - c.y) / d) * (ab.radius + 1.3));
        w.commandMove([p], t.x, t.y);
        dodging.set(p, w.time + 1.6);
      }
    }
    // 마법 시전 끊기
    if (ab.type === 'spell' && PARTS.includes('interrupt')) {
      for (const p of w.party) {
        if (!p.alive || p.command) continue;
        const slot = p.abilities.findIndex((a) => a.def.id === 'shield_bash' && a.cd <= 0);
        if (slot >= 0 && dist(p, e) < 2) w.commandAbility(p, slot, e, e.x, e.y);
      }
    }
  }
}

/** 소모품: 위급할 때 회복 물약 · 공포, 뭉친 적 무리에 화염 폭탄 */
function useItems(w: World) {
  const live = w.party.filter((p) => p.alive);
  if (!PARTS.includes('items') || !w.inCombat || !live.length) return;
  const avg = live.reduce((s, p) => s + p.hpFrac, 0) / live.length;
  const pot = w.run.belt.indexOf('heal_potion');
  if ((avg < 0.4 || live.some((p) => p.hpFrac < 0.2)) && pot >= 0) useConsumable(w, pot, null, 0, 0);
  const fear = w.run.belt.indexOf('fear_scroll');
  if (avg < 0.35 && fear >= 0) useConsumable(w, fear, null, 0, 0);
  const bomb = w.run.belt.indexOf('fire_bomb');
  if (bomb < 0) return;
  for (const e of w.units) {
    if (!e.alive || e.faction !== 'enemy' || !w.isVisible(e)) continue;
    const foes = w.units.filter((u) => u.alive && u.faction === 'enemy' && dist(u, e) < 2);
    if (foes.length >= 3 && live.every((p) => dist(p, e) > 2.6)) {
      useConsumable(w, bomb, null, e.x, e.y);
      return;
    }
  }
}

function run(seed: number, verbose: boolean, skilled: boolean) {
  const heroes = newParty();
  const runState = newRun();
  const rng = new Rng(seed);
  const floorLog: string[] = [];
  const deaths: Record<number, number> = {};
  const minHp: Record<number, number> = {};
  let result = 'victory';
  let time = 0;
  for (let depth = 1; depth <= FLOORS; depth++) {
    const w = new World(genFloor(seed, depth), seed * 31 + depth, heroes, DIFF, runState);
    w.autoExplore = true;
    w.exploreSides = skilled && PARTS.includes('explore');
    if (skilled && PARTS.includes('learn')) for (const h of heroes) for (const a of h.abilities) if (a.manualOnly) a.auto = true;
    const dodging = new Map<Unit, number>();
    let low = 1;
    while (!w.outcome && w.time < 600) {
      if (skilled) {
        assist(w, dodging);
        useItems(w);
      }
      // 이벤트: 개입하는 플레이어는 받아들이고(제단은 체력이 넉넉할 때만), 자동은 지나친다
      if (w.prompt) resolvePrompt(w, skilled ? w.prompt.choices[0].id : 'leave');
      w.tick(1 / 60);
      for (const p of w.party) if (p.alive) low = Math.min(low, p.hpFrac);
    }
    minHp[depth] = Math.round(low * 100);
    time += w.time;
    deaths[depth] = w.party.filter((p) => !p.alive).length;
    if (verbose) for (const l of w.logs) floorLog.push(`[${depth}층 ${l.time.toFixed(1).padStart(5)}] ${l.text}`);
    if (w.outcome === 'defeat' || !w.outcome) {
      result = w.outcome ? `defeat@${depth}` : `timeout@${depth}`;
      break;
    }
    for (const p of w.party) saveFromUnit(p);
    if (w.outcome === 'victory') break;
    rest(heroes, runState, rng, depth, floorLog);
  }
  if (verbose) console.log(floorLog.join('\n'));
  const summary = heroes.map((h) => {
    const top = (Object.entries(h.skills) as [keyof typeof SKILL_NAME, number][])
      .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([k, v]) => `${SKILL_NAME[k]}${v.toFixed(1)}`).join(',');
    const abil = h.abilities.filter((a) => !a.hidden).map((a) => a.def.name + (a.rank ? `+${a.rank}` : '')).join('/');
    return `${h.def.name} Lv${h.xl} [${top}] ${abil}`;
  });
  return { result, time: Math.round(time), deaths, minHp, summary };
}

const seed = Number(process.argv[2] ?? 1);
const runs = Number(process.argv[3] ?? 1);
const skilled = process.argv[4] === 'skilled';
console.log(skilled ? '[개입하는 플레이어 흉내]' : '[자동만]', DIFF);
if (runs === 1) console.log(run(seed, true, skilled));
else {
  const res: Record<string, number> = {};
  const deathByFloor: Record<number, number> = {};
  const lowByFloor: Record<number, number[]> = {};
  for (let i = 0; i < runs; i++) {
    const r = run(seed + i, false, skilled);
    res[r.result] = (res[r.result] ?? 0) + 1;
    for (const [d, n] of Object.entries(r.deaths)) deathByFloor[+d] = (deathByFloor[+d] ?? 0) + n;
    for (const [d, n] of Object.entries(r.minHp)) (lowByFloor[+d] ??= []).push(n);
    console.log(seed + i, r.result, `${r.time}s`, '사망', JSON.stringify(r.deaths), '최저체력%', JSON.stringify(r.minHp));
    if (i === 0) for (const s of r.summary) console.log('   ', s);
  }
  const avg = Object.fromEntries(Object.entries(lowByFloor).map(([d, a]) => [d, Math.round(a.reduce((x, y) => x + y, 0) / a.length)]));
  console.log(res, '층별 사망:', deathByFloor, '층별 평균 최저체력%:', avg);
}
