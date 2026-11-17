'use strict';
// 앞줄 · 뒷줄 진형 전투 (사용자 2026-11-17: 「한줄로 서서 순서대로 진행되는게 오히려 이해가 편하겠어」 → 넓은 방에 일렬은 어색하니 앞뒤 두 열)
// 전투가 시작되면 그 방 가운데를 무대로, 아군과 적이 마주 보고 각자 앞줄 · 뒷줄(줄마다 옆으로 나란히)에 선다. 방 크기는 그대로.
// - 거리(칸, 1칸 = 5피트): 서로 다른 편이면 내 줄 + 상대 줄 + 1 (앞-앞 1 = 근접, 앞-뒤 2 = 리치, 뒤-뒤 3).
//   한 편의 앞줄이 비면 그 편 뒷줄이 앞줄로 친다. 같은 편끼리는 진형 칸 차이(앞뒤 · 옆, 대각선도 1) — 옆 사람은 손이 닿는다.
// - 이동: 자기 편 안에서 앞줄 ↔ 뒷줄(또는 옆 칸)로 자리 옮기기뿐. 줄마다 자리 셋(넘치면 바깥 칸).
// - 줄은 서 있는 자리로 정한다(무대 축 위의 거리) — 걸어가 자리를 바꾸면 줄도 바뀐다.
// - 옛 엔진(G.Turn · G.Tactics · G.Skill · 유틸리티 AI)은 그대로. 바꾸는 것은 이동(G.Tactics.plan · snap)과 거리(G.Line.dist)뿐.
G.Line = (() => {
  const LANES = [0, -1, 1, -2, 2];
  const BASE = { D: [2.4, 4.6], LANE: 2.1 }; // 인형 하나가 바닥 1칸 남짓이라 옆 간격 2칸 · 줄 사이 2칸
  const L = { on: false, c: null, d: null, p: null, D: BASE.D.slice(), LANE: BASE.LANE, map: null, rt: null, LANES };
  const floor = (x, y) => { const m = L.map; if (!m) return true; const X = Math.round(x), Y = Math.round(y); return X >= 0 && Y >= 0 && X < m.w && Y < m.h && m.c[Y * m.w + X] !== '#'; };
  const along = q => (q.x - L.c.x) * L.d.x + (q.y - L.c.y) * L.d.y;
  const lat = q => (q.x - L.c.x) * L.p.x + (q.y - L.c.y) * L.p.y;
  L.sideOf = q => (along(q) < 0 ? 0 : 1); // 0 = 아군 쪽, 1 = 적 쪽
  L.rowOf = q => (Math.abs(along(q)) < (L.D[0] + L.D[1]) / 2 ? 0 : 1);
  L.laneOf = q => Math.round(lat(q) / L.LANE);
  const live = rt => rt.party.filter(p => !p.dead || p.dying).concat((rt.mons || []).filter(m => m.hp > 0), (rt.allies || []).filter(a => a.kind === 'sum' && !a.dead));
  const frontEmpty = s => !live(L.rt).some(e => L.sideOf(e) === s && L.rowOf(e) === 0);
  const eff = q => (L.rowOf(q) === 1 && L.rt && frontEmpty(L.sideOf(q)) ? 0 : L.rowOf(q));
  // 칸 단위 거리 (진형 전투가 아닐 때는 보통 거리)
  L.dist = (a, b) => {
    if (!L.on) return Math.hypot(a.x - b.x, a.y - b.y);
    if (L.sideOf(a) !== L.sideOf(b)) return eff(a) + eff(b) + 1;
    return Math.max(Math.abs(L.rowOf(a) - L.rowOf(b)), Math.abs(L.laneOf(a) - L.laneOf(b)));
  };
  // 편 s · 줄 r · 옆 칸 ln의 자리 (바닥이 아니면 같은 편 · 같은 줄에 남는 가장 가까운 바닥)
  L.slot = (s, r, ln) => {
    const a = (s ? 1 : -1) * L.D[r], l = ln * L.LANE;
    let x = L.c.x + L.d.x * a + L.p.x * l, y = L.c.y + L.d.y * a + L.p.y * l;
    if (!floor(x, y)) {
      let best = null, bd = 1e9;
      for (let yy = Math.round(y) - 3; yy <= Math.round(y) + 3; yy++) for (let xx = Math.round(x) - 3; xx <= Math.round(x) + 3; xx++) {
        const q = { x: xx, y: yy }; if (!floor(xx, yy) || L.sideOf(q) !== s || L.rowOf(q) !== r) continue;
        const dd = (xx - x) ** 2 + (yy - y) ** 2; if (dd < bd) { bd = dd; best = q; }
      }
      if (!best) return null; ({ x, y } = best);
    }
    return { x, y };
  };
  const melee = e => (e.kind === 'mon' ? !G.Foe.ranged(e) : !(e.def && e.def.range >= 2));
  // 처음 진형: 근접은 앞줄, 원거리 · 시전자는 뒷줄 (앞줄이 비면 가장 튼튼한 사람이 앞). 돌려주는 것: 사람 → 설 자리
  L.formation = rt => {
    const out = new Map();
    for (const s of [0, 1]) {
      const mine = live(rt).filter(e => (e.kind === 'mon' ? 1 : 0) === s);
      const front = mine.filter(melee), back = mine.filter(e => !melee(e));
      if (!front.length && back.length) { back.sort((a, b) => b.max - a.max); front.push(back.shift()); }
      while (front.length > 3) back.push(front.pop());
      [front, back].forEach((row, r) => row.forEach((e, i) => { const q = L.slot(s, r, LANES[i] ?? i); if (q) out.set(e, q); }));
    }
    return out;
  };
  // 무대: 방 가운데 c, 아군(from) → 적(to) 방향. 방이 좁으면 줄 간격 · 옆 간격을 줄인다
  L.set = (rt, map, c, from, to) => {
    L.rt = rt; L.map = map; L.c = { x: c.x, y: c.y };
    let dx = to.x - from.x, dy = to.y - from.y, l = Math.hypot(dx, dy); if (l < 0.01) { dx = 1; dy = 0; l = 1; }
    L.d = { x: dx / l, y: dy / l }; L.p = { x: -L.d.y, y: L.d.x };
    const ray = (vx, vy) => { let t = 0; while (t < 8 && floor(c.x + vx * (t + 0.25), c.y + vy * (t + 0.25))) t += 0.25; return t; };
    const kA = Math.max(0.4, Math.min(1, (Math.min(ray(L.d.x, L.d.y), ray(-L.d.x, -L.d.y)) - 0.4) / BASE.D[1]));
    const kL = Math.max(0.4, Math.min(1, (Math.min(ray(L.p.x, L.p.y), ray(-L.p.x, -L.p.y)) - 0.3) / BASE.LANE));
    L.D = BASE.D.map(v => v * kA); L.LANE = BASE.LANE * kL; L.on = true;
    return L.formation(rt);
  };
  L.off = () => { L.on = false; L.rt = null; };
  // 자리마다 지금 선 사람 (나를 빼고)
  const key = q => `${L.sideOf(q)},${L.rowOf(q)},${L.laneOf(q)}`;
  const occ = (rt, me) => new Set(live(rt).filter(e => e !== me).map(key));

  // ── 옛 이동(G.Tactics)을 진형 단위로 감싼다 ──
  const T = G.Tactics, plan0 = T.plan, snap0 = T.snap, ov0 = T.overlay;
  // 칸 단위 이동 · 공격 범위 칠하기는 진형 전투에선 뜻이 없다
  T.overlay = function (...a) { return L.on ? null : ov0.apply(this, a); };
  T.plan = function (rt, e, tg, budget, hits, strict) {
    if (!L.on) return plan0.call(this, rt, e, tg, budget, hits, strict);
    if (hits(e.x, e.y)) return [];
    const s = L.sideOf(e), r0 = L.rowOf(e), o = occ(rt, e), cand = [];
    for (const r of [1 - r0, r0]) for (const ln of LANES) { if (o.has(`${s},${r},${ln}`)) continue; const q = L.slot(s, r, ln); if (q && !o.has(key(q))) cand.push({ ...q, r }); }
    const ok = cand.find(q => hits(q.x, q.y));
    if (ok) return [{ x: ok.x, y: ok.y }];
    // 아무도 못 치는 근접은 앞줄로 나선다
    if (!strict && r0 === 1 && melee(e)) { const f = cand.find(q => q.r === 0); if (f) return [{ x: f.x, y: f.y }]; }
    return [];
  };
  // 자리 잡기: 모두 자기 줄의 자리에 (줄마다 자리가 차면 옆 칸, 그래도 없으면 다른 줄)
  T.snap = function (rt, walker) {
    if (!L.on) return snap0.call(this, rt, walker);
    const used = new Set();
    for (const e of live(rt)) {
      if (e === walker) continue;
      const s = L.sideOf(e), r0 = L.rowOf(e), l0 = L.laneOf(e);
      const order = [[r0, l0], ...LANES.map(ln => [r0, ln]), ...LANES.map(ln => [1 - r0, ln])];
      for (const [r, ln] of order) { const k = `${s},${r},${ln}`; if (used.has(k)) continue; const q = L.slot(s, r, ln); if (!q) continue; used.add(k); e.x = q.x; e.y = q.y; break; }
    }
  };
  return L;
})();
