'use strict';
// 소리와 적의 상태 (설계 5-11, 화면 없이) — DCSS의 noise처럼: 소리는 걸을 수 있는 칸을 따라 퍼지고 멀어질수록 작아진다.
// - 크기 n의 소리는 걸어서 2n타일(지도 n칸)까지 닿는다. 들리는 크기 = n − 거리/2 (0 이하면 못 듣는다). 닫힌 문은 거리 +6타일.
// - 들은 쪽(listener: { x, y, aware, heard })의 상태가 오른다: 잠듦(sleep) → 모름(idle) → 경계(alert) → 쫓음(hunt).
//   쫓는 쪽은 소리 난 곳(heard)을 기억한다 — 그쪽으로 걸어오는 건 쓰는 쪽(전투 · 탐사)이 한다.
// - emit은 사건 목록을 돌려준다: { k: 'noise', x, y, n, r } (파문) · { k: 'aware', who, from, to } (상태 바뀜). 화면은 이걸 그린다.
G.Noise = (() => {
  // 행동마다 소리 크기 (설계 5-11 표)
  const LV = { walk: 0, listen: 0, push: 1, pick: 1, pickFail: 4, kick: 10, knock: 15, round: 8, blast: 12 };
  const ORDER = ['sleep', 'idle', 'alert', 'hunt'];
  const DOOR = 6; // 닫힌 문 너머는 이만큼 멀게 들린다 (타일)
  const reach = n => 2 * n;
  const heardAs = (n, d) => n - d / 2;
  // 들리는 크기 q를 들으면 상태가 어떻게 되나
  function hear(state, q) {
    if (q <= 0) return state;
    if (state === 'sleep') return q >= 4 ? 'alert' : 'idle';
    if (state === 'idle') return q >= 10 ? 'hunt' : 'alert';
    if (state === 'alert') return q >= 10 ? 'hunt' : 'alert';
    return state;
  }
  // 거리장: (x, y)에서 걸을 수 있는 칸을 따라 잰 거리 (8방향, 대각선 1.4, 닫힌 문 +DOOR). max를 넘으면 Infinity
  // grid = { w, h, pass(k): 걸을 수 있나, door(k): 닫힌 문인가 }
  function field(grid, x, y, max) {
    const { w, h } = grid, D = new Float32Array(w * h).fill(Infinity), s = Math.round(y) * w + Math.round(x);
    if (s < 0 || s >= w * h) return D;
    D[s] = 0; const q = [s]; // 작은 지도 · 짧은 거리라 단순한 갱신 큐로 충분하다
    for (let i = 0; i < q.length; i++) {
      const k = q[i], d0 = D[k], cx = k % w, cy = (k / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const n = Y * w + X; if (!grid.pass(n) && !grid.door?.(n)) continue;
        if (dx && dy && (!grid.pass(cy * w + X) || !grid.pass(Y * w + cx))) continue; // 모서리로 새지 않는다
        const d = d0 + (dx && dy ? 1.4 : 1) + (grid.door?.(n) ? DOOR : 0);
        if (d < D[n] && d <= max) { D[n] = d; q.push(n); }
      }
    }
    return D;
  }
  // 소리 한 번: src = { x, y }, n = 크기, listeners = 들을 수 있는 것들. 들은 것의 aware · heard를 바꾸고 사건 목록을 돌려준다
  function emit(grid, src, n, listeners) {
    const ev = [{ k: 'noise', x: src.x, y: src.y, n, r: reach(n) }];
    if (n <= 0) return ev;
    const D = field(grid, src.x, src.y, reach(n));
    for (const who of listeners) {
      const d = D[Math.round(who.y) * grid.w + Math.round(who.x)], q = heardAs(n, d);
      if (!(q > 0)) continue;
      const from = who.aware || 'idle', to = hear(from, q);
      if (to === 'hunt') who.heard = { x: src.x, y: src.y };
      if (to !== from) { who.aware = to; ev.push({ k: 'aware', who, from, to }); }
    }
    return ev;
  }
  // 기습인가: 문이 열리거나 싸움이 시작될 때 아무것도 모르는 쪽 (SRD: 선제권 굴림에 불리)
  const surprised = who => who.aware === 'sleep' || who.aware === 'idle';
  return { LV, ORDER, DOOR, reach, heardAs, hear, field, emit, surprised };
})();
