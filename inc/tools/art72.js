// 0x72 DungeonTileset II(CC0)로 게임 그림 만들기: node tools/art72.js
// SPEC의 키마다 원본 프레임(assets/src/0x72/frames)을 골라 편집(색 바꾸기·뒤집기·겹치기)하고
// assets/art/<키>[_n].png로 저장한 뒤 js/artset.js(키 → 프레임 수)를 만든다. 같은 키의 DCSS 타일보다 우선한다.
// 프레임이 여럿이면 캐릭터는 애니메이션으로 돌고, 지형은 칸마다 다른 변형이 된다. <키>_run이 있으면 걸을 때 쓴다.
const fs = require('fs'), path = require('path'), PNG = require('./png'), PIX = require('./pix');
// 원본: 0x72 팩 + 같은 그림체의 보충 팩(Superdark, sd_ 접두어). 보충 팩은 32×32 캔버스 가운데에 그려져 있어 여백을 잘라 쓴다.
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'assets', 'art');
const SRCS = ['0x72', 'superdark'].map(d => path.join(ROOT, 'assets', 'src', d, 'frames'));

// ── 편집 ──
const where = n => SRCS.map(d => path.join(d, n.endsWith('.png') ? n : n + '.png')).find(f => fs.existsSync(f));
const load = n => { const f = where(n); if (!f) throw new Error('원본 없음: ' + n); return PNG.read(fs.readFileSync(f)); };
// 애니메이션 프레임: <이름>_f<번호>.png 를 번호 순서로 (번호가 0부터 연속이 아닌 원본도 있다)
const ALL = SRCS.flatMap(d => fs.readdirSync(d));
const frames = n => {
  const re = new RegExp('^' + n + '_f(\\d+)\\.png$'), f = ALL.map(x => x.match(re)).filter(Boolean).sort((a, b) => a[1] - b[1]).map(m => m[0].slice(0, -4));
  return f.length ? f : [n];
};
const clone = im => ({ w: im.w, h: im.h, d: new Uint8Array(im.d) });
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
const OPS = {
  // 색상 회전(도). only: [최소 색상, 최대 색상]이면 그 범위의 색만 돌린다 (예: 빨간 망토만)
  hue(im, { deg, only, sat = 1, light = 0 }) {
    const d = im.d;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
      if (only && !(s > 0.15 && (only[0] <= only[1] ? h >= only[0] && h <= only[1] : h >= only[0] || h <= only[1]))) continue;
      const [r, g, b] = hsl2rgb(h + deg, Math.min(1, s * sat), Math.max(0, Math.min(1, l + light)));
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  },
  // 색을 다른 색으로 (정확히 같은 색만): { '#rrggbb': '#rrggbb' }
  map(im, m) {
    const tab = Object.entries(m).map(([a, b]) => [parseInt(a.slice(1), 16), parseInt(b.slice(1), 16)]), d = im.d;
    for (let i = 0; i < d.length; i += 4) {
      const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      for (const [a, b] of tab) if (c === a) { d[i] = b >> 16; d[i + 1] = (b >> 8) & 255; d[i + 2] = b & 255; }
    }
  },
  // 색을 덮어 칠하기 (어둠·이끼 등): c = [r, g, b, 세기 0~1]
  tint(im, { c: [r, g, b, k] }) {
    const d = im.d;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] += (r - d[i]) * k; d[i + 1] += (g - d[i + 1]) * k; d[i + 2] += (b - d[i + 2]) * k; }
  },
  vflip(im) {
    const { w, h } = im, s = new Uint8Array(im.d);
    for (let y = 0; y < h; y++) im.d.set(s.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  },
  flip(im) {
    const { w, h } = im, s = new Uint8Array(im.d);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) im.d.set(s.subarray((y * w + (w - 1 - x)) * 4, (y * w + (w - 1 - x)) * 4 + 4), (y * w + x) * 4);
  },
  // 투명한 곳을 한 색으로 채우기 (벽 윗면을 꽉 찬 돌로): c = '#rrggbb'
  fill(im, { c }) {
    const v = parseInt(c.slice(1), 16), d = im.d;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 255) {
      const a = d[i + 3] / 255;
      d[i] = d[i] * a + (v >> 16) * (1 - a); d[i + 1] = d[i + 1] * a + ((v >> 8) & 255) * (1 - a); d[i + 2] = d[i + 2] * a + (v & 255) * (1 - a); d[i + 3] = 255;
    }
  },
  // 0x72 엘프를 무협 인물로: 색 바꾸기 + 머리 모양(상투·삿갓·관)·수염·머리띠를 프레임마다 머리 꼭대기에 맞춰 그린다.
  // 엘프 색: 머리 #ee8e2e·#facb3e, 눈 #5698cc, 옷깃 #314152, 상의 #4ba747, 허리·바지 #3d734f, (여) 리본 #da4e38
  // o: { hair:[어두운, 밝은], robe:[상의, 바지], collar, ribbon, eyes, knot, hat:'straw'|'crown', beard, band }
  wx(im, o) {
    const { w, h, d } = im, at = (x, y) => (y * w + x) * 4;
    const set = (x, y, c) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const v = parseInt(c.slice(1), 16), i = at(x, y); d[i] = v >> 16; d[i + 1] = (v >> 8) & 255; d[i + 2] = v & 255; d[i + 3] = 255; };
    const col = (x, y) => { const i = at(x, y); return d[i + 3] ? '#' + [0, 1, 2].map(j => d[i + j].toString(16).padStart(2, '0')).join('') : null; };
    let top = 0;
    while (top < h && ![...Array(w).keys()].some(x => d[at(x, top) + 3])) top++;
    // 서양식 뾰족한 머리 끝(머리 오른쪽 바깥) 지우기
    for (let y = top; y < top + 5; y++) for (let x = 14; x < w; x++) d[at(x, y) + 3] = 0;
    const MAP = { '#ee8e2e': o.hair[0], '#facb3e': o.hair[1], '#5698cc': o.eyes || '#3a2a2a', '#314152': o.collar, '#4ba747': o.robe[0], '#3d734f': o.robe[1], '#da4e38': o.ribbon || o.hair[0] };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = col(x, y); if (c && MAP[c]) set(x, y, MAP[c]); }
    const ink = '#222222';
    if (o.band) for (let x = 3; x <= 12; x++) if (col(x, top + 3) && col(x, top + 3) !== ink) set(x, top + 3, o.band);
    if (o.beard) for (const [dx, dy] of [[0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [1, 10], [2, 10], [3, 10], [2, 11]]) set(5 + dx, top + dy, dy === 9 && (dx === 0 || dx === 4) ? '#c9c3b8' : '#e8e2d0');
    if (o.knot && !o.hat) {
      // 상투: 정수리 가운데 작은 머리 뭉치 + 비녀
      for (const [x, y, c] of [[7, -3, ink], [8, -3, ink], [6, -2, ink], [7, -2, o.hair[1]], [8, -2, o.hair[0]], [9, -2, ink], [6, -1, ink], [7, -1, o.hair[0]], [8, -1, o.hair[0]], [9, -1, ink], [5, -2, o.pin || '#d9b44a'], [10, -2, o.pin || '#d9b44a']]) set(x, top + y, c);
    }
    if (o.hat === 'straw') {
      // 삿갓: 넓은 원뿔, 짚 색
      const rows = [[7, 8], [5, 10], [3, 12], [1, 14]];
      rows.forEach(([a, b], i) => { for (let x = a; x <= b; x++) set(x, top - 2 + i, x === a || x === b || i === rows.length - 1 ? ink : i === 1 && x < 8 ? '#f0d58a' : '#d9b44a'); });
    }
    if (o.hat === 'souwester') {
      // 방수 모자(뱃사람): 둥근 정수리, 앞은 짧고 뒤로 길게 처진 챙
      const [hd, hl] = o.hatc || ['#4a4528', '#6b6236'];
      for (let y = -3; y <= 0; y++) for (let x = 5; x <= 10; x++) set(x, top + y, x === 5 || x === 10 || y === -3 ? ink : y === -2 && x < 8 ? hl : hd);
      for (let x = 2; x <= 13; x++) set(x, top + 1, x === 2 || x === 13 ? ink : hd);
      for (let x = 2; x <= 13; x++) set(x, top + 2, ink);
      for (const [x, y] of [[1, 2], [1, 3], [2, 3], [3, 3]]) set(x, top + y, ink);
      set(2, top + 2, hd);
    }
    if (o.hat === 'crown') {
      // 관: 검은 사모 + 금 띠
      for (let y = -4; y <= 0; y++) for (let x = 5; x <= 10; x++) set(x, top + y, x === 5 || x === 10 || y === -4 ? ink : y === -1 ? '#facb3e' : '#2b2b33');
      set(3, top - 2, ink); set(4, top - 2, '#2b2b33'); set(11, top - 2, '#2b2b33'); set(12, top - 2, ink);
    }
  },
  // 다른 프레임을 위에 얹기: { src, x, y }
  over(im, { src, x = 0, y = 0 }) {
    const o = load(src);
    for (let yy = 0; yy < o.h; yy++) for (let xx = 0; xx < o.w; xx++) {
      const tx = x + xx, ty = y + yy, si = (yy * o.w + xx) * 4;
      if (tx < 0 || ty < 0 || tx >= im.w || ty >= im.h || !o.d[si + 3]) continue;
      im.d.set(o.d.subarray(si, si + 4), (ty * im.w + tx) * 4);
    }
  },
};
const edit = (im, ops = []) => { im = clone(im); for (const o of ops) OPS[o.op](im, o); return im; };

// ── 무엇을 어디서 ──
// src: 원본 이름(_anim이면 f0~f3 프레임) 또는 목록(지형 변형), run: 걷기 애니메이션, hit: 맞을 때 한 장, ed: 편집
// 바닥: 대부분 매끈하고 가끔 금·얼룩 (무늬가 너무 잦으면 지저분하다)
const FLOOR = [...Array(18).fill('floor_1'), 'floor_2', 'floor_6'];
// 던전 구간별 색: 지하 → 이끼 → 묘지 → 오크 굴 → 무덤 → 지옥
const BAND = [[], [{ op: 'tint', c: [60, 110, 50, 0.25] }], [{ op: 'hue', deg: 190, sat: 0.6, light: -0.05 }], [{ op: 'hue', deg: -15, sat: 1.4 }], [{ op: 'hue', deg: 240, sat: 0.7, light: -0.08 }], [{ op: 'hue', deg: -20, sat: 2.2, light: -0.05 }, { op: 'tint', c: [160, 30, 20, 0.2] }]];

const SPEC = {
  // 판타지: 파티 (0x72 + 보충 팩)
  knight: { src: 'knight_m_idle_anim', run: 'knight_m_run_anim', hit: 'knight_m_hit_anim_f0' },
  u_archer: { src: 'sd_ranger_idle_anim', run: 'sd_ranger_run_anim' },
  u_cleric: { src: 'sd_normal_cleric_idle_anim' },
  u_bard: { src: 'elf_f_idle_anim', run: 'elf_f_run_anim', hit: 'elf_f_hit_anim_f0' },
  u_mage: { src: 'wizzard_m_idle_anim', run: 'wizzard_m_run_anim', hit: 'wizzard_m_hit_anim_f0', ed: [{ op: 'hue', deg: 150, only: [190, 260] }] },
  u_paladin: { src: 'sd_heavy_knight_idle_anim', run: 'sd_heavy_knight_run_anim' },
  u_dragoon: { src: 'lizard_m_idle_anim', run: 'lizard_m_run_anim', hit: 'lizard_m_hit_anim_f0' },
  u_archmage: { src: 'sd_wizard_idle_anim' },
  u_rogue: { src: 'sd_thief_idle_anim', run: 'sd_thief_run_anim' },
  // 판타지: 몬스터 (구간 순서)
  m_rat: { src: 'tiny_zombie_idle_anim', run: 'tiny_zombie_run_anim' },
  m_slime: { src: 'swampy_anim' },
  m_mush: { src: 'sd_small_mushroom_idle_anim', run: 'sd_small_mushroom_run_anim' },
  m_wolf: { src: 'sd_wolf_idle_anim', run: 'sd_wolf_run_anim' },
  m_goblin: { src: 'goblin_idle_anim', run: 'goblin_run_anim' },
  m_shroom: { src: 'imp_idle_anim', run: 'imp_run_anim' },
  m_bat: { src: 'skelet_idle_anim', run: 'skelet_run_anim' },
  m_bandit: { src: 'sd_bandit_idle_anim', run: 'sd_bandit_run_anim' },
  m_skeleton: { src: 'orc_warrior_idle_anim', run: 'orc_warrior_run_anim' },
  m_warg: { src: 'masked_orc_idle_anim', run: 'masked_orc_run_anim' },
  m_mandrake: { src: 'orc_shaman_idle_anim', run: 'orc_shaman_run_anim' },
  m_gnoll: { src: 'sd_gnoll_scout_idle_anim', run: 'sd_gnoll_scout_run_anim' },
  m_troll: { src: 'ice_zombie_anim' },
  m_phantom: { src: 'muddy_anim' },
  m_ghoul: { src: 'zombie_anim' },
  m_gnollb: { src: 'sd_gnoll_brute_idle_anim', run: 'sd_gnoll_brute_run_anim' },
  m_lmush: { src: 'sd_large_mushroom_idle_anim', run: 'sd_large_mushroom_run_anim' },
  m_ogre: { src: 'wogol_idle_anim', run: 'wogol_run_anim' },
  m_spider: { src: 'chort_idle_anim', run: 'chort_run_anim' },
  m_lich: { src: 'necromancer_anim' },
  m_gshaman: { src: 'sd_gnoll_shaman_idle_anim', run: 'sd_gnoll_shaman_run_anim' },
  m_troll2: { src: 'sd_troll_idle_anim', run: 'sd_troll_run_anim' },
  m_bear: { src: 'sd_bear_idle_anim', run: 'sd_bear_run_anim' },
  m_demon: { src: 'big_demon_idle_anim', run: 'big_demon_run_anim' },
  m_golem: { src: 'ogre_idle_anim', run: 'ogre_run_anim' },
  m_spell: { src: 'pumpkin_dude_idle_anim', run: 'pumpkin_dude_run_anim' },
  m_ent: { src: 'sd_ent_idle_anim', run: 'sd_ent_run_anim' },
  m_golem2: { src: 'sd_golem_idle_anim', run: 'sd_golem_run_anim' },
  // 판타지: 보스 (10층마다 한 바퀴)
  b_slimeking: { src: 'swampy_anim', ed: [{ op: 'hue', deg: 40, sat: 1.3 }] },
  b_goblinchief: { src: 'sd_gnoll_overseer_idle_anim', run: 'sd_gnoll_overseer_run_anim' },
  b_bat: { src: 'skelet_idle_anim', run: 'skelet_run_anim', ed: [{ op: 'hue', deg: 200, sat: 2.5, light: -0.05 }] },
  b_skeleton: { src: 'big_zombie_idle_anim', run: 'big_zombie_run_anim' },
  b_wolf: { src: 'sd_forest_guardian_idle_anim', run: 'sd_forest_guardian_run_anim' },
  b_troll: { src: 'ogre_idle_anim', run: 'ogre_run_anim' },
  b_spider: { src: 'chort_idle_anim', run: 'chort_run_anim', ed: [{ op: 'hue', deg: 260 }] },
  b_ogre: { src: 'big_zombie_idle_anim', run: 'big_zombie_run_anim', ed: [{ op: 'hue', deg: 220 }] },
  b_lich: { src: 'necromancer_anim', ed: [{ op: 'hue', deg: 120, sat: 1.5 }] },
  b_dragon: { src: 'big_demon_idle_anim', run: 'big_demon_run_anim', ed: [{ op: 'hue', deg: 40, sat: 1.3 }] },
  // 손에 드는 무기 (공격할 때 휘두른다)
  w_sword: { src: 'weapon_knight_sword' }, w_rusty: { src: 'weapon_rusty_sword' }, w_knife: { src: 'weapon_knife' },
  w_axe: { src: 'weapon_axe' }, w_waraxe: { src: 'weapon_waraxe' }, w_cleaver: { src: 'weapon_cleaver' },
  w_spear: { src: 'weapon_spear' }, w_staff: { src: 'weapon_red_magic_staff' }, w_gstaff: { src: 'weapon_green_magic_staff' },
  w_hammer: { src: 'weapon_hammer' }, w_mace: { src: 'weapon_mace' }, w_bow: { src: 'weapon_bow' },
  // 대현자의 보라 보석 지팡이, 성직자의 금빛 철퇴 (원본 색만 바꿈)
  w_arcstaff: { src: 'weapon_red_magic_staff', ed: [{ op: 'hue', deg: -80, only: [330, 30], sat: 1.2 }] },
  w_holymace: { src: 'weapon_mace', ed: [{ op: 'hue', deg: -130, only: [150, 200], sat: 1.4, light: 0.08 }] },
  // 무협 마을: 0x72에 없는 야외 지형은 같은 팔레트로 직접 그린다 (tools/pix.js). draw: [함수, 변형 수, 옵션]
  v_grass: { draw: ['grass', 6] }, v_flowers: { draw: ['flowers', 4] }, v_road: { draw: ['road', 4] }, v_path: { draw: ['path', 4] },
  v_tree: { draw: ['tree', 3] }, v_plum: { draw: ['tree', 2, { blossom: true }] },
  v_rock: { draw: ['rock', 4] }, v_water: { draw: ['water', 4] }, v_falls: { draw: ['falls', 3] }, v_inner: { draw: ['planks', 3] },
  ui_tree: { draw: ['skilltree', 1] },
  v_cloud: { draw: ['cloud', 4] },
  v_door: { draw: ['door', 1] }, x_table: { draw: ['table', 1] }, x_cart: { draw: ['cart', 1] }, w_board: { draw: ['board', 1] },
  w_dummy: { draw: ['dummy', 1] }, x_statue: { draw: ['statue', 1] }, x_altar: { draw: ['altar', 1] }, x_lantern: { draw: ['lantern', 1] },
  q_herb: { draw: ['herb', 1] }, w_cave: { draw: ['cave', 1] },
  // 집 벽은 0x72 벽돌을 흙벽 색으로, 화산파 전각은 밝은 대리석으로
  v_wall: { src: ['wall_mid', 'wall_mid', 'wall_hole_1'], ed: [{ op: 'hue', deg: 18, sat: 1.25, light: 0.06 }] },
  v_mwall: { src: ['wall_mid'], ed: [{ op: 'hue', deg: 160, sat: 0.25, light: 0.32 }] },
  v_marble: { src: ['floor_1', 'floor_1', 'floor_1', 'floor_2'], ed: [{ op: 'hue', deg: 150, sat: 0.2, light: 0.38 }] },
  // 무협 인물: 0x72 엘프를 바탕으로 옷·머리를 바꾼다 (OPS.wx). 주인공은 직업 단계마다.
  ...(() => {
    const BLACK = ['#2b2b33', '#4a4a58'], WHITE = ['#c9c3b8', '#e8e2d0'];
    const M = (o, ex = {}) => ({ src: 'elf_m_idle_anim', run: 'elf_m_run_anim', hit: 'elf_m_hit_anim_f0', ed: [{ op: 'wx', hair: BLACK, knot: true, ...o }], ...ex });
    const F = o => ({ src: 'elf_f_idle_anim', run: 'elf_f_run_anim', hit: 'elf_f_hit_anim_f0', ed: [{ op: 'wx', hair: BLACK, ...o }] });
    return {
      // 주인공은 한 사람: 머리(검은 상투)·얼굴은 그대로, 직업이 오를 때마다 옷(상의·바지·깃) 색만 바뀐다
      wx_hero0: M({ robe: ['#c8c2b0', '#775c55'], collar: '#e8e2d0' }),   // 점소이: 무명 저고리
      wx_hero1: M({ robe: ['#775c55', '#483b3a'], collar: '#aa8d7a' }),   // 표사: 가죽옷
      wx_hero2: M({ robe: ['#2b2b33', '#222222'], collar: '#c0392b' }),   // 낭인: 검은 옷, 붉은 깃
      wx_hero3: M({ robe: ['#e8e2d0', '#aa8d7a'], collar: '#c0392b' }),   // 화산파 제자: 흰 도포, 매화색 깃
      wx_hero4: M({ robe: ['#e8e2d0', '#c0392b'], collar: '#c0392b' }),   // 대제자: 붉은 허리띠
      wx_hero5: M({ robe: ['#5c5a66', '#3a3842'], collar: '#e8e2d0' }),   // 장로: 회색 도포
      wx_hero6: M({ robe: ['#c0392b', '#7a2420'], collar: '#facb3e' }),   // 장문인: 붉은 장포, 금 깃
      wx_hero7: M({ robe: ['#d9a62e', '#8a6420'], collar: '#c0392b' }),   // 무림맹주: 금빛 장포
      wx_hero8: M({ robe: ['#2b2b33', '#facb3e'], collar: '#facb3e' }),   // 천하제일인: 검은 장포, 금 띠
      wx_hero9: M({ robe: ['#f2eee4', '#f4a6c0'], collar: '#f4a6c0' }),   // 매화검선: 흰 도포, 매화 분홍
      // 마도 진로: 같은 사람, 검붉은 옷
      wx_mhero3: M({ robe: ['#3a2e2a', '#222222'], collar: '#7a2420' }),   // 흑도 무사: 거친 흑의
      wx_mhero4: M({ robe: ['#2b2b33', '#7a2420'], collar: '#c0392b' }),   // 마교 교도: 흑의, 붉은 띠
      wx_mhero5: M({ robe: ['#7a2420', '#3a1010'], collar: '#2b2b33' }),   // 혈마대: 핏빛 무복
      wx_mhero6: M({ robe: ['#4a1a2a', '#222222'], collar: '#c0392b' }),   // 마교 장로: 검자줏빛 장포
      wx_mhero7: M({ robe: ['#2b2b33', '#c0392b'], collar: '#facb3e' }),   // 교주: 흑포, 붉은 띠, 금 깃
      wx_mhero8: M({ robe: ['#c0392b', '#222222'], collar: '#2b2b33' }),   // 천하제일마: 붉은 장포
      wx_mhero9: M({ robe: ['#1a1a1f', '#7a2420'], collar: '#ff5a3a' }),   // 천마신: 칠흑, 불꽃 깃
      // 사파 진로(녹림): 같은 사람, 흙빛·녹색 산적 옷
      wx_shero3: M({ robe: ['#6a5a3a', '#3a2e22'], collar: '#4ba747', band: '#3d734f' }),   // 녹림 졸개
      wx_shero4: M({ robe: ['#5a4632', '#2b2b33'], collar: '#4ba747', band: '#c0392b' }),   // 두목
      wx_shero5: M({ robe: ['#3d734f', '#2c5240'], collar: '#facb3e' }),                    // 채주: 녹포
      wx_shero6: M({ robe: ['#2c5240', '#222222'], collar: '#c0392b', band: '#facb3e' }),   // 총표파자
      wx_shero7: M({ robe: ['#4a3a20', '#d9a62e'], collar: '#4ba747' }),                    // 사도련주
      wx_shero8: M({ robe: ['#2b2b33', '#4ba747'], collar: '#facb3e' }),                    // 천하제일도
      wx_shero9: M({ robe: ['#1f3a2a', '#facb3e'], collar: '#97da3f' }),                    // 사왕
      // 수선 수도자: 같은 사람(흰 머리 상투), 무대가 오를수록 도포가 희고 빛난다 — 산기슭 회청 → 영산 청백 → 봉우리 하늘빛 → 선궁 백금 → 선계 금빛
      xx_hero0: M({ hair: ['#2b2b33', '#4a4a58'], robe: ['#7f8fa3', '#4e5a6a'], collar: '#c9c3b8' }),
      xx_hero1: M({ hair: ['#2b2b33', '#4a4a58'], robe: ['#d6dde6', '#7f8fa3'], collar: '#5698cc' }),
      xx_hero2: M({ hair: ['#2b2b33', '#4a4a58'], robe: ['#bfe0f5', '#5698cc'], collar: '#e8eef5', hat: 'crown' }),
      xx_hero3: M({ hair: ['#c9c3b8', '#e8e2d0'], robe: ['#f2eee4', '#d9a62e'], collar: '#facb3e', hat: 'crown' }),
      xx_hero4: M({ hair: ['#e8e2d0', '#ffffff'], robe: ['#fff8e0', '#facb3e'], collar: '#ffffff', hat: 'crown' }),
      xx_disc: M({ hair: ['#2b2b33', '#4a4a58'], robe: ['#c9c3b8', '#7f8fa3'], collar: '#5698cc' }),
      wx_vil_m: M({ robe: ['#5b7fa0', '#3e5670'], collar: '#c8c2b0' }),
      wx_vil_f: F({ robe: ['#d77fa0', '#a3506e'], collar: '#e8e2d0', ribbon: '#c0392b' }),
      wx_merchant: M({ robe: ['#4a6a8a', '#2e4560'], collar: '#facb3e', hat: 'crown' }),
      wx_bandit0: M({ robe: ['#5a4632', '#3a2e22'], collar: '#2b2b33', band: '#c0392b', knot: false }),
      // 크툴루 낚시꾼: 같은 엘프 바탕, 수염 난 늙은 뱃사람. 방수복·방수 모자, 전체를 어둡고 푸르게
      c_fisher: (f => ({ ...f, ed: [...f.ed, { op: 'tint', c: [18, 28, 40, 0.3] }] }))(
        M({ hair: ['#3a3a3a', '#55524c'], robe: ['#3b4a3e', '#262a2e'], collar: '#5a5040', hat: 'souwester', beard: true, knot: false, eyes: '#9fd3c7' })),
      wx_bandit1: M({ robe: ['#3a3842', '#222222'], collar: '#7a2420', band: '#2b2b33', knot: false }),
    };
  })(),
  w_katana: { src: 'weapon_katana' }, w_duel: { src: 'weapon_duel_sword' },
  // 보물상자(닫힘·열림)와 미믹
  x_chest: { src: 'chest_full_open_anim_f0' }, x_chest_open: { src: 'chest_full_open_anim_f2' },
  m_mimic: { src: 'chest_mimic_open_anim' },
  m_ggoblin: { src: 'goblin_idle_anim', run: 'goblin_run_anim', ed: [{ op: 'hue', deg: -75, sat: 1.6, light: 0.1 }] },
  // 화살 (날아가는 방향으로 돌려 그린다)
  fx_arrow: { src: 'weapon_arrow' },
  // 판타지: 던전 지형 (구간 0~5). 벽은 위에서 본 윗면(top)과 바닥 쪽으로 보이는 앞면(face)
  f_stairs: { src: 'floor_stairs' },
  // 공용·판타지 아이콘
  ui_gold: { src: 'coin_anim' },
  u_sword: { src: 'weapon_knight_sword' },
  u_armor: { src: 'weapon_lavish_sword' },
  g_dagger: { src: 'weapon_knife' },
  r_stew: { src: 'flask_big_green' },
  r_dragon: { src: 'flask_big_red' },
  fx_holy: { src: 'flask_big_yellow' },
  b_regen: { src: 'flask_green' },
  b_gold: { src: 'flask_yellow' },
  b_atk: { src: 'flask_red' },
  b_fury: { src: 'weapon_double_axe' },
  st_haste: { src: 'flask_blue' },
  fx_song: { src: 'weapon_bow' },
};
// 0x72 자동 타일 벽 (atlas_walls_high-16x32, Godot 3x3 minimal 배치 12×4). 이웃 마스크 → 시트 위치.
// 마스크 비트: N1 E2 S4 W8 NE16 SE32 SW64 NW128 (대각선은 양옆이 모두 벽일 때만). Godot 공식 템플릿 그림에서 읽은 표.
const GODOT47 = {"0":[0,3],"1":[0,2],"2":[1,3],"3":[1,2],"4":[0,0],"5":[0,1],"6":[1,0],"7":[1,1],"8":[3,3],"9":[3,2],"10":[2,3],"11":[2,2],"12":[3,0],"13":[3,1],"14":[2,0],"15":[2,1],"19":[8,3],"23":[4,2],"27":[5,3],"31":[7,0],"38":[8,0],"39":[4,1],"46":[5,0],"47":[7,3],"55":[8,1],"63":[8,2],"76":[11,0],"77":[7,1],"78":[6,0],"79":[4,3],"95":[9,1],"110":[10,0],"111":[9,0],"127":[5,1],"137":[11,3],"139":[6,3],"141":[7,2],"143":[4,0],"155":[9,3],"159":[10,3],"175":[10,2],"191":[5,2],"205":[11,2],"207":[11,1],"223":[6,2],"239":[6,1],"255":[9,2]};
const ATLAS = PNG.read(fs.readFileSync(path.join(ROOT, 'assets', 'src', '0x72', 'atlas_walls_high-16x32.png')));
function atlasSet(pre, suf, ed) {
  for (const [m, [tx, ty]] of Object.entries(GODOT47)) {
    const tile = crop(ATLAS, { x0: tx * 16, y0: ty * 32, x1: tx * 16 + 15, y1: ty * 32 + 31 });
    SPEC[pre + 'hw' + m + suf] = { img: tile, ed };
  }
}
// 벽 한 벌: 앞면(face, 아래가 트인 벽), 속(dark), 테두리 cS(앞면 위 칸의 윗단)·cN(위가 트임)·cE(오른쪽)·cW(왼쪽)
// 키는 <접두어><조각><suf> (예: f_wface0, f_cE0 / vw_wface, vw_cE)
function wallSet(pre, suf, ed, dark, face) {
  SPEC[pre + 'wface' + suf] = { src: face, ed };
  SPEC[pre + 'wdark' + suf] = { src: ['wall_top_mid'], ed: [{ op: 'fill', c: dark }, { op: 'tint', c: [...[1, 3, 5].map(i => parseInt(dark.slice(i, i + 2), 16)), 1] }, ...ed] };
  SPEC[pre + 'cS' + suf] = { src: ['wall_top_mid'], ed };
  SPEC[pre + 'cN' + suf] = { src: ['wall_top_mid'], ed: [{ op: 'vflip' }, ...ed] };
  SPEC[pre + 'cE' + suf] = { src: ['wall_edge_mid_right'], ed };
  SPEC[pre + 'cW' + suf] = { src: ['wall_edge_mid_left'], ed };
}
// 무협: 민가는 따뜻한 흙벽돌, 화산파 전각은 밝은 대리석 (0x72 벽돌을 다시 칠한다)
atlasSet('vw_', '', [{ op: 'hue', deg: 18, sat: 1.2, light: 0.13 }]);
atlasSet('vm_', '', [{ op: 'hue', deg: 160, sat: 0.25, light: 0.32 }]);
wallSet('vw_', '', [{ op: 'hue', deg: 18, sat: 1.2, light: 0.13 }], '#3a2418', ['wall_mid', 'wall_mid', 'wall_mid', 'wall_hole_1']);
wallSet('vm_', '', [{ op: 'hue', deg: 160, sat: 0.25, light: 0.32 }], '#56606a', ['wall_mid', 'wall_mid', 'wall_mid', 'wall_banner_red']);
// 마을 벽은 윗면을 재질로 채운다(cap) + 트인 쪽 가장자리 선(oN·oE·oW) + 땅 그림자(sh_N·sh_W)
for (const [pre, c] of [['vw_', { base: '#b08a62', joint: '#7d5c40', hi: '#c9a77c' }], ['vm_', { base: '#cfd5d8', joint: '#99a2a8', hi: '#e6eaec' }]]) {
  SPEC[pre + 'cap'] = { draw: ['cap', 3, c] };
  for (const sd of ['N', 'E', 'W']) SPEC[pre + 'o' + sd] = { draw: ['edge', 1, { side: sd, hi: c.hi }] };
}
SPEC.sh_N = { draw: ['shade', 1, { side: 'N', depth: 6, a: 0.5 }] };
SPEC.sh_W = { draw: ['shade', 1, { side: 'W', depth: 4, a: 0.35 }] };
for (let b = 0; b < 6; b++) {
  SPEC['f_floor' + b] = { src: FLOOR, ed: BAND[b] };
  atlasSet('f_', b, BAND[b]);
  wallSet('f_', b, BAND[b], '#1d1518', ['wall_mid', 'wall_mid', 'wall_mid', 'wall_hole_1', 'wall_mid', 'wall_banner_red', 'wall_mid', 'wall_hole_2']);
}

// ── 만들기 ──
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
const set = {};
function bbox(list) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const n of list) {
    const im = load(n);
    for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.d[(y * im.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  return { x0, y0, x1, y1 };
}
function crop(im, b) {
  const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1, d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) d.set(im.d.subarray(((b.y0 + y) * im.w + b.x0) * 4, ((b.y0 + y) * im.w + b.x0 + w) * 4), y * w * 4);
  return { w, h, d };
}
function save(key, list, ed, box) {
  list.forEach((n, i) => {
    let im = load(n);
    if (box) im = crop(im, box);
    fs.writeFileSync(path.join(OUT, list.length > 1 ? `${key}_${i}.png` : `${key}.png`), PNG.write(edit(im, ed)));
  });
  set[key] = list.length;
}
// 스킬트리 노드 아이콘 (tools/nodeicons.js — 같은 규칙으로 새로 그린 16×16)
Object.assign(SPEC, require('./nodeicons'));
for (const [key, s] of Object.entries(SPEC)) {
  if (s.img) { fs.writeFileSync(path.join(OUT, key + '.png'), PNG.write(edit(s.img, s.ed))); set[key] = 1; continue; }
  if (s.draw) {
    const [fn, n, opt] = s.draw;
    for (let i = 0; i < n; i++) fs.writeFileSync(path.join(OUT, n > 1 ? `${key}_${i}.png` : `${key}.png`), PNG.write(edit(PIX[fn](i + 1, opt), s.ed)));
    set[key] = n;
    continue;
  }
  const idle = Array.isArray(s.src) ? s.src : frames(s.src), run = s.run ? frames(s.run) : [], hit = s.hit ? [s.hit] : [];
  const box = idle.some(n => n.startsWith('sd_')) ? bbox([...idle, ...run, ...hit]) : null;
  save(key, idle, s.ed, box);
  if (run.length) save(key + '_run', run, s.ed, box);
  if (hit.length) save(key + '_hit', hit, s.ed, box);
}
fs.writeFileSync(path.join(ROOT, 'js', 'artset.js'),
  "'use strict';\n// 자동 생성 (tools/art72.js). assets/art/의 그림(0x72 DungeonTileset II, CC0 기반): 키 → 프레임·변형 수.\n" +
  'G.ARTSET = ' + JSON.stringify(set) + ';\n');
console.log(`그림 ${Object.keys(set).length}종, 파일 ${Object.values(set).reduce((a, b) => a + b, 0)}개`);
