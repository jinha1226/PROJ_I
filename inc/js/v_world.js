'use strict';
// 세계 화면 틀: 맵(캔버스 + HUD, 단축 버튼, 세계별 옆 패널)이 기본. 스킬트리는 맵 오른쪽 아래 단추로 열고 같은 자리 단추로 닫는다 (탭 없이).
// spec: { side: 요소, hud: 요소, hotbar: 요소, click(tile, ev) → 처리했으면 true, update() }
G.UI.tabs = G.UI.tabs || {};
G.UI.worldScreen = function (id, spec) {
  const mod = G.MODS[id];
  const cv = h('canvas.mapcv');
  const mv = G.MapView(cv, id);
  const tree = G.UI.tree(id, () => G.S.w[id].tree);
  let tab = G.UI.tabs[id] || 'map';

  // 스킬트리 단추: 살 수 있는 노드 수를 배지로
  const badge = h('span.badge');
  const treeBtn = h('button.treebtn', { title: '스킬트리', 'aria-label': '스킬트리', on: { click: () => setTab('tree') } }, G.T.el('ui_tree', 'md'), badge);
  const backBtn = h('button.treebtn.back', { title: '맵', 'aria-label': '맵', on: { click: () => setTab('map') } }, '✕');
  const mapPane = h('div.wmap', null,
    h('div.mapbox', null, cv, spec.hud ? h('div.hud', null, spec.hud) : null, spec.hotbar ? h('div.hotbar', null, spec.hotbar) : null, treeBtn),
    spec.side ? h('div.wside', null, spec.side) : null);
  const treePane = h('div.wtree', null, tree.el, backBtn);
  function setTab(t) {
    tab = G.UI.tabs[id] = t;
    tog(mapPane, 'hidden', t !== 'map');
    tog(treePane, 'hidden', t !== 'tree');
    if (t === 'tree') { tree.center(); G.Coach.openedTree(id); }
  }
  // 확대·축소: 휠, 두 손가락 벌리기·오므리기 (두 번째 손가락은 클릭으로 치지 않는다)
  cv.addEventListener('wheel', e => { if (!mv.canZoom()) return; e.preventDefault(); mv.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  const touches = new Map();
  let pinch = 0;
  const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  cv.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2 && pinch) { const d = spread(); mv.zoomBy(d / pinch); pinch = d; }
  });
  const lift = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch = 0; };
  cv.addEventListener('pointerup', lift);
  cv.addEventListener('pointercancel', lift);
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size >= 2) { pinch = spread(); return; }
    }
    const r = cv.getBoundingClientRect(), p = mv.toTile(e.clientX - r.left, e.clientY - r.top);
    const ct = G.Coach.target(id);
    if (!(spec.click && spec.click(p, e)) && mod.click) mod.click(G.S.w[id], p.x, p.y);
    G.Coach.clicked(id, p, ct);
  });
  // 끌기: 누른 채 움직이면 spec.drag (낚싯바늘 조종 등). 끌기를 쓰는 맵은 터치 스크롤을 막는다.
  if (spec.drag) {
    cv.style.touchAction = 'none';
    cv.addEventListener('pointermove', e => {
      if (!e.buttons) return;
      const r = cv.getBoundingClientRect();
      spec.drag(mv.toTile(e.clientX - r.left, e.clientY - r.top), e);
    });
  }

  // 세계 이름·장르 문구는 왼쪽 차원 막대 아이콘이 대신한다
  if (!spec.side) mapPane.classList.add('solo');
  if (spec.overlay) mapPane.querySelector('.mapbox').insertBefore(spec.overlay, treeBtn);
  const el = h('section.world.' + id, null, mapPane, treePane);
  setTab(tab);
  return {
    el,
    frame(t) {
      if (tab !== 'map') return;
      const v = mod.view(G.S.w[id]);
      // 고정 지도는 지도 비율에 맞춰 상자를 줄여 위아래 빈 띠를 없앤다
      // 따라가는 카메라가 있는 맵은 좁은 화면(모바일 세로)에서 정사각에 가깝게 키운다 (style.css .mapbox.cam)
      if (v.cam && !cv._touch) { cv._touch = true; cv.style.touchAction = 'none'; }
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

// ── 맵 위 HUD 부품 (모든 세계 공통 구성: 위 가운데 막대 + 능력치 줄, 왼쪽 위 진행, 왼쪽 가운데 유닛 줄, 작은 단추 → 창)
G.UI.ov = {
  // 위 가운데 긴 막대: 이번 판을 끝내는 자원. 오른쪽에 줄어드는/차오르는 속도
  bar(tip, sideTip) {
    const b = bar('hp'), t = h('b.php-t'), side = h('span.corr', sideTip ? { 'data-tip': sideTip } : null);
    const el = h('div.ftop-r', null, h('div.php', tip ? { 'data-tip': tip } : null, b, t), side);
    return { el, bar: b, set(frac, txt, sideTxt, low) { setW(b.fill, frac); setText(t, txt); setText(side, sideTxt || ''); tog(b, 'low', !!low); } };
  },
  // 능력치 한 줄: [[키, 그림, 뜻]] → 아이콘 + 숫자, 올리면 뜻
  stats(defs) {
    const v = {}, ic = {};
    const el = h('div.minis', null, defs.map(([k, t, tip]) => h('span.mini', { 'data-tip': tip }, ic[k] = G.T.el(t, 'xs'), v[k] = h('b'))));
    return { el, set(k, txt) { setText(v[k], txt); }, icon: k => ic[k] };
  },
  // 작은 단추 + 옆으로 열리는 창. 같은 묶음(group) 안에서는 하나만 열린다
  pop(label, title, body, group) {
    const p = h('div.fpop.lpop.hidden', null, body);
    const btn = h('button.fbtn.obtn', { 'data-tip': title, on: { click: e => { e.stopPropagation(); set(!open); } } }, label);
    let open = false;
    function set(v) {
      if (v && group) for (const o of group) if (o !== api) o.set(false);
      open = v; tog(p, 'hidden', !v); tog(btn, 'on', v);
    }
    const api = { el: h('div.owrap', null, btn, p), btn, set, isOpen: () => open };
    if (group) group.push(api);
    return api;
  },
};
