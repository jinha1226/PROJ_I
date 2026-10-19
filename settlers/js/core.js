'use strict';
// 공용 유틸리티: 난수, 시야, 경로 탐색, 메시지
var G = {};

G.DIRS8 = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];

const U = G.U = {
  rand: n => Math.floor(Math.random() * n),
  randi: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  chance: p => Math.random() < p,
  pick: a => a[Math.floor(Math.random() * a.length)],
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  cheb: (x1, y1, x2, y2) => Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)),
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  wpick(obj) {
    let tot = 0;
    for (const k in obj) tot += obj[k];
    let r = Math.random() * tot;
    for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
    return Object.keys(obj)[0];
  },
  uid() { return ++G.S.uid; },
  // 한국어 조사: josa('고블린', '이/가') → '고블린이'
  josa(w, pair) {
    const [a, b] = pair.split('/');
    const ch = w.charCodeAt(w.length - 1);
    if (ch < 0xac00 || ch > 0xd7a3) return w + b;
    const jong = (ch - 0xac00) % 28;
    if (a === '으로') return w + (jong === 0 || jong === 8 ? '로' : '으로');
    return w + (jong > 0 ? a : b);
  },
  fmtTime(tick, day) {
    const t = ((tick % day) + day) % day;
    const mins = Math.floor((t / day) * 1440);
    return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
  },
};

// 재귀 그림자 투사 시야
G.fov = function (ox, oy, r, w, h, opaque, visit) {
  visit(ox, oy);
  const M = [[1, 0, 0, -1, -1, 0, 0, 1], [0, 1, -1, 0, 0, -1, 1, 0], [0, 1, 1, 0, 0, -1, -1, 0], [1, 0, 0, 1, -1, 0, 0, -1]];
  function cast(row, start, end, xx, xy, yx, yy) {
    if (start < end) return;
    let newStart = 0;
    for (let j = row; j <= r; j++) {
      let dx = -j - 1;
      const dy = -j;
      let blocked = false;
      while (dx <= 0) {
        dx++;
        const X = ox + dx * xx + dy * xy, Y = oy + dx * yx + dy * yy;
        const lSlope = (dx - 0.5) / (dy + 0.5), rSlope = (dx + 0.5) / (dy - 0.5);
        if (start < rSlope) continue;
        if (end > lSlope) break;
        const inb = X >= 0 && Y >= 0 && X < w && Y < h;
        if (inb && dx * dx + dy * dy <= r * r) visit(X, Y);
        const op = !inb || opaque(X, Y);
        if (blocked) {
          if (op) { newStart = rSlope; continue; }
          blocked = false; start = newStart;
        } else if (op && j < r) {
          blocked = true;
          cast(j + 1, start, lSlope, xx, xy, yx, yy);
          newStart = rSlope;
        }
      }
      if (blocked) break;
    }
  }
  for (let o = 0; o < 8; o++) cast(1, 1.0, 0.0, M[0][o], M[1][o], M[2][o], M[3][o]);
};

// 너비 우선 탐색: goal(x,y)가 참이 되는 가장 가까운 칸까지의 경로
// 버퍼는 재사용한다 (goal/pass 콜백 안에서 bfs를 다시 부르면 안 된다)
let bfsPrev = null, bfsQ = null, bfsMark = null, bfsGen = 0;
G.bfs = function (w, h, sx, sy, pass, goal, maxVisit) {
  const N = w * h;
  if (!bfsPrev || bfsPrev.length < N || bfsGen > 4e9) { bfsPrev = new Int32Array(N); bfsQ = new Int32Array(N); bfsMark = new Uint32Array(N); bfsGen = 0; }
  const gen = ++bfsGen, prev = bfsPrev, q = bfsQ, mark = bfsMark;
  let qh = 0, qt = 0;
  const s = sy * w + sx;
  prev[s] = s; mark[s] = gen; q[qt++] = s;
  while (qh < qt) {
    const i = q[qh++], x = i % w, y = (i - x) / w;
    const g = goal(x, y);
    if (g) {
      const path = [];
      let k = i;
      while (k !== s) { path.push([k % w, (k / w) | 0]); k = prev[k]; }
      path.reverse();
      return { x, y, path, target: g };
    }
    if (maxVisit && qh > maxVisit) break;
    for (let d = 0; d < 8; d++) {
      const nx = x + G.DIRS8[d][0], ny = y + G.DIRS8[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (mark[ni] === gen) continue;
      if (!pass(nx, ny)) continue;
      mark[ni] = gen; prev[ni] = i; q[qt++] = ni;
    }
  }
  return null;
};

// 비용 있는 다익스트라 (습격 몬스터의 공용 거리 지도)
G.dijkstra = function (w, h, sources, cost) {
  const N = w * h, dist = new Float64Array(N).fill(Infinity);
  const hd = [], hi = [];
  function push(d, i) {
    hd.push(d); hi.push(i);
    let k = hd.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (hd[p] <= hd[k]) break;
      [hd[p], hd[k]] = [hd[k], hd[p]]; [hi[p], hi[k]] = [hi[k], hi[p]];
      k = p;
    }
  }
  function pop() {
    const d = hd[0], i = hi[0];
    const ld = hd.pop(), li = hi.pop();
    if (hd.length) {
      hd[0] = ld; hi[0] = li;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1;
        let m = k;
        if (l < hd.length && hd[l] < hd[m]) m = l;
        if (r < hd.length && hd[r] < hd[m]) m = r;
        if (m === k) break;
        [hd[m], hd[k]] = [hd[k], hd[m]]; [hi[m], hi[k]] = [hi[k], hi[m]];
        k = m;
      }
    }
    return [d, i];
  }
  for (const [x, y] of sources) { const i = y * w + x; dist[i] = 0; push(0, i); }
  while (hd.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    const x = i % w, y = (i - x) / w;
    for (let k = 0; k < 8; k++) {
      const nx = x + G.DIRS8[k][0], ny = y + G.DIRS8[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const c = cost(nx, ny);
      if (c === Infinity) continue;
      const ni = ny * w + nx, nd = d + c;
      if (nd < dist[ni]) { dist[ni] = nd; push(nd, ni); }
    }
  }
  return dist;
};

// 브레젠험 직선 (시작점 제외)
G.line = function (x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  while (x !== x1 || y !== y1) {
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
    pts.push([x, y]);
  }
  return pts;
};

G.los = function (x0, y0, x1, y1, opaque) {
  const pts = G.line(x0, y0, x1, y1);
  for (let i = 0; i < pts.length - 1; i++) if (opaque(pts[i][0], pts[i][1])) return false;
  return true;
};

G.msg = function (t, cls) {
  const S = G.S;
  if (!S) return;
  S.log.push({ t, c: cls || '' });
  if (S.log.length > 300) S.log.splice(0, 100);
  G.logDirty = true;
};

// 값 노이즈 (정착지 지형 생성용)
G.noise = function (w, h, scale) {
  const gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2;
  const g = [];
  for (let i = 0; i < gw * gh; i++) g.push(Math.random());
  const sm = t => t * t * (3 - 2 * t);
  return function (x, y) {
    const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = sm(fx - ix), ty = sm(fy - iy);
    const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
};
