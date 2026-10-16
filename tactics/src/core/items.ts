// 소모품: 고를 수 있는 칸 · 쓰기 (tactics/DESIGN.md 6절). 턴 넘기기는 game.ts가 한다
import { ITEMS } from '../data/items';
import { SMOKE_TURNS } from '../data/rules';
import { DIRS8, add, blocked, cellAt, chebyshev, eq, heroUnit, say } from './board';
import { josa } from './josa';
import type { Battle, ItemId, Vec } from './types';

/** 이 소모품을 쓸 수 있는 칸 */
export function itemTargets(b: Battle, id: ItemId): Vec[] {
  const me = heroUnit(b);
  const out: Vec[] = [];
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const p = { x, y };
      if (!blocked(b, p) && chebyshev(p, me.pos) <= ITEMS[id].range) out.push(p);
    }
  }
  return out;
}

/** idx번째 소모품을 cell에 쓴다. 칸이 안 되면 false (아무것도 바뀌지 않는다) */
export function applyItem(b: Battle, idx: number, cell: Vec): boolean {
  const id = b.hero.items[idx];
  if (!id || !itemTargets(b, id).some((p) => eq(p, cell))) return false;
  b.hero.items.splice(idx, 1);
  say(b, `${josa(ITEMS[id].name, '을/를')} 읽었다.`, 'info');
  switch (id) {
    case 'smoke':
      for (const d of [{ x: 0, y: 0 }, ...DIRS8]) {
        const p = add(cell, d);
        if (!blocked(b, p)) cellAt(b, p).smoke = SMOKE_TURNS;
      }
      say(b, '짙은 연기가 피어올랐다.', 'env');
      break;
  }
  return true;
}
