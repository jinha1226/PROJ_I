// 주인공: 공격력 · 무기 공격 · 무기 고유 기술 (tactics/DESIGN.md 3절)
import {
  ATK_PER_LEVEL, BASE_ATK, DEX_MIN_DMG, INT_CD, INT_PER_SKILL_POWER, MIN_SKILL_CD, POINT_BLANK_MULT, SHORTFALL_PENALTY,
  STR_HP,
} from '../data/rules';
import { FREEZE_TURNS, QUAKE_STUN, STAT_NAME, WEAPONS } from '../data/weapons';
import {
  DIRS8, add, blocked, cellAt, chebyshev, heroUnit, hurt, manhattan, nameOf, push, rollDmg, say, unitAt,
} from './board';
import { opaque } from './sight';
import { applyElement, freeze } from './elements';
import { hitPunct, josa } from './josa';
import type { Battle, DmgRange, HeroInfo, StatId, Unit, Vec, WeaponId } from './types';

export type ActionKind = 'attack' | 'skill';

/** 고를 수 있는 대상: 누를 칸과, 그 칸이 뜻하는 방향 */
export interface Target {
  cell: Vec;
  dir: Vec;
}

/** 무기 공격력 = 기본(레벨) + 무기 + 강화 + 조건을 넘는 능력치 - 모자란 능력치 × 벌점 (최소 1) */
export function attackPower(h: HeroInfo, w: WeaponId = h.weapon): number {
  const def = WEAPONS[w];
  let dmg = BASE_ATK + (h.level - 1) * ATK_PER_LEVEL + def.atk + (h.enchant[w] ?? 0);
  for (const [stat, need] of Object.entries(def.req) as [StatId, number][]) {
    const diff = h.stats[stat] - need;
    dmg += diff >= 0 ? diff : diff * SHORTFALL_PENALTY;
  }
  return Math.max(1, dmg);
}

/** 무기 피해 범위 = 공격력 ± 무기의 흔들림 (최소 1). 민첩이 최소를 올린다 (최대를 넘지 않는다) */
export function attackRange(h: HeroInfo, w: WeaponId = h.weapon): DmgRange {
  const p = attackPower(h, w);
  const s = WEAPONS[w].spread;
  const hi = p + s;
  return [Math.min(hi, Math.max(1, p - s) + (h.stats.dex - 1) * DEX_MIN_DMG), hi];
}

/** 기술 위력 보너스 (지능 2점마다 +1): 피해 +1 / 밀기 +1칸 / 기절 · 빙결 +1턴 */
export function skillPower(h: HeroInfo): number {
  return Math.floor((h.stats.int - 1) / INT_PER_SKILL_POWER);
}

/** 기술 재사용 대기. 지능이 줄인다 */
export function skillCd(h: HeroInfo, w: WeaponId = h.weapon): number {
  return Math.max(MIN_SKILL_CD, WEAPONS[w].skill.cd - (h.stats.int - 1) * INT_CD);
}

/** 조건이 모자란 능력치 설명 (없으면 빈 문자열) */
export function shortfall(h: HeroInfo, w: WeaponId): string {
  const parts: string[] = [];
  for (const [stat, need] of Object.entries(WEAPONS[w].req) as [StatId, number][]) {
    if (h.stats[stat] < need) parts.push(`${STAT_NAME[stat]} ${need - h.stats[stat]} 부족`);
  }
  return parts.join(', ');
}

/** 지팡이 화살: d 방향으로 range칸까지 날아가 처음 맞은 유닛에서 멈춘다. 바위 · 증기 · 연기 앞에서 멈춘다 */
function boltPath(b: Battle, from: Vec, d: Vec, range: number): Vec[] {
  const out: Vec[] = [];
  for (let i = 1; i <= range; i++) {
    const p = add(from, d, i);
    if (blocked(b, p) || opaque(cellAt(b, p))) break;
    out.push(p);
    if (unitAt(b, p)) break;
  }
  return out;
}

export function skillReady(b: Battle): boolean {
  return (b.hero.cooldown[b.hero.weapon] ?? 0) === 0;
}

export function targets(b: Battle, kind: ActionKind): Target[] {
  const me = heroUnit(b);
  const def = WEAPONS[b.hero.weapon];
  const here = { cell: me.pos, dir: { x: 0, y: 0 } };
  const out: Target[] = [];
  if (kind === 'attack') {
    if (def.attack === 'around') return [here];
    for (const d of DIRS8) {
      if (def.attack === 'bolt') {
        for (const cell of boltPath(b, me.pos, d, def.range ?? 3)) out.push({ cell, dir: d });
      } else {
        const len = def.attack === 'reach2' ? 2 : 1;
        for (let i = 1; i <= len; i++) {
          const cell = add(me.pos, d, i);
          if (!blocked(b, cell)) out.push({ cell, dir: d });
        }
      }
    }
    return out;
  }
  if (!skillReady(b)) return [];
  const sk = def.skill;
  switch (sk.kind) {
    case 'shove':
    case 'quake':
      return [here];
    case 'slash':
      for (const d of DIRS8) {
        const foe = unitAt(b, add(me.pos, d));
        const beyond = add(me.pos, d, 2);
        if (foe && heroCanStand(b, beyond)) out.push({ cell: foe.pos, dir: d });
      }
      return out;
    case 'thrust':
      for (const d of DIRS8) {
        const foe = unitAt(b, add(me.pos, d));
        if (foe) out.push({ cell: foe.pos, dir: d });
      }
      return out;
    case 'burst':
      for (let y = 0; y < b.h; y++) {
        for (let x = 0; x < b.w; x++) {
          const cell = { x, y };
          if (manhattan(cell, me.pos) <= (sk.range ?? 4) && !blocked(b, cell)) out.push({ cell, dir: { x: 0, y: 0 } });
        }
      }
      return out;
    case 'freeze':
      for (const u of b.units) {
        if (!u.dead && u.kind !== 'hero' && manhattan(u.pos, me.pos) <= (sk.range ?? 3)) out.push({ cell: u.pos, dir: { x: 0, y: 0 } });
      }
      return out;
  }
}

/** 주인공이 서 있어도 되는 칸 (바위 · 구덩이 · 용암 · 다른 유닛 제외) */
export function heroCanStand(b: Battle, p: Vec): boolean {
  if (blocked(b, p)) return false;
  const t = cellAt(b, p).tile;
  return t !== 'pit' && t !== 'lava' && !unitAt(b, p);
}

/** 맞은 것마다 따로 굴린다 */
function strike(b: Battle, t: Unit | undefined, range: DmgRange): void {
  if (!t) return;
  const dmg = rollDmg(b, range, 'hero');
  hurt(b, t, dmg, `${josa(nameOf(t), '을/를')} 맞혔다${hitPunct(dmg)}`);
}

/** 행동을 실행한다. 대상이 목록에 없으면 false (아무것도 바뀌지 않는다) */
export function perform(b: Battle, kind: ActionKind, cell: Vec): boolean {
  const tg = targets(b, kind).find((t) => t.cell.x === cell.x && t.cell.y === cell.y);
  if (!tg) return false;
  const me = heroUnit(b);
  const h = b.hero;
  const def = WEAPONS[h.weapon];
  const dmg = attackRange(h);
  const d = tg.dir;

  if (kind === 'attack') {
    switch (def.attack) {
      case 'adjacent': {
        const t = unitAt(b, add(me.pos, d));
        strike(b, t, dmg);
        if (t && !t.dead && def.push) push(b, t, d, def.push);
        if (!t) say(b, '허공을 갈랐다.');
        break;
      }
      case 'reach2': {
        const hit = [add(me.pos, d), add(me.pos, d, 2)].map((p) => unitAt(b, p)).filter((u): u is Unit => !!u);
        for (const t of hit) strike(b, t, dmg);
        if (!hit.length) say(b, '허공을 찔렀다.');
        break;
      }
      case 'around': {
        const hit = DIRS8.map((o) => unitAt(b, add(me.pos, o))).filter((u): u is Unit => !!u);
        for (const t of hit) strike(b, t, dmg);
        if (!hit.length) say(b, '허공을 휘둘렀다.');
        break;
      }
      case 'bolt': {
        const path = boltPath(b, me.pos, d, def.range ?? 3);
        const end = path[path.length - 1]!;
        const t = unitAt(b, end);
        const close = chebyshev(end, me.pos) <= 1 && def.weakClose;
        const half = (n: number) => Math.max(1, Math.floor(n * POINT_BLANK_MULT));
        strike(b, t, close ? [half(dmg[0]), half(dmg[1])] : dmg);
        if (def.element) applyElement(b, [end], def.element);
        break;
      }
    }
    return true;
  }

  const sk = def.skill;
  const pow = skillPower(h);
  say(b, `${sk.name}!`, 'info');
  switch (sk.kind) {
    case 'slash': {
      strike(b, unitAt(b, add(me.pos, d)), [dmg[0] + pow, dmg[1] + pow]);
      me.pos = add(me.pos, d, 2);
      break;
    }
    case 'shove':
      for (const o of DIRS8) {
        const t = unitAt(b, add(me.pos, o));
        if (t) push(b, t, o, 1 + pow);
      }
      break;
    case 'thrust': {
      const t = unitAt(b, add(me.pos, d));
      strike(b, t, dmg);
      if (t && !t.dead) push(b, t, d, 2 + pow);
      break;
    }
    case 'quake':
      for (const o of DIRS8) {
        const t = unitAt(b, add(me.pos, o));
        if (!t) continue;
        t.stunned = Math.max(t.stunned, QUAKE_STUN + pow);
        say(b, `${josa(nameOf(t), '이/가')} 기절했다.`, 'env');
      }
      break;
    case 'burst': {
      const area = [tg.cell, ...DIRS8.map((o) => add(tg.cell, o))].filter((p) => !blocked(b, p));
      const fixed = (sk.dmg ?? 2) + pow;
      for (const p of area) strike(b, unitAt(b, p), [fixed, fixed]);
      applyElement(b, area, 'fire');
      break;
    }
    case 'freeze': {
      const t = unitAt(b, tg.cell);
      if (t) freeze(b, t, FREEZE_TURNS + pow);
      applyElement(b, [tg.cell], 'frost');
      break;
    }
  }
  h.cooldown[h.weapon] = skillCd(h);
  return true;
}

/** 능력치 +1과 무기와 상관없는 효과 (힘 = 최대 체력) */
export function applyStat(h: HeroInfo, stat: StatId): void {
  h.stats[stat]++;
  if (stat === 'str') {
    h.maxHp += STR_HP;
    h.hp += STR_HP;
  }
}
