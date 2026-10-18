// 3D 렌더러: 던전(바닥 · 벽 · 오브젝트), 유닛(흰 마네킹 영웅 · 몬스터 모델), 발사체, 이펙트.
// 시뮬레이션 상태를 매 프레임 읽어 장면을 맞춘다. 체력바 · 숫자 · 말풍선 같은 겹침은 2D 렌더러(overlay)가 위에 그린다.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PALETTES } from '../render/renderer';
import type { WorldObject } from '../sim/objects';
import type { Unit } from '../sim/unit';
import type { Fx, Projectile, World } from '../sim/world';
import type { UiState } from '../ui/state';
import type { Camera3D } from './camera3d';
import { ANIMS, FALLBACK, HERO_LOOKS, MONSTER_LOOKS, type Look3D } from './looks';
import { GLOW, Particles, Transients, additive, elementColors } from './vfx';

const BASE = './assets/';
const WALL_H = 0.45;
const INK_HERO = [0.05, 0.04, 0.08];
const INK_FOE = [0.42, 0.04, 0.05];

function gradient(steps: number): THREE.DataTexture {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round(90 + (165 * i) / Math.max(1, steps - 1));
  const t = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const GRADIENT = gradient(3);

interface Model {
  gltf: GLTF;
  clips: Map<string, THREE.AnimationClip>;
}

interface Actor {
  unit: Unit;
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  actions: Map<string, THREE.AnimationAction>;
  clips: Map<string, THREE.AnimationClip>;
  look: Look3D;
  cur: THREE.AnimationAction | null;
  busyUntil: number;
  lastSwing: number;
  lastCast: boolean;
  yaw: number;
  px: number;
  py: number;
  height: number;
  dying: boolean;
  mats: THREE.MeshToonMaterial[];
  ring: THREE.Mesh;
  aura: Map<string, THREE.Object3D>;
}

export class Renderer3D {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private effect: OutlineEffect;
  private loader = new GLTFLoader();
  private models = new Map<string, Promise<Model>>();
  private actors = new Map<Unit, Actor>();
  private pending = new Set<Unit>();
  private world: World | null = null;
  private env = new THREE.Group();
  private floorMesh: THREE.InstancedMesh | null = null;
  private wallMesh: THREE.InstancedMesh | null = null;
  private floorTiles: number[] = [];
  private wallTiles: number[] = [];
  private floorBase: THREE.Color[] = [];
  private wallBase: THREE.Color[] = [];
  private fogAt = -1;
  private objects = new Map<WorldObject, THREE.Object3D>();
  private shots = new Map<Projectile, THREE.Object3D>();
  private seenFx = new WeakSet<Fx>();
  private casts = new Map<Unit, THREE.Group>();
  private sparks = new Particles(1600, 0.16);
  private glows = new Particles(500, 0.55);
  private fx: Transients;
  private time = 0;

  constructor(canvas: HTMLCanvasElement, private cam: Camera3D) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.effect = new OutlineEffect(this.renderer, { defaultThickness: 0.007, defaultColor: INK_HERO });
    this.scene.background = new THREE.Color('#07070b');
    this.scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x3a2c22, 1.0));
    const sun = new THREE.DirectionalLight(0xfff0dd, 1.7);
    sun.position.set(-4, 10, 6);
    this.scene.add(sun);
    this.scene.add(this.env, this.sparks.points, this.glows.points);
    this.fx = new Transients(this.scene);
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ── 에셋 ──

  private load(name: string): Promise<Model> {
    if (!this.models.has(name))
      this.models.set(name, this.loader.loadAsync(`${BASE}${name}.glb`).then((gltf) => {
        const clips = new Map<string, THREE.AnimationClip>();
        // 루트 모션 제거: 위치 이동은 시뮬레이션이 한다 (3타 · 돌진이 적을 뚫고 나가지 않게)
        for (const c of gltf.animations) {
          c.tracks = c.tracks.filter((t) => t.name !== 'root.position');
          clips.set(c.name, c);
        }
        return { gltf, clips };
      }));
    return this.models.get(name)!;
  }

  private toon(root: THREE.Object3D, look: Look3D | null, ink: number[], mats: THREE.MeshToonMaterial[], keepColor = false) {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      const plain = !keepColor && (look?.white || look?.tint);
      const mat = new THREE.MeshToonMaterial({
        map: plain ? null : src.map ?? null,
        color: plain ? new THREE.Color(look?.tint ?? '#f2efe8') : src.color?.clone() ?? new THREE.Color(1, 1, 1),
        gradientMap: GRADIENT,
      });
      if (!plain && look?.tint) mat.color.multiply(new THREE.Color(look.tint));
      mat.userData.outlineParameters = { thickness: 0.007, color: ink, visible: true };
      mats.push(mat);
      mesh.material = mat;
      mesh.frustumCulled = false;
    });
  }

  private lookOf(u: Unit): Look3D {
    if (u.hero) return HERO_LOOKS[u.hero.cls] ?? HERO_LOOKS.warrior;
    return MONSTER_LOOKS[u.def.id] ?? FALLBACK;
  }

  private async makeActor(u: Unit) {
    const look = this.lookOf(u);
    const model = await this.load(look.model);
    const root = SkeletonUtils.clone(model.gltf.scene);
    const height = u.radius * 4 * (look.h ?? 1);
    const box = new THREE.Box3().setFromObject(root);
    root.scale.setScalar(height / Math.max(0.01, box.max.y - box.min.y));
    const mats: THREE.MeshToonMaterial[] = [];
    const ink = u.faction === 'party' ? INK_HERO : INK_FOE;
    this.toon(root, look, ink, mats);
    const isUal = look.model === 'ual/ual';
    if (isUal && look.weapon) await this.attach(root, 'hand_r', look.weapon, ink, mats, height);
    if (isUal && look.offhand) await this.attach(root, 'hand_l', look.offhand, ink, mats, height);
    const ringMat = additive('#66ff88', 0.9);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.visible = false;
    const holder = new THREE.Group();
    holder.add(root);
    holder.add(ring);
    ring.scale.setScalar(u.radius * 1.5);
    this.scene.add(holder);
    const clips = model.clips;
    const a: Actor = {
      unit: u, root: holder, mixer: clips.size ? new THREE.AnimationMixer(root) : null, actions: new Map(), clips, look,
      cur: null, busyUntil: 0, lastSwing: 0, lastCast: false, yaw: u.facing > 0 ? Math.PI / 2 : -Math.PI / 2,
      px: u.x, py: u.y, height, dying: false, mats, ring, aura: new Map(),
    };
    this.actors.set(u, a);
    this.play(a, this.animName(a, 'idle'));
  }

  private async attach(root: THREE.Object3D, bone: string, model: string, ink: number[], mats: THREE.MeshToonMaterial[], height: number) {
    const hand = root.getObjectByName(bone);
    if (!hand) return;
    const w = SkeletonUtils.clone((await this.load(model)).gltf.scene);
    this.toon(w, null, ink, mats, true);
    root.updateMatrixWorld(true);
    const s = new THREE.Vector3();
    hand.getWorldScale(s);
    // 무기는 키에 비례해서 (룩 테스트: 키 2.2 에 무기 배율 0.85)
    w.scale.setScalar((0.386 * height) / (s.x || 1));
    w.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    hand.add(w);
  }

  private animName(a: Actor, k: keyof typeof ANIMS): string {
    if (k === 'idle' && a.look.idle) return a.look.idle;
    if (k === 'run' && a.look.run) return a.look.run;
    return ANIMS[k].find((n) => a.clips.has(n)) ?? [...a.clips.keys()][0] ?? '';
  }

  private play(a: Actor, name: string, once = false) {
    if (!a.mixer || !name) return;
    const clip = a.clips.get(name);
    if (!clip) return;
    let act = a.actions.get(name);
    if (!act) {
      act = a.mixer.clipAction(clip);
      a.actions.set(name, act);
    }
    if (act === a.cur && !once) return;
    act.reset();
    act.timeScale = a.look.speed ?? 1;
    act.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    act.clampWhenFinished = once;
    act.fadeIn(0.1).play();
    if (a.cur && a.cur !== act) a.cur.fadeOut(0.1);
    a.cur = act;
    if (once) a.busyUntil = this.time + (clip.duration / (a.look.speed ?? 1)) * 0.85;
  }

  // ── 던전 ──

  private buildEnv(w: World) {
    for (const c of [...this.env.children]) this.env.remove(c);
    for (const o of this.objects.values()) this.scene.remove(o);
    this.objects.clear();
    const m = w.map, P = PALETTES[w.palette];
    this.floorTiles = [];
    this.wallTiles = [];
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++) {
        if (!m.isWall(x, y)) this.floorTiles.push(y * m.w + x);
        else {
          // 바닥과 닿은 벽만 (나머지는 어둠)
          let near = false;
          for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (!m.isWall(x + dx, y + dy)) near = true;
          if (near) this.wallTiles.push(y * m.w + x);
        }
      }
    const mk = (n: number, geo: THREE.BufferGeometry) => {
      const mat = new THREE.MeshToonMaterial({ gradientMap: GRADIENT });
      mat.userData.outlineParameters = { visible: false };
      const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
      im.frustumCulled = false;
      return im;
    };
    this.floorMesh = mk(this.floorTiles.length, new THREE.BoxGeometry(1, 0.1, 1));
    this.wallMesh = mk(this.wallTiles.length, new THREE.BoxGeometry(1, WALL_H, 1));
    const M = new THREE.Matrix4();
    const fa = new THREE.Color(P.floorA), fb = new THREE.Color(P.floorB), wt = new THREE.Color(P.wallFront).lerp(new THREE.Color(P.wallTop), 0.45);
    this.floorBase = this.floorTiles.map((i, k) => {
      const x = i % m.w, y = (i / m.w) | 0;
      this.floorMesh!.setMatrixAt(k, M.makeTranslation(x + 0.5, -0.05, y + 0.5));
      return (x * 7 + y * 13) % 3 ? fa.clone() : fb.clone();
    });
    this.wallBase = this.wallTiles.map((i, k) => {
      const x = i % m.w, y = (i / m.w) | 0;
      this.wallMesh!.setMatrixAt(k, M.makeTranslation(x + 0.5, WALL_H / 2, y + 0.5));
      return wt.clone();
    });
    this.env.add(this.floorMesh, this.wallMesh);
    this.fogAt = -1;
    this.updateFog(w);
    // 계단: 어두운 구멍 + 금빛 링
    if (w.stairs) {
      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.9), new THREE.MeshBasicMaterial({ color: '#050407' }));
      hole.position.set(w.stairs.x, 0.01, w.stairs.y);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 4), additive('#ffd75a', 0.8));
      ring.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
      ring.position.set(w.stairs.x, 0.04, w.stairs.y);
      ring.name = 'stairs-ring';
      this.env.add(hole, ring);
    }
    for (const o of w.objects) void this.makeObject(o);
  }

  private async makeObject(o: WorldObject) {
    let obj: THREE.Object3D;
    if (o.kind === 'chest' || o.kind === 'mimic') {
      const m = await this.load('kaykit/chest_gold');
      obj = SkeletonUtils.clone(m.gltf.scene);
      const b = new THREE.Box3().setFromObject(obj);
      obj.scale.setScalar(0.55 / Math.max(0.01, b.max.y - b.min.y));
      this.toon(obj, null, INK_HERO, []);
    } else if (o.kind === 'prisoner' || o.kind === 'captive') {
      const m = await this.load('ual/ual');
      obj = SkeletonUtils.clone(m.gltf.scene);
      const b = new THREE.Box3().setFromObject(obj);
      obj.scale.setScalar(1.3 / Math.max(0.01, b.max.y - b.min.y));
      this.toon(obj, { model: '', attack: [], tint: o.kind === 'captive' ? '#ffe9a0' : '#d8d0c0' }, INK_HERO, []);
      const mixer = new THREE.AnimationMixer(obj);
      const clip = m.clips.get('Crouch_Idle_Loop');
      if (clip) mixer.clipAction(clip).play();
      mixer.update(0.5);
    } else {
      obj = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.3, 16), new THREE.MeshToonMaterial({ color: o.kind === 'fountain' ? '#7a8aa0' : '#5a2a2a', gradientMap: GRADIENT }));
      base.position.y = 0.15;
      const top = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20), additive(o.kind === 'fountain' ? '#4aa8ff' : '#ff3838', 0.8));
      top.rotation.x = -Math.PI / 2;
      top.position.y = 0.31;
      obj.add(base, top);
    }
    obj.position.set(o.x, 0, o.y);
    obj.userData.kind = o.kind;
    this.scene.add(obj);
    this.objects.set(o, obj);
  }

  /** 시야: 본 적 없는 칸은 검게, 지금 안 보이는 칸은 어둡게 */
  private updateFog(w: World) {
    if (!this.floorMesh || !this.wallMesh) return;
    const c = new THREE.Color();
    const apply = (mesh: THREE.InstancedMesh, tiles: number[], base: THREE.Color[]) => {
      tiles.forEach((i, k) => {
        if (!w.seen[i]) c.setRGB(0, 0, 0);
        else c.copy(base[k]).multiplyScalar(w.visible[i] ? 1 : 0.42);
        mesh.setColorAt(k, c);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    apply(this.floorMesh, this.floorTiles, this.floorBase);
    apply(this.wallMesh, this.wallTiles, this.wallBase);
  }

  // ── 프레임 ──

  draw(w: World, ui: UiState, dt: number) {
    this.time += dt;
    if (this.world !== w) {
      for (const a of this.actors.values()) this.scene.remove(a.root);
      this.actors.clear();
      this.pending.clear();
      for (const s of this.shots.values()) this.scene.remove(s);
      this.shots.clear();
      for (const g of this.casts.values()) this.scene.remove(g);
      this.casts.clear();
      this.world = w;
      this.buildEnv(w);
    }
    this.fogAt -= dt;
    if (this.fogAt <= 0) {
      this.fogAt = 0.15;
      this.updateFog(w);
    }
    for (const [o, obj] of this.objects) {
      obj.visible = !!w.seen[Math.floor(o.y) * w.map.w + Math.floor(o.x)] && !(o.kind === 'mimic' && o.used);
      if (o.used && o.kind !== 'mimic') obj.traverse((x) => ((x as THREE.Mesh).material as THREE.MeshToonMaterial | undefined)?.color?.setScalar?.(0.45));
    }
    const sr = this.env.getObjectByName('stairs-ring');
    if (sr) sr.rotation.z = Math.PI / 4 + this.time;

    this.syncUnits(w, ui, dt);
    this.syncShots(w, dt);
    this.syncCasts(w);
    this.consumeEvents(w);
    this.sparks.update(dt);
    this.glows.update(dt);
    this.fx.update(dt);

    this.cam.sync();
    const shake = w.shake * 0.012;
    const c = this.cam.three;
    const off = new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0);
    c.position.add(off);
    this.effect.render(this.scene, c);
    c.position.sub(off);
  }

  private syncUnits(w: World, ui: UiState, dt: number) {
    for (const u of w.units) {
      if (!this.actors.has(u) && !this.pending.has(u)) {
        this.pending.add(u);
        void this.makeActor(u).finally(() => this.pending.delete(u));
      }
    }
    for (const [u, a] of this.actors) {
      if (!w.units.includes(u)) {
        this.scene.remove(a.root);
        this.actors.delete(u);
        continue;
      }
      const visible = u.faction === 'party' || w.isVisible(u) || (!u.alive && w.time - u.deathTime < 1.6);
      a.root.visible = visible;
      if (!visible) continue;
      const x = u.x + u.kickX, y = u.y + u.kickY;
      // 바라보는 방향: 움직이면 진행 방향, 아니면 대상
      const mx = u.x - a.px, my = u.y - a.py;
      a.px = u.x;
      a.py = u.y;
      let want: number | null = null;
      if (mx * mx + my * my > 1e-5 && u.alive) want = Math.atan2(mx, my);
      else {
        const t = u.cast?.target ?? (u.intent?.type === 'attack' ? u.intent.target : null) ?? (u.command?.intent.type === 'attack' ? u.command.intent.target : null) ?? u.lastTarget;
        if (t && t.alive) want = Math.atan2(t.x - u.x, t.y - u.y);
        else if (u.cast) want = Math.atan2(u.cast.x - u.x, u.cast.y - u.y);
      }
      if (want !== null) {
        let d = want - a.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        a.yaw += d * Math.min(1, dt * 14);
      }
      a.root.position.set(x, 0, y);
      a.root.children[0].rotation.y = a.yaw;
      this.animate(a, u, w);
      a.mixer?.update(dt * (u.stats?.stunned ? 0.15 : 1));
      // 피격 번쩍임
      const f = u.flash > 0 ? 0.55 : 0;
      for (const m of a.mats) m.emissive.setScalar(f);
      // 선택 링
      const sel = ui.selected.includes(u);
      const hov = ui.hover === u;
      a.ring.visible = u.alive && (sel || hov || w.focusTarget === u);
      (a.ring.material as THREE.MeshBasicMaterial).color.set(sel ? '#66ff88' : w.focusTarget === u ? '#ff3333' : u.faction === 'party' ? '#ffffff' : '#ff6666');
      this.auras(a, u, w);
    }
  }

  private animate(a: Actor, u: Unit, w: World) {
    if (!u.alive) {
      if (!a.dying) {
        a.dying = true;
        this.play(a, this.animName(a, 'death'), true);
        for (const [, o] of a.aura) o.removeFromParent();
        a.aura.clear();
      }
      return;
    }
    a.dying = false;
    // 공격 시작 (swing 이 새로 켜짐)
    if (u.swing > a.lastSwing + 0.05) {
      const atk = a.look.attack;
      const ranged = u.isRanged;
      const name = ranged && a.look.shoot ? a.look.shoot : atk.length >= 3 && u.faction === 'party' ? atk[u.swingStep % atk.length] : atk[Math.floor(Math.random() * Math.max(1, atk.length))];
      if (name) this.play(a, name, true);
    }
    a.lastSwing = u.swing;
    // 시전: 시전 중 동작, 끝나면 발사 동작
    if (a.lastCast && !u.cast && a.look.shoot) this.play(a, a.look.shoot, true);
    a.lastCast = !!u.cast;
    if (this.time < a.busyUntil) return;
    if (u.dashT > 0) this.play(a, a.look.dash ?? this.animName(a, 'run'));
    else if (u.cast && a.look.cast) this.play(a, a.look.cast);
    else if (u.moving) this.play(a, this.animName(a, 'run'));
    else this.play(a, this.animName(a, 'idle'));
    void w;
  }

  /** 상태이상 · 붕괴 오라: 보호막 구체, 방어 링, 괴력 빛, 기절 별, 그리고 화상 · 중독 · 감속 파티클 */
  private auras(a: Actor, u: Unit, w: World) {
    const want = new Set<string>();
    for (const s of u.statuses) want.add(s.def.id);
    if (u.hero?.mood) want.add(`mood:${u.hero.mood}`);
    const h = a.height;
    const ensure = (key: string, make: () => THREE.Object3D) => {
      let o = a.aura.get(key);
      if (!o) {
        o = make();
        a.root.add(o);
        a.aura.set(key, o);
      }
      return o;
    };
    for (const [k, o] of a.aura)
      if (!want.has(k)) {
        o.removeFromParent();
        a.aura.delete(k);
      }
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
    if (want.has('protected')) {
      const o = ensure('protected', () => new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), additive('#ffd75a', 0.16)));
      o.scale.set(h * 0.42, h * 0.62, h * 0.42);
      o.position.y = h * 0.5;
      ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.1 + pulse * 0.1;
    }
    if (want.has('guarded')) {
      const o = ensure('guarded', () => new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 6), additive('#8ac8ff', 0.6)));
      o.rotation.set(-Math.PI / 2, 0, this.time * 2);
      o.scale.setScalar(u.radius * 1.9);
      o.position.y = 0.05;
    }
    if (want.has('might')) {
      const o = ensure('might', () => new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#ff5a2a', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
      o.position.y = h * 0.35;
      o.scale.setScalar(h * (0.9 + pulse * 0.2));
      if (Math.random() < 0.25) this.sparks.emit(u.x, h * 0.2, u.y, '#ff6a3a', 1, { speed: 0.5, up: 1.6, life: 0.6, grav: 0.5 });
    }
    if (want.has('stun')) {
      const o = ensure('stun', () => {
        const g = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#ffe14d', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
          s.scale.setScalar(0.22);
          g.add(s);
        }
        return g;
      });
      o.position.y = h * 1.05;
      o.children.forEach((s, i) => {
        const ang = this.time * 5 + (i * Math.PI * 2) / 3;
        s.position.set(Math.cos(ang) * 0.32, Math.sin(this.time * 7 + i) * 0.04, Math.sin(ang) * 0.32);
      });
    }
    for (const [k, color, rate, up, y] of [
      ['burn', '#ff7a2f', 0.7, 1.8, 0.5], ['poison', '#7dd35a', 0.35, 0.9, 0.4], ['slow', '#9adfff', 0.35, 0.3, 0.1],
      ['fear', '#c080ff', 0.3, 1.2, 0.8],
    ] as [string, string, number, number, number][]) {
      if (want.has(k) && Math.random() < rate) this.sparks.emit(u.x + (Math.random() - 0.5) * 0.4, h * y, u.y + (Math.random() - 0.5) * 0.4, color, 1, { speed: 0.3, up, life: 0.7, grav: 0.3 });
    }
    for (const k of want) {
      if (!k.startsWith('mood:')) continue;
      const virtue = k === 'mood:stalwart' || k === 'mood:focused';
      const o = ensure(k, () => new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 32), additive(virtue ? '#ffe07a' : '#c050ff', 0.7)));
      o.rotation.x = -Math.PI / 2;
      o.position.y = 0.04;
      o.scale.setScalar(u.radius * (2 + pulse * 0.6));
    }
    void w;
  }

  // ── 발사체 ──

  private syncShots(w: World, dt: number) {
    const live = new Set(w.projectiles);
    for (const [p, o] of this.shots)
      if (!live.has(p)) {
        this.scene.remove(o);
        this.shots.delete(p);
      }
    for (const p of w.projectiles) {
      if (!p.source) continue;
      let o = this.shots.get(p);
      if (!o) {
        o = this.makeShot(p);
        this.scene.add(o);
        this.shots.set(p, o);
      }
      const prev = o.position.clone();
      o.position.set(p.x, 0.85, p.y);
      if (prev.distanceToSquared(o.position) > 1e-6 && o.userData.orient) o.lookAt(prev.clone().lerp(o.position, 2));
      // 꼬리
      const [core, outer] = elementColors(p.element, p.color);
      const st = p.style ?? 'orb';
      const n = st === 'arrow' ? 0 : st === 'bolt' ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const sx = p.x + (Math.random() - 0.5) * 0.1, sz = p.y + (Math.random() - 0.5) * 0.1;
        if (st === 'bolt') this.sparks.emit(sx, 0.85, sz, i ? outer : core, 1, { speed: 0.4, up: 0.8, life: 0.35, grav: 1 });
        else if (st === 'shard') this.sparks.emit(sx, 0.85, sz, i ? '#ffffff' : outer, 1, { speed: 0.3, up: 0, life: 0.4, grav: -1 });
        else this.sparks.emit(sx, 0.85, sz, outer, 1, { speed: 0.2, up: 0.2, life: 0.3, grav: 0 });
      }
      void dt;
    }
  }

  private makeShot(p: Projectile): THREE.Object3D {
    const [core, outer] = elementColors(p.element, p.color);
    const g = new THREE.Group();
    const glow = (c: string, s: number) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      sp.scale.setScalar(s);
      g.add(sp);
    };
    switch (p.style) {
      case 'arrow': {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 5), new THREE.MeshBasicMaterial({ color: '#d8c8a0' }));
        shaft.rotation.x = Math.PI / 2;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), new THREE.MeshBasicMaterial({ color: '#e8e8f0' }));
        tip.rotation.x = Math.PI / 2;
        tip.position.z = 0.32;
        g.add(shaft, tip);
        glow(p.color, 0.25);
        g.userData.orient = true;
        break;
      }
      case 'shard': {
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), additive(core, 0.95));
        m.scale.set(0.8, 0.8, 2.4);
        g.add(m);
        glow(outer, 0.6);
        g.userData.orient = true;
        break;
      }
      case 'bolt':
        glow(outer, 0.75);
        glow(core, 0.35);
        break;
      default:
        glow(outer, 0.55);
        glow(core, 0.25);
    }
    return g;
  }

  // ── 시전: 마법진 · 손 빛, 적의 범위 공격 예고 ──

  private syncCasts(w: World) {
    for (const [u, g] of this.casts)
      if (!u.cast || !u.alive) {
        this.scene.remove(g);
        this.casts.delete(u);
      }
    for (const u of w.units) {
      if (!u.alive || !u.cast) continue;
      if (u.faction === 'enemy' && !w.isVisible(u)) continue;
      const ab = u.abilities[u.cast.slot].def;
      const k = u.cast.time / u.cast.total;
      let g = this.casts.get(u);
      const enemy = u.faction === 'enemy';
      if (!g) {
        g = new THREE.Group();
        // 발밑 마법진
        const circle = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 6, 1), additive(ab.color, 0.7));
        circle.rotation.x = -Math.PI / 2;
        circle.name = 'circle';
        const inner = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 32), additive(ab.color, 0.7));
        inner.rotation.x = -Math.PI / 2;
        inner.name = 'inner';
        g.add(circle, inner);
        // 범위 예고 (적은 빨갛게)
        if (ab.radius) {
          const col = enemy ? '#ff3030' : ab.color;
          const area = new THREE.Mesh(new THREE.CircleGeometry(1, 40), additive(col, 0.18));
          area.rotation.x = -Math.PI / 2;
          area.name = 'area';
          const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 40), additive(col, 0.25));
          fill.rotation.x = -Math.PI / 2;
          fill.name = 'fill';
          const edge = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 48), additive(col, 0.85));
          edge.rotation.x = -Math.PI / 2;
          edge.name = 'edge';
          g.add(area, fill, edge);
        }
        this.scene.add(g);
        this.casts.set(u, g);
      }
      const circle = g.getObjectByName('circle')!, inner = g.getObjectByName('inner')!;
      for (const o of [circle, inner]) {
        o.position.set(u.x, 0.05, u.y);
        o.scale.setScalar(u.radius * 2.4 * (0.6 + 0.4 * k));
      }
      circle.rotation.z = this.time * 2;
      inner.rotation.z = -this.time * 3;
      const area = g.getObjectByName('area');
      if (area && ab.radius) {
        const cx = ab.target === 'self' ? u.x : u.cast.x, cy = ab.target === 'self' ? u.y : u.cast.y;
        for (const n of ['area', 'edge']) {
          const o = g.getObjectByName(n)!;
          o.position.set(cx, 0.06, cy);
          o.scale.setScalar(ab.radius);
        }
        const fill = g.getObjectByName('fill')!;
        fill.position.set(cx, 0.07, cy);
        fill.scale.setScalar(ab.radius * Math.max(0.02, k));
      }
      // 손에 모이는 빛
      if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2;
        this.sparks.emit(u.x + Math.cos(a) * 0.5, 0.2, u.y + Math.sin(a) * 0.5, ab.color, 1, { speed: 0.2, up: 1.4, life: 0.5, grav: 0.4 });
      }
    }
  }

  // ── 사건 이펙트 ──

  private consumeEvents(w: World) {
    // 기존 fx (링 · 돌진 궤적)
    for (const f of w.fx) {
      if (this.seenFx.has(f)) continue;
      this.seenFx.add(f);
      if (f.kind === 'ring') this.fx.ring(f.x, f.y, Math.max(0.4, f.r), f.color, f.dur);
      else if (f.kind === 'trail') {
        for (let i = 0; i <= 10; i++) {
          const k = i / 10;
          this.glows.emit(f.x + (f.x2! - f.x) * k, 0.6, f.y + (f.y2! - f.y) * k, f.color, 1, { speed: 0.1, up: 0.2, life: 0.35, grav: 0 });
        }
      }
    }
    for (const v of w.vfx.splice(0)) {
      if (v.type === 'impact') {
        const [core, outer] = elementColors(v.element, v.color);
        const big = v.radius >= 1;
        this.fx.flash(v.x, 0.8, v.y, big ? v.radius * 1.0 : 0.9, outer, big ? 0.3 : 0.2);
        this.fx.flash(v.x, 0.8, v.y, big ? v.radius * 0.5 : 0.4, core, 0.16);
        const n = big ? 30 + v.radius * 14 : 14;
        const el = v.element;
        if (el === 'fire') {
          this.sparks.emit(v.x, 0.6, v.y, outer, n, { speed: big ? 4 : 2.5, up: 2, life: 0.7, grav: 1.5, spread: 1.4 });
          this.glows.emit(v.x, 0.5, v.y, '#ff6a1a', Math.ceil(n / 4), { speed: big ? 2 : 1, up: 1.2, life: 0.5, grav: 1 });
        } else if (el === 'cold') {
          this.sparks.emit(v.x, 0.7, v.y, '#ffffff', n, { speed: big ? 4 : 3, up: 1.5, life: 0.6, grav: -4 });
          this.fx.ring(v.x, v.y, Math.max(0.7, v.radius), '#bfefff', 0.4, 0.08);
        } else if (el === 'poison') {
          this.glows.emit(v.x, 0.3, v.y, outer, Math.ceil(n / 2), { speed: 1.5, up: 0.8, life: 0.8, grav: 0.2 });
        } else if (el === 'holy') {
          this.sparks.emit(v.x, 0.2, v.y, core, n, { speed: 0.8, up: 3.2, life: 0.8, grav: 0 });
          this.fx.ring(v.x, v.y, Math.max(0.8, v.radius), outer, 0.5);
        } else if (el === 'neg') {
          this.glows.emit(v.x, 0.6, v.y, outer, Math.ceil(n / 2), { speed: 1.2, up: 1, life: 0.7, grav: 0.5 });
        } else {
          this.sparks.emit(v.x, 0.7, v.y, outer, n, { speed: 3, up: 1.5, life: 0.5, grav: -3 });
        }
        if (big) this.fx.disc(v.x, v.y, v.radius, outer, 0.3);
      } else if (v.type === 'heal') {
        const u = v.unit;
        this.fx.disc(u.x, u.y, u.radius * 2.2, '#5aff7a', 0.5);
        this.fx.ring(u.x, u.y, u.radius * 2.6, '#9affb0', 0.6);
        this.sparks.emit(u.x, 0.1, u.y, '#b8ffc8', 16, { speed: 0.7, up: 2.4, life: 0.9, grav: 0.2 });
        this.glows.emit(u.x, 0.5, u.y, '#5aff7a', 4, { speed: 0.4, up: 1.2, life: 0.6, grav: 0 });
      } else if (v.type === 'status') {
        const u = v.unit, h = this.actors.get(u)?.height ?? 1.4;
        const col: Record<string, string> = {
          protected: '#ffd75a', might: '#ff6a3a', guarded: '#8ac8ff', stun: '#ffe14d', slow: '#9adfff',
          burn: '#ff7a2f', poison: '#7dd35a', fear: '#c080ff', taunted: '#ff5555',
        };
        const c = col[v.status] ?? '#ffffff';
        const buff = v.status === 'protected' || v.status === 'might' || v.status === 'guarded';
        if (buff) {
          this.fx.ring(u.x, u.y, u.radius * 3, c, 0.55);
          this.sparks.emit(u.x, 0.1, u.y, c, 14, { speed: 0.9, up: 2.6, life: 0.8, grav: 0 });
          this.fx.flash(u.x, h * 0.5, u.y, h * 1.1, c, 0.3);
        } else this.sparks.emit(u.x, h * 0.6, u.y, c, 10, { speed: 1.5, up: 1, life: 0.5, grav: -1 });
      } else if (v.type === 'hit') {
        const u = v.unit, a = this.actors.get(u);
        const h = a?.height ?? 1.4;
        const src = v.from;
        const melee = src && !src.isRanged && Math.hypot(src.x - u.x, src.y - u.y) < 2.2;
        this.sparks.emit(u.x, h * 0.55, u.y, v.heavy ? '#ffe07a' : '#ffffff', v.heavy ? 14 : 6, { speed: v.heavy ? 3.5 : 2.2, up: 1, life: 0.3, grav: -4 });
        if (melee && src) this.fx.slash((u.x + src.x) / 2 + (u.x - src.x) * 0.25, h * 0.55, (u.y + src.y) / 2 + (u.y - src.y) * 0.25, Math.atan2(u.x - src.x, u.y - src.y), v.heavy);
        // 적만 움찔 (영웅은 슈퍼 아머)
        if (a && u.faction === 'enemy' && u.alive && this.time >= a.busyUntil) this.play(a, this.animName(a, 'hit'), true);
      }
    }
  }
}
