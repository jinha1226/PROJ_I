'use strict';
// 지역 단위 검사: node test/region_rules.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G; G.newState(); G.quiet = true;
const f = G.S.w.fantasy, GD = G.Guild; GD.leader(f); f.leaderNew = false;
let bad = 0; const ok = (name, c) => { console.log((c ? '  ok ' : '  ✗  ') + name); if (!c) bad++; };
const R = G.Region, reg = R.REGIONS.swamp;
// 지도: 시드 300개
let conn = 0, rooms = 0, pass = 0, deep = 0, shallow = 0, tree = 0, land = 0, N = 300, roomLand = 0, minRooms = 99;
for (let i = 0; i < N; i++) {
  let s = i * 7919 + 1; const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const m = reg.gen(64, 40, rng), d = G.Grid.field(m, m.start.cx, m.start.cy);
  if (d[m.end.cy * m.w + m.end.cx] >= 0 && m.rooms.every(r => d[r.cy * m.w + r.cx] >= 0)) conn++;
  rooms += m.rooms.length; minRooms = Math.min(minRooms, m.rooms.length);
  for (const r of m.rooms) { let n = 0; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (m.c[y * m.w + x] === '.') n++; roomLand += n; }
  for (const c of m.c) { if (c === '~') deep++; else if (c === ',') shallow++; else if (c === '#') tree++; else land++; }
}
const T = deep + shallow + tree + land;
console.log(`  지도 ${N}개: 이어짐 ${conn} · 빈터 평균 ${(rooms / N).toFixed(1)} (최소 ${minRooms}) · 빈터 땅 ${(roomLand / rooms).toFixed(0)}칸 · 땅 ${(land / T * 100).toFixed(0)}% 얕은 물 ${(shallow / T * 100).toFixed(0)}% 깊은 물 ${(deep / T * 100).toFixed(0)}% 나무 ${(tree / T * 100).toFixed(0)}%`);
ok('모든 빈터가 시작점과 이어진다', conn === N);
ok('빈터가 다섯 곳 이상', minRooms >= 5);
{ const m = { w: 9, h: 1, c: ['.', '~', '~', '~', '~', '~', '~', '~', '.'], passChars: '.>,', ver: 1, dist: {} }, t = { ...m, c: ['.', '#', '#', '#', '#', '#', '#', '#', '.'] }, a = { x: 0, y: 0 }, b = { x: 8, y: 0 };
  ok('깊은 물은 못 건넌다', !G.Grid.pass(m, 1, 0)); ok('깊은 물 너머로 보인다', G.Fantasy.sees(m, a, b)); ok('나무 너머로는 안 보인다', !G.Fantasy.sees(t, a, b)); }
// 예산
ok('SRD 예산표: 10레벨 보통 2,300', R.BUDGET[9][1] === 2300 && R.BUDGET[19][2] === 22000);
ok('CR → XP: 히드라 3,900', R.xpOf('히드라') === 3900);
let over = 0; for (let lv = 1; lv <= 20; lv++) for (const d of [0, 1, 2]) for (let i = 0; i < 40; i++) { const b = R.BUDGET[lv - 1][d] * 4, t = R.pick(reg, b); if (t.reduce((a, n) => a + R.xpOf(n), 0) > b && t.length > 1) over++; }
ok('무리는 예산을 넘지 않는다', over === 0);
const names = new Set(); for (let i = 0; i < 80; i++) R.pick(reg, R.BUDGET[9][1] * 4).forEach(n => names.add(n)); console.log('  10레벨 보통:', [...names].join(', '));
// 어려운 지형
{ const m = { w: 7, h: 1, c: ['.', ',', ',', ',', ',', ',', '.'], passChars: '.>,', ver: 1, dist: {} }, rt = { map: m, party: [], mons: [] }, e = { x: 0, y: 0 }, p = G.Tactics.plan(rt, e, { x: 6, y: 0 }, 6, () => false); ok('얕은 물: 이동력 6으로 3칸', p.length === 3); const e2 = { x: 0, y: 0, stat: { swim: true } }, p2 = G.Tactics.plan(rt, e2, { x: 6, y: 0 }, 6, () => false); ok('헤엄치는 몬스터는 그대로 6칸', p2.length === 6); }
// 야영
{ f.frontLock = 'swamp'; const rt = G.Fantasy.rt(f); const a = GD.make(f, 'cleric', { lv: 5 }), b = GD.make(f, 'archer', { lv: 5 }); f.mercs.push(a, b); f.lineup = [a.uid, b.uid]; G.Fantasy.syncAllies(f); G.Exp.depart(f, rt);
  const pa = rt.party.find(p => p.merc === a), pb = rt.party.find(p => p.merc === b); rt.mons = []; pa.hp = 1; a.stress = 50; rt.turn = { round: 1 }; G.Story.note(rt, 'saved', pa, pb); rt.turn = null; rt.events = rt.events || [];
  const n0 = G.Bond.n(f, a.uid, b.uid); rt.flow = rt.flow || { st: 'stairs' }; const ok1 = G.Story.stairs(f, rt);
  ok('층 사이엔 야영', ok1 && rt.scene); let guard = 0; while (rt.scene && guard++ < 400) { G.Story.tick(f, rt, 0.5); if (rt.ask) G.Story.answer(rt, 0); }
  ok('야영: 체력이 다 찬다', pa.hp === pa.max); ok('야영: 스트레스가 준다', a.stress < 50); ok('야영: 구한 사이는 정이 3 는다', G.Bond.n(f, a.uid, b.uid) >= n0 + 3); ok('야영: 모닥불이 놓인다', (rt.map.props || []).some(P => P.sc === 'camp')); ok('사건은 비워진다', !rt.events.length);
  f.floor = (f.runStart || 1) + 2; rt.stairOK = null; rt.scene = null; ok('마지막 층엔 야영 없이 돌아간다', !G.Story.stairs(f, rt)); }
// 주문 전부: 상황을 맞춰 주면 실제로 발동하고 효과가 난다
{
  const SK = G.Skill.SK, D = G.D, sc = Object.keys(SK).filter(k => k.startsWith('sp_')); f.frontLock = 'green'; const m = GD.make(f, 'archmage', { lv: 20 }), pal = GD.make(f, 'paladin', { lv: 20 }); f.mercs.push(m, pal); f.lineup = [m.uid, pal.uid]; G.Fantasy.syncAllies(f); const rt = G.Fantasy.rt(f); f.town = true; G.Exp.depart(f, rt);
  const a = rt.party.find(p => p.merc === m) || rt.party[1] || rt.party[0], al = rt.party.find(p => p.merc === pal && p !== a) || rt.party.find(p => p !== a), r0 = rt.map.rooms[1]; let fired = 0, errors = [], silent = [];
  for (const k of sc) {
    const S = SK[k]; if (S.react) continue;
    try {
      rt.mons = []; a.x = r0.cx; a.y = r0.cy; al.x = r0.cx + 1; al.y = r0.cy + 1; a.hp = a.max * 0.3; al.hp = al.max * 0.3; a.dead = al.dead = false; al.dying = null; a.bf = {}; al.bf = {}; a.pe = []; a.concK = null; a.cond = {}; al.cond = { poisoned: G.S.runTime + 50 };
      if (k === 'sp_spare_the_dying') al.dying = { ok: 0, no: 0 };
      const d = { n: k === 'sp_animal_friendship' || k === 'sp_dominate_beast' ? '숲 늑대' : '산적', ...G.D.F.mon[k === 'sp_animal_friendship' || k === 'sp_dominate_beast' ? '숲 늑대' : '산적'] };
      for (const [dx, dy] of [[2, 0], [2, 1], [1, -1]]) G.Fantasy.spawnMon(rt, 1, d, r0.cx + dx, r0.cy + dy, false, { aggro: true, spotted: true, major: true });
      for (const o of rt.mons) { o.hp = o.max = k.startsWith('sp_power_word') ? 50 : 500; o.stat = { ...o.stat, save: { str: -20, dex: -20, con: -20, int: -20, wis: -20, cha: -20 }, ac: 1 }; }
      rt.turn = { round: 1, cur: a, order: [], map: rt.map };
      const x = { f, rt, c: a, reach: 99, base: S.base, slot: S.base, seen: rt.mons.slice() };
      const hp0 = rt.mons.map(o => o.hp), st0 = JSON.stringify([a.bf, al.bf, a.thp, a.x, a.y, a.pe.length]);
      G.Foe.dtype = S.dt || null;
      if (S.rider) S.rider(a, x, rt.mons[0]); else { if (!S.when(a, x)) { silent.push(k + ':when'); continue; } S.run(a, x); for (const e of a.pe || []) if (e.fn) e.fn(x, e); }
      G.Foe.dtype = null; fired++;
      const after = JSON.stringify([a.bf, al.bf, a.thp, a.x, a.y, a.pe.length]), changed = rt.mons.some((o, i) => o.hp !== hp0[i] || o.stop > 0 || o.stun > 0 || o.shock > 0 || (o.cond && Object.keys(o.cond).length)) || after !== st0 || a.hp > a.max * 0.3 || al.hp > al.max * 0.3 || !al.cond?.poisoned || !al.dying;
      if (!changed) silent.push(k);
    } catch (e) { errors.push(k + ':' + e.message.slice(0, 40)); }
  }
  console.log(`  주문 ${sc.length}개 중 실행 ${fired} · 효과 없음 [${silent.join(' ')}]`);
  ok('주문 실행 오류 없음', !errors.length); if (errors.length) console.log(errors.slice(0, 10)); ok('전투 주문이 다 효과를 낸다', !silent.length);
  rt.turn = null; rt.mons = [];
}
console.log(bad ? `실패 ${bad}` : '전부 통과'); process.exitCode = bad ? 1 : 0;
