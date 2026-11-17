'use strict';
// 전투 칸 (DESIGN.md 77, 117): 전투 중에는 칸마다 한 명만 선다. 이동은 칸 단위, 자기편 칸은 지나갈 수 있고 멈출 수 없으며, 적 칸은 돌아간다.
// 대각선도 1칸이고(D&D 기본), 벽 모서리는 대각선으로 가로지르지 못한다.
G.Tactics = (() => {
  const GR = G.Grid, F = () => G.Fantasy;
  const DEPLOY_MOVE = 6, BOARD_GAP = 2, WALK_GAP = 1.5; // 진형 판 한 칸 = 바닥 2칸
  const cellOf = e => [Math.round(e.x), Math.round(e.y)];
  // 어려운 지형 (SRD): 얕은 물은 칸당 이동력 2. 헤엄치는 몬스터는 그대로
  const stepCost = (m, e, x, y) => { const rt = G.RT.fantasy; if (rt?.map === m && G.Terrain) return G.Terrain.cost(rt, e, x, y) === 2 && e.merc && (G.Opt.has(e, 'iv_ascend') || G.Guild.skill(e.merc, 'x_acro')) && m.c[y * m.w + x] === ',' ? 1 : G.Terrain.cost(rt, e, x, y); return m.c[y * m.w + x] === ',' ? 2 : 1; }; // SRD 지형 (G.Terrain): 어려운 지형 · 헤엄 · 비행
  const insertBy = (q, c) => { let i = q.length; while (i > 0 && q[i - 1][2] > c[2]) i--; q.splice(i, 0, c); }; // 앞쪽(처리한 곳)보다 뒤로만 끼운다: 비용이 커지기만 하므로 안전
  const fighters = rt => rt.party.filter(p => !p.dead || p.dying).concat(rt.mons.filter(o => o.hp > 0));
  const key = (m, x, y) => y * m.w + x;
  const stepOK = (m, x, y, dx, dy, e) => { const rt = G.RT.fantasy, ok = (u, v) => (e && rt?.map === m && G.Terrain ? G.Terrain.enter(rt, e, u, v) : GR.pass(m, u, v)); return ok(x + dx, y + dy) && (!dx || !dy || (ok(x + dx, y) && ok(x, y + dy))); }; // 깊은 물은 날거나 헤엄치는 몸만
  function taken(rt, except) {
    const m = rt.map, s = new Set();
    for (const e of fighters(rt)) if (e !== except) { const [x, y] = cellOf(e); s.add(key(m, x, y)); }
    return s;
  }
  // 상대편이 선 칸: 지나갈 수 없다
  function foesOf(rt, e) {
    const m = rt.map, s = new Set(), mon = e.kind === 'mon';
    for (const o of fighters(rt)) if (o !== e && (o.kind === 'mon') !== mon) { const [x, y] = cellOf(o); s.add(key(m, x, y)); }
    return s;
  }
  // 걸어서 닿는 가장 가까운 빈 칸 (벽 건너로 보내지 않는다). 벽 안에 있으면 벽을 지나 가장 가까운 바닥으로
  function freeNear(m, x0, y0, used) {
    const q = [[x0, y0]], seen = new Set([key(m, x0, y0)]), free = GR.pass(m, x0, y0);
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      if (GR.pass(m, x, y) && !used.has(key(m, x, y))) return [x, y];
      for (const [dx, dy] of GR.DIR) {
        const nx = x + dx, ny = y + dy, k = key(m, nx, ny);
        if (nx <= 0 || ny <= 0 || nx >= m.w - 1 || ny >= m.h - 1 || seen.has(k)) continue;
        if (free && !GR.walkable(m, x, y, nx, ny)) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    return [x0, y0];
  }
  // 지시 (DESIGN.md 83): 자리가 곧 행동이다. 플레이어는 판에서 자리를 정하고, 사람마다 표적 하나만 고른다
  const TARGET = { near: '가까운 적', weak: '약한 적', back: '후열' };
  const ROLE = { paladin: 'front', dragoon: 'front', barbarian: 'front', rogue: 'skirm', monk: 'skirm', archer: 'ranged', mage: 'ranged', archmage: 'ranged', warlock: 'ranged', cleric: 'healer', scout: 'healer', bard: 'healer' };
  // 역할 × 줄(앞 · 가운데 · 뒤) → 위치 · 치유 · 위기
  const STANCE = {
    front: [{ n: '버티기', pos: 'line', low: 'fight' }, { n: '돌격', pos: 'charge', low: 'fight' }, { n: '동료 보호', pos: 'guard', low: 'fight' }],
    skirm: [{ n: '돌격', pos: 'charge', low: 'fight' }, { n: '치고 빠지기', pos: 'charge', low: 'fall' }, { n: '동료 보호', pos: 'guard', low: 'fall' }],
    ranged: [{ n: '전진 사격', pos: 'charge', low: 'fight' }, { n: '거리 유지', pos: 'kite', low: 'fall' }, { n: '거리 유지', pos: 'kite', low: 'fall' }],
    healer: [{ n: '함께 싸움', pos: 'charge', heal: 'crisis', low: 'fight' }, { n: '치유 우선', pos: 'kite', heal: 'early', low: 'fall' }, { n: '치유 우선', pos: 'kite', heal: 'early', low: 'fall' }],
  };
  const HOME_ROW = { front: 0, skirm: 0, ranged: 1, healer: 2 };
  const MELEE_REACH = 1.8, HEAL_AT = { early: 0.75, crisis: 0.35 }, HOLD_R = 3, HOLD_ROUNDS = 2, KEEP_R = 3, LOW_HP = 0.35, GUARD_R = 1.5;
  const roleOf = m => ROLE[m?.cls] || 'front';
  const rowOf = m => { const c = m ? G.S.w.fantasy.form?.[m.uid] : null; return c == null ? HOME_ROW[roleOf(m)] : c / 3 | 0; };
  const stanceOf = m => STANCE[roleOf(m)][rowOf(m)];
  const of = e => { const m = e.merc, s = stanceOf(m); return { pos: s.pos, low: s.low, heal: s.heal || 'early', target: TARGET[m?.tac?.t] ? m.tac.t : 'near' }; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const soft = p => p.def && (G.Dnd.rng(p) >= 2 || p.def.heal);
  // 지켜 줄 사람: 가장 가까운 후열 동료
  const ward = (rt, e) => { const l = rt.party.filter(p => p !== e && !p.dead && soft(p)); return l.length ? l.reduce((a, b) => (dist(b, e) < dist(a, e) ? b : a)) : null; };
  return {
    TARGET, KEEP_R, of, roleOf, HOME_ROW,
    stance: m => stanceOf(m).n,
    setTarget(m, t) { m.tac = { t }; },
    label: m => stanceOf(m).n,
    healAt: e => HEAL_AT[of(e).heal],
    // 표적 고르기
    pick(rt, list, e) {
      if (!list.length) return null;
      const t = of(e).target, near = l => l.reduce((a, b) => (dist(b, e) < dist(a, e) ? b : a));
      if (e.merc) list = G.Foe.good(e, list, G.Dnd.weapon(e).t); // 역효과인 적은 다른 표적이 있으면 피한다
      // 원거리는 지금 자리에서 쏠 수 있는 적부터: 표적 때문에 전열 앞으로 튀어나가지 않는다
      const rg = e.def && G.Dnd.rng(e) >= 2 ? G.Dnd.rng(e) : 0, here = rg ? list.filter(o => dist(o, e) <= rg) : [];
      if (rg && of(e).pos === 'kite' && here.length) list = here;
      if (t === 'near' && e.merc) { const r = rg || MELEE_REACH, adv = list.filter(o => dist(o, e) <= r && G.Dnd.adv(e, o) > 0); if (adv.length) return near(adv); } // 동료가 만든 이점을 쓴다 (넘어짐 · 돕기 · 빛남). 닿는 적 안에서만
      if (t === 'weak') return list.reduce((a, b) => (b.hp < a.hp ? b : a));
      if (t === 'back') { const r = list.filter(G.Foe.back); return near(r.length ? r : list); }
      return near(list);
    },
    // 후열을 노리는 근접: 후열이 보이는데 아직 닿지 않으면, 앞에 있는 적에게 기술을 쓰지 않고 먼저 뚫고 간다
    rushes(e, seen) { if (of(e).target !== 'back' || (G.Dnd.rng(e) || 0) >= 2) return false; const r = seen.filter(G.Foe.back); return r.length > 0 && !r.some(o => dist(o, e) <= GUARD_R); },
    // 동료 보호: 지킬 사람에게 가장 가까운 적을 친다
    guardTarget(rt, e, list) { if (of(e).pos !== 'guard' || !list.length) return null; const w = ward(rt, e); return w ? list.reduce((a, b) => (dist(b, w) < dist(a, w) ? b : a)) : null; },
    // 버티기 · 동료 보호: 달려오는 적이 있을 때만 자리를 지키고 준비 행동을 한다. 접전이 시작되거나 적이 쏘기만 하면 나선다
    waits(rt, st, e) {
      const pos = of(e).pos;
      if ((pos !== 'line' && pos !== 'guard') || st.round > HOLD_ROUNDS) return false;
      const foes = rt.mons.filter(o => o.hp > 0 && o.aggro), w = pos === 'guard' ? ward(rt, e) : null, fighting = rt.party.filter(p => !p.dead);
      if (!foes.some(o => !G.Foe.ranged(o))) return false;
      if (foes.some(o => fighting.some(p => dist(o, p) <= GUARD_R))) return false;
      return !foes.some(o => dist(o, e) <= HOLD_R || (w && dist(o, w) <= HOLD_R));
    },
    // 원거리가 거리를 벌리나: 거리 유지 설정이거나, 위기에 물러나는 사람이 다쳤을 때
    keeps: e => { const t = of(e); return t.pos === 'kite' || (t.low === 'fall' && e.hp < e.max * LOW_HP); },
    // 근접의 위기: 체력이 낮으면 후열 동료 곁으로 물러난다 (경로를 돌려준다)
    fall(rt, e, budget) {
      const t = of(e); if (t.low !== 'fall' || e.hp >= e.max * LOW_HP || (G.Dnd.rng(e) || 0) >= 2) return null;
      const w = ward(rt, e); if (!w || dist(e, w) <= GUARD_R) return null;
      return this.plan(rt, e, w, budget, (x, y) => Math.hypot(x - w.x, y - w.y) <= GUARD_R, true);
    },
    cellOf,
    // 모두를 칸 위에 세운다 (전투 시작 · 밀침 · 소환 뒤). 이미 칸 위에 혼자 서 있으면 그대로
    // walker: 걷는 중인 사람은 건드리지 않는다. 그가 지나가는 칸의 아군도 밀어내지 않고, 새로 자리를 찾는 사람만 그 칸을 피한다
    snap(rt, walker) {
      const m = rt.map, used = new Set(), extra = [];
      for (const e of fighters(rt)) {
        if (e === walker) continue;
        const [x, y] = cellOf(e), k = key(m, x, y);
        if (!used.has(k) && GR.pass(m, x, y)) { used.add(k); e.x = x; e.y = y; } else extra.push(e);
      }
      if (walker) used.add(key(m, ...cellOf(walker)));
      for (const e of extra) {
        const [nx, ny] = freeNear(m, ...cellOf(e), used);
        used.add(key(m, nx, ny)); e.x = nx; e.y = ny;
      }
    },
    // 이번 차례의 경로. hits(x, y): 그 칸에서 칠 수 있나. 칠 수 있는 가장 가까운 칸으로, 없으면 표적에 가장 가까워지는 칸으로
    // strict: 그런 칸이 없으면 걷지 않는다
    plan(rt, e, tg, budget, hits, strict) {
      const m = rt.map, [sx, sy] = cellOf(e), used = taken(rt, e), foes = foesOf(rt, e), start = key(m, sx, sy), prev = new Map([[start, null]]), q = [[sx, sy, 0]];
      if (hits(sx, sy)) return [];
      const [tx, ty] = cellOf(tg), far = GR.field(m, tx, ty);
      let goal = null, best = far[start] >= 0 ? far[start] : 1e9, near = start;
      for (let i = 0; i < q.length; i++) {
        const [x, y, d] = q[i], k = key(m, x, y), stop = k !== start && !used.has(k);
        if (stop && hits(x, y)) { goal = k; break; }
        const v = far[k]; if (stop && v >= 0 && v < best) { best = v; near = k; }
        if (d >= budget) continue;
        for (const [dx, dy] of GR.DIR) {
          if (!stepOK(m, x, y, dx, dy, e)) continue;
          const nk = key(m, x + dx, y + dy), nd = d + stepCost(m, e, x + dx, y + dy);
          if (prev.has(nk) || foes.has(nk) || nd > budget) continue;
          prev.set(nk, k); insertBy(q, [x + dx, y + dy, nd]);
        }
      }
      if (strict && goal == null) return [];
      const path = [];
      for (let k = goal == null ? near : goal; k != null && k !== start; k = prev.get(k)) path.unshift({ x: k % m.w, y: Math.floor(k / m.w) });
      return path;
    },
    // 원거리: 표적과 거리를 벌리고 쏠 칸으로. 그런 칸이 없으면 그냥 쏠 수 있는 칸으로 (지금도 쏠 수 있으면 제자리)
    kite(rt, e, tg, budget, can) {
      const [sx, sy] = cellOf(e), far = (x, y) => Math.hypot(x - tg.x, y - tg.y) >= KEEP_R, p = this.plan(rt, e, tg, budget, (x, y) => can(x, y) && far(x, y), true);
      if (p.length || (can(sx, sy) && far(sx, sy))) return p;
      return can(sx, sy) ? [] : this.plan(rt, e, tg, budget, can);
    },
    // 거리 유지의 경로: 앞줄보다 앞으로 나서지 않는다. 선제권이 빠른 후열이 혼자 튀어나가던 것을 막는다
    rearward(rt, e, tg, budget, can) {
      const line = rt.party.filter(p => p !== e && !p.dead && !p.dying && !soft(p)), D = line.length ? Math.min(...line.map(p => dist(p, tg))) : 0, ok = (x, y) => Math.hypot(x - tg.x, y - tg.y) >= D;
      const [sx, sy] = cellOf(e), far = (x, y) => Math.hypot(x - tg.x, y - tg.y) >= KEEP_R, good = (x, y) => can(x, y) && ok(x, y);
      if (good(sx, sy) && far(sx, sy)) return [];
      const p = this.plan(rt, e, tg, budget, (x, y) => good(x, y) && far(x, y), true);
      if (p.length || good(sx, sy)) return p;
      const q = this.plan(rt, e, tg, budget, good, true); if (q.length) return q;
      // 앞줄 뒤에서는 닿지 않는다: 앞줄 바로 뒤까지만 다가간다 (이미 넘어섰으면 제자리)
      if (!ok(sx, sy)) return [];
      const out = []; for (const c of this.plan(rt, e, tg, budget, can)) { if (!ok(c.x, c.y)) break; out.push(c); }
      return out;
    },
    // 그사이 바로 앞에 적이 섰으면 멈추고, 도착 칸에 누가 들어왔으면 그 앞 빈 칸까지만 간다
    blocked(rt, e, path) {
      if (!path.length) return;
      const m = rt.map, at = c => key(m, c.x, c.y), used = taken(rt, e);
      if (Math.hypot(path[0].x - e.x, path[0].y - e.y) < 1.01 && foesOf(rt, e).has(at(path[0]))) { path.length = 0; return; }
      while (path.length && used.has(at(path[path.length - 1]))) path.pop();
    },
    // 경로를 따라 걷는다. 끝까지 갔으면 true
    walk(e, path, v, dt) {
      let left = v * dt;
      while (path.length && left > 0) {
        const p = path[0], d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d <= left) { e.x = p.x; e.y = p.y; path.shift(); left -= d; }
        else { e.x += (p.x - e.x) / d * left; e.y += (p.y - e.y) / d * left; left = 0; }
      }
      e.moving = true;
      return !path.length;
    },
    // 걸을 때의 자리: 앞장선 사람 기준으로 진형 판의 칸만큼 (진행 방향이 앞)
    slot(rt, e, lead, hx, hy) {
      const form = F().formation(G.S.w.fantasy), c = e.merc ? form[e.merc.uid] : null, c0 = lead.merc ? form[lead.merc.uid] : null;
      if (c == null || c0 == null) return null;
      const a = ((c0 / 3 | 0) - (c / 3 | 0)) * WALK_GAP, b = (c % 3 - c0 % 3) * WALK_GAP;
      return { x: lead.x + hx * a - hy * b, y: lead.y + hy * a + hx * b };
    },
    // 전투 대형: 진형 판(f.form, 윗줄이 전열)을 그대로 바닥에 옮긴다. 앞장선 사람의 칸이 기준이고, 적 쪽이 앞이다
    deploy(rt, lead, foe) {
      const m = rt.map, f = G.S.w.fantasy, form = F().formation(f), [lx, ly] = cellOf(lead), fx = Math.sign(Math.round(foe.x) - lx), fy = Math.sign(Math.round(foe.y) - ly), hx = Math.sign(Math.round((rt.headX || 0) * 2)), hy = Math.sign(Math.round((rt.headY || 0) * 2)),
        // 걷던 대형을 유지한다: 적이 앞쪽 반원에 있으면 가던 방향이 앞이고, 옆이나 뒤에 있을 때만 적 쪽으로 돈다
        keep = (hx || hy) && hx * fx + hy * fy > 0, dx = keep ? hx : fx || (fy ? 0 : 1), dy = keep ? hy : fy, sx = -dy, sy = dx, used = new Set([key(m, lx, ly)]), plans = [];
      for (const o of rt.mons) if (o.hp > 0) used.add(key(m, ...cellOf(o)));
      const c0 = lead.merc ? form[lead.merc.uid] : null, r0 = c0 == null ? 0 : c0 / 3 | 0, q0 = c0 == null ? 1 : c0 % 3;
      for (const p of rt.party.filter(q => !q.dead && !q.dying && q !== lead)) {
        const c = p.merc ? form[p.merc.uid] : null, r = c == null ? 2 : c / 3 | 0, q = c == null ? 1 : c % 3, a = (r0 - r) * BOARD_GAP, b = (q - q0) * BOARD_GAP;
        const want = [lx + dx * a + sx * b, ly + dy * a + sy * b], [x, y] = freeNear(m, Math.max(1, Math.min(m.w - 2, want[0])), Math.max(1, Math.min(m.h - 2, want[1])), used);
        used.add(key(m, x, y));
        const path = this.plan(rt, p, { x, y }, DEPLOY_MOVE, (u, v) => u === x && v === y);
        if (path.length) plans.push({ e: p, path });
      }
      return plans;
    },
    // 차례 표시 (그리는 쪽이 읽는다): move 갈 수 있는 칸 · attack 도착한 칸에서 칠 수 있는 칸 · path 실제로 걸을 칸
    overlay(rt, e, budget, range, path) {
      const m = rt.map, used = taken(rt, e), foes = foesOf(rt, e), [sx, sy] = cellOf(e), move = new Map([[key(m, sx, sy), 0]]), q = [[sx, sy, 0]];
      for (let i = 0; i < q.length; i++) {
        const [x, y, d] = q[i]; if (d >= budget) continue;
        for (const [dx, dy] of GR.DIR) { if (!stepOK(m, x, y, dx, dy, e)) continue; const k = key(m, x + dx, y + dy), nd = d + stepCost(m, e, x + dx, y + dy); if (move.has(k) || foes.has(k) || nd > budget) continue; move.set(k, nd); insertBy(q, [x + dx, y + dy, nd]); }
      }
      for (const k of used) move.delete(k);
      const end = path.length ? path[path.length - 1] : { x: sx, y: sy }, attack = new Set(), R = Math.ceil(range);
      for (let y = end.y - R; y <= end.y + R; y++) for (let x = end.x - R; x <= end.x + R; x++) {
        if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1 || (x === end.x && y === end.y) || !GR.pass(m, x, y) || Math.hypot(x - end.x, y - end.y) > range) continue;
        if (F().sees(m, end, { x, y })) attack.add(key(m, x, y));
      }
      return { move, attack, path: new Set(path.map(p => key(m, p.x, p.y))) };
    },
    // 겹친 사람이 있나 (test/flow_rules.js). walker: 자기편 칸을 지나가는 중인 사람은 세지 않는다
    overlap(rt, walker) { const s = new Set(); for (const e of fighters(rt)) { if (e === walker) continue; const k = key(rt.map, ...cellOf(e)); if (s.has(k)) return true; s.add(k); } return false; },
  };
})();
