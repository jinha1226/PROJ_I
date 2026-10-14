import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  type Scene,
  Vector3,
} from 'three';
import type {AttackStep, Projectile} from '../sim/types';
import {ParticlePool, type EmitOptions} from './particles';
import type {Stage} from './stage';

export interface ActorPose {
  x: number;
  z: number;
  facing: number;
}

type PoseLookup = (id: number) => ActorPose | null;

/** Flat ring sector in the XZ plane, brighter toward `bright` (0 = inner/trailing, 1 = outer/leading). */
function sectorGeometry(inner: number, outer: number, arc: number, gradient: 'sweep' | 'radial'): BufferGeometry {
  const segs = Math.max(8, Math.round((arc / Math.PI) * 24));
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const a = -arc / 2 + arc * t;
    for (const [r, radial] of [
      [inner, 0],
      [outer, 1],
    ] as const) {
      pos.push(Math.sin(a) * r, 0, Math.cos(a) * r);
      const k = gradient === 'sweep' ? t ** 2.2 * (0.35 + 0.65 * radial) : 0.25 + 0.75 * radial;
      col.push(k, k, k);
    }
    if (i < segs) {
      const b = i * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

const glowMaterial = (color: number, vertexColors = false): MeshBasicMaterial =>
  new MeshBasicMaterial({
    color: new Color(color),
    vertexColors,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });

interface Slash {
  mesh: Mesh;
  age: number;
  life: number;
  spin: number;
  owner: number;
}

interface Tracked {
  mesh: Mesh;
  owner: number;
  age: number;
  duration: number;
  /** After the wind-up resolves the decal flashes then fades. */
  released: number;
}

interface FlyingProjectile {
  mesh: Mesh;
  halo: Mesh | null;
  data: Projectile;
}

interface FloatText {
  el: HTMLDivElement;
  x: number;
  y: number;
  z: number;
  age: number;
  life: number;
  active: boolean;
}

const SLASH_POOL = 6;
const BEAM_POOL = 4;
const FLASH_POOL = 8;
const DECAL_CAPACITY = 96;
const DECAL_LIFE = 45;
const DECAL_POOL = 12;
const RING_POOL = 10;
const TEXT_POOL = 40;
const ORB_POOL = 4;
const PROJECTILE_POOL = 16;

/** Pooled combat effects: everything is created once and recycled. */
export class Fx {
  readonly sparks: ParticlePool;
  readonly debris: ParticlePool;
  private readonly slashes: Slash[] = [];
  private readonly slashGeometries = new Map<string, BufferGeometry>();
  private readonly decals: Tracked[] = [];
  private readonly decalGeometries = new Map<string, BufferGeometry>();
  private readonly aimLines: Tracked[] = [];
  private readonly orbs: Tracked[] = [];
  private readonly rings: Tracked[] = [];
  private readonly projectiles = new Map<number, FlyingProjectile>();
  private readonly projectilePool: {
    bolt: Mesh[];
    arrow: Mesh[];
    halo: Mesh[];
  } = {bolt: [], arrow: [], halo: []};
  private readonly texts: FloatText[] = [];
  private readonly beams: Tracked[] = [];
  private readonly flashes: Tracked[] = [];
  private readonly stains: InstancedMesh;
  private readonly stainAge = new Float32Array(DECAL_CAPACITY).fill(-1);
  private readonly stainBase: Matrix4[] = [];
  private stainCursor = 0;
  private readonly all: Mesh[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly stage: Stage,
    overlay: HTMLElement,
  ) {
    this.sparks = new ParticlePool(scene, 700, true);
    this.debris = new ParticlePool(scene, 900, false);
    for (let i = 0; i < SLASH_POOL; i++)
      this.slashes.push({
        mesh: this.add(new Mesh(sectorGeometry(1, 2, 1, 'sweep'), glowMaterial(0xffffff, true))),
        age: 1,
        life: 1,
        spin: 0,
        owner: -1,
      });
    for (let i = 0; i < DECAL_POOL; i++) this.decals.push(this.tracked(new Mesh(sectorGeometry(0.3, 1, 1, 'radial'), glowMaterial(0xff3020, true))));
    for (let i = 0; i < 3; i++) {
      const line = new Mesh(new PlaneGeometry(0.09, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), glowMaterial(0xff2a2a));
      this.aimLines.push(this.tracked(line));
    }
    for (let i = 0; i < ORB_POOL; i++) this.orbs.push(this.tracked(new Mesh(new IcosahedronGeometry(0.28, 1), glowMaterial(0xa070ff))));
    for (let i = 0; i < RING_POOL; i++) this.rings.push(this.tracked(new Mesh(new RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), glowMaterial(0xffffff))));
    for (let i = 0; i < PROJECTILE_POOL; i++) {
      this.projectilePool.bolt.push(this.add(new Mesh(new IcosahedronGeometry(0.3, 1), glowMaterial(0xc29bff))));
      this.projectilePool.arrow.push(this.add(new Mesh(new BoxGeometry(0.07, 0.07, 1.1), glowMaterial(0xffd080))));
      this.projectilePool.halo.push(this.add(new Mesh(new IcosahedronGeometry(0.6, 1), glowMaterial(0x6a3cff))));
    }
    for (let i = 0; i < BEAM_POOL; i++) {
      const geo = new CylinderGeometry(0.55, 0.9, 9, 20, 1, true).translate(0, 4.5, 0);
      const pos = geo.getAttribute('position');
      const col: number[] = [];
      for (let v = 0; v < pos.count; v++) {
        const k = pos.getY(v) > 4.5 ? 0 : 1;
        col.push(k, k, k);
      }
      geo.setAttribute('color', new Float32BufferAttribute(col, 3));
      this.beams.push(this.tracked(new Mesh(geo, glowMaterial(0xffffff, true))));
    }
    for (let i = 0; i < FLASH_POOL; i++) this.flashes.push(this.tracked(new Mesh(new IcosahedronGeometry(0.45, 1), glowMaterial(0xffffff))));
    // Floor stains (blood, bone dust) linger so fights leave a mark on the room.
    const stainMat = new MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
    this.stains = new InstancedMesh(new CircleGeometry(1, 14).rotateX(-Math.PI / 2), stainMat, DECAL_CAPACITY);
    this.stains.frustumCulled = false;
    const zero = new Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < DECAL_CAPACITY; i++) {
      this.stains.setMatrixAt(i, zero);
      this.stains.setColorAt(i, new Color(0x000000));
      this.stainBase.push(new Matrix4());
    }
    scene.add(this.stains);
    for (let i = 0; i < TEXT_POOL; i++) {
      const el = document.createElement('div');
      el.className = 'floatText';
      el.hidden = true;
      overlay.append(el);
      this.texts.push({el, x: 0, y: 0, z: 0, age: 0, life: 1, active: false});
    }
  }

  private add(mesh: Mesh): Mesh {
    mesh.visible = false;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.all.push(mesh);
    return mesh;
  }

  private tracked(mesh: Mesh): Tracked {
    return {
      mesh: this.add(mesh),
      owner: -1,
      age: 1,
      duration: 1,
      released: -1,
    };
  }

  /** Makes every pooled mesh visible for one shader compile pass. */
  withAllVisible(fn: () => void): void {
    const prev = this.all.map(m => m.visible);
    for (const m of this.all) m.visible = true;
    fn();
    this.all.forEach((m, i) => (m.visible = prev[i]));
  }

  // ---------- player swings ----------

  slash(owner: number, pose: ActorPose, step: AttackStep, reach: number, heavy: boolean): void {
    const slot = this.slashes.reduce((a, b) => (a.age / a.life > b.age / b.life ? a : b));
    const arc = Math.min(step.arc, Math.PI * 2);
    const key = `${arc.toFixed(2)}|${reach.toFixed(2)}`;
    let geo = this.slashGeometries.get(key);
    if (!geo) {
      geo = sectorGeometry(reach * 0.35, reach + 0.8, arc, 'sweep');
      this.slashGeometries.set(key, geo);
    }
    slot.mesh.geometry = geo;
    slot.mesh.position.set(pose.x, step.sweep === 'down' ? 0.5 : 1.0, pose.z);
    slot.mesh.rotation.set(0, pose.facing, 0);
    slot.mesh.scale.set(step.sweep === 'left' ? -1 : 1, 1, 1);
    // Over-bright (glows skip tone mapping) so the arc pops against the dark floor.
    (slot.mesh.material as MeshBasicMaterial).color.set(heavy ? 0xffc070 : 0xe8f4ff).multiplyScalar(heavy ? 2.4 : 1.8);
    slot.mesh.visible = true;
    slot.age = 0;
    slot.life = heavy ? 0.3 : 0.22;
    slot.spin = step.sweep === 'spin' ? 9 : 0;
    slot.owner = owner;
  }

  // ---------- telegraphs ----------

  windup(owner: number, duration: number, reach: number, arc: number): void {
    const d = this.free(this.decals);
    const key = `${arc.toFixed(2)}|${reach.toFixed(2)}`;
    let geo = this.decalGeometries.get(key);
    if (!geo) {
      geo = sectorGeometry(0.4, reach + 0.4, arc, 'radial');
      this.decalGeometries.set(key, geo);
    }
    d.mesh.geometry = geo;
    this.arm(d, owner, duration);
  }

  /** The wind-up resolved: flash the decal and let it fade. */
  release(owner: number): void {
    for (const d of [...this.decals, ...this.aimLines, ...this.orbs]) {
      if (d.owner === owner && d.released < 0 && d.mesh.visible) d.released = 0;
    }
  }

  aim(owner: number, duration: number): void {
    this.arm(this.free(this.aimLines), owner, duration);
  }

  cast(owner: number, duration: number): void {
    this.arm(this.free(this.orbs), owner, duration);
  }

  ring(x: number, z: number, color: number, radius: number, duration = 0.35): void {
    const r = this.free(this.rings);
    (r.mesh.material as MeshBasicMaterial).color.set(color);
    r.mesh.position.set(x, 0.12, z);
    r.mesh.userData.radius = radius;
    this.arm(r, -1, duration);
    r.released = 0;
  }

  private free(pool: Tracked[]): Tracked {
    return pool.find(t => !t.mesh.visible) ?? pool.reduce((a, b) => (a.age > b.age ? a : b));
  }

  private arm(t: Tracked, owner: number, duration: number): void {
    t.owner = owner;
    t.age = 0;
    t.duration = duration;
    t.released = -1;
    t.mesh.visible = true;
  }

  // ---------- projectiles ----------

  projectile(p: Projectile): void {
    const mesh = this.projectilePool[p.kind].pop();
    if (!mesh) return;
    const halo = p.kind === 'bolt' ? (this.projectilePool.halo.pop() ?? null) : null;
    mesh.visible = true;
    if (halo) halo.visible = true;
    this.projectiles.set(p.id, {mesh, halo, data: p});
  }

  projectileEnd(id: number, x: number, z: number, kind: Projectile['kind']): void {
    const fp = this.projectiles.get(id);
    if (fp) {
      fp.mesh.visible = false;
      this.projectilePool[kind].push(fp.mesh);
      if (fp.halo) {
        fp.halo.visible = false;
        this.projectilePool.halo.push(fp.halo);
      }
      this.projectiles.delete(id);
    }
    const color = kind === 'bolt' ? 0xb080ff : 0xffd080;
    this.sparks.emit({
      x,
      y: 1.1,
      z,
      count: kind === 'bolt' ? 18 : 8,
      color,
      color2: 0xffffff,
      speed: [2, 6],
      up: [0, 4],
      life: [0.2, 0.45],
      size: [0.06, 0.14],
      gravity: 9,
    });
    if (kind === 'bolt') this.ring(x, z, 0x9a6bff, 1.6, 0.3);
  }

  // ---------- loot & impacts ----------

  /** A rarity-colored light pillar over a container when something good is revealed. */
  lootBeam(x: number, z: number, color: number, strength: number): void {
    const b = this.free(this.beams);
    (b.mesh.material as MeshBasicMaterial).color.set(color).multiplyScalar(1.2 + strength);
    b.mesh.position.set(x, 0, z);
    this.arm(b, -1, 2.2 + strength);
    b.released = 0;
    this.ring(x, z, color, 2.5 + strength * 1.5, 0.6);
    this.sparks.emit({x, y: 0.6, z, count: 30 + Math.round(strength * 30), color, color2: 0xffffff, speed: [0.5, 3], up: [3, 8], life: [0.6, 1.4], size: [0.06, 0.14], gravity: 2, drag: 1.5});
  }

  /** Brief white flash at the point of impact. */
  impactFlash(x: number, z: number, heavy: boolean): void {
    const f = this.free(this.flashes);
    (f.mesh.material as MeshBasicMaterial).color.setScalar(heavy ? 3 : 2);
    f.mesh.position.set(x, 1.15, z);
    f.mesh.userData.size = heavy ? 1.8 : 1.2;
    this.arm(f, -1, heavy ? 0.12 : 0.08);
    f.released = 0;
  }

  /** A lingering floor stain (blood, bone dust). */
  stain(x: number, z: number, color: number, size: number): void {
    const i = this.stainCursor;
    this.stainCursor = (this.stainCursor + 1) % DECAL_CAPACITY;
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.random() * Math.PI);
    const pos = new Vector3(x + (Math.random() - 0.5) * 0.6, 0.045 + i * 0.0002, z + (Math.random() - 0.5) * 0.6);
    this.stainBase[i].compose(pos, q, new Vector3(size * (0.7 + Math.random() * 0.6), 1, size * (0.5 + Math.random() * 0.5)));
    this.stains.setMatrixAt(i, this.stainBase[i]);
    this.stains.setColorAt(i, new Color(color));
    this.stainAge[i] = 0;
    this.stains.instanceMatrix.needsUpdate = true;
    if (this.stains.instanceColor) this.stains.instanceColor.needsUpdate = true;
  }

  /** Faint drifting dust around a point, for atmosphere. Call every frame. */
  ambientDust(x: number, z: number, dt: number): void {
    if (Math.random() > dt * 18) return;
    this.sparks.emit({x: x + (Math.random() - 0.5) * 22, y: 0.4 + Math.random() * 3, z: z + (Math.random() - 0.5) * 18, count: 1, color: 0x6a5840, color2: 0x8a7a60, speed: [0.05, 0.25], up: [0.05, 0.25], life: [3, 6], size: [0.03, 0.06], drag: 0.2});
  }

  // ---------- particles ----------

  burst(o: EmitOptions, additive = true): void {
    (additive ? this.sparks : this.debris).emit(o);
  }

  // ---------- floating text ----------

  text(x: number, y: number, z: number, text: string, cls: string, life = 0.8): void {
    const t = this.texts.find(f => !f.active) ?? this.texts.reduce((a, b) => (a.age > b.age ? a : b));
    Object.assign(t, {
      x: x + (Math.random() - 0.5) * 0.6,
      y,
      z,
      age: 0,
      life,
      active: true,
    });
    t.el.textContent = text;
    t.el.className = `floatText ${cls}`;
    t.el.hidden = false;
  }

  // ---------- frame ----------

  update(dt: number, pose: PoseLookup): void {
    this.sparks.update(dt);
    this.debris.update(dt);

    for (const s of this.slashes) {
      if (!s.mesh.visible) continue;
      s.age += dt;
      const t = s.age / s.life;
      if (t >= 1) {
        s.mesh.visible = false;
        continue;
      }
      const p = s.owner >= 0 ? pose(s.owner) : null;
      if (p) s.mesh.position.set(p.x, s.mesh.position.y, p.z);
      s.mesh.rotation.y += s.spin * dt;
      const grow = 1 + t * 0.18;
      s.mesh.scale.set(Math.sign(s.mesh.scale.x) * grow, 1, grow);
      (s.mesh.material as MeshBasicMaterial).opacity = (1 - t) ** 1.5;
    }

    for (const d of this.decals) {
      if (!this.tickTracked(d, dt)) continue;
      const p = pose(d.owner);
      if (p && d.released < 0) {
        d.mesh.position.set(p.x, 0.1, p.z);
        d.mesh.rotation.y = p.facing;
      }
      const m = d.mesh.material as MeshBasicMaterial;
      m.opacity = d.released >= 0 ? 1.4 * (1 - d.released / 0.25) : 0.15 + 0.55 * Math.min(1, d.age / d.duration);
    }

    for (const a of this.aimLines) {
      if (!this.tickTracked(a, dt)) continue;
      const p = pose(a.owner);
      if (p && a.released < 0) {
        a.mesh.position.set(p.x, 1.2, p.z);
        a.mesh.rotation.y = p.facing;
      }
      a.mesh.scale.set(1, 1, 18);
      (a.mesh.material as MeshBasicMaterial).opacity = a.released >= 0 ? 1.5 * (1 - a.released / 0.25) : 0.25 + 0.75 * (a.age / a.duration) ** 2;
    }

    for (const o of this.orbs) {
      if (!this.tickTracked(o, dt)) continue;
      const p = pose(o.owner);
      if (p && o.released < 0) o.mesh.position.set(p.x + Math.sin(p.facing) * 0.7, 1.7, p.z + Math.cos(p.facing) * 0.7);
      const grow = o.released >= 0 ? 1.6 + o.released * 6 : 0.3 + 1.1 * Math.min(1, o.age / o.duration);
      o.mesh.scale.setScalar(grow);
      (o.mesh.material as MeshBasicMaterial).opacity = o.released >= 0 ? 1 - o.released / 0.25 : 0.9;
    }

    for (const b of this.beams) {
      if (!this.tickTracked(b, dt)) continue;
      const t = b.age / b.duration;
      const pulse = 1 + 0.08 * Math.sin(b.age * 14);
      b.mesh.scale.set(pulse * (1 - t * 0.5), Math.min(1, b.age * 6), pulse * (1 - t * 0.5));
      (b.mesh.material as MeshBasicMaterial).opacity = Math.min(1, (1 - t) * 1.6);
      if (t >= 1) b.mesh.visible = false;
    }
    for (const f of this.flashes) {
      if (!this.tickTracked(f, dt)) continue;
      const t = f.age / f.duration;
      f.mesh.scale.setScalar((f.mesh.userData.size as number) * (0.6 + t));
      (f.mesh.material as MeshBasicMaterial).opacity = 1 - t;
      if (t >= 1) f.mesh.visible = false;
    }
    this.ageStains(dt);

    for (const r of this.rings) {
      if (!this.tickTracked(r, dt)) continue;
      const t = r.age / r.duration;
      r.mesh.scale.setScalar(0.2 + (r.mesh.userData.radius as number) * t);
      (r.mesh.material as MeshBasicMaterial).opacity = (1 - t) ** 1.3;
      if (t >= 1) r.mesh.visible = false;
    }

    for (const fp of this.projectiles.values()) {
      const p = fp.data;
      fp.mesh.position.set(p.x, 1.25, p.z);
      fp.mesh.rotation.y = Math.atan2(p.vx, p.vz);
      if (fp.halo) {
        fp.halo.position.copy(fp.mesh.position);
        fp.halo.scale.setScalar(0.9 + 0.2 * Math.sin(p.life * 30));
        (fp.halo.material as MeshBasicMaterial).opacity = 0.35;
      }
      if (Math.random() < 0.7) {
        this.sparks.emit({
          x: p.x,
          y: 1.25,
          z: p.z,
          count: 1,
          color: p.kind === 'bolt' ? 0x8a5cff : 0xffb060,
          speed: [0, 0.4],
          life: [0.15, 0.3],
          size: [0.08, 0.16],
          drag: 6,
        });
      }
    }

    for (const t of this.texts) {
      if (!t.active) continue;
      t.age += dt;
      if (t.age >= t.life) {
        t.active = false;
        t.el.hidden = true;
        continue;
      }
      const k = t.age / t.life;
      const s = this.stage.toScreen(t.x, t.y + k * 1.2, t.z);
      const pop = k < 0.12 ? 1.5 - k * 4 : 1;
      t.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%) scale(${pop})`;
      t.el.style.opacity = String(k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1);
    }
  }

  /** Stains shrink away during the last five seconds of their life. */
  private ageStains(dt: number): void {
    let dirty = false;
    const m = new Matrix4();
    for (let i = 0; i < DECAL_CAPACITY; i++) {
      if (this.stainAge[i] < 0) continue;
      this.stainAge[i] += dt;
      const left = DECAL_LIFE - this.stainAge[i];
      if (left > 5) continue;
      const k = Math.max(0, left / 5);
      this.stains.setMatrixAt(i, m.copy(this.stainBase[i]).multiply(new Matrix4().makeScale(k, 1, k)));
      if (left <= 0) this.stainAge[i] = -1;
      dirty = true;
    }
    if (dirty) this.stains.instanceMatrix.needsUpdate = true;
  }

  /** Ages a tracked effect; returns false once it is hidden. */
  private tickTracked(t: Tracked, dt: number): boolean {
    if (!t.mesh.visible) return false;
    t.age += dt;
    if (t.released >= 0) {
      t.released += dt;
      if (t.released > 0.25 && t.owner >= 0) {
        t.mesh.visible = false;
        return false;
      }
    } else if (t.owner >= 0 && t.age >= t.duration) {
      // Wind-ups resolve exactly at their duration; staggers cancel them earlier.
      t.released = 0;
    }
    return true;
  }

  /** Cancels telegraphs of an interrupted or dead actor. */
  cancel(owner: number): void {
    for (const d of [...this.decals, ...this.aimLines, ...this.orbs]) if (d.owner === owner) d.mesh.visible = false;
  }

  dispose(): void {
    for (const m of this.all) this.scene.remove(m);
    this.scene.remove(this.stains);
    for (const t of this.texts) t.el.remove();
  }
}
