'use strict';
// 세계 화면 틀: [맵 | 스킬트리] 탭. 맵 탭은 캔버스(+HUD, 단축 버튼) 와 세계별 옆 패널, 트리 탭은 그 세계의 스킬트리.
// spec: { side: 요소, hud: 요소, hotbar: 요소, click(tile, ev) → 처리했으면 true, update() }
G.UI.tabs = G.UI.tabs || {};
G.UI.worldScreen = function (id, spec) {
  const mod = G.MODS[id];
  const cv = h('canvas.mapcv');
  const mv = G.MapView(cv);
  const tree = G.UI.tree(id, () => G.S.w[id].tree);
  let tab = G.UI.tabs[id] || 'map';

  const badge = h('span.badge');
  const mapBtn = h('button.wtab', { on: { click: () => setTab('map') } }, '맵');
  const treeBtn = h('button.wtab', { on: { click: () => setTab('tree') } }, '스킬트리', badge);
  const mapPane = h('div.wmap', null,
    h('div.mapbox', null, cv, spec.hud ? h('div.hud', null, spec.hud) : null, spec.hotbar ? h('div.hotbar', null, spec.hotbar) : null),
    h('div.wside', null, spec.side));
  const treePane = h('div.wtree', null, tree.el);
  function setTab(t) {
    tab = G.UI.tabs[id] = t;
    tog(mapPane, 'hidden', t !== 'map');
    tog(treePane, 'hidden', t !== 'tree');
    tog(mapBtn, 'on', t === 'map');
    tog(treeBtn, 'on', t === 'tree');
    if (t === 'tree') { tree.center(); G.Coach.openedTree(id); }
  }
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), p = mv.toTile(e.clientX - r.left, e.clientY - r.top);
    const ct = G.Coach.target(id);
    if (!(spec.click && spec.click(p, e)) && mod.click) mod.click(G.S.w[id], p.x, p.y);
    G.Coach.clicked(id, p, ct);
  });

  const el = h('section.world.' + id, null,
    G.V.head(id, h('div.wtabs', null, mapBtn, treeBtn)),
    mapPane, treePane);
  setTab(tab);
  return {
    el,
    frame(t) {
      if (tab !== 'map') return;
      const v = mod.view(G.S.w[id]);
      // 고정 지도는 지도 비율에 맞춰 상자를 줄여 위아래 빈 띠를 없앤다
      // 따라가는 카메라가 있는 맵은 좁은 화면(모바일 세로)에서 정사각에 가깝게 키운다 (style.css .mapbox.cam)
      if (v.fit && !mapPane._fit) {
        mapPane._fit = true;
        const box = mapPane.querySelector('.mapbox');
        box.style.aspectRatio = `${v.map.w} / ${v.map.h}`;
        box.classList.add('fit');
        tog(box, 'cam', !!v.cam);
      }
      mv.draw(v, t, id);
    },
    update() {
      const n = tree.update();
      setText(badge, n ? String(n) : '');
      tog(badge, 'hidden', !n);
      tog(treeBtn, 'coach', tab === 'map' && G.Coach.tabPulse(id));
      if (tab === 'map' && spec.update) spec.update();
    },
  };
};
// 켜고 끄는 작은 단추 묶음에 쓰는 진행 막대 줄
G.UI.meter = function (label) {
  const v = h('small'), b = bar();
  const el = h('div.meter', null, h('div.meter-h', null, h('span', null, label), v), b);
  return { el, set(frac, txt) { setW(b.fill, frac); setText(v, txt); }, bar: b };
};
