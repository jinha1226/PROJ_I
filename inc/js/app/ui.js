'use strict';
// 화면 도우미 (브라우저 전용): 요소 찾기 · 글자 이스케이프 · 쿼터뷰 위치에 띄우기 · 진행 글.
const UI = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // 쿼터뷰 좌표(x, y, 높이 z)에 화면 요소를 띄운다 (요소의 발밑 가운데가 그 자리)
  function place(el, x, y, z = 0) {
    const rc = canvas.getBoundingClientRect(), sb = $('stage').getBoundingClientRect(), a = project(wx(x), wy(y), z);
    el.style.transform = `translate(${Math.round(rc.left - sb.left + a.sx / W * rc.width)}px,${Math.round(rc.top - sb.top + a.sy / H * rc.height)}px) translate(-50%,-100%)`;
  }
  // 쿼터뷰 좌표 → 무대(#stage) 안 화면 좌표 [x, y]
  function toStage(x, y, z = 0) {
    const rc = canvas.getBoundingClientRect(), sb = $('stage').getBoundingClientRect(), a = project(wx(x), wy(y), z);
    return [rc.left - sb.left + a.sx / W * rc.width, rc.top - sb.top + a.sy / H * rc.height];
  }
  // 진행 글: 그 기록(log: [{ t }])에 새로 쌓인 줄만 화면 위 dm 줄에 잠깐
  const seen = new WeakMap();
  function say(log) {
    const from = seen.get(log) || 0, lines = log.slice(from); seen.set(log, log.length); if (!lines.length) return;
    const dm = $('dm'); if (!dm) return;
    dm.textContent = lines.map(l => l.t).join(' '); dm.classList.remove('hidden');
    clearTimeout(say.t); say.t = setTimeout(() => dm.classList.add('hidden'), 3800 + lines.length * 900);
  }
  return { $, esc, place, toStage, say };
})();
