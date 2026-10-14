import type {Actor} from '../types';

/** All actors currently alive in the scene, with room-aware queries. */
export class World {
  actors: Actor[] = [];

  add(actor: Actor): void {
    this.actors.push(actor);
  }

  heroes(): Actor[] {
    return this.actors.filter(a => a.team === 'hero');
  }

  livingHeroes(): Actor[] {
    return this.actors.filter(a => a.team === 'hero' && !a.dead);
  }

  enemiesOfRoom(room: number): Actor[] {
    return this.actors.filter(a => a.team === 'enemy' && a.dungeonRoom === room);
  }

  /** Removes matching actors and releases their scene objects. */
  removeWhere(predicate: (actor: Actor) => boolean): void {
    const kept: Actor[] = [];
    for (const actor of this.actors) {
      if (predicate(actor)) actor.view.dispose();
      else kept.push(actor);
    }
    this.actors = kept;
  }

  clear(): void {
    this.removeWhere(() => true);
  }
}
