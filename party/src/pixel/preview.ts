// 도트 캐릭터 미리보기: 8배 확대 시트 + 실제 크기 줄(숨쉬기 애니메이션)
import { CHARS, SLIME_PAL, W, H, compose, composeSlime, draw } from './chars';

const cv = document.getElementById('c') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
const all = [...CHARS.map((c) => ({ name: c.name, grid: (f: number) => compose(c, f), pal: c.pal })), { name: '슬라임', grid: composeSlime, pal: SLIME_PAL }];
const BIG = 8, PER = 6;
const rows = Math.ceil(all.length / PER);
cv.width = PER * (W * BIG + 16) + 16;
cv.height = rows * (H * BIG + 30) + 160;

let frame = 0;
function render() {
  ctx.fillStyle = '#2a2230';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.font = '13px sans-serif';
  all.forEach((c, i) => {
    const x = 16 + (i % PER) * (W * BIG + 16), y = 10 + Math.floor(i / PER) * (H * BIG + 30);
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(x, y, W * BIG, H * BIG);
    draw(ctx, c.grid(0), c.pal, x, y, BIG);
    ctx.fillStyle = '#ddd';
    ctx.fillText(c.name, x, y + H * BIG + 18);
  });
  // 실제 크기 (3배) 줄: 바닥 타일 위에 나란히, 숨쉬기
  const y0 = rows * (H * BIG + 30) + 30;
  ctx.fillStyle = '#4a3e3a';
  ctx.fillRect(0, y0 - 10, cv.width, 120);
  all.forEach((c, i) => draw(ctx, c.grid(frame + i), c.pal, 20 + i * 70, y0, 3));
  all.forEach((c, i) => draw(ctx, c.grid(frame + i), c.pal, 30 + i * 70, y0 + 80, 1));
}
render();
setInterval(() => { frame++; render(); }, 500);
