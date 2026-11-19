'use strict';
// 선술집 화면 (화면 쪽). 규칙 · 상태창에 적을 값은 js/game/tavern.js — 여기는 장면 그리기 · 창 · 저장 · 떠나기뿐.
// TAVERNUI.open(f, rumor): 선술집 안에 오늘 밤의 모험가들이 서 있다 (게임 안과 같은 32px 픽셀 인형 — MD.pix).
//   인물을 누르면 상태창(능력치 · 기본 공격 · 기술마다 효과 한 줄)이 열리고, 거기서 데려가거나 뺀다. 자리 수만큼 골라 「출발」.
// 떠나면 고른 사람들을 이 탭에 적어 두고 화면을 다시 연다 — boot.js가 TAVERNUI.takeParty()로 읽어 그 파티로 층을 세운다.
const TAVERNUI = (() => {
  const { $, esc } = UI, KEY = 'inc.tavern', GO = 'inc.go';
  const get = (S, k) => { try { return S.getItem(k); } catch (e) { return null; } }, put = (S, k, v) => { try { S.setItem(k, v); } catch (e) { /* 저장 못 해도 판은 돈다 */ } };
  const load = () => G.Tavern.load(get(localStorage, KEY)), save = m => put(localStorage, KEY, JSON.stringify(m));
  function takeParty() { const raw = get(sessionStorage, GO); if (!raw) return null; try { sessionStorage.removeItem(GO); return JSON.parse(raw); } catch (e) { return null; } }
  const clsN = c => (G.Guild.def({ cls: c }) || {}).n || c;

  // ── 선술집 안: 방은 낮은 해상도(높이 RH)로 그려 두 배로 깔고, 그 위에 인물(32px 인형)을 제 크기로 세운다. 장면 높이 H = RH × 2, 폭은 화면대로 ──
  const RH = 120, H = RH * 2, WALL = 64;
  function room(x, W, t, plaques) { // W = 방 그림의 폭 (장면 폭의 절반)
    const H = RH;
    const R = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
    // 벽 (세로 널 · 들보 · 기둥)
    R('#3a281a', 0, 0, W, WALL);
    for (let i = 0; i < W; i += 10) { R('#2c1e13', i, 0, 1, WALL); if ((i / 10) % 3 === 1) R('#45301f', i + 4, 14 + (i * 7) % 30, 1, 8); }
    for (let i = 16; i < W; i += 56) R('#22170e', i, 0, 4, WALL);
    R('#1f150d', 0, 0, W, 5); R('#2b1d11', 0, 5, W, 1);
    // 바닥 (가로 널)
    for (let y = WALL, r = 0; y < H; y += 8, r++) { R(r % 2 ? '#6a4a2d' : '#62432a', 0, y, W, 8); R('#4b3320', 0, y, W, 1); for (let i = (r * 17) % 40; i < W; i += 40) R('#4b3320', i, y, 1, 8); }
    R('#1a110a', 0, WALL - 2, W, 3);
    // 술청 (왼쪽): 선반 · 병 · 카운터 · 술통
    const bw = Math.min(70, Math.round(W * 0.27)), dx = W - 32, BOT = ['#7fb069', '#c8553d', '#e0b84c', '#6a8fc4', '#b07cc6', '#d9d0b8'];
    for (const sy of [17, 31]) { R('#22160d', 5, sy, bw - 8, 2); for (let i = 0; 8 + i * 5 < bw - 6; i++) { const c = BOT[(i * 5 + sy) % BOT.length], h = 4 + (i * 3 + sy) % 4; R(c, 7 + i * 5, sy - h, 3, h); R('#2a1a10', 8 + i * 5, sy - h - 1, 1, 1); } }
    R('#4c331d', 2, 50, bw, 24); R('#8a6238', 1, 46, bw + 2, 4); R('#a47a48', 1, 46, bw + 2, 1);
    for (let i = 8; i < bw; i += 12) R('#3a2616', i, 52, 1, 20);
    R('#c9b27a', 10, 42, 3, 4); R('#c9b27a', bw - 14, 42, 3, 4); R('#f3ead8', 10, 41, 3, 1); R('#f3ead8', bw - 14, 41, 3, 1); // 잔 둘
    { const bx = bw + 6; R('#6b4526', bx, 52, 13, 18); R('#7d5430', bx + 1, 52, 3, 18); R('#26262c', bx, 55, 13, 1); R('#26262c', bx, 66, 13, 1); R('#3a2616', bx, 51, 13, 1); }
    // 난로 (가운데): 돌 · 불 · 앞의 깔개
    const gap = dx - 3 - (bw + 20), fw = Math.max(22, Math.min(40, gap - 8)), fx = Math.round(Math.min(bw + 20 + gap / 2, dx - 5 - fw / 2)), fy = 22; // 술통과 문 사이 한가운데 (좁은 방에서는 난로가 줄어든다)
    R('#5d5852', fx - fw / 2, fy, fw, WALL - fy);
    for (let y = fy, r = 0; y < WALL; y += 6, r++) { R('#48443f', fx - fw / 2, y, fw, 1); for (let j = (r % 2) * 5; j < fw; j += 10) R('#48443f', fx - fw / 2 + j, y, 1, 6); }
    R('#7a756e', fx - fw / 2 - 3, fy - 3, fw + 6, 4); R('#8f8a82', fx - fw / 2 - 3, fy - 3, fw + 6, 1);
    R('#120c08', fx - Math.min(12, fw / 2 - 5), fy + 14, Math.min(24, fw - 10), WALL - fy - 14);
    R('#6e2f2a', fx - 28, 70, 56, 13); R('#8d4a3a', fx - 28, 70, 56, 1); R('#8d4a3a', fx - 28, 82, 56, 1); R('#8d4a3a', fx - 28, 70, 1, 13); R('#8d4a3a', fx + 27, 70, 1, 13);
    for (let i = 0; i < 9; i++) { const h = Math.max(3, 7 + Math.round(4 * Math.sin(t * 6 + i * 1.7) + 2 * Math.sin(t * 11 + i * 0.9))), a = fx - 9 + i * 2, k = (i > 1 && i < 7 ? 1 : 0.6) * (fw < 34 && (i < 1 || i > 7) ? 0 : 1);
      R('#d8521c', a, WALL - 3 - h * k, 2, h * k); R('#f2a23a', a, WALL - 3 - h * k * 0.6, 2, h * k * 0.6); if (i > 2 && i < 6) R('#ffe58a', a, WALL - 3 - h * 0.3, 2, h * 0.3); }
    R('#3a2412', fx - 8, WALL - 4, 16, 2);
    // 명패 (벽, 난로 오른쪽): 내려간 파티마다 하나
    for (let i = 0; i < Math.min(6, plaques) && fx + fw / 2 + 36 < dx - 14; i++) { const a = fx + 30 + (i % 3) * 9, b = 26 + Math.floor(i / 3) * 8; R('#8a6a3e', a, b, 7, 5); R('#5a4326', a, b + 4, 7, 1); R('#3a2616', a + 1, b + 2, 5, 1); }
    // 아래로 내려가는 문 (오른쪽): 돌 문틀 · 어둠 · 계단 · 열린 문짝
    R('#55504b', dx - 3, 20, 30, WALL - 20); R('#6a655f', dx - 3, 20, 30, 1); R('#0b0908', dx, 24, 24, WALL - 24); R('#55504b', dx, 24, 3, 3); R('#55504b', dx + 21, 24, 3, 3);
    R('#1e1b19', dx + 2, WALL - 6, 20, 3); R('#171413', dx + 5, WALL - 11, 14, 3); R('#110f0e', dx + 8, WALL - 16, 8, 3);
    if (gap > 60) { R('#3b2a1b', dx - 13, 26, 9, WALL - 27); R('#4a3522', dx - 13, 26, 2, WALL - 27); R('#1d1d22', dx - 13, 33, 9, 1); R('#1d1d22', dx - 13, 54, 9, 1); R('#c9a46a', dx - 6, 44, 1, 2); }
    // 등불 둘
    for (const lx of [Math.round(W * 0.27), Math.round(W * 0.73)]) { R('#26262c', lx, 5, 1, 5); R('#26262c', lx - 2, 10, 5, 1); R('#f6c75a', lx - 1, 11, 3, 4); R('#fff0b0', lx, 12, 1, 2); }
    // 탁자와 주사위 (오른쪽 앞)
    { const tx = W - 14; R('#3a2616', tx - 1, 96, 2, 9); R('#3a2616', tx - 5, 104, 10, 1); R('#8a6238', tx - 11, 91, 22, 3); R('#a47a48', tx - 11, 91, 22, 1); R('#5a3d22', tx - 10, 94, 20, 2); R('#f3ead8', tx - 4, 88, 3, 3); R('#f3ead8', tx + 1, 89, 2, 2); R('#3a2616', tx - 3, 89, 1, 1); }
    // 빛: 난로 · 등불 (밝게 겹친다), 가장자리는 어둡게
    x.save(); x.globalCompositeOperation = 'screen';
    const glow = (a, b, r, c) => { const g = x.createRadialGradient(a, b, 1, a, b, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(a - r, b - r, r * 2, r * 2); };
    glow(fx, WALL - 6, 62 + 3 * Math.sin(t * 7), `rgba(255,150,60,${0.34 + 0.05 * Math.sin(t * 9)})`);
    glow(Math.round(W * 0.27), 13, 26, 'rgba(255,200,90,.22)'); glow(Math.round(W * 0.73), 13, 26, 'rgba(255,200,90,.22)');
    x.restore();
  }
  function shade(x, W) { const g = x.createRadialGradient(W / 2, 150, 70, W / 2, 150, Math.max(W * 0.72, 220)); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,5,3,.6)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  // 인물이 설 자리: 넓으면 한 줄(앞뒤로 조금씩 어긋나게), 좁으면 두 줄. 오른쪽 끝은 탁자 자리로 비운다
  function spots(n, W) {
    const out = [], x0 = W * 0.07, x1 = W * 0.82;
    if (n * 36 <= x1 - x0) for (let i = 0; i < n; i++) out.push({ x: x0 + (x1 - x0) * (i + 0.5) / n, y: i % 2 ? 224 : 204 });
    else { const back = Math.ceil(n / 2), front = n - back;
      for (let i = 0; i < back; i++) out.push({ x: x0 + (x1 - x0) * (i + 0.5) / back - 4, y: 190 });
      for (let i = 0; i < front; i++) out.push({ x: x0 + (x1 - x0) * (i + 0.5) / front + (front === back ? 14 : 0), y: 230 }); }
    return out.map(p => ({ x: Math.round(p.x), y: p.y }));
  }
  // 엔진의 인형 한 장(px: 화소 배열) → 캔버스 (한 번만 만든다)
  const bmp = new WeakMap();
  function bitmap(sp) { let c = bmp.get(sp); if (!c) { c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(sp.px.buffer.slice(0)), sp.w, sp.h), 0, 0); bmp.set(sp, c); } return c; }
  const doll = (g, t) => (typeof MD !== 'undefined' && MD.pix ? MD.pix(g, t) : null);

  function open(f, rumor) {
    const T = G.Tavern, m = load(), picks = [], night = T.night(f, m, rumor), n = T.seats(m); save(m);
    let cur = null, W = 320, P = [], t = 0, tall = [];
    const back = document.createElement('canvas'), bx = back.getContext('2d'); // 방 그림 (절반 해상도)
    const box = document.createElement('div'); box.id = 'tavern'; box.onpointerup = ev => ev.stopPropagation(); $('stage').append(box);
    const nx = T.nextSeat(m), nl = T.LURE.find(([fl]) => m.deep < fl);
    box.innerHTML = `<header><h2>선술집</h2><div class="tv-res"><span class="chip">소문 ${rumor}</span><span class="chip tv-seat"></span></div></header>` +
      `<div class="tv-body"><div class="tv-scene"><canvas></canvas><div class="tv-who"></div></div>` +
      `<aside class="tv-side"><dl class="tv-info">${nx ? `<dt>다음 자리</dt><dd>${nx}층 우두머리 처치</dd>` : ''}${nl ? `<dt>새 직업</dt><dd>${nl[0]}층 도달 · ${nl[1].map(clsN).map(esc).join(' · ')}</dd>` : ''}</dl>` +
      (m.wall.length ? `<h4>명패</h4><ul class="tv-wall">${m.wall.map(w => `<li><b>${esc((w.names || []).join(' · '))}</b><small>${w.floor}층${w.win ? ' 돌파' : ''}</small></li>`).join('')}</ul>` : '') + `</aside></div>` +
      `<div class="tv-sheet" hidden></div><button class="tv-go"></button>`;
    const scene = box.querySelector('.tv-scene'), cv = scene.querySelector('canvas'), x = cv.getContext('2d'), who = box.querySelector('.tv-who'), sheetEl = box.querySelector('.tv-sheet');
    // 장면 크기: 높이는 화면의 절반 남짓. 칸 배율 k는 기기 화소에 맞는 값으로 (그림이 고르게 늘어나게), 폭은 자리대로
    function size() {
      const cw = scene.clientWidth || 360, dpr = Math.max(1, Math.round(devicePixelRatio || 1)), want = Math.max(240, Math.min(cw < 560 ? innerHeight * 0.5 : innerHeight - 190, cw * 1.15));
      let k = Math.max(1 / dpr, Math.round(want / H * dpr) / dpr); while (cw / k > 640) k += 1 / dpr;
      while (cw >= 560 && cw / k < 300 && k > 1 / dpr) k -= 1 / dpr; // 넓은 화면: 방이 좁아 보이지 않게 (술청 · 난로 · 문이 다 들어갈 폭)
      W = Math.round(cw / k); cv.width = W; cv.height = H; back.width = Math.ceil(W / 2); back.height = RH; scene.style.height = Math.round(H * k) + 'px';
      P = spots(night.length, W); marks();
    }
    // 인물 위의 누를 자리 · 이름표 · 고른 차례
    function marks() {
      const two = new Set(P.map(p => p.y)).size > 2 || (P.length > 1 && Math.abs(P[0].y - P[P.length - 1].y) > 30); // 두 줄로 서면 이름표는 이름만 (서로 가리지 않게)
      who.innerHTML = night.map((g, i) => { const k = picks.indexOf(i), p = P[i];
        return `<button class="tv-g${k >= 0 ? ' on' : ''}${cur === i ? ' cur' : ''}" data-i="${i}" style="left:${(100 * p.x / W).toFixed(2)}%;top:${(100 * (p.y - (tall[i] || 40) - 2) / H).toFixed(2)}%;width:${(100 * 30 / W).toFixed(2)}%;height:${(100 * ((tall[i] || 40) + 4) / H).toFixed(2)}%"><span class="tv-nm">${k >= 0 ? `<em>${k === 0 ? '앞장' : k + 1}</em>` : ''}${esc(g.name)}${two ? '' : `<small>${esc(clsN(g.cls))}</small>`}</span></button>`; }).join('');
      box.querySelector('.tv-seat').textContent = `자리 ${picks.length}/${n}`;
      const go = box.querySelector('.tv-go'); go.disabled = !picks.length; go.textContent = picks.length ? `출발 (${picks.length}명)` : `출발 (0/${n})`;
    }
    function paint() {
      room(bx, back.width, t, m.wall.length); x.imageSmoothingEnabled = false; x.drawImage(back, 0, 0, back.width * 2, H);
      let grew = false;
      const order = night.map((g, i) => i).sort((a, b) => P[a].y - P[b].y);
      for (const i of order) { const p = P[i], k = picks.indexOf(i), sp = doll(night[i], t + i * 0.37);
        x.fillStyle = 'rgba(0,0,0,.34)'; x.fillRect(p.x - 10, p.y - 1, 20, 3); x.fillRect(p.x - 7, p.y - 2, 14, 5);
        if (k >= 0 || cur === i) { x.fillStyle = k >= 0 ? '#f2c14e' : '#e9e2d0'; x.fillRect(p.x - 12, p.y + 3, 24, 1); x.fillRect(p.x - 14, p.y, 2, 3); x.fillRect(p.x + 12, p.y, 2, 3); x.fillRect(p.x - 12, p.y - 3, 3, 1); x.fillRect(p.x + 9, p.y - 3, 3, 1); }
        if (sp && tall[i] !== sp.foot - sp.top && !(tall[i] > sp.foot - sp.top)) { tall[i] = sp.foot - sp.top; grew = true; } // 이름표는 머리 위에 (투구 · 모자 높이만큼)
        if (sp) x.drawImage(bitmap(sp), p.x - Math.floor(sp.w / 2), p.y - sp.foot);
        else { x.fillStyle = (G.Guild.def(night[i]) || {}).col || '#888'; x.fillRect(p.x - 5, p.y - 22, 10, 22); x.fillRect(p.x - 4, p.y - 30, 8, 8); } // 그림이 아직 안 왔다
      }
      shade(x, W); if (grew) marks();
    }
    // 상태창: 능력치 · 기본 공격 · 기술마다 효과 한 줄 · 데려간다 / 뺀다
    function sheet() {
      box.classList.toggle('sheet', cur != null);
      if (cur == null) { sheetEl.hidden = true; sheetEl.innerHTML = ''; return; }
      const g = night[cur], s = T.sheet(g), k = picks.indexOf(cur), full = k < 0 && picks.length >= n;
      const li = (o, tag) => `<li><b>${esc(o.n)}</b>${tag || o.tag ? `<small>${esc(tag || o.tag)}</small>` : ''}<span>${esc(o.d)}</span></li>`;
      sheetEl.hidden = false;
      sheetEl.innerHTML = `<div class="tv-hd"><canvas class="tv-face" width="30" height="40"></canvas><div><b>${esc(s.name)}</b><small>${esc(s.cls)} · ${esc(s.sp)} · ${s.lv}레벨</small><small>탐사 — ${esc(s.role)}</small></div><button class="tv-x" aria-label="닫기">✕</button></div>` +
        `<div class="tv-st"><span>체력<b>${s.hp}</b></span><span>AC<b>${s.ac}</b></span>${s.ab.map(a => `<span>${esc(a.n)}<b>${a.v}</b><i>${a.mod}</i></span>`).join('')}</div>` +
        `<h5>기본 공격</h5><ul class="tv-sk">${li(s.weapon)}<li><b>${esc(s.armor)}</b><small>방어구</small></li></ul>` +
        (s.skills.length ? `<h5>기술 ${s.skills.length}/${G.Party.CAP}</h5><ul class="tv-sk">${s.skills.map(o => li(o)).join('')}</ul>` : '') +
        (s.traits.length + s.spTraits.length ? `<h5>특성</h5><ul class="tv-sk">${s.traits.map(o => li(o, '직업')).join('')}${s.spTraits.map(o => li(o, s.sp)).join('')}</ul>` : '') +
        `<button class="tv-take${k >= 0 ? ' out' : ''}"${full ? ' disabled' : ''}>${k >= 0 ? '뺀다' : full ? '자리 없음' : '데려간다'}</button>`;
      face();
    }
    function face() { const c = sheetEl.querySelector('.tv-face'), sp = cur != null && doll(night[cur], 0.2); if (!c || !sp) return; const fx = c.getContext('2d'); fx.clearRect(0, 0, 30, 40); fx.drawImage(bitmap(sp), Math.floor(sp.w / 2) - 15, sp.foot - 37, 30, 40, 0, 0, 30, 40); c.dataset.ok = '1'; }
    box.onclick = ev => {
      const g = ev.target.closest('.tv-g'), go = ev.target.closest('.tv-go');
      if (g) { cur = cur === +g.dataset.i ? null : +g.dataset.i; marks(); sheet(); }
      else if (ev.target.closest('.tv-x') || (ev.target.closest('.tv-scene') && cur != null)) { cur = null; marks(); sheet(); }
      else if (ev.target.closest('.tv-take')) { const k = picks.indexOf(cur); if (k >= 0) picks.splice(k, 1); else if (picks.length < n) picks.push(cur); marks(); sheet(); }
      else if (go && !go.disabled) { const party = picks.map(i => m.night[i]); m.night = null; save(m); put(sessionStorage, GO, JSON.stringify(party)); location.href = location.pathname; }
    };
    size(); paint(); document.body.dataset.tavern = '1';
    addEventListener('resize', () => { if (box.isConnected) { size(); paint(); } });
    // 난롯불 · 숨 쉬는 인물: 창이 떠 있는 동안만 돈다
    const timer = setInterval(() => { if (!box.isConnected) return clearInterval(timer); t += 0.1; paint(); const c = sheetEl.querySelector('.tv-face'); if (c && !c.dataset.ok) face(); }, 100);
  }
  return { open, takeParty, load, save, get active() { return !!$('tavern'); } };
})();
