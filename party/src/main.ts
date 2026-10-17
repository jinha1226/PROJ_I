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
  if (!ui.paused && !world.outcome) {
    acc += dt * ui.speed;
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
