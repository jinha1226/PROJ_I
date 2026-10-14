import {GAME_SPEEDS, NEXT_BATTLE_DELAY_MS, RETREAT_PURSUIT_DAMAGE} from '../config';
import {CombatSystem, type CombatOutcome} from '../combat/combatSystem';
import type {CombatFx} from '../combat/ports';
import {Navigator} from '../dungeon/navigation';
import type {Dungeon} from '../dungeon/types';
import {expeditionSummary, settleExpedition} from '../expedition/settlement';
import {livingRoster} from '../expedition/rules';
import type {ActorFactory} from '../render/actorFactory';
import type {GuildState} from '../state/guild';
import type {Progression} from '../state/progression';
import {World} from '../state/world';
import type {Vector3} from 'three';
import {GameMode, canOpenBase, canTravel} from './mode';
import type {DungeonScene, Presenter} from './ports';
import {ExpeditionSession} from './session';
import {spawnDungeonMonsters, spawnParty} from './spawner';
import {TravelSystem, type TravelEvent} from './travel';

export interface GameDeps {
  dungeon: Dungeon;
  /** Created by the caller so UI panels can observe it before the game exists. */
  session: ExpeditionSession;
  progression: Progression;
  guild: GuildState;
  factory: ActorFactory;
  fx: CombatFx & {update(dt: number): void};
  scene: DungeonScene;
  presenter: Presenter;
  /** Called once the party and monsters for an expedition exist (e.g. to pre-compile shaders). */
  onWorldPopulated?: () => void;
}

/** Inside a fight: waiting to start, actively simulated, or finished and waiting to move on. */
export type CombatPhase = 'idle' | 'active' | 'ended';

const BOSS_STAGE_INTERVAL = 5;
/** Monsters farther than this from the party (world units) are out of sight and not animated. */
const ANIMATION_RADIUS_SQUARED = 40 * 40;
const RETREAT_NOTICE = '퇴각 중 · 살아있는 몬스터와 다시 마주치면 교전';

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Top-level state machine. Modes: BASE (hub) -> TRAVEL (auto-explore) <-> COMBAT
 * (one room fight). It owns transitions; simulation lives in the systems it drives.
 */
export class Game {
  readonly world = new World();
  readonly session: ExpeditionSession;
  readonly combat: CombatSystem;
  readonly travel: TravelSystem;

  mode: GameMode = GameMode.BASE;
  phase: CombatPhase = 'idle';
  paused = false;
  speed: number = GAME_SPEEDS[0];

  private battleTimer: ReturnType<typeof setTimeout> | undefined;
  /** Bumped on every new expedition so late async spawns from the previous run are discarded. */
  private runId = 0;

  constructor(private readonly deps: GameDeps) {
    const {dungeon, progression, guild, fx} = deps;
    const nav = new Navigator(dungeon);
    this.session = deps.session;
    this.combat = new CombatSystem({world: this.world, nav, fx, progression, guild});
    this.travel = new TravelSystem(this.world, nav, this.session);
  }

  private get ui(): Presenter {
    return this.deps.presenter;
  }

  // ---- frame ---------------------------------------------------------------------------------

  /** Advances the game by `elapsed` real seconds. */
  tick(elapsed: number): void {
    if (!this.paused) this.animate(elapsed * this.speed);
    if (this.mode === GameMode.COMBAT && this.phase === 'active' && !this.paused) {
      this.runCombat(elapsed);
      return;
    }
    this.deps.fx.update(elapsed);
    if (this.mode === GameMode.TRAVEL && canTravel(this.mode, this.paused, this.world.actors)) {
      this.handleTravel(this.travel.step(elapsed * this.speed));
    }
  }

  /**
   * Advances skeletal animation independent of the simulation, so heroes keep
   * breathing between fights and monsters near the party are never frozen statues.
   */
  private animate(dt: number): void {
    const focus = this.focusPoint();
    for (const actor of this.world.actors) {
      if (actor.team === 'hero' || actor.pos.distanceToSquared(focus) <= ANIMATION_RADIUS_SQUARED) actor.view.tick(dt);
    }
  }

  /** The point the camera follows: the lead hero, or the explorer marker when nobody is spawned. */
  focusPoint(): Vector3 {
    return this.world.heroes()[0]?.pos ?? this.travel.worldPoint(this.session.explorer.x, this.session.explorer.y);
  }

  /** Runs `speed` fixed-size simulation steps; effects age in step with the fight. */
  private runCombat(elapsed: number): void {
    for (let i = 0; i < this.speed && this.phase === 'active'; i++) {
      this.deps.fx.update(elapsed);
      const outcome = this.combat.update(elapsed);
      if (outcome) this.finishBattle(outcome);
      this.renderHP();
    }
  }

  private handleTravel(event: TravelEvent): void {
    switch (event.kind) {
      case 'walking':
        return;
      case 'refresh':
        this.revealDungeon();
        this.ui.battleInfo(`자동 탐험 · 지도 ${this.session.percentExplored}%`);
        return;
      case 'encounter':
        this.revealDungeon();
        this.beginEncounter(event.room);
        return;
      case 'return':
        this.returnToBase(event.message, event.success);
        return;
    }
  }

  // ---- controls ------------------------------------------------------------------------------

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.ui.setPaused(paused);
  }

  cycleSpeed(): void {
    this.speed = GAME_SPEEDS[(GAME_SPEEDS.indexOf(this.speed as (typeof GAME_SPEEDS)[number]) + 1) % GAME_SPEEDS.length];
    this.ui.setSpeed(this.speed);
  }

  openHub(message = ''): void {
    if (canOpenBase(this.mode)) this.ui.showHub(message);
  }

  toggleGuide(): void {
    this.session.pathfinderSkill = !this.session.pathfinderSkill;
    this.session.route = [];
    this.ui.redrawMap();
  }

  // ---- expedition lifecycle ------------------------------------------------------------------

  /** Hub "depart" button: like startExpedition, but failures bring the player back to the hub. */
  async launchFromHub(): Promise<void> {
    try {
      await this.startExpedition();
    } catch (error) {
      console.error('Expedition start failed', error);
      this.mode = GameMode.BASE;
      this.deps.guild.abortExpedition();
      this.ui.showHub('원정 시작 오류: ' + errorMessage(error));
    }
  }

  async startExpedition(): Promise<void> {
    this.runId++;
    this.deps.guild.beginExpedition();
    this.session.begin();
    this.world.clear();
    this.combat.reset();
    return this.enterTravel();
  }

  async enterTravel(): Promise<void> {
    const {session, deps} = this;
    session.visitedRooms.add(0);
    clearTimeout(this.battleTimer);
    this.mode = GameMode.TRAVEL;
    session.autoExploring = true;
    this.phase = 'idle';
    this.setPaused(false);
    this.ui.closeExplorePanel();
    this.ui.notice('');
    this.revealDungeon();

    if (!this.world.heroes().length) {
      if (session.retreating) return this.returnToBase('원정대 전멸', false);
      try {
        const entry = this.travel.worldPoint(session.explorer.x, session.explorer.y);
        const heroes = await spawnParty(deps.factory, livingRoster(deps.guild.data.roster), entry.x, entry.z);
        for (const hero of heroes) this.world.add(hero);
        this.ui.renderParty(heroes);
      } catch (error) {
        console.error(error);
        deps.guild.abortExpedition();
        this.mode = GameMode.BASE;
        this.ui.showHub('영웅 로딩 실패: ' + errorMessage(error));
        return;
      }
    }

    const freshlyPopulated = !session.monstersReady;
    await this.populateMonsters();
    if (freshlyPopulated && session.monstersReady) deps.onWorldPopulated?.();
    session.travelTarget = this.travel.worldPoint(session.explorer.x, session.explorer.y);
    this.travel.moveParty(0);
    this.ui.status(`STAGE ${deps.progression.stage} · 던전 탐험`);
    this.ui.battleInfo(`자동 탐험 · 지도 ${session.percentExplored}%`);
  }

  private async populateMonsters(): Promise<void> {
    const {session, deps} = this;
    if (session.monstersReady) return;
    session.monstersReady = true;
    const run = this.runId;
    try {
      const rooms = await spawnDungeonMonsters(deps.factory, deps.dungeon, deps.progression.stage);
      if (run !== this.runId) {
        for (const enemies of rooms.values()) for (const enemy of enemies) enemy.view.dispose();
        return;
      }
      for (const [room, enemies] of rooms) {
        session.roomMonsters.set(room, enemies);
        for (const enemy of enemies) this.world.add(enemy);
      }
    } catch (error) {
      session.monstersReady = false;
      console.error('Dungeon monster generation failed', error);
    }
  }

  private revealDungeon(): void {
    this.session.reveal();
    this.deps.scene.prepareDungeon(this.deps.dungeon);
    this.ui.redrawMap();
  }

  returnToBase(message: string, success = true): void {
    const {session, deps} = this;
    if (session.settled) return;
    session.settled = true;
    clearTimeout(this.battleTimer);
    deps.guild.syncFrom(this.world.heroes());
    const summary = settleExpedition({
      guild: deps.guild.data,
      actors: this.world.actors,
      successful: success,
      discoveredTiles: session.discoveries.size,
      loot: session.loot,
      steps: session.steps,
      kills: session.kills,
    });
    deps.guild.save();
    this.mode = GameMode.BASE;
    session.autoExploring = false;
    this.phase = 'ended';
    session.retreating = false;
    this.world.clear();
    this.ui.showHub(expeditionSummary(message, summary));
  }

  /** Retreat button: flee toward the entrance, taking free hits from adjacent enemies. */
  issueRetreat(): void {
    const {session, world} = this;
    if (this.mode === GameMode.BASE) return this.openHub();
    if (session.retreating || session.settled) return;
    if (!world.livingHeroes().length) return this.returnToBase('원정대 전멸', false);

    session.retreating = true;
    session.retreatEscapeRoom = this.combat.activeRoom;
    clearTimeout(this.battleTimer);
    if (this.mode === GameMode.COMBAT) {
      this.applyRetreatPenalty();
      this.deps.guild.syncFrom(world.heroes());
      if (!world.livingHeroes().length) return this.returnToBase('퇴각 중 전멸', false);
    }
    this.phase = 'idle';
    this.mode = GameMode.TRAVEL;
    session.autoExploring = true;
    this.combat.activeRoom = -1;
    session.route = [];
    session.travelTarget = this.travel.worldPoint(session.explorer.x, session.explorer.y);
    this.ui.notice(RETREAT_NOTICE);
  }

  private applyRetreatPenalty(): void {
    const {world, deps} = this;
    const pursuers = world.enemiesOfRoom(this.combat.activeRoom).filter(e => !e.dead);
    for (const hero of world.livingHeroes()) {
      for (const enemy of pursuers.filter(e => e.pos.distanceTo(hero.pos) < e.range + 1)) {
        if (hero.dead) break;
        const damage = Math.max(1, Math.ceil(enemy.damage * RETREAT_PURSUIT_DAMAGE));
        hero.hp = Math.max(0, hero.hp - damage);
        deps.fx.floatText(hero.pos, '퇴각 -' + damage, '#ffb28a');
        if (hero.hp === 0) {
          hero.dead = true;
          this.combat.recordCasualty(hero);
          hero.view.play('death', true);
          hero.view.setRingVisible(false);
        }
      }
    }
  }

  // ---- combat flow ---------------------------------------------------------------------------

  private beginEncounter(room: number): void {
    const {session} = this;
    this.mode = GameMode.COMBAT;
    this.combat.activeRoom = room;
    this.phase = 'active';
    session.visitedRooms.add(room);
    session.route = [];
    for (const enemy of session.roomMonsters.get(room) ?? []) {
      if (enemy.dead) continue;
      enemy.view.setVisible(true);
      enemy.view.setRingVisible(true);
    }
    this.ui.status(`STAGE ${this.deps.progression.stage} · 전투`);
    this.renderHP();
  }

  private finishBattle({heroesSurvived}: CombatOutcome): void {
    const {session, world, deps} = this;
    this.phase = 'ended';
    const result = deps.progression.recordBattle(heroesSurvived);
    this.ui.notice(result.victory ? `VICTORY · GOLD +${result.goldAwarded}` : 'DEFEAT');
    this.renderProgress();
    this.ui.setRestartEnabled(true);

    const room = this.combat.activeRoom;
    const defeated = world.enemiesOfRoom(room).filter(e => e.dead).length;
    if (heroesSurvived) {
      session.kills += defeated;
      session.loot += defeated * 2;
    }
    world.removeWhere(a => a.team === 'enemy' && a.dungeonRoom === room);

    if (!heroesSurvived) {
      this.returnToBase('원정대 전멸', false);
    } else {
      deps.guild.syncFrom(world.heroes());
      if (session.retreating) void this.enterTravel().catch(error => console.error(error));
      else this.queueNextBattle();
    }
  }

  private queueNextBattle(): void {
    clearTimeout(this.battleTimer);
    this.battleTimer = setTimeout(() => {
      if (this.session.settled) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      if (!this.paused && !hidden) void this.enterTravel().catch(error => console.error(error));
      else this.queueNextBattle();
    }, NEXT_BATTLE_DELAY_MS / this.speed);
  }

  // ---- HUD text ------------------------------------------------------------------------------

  renderProgress(): void {
    const {data} = this.deps.progression;
    const parts = [`STAGE ${data.stage}${data.farming ? ' · 파밍' : ''}`, `${data.gold} G`];
    if (data.stage % BOSS_STAGE_INTERVAL === 0) parts.push('BOSS');
    parts.push(this.deps.scene.themeName);
    this.ui.status(parts.join(' · '));
  }

  renderHP(): void {
    const heroes = this.world.heroes();
    const living = heroes.filter(h => !h.dead).length;
    const foes = this.world.actors.filter(a => a.team === 'enemy' && !a.dead).length;
    this.ui.updateParty(this.world.actors);
    this.ui.battleInfo(`아군 ${living}/${heroes.length} · 적 ${foes} · ${this.speed}×`);
  }
}
