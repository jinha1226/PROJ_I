'use strict';
// 전투 세우기 (화면 없이): 탐사의 적 무리 → 옛 엔진 몬스터를 그 방에 세운다.
// 문 앞 준비(js/game/prep.js)가 만든 전투 조건(시작 자리 · 지형 · 적의 상태)은 여기서 적용한다.
G.Encounter = (() => {
  // 탐사 규칙의 몬스터 이름 → 옛 엔진의 몬스터 (없으면 이름이 겹치는 것, 그래도 없으면 고블린 졸개)
  const monName = n => { const M = G.D.F.mon; return M[n] ? n : Object.keys(M).find(k => k.includes(n)) || Object.keys(M).find(k => k.includes(n.slice(0, 2))) || '고블린 졸개'; };
  // 방 칸들(cells: 타일 좌표) 중 from에서 먼 곳부터 세 칸 걸러 적을 세운다. units = [[이름, 수], …]
  // major: 옛 G.Flow가 층 시작에 major 아닌 몬스터를 치운다 · aggro · spotted: 바로 싸운다 (문 앞 준비가 있으면 그쪽이 상태를 정한다)
  function spawnRoom(R, cells, units, from, opts = {}) {
    const order = cells.slice().sort((a, b) => Math.hypot(b[0] - from.x, b[1] - from.y) - Math.hypot(a[0] - from.x, a[1] - from.y));
    const out = []; let k = 0;
    for (const [name, cnt] of units) for (let i = 0; i < cnt; i++) {
      const [x, y] = order[(k++ * 3) % Math.max(1, order.length)] || [from.x + 3, from.y], nm = monName(name);
      out.push(G.Fantasy.spawnMon(R, 1, { n: nm, ...G.D.F.mon[nm] }, x, y, false, { aggro: true, spotted: true, major: true, boss: !!opts.boss }));
    }
    G.Fantasy.refreshEnts(R); if (G.Sight?.update) G.Sight.update(R);
    return out;
  }
  return { monName, spawnRoom };
})();
