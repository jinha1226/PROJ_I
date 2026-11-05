'use strict';
// 아스트랄 타워 지도 시험: node test/scn_rules.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild; let ok = 0, bad = 0; const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
const norm = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'scenarios', 'astral_tower', 'astral_tower.normalized.json'), 'utf8'));
const seen = new Set();
G.Scn.FLOORS.forEach((d, i) => {
  const m = G.Scn.build(i), dist = G.Grid.field(m, m.start.cx, m.start.cy), show = process.argv.includes('--show');
  if (show) { console.log(d.id); for (let y = 0; y < m.h; y++) console.log(m.c.slice(y * m.w, (y + 1) * m.w).join('')); }
  t(`${d.id}: 끝 계단`, m.c[m.end.cy * m.w + m.end.cx] === '>'); t(`${d.id}: 시작에서 끝까지`, dist[m.end.cy * m.w + m.end.cx] >= 0);
  for (const r of m.rooms) { seen.add(r.id); let any = false, far = 0; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if ((m.c[y * m.w + x] === '.' || m.c[y * m.w + x] === '>') && dist[y * m.w + x] >= 0) any = true; t(`${d.id} ${r.id} ${r.title}: 닿는다`, any); }
  let lost = 0; for (let k = 0; k < m.c.length; k++) if (m.c[k] === '.' && dist[k] < 0) lost++; t(`${d.id}: 닿지 못하는 바닥 없음`, lost === 0, lost);
});
for (const r of norm.rooms) { const id = r.id.replace('AT-', ''); t(`원문 방 ${id}이 지도에 있음`, seen.has(id)); }
// 실제 출발
G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; L.lv = 5; f.autoTr = f.autoParty = false; const a = GD.make(f, 'cleric', { lv: 5 }), b = GD.make(f, 'dragoon', { lv: 5 }); f.mercs.push(a, b); f.lineup = [a.uid, b.uid]; F.syncAllies(f); f.floor = f.maxFloor = 1; f.checkpoint = f.start = 1; f.town = true; f.townT = 99; f.frontLock = f.front = 'astral'; G.Exp.depart(f, F.rt(f)); const rt = F.rt(f);
t('출발: 1층 지도', rt.map.scn === 'F1', rt.map.scn); t('방 이름', rt.map.rooms.some(r => r.title === '도서관')); t('몬스터 배치', rt.mons.length > 0, rt.mons.length); t('상자', rt.chests.length >= 2);
for (const id of ['F2', 'F3', 'F4', 'B1']) { f.floor++; F.newFloor(f, rt); t(`${id} 지도`, rt.map.scn === id, rt.map.scn); }
t('B1: 고유 생물', rt.mons.filter(o => o.label === '아스트랄 덴드론' || o.n === '아스트랄 덴드론' || o.name === '아스트랄 덴드론').length >= 1 || rt.mons.length >= 6, rt.mons.length);
t('지역 끝', G.Region.done(f, G.Region.REGIONS.astral));
console.log(`scn_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
