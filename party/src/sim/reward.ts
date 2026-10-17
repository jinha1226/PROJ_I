// 층 보상: 장비 3택1, 그리고 장비를 바꿨을 때 수치가 어떻게 달라지는지 비교.
import type { Rng } from '../core/rng';
import { RES_NAME } from '../data/names';
import { RESIST_KEYS, type Item } from './defs';
import type { Hero } from './hero';
import { genItem } from './items';
import { attackDelay, avgWeaponDamage, computeStats, failChance } from './stats';
import { Unit } from './unit';

/** 파티에게 가장 좋은 비교 점수 */
export function bestScore(heroes: Hero[], it: Item): number {
  return heroes.reduce((m, h) => Math.max(m, compareItem(h, it).score), -Infinity);
}

/** 파티 누군가에게 확실히 좋은 장비 (몇 번 다시 뽑아 보고, 없으면 가장 나은 것) */
export function usefulItem(rng: Rng, depth: number, heroes: Hero[], opts: Parameters<typeof genItem>[2] = {}): Item {
  let best: Item | null = null, bs = -Infinity;
  for (let i = 0; i < 8; i++) {
    const it = genItem(rng, depth, opts);
    const s = heroes.length ? bestScore(heroes, it) : 1;
    if (s > 0) return it;
    if (s > bs) { bs = s; best = it; }
  }
  return best!;
}

/** 층 보상 3택1: 첫째는 확실히 쓸모 있는 것, 나머지도 모두에게 손해인 것은 피한다. 같은 칸만 셋 나오지 않게 */
export function rewardChoices(rng: Rng, depth: number, heroes: Hero[] = []): Item[] {
  const out: Item[] = [usefulItem(rng, depth, heroes)];
  for (let i = 1; i < 3; i++) {
    let it = genItem(rng, depth);
    for (let t = 0; t < 6; t++) {
      const sameSlots = i === 2 && out.every((o) => o.base.slot === it.base.slot);
      const useless = heroes.length > 0 && bestScore(heroes, it) < -5;
      if (!sameSlots && !useless) break;
      it = genItem(rng, depth);
    }
    out.push(it);
  }
  // 확실한 것이 늘 첫 칸이면 티가 나므로 섞는다
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Snapshot {
  hp: number;
  mp: number;
  ac: number;
  ev: number;
  will: number;
  dps: number;
  fail: number;
  failName: string;
  resists: Record<string, number>;
}

function snapshot(h: Hero, gear: Hero['gear']): Snapshot {
  const u = new Unit(0, h.def, 'party', 0, 0, { ...h, gear });
  computeStats(u);
  let fail = 0, failName = '';
  for (const a of u.abilities) {
    if (a.hidden || a.def.type !== 'spell') continue;
    const f = failChance(u, a.def);
    if (f >= fail) { fail = f; failName = a.def.name; }
  }
  return {
    hp: u.stats.maxHp, mp: u.stats.maxMp, ac: u.stats.ac, ev: u.stats.ev, will: u.stats.will,
    dps: avgWeaponDamage(u) / attackDelay(u), fail, failName, resists: { ...u.stats.resists },
  };
}

export interface Diff {
  lines: { text: string; good: boolean }[];
  /** 자동 선택용 대략 점수 (클수록 좋음) */
  score: number;
}

/** 영웅이 이 장비로 바꾸면? */
export function compareItem(h: Hero, it: Item): Diff {
  const a = snapshot(h, h.gear);
  const b = snapshot(h, { ...h.gear, [it.base.slot]: it });
  const lines: Diff['lines'] = [];
  let score = 0;
  // 원거리 ↔ 근접이 바뀌면 전투 방식 자체가 달라진다
  const cur = h.gear.weapon?.base.weapon ?? h.def.weapon;
  if (it.base.weapon && (it.base.weapon.range > 1.5) !== (cur.range > 1.5)) {
    lines.push({ text: it.base.weapon.range > 1.5 ? '⚠ 원거리 무기로 바뀜' : '⚠ 근접 무기로 바뀜', good: false });
    score -= 40;
  }
  if (it.base.weapon && it.base.weapon.skill !== cur.skill && h.skills[it.base.weapon.skill] < 1) score -= 15;
  const num = (label: string, d: number, w: number, digits = 0) => {
    if (Math.abs(d) < (digits ? 0.05 : 0.5)) return;
    lines.push({ text: `${label} ${d > 0 ? '+' : ''}${d.toFixed(digits)}`, good: d > 0 });
    score += d * w;
  };
  num('체력', b.hp - a.hp, 0.4);
  if (a.mp || b.mp) num('마나', b.mp - a.mp, 0.3);
  num('AC', b.ac - a.ac, 2.5);
  num('회피', b.ev - a.ev, 1.5);
  num('의지력', b.will - a.will, 0.2);
  // 평타는 원래 무기 성능에 비례해 의미가 다르므로 비율로 본다
  const dpsPct = a.dps > 0 ? (b.dps / a.dps - 1) * 100 : 0;
  if (Math.abs(dpsPct) >= 3) {
    lines.push({ text: `평타 ${dpsPct > 0 ? '+' : ''}${dpsPct.toFixed(0)}%`, good: dpsPct > 0 });
    score += dpsPct * (h.def.role === 'caster' || h.def.role === 'support' ? 0.05 : 0.25);
  }
  const df = (b.fail - a.fail) * 100;
  if (Math.abs(df) >= 1) {
    lines.push({ text: `실패율 ${df > 0 ? '+' : ''}${df.toFixed(0)}%p (${b.failName || a.failName})`, good: df < 0 });
    score -= df * 0.8;
  }
  for (const k of RESIST_KEYS) {
    const d = b.resists[k] - a.resists[k];
    if (!d) continue;
    lines.push({ text: `${RES_NAME[k]} 저항 ${d > 0 ? '+' : ''}${d}`, good: d > 0 });
    score += d * 4;
  }
  // 위력 % 등 수치 비교에 안 잡히는 속성은 대략 가산
  for (const p of it.props) {
    if (p.kind === 'power') score += (h.def.learnable?.some((l) => l.skill === p.school) || h.skills[p.school] > 0 ? p.v * 0.3 : 0);
    if (p.kind === 'castSpeed' && (h.def.role === 'caster' || h.def.role === 'support')) score += p.v * 0.2;
    if (p.kind === 'tag') score += 6;
    if (p.kind === 'onHit') score += 3;
  }
  const old = h.gear[it.base.slot];
  if (old) for (const p of old.props) if (p.kind === 'power' || p.kind === 'castSpeed' || p.kind === 'tag') score -= 4;
  return { lines, score };
}
