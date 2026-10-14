import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  RingGeometry,
  type Object3D,
  type Scene,
  Vector3,
} from 'three';
import {TILE} from '../config';
import type {Vec2} from '../core/math';
import type {ContainerType} from '../items/loot';
import type {Container, ExtractZone} from '../sim/types';
import {isFloor, tileCenter, type GameMap} from '../world/mapgen';
import {THEMES} from '../world/themes';
import type {AssetLibrary} from './assets';
import {composeMatrix, PieceBatch, placeClone, type InstanceTransform} from './instancer';

/** How much of a wall stays standing when it would hide the player. */
const CUT_HEIGHT = 0.1;
const CUT_RATE = 9;
const CUT_AHEAD = 0.6;
const CUT_DEPTH = 12;
const CUT_WIDTH = 16;
const COLUMN_SCALE = 0.25;

const CONTAINER_PIECE: Readonly<Record<ContainerType, string | null>> = {
  barrel: 'barrel_large',
  crate: 'box_large',
  chest: 'chest',
  gold_chest: 'chest_gold',
  trunk: 'trunk_large_A',
  weapon_rack: 'box_small',
  pile: 'coin_stack_small',
  warrior_corpse: null,
  mage_corpse: null,
  raider_corpse: null,
};
const CONTAINER_SCALE: Partial<Record<ContainerType, number>> = {barrel: 0.72, crate: 0.85, trunk: 0.9};

interface Cuttable {
  batch: PieceBatch;
  index: number;
  base: InstanceTransform;
  /** 'squash' keeps a stub (walls); 'hide' removes it (torches, banners). */
  mode: 'squash' | 'hide';
  current: number;
}

const DIRS: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function tileHash(x: number, y: number): number {
  return (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0;
}

/** Static dungeon geometry, container props, torch flames and extraction beacons. */
export class LevelView {
  readonly torchSites: Vector3[] = [];
  /** Parallel to torchSites: each torch's light color (its room theme). */
  readonly torchColors: number[] = [];
  /** Parallel to torchSites: the torch prop whose cutaway also hides its flame. */
  private readonly torchCuts: Cuttable[] = [];
  private readonly batches = new Map<string, PieceBatch>();
  private readonly cuttables: Cuttable[] = [];
  private readonly objects: Object3D[] = [];
  private readonly flames: InstancedMesh;
  private readonly highlight: Mesh;
  private readonly beacons: {ring: Mesh; inner: Mesh; beam: Mesh}[] = [];
  private readonly piles = new Map<number, Object3D>();
  private time = 0;
  private readonly tmp = new Matrix4();

  constructor(
    private readonly scene: Scene,
    private readonly assets: AssetLibrary,
    map: GameMap,
    containers: readonly Container[],
    zones: readonly ExtractZone[],
  ) {
    this.buildFloorsAndWalls(map);
    for (const p of map.props) {
      const cut = p.piece === 'pillar' || p.piece.startsWith('banner');
      const index = this.batch(p.piece).add({x: p.x, z: p.z, rot: p.rot, y: p.y});
      if (cut) this.cuttables.push({batch: this.batch(p.piece), index, base: {x: p.x, z: p.z, rot: p.rot}, mode: p.piece === 'pillar' ? 'squash' : 'hide', current: 1});
    }
    for (const t of map.torches) {
      const base = {x: t.x, y: t.y, z: t.z, rot: t.rot};
      const index = this.batch('torch_mounted').add(base);
      const cut: Cuttable = {batch: this.batch('torch_mounted'), index, base, mode: 'hide', current: 1};
      this.cuttables.push(cut);
      this.torchCuts.push(cut);
      this.torchSites.push(new Vector3(t.x + Math.sin(t.rot) * 0.5, (t.y ?? 2) + 0.8, t.z + Math.cos(t.rot) * 0.5));
      this.torchColors.push(t.color ?? 0xff8a3c);
    }
    for (const c of containers) this.addContainer(c);
    for (const batch of this.batches.values()) batch.build(scene);

    const flameMat = new MeshBasicMaterial({color: 0xffffff, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false});
    this.flames = new InstancedMesh(new OctahedronGeometry(0.16, 0), flameMat, Math.max(1, this.torchSites.length));
    this.flames.count = this.torchSites.length;
    this.torchColors.forEach((c, i) => this.flames.setColorAt(i, new Color(c).multiplyScalar(1.6)));
    scene.add(this.flames);

    const hlMat = new MeshBasicMaterial({color: 0xffd27a, transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false, side: DoubleSide});
    this.highlight = new Mesh(new RingGeometry(1.05, 1.25, 40), hlMat);
    this.highlight.rotation.x = -Math.PI / 2;
    this.highlight.visible = false;
    scene.add(this.highlight);

    for (const z of zones) this.addBeacon(z);
  }

  private batch(piece: string): PieceBatch {
    let b = this.batches.get(piece);
    if (!b) {
      const template = this.assets.pieces.get(piece);
      if (!template) throw new Error(`Missing dungeon piece ${piece}`);
      const isFloorPiece = piece.startsWith('floor');
      b = new PieceBatch(template, {cast: !isFloorPiece, receive: true});
      this.batches.set(piece, b);
    }
    return b;
  }

  private buildFloorsAndWalls(map: GameMap): void {
    // Room index + 1 per tile (0 = corridor), for themed floors and walls.
    const inRoom = new Int16Array(map.w * map.h);
    map.rooms.forEach((r, i) => {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) inRoom[y * map.w + x] = i + 1;
    });
    const vertices = new Set<string>();
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        if (!isFloor(map, x, y)) continue;
        const h = tileHash(x, y);
        const room = map.rooms[inRoom[y * map.w + x] - 1];
        const theme = room ? THEMES[room.theme] : null;
        const piece = !theme ? (h % 5 === 0 ? 'floor_dirt_large_rocky' : 'floor_dirt_large') : theme.floors[(h >>> 5) % theme.floors.length];
        this.batch(piece).add({x: tileCenter(x), z: tileCenter(y), rot: ((h >>> 3) % 4) * (Math.PI / 2)});
        for (const [dx, dy] of DIRS) {
          if (isFloor(map, x + dx, y + dy)) continue;
          const base = {x: tileCenter(x) + (dx * TILE) / 2, z: tileCenter(y) + (dy * TILE) / 2, rot: dx ? Math.PI / 2 : 0};
          // North walls of some themed rooms get a variant (bookshelves, cracks).
          const variant = theme?.northWall && dy === -1 && (h >>> 7) % 100 < theme.northWall.chance * 100 ? theme.northWall.piece : 'wall';
          this.addWall(base, variant);
          // Edge endpoints: columns there seal the gaps at corners.
          const ex = dx ? [[x + (dx > 0 ? 1 : 0), y], [x + (dx > 0 ? 1 : 0), y + 1]] : [[x, y + (dy > 0 ? 1 : 0)], [x + 1, y + (dy > 0 ? 1 : 0)]];
          for (const [vx, vy] of ex) vertices.add(`${vx},${vy}`);
        }
      }
    }
    for (const key of vertices) {
      const [vx, vy] = key.split(',').map(Number);
      this.addWall({x: vx * TILE, z: vy * TILE, rot: 0, scaleX: COLUMN_SCALE});
    }
  }

  private addWall(base: InstanceTransform, piece = 'wall'): void {
    const batch = this.batch(piece);
    this.cuttables.push({batch, index: batch.add(base), base, mode: 'squash', current: 1});
  }

  private addContainer(c: Container): void {
    const piece = CONTAINER_PIECE[c.type];
    if (!piece) return;
    if (c.type === 'pile') {
      const obj = placeClone(this.assets.pieces.get(piece)!, {x: c.x, z: c.z, rot: c.rot});
      this.scene.add(obj);
      this.piles.set(c.id, obj);
      return;
    }
    this.batch(piece).add({x: c.x, z: c.z, rot: c.rot, scale: CONTAINER_SCALE[c.type]});
    if (c.type === 'weapon_rack') {
      // A sword-and-shield plaque on the wall behind the crate.
      const back = 0.75;
      this.batch('sword_shield').add({x: c.x - Math.sin(c.rot) * back, y: 1.9, z: c.z - Math.cos(c.rot) * back, rot: c.rot});
    }
  }

  /** Piles appear mid-raid when the player drops items. */
  syncPiles(containers: readonly Container[]): void {
    for (const c of containers) if (c.type === 'pile' && !this.piles.has(c.id)) this.addContainer(c);
  }

  private addBeacon(z: ExtractZone): void {
    const green = new Color(0.35, 1.4, 0.65);
    const ringMat = new MeshBasicMaterial({color: green, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false});
    const ring = new Mesh(new RingGeometry(2.35, 2.6, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(z.x, 0.08, z.z);
    const inner = new Mesh(new RingGeometry(1.4, 1.7, 6, 1), ringMat.clone());
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(z.x, 0.09, z.z);
    const beamGeo = new CylinderGeometry(2.4, 2.4, 7, 32, 1, true);
    // Fade the beam out toward the top through vertex alpha in the color.
    const pos = beamGeo.getAttribute('position');
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) > 0 ? 0 : 1;
      colors.push(green.r * t * 0.35, green.g * t * 0.35, green.b * t * 0.35);
    }
    beamGeo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const beam = new Mesh(beamGeo, new MeshBasicMaterial({vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false}));
    beam.position.set(z.x, 3.5, z.z);
    this.scene.add(ring, inner, beam);
    this.objects.push(ring, inner, beam);
    this.beacons.push({ring, inner, beam});
  }

  update(dt: number, focus: Vec2, highlight: Vec2 | null, extractingZone: number | null): void {
    this.time += dt;
    const k = 1 - Math.exp(-CUT_RATE * dt);
    for (const c of this.cuttables) {
      const ahead = c.base.z - focus.z;
      const occludes = ahead > CUT_AHEAD && ahead < CUT_DEPTH && Math.abs(c.base.x - focus.x) < CUT_WIDTH;
      const target = occludes ? (c.mode === 'squash' ? CUT_HEIGHT : 0) : 1;
      if (Math.abs(c.current - target) < 0.002) continue;
      c.current += (target - c.current) * k;
      if (Math.abs(c.current - target) < 0.002) c.current = target;
      const scaleY = Math.max(0.0001, c.current) * (c.base.scaleY ?? 1);
      const visibleScale = c.mode === 'hide' ? Math.max(0.0001, c.current) : 1;
      c.batch.setTransform(c.index, composeMatrix({...c.base, scaleY, scale: visibleScale * (c.base.scale ?? 1)}, this.tmp));
    }

    this.torchSites.forEach((site, i) => {
      const visible = this.torchCuts[i].current;
      const flicker = 0.8 + 0.25 * Math.sin(this.time * 13 + i * 1.7) * Math.sin(this.time * 7.1 + i);
      this.flames.setMatrixAt(i, composeMatrix({x: site.x, y: site.y - 0.15, z: site.z, scale: flicker * visible, scaleY: 1.6, rot: this.time * 2}, this.tmp));
    });
    this.flames.instanceMatrix.needsUpdate = true;

    this.highlight.visible = Boolean(highlight);
    if (highlight) {
      this.highlight.position.set(highlight.x, 0.07, highlight.z);
      (this.highlight.material as MeshBasicMaterial).opacity = 0.45 + 0.25 * Math.sin(this.time * 6);
    }

    this.beacons.forEach((b, i) => {
      const active = extractingZone === i;
      b.inner.rotation.z = this.time * (active ? 3 : 0.8);
      b.ring.scale.setScalar(1 + 0.04 * Math.sin(this.time * 3 + i));
      (b.beam.material as MeshBasicMaterial).opacity = active ? 1 : 0.55 + 0.2 * Math.sin(this.time * 2 + i);
    });
  }

  dispose(): void {
    for (const batch of this.batches.values()) batch.dispose(this.scene);
    for (const o of [...this.objects, ...this.piles.values(), this.flames, this.highlight]) this.scene.remove(o);
    this.flames.dispose();
  }
}
