'use strict';
// 스킬트리 화면 부품: 끌어서 이동, 휠로 확대, 노드를 누르면 정보창, 두 번 누르면 바로 배운다.
// 모든 노드가 처음부터 보인다. 못 여는 노드는 흐리게, 누르면 선행 노드와 거기까지 가는 총비용.
G.UI.tree = function (treeId, getSt) {
  const U = G.U, UNIT = 88, T = G.Tree;
  const nodes = T.defs[treeId], wallet = T.wallet[treeId];
  const layer = h('div.tree-layer');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('tree-edges');
  layer.append(svg);
  const vp = h('div.tree-vp', null, layer);
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - 1, minY = Math.min(...ys) - 1, maxX = Math.max(...xs) + 1, maxY = Math.max(...ys) + 1;
  const px = n => (n.x - minX) * UNIT, py = n => (n.y - minY) * UNIT;
  svg.setAttribute('width', (maxX - minX) * UNIT); svg.setAttribute('height', (maxY - minY) * UNIT);

  // 배경 그림 (수선의 경맥도는 사람 몸)
  if (T.opts[treeId].bg) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.innerHTML = T.opts[treeId].bg((x, y) => [(x - minX) * UNIT, (y - minY) * UNIT], UNIT);
    svg.append(g);
  }
  // 선
  const edges = [];
  for (const n of nodes) for (const r of n.req || []) {
    const p = T.idx[treeId][r];
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', px(p)); ln.setAttribute('y1', py(p)); ln.setAttribute('x2', px(n)); ln.setAttribute('y2', py(n));
    svg.append(ln);
    edges.push({ ln, a: p, b: n });
  }
  // 노드
  let sel = null;
  const ui = nodes.map(n => {
    const lvEl = h('span.tn-lv'), icon = G.T.el(n.t, 'tn-ic');
    const el = h('button.tnode' + (n.root ? '.root' : '') + (n.notable ? '.notable' : '') + (n.pair ? '.pair' : ''), {
      style: `left:${px(n)}px;top:${py(n)}px`,
      on: { click: e => { e.stopPropagation(); select(n); }, dblclick: e => { e.stopPropagation(); buy(n); } },
    }, icon, lvEl);
    layer.append(el);
    return { n, el, lvEl, icon };
  });

  // 정보창
  const iName = h('b'), iLv = h('small'), iDesc = h('p'), iCostV = h('span'), iCost = h('div.cost', null, G.T.el(wallet.tile, 'xs'), ' ', iCostV), buyBtn = h('button.btn.big', { on: { click: () => { if (sel) buy(sel); } } }, '배우기');
  const info = h('div.tree-info.hidden', null, h('div.ti-h', null, iName, iLv), iDesc, iCost, buyBtn);
  function select(n) { sel = n; update(); }
  // 짝 노드(택1): 배운 것 중 고르지 않은 쪽은 다시 누르면 공짜로 바꾼다
  const swappable = n => n.pair && T.lv(getSt(), n.id) > 0 && T.picked(getSt(), n) !== n.id;
  // 배우면 소리와 함께 노드가 튀어 오른다
  function buy(n) {
    if (swappable(n)) { T.pick(treeId, getSt(), n.id); if (G.SFX) G.SFX.play('select'); update(); return; }
    if (!T.buy(treeId, getSt(), n.id)) { if (G.SFX) G.SFX.play('error'); return; }
    if (G.SFX) G.SFX.play(n.id.startsWith('open_') ? 'unlock' : 'buy');
    const u = ui.find(x => x.n === n);
    u.el.classList.remove('pop'); void u.el.offsetWidth; u.el.classList.add('pop');
    update();
  }

  // 이동·확대
  let tx = 0, ty = 0, z = 1, drag = null;
  const apply = () => { layer.style.transform = `translate(${tx}px,${ty}px) scale(${z})`; };
  function center() {
    const r = vp.getBoundingClientRect(), root = nodes.find(n => n.root) || nodes[0];
    if (!r.width) return false;
    z = Math.min(1, r.width / ((maxX - minX) * UNIT + 40), r.height / ((maxY - minY) * UNIT + 40));
    z = Math.max(0.55, z);
    tx = r.width / 2 - px(root) * z; ty = r.height / 2 - py(root) * z;
    apply();
    return true;
  }
  vp.addEventListener('pointerdown', e => { if (e.target.closest('.tnode')) return; drag = { x: e.clientX - tx, y: e.clientY - ty }; vp.setPointerCapture(e.pointerId); vp.classList.add('drag'); });
  vp.addEventListener('pointermove', e => { if (drag) { tx = e.clientX - drag.x; ty = e.clientY - drag.y; apply(); } });
  vp.addEventListener('pointerup', () => { drag = null; vp.classList.remove('drag'); });
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const r = vp.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const nz = U.clamp(z * (e.deltaY < 0 ? 1.12 : 0.89), 0.4, 1.8);
    tx = mx - (mx - tx) * nz / z; ty = my - (my - ty) * nz / z; z = nz;
    apply();
  }, { passive: false });
  vp.addEventListener('click', () => { sel = null; update(); });

  const moneyEl = h('b'), avail = h('small');
  const el = h('div.tree', null,
    vp, info,
    h('div.tree-tools', null, G.T.el(wallet.tile, 'cur'), moneyEl, avail,
      h('button.btn.sm', { on: { click: center } }, '⌖')),
  );

  let centered = false;
  function update() {
    if (!centered) centered = center();
    const st = getSt(), coachId = G.Coach.treeNode(treeId);
    let n2buy = 0;
    for (const u of ui) {
      const n = u.n, lv = T.lv(st, n.id), vis = T.visible(treeId, st, n.id), open = T.open(treeId, st, n.id);
      const max = n.max || 1, maxed = lv >= max, can = T.canBuy(treeId, st, n.id);
      if (can) n2buy++;
      tog(u.el, 'hidden', !vis);
      tog(u.el, 'owned', lv > 0);
      tog(u.el, 'maxed', maxed);
      tog(u.el, 'can', can);
      tog(u.el, 'locked', !open);
      tog(u.el, 'sel', sel === n);
      tog(u.el, 'coach', coachId === n.id);
      tog(u.el, 'off', !!n.pair && lv > 0 && T.picked(st, n) !== n.id);
      tog(u.icon, 'q', !open);
      setText(u.lvEl, n.root ? '' : max > 1 ? `${lv}/${max}` : lv ? '✓' : '');
    }
    for (const e of edges) {
      const vis = T.visible(treeId, st, e.b.id) && T.visible(treeId, st, e.a.id);
      e.ln.style.display = vis ? '' : 'none';
      e.ln.setAttribute('class', T.lv(st, e.a.id) > 0 && T.lv(st, e.b.id) > 0 ? 'on' : T.open(treeId, st, e.b.id) ? 'open' : '');
    }
    setText(moneyEl, U.fmt(wallet.get()));
    setText(avail, n2buy ? ` · ✦${n2buy}` : '');
    tog(info, 'hidden', !sel);
    if (sel) {
      const n = sel, lv = T.lv(st, n.id), max = n.max || 1, open = T.open(treeId, st, n.id);
      setText(iName, n.n);
      setText(iLv, (n.root ? '' : max > 1 ? ` Lv ${lv} / ${max}` : lv ? ' 습득' : '') + (n.pair ? ' · ⇄ 택1' : ''));
      setText(iDesc, open ? n.d : `${n.d}\n🔒 ${(n.req || []).map(r => T.idx[treeId][r].n).join(n.reqAll ? ' + ' : ' / ')}`);
      const maxed = lv >= max;
      // 못 여는 노드: 거기까지 가는 총비용과 지금 가진 양 대비 %
      const reach = open ? 0 : T.reachCost(treeId, st, n.id);
      setText(iCostV, maxed ? 'MAX' : open ? U.fmt(T.cost(treeId, st, n.id)) : `총 ${U.fmt(reach)} (${Math.min(100, Math.floor(wallet.get() / reach * 100))}%)`);
      const sw = swappable(n);
      setText(buyBtn, sw ? '이걸로 바꾸기' : '배우기');
      buyBtn.disabled = !sw && !T.canBuy(treeId, st, n.id);
      tog(buyBtn, 'hidden', (maxed && !sw) || n.root);
      if (sw) setText(iCostV, '무료');
    }
    return n2buy;
  }
  return { el, update, center: () => { centered = center(); } };
};
