import type { DifficultyId } from './data/difficulty';
import { Input } from './input/input';
import { Camera3D } from './render3d/camera3d';
import { Renderer3D } from './render3d/renderer3d';
import { Renderer } from './render/renderer';
import { genFloor } from './sim/gen';
import { CONTRACTS, type Contract } from './data/contracts';
import { usefulItem } from './sim/reward';
import { itemTitle } from './sim/items';
import { Rng } from './core/rng';
import { makeHeroDef } from './data/party';
import { gainXp, newHero, xpToNext } from './sim/hero';
import { newParty, saveFromUnit, type Hero } from './sim/hero';
import { resolvePrompt } from './sim/objects';
import { restRelief } from './sim/stress';
import { newRun } from './sim/run';
import { World } from './sim/world';
import { Hud } from './ui/hud';
import { RestScreen } from './ui/rest';
import { TownScreen } from './ui/town';
import { MapScreen } from './ui/mapscreen';
import { ROOM_HEAL, genExpedition, nodeDepth } from './sim/expedition';
import { genArena } from './sim/arena';
import { ROSTER_MAX, buryFallen, finishExpedition, loadCompany, newCompany, randomComp, resetCompany, saveCompany, takenNames } from './sim/roster';
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
// 그래픽: 3D(흰 마네킹 · 기본) 또는 2D(글자 토큰). 3D 에선 2D 렌더러가 겹침만 그린다
const cam = new Camera3D();
const renderer = new Renderer(canvas, cam);
const r3 = new Renderer3D($('gl') as HTMLCanvasElement, cam);
type Gfx = 'pixel' | '3d' | '2d';
let gfx: Gfx = 'pixel';
try {
  const g = localStorage.getItem('bh.gfx2');
  if (g === 'pixel' || g === '3d' || g === '2d') gfx = g;
} catch {
  // 저장소를 못 쓰면 기본값
}
let gfx3d = gfx !== '2d';
function applyGfx() {
  gfx3d = gfx !== '2d';
  // 3D 는 캐릭터가 서 있어서 조금 더 당겨 본다
  // 3D 는 캐릭터가 서 있어서 조금 더 당겨 보고, 픽셀은 팀파이트 매니저처럼 작게
  // 픽셀: 캐릭터가 도트를 넉넉히 쓰도록 크게 (키 약 28도트)
  // 도트는 2px: 캐릭터가 도트를 넉넉히 써서 부위 · 무기가 읽히게. 작은 화면(폰)은 캐릭터를 조금 크게
  const small = window.innerHeight < 520;
  cam.pixel = 2;
  cam.zoom = gfx === 'pixel' ? Math.round(Math.min(60, Math.max(small ? 46 : 40, window.innerHeight / (small ? 8 : 11)))) : gfx3d ? Math.max(cam.zoom, 64) : Math.min(cam.zoom, 48);
  cam.enabled = gfx3d;
  cam.ortho = gfx === 'pixel';
  renderer.overlay = gfx3d;
  $('gl').style.display = gfx3d ? 'block' : 'none';
  $('btn-gfx').textContent = `그래픽: ${({ pixel: '픽셀', '3d': '3D', '2d': '2D' } as const)[gfx]}`;
  r3?.resize();
}
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

/** 거점으로 (원정이 끝났거나 처음 시작) */
function openTown(note = '') {
  rest.close();
  restOpen = false;
  ui.paused = true;
  $('outcome').classList.add('hidden');
  town.open(company, meta, note);
}

function startExpedition(party: Hero[], contract: Contract) {
  runSeed = (Math.random() * 1e9) | 0;
  heroes = party;
  for (const h of heroes) h.hpFrac = h.hpFrac ?? 1;
  run = newRun();
  run.contract = contract;
  run.expedition = genExpedition(new Rng(runSeed), CONTRACTS[contract.kind]);
  depth = CONTRACTS[contract.kind].startDepth;
  company.board = company.board.filter((c) => c !== contract);
  started = true;
  outcomeRecorded = false;
  company.expeditions++;
  meta.runs++;
  saveMeta(meta);
  openMap();
}

// ── 원정 지도 · 방 (다키스트 던전식 지도 + 배틀하트식 전장) ──
let roomNode: number | null = null;

/** 지도 화면: 방과 방 사이. 여기서 저장한다 (방 도중에 끄면 지도부터 다시) */
function openMap(note = '') {
  roomNode = null;
  ui.paused = true;
  rest.close();
  restOpen = false;
  company.current = { party: heroes.map((h) => h.uid), depth, seed: runSeed, run };
  saveCompany(company);
  mapScreen.open(run.expedition!, run, heroes, note);
}

function enterNode(id: number) {
  const ex = run.expedition!;
  const node = ex.nodes[id];
  const def = CONTRACTS[run.contract?.kind ?? 'hunt'];
  ex.at = id;
  depth = nodeDepth(def, ex, node);
  // 어둠 속을 나아가는 부담 (다키스트 던전의 횃불처럼)
  for (const h of heroes) if (!h.mood) h.stress = Math.min(99, h.stress + 2);
  if (node.kind === 'camp') {
    // 야영: 체력 회복 · 스트레스 크게 감소 · 특성 · 장비 정리
    for (const h of heroes) {
      h.hpFrac = 1;
      restRelief(h);
    }
    ex.done.push(id);
    restOpen = true;
    rest.open(heroes, run, depth, runSeed + id * 997, '야영 — 모닥불 곁에서 쉰다', false);
    return;
  }
  startRoom(id);
}

function startRoom(id: number) {
  const ex = run.expedition!;
  const node = ex.nodes[id];
  const def = CONTRACTS[run.contract?.kind ?? 'hunt'];
  roomNode = id;
  const seed = runSeed * 31 + id * 7919;
  const map = genArena(seed, depth, {
    kind: node.kind, theme: def.theme, bossId: def.bossId, palette: def.palette, captive: def.kind === 'rescue' && node.kind === 'goal',
  });
  world = new World(map, seed, heroes, difficulty, run);
  world.autoExplore = false;
  announceUnlocks(recordProgress(meta, {}, depth));
  ui.selected = [];
  ui.inspect = null;
  ui.targeting = null;
  ui.paused = false;
  slowTimer = 0;
  hud.build();
  // 한 화면 전장: 방 전체가 보이게 맞추고 카메라는 고정
  // 작은 화면(폰 가로): 방 전체를 넣으면 캐릭터가 손톱만 해지므로, 가로를 채우고 위아래는 주장을 따라간다
  const small = window.innerHeight < 520;
  const vh = window.innerHeight - cam.padBottom - (small ? 30 : 60);
  const fitW = window.innerWidth / (map.width + 1), fitH = vh / (map.height * 0.85 * (small ? 0.7 : 1) + 1);
  cam.zoom = Math.max(24, Math.min(64, fitW, fitH));
  cam.x = map.width / 2;
  cam.y = map.height / 2;
  cam.follow = small;
}

/** 방 정리: 쓰러진 용병은 묘지로, 체력 · 보상 정리 후 지도로 (정예 · 보물 · 이벤트는 전리품 화면) */
function roomCleared() {
  const ex = run.expedition!;
  const node = ex.nodes[roomNode!];
  for (const p of world.party) {
    saveFromUnit(p);
    if (p.hero) p.hero.hpFrac = p.alive ? Math.min(1, Math.max(0.05, p.hp / p.stats.maxHp) + ROOM_HEAL) : 1;
  }
  const alive = new Set(world.party.filter((p) => p.alive && p.hero).map((p) => p.hero!));
  const { survivors, fallen } = buryFallen(company, heroes, alive, depth);
  heroes = survivors;
  for (const h of fallen) toast(`✝ ${h.def.name}을(를) 잃었다`);
  const bonus = node.kind === 'elite' ? 40 * depth : node.kind === 'battle' ? 12 * depth : 0;
  run.gold += bonus;
  announceUnlocks(recordProgress(meta, run.kills, depth));
  run.kills = {};
  ex.done.push(node.id);
  roomNode = null;
  if ((node.kind === 'boss' || node.kind === 'goal') && heroes.length) {
    completeContract();
    return;
  }
  const loot = run.found.length > 0 || heroes.some((h) => h.pending > 0) || node.kind === 'elite';
  if (loot) {
    restOpen = true;
    rest.open(heroes, run, depth, runSeed + node.id * 997, node.kind === 'elite' ? '정예를 쓰러뜨렸다 — 전리품' : '방을 정리했다', node.kind === 'elite');
  } else openMap(bonus ? `방을 정리했다 · 골드 +${bonus}` : '방을 정리했다');
}

/** 저장된 원정 이어하기 (지도부터) */
function resumeExpedition(): boolean {
  const cur = company.current;
  if (!cur || !cur.run.expedition) {
    if (cur) company.current = null;
    return false;
  }
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
  openMap('원정을 이어간다');
  return true;
}

/** 계약 완수: 보상 골드 + 추가 보상(아티팩트 · 구출한 용병) */
function completeContract() {
  const def = CONTRACTS[run.contract?.kind ?? 'hunt'];
  const notes: string[] = [];
  if (def.kind === 'rescue' && !run.rescued) {
    notes.push('붙잡힌 용병을 구하지 못했다 — 계약 보상 없음.');
  } else {
    run.gold += def.reward;
    notes.push(`계약 「${def.name}」 완수! 보상 ${def.reward} 골드.`);
    if (def.bonus === 'artifact') {
      const it = usefulItem(new Rng(runSeed), depth + 1, heroes, { force: 'artifact' });
      run.loot.push(it);
      notes.push(`추가 보상: ${itemTitle(it)} (보관함).`);
    }
    if (def.bonus === 'recruit') {
      const lv = Math.max(1, Math.round(heroes.reduce((s, h) => s + h.xl, 0) / heroes.length) - 1);
      const h = newHero(makeHeroDef(randomComp(meta, new Rng(runSeed), undefined, undefined, takenNames(company))));
      while (h.xl < lv) gainXp(h, xpToNext(h.xl) - h.xp);
      if (company.roster.length < ROSTER_MAX) {
        company.roster.push(h);
        notes.push(`구출한 ${h.def.name}(${h.def.title} Lv${h.xl})이(가) 용병단에 합류했다.`);
      } else notes.push(`구출한 ${h.def.name}은(는) 명부가 가득 차 떠났다.`);
    }
  }
  endExpedition('victory', notes.join(' '));
}

/** 원정 끝: 승리 · 귀환은 골드를 챙기고, 전멸은 잃는다 */
function endExpedition(kind: 'victory' | 'retreat' | 'defeat', extra = '') {
  mapScreen.close();
  // 방 밖(지도 · 쉬는 화면)에서 끝나면 지금 명단이 곧 생존자
  const alive = roomNode !== null || kind === 'defeat' ? new Set(world.party.filter((p) => p.alive && p.hero).map((p) => p.hero!)) : new Set(heroes);
  const { fallen } = kind === 'retreat' ? { fallen: [] as Hero[] } : buryFallen(company, heroes, alive, depth);
  const survivors = heroes.filter((h) => !fallen.includes(h));
  const gold = run.gold;
  finishExpedition(company, meta, survivors, run, kind !== 'defeat');
  // 원정이 끝난 월드는 더 이상 결과를 처리하지 않는다 (거점 화면 위로 결과창이 다시 뜨지 않게)
  started = false;
  const head = kind === 'victory' ? '승리하고 돌아왔다!' : kind === 'retreat' ? '무사히 귀환했다.' : '원정대가 전멸했다…';
  const lost = fallen.length ? ` 잃은 용병: ${fallen.map((h) => h.def.name).join(', ')}.` : '';
  openTown(`${head} ${extra ? `${extra} ` : ''}${kind === 'defeat' ? `번 골드 ${gold}을(를) 잃었다.` : `골드 +${gold}.`}${lost}`);
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
  () => saveCompany(company),
);


const sheet = new CharacterSheet();
const mapScreen = new MapScreen(
  enterNode,
  () => endExpedition('retreat'),
  (h) => sheet.open(h, null, () => mapScreen.open(run.expedition!, run, heroes)),
);
const rest = new RestScreen(
  () => {
    restOpen = false;
    openMap();
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

/** 자동전투: 주장도 AI 에게 맡긴다 (동료는 늘 자동) */
function toggleAutoAll() {
  const c = world.captain;
  if (c) c.autoMode = !c.autoMode;
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

window.addEventListener('resize', () => {
  renderer.resize();
  applyGfx();
});
renderer.resize();
r3.resize();
$('btn-gfx').addEventListener('click', () => {
  const order: Gfx[] = ['pixel', '3d', '2d'];
  gfx = order[(order.indexOf(gfx) + 1) % order.length];
  try {
    localStorage.setItem('bh.gfx2', gfx);
  } catch {
    // 무시
  }
  applyGfx();
});
applyGfx();
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
  // 새 몬스터 카드는 띄우지 않는다 (몬스터 정보는 적을 눌러 정보 창에서)
  $('newfoe').classList.add('hidden');
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
  if (gfx3d) r3.draw(world, ui, dt);
  else world.vfx.length = 0;
  renderer.draw(world, ui);
  hud.update();

  $('btn-follow').textContent = `카메라 추적: ${cam.follow ? '켜짐' : '꺼짐'}`;
  $('btn-explore').textContent = `자동 탐험: ${explore ? '켜짐' : '꺼짐'}`;
  $('btn-explore').classList.toggle('on', explore);
  const autoOn = !!world.captain?.autoMode;
  $('btn-auto').textContent = `주장 자동: ${autoOn ? '켜짐' : '꺼짐'}`;
  $('btn-auto').classList.toggle('on', autoOn);
  if (started && roomNode !== null && world.outcome === 'cleared' && !restOpen) roomCleared();
  const out = $('outcome');
  if (started && (world.outcome === 'victory' || world.outcome === 'defeat')) {
    if (!outcomeRecorded) {
      outcomeRecorded = true;
      if (world.outcome === 'victory') {
        meta.wins++;
        run.gold += CONTRACTS[run.contract?.kind ?? 'hunt'].reward;
      }
      const fresh = recordProgress(meta, run.kills, depth);
      run.kills = {};
      announceUnlocks(fresh);
      $('outcome-unlock').textContent = fresh.length
        ? `🔓 새로 해금: ${fresh.map((u) => (u.kind === 'race' ? RACES[u.target as RaceId].name : CLASSES[u.target as ClassId].name)).join(', ')}`
        : '';
    }
    out.classList.remove('hidden');
    $('outcome-title').textContent = world.outcome === 'victory' ? `승리! ${world.bossName}을(를) 쓰러뜨렸다` : `${depth}층에서 원정대 전멸`;
    $('outcome-sub').textContent =
      world.party.map((p) => `${p.alive ? '' : '✝ '}${p.name} Lv${p.hero?.xl ?? 1}`).join(' · ') +
      ` — 깊이 ${depth} · ${world.outcome === 'victory' ? `골드 ${run.gold}` : `골드 ${run.gold} 잃음`}`;
  } else out.classList.add('hidden');

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 개발 서버에서만: 브라우저 자동 테스트용 접근점
if (import.meta.env.DEV) (window as unknown as { __bh: object }).__bh = { get world() { return world; }, get heroes() { return heroes; }, get company() { return company; }, ui, r3 };
