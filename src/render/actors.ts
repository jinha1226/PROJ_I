import type {Scene} from 'three';
import {PLAYER} from '../config';
import {angleDiff} from '../core/math';
import {itemDef} from '../items/catalog';
import type {Raid} from '../sim/raid';
import type {Enemy, Player, SimEvent} from '../sim/types';
import type {AssetLibrary} from './assets';
import {CharacterView} from './character';

const MOVE_EPSILON = 0.6;
const ROGUE_GEAR = ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable'];

/** Seconds into a clip at which its strike lands, given a fraction. */
const hitSpeed = (view: CharacterView, clip: string, clipHit: number, simHitTime: number): number =>
  (view.clipDuration(clip) * clipHit) / Math.max(0.05, simHitTime);

interface EnemyView {
  view: CharacterView;
  lastX: number;
  lastZ: number;
  speed: number;
  /** Last action serial whose clip has been started. */
  played: number;
}

/** Keeps one CharacterView per sim actor and picks animations from sim state. */
export class ActorRenderer {
  readonly player: CharacterView;
  private readonly enemies = new Map<number, EnemyView>();
  private gearKey = '';
  /** Forces attack clips to restart for each new swing, even the same clip twice. */
  private swingSerial = 0;
  private playedSwing = -1;
  /** Bumped on every wind-up / hit so one-shot clips restart even when repeated. */
  private readonly actionSerial = new Map<number, number>();

  constructor(
    private readonly scene: Scene,
    private readonly assets: AssetLibrary,
    private readonly raid: Raid,
  ) {
    this.player = new CharacterView(assets, 'Knight');
    scene.add(this.player.root);
    this.syncPlayerGear();
    for (const e of raid.enemies) this.ensureEnemy(e);
  }

  /** Every view, for the shader warm-up pass. */
  get allViews(): CharacterView[] {
    return [this.player, ...[...this.enemies.values()].map(e => e.view)];
  }

  private ensureEnemy(e: Enemy): EnemyView {
    let ev = this.enemies.get(e.id);
    if (ev) return ev;
    const name = e.kind === 'raider' ? 'Rogue_Hooded' : e.kind === 'mage' ? 'Skeleton_Mage' : 'Skeleton_Warrior';
    const view = new CharacterView(this.assets, name);
    if (e.kind === 'warrior') {
      view.attach(e.id % 3 === 0 ? 'Skeleton_Axe' : 'Skeleton_Blade', 'handslot.r');
      if (e.id % 2 === 0) view.attach('Skeleton_Shield_Small_A', 'handslot.l');
    } else if (e.kind === 'mage') {
      view.attach('Skeleton_Staff', 'handslot.r');
    } else {
      view.showOnly(['1H_Crossbow', 'Knife_Offhand'], ROGUE_GEAR);
    }
    view.root.position.set(e.x, 0, e.z);
    view.root.rotation.y = e.facing;
    view.play(e.state === 'dormant' ? 'Skeletons_Inactive_Floor_Pose' : 'Idle');
    this.scene.add(view.root);
    ev = {view, lastX: e.x, lastZ: e.z, speed: 0, played: 0};
    this.enemies.set(e.id, ev);
    return ev;
  }

  private syncPlayerGear(): void {
    const weapon = this.raid.stores.slots.weapon;
    const armor = this.raid.stores.slots.armor;
    const key = `${weapon?.defId ?? ''}|${armor?.defId ?? ''}`;
    if (key === this.gearKey) return;
    this.gearKey = key;
    const w = weapon ? itemDef(weapon.defId).weapon : undefined;
    const a = armor ? itemDef(armor.defId).armor : undefined;
    this.player.equipKnight(w?.mesh ?? null, Boolean(a?.helmet));
  }

  onEvent(ev: SimEvent): void {
    switch (ev.type) {
      case 'swing':
        if (ev.actor === this.raid.player.id) this.swingSerial++;
        break;
      case 'hit':
        this.view(ev.target)?.flash(0xffffff, 1);
        this.bump(ev.target);
        break;
      case 'windup':
      case 'cast':
      case 'aim':
        this.bump(ev.enemy);
        break;
      case 'dodge':
        this.bump(ev.actor);
        break;
      case 'playerHurt':
        this.player.flash(0xff2020, 1);
        break;
      default:
        break;
    }
  }

  private bump(id: number): void {
    this.actionSerial.set(id, (this.actionSerial.get(id) ?? 0) + 1);
  }

  view(id: number): CharacterView | null {
    if (id === this.raid.player.id) return this.player;
    return this.enemies.get(id)?.view ?? null;
  }

  update(dt: number): void {
    this.syncPlayerGear();
    this.animatePlayer(this.raid.player);
    this.player.root.position.set(this.raid.player.x, 0, this.raid.player.z);
    this.player.root.rotation.y = this.raid.player.facing;
    this.player.update(dt);

    for (const e of this.raid.enemies) {
      const ev = this.ensureEnemy(e);
      const near = Math.abs(e.x - this.raid.player.x) < 34 && Math.abs(e.z - this.raid.player.z) < 30;
      ev.view.root.visible = near;
      if (!near) continue;
      const moved = Math.hypot(e.x - ev.lastX, e.z - ev.lastZ) / Math.max(dt, 1e-4);
      ev.speed += (moved - ev.speed) * Math.min(1, dt * 12);
      ev.lastX = e.x;
      ev.lastZ = e.z;
      this.animateEnemy(e, ev);
      ev.view.root.position.set(e.x, 0, e.z);
      ev.view.root.rotation.y = e.facing;
      ev.view.update(dt);
    }
  }

  private animatePlayer(p: Player): void {
    const v = this.player;
    const twoHanded = this.raid.weapon?.kind === '2h';
    switch (p.state) {
      case 'dead':
        v.play('Death_A', {loop: false, clamp: true, fade: 0.08});
        return;
      case 'dodge': {
        const rel = angleDiff(p.facing, Math.atan2(p.dodgeDir.x, p.dodgeDir.z));
        const clip = Math.abs(rel) < Math.PI / 4 ? 'Dodge_Forward' : Math.abs(rel) > (3 * Math.PI) / 4 ? 'Dodge_Backward' : rel > 0 ? 'Dodge_Left' : 'Dodge_Right';
        v.play(clip, {loop: false, fade: 0.05, speed: v.clipDuration(clip) / PLAYER.dodgeDuration});
        return;
      }
      case 'attack': {
        const step = p.step;
        if (!step) return;
        const restart = this.playedSwing !== this.swingSerial;
        this.playedSwing = this.swingSerial;
        v.play(step.clip, {loop: false, fade: 0.06, restart, speed: hitSpeed(v, step.clip, step.clipHit, step.hitTime)});
        return;
      }
      case 'hurt':
        v.play('Hit_A', {loop: false, fade: 0.05, speed: 1.6, restart: v.playing !== 'Hit_A'});
        return;
      case 'use': {
        const item = p.usingSlot ? this.raid.stores.slots[p.usingSlot] : null;
        const time = item ? (itemDef(item.defId).consumable?.useTime ?? 1) : 1;
        v.play('Use_Item', {loop: false, speed: v.clipDuration('Use_Item') / time});
        return;
      }
      case 'move':
        if (p.moveAmount > 0.15) {
          v.play('Running_A', {speed: 0.75 + p.moveAmount * 0.55});
          return;
        }
        break;
      default:
        break;
    }
    v.play(twoHanded ? '2H_Melee_Idle' : 'Idle');
  }

  private animateEnemy(e: Enemy, ev: EnemyView): void {
    const v = ev.view;
    const moving = ev.speed > MOVE_EPSILON;
    const serial = this.actionSerial.get(e.id) ?? 0;
    const fresh = ev.played !== serial;
    ev.played = serial;
    switch (e.state) {
      case 'dead':
        v.play(e.kind === 'raider' ? 'Death_A' : 'Death_C_Skeletons', {loop: false, clamp: true, fade: 0.06});
        return;
      case 'dormant':
        v.play('Skeletons_Inactive_Floor_Pose', {fade: 0});
        return;
      case 'waking':
        v.play('Skeletons_Awaken_Floor', {loop: false, speed: v.clipDuration('Skeletons_Awaken_Floor') / 1.7, fade: 0.05});
        return;
      case 'hurt':
        v.play('Hit_A', {loop: false, fade: 0.04, speed: 1.7, restart: fresh});
        return;
      case 'windup':
      case 'strike':
      case 'recover': {
        if (e.kind === 'warrior') {
          // One chop clip spans wind-up → strike → recovery, timed so the blade lands on the strike.
          v.play('1H_Melee_Attack_Chop', {loop: false, fade: 0.08, restart: fresh, speed: e.state === 'windup' ? hitSpeed(v, '1H_Melee_Attack_Chop', 0.42, e.stateDuration) : 1});
        } else if (e.kind === 'raider') {
          const clip = e.state === 'recover' && v.playing.startsWith('1H_Ranged') ? '1H_Ranged_Shoot' : '1H_Melee_Attack_Stab';
          v.play(clip, {loop: false, fade: 0.06, restart: fresh && e.state === 'windup', speed: clip === '1H_Melee_Attack_Stab' && e.state === 'windup' ? hitSpeed(v, clip, 0.35, e.stateDuration) : 1.4});
        } else {
          v.play('Spellcast_Shoot', {loop: false, fade: 0.08, speed: 1.3});
        }
        return;
      }
      case 'cast':
        v.play('Spellcast_Raise', {loop: false, fade: 0.1, restart: fresh, speed: v.clipDuration('Spellcast_Raise') / Math.max(0.3, e.stateDuration)});
        return;
      case 'aim':
        v.play('1H_Ranged_Aiming', {fade: 0.1});
        return;
      case 'dodge':
        v.play('Dodge_Forward', {loop: false, fade: 0.04, restart: fresh, speed: v.clipDuration('Dodge_Forward') / Math.max(0.2, e.stateDuration)});
        return;
      case 'use':
        v.play('Use_Item', {loop: false});
        return;
      case 'loot':
        v.play('Interact', {fade: 0.15});
        return;
      default:
        break;
    }
    if (moving) {
      const clip = e.kind === 'warrior' ? 'Running_C' : e.kind === 'mage' ? 'Walking_D_Skeletons' : e.alerted ? 'Running_A' : 'Walking_A';
      v.play(clip, {speed: clip === 'Walking_D_Skeletons' ? 1.4 : 1});
    } else {
      v.play(e.alerted && e.kind !== 'raider' ? 'Idle_Combat' : 'Idle');
    }
  }

  dispose(): void {
    this.player.dispose();
    for (const ev of this.enemies.values()) ev.view.dispose();
    this.enemies.clear();
  }
}
