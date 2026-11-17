'use strict';
// 탐사 진행 (화면 쪽): 지도 시제품의 탐사 규칙(RUN — js/explore)으로 한 층. 파티는 플레이어가 쿼터뷰에서 직접 움직인다.
// - 층 변환 · 출구 · 길 찾기는 js/game/floor.js (화면 없이), 전투는 js/app/fight.js, 양피지 미니맵은 js/app/pmap.js.
// - 이동: 바닥을 누르면 열린 곳 안에서 길을 찾아 걷는다. 열린 곳 = 들어가 본 방 + 지나간 통로 + 아직 안 지나간 출구의 문 앞.
//   (사용자, 2026-11-17: 「파티를 플레이어가 직접 움직이게 할거야 … 한번 열린 맵은 자유롭게 자유이동 가능하게」)
// - 안내 표지: 안 지나간 문 앞에 다가가면 열린다 → 고르면 통로를 지나 새 방으로 (그 통로는 그때부터 열린 곳).
//   구조물(야영 모닥불 · 상인)에 다가가면 그 장면이 열린다. 사건 · 전투는 방에 들어서면 바로.
// - 가 본 방은 도착 처리를 다시 하지 않는다 (보물 · 사건 · 야영은 한 번, 상인은 다시).
const CRAWL = (() => {
  const FL = G.Floor, { $, esc } = UI;
  const KIND = { open: '통로', locked: '잠긴 문', trap: '함정 복도', dark: '어두운 길', hidden: '숨은 통로' };
  const ICON = { open: '›', locked: '🔒', trap: '⚠', dark: '●', hidden: '⋯', camp: '🔥', shop: '⚖' };
  const NEAR = 1.6; // 이만큼 다가가면 안내 표지 · 구조물이 열린다
  let st = null, iso = null, R = null, walk = null, marks = [], cutscene = false;
  let open = null, roomAt = null; // 열린 타일 · 타일 → 방
  const deferred = {}; // 방 id → 구조물 장면 (야영 · 상인)
  let nearKey = null; // 지금 열려 있는 표지의 대상 (멀어지면 닫는다)
  let doorTiles = new Set(); // 지금 방의 안 지나간 출구 문 칸 (거기까지는 걸어갈 수 있다)
  const say = () => UI.say(st.log);
  const TI = (x, y) => FL.index(iso.w, x, y);
  const centerOf = id => FL.centerOf(st.map, id);
  const lead = () => R.party.find(p => !p.dead) || R.party[0];

  // 시험용 ?auto=N: 아직 안 지나간 첫 출구로 걸어가 첫 선택지 · 첫 장면 선택을 N번 (연기 시험 · 캡처용). 화면 루프로 돈다
  let autoN = 0, autoT = 0;
  function autoStep(dt) {
    if (!autoN || (st && st.done)) return; autoT += dt; if (autoT < 0.4) return; autoT = 0;
    if (FIGHT.on) { const bb = $('dicebear')?.querySelector('button'); if (bb) return bb.click(); if ($('dicetray') && !q.get('hold')) $('dicetray').querySelector('.go').click(); return; }
    const b = $('crawlscene')?.querySelector('button:not([disabled])') || $('exitsign')?.querySelector('button[data-i="0"]');
    if (b) { if ($('exitsign')) autoN--; b.click(); return; }
    if (!walk && !cutscene) { const ex = exits().find(e => !e.e.walked); if (ex) moveTo(ex.door[0], ex.door[1]); }
  }

  // ── 열린 곳 (걸을 수 있는 타일) · 보이는 곳 ──
  function mark([x, y]) { const K = FL.K; for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) open[(y * K + j) * iso.w + x * K + i] = 1; }
  const openRoom = id => st.map._lay.room[id].cells.forEach(mark);
  const openCor = eid => st.map._lay.cor[eid].cells.forEach(mark);
  function refreshSeen() {
    // 열린 타일과 그 둘레 한 칸(벽 · 문)이 보인다
    const s = R.seen; s.fill(0);
    for (let k = 0; k < open.length; k++) if (open[k]) { const x = k % iso.w, y = (k / iso.w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < iso.w && Y < iso.h) s[Y * iso.w + X] = 1; } }
    R.seenVer = (R.seenVer || 0) + 1;
  }
  const walkable = k => !!open[k] || doorTiles.has(k);
  const exits = () => FL.exits(st.map, st.at);
  const beyond = n => FL.beyond(n, RUN.TYPE);
  function doorsOf() { const s = new Set(); for (const ex of exits()) if (!ex.e.walked) s.add(TI(ex.door[0], ex.door[1])); return s; }

  // ── 누르기 · 걷기 ──
  // 누른 곳 → 바닥 타일 좌표
  function tileAtScreen(clientX, clientY) {
    const rc = canvas.getBoundingClientRect(), sx = (clientX - rc.left) / rc.width * canvas.width, sy = (clientY - rc.top) / rc.height * canvas.height;
    const g = unproject(sx, sy); return [g.x / T + win.cx, g.y / T + win.cy];
  }
  // 그 타일로 걷는다 (못 가는 곳이면 가까운 걸을 수 있는 칸으로)
  function moveTo(tx, ty) {
    if (!walkable(TI(tx, ty))) { let best = null, bd = 10; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = tx + dx, Y = ty + dy; if (X < 0 || Y < 0 || X >= iso.w || Y >= iso.h) continue; if (walkable(TI(X, Y))) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [Math.round(X), Math.round(Y)]; } } } if (!best) return false; [tx, ty] = best; }
    const L = lead(), pts = FL.findPath(iso.w, iso.h, walkable, L.x, L.y, tx, ty); if (!pts) return false;
    nearKey = null; closeSign(); go(pts.length ? pts : [[tx, ty]], null); return true;
  }
  function onTap(ev) {
    if (cutscene || FIGHT.on || $('crawlscene') || $('dicepick') || st.done) return;
    const [tx, ty] = tileAtScreen(ev.clientX, ev.clientY); moveTo(tx, ty);
  }
  const trail = [];
  function go(pts, then) { walk = { pts, i: 0, then }; }
  function frame(dt) {
    if (!R) return;
    if (FIGHT.frame(dt)) return;
    if (!st) return; // 시험 전투(?fight=test)는 탐사 층이 없다 — 전투가 끝나면 멈춘다
    const L = lead();
    if (walk) {
      const P = walk.pts[walk.i], v = (cutscene ? 6 : 5) * dt, dx = P[0] - L.x, dy = P[1] - L.y, d = Math.hypot(dx, dy);
      if (d <= v) { L.x = P[0]; L.y = P[1]; walk.i++; } else { L.x += dx / d * v; L.y += dy / d * v; }
      if (walk.i >= walk.pts.length) { const t = walk.then; walk = null; if (t) t(); }
    }
    // 따라오는 사람: 앞사람이 지나간 자리를 0.9칸 간격으로
    const last = trail[0]; if (!last || Math.hypot(last[0] - L.x, last[1] - L.y) > 0.15) { trail.unshift([L.x, L.y]); if (trail.length > 80) trail.pop(); }
    let gap = 0, j = 0; const k = 1 - Math.exp(-dt * 10);
    R.party.forEach(p => { if (p === L) return; gap += 0.9; let acc = 0; while (j < trail.length - 1 && acc < gap) { acc += Math.hypot(trail[j][0] - trail[j + 1][0], trail[j][1] - trail[j + 1][1]); j++; } const T0 = trail[Math.min(j, trail.length - 1)] || [L.x, L.y]; p.x += (T0[0] - p.x) * k; p.y += (T0[1] - p.y) * k; });
    if (!cutscene) { track(L); if (!walk) near(L); }
  }
  // 걸어서 다른 방에 들어섰다 (열린 곳 안의 이동): 지금 방을 바꾼다
  function track(L) {
    const id = roomAt[TI(L.x, L.y)]; if (id < 0 || id === st.at) return;
    st.at = id; st.path.push(id); st.here = {}; doorTiles = doorsOf(); showMarks(); PMAP.draw(); document.body.dataset.room = st.at;
  }
  // 다가갔나: 안 지나간 출구의 문 · 구조물
  function near(L) {
    let hit = null;
    for (const ex of exits()) { if (ex.e.walked) continue; if (Math.hypot(ex.door[0] - L.x, ex.door[1] - L.y) < NEAR) { hit = { key: 'e' + ex.e.id, ex }; break; } }
    const sc = deferred[st.at]; if (!hit && sc) { const [x, y] = centerOf(st.at); if (Math.hypot(x - L.x, y - L.y) < NEAR) hit = { key: 's' + st.at, sc }; }
    if (!hit) { if (nearKey && nearKey[0] === 'e') closeSign(); nearKey = null; return; }
    if (hit.key === nearKey) return; nearKey = hit.key;
    if (hit.ex) sign(hit.ex); else { st.scene = hit.sc; delete deferred[st.at]; showMarks(); scene(); }
  }

  // ── 표지 · 안내 표지 · 장면 ──
  function clearMarks() { for (const m of marks) m.el.remove(); marks = []; }
  function showMarks() {
    clearMarks(); if (st.done) return;
    for (const ex of exits()) {
      if (ex.e.walked) continue; // 지나간 통로는 표지 없이 자유롭게
      const k = FL.kindOf(ex.e), el = document.createElement('div');
      el.className = 'exitmark'; el.innerHTML = `<b>${ICON[k] || '›'}</b><small>${esc(KIND[k] || '통로')}</small>`;
      el.onclick = () => moveTo(ex.door[0], ex.door[1]);
      $('floats').append(el); marks.push({ el, x: ex.door[0], y: ex.door[1] });
    }
    const sc = deferred[st.at];
    if (sc) { const [x, y] = centerOf(st.at), el = document.createElement('div'); el.className = 'exitmark struct'; el.innerHTML = `<b>${ICON[sc.kind] || '★'}</b><small>${esc(sc.title)}</small>`; el.onclick = () => moveTo(x, y); $('floats').append(el); marks.push({ el, x, y }); }
  }
  function closeSign() { const s = $('exitsign'); if (s) s.remove(); }
  function sign(ex) {
    closeSign();
    const n = st.map.nodes[ex.to], k = FL.kindOf(ex.e), acts = n.visited ? [{ label: '지나간다', run: null }] : RUN.moveActs(st, ex.ed);
    const box = document.createElement('div'); box.id = 'exitsign';
    box.innerHTML = `<h4>${esc(KIND[k] || '통로')}</h4><p>너머: ${esc(beyond(n))}</p>` +
      acts.map((a, i) => `<button data-i="${i}">${esc(a.label)}${a.p != null && a.p < 1 ? ` <i>${Math.round(a.p * 100)}%</i>` : ''}${a.cost ? ` <small>${esc(a.cost)}</small>` : ''}${a.who ? ` <small>${esc(a.who)}</small>` : ''}</button>`).join('') +
      '<button data-i="x" class="x">돌아선다</button>';
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.i === 'x') { closeSign(); return; } choose(ex, acts[+b.dataset.i]); };
    $('stage').append(box);
  }
  function choose(ex, a) {
    closeSign(); const from = st.at;
    if (!a.run) ex.e.walked = true; else a.run();
    if (st.at === from && a.run) { say(); nearKey = null; return; } // 자물쇠를 못 땄다 등: 다시 다가가면 표지
    // 통로를 지나 새 방으로 (잠깐 자동으로 걷는다). 그 통로와 방은 이제 열린 곳
    openCor(ex.e.id); openRoom(ex.to); refreshSeen();
    cutscene = true; nearKey = null; clearMarks();
    go([...ex.path, centerOf(ex.to)], () => { cutscene = false; if (st.at !== ex.to) { st.at = ex.to; st.path.push(ex.to); st.here = {}; } arrived(); });
  }
  function arrived() {
    document.body.dataset.room = st.at; document.body.dataset.moves = (+(document.body.dataset.moves || 0) + 1);
    if (st.combat) { const c = st.combat; st.log.push({ t: `전투 ${c.rounds.length}라운드 — ${c.win ? '이겼다' : '졌다'}.` }); st.combat = null; }
    // 야영 · 상인은 구조물로: 다가가면 연다
    if (st.scene && (st.scene.kind === 'camp' || st.scene.kind === 'shop')) { deferred[st.at] = st.scene; st.scene = null; }
    say(); doorTiles = doorsOf(); PMAP.draw();
    if (st.scene) return scene();
    if (st.done) return end();
    showMarks();
  }
  function scene() {
    const s = st.scene, box = document.createElement('div'); box.id = 'crawlscene';
    box.innerHTML = `<h3>${esc(s.title)}</h3><p>${esc(s.text || '')}</p>` + s.choices.map((c, i) => `<button data-i="${i}"${c.off && c.off() ? ' disabled' : ''}>${esc(c.n)}${c.p != null && c.p < 1 ? ` <i>${Math.round(c.p * 100)}%</i>` : ''}${c.who ? ` <small>${esc(c.who)}</small>` : ''}</button>`).join('');
    box.onclick = ev => {
      const b = ev.target.closest('button'); if (!b || b.disabled) return; box.remove();
      const kind = s.kind, at = st.at, ch = s.choices[+b.dataset.i];
      if (kind === 'fight' && (ch.n === '싸운다' || ch.n === '기습한다')) { st.scene = null; return startFight(st.map.nodes[at], { ambush: ch.n === '기습한다' }); }
      RUN.choose(st, +b.dataset.i);
      if (kind === 'shop' && !st.scene) deferred[at] = s; // 상인은 다시 와도 연다
      arrived();
    };
    $('stage').append(box);
  }
  function end() { const d = document.createElement('div'); d.className = 'record-stub'; d.textContent = st.done === 'win' ? '층을 지도에 올렸다 — 층 끝 화면은 7단계' : '탐사대가 쓰러졌다 — 층 끝 화면은 7단계'; $('stage').append(d); }

  // ── 전투로 넘기기: 탐사 규칙(RUN)의 파티 체력과 쿼터뷰 인물을 차례로 맞춘다 (파이터 ↔ 파이터, 위저드 ↔ 위저드, 클레릭 ↔ 클레릭) ──
  const pair = () => R.party.map((p, i) => [p, st.party[i]]).filter(([p, m]) => p && m);
  function syncToG() { for (const [p, m] of pair()) { if (m.dead) { p.hp = 0; p.dead = true; } else p.hp = Math.max(1, Math.round(p.max * m.hp / m.max)); } }
  function syncToRUN() { for (const [p, m] of pair()) { const hp = Math.max(0, p.hp); m.hp = Math.round(m.max * hp / p.max); if (p.dead || hp <= 0) { m.hp = 0; m.dead = true; } } }
  function startFight(n, mod) {
    clearMarks(); closeSign(); syncToG();
    G.Encounter.spawnRoom(R, st.map._lay.room[n.id].cells.map(FL.tile), n.g.units || [[n.g.name, n.g.count]], lead(), { boss: n.type === 'boss' });
    FIGHT.start(R, { n, mod, log: t => { st.log.push({ t }); say(); }, done: fightDone });
    st.log.push({ t: `${n.g.label} — 전투가 시작된다.` }); say();
  }
  function fightDone(win, F) {
    const n = F.n; syncToRUN(); n.hostile = false;
    if (!win || !st.party.some(m => !m.dead)) { st.done = 'lose'; st.log.push({ t: '탐사대가 전멸했다.' }); say(); return end(); }
    if (n.type === 'boss') { st.done = 'win'; st.log.push({ t: `${n.g.name}가 쓰러졌다. 이 층의 지도가 완성됐다.` }); say(); PMAP.draw(); return end(); }
    const gold = n.type === 'elite' ? 35 + RUN.d(st.rng, 15) : 6 + n.g.count * 2 + (n.g.tier === 'heavy' ? 15 : 0); st.gold += gold;
    st.log.push({ t: `전투에서 이겼다 (${F.round}라운드). 전리품: 금화 ${gold}.` }); say();
    const L = lead(); trail.length = 0; trail.push([L.x, L.y]);
    refreshSeen(); doorTiles = doorsOf(); PMAP.draw(); showMarks();
  }

  return {
    // 층을 만들고 쿼터뷰 지도를 돌려준다
    start(seed) { st = RUN.newRun(seed, ['fighter', 'wizard', 'cleric']); const fl = FL.fromRun(st.map, RUN.TYPE); iso = fl.iso; roomAt = fl.roomAt; open = new Uint8Array(iso.w * iso.h); return iso; },
    // 세계가 서면: 파티를 입구에, 입구 방을 연다, 누르기 · 표지
    attach(r) {
      R = r; R.seen = new Uint8Array(iso.w * iso.h);
      const [x, y] = centerOf(st.at); r.party.forEach((p, i) => { p.x = x - 0.6 * i; p.y = y + 0.3 * i; p._dx = p._rx = p.x; p._dy = p._ry = p.y; });
      openRoom(st.at); refreshSeen(); doorTiles = doorsOf();
      canvas.addEventListener('pointerup', onTap);
      PMAP.attach(st); say(); showMarks(); document.body.dataset.room = st.at; FIGHT.dicePick();
      autoN = +q.get('auto') || 0;
      // 시험용 ?tap=x,y: 그 타일을 화면 좌표로 바꿔 누른 것처럼 (화면 ↔ 타일 변환 확인)
      if (q.get('tap')) setTimeout(() => { const [tx, ty] = q.get('tap').split(',').map(Number), a = project(wx(tx), wy(ty), 0), rc = canvas.getBoundingClientRect(); const cx = rc.left + a.sx / canvas.width * rc.width, cy = rc.top + a.sy / canvas.height * rc.height, back = tileAtScreen(cx, cy); document.body.dataset.tap = back.map(v => v.toFixed(2)).join(','); }, 1500);
    },
    frame(dt) { frame(dt); autoStep(dt); for (const m of marks) UI.place(m.el, m.x, m.y, 2.2); FIGHT.hud(); },
    // 시험 전투 (?fight=test): 복도로 들어와 방에서 적과 맞닥뜨려 싸운다 (탐사 규칙 없이)
    fightTest(r) {
      PMAP.hide(); R = r;
      const room = r.map.rooms.find(x => x.id === 'A') || r.map.rooms[0], n = { id: -1, type: 'fight', g: { label: '시험 전투', name: '적', count: r.mons.length, units: [] } };
      // 걸어 들어올 자리: 첫 사람은 방 입구 안쪽, 나머지는 그 뒤로 (진형을 맞추지 않는다)
      const intro = new Map(r.party.map((p, i) => [p, { x: room.x + 2 - (i ? 1.2 : 0), y: room.cy + (i === 1 ? -1.2 : i === 2 ? 1.2 : 0) }]));
      const tray = q.get('tray') || q.get('dice') != null; // 운명판 창은 ?tray · ?dice일 때만 (예시 장면은 판을 알아서 굴리고 작은 판만 띄운다)
      FIGHT.start(R, { n, intro, quiet: !tray, done: (win, F) => { const d = document.createElement('div'); d.className = 'record-stub'; d.innerHTML = `${win ? `시험 전투: 이겼다 (${F.round}라운드)` : '시험 전투: 졌다'} <button onclick="location.reload()">다시 보기</button>`; $('stage').append(d); } });
      if (q.get('dice') != null) FIGHT.dicePick(); if (q.get('auto')) autoN = 99; // ?dice=는 고르는 창 없이 그대로 넣는다
    },
    get st() { return st; },
  };
})();
