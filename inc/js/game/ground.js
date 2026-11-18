'use strict';
// 바닥에 놓는 것 (설계 5-11, 화면 없이): 기름 · 마름쇠 — SRD 그대로.
// - 기름 (SRD 기름 병): 5피트 칸. 불이 닿으면(그 자리의 생물이 화염 피해를 입으면) 타오른다 — 불붙은 라운드 + 2라운드의 끝까지,
//   들어서거나 차례를 그 안에서 끝내는 생물에게 화염 5 (차례마다 한 번). 타는 기름은 아군도 다친다.
// - 마름쇠 (SRD 마름쇠): 5피트 칸. 처음 들어서는 생물은 민첩 내성 DC 15 — 실패하면 관통 1에 그 자리에서 멈춘다(다음 차례까지 이동 0).
//   놓은 쪽은 자리를 알아 피해 걷는다 — 놓은 쪽의 적만 걸린다.
// 상태는 rt.terrain = [{ id, kind, x, y, r, lit, until, by }] (JSON으로 저장할 수 있는 모양).
// 옛 엔진의 피해 · 내성 · 차례 번호는 io로 넘겨받는다: { round(), turnNo(), save(e, ab, dc) → bool, hurt(e, n, type) } — 엔진에 거는 건 bridge.js.
// 모든 함수는 사건 목록을 돌려준다: { k: 'ignite' | 'burn' | 'caltrops' | 'dodge', p, e } — 화면은 이걸 그린다.
G.Ground = (() => {
  const R = { oil: 0.8, caltrops: 0.8 }; // 5피트 칸 ≈ 반지름 0.8타일
  const BURN = 5, BURN_ROUNDS = 2, CAL_DC = 15;
  const list = rt => rt.terrain || (rt.terrain = []);
  function place(rt, kind, x, y, by = 'party') {
    const L = list(rt), p = { id: L.reduce((m, q) => Math.max(m, q.id), 0) + 1, kind, x, y, r: R[kind], lit: false, until: 0, by };
    L.push(p); return p;
  }
  const inside = (p, q) => Math.hypot(q.x - p.x, q.y - p.y) <= p.r;
  // 선분 (x0, y0) → (x1, y1)이 원 p에 들어서나: 들어서는 첫 지점의 비율 t (0~1), 안 들어서면 null. 처음부터 안에 있었으면 들어선 게 아니다
  function cross(p, x0, y0, x1, y1) {
    if (Math.hypot(x0 - p.x, y0 - p.y) <= p.r) return null;
    const dx = x1 - x0, dy = y1 - y0, fx = x0 - p.x, fy = y0 - p.y, a = dx * dx + dy * dy;
    if (a < 1e-9) return null;
    const b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - p.r * p.r, disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }
  const foeOf = (p, e) => (p.by === 'party') === (e.kind === 'mon');
  function burn(p, e, io, ev) { if (e._burnT === io.turnNo()) return; e._burnT = io.turnNo(); io.hurt(e, BURN, 'fire'); ev.push({ k: 'burn', p, e }); }
  // 불이 닿았다 (q의 자리에서 화염 피해): 그 자리의 마른 기름이 타오른다
  function fireAt(rt, q, io) {
    const ev = [];
    for (const p of list(rt)) if (p.kind === 'oil' && !p.lit && inside(p, q)) { p.lit = true; p.until = io.round() + BURN_ROUNDS; ev.push({ k: 'ignite', p, e: q }); }
    return ev;
  }
  // 걸어서 (x0, y0) → 지금 자리로 왔다: 지나간 마름쇠 · 타는 기름
  function moved(rt, e, x0, y0, io) {
    const ev = [], x1 = e.x, y1 = e.y;
    const hits = list(rt).map(p => ({ p, t: cross(p, x0, y0, x1, y1) })).filter(h => h.t != null).sort((a, b) => a.t - b.t);
    for (const { p, t } of hits) {
      if (p.kind === 'caltrops' && foeOf(p, e) && e._calT !== io.turnNo()) {
        e._calT = io.turnNo();
        if (io.save(e, 'dex', CAL_DC)) { ev.push({ k: 'dodge', p, e }); continue; }
        e.x = x0 + (x1 - x0) * t; e.y = y0 + (y1 - y0) * t; io.hurt(e, 1, 'piercing'); ev.push({ k: 'caltrops', p, e });
        break; // 거기서 멈췄다 — 뒤쪽 칸은 지나가지 않았다
      }
      if (p.kind === 'oil' && p.lit) burn(p, e, io, ev);
    }
    return ev;
  }
  // 차례를 끝냈다: 타는 기름 위면 화염 5
  function turnEnd(rt, e, io) {
    const ev = []; if (!e) return ev;
    for (const p of list(rt)) if (p.kind === 'oil' && p.lit && inside(p, e)) burn(p, e, io, ev);
    return ev;
  }
  // 라운드가 바뀌면: 다 탄 기름은 사라진다
  function tick(rt, round) { const L = list(rt); for (let i = L.length - 1; i >= 0; i--) if (L[i].lit && round > L[i].until) L.splice(i, 1); }
  // AI 점수용: 이 적들 가운데 마른 기름 위에 선 수
  const oiled = (rt, foes) => foes.filter(o => list(rt).some(p => p.kind === 'oil' && !p.lit && inside(p, o))).length;
  return { R, BURN, BURN_ROUNDS, CAL_DC, list, place, inside, cross, fireAt, moved, turnEnd, tick, oiled };
})();
