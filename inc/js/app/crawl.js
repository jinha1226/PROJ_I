'use strict';
// 탐사 진행 (3단계): 지도 시제품의 탐사 규칙(RUN — js/explore)으로 한 층. 파티는 플레이어가 쿼터뷰에서 직접 움직인다.
// - 층: RUN.gen.make의 키운 던전(방 칸 · 복도 칸)을 쿼터뷰 타일로 2배 키워 옮긴다. 길은 양방향 — 되돌아갈 수 있다.
// - 이동: 바닥을 누르면 열린 곳 안에서 길을 찾아 걷는다. 열린 곳 = 들어가 본 방 + 지나간 통로 + 아직 안 지나간 출구의 문 앞.
//   (사용자, 2026-11-17: 「파티를 플레이어가 직접 움직이게 할거야 … 한번 열린 맵은 자유롭게 자유이동 가능하게」)
// - 안내 표지: 안 지나간 문 앞에 다가가면 열린다 → 고르면 통로를 지나 새 방으로 (그 통로는 그때부터 열린 곳).
//   구조물(야영 모닥불 · 상인)에 다가가면 그 장면이 열린다. 사건 · 전투는 방에 들어서면 바로.
// - 가 본 방은 도착 처리를 다시 하지 않는다 (보물 · 사건 · 야영은 한 번, 상인은 다시).
// - 전투는 아직 시제품의 임시 자동 전투(RUN.combat) 결과만 — 구역 전투는 4단계.
// - 미니맵: 시제품의 양피지 지도(RUN.draw)를 귀퉁이에 (지금 방 둘레), 누르거나 M으로 층 전체.
const CRAWL = (() => {
  const K = 2; // 지도 1칸 = 쿼터뷰 타일 2×2
  const KIND = { open: '통로', locked: '잠긴 문', trap: '함정 복도', dark: '어두운 길', hidden: '숨은 통로' };
  const ICON = { open: '›', locked: '🔒', trap: '⚠', dark: '●', hidden: '⋯', camp: '🔥', shop: '⚖' };
  const NEAR = 1.6; // 이만큼 다가가면 안내 표지 · 구조물이 열린다
  let st = null, iso = null, R = null, walk = null, marks = [], logN = 0, cutscene = false;
  let open = null, roomAt = null; // 열린 타일 · 타일 → 방
  const deferred = {}; // 방 id → 구조물 장면 (야영 · 상인)
  let nearKey = null; // 지금 열려 있는 표지의 대상 (멀어지면 닫는다)
  let doorTiles = new Set(); // 지금 방의 안 지나간 출구 문 칸 (거기까지는 걸어갈 수 있다)
  let fighting = null; // 쿼터뷰 전투 중: { n, acc, round, cur }
  // 시험용 ?auto=N: 아직 안 지나간 첫 출구로 걸어가 첫 선택지 · 첫 장면 선택을 N번 (연기 시험 · 캡처용). 화면 루프로 돈다
  let autoN = 0, autoT = 0;
  function autoStep(dt) {
    if (!autoN || st.done) return; autoT += dt; if (autoT < 0.4) return; autoT = 0;
    if (fighting) { const bb = $('dicebear')?.querySelector('button'); if (bb) return bb.click(); if ($('dicetray') && !q.get('hold')) $('dicetray').querySelector('.go').click(); return; }
    const b = $('crawlscene')?.querySelector('button:not([disabled])') || $('exitsign')?.querySelector('button[data-i="0"]');
    if (b) { if ($('exitsign')) autoN--; b.click(); return; }
    if (!walk && !cutscene) { const ex = exits().find(e => !e.e.walked); if (ex) moveTo(ex.door[0], ex.door[1]); }
  }
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tile = ([x, y]) => [x * K + 0.5, y * K + 0.5];
  const TI = (x, y) => Math.floor(y) * iso.w + Math.floor(x);
  const centerOf = id => { const b = st.map._lay.room[id], mx = b.x + b.w / 2 - 0.5, my = b.y + b.h / 2 - 0.5; let best = b.cells[0], bd = 1e9; for (const c of b.cells) { const d = (c[0] - mx) ** 2 + (c[1] - my) ** 2; if (d < bd) { bd = d; best = c; } } return tile(best); };
  const lead = () => R.party.find(p => !p.dead) || R.party[0];

  function toIso(m) {
    const L = m._lay, W = L.COLS * K, H = L.ROWS * K, c = new Array(W * H).fill('#'), ix = (x, y) => y * W + x;
    roomAt = new Int16Array(W * H).fill(-1);
    const put = ([x, y], v) => { for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) { const k = ix(x * K + i, y * K + j); c[k] = '.'; if (v != null && roomAt[k] < 0) roomAt[k] = v; } };
    for (const id in L.room) L.room[id].cells.forEach(p => put(p, +id));
    for (const id in L.cor) L.cor[id].cells.forEach(p => put(p, null));
    const rooms = m.nodes.map(n => { const b = L.room[n.id], [cx, cy] = centerOf(n.id); return { id: n.id, title: RUN.TYPE[n.type] || '', x: b.x * K, y: b.y * K, w: b.w * K, h: b.h * K, cx: Math.floor(cx), cy: Math.floor(cy), tags: ['hall'] }; });
    const start = rooms[0], end = rooms.find(r => m.nodes[r.id].type === 'boss') || rooms[rooms.length - 1];
    return { w: W, h: H, c, kindAt: new Uint8Array(W * H), poi: {}, passChars: '.>,', ver: 1, dist: {}, rooms, start, end, fixed: true, title: '심연 1층' };
  }

  // ── 열린 곳 (걸을 수 있는 타일) · 보이는 곳 ──
  function mark([x, y]) { for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) open[(y * K + j) * iso.w + x * K + i] = 1; }
  const openRoom = id => st.map._lay.room[id].cells.forEach(mark);
  const openCor = eid => st.map._lay.cor[eid].cells.forEach(mark);
  function refreshSeen() {
    // 열린 타일과 그 둘레 한 칸(벽 · 문)이 보인다
    const s = R.seen; s.fill(0);
    for (let k = 0; k < open.length; k++) if (open[k]) { const x = k % iso.w, y = (k / iso.w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < iso.w && Y < iso.h) s[Y * iso.w + X] = 1; } }
    R.seenVer = (R.seenVer || 0) + 1;
  }
  const walkable = k => !!open[k] || doorTiles.has(k);

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
  function doorsOf() { const s = new Set(); for (const ex of exits()) if (!ex.e.walked) s.add(TI(ex.door[0], ex.door[1])); return s; }

  // ── 길 찾기 (걸을 수 있는 타일 위, 8방향, 모서리는 깎지 않는다) ──
  function findPath(fx, fy, tx, ty) {
    const W = iso.w, H = iso.h, s = TI(fx, fy), g = TI(tx, ty);
    if (!walkable(g)) return null;
    const prev = new Int32Array(W * H).fill(-1); prev[s] = s; const q = [s];
    for (let h = 0; h < q.length; h++) {
      const k = q[h]; if (k === g) break; const x = k % W, y = (k / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const n = Y * W + X; if (prev[n] >= 0 || !walkable(n)) continue;
        if (dx && dy && (!walkable(y * W + X) || !walkable(Y * W + x))) continue;
        prev[n] = k; q.push(n);
      }
    }
    if (prev[g] < 0) return null;
    const pts = []; for (let k = g; k !== s; k = prev[k]) pts.unshift([k % W + 0.5, ((k / W) | 0) + 0.5]);
    return pts;
  }
  // 누른 곳 → 바닥 타일 (못 가는 곳이면 가까운 걸을 수 있는 칸으로)
  function tileAtScreen(clientX, clientY) {
    const rc = canvas.getBoundingClientRect(), sx = (clientX - rc.left) / rc.width * canvas.width, sy = (clientY - rc.top) / rc.height * canvas.height;
    const g = unproject(sx, sy); return [g.x / T + win.cx, g.y / T + win.cy];
  }
  function moveTo(tx, ty) {
    if (!walkable(TI(tx, ty))) { let best = null, bd = 10; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = tx + dx, Y = ty + dy; if (X < 0 || Y < 0 || X >= iso.w || Y >= iso.h) continue; if (walkable(TI(X, Y))) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [Math.floor(X) + 0.5, Math.floor(Y) + 0.5]; } } } if (!best) return false; [tx, ty] = best; }
    const L = lead(), pts = findPath(L.x, L.y, tx, ty); if (!pts) return false;
    nearKey = null; closeSign(); go(pts.length ? pts : [[tx, ty]], null); return true;
  }
  function onTap(ev) {
    if (cutscene || fighting || $('crawlscene') || $('dicepick') || st.done) return;
    const [tx, ty] = tileAtScreen(ev.clientX, ev.clientY); moveTo(tx, ty);
  }

  // ── 걷기 ──
  const trail = [];
  function go(pts, then) { walk = { pts, i: 0, then }; }
  function frame(dt) {
    if (!R) return;
    if (fighting) return fightFrame(dt);
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
    st.at = id; st.path.push(id); st.here = {}; doorTiles = doorsOf(); showMarks(); drawMap(); document.body.dataset.room = st.at;
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
      const k = kindOf(ex.e), el = document.createElement('div');
      el.className = 'exitmark'; el.innerHTML = `<b>${ICON[k] || '›'}</b><small>${esc(KIND[k] || '통로')}</small>`;
      el.onclick = () => moveTo(ex.door[0], ex.door[1]);
      $('floats').append(el); marks.push({ el, x: ex.door[0], y: ex.door[1] });
    }
    const sc = deferred[st.at];
    if (sc) { const [x, y] = centerOf(st.at), el = document.createElement('div'); el.className = 'exitmark struct'; el.innerHTML = `<b>${ICON[sc.kind] || '★'}</b><small>${esc(sc.title)}</small>`; el.onclick = () => moveTo(x, y); $('floats').append(el); marks.push({ el, x, y }); }
  }
  function place(el, x, y, z) { const rc = canvas.getBoundingClientRect(), sb = $('stage').getBoundingClientRect(), a = project(wx(x), wy(y), z); el.style.transform = `translate(${Math.round(rc.left - sb.left + a.sx / W * rc.width)}px,${Math.round(rc.top - sb.top + a.sy / H * rc.height)}px) translate(-50%,-100%)`; }
  function closeSign() { const s = $('exitsign'); if (s) s.remove(); }
  function sign(ex) {
    closeSign();
    const n = st.map.nodes[ex.to], k = kindOf(ex.e), acts = n.visited ? [{ label: '지나간다', run: null }] : RUN.moveActs(st, ex.ed);
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
  function say() {
    const lines = st.log.slice(logN); logN = st.log.length; if (!lines.length) return;
    const dm = $('dm'); dm.textContent = lines.map(l => l.t).join(' '); dm.classList.remove('hidden'); clearTimeout(say.t); say.t = setTimeout(() => dm.classList.add('hidden'), 3800 + lines.length * 900);
  }
  function arrived() {
    document.body.dataset.room = st.at; document.body.dataset.moves = (+(document.body.dataset.moves || 0) + 1);
    if (st.combat) { const c = st.combat; st.log.push({ t: `전투 ${c.rounds.length}라운드 — ${c.win ? '이겼다' : '졌다'}.` }); st.combat = null; }
    // 야영 · 상인은 구조물로: 다가가면 연다
    if (st.scene && (st.scene.kind === 'camp' || st.scene.kind === 'shop')) { deferred[st.at] = st.scene; st.scene = null; }
    say(); doorTiles = doorsOf(); drawMap();
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


  // ── 쿼터뷰 전투: 옛 본 게임의 SRD 턴제 전투(G.Turn · G.Flow)를 그 방에서 돌린다 + 라운드 주사위 ──
  // 파티 체력은 탐사 규칙(RUN)의 파티와 쿼터뷰 인물을 차례로 맞춘다 (파이터 ↔ 단장, 위저드 ↔ 위저드, 클레릭 ↔ 클레릭)
  const pair = () => R.party.map((p, i) => [p, st.party[i]]).filter(([p, m]) => p && m);
  function syncToG() { for (const [p, m] of pair()) { if (m.dead) { p.hp = 0; p.dead = true; } else p.hp = Math.max(1, Math.round(p.max * m.hp / m.max)); } }
  function syncToRUN() { for (const [p, m] of pair()) { const hp = Math.max(0, p.hp); m.hp = Math.round(m.max * hp / p.max); if (p.dead || hp <= 0) { m.hp = 0; m.dead = true; } } }
  const monName = n => (G.D.F.mon[n] ? n : Object.keys(G.D.F.mon).find(k => k.includes(n)) || Object.keys(G.D.F.mon).find(k => k.includes(n.slice(0, 2))) || '고블린 졸개');
  function startFight(n, mod) {
    clearMarks(); closeSign(); syncToG();
    const L = lead(), cells = st.map._lay.room[n.id].cells.map(tile).sort((a, b) => Math.hypot(b[0] - L.x, b[1] - L.y) - Math.hypot(a[0] - L.x, a[1] - L.y));
    const units = n.g.units || [[n.g.name, n.g.count]]; let k = 0;
    for (const [name, cnt] of units) for (let i = 0; i < cnt; i++) { const [x, y] = cells[(k++ * 3) % Math.max(1, cells.length)] || [L.x + 3, L.y]; const nm = monName(name); G.Fantasy.spawnMon(R, 1, { n: nm, ...G.D.F.mon[nm] }, x, y, false, { aggro: true, spotted: true, major: true, boss: n.type === 'boss' } /* major: 옛 G.Flow가 층 시작에 major 아닌 몬스터를 치운다 */); }
    R.turn = null; R.phase = 'explore'; G.S.w.fantasy.town = false; G.Fantasy.refreshEnts(R); if (G.Sight?.update) G.Sight.update(R);
    G.Dice.party = () => R.party.filter(p => !p.dead && p.hp > 0); G.Dice.cur = () => R.turn?.cur || null; G.Dice.st = null;
    fighting = { n, mod, acc: 0, round: 0, cur: null, t: 0 };
    st.log.push({ t: `${n.g.label} — 전투가 시작된다.` }); say();
  }
  function fightFrame(dt) {
    const F = fighting, T = R.turn; F.t += dt;
    // 새 라운드: (죽음의 주사위가 있으면 맡을 사람부터) 주사위를 굴리고 트레이에서 기다린다
    if (T && T.round !== F.round) { F.round = T.round; if (G.Dice.loadout.includes('doom')) bearerPick(); else { G.Dice.newRound(T.round); tray(); } }
    if ($('dicebear') || (G.Dice.st && !G.Dice.st.ready)) return; // 플레이어를 기다린다
    // 차례가 바뀌었다: 앞 사람의 내성 뒤집기를 끝내고, 즉사 면을 받은 사람이면 쓰러진다
    if (T && T.cur !== F.cur) { if (F.cur) G.Dice.turnEnd(F.cur); F.cur = T.cur; const r = T.cur && G.Dice.dieOf(T.cur); if (r && r.special === 'death' && !T.cur.dead) { T.cur.hp = 0; T.cur.dead = true; T.cur.dying = false; st.log.push({ t: `죽음의 주사위가 ${T.cur.merc?.name || '동료'}를 데려갔다.` }); say(); G.Fantasy.refreshEnts(R); } }
    F.acc += dt; let n = 0; while (F.acc >= 0.1 && n++ < 4) { G.tick(0.1); F.acc -= 0.1; }
    const foes = R.mons.filter(m => m.hp > 0), ps = R.party.filter(p => !p.dead && p.hp > 0);
    document.body.dataset.fight = `${F.round}r:${foes.length}foes:${ps.length}ps`;
    if (!ps.length) return endFight(false);
    if (!foes.length || F.t > 600) return endFight(true);
  }
  function endFight(win) {
    const F = fighting, n = F.n; fighting = null; G.Dice.st = null; closeTray(); R.turn = null;
    document.body.dataset.fights = (+(document.body.dataset.fights || 0) + 1) + (win ? 'w' : 'l'); delete document.body.dataset.fight;
    syncToRUN(); n.hostile = false;
    if (!win || !st.party.some(m => !m.dead)) { st.done = 'lose'; st.log.push({ t: '탐사대가 전멸했다.' }); say(); return end(); }
    if (n.type === 'boss') { st.done = 'win'; st.log.push({ t: `${n.g.name}가 쓰러졌다. 이 층의 지도가 완성됐다.` }); say(); drawMap(); return end(); }
    const gold = n.type === 'elite' ? 35 + RUN.d(st.rng, 15) : 6 + n.g.count * 2 + (n.g.tier === 'heavy' ? 15 : 0); st.gold += gold;
    st.log.push({ t: `전투에서 이겼다 (${F.round}라운드). 전리품: 금화 ${gold}.` }); say();
    const L = lead(); trail.length = 0; trail.push([L.x, L.y]);
    refreshSeen(); doorTiles = doorsOf(); drawMap(); showMarks();
  }
  // 죽음의 주사위를 맡을 사람 (굴리기 전에)
  function bearerPick() {
    const ps = G.Dice.party(), sug = G.Dice.suggestBearer(), box = document.createElement('div'); box.id = 'dicebear';
    box.innerHTML = '<h4>죽음의 주사위를 누가 맡나</h4><p>20 · 20 · 20 · 20 · 즉사 — 즉사가 나오면 맡은 사람이 쓰러진다.</p>' + ps.map((p, i) => `<button data-i="${i}" class="${p === sug ? 'sug' : ''}">${esc(p.merc?.name || '동료')}${p === sug ? ' <small>추천</small>' : ''}</button>`).join('');
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; G.Dice.bearer = ps[+b.dataset.i]; box.remove(); G.Dice.newRound(R.turn.round); tray(); };
    $('stage').append(box);
  }
  // 주사위 트레이: 다시 굴릴 주사위 고르기(라운드당 한 번) · 사람끼리(또는 예비와) 맞바꾸기 · 진행
  let pickSw = null;
  function closeTray() { const t = $('dicetray'); if (t) t.remove(); }
  function tray() {
    closeTray(); const S = G.Dice.st, ps = G.Dice.party(), sel = new Set(), box = document.createElement('div'); box.id = 'dicetray'; pickSw = null;
    const face = r => (r.special === 'death' ? '☠' : r.value);
    const draw = () => {
      const row = (p, who) => { const i = who === 'spare' ? S.spare : S.alloc.get(p), r = i == null ? null : S.dice[i]; return `<button class="dp${pickSw === who ? ' on' : ''}${r && r.kind === 'doom' ? ' doom' : ''}" data-w="${who}"><span>${esc(who === 'spare' ? '예비' : p.merc?.name || '동료')}</span><b class="die k-${r ? r.kind : ''}">${r ? face(r) : '–'}</b></button>`; };
      box.innerHTML = `<div class="hd">${S.round}라운드 주사위 <small>${S.rerolled ? '다시 굴림 끝' : '다시 굴릴 주사위를 눌러 고르기'} · 이름 둘을 눌러 맞바꾸기</small></div>` +
        `<div class="dice">${S.dice.map((r, i) => `<b class="die k-${r.kind}${sel.has(i) ? ' sel' : ''}" data-d="${i}" title="${esc(G.Dice.KINDS[r.kind].n)}">${face(r)}</b>`).join('')}</div>` +
        `<div class="who">${ps.map((p, i) => row(p, String(i))).join('')}${S.spare != null ? row(null, 'spare') : ''}</div>` +
        `<div class="bar"><button class="rr"${S.rerolled || !sel.size ? ' disabled' : ''}>다시 굴리기</button><button class="go">진행</button></div>`;
    };
    box.onclick = ev => {
      const t = ev.target.closest('[data-d],[data-w],.rr,.go'); if (!t) return;
      if (t.dataset.d != null) { if (S.rerolled) return; const i = +t.dataset.d; sel.has(i) ? sel.delete(i) : sel.add(i); }
      else if (t.dataset.w != null) { const w = t.dataset.w; if (pickSw == null) pickSw = w; else { if (pickSw !== w) G.Dice.swap(pickSw === 'spare' ? 'spare' : ps[+pickSw], w === 'spare' ? 'spare' : ps[+w]); pickSw = null; } }
      else if (t.classList.contains('rr')) { G.Dice.reroll([...sel]); sel.clear(); }
      else if (t.classList.contains('go')) { S.ready = true; box.remove(); return; }
      draw();
    };
    draw(); $('stage').append(box);
  }
  // 원정 전: 특수 주사위 고르기 (2개까지). ?dice=gamble,doom 이면 그대로, ?auto면 건너뛴다
  function dicePick() {
    if (q.get('dice') != null) { G.Dice.loadout = q.get('dice').split(',').filter(k => G.Dice.KINDS[k] && k !== 'd20').slice(0, 2); return; }
    if (q.get('auto')) return;
    const box = document.createElement('div'), sel = []; box.id = 'dicepick';
    const SP = ['gamble', 'doom', 'steady', 'twin'], faces = k => (G.Dice.KINDS[k].faces ? G.Dice.KINDS[k].faces.map(f => (f === 'death' ? '☠' : f)).join(' · ') : k === 'twin' ? 'd20 두 번 중 높은 쪽' : '');
    const draw = () => { box.innerHTML = `<h3>특수 주사위</h3><p>둘까지 골라 간다. 라운드 주사위에 섞인다.</p>${SP.map(k => `<button data-k="${k}" class="${sel.includes(k) ? 'on' : ''}"><b class="die k-${k}">${k === 'doom' ? '☠' : k === 'gamble' ? '20' : k === 'steady' ? '10' : '↑'}</b><span>${esc(G.Dice.KINDS[k].n)}<small>${esc(faces(k))}</small></span></button>`).join('')}<button class="go">출발${sel.length ? ` (${sel.length})` : ' (보통 주사위만)'}</button>`; };
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; if (b.classList.contains('go')) { G.Dice.loadout = sel.slice(); box.remove(); return; } const k = b.dataset.k, i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else if (sel.length < 2) sel.push(k); draw(); };
    draw(); $('stage').append(box);
  }

  // ── 양피지 미니맵: 작게 볼 때는 지금 방 둘레, 누르면 층 전체 ──
  function drawMap() {
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
  function toggleMap(ev) { if (ev) ev.stopPropagation(); const box = $('pmapbox'), svg = $('pmap'); if (!box) return; box.classList.toggle('big'); if (box.classList.contains('big')) svg.setAttribute('viewBox', svg.dataset.full); else zoom(svg); }

  return {
    // 층을 만들고 쿼터뷰 지도를 돌려준다
    start(seed) { st = RUN.newRun(seed, ['fighter', 'wizard', 'cleric']); logN = 0; iso = toIso(st.map); open = new Uint8Array(iso.w * iso.h); return iso; },
    // 세계가 서면: 파티를 입구에, 입구 방을 연다, 누르기 · 표지
    attach(r) {
      R = r; R.seen = new Uint8Array(iso.w * iso.h);
      const [x, y] = centerOf(st.at); r.party.forEach((p, i) => { p.x = x - 0.6 * i; p.y = y + 0.3 * i; p._dx = p._rx = p.x; p._dy = p._ry = p.y; });
      openRoom(st.at); refreshSeen(); doorTiles = doorsOf();
      canvas.addEventListener('pointerup', onTap);
      const box = $('pmapbox'); if (box) box.onclick = toggleMap;
      addEventListener('keydown', e => { if (e.key === 'm' || e.key === 'M') toggleMap(); });
      drawMap(); say(); showMarks(); document.body.dataset.room = st.at; dicePick();
      // 시험용 ?auto=N: 아직 안 지나간 첫 출구로 걸어가 첫 선택지 · 첫 장면 선택을 N번 (연기 시험 · 캡처용)
      autoN = +q.get('auto') || 0;
      // 시험용 ?tap=x,y: 그 타일을 화면 좌표로 바꿔 누른 것처럼 (화면 ↔ 타일 변환 확인)
      if (q.get('tap')) setTimeout(() => { const [tx, ty] = q.get('tap').split(',').map(Number), a = project(wx(tx), wy(ty), 0), rc = canvas.getBoundingClientRect(); const cx = rc.left + a.sx / canvas.width * rc.width, cy = rc.top + a.sy / canvas.height * rc.height, back = tileAtScreen(cx, cy); document.body.dataset.tap = back.map(v => v.toFixed(2)).join(','); }, 1500);
    },
    frame(dt) { frame(dt); autoStep(dt); for (const m of marks) place(m.el, m.x, m.y, 2.2); },
    get st() { return st; },
  };
})();
