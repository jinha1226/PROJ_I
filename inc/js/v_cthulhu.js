'use strict';
// 크툴루 화면: 바다 단면 지도가 화면 전체, 그 위에 HUD (판타지와 같은 구성 원리)
//  위 가운데: 이성 막대(바닥나면 휴식, 회복까지 초읽기) + 초당 이성 소모, 아래 한 줄: 동전·줄 길이·잡는 수·값 배율·이성 소모·내리기·감기·빛
//  왼쪽 위: 깊이·바다·단계·걸린 수, 자동 던지기 / 왼쪽 가운데: 이번 어획, 도감 단추
//  맵: 누르거나 끌면 바늘을 그쪽으로, 촉수를 누르면 퇴치, 배가 쉬고 있을 때 누르면 바로 던진다.
G.UI.views.cthulhu = function () {
  const c = () => G.S.w.cthulhu, C = G.Cthulhu, D = G.D.C, U = G.U;
  const tm = k => G.Tree.mul('cthulhu', c().tree, k), ta = k => G.Tree.add('cthulhu', c().tree, k);
  const PHASE = { idle: '수면', down: '내리는 중', up: '감는 중', land: '수면' };

  // ── 왼쪽 위
  const depthEl = h('b'), infoEl = h('small'), valEl = h('small.cval');
  const tAuto = G.UI.toggle('던지기', () => c().auto, v => { c().auto = v; }, '자동 던지기');
  const res = G.UI.ov.stats([['coin', 'c_coin', '동전'], ['line', 'item_line', '줄 길이'], ['catch', 'fs_cod', '한 번에 잡는 수'], ['lamp', 'x_lantern', '빛 반경']]);
  const hud = h('div.fhud', null, h('div.floorrow', null, depthEl, infoEl, valEl), res.el, h('div.tgls', null, h('small.dim', null, '자동'), tAuto.el));

  // ── 위 가운데: 이성
  // 오른쪽: 지금 깊이에서 초당 깎이는 이성 (판타지 오염 피해·무협 남은 햇수 자리)
  const san = G.UI.ov.bar('이성: 물속에서 깊이와 시간만큼 깎인다. 바닥나면 항구에서 쉰다', '지금 깊이의 초당 이성 소모');
  // 스킬트리 배율 (판타지 파티 배율·무협 숙련 배율처럼 ×n, 올리면 내역)
  const MULT = [['san', 'cu_mind', '최대 이성'], ['drain', 'c_horror', '이성 소모'], ['sink', 'sea_rock', '내리는 속도'], ['reel', 'n_auto_build', '감는 속도'],
    ['rare', 'fs_kraken', '희귀 어종'], ['net', 'fs_bone', '걸림 범위'], ['ess', 'ui_ess', '정수']];
  const st = G.UI.ov.stats(MULT), multName = Object.fromEntries(MULT.map(([k, , n]) => [k, n]));
  // ×n 표기와 내역 말풍선 (1이 아닌 것만): 「트리 ×1.20 · 유물 ×1.10」
  const x = v => `×${v < 10 ? v.toFixed(2) : U.fmt(v)}`;
  const parts = ps => ps.filter(p => Math.abs(p[1] - 1) > 1e-9).map(([n, v]) => `${n} ${x(v)}`).join(' · ') || '기본';
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
      setText(depthEl, s.madT > 0 ? `휴식 ${Math.ceil(s.madT)}초` : `${d}m`);
      setText(infoEl, ` · ${z.n} · ${PHASE[rt.phase]}`);
      tAuto.update();
      const ms = C.maxSan();
      // 휴식 중: 막대가 차오르며 회복까지 남은 초를 센다
      const hd = rt.hook.y - C.SURF, drainTxt = s.madT <= 0 && hd > 0 ? `-${C.drain(hd).toFixed(1)}/초` : '';
      if (s.madT > 0) san.set(1 - s.madT / C.restT(), `회복까지 ${Math.ceil(s.madT)}초`, '', true);
      else san.set(s.san / ms, `${Math.floor(s.san)} / ${ms}`, drainTxt, s.san / ms < 0.3);
      res.set('coin', U.fmt(s.coins));
      res.set('line', `${C.lineD() * D.M_PER_TILE}m`);
      res.set('catch', `${rt.hooked.length}/${C.maxCatch()}`);
      res.set('lamp', `${C.lampR()}칸`);
      // 물고기 값 배율 (왼쪽 위, 바다·단계 다음)
      setText(valEl, ` · 물고기 값 ${x(C.valueMult(s))}`);
      const vt = `물고기 값 — ${parts(C.valueParts(s))}`;
      if (valEl.dataset.tip !== vt) valEl.dataset.tip = vt;
      // 이성 아래: 스킬트리 배율
      const L = C.lineD(), dm = C.drain(L) / C.drainRaw(L), relic = 1 / (1 + G.relicVal('c_san'));
      const em = G.essMult() * (1 + ta('ess')), reelM = s.auto ? 1 + ta('autoReel') : 1;
      const set = (k, v, ps) => { st.set(k, x(v)); st.tip(k, `${multName[k]} — ${parts(ps)}`); };
      set('san', ms / 100, [['트리', ms / 100]]);
      set('drain', dm, [['트리', dm / relic], ['유물', relic]]);
      set('sink', tm('sink'), [['트리', tm('sink')]]);
      set('reel', reelM, [['자동 릴 (자동 던지기)', reelM]]);
      set('rare', 1 + ta('bait'), [['트리', 1 + ta('bait')]]);
      set('net', 1 + ta('net'), [['트리', 1 + ta('net')]]);
      set('ess', em, [['트리', 1 + ta('ess')], ['넥서스·유물', G.essMult()]]);
      const lk = s.last.join();
      if (lk !== lastKey) {
        lastKey = lk;
        lastEl.innerHTML = '';
        // 종류별로 묶어 마리 수만 (잡은 순서대로)
        const cnt = new Map();
        for (const id of s.last) cnt.set(id, (cnt.get(id) || 0) + 1);
        for (const [id, n] of cnt) {
          const sp = D.fish.find(f => f.id === id);
          lastEl.append(h('span.cg', { title: sp.n }, G.T.el(sp.t, 'md'), h('small', null, '×' + n)));
        }
      }
      let have = 0;
      for (const x of dex) {
        const n = s.dex[x.sp.id];
        tog(x.el, 'unknown', n == null);
        if (n != null) have++;
        setText(x.n, n == null ? '?' : U.fmt(n));
        const price = x.sp.sign ? '인장' : `🪙${U.fmt(C.dexPrice(s, x.sp))}`;
        setText(x.pv, n == null ? '' : price);
        x.el.title = n == null ? '???' : `${x.sp.n} · ${price}`;
      }
      setText(dexCnt, ` ${have}/${dex.length}`);
    },
  });
};
