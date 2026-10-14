import {describe, expect, it} from 'vitest';
import {Vector3} from 'three';
import {tileToWorld, worldToTile} from '../src/dungeon/coordinates';
import {nextExplorationRoute} from '../src/dungeon/explorationRoute';
import {chamberIndexAt, createKnownGrid, explorationPercent, revealAround} from '../src/dungeon/fog';
import {FIXED_DUNGEON, generateDungeon} from '../src/dungeon/generator';
import {Navigator} from '../src/dungeon/navigation';
import {simulatePathfinder} from '../src/dungeon/pathfinderSimulation';
import {routeBetween} from '../src/dungeon/pathfinding';
import {CARDINAL_DIRS, isOpen, tileKey} from '../src/dungeon/types';
import {dungeonFromRows, OPEN_3X3} from './helpers/dungeons';

describe('generateDungeon', () => {
  it('is deterministic for a given seed', () => {
    const a = generateDungeon(14729);
    const b = generateDungeon(14729);
    expect(a.grid).toEqual(b.grid);
    expect(a.chambers).toEqual(b.chambers);
  });

  it('produces different layouts for different seeds', () => {
    expect(generateDungeon(1).grid).not.toEqual(generateDungeon(2).grid);
  });

  it('connects every room center to the entrance', () => {
    const {centers, grid, width, height} = FIXED_DUNGEON;
    expect(FIXED_DUNGEON.chambers.length).toBeGreaterThan(1);
    expect(centers).toHaveLength(FIXED_DUNGEON.chambers.length);
    const seen = new Set<string>([tileKey(...centers[0])]);
    const queue = [centers[0]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of CARDINAL_DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || !grid[ny][nx] || seen.has(tileKey(nx, ny))) continue;
        seen.add(tileKey(nx, ny));
        queue.push([nx, ny]);
      }
    }
    for (const c of centers) expect(seen.has(tileKey(...c)), `unreachable room ${c}`).toBe(true);
  });

  it('counts open tiles and keeps a solid border', () => {
    const open = FIXED_DUNGEON.grid.flat().filter(Boolean).length;
    expect(FIXED_DUNGEON.openTileCount).toBe(open);
    expect(FIXED_DUNGEON.grid[0].every(v => v === 0)).toBe(true);
    expect(FIXED_DUNGEON.grid[FIXED_DUNGEON.height - 1].every(v => v === 0)).toBe(true);
  });
});

describe('coordinates', () => {
  it('round-trips tile and world positions for every room center', () => {
    for (const [x, y] of FIXED_DUNGEON.centers) {
      const world = tileToWorld(x, y, FIXED_DUNGEON);
      expect(worldToTile(world.x, world.z, FIXED_DUNGEON)).toEqual({x, y});
    }
  });
});

describe('fog of war', () => {
  const dungeon = FIXED_DUNGEON;

  it('reveals the whole chamber when standing in one', () => {
    const known = createKnownGrid(dungeon);
    const [cx, cy] = dungeon.centers[0];
    expect(revealAround(dungeon, known, {x: cx, y: cy})).toBe(true);
    const [rx, ry, w, h] = dungeon.chambers[0];
    for (let y = ry; y < ry + h; y++) for (let x = rx; x < rx + w; x++) expect(known[y][x]).toBe(true);
  });

  it('reveals only a radius-3 disc in corridors', () => {
    const rows = ['.'.repeat(11), '.'.repeat(11), '.'.repeat(11), '.'.repeat(11), '.'.repeat(11), '.'.repeat(11), '.'.repeat(11), '.'.repeat(11), '.'.repeat(11)];
    const open = dungeonFromRows(rows);
    const known = createKnownGrid(open);
    revealAround(open, known, {x: 5, y: 4});
    expect(known[4][8]).toBe(true);
    expect(known[4][9]).toBe(false);
    expect(known[7][5]).toBe(true);
    expect(known[7][7]).toBe(false);
  });

  it('reports false when nothing new is revealed', () => {
    const open = dungeonFromRows(OPEN_3X3);
    const known = createKnownGrid(open);
    revealAround(open, known, {x: 1, y: 1});
    expect(revealAround(open, known, {x: 1, y: 1})).toBe(false);
    expect(explorationPercent(open, known)).toBe(100);
  });

  it('finds the chamber index containing a tile', () => {
    const [rx, ry] = dungeon.chambers[2];
    expect(chamberIndexAt(dungeon, rx, ry)).toBe(2);
    expect(chamberIndexAt(dungeon, 0, 0)).toBe(-1);
  });
});

describe('routeBetween', () => {
  it('respects walls and reports unreachable goals as an empty route', () => {
    const grid = [[1, 1, 0], [0, 1, 0], [1, 1, 1]];
    expect(routeBetween(grid, [2, 2], [0, 0])).toEqual([[1, 2], [1, 1], [1, 0], [0, 0]]);
    expect(routeBetween(grid, [0, 0], [2, 0])).toEqual([]);
  });

  it('returns an empty route when already at the goal or on rock', () => {
    const grid = [[1, 0], [1, 1]];
    expect(routeBetween(grid, [0, 0], [0, 0])).toEqual([]);
    expect(routeBetween(grid, [1, 0], [0, 0])).toEqual([]);
  });
});

describe('nextExplorationRoute', () => {
  it('leads away from the entrance once the surroundings are known', () => {
    const dungeon = FIXED_DUNGEON;
    const known = createKnownGrid(dungeon);
    const [x, y] = dungeon.centers[0];
    revealAround(dungeon, known, {x, y});
    const path = nextExplorationRoute({dungeon, known, from: {x, y}, visits: new Map(), pathfinderSkill: false});
    expect(path.length).toBeGreaterThan(0);
    expect(path.every(([px, py]) => isOpen(dungeon, px, py))).toBe(true);
    const [lastX, lastY] = path[path.length - 1];
    expect(known[lastY][lastX]).toBe(false);
  });

  it('returns no route when everything is explored', () => {
    const dungeon = dungeonFromRows(OPEN_3X3);
    const known = createKnownGrid(dungeon);
    revealAround(dungeon, known, {x: 1, y: 1});
    expect(nextExplorationRoute({dungeon, known, from: {x: 1, y: 1}, visits: new Map(), pathfinderSkill: false})).toEqual([]);
  });

  it('with the skill, prefers a frontier that is not heavily revisited', () => {
    const dungeon = dungeonFromRows(['.....', '.....', '.....']);
    const known = createKnownGrid(dungeon);
    known[1][2] = true;
    const visits = new Map([[tileKey(1, 1), 20]]);
    const plain = nextExplorationRoute({dungeon, known, from: {x: 2, y: 1}, visits, pathfinderSkill: false});
    const guided = nextExplorationRoute({dungeon, known, from: {x: 2, y: 1}, visits, pathfinderSkill: true});
    expect(plain.length).toBeGreaterThan(0);
    expect(guided.length).toBeGreaterThan(0);
    expect(tileKey(...guided[guided.length - 1])).not.toBe(tileKey(1, 1));
  });
});

describe('simulatePathfinder', () => {
  it('fully explores a small connected dungeon with or without the skill', () => {
    const dungeon = dungeonFromRows(OPEN_3X3, [[0, 0, 3, 3]]);
    for (const skill of [false, true]) {
      const run = simulatePathfinder(skill, dungeon);
      expect(run.coverage).toBe(100);
      expect(run.complete).toBe(true);
    }
  });

  it('records when coverage milestones were reached', () => {
    const run = simulatePathfinder(false, dungeonFromRows(['.........', '.........', '.........'], [], [[0, 1]]));
    expect(run.thresholds[100]).not.toBeNull();
    expect(run.thresholds[50]!).toBeLessThanOrEqual(run.thresholds[100]!);
  });

  it('explores the real dungeon completely, deterministically', () => {
    const a = simulatePathfinder(true, FIXED_DUNGEON);
    const b = simulatePathfinder(true, FIXED_DUNGEON);
    expect(a.complete).toBe(true);
    expect(a.distance).toBe(b.distance);
  });
});

describe('Navigator', () => {
  const dungeon = dungeonFromRows(['#####', '#...#', '#.#.#', '#...#', '#####'], [], [[1, 1]]);
  const nav = new Navigator(dungeon);
  const at = (x: number, y: number): Vector3 => tileToWorld(x, y, dungeon);

  it('treats rock and out-of-map positions as blocked', () => {
    expect(nav.blocked(at(1, 1).x, at(1, 1).z)).toBe(false);
    expect(nav.blocked(at(0, 0).x, at(0, 0).z)).toBe(true);
    expect(nav.blocked(9999, 9999)).toBe(true);
  });

  it('refuses lines through walls but allows open ones', () => {
    expect(nav.lineClear(at(1, 1), at(3, 1))).toBe(true);
    expect(nav.lineClear(at(1, 2), at(3, 2))).toBe(false);
  });

  it('finds the way around a pillar with a tile-based length', () => {
    const path = nav.findPath(at(1, 2), at(3, 2));
    expect(path).not.toBeNull();
    expect(path!.points).toHaveLength(4);
    expect(path!.length).toBeCloseTo(4 * 1.6);
  });

  it('pathCosts agrees with findPath for every reachable target', () => {
    const costs = nav.pathCosts(at(1, 1));
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const direct = nav.findPath(at(1, 1), at(x, y));
        expect(costs(at(x, y))).toBe(direct ? direct.length : null);
      }
    }
  });

  it('pathCosts agrees with findPath on the real dungeon from several rooms', () => {
    const real = new Navigator(FIXED_DUNGEON);
    for (const [sx, sy] of FIXED_DUNGEON.centers.slice(0, 4)) {
      const from = tileToWorld(sx, sy, FIXED_DUNGEON);
      const costs = real.pathCosts(from);
      for (const [tx, ty] of FIXED_DUNGEON.centers) {
        const to = tileToWorld(tx, ty, FIXED_DUNGEON).add(new Vector3(0.3, 0, -0.2));
        expect(costs(to)).toBe(real.findPath(from, to)?.length ?? null);
      }
      expect(costs(tileToWorld(0, 0, FIXED_DUNGEON))).toBeNull();
    }
  });

  it('pathCosts from outside the map reaches only its own tile', () => {
    const costs = nav.pathCosts(new Vector3(-100, 0, -100));
    expect(costs(new Vector3(-100, 0, -100))).toBe(0);
    expect(costs(at(1, 1))).toBeNull();
  });

  it('returns an empty path at the destination and null when unreachable', () => {
    expect(nav.findPath(at(1, 1), at(1, 1))).toEqual({points: [], length: 0});
    expect(nav.findPath(at(1, 1), at(2, 2))).toBeNull();
  });
});
