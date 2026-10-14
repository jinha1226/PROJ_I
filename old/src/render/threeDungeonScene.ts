import type {Scene, Vector3} from 'three';
import type {DungeonScene} from '../game/ports';
import type {Dungeon} from '../dungeon/types';
import {DungeonView} from './dungeonView';
import {HubBackdrop} from './hubBackdrop';

/** Shows the themed hub chamber until the first expedition replaces it with the dungeon. */
export class ThreeDungeonScene implements DungeonScene {
  private readonly backdrop: HubBackdrop;
  private readonly view: DungeonView;

  constructor(scene: Scene) {
    this.backdrop = new HubBackdrop(scene);
    this.view = new DungeonView(scene);
    this.backdrop.build();
  }

  get themeName(): string {
    return this.backdrop.theme;
  }

  /** Call every frame so torch light follows the party. */
  updateLighting(focus: Vector3): void {
    this.view.updateLighting(focus);
  }

  prepareDungeon(dungeon: Dungeon): void {
    if (this.view.built) return;
    this.backdrop.dispose();
    this.view.build(dungeon);
  }
}
