// 코드로 만드는 이펙트: 파티클(불꽃 · 냉기 · 독 · 빛가루), 충격파 링, 베기 궤적, 마법진.
// 전부 가산 혼합(빛나는 느낌)이라 흰 마네킹 · 어두운 던전과 잘 붙는다.
import * as THREE from 'three';
import type { Element } from '../sim/defs';

/** 부드러운 원형 빛 텍스처 (한 번 만들어 공유) */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const GLOW = glowTexture();

/** 속성별 색 묶음 [중심, 바깥] */
export const ELEMENT_FX: Record<string, [string, string]> = {
  fire: ['#ffd27a', '#ff5a1a'],
  cold: ['#e8fbff', '#5ec8ff'],
  poison: ['#d8ff9a', '#5ac83a'],
  holy: ['#fffbe0', '#ffd75a'],
  neg: ['#e6c8ff', '#8a4aff'],
  elec: ['#fffbd0', '#ffe14d'],
  physical: ['#ffffff', '#c8c8c8'],
};

export const additive = (color: THREE.ColorRepresentation, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

// ── 파티클 ──
interface PState { vx: number; vy: number; vz: number; life: number; max: number; r: number; g: number; b: number; grav: number; drag: number }

export class Particles {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private st: PState[] = [];
  private next = 0;

  constructor(private cap: number, size: number) {
    this.pos = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    for (let i = 0; i < cap; i++) this.st.push({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, r: 0, g: 0, b: 0, grav: 0, drag: 0 });
    for (let i = 0; i < cap; i++) this.pos[i * 3 + 1] = -999;
  }

  emit(x: number, y: number, z: number, color: THREE.ColorRepresentation, n: number, o: { speed?: number; up?: number; life?: number; grav?: number; spread?: number; drag?: number } = {}) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.cap;
      const s = this.st[i];
      const sp = (o.speed ?? 2) * (0.4 + Math.random() * 0.8);
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.3) * (o.spread ?? 1);
      s.vx = Math.cos(a) * sp;
      s.vz = Math.sin(a) * sp;
      s.vy = (o.up ?? 1) + e * sp;
      s.life = s.max = (o.life ?? 0.6) * (0.6 + Math.random() * 0.7);
      s.grav = o.grav ?? -2;
      s.drag = o.drag ?? 2;
      s.r = c.r; s.g = c.g; s.b = c.b;
      const sp3 = (o.spread ?? 1) * 0.08;
      this.pos[i * 3] = x + (Math.random() - 0.5) * sp3;
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * sp3;
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * sp3;
    }
  }

  update(dt: number) {
    const p = this.pos, c = this.col;
    for (let i = 0; i < this.cap; i++) {
      const s = this.st[i];
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        p[i * 3 + 1] = -999;
        c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = 0;
        continue;
      }
      const k = Math.exp(-s.drag * dt);
      s.vx *= k; s.vz *= k;
      s.vy += s.grav * dt;
      p[i * 3] += s.vx * dt;
      p[i * 3 + 1] += s.vy * dt;
      p[i * 3 + 2] += s.vz * dt;
      const f = s.life / s.max;
      c[i * 3] = s.r * f; c[i * 3 + 1] = s.g * f; c[i * 3 + 2] = s.b * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

// ── 잠깐 살다 사라지는 메시 (링 · 베기 · 섬광) ──
interface Temp { obj: THREE.Object3D; t: number; dur: number; update: (k: number, o: THREE.Object3D) => void }

export class Transients {
  private list: Temp[] = [];
  constructor(private scene: THREE.Scene) {}

  add(obj: THREE.Object3D, dur: number, update: (k: number, o: THREE.Object3D) => void) {
    this.scene.add(obj);
    this.list.push({ obj, t: 0, dur, update });
    update(0, obj);
  }

  update(dt: number) {
    for (const x of this.list) {
      x.t += dt;
      x.update(Math.min(1, x.t / x.dur), x.obj);
    }
    for (const x of this.list.filter((x) => x.t >= x.dur)) {
      this.scene.remove(x.obj);
      x.obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | undefined;
        if (mat && mat !== undefined) mat.dispose?.();
      });
    }
    this.list = this.list.filter((x) => x.t < x.dur);
  }

  /** 바닥에 퍼지는 충격파 링 */
  ring(x: number, z: number, r: number, color: THREE.ColorRepresentation, dur = 0.45, width = 0.12) {
    const m = new THREE.Mesh(new THREE.RingGeometry(1 - width, 1, 48), additive(color, 0.9));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.04, z);
    this.add(m, dur, (k, o) => {
      const s = r * (0.35 + 0.65 * Math.sqrt(k));
      o.scale.set(s, s, s);
      ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k);
    });
  }

  /** 바닥 원판 섬광 (치유 · 축복 · 폭발 중심) */
  disc(x: number, z: number, r: number, color: THREE.ColorRepresentation, dur = 0.4) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), additive(color, 0.5));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    this.add(m, dur, (k, o) => {
      o.scale.setScalar(r * (0.6 + 0.4 * k));
      ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.32 * (1 - k);
    });
  }

  /** 빛 덩어리 섬광 (착탄 중심) */
  flash(x: number, y: number, z: number, size: number, color: THREE.ColorRepresentation, dur = 0.22) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    s.position.set(x, y, z);
    this.add(s, dur, (k, o) => {
      o.scale.setScalar(size * (0.6 + k * 0.8));
      ((o as THREE.Sprite).material as THREE.SpriteMaterial).opacity = 1 - k;
    });
  }

  /** 베기 궤적: 공격자 앞에 세운 초승달. 마무리 타는 크고 노랗게 */
  slash(x: number, y: number, z: number, yaw: number, heavy: boolean) {
    const r = heavy ? 0.95 : 0.7;
    const geo = new THREE.RingGeometry(r * 0.72, r, 32, 1, -Math.PI * 0.15, Math.PI * 0.95);
    const m = new THREE.Mesh(geo, additive(heavy ? '#ffe07a' : '#ffffff', 0.95));
    m.position.set(x, y, z);
    // 화면에 대각선으로 그어지게: 진행 방향을 보고 비스듬히 눕힌다
    m.rotation.set(-0.5, yaw, (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5));
    this.add(m, heavy ? 0.24 : 0.17, (k, o) => {
      ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - k);
      o.scale.setScalar(0.85 + k * 0.35);
    });
  }
}

export function elementColors(el: Element | undefined, fallback: string): [string, string] {
  return el ? ELEMENT_FX[el] ?? [fallback, fallback] : [fallback, fallback];
}
