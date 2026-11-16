'use strict';
// 갈림길 그래프를 칸 지도로 펴기 (ROGUELIKE_PLAN 4-2): 옛 던전 지도처럼 방 · 복도가 칸에 맞춰 붙어 있다.
// 줄마다 띠(BAND칸)를 하나씩 쓴다. 띠 위 두 칸은 복도가 가로로 지나는 길, 아래는 방 자리(방은 띠 바닥에 붙는다).
// 그래서 가로 복도는 방을 뚫지 않고, 세로 복도는 자기 방 폭 안에서만 오르내린다.
RUN.layout = (() => {
  const COLS = 27, BAND = 8, LANES = 2;
  function make(map) {
    if (map._lay) return map._lay;
    const N = map.nodes, R = RUN.gen.ROWS, rows = R * BAND + 1;
    const rng = RUN.rng(map.seed * 31 + 7);
    const band = r => (R - 1 - r) * BAND + 1;           // 그 줄 띠의 맨 윗칸
    const room = {};
    for (const ids of map.rows) {
      const ns = ids.map(id => N[id]).sort((a, b) => a.x - b.x), crowd = ns.length >= 4;
      const boxes = ns.map(n => {
        let w, h;
        if (n.type === 'boss') { w = 9; h = 6; } else if (n.type === 'start') { w = 4; h = 3; }
        else if (n.size === 'large') { w = crowd ? 5 : 7; h = 4 + (rng() < 0.5 ? 1 : 0); } else { w = crowd ? 4 : 5; h = 3; }
        const y1 = band(n.row) + BAND - 1, y0 = y1 - h + 1;  // 띠 바닥에 붙인다
        const x = Math.round(n.x * COLS - w / 2) + Math.round((rng() - 0.5) * 2);
        return { n, x: Math.max(1, Math.min(COLS - w - 1, x)), y: y0, w, h };
      });
      // 겹치면 오른쪽으로 밀고, 넘치면 왼쪽으로 당긴다 (사이 한 칸 이상)
      for (let i = 1; i < boxes.length; i++) if (boxes[i].x < boxes[i - 1].x + boxes[i - 1].w + 1) boxes[i].x = boxes[i - 1].x + boxes[i - 1].w + 1;
      for (let i = boxes.length - 1; i >= 0; i--) { const lim = i === boxes.length - 1 ? COLS - 1 : boxes[i + 1].x - 1; if (boxes[i].x + boxes[i].w > lim) boxes[i].x = lim - boxes[i].w; }
      for (const b of boxes) room[b.n.id] = b;
    }
    // 복도: 아래 방의 윗벽 문 → 위로 → 가로 길 → 위 방의 아랫벽 문
    const cor = {};
    const clampIn = (b, c) => Math.max(b.x + 1, Math.min(b.x + b.w - 2, c));
    for (const e of map.edges) {
      const A = room[e.a], B = room[e.b];
      if (e.kind === 'hidden') { cor[e.id] = { hidden: true, a: A, b: B }; continue; }
      const ax = clampIn(A, Math.round(B.x + B.w / 2)), bx = clampIn(B, Math.round(A.x + A.w / 2));
      const lane = band(N[e.a].row) + (e.id % LANES);     // 아래 방 띠의 위 두 칸 중 하나
      const cells = [];
      for (let y = A.y - 1; y >= lane; y--) cells.push([ax, y]);
      const s = ax < bx ? 1 : -1; for (let x = ax + s; s > 0 ? x <= bx : x >= bx; x += s) cells.push([x, lane]);
      for (let y = lane - 1; y > B.y + B.h - 1; y--) cells.push([bx, y]);
      cor[e.id] = { cells, doorA: [ax, A.y], doorB: [bx, B.y + B.h - 1], lane };
    }
    return (map._lay = { COLS, ROWS: rows, room, cor });
  }
  return { make };
})();
