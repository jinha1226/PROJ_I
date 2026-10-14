import type {Point} from '../types';

/** A rectangular room: [x, y, width, height] in tile coordinates. */
export type Chamber = readonly [x: number, y: number, width: number, height: number];

export interface Dungeon {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  /** grid[y][x] is 1 for floor, 0 for solid rock. */
  readonly grid: readonly (readonly number[])[];
  readonly chambers: readonly Chamber[];
  /** Center tile of each chamber; centers[0] is the entrance. */
  readonly centers: readonly Point[];
  readonly openTileCount: number;
}

export type KnownGrid = boolean[][];

export const CARDINAL_DIRS: readonly Point[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function tileKey(x: number, y: number): string {
  return x + ',' + y;
}

export function isOpen(dungeon: Dungeon, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < dungeon.width && y < dungeon.height && dungeon.grid[y][x] === 1;
}
