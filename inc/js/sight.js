'use strict';
// 시야 규칙 (DESIGN.md 77): 무엇이 보이는가는 여기서만 정한다.
// · 칸: 파티의 시야에 들어온 칸만 보인다 (rt.seen). 베일이 쳐진 방은 걷히기 전까지 안 보인다.
// · 몬스터: 파티가 한 번 본 뒤에만 보인다 (o.spotted). 그 뒤로는 계속 보인다.
// · 장면에서 나타나는 몬스터는 보이지 않는 곳에서 걸어온다 (entry).
G.Sight = (() => {
  const GR = G.Grid, F = () => G.Fantasy, MIN_FAR = 5, MAX_FAR = 24;
  const inVeil = (rt, x, y) => !!rt.veil && rt.veil.has(y * rt.map.w + x);
  const S = {
    // 방에 베일을 친다: 안쪽과 벽 한 겹 (입구에서 들여다보지 못하게)
    veil(rt, r) {
      const m = rt.map; rt.veil = rt.veil || new Set();
      for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) rt.veil.add(y * m.w + x);
    },
    lift(rt, r) { const m = rt.map; if (!rt.veil) return; for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) rt.veil.delete(y * m.w + x); },
    veiled: (rt, r) => !!rt.veil && rt.veil.has(r.cy * rt.map.w + r.cx),
    // 들어선 방은 한 번에 드러난다
    revealRoom(rt, r) {
      const m = rt.map; S.lift(rt, r);
      for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) rt.seen[y * m.w + x] = 1;
      rt.seenVer++;
    },
    // 매 틱: 시야 안의 칸을 본 칸으로, 보이는 몬스터를 본 몬스터로
    update(rt) {
      const m = rt.map, R = F().sight(); let added = false;
      for (const p of rt.party) {
        if (p.dead) continue;
        const hx = Math.round(p.x), hy = Math.round(p.y);
        for (let y = hy - R; y <= hy + R; y++) for (let x = hx - R; x <= hx + R; x++) {
          if (x < 0 || y < 0 || x >= m.w || y >= m.h || (x - hx) ** 2 + (y - hy) ** 2 > R * R) continue;
          const i = y * m.w + x;
          if (rt.seen[i] || inVeil(rt, x, y) || !GR.los(m, hx, hy, x, y)) continue;
          rt.seen[i] = 1; added = true;
        }
      }
      if (added) rt.seenVer++;
      for (const o of rt.mons) {
        if (o.spotted || inVeil(rt, Math.round(o.x), Math.round(o.y))) continue;
        if (F().inView(rt, o.x, o.y) && rt.party.some(p => !p.dead && F().sees(m, p, o))) { o.spotted = true; rt.seen[Math.round(o.y) * m.w + Math.round(o.x)] = 1; rt.seenVer++; if (o.comeIn) G.Turn.vis(rt, { k: 'reveal', e: o, ok: false }); }
      }
    },
    // 장면에서 나타날 몬스터의 자리: 파티에게 안 보이는 가장 가까운 칸. 없으면 가장 먼 칸
    entry(rt) {
      const m = rt.map, lead = rt.hero.dead ? rt.party.find(p => !p.dead) : rt.hero;
      if (!lead) return [Math.round(rt.hero.x), Math.round(rt.hero.y)];
      const sx = Math.round(lead.x), sy = Math.round(lead.y), q = [[sx, sy, 0]], seen = new Set([sy * m.w + sx]), taken = new Set(rt.mons.map(o => Math.round(o.y) * m.w + Math.round(o.x)));
      let far = [sx, sy];
      for (let i = 0; i < q.length; i++) {
        const [x, y, d] = q[i];
        far = [x, y];
        if (d >= MIN_FAR && !taken.has(y * m.w + x) && !rt.party.some(p => !p.dead && F().sees(m, p, { x, y }))) return [x, y];
        if (d >= MAX_FAR) continue;
        for (const [dx, dy] of GR.DIR) { const nx = x + dx, ny = y + dy, k = ny * m.w + nx; if (!seen.has(k) && GR.pass(m, nx, ny)) { seen.add(k); q.push([nx, ny, d + 1]); } }
      }
      return far;
    },
  };
  return S;
})();
