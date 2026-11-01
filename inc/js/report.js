'use strict';
// 원정 보고서 (DESIGN.md 50, Darkest Dungeon 원정 결과 화면): 원정이 사람을 어떻게 바꿨나를 한 장으로.
// 출발할 때 찍어 둔 것(f.run)과 돌아왔을 때를 비교한다 — 사건마다 따로 적지 않아도 빠짐이 없다.
// f.report = { from, to, why, got, lost, kills, mercs: [{ uid, lv0, lv1, inj }], tkGain, tkLost, friends, rivals }
G.Report = (() => {
  const D = G.D;
  const friendKeys = f => {
    const out = new Set();
    for (const p of G.Bond.pairs(f, f.mercs)) if (p.r === 'friend') out.add([p.a.uid, p.b.uid].sort((a, b) => a - b).join('-'));
    return out;
  };
  const R = {
    // 출발 (G.Exp.depart)
    snap(f, rt) {
      const st = G.Rivals.st(f);
      f.run = {
        from: f.floor, kills: f.kills || 0,
        mercs: rt.allies.filter(a => a.merc).map(a => ({ uid: a.merc.uid, lv: a.merc.lv + (a.merc.bt || 0) })),
        tk: G.Trinket.all(f).map(t => ({ id: t.id, n: G.Trinket.name(t), ic: G.Trinket.def(t).ic, r: G.Trinket.rarity(t) })),
        friends: [...friendKeys(f)],
        riv: Object.fromEntries(D.RIVALS.map(d => [d.id, { w: st[d.id].wins, l: st[d.id].losses }])),
      };
    },
    // 귀환 (G.Exp.home): 기벽 · 장신구 정리가 끝난 뒤에 부른다
    make(f, why, got, lost) {
      const r = f.run;
      if (!r) return;
      const mercs = [];
      for (const s of r.mercs) {
        const m = G.Guild.get(f, s.uid);
        if (!m) continue;
        mercs.push({ uid: m.uid, lv0: s.lv, lv1: m.lv + (m.bt || 0), inj: m.inj > 0 });
      }
      const now = G.Trinket.all(f), was = new Map(r.tk.map(t => [t.id, t]));
      const tkGain = now.filter(t => !was.has(t.id)).map(t => ({ id: t.id, n: G.Trinket.name(t), ic: G.Trinket.def(t).ic, r: G.Trinket.rarity(t), tip: G.Trinket.tip(t) }));
      const tkLost = r.tk.filter(t => !now.some(q => q.id === t.id));
      const before = new Set(r.friends), friends = [...friendKeys(f)].filter(k => !before.has(k)).map(k => k.split('-').map(u => G.Guild.get(f, +u)?.name).filter(Boolean));
      const st = G.Rivals.st(f), rivals = [];
      for (const d of D.RIVALS) {
        const o = r.riv[d.id] || { w: 0, l: 0 }, beat = st[d.id].losses - o.l, lostTo = st[d.id].wins - o.w;
        if (beat > 0 || lostTo > 0) rivals.push({ n: d.n, col: d.col, beat, lostTo });
      }
      f.report = { from: r.from, to: f.floor, why, got, lost, kills: (f.kills || 0) - r.kills, mercs, tkGain, tkLost, friends, rivals, seen: false, at: G.S.runTime };
      f.run = null;
    },
  };
  return R;
})();
