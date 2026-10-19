'use strict';
// 메인 루프
(function () {
  const TPS = { 1: 6, 2: 18, 3: 45 }; // 배속별 초당 틱
  let last = performance.now(), acc = 0, autoAcc = 0, uiAcc = 0;

  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    const S = G.S, ui = G.UI.ui;
    if (S && S.mode === 'settle' && !ui.paused && !G.UI.modalOpen()) {
      acc += dt * TPS[ui.speed];
      let n = 0;
      while (acc >= 1 && n++ < 120) { G.Settle.tick(); acc -= 1; if (G.S.mode !== 'settle') break; }
    } else acc = 0;
    if (S && S.mode === 'dungeon' && S.dun && S.dun.auto && !G.UI.modalOpen()) {
      autoAcc += dt;
      let n = 0;
      while (autoAcc > 0.03 && n++ < 4) { autoAcc -= 0.03; if (!G.Dun.autoStep()) break; }
    } else autoAcc = 0;
    if (S && S.mode === 'settle') G.R.drawSettle(ui);
    else if (S && S.mode === 'dungeon' && S.dun) G.R.drawDungeon(ui);
    else G.R.drawTitle && G.R.drawTitle();
    uiAcc += dt;
    if (uiAcc > 0.2 || (S && S.mode === 'dungeon')) { uiAcc = 0; G.UI.refresh(); }
    requestAnimationFrame(frame);
  }

  window.addEventListener('load', () => {
    G.newState();
    G.R.init(document.getElementById('cv'));
    G.UI.init();
    window.addEventListener('resize', () => G.R.resize());
    requestAnimationFrame(frame);
  });
})();
