'use strict';
// 탐험 연출 (DESIGN.md 68): 방 입구에서 멈춰 대열을 맞추면 방이 드러나고, 동료가 무언가를 알아챈다. 싸움이 끝나면 흩어져 방을 살핀다.
// 처음 보는 방에만. 지휘 중 · 탈출류 임무 · 아는 층(직행) · 적이 덤벼 오면 멈추지 않는다.
G.Explore = (() => {
  const F = () => G.Fantasy, GR = G.Grid, U = G.U;
  const BRACE_T = 0.9, REVEAL_V = 12, SEARCH_T = 2, SEARCH_V = 0.7, FIND_GOLD = 2, TRAP_P = 0.25, TRAP_FIRST = 2, TRAP_DMG = 0.15, DANGER_R = 7, Q_GAP = 0.25;
  const RUSHED = new Set(['survive', 'defend', 'escape']);
  const inside = (r, o) => o.x >= r.x && o.x < r.x + r.w && o.y >= r.y && o.y < r.y + r.h;
  const say = (rt, who, s, col) => G.fx(rt, { k: 'text', x: who.x, y: who.y - 1.5, s, col, t: 1.5, sz: 1.1, pop: true });
  const state = (f, rt) => {
    if (rt.ex && rt.ex.map === rt.map) return rt.ex;
    const m = rt.map, known = G.Season.known(f, rt);
    // 이전 원정에서 이미 본 방은 다시 멈추지 않는다
    for (const r of m.rooms) r.ent = known || r === m.rooms[0] || !!rt.seen[r.cy * m.w + r.cx];
    return (rt.ex = { map: m, brace: 0, reveal: null, search: null, q: [], traps: [] });
  };
  const danger = (rt, h) => rt.mons.some(o => o.aggro && GR.dist(o, h) < DANGER_R) || G.Rivals.hostiles(rt).some(o => GR.dist(o, h) < DANGER_R + 1);
  const hurried = rt => rt.rush || rt.rally || (rt.focus && rt.focus.hp > 0 && !rt.focusAuto) || (rt.mission && RUSHED.has(rt.mission.k));

  // 방 입구: 대열을 맞추고 방을 드러내고, 판정에 성공한 동료가 알아챈 것을 말한다
  function enter(f, rt, ex, r) {
    r.ent = true;
    ex.brace = BRACE_T;
    ex.reveal = { r, x: rt.hero.x, y: rt.hero.y, d: 0 };
    const mons = rt.mons.filter(o => F().inRoom(r, o)), chest = rt.chests.find(c => !c.relic && F().inRoom(r, c)), M = G.Mission;
    r.fought = mons.length > 0;
    if (f.floor >= TRAP_FIRST && U.chance(TRAP_P)) {
      const t = { kind: 'obj', hazard: true, t: 'w_board', x: r.cx + (Math.random() < 0.5 ? -1 : 1), y: r.cy, s: 0.8, hidden: true };
      ex.traps.push(t);
      const who = M.check(f, rt, 'perception');
      if (who) { t.hidden = false; ex.q.push(() => { say(rt, who, '❗ 함정', '#ffb060'); F().refreshEnts(rt); }); }
    }
    if (mons.length) {
      const who = M.check(f, rt, 'perception');
      if (who) { for (const o of mons) o.noted = true; ex.q.push(() => say(rt, who, '👁 매복', '#9fe0ff')); }
    }
    if (chest) {
      const who = M.check(f, rt, 'investigation');
      if (who) { chest.spotted = chest.mimic ? who : null; ex.q.push(() => say(rt, who, chest.mimic ? '🎭 미믹' : '🔍 보물', chest.mimic ? '#ff8a8a' : '#ffd24a')); }
    }
  }
  function startSearch(f, rt, ex, r) {
    r.searched = true;
    ex.search = { t: SEARCH_T };
    const m = rt.map, free = [];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (m.c[y * m.w + x] === '.') free.push([x, y]);
    for (const a of rt.allies) if (!a.dead && free.length) { const [x, y] = U.pick(free); a.exT = { x, y }; }
  }
  function endSearch(f, rt, ex, finished) {
    ex.search = null;
    for (const a of rt.allies) a.exT = null;
    if (!finished) return;
    const who = G.Mission.check(f, rt, 'investigation');
    if (!who) return;
    const g = F().monGold(f.floor) * FIND_GOLD * F().goldMult(f);
    F().gain(f, g);
    say(rt, who, `🔍 +${U.fmt(g)}`, '#ffd24a');
  }
  function springTraps(f, rt, ex) {
    const list = ex.traps.filter(t => t.hidden);
    for (const t of list) {
      if (!rt.party.some(p => !p.dead && GR.dist(p, t) < 1)) continue;
      ex.traps = ex.traps.filter(o => o !== t);
      G.fx(rt, { k: 'text', x: t.x, y: t.y - 1, s: '함정!', col: '#ff6a6a', t: 1.2, sz: 1.3, pop: true });
      G.J.shake('fantasy', 4);
      for (const p of rt.party) if (!p.dead && GR.dist(p, t) < 2) F().hurtMember(f, rt, p, p.max * TRAP_DMG * (G.Dnd.save(p, 'dex', G.Dnd.dc(t)) ? 0.5 : 1), null);
      if (rt.phase === 'dead') return;
    }
  }
  return {
    ents: rt => (rt.ex && rt.ex.map === rt.map ? rt.ex.traps.filter(t => !t.hidden) : []),
    // 매 틱. true면 단장이 제자리에 있는다 (대열 맞추기 · 방 살피기)
    tick(f, rt, dt) {
      const ex = state(f, rt), h = rt.hero, m = rt.map;
      if (ex.q.length && (ex.qT = (ex.qT || 0) - dt) <= 0) { ex.q.shift()(); ex.qT = Q_GAP; }
      if (ex.reveal) {
        // 입구에서 안쪽으로 안개가 걷힌다
        const v = ex.reveal, r = v.r;
        v.d += REVEAL_V * dt;
        let added = false, left = false;
        for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
          const i = y * m.w + x;
          if (rt.seen[i]) continue;
          if (Math.hypot(x - v.x, y - v.y) <= v.d) { rt.seen[i] = 1; added = true; } else left = true;
        }
        if (added) rt.seenVer++;
        if (!left) ex.reveal = null;
      }
      springTraps(f, rt, ex);
      if (rt.phase === 'dead') return false;
      if (h.dead) { if (ex.search) endSearch(f, rt, ex, false); ex.brace = 0; return false; }
      if (danger(rt, h) || hurried(rt)) { if (ex.search) endSearch(f, rt, ex, false); ex.brace = 0; }
      else if (ex.search) { if ((ex.search.t -= dt) <= 0) endSearch(f, rt, ex, true); else return true; }
      else if (ex.brace > 0) { ex.brace -= dt; return true; }
      else {
        const r = m.rooms.find(q => !q.ent && F().inRoom(q, h));
        if (r) { enter(f, rt, ex, r); return true; }
        const done = m.rooms.find(q => q.fought && !q.searched && inside(q, h) && !rt.mons.some(o => F().inRoom(q, o)));
        if (done) { startSearch(f, rt, ex, done); return true; }
      }
      // 서두르느라 입구에서 멈추지 않아도 이미 들어간 방은 처음 본 방으로 치지 않는다
      for (const q of m.rooms) if (!q.ent && F().inRoom(q, h)) enter(f, rt, ex, q), ex.brace = 0;
      return false;
    },
    // 방을 살피는 동료: 흩어져 걷고, 도착하면 두리번거린다. true면 이번 틱은 이것으로 끝
    wander(rt, a, speed, dt) {
      if (!a.exT) return false;
      if (GR.moveTo(rt.map, a, a.exT.x, a.exT.y, speed * SEARCH_V, dt, 0.3) && Math.random() < dt) a.flip = !a.flip;
      return true;
    },
    SEARCH_T,
  };
})();
