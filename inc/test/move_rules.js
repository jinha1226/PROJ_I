'use strict';
// 이동 규칙: node test/move_rules.js  (벽을 뚫지 않는다 · 벽에 끼지 않는다 · 보이는 자리도 벽을 돌아간다)
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
const FILES = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
let ok = 0, bad = 0;
const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };

function boot(seed) {
  const M = Object.create(Math); let s0 = seed * 7919 >>> 0;
  M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let v = s0; v = Math.imul(v ^ (v >>> 15), v | 1); v ^= v + Math.imul(v ^ (v >>> 7), v | 61); return ((v ^ (v >>> 14)) >>> 0) / 4294967296; };
  const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx);
  for (const n of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
  return ctx.G;
}
const G = boot(1), GR = G.Grid;
const map = rows => GR.fromAscii(rows, '.>');
const run = (m, e, tx, ty, n = 200, v = 4, stop = 0.05) => { let done = false; for (let i = 0; i < n && !done; i++) done = GR.moveTo(m, e, tx, ty, v, 0.1, stop); return done; };
const inWall = (m, e) => !GR.pass(m, Math.round(e.x), Math.round(e.y));

// ── 칸 단위 규칙 ──
{
  const m = map(['#######', '#..#..#', '#..#..#', '#..#..#', '#######']), e = { x: 1, y: 2 };
  const done = run(m, e, 5, 2);
  t('길이 없으면 벽을 뚫지 않는다', !done && e.x < 3, JSON.stringify(e));
  t('길이 없으면 제자리', e.x === 1 && e.y === 2, JSON.stringify(e));
}
{
  const m = map(['#####', '#...#', '#.#.#', '#.#.#', '#####']), e = { x: 1, y: 3 };
  let hit = false; for (let i = 0; i < 200 && !GR.moveTo(m, e, 3, 3, 4, 0.1); i++) if (inWall(m, e)) hit = true;
  t('벽을 돌아서 도착한다', Math.hypot(e.x - 3, e.y - 3) < 0.1, JSON.stringify(e));
  t('돌아가는 동안 벽에 들어가지 않는다', !hit);
}
{
  // 1.5칸 안쪽이어도 모서리는 잘라 가지 못한다
  const m = map(['#####', '#..##', '##..#', '#####']), e = { x: 2, y: 1 };
  GR.moveTo(m, e, 3, 2, 40, 0.1);
  t('대각선 모서리를 넘지 않는다', Math.abs(e.x - 3) + Math.abs(e.y - 2) > 0.01 || GR.pass(m, 3, 1) || GR.pass(m, 2, 2), JSON.stringify(e));
  const a = { x: 1, y: 1 }, b = map(['#####', '#.#.#', '##..#', '#####']);
  run(b, a, 3, 1, 30);
  t('막힌 대각선 옆방으로 못 간다', a.x === 1 && a.y === 1, JSON.stringify(a));
}
{
  const m = map(['#####', '#...#', '#####']), e = { x: 1, y: 1 };
  const done = run(m, e, 2, 0, 60, 4, 0.3);
  t('목표가 벽 칸이면 앞에서 멈춘다', !inWall(m, e), JSON.stringify(e));
  t('벽 칸 목표도 도착으로 친다', done, JSON.stringify(e));
}
{
  const m = map(['#####', '#...#', '#####']), e = { x: 2, y: 0 };
  run(m, e, 3, 1, 60);
  t('벽 안에 있으면 빠져나온다', !inWall(m, e), JSON.stringify(e));
}
{
  const m = map(['#########', '#.......#', '#########']), e = { x: 1, y: 1 };
  let n = 0; while (!GR.moveTo(m, e, 7, 1, 4, 0.1) && n < 100) n++;
  t('뚫린 길의 속도는 그대로', n >= 14 && n <= 16, n);
}
// ── 밀어내기 ──
{
  const m = map(['#####', '#..##', '##..#', '#####']), a = { x: 2.45, y: 1.45, kind: 'ally' }, b = { x: 2.55, y: 1.55, kind: 'ally' };
  for (let i = 0; i < 200; i++) G.Fantasy.spread(m, [a, b], 0.75);
  t('밀어내도 벽에 들어가지 않는다', !inWall(m, a) && !inWall(m, b), JSON.stringify([a, b]));
}
// ── 칸 맞추기: 벽 건너편으로 옮기지 않는다 ──
{
  const m = map(['#######', '#.#...#', '#######']), a = { x: 1, y: 1, kind: 'ally', hp: 1 }, b = { x: 1, y: 1, kind: 'ally', hp: 1 };
  const rt = { map: m, party: [a, b], mons: [] };
  G.Tactics.snap(rt);
  t('자리가 없으면 벽 건너로 보내지 않는다', a.x === 1 && b.x === 1, JSON.stringify([a.x, b.x]));
}
{
  const m = map(['#######', '#...#.#', '#######']), a = { x: 3, y: 1, kind: 'ally', hp: 1 }, b = { x: 3, y: 1, kind: 'ally', hp: 1 };
  G.Tactics.snap({ map: m, party: [a, b], mons: [] });
  t('겹치면 같은 쪽 빈 칸으로', b.x === 2, b.x);
}
{
  const m = map(['#####', '#...#', '#####']), a = { x: 2, y: 0, kind: 'ally', hp: 1 };
  G.Tactics.snap({ map: m, party: [a], mons: [] });
  t('벽 안에서는 가장 가까운 바닥으로', GR.pass(m, a.x, a.y), JSON.stringify(a));
}

// ── 아군은 지나가고, 적은 막는다 (SRD: 아군 칸은 통과할 수 있고 어려운 지형도 아니며, 다른 생물의 칸에서 멈출 수 없다) ──
{
  const hall = map(['#########', '#.......#', '#########']), who = (kind, x) => ({ kind, x, y: 1, hp: 1 });
  const P = (rt, e, tg, budget, reach = 1) => G.Tactics.plan(rt, e, tg, budget, (x, y) => Math.hypot(x - tg.x, y - tg.y) <= reach).map(c => c.x);
  { const e = who('ally', 1), a = who('ally', 2), foe = who('mon', 6); t('좁은 복도에서 아군을 지나 적 앞까지', P({ map: hall, party: [e, a], mons: [foe] }, e, foe, 6).join() === '2,3,4,5', P({ map: hall, party: [e, a], mons: [foe] }, e, foe, 6).join()); }
  { const e = who('ally', 1), a = who('ally', 3), foe = who('mon', 7); const p = P({ map: hall, party: [e, a], mons: [foe] }, e, foe, 2); t('이동력이 아군 칸에서 끝나면 그 앞에 선다', p.join() === '2', p.join()); }
  { const e = who('ally', 1), f1 = who('mon', 3), f2 = who('mon', 6); const p = P({ map: hall, party: [e], mons: [f1, f2] }, e, f2, 6); t('적은 지나가지 못한다', Math.max(0, ...p) < 3, p.join()); }
  { const e = who('mon', 7), o = who('mon', 6), h = who('hero', 2); const p = P({ map: hall, party: [h], mons: [e, o] }, e, h, 6); t('몬스터도 자기편은 지나간다', p[p.length - 1] === 3, p.join()); }
  { const e = who('mon', 7), a = who('ally', 5), h = who('hero', 2); const p = P({ map: hall, party: [h, a], mons: [e] }, e, h, 6); t('몬스터는 파티를 지나가지 못한다', Math.min(7, ...p) > 5, p.join()); }
  { const e = who('ally', 2.4), a = who('ally', 2); e.x = 2.2; G.Tactics.snap({ map: hall, party: [e, a], mons: [] }, e); t('지나가는 사람이 아군을 밀어내지 않는다', a.x === 2, a.x); }
  { const e = who('ally', 1), a = who('ally', 2), foe = who('mon', 6), path = [{ x: 2, y: 1 }, { x: 3, y: 1 }]; G.Tactics.blocked({ map: hall, party: [e, a], mons: [foe] }, e, path); t('다음 칸이 아군이면 멈추지 않는다', path.length === 2, path.length); }
  { const e = who('ally', 1), foe = who('mon', 2), path = [{ x: 2, y: 1 }, { x: 3, y: 1 }]; G.Tactics.blocked({ map: hall, party: [e], mons: [foe] }, e, path); t('다음 칸이 적이면 멈춘다', path.length === 0, path.length); }
  { const e = who('ally', 1), a = who('ally', 3), path = [{ x: 2, y: 1 }, { x: 3, y: 1 }]; G.Tactics.blocked({ map: hall, party: [e, a], mons: [] }, e, path); t('도착 칸에 누가 들어오면 그 앞까지만', path.map(c => c.x).join() === '2', path.map(c => c.x).join()); }
  { const e = who('ally', 1), a = who('ally', 2), foe = who('mon', 5); const ov = G.Tactics.overlay({ map: hall, party: [e, a], mons: [foe] }, e, 6, 1, []), at = x => ov.move.has(1 * hall.w + x); t('표시: 아군 칸은 못 멈추고 그 너머는 간다', !at(2) && at(3) && at(4), [at(2), at(3), at(4)]); t('표시: 적 칸과 그 너머는 못 간다', !at(5) && !at(6), [at(5), at(6)]); }
}

// ── 실제 게임을 돌려 재는 불변식 ──
const blocked = (g, m, x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 6) + 1; for (let i = 1; i <= n; i++) { const u = i / n; if (!g.Grid.pass(m, Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u))) return true; } return false; };
const actors = fs.readFileSync(path.join(ROOT, 'js', 'iso', 'actors.js'), 'utf8');
function sweep(seed, crew, MIN) {
  const g = boot(seed), F = g.Fantasy, GD = g.Guild;
  g.quiet = true; g.newState();
  const f = g.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; L.lv = 6; f.askMeet = false; f.autoTr = f.autoParty = false;
  const ms = crew.map(c => GD.make(f, c, { lv: 6 })); f.mercs.push(...ms); f.lineup = ms.map(a => a.uid); F.syncAllies(f);
  f.floor = f.maxFloor = 5; f.checkpoint = f.start = 5; f.town = true; f.townT = 99; g.Exp.depart(f, F.rt(f));
  const settle = new Function('isFloor', 'G', actors.slice(actors.indexOf('const MIN_D'), actors.indexOf('const dispAt')) + ';return settle;')((m, x, y) => g.Grid.pass(m, x, y), g);
  const R = { wall: 0, cross: 0, dwall: 0, dcross: 0, lag: 0, frames: 0, flip: 0, ex: null };
  const last = new Map(), dlast = new Map(), dir = new Map();
  for (let n = 0; n < MIN * 600; n++) {
    g.tick(0.1, 0.1);
    const rt = F.rt(f); if (!rt || !rt.map || f.town) continue;
    if (rt.ask) { rt.ask.done && rt.ask.done(rt.ask.def || 0); rt.ask = null; }
    const m = rt.map, es = rt.party.filter(p => !p.dead).concat(rt.mons.filter(o => o.hp > 0)); R.frames++;
    for (const e of es) {
      if (!g.Grid.pass(m, Math.round(e.x), Math.round(e.y))) { R.wall++; R.ex = R.ex || ['wall', rt.flow && rt.flow.st, e.kind, e.x, e.y]; }
      const l = last.get(e);
      if (l && l.m === m) { const d = Math.hypot(e.x - l.x, e.y - l.y); if (d > 0 && d <= 1.5 && blocked(g, m, l.x, l.y, e.x, e.y) && (blocked(g, m, l.x, l.y, e.x, l.y) || blocked(g, m, e.x, l.y, e.x, e.y)) && (blocked(g, m, l.x, l.y, l.x, e.y) || blocked(g, m, l.x, e.y, e.x, e.y))) { /* 한 프레임에 직각 두 걸음이면 통과 */ R.cross++; R.ex = R.ex || ['cross', rt.flow && rt.flow.st, e.kind, l.x, l.y, e.x, e.y]; } }
      last.set(e, { x: e.x, y: e.y, m });
    }
    for (let q = 0; q < 6; q++) {
      settle(rt, 1 / 60);
      for (const e of es) {
        if (e._dx == null) continue;
        if (!g.Grid.pass(m, Math.round(e._dx), Math.round(e._dy))) R.dwall++;
        const l = dlast.get(e);
        if (l && l.m === m) {
          const d = Math.hypot(e._dx - l.x, e._dy - l.y);
          if (d > 0 && d < 3 && blocked(g, m, l.x, l.y, e._dx, e._dy) && (blocked(g, m, l.x, l.y, e._dx, l.y) || blocked(g, m, e._dx, l.y, e._dx, e._dy)) && (blocked(g, m, l.x, l.y, l.x, e._dy) || blocked(g, m, l.x, e._dy, e._dx, e._dy))) R.dcross++; /* 칸 모서리 위의 아주 작은 움직임 · 직각 두 걸음은 통과 */
          if (d > 0.002) { const ux = (e._dx - l.x) / d, uy = (e._dy - l.y) / d, o = dir.get(e); if (o && ux * o[0] + uy * o[1] < -0.3) R.flip++; dir.set(e, [ux, uy]); }
        }
        dlast.set(e, { x: e._dx, y: e._dy, m });
        R.lag = Math.max(R.lag, Math.hypot(e.x - e._dx, e.y - e._dy));
      }
    }
  }
  return R;
}
const MIN = +process.argv[2] || 2;
for (const [seed, crew] of [[1, 'dragoon,cleric,rogue'], [2, 'dragoon,cleric,rogue'], [3, 'barbarian,mage,archer'], [4, 'paladin,bard,monk']]) {
  const r = sweep(seed, crew.split(','), MIN), tag = `시드 ${seed}`;
  console.log(`  ${tag} ${crew}: 프레임 ${r.frames} · 벽안 ${r.wall} · 통과 ${r.cross} · 표시 벽안 ${r.dwall} · 표시 통과 ${r.dcross} · 떨림 ${r.flip} · 최대 지연 ${r.lag.toFixed(1)}`);
  t(`${tag}: 벽 안에 서지 않는다`, r.wall === 0, JSON.stringify(r.ex));
  t(`${tag}: 벽을 지나가지 않는다`, r.cross === 0, JSON.stringify(r.ex));
  t(`${tag}: 보이는 자리도 벽 안에 없다`, r.dwall === 0, r.dwall);
  t(`${tag}: 보이는 자리도 벽을 지나가지 않는다`, r.dcross === 0, r.dcross);
}
console.log(`move_rules: 통과 ${ok} · 실패 ${bad}`);
if (bad) process.exitCode = 1;
