import type {Dungeon, KnownGrid} from './types';
import type {Tile} from '../types';

const VISION_RADIUS_SQUARED = 9;
const VISION_REACH = 3;

export function createKnownGrid(dungeon: Dungeon): KnownGrid {
  return Array.from({length: dungeon.height}, () => Array<boolean>(dungeon.width).fill(false));
}

export function countKnown(known: KnownGrid): number {
  let count = 0;
  for (const row of known) for (const cell of row) if (cell) count++;
  return count;
}

export function explorationPercent(dungeon: Dungeon, known: KnownGrid): number {
  return Math.round((countKnown(known) / dungeon.openTileCount) * 100);
}

export function resetKnownGrid(known: KnownGrid): void {
  for (const row of known) row.fill(false);
}

/**
 * Marks tiles around `at` as known: the whole room when standing in one,
 * otherwise a radius-3 disc. Returns whether anything new was revealed.
 */
export function revealAround(dungeon: Dungeon, known: KnownGrid, at: Tile): boolean {
  let changed = false;
  const reveal = (x: number, y: number): void => {
    if (x >= 0 && y >= 0 && x < dungeon.width && y < dungeon.height && dungeon.grid[y][x] && !known[y][x]) {
      known[y][x] = true;
      changed = true;
    }
  };
  const room = dungeon.chambers.find(([rx, ry, w, h]) => at.x >= rx && at.x < rx + w && at.y >= ry && at.y < ry + h);
  if (room) {
    const [rx, ry, w, h] = room;
    for (let y = ry; y < ry + h; y++) for (let x = rx; x < rx + w; x++) reveal(x, y);
  } else {
    for (let dy = -VISION_REACH; dy <= VISION_REACH; dy++) {
      for (let dx = -VISION_REACH; dx <= VISION_REACH; dx++) {
        if (dx * dx + dy * dy <= VISION_RADIUS_SQUARED) reveal(at.x + dx, at.y + dy);
      }
    }
  }
  return changed;
}

export function chamberIndexAt(dungeon: Dungeon, x: number, y: number): number {
  return dungeon.chambers.findIndex(([rx, ry, w, h]) => x >= rx && x < rx + w && y >= ry && y < ry + h);
}
