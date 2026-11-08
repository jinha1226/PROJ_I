'use strict';
// 열쇠 도감 (KEYS_SURVEY · INCREMENTAL_PLAN 1-1): 직업 · 언어 · 도구 · 주문이 여는 선택지를 모아 본다.
// 본 선택지만 이름이 보이고(나머지는 ???), 고른 횟수가 남는다. 열쇠마다 지금 용병단에서 그 열쇠를 가진 사람을 보여 준다 — 다음에 누구를 뽑을지
// 여는 동안 게임은 멈춘다 (상태창처럼). 상단 「도감」 · K
const CDX = (() => {
  const E = () => G.Event;
  const el = document.createElement('div'); el.id = 'codex'; el.className = 'hidden'; document.body.append(el);
  const S = { open: false, tab: 'cls', key: null };
  const TABS = [['cls', '직업'], ['lang', '언어'], ['tool', '도구'], ['x', '주문 · 기능']];
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const nameOf = key => { const [t, k] = key.split(':'); return t === 'cls' ? E().clsN(k) : t === 'lang' ? G.SrdX.LANG_N[k] || k : t === 'x' ? G.D.MSKILLS[k]?.n || k : k; };
  const roster = () => f.mercs.concat(G.Guild.leader(f)).filter(m => m && !m.dead);
  // 그 열쇠를 가진 사람 (지금 용병단)
  function holders(key) {
    const [t, k] = key.split(':');
    return roster().filter(m => t === 'cls' ? m.cls === k : t === 'lang' ? G.SrdX.langs(m).includes(k) : t === 'tool' ? E().tools(m).some(x => x.includes(k)) : t === 'x' ? (m.skills || []).includes(k) || G.Guild.skill(m, k) : false);
  }
  // 그 열쇠를 얻는 길 (뽑을 때 참고): 도구는 직업 · 배경, 주문은 배우는 직업 · 레벨
  function source(key) {
    const [t, k] = key.split(':');
    if (t === 'tool') return E().toolBy(k).join(' · ');
    if (t === 'x') { const lv = G.D.MSKILLS[k]?.lv || {}; return Object.keys(lv).map(c => `${E().clsN(c)} ${lv[c]}`).join(' · '); }
    if (t === 'lang') return k === 'cant' ? '로그' : k === 'druidic' ? '드루이드' : '모집할 때 사람마다 (표준 언어 2개)';
    return '';
  }
  function keysOf(tab) {
    const all = E().codexAll(), m = new Map();
    for (const it of all) for (const k of it.keys) if (k.startsWith(tab + ':')) { if (!m.has(k)) m.set(k, []); m.get(k).push(it); }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }
  function draw() {
    el.innerHTML = '';
    const B = E().codexBook(f), all = E().codexAll(), seenN = all.filter(it => B.seen[it.id]).length, usedN = all.filter(it => B.used[it.id]).length;
    const head = mk('div', 'cx-h'); head.append(mk('b', '', '열쇠 도감'), mk('span', 'cx-p', `발견 ${seenN} / ${all.length} · 사용 ${usedN}`));
    const x = mk('button', 'x', '닫기'); x.onclick = hide; head.append(x); el.append(head);
    const tabs = mk('div', 'cx-tabs');
    for (const [k, n] of TABS) { const b = mk('button', k === S.tab ? 'on' : '', n); b.onclick = () => { S.tab = k; S.key = null; draw(); }; tabs.append(b); }
    el.append(tabs);
    const body = mk('div', 'cx-b'), list = mk('div', 'cx-keys'), det = mk('div', 'cx-det');
    const ks = keysOf(S.tab); if (!S.key && ks.length) S.key = ks[0][0];
    for (const [key, items] of ks) {
      const hs = holders(key), seen = items.filter(it => B.seen[it.id]).length;
      const c = mk('button', 'cx-k' + (key === S.key ? ' on' : '') + (hs.length ? ' have' : ''));
      c.append(mk('b', '', nameOf(key)), mk('small', '', `${seen} / ${items.length}`), mk('i', '', hs.length ? hs.map(m => m.name || '단장').slice(0, 3).join(' · ') + (hs.length > 3 ? ` 외 ${hs.length - 3}` : '') : '용병단에 없음'));
      c.onclick = () => { S.key = key; draw(); };
      list.append(c);
    }
    if (S.key) {
      const items = (ks.find(q => q[0] === S.key) || [null, []])[1], hs = holders(S.key);
      det.append(mk('h4', '', nameOf(S.key)));
      const src = source(S.key); if (src) det.append(mk('div', 'cx-src', src));
      det.append(mk('div', 'cx-who', hs.length ? hs.map(m => `${m.name || '단장'} (${E().clsN(m.cls)} ${m.lv})`).join(' · ') : '용병단에 없음'));
      for (const it of items) {
        const s = !!B.seen[it.id], u = B.used[it.id] || 0, r = mk('div', 'cx-e' + (s ? '' : ' unk') + (u ? ' used' : ''));
        r.append(mk('span', 'ev', it.ev), mk('b', '', s ? it.label : '???'), mk('small', '', u ? `✓ ${u}` : ''));
        const other = it.keys.filter(k => k !== S.key && !(it.npc && k.startsWith('lang:') && S.key.startsWith('lang:')));
        if (s && other.length) r.title = '다른 열쇠: ' + other.map(nameOf).join(' · ');
        det.append(r);
      }
    }
    body.append(list, det); el.append(body);
  }
  function show() { if (f.tut) f.tut.keyHint = false; S.open = true; el.classList.remove('hidden'); draw(); }
  function hide() { S.open = false; el.classList.add('hidden'); }
  const btn = document.createElement('button'); btn.id = 'cdxbtn'; btn.textContent = '도감'; btn.title = '열쇠 도감 (K)'; btn.style.cssText = allBtn.style.cssText; btn.onclick = () => (S.open ? hide() : show());
  document.getElementById('top').append(btn);
  addEventListener('keydown', e => { if (e.target instanceof HTMLInputElement) return; if (e.key.toLowerCase() === 'k' && !e.repeat) S.open ? hide() : show(); else if (e.key === 'Escape' && S.open) hide(); });
  return { get open() { return S.open; }, show, hide };
})();
