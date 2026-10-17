import type { DifficultyId } from './data/difficulty';
import { FLOORS } from './data/encounters';
import { Input } from './input/input';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { genFloor } from './sim/gen';
import { newParty, saveFromUnit, type Hero } from './sim/hero';
import { resolvePrompt } from './sim/objects';
import { newRun } from './sim/run';
import { World } from './sim/world';
import { Hud } from './ui/hud';
import { RestScreen } from './ui/rest';
import { CharacterSheet } from './ui/sheet';
import { createUiState } from './ui/state';

const STEP = 1 / 60;
const $ = (id: string) => document.getElementById(id)!;

const canvas = $('game') as HTMLCanvasElement;
const cam = new Camera();
const renderer = new Renderer(canvas, cam);
const ui = createUiState();
// ── 런: 5층. 층마다 새 World 를 만들고 영웅(성장 데이터)만 이어진다 ──
let runSeed = (Math.random() * 1e9) | 0;
let heroes: Hero[] = newParty();
let depth = 1;
let difficulty: DifficultyId = 'normal';
try {
  const d = localStorage.getItem('bh.difficulty');
  if (d === 'easy' || d === 'normal' || d === 'hard') difficulty = d;
} catch {
  // 저장소를 못 쓰면 기본값
}
let run = newRun();
let world = new World(genFloor(runSeed, depth), runSeed * 31 + depth, heroes, difficulty, run);
let restOpen = false;

let explore = true;
try {
  explore = localStorage.getItem('bh.explore') !== 'off';
} catch {
  // 저장소를 못 쓰면 기본값
}

function startFloor() {
  world = new World(genFloor(runSeed, depth), runSeed * 31 + depth, heroes, difficulty, run);
  world.autoExplore = explore;
  ui.selected = [];
  ui.inspect = null;
  ui.targeting = null;
  ui.paused = false;
  slowTimer = 0;
  hud.build();
  centerParty();
}

function restart() {
  runSeed = (Math.random() * 1e9) | 0;
  heroes = newParty();
  run = newRun();
  depth = 1;
  rest.close();
  restOpen = false;
  startFloor();
}

function floorCleared() {
  for (const p of world.party) saveFromUnit(p);
  restOpen = true;
  rest.open(heroes, run, depth, runSeed + depth * 997);
}

const sheet = new CharacterSheet();
const rest = new RestScreen(
  () => {
    restOpen = false;
    depth++;
    startFloor();
  },
  (h, done) => sheet.open(h, null, done),
);

function toggleExplore() {
  explore = !explore;
  world.autoExplore = explore;
  try {
    localStorage.setItem('bh.explore', explore ? 'on' : 'off');
  } catch {
    // 무시
  }
}

function centerParty() {
  const L = world.party[0];
  cam.x = L.x + 3;
  cam.y = L.y;
  cam.follow = true;
}

function togglePause() {
  ui.paused = !ui.paused;
}

function toggleAutoAll() {
  const on = !world.party.every((u) => u.autoMode);
  for (const u of world.party) u.autoMode = on;
  $('btn-auto').textContent = `자동전투: ${on ? '켜짐' : '꺼짐'}`;
  $('btn-auto').classList.toggle('on', on);
}

function toggleHelp() {
  const h = $('help');
  const show = h.classList.contains('hidden');
  h.classList.toggle('hidden', !show);
  if (show) ui.paused = true;
}

const input = new Input(canvas, cam, ui, {
  getWorld: () => world,
  restart,
  toggleHelp,
  togglePause,
  toggleAutoAll,
  toggleExplore,
});
const hud = new Hud(
  ui,
  () => world,
  (slot) => input.useSkill(slot, false),
  (u) => {
    // 상태창을 보는 동안은 멈춘다
    if (!u.hero) return;
    const wasPaused = ui.paused;
    ui.paused = true;
    sheet.open(u.hero, u, () => (ui.paused = wasPaused));
  },
  (i) => input.useItem(i),
);

/** 이벤트 선택지 (샘 · 제단 · 포로). 고르는 동안 월드는 멈춰 있다 */
let promptShown: object | null = null;
function updatePrompt() {
  const box = $('prompt');
  const pr = world.prompt;
  if (!pr) {
    box.classList.add('hidden');
    promptShown = null;
    return;
  }
  if (promptShown === pr) return;
  promptShown = pr;
  box.classList.remove('hidden');
  const inner = box.querySelector('.box')!;
  inner.innerHTML = `<h2>${pr.title}</h2><p>${pr.text}</p>`;
  for (const c of pr.choices) {
    const b = document.createElement('button');
    b.textContent = c.label;
    b.addEventListener('click', () => resolvePrompt(world, c.id));
    inner.appendChild(b);
  }
}

$('btn-pause').addEventListener('click', togglePause);
$('btn-all').addEventListener('click', () => (ui.selected = world.party.filter((u) => u.alive)));
$('btn-auto').addEventListener('click', toggleAutoAll);
$('btn-auto').classList.add('on');
$('btn-explore').addEventListener('click', toggleExplore);
const diffSel = $('difficulty') as HTMLSelectElement;
diffSel.value = difficulty;
diffSel.addEventListener('change', () => {
  difficulty = diffSel.value as DifficultyId;
  try {
    localStorage.setItem('bh.difficulty', difficulty);
  } catch {
    // 무시
  }
  // 첫 층에서 아직 싸우기 전이면 바로 다시 만든다
  if (depth === 1 && world.time < 1) startFloor();
});
world.autoExplore = explore;
$('btn-help').addEventListener('click', toggleHelp);
$('btn-help-close').addEventListener('click', () => {
  $('help').classList.add('hidden');
  ui.paused = false;
});
$('btn-restart').addEventListener('click', restart);
$('btn-follow').addEventListener('click', () => (cam.follow = !cam.follow));
// 위기 순간(보스 범위 공격 예고, 아군 체력 위험)에 잠깐 느려지거나 멈춘다
type CrisisMode = 'slow' | 'pause' | 'off';
const CRISIS_LABEL: Record<CrisisMode, string> = { slow: '감속', pause: '일시정지', off: '끔' };
let crisisMode: CrisisMode = 'slow';
try {
  const saved = localStorage.getItem('bh.crisis');
  if (saved === 'slow' || saved === 'pause' || saved === 'off') crisisMode = saved;
} catch {
  // 저장소를 못 쓰면 기본값
}
let slowTimer = 0;
let crisisShown = 0;
function updateCrisisButton() {
  $('btn-crisis').textContent = `위기 시: ${CRISIS_LABEL[crisisMode]}`;
  $('btn-crisis').classList.toggle('on', crisisMode !== 'off');
}
$('btn-crisis').addEventListener('click', () => {
  const order: CrisisMode[] = ['slow', 'pause', 'off'];
  crisisMode = order[(order.indexOf(crisisMode) + 1) % order.length];
  try {
    localStorage.setItem('bh.crisis', crisisMode);
  } catch {
    // 무시
  }
  updateCrisisButton();
});
updateCrisisButton();

function handleCrises(dt: number) {
  const list = world.crises.splice(0);
  if (list.length && crisisMode !== 'off') {
    const c = list[list.length - 1];
    $('crisis').textContent = c.text + (crisisMode === 'pause' ? ' (일시정지됨)' : '');
    ($('crisis') as HTMLElement).style.color = c.color;
    crisisShown = 2;
    if (crisisMode === 'slow') slowTimer = 1.6;
    else ui.paused = true;
  }
  slowTimer = Math.max(0, slowTimer - dt);
  crisisShown = Math.max(0, crisisShown - dt);
  $('crisis').classList.toggle('hidden', crisisShown <= 0);
}

const SPEEDS = [1, 1.5, 0.5];
$('btn-speed').addEventListener('click', () => {
  ui.speed = SPEEDS[(SPEEDS.indexOf(ui.speed) + 1) % SPEEDS.length];
  $('btn-speed').textContent = `속도 ${ui.speed}x`;
});
for (const id of ['top', 'party', 'inspect']) $(id).addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('resize', () => renderer.resize());
renderer.resize();
hud.build();
centerParty();

let last = performance.now();
let acc = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  handleCrises(dt);
  if (!ui.paused && !world.outcome && !restOpen) {
    acc += dt * ui.speed * (slowTimer > 0 ? 0.3 : 1);
    while (acc >= STEP) {
      world.tick(STEP);
      acc -= STEP;
    }
  }
  cam.padBottom = $('party').offsetHeight + 8;
  $('belt').style.bottom = `${cam.padBottom + 4}px`;
  updatePrompt();
  input.update(dt);
  renderer.draw(world, ui);
  hud.update();

  $('btn-follow').textContent = `카메라 추적: ${cam.follow ? '켜짐' : '꺼짐'}`;
  $('btn-explore').textContent = `자동 탐험: ${explore ? '켜짐' : '꺼짐'}`;
  $('btn-explore').classList.toggle('on', explore);
  if (world.outcome === 'cleared' && !restOpen && $('rest').classList.contains('hidden')) floorCleared();
  const out = $('outcome');
  if (world.outcome === 'victory' || world.outcome === 'defeat') {
    out.classList.remove('hidden');
    $('outcome-title').textContent = world.outcome === 'victory' ? '승리! 오우거 족장을 쓰러뜨렸다' : `${depth}층에서 파티 전멸`;
    $('outcome-sub').textContent = heroes.map((h) => `${h.def.name} Lv${h.xl}`).join(' · ') + ` — ${depth}/${FLOORS}층`;
  } else out.classList.add('hidden');

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 개발 서버에서만: 브라우저 자동 테스트용 접근점
if (import.meta.env.DEV) (window as unknown as { __bh: object }).__bh = { get world() { return world; }, get heroes() { return heroes; } };
