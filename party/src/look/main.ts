// 3D 룩 테스트: KayKit 캐릭터 + 셀 셰이딩 + 굵은 외곽선이 폰에서 어떻게 보이고 얼마나 버티는지 확인용.
// 게임 로직과는 독립된 작은 연출 (영웅 5명 vs 해골 무리가 계속 몰려온다).
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = './assets/kaykit/';

// ── 렌더러 · 장면 ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#15131c');
const persp = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
// 2D 느낌: 원근이 없는 카메라 (멀리 있어도 작아지지 않는다)
const ortho = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 200);
let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = persp;

scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x3a2c22, 0.8));
const sun = new THREE.DirectionalLight(0xfff0dd, 2.0);
sun.position.set(6, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
scene.add(sun);

// ── 셀 셰이딩 · 외곽선 설정 (화면 버튼으로 바꿀 수 있다) ──
const settings = { outline: 0.008, steps: 3, shadows: true, pitch: 45, dist: 28, flat: false };

function gradient(steps: number): THREE.DataTexture {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round(70 + (185 * i) / Math.max(1, steps - 1));
  const t = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
let gradientMap = gradient(settings.steps);
const toonMats: THREE.MeshToonMaterial[] = [];

/** 원래 재질의 텍스처 · 색을 살려 툰 재질로 바꾼다 */
function toonify(root: THREE.Object3D, tint?: THREE.ColorRepresentation, outline = true) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    const mat = new THREE.MeshToonMaterial({ map: src.map ?? null, color: src.color?.clone() ?? new THREE.Color(1, 1, 1), gradientMap });
    if (tint) mat.color.multiply(new THREE.Color(tint));
    mat.userData.outlineParameters = { thickness: settings.outline, color: [0.04, 0.02, 0.06], visible: outline };
    toonMats.push(mat);
    mesh.material = mat;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

const effect = new OutlineEffect(renderer, { defaultThickness: settings.outline, defaultColor: [0.04, 0.02, 0.06] });

// ── 에셋 ──
const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
const load = (name: string) => {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`${BASE}${name}.glb`));
  return cache.get(name)!;
};

/** 클래스별 겉모습: 어떤 모델에 어떤 소품을 보이고 무슨 색을 입히나 */
interface Look {
  model: string;
  show: string[];
  tint?: string;
  attack: string;
  ranged?: string;
  scale?: number;
}
const LOOKS: Record<string, Look> = {
  warrior: { model: 'Knight', show: ['1H_Sword', 'Round_Shield', 'Knight_Helmet', 'Knight_Cape'], attack: '1H_Melee_Attack_Chop' },
  berserker: { model: 'Barbarian', show: ['2H_Axe', 'Barbarian_Hat', 'Barbarian_Cape'], attack: '2H_Melee_Attack_Chop' },
  fire_mage: { model: 'Mage', show: ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], attack: 'Spellcast_Shoot', ranged: '#ff7a2f' },
  hunter: { model: 'Rogue_Hooded', show: ['2H_Crossbow', 'Rogue_Cape'], attack: '2H_Ranged_Shoot', ranged: '#e8d8a0' },
  priest: { model: 'Mage', show: ['1H_Wand', 'Spellbook', 'Mage_Cape'], tint: '#fff4d8', attack: 'Spellcast_Shoot', ranged: '#ffeeaa' },
  skeleton: { model: 'Skeleton_Warrior', show: [], attack: '1H_Melee_Attack_Chop' },
  skeleton_mage: { model: 'Skeleton_Mage', show: [], attack: 'Spellcast_Shoot', ranged: '#b07cff' },
  brute: { model: 'Skeleton_Warrior', show: [], tint: '#b8d8a0', attack: '1H_Melee_Attack_Chop', scale: 1.5 },
};
const ACCESSORIES = /(Sword|Shield|Axe|Mug|Hat|Helmet|Cape|Wand|Staff|Spellbook|Crossbow|Knife|Throwable)/;

interface Actor {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationAction>;
  current: THREE.AnimationAction | null;
  look: Look;
  side: 'hero' | 'foe';
  hp: number;
  maxHp: number;
  cd: number;
  busy: number;
  dead: number;
  home: THREE.Vector3;
  name: string;
}

const actors: Actor[] = [];

async function spawn(kind: string, side: Actor['side'], x: number, z: number, name: string): Promise<Actor> {
  const look = LOOKS[kind];
  const gltf = await load(look.model);
  const root = SkeletonUtils.clone(gltf.scene);
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    if (ACCESSORIES.test(o.name) && !look.show.includes(o.name) && !o.name.startsWith('Skeleton')) o.visible = false;
  });
  toonify(root, look.tint);
  if (look.scale) root.scale.setScalar(look.scale);
  root.position.set(x, 0, z);
  scene.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const clips = new Map<string, THREE.AnimationAction>();
  for (const c of gltf.animations) clips.set(c.name, mixer.clipAction(c));
  const a: Actor = {
    root, mixer, clips, current: null, look, side, name,
    hp: 0, maxHp: look.scale ? 200 : side === 'hero' ? 120 : 60, cd: Math.random(), busy: 0, dead: 0,
    home: new THREE.Vector3(x, 0, z),
  };
  a.hp = a.maxHp;
  play(a, 'Idle');
  actors.push(a);
  return a;
}

function play(a: Actor, name: string, once = false) {
  const act = a.clips.get(name) ?? a.clips.get('Idle');
  if (!act || (act === a.current && !once)) return;
  act.reset();
  act.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  act.clampWhenFinished = once;
  act.fadeIn(0.15).play();
  if (a.current && a.current !== act) a.current.fadeOut(0.15);
  a.current = act;
}

// ── 던전 방 ──
let TILE = 4;
async function buildRoom() {
  const floor = (await load('floor_tile_large')).scene;
  const box = new THREE.Box3().setFromObject(floor);
  TILE = Math.round(box.max.x - box.min.x) || 4;
  const W = 5, H = 4;
  const ox = -(W * TILE) / 2 + TILE / 2, oz = -(H * TILE) / 2 + TILE / 2;
  for (let i = 0; i < W; i++)
    for (let j = 0; j < H; j++) {
      const f = floor.clone();
      toonify(f, '#8f8580', false);
      f.position.set(ox + i * TILE, 0, oz + j * TILE);
      scene.add(f);
    }
  const wall = (await load('wall')).scene;
  const torch = (await load('torch_mounted')).scene;
  for (let i = 0; i < W; i++) {
    const w = wall.clone();
    toonify(w);
    w.position.set(ox + i * TILE, 0, oz - TILE / 2);
    scene.add(w);
    if (i % 2 === 1) {
      const t = torch.clone();
      toonify(t);
      t.position.set(ox + i * TILE, 0, oz - TILE / 2 + 0.5);
      scene.add(t);
      const l = new THREE.PointLight(0xffa040, 8, 9, 2);
      l.position.set(ox + i * TILE, 2.6, oz - TILE / 2 + 1);
      scene.add(l);
    }
  }
  for (const side of [-1, 1])
    for (let j = 0; j < H; j++) {
      const w = wall.clone();
      toonify(w);
      w.rotation.y = Math.PI / 2;
      w.position.set(side * (W * TILE) / 2, 0, oz + j * TILE);
      scene.add(w);
    }
  const chest = (await load('chest_gold')).scene.clone();
  toonify(chest);
  chest.position.set(ox, 0, oz + 0.3);
  scene.add(chest);
  const barrel = (await load('barrel_small')).scene.clone();
  toonify(barrel);
  barrel.position.set(-ox, 0, oz + 0.2);
  scene.add(barrel);
}

// ── 연출: 영웅은 왼쪽, 해골은 오른쪽에서 몰려온다 ──
interface Shot { mesh: THREE.Mesh; from: Actor; to: Actor; t: number }
const shots: Shot[] = [];
const floaters: { pos: THREE.Vector3; text: string; color: string; t: number }[] = [];
let wave = 0;

async function spawnWave() {
  wave++;
  const n = 3 + (wave % 2);
  for (let i = 0; i < n; i++) {
    const kind = i === 0 && wave % 3 === 0 ? 'brute' : i === n - 1 ? 'skeleton_mage' : 'skeleton';
    await spawn(kind, 'foe', 9 + Math.random() * 1.5, -3 + i * 2, kind);
  }
}

const tmp = new THREE.Vector3();
function nearest(a: Actor, side: Actor['side']) {
  let best: Actor | null = null, bd = Infinity;
  for (const b of actors) {
    if (b.side !== side || b.hp <= 0) continue;
    const d = a.root.position.distanceTo(b.root.position);
    if (d < bd) { bd = d; best = b; }
  }
  return { t: best, d: bd };
}

/** 바라보는 방향. 2D 모드에선 배틀하트처럼 왼쪽 · 오른쪽만 (살짝 화면 쪽으로 틀어 얼굴이 보이게) */
function face(a: Actor, dx: number, dz: number) {
  a.root.rotation.y = settings.flat ? (dx >= 0 ? 1 : -1) * (Math.PI / 2 - 0.45) : Math.atan2(dx, dz);
}

function hit(target: Actor, dmg: number, color: string) {
  if (target.hp <= 0) return;
  target.hp -= dmg;
  floaters.push({ pos: target.root.position.clone().setY(2.6 * (target.look.scale ?? 1)), text: String(dmg), color, t: 0 });
  if (target.hp <= 0) {
    target.dead = 2.2;
    play(target, 'Death_A', true);
  } else if (target.busy <= 0) {
    play(target, 'Hit_A', true);
    target.busy = 0.35;
  }
}

function update(dt: number) {
  for (const a of actors) {
    a.mixer.update(dt);
    if (a.hp <= 0) {
      a.dead -= dt;
      if (a.dead <= 0 && a.side === 'foe') {
        scene.remove(a.root);
        actors.splice(actors.indexOf(a), 1);
      }
      continue;
    }
    a.cd -= dt;
    a.busy -= dt;
    const foeSide = a.side === 'hero' ? 'foe' : 'hero';
    const { t, d } = nearest(a, foeSide);
    if (!t) {
      // 적이 없으면 제자리로
      const back = a.home.clone().sub(a.root.position);
      if (back.length() > 0.2) {
        a.root.position.addScaledVector(back.normalize(), dt * 3);
        face(a, back.x, back.z);
        play(a, 'Running_A');
      } else play(a, 'Idle');
      continue;
    }
    tmp.copy(t.root.position).sub(a.root.position);
    face(a, tmp.x, tmp.z);
    const reach = a.look.ranged ? 9 : 1.6 * (a.look.scale ?? 1);
    if (d > reach) {
      if (a.busy <= 0) {
        a.root.position.addScaledVector(tmp.normalize(), dt * (a.side === 'foe' ? 2.4 : 2.8));
        play(a, 'Running_A');
      }
    } else if (a.cd <= 0) {
      a.cd = a.look.ranged ? 1.6 : 1.2;
      a.busy = 0.6;
      play(a, a.look.attack, true);
      const dmg = 8 + Math.floor(Math.random() * 10);
      if (a.look.ranged) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshBasicMaterial({ color: a.look.ranged }));
        m.position.copy(a.root.position).setY(1.4);
        scene.add(m);
        shots.push({ mesh: m, from: a, to: t, t: 0 });
      } else setTimeout(() => hit(t, dmg, '#ffffff'), 250);
    } else if (a.busy <= 0) play(a, a.clips.has('Idle_Combat') ? 'Idle_Combat' : 'Idle');
  }
  for (const s of [...shots]) {
    s.t += dt;
    tmp.copy(s.to.root.position).setY(1.2).sub(s.mesh.position);
    if (tmp.length() < 0.4 || s.to.hp <= 0 || s.t > 2) {
      if (s.to.hp > 0) hit(s.to, 10 + Math.floor(Math.random() * 8), String((s.mesh.material as THREE.MeshBasicMaterial).color.getStyle()));
      scene.remove(s.mesh);
      shots.splice(shots.indexOf(s), 1);
    } else s.mesh.position.addScaledVector(tmp.normalize(), dt * 14);
  }
  // 영웅은 쓰러지면 잠시 뒤 일어난다 (연출용)
  for (const a of actors)
    if (a.side === 'hero' && a.hp <= 0 && a.dead <= 0) {
      a.hp = a.maxHp;
      play(a, 'Idle');
    }
  if (!actors.some((a) => a.side === 'foe' && a.hp > 0) && !spawning) {
    spawning = true;
    setTimeout(() => spawnWave().then(() => (spawning = false)), 1200);
  }
  for (const f of floaters) { f.t += dt; f.pos.y += dt * 1.2; }
  for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].t > 0.9) floaters.splice(i, 1);
}
let spawning = false;

// ── 2D 겹침 (체력바 · 숫자): 게임에서도 이렇게 위에 그린다 ──
const hud = document.getElementById('hud') as HTMLCanvasElement;
const hctx = hud.getContext('2d')!;
function drawHud() {
  const w = window.innerWidth, h = window.innerHeight;
  hctx.clearRect(0, 0, w, h);
  const proj = (p: THREE.Vector3) => {
    const v = p.clone().project(camera);
    return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h];
  };
  for (const a of actors) {
    if (a.hp <= 0) continue;
    const [x, y] = proj(a.root.position.clone().setY(2.5 * (a.look.scale ?? 1)));
    const bw = 34;
    hctx.fillStyle = '#000b';
    hctx.fillRect(x - bw / 2 - 1, y - 1, bw + 2, 6);
    hctx.fillStyle = a.side === 'hero' ? '#4caf50' : '#d04040';
    hctx.fillRect(x - bw / 2, y, (bw * a.hp) / a.maxHp, 4);
  }
  hctx.textAlign = 'center';
  hctx.font = 'bold 15px system-ui';
  for (const f of floaters) {
    const [x, y] = proj(f.pos);
    hctx.globalAlpha = 1 - f.t;
    hctx.lineWidth = 3;
    hctx.strokeStyle = '#000';
    hctx.strokeText(f.text, x, y);
    hctx.fillStyle = f.color;
    hctx.fillText(f.text, x, y);
  }
  hctx.globalAlpha = 1;
}

// ── 화면 버튼 ──
const ui = document.getElementById('ui')!;
function button(label: () => string, onClick: () => void) {
  const b = document.createElement('button');
  const refresh = () => (b.textContent = label());
  b.addEventListener('click', () => { onClick(); refresh(); });
  b.addEventListener('refresh', refresh);
  refresh();
  ui.appendChild(b);
  return b;
}
const OUTLINES_P = [0, 0.005, 0.008, 0.012];
const OUTLINES_O = [0, 0.003, 0.005, 0.008];
const outlines = () => (settings.flat ? OUTLINES_O : OUTLINES_P);
button(() => `외곽선: ${['없음', '얇게', '보통', '굵게'][Math.max(0, outlines().indexOf(settings.outline))]}`, () => {
  const list = outlines();
  settings.outline = list[(list.indexOf(settings.outline) + 1) % list.length];
  for (const m of toonMats) m.userData.outlineParameters.thickness = settings.outline;
});
button(() => `명암: ${settings.steps}단`, () => {
  settings.steps = settings.steps === 2 ? 3 : settings.steps === 3 ? 4 : 2;
  gradientMap = gradient(settings.steps);
  for (const m of toonMats) { m.gradientMap = gradientMap; m.needsUpdate = true; }
});
button(() => `그림자: ${settings.shadows ? '켜짐' : '꺼짐'}`, () => {
  settings.shadows = !settings.shadows;
  sun.castShadow = settings.shadows;
});
button(() => `시점: ${settings.pitch}°`, () => {
  settings.pitch = settings.pitch === 25 ? 35 : settings.pitch === 35 ? 45 : settings.pitch === 45 ? 55 : 25;
  placeCamera();
});
const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight;
const flatBtn = button(() => `2D 느낌: ${settings.flat ? '켜짐' : '꺼짐'}`, () => {
  settings.flat = !settings.flat;
  // 2D 프리셋: 원근 없음 · 낮은 시점 · 2단 명암 · 그림자 끔 · 굵은 외곽선 · 평평한 조명
  // (직교 카메라에선 외곽선 두께 계산이 달라 값이 작아야 같은 굵기로 보인다)
  if (settings.flat) Object.assign(settings, { pitch: 35, steps: 2, shadows: false, outline: 0.005 });
  else Object.assign(settings, { pitch: 45, steps: 3, shadows: true, outline: 0.008 });
  sun.castShadow = settings.shadows;
  hemi.intensity = settings.flat ? 1.4 : 0.8;
  sun.intensity = settings.flat ? 1.4 : 2.0;
  gradientMap = gradient(settings.steps);
  for (const m of toonMats) {
    m.gradientMap = gradientMap;
    m.needsUpdate = true;
    m.userData.outlineParameters.thickness = settings.outline;
  }
  placeCamera();
  for (const b of ui.querySelectorAll('button')) b.dispatchEvent(new Event('refresh'));
});
flatBtn.classList.add('on');
button(() => '확대 +', () => zoom(1 / 1.15));
button(() => '축소 −', () => zoom(1.15));

// ── 확대 · 축소 · 이동: 휠 / 두 손가락 벌리기 · 모으기 / 한 손가락 · 마우스로 끌기 ──
function zoom(k: number) {
  settings.dist = THREE.MathUtils.clamp(settings.dist * k, 6, 45);
  placeCamera();
}
const view = renderer.domElement;
view.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1);
}, { passive: false });
const pointers = new Map<number, { x: number; y: number }>();
let pinchDist = 0;
view.addEventListener('pointerdown', (e) => {
  view.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
  }
});
view.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const cur = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, cur);
  if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist > 0) zoom(pinchDist / Math.max(1, d));
    pinchDist = d;
    return;
  }
  // 끌기: 화면 이동량을 바닥 이동량으로 (거리에 비례)
  const k = settings.dist / window.innerHeight * (settings.flat ? 0.8 : 1.1);
  focus.x -= (cur.x - prev.x) * k;
  focus.z -= (cur.y - prev.y) * k / Math.sin(THREE.MathUtils.degToRad(settings.pitch));
  focus.x = THREE.MathUtils.clamp(focus.x, -12, 12);
  focus.z = THREE.MathUtils.clamp(focus.z, -10, 10);
  placeCamera();
});
const release = (e: PointerEvent) => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchDist = 0;
};
view.addEventListener('pointerup', release);
view.addEventListener('pointercancel', release);
const fpsEl = document.createElement('span');
fpsEl.id = 'fps';
ui.appendChild(fpsEl);

/** 카메라가 바라보는 바닥 지점 (끌어서 옮긴다) */
const focus = new THREE.Vector3(1, 0.8, 0);

function placeCamera() {
  camera = settings.flat ? ortho : persp;
  const p = THREE.MathUtils.degToRad(settings.pitch);
  camera.position.set(focus.x, focus.y + Math.sin(p) * settings.dist, focus.z + Math.cos(p) * settings.dist);
  camera.lookAt(focus);
  // 직교 카메라: 화면에 보이는 폭을 거리 대신 확대 값으로
  const aspect = window.innerWidth / window.innerHeight;
  const half = settings.dist * 0.2;
  Object.assign(ortho, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
  ortho.updateProjectionMatrix();
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  persp.aspect = w / h;
  persp.updateProjectionMatrix();
  placeCamera();
  const dpr = window.devicePixelRatio || 1;
  hud.width = w * dpr;
  hud.height = h * dpr;
  hud.style.width = `${w}px`;
  hud.style.height = `${h}px`;
  hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);

// ── 시작 ──
async function main() {
  resize();
  placeCamera();
  await buildRoom();
  const party: [string, number, number, string][] = [
    ['warrior', -2, 0, '브론'], ['berserker', -2, 2.4, '그롬'], ['hunter', -5, -1.5, '카이'],
    ['fire_mage', -5.5, 1.2, '엘라'], ['priest', -6.5, 3, '미라'],
  ];
  for (const [k, x, z, n] of party) await spawn(k, 'hero', x, z, n);
  await spawnWave();
  document.getElementById('loading')!.remove();
  const clock = new THREE.Clock();
  let frames = 0, acc = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    update(dt);
    if (settings.outline > 0) effect.render(scene, camera);
    else renderer.render(scene, camera);
    drawHud();
    frames++;
    acc += dt;
    if (acc >= 0.5) {
      fpsEl.textContent = `${Math.round(frames / acc)} FPS · ${renderer.info.render.calls} draw`;
      frames = 0;
      acc = 0;
    }
  });
}
main().catch((e) => {
  document.getElementById('loading')!.textContent = `불러오기 실패: ${e}`;
  console.error(e);
});
