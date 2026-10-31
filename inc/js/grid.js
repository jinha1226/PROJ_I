'use strict';
// 2D 격자 맵: ASCII 맵 읽기, 던전 생성, BFS 거리장, 엔티티 이동
// 맵 = { w, h, c: 지형 문자 배열, pass: 문자 → 걸을 수 있나, poi: { 문자: [[x, y], ...] }, ver }
G.Grid = {
  fromAscii(rows, passChars) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = new Array(w * h).fill(' '), poi = {};
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x] || ' ';
      c[y * w + x] = ch;
      (poi[ch] = poi[ch] || []).push([x, y]);
    }
    return { w, h, c, poi, passChars, ver: 1, dist: {} };
  },
  at: (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? ' ' : m.c[y * m.w + x]),
  pass: (m, x, y) => m.passChars.includes(G.Grid.at(m, x, y)),

  // 방과 복도로 된 던전 (DESIGN.md 37). '#' 벽, '.' 바닥, '>' 계단.
  // 영역 분할(BSP): 맵을 maxRooms개 구역으로 나누고 구역마다 큰 방 하나 → 가까운 방끼리 최소 신장 트리로 짧게 잇고, loops개를 더 이어 갈림길.
  // 시작 방은 가장 왼쪽, 계단 방은 시작에서 길로 가장 먼 방. rooms[0] = 시작, rooms[끝] = 계단.
  // rng: 0~1 난수 함수 — 시즌 씨앗값으로 주면 같은 시즌의 같은 층은 늘 같은 모양 (G.Season)
  dungeon(w, h, maxRooms = 9, loops = 0, rng = Math.random) {
    const rand = n => Math.floor(rng() * n), c = new Array(w * h).fill('#'), MINW = 10, MINH = 8;
    // 구역 나누기: 가장 넓은 구역을 긴 쪽으로 40~60% 자리에서 자른다
    const leaves = [{ x: 1, y: 1, w: w - 2, h: h - 2 }];
    for (let guard = 0; leaves.length < maxRooms && guard < 200; guard++) {
      leaves.sort((p, q) => q.w * q.h - p.w * p.h);
      const L = leaves.find(l => l.w >= MINW * 2 || l.h >= MINH * 2);
      if (!L) break;
      leaves.splice(leaves.indexOf(L), 1);
      const vert = L.w / MINW >= L.h / MINH ? L.w >= MINW * 2 : !(L.h >= MINH * 2);
      if (vert) { const cut = Math.floor(L.w * (0.4 + rng() * 0.2)); leaves.push({ x: L.x, y: L.y, w: cut, h: L.h }, { x: L.x + cut, y: L.y, w: L.w - cut, h: L.h }); }
      else { const cut = Math.floor(L.h * (0.4 + rng() * 0.2)); leaves.push({ x: L.x, y: L.y, w: L.w, h: cut }, { x: L.x, y: L.y + cut, w: L.w, h: L.h - cut }); }
    }
    // 구역마다 방 하나: 구역의 60~85% 크기 (방 사이에 짧은 복도가 남게)
    const rooms = leaves.map(L => {
      const rw = Math.max(5, Math.min(L.w - 2, Math.floor(L.w * (0.6 + rng() * 0.25)))), rh = Math.max(4, Math.min(L.h - 2, Math.floor(L.h * (0.6 + rng() * 0.25))));
      const x = L.x + 1 + rand(Math.max(1, L.w - rw - 1)), y = L.y + 1 + rand(Math.max(1, L.h - rh - 1));
      for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) c[yy * w + xx] = '.';
      return { x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1) };
    });
    const dig = (x, y) => { c[y * w + x] = '.'; };
    const link = (a, b) => {
      if (rng() < 0.5) { for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) dig(x, a.cy); for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) dig(b.cx, y); }
      else { for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) dig(a.cx, y); for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) dig(x, b.cy); }
    };
    // 최소 신장 트리 (방 중심 거리) → 복도가 짧다
    const d2 = (a, b) => (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2, inT = new Set([0]), edges = new Set();
    while (inT.size < rooms.length) {
      let best = null;
      for (const i of inT) for (let j = 0; j < rooms.length; j++) if (!inT.has(j) && (!best || d2(rooms[i], rooms[j]) < best[2])) best = [i, j, d2(rooms[i], rooms[j])];
      inT.add(best[1]); edges.add(best[0] + ',' + best[1]); link(rooms[best[0]], rooms[best[1]]);
    }
    // 갈림길: 트리에 없는 가까운 짝 몇 개를 더 잇는다
    const extra = [];
    for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) if (!edges.has(i + ',' + j) && !edges.has(j + ',' + i)) extra.push([i, j, d2(rooms[i], rooms[j])]);
    extra.sort((p, q) => p[2] - q[2]);
    for (const [i, j] of extra.slice(0, loops * 2).filter(() => rng() < 0.5).slice(0, loops)) link(rooms[i], rooms[j]);
    const m = { w, h, c, poi: {}, passChars: '.>', ver: 1, dist: {}, rooms };
    // 시작 = 가장 왼쪽 방, 계단 = 시작에서 길로 가장 먼 방
    rooms.sort((p, q) => p.cx - q.cx);
    const start = rooms[0], d = G.Grid.field(m, start.cx, start.cy);
    const end = rooms.slice(1).reduce((p, q) => (d[q.cy * w + q.cx] > d[p.cy * w + p.cx] ? q : p), rooms[1] || start);
    m.rooms = [start, ...rooms.filter(r => r !== start && r !== end), end];
    m.dist = {};
    m.start = start;
    m.end = end;
    c[end.cy * w + end.cx] = '>';
    return m;
  },

  // tx, ty에서 퍼지는 BFS 거리장 (맵 버전과 함께 캐시)
  field(m, tx, ty) {
    const key = tx + ',' + ty;
    const hit = m.dist[key];
    if (hit && hit.ver === m.ver) return hit.d;
    const d = new Int16Array(m.w * m.h).fill(-1), q = [tx + ty * m.w];
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return d;
    d[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], x = i % m.w, y = (i / m.w) | 0;
      for (const [dx, dy] of G.Grid.DIR) {
        const nx = x + dx, ny = y + dy, ni = nx + ny * m.w;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || d[ni] >= 0 || !G.Grid.pass(m, nx, ny)) continue;
        // 대각선은 양옆이 모두 뚫려 있어야 한다
        if (dx && dy && (!G.Grid.pass(m, x + dx, y) || !G.Grid.pass(m, x, y + dy))) continue;
        d[ni] = d[i] + 1;
        q.push(ni);
      }
    }
    const keys = Object.keys(m.dist);
    if (keys.length > 60) delete m.dist[keys[0]];
    m.dist[key] = { ver: m.ver, d };
    return d;
  },
  // 씨앗값 → 0~1 난수 함수 (mulberry32). 같은 씨앗이면 같은 줄
  seeded(seed) {
    let t = seed >>> 0;
    return () => { t = (t + 0x6D2B79F5) >>> 0; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  },
  DIR: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],

  // 시야선: 두 칸 사이(끝 칸 제외)가 모두 뚫려 있나. 대각선으로 넘어갈 때 양옆이 다 벽이면 막힌다 (모서리 너머로 못 본다).
  los(m, x0, y0, x1, y1) {
    let x = Math.round(x0), y = Math.round(y0);
    const tx = Math.round(x1), ty = Math.round(y1), dx = Math.abs(tx - x), dy = -Math.abs(ty - y), sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1;
    let err = dx + dy;
    while (x !== tx || y !== ty) {
      const e2 = 2 * err, px = x, py = y;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
      if (x !== px && y !== py && !G.Grid.pass(m, x, py) && !G.Grid.pass(m, px, y)) return false;
      if ((x !== tx || y !== ty) && !G.Grid.pass(m, x, y)) return false;
    }
    return true;
  },

  // 엔티티 e(x, y는 칸 중심 기준 실수 좌표)를 목표 칸 쪽으로 speed만큼 옮긴다. 도착하면 true.
  moveTo(m, e, tx, ty, speed, dt, stopAt = 0.05) {
    const dx0 = tx - e.x, dy0 = ty - e.y, dd = Math.hypot(dx0, dy0);
    if (dd <= stopAt) return true;
    let gx = tx, gy = ty;
    const cx = Math.round(e.x), cy = Math.round(e.y), txi = Math.round(tx), tyi = Math.round(ty);
    if (dd > 1.5 && (cx !== txi || cy !== tyi)) {
      const d = G.Grid.field(m, txi, tyi);
      let best = d[cx + cy * m.w], bx = cx, by = cy;
      if (best < 0) best = 1e9;
      for (const [ddx, ddy] of G.Grid.DIR) {
        const nx = cx + ddx, ny = cy + ddy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const v = d[nx + ny * m.w];
        if (v >= 0 && v < best) { best = v; bx = nx; by = ny; }
      }
      gx = bx; gy = by;
      // 이미 그 칸 중심에 있다면 목표로 곧장
      if (bx === cx && by === cy) { gx = tx; gy = ty; }
    }
    const vx = gx - e.x, vy = gy - e.y, l = Math.hypot(vx, vy) || 1, step = Math.min(l, speed * dt);
    e.x += vx / l * step;
    e.y += vy / l * step;
    if (Math.abs(vx) > 0.01) e.flip = vx < 0;
    e.moving = true;
    return Math.hypot(tx - e.x, ty - e.y) <= stopAt;
  },
  // 0x72 자동 타일 벽: 이웃 8칸이 벽인지로 47가지 마스크 (Godot 3x3 minimal과 같은 비트)
  // N1 E2 S4 W8, 대각선 NE16 SE32 SW64 NW128은 양옆 두 칸이 모두 벽일 때만 센다.
  blob(x, y, wall) {
    const n = wall(x, y - 1), e = wall(x + 1, y), s = wall(x, y + 1), w = wall(x - 1, y);
    return (n ? 1 : 0) | (e ? 2 : 0) | (s ? 4 : 0) | (w ? 8 : 0) | (n && e && wall(x + 1, y - 1) ? 16 : 0) | (s && e && wall(x + 1, y + 1) ? 32 : 0)
      | (s && w && wall(x - 1, y + 1) ? 64 : 0) | (n && w && wall(x - 1, y - 1) ? 128 : 0);
  },
  // 0x72식 벽 조각 고르기: 아래가 트였으면 앞면, 아니면 속(어두움) 위에 트인 쪽마다 테두리,
  // 앞면 바로 위 칸에는 앞면의 윗단. wall(x, y)·open(x, y)는 맵마다 다르다. 키는 <pre><조각><suf>.
  // cap이면 마을 벽: 윗면을 재질로 채우고(빈 어둠 대신) 트인 쪽에 가장자리 선
  wallKeys(x, y, wall, open, pre, suf = '', cap = false) {
    if (open(x, y + 1)) return [pre + 'wface' + suf];
    if (cap) {
      const L = [pre + 'cap' + suf];
      if (wall(x, y + 1) && open(x, y + 2)) L.push(pre + 'cS' + suf);
      for (const [sd, dx, dy] of [['N', 0, -1], ['E', 1, 0], ['W', -1, 0]]) if (open(x + dx, y + dy)) L.push(pre + 'o' + sd + suf);
      return L;
    }
    const face = wall(x, y + 1) && open(x, y + 2);
    if (!face && !G.Grid.DIR.some(([dx, dy]) => open(x + dx, y + dy))) return null;
    const L = [pre + 'wdark' + suf];
    if (face) L.push(pre + 'cS' + suf);
    if (open(x, y - 1)) L.push(pre + 'cN' + suf);
    if (open(x + 1, y)) L.push(pre + 'cE' + suf);
    if (open(x - 1, y)) L.push(pre + 'cW' + suf);
    return L;
  },
  // 걸을 수 있는 무작위 칸 (조건 함수 선택)
  randomCell(m, ok) {
    for (let i = 0; i < 400; i++) {
      const x = G.U.rand(m.w), y = G.U.rand(m.h);
      if (G.Grid.pass(m, x, y) && (!ok || ok(x, y))) return [x, y];
    }
    return null;
  },
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
};

// 맵 효과(그리기 전용). 오프라인 계산 중에는 쌓지 않는다.
G.fx = function (rt, o) {
  if (G.quiet || !rt.fx || rt.fx.length > 120) return;
  o.max = o.t;
  rt.fx.push(o);
};
G.fxTick = function (rt, dt) {
  if (!rt.fx || !rt.fx.length) return;
  for (const f of rt.fx) f.t -= dt;
  rt.fx = rt.fx.filter(f => f.t > 0);
};
