import {Color, DirectionalLight, HemisphereLight, PerspectiveCamera, PointLight, Scene, type Object3D} from 'three';
import {Rng} from '../core/rng';
import type {AssetLibrary} from '../render/assets';
import {buildMerc, randomLook, type MercView} from '../render/mercLook';
import type {Stage} from '../render/stage';
import {el} from '../ui/dom';

const COLS = 6;
const ROWS = 2;
const SPACING_X = 2.3;
const SPACING_Z = 3.2;
const POSES = ['Idle', 'Idle', '2H_Melee_Idle', 'Cheer', 'Interact', 'Unarmed_Idle'];
const NAMES = ['브란', '에이다', '롤프', '세라', '고드윈', '마야', '토르비', '이솔', '카엘', '루나', '도윈', '헤일'];

/** `?mix`: a lineup of randomly assembled KayKit mercenaries for judging the part-mixing idea. */
export function startMixDemo(stage: Stage, assets: AssetLibrary): void {
  const scene = new Scene();
  scene.background = new Color(0x0d0e14);
  scene.add(new HemisphereLight(0xb8c4e8, 0x2a2018, 1.2));
  const key = new DirectionalLight(0xfff0dc, 1.6);
  key.position.set(-4, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -10, right: 10, top: 8, bottom: -8});
  scene.add(key);
  const warm = new PointLight(0xff9a4a, 25, 14, 1.6);
  warm.position.set(-6, 3, 3);
  scene.add(warm);
  const cool = new PointLight(0x8aa8ff, 25, 14, 1.6);
  cool.position.set(6, 3, 3);
  scene.add(cool);

  const floor = assets.pieces.get('floor_tile_large');
  for (let x = -3; x <= 3; x++) {
    for (let z = -2; z <= 1; z++) {
      if (!floor) break;
      const f = floor.clone();
      f.position.set(x * 4, 0, z * 4);
      f.traverse(n => (n.receiveShadow = true));
      scene.add(f);
    }
  }

  const camera = new PerspectiveCamera(32, 1, 0.5, 100);
  camera.position.set(0, 8.5, 14);
  camera.lookAt(0, 1.1, -1.4);

  const labels = el('div', 'mixLabels');
  document.body.append(labels);
  const bar = el('div', 'mixBar', '<b>KayKit 부품 조합 예시</b><span>머리 · 몸통 · 팔 · 다리 · 모자 · 망토 · 무기 · 방패 · 옷 색을 무작위로 섞은 용병 12명</span>');
  const reroll = el('button', 'primaryBtn', '다시 섞기');
  bar.append(reroll);
  document.body.append(bar);

  let mercs: (MercView & {label: HTMLElement})[] = [];
  let seed = 1;
  const roll = (): void => {
    for (const m of mercs) {
      scene.remove(m.root);
      m.label.remove();
    }
    const rng = new Rng(seed++ * 7919);
    mercs = Array.from({length: COLS * ROWS}, (_, i) => {
      const look = randomLook(rng);
      const view = buildMerc(assets, look);
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      view.root.position.set((col - (COLS - 1) / 2) * SPACING_X + (row ? SPACING_X / 2 : 0), 0, -row * SPACING_Z);
      view.root.rotation.y = rng.range(-0.35, 0.35);
      view.play(rng.pick(POSES));
      view.mixer.update(rng.range(0, 2));
      scene.add(view.root);
      const parts = [...new Set(Object.values(look.parts))].join(' + ');
      const label = el('div', 'mixLabel', `<b>${NAMES[i]}</b><small>${parts.replace(/_Hooded/g, '(후드)')}</small>`);
      labels.append(label);
      return {...view, label};
    });
  };
  reroll.addEventListener('click', roll);
  roll();

  let last = performance.now();
  const loop = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const canvas = stage.canvas;
    camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    camera.updateProjectionMatrix();
    for (const m of mercs) m.mixer.update(dt);
    stage.renderScene(scene, camera);
    for (const m of mercs) placeLabel(m.root, m.label, camera, canvas);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function placeLabel(root: Object3D, label: HTMLElement, camera: PerspectiveCamera, canvas: HTMLCanvasElement): void {
  const v = root.position.clone();
  v.y = 2.9;
  v.project(camera);
  label.style.transform = `translate(${((v.x + 1) / 2) * canvas.clientWidth}px, ${((1 - v.y) / 2) * canvas.clientHeight}px) translate(-50%, -100%)`;
}
