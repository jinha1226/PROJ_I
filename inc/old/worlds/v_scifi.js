'use strict';
// SF 화면: 기지 지도가 화면 전체, 그 위에 HUD (판타지와 같은 구성 원리)
//  위 가운데: 코어 내구도 막대(무너지면 끝) + 남은 적, 아래 한 줄: 크레딧·최고 웨이브·궤도 폭격
//  왼쪽 위: WAVE, 웨이브 시작·자동 진행 / 왼쪽 가운데: 고른 포대 자리의 건설 메뉴, 적 정보 단추
//  지도에서 포대 자리를 누르면 그 자리를 고르고, 빈 곳을 누르면 궤도 폭격.
//  「옮기기」를 누른 뒤 다른 포대 자리를 누르면 포탑을 그리로 옮긴다 (있으면 서로 바꾼다).
G.UI.views.scifi = function () {
  const s = () => G.S.w.scifi, SF = G.Scifi, D = G.D.S, U = G.U;
  let sel = G.S.w.scifi.selPad || 0, moving = null;

  // ── 왼쪽 위
  const waveEl = h('b'), stateEl = h('small'), sectorEl = h('small.dim');
  const startBtn = h('button.fbtn', { 'data-tip': '웨이브 시작', on: { click: () => SF.startWave(s()) } }, '▶');
  const tAuto = G.UI.toggle('진행', () => s().auto, v => { s().auto = v; }, '자동 진행');
  const hud = h('div.fhud', null, h('div.floorrow', null, waveEl, stateEl), sectorEl, h('div.tgls', null, startBtn, h('small.dim', null, '자동'), tAuto.el));

  // ── 위 가운데: 코어
  const core = G.UI.ov.bar('코어 내구도: 0이 되면 기지가 무너진다', '남은 적');
  const st = G.UI.ov.stats([['cred', 's_credit', '크레딧'], ['best', 'e_boss', '최고 웨이브'], ['strike', 'a_thunder', '궤도 폭격 (빈 곳을 누르면)']]);
  const top = h('div.ftop', null, core.el, st.el);

  // ── 왼쪽 가운데: 고른 포대 자리의 건설 메뉴
  const padTitle = h('b'), padBody = h('div.padbody');
  let padKey = '';
  function renderPad() {
    const stt = s(), t = stt.towers[sel], key = `${sel}:${t}:${moving}:${SF.padCount()}:` + Object.keys(D.turrets).map(SF.unlocked).join();
    if (key === padKey) return;
    padKey = key;
    padBody.innerHTML = '';
    setText(padTitle, `포대 자리 ${sel + 1}`);
    if (sel >= SF.padCount()) { padBody.append(h('small.dim', null, '🔒 스킬트리 「포대 증설」')); return; }
    if (t) {
      const T = D.turrets[t];
      padBody.append(h('div.opp-row', null, G.T.el(T.t, 'md'), h('div', null, h('b', null, T.n), h('small', null, ` ${T.d}`))),
        moving === sel
          ? h('div', null, h('small', null, '옮길 포대 자리를 누르세요 '), h('button.btn.sm', { on: { click: () => { moving = null; padKey = ''; } } }, '취소'))
          : h('div', null,
            h('button.btn.sm', { on: { click: () => { moving = sel; padKey = ''; } } }, '옮기기'), ' ',
            h('button.btn.sm', { on: { click: () => { if (confirm(`${T.n}을 철거할까요? 환불은 없습니다.`)) { SF.scrap(stt, sel); padKey = ''; } } } }, '철거')));
      return;
    }
    for (const [k, T] of Object.entries(D.turrets)) {
      const un = SF.unlocked(k);
      const b = h('button.tbuild', { 'data-tip': un ? T.d : '🔒 스킬트리', on: { click: () => { if (SF.build(stt, sel, k)) padKey = ''; } } },
        G.T.el(T.t, 'sm'), h('b', null, T.n), h('small.c'));
      b.dataset.k = k;
      b.disabled = !un;
      padBody.append(b);
    }
  }
  const group = [];
  const best = G.UI.ov.pop(G.T.el('e_walker', 'xs'), '적 정보',
    h('div.bestiary', null, Object.entries(D.enemies).map(([k, e]) => h('div.be', null, G.T.el('e_' + k, 'sm'), `${e.n} · 체력 ×${e.hp} · 코어 피해 ${e.dmg}`))), group);
  const left = h('div.fleft', null, h('div.ocol', null, h('div.opad', null, padTitle, padBody), best.el));

  // 새 구역: 장소 이름이 크게 뜬다 (수선 경지 돌파와 같은 배너, 장소마다 색)
  const rfx = h('div.realmfx.hidden');
  let rfxT = 0;
  const TH_COL = ['#9fe0ff', '#ff8a5a', '#d8f0ff', '#7dffe8', '#9fe79f', '#c78bff'];
  G.on('sf_sector', e => {
    if (G.UI.cur !== 'scifi') return;
    const th = D.sectors[e.k % D.sectors.length].th || 0;
    rfx.className = 'realmfx lv3';
    rfx.style.setProperty('--rc', TH_COL[th]);
    rfx.innerHTML = '';
    rfx.append(h('div.rays'), h('div.rglow'), h('div.rtext', null, h('small', null, `구역 ${e.k + 1}`), h('b', null, SF.sectorName(e.k))));
    clearTimeout(rfxT);
    rfxT = setTimeout(() => rfx.classList.add('hidden'), 2800);
  });
  const overlay = h('div.fover', null, hud, top, left, rfx);
  return G.UI.worldScreen('scifi', {
    overlay,
    click(p) {
      const i = SF.padAt(s(), p.x, p.y);
      if (moving != null) {
        if (i >= 0 && SF.move(s(), moving, i)) sel = s().selPad = i;
        moving = null; padKey = '';
        return true;
      }
      if (i >= 0) { sel = s().selPad = i; padKey = ''; return true; }
      SF.strike(s(), p.x, p.y);
      return true;
    },
    update() {
      const stt = s(), rt = SF.rt(stt), cm = SF.coreMax();
      setText(waveEl, `WAVE ${stt.wave}`);
      setText(stateEl, rt.state === 'wave' ? ' · 교전' : ' · 대기');
      setText(sectorEl, `구역 ${rt.sector + 1} · ${SF.sectorName(rt.sector)}`);
      startBtn.disabled = rt.state === 'wave';
      tAuto.update();
      core.set(stt.core / cm, `${U.fmt(Math.max(0, stt.core))} / ${U.fmt(cm)}`, rt.state === 'wave' ? `👾 ${rt.queue.length + rt.en.length}` : '', stt.core / cm < 0.3);
      st.set('cred', U.fmt(stt.credits));
      st.set('best', stt.maxWave);
      const sc = rt.sc ?? 1, mx = SF.strikeMax();
      st.set('strike', sc > 0 ? (mx > 1 ? `✓×${sc}` : '✓') : `${rt.strikeCd.toFixed(1)}초`);
      renderPad();
      padBody.querySelectorAll('.tbuild').forEach(b => {
        const k = b.dataset.k, c = SF.buildCost(stt, k);
        setText(b.lastChild, U.fmt(c));
        b.disabled = !SF.unlocked(k) || stt.credits < c;
        tog(b, 'coach', !b.disabled && stt.selPad != null && !G.Coach.stage('scifi'));
      });
    },
  });
};
