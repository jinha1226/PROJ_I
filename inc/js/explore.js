'use strict';
// 탐험 연출 (DESIGN.md 68): 방 입구에서 멈춰 대열을 맞추면 방이 드러나고, 동료가 무언가를 알아챈다. 싸움이 끝나면 흩어져 방을 살핀다.
// 처음 보는 방에만. 지휘 중 · 탈출류 임무 · 아는 층(직행) · 적이 덤벼 오면 멈추지 않는다.
G.Explore = (() => {
  const F = () => G.Fantasy, GR = G.Grid, U = G.U;
  const TRAP_DC = 15, PITS = [{ n: '숨은 구덩이' }, { n: '가시 구덩이', spike: true }], FALL_D = [1, 3, 6, 12], SPIKE_D = [2, 3, 8, 13];
  const STASH_MIN = 2, STASH_MAX = 4, TRAP_AHEAD = 3, DISARM_T = 1.9, TRAP_FUSE = 1, STASH_T = 1.6, Q_DIE = 1.2, BRACE_T = 0.9, REVEAL_V = 12, SEARCH_T = 2, SEARCH_V = 0.7, FIND_GOLD = 2, TRAP_P = 0.25, TRAP_FIRST = 2, TRAP_DMG = 0.15, DANGER_R = 7, Q_GAP = 0.25, LOOK_P = 0.5, QUIET_P = 0.6;
  const inside = (r, o) => o.x >= r.x && o.x < r.x + r.w && o.y >= r.y && o.y < r.y + r.h;
  const B = () => G.Banter;
  // 판정 결과 대사: 무슨 판정인지 + 그 사람 말투
  // 턴제 층에서는 판정을 판독 패널 한 곳에 모은다 (DESIGN.md 71) — 말풍선에는 말만
  const panel = (rt, what, r) => { if (!G.Turn.on(G.S.w.fantasy, rt)) return false; if (rt.turn) return true; rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: r.who.merc?.name || '', what, nat: r.nat, ok: r.ok, need: r.dc - r.mod, calc: `${r.mod < 0 ? '−' : '+'}${Math.abs(r.mod)} · DC ${r.dc}`, word: r.nat === 20 ? '대성공' : r.nat === 1 ? '대실패' : r.ok ? '성공' : '실패', res: '' }; rt.rollT = G.S.runTime + 2.5; return true; };
  const tagOf = (rt, what, r) => (panel(rt, what, r) ? undefined : B().tag(what, r));
  const roll = (rt, r, what, key, col) => B().line(rt, key, r.who, null, { tag: tagOf(rt, what, r), col, pri: true });
  const state = (f, rt) => {
    if (rt.ex && rt.ex.map === rt.map) return rt.ex;
    const m = rt.map, known = G.Season.known(f, rt);
    // 이전 원정에서 이미 본 방은 다시 멈추지 않는다
    for (const r of m.rooms) r.ent = known || r === m.rooms[0] || !!rt.seen[r.cy * m.w + r.cx];
    return (rt.ex = { map: m, brace: 0, reveal: null, search: null, q: [], traps: [] });
  };

  // ── 턴제: G.Flow가 방에 들어설 때 부른다. 한 판정이 끝나야 다음 판정 ──
  function checks(f, rt, r, chest) {
    const ex = state(f, rt), M = G.Mission, h = rt.hero;
    if (f.floor >= TRAP_FIRST && U.chance(TRAP_P)) trapCheck(f, rt, ex, r, h);
    if (chest) {
      const c = M.roll(f, rt, 'investigation');
      // 알아채면: 미믹은 붉은 경고, 보통 상자는 반짝이며 금화가 더 든다. 못 알아채면 굴림을 보이지 않는다 (미믹이면 열 때 놀란다)
      if (c && c.ok) { chest.spotted = chest.mimic ? c.who : null; ex.q.push(() => { roll(rt, c, '상자 살피기', chest.mimic ? 'spotMimic' : 'spotChest', chest.mimic ? '#ff8a8a' : '#ffd24a'); G.Turn.vis(rt, { k: 'chest', c: chest }); if (!chest.mimic) chest.rich = true; return true; }); }
    }
  }
  // 함정은 로그의 일: 파티에 있으면 늘 로그가 굴리고 보너스를 받는다. 찾으면 앞 바닥에 드러나 해체하고, 못 찾으면 발밑에서 터진다
  function trapCheck(f, rt, ex, r, h) {
    const c = G.Mission.roll(f, rt, 'investigation', 0, null, TRAP_DC), kind = U.pick(PITS); // 숨은 구덩이 · 가시 구덩이 (SRD): DC 15 지능(조사)
    { const ft = G.Pool.who(rt, 'x_traps'); if (ft) { G.Pool.used(ft, 'x_traps'); G.fx(rt, { k: 'text', x: ft.x, y: ft.y - 1.2, s: `함정이 있다: ${kind.n}`, col: '#ffb060', t: 1.4, sz: 0.8 }); } } // 함정 찾기 (SRD): 있다는 것과 위험만 안다. 위치는 모른다
    if (!c) return;
    const t = { kind: 'obj', hazard: true, t: 'w_board', x: Math.round(h.x), y: Math.round(h.y), s: 0.8, hidden: true, armed: false, pit: kind };
    ex.traps.push(t);
    if (c.ok) {
      const dx = r.cx - h.x, dy = r.cy - h.y, l = Math.hypot(dx, dy) || 1, X = Math.round(h.x + dx / l * TRAP_AHEAD), Y = Math.round(h.y + dy / l * TRAP_AHEAD);
      if (rt.map.c[Y * rt.map.w + X] === '.') { t.x = X; t.y = Y; }
      ex.q.push(() => { t.hidden = false; roll(rt, c, '함정 살피기', 'spotTrap', '#ffb060'); F().refreshEnts(rt); t.disarmT = DISARM_T; ex.brace = Math.max(ex.brace, DISARM_T); return true; });
    } else ex.q.push(() => { roll(rt, c, '함정 살피기', 'quiet'); t.armed = true; t.fuse = TRAP_FUSE; ex.brace = Math.max(ex.brace, TRAP_FUSE + 0.3); return true; });
  }
  function startSearch(f, rt, ex, r) {
    r.searched = true;
    ex.search = { t: SEARCH_T };
    ex.search.roll = G.Mission.roll(f, rt, 'investigation');
    if (ex.search.roll) B().line(rt, 'search', ex.search.roll.who);
    const m = rt.map, free = [];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (m.c[y * m.w + x] === '.') free.push([x, y]);
    // 턴제: 굴리는 사람 혼자 가까운 상자로 간다. 나머지는 제자리 (G.Flow)
    const who = ex.search.roll && ex.search.roll.who;
    if (!who || !free.length) return;
    const d = p => Math.hypot(p[0] - who.x, p[1] - who.y), near = free.filter(p => d(p) >= STASH_MIN && d(p) <= STASH_MAX && !rt.mons.some(o => Math.round(o.x) === p[0] && Math.round(o.y) === p[1])), [x, y] = U.pick(near.length ? near : free), prop = { x, y, state: 'closed' };
    (m.props || (m.props = [])).push(prop);
    ex.search.prop = prop;
  }
  function endSearch(f, rt, ex, finished) {
    const r = ex.search.roll, prop = ex.search.prop;
    ex.search = null;
    for (const a of rt.allies) a.exT = null;
    if (!finished || !r || r.who.dead) { if (prop) rt.map.props = rt.map.props.filter(p => p !== prop); return; }
    if (prop) ex.brace = STASH_T;
    if (!r.ok) { roll(rt, r, '방 뒤지기', 'nofind'); if (prop) G.Turn.vis(rt, { k: 'stash', prop, ok: false }); return; }
    const g = F().monGold(f.floor) * FIND_GOLD * F().goldMult(f);
    F().gain(f, g);
    B().say(rt, r.who, `${B().pick('found', r.who)} +${U.fmt(g)}`, { tag: tagOf(rt, '방 뒤지기', r), col: '#ffd24a', pri: true });
    if (rt.roll && rt.rollT > G.S.runTime) rt.roll.res = `+${U.fmt(g)}`;
    if (prop) G.Turn.vis(rt, { k: 'stash', prop, ok: true });
  }
  function springTraps(f, rt, ex, dt) {
    G.Pool.scry(rt, dt);
    for (const t of ex.traps) if (t.disarmT != null && (t.disarmT -= dt) <= 0) { ex.traps = ex.traps.filter(o => o !== t); G.Turn.vis(rt, { k: 'disarm', x: t.x, y: t.y }); F().refreshEnts(rt); }
    const list = ex.traps.filter(t => t.hidden);
    for (const t of list) {
      if (t.armed === false) continue;
      if (t.fuse != null) { if ((t.fuse -= dt) > 0) continue; }
      else if (!rt.party.some(p => !p.dead && GR.dist(p, t) < 1)) continue;
      t.armed = false;
      G.Turn.vis(rt, { k: 'spikes', x: t.x, y: t.y });
      ex.traps = ex.traps.filter(o => o !== t);
      G.fx(rt, { k: 'text', x: t.x, y: t.y - 1, s: '함정!', col: '#ff6a6a', t: 1.2, sz: 1.3, pop: true });
      G.J.shake('fantasy', 4);
      const hit = rt.party.filter(p => !p.dead && GR.dist(p, t) < 2), said = B().line(rt, 'trap', hit[0] || null, null, { pri: true });
      // 별거 없다고 했던 사람에게 한마디
      const by = ex.quietBy, other = hit.find(p => p !== by);
      if (said && by && !by.dead && other && other !== said) B().queue(rt, [{ who: other, s: B().pick('trapBlame', other, { m: G.Banter.call(by) }) }]);
      else if (said && by && !by.dead && by !== said) B().queue(rt, [{ who: said, s: B().pick('trapBlame', said, { m: G.Banter.call(by) }) }]);
      // 뚜껑을 밟은 한 사람이 떨어진다 (SRD). 피해는 파티 레벨 구간의 주사위
      const p = rt.party.filter(q => !q.dead).sort((a, b) => GR.dist(a, t) - GR.dist(b, t))[0];
      if (p && p.merc) {
        const lv = p.merc.lv, tier = lv >= 17 ? 3 : lv >= 11 ? 2 : lv >= 5 ? 1 : 0, kk = p.max / Math.max(1, G.Dnd.srdHP(p.merc)); let fall = G.Dnd.dice(FALL_D[tier], 6);
        if (G.Pool.of(p.merc) === 'x_fall') { fall = Math.max(0, fall - lv * 5); G.Pool.used(p, 'x_fall'); }
        const spike = t.pit?.spike ? G.Dnd.dice(SPIKE_D[tier], 8) : 0;
        F().hurtMember(f, rt, p, (fall + spike) * kk, null);
      }
      if (rt.phase === 'dead') return;
    }
  }
  return {
    ents: rt => (rt.ex && rt.ex.map === rt.map ? rt.ex.traps.filter(t => !t.hidden) : []),
    // G.Flow가 쓰는 것들
    state, checks, startSearch, endSearch,
    searcher: ex => (ex.search && ex.search.roll ? ex.search.roll.who : null),
    stash: ex => (ex.search ? ex.search.prop : null),
    drain(f, rt, ex, dt) {
      if (ex.q.length && (ex.qT = (ex.qT || 0) - dt) <= 0) ex.qT = ex.q.shift()() === true ? Q_DIE : Q_GAP;
      if (ex.brace > 0) ex.brace -= dt;
      springTraps(f, rt, ex, dt);
    },
    idle: ex => !ex.q.length && ex.brace <= 0 && !ex.traps.some(t => t.armed || t.disarmT != null),
    // 방을 살피는 동료: 흩어져 걷고, 도착하면 두리번거린다. true면 이번 틱은 이것으로 끝
    wander(rt, a, speed, dt) {
      if (!a.exT) return false;
      if (GR.moveTo(rt.map, a, a.exT.x, a.exT.y, speed * SEARCH_V, dt, 0.3) && Math.random() < dt) a.flip = !a.flip;
      return true;
    },
    SEARCH_T,
  };
})();
