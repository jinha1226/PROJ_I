import {Vector3} from 'three';
import type {CombatFx} from '../../src/combat/ports';
import type {Dungeon} from '../../src/dungeon/types';
import type {DungeonScene, Presenter} from '../../src/game/ports';
import type {ActorFactory, SpawnOptions} from '../../src/render/actorFactory';
import type {Actor, ActorView, AnimationType} from '../../src/types';

/** ActorView with no scene graph; records what the simulation asked of it. */
export class NullView implements ActorView {
  played: AnimationType[] = [];
  visible = true;
  ringVisible = true;
  disposed = false;
  scale = 1;
  facing = 0;
  clip = 0.7;
  walking = false;

  play(type: AnimationType): void {
    this.played.push(type);
    this.walking = type === 'walk';
  }
  idleIfWalking(): void {
    if (this.walking) this.play('idle');
  }
  clipDuration = (): number => this.clip;
  ticked = 0;
  tick(dt: number): void {
    this.ticked += dt;
  }
  place(): void {}
  faceTowards(): void {}
  setFacing(angle: number): void {
    this.facing = angle;
  }
  settle(): void {}
  bump(): void {}
  fadeOut(): void {}
  setVisible(visible: boolean): void {
    this.visible = visible;
  }
  setRingVisible(visible: boolean): void {
    this.ringVisible = visible;
  }
  scaleBy(factor: number): void {
    this.scale *= factor;
  }
  dispose(): void {
    this.disposed = true;
  }
}

export function makeActor(overrides: Partial<Actor> & {name?: Actor['name']; team?: Actor['team']} = {}): Actor {
  const team = overrides.team ?? 'hero';
  return {
    name: team === 'hero' ? 'Knight' : 'Skeleton_Warrior',
    team,
    view: new NullView(),
    pos: new Vector3(),
    hp: 100,
    max: 100,
    damage: 10,
    range: 1.5,
    cooldown: 1,
    timer: 0,
    dead: false,
    variant: null,
    behavior: team === 'enemy' ? 'charge' : null,
    ...overrides,
  };
}

export const viewOf = (actor: Actor): NullView => actor.view as NullView;

export class FakeFx implements CombatFx {
  texts: string[] = [];
  impacts = 0;
  pulses = 0;
  projectiles: {kind: string; disposed: boolean; progress: number}[] = [];
  warnings: {opacity: number; disposed: boolean}[] = [];
  updates = 0;

  floatText(_at: Vector3, text: string): void {
    this.texts.push(text);
  }
  impact(): void {
    this.impacts++;
  }
  spawnProjectile(_from: Vector3, _to: Vector3, kind: string) {
    const record = {kind, disposed: false, progress: 0};
    this.projectiles.push(record);
    return {
      advance: (t: number) => {
        record.progress = t;
      },
      dispose: () => {
        record.disposed = true;
      },
    };
  }
  spawnBossWarning() {
    const record = {opacity: 0, disposed: false};
    this.warnings.push(record);
    return {
      setOpacity: (value: number) => {
        record.opacity = value;
      },
      dispose: () => {
        record.disposed = true;
      },
    };
  }
  bossPulse(): void {
    this.pulses++;
  }
  update(): void {
    this.updates++;
  }
}

/** Spawns NullView actors; optionally fails for chosen names to exercise error paths. */
export class FakeFactory implements ActorFactory {
  spawned: Actor[] = [];
  failFor = new Set<string>();

  async spawn(options: SpawnOptions): Promise<Actor> {
    if (this.failFor.has(options.name)) throw new Error('asset missing: ' + options.name);
    const actor = makeActor({
      name: options.name,
      team: options.team,
      pos: new Vector3(options.x, 0, options.z),
      hp: options.hp,
      max: options.hp,
      damage: options.damage,
      range: options.range,
      cooldown: options.cooldown,
      variant: options.variant ?? null,
      behavior: options.variant?.behavior ?? (options.team === 'enemy' ? (options.name === 'Skeleton_Mage' ? 'backline' : 'charge') : null),
    });
    this.spawned.push(actor);
    return actor;
  }
}

export class FakePresenter implements Presenter {
  statusText = '';
  battleInfoText = '';
  noticeText = '';
  restartEnabled = false;
  paused = false;
  speed = 1;
  party: readonly Actor[] = [];
  hubMessages: string[] = [];
  mapDraws = 0;
  explorePanelCloses = 0;

  status(text: string): void {
    this.statusText = text;
  }
  battleInfo(text: string): void {
    this.battleInfoText = text;
  }
  notice(text: string): void {
    this.noticeText = text;
  }
  setRestartEnabled(enabled: boolean): void {
    this.restartEnabled = enabled;
  }
  setPaused(paused: boolean): void {
    this.paused = paused;
  }
  setSpeed(speed: number): void {
    this.speed = speed;
  }
  renderParty(heroes: readonly Actor[]): void {
    this.party = heroes;
  }
  updateParty(): void {}
  showHub(message: string): void {
    this.hubMessages.push(message);
  }
  closeExplorePanel(): void {
    this.explorePanelCloses++;
  }
  redrawMap(): void {
    this.mapDraws++;
  }
}

export class FakeScene implements DungeonScene {
  themeName = '테스트 유적';
  builds = 0;
  prepareDungeon(_dungeon: Dungeon): void {
    this.builds++;
  }
}
