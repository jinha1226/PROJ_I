// 유닛 한 틱 처리: 상태이상 → 시전 → (플레이어 명령 > AI 의도) 실행.
import { dist } from '../core/rng';
import { beginCast, updateCast } from './abilities';
import { think } from './ai';
import { performAttack, tickStatuses } from './combat';
import { computeStats, attackReach } from './stats';
import { face, moveTo, stopMoving } from './movement';
import type { Command, Intent, Unit } from './unit';
import type { World } from './world';

type Res = 'running' | 'done' | 'failed';

export function updateUnit(w: World, u: Unit, dt: number) {
  tickStatuses(w, u, dt);
  if (!u.alive) return;
  computeStats(u);
  u.moving = false;
  u.flash = Math.max(0, u.flash - dt);
  u.swing = Math.max(0, u.swing - dt);
  const cdRate = u.hero?.mood === 'focused' ? 1.3 : 1;
  for (const a of u.abilities) a.cd = Math.max(0, a.cd - dt * cdRate);
  u.attackCd -= dt * u.stats.actionMult;

  // 자원 회복
  if (u.stats.maxMp > 0) u.mp = Math.min(u.stats.maxMp, u.mp + (0.9 + u.int * 0.045) * (1 + 0.6 * u.tagCount('mana_flow')) * dt);
  if (u.faction === 'party' && !w.inCombat) u.hp = Math.min(u.stats.maxHp, u.hp + u.stats.maxHp * 0.04 * dt);

  if (u.stats.stunned) {
    if (u.cast) w.cancelCast(u, '');
    return;
  }
  if (u.cast) {
    updateCast(w, u, dt);
    return;
  }

  if (u.command) {
    const res = execute(w, u, u.command.intent, dt, u.command);
    if (res !== 'running') {
      u.command = null;
      u.aiTimer = 0;
    }
    return;
  }

  u.aiTimer -= dt;
  if (u.aiTimer <= 0 || !u.intent) {
    u.intent = think(w, u);
    u.aiTimer = 0.25 + w.rng.next() * 0.1;
  }
  if (u.intent) {
    const res = execute(w, u, u.intent, dt, null);
    if (res !== 'running') {
      u.intent = null;
      u.aiTimer = 0;
    }
  }
}

function execute(w: World, u: Unit, it: Intent, dt: number, cmd: Command | null): Res {
  switch (it.type) {
    case 'move': {
      const d = dist(u, it);
      if (d < 0.15) {
        stopMoving(u);
        return 'done';
      }
      if (cmd?.group && w.shouldWait(u, cmd.group)) {
        stopMoving(u);
        cmd.lastProgress = w.time;
        return 'running';
      }
      if (!moveTo(w, u, it.x, it.y, dt)) return fail(w, u, cmd);
      return progress(w, u, cmd, d, false);
    }
    case 'attack': {
      const t = it.target;
      if (!t.alive) return 'done';
      if (!cmd && u.faction === 'party' && !w.isVisible(t)) return 'failed';
      const reach = attackReach(u, t);
      const d = dist(u, t);
      if (d <= reach && (!u.isRanged || w.map.los(u.x, u.y, t.x, t.y))) {
        stopMoving(u);
        face(u, t);
        u.lastTarget = t;
        if (u.attackCd <= 0) performAttack(w, u, t);
        if (cmd) cmd.lastProgress = w.time;
        return 'running';
      }
      if (!cmd && u.holdPos && dist(u.holdPos, t) > reach + 1.2) return 'failed';
      if (!moveTo(w, u, t.x, t.y, dt, u.isRanged ? 0 : reach * 0.9)) return fail(w, u, cmd);
      return progress(w, u, cmd, d);
    }
    case 'ability': {
      const st = u.abilities[it.slot];
      const ab = st.def;
      if (it.target) {
        if (!it.target.alive) return 'failed';
        it.x = it.target.x;
        it.y = it.target.y;
      }
      if (ab.target === 'self') {
        it.x = u.x;
        it.y = u.y;
      }
      if (u.mp < ab.cost) {
        if (cmd) w.float(u, '마나 부족', '#8899ff');
        return 'failed';
      }
      const d = dist(u, it);
      const reach = ab.range + (it.target ? it.target.radius + u.radius : 0);
      if (ab.minRange && d < ab.minRange) return fail(w, u, cmd);
      const inRange = ab.target === 'self' || (d <= reach && w.map.los(u.x, u.y, it.x, it.y));
      if (inRange) {
        stopMoving(u);
        face(u, it);
        if (st.cd > 0) {
          if (cmd && st.cd < 3) return 'running';
          if (cmd) w.float(u, '재사용 대기 중', '#aaaaaa');
          return 'failed';
        }
        beginCast(w, u, it.slot, it.target, it.x, it.y);
        return 'done';
      }
      if (cmd && st.cd > 3) {
        w.float(u, '재사용 대기 중', '#aaaaaa');
        return 'failed';
      }
      if (!cmd && u.holdPos && dist(u.holdPos, it) > reach + 1.2) return 'failed';
      // 사거리 안이지만 사선이 막혔으면 더 다가간다
      const stopAt = d <= reach ? 0 : reach * 0.9;
      if (!moveTo(w, u, it.x, it.y, dt, stopAt)) return fail(w, u, cmd);
      return progress(w, u, cmd, d);
    }
  }
}

function fail(w: World, u: Unit, cmd: Command | null): Res {
  if (cmd) w.float(u, '경로 없음', '#ff8888');
  return 'failed';
}

/** 명령이 일정 시간 진척이 없으면 포기하고 AI 로 돌아간다 */
function progress(w: World, u: Unit, cmd: Command | null, d: number, notify = true): Res {
  if (!cmd) return 'running';
  // 서로 밀며 맴도는 경우를 대비한 상한
  if (w.time - cmd.issuedAt > 30) return 'failed';
  if (d < cmd.bestDist - 0.1) {
    cmd.bestDist = d;
    cmd.lastProgress = w.time;
  } else if (w.time - cmd.lastProgress > (notify ? 2.5 : 1.5)) {
    // 이동은 동료에게 막혀 근처에서 멈추는 일이 잦으므로 조용히 끝낸다
    if (notify) w.float(u, '명령 수행 불가', '#ff8888');
    return 'failed';
  }
  return 'running';
}
