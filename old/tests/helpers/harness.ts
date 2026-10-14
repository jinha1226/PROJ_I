import {vi} from 'vitest';
import {FIXED_DUNGEON} from '../../src/dungeon/generator';
import {Game} from '../../src/game/game';
import {ExpeditionSession} from '../../src/game/session';
import {memoryStore} from '../../src/persistence/store';
import {GuildState} from '../../src/state/guild';
import {Progression} from '../../src/state/progression';
import {FakeFactory, FakeFx, FakePresenter, FakeScene} from './fakes';

export function createHarness(store = memoryStore()) {
  const progression = new Progression(store);
  const guild = new GuildState(store);
  const factory = new FakeFactory();
  const fx = new FakeFx();
  const presenter = new FakePresenter();
  const scene = new FakeScene();
  const session = new ExpeditionSession(FIXED_DUNGEON);
  const game = new Game({dungeon: FIXED_DUNGEON, session, progression, guild, factory, fx, scene, presenter});
  return {store, progression, guild, factory, fx, presenter, scene, session, game};
}

export type Harness = ReturnType<typeof createHarness>;

/** Ticks the game at 20 Hz until `until` holds (or the budget runs out). Returns ticks used. */
export function runUntil(game: Game, until: () => boolean, maxTicks = 20000, dt = 0.05): number {
  let ticks = 0;
  while (!until() && ticks < maxTicks) {
    game.tick(dt);
    ticks++;
  }
  return ticks;
}

/** Fires the "move on after a fight" timer and lets the resulting async travel entry settle. */
export async function finishPause(): Promise<void> {
  await vi.advanceTimersByTimeAsync(3000);
}
