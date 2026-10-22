// SF 그림을 0x72 화풍(16×16, 외곽선·3단 음영 규칙)으로 새로 그린다: 포탑 8종 · 적 5종 · 코어 · 포대 자리 · 포털 · 구역 6곳 타일.
// 같은 키의 DCSS 타일보다 우선한다 (art72.js가 assets/art/에 저장). 규칙은 tools/nodeicons.js와 같다.
const { canvas, bake } = require('./nodeicons');
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const img = (fn, outline = true) => { const c = canvas(); fn(c); return bake(c, outline); };
const frames = (n, fn, outline = true) => Array.from({ length: n }, (_, i) => img(c => fn(c, i), outline));

// ── 포탑 (받침 + 머리, 2프레임: 불빛이 깜빡인다)
const base = (c, m = 'steel') => { c.rect(2, 11, 12, 4, m); c.rect(3, 10, 10, 1, m, 'l'); c.px(3, 13, 'dark'); c.px(12, 13, 'dark'); };
const T = {
  t_laser: (c, i) => { base(c); c.circ(7.5, 8, 3.5, 'steel'); c.line(9, 7, 14, 2, 'cyan', null, 2); c.px(7, 7, i ? 'cyan' : 'white', 'l'); },
  t_amp: (c, i) => { base(c, 'dark'); c.rect(6, 6, 4, 5, 'steel'); c.circ(7.5, 4, 3, 'pink'); c.ring(7.5, 4, i ? 5 : 4, 1, 'pink', 'l'); c.rect(0, 9, 16, 1, null); },
  t_rail: (c, i) => { base(c, 'dark'); c.rect(4, 7, 6, 4, 'steel'); c.line(8, 6, 15, 2, 'yellow', null, 1); c.line(8, 8, 15, 4, 'yellow', null, 1); c.line(9, 7, 15, 3, 'dark'); c.px(6, 8, i ? 'yellow' : 'orange', 'l'); },
  t_cryo: (c, i) => { base(c); c.rect(4, 4, 6, 7, 'blue'); c.rect(5, 2, 4, 2, 'steel'); c.line(10, 6, 14, 6, 'cyan', null, 2); c.px(14 + (i ? 1 : 0), 4, 'white'); c.px(14, 8 - (i ? 1 : 0), 'white'); },
  t_mortar: (c, i) => { base(c); c.ell(7.5, 9, 5, 2.5, 'steel'); c.poly([[5, 9], [10, 9], [11, 2], [6, 2]], 'pink'); c.rect(6, 1, 5, 2, 'dark'); c.px(8, 1, i ? 'orange' : 'yellow'); },
  t_drone: (c, i) => { const y = i ? 1 : 0; c.ell(7.5, 13, 4, 1, 'dark', 'm'); c.ell(7.5, 7 - y, 6, 2.5, 'steel'); c.ell(7.5, 5 - y, 3, 2, 'green'); c.line(1, 5 - y, 4, 5 - y, 'steel', 'l'); c.line(11, 5 - y, 14, 5 - y, 'steel', 'l'); c.px(7, 4 - y, 'white'); },
  t_tesla: (c, i) => { base(c, 'dark'); for (let y = 4; y < 11; y += 2) c.rect(6, y, 4, 1, 'gold'); c.rect(7, 3, 2, 8, 'steel'); c.circ(7.5, 3, 2.5, 'purple'); if (i) { c.px(3, 2, 'white'); c.px(12, 4, 'white'); } else { c.px(12, 1, 'white'); c.px(3, 5, 'white'); } },
  t_missile: (c, i) => { base(c); c.rect(3, 6, 10, 5, 'steel'); for (const x of [5, 10]) { c.poly([[x - 1, 6], [x + 1, 6], [x + 1, 1], [x, 0], [x - 1, 1]], 'white'); c.px(x, 1, 'red'); } c.px(7.5, 8, i ? 'red' : 'orange'); },
};
// ── 적 (2프레임)
const E = {
  e_drone: (c, i) => { c.circ(7.5, 8, 4, 'steel'); c.circ(7.5, 8, 1.6, 'red'); c.line(1, i ? 3 : 4, 14, i ? 4 : 3, 'dark'); c.line(7.5, 4, 7.5, 3, 'dark'); },
  e_walker: (c, i) => { c.rect(4, 3, 8, 6, 'steel'); c.rect(6, 4, 4, 2, 'red'); c.line(5, 9, i ? 3 : 5, 15, 'dark', null, 2); c.line(10, 9, i ? 12 : 10, 15, 'dark', null, 2); c.line(12, 5, 15, 6, 'steel'); },
  e_swarm: (c, i) => { for (const [x, y] of i ? [[4, 5], [11, 6], [7, 11]] : [[5, 4], [10, 7], [6, 11]]) { c.circ(x, y, 2.2, 'green'); c.px(x, y, 'yellow'); } },
  e_shield: (c, i) => { c.rect(2, 8, 12, 5, 'dark'); c.rect(4, 5, 7, 4, 'steel'); c.line(8, 6, 14, 6, 'steel'); c.poly([[0, 3], [3, 2], [3, 14], [0, 13]], 'cyan'); for (const x of [4, 8, 12]) c.circ(x, 13 + (i ? 0.4 : 0), 1.3, 'dark', 'l'); },
  e_boss: (c, i) => { c.ell(7.5, 9, 7.5, 3.5, 'steel'); c.ell(7.5, 6, 4, 3, 'purple'); c.rect(0, 9, 16, 1, 'dark'); for (const x of [2, 5, 10, 13]) c.px(x, 10, (x + i) % 2 ? 'red' : 'yellow'); c.circ(7.5, 6, 1.4, 'red'); },
};
// ── 코어 (6프레임: 고리가 돈다) · 포대 자리 · 포털 (4프레임)
const core = (c, i) => {
  c.rect(1, 11, 14, 4, 'steel'); c.rect(2, 10, 12, 1, 'steel', 'l');
  c.circ(7.5, 6, 5, 'dark'); c.circ(7.5, 6, 3, 'cyan'); c.circ(7.5, 6, 1.4, 'white');
  const a = i * Math.PI / 3; for (const k of [0, Math.PI]) c.px(7.5 + Math.cos(a + k) * 5, 6 + Math.sin(a + k) * 5, 'cyan', 'l');
};
const pad = c => { c.rect(1, 1, 14, 14, 'dark'); c.rect(3, 3, 10, 10, 'steel', 'd'); for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) c.px(x, y, 'cyan', 'l'); c.rect(6, 6, 4, 4, 'dark'); };
const portal = (c, i) => { c.ell(7.5, 8, 6.5, 6.5, 'purple'); c.ell(7.5, 8, 4.5, 4.5, 'dark'); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + i * 0.5; c.px(7.5 + Math.cos(a) * 3, 8 + Math.sin(a) * 3, 'pink', 'l'); } c.circ(7.5, 8, 1.2, 'pink', 'l'); };

// ── 구역 타일 (테두리 없이 이어지는 무늬, 3변형): 바닥 g · 통로 p · 벽 w
function tex(mat, fn) { return frames(3, (c, v) => { seed = 11 + v * 97 + mat.length; c.rect(0, 0, 16, 16, mat, 'm'); fn(c, v); }, false); }
const speck = (c, m, n, t) => { for (let k = 0; k < n; k++) c.px(Math.floor(rnd() * 16), Math.floor(rnd() * 16), m, t); };
const plate = (c, m) => { c.rect(0, 0, 16, 1, m, 'l'); c.rect(0, 0, 1, 16, m, 'l'); c.rect(0, 15, 16, 1, m, 'd'); c.rect(15, 0, 1, 16, m, 'd'); for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) c.px(x, y, m, 'l'); };
const block = (c, m) => { c.rect(0, 0, 16, 2, m, 'l'); c.rect(0, 0, 2, 16, m, 'l'); c.rect(0, 14, 16, 2, m, 'd'); c.rect(14, 0, 2, 16, m, 'd'); };
const THEMES = [
  // 0 궤도 정거장: 강철판 바닥 · 격자 통로(노란 줄) · 격벽
  { g: c => { plate(c, 'iron'); speck(c, 'iron', 4, 'l'); }, gm: 'iron', p: c => { for (let y = 1; y < 16; y += 3) c.rect(1, y, 14, 1, 'steel', 'd'); c.rect(0, 0, 16, 1, 'yellow'); }, pm: 'steel', w: c => { block(c, 'steel'); c.rect(5, 6, 6, 4, 'steel', 'd'); }, wm: 'steel' },
  // 1 붉은 행성: 붉은 흙 · 금속판 통로 · 붉은 암석
  { g: c => { speck(c, 'rust', 14, 'l'); speck(c, 'rust', 10, 'd'); }, gm: 'rust', p: c => { plate(c, 'sand'); c.line(3, 8, 12, 8, 'sand', 'd'); }, pm: 'sand', w: c => { block(c, 'brown'); c.line(3, 4, 8, 9, 'brown', 'd'); c.line(8, 9, 12, 7, 'brown', 'd'); }, wm: 'brown' },
  // 2 얼음 위성: 서리 바닥 · 어두운 금속 통로 · 얼음 덩어리
  { g: c => { speck(c, 'frost', 12, 'l'); speck(c, 'white', 3, 'd'); }, gm: 'frost', p: c => { plate(c, 'dark'); c.rect(7, 2, 2, 12, 'dark', 'l'); }, pm: 'dark', w: c => { block(c, 'cyan'); c.line(3, 12, 11, 3, 'cyan', 'l'); }, wm: 'cyan' },
  // 3 수정 소행성대: 어두운 청록 바위 · 빛나는 룬 통로 · 수정 벽
  { g: c => { speck(c, 'abyss', 10, 'l'); speck(c, 'jade', 3, 'd'); }, gm: 'abyss', p: c => { c.rect(0, 0, 16, 16, 'dark', 'm'); for (const [x, y] of [[3, 3], [11, 4], [7, 9], [3, 12], [12, 12]]) { c.px(x, y, 'cyan', 'l'); c.px(x + 1, y, 'cyan', 'm'); } }, pm: 'dark', w: c => { block(c, 'jade'); c.poly([[4, 13], [7, 3], [10, 13]], 'cyan'); }, wm: 'jade' },
  // 4 외계 군체: 핏줄 바닥 · 산성 점액 통로 · 살덩이 벽
  { g: c => { c.line(0, 4, 16, 9, 'flesh', 'l'); c.line(5, 0, 9, 16, 'flesh', 'l'); speck(c, 'flesh', 6, 'd'); }, gm: 'flesh', p: c => { speck(c, 'acid', 14, 'l'); speck(c, 'green', 3, 'm'); }, pm: 'acid', w: c => { block(c, 'pink'); c.circ(5, 6, 2.5, 'pink', 'l'); c.circ(11, 10, 2.5, 'pink', 'd'); }, wm: 'pink' },
  // 5 모선 내부: 남색 판 · 붉은 에너지 통로 · 보라 금속 벽
  { g: c => { plate(c, 'navy'); c.px(8, 8, 'purple', 'm'); }, gm: 'navy', p: c => { c.rect(0, 6, 16, 4, 'red', 'l'); c.rect(0, 7, 16, 2, 'orange', 'l'); }, pm: 'red', w: c => { block(c, 'purple'); c.rect(6, 6, 4, 4, 'purple', 'd'); c.px(7, 7, 'pink', 'l'); }, wm: 'purple' },
];
const out = {};
for (const [k, f] of Object.entries(T)) out[k] = { imgs: frames(2, f) };
for (const [k, f] of Object.entries(E)) out[k] = { imgs: frames(2, f) };
out.s_core = { imgs: frames(6, core) };
out.s_pad = { img: img(pad) };
out.s_portal = { imgs: frames(4, portal) };
THEMES.forEach((th, i) => {
  const [g, p, w] = i ? ['s_g' + i, 's_p' + i, 's_w' + i] : ['s_ground', 's_path', 's_wall'];
  out[g] = { imgs: tex(th.gm, th.g) }; out[p] = { imgs: tex(th.pm, th.p) }; out[w] = { imgs: tex(th.wm, th.w) };
});
module.exports = out;
