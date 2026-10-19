// 0x72 DungeonTileset II(CC0)로 게임 그림 만들기: node tools/art72.js
// SPEC의 키마다 원본 프레임(assets/src/0x72/frames)을 골라 편집(색 바꾸기·뒤집기·겹치기)하고
// assets/art/<키>[_n].png로 저장한 뒤 js/artset.js(키 → 프레임 수)를 만든다. 같은 키의 DCSS 타일보다 우선한다.
// 프레임이 여럿이면 캐릭터는 애니메이션으로 돌고, 지형은 칸마다 다른 변형이 된다. <키>_run이 있으면 걸을 때 쓴다.
const fs = require('fs'), path = require('path'), PNG = require('./png');
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
for (let b = 0; b < 6; b++) {
  SPEC['f_floor' + b] = { src: FLOOR, ed: BAND[b] };
  SPEC['f_wdark' + b] = { src: ['wall_top_mid'], ed: [{ op: 'fill', c: '#1d1518' }, { op: 'tint', c: [29, 21, 24, 1] }, ...BAND[b]] };
  SPEC['f_cS' + b] = { src: ['wall_top_mid'], ed: BAND[b] };
  SPEC['f_cN' + b] = { src: ['wall_top_mid'], ed: [{ op: 'vflip' }, ...BAND[b]] };
  SPEC['f_cE' + b] = { src: ['wall_edge_mid_right'], ed: BAND[b] };
  SPEC['f_cW' + b] = { src: ['wall_edge_mid_left'], ed: BAND[b] };
  SPEC['f_wface' + b] = { src: ['wall_mid', 'wall_mid', 'wall_mid', 'wall_hole_1', 'wall_mid', 'wall_banner_red', 'wall_mid', 'wall_hole_2'], ed: BAND[b] };
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
for (const [key, s] of Object.entries(SPEC)) {
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
