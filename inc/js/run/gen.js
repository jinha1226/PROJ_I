'use strict';
// 한 막의 지도 만들기 (ROGUELIKE_PLAN 4-2 · 4-3 · 2-1의 6번):
// 갈림길 그래프 → 방 종류 → 길 종류. 층마다 꼭 들어갈 구조(봉인된 보물 방 · 숨은 지름길 · 피할 수 있는 정예)를 넣고,
// 모든 방에 열쇠 없이 나갈 길이 하나는 있게 한다.
RUN.gen = (() => {
  const ROWS = 8;                      // 0 입구 · 1~5 · 6 야영 · 7 우두머리
  const KEYLESS = { open: 1, trap: 1, dark: 1 };
  const keyless = e => !!KEYLESS[e.kind];

  function graph(rng) {
    const nodes = [], edges = [], rows = [];
    for (let r = 0; r < ROWS; r++) {
      const w = r === 0 || r === ROWS - 1 ? 1 : r === ROWS - 2 ? 2 : 2 + Math.floor(rng() * 3);
      const row = [];
      for (let i = 0; i < w; i++) {
        const x = w === 1 ? 0.5 : (i + 0.5) / w + (rng() - 0.5) * 0.08;
        const n = { id: nodes.length, row: r, idx: i, x, type: 'fight', size: 'small', info: 0, notes: [] };
        nodes.push(n); row.push(n);
      }
      rows.push(row);
    }
    const has = (a, b) => edges.some(e => e.a === a && e.b === b);
    const add = (a, b, kind = 'open') => { const e = { id: edges.length, a, b, kind }; edges.push(e); return e; };
    for (let r = 0; r < ROWS - 1; r++) {
      const A = rows[r], B = rows[r + 1], pairs = [];
      const cross = (i, j) => pairs.some(([k, l]) => (i < k && j > l) || (i > k && j < l));
      const put = (i, j) => { if (j < 0 || j >= B.length || pairs.some(p => p[0] === i && p[1] === j) || cross(i, j)) return false; pairs.push([i, j]); return true; };
      if (A.length === 1 || B.length === 1) { for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) put(i, j); }
      else {
        for (let i = 0; i < A.length; i++) {
          const base = Math.round(i * (B.length - 1) / (A.length - 1)); put(i, base);
          if (rng() < 0.45) put(i, base + 1);
          if (rng() < 0.3) put(i, base - 1);
        }
        for (let j = 0; j < B.length; j++) if (!pairs.some(p => p[1] === j)) {
          const i0 = Math.round(j * (A.length - 1) / (B.length - 1));
          put(i0, j) || put(i0 - 1, j) || put(i0 + 1, j) || pairs.push([i0, j]);
        }
        for (let i = 0; i < A.length; i++) if (!pairs.some(p => p[0] === i)) {
          const j0 = Math.round(i * (B.length - 1) / (A.length - 1)); put(i, j0) || pairs.push([i, j0]);
        }
      }
      for (const [i, j] of pairs) if (!has(A[i].id, B[j].id)) add(A[i].id, B[j].id);
    }
    return { nodes, edges, rows, add };
  }

  const outs = (m, id) => m.edges.filter(e => e.a === id);
  const ins = (m, id) => m.edges.filter(e => e.b === id);
  // 열쇠 없이 (그리고 avoid에 걸리지 않고) 입구에서 우두머리까지 갈 수 있나
  function path(m, avoid = () => false) {
    const goal = m.nodes.find(n => n.type === 'boss').id, seen = new Set([0]), q = [0];
    while (q.length) {
      const id = q.shift(); if (id === goal) return true;
      for (const e of outs(m, id)) if (keyless(e) && !seen.has(e.b) && !avoid(m.nodes[e.b])) { seen.add(e.b); q.push(e.b); }
    }
    return false;
  }

  function group(rng, type) {
    const famKey = RUN.pick(rng, Object.keys(RUN.FAMS)), fam = RUN.FAMS[famKey];
    if (type === 'boss') return { fam: RUN.BOSS.fam, name: RUN.BOSS.n, count: 1, d: RUN.BOSS.d, label: RUN.BOSS.n };
    if (type === 'elite') {
      const [n, per, c, ex] = fam.elite, xc = ex[2] + Math.floor(rng() * 2);
      return { fam: famKey, name: n, count: c + xc, d: per * c + ex[1] * xc, label: `${n}${c > 1 ? ` ${c}` : ''} · ${ex[0]} ${xc}` };
    }
    const [n, per, [lo, hi]] = RUN.pick(rng, fam.fight), c = lo + Math.floor(rng() * (hi - lo + 1));
    return { fam: famKey, name: n, count: c, d: per * c, label: `${n} ${c}` };
  }

  function build(seed) {
    const rng = RUN.rng(seed), m = graph(rng), N = m.nodes, last = ROWS - 1;
    N[0].type = 'start'; N[0].size = 'small';
    m.rows[last][0].type = 'boss'; m.rows[last - 1].forEach(n => { n.type = 'camp'; });
    const mid = N.filter(n => n.row >= 1 && n.row <= 5);
    for (const n of mid) {
      const u = rng();
      n.type = n.row === 1 ? (u < 0.6 ? 'fight' : 'event') : u < 0.45 ? 'fight' : u < 0.75 ? 'event' : u < 0.9 && n.row >= 3 ? 'elite' : 'fight';
    }
    // 상인 하나 (2~4줄)
    const shopAt = RUN.pick(rng, mid.filter(n => n.row >= 2 && n.row <= 4)); shopAt.type = 'shop';
    // 정예가 하나는 있어야 한다 (3~5줄)
    if (!mid.some(n => n.type === 'elite')) { const c = mid.filter(n => n.row >= 3 && n.type !== 'shop'); if (c.length) RUN.pick(rng, c).type = 'elite'; }
    // 봉인된 보물 방: 들어오는 길이 모두 잠겨 있다. 들어오는 쪽 방에는 다른 길이 있어야 한다
    const tCand = RUN.shuffle(rng, mid.filter(n => n.row >= 3 && n.type !== 'shop' && n.type !== 'elite'));
    let treasure = null;
    for (const n of tCand) if (ins(m, n.id).every(e => outs(m, e.a).some(o => o.b !== n.id))) { treasure = n; break; }
    if (!treasure) return null;
    treasure.type = 'treasure'; ins(m, treasure.id).forEach(e => { e.kind = 'locked'; });
    // 숨은 지름길: 한 줄을 건너뛴다 (보물 방으로는 아니다)
    const sc = RUN.shuffle(rng, N.filter(n => n.row >= 1 && n.row <= 4));
    let shortcut = null;
    for (const u of sc) {
      const vs = m.rows[u.row + 2].filter(v => v !== treasure && Math.abs(v.x - u.x) < 0.4 && !m.edges.some(e => e.a === u.id && e.b === v.id));
      if (vs.length) { shortcut = m.add(u.id, RUN.pick(rng, vs).id, 'hidden'); break; }
    }
    if (!shortcut) return null;
    // 함정 셋 · 어두운 길 둘 · 잠긴 문 하나 더
    const opens = () => RUN.shuffle(rng, m.edges.filter(e => e.kind === 'open' && N[e.b].type !== 'boss' && e.a !== 0));
    opens().slice(0, 3).forEach(e => { e.kind = 'trap'; });
    opens().slice(0, 2).forEach(e => { e.kind = 'dark'; });
    for (const e of opens()) if (outs(m, e.a).filter(o => o !== e && keyless(o)).length) { e.kind = 'locked'; break; }
    // 방 내용
    const evs = RUN.shuffle(rng, RUN.EVENTS.map(e => e.id)); let ei = 0;
    for (const n of N) {
      if (n.type === 'fight' || n.type === 'elite' || n.type === 'boss') {
        n.g = group(rng, n.type); n.hostile = true; n.dc = n.type === 'fight' ? 12 : n.type === 'elite' ? 14 : 15;
        n.size = n.type === 'boss' ? 'large' : n.type === 'elite' ? (rng() < 0.75 ? 'large' : 'small') : rng() < 0.5 ? 'large' : 'small';
      } else {
        n.hostile = false; n.size = rng() < 0.5 ? 'large' : 'small';
        if (n.type === 'event') n.ev = evs[ei++ % evs.length];
      }
    }
    // 검사: 모든 방에 열쇠 없이 나갈 길 · 열쇠 없이 끝까지 · 정예를 피해서도 끝까지
    if (N.some(n => n.type !== 'boss' && !outs(m, n.id).some(keyless))) return null;
    if (!path(m) || !path(m, n => n.type === 'elite')) return null;
    for (const e of m.edges) { e.seen = {}; e.opened = false; e.walked = false; }
    return { nodes: N, edges: m.edges, rows: m.rows.map(r => r.map(n => n.id)), seed };
  }

  // 시드가 맞지 않으면 다음 시드로 (같은 시드 = 같은 지도)
  const make = seed => { for (let k = 0; k < 200; k++) { const m = build(seed * 7919 + k); if (m) return m; } throw new Error('지도를 만들지 못했다'); };
  return { make, outs, ins, keyless, path, ROWS };
})();
