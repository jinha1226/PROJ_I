// 적: 공격 칸 · 정통 턴제 행동 (때릴 수 있으면 바로 때리고, 아니면 다가간다) (tactics/DESIGN.md 2절)
import { ENEMIES, RAY_RANGE, RETREAT_CD, SMITE_CD, SMITE_RANGE, type EnemyDef } from '../data/enemies';
import {
  DIRS8, add, applyElement, blocked, cellAt, chebyshev, enemies, eq, heroUnit, hurt, kill, nameOf, opaque, rollDmg, say, sees,
  unitAt,
} from './board';
import { hitPunct, josa } from './josa';
import type { Battle, Unit, Vec } from './types';

/** 시계 방향으로 이어진 8방향 (휩쓸기의 양옆을 구한다) */
const RING: readonly Vec[] = [
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
  { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
];
/** 폭탄벌레 도화선 표시 (방향 없음) */
const HERE: Vec = { x: 0, y: 0 };

const defOf = (u: Unit): EnemyDef => ENEMIES[u.kind as keyof typeof ENEMIES];

/**
 * 유닛이 pos에서 d 방향으로 공격하면 닿는 칸.
 * 화살(ray)은 처음 맞은 유닛에서 멈추고, 바위 · 증기 앞에서 멈춘다. 자기 자신은 길을 막지 않는다
 */
export function attackCells(b: Battle, u: Unit, pos: Vec, d: Vec): Vec[] {
  if (u.kind === 'hero') return [];
  const out: Vec[] = [];
  switch (defOf(u).shape) {
    case 'melee':
      out.push(add(pos, d));
      break;
    case 'reach2':
      if (!blocked(b, add(pos, d))) out.push(add(pos, d), add(pos, d, 2));
      break;
    case 'sweep': {
      const i = RING.findIndex((r) => eq(r, d));
      out.push(add(pos, d), add(pos, RING[(i + 1) % 8]!), add(pos, RING[(i + 7) % 8]!));
      break;
    }
    case 'blast':
      out.push(pos, ...DIRS8.map((o) => add(pos, o)));
      break;
    case 'ray':
      for (let i = 1; i <= RAY_RANGE; i++) {
        const p = add(pos, d, i);
        if (blocked(b, p) || opaque(cellAt(b, p))) break;
        out.push(p);
        const t = unitAt(b, p);
        if (t && t.id !== u.id) break;
      }
      break;
  }
  return out.filter((p) => !blocked(b, p));
}

/** 오크 사제가 pos에서 p를 내리칠 수 있나 (시야 · 거리) */
const smites = (b: Battle, pos: Vec, p: Vec) => chebyshev(pos, p) <= SMITE_RANGE && sees(b, pos, p);

/**
 * pos에서 주인공을 때릴 수 있는 방향 (화살은 처음 맞는 게 주인공이어야 한다).
 * 사제는 붙지 않고 보이는 자리를 찾는다 (자리 잡기용. 실제로는 붙어서도 내리친다)
 */
function strikeDir(b: Battle, u: Unit, pos: Vec): Vec | undefined {
  const me = heroUnit(b);
  const shape = defOf(u).shape;
  if (shape === 'blast') return chebyshev(pos, me.pos) <= 1 ? HERE : undefined;
  if (shape === 'smite') return chebyshev(pos, me.pos) > 1 && smites(b, pos, me.pos) ? HERE : undefined;
  return DIRS8.find((d) => {
    const cells = attackCells(b, u, pos, d);
    if (defOf(u).shape === 'ray') {
      const last = cells[cells.length - 1];
      return !!last && eq(last, me.pos) && chebyshev(pos, me.pos) > 1; // 궁수는 붙으면 쏘지 않고 물러선다
    }
    return cells.some((p) => eq(p, me.pos));
  });
}

/** 지금 이 적이 주인공을 때릴 수 있는 칸 (화면에서 눌러 볼 때 보여준다) */
export function threatCells(b: Battle, u: Unit): Vec[] {
  if (u.kind === 'hero' || u.dead) return [];
  if (u.intent) return attackCells(b, u, u.pos, u.intent);
  const out: Vec[] = [];
  if (defOf(u).shape === 'smite') {
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const p = { x, y };
        if (!blocked(b, p) && !eq(p, u.pos) && smites(b, u.pos, p)) out.push(p);
      }
    }
    return out;
  }
  const dirs = defOf(u).shape === 'blast' ? [HERE] : DIRS8;
  for (const d of dirs) out.push(...attackCells(b, u, u.pos, d));
  return out;
}

/** 적이 걸어서 들어가도 되는 칸 (위험한 칸은 피한다) */
function safeFor(b: Battle, u: Unit, p: Vec): boolean {
  if (blocked(b, p)) return false;
  const def = defOf(u);
  const c = cellAt(b, p);
  if (c.tile === 'pit' || c.tile === 'water' || c.tile === 'swamp') return false;
  if (c.tile === 'lava' && !def.immune.includes('lava')) return false;
  if (c.fire > 0 && !def.fireproof) return false;
  return !unitAt(b, p);
}

/** 때릴 수 있는 가장 가까운 자리로 한 칸 다가간다. 길이 없으면 거리를 줄이는 쪽으로 */
function step(b: Battle, u: Unit): void {
  const me = heroUnit(b);
  const key = (p: Vec) => p.y * b.w + p.x;
  const first = new Map<number, Vec>();
  const seen = new Set([key(u.pos)]);
  let frontier = [u.pos];
  let goal: Vec | undefined;
  while (frontier.length && !goal) {
    const next: Vec[] = [];
    for (const p of frontier) {
      for (const d of DIRS8) {
        const n = add(p, d);
        if (seen.has(key(n)) || !safeFor(b, u, n)) continue;
        seen.add(key(n));
        first.set(key(n), p === u.pos ? n : first.get(key(p))!);
        if (strikeDir(b, u, n)) {
          goal = n;
          break;
        }
        next.push(n);
      }
      if (goal) break;
    }
    frontier = next;
  }
  let to = goal ? first.get(key(goal)) : undefined;
  if (!to) {
    const options = DIRS8.map((d) => add(u.pos, d)).filter((p) => safeFor(b, u, p));
    const closer = options.filter((p) => chebyshev(p, me.pos) < chebyshev(u.pos, me.pos));
    to = closer[0];
  }
  if (to) u.pos = to;
}

/** 붙은 궁수 · 사제는 한 칸 물러선다 (쏠 자리를 다시 잡는다). 연달아 물러서지는 못한다 */
function backOff(b: Battle, u: Unit): boolean {
  if (u.retreat > 0) return false;
  const me = heroUnit(b);
  const away = DIRS8.map((d) => add(u.pos, d)).filter((p) => safeFor(b, u, p) && chebyshev(p, me.pos) > 1);
  const shoot = away.find((p) => strikeDir(b, u, p));
  const to = shoot ?? away[0];
  if (!to) return false;
  u.pos = to;
  u.retreat = RETREAT_CD;
  return true;
}

function strike(b: Battle, u: Unit, d: Vec): void {
  const def = defOf(u);
  const cells = attackCells(b, u, u.pos, d);
  const hitCells = def.shape === 'ray' ? cells.slice(-1) : cells;
  for (const p of hitCells) {
    const t = unitAt(b, p);
    if (!t || t.id === u.id) continue;
    const who = t.kind === 'hero' ? '당신을' : josa(nameOf(t), '을/를');
    const dmg = rollDmg(b, def.dmg, 'foe');
    hurt(b, t, dmg, `${josa(def.name, '이/가')} ${who} 맞혔다${hitPunct(dmg)}`);
  }
  if (def.element && hitCells.length) applyElement(b, hitCells, def.element);
}

/** 사제: 준비됐고 보이면 내리친다. 기도 중이면 붙었을 때 물러서고, 보이는 자리면 그대로 있는다. 'move'면 걸어서 자리를 찾는다 */
function priestAct(b: Battle, u: Unit): 'done' | 'move' {
  const def = defOf(u);
  const me = heroUnit(b);
  if (u.charge === 0 && smites(b, u.pos, me.pos)) {
    say(b, `${josa(def.name, '이/가')} 기도를 올렸다.`, 'info');
    const dmg = rollDmg(b, def.dmg, 'foe');
    hurt(b, me, dmg, `신의 벌이 당신을 내리쳤다${hitPunct(dmg)}`);
    u.charge = SMITE_CD;
    return 'done';
  }
  if (u.charge > 0) u.charge--;
  if (chebyshev(u.pos, me.pos) <= 1 && backOff(b, u)) return 'done';
  return strikeDir(b, u, u.pos) ? 'done' : 'move';
}

/** 적 하나의 한 번 행동 */
function actOnce(b: Battle, u: Unit): void {
  const def = defOf(u);
  if (def.shape === 'smite') {
    if (priestAct(b, u) === 'done') return;
  } else if (def.shape === 'blast') {
    if (u.intent) {
      kill(b, u, `${josa(def.name, '이/가')} 터졌다!`); // 죽으면서 3×3 폭발 (board.kill)
      return;
    }
    if (strikeDir(b, u, u.pos)) {
      u.intent = HERE;
      say(b, `${josa(def.name, '이/가')} 도화선에 불을 붙였다!`, 'hurt');
      return;
    }
  } else {
    const d = strikeDir(b, u, u.pos);
    if (d) return strike(b, u, d);
    const me = heroUnit(b);
    if (def.shape === 'ray' && chebyshev(u.pos, me.pos) <= 1) {
      if (backOff(b, u)) return;
      // 물러서지 못하면 붙은 채로 쏜다
      return strike(b, u, { x: me.pos.x - u.pos.x, y: me.pos.y - u.pos.y });
    }
  }
  if (u.stuck > 0) {
    u.stuck--;
    return;
  }
  step(b, u);
}

/** 내가 한 가지를 하면 적이 모두 한 번씩 (빠른 적은 두 번, 느린 적은 짝수 턴에만) */
export function enemyTurn(b: Battle): void {
  for (const u of enemies(b)) {
    if (u.dead) continue;
    if (u.frozen > 0) {
      u.frozen--;
      continue;
    }
    if (u.retreat > 0) u.retreat--;
    if (u.stunned > 0) {
      u.stunned--;
      continue;
    }
    const def = defOf(u);
    if (def.slow && b.turn % 2 === 1) continue;
    for (let i = 0; i < def.acts && !u.dead; i++) {
      actOnce(b, u);
      if (b.status !== 'play') return;
    }
  }
}
