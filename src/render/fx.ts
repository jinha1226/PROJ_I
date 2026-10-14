import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  type Scene,
} from "three";
import type { AttackStep, Projectile } from "../sim/types";
import { ParticlePool, type EmitOptions } from "./particles";
import type { Stage } from "./stage";

export interface ActorPose {
  x: number;
  z: number;
  facing: number;
}

type PoseLookup = (id: number) => ActorPose | null;

/** Flat ring sector in the XZ plane, brighter toward `bright` (0 = inner/trailing, 1 = outer/leading). */
function sectorGeometry(
  inner: number,
  outer: number,
  arc: number,
  gradient: "sweep" | "radial",
): BufferGeometry {
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
      const k =
        gradient === "sweep"
          ? t ** 2.2 * (0.35 + 0.65 * radial)
          : 0.25 + 0.75 * radial;
      col.push(k, k, k);
    }
    if (i < segs) {
      const b = i * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
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
  } = { bolt: [], arrow: [], halo: [] };
  private readonly texts: FloatText[] = [];
  private readonly all: Mesh[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly stage: Stage,
    overlay: HTMLElement,
  ) {
    this.sparks = new ParticlePool(scene, 700, true);
    this.debris = new ParticlePool(scene, 500, false);
    for (let i = 0; i < SLASH_POOL; i++)
      this.slashes.push({
        mesh: this.add(
          new Mesh(
            sectorGeometry(1, 2, 1, "sweep"),
            glowMaterial(0xffffff, true),
          ),
        ),
        age: 1,
        life: 1,
        spin: 0,
        owner: -1,
      });
    for (let i = 0; i < DECAL_POOL; i++)
      this.decals.push(
        this.tracked(
          new Mesh(
            sectorGeometry(0.3, 1, 1, "radial"),
            glowMaterial(0xff3020, true),
          ),
        ),
      );
    for (let i = 0; i < 3; i++) {
      const line = new Mesh(
        new PlaneGeometry(0.09, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5),
        glowMaterial(0xff2a2a),
      );
      this.aimLines.push(this.tracked(line));
    }
    for (let i = 0; i < ORB_POOL; i++)
      this.orbs.push(
        this.tracked(
          new Mesh(new IcosahedronGeometry(0.28, 1), glowMaterial(0xa070ff)),
        ),
      );
    for (let i = 0; i < RING_POOL; i++)
      this.rings.push(
        this.tracked(
          new Mesh(
            new RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2),
            glowMaterial(0xffffff),
          ),
        ),
      );
    for (let i = 0; i < PROJECTILE_POOL; i++) {
      this.projectilePool.bolt.push(
        this.add(
          new Mesh(new IcosahedronGeometry(0.3, 1), glowMaterial(0xc29bff)),
        ),
      );
      this.projectilePool.arrow.push(
        this.add(
          new Mesh(new BoxGeometry(0.07, 0.07, 1.1), glowMaterial(0xffd080)),
        ),
      );
      this.projectilePool.halo.push(
        this.add(
          new Mesh(new IcosahedronGeometry(0.6, 1), glowMaterial(0x6a3cff)),
        ),
      );
    }
    for (let i = 0; i < TEXT_POOL; i++) {
      const el = document.createElement("div");
      el.className = "floatText";
      el.hidden = true;
      overlay.append(el);
      this.texts.push({ el, x: 0, y: 0, z: 0, age: 0, life: 1, active: false });
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
    const prev = this.all.map((m) => m.visible);
    for (const m of this.all) m.visible = true;
    fn();
    this.all.forEach((m, i) => (m.visible = prev[i]));
  }

  // ---------- player swings ----------

  slash(
    owner: number,
    pose: ActorPose,
    step: AttackStep,
    reach: number,
    heavy: boolean,
  ): void {
    const slot = this.slashes.reduce((a, b) =>
      a.age / a.life > b.age / b.life ? a : b,
    );
    const arc = Math.min(step.arc, Math.PI * 2);
    const key = `${arc.toFixed(2)}|${reach.toFixed(2)}`;
    let geo = this.slashGeometries.get(key);
    if (!geo) {
      geo = sectorGeometry(reach * 0.45, reach + 0.35, arc, "sweep");
      this.slashGeometries.set(key, geo);
    }
    slot.mesh.geometry = geo;
    slot.mesh.position.set(pose.x, step.sweep === "down" ? 0.5 : 1.0, pose.z);
    slot.mesh.rotation.set(0, pose.facing, 0);
    slot.mesh.scale.set(step.sweep === "left" ? -1 : 1, 1, 1);
    (slot.mesh.material as MeshBasicMaterial).color.set(
      heavy ? 0xffc070 : 0xe8f4ff,
    );
    slot.mesh.visible = true;
    slot.age = 0;
    slot.life = heavy ? 0.24 : 0.17;
    slot.spin = step.sweep === "spin" ? 9 : 0;
    slot.owner = owner;
  }

  // ---------- telegraphs ----------

  windup(owner: number, duration: number, reach: number, arc: number): void {
    const d = this.free(this.decals);
    const key = `${arc.toFixed(2)}|${reach.toFixed(2)}`;
    let geo = this.decalGeometries.get(key);
    if (!geo) {
      geo = sectorGeometry(0.4, reach + 0.4, arc, "radial");
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

  ring(
    x: number,
    z: number,
    color: number,
    radius: number,
    duration = 0.35,
  ): void {
    const r = this.free(this.rings);
    (r.mesh.material as MeshBasicMaterial).color.set(color);
    r.mesh.position.set(x, 0.12, z);
    r.mesh.userData.radius = radius;
    this.arm(r, -1, duration);
    r.released = 0;
  }

  private free(pool: Tracked[]): Tracked {
    return (
      pool.find((t) => !t.mesh.visible) ??
      pool.reduce((a, b) => (a.age > b.age ? a : b))
    );
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
    const halo =
      p.kind === "bolt" ? (this.projectilePool.halo.pop() ?? null) : null;
    mesh.visible = true;
    if (halo) halo.visible = true;
    this.projectiles.set(p.id, { mesh, halo, data: p });
  }

  projectileEnd(
    id: number,
    x: number,
    z: number,
    kind: Projectile["kind"],
  ): void {
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
    const color = kind === "bolt" ? 0xb080ff : 0xffd080;
    this.sparks.emit({
      x,
      y: 1.1,
      z,
      count: kind === "bolt" ? 18 : 8,
      color,
      color2: 0xffffff,
      speed: [2, 6],
      up: [0, 4],
      life: [0.2, 0.45],
      size: [0.06, 0.14],
      gravity: 9,
    });
    if (kind === "bolt") this.ring(x, z, 0x9a6bff, 1.6, 0.3);
  }

  // ---------- particles ----------

  burst(o: EmitOptions, additive = true): void {
    (additive ? this.sparks : this.debris).emit(o);
  }

  // ---------- floating text ----------

  text(
    x: number,
    y: number,
    z: number,
    text: string,
    cls: string,
    life = 0.8,
  ): void {
    const t =
      this.texts.find((f) => !f.active) ??
      this.texts.reduce((a, b) => (a.age > b.age ? a : b));
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
      m.opacity =
        d.released >= 0
          ? 1.4 * (1 - d.released / 0.25)
          : 0.15 + 0.55 * Math.min(1, d.age / d.duration);
    }

    for (const a of this.aimLines) {
      if (!this.tickTracked(a, dt)) continue;
      const p = pose(a.owner);
      if (p && a.released < 0) {
        a.mesh.position.set(p.x, 1.2, p.z);
        a.mesh.rotation.y = p.facing;
      }
      a.mesh.scale.set(1, 1, 18);
      (a.mesh.material as MeshBasicMaterial).opacity =
        a.released >= 0
          ? 1.5 * (1 - a.released / 0.25)
          : 0.25 + 0.75 * (a.age / a.duration) ** 2;
    }

    for (const o of this.orbs) {
      if (!this.tickTracked(o, dt)) continue;
      const p = pose(o.owner);
      if (p && o.released < 0)
        o.mesh.position.set(
          p.x + Math.sin(p.facing) * 0.7,
          1.7,
          p.z + Math.cos(p.facing) * 0.7,
        );
      const grow =
        o.released >= 0
          ? 1.6 + o.released * 6
          : 0.3 + 1.1 * Math.min(1, o.age / o.duration);
      o.mesh.scale.setScalar(grow);
      (o.mesh.material as MeshBasicMaterial).opacity =
        o.released >= 0 ? 1 - o.released / 0.25 : 0.9;
    }

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
          color: p.kind === "bolt" ? 0x8a5cff : 0xffb060,
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
    for (const d of [...this.decals, ...this.aimLines, ...this.orbs])
      if (d.owner === owner) d.mesh.visible = false;
  }

  dispose(): void {
    for (const m of this.all) this.scene.remove(m);
    for (const t of this.texts) t.el.remove();
  }
}
