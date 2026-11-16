'use strict';
// 탐사 시제품 화면: 출발(파티 고르기) → 지도 · 시트 · 파티 · 기록. 모바일은 세로, PC는 가로 (ROGUELIKE_PLAN 4-5 · 6-5)
(() => {
  const $ = s => document.querySelector(s), C = RUN.CLS;
  const qs = new URLSearchParams(location.search);
  let seed = +qs.get('seed') || (Date.now() % 100000), st = null, picks = [];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KIND = { open: '', locked: '잠긴 문', trap: '함정', dark: '어두운 길', hidden: '숨은 통로' };

  // ── 출발: 다섯 중 셋 ──
  function start() {
    $('#start').classList.remove('hidden'); $('#app').classList.add('dim');
    const box = $('#cands');
    box.innerHTML = RUN.CLS_ORDER.map(k => `<button class="cand${picks.includes(k) ? ' on' : ''}" data-k="${k}"><b>${C[k].n}</b><small>${C[k].sp} · 체력 ${C[k].hp}</small><span>${RUN.CLS_LINE[k]}</span></button>`).join('');
    box.querySelectorAll('.cand').forEach(b => b.onclick = () => { const k = b.dataset.k; picks = picks.includes(k) ? picks.filter(x => x !== k) : picks.length < 3 ? [...picks, k] : picks; start(); });
    $('#go').disabled = picks.length !== 3; $('#go').textContent = picks.length === 3 ? '탐사 시작' : `${picks.length}/3 고르기`;
    $('#seedv').textContent = seed;
  }
  $('#go').onclick = () => { if (picks.length !== 3) return; st = RUN.newRun(seed, picks);
    // ?reveal=1: 지도 전체를 보는 개발용 미리보기
    if (qs.has('reveal')) { for (const n of st.map.nodes) { n.info = 2; n.seenMap = true; } for (const e of st.map.edges) { e.seen.hidden = e.seen.lock = e.seen.trap = e.seen.dark = true; } st.revealAll = true; if (qs.get('reveal') === 'ink') { for (const n of st.map.nodes) n.visited = true; for (const e of st.map.edges) e.walked = true; } } $('#start').classList.add('hidden'); $('#app').classList.remove('dim'); draw({}); };
  $('#reseed').onclick = () => { seed = Math.floor(Math.random() * 100000); start(); };

  // ── 그리기 ──
  function draw(anim) {
    const svg = $('#map'), wrap = $('#mapwrap'), p = RUN.draw.render(svg, st, anim);
    // 윤곽에 따라 크기: 폭을 다 쓰되, 가로로 긴 지도는 너무 작아지지 않게(원래 크기의 75% 아래로는 줄이지 않고 옆으로 스크롤)
    const fit = wrap.clientWidth - 4, px = Math.max(fit, Math.min(p.W * 0.75, p.W)), sc = Math.min(px, p.W * 1.6);
    svg.style.width = `${sc}px`; svg.style.maxWidth = 'none';
    requestAnimationFrame(() => { wrap.scrollTo({ left: Math.max(0, p.fx * svg.clientWidth - wrap.clientWidth / 2), top: Math.max(0, p.fy * svg.clientHeight - wrap.clientHeight * 0.55), behavior: anim.moved != null ? 'smooth' : 'auto' }); });
    bar(); party(); log();
    if (st.scene) scene(); else if (!st.done) closeSheet();
    if (st.done) end();
  }
  function bar() {
    const it = Object.entries(st.items).filter(([, v]) => v > 0).map(([k, v]) => `${RUN.ITEMS[k].n} ${v}`).join(' · ');
    $('#info').innerHTML = `<b>1층</b> <span>금화 ${st.gold}</span><span class="it">${esc(it || '물품 없음')}</span>`;
    $('#mode').textContent = RUN.view.mode === 'dnd' ? '표기: D&D' : '표기: 숫자';
  }
  function party() {
    $('#party').innerHTML = st.party.map(m => {
      const c = C[m.cls], f = m.hp / m.max, sl = Object.entries(c.slots || {}).map(([lv, mx]) => `<i>${lv}레벨 ${'●'.repeat(m.sl[lv] || 0)}${'○'.repeat(mx - (m.sl[lv] || 0))}</i>`).join('');
      return `<div class="pc${m.dead ? ' dead' : ''}"><div class="nm"><b>${m.n}</b><small>${c.sp}${c.dv ? ' · 암시야' : ''}</small></div>
        <div class="hp"><span style="width:${Math.round(f * 100)}%" class="${f < 0.35 ? 'low' : ''}"></span></div><small class="hpn">${m.dead ? '쓰러짐' : `${m.hp}/${m.max}`}</small>${sl ? `<div class="sl">${sl}</div>` : ''}</div>`;
    }).join('');
  }
  function log() {
    const rows = st.log.slice(-60).reverse();
    $('#log').innerHTML = rows.map((l, i) => `<p class="${l.k}${i === 0 ? ' last' : ''}">${esc(l.t)}</p>`).join('');
  }

  // ── 시트: 행동 버튼 ──
  const btn = (a, i) => {
    const chance = a.check ? RUN.fmtCheck(a.check, a.p) : '';
    const off = a.off && a.off();
    return `<button class="act${off ? ' off' : ''}" data-i="${i}"><span class="k">${i + 1}</span><span class="l">${esc(a.label || a.n)}${a.who ? `<small>${esc(a.who)}</small>` : ''}</span><span class="r">${esc(chance)}${a.cost ? `<em>${esc(a.cost)}</em>` : ''}</span>${a.note || a.sub ? `<span class="nt">${esc(a.note || a.sub)}</span>` : ''}</button>`;
  };
  let sheetActs = [], sheetMode = null;
  function openSheet(html, acts, mode) {
    sheetActs = acts; sheetMode = mode;
    $('#sheet').innerHTML = html; $('#sheet').classList.remove('hidden');
    $('#sheet').querySelectorAll('.act').forEach(b => b.onclick = () => fire(+b.dataset.i));
    const x = $('#sheet .x'); if (x) x.onclick = closeSheet;
  }
  function closeSheet() { $('#sheet').classList.add('hidden'); sheetActs = []; sheetMode = null; }
  function fire(i) {
    const a = sheetActs[i]; if (!a || (a.off && a.off())) return;
    if (sheetMode === 'scene') { const before = st.at; RUN.choose(st, i); draw({ arrived: before }); return; }
    const r = RUN.doAct(st, a) || {};
    draw(r.moved != null ? { moved: r.moved, arrived: st.at } : {});
    if (!st.scene && !st.done && r.moved == null && sheetMode) reopen();
  }
  let lastTarget = null;
  function reopen() { if (sheetMode === 'room') roomSheet(); else if (lastTarget != null) target(lastTarget); }

  function known(n) {
    const lines = n.notes.map(x => `<span class="${x.ink}">${esc(x.t)}</span>`).join(' · ');
    return lines || '<span class="pencil">아무것도 모른다</span>';
  }
  function target(id) {
    const nx = RUN.nexts(st).find(x => x.n.id === id); if (!nx) return;
    lastTarget = id; const { e, n } = nx;
    const info = RUN.infoActs(st, e), move = RUN.moveActs(st, e), acts = [...info, ...move];
    const kind = e.kind === 'locked' ? (e.opened ? '열린 문' : '잠긴 문') : e.kind === 'trap' ? (e.seen.trap ? '함정 (찾음)' : '') : e.kind === 'dark' ? '어두운 길' : e.kind === 'hidden' ? '숨은 통로' : '';
    const size = n.info >= 2 ? `<small class="tip">${n.size === 'large' ? '넓은 방 — 5×5 판' : '좁은 방 — 3×3 판, 원거리 불리'}</small>` : '';
    openSheet(`<div class="hd"><h3>${n.info >= 3 ? RUN.TYPE[n.type] : '다음 방'}${kind ? ` <em>${kind}</em>` : ''}</h3><button class="x" aria-label="닫기">×</button></div>
      <p class="kn">${known(n)}</p>${size}
      ${info.length ? `<h4>알아보기</h4>${info.map((a, i) => btn(a, i)).join('')}` : ''}
      <h4>가기</h4>${move.length ? move.map((a, i) => btn(a, i + info.length)).join('') : '<p class="none">이 길로는 더 갈 방법이 없다.</p>'}`, acts, 'target');
  }
  function roomSheet() {
    const n = st.map.nodes[st.at], acts = [...RUN.roomActs(st)];
    if (st.items.potion && RUN.alive(st).some(m => m.hp < m.max)) acts.push({ label: '치유 물약을 마신다', who: '가장 다친 사람', cost: '물약 1', run: () => RUN.usePotion(st) });
    openSheet(`<div class="hd"><h3>지금 방 — ${RUN.TYPE[n.type]}</h3><button class="x" aria-label="닫기">×</button></div><p class="kn">${known(n)}</p>
      ${acts.length ? acts.map(btn).join('') : '<p class="none">여기서 더 할 일은 없다. 다음 방을 고르자.</p>'}`, acts, 'room');
  }
  function scene() {
    const s = st.scene;
    const acts = s.choices.map(c => ({ ...c, label: c.n }));
    openSheet(`<div class="hd"><h3>${esc(s.title)}</h3></div><p class="dm">${esc(s.text)}</p>${acts.map(btn).join('')}`, acts, 'scene');
  }
  function end() {
    const win = st.done === 'win', lost = st.party.filter(m => m.dead).map(m => m.n);
    openSheet(`<div class="hd"><h3>${win ? '1층 지도 완성' : '탐사대 전멸'}</h3></div>
      <p class="dm">${win ? `${RUN.alive(st).map(m => m.n).join(' · ')}가 살아 돌아왔다.${lost.length ? ` ${lost.join(' · ')}는 돌아오지 못했다.` : ''}` : '지도는 찢긴 채 남았다. 다음 탐사대가 이어 그릴 것이다.'}</p>
      <p class="kn">금화 ${st.gold} · 지나온 방 ${st.path.length} · 시드 ${st.seed}</p>
      <button class="act" id="again"><span class="l">새 탐사</span></button><button class="act" id="same"><span class="l">같은 지도로 다시</span></button>`, [], 'end');
    $('#again').onclick = () => { seed = Math.floor(Math.random() * 100000); picks = []; start(); closeSheet(); };
    $('#same').onclick = () => { start(); closeSheet(); };
  }

  // ── 입력 ──
  $('#map').addEventListener('click', ev => {
    if (!st || st.scene || st.done) return;
    const g = ev.target.closest('.room'); if (!g) return;
    const id = +g.dataset.id;
    if (id === st.at) roomSheet(); else if (g.classList.contains('next')) target(id);
    else { const n = st.map.nodes[id]; openSheet(`<div class="hd"><h3>${n.visited ? RUN.TYPE[n.type] : '본 방'}</h3><button class="x" aria-label="닫기">×</button></div><p class="kn">${known(n)}</p><p class="none">${n.visited ? '이미 지나온 방이다.' : '지금은 갈 수 없다.'}</p>`, [], 'look'); }
  });
  $('#mode').onclick = () => { RUN.view.mode = RUN.view.mode === 'dnd' ? 'num' : 'dnd'; if (st) { draw({}); if (sheetMode && sheetMode !== 'scene') reopen(); } };
  $('#logt').onclick = () => document.body.classList.toggle('logopen');
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && sheetMode !== 'scene') closeSheet();
    const k = +ev.key; if (k >= 1 && k <= 9 && sheetActs[k - 1]) fire(k - 1);
    if (ev.key === 'r' && st && !st.scene && !st.done) roomSheet();
  });
  start();
})();
