'use strict';
// 건물 창: 영지에서 건물을 누르면 연다. 지을 수 있는 단계와 그 건물의 일이 한 창에 있다
const TOWN = { el: null, tab: null, RN: ['흔함', '고급', '희귀', '매우 희귀', '전설'] };
const gpS = v => U.coin(v); // SRD 동전으로 나눠 (GP · SP · CP)
function openTown(tab) { if (TOWN.el && TOWN.tab === tab) { closeTown(); return; } TOWN.tab = tab; drawTown(); }
function closeTown() { TOWN.el?.remove(); TOWN.el = null; TOWN.tab = null; }
function drawTown() {
  let w = TOWN.el; if (!w) { w = TOWN.el = document.createElement('div'); w.id = 'shop'; document.body.append(w); }
  w.textContent = '';
  const k0 = TOWN.tab, lv0 = siteLv(k0), h = document.createElement('h4'), art = document.createElement('canvas'), ttl = document.createElement('span'), pips = document.createElement('small'), x = document.createElement('button');
  { const O = SITES[k0]; art.width = O.w + 16; art.height = 96; art.className = 'bart'; drawSite(art.getContext('2d'), O, (O.w + 16) / 2, 92, lv0, 1, false); }
  ttl.textContent = siteName(k0); if (k0 !== 'shop') { pips.textContent = '◆'.repeat(lv0) + '◇'.repeat(G.D.FAC[k0].max - lv0); ttl.append(pips); }
  x.className = 'mini'; x.textContent = '닫기'; x.onclick = closeTown; h.append(art, ttl, x); w.append(h);
  const list = document.createElement('div'); list.className = 'list'; w.append(list);
  const row = (name, sub, right, act) => { const r = document.createElement('button'); r.className = 'strow' + (TOWN.tutRow ? ' t-glow' : ''); TOWN.tutRow = false; r.disabled = !act; const a = document.createElement('b'); a.textContent = name; const s = document.createElement('small'); s.textContent = sub; const p = document.createElement('i'); p.textContent = right; r.append(a, s, p); if (act) r.onclick = () => { act(); drawTown(); }; list.append(r); };
  const GD = G.Guild;
  if (TOWN.tab === 'shop') {
    for (const q of G.Items.stock(f)) { if (q.use) { const u = G.Items.useOf(q.use); row(`🧪 ${u.n}`, `가방 ${G.Items.bag(f)[q.use] || 0}`, `구매 ${gpS(q.gp)}`, f.gold >= q.gp ? () => G.Items.buy(f, q) : null); } else { const A = G.D.ARTS[q.art]; row(`${A.ic} ${A.n}`, [TOWN.RN[A.r], ...A.props.map(p => G.Trinket.PROPS[p[0]]?.t(p[1], p[2], p[3], p[4]) || '').filter(Boolean)].join(' · '), `구매 ${gpS(q.gp)}`, f.gold >= q.gp ? () => G.Items.buy(f, q) : null); } }
    for (const t of G.Trinket.store(f)) { const d = G.Trinket.def(t); row(`${d.ic || '🔮'} ${d.n}`, TOWN.RN[d.r] || '', `판매 ${gpS(G.Trinket.price(f, t))}`, () => G.Items.sell(f, t)); }
  } else if (TOWN.tab === 'tavern') {
    list.append(Object.assign(document.createElement('small'), { className: 'capn', textContent: `신입 Lv ${GD.rank(f).cap + GD.fac(f, 'tavern')}까지 · 명단 ${f.mercs.length}/${GD.ROSTER_MAX}` }));
    GD.tavern(f).offers.forEach((o, i) => { const m = o.m, d = GD.def(m); TOWN.tutRow = o.tut; row(`${m.name} · ${G.Res.SPECIES[G.Res.species(m)].n} ${d.n}`, [`Lv ${m.lv}`, G.D.PERSONA[(m.pers || [])[0]]?.n].filter(Boolean).join(' · '), `고용 ${gpS(o.price)}`, f.gold >= o.price && f.mercs.length < GD.ROSTER_MAX ? () => GD.hire(f, i) : null); });
    if (!GD.tavern(f).offers.length) list.append(Object.assign(document.createElement('small'), { textContent: '후보 없음' }));
  } else if (TOWN.tab === 'temple' || TOWN.tab === 'pub') {
    const T0 = TOWN.tab === 'temple' && GD.fac(f, 'temple'), P0 = TOWN.tab === 'pub' && GD.fac(f, 'pub');
    const step = G.Tut.townStep(f);
    for (const m of GD.crew(f)) { const nm = m.name || '단장'; TOWN.tutRow = step === 'temple'; if (T0 && m.inj > 0) row(`${nm} · 치료`, `부상 ${Math.ceil(m.inj)}초`, gpS(GD.treatCost(m)), f.gold >= GD.treatCost(m) ? () => GD.treat(f, m) : null); TOWN.tutRow = step === 'pub'; if (P0 && m.stress > 0) { const done = m.drank === (f.lastHome || 0); row(`${nm} · 한잔`, `스트레스 ${Math.round(m.stress)} → ${Math.max(0, Math.round(m.stress) - 20 - 10 * P0)}`, done ? '오늘은 끝' : gpS(GD.drinkCost(m)), !done && f.gold >= GD.drinkCost(m) ? () => GD.drink(f, m) : null); } }
  }
  // 건물 단계: 지은 것 · 다음 것 · 그 위
  if (k0 !== 'shop') { const F0 = G.D.FAC[k0]; for (let i = 0; i < F0.max; i++) { const need = F0.need[i], c = Math.ceil(F0.base * Math.pow(F0.g, i)), done = i < lv0, next = i === lv0, low = (f.fameAll || 0) < need; row(`${i + 1}단계`, F0.d(i + 1), done ? '완성' : low ? `명성 ${need}` : gpS(c), next && GD.canBuild(f, k0) ? () => GD.build(f, k0) : null); if (done) list.lastChild.classList.add('done'); } }
}
// 영지 (DESIGN.md 143): 다키스트 던전의 흐름. 마을 그림에서 건물을 누르고, 명단은 늘 오른쪽에 있고, 출정을 눌러 원정 준비로 간다
const RAIL_W = 250;
const SITES = {
  hall: { x: .17, row: 0, w: 72, h: 34, wall: 'gray', roof: [92, 64, 58] },
  temple: { x: .5, row: 0, w: 56, h: 42, wall: 'church', roof: [66, 76, 104], sign: 's_temple' },
  train: { x: .83, row: 0, w: 64, h: 28, wall: 'brick', roof: [78, 70, 54], sign: 's_train' },
  tavern: { x: .13, row: 1, w: 60, h: 30, wall: 'brick', roof: [116, 58, 44], sign: 's_tavern' },
  pub: { x: .38, row: 1, w: 62, h: 32, wall: 'dark', roof: [110, 78, 40], sign: 's_pub', smoke: 1 },
  forge: { x: .63, row: 1, w: 58, h: 26, wall: 'gray', roof: [56, 54, 62], sign: 's_forge', smoke: 2 },
  shop: { x: .87, row: 1, w: 52, h: 22, tent: true, sign: 's_shop' },
};
const siteName = k => (k === 'shop' ? '상점' : G.D.FAC[k].n), siteLv = k => (k === 'shop' ? 1 : G.Guild.fac(f, k));
const HIMG = {}; for (const n of ['brick', 'gray', 'church', 'dark', 'grass', 'pebble', 'tree1', 'tree2', 'deadtree', 'fount0', 'fount1', 's_temple', 's_train', 's_tavern', 's_pub', 's_forge', 's_shop']) { const im = new Image(); im.src = `assets/dcss/t_${n}.png`; HIMG[n] = im; }
const ready = im => im && im.complete && im.naturalWidth > 0, hrnd = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }, rgbS = (c, k = 1) => `rgb(${c.map(v => Math.round(v * k))})`;
// 지붕 · 벽 · 문 · 창을 픽셀로 그린다. 단계가 오르면 층이 높아지고 창에 불이 켜진다. 0단계는 무너진 터
function drawSite(x, o, cx, base, l, t, hot) {
  const W = o.w, H = o.tent ? o.h : o.h + Math.max(0, l - 1) * 10, L = Math.round(cx - W / 2), top = base - H; x.imageSmoothingEnabled = false;
  const wallFill = (draw, tex, dark) => { x.save(); x.beginPath(); draw(); x.clip(); if (ready(HIMG[tex])) { x.fillStyle = x.createPattern(HIMG[tex], 'repeat'); x.fillRect(L - 4, top - 40, W + 8, H + 44); } else { x.fillStyle = '#555'; x.fillRect(L, top, W, H); } x.fillStyle = `rgba(10,10,22,${dark})`; x.fillRect(L - 4, top - 40, W + 8, H + 44); x.restore(); };
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(L - 2, base, W + 8, 3);
  if (l <= 0) { // 무너진 터
    const R = []; for (let i = 0; i <= 8; i++) R.push(14 + hrnd(cx, i) * 18 * (i % 3 === 1 ? .5 : 1));
    const path = () => { x.moveTo(L, base); for (let i = 0; i <= 8; i++) x.lineTo(L + W * i / 8, base - R[i]); x.lineTo(L + W, base); x.closePath(); };
    wallFill(path, o.wall || 'dark', .62); x.strokeStyle = hot ? '#ffd24a' : '#0a0a10'; x.lineWidth = 1; x.beginPath(); path(); x.stroke();
    x.fillStyle = '#08080e'; x.fillRect(Math.round(cx - 6), base - 13, 12, 13);
    for (let i = 0; i < 9; i++) { x.fillStyle = hrnd(i, cx) > .5 ? '#3b3a42' : '#2b2a31'; x.fillRect(L - 3 + hrnd(cx, i + 9) * (W + 6), base - 1 - hrnd(i, 4) * 2, 2 + hrnd(i, 7) * 3, 2); }
    return;
  }
  if (o.tent) { // 포장마차
    x.fillStyle = '#3a2a1c'; x.fillRect(L + 3, base - H, 3, H); x.fillRect(L + W - 6, base - H, 3, H);
    x.fillStyle = '#4b3524'; x.fillRect(L + 2, base - 10, W - 4, 10); x.fillStyle = '#2a1d13'; x.fillRect(L + 2, base - 10, W - 4, 1);
    for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#8c2f32' : '#c9b48a'; const a = L - 2 + i * (W + 4) / 7, b = (W + 4) / 7; x.beginPath(); x.moveTo(a, base - H + 3); x.lineTo(a + b, base - H + 3); x.lineTo(a + b - (i - 3) * .6, base - H - 12); x.lineTo(a - (i - 3) * .6 + 0, base - H - 12); x.fill(); }
    x.fillStyle = '#0a0a10'; x.fillRect(L - 2, base - H + 3, W + 4, 1);
  } else {
    const rH = Math.round(W * .36), roof = () => { x.moveTo(L - 4, top + 1); x.lineTo(cx, top - rH); x.lineTo(L + W + 4, top + 1); x.closePath(); };
    wallFill(() => x.rect(L, top, W, H), o.wall, .34);
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(L, top, 2, H); x.fillStyle = 'rgba(0,0,10,.3)'; x.fillRect(L + W - 4, top, 4, H); x.fillStyle = 'rgba(0,0,10,.35)'; x.fillRect(L, top, W, 3);
    if (o.smoke) { const c = cx + W * .24; x.fillStyle = '#2d2b33'; x.fillRect(c, top - rH + 2, 7, rH); x.fillStyle = '#17161c'; x.fillRect(c - 1, top - rH + 1, 9, 2); for (let i = 0; i < 5; i++) { const q = ((t * .35 + i * .2 + cx * .01) % 1), a = 1 - q; x.fillStyle = o.smoke === 2 ? `rgba(255,${130 + 70 * a | 0},70,${a * a * .32})` : `rgba(170,165,170,${a * .34})`; const s = 2 + q * 4; x.fillRect(c + 2 + Math.sin(q * 6 + i) * 3 * q - s / 2, top - rH - q * 26, s, s); } }
    x.fillStyle = rgbS(o.roof); x.beginPath(); roof(); x.fill();
    x.save(); x.beginPath(); roof(); x.clip(); for (let y = top - rH; y < top + 2; y += 3) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(L - 5, y, W + 10, 1); for (let a = L - 5 + ((y / 3 | 0) % 2) * 3; a < L + W + 5; a += 6) x.fillRect(a, y, 1, 3); } x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(cx, top - rH, W, rH + 2); x.restore();
    x.strokeStyle = '#0a0a10'; x.lineWidth = 1; x.beginPath(); roof(); x.stroke(); x.strokeRect(L + .5, top + .5, W - 1, H - 1);
    // 창: 단계만큼 불이 켜진다
    const fl = i => .72 + .28 * Math.sin(t * 3.1 + i * 2.4 + cx) * Math.sin(t * 1.7 + i);
    let wi = 0; for (let row = 0; row * 14 + 26 <= H + 8; row++) for (const a of [L + 8, L + W - 15]) { const y = base - 24 - row * 14; if (y < top + 4) continue; const lit = wi < l * 2; x.fillStyle = '#17120e'; x.fillRect(a - 1, y - 1, 9, 10); x.fillStyle = lit ? rgbS([255, 190, 92], fl(wi)) : '#23252f'; x.fillRect(a, y, 7, 8); x.fillStyle = '#17120e'; x.fillRect(a + 3, y, 1, 8); x.fillRect(a, y + 3, 7, 1); if (lit) { x.fillStyle = `rgba(255,180,80,${.09 * fl(wi)})`; x.fillRect(a - 3, y - 3, 13, 14); } wi++; }
    // 문
    x.fillStyle = '#0a0a10'; x.fillRect(Math.round(cx) - 7, base - 18, 14, 18); x.fillStyle = '#5e3c22'; x.fillRect(Math.round(cx) - 6, base - 17, 12, 17); x.fillStyle = '#3c2614'; for (let a = -3; a < 6; a += 4) x.fillRect(Math.round(cx) + a, base - 17, 1, 17); x.fillStyle = '#d8b050'; x.fillRect(Math.round(cx) + 3, base - 9, 1, 2);
    if (l >= 3) { x.fillStyle = '#0a0a10'; x.fillRect(cx, top - rH - 9, 1, 10); x.fillStyle = '#b5392b'; x.beginPath(); x.moveTo(cx + 1, top - rH - 9); x.lineTo(cx + 10 + Math.sin(t * 3) , top - rH - 7); x.lineTo(cx + 1, top - rH - 4); x.fill(); }
  }
  if (o.sign && ready(HIMG[o.sign])) { const a = o.tent ? Math.round(cx - 10) : L + W - 12, b = o.tent ? base - 28 : base - 22; x.drawImage(HIMG[o.sign], 12, 10, 20, 22, a, b, 20, 22); }
  if (hot) { x.fillStyle = 'rgba(255,220,130,.1)'; x.fillRect(L - 4, top - W * .36, W + 8, H + W * .36); }
}
const HAM = { cv: null, el: null, btns: {}, rail: null, bar: null, stage: 'hamlet', hot: null, S: 3, key: '', railK: '', t0: 0 };
function hamLayout() { const iw = innerWidth, ih = innerHeight, S = HAM.S = Math.max(2, Math.floor(ih / 225)), W = Math.ceil(iw / S), H = Math.ceil(ih / S), pw = (iw - RAIL_W) / S, rows = [Math.round(H * .58), Math.round(H * .87)]; return { S, W, H, pw, pos: k => ({ cx: Math.round(SITES[k].x * pw), base: rows[SITES[k].row] }) }; }
function paintHamlet(now) {
  const L = hamLayout(), cv = HAM.cv; if (cv.width !== L.W || cv.height !== L.H) { cv.width = L.W; cv.height = L.H; }
  const x = cv.getContext('2d'), { W, H } = L, hor = Math.round(H * .34), t = now / 1000; x.imageSmoothingEnabled = false;
  const g = x.createLinearGradient(0, 0, 0, hor); g.addColorStop(0, '#0d1022'); g.addColorStop(.7, '#2a2438'); g.addColorStop(1, '#4b3440'); x.fillStyle = g; x.fillRect(0, 0, W, hor + 2);
  for (let i = 0; i < 70; i++) { const a = hrnd(i, 1) * W, b = hrnd(i, 2) * hor * .8, tw = .35 + .4 * Math.abs(Math.sin(t * .6 + i)); x.fillStyle = `rgba(230,230,255,${tw})`; x.fillRect(a | 0, b | 0, 1, 1); }
  const mx = Math.round(L.pw * .72), my = Math.round(hor * .34); x.fillStyle = 'rgba(232,216,180,.08)'; x.beginPath(); x.arc(mx, my, 19, 0, 7); x.fill(); x.fillStyle = '#e4d6b2'; x.beginPath(); x.arc(mx, my, 10, 0, 7); x.fill(); x.fillStyle = '#c9b993'; x.fillRect(mx - 4, my - 3, 3, 2); x.fillRect(mx + 2, my + 2, 4, 2);
  for (const [c, amp, off, sd] of [['#1d1b2c', 15, 0, 3], ['#15141f', 10, 8, 7]]) { x.fillStyle = c; x.beginPath(); x.moveTo(0, hor + 3); for (let a = 0; a <= W + 8; a += 8) x.lineTo(a, hor + off - Math.abs(Math.sin(a * .019 + sd)) * amp - hrnd(a, sd) * 3); x.lineTo(W, hor + 3); x.fill(); }
  if (ready(HIMG.grass)) { x.fillStyle = x.createPattern(HIMG.grass, 'repeat'); x.fillRect(0, hor, W, H - hor); } const sh = x.createLinearGradient(0, hor, 0, H); sh.addColorStop(0, 'rgba(10,10,28,.72)'); sh.addColorStop(1, 'rgba(10,10,28,.42)'); x.fillStyle = sh; x.fillRect(0, hor, W, H - hor);
  const rowsY = [Math.round(H * .58), Math.round(H * .87)]; if (ready(HIMG.pebble)) { x.fillStyle = x.createPattern(HIMG.pebble, 'repeat'); for (const y of rowsY) x.fillRect(0, y + 2, W, 9); x.fillRect(Math.round(L.pw * .5) - 6, rowsY[0] + 2, 12, rowsY[1] - rowsY[0]); }
  const tree = (n, a, b) => { if (ready(HIMG[n])) { x.filter = 'brightness(.55) saturate(.8)'; x.drawImage(HIMG[n], a | 0, (b - 30) | 0); x.filter = 'none'; } };
  tree('tree2', L.pw * .32, hor + 8); tree('deadtree', L.pw * .68, hor + 10); tree('tree1', L.pw * .02, hor + 12); tree('tree2', L.pw * .94, hor + 14);
  const fn = (f.fameAll || 0) >= 100 ? 'fount1' : 'fount0'; if (ready(HIMG[fn])) x.drawImage(HIMG[fn], Math.round(L.pw * .5) - 16, rowsY[0] + 14);
  for (const k of ['hall', 'temple', 'train', 'tavern', 'pub', 'forge', 'shop']) { const p = L.pos(k); drawSite(x, SITES[k], p.cx, p.base, siteLv(k), t, HAM.hot === k); }
  const v = x.createRadialGradient(L.pw / 2, H * .6, H * .4, L.pw / 2, H * .6, W * .78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,8,.6)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
}
function hamBuild() {
  const el = HAM.el = document.createElement('div'); el.id = 'hamlet'; const cv = HAM.cv = document.createElement('canvas'); el.append(cv); cv.onclick = closeTown;
  for (const k of Object.keys(SITES)) { const b = document.createElement('button'); b.className = 'site'; b.onpointerenter = () => { HAM.hot = k; }; b.onpointerleave = () => { if (HAM.hot === k) HAM.hot = null; }; b.onclick = () => openTown(k); const lb = document.createElement('span'); b.append(lb); HAM.btns[k] = b; el.append(b); }
  HAM.bar = document.createElement('div'); HAM.bar.id = 'hbar'; el.append(HAM.bar);
  document.body.append(el);
  const r = HAM.rail = document.createElement('div'); r.id = 'rail'; document.body.append(r);
  addEventListener('keydown', e => { if (e.key === 'Escape' && TOWN.el) closeTown(); });
}
function hamPlace() {
  const L = hamLayout(), S = L.S;
  for (const k of Object.keys(SITES)) { const b = HAM.btns[k], o = SITES[k], l = siteLv(k), p = L.pos(k), up = (o.tent ? o.h + 12 : o.h + Math.max(0, l - 1) * 10 + o.w * .36); b.style.cssText = `left:${(p.cx - o.w / 2 - 4) * S}px;top:${(p.base - up) * S}px;width:${(o.w + 8) * S}px;height:${(up + 8) * S}px`; b.classList.toggle('ruin', l <= 0); const s = b.firstChild, tx = k === 'shop' ? '상점' : `${siteName(k)} ${l}/${G.D.FAC[k].max}`; if (s.textContent !== tx) s.textContent = tx; }
  const R = G.Guild.rank(f), t = `${R.n} · 명성 ${f.fameAll || 0}${R.next != null ? `/${R.next}` : ''} · ${gpS(f.gold)}`; if (HAM.bar.textContent !== t) HAM.bar.textContent = t;
}
// 명단: 영지에서는 누르면 상세, 원정 준비에서는 누르거나 판으로 끌어서 출전시킨다
function hamRail(plan) {
  const GD = G.Guild, line = G.Fantasy.lineup(f), crew = GD.crew(f), k = [plan, f.mercs.length, GD.ROSTER_MAX, line.join(), ...crew.map(m => [m.uid, m.lv, m.inj > 0, Math.round(m.stress || 0), m.name])].join();
  if (k === HAM.railK) return; HAM.railK = k; const r = HAM.rail; r.textContent = '';
  const h = document.createElement('h4'); h.textContent = plan ? `출전 ${line.length + 1}/${G.Fantasy.slots() + 1}` : `명단 ${f.mercs.length}/${GD.ROSTER_MAX}`; r.append(h);
  const list = document.createElement('div'); list.className = 'rl'; r.append(list);
  for (const m of crew) {
    const lead = m === GD.leader(f), on = lead || line.includes(m.uid), inj = m.inj > 0, b = document.createElement('button'), def = GD.def(m); b.className = 'rw' + (plan && on ? ' on' : '') + (inj ? ' inj' : ''); b.style.setProperty('--c', def.col);
    const face = shPortrait(m), tx = document.createElement('div'), nm = document.createElement('b'), sub = document.createElement('small'), st = document.createElement('i'), fill = document.createElement('u'); nm.textContent = m.name || '단장'; sub.textContent = `${G.Res.SPECIES[G.Res.species(m)].n} ${def.n} · Lv ${m.lv}`; fill.style.width = `${Math.min(100, m.stress || 0)}%`; if ((m.stress || 0) >= 70) fill.className = 'hot'; st.append(fill); tx.append(nm, sub, st); b.append(face, tx);
    if (inj) { const tag = document.createElement('em'); tag.textContent = '부상'; b.append(tag); } else if (plan && on && !lead) { const tag = document.createElement('em'); tag.className = 'go'; tag.textContent = '출전'; b.append(tag); }
    if (!plan) b.onclick = () => openSheet(m);
    else if (!lead && !inj) b.onpointerdown = ev => { ev.preventDefault(); railDrag(ev, m, b); }; else if (lead) b.onclick = () => openSheet(m);
    list.append(b);
  }
  const go = document.createElement('button'); go.className = 'embark'; go.textContent = plan ? '영지로' : '출정'; go.onclick = () => { closeTown(); HAM.stage = plan ? 'hamlet' : 'plan'; if (!plan) crewRedraw?.(); }; r.append(go);
}
function railDrag(ev, m, b) {
  const g = shPortrait(m); g.className = 'dragface'; g.style.left = ev.clientX + 'px'; g.style.top = ev.clientY + 'px'; let moved = false; document.body.append(g);
  const mv = e => { moved = true; g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; };
  addEventListener('pointermove', mv);
  addEventListener('pointerup', e => { removeEventListener('pointermove', mv); g.remove();
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('#brief .cell'), line = G.Fantasy.lineup(f);
    if (cell) { if (!line.includes(m.uid)) G.Fantasy.toggleMember(f, m.uid); if (G.Fantasy.lineup(f).includes(m.uid)) G.Fantasy.setCell(f, m.uid, +cell.dataset.c); }
    else if (document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.rw') === b || !moved) G.Fantasy.toggleMember(f, m.uid);
    crewRedraw?.(); }, { once: true });
}
// 매 틀 부른다. 돌려주는 값: 영지 화면이 떠 있는가 (원정 준비가 아니면 true)
function drawHamlet(show) {
  const tut = !G.Tut.townOpen(f);
  if (!f.town) HAM.stage = 'hamlet';
  document.body.classList.toggle('town', !!show && !tut);
  if (!show || tut) { if (HAM.el) { HAM.el.style.display = 'none'; HAM.rail.style.display = 'none'; } if (TOWN.el && !show) closeTown(); return false; }
  if (!HAM.el) hamBuild();
  const plan = HAM.stage === 'plan'; HAM.rail.style.display = ''; hamRail(plan);
  HAM.el.style.display = plan ? 'none' : ''; if (plan) return false;
  const n = performance.now(); if (n - HAM.t0 > 90) { HAM.t0 = n; paintHamlet(n); hamPlace(); }
  return true;
}
// 튜토리얼 (G.Tut.townStep): 돌아오면 할 일이 있는 건물이 차례로 빛난다 (신전 → 주점 → 모집소 → 출정). 열쇠의 벽이면 도감 단추도
setInterval(() => {
  const t = f.tut, step = G.Tut.townStep(f);
  for (const k in HAM.btns) HAM.btns[k].classList.toggle('t-glow', step === k);
  document.querySelector('#rail .embark')?.classList.toggle('t-glow', step === 'embark' && HAM.stage !== 'plan');
  const b = document.getElementById('cdxbtn'); if (b) b.classList.toggle('t-glow', !!(t && t.on && t.keyHint));
}, 500);
