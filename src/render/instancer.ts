import {InstancedMesh, Matrix4, Object3D, Quaternion, Vector3, type Mesh, type Scene} from 'three';

interface Part {
  mesh: Mesh;
  local: Matrix4;
}

export interface InstanceTransform {
  x: number;
  y?: number;
  z: number;
  rot?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
}

const tmpPos = new Vector3();
const tmpQuat = new Quaternion();
const tmpScale = new Vector3();
const UP = new Vector3(0, 1, 0);

export function composeMatrix(t: InstanceTransform, out = new Matrix4()): Matrix4 {
  const s = t.scale ?? 1;
  tmpPos.set(t.x, t.y ?? 0, t.z);
  tmpQuat.setFromAxisAngle(UP, t.rot ?? 0);
  tmpScale.set((t.scaleX ?? 1) * s, (t.scaleY ?? 1) * s, (t.scaleZ ?? 1) * s);
  return out.compose(tmpPos, tmpQuat, tmpScale);
}

/**
 * Turns many placements of one multi-mesh GLB piece into one InstancedMesh per
 * sub-mesh. A whole dungeon of a few hundred tiles costs a few dozen draw calls.
 */
export class PieceBatch {
  private readonly parts: Part[] = [];
  private readonly transforms: Matrix4[] = [];
  private readonly meshes: InstancedMesh[] = [];

  constructor(
    template: Object3D,
    private readonly shadows: {cast: boolean; receive: boolean} = {cast: true, receive: true},
  ) {
    template.updateMatrixWorld(true);
    const rootInverse = template.matrixWorld.clone().invert();
    template.traverse(node => {
      const mesh = node as Mesh;
      if (mesh.isMesh) this.parts.push({mesh, local: rootInverse.clone().multiply(mesh.matrixWorld)});
    });
  }

  /** Returns the instance index (stable for `setTransform`). */
  add(t: InstanceTransform): number {
    this.transforms.push(composeMatrix(t));
    return this.transforms.length - 1;
  }

  get count(): number {
    return this.transforms.length;
  }

  build(scene: Scene): void {
    if (!this.transforms.length) return;
    const m = new Matrix4();
    for (const part of this.parts) {
      const inst = new InstancedMesh(part.mesh.geometry, part.mesh.material, this.transforms.length);
      inst.castShadow = this.shadows.cast;
      inst.receiveShadow = this.shadows.receive;
      this.transforms.forEach((t, i) => inst.setMatrixAt(i, m.multiplyMatrices(t, part.local)));
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      scene.add(inst);
      this.meshes.push(inst);
    }
  }

  setTransform(index: number, t: Matrix4): void {
    const m = new Matrix4();
    this.parts.forEach((part, i) => {
      const inst = this.meshes[i];
      inst.setMatrixAt(index, m.multiplyMatrices(t, part.local));
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  dispose(scene: Scene): void {
    for (const inst of this.meshes) {
      scene.remove(inst);
      inst.dispose();
    }
    this.meshes.length = 0;
  }
}

/** Plain clone helper for one-off props. */
export function placeClone(template: Object3D, t: InstanceTransform): Object3D {
  const obj = template.clone();
  obj.position.set(t.x, t.y ?? 0, t.z);
  obj.rotation.y = t.rot ?? 0;
  obj.scale.setScalar(t.scale ?? 1);
  return obj;
}
