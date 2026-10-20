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

  // 방과 복도로 된 던전. '#' 벽, '.' 바닥. 방 목록과 시작·계단 방을 함께 준다.
  dungeon(w, h) {
    const U = G.U, c = new Array(w * h).fill('#'), rooms = [];
    for (let tries = 0; tries < 80 && rooms.length < 9; tries++) {
      const rw = 5 + U.rand(5), rh = 4 + U.rand(3);
      const x = 1 + U.rand(w - rw - 2), y = 1 + U.rand(h - rh - 2);
      if (rooms.some(r => x < r.x + r.w + 1 && x + rw + 1 > r.x && y < r.y + r.h + 1 && y + rh + 1 > r.y)) continue;
      rooms.push({ x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1) });
      for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) c[yy * w + xx] = '.';
    }
    const dig = (x, y) => { c[y * w + x] = '.'; };
    // 방을 x 순으로 이어서 굽은 복도를 판다
    rooms.sort((a, b) => a.cx - b.cx);
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1], b = rooms[i];
      for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) dig(x, a.cy);
      for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) dig(b.cx, y);
    }
    const m = { w, h, c, poi: {}, passChars: '.>', ver: 1, dist: {}, rooms };
    m.start = rooms[0];
    m.end = rooms[rooms.length - 1];
    c[m.end.cy * w + m.end.cx] = '>';
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
  DIR: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],

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
