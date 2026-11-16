'use strict';
// 양피지 던전 지도 (ROGUELIKE_PLAN 4-2 · 4-6): 펜으로 그린 칸 지도.
// 캐릭터 그림(LAYERLAB 2D Minimal)의 굵은 외곽선 · 평평한 색에 맞춘다: 벽은 굵은 갈색 잉크, 벽 바깥은 펜 빗금,
// 방 기호는 굵은 외곽선 아이콘. 잉크 = 다녀온 곳, 연필 = 정찰 · 다음 길, 안개 칸 = 모르는 방(모두 3×3).
RUN.draw = (() => {
  const T = 13, M = 6;
  const INK = '#2b1d14', PEN = '#7b6852', RUST = '#a0412d', FLOOR = '#f8eed6', HALO = '#f3e4c3';
  const f = v => v.toFixed(1);
  // 꼭짓점마다 같은 떨림: 이웃한 벽 조각이 끊기지 않고 이어진다
  const jv = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return [((h & 255) / 255 - 0.5) * 1.4, (((h >>> 8) & 255) / 255 - 0.5) * 1.4]; };
  const P = (x, y) => { const [a, b] = jv(x, y); return `${f(M + x * T + a)},${f(M + y * T + b)}`; };
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const RANK = { fog: 1, pen: 2, ink: 3 };
  const O = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

  // 굵은 외곽선 아이콘 (캐릭터 그림체에 맞춘다). (x, y) = 가운데, 크기 약 16
  const ICON = {
    fight: (x, y) => `<g ${O} fill="none"><path d="M${x - 6},${y + 6} L${x + 6},${y - 6} M${x + 6},${y + 6} L${x - 6},${y - 6}" stroke-width="2.6"/><path d="M${x - 7},${y + 2} L${x - 2},${y + 7} M${x + 7},${y + 2} L${x + 2},${y + 7}"/></g>`,
    elite: (x, y) => `<g ${O}><path d="M${x - 7},${y} a7,7 0 1 1 14,0 v3 h-3 v3 h-8 v-3 h-3 Z" fill="#efe6d6"/><circle cx="${x - 3}" cy="${y}" r="1.8" fill="${INK}"/><circle cx="${x + 3}" cy="${y}" r="1.8" fill="${INK}"/></g>`,
    boss: (x, y) => `<g ${O}><path d="M${x - 7},${y - 3} l-3,-6 l6,3 M${x + 7},${y - 3} l3,-6 l-6,3" fill="#c9b8a0"/><path d="M${x - 7},${y} a7,7 0 1 1 14,0 v3 h-3 v3 h-8 v-3 h-3 Z" fill="#efe6d6"/><circle cx="${x - 3}" cy="${y}" r="1.8" fill="${RUST}"/><circle cx="${x + 3}" cy="${y}" r="1.8" fill="${RUST}"/></g>`,
    camp: (x, y) => `<g ${O}><path d="M${x - 7},${y + 6} L${x + 7},${y + 2} M${x + 7},${y + 6} L${x - 7},${y + 2}" stroke="#5a3a22" stroke-width="3"/><path d="M${x},${y - 8} C${x + 6},${y - 2} ${x + 5},${y + 4} ${x},${y + 4} C${x - 5},${y + 4} ${x - 6},${y - 2} ${x},${y - 8} Z" fill="#f2a33a"/></g>`,
    shop: (x, y) => `<g ${O}><path d="M${x - 4},${y - 5} h8 l-2,3 a7,6 0 1 1 -4,0 Z" fill="#c99a5b"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="8" font-weight="700" fill="${INK}" stroke="none">$</text></g>`,
    treasure: (x, y) => `<g ${O}><rect x="${x - 7}" y="${y - 2}" width="14" height="8" fill="#b5824e"/><path d="M${x - 7},${y - 2} a7,5 0 0 1 14,0 Z" fill="#c99a5b"/><circle cx="${x}" cy="${y + 1}" r="1.8" fill="#e2b33c"/></g>`,
    event: (x, y) => `<g ${O}><circle cx="${x}" cy="${y}" r="7" fill="#f0d27a"/><path d="M${x},${y - 4} v4" stroke-width="2.4"/><circle cx="${x}" cy="${y + 3.5}" r="0.6" fill="${INK}"/></g>`,
    start: (x, y) => `<g ${O} fill="#d8c3a0"><path d="M${x - 7},${y + 6} h14 v-4 h-4 v-4 h-4 v-4 h-6 Z"/></g>`,
  };

  // 방 장식 (dungeongen · One Page Dungeon식): 기둥 · 물웅덩이 · 돌무더기 · 계단 · 제단 · 상자
  const DECOR = {
    pillar: (x, y, o, ink) => `<circle cx="${f(x)}" cy="${f(y)}" r="3.6" fill="${ink ? '#6b5440' : '#b9a68a'}" stroke="${ink ? INK : PEN}" stroke-width="${ink ? 1.8 : 1}"/>`,
    pool: (x, y, o, ink) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(o.r * T)}" fill="#9cc3c4" fill-opacity="${ink ? 0.9 : 0.5}" stroke="${ink ? INK : PEN}" stroke-width="${ink ? 1.8 : 1}"/><path d="M${f(x - o.r * T * 0.5)},${f(y)} q${f(o.r * T * 0.25)},-3 ${f(o.r * T * 0.5)},0 t${f(o.r * T * 0.5)},0" fill="none" stroke="#5f8f91" stroke-width="1"/>`,
    rubble: (x, y, o, ink) => `<g fill="${ink ? '#8b735a' : '#c4b294'}" stroke="${ink ? INK : PEN}" stroke-width="0.8"><circle cx="${f(x - 2)}" cy="${f(y + 1)}" r="1.8"/><circle cx="${f(x + 2)}" cy="${f(y - 1)}" r="1.4"/><circle cx="${f(x + 1)}" cy="${f(y + 3)}" r="1.1"/></g>`,
    stairs: (x, y, o, ink) => `<g stroke="${ink ? INK : PEN}" stroke-width="1.2" fill="none">${[0, 1, 2, 3, 4].map(i => `<line x1="${f(x - 6 + i * 3)}" y1="${f(y - 6)}" x2="${f(x - 6 + i * 3)}" y2="${f(y + 6)}"/>`).join('')}<rect x="${f(x - 7)}" y="${f(y - 7)}" width="15" height="14" fill="none"/></g>`,
    altar: (x, y, o, ink) => `<rect x="${f(x - 6)}" y="${f(y - 3.5)}" width="12" height="7" rx="1" fill="${ink ? '#c9b8a0' : '#e4d8c2'}" stroke="${ink ? INK : PEN}" stroke-width="${ink ? 1.8 : 1}"/>`,
    chest: () => '',
  };

  function render(svg, st, anim = {}) {
    const map = st.map, N = map.nodes, L = RUN.layout.make(map), here = st.at;
    const nextIds = new Set(RUN.nexts(st).map(x => x.n.id));
    for (const id of nextIds) N[id].seenMap = true;
    const shown = n => n.visited || n.seenMap || n.info >= 2;
    const W = M * 2 + L.COLS * T, H = M * 2 + L.ROWS * T;
    // ── 칸 모으기: 상태(잉크 · 연필 · 안개)와 구역(방 번호 · 복도) ──
    const cells = new Map(), key = (x, y) => x + ',' + y;
    const put = (x, y, s, reg, dark) => { const k = key(x, y), c = cells.get(k); if (!c || RANK[s] > RANK[c.s]) cells.set(k, { x, y, s, reg, dark: dark || (c && c.dark) }); else if (dark) c.dark = true; };
    const boxOf = n => { const b = L.room[n.id]; if (n.visited || n.info >= 2) return b; const x = Math.round(b.x + (b.w - 3) / 2), y = Math.round(b.y + (b.h - 3) / 2), cells = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) cells.push([x + i, y + j]); return { x, y, w: 3, h: 3, cells, fog: true }; };
    for (const n of N) { if (!shown(n)) continue; const b = boxOf(n), s = n.visited ? 'ink' : b.fog ? 'fog' : 'pen'; for (const [x, y] of b.cells) put(x, y, s, 'r' + n.id); }
    const doors = [], marks = [], trails = [], secrets = [];
    for (const e of map.edges) {
      const A = N[e.a], B = N[e.b], c = L.cor[e.id];
      if (e.kind === 'hidden' && !e.seen.hidden) continue;
      if (e.kind === 'hidden') secrets.push({ e, c });
      const fromHere = e.a === here && nextIds.has(e.b), link = (A.visited && shown(B)) || (st.revealAll && shown(A) && shown(B));
      if (!e.walked && !fromHere && !link) continue;
      const s = e.walked ? 'ink' : 'pen', dark = e.kind === 'dark' && e.seen.dark;
      for (const [x, y] of c.cells) put(x, y, s, 'c', dark);
      doors.push({ at: c.doorA, out: c.doorAout, s, kind: e.kind === 'hidden' ? 'secret' : 'plain' });
      const end = c.cells[c.cells.length - 1];
      if (!boxOf(B).fog) doors.push({ at: c.doorB, out: c.doorBout, s, kind: e.kind === 'locked' && e.seen.lock ? (e.opened ? 'open' : 'locked') : 'plain' });
      else { const fb = boxOf(B); const [ox, oy] = c.doorBout; let best = null; for (const [x, y] of fb.cells) { const dd = Math.abs(x - ox) + Math.abs(y - oy); if (!best || dd < best.d) best = { d: dd, x, y }; }
        // 안개 칸까지 연필 복도를 잇는다 (실제 방 모양은 숨긴다)
        let [x, y] = [ox, oy]; while (best && (x !== best.x || y !== best.y) && Math.abs(x - best.x) + Math.abs(y - best.y) > 1) { if (x !== best.x) x += Math.sign(best.x - x); else y += Math.sign(best.y - y); put(x, y, s, 'c', dark); }
        if (best) doors.push({ at: [best.x, best.y], out: [x, y], s, kind: e.kind === 'locked' && e.seen.lock ? 'locked' : 'plain' }); }
      if (e.kind === 'locked' && e.seen.lock && !e.opened) marks.push({ x: end[0], y: end[1], t: '잠김' });
      if (e.kind === 'trap' && e.seen.trap) { const m = c.cells[Math.floor(c.cells.length / 2)]; marks.push({ x: m[0], y: m[1], t: 'T', sym: true }); }
      if (e.walked) trails.push({ e, c });
    }
    const isDoor = (a, b) => doors.some(d => (d.at[0] === a.x && d.at[1] === a.y && d.out[0] === b.x && d.out[1] === b.y) || (d.at[0] === b.x && d.at[1] === b.y && d.out[0] === a.x && d.out[1] === a.y));
    // 둥근 방은 칸 계단 대신 진짜 원으로 그린다 (One Page Dungeon식)
    const roundReg = new Set(N.filter(n => shown(n) && !boxOf(n).fog && L.room[n.id].kind === 'round').map(n => 'r' + n.id));
    // 벽 선분 모으기: 바닥이 아닌 칸이나 다른 구역과 맞닿은 변 (문은 열어 둔다). 진한 쪽이 그린다
    const walls = { ink: [], pen: [], fog: [] };
    for (const c of cells.values()) for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const o = cells.get(key(c.x + dx, c.y + dy));
      if (o && o.reg === c.reg) continue;
      if (roundReg.has(c.reg) && !(o && o.reg === 'c')) continue;
      if (o && isDoor(c, o)) continue;
      if (o && (RANK[o.s] > RANK[c.s] || (RANK[o.s] === RANK[c.s] && (o.x < c.x || o.y < c.y)))) continue;
      const x0 = dx === 1 ? c.x + 1 : c.x, y0 = dy === 1 ? c.y + 1 : c.y, x1 = dy ? x0 + 1 : x0, y1 = dx ? y0 + 1 : y0;
      walls[c.s].push(`M${P(x0, y0)} L${P(x1, y1)}`);
    }
    // ── 그리기 ──
    const out = [];
    out.push(`<defs>
      <radialGradient id="parch" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#f4e6c4"/><stop offset="0.65" stop-color="#ead4a6"/><stop offset="1" stop-color="#c49a62"/></radialGradient>
      <filter id="stain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="${map.seed % 97}"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.15  0 0 0 -1.6 1.05"/></filter>
      <filter id="fiber" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.4  0 0 0 0 0.28  0 0 0 0 0.15  0 0 0 0.12 0"/></filter>
      <pattern id="hatch" width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4.5" stroke="#6b4f35" stroke-width="1"/></pattern>
      <pattern id="dots" width="${T}" height="${T}" patternUnits="userSpaceOnUse" x="${M}" y="${M}"><circle cx="0" cy="0" r="0.75" fill="#9a7b58" opacity="0.6"/></pattern>
      <pattern id="fog" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="5" stroke="${PEN}" stroke-width="0.7" opacity="0.55"/></pattern></defs>`);
    out.push(`<rect width="${f(W)}" height="${f(H)}" fill="url(#parch)"/><rect width="${f(W)}" height="${f(H)}" filter="url(#stain)" opacity="0.35"/><rect width="${f(W)}" height="${f(H)}" filter="url(#fiber)"/>`);
    // 벽 바깥 펜 빗금 (바닥이 안쪽 절반을 덮는다)
    out.push(`<path d="${walls.pen.join(' ')}" fill="none" stroke="url(#hatch)" stroke-width="9" stroke-linecap="round" opacity="0.45"/>`);
    out.push(`<path d="${walls.ink.join(' ')}" fill="none" stroke="url(#hatch)" stroke-width="13" stroke-linecap="round" opacity="0.85"/>`);
    // 바닥
    for (const c of cells.values()) {
      if (roundReg.has(c.reg)) continue;
      const x = M + c.x * T, y = M + c.y * T, fill = c.dark ? '#d9c39b' : c.s === 'fog' ? '#efdfbb' : FLOOR;
      out.push(`<rect x="${f(x)}" y="${f(y)}" width="${T + 0.3}" height="${T + 0.3}" fill="${fill}" opacity="${c.s === 'ink' ? 1 : c.s === 'pen' ? 0.8 : 0.85}"/>`);
      out.push(`<rect x="${f(x)}" y="${f(y)}" width="${T}" height="${T}" fill="url(#${c.s === 'fog' ? 'fog' : 'dots'})"/>`);
    }
    // 둥근 방: 바닥 원 + 굵은 원 벽
    for (const n of N) { if (!roundReg.has('r' + n.id)) continue; const r = L.room[n.id], cx = M + (r.x + r.w / 2) * T, cy = M + (r.y + r.h / 2) * T, rad = r.w / 2 * T, ink = n.visited;
      out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad + (ink ? 6 : 4))}" fill="none" stroke="url(#hatch)" stroke-width="${ink ? 12 : 8}" opacity="${ink ? 0.85 : 0.45}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="${FLOOR}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="url(#dots)"/>`);
      n._ring = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="none" stroke="${ink ? INK : PEN}" stroke-width="${ink ? 3.4 : 1.7}"/>`; }
    // 벽 선
    out.push(`<path d="${walls.fog.join(' ')}" fill="none" stroke="${PEN}" stroke-width="1.2" stroke-dasharray="2 2.5" stroke-linecap="round"/>`);
    out.push(`<path d="${walls.pen.join(' ')}" fill="none" stroke="${PEN}" stroke-width="1.7" stroke-linecap="round"/>`);
    out.push(`<path d="${walls.ink.join(' ')}" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`);
    for (const n of N) if (roundReg.has('r' + n.id)) out.push(n._ring);
    // 문: 나무 문 (굵은 외곽선), 잠긴 문은 어둡게 + 자물쇠
    for (const d of doors) {
      const [ax, ay] = d.at, [bx, by] = d.out, vert = ax === bx, col = d.s === 'ink' ? INK : PEN;
      const cx = M + (vert ? ax + 0.5 : Math.max(ax, bx)) * T, cy = M + (vert ? Math.max(ay, by) : ay + 0.5) * T, w = vert ? 11 : 5.6, h = vert ? 5.6 : 11;
      if (d.kind === 'secret') { out.push(`<text x="${f(cx)}" y="${f(cy + 4)}" text-anchor="middle" class="sym halo" fill="${INK}">S</text>`); continue; }
      out.push(`<rect x="${f(cx - w / 2)}" y="${f(cy - h / 2)}" width="${w}" height="${h}" rx="1" fill="${d.kind === 'locked' ? '#5a3a22' : '#b5824e'}" stroke="${col}" stroke-width="${d.s === 'ink' ? 1.8 : 1.1}"/>`);
      if (d.kind === 'locked') out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="1.6" fill="#e2b33c" stroke="${INK}" stroke-width="0.8"/>`);
    }
    for (const m of marks) out.push(m.sym
      ? `<text x="${f(M + (m.x + 0.5) * T)}" y="${f(M + (m.y + 0.5) * T + 5)}" class="sym halo" fill="${RUST}" text-anchor="middle">${m.t}</text>`
      : `<text x="${f(M + (m.x + 1) * T + 2)}" y="${f(M + (m.y + 0.5) * T + 4)}" class="note halo" fill="${INK}">${m.t}</text>`);
    // 지나온 길: 녹슨 잉크 발자취 점 (새로 걸은 길은 펜이 따라 그린다)
    for (const { e, c } of trails) {
      const pts = [[c.doorA[0] + 0.5, c.doorA[1] + 0.5], ...c.cells.map(([x, y]) => [x + 0.5, y + 0.5]), [c.doorB[0] + 0.5, c.doorB[1] + 0.5]];
      const d = 'M' + pts.map(([x, y]) => `${f(M + x * T)},${f(M + y * T)}`).join(' L');
      out.push(`<path d="${d}" fill="none" stroke="${RUST}" stroke-width="2.6" stroke-dasharray="0.1 5" stroke-linecap="round" opacity="0.85"${anim.moved === e.id ? ' class="pen"' : ''}/>`);
    }
    // 방: 눌러 고르는 자리 · 아이콘 · 메모
    for (const n of N) {
      if (!shown(n)) continue;
      const b = boxOf(n), x = M + b.x * T, y = M + b.y * T, w = b.w * T, h = b.h * T, cx = x + w / 2;
      const isNext = nextIds.has(n.id), isHere = n.id === here;
      out.push(`<g class="room${isNext ? ' next' : ''}${isHere ? ' here' : ''}${n.visited && anim.arrived === n.id ? ' inked' : ''}" data-id="${n.id}">`);
      out.push(`<rect x="${f(x - 3)}" y="${f(y - 3)}" width="${f(w + 6)}" height="${f(h + 6)}" rx="4" fill="transparent"${isNext ? ` class="halo-r" stroke="${RUST}" stroke-width="1.6" stroke-dasharray="4 3"` : ''}/>`);
      if (!b.fog) for (const o of (L.room[n.id].decor || [])) out.push(DECOR[o.k] ? DECOR[o.k](M + (o.x + 0.5) * T, M + (o.y + 0.5) * T, o, n.visited) : '');
      if (n.visited && ICON[n.type]) out.push(ICON[n.type](cx, y + h / 2 - 7));
      if (b.fog) out.push(`<text x="${f(cx)}" y="${f(y + h / 2 + 6)}" class="qm halo" fill="${INK}" text-anchor="middle">?</text>`);
      const notes = n.notes.slice(n.visited ? -2 : -2), lh = 12.5;
      const top = b.fog ? y + h + 11 : n.visited ? y + h / 2 + 13 : y + h / 2 - (notes.length - 1) * lh / 2 + 4;
      notes.forEach((t, i) => out.push(`<text x="${f(cx)}" y="${f(top + i * lh)}" class="note halo" text-anchor="middle" fill="${t.ink === 'red' ? RUST : t.ink === 'ink' ? INK : PEN}">${esc(t.t)}</text>`));
      if (isHere) out.push(`<g class="party" ${O}><circle cx="${f(x + w - 9)}" cy="${f(y + h - 9)}" r="6" fill="#d9493a" stroke-width="2.2"/><circle cx="${f(x + w - 10.5)}" cy="${f(y + h - 10.5)}" r="1.6" fill="#fff" stroke="none"/></g>`);
      out.push('</g>');
    }
    // 장식: 제목 띠 · 나침반
    out.push(`<g ${O}><path d="M${f(W / 2 - 62)},10 h124 l-8,8 l8,8 h-124 l8,-8 Z" fill="#c9a46a" stroke-width="1.8"/><text x="${f(W / 2)}" y="23" text-anchor="middle" class="title" fill="${INK}" stroke="none">심연 · 1층</text></g>`);
    const kx = W - 26, ky = H - 26;
    out.push(`<g ${O} stroke-width="1.6"><circle cx="${kx}" cy="${ky}" r="13" fill="none" opacity="0.7"/><path d="M${kx},${ky - 17} l4,13 l-4,4 l-4,-4 Z" fill="${RUST}"/><path d="M${kx},${ky + 17} l4,-13 l-4,-4 l-4,4 Z" fill="#efe6d6"/><path d="M${kx - 17},${ky} l13,-4 l4,4 l-4,4 Z M${kx + 17},${ky} l-13,-4 l-4,4 l4,4 Z" fill="#efe6d6"/></g><text x="${kx}" y="${ky - 20}" text-anchor="middle" class="note halo" fill="${INK}">북</text>`);
    const boss = N.find(n => n.type === 'boss');
    if (!shown(boss)) out.push(`<text x="${f(W / 2)}" y="${f(M + 5 * T)}" class="note halo" fill="${PEN}" text-anchor="middle">계단은 저 위 어딘가…</text>`);
    out.push(`<rect x="2" y="2" width="${f(W - 4)}" height="${f(H - 4)}" rx="6" fill="none" stroke="#7a5532" stroke-width="2" opacity="0.6"/>`);
    if (st.done === 'win') out.push(`<g class="stamp" transform="translate(${f(W / 2)},${f(M + 16 * T)}) rotate(-12)"><circle r="44" fill="${HALO}" fill-opacity="0.6" stroke="${RUST}" stroke-width="3.5"/><circle r="38" fill="none" stroke="${RUST}" stroke-width="1.2"/><text y="-2" text-anchor="middle" class="stampt" fill="${RUST}">1층</text><text y="20" text-anchor="middle" class="stampt2" fill="${RUST}">지도 완성</text></g>`);
    if (st.done === 'lose') out.push(`<text x="${f(W / 2)}" y="${f(M + 12 * T)}" text-anchor="middle" class="stampt halo" fill="${RUST}" transform="rotate(-6 ${f(W / 2)} ${f(M + 12 * T)})">탐사대 전멸</text>`);
    svg.setAttribute('viewBox', `0 0 ${f(W)} ${f(H)}`);
    svg.innerHTML = out.join('');
    for (const el of svg.querySelectorAll('.pen')) { const len = el.getTotalLength ? el.getTotalLength() : 200; el.style.strokeDasharray = `${len}`; el.style.strokeDashoffset = `${len}`; el.getBoundingClientRect(); el.style.transition = 'stroke-dashoffset 1s ease-out'; el.style.strokeDashoffset = '0'; setTimeout(() => { el.style.strokeDasharray = '0.1 5'; el.style.transition = 'none'; }, 1100); }
    const r = L.room[here]; return (M + (r.y + r.h / 2) * T) / H;
  }
  return { render };
})();
