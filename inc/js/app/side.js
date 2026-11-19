'use strict';
// 운명판 칸 (넓은 화면은 왼쪽 기둥, 폰은 아래): 파티와 운명판을 한 곳에 — 게임 화면 위에는 판을 띄우지 않는다.
// - 줄 = 사람: 초상 · 이름 · 체력(누르면 캐릭터 시트) | 주사위 네 칸(쓴 칸은 흐리게 · 다음 칸은 밝은 테 · 맞은 줄은 그 빛의 묶음 테) | 붙잡기
// - 아래: 맞아 있는 빙고와 효과 · 안 쓴 칸을 누르면 「다시 굴리기」(금화) · 그 사람에게 영감이 있으면 「✦ 영감으로」(공짜)
// - 줄이 새로 굴려지면(층에 들어설 때 모두 · 다 쓴 줄) 그 자리에서 슬롯처럼 굴러 한 줄씩 멈춘다. 그동안 SIDE.busy — 탐사 · 전투가 기다린다
// 읽는 것은 CRAWL.view() · G.Dice. 바꾸는 것은 G.Dice의 붙잡기 · 다시 굴리기 · 영감뿐 (규칙은 js/game/fate.js).
const SIDE = (() => {
  const { $, esc } = UI;
  let el = null, key = '', sel = null, faceLeft = 0, barH = -1, tickT = 0;
  const seen = new Map(), spin = new Map(), landed = new Set(); // 사람 → 지난번에 본 줄 · '줄,칸' → 멈출 시각(ms) · 방금 멈춘 칸
  const wide = matchMedia('(min-width: 900px)');
  const speed = () => G.Turn.speed(G.S.w.fantasy) || 1;
  const lineName = x => `<i class="sy s-${x.s}">${G.Dice.SYM[x.s].n}</i>` + (x.t === 'r' ? `${esc(x.p.merc?.name || '동료')} 가로줄` : `${x.c + 1}열 세로줄`);
  // 빙고 줄에 든 칸들: ['줄,칸', …] (ps = 줄 순서의 사람들)
  const lineCells = (ps, x) => { if (x.t === 'r') { const r = ps.indexOf(x.p); return [...Array(G.Dice.K.COLS).keys()].map(c => r + ',' + c); } const alive = new Set(G.Dice.party()); return ps.map((p, r) => (alive.has(p) && G.Dice.line(p) ? r + ',' + x.c : null)).filter(Boolean); };
  // 묶음 테: 맞은 줄마다 그 칸들을 감싸는 테를 줄 묶음 위에 얹는다 (자리는 그려진 칸에서 잰다)
  function groups(ps, L) {
    const box = el.querySelector('.sd-rows'), b = box.getBoundingClientRect(), pad = wide.matches ? 3 : 2;
    for (const x of L) { const rs = lineCells(ps, x).map(q => el.querySelector(`[data-rc="${q}"]`)?.parentNode.getBoundingClientRect()).filter(Boolean); if (!rs.length) continue;
      const l = Math.min(...rs.map(r => r.left)) - pad, t = Math.min(...rs.map(r => r.top)) - pad, g = document.createElement('i'); g.className = `sd-grp h-${x.s}`;
      g.style.cssText = `left:${l - b.left}px;top:${t - b.top}px;width:${Math.max(...rs.map(r => r.right)) + pad - l}px;height:${Math.max(...rs.map(r => r.bottom)) + pad - t}px`; box.append(g); }
  }
  function mount() {
    el = document.createElement('div'); el.id = 'side'; el.onpointerup = ev => ev.stopPropagation(); el.onclick = click;
    $('wrap').insertBefore(el, $('stage')); document.body.classList.add('has-side'); dispatchEvent(new Event('resize')); // 게임 화면이 남은 자리에 맞춘다
  }
  function click(ev) {
    const D = G.Dice, v = CRAWL.view(), t = ev.target.closest('[data-rc],[data-h],[data-i],.rr,.ir'); if (!t || t.disabled || !v) return;
    if (t.dataset.i != null) return HUD.sheet(+t.dataset.i);
    if (FIGHT.quiet || spin.size) return;
    const P = r => v.party[r].a, nm = p => p.merc?.name || '동료';
    if (t.dataset.h != null) D.setHold(P(+t.dataset.h));
    else if (t.dataset.rc != null) { const k = t.dataset.rc, [r, c] = k.split(',').map(Number); if (!D.canReroll(P(r), c)) return; sel = sel === k ? null : k; }
    else if (sel) { const [r, c] = sel.split(',').map(Number), p = P(r);
      if (t.classList.contains('ir')) { if (D.inspReroll(p, c)) { FIGHT.log(`영웅적 영감 — ${nm(p)}의 칸을 다시 굴렸다.`); spin.set(sel, performance.now() + 520); } }
      else { const res = D.rerollCell(p, c); if (res) { FIGHT.log(`운명판 다시 굴리기 — ${nm(p)}의 칸${res.cost ? ` (금화 ${res.cost})` : ''}.`); spin.set(sel, performance.now() + 520); } }
      sel = null; }
    key = '';
  }
  function drawFaces(v) { faceLeft = 0; el.querySelectorAll('.sd-face').forEach((cv, i) => { if (cv.dataset.ok) return; if (v.party[i]?.m && UI.face(cv, v.party[i].m)) cv.dataset.ok = '1'; else faceLeft++; }); }
  function frame() {
    const v = CRAWL.view(), D = G.Dice; if (!v || !v.party.length) return;
    if (!el) mount();
    const now = performance.now(), ps = v.party.map(p => p.a), lines = ps.map(p => (D.board ? D.line(p) : null));
    // 새로 굴린 줄: 위에서부터 한 줄씩, 왼쪽 칸부터 멈춘다 (모든 줄이면 = 층에 들어섰다 — 조금 더 뜸을 들인다)
    { const fresh = []; lines.forEach((L, r) => { if (L && seen.get(ps[r]) !== L) { seen.set(ps[r], L); fresh.push(r); } });
      if (fresh.length && !FIGHT.quiet) { const base = fresh.length === lines.filter(Boolean).length ? 750 : 450; fresh.forEach((r, i) => { for (let c = 0; c < D.K.COLS; c++) spin.set(r + ',' + c, now + (base + i * 330 + c * 80) / speed()); }); sel = null; } }
    for (const [k, u] of spin) if (now >= u) { spin.delete(k); landed.add(k); }
    if (sel) { const [r, c] = sel.split(',').map(Number); if (!lines[r] || !D.canReroll(ps[r], c)) sel = null; }
    const L = spin.size || !D.board ? [] : D.bingo(), gold = D.purse.gold(), cost = D.nextCost(), bon = ps.map(p => (v.fighting ? D.bonus(p).join('') : ''));
    const k = JSON.stringify([v.party.map((p, r) => [p.m?.name, p.hp, p.max, p.dead, p.cur, D.insp(p.a), bon[r], lines[r] && [lines[r].at, lines[r].hold, lines[r].holds, lines[r].cells.map(d => d.value ?? 'x')]]), sel, [...spin.keys()], [...landed], gold, cost, L.length, FIGHT.quiet, innerWidth]);
    if (k === key) { if (faceLeft) drawFaces(v); if (spin.size && now - tickT > 70) { tickT = now; for (const d of el.querySelectorAll('.die.roll')) d.textContent = 1 + Math.floor(Math.random() * 20); } return; } key = k;
    const hits = new Map(), cols = [...Array(D.K.COLS).keys()]; for (const x of L) for (const q of lineCells(ps, x)) hits.set(q, x.s);
    const row = (p, r) => { const a = p.a, Ln = lines[r], c0 = G.Guild.def(p.m) || {}, w = Math.round(100 * Math.max(0, p.hp) / Math.max(1, p.max));
      return `<div class="sd-row${p.cur ? ' cur' : ''}${p.dead ? ' dead' : ''}">` +
        `<button class="sd-who" data-i="${r}" title="${esc(c0.n || '')} · ${p.m?.lv || 1}레벨 — 캐릭터 시트"><canvas class="sd-face" width="26" height="30" style="--cc:${c0.col || '#888'}"></canvas><span class="sd-name">${esc(p.m?.name || '동료')}${D.insp(a) ? '<i class="ins" title="영웅적 영감">✦</i>' : ''}</span>` +
        `<span class="sd-hp"><i style="width:${w}%"></i></span><small>${Math.max(0, p.hp)}/${p.max}</small></button>` +
        (Ln ? `<div class="sd-dice">${cols.map(c => { const q = r + ',' + c, d = spin.has(q) ? null : Ln.cells[c], s = d && hits.get(q);
          return `<span class="sd-c${spin.has(q) ? '' : c === Ln.at ? ' now' : c < Ln.at ? ' used' : ''}">${FIGHT.die(a, d, `${sel === q ? 'sel' : ''}${landed.has(q) ? ' land' : ''}${s ? ` hit h-${s}` : ''}`, `data-rc="${q}"`)}${c === Ln.at && bon[r] ? `<i class="bn">${bon[r]}</i>` : ''}</span>`; }).join('')}</div>` +
          `<button class="sd-hold${Ln.hold ? ' on' : ''}" data-h="${r}"${p.dead ? ' disabled' : ''} title="이 줄을 다 쓴 뒤 유지비를 내고 한 바퀴 더 쓴다">${Ln.hold ? '붙잡음' : '붙잡기'}<small>금화 ${D.holdCost(Ln)}</small></button>` : '') + '</div>'; };
    let bar = `<span class="hint">안 쓴 칸을 누르면 다시 굴린다 · ${cost ? `금화 ${cost}` : '이번은 공짜'}</span>`;
    if (sel) { const [r, c] = sel.split(',').map(Number); bar = `<button class="rr"${cost > gold ? ' disabled' : ''}>다시 굴리기 · ${cost ? `금화 ${cost}${cost > gold ? ' (모자람)' : ''}` : '공짜'}</button>${D.canInsp(ps[r], c) ? '<button class="ir">✦ 영감으로 · 공짜</button>' : ''}`; }
    el.innerHTML = `<div class="sd-hd"><b>운명판</b><small>앞에서부터 한 칸씩 · 다 쓴 줄은 새로 굴린다</small></div><div class="sd-rows">${v.party.map(row).join('')}</div>` +
      `<div class="sd-fx">${spin.size ? '<div class="none">굴리는 중…</div>' : L.length ? L.map(x => `<div class="h-${x.s}"><b>${lineName(x)}</b> ${esc(D.lineTxt(x))}</div>`).join('') : '<div class="none">빙고 없음 <small>가로 네 칸 · 세로 한 줄이 같은 기호면 맞는다</small></div>'}</div>` +
      (FIGHT.quiet ? '' : `<div class="sd-bar${sel ? ' on' : ''}">${bar}</div>`);
    landed.clear(); drawFaces(v); groups(ps, L);
    const h = wide.matches ? 0 : el.offsetHeight; if (h !== barH) { barH = h; document.documentElement.style.setProperty('--pbar-h', h + 'px'); } // 폰: 다른 창이 이 칸 위로 올라오게
  }
  return { frame, cell: (p, c) => { const v = CRAWL.view(), r = v ? v.party.findIndex(x => x.a === p) : -1; return el && r >= 0 ? el.querySelector(`[data-rc="${r},${c}"]`) : null; }, get busy() { return spin.size > 0; } };
})();
