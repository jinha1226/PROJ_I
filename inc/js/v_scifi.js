'use strict';
// SF 화면: 기지 지도 + 옆 패널(웨이브·코어, 선택한 포대 자리의 건설 메뉴, 적 정보)
// 지도에서 포대 자리를 누르면 건설 메뉴, 빈 곳을 누르면 궤도 폭격.
G.UI.views.scifi = function () {
  const s = () => G.S.w.scifi, SF = G.Scifi, D = G.D.S, U = G.U;
  let sel = G.S.w.scifi.selPad || 0;

  const hudWave = h('b'), hudCd = h('small');
  const hud = h('div', null, hudWave, hudCd);

  const waveEl = h('b'), bestEl = h('small'), stateEl = h('small');
  const core = G.UI.meter('코어 내구도');
  const startBtn = h('button.btn', { on: { click: () => SF.startWave(s()) } }, '웨이브 시작');
  const tAuto = G.UI.toggle('자동 진행', () => s().auto, v => { s().auto = v; });
  const credEl = h('b');
  const padTitle = h('b'), padBody = h('div.padbody');
  let padKey = '';
  function renderPad() {
    const st = s(), t = st.towers[sel], key = `${sel}:${t}:${SF.padCount()}:` + Object.keys(D.turrets).map(SF.unlocked).join();
    if (key === padKey) return;
    padKey = key;
    padBody.innerHTML = '';
    setText(padTitle, `포대 자리 ${sel + 1}`);
    if (sel >= SF.padCount()) { padBody.append(h('small.dim', null, '🔒 스킬트리 「포대 증설」')); return; }
    if (t) {
      const T = D.turrets[t];
      padBody.append(h('div.opp-row', null, G.T.el(T.t, 'lg'), h('div', null, h('b', null, T.n), h('small', null, ` ${T.d}`))),
        h('button.btn.sm', { on: { click: () => { if (confirm(`${T.n}을 철거할까요? 환불은 없습니다.`)) { SF.scrap(st, sel); padKey = ''; } } } }, '철거'));
      return;
    }
    for (const [k, T] of Object.entries(D.turrets)) {
      const un = SF.unlocked(k);
      const b = h('button.tbuild', { on: { click: () => { if (SF.build(st, sel, k)) padKey = ''; } } },
        G.T.el(T.t, 'md'), h('div', null, h('b', null, T.n), h('small', null, un ? ` ${T.d}` : ' 🔒')), h('small.c'));
      b.dataset.k = k;
      b.disabled = !un;
      padBody.append(b);
    }
  }
  const side = h('div', null,
    h('div.card', null, h('div.card-h', null, h('b', null, 'WAVE '), waveEl, bestEl, h('span.sp'), stateEl), core.el,
      h('div.tgls', null, startBtn, tAuto.el)),
    h('div.card', null, h('div.card-h', null, G.T.el('s_credit', 'cur'), credEl, h('small', null, ' 크레딧'))),
    h('div.card', null, h('div.card-h', null, padTitle), padBody),
    h('div.card.bestiary', null, h('b', null, '적 정보'),
      Object.entries(D.enemies).map(([k, e]) => h('div.be', null, G.T.el('e_' + k, 'sm'), `${e.n} · 체력 ×${e.hp} · 코어 피해 ${e.dmg}`))));

  return G.UI.worldScreen('scifi', {
    side, hud,
    click(p) {
      const i = SF.padAt(s(), p.x, p.y);
      if (i >= 0) { sel = s().selPad = i; padKey = ''; return true; }
      SF.strike(s(), p.x, p.y);
      return true;
    },
    update() {
      const st = s(), rt = SF.rt(st);
      setText(hudWave, `WAVE ${st.wave}`);
      setText(hudCd, rt.strikeCd > 0 ? ` · 폭격 ${rt.strikeCd.toFixed(1)}초` : ' · 폭격 ✓');
      setText(waveEl, st.wave);
      setText(bestEl, ` 최고 ${st.maxWave}`);
      setText(stateEl, rt.state === 'wave' ? `교전 · 남은 적 ${rt.queue.length + rt.en.length}` : '대기');
      startBtn.disabled = rt.state === 'wave';
      tAuto.update();
      const cm = SF.coreMax();
      core.set(st.core / cm, `${U.fmt(Math.max(0, st.core))} / ${U.fmt(cm)}`);
      setText(credEl, U.fmt(st.credits));
      renderPad();
      padBody.querySelectorAll('.tbuild').forEach(b => {
        const k = b.dataset.k, c = SF.buildCost(st, k);
        setText(b.lastChild, U.fmt(c));
        b.disabled = !SF.unlocked(k) || st.credits < c;
        tog(b, 'coach', !b.disabled && st.selPad != null && !G.Coach.stage('scifi'));
      });
    },
  });
};
