import type { DifficultyId } from './data/difficulty';
import { FLOORS } from './data/encounters';
import { Input } from './input/input';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { genFloor } from './sim/gen';
import { newParty, saveFromUnit, type Hero } from './sim/hero';
import { resolvePrompt } from './sim/objects';
import { restRelief } from './sim/stress';
import { foeNotes, foeSummary } from './sim/notes';
import { newRun } from './sim/run';
import { World } from './sim/world';
import { Hud } from './ui/hud';
import { RestScreen } from './ui/rest';
import { TownScreen } from './ui/town';
import { buryFallen, finishExpedition, loadCompany, newCompany, resetCompany, saveCompany } from './sim/roster';
import { CLASSES, type ClassId } from './data/classes';
import { RACES, type RaceId } from './data/races';
import type { UnlockDef } from './data/unlocks';
import { loadMeta, recordProgress, saveMeta } from './sim/meta';
import { CharacterSheet } from './ui/sheet';
import { createUiState } from './ui/state';
import { Audio, type Sfx } from './ui/audio';

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
  // 기본은 직접 조종 (조이스틱 · 방향키). 자동 탐험은 켜야 켜진다
  explore = localStorage.getItem('bh.explore2') === 'on';
} catch {
  // 저장소를 못 쓰면 기본값
}

// ── 런과 런 사이 기록 · 해금, 용병단(명부 · 금고 · 묘지) ──
const meta = loadMeta();
recordProgress(meta, {}, 0);
let company = loadCompany(meta);
let started = false;
let outcomeRecorded = false;

function announceUnlocks(list: UnlockDef[]) {
  for (const u of list) {
    const name = u.kind === 'race' ? `종족 ${RACES[u.target as RaceId].name}` : `직업 ${CLASSES[u.target as ClassId].name}`;
    world.log(`🔓 새로 해금: ${name} (다음 런부터)`, '#ffe14d');
    toast(`🔓 새로 해금: ${name}`);
  }
}

// ── 효과음 ──
const audio = new Audio();
try {
  audio.enabled = localStorage.getItem('bh.sound') !== 'off';
} catch {
  // 저장소를 못 쓰면 기본값
}
window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('keydown', () => audio.unlock());
function updateSoundButton() {
  $('btn-sound').textContent = `소리: ${audio.enabled ? '켜짐' : '꺼짐'}`;
  $('btn-sound').classList.toggle('on', audio.enabled);
}
$('btn-sound').addEventListener('click', () => {
  audio.enabled = !audio.enabled;
  try {
    localStorage.setItem('bh.sound', audio.enabled ? 'on' : 'off');
  } catch {
    // 무시
  }
  updateSoundButton();
});
updateSoundButton();

let toastTimer = 0;
function toast(text: string) {
  const el = $('toast');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.add('hidden'), 3500);
}

function startFloor() {
  world = new World(genFloor(runSeed, depth), runSeed * 31 + depth, heroes, difficulty, run);
  // 층 시작 시점 저장 (도중에 끄면 이 층 처음부터)
  company.current = { party: heroes.map((h) => h.uid), depth, seed: runSeed, run };
  saveCompany(company);
  world.autoExplore = explore;
  announceUnlocks(recordProgress(meta, {}, depth));
  ui.selected = [];
  ui.inspect = null;
  ui.targeting = null;
  ui.paused = false;
  slowTimer = 0;
  hud.build();
  centerParty();
}

/** 거점으로 (원정이 끝났거나 처음 시작) */
function openTown(note = '') {
  rest.close();
  restOpen = false;
  ui.paused = true;
  $('outcome').classList.add('hidden');
  town.open(company, meta, note);
}

function startExpedition(party: Hero[]) {
  runSeed = (Math.random() * 1e9) | 0;
  heroes = party;
  run = newRun();
  depth = 1;
  started = true;
  outcomeRecorded = false;
  company.expeditions++;
  meta.runs++;
  saveMeta(meta);
  startFloor();
}

/** 저장된 원정 이어하기 (층 처음부터) */
function resumeExpedition(): boolean {
  const cur = company.current;
  if (!cur) return false;
  const party = cur.party.map((uid) => company.roster.find((h) => h.uid === uid)).filter((h): h is Hero => !!h);
  if (!party.length) {
    company.current = null;
    return false;
  }
  heroes = party;
  run = cur.run;
  runSeed = cur.seed;
  depth = cur.depth;
  started = true;
  outcomeRecorded = false;
  startFloor();
  toast(`${depth}층부터 원정을 이어간다`);
  return true;
}

/** 원정 끝: 승리 · 귀환은 골드를 챙기고, 전멸은 잃는다 */
function endExpedition(kind: 'victory' | 'retreat' | 'defeat') {
  const alive = new Set(world.party.filter((p) => p.alive && p.hero).map((p) => p.hero!));
  const { fallen } = kind === 'retreat' ? { fallen: [] as Hero[] } : buryFallen(company, heroes, alive, depth);
  const survivors = heroes.filter((h) => !fallen.includes(h));
  const gold = run.gold;
  finishExpedition(company, meta, survivors, run, kind !== 'defeat');
  // 원정이 끝난 월드는 더 이상 결과를 처리하지 않는다 (거점 화면 위로 결과창이 다시 뜨지 않게)
  started = false;
  const head = kind === 'victory' ? '승리하고 돌아왔다!' : kind === 'retreat' ? '무사히 귀환했다.' : '원정대가 전멸했다…';
  const lost = fallen.length ? ` 잃은 용병: ${fallen.map((h) => h.def.name).join(', ')}.` : '';
  openTown(`${head} ${kind === 'defeat' ? `번 골드 ${gold}을(를) 잃었다.` : `골드 +${gold}.`}${lost}`);
}

const town = new TownScreen(
  startExpedition,
  (h, done) => sheet.open(h, null, done),
  () => {
    resetCompany();
    company = newCompany(meta);
    saveCompany(company);
    openTown('새 용병단이 꾸려졌다.');
  },
);

function floorCleared() {
  for (const p of world.party) saveFromUnit(p);
  // 영구 사망: 쓰러진 용병은 묘지로
  const alive = new Set(world.party.filter((p) => p.alive && p.hero).map((p) => p.hero!));
  const { survivors, fallen } = buryFallen(company, heroes, alive, depth);
  heroes = survivors;
  for (const h of fallen) toast(`✝ ${h.def.name}을(를) 잃었다`);
  run.gold += 40 * depth;
  for (const h of heroes) restRelief(h);
  announceUnlocks(recordProgress(meta, run.kills, depth));
  run.kills = {};
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
  () => endExpedition('retreat'),
);

function toggleExplore() {
  explore = !explore;
  world.autoExplore = explore;
  try {
    localStorage.setItem('bh.explore2', explore ? 'on' : 'off');
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
}

function toggleHelp() {
  const h = $('help');
  const show = h.classList.contains('hidden');
  h.classList.toggle('hidden', !show);
  if (show) ui.paused = true;
}

const input = new Input(canvas, cam, ui, {
  getWorld: () => world,
  restart: () => {
    if (started && (world.outcome === 'victory' || world.outcome === 'defeat')) endExpedition(world.outcome);
  },
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
  // 처음이면 저장된 원정을 이어가거나 거점부터
  if (!started) {
    if (!resumeExpedition()) openTown();
  } else ui.paused = false;
});
$('btn-restart').addEventListener('click', () => {
  if (started && (world.outcome === 'victory' || world.outcome === 'defeat')) endExpedition(world.outcome);
});
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

/** 붕괴 · 각성 순간: 잠깐 멈추고 크게 보여 준다 (위기 설정과 무관하게 항상) */
let moodFreeze = 0;
let moodShown = 0;
function handleMoodBreaks(dt: number) {
  const mb = world.moodBreaks.shift();
  if (mb) {
    const el = $('moodbanner');
    el.querySelector('.mt')!.textContent = mb.title;
    el.querySelector('.ml')!.textContent = `「${mb.line}」`;
    el.querySelector('.md')!.textContent = mb.desc;
    el.style.setProperty('--mc', mb.color);
    el.classList.remove('hidden');
    // 다시 그려 애니메이션을 처음부터
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    cam.x = mb.unit.x;
    cam.y = mb.unit.y;
    moodFreeze = 1.4;
    moodShown = 3.2;
  }
  moodFreeze = Math.max(0, moodFreeze - dt);
  moodShown = Math.max(0, moodShown - dt);
  if (moodShown <= 0) $('moodbanner').classList.add('hidden');
}

/** 첫 조우 카드: 이번 런에서 처음 보는 몬스터면 약점 · 강함 · 대처법을 잠깐 띄운다 */
let foeCardTimer = 0;
function handleNewFoes(dt: number) {
  foeCardTimer = Math.max(0, foeCardTimer - dt);
  if (foeCardTimer > 2.5) return; // 앞 카드를 조금은 읽을 시간
  const t = world.units.find((u) => u.alive && u.faction === 'enemy' && world.isVisible(u) && !run.seen.includes(u.def.id));
  if (!t) return;
  run.seen.push(t.def.id);
  const n = foeNotes(t, world.party);
  const summary = foeSummary(t, world.party);
  const card = $('newfoe');
  card.innerHTML =
    `<div class="nf1" style="color:${t.def.color}">새로운 적 — ${t.def.glyph} ${t.name}</div>` +
    (summary ? `<div class="nf2">${summary}</div>` : '') +
    (n.tip ? `<div class="nf3">💡 ${n.tip}</div>` : '');
  // 애니메이션 다시 시작
  card.classList.add('hidden');
  void card.offsetWidth;
  card.classList.remove('hidden');
  foeCardTimer = 5;
  world.log(`새로운 적: ${t.name}${summary ? ` — ${summary}` : ''}`, '#e8cf7a');
}

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

let stopCooldown = 0;
let last = performance.now();
let acc = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  handleCrises(dt);
  handleMoodBreaks(dt);
  if (started) handleNewFoes(dt);
  if (foeCardTimer <= 0) $('newfoe').classList.add('hidden');
  for (const s of world.sfx.splice(0)) audio.play(s as Sfx);
  world.shake = Math.max(0, world.shake - dt * 40);
  // 히트스톱: 큰 타격 순간 아주 잠깐 멈춘다
  // (연달아 걸리면 끊겨 보이므로 한 번 멈춘 뒤 잠깐은 무시)
  if (stopCooldown > 0) {
    stopCooldown -= dt;
    world.hitstop = 0;
  }
  const stopped = world.hitstop > 0;
  if (stopped) {
    world.hitstop = Math.max(0, world.hitstop - dt);
    if (world.hitstop === 0) stopCooldown = 0.15;
  }
  if (!ui.paused && !world.outcome && !restOpen && moodFreeze <= 0 && !stopped) {
    acc += dt * ui.speed * (slowTimer > 0 ? 0.3 : 1);
    while (acc >= STEP) {
      world.tick(STEP);
      acc -= STEP;
    }
  }
  cam.padBottom = $('party').offsetHeight + 8;
  $('belt').style.bottom = `${cam.padBottom + 4}px`;
  // 정보 창은 소모품 벨트 위까지만 (작은 화면에서 겹치지 않게)
  const insp = $('inspect');
  insp.style.maxHeight = `${Math.max(120, window.innerHeight - cam.padBottom - insp.offsetTop - ($('belt').offsetHeight + 12))}px`;
  updatePrompt();
  input.update(dt);
  renderer.draw(world, ui);
  hud.update();

  $('btn-follow').textContent = `카메라 추적: ${cam.follow ? '켜짐' : '꺼짐'}`;
  $('btn-explore').textContent = `자동 탐험: ${explore ? '켜짐' : '꺼짐'}`;
  $('btn-explore').classList.toggle('on', explore);
  const autoOn = world.party.every((u) => u.autoMode);
  $('btn-auto').textContent = `자동전투: ${autoOn ? '켜짐' : '꺼짐'}`;
  $('btn-auto').classList.toggle('on', autoOn);
  if (started && world.outcome === 'cleared' && !restOpen && $('rest').classList.contains('hidden')) floorCleared();
  const out = $('outcome');
  if (started && (world.outcome === 'victory' || world.outcome === 'defeat')) {
    if (!outcomeRecorded) {
      outcomeRecorded = true;
      if (world.outcome === 'victory') {
        meta.wins++;
        run.gold += 400;
      }
      const fresh = recordProgress(meta, run.kills, depth);
      run.kills = {};
      announceUnlocks(fresh);
      $('outcome-unlock').textContent = fresh.length
        ? `🔓 새로 해금: ${fresh.map((u) => (u.kind === 'race' ? RACES[u.target as RaceId].name : CLASSES[u.target as ClassId].name)).join(', ')}`
        : '';
    }
    out.classList.remove('hidden');
    $('outcome-title').textContent = world.outcome === 'victory' ? '승리! 오우거 족장을 쓰러뜨렸다' : `${depth}층에서 원정대 전멸`;
    $('outcome-sub').textContent =
      world.party.map((p) => `${p.alive ? '' : '✝ '}${p.name} Lv${p.hero?.xl ?? 1}`).join(' · ') +
      ` — ${depth}/${FLOORS}층 · ${world.outcome === 'victory' ? `골드 ${run.gold}` : `골드 ${run.gold} 잃음`}`;
  } else out.classList.add('hidden');

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 개발 서버에서만: 브라우저 자동 테스트용 접근점
if (import.meta.env.DEV) (window as unknown as { __bh: object }).__bh = { get world() { return world; }, get heroes() { return heroes; }, ui };
