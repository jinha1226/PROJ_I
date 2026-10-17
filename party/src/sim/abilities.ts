import { dist } from '../core/rng';
import { STATUSES } from '../data/statuses';
import type { AbilityDef, Effect } from './defs';
import { applyDamage, cleanse, heal, resistMult, resolveWeaponHit, tryApplyStatus } from './combat';
import { abilityPower, avgWeaponDamage, failChance, hitChance } from './stats';
import type { AbilityState, Unit } from './unit';
import type { World } from './world';

export function abilityReady(u: Unit, st: AbilityState): boolean {
  return st.cd <= 0 && u.mp >= st.def.cost;
}

export function affects(ab: AbilityDef, caster: Unit, v: Unit): boolean {
  const a = ab.affects ?? (ab.target === 'ally' ? 'allies' : 'enemies');
  if (a === 'all') return true;
  return a === 'allies' ? v.faction === caster.faction : v.faction !== caster.faction;
}

export function areaCenter(ab: AbilityDef, u: Unit, x: number, y: number) {
  return ab.target === 'self' ? { x: u.x, y: u.y } : { x, y };
}

export function unitsInArea(w: World, ab: AbilityDef, u: Unit, x: number, y: number): Unit[] {
  const c = areaCenter(ab, u, x, y);
  const r = ab.radius ?? 0;
  return w.units.filter((v) => v.alive && dist(v, c) <= r + v.radius * 0.5 && affects(ab, u, v));
}

export function beginCast(w: World, u: Unit, slot: number, target: Unit | null, x: number, y: number) {
  const ab = u.abilities[slot].def;
  if (ab.castTime <= 0) {
    resolveAbility(w, u, slot, target, x, y);
    return;
  }
  u.cast = { slot, target, x, y, time: 0, total: ab.castTime };
}

export function updateCast(w: World, u: Unit, dt: number) {
  const c = u.cast!;
  if (c.target) {
    if (!c.target.alive) {
      u.cast = null;
      return;
    }
    c.x = c.target.x;
    c.y = c.target.y;
  }
  c.time += dt * u.stats.actionMult;
  if (c.time >= c.total) {
    u.cast = null;
    resolveAbility(w, u, c.slot, c.target, c.x, c.y);
  }
}

function resolveAbility(w: World, u: Unit, slot: number, target: Unit | null, x: number, y: number) {
  const st = u.abilities[slot];
  const ab = st.def;
  const fail = failChance(u, ab);
  if (fail > 0 && w.rng.chance(fail)) {
    u.mp -= ab.cost;
    st.cd = ab.cooldown * 0.5;
    w.float(u, `${ab.name} 실패!`, '#ff8888');
    w.log(`${u.name}의 ${ab.name} 시전 실패 (실패율 ${Math.round(fail * 100)}%)`, '#ff8888');
    return;
  }
  u.mp -= ab.cost;
  st.cd = ab.cooldown;
  const power = abilityPower(u, ab);
  if (ab.castTime > 0 || ab.radius || u.def.boss) w.log(`${u.name}: ${ab.name}`, ab.color);
  if (ab.selfEffects) applyEffects(w, u, ab.selfEffects, u, power);

  if (ab.dash && target) {
    const d = dist(u, target);
    const stop = u.radius + target.radius + 0.05;
    if (d > stop) {
      const t = (d - stop) / d;
      const fx = u.x, fy = u.y;
      u.x += (target.x - u.x) * t;
      u.y += (target.y - u.y) * t;
      w.effect({ kind: 'trail', x: fx, y: fy, x2: u.x, y2: u.y, r: 0, color: ab.color, dur: 0.3 });
    }
  }

  const land = () => landAbility(w, u, ab, target, x, y, power);
  if (ab.projectile) {
    w.spawnProjectile({
      source: u, target: ab.target === 'enemy' || ab.target === 'ally' ? target : null,
      x: u.x, y: u.y, tx: x, ty: y, speed: ab.projectile.speed, color: ab.projectile.color,
      size: ab.radius ? 0.18 : 0.12, onHit: land,
    });
  } else {
    land();
  }
}

function landAbility(w: World, u: Unit, ab: AbilityDef, target: Unit | null, x: number, y: number, power: number) {
  let victims: Unit[];
  if (ab.radius) {
    const c = areaCenter(ab, u, x, y);
    w.effect({ kind: 'ring', x: c.x, y: c.y, r: ab.radius, color: ab.color, dur: 0.45 });
    victims = unitsInArea(w, ab, u, x, y);
  } else {
    victims = target && target.alive ? [target] : [];
    if (target) w.effect({ kind: 'ring', x: target.x, y: target.y, r: 0.5, color: ab.color, dur: 0.25 });
  }
  for (const v of victims) applyEffects(w, u, ab.effects, v, power);
}

function applyEffects(w: World, u: Unit, effects: Effect[], v: Unit, power: number) {
  for (const e of effects) {
    if (!v.alive) return;
    switch (e.kind) {
      case 'damage':
        applyDamage(w, v, w.rng.range(e.base[0], e.base[1]) + power * e.scale, e.element, u);
        break;
      case 'weapon':
        resolveWeaponHit(w, u, v, e.mult, true);
        break;
      case 'heal':
        heal(w, v, w.rng.range(e.base[0], e.base[1]) + power * e.scale);
        break;
      case 'status':
        tryApplyStatus(w, v, e, u, power);
        break;
      case 'cleanse':
        cleanse(w, v);
        break;
      case 'taunt':
        tryApplyStatus(w, v, { status: 'taunted', duration: e.duration }, u, power);
        break;
    }
  }
}

// ── AI 용 기대값 계산 ──

/** 대상 하나에게 이 능력이 줄 기대 피해 (저항·면역 반영) */
export function expectedDamage(u: Unit, ab: AbilityDef, t: Unit): number {
  const power = abilityPower(u, ab);
  let total = 0;
  for (const e of ab.effects) {
    if (e.kind === 'damage') {
      let d = ((e.base[0] + e.base[1]) / 2 + power * e.scale) * resistMult(t, e.element) * u.stats.dmgMult;
      if (e.element === 'physical') d -= t.stats.ac * 0.3;
      total += Math.max(0, d);
    } else if (e.kind === 'weapon') {
      const el = u.def.weapon.element ?? 'physical';
      let d = avgWeaponDamage(u) * e.mult * resistMult(t, el);
      if (el === 'physical') d -= t.stats.ac * 0.3;
      total += Math.max(0, d) * (ab.type === 'technique' ? 1 : hitChance(u, t));
    } else if (e.kind === 'status') {
      const def = STATUSES[e.status].dot;
      if (def) {
        const m = resistMult(t, def.element);
        total += def.perSecond * (e.stacks ?? 1) * e.duration * (e.chance ?? 1) * m * 0.7;
      }
    }
  }
  return total * (1 - failChance(u, ab));
}

export function expectedHeal(u: Unit, ab: AbilityDef): number {
  const power = abilityPower(u, ab);
  let h = 0;
  for (const e of ab.effects) if (e.kind === 'heal') h += (e.base[0] + e.base[1]) / 2 + power * e.scale;
  return h;
}
