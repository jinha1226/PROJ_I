// 스킬트리 노드 아이콘: 0x72 화풍(16×16, 검은 외곽선 1px, 왼쪽 위 밝게·오른쪽 아래 어둡게, 재질마다 3단 색)으로 새로 그린다.
// 아이콘마다 모양(원·사각·다각형·선)과 재질만 정하면 음영·외곽선은 규칙이 입힌다 — 그래서 수백 개가 한 벌처럼 보인다.
// art72.js가 불러 ni_<키>로 저장하고, 트리 화면(v_tree)은 ni_<키>가 있으면 그것을 쓴다.
const N = 16;
const MAT = {
  gold: ['#8a5a1a', '#d9a62e', '#ffe9a0'], steel: ['#4a5468', '#9aa6bc', '#e6eef8'], wood: ['#4a2c18', '#8a5a30', '#c08850'],
  red: ['#6a1a1a', '#c23a3a', '#ff8a7a'], blue: ['#1a2e6a', '#3a6ad0', '#9ac8ff'], cyan: ['#10506a', '#2ab0d0', '#a8f0ff'],
  green: ['#1a4a22', '#3aa04a', '#a8f09a'], purple: ['#3a1a5a', '#8a4ad0', '#d8b0ff'], white: ['#8a8aa0', '#d8d8e8', '#ffffff'],
  bone: ['#8a7a5a', '#d8c8a0', '#fff4d8'], skin: ['#8a5a3a', '#d89a70', '#ffd8b8'], dark: ['#1a1a24', '#3a3a4a', '#6a6a80'],
  jade: ['#10503a', '#2aa080', '#a0f0d0'], pink: ['#6a2a4a', '#d86a9a', '#ffc0dc'], orange: ['#7a3a10', '#e07a2a', '#ffc080'],
  sea: ['#0e3a40', '#2a8a8a', '#8ad8d0'], yellow: ['#8a7a10', '#e8d040', '#fff8a0'], brown: ['#3a2a1a', '#6a4a2a', '#9a7a4a'],
};
const OUT = [18, 14, 22];
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// 캔버스: 칸마다 { m: 재질, t: 'd'|'m'|'l'|null(자동) }
function canvas() {
  const g = Array.from({ length: N * N }, () => null);
  const set = (x, y, m, t = null) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) g[y * N + x] = m ? { m, t } : null; };
  const c = {
    g, set,
    px: (x, y, m, t) => set(x, y, m, t),
    erase: (x, y) => set(x, y, null),
    rect(x, y, w, h, m, t) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, m, t); },
    circ(cx, cy, r, m, t) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3) set(x, y, m, t); },
    ell(cx, cy, rx, ry, m, t) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05) set(x, y, m, t); },
    ring(cx, cy, r, w, m, t) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= r + 0.5 && d >= r - w + 0.5) set(x, y, m, t); } },
    poly(pts, m, t) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) set(x, y, m, t);
      }
    },
    line(x0, y0, x1, y1, m, t, w = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) set(x + a - (w - 1) / 2, y + b - (w - 1) / 2, m, t); }
    },
  };
  return c;
}
// 음영과 외곽선을 입혀 그림으로
function bake(c) {
  const d = new Uint8Array(N * N * 4), g = c.g;
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? null : g[y * N + x]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const p = at(x, y), i = (y * N + x) * 4;
    if (p) {
      let t = p.t;
      if (!t) {
        const diff = q => !q || q.m !== p.m;
        t = diff(at(x, y - 1)) || diff(at(x - 1, y)) ? 'l' : diff(at(x, y + 1)) || diff(at(x + 1, y)) ? 'd' : 'm';
      }
      const col = hex(MAT[p.m][t === 'd' ? 0 : t === 'l' ? 2 : 1]);
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
      d[i] = OUT[0]; d[i + 1] = OUT[1]; d[i + 2] = OUT[2]; d[i + 3] = 255;
    }
  }
  return { w: N, h: N, d };
}

// ── 모양 (c: 캔버스, 색은 재질 이름) ──
const G = {
  coin(c, m = 'gold') { c.circ(7.5, 8, 5, m); c.circ(7.5, 8, 3, m, 'd'); c.circ(7.5, 8, 2, m, 'm'); c.line(7, 6, 7, 10, m, 'l'); },
  coins(c, m = 'gold') { for (const [x, y] of [[5, 11], [10, 11], [7.5, 7]]) { c.ell(x, y, 3.5, 2.5, m); c.ell(x, y - 0.6, 2.2, 1.2, m, 'l'); } },
  holecoin(c) { c.circ(7.5, 8, 6, 'gold'); c.ring(7.5, 8, 4.4, 1, 'gold', 'd'); c.rect(6, 6, 3, 3, null); },
  crystal(c, m = 'purple') { c.poly([[8, 1], [12, 6], [8, 15], [4, 6]], m); c.line(8, 2, 8, 14, m, 'l'); c.poly([[8, 1], [12, 6], [8, 6]], m, 'l'); },
  gem(c, m = 'red') { c.poly([[4, 6], [6, 3], [10, 3], [12, 6], [8, 13]], m); c.line(4, 6, 12, 6, m, 'l'); c.poly([[6, 3], [10, 3], [9, 6], [7, 6]], m, 'l'); },
  star(c, m = 'yellow') { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.8 : 7; p.push([7.5 + Math.cos(a) * r, 8 + Math.sin(a) * r]); } c.poly(p, m); },
  flame(c, m = 'orange', core = 'yellow') { c.poly([[8, 1], [12, 7], [13, 11], [10, 15], [5, 15], [2, 11], [4, 7], [6, 9]], m); c.poly([[8, 6], [10, 10], [9, 14], [6, 14], [5, 11]], core); },
  bolt(c, m = 'yellow') { c.poly([[9, 0], [3, 9], [7, 9], [5, 15], [13, 6], [9, 6], [11, 0]], m); },
  drop(c, m = 'blue') { c.poly([[8, 1], [12, 8], [12, 11], [10, 14], [6, 14], [4, 11], [4, 8]], m); c.px(6, 9, m, 'l'); c.px(6, 10, m, 'l'); },
  heart(c, m = 'red') { c.circ(5, 6, 3, m); c.circ(10, 6, 3, m); c.poly([[2, 7], [13, 7], [7.5, 14]], m); },
  cross(c, m = 'white') { c.rect(6, 2, 4, 12, m); c.rect(2, 6, 12, 4, m); },
  plus(c, m = 'green') { c.rect(6, 3, 4, 10, m); c.rect(3, 6, 10, 4, m); },
  sword(c, m = 'steel', h = 'gold') { c.line(4, 12, 12, 4, m, null, 2); c.line(13, 3, 13, 3, m, 'l'); c.line(2, 10, 6, 14, h, null, 2); c.line(2, 14, 3, 13, 'wood', null, 2); },
  swords(c) { G.sword(c); c.line(12, 12, 4, 4, 'steel', null, 2); c.line(10, 14, 14, 10, 'gold', null, 2); },
  dagger(c) { c.line(6, 10, 12, 4, 'steel', null, 2); c.line(4, 9, 7, 12, 'gold', null, 1); c.line(3, 13, 5, 11, 'wood', null, 2); },
  shield(c, m = 'steel', e = 'red') { c.poly([[2, 2], [13, 2], [13, 8], [7.5, 15], [2, 8]], m); c.poly([[5, 4], [10, 4], [10, 8], [7.5, 12], [5, 8]], e); },
  armor(c, m = 'steel') { c.poly([[4, 4], [11, 4], [11, 14], [4, 14]], m); c.ell(3, 5, 2.5, 2, m); c.ell(12, 5, 2.5, 2, m); c.poly([[6, 2], [9, 2], [8, 5], [7, 5]], 'skin'); c.rect(4, 10, 8, 1, 'gold'); c.line(7.5, 6, 7.5, 9, m, 'l'); },
  helmet(c, m = 'steel') { c.ell(7.5, 8, 5.5, 5.5, m); c.rect(2, 9, 12, 6, null); c.rect(3, 9, 10, 3, m); c.rect(5, 10, 6, 1, 'dark'); },
  crown(c, m = 'gold') { c.poly([[2, 12], [2, 5], [5, 8], [7.5, 3], [10, 8], [13, 5], [13, 12]], m); c.rect(2, 12, 12, 2, m, 'd'); c.px(7.5, 9, 'red'); },
  halo(c, m = 'yellow') { c.ring(7.5, 8, 6, 2, m); },
  scroll(c, m = 'bone') { c.rect(3, 4, 10, 8, m); c.rect(2, 3, 12, 2, 'wood'); c.rect(2, 11, 12, 2, 'wood'); c.line(5, 6, 10, 6, m, 'd'); c.line(5, 8, 10, 8, m, 'd'); },
  book(c, m = 'red') { c.rect(3, 2, 10, 12, m); c.rect(4, 12, 9, 2, 'bone'); c.line(5, 4, 11, 4, 'gold'); c.line(5, 6, 9, 6, 'gold'); },
  flask(c, m = 'red') { c.rect(6, 1, 4, 4, 'white'); c.circ(7.5, 10, 5, m); c.circ(6, 9, 1.4, 'white', 'l'); },
  pill(c, m = 'gold') { c.circ(7.5, 8, 5, m); c.circ(6, 6.5, 1.5, m, 'l'); },
  bottle(c, m = 'jade') { c.rect(6, 1, 4, 3, 'wood'); c.poly([[5, 4], [10, 4], [12, 8], [12, 14], [3, 14], [3, 8]], m); },
  herb(c, m = 'green') { c.line(7.5, 15, 7.5, 6, 'green', 'd'); for (const [x, y, s] of [[4, 6, -1], [11, 5, 1], [4, 10, -1], [11, 9, 1]]) c.ell(x, y, 2.6, 1.6, m); c.circ(7.5, 3, 2, 'pink'); },
  sprout(c) { c.rect(2, 12, 12, 3, 'brown'); c.line(7.5, 12, 7.5, 6, 'green', 'd'); c.ell(5, 6, 2.5, 1.5, 'green'); c.ell(10, 5, 2.5, 1.5, 'green'); },
  leaf(c, m = 'green') { c.poly([[3, 13], [3, 7], [7, 2], [13, 2], [13, 7], [8, 12]], m); c.line(3, 13, 12, 3, m, 'd'); },
  plum(c) { c.line(1, 14, 9, 6, 'brown', null, 2); c.line(9, 6, 13, 3, 'brown'); for (const [x, y] of [[5, 8], [11, 6], [8, 3]]) { c.circ(x, y, 2.3, 'pink'); c.px(x, y, 'yellow'); } },
  peach(c) { c.circ(7.5, 9, 5.5, 'pink'); c.ell(9, 3, 3, 1.5, 'green'); c.line(7.5, 4, 7.5, 13, 'pink', 'd'); },
  mountain(c, m = 'steel', snow = 'white') { c.poly([[0, 15], [6, 3], [9, 8], [11, 6], [15, 15]], m); c.poly([[4.5, 6], [6, 3], [7.5, 6]], snow); },
  cloud(c, m = 'white') { c.circ(5, 9, 3.5, m); c.circ(9, 7, 4, m); c.circ(12, 10, 3, m); c.rect(3, 10, 11, 3, m); },
  storm(c) { G.cloud(c, 'dark'); c.poly([[8, 10], [5, 15], [8, 13], [7, 16], [11, 11], [8, 12], [10, 10]], 'yellow'); },
  sun(c) { c.circ(7.5, 8, 4, 'yellow'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.line(7.5 + Math.cos(a) * 5.5, 8 + Math.sin(a) * 5.5, 7.5 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, 'orange'); } },
  eye(c, m = 'yellow', iris = 'red') { c.ell(7.5, 8, 7, 4, m); c.circ(7.5, 8, 3, iris); c.rect(7, 6, 2, 4, 'dark'); },
  swirl(c, m = 'cyan') { for (let i = 0; i < 40; i++) { const a = i * 0.32, r = 1 + i * 0.16; c.px(7.5 + Math.cos(a) * r, 8 + Math.sin(a) * r, m); c.px(7.5 + Math.cos(a) * r + 0.5, 8 + Math.sin(a) * r, m); } },
  orb(c, m = 'cyan') { c.circ(7.5, 8, 6, m); c.circ(5.5, 6, 2, m, 'l'); },
  taiji(c) { c.circ(7.5, 8, 6.5, 'white'); for (let y = 0; y < N; y++) for (let x = 0; x < 8; x++) if ((x - 7.5) ** 2 + (y - 8) ** 2 <= 42) c.px(x, y, 'dark'); c.circ(7.5, 4.8, 3.2, 'white'); c.circ(7.5, 11.2, 3.2, 'dark'); c.circ(7.5, 4.8, 1, 'dark'); c.circ(7.5, 11.2, 1, 'white'); },
  gong(c) { c.rect(2, 1, 12, 2, 'wood'); c.line(3, 3, 3, 14, 'wood'); c.line(12, 3, 12, 14, 'wood'); c.circ(7.5, 9, 4, 'gold'); c.circ(7.5, 9, 1.5, 'gold', 'd'); },
  hourglass(c, m = 'gold') { c.rect(3, 1, 10, 2, 'wood'); c.rect(3, 13, 10, 2, 'wood'); c.poly([[4, 3], [11, 3], [8, 8], [11, 13], [4, 13], [7, 8]], 'bone'); c.poly([[5, 10], [10, 10], [11, 12], [4, 12]], m); },
  gear(c, m = 'steel') { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.circ(7.5 + Math.cos(a) * 5.5, 8 + Math.sin(a) * 5.5, 1.4, m); } c.circ(7.5, 8, 5, m); c.circ(7.5, 8, 2, null); },
  wrench(c) { c.line(4, 12, 11, 5, 'steel', null, 2); c.circ(11.5, 4.5, 3, 'steel'); c.rect(11, 2, 2, 3, null); c.circ(3.5, 12.5, 1.6, 'steel'); },
  chip(c, m = 'green') { c.rect(3, 3, 10, 10, m); c.rect(5, 5, 6, 6, 'dark'); for (let i = 4; i <= 11; i += 2) { c.px(i, 1, 'gold'); c.px(i, 2, 'gold'); c.px(i, 13, 'gold'); c.px(i, 14, 'gold'); } },
  card(c, m = 'cyan') { c.rect(1, 4, 14, 9, m); c.rect(3, 6, 3, 3, 'gold'); c.line(8, 10, 13, 10, m, 'd'); },
  battery(c, m = 'green') { c.rect(4, 3, 8, 11, 'dark'); c.rect(6, 1, 4, 2, 'steel'); c.rect(5, 7, 6, 6, m); },
  dome(c, m = 'cyan') { c.ell(7.5, 12, 6.5, 8, m); c.rect(0, 12, 16, 4, null); c.ell(5, 8, 1.5, 2.5, m, 'l'); c.rect(0, 12, 16, 3, 'steel'); c.rect(6, 9, 3, 3, 'steel'); },
  grid(c, m = 'cyan') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c.rect(1 + i * 5, 1 + j * 5, 4, 4, m); },
  reactor(c) { c.circ(7.5, 8, 6.5, 'steel'); c.circ(7.5, 8, 4, 'cyan'); c.circ(7.5, 8, 1.6, 'white'); },
  missile(c) { c.poly([[12, 2], [14, 2], [14, 4], [6, 12], [4, 10]], 'white'); c.poly([[12, 2], [14, 2], [14, 4]], 'red'); c.poly([[4, 10], [2, 10], [3, 14], [6, 12]], 'red'); c.poly([[3, 12], [1, 15], [4, 13]], 'orange'); },
  ufo(c) { c.ell(7.5, 9, 7, 3, 'steel'); c.ell(7.5, 6, 3.5, 3, 'cyan'); c.rect(0, 9, 16, 1, 'steel', 'd'); for (const x of [3, 7.5, 12]) c.px(x, 10, 'yellow'); },
  snow(c, m = 'cyan') { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.line(7.5 - Math.cos(a) * 6.5, 8 - Math.sin(a) * 6.5, 7.5 + Math.cos(a) * 6.5, 8 + Math.sin(a) * 6.5, m); } c.circ(7.5, 8, 1.5, 'white'); },
  turret(c, m = 'steel', gun = 'cyan') { c.rect(3, 11, 10, 4, m); c.circ(7.5, 9, 3.5, m); c.line(9, 8, 14, 3, gun, null, 2); },
  dish(c) { c.poly([[2, 2], [12, 12], [8, 14], [2, 8]], 'white'); c.line(4, 10, 11, 3, 'steel'); c.circ(11.5, 2.5, 1.2, 'red'); c.rect(6, 13, 4, 2, 'steel'); },
  magnet(c) { c.ring(7.5, 7, 5.5, 3, 'red'); c.rect(1, 7, 14, 9, null); c.rect(2, 7, 3, 6, 'red'); c.rect(11, 7, 3, 6, 'red'); c.rect(2, 12, 3, 2, 'white'); c.rect(11, 12, 3, 2, 'white'); },
  wave(c, m = 'sea') { for (const y0 of [5, 10]) for (let x = 0; x < N; x++) { const y = y0 + Math.round(Math.sin(x * 0.8) * 1.5); c.rect(x, y, 1, 3, m); } },
  rock(c) { c.poly([[1, 14], [3, 7], [7, 4], [11, 5], [14, 10], [15, 14]], 'steel'); c.line(6, 8, 9, 11, 'steel', 'd'); },
  fish(c, m = 'sea', eye = 'white') { c.ell(7, 8, 5.5, 3.5, m); c.poly([[11, 8], [15, 4], [15, 12]], m); c.px(4, 7, eye); c.line(6, 9, 9, 9, m, 'd'); },
  crab(c, m = 'red') { c.ell(7.5, 10, 5, 3.5, m); c.circ(2.5, 5, 2, m); c.circ(12.5, 5, 2, m); c.px(6, 7, 'white'); c.px(9, 7, 'white'); for (const x of [2, 4, 11, 13]) c.line(x, 12, x - (x < 8 ? 1 : -1), 15, m, 'd'); },
  jelly(c, m = 'pink') { c.ell(7.5, 6, 6, 4.5, m); c.rect(1, 7, 14, 3, null); c.rect(2, 6, 12, 2, m); for (const x of [3, 6, 9, 12]) c.line(x, 8, x + (x % 2 ? 1 : -1), 14, m, 'l'); },
  tentacle(c, m = 'green') { for (let i = 0; i < 14; i++) { const x = 6 + Math.sin(i * 0.5) * 3, w = Math.max(1, 3 - i * 0.15); c.circ(x, 15 - i, w, m); } for (const y of [11, 8, 5]) c.px(5 + Math.sin((15 - y) * 0.5) * 3 + 2, y, 'pink'); },
  kraken(c) { c.ell(7.5, 5, 5, 4.5, 'purple'); for (const x of [3, 6, 9, 12]) c.line(x, 8, x + (x < 8 ? -2 : 2), 15, 'purple', null, 2); c.px(5.5, 5, 'yellow'); c.px(9.5, 5, 'yellow'); },
  skull(c, m = 'bone') { c.circ(7.5, 7, 5.5, m); c.rect(5, 11, 6, 4, m); c.circ(5, 7, 1.6, 'dark'); c.circ(10, 7, 1.6, 'dark'); c.px(7.5, 10, 'dark'); },
  boneFish(c) { c.line(2, 8, 12, 8, 'bone'); for (const x of [4, 6, 8, 10]) c.line(x, 5, x, 11, 'bone'); c.poly([[12, 8], [15, 5], [15, 11]], 'bone'); c.circ(2, 8, 1.5, 'bone'); },
  hook(c) { c.line(10, 1, 10, 10, 'steel'); c.ring(7, 10, 3, 1, 'steel'); c.rect(4, 6, 6, 4, null); c.px(4, 9, 'steel', 'l'); c.px(3, 8, 'steel', 'l'); },
  reel(c) { c.circ(7.5, 8, 6, 'steel'); c.circ(7.5, 8, 3.5, 'wood'); c.circ(7.5, 8, 1, 'steel'); c.line(12, 8, 15, 8, 'wood', null, 2); },
  spool(c, m = 'steel') { c.rect(3, 2, 10, 2, 'wood'); c.rect(3, 12, 10, 2, 'wood'); c.rect(4, 4, 8, 8, m); for (const y of [5, 7, 9]) c.line(4, y, 11, y + 1, m, 'd'); },
  lantern(c, m = 'yellow') { c.rect(6, 0, 4, 2, 'steel'); c.rect(4, 2, 8, 2, 'steel'); c.rect(4, 4, 8, 8, m); c.rect(4, 12, 8, 2, 'steel'); c.rect(7, 6, 2, 4, 'white'); },
  candle(c) { c.rect(5, 6, 6, 9, 'bone'); c.poly([[8, 0], [10, 3], [8, 6], [6, 3]], 'orange'); c.px(8, 3, 'yellow'); },
  hat(c, m = 'brown') { c.ell(7.5, 11, 7, 2.5, m); c.poly([[4, 11], [5, 4], [10, 4], [11, 11]], m); c.rect(5, 9, 6, 1, 'red'); },
  straw(c) { c.poly([[0, 11], [7.5, 3], [15, 11]], 'yellow'); c.line(1, 11, 14, 11, 'yellow', 'd'); },
  hood(c, m = 'purple') { c.poly([[3, 15], [3, 6], [7.5, 1], [12, 6], [12, 15]], m); c.ell(7.5, 8, 2.8, 3.5, 'dark'); c.px(6.5, 8, 'red'); c.px(8.5, 8, 'red'); },
  face(c, m = 'skin', hair = 'dark') { c.circ(7.5, 8, 5, m); c.rect(2, 2, 12, 4, hair); c.circ(7.5, 2.5, 2, hair); c.px(5.5, 8, 'dark'); c.px(9.5, 8, 'dark'); },
  elder(c) { G.face(c, 'skin', 'white'); c.poly([[4, 11], [11, 11], [7.5, 16]], 'white'); },
  house(c, m = 'wood', roof = 'red') { c.rect(3, 8, 10, 7, m); c.poly([[1, 9], [7.5, 2], [14, 9]], roof); c.rect(7, 11, 2, 4, 'dark'); },
  pagoda(c) { for (const [y, w] of [[12, 7], [8, 5.5], [4, 4]]) { c.poly([[7.5 - w - 1.5, y], [7.5 + w + 1.5, y], [7.5 + w, y - 2], [7.5 - w, y - 2]], 'red'); c.rect(7.5 - w + 1, y, (w - 1) * 2, 2, 'wood'); } c.line(7.5, 0, 7.5, 2, 'gold'); },
  gate(c) { c.rect(1, 2, 14, 2, 'red'); c.rect(3, 5, 10, 1, 'red'); c.rect(3, 4, 2, 11, 'red'); c.rect(11, 4, 2, 11, 'red'); },
  statue(c) { c.rect(4, 12, 8, 3, 'steel'); c.circ(7.5, 4, 2.5, 'steel'); c.poly([[4, 12], [5, 7], [10, 7], [11, 12]], 'steel'); },
  table(c) { c.rect(1, 6, 14, 2, 'wood'); c.rect(2, 8, 2, 6, 'wood'); c.rect(12, 8, 2, 6, 'wood'); G.scrollMini(c, 4, 2); },
  scrollMini(c, x, y) { c.rect(x, y, 7, 4, 'bone'); c.line(x, y, x, y + 3, 'wood'); c.line(x + 7, y, x + 7, y + 3, 'wood'); },
  board(c) { c.rect(2, 2, 12, 9, 'wood'); c.rect(4, 4, 3, 4, 'bone'); c.rect(9, 4, 3, 5, 'bone'); c.rect(3, 11, 2, 4, 'wood'); c.rect(11, 11, 2, 4, 'wood'); },
  dummy(c) { c.line(7.5, 4, 7.5, 15, 'wood', null, 2); c.line(2, 7, 13, 7, 'wood', null, 2); c.circ(7.5, 3, 2.5, 'bone'); },
  flag(c, m = 'red') { c.line(3, 1, 3, 15, 'wood'); c.poly([[4, 1], [14, 3], [10, 5], [14, 8], [4, 8]], m); },
  banner(c, m = 'blue') { c.line(2, 1, 13, 1, 'gold'); c.poly([[3, 2], [12, 2], [12, 13], [7.5, 10], [3, 13]], m); c.circ(7.5, 6, 2, 'gold'); },
  band(c, m = 'red') { c.rect(1, 6, 14, 4, m); c.poly([[12, 9], [15, 14], [13, 15], [11, 10]], m); },
  wing(c, m = 'white') { c.poly([[2, 13], [3, 6], [8, 2], [14, 1], [12, 5], [14, 6], [11, 9], [13, 10], [8, 13]], m); },
  boot(c) { c.poly([[4, 2], [9, 2], [9, 10], [14, 11], [14, 14], [4, 14]], 'brown'); c.poly([[1, 4], [4, 3], [4, 8]], 'white'); },
  feather(c) { c.poly([[3, 14], [5, 8], [10, 2], [13, 1], [12, 5], [7, 11]], 'white'); c.line(3, 14, 12, 2, 'steel'); },
  fist(c, m = 'skin') { c.rect(3, 4, 10, 8, m); for (const x of [3, 6, 9]) c.line(x + 2, 4, x + 2, 8, m, 'd'); c.rect(5, 12, 6, 3, m); },
  drum(c) { c.ell(7.5, 5, 6, 2.5, 'bone'); c.rect(1.5, 5, 12, 7, 'red'); c.ell(7.5, 12, 6, 2.5, 'red'); c.line(3, 6, 12, 11, 'gold'); c.line(12, 6, 3, 11, 'gold'); },
  note(c, m = 'cyan') { c.ell(4, 12, 2.6, 2, m); c.ell(11, 10, 2.6, 2, m); c.line(6, 12, 6, 3, m); c.line(13, 10, 13, 1, m); c.line(6, 3, 13, 1, m, null, 2); },
  chain(c, m = 'steel') { for (let i = 0; i < 4; i++) c.ring(3 + i * 3.3, 3 + i * 3.3, 2.3, 1, m); },
  seal(c, m = 'yellow') { c.rect(4, 1, 8, 14, m); c.line(6, 3, 10, 3, 'red'); c.line(8, 3, 8, 12, 'red'); c.line(6, 7, 10, 9, 'red'); },
  sign(c, m = 'red') { c.poly([[7.5, 1], [14, 8], [7.5, 15], [1, 8]], m); c.line(7.5, 4, 7.5, 12, 'gold'); c.line(5, 7, 10, 7, 'gold'); },
  rune(c, m = 'steel') { c.poly([[3, 2], [12, 2], [13, 14], [2, 14]], m); c.line(7.5, 4, 7.5, 12, 'purple'); c.line(5, 6, 10, 9, 'purple'); },
  elderSign(c) { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7; p.push([7.5 + Math.cos(a) * r, 8 + Math.sin(a) * r]); } c.poly(p, 'jade'); c.circ(7.5, 8, 2, 'yellow'); },
  clover(c) { for (const [x, y] of [[5, 5], [10, 5], [5, 10], [10, 10]]) c.circ(x, y, 2.6, 'green'); c.line(10, 10, 14, 15, 'green', 'd'); },
  brain(c) { c.ell(7.5, 8, 6.5, 5, 'pink'); c.line(7.5, 3, 7.5, 13, 'pink', 'd'); c.line(3, 7, 6, 9, 'pink', 'd'); c.line(9, 6, 12, 9, 'pink', 'd'); },
  ritual(c) { c.ring(7.5, 8, 7, 1, 'red'); const p = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; p.push([7.5 + Math.cos(a) * 6, 8 + Math.sin(a) * 6]); } for (let i = 0; i < 5; i++) c.line(...p[i], ...p[(i + 1) % 5], 'red'); },
  idol(c) { c.rect(4, 12, 8, 3, 'steel'); c.ell(7.5, 6, 4, 5, 'sea'); for (const x of [5, 7.5, 10]) c.line(x, 9, x, 12, 'sea'); c.px(6, 5, 'red'); c.px(9, 5, 'red'); },
  siren(c) { c.circ(7.5, 4, 3, 'skin'); c.rect(4, 1, 7, 2, 'pink'); c.poly([[5, 7], [10, 7], [11, 11], [13, 15], [8, 13], [3, 15], [4, 11]], 'sea'); },
  deepone(c) { c.circ(7.5, 7, 6, 'sea'); c.circ(5, 6, 1.8, 'yellow'); c.circ(10, 6, 1.8, 'yellow'); c.line(4, 11, 11, 11, 'dark'); c.line(1, 9, 3, 7, 'sea', 'd'); c.line(14, 9, 12, 7, 'sea', 'd'); },
  stall(c) { c.rect(2, 8, 12, 7, 'wood'); for (let i = 0; i < 4; i++) c.rect(1 + i * 3.5, 4, 3.5, 4, i % 2 ? 'white' : 'red'); G.fishMini(c); },
  fishMini(c) { c.ell(7.5, 11, 3, 1.5, 'sea'); },
  portal(c, m = 'purple') { c.ell(7.5, 8, 5.5, 7, m); c.ell(7.5, 8, 3, 5, 'dark'); c.ell(7.5, 8, 1.5, 3, m, 'l'); },
  globe(c) { c.circ(7.5, 8, 6.5, 'blue'); c.poly([[4, 4], [8, 3], [9, 7], [5, 9]], 'green'); c.poly([[9, 10], [12, 9], [12, 13]], 'green'); },
  arrowUp(c, m = 'green') { c.poly([[7.5, 1], [14, 8], [10, 8], [10, 15], [5, 15], [5, 8], [1, 8]], m); },
  amulet(c) { c.ring(7.5, 5, 4, 1, 'gold'); c.rect(3, 1, 10, 4, null); c.gem && G.gem(c, 'purple'); },
  stairs(c) { for (let i = 0; i < 4; i++) c.rect(1 + i * 3.5, 12 - i * 3, 3.5, 3 + i * 3, 'steel'); c.rect(0, 14, 16, 2, 'dark'); },
  chest(c) { c.rect(2, 6, 12, 8, 'wood'); c.rect(2, 4, 12, 3, 'wood', 'l'); c.rect(2, 8, 12, 1, 'gold'); c.rect(7, 7, 2, 3, 'gold'); },
  dragonScale(c) { for (const [x, y] of [[4, 4], [11, 4], [7.5, 8], [4, 12], [11, 12]]) c.circ(x, y, 3, 'green'); },
  dragon(c) { c.poly([[2, 13], [4, 6], [9, 3], [14, 5], [12, 8], [9, 8], [8, 13]], 'red'); c.px(10, 5, 'yellow'); c.poly([[9, 2], [11, 0], [11, 3]], 'red'); },
  claw(c, m = 'bone') { for (const x of [3, 7, 11]) c.poly([[x, 14], [x + 2, 14], [x + 3, 5], [x + 1, 1]], m); },
  tornado(c, m = 'white') { for (let i = 0; i < 6; i++) c.ell(8 + Math.sin(i) * 1.5, 2 + i * 2.3, 7 - i, 1.2, m); },
  cauldron(c) { c.ell(7.5, 10, 6.5, 4.5, 'dark'); c.rect(1, 5, 14, 2, 'dark', 'l'); c.ell(7.5, 6, 5, 1.2, 'green'); c.line(3, 15, 4, 13, 'dark'); c.line(12, 15, 11, 13, 'dark'); },
  vein(c) { c.rect(1, 1, 14, 14, 'brown'); c.poly([[4, 13], [6, 8], [9, 9], [12, 3], [13, 5], [10, 11], [7, 10], [6, 14]], 'cyan'); },
  element(c, k) {
    if (k === 'metal') { c.poly([[2, 13], [7.5, 2], [13, 13]], 'steel'); c.line(7.5, 4, 7.5, 12, 'steel', 'l'); }
    else if (k === 'fire') G.flame(c, 'red', 'orange');
    else if (k === 'wood') G.leaf(c);
    else if (k === 'water') G.drop(c);
    else if (k === 'earth') { c.rect(2, 8, 12, 6, 'brown'); c.poly([[2, 8], [6, 4], [10, 6], [14, 8]], 'yellow'); }
  },
  aura(c) { c.ring(7.5, 8, 7, 1, 'cyan'); c.ring(7.5, 8, 4.5, 1, 'cyan'); c.circ(7.5, 8, 2, 'white'); },
  beast(c) { c.poly([[2, 12], [4, 5], [7, 8], [8, 3], [11, 7], [14, 4], [13, 12]], 'brown'); c.px(6, 9, 'red'); c.px(10, 9, 'red'); },
  disciple(c) { G.face(c, 'skin', 'dark'); c.rect(4, 13, 8, 3, 'white'); },
  qi(c) { G.orb(c, 'jade'); c.line(4, 8, 11, 8, 'white'); },
  sun2(c) { G.sun(c); },
};
// ── 아이콘 목록: 키 → [모양, ...인자]
const R = {
  // 판타지
  u_legend: ['banner', 'blue'], fx_arrow: ['arrowUp', 'steel'], r_stew: ['drop', 'green'], fx_song: ['note'], b_atk: ['note', 'red'], b_fury: ['drum'],
  b_regen: ['heart', 'green'], fx_holy: ['cross', 'yellow'], u_god: ['wing'], q_peak: ['mountain'], fx_flame: ['flame'], fx_fire: ['flame', 'red', 'orange'],
  st_haste: ['hourglass', 'cyan'], d_shield: ['shield'], u_armor: ['armor'], a_escape: ['boot'], fx_zap: ['bolt', 'cyan'], a_thunder: ['storm'], a_seal: ['seal'],
  ui_gold: ['coins'], n_auto_duel: ['swords'], i_scale: ['dragonScale'], r_dragon: ['dragon'], rl_herb: ['herb'], n_auto_build: ['gear'], n_auto_break: ['fist'],
  fx_storm: ['tornado'], f_stairs: ['stairs'], ui_ess: ['crystal'], b_gold: ['coin'],
  // 무협
  w_wuxia: ['sword'], j_nangin: ['straw'], x_table: ['table'], c_coin: ['holecoin'], a_gong: ['gong'], ui_star: ['star'], j_geomseon: ['halo', 'cyan'],
  j_jeja: ['face', 'skin', 'dark'], j_jangro: ['elder'], s_naegong: ['swirl', 'jade'], x_statue: ['statue'], s_geom: ['book', 'blue'], v_plum: ['plum'],
  a_sword: ['sword', 'cyan', 'jade'], wa_crown: ['crown'], s_gyeong: ['feather'], s_tuna: ['swirl', 'white'], q_qi: ['qi'], a_dao: ['taiji'], ww_sword: ['sword'],
  s_yangsaeng: ['peach'], q_herb: ['herb'], s_magong: ['skull', 'red'], q_pill: ['pill'], it_pill: ['bottle'], j_pyosa: ['flag', 'red'], it_daehwan: ['pill', 'red'],
  wa_halo: ['halo'], j_cheonha: ['sun2'], w_board: ['board'], it_manual: ['book'], w_dummy: ['dummy'], wa_band: ['band'], j_maengju: ['banner', 'red'],
  // 수선
  q_aura3: ['aura'], e_metal: ['element', 'metal'], e_fire: ['element', 'fire'], e_wood: ['element', 'wood'], e_water: ['element', 'water'], e_earth: ['element', 'earth'],
  fx_sword: ['sword', 'white', 'cyan'], q_beast: ['claw'], q_stone: ['gem', 'purple'], q_disciple: ['disciple'], q_furnace: ['cauldron'], q_herbplot: ['sprout'],
  q_vein: ['vein'], q_gate: ['gate'], q_cloud: ['cloud'], q_pagoda: ['pagoda'],
  // SF
  s_core: ['reactor'], rs_overclock: ['chip', 'red'], rs_slots: ['grid'], rs_regen: ['wrench'], t_laser: ['turret', 'steel', 'cyan'], t_amp: ['orb', 'pink'],
  t_rail: ['turret', 'dark', 'yellow'], t_cryo: ['snow'], t_mortar: ['turret', 'steel', 'pink'], t_drone: ['ufo'], t_tesla: ['bolt', 'purple'], t_missile: ['missile'],
  fx_bolt: ['bolt', 'cyan'], a_field: ['dome'], s_credit: ['card'], fx_ice: ['snow', 'blue'], fx_dart: ['missile'], rs_core: ['shield', 'steel', 'cyan'],
  rs_salvage: ['gear', 'brown'], e_boss: ['ufo'], ui_sign: ['rune'], n_sands: ['hourglass'],
  // 크툴루
  w_cthulhu: ['tentacle'], item_line: ['reel'], item_wire: ['spool'], sea_w3: ['wave'], c_candle: ['candle'], sea_rock: ['rock'], x_lantern: ['lantern'],
  fs_blind: ['fish', 'white', 'dark'], cu_foil: ['seal', 'green'], c_tentacle: ['tentacle', 'purple'], fs_cod: ['fish'], n_auto_tier: ['gear', 'sea'],
  c_investigator: ['hat'], c_lamp: ['lantern', 'orange'], cu_cultist: ['hood'], fs_bone: ['boneFish'], fs_kraken: ['kraken'], fs_deepone: ['deepone'],
  fs_crab: ['crab'], fs_jelly: ['jelly'], cu_luck: ['clover'], fs_dagon: ['idol'], cu_mind: ['brain'], c_ward: ['elderSign'], sea_w1: ['drop', 'sea'],
  c_sign: ['sign'], fs_siren: ['siren'], c_hat: ['hat', 'dark'], c_kiosk: ['stall'], c_house: ['house', 'brown', 'dark'], c_horror: ['eye', 'green', 'red'],
  cu_ritual: ['ritual'], c_cultist: ['hood', 'red'],
  // 넥서스·별
  ui_nexus: ['portal'], w_xianxia: ['cloud', 'jade'], w_scifi: ['reactor'], w_fantasy: ['sword', 'steel', 'gold'], n_resonance: ['wave', 'purple'],
  n_essflow: ['swirl', 'purple'], ui_prestige: ['orb', 'purple'], ss_keep_worlds: ['globe'], ss_keep_auto: ['gear', 'gold'], ss_head_start: ['arrowUp'],
  ss_star_ess: ['star', 'purple'], ss_relic_amp: ['gem', 'gold'],
};
function draw(key) {
  const [shape, ...args] = R[key], c = canvas();
  G[shape](c, ...args);
  return bake(c);
}
const icons = {};
for (const k of Object.keys(R)) icons['ni_' + k] = { img: draw(k) };
module.exports = icons;
