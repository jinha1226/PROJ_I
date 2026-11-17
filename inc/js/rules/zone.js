'use strict';
// 4×4 구역 전투 (설계 5-5 · 사용자 2026-11-17: 「4x4 구역 전투로 수정하자. 4x4로 한다고 방 크기 자체를 너무 작게 만들 필요는 없어. 전투의 단순화를 위해서 4x4 구역으로 나눈 것뿐」)
// 전투가 시작되면 그 방의 바닥(테두리 사각형)을 4×4 구역으로 나눈다. 방 크기는 그대로다.
// - 이동: 한 차례에 이웃 구역까지(속도 30피트 = 1구역, 40피트 이상 = 2구역). 구역 안에서는 정해진 자리(최대 3명)에 선다.
// - 거리: 두 인물의 구역 차이(체비셰프, 대각선도 1) z를 칸 단위 "구역 거리" = z === 0 ? 0 : z × 4 − 2 로 바꿔,
//   기존 엔진의 칸 단위 사거리 비교가 그대로 SRD 거리 → 구역 수(5피트 = 같은 구역, 10~25피트 = 이웃, 30~45피트 = 두 구역 …)가 되게 한다.
// - 옛 엔진(G.Turn · G.Tactics · G.Skill · 유틸리티 AI)은 그대로 돈다. 바꾸는 것은 이동(G.Tactics.plan · snap)과 거리(G.Zone.dist)뿐.
G.Zone = (() => {
  const N = 4, SLOTS = [[0, 0], [-0.26, 0.22], [0.26, -0.22]];
  const Z = { on: false, N, b: null, map: null };
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  // 판 = 그 방 테두리 안의 바닥 칸이 차지하는 사각형 (벽 칸은 뺀다)
  Z.set = (room, map) => {
    let x0 = room.x + room.w, y0 = room.y + room.h, x1 = room.x, y1 = room.y;
    for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (map && map.c[y * map.w + x] !== '#') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); }
    if (x1 <= x0) { x0 = room.x; y0 = room.y; x1 = room.x + room.w; y1 = room.y + room.h; }
    // 그리는 쪽은 칸 i를 좌표 i 가운데로 그린다 (i − 0.5 ~ i + 0.5) — 판의 테두리도 반 칸 당긴다
    Z.b = { x: x0 - 0.5, y: y0 - 0.5, w: x1 - x0, h: y1 - y0, zw: (x1 - x0) / N, zh: (y1 - y0) / N }; Z.map = map; Z.on = true;
  };
  Z.off = () => { Z.on = false; Z.b = null; };
  Z.zoneOf = p => { const b = Z.b; return [cl(Math.floor((p.x - b.x) / b.zw), 0, N - 1), cl(Math.floor((p.y - b.y) / b.zh), 0, N - 1)]; };
  Z.cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  Z.zdist = (a, b) => Z.cheb(Z.zoneOf(a), Z.zoneOf(b));
  // 칸 단위 구역 거리 (구역 전투가 아닐 때는 보통 거리)
  Z.dist = (a, b) => { if (!Z.on) return Math.hypot(a.x - b.x, a.y - b.y); const z = Z.zdist(a, b); return z === 0 ? 0 : z * 4 - 2; };
  const floor = (x, y) => { const m = Z.map; if (!m) return true; const X = Math.round(x), Y = Math.round(y); return X >= 0 && Y >= 0 && X < m.w && Y < m.h && m.c[Y * m.w + X] !== '#'; };
  // 구역의 i번째 자리 (바닥이 아니면 그 구역 안에서 가장 가까운 바닥)
  Z.slot = (zx, zy, i) => {
    const b = Z.b, cx = b.x + (zx + 0.5) * b.zw, cy = b.y + (zy + 0.5) * b.zh, [ox, oy] = SLOTS[i % SLOTS.length];
    let x = cx + ox * b.zw, y = cy + oy * b.zh;
    if (!floor(x, y)) { let best = null, bd = 1e9; for (let yy = Math.ceil(b.y + zy * b.zh); yy < b.y + (zy + 1) * b.zh; yy++) for (let xx = Math.ceil(b.x + zx * b.zw); xx < b.x + (zx + 1) * b.zw; xx++) { if (!floor(xx, yy)) continue; const d = (xx - x) ** 2 + (yy - y) ** 2; if (d < bd) { bd = d; best = [xx, yy]; } } if (!best) return null; [x, y] = best; }
    return { x, y };
  };
  const live = rt => rt.party.filter(p => !p.dead || p.dying).concat((rt.mons || []).filter(m => m.hp > 0), (rt.allies || []).filter(a => a.kind === 'sum' && !a.dead));
  // 구역마다 지금 서 있는 사람 (나를 빼고)
  const occ = (rt, me) => { const o = new Map(); for (const e of live(rt)) { if (e === me) continue; const k = Z.zoneOf(e).join(','); o.set(k, (o.get(k) || 0) + 1); } return o; };
  const hasFloor = (zx, zy) => !!Z.slot(zx, zy, 0);

  // ── 옛 이동(G.Tactics)을 구역 단위로 감싼다 ──
  const T = G.Tactics, plan0 = T.plan, snap0 = T.snap;
  T.plan = function (rt, e, tg, budget, hits, strict) {
    if (!Z.on) return plan0.call(this, rt, e, tg, budget, hits, strict);
    if (hits(e.x, e.y)) return [];
    const [ex, ey] = Z.zoneOf(e), tz = Z.zoneOf(tg), maxZ = Math.max(1, Math.floor((budget || 6) * 5 / 20)), o = occ(rt, e);
    let best = null;
    for (let zy = 0; zy < N; zy++) for (let zx = 0; zx < N; zx++) {
      const d = Z.cheb([zx, zy], [ex, ey]); if (d === 0 || d > maxZ || (o.get(`${zx},${zy}`) || 0) >= 3 || !hasFloor(zx, zy)) continue;
      const s = Z.slot(zx, zy, o.get(`${zx},${zy}`) || 0); if (!s) continue;
      const ok = hits(s.x, s.y), toT = Z.cheb([zx, zy], tz), score = (ok ? 0 : 100) + toT * 10 + d;
      if (!best || score < best.score) best = { s, ok, score };
    }
    if (!best || (strict && !best.ok)) return [];
    return [best.s];
  };
  // 자리 잡기: 모두 자기 구역의 자리에 (구역마다 3명까지, 넘치면 가까운 빈 구역)
  T.snap = function (rt, walker) {
    if (!Z.on) return snap0.call(this, rt, walker);
    const count = new Map();
    for (const e of live(rt)) {
      if (e === walker) continue;
      let [zx, zy] = Z.zoneOf(e), k = `${zx},${zy}`;
      if ((count.get(k) || 0) >= 3 || !hasFloor(zx, zy)) { let bd = 1e9, bz = null; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const kk = `${x},${y}`; if ((count.get(kk) || 0) >= 3 || !hasFloor(x, y)) continue; const d = Z.cheb([x, y], [zx, zy]); if (d < bd) { bd = d; bz = [x, y]; } } if (bz) { [zx, zy] = bz; k = `${zx},${zy}`; } }
      const i = count.get(k) || 0, s = Z.slot(zx, zy, i); count.set(k, i + 1);
      if (s) { e.x = s.x; e.y = s.y; }
    }
  };
  return Z;
})();
