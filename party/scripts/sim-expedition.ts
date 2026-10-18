// 원정 지도 + 전장 구조 시뮬레이션: 계약 하나를 지도 따라 끝까지, 방마다 전장 전투.
// 사용: CONTRACT=purge|... LV=1 DIFF=normal MODE=auto|skilled npx vite-node scripts/sim-expedition.ts -- 시드 판수
//   auto    : 손을 놓은 플레이어 (주장도 자동, 길은 아무렇게나, 물약 안 씀)
//   skilled : 잘하는 주장 (주장으로 할 수 있는 것만: 집중 공격 지정, 시전 끊기, 구르기로 피하기,
//             물약, 다쳤을 때 야영 쪽 길 · 정예 피하기)
import { dist, Rng } from '../src/core/rng';
import { CONTRACTS, type ContractKind } from '../src/data/contracts';
import type { DifficultyId } from '../src/data/difficulty';
import { areaCenter } from '../src/sim/abilities';
import { genArena } from '../src/sim/arena';
import { ROOM_HEAL, genExpedition, nodeDepth, reachable } from '../src/sim/expedition';
import { applyTalent, gainXp, newParty, nextTier, saveFromUnit, tierOptions, xpToNext } from '../src/sim/hero';
import { resolvePrompt, useConsumable } from '../src/sim/objects';
import { newRun } from '../src/sim/run';
import { restRelief } from '../src/sim/stress';
import { World } from '../src/sim/world';

const DIFF = (process.env.DIFF ?? 'normal') as DifficultyId;
const def = CONTRACTS[(process.env.CONTRACT ?? 'hunt') as ContractKind];
const LV = Number(process.env.LV ?? 1);
if (process.env.POWER) def.power = Number(process.env.POWER);
const SKILLED = (process.env.MODE ?? 'auto') === 'skilled';
const PARTS = (process.env.ASSIST ?? 'focus,dodge,interrupt,kite,items,route').split(',');

/** 잘하는 주장: 매 틱 */
function captainPlay(w: World, rng: Rng) {
  const c = w.captain;
  if (!c?.alive) return;
  const foes = w.units.filter((e) => e.alive && e.faction === 'enemy');
  // 공대장 콜: 치유사(보스 쫄 주술사 · 광신도)가 있으면 그쪽을 집중 공격
  if (PARTS.includes('focus') && (!w.focusTarget || !w.focusTarget.alive)) {
    const healer = foes.find((e) => e.def.role === 'support');
    if (healer) w.setFocus(healer);
  }
  // 예고 범위 안이면 구른다
  for (const e of foes) {
    if (!e.cast) continue;
    const ab = e.abilities[e.cast.slot].def;
    if (ab.radius && ab.affects !== 'allies') {
      const ctr = areaCenter(ab, e, e.cast.x, e.cast.y);
      const d = dist(c, ctr);
      if (d <= ab.radius + c.radius + 0.2 && c.dashCd <= 0 && e.cast.total - e.cast.time < 0.6) {
        const k = d || 1;
        w.capDir = { x: d ? (c.x - ctr.x) / k : 1, y: d ? (c.y - ctr.y) / k : 0 };
        if (PARTS.includes('dodge')) w.captainDash(true);
        w.capDir = null;
      }
    }
    // 시전 끊기: 기절 기술
    if (PARTS.includes('interrupt') && ab.type === 'spell' && !c.cast) {
      const slot = c.abilities.findIndex((a) => a.cd <= 0 && c.mp >= a.def.cost && a.def.target === 'enemy' &&
        a.def.effects.some((x) => x.kind === 'status' && x.status === 'stun') && dist(c, e) <= a.def.range + c.radius + e.radius + (a.def.dash ? 0 : 0.5));
      if (slot >= 0) w.commandAbility(c, slot, e, e.x, e.y);
    }
  }
  // 원거리 주장: 근접 적이 붙으면 구르기로 거리 벌리기
  if (PARTS.includes('kite') && c.isRanged && c.dashCd <= 0 && foes.some((e) => !e.isRanged && dist(c, e) < 1.3)) w.captainDash();
  void rng;
}

function useItems(w: World) {
  const live = w.party.filter((p) => p.alive);
  if (!w.inCombat || !live.length) return;
  const avg = live.reduce((s, p) => s + p.hpFrac, 0) / live.length;
  const pot = w.run.belt.indexOf('heal_potion');
  if ((avg < 0.4 || live.some((p) => p.hpFrac < 0.2)) && pot >= 0) useConsumable(w, pot, null, 0, 0);
}

function run(seed: number) {
  const rng = new Rng(seed);
  let heroes = newParty();
  for (const h of heroes) while (h.xl < LV) gainXp(h, xpToNext(h.xl) - h.xp);
  const pick = () => {
    for (const h of heroes)
      while (h.pending > 0) {
        const o = tierOptions(h, nextTier(h));
        applyTalent(h, o[rng.int(0, o.length - 1)].id);
      }
  };
  pick();
  const r = newRun();
  r.contract = { kind: def.kind, seed };
  const ex = genExpedition(rng, def);
  r.expedition = ex;
  const path: string[] = [];
  let time = 0;
  for (;;) {
    const options = reachable(ex);
    if (!options.length) break;
    let id = options[rng.int(0, options.length - 1)];
    if (SKILLED && PARTS.includes('route')) {
      // 다쳤으면 야영 쪽, 정예는 건강할 때만
      const hp = heroes.reduce((s, h) => s + (h.hpFrac ?? 1), 0) / heroes.length;
      const score = (o: number) => {
        const k = ex.nodes[o].kind;
        return (k === 'camp' ? (hp < 0.7 ? 3 : 0) : 0) + (k === 'elite' && hp < 0.6 ? -2 : 0) + rng.next();
      };
      id = [...options].sort((a, b) => score(b) - score(a))[0];
    }
    const node = ex.nodes[id];
    ex.at = id;
    path.push(node.kind[0]);
    const depth = nodeDepth(def, ex, node);
    if (node.kind === 'camp') {
      for (const h of heroes) { h.hpFrac = 1; restRelief(h); }
      ex.done.push(id);
      pick();
      continue;
    }
    const map = genArena(seed * 31 + id, depth, { kind: node.kind, theme: def.theme, bossId: def.bossId, captive: def.kind === 'rescue' && node.kind === 'goal' });
    const w = new World(map, seed + id, heroes, DIFF, r);
    // 주장도 AI (skilled 는 그 위에 주장 조작을 얹는다)
    for (const p of w.party) p.autoMode = true;
    while (!w.outcome && w.time < 300) {
      if (w.prompt) resolvePrompt(w, w.prompt.choices[0].id);
      const obj = w.objects.find((o) => !o.used);
      if (obj && !w.inCombat && !w.party.some((p) => p.command)) w.commandMove(w.party.filter((p) => p.alive), obj.x, obj.y, false);
      if (SKILLED) {
        captainPlay(w, rng);
        if (PARTS.includes('items')) useItems(w);
      }
      w.tick(1 / 60);
    }
    time += w.time;
    for (const p of w.party) { saveFromUnit(p); if (p.hero) p.hero.hpFrac = p.alive ? Math.min(1, Math.max(0.05, p.hp / p.stats.maxHp) + ROOM_HEAL) : 1; }
    const lost = w.party.filter((p) => !p.alive).length;
    heroes = w.party.filter((p) => p.alive && p.hero).map((p) => p.hero!);
    if (process.env.DEBUG) console.log(`  ${node.kind} d${depth} ${Math.round(w.time)}s hp ${heroes.map((h) => `${Math.round((h.hpFrac ?? 1) * 100)}`).join('/')} lost ${lost}`);
    if (w.outcome === 'defeat' || !w.outcome || !heroes.length) return { result: `defeat@${ex.done.length + 1}/${ex.cols}(${node.kind})`, path: path.join(''), time, alive: heroes.length };
    ex.done.push(id);
    pick();
    if (w.outcome === 'victory' || node.kind === 'goal') break;
  }
  return { result: 'win', path: path.join(''), time, alive: heroes.length };
}

const seed = Number(process.argv[2] ?? 1), runs = Number(process.argv[3] ?? 6);
const tally: Record<string, number> = {};
let alive = 0;
for (let i = 0; i < runs; i++) {
  const r = run(seed + i);
  const k = r.result.startsWith('win') ? 'win' : 'defeat';
  tally[k] = (tally[k] ?? 0) + 1;
  alive += r.alive;
  if (!process.env.QUIET) console.log(seed + i, r.result, r.path, `${Math.round(r.time)}s`, `생존 ${r.alive}`);
}
console.log(def.kind, DIFF, `LV${LV}`, SKILLED ? 'skilled' : 'auto', tally, '평균 생존', (alive / runs).toFixed(1));
