'use strict';
// 탐사 진행 (화면 쪽): 지도 시제품의 탐사 규칙(RUN — js/explore)으로 한 층. 파티는 플레이어가 쿼터뷰에서 직접 움직인다.
// - 층 변환 · 출구 · 길 찾기는 js/game/floor.js (화면 없이), 전투는 js/app/fight.js, 양피지 미니맵은 js/app/pmap.js.
// - 이동: 바닥을 누르면 열린 곳 안에서 길을 찾아 걷는다. 열린 곳 = 들어가 본 방 + 지나간 통로 + 아직 안 지나간 출구의 문 앞.
//   (사용자, 2026-11-17: 「파티를 플레이어가 직접 움직이게 할거야 … 한번 열린 맵은 자유롭게 자유이동 가능하게」)
// - 저절로 걷기 (2026-11-18, 사용자: 「갈림길이 매 방마다 되게 많아서 매번 선택을 하는 문제」): 방 일이 끝나면 앞으로 가는 길로 저절로 간다.
//   길이 하나면 그대로, 둘 이상이면 갈림길 창에서 고른다 (한 판에 세 번쯤). 돌아가는 길 · 지나간 길은 출구로 치지 않는다.
//   문 행동도 저절로: 잠긴 문은 따기 → 부수기, 그래도 안 되면 대가가 있는 방법(열림 주문 · 두루마리)만 묻는다. 어두운 길은 횃불이 있으면 켠다.
//   구조물(야영 모닥불 · 상인)이 있는 방은 들어서면 다가가 장면을 연다. 사건 · 전투는 방에 들어서면 바로.
// - 가 본 방은 도착 처리를 다시 하지 않는다 (보물 · 사건 · 야영은 한 번, 상인은 다시).
const CRAWL = (() => {
  const FL = G.Floor, { $, esc } = UI;
  const KIND = { open: '통로', locked: '잠긴 문', trap: '함정 복도', dark: '어두운 길', hidden: '숨은 통로' };
  const ICON = { open: '›', locked: '🔒', trap: '⚠', dark: '●', hidden: '⋯', camp: '🔥', shop: '⚖' };
  const NEAR = 1.6; // 이만큼 다가가면 안내 표지 · 구조물이 열린다
  let st = null, iso = null, R = null, walk = null, marks = [], cutscene = false;
  let open = null, roomAt = null; // 열린 타일 · 타일 → 방
  const deferred = {}; // 방 id → 구조물 장면 (야영 · 상인)
  let nearKey = null, idleT = 0; // 지금 열린 구조물 장면의 대상 · 저절로 걷기까지 기다린 시간
  let doorTiles = new Set(); // 지금 방의 안 지나간 출구 문 칸 (거기까지는 걸어갈 수 있다)
  const say = () => UI.say(st.log);
  // 명성 (판 밖, 설계 5-12): 이 브라우저에 쌓인다
  const RENOWN = 'inc.renown', renownLoad = () => { try { return +localStorage.getItem(RENOWN) || 0; } catch (e) { return 0; } }, renownSave = v => { try { localStorage.setItem(RENOWN, String(v)); } catch (e) { /* 저장 못 해도 판은 돈다 */ } };
  let unl = [], lvSnap = null; const tally = { fights: 0, elites: 0, boss: false };
  const TI = (x, y) => FL.index(iso.w, x, y);
  const centerOf = id => FL.centerOf(st.map, id);
  const lead = () => R.party.find(p => !p.dead) || R.party[0];

  // 시험용 ?auto=N: 아직 안 지나간 첫 출구로 걸어가 첫 선택지 · 첫 장면 선택을 N번 (연기 시험 · 캡처용). 화면 루프로 돈다
  let autoN = 0, autoT = 0;
  function autoStep(dt) {
    if (!autoN || (st && st.done)) return; autoT += dt; if (autoT < 0.4) return; autoT = 0;
    if (REWARDUI.active) { if (q.get('rhold')) return; const b = $('reward')?.querySelector('.rw-go, .rw-cards button'); if (b && !b.classList.contains('rw-go') || b && !$('reward').classList.contains('rw-record')) b.click(); return; } // 전투 결과 · 고르기: 처음 것 (기록 화면에서는 멈춘다) ?rhold=1이면 결과 창에서 멈춘다 (캡처용)
    if (FIGHT.on) { const bb = $('dicebear')?.querySelector('button'); if (bb) return bb.click(); if ($('dicetray') && !q.get('hold')) $('dicetray').querySelector('.go').click(); return; }
    const b = $('crawlscene')?.querySelector('button:not([disabled])') || $('exitsign')?.querySelector('button[data-i="0"]');
    if (b) { if ($('exitsign')) autoN--; b.click(); return; }
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
  const tileAtScreen = UI.tileAt; // 누른 곳 → 바닥 타일 좌표
  // 그 타일로 걷는다 (못 가는 곳이면 가까운 걸을 수 있는 칸으로)
  function moveTo(tx, ty) {
    if (!walkable(TI(tx, ty))) { let best = null, bd = 10; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = tx + dx, Y = ty + dy; if (X < 0 || Y < 0 || X >= iso.w || Y >= iso.h) continue; if (walkable(TI(X, Y))) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [Math.round(X), Math.round(Y)]; } } } if (!best) return false; [tx, ty] = best; }
    const L = lead(), pts = FL.findPath(iso.w, iso.h, walkable, L.x, L.y, tx, ty); if (!pts) return false;
    nearKey = null; closeSign(); go(pts.length ? pts : [[tx, ty]], null); return true;
  }
  function onTap(ev) {
    if (HUD.closeSheet()) return; // 캐릭터 시트가 열려 있으면 바닥을 누르면 닫는다
    if (cutscene || FIGHT.on || PREPUI.active || REWARDUI.active || $('crawlscene') || $('dicepick') || st.done) return;
    const [tx, ty] = tileAtScreen(ev.clientX, ev.clientY); moveTo(tx, ty);
  }
  const trail = [];
  function go(pts, then) { walk = { pts, i: 0, then }; }
  function frame(dt) {
    if (!R) return;
    if (PREPUI.frame(dt)) return; // 문 앞 준비 중: 시간이 멈춘다
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
    if (busy() || st.here.auto) idleT = 0; else if ((idleT += dt) > 0.4) { idleT = 0; autoNext(); } // 전투 · 보상 · 장면이 끝나고 잠깐 뒤 저절로 다음 길
  }
  // 걸어서 다른 방에 들어섰다 (열린 곳 안의 이동): 지금 방을 바꾼다
  function track(L) {
    const id = roomAt[TI(L.x, L.y)]; if (id < 0 || id === st.at) return;
    st.at = id; st.path.push(id); st.here = {}; doorTiles = doorsOf(); showMarks(); PMAP.draw(); document.body.dataset.room = st.at;
  }
  // 다가갔나: 구조물 (출구는 표지를 누르거나 저절로 간다)
  function near(L) {
    let hit = null;
    const sc = deferred[st.at]; if (sc) { const [x, y] = centerOf(st.at); if (Math.hypot(x - L.x, y - L.y) < NEAR) hit = { key: 's' + st.at, sc }; }
    if (!hit) { nearKey = null; return; }
    if (hit.key === nearKey) return; nearKey = hit.key;
    st.scene = hit.sc; delete deferred[st.at]; showMarks(); scene();
  }

  // ── 표지 · 안내 표지 · 장면 ──
  function clearMarks() { for (const m of marks) m.el.remove(); marks = []; }
  function showMarks() {
    clearMarks(); if (st.done) return;
    for (const ex of ahead()) {
      const k = FL.kindOf(ex.e), el = document.createElement('div');
      el.className = 'exitmark'; el.innerHTML = `<b>${ICON[k] || '›'}</b><small>${esc(KIND[k] || '통로')}</small>`;
      el.onclick = () => { if (!busy()) takeExit(ex); };
      $('floats').append(el); marks.push({ el, x: ex.door[0], y: ex.door[1] });
    }
    const sc = deferred[st.at];
    if (sc) { const [x, y] = centerOf(st.at), el = document.createElement('div'); el.className = 'exitmark struct'; el.innerHTML = `<b>${ICON[sc.kind] || '★'}</b><small>${esc(sc.title)}</small>`; el.onclick = () => moveTo(x, y); $('floats').append(el); marks.push({ el, x, y }); }
  }
  function closeSign() { const s = $('exitsign'); if (s) s.remove(); }
  // 앞으로 가는 길: 이 방에서 나가는 길 중 안 지나간 것 (돌아가는 길 · 못 연 문은 빼고)
  const ahead = () => exits().filter(x => x.e.a === st.at && !x.e.walked && !x.e.stuck);
  // 지금 저절로 움직이면 안 되는 때: 걷는 중 · 전투 · 문 열기 · 창이 떠 있음
  const busy = () => cutscene || !!walk || FIGHT.on || PREPUI.active || REWARDUI.active || !!($('crawlscene') || $('dicepick') || $('exitsign') || $('csheet')) || !!st.done;
  // 방 일이 끝났다: 새 길이 하나면 그리로, 둘 이상이면 갈림길 창. 새 길이 없으면 가 본 방으로 (앞으로만 — 길은 거꾸로 돌지 않는다)
  function autoNext() {
    st.here.auto = true;
    const fresh = ahead().filter(x => !st.map.nodes[x.to].visited), opts = fresh.length ? fresh : exits().filter(x => x.e.a === st.at && !x.e.stuck);
    if (!opts.length) return;
    if (opts.length === 1) return takeExit(opts[0]);
    fork(opts);
  }
  // 화면에서 그 문이 어느 쪽인가 (쿼터뷰: 화면 x ∝ x − y, 화면 y ∝ (x + y) / 2) — 갈림길 창의 길을 지도와 맞춰 보게
  const DIRS = [['→', '오른쪽'], ['↘', '오른쪽 아래'], ['↓', '아래'], ['↙', '왼쪽 아래'], ['←', '왼쪽'], ['↖', '왼쪽 위'], ['↑', '위'], ['↗', '오른쪽 위']];
  const dirOf = ([x, y]) => { const L = lead(), dx = x - L.x, dy = y - L.y; return DIRS[((Math.round(Math.atan2((dx + dy) / 2, dx - dy) / (Math.PI / 4)) % 8) + 8) % 8]; };
  function fork(opts) {
    closeSign(); const box = document.createElement('div'); box.id = 'exitsign';
    box.innerHTML = '<h4>갈림길</h4><p>어느 길로 갈까</p>' + opts.map((x, i) => { const k = FL.kindOf(x.e), [ar, dw] = dirOf(x.door); return `<button data-i="${i}">${ar} ${esc(dw)} · ${esc(KIND[k] || '통로')} <small>너머: ${esc(beyond(st.map.nodes[x.to]))}</small></button>`; }).join('') +
      '<button data-i="x" class="x">둘러본다</button>';
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; closeSign(); if (b.dataset.i !== 'x') takeExit(opts[+b.dataset.i]); };
    $('stage').append(box);
  }
  // 그 출구로: 문 앞까지 걸어가서 저절로 들어간다
  function takeExit(ex) {
    closeSign(); clearMarks(); nearKey = null; st.here.auto = true;
    const L = lead(), pts = FL.findPath(iso.w, iso.h, walkable, L.x, L.y, ex.door[0], ex.door[1]);
    cutscene = true; go(pts && pts.length ? pts : [ex.door], () => { cutscene = false; enter(ex); });
  }
  function enter(ex) {
    if (st.map.nodes[ex.to].visited || ex.e.walked) return choose(ex, { run: null }); // 가 본 방: 그냥 지나간다
    if (prepable(ex)) return prepDoor(ex); // 적이 있는 방: 문을 저절로 연다
    const acts = RUN.moveActs(st, ex.ed);
    if (ex.e.kind === 'locked' && !ex.e.opened) return unlock(ex, acts);
    choose(ex, acts.find(a => a.cost === '횃불 1') || acts[0]); // 어두운 길은 횃불이 있으면 켜고
  }
  // 잠긴 문 (적이 없는 방 — 보물 방 등): 따기 → 부수기를 저절로. 그래도 안 되면 대가가 있는 방법만 묻는다, 없으면 이 문은 두고 간다
  function unlock(ex, acts) {
    for (const a of acts.filter(q => q.id === 'pick' || q.id === 'break')) { const from = st.at; choose(ex, a); if (st.at !== from) return; }
    const paid = acts.filter(q => q.id === 'knock' || q.id === 'kscroll'), leave = () => { ex.e.stuck = true; st.here.auto = false; showMarks(); };
    if (!paid.length) { st.log.push({ t: '이 문은 열 수 없다 — 다른 길로.' }); say(); return leave(); }
    const box = document.createElement('div'); box.id = 'exitsign';
    box.innerHTML = `<h4>잠긴 문</h4><p>자물쇠도, 힘으로도 안 열린다. 너머: ${esc(beyond(st.map.nodes[ex.to]))}</p>` +
      paid.map((a, i) => `<button data-i="${i}">${esc(a.label)}${a.cost ? ` <small>${esc(a.cost)}</small>` : ''}${a.note ? ` <small>${esc(a.note)}</small>` : ''}</button>`).join('') + '<button data-i="x" class="x">두고 간다</button>';
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; closeSign(); if (b.dataset.i === 'x') leave(); else choose(ex, paid[+b.dataset.i]); };
    $('stage').append(box);
  }
  function choose(ex, a) {
    if (a.prep) return prepDoor(ex);
    closeSign(); const from = st.at;
    if (!a.run) ex.e.walked = true; else a.run();
    if (st.at === from && a.run) { say(); return; } // 자물쇠를 못 땄다 등: 부른 쪽(unlock)이 다음 방법을 해 본다
    // 통로를 지나 새 방으로 (잠깐 자동으로 걷는다). 그 통로와 방은 이제 열린 곳
    openCor(ex.e.id); openRoom(ex.to); refreshSeen();
    cutscene = true; nearKey = null; clearMarks();
    go([...ex.path, inside(ex)], () => { cutscene = false; if (st.at !== ex.to) { st.at = ex.to; st.path.push(ex.to); st.here = {}; } arrived(); });
  }
  // 새 방에 들어서서 멈출 곳: 가운데까지 가지 않고 문에서 세 칸쯤 안쪽 (다음 길로 이어 걸을 때 덜 멈칫하게)
  const inside = ex => { const [cx, cy] = centerOf(ex.to), [dx, dy] = ex.path[ex.path.length - 1], L = Math.hypot(cx - dx, cy - dy), k = Math.min(1, 3 / (L || 1)); return [dx + (cx - dx) * k, dy + (cy - dy) * k]; };
  function arrived() {
    document.body.dataset.room = st.at; document.body.dataset.moves = (+(document.body.dataset.moves || 0) + 1);
    if (st.combat) { const c = st.combat; st.log.push({ t: `전투 ${c.rounds.length}라운드 — ${c.win ? '이겼다' : '졌다'}.` }); st.combat = null; }
    // 야영 · 상인은 구조물로: 다가가면 연다
    if (st.scene && (st.scene.kind === 'camp' || st.scene.kind === 'shop')) { deferred[st.at] = st.scene; st.scene = null; }
    say(); doorTiles = doorsOf(); PMAP.draw();
    if (st.scene) return scene();
    if (st.done) return end();
    showMarks();
    if (deferred[st.at] && !st.here.struct) { st.here.struct = true; const [x, y] = centerOf(st.at); moveTo(x, y); return; } // 야영 · 상인: 다가가서 연다
    if (!busy() && !st.here.auto) autoNext(); // 이 방에 할 일이 없으면 기다리지 않고 이어 걷는다
  }
  function scene() {
    const s = st.scene, box = document.createElement('div'); box.id = 'crawlscene';
    // 상인: 용병 계약 (금화로 후보 셋 중 하나)
    if (s.kind === 'shop' && !s.choices.some(c => c.ours === 'hire')) s.choices.splice(Math.max(0, s.choices.length - 1), 0, { n: '용병 계약', who: `금화 ${HIRE} · 셋 중 한 명`, ours: 'hire', off: () => st.gold < HIRE });
    box.innerHTML = `<h3>${esc(s.title)}</h3><p>${esc(s.text || '')}</p>` + s.choices.map((c, i) => `<button data-i="${i}"${c.off && c.off() ? ' disabled' : ''}>${esc(c.n)}${c.p != null && c.p < 1 ? ` <i>${Math.round(c.p * 100)}%</i>` : ''}${c.who ? ` <small>${esc(c.who)}</small>` : ''}</button>`).join('');
    box.onclick = ev => {
      const b = ev.target.closest('button'); if (!b || b.disabled) return; box.remove();
      const kind = s.kind, at = st.at, ch = s.choices[+b.dataset.i];
      if (ch.ours === 'hire') { st.gold -= HIRE; st.log.push({ t: `용병 계약 — 금화 ${HIRE}.` }); return recruit(() => scene(), '용병 계약'); }
      if (kind === 'fight' && (ch.n === '싸운다' || ch.n === '기습한다')) { st.scene = null; return startFight(st.map.nodes[at], { ambush: ch.n === '기습한다' }); }
      RUN.choose(st, +b.dataset.i);
      if (kind === 'shop' && !st.scene) deferred[at] = s; // 상인은 다시 와도 연다
      arrived();
    };
    $('stage').append(box);
  }
  // 판 끝: 기록 → 명성 (풀 넓히기) → 다시 들어간다
  function end() {
    clearMarks(); closeSign(); if (REWARDUI.active) return;
    const before = renownLoad(), sum = { win: st.done === 'win', rooms: st.map.nodes.filter(n => n.visited).length, fights: tally.fights, elites: tally.elites, boss: tally.boss, lv: Math.max(...R.party.map(p => p.merc?.lv || 1)), gold: st.gold };
    sum.gain = G.Reward.renown(sum); sum.total = before + sum.gain; renownSave(sum.total);
    sum.fresh = G.Reward.UNLOCKS.filter(u => sum.total >= u.at && before < u.at).map(u => u.n);
    document.body.dataset.done = st.done;
    REWARDUI.record(sum, () => { location.href = location.pathname; });
  }

  // ── 전투로 넘기기: 탐사 규칙(RUN)의 파티 체력과 쿼터뷰 인물을 차례로 맞춘다 (파이터 ↔ 파이터, 위저드 ↔ 위저드, 클레릭 ↔ 클레릭) ──
  const pair = () => R.party.map((p, i) => [p, st.party[i]]).filter(([p, m]) => p && m);
  // 치유 물약은 전투 동안 엔진 가방으로 (엔진 AI가 마신다) — 전투가 끝나면 남은 만큼 돌아온다
  const POT = 'Potion of Healing', bag = () => G.Items.bag(G.S.w.fantasy);
  function syncToG() { for (const [p, m] of pair()) { if (m.dead) { p.hp = 0; p.dead = true; } else p.hp = Math.max(1, Math.round(p.max * m.hp / m.max)); } bag()[POT] = st.items.potion || 0; lvSnap = R.party.map(p => ({ p, lv: p.merc?.lv })); }
  function syncToRUN() { for (const [p, m] of pair()) { const hp = Math.max(0, p.hp); m.hp = Math.round(m.max * hp / p.max); if (p.dead || hp <= 0) { m.hp = 0; m.dead = true; } } st.items.potion = bag()[POT] || 0; }
  function startFight(n, mod) {
    clearMarks(); closeSign(); syncToG();
    G.Encounter.spawnRoom(R, st.map._lay.room[n.id].cells.map(FL.tile), units(n.g), lead(), { boss: n.type === 'boss' });
    FIGHT.start(R, { n, mod, log: t => { st.log.push({ t }); say(); }, done: fightDone });
    st.log.push({ t: `${n.g.label} — 전투가 시작된다.` }); say();
  }
  // ── 문 열기 (설계 5-11): 아직 안 가 본, 적이 있는 방으로 가는 열린 길 · 잠긴 문 · 못 찾은 함정 길 (어두운 길은 안내 표지 그대로) — 문 앞에 서면 저절로 연다 ──
  const prepable = ex => { const n = st.map.nodes[ex.to], k = ex.e.kind; return n.hostile && !n.visited && (k === 'open' || k === 'locked' || k === 'hidden' || (k === 'trap' && !ex.e.seen.trap)); };
  const cellTiles = ([x, y]) => { const K = FL.K, cx = Math.floor(x / K), cy = Math.floor(y / K), out = []; for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) out.push((cy * K + j) * iso.w + cx * K + i); return out; };
  const noiseGrid = () => ({ w: iso.w, h: iso.h, pass: k => iso.c[k] !== '#' });
  // 통로를 지나 방 문 앞까지 걸어간다 — 방 안은 시야 밖이라 안 보이고, 적은 잠들었거나 모른다 (소리는 문 칸에서 줄어든다: doorTiles)
  function prepDoor(ex) {
    closeSign(); clearMarks(); nearKey = null;
    const n = st.map.nodes[ex.to], door = ex.path[ex.path.length - 1], lane = ex.path.slice(0, -1), dts = cellTiles(door);
    openCor(ex.e.id); refreshSeen(); // 문은 벽으로 굽지 않는다 — 다시 굽기는 화면이 깜빡이고 인물 · 카메라가 튄다(main.js). 방 안은 시야가 가린다
    syncToG();
    const mons = G.Encounter.spawnRoom(R, st.map._lay.room[n.id].cells.map(FL.tile), units(n.g), { x: door[0], y: door[1] }, { boss: n.type === 'boss', hidden: true });
    if (n.alert) for (const m of mons) m.aware = 'alert'; // 이미 우리를 기다린다
    // 다른 방의 적도 소리를 듣는다 (쫓아오면 전투 중에 증원)
    const others = st.map.nodes.filter(o => o.hostile && !o.visited && o.id !== n.id).map(o => { const [x, y] = centerOf(o.id); return { x, y, aware: o.alert ? 'alert' : 'idle', node: o }; });
    const stop = lane.length ? lane[lane.length - 1] : [lead().x, lead().y];
    cutscene = true;
    go(lane.length ? lane : [stop], () => {
      cutscene = false;
      PREPUI.open(R, { door: { x: door[0], y: door[1] }, doorTiles: dts, out: { x: stop[0] - door[0], y: stop[1] - door[1] }, locked: ex.e.kind === 'locked' && !ex.e.opened, mons, others,
        items: { tools: st.party.some(m => m.cls === 'rogue' && !m.dead) || st.items.tools ? 1 : 0 },
        reveal: () => { openRoom(ex.to); refreshSeen(); },
        onOpen: S => enterFight(ex, n, S, others) });
    });
  }
  // 문이 열렸다: 탐사 규칙(RUN)으로 방에 들어서고(기록 · 정보 — 못 찾은 함정은 여기서 터진다) 그 자리에서 싸운다
  function enterFight(ex, n, S, others) {
    ex.e.opened = true;
    RUN.moveActs(st, ex.ed)[0].run(); st.scene = null; if (!S.surprise) n.alert = true;
    say(); doorTiles = doorsOf(); PMAP.draw(); document.body.dataset.room = st.at; document.body.dataset.moves = (+(document.body.dataset.moves || 0) + 1);
    if (st.done) return end();
    syncToG(); G.Encounter.applyPrep(R, S);
    const waiting = others.filter(o => o.aware === 'hunt');
    FIGHT.start(R, { n, mod: {}, log: t => { st.log.push({ t }); say(); }, done: fightDone, onRound: r => fightRound(r, waiting, others) });
    st.log.push({ t: `${n.g.label} — 전투가 시작된다.` }); say();
  }
  // 전투 라운드마다: 싸우는 소리(8)가 층에 퍼지고, 쫓아오는 다른 방 적은 걸어서 닿으면(6타일/라운드) 이 방으로 들어온다
  function fightRound(round, waiting, others) {
    const live = R.party.filter(p => !p.dead).concat(R.mons.filter(m => m.hp > 0)), c = { x: live.reduce((a, e) => a + e.x, 0) / live.length, y: live.reduce((a, e) => a + e.y, 0) / live.length };
    if (round > 1) { G.Feed.push(G.Noise.emit(noiseGrid(), c, G.Noise.LV.round, others.filter(o => !o.joined))); for (const o of others) if (o.aware === 'hunt' && !waiting.includes(o)) waiting.push(o); }
    const D = waiting.some(o => o.eta == null) ? G.Noise.field(noiseGrid(), c.x, c.y, 400) : null;
    for (const o of waiting) {
      if (o.joined) continue;
      if (o.eta == null) { const d = D[FL.index(iso.w, o.x, o.y)]; o.eta = round + Math.ceil((Number.isFinite(d) ? d : 30) / 6); }
      if (round < o.eta) continue;
      o.joined = true; o.node.hostile = false; o.node.alert = true;
      G.Encounter.spawnRoom(R, st.map._lay.room[st.at].cells.map(FL.tile), units(o.node.g), lead(), {});
      st.log.push({ t: `${o.node.g.label} — 싸우는 소리를 듣고 달려왔다!` }); say();
    }
  }
  // 적 무리 → 파티 수에 맞춘 적 수 (탐사 규칙의 무리는 3명 기준)
  const units = g => G.Encounter.scale(g.units || [[g.name, g.count]], R.party.filter(p => !p.dead).length);
  // 동료 영입 (설계 5-13): 후보 셋 중 하나 — 다섯이면 한 명을 내보낸다. 들어온 동료는 단장 곁에 나타난다
  function recruit(after, title, only = null) {
    const f = G.S.w.fantasy, cands = G.Party.offer(f, 3, Math.random, only);
    REWARDUI.recruit(cands, G.Party.size(f) >= G.Party.MAX, G.Party.members(f).slice(1), (m, out) => {
      if (m) {
        if (out) { G.Party.leave(f, R, out, st); if (st) st.log.push({ t: `${out.name}이(가) 파티를 떠났다.` }); }
        const L = lead(); G.Party.join(f, R, m, st, { x: L.x - 0.7, y: L.y + 0.5 }); trail.length = 0; trail.push([L.x, L.y]);
        if (st) { st.log.push({ t: `${m.name}(${G.Guild.def(m).n}) — 동료가 되었다.` }); say(); }
      }
      if (after) after(m);
    }, title);
  }
  const HIRE = 30; // 상인의 용병 계약 값 (금화)
  // 전투가 끝났다: 졌으면 판 끝, 이겼으면 금화 · 경험치 · 전리품 → 레벨업 고르기 → 정예 · 보스 3택1 (설계 5-12)
  function fightDone(win, F) {
    const n = F.n; syncToRUN(); n.hostile = false;
    if (!win || !st.party.some(m => !m.dead)) { st.done = 'lose'; st.log.push({ t: '탐사대가 전멸했다.' }); say(); return end(); }
    const type = n.type === 'boss' ? 'boss' : n.type === 'elite' ? 'elite' : 'fight', f = G.S.w.fantasy;
    const gold = type === 'boss' ? 60 + RUN.d(st.rng, 20) : type === 'elite' ? 35 + RUN.d(st.rng, 15) : 6 + n.g.count * 2 + (n.g.tier === 'heavy' ? 15 : 0); st.gold += gold;
    const loot = G.Reward.loot(type, n.g.count || 1); for (const l of loot) st.items[l.k] = (st.items[l.k] || 0) + l.n;
    tally.fights++; if (type === 'elite') tally.elites++; if (type === 'boss') tally.boss = true;
    const xp = R.party.filter(p => p.merc).map(p => ({ p, lv0: lvSnap?.find(s => s.p === p)?.lv ?? p.merc.lv, lv: p.merc.lv, xp: p.merc.xp, need: G.Guild.needOf(p.merc) }));
    st.log.push({ t: `전투에서 이겼다 (${F.round}라운드). 금화 ${gold}${loot.length ? ' · ' + loot.map(l => `${l.name} ${l.n}`).join(' · ') : ''}.` }); say();
    REWARDUI.show({ title: `${n.g.label} — 이겼다 (${F.round}라운드)`, gold, xp, loot, big: type === 'fight' ? null : G.Reward.bigOffer(f, R.party, type), type, f, join: cont => recruit(cont, '동료 합류') }, () => {
      refreshHP();
      if (type === 'boss') { st.done = 'win'; st.log.push({ t: `${n.g.name}가 쓰러졌다. 이 층의 지도가 완성됐다.` }); say(); PMAP.draw(); return end(); }
      const L = lead(); trail.length = 0; trail.push([L.x, L.y]);
      refreshSeen(); doorTiles = doorsOf(); PMAP.draw(); showMarks();
    });
  }
  // 레벨업 · 건강 +1 뒤: 최대 체력을 다시 (지금 체력 비율은 그대로)
  function refreshHP() { const f = G.S.w.fantasy; for (const a of R.party) if (a.merc && !a.dead) { const k = a.max ? a.hp / a.max : 1; a.max = a.kind === 'hero' ? G.Fantasy.heroHP(f) : G.Fantasy.allyHP(f, a); a.hp = Math.max(1, Math.round(a.max * k)); } }

  return {
    // 층을 만들고 쿼터뷰 지도를 돌려준다
    start(seed) {
      G.Reward.stockShop(RUN.ITEMS); // 상인이 기름 · 마름쇠 · 도둑 도구도 판다
      st = RUN.newRun(seed, ['fighter']); const fl = FL.fromRun(st.map, RUN.TYPE); iso = fl.iso; roomAt = fl.roomAt; open = new Uint8Array(iso.w * iso.h); // 혼자 시작 (설계 5-13)
      // 시작 물자 (명성으로 열린 만큼 더)
      unl = G.Reward.unlocked(renownLoad()); const I = st.items;
      I.potion = (I.potion || 0) + (unl.includes('potion1') ? 1 : 0);
      return iso;
    },
    // 세계가 서면: 파티를 입구에, 입구 방을 연다, 누르기 · 표지
    attach(r) {
      R = r; R.seen = new Uint8Array(iso.w * iso.h); FXUI.attach(R);
      if (st.party[0] && r.party[0]?.merc) st.party[0].n = r.party[0].merc.name; // 탐사 기록에도 단장의 이름
      const [x, y] = centerOf(st.at); r.party.forEach((p, i) => { p.x = x - 0.6 * i; p.y = y + 0.3 * i; p._dx = p._rx = p.x; p._dy = p._ry = p.y; });
      openRoom(st.at); refreshSeen(); doorTiles = doorsOf();
      canvas.addEventListener('pointerup', onTap);
      PMAP.attach(st); say(); showMarks(); document.body.dataset.room = st.at; FIGHT.dicePick(unl, Object.fromEntries(G.Reward.UNLOCKS.map(u => [u.id, u.at])));
      autoN = +q.get('auto') || 0;
      // 시험용 ?tap=x,y: 그 타일을 화면 좌표로 바꿔 누른 것처럼 (화면 ↔ 타일 변환 확인)
      if (q.get('tap')) setTimeout(() => { const [tx, ty] = q.get('tap').split(',').map(Number), a = project(wx(tx), wy(ty), 0), rc = canvas.getBoundingClientRect(); const cx = rc.left + a.sx / canvas.width * rc.width, cy = rc.top + a.sy / canvas.height * rc.height, back = tileAtScreen(cx, cy); document.body.dataset.tap = back.map(v => v.toFixed(2)).join(','); }, 1500);
    },
    frame(dt) { frame(dt); autoStep(dt); for (const m of marks) UI.place(m.el, m.x, m.y, 2.2); FIGHT.hud(); FXUI.frame(dt); HUD.frame(); },
    // 화면 틀(hud.js)이 읽는 것: 층 · 지금 상태 · 금화 · 물자 · 파티(탐사 중 체력은 탐사 규칙 쪽 비율, 싸우는 동안은 엔진 쪽)
    view() {
      if (!R) return null;
      const T = R.turn, fighting = FIGHT.on;
      const party = R.party.map((a, i) => { const rm = st?.party[i], hp = fighting || !rm ? a.hp : Math.round(a.max * rm.hp / Math.max(1, rm.max)); return { a, m: a.merc, hp: Math.round(hp), max: a.max, dead: !!(a.dead || rm?.dead), cur: fighting && T?.cur === a }; });
      return { title: (iso || R.map)?.title || '', sub: fighting ? `${T?.round || 1}라운드` : PREPUI.active ? '문을 연다' : st?.done ? '끝' : '탐사', fighting, gold: st ? st.gold : null, items: st ? st.items : null, party };
    },
    // 시험 전투 (?fight=test): 복도로 들어와 방에서 적과 맞닥뜨려 싸운다 (탐사 규칙 없이)
    fightTest(r) {
      PMAP.hide(); R = r; FXUI.attach(R);
      const room = r.map.rooms.find(x => x.id === 'A') || r.map.rooms[0], n = { id: -1, type: 'fight', g: { label: '시험 전투', name: '적', count: r.mons.length, units: [] } };
      // 걸어 들어올 자리: 첫 사람은 방 입구 안쪽, 나머지는 그 뒤로 (진형을 맞추지 않는다)
      const intro = new Map(r.party.map((p, i) => [p, { x: room.x + 2 - (i ? 1.2 : 0), y: room.cy + (i === 1 ? -1.2 : i === 2 ? 1.2 : 0) }]));
      const tray = q.get('tray') || q.get('dice') != null; // 운명판 창은 ?tray · ?dice일 때만 (예시 장면은 판을 알아서 굴리고 작은 판만 띄운다)
      FIGHT.start(R, { n, intro, quiet: !tray, done: (win, F) => { const d = document.createElement('div'); d.className = 'record-stub'; d.innerHTML = `${win ? `시험 전투: 이겼다 (${F.round}라운드)` : '시험 전투: 졌다'} <button onclick="location.reload()">다시 보기</button>`; $('stage').append(d); } });
      if (q.get('dice') != null) FIGHT.dicePick(); if (q.get('auto')) autoN = 99; // ?dice=는 고르는 창 없이 그대로 넣는다
    },
    // 문 열기 시험 (?scene=door): 복도 끝으로 걸어와 잠긴 문을 저절로 연다(따기 → 걷어차기) → 열리면 그 자리에서 전투
    doorTest(r) {
      PMAP.hide(); R = r; FXUI.attach(R);
      const m = r.map, d = m.door, room = m.rooms.find(x => x.id === 'A'), n = { id: -1, type: 'fight', g: { label: '고블린 방', name: '적', count: r.mons.length, units: [] } };
      const intro = new Map(r.party.map((p, i) => [p, { x: d.x - 2.4 - (i ? 1.2 : 0), y: d.y + (i === 1 ? -1.1 : i === 2 ? 1.1 : 0) }]));
      PREPUI.open(R, { door: d, out: { x: -1, y: 0 }, locked: true, mons: r.mons.filter(x => x.hp > 0), items: { tools: 1 }, intro,
        reveal: () => { for (let y = room.y - 1; y <= room.y + room.h; y++) for (let x = room.x - 1; x <= room.x + room.w; x++) if (x >= 0 && y >= 0 && x < m.w && y < m.h) R.seen[y * m.w + x] = 1; R.seenVer = (R.seenVer || 0) + 1; },
        onOpen: S => { G.Encounter.applyPrep(R, S); FIGHT.start(R, { n, quiet: true, done: (win, F) => { const el = document.createElement('div'); el.className = 'record-stub'; el.innerHTML = `${win ? `문 앞 준비 시험: 이겼다 (${F.round}라운드)` : '문 열기 시험: 졌다'} <button onclick="location.reload()">다시 해 보기</button>`; $('stage').append(el); } }); } });
    },
    // 보상 시험 (?scene=reward): 파티를 한 레벨 올리고 전투 결과 → 레벨업 고르기 → 정예 3택1 → 기록 화면을 차례로
    rewardTest(r) {
      PMAP.hide(); R = r; const f = G.S.w.fantasy, mo = r.mons[0];
      const xp = r.party.filter(p => p.merc).map(p => { const lv0 = p.merc.lv; p.merc.xp = G.Guild.needOf(p.merc) - 1; return { p, lv0 }; });
      G.Guild.onKill(f, r, mo);
      const rows = xp.map(x => ({ ...x, lv: x.p.merc.lv, xp: x.p.merc.xp, need: G.Guild.needOf(x.p.merc) }));
      REWARDUI.show({ title: '시험 보상 — 이겼다 (4라운드)', gold: 37, xp: rows, loot: G.Reward.loot('elite', 3), big: G.Reward.bigOffer(f, r.party, 'elite'), type: 'elite', f }, () => {
        REWARDUI.record({ win: true, rooms: 7, fights: 4, elites: 1, boss: true, lv: Math.max(...r.party.map(p => p.merc?.lv || 1)), gold: 128, gain: 33, total: 33, fresh: G.Reward.UNLOCKS.filter(u => u.at <= 33).map(u => u.n) }, () => location.reload());
      });
      // ?step=N: 첫 단추를 N번 눌러 다음 창으로 (캡처용)
      let k = 0; const n = +q.get('step') || 0, tick = () => { if (k++ >= n) return; const b = $('reward')?.querySelector('.rw-cards button, .rw-go'); if (b) b.click(); setTimeout(tick, 250); }; setTimeout(tick, 400);
    },
    // 영입 시험 (?scene=recruit): 후보 셋 중 하나를 들인다 (파티 다섯이면 내보내기까지)
    recruitTest(r) { PMAP.hide(); R = r; FXUI.attach(R); recruit(m => { document.body.dataset.joined = m ? m.name : '-'; }, '동료 영입 (시험)'); },
    get st() { return st; },
  };
})();
