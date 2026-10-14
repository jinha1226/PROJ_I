import {BoxGeometry, BufferGeometry, Mesh, MeshStandardMaterial, type Scene} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Collects static boxes and bakes them into one mesh per color, so thousands of
 * blocks cost a handful of draw calls. Blocks cannot be moved after `finish()`.
 */
export class MergedBlockBuilder {
  private readonly pending = new Map<number, BufferGeometry[]>();
  private readonly meshes: Mesh[] = [];
  private readonly materials: MeshStandardMaterial[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly roughness = 0.95,
  ) {}

  add(w: number, h: number, d: number, x: number, y: number, z: number, color: number): void {
    const box = new BoxGeometry(w, h, d).translate(x, y, z);
    const group = this.pending.get(color);
    if (group) group.push(box);
    else this.pending.set(color, [box]);
  }

  /** Merges everything added so far and adds the meshes to the scene. */
  finish(): void {
    for (const [color, boxes] of this.pending) {
      const merged = mergeGeometries(boxes, false);
      for (const box of boxes) box.dispose();
      if (!merged) continue;
      const material = new MeshStandardMaterial({color, roughness: this.roughness});
      const mesh = new Mesh(merged, material);
      this.scene.add(mesh);
      this.meshes.push(mesh);
      this.materials.push(material);
    }
    this.pending.clear();
  }

  get meshCount(): number {
    return this.meshes.length;
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const material of this.materials) material.dispose();
    this.meshes.length = 0;
    this.materials.length = 0;
    this.pending.clear();
  }
}
