'use strict';
// 탐험 연출 (DESIGN.md 68): 방 입구에서 멈춰 대열을 맞추면 방이 드러나고, 동료가 무언가를 알아챈다. 싸움이 끝나면 흩어져 방을 살핀다.
// 처음 보는 방에만. 지휘 중 · 탈출류 임무 · 아는 층(직행) · 적이 덤벼 오면 멈추지 않는다.
G.Explore = (() => {
  const F = () => G.Fantasy, GR = G.Grid, U = G.U;
  const BRACE_T = 0.9, REVEAL_V = 12, SEARCH_T = 2, SEARCH_V = 0.7, FIND_GOLD = 2, TRAP_P = 0.25, TRAP_FIRST = 2, TRAP_DMG = 0.15, DANGER_R = 7, Q_GAP = 0.25, LOOK_P = 0.5, QUIET_P = 0.6;
  const RUSHED = new Set(['survive', 'defend', 'escape']);
  const inside = (r, o) => o.x >= r.x && o.x < r.x + r.w && o.y >= r.y && o.y < r.y + r.h;
  const B = () => G.Banter;
  // 판정 결과 대사: 무슨 판정인지 + 그 사람 말투
  // 턴제 층에서는 판정을 판독 패널 한 곳에 모은다 (DESIGN.md 71) — 말풍선에는 말만
  const panel = (rt, what, r) => { if (!G.TURN || !G.Turn.on(G.S.w.fantasy, rt)) return false; if (rt.turn) return true; rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: r.who.merc?.name || '', what, nat: r.nat, ok: r.ok, calc: `${r.mod < 0 ? '−' : '+'}${Math.abs(r.mod)} · DC ${r.dc}`, word: r.nat === 20 ? '대성공' : r.nat === 1 ? '대실패' : r.ok ? '성공' : '실패', res: '' }; rt.rollT = G.S.runTime + 2.5; return true; };
  const tagOf = (rt, what, r) => (panel(rt, what, r) ? undefined : B().tag(what, r));
  const roll = (rt, r, what, key, col) => B().line(rt, key, r.who, null, { tag: tagOf(rt, what, r), col, pri: true });
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
    // 살피는 사람이 먼저 말하고, 알아챈 것이 있으면 판정과 함께 차례로 말한다
    let spotted = false, last = null;
    const look = M.roll(f, rt, 'perception');
    if (look && Math.random() < LOOK_P) ex.q.push(() => B().line(rt, 'look', look.who));
    if (f.floor >= TRAP_FIRST && U.chance(TRAP_P)) {
      const t = { kind: 'obj', hazard: true, t: 'w_board', x: r.cx + (Math.random() < 0.5 ? -1 : 1), y: r.cy, s: 0.8, hidden: true }, c = M.roll(f, rt, 'perception');
      ex.traps.push(t);
      if (c) last = c;
      if (c && c.ok) { spotted = true; t.hidden = false; ex.q.push(() => { roll(rt, c, '함정 찾기', 'spotTrap', '#ffb060'); F().refreshEnts(rt); }); }
    }
    if (mons.length) {
      const c = M.roll(f, rt, 'perception');
      if (c) last = c;
      if (c && c.ok) { spotted = true; for (const o of mons) o.noted = true; ex.q.push(() => roll(rt, c, '매복 살피기', 'spotAmbush', '#9fe0ff')); }
    }
    if (chest) {
      const c = M.roll(f, rt, 'investigation');
      if (c && c.ok) { spotted = true; chest.spotted = chest.mimic ? c.who : null; ex.q.push(() => roll(rt, c, '상자 살피기', chest.mimic ? 'spotMimic' : 'spotChest', chest.mimic ? '#ff8a8a' : '#ffd24a')); }
    }
    // 못 알아챘으면 태연하다 — 뒤에 함정을 밟으면 그 사람이 욕을 먹는다. 무엇을 놓쳤는지는 밝히지 않는다
    const shown = last || look;
    if (!spotted && shown) ex.quietBy = shown.who;
    if (!spotted && shown && Math.random() < QUIET_P) { ex.q.push(() => B().line(rt, 'quiet', shown.who, null, { tag: tagOf(rt, '주변 살피기', shown) })); }
    G.Story.room(f, rt, ex, r, mons, chest);
    if (!rt.scene) G.Turn.scene(f, rt, mons, chest);
  }
  function startSearch(f, rt, ex, r) {
    r.searched = true;
    ex.search = { t: SEARCH_T };
    ex.search.roll = G.Mission.roll(f, rt, 'investigation');
    if (ex.search.roll) B().line(rt, 'search', ex.search.roll.who);
    const m = rt.map, free = [];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (m.c[y * m.w + x] === '.') free.push([x, y]);
    for (const a of rt.allies) if (!a.dead && free.length) { const [x, y] = U.pick(free); a.exT = { x, y }; }
  }
  function endSearch(f, rt, ex, finished) {
    const r = ex.search.roll;
    ex.search = null;
    for (const a of rt.allies) a.exT = null;
    if (!finished || !r || r.who.dead) return;
    if (!r.ok) { roll(rt, r, '방 뒤지기', 'nofind'); return; }
    const g = F().monGold(f.floor) * FIND_GOLD * F().goldMult(f);
    F().gain(f, g);
    B().say(rt, r.who, `${B().pick('found', r.who)} +${U.fmt(g)}`, { tag: tagOf(rt, '방 뒤지기', r), col: '#ffd24a', pri: true });
    if (rt.roll && rt.rollT > G.S.runTime) rt.roll.res = `+${U.fmt(g)}`;
  }
  function springTraps(f, rt, ex) {
    const list = ex.traps.filter(t => t.hidden);
    for (const t of list) {
      if (!rt.party.some(p => !p.dead && GR.dist(p, t) < 1)) continue;
      ex.traps = ex.traps.filter(o => o !== t);
      G.fx(rt, { k: 'text', x: t.x, y: t.y - 1, s: '함정!', col: '#ff6a6a', t: 1.2, sz: 1.3, pop: true });
      G.J.shake('fantasy', 4);
      const hit = rt.party.filter(p => !p.dead && GR.dist(p, t) < 2), said = B().line(rt, 'trap', hit[0] || null, null, { pri: true });
      // 별거 없다고 했던 사람에게 한마디
      const by = ex.quietBy, other = hit.find(p => p !== by);
      if (said && by && !by.dead && other && other !== said) B().queue(rt, [{ who: other, s: B().pick('trapBlame', other, { m: G.Banter.call(by) }) }]);
      else if (said && by && !by.dead && by !== said) B().queue(rt, [{ who: said, s: B().pick('trapBlame', said, { m: G.Banter.call(by) }) }]);
      for (const p of rt.party) if (!p.dead && GR.dist(p, t) < 2) {
        const ok = G.Dnd.save(p, 'dex', G.Dnd.dc(t));
        G.Dnd.flip(p, ok ? '민첩 내성 · 피해 절반' : '민첩 내성 실패', ok ? undefined : '#ff8a8a');
        F().hurtMember(f, rt, p, p.max * TRAP_DMG * (ok ? 0.5 : 1), null);
      }
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
      // 조우 장면이 진행 중이면 파티는 멈춰 있다 (G.Story)
      if (G.Story.tick(f, rt, dt)) return true;
      // 턴제 전투 중에는 방을 살피지 않는다 (끝나고 나서 그 방에 들어선 것으로 친다)
      if (rt.turn || danger(rt, h) || hurried(rt)) { if (ex.search) endSearch(f, rt, ex, false); ex.brace = 0; }
      else if (ex.search) { if ((ex.search.t -= dt) <= 0) endSearch(f, rt, ex, true); else return true; }
      else if (ex.brace > 0) { ex.brace -= dt; return true; }
      else {
        const r = m.rooms.find(q => !q.ent && F().inRoom(q, h));
        if (r) { enter(f, rt, ex, r); return true; }
        const done = m.rooms.find(q => q.fought && !q.searched && inside(q, h) && !rt.mons.some(o => F().inRoom(q, o)));
        if (done) { startSearch(f, rt, ex, done); return true; }
      }
      // 서두르느라 입구에서 멈추지 않아도 이미 들어간 방은 처음 본 방으로 치지 않는다
      if (!rt.turn) for (const q of m.rooms) if (!q.ent && F().inRoom(q, h)) enter(f, rt, ex, q), ex.brace = 0;
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
