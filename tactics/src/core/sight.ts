// 시야: 바위 · 증기 · 연기가 가린다 (오크 사제의 내리치기 · 화살 · 지팡이)
import { blocked, cellAt, eq } from './board';
import type { Battle, Cell, Vec } from './types';

/** 증기 · 연기: 시야와 원거리 공격이 지나가지 못한다 */
export const opaque = (c: Cell) => c.steam > 0 || c.smoke > 0;

/**
 * a에서 b가 보이나. 브레젠햄 직선이 바위를 지나면 안 보인다. 증기 · 연기는 양 끝 칸에 있어도 가린다.
 * 유닛은 시야를 막지 않는다. 두 끝을 정렬해 그리므로 a→b와 b→a가 같다
 */
export function sees(b: Battle, from: Vec, to: Vec): boolean {
  const [a, z] = from.y < to.y || (from.y === to.y && from.x <= to.x) ? [from, to] : [to, from];
  const dx = Math.abs(z.x - a.x);
  const dy = -Math.abs(z.y - a.y);
  const sx = a.x < z.x ? 1 : -1;
  const sy = a.y < z.y ? 1 : -1;
  let err = dx + dy;
  let x = a.x;
  let y = a.y;
  for (;;) {
    const p = { x, y };
    if (opaque(cellAt(b, p))) return false;
    const end = x === z.x && y === z.y;
    if (end) return true;
    if (!eq(p, a) && blocked(b, p)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
