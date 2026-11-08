'use strict';
// 지휘 (G.Cmd, DESIGN.md 32)를 쿼터뷰 화면에 잇는다: 맵을 누르면 명령, 올려 두면 무슨 명령인지 아이콘 · 이름, 걸린 명령은 바닥에 표시.
//  몬스터 = 집중 표적 (다시 누르면 풀림) · 계단 = 서둘러 내려가기 (다시 누르면 풀림) · 원정대 = 상태창 · 라이벌 = 방침
//  오른쪽 클릭 · V = 명령 모두 풀기
const CMD = (() => {
  const tip = document.createElement('div'); tip.id = 'cmdtip'; tip.className = 'hidden'; document.body.append(tip);
  const ICON = {
    focus: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><path d="M8 0v3M8 13v3M0 8h3M13 8h3" stroke="currentColor" stroke-width="1.6"/></svg>',
    unfocus: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6"/></svg>',
    rush: '<svg viewBox="0 0 16 16"><path d="M3 2l5 5 5-5M3 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    sheet: '<svg viewBox="0 0 16 16"><circle cx="8" cy="5" r="3" fill="currentColor"/><path d="M2 15c0-4 3-6 6-6s6 2 6 6z" fill="currentColor"/></svg>',
    rival: '<svg viewBox="0 0 16 16"><path d="M8 1l2 5h5l-4 3 2 6-5-4-5 4 2-6-4-3h5z" fill="currentColor"/></svg>',
  };
  // 화면 좌표 → 버퍼 픽셀
  const toBuf = e => { const r = canvas.getBoundingClientRect(); return { sx: (e.clientX - r.left) * W / r.width, sy: (e.clientY - r.top) * H / r.height }; };
  // 버퍼 픽셀 → 칸 (바닥 높이)
  const toCell = (sx, sy) => { const g = unproject(sx, sy); return { x: g.x / T + win.cx, y: g.y / T + win.cy }; };
  const posOf = o => [o._dx ?? o.x, o._dy ?? o.y];
  // 누른 자리의 인물: 발에서 위로 몸 높이만큼의 상자 (보스 · 큰 몸은 두 배)
  function pickEnt(r, sx, sy) {
    const seen = o => !r.seen || r.seen[Math.round(o.y) * r.map.w + Math.round(o.x)];
    const cand = [];
    for (const p of r.party) if (!p.dead && (p.merc || p === r.hero)) cand.push(['member', p]);
    for (const o of r.mons) if (o.hp > 0 && o.spotted && seen(o)) cand.push(['mon', o]);
    let best = null, bd = 1e9;
    for (const [k, o] of cand) {
      const [x, y] = posOf(o), p = project(wx(x), wy(y), 0), big = o.boss || (o.kind === 'mon' && o.s >= 2) ? 2 : 1;
      const hw = 9 * big, top = p.sy - 36 * big, cy = (p.sy + top) / 2;
      if (sx < p.sx - hw || sx > p.sx + hw || sy < top || sy > p.sy + 4) continue;
      const d = Math.hypot(sx - p.sx, sy - cy); if (d < bd) { bd = d; best = { k, o }; }
    }
    return best;
  }
  // 지금 이 자리에서 누르면 무슨 명령인가
  function what(e) {
    if (f.town || SH.open) return null;
    const r = rt(); if (!r || !r.map || !r.party || r.phase === 'dead' || !win.map) return null;
    const { sx, sy } = toBuf(e), hit = pickEnt(r, sx, sy);
    if (hit) {
      if (hit.k === 'member') return { k: 'sheet', n: hit.o.merc ? hit.o.merc.name || '단장' : '단장', go: () => openSheet(hit.o.merc || G.Guild.leader(f)) };
      const on = r.focus === hit.o;
      return { k: on ? 'unfocus' : 'focus', n: on ? '집중 해제' : `집중 · ${hit.o.n}`, go: () => { if (on) G.Cmd.setFocus(r, null); else G.Cmd.click(f, r, hit.o.x, hit.o.y); } };
    }
    const c = toCell(sx, sy), tx = Math.round(c.x), ty = Math.round(c.y), m = r.map;
    if (m.end && tx === m.end.cx && ty === m.end.cy && r.seen?.[ty * m.w + tx]) return { k: 'rush', n: r.rush ? '서두르기 해제' : '서둘러 내려가기', go: () => G.Cmd.click(f, r, tx, ty) };
    return null;
  }
  canvas.addEventListener('pointermove', e => {
    const w = what(e);
    canvas.style.cursor = w ? 'pointer' : '';
    if (!w) { tip.classList.add('hidden'); return; }
    tip.className = 'k-' + w.k; tip.innerHTML = ICON[w.k] + '<b></b>'; tip.querySelector('b').textContent = w.n;
    tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 12 + 'px';
  });
  canvas.addEventListener('pointerleave', () => tip.classList.add('hidden'));
  canvas.addEventListener('click', e => { const w = what(e); if (!w) return; w.go(); tip.classList.add('hidden'); canvas.dispatchEvent(new PointerEvent('pointermove', e)); });
  const clearAll = () => { const r = rt(); if (r && r.map) G.Cmd.clear(r); };
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); clearAll(); });
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'v' && !e.repeat && !SH.open && !(e.target instanceof HTMLInputElement)) clearAll(); });

  // 걸린 명령을 바닥에: 집중 표적 = 노란 겹고리, 서두르기 = 계단의 초록 고리
  function ring(x, y, R, col, t, dash) {
    const c = rgb(...hexRgb(col));
    for (let a = 0; a < 6.28; a += .03) {
      if (dash && Math.floor((a + t * 1.5) * 4) % 2) continue;
      const p = project(wx(x) + Math.cos(a) * R, wy(y) + Math.sin(a) * R, .05), j = (p.sy | 0) * W + (p.sx | 0);
      if (j >= 0 && j < pix.length && ground[j] && zb[j] === bakedZ[j]) pix[j] = c;
    }
  }
  function draw(r, t) {
    if (!r || !r.map || f.town) return;
    const fo = r.focus;
    if (fo && fo.hp > 0 && r.mons.includes(fo) && inWin(fo.x, fo.y)) { const [x, y] = posOf(fo), k = 1 + Math.sin(t * 5) * .06; ring(x, y, T * .62 * k, '#ffd24a', t, false); ring(x, y, T * .8 * k, '#ffd24a', t, true); }
    const e = r.map.end;
    if (r.rush && e && inWin(e.cx, e.cy)) { ring(e.cx, e.cy, T * .6, '#7fe08a', t, true); ring(e.cx, e.cy, T * (.4 + (t % 1) * .4), '#7fe08a', t, false); }
  }
  return { draw };
})();
