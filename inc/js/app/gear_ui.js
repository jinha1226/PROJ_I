'use strict';
// 장비 화면 (화면 쪽). 규칙은 js/game/gear.js — 여기는 창뿐이다.
// - GEARUI.give(x, done, title, reveal): 얻은 물건 하나를 누구에게 줄까 (물건 카드 · 낄 수 있는 사람과 견주기 한 줄 · 가방에)
//   reveal = 새로 얻은 것: 봉인된 꾸러미가 떨다가 열린다 — 등급이 높을수록 오래 뜸을 들이고(그 등급 빛이 새어 나온다) 크게 터진다. 누르면 바로 연다
// - GEARUI.found(drops, title, done): 굴린 것들을 가방에 넣고 하나씩 give
// - GEARUI.section(m, fighting): 캐릭터 시트의 「장비」 구역 (칸을 누르면 가방에서 바꿔 낀다 — 전투 중에는 보기만)
// - GEARUI.chip(): 위 바의 「가방 N」 · GEARUI.bag(): 가방 창 · GEARUI.shopHook(...): 상인 · 야영지 창에 「장비」 줄
// - GEARUI.room(st, party): 보물 방에 들어서면 장비 하나
const GEARUI = (() => {
  const { $, esc } = UI, X = () => G.Gear, f = () => G.S.w.fantasy;
  const view = () => (typeof CRAWL !== 'undefined' && CRAWL.view ? CRAWL.view() : null), members = () => (view()?.party || []).filter(p => p.m);
  const clsN = m => G.Guild.def(m)?.n || m.cls, RC = ['', 'r1', 'r2', 'r3', 'r4'];
  function win() { let b = $('gearwin'); if (!b) { b = document.createElement('div'); b.id = 'gearwin'; b.onpointerup = ev => ev.stopPropagation(); $('stage').append(b); } b.onclick = null; return b; }
  const close = () => { const b = $('gearwin'); if (b) b.remove(); };
  // 장비가 바뀌었다: 최대 체력을 다시 세고(crawl.js) 열린 시트를 다시 그린다
  function changed(m) { if (typeof CRAWL !== 'undefined' && CRAWL.refreshHP) CRAWL.refreshHP(); if ($('csheet') && m) { const i = (view()?.party || []).findIndex(p => p.m === m); if (i >= 0) HUD.sheet(i); } }
  const card = x => { const o = X().info(x); return `<div class="gw-card ${RC[o.r]}"><b>${UI.ic(o.ic)} ${esc(o.n)}</b><small>${esc(o.slotN)}${o.rn ? ` · ${esc(o.rn)}` : ''}</small><ul>${o.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`; };
  // 얻은 물건 하나: 누구에게
  const WAIT = [450, 450, 850, 1350, 1900]; // 등급마다 뜸 들이는 시간(ms)
  function give(x, done, title = '장비', reveal = false) {
    if (reveal && !new URLSearchParams(location.search).get('auto')) { const o = X().info(x), box = win(); box.className = ''; box.innerHTML = `<h3>${esc(title)}</h3><div class="gw-seal ${RC[o.r]}" style="--wait:${WAIT[o.r] || 450}ms"><i>?</i></div>`;
      let t = setTimeout(open, WAIT[o.r] || 450); function open() { clearTimeout(t); box.onclick = null; give(x, done, title); const b = $('gearwin'); if (b) { b.classList.add('gw-pop', `pop${o.r}`); if (o.r >= 2 && o.rn) b.querySelector('.gw-card')?.insertAdjacentHTML('beforebegin', `<div class="gw-rare ${RC[o.r]}">${esc(o.rn)}</div>`); } }
      box.onclick = open; return; }
    const box = win(), ps = members().filter(p => !p.dead), rows = ps.map(p => { const c = X().can(p.m, x); return { p, ok: c.ok, why: c.why, cmp: c.ok ? X().cmp(p.m, x) : '', gain: c.ok && x.kind === 'base' ? X().better(p.m, x) : 0 }; });
    const best = rows.filter(r => r.gain > 0).sort((a, b) => b.gain - a.gain)[0];
    box.className = '';
    box.innerHTML = `<h3>${esc(title)}</h3>${card(x)}<div class="gw-who">${rows.map((r, i) => `<button data-i="${i}"${r.ok ? '' : ' disabled'}><b>${esc(r.p.m.name)}</b><small>${esc(clsN(r.p.m))}${r === best ? ' · 추천' : ''}</small><span>${esc(r.ok ? r.cmp : r.why)}</span></button>`).join('')}</div><button class="gw-go">가방에</button>`;
    box.onclick = ev => {
      const b = ev.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.i != null) { const r = rows[+b.dataset.i]; if (!X().equip(f(), r.p.m, x, 't2')) return; changed(r.p.m); }
      close(); done && done();
    };
  }
  function found(drops, title, done) {
    const es = (drops || []).map(d => X().take(f(), d, CRAWL.st?.floor || 1)); let i = 0;
    const next = () => { if (i >= es.length) return done && done(); give(es[i++], next, es.length > 1 ? `${title} ${i}/${es.length}` : title, true); };
    next();
  }
  // 시트의 「장비」 구역
  function section(m, fighting) {
    const rows = X().worn(f(), m), btn = r => `<button class="gs-row ${RC[r.r]}${r.empty ? ' empty' : ''}" data-gslot="${r.slot}" data-uid="${m.uid}"${fighting ? ' disabled' : ''}><b>${esc(r.n)}</b><span>${esc(r.sub)}</span></button>`;
    return `<h4>장비 <small>조율 ${X().attuned(f(), m)}/3${fighting ? ' · 전투 중에는 못 바꾼다' : ''}</small></h4><div class="gs3">${['무기', '방어구', '장신구'].map(g => `<div class="gs-g"><small>${g}</small>${rows.filter(r => r.group === g).map(btn).join('')}</div>`).join('')}</div>`;
  }
  // 칸 하나: 가방에서 그 칸에 낄 것을 고른다 · 벗는다
  function slot(m, sl) {
    const box = win(), cur = X().worn(f(), m).find(r => r.slot === sl), opts = X().options(f(), m, sl), canOff = cur.off;
    box.innerHTML = `<h3>${esc(m.name)} — ${esc(cur.slotN)}</h3><div class="gw-cur"><small>지금</small><b>${esc(cur.n)}</b><span>${esc(cur.sub)}</span></div>` +
      (opts.length ? `<div class="gw-list">${opts.map((o, i) => `<div class="gw-opt${o.ok ? '' : ' off'}">${card(o.x)}<button data-i="${i}"${o.ok ? '' : ' disabled'}>${o.ok ? `끼운다 <small>${esc(o.cmp)}</small>` : esc(o.why)}</button></div>`).join('')}</div>` : '<p class="gw-none">가방에 이 칸에 낄 것이 없다</p>') +
      `<div class="gw-bar">${canOff ? '<button class="gw-off">벗는다</button>' : ''}<button class="gw-go">닫기</button></div>`;
    box.onclick = ev => {
      const b = ev.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.i != null) { if (X().equip(f(), m, opts[+b.dataset.i].x, sl)) { changed(m); return slot(m, sl); } return; }
      if (b.classList.contains('gw-off')) { if (X().unequip(f(), m, sl)) changed(m); return slot(m, sl); }
      close();
    };
  }
  // 가방: 안 낀 것 전부. 누르면 누구에게 줄지
  function bag() {
    const box = win(), es = X().bag(f());
    box.innerHTML = `<h3>가방 <small>${es.length}</small></h3>` + (es.length ? `<div class="gw-list">${es.map((x, i) => `<div class="gw-opt">${card(x)}${FIGHT.on ? '' : `<button data-i="${i}">누구에게</button>`}</div>`).join('')}</div>` : '<p class="gw-none">비어 있다</p>') + '<button class="gw-go">닫기</button>';
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.i != null) return give(es[+b.dataset.i], bag, '가방'); close(); };
  }
  const chip = () => { const n = X().count(f()); return `<span class="chip c-bag" data-gbag="1" title="가방">가방 ${n}</span>`; };
  // 상인 · 야영지: 장면 창 위쪽에 「장비」 줄을 건다 (목록은 그 방에 한 번 굴려 둔다)
  const stocks = new Map();
  function shopHook(box, s, st, party) {
    if (!s || (s.kind !== 'shop' && s.kind !== 'rest')) return;
    const key = `${st.seed}:${st.floor}:${st.at}:${s.kind}`; if (!stocks.has(key)) stocks.set(key, X().stock(st.floor, Math.random, f(), party));
    const list = stocks.get(key); if (!list.length) return;
    const el = document.createElement('div'); el.className = 'gshop'; el.setAttribute('role', 'button'); el.innerHTML = `<b>장비</b> <small>${list.length}점</small>`;
    el.onclick = ev => { ev.stopPropagation(); shop(list, st); };
    const first = box.querySelector('button'); if (first) box.insertBefore(el, first); else box.append(el);
  }
  function shop(list, st) {
    const box = win();
    box.innerHTML = `<h3>상인의 장비 <small>금화 ${st.gold}</small></h3>` + (list.length ? `<div class="gw-list">${list.map((q, i) => `<div class="gw-opt">${card(q.d)}<button data-i="${i}"${st.gold < q.cost ? ' disabled' : ''}>산다 <small>금화 ${q.cost}</small></button></div>`).join('')}</div>` : '<p class="gw-none">다 팔렸다</p>') + '<button class="gw-go">닫기</button>';
    box.onclick = ev => {
      const b = ev.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.i == null) return close();
      const q = list[+b.dataset.i]; if (st.gold < q.cost) return; st.gold -= q.cost; list.splice(+b.dataset.i, 1);
      st.log.push({ t: `샀다: ${X().info(q.d).n} — 금화 ${q.cost}.` }); give(X().take(f(), q.d, st.floor), () => shop(list, st), '산 장비');
    };
  }
  // 보물 방: 처음 들어설 때 장비 하나
  function room(st, party) {
    const n = st.map.nodes[st.at]; if (!n || n.type !== 'treasure' || n.gearGot) return false; n.gearGot = true;
    const ds = X().drops(st.floor, 'treasure', Math.random, f(), party); if (!ds.length) return false;
    st.log.push({ t: `보물: ${ds.map(d => X().info(d).n).join(' · ')}.`, c: 'good' }); found(ds, '보물', null); return true;
  }
  // 시트의 칸 · 위 바의 가방 칩 (어느 창에서 그려도 여기서 받는다)
  document.addEventListener('click', ev => {
    const r = ev.target.closest('[data-gslot]'); if (r && !r.disabled) { const p = members().find(q => String(q.m.uid) === r.dataset.uid); if (p) slot(p.m, r.dataset.gslot); return; }
    if (ev.target.closest('[data-gbag]')) bag();
  });
  return { give, found, section, slot, bag, chip, shopHook, shop, room, count: () => X().count(f()), get active() { return !!$('gearwin'); } };
})();
