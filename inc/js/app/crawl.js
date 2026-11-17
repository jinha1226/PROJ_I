'use strict';
// 탐사 진행 (3단계): 지도 시제품의 탐사 규칙(RUN — js/explore)으로 한 층을 돌고, 쿼터뷰에서 출구를 골라 걸어간다.
// - 층: RUN.gen.make의 키운 던전(방 칸 · 복도 칸)을 쿼터뷰 타일로 2배 키워 옮긴다. 길은 양방향 — 되돌아갈 수 있다.
// - 출구: 지금 방에 닿은 길마다 표지. 누르면 그 출구까지 걸어가 안내 표지(길 종류 · 너머의 방 · 선택지)를 띄운다.
// - 이미 들어가 본 방으로 가면 도착 처리를 다시 하지 않는다 (보물 · 사건 · 야영은 한 번).
// - 전투는 아직 시제품의 임시 자동 전투(RUN.combat) 결과만 보인다 — 구역 전투는 4단계.
// - 미니맵: 시제품의 양피지 지도(RUN.draw)를 귀퉁이에. 누르면 크게.
const CRAWL = (() => {
  const K = 2; // 지도 1칸 = 쿼터뷰 타일 2×2
  const KIND = { open: '길', locked: '잠긴 문', trap: '함정 복도', dark: '어두운 길', hidden: '숨은 통로' };
  const ICON = { open: '›', locked: '🔒', trap: '⚠', dark: '●', hidden: '⋯' };
  let st = null, iso = null, R = null, walk = null, marks = [], logN = 0, busy = false;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tile = ([x, y]) => [x * K + 0.5, y * K + 0.5];
  // 방 가운데에 가장 가까운 방 칸 (둥근 방 · 십자 방도 바닥 위에 서게)
  const centerOf = id => { const b = st.map._lay.room[id], mx = b.x + b.w / 2 - 0.5, my = b.y + b.h / 2 - 0.5; let best = b.cells[0], bd = 1e9; for (const c of b.cells) { const d = (c[0] - mx) ** 2 + (c[1] - my) ** 2; if (d < bd) { bd = d; best = c; } } return tile(best); };

  function toIso(m) {
    const L = m._lay, W = L.COLS * K, H = L.ROWS * K, c = new Array(W * H).fill('#'), ix = (x, y) => y * W + x;
    const put = ([x, y]) => { for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) c[ix(x * K + i, y * K + j)] = '.'; };
    for (const id in L.room) L.room[id].cells.forEach(put);
    for (const id in L.cor) L.cor[id].cells.forEach(put);
    const rooms = m.nodes.map(n => { const b = L.room[n.id], [cx, cy] = centerOf(n.id); return { id: n.id, title: RUN.TYPE[n.type] || '', x: b.x * K, y: b.y * K, w: b.w * K, h: b.h * K, cx: Math.floor(cx), cy: Math.floor(cy), tags: ['hall'] }; });
    const start = rooms[0], end = rooms.find(r => m.nodes[r.id].type === 'boss') || rooms[rooms.length - 1];
    return { w: W, h: H, c, kindAt: new Uint8Array(W * H), poi: {}, passChars: '.>,', ver: 1, dist: {}, rooms, start, end, fixed: true, title: '심연 1층' };
  }

  // 지금 방의 출구: 닿은 길 전부 (숨은 통로는 찾았을 때만). 거꾸로 가는 길은 a · b를 뒤집어 규칙에 넘긴다 (쓰기는 원래 길에)
  function exits() {
    const m = st.map, out = [];
    for (const e of m.edges) {
      if (e.a !== st.at && e.b !== st.at) continue;
      if (e.kind === 'hidden' && !e.seen.hidden) continue;
      const fwd = e.a === st.at, c = m._lay.cor[e.id];
      const ed = fwd ? e : new Proxy(e, { get: (t, k) => (k === 'a' ? t.b : k === 'b' ? t.a : t[k]) });
      out.push({ e, ed, to: fwd ? e.b : e.a, door: tile(fwd ? c.doorA : c.doorB), path: (fwd ? c.cells : c.cells.slice().reverse()).map(tile) });
    }
    return out;
  }
  const kindOf = e => (e.kind === 'trap' && !e.seen.trap ? 'open' : e.kind);
  const beyond = n => (n.visited ? (RUN.TYPE[n.type] || '방') + ' (가 봄)' : n.info >= 2 ? (n.hostile ? `적 ${n.g ? n.g.label : '있음'}` : RUN.TYPE[n.type] || '조용함') : n.info >= 1 ? (n.hostile ? '기척이 있다' : '조용하다') : '모르는 방');

  // ── 걷기: 점 목록을 따라 파티가 간다 ──
  function go(pts, then) { walk = { pts, i: 0, then }; }
  function frame(dt) {
    if (!walk || !R) return;
    const lead = R.party.find(p => !p.dead) || R.party[0], P = walk.pts[walk.i], v = 6 * dt;
    const dx = P[0] - lead.x, dy = P[1] - lead.y, d = Math.hypot(dx, dy);
    if (d <= v) { lead.x = P[0]; lead.y = P[1]; walk.i++; } else { lead.x += dx / d * v; lead.y += dy / d * v; }
    R.party.forEach((p, i) => { if (p === lead) return; const k = 1 - Math.exp(-dt * 6), tx = lead.x - 0.45 * i, ty = lead.y + 0.35 * (i % 2 ? 1 : -1); p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; });
    if (walk.i >= walk.pts.length) { const t = walk.then; walk = null; if (t) t(); }
  }

  // ── 표지 · 안내 표지 · 장면 ──
  function clearMarks() { for (const m of marks) m.el.remove(); marks = []; }
  function showMarks() {
    clearMarks(); if (st.done) return;
    for (const ex of exits()) {
      const n = st.map.nodes[ex.to], k = kindOf(ex.e), el = document.createElement('button');
      el.className = 'exitmark' + (n.visited ? ' seen' : ''); el.innerHTML = `<b>${ICON[k] || '›'}</b><small>${esc(KIND[k] || '길')}</small>`;
      el.onclick = () => pick(ex); $('floats').append(el); marks.push({ el, x: ex.door[0], y: ex.door[1] });
    }
  }
  function place(el, x, y, z) { const rc = canvas.getBoundingClientRect(), sb = $('stage').getBoundingClientRect(), a = project(wx(x), wy(y), z); el.style.transform = `translate(${Math.round(rc.left - sb.left + a.sx / W * rc.width)}px,${Math.round(rc.top - sb.top + a.sy / H * rc.height)}px) translate(-50%,-100%)`; }
  function pick(ex) {
    if (busy || walk) return; busy = true; clearMarks(); closeSign();
    go([ex.door], () => { busy = false; sign(ex); });
  }
  function closeSign() { const s = $('exitsign'); if (s) s.remove(); }
  function sign(ex) {
    closeSign();
    const n = st.map.nodes[ex.to], k = kindOf(ex.e), acts = n.visited ? [{ label: '간다', run: null }] : RUN.moveActs(st, ex.ed);
    const box = document.createElement('div'); box.id = 'exitsign';
    box.innerHTML = `<h4>${esc(KIND[k] || '길')}</h4><p>너머: ${esc(beyond(n))}</p>` +
      acts.map((a, i) => `<button data-i="${i}">${esc(a.label)}${a.p != null && a.p < 1 ? ` <i>${Math.round(a.p * 100)}%</i>` : ''}${a.cost ? ` <small>${esc(a.cost)}</small>` : ''}${a.who ? ` <small>${esc(a.who)}</small>` : ''}</button>`).join('') +
      '<button data-i="x" class="x">돌아선다</button>';
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.i === 'x') { closeSign(); showMarks(); return; } choose(ex, acts[+b.dataset.i]); };
    $('stage').append(box);
  }
  function choose(ex, a) {
    closeSign(); const from = st.at;
    if (!a.run) { st.at = ex.to; st.path.push(ex.to); st.here = {}; } // 가 본 방: 이동만
    else a.run();
    if (st.at === from) { say(); sign(ex); return; } // 자물쇠를 못 땄다 등: 그 자리에서 다시
    busy = true;
    go([...ex.path, centerOf(ex.to)], () => { busy = false; arrived(); });
  }
  function say() {
    const lines = st.log.slice(logN); logN = st.log.length; if (!lines.length) return;
    const dm = $('dm'); dm.textContent = lines.map(l => l.t).join(' '); dm.classList.remove('hidden'); clearTimeout(say.t); say.t = setTimeout(() => dm.classList.add('hidden'), 3800 + lines.length * 900);
  }
  function arrived() {
    document.body.dataset.room = st.at; document.body.dataset.moves = (+(document.body.dataset.moves || 0) + 1);
    if (st.combat) { const c = st.combat; st.log.push({ t: `전투 ${c.rounds.length}라운드 — ${c.win ? '이겼다' : '졌다'}.` }); st.combat = null; }
    say(); drawMap();
    if (st.scene) return scene();
    if (st.done) return end();
    showMarks();
  }
  function scene() {
    const s = st.scene, box = document.createElement('div'); box.id = 'crawlscene';
    box.innerHTML = `<h3>${esc(s.title)}</h3><p>${esc(s.text || '')}</p>` + s.choices.map((c, i) => `<button data-i="${i}"${c.off && c.off() ? ' disabled' : ''}>${esc(c.n)}${c.p != null && c.p < 1 ? ` <i>${Math.round(c.p * 100)}%</i>` : ''}${c.who ? ` <small>${esc(c.who)}</small>` : ''}</button>`).join('');
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b || b.disabled) return; box.remove(); RUN.choose(st, +b.dataset.i); arrived(); };
    $('stage').append(box);
  }
  function end() { const d = document.createElement('div'); d.className = 'record-stub'; d.textContent = st.done === 'win' ? '층을 지도에 올렸다 — 층 끝 화면은 7단계' : '탐사대가 쓰러졌다 — 층 끝 화면은 7단계'; $('stage').append(d); }

  // ── 양피지 미니맵 ──
  // 작게 볼 때는 지금 방 둘레만 (지도 칸 26 × 20 남짓), 누르면 층 전체
  function drawMap() {
    const svg = $('pmap'), box = $('pmapbox'); if (!svg || !st) return;
    RUN.draw.render(svg, st);
    const full = svg.getAttribute('viewBox'); svg.dataset.full = full;
    if (box && !box.classList.contains('big')) zoom(svg);
  }
  function zoom(svg) {
    const [, , FW, FH] = svg.dataset.full.split(' ').map(Number), w = Math.min(FW, 26 * 13), h = Math.min(FH, w * 0.78);
    const b = st.map._lay.room[st.at], cx = 6 + (b.x + b.w / 2) * 13, cy = 6 + (b.y + b.h / 2) * 13;
    const x = Math.max(0, Math.min(FW - w, cx - w / 2)), y = Math.max(0, Math.min(FH - h, cy - h / 2));
    svg.setAttribute('viewBox', `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }
  function toggleMap() { const box = $('pmapbox'), svg = $('pmap'); if (!box) return; box.classList.toggle('big'); if (box.classList.contains('big')) svg.setAttribute('viewBox', svg.dataset.full); else zoom(svg); }

  return {
    // 층을 만들고 쿼터뷰 지도를 돌려준다
    start(seed) { st = RUN.newRun(seed, ['fighter', 'wizard', 'cleric']); logN = 0; iso = toIso(st.map); return iso; },
    // 세계가 서면 (파티 개체) 표지를 띄운다
    attach(r) {
      R = r; const [x, y] = centerOf(st.at); r.party.forEach((p, i) => { p.x = x - 0.45 * i; p.y = y + 0.35 * (i % 2 ? 1 : -1); p._dx = p._rx = p.x; p._dy = p._ry = p.y; });
      const box = $('pmapbox'); if (box) box.onclick = toggleMap;
      addEventListener('keydown', e => { if (e.key === 'm' || e.key === 'M') toggleMap(); });
      drawMap(); say(); showMarks();
      // 시험용 ?auto=N: 첫 출구 · 첫 선택지 · 첫 장면 선택을 N번 저절로 누른다 (연기 시험 · 캡처용)
      let n = +q.get('auto') || 0;
      if (n) { const tick = () => { if (n <= 0 || st.done) return; const b = document.querySelector('#crawlscene button:not([disabled])') || document.querySelector('#exitsign button[data-i="0"]') || (!walk && !busy && marks[0] && marks[0].el); if (b) { if (b.classList.contains('exitmark')) n--; b.click(); } setTimeout(tick, 400); }; setTimeout(tick, 400); }
      document.body.dataset.room = st.at;
    },
    frame(dt) { frame(dt); for (const m of marks) place(m.el, m.x, m.y, 2.2); },
    get st() { return st; },
  };
})();
