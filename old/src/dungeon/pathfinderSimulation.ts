import type {Point, Tile} from '../types';
import {createKnownGrid, revealAround} from './fog';
import {CARDINAL_DIRS, tileKey, type Dungeon} from './types';

const REVISIT_PENALTY = 2.5;
const FRONTIER_BONUS = 3;
const COVERAGE_MILESTONES = [50, 90, 100] as const;

export interface SimulationResult {
  hasSkill: boolean;
  history: Point[];
  distance: number;
  revisited: number;
  backtrack: number;
  deadEnds: number;
  thresholds: Record<number, number | null>;
  coverage: number;
  complete: boolean;
}

interface Candidate {
  x: number;
  y: number;
  d: number;
}

/**
 * Deterministic headless A/B exploration: identical map, start, visibility and
 * movement speed; only the Pathfinder skill differs. Combat time is excluded.
 */
export function simulatePathfinder(hasSkill: boolean, dungeon: Dungeon): SimulationResult {
  const {width, height, grid, centers} = dungeon;
  const known = createKnownGrid(dungeon);
  const visits = new Map<string, number>();
  const history: Point[] = [];
  const start = centers[0];
  const pos: Tile = {x: start[0], y: start[1]};
  const inBounds = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height;
  const knownCount = (): number => known.reduce((n, row) => n + row.filter(Boolean).length, 0);

  const thresholds: Record<number, number | null> = {50: null, 90: null, 100: null};
  let distance = 0;
  let revisited = 0;
  let deadEnds = 0;
  let backtrack = 0;

  const step = (x: number, y: number): void => {
    const key = tileKey(x, y);
    if (visits.has(key)) revisited++;
    visits.set(key, (visits.get(key) ?? 0) + 1);
    history.push([x, y]);
    pos.x = x;
    pos.y = y;
    distance++;
    revealAround(dungeon, known, pos);
    const percent = (100 * knownCount()) / dungeon.openTileCount;
    for (const t of COVERAGE_MILESTONES) if (thresholds[t] === null && percent >= t) thresholds[t] = distance;
  };

  step(start[0], start[1]);
  distance = 0;

  const unseenAround = (c: Candidate): number =>
    CARDINAL_DIRS.reduce((n, [dx, dy]) => {
      const x = c.x + dx;
      const y = c.y + dy;
      return n + (inBounds(x, y) && grid[y][x] && !known[y][x] ? 1 : 0);
    }, 0);

  for (let guard = 0; guard < width * height * 12; guard++) {
    const queue: Point[] = [[pos.x, pos.y]];
    const seen = new Set<string>([tileKey(pos.x, pos.y)]);
    const parent = new Map<string, Point>();
    const dist = new Map<string, number>([[tileKey(pos.x, pos.y), 0]]);
    const candidates: Candidate[] = [];

    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      const d = dist.get(tileKey(x, y)) ?? 0;
      if (!known[y][x]) candidates.push({x, y, d});
      for (const [dx, dy] of CARDINAL_DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        const key = tileKey(nx, ny);
        if (!inBounds(nx, ny) || !grid[ny][nx] || seen.has(key)) continue;
        seen.add(key);
        parent.set(key, [x, y]);
        dist.set(key, d + 1);
        queue.push([nx, ny]);
      }
    }
    if (!candidates.length) break;

    let chosen = candidates[0];
    let best = Infinity;
    for (const c of candidates) {
      const score = hasSkill ? c.d + (visits.get(tileKey(c.x, c.y)) ?? 0) * REVISIT_PENALTY - unseenAround(c) * FRONTIER_BONUS : c.d;
      if (score < best) {
        best = score;
        chosen = c;
      }
    }

    const path: Point[] = [];
    let p: Point | undefined = [chosen.x, chosen.y];
    while (p && (p[0] !== pos.x || p[1] !== pos.y)) {
      path.push(p);
      p = parent.get(tileKey(p[0], p[1]));
    }
    path.reverse();
    if (!path.length) break;

    if (path.length > 1) backtrack += path.slice(0, -1).filter(([x, y]) => visits.has(tileKey(x, y))).length;
    const exits = CARDINAL_DIRS.filter(([dx, dy]) => {
      const x = pos.x + dx;
      const y = pos.y + dy;
      return inBounds(x, y) && grid[y][x];
    }).length;
    if (exits === 1) deadEnds++;
    for (const [x, y] of path) step(x, y);
  }

  const total = dungeon.openTileCount;
  return {
    hasSkill,
    history,
    distance,
    revisited,
    backtrack,
    deadEnds,
    thresholds,
    coverage: Math.round((100 * knownCount()) / total),
    complete: !known.some((row, y) => row.some((v, x) => grid[y][x] && !v)),
  };
}
