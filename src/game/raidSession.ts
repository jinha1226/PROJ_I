import type {Sfx} from '../audio/sfx';
import type {Input} from '../core/input';
import {dist, type Vec2} from '../core/math';
import {itemDef} from '../items/catalog';
import {CONTAINER_LABEL} from '../items/loot';
import {quickEquip, quickMove, type Source, type Stores} from '../items/stores';
import {ActorRenderer} from '../render/actors';
import type {AssetLibrary} from '../render/assets';
import {Fx, type ActorPose} from '../render/fx';
import {LevelView} from '../render/level';
import type {Stage} from '../render/stage';
import type {RaidModifiers} from '../sim/modifiers';
import {AutoBattle} from '../sim/auto/autoBattle';
import {AutoExplore} from '../sim/auto/autoExplore';
import {AutoReturn} from '../sim/auto/autoReturn';
import {composeAutomation} from '../sim/auto/compose';
import {isManual} from '../sim/auto/steer';
import {Raid} from '../sim/raid';
import type {Outcome} from '../sim/types';
import {byId} from '../ui/dom';
import type {Hud} from '../ui/hud';
import {InventoryUI, type ItemAction} from '../ui/inventory';
import type {MapOverlay} from '../ui/mapOverlay';
import {generateMap} from '../world/mapgen';
import {Feedback} from './feedback';

const AUTO_AIM_RANGE = 7;
/** Animation keeps a sliver of motion during hitstop so frames do not look frozen-broken. */
const HITSTOP_ANIM_SCALE = 0.04;
const SLOWMO_SECONDS = 0.22;
const SLOWMO_SCALE = 0.3;
const FRESH_SECONDS = 3;
const COMBAT_RANGE = 11;
const AUTO_SPEEDS = [1, 2, 3] as const;

export interface SessionDeps {
  stage: Stage;
  assets: AssetLibrary;
  input: Input;
  sfx: Sfx;
  hud: Hud;
  map: MapOverlay;
  icons: ReadonlyMap<string, string>;
}

/** One raid: simulation, scene objects, and the in-raid inventory. */
export class RaidSession {
  readonly raid: Raid;
  private readonly level: LevelView;
  private readonly actors: ActorRenderer;
  private readonly fx: Fx;
  private readonly feedback: Feedback;
  private readonly inventory: InventoryUI;
  readonly autoReturn: AutoReturn;
  readonly autoExplore: AutoExplore;
  readonly autoBattle: AutoBattle;
  private readonly invOverlay = byId('invOverlay');
  private lastContainer: number | null = null;
  private aim: Vec2 = {x: 0, z: 0};
  /** Seconds left of the post-kill slow-motion beat. */
  private slowmo = 0;
  /** Recently revealed notable items glow in the bag view until this time. */
  private readonly fresh = new Map<number, number>();
  private clock = 0;
  private autoSpeed: (typeof AUTO_SPEEDS)[number] = 1;

  constructor(
    private readonly deps: SessionDeps,
    seed: number,
    stores: Stores,
    modifiers: RaidModifiers,
  ) {
    const {stage, assets} = deps;
    this.raid = new Raid(generateMap(seed), {seed, stores, modifiers});
    this.autoReturn = new AutoReturn(this.raid, modifiers.autoReturn);
    this.autoExplore = new AutoExplore(this.raid, modifiers.autoExplore);
    this.autoBattle = new AutoBattle(this.raid, modifiers.autoBattle);
    this.level = new LevelView(stage.scene, assets, this.raid.map, this.raid.containers, this.raid.zones);
    this.actors = new ActorRenderer(stage.scene, assets, this.raid);
    this.fx = new Fx(stage.scene, stage, byId('floatLayer'));
    this.feedback = new Feedback(this.raid, this.fx, this.actors, stage, deps.hud, deps.sfx, {
      onKill: () => (this.slowmo = SLOWMO_SECONDS),
      onReveal: uid => this.fresh.set(uid, this.clock + FRESH_SECONDS),
    });
    this.inventory = new InventoryUI(byId('raidInventory'), deps.icons, {
      getStores: () => this.raid.stores,
      setStores: next => (this.raid.stores = next),
      isHidden: (gridId, uid) => gridId.startsWith('c') && this.raid.isHidden(Number(gridId.slice(1)), uid),
      searchingUid: gridId => {
        const c = this.raid.containers.find(x => x.gridId === gridId);
        return c && c.revealed < c.revealOrder.length ? c.revealOrder[c.revealed] : null;
      },
      actions: (source, item) => this.itemActions(source, item.defId),
      dropOutside: (source, item) => {
        this.raid.dropItem(source, item);
        this.level.syncPiles(this.raid.containers);
        deps.sfx.pickup();
      },
      onMoved: item => (itemDef(item.defId).category === 'currency' ? deps.sfx.coins() : deps.sfx.pickup()),
      onDenied: () => deps.sfx.denied(),
      isFresh: uid => (this.fresh.get(uid) ?? 0) > this.clock,
    });

    const p = this.raid.player;
    stage.snapTo(p);
    this.aim = {x: p.x, z: p.z + 3};
    this.warmUp();
  }

  /**
   * Compiles every shader a raid can need (characters, all pooled effects, both
   * particle pools) and renders one hidden frame, so the first fight is smooth.
   */
  private warmUp(): void {
    const {stage} = this.deps;
    this.level.update(0, this.raid.player, null, null);
    this.actors.update(0);
    this.fx.withAllVisible(() => stage.warmUp());
    stage.update(0, this.raid.player, null, 1);
    stage.render();
  }

  get inventoryOpen(): boolean {
    return !this.invOverlay.hidden;
  }

  setInventoryOpen(open: boolean): void {
    this.invOverlay.hidden = !open;
    if (!open) {
      this.inventory.hideCard();
      this.raid.closeContainer();
    } else {
      this.syncPanels();
      this.inventory.refresh(true);
    }
  }

  private syncPanels(): void {
    const c = this.raid.containers.find(x => x.id === this.raid.openContainer);
    this.inventory.setPanels(c ? [{gridId: c.gridId, title: CONTAINER_LABEL[c.type], subtitle: '아이템을 드래그하거나 클릭해서 가져가세요.'}] : []);
  }

  private itemActions(source: Source, defId: string): ItemAction[] {
    const raid = this.raid;
    const stores = raid.stores;
    const def = itemDef(defId);
    const container = raid.containers.find(c => c.id === raid.openContainer);
    const apply = (next: Stores | null): void => {
      if (!next) {
        this.deps.sfx.denied();
        return;
      }
      raid.stores = next;
      this.deps.sfx.pickup();
      this.inventory.refresh(true);
    };
    const out: ItemAction[] = [];
    const inBackpack = source.kind === 'grid' && source.id === 'backpack';
    if (source.kind === 'grid' && !inBackpack) out.push({label: '가져가기', tone: 'primary', run: () => apply(quickMove(stores, source, 'backpack'))});
    if (inBackpack && container) out.push({label: '상자에 넣기', run: () => apply(quickMove(stores, source, container.gridId))});
    if (source.kind === 'grid' && (def.weapon || def.armor || def.consumable)) out.push({label: '장착', run: () => apply(quickEquip(stores, source))});
    if (source.kind === 'slot') out.push({label: '가방으로', run: () => apply(quickMove(stores, source, 'backpack'))});
    if (inBackpack || source.kind === 'slot') {
      out.push({
        label: '버리기',
        tone: 'danger',
        run: () => {
          const item = source.kind === 'slot' ? stores.slots[source.id] : stores.grids.backpack.items.find(p => p.item.uid === source.uid)?.item;
          if (!item) return;
          raid.dropItem(source, item);
          this.level.syncPiles(raid.containers);
          this.inventory.refresh(true);
        },
      });
    }
    return out;
  }

  private autoAim(): Vec2 {
    const p = this.raid.player;
    let best: Vec2 | null = null;
    let bestD = AUTO_AIM_RANGE;
    for (const e of this.raid.enemies) {
      if (!e.alive || e.state === 'dormant') continue;
      const d = dist(e, p);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best ?? {x: p.x + Math.sin(p.facing) * 3, z: p.z + Math.cos(p.facing) * 3};
  }

  private pose = (id: number): ActorPose | null => {
    if (id === this.raid.player.id) return this.raid.player;
    return this.raid.enemies.find(e => e.id === id) ?? null;
  };

  /** Advances one frame. Returns the outcome once the raid has ended. */
  frame(realDt: number, paused: boolean): Outcome | null {
    const {stage, input, hud, map} = this.deps;
    const raid = this.raid;
    this.clock += realDt;
    const exploreBefore = this.autoExplore.status();
    const battleBefore = this.autoBattle.status();
    const speedAvailable = !['locked', 'off'].includes(exploreBefore) || !['locked', 'off'].includes(battleBefore);
    const scaled = realDt * (speedAvailable ? this.autoSpeed : 1);
    // A kill briefly slows everything down; the camera keeps real time.
    const slowmoActive = this.slowmo > 0;
    let dt = slowmoActive ? scaled * SLOWMO_SCALE : scaled;
    this.slowmo = Math.max(0, this.slowmo - realDt);
    const pointer = input.pointer;
    if (pointer.active) this.aim = stage.groundPoint(pointer.x, pointer.y);
    else this.aim = this.autoAim();

    if (!paused) {
      const human = input.sample(this.aim, this.inventoryOpen || this.inventory.isDragging());
      // Dragging items in the bag counts as the player being busy, not as idle.
      const manual = isManual(human.move, human.attack && !human.uiBlocked, human.dodge) || this.inventory.isDragging();
      // Automation speed must not amplify a player's temporary manual takeover.
      if (manual) dt = slowmoActive ? realDt * SLOWMO_SCALE : realDt;
      const simInput = composeAutomation(human, dt, manual, this.autoBattle, this.autoExplore, this.autoReturn);
      // E toggles: with the bag open, it closes the bag (and the container) instead.
      if (simInput.interact && this.inventoryOpen) {
        simInput.interact = false;
        this.setInventoryOpen(false);
      }
      raid.update(dt, simInput);
      for (const ev of raid.drainEvents()) this.feedback.handle(ev);
    }

    if (raid.openContainer !== this.lastContainer) {
      this.lastContainer = raid.openContainer;
      if (raid.openContainer !== null) this.setInventoryOpen(true);
      else if (this.inventoryOpen) {
        this.syncPanels();
        this.inventory.refresh(true);
      }
    }

    const animDt = paused ? 0 : raid.hitstop > 0 ? dt * HITSTOP_ANIM_SCALE : dt;
    this.actors.update(animDt);
    this.fx.ambientDust(raid.player.x, raid.player.z, realDt);
    this.fx.update(animDt, this.pose);
    const near = raid.openContainer === null ? raid.nearestContainer() : null;
    this.level.update(dt, raid.player, near, raid.extractZone);
    stage.setTorchSites(this.level.torchSites, raid.player, this.level.torchColors);
    stage.setCombat(raid.enemies.some(e => e.alive && e.alerted && e.canSee && dist(e, raid.player) < COMBAT_RANGE));
    stage.update(realDt, raid.player, pointer.active ? this.aim : null, raid.oilRatio);
    stage.render();

    hud.update(dt, raid, this.inventoryOpen, this.autoReturn.status(), this.autoExplore.status(), this.autoBattle.status(), this.autoSpeed, speedAvailable);
    if (this.inventoryOpen) this.inventory.refresh();
    map.draw(raid);
    return raid.outcome;
  }

  /** "Go home now": walks to the nearest exit (needs the auto-return node). */
  returnNow(): void {
    if (!this.autoReturn.unlocked) {
      this.deps.hud.notice('즉시 귀환은 지휘탑의 자동 귀환을 해금하면 쓸 수 있습니다', 'info');
      return;
    }
    if (this.inventoryOpen) this.setInventoryOpen(false);
    this.autoReturn.returnNow();
  }

  cycleAutoSpeed(): void {
    const explore = this.autoExplore.status();
    const battle = this.autoBattle.status();
    if (['locked', 'off'].includes(explore) && ['locked', 'off'].includes(battle)) {
      this.deps.hud.notice('자동 탐험 또는 자동 전투를 켜야 배속을 사용할 수 있습니다', 'info');
      return;
    }
    const index = AUTO_SPEEDS.indexOf(this.autoSpeed);
    this.autoSpeed = AUTO_SPEEDS[(index + 1) % AUTO_SPEEDS.length];
    this.deps.hud.notice(`자동 진행 ${this.autoSpeed}배속`, 'info');
  }

  toggleAuto(which: 'autoReturn' | 'autoExplore' | 'autoBattle'): void {
    const bot = which === 'autoReturn' ? this.autoReturn : which === 'autoExplore' ? this.autoExplore : this.autoBattle;
    const name = which === 'autoReturn' ? '자동 귀환' : which === 'autoExplore' ? '자동 탐험' : '자동 전투';
    if (!bot.unlocked) {
      this.deps.hud.notice(`${name}은 지휘탑에서 해금할 수 있습니다`, 'info');
      return;
    }
    this.deps.hud.notice(`${name} ${bot.toggle() ? '켬' : '끔'}`, 'info');
  }

  dispose(): void {
    this.setInventoryOpen(false);
    this.inventory.destroy();
    this.level.dispose();
    this.actors.dispose();
    this.fx.dispose();
  }
}
