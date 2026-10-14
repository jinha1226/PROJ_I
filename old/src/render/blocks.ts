import {BoxGeometry, Mesh, MeshStandardMaterial, type Scene} from 'three';

/** Builds box meshes while sharing geometry and materials between identical blocks. */
export class BlockBuilder {
  private readonly geometries = new Map<string, BoxGeometry>();
  private readonly materials = new Map<number, MeshStandardMaterial>();
  readonly meshes: Mesh[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly roughness = 0.95,
    private readonly shadows = false,
  ) {}

  add(w: number, h: number, d: number, x: number, y: number, z: number, color: number): Mesh {
    const geoKey = `${w}|${h}|${d}`;
    let geometry = this.geometries.get(geoKey);
    if (!geometry) this.geometries.set(geoKey, (geometry = new BoxGeometry(w, h, d)));
    let material = this.materials.get(color);
    if (!material) this.materials.set(color, (material = new MeshStandardMaterial({color, roughness: this.roughness})));
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = this.shadows;
    mesh.receiveShadow = this.shadows;
    this.scene.add(mesh);
    this.meshes.push(mesh);
    return mesh;
  }

  dispose(): void {
    for (const mesh of this.meshes) this.scene.remove(mesh);
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.meshes.length = 0;
    this.geometries.clear();
    this.materials.clear();
  }
}
