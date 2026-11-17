'use strict';
// 시험 장면: 넓은 전장에서 N 대 N (?war=50). INCREMENTAL_PLAN 1-4 (후반 인원 확장)의 시연.
// 적은 SRD 조우 예산으로 고른 다섯 무리 — 같은 몬스터 무리는 선제권을 한 번 굴려 함께 움직인다 (js/turn.js).
// 저장하지 않는 시험 주소에서만 돈다.
(() => {
  const N = +(q.get('war') || 0); if (!N) return;
  const CLS = ['dragoon', 'cleric', 'archer', 'archmage', 'barbarian', 'paladin', 'rogue', 'mage', 'monk', 'bard', 'scout', 'warlock'];
  // 레벨 5 파티 50명의 보통 예산 750 × 50 = 37,500 XP 안: 홉고블린 · 버그베어 · 오우거 · 대장 · 트롤 (SRD 경험치 100 · 200 · 450 · 700 · 1,800)
  const ARMY = [['홉고블린 전사', 0.3], ['버그베어 전사', 0.3], ['오우거', 0.2], ['홉고블린 대장', 0.08], ['트롤', 0.12]];
  function setup() {
    const r = rt(); if (!r || !r.map || !r.party) return setTimeout(setup, 300);
    { const st0 = document.createElement('style'); st0.textContent = '#party{display:none!important} #order{display:none!important}'; document.head.append(st0); } // 시연: 파티 패널은 접는다 (분대 패널은 1-4)
    const W = 40, H = 30, c = new Array(W * H).fill('.');
    for (let x = 0; x < W; x++) { c[x] = '#'; c[(H - 1) * W + x] = '#'; } for (let y = 0; y < H; y++) { c[y * W] = '#'; c[y * W + W - 1] = '#'; }
    const old = r.map, m = { ...old, w: W, h: H, c, props: [], ver: (old.ver || 0) + 1, start: { cx: 3, cy: H >> 1 }, end: { cx: W - 2, cy: H >> 1 }, rooms: [{ x: 1, y: 1, w: W - 2, h: H - 2, cx: W >> 1, cy: H >> 1, ri: 0, tag: 'cave' }], scn: null };
    r.map = m; r.seen = new Uint8Array(W * H).fill(1); r.seenVer = (r.seenVer || 0) + 1; r.mons = []; r.chests = []; r.fields = []; r.traps = []; r.turn = null; r.ask = null; r.scene = null; m.redraw = true;
    // 용병단: N − 1명 + 단장
    G.Fantasy.slots = () => N - 1;
    f.mercs = f.mercs.slice(0, 0); f.lineup = [];
    for (let i = 0; i < N - 1; i++) { const mm = G.Guild.make(f, CLS[i % CLS.length], { lv: 5 }); f.mercs.push(mm); f.lineup.push(mm.uid); }
    G.Guild.leader(f).lv = 5; G.Fantasy.syncAllies(f);
    const ps = r.party; ps.forEach((p, i) => { p.x = 7 + (i % 6); p.y = 3 + Math.floor(i / 6) * 3 % (H - 6) + Math.floor(i / 36); p._dx = p.x; p._dy = p.y; p.hp = p.max; p.dead = false; });
    // 적: 오른쪽에 무리별로
    let k = 0; const fl = f.floor;
    for (const [n, w] of ARMY) { const cnt = Math.round(N * w); for (let i = 0; i < cnt && k < N; i++, k++) { const x = W - 9 - (k % 6), y = 3 + Math.floor(k / 6) * 3 % (H - 6) + Math.floor(k / 36); G.Fantasy.spawnMon(r, fl, { n, ...G.D.F.mon[n] }, x, y, false, { aggro: true, major: true, spotted: true }); } }
    for (const o of r.mons) { o.aggro = true; o.spotted = true; o.major = true; }
    G.fx(r, { k: 'text', x: W / 2, y: H / 2, s: `${N} 대 ${r.mons.length}`, col: '#ffd24a', t: 2.5, sz: 1.6, pop: true });
  }
  setTimeout(setup, 1500);
})();
