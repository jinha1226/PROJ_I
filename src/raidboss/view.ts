import {AdditiveBlending, CircleGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial, RingGeometry, Vector3, type BufferGeometry, type Scene} from 'three';
import type {AssetLibrary, CharacterName} from '../render/assets';
import {CharacterView} from '../render/character';
import {Fx} from '../render/fx';
import type {Stage} from '../render/stage';
import {ARENA_RADIUS, type BossRaid} from './sim';
import type {Hazard, RaidEvent, Unit} from './types';

const MODEL: Readonly<Record<Unit['kind'], CharacterName>> = {
  tank: 'Knight',
  melee: 'Barbarian',
  ranged: 'Rogue_Hooded',
  healer: 'Mage',
  boss: 'Skeleton_Warrior',
  add: 'Skeleton_Warrior',
};
const BOSS_SCALE = 2.4;
const HAZARD_COLOR: Readonly<Record<string, number>> = {'전방 강타': 0xff3a20, '회전 베기': 0xff6a20, '뼈 폭풍': 0xffb020, '죽음의 표식': 0xb050ff};

/** Clip choices per unit kind and state. */
function clipFor(u: Unit): {name: string; loop: boolean; speed?: number} {
  const boss = u.kind === 'boss' || u.kind === 'add';
  switch (u.anim) {
    case 'dead':
      return {name: boss ? 'Death_C_Skeletons' : 'Death_A', loop: false};
    case 'move':
      return {name: boss ? 'Running_C' : 'Running_A', loop: true, speed: u.kind === 'boss' ? 0.7 : 1};
    case 'attack':
      if (u.kind === 'ranged') return {name: '1H_Ranged_Shoot', loop: false, speed: 1.6};
      if (u.kind === 'healer') return {name: 'Spellcast_Shoot', loop: false, speed: 1.4};
      if (u.kind === 'boss') return {name: '2H_Melee_Attack_Chop', loop: false, speed: 1.3};
      return {name: u.kind === 'melee' ? '2H_Melee_Attack_Slice' : '1H_Melee_Attack_Chop', loop: false, speed: 1.6};
    case 'cast':
      return {name: u.kind === 'boss' ? 'Spellcast_Long' : 'Spellcasting', loop: true};
    case 'dodge':
      return {name: 'Dodge_Forward', loop: false, speed: 1};
    case 'block':
      return {name: 'Blocking', loop: true};
    default:
      return {name: boss ? 'Idle_Combat' : u.kind === 'melee' ? '2H_Melee_Idle' : 'Idle', loop: true};
  }
}

interface HazardView {
  fill: Mesh;
  edge: Mesh;
}

/** Draws the boss raid: arena, characters, telegraphs, and combat feedback. */
export class RaidView {
  readonly fx: Fx;
  private readonly views = new Map<number, {view: CharacterView; serial: number}>();
  private readonly hazards = new Map<number, HazardView>();
  private readonly sectorCache = new Map<string, BufferGeometry>();
  private readonly marker: Mesh;
  private readonly aggro: Mesh;
  readonly torchSites: Vector3[] = [];
  readonly torchColors: number[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly assets: AssetLibrary,
    stage: Stage,
    overlay: HTMLElement,
  ) {
    this.fx = new Fx(scene, stage, overlay);
    this.buildArena();
    const ring = (inner: number, outer: number, color: number): Mesh => {
      const m = new Mesh(
        new RingGeometry(inner, outer, 40).rotateX(-Math.PI / 2),
        new MeshBasicMaterial({color, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false}),
      );
      scene.add(m);
      return m;
    };
    this.marker = ring(0.75, 0.95, 0x7ec7ff);
    this.aggro = ring(0.85, 1.05, 0xff3030);
  }

  private buildArena(): void {
    const floor = this.assets.pieces.get('floor_tile_large');
    const pillar = this.assets.pieces.get('pillar_decorated') ?? this.assets.pieces.get('pillar');
    const torch = this.assets.pieces.get('torch_mounted');
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        if (!floor || Math.hypot(x * 4, z * 4) > ARENA_RADIUS + 3) continue;
        const f = floor.clone();
        f.position.set(x * 4, 0, z * 4);
        f.rotation.y = ((x * 7 + z * 3) % 4) * (Math.PI / 2);
        f.traverse(n => (n.receiveShadow = true));
        this.scene.add(f);
      }
    }
    const count = 12;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = Math.sin(a) * (ARENA_RADIUS + 1.6);
      const z = Math.cos(a) * (ARENA_RADIUS + 1.6);
      // Leave the camera side open so pillars never hide the fight.
      if (z > ARENA_RADIUS * 0.4) continue;
      if (pillar) {
        const p = pillar.clone();
        p.position.set(x, 0, z);
        p.rotation.y = a + Math.PI;
        p.traverse(n => (n.castShadow = true));
        this.scene.add(p);
      }
      if (torch && i % 2 === 0) {
        const t = torch.clone();
        t.position.set(x * 0.94, 2.2, z * 0.94);
        t.rotation.y = a + Math.PI;
        this.scene.add(t);
        this.torchSites.push(new Vector3(x * 0.9, 3, z * 0.9));
        this.torchColors.push(i % 4 === 0 ? 0x7dffb0 : 0xff8a3c);
      }
    }
    // Ritual circle under the boss.
    const sigil = new Mesh(
      new RingGeometry(3.2, 3.35, 48).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({color: new Color(0.35, 0.3, 0.5), transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false}),
    );
    sigil.position.set(0, 0.06, -4);
    this.scene.add(sigil);
  }

  private viewFor(u: Unit): CharacterView {
    let entry = this.views.get(u.id);
    if (!entry) {
      const view = new CharacterView(this.assets, MODEL[u.kind]);
      if (u.kind === 'boss') {
        view.root.scale.setScalar(BOSS_SCALE);
        view.attach('Skeleton_Axe', 'handslot.r');
        view.attach('Skeleton_Shield_Small_A', 'handslot.l');
      } else if (u.kind === 'add') view.attach('Skeleton_Blade', 'handslot.r');
      else if (u.kind === 'tank') view.equipKnight('knight:1H_Sword', true);
      else if (u.kind === 'melee') view.showOnly(['2H_Axe', 'Barbarian_Hat'], ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug', 'Barbarian_Hat']);
      else if (u.kind === 'ranged') view.showOnly(['1H_Crossbow'], ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable']);
      else view.showOnly(['2H_Staff', 'Mage_Hat'], ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat']);
      view.root.position.set(u.x, 0, u.z);
      this.scene.add(view.root);
      entry = {view, serial: -1};
      this.views.set(u.id, entry);
    }
    return entry.view;
  }

  private sector(radius: number, halfArc: number): BufferGeometry {
    const key = `${radius}|${halfArc}`;
    let g = this.sectorCache.get(key);
    if (!g) {
      // After rotateX(-90°) angle t maps to (cos t, 0, -sin t); center the wedge on +z (t = -90°).
      g = new CircleGeometry(radius, 32, -Math.PI / 2 - halfArc, halfArc * 2).rotateX(-Math.PI / 2);
      this.sectorCache.set(key, g);
    }
    return g;
  }

  private addHazard(h: Hazard): void {
    const color = HAZARD_COLOR[h.name] ?? 0xff4020;
    const mat = (opacity: number): MeshBasicMaterial => new MeshBasicMaterial({color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: DoubleSide});
    const shape = h.shape === 'cone' ? this.sector(h.radius, h.halfArc) : new CircleGeometry(h.radius, 40).rotateX(-Math.PI / 2);
    const edge = new Mesh(shape, mat(0.18));
    const fill = new Mesh(shape, mat(0.45));
    for (const m of [edge, fill]) {
      m.position.set(h.x, 0.08, h.z);
      // Sector geometry opens along +z after rotation; turn it to the cone's facing.
      if (h.shape === 'cone') m.rotation.y = h.angle;
      this.scene.add(m);
    }
    this.hazards.set(h.id, {fill, edge});
  }

  onEvent(raid: BossRaid, ev: RaidEvent): void {
    const fx = this.fx;
    switch (ev.type) {
      case 'hazard':
        this.addHazard(ev.hazard);
        break;
      case 'hazardEnd': {
        const hv = this.hazards.get(ev.id);
        if (hv) {
          this.scene.remove(hv.fill, hv.edge);
          this.hazards.delete(ev.id);
        }
        fx.ring(ev.x, ev.z, 0xffa040, ev.radius, 0.4);
        fx.burst({x: ev.x, y: 0.3, z: ev.z, count: 30, color: 0xffb060, color2: 0xff4020, speed: [2, ev.radius * 2], up: [1, 5], life: [0.3, 0.7], size: [0.08, 0.2], gravity: 8});
        break;
      }
      case 'hit': {
        const target = raid.unit(ev.target);
        const big = ev.kind === 'boss' || ev.crit;
        fx.impactFlash(ev.x, ev.z, big);
        fx.burst({
          x: ev.x,
          y: 1.2,
          z: ev.z,
          count: big ? 18 : 8,
          color: target?.team === 'enemy' ? 0xe9e1cc : 0xff4040,
          color2: 0xffffff,
          speed: [2, 8],
          up: [1, 5],
          life: [0.2, 0.5],
          size: [0.05, 0.12],
          gravity: 14,
        });
        const cls = target?.team === 'party' ? 'hurt' : ev.crit ? 'crit' : 'dmg';
        fx.text(ev.x, target?.kind === 'boss' ? 4.6 : 2.3, ev.z, String(ev.amount), cls, 0.7);
        // The boss is hit constantly; a faint flash keeps it readable instead of a white blob.
        this.views.get(ev.target)?.view.flash(target?.team === 'party' ? 0xff2020 : 0xffffff, target?.kind === 'boss' ? 0.25 : 1);
        break;
      }
      case 'heal':
        fx.text(ev.x, 2.4, ev.z, `+${ev.amount}`, 'heal', 0.8);
        fx.burst({x: ev.x, y: 0.4, z: ev.z, count: 12, color: 0x6dff9a, color2: 0xd0ffe0, speed: [0.2, 1], up: [2, 4], life: [0.5, 0.9], size: [0.05, 0.1], drag: 1});
        break;
      case 'shot': {
        const a = raid.unit(ev.from);
        const b = raid.unit(ev.to);
        if (!a || !b) break;
        const color = ev.kind === 'heal' ? 0x6dff9a : ev.kind === 'bolt' ? 0xb080ff : 0xffd080;
        // A short trail of sparks from shooter to target reads as the projectile.
        for (let i = 1; i <= 6; i++) {
          const t = i / 6;
          fx.burst({x: a.x + (b.x - a.x) * t, y: 1.3, z: a.z + (b.z - a.z) * t, count: 1, color, speed: [0, 0.3], life: [0.08, 0.18], size: [0.1, 0.16]});
        }
        break;
      }
      case 'dodge': {
        const u = raid.unit(ev.unit);
        if (u) fx.burst({x: u.x, y: 0.15, z: u.z, count: 10, color: 0x8c7b64, speed: [1, 3], up: [0.5, 2], life: [0.3, 0.5], size: [0.1, 0.22], gravity: 2}, false);
        break;
      }
      case 'evade': {
        const u = raid.unit(ev.unit);
        if (u) fx.text(u.x, 2.6, u.z, '회피!', 'evade', 0.6);
        break;
      }
      case 'taunt': {
        const u = raid.unit(ev.unit);
        if (u) fx.ring(u.x, u.z, 0xff5040, 3, 0.4);
        break;
      }
      case 'death': {
        const u = raid.unit(ev.unit);
        if (u)
          fx.burst(
            {x: u.x, y: 1.2, z: u.z, count: 24, color: u.team === 'enemy' ? 0xe9e1cc : 0xb0161a, speed: [2, 7], up: [2, 6], life: [10, 20], size: [0.08, 0.18], gravity: 20},
            false,
          );
        break;
      }
      default:
        break;
    }
  }

  /** Syncs character transforms, animations and telegraph fills. */
  update(raid: BossRaid, dt: number): void {
    for (const u of raid.units) {
      const view = this.viewFor(u);
      const entry = this.views.get(u.id)!;
      view.root.position.set(u.x, 0, u.z);
      view.root.rotation.y = u.facing;
      if (entry.serial !== u.animSerial) {
        entry.serial = u.animSerial;
        const clip = clipFor(u);
        view.play(clip.name, {loop: clip.loop, restart: !clip.loop, speed: clip.speed ?? 1, clamp: u.anim === 'dead', fade: 0.1});
      }
      view.update(dt);
    }
    for (const h of raid.hazards) {
      const hv = this.hazards.get(h.id);
      if (!hv) continue;
      const k = 1 - h.timer / h.total;
      hv.fill.scale.setScalar(Math.max(0.02, k));
      for (const m of [hv.fill, hv.edge]) m.position.set(h.x, 0.08, h.z);
      (hv.edge.material as MeshBasicMaterial).opacity = 0.15 + 0.15 * Math.sin(raid.time * 18);
    }
    const me = raid.party.find(p => p.controlled);
    this.marker.visible = Boolean(me?.alive);
    if (me) this.marker.position.set(me.x, 0.07, me.z);
    const t = raid.unit(raid.boss.target);
    this.aggro.visible = Boolean(t?.alive && raid.boss.alive);
    if (t) this.aggro.position.set(t.x, 0.07, t.z);
    this.fx.update(dt, id => raid.unit(id) ?? null);
  }
}
