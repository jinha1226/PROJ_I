// 공통 전투 파이프라인.
// 평타·마법·몬스터 능력·지속 피해 모두 applyDamage / tryApplyStatus 를 거친다.
import { STATUSES } from '../data/statuses';
import { train } from './hero';
import type { Element, StatusApply } from './defs';
import { attackDelay, hitChance, RESIST_MULT, weaponDmgMult, willChance } from './stats';
import type { Unit } from './unit';
import type { World } from './world';

export const ELEMENT_COLOR: Record<Element, string> = {
  physical: '#e8e8e8', fire: '#ff7a2f', cold: '#66ccff', elec: '#ffe14d',
  poison: '#7dd35a', neg: '#b07cff', holy: '#ffeeaa',
};

export const ELEMENT_NAME: Record<Element, string> = {
  physical: '물리', fire: '화염', cold: '냉기', elec: '전기', poison: '독', neg: '음에너지', holy: '신성',
};

/** 원소 피해 배율. 0 = 면역 */
export function resistMult(u: Unit, el: Element): number {
  if (el === 'physical' || el === 'holy') return 1;
  const lvl = u.stats.resists[el];
  if (el === 'poison') return lvl >= 1 ? 0 : 1;
  return RESIST_MULT(lvl);
}

export interface DamageOpts {
  attack?: boolean;
  dot?: boolean;
}

export function applyDamage(
  w: World, target: Unit, amount: number, element: Element, source: Unit | null, opts: DamageOpts = {},
): number {
  if (!target.alive) return 0;
  const m = resistMult(target, element);
  if (m === 0) {
    w.float(target, '면역', ELEMENT_COLOR[element]);
    return 0;
  }
  let dmg = amount * m * (source && !opts.dot ? source.stats.dmgMult : 1);
  if (element === 'physical') dmg -= w.rng.int(0, Math.round(target.stats.ac * 0.6));
  dmg *= target.stats.dmgTakenMult;
  dmg = Math.max(0, Math.round(dmg));

  target.hp -= dmg;
  target.flash = 0.12;
  const suffix = m < 1 ? ' 저항' : m > 1 ? '!' : '';
  w.float(target, `${dmg}${suffix}`, ELEMENT_COLOR[element], opts.dot ? 0.8 : 1);

  if (source && source.faction !== target.faction) {
    target.aggro.set(source.id, (target.aggro.get(source.id) ?? 0) + dmg);
    w.alert(target);
  }

  // 시전 방해: 시전 시간이 긴 마법일수록, 큰 피해일수록 끊기기 쉽다.
  // 기술(내려찍기, 조준 사격)은 맞아도 끊기지 않고 기절로만 끊긴다
  if (target.cast && dmg > 0 && !opts.dot) {
    const ab = target.abilities[target.cast.slot].def;
    if (ab.type === 'spell' && ab.castTime >= 0.8) {
      const p = 0.1 + (dmg / target.stats.maxHp) * 1.5;
      if (w.rng.chance(p)) w.cancelCast(target, '시전 방해!');
    }
  }

  if (target.hp <= 0) w.kill(target, source);
  return dmg;
}

export function heal(w: World, target: Unit, amount: number) {
  if (!target.alive) return;
  const before = target.hp;
  target.hp = Math.min(target.stats.maxHp, target.hp + amount);
  w.float(target, `+${Math.round(target.hp - before)}`, '#88ff88');
}

/** 상태이상 부여: 확률 → 면역 태그 → 원소 저항 → 의지력 순으로 판정 */
export function tryApplyStatus(w: World, t: Unit, ap: StatusApply, source: Unit | null, power: number): boolean {
  const def = STATUSES[ap.status];
  if (!t.alive) return false;
  if (ap.chance !== undefined && !w.rng.chance(ap.chance)) return false;
  const tags = t.tags;
  if (def.immuneTag && tags.includes(def.immuneTag)) {
    w.float(t, `${def.name} 면역`, '#aaaaaa');
    return false;
  }
  if (def.resist) {
    const lvl = t.stats.resists[def.resist];
    if (def.resist === 'poison' ? lvl >= 1 : lvl >= 3) {
      w.float(t, `${def.name} 면역`, '#aaaaaa');
      return false;
    }
    if (lvl > 0 && !w.rng.chance(1 - lvl * 0.3)) {
      w.float(t, `${def.name} 저항`, '#aaaaaa');
      return false;
    }
  }
  if (ap.will) {
    if (tags.includes('mindless')) {
      w.float(t, '정신 없음: 면역', '#aaaaaa');
      return false;
    }
    if (!w.rng.chance(willChance(power, t.stats.will))) {
      w.float(t, '의지로 저항', '#aaaaaa');
      return false;
    }
  }

  const stacks = ap.stacks ?? 1;
  const ex = t.hasStatus(ap.status);
  if (ex) {
    ex.time = Math.max(ex.time, ap.duration);
    if (def.stacking === 'intensity') ex.stacks = Math.min(def.maxStacks ?? 9, ex.stacks + stacks);
    ex.source = source;
  } else {
    t.statuses.push({ def, time: ap.duration, stacks: def.stacking === 'intensity' ? stacks : 1, source, tick: 0 });
  }
  if (def.stun && t.cast) w.cancelCast(t, '');
  w.float(t, def.name, def.color);
  return true;
}

export function tickStatuses(w: World, u: Unit, dt: number) {
  for (const s of u.statuses) {
    s.time -= dt;
    if (s.def.dot) {
      s.tick += dt;
      if (s.tick >= 1) {
        s.tick -= 1;
        applyDamage(w, u, s.def.dot.perSecond * s.stacks, s.def.dot.element, s.source, { dot: true });
      }
    }
  }
  if (u.statuses.some((s) => s.time <= 0)) u.statuses = u.statuses.filter((s) => s.time > 0);
}

export function cleanse(w: World, u: Unit) {
  const n = u.statuses.length;
  u.statuses = u.statuses.filter((s) => !s.def.harmful || s.def.id === 'taunted');
  if (u.statuses.length !== n) w.float(u, '정화', '#ccffff');
}

/** 평타 */
export function performAttack(w: World, u: Unit, t: Unit) {
  u.attackCd = attackDelay(u);
  u.swing = 0.15;
  const wpn = u.weapon;
  train(u, wpn.skill, 1);
  train(u, 'fighting', 0.4);
  if (wpn.projectile) {
    w.spawnProjectile({
      source: u, target: t, x: u.x, y: u.y, tx: t.x, ty: t.y,
      speed: wpn.projectile.speed, color: wpn.projectile.color, size: 0.08,
      onHit: () => resolveWeaponHit(w, u, t, 1, false),
    });
  } else {
    resolveWeaponHit(w, u, t, 1, false);
  }
}

export function resolveWeaponHit(w: World, u: Unit, t: Unit, mult: number, guaranteed: boolean) {
  if (!t.alive) return;
  const wpn = u.weapon;
  if (!guaranteed && !w.rng.chance(hitChance(u, t))) {
    w.float(t, '빗나감', '#999999', 0.8);
    train(t, 'dodge', 0.6);
    return;
  }
  // 맞는 쪽: 갑옷·방패 훈련
  if (t.armourWeight > 0) train(t, 'armour', 0.5);
  if (t.skills.shield > 0) train(t, 'shield', 0.4);
  const dmg = w.rng.range(wpn.damage[0], wpn.damage[1]) * weaponDmgMult(u) * mult;
  if (!wpn.projectile) w.effect({ kind: 'slash', x: t.x, y: t.y - 0.3, r: 0.4, color: '#ffffff', dur: 0.15 });
  applyDamage(w, t, dmg, wpn.element ?? 'physical', u, { attack: true });
  if (wpn.onHit) tryApplyStatus(w, t, wpn.onHit, u, 0);
}
