// 3D 룩 테스트: KayKit 캐릭터 + 셀 셰이딩 + 굵은 외곽선이 폰에서 어떻게 보이고 얼마나 버티는지 확인용.
// 게임 로직과는 독립된 작은 연출 (영웅 5명 vs 해골 무리가 계속 몰려온다).
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const BASE = './assets/';

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
const settings = { outline: 0.008, steps: 3, shadows: true, pitch: 45, dist: 28, flat: false, pixel: 0 };

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

const envMats: THREE.MeshToonMaterial[] = [];
let whiteWorld = false;
/** 원래 재질의 텍스처 · 색을 살려 툰 재질로 바꾼다. white = 텍스처를 버리고 흰색으로 */
function toonify(root: THREE.Object3D, tint?: THREE.ColorRepresentation, outline = true, white = false, ink: number[] = [0.04, 0.02, 0.06], env = false) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    const mat = new THREE.MeshToonMaterial({
      map: white ? null : src.map ?? null,
      color: white ? new THREE.Color('#f4f1ea') : src.color?.clone() ?? new THREE.Color(1, 1, 1),
      gradientMap,
    });
    if (tint) mat.color.multiply(new THREE.Color(tint));
    mat.userData.outlineParameters = { thickness: settings.outline, color: ink, visible: outline };
    if (env) {
      mat.userData.orig = { map: mat.map, color: mat.color.clone() };
      envMats.push(mat);
    }
    toonMats.push(mat);
    mesh.material = mat;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

const effect = new OutlineEffect(renderer, { defaultThickness: settings.outline, defaultColor: [0.04, 0.02, 0.06] });

// 픽셀 모드: 낮은 해상도로 그린 뒤 키우고, 가장자리에 1픽셀 윤곽 (3D 로 만든 픽셀아트 느낌)
const composer = new EffectComposer(renderer);
const pixelPass = new RenderPixelatedPass(4, scene, persp, { normalEdgeStrength: 0.35, depthEdgeStrength: 0.6 });
composer.addPass(pixelPass);
composer.addPass(new OutputPass());

// ── 에셋 ──
const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
const load = (name: string) => {
  if (!cache.has(name))
    cache.set(name, loader.loadAsync(`${BASE}${name}.glb`).then((g) => {
      // 루트 모션 제거: UAL 의 일부 공격(3타 · 돌진)은 root 뼈를 앞으로 옮겨 적을 뚫고 지나간다.
      // 위치 이동은 게임이 직접 하므로 애니메이션의 root 이동은 버린다
      for (const clip of g.animations) clip.tracks = clip.tracks.filter((t) => t.name !== 'root.position');
      return g;
    }));
  return cache.get(name)!;
};

/** 클래스별 겉모습: 어떤 모델에 어떤 소품을 보이고 무슨 색을 입히나 */
interface Look {
  /** 'kaykit/Knight' · 'quaternius/Warrior' */
  model: string;
  show: string[];
  /** 모델 키를 이 높이로 맞춘다 (팩마다 크기가 달라서) */
  height?: number;
  /** 오른손에 쥐여 줄 무기 (UAL 마네킹) */
  weapon?: string;
  /** 왼손 (방패 · 책) */
  offhand?: string;
  /** IdleOn 풍: 머리 크게 · 다리 짧게 + 점 눈 + 모자 */
  chibi?: { hat?: 'helmet' | 'wizard' | 'hood' | 'mitre' | 'bandana'; color: string };
  /** 무기 색을 살린다 (흰색으로 칠하지 않음) */
  colorWeapon?: boolean;
  /** 근접 콤보: 차례로 이어서 휘두르고, 마지막 타가 강하다 (밀쳐내기 · 멈칫) */
  combo?: string[];
  /** 멀리 있는 적에게 돌진 */
  dash?: string;
  /** 애니메이션 · 이동 속도 배율 (빠른 손맛) */
  speed?: number;
  /** 이 유닛만의 대기 · 이동 애니메이션 (좀비 걸음 등) */
  idle?: string;
  run?: string;
  tint?: string;
  attack: string;
  ranged?: string;
  scale?: number;
}
const LOOKS_K: Record<string, Look> = {
  warrior: { model: 'kaykit/Knight', show: ['1H_Sword', 'Round_Shield', 'Knight_Helmet', 'Knight_Cape'], attack: '1H_Melee_Attack_Chop' },
  berserker: { model: 'kaykit/Barbarian', show: ['2H_Axe', 'Barbarian_Hat', 'Barbarian_Cape'], attack: '2H_Melee_Attack_Chop' },
  fire_mage: { model: 'kaykit/Mage', show: ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], attack: 'Spellcast_Shoot', ranged: '#ff7a2f' },
  hunter: { model: 'kaykit/Rogue_Hooded', show: ['2H_Crossbow', 'Rogue_Cape'], attack: '2H_Ranged_Shoot', ranged: '#e8d8a0' },
  priest: { model: 'kaykit/Mage', show: ['1H_Wand', 'Spellbook', 'Mage_Cape'], tint: '#fff4d8', attack: 'Spellcast_Shoot', ranged: '#ffeeaa' },
  skeleton: { model: 'kaykit/Skeleton_Warrior', show: [], attack: '1H_Melee_Attack_Chop' },
  skeleton_mage: { model: 'kaykit/Skeleton_Mage', show: [], attack: 'Spellcast_Shoot', ranged: '#b07cff' },
  brute: { model: 'kaykit/Skeleton_Warrior', show: [], tint: '#b8d8a0', attack: '1H_Melee_Attack_Chop', scale: 1.5 },
};
/** Quaternius (CC0): 영웅 · 몬스터가 한 화풍. 키는 KayKit 영웅에 맞춘다 */
const LOOKS_Q: Record<string, Look> = {
  warrior: { model: 'quaternius/Warrior', show: [], height: 2.3, attack: 'Sword_Attack' },
  berserker: { model: 'quaternius/Monk', show: [], height: 2.3, attack: 'Attack' },
  fire_mage: { model: 'quaternius/Wizard', show: [], height: 2.3, attack: 'Spell1', ranged: '#ff7a2f' },
  hunter: { model: 'quaternius/Ranger', show: [], height: 2.3, attack: 'Bow_Shoot', ranged: '#e8d8a0' },
  priest: { model: 'quaternius/Cleric', show: [], height: 2.3, attack: 'Spell1', ranged: '#ffeeaa' },
  skeleton: { model: 'quaternius/Orc', show: [], height: 2.1, attack: 'Weapon' },
  skeleton_mage: { model: 'quaternius/Demon', show: [], height: 2.1, attack: 'Punch', ranged: '#ff7a2f' },
  ghost: { model: 'quaternius/Ghost', show: [], height: 1.8, attack: 'Headbutt' },
  wolf: { model: 'quaternius/Wolf', show: [], height: 1.4, attack: 'Attack' },
  slime: { model: 'quaternius/Glub', show: [], height: 1.4, attack: 'Headbutt' },
  brute: { model: 'quaternius/Yeti', show: [], height: 3.2, attack: 'Punch' },
};
/** mix = 영웅은 KayKit, 몬스터는 Quaternius */
/** UAL 마네킹: 전부 흰색. 영웅은 무기로, 적은 붉은 외곽선 · 크기 · 걸음새로 구분 */
const LOOKS_U: Record<string, Look> = {
  warrior: {
    model: 'ual/ual', show: [], height: 2.2, weapon: 'kaykit/w_sword_1handed', offhand: 'kaykit/w_shield_round', colorWeapon: true,
    attack: 'Sword_Attack', idle: 'Sword_Idle', combo: ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C'], dash: 'Shield_Dash_RM', speed: 1.35,
  },
  berserker: {
    model: 'ual/ual', show: [], height: 2.3, weapon: 'kaykit/w_axe_2handed', colorWeapon: true,
    attack: 'Sword_Attack', idle: 'Sword_Idle', combo: ['Sword_Regular_A', 'Sword_Regular_C', 'Sword_Attack'], dash: 'Sword_Dash_RM', speed: 1.45,
  },
  fire_mage: { model: 'ual/ual', show: [], height: 2.1, weapon: 'kaykit/w_staff', colorWeapon: true, attack: 'Spell_Simple_Shoot', ranged: '#ff7a2f', speed: 1.3 },
  hunter: { model: 'ual/ual', show: [], height: 2.1, weapon: 'kaykit/w_crossbow_2handed', colorWeapon: true, attack: 'Bow_Shoot', ranged: '#e8d8a0', speed: 1.4 },
  priest: { model: 'ual/ual', show: [], height: 2.1, weapon: 'kaykit/w_wand', offhand: 'kaykit/w_spellbook_open', colorWeapon: true, attack: 'Spell_Simple_Shoot', ranged: '#ffeeaa', speed: 1.3 },
  skeleton: { model: 'ual/ual', show: [], height: 2.1, attack: 'Zombie_Scratch', idle: 'Zombie_Idle_Loop', run: 'Zombie_Walk_Fwd_Loop' },
  skeleton_mage: { model: 'ual/ual', show: [], height: 2.0, attack: 'Spell_Simple_Shoot', ranged: '#b07cff' },
  brute: { model: 'ual/ual', show: [], height: 3.3, attack: 'Punch_Cross', idle: 'Idle_Loop' },
};
/** IdleOn 풍: 흰 치비 영웅(UAL 마네킹 변형) + 색 모자 · 무기, 적은 Quaternius 의 귀여운 몬스터 */
const LOOKS_I: Record<string, Look> = {
  warrior: { ...LOOKS_U.warrior, height: 1.7, chibi: { hat: 'helmet', color: '#9aa4b8' }, colorWeapon: true },
  berserker: { ...LOOKS_U.berserker, height: 1.8, chibi: { hat: 'bandana', color: '#e04a3a' }, colorWeapon: true },
  fire_mage: { ...LOOKS_U.fire_mage, height: 1.6, chibi: { hat: 'wizard', color: '#ff7a2f' }, colorWeapon: true },
  hunter: { ...LOOKS_U.hunter, height: 1.6, chibi: { hat: 'hood', color: '#5cae4a' }, colorWeapon: true },
  priest: { ...LOOKS_U.priest, height: 1.6, chibi: { hat: 'mitre', color: '#f0d870' }, colorWeapon: true },
  skeleton: { model: 'quaternius/Orc', show: [], height: 1.7, attack: 'Weapon' },
  skeleton_mage: { model: 'quaternius/Demon', show: [], height: 1.7, attack: 'Punch', ranged: '#ff7a2f' },
  ghost: { model: 'quaternius/Ghost', show: [], height: 1.5, attack: 'Headbutt' },
  wolf: { model: 'quaternius/Wolf', show: [], height: 1.2, attack: 'Attack' },
  slime: { model: 'quaternius/Glub', show: [], height: 1.2, attack: 'Headbutt' },
  brute: { model: 'quaternius/Yeti', show: [], height: 2.6, attack: 'Punch' },
};
let pack: 'kaykit' | 'quat' | 'mix' | 'ual' | 'idleon' = 'ual';
const HERO_KINDS = ['warrior', 'berserker', 'fire_mage', 'hunter', 'priest'];
const lookOf = (kind: string) => {
  if (pack === 'ual') return LOOKS_U[kind] ?? LOOKS_U.skeleton;
  if (pack === 'idleon') return LOOKS_I[kind] ?? LOOKS_I.skeleton;
  const q = pack === 'quat' || (pack === 'mix' && !HERO_KINDS.includes(kind));
  return q ? LOOKS_Q[kind] ?? LOOKS_Q.skeleton : LOOKS_K[kind] ?? LOOKS_K.skeleton;
};

/** 팩마다 애니메이션 이름이 달라서 후보 중 있는 것을 쓴다 */
const ANIMS = {
  idle: ['Idle_Weapon', 'Idle', 'Flying_Idle', 'Idle_Loop'],
  combat: ['Idle_Combat', 'Idle_Attacking', 'Attacking_Idle', 'Idle_Weapon', 'Idle', 'Flying_Idle', 'Idle_Loop'],
  run: ['Running_A', 'Run_Weapon', 'Run', 'Fast_Flying', 'Gallop', 'Jog_Fwd_Loop', 'Walk', 'Walk_Loop'],
  hit: ['Hit_A', 'RecieveHit', 'HitReact', 'HitRecieve', 'Idle_HitReact1', 'Hit_Chest'],
  death: ['Death_A', 'Death', 'Death01'],
};
const anim = (a: Actor, k: keyof typeof ANIMS) => {
  if ((k === 'idle' || k === 'combat') && a.look.idle) return a.look.idle;
  if (k === 'run' && a.look.run) return a.look.run;
  return ANIMS[k].find((n) => a.clips.has(n)) ?? 'Idle';
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
  /** 다음 콤보 단계 */
  combo: number;
  /** 밀려나는 속도 (넉백) */
  push: THREE.Vector3;
  /** 돌진 중 남은 시간 */
  dashT: number;
}

// 타격감: 멈칫(히트스톱) · 화면 흔들림
let hitstop = 0;
let shake = 0;

const actors: Actor[] = [];

/** 손 뼈에 무기를 붙인다. 뼈의 월드 배율을 되돌려 무기 크기를 일정하게 */
async function attach(root: THREE.Object3D, bone: string, model: string, side: Actor['side'], color = false) {
  const hand = root.getObjectByName(bone);
  if (!hand) return;
  const w = (await load(model)).scene.clone();
  toonify(w, undefined, true, !color, side === 'foe' ? [0.5, 0.06, 0.06] : undefined);
  root.updateMatrixWorld(true);
  const s = new THREE.Vector3();
  hand.getWorldScale(s);
  w.scale.setScalar(0.85 / (s.x || 1));
  w.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  hand.add(w);
}

/** IdleOn 풍 체형: 머리 크게, 다리 · 팔 짧게. 점 눈과 모자를 머리 뼈에 붙인다 */
const CHIBI = { head: 1.8, leg: 0.8, arm: 0.88, eyeUp: 0.1, eyeFwd: 0.12, eyeGap: 0.045, eye: 0.022 };
/** 애니메이션이 뼈 배율을 매 프레임 1로 되돌리므로, 갱신 뒤에 다시 입힌다 */
function chibiPose(root: THREE.Object3D) {
  const bone = (n: string) => root.getObjectByName(n);
  bone('Head')?.scale.setScalar(CHIBI.head);
  for (const n of ['thigh_l', 'thigh_r']) bone(n)?.scale.setScalar(CHIBI.leg);
  for (const n of ['upperarm_l', 'upperarm_r']) bone(n)?.scale.setScalar(CHIBI.arm);
}

function chibify(root: THREE.Object3D, c: NonNullable<Look['chibi']>) {
  const bone = (n: string) => root.getObjectByName(n);
  chibiPose(root);
  const head = bone('Head');
  if (!head) return;
  root.updateMatrixWorld(true);
  // 머리 뼈 기준이 아니라 캐릭터 기준(앞 = +Z)으로 자리를 잡고 머리에 옮겨 붙인다
  const h = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y;
  const hp = new THREE.Vector3();
  head.getWorldPosition(hp);
  const local = root.worldToLocal(hp.clone());
  const s = root.scale.x;
  const at = (dx: number, dy: number, dz: number) => root.localToWorld(local.clone().add(new THREE.Vector3(dx, dy, dz).multiplyScalar(h / s)));
  const ink = new THREE.MeshBasicMaterial({ color: 0x15121c });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(CHIBI.eye * h, 10, 8), ink);
    eye.position.copy(at(side * CHIBI.eyeGap, CHIBI.eyeUp, CHIBI.eyeFwd));
    scene.add(eye);
    head.attach(eye);
  }
  if (!c.hat) return;
  const mat = new THREE.MeshToonMaterial({ color: c.color, gradientMap });
  mat.userData.outlineParameters = { thickness: settings.outline, color: [0.04, 0.02, 0.06], visible: true };
  toonMats.push(mat);
  let geo: THREE.BufferGeometry;
  let pos = at(0, 0.17, 0.0);
  const r = 0.13 * h;
  if (c.hat === 'wizard') { geo = new THREE.ConeGeometry(r * 1.05, r * 2.6, 12); pos = at(0, 0.27, -0.01); }
  else if (c.hat === 'mitre') { geo = new THREE.ConeGeometry(r * 0.8, r * 1.8, 4); pos = at(0, 0.24, 0); }
  else if (c.hat === 'hood') { geo = new THREE.SphereGeometry(r * 1.12, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62); pos = at(0, 0.12, -0.012); }
  else if (c.hat === 'helmet') { geo = new THREE.SphereGeometry(r * 1.08, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5); pos = at(0, 0.13, -0.005); }
  else { geo = new THREE.TorusGeometry(r * 0.95, r * 0.18, 8, 16); pos = at(0, 0.14, 0); }
  const hat = new THREE.Mesh(geo, mat);
  if (c.hat === 'bandana') hat.rotation.x = Math.PI / 2;
  hat.position.copy(pos);
  scene.add(hat);
  head.attach(hat);
}

async function spawn(kind: string, side: Actor['side'], x: number, z: number, name: string): Promise<Actor> {
  const look = lookOf(kind);
  const gltf = await load(look.model);
  const root = SkeletonUtils.clone(gltf.scene);
  if (look.height) {
    const h = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y || 1;
    root.scale.setScalar(look.height / h);
  }
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    if (ACCESSORIES.test(o.name) && !look.show.includes(o.name) && !o.name.startsWith('Skeleton')) o.visible = false;
  });
  const ual = look.model === 'ual/ual';
  toonify(root, look.tint, true, ual, side === 'foe' && ual ? [0.5, 0.06, 0.06] : undefined);
  if (look.weapon) await attach(root, 'hand_r', look.weapon, side, look.colorWeapon);
  if (look.offhand) await attach(root, 'hand_l', look.offhand, side, look.colorWeapon);
  if (look.chibi) chibify(root, look.chibi);
  if (look.scale) root.scale.multiplyScalar(look.scale);
  root.position.set(x, 0, z);
  scene.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const clips = new Map<string, THREE.AnimationAction>();
  for (const c of gltf.animations) clips.set(c.name, mixer.clipAction(c));
  const a: Actor = {
    root, mixer, clips, current: null, look, side, name,
    hp: 0, maxHp: look.scale ? 200 : side === 'hero' ? 120 : 60, cd: Math.random(), busy: 0, dead: 0,
    home: new THREE.Vector3(x, 0, z),
    combo: 0, push: new THREE.Vector3(), dashT: 0,
  };
  a.hp = a.maxHp;
  play(a, anim(a, 'idle'));
  actors.push(a);
  return a;
}

function play(a: Actor, name: string, once = false) {
  const act = a.clips.get(name) ?? a.clips.get('Idle');
  if (!act || (act === a.current && !once)) return;
  act.reset();
  act.timeScale = a.look.speed ?? 1;
  act.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  act.clampWhenFinished = once;
  act.fadeIn(0.15).play();
  if (a.current && a.current !== act) a.current.fadeOut(0.15);
  a.current = act;
}

// ── 던전 방 ──
let TILE = 4;
async function buildRoom() {
  const floor = (await load('kaykit/'+'floor_tile_large')).scene;
  const box = new THREE.Box3().setFromObject(floor);
  TILE = Math.round(box.max.x - box.min.x) || 4;
  const W = 5, H = 4;
  const ox = -(W * TILE) / 2 + TILE / 2, oz = -(H * TILE) / 2 + TILE / 2;
  for (let i = 0; i < W; i++)
    for (let j = 0; j < H; j++) {
      const f = floor.clone();
      toonify(f, '#8f8580', false, false, undefined, true);
      f.position.set(ox + i * TILE, 0, oz + j * TILE);
      scene.add(f);
    }
  const wall = (await load('kaykit/'+'wall')).scene;
  const torch = (await load('kaykit/'+'torch_mounted')).scene;
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
      toonify(w, undefined, true, false, undefined, true);
      w.rotation.y = Math.PI / 2;
      w.position.set(side * (W * TILE) / 2, 0, oz + j * TILE);
      scene.add(w);
    }
  const chest = (await load('kaykit/'+'chest_gold')).scene.clone();
  toonify(chest);
  chest.position.set(ox, 0, oz + 0.3);
  scene.add(chest);
  const barrel = (await load('kaykit/'+'barrel_small')).scene.clone();
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
    const melee = pack !== 'kaykit' && pack !== 'ual' ? ['skeleton', 'wolf', 'ghost', 'slime'][(i + wave) % 4] : 'skeleton';
    const kind = i === 0 && wave % 3 === 0 ? 'brute' : i === n - 1 ? 'skeleton_mage' : melee;
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

/** 클립 길이 (배속 반영) */
const clipLen = (a: Actor, name: string) => (a.clips.get(name)?.getClip().duration ?? 0.8) / (a.look.speed ?? 1);

function hit(target: Actor, dmg: number, color: string, heavy = false, from?: Actor) {
  if (target.hp <= 0) return;
  target.hp -= dmg;
  floaters.push({ pos: target.root.position.clone().setY(2.6 * (target.look.scale ?? 1)), text: heavy ? `${dmg}!` : String(dmg), color: heavy ? '#ffd040' : color, t: 0 });
  if (heavy) {
    hitstop = Math.max(hitstop, 0.08);
    shake = Math.max(shake, 0.25);
    if (from) target.push.copy(target.root.position).sub(from.root.position).setY(0).normalize().multiplyScalar(7 / (target.look.scale ?? 1));
  }
  if (target.hp <= 0) {
    target.dead = 2.2;
    play(target, anim(target, 'death'), true);
  } else if (target.busy <= 0) {
    play(target, anim(target, 'hit'), true);
    target.busy = 0.35;
  }
}

function update(realDt: number) {
  // 히트스톱: 큰 타격 순간 세상이 거의 멈춘다
  const dt = hitstop > 0 ? realDt * 0.06 : realDt;
  hitstop = Math.max(0, hitstop - realDt);
  shake = Math.max(0, shake - realDt);
  for (const a of actors) {
    a.mixer.update(dt);
    // 넉백
    if (a.push.lengthSq() > 0.01) {
      a.root.position.addScaledVector(a.push, dt);
      a.push.multiplyScalar(Math.exp(-dt * 9));
    }
    // 방 밖으로 밀려나지 않게
    a.root.position.x = THREE.MathUtils.clamp(a.root.position.x, -9.2, 9.2);
    a.root.position.z = THREE.MathUtils.clamp(a.root.position.z, -6.8, 7.2);
    if (a.look.chibi) chibiPose(a.root);
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
        play(a, anim(a, 'run'));
      } else play(a, anim(a, 'idle'));
      continue;
    }
    tmp.copy(t.root.position).sub(a.root.position);
    face(a, tmp.x, tmp.z);
    const reach = a.look.ranged ? 9 : 1.6 * (a.look.scale ?? 1);
    const spd = a.look.speed ?? 1;
    // 돌진 중: 빠르게 붙고, 닿으면 한 대
    if (a.dashT > 0) {
      a.dashT -= dt;
      a.root.position.addScaledVector(tmp.clone().normalize(), dt * 13);
      if (d <= reach) {
        a.dashT = 0;
        hit(t, 12 + Math.floor(Math.random() * 6), '#ffffff', true, a);
        a.cd = 0.25;
      }
      continue;
    }
    if (a.look.dash && d > reach + 1 && d < 7 && a.cd <= 0 && a.busy <= 0) {
      a.dashT = 0.45;
      a.cd = 2.5;
      play(a, a.look.dash, true);
      continue;
    }
    if (d > reach) {
      if (a.busy <= 0) {
        a.root.position.addScaledVector(tmp.normalize(), dt * (a.side === 'foe' ? 2.4 : 2.8 * spd));
        play(a, anim(a, 'run'));
      }
    } else if (a.cd <= 0 && a.look.combo) {
      // 근접 콤보: 1타 · 2타는 짧게 이어지고, 마지막 타는 강하게 (넉백 · 히트스톱)
      const seq = a.look.combo;
      const step = a.combo % seq.length;
      const last = step === seq.length - 1;
      const name = seq[step];
      const len = clipLen(a, name);
      play(a, name, true);
      a.combo++;
      a.busy = len * (last ? 0.8 : 0.5);
      a.cd = last ? len * 0.85 + 0.35 : len * 0.5;
      const dmg = (last ? 14 : 7) + Math.floor(Math.random() * 5);
      setTimeout(() => hit(t, dmg, '#ffffff', last, a), len * 0.38 * 1000);
    } else if (a.cd <= 0) {
      a.cd = (a.look.ranged ? 1.6 : 1.2) / spd;
      a.busy = 0.6 / spd;
      play(a, a.look.attack, true);
      const dmg = 8 + Math.floor(Math.random() * 10);
      if (a.look.ranged) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshBasicMaterial({ color: a.look.ranged }));
        m.position.copy(a.root.position).setY(1.4);
        scene.add(m);
        shots.push({ mesh: m, from: a, to: t, t: 0 });
      } else setTimeout(() => hit(t, dmg, '#ffffff'), 250);
    } else if (a.busy <= 0) {
      play(a, anim(a, 'combat'));
      if (a.look.combo && a.cd > 0.6) a.combo = 0; // 쉬었다 치면 콤보가 처음부터
    }
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
      play(a, anim(a, 'idle'));
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
button(() => `모델: ${({ kaykit: 'KayKit', quat: 'Quaternius', mix: '혼합(영웅 KayKit)', ual: '흰 마네킹(UAL)', idleon: 'IdleOn 풍' } as const)[pack]}`, () => {
  void switchPack();
}).addEventListener('click', () => setTimeout(() => ui.querySelectorAll('button').forEach((b) => b.dispatchEvent(new Event('refresh'))), 50));
button(() => `흰 던전: ${whiteWorld ? '켜짐' : '꺼짐'}`, () => {
  whiteWorld = !whiteWorld;
  for (const m of envMats) {
    m.map = whiteWorld ? null : m.userData.orig.map;
    m.color.copy(whiteWorld ? new THREE.Color('#d8d4cc') : m.userData.orig.color);
    m.needsUpdate = true;
  }
  scene.background = new THREE.Color(whiteWorld ? '#e8e4dc' : '#15131c');
});
const PIXELS = [0, 3, 4, 6];
button(() => `픽셀: ${settings.pixel ? `${settings.pixel}px` : '끔'}`, () => {
  settings.pixel = PIXELS[(PIXELS.indexOf(settings.pixel) + 1) % PIXELS.length];
  if (settings.pixel) pixelPass.setPixelSize(settings.pixel);
});
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
  pixelPass.camera = camera;
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
  composer.setSize(w, h);
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
const PARTY: [string, number, number, string][] = [
  ['warrior', -2, 0, '브론'], ['berserker', -2, 2.4, '그롬'], ['hunter', -5, -1.5, '카이'],
  ['fire_mage', -5.5, 1.2, '엘라'], ['priest', -6.5, 3, '미라'],
];
async function spawnAll() {
  for (const [k, x, z, n] of PARTY) await spawn(k, 'hero', x, z, n);
  await spawnWave();
}

/** 모델 팩 바꾸기: 지금 있는 유닛을 모두 치우고 다시 부른다 */
async function switchPack() {
  const order = ['ual', 'idleon', 'kaykit', 'quat', 'mix'] as const;
  pack = order[(order.indexOf(pack) + 1) % order.length];
  for (const a of actors) scene.remove(a.root);
  actors.length = 0;
  for (const s of shots) scene.remove(s.mesh);
  shots.length = 0;
  spawning = true;
  await spawnAll();
  spawning = false;
}

async function main() {
  resize();
  placeCamera();
  await buildRoom();
  await spawnAll();
  document.getElementById('loading')!.remove();
  const clock = new THREE.Clock();
  let frames = 0, acc = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    update(dt);
    const shook = shake > 0;
    const off = new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0);
    if (shook) camera.position.add(off);
    if (settings.pixel > 0) composer.render();
    else if (settings.outline > 0) effect.render(scene, camera);
    else renderer.render(scene, camera);
    if (shook) camera.position.sub(off);
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
