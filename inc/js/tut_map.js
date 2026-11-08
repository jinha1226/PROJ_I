'use strict';
// 튜토리얼 던전 (DESIGN.md 156): 무작위 던전 대신 손으로 짠 세 층. 규칙은 그대로 쓰고, 무엇이 어디 있는지만 정해 둔다.
// 1층: 찢어진 자루 · 고블린 졸개 한 마리 · 2층: 꺼진 바닥 · 계단 방의 오우거 · 3층: 고블린 졸개 · 계단을 막는 자물쇠 (G.Tut.gate)
// 튜토리얼 동안 원정 지역이 여기로 고정된다 (f.frontLock = 'tut'). 3층 계단을 내려가면 지역 끝이라 돌아온다 (G.Region.done)
G.TutMap = (() => {
  const F = () => G.Fantasy, W = 36, H = 15;
  // 방: [id, 이름, x, y, 너비, 높이]. 0번이 시작, 마지막이 계단. 사건은 시작에서 가장 가까운 빈 방에 선다 (G.Event.plan) — 그래서 1번 방을 가장 가깝게 둔다
  const ROOMS = [['A', '입구', 2, 4, 6, 6], ['B', '곁방', 11, 2, 6, 5], ['C', '안쪽 방', 13, 9, 6, 5], ['D', '계단 방', 24, 3, 9, 8]];
  const LINKS = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D']];
  // 층마다 놓는 적: [방, 이름, 수]. 첫 원정은 1층에 한 마리 (사용자 요청). 오우거는 G.Tut이 따로 세운다 (벽)
  const FOES = { 1: [], 2: [], 3: [['C', '고블린 졸개', 2]] }; // 동료와 다시 갈 땐 오우거까지 곧장 (체력이 가득한 채로)
  const FOES_FIRST = { 1: [['C', '고블린 졸개', 1]] };
  const TITLE = { 1: '무너진 지하실', 2: '오우거의 굴', 3: '녹슨 문 앞' };
  function build(f) {
    const c = new Array(W * H).fill('#'), ix = (x, y) => y * W + x, cut = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) c[ix(x, y)] = '.'; };
    const rooms = ROOMS.map(([id, title, x, y, w, h]) => { for (let v = y; v < y + h; v++) for (let u = x; u < x + w; u++) cut(u, v); return { id, title, x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), tags: [id === 'D' ? 'stairs' : 'hall'] }; });
    const by = id => rooms.find(r => r.id === id);
    // 복도: 가로로 가다 세로로 (한 칸 너비)
    for (const [a, b] of LINKS) { const p = by(a), q = by(b); let x = p.cx, y = p.cy; while (x !== q.cx) { cut(x, y); x += Math.sign(q.cx - x); } while (y !== q.cy) { cut(x, y); y += Math.sign(q.cy - y); } cut(x, y); }
    const start = rooms[0], end = rooms[rooms.length - 1];
    c[ix(end.cx, end.cy)] = '>';
    return { w: W, h: H, c, kindAt: new Uint8Array(W * H), poi: {}, passChars: '.>,', ver: 1, dist: {}, rooms, start, end, fixed: true, scn: 'tut', title: TITLE[f?.floor] || '' };
  }
  const put = (f, rt, r, n, cnt, opt = {}) => {
    const m = rt.map, cells = [];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (m.c[y * m.w + x] === '.' && Math.hypot(x - r.cx, y - r.cy) > 1) cells.push([x, y]);
    const out = [];
    for (let i = 0; i < cnt; i++) { const [x, y] = cells[(i * 7) % Math.max(1, cells.length)] || [r.cx, r.cy]; F().spawnMon(rt, f.floor, { n, ...G.D.F.mon[n] }, x, y, false, { major: true }); out.push(rt.mons[rt.mons.length - 1]); }
    return out;
  };
  const T = {
    ROOMS, FOES, FOES_FIRST, build, put,
    // 층을 세울 때 (G.Turn.stage → G.Region.stage): 정해 둔 적을 놓고, 2층이면 오우거를 계단 곁에
    stage(f, rt) {
      const m = rt.map, first = G.Tut.safe(f), list = (first && FOES_FIRST[f.floor]) || FOES[f.floor] || [];
      for (const [id, n, cnt] of list) { const r = m.rooms.find(q => q.id === id); if (r && G.D.F.mon[n]) put(f, rt, r, n, cnt); }
      G.Tut.wall(f, rt);
    },
  };
  G.Region.REGIONS.tut = { n: '튜토리얼', len: 3, gen: (w, h, rng, f) => build(f), stage: T.stage, note: '', pool: ['고블린 졸개'] };
  return T;
})();
