import { dist } from '../core/rng';
import type { Unit } from './unit';
import type { World } from './world';

/** 목표를 향해 한 틱 이동. 경로가 없으면 false. */
export function moveTo(w: World, u: Unit, x: number, y: number, dt: number, stopDist = 0): boolean {
  const d = Math.hypot(x - u.x, y - u.y);
  if (d <= Math.max(stopDist, 0.05)) {
    stopMoving(u);
    return true;
  }
  let wx = x, wy = y;
  if (w.map.clearPath(u.x, u.y, x, y, u.radius * 0.9)) {
    u.path = [];
  } else {
    const goalMoved = !u.pathGoal || Math.hypot(u.pathGoal.x - x, u.pathGoal.y - y) > 0.75;
    if (!u.path.length || goalMoved || w.time > u.repathAt) {
      const p = w.map.findPath(u.x, u.y, x, y, u.radius * 0.9);
      if (!p) return false;
      u.path = p;
      u.pathGoal = { x, y };
      u.repathAt = w.time + 0.7;
    }
    while (u.path.length > 1 && dist(u, u.path[0]) < 0.15) u.path.shift();
    wx = u.path[0].x;
    wy = u.path[0].y;
  }
  const dx = wx - u.x, dy = wy - u.y;
  const dd = Math.hypot(dx, dy);
  if (dd < 1e-5) return true;
  // 목표 근처에서 멈출 거리를 넘어서 가지 않도록
  const step = Math.min(u.stats.moveSpeed * dt, dd, Math.max(0, d - stopDist) + 0.01);
  u.x += (dx / dd) * step;
  u.y += (dy / dd) * step;
  u.moving = true;
  if (Math.abs(dx) > 0.01) u.facing = dx > 0 ? 1 : -1;
  return true;
}

export function stopMoving(u: Unit) {
  u.moving = false;
  u.path = [];
  u.pathGoal = null;
}

export function face(u: Unit, t: { x: number }) {
  if (Math.abs(t.x - u.x) > 0.05) u.facing = t.x > u.x ? 1 : -1;
}

/**
 * 유닛 간 충돌. 적-아군 사이는 단단하게 밀어내 길목 차단이 가능하고,
 * 같은 진영끼리는 움직이는 동안 부드럽게 밀어내 좁은 통로에서도 서로 비켜 지나간다.
 * 둘 다 멈춰 있으면 더 세게, 조금 더 떨어지게 밀어 겹쳐 보이지 않게 한다 (개인 공간).
 */
export function resolveCollisions(w: World) {
  const us = w.units.filter((u) => u.alive);
  for (let i = 0; i < us.length; i++) {
    const a = us[i];
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const same = a.faction === b.faction;
      const settled = same && !a.moving && !b.moving;
      // 파티 원거리 · 지원끼리는 더 넓게 선다 (폭탄 한 방에 같이 맞지 않게 — 자동 산개)
      const spread = settled && a.faction === 'party' && (a.isRanged || a.tactic === 'support') && (b.isRanged || b.tactic === 'support');
      const rr = (a.radius + b.radius) * (spread ? SPREAD_SPACE : settled ? PERSONAL_SPACE : 1);
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.001;
      const overlap = rr - d;
      const k = !same ? 1 : settled ? 0.5 : 0.25;
      const ma = mass(a), mb = mass(b);
      const nx = d2 > 1e-8 ? dx / d : 1, ny = d2 > 1e-8 ? dy / d : 0;
      const pa = (overlap * k * mb) / (ma + mb);
      const pb = (overlap * k * ma) / (ma + mb);
      a.x -= nx * pa; a.y -= ny * pa;
      b.x += nx * pb; b.y += ny * pb;
    }
  }
  for (const u of us) resolveWalls(w, u);
}

/** 멈춰 선 같은 편끼리의 거리 배율 */
const PERSONAL_SPACE = 1.3;
const SPREAD_SPACE = 2.4;

function mass(u: Unit) {
  let m = u.def.mass;
  if (!u.moving) m *= 2;
  if (u.holdPos && !u.moving) m *= 3;
  return m;
}

function resolveWalls(w: World, u: Unit) {
  const r = u.radius;
  for (let pass = 0; pass < 2; pass++) {
    const cx = Math.floor(u.x), cy = Math.floor(u.y);
    if (w.map.isWall(cx, cy)) {
      const f = w.map.nearestFloor(u.x, u.y);
      u.x = f.x; u.y = f.y;
      return;
    }
    for (let ty = cy - 1; ty <= cy + 1; ty++)
      for (let tx = cx - 1; tx <= cx + 1; tx++) {
        if (!w.map.isWall(tx, ty)) continue;
        const px = Math.max(tx, Math.min(u.x, tx + 1));
        const py = Math.max(ty, Math.min(u.y, ty + 1));
        const dx = u.x - px, dy = u.y - py;
        const d = Math.hypot(dx, dy);
        if (d < r && d > 1e-6) {
          u.x += (dx / d) * (r - d);
          u.y += (dy / d) * (r - d);
        }
      }
  }
}
