// 화면 흐름 · 터치 입력 (정통 턴제). 규칙은 core에 맡기고, 여기서는 누른 칸을 행동으로 바꾼다
// 글은 text.ts, 시작 · 맵 사이 · 끝 화면은 screens.ts, 보드 그리기는 view.ts
import { chebyshev, eq, heroUnit, unitAt } from '../core/board';
import { threatCells } from '../core/enemy';
import { act, enemyNear, heroSteps, leave, nextStepToward, onStairs, stepHero, swapWeapon, useItem, wait } from '../core/game';
import { attackRange, perform, shortfall, skillCd, skillPower, skillReady, targets, type ActionKind } from '../core/hero';
import { applyItem, identifiable, isKnown, itemTargets } from '../core/items';
import { chooseReward, skipReward } from '../core/rewards';
import { nextMap, settle, spendPoint, startRun, type Run } from '../core/run';
import type { Battle, UseHow, Vec } from '../core/types';
import { ACT1 } from '../data/maps';
import { LEVEL_XP } from '../data/rules';
import { WEAPONS } from '../data/weapons';
import { $, range } from './dom';
import { showRunScreen, showStart, type ScreenActions } from './screens';
import { describe, identifyMenu, idleInfo, itemInfo, itemMenu } from './text';
import { drawBoard } from './view';

const cv = $('board') as HTMLCanvasElement;

/** 멀리 누른 칸으로 자동으로 걸을 때 한 걸음 사이 (ms) */
const WALK_DELAY = 90;
/** 자동 걷기 최대 걸음 */
const WALK_MAX = 20;

let run: Run | null = null;
/** 'move': 누르면 걷거나 붙은 적을 때린다 / 'attack' · 'skill' · 'item': 대상 고르기 (미리보기 → 확정) */
type Mode = 'move' | ActionKind | 'item';
let mode: Mode = 'move';
/** 쓸 소모품 (가방 안 순서)과 쓰는 법 */
let itemIdx = 0;
let itemHow: UseHow = 'read';
/** 소모품 고르는 중 (정보 칸에 목록) */
let picking = false;
/** 미리보기: 내 피해를 최소로 굴린 결과와 최대로 굴린 결과 (실제 굴림은 엿볼 수 없다) */
let pending: { cell: Vec; preview: Battle; alt: Battle } | null = null;
let threat: Vec[] | undefined;
let info = '';
let cellPx = 40;
let busy = false;

// ── 그리기 ─────────────────────────────

/** 지금 고르는 행동의 대상 칸 */
function modeCells(b: Battle): Vec[] {
  if (mode === 'move') return [];
  if (mode === 'item') return itemTargets(b, itemIdx, itemHow);
  return targets(b, mode).map((t) => t.cell);
}

/** 대상 칸에 지금 행동을 실행한다 (턴은 넘기지 않는다) */
function performMode(b: Battle, cell: Vec): boolean {
  if (mode === 'move') return false;
  if (mode === 'item') return applyItem(b, itemIdx, itemHow, cell);
  return perform(b, mode, cell);
}

function render(): void {
  if (!run) return showStart(screens);
  const live = run.battle;
  const b = pending?.preview ?? live;
  renderTop(live);
  const moves = mode === 'move' && !pending ? heroSteps(live) : undefined;
  const tgs = mode !== 'move' && !pending ? modeCells(live) : undefined;
  cellPx = drawBoard(cv, b, { moves, threat, targets: tgs, selected: pending?.cell, base: pending ? live : undefined, alt: pending?.alt });
  renderActions(live);
  renderInfo(live);
  const lines = (pending ? pending.preview.log : live.log).slice(-6);
  $('log').innerHTML = lines.map((l) => `<div class="${l.tone}">${l.text}</div>`).join('');
  showRunScreen(run, screens);
}

function renderTop(b: Battle): void {
  const h = b.hero;
  const me = heroUnit(b);
  const need = LEVEL_XP[h.level] ?? h.xp;
  const prev = LEVEL_XP[h.level - 1] ?? 0;
  const xpPct = need > prev ? ((h.xp - prev) / (need - prev)) * 100 : 100;
  const w = WEAPONS[h.weapon];
  const short = shortfall(h, h.weapon);
  $('top').innerHTML = `
    <div class="row"><b>${b.mapName}</b><span class="dim">${run!.mapIdx + 1}/${ACT1.length} · ${b.turn}턴</span></div>
    <div class="bar"><i style="width:${(Math.max(0, me.hp) / me.maxHp) * 100}%"></i><span>체력 ${Math.max(0, me.hp)} / ${me.maxHp}</span></div>
    <div class="bar"><i class="xp" style="width:${xpPct}%"></i><span>레벨 ${h.level} · 경험치 ${h.xp}${LEVEL_XP[h.level] ? ` / ${need}` : ''}</span></div>
    <div class="row"><span>힘 ${h.stats.str} · 민첩 ${h.stats.dex} · 지능 ${h.stats.int}</span>
      <span>${w.name} 공격 ${range(attackRange(h))}${short ? ` <span style="color:var(--red)">(${short})</span>` : ''}</span></div>`;
}

function renderActions(b: Battle): void {
  const h = b.hero;
  const w = WEAPONS[h.weapon];
  const cd = h.cooldown[h.weapon] ?? 0;
  const play = b.status === 'play' && !busy;
  const el = $('actions');
  el.innerHTML = '';
  const btn = (label: string, sub: string, on: boolean, enabled: boolean, fn: () => void) => {
    const x = document.createElement('button');
    x.innerHTML = `${label}<small>${sub}</small>`;
    x.className = on ? 'on' : '';
    x.disabled = !enabled;
    x.onclick = fn;
    el.appendChild(x);
  };
  /** 한 턴을 쓰는 버튼: 고르던 것을 지우고 실행 */
  const now = (fn: () => void) => () => {
    reset();
    fn();
    after();
  };
  btn('조준', `${w.name} 공격`, mode === 'attack', play, () => choose('attack'));
  btn(w.skill.name, cd > 0 ? `대기 ${cd}턴` : `기술 · 대기 ${skillCd(h)}`, mode === 'skill', play && skillReady(b), () => choose('skill'));
  btn('소모품', h.items.length ? `${h.items.length}개` : '없음', mode === 'item' || picking, play && h.items.length > 0, openItems);
  btn('교체', h.spare ? WEAPONS[h.spare].name : '예비 없음', false, play && !!h.spare, now(() => swapWeapon(b)));
  btn('기다리기', '한 턴 쉰다', false, play, now(() => wait(b)));
  btn('나가기', onStairs(b) ? '처치 경험치만' : '계단 위에서', false, play && onStairs(b), now(() => leave(b)));
}

/** 정보 칸: 안내 · 설명 · 소모품 목록 (목록 버튼을 연결한다) */
function renderInfo(live: Battle): void {
  const el = $('info');
  el.innerHTML = info || idleInfo(live);
  el.querySelectorAll<HTMLButtonElement>('button[data-i]').forEach((x) => {
    x.onclick = () => pickItem(Number(x.dataset.i), x.dataset.how as UseHow);
  });
  el.querySelectorAll<HTMLButtonElement>('button[data-pick]').forEach((x) => {
    x.onclick = () => {
      reset();
      useItem(live, itemIdx, 'read', heroUnit(live).pos, Number(x.dataset.pick));
      after();
    };
  });
}

/** 겹치는 화면에서 고른 것 */
const screens: ScreenActions = {
  start(w) {
    run = startRun(w);
    reset();
    render();
  },
  reward(idx) {
    if (!run) return;
    if (idx === null) skipReward(run);
    else chooseReward(run, idx);
    render();
  },
  stat(s) {
    if (run) spendPoint(run, s);
    render();
  },
  next() {
    if (run) nextMap(run);
    reset();
    render();
  },
  again() {
    run = null;
    reset();
    render();
  },
};

// ── 입력 ─────────────────────────────

function reset(): void {
  mode = 'move';
  picking = false;
  pending = null;
  threat = undefined;
  info = '';
}

/** 소모품 목록을 정보 칸에 띄운다. 하나를 누르면 그걸 쓸 칸을 고른다 */
function openItems(): void {
  if (!run || busy) return;
  if (picking || mode === 'item') {
    reset();
    return render();
  }
  reset();
  picking = true;
  info = itemMenu(run.battle.hero);
  render();
}

/** 목록에서 하나를 골랐다: 모르는 물건 · 칸이 하나뿐이면 바로 쓰고, 감정은 감정할 것을 고르고, 아니면 칸 고르기 */
function pickItem(idx: number, how: UseHow): void {
  if (!run) return;
  const b = run.battle;
  const id = b.hero.items[idx];
  if (!id) return;
  itemIdx = idx;
  itemHow = how;
  picking = false;
  const cells = itemTargets(b, idx, how);
  if (id === 'identify' && isKnown(b.hero, id)) {
    const can = identifiable(b.hero, idx);
    if (can.length > 1) {
      info = identifyMenu(b.hero, can);
      return render();
    }
  }
  if (!isKnown(b.hero, id) && cells.length === 1) {
    reset();
    useItem(b, idx, how, cells[0]!);
    return after();
  }
  choose('item');
}

function choose(kind: ActionKind | 'item'): void {
  if (!run || busy) return;
  if (mode === kind) {
    reset();
    return render();
  }
  reset();
  mode = kind;
  const b = run.battle;
  const tgs = modeCells(b);
  const w = WEAPONS[b.hero.weapon];
  info = kind === 'item' ? itemInfo(b.hero, itemIdx, itemHow)
    : kind === 'skill' ? `<b>${w.skill.name}</b>: ${w.skill.desc}${skillPower(b.hero) ? ` (지능 위력 +${skillPower(b.hero)})` : ''}` : `<b>${w.name}</b>: ${w.desc} — 빈칸에도 쏠 수 있다`;
  if (!tgs.length) info += '<br><span class="warn">지금은 대상이 없다</span>';
  else if (tgs.length === 1) return preview(tgs[0]!); // 주변 공격처럼 대상이 하나면 바로 미리보기
  else info += '<br>노란 칸을 누르면 결과를 미리 보여준다';
  render();
}

function preview(cell: Vec): void {
  if (!run || mode === 'move') return;
  const pv = structuredClone(run.battle);
  const alt = structuredClone(run.battle);
  pv.roll = 'min';
  alt.roll = 'max';
  const from = pv.log.length;
  if (!performMode(pv, cell) || !performMode(alt, cell)) return;
  pending = { cell, preview: pv, alt };
  const said = pv.log.slice(from).map((l) => l.text.replace(/ \(-\d+\)$/, '')).join(' · ');
  info = `<b>미리보기</b> — 같은 칸을 한 번 더 누르면 실행 (그다음 적이 움직인다). 피해는 숫자 범위 안에서 정해진다<br>${said || '아무 일도 일어나지 않는다'}`;
  render();
}

function after(): void {
  if (!run) return;
  settle(run);
  render();
}

/** 멀리 누른 칸까지 한 걸음씩. 적이 2칸 안에 들어오거나 맞으면 멈춘다 */
async function walkTo(to: Vec): Promise<void> {
  if (!run) return;
  busy = true;
  const b = run.battle;
  for (let i = 0; i < WALK_MAX && b.status === 'play'; i++) {
    const me = heroUnit(b);
    if (eq(me.pos, to)) break;
    const next = nextStepToward(b, to);
    if (!next) {
      info = '그곳까지 갈 길이 없다.';
      break;
    }
    const hp = me.hp;
    stepHero(b, next);
    render();
    if (me.hp < hp || enemyNear(b)) break;
    await new Promise((r) => setTimeout(r, WALK_DELAY));
  }
  busy = false;
  after();
}

/** 대상 고르기 중에 누른 칸: 같은 칸이면 실행, 대상이면 미리보기 (모르는 물건은 바로). 처리 못 했으면 false */
function tapWhileChoosing(b: Battle, cell: Vec): boolean {
  if (pending && eq(pending.cell, cell)) {
    const kind = mode;
    reset();
    if (kind === 'item') useItem(b, itemIdx, itemHow, cell);
    else if (kind !== 'move') act(b, kind, cell);
    after();
    return true;
  }
  if (!modeCells(b).some((p) => eq(p, cell))) return false;
  // 모르는 물건은 미리보기가 정체를 흘리므로 바로 쓴다
  const it = b.hero.items[itemIdx];
  if (mode === 'item' && it && !isKnown(b.hero, it)) {
    reset();
    useItem(b, itemIdx, itemHow, cell);
    after();
    return true;
  }
  preview(cell);
  return true;
}

cv.addEventListener('click', (e) => {
  if (!run || run.phase !== 'battle' || busy) return;
  const r = cv.getBoundingClientRect();
  const cell = { x: Math.floor((e.clientX - r.left) / cellPx), y: Math.floor((e.clientY - r.top) / cellPx) };
  const b = run.battle;
  if (cell.x < 0 || cell.y < 0 || cell.x >= b.w || cell.y >= b.h || b.status !== 'play') return;

  if (mode !== 'move') {
    if (tapWhileChoosing(b, cell)) return;
    reset();
  }

  const me = heroUnit(b);
  const foe = unitAt(b, cell);
  // 닿는 적을 누르면 바로 공격
  if (foe && foe.kind !== 'hero' && targets(b, 'attack').some((t) => eq(t.cell, cell))) {
    reset();
    act(b, 'attack', cell);
    return after();
  }
  if (foe) {
    info = describe(b, cell);
    threat = threatCells(b, foe);
    return render();
  }
  if (heroSteps(b).some((p) => eq(p, cell))) {
    reset();
    stepHero(b, cell);
    return after();
  }
  if (chebyshev(cell, me.pos) > 1 && nextStepToward(b, cell)) {
    reset();
    void walkTo(cell);
    return;
  }
  threat = undefined;
  info = describe(b, cell);
  render();
});

window.addEventListener('resize', render);
render();
