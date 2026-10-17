// 모든 수치 공식은 여기 모은다. 스킬·장비·상태이상이 같은 규칙으로 능력치에 반영된다.
// DCSS 를 단순화: 능력치 3종, 스킬 0~10, 저항 -1~3 단계, 의지력 숫자 하나.
import { clamp } from '../core/rng';
import { RESIST_KEYS, type AbilityDef, type ResistKey } from './defs';
import type { Unit } from './unit';

export function computeStats(u: Unit) {
  const d = u.def, sk = u.skills;
  const weight = d.armourWeight ?? 0;
  let ac = d.ac + weight * sk.armour * 0.08 + sk.shield * 0.25;
  let ev = d.ev + sk.dodge * 0.8 + d.dex * 0.15 - weight * 0.4;
  let moveMult = 1, actionMult = 1, dmgMult = 1, dmgTakenMult = 1, stunned = false;
  for (const s of u.statuses) {
    const m = s.def.mods;
    if (m) {
      if (m.ac) ac += m.ac;
      if (m.ev) ev += m.ev;
      if (m.moveMult) moveMult *= m.moveMult;
      if (m.actionMult) actionMult *= m.actionMult;
      if (m.dmgMult) dmgMult *= m.dmgMult;
      if (m.dmgTakenMult) dmgTakenMult *= m.dmgTakenMult;
    }
    if (s.def.stun) stunned = true;
  }
  const resists = {} as Record<ResistKey, number>;
  for (const k of RESIST_KEYS) resists[k] = d.resists?.[k] ?? 0;

  u.stats = {
    maxHp: Math.round(d.hp + sk.fighting * 3),
    maxMp: d.mp > 0 ? d.mp + sk.spellcasting * 2 : 0,
    ac: Math.max(0, ac),
    ev: Math.max(0, ev),
    will: d.will,
    acc: 6 + sk[d.weapon.skill] * 1.5 + d.dex * 0.6 + sk.fighting * 0.5,
    moveSpeed: d.speed * moveMult,
    actionMult,
    dmgMult,
    dmgTakenMult,
    resists,
    stunned,
  };
}

export const RESIST_MULT = (lvl: number) =>
  lvl <= -1 ? 1.5 : lvl === 0 ? 1 : lvl === 1 ? 0.5 : lvl === 2 ? 0.33 : 0.2;

export function attackDelay(u: Unit): number {
  const w = u.def.weapon;
  return (w.delay * Math.max(0.6, 1 - u.skills[w.skill] * 0.025)) / u.stats.actionMult;
}

export function weaponDmgMult(u: Unit): number {
  const w = u.def.weapon;
  const stat = u.isRanged ? u.def.dex : u.def.str;
  return 1 + stat * 0.02 + u.skills[w.skill] * 0.04 + u.skills.fighting * 0.01;
}

export function avgWeaponDamage(u: Unit): number {
  const [a, b] = u.def.weapon.damage;
  return ((a + b) / 2) * weaponDmgMult(u) * u.stats.dmgMult;
}

export function hitChance(att: Unit, def: Unit): number {
  return clamp(0.8 + (att.stats.acc - def.stats.ev) * 0.025, 0.25, 0.97);
}

export function attackReach(u: Unit, t: Unit): number {
  return u.def.weapon.range + u.radius + t.radius;
}

function schoolSkill(u: Unit, ab: AbilityDef): number {
  const sc = ab.schools;
  if (!sc || sc.length === 0) return u.skills.spellcasting;
  return sc.reduce((s, k) => s + u.skills[k], 0) / sc.length;
}

/** 주문력 / 기술 위력 */
export function abilityPower(u: Unit, ab: AbilityDef): number {
  const school = schoolSkill(u, ab);
  if (ab.type === 'spell') return u.def.int * 0.6 + u.skills.spellcasting + school * 2.5;
  return u.def.str * 0.3 + school * 2;
}

/** 마법 실패율: 난이도 + 갑옷 무게 vs 계열 스킬 + 주문시전 + 지능 */
export function failChance(u: Unit, ab: AbilityDef): number {
  if (ab.type !== 'spell') return 0;
  const diff = (ab.level ?? 1) * 6 + (u.def.armourWeight ?? 0) * 1.5;
  const skill = schoolSkill(u, ab) * 2.5 + u.skills.spellcasting + u.def.int * 0.3;
  return clamp((diff - skill) * 0.02, 0, 0.9);
}

/** 의지력 판정 성공 확률 (시전자 관점) */
export function willChance(power: number, will: number): number {
  return clamp(0.5 + (power - will) * 0.03, 0.05, 0.95);
}
