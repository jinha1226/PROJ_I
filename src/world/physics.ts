import {TILE, WALL_INSET} from '../config';
import type {Vec2} from '../core/math';
import {isFloor, toTile, type Circle, type GameMap} from './mapgen';

type TileMap = Pick<GameMap, 'w' | 'h' | 'tiles'>;

/**
 * Pushes a circle out of rock tiles (inflated by the wall thickness) and static
 * colliders. Mutates `pos` in place — called for every body every frame.
 * Returns true when anything was hit.
 */
export function resolveCollisions(map: TileMap, colliders: readonly Circle[], pos: Vec2, r: number): boolean {
  let hit = false;
  for (let pass = 0; pass < 2; pass++) {
    const tx = toTile(pos.x);
    const ty = toTile(pos.z);
    for (let y = ty - 1; y <= ty + 1; y++) {
      for (let x = tx - 1; x <= tx + 1; x++) {
        if (isFloor(map, x, y)) continue;
        const minX = x * TILE - WALL_INSET;
        const maxX = (x + 1) * TILE + WALL_INSET;
        const minZ = y * TILE - WALL_INSET;
        const maxZ = (y + 1) * TILE + WALL_INSET;
        const cx = Math.max(minX, Math.min(pos.x, maxX));
        const cz = Math.max(minZ, Math.min(pos.z, maxZ));
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        hit = true;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * r;
          pos.z = cz + (dz / d) * r;
        } else {
          // Center is inside the box: shove out along the shallowest axis.
          const pushes = [pos.x - minX, maxX - pos.x, pos.z - minZ, maxZ - pos.z];
          const i = pushes.indexOf(Math.min(...pushes));
          if (i === 0) pos.x = minX - r;
          else if (i === 1) pos.x = maxX + r;
          else if (i === 2) pos.z = minZ - r;
          else pos.z = maxZ + r;
        }
      }
    }
  }
  for (const c of colliders) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const min = c.r + r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min || d2 < 1e-8) continue;
    const d = Math.sqrt(d2);
    pos.x = c.x + (dx / d) * min;
    pos.z = c.z + (dz / d) * min;
    hit = true;
  }
  return hit;
}

/** True when no circular collider (inflated by `r`) crosses the segment a→b, ignoring ones at either end. */
export function segmentClear(colliders: readonly Circle[], a: Vec2, b: Vec2, r: number): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz || 1e-6;
  for (const c of colliders) {
    // The goal itself (a chest) or something we already touch never blocks.
    const near = (p: Vec2): boolean => (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < (c.r + r + 0.4) ** 2;
    if (near(a) || near(b)) continue;
    const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.z - a.z) * dz) / len2));
    const px = a.x + dx * t - c.x;
    const pz = a.z + dz * t - c.z;
    if (px * px + pz * pz < (c.r + r) ** 2) return false;
  }
  return true;
}

/** Extra path cost for tiles whose center sits inside a big prop, so paths flow around furniture. */
const PROP_TILE_PENALTY = 8;
const BIG_PROP = 0.8;

function propPenalties(map: TileMap & {colliders?: readonly Circle[]}): Float32Array {
  const pen = new Float32Array(map.w * map.h);
  for (const c of map.colliders ?? []) {
    if (c.r < BIG_PROP) continue;
    const tx = toTile(c.x);
    const ty = toTile(c.z);
    for (let y = ty - 1; y <= ty + 1; y++) {
      for (let x = tx - 1; x <= tx + 1; x++) {
        if (!isFloor(map, x, y)) continue;
        const d = Math.hypot(x * TILE + TILE / 2 - c.x, y * TILE + TILE / 2 - c.z);
        if (d < c.r + 0.9) pen[y * map.w + x] = PROP_TILE_PENALTY;
      }
    }
  }
  return pen;
}

/** True when nothing but floor lies between a and b (sampled every half unit). */
export function lineOfSight(map: TileMap, a: Vec2, b: Vec2): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const steps = Math.ceil(Math.hypot(dx, dz) / 0.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!isFloor(map, toTile(a.x + dx * t), toTile(a.z + dz * t))) return false;
  }
  return true;
}

/** Is the world point standing on floor (outside the wall inset)? */
export function isWalkable(map: TileMap, p: Vec2, margin = WALL_INSET): boolean {
  const corners: [number, number][] = [
    [p.x - margin, p.z - margin],
    [p.x + margin, p.z - margin],
    [p.x - margin, p.z + margin],
    [p.x + margin, p.z + margin],
  ];
  return corners.every(([x, z]) => isFloor(map, toTile(x), toTile(z)));
}

const NEIGHBORS: readonly (readonly [number, number, number])[] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.414],
  [1, -1, 1.414],
  [-1, 1, 1.414],
  [-1, -1, 1.414],
];

/**
 * Distance field toward one target tile. Every chasing enemy reads it to pick
 * its next tile, so one Dijkstra pass serves the whole horde.
 */
export class FlowField {
  readonly cost: Float32Array;
  private targetIdx = -1;
  private readonly penalty: Float32Array;

  constructor(private readonly map: TileMap & {colliders?: readonly Circle[]}) {
    this.cost = new Float32Array(map.w * map.h).fill(Infinity);
    this.penalty = propPenalties(map);
  }

  /** Recomputes only when the target moves to another tile. */
  update(target: Vec2): void {
    const tx = toTile(target.x);
    const ty = toTile(target.z);
    const idx = ty * this.map.w + tx;
    if (idx === this.targetIdx || !isFloor(this.map, tx, ty)) return;
    this.targetIdx = idx;
    const {w} = this.map;
    this.cost.fill(Infinity);
    this.cost[idx] = 0;
    // Small maps: a simple bucketed relaxation is fast enough and allocation-light.
    const queue: number[] = [idx];
    for (let i = 0; i < queue.length; i++) {
      const cur = queue[i];
      const cx = cur % w;
      const cy = (cur - cx) / w;
      for (const [dx, dy, c] of NEIGHBORS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!isFloor(this.map, nx, ny)) continue;
        // No corner cutting through rock.
        if (dx && dy && (!isFloor(this.map, cx + dx, cy) || !isFloor(this.map, cx, cy + dy))) continue;
        const n = ny * w + nx;
        const next = this.cost[cur] + c + this.penalty[n];
        if (next < this.cost[n] - 1e-4) {
          this.cost[n] = next;
          queue.push(n);
        }
      }
    }
  }

  /** World-space waypoint (center of the best neighboring tile) for a body at `from`. */
  nextStep(from: Vec2): Vec2 | null {
    const tx = toTile(from.x);
    const ty = toTile(from.z);
    const here = this.cost[ty * this.map.w + tx];
    if (!Number.isFinite(here)) return null;
    let best = here;
    let bx = tx;
    let by = ty;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!isFloor(this.map, nx, ny)) continue;
      if (dx && dy && (!isFloor(this.map, tx + dx, ty) || !isFloor(this.map, tx, ty + dy))) continue;
      const c = this.cost[ny * this.map.w + nx];
      if (c < best) {
        best = c;
        bx = nx;
        by = ny;
      }
    }
    if (bx === tx && by === ty) return null;
    return {x: bx * TILE + TILE / 2, z: by * TILE + TILE / 2};
  }

  stepsFrom(from: Vec2): number {
    return this.cost[toTile(from.z) * this.map.w + toTile(from.x)];
  }
}
