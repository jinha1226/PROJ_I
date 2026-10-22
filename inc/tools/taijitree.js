// 무협 트리를 태극·팔괘 그림에 맞춰 배치한다 (좌표와 선행 노드를 함께 정한다). node tools/taijitree.js write
//  가운데 태극: 원(16노드) · S자 곡선 · 눈 둘 / 바깥 팔괘: 방향마다 괘 하나 — 이은 막대 ⚊ = 노드 셋, 끊긴 막대 ⚋ = 노드 둘(가운데가 빈다)
//  갈래마다 원의 한 구간과 괘 둘: 위 = 강호행(계획표·소속), 오른쪽 = 회귀, 아래 = 무학(무공 계열), 왼쪽 = 강호 출도
//  갈래 안에서는 원래 깊이·비용 순서대로 가까운 칸부터 채운다. ★짝은 같은 부모를 둔 형제 칸에.
const fs = require('fs'), vm = require('vm');
const ROOT = __dirname + '/..', SRC = ROOT + '/js/trees.js';
const ctx = { console, Math, JSON, Date }; vm.createContext(ctx);
for (const f of ['core', 'data', 'grid', 'juice', 'tree', 'trees']) vm.runInContext(fs.readFileSync(ROOT + '/js/' + f + '.js', 'utf8'), ctx);
const d = ctx.G.Tree.defs.wuxia, idx = Object.fromEntries(d.map(n => [n.id, n]));
// ORIG=경로: 태극으로 바꾸기 전 trees.js (갈래·깊이를 거기서 읽는다)
let od = d;
if (process.env.ORIG) { const c2 = { console, Math, JSON, Date }; vm.createContext(c2); for (const f of ['core', 'data', 'grid', 'juice', 'tree']) vm.runInContext(fs.readFileSync(ROOT + '/js/' + f + '.js', 'utf8'), c2); vm.runInContext(fs.readFileSync(process.env.ORIG, 'utf8'), c2); od = c2.G.Tree.defs.wuxia; }
const oidx = Object.fromEntries(od.map(n => [n.id, n]));
const req = n => (oidx[n.id] || n).req;
const ch = {}; for (const n of d) for (const r of req(n)) (ch[r] = ch[r] || []).push(n.id);
const br = {}; const walk = (id, b) => { if (br[id]) return; br[id] = b; for (const c of ch[id] || []) walk(c, b); }; for (const c of ch.root) walk(c, c);
const dep = { root: 0 }; let changed = true;
while (changed) { changed = false; for (const n of d) if (!n.root && req(n).every(r => dep[r] != null)) { const v = Math.max(...req(n).map(r => dep[r])) + 1; if (dep[n.id] !== v) { dep[n.id] = v; changed = true; } } }

// ── 칸(슬롯): { k: 이름, x, y, req: [슬롯 이름], b: 갈래 }
const S = {}, at = (deg, r, t = 0) => { const a = deg * Math.PI / 180; return [Math.cos(a) * r - Math.sin(a) * t, Math.sin(a) * r + Math.cos(a) * t]; };
const slot = (k, xy, req, b) => { S[k] = { k, x: +xy[0].toFixed(2), y: +xy[1].toFixed(2), req, b }; };
const RR = 3.6, ring = i => 'R' + i, RA = i => -90 + 22.5 * i;      // 원: i=0 위, 시계 방향
// 원 구간 주인: 0..2 강호행(위) · 3..7 회귀(오른쪽) · 8..10 무학(아래) · 11..15 강호 출도(왼쪽)
const OWN = ['path', 'path', 'path', 'reg', 'reg', 'reg', 'reg', 'reg', 'mu', 'mu', 'mu', 'gh', 'gh', 'gh', 'gh', 'gh'];
// S자: 위 반원(오른쪽) = 강호행 입구, 아래 반원(왼쪽) = 무학 입구
slot('Su1', [0.9, -0.24], ['root'], 'path'); slot('Su2', [1.77, -1.49], ['Su1'], 'path');
slot('Sl1', [-0.9, 0.24], ['root'], 'mu'); slot('Sl2', [-1.77, 1.49], ['Sl1'], 'mu');
// 원: 위(0)는 S 위 끝 또는 원의 마지막에서, 아래(8)는 S 아래 끝 또는 회귀 끝에서
slot(ring(0), at(RA(0), RR), ['Su2', ring(15)], 'path');
for (let i = 1; i <= 6; i++) slot(ring(i), at(RA(i), RR), [ring(i - 1)], OWN[i]);
slot(ring(8), at(RA(8), RR), ['Sl2'], 'mu');
slot(ring(7), at(RA(7), RR), [ring(6), ring(8)], 'reg');
for (let i = 9; i <= 15; i++) slot(ring(i), at(RA(i), RR), [ring(i - 1)], OWN[i]);
// 눈: 위 눈(강호행 둘), 아래 눈(무학 둘)
slot('E1a', [0.45, -1.9], ['Su1'], 'path'); slot('E1b', [-0.55, -1.9], ['E1a'], 'path');
slot('E2a', [-0.45, 1.9], ['Sl1'], 'mu'); slot('E2b', [0.55, 1.9], ['E2a'], 'mu');
// 팔괘: 방향(원 칸) · 괘(안 → 밖, 1 = 이은 막대) · 주인
const TRI = [[0, '111', 'path'], [2, '011', 'path'], [4, '001', 'reg'], [6, '000', 'reg'], [8, '101', 'mu'], [10, '110', 'mu'], [12, '010', 'gh'], [14, '100', 'gh']];
const BR = [5.2, 6.2, 7.2], TW = 1.0;
for (const [ri, pat, b] of TRI) {
  const deg = RA(ri);
  let prev = { mid: ring(ri), L: ring(ri), R: ring(ri) };
  [...pat].forEach((bit, j) => {
    const r = BR[j], p = `T${ri}_${j}`;
    if (bit === '1') {
      slot(p + 'M', at(deg, r), [...new Set([prev.mid, prev.L, prev.R])].filter(x => x === prev.mid || !prev.mid).slice(0, 1).concat(prev.mid ? [] : [prev.L, prev.R]), b);
      S[p + 'M'].req = prev.mid ? [prev.mid] : [prev.L, prev.R];
      slot(p + 'L', at(deg, r, -TW), [p + 'M'], b); slot(p + 'R', at(deg, r, TW), [p + 'M'], b);
      prev = { mid: p + 'M', L: p + 'L', R: p + 'R' };
    } else {
      slot(p + 'L', at(deg, r, -TW), [prev.mid && j === 0 ? prev.mid : prev.L], b);
      slot(p + 'R', at(deg, r, TW), [prev.mid && j === 0 ? prev.mid : prev.R], b);
      prev = { mid: null, L: p + 'L', R: p + 'R' };
    }
  });
}
// ── 노드를 칸에 앉힌다
const slotsOf = b => Object.values(S).filter(s => s.b === b);
const sdep = {}; const sd = k => (k === 'root' ? 0 : sdep[k] ?? (sdep[k] = 1 + Math.min(...S[k].req.filter(r => r !== k).map(r => (r === 'root' || S[r] ? (r === 'root' ? 0 : (sdep[r] ?? 50)) : 50)))));
// 깊이: 너비 우선
{ const q = ['root'], dd = { root: 0 }; const kids = {}; for (const s of Object.values(S)) for (const r of s.req) (kids[r] = kids[r] || []).push(s.k);
  for (let i = 0; i < q.length; i++) for (const c of kids[q[i]] || []) if (dd[c] == null) { dd[c] = dd[q[i]] + 1; q.push(c); }
  Object.assign(sdep, dd); }
const place = {}, BRANCH = { path: 'path', mu: 'mu', reg: 'reg', gh: 'gh' };
for (const b of Object.keys(BRANCH)) {
  const nodes = d.filter(n => br[n.id] === b), slots = slotsOf(b);
  if (nodes.length !== slots.length) throw new Error(`${b}: 노드 ${nodes.length} · 칸 ${slots.length}`);
  const free = new Set(slots.map(s => s.k));
  // 칸 순서(가까운 칸부터)와 노드 순서(원래 깊이·비용)를 맞춘다. 짝은 그 순위에 가장 가까운 형제 칸 둘에 먼저 앉힌다
  const order = slots.map(s => s.k).sort((a, c) => sdep[a] - sdep[c] || Math.hypot(S[a].x, S[a].y) - Math.hypot(S[c].x, S[c].y));
  const rank = Object.fromEntries(order.map((k, i) => [k, i]));
  const all = nodes.slice().sort((a, c) => dep[a.id] - dep[c.id] || a.base - c.base);
  const nrank = Object.fromEntries(all.map((n, i) => [n.id, i]));
  const sib = []; const byPar = {}; for (const s of slots) if (s.req.length === 1) (byPar[s.req[0]] = byPar[s.req[0]] || []).push(s.k);
  for (const ks of Object.values(byPar)) if (ks.length === 2) sib.push(ks);
  const pairs = {}; for (const n of nodes) if (n.pair) (pairs[n.pair] = pairs[n.pair] || []).push(n);
  for (const ps of Object.values(pairs)) {
    const want = (nrank[ps[0].id] + nrank[ps[1].id]) / 2;
    const cand = sib.filter(ks => ks.every(k => free.has(k))).sort((a, c) => Math.abs(rank[a[0]] - want) - Math.abs(rank[c[0]] - want));
    if (!cand.length) throw new Error('짝 칸 없음 ' + ps[0].pair);
    cand[0].forEach((k, i) => { place[ps[i].id] = k; free.delete(k); });
  }
  const rest = all.filter(n => !n.pair), fs2 = order.filter(k => free.has(k));
  rest.forEach((n, i) => { place[n.id] = fs2[i]; });
}
const who = Object.fromEntries(Object.entries(place).map(([id, k]) => [k, id]));
const L = {};
for (const [id, k] of Object.entries(place)) { const s = S[k]; L[id] = [s.x, s.y, s.req.map(r => (r === 'root' ? 'root' : who[r])).join(' ')]; }

// ── 검사·쓰기 (swordtree.js와 같은 검사)
let src = fs.readFileSync(SRC, 'utf8');
const a0 = src.indexOf("G.Tree.define('wuxia'"), b0 = src.indexOf("G.Tree.define('xianxia'");
let seg = src.slice(a0, b0);
const ids = [...seg.matchAll(/(?:N|PAIR|NOTE)\('(\w+)'/g)].map(m => m[1]).filter(id => id !== 'root');
const miss = ids.filter(id => !L[id]);
console.log('노드', ids.length, '배치', Object.keys(L).length, '빠짐', miss);
const P = { root: [0, 0], ...Object.fromEntries(Object.entries(L).map(([k, v]) => [k, v.slice(0, 2)])) };
const E = []; for (const [k, v] of Object.entries(L)) for (const r of v[2].split(' ')) E.push([r, k]);
const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
let X = 0, O = 0, C = 0;
for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
  const [p, q] = E[i].map(k => P[k]), [r, t] = E[j].map(k => P[k]);
  if (E[i].some(k => E[j].includes(k))) continue;
  if (o(p, q, r) * o(p, q, t) < 0 && o(r, t, p) * o(r, t, q) < 0) { X++; console.log('엇갈림', E[i], E[j]); }
}
const ptSeg = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], l = vx * vx + vy * vy, u = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l)); return Math.hypot(a[0] + u * vx - p[0], a[1] + u * vy - p[1]); };
for (const [a, b] of E) for (const k in P) if (k !== a && k !== b && ptSeg(P[k], P[a], P[b]) < 0.45) { O++; console.log('관통', k, a, '→', b, ptSeg(P[k], P[a], P[b]).toFixed(2)); }
const ks = Object.keys(P); for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) if (Math.hypot(P[ks[i]][0] - P[ks[j]][0], P[ks[i]][1] - P[ks[j]][1]) < 0.9) { C++; console.log('붙음', ks[i], ks[j]); }
console.log('엇갈림', X, '관통', O, '붙음', C);
if (process.argv[2] === 'list') for (const [id, v] of Object.entries(L)) console.log(id.padEnd(12), br[id].padEnd(5), place[id].padEnd(8), v[2]);
if (process.argv[2] === 'write' && !miss.length) {
  for (const [id, [x, y, req]] of Object.entries(L)) {
    const re = new RegExp(`((?:N|PAIR|NOTE)\\('${id}', )-?[\\d.]+, -?[\\d.]+, '[^']*',`);
    if (!re.test(seg)) { console.log('못 바꿈', id); continue; }
    seg = seg.replace(re, `$1${x}, ${y}, '${req}',`);
  }
  fs.writeFileSync(SRC, src.slice(0, a0) + seg + src.slice(b0));
  console.log('썼다');
}
