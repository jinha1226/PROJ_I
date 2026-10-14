import {AdditiveBlending, BoxGeometry, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3, type Scene} from 'three';

export interface EmitOptions {
  x: number;
  y: number;
  z: number;
  count: number;
  color: number;
  /** Optional second color; each particle lerps randomly between the two. */
  color2?: number;
  speed: [number, number];
  /** Main direction (normalized x/z); omitted = all around. */
  dir?: {x: number; z: number};
  spread?: number;
  up?: [number, number];
  life: [number, number];
  size: [number, number];
  gravity?: number;
  drag?: number;
}

const GROUND = 0.03;
/** Particles shrink away only during this last share of their life (litter stays full size). */
const FADE_SHARE = 0.3;

const HIDDEN = new Matrix4().makeScale(0, 0, 0);

/**
 * A fixed-size pool of tiny boxes drawn as one InstancedMesh. Emitting never
 * allocates or adds objects to the scene, so bursts cannot cause frame spikes.
 */
export class ParticlePool {
  private readonly mesh: InstancedMesh;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly size: Float32Array;
  private readonly grav: Float32Array;
  private readonly drag: Float32Array;
  /** Tumble angle; only advances while airborne, so litter rests flat. */
  private readonly spin: Float32Array;
  private cursor = 0;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();
  private readonly s = new Vector3();
  private readonly c = new Color();
  private readonly c2 = new Color();
  private readonly mix = new Color();

  constructor(
    scene: Scene,
    private readonly capacity: number,
    additive: boolean,
  ) {
    const material = new MeshBasicMaterial({color: 0xffffff, transparent: additive, depthWrite: !additive, toneMapped: !additive});
    if (additive) material.blending = AdditiveBlending;
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), material, capacity);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < capacity; i++) {
      this.mesh.setMatrixAt(i, HIDDEN);
      this.mesh.setColorAt(i, this.c.set(0xffffff));
    }
    scene.add(this.mesh);
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.spin = new Float32Array(capacity);
  }

  emit(o: EmitOptions): void {
    const rand = (r: [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);
    this.c.set(o.color);
    this.c2.set(o.color2 ?? o.color);
    for (let n = 0; n < o.count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
      const base = o.dir ? Math.atan2(o.dir.x, o.dir.z) : Math.random() * Math.PI * 2;
      const a = base + (o.dir ? (Math.random() - 0.5) * (o.spread ?? 1) : 0);
      const sp = rand(o.speed);
      this.pos.set([o.x, o.y, o.z], i * 3);
      this.vel.set([Math.sin(a) * sp, rand(o.up ?? [0, 0]), Math.cos(a) * sp], i * 3);
      this.maxLife[i] = this.life[i] = rand(o.life);
      this.size[i] = rand(o.size);
      this.grav[i] = o.gravity ?? 0;
      this.drag[i] = o.drag ?? 2;
      this.spin[i] = Math.random() * 6;
      this.mesh.setColorAt(i, this.mix.lerpColors(this.c, this.c2, Math.random()));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;
      dirty = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.mesh.setMatrixAt(i, HIDDEN);
        continue;
      }
      const k = Math.exp(-this.drag[i] * dt);
      const j = i * 3;
      this.vel[j] *= k;
      this.vel[j + 2] *= k;
      this.vel[j + 1] -= this.grav[i] * dt;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      const airborne = this.pos[j + 1] > GROUND + 0.01;
      if (!airborne && this.grav[i] > 0) {
        // Hit the floor: small bounce, heavy friction, then rest.
        this.pos[j + 1] = GROUND;
        this.vel[j + 1] = Math.abs(this.vel[j + 1]) > 1.5 ? -this.vel[j + 1] * 0.25 : 0;
        this.vel[j] *= 0.6;
        this.vel[j + 2] *= 0.6;
      } else if (!airborne) {
        this.pos[j + 1] = GROUND;
      } else {
        this.spin[i] += dt * 9;
      }
      const t = this.life[i] / this.maxLife[i];
      const sz = this.size[i] * Math.min(1, 0.15 + t / FADE_SHARE);
      this.q.setFromAxisAngle(this.v.set(0.3, 1, 0.2).normalize(), this.spin[i] + i);
      this.m.compose(this.v.set(this.pos[j], this.pos[j + 1], this.pos[j + 2]), this.q, this.s.set(sz, sz, sz));
      this.mesh.setMatrixAt(i, this.m);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
