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
module.exports = { PAL, grass, flowers, road, path, tree };
