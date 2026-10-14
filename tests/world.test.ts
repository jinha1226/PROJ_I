import {describe, expect, it} from 'vitest';
import {TILE, WALL_INSET} from '../src/config';
import {generateMap, isFloor, tileDistances, toTile, type GameMap} from '../src/world/mapgen';
import {FlowField, isWalkable, lineOfSight, resolveCollisions} from '../src/world/physics';

/** Builds a tiny map from rows of '#' (rock) and '.' (floor). */
function mapFromRows(rows: string[]): Pick<GameMap, 'w' | 'h' | 'tiles'> {
  const h = rows.length;
  const w = rows[0].length;
  const tiles = new Uint8Array(w * h);
  rows.forEach((row, y) => [...row].forEach((c, x) => (tiles[y * w + x] = c === '.' ? 1 : 0)));
  return {w, h, tiles};
}

describe('generateMap', () => {
  const seeds = [1, 2, 3, 42, 1337, 9001];

  it('is deterministic per seed', () => {
    const a = generateMap(7);
    const b = generateMap(7);
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
    expect(a.extracts).toEqual(b.extracts);
  });

  it.each(seeds)('seed %i: spawn, extracts, containers and enemies are all reachable floor', seed => {
    const map = generateMap(seed);
    const dist = tileDistances(map, toTile(map.spawn.x), toTile(map.spawn.z));
    const reachable = (p: {x: number; z: number}): boolean => dist[toTile(p.z) * map.w + toTile(p.x)] >= 0;
    expect(map.rooms.length).toBeGreaterThanOrEqual(8);
    expect(map.extracts).toHaveLength(3);
    for (const e of map.extracts) expect(reachable(e)).toBe(true);
    for (const c of map.containers) expect(reachable(c)).toBe(true);
    for (const e of map.enemies) expect(reachable(e)).toBe(true);
    expect(map.containers.length).toBeGreaterThan(10);
    expect(map.containers.some(c => c.type === 'gold_chest')).toBe(true);
  });

  it.each(seeds)('seed %i: no enemies spawn right next to the player', seed => {
    const map = generateMap(seed);
    for (const e of map.enemies) expect(Math.hypot(e.x - map.spawn.x, e.z - map.spawn.z)).toBeGreaterThan(TILE * 3);
  });
});

describe('physics', () => {
  const map = mapFromRows(['#####', '#...#', '#.#.#', '#...#', '#####']);

  it('pushes a body out of walls, honoring the wall inset', () => {
    const pos = {x: TILE + 0.2, z: TILE * 1.5};
    expect(resolveCollisions(map, [], pos, 0.5)).toBe(true);
    expect(pos.x).toBeCloseTo(TILE + WALL_INSET + 0.5);
  });

  it('pushes a body out of circular colliders', () => {
    const pos = {x: TILE * 1.5 + 0.1, z: TILE * 1.5};
    resolveCollisions(map, [{x: TILE * 1.5, z: TILE * 1.5, r: 1}], pos, 0.5);
    expect(Math.hypot(pos.x - TILE * 1.5, pos.z - TILE * 1.5)).toBeCloseTo(1.5);
  });

  it('line of sight is blocked by rock', () => {
    expect(lineOfSight(map, {x: TILE * 1.5, z: TILE * 1.5}, {x: TILE * 3.5, z: TILE * 1.5})).toBe(true);
    expect(lineOfSight(map, {x: TILE * 1.5, z: TILE * 2.5}, {x: TILE * 3.5, z: TILE * 2.5})).toBe(false);
    expect(isWalkable(map, {x: TILE * 1.5, z: TILE * 1.5})).toBe(true);
    expect(isFloor(map, 2, 2)).toBe(false);
  });

  it('flow field leads around the pillar toward the target', () => {
    const field = new FlowField(map);
    field.update({x: TILE * 3.5, z: TILE * 3.5});
    let pos = {x: TILE * 1.5, z: TILE * 1.5};
    for (let i = 0; i < 6 && field.stepsFrom(pos) > 0; i++) pos = field.nextStep(pos)!;
    expect(field.stepsFrom(pos)).toBe(0);
  });
});
