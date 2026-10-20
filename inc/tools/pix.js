// 0x72 팔레트로 직접 그리는 16px 픽셀 타일 (0x72 팩에 없는 야외 지형: 풀·꽃·흙길·산길·나무)
// 모든 타일은 이음새 없이 이어지도록 좌표를 16으로 감아(wrap) 찍는다. 같은 seed면 같은 그림.
const PAL = {
  ink: '#222222', soil0: '#483b3a', soil1: '#775c55', soil2: '#aa8d7a', soil3: '#d3bfa9',
  g0: '#2c5240', g1: '#3d734f', g2: '#4ba747', g3: '#97da3f', teal: '#49a790', blue0: '#314152', blue1: '#417089', blue2: '#5698cc',
  yellow: '#facb3e', orange: '#ee8e2e', pink: '#f4a6c0', red: '#c0392b', white: '#e8e2d0',
};
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function img(w = 16, h = 16, fill) {
  const d = new Uint8Array(w * h * 4);
  if (fill) { const [r, g, b] = hex(PAL[fill] || fill); for (let i = 0; i < w * h; i++) d.set([r, g, b, 255], i * 4); }
  return { w, h, d };
}
// 결정적 난수 (seed마다 같은 무늬)
function rng(seed) { let s = seed * 2654435761 >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function put(im, x, y, c, wrap = true) {
  if (wrap) { x = ((x % im.w) + im.w) % im.w; y = ((y % im.h) + im.h) % im.h; } else if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
  const [r, g, b] = hex(PAL[c] || c); im.d.set([r, g, b, 255], (y * im.w + x) * 4);
}

// 풀밭: 짙은 초록 바탕, 어두운 얼룩, 밝은 풀잎 다발(ㅅ자) 몇 개
function grass(seed, { tufts = 5, specks = 10 } = {}) {
  const im = img(16, 16, 'g1'), R = rng(seed);
  for (let i = 0; i < specks; i++) put(im, (R() * 16) | 0, (R() * 16) | 0, 'g0');
  for (let i = 0; i < tufts; i++) {
    const x = (R() * 16) | 0, y = (R() * 16) | 0;
    put(im, x, y, 'g2'); put(im, x - 1, y + 1, 'g2'); put(im, x + 1, y + 1, 'g2'); put(im, x, y + 1, 'g0');
    if (R() < 0.35) put(im, x, y - 1, 'g3');
  }
  return im;
}
// 꽃밭: 풀밭 위에 작은 꽃 (가운데 노랑, 꽃잎 한 색)
function flowers(seed) {
  const im = grass(seed, { tufts: 3 }), R = rng(seed + 99);
  for (let i = 0; i < 4; i++) {
    const x = (R() * 16) | 0, y = (R() * 16) | 0, c = ['pink', 'white', 'yellow', 'orange'][(R() * 4) | 0];
    put(im, x - 1, y, c); put(im, x + 1, y, c); put(im, x, y - 1, c); put(im, x, y + 1, c); put(im, x, y, c === 'yellow' ? 'orange' : 'yellow');
  }
  return im;
}
// 흙길: 갈색 바탕에 자갈(어두운 점 + 위쪽 밝은 점)과 바퀴 자국 느낌의 가는 줄
function road(seed) {
  const im = img(16, 16, 'soil1'), R = rng(seed);
  for (let i = 0; i < 14; i++) put(im, (R() * 16) | 0, (R() * 16) | 0, 'soil0');
  for (let i = 0; i < 5; i++) { const x = (R() * 16) | 0, y = (R() * 16) | 0; put(im, x, y, 'soil0'); put(im, x + 1, y, 'soil0'); put(im, x, y - 1, 'soil2'); }
  for (let i = 0; i < 4; i++) put(im, (R() * 16) | 0, (R() * 16) | 0, 'soil2');
  return im;
}
// 산길: 밝은 판석 몇 장 (어두운 틈 + 위쪽 밝은 모서리)
function path(seed) {
  const im = img(16, 16, 'soil1'), R = rng(seed), ox = (R() * 8) | 0, oy = (R() * 8) | 0;
  // 8×8 판석 네 장을 엇갈리게 (seed마다 어긋남이 다르다)
  for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
    const sx = ox + bx * 8 + (by ? 4 : 0), sy = oy + by * 8;
    for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) put(im, sx + x, sy + y, y === 1 || x === 1 ? 'soil3' : 'soil2');
    if (R() < 0.6) put(im, sx + 2 + ((R() * 4) | 0), sy + 3 + ((R() * 3) | 0), 'soil1');
  }
  return im;
}
// 나무(겹쳐 그리는 것, 배경 투명): 덩어리 셋을 겹친 수관 + 줄기 + 검은 외곽선. 왼쪽 위에서 빛.
// blossom이면 매화(분홍 꽃, 흰 하이라이트, 붉은 꽃술)
function tree(seed, { blossom = false } = {}) {
  const im = img(16, 16), R = rng(seed);
  const blobs = [[5.5, 6.5, 4.2], [10, 6, 4], [7.8, 3.6, 3.9]].map(([x, y, r]) => [x + (R() - 0.5), y + (R() - 0.5), r]);
  const inside = (x, y) => blobs.some(([bx, by, r]) => (x - bx) ** 2 + (y - by) ** 2 <= r * r);
  const c0 = blossom ? '#b8506e' : 'g0', c1 = blossom ? 'pink' : 'g1', c2 = blossom ? '#f9d4df' : 'g2', c3 = blossom ? 'white' : 'g3';
  for (let y = 10; y < 16; y++) for (let x = 6; x < 10; x++) put(im, x, y, x === 6 || x === 9 || y === 15 ? 'ink' : x === 7 ? 'soil2' : 'soil1', false);
  for (let y = 0; y < 13; y++) for (let x = 0; x < 16; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) { put(im, x, y, 'ink', false); continue; }
    // 덩어리마다 왼쪽 위가 밝고 오른쪽 아래 가장자리가 어둡다
    const lit = blobs.some(([bx, by, r]) => (x - (bx - r * 0.35)) ** 2 + (y - (by - r * 0.35)) ** 2 <= (r * 0.55) ** 2);
    const dark = !inside(x + 1, y + 1) || !inside(x + 2, y + 1) || !inside(x + 1, y + 2);
    put(im, x, y, dark ? c0 : lit ? c2 : c1, false);
  }
  for (let i = 0; i < 6; i++) { const x = (R() * 16) | 0, y = (R() * 12) | 0; if (inside(x, y) && inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1)) put(im, x, y, R() < 0.5 ? c3 : c0, false); }
  if (blossom) for (let i = 0; i < 5; i++) { const x = (R() * 16) | 0, y = (R() * 12) | 0; if (inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1)) put(im, x, y, 'yellow', false); }
  return im;
}
// ── 무협 마을 지형 ──
// 바위산: 어두운 바탕에 외곽선 있는 바위 덩어리 둘, 왼쪽 위가 밝다
function rock(seed) {
  const im = img(16, 16, '#3a3036'), R = rng(seed);
  for (const [bx, by, r] of [[4 + R() * 3, 5 + R() * 3, 4.5], [11 + R() * 2, 10 + R() * 3, 4.8]]) {
    const inside = (x, y) => { const dx = Math.min(Math.abs(x - bx), 16 - Math.abs(x - bx)), dy = Math.min(Math.abs(y - by), 16 - Math.abs(y - by)); return dx * dx + dy * dy * 1.3 <= r * r; };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const ddx = ((x - bx + 24) % 16) - 8, ddy = ((y - by + 24) % 16) - 8;
      put(im, x, y, edge ? 'ink' : ddx + ddy < -2 ? 'soil3' : ddx + ddy > 3 ? 'soil1' : 'soil2');
    }
  }
  return im;
}
// 강물: 짙은 파랑 바탕, 가로 물결(밝은 파랑 짧은 줄 + 흰 반짝임)
function water(seed) {
  const im = img(16, 16, 'blue1'), R = rng(seed);
  for (let i = 0; i < 10; i++) put(im, (R() * 16) | 0, (R() * 16) | 0, 'blue0');
  for (let i = 0; i < 4; i++) { const x = (R() * 16) | 0, y = (R() * 16) | 0; for (let k = 0; k < 4; k++) put(im, x + k, y + (k === 0 || k === 3 ? 1 : 0), 'blue2'); }
  for (let i = 0; i < 2; i++) put(im, (R() * 16) | 0, (R() * 16) | 0, 'white');
  return im;
}
// 폭포: 세로로 떨어지는 흰·하늘 줄무늬
function falls(seed) {
  const im = img(16, 16, 'blue2'), R = rng(seed);
  for (let x = 0; x < 16; x++) { const c = R() < 0.35 ? 'white' : R() < 0.5 ? 'blue1' : 'blue2', o = (R() * 16) | 0; for (let y = 0; y < 16; y++) if ((y + o) % 6 < 4) put(im, x, y, c); }
  return im;
}
// 나무 마루(실내 바닥): 가로 널빤지, 어긋난 이음매
function planks(seed) {
  const im = img(16, 16, '#9a6b47'), R = rng(seed);
  for (let r = 0; r < 4; r++) {
    for (let x = 0; x < 16; x++) put(im, x, r * 4, '#6e4a33');
    const j = (r * 7 + ((R() * 6) | 0)) % 16; put(im, j, r * 4 + 1, '#6e4a33'); put(im, j, r * 4 + 2, '#6e4a33'); put(im, j, r * 4 + 3, '#6e4a33');
    for (let k = 0; k < 2; k++) put(im, (R() * 16) | 0, r * 4 + 1 + ((R() * 3) | 0), '#b98a5e');
  }
  return im;
}
// 사물들 (투명 바탕, 외곽선)
function sprite(rows, pal) {
  const im = img(16, 16);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) put(im, x, y, pal[ch], false); }));
  return im;
}
const WOOD = { k: 'ink', w: '#9a6b47', W: '#b98a5e', d: '#6e4a33' };
const door = () => sprite([
  '', '', '   kkkkkkkkkk', '   kddddddddk', '   kdWwwwWwwdk', '   kdWwwwWwwdk', '   kdWwwwWwwdk', '   kdWwwwWwwdk', '   kdWwwYWwwdk', '   kdWwwwWwwdk',
  '   kdWwwwWwwdk', '   kdWwwwWwwdk', '   kdWwwwWwwdk', '   kdWwwwWwwdk', '   kkkkkkkkkkk'].map(r => r.slice(0, 16)), { ...WOOD, Y: 'yellow' });
const table = () => sprite([
  '', '', '', '', '  kkkkkkkkkkkk', '  kWWWWWWWWWWk', '  kwwwwwwwwwwk', '  kddddddddddk', '  kkkkkkkkkkkk', '   kd      dk', '   kd      dk', '   kd      dk', '   kk      kk',
  '', '  k  wk', ''], { ...WOOD });
const cart = () => sprite([
  '', '', '', '  kkkkkkkkkkk', '  kWWWWWWWWWk', '  kwwwwwwwwwk', '  kwwwwwwwwwkkkk', '  kdddddddddk', '  kkkkkkkkkkk', '   kkk   kkk', '  kgsgk kgsgk', '  ksSsk ksSsk',
  '  kgsgk kgsgk', '   kkk   kkk'], { ...WOOD, g: '#555555', s: '#888888', S: '#cccccc' });
const board = () => sprite([
  '', ' kkkkkkkkkkkkkk', ' kWWWWWWWWWWWWk', ' kwPPPwwwPPPwwk', ' kwPRPwwwPRPwwk', ' kwPPPwwwPPPwwk', ' kwwwwwwwwwwwwk', ' kwwPPPwwwwwwwk', ' kwwPRPwwwwwwwk',
  ' kwwPPPwwwwwwwk', ' kddddddddddddk', ' kkkkkkkkkkkkkk', '   kd      dk', '   kd      dk', '   kd      dk', '   kk      kk'], { ...WOOD, P: '#e8e2d0', R: 'red' });
const dummy = () => sprite([
  '', '      kkkk', '     kWWWWk', '     kWwwWk', '     kwwwwk', '      kkkk', '  kkkkkdkkkkk', '  kWWWWwWWWWk', '  kkkkkdkkkkk', '      kdk', '     kwwwk',
  '     kwddk', '      kdk', '      kdk', '    kkkdkkk', '    kdddddk'], { ...WOOD });
const statue = () => sprite([
  '', '      kkkk', '     kSSSSk', '     kSssSk', '      kkkk', '    kkSSSSkk', '   kSSSsssSSk', '   kSsSsssSsk', '   kSsSsssSsk', '    kkSsssk', '     kSssSk',
  '     kSkkSk', '   kkkkkkkkkk', '   kSSSSSSSSk', '   kssssssssk', '   kkkkkkkkkk'], { k: 'ink', S: '#c9c3b8', s: '#8e8a84' });
const altar = () => sprite([
  '', '', '      kYk', '     kYOYk', '      kYk', '    kkkkkkkk', '   kRRRRRRRRk', '   kRrrrrrrRk', '  kkkkkkkkkkkk', '  kSSSSSSSSSSk', '  kSssssssssSk',
  '  kSsGGGGGGsSk', '  kSsGGGGGGsSk', '  kSssssssssSk', '  kkkkkkkkkkkk'], { k: 'ink', Y: 'yellow', O: 'orange', R: 'red', r: '#8a2a2a', S: '#c9c3b8', s: '#8e8a84', G: '#d9b44a' });
const lantern = () => sprite([
  '', '     kkkkkk', '    kSSSSSSk', '   kkkkkkkkkk', '     kSYYSk', '     kSYOSk', '     kSYYSk', '    kkkkkkkk', '      kSSk', '      kSsk',
  '      kSsk', '      kSsk', '    kkkkkkkk', '    kSSSSSSk', '    kkkkkkkk'], { k: 'ink', S: '#c9c3b8', s: '#8e8a84', Y: 'yellow', O: 'orange' });
const herb = () => sprite([
  '', '     k  k', '    kgk kgk', '   kgGgkgGgk', '    kgGGGgk', '  kgkgGgGgkgk', '  kgGgGgGgGgk', '   kkgGgGgkk', '     kgGgk', '    kkkkkkk',
  '   kdddddddk', '   kdWWWWWdk', '   kdwwwwwdk', '    kdwwwdk', '    kkkkkkk'], { ...WOOD, g: 'g1', G: 'g2' });
const cave = () => sprite([
  '', '    kkkkkkkk', '   kSSSSSSSSk', '  kSSkkkkkkSSk', ' kSSkkkkkkkkSSk', ' kSkkkkkkkkkkSk', ' kSkkkkkkkkkkSk', 'kSSkkkkkkkkkkSSk', 'kSkkkkkkkkkkkkSk',
  'kSkkkkkkkkkkkkSk', 'kSkkkkkkkkkkkkSk', 'kSskkkkkkkkkksSk', 'kSskkkkkkkkkksSk', 'kssskkkkkkkkksssk', 'kkkkkkkkkkkkkkkk'].map(r => r.slice(0, 16)), { k: 'ink', S: 'soil2', s: 'soil1' });
// ── 마을 벽(한 칸 두께) 윗면과 가장자리, 땅 그림자 ──
// 윗면: 재질로 꽉 채우고 이음매 몇 줄 (던전과 달리 벽 위가 비어 있지 않다)
function cap(seed, { base, joint, hi }) {
  const im = img(16, 16, base), R = rng(seed);
  for (let r = 0; r < 4; r++) { const y = r * 4 + 3; for (let x = 0; x < 16; x++) put(im, x, y, joint); const j = (r * 5 + ((R() * 8) | 0)) % 16; for (let k = 0; k < 3; k++) put(im, j, y - 1 - k, joint); }
  for (let i = 0; i < 6; i++) put(im, (R() * 16) | 0, (R() * 16) | 0, hi);
  return im;
}
// 가장자리 선: 트인 쪽에 검은 1px + 안쪽 밝은 1px (투명 바탕에 겹친다)
function edge(seed, { side, hi }) {
  const im = img(16, 16);
  for (let i = 0; i < 16; i++) {
    const [x0, y0, x1, y1] = side === 'N' ? [i, 0, i, 1] : side === 'S' ? [i, 15, i, 14] : side === 'E' ? [15, i, 14, i] : [0, i, 1, i];
    put(im, x0, y0, 'ink', false); put(im, x1, y1, hi, false);
  }
  return im;
}
// 땅 그림자: 벽 쪽 가장자리에서 안쪽으로 옅어지는 어둠 (알파)
function shade(seed, { side, depth = 5, a = 0.45 }) {
  const im = img(16, 16);
  for (let k = 0; k < depth; k++) {
    const al = Math.round(255 * a * (1 - k / depth));
    for (let i = 0; i < 16; i++) {
      const [x, y] = side === 'N' ? [i, k] : [k, i];
      im.d.set([20, 16, 24, al], (y * 16 + x) * 4);
    }
  }
  return im;
}
module.exports = { PAL, cap, edge, shade, grass, flowers, road, path, tree, rock, water, falls, planks, door, table, cart, board, dummy, statue, altar, lantern, herb, cave };
