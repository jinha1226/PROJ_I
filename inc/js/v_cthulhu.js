'use strict';
// 크툴루 화면: 바다 단면 지도 + 옆 패널(동전·이성, 줄·바늘·릴, 이번 어획, 도감)
// 맵: 누르거나 끌면 바늘을 그쪽으로, 촉수를 누르면 퇴치, 배가 쉬고 있을 때 누르면 바로 던진다.
G.UI.views.cthulhu = function () {
  const c = () => G.S.w.cthulhu, C = G.Cthulhu, D = G.D.C, U = G.U;
  const PHASE = { idle: '수면', down: '내리는 중', up: '감는 중', land: '수면' };

  const hudDepth = h('b'), hudInfo = h('small');
  const hud = h('div', null, hudDepth, hudInfo);

  const coinEl = h('b'), san = G.UI.meter('이성'), multEl = h('b');
  const tAuto = G.UI.toggle('자동 던지기', () => c().auto, v => { c().auto = v; });
  const lineEl = h('b'), catchEl = h('b'), reelEl = h('b'), bestEl = h('b');
  const lastEl = h('div.catch-row');
  const dexEl = h('div.dex'), dexCnt = h('small');
  // 도감: 잡은 적 없는 어종은 검은 실루엣
  const dex = D.fish.map(sp => {
    const ic = G.T.el(sp.t, 'md'), n = h('small');
    if (sp.tint) ic.style.filter = 'hue-rotate(180deg) saturate(1.6)';
    const el = h('div.dx', { title: sp.n }, ic, n);
    dexEl.append(el);
    return { sp, el, n };
  });

  const side = h('div', null,
    h('div.card', null, h('div.card-h', null, G.T.el('c_coin', 'cur'), coinEl, h('span.sp'), tAuto.el), san.el,
      h('div.kv', { title: '이성이 낮을수록 커진다' }, h('span', null, G.T.el('fs_cod', 'xs'), ' 어획'), multEl)),
    h('div.card', null, h('div.istats', null,
      h('div.istat', { title: '줄 길이' }, G.T.el('item_line', 'xs'), lineEl),
      h('div.istat', { title: '한 번에 잡는 수' }, G.T.el('fs_cod', 'xs'), catchEl),
      h('div.istat', { title: '감는 속도' }, G.T.el('n_auto_build', 'xs'), reelEl),
      h('div.istat', { title: '최고 깊이' }, G.T.el('sea_w3', 'xs'), bestEl))),
    h('div.card', null, h('div.card-h', null, h('b', null, '이번 어획')), lastEl),
    h('div.card', null, h('div.card-h', null, h('b', null, '도감'), dexCnt), dexEl));

  let lastKey = '';
  return G.UI.worldScreen('cthulhu', {
    side, hud,
    click(p) { C.click(c(), p.x, p.y); return true; },
    drag(p) { C.steer(c(), p.x); },
    update() {
      const s = c(), rt = C.rt(s), d = Math.max(0, Math.round((rt.hook.y - C.SURF) * D.M_PER_TILE)), z = D.zones[C.zoneOf(rt.hook.y - C.SURF)] || D.zones[0];
      setText(hudDepth, s.madT > 0 ? `광기 ${Math.ceil(s.madT)}초` : `${d}m`);
      setText(hudInfo, ` · ${z.n} · ${PHASE[rt.phase]} · 🐟 ${rt.hooked.length}/${C.maxCatch()}`);
      setText(coinEl, U.fmt(s.coins));
      const ms = C.maxSan();
      san.set(s.san / ms, `${Math.floor(s.san)} / ${ms}`);
      tog(san.bar, 'low', s.san / ms < 0.3);
      setText(multEl, `×${C.sanMult(s).toFixed(2)}`);
      tAuto.update();
      setText(lineEl, `${C.lineD() * D.M_PER_TILE}m`);
      setText(catchEl, `×${C.maxCatch()}`);
      setText(reelEl, `×${(C.reel() / 4.5).toFixed(2)}`);
      setText(bestEl, `${s.best}m`);
      const lk = s.last.join();
      if (lk !== lastKey) {
        lastKey = lk;
        lastEl.innerHTML = '';
        for (const id of s.last) { const sp = D.fish.find(f => f.id === id); lastEl.append(G.T.el(sp.t, 'md')); }
      }
      let have = 0;
      for (const x of dex) {
        const n = s.dex[x.sp.id];
        tog(x.el, 'unknown', n == null);
        if (n != null) have++;
        setText(x.n, n == null ? '?' : U.fmt(n));
        x.el.title = n == null ? '???' : x.sp.n;
      }
      setText(dexCnt, ` ${have} / ${dex.length}`);
    },
  });
};
