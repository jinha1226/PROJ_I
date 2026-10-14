import type {Point, Tile} from '../types';
import {CARDINAL_DIRS, tileKey, type Dungeon, type KnownGrid} from './types';

const REVISIT_PENALTY = 2.5;
const FRONTIER_BONUS = 3;

interface Candidate {
  x: number;
  y: number;
  d: number;
}

function unseenNeighbors(dungeon: Dungeon, known: KnownGrid, c: Candidate): number {
  let count = 0;
  for (const [dx, dy] of CARDINAL_DIRS) {
    const x = c.x + dx;
    const y = c.y + dy;
    if (x >= 0 && y >= 0 && x < dungeon.width && y < dungeon.height && dungeon.grid[y][x] && !known[y][x]) count++;
  }
  return count;
}

export interface RouteRequest {
  dungeon: Dungeon;
  known: KnownGrid;
  from: Tile;
  /** How many times each tile has been walked; used by the Pathfinder skill. */
  visits: ReadonlyMap<string, number>;
  pathfinderSkill: boolean;
}

/**
 * Picks the next unexplored tile and returns the walkable path to it
 * (excluding the current tile). Without Pathfinder the closest unseen tile
 * wins; with it, promising frontiers are preferred and retracing is penalised.
 */
export function nextExplorationRoute({dungeon, known, from, visits, pathfinderSkill}: RouteRequest): Point[] {
  const start = tileKey(from.x, from.y);
  const queue: Point[] = [[from.x, from.y]];
  const seen = new Set<string>([start]);
  const parent = new Map<string, Point>();
  const distance = new Map<string, number>([[start, 0]]);
  const candidates: Candidate[] = [];

  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    const d = distance.get(tileKey(x, y)) ?? 0;
    if (!known[y][x] && dungeon.grid[y][x]) {
      candidates.push({x, y, d});
      continue;
    }
    for (const [dx, dy] of CARDINAL_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      const key = tileKey(nx, ny);
      if (nx < 0 || ny < 0 || nx >= dungeon.width || ny >= dungeon.height || !dungeon.grid[ny][nx] || seen.has(key)) continue;
      seen.add(key);
      parent.set(key, [x, y]);
      distance.set(key, d + 1);
      queue.push([nx, ny]);
    }
  }
  if (!candidates.length) return [];

  let best = candidates[0];
  let bestScore = Infinity;
  for (const c of candidates) {
    const score = pathfinderSkill
      ? c.d + (visits.get(tileKey(c.x, c.y)) ?? 0) * REVISIT_PENALTY - unseenNeighbors(dungeon, known, c) * FRONTIER_BONUS
      : c.d;
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  }

  const path: Point[] = [];
  let target: Point | undefined = [best.x, best.y];
  while (target && (target[0] !== from.x || target[1] !== from.y)) {
    path.push(target);
    target = parent.get(tileKey(target[0], target[1]));
  }
  return path.reverse();
}
