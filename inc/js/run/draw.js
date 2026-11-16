'use strict';
// 종이 던전 지도 (ROGUELIKE_PLAN 4-2 · 4-6): 칸에 맞춘 방 · 복도, 바위는 빗금, 벽은 손그림 선.
// 잉크 = 다녀온 곳(확실), 연필 = 정찰 · 다음 길(추측), 안개 칸 = 아직 모르는 방(모두 같은 크기).
RUN.draw = (() => {
  const T = 13, M = 4.5;
  const INK = '#2a2118', PEN = '#8a7f70', RED = '#9b2d20', PAPER = '#f3ead6', ROCK = '#d9ccb2';
  const f = v => v.toFixed(1);
  // 꼭짓점마다 같은 떨림: 이웃한 벽 조각이 끊기지 않고 이어진다
  const jv = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return [((h & 255) / 255 - 0.5) * 1.6, (((h >>> 8) & 255) / 255 - 0.5) * 1.6]; };
  const P = (x, y) => { const [a, b] = jv(x, y); return `${f(M + x * T + a)},${f(M + y * T + b)}`; };
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const RANK = { fog: 1, pen: 2, ink: 3 };

  function render(svg, st, anim = {}) {
    const map = st.map, N = map.nodes, L = RUN.layout.make(map), here = st.at;
    const nextIds = new Set(RUN.nexts(st).map(x => x.n.id));
    for (const id of nextIds) N[id].seenMap = true;
    const shown = n => n.visited || n.seenMap || n.info >= 2;
    const W = M * 2 + L.COLS * T, H = M * 2 + L.ROWS * T;
    // ── 칸 모으기: 상태(잉크 · 연필 · 안개)와 구역(방 번호 · 복도) ──
    const cells = new Map(), key = (x, y) => x + ',' + y;
    const put = (x, y, s, reg, dark) => { const k = key(x, y), c = cells.get(k); if (!c || RANK[s] > RANK[c.s]) cells.set(k, { x, y, s, reg, dark: dark || (c && c.dark) }); else if (dark) c.dark = true; };
    const boxOf = n => { const b = L.room[n.id]; if (n.visited || n.info >= 2) return b; return { x: Math.round(b.x + b.w / 2 - 1.5), y: b.y + b.h - 3, w: 3, h: 3, fog: true }; };
    for (const n of N) { if (!shown(n)) continue; const b = boxOf(n), s = n.visited ? 'ink' : b.fog ? 'fog' : 'pen'; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) put(x, y, s, 'r' + n.id); }
    const doors = [], marks = [], trails = [], secrets = [];
    for (const e of map.edges) {
      const A = N[e.a], B = N[e.b], c = L.cor[e.id];
      if (e.kind === 'hidden') { if (e.seen.hidden) secrets.push({ e, c }); continue; }
      const fromHere = e.a === here && nextIds.has(e.b), link = A.visited && shown(B);
      if (!e.walked && !fromHere && !link) continue;
      const s = e.walked ? 'ink' : 'pen', dark = e.kind === 'dark' && e.seen.dark;
      for (const [x, y] of c.cells) put(x, y, s, 'c', dark);
      doors.push({ at: c.doorA, out: [c.doorA[0], c.doorA[1] - 1], s, kind: 'plain' });
      const end = c.cells[c.cells.length - 1];
      if (!boxOf(B).fog) doors.push({ at: c.doorB, out: [c.doorB[0], c.doorB[1] + 1], s, kind: e.kind === 'locked' && e.seen.lock ? (e.opened ? 'open' : 'locked') : 'plain' });
      if (e.kind === 'locked' && e.seen.lock && !e.opened) marks.push({ x: end[0], y: end[1], t: '잠김' });
      if (e.kind === 'trap' && e.seen.trap) { const m = c.cells[Math.floor(c.cells.length / 2)]; marks.push({ x: m[0], y: m[1], t: 'T', sym: true }); }
      if (e.walked) trails.push({ e, c });
    }
    const isDoor = (a, b) => doors.some(d => (d.at[0] === a.x && d.at[1] === a.y && d.out[0] === b.x && d.out[1] === b.y) || (d.at[0] === b.x && d.at[1] === b.y && d.out[0] === a.x && d.out[1] === a.y));
    // ── 그리기 ──
    const out = [];
    out.push(`<defs>
      <pattern id="rock" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="7" height="7" fill="${ROCK}"/><line x1="0" y1="0" x2="0" y2="7" stroke="#b3a585" stroke-width="1.1"/></pattern>
      <pattern id="grid" width="${T}" height="${T}" patternUnits="userSpaceOnUse" x="${M}" y="${M}"><path d="M${T} 0H0V${T}" fill="none" stroke="#9fb6c0" stroke-width="0.5" opacity="0.8"/></pattern>
      <pattern id="fog" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="5" stroke="${PEN}" stroke-width="0.7" opacity="0.6"/></pattern></defs>`);
    out.push(`<rect width="${f(W)}" height="${f(H)}" fill="url(#rock)"/>`);
    // 바닥 · 모눈
    for (const c of cells.values()) {
      const x = M + c.x * T, y = M + c.y * T;
      out.push(`<rect x="${f(x)}" y="${f(y)}" width="${T + 0.3}" height="${T + 0.3}" fill="${c.dark ? '#d8cdb6' : PAPER}" opacity="${c.s === 'ink' ? 1 : c.s === 'pen' ? 0.92 : 0.85}"/>`);
      out.push(`<rect x="${f(x)}" y="${f(y)}" width="${T}" height="${T}" fill="url(#${c.s === 'fog' ? 'fog' : 'grid'})"/>`);
    }
    // 벽: 바닥이 아닌 칸이나 다른 구역과 맞닿은 변 (문은 열어 둔다). 진한 쪽이 그린다
    const walls = { ink: [], pen: [], fog: [] };
    for (const c of cells.values()) for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const o = cells.get(key(c.x + dx, c.y + dy));
      if (o && o.reg === c.reg) continue;
      if (o && isDoor(c, o)) continue;
      if (o && (RANK[o.s] > RANK[c.s] || (RANK[o.s] === RANK[c.s] && (o.x < c.x || o.y < c.y)))) continue;
      const x0 = dx === 1 ? c.x + 1 : c.x, y0 = dy === 1 ? c.y + 1 : c.y, x1 = dy ? x0 + 1 : x0, y1 = dx ? y0 + 1 : y0;
      walls[c.s].push(`M${P(x0, y0)} L${P(x1, y1)}`);
    }
    out.push(`<path d="${walls.fog.join(' ')}" fill="none" stroke="${PEN}" stroke-width="1" stroke-dasharray="2 2.5"/>`);
    out.push(`<path d="${walls.pen.join(' ')}" fill="none" stroke="${PEN}" stroke-width="1.3" stroke-linecap="round"/>`);
    out.push(`<path d="${walls.ink.join(' ')}" fill="none" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/>`);
    // 문 (옛 지도식 작은 네모), 잠긴 문은 칠한다
    for (const d of doors) {
      const [ax, ay] = d.at, [, by] = d.out, cx = M + (ax + 0.5) * T, cy = M + Math.max(ay, by) * T, col = d.s === 'ink' ? INK : PEN;
      out.push(`<rect x="${f(cx - 4.5)}" y="${f(cy - 2.2)}" width="9" height="4.4" fill="${d.kind === 'locked' ? col : PAPER}" stroke="${col}" stroke-width="1.1"/>`);
    }
    for (const m of marks) out.push(m.sym
      ? `<text x="${f(M + (m.x + 0.5) * T)}" y="${f(M + (m.y + 0.5) * T + 5)}" class="sym" fill="${RED}" text-anchor="middle">${m.t}</text>`
      : `<text x="${f(M + (m.x + 1) * T + 2)}" y="${f(M + (m.y + 0.5) * T + 4)}" class="note halo" fill="${INK}">${m.t}</text>`);
    // 숨은 통로: 바위를 뚫은 점선 + S
    for (const { c } of secrets) {
      const a = c.a, b = c.b, x1 = M + (a.x + a.w / 2) * T, y1 = M + a.y * T, x2 = M + (b.x + b.w / 2) * T, y2 = M + (b.y + b.h) * T;
      out.push(`<path d="M${f(x1)},${f(y1)} C${f(x1)},${f((y1 + y2) / 2)} ${f(x2)},${f((y1 + y2) / 2)} ${f(x2)},${f(y2)}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="1.5 4"/>`);
      out.push(`<text x="${f(x1 + 5)}" y="${f(y1 - 3)}" class="sym halo" fill="${INK}">S</text>`);
    }
    // 지나온 길: 붉은 점선 (새로 걸은 길은 펜이 따라 그린다)
    for (const { e, c } of trails) {
      const pts = [[c.doorA[0] + 0.5, c.doorA[1] + 0.5], ...c.cells.map(([x, y]) => [x + 0.5, y + 0.5]), [c.doorB[0] + 0.5, c.doorB[1] + 0.5]];
      const d = 'M' + pts.map(([x, y]) => `${f(M + x * T)},${f(M + y * T)}`).join(' L');
      out.push(`<path d="${d}" fill="none" stroke="${RED}" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.7"${anim.moved === e.id ? ' class="pen"' : ''}/>`);
    }
    // 방: 눌러 고르는 자리 · 기호 · 메모
    for (const n of N) {
      if (!shown(n)) continue;
      const b = boxOf(n), x = M + b.x * T, y = M + b.y * T, w = b.w * T, h = b.h * T, cx = x + w / 2;
      const isNext = nextIds.has(n.id), isHere = n.id === here;
      out.push(`<g class="room${isNext ? ' next' : ''}${isHere ? ' here' : ''}${n.visited && anim.arrived === n.id ? ' inked' : ''}" data-id="${n.id}">`);
      out.push(`<rect x="${f(x - 3)}" y="${f(y - 3)}" width="${f(w + 6)}" height="${f(h + 6)}" fill="transparent"${isNext ? ` class="halo-r" stroke="${RED}" stroke-width="1.2" stroke-dasharray="3 3"` : ''}/>`);
      if (n.visited && (n.type === 'start' || n.type === 'boss')) for (let i = 0; i < 4; i++) out.push(`<line x1="${f(x + w - 17)}" y1="${f(y + 4 + i * 3)}" x2="${f(x + w - 5)}" y2="${f(y + 4 + i * 3)}" stroke="${INK}" stroke-width="1"/>`);
      if (b.fog) out.push(`<text x="${f(cx)}" y="${f(y + h / 2 + 5)}" class="sym halo" fill="${PEN}" text-anchor="middle">?</text>`);
      const notes = n.notes.slice(n.visited ? -3 : -2), lh = 12.5, top = b.fog ? y + h + 11 : y + h / 2 - (notes.length - 1) * lh / 2 + 4;
      notes.forEach((t, i) => out.push(`<text x="${f(cx)}" y="${f(top + i * lh)}" class="note halo" text-anchor="middle" fill="${t.ink === 'red' ? RED : t.ink === 'ink' ? INK : PEN}">${esc(t.t)}</text>`));
      if (isHere) out.push(`<g class="party"><circle cx="${f(x + 8)}" cy="${f(y + h - 8)}" r="5.5" fill="${PAPER}" stroke="${RED}" stroke-width="1.6"/><circle cx="${f(x + 8)}" cy="${f(y + h - 8)}" r="2" fill="${RED}"/></g>`);
      out.push('</g>');
    }
    const boss = N.find(n => n.type === 'boss');
    if (!shown(boss)) out.push(`<text x="${f(W / 2)}" y="${f(M + 4 * T)}" class="note halo" fill="${PEN}" text-anchor="middle">계단은 저 위 어딘가…</text>`);
    out.push(`<rect x="1" y="1" width="${f(W - 2)}" height="${f(H - 2)}" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.5"/>`);
    if (st.done === 'win') out.push(`<g class="stamp" transform="translate(${f(W / 2)},${f(M + 15 * T)}) rotate(-12)"><circle r="44" fill="${PAPER}" fill-opacity="0.6" stroke="${RED}" stroke-width="3"/><circle r="38" fill="none" stroke="${RED}" stroke-width="1"/><text y="-2" text-anchor="middle" class="stampt" fill="${RED}">1층</text><text y="20" text-anchor="middle" class="stampt2" fill="${RED}">지도 완성</text></g>`);
    if (st.done === 'lose') out.push(`<text x="${f(W / 2)}" y="${f(M + 12 * T)}" text-anchor="middle" class="stampt halo" fill="${RED}" transform="rotate(-6 ${f(W / 2)} ${f(M + 12 * T)})">탐사대 전멸</text>`);
    svg.setAttribute('viewBox', `0 0 ${f(W)} ${f(H)}`);
    svg.innerHTML = out.join('');
    for (const el of svg.querySelectorAll('.pen')) { const len = el.getTotalLength ? el.getTotalLength() : 200; el.style.strokeDasharray = `${len}`; el.style.strokeDashoffset = `${len}`; el.getBoundingClientRect(); el.style.transition = 'stroke-dashoffset 1s ease-out'; el.style.strokeDashoffset = '0'; setTimeout(() => { el.style.strokeDasharray = '3 3'; el.style.transition = 'none'; }, 1100); }
    const r = L.room[here]; return (M + (r.y + r.h / 2) * T) / H;
  }
  return { render };
})();
