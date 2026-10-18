// 공통 전투 파이프라인.
// 평타·마법·몬스터 능력·지속 피해 모두 applyDamage / tryApplyStatus 를 거친다.
import { addThreat, healThreat, threatMult } from './threat';
import { dist } from '../core/rng';
import { STATUSES } from '../data/statuses';
import type { Element, StatusApply } from './defs';
import { addStress } from './stress';
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
  // 구르는 중에는 맞지 않는다 (주장 회피)
  if (target.dashDir && target.dashT > 0 && source && amount > 0) {
    w.float(target, '회피', '#aaddff', 0.8);
    return 0;
  }
  const m = resistMult(target, element);
  if (m === 0) {
    w.float(target, '면역', ELEMENT_COLOR[element]);
    return 0;
  }
  let dmg = amount * m * (source && !opts.dot ? source.stats.dmgMult : 1);
  // 산산조각: 감속 · 기절한 적에게 냉기 피해 증가
  if (element === 'cold' && source?.tags.includes('shatter') && (target.hasStatus('slow') || target.stats.stunned)) dmg *= 1.35;
  if (element === 'physical') dmg -= w.rng.int(0, Math.round(target.stats.ac * 0.6));
  dmg *= target.stats.dmgTakenMult;
  dmg = Math.max(0, Math.round(dmg));

  target.hp -= dmg;
  // 타격감: 큰 피해일수록 멈칫 · 흔들림 · 밀림
  if (dmg > 0 && !opts.dot) {
    const frac = dmg / target.stats.maxHp;
    if (frac >= 0.1) w.hitstop = Math.max(w.hitstop, Math.min(0.09, 0.03 + frac * 0.15));
    if (frac >= 0.15 && (target.faction === 'party' || w.isVisible(target))) w.shake = Math.max(w.shake, Math.min(8, frac * 18));
    if (source) {
      const d = dist(source, target) || 1;
      const k = Math.min(0.28, 0.08 + frac * 0.6);
      target.kickX += ((target.x - source.x) / d) * k;
      target.kickY += ((target.y - source.y) / d) * k;
    }
    w.sound(target.faction === 'party' ? 'hurt' : frac >= 0.15 ? 'heavy' : 'hit');
    w.emit({ type: 'hit', unit: target, heavy: frac >= 0.15, from: source });
  }
  // 불굴: 층마다 한 번 쓰러지지 않고 버틴다
  if (target.hp <= 0 && target.tags.includes('undying') && !target.undyingUsed) {
    target.undyingUsed = true;
    target.hp = 1;
    tryApplyStatus(w, target, { status: 'protected', duration: 4 }, target, 0);
    w.float(target, '불굴!', '#ffe14d', 1.3);
    w.log(`${target.name}이(가) 쓰러지지 않고 버텼다 (불굴)`, '#ffe14d');
  }
  target.flash = 0.12;
  const suffix = m < 1 ? ' 저항' : m > 1 ? ' 약점!' : '';
  w.float(target, `${dmg}${suffix}`, ELEMENT_COLOR[element], opts.dot ? 0.8 : 1);

  // 스트레스: 체력 대비 피해가 클수록. 한 방에 크게 맞으면 더
  if (target.faction === 'party' && dmg > 0) {
    const frac = dmg / target.stats.maxHp;
    addStress(w, target, opts.dot ? frac * 10 : frac * 26 + (frac >= 0.22 ? 5 : 0));
  }

  if (source && source.faction !== target.faction) {
    addThreat(target, source, dmg * threatMult(source));
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

  // 흡혈 (망령)
  if (source?.def.lifesteal && !opts.dot && dmg > 0 && source.alive)
    source.hp = Math.min(source.stats.maxHp, source.hp + dmg * source.def.lifesteal);
  // 반격: 붙어서 때린 적에게 피해 일부를 되돌린다
  if (source && !opts.dot && dmg > 0 && target.tags.includes('retaliate') && source.faction !== target.faction && dist(source, target) < 1.8)
    applyDamage(w, source, dmg * 0.3, 'physical', target, { dot: true });

  if (target.hp <= 0) w.kill(target, source);
  return dmg;
}

export function heal(w: World, target: Unit, amount: number, healer: Unit | null = null) {
  if (!target.alive) return;
  const before = target.hp;
  target.hp = Math.min(target.stats.maxHp, target.hp + amount);
  if (healer && healer.faction === 'party') healThreat(w, healer, target.hp - before);
  w.sound('heal');
  w.emit({ type: 'heal', unit: target });
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
  if (def.stun && tags.includes('sturdy')) ap = { ...ap, duration: ap.duration * 0.5 };
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
  w.emit({ type: 'status', unit: t, status: ap.status });
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
/** 근접 콤보 (파티 근접): 1타 · 2타는 빠르고 약하게, 3타(마무리)는 강하게 + 넉백 · 짧은 경직 */
export const COMBO = [
  { mult: 0.8, delay: 0.7 },
  { mult: 0.9, delay: 0.7 },
  { mult: 1.55, delay: 1.35 },
];

export function performAttack(w: World, u: Unit, t: Unit) {
  u.attackCd = attackDelay(u);
  u.swing = 0.15;
  let mult = 1;
  const combo = u.faction === 'party' && !u.isRanged;
  if (combo) {
    // 잠깐 쉬었거나 대상이 바뀌면 처음부터
    if (w.time - u.comboAt > 2 || u.comboTarget !== t) u.combo = 0;
    const step = COMBO[u.combo];
    u.swingStep = u.combo;
    mult = step.mult;
    u.attackCd *= step.delay;
    u.comboAt = w.time;
    u.comboTarget = t;
    u.combo = (u.combo + 1) % COMBO.length;
  }
  // 연타: 가끔 한 번 더
  const hits = u.tags.includes('double_strike') && w.rng.chance(0.25) ? 2 : 1;
  for (let i = 0; i < hits; i++) weaponStrike(w, u, t, mult);
  if (combo && u.swingStep === COMBO.length - 1 && t.alive) finisher(w, u, t);
}

/** 마무리 타: 밀쳐내기 · 짧은 경직 · 화면 흔들림 (보스 · 덩치 큰 적은 덜 밀린다) */
export function finisher(w: World, u: Unit, t: Unit) {
  const d = dist(u, t) || 1;
  const k = (t.def.boss ? 0.25 : 1) * (3 / Math.max(1, t.def.mass)) * 2.2;
  t.vx += ((t.x - u.x) / d) * k;
  t.vy += ((t.y - u.y) / d) * k;
  if (!t.def.boss) tryApplyStatus(w, t, { status: 'stun', duration: 0.35 }, u, 0);
  w.shake = Math.max(w.shake, 4);
  w.hitstop = Math.max(w.hitstop, 0.05);
}

function weaponStrike(w: World, u: Unit, t: Unit, mult = 1) {
  const wpn = u.weapon;
  if (wpn.projectile) {
    w.spawnProjectile({
      source: u, target: t, x: u.x, y: u.y, tx: t.x, ty: t.y,
      speed: wpn.projectile.speed, color: wpn.projectile.color, size: 0.08,
      style: wpn.skill === 'bow' ? 'arrow' : 'orb', element: wpn.element,
      onHit: () => resolveWeaponHit(w, u, t, mult, false),
    });
  } else {
    resolveWeaponHit(w, u, t, mult, false);
  }
}

export function resolveWeaponHit(w: World, u: Unit, t: Unit, mult: number, guaranteed: boolean) {
  if (!t.alive) return;
  const wpn = u.weapon;
  if (!guaranteed && !w.rng.chance(hitChance(u, t))) {
    w.float(t, '빗나감', '#999999', 0.8);
    return;
  }
  let dmg = w.rng.range(wpn.damage[0], wpn.damage[1]) * weaponDmgMult(u) * mult;
  if (u.tags.includes('sniper') && dist(u, t) >= 4.5) dmg *= 1.25;
  if (!wpn.projectile) w.effect({ kind: 'slash', x: t.x, y: t.y - 0.3, r: 0.4, color: '#ffffff', dur: 0.15 });
  const dealt = applyDamage(w, t, dmg, wpn.element ?? 'physical', u, { attack: true });
  // 흡혈: 조용히 회복 (숫자가 너무 많이 뜨지 않게)
  if (dealt > 0 && u.alive && u.tags.includes('vampiric')) u.hp = Math.min(u.stats.maxHp, u.hp + dealt * 0.15);
  if (wpn.onHit) tryApplyStatus(w, t, wpn.onHit, u, 0);
}
