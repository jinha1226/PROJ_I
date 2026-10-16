// 한 맵의 전투: 만들기 · 한 칸 걷기 · 행동 · 턴 넘기기 (tactics/DESIGN.md 2절, 정통 턴제)
import { ENEMIES } from '../data/enemies';
import { ENEMY_CHAR, HERO_CHAR, TILE_CHAR, type MapDef } from '../data/maps';
import { WEAPONS } from '../data/weapons';
import { DIRS8, add, cellAt, chebyshev, enemies, enterTile, heroUnit, say } from './board';
import { envStep } from './elements';
import { enemyTurn } from './enemy';
import { heroCanStand, perform, type ActionKind } from './hero';
import { applyItem } from './items';
import { josa } from './josa';
import type { Battle, Cell, HeroInfo, Unit, UseHow, Vec } from './types';

function newUnit(id: number, kind: Unit['kind'], pos: Vec, hp: number): Unit {
  return { id, kind, pos, hp, maxHp: hp, dead: false, frozen: 0, stunned: 0, stuck: 0, charge: 0, retreat: 0 };
}

/** seed를 주면 피해 굴림이 재현된다 (없으면 무작위) */
export function createBattle(map: MapDef, hero: HeroInfo, seed = Math.floor(Math.random() * 2 ** 32)): Battle {
  const h = map.rows.length;
  const w = map.rows[0]!.length;
  const cells: Cell[] = [];
  const units: Unit[] = [newUnit(0, 'hero', { x: 0, y: 0 }, hero.hp)];
  units[0]!.maxHp = hero.maxHp;
  let nextId = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = map.rows[y]![x]!;
      cells.push({ tile: TILE_CHAR[ch] ?? 'floor', fire: 0, steam: 0, smoke: 0 });
      const kind = ENEMY_CHAR[ch];
      if (kind) units.push(newUnit(nextId++, kind, { x, y }, ENEMIES[kind].hp));
      if (ch === HERO_CHAR) units[0]!.pos = { x, y };
    }
  }
  const b: Battle = { w, h, cells, units, nextId, hero, turn: 1, status: 'play', mapName: map.name, clearXp: map.clearXp, log: [], seed, roll: 'random' };
  say(b, `${map.name}. 적 ${units.length - 1}마리.`, 'info');
  return b;
}

/** 지금 한 칸 걸어갈 수 있는 칸 (8방향). 깊은 물에 빠진 다음 턴은 걷지 못한다 */
export function heroSteps(b: Battle): Vec[] {
  const me = heroUnit(b);
  if (b.status !== 'play' || me.stuck > 0) return [];
  return DIRS8.map((d) => add(me.pos, d)).filter((p) => heroCanStand(b, p));
}

/** 한 칸 걷고 턴을 넘긴다. 지나는 칸의 불에 데이고, 깊은 물에 들어가면 다음 턴 못 걷는다 */
export function stepHero(b: Battle, to: Vec): boolean {
  if (!heroSteps(b).some((p) => p.x === to.x && p.y === to.y)) return false;
  const me = heroUnit(b);
  me.pos = to;
  enterTile(b, me);
  endTurn(b);
  return true;
}

/** 멀리 누른 칸으로 가는 다음 한 걸음 (8방향 최단 경로, 깊은 물은 마지막 칸으로만) */
export function nextStepToward(b: Battle, to: Vec): Vec | undefined {
  const me = heroUnit(b);
  const key = (p: Vec) => p.y * b.w + p.x;
  const first = new Map<number, Vec>();
  const seen = new Set([key(me.pos)]);
  const queue = [me.pos];
  while (queue.length) {
    const p = queue.shift()!;
    if (p.x === to.x && p.y === to.y) return first.get(key(p));
    if (p !== me.pos && cellAt(b, p).tile === 'water') continue;
    for (const d of DIRS8) {
      const n = add(p, d);
      if (seen.has(key(n)) || !heroCanStand(b, n)) continue;
      seen.add(key(n));
      first.set(key(n), p === me.pos ? n : first.get(key(p))!);
      queue.push(n);
    }
  }
  return undefined;
}

/** 적이 붙어 있거나 2칸 안에 있으면 자동 걷기를 멈춘다 */
export function enemyNear(b: Battle): boolean {
  const me = heroUnit(b);
  return enemies(b).some((u) => chebyshev(u.pos, me.pos) <= 2);
}

/** 무기 공격 · 기술. 성공하면 턴이 넘어간다 */
export function act(b: Battle, kind: ActionKind, cell: Vec): boolean {
  if (b.status !== 'play' || !perform(b, kind, cell)) return false;
  endTurn(b);
  return true;
}

/** 소모품 하나를 how로 고른 칸에 쓴다 (pick: 감정할 가방 자리). 성공하면 턴이 넘어간다 */
export function useItem(b: Battle, idx: number, how: UseHow, cell: Vec, pick?: number): boolean {
  if (b.status !== 'play' || !applyItem(b, idx, how, cell, pick)) return false;
  endTurn(b);
  return true;
}

/** 예비 무기와 바꿔 든다. 한 턴을 쓴다 */
export function swapWeapon(b: Battle): boolean {
  const h = b.hero;
  if (b.status !== 'play' || !h.spare) return false;
  [h.weapon, h.spare] = [h.spare, h.weapon];
  say(b, `${josa(WEAPONS[h.weapon].name, '을/를')} 들었다.`);
  endTurn(b);
  return true;
}

/** 아무것도 하지 않고 한 턴 보낸다 (적을 기다린다) */
export function wait(b: Battle): void {
  endTurn(b);
}

export function onStairs(b: Battle): boolean {
  return cellAt(b, heroUnit(b).pos).tile === 'stairs';
}

/** 계단으로 나간다 (턴을 쓰지 않는다). 처치 경험치만 남고 클리어 경험치 · 보상은 없다 */
export function leave(b: Battle): boolean {
  if (b.status !== 'play' || !onStairs(b)) return false;
  b.status = 'left';
  say(b, `계단을 내려갔다. 남은 적 ${enemies(b).length}마리.`, 'info');
  return true;
}

/** 내가 한 가지를 했다 → 적이 모두 행동 → 환경 한 단계 */
export function endTurn(b: Battle): void {
  if (b.status !== 'play') return;
  enemyTurn(b);
  if (b.status === 'play') envStep(b);
  const me = heroUnit(b);
  if (me.stuck > 0) me.stuck--;
  for (const w of Object.keys(b.hero.cooldown) as (keyof typeof b.hero.cooldown)[]) {
    if ((b.hero.cooldown[w] ?? 0) > 0) b.hero.cooldown[w]!--;
  }
  b.turn++;
}
