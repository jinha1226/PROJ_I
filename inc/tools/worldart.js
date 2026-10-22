// 남은 DCSS 그림을 0x72 화풍으로 바꾼다 (같은 키로 덮는다 — art72.js가 assets/art/에 저장).
// 아이콘은 nodeicons.js의 모양을 그대로 쓰고(트리 노드와 화면 그림이 같아진다), 없는 것은 여기서 새로 그린다.
// 바닥·물빛 같은 타일은 테두리 없이 이어지는 무늬로.
const NI = require('./nodeicons'), { canvas, bake, G: SH } = NI;
let seed = 3;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const one = fn => { const c = canvas(); fn(c); return bake(c); };
const many = (n, fn, outline = true) => Array.from({ length: n }, (_, i) => { const c = canvas(); fn(c, i); return bake(c, outline); });
const speck = (c, m, n, t) => { for (let k = 0; k < n; k++) c.px(Math.floor(rnd() * 16), Math.floor(rnd() * 16), m, t); };

// ── 새 모양
const S = {
  key(c) { c.ring(4.5, 5, 3.2, 1.4, 'gold'); c.rect(7, 4, 8, 2, 'gold'); c.rect(12, 6, 2, 3, 'gold'); c.rect(9, 6, 2, 2, 'gold'); },
  flute(c) { c.line(1, 13, 14, 2, 'wood', null, 2); for (const t of [0.3, 0.45, 0.6, 0.75]) c.px(1 + 13 * t, 13 - 11 * t, 'dark'); c.px(14, 2, 'purple', 'l'); },
  gourd(c) { c.circ(7.5, 11, 4, 'purple'); c.circ(7.5, 5, 2.6, 'purple'); c.rect(7, 1, 2, 2, 'gold'); c.rect(4, 8, 8, 1, 'gold'); },
  beads(c) { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.circ(7.5 + Math.cos(a) * 5, 7 + Math.sin(a) * 5, 1.3, 'brown'); } c.line(7.5, 12, 7.5, 15, 'red'); },
  pouch(c) { c.poly([[3, 7], [12, 7], [14, 14], [1, 14]], 'steel'); c.rect(5, 4, 6, 3, 'steel'); c.line(4, 7, 11, 7, 'red'); },
  plate(c) { c.poly([[2, 3], [13, 2], [14, 12], [3, 14]], 'steel'); for (const [x, y] of [[4, 5], [11, 4], [12, 11], [5, 12]]) c.px(x, y, 'dark'); c.line(4, 9, 11, 7, 'steel', 'd'); },
  altar(c) { c.rect(2, 9, 12, 6, 'steel'); c.rect(1, 8, 14, 2, 'steel', 'l'); c.poly([[7.5, 1], [10, 5], [7.5, 8], [5, 5]], 'purple'); },
  lock(c) { c.ring(7.5, 6, 3.5, 1.5, 'steel'); c.rect(3, 7, 10, 8, 'gold'); c.rect(7, 9, 2, 3, 'dark'); },
  bed(c) { c.rect(1, 9, 14, 3, 'wood'); c.rect(1, 6, 3, 9, 'wood'); c.rect(4, 7, 10, 2, 'white'); c.rect(2, 12, 2, 3, 'wood'); c.rect(12, 12, 2, 3, 'wood'); },
  towel(c) { c.circ(7.5, 10, 5, 'white'); c.rect(2, 10, 12, 5, null); c.ell(7.5, 10, 5, 2, 'bone'); c.poly([[3, 3], [12, 3], [11, 7], [4, 7]], 'blue'); },
  eel(c) { for (let i = 0; i < 12; i++) c.circ(2 + i, 8 + Math.sin(i * 0.8) * 2.5, 1.6, 'yellow'); c.px(13, 7 + Math.sin(11 * 0.8) * 2.5, 'dark'); },
  octo(c) { c.ell(7.5, 6, 5, 4.5, 'orange'); for (const x of [3, 6, 9, 12]) c.line(x, 9, x + (x < 8 ? -1 : 1), 15, 'orange', null, 2); c.px(5.5, 6, 'dark'); c.px(9.5, 6, 'dark'); },
  ghostFish(c) { SH.fish(c, 'white', 'cyan'); c.px(8, 6, 'cyan', 'l'); },
  blob(c, m = 'green') { c.ell(7.5, 10, 6.5, 5, m); c.circ(5, 6, 3, m); c.circ(10, 7, 2.5, m); c.px(6, 9, 'yellow'); c.px(10, 10, 'yellow'); },
  starSpawn(c) { SH.star(c, 'purple'); c.circ(7.5, 8, 2, 'green'); c.px(7.5, 8, 'yellow'); },
  thrash(c) { for (const [x, d] of [[3, 1], [7.5, -1], [12, 1]]) for (let i = 0; i < 13; i++) c.circ(x + Math.sin(i * 0.6) * d * 1.5, 15 - i, Math.max(0.8, 1.8 - i * 0.07), 'red'); c.px(7, 4, 'yellow'); },
  eyeStalk(c) { for (let i = 0; i < 8; i++) c.circ(7.5 + Math.sin(i * 0.7), 15 - i, 1.4, 'green'); SH.eye(c, 'yellow', 'green'); },
  bigCrab(c) { SH.crab(c, 'purple'); c.px(7.5, 9, 'red'); },
  disciple2(c) { SH.face(c, 'skin', 'dark'); c.rect(3, 13, 10, 3, 'blue'); c.rect(6, 0, 4, 2, 'blue'); },
  master(c) { SH.elder(c); c.rect(5, 0, 6, 2, 'gold'); },
  manor(c) { SH.house(c, 'wood', 'blue'); c.rect(1, 13, 14, 2, 'steel'); },
  // 수선 기운 고리 (프레임): 금빛 고리가 숨 쉬듯
  aura(c, i, m) { c.ring(7.5, 8, 6 + (i % 2), 1, m); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + i * 0.4; c.px(7.5 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, m, 'l'); } },
  // 크툴루 촉수 (변형마다 구부러짐이 다르다)
  tent(c, i) { const ph = i * 0.8, m = i % 2 ? 'purple' : 'green'; for (let k = 0; k < 15; k++) c.circ(7.5 + Math.sin(k * 0.45 + ph) * 3, 15 - k, Math.max(0.8, 2.6 - k * 0.12), m); for (const y of [12, 9, 6]) c.px(7.5 + Math.sin((15 - y) * 0.45 + ph) * 3 + 1.5, y, 'pink'); },
};
const draw = (shape, ...a) => one(c => (S[shape] || SH[shape])(c, ...a));

const out = {};
// 1) 노드 아이콘과 같은 모양 (그 키로도 덮는다)
const SAME = ['a_gong', 'a_thunder', 'c_coin', 'c_horror', 'cu_mind', 'd_shield', 'e_earth', 'e_fire', 'e_metal', 'e_water', 'e_wood', 'fs_blind', 'fs_bone', 'fs_cod',
  'fs_crab', 'fs_dagon', 'fs_deepone', 'fs_jelly', 'fs_kraken', 'fs_siren', 'fx_fire', 'fx_sword', 'it_daehwan', 'it_manual', 'it_pill', 'item_line', 'j_cheonha',
  'j_geomseon', 'j_jangro', 'j_jeja', 'j_maengju', 'j_nangin', 'j_pyosa', 'n_auto_build', 'q_furnace', 'q_gate', 'q_herbplot', 'q_peak', 'q_pill', 'q_stone',
  's_credit', 's_geom', 's_gyeong', 's_magong', 's_naegong', 's_tuna', 's_yangsaeng', 'u_god', 'ui_ess', 'ui_nexus', 'ui_prestige', 'ui_sign', 'ui_star',
  'item_wire', 'cu_cultist', 'c_candle', 'c_tentacle', 'cu_luck', 'cu_ritual', 'c_ward', 'c_sign', 'q_beast', 'q_disciple'];
for (const k of SAME) if (NI.icons['ni_' + k]) out[k] = { img: NI.icons['ni_' + k].img };
// 2) 새로
Object.assign(out, {
  fs_acrab: { img: draw('bigCrab') }, fs_eel: { img: draw('eel') }, fs_eye: { img: draw('eyeStalk') }, fs_ghost: { img: draw('ghostFish') },
  fs_mass: { img: draw('blob', 'purple') }, fs_octo: { img: draw('octo') }, fs_slime: { img: draw('blob', 'green') }, fs_star: { img: draw('starSpawn') },
  fs_thrash: { img: draw('thrash') },
  it_manor: { img: draw('manor') }, it_room: { img: draw('bed') }, it_sword: { img: draw('sword', 'steel', 'red') },
  j_daejeja: { img: draw('disciple2') }, j_jangmun: { img: draw('master') }, j_jumso: { img: draw('towel') },
  ui_altar: { img: draw('altar') }, ui_lock: { img: draw('lock') },
  // 세계 아이콘 (왼쪽 세계 목록·넥서스): 한눈에 갈리게
  w_fantasy: { img: one(c => { SH.shield(c, 'steel', 'blue'); c.line(9, 12, 15, 1, 'white', null, 1); c.line(8, 10, 11, 13, 'gold'); }) },
  w_wuxia: { img: one(c => { c.poly([[0, 7], [7.5, 1], [15, 7]], 'yellow'); c.line(1, 7, 14, 7, 'yellow', 'd'); c.circ(7.5, 10, 3, 'skin'); c.line(2, 15, 13, 9, 'steel'); c.px(2, 14, 'red'); c.px(1, 15, 'red'); }) },
  w_xianxia: { img: one(c => { c.ell(5, 12, 4, 2.2, 'white'); c.ell(10, 12, 4.5, 2.6, 'white'); c.line(3, 9, 13, 2, 'cyan', null, 2); c.line(2, 10, 4, 8, 'jade', null, 1); }) },
  w_scifi: { imgs: [require('./sfart').t_laser.imgs[0]] },
  w_cthulhu: { img: one(c => { SH.eye(c, 'green', 'yellow'); for (const x of [2, 13]) for (let i = 0; i < 5; i++) c.circ(x + Math.sin(i) * 0.8, 15 - i, 1.2, 'purple'); }) },
  q_vein: { img: one(c => { c.poly([[4, 14], [6, 6], [8, 9], [10, 3], [12, 14]], 'cyan'); c.line(8, 9, 8, 14, 'cyan', 'l'); }) },
  // 유물
  rl_dagger: { img: draw('dagger') }, rl_herb: { img: draw('herb', 'brown') }, rl_beads: { img: draw('beads') }, rl_pouch: { img: draw('pouch') },
  rl_talisman: { img: draw('seal') }, rl_spirit: { img: draw('gem', 'purple') }, rl_chip: { img: draw('chip', 'dark') }, rl_plating: { img: draw('plate') },
  rl_coin: { img: draw('coin', 'green') }, rl_string: { img: draw('arrowUp', 'wood') }, rl_plum: { img: draw('plum') }, rl_jade: { img: draw('taiji') },
  rl_battery: { img: draw('battery', 'cyan') }, rl_seal: { img: draw('sign', 'purple') }, rl_heart: { img: draw('heart', 'red') }, rl_cheonma: { img: draw('book', 'dark') },
  rl_gourd: { img: draw('gourd') }, rl_antimatter: { img: draw('orb', 'purple') }, rl_necro: { img: draw('book', 'brown') }, rl_key: { img: draw('key') },
  rl_flute: { img: draw('flute') },
  // 수선 기운 고리 (경지 무리마다 색): 0 흰빛 · 1 하늘 · 2 금 · 3 보라
  q_aura0: { imgs: many(4, (c, i) => S.aura(c, i, 'white')) }, q_aura1: { imgs: many(3, (c, i) => S.aura(c, i, 'cyan')) },
  q_aura2: { imgs: many(3, (c, i) => S.aura(c, i, 'yellow')) }, q_aura3: { imgs: many(4, (c, i) => S.aura(c, i, 'purple')) },
  // 크툴루 촉수·바위
  sea_tent: { imgs: many(8, (c, i) => S.tent(c, i)) },
  sea_rock: { imgs: many(5, (c, i) => { seed = 40 + i; c.poly([[0, 15], [1 + rnd() * 3, 6 + rnd() * 3], [6 + rnd() * 3, 3 + rnd() * 3], [12 + rnd() * 2, 6 + rnd() * 3], [15, 15]], i % 2 ? 'dark' : 'steel'); speck(c, 'sea', 3, 'l'); }) },
});
// 3) 타일 (테두리 없이): 수선 바닥·영맥 바닥, 크툴루 물빛 4단·파도
const tex = (n, base, fn) => many(n, (c, i) => { seed = 9 + i * 31 + base.length; c.rect(0, 0, 16, 16, base, 'm'); fn(c, i); }, false);
Object.assign(out, {
  q_floor: { imgs: tex(4, 'frost', c => { c.rect(0, 0, 16, 1, 'frost', 'l'); c.rect(0, 0, 1, 16, 'frost', 'l'); c.rect(0, 15, 16, 1, 'frost', 'd'); c.rect(15, 0, 1, 16, 'frost', 'd'); speck(c, 'frost', 4, 'd'); }) },
  q_veinfloor: { imgs: tex(4, 'abyss', (c, i) => { c.line(2, 14, 7, 8, 'cyan', 'm'); c.line(7, 8, 13, 3 + i, 'cyan', 'l'); speck(c, 'cyan', 3, 'm'); }) },
  sea_w0: { imgs: tex(1, 'sea', c => speck(c, 'sea', 10, 'l')) },
  sea_w1: { imgs: tex(1, 'abyss', c => speck(c, 'sea', 8, 'm')) },
  sea_w2: { imgs: tex(1, 'navy', c => speck(c, 'abyss', 8, 'l')) },
  sea_w3: { imgs: tex(4, 'iron', c => speck(c, 'navy', 8, 'l')) },
  sea_wave: { imgs: many(2, (c, i) => { for (let x = 0; x < 16; x++) { const y = 10 + Math.round(Math.sin((x + i * 3) * 0.7) * 1.5); c.rect(x, y, 1, 16 - y, 'sea', 'm'); c.px(x, y, 'white', 'l'); } }, false) },
});
module.exports = out;
