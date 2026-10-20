'use strict';
// 글 대신 해 보게: 세계마다 처음 할 행동 하나를 맵 위 화살표로 가리킨다. 한 번 해 보면 사라진다.
// 이어서 그 세계의 첫 노드를 살 수 있게 되면 [스킬트리] 탭 → 살 수 있는 노드를 차례로 반짝인다.
// 단계: coach[id] = 0(맵 행동 전) | 1(했다), coach[id + 'T'] = 0(탭 전) | 1(탭 열었다) | 2(첫 노드 샀다)
G.Coach = {
  st() {
    if (!G.S.coach) {
      // 이전 저장(코치 없음)으로 이미 한참 한 사람에게는 보이지 않는다
      const c = G.S.coach = {};
      if (G.S.playTime > 120) for (const w of G.D.WORLDS) { c[w.id] = 1; c[w.id + 'T'] = 2; }
    }
    return G.S.coach;
  },
  stage: k => G.Coach.st()[k] || 0,
  done(k, n) { const c = G.Coach.st(); if ((c[k] || 0) < n) c[k] = n; },

  // 맵 위 화살표 대상 { x, y, s }
  target(id) {
    if (!G.S.unlocked[id] || G.Coach.stage(id) > 0) return null;
    const w = G.S.w[id];
    if (id === 'fantasy') {
      const rt = G.Fantasy.rt(w), m = rt.phase !== 'dead' && G.Fantasy.nearestMon(rt, rt.hero, 7);
      return m ? { x: m._rx ?? m.x, y: m._ry ?? m.y, s: m.s, label: '눌러!' } : null;
    }
    if (id === 'wuxia') {
      const b = G.Wuxia.rt(w).foes[0];
      return b ? { x: b._rx ?? b.x, y: b._ry ?? b.y, s: 1, label: '눌러!' } : null;
    }
    if (id === 'xianxia') {
      const me = G.Xianxia.rt(w).me;
      return { x: me._rx ?? me.x, y: me._ry ?? me.y, s: 1.2, label: '눌러!' };
    }
    if (id === 'scifi') {
      if (Object.keys(w.towers).length) { G.Coach.done(id, 1); return null; }
      const rt = G.Scifi.rt(w), i = w.selPad != null && w.selPad < G.Scifi.padCount() ? w.selPad : 0;
      return { x: rt.pads[i][0], y: rt.pads[i][1], s: 1, label: w.selPad == null ? '눌러!' : '건설!' };
    }
    if (id === 'cthulhu') {
      // 감아 올릴 때 위쪽의 물고기 하나를 가리킨다: 누르면 바늘이 그쪽으로 간다
      const rt = G.Cthulhu.rt(w), h = rt.hook;
      if (rt.phase !== 'up') return null;
      const f = rt.fish.find(o => o.y < h.y && h.y - o.y < 4);
      return f ? { x: f._rx ?? f.x, y: f._ry ?? f.y, s: 1, label: '눌러!' } : null;
    }
    return null;
  },
  // 맵을 눌렀다: 화살표 근처를 눌렀으면 그 세계의 첫 단계 끝 (SF는 포탑을 지어야 끝)
  clicked(id, p, t) {
    if (t && id !== 'scifi' && Math.hypot(t.x - p.x, t.y - p.y) < 1.6) G.Coach.done(id, 1);
  },
  // 첫 노드를 살 수 있는데 아직 트리를 안 열었으면 탭이 반짝인다
  canAfford(id) {
    const c = G.Tree.cheapest(id, G.S.w[id].tree);
    return c && G.Tree.wallet[id].get() >= c.cost ? c.node.id : null;
  },
  tabPulse: id => G.Coach.stage(id + 'T') === 0 && !!G.Coach.canAfford(id),
  openedTree(id) { if (G.Coach.tabPulse(id)) G.Coach.done(id + 'T', 1); },
  treeNode: id => (G.D.WORLD[id] && G.Coach.stage(id + 'T') === 1 ? G.Coach.canAfford(id) : null),
};
G.on('tree', e => { if (G.D.WORLD[e.id]) G.Coach.done(e.id + 'T', 2); });
