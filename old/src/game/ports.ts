import type {Dungeon} from '../dungeon/types';
import type {Actor} from '../types';

/** What the game needs from the DOM layer. Implemented by the UI and faked in tests. */
export interface Presenter {
  status(text: string): void;
  battleInfo(text: string): void;
  notice(text: string): void;
  setRestartEnabled(enabled: boolean): void;
  setPaused(paused: boolean): void;
  setSpeed(speed: number): void;
  renderParty(heroes: readonly Actor[]): void;
  updateParty(actors: readonly Actor[]): void;
  showHub(message: string): void;
  closeExplorePanel(): void;
  redrawMap(): void;
}

/** What the game needs from the 3D scene beyond actors and effects. */
export interface DungeonScene {
  /** Builds the dungeon geometry on first use; later calls are no-ops. */
  prepareDungeon(dungeon: Dungeon): void;
  /** Flavor name of the hub backdrop, shown in the status line. */
  readonly themeName: string;
}
