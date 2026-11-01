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
  G.UI.init();

  if (away) G.UI.modal('돌아왔다', `<p><b>${G.U.fmtTime(away.sec)}</b></p><p>${G.T.html('ui_gold')} +${G.U.fmt(away.fantasy || 0)}</p><p class="dim">최대 ${G.U.fmtTime(G.offlineCap())}</p>`);
  // 첫 방문 안내는 글 대신 맵 위 화살표로 한다 (coach.js)

  // 개발용: ?dev&view=fantasy&ff=120&rich=1e6&signs=50&rival=lion&ttab=rival → 재화 지급, ff초 실제 진행, 해당 화면, 라이벌 조우, 마을 탭
  const q = new URLSearchParams(location.search);
  if (q.has('dev')) {
    if (q.get('rich')) for (const id in G.CUR) G.S.w[id][G.CUR[id]] += +q.get('rich');
    // &nodes=party,archer,cleric: 판타지 트리 노드를 1레벨씩 준다 (길드·선술집 확인용)
    if (q.get('nodes')) { const st = G.S.w.fantasy.tree; for (const n of q.get('nodes').split(',')) st[n] = 1; st._c = {}; G.Guild.refresh(G.S.w.fantasy); }
    // &hire=2: 선술집에서 가장 싼 후보부터 n명 고용
    for (let i = 0; i < +(q.get('hire') || 0); i++) { const T = G.Guild.tavern(G.S.w.fantasy); if (T.offers.length) G.Guild.hire(G.S.w.fantasy, T.offers.reduce((b, o, k) => (o.price < T.offers[b].price ? k : b), 0)); }
    // 개발용: 단장 만들기 건너뛰기 (?nocreate)
    if (q.has('nocreate')) { G.Guild.leader(G.S.w.fantasy); G.S.w.fantasy.leaderNew = false; }
    // &lv=10: 명단 전원 레벨 / &adv=1: 전원 첫 상위 직업으로 (상위 직업 확인용)
    if (q.get('lv')) for (const m of G.S.w.fantasy.mercs) m.lv = +q.get('lv');
    if (q.has('adv')) { const f = G.S.w.fantasy; for (const m of f.mercs) { m.lv = Math.max(m.lv, G.Guild.PROMO_LV); f.gold += G.Guild.promoCost(f, m); G.Guild.promote(f, m, G.Guild.advs(m.cls)[+q.get('adv') ? 1 : 0]); } }
    if (q.get('ff')) G.tick(+q.get('ff'), 0.1);
    document.getElementById('modal').classList.add('hidden');
    G.UI.show(q.get('view') || 'fantasy');
    // &rival=lion: 층을 새로 깔고 그 라이벌을 시작 방에 놓는다 (조우 선택지 확인용)
    const rv = G.D.RIVALS.find(d => d.id === q.get('rival'));
    if (rv) { const f = G.S.w.fantasy; G.Fantasy.goto(f, f.floor); G.Rivals.asked = {}; G.Rivals.spawn(f, G.Fantasy.rt(f), rv, 'start'); }
    // &season=2690: 시즌 시계를 그 초로 (시즌 끝 확인용)
    if (q.get('season')) G.Season.st(G.S.w.fantasy).t = +q.get('season');
    // &bigmap: 큰 지도를 펼쳐 둔다
    if (q.has('bigmap')) G.UI.bigMap = true;
    // &ttab=tavern: 마을 화면의 그 탭을 연다 (party roster tavern rival tree fame log)
    const tt = ['party', 'roster', 'tavern', 'gear', 'tree', 'guild', 'rival', 'log'].indexOf(q.get('ttab'));
    if (tt >= 0) setTimeout(() => document.querySelectorAll('.tw-tab')[tt]?.click(), 300);
  }

  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = (now - last) / 1000;
    last = now;
    // 탭이 잠들어 있던 긴 공백은 오프라인 진행으로 처리한다
    if (dt > 10) {
      const r = G.catchUp(dt);
      G.UI.toast(`${G.U.fmtTime(r.sec)} 진행 · 골드 +${G.U.fmt(r.fantasy || 0)}`);
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
