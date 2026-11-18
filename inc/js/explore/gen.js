'use strict';
// 한 막의 던전 만들기 (ROGUELIKE_PLAN 4-2 · 4-3 · 2-1의 6번, DESIGN.md 176).
// 순서: ① 진짜 던전을 키운다 (watabou One Page Dungeon의 방식 — 방에 대칭 날개 · 앞방을 붙여 "부분 대칭"을 만들고,
// 이웃한 방을 이어 고리를 더한다) ② 입구에서의 깊이로 방향을 정해 갈림길 그래프를 뽑는다 (더 깊은 방으로만 간다)
// ③ 방 종류 · 길 종류를 매기고, 층마다 꼭 들어갈 구조와 "열쇠 없이 갈 길"을 검사한다.
RUN.gen = (() => {
  const ROWS_GRAPH = 8;
  // 층의 윤곽 (DESIGN.md 180): 같은 규칙으로 키워도 윤곽이 다르면 전체 모습이 달라진다.
  // 캔버스 기준(앞 = 위)에서 키운 뒤 rot(돌리기) · flip(뒤집기)으로 실제 지도에 옮긴다.
  const FRAMES = {
    tall: rng => ({ n: '세로형', cw: 32, ch: 74, sx: 0.5, up: 0.55, rot: 0, region: () => true }),
    wide: rng => ({ n: '가로형', cw: 30, ch: 68, sx: 0.5, up: 0.55, rot: 1, region: () => true }),
    square: rng => ({ n: '정사각형', cw: 48, ch: 48, sx: 0.3 + rng() * 0.4, up: 0.3, rot: 0, region: () => true }),
    blob: rng => { const cw = 46, ch = 54, rx = cw / 2 - 1, ry = ch / 2 - 1, cx = cw / 2, cy = ch / 2, ph = rng() * 6;
      return { n: '덩어리형', cw, ch, sx: 0.5, up: 0.4, rot: rng() < 0.5 ? 0 : 1, region: (x, y) => { const a = Math.atan2(y - cy, x - cx), w = 1 + 0.16 * Math.sin(a * 3 + ph) + 0.1 * Math.sin(a * 5 + ph * 2); return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= w * w; } }; },
    ell: rng => ({ n: 'L자형', cw: 50, ch: 54, sx: 0.2, up: 0.5, rot: 0, region: (x, y) => x < 22 || y < 24 }),
    diag: rng => ({ n: '대각선형', cw: 52, ch: 60, sx: 0.12, up: 0.55, rot: 0, region: (x, y) => { const t = (x / 52) - (1 - y / 60); return Math.abs(t) < 0.34; } }),
  };
  const frameOf = seed => { const r = RUN.rng(seed * 101 + 17), keys = Object.keys(FRAMES), F = FRAMES[keys[Math.floor(r() * keys.length)]](r); F.flip = r() < 0.5; return F; };
  const KEYLESS = { open: 1, trap: 1, dark: 1 };
  const keyless = e => !!KEYLESS[e.kind];
  const D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const D8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

  // ── 방 모양 (상대 칸 목록). 네 변의 가운데 칸은 늘 들어 있다 (문 자리) ──
  function shapeOf(rng, kind, w, h) {
    const cx = (w - 1) / 2, cy = (h - 1) / 2, out = [], decor = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let ok = true;
      if (kind === 'round') ok = (x - cx) ** 2 + (y - cy) ** 2 <= (cx + 0.55) ** 2;
      else if (kind === 'cross') ok = Math.abs(x - cx) <= Math.floor(w / 4) || Math.abs(y - cy) <= Math.floor(h / 4);
      else if (kind === 'cave') { const r = ((x - cx) / (cx + 0.5)) ** 2 + ((y - cy) / (cy + 0.5)) ** 2; ok = r <= 1 + (rng() - 0.6) * 0.7 || x === cx || y === cy; }
      if (ok) out.push([x, y]);
    }
    if (kind === 'hall') for (let x = 2; x < w - 2; x += 2) { decor.push({ k: 'pillar', x, y: 1 }); decor.push({ k: 'pillar', x, y: h - 2 }); }
    if (kind === 'round' && w >= 7 && rng() < 0.6) decor.push({ k: 'pool', x: cx, y: cy, r: w >= 9 ? 1.6 : 1.1 });
    if (kind === 'cave') for (let i = 0; i < 4; i++) { const c = out[Math.floor(rng() * out.length)]; decor.push({ k: 'rubble', x: c[0], y: c[1] }); }
    return { cells: out, decor };
  }
  function pickRoom(rng, big) {
    const u = rng();
    if (big) return u < 0.4 ? ['hall', 9, 7] : u < 0.75 ? ['round', 9, 9] : ['cross', 9, 9];
    if (u < 0.32) return ['rect', 5 + 2 * Math.floor(rng() * 2), 3 + 2 * Math.floor(rng() * 2)];
    if (u < 0.52) return ['hall', 7, 5];
    if (u < 0.7) return ['round', rng() < 0.5 ? 5 : 7, 0];
    if (u < 0.85) return ['cave', 7, 5];
    return ['cross', 7, 7];
  }

  function grow(seed, F) {
    const CW = F.cw, CH = F.ch;
    const rng = RUN.rng(seed), occ = new Int8Array(CW * CH), own = new Int16Array(CW * CH).fill(-1);
    const at = (x, y) => x < 0 || y < 0 || x >= CW || y >= CH ? 9 : occ[y * CW + x];
    const ownAt = (x, y) => x < 0 || y < 0 || x >= CW || y >= CH ? -1 : own[y * CW + x];
    const inB = (x, y) => x >= 1 && y >= 1 && x < CW - 1 && y < CH - 1 && F.region(x, y);
    const rooms = [], links = [];
    const mark = (cells, v, id) => { for (const [x, y] of cells) { occ[y * CW + x] = v; own[y * CW + x] = id; } };
    const mkRoom = (kind, w, h, x0, y0) => { if (kind === 'round') h = w; const s = shapeOf(rng, kind, w, h); return { kind, w, h, x: x0, y: y0, rel: s.cells, decor: s.decor, cells: s.cells.map(([a, b]) => [x0 + a, y0 + b]) }; };
    const fits = (r, allowOwn = -1) => r.cells.every(([x, y]) => inB(x, y) && at(x, y) === 0 && D8.every(([dx, dy]) => at(x + dx, y + dy) === 0));
    const corOk = (cells, parent) => cells.every(([x, y], i) => inB(x, y) && at(x, y) === 0 && D8.every(([dx, dy]) => { const v = at(x + dx, y + dy); return v === 0 || (v === 1 && ownAt(x + dx, y + dy) === parent && i === 0); }));
    const mid = (r, s) => { const cx = (r.w - 1) / 2, cy = (r.h - 1) / 2; return s === 'up' ? [r.x + cx, r.y] : s === 'down' ? [r.x + cx, r.y + r.h - 1] : s === 'left' ? [r.x, r.y + cy] : [r.x + r.w - 1, r.y + cy]; };
    const DIR = { up: [0, -1], left: [-1, 0], right: [1, 0] }, OPP = { up: 'down', left: 'right', right: 'left' };
    // 부모 p의 s변에서 길이 L 복도 끝에 (kind, w, h) 방을 놓는 안
    function plan(p, s, kind, w, h, L) {
      const [dx, dy] = DIR[s], [px, py] = mid(p, s), cor = [];
      for (let i = 1; i <= L; i++) cor.push([px + dx * i, py + dy * i]);
      const [ex, ey] = cor[cor.length - 1], hh = kind === 'round' ? w : h;
      const ddx = s === 'up' ? (w - 1) / 2 : s === 'left' ? w - 1 : 0, ddy = s === 'up' ? hh - 1 : (hh - 1) / 2;
      const r = mkRoom(kind, w, h, ex + dx - ddx, ey + dy - ddy);
      return { r, cor, door: [px, py], cdoor: [ex + dx, ey + dy] };
    }
    function commit(p, pl) {
      const id = rooms.length; pl.r.id = id; pl.r.parent = p.id; rooms.push(pl.r); mark(pl.r.cells, 1, id); mark(pl.cor, 2, -1);
      links.push({ a: p.id, b: id, cells: pl.cor, doorA: pl.door, doorB: pl.cdoor, tree: true });
      return pl.r;
    }
    // 입구
    const start = mkRoom('rect', 5, 3, Math.max(2, Math.min(CW - 7, Math.round(F.sx * CW) - 2)), CH - 6); start.id = 0; start.parent = -1; rooms.push(start); mark(start.cells, 1, 0);
    start.tried = {};
    for (let guard = 0; guard < 500 && rooms.length < 23; guard++) {
      // 위쪽(앞으로) 방을 더 자주 고른다
      const open = rooms.filter(r => !r.tried || Object.keys(r.tried).length < 3);
      if (!open.length) break;
      open.sort((a, b) => a.y - b.y);
      const p = rng() < F.up ? open[Math.floor(rng() * Math.min(3, open.length))] : open[Math.floor(rng() * open.length)];
      p.tried = p.tried || {};
      const [kind, w, h] = pickRoom(rng, false), L = 2 + Math.floor(rng() * 3), u = rng();
      if (u < 0.45 && !p.tried.pair) {
        // 대칭 날개: 양옆에 같은 방
        p.tried.pair = 1; const a = plan(p, 'left', kind, w, h, L), b = plan(p, 'right', kind, w, h, L);
        if (corOk(a.cor, p.id) && fits(a.r) && corOk(b.cor, p.id)) { commit(p, a); if (fits(b.r) && corOk(b.cor, p.id)) commit(p, b); }
      } else if (!p.tried.up) {
        p.tried.up = 1; const a = plan(p, 'up', kind, w, h, L + (rng() < 0.3 ? 2 : 0));
        if (corOk(a.cor, p.id) && fits(a.r)) commit(p, a);
      } else if (!p.tried.side) {
        p.tried.side = 1; const s = rng() < 0.5 ? 'left' : 'right', a = plan(p, s, kind, w, h, L);
        if (corOk(a.cor, p.id) && fits(a.r)) commit(p, a);
      }
    }
    // 우두머리 방: 가장 위쪽 방 위에 큰 방
    const tops = rooms.slice().sort((a, b) => a.y - b.y);
    let boss = null;
    for (const p of tops.slice(0, 6)) {
      for (const L of [2, 3, 4]) { const [kind, w, h] = pickRoom(rng, true), a = plan(p, 'up', kind, w, h, L); if (corOk(a.cor, p.id) && fits(a.r)) { boss = commit(p, a); break; } }
      if (boss) break;
    }
    if (!boss) return null;
    // 고리: 이웃한 방을 짧은 굽은 복도로 잇는다 (A*). 다른 방 · 복도에 닿지 않게
    const passable = (x, y, a, b) => inB(x, y) && at(x, y) === 0 && D8.every(([dx, dy]) => { const v = at(x + dx, y + dy); if (v === 0) return true; if (v === 1) { const o = ownAt(x + dx, y + dy); return o === a || o === b; } return false; });
    function route(A, B) {
      const starts = [], goals = new Map();
      const edgeCells = (R, other) => { const out = []; for (const [x, y] of R.cells) for (const [dx, dy] of D4) { const ox = x + dx, oy = y + dy; if (ownAt(ox, oy) === R.id) continue; if (passable(ox, oy, R.id, other)) out.push({ door: [x, y], o: [ox, oy] }); } return out; };
      for (const s of edgeCells(A, B.id)) starts.push(s);
      for (const g of edgeCells(B, A.id)) goals.set(g.o[0] + ',' + g.o[1], g);
      if (!starts.length || !goals.size) return null;
      const noise = (x, y) => ((x * 73856093 ^ y * 19349663 ^ seed) >>> 0) % 100 / 100;
      const dist = new Map(), prev = new Map(), q = [];
      for (const s of starts) { const k = s.o[0] + ',' + s.o[1]; dist.set(k, 1); q.push([1, s.o[0], s.o[1], -1]); prev.set(k, { start: s }); }
      while (q.length) {
        q.sort((a, b) => a[0] - b[0]); const [d, x, y, dir] = q.shift(), k = x + ',' + y;
        if (d > dist.get(k) + 1e-9) continue;
        if (goals.has(k)) {
          const cells = []; let c = k; while (true) { const [cx, cy] = c.split(',').map(Number); cells.unshift([cx, cy]); const pv = prev.get(c); if (pv.start) return { cells, doorA: pv.start.door, doorB: goals.get(k).door }; c = pv.from; }
        }
        if (d > 22) continue;
        D4.forEach(([dx, dy], i) => {
          const nx = x + dx, ny = y + dy, nk = nx + ',' + ny; if (!passable(nx, ny, A.id, B.id)) return;
          const nd = d + 1 + (dir >= 0 && dir !== i ? 0.6 : 0) + noise(nx, ny) * 0.8;
          if (!dist.has(nk) || nd < dist.get(nk)) { dist.set(nk, nd); prev.set(nk, { from: k }); q.push([nd, nx, ny, i]); }
        });
      }
      return null;
    }
    const linked = (a, b) => links.some(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));
    const centre = r => [r.x + r.w / 2, r.y + r.h / 2];
    const near = (a, b) => { const [ax, ay] = centre(a), [bx, by] = centre(b); return Math.abs(ax - bx) + Math.abs(ay - by); };
    const pairs = [];
    for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) if (!linked(i, j) && near(rooms[i], rooms[j]) < 20) pairs.push([i, j]);
    let loops = 0;
    for (const [i, j] of RUN.shuffle(rng, pairs)) {
      if (loops >= 8) break;
      const r = route(rooms[i], rooms[j]); if (!r) continue;
      mark(r.cells, 2, -1); links.push({ a: i, b: j, ...r, tree: false }); loops++;
    }
    // 깊이 (입구에서 몇 방) 와 막다른 방 고치기: 더 깊은 이웃이 없는 방은 더 깊은 방으로 잇고, 안 되면 지운다
    const alive = new Set(rooms.map(r => r.id));
    const depthOf = () => { const d = new Map([[0, 0]]), q = [0]; while (q.length) { const v = q.shift(); for (const l of links) { if (!alive.has(l.a) || !alive.has(l.b)) continue; const w = l.a === v ? l.b : l.b === v ? l.a : -1; if (w >= 0 && !d.has(w)) { d.set(w, d.get(v) + 1); q.push(w); } } } return d; };
    // 순서(rank): 깊이 → 지도에서 더 위 → 번호. 길은 순서가 오르는 쪽으로만 간다 (되돌아가기 없음, 고리 없음).
    // 같은 깊이끼리의 고리도 위쪽으로 가는 길로 살린다 — 갈림길이 는다 (DESIGN.md 179)
    const rankOf = (d, id) => id === boss.id ? 1e9 : d.get(id) * 1e5 + (CH - (rooms[id].y + rooms[id].h / 2)) * 100 + id;
    for (let pass = 0; pass < 6; pass++) {
      const d = depthOf(); let changed = false;
      for (const id of [...alive]) if (!d.has(id)) { alive.delete(id); changed = true; }
      for (const id of [...alive]) {
        if (id === boss.id) continue;
        const deeper = links.some(l => alive.has(l.a) && alive.has(l.b) && ((l.a === id && rankOf(d, l.b) > rankOf(d, id)) || (l.b === id && rankOf(d, l.a) > rankOf(d, id))));
        if (deeper) continue;
        const cands = [...alive].filter(o => rankOf(d, o) > rankOf(d, id) && !linked(id, o)).sort((a, b) => near(rooms[id], rooms[a]) - near(rooms[id], rooms[b]));
        let ok = false;
        for (const o of cands.slice(0, 4)) { const r = route(rooms[id], rooms[o]); if (r) { mark(r.cells, 2, -1); links.push({ a: id, b: o, ...r, tree: false }); ok = true; break; } }
        if (!ok) { alive.delete(id); } changed = true;
      }
      if (!changed) break;
    }
    const d = depthOf();
    if (!d.has(boss.id)) return null;
    for (const id of [...alive]) if (!d.has(id)) alive.delete(id);
    const rank = new Map([...alive].map(id => [id, rankOf(d, id)]));
    return { rooms: rooms.filter(r => alive.has(r.id)), links: links.filter(l => alive.has(l.a) && alive.has(l.b)), depth: d, rank, boss: boss.id };
  }

  const outs = (m, id) => m.edges.filter(e => e.a === id);
  const ins = (m, id) => m.edges.filter(e => e.b === id);
  function path(m, avoid = () => false) {
    const goal = m.nodes.find(n => n.type === 'boss').id, seen = new Set([0]), q = [0];
    while (q.length) { const id = q.shift(); if (id === goal) return true; for (const e of outs(m, id)) if (keyless(e) && !seen.has(e.b) && !avoid(m.nodes[e.b])) { seen.add(e.b); q.push(e.b); } }
    return false;
  }
  // 적 무리: 구역 규칙표(RUN.ZONES)의 예산과 틀로 채운다. fi = 구역 안에서 몇째 층(0 · 1), deep = 입구에서 먼 정도(0~1)
  function group(rng, type, tier, Z, fi, small, deep) {
    const mk = (fam, units) => { const count = units.reduce((a, u) => a + u[1], 0); return { fam, name: units[0][0], count, d: units.reduce((a, u) => a + Z.cost[u[0]] * u[1], 0), label: units.map(([n, c]) => `${n}${count > 1 ? ` ${c}` : ''}`).join(' · '), tier, units }; };
    if (type === 'boss') { const p = fi % 2 ? Z.boss : Z.gate; return mk(p.n, p.u.map(u => u.slice())); }
    const [lo, mid, hi, el] = Z.budget[fi], bud = type === 'elite' ? el : (tier === 'heavy' ? hi : tier === 'light' ? lo : mid) * (0.8 + 0.4 * deep);
    const pool = type === 'elite' ? Z.elites : Z.packs, two = [RUN.pick(rng, pool), RUN.pick(rng, pool)].sort((p, q) => Z.cost[q.u[0]] - Z.cost[p.u[0]]);
    const { n, u: [a, b] } = small ? two[0] : two[1];
    const cnt = v => Math.max(1, Math.min(6, Math.round(v))); // 한 종류는 여섯까지 (싼 몬스터로 방이 넘치지 않게)
    if (!b) return mk(n, [[a, cnt(bud / Z.cost[a])]]);
    const na = cnt(bud / 2 / Z.cost[a]);
    return mk(n, [[a, na], [b, cnt((bud - na * Z.cost[a]) / Z.cost[b])]]);
  }
  function build(seed, F, floor) {
    const Z = RUN.zone(floor), fi = floor - Z.floors[0];
    const g = grow(seed, F); if (!g) return null;
    const rng = RUN.rng(seed * 13 + 5);
    // 방 번호를 다시 매긴다 (입구 0, 깊이 순)
    const order = g.rooms.slice().sort((a, b) => g.rank.get(a.id) - g.rank.get(b.id)), idx = new Map(order.map((r, i) => [r.id, i]));
    const maxD = Math.max(...order.map(r => g.depth.get(r.id)));
    const nodes = order.map((r, i) => ({ id: i, row: g.depth.get(r.id), x: (r.x + r.w / 2) / F.cw, type: 'fight', size: r.cells.length >= 30 ? 'large' : 'small', info: 0, notes: [] }));
    const edges = [], cor = {}, room = {};
    for (const r of order) room[idx.get(r.id)] = { x: r.x, y: r.y, w: r.w, h: r.h, cells: r.cells, decor: r.decor.map(o => ({ ...o, x: r.x + o.x, y: r.y + o.y })), kind: r.kind };
    for (const l of g.links) {
      let a = idx.get(l.a), b = idx.get(l.b), cells = l.cells, dA = l.doorA, dB = l.doorB;
      if (a > b) { [a, b] = [b, a]; cells = cells.slice().reverse(); [dA, dB] = [dB, dA]; }
      const e = { id: edges.length, a, b, kind: 'open', loop: !l.tree }; edges.push(e);
      cor[e.id] = { cells, doorA: dA, doorB: dB, doorAout: cells[0], doorBout: cells[cells.length - 1] };
    }
    const m = { nodes, edges, rows: [], seed, floor, zone: Z.id };
    for (let r = 0; r <= maxD; r++) m.rows.push(nodes.filter(n => n.row === r).map(n => n.id));
    const N = nodes, bossN = N[idx.get(g.boss)];
    if (bossN.row < 5 || N.length < 12) return null;
    // 우두머리 말고 나갈 길이 없는 방이 있으면 안 된다 (되돌아가기 없음)
    if (N.some(n => n !== bossN && !outs(m, n.id).length)) return null;
    N[0].type = 'start'; bossN.type = 'boss';
    for (const e of ins(m, bossN.id)) N[e.a].type = N[e.a].id === 0 ? 'start' : 'camp';
    const mid = N.filter(n => n.type === 'fight' && n.id !== 0);
    for (const n of mid) { const u = rng(); const T = Z.rooms; n.type = n.row <= 1 ? (u < T.near ? 'event' : 'fight') : u < T.event ? 'event' : u < T.event + T.elite && n.row >= 3 ? 'elite' : 'fight'; }
    const shopC = mid.filter(n => n.row >= 2 && n.row <= Math.max(3, maxD - 2)); if (!shopC.length) return null; RUN.pick(rng, shopC).type = 'shop';
    if (!mid.some(n => n.type === 'elite')) { const c = mid.filter(n => n.row >= 3 && n.type !== 'shop'); if (!c.length) return null; RUN.pick(rng, c).type = 'elite'; }
    let treasure = null;
    for (const n of RUN.shuffle(rng, mid.filter(n => n.row >= 2 && n.type !== 'shop' && n.type !== 'elite'))) if (ins(m, n.id).every(e => outs(m, e.a).some(o => o.b !== n.id))) { treasure = n; break; }
    if (!treasure) return null;
    treasure.type = 'treasure'; ins(m, treasure.id).forEach(e => { e.kind = 'locked'; });
    // 갈림길 대비 (DESIGN.md 178): 갈림길마다 한쪽은 위험하지만 얻는 게 많고(정예 · 대규모 무리), 다른 쪽은 수월하게(사건 · 소규모 무리).
    // 그래야 정찰 · 점술로 얻은 정보가 고르는 길을 바꾼다
    const free = n => n.type === 'fight' || n.type === 'event' || n.type === 'elite';
    for (const n of RUN.shuffle(rng, N)) {
      const ts = [...new Set(outs(m, n.id).map(e => e.b))].map(id => N[id]).filter(free);
      if (ts.length < 2) continue;
      const [a, b] = RUN.shuffle(rng, ts);
      if (ts.some(t => t.type === 'elite')) continue;              // 이미 위험한 쪽이 있다
      const elites = N.filter(x => x.type === 'elite').length;
      if (a.row >= 3 && elites < 2 && rng() < 0.4) { a.type = 'elite'; a.tier = null; } else { a.type = 'fight'; a.tier = 'heavy'; }
      if (rng() < 0.5) { b.type = 'event'; b.tier = null; } else { b.type = 'fight'; b.tier = 'light'; }
    }
    // 숨은 통로: 고리 복도 하나 (나가는 길이 따로 있고, 들어가는 방은 다른 길로도 갈 수 있을 때)
    const hid = RUN.shuffle(rng, edges.filter(e => e.kind === 'open' && N[e.b] !== treasure && outs(m, e.a).filter(o => o !== e && keyless(o)).length && ins(m, e.b).length > 1)).sort((a, b) => b.loop - a.loop)[0];
    if (!hid) return null; hid.kind = 'hidden';
    const opens = () => RUN.shuffle(rng, edges.filter(e => e.kind === 'open' && N[e.b].type !== 'boss' && e.a !== 0));
    opens().slice(0, Z.paths.trap).forEach(e => { e.kind = 'trap'; });
    opens().slice(0, Z.paths.dark).forEach(e => { e.kind = 'dark'; });
    { let k = Z.paths.locked; for (const e of opens()) { if (k <= 0) break; if (outs(m, e.a).filter(o => o !== e && keyless(o)).length) { e.kind = 'locked'; k--; } } }
    const evs = RUN.shuffle(rng, RUN.EVENTS.filter(e => !e.rare).map(e => e.id).filter(id => !Z.events || Z.events.includes(id))); let ei = 0;
    for (const n of N) {
      if (n.type === 'fight' || n.type === 'elite' || n.type === 'boss') { n.g = group(rng, n.type, n.tier, Z, fi, n.size === 'small', n.row / maxD); n.hostile = true; n.dc = n.type === 'fight' ? 12 : n.type === 'elite' ? 14 : 15; }
      else { n.hostile = false; if (n.type === 'event') n.ev = evs[ei++ % evs.length]; }
    }
    // 방 장식: 종류에 맞춰
    const rm = id => room[id];
    rm(0).decor.push({ k: 'stairs', x: rm(0).x + 1, y: rm(0).y + 1 });
    rm(bossN.id).decor.push({ k: 'stairs', x: rm(bossN.id).x + Math.floor(rm(bossN.id).w / 2) - 1, y: rm(bossN.id).y + 1 });
    for (const n of N) { const r = rm(n.id), c = r.cells[Math.floor(r.cells.length / 2)]; if (n.type === 'event' && rng() < 0.7) r.decor.push({ k: 'altar', x: c[0], y: c[1] }); if (n.type === 'treasure') r.decor.push({ k: 'chest', x: c[0], y: c[1] }); }
    // 소품 (잔해 · 상자 · 통 · 뼈 · 석상 · 깔개 …): 문 곁은 비우고 안쪽 칸에 흩어 놓는다
    const FURN = Z.furn;
    const doorCells = new Set(); for (const e of edges) { const c = cor[e.id]; doorCells.add(c.doorA.join(',')); doorCells.add(c.doorB.join(',')); }
    for (const n of N) {
      const r = room[n.id], set = new Set(r.cells.map(c => c.join(','))), taken = new Set(r.decor.map(o => o.x + ',' + o.y));
      const nearDoor = (x, y) => D8.some(([dx, dy]) => doorCells.has((x + dx) + ',' + (y + dy))) || doorCells.has(x + ',' + y);
      const inner = RUN.shuffle(rng, r.cells.filter(([x, y]) => D4.every(([dx, dy]) => set.has((x + dx) + ',' + (y + dy))) && !taken.has(x + ',' + y) && !nearDoor(x, y) && !D8.some(([dx, dy]) => taken.has((x + dx) + ',' + (y + dy)))));
      const k = inner.length >= 15 ? 3 + Math.floor(rng() * 3) : inner.length >= 4 ? 1 + Math.floor(rng() * 2) : 0, pool = FURN[n.type] || FURN.fight;
      for (let i = 0; i < k && i < inner.length; i++) { const [x, y] = inner[i]; if (D8.some(([dx, dy]) => taken.has((x + dx) + ',' + (y + dy)))) continue; r.decor.push({ k: RUN.pick(rng, pool), x, y, r: rng() }); taken.add(x + ',' + y); }
    }
    for (const e of edges) { const c = cor[e.id]; c.decor = []; if (c.cells.length >= 5 && rng() < 0.3) { const cl = c.cells[1 + Math.floor(rng() * (c.cells.length - 2))]; c.decor.push({ k: 'debris', x: cl[0], y: cl[1] }); } }
    if (N.some(n => n.type !== 'boss' && !outs(m, n.id).some(keyless))) return null;
    if (!path(m) || !path(m, n => n.type === 'elite')) return null;
    for (const e of edges) { e.seen = {}; e.opened = false; e.walked = false; }
    // 캔버스 → 실제 지도: 돌리기(앞 = 오른쪽) · 뒤집기
    const W = F.rot ? F.ch : F.cw, H = F.rot ? F.cw : F.ch;
    const tf = ([x, y]) => { let X = F.rot ? F.ch - 1 - y : x, Y = F.rot ? x : y; if (F.flip) X = W - 1 - X; return [X, Y]; };
    const tp = o => { const [X, Y] = tf([o.x, o.y]); return { ...o, x: X, y: Y }; };
    for (const id in room) { const r = room[id], cells = r.cells.map(tf), xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
      const x = Math.min(...xs), y = Math.min(...ys); room[id] = { ...r, cells, x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1, decor: r.decor.map(tp) }; }
    for (const id in cor) { const c = cor[id]; cor[id] = { cells: c.cells.map(tf), doorA: tf(c.doorA), doorB: tf(c.doorB), doorAout: tf(c.doorAout), doorBout: tf(c.doorBout), decor: (c.decor || []).map(tp) }; }
    // 양피지를 던전이 있는 곳에 맞춰 자른다 (가장자리 4칸, 위는 제목 띠 자리로 2칸 더)
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const grow1 = ([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const id in room) room[id].cells.forEach(grow1); for (const id in cor) cor[id].cells.forEach(grow1);
    const ox = x0 - 4, oy = y0 - 6, sh = ([x, y]) => [x - ox, y - oy], shp = o => ({ ...o, x: o.x - ox, y: o.y - oy });
    for (const id in room) { const r = room[id]; room[id] = { ...r, cells: r.cells.map(sh), x: r.x - ox, y: r.y - oy, decor: r.decor.map(shp) }; }
    for (const id in cor) { const c = cor[id]; cor[id] = { cells: c.cells.map(sh), doorA: sh(c.doorA), doorB: sh(c.doorB), doorAout: sh(c.doorAout), doorBout: sh(c.doorBout), decor: c.decor.map(shp) }; }
    m._lay = { COLS: x1 - ox + 5, ROWS: y1 - oy + 5, room, cor, frame: F.n };
    return m;
  }

  // 드문 사건 (rare = 층마다 나올 확률): 지도가 선 뒤에 따로 굴려, 사건 방 하나를 바꿔 놓는다 (지도 자체는 그대로)
  function rares(m, seed) {
    const rng = RUN.rng(seed * 31 + 7), evs = m.nodes.filter(n => n.type === 'event');
    for (const e of RUN.EVENTS) if (e.rare && evs.length && rng() < e.rare) evs[Math.floor(rng() * evs.length)].ev = e.id;
    return m;
  }
  const make = (seed, floor = 1) => {
    const F = frameOf(seed);
    for (let k = 0; k < 300; k++) { const m = build(seed * 7919 + k, F, floor); if (m) return rares(m, seed); }
    for (let k = 0; k < 300; k++) { const m = build(seed * 7919 + k, FRAMES.tall(RUN.rng(seed)), floor); if (m) return rares(m, seed); }  // 윤곽이 너무 좁으면 세로형으로
    throw new Error('지도를 만들지 못했다');
  };
  return { make, outs, ins, keyless, path, ROWS: ROWS_GRAPH, FRAMES };
})();
