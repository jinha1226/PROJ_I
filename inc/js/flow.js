'use strict';
// 턴제 층의 진행 순서 (DESIGN.md 77): 다음에 무슨 일이 일어날지는 여기서만 정한다.
// 다른 모듈(G.Turn 전투 · G.Story 장면 · G.Explore 판정)은 Flow가 부를 때만 움직인다. 몬스터도 전투가 시작되기 전에는 움직이지 않는다.
//
//   travel ──방에 들어섬──▶ enter ──▶ scene | checks | ambush ──▶ deploy ──▶ fight ──▶ after ──▶ search ──▶ loot ──▶ travel
//   travel ──적이 보임───▶ deploy ──▶ fight   (기습당하면 deploy 없이 바로 fight)
//   travel ──갈 곳 없음──▶ stairs ──▶ 다음 층
G.Flow = (() => {
  const F = () => G.Fantasy, GR = G.Grid, U = G.U, T = () => G.Turn, X = () => G.Explore, ST = () => G.Story;
  const HEAD_N = 6, ARRIVE_V = 4, ARRIVE_MAX = 4, REGROUP_R = 3.5, REGROUP_MAX = 4, DEPLOY_V = 5, DEPLOY_T = 1.6, AFTER_T = 0.9, SEARCH_MAX = 3, STASH_REACH = 1.2, SIGHT_R = 7, HIDDEN_P = 0.35, BRACE_T = 0.5, AMBUSH_T = 1.3, GAP_T = 0.4, TRAIL_STEP = 0.4, TRAIL_MAX = 60, TRAIL_GAP = 1.6, RUSH_K = 1.4, KNOWN_GOLD = 0.5, FOLLOW_K = 1.1, RANK = { front: 0, mid: 1, back: 2 };

  const leadOf = rt => (rt.hero.dead ? rt.party.find(p => !p.dead) : rt.hero);
  const roomOf = (rt, o) => rt.map.rooms.find(r => F().inRoom(r, o)) || null;
  const monsIn = (rt, r) => rt.mons.filter(o => F().inRoom(r, o));
  const chestIn = (rt, r) => rt.chests.find(c => !c.relic && F().inRoom(r, c));

  // ── 층 시작 ──
  function init(f, rt) {
    const m = rt.map, known = G.Season.known(f, rt);
    X().state(f, rt);
    for (const r of m.rooms) r.ent = known;
    m.rooms[0].ent = true;
    // 달아나는 황금 고블린은 실시간 추격이 없으므로 턴제 층에 두지 않는다
    rt.mons = rt.mons.filter(o => !o.flee);
    if (known) {
      // 아는 층: 작은 무리는 이미 정리했다 치고 금화 일부만 받는다. 우두머리만 남는다
      for (const o of rt.mons) if (!o.boss) F().gain(f, F().monGold(f.floor) * KNOWN_GOLD);
      rt.mons = rt.mons.filter(o => o.boss);
    }
    // 조우는 G.Turn.stage가 모은 무리(층마다 1~2방)뿐이다. 나머지 몬스터는 두지 않고, 그 금화를 조우 몬스터가 나눠 갖는다 (빈 방은 장면 · 탐험의 자리)
    const keep = rt.mons.filter(o => o.major || o.boss || o.chief), cut = rt.mons.length - keep.length;
    if (keep.length) for (const o of keep) o.gold *= 1 + cut / keep.length;
    rt.mons = keep;
    for (const o of rt.mons) o.major = true;
    // 숨은 무리: 방에 베일을 쳐 입구까지 보이지 않게 한다. 이 방들만 매복 판정을 굴린다 (G.Sight)
    for (const r of m.rooms) if (r !== m.rooms[0] && monsIn(rt, r).length && !monsIn(rt, r).some(o => o.boss) && U.chance(HIDDEN_P)) { G.Sight.veil(rt, r); r.ambush = true; }
    F().refreshEnts(rt);
    rt.trail = [{ x: rt.hero.x, y: rt.hero.y }];
    rt.flow = { map: m, st: 'travel', t: 0, r: null };
    T().floorStart(f, rt);
    G.Sight.update(rt);
    if (rt.scene) go(rt, 'scene');
  }
  const go = (rt, st, t = 0) => { if (G.Flow.trace && rt.flow.st !== st) G.Flow.trace(rt.flow.st, st, rt); rt.flow.st = st; rt.flow.t = t; };

  // ── 대열: 단장이 지나간 길을 정해진 순서로 따라간다 ──
  function follow(f, rt, speed, dt) {
    const lead = leadOf(rt); if (!lead) return;
    const tl = rt.trail, tp = tl[tl.length - 1];
    if (Math.hypot(lead.x - tp.x, lead.y - tp.y) >= TRAIL_STEP) { tl.push({ x: lead.x, y: lead.y }); if (tl.length > TRAIL_MAX) tl.shift(); }
    const line = rt.allies.filter(q => !q.dead && !q.dying && q !== lead).sort((p, q) => RANK[G.Persona.stance(p)] - RANK[G.Persona.stance(q)]);
    // 진행 방향: 조금 전 위치에서 지금 위치로. 8방향으로 눌러 흔들리지 않게 한다
    const back = tl[Math.max(0, tl.length - 1 - HEAD_N)], hx0 = lead.x - back.x, hy0 = lead.y - back.y, hl = Math.hypot(hx0, hy0);
    if (hl > 0.8) { rt.headX = Math.round(hx0 / hl); rt.headY = Math.round(hy0 / hl); }
    line.forEach((a, i) => {
      if (a.exT) { X().wander(rt, a, speed, dt); return; }
      // 넓은 곳에서는 진형 판대로 걷는다. 그 자리가 벽이거나 벽 너머면 길 위로 줄을 선다
      const slot = G.Tactics.slot(rt, a, lead, rt.headX || 0, rt.headY || 1);
      if (slot && GR.pass(rt.map, Math.round(slot.x), Math.round(slot.y)) && F().sees(rt.map, lead, slot)) { GR.moveTo(rt.map, a, slot.x, slot.y, speed * FOLLOW_K * (Math.hypot(a.x - slot.x, a.y - slot.y) > 1.5 ? RUSH_K : 1), dt, 0.15); return; }
      let ax = lead.x, ay = lead.y, left = (i + 1) * TRAIL_GAP, t = null;
      for (let k = tl.length - 1; k >= 0; k--) { const q = tl[k], g = Math.hypot(q.x - ax, q.y - ay); if (g >= left) { const u = g ? left / g : 0; t = { x: ax + (q.x - ax) * u, y: ay + (q.y - ay) * u }; break; } left -= g; ax = q.x; ay = q.y; }
      if (t) GR.moveTo(rt.map, a, t.x, t.y, speed * FOLLOW_K * (Math.hypot(a.x - t.x, a.y - t.y) > 1.5 ? RUSH_K : 1), dt, 0.15);
    });
  }

  // ── 이동: 적이 보이면 싸우고, 새 방에 들어서면 멈추고, 갈 곳이 없으면 계단으로 ──
  function travel(f, rt, speed, dt) {
    const m = rt.map, lead = leadOf(rt);
    if (!lead) return;
    if (!rt.rush) {
      const seen = rt.mons.find(o => o.spotted && o.hp > 0 && GR.dist(o, lead) <= SIGHT_R && F().sees(m, lead, o));
      if (seen) { const r = roomOf(rt, seen); if (r) r.ent = true; fight(f, rt, r, seen); return; }
      const fresh = m.rooms.find(r => !r.ent && F().inRoom(r, lead));
      if (fresh) { enter(f, rt, fresh); return; }
    }
    const wants = rt.rush ? [] : m.rooms.filter(r => monsIn(rt, r).length || chestIn(rt, r));
    const near = wants.reduce((b, r) => (!b || Math.hypot(r.cx - lead.x, r.cy - lead.y) < Math.hypot(b.cx - lead.x, b.cy - lead.y) ? r : b), null);
    if (near) {
      // 이미 들어간 방에 남은 일: 도착하면 처리한다
      if (F().inRoom(near, lead)) { const mons = monsIn(rt, near); rt.flow.r = near; if (near.ambush) ambush(f, rt, near, mons); else if (mons.length) fight(f, rt, near); else go(rt, 'loot'); return; }
      GR.moveTo(m, lead, near.cx, near.cy, speed, dt, 0.5);
      return;
    }
    if (GR.moveTo(m, lead, m.end.cx, m.end.cy, rt.rush ? speed * RUSH_K : speed, dt, 0.3)) go(rt, 'stairs');
  }

  // ── 방에 들어섬: 무리가 있으면 싸움, 없으면 장면, 그것도 없으면 판정 ──
  function enter(f, rt, r) {
    const fl = rt.flow; r.ent = true; fl.r = r;
    const mons = monsIn(rt, r), chest = chestIn(rt, r);
    // 숨은 무리: 방은 아직 어둡다. 판정이 끝나야 드러난다
    if (r.ambush) { ambush(f, rt, r, mons); return; }
    G.Sight.revealRoom(rt, r);
    if (mons.length) { fight(f, rt, r); return; }
    T().scene(f, rt, mons, chest);
    ST().room(f, rt, X().state(f, rt), r, mons, chest);
    if (rt.scene) { go(rt, 'scene'); return; }
    X().checks(f, rt, r, chest);
    go(rt, 'checks', BRACE_T);
  }

  // 숨은 무리의 매복 판정: 들키면 우리가, 못 알아채면 저쪽이 첫 라운드를 먼저 움직인다
  function ambush(f, rt, r, mons) {
    const look = G.Mission.roll(f, rt, 'perception');
    rt.nextFirst = look && look.ok ? 'party' : 'foes';
    if (look) {
      rt.roll = { id: T().rollId(rt), who: look.who.merc?.name || '', what: '매복 살피기', nat: look.nat, ok: look.ok, need: look.dc - look.mod, word: look.ok ? '먼저 봤다' : '기습당했다', res: look.ok ? '우리 선공' : '적 선공' };
      rt.rollT = G.S.runTime + AMBUSH_T + 1;
    }
    rt.flow.mons = mons;
    go(rt, 'ambush', AMBUSH_T);
  }
  function reveal(rt) {
    const ok = rt.nextFirst === 'party', r = rt.flow.r;
    r.ambush = false; G.Sight.revealRoom(rt, r); G.Sight.update(rt);
    for (const o of rt.flow.mons) { o.spotted = true; T().vis(rt, { k: 'reveal', e: o, ok }); }
  }

  function fight(f, rt, r, one) {
    rt.flow.r = r;
    const list = r ? monsIn(rt, r) : [one];
    if (one && !list.includes(one)) list.push(one);
    // 싸움이 시작되면 그 방과 상대가 전부 보인다: 안 보이는 적과는 싸우지 않는다
    if (r) G.Sight.revealRoom(rt, r);
    for (const o of list) { o.aggro = true; o.major = true; o.spotted = true; }
    if (r) r.fought = true;
    startFight(rt, one || list[0]);
  }
  // 대형을 갖춘 뒤 싸운다. 기습당하면 갖출 틈이 없다
  function startFight(rt, foe) {
    const lead = leadOf(rt);
    rt.flow.plans = [];
    if (rt.nextFirst !== 'foes' && lead && foe) { G.Tactics.snap(rt); rt.flow.plans = G.Tactics.deploy(rt, lead, foe); }
    if (rt.flow.plans.length) go(rt, 'deploy', DEPLOY_T); else go(rt, 'fight');
  }
  function deploy(rt, dt) {
    const fl = rt.flow;
    fl.plans = fl.plans.filter(q => !q.e.dead && !G.Tactics.walk(q.e, q.path, DEPLOY_V, dt));
    if (!fl.plans.length || fl.t <= 0) go(rt, 'fight');
  }

  // ── 싸움이 끝났다: 이긴 방만 뒤진다 ──
  function afterFight(f, rt) {
    G.Res.afterFight(rt);
    const r = rt.flow.r;
    rt.mons = rt.mons.filter(o => { if (!o.flee) return true; G.fx(rt, { k: 'text', x: o.x, y: o.y - 1, s: '달아났다', col: '#aaa', t: 1 }); return false; });
    F().refreshEnts(rt);
    rt.nextFirst = null;
    // 대열을 새로 시작한다: 싸우던 자리에서 그대로 걸어 나가 한 줄이 된다
    const lead = leadOf(rt); if (lead) rt.trail = [{ x: lead.x, y: lead.y }];
    go(rt, 'after', AFTER_T);
  }
  // 멀리 떨어진 사람은 일행 곁으로 걸어온다. 다 모이면 true
  function regroup(rt, speed, dt) {
    const lead = leadOf(rt); if (!lead) return true;
    let all = true;
    for (const p of rt.party) { if (p.dead || p === lead || GR.dist(p, lead) <= REGROUP_R) continue; all = false; GR.moveTo(rt.map, p, lead.x, lead.y, speed * RUSH_K, dt, REGROUP_R - 0.5); }
    return all || rt.flow.t <= -REGROUP_MAX;
  }
  // 숨을 고른 뒤 이긴 방을 뒤진다
  function afterBeat(f, rt) {
    const r = rt.flow.r;
    if (r && !r.searched && !monsIn(rt, r).length && !G.Season.known(f, rt)) { X().startSearch(f, rt, X().state(f, rt), r); go(rt, 'search', SEARCH_MAX); return; }
    go(rt, 'loot', GAP_T);
  }

  // 그 방의 상자를 연다
  function loot(f, rt, speed, dt) {
    const r = rt.flow.r, lead = leadOf(rt), chest = r && chestIn(rt, r);
    if (!chest || !lead) { go(rt, 'travel'); return; }
    if (GR.moveTo(rt.map, lead, chest.x, chest.y, speed, dt, 0.9)) { F().openChest(f, rt, chest); go(rt, 'wait', 1); if (rt.mons.some(o => o.mimic && o.aggro)) { fight(f, rt, r); } }
  }

  // 굴리는 사람이 상자 앞에 도착해야 주사위를 굴린다
  function search(f, rt, ex, speed, dt) {
    const who = X().searcher(ex), P = X().stash(ex);
    if (who && P && !who.dead && rt.flow.t > 0 && !GR.moveTo(rt.map, who, P.x, P.y, speed, dt, STASH_REACH)) return;
    X().endSearch(f, rt, ex, true);
    go(rt, 'wait', 1.4);
  }
  // 장면에서 불려 온 적: 파티는 멈춰 있고, 적이 시야 안으로 걸어 들어온 뒤에 싸움이 시작된다
  function arrive(rt, dt) {
    const lead = leadOf(rt), comers = rt.mons.filter(o => o.aggro && !o.spotted);
    if (lead) for (const o of comers) { GR.moveTo(rt.map, o, lead.x, lead.y, ARRIVE_V, dt, 1.5); o.moving = true; }
    if (comers.length && rt.flow.t > 0) return;
    for (const o of comers) o.spotted = true;
    startFight(rt, rt.mons.find(o => o.aggro));
  }
  function afterScene(f, rt) {
    ST().clearWalk(rt);
    // 장면에서 나타난 적
    if (rt.mons.some(o => o.aggro)) { const r = rt.flow.r; for (const o of rt.mons) if (o.aggro) o.major = true; if (r) r.fought = true; if (rt.mons.some(o => o.aggro && !o.spotted)) go(rt, 'arrive', ARRIVE_MAX); else startFight(rt, rt.mons.find(o => o.aggro)); return; }
    { const lead = leadOf(rt); if (lead) rt.trail = [{ x: lead.x, y: lead.y }]; }
    go(rt, 'loot', GAP_T);
  }

  return {
    // 매 틱. 전투 · 장면 · 판정 · 이동 중 하나만 돈다
    tick(f, rt, speed, dt) {
      if (!rt.flow || rt.flow.map !== rt.map) init(f, rt);
      const fl = rt.flow, ex = X().state(f, rt);
      for (const p of rt.party) p.moving = false;
      for (const o of rt.mons) o.moving = false;
      X().drain(f, rt, ex, dt);
      if (rt.phase === 'dead' || f.town) return;
      fl.t -= dt;
      const st0 = fl.st;
      switch (fl.st) {
        case 'travel': travel(f, rt, speed, dt); break;
        case 'checks': if (fl.t <= 0 && X().idle(ex)) go(rt, 'loot'); break;
        case 'scene': if (!ST().tick(f, rt, dt)) afterScene(f, rt); break;
        case 'ambush': if (fl.t <= 0) { reveal(rt); fight(f, rt, fl.r); } break;
        case 'fight': if (!T().run(f, rt, dt)) { if (!f.town) afterFight(f, rt); return; } if (!f.town) G.Sight.update(rt); return;
        case 'arrive': arrive(rt, dt); break;
        case 'deploy': deploy(rt, dt); break;
        case 'after': if (regroup(rt, speed, dt) && fl.t <= 0) afterBeat(f, rt); break;
        case 'search': search(f, rt, ex, speed, dt); break;
        case 'wait': if (fl.t <= 0 && X().idle(ex)) go(rt, 'loot'); break;
        case 'loot': if (fl.t <= 0) loot(f, rt, speed, dt); break;
        case 'stairs':
          if (!f.auto && !rt.rush) { rt.stairWait = true; break; }
          if (ST().stairs(f, rt)) { go(rt, 'stairScene'); break; }
          F().descend(f, rt); return;
        case 'stairScene': if (!ST().tick(f, rt, dt)) { if (!f.town) F().descend(f, rt); return; } break;
      }
      if (f.town || !rt.flow || rt.flow.map !== rt.map) return;
      // 줄지어 걷는 건 이동할 때뿐이다. 나머지 단계에서는 맡은 사람만 움직인다
      if (st0 === fl.st && (fl.st === 'travel' || fl.st === 'loot')) { follow(f, rt, speed, dt); F().spread(rt.map, rt.party, 0.75); }
      else for (const a of rt.party) if (a.exT && !a.dead) X().wander(rt, a, speed, dt); // 단장도 함께 (야영)
      G.Sight.update(rt);
    },
  };
})();
