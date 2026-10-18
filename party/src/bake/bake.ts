// 스프라이트 굽기: 3D 모델을 정해진 시점 · 8방향 · 동작별로 크게 찍고, 도트 크기로 줄여 시트로 만든다.
// 줄일 때: 부드럽게 줄임 → 투명도 반올림(반투명 없음) → 색 단계 정리 → 바깥 1픽셀 외곽선.
// 실시간 픽셀 렌더보다 칸마다 색이 덜 섞이고, 같은 동작은 늘 같은 그림이 된다.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export const CELL = 48;
const SCALE = 8;
const BIG = CELL * SCALE;
/** 화면 세로가 담는 월드 높이: 키 1.4 가 약 28도트가 되게 */
const VIEW_H = (CELL / 28) * 1.4;
const PITCH = THREE.MathUtils.degToRad(52);
export const DIRS = 8;
export const FPS = 12;

export interface BakeSpec {
  id: string;
  model: string;
  weapon?: string;
  offhand?: string;
  white?: boolean;
  ink: string;
  height: number;
  anims: Record<string, { clip: string; speed?: number; loop: boolean; max?: number }>;
}

export interface SheetMeta {
  id: string;
  cell: number;
  fps: number;
  dirs: number;
  /** 동작 → [시작 행, 프레임 수] (행 = 동작 × 8방향) */
  anims: Record<string, { row: number; frames: number; loop: boolean }>;
  cols: number;
  rows: number;
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
const load = (n: string) => {
  if (!cache.has(n))
    cache.set(n, loader.loadAsync(`./assets/${n}.glb`).then((g) => {
      for (const c of g.animations) c.tracks = c.tracks.filter((t) => t.name !== 'root.position');
      return g;
    }));
  return cache.get(n)!;
};

function gradient(): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([90, 172, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const GRAD = gradient();

function toon(root: THREE.Object3D, white: boolean) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    m.material = new THREE.MeshToonMaterial({
      map: white ? null : src.map ?? null,
      color: white ? new THREE.Color('#f2efe8') : src.color?.clone() ?? new THREE.Color(1, 1, 1),
      gradientMap: GRAD,
    });
    m.frustumCulled = false;
  });
}

/** 장면 하나 (모델 + 조명 + 직교 카메라) */
export async function makeStage(spec: BakeSpec, renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x3a2c22, 1.0));
  const sun = new THREE.DirectionalLight(0xfff0dd, 1.7);
  sun.position.set(-4, 10, 6);
  scene.add(sun);
  const g = await load(spec.model);
  const model = SkeletonUtils.clone(g.scene);
  const box = new THREE.Box3().setFromObject(model);
  model.scale.setScalar(spec.height / (box.max.y - box.min.y));
  toon(model, !!spec.white);
  const attach = async (bone: string, w: string) => {
    const hand = model.getObjectByName(bone);
    if (!hand) return;
    const wm = SkeletonUtils.clone((await load(w)).scene);
    toon(wm, false);
    model.updateMatrixWorld(true);
    const s = new THREE.Vector3();
    hand.getWorldScale(s);
    wm.scale.setScalar((0.386 * spec.height) / (s.x || 1));
    wm.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    hand.add(wm);
  };
  if (spec.weapon) await attach('hand_r', spec.weapon);
  if (spec.offhand) await attach('hand_l', spec.offhand);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  const cam = new THREE.OrthographicCamera(-VIEW_H / 2, VIEW_H / 2, VIEW_H / 2, -VIEW_H / 2, 0.1, 100);
  const target = new THREE.Vector3(0, spec.height * 0.42, 0);
  cam.position.copy(target).add(new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH)).multiplyScalar(30));
  cam.lookAt(target);
  const mixer = new THREE.AnimationMixer(model);
  const clips = new Map(g.animations.map((c) => [c.name, c]));
  return {
    scene, cam, pivot, mixer, clips,
    /** 방향 d(0 = 화면 아래쪽, 시계 방향 45°씩) · 동작 · 시각의 장면을 그린다 */
    pose(dir: number, clip: string, t: number) {
      pivot.rotation.y = -(dir * Math.PI) / 4;
      mixer.stopAllAction();
      const c = clips.get(clip);
      if (c) {
        const a = mixer.clipAction(c);
        a.reset().play();
        a.time = Math.min(t, c.duration - 1e-3);
        mixer.update(0);
      }
      renderer.render(scene, cam);
    },
  };
}

/** 큰 그림 한 장 → 도트 한 칸 크기로 줄이고 다듬기 */
function crunch(src: HTMLCanvasElement, ink: [number, number, number]): ImageData {
  const small = document.createElement('canvas');
  small.width = small.height = CELL;
  const sx = small.getContext('2d', { willReadFrequently: true })!;
  sx.imageSmoothingEnabled = true;
  sx.imageSmoothingQuality = 'high';
  // 단계적으로 줄여 평균이 고르게 (8 → 4 → 2 → 1)
  let cur: HTMLCanvasElement = src;
  for (let size = BIG / 2; size >= CELL; size /= 2) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const cx = c.getContext('2d')!;
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(cur, 0, 0, size, size);
    cur = c;
  }
  sx.drawImage(cur, 0, 0);
  const img = sx.getImageData(0, 0, CELL, CELL);
  const d = img.data;
  const solid = new Uint8Array(CELL * CELL);
  for (let i = 0; i < CELL * CELL; i++) {
    const a = d[i * 4 + 3];
    if (a < 110) {
      d[i * 4 + 3] = 0;
      continue;
    }
    solid[i] = 1;
    // 반투명을 없애고(원래 색으로 되돌림) 색을 16단계로 정리
    const k = 255 / a;
    for (let c = 0; c < 3; c++) d[i * 4 + c] = Math.min(255, Math.round((d[i * 4 + c] * k) / 16) * 16);
    d[i * 4 + 3] = 255;
  }
  // 바깥 1픽셀 외곽선
  for (let y = 0; y < CELL; y++)
    for (let x = 0; x < CELL; x++) {
      const i = y * CELL + x;
      if (solid[i]) continue;
      const n = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < CELL && yy < CELL && solid[yy * CELL + xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) {
        d[i * 4] = ink[0]; d[i * 4 + 1] = ink[1]; d[i * 4 + 2] = ink[2]; d[i * 4 + 3] = 255;
      }
    }
  return img;
}

/** 캐릭터 하나 → 시트 캔버스 + 메타 */
export async function bake(spec: BakeSpec): Promise<{ sheet: HTMLCanvasElement; meta: SheetMeta }> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(BIG, BIG);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const stage = await makeStage(spec, renderer);
  const ink = new THREE.Color(spec.ink);
  const inkRGB: [number, number, number] = [ink.r * 255, ink.g * 255, ink.b * 255];
  const plan = Object.entries(spec.anims).map(([name, a]) => {
    const clip = stage.clips.get(a.clip);
    const dur = (clip?.duration ?? 1) / (a.speed ?? 1);
    return { name, a, frames: Math.max(1, Math.min(a.max ?? 12, Math.round(dur * FPS))) };
  });
  const cols = Math.max(...plan.map((p) => p.frames));
  const rows = plan.length * DIRS;
  const sheet = document.createElement('canvas');
  sheet.width = cols * CELL;
  sheet.height = rows * CELL;
  const ctx = sheet.getContext('2d')!;
  const meta: SheetMeta = { id: spec.id, cell: CELL, fps: FPS, dirs: DIRS, anims: {}, cols, rows };
  plan.forEach((p, ai) => {
    meta.anims[p.name] = { row: ai * DIRS, frames: p.frames, loop: p.a.loop };
    const clip = stage.clips.get(p.a.clip);
    const dur = clip?.duration ?? 1;
    for (let dir = 0; dir < DIRS; dir++)
      for (let f = 0; f < p.frames; f++) {
        // 반복 동작은 끝 = 처음이 되지 않게, 한 번 동작은 마지막 포즈까지
        const t = p.a.loop ? (dur * f) / p.frames : (dur * f) / Math.max(1, p.frames - 1);
        stage.pose(dir, p.a.clip, t);
        ctx.putImageData(crunch(renderer.domElement, inkRGB), f * CELL, (ai * DIRS + dir) * CELL);
      }
  });
  renderer.dispose();
  return { sheet, meta };
}

export const SPECS: BakeSpec[] = [
  {
    id: 'warrior', model: 'ual/ual', white: true, weapon: 'kaykit/w_sword_1handed', offhand: 'kaykit/w_shield_round', ink: '#16121c', height: 1.45,
    anims: {
      idle: { clip: 'Sword_Idle', loop: true, max: 8 },
      run: { clip: 'Jog_Fwd_Loop', loop: true, speed: 1.35, max: 8 },
      atk1: { clip: 'Sword_Regular_A', loop: false, speed: 1.35, max: 7 },
      atk2: { clip: 'Sword_Regular_B', loop: false, speed: 1.35, max: 7 },
      atk3: { clip: 'Sword_Regular_C', loop: false, speed: 1.35, max: 9 },
      hit: { clip: 'Hit_Chest', loop: false, max: 4 },
      death: { clip: 'Death01', loop: false, max: 10 },
    },
  },
  {
    id: 'goblin', model: 'quaternius/Tribal', ink: '#4a0e10', height: 1.25,
    anims: {
      idle: { clip: 'Idle', loop: true, max: 8 },
      run: { clip: 'Run', loop: true, max: 8 },
      atk1: { clip: 'Weapon', loop: false, max: 8 },
      hit: { clip: 'HitReact', loop: false, max: 4 },
      death: { clip: 'Death', loop: false, max: 10 },
    },
  },
];
