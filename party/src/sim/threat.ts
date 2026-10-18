// 어그로 (와우식 위협 수치): 적마다 파티원별 위협 수치를 쌓고, 가장 높은 대상을 친다.
// - 피해 = 위협 (전사는 ×3, 방어 태세면 ×1.5 더)
// - 치유 = 치유량의 절반을 싸우는 적들에게 나눠서 (힐러도 어그로를 먹는다)
// - 도발 = 그 적의 1등 위협 수치보다 10% 위로
// - 대상 바꾸기: 지금 대상보다 근접은 110%, 멀리서는 130%를 넘겨야 어그로가 튄다
import { dist } from '../core/rng';
import type { Unit } from './unit';
import type { World } from './world';

/** 이 파티원이 만드는 위협 배율 */
export function threatMult(u: Unit): number {
  let m = u.hero?.cls === 'warrior' ? 3 : 1;
  if (u.hasStatus('guarded')) m *= 1.5;
  return m;
}

export function addThreat(e: Unit, src: Unit, amount: number) {
  if (e.faction === src.faction || amount <= 0) return;
  e.aggro.set(src.id, (e.aggro.get(src.id) ?? 0) + amount);
}

/** 치유 위협: 치유량의 절반을 이 치유자를 아는 적들에게 나눠서 */
export function healThreat(w: World, healer: Unit, amount: number) {
  const foes = w.units.filter((e) => e.alive && e.faction !== healer.faction && e.aware && dist(e, healer) < 14);
  if (!foes.length) return;
  for (const e of foes) addThreat(e, healer, (amount * 0.5) / foes.length);
}

export function tauntThreat(e: Unit, src: Unit) {
  let top = 0;
  for (const v of e.aggro.values()) top = Math.max(top, v);
  e.aggro.set(src.id, top * 1.1 + 10);
  e.aggroTarget = src;
}

/** 몸으로 붙어 있으면 조금씩 (먼저 달려든 탱커가 잡는다) */
export function proximityThreat(w: World, dt: number) {
  for (const e of w.units) {
    if (!e.alive || e.faction !== 'enemy' || !e.aware) continue;
    for (const p of w.party) if (p.alive && dist(p, e) < p.radius + e.radius + 0.6) addThreat(e, p, 4 * dt * threatMult(p));
  }
}

/** 이 적의 어그로 대상 (110% / 130% 규칙) */
export function aggroTarget(w: World, e: Unit): Unit | null {
  const live = (id: number) => w.units.find((u) => u.id === id && u.alive && u.faction !== e.faction) ?? null;
  let top: Unit | null = null, topV = -1;
  for (const [id, v] of e.aggro) {
    if (v <= topV) continue;
    const u = live(id);
    if (!u) continue;
    top = u;
    topV = v;
  }
  const cur = e.aggroTarget?.alive ? e.aggroTarget : null;
  if (!top) return cur;
  if (!cur || cur === top) {
    e.aggroTarget = top;
    return top;
  }
  const curV = e.aggro.get(cur.id) ?? 0;
  const need = dist(top, e) < e.radius + top.radius + 1 ? 1.1 : 1.3;
  if (topV > curV * need) {
    const prev = cur;
    e.aggroTarget = top;
    // 보스 어그로가 탱커가 아닌 쪽으로 튀면 알린다
    if (e.def.boss && top.hero?.cls !== 'warrior' && prev.hero?.cls === 'warrior') w.say(top, '어그로 튐!', '#ff6666', 1.2);
  }
  return e.aggroTarget;
}

/** 위협 수치로 대상을 고르는 적인가 (사냥개 · 궁수처럼 후열을 노리는 적은 제외) */
export function usesThreat(e: Unit): boolean {
  return e.faction === 'enemy' && (e.def.boss || e.def.targetPref === 'nearest' || e.def.targetPref === 'threat');
}
