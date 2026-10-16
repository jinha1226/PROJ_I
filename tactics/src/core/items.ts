// 소모품: 고를 수 있는 칸 · 쓰기 (tactics/DESIGN.md 6절). 턴 넘기기는 game.ts가 한다
import { FIRE_BOMB_DMG, FROST_BOMB_TURNS, HEAL_FRAC, ITEMS, REPEL_DIST } from '../data/items';
import { INT_PER_ITEM_TURN, SMOKE_TURNS } from '../data/rules';
import {
  DIRS8, add, applyElement, blocked, cellAt, chebyshev, eq, freeze, heroUnit, hurt, nameOf, push, say, unitAt,
} from './board';
import { heroCanStand } from './hero';
import { josa } from './josa';
import type { Battle, ItemId, Vec } from './types';

/** 연막 턴. 지능이 늘린다 */
export const smokeTurns = (b: Battle) => SMOKE_TURNS + Math.floor((b.hero.stats.int - 1) / INT_PER_ITEM_TURN);

const area3 = (b: Battle, c: Vec) => [{ x: 0, y: 0 }, ...DIRS8].map((d) => add(c, d)).filter((p) => !blocked(b, p));

/** 이 소모품을 쓸 수 있는 칸 (마시기 · 읽기는 내 칸 하나) */
export function itemTargets(b: Battle, id: ItemId): Vec[] {
  const me = heroUnit(b);
  const def = ITEMS[id];
  if (def.target === 'self') return [me.pos];
  const out: Vec[] = [];
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const p = { x, y };
      if (chebyshev(p, me.pos) > def.range || blocked(b, p)) continue;
      if (def.target === 'empty' && !heroCanStand(b, p)) continue;
      out.push(p);
    }
  }
  return out;
}

/** idx번째 소모품을 cell에 쓴다. 칸이 안 되면 false (아무것도 바뀌지 않는다) */
export function applyItem(b: Battle, idx: number, cell: Vec): boolean {
  const id = b.hero.items[idx];
  if (!id || !itemTargets(b, id).some((p) => eq(p, cell))) return false;
  b.hero.items.splice(idx, 1);
  const me = heroUnit(b);
  const name = ITEMS[id].name;
  switch (id) {
    case 'heal': {
      const amount = Math.min(me.maxHp - me.hp, Math.ceil(me.maxHp * HEAL_FRAC));
      me.hp += amount;
      say(b, `${josa(name, '을/를')} 마셨다. 상처가 아물었다. (+${amount})`, 'good');
      break;
    }
    case 'fireBomb': {
      say(b, `${josa(name, '을/를')} 던졌다. 불길이 치솟았다!`, 'env');
      const area = area3(b, cell);
      for (const p of area) {
        const t = unitAt(b, p);
        if (t) hurt(b, t, FIRE_BOMB_DMG, `${josa(nameOf(t), '이/가')} 불길에 휩싸였다`);
      }
      applyElement(b, area, 'fire');
      break;
    }
    case 'frostBomb': {
      say(b, `${josa(name, '을/를')} 던졌다. 냉기가 퍼졌다!`, 'env');
      const area = area3(b, cell);
      applyElement(b, area, 'frost');
      for (const p of area) {
        const t = unitAt(b, p);
        if (t && t.kind !== 'hero') freeze(b, t, FROST_BOMB_TURNS);
      }
      break;
    }
    case 'smoke':
      say(b, `${josa(name, '을/를')} 읽었다. 짙은 연기가 피어올랐다.`, 'env');
      for (const p of area3(b, cell)) cellAt(b, p).smoke = smokeTurns(b);
      break;
    case 'blink':
      say(b, `${josa(name, '을/를')} 읽었다. 몸이 순식간에 옮겨졌다.`, 'info');
      me.pos = cell;
      break;
    case 'repel':
      say(b, `${josa(name, '을/를')} 읽었다. 보이지 않는 힘이 터져 나왔다!`, 'env');
      for (const d of DIRS8) {
        const t = unitAt(b, add(me.pos, d));
        if (t) push(b, t, d, REPEL_DIST);
      }
      break;
  }
  return true;
}
