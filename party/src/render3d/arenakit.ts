// 전장 꾸미기 (모두 CC0):
//  - SigilsVault Modular Dungeon Kit: 손으로 칠한 돌바닥(가장자리 테두리 타일) · 벽 · 아치문(적이 들어오는 옆문) · 기둥 · 화로 · 관 · 항아리
//  - KayKit Dungeon Remastered: 벽걸이 횃불 · 통 · 상자
//  - Quaternius Dungeon: 해골 · 거미줄 · 벽걸이 깃발 · 모닥불
// 세 키트 모두 바닥 한 칸이 2단위라 0.5배로 줄여 우리 타일 1칸에 맞춘다. 같은 조각은 InstancedMesh 하나로 그린다.
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { World } from '../sim/world';

const K = 0.5;
type Load = (name: string) => Promise<{ gltf: GLTF }>;
type Toon = (mat: THREE.Material) => THREE.Material;

/** 계약 팔레트별 돌 색조 */
const TINT: Record<string, string> = { cave: '#ffffff', crypt: '#b8c4ff', nest: '#d8b8e0', ruins: '#f0dcb0' };

interface Piece { geo: THREE.BufferGeometry; mat: THREE.Material }

/** 파일 하나(또는 그 안의 이름 붙은 노드 하나) → 조각들. 노드면 노드 원점 기준으로 */
async function piece(load: Load, toon: Toon, file: string, node?: string): Promise<Piece[]> {
  const { gltf } = await load(file);
  gltf.scene.updateMatrixWorld(true);
  const root = node ? gltf.scene.getObjectByName(node) : gltf.scene;
  if (!root) return [];
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const out: Piece[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const geo = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    // 여러 재질 메시: 그룹마다 따로 (InstancedMesh 는 재질 배열도 받는다)
    out.push({ geo, mat: mats.length > 1 ? (mats.map(toon) as unknown as THREE.Material) : toon(mats[0]) });
  });
  return out;
}

/** 같은 조각 여러 개 → InstancedMesh */
async function place(group: THREE.Group, load: Load, toon: Toon, file: string, mats: THREE.Matrix4[], node?: string) {
  if (!mats.length) return;
  for (const p of await piece(load, toon, file, node)) {
    const im = new THREE.InstancedMesh(p.geo, p.mat, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.frustumCulled = false;
    group.add(im);
  }
}

const at = (x: number, y: number, z: number, rotY = 0, s = K, sy = s) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(s, sy, s));

export interface ArenaEnv {
  group: THREE.Group;
  lights: { light: THREE.PointLight; base: number; seed: number }[];
}

export async function buildArena(w: World, load: Load, toonBase: (map: THREE.Texture | null) => THREE.MeshToonMaterial): Promise<ArenaEnv> {
  const group = new THREE.Group();
  const tint = new THREE.Color(TINT[w.palette] ?? '#ffffff');
  const toon: Toon = (src) => {
    const s = src as THREE.MeshStandardMaterial;
    const m = toonBase(s.map ?? null);
    m.color.copy(s.color ?? new THREE.Color(1, 1, 1)).multiply(tint);
    return m;
  };
  const W = w.map.w, H = w.map.h;
  const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const x0 = 1, x1 = W - 1, y0 = 1, y1 = H - 1;
  const jobs: Promise<void>[] = [];
  const S = (n: string) => `sigils/${n}`;

  // 바닥: 손으로 칠한 돌. 방 가장자리는 테두리 타일, 문 바깥 통로는 기본 타일
  const floors: Record<string, THREE.Matrix4[]> = {};
  const add = (n: string, m: THREE.Matrix4) => (floors[n] ??= []).push(m);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const inside = x >= x0 && x < x1 && y >= y0 && y < y1;
      // 방 안 기둥 칸에도 바닥을 깐다 (기둥 둘레가 검게 비지 않게)
      if (w.map.isWall(x, y) && !inside) continue;
      const top = y === y0, bot = y === y1 - 1, left = x === x0, right = x === x1 - 1;
      const inRoom = x >= x0 && x < x1 && y >= y0 && y < y1;
      let n = 'floor_small_01';
      let rot = ((hash(x, y) % 4) * Math.PI) / 2;
      if (inRoom && (top || bot || left || right)) {
        rot = 0;
        n = top && left ? 'floor_small_cornertrim_TL_01' : top && right ? 'floor_small_cornertrim_TR_01' : bot && left ? 'floor_small_cornertrim_BL_01'
          : bot && right ? 'floor_small_cornertrim_BR_01' : top ? 'floor_small_trim_T_01' : bot ? 'floor_small_trim_B_01' : left ? 'floor_small_trim_L_01' : 'floor_small_trim_R_01';
      }
      add(n, at(x + 0.5, 0, y + 0.5, rot));
    }
  for (const [n, m] of Object.entries(floors)) jobs.push(place(group, load, toon, S(n), m));

  // 벽 (한 조각 = 1칸): 뒷벽은 높게, 옆벽은 문 자리에 아치문, 앞은 낮은 턱 (캐릭터를 가리지 않게)
  const gateRows = (gx: number) => w.gates.filter(([x]) => x === gx).map(([, y]) => y).sort((p, q) => p - q);
  const wallA: THREE.Matrix4[] = [], wallB: THREE.Matrix4[] = [], doors: THREE.Matrix4[] = [];
  for (let x = x0; x < x1; x++) ((hash(x, 1) % 3) ? wallA : wallB).push(at(x, 0, y0 - 0.12));
  for (const [gx, side] of [[0, 1], [W - 1, -1]] as const) {
    const rows = gateRows(gx);
    const wx = side > 0 ? x0 - 0.12 : x1 + 0.12;
    for (let y = y0; y < y1; y++) {
      if (rows.includes(y)) continue;
      // wall_small 은 원점에서 +x 로 2단위 → 옆벽은 90° 돌려 z 방향으로
      wallA.push(side > 0 ? at(wx, 0, y + 1, Math.PI / 2) : at(wx, 0, y, -Math.PI / 2));
    }
    if (rows.length) doors.push(side > 0 ? at(wx, 0, rows[rows.length - 1] + 1, Math.PI / 2) : at(wx, 0, rows[0], -Math.PI / 2));
  }
  const ledge: THREE.Matrix4[] = [];
  for (let x = x0; x < x1; x++) ledge.push(at(x, 0, y1 + 0.12, 0, K, 0.07));
  jobs.push(place(group, load, toon, S('wall_small_01'), [...wallA, ...ledge]));
  jobs.push(place(group, load, toon, S('wall_small_02'), wallB));
  jobs.push(place(group, load, toon, S('door_arched_01_001'), doors));
  // 모서리 기둥 · 방 안 기둥
  jobs.push(place(group, load, toon, S('pillar_01'), [at(x0, 0, y0), at(x1, 0, y0), at(x0, 0, y1, 0, K, 0.1), at(x1, 0, y1, 0, K, 0.1)]));
  const inner: THREE.Matrix4[] = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (w.map.isWall(x, y)) inner.push(at(x + 0.5, 0, y + 0.5, 0, K));
  jobs.push(place(group, load, toon, S('pillar_02'), inner));

  // 빛: 뒷벽 횃불 (KayKit) + 앞 모서리 화로 (SigilsVault), 따뜻한 점광원이 일렁인다
  const lights: ArenaEnv['lights'] = [];
  const light = (x: number, y: number, z: number, power: number, color = 0xffa04a, dist = 9) => {
    const l = new THREE.PointLight(color, power, dist, 1.4);
    l.position.set(x, y, z);
    group.add(l);
    lights.push({ light: l, base: power, seed: x * 1.7 + z });
  };
  const tx = [x0 + 2.5, (x0 + x1) / 2, x1 - 2.5];
  jobs.push(place(group, load, toon, 'kaykit/torch_mounted', tx.map((x) => at(x, 0.95, y0 - 0.05, 0))));
  tx.forEach((x) => light(x, 1.25, y0 + 0.5, 5));
  const braziers = [[x0 + 0.6, y1 - 0.6], [x1 - 0.6, y1 - 0.6]];
  jobs.push(place(group, load, toon, S('Brazier'), braziers.map(([x, y]) => at(x, 0, y, 0, K))));
  braziers.forEach(([x, y]) => light(x, 0.9, y, 3, 0xff8a3a, 6));
  // 소품
  const Q = 'quaternius/dungeon';
  jobs.push(place(group, load, toon, Q, [at((tx[0] + tx[1]) / 2, 1.45, y0 - 0.02), at((tx[1] + tx[2]) / 2, 1.45, y0 - 0.02)], 'Banner_wall'));
  jobs.push(place(group, load, toon, Q, [at(x0 + 0.05, 1.05, y0 + 0.05, 0), at(x1 - 0.05, 1.05, y0 + 0.05, -Math.PI / 2)], 'Cobweb'));
  jobs.push(place(group, load, toon, Q, [at(x0 + 1.6, 0, y1 - 0.35, 0.6), at(x1 - 2.2, 0, y0 + 0.4, -0.4)], 'Skull'));
  jobs.push(place(group, load, toon, 'kaykit/barrel_large', [at(x0 + 0.5, 0, y0 + 0.5, 0, K * 0.5)]));
  jobs.push(place(group, load, toon, 'kaykit/crates_stacked', [at(x1 - 0.6, 0, y0 + 0.6, 0.4, K * 0.5)]));
  jobs.push(place(group, load, toon, S('pot'), [at(x0 + 1.3, 0, y0 + 0.35, 0, K), at(x1 - 1.4, 0, y0 + 0.3, 0, K * 0.8)]));
  jobs.push(place(group, load, toon, S('coffin'), [at(x1 - 1.2, 0, y1 - 0.45, 0.1, K * 0.8)]));
  await Promise.all(jobs);
  return { group, lights };
}

/** 횃불 일렁임 */
export function flicker(env: ArenaEnv, t: number) {
  for (const l of env.lights) l.light.intensity = l.base * (0.85 + 0.1 * Math.sin(t * 7 + l.seed) + 0.05 * Math.sin(t * 17.3 + l.seed * 3));
}
