// 마네킹 칠하기: 정점마다 가장 크게 붙은 뼈를 보고 부위 색을 정한다 (텍스처 없이).
// 머리 뼈 정점 중 위 · 뒤쪽은 머리카락, 앞쪽은 얼굴. 손은 피부, 몸통 · 팔은 옷, 다리는 바지, 발은 신발.
import * as THREE from 'three';

export interface BodyColors {
  skin: string;
  hair: string;
  cloth: string;
  /** 팔 (없으면 옷 색) */
  sleeve?: string;
  pants: string;
  boots: string;
  belt?: string;
}

type Region = 'head' | 'skin' | 'cloth' | 'sleeve' | 'pants' | 'boots' | 'belt';

function regionOf(bone: string): Region {
  if (bone === 'Head' || bone.startsWith('neck')) return 'head';
  if (/^(hand|index|middle|pinky|ring|thumb)_/.test(bone)) return 'skin';
  if (bone.startsWith('lowerarm')) return 'sleeve';
  if (bone.startsWith('thigh') || bone.startsWith('calf')) return 'pants';
  if (bone.startsWith('foot') || bone.startsWith('ball')) return 'boots';
  if (bone === 'pelvis') return 'belt';
  return 'cloth';
}

export function paintMannequin(root: THREE.Object3D, colors: BodyColors) {
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const geo = mesh.geometry.clone();
    mesh.geometry = geo;
    const pos = geo.getAttribute('position');
    const si = geo.getAttribute('skinIndex');
    const sw = geo.getAttribute('skinWeight');
    const bones = mesh.skeleton.bones.map((b) => b.name);
    const n = pos.count;
    const region: Region[] = new Array(n);
    // 머리 정점의 범위 (바인드 자세)
    const head = new THREE.Box3();
    for (let i = 0; i < n; i++) {
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w > bw) { bw = w; best = si.getComponent(i, k); }
      }
      region[i] = regionOf(bones[best] ?? '');
      if (region[i] === 'head') head.expandByPoint(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
    const hy = head.max.y - head.min.y, hz = head.max.z - head.min.z;
    const cz = (head.max.z + head.min.z) / 2;
    const col = (hex: string) => new THREE.Color(hex);
    const pal: Record<Region | 'hair', THREE.Color> = {
      head: col(colors.skin), skin: col(colors.skin), cloth: col(colors.cloth), sleeve: col(colors.sleeve ?? colors.cloth),
      pants: col(colors.pants), boots: col(colors.boots), belt: col(colors.belt ?? colors.pants), hair: col(colors.hair),
    };
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      let r: Region | 'hair' = region[i];
      if (r === 'head') {
        const y = (pos.getY(i) - head.min.y) / (hy || 1);
        const z = (pos.getZ(i) - cz) / (hz || 1);
        // 정수리 · 뒤통수 = 머리카락 (얼굴은 +Z 쪽), 목 아래는 피부
        if (y > 0.66 || (z < -0.05 && y > 0.3) || (z < 0.2 && y > 0.8)) r = 'hair';
      }
      const c = pal[r];
      out[i * 3] = c.r;
      out[i * 3 + 1] = c.g;
      out[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
    const mat = mesh.material as THREE.MeshToonMaterial;
    mat.vertexColors = true;
    mat.color.set('#ffffff');
    mat.needsUpdate = true;
  });
}

// ── 영웅 색 ──
const SKIN: Record<string, string> = { human: '#f0c8a8', deep_elf: '#d8d4f0', halfling: '#f4d2b2', orc: '#8ab070', dwarf: '#e2a888' };
const HAIR = ['#3a2a20', '#7a4a2a', '#c0402a', '#e8c070', '#5a4a6a', '#d8d4cc', '#2a2a36', '#9a6a3a'];
const CLASS: Record<string, Pick<BodyColors, 'cloth' | 'sleeve' | 'pants' | 'boots' | 'belt'>> = {
  warrior: { cloth: '#8a94a8', sleeve: '#6a7488', pants: '#4a4e5a', boots: '#5a3a24', belt: '#7a4a2a' },
  berserker: { cloth: '#8a5034', sleeve: '#f0c8a8', pants: '#3a2a22', boots: '#4a2e1c', belt: '#2a1e18' },
  fire_mage: { cloth: '#c8402a', pants: '#7a2418', boots: '#3a2420', belt: '#e8b040' },
  frost_mage: { cloth: '#4a7ac8', pants: '#2a4a8a', boots: '#2a2a3a', belt: '#d8e8f8' },
  hunter: { cloth: '#4a7a3a', sleeve: '#3a5a2a', pants: '#5a4630', boots: '#3a2a1c', belt: '#7a5a32' },
  priest: { cloth: '#f0ece0', pants: '#c8c0b0', boots: '#8a7a60', belt: '#e8c060' },
};

export function heroColors(cls: string, race: string, uid: number): BodyColors {
  const c = CLASS[cls] ?? CLASS.warrior;
  const skin = SKIN[race] ?? SKIN.human;
  // 광전사 팔은 맨살
  return { ...c, sleeve: c.sleeve === '#f0c8a8' ? skin : c.sleeve, skin, hair: HAIR[(uid * 7 + 3) % HAIR.length] };
}

/**
 * 얼굴: 머리 뼈 앞쪽에 눈 두 점. 쉬는 자세(= 바인드 자세)에서 얼굴 앞면 위치를 잡아 머리 뼈 자식으로 붙인다.
 * 모델 크기를 정한 뒤(스케일 적용 후) 불러야 한다
 */
export function addEyes(root: THREE.Object3D, color = '#1a1220') {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const head = mesh.skeleton.bones.find((b) => b.name === 'Head');
    if (!head) return;
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position'), si = geo.getAttribute('skinIndex'), sw = geo.getAttribute('skinWeight');
    const hi = mesh.skeleton.bones.indexOf(head);
    const box = new THREE.Box3();
    for (let i = 0; i < pos.count; i++) {
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w > bw) { bw = w; best = si.getComponent(i, k); }
      }
      if (best === hi) box.expandByPoint(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const toWorld = (p: THREE.Vector3) => p.applyMatrix4(mesh.matrixWorld);
    const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
    const headW = toWorld(new THREE.Vector3(box.min.x, c.y, c.z)).distanceTo(toWorld(new THREE.Vector3(box.max.x, c.y, c.z)));
    const bs = head.getWorldScale(new THREE.Vector3());
    const mat = new THREE.MeshBasicMaterial({ color });
    for (const side of [-1, 1]) {
      const p = toWorld(new THREE.Vector3(c.x + side * sz.x * 0.2, box.min.y + sz.y * 0.5, box.max.z - sz.z * 0.04)).applyMatrix4(inv);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      eye.position.copy(p);
      // 세로로 긴 눈 (도트 한두 칸)
      eye.scale.set((headW * 0.13) / bs.x, (headW * 0.2) / bs.y, (headW * 0.16) / bs.z);
      head.add(eye);
    }
  });
}
