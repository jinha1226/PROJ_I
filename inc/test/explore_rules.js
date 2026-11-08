'use strict';
// 탐험 방침: node test/explore_rules.js (DESIGN.md 127). 꼼꼼히는 갈 수 있는 방을 다 들르고, 서둘러는 빈 방을 건너뛰며, 계단에서 남은 방을 묻는다
const fs = require('fs'), vm = require('vm'), path = require('path');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8'), FILES = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
let ok = 0, bad = 0; const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild;
function boot(pol, front, fl = 3) {
  G.quiet = true; G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; L.lv = 12; f.autoTr = f.autoParty = false; f.askMeet = false;
  if (pol) f.explore = pol; if (front) f.front = front;
  const ms = ['cleric', 'dragoon', 'archmage'].map(c => GD.make(f, c, { lv: 12 })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); F.syncAllies(f);
  f.floor = f.maxFloor = fl; f.checkpoint = f.start = fl; f.town = true; f.townT = 99; G.Exp.depart(f, F.rt(f));
  const rt = F.rt(f); for (const q of rt.party) { q.max = q.hp = 1e6; if (q.merc) G.Res.long(q.merc); } rt.mons.forEach(o => { o.hp = o.max = 1; });
  G.Story.askRetreat = () => false;
  return { f, rt };
}
// 층 하나를 끝까지: 계단 · 귀환에 닿으면 그때의 방 상태를 돌려준다
function runFloor(f, rt, cap = 40000) {
  const m0 = rt.map; let out = null; const de = F.descend, ho = G.Exp.home, snap = why => { if (!out) out = { why, rooms: m0.rooms.map(r => ({ id: r.id, ent: !!r.ent, empty: !r.evSlot, r })), left: G.Flow.unseenRooms(f, rt).length }; };
  F.descend = function () { snap('stairs'); }; G.Exp.home = function () { snap('home'); };
  try { for (let i = 0; i < cap && !out; i++) { for (const q of rt.party) if (!q.dead) q.hp = q.max; G.tick(0.1, 0.1); if (f.town) break; if (rt.ask) G.Story.answer(rt, rt.ask.def, 'auto'); } } finally { F.descend = de; G.Exp.home = ho; }
  return out;
}
// 방침 기본값
{ const { f } = boot(null); t('기본은 꼼꼼히', f.explore === 'full' && G.Flow.policy(f) === 'full'); delete f.explore; t('옛 저장도 꼼꼼히', G.Flow.policy(f) === 'full'); f.explore = 'fast'; t('서둘러', G.Flow.policy(f) === 'fast'); }
// 일반 층 (시드 여러 번)
let fullN = 0, fastN = 0, skipped = 0;
for (let i = 0; i < 4; i++) {
  const a = boot('full'), ra = runFloor(a.f, a.rt);
  t(`꼼꼼히 ${i}: 계단에 닿는다`, ra && ra.why === 'stairs', ra && ra.why);
  if (ra) { t(`꼼꼼히 ${i}: 갈 수 있는 방이 남지 않는다`, ra.left === 0, ra.left); fullN += ra.rooms.filter(q => q.ent).length; }
  const b = boot('fast'), rb = runFloor(b.f, b.rt);
  t(`서둘러 ${i}: 계단에 닿는다`, rb && rb.why === 'stairs', rb && rb.why);
  if (rb) { fastN += rb.rooms.filter(q => q.ent).length; skipped += rb.left; }
}
t('서둘러는 빈 방을 건너뛴다', skipped > 0, `${fastN} ${fullN} ${skipped}`); // 시도마다 지도가 달라 들른 방 수끼리는 비교하지 않는다
// 타워
{ const a = boot('full', 'astral', 1), ma = a.rt.map; t('타워에 들어왔다', ma.scn === 'astral', ma.scn); const ra = runFloor(a.f, a.rt); t('타워 꼼꼼히: 끝난다', !!ra, ra && ra.why); if (ra) { t('타워 꼼꼼히: 갈 수 있는 방이 남지 않는다', ra.left === 0, ra.left); const locked = ma.rooms.filter(r => !G.Scn.reachable(a.rt, r)); t('타워: 잠긴 방은 세지 않는다', locked.every(r => !G.Flow.unseenRooms(a.f, a.rt).includes(r))); }
  const b = boot('fast', 'astral', 1), rb = runFloor(b.f, b.rt); t('타워 서둘러: 끝난다', !!rb, rb && rb.why); if (rb) t('타워 서둘러: 빈 방을 건너뛴다', rb.left > 0, rb.left);
}
// 잠긴 방: 길이 없으면 세지 않는다
{ const { f, rt } = boot('full'), m = rt.map, r = m.rooms.find(q => q !== m.rooms[0] && q !== m.end && q !== m.start); r.ent = false; const n0 = G.Flow.unseenRooms(f, rt).includes(r); const save = m.c.slice(); for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (y === r.y - 1 || y === r.y + r.h || x === r.x - 1 || x === r.x + r.w) if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.c[y * m.w + x] = '#'; m.ver++; m.dist = {}; const lead = rt.party.find(p => !p.dead); if (Math.abs(lead.x - r.cx) < r.w && Math.abs(lead.y - r.cy) < r.h) { t('(시험 준비) 파티가 방 밖', false); } t('열린 방은 센다', n0); t('막힌 방은 안 센다', !G.Flow.unseenRooms(f, rt).includes(r)); m.c = save; m.ver++; m.dist = {}; }
// 계단 질문 (계단의 무작위 장면은 이 시험의 대상이 아니다)
const stairs0 = G.Story.stairs; G.Story.stairs = () => false;
function atStairs(pol, rush) { const { f, rt } = boot(pol); G.tick(0.1, 0.1); const m = rt.map, lead = rt.hero; rt.mons = []; lead.x = m.end.cx; lead.y = m.end.cy; for (const r of m.rooms) r.ent = r === m.end || r === m.rooms[0]; rt.rush = !!rush; rt.flow.st = 'stairs'; return { f, rt, n: G.Flow.unseenRooms(f, rt).length }; }
function asked(pol, rush, act) { const A = atStairs(pol, rush), a0 = G.Story.ask, de = F.descend; let q = null, down = 0; F.descend = () => { down++; }; G.Story.ask = (ff, r, title, opts, def, done) => { q = { title, labels: opts.map(o => o.label), def }; r.ask = { id: 1, title, opts, def, t: 8, max: 8, done }; }; try { G.Flow.tick(A.f, A.rt, 5, 0.1); const st1 = A.rt.flow.st; if (act != null && A.rt.ask) { G.Story.answer(A.rt, act, 'pick'); } const st2 = A.rt.flow.st; return { q, st1, st2, n: A.n, more: !!A.rt.flow.more, down, A }; } finally { G.Story.ask = a0; F.descend = de; } }
{ const a = asked('fast'); t('안 간 방이 있다', a.n > 0, a.n); t('제목은 개수', a.q && a.q.title === `안 간 방 ${a.n}`, a.q && a.q.title); t('선택지', a.q && a.q.labels.join() === '내려간다,마저 본다', a.q && a.q.labels.join()); t('서둘러 기본값: 내려간다', a.q && a.q.def === 0); t('묻는 동안 멈춘다', a.st1 === 'stairAsk', a.st1);
  const c = asked('full'); t('꼼꼼히 기본값: 마저 본다', c.q && c.q.def === 1);
  const m = asked('fast', false, 1); t('마저 본다: 이동으로', m.st2 === 'travel' && m.more, `${m.st2} ${m.more}`);
  const d = asked('fast', false, 0); t('내려간다: 계단으로', d.st2 === 'stairs', d.st2);
  const r = asked('fast', true); t('rt.rush는 묻지 않는다', !r.q && r.down === 1, `${JSON.stringify(r.q)} ${r.down}`);
  // 마저 본 뒤에는 그 층을 끝까지
  const { f, rt } = boot('fast'), keep = G.Story.ask; G.Story.ask = (ff, r0, ti, o, de, done) => done(1); const ro = runFloor(f, rt); G.Story.ask = keep; t('마저 본다: 남김없이', ro && ro.left === 0, ro && ro.left);
  // 다음 층엔 방침으로 돌아간다
  const z = asked('fast', false, 1); z.A.rt.flow = null; G.Flow.tick(z.A.f, z.A.rt, 5, 0.1); t('새 층은 방침대로', !z.A.rt.flow.more);
  // 질문이 사라져도 멈추지 않는다
  const e = asked('fast'); e.A.rt.ask = null; const de = F.descend; F.descend = () => {}; G.Flow.tick(e.A.f, e.A.rt, 5, 0.1); F.descend = de; t('질문이 없으면 계단으로', e.A.rt.flow.st !== 'stairAsk', e.A.rt.flow.st);
}
// 조용한 실행(시뮬레이션): 기본값으로 바로
{ const A = atStairs('fast'), de = F.descend; let down = 0; F.descend = () => { down++; }; G.Flow.tick(A.f, A.rt, 5, 0.1); F.descend = de; t('조용하면 서둘러는 바로 내려간다', down === 1 && !A.rt.ask, down); }
G.Story.stairs = stairs0; G.quiet = false; console.log(`explore_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
