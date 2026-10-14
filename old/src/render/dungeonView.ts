import {Vector3, type Scene} from 'three';
import {TILE_SIZE} from '../config';
import {chamberIndexAt} from '../dungeon/fog';
import {isOpen, type Dungeon} from '../dungeon/types';
import {MergedBlockBuilder} from './mergedBlocks';
import {TorchPool} from './torchPool';

const COLORS = {floor: 0x565451, alt: 0x66615a, wall: 0x41434a, trim: 0x77736b, wood: 0x58402e} as const;
const CRATE_HASH_MODULUS = 37;
const CRATE_CLEARANCE = 2;

/** Walls on each open tile's closed sides: [dx, dy]. */
const WALL_SIDES: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/**
 * Static dungeon geometry: layered stone floors, masonry perimeter, corner
 * columns, torches and sparse crates. Fog of war is drawn on the map, not here,
 * so the geometry is built once and never changes.
 */
export class DungeonView {
  private blocks: MergedBlockBuilder | null = null;
  private torches: TorchPool | null = null;

  constructor(private readonly scene: Scene) {}

  get built(): boolean {
    return this.blocks !== null;
  }

  build(dungeon: Dungeon): void {
    this.dispose();
    const blocks = (this.blocks = new MergedBlockBuilder(this.scene));
    const torchSites: Vector3[] = [];
    const T = TILE_SIZE;
    const wx = (x: number): number => (x - dungeon.width / 2) * T;
    const wz = (y: number): number => (y - dungeon.height / 2) * T;
    const open = (x: number, y: number): boolean => isOpen(dungeon, x, y);

    dungeon.chambers.forEach(([rx, ry, rw, rh]) => {
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          if (!open(x, y)) continue;
          const alt = (x + y) % 5 === 0;
          blocks.add(T, 0.28, T, wx(x), -0.18, wz(y), alt ? COLORS.alt : COLORS.floor);
          blocks.add(T - 0.08, 0.035, T - 0.08, wx(x), -0.02, wz(y), alt ? COLORS.floor : COLORS.alt);
        }
      }
      const corners: [number, number][] = [[rx, ry], [rx + rw - 1, ry], [rx, ry + rh - 1], [rx + rw - 1, ry + rh - 1]];
      for (const [x, y] of corners) {
        if (!open(x, y)) continue;
        blocks.add(0.68, 2.65, 0.68, wx(x), 1.33, wz(y), COLORS.trim);
        blocks.add(0.85, 0.22, 0.85, wx(x), 2.7, wz(y), COLORS.alt);
      }
      const torchTiles: [number, number][] = [[rx + 1, ry], [rx + rw - 2, ry + rh - 1]];
      for (const [x, y] of torchTiles) {
        if (!open(x, y)) continue;
        blocks.add(0.15, 1.05, 0.15, wx(x), 0.55, wz(y), COLORS.wood);
        torchSites.push(new Vector3(wx(x), 1.6, wz(y)));
      }
    });

    // Corridors share the room floor; walls sit only on real solid/open boundaries.
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        if (!open(x, y)) continue;
        const px = wx(x);
        const pz = wz(y);
        const inRoom = chamberIndexAt(dungeon, x, y) >= 0;
        if (!inRoom) {
          blocks.add(T, 0.28, T, px, -0.18, pz, COLORS.floor);
          blocks.add(T - 0.1, 0.035, T - 0.1, px, -0.02, pz, COLORS.alt);
        }
        for (const [dx, dy] of WALL_SIDES) {
          if (open(x + dx, y + dy)) continue;
          const bx = px + dx * T * 0.5;
          const bz = pz + dy * T * 0.5;
          blocks.add(dx ? 0.38 : T, 2.6, dy ? 0.38 : T, bx, 1.3, bz, COLORS.wall);
          blocks.add(dx ? 0.48 : T, 0.42, dy ? 0.48 : T, bx, 2.68, bz, COLORS.trim);
        }
        const hash = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0;
        const nearCenter = dungeon.centers.some(([cx, cy]) => Math.abs(cx - x) <= CRATE_CLEARANCE && Math.abs(cy - y) <= CRATE_CLEARANCE);
        if (inRoom && hash % CRATE_HASH_MODULUS === 0 && !nearCenter) blocks.add(0.6, 0.65, 0.6, px + 0.28, 0.3, pz + 0.25, COLORS.wood);
      }
    }
    blocks.finish();
    this.torches = new TorchPool(this.scene, torchSites);
  }

  /** Keeps the few real lights on the torches closest to `focus`. */
  updateLighting(focus: Vector3): void {
    this.torches?.update(focus);
  }

  dispose(): void {
    this.blocks?.dispose();
    this.blocks = null;
    this.torches?.dispose();
    this.torches = null;
  }
}
