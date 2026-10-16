// 봇: 맵이 깨지는지 · 얼마나 어려운지를 재는 플레이어 (tactics/DESIGN.md "스테이지" 검사)
// 후보 행동을 전부 복제본에 해 보고(적 반응까지) 점수가 가장 좋은 것. 두 수 앞은 첫 수 상위 beam개만 펼친다
import { cellAt, chebyshev, enemies, heroUnit } from '../src/core/board';
import { endTurn, heroSteps, leave, onStairs, stepHero, swapWeapon, useItem } from '../src/core/game';
import { itemTargets } from '../src/core/items';
import { attackPower, perform, targets, type ActionKind } from '../src/core/hero';
import type { Battle, Unit, Vec } from '../src/core/types';
import { ENEMIES } from '../src/data/enemies';

export interface Weights {
  /** 내 체력 1 */
  hp: number;
  /** 살아 있는 적이 한 턴에 줄 수 있는 피해 1 × 그 적을 잡는 데 걸리는 대수 (적이 나에게 줄 앞으로의 피해) */
  threat: number;
  /** 가장 가까운 적까지 거리 1 (다가가게 한다) */
  near: number;
  /** 교착일 때 거리 무게 (한 칸 다가가는 값이 한 대 맞는 값보다 커야 붙는다) */
  stallNear: number;
}

export interface BotOpts {
  /** 1: 한 수 앞 / 2: 내 수 · 적 · 내 수 · 적 */
  depth: 1 | 2;
  /** 두 수 앞에서 펼칠 첫 수 개수 */
  beam: number;
  /** 소모품을 쓰나 (맵 검사는 false: 지형만으로 깨지는지) */
  items: boolean;
  w: Weights;
}

export const DEFAULT_BOT: BotOpts = {
  depth: 2,
  beam: 6,
  items: false,
  w: { hp: 2, threat: 3, near: 0.3, stallNear: 15 },
};

/** 이만큼 적 체력이 그대로면 교착으로 본다 (사제와 기둥 사이 춤추기 같은) */
export const STALL_TURNS = 8;
/** 이만큼 교착이 이어지면 포기하고 계단으로 나간다 (붙으면 물러나는 궁수를 검으로 못 잡을 때 같은) */
// 체력이 낮다고 도망치지는 않는다: 나가도 회복이 없어 다음 맵을 낮은 체력으로 시작할 뿐이다 (해 보니 더 많이 죽었다)
export const GIVE_UP_TURNS = 30;

/** fight: 싸운다 / stall: 교착이라 맞을 각오로 붙는다 / flee: 포기하고 계단으로 간다 */
export type Mood = 'fight' | 'stall' | 'flee';

export type Plan =
  | { t: 'wait' }
  | { t: 'step'; to: Vec }
  | { t: 'act'; kind: ActionKind; cell: Vec }
  | { t: 'item'; cell: Vec }
  | { t: 'swap' }
  | { t: 'leave' };

/** 소모품 후보 칸: 내 주변 2칸 (전부 보면 가지가 너무 많다) */
const ITEM_REACH = 2;

export function plans(b: Battle, items: boolean): Plan[] {
  const out: Plan[] = [{ t: 'wait' }];
  for (const to of heroSteps(b)) out.push({ t: 'step', to });
  for (const kind of ['attack', 'skill'] as const) {
    for (const tg of targets(b, kind)) out.push({ t: 'act', kind, cell: tg.cell });
  }
  const it = b.hero.items[0];
  if (items && it) {
    const me = heroUnit(b).pos;
    for (const cell of itemTargets(b, it)) if (chebyshev(cell, me) <= ITEM_REACH) out.push({ t: 'item', cell });
  }
  if (b.hero.spare) out.push({ t: 'swap' });
  if (onStairs(b)) out.push({ t: 'leave' });
  return out;
}

/** 한 가지를 하고 턴을 넘긴다 */
export function play(b: Battle, p: Plan): void {
  switch (p.t) {
    case 'wait':
      return endTurn(b);
    case 'step':
      stepHero(b, p.to);
      return;
    case 'act':
      if (!perform(b, p.kind, p.cell)) return;
      return endTurn(b);
    case 'item':
      useItem(b, 0, p.cell);
      return;
    case 'swap':
      swapWeapon(b);
      return;
    case 'leave':
      leave(b);
      return;
  }
}

/** 적 하나가 앞으로 줄 피해: 한 턴 피해(빠르면 두 배, 느리면 절반) × 잡는 데 걸리는 대수 */
function threatOf(b: Battle, u: Unit): number {
  const d = ENEMIES[u.kind as keyof typeof ENEMIES];
  const perTurn = d.dmg * d.acts * (d.slow ? 0.5 : 1);
  return perTurn * Math.ceil(u.hp / attackPower(b.hero));
}

/** 가장 가까운 계단까지 (없으면 0) */
function stairsDist(b: Battle, p: Vec): number {
  let best = Infinity;
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) if (cellAt(b, { x, y }).tile === 'stairs') best = Math.min(best, chebyshev(p, { x, y }));
  }
  return best === Infinity ? 0 : best;
}

export function evaluate(b: Battle, w: Weights, mood: Mood): number {
  if (b.status === 'dead') return -1e6;
  const me = heroUnit(b);
  const foes = enemies(b);
  if (b.status === 'cleared') return 1e5 + me.hp * w.hp;
  // 나가기는 도망칠 때만 좋은 수 (싸울 때는 처치 · 클리어 경험치를 버리는 수라 가장 나쁜 살아남기)
  if (b.status === 'left') return mood === 'flee' ? 5e4 : -5e5;
  const threat = foes.reduce((s, u) => s + threatOf(b, u), 0) * w.threat;
  if (mood === 'flee') return me.hp * w.hp - stairsDist(b, me.pos) * w.stallNear;
  const near = foes.length ? Math.min(...foes.map((u) => chebyshev(u.pos, me.pos))) : 0;
  return me.hp * w.hp - threat - near * (mood === 'stall' ? w.stallNear : w.near);
}

function tryPlan(b: Battle, p: Plan): Battle {
  const c = structuredClone(b);
  play(c, p);
  return c;
}

export function bestTurn(b: Battle, o: BotOpts = DEFAULT_BOT, mood: Mood = 'fight'): Plan {
  const first = plans(b, o.items).map((p) => {
    const c = tryPlan(b, p);
    return { p, c, s: evaluate(c, o.w, mood) + Math.random() * 0.01 };
  });
  first.sort((x, y) => y.s - x.s);
  if (o.depth === 1) return first[0]!.p;
  let best = { s: -Infinity, p: first[0]!.p };
  for (const f of first.slice(0, o.beam)) {
    let s = f.s;
    if (f.c.status === 'play') {
      s = -Infinity;
      for (const p2 of plans(f.c, false)) s = Math.max(s, evaluate(tryPlan(f.c, p2), o.w, mood));
    }
    if (s > best.s) best = { s, p: f.p };
  }
  return best.p;
}

/** 한 맵을 끝까지 둔다 (턴 상한을 넘기면 진 것으로). 맵 동안 가장 낮았던 체력 비율(0~1)을 돌려준다 */
export function playBattle(b: Battle, o: BotOpts = DEFAULT_BOT, turnCap = 150): number {
  let lastFoeHp = -1;
  let still = 0;
  let low = 1;
  for (;;) {
    const me = heroUnit(b);
    low = Math.min(low, Math.max(0, me.hp) / me.maxHp);
    if (b.status !== 'play') return low;
    if (b.turn > turnCap) {
      b.status = 'dead';
      return low;
    }
    const foeHp = enemies(b).reduce((s, u) => s + u.hp, 0);
    still = foeHp === lastFoeHp ? still + 1 : 0;
    lastFoeHp = foeHp;
    const mood: Mood = still >= GIVE_UP_TURNS ? 'flee' : still >= STALL_TURNS ? 'stall' : 'fight';
    play(b, bestTurn(b, o, mood));
  }
}
