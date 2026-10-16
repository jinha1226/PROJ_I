// 봇으로 1막을 무기별로 돌려 본다: 끝까지 도는지, 얼마나 어려운지, 맵마다 몇 턴 걸리는지
// npx tsx tactics/sim/smoke.ts [판 수]
// 봇: 한 수 앞만 본다 — 걷기 · 공격 · 기술 · 기다리기를 전부 해보고(적 행동까지) 점수가 가장 좋은 것
import { enemies, heroUnit } from '../src/core/board';
import { endTurn, heroSteps, stepHero } from '../src/core/game';
import { perform, targets, type ActionKind } from '../src/core/hero';
import { nextMap, settle, spendPoint, startRun } from '../src/core/run';
import type { Battle, StatId, Vec, WeaponId } from '../src/core/types';
import { WEAPONS } from '../src/data/weapons';

/** 턴 상한: 넘기면 그 맵에서 진 것으로 친다 */
const TURN_CAP = 150;
/** 이만큼 적 체력이 그대로면 교착으로 보고 다가가는 쪽에 무게를 크게 준다 (사제와 기둥 사이 춤추기 같은).
 * 한 칸 다가가는 값이 한 대 맞는 값(체력 × 4)보다 커야 맞을 각오로 붙는다 */
const STALL_TURNS = 8;
const NEAR_WEIGHT = 0.2;
const STALL_NEAR_WEIGHT = 15;
let nearWeight = NEAR_WEIGHT;

const score = (b: Battle) => {
  const me = heroUnit(b);
  const foes = enemies(b);
  const near = foes.reduce((s, u) => s + Math.max(Math.abs(u.pos.x - me.pos.x), Math.abs(u.pos.y - me.pos.y)), 0);
  return (b.status === 'dead' ? -1000 : 0) + (b.status === 'cleared' ? 500 : 0) +
    me.hp * 4 - foes.reduce((s, u) => s + u.hp + 8, 0) - near * nearWeight;
};

type Plan = { step?: Vec; kind?: ActionKind; cell?: Vec };

function bestTurn(b: Battle): Plan {
  const plans: Plan[] = [{}];
  for (const p of heroSteps(b)) plans.push({ step: p });
  for (const kind of ['attack', 'skill'] as const) {
    for (const t of targets(b, kind)) plans.push({ kind, cell: t.cell });
  }
  let best = { s: -Infinity, plan: {} as Plan };
  for (const plan of plans) {
    const c = structuredClone(b);
    play(c, plan);
    const s = score(c) + Math.random() * 0.1;
    if (s > best.s) best = { s, plan };
  }
  return best.plan;
}

function play(b: Battle, p: Plan): void {
  if (p.step) stepHero(b, p.step);
  else if (p.kind) {
    perform(b, p.kind, p.cell!);
    endTurn(b);
  } else endTurn(b);
}

const N = Number(process.argv[2] ?? 3);
for (const w of Object.keys(WEAPONS) as WeaponId[]) {
  let wins = 0;
  const reached: number[] = [];
  const turns: string[] = [];
  for (let i = 0; i < N; i++) {
    const run = startRun(w);
    const t: number[] = [];
    let lastFoeHp = -1;
    let still = 0;
    while (run.phase === 'battle') {
      const b = run.battle;
      const foeHp = enemies(b).reduce((s, u) => s + u.hp, 0);
      still = foeHp === lastFoeHp ? still + 1 : 0;
      lastFoeHp = foeHp;
      nearWeight = still >= STALL_TURNS ? STALL_NEAR_WEIGHT : NEAR_WEIGHT;
      if (b.turn > TURN_CAP) b.status = 'dead';
      else play(b, bestTurn(b));
      if (settle(run)) {
        t.push(b.turn);
        while (run.hero.points > 0) spendPoint(run, Object.keys(WEAPONS[w].req)[0] as StatId);
        if ((run.phase as string) === 'between') nextMap(run); // settle이 phase를 바꾼다
      }
    }
    if ((run.phase as string) === 'victory') wins++;
    reached.push(run.mapIdx + 1);
    turns.push(t.join('-'));
  }
  console.log(`${WEAPONS[w].name.padEnd(6)} 승 ${wins}/${N}  도달한 맵 ${reached.join(',')}  맵별 턴 ${turns.join(' | ')}`);
}
