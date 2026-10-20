'use strict';
// 시작: 저장 불러오기 → 오프라인 진행 → 화면 → 루프(로직 10Hz, 그리기 rAF, 저장 15초)
(function () {
  const loaded = G.load();
  if (!loaded) G.newState();
  let away = null;
  if (loaded) {
    const sec = (Date.now() - G.S.time) / 1000;
    if (sec > 30) away = G.catchUp(sec);
  }
  // 테스트 기간: 다섯 세계를 처음부터 모두 연다 (정식 진행으로 돌리려면 false)
  const TEST_OPEN_ALL = true;
  if (TEST_OPEN_ALL) for (const id in G.S.unlocked) { G.S.unlocked[id] = true; if (id !== 'fantasy') G.S.ntree['open_' + id] = 1; }
  G.UI.init();

  if (away) {
    G.UI.modal('돌아왔다', `<p>자리를 비운 <b>${G.U.fmtTime(away.sec)}</b> 동안 다섯 세계는 멈추지 않았다.</p>
      <p>${G.T.html('ui_ess')} 정수 +${G.U.fmt(away.ess)}<br>${G.T.html('ui_sign')} 인장 +${G.U.fmt(away.signs)}</p>
      <p class="dim">오프라인 진행 한도: ${G.U.fmtTime(G.offlineCap())} (넥서스 「시간의 모래」로 늘린다)</p>`);
  }
  // 첫 방문 안내는 글 대신 맵 위 화살표로 한다 (coach.js)

  // 개발용: ?dev&view=scifi&ff=120&rich=1e6&signs=50 → 모든 세계 해금, 재화 지급, ff초 실제 진행, 해당 화면
  const q = new URLSearchParams(location.search);
  if (q.has('dev')) {
    for (const id in G.S.unlocked) { G.S.unlocked[id] = true; if (id !== 'fantasy') G.S.ntree['open_' + id] = 1; }
    if (q.get('signs')) G.S.signs += +q.get('signs');
    if (q.get('rich')) for (const id in G.CUR) G.S.w[id][G.CUR[id]] += +q.get('rich');
    if (q.get('ff')) G.tick(+q.get('ff'), 0.1);
    document.getElementById('modal').classList.add('hidden');
    G.UI.show(q.get('view') || 'fantasy');
  }

  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = (now - last) / 1000;
    last = now;
    // 탭이 잠들어 있던 긴 공백은 오프라인 진행으로 처리한다
    if (dt > 10) {
      const r = G.catchUp(dt);
      G.UI.toast(`${G.U.fmtTime(r.sec)} 진행 · 정수 +${G.U.fmt(r.ess)}`);
    } else G.tick(dt);
    G.tickAt = performance.now();
    G.UI.update();
  }, 100);
  // 마지막 틱 뒤로 흐른 초: 빠르게 움직이는 것(vx·vy)을 그 사이에도 미끄러지게 그린다 (틱은 초당 10번뿐)
  G.tickLead = () => (G.tickAt ? Math.min(0.15, (performance.now() - G.tickAt) / 1000) : 0);

  const loop = t => { G.UI.frame(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);

  setInterval(G.save, 15000);
  window.addEventListener('beforeunload', G.save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });
})();
