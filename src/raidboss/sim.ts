import {angleDiff, angleTo, dist, type Vec2} from '../core/math';
import {Rng} from '../core/rng';
import {updateBoss} from './bossAi';
import {updatePartyAi} from './partyAi';
import {updatePlayerUnit} from './playerUnit';
import type {Hazard, Order, RaidEvent, RaidInput, Role, Unit, UnitKind} from './types';

export const ARENA_RADIUS = 15;
const FRICTION = 10;
const TANK_THREAT = 3;
const HEAL_THREAT = 0.5;
const CRIT_CHANCE = 0.1;

interface Stats {
  hp: number;
  damage: number;
  reach: number;
  attackTime: number;
  speed: number;
  r: number;
}

export const STATS: Readonly<Record<UnitKind, Stats>> = {
  tank: {hp: 900, damage: 22, reach: 2.5, attackTime: 1.1, speed: 6, r: 0.6},
  melee: {hp: 600, damage: 34, reach: 2.4, attackTime: 0.8, speed: 6.5, r: 0.55},
  ranged: {hp: 520, damage: 28, reach: 11, attackTime: 1.0, speed: 6, r: 0.55},
  healer: {hp: 520, damage: 12, reach: 10, attackTime: 1.2, speed: 6, r: 0.55},
  boss: {hp: 16000, damage: 85, reach: 3.4, attackTime: 2.0, speed: 4.5, r: 1.4},
  add: {hp: 260, damage: 22, reach: 2.1, attackTime: 1.4, speed: 5, r: 0.55},
};

const NAMES: Readonly<Record<Role, string>> = {tank: '브란 (방어)', melee: '롤프 (근접)', ranged: '세라 (원거리)', healer: '이솔 (치유)'};

export interface BossRaidOptions {
  seed: number;
  /** Which role the human plays, or null for a fully AI party. */
  playerRole: Role | null;
  /** 0..1: how well companions read and react to mechanics. */
  aiSkill: number;
}

/**
 * A five-member party against one scripted boss in a round arena. Renderer-free:
 * the view and UI read units, hazards and events.
 */
export class BossRaid {
  readonly rng: Rng;
  readonly units: Unit[] = [];
  readonly hazards: Hazard[] = [];
  readonly boss: Unit;
  time = 0;
  ended: 'win' | 'wipe' | null = null;
  order: Order = 'none';
  /** Boss cast bar (null when not casting). */
  cast: {name: string; timer: number; total: number} | null = null;
  private events: RaidEvent[] = [];
  private nextId = 1;
  /** Per (hazard, unit): when that unit notices the hazard (aiSkill-driven reaction time). */
  readonly reactions = new Map<string, number>();

  constructor(readonly options: BossRaidOptions) {
    this.rng = new Rng(options.seed);
    const roles: Role[] = ['tank', 'melee', 'ranged', 'healer', options.playerRole === 'tank' || !options.playerRole ? 'melee' : options.playerRole];
    // Five members: the classic four roles plus a second copy of the player's role (melee for a tank player).
    roles.forEach((role, i) => {
      const a = (i / roles.length) * Math.PI - Math.PI;
      const u = this.addUnit(role, 'party', {x: Math.cos(a) * 6, z: 9 + Math.sin(a) * 2});
      u.name = i === 4 ? `${NAMES[role].split(' ')[0]}의 동료 (${role === 'melee' ? '근접' : role === 'ranged' ? '원거리' : role === 'healer' ? '치유' : '방어'})` : NAMES[role];
    });
    if (options.playerRole) {
      const mine = this.units.find(u => u.kind === options.playerRole)!;
      mine.controlled = true;
      mine.name = `나 (${mine.name.split('(')[1]}`;
    }
    this.boss = this.addUnit('boss', 'enemy', {x: 0, z: -4});
    this.boss.name = '해골 군주';
  }

  addUnit(kind: UnitKind, team: Unit['team'], at: Vec2): Unit {
    const s = STATS[kind];
    const unit: Unit = {
      id: this.nextId++,
      kind,
      team,
      name: kind,
      x: at.x,
      z: at.z,
      vx: 0,
      vz: 0,
      r: s.r,
      facing: team === 'party' ? Math.PI : 0,
      hp: s.hp,
      maxHp: s.hp,
      alive: true,
      speed: s.speed,
      damage: s.damage,
      reach: s.reach,
      attackTime: s.attackTime,
      attackTimer: this.rng.range(0, s.attackTime),
      busy: 0,
      iframes: 0,
      guard: 0,
      cooldowns: {},
      controlled: false,
      threat: new Map(),
      target: null,
      anim: 'idle',
      animSerial: 0,
      moving: false,
      meter: {damage: 0, healing: 0, taken: 0},
    };
    this.units.push(unit);
    return unit;
  }

  newId(): number {
    return this.nextId++;
  }

  emit(e: RaidEvent): void {
    this.events.push(e);
  }

  drainEvents(): RaidEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  get party(): Unit[] {
    return this.units.filter(u => u.team === 'party');
  }

  get enemies(): Unit[] {
    return this.units.filter(u => u.team === 'enemy' && u.alive);
  }

  unit(id: number | null): Unit | undefined {
    return id === null ? undefined : this.units.find(u => u.id === id);
  }

  setAnim(u: Unit, anim: Unit['anim']): void {
    u.anim = anim;
    u.animSerial++;
  }

  // ---------- combat ----------

  damage(source: Unit, target: Unit, base: number, kind: 'melee' | 'ranged' | 'magic' | 'boss'): void {
    if (!target.alive) return;
    if (target.iframes > 0) {
      this.emit({type: 'evade', unit: target.id});
      return;
    }
    const crit = source.team === 'party' && this.rng.chance(CRIT_CHANCE);
    const amount = Math.round(base * (crit ? 1.7 : 1) * this.rng.range(0.9, 1.1) * (target.guard > 0 ? 0.5 : 1));
    target.hp -= amount;
    source.meter.damage += amount;
    target.meter.taken += amount;
    if (source.team === 'party' && target.team === 'enemy') {
      const mult = source.kind === 'tank' ? TANK_THREAT : 1;
      target.threat.set(source.id, (target.threat.get(source.id) ?? 0) + amount * mult);
    }
    this.emit({type: 'hit', source: source.id, target: target.id, amount, crit, x: target.x, z: target.z, kind});
    if (target.hp <= 0) this.kill(target);
  }

  heal(source: Unit, target: Unit, amount: number): void {
    if (!target.alive) return;
    const healed = Math.min(amount, target.maxHp - target.hp);
    target.hp += healed;
    source.meter.healing += healed;
    for (const e of this.enemies) e.threat.set(source.id, (e.threat.get(source.id) ?? 0) + healed * HEAL_THREAT);
    this.emit({type: 'heal', source: source.id, target: target.id, amount: Math.round(healed), x: target.x, z: target.z});
  }

  private kill(u: Unit): void {
    u.hp = 0;
    u.alive = false;
    u.busy = 0;
    this.setAnim(u, 'dead');
    this.emit({type: 'death', unit: u.id});
    for (const e of this.units) e.threat.delete(u.id);
  }

  /** Enemies in an arc in front of `from` (melee swings). */
  inArc(from: Unit, facing: number, reach: number, arc: number, team: Unit['team']): Unit[] {
    return this.units.filter(u => u.alive && u.team === team && dist(u, from) <= reach + u.r && Math.abs(angleDiff(facing, angleTo(from, u))) <= arc / 2 + 0.2);
  }

  // ---------- hazards ----------

  addHazard(h: Omit<Hazard, 'id' | 'total'>): Hazard {
    const hazard: Hazard = {...h, id: this.newId(), total: h.timer};
    this.hazards.push(hazard);
    this.emit({type: 'hazard', hazard});
    return hazard;
  }

  /** Is this point inside the hazard's footprint (with a margin for body size)? */
  inHazard(h: Hazard, p: Vec2, margin = 0): boolean {
    const d = dist(h, p);
    if (d > h.radius + margin) return false;
    if (h.shape === 'circle') return true;
    return Math.abs(angleDiff(h.angle, angleTo(h, p))) <= h.halfArc;
  }

  private updateHazards(dt: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      const anchor = this.unit(h.follow);
      if (anchor?.alive) {
        h.x = anchor.x;
        h.z = anchor.z;
      }
      h.timer -= dt;
      if (h.timer > 0) continue;
      for (const u of this.party) {
        if (!u.alive || !this.inHazard(h, u, u.r * 0.6)) continue;
        // The marked player soaks less; everyone else near them takes the full blast.
        const amount = h.owner === u.id ? h.damage * 0.5 : h.damage;
        this.damage(this.boss, u, amount, 'boss');
      }
      this.emit({type: 'hazardEnd', id: h.id, x: h.x, z: h.z, shape: h.shape, radius: h.radius});
      this.hazards.splice(i, 1);
    }
  }

  // ---------- frame ----------

  update(dt: number, input: RaidInput | null): void {
    if (this.ended) return;
    this.time += dt;
    if (input?.order) {
      this.order = input.order === this.order ? 'none' : input.order;
      this.emit({type: 'order', order: this.order});
    }
    for (const u of this.units) {
      if (!u.alive) continue;
      u.moving = false;
      u.busy = Math.max(0, u.busy - dt);
      u.iframes = Math.max(0, u.iframes - dt);
      u.guard = Math.max(0, u.guard - dt);
      u.attackTimer -= dt;
      for (const k of Object.keys(u.cooldowns)) u.cooldowns[k] = Math.max(0, u.cooldowns[k] - dt);
    }
    for (const u of this.party) {
      if (!u.alive) continue;
      if (u.controlled && input) updatePlayerUnit(this, u, input, dt);
      else updatePartyAi(this, u, dt);
    }
    updateBoss(this, dt);
    this.updateHazards(dt);
    this.integrate(dt);
    for (const u of this.units) if (u.alive && u.anim === 'move' && !u.moving) this.setAnim(u, 'idle');
    this.checkEnd();
  }

  /** Moves a unit toward a point this frame (AI and player both use it). */
  walk(u: Unit, target: Vec2, dt: number, speedScale = 1): boolean {
    const d = dist(u, target);
    if (d < 0.15 || u.busy > 0) return d < 0.15;
    const step = Math.min(d, u.speed * speedScale * dt);
    u.x += ((target.x - u.x) / d) * step;
    u.z += ((target.z - u.z) / d) * step;
    u.facing = angleTo(u, target);
    u.moving = true;
    if (u.anim !== 'move') this.setAnim(u, 'move');
    return false;
  }

  private integrate(dt: number): void {
    const alive = this.units.filter(u => u.alive);
    const decay = Math.exp(-FRICTION * dt);
    for (const u of alive) {
      u.x += u.vx * dt;
      u.z += u.vz * dt;
      u.vx *= decay;
      u.vz *= decay;
    }
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const min = a.r + b.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        // The boss is immovable; small units yield to it.
        const wa = a.kind === 'boss' ? 0 : b.kind === 'boss' ? 1 : 0.5;
        const push = min - d;
        a.x -= (dx / d) * push * wa;
        a.z -= (dz / d) * push * wa;
        b.x += (dx / d) * push * (1 - wa);
        b.z += (dz / d) * push * (1 - wa);
      }
    }
    for (const u of alive) {
      const d = Math.hypot(u.x, u.z);
      const max = ARENA_RADIUS - u.r;
      if (d > max) {
        u.x *= max / d;
        u.z *= max / d;
      }
    }
  }

  private checkEnd(): void {
    if (!this.boss.alive) {
      this.ended = 'win';
      this.emit({type: 'end', win: true});
    } else if (this.party.every(u => !u.alive)) {
      this.ended = 'wipe';
      this.emit({type: 'end', win: false});
    }
  }
}
