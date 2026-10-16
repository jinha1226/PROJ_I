// 원소 반응 · 빙결 · 감전 · 환경 한 단계 (tactics/DESIGN.md 2절 "원소 반응")
import {
  FIRE_DMG, FIRE_TURNS, FREEZE_ON_ICE, GAS_DMG, LAVA_DMG, POISON_DMG, REVERT_TURNS, SHOCK_DMG, STEAM_TURNS,
} from '../data/rules';
import { DIRS4, add, blast, cellAt, fireproof, hurt, immuneTo, inBounds, nameOf, say, unitAt } from './board';
import { josa } from './josa';
import type { Battle, Cell, Element, Unit, Vec } from './types';

// ── 원소 반응 (DESIGN.md "원소 반응") ─────────────────────────────

/**
 * 원소가 칸들에 닿는다. 출처(지팡이 · 물약 · 적)와 상관없이 같은 표.
 * 칸마다 자기 원래 타일만 보고 바뀌므로 반응은 한 단계만 일어난다 (얼음 → 물이 같은 행동에서 증기가 되지 않는다).
 */
export function applyElement(b: Battle, cells: Vec[], el: Element): void {
  const explode: Vec[] = [];
  const shock: Vec[] = [];
  const seen = new Set<number>();
  for (const p of cells) {
    if (!inBounds(b, p)) continue;
    const key = p.y * b.w + p.x;
    if (seen.has(key)) continue;
    seen.add(key);
    const c = cellAt(b, p);
    if (el === 'fire') {
      if (c.tile === 'water') c.steam = STEAM_TURNS;
      else if (c.tile === 'ice') c.tile = 'water';
      else if (c.tile === 'swamp') {
        c.tile = 'floor';
        explode.push(p);
      } else if (c.tile === 'grass' || c.tile === 'floor' || c.tile === 'stairs') c.fire = FIRE_TURNS;
    } else if (el === 'frost') {
      c.fire = 0;
      if (c.tile === 'water') {
        c.tile = 'ice';
        const u = unitAt(b, p);
        if (u) freeze(b, u, FREEZE_ON_ICE);
      } else if (c.tile === 'lava' || c.tile === 'swamp') {
        c.revert = { tile: c.tile, turns: REVERT_TURNS };
        c.tile = 'floor';
      }
    } else {
      if (c.tile === 'water') shock.push(p);
      else if (c.tile === 'grass') c.fire = FIRE_TURNS;
    }
  }
  for (const p of explode) blast(b, p, [GAS_DMG, GAS_DMG], '독 늪이 폭발했다!');
  if (shock.length) conduct(b, shock);
}

export function freeze(b: Battle, u: Unit, turns: number): void {
  if (u.dead) return;
  u.frozen = Math.max(u.frozen, turns);
  u.intent = undefined;
  say(b, `${josa(nameOf(u), '이/가')} 얼어붙었다.`, 'env');
}

/** 번개가 닿은 물과 이어진 물 전체(상하좌우)가 감전된다. 그 위의 모두(나 포함)가 맞고 기절 */
function conduct(b: Battle, starts: Vec[]): void {
  const region = waterRegion(b, starts);
  say(b, '번개가 물을 타고 퍼졌다!', 'env');
  for (const p of region) {
    const u = unitAt(b, p);
    if (!u) continue;
    hurt(b, u, SHOCK_DMG, `${josa(nameOf(u), '이/가')} 감전되었다`);
    if (!u.dead) {
      u.stunned = Math.max(u.stunned, 1);
      u.intent = undefined;
    }
  }
}

export function waterRegion(b: Battle, starts: Vec[]): Vec[] {
  const out: Vec[] = [];
  const seen = new Set<number>();
  const stack = [...starts];
  while (stack.length) {
    const p = stack.pop()!;
    if (!inBounds(b, p) || cellAt(b, p).tile !== 'water') continue;
    const key = p.y * b.w + p.x;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    for (const d of DIRS4) stack.push(add(p, d));
  }
  return out;
}

// ── 환경 한 단계 (적 공격 뒤, 적 이동 전) ─────────────────────────────

export function envStep(b: Battle): void {
  // 서 있는 칸의 피해
  for (const u of b.units) {
    if (u.dead) continue;
    const c = cellAt(b, u.pos);
    const name = nameOf(u);
    if (c.tile === 'lava' && !immuneTo(u, 'lava')) hurt(b, u, LAVA_DMG, `${josa(name, '이/가')} 용암에 타고 있다`);
    else if (c.fire > 0 && !fireproof(u)) hurt(b, u, FIRE_DMG, `${josa(name, '이/가')} 불에 타고 있다`);
    if (!u.dead && c.tile === 'swamp') hurt(b, u, POISON_DMG, `${josa(name, '이/가')} 독에 시달린다`);
    if (b.status !== 'play') return;
  }
  // 불은 풀을 타고 한 턴에 한 칸씩 번진다
  const spread: Cell[] = [];
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const c = cellAt(b, { x, y });
      if (c.fire <= 0 || c.tile !== 'grass') continue;
      for (const d of DIRS4) {
        const n = { x: x + d.x, y: y + d.y };
        if (!inBounds(b, n)) continue;
        const nc = cellAt(b, n);
        if (nc.tile === 'grass' && nc.fire === 0) spread.push(nc);
      }
    }
  }
  // 시간이 흐른다
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const c = cellAt(b, { x, y });
      if (c.fire > 0 && --c.fire === 0 && c.tile === 'grass') c.tile = 'floor'; // 다 탄 풀은 사라진다
      if (c.steam > 0) c.steam--;
      if (c.smoke > 0) c.smoke--;
      if (c.revert && --c.revert.turns <= 0) {
        c.tile = c.revert.tile;
        c.revert = undefined;
        const u = unitAt(b, { x, y });
        if (c.tile === 'lava') {
          say(b, '식었던 용암이 다시 끓어올랐다.', 'env');
          if (u && !immuneTo(u, 'lava')) hurt(b, u, LAVA_DMG, `${josa(nameOf(u), '이/가')} 용암에 빠졌다!`);
        }
        if (b.status === 'dead') return;
      }
    }
  }
  for (const c of spread) c.fire = FIRE_TURNS;
}
