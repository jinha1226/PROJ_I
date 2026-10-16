// 보드 규칙: 칸 · 피해 · 밀치기 · 원소 반응 · 환경 한 단계 (tactics/DESIGN.md 2절)
import { ENEMIES } from '../data/enemies';
import {
  COLLIDE_DMG, FIRE_DMG, FIRE_TURNS, FREEZE_ON_ICE, GAS_DMG, HP_PER_LEVEL, LAVA_DMG, LEVEL_XP,
  POISON_DMG, REVERT_TURNS, SHOCK_DMG, SOLID, STEAM_TURNS,
} from '../data/rules';
import { josa } from './josa';
import type { Battle, Cell, DmgRange, Element, LogLine, Unit, Vec } from './types';

export const DIRS4: readonly Vec[] = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
export const DIRS8: readonly Vec[] = [
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 },
  { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 },
];

export const add = (a: Vec, b: Vec, k = 1): Vec => ({ x: a.x + b.x * k, y: a.y + b.y * k });
export const eq = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;
export const manhattan = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const chebyshev = (a: Vec, b: Vec) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const inBounds = (b: Battle, p: Vec) => p.x >= 0 && p.y >= 0 && p.x < b.w && p.y < b.h;
export const cellAt = (b: Battle, p: Vec): Cell => b.cells[p.y * b.w + p.x]!;
/** 바위나 보드 밖: 지나갈 수 없고, 밀려 부딪힌다 */
export const blocked = (b: Battle, p: Vec) => !inBounds(b, p) || SOLID.has(cellAt(b, p).tile);

/** 증기 · 연기: 시야와 원거리 공격이 지나가지 못한다 */
export const opaque = (c: Cell) => c.steam > 0 || c.smoke > 0;

/**
 * a에서 b가 보이나. 브레젠햄 직선이 바위를 지나면 안 보인다. 증기 · 연기는 양 끝 칸에 있어도 가린다.
 * 유닛은 시야를 막지 않는다. 두 끝을 정렬해 그리므로 a→b와 b→a가 같다
 */
export function sees(b: Battle, from: Vec, to: Vec): boolean {
  const [a, z] = from.y < to.y || (from.y === to.y && from.x <= to.x) ? [from, to] : [to, from];
  const dx = Math.abs(z.x - a.x);
  const dy = -Math.abs(z.y - a.y);
  const sx = a.x < z.x ? 1 : -1;
  const sy = a.y < z.y ? 1 : -1;
  let err = dx + dy;
  let x = a.x;
  let y = a.y;
  for (;;) {
    const p = { x, y };
    if (opaque(cellAt(b, p))) return false;
    const end = x === z.x && y === z.y;
    if (end) return true;
    if (!eq(p, a) && blocked(b, p)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

export const heroUnit = (b: Battle): Unit => b.units[0]!;
export const unitAt = (b: Battle, p: Vec): Unit | undefined => b.units.find((u) => !u.dead && eq(u.pos, p));
export const enemies = (b: Battle): Unit[] => b.units.filter((u) => !u.dead && u.kind !== 'hero');

export function nameOf(u: Unit): string {
  return u.kind === 'hero' ? '당신' : ENEMIES[u.kind].name;
}
const immuneTo = (u: Unit, tile: 'lava') => u.kind !== 'hero' && ENEMIES[u.kind].immune.includes(tile);
const fireproof = (u: Unit) => u.kind !== 'hero' && !!ENEMIES[u.kind].fireproof;

export function say(b: Battle, text: string, tone: LogLine['tone'] = 'info'): void {
  b.log.push({ text, tone });
}

// ── 피해 · 죽음 · 경험치 ─────────────────────────────

/** 피해 굴림. by: 누가 때리나 (worst 모드에서 내 공격은 최소, 적 공격은 최대) */
export function rollDmg(b: Battle, [lo, hi]: DmgRange, by: 'hero' | 'foe'): number {
  switch (b.roll) {
    case 'min':
      return lo;
    case 'max':
      return hi;
    case 'avg':
      return Math.round((lo + hi) / 2);
    case 'worst':
      return by === 'hero' ? lo : hi;
  }
  return lo + Math.floor(rand(b) * (hi - lo + 1));
}

/** 전투 난수 0~1 (mulberry32, 상태 안의 시드). 굴림 방식과 상관없이 늘 시드를 쓴다 */
export function rand(b: Battle): number {
  b.seed = (b.seed + 0x6d2b79f5) | 0;
  let t = b.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 피해를 준다. 문장은 부른 쪽이 만든다 (msg가 있으면 피해 수치를 붙여 기록) */
export function hurt(b: Battle, u: Unit, dmg: number, msg?: string): void {
  if (u.dead || dmg <= 0) return;
  u.hp -= dmg;
  if (msg) say(b, `${msg} (-${dmg})`, u.kind === 'hero' ? 'hurt' : 'hit');
  if (u.hp <= 0) kill(b, u);
}

export function kill(b: Battle, u: Unit, how?: string): void {
  if (u.dead) return;
  u.dead = true;
  u.hp = Math.min(u.hp, 0);
  u.intent = undefined;
  if (u.kind === 'hero') {
    say(b, how ?? '당신은 죽었다...', 'hurt');
    b.status = 'dead';
    return;
  }
  const def = ENEMIES[u.kind];
  say(b, how ?? `${josa(def.name, '이/가')} 죽었다.`, 'good');
  gainXp(b, def.xp);
  // 폭탄벌레는 죽으면 터진다 (예고대로 터져도, 맞아 죽어도)
  if (def.shape === 'blast') blast(b, u.pos, def.dmg, `${josa(def.name, '이/가')} 터졌다!`);
  if (b.status === 'play' && enemies(b).length === 0) {
    b.status = 'cleared';
    say(b, `${josa(b.mapName, '을/를')} 정리했다! 경험치 +${b.clearXp}`, 'good');
    gainXp(b, b.clearXp);
  }
}

/** 3×3 폭발: 가운데 칸 포함, 안에 있는 모두 (맞은 것마다 따로 굴린다) */
export function blast(b: Battle, center: Vec, dmg: DmgRange, msg: string): void {
  say(b, msg, 'env');
  for (const d of [{ x: 0, y: 0 }, ...DIRS8]) {
    const t = unitAt(b, add(center, d));
    if (t) hurt(b, t, rollDmg(b, dmg, 'foe'), `${josa(nameOf(t), '이/가')} 폭발에 휘말렸다`);
  }
}

export function gainXp(b: Battle, xp: number): void {
  const h = b.hero;
  const me = heroUnit(b);
  h.xp += xp;
  while (h.level < LEVEL_XP.length && h.xp >= LEVEL_XP[h.level]!) {
    h.level++;
    h.points++;
    me.maxHp += HP_PER_LEVEL;
    if (!me.dead) me.hp += HP_PER_LEVEL;
    say(b, `레벨 ${h.level}이 되었다! 최대 체력 +${HP_PER_LEVEL}, 능력치 점수 +1`, 'good');
  }
}

// ── 칸에 들어가기 · 밀치기 ─────────────────────────────

/** 유닛이 칸에 들어섰을 때. 'stop'이면 밀림 · 걷기가 거기서 멈춘다 */
export function enterTile(b: Battle, u: Unit): 'go' | 'stop' {
  const c = cellAt(b, u.pos);
  const name = nameOf(u);
  if (c.tile === 'pit') {
    kill(b, u, `${josa(name, '이/가')} 구덩이에 떨어졌다!`);
    return 'stop';
  }
  if (c.tile === 'lava') {
    if (immuneTo(u, 'lava')) return 'go';
    hurt(b, u, LAVA_DMG, `${josa(name, '이/가')} 용암에 빠졌다!`);
    return 'stop';
  }
  if (c.tile === 'water') {
    u.stuck = u.kind === 'hero' ? 2 : 1; // 주인공은 이번 턴 끝에 1 줄어 다음 턴 하나를 못 걷는다
    say(b, `${josa(name, '이/가')} 깊은 물에 빠졌다.`, 'env');
    return 'stop';
  }
  if (c.fire > 0 && !fireproof(u)) hurt(b, u, FIRE_DMG, `${josa(name, '이/가')} 불에 데었다`);
  return u.dead ? 'stop' : 'go';
}

/** d 방향으로 dist칸 민다. 얼음 위에 있거나 얼어 있으면 막힐 때까지 미끄러진다 */
export function push(b: Battle, u: Unit, d: Vec, dist: number): void {
  let steps = 0;
  for (let guard = 0; guard < 30 && !u.dead; guard++) {
    const forced = steps < dist;
    const sliding = !forced && (cellAt(b, u.pos).tile === 'ice' || u.frozen > 0);
    if (!forced && !sliding) return;
    const next = add(u.pos, d);
    if (blocked(b, next)) {
      hurt(b, u, COLLIDE_DMG, `${josa(nameOf(u), '이/가')} 벽에 부딪혔다`);
      return;
    }
    const other = unitAt(b, next);
    if (other) {
      hurt(b, u, COLLIDE_DMG, `${josa(nameOf(u), '이/가')} ${josa(nameOf(other), '과/와')} 부딪혔다`);
      hurt(b, other, COLLIDE_DMG);
      return;
    }
    u.pos = next;
    steps++;
    if (enterTile(b, u) === 'stop') return;
  }
}

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
