import type {Point} from '../types';
import type {Chamber, Dungeon} from './types';

export const DEFAULT_DUNGEON_SEED = 14729;
const WIDTH = 76;
const HEIGHT = 54;
const MAX_CHAMBERS = 18;
const MAX_PLACEMENT_ATTEMPTS = 1400;
const CHAMBER_CLEARANCE = 2;
const LOOP_DISTANCE = 23;
const LOOP_CHANCE = 0.22;

/** Numerical Recipes LCG; the sequence is part of the dungeon layout contract. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Builds the deterministic dungeon: seeded variable-size rooms with minimum
 * clearance, a spanning tree of corridors, and a few extra loops.
 */
export function generateDungeon(seed: number = DEFAULT_DUNGEON_SEED): Dungeon {
  const random = createRandom(seed);
  const grid = Array.from({length: HEIGHT}, () => Array<number>(WIDTH).fill(0));
  const chambers: Chamber[] = [];

  const dig = (x: number, y: number): void => {
    if (x >= 1 && x < WIDTH - 1 && y >= 1 && y < HEIGHT - 1) grid[y][x] = 1;
  };

  const carveTunnel = (from: Point, to: Point): void => {
    let [x, y] = from;
    const [targetX, targetY] = to;
    const horizontalFirst = random() < 0.5;
    const lineX = (): void => {
      while (x !== targetX) {
        dig(x, y);
        x += Math.sign(targetX - x);
      }
      dig(x, y);
    };
    const lineY = (): void => {
      while (y !== targetY) {
        dig(x, y);
        y += Math.sign(targetY - y);
      }
      dig(x, y);
    };
    if (horizontalFirst) {
      lineX();
      lineY();
    } else {
      lineY();
      lineX();
    }
  };

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && chambers.length < MAX_CHAMBERS; attempt++) {
    const w = 7 + Math.floor(random() * 7);
    const h = 6 + Math.floor(random() * 6);
    const x = 2 + Math.floor(random() * (WIDTH - w - 4));
    const y = 2 + Math.floor(random() * (HEIGHT - h - 4));
    const crowded = chambers.some(
      ([rx, ry, rw, rh]) =>
        x < rx + rw + CHAMBER_CLEARANCE &&
        x + w + CHAMBER_CLEARANCE > rx &&
        y < ry + rh + CHAMBER_CLEARANCE &&
        y + h + CHAMBER_CLEARANCE > ry,
    );
    if (crowded) continue;
    chambers.push([x, y, w, h]);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) dig(i, j);
  }

  const centers: Point[] = chambers.map(([x, y, w, h]) => [Math.floor(x + w / 2), Math.floor(y + h / 2)]);

  // Connect every room to the entrance cluster, nearest pair first.
  const connected = new Set<number>([0]);
  while (connected.size < centers.length) {
    let best: {i: number; j: number; d: number} | null = null;
    for (const i of connected) {
      for (let j = 0; j < centers.length; j++) {
        if (connected.has(j)) continue;
        const d = (centers[i][0] - centers[j][0]) ** 2 + (centers[i][1] - centers[j][1]) ** 2;
        if (!best || d < best.d) best = {i, j, d};
      }
    }
    if (!best) break;
    carveTunnel(centers[best.i], centers[best.j]);
    connected.add(best.j);
  }

  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const d = Math.hypot(centers[i][0] - centers[j][0], centers[i][1] - centers[j][1]);
      if (d < LOOP_DISTANCE && random() < LOOP_CHANCE) carveTunnel(centers[i], centers[j]);
    }
  }

  const openTileCount = grid.reduce((sum, row) => sum + row.reduce((n, v) => n + v, 0), 0);
  return {seed, width: WIDTH, height: HEIGHT, grid, chambers, centers, openTileCount};
}

/** The one dungeon the game currently ships with. */
export const FIXED_DUNGEON: Dungeon = generateDungeon();
