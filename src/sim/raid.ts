import {CONTAINER_CLOSE_RANGE, ENEMY, EXTRACT_RADIUS, EXTRACT_SECONDS, HITSTOP, INTERACT_RANGE, OIL, PLAYER, SECOND_RAIDER_AT} from '../config';
import {angleDiff, dist, type Vec2} from '../core/math';
import {Rng} from '../core/rng';
import {itemDef, REVEAL_SECONDS, type ArmorStats, type WeaponStats} from '../items/catalog';
import {addAuto, emptyGrid, gridValue, stackValue, type Grid} from '../items/inventory';
import {LOOT_TABLES, rollContainer, type ContainerType} from '../items/loot';
import {removeFrom, type Source, type Stores} from '../items/stores';
import {isFloor, toTile, type EnemyKind, type GameMap} from '../world/mapgen';
import {FlowField, resolveCollisions} from '../world/physics';
import {updateEnemy} from './enemyAi';
import {BASE_MODIFIERS, type RaidModifiers} from './modifiers';
import {updatePlayer} from './player';
import type {Container, Enemy, ExtractZone, Outcome, Player, Projectile, SimEvent, SimInput} from './types';

const FRICTION = 14;
const DEATH_DELAY = 2.4;
const EXPLORE_RADIUS = 3;
const WAKE_ACTIVE_RANGE = 42;
const ALERT_SHARE_RANGE = 9;
const PLAYER_ID = 0;

export interface RaidOptions {
  seed: number;
  stores: Stores;
  modifiers?: RaidModifiers;
}

export class Raid {
  readonly rng: Rng;
  readonly player: Player;
  readonly enemies: Enemy[] = [];
  readonly projectiles: Projectile[] = [];
  readonly containers: Container[] = [];
  readonly zones: ExtractZone[];
  readonly flow: FlowField;
  /** Tiles the player has seen, for the map overlay. */
  readonly explored: Uint8Array;
  readonly mods: RaidModifiers;
  stores: Stores;
  time = 0;
  oil: number;
  readonly oilMax: number;
  outcome: Outcome | null = null;
  openContainer: number | null = null;
  extractZone: number | null = null;
  extractProgress = 0;
  kills = 0;
  /** Seconds of freeze-frame left; the loop also pauses animation while > 0. */
  hitstop = 0;
  private events: SimEvent[] = [];
  private nextId = 1;
  private deathTimer = 0;
  private exploreTimer = 0;
  private secondRaiderSpawned = false;

  constructor(
    readonly map: GameMap,
    options: RaidOptions,
  ) {
    this.rng = new Rng(options.seed ^ 0x9e3779b9);
    this.stores = options.stores;
    this.mods = options.modifiers ?? BASE_MODIFIERS;
    this.oilMax = OIL.capacity * this.mods.oilCapacity;
    this.oil = this.oilMax;
    this.flow = new FlowField(map);
    this.explored = new Uint8Array(map.w * map.h);
    this.zones = map.extracts.map(e => ({...e}));
    this.player = this.createPlayer(map.spawn);
    for (const spawn of map.containers) this.addContainer(spawn.type, spawn, spawn.rot, rollContainer(spawn.type, this.rng, this.mods));
    for (const spawn of map.enemies) this.spawnEnemy(spawn.kind, spawn, spawn.dormant);
    if (map.raiderSpawns.length) this.spawnEnemy('raider', map.raiderSpawns[0], false);
  }

  // ---------- derived player stats ----------

  get weapon(): WeaponStats | undefined {
    const item = this.stores.slots.weapon;
    return item ? itemDef(item.defId).weapon : undefined;
  }

  get armor(): ArmorStats | undefined {
    const item = this.stores.slots.armor;
    return item ? itemDef(item.defId).armor : undefined;
  }

  get maxStamina(): number {
    return PLAYER.maxStamina + this.mods.staminaBonus;
  }

  get oilRatio(): number {
    return Math.max(0, this.oil / this.oilMax);
  }

  get oilDrainRate(): number {
    return OIL.drainPerSecond * this.mods.oilDrain;
  }

  /** Seconds of light left at the current burn rate. */
  get oilSeconds(): number {
    return this.oil / this.oilDrainRate;
  }

  addOil(amount: number): number {
    const added = Math.min(amount, this.oilMax - this.oil);
    this.oil += added;
    return added;
  }

  /** Total sell value of everything the player would keep on extraction. */
  carriedValue(): number {
    const slots = Object.values(this.stores.slots).reduce((sum, item) => sum + (item ? stackValue(item) : 0), 0);
    return gridValue(this.stores.grids.backpack) + slots;
  }

  // ---------- frame update ----------

  update(dt: number, input: SimInput): void {
    if (this.outcome) return;
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }
    this.time += dt;
    this.syncMaxHp();
    updatePlayer(this, dt, input);
    this.flow.update(this.player);
    for (const enemy of this.enemies) {
      // Raiders stand in for other players: they roam and loot even far away.
      enemy.sleeping = enemy.kind !== 'raider' && !enemy.alerted && dist(enemy, this.player) > WAKE_ACTIVE_RANGE;
      if (!enemy.sleeping) updateEnemy(this, enemy, dt);
    }
    this.integrateBodies(dt);
    this.updateProjectiles(dt);
    this.updateContainerSearch(dt, input);
    this.updateExtraction(dt);
    this.updateExploration(dt);
    this.updateTimers(dt);
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  emit(event: SimEvent): void {
    this.events.push(event);
  }

  newId(): number {
    return this.nextId++;
  }

  // ---------- combat resolution ----------

  /** Damages an enemy from the player's swing; returns true when it landed. */
  damageEnemy(enemy: Enemy, amount: number, from: Vec2, heavy: boolean, crit: boolean): void {
    if (!enemy.alive) return;
    const d = Math.max(0.001, dist(enemy, from));
    const dirX = (enemy.x - from.x) / d;
    const dirZ = (enemy.z - from.z) / d;
    enemy.hp -= amount;
    const killed = enemy.hp <= 0;
    const push = killed ? 11 : heavy ? 9 : 5;
    enemy.vx += dirX * push;
    enemy.vz += dirZ * push;
    this.alert(enemy);
    this.emit({type: 'hit', target: enemy.id, source: PLAYER_ID, x: enemy.x, z: enemy.z, damage: Math.round(amount), crit, killed, heavy, dirX, dirZ});
    this.hitstop = Math.max(this.hitstop, killed ? HITSTOP.kill : heavy || crit ? HITSTOP.heavy : HITSTOP.light);
    if (killed) {
      this.killEnemy(enemy);
      return;
    }
    if (enemy.poiseTimer > 0 || enemy.state === 'strike' || enemy.state === 'dodge') return;
    enemy.poiseHits++;
    if (enemy.poiseHits >= 3) {
      // Repeated staggers grant brief super-armor so enemies cannot be stun-locked forever.
      enemy.poiseHits = 0;
      enemy.poiseTimer = 1.6;
    }
    enemy.state = 'hurt';
    enemy.stateTime = 0;
    enemy.stateDuration = heavy ? 0.5 : 0.32;
  }

  /** Damages the player; i-frames turn it into an evade instead. */
  damagePlayer(amount: number, from: Vec2, heavy = false): boolean {
    const p = this.player;
    if (!p.alive) return false;
    if (p.iframes > 0) {
      this.emit({type: 'evade', x: p.x, z: p.z});
      return false;
    }
    const reduced = amount * (1 - (this.armor?.reduction ?? 0));
    p.hp -= reduced;
    p.sinceHurt = 0;
    const d = Math.max(0.001, dist(p, from));
    const dirX = (p.x - from.x) / d;
    const dirZ = (p.z - from.z) / d;
    p.vx += dirX * (heavy ? 8 : 5);
    p.vz += dirZ * (heavy ? 8 : 5);
    this.emit({type: 'playerHurt', damage: Math.round(reduced), x: p.x, z: p.z, dirX, dirZ, heavy});
    this.hitstop = Math.max(this.hitstop, HITSTOP.playerHurt);
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      p.state = 'dead';
      p.stateTime = 0;
      this.openContainer = null;
      this.emit({type: 'death', actor: PLAYER_ID});
      return true;
    }
    const interruptible = p.state !== 'dodge' && p.state !== 'attack';
    if (reduced >= PLAYER.hurtStunThreshold && (interruptible || heavy)) {
      p.state = 'hurt';
      p.stateTime = 0;
      p.step = null;
      p.usingSlot = null;
    }
    return true;
  }

  /** Wakes an enemy and pulls nearby allies into the fight. */
  alert(enemy: Enemy): void {
    if (enemy.alerted) return;
    enemy.alerted = true;
    enemy.lostTimer = 0;
    if (enemy.state === 'dormant') {
      enemy.state = 'waking';
      enemy.stateTime = 0;
      this.emit({type: 'awaken', enemy: enemy.id});
    } else {
      this.emit({type: 'alert', enemy: enemy.id});
    }
    for (const other of this.enemies) {
      if (other !== enemy && other.alive && other.kind !== 'raider' && enemy.kind !== 'raider' && dist(other, enemy) < ALERT_SHARE_RANGE) {
        this.alert(other);
      }
    }
  }

  private killEnemy(enemy: Enemy): void {
    enemy.alive = false;
    enemy.hp = 0;
    enemy.state = 'dead';
    enemy.stateTime = 0;
    this.kills++;
    this.emit({type: 'death', actor: enemy.id});
    const type: ContainerType = enemy.kind === 'raider' ? 'raider_corpse' : enemy.kind === 'mage' ? 'mage_corpse' : 'warrior_corpse';
    let grid = rollContainer(type, this.rng, this.mods);
    if (enemy.bag) {
      const [w, h] = LOOT_TABLES[type].grid;
      grid = emptyGrid(w, h);
      for (const p of [...enemy.bag.items, ...rollContainer(type, this.rng, this.mods).items]) grid = addAuto(grid, p.item).grid;
    }
    enemy.corpse = this.addContainer(type, enemy, enemy.facing, grid, enemy.id).id;
  }

  // ---------- spawning ----------

  private createPlayer(at: Vec2): Player {
    const maxHp = PLAYER.baseHp + (this.armor?.bonusHp ?? 0) + this.mods.maxHpBonus;
    return {
      id: PLAYER_ID, x: at.x, z: at.z, vx: 0, vz: 0, r: PLAYER.radius, facing: Math.PI, hp: maxHp, maxHp, alive: true,
      state: 'idle', stateTime: 0, stamina: this.maxStamina, staminaDelay: 0, combo: 0, comboQueued: false, comboWindow: 0,
      step: null, hitDone: false, dodgeDir: {x: 0, z: 1}, iframes: 0, sprinting: false, usingSlot: null, moveAmount: 0, sinceHurt: 99,
    };
  }

  spawnEnemy(kind: EnemyKind, at: Vec2, dormant: boolean): Enemy {
    const stats = ENEMY[kind];
    const enemy: Enemy = {
      id: this.newId(), kind, x: at.x, z: at.z, vx: 0, vz: 0, r: stats.radius, facing: this.rng.range(-Math.PI, Math.PI),
      hp: stats.hp, maxHp: stats.hp, alive: true, state: dormant ? 'dormant' : kind === 'raider' ? 'roam' : 'idle',
      stateTime: 0, stateDuration: 0, alerted: false, cooldown: this.rng.range(0.5, 1.5), dodgeCooldown: 0,
      strafeDir: this.rng.chance(0.5) ? 1 : -1, strafeTimer: 0, lostTimer: 0, sightTimer: this.rng.range(0, 0.2), canSee: false,
      poiseHits: 0, poiseTimer: 0, lootTarget: null, visited: new Set(), bag: kind === 'raider' ? emptyGrid(6, 4) : null,
      potions: kind === 'raider' ? 1 : 0, corpse: null, sleeping: false,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  private addContainer(type: ContainerType, at: Vec2, rot: number, grid: Grid, enemyId: number | null = null): Container {
    const id = this.newId();
    const gridId = `c${id}`;
    this.stores = {...this.stores, grids: {...this.stores.grids, [gridId]: grid}};
    const order = [...grid.items].sort((a, b) => a.y - b.y || a.x - b.x).map(p => p.item.uid);
    const container: Container = {id, type, x: at.x, z: at.z, rot, gridId, revealOrder: order, revealed: 0, searchTimer: 0, opened: false, enemyId};
    this.containers.push(container);
    return container;
  }

  // ---------- containers ----------

  isHidden(containerId: number, uid: number): boolean {
    const c = this.containers.find(x => x.id === containerId);
    if (!c) return false;
    const idx = c.revealOrder.indexOf(uid);
    return idx >= c.revealed;
  }

  nearestContainer(): Container | null {
    let best: Container | null = null;
    let bestD = INTERACT_RANGE;
    for (const c of this.containers) {
      const d = dist(c, this.player);
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;
  }

  openNearest(): void {
    const c = this.nearestContainer();
    if (!c) return;
    this.openContainer = c.id;
    if (!c.opened) {
      c.opened = true;
      this.emit({type: 'containerOpen', container: c.id});
    }
  }

  closeContainer(): void {
    this.openContainer = null;
  }

  /** Drops an item at the player's feet as a loot pile anyone can pick up. */
  dropItem(source: Source, item: Parameters<typeof addAuto>[1]): void {
    let pile = this.containers.find(c => c.type === 'pile' && dist(c, this.player) < 1.6);
    if (!pile) pile = this.addContainer('pile', {x: this.player.x, z: this.player.z}, 0, emptyGrid(6, 6));
    const {grid, leftover} = addAuto(this.stores.grids[pile.gridId], item);
    if (leftover) return;
    const removed = removeFrom(this.stores, source);
    this.stores = {...removed, grids: {...removed.grids, [pile.gridId]: grid}};
  }

  private updateContainerSearch(dt: number, input: SimInput): void {
    if (input.interact && this.player.alive) {
      if (this.openContainer === null) this.openNearest();
      else this.closeContainer();
    }
    if (this.openContainer === null) return;
    const c = this.containers.find(x => x.id === this.openContainer);
    if (!c || dist(c, this.player) > CONTAINER_CLOSE_RANGE) {
      this.closeContainer();
      return;
    }
    // Skip uids the player has already taken out.
    const grid = this.stores.grids[c.gridId];
    while (c.revealed < c.revealOrder.length && !grid.items.some(p => p.item.uid === c.revealOrder[c.revealed])) c.revealed++;
    if (c.revealed >= c.revealOrder.length) return;
    const next = grid.items.find(p => p.item.uid === c.revealOrder[c.revealed]);
    if (!next) return;
    c.searchTimer += dt;
    if (c.searchTimer * this.mods.lootSpeed >= REVEAL_SECONDS[itemDef(next.item.defId).rarity]) {
      c.searchTimer = 0;
      c.revealed++;
      this.emit({type: 'reveal', container: c.id, defId: next.item.defId});
    }
  }

  // ---------- movement ----------

  private integrateBodies(dt: number): void {
    const bodies = [this.player, ...this.enemies.filter(e => e.alive && !e.sleeping)];
    const decay = Math.exp(-FRICTION * dt);
    for (const b of bodies) {
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.vx *= decay;
      b.vz *= decay;
    }
    // Soft separation so the horde does not stack on one point.
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const min = a.r + b.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const overlap = (min - d) / 2;
        a.x -= (dx / d) * overlap;
        a.z -= (dz / d) * overlap;
        b.x += (dx / d) * overlap;
        b.z += (dz / d) * overlap;
      }
    }
    for (const b of bodies) resolveCollisions(this.map, this.map.colliders, b, b.r);
  }

  /** Moves a body toward a world point at `speed`, adding to its velocity-free displacement. */
  moveToward(body: Enemy | Player, target: Vec2, speed: number, dt: number): void {
    const d = dist(body, target);
    if (d < 0.05) return;
    body.x += ((target.x - body.x) / d) * speed * dt;
    body.z += ((target.z - body.z) / d) * speed * dt;
  }

  // ---------- projectiles ----------

  spawnProjectile(kind: Projectile['kind'], from: Vec2, dir: Vec2, speed: number, damage: number): void {
    const p: Projectile = {id: this.newId(), kind, x: from.x, z: from.z, vx: dir.x * speed, vz: dir.z * speed, damage, life: 3, r: kind === 'bolt' ? 0.45 : 0.25, evaded: false};
    this.projectiles.push(p);
    this.emit({type: 'shoot', projectile: p});
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.life -= dt;
      const hitWall = !isFloor(this.map, toTile(p.x), toTile(p.z));
      let done = hitWall || p.life <= 0;
      const pl = this.player;
      if (!done && pl.alive && dist(p, pl) < p.r + pl.r) {
        if (pl.iframes > 0) {
          if (!p.evaded) this.emit({type: 'evade', x: pl.x, z: pl.z});
          p.evaded = true;
        } else {
          this.damagePlayer(p.damage, {x: p.x - p.vx, z: p.z - p.vz}, p.kind === 'bolt');
          done = true;
        }
      }
      if (done) {
        this.emit({type: 'projectileEnd', id: p.id, x: p.x, z: p.z, kind: p.kind, hitWall});
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ---------- extraction & timers ----------

  private updateExtraction(dt: number): void {
    if (!this.player.alive) return;
    const zone = this.zones.findIndex(z => dist(z, this.player) < EXTRACT_RADIUS);
    if (zone < 0) {
      if (this.extractZone !== null) this.emit({type: 'extractCancel'});
      this.extractZone = null;
      this.extractProgress = 0;
      return;
    }
    if (this.extractZone !== zone) {
      this.extractZone = zone;
      this.extractProgress = 0;
      this.emit({type: 'extractStart', zone});
    }
    this.extractProgress += dt;
    if (this.extractProgress >= EXTRACT_SECONDS) this.finish('extracted');
  }

  private updateExploration(dt: number): void {
    this.exploreTimer -= dt;
    if (this.exploreTimer > 0) return;
    this.exploreTimer = 0.25;
    const tx = toTile(this.player.x);
    const ty = toTile(this.player.z);
    for (let y = ty - EXPLORE_RADIUS; y <= ty + EXPLORE_RADIUS; y++) {
      for (let x = tx - EXPLORE_RADIUS; x <= tx + EXPLORE_RADIUS; x++) {
        if (x >= 0 && y >= 0 && x < this.map.w && y < this.map.h) this.explored[y * this.map.w + x] = 1;
      }
    }
  }

  private updateTimers(dt: number): void {
    if (!this.player.alive) {
      this.deathTimer += dt;
      if (this.deathTimer >= DEATH_DELAY) this.finish('dead');
      return;
    }
    if (!this.secondRaiderSpawned && this.time >= SECOND_RAIDER_AT && this.map.raiderSpawns.length > 1) {
      this.secondRaiderSpawned = true;
      const far = [...this.map.raiderSpawns].sort((a, b) => dist(b, this.player) - dist(a, this.player))[0];
      this.spawnEnemy('raider', far, false);
      this.emit({type: 'notice', text: '다른 약탈자가 던전에 진입한 것 같다…', tone: 'warn'});
    }
    const before = this.oilRatio;
    this.oil = Math.max(0, this.oil - this.oilDrainRate * dt);
    for (const mark of OIL.warnAt) {
      if (before > mark && this.oilRatio <= mark) {
        this.emit({type: 'notice', text: `랜턴 기름이 ${Math.round(mark * 100)}% 남았다. 탈출을 서둘러야 한다.`, tone: 'warn'});
      }
    }
    if (this.oil <= 0) this.finish('exhausted');
  }

  /** Ends the raid now (also used by the forfeit button). */
  finish(outcome: Outcome): void {
    if (this.outcome) return;
    this.outcome = outcome;
    this.openContainer = null;
    this.emit({type: 'outcome', outcome});
  }

  private syncMaxHp(): void {
    const maxHp = PLAYER.baseHp + (this.armor?.bonusHp ?? 0) + this.mods.maxHpBonus;
    if (maxHp !== this.player.maxHp) {
      this.player.hp = Math.min(maxHp, this.player.hp + Math.max(0, maxHp - this.player.maxHp));
      this.player.maxHp = maxHp;
    }
  }

  /** Is `target` inside an attack arc centered on `facing` from `origin`? */
  inArc(origin: Vec2, facing: number, target: Vec2 & {r: number}, reach: number, arc: number): boolean {
    const d = dist(origin, target);
    if (d > reach + target.r) return false;
    if (arc >= Math.PI * 2 - 0.01) return true;
    const a = Math.atan2(target.x - origin.x, target.z - origin.z);
    // Bodies hugging the attacker count even at the arc's edge.
    const slack = Math.atan2(target.r, Math.max(d, 0.01));
    return Math.abs(angleDiff(facing, a)) <= arc / 2 + slack;
  }
}
