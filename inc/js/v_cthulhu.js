'use strict';
// 크툴루 화면: 바다 단면 지도가 화면 전체, 그 위에 HUD (판타지와 같은 구성 원리)
//  위 가운데: 이성 막대(바닥나면 광기) + 어획 배율, 아래 한 줄: 동전·줄 길이·한 번에 잡는 수·감는 속도·최고 깊이
//  왼쪽 위: 깊이·바다·단계·걸린 수, 자동 던지기 / 왼쪽 가운데: 이번 어획, 도감 단추
//  맵: 누르거나 끌면 바늘을 그쪽으로, 촉수를 누르면 퇴치, 배가 쉬고 있을 때 누르면 바로 던진다.
G.UI.views.cthulhu = function () {
  const c = () => G.S.w.cthulhu, C = G.Cthulhu, D = G.D.C, U = G.U;
  const PHASE = { idle: '수면', down: '내리는 중', up: '감는 중', land: '수면' };

  // ── 왼쪽 위
  const depthEl = h('b'), infoEl = h('small');
  const tAuto = G.UI.toggle('던지기', () => c().auto, v => { c().auto = v; }, '자동 던지기');
  const hud = h('div.fhud', null, h('div.floorrow', null, depthEl, infoEl), h('div.tgls', null, h('small.dim', null, '자동'), tAuto.el));

  // ── 위 가운데: 이성
  const san = G.UI.ov.bar('이성: 바닥나면 광기에 빠진다', '어획 배율: 이성이 낮을수록 커진다');
  const st = G.UI.ov.stats([['coin', 'c_coin', '동전'], ['line', 'item_line', '줄 길이'], ['catch', 'fs_cod', '한 번에 잡는 수'], ['reel', 'n_auto_build', '감는 속도'], ['best', 'sea_w3', '최고 깊이']]);
  const top = h('div.ftop', null, san.el, st.el);

  // ── 왼쪽 가운데: 이번 어획 + 도감
  const lastEl = h('div.catch-row');
  // 도감: 잡은 적 없는 어종은 검은 실루엣. 잡은 수 아래에 판매가 (그 구역 가장 얕은 곳 기준)
  const dexEl = h('div.dex'), dexCnt = h('small');
  const dex = D.fish.map(sp => {
    const ic = G.T.el(sp.t, 'md'), n = h('small'), pv = h('small.dxp');
    if (sp.tint) ic.style.filter = 'hue-rotate(180deg) saturate(1.6)';
    const el = h('div.dx', null, ic, n, pv);
    dexEl.append(el);
    return { sp, el, n, pv };
  });
  const group = [];
  const dexPop = G.UI.ov.pop([G.T.el('fs_eye', 'xs'), dexCnt], '도감', h('div.odex', null, dexEl), group);
  const left = h('div.fleft', null, h('div.ocol', null, h('div.ocatch', { 'data-tip': '이번 어획' }, lastEl), dexPop.el));

  const overlay = h('div.fover', null, hud, top, left);
  let lastKey = '';
  return G.UI.worldScreen('cthulhu', {
    overlay,
    click(p) { C.click(c(), p.x, p.y); return true; },
    drag(p) { C.steer(c(), p.x); },
    update() {
      const s = c(), rt = C.rt(s), d = Math.max(0, Math.round((rt.hook.y - C.SURF) * D.M_PER_TILE)), z = D.zones[C.zoneOf(rt.hook.y - C.SURF)] || D.zones[0];
      setText(depthEl, s.madT > 0 ? `광기 ${Math.ceil(s.madT)}초` : `${d}m`);
      setText(infoEl, ` · ${z.n} · ${PHASE[rt.phase]} · 🐟 ${rt.hooked.length}/${C.maxCatch()}`);
      tAuto.update();
      const ms = C.maxSan();
      san.set(s.san / ms, `${Math.floor(s.san)} / ${ms}`, `🐟 ×${C.sanMult(s).toFixed(2)}`, s.san / ms < 0.3);
      st.set('coin', U.fmt(s.coins));
      st.set('line', `${C.lineD() * D.M_PER_TILE}m`);
      st.set('catch', `×${C.maxCatch()}`);
      st.set('reel', `×${(C.reel() / 4.5).toFixed(2)}`);
      st.set('best', `${s.best}m`);
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
        const price = x.sp.sign ? '인장' : `🪙${U.fmt(C.dexPrice(s, x.sp))}`;
        setText(x.pv, n == null ? '' : price);
        x.el.title = n == null ? '???' : x.sp.sign ? `${x.sp.n} · 잡으면 인장 +1` : `${x.sp.n} · ${price}부터 (더 깊이, 이성이 낮을수록 비싸다)`;
      }
      setText(dexCnt, ` ${have}/${dex.length}`);
    },
  });
};
