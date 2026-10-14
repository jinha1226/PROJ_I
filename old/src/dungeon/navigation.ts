import {Vector3} from 'three';
import {TILE_SIZE} from '../config';
import {worldToTile} from './coordinates';
import {CARDINAL_DIRS, isOpen, tileKey, type Dungeon} from './types';

export interface WorldPath {
  points: Vector3[];
  length: number;
}

const LINE_SAMPLE_STEP = 0.2;

/** World-space collision and path queries on top of the dungeon's tile grid. */
export class Navigator {
  constructor(private readonly dungeon: Dungeon) {}

  /** True when the world position is inside solid rock or outside the map. Walls are tile-aligned, so no radius is needed. */
  blocked(x: number, z: number): boolean {
    const {x: tx, y: ty} = worldToTile(x, z, this.dungeon);
    return !isOpen(this.dungeon, tx, ty);
  }

  lineClear(from: Vector3, to: Vector3): boolean {
    if (this.blocked(from.x, from.z) || this.blocked(to.x, to.z)) return false;
    const samples = Math.max(1, Math.ceil(from.distanceTo(to) / LINE_SAMPLE_STEP));
    for (let i = 1; i < samples; i++) {
      const t = i / samples;
      if (this.blocked(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t)) return false;
    }
    return true;
  }

  /** Four-way BFS between the tiles containing the two positions. */
  findPath(from: Vector3, goal: Vector3): WorldPath | null {
    const {dungeon} = this;
    const start = worldToTile(from.x, from.z, dungeon);
    const target = worldToTile(goal.x, goal.z, dungeon);
    const queue: [number, number][] = [[start.x, start.y]];
    const seen = new Set<string>([tileKey(start.x, start.y)]);
    const parent = new Map<string, [number, number]>();

    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      if (x === target.x && y === target.y) return this.buildPath(parent, [x, y], start);
      for (const [dx, dy] of CARDINAL_DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        const key = tileKey(nx, ny);
        if (!isOpen(dungeon, nx, ny) || seen.has(key)) continue;
        seen.add(key);
        parent.set(key, [x, y]);
        queue.push([nx, ny]);
      }
    }
    return null;
  }

  /** Distance fields keyed by start tile index; the dungeon is static so they never go stale. */
  private readonly fields = new Map<number, Int16Array>();

  /**
   * Answers "how far is the walk from `from` to X?" for many targets.
   * Equivalent to findPath(from, to).length, but computed once per start tile
   * and cached, because combat AI asks this dozens of times per actor per step.
   */
  pathCosts(from: Vector3): (to: Vector3) => number | null {
    const {width, height} = this.dungeon;
    const start = worldToTile(from.x, from.z, this.dungeon);
    const inside = start.x >= 0 && start.y >= 0 && start.x < width && start.y < height;
    // The map border is always rock, so a start outside the grid reaches nothing but itself.
    const field = inside ? this.distanceField(start.y * width + start.x) : null;
    return to => {
      const tile = worldToTile(to.x, to.z, this.dungeon);
      if (tile.x === start.x && tile.y === start.y) return 0;
      if (!field || tile.x < 0 || tile.y < 0 || tile.x >= width || tile.y >= height) return null;
      const steps = field[tile.y * width + tile.x];
      return steps < 0 ? null : steps * TILE_SIZE;
    };
  }

  private distanceField(startIndex: number): Int16Array {
    const cached = this.fields.get(startIndex);
    if (cached) return cached;
    const {width, height, grid} = this.dungeon;
    const field = new Int16Array(width * height).fill(-1);
    const queue = new Int32Array(width * height);
    field[startIndex] = 0;
    queue[0] = startIndex;
    let tail = 1;
    for (let head = 0; head < tail; head++) {
      const index = queue[head];
      const x = index % width;
      const y = (index - x) / width;
      const next = field[index] + 1;
      for (const [dx, dy] of CARDINAL_DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || grid[ny][nx] !== 1) continue;
        const ni = ny * width + nx;
        if (field[ni] !== -1) continue;
        field[ni] = next;
        queue[tail++] = ni;
      }
    }
    this.fields.set(startIndex, field);
    return field;
  }

  private buildPath(parent: Map<string, [number, number]>, end: [number, number], start: {x: number; y: number}): WorldPath | null {
    const {width, height} = this.dungeon;
    const points: Vector3[] = [];
    let at: [number, number] | undefined = end;
    while (at && (at[0] !== start.x || at[1] !== start.y)) {
      points.unshift(new Vector3((at[0] - width / 2) * TILE_SIZE, 0, (at[1] - height / 2) * TILE_SIZE));
      at = parent.get(tileKey(at[0], at[1]));
    }
    if (!at) return null;
    return {points, length: points.length * TILE_SIZE};
  }
}
