'use strict';
// 양피지 미니맵 (화면 쪽): 지도 시제품의 그리기(RUN.draw)로 탐사 상태를 그린다. 작게 볼 때는 지금 방 둘레, 누르거나 M으로 층 전체.
const PMAP = (() => {
  const { $ } = UI;
  let st = null;
  function draw() {
    const svg = $('pmap'), box = $('pmapbox'); if (!svg || !st) return;
    RUN.draw.render(svg, st);
    svg.dataset.full = svg.getAttribute('viewBox');
    if (box && !box.classList.contains('big')) zoom(svg);
  }
  function zoom(svg) {
    const [, , FW, FH] = svg.dataset.full.split(' ').map(Number), w = Math.min(FW, 26 * 13), h = Math.min(FH, w * 0.78);
    const b = st.map._lay.room[st.at], cx = 6 + (b.x + b.w / 2) * 13, cy = 6 + (b.y + b.h / 2) * 13;
    const x = Math.max(0, Math.min(FW - w, cx - w / 2)), y = Math.max(0, Math.min(FH - h, cy - h / 2));
    svg.setAttribute('viewBox', `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }
  function toggle(ev) {
    if (ev) ev.stopPropagation(); const box = $('pmapbox'), svg = $('pmap'); if (!box) return;
    box.classList.toggle('big'); if (box.classList.contains('big')) svg.setAttribute('viewBox', svg.dataset.full); else zoom(svg);
  }
  return {
    attach(s) { st = s; const box = $('pmapbox'); if (box) box.onclick = toggle; addEventListener('keydown', e => { if (e.key === 'm' || e.key === 'M') toggle(); }); draw(); },
    draw,
    hide() { const box = $('pmapbox'); if (box) box.style.display = 'none'; },
  };
})();
