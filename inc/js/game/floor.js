'use strict';
// 탐사 층 → 쿼터뷰 타일 지도 (화면 없이). 지도 시제품(RUN — js/explore)의 방 칸 · 복도 칸을 K배로 키워 옮긴다.
// 출구 목록 · 길 찾기도 여기서 — 화면 쪽(js/app/crawl.js)은 이 결과를 그리고 누른 곳을 넘길 뿐이다.
// 좌표: 타일 i는 좌표 i 가운데 (그리는 쪽과 같게).
G.Floor = (() => {
  const K = 3; // 지도 1칸 = 쿼터뷰 타일 3×3 (2026-11-19, 2 → 3: 방이 좁아 움직이지 않고도 다 닿고, 먼저 다가가는 쪽이 손해였다. 이제 방 21~27 × 15~21칸 — 이동 6칸 · 사거리가 뜻을 갖는다)
  const tile = ([x, y]) => [x * K + 0.5, y * K + 0.5];
  const index = (w, x, y) => Math.round(y) * w + Math.round(x);
  // 방 한가운데에 가장 가까운 방 칸 (타일 좌표)
  function centerOf(map, id) {
    const b = map._lay.room[id], mx = b.x + b.w / 2 - 0.5, my = b.y + b.h / 2 - 0.5;
    let best = b.cells[0], bd = 1e9;
    for (const c of b.cells) { const d = (c[0] - mx) ** 2 + (c[1] - my) ** 2; if (d < bd) { bd = d; best = c; } }
    return tile(best);
  }
  // RUN 지도 → { iso: 옛 엔진이 쓰는 타일 지도, roomAt: 타일 → 방 id (복도 · 벽은 -1) }
  function fromRun(map, TYPE = {}) {
    const L = map._lay, W = L.COLS * K, H = L.ROWS * K, c = new Array(W * H).fill('#'), roomAt = new Int16Array(W * H).fill(-1);
    const put = ([x, y], v) => { for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) { const k = (y * K + j) * W + x * K + i; c[k] = '.'; if (v != null && roomAt[k] < 0) roomAt[k] = v; } };
    // 손으로 짠 방(tmap — js/explore/rooms.js)은 타일 그대로: 장애물은 'o'(길 · 시야를 막는다), 물은 '~'(걷지 못하고 시야는 통한다), 나머지는 바닥
    const putT = (r, id) => r.tmap.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === ' ') continue; const k = (r.y * K + j) * W + r.x * K + i; c[k] = RUN.TILE.solid.includes(ch) ? 'o' : ch === '~' ? '~' : '.'; if (roomAt[k] < 0) roomAt[k] = id; } });
    for (const id in L.room) { const r = L.room[id]; if (r.tmap) putT(r, +id); else r.cells.forEach(p => put(p, +id)); }
    for (const id in L.cor) L.cor[id].cells.forEach(p => put(p, null));
    const rooms = map.nodes.map(n => { const b = L.room[n.id], [cx, cy] = centerOf(map, n.id); return { id: n.id, title: TYPE[n.type] || '', x: b.x * K, y: b.y * K, w: b.w * K, h: b.h * K, cx: Math.floor(cx), cy: Math.floor(cy), tags: ['hall'] }; });
    const start = rooms[0], end = rooms.find(r => map.nodes[r.id].type === 'boss') || rooms[rooms.length - 1];
    return { iso: { w: W, h: H, c, kindAt: new Uint8Array(W * H), poi: {}, passChars: '.>,', ver: 1, dist: {}, rooms, start, end, fixed: true, title: `${RUN.zone(map.floor || 1).n} ${map.floor || 1}층` }, roomAt };
  }
  // 방 at의 출구: 닿은 길 전부 (숨은 통로는 찾았을 때만). 거꾸로 가는 길은 a · b를 뒤집어 규칙에 넘긴다 (쓰기는 원래 길에)
  function exits(map, at) {
    const out = [];
    for (const e of map.edges) {
      if (e.a !== at && e.b !== at) continue;
      if (e.kind === 'hidden' && !e.seen.hidden) continue;
      const fwd = e.a === at, c = map._lay.cor[e.id];
      const ed = fwd ? e : new Proxy(e, { get: (t, k) => (k === 'a' ? t.b : k === 'b' ? t.a : t[k]) });
      out.push({ e, ed, to: fwd ? e.b : e.a, door: tile(fwd ? c.doorA : c.doorB), path: (fwd ? c.cells : c.cells.slice().reverse()).map(tile) });
    }
    return out;
  }
  const kindOf = e => (e.kind === 'trap' && !e.seen.trap ? 'open' : e.kind); // 못 찾은 함정은 보통 통로로 보인다
  // 문 너머 한 줄 (아는 만큼)
  const beyond = (n, TYPE = {}) => (n.visited ? (TYPE[n.type] || '방') + ' (가 봄)' : n.info >= 2 ? (n.hostile ? `적 ${n.g ? n.g.label : '있음'}` : TYPE[n.type] || '조용함') : n.info >= 1 ? (n.hostile ? '기척이 있다' : '조용하다') : '모르는 방');
  // 길 찾기: walkable(k)인 타일 위 8방향, 모서리는 깎지 않는다. 돌려주는 것: [[x, y], …] (출발 칸 빼고) 또는 null
  function findPath(W, H, walkable, fx, fy, tx, ty) {
    const s = index(W, fx, fy), g = index(W, tx, ty);
    if (!walkable(g)) return null;
    const prev = new Int32Array(W * H).fill(-1); prev[s] = s; const q = [s];
    for (let h = 0; h < q.length; h++) {
      const k = q[h]; if (k === g) break; const x = k % W, y = (k / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const n = Y * W + X; if (prev[n] >= 0 || !walkable(n)) continue;
        if (dx && dy && (!walkable(y * W + X) || !walkable(Y * W + x))) continue;
        prev[n] = k; q.push(n);
      }
    }
    if (prev[g] < 0) return null;
    const pts = []; for (let k = g; k !== s; k = prev[k]) pts.unshift([k % W, (k / W) | 0]);
    return pts;
  }
  // 판 칸을 바꾼다 (문을 닫으면 '#', 열면 '.'). 길 찾기 기억(G.Grid.field)은 m.ver로 묶여 있어 같이 올려야 한다 —
  // 안 올리면 닫힌 채로 기억한 길이 남아 적이 다가오지 못하고, 보이는 위치는 '길이 없다'며 순간이동한다 (2026-11-18)
  function setTiles(m, ks, ch) { for (const k of ks) m.c[k] = ch; m.ver = (m.ver || 0) + 1; }
  return { K, tile, index, centerOf, fromRun, exits, kindOf, beyond, findPath, setTiles };
})();
