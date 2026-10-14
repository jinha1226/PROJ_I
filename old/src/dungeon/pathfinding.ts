import type {Point} from '../types';
import {CARDINAL_DIRS, tileKey} from './types';

/** Pure grid BFS. Returns [] if already at the destination or no route exists. */
export function routeBetween(
  grid: readonly (readonly number[])[],
  start: Point,
  goal: Point,
  dirs: readonly Point[] = CARDINAL_DIRS,
): Point[] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const valid = ([x, y]: Point): boolean => x >= 0 && y >= 0 && x < width && y < height && Boolean(grid[y][x]);
  if (!valid(start) || !valid(goal)) return [];

  const queue: Point[] = [start];
  const seen = new Set<string>([tileKey(...start)]);
  const parents = new Map<string, Point>();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p[0] === goal[0] && p[1] === goal[1]) break;
    for (const [dx, dy] of dirs) {
      const next: Point = [p[0] + dx, p[1] + dy];
      const key = tileKey(...next);
      if (!valid(next) || seen.has(key)) continue;
      seen.add(key);
      parents.set(key, p);
      queue.push(next);
    }
  }
  if (!seen.has(tileKey(...goal))) return [];

  const path: Point[] = [];
  let p: Point | undefined = goal;
  while (tileKey(...p) !== tileKey(...start)) {
    path.push(p);
    p = parents.get(tileKey(...p));
    if (!p) return [];
  }
  return path.reverse();
}
