// 비교 보기: 구운 스프라이트(왼쪽) vs 실시간 픽셀 렌더(오른쪽). 같은 시점 · 같은 도트 크기.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CELL, DIRS, SPECS, makeStage, type SheetMeta } from './bake';

const ZOOM = 4;
const ui = document.getElementById('ui')!;
const wrap = document.getElementById('wrap')!;
let dir = 0;
let anim = 'run';
let char = 0;

function btn(label: () => string, on: () => boolean, click: () => void) {
  const b = document.createElement('button');
  const r = () => {
    b.textContent = label();
    b.classList.toggle('on', on());
  };
  b.addEventListener('click', () => {
    click();
    for (const x of ui.querySelectorAll('button')) x.dispatchEvent(new Event('r'));
  });
  b.addEventListener('r', r);
  r();
  ui.appendChild(b);
}

async function main() {
  const sheets = await Promise.all(SPECS.map(async (s) => {
    const meta = (await (await fetch(`./sprites/${s.id}.json`)).json()) as SheetMeta;
    const img = new Image();
    img.src = `./sprites/${s.id}.png`;
    await img.decode();
    return { meta, img };
  }));
  for (let i = 0; i < SPECS.length; i++) btn(() => SPECS[i].id, () => char === i, () => (char = i));
  for (const a of ['idle', 'run', 'atk1', 'atk2', 'atk3', 'hit', 'death']) btn(() => a, () => anim === a, () => (anim = a));
  btn(() => `방향 ${dir} ↻`, () => false, () => (dir = (dir + 1) % DIRS));

  // 왼쪽: 스프라이트
  const left = document.createElement('div');
  left.className = 'panel';
  left.innerHTML = '<h3>미리 구운 스프라이트</h3>';
  const sc = document.createElement('canvas');
  sc.width = sc.height = CELL * ZOOM;
  left.appendChild(sc);
  wrap.appendChild(left);
  const sctx = sc.getContext('2d')!;
  sctx.imageSmoothingEnabled = false;

  // 오른쪽: 실시간 픽셀
  const right = document.createElement('div');
  right.className = 'panel';
  right.innerHTML = '<h3>실시간 픽셀 렌더 (지금 게임)</h3>';
  // 지금 게임과 같은 원리: 낮은 해상도(48×48)로 바로 그리고 4배로 키운다
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(CELL, CELL, false);
  renderer.domElement.style.width = renderer.domElement.style.height = `${CELL * ZOOM}px`;
  renderer.setClearColor('#2a2620');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  right.appendChild(renderer.domElement);
  wrap.appendChild(right);
  const stages = await Promise.all(SPECS.map((s) => makeStage(s, renderer)));
  const composers = stages.map((st) => {
    const c = new EffectComposer(renderer);
    c.setSize(CELL, CELL);
    c.addPass(new RenderPixelatedPass(1, st.scene, st.cam, { normalEdgeStrength: 0.25, depthEdgeStrength: 1 }));
    c.addPass(new OutputPass());
    return c;
  });

  let last = performance.now(), t = 0, lastKey = '';
  const loop = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    t += dt;
    const { meta, img } = sheets[char];
    const a = meta.anims[anim] ?? meta.anims.idle;
    const key = `${char}:${anim}`;
    if (key !== lastKey) {
      t = 0;
      lastKey = key;
    }
    let f = Math.floor(t * meta.fps);
    f = a.loop ? f % a.frames : Math.min(f, a.frames - 1);
    if (!a.loop && t > a.frames / meta.fps + 0.6) t = 0;
    sctx.clearRect(0, 0, sc.width, sc.height);
    sctx.fillStyle = '#2a2620';
    sctx.fillRect(0, 0, sc.width, sc.height);
    sctx.drawImage(img, f * CELL, (a.row + dir) * CELL, CELL, CELL, 0, 0, CELL * ZOOM, CELL * ZOOM);
    // 실시간: 같은 동작을 같은 시각으로
    const spec = SPECS[char].anims[anim] ?? SPECS[char].anims.idle;
    const st = stages[char];
    const clip = st.clips.get(spec.clip);
    if (clip) {
      st.pivot.rotation.y = -(dir * Math.PI) / 4;
      st.mixer.stopAllAction();
      const act = st.mixer.clipAction(clip);
      act.reset().play();
      const tt = t * (spec.speed ?? 1);
      act.time = spec.loop ? tt % clip.duration : Math.min(tt, clip.duration - 1e-3);
      st.mixer.update(0);
    }
    // 픽셀 패스 없이 48×48 로 바로 그린다 (실시간 저해상도 렌더의 본질)
    renderer.render(st.scene, st.cam);
    void composers;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
void main();
