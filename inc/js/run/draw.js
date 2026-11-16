'use strict';
// 종이 지도 그리기 (ROGUELIKE_PLAN 4-2 · 4-6): 연필 = 추측, 잉크 = 확실. 펜이 걸어간 길을 따라 그린다.
// 손그림 선은 외부 라이브러리 없이 좌표에 작은 흔들림을 준다.
RUN.draw = (() => {
  const W = 360, ROW = 118, PAD = 70, H = PAD * 2 + ROW * 7;
  const INK = '#2a2118', PEN = '#8a7f70', RED = '#9b2d20', PAPER = '#f1e7d0';
  const pos = n => ({ x: 46 + n.x * (W - 92), y: H - PAD - n.row * ROW });
  // 같은 방은 늘 같은 떨림 (다시 그려도 선이 춤추지 않게)
  const jit = seed => { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5; }; };
  const f = v => v.toFixed(1);
  function roughRect(x, y, w, h, seed, amp = 1.4) {
    const j = jit(seed), pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    let d = '';
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 4];
      if (!i) d += `M${f(ax + j() * amp)},${f(ay + j() * amp)}`;
      for (const k of [0.33, 0.66, 1]) d += ` L${f(ax + (bx - ax) * k + j() * amp)},${f(ay + (by - ay) * k + j() * amp)}`;
    }
    return d + ' Z';
  }
  function roughLine(a, b, seed, bend = 10) {
    const j = jit(seed), mx = (a.x + b.x) / 2 + j() * bend, my = (a.y + b.y) / 2 + j() * bend * 0.4;
    return `M${f(a.x)},${f(a.y)} Q${f(mx)},${f(my)} ${f(b.x)},${f(b.y)}`;
  }
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const boxOf = n => n.info >= 2 || n.visited ? (n.size === 'large' ? [84, 60] : [54, 40]) : [44, 44];

  function render(svg, st, anim = {}) {
    const M = st.map, N = M.nodes, here = st.at;
    const nextIds = new Set(RUN.nexts(st).map(x => x.n.id));
    for (const id of nextIds) N[id].seenMap = true;
    const shown = n => n.visited || n.seenMap || n.info >= 2;
    const out = [];
    out.push(`<defs><pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#c6d3d6" stroke-width="0.6"/></pattern>
      <pattern id="fog" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" stroke="${PEN}" stroke-width="0.7" opacity="0.55"/></pattern></defs>`);
    out.push(`<rect width="${W}" height="${H}" fill="${PAPER}"/><rect width="${W}" height="${H}" fill="url(#grid)"/>`);
    out.push(`<path d="${roughRect(6, 6, W - 12, H - 12, 7, 2)}" fill="none" stroke="${INK}" stroke-width="1.4" opacity="0.6"/>`);
    // 계단 방향만 어렴풋이
    const boss = N.find(n => n.type === 'boss');
    if (!shown(boss)) { const p = pos(boss); out.push(`<text x="${p.x}" y="${p.y}" class="note" fill="${PEN}" text-anchor="middle" opacity="0.7">계단은 저 위 어딘가…</text>`); }
    // 복도
    for (const e of M.edges) {
      const A = N[e.a], B = N[e.b];
      if (e.kind === 'hidden' && !e.seen.hidden) continue;
      const fromHere = e.a === here && nextIds.has(e.b), seenLink = A.visited && shown(B);
      if (!e.walked && !fromHere && !seenLink) continue;
      const a = pos(A), b = pos(B), d = roughLine(a, b, e.id * 31 + 5, e.kind === 'hidden' ? 26 : 10);
      const ink = e.walked, col = ink ? INK : PEN, op = ink ? 1 : fromHere ? 0.9 : 0.45;
      const anim1 = anim.moved === e.id ? ' class="pen"' : '';
      const fill = e.kind === 'dark' && e.seen.dark ? '#cbbfa8' : PAPER;
      if (e.kind === 'hidden') out.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="2 5" opacity="${op}"${anim1}/>`);
      else out.push(`<g opacity="${op}"><path d="${d}" fill="none" stroke="${col}" stroke-width="${ink ? 10 : 8}" stroke-linecap="round"${anim1}/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${ink ? 6 : 5}" stroke-linecap="round"${anim1}/></g>`);
      // 길 기호 (옛 던전 지도식)
      const m = mid(a, b), q = { x: a.x + (b.x - a.x) * 0.3, y: a.y + (b.y - a.y) * 0.3 };
      if (e.kind === 'locked' && e.seen.lock) out.push(e.opened
        ? `<rect x="${f(m.x - 7)}" y="${f(m.y - 3)}" width="14" height="6" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/>`
        : `<rect x="${f(m.x - 8)}" y="${f(m.y - 4)}" width="16" height="8" fill="${INK}"/><text x="${f(m.x + 12)}" y="${f(m.y + 4)}" class="note" fill="${INK}">잠김</text>`);
      if (e.kind === 'trap' && e.seen.trap) out.push(`<text x="${f(m.x)}" y="${f(m.y + 5)}" class="sym" fill="${RED}" text-anchor="middle">T</text>`);
      if (e.kind === 'hidden') out.push(`<text x="${f(m.x)}" y="${f(m.y + 5)}" class="sym" fill="${INK}" text-anchor="middle">S</text>`);
      if (e.kind === 'dark' && e.seen.dark && !e.walked) out.push(`<text x="${f(q.x + 8)}" y="${f(q.y)}" class="note" fill="${PEN}">어두움</text>`);
    }
    // 방
    for (const n of N) {
      if (!shown(n)) continue;
      const p = pos(n), [w, h] = boxOf(n), x = p.x - w / 2, y = p.y - h / 2, ink = n.visited;
      const isNext = nextIds.has(n.id), isHere = n.id === here;
      const cls = `room${isNext ? ' next' : ''}${isHere ? ' here' : ''}${ink && anim.arrived === n.id ? ' inked' : ''}`;
      out.push(`<g class="${cls}" data-id="${n.id}">`);
      if (isNext) out.push(`<path d="${roughRect(x - 6, y - 6, w + 12, h + 12, n.id * 13 + 3, 2.4)}" class="halo" fill="none" stroke="${RED}" stroke-width="1" stroke-dasharray="3 4"/>`);
      const body = roughRect(x, y, w, h, n.id * 17 + 1);
      out.push(`<path d="${body}" fill="${PAPER}" stroke="${ink ? INK : PEN}" stroke-width="${ink ? 2 : 1.1}"/>`);
      if (n.info < 2 && !ink) out.push(`<path d="${body}" fill="url(#fog)" stroke="none"/>`);
      if (!ink) out.push(`<path d="${roughRect(x + 1, y - 1, w, h, n.id * 17 + 9)}" fill="none" stroke="${PEN}" stroke-width="0.8" opacity="0.7"/>`);
      // 방 안 기호
      const sym = !ink && n.info < 3 ? (n.info >= 1 ? '?' : '') : ({ start: '입', fight: '전', elite: '정', event: '사', camp: '야', shop: '상', treasure: '보', boss: '왕' }[n.type] || '');
      if (sym) out.push(`<text x="${p.x}" y="${p.y + 6}" class="sym" fill="${ink ? INK : PEN}" text-anchor="middle">${sym}</text>`);
      if (isHere) out.push(`<g class="party"><circle cx="${p.x + w / 2 - 10}" cy="${p.y - h / 2 + 10}" r="7" fill="${PAPER}" stroke="${RED}" stroke-width="1.6"/>${[-3, 0, 3].map(dx => `<circle cx="${p.x + w / 2 - 10 + dx}" cy="${p.y - h / 2 + 10}" r="1.3" fill="${RED}"/>`).join('')}</g>`);
      // 여백 메모: 방 아래에 (옆 방과 겹치지 않게)
      const notes = n.notes.slice(n.visited ? -3 : -2);
      notes.forEach((t, i) => out.push(`<text x="${f(p.x)}" y="${f(p.y + h / 2 + 15 + i * 14)}" class="note" text-anchor="middle" fill="${t.ink === 'red' ? RED : t.ink === 'ink' ? INK : PEN}">${esc(t.t)}</text>`));
      out.push('</g>');
    }
    if (st.done === 'win') out.push(`<g class="stamp" transform="translate(${W / 2},${PAD + 40}) rotate(-12)"><circle r="44" fill="none" stroke="${RED}" stroke-width="3"/><circle r="38" fill="none" stroke="${RED}" stroke-width="1"/><text y="-2" text-anchor="middle" class="stampt" fill="${RED}">1층</text><text y="20" text-anchor="middle" class="stampt2" fill="${RED}">지도 완성</text></g>`);
    if (st.done === 'lose') out.push(`<path d="M30,40 L${W - 30},${H - 60}" stroke="${RED}" stroke-width="2" opacity="0.35"/><text x="${W / 2}" y="${PAD + 30}" text-anchor="middle" class="stampt" fill="${RED}" transform="rotate(-6 ${W / 2} ${PAD + 30})">탐사대 전멸</text>`);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = out.join('');
    // 펜 애니메이션: 걸어간 복도를 따라 선이 그어진다
    for (const el of svg.querySelectorAll('.pen')) { const L = el.getTotalLength ? el.getTotalLength() : 200; el.style.strokeDasharray = L; el.style.strokeDashoffset = L; el.getBoundingClientRect(); el.style.transition = 'stroke-dashoffset .9s ease-out'; el.style.strokeDashoffset = 0; }
    return pos(N[here]).y / H;
  }
  return { render, H, W };
})();
