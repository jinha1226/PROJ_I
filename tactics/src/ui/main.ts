// 화면 흐름 · 터치 입력 (정통 턴제). 규칙은 core에 맡기고, 여기서는 누른 칸을 행동으로 바꾼다
import { cellAt, chebyshev, eq, heroUnit, nameOf, unitAt } from '../core/board';
import { threatCells } from '../core/enemy';
import { act, enemyNear, heroSteps, leave, nextStepToward, onStairs, stepHero, swapWeapon, useItem, wait } from '../core/game';
import { attackRange, perform, shortfall, skillCd, skillPower, skillReady, targets, type ActionKind } from '../core/hero';
import { applyItem, identifiable, isKnown, itemName, itemTargets, itemUses } from '../core/items';
import { chooseReward, describeReward, nextMap, settle, skipReward, spendPoint, startRun, type Run } from '../core/run';
import type { Battle, HeroInfo, StatId, UseHow, Vec, WeaponId } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { ACT1 } from '../data/maps';
import { LEVEL_XP, STR_HP, TILE_NAME } from '../data/rules';
import { STAT_NAME, WEAPONS } from '../data/weapons';
import { drawBoard } from './view';

const $ = (id: string) => document.getElementById(id)!;
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

const TILE_DESC: Partial<Record<string, string>> = {
  lava: '들어가면 큰 화상. 적을 밀어 넣는 곳',
  ice: '밀리면 멈출 때까지 미끄러진다',
  pit: '떨어지면 즉사',
  water: '들어가면 다음 턴 못 걷는다. 번개가 퍼진다',
  swamp: '서 있으면 매 턴 독. 불이 닿으면 폭발',
  grass: '불이 붙으면 매 턴 번진다',
  rock: '막힌다. 밀려서 부딪히면 피해. 궁수 · 사제의 시야를 끊는다',
  stairs: '여기서 나갈 수 있다 (처치 경험치만)',
};

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
  if (!run) return showStart();
  const live = run.battle;
  const b = pending?.preview ?? live;
  renderTop(live);
  const moves = mode === 'move' && !pending ? heroSteps(live) : undefined;
  const tgs = mode !== 'move' && !pending ? modeCells(live) : undefined;
  cellPx = drawBoard(cv, b, { moves, threat, targets: tgs, selected: pending?.cell, base: pending ? live : undefined, alt: pending?.alt });
  renderActions(live);
  $('info').innerHTML = info || idleInfo(live);
  $('info').querySelectorAll<HTMLButtonElement>('button[data-i]').forEach((x) => {
    x.onclick = () => pickItem(Number(x.dataset.i), x.dataset.how as UseHow);
  });
  $('info').querySelectorAll<HTMLButtonElement>('button[data-pick]').forEach((x) => {
    x.onclick = () => {
      reset();
      useItem(live, itemIdx, 'read', heroUnit(live).pos, Number(x.dataset.pick));
      after();
    };
  });
  const lines = (pending ? pending.preview.log : live.log).slice(-6);
  $('log').innerHTML = lines.map((l) => `<div class="${l.tone}">${l.text}</div>`).join('');
  renderOverlay();
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
  btn('조준', `${w.name} 공격`, mode === 'attack', play, () => choose('attack'));
  btn(w.skill.name, cd > 0 ? `대기 ${cd}턴` : `기술 · 대기 ${skillCd(h)}`, mode === 'skill', play && skillReady(b), () => choose('skill'));
  btn('소모품', h.items.length ? `${h.items.length}개` : '없음', mode === 'item' || picking, play && h.items.length > 0, openItems);
  btn('교체', h.spare ? WEAPONS[h.spare].name : '예비 없음', false, play && !!h.spare, () => {
    reset();
    swapWeapon(b);
    after();
  });
  btn('기다리기', '한 턴 쉰다', false, play, () => {
    reset();
    wait(b);
    after();
  });
  btn('나가기', onStairs(b) ? '처치 경험치만' : '계단 위에서', false, play && onStairs(b), () => {
    reset();
    leave(b);
    after();
  });
}

const range = ([lo, hi]: readonly [number, number]) => (lo === hi ? String(lo) : `${lo}~${hi}`);

/** 능력치 1점을 올리면 바뀌는 것 (맵 사이 버튼에 보여준다) */
function statGain(h: HeroInfo, s: StatId): string {
  const next: HeroInfo = { ...h, stats: { ...h.stats, [s]: h.stats[s] + 1 } };
  const out: string[] = [];
  const [a, b] = [range(attackRange(h)), range(attackRange(next))];
  if (a !== b) out.push(`공격 ${a} → ${b}`);
  if (s === 'str') out.push(`체력 +${STR_HP}`);
  const [c, d] = [skillCd(h), skillCd(next)];
  if (c !== d) out.push(`기술 대기 ${c} → ${d}`);
  if (skillPower(next) > skillPower(h)) out.push(`기술 위력 +${skillPower(next)}`);
  return out.join('<br>') || '지금 무기에는 변화 없음';
}

function idleInfo(b: Battle): string {
  if (b.status !== 'play') return '';
  const me = heroUnit(b);
  const stuck = me.stuck > 0 ? '<br><span class="warn">물에 빠져 이번 턴은 걷지 못한다</span>' : '';
  return `옆 칸을 누르면 한 칸 걷고, 닿는 적을 누르면 공격한다. 멀리 누르면 적이 가까워질 때까지 걷는다. 적을 누르면 닿는 범위가 보인다${stuck}`;
}

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
  const h = run.battle.hero;
  const verb: Record<UseHow, string> = { drink: '마시기', throw: '던지기', read: '읽기' };
  info = `<b>어느 것을 쓸까?</b> 모르는 물건은 미리보기 없이 바로 쓴다<div class="items">${h.items.map((id, i) =>
    itemUses(id).map((how) => {
      const known = isKnown(h, id);
      const sub = known ? (how === 'throw' ? ITEMS[id].throwDesc : ITEMS[id].desc) : '정체를 모른다';
      return `<button data-i="${i}" data-how="${how}">${known ? ITEMS[id].short : itemName(h, id)} ${verb[how]}<small>${sub}</small></button>`;
    }).join('')).join('')}</div>`;
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
      info = `<b>무엇을 감정할까?</b><div class="items">${can.map((i) =>
        `<button data-pick="${i}">${itemName(b.hero, b.hero.items[i]!)}</button>`).join('')}</div>`;
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
  const it = b.hero.items[itemIdx];
  const itemDesc = it && (isKnown(b.hero, it) ? (itemHow === 'throw' ? ITEMS[it].throwDesc : ITEMS[it].desc) : '정체를 모른다 — 칸을 누르면 바로 던진다');
  info = kind === 'item' && it ? `<b>${itemName(b.hero, it)}</b>: ${itemDesc}`
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

cv.addEventListener('click', (e) => {
  if (!run || run.phase !== 'battle' || busy) return;
  const r = cv.getBoundingClientRect();
  const cell = { x: Math.floor((e.clientX - r.left) / cellPx), y: Math.floor((e.clientY - r.top) / cellPx) };
  const b = run.battle;
  if (cell.x < 0 || cell.y < 0 || cell.x >= b.w || cell.y >= b.h || b.status !== 'play') return;

  if (mode !== 'move') {
    if (pending && eq(pending.cell, cell)) {
      const kind = mode;
      reset();
      if (kind === 'item') useItem(b, itemIdx, itemHow, cell);
      else act(b, kind, cell);
      return after();
    }
    if (modeCells(b).some((p) => eq(p, cell))) {
      // 모르는 물건은 미리보기가 정체를 흘리므로 바로 쓴다
      const it = b.hero.items[itemIdx];
      if (mode === 'item' && it && !isKnown(b.hero, it)) {
        reset();
        useItem(b, itemIdx, itemHow, cell);
        return after();
      }
      return preview(cell);
    }
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

function describe(b: Battle, p: Vec): string {
  const u = unitAt(b, p);
  const c = cellAt(b, p);
  const tile = `${TILE_NAME[c.tile]}${c.fire ? ' · 불' : ''}${c.steam ? ' · 증기' : ''}${c.smoke ? ` · 연기 ${c.smoke}턴` : ''}${c.revert ? ` (${c.revert.turns}턴 뒤 ${TILE_NAME[c.revert.tile]})` : ''}`;
  if (u && u.kind !== 'hero') {
    const d = ENEMIES[u.kind];
    const st = [u.frozen ? `빙결 ${u.frozen}` : '', u.stunned ? `기절 ${u.stunned}` : '', u.stuck ? '물에 빠짐' : '', u.intent ? '도화선!' : '',
      u.kind === 'priest' ? (u.charge ? `기도 중 ${u.charge}` : '내리칠 준비') : '']
      .filter(Boolean).join(' · ');
    const [lo, hi] = attackRange(b.hero);
    const hits = range([Math.ceil(u.hp / hi), Math.ceil(u.hp / lo)]);
    return `<b>${d.name}</b> 체력 ${u.hp}/${u.maxHp} · 피해 ${range(d.dmg)} — ${d.desc}${st ? ` · ${st}` : ''}<br>지금 무기로 ${hits}대 · 주황 칸이 닿는 범위`;
  }
  if (u) return `<b>${nameOf(u)}</b> · ${tile}`;
  return `<b>${tile}</b>${TILE_DESC[c.tile] ? ` — ${TILE_DESC[c.tile]}` : ''}`;
}

// ── 겹치는 화면: 시작 · 맵 사이 · 끝 ─────────────────────────────

function overlay(html: string): HTMLElement {
  const o = $('overlay');
  o.hidden = false;
  o.innerHTML = `<div class="box">${html}</div>`;
  return o;
}

function showStart(): void {
  const o = overlay(`
    <h1>보드 전술 시제품 · 1막</h1>
    <p style="font-size:11px">빌드 ${__BUILD__}</p>
    <p>정통 턴제: 당신이 한 가지를 하면 적이 모두 한 번씩 움직인다. 공격은 늘 맞고, 피해만 적힌 범위 안에서 정해진다. 용암 · 충돌 같은 지형 피해는 늘 그대로다.
    둘 이상에게 둘러싸이지 않을 자리를 찾고, 용암 · 구덩이 · 원소로 적을 처리한다. 무기를 골라 시작한다.</p>
    ${(Object.keys(WEAPONS) as WeaponId[]).map((id) => {
      const w = WEAPONS[id];
      const req = Object.entries(w.req).map(([s, n]) => `${STAT_NAME[s as StatId]} ${n}`).join(' · ');
      return `<button data-w="${id}"><b>${w.name}</b> <small>${req} · ${w.desc}<br>기술 ${w.skill.name}: ${w.skill.desc}</small></button>`;
    }).join('')}`);
  o.querySelectorAll<HTMLButtonElement>('button[data-w]').forEach((x) => {
    x.onclick = () => {
      run = startRun(x.dataset.w as WeaponId);
      reset();
      $('overlay').hidden = true;
      render();
    };
  });
}

function renderOverlay(): void {
  if (!run) return;
  if (run.phase === 'battle') {
    $('overlay').hidden = true;
    return;
  }
  const r = run;
  const sum = r.summary.map((s) => `<p>${s}</p>`).join('');
  if (r.phase === 'between') {
    const pts = r.hero.points;
    const rw = r.rewards;
    const o = overlay(`
      <h1>맵을 벗어났다</h1>${sum}
      ${rw ? `<h2>보상 — 하나를 고른다</h2>${rw.map((x, i) => {
        const d = describeReward(r.hero, x);
        return `<button data-r="${i}"><b>${d.title}</b><small>${d.detail}</small></button>`;
      }).join('')}<button id="skip"><small>보상 없이 넘어가기</small></button>` : ''}
      ${pts > 0 ? `<h2>능력치 점수 ${pts}</h2><div class="stats">${(['str', 'dex', 'int'] as StatId[]).map((s) =>
        `<button data-s="${s}">${STAT_NAME[s]} ${r.hero.stats[s]} → ${r.hero.stats[s] + 1}<small>${statGain(r.hero, s)}</small></button>`).join('')}</div>
      <p>힘: 최대 체력 · 민첩: 최소 피해 · 지능: 기술 재사용 대기, 2점마다 기술 위력과 연막. 든 무기가 요구하는 능력치는 공격도 올린다</p>` : ''}
      <h2>체력 ${r.hero.hp} / ${r.hero.maxHp}</h2>
      <button id="next" ${pts > 0 || rw ? 'disabled' : ''}><b>다음 맵</b><small>${rw ? '보상을 먼저 고른다' : pts > 0 ? '능력치를 먼저 고른다' : ''}</small></button>`);
    o.querySelectorAll<HTMLButtonElement>('button[data-r]').forEach((x) => {
      x.onclick = () => {
        chooseReward(r, Number(x.dataset.r));
        render();
      };
    });
    o.querySelector<HTMLButtonElement>('#skip')?.addEventListener('click', () => {
      skipReward(r);
      render();
    });
    o.querySelectorAll<HTMLButtonElement>('button[data-s]').forEach((x) => {
      x.onclick = () => {
        spendPoint(r, x.dataset.s as StatId);
        render();
      };
    });
    o.querySelector<HTMLButtonElement>('#next')!.onclick = () => {
      nextMap(r);
      reset();
      render();
    };
    return;
  }
  const o = overlay(`<h1>${r.phase === 'victory' ? '1막 끝!' : '죽었다'}</h1>${sum}
    <p>레벨 ${r.hero.level} · ${WEAPONS[r.hero.weapon].name}</p>
    <button id="again"><b>다시 하기</b></button>`);
  o.querySelector<HTMLButtonElement>('#again')!.onclick = () => {
    run = null;
    reset();
    render();
  };
}

window.addEventListener('resize', render);
render();
