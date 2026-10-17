// "지금이야" 신호: 플레이어가 쓸 기술을 지금 쓰면 좋은 순간인지. 화면이 버튼을 붉게 깜빡이는 데 쓴다.
// AI 판단과는 별개로, 누가 봐도 분명한 상황만 잡는다.
import { dist } from '../core/rng';
import type { AbilityState, Unit } from './unit';
import type { World } from './world';

const hasStatus = (st: AbilityState, ...ids: string[]) =>
  st.def.effects.some((e) => e.kind === 'status' && ids.includes(e.status));

export function skillCue(w: World, u: Unit, st: AbilityState): boolean {
  const ab = st.def;
  if (!w.inCombat || !u.alive) return false;
  const foes = w.knownEnemies(u);
  if (!foes.length) return false;
  // 시전 끊기: 기절을 거는 단일 대상 기술 + 닿는 거리에서 마법을 시전 중인 적
  if (ab.target === 'enemy' && hasStatus(st, 'stun')) {
    const reach = ab.range + u.radius + 1.2;
    if (foes.some((e) => e.cast && e.abilities[e.cast.slot].def.type === 'spell' && dist(u, e) <= reach + e.radius)) return true;
  }
  // 범위 피해: 3마리 이상 뭉쳐 있다
  if (ab.aiRole === 'damage' && ab.radius) {
    const centers = ab.target === 'self' ? [u] : foes.filter((e) => dist(u, e) <= ab.range + 1);
    for (const c of centers) if (foes.filter((e) => dist(e, c) <= ab.radius!).length >= 3) return true;
  }
  // 자기 중심 기절 (서리 폭발 · 회전 베기): 둘 이상 붙었다
  if (ab.target === 'self' && ab.radius && hasStatus(st, 'stun') && foes.filter((e) => dist(u, e) <= ab.radius!).length >= 2) return true;
  // 치유 · 보호: 아군이 위험하다
  if (ab.aiRole === 'heal' || (ab.aiRole === 'buff' && hasStatus(st, 'protected', 'guarded'))) {
    if (w.party.some((p) => p.alive && p.hpFrac < 0.4)) return true;
  }
  // 도발: 적이 후열을 노린다
  if (ab.aiRole === 'taunt') {
    const r = ab.radius ?? 0;
    if (foes.some((e) => e.intent?.type === 'attack' && e.intent.target.faction === 'party' && e.intent.target.row === 'back' && dist(u, e) <= r))
      return true;
  }
  return false;
}
