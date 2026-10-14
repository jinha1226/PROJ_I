import {Vector3} from 'three';
import {ARRIVAL_DISTANCE, ENCOUNTER_TRIGGER_DISTANCE, TRAVEL_MOVE_SPEED} from '../config';
import {formationOffset} from '../data/heroes';
import {tileToWorld} from '../dungeon/coordinates';
import {chamberIndexAt} from '../dungeon/fog';
import type {Navigator} from '../dungeon/navigation';
import type {World} from '../state/world';
import type {ExpeditionSession} from './session';

const ARRIVED_DISTANCE = 0.035;
const RETURN_HOME_RADIUS = 3;

export type TravelEvent =
  | {kind: 'walking'}
  | {kind: 'refresh'}
  | {kind: 'encounter'; room: number}
  | {kind: 'return'; message: string; success: boolean};

/** Moves the party along the auto-explore route and spots rooms worth fighting in. */
export class TravelSystem {
  constructor(
    private readonly world: World,
    private readonly nav: Navigator,
    private readonly session: ExpeditionSession,
  ) {}

  worldPoint(x: number, y: number): Vector3 {
    return tileToWorld(x, y, this.session.dungeon);
  }

  /** Slides each hero toward its formation slot behind the lead. */
  moveParty(dt: number): void {
    const target = this.session.travelTarget ?? this.worldPoint(this.session.explorer.x, this.session.explorer.y);
    this.world.livingHeroes().forEach((hero, index) => {
      const [ox, oz] = formationOffset(index);
      const preferred = target.clone().add(new Vector3(ox, 0, oz));
      const goal = index === 0 || this.nav.blocked(preferred.x, preferred.z) || !this.nav.lineClear(target, preferred) ? target : preferred;
      const delta = goal.clone().sub(hero.pos);
      const distance = delta.length();

      if (distance > ARRIVED_DISTANCE) {
        const step = dt ? Math.min(distance, dt * TRAVEL_MOVE_SPEED) : distance;
        const direction = delta.normalize();
        const next = hero.pos.clone().addScaledVector(direction, step);
        if (!this.nav.blocked(next.x, next.z) && this.nav.lineClear(hero.pos, next)) {
          hero.pos.copy(next);
          hero.view.place(hero.pos);
          hero.view.setFacing(Math.atan2(direction.x, direction.z));
          hero.view.play('walk');
        } else hero.view.play('idle');
      } else hero.view.play('idle');
    });
  }

  /** One travel tick. `dt` is already scaled by game speed. */
  step(dt: number): TravelEvent {
    const {session} = this;
    const heroes = this.world.livingHeroes();

    if (session.retreating && session.atEntrance()) {
      const [cx, cy] = session.dungeon.centers[0];
      const home = this.worldPoint(cx, cy);
      if (heroes.every(h => h.pos.distanceTo(home) < RETURN_HOME_RADIUS)) return {kind: 'return', message: '원정대 귀환', success: true};
    }

    const lead = heroes[0];
    if (!lead) return {kind: 'return', message: '원정대 전멸', success: false};
    session.travelTarget ??= this.worldPoint(session.explorer.x, session.explorer.y);
    this.moveParty(dt);
    if (lead.pos.distanceTo(session.travelTarget) > ARRIVAL_DISTANCE) return {kind: 'walking'};

    const room = chamberIndexAt(session.dungeon, session.explorer.x, session.explorer.y);
    if (session.retreating && room !== session.retreatEscapeRoom) session.retreatEscapeRoom = -1;
    if (room >= 0 && (!session.visitedRooms.has(room) || session.retreating) && !(session.retreating && room === session.retreatEscapeRoom)) {
      const foes = session.roomMonsters.get(room) ?? [];
      const nearest = foes.filter(f => !f.dead).reduce((d, f) => Math.min(d, lead.pos.distanceTo(f.pos)), Infinity);
      if (nearest <= ENCOUNTER_TRIGGER_DISTANCE) return {kind: 'encounter', room};
    }

    session.reveal();
    if (!session.route.length) session.route = session.retreating ? session.planRetreat() : session.planExploration();
    const next = session.route.shift();
    if (next) {
      session.advance({x: next[0], y: next[1]});
      session.travelTarget = this.worldPoint(next[0], next[1]);
    } else if (session.retreating) {
      return {kind: 'return', message: '퇴각 경로 없음', success: false};
    } else {
      session.autoExploring = false;
    }
    return {kind: 'refresh'};
  }
}
