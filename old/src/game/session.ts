import type {Vector3} from 'three';
import {nextExplorationRoute} from '../dungeon/explorationRoute';
import {createKnownGrid, explorationPercent, resetKnownGrid, revealAround} from '../dungeon/fog';
import {routeBetween} from '../dungeon/pathfinding';
import {tileKey, type Dungeon, type KnownGrid} from '../dungeon/types';
import type {Actor, Point, Tile} from '../types';

/** Everything that belongs to one run into the dungeon and is discarded when it ends. */
export class ExpeditionSession {
  readonly known: KnownGrid;
  explorer: Tile;
  /** Remaining tiles of the current auto-explore leg. */
  route: Point[] = [];
  routeHistory: Point[] = [];
  readonly visits = new Map<string, number>();
  readonly visitedRooms = new Set<number>();
  readonly discoveries = new Set<string>();
  readonly roomMonsters = new Map<number, Actor[]>();
  monstersReady = false;
  travelTarget: Vector3 | null = null;

  steps = 0;
  kills = 0;
  loot = 0;
  retreating = false;
  /** Room the party is fleeing from; it will not trigger another fight until left. */
  retreatEscapeRoom = -1;
  settled = true;
  /** Shown on the map; KNOWN-BUG(legacy): toggling it never actually pauses exploration. */
  autoExploring = true;
  pathfinderSkill = false;

  constructor(readonly dungeon: Dungeon) {
    this.known = createKnownGrid(dungeon);
    this.explorer = this.entranceTile();
  }

  get percentExplored(): number {
    return explorationPercent(this.dungeon, this.known);
  }

  private entranceTile(): Tile {
    const [x, y] = this.dungeon.centers[0];
    return {x, y};
  }

  /** Resets to a fresh run standing at the entrance. */
  begin(): void {
    this.settled = false;
    this.retreating = false;
    this.steps = 0;
    this.kills = 0;
    this.loot = 0;
    this.discoveries.clear();
    this.retreatEscapeRoom = -1;
    resetKnownGrid(this.known);
    this.visitedRooms.clear();
    this.visitedRooms.add(0);
    this.roomMonsters.clear();
    this.monstersReady = false;
    this.route = [];
    this.routeHistory = [];
    this.visits.clear();
    this.explorer = this.entranceTile();
    this.recordVisit(this.explorer);
    this.travelTarget = null;
  }

  reveal(): boolean {
    return revealAround(this.dungeon, this.known, this.explorer);
  }

  recordVisit({x, y}: Tile): void {
    const key = tileKey(x, y);
    this.visits.set(key, (this.visits.get(key) ?? 0) + 1);
    this.routeHistory.push([x, y]);
  }

  /** Steps the explorer onto the next tile of the current route. */
  advance(tile: Tile): void {
    this.explorer = tile;
    this.steps++;
    if (!this.retreating) this.discoveries.add(tileKey(tile.x, tile.y));
    this.recordVisit(tile);
  }

  planExploration(): Point[] {
    return nextExplorationRoute({
      dungeon: this.dungeon,
      known: this.known,
      from: this.explorer,
      visits: this.visits,
      pathfinderSkill: this.pathfinderSkill,
    });
  }

  planRetreat(): Point[] {
    return routeBetween(this.dungeon.grid, [this.explorer.x, this.explorer.y], this.dungeon.centers[0]);
  }

  atEntrance(): boolean {
    const [x, y] = this.dungeon.centers[0];
    return this.explorer.x === x && this.explorer.y === y;
  }
}
