// 손으로 찍는 도트 캐릭터 (2~3등신 치비, 20×24 칸).
// 기본 몸 + 머리 모양 겹 + 무기 겹을 쌓고, 글자마다 팔레트 색을 칠한다.
// 외곽선은 검정이 아니라 캐릭터마다 어두운 색조(o)를 쓴다.

export const W = 20, H = 24;

/** 글자 → 의미: o 외곽선, H/h/j 머리(기본/그늘/밝음), S/s 피부, E 눈동자, I 홍채, W 흰색(옷깃),
 *  C/c 옷(기본/그늘), B 벨트, P 바지·신발, M/m 금속, w 나무, G 바닥 그림자, - 지우기 */
export type Palette = Record<string, string>;

// 기본 몸 (머리 덮개 포함)
const BASE = [
  '....................',
  '....................',
  '......oooooooo......',
  '....ooHHHHHHHHoo....',
  '...oHHHjjHHHHHHHo...',
  '..oHHHjjHHHHHHHHHo..',
  '..oHHHHHHHHHHHHHHo..',
  '..oHHhHHHHHHHHhHHo..',
  '..oHhSShHSSShSShHo..',
  '..oHSSSSSSSSSSSSHo..',
  '..oHSSEESSSSEESSHo..',
  '..ohSSIISSSSIIsSho..',
  '...oSSSSSSSSSSSSo...',
  '....oossSSSSssoo....',
  '.....oWWCCCCWWo.....',
  '....oCcCCCCCCcCo....',
  '....oSoCCCCCCoSo....',
  '.....ooBBBBBBoo.....',
  '......oPPooPPo......',
  '......oPPooPPo......',
  '......ooo..ooo......',
];

const SHADOW = [
  '....................', '....................', '....................', '....................', '....................',
  '....................', '....................', '....................', '....................', '....................',
  '....................', '....................', '....................', '....................', '....................',
  '....................', '....................', '....................', '....................',
  '....GGGGGGGGGGGG....',
  '...GGGGGGGGGGGGGG...',
  '....GGGGGGGGGGGG....',
];

/** 겹: 시작 행 + 줄들 ('.' = 그대로, '-' = 지우기) */
interface Layer { y: number; rows: string[] }

export const HAIR: Record<string, Layer> = {
  short: { y: 0, rows: [] },
  // 참고 그림처럼 왼쪽 위로 묶은 머리
  bun: { y: 0, rows: [
    '...ooo..............',
    '..oHHHo.............',
    '..oHhjoo............',
    '...ooHH.............',
  ] },
  // 양옆으로 길게 내려오는 머리
  long: { y: 11, rows: [
    '.oHo............oHo.',
    '.oHo............oHo.',
    '.oHho..........ohHo.',
    '.ohHo..........oHho.',
    '..oho..........oho..',
    '...o............o...',
  ] },
  // 뾰족 머리
  spiky: { y: 0, rows: [
    '.....o..o...o.......',
    '....oHooHo.oHo......',
    '...oHHHHHHoHHHo.....',
    '..oHHHHHHHHHHHHo....',
  ] },
  // 뒤로 묶은 꽁지머리 (오른쪽)
  pony: { y: 4, rows: [
    '.................oo.',
    '.................oHo',
    '.................oHo',
    '................ohHo',
    '................oHo.',
    '.................o..',
  ] },
  // 두건: 머리 자리를 옷 색으로 (팔레트에서 H 를 옷 색으로)
  hood: { y: 1, rows: [
    '.....oooooooooo.....',
    '....oHHHHHHHHHHo....',
  ] },
};

export const WEAPON: Record<string, Layer> = {
  none: { y: 0, rows: [] },
  // 오른손 검
  sword: { y: 6, rows: [
    '.................o..',
    '................oMo.',
    '................oMo.',
    '................oMo.',
    '................oMo.',
    '................oMo.',
    '................omo.',
    '...............oBBBo',
    '..............oSoBo.',
    '................oBo.',
    '.................o..',
  ] },
  // 왼손 둥근 방패 + 오른손 검
  sword_shield: { y: 6, rows: [
    '.................o..',
    '................oMo.',
    '................oMo.',
    '................oMo.',
    '................oMo.',
    '..ooo...........oMo.',
    '.oMMMo..........omo.',
    'oMmMMMo........oBBBo',
    'oMMBMmo.......oSoBo.',
    'oMMMMMo.........oBo.',
    '.oMmMo...........o..',
    '..ooo...............',
  ] },
  // 지팡이 (끝에 보석)
  staff: { y: 3, rows: [
    '................ooo.',
    '...............oIIIo',
    '...............oIjIo',
    '................oIo.',
    '................owo.',
    '................owo.',
    '................owo.',
    '................owo.',
    '................owo.',
    '................owo.',
    '................owo.',
    '...............oSwo.',
    '................owo.',
    '................owo.',
    '................owo.',
    '.................o..',
  ] },
  // 활 (왼손)
  bow: { y: 7, rows: [
    '.oo.................',
    'owwo................',
    'ow.o................',
    'ow..o...............',
    'ow..o...............',
    'ow..o...............',
    'ow.oSo..............',
    'ow..o...............',
    'ow..o...............',
    'ow.o................',
    'owwo................',
    '.oo.................',
  ] },
  // 양손 도끼 (오른쪽)
  axe: { y: 4, rows: [
    '..............ooo...',
    '.............oMMMo..',
    '............oMMMMMo.',
    '............oMmwMMo.',
    '.............oowoo..',
    '...............owo..',
    '...............owo..',
    '...............owo..',
    '...............owo..',
    '..............oSwo..',
    '...............owo..',
    '...............owo..',
    '................o...',
  ] },
  // 책 (왼손)
  book: { y: 13, rows: [
    '.oooo...............',
    'oCWWCo..............',
    'oCWWCo..............',
    'oCWWSo..............',
    '.oooo...............',
  ] },
};

/** 몬스터용 귀 · 뿔 겹 */
export const EXTRA: Record<string, Layer> = {
  none: { y: 0, rows: [] },
  ears: { y: 7, rows: [
    'oo................oo',
    'oSSo............oSSo',
    '.oSSo..........oSSo.',
    '..ooo..........ooo..',
  ] },
  horns: { y: 0, rows: [
    '..oo..........oo....',
    '..oMo........oMo....',
    '...oMo......oMo.....',
  ] },
  tusks: { y: 12, rows: [
    '.....oWo....oWo.....',
    '......o......o......',
  ] },
};

export interface CharDef {
  id: string;
  name: string;
  hair: keyof typeof HAIR;
  weapon: keyof typeof WEAPON;
  extra?: keyof typeof EXTRA;
  pal: Palette;
}

const SHADOW_COLOR = 'rgba(0,0,0,0.28)';

// 팔레트 도우미: 옷 · 머리 · 피부 · 눈 색만 바꾸면 된다
function pal(o: { outline: string; hair: [string, string, string]; skin?: [string, string]; iris: string; cloth: [string, string]; belt?: string; pants?: string; metal?: [string, string]; wood?: string; white?: string }): Palette {
  const skin = o.skin ?? ['#f6dccb', '#d9a990'];
  const metal = o.metal ?? ['#d8dde6', '#8a93a6'];
  return {
    o: o.outline, H: o.hair[0], h: o.hair[1], j: o.hair[2], S: skin[0], s: skin[1], E: '#2a1e2e', I: o.iris,
    W: o.white ?? '#f2efe8', C: o.cloth[0], c: o.cloth[1], B: o.belt ?? '#a0683a', P: o.pants ?? '#3a2e3a',
    M: metal[0], m: metal[1], w: o.wood ?? '#8a5a32', G: SHADOW_COLOR,
  };
}

export const CHARS: CharDef[] = [
  // ── 영웅 ──
  { id: 'warrior', name: '전사', hair: 'short', weapon: 'sword_shield',
    pal: pal({ outline: '#2a1c18', hair: ['#7a4a2a', '#5a3420', '#9a6a40'], iris: '#3a6ab0', cloth: ['#8a94a8', '#5e6678'], belt: '#7a4a2a' }) },
  { id: 'berserker', name: '광전사', hair: 'spiky', weapon: 'axe',
    pal: pal({ outline: '#2a1414', hair: ['#c0402a', '#8a2a1c', '#e06a48'], iris: '#c03030', cloth: ['#7a4a32', '#5a3422'], belt: '#3a2a20' }) },
  { id: 'fire_mage', name: '화염술사', hair: 'long', weapon: 'staff',
    pal: pal({ outline: '#2a1418', hair: ['#e8c070', '#b88a40', '#f8e0a0'], iris: '#e05a2a', cloth: ['#c8402a', '#8a2a1c'], belt: '#e8b040' }) },
  { id: 'frost_mage', name: '서리술사', hair: 'bun', weapon: 'book',
    pal: pal({ outline: '#1c1a2e', hair: ['#5a4a6a', '#3e324a', '#7a6a8a'], iris: '#4ab0e0', cloth: ['#4a7ac8', '#30508a'], belt: '#d8e8f8' }) },
  { id: 'hunter', name: '사냥꾼', hair: 'pony', weapon: 'bow',
    pal: pal({ outline: '#1a2414', hair: ['#4a3a2a', '#30261c', '#6a5640'], iris: '#5aa04a', cloth: ['#4a7a3a', '#305028'], belt: '#7a5a32' }) },
  { id: 'priest', name: '사제', hair: 'hood', weapon: 'staff',
    pal: { ...pal({ outline: '#2a2430', hair: ['#f0ece0', '#c8c0b0', '#ffffff'], iris: '#8a6ac8', cloth: ['#f0ece0', '#c8c0b0'], belt: '#e8c060' }), I: '#8a6ac8' } },
  // 참고 그림 느낌 (묶은 머리 · 보라 옷)
  { id: 'rogue', name: '떠돌이', hair: 'bun', weapon: 'sword',
    pal: pal({ outline: '#1e1622', hair: ['#4a3a4e', '#2e2432', '#6a5a70'], iris: '#8a4ab0', cloth: ['#6a3a8a', '#4a2a62'], belt: '#a8743a' }) },
  // ── 몬스터 ──
  { id: 'goblin', name: '고블린', hair: 'short', weapon: 'sword', extra: 'ears',
    pal: pal({ outline: '#14240e', hair: ['#5aa040', '#3e7a2c', '#7ac060'], skin: ['#6ab84a', '#4a8a34'], iris: '#e03020', cloth: ['#7a5a3a', '#5a4028'], metal: ['#a8a090', '#6a6458'] }) },
  { id: 'orc', name: '오크', hair: 'spiky', weapon: 'axe', extra: 'tusks',
    pal: pal({ outline: '#14200e', hair: ['#2a2a2a', '#1a1a1a', '#4a4a4a'], skin: ['#7a9a5a', '#5a7a40'], iris: '#e0a020', cloth: ['#6a4a3a', '#4a3228'], white: '#f0e8d0' }) },
  { id: 'skeleton', name: '해골', hair: 'short', weapon: 'sword',
    pal: { ...pal({ outline: '#2a2a30', hair: ['#e8e4d8', '#b8b4a8', '#ffffff'], skin: ['#e8e4d8', '#b8b4a8'], iris: '#ff5040', cloth: ['#d0ccc0', '#9a968a'], belt: '#5a4a3a', pants: '#b8b4a8' }), E: '#1a1a20' } },
  { id: 'imp', name: '임프', hair: 'short', weapon: 'none', extra: 'horns',
    pal: pal({ outline: '#2a0e0e', hair: ['#c83a2a', '#8a2418', '#e86048'], skin: ['#e05a3a', '#a83a24'], iris: '#ffe040', cloth: ['#3a2a2a', '#2a1c1c'], metal: ['#3a2a2a', '#1a1010'] }) },
];

// ── 슬라임은 몸이 다르다 ──
export const SLIME = [
  '....................', '....................', '....................', '....................',
  '....................', '....................', '....................', '....................',
  '.........oo.........',
  '.......ooHHoo.......',
  '.....ooHHjjHHoo.....',
  '....oHHHjjHHHHHo....',
  '...oHHHHHHHHHHHHo...',
  '...oHHEEHHHHEEHHo...',
  '..oHHHIIHHHHIIHHHo..',
  '..oHHHHHHHHHHHHHHo..',
  '..ohHHHHHHHHHHHHho..',
  '..ohhHHHHHHHHHHhho..',
  '...ohhhhhhhhhhhho...',
  '....oooooooooooo....',
];
export const SLIME_PAL: Palette = { o: '#143014', H: '#7ed87e', h: '#4aa04a', j: '#d0ffd0', E: '#143014', I: '#ffffff', G: SHADOW_COLOR };

/** 겹을 합쳐 20×24 글자 격자로 */
export function compose(c: CharDef, frame = 0): string[][] {
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill('.'));
  const stamp = (rows: string[], y0: number, dy = 0) =>
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const yy = y0 + y + dy;
      if (yy < 0 || yy >= H || ch === '.') return;
      g[yy][x] = ch === '-' ? '.' : ch;
    }));
  // 숨쉬기: 2번째 프레임은 허리 위가 1칸 내려간다
  const bob = frame % 2;
  stamp(SHADOW, 1);
  const body = BASE.map((r, i) => (i <= 17 ? r : '....................'));
  const legs = BASE.map((r, i) => (i > 17 ? r : '....................'));
  stamp(legs, 1);
  stamp(body, 1, bob);
  if (c.extra) stamp(EXTRA[c.extra].rows, EXTRA[c.extra].y + 1, bob);
  stamp(HAIR[c.hair].rows, HAIR[c.hair].y + 1, bob);
  stamp(WEAPON[c.weapon].rows, WEAPON[c.weapon].y + 1, bob);
  return g;
}

export function composeSlime(frame = 0): string[][] {
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill('.'));
  const squash = frame % 2;
  SHADOW.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') g[y + 1][x] = ch; }));
  SLIME.forEach((row, y) => [...row].forEach((ch, x) => {
    const yy = y + 2 + (squash && y < 12 ? 1 : 0);
    if (ch !== '.' && yy < H) g[yy][x] = ch;
  }));
  return g;
}

/** 격자를 캔버스에 */
export function draw(ctx: CanvasRenderingContext2D, grid: string[][], palette: Palette, x0: number, y0: number, scale: number) {
  grid.forEach((row, y) => row.forEach((ch, x) => {
    if (ch === '.') return;
    const col = palette[ch];
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect(x0 + x * scale, y0 + y * scale, scale, scale);
  }));
}
