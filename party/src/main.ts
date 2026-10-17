import { MAP1 } from './data/maps';
import { Input } from './input/input';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { World } from './sim/world';
import { Hud } from './ui/hud';
import { createUiState } from './ui/state';

const STEP = 1 / 60;
const $ = (id: string) => document.getElementById(id)!;

const canvas = $('game') as HTMLCanvasElement;
const cam = new Camera();
const renderer = new Renderer(canvas, cam);
const ui = createUiState();
let world = new World(MAP1, (Math.random() * 1e9) | 0);

function restart() {
  world = new World(MAP1, (Math.random() * 1e9) | 0);
  ui.selected = [];
  ui.inspect = null;
  ui.targeting = null;
  ui.paused = false;
  slowTimer = 0;
  hud.build();
  centerParty();
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
});
const hud = new Hud(ui, () => world, (slot) => input.useSkill(slot, false));

$('btn-pause').addEventListener('click', togglePause);
$('btn-all').addEventListener('click', () => (ui.selected = world.party.filter((u) => u.alive)));
$('btn-auto').addEventListener('click', toggleAutoAll);
$('btn-auto').classList.add('on');
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
for (const id of ['top', 'party', 'skillbar', 'inspect']) $(id).addEventListener('contextmenu', (e) => e.preventDefault());

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
  if (!ui.paused && !world.outcome) {
    acc += dt * ui.speed * (slowTimer > 0 ? 0.3 : 1);
    while (acc >= STEP) {
      world.tick(STEP);
      acc -= STEP;
    }
  }
  input.update(dt);
  renderer.draw(world, ui);
  hud.update();

  $('btn-follow').textContent = `카메라 추적: ${cam.follow ? '켜짐' : '꺼짐'}`;
  const out = $('outcome');
  if (world.outcome) {
    out.classList.remove('hidden');
    $('outcome-title').textContent = world.outcome === 'victory' ? '승리! 오우거 족장을 쓰러뜨렸다' : '파티 전멸';
  } else out.classList.add('hidden');

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
