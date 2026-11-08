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
  // 시야를 막지 않나: 깊은 물은 못 건너도 건너다보인다
  clear: (m, x, y) => { const c = G.Grid.at(m, x, y); return c === '~' || m.passChars.includes(c); },

  // 턴제 전용 던전: 방이 적고 크며, 모양이 다르고, 사이에 바위가 두껍고, 복도가 두 칸 (네 명이 지나고 싸울 수 있게).
  // 만드는 법은 Brogue · DCSS처럼 방 모양 어휘를 섞는 쪽. kindAt: 0 보통 · 1 큰 방 · 2 동굴 · 3 복도 (그리는 쪽이 바닥을 고른다)
  halls(w, h, maxRooms = 8, loops = 0, rng = Math.random) {
    const rand = n => Math.floor(rng() * n), c = new Array(w * h).fill('#'), kindAt = new Uint8Array(w * h), MINW = 15, MINH = 11, PAD = 2;
    const leaves = [{ x: 1, y: 1, w: w - 2, h: h - 2 }];
    for (let guard = 0; leaves.length < maxRooms && guard < 200; guard++) {
      leaves.sort((p, q) => q.w * q.h - p.w * p.h);
      const L = leaves.find(l => l.w >= MINW * 2 || l.h >= MINH * 2);
      if (!L) break;
      leaves.splice(leaves.indexOf(L), 1);
      const vert = L.w / MINW >= L.h / MINH ? L.w >= MINW * 2 : !(L.h >= MINH * 2), k = 0.42 + rng() * 0.16;
      if (vert) { const cut = Math.floor(L.w * k); leaves.push({ x: L.x, y: L.y, w: cut, h: L.h }, { x: L.x + cut, y: L.y, w: L.w - cut, h: L.h }); }
      else { const cut = Math.floor(L.h * k); leaves.push({ x: L.x, y: L.y, w: L.w, h: cut }, { x: L.x, y: L.y + cut, w: L.w, h: L.h - cut }); }
    }
    const put = (x, y, k) => { c[y * w + x] = '.'; kindAt[y * w + x] = k; };
    const SHAPES = ['hall', 'round', 'cross', 'cave', 'chamfer'], bag = [];
    const nextShape = () => { if (!bag.length) { const s = SHAPES.slice(); while (s.length) bag.push(s.splice(rand(s.length), 1)[0]); } return bag.pop(); };
    const rooms = leaves.map(L => {
      const aw = L.w - PAD * 2, ah = L.h - PAD * 2, rw = Math.max(7, Math.min(aw, Math.floor(aw * (0.72 + rng() * 0.28)))), rh = Math.max(6, Math.min(ah, Math.floor(ah * (0.72 + rng() * 0.28))));
      const x = L.x + PAD + rand(Math.max(1, aw - rw + 1)), y = L.y + PAD + rand(Math.max(1, ah - rh + 1)), cx = x + (rw >> 1), cy = y + (rh >> 1);
      const shape = nextShape(), r = { x, y, w: rw, h: rh, cx, cy, shape };
      if (shape === 'round') { const a = rw / 2, b = rh / 2; for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) if (((xx + .5 - x - a) / a) ** 2 + ((yy + .5 - y - b) / b) ** 2 <= 1.02) put(xx, yy, 0); }
      else if (shape === 'cross') { const ax = Math.max(3, rw >> 1), ay = Math.max(3, rh >> 1), x0 = cx - (ax >> 1), y0 = cy - (ay >> 1); for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) if ((xx >= x0 && xx < x0 + ax) || (yy >= y0 && yy < y0 + ay)) put(xx, yy, 0); }
      else if (shape === 'cave') {
        // 동굴: 타원에 잡음을 얹고 두 번 다듬은 뒤, 가운데와 이어진 곳만 남긴다
        const a = rw / 2, b = rh / 2; let on = new Uint8Array(rw * rh);
        for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) { const d = ((i + .5 - a) / a) ** 2 + ((j + .5 - b) / b) ** 2; on[j * rw + i] = d < .35 || (d < 1 && rng() < 0.72) ? 1 : 0; }
        for (let n = 0; n < 2; n++) { const o = new Uint8Array(rw * rh); for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) { let s = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) if (i + u >= 0 && j + v >= 0 && i + u < rw && j + v < rh && on[(j + v) * rw + i + u]) s++; o[j * rw + i] = s >= 5 ? 1 : 0; } on = o; }
        on[(cy - y) * rw + cx - x] = 1;
        const seen = new Set([(cy - y) * rw + cx - x]), q = [[cx - x, cy - y]];
        while (q.length) { const [i, j] = q.pop(); for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (j + v) * rw + i + u; if (i + u >= 0 && j + v >= 0 && i + u < rw && j + v < rh && on[k] && !seen.has(k)) { seen.add(k); q.push([i + u, j + v]); } } }
        for (const k of seen) put(x + k % rw, y + Math.floor(k / rw), 2);
      } else {
        const cut = shape === 'chamfer' ? Math.min(3, Math.floor(Math.min(rw, rh) / 3)) : 1;
        for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) { const dx = Math.min(xx - x, x + rw - 1 - xx), dy = Math.min(yy - y, y + rh - 1 - yy); if (dx + dy >= cut) put(xx, yy, shape === 'hall' ? 1 : 0); }
        // 큰 방: 두 줄 기둥 (복도가 지나는 가운데 줄은 비운다)
        if (shape === 'hall' && rw >= 9 && rh >= 7) { const py = [y + 1 + (rh >= 9 ? 1 : 0), y + rh - 2 - (rh >= 9 ? 1 : 0)]; for (const yy of py) for (let xx = x + 2; xx < x + rw - 2; xx += 3) if (Math.abs(xx - cx) > 1 && Math.abs(yy - cy) > 1) { c[yy * w + xx] = '#'; kindAt[yy * w + xx] = 0; } }
      }
      return r;
    });
    const dig2 = (x, y) => { for (let v = 0; v < 2; v++) for (let u = 0; u < 2; u++) { const X = x + u, Y = y + v; if (X > 0 && Y > 0 && X < w - 1 && Y < h - 1 && c[Y * w + X] !== '.') { c[Y * w + X] = '.'; kindAt[Y * w + X] = 3; } } };
    const link = (a, b) => {
      if (rng() < 0.5) { for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) dig2(x, a.cy); for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) dig2(b.cx, y); }
      else { for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) dig2(a.cx, y); for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) dig2(x, b.cy); }
    };
    const d2 = (a, b) => (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2, inT = new Set([0]), edges = new Set();
    while (inT.size < rooms.length) {
      let best = null;
      for (const i of inT) for (let j = 0; j < rooms.length; j++) if (!inT.has(j) && (!best || d2(rooms[i], rooms[j]) < best[2])) best = [i, j, d2(rooms[i], rooms[j])];
      inT.add(best[1]); edges.add(best[0] + ',' + best[1]); link(rooms[best[0]], rooms[best[1]]);
    }
    const extra = [];
    for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) if (!edges.has(i + ',' + j) && !edges.has(j + ',' + i)) extra.push([i, j, d2(rooms[i], rooms[j])]);
    extra.sort((p, q) => p[2] - q[2]);
    for (const [i, j] of extra.slice(0, loops * 2).filter(() => rng() < 0.5).slice(0, loops)) link(rooms[i], rooms[j]);
    const m = { w, h, c, kindAt, poi: {}, passChars: '.>', ver: 1, dist: {}, rooms };
    rooms.sort((p, q) => p.cx - q.cx);
    const start = rooms[0], d = G.Grid.field(m, start.cx, start.cy);
    const end = rooms.slice(1).reduce((p, q) => (d[q.cy * w + q.cx] > d[p.cy * w + p.cx] ? q : p), rooms[1] || start);
    m.rooms = [start, ...rooms.filter(r => r !== start && r !== end), end];
    m.dist = {}; m.start = start; m.end = end;
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
      if (x !== px && y !== py && !G.Grid.clear(m, x, py) && !G.Grid.clear(m, px, y)) return false;
      if ((x !== tx || y !== ty) && !G.Grid.clear(m, x, y)) return false;
    }
    return true;
  },

  // 엔티티 e(x, y는 칸 중심 기준 실수 좌표)를 목표 칸 쪽으로 speed만큼 옮긴다. 도착하면 true.
  // 길이 없으면 제자리에 서고 false. 목표가 벽 칸이면 바로 앞에서 도착으로 친다.
  moveTo(m, e, tx, ty, speed, dt, stopAt = 0.05) {
    const GR = G.Grid, dx0 = tx - e.x, dy0 = ty - e.y, dd = Math.hypot(dx0, dy0);
    if (dd <= stopAt) return true;
    let gx = tx, gy = ty;
    const cx = Math.round(e.x), cy = Math.round(e.y), txi = Math.round(tx), tyi = Math.round(ty), free = GR.pass(m, cx, cy);
    if (free && dd <= 1.5 && !GR.pass(m, txi, tyi)) return true;
    if ((cx !== txi || cy !== tyi) && (dd > 1.5 || !GR.walkable(m, e.x, e.y, tx, ty))) {
      const d = GR.field(m, txi, tyi);
      let best = d[cx + cy * m.w], bx = cx, by = cy;
      if (best < 0) best = 1e9;
      for (const [ddx, ddy] of GR.DIR) {
        const nx = cx + ddx, ny = cy + ddy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        if (free && ddx && ddy && (!GR.pass(m, cx + ddx, cy) || !GR.pass(m, cx, cy + ddy))) continue;
        const v = d[nx + ny * m.w];
        if (v >= 0 && v < best) { best = v; bx = nx; by = ny; }
      }
      if (bx === cx && by === cy) { e.moving = false; return false; }
      gx = bx; gy = by;
    }
    const vx = gx - e.x, vy = gy - e.y, l = Math.hypot(vx, vy) || 1, step = Math.min(l, speed * dt), nx = e.x + vx / l * step, ny = e.y + vy / l * step;
    if (GR.walkable(m, e.x, e.y, nx, ny)) { e.x = nx; e.y = ny; }
    else if (GR.walkable(m, e.x, e.y, nx, e.y)) e.x = nx;
    else if (GR.walkable(m, e.x, e.y, e.x, ny)) e.y = ny;
    else { e.moving = false; return false; }
    if (Math.abs(vx) > 0.01) e.flip = vx < 0;
    e.moving = true;
    return Math.hypot(tx - e.x, ty - e.y) <= stopAt;
  },
  // (x0, y0) → (x1, y1) 직선이 벽을 지나지 않나. 대각선은 양옆이 모두 뚫려 있어야 한다. 벽 안에서 나오는 길은 막지 않는다
  walkable(m, x0, y0, x1, y1) {
    const GR = G.Grid, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4) || 1;
    let px = Math.round(x0), py = Math.round(y0);
    for (let i = 1; i <= n; i++) {
      const cx = Math.round(x0 + (x1 - x0) * i / n), cy = Math.round(y0 + (y1 - y0) * i / n);
      if (cx === px && cy === py) continue;
      if (!GR.pass(m, cx, cy)) return false;
      if (cx !== px && cy !== py && GR.pass(m, px, py) && (!GR.pass(m, cx, py) || !GR.pass(m, px, cy))) return false;
      px = cx; py = cy;
    }
    return true;
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

// ── 층 구조 (DESIGN.md 145): 층마다 짓는 법 자체가 다르다. 방 나누기(halls) 말고 다섯 가지를 더 섞는다 ──
// 생각만 Brogue · DCSS의 층 종류에서 빌렸고 코드는 새로 썼다. 모두 { c, kindAt, rooms, start, end }를 같은 꼴로 돌려준다
// kindAt: 0 보통 · 1 큰 방 · 2 동굴 · 3 복도 (바닥 그림이 달라진다). '~' 물: 못 건너지만 건너다보인다
Object.assign(G.Grid, {
  LAYOUT_N: { halls: '방', cavern: '동굴', keep: '요새', river: '지하 강', nave: '대성당', warren: '굴' },
  // 층 구조 고르기: 시즌 씨앗으로 섞은 순서를 층마다 하나씩 (같은 구조가 연달아 나오지 않는다). 1층은 늘 방
  layoutOf(seed, fl) {
    if (fl <= 1) return 'halls';
    const ks = ['halls', 'cavern', 'keep', 'river', 'nave', 'warren'], r = G.Grid.seeded(seed * 31 + 17);
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
    return ks[fl % ks.length];
  },
  layout(kind, w, h, n, loops, rng) { return kind === 'halls' ? G.Grid.halls(w, h, n, loops, rng) : G.Grid[kind](w, h, n, rng); },

  // 공통 마무리: 방 가운데를 열고, 모든 방을 잇고(끊긴 곳은 두 칸 굴을 판다 — 물 위면 다리가 된다), 외딴 바닥은 메우고, 시작 · 계단을 정한다
  finish(w, h, c, kindAt, rooms, rng, extra = {}) {
    const ix = (x, y) => y * w + x, inb = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1;
    const dig2 = (x, y, k = 3) => { for (let v = 0; v < 2; v++) for (let u = 0; u < 2; u++) { const X = x + u, Y = y + v; if (inb(X, Y) && c[ix(X, Y)] !== '.') { c[ix(X, Y)] = '.'; kindAt[ix(X, Y)] = k; } } };
    for (const r of rooms) for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) if (inb(r.cx + u, r.cy + v) && c[ix(r.cx + u, r.cy + v)] !== '.') { c[ix(r.cx + u, r.cy + v)] = '.'; kindAt[ix(r.cx + u, r.cy + v)] = kindAt[ix(r.cx, r.cy)] || 0; }
    const m = { w, h, c, kindAt, poi: {}, passChars: '.>', ver: 1, dist: {}, rooms, ...extra };
    const link = (a, b) => { let x = a.cx, y = a.cy; for (let t = 0; t < 400 && (x !== b.cx || y !== b.cy); t++) { dig2(x, y); if (x !== b.cx && (y === b.cy || rng() < 0.5)) x += Math.sign(b.cx - x); else y += Math.sign(b.cy - y); } dig2(x, y); };
    for (let guard = 0; guard < rooms.length; guard++) {
      m.ver++; const d = G.Grid.field(m, rooms[0].cx, rooms[0].cy), off = rooms.filter(r => d[ix(r.cx, r.cy)] < 0);
      if (!off.length) break;
      const on = rooms.filter(r => d[ix(r.cx, r.cy)] >= 0), b = off[0], a = on.reduce((p, q) => ((q.cx - b.cx) ** 2 + (q.cy - b.cy) ** 2 < (p.cx - b.cx) ** 2 + (p.cy - b.cy) ** 2 ? q : p));
      link(a, b);
    }
    m.ver++; const d0 = G.Grid.field(m, rooms[0].cx, rooms[0].cy);
    for (let i = 0; i < w * h; i++) if (c[i] === '.' && d0[i] < 0) c[i] = '#';
    m.ver++;
    rooms.sort((p, q) => p.cx - q.cx);
    const start = rooms[0], d = G.Grid.field(m, start.cx, start.cy);
    const end = rooms.slice(1).reduce((p, q) => (d[ix(q.cx, q.cy)] > d[ix(p.cx, p.cy)] ? q : p), rooms[1] || start);
    m.rooms = [start, ...rooms.filter(r => r !== start && r !== end), end];
    m.dist = {}; m.start = start; m.end = end;
    c[ix(end.cx, end.cy)] = '>';
    return m;
  },
  // 바닥 칸에서 벽까지 거리 (넓은 곳 찾기)
  open(w, h, c) {
    const d = new Int16Array(w * h).fill(-1), q = [];
    for (let i = 0; i < w * h; i++) if (c[i] !== '.') { d[i] = 0; q.push(i); }
    for (let k = 0; k < q.length; k++) { const i = q[k], x = i % w, y = (i / w) | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + a, Y = y + b; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (d[j] < 0) { d[j] = d[i] + 1; q.push(j); } } }
    return d;
  },

  // 동굴: 맵 전체를 세포 자동자로 깎는다. 방은 가장 넓은 곳들 (넓은 굴방과 좁은 목)
  cavern(w, h, n, rng) {
    const c = new Array(w * h), kindAt = new Uint8Array(w * h).fill(2), ix = (x, y) => y * w + x;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) c[ix(x, y)] = x < 2 || y < 2 || x >= w - 2 || y >= h - 2 || rng() < 0.44 ? '#' : '.';
    for (let k = 0; k < 5; k++) { const o = c.slice(); for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { let s = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) if (o[ix(x + u, y + v)] === '#') s++; c[ix(x, y)] = s >= 5 || (k < 3 && s <= 1 && rng() < 0.3) ? '#' : '.'; } }
    // 한 칸짜리 목은 넓힌다 (넷이 지나가게)
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) if (c[ix(x, y)] === '.' && c[ix(x + 1, y)] === '#' && c[ix(x - 1, y)] === '#') c[ix(x + 1, y)] = '.';
    const op = G.Grid.open(w, h, c), rooms = [], want = Math.max(5, n);
    const cells = []; for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) if (op[ix(x, y)] >= 2) cells.push([x, y, op[ix(x, y)] + rng()]);
    cells.sort((a, b) => b[2] - a[2]);
    for (const [x, y, v] of cells) { if (rooms.length >= want) break; if (rooms.some(r => Math.hypot(r.cx - x, r.cy - y) < 11)) continue; const rr = Math.max(3, Math.min(6, Math.floor(v) + 1)); rooms.push({ x: Math.max(1, x - rr), y: Math.max(1, y - rr), w: rr * 2 + 1, h: rr * 2 + 1, cx: x, cy: y, shape: 'cave' }); }
    if (rooms.length < 3) return G.Grid.halls(w, h, n, 2, rng);
    return G.Grid.finish(w, h, c, kindAt, rooms, rng, { layout: 'cavern' });
  },

  // 요새: 위아래 줄방 · 두 칸 복도 둘 · 가운데 기둥 뜰 · 왼쪽 문루에서 오른쪽 왕좌방으로
  keep(w, h, n, rng) {
    const c = new Array(w * h).fill('#'), kindAt = new Uint8Array(w * h), ix = (x, y) => y * w + x, rooms = [];
    const fill = (x0, y0, x1, y1, k) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x > 0 && y > 0 && x < w - 1 && y < h - 1) { c[ix(x, y)] = '.'; kindAt[ix(x, y)] = k; } };
    const L = 12, R = w - 13, rh = Math.max(5, Math.floor((h - 16) / 3)), topY = 3, botY = h - 4 - rh, cTop = topY + rh + 2, cBot = botY - 3;
    // 문루 (시작) · 왕좌방 (끝)
    fill(2, cTop, L - 2, cBot + 1, 0); rooms.push({ x: 2, y: cTop, w: L - 3, h: cBot - cTop + 2, cx: Math.floor(L / 2), cy: (cTop + cBot) >> 1, shape: 'hall' });
    fill(R + 2, topY + 2, w - 3, h - 5, 1); rooms.push({ x: R + 2, y: topY + 2, w: w - 3 - R - 1, h: h - 7 - topY, cx: (R + w) >> 1, cy: h >> 1, shape: 'hall' });
    // 복도 둘 (두 칸)
    fill(L - 1, cTop, R + 1, cTop + 1, 3); fill(L - 1, cBot, R + 1, cBot + 1, 3);
    // 줄방: 위 · 아래, 문은 복도 쪽 가운데 두 칸
    for (const [y0, door] of [[topY, cTop - 1], [botY, cBot + 2]]) {
      let x = L; while (x < R - 6) { const rw = 7 + Math.floor(rng() * 4), x1 = Math.min(R - 1, x + rw - 1); fill(x, y0, x1, y0 + rh - 1, 0); const cx = (x + x1) >> 1; fill(cx, Math.min(door, y0 + rh), cx + 1, Math.max(door, y0 + rh - 1), 3); rooms.push({ x, y: y0, w: x1 - x + 1, h: rh, cx, cy: y0 + (rh >> 1), shape: 'hall' }); x = x1 + 2; }
    }
    // 뜰: 기둥이 줄지어 선 넓은 곳. 복도와 군데군데 이어진다
    const yA = cTop + 3, yB = cBot - 2;
    if (yB - yA >= 3) {
      fill(L + 2, yA, R - 2, yB, 1);
      for (let y = yA + 1; y < yB; y += 3) for (let x = L + 4; x < R - 3; x += 4) c[ix(x, y)] = '#';
      for (let x = L + 4; x < R - 3; x += 9) { fill(x, cTop + 2, x + 1, yA - 1, 3); fill(x + 4, yB + 1, x + 5, cBot - 1, 3); }
      const mid = (L + R) >> 1, span = (R - L - 4) / 2;
      for (const k of [-1, 1]) rooms.push({ x: k < 0 ? L + 2 : mid, y: yA, w: Math.floor(span), h: yB - yA + 1, cx: mid + k * Math.floor(span / 2), cy: (yA + yB) >> 1, shape: 'hall' });
    }
    return G.Grid.finish(w, h, c, kindAt, rooms, rng, { layout: 'keep' });
  },

  // 지하 강: 방 나누기 위로 굽이치는 강이 지나간다. 건너는 곳은 다리뿐 (잇는 굴이 물을 메워 다리가 된다)
  river(w, h, n, rng) {
    const base = G.Grid.halls(w, h, n, 2, rng), c = base.c, ix = (x, y) => y * w + x, ph = rng() * 6, amp = w * (0.08 + rng() * 0.06), mid = w * (0.42 + rng() * 0.16);
    for (let y = 1; y < h - 1; y++) { const cx = mid + Math.sin(y * 0.18 + ph) * amp + Math.sin(y * 0.07 + ph * 2) * amp * 0.5; for (let x = Math.floor(cx - 2.6); x <= Math.ceil(cx + 2.6); x++) if (x > 0 && x < w - 1) { if (c[ix(x, y)] === '>') continue; c[ix(x, y)] = '~'; } }
    for (const r of base.rooms) for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) if (c[ix(r.cx + u, r.cy + v)] === '~') c[ix(r.cx + u, r.cy + v)] = '#'; // 방 한가운데를 강이 지나면 바위섬
    for (let i = 0; i < w * h; i++) if (c[i] === '>') c[i] = '.';
    // 강물은 바닥에 닿는 곳만 보인다: 바위 속의 강은 바위로 둔다
    const near = i => { const x = i % w, y = (i / w) | 0; for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) { const X = x + u, Y = y + v; if (X >= 0 && Y >= 0 && X < w && Y < h && c[ix(X, Y)] === '.') return true; } return false; };
    for (let i = 0; i < w * h; i++) if (c[i] === '~' && !near(i)) c[i] = '#';
    return G.Grid.finish(w, h, c, base.kindAt, base.rooms.map(r => ({ ...r })), rng, { layout: 'river', water: true });
  },

  // 대성당: 맵 가운데를 차지하는 기둥 회랑 하나 + 양옆 작은 예배실 + 동쪽 끝 둥근 제단방
  nave(w, h, n, rng) {
    const c = new Array(w * h).fill('#'), kindAt = new Uint8Array(w * h), ix = (x, y) => y * w + x, rooms = [];
    const fill = (x0, y0, x1, y1, k) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x > 0 && y > 0 && x < w - 1 && y < h - 1) { c[ix(x, y)] = '.'; kindAt[ix(x, y)] = k; } };
    const nx0 = 10, nx1 = w - 14, ny0 = Math.floor(h * 0.3), ny1 = Math.floor(h * 0.7);
    fill(2, ny0 + 3, nx0 - 1, ny1 - 3, 0); rooms.push({ x: 2, y: ny0 + 3, w: nx0 - 3, h: ny1 - ny0 - 5, cx: 5, cy: h >> 1, shape: 'hall' }); // 현관
    fill(nx0, ny0, nx1, ny1, 1);
    for (const y of [ny0 + 2, ny1 - 2]) for (let x = nx0 + 2; x < nx1 - 1; x += 3) c[ix(x, y)] = '#'; // 두 줄 기둥
    const seg = 3, sw = Math.floor((nx1 - nx0) / seg); for (let i = 0; i < seg; i++) rooms.push({ x: nx0 + i * sw, y: ny0, w: sw, h: ny1 - ny0 + 1, cx: nx0 + i * sw + (sw >> 1), cy: h >> 1, shape: 'hall' });
    // 제단방 (둥글게)
    const ax = w - 8, ay = h >> 1, rr = Math.min(6, Math.floor(h * 0.2)); for (let y = ay - rr; y <= ay + rr; y++) for (let x = ax - rr; x <= ax + rr; x++) if ((x - ax) ** 2 + (y - ay) ** 2 <= rr * rr + 1) fill(x, y, x, y, 0);
    fill(nx1, ay - 1, ax - rr + 1, ay, 3); rooms.push({ x: ax - rr, y: ay - rr, w: rr * 2 + 1, h: rr * 2 + 1, cx: ax, cy: ay, shape: 'round' });
    // 예배실: 위 · 아래 벽을 따라, 회랑으로 문 하나
    for (const top of [true, false]) { let x = nx0 + 2; while (x < nx1 - 8) { const cw = 6 + Math.floor(rng() * 3), chh = 4 + Math.floor(rng() * 3), y0 = top ? Math.max(2, ny0 - 2 - chh) : ny1 + 2, y1 = top ? ny0 - 2 : Math.min(h - 3, ny1 + 1 + chh); if (rng() < 0.8) { fill(x, y0, x + cw - 1, y1, 0); const dx = x + (cw >> 1); fill(dx, top ? y1 : ny1, dx + 1, top ? ny0 : y0, 3); rooms.push({ x, y: y0, w: cw, h: y1 - y0 + 1, cx: dx, cy: (y0 + y1) >> 1, shape: 'chamfer' }); } x += cw + 2 + Math.floor(rng() * 3); } }
    return G.Grid.finish(w, h, c, kindAt, rooms, rng, { layout: 'nave' });
  },

  // 굴: 작은 방이 많고, 굽이치는 두 칸 굴이 잇는다 (고블린 굴 · 지하 묘지 느낌)
  warren(w, h, n, rng) {
    const c = new Array(w * h).fill('#'), kindAt = new Uint8Array(w * h), ix = (x, y) => y * w + x, rooms = [], want = Math.max(8, Math.min(13, n + 3));
    for (let t = 0; t < 600 && rooms.length < want; t++) {
      const rw = 5 + Math.floor(rng() * 3), rh = 4 + Math.floor(rng() * 3), x = 2 + Math.floor(rng() * (w - rw - 4)), y = 2 + Math.floor(rng() * (h - rh - 4));
      if (rooms.some(r => x < r.x + r.w + 4 && x + rw + 4 > r.x && y < r.y + r.h + 3 && y + rh + 3 > r.y)) continue;
      const round = rng() < 0.4; for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) { const ex = (xx - x - (rw - 1) / 2) / (rw / 2), ey = (yy - y - (rh - 1) / 2) / (rh / 2); if (!round || ex * ex + ey * ey <= 1.1) { c[ix(xx, yy)] = '.'; kindAt[ix(xx, yy)] = 0; } }
      rooms.push({ x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1), shape: round ? 'round' : 'chamfer' });
    }
    // 굽이치는 굴: 목표 쪽으로 가되 자주 옆으로 샌다
    const dig2 = (x, y) => { for (let v = 0; v < 2; v++) for (let u = 0; u < 2; u++) { const X = x + u, Y = y + v; if (X > 0 && Y > 0 && X < w - 1 && Y < h - 1 && c[ix(X, Y)] !== '.') { c[ix(X, Y)] = '.'; kindAt[ix(X, Y)] = 2; } } };
    const tunnel = (a, b) => { let x = a.cx, y = a.cy; for (let t = 0; t < 500 && (Math.abs(x - b.cx) > 1 || Math.abs(y - b.cy) > 1); t++) { dig2(x, y); const r0 = rng(); if (r0 < 0.62) { if (Math.abs(b.cx - x) > Math.abs(b.cy - y)) x += Math.sign(b.cx - x); else y += Math.sign(b.cy - y); } else if (r0 < 0.81) y += rng() < 0.5 ? 1 : -1; else x += rng() < 0.5 ? 1 : -1; x = Math.max(1, Math.min(w - 3, x)); y = Math.max(1, Math.min(h - 3, y)); } };
    const inT = new Set([0]); while (inT.size < rooms.length) { let best = null; for (const i of inT) for (let j = 0; j < rooms.length; j++) if (!inT.has(j)) { const d = (rooms[i].cx - rooms[j].cx) ** 2 + (rooms[i].cy - rooms[j].cy) ** 2; if (!best || d < best[2]) best = [i, j, d]; } inT.add(best[1]); tunnel(rooms[best[0]], rooms[best[1]]); }
    for (let k = 0; k < 3; k++) { const a = rooms[Math.floor(rng() * rooms.length)], b = rooms[Math.floor(rng() * rooms.length)]; if (a !== b) tunnel(a, b); }
    return G.Grid.finish(w, h, c, kindAt, rooms, rng, { layout: 'warren' });
  },
});

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
