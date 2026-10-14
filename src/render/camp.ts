import {
  AdditiveBlending,
  Box3,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  RingGeometry,
  Scene,
  Vector2,
  Vector3,
  type Object3D,
} from 'three';
import {Rng} from '../core/rng';
import {BUILDINGS, isBuilt, nodesOf, type BuildingId, type Levels} from '../meta/upgrades';
import type {AssetLibrary} from './assets';
import {CharacterView} from './character';
import {buildMerc, type MercView} from './mercLook';
import type {Mercenary} from '../meta/guild';
import {ParticlePool} from './particles';

const HEX_W = 2;
const HEX_ROW = Math.sqrt(3);
const CAMP_RADIUS = 7;
/** Hex cells (col, row) for each facility around the campfire at (0, 0). */
const SLOTS: Readonly<Record<BuildingId, readonly [number, number]>> = {
  tent: [-1, 1],
  blacksmith: [-3, -2],
  tavern: [0, -3],
  alchemist: [3, -2],
  market: [3, 2],
  command: [-1, -4],
  barracks: [-4, 2],
};
const BUILDING_SCALE = 1.7;
const SITE_SCALE = 1.05;
const DECOR = ['barrel', 'crate_A_big', 'sack', 'resource_lumber', 'crate_open', 'flag_red'] as const;
const CAMERA_OFFSET = new Vector3(0, 17, 15.5);

const cellToWorld = (col: number, row: number): {x: number; z: number} => ({x: col * HEX_W + (Math.abs(row) % 2 ? HEX_W / 2 : 0), z: row * HEX_ROW});

interface Slot {
  id: BuildingId;
  group: Group;
  x: number;
  z: number;
  key: string;
  /** Label height: just above whatever currently stands on the slot. */
  top: number;
}

/** The hideout as a small 3D camp; every facility is a clickable building. */
export class CampView {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(36, 1, 0.5, 120);
  private readonly slots: Slot[] = [];
  private readonly ray = new Raycaster();
  private readonly ring: Mesh;
  private readonly knight: CharacterView;
  private readonly mercViews = new Map<number, MercView>();
  private readonly embers: ParticlePool;
  private readonly fire: PointLight;
  private hovered: BuildingId | null = null;
  private time = 0;

  constructor(private readonly assets: AssetLibrary) {
    this.scene.background = new Color(0x1a1f2e);
    this.scene.fog = new Fog(0x1a1f2e, 28, 55);
    this.scene.add(new HemisphereLight(0xc4d6ff, 0x30342a, 1.1));
    const sun = new DirectionalLight(0xfff4e6, 1.25);
    sun.position.set(-8, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    Object.assign(sun.shadow.camera, {left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 50});
    this.scene.add(sun);
    this.fire = new PointLight(0xff8a3c, 18, 9, 1.6);
    this.fire.position.set(0, 1.2, 0);
    this.scene.add(this.fire);

    this.buildGround();
    for (const def of BUILDINGS) {
      const [col, row] = SLOTS[def.id];
      const {x, z} = cellToWorld(col, row);
      const group = new Group();
      group.position.set(x, 0, z);
      group.userData.buildingId = def.id;
      this.scene.add(group);
      this.slots.push({id: def.id, group, x, z, key: '', top: 2});
    }

    this.ring = new Mesh(new RingGeometry(1.15, 1.35, 6), new MeshBasicMaterial({color: 0xf0c35a, transparent: true, opacity: 0.8, side: DoubleSide, blending: AdditiveBlending, depthWrite: false}));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.rotation.z = Math.PI / 6;
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.knight = new CharacterView(assets, 'Knight');
    this.knight.equipKnight('knight:1H_Sword', false);
    this.knight.root.scale.setScalar(0.42);
    this.knight.root.position.set(0.9, 0, 0.9);
    this.knight.root.rotation.y = -2.3;
    this.knight.play('Sit_Floor_Idle');
    this.scene.add(this.knight.root);

    // Campfire: stones, logs, embers.
    const stone = assets.hex.get('rock_single_C');
    for (let i = 0; i < 6 && stone; i++) {
      const a = (i / 6) * Math.PI * 2;
      const s = stone.clone();
      s.scale.setScalar(0.18);
      s.position.set(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
      this.scene.add(s);
    }
    const logs = assets.hex.get('resource_lumber');
    if (logs) {
      const l = logs.clone();
      l.scale.setScalar(0.35);
      this.scene.add(l);
    }
    this.embers = new ParticlePool(this.scene, 160, true);
  }

  private place(name: string, x: number, z: number, rot = 0, scale = 1, parent: Object3D = this.scene): Object3D | null {
    const template = this.assets.hex.get(name);
    if (!template) return null;
    const obj = template.clone();
    obj.position.set(x, 0, z);
    obj.rotation.y = rot;
    obj.scale.setScalar(scale);
    obj.traverse(n => {
      const m = n as Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    parent.add(obj);
    return obj;
  }

  private buildGround(): void {
    const rng = new Rng(7);
    const used = new Set(Object.values(SLOTS).map(([c, r]) => `${c},${r}`));
    for (let row = -CAMP_RADIUS; row <= CAMP_RADIUS; row++) {
      for (let col = -CAMP_RADIUS; col <= CAMP_RADIUS; col++) {
        const {x, z} = cellToWorld(col, row);
        const d = Math.hypot(x, z * 1.1);
        if (d > CAMP_RADIUS * HEX_W) continue;
        this.place('hex_grass', x, z);
        if (used.has(`${col},${row}`) || (col === 0 && row === 0)) continue;
        // Dense forest ring at the edge, scattered props inside.
        if (d > CAMP_RADIUS * HEX_W - 3.2) {
          const piece = rng.pick(['trees_B_large', 'trees_A_medium', 'hills_A_trees', 'trees_A_medium', 'mountain_A_grass_trees']);
          this.place(piece, x, z, rng.pick([0, 1, 2, 3, 4, 5]) * (Math.PI / 3), piece.startsWith('mountain') ? 1.1 : 1);
        } else if (d > 8 && rng.chance(0.35)) {
          this.place(rng.pick(['tree_single_A', 'trees_A_small', 'rock_single_A', 'fence_wood_straight', 'building_home_A_red', 'building_well_red']), x, z, rng.range(0, Math.PI * 2), 1);
        }
      }
    }
  }

  /** Rebuilds a building's model when its build state or level changes. */
  sync(levels: Levels): void {
    for (const slot of this.slots) {
      const built = isBuilt(levels, slot.id);
      const total = nodesOf(slot.id).reduce((s, n) => s + (levels[n.id] ?? 0), 0);
      const key = `${built}|${Math.min(6, total)}`;
      if (key === slot.key) continue;
      slot.key = key;
      slot.group.clear();
      const def = BUILDINGS.find(b => b.id === slot.id)!;
      if (!built) {
        this.place('building_scaffolding', 0, 0, 0, SITE_SCALE, slot.group);
        slot.top = new Box3().setFromObject(slot.group).max.y + 0.3;
        continue;
      }
      const scale = slot.id === 'tent' ? 2.2 : slot.id === 'command' ? 1.15 : BUILDING_SCALE;
      this.place(def.model, 0, 0, Math.PI / 6, scale, slot.group);
      // Upgrades show up as a growing pile of goods around the building.
      const decor = Math.min(6, total - 1);
      for (let i = 0; i < decor; i++) {
        const a = Math.PI * 0.75 + i * 0.75;
        this.place(DECOR[i % DECOR.length], Math.cos(a) * 1.5, Math.sin(a) * 1.5, a, DECOR[i % DECOR.length] === 'flag_red' ? 2.5 : 0.9, slot.group);
      }
      slot.top = new Box3().setFromObject(slot.group).max.y + 0.3;
    }
  }

  /** Displays the current guild roster around the campfire. */
  syncMercenaries(mercs: readonly Mercenary[]): void {
    const keep = new Set(mercs.map(m => m.id));
    for (const [id, view] of this.mercViews) {
      if (keep.has(id)) continue;
      view.root.removeFromParent();
      this.mercViews.delete(id);
    }
    for (const merc of mercs) {
      let view = this.mercViews.get(merc.id);
      if (!view) {
        view = buildMerc(this.assets, merc.look);
        view.root.scale.setScalar(0.31);
        const idle = [...view.actions.keys()].find(name => name.toLowerCase().includes('idle'));
        if (idle) view.play(idle);
        this.scene.add(view.root);
        this.mercViews.set(merc.id, view);
      }
      const col = (merc.id - 1) % 4;
      const row = Math.floor((merc.id - 1) / 4);
      view.root.position.set(-2.1 + col * 1.35, 0, 2.2 + row * 1.25);
      view.root.rotation.y = Math.PI + (col % 2) * 0.25;
    }
  }

  /** Building under a canvas-relative pointer position, if any. */
  pick(ndcX: number, ndcY: number): BuildingId | null {
    this.ray.setFromCamera(new Vector2(ndcX, ndcY), this.camera);
    const hits = this.ray.intersectObjects(this.slots.map(s => s.group), true);
    for (const h of hits) {
      let o: Object3D | null = h.object;
      while (o && o.userData.buildingId === undefined) o = o.parent;
      if (o) return o.userData.buildingId as BuildingId;
    }
    return null;
  }

  setHovered(id: BuildingId | null): void {
    this.hovered = id;
    const slot = this.slots.find(s => s.id === id);
    this.ring.visible = Boolean(slot);
    if (slot) this.ring.position.set(slot.x, 0.06, slot.z);
  }

  /** World anchor for a building's floating label. */
  labelAnchor(id: BuildingId): Vector3 {
    const slot = this.slots.find(s => s.id === id)!;
    // Tall buildings (the castle) would push their label off the top of the screen.
    return new Vector3(slot.x, Math.min(slot.top, 3.2), slot.z);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    this.time += dt;
    const portrait = this.camera.aspect < 1;
    const zoom = portrait ? 1.6 : 1;
    const sway = Math.sin(this.time * 0.15) * 0.8;
    this.camera.position.set(CAMERA_OFFSET.x * zoom + sway, CAMERA_OFFSET.y * zoom, CAMERA_OFFSET.z * zoom);
    this.camera.lookAt(0, 0, -0.8);
    this.knight.update(dt);
    for (const view of this.mercViews.values()) view.mixer.update(dt);
    this.fire.intensity = 16 + 4 * Math.sin(this.time * 11) * Math.sin(this.time * 6.7);
    if (Math.random() < 0.6) {
      this.embers.emit({x: (Math.random() - 0.5) * 0.4, y: 0.25, z: (Math.random() - 0.5) * 0.4, count: 1, color: 0xff7a2a, color2: 0xffd27a, speed: [0, 0.2], up: [0.8, 1.8], life: [0.6, 1.3], size: [0.05, 0.11], drag: 0.5});
    }
    this.embers.update(dt);
    (this.ring.material as MeshBasicMaterial).opacity = this.hovered ? 0.55 + 0.3 * Math.sin(this.time * 6) : 0;
  }
}
