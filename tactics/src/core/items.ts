// 소모품: 이름(미확인) · 쓰는 법 · 고를 수 있는 칸 · 쓰기 (tactics/DESIGN.md 6절). 턴 넘기기는 game.ts가 한다
import {
  FIRE_BOMB_DMG, FROST_BOMB_TURNS, HEAL_FRAC, ITEMS, ITEM_RANGE, POTION_COLORS, REPEL_DIST, SCROLL_SYLLABLES,
} from '../data/items';
import { INT_PER_ITEM_TURN, SMOKE_TURNS } from '../data/rules';
import { DIRS8, add, blocked, cellAt, chebyshev, eq, heroUnit, hurt, nameOf, push, rand, say, unitAt } from './board';
import { applyElement, freeze } from './elements';
import { heroCanStand } from './hero';
import { josa } from './josa';
import type { Battle, HeroInfo, ItemId, UseHow, Vec } from './types';

/** 판마다 모르는 이름을 섞는다: 물약은 색, 두루마리는 음절 2~3개 */
export function rollItemNames(r: () => number = Math.random): Record<ItemId, string> {
  const colors = [...POTION_COLORS].sort(() => r() - 0.5);
  const used = new Set<string>();
  const out = {} as Record<ItemId, string>;
  for (const id of Object.keys(ITEMS) as ItemId[]) {
    if (ITEMS[id].cls === 'potion') {
      out[id] = `${colors.pop()} 물약`;
      continue;
    }
    let word = '';
    while (!word || used.has(word)) {
      const n = 2 + Math.floor(r() * 2);
      word = Array.from({ length: n }, () => SCROLL_SYLLABLES[Math.floor(r() * SCROLL_SYLLABLES.length)]).join('');
    }
    used.add(word);
    out[id] = `'${word}'라고 적힌 두루마리`;
  }
  return out;
}

export const isKnown = (h: HeroInfo, id: ItemId) => h.known.includes(id);
/** 보이는 이름: 알면 정체, 모르면 이 판의 색 · 글자 */
export const itemName = (h: HeroInfo, id: ItemId) => (isKnown(h, id) ? ITEMS[id].name : h.names[id]);

/** 이 소모품을 쓰는 법 */
export const itemUses = (id: ItemId): UseHow[] => (ITEMS[id].cls === 'potion' ? ['drink', 'throw'] : ['read']);

/** 연막 턴. 지능이 늘린다 */
export const smokeTurns = (b: Battle) => SMOKE_TURNS + Math.floor((b.hero.stats.int - 1) / INT_PER_ITEM_TURN);

const area3 = (b: Battle, c: Vec) => [{ x: 0, y: 0 }, ...DIRS8].map((d) => add(c, d)).filter((p) => !blocked(b, p));

/** 사거리 안에서 조건에 맞는 칸 */
function cellsWithin(b: Battle, ok: (p: Vec) => boolean): Vec[] {
  const me = heroUnit(b).pos;
  const out: Vec[] = [];
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const p = { x, y };
      if (chebyshev(p, me) <= ITEM_RANGE && ok(p)) out.push(p);
    }
  }
  return out;
}

/**
 * idx번째 소모품을 how로 쓸 때 고를 수 있는 칸.
 * 마시기 · 고를 게 없는 두루마리 · 모르는 두루마리는 내 칸 하나 (모르면 칸을 고르지 못한다)
 */
export function itemTargets(b: Battle, idx: number, how: UseHow): Vec[] {
  const id = b.hero.items[idx];
  if (!id || !itemUses(id).includes(how)) return [];
  const me = heroUnit(b).pos;
  if (how === 'drink') return [me];
  if (how === 'throw') return cellsWithin(b, (p) => !blocked(b, p));
  const t = ITEMS[id].target;
  if (!isKnown(b.hero, id) || t === 'self' || t === 'bag') return [me];
  if (t === 'empty') return cellsWithin(b, (p) => heroCanStand(b, p));
  return cellsWithin(b, (p) => !blocked(b, p));
}

/** 감정할 수 있는 것: 가방에서 정체를 모르는 물건의 자리 (쓰는 감정 두루마리 자신은 뺀다) */
export function identifiable(h: HeroInfo, self = -1): number[] {
  return h.items.map((_, i) => i).filter((i) => i !== self && !isKnown(h, h.items[i]!));
}

function learn(b: Battle, id: ItemId): void {
  if (isKnown(b.hero, id)) return;
  b.hero.known.push(id);
  say(b, `이것은 ${josa(ITEMS[id].name, '이었/였')}다!`, 'info');
}

/**
 * idx번째 소모품을 how로 cell에 쓴다. 칸이 안 되면 false (아무것도 바뀌지 않는다).
 * pick: 감정 두루마리로 감정할 가방 자리 (없거나 안 되면 첫 미확인 물건)
 */
export function applyItem(b: Battle, idx: number, how: UseHow, cell: Vec, pick?: number): boolean {
  const h = b.hero;
  const id = h.items[idx];
  if (!id || !itemTargets(b, idx, how).some((p) => eq(p, cell))) return false;
  const known = isKnown(h, id);
  const shown = itemName(h, id);
  // 감정할 대상은 가방에서 빼기 전에 정해 둔다
  let toIdentify: ItemId | undefined;
  if (id === 'identify') {
    const can = identifiable(h, idx);
    const at = pick !== undefined && can.includes(pick) ? pick : can[0];
    toIdentify = at === undefined ? undefined : h.items[at];
  }
  h.items.splice(idx, 1);
  const verb = how === 'drink' ? '마셨다' : how === 'throw' ? '던졌다' : '읽었다';
  say(b, `${josa(shown, '을/를')} ${verb}.`, 'info');
  if (how === 'throw') throwPotion(b, id, cell);
  else if (how === 'drink') drinkPotion(b, id);
  else readScroll(b, id, known ? cell : heroUnit(b).pos, toIdentify);
  learn(b, id);
  return true;
}

function drinkPotion(b: Battle, id: ItemId): void {
  const me = heroUnit(b);
  switch (id) {
    case 'heal': {
      const amount = Math.min(me.maxHp - me.hp, Math.ceil(me.maxHp * HEAL_FRAC));
      me.hp += amount;
      say(b, `상처가 아물었다. (+${amount})`, 'good');
      break;
    }
    case 'fireBomb':
      hurt(b, me, FIRE_BOMB_DMG, '몸 안에서 불길이 치솟았다!');
      applyElement(b, [me.pos], 'fire');
      break;
    case 'frostBomb':
      say(b, '몸이 얼어붙었다.', 'env');
      applyElement(b, [me.pos], 'frost');
      me.stuck = Math.max(me.stuck, FROST_BOMB_TURNS + 1); // 이번 턴 끝에 1 줄어든다
      break;
  }
}

function throwPotion(b: Battle, id: ItemId, cell: Vec): void {
  const area = area3(b, cell);
  switch (id) {
    case 'heal':
      say(b, '부드러운 빛이 퍼졌다.', 'env');
      for (const p of area) {
        const t = unitAt(b, p);
        if (t) t.hp = Math.min(t.maxHp, t.hp + Math.ceil(t.maxHp * HEAL_FRAC));
      }
      break;
    case 'fireBomb':
      say(b, '불길이 치솟았다!', 'env');
      for (const p of area) {
        const t = unitAt(b, p);
        if (t) hurt(b, t, FIRE_BOMB_DMG, `${josa(nameOf(t), '이/가')} 불길에 휩싸였다`);
      }
      applyElement(b, area, 'fire');
      break;
    case 'frostBomb':
      say(b, '냉기가 퍼졌다!', 'env');
      applyElement(b, area, 'frost');
      for (const p of area) {
        const t = unitAt(b, p);
        if (t && t.kind !== 'hero') freeze(b, t, FROST_BOMB_TURNS);
      }
      break;
  }
}

/** 두루마리. 모르고 읽으면 cell은 내 칸이다 (도약은 무작위 빈칸) */
function readScroll(b: Battle, id: ItemId, cell: Vec, toIdentify?: ItemId): void {
  const me = heroUnit(b);
  switch (id) {
    case 'smoke':
      say(b, '짙은 연기가 피어올랐다.', 'env');
      for (const p of area3(b, cell)) cellAt(b, p).smoke = smokeTurns(b);
      break;
    case 'blink': {
      const to = eq(cell, me.pos) ? randomEmpty(b) : cell;
      say(b, '몸이 순식간에 옮겨졌다.', 'info');
      if (to) me.pos = to;
      break;
    }
    case 'repel':
      say(b, '보이지 않는 힘이 터져 나왔다!', 'env');
      for (const d of DIRS8) {
        const t = unitAt(b, add(me.pos, d));
        if (t) push(b, t, d, REPEL_DIST);
      }
      break;
    case 'identify':
      if (toIdentify) learn(b, toIdentify);
      else say(b, '가방에 모르는 물건이 없다.', 'info');
      break;
  }
}

/** 모르고 읽은 도약: 4칸 안 무작위 빈칸 (전투 난수) */
function randomEmpty(b: Battle): Vec | undefined {
  const me = heroUnit(b).pos;
  const spots = cellsWithin(b, (p) => !eq(p, me) && heroCanStand(b, p));
  return spots[Math.floor(rand(b) * spots.length)];
}
