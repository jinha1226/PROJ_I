// 원정 지도 + 전장 구조 시뮬레이션: 계약 하나를 지도 따라 끝까지 (무작위 길), 방마다 전장 전투.
// 사용: CONTRACT=purge|... LV=1 DIFF=normal npx vite-node scripts/sim-expedition.ts -- 시드 판수
import { Rng } from '../src/core/rng';
import { CONTRACTS, type ContractKind } from '../src/data/contracts';
import type { DifficultyId } from '../src/data/difficulty';
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
    // 다친 파티면 야영 쪽을 고른다
    const hurt = heroes.reduce((s, h) => s + (h.hpFrac ?? 1), 0) / heroes.length < 0.6;
    const id = (hurt ? options.find((o) => ex.nodes[o].kind === 'camp') : undefined) ?? options[rng.int(0, options.length - 1)];
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
    for (const p of w.party) p.autoMode = true;
    for (const h of heroes) for (const a of h.abilities) if (a.manualOnly) a.auto = true;
    while (!w.outcome && w.time < 300) {
      if (w.prompt) resolvePrompt(w, w.prompt.choices[0].id);
      // 물체에 다가가기
      const obj = w.objects.find((o) => !o.used);
      if (obj && !w.inCombat && !w.party.some((p) => p.command)) w.commandMove(w.party.filter((p) => p.alive), obj.x, obj.y, false);
      const live = w.party.filter((p) => p.alive);
      const pot = r.belt.indexOf('heal_potion');
      if (pot >= 0 && live.length && live.reduce((s, p) => s + p.hpFrac, 0) / live.length < 0.35) useConsumable(w, pot, null, 0, 0);
      w.tick(1 / 60);
    }
    if (!w.outcome && process.env.DEBUG) console.log('STUCK', node.kind, 'wave', w.waveIndex, '/', w.waves.length, w.units.filter((u) => u.alive && u.faction === 'enemy').map((u) => `${u.def.id}@${u.x.toFixed(1)},${u.y.toFixed(1)}`), 'objs', w.objects.map((o) => `${o.kind}:${o.used}`), 'prompt', !!w.prompt, 'party', w.party.map((p) => `${p.alive ? '' : 'X'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
    time += w.time;
    for (const p of w.party) { saveFromUnit(p); if (p.hero) p.hero.hpFrac = p.alive ? Math.min(1, Math.max(0.05, p.hp / p.stats.maxHp) + ROOM_HEAL) : 1; }
    heroes = w.party.filter((p) => p.alive && p.hero).map((p) => p.hero!);
    if (w.outcome === 'defeat' || !w.outcome || !heroes.length) return { result: `defeat@${ex.done.length + 1}/${ex.cols}(${node.kind})`, path: path.join(''), time, alive: heroes.length };
    if (process.env.DEBUG) console.log(`  ${node.kind} d${depth} ${Math.round(w.time)}s hp ${heroes.map((h) => `${Math.round((h.hpFrac ?? 1) * 100)}`).join('/')} lv${heroes.map((h) => h.xl).join('/')}`);
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
  console.log(seed + i, r.result, r.path, `${Math.round(r.time)}s`, `생존 ${r.alive}`);
}
console.log(def.kind, DIFF, `LV${LV}`, tally, '평균 생존', (alive / runs).toFixed(1));
