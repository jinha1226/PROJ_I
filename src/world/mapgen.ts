import {TILE, WALL_INSET} from '../config';
import {Rng} from '../core/rng';
import type {Vec2} from '../core/math';
import type {ContainerType} from '../items/loot';

export type RoomKind = 'spawn' | 'normal' | 'treasure' | 'extract';
export type EnemyKind = 'warrior' | 'mage' | 'raider';

export interface Room {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: RoomKind;
}

export interface ContainerSpawn extends Vec2 {
  type: ContainerType;
  rot: number;
}

export interface EnemySpawn extends Vec2 {
  kind: EnemyKind;
  dormant: boolean;
}

export interface ExtractPoint extends Vec2 {
  name: string;
}

/** A static dungeon piece; `radius` > 0 makes it block movement. */
export interface PropPlacement extends Vec2 {
  piece: string;
  rot: number;
  radius: number;
  y?: number;
}

export interface Circle extends Vec2 {
  r: number;
}

export interface GameMap {
  w: number;
  h: number;
  /** 1 = floor, 0 = solid rock. Index: y * w + x. */
  tiles: Uint8Array;
  rooms: Room[];
  spawn: Vec2;
  extracts: ExtractPoint[];
  containers: ContainerSpawn[];
  enemies: EnemySpawn[];
  props: PropPlacement[];
  torches: PropPlacement[];
  raiderSpawns: Vec2[];
  colliders: Circle[];
}

const MAP_SIZE = 34;
const ROOM_TARGET = 13;
const ROOM_ATTEMPTS = 500;
const ROOM_MIN = 3;
const ROOM_MAX = 6;
const ROOM_GAP = 2;
const EXTRA_LOOPS = 3;
const SAFE_SPAWN_STEPS = 6;
const CONTAINER_RADIUS = 0.85;
const PILLAR_RADIUS = 0.8;

export const tileCenter = (t: number): number => t * TILE + TILE / 2;
export const toTile = (world: number): number => Math.floor(world / TILE);

export function isFloor(map: Pick<GameMap, 'w' | 'h' | 'tiles'>, tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < map.w && ty < map.h && map.tiles[ty * map.w + tx] === 1;
}

const centerOf = (r: Room): [number, number] => [r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)];
const inRoom = (r: Room, x: number, y: number): boolean => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;

function placeRooms(rng: Rng): Room[] {
  const rooms: Room[] = [];
  for (let i = 0; i < ROOM_ATTEMPTS && rooms.length < ROOM_TARGET; i++) {
    const w = rng.int(ROOM_MIN, ROOM_MAX);
    const h = rng.int(ROOM_MIN, ROOM_MAX);
    const x = rng.int(1, MAP_SIZE - w - 1);
    const y = rng.int(1, MAP_SIZE - h - 1);
    const overlaps = rooms.some(r => x < r.x + r.w + ROOM_GAP && r.x < x + w + ROOM_GAP && y < r.y + r.h + ROOM_GAP && r.y < y + h + ROOM_GAP);
    if (!overlaps) rooms.push({id: rooms.length, x, y, w, h, kind: 'normal'});
  }
  return rooms;
}

/** Minimum spanning tree over room centers plus a few shortcut loops. */
function roomLinks(rooms: Room[], rng: Rng): [number, number][] {
  const d = (a: number, b: number): number => {
    const [ax, ay] = centerOf(rooms[a]);
    const [bx, by] = centerOf(rooms[b]);
    return Math.abs(ax - bx) + Math.abs(ay - by);
  };
  const inTree = new Set([0]);
  const links: [number, number][] = [];
  while (inTree.size < rooms.length) {
    let best: [number, number] | null = null;
    for (const a of inTree) {
      for (let b = 0; b < rooms.length; b++) {
        if (inTree.has(b)) continue;
        if (!best || d(a, b) < d(best[0], best[1])) best = [a, b];
      }
    }
    if (!best) break;
    links.push(best);
    inTree.add(best[1]);
  }
  const linked = new Set(links.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  const extras: [number, number][] = [];
  for (let a = 0; a < rooms.length; a++) {
    for (let b = a + 1; b < rooms.length; b++) if (!linked.has(`${a}-${b}`)) extras.push([a, b]);
  }
  extras.sort((p, q) => d(...p) - d(...q));
  return [...links, ...rng.shuffle(extras.slice(0, EXTRA_LOOPS * 3)).slice(0, EXTRA_LOOPS)];
}

function carve(tiles: Uint8Array, x: number, y: number): void {
  tiles[y * MAP_SIZE + x] = 1;
}

function carveLine(tiles: Uint8Array, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) carve(tiles, x, y);
  }
}

/** L-shaped one-tile corridor between two room centers. */
function carveCorridor(tiles: Uint8Array, a: Room, b: Room, rng: Rng): void {
  const [ax, ay] = centerOf(a);
  const [bx, by] = centerOf(b);
  const [cx, cy] = rng.chance(0.5) ? [bx, ay] : [ax, by];
  carveLine(tiles, ax, ay, cx, cy);
  carveLine(tiles, cx, cy, bx, by);
}

/** BFS step distances from a tile over floor tiles (4-connected); -1 = unreachable. */
export function tileDistances(map: Pick<GameMap, 'w' | 'h' | 'tiles'>, sx: number, sy: number): Int32Array {
  const dist = new Int32Array(map.w * map.h).fill(-1);
  if (!isFloor(map, sx, sy)) return dist;
  const queue = [sy * map.w + sx];
  dist[queue[0]] = 0;
  for (let i = 0; i < queue.length; i++) {
    const idx = queue[i];
    const x = idx % map.w;
    const y = (idx - x) / map.w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const n = ny * map.w + nx;
      if (isFloor(map, nx, ny) && dist[n] < 0) {
        dist[n] = dist[idx] + 1;
        queue.push(n);
      }
    }
  }
  return dist;
}

function compassName(x: number, y: number): string {
  const mid = MAP_SIZE / 2;
  const third = MAP_SIZE / 6;
  const ns = y < mid - third ? '북' : y > mid + third ? '남' : '';
  const ew = x < mid - third ? '서' : x > mid + third ? '동' : '';
  return ns + ew || '중앙';
}

const EXTRACT_STYLES = ['밧줄 사다리', '무너진 하수구', '고대 승강 계단'];

const DIRS: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Facing angle that points away from a wall in direction (dx, dy). */
const awayFromWall = (dx: number, dy: number): number => Math.atan2(-dx, -dy);

interface Ctx {
  rng: Rng;
  map: GameMap;
  used: Set<number>;
}

/** Room-edge tiles backed by rock on one side and not next to a doorway. */
function wallSlots(ctx: Ctx, room: Room): {x: number; y: number; dx: number; dy: number}[] {
  const slots: {x: number; y: number; dx: number; dy: number}[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      for (const [dx, dy] of DIRS) {
        if (isFloor(ctx.map, x + dx, y + dy)) continue;
        const doorway = DIRS.some(([ex, ey]) => {
          const nx = x + ex;
          const ny = y + ey;
          return !inRoom(room, nx, ny) && isFloor(ctx.map, nx, ny);
        });
        if (!doorway) slots.push({x, y, dx, dy});
      }
    }
  }
  return slots;
}

function placeContainer(ctx: Ctx, room: Room, type: ContainerType): void {
  const free = wallSlots(ctx, room).filter(s => !ctx.used.has(s.y * MAP_SIZE + s.x));
  if (!free.length) return;
  const s = ctx.rng.pick(free);
  ctx.used.add(s.y * MAP_SIZE + s.x);
  const push = TILE / 2 - WALL_INSET - 0.9;
  const x = tileCenter(s.x) + s.dx * push;
  const z = tileCenter(s.y) + s.dy * push;
  ctx.map.containers.push({type, x, z, rot: awayFromWall(s.dx, s.dy)});
  ctx.map.colliders.push({x, z, r: CONTAINER_RADIUS});
}

function decorateRoom(ctx: Ctx, room: Room): void {
  const {rng, map} = ctx;
  if (room.w >= 5 && room.h >= 5) {
    const corners: [number, number][] = [
      [room.x + 1, room.y + 1],
      [room.x + room.w - 2, room.y + 1],
      [room.x + 1, room.y + room.h - 2],
      [room.x + room.w - 2, room.y + room.h - 2],
    ];
    for (const [tx, ty] of corners) {
      ctx.used.add(ty * MAP_SIZE + tx);
      const x = tileCenter(tx);
      const z = tileCenter(ty);
      map.props.push({piece: 'pillar', x, z, rot: 0, radius: PILLAR_RADIUS});
      map.colliders.push({x, z, r: PILLAR_RADIUS});
    }
  }
  // Wall torches only on walls the camera faces (north / west / east), never south.
  const torchSlots = rng.shuffle(wallSlots(ctx, room).filter(s => s.dy !== 1)).slice(0, room.w * room.h >= 20 ? 3 : 2);
  for (const s of torchSlots) {
    const push = TILE / 2 - WALL_INSET;
    map.torches.push({piece: 'torch_mounted', x: tileCenter(s.x) + s.dx * push, z: tileCenter(s.y) + s.dy * push, y: 2.2, rot: awayFromWall(s.dx, s.dy), radius: 0});
  }
  const northSlots = wallSlots(ctx, room).filter(s => s.dy === -1);
  if (northSlots.length && rng.chance(0.45)) {
    const bannerSlot = rng.pick(northSlots);
    const push = TILE / 2;
    const color = rng.pick(['red', 'blue', 'green', 'yellow']);
    map.props.push({piece: `banner_patternA_${color}`, x: tileCenter(bannerSlot.x), z: tileCenter(bannerSlot.y) + bannerSlot.dy * push, rot: 0, radius: 0});
  }
  if (room.kind !== 'spawn' && rng.chance(0.35)) {
    const tx = room.x + Math.floor(room.w / 2);
    const ty = room.y + Math.floor(room.h / 2);
    if (!ctx.used.has(ty * MAP_SIZE + tx) && room.kind !== 'extract') {
      ctx.used.add(ty * MAP_SIZE + tx);
      const piece = rng.pick(['table_medium_decorated_A', 'crates_stacked', 'keg_decorated', 'barrel_small_stack']);
      const x = tileCenter(tx) + rng.range(-0.6, 0.6);
      const z = tileCenter(ty) + rng.range(-0.6, 0.6);
      map.props.push({piece, x, z, rot: rng.pick([0, Math.PI / 2]), radius: 1.1});
      map.colliders.push({x, z, r: 1.1});
    }
  }
}

function populateRoom(ctx: Ctx, room: Room, distance: Int32Array): void {
  const {rng, map} = ctx;
  const [cx, cy] = centerOf(room);
  if (room.kind === 'spawn' || distance[cy * MAP_SIZE + cx] < SAFE_SPAWN_STEPS) return;
  const area = room.w * room.h;
  let count = area >= 20 ? rng.int(2, 3) : area >= 12 ? rng.int(1, 2) : rng.int(0, 1);
  if (room.kind === 'treasure') count += 2;
  let mages = 0;
  for (let i = 0; i < count; i++) {
    const wantMage = mages < (room.kind === 'treasure' ? 2 : 1) && rng.chance(0.28);
    if (wantMage) mages++;
    const tx = rng.int(room.x, room.x + room.w - 1);
    const ty = rng.int(room.y, room.y + room.h - 1);
    map.enemies.push({
      kind: wantMage ? 'mage' : 'warrior',
      x: tileCenter(tx) + rng.range(-1, 1),
      z: tileCenter(ty) + rng.range(-1, 1),
      dormant: !wantMage && rng.chance(0.45),
    });
  }
}

function containerMix(ctx: Ctx, room: Room): ContainerType[] {
  const {rng} = ctx;
  if (room.kind === 'spawn') return ['crate'];
  if (room.kind === 'treasure') return ['gold_chest', 'chest', rng.pick(['trunk', 'weapon_rack'] as const)];
  const n = room.w * room.h >= 16 ? rng.int(1, 3) : rng.int(1, 2);
  const kinds: [ContainerType, number][] = [['barrel', 4], ['crate', 4], ['chest', 2], ['trunk', 2], ['weapon_rack', 1.2]];
  return Array.from({length: n}, () => rng.weighted(kinds));
}

export function generateMap(seed: number): GameMap {
  const rng = new Rng(seed);
  const rooms = placeRooms(rng);
  const tiles = new Uint8Array(MAP_SIZE * MAP_SIZE);
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(tiles, x, y);
  }
  for (const [a, b] of roomLinks(rooms, rng)) carveCorridor(tiles, rooms[a], rooms[b], rng);

  const map: GameMap = {w: MAP_SIZE, h: MAP_SIZE, tiles, rooms, spawn: {x: 0, z: 0}, extracts: [], containers: [], enemies: [], props: [], torches: [], raiderSpawns: [], colliders: []};

  // Spawn near a random corner, extractions far away and spread apart.
  const corner = rng.pick([[0, 0], [MAP_SIZE, 0], [0, MAP_SIZE], [MAP_SIZE, MAP_SIZE]] as const);
  const spawnRoom = [...rooms].sort((a, b) => {
    const [ax, ay] = centerOf(a);
    const [bx, by] = centerOf(b);
    return Math.hypot(ax - corner[0], ay - corner[1]) - Math.hypot(bx - corner[0], by - corner[1]);
  })[0];
  spawnRoom.kind = 'spawn';
  const [sx, sy] = centerOf(spawnRoom);
  map.spawn = {x: tileCenter(sx), z: tileCenter(sy)};
  const distance = tileDistances(map, sx, sy);
  const stepsTo = (r: Room): number => distance[centerOf(r)[1] * MAP_SIZE + centerOf(r)[0]];

  const candidates = rooms.filter(r => r.kind === 'normal' && stepsTo(r) > 0).sort((a, b) => stepsTo(b) - stepsTo(a));
  const extractRooms: Room[] = [];
  for (let i = 0; i < 3 && candidates.length; i++) {
    const pick = [...candidates].sort((a, b) => score(b) - score(a))[0];
    extractRooms.push(pick);
    candidates.splice(candidates.indexOf(pick), 1);
  }
  function score(r: Room): number {
    const [x, y] = centerOf(r);
    const spread = extractRooms.length
      ? Math.min(...extractRooms.map(e => Math.hypot(centerOf(e)[0] - x, centerOf(e)[1] - y)))
      : MAP_SIZE;
    return stepsTo(r) * 0.6 + spread * 1.4;
  }
  extractRooms.forEach((r, i) => {
    r.kind = 'extract';
    const [x, y] = centerOf(r);
    map.extracts.push({name: `${compassName(x, y)} ${EXTRACT_STYLES[i % EXTRACT_STYLES.length]}`, x: tileCenter(x), z: tileCenter(y)});
  });

  const treasure = rooms.filter(r => r.kind === 'normal' && r.w * r.h >= 12).sort((a, b) => stepsTo(b) - stepsTo(a))[0];
  if (treasure) treasure.kind = 'treasure';

  const ctx: Ctx = {rng, map, used: new Set()};
  for (const room of rooms) {
    // Reserve the extraction circle's center so nothing blocks it.
    if (room.kind === 'extract') ctx.used.add(centerOf(room)[1] * MAP_SIZE + centerOf(room)[0]);
    decorateRoom(ctx, room);
    for (const type of containerMix(ctx, room)) placeContainer(ctx, room, type);
    populateRoom(ctx, room, distance);
  }

  const far = rooms.filter(r => r.kind === 'normal' || r.kind === 'treasure').sort((a, b) => stepsTo(b) - stepsTo(a));
  map.raiderSpawns = far.slice(0, 3).map(r => ({x: tileCenter(centerOf(r)[0]), z: tileCenter(centerOf(r)[1])}));
  return map;
}
