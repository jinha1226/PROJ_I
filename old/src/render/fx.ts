import {
  ConeGeometry,
  CircleGeometry,
  DoubleSide,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  RingGeometry,
  type BufferGeometry,
  type Camera,
  type Scene,
  Vector3,
} from 'three';
import type {BossWarningVisual, CombatFx, ProjectileVisual} from '../combat/ports';
import {BOSS_BLAST_RADIUS} from '../data/enemies';
import type {ProjectileKind} from '../types';

const FLOAT_TEXT_OFFSET_Y = 2.1;
const FLOAT_TEXT_LIFETIME_MS = 750;
const IMPACT_PARTICLES = 9;
const IMPACT_RING_HEIGHT = 0.13;
const PULSE_HEIGHT = 0.12;
const WARNING_HEIGHT = 0.09;

/** Spell glows in flight at once; extra spells simply fly without a light. */
const GLOW_POOL_SIZE = 4;
const GLOW_COLOR = 0x559bff;
const GLOW_INTENSITY = 5;
const GLOW_DISTANCE = 4;

interface Transient {
  mesh: Mesh;
  age: number;
  duration: number;
  velocity?: Vector3;
}

function basicMaterial(color: number, opacity = 1): MeshBasicMaterial {
  return new MeshBasicMaterial({color, transparent: true, opacity, depthWrite: false, side: DoubleSide});
}

function flatOnGround(geometry: BufferGeometry, material: MeshBasicMaterial, at: Vector3, height: number): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(at.x, height, at.z);
  return mesh;
}

/** Hit sparks, projectiles, shockwave telegraphs and floating damage numbers. */
export class ThreeFx implements CombatFx {
  private transients: Transient[] = [];
  /**
   * Spell glows come from a fixed pool that stays in the scene with zero
   * intensity when idle. Adding or removing lights changes the light count,
   * which makes three.js recompile every lit material: a visible hitch per spell.
   */
  private readonly idleGlows: PointLight[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly camera: Camera,
    private readonly overlay: HTMLElement,
  ) {
    for (let i = 0; i < GLOW_POOL_SIZE; i++) {
      const glow = new PointLight(GLOW_COLOR, 0, GLOW_DISTANCE);
      scene.add(glow);
      this.idleGlows.push(glow);
    }
  }

  floatText(at: Vector3, text: string, color: string): void {
    const ndc = at.clone().add(new Vector3(0, FLOAT_TEXT_OFFSET_Y, 0)).project(this.camera);
    const el = document.createElement('div');
    el.className = 'float';
    el.textContent = text;
    el.style.color = color;
    el.style.left = ((ndc.x + 1) * 0.5 * this.overlay.clientWidth) + 'px';
    el.style.top = ((1 - ndc.y) * 0.5 * this.overlay.clientHeight) + 'px';
    this.overlay.append(el);
    setTimeout(() => el.remove(), FLOAT_TEXT_LIFETIME_MS);
  }

  impact(at: Vector3, color: number, _power = 1): void {
    const ring = flatOnGround(new RingGeometry(0.12, 0.22, 24), basicMaterial(color, 0.9), at, IMPACT_RING_HEIGHT);
    this.addTransient({mesh: ring, age: 0, duration: 0.36});

    for (let i = 0; i < IMPACT_PARTICLES; i++) {
      const angle = (i * Math.PI * 2) / IMPACT_PARTICLES;
      const spark = new Mesh(new IcosahedronGeometry(0.055 + Math.random() * 0.06, 0), basicMaterial(color));
      spark.position.copy(at).add(new Vector3(0, 1.1, 0));
      this.addTransient({
        mesh: spark,
        age: 0,
        duration: 0.3 + Math.random() * 0.2,
        velocity: new Vector3(Math.cos(angle) * (2 + Math.random() * 3), 1 + Math.random() * 3, Math.sin(angle) * (2 + Math.random() * 3)),
      });
    }
  }

  spawnProjectile(from: Vector3, to: Vector3, kind: ProjectileKind): ProjectileVisual {
    const arrow = kind === 'arrow';
    const core = new Mesh(arrow ? new ConeGeometry(0.095, 0.8, 7) : new IcosahedronGeometry(0.32, 1), basicMaterial(arrow ? 0xffd68a : 0x70b9ff));
    core.position.copy(from);
    if (arrow) core.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize());
    this.scene.add(core);
    const glow = arrow ? null : (this.idleGlows.pop() ?? null);
    if (glow) {
      glow.intensity = GLOW_INTENSITY;
      glow.position.copy(from);
    }

    return {
      advance: (t, dt) => {
        core.position.lerpVectors(from, to, t);
        if (!arrow) {
          core.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.6);
          core.rotation.y += dt * 8;
        }
        glow?.position.copy(core.position);
      },
      dispose: () => {
        this.scene.remove(core);
        if (glow) {
          glow.intensity = 0;
          this.idleGlows.push(glow);
        }
        core.geometry.dispose();
        (core.material as MeshBasicMaterial).dispose();
      },
    };
  }

  spawnBossWarning(center: Vector3): BossWarningVisual {
    const material = basicMaterial(0xf05c35, 0.22);
    const geometry = new CircleGeometry(BOSS_BLAST_RADIUS, 64);
    const mesh = flatOnGround(geometry, material, center, WARNING_HEIGHT);
    this.scene.add(mesh);
    return {
      setOpacity: value => {
        material.opacity = value;
      },
      dispose: () => {
        this.scene.remove(mesh);
        geometry.dispose();
        material.dispose();
      },
    };
  }

  bossPulse(center: Vector3): void {
    const pulse = flatOnGround(new RingGeometry(0.5, BOSS_BLAST_RADIUS, 48), basicMaterial(0xff9b43, 0.55), center, PULSE_HEIGHT);
    this.addTransient({mesh: pulse, age: 0, duration: 0.65});
  }

  /** One throwaway mesh per effect material, for shader warm-up. Caller owns disposal. */
  warmupSamples(): Mesh[] {
    return [
      new Mesh(new RingGeometry(0.12, 0.22, 24), basicMaterial(0xffffff, 0.9)),
      new Mesh(new IcosahedronGeometry(0.1, 0), basicMaterial(0xffffff)),
      new Mesh(new ConeGeometry(0.095, 0.8, 7), basicMaterial(0xffd68a)),
      new Mesh(new IcosahedronGeometry(0.32, 1), basicMaterial(0x70b9ff)),
      new Mesh(new CircleGeometry(1, 16), basicMaterial(0xf05c35, 0.22)),
    ];
  }

  /** Ages sparks and rings; call every frame. */
  update(dt: number): void {
    for (let i = this.transients.length - 1; i >= 0; i--) {
      const fx = this.transients[i];
      fx.age += dt;
      const t = Math.min(1, fx.age / fx.duration);
      if (fx.velocity) fx.mesh.position.addScaledVector(fx.velocity, dt);
      else fx.mesh.scale.setScalar(1 + t * 6);
      (fx.mesh.material as MeshBasicMaterial).opacity = 1 - t;
      if (t >= 1) {
        this.scene.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        (fx.mesh.material as MeshBasicMaterial).dispose();
        this.transients.splice(i, 1);
      }
    }
  }

  private addTransient(fx: Transient): void {
    this.scene.add(fx.mesh);
    this.transients.push(fx);
  }
}
