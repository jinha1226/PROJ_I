// 유틸리티 점수 기반 AI. 파티원·몬스터·소환수가 같은 함수를 쓰고,
// 전술 유형(tactic)과 대상 선호(targetPref)가 점수 가중치만 바꾼다.
import { dist } from '../core/rng';
import { STATUSES } from '../data/statuses';
import { abilityReady, areaCenter, expectedDamage, expectedHeal, unitsInArea } from './abilities';
import type { AbilityDef } from './defs';
import { resistMult } from './combat';
import { attackDelay, attackReach, avgWeaponDamage, hitChance, willChance, abilityPower } from './stats';
import type { Intent, Unit } from './unit';
import type { World } from './world';

interface Cand {
  intent: Intent;
  score: number;
}

export function threatOf(e: Unit): number {
  let t = avgWeaponDamage(e) / attackDelay(e);
  if (e.abilities.some((a) => a.def.type === 'spell')) t += 4;
  if (e.cast) t += 6;
  if (e.def.boss) t += 6;
  return t;
}

export function think(w: World, u: Unit): Intent | null {
  const taunt = u.hasStatus('taunted');
  if (taunt?.source?.alive) return { type: 'attack', target: taunt.source };

  const enemies = w.knownEnemies(u);
  if (enemies.length === 0) return idle(w, u);
  if (u.hasStatus('fear')) return flee(w, u, enemies);

  // 붕괴 (sim/stress.ts): 자동전투 행동이 망가진다
  const mood = u.hero?.mood;
  if (mood === 'afraid' && enemies.some((e) => dist(u, e) < 5)) return flee(w, u, enemies);
  if (mood === 'hesitant' && w.rng.chance(0.25)) {
    if (!w.isSaying(u)) w.say(u, '…', '#8fa0b8', 1.2);
    return null;
  }
  if (mood === 'reckless') {
    // 가장 먼 적에게까지 혼자 돌진한다 (한 번 정하면 쓰러질 때까지)
    u.holdPos = null;
    const cur = u.intent?.type === 'attack' && u.intent.target.alive ? u.intent.target : null;
    if (cur) return u.intent;
    let far = enemies[0];
    for (const e of enemies) if (dist(u, e) > dist(u, far)) far = e;
    return { type: 'attack', target: far };
  }

  // 동료(자동)는 적의 예고 범위(빨간 원)를 스스로 피한다. 주장은 플레이어 몫
  if (u.faction === 'party' && u.autoMode) {
    const out = dodgeTelegraph(w, u);
    if (out) return out;
  }

  const manual = u.faction === 'party' && !u.autoMode;
  // 주장은 손을 떼면 가까운 적에게 조금 다가가 친다 (배틀하트식)
  const chase = u === w.captain ? (u.isRanged ? 1 : 3) : 0;
  const cands: Cand[] = [];

  for (const e of enemies) {
    const reach = attackReach(u, e);
    const d = dist(u, e);
    if (manual && (d > reach + chase || (u.isRanged && d <= reach && !w.map.los(u.x, u.y, e.x, e.y)))) continue;
    if (leashed(u, e, reach)) continue;
    cands.push({ intent: { type: 'attack', target: e }, score: attackValue(w, u, e, d, reach) });
  }

  {
    u.abilities.forEach((st, slot) => {
      if (!abilityReady(u, st)) return;
      // 직접 조종(기본): 자동으로 표시된 기술(로테이션 · 자동 전용)만 AI 가 쓴다.
      // 자동전투를 켜면 수동 전용(특성으로 배운 기술)을 뺀 나머지도 쓴다
      // 동료(자동)는 특성으로 배운 기술까지 다 쓴다
      if (!(st.hidden || st.auto || !manual)) return;
      const prio = st.prio * 1.5;
      for (const c of evalAbility(w, u, st.def, slot, enemies)) {
        c.score += prio;
        cands.push(c);
      }
    });
    const k = manual ? null : kite(w, u, enemies);
    if (k) cands.push(k);
  }

  let best: Cand | null = null;
  for (const c of cands) if (c.score > 0 && (!best || c.score > best.score)) best = c;
  return best?.intent ?? null;
}

function idle(w: World, u: Unit): Intent | null {
  if (u.faction !== 'party') return null;
  const L = w.leader;
  if (!L || !L.alive || L === u || u.holdPos) return null;
  if (dist(u, L) < 2.2) return null;
  const party = w.party.filter((p) => p.alive && p !== L);
  const idx = party.indexOf(u);
  const ang = Math.PI + (idx - (party.length - 1) / 2) * 0.9;
  const p = w.map.nearestFloor(L.x + Math.cos(ang) * L.facing * 1.5, L.y + Math.sin(ang) * 1.5);
  return { type: 'move', x: p.x, y: p.y };
}

function leashed(u: Unit, e: Unit, reach: number): boolean {
  return !!u.holdPos && dist(u.holdPos, e) > reach + 1.2;
}

function targetWeight(w: World, u: Unit, e: Unit): number {
  const d = dist(u, e);
  let wt = 1 + (1 - e.hpFrac) * 0.6 + threatOf(e) / 25;
  if (u.faction === 'party') {
    // 집중 공격: 방어형(탱커)은 앞을 지키느라 따르지 않는다. 가까운 집중 대상만 조금 더.
    // 원거리도 사거리 밖 집중 대상을 쫓아 적진으로 들어가지 않는다 (주장은 플레이어가 고른 대로)
    if (w.focusTarget === e) {
      const inReach = d <= attackReach(u, e) + 1;
      wt *= u === w.captain ? 2.5 : u.tactic === 'defensive' ? (d < 2.5 ? 1.5 : 1) : inReach ? 2.5 : 1;
    }
    switch (u.tactic) {
      case 'defensive': {
        // 아군(자신 제외)을 노리는 적, 아군 가까이 붙은 적 우선
        const tgt = e.intent?.type === 'attack' ? e.intent.target : null;
        if (tgt && tgt !== u) wt += 0.8;
        const nearAlly = Math.min(...w.party.filter((p) => p.alive && p !== u).map((p) => dist(p, e)), 99);
        wt += Math.max(0, 3 - nearAlly) * 0.25;
        wt /= 1 + d * 0.15;
        break;
      }
      case 'aggressive':
        wt /= 1 + d * 0.1;
        break;
      default:
        wt /= 1 + Math.max(0, d - u.weapon.range) * 0.2;
    }
  } else {
    switch (u.def.targetPref) {
      case 'nearest':
        wt = wt / (1 + d * 0.35) + (u.aggro.get(e.id) ?? 0) / 50;
        break;
      case 'threat':
        wt = (wt + threatOf(e) / 15) / (1 + d * 0.2) + (u.aggro.get(e.id) ?? 0) / 60;
        break;
      case 'backline':
        if (e.def.role === 'caster' || e.def.role === 'support' || e.def.role === 'ranged') wt *= 2.2;
        wt /= 1 + d * 0.08;
        break;
      case 'weakest':
        wt *= 1 + (1 - e.hpFrac) + (e.stats.ac < 4 ? 0.5 : 0);
        wt /= 1 + d * 0.1;
        break;
    }
  }
  if (u.lastTarget === e) wt *= 1.25;
  return wt;
}

function attackValue(w: World, u: Unit, e: Unit, d: number, reach: number): number {
  const el = u.weapon.element ?? 'physical';
  const dmg = Math.max(0.5, avgWeaponDamage(u) * resistMult(e, el) - (el === 'physical' ? e.stats.ac * 0.3 : 0));
  let s = ((dmg * hitChance(u, e)) / attackDelay(u)) * targetWeight(w, u, e);
  if (d > reach) s /= 1 + (d - reach) * (u.tactic === 'support' ? 0.4 : 0.15);
  if (u.tactic === 'support') s *= 0.5;
  return s;
}

/** 근처에 기절하지 않은 적이 자신을 노리고 있는가 (긴 시전이 위험한 상황) */
function threatened(w: World, u: Unit): boolean {
  return w.hostilesOf(u).some(
    (e) => !e.stats.stunned && dist(u, e) < 2.2 && e.intent?.type === 'attack' && e.intent.target === u,
  );
}

function distPenalty(_u: Unit, ab: AbilityDef, d: number) {
  return Math.max(0, d - ab.range) * 1.5;
}

function evalAbility(w: World, u: Unit, ab: AbilityDef, slot: number, enemies: Unit[]): Cand[] {
  const out: Cand[] = [];
  const time = ab.castTime + 0.5;
  let risk = 1;
  if (ab.type === 'spell' && ab.castTime >= 0.8 && threatened(w, u)) risk = 0.3;
  const manaOk = ab.cost === 0 || u.mp - ab.cost >= u.stats.maxMp * 0.15 ? 1 : 0.6;
  // 이기적: 치유 · 강화를 자기에게만
  const allies = u.hero?.mood === 'selfish' ? [u] : w.alliesOf(u);
  const mk = (target: Unit | null, x: number, y: number, score: number): Cand => ({
    intent: { type: 'ability', slot, target, x, y },
    score,
  });

  switch (ab.aiRole) {
    case 'damage': {
      if (ab.radius) {
        const points = ab.target === 'self' ? [u] : enemies;
        for (const p of points) {
          if (ab.target !== 'self' && dist(u, p) > ab.range + 3) continue;
          const vs = unitsInArea(w, ab, u, p.x, p.y);
          let val = 0, hostiles = 0;
          for (const v of vs) {
            const exp = Math.min(expectedDamage(u, ab, v), v.hp * 1.2);
            // 평타 점수와 같은 잣대로 비교되도록 대상 가중치를 곱한다
            if (v.faction !== u.faction) {
              val += exp * targetWeight(w, u, v);
              hostiles++;
            } else val -= exp * 6;
          }
          if (hostiles === 0 || val <= 0) continue;
          const score = (val / time) * risk * manaOk - distPenalty(u, ab, dist(u, p));
          out.push(mk(ab.target === 'self' ? null : p, p.x, p.y, score));
        }
      } else {
        for (const e of enemies) {
          const exp = Math.min(expectedDamage(u, ab, e), e.hp * 1.2);
          if (exp <= 0.5) continue; // 면역
          const score = ((exp * targetWeight(w, u, e)) / time) * risk * manaOk - distPenalty(u, ab, dist(u, e));
          out.push(mk(e, e.x, e.y, score));
        }
      }
      break;
    }
    case 'heal': {
      const amount = expectedHeal(u, ab);
      if (ab.target === 'self' && ab.radius) {
        // 범위 치유: 범위 안 아군의 회복량 합
        let val = 0;
        for (const a of unitsInArea(w, ab, u, u.x, u.y))
          if (allies.includes(a) && a.hpFrac < 0.85) val += Math.min(amount, a.stats.maxHp - a.hp) * (1 + (1 - a.hpFrac) * 3);
        if (val > 0) out.push(mk(null, u.x, u.y, (val / time) * 0.6 * (u.tactic === 'support' ? 1.5 : 1) * manaOk));
        break;
      }
      for (const a of allies) {
        if (a.hpFrac > 0.85) continue;
        const d = dist(u, a);
        if (d > ab.range + 5) continue;
        const eff = Math.min(amount, a.stats.maxHp - a.hp);
        let score = ((eff * (1 + (1 - a.hpFrac) * 3)) / time) * 0.6 - distPenalty(u, ab, d);
        if (u.tactic === 'support') score *= 1.5;
        out.push(mk(a, a.x, a.y, score * manaOk));
      }
      break;
    }
    case 'cleanse': {
      for (const a of allies) {
        const sev = a.statuses.reduce((s, x) => s + (x.def.harmful ? x.def.severity * (x.stacks || 1) : 0), 0);
        if (sev <= 0) continue;
        out.push(mk(a, a.x, a.y, sev * 1.5 - distPenalty(u, ab, dist(u, a))));
      }
      break;
    }
    case 'disable': {
      const eff = ab.effects.find((e) => e.kind === 'status');
      if (!eff || eff.kind !== 'status') break;
      const sdef = STATUSES[eff.status];
      for (const e of enemies) {
        if (e.hasStatus(eff.status)) continue;
        if (sdef.immuneTag && e.tags.includes(sdef.immuneTag)) continue;
        let p = eff.chance ?? 1;
        if (eff.will) p *= e.tags.includes('mindless') ? 0 : willChance(abilityPower(u, ab), e.stats.will);
        if (p <= 0.05) continue;
        let val = threatOf(e) * eff.duration * 0.6;
        // 시전 끊기: 몬스터만 노린다. 파티 쪽 끊기는 플레이어의 몫
        if (e.cast && u.faction !== 'party') val += 25;
        if (sdef.stun) val += 5;
        val += expectedDamage(u, ab, e) * 0.5;
        const score = ((val * p * targetWeight(w, u, e)) / time) * manaOk - distPenalty(u, ab, dist(u, e));
        out.push(mk(e, e.x, e.y, score));
      }
      break;
    }
    case 'buff': {
      const fighting = enemies.some((e) => allies.some((a) => dist(a, e) < 6));
      if (!fighting) break;
      // 스스로 회복하는 기술 (재정비): 많이 다쳤을 때
      if (ab.selfEffects?.some((e) => e.kind === 'heal')) {
        if (u.hpFrac < 0.5) out.push(mk(null, u.x, u.y, 15 + (1 - u.hpFrac) * 40));
        break;
      }
      const eff = ab.effects.find((e) => e.kind === 'status');
      if (!eff || eff.kind !== 'status') break;
      if (ab.target === 'self') {
        const n = unitsInArea(w, ab, u, u.x, u.y).filter((a) => allies.includes(a) && !a.hasStatus(eff.status)).length;
        if (n > 0) out.push(mk(null, u.x, u.y, n * 6 * manaOk));
      } else {
        for (const a of allies) {
          if (a.hasStatus(eff.status) || dist(u, a) > ab.range + 3) continue;
          const melee = a.def.role === 'tank' || a.def.role === 'melee' ? 1.5 : 1;
          out.push(mk(a, a.x, a.y, 8 * melee * manaOk - distPenalty(u, ab, dist(u, a))));
        }
      }
      break;
    }
    case 'taunt': {
      const n = enemies.filter(
        (e) => dist(u, e) <= (ab.radius ?? 0) && !(e.intent?.type === 'attack' && e.intent.target === u),
      ).length;
      if (n > 0) out.push(mk(null, u.x, u.y, n * 8 * (u.tactic === 'defensive' ? 1.5 : 1)));
      break;
    }
    case 'summon': {
      const s = ab.summon;
      if (!s) break;
      const mine = w.units.filter((v) => v.alive && v.summoner === u).length;
      if (mine < s.max) out.push(mk(null, u.x, u.y, 30 + (s.max - mine) * 8));
      break;
    }
    case 'charge': {
      for (const e of enemies) {
        const d = dist(u, e);
        if (d < (ab.minRange ?? 0) || d > ab.range || !w.map.los(u.x, u.y, e.x, e.y)) continue;
        out.push(mk(e, e.x, e.y, targetWeight(w, u, e) * 12));
      }
      break;
    }
  }
  return out;
}

/** 예고 범위 공격 안에 있으면 범위 밖으로 */
function dodgeTelegraph(w: World, u: Unit): Intent | null {
  for (const e of w.units) {
    if (!e.alive || e.faction === u.faction || !e.cast) continue;
    const ab = e.abilities[e.cast.slot].def;
    if (!ab.radius || ab.affects === 'allies') continue;
    const c = areaCenter(ab, e, e.cast.x, e.cast.y);
    const d = dist(u, c);
    if (d > ab.radius + u.radius + 0.2) continue;
    const k = d || 1;
    const ax = d ? (u.x - c.x) / k : 1, ay = d ? (u.y - c.y) / k : 0;
    for (const rot of [0, 0.8, -0.8, 1.6, -1.6, Math.PI]) {
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const tx = c.x + (ax * cs - ay * sn) * (ab.radius + 1.2), ty = c.y + (ax * sn + ay * cs) * (ab.radius + 1.2);
      if (!w.map.isWallAt(tx, ty)) return { type: 'move', x: tx, y: ty };
    }
  }
  return null;
}

/** 공포: 가장 가까운 적에게서 멀어진다 (공격하지 않음) */
function flee(w: World, u: Unit, enemies: Unit[]): Intent | null {
  let near = enemies[0], nd = Infinity;
  for (const e of enemies) {
    const d = dist(u, e);
    if (d < nd) { nd = d; near = e; }
  }
  const ax = (u.x - near.x) / (nd || 1), ay = (u.y - near.y) / (nd || 1);
  for (const rot of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const tx = u.x + (ax * c - ay * s) * 3, ty = u.y + (ax * s + ay * c) * 3;
    if (!w.map.isWallAt(tx, ty) && w.map.clearPath(u.x, u.y, tx, ty, u.radius)) return { type: 'move', x: tx, y: ty };
  }
  return null;
}

/** 원거리·지원형: 근접 적이 붙으면 거리를 벌린다 */
function kite(w: World, u: Unit, enemies: Unit[]): Cand | null {
  if (u.tactic !== 'ranged' && u.tactic !== 'support') return null;
  if (u.holdPos) return null;
  let near: Unit | null = null, nd = Infinity;
  for (const e of enemies) {
    if (e.isRanged || e.stats.stunned) continue;
    const d = dist(u, e);
    if (d < nd) { nd = d; near = e; }
  }
  if (!near || nd > 2.2) return null;
  const ax = (u.x - near.x) / (nd || 1), ay = (u.y - near.y) / (nd || 1);
  for (const rot of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const dx = ax * c - ay * s, dy = ax * s + ay * c;
    const tx = u.x + dx * 2.5, ty = u.y + dy * 2.5;
    if (!w.map.isWallAt(tx, ty) && w.map.clearPath(u.x, u.y, tx, ty, u.radius)) {
      const score = (2.2 - nd) * 12 + (u.attackCd > 0.3 ? 5 : 0) + (u.tactic === 'support' ? 6 : 0);
      return { intent: { type: 'move', x: tx, y: ty, kite: true }, score };
    }
  }
  return null;
}
