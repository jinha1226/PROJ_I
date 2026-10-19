'use strict';
// HTML 패널, 모달, 입력 처리
G.UI = (function () {
  const ui = {
    tab: 'colonists', sel: null, tool: 'select', drag: null, hover: null, mouse: null, camX: null, camY: null,
    speed: 1, paused: false, target: null, modals: [], exp: null, draft: null, last: {}, toastT: 0,
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = () => G.S;

  // ───────── 공용 조각 ─────────
  function bar(v, max, color, w) {
    const p = U.clamp(max > 0 ? (v / max) * 100 : 0, 0, 100);
    return `<span class="bar" style="width:${w || 60}px"><i style="width:${p}%;background:${color}"></i></span>`;
  }
  function costStr(cost, mul) {
    mul = mul || 1;
    const parts = [];
    for (const k in cost) {
      const have = S().store[k] || 0, need = cost[k] * mul;
      parts.push(`<span class="${have >= need ? '' : 'miss'}">${G.RES[k].n} ${need}</span>`);
    }
    return parts.join(', ') || '없음';
  }
  const btn = (act, label, data, cls, title) =>
    `<button class="${cls || ''}" data-act="${act}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')} ${title ? `title="${esc(title)}"` : ''}>${label}</button>`;
  const traitsHtml = c => c.traits.map(t => `<span class="trait ${G.TRAITS[t].good ? 'good' : 'bad'}" title="${esc(G.TRAITS[t].d)}">${G.TRAITS[t].n}</span>`).join(' ');

  function toast(text, cls) {
    const el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.classList.add('fade'), 3200);
    setTimeout(() => el.remove(), 4000);
  }

  // ───────── 상단 바 ─────────
  function topSettle() {
    const s = S().settle, st = S().store;
    const day = G.Settle.day(), time = U.fmtTime(s.tick, G.Settle.DAY), night = G.Settle.isNight();
    const res = ['wood', 'stone', 'food', 'meal', 'ration', 'herb', 'iron_ore', 'iron', 'hide', 'bone', 'crystal', 'essence', 'potion_heal']
      .filter(k => (st[k] || 0) > 0 || ['wood', 'stone', 'food', 'meal', 'ration'].includes(k))
      .map(k => `<span class="res" title="${G.RES[k].n}"><b style="color:${G.RES[k].c}">${G.RES[k].g}</b>${G.RES[k].n} ${Math.floor(st[k] || 0)}</span>`).join('');
    const th = Math.floor(s.threat);
    const anyDraft = S().colonists.some(c => c.loc === 'home' && c.drafted);
    const raid = (s.mons.length ? '<span class="alert">습격 중!</span> ' : '') + (s.mons.length || anyDraft ? btn('draftAll', anyDraft ? '전원 징집 해제' : '전원 징집', {}, anyDraft ? 'on' : '') : '');
    const sp = [0, 1, 2, 3].map(v => btn('speed', v === 0 ? '❚❚' : '▶'.repeat(v), { v }, (ui.paused ? v === 0 : ui.speed === v && v > 0) ? 'on' : '')).join('');
    return `<div class="tb-title">던전 개척단</div>
      <div class="tb-time">${day}일째 ${time} ${night ? '🌙' : '☀'}</div>
      <div class="tb-speed">${sp}</div>
      <div class="tb-res">${res}</div>
      <div class="tb-threat" title="시간이 지나면 차오르고, 100%가 되면 던전에서 괴물이 몰려온다. 원정에서 괴물을 처치하고 새 깊이에 도달하면 줄어든다.">던전 압력 ${bar(th, 100, th > 75 ? '#e33' : th > 45 ? '#eb3' : '#8a6', 70)} ${th}% ${raid}</div>
      <div class="tb-btns">${btn('expedition', '⚔ 원정 준비', {}, 'big')}${btn('gfx', G.R.gfx() === 'tiles' ? '글자' : '타일', {}, '', '타일/글자 화면 전환 (T) · 휠: 확대/축소')}${btn('help', '?', {}, '', '도움말')}${btn('savegame', '저장', {})}</div>`;
  }

  function topDungeon() {
    const d = S().dun, lv = G.Dun.level(), s = S().settle;
    const raid = s.mons.length ? '<span class="alert">정착지 습격 중!</span>' : '';
    return `<div class="tb-title">던전 개척단</div>
      <div class="tb-time">지하 ${d.depth}층 · ${lv.theme} · ${d.turn}턴</div>
      <div class="tb-res">정착지: ${G.Settle.day()}일째 · 압력 ${Math.floor(s.threat)}% ${raid}</div>
      <div class="tb-res">가방 ${G.Dun.bagWeight()} / ${G.Dun.bagCap()}</div>
      <div class="tb-btns">${btn('dcmd', '가방 (i)', { v: 'inv' })}${btn('gfx', G.R.gfx() === 'tiles' ? '글자' : '타일', {}, '', '타일/글자 화면 전환 (T) · 휠: 확대/축소')}${btn('help', '?', {})}</div>`;
  }

  // ───────── 정착지 측면 패널 ─────────
  const TABS = [['colonists', '정착민'], ['work', '작업'], ['build', '건설'], ['prod', '생산'], ['research', '연구'], ['store', '창고']];

  function sideSettle() {
    const tabs = TABS.map(([k, n]) => btn('tab', n, { v: k }, ui.tab === k ? 'on' : '')).join('');
    let body = '';
    switch (ui.tab) {
      case 'colonists': body = tabColonists(); break;
      case 'work': body = tabWork(); break;
      case 'build': body = tabBuild(); break;
      case 'prod': body = tabProd(); break;
      case 'research': body = tabResearch(); break;
      case 'store': body = tabStore(); break;
    }
    return `<div class="tabs">${tabs}</div><div class="tabbody">${body}</div>`;
  }

  function tabColonists() {
    const live = S().colonists.filter(c => c.loc === 'home' || c.loc === 'away');
    let h = '';
    for (const c of live) {
      const mx = G.Chars.maxHP(c);
      const job = c.loc === 'away' ? '<em class="away">원정 중</em>' : esc(G.Settle.jobLabel(c));
      h += `<div class="crow ${ui.sel === c.id ? 'on' : ''}" data-act="sel" data-id="${c.id}">
        <div><b style="color:${c.color}">@</b> <b>${esc(c.name)}</b> <small>${G.Chars.title(c)} · Lv${c.xl}</small><span class="job">${job}</span></div>
        <div class="bars"><span title="HP">♥${bar(c.hp, mx, '#d33', 44)}</span><span title="배고픔">🍖${bar(c.food, 100, '#da3', 34)}</span><span title="휴식">☾${bar(c.rest, 100, '#59d', 34)}</span><span title="기분 ${Math.round(c.mood)}">☺${bar(c.mood, 100, c.mood < 25 ? '#e44' : '#5c5', 34)}</span></div>
      </div>`;
    }
    const sel = live.find(c => c.id === ui.sel);
    if (sel) h += details(sel, true);
    const dead = S().colonists.filter(c => c.loc === 'dead');
    if (dead.length) h += `<div class="sect">묘지</div>` + dead.map(c => `<div class="dead">☠ ${esc(c.name)} <small>${G.Chars.title(c)} Lv${c.xl} — ${esc(c.deathCause || '')}</small></div>`).join('');
    return h;
  }

  function details(c, editable) {
    const mx = G.Chars.maxHP(c), mm = G.Chars.maxMP(c), cs = G.Chars.stats(c);
    let h = `<div class="detail"><div class="sect">${esc(c.name)} — ${G.Chars.title(c)}</div>
      <div>${traitsHtml(c)}</div>
      <div class="kv">레벨 ${c.xl} <small>(경험 ${Math.floor(c.xp)}/${G.Chars.xpNeed(c.xl)})</small> · 힘 ${c.str} · 민첩 ${c.dex} · 지능 ${c.int}</div>
      <div class="kv">HP ${Math.ceil(c.hp)}/${mx} · MP ${Math.floor(c.mp)}/${mm} · 방어 ${cs.ac.toFixed(1)} · 회피 ${cs.ev.toFixed(1)} · 명중 ${cs.acc.toFixed(1)}</div>
      <div class="kv">${G.RACES[c.race].n}: ${G.RACES[c.race].desc} · 원정 ${c.expeditions || 0}회 · 최고 ${c.deepest || 0}층 · 처치 ${c.kills}</div>`;
    if (editable && c.loc === 'home') h += `<div class="kv">${btn('draft', c.drafted ? '징집 해제' : '징집', { id: c.id }, c.drafted ? 'on' : '')} <small>${c.drafted ? '징집됨 — 지도 우클릭으로 이동, 닿는 적을 공격' : '징집하면 일을 멈추고 직접 지휘할 수 있다'}</small></div>`;
    h += '<div class="sect">장비</div>';
    for (const sl of ['weapon', 'shield', 'armor', 'pack']) {
      const it = c.equip[sl];
      h += `<div class="eq"><span class="slot">${G.SLOTS[sl]}</span> ${it ? `<b>${esc(G.Chars.gearName(it))}</b> <small>${G.Chars.gearDesc(it)}</small>` : '<small>없음</small>'}
        ${editable && c.loc === 'home' ? btn('pickgear', '변경', { id: c.id, slot: sl }) + (it ? btn('unequip', '해제', { id: c.id, slot: sl }) : '') : ''}</div>`;
    }
    if (c.spells.length) h += `<div class="kv">주문: ${c.spells.map(k => G.SPELLS[k].n).join(', ')}</div>`;
    h += '<div class="sect">기술</div><div class="skills">';
    const sk = k => `<span class="${c.skills[k] >= 5 ? 'hi' : c.skills[k] === 0 ? 'lo' : ''}">${G.SKILLS[k]} <b>${c.skills[k]}</b></span>`;
    h += `<div>${G.COMBAT_SKILLS.map(sk).join('')}</div><div>${G.WORK_SKILLS.map(sk).join('')}</div></div>`;
    if (c.loc === 'home' && c.thoughts.length) {
      h += `<div class="sect">기분 ${Math.round(c.mood)}</div>`;
      h += c.thoughts.map(t => `<div class="th ${t.v >= 0 ? 'good' : 'bad'}">${t.v > 0 ? '+' : ''}${t.v} ${esc(t.label)}</div>`).join('');
    }
    return h + '</div>';
  }

  function tabWork() {
    const live = S().colonists.filter(c => c.loc === 'home' || c.loc === 'away');
    let h = '<div class="hint">칸을 눌러 우선순위 변경 (1 높음 → 3 낮음 → 끔). 숫자 옆은 기술 레벨.</div><table class="work"><tr><th></th>';
    for (const w of G.WORK) h += `<th>${G.WORK_NAMES[w]}</th>`;
    h += '</tr>';
    for (const c of live) {
      h += `<tr><td class="nm" style="color:${c.color}">${esc(c.name)}</td>`;
      for (const w of G.WORK) {
        const p = c.pri[w], sk = G.WORK_SKILL[w];
        h += `<td data-act="pri" data-id="${c.id}" data-w="${w}" class="p${p}">${p || '·'}${sk ? `<sub>${c.skills[sk]}</sub>` : ''}</td>`;
      }
      h += '</tr>';
    }
    return h + '</table>';
  }

  function tabBuild() {
    const tools = [['select', '선택'], ['chop', '벌목'], ['mine', '채굴'], ['stock', '창고 구역'], ['farm', '농지 구역'], ['unzone', '구역 해제'], ['cancel', '지정 취소'], ['decon', '철거']];
    let h = '<div class="sect">명령</div><div class="tools">' + tools.map(([k, n]) => btn('tool', n, { v: k }, ui.tool === k ? 'on' : '')).join('') + '</div>';
    h += '<div class="hint">드래그로 영역 지정. 벽은 드래그한 사각형의 테두리에 놓인다. 우클릭/Esc: 선택 도구.</div>';
    const cats = [['struct', '구조물'], ['furn', '가구'], ['prod', '생산 시설']];
    for (const [cat, cn] of cats) {
      h += `<div class="sect">${cn}</div><div class="blist">`;
      for (const k in G.BUILD) {
        const d = G.BUILD[k];
        if (d.cat !== cat) continue;
        const locked = d.res && !S().research.done[d.res];
        h += `<button data-act="tool" data-v="b:${k}" class="${ui.tool === 'b:' + k ? 'on' : ''} ${locked ? 'locked' : ''}" ${locked ? 'disabled' : ''}>
          <b style="color:${d.c}">${d.g}</b> ${d.n}<small>${locked ? '연구 필요: ' + G.RESEARCH[d.res].n : costStr(d.cost)}</small></button>`;
      }
      h += '</div>';
    }
    return h;
  }

  function tabProd() {
    let h = '<div class="hint">목표 수량을 정하면 정착민이 그만큼 유지되도록 만든다. Shift+클릭: ±5</div>';
    const stations = ['stove', 'workbench', 'forge', 'alchemy', 'research_desk'];
    for (const st of stations) {
      const recs = Object.keys(G.RECIPES).filter(k => G.RECIPES[k].st === st);
      const n = G.Settle.bldCount(st), bd = G.BUILD[st];
      const locked = bd.res && !S().research.done[bd.res];
      h += `<div class="sect"><b style="color:${bd.c}">${bd.g}</b> ${bd.n} ${n ? `×${n}` : `<span class="miss">${locked ? '(연구 필요)' : '(건설 필요)'}</span>`}</div>`;
      for (const k of recs) {
        const r = G.RECIPES[k];
        if (!G.Settle.recipeUnlocked(r)) continue;
        const have = G.Settle.recipeCount(r), tgt = S().bills[k] || 0;
        h += `<div class="rec"><span class="rn">${r.n}</span><small>${costStr(r.in)}</small>
          <span class="tgt">${btn('bill', '−', { id: k, dv: -1 })}<b class="${have < tgt ? 'warn' : ''}">${have}/${tgt}</b>${btn('bill', '+', { id: k, dv: 1 })}</span></div>`;
      }
    }
    return h;
  }

  function tabResearch() {
    const R = S().research;
    let h = '';
    if (!G.Settle.bldCount('research_desk')) h += '<div class="hint warn">연구대를 건설하고, 정착민의 연구 작업을 켜야 연구가 진행된다.</div>';
    if (R.bank > 0) h += `<div class="hint">고대 유물 해독 점수 ${Math.floor(R.bank)} — 진행 중인 연구에 즉시 더해진다.</div>`;
    for (const k in G.RESEARCH) {
      const r = G.RESEARCH[k], done = R.done[k], cur = R.cur === k, prog = R.prog[k] || 0;
      const reqOk = (r.req || []).every(q => R.done[q]);
      let st = done ? '<span class="good">완료</span>' : cur ? '<span class="warn">진행 중</span>' : reqOk ? '' : `<span class="miss">선행: ${(r.req || []).map(q => G.RESEARCH[q].n).join(', ')}</span>`;
      const costHtml = Object.keys(r.cost).length ? (R.paid[k] ? '<small>재료 지불됨</small>' : `<small>재료: ${costStr(r.cost)}</small>`) : '';
      h += `<div class="resr ${done ? 'done' : ''} ${cur ? 'cur' : ''}"><div><b>${r.n}</b> ${st}</div><div class="rd">${r.d}</div>
        <div>${done ? '' : bar(prog, r.pts, '#5af', 90) + ` <small>${Math.floor(prog)}/${r.pts}</small> `}${costHtml}
        ${!done && !cur && reqOk ? btn('research', '연구 시작', { id: k }) : ''}</div></div>`;
    }
    return h;
  }

  function tabStore() {
    const st = S().store;
    let h = '<div class="sect">자원</div><div class="store">';
    for (const k in G.RES) if ((st[k] || 0) > 0) h += `<div><b style="color:${G.RES[k].c}">${G.RES[k].g}</b> ${G.RES[k].n} <b>${Math.floor(st[k])}</b></div>`;
    h += '</div><div class="sect">무기고</div>';
    if (!S().armory.length) h += '<div class="hint">비어 있음</div>';
    const sorted = S().armory.slice().sort((a, b) => (G.GEAR[a.base].slot + a.base).localeCompare(G.GEAR[b.base].slot + b.base));
    for (const it of sorted) h += `<div class="gear"><b>${esc(G.Chars.gearName(it))}</b> <small>${G.SLOTS[G.GEAR[it.base].slot]} · ${G.Chars.gearDesc(it)}</small></div>`;
    return h;
  }

  // ───────── 던전 측면 패널 ─────────
  function sideDungeon() {
    const d = S().dun;
    let h = '<div class="sect">원정대 <small>(Tab/클릭: 조종 전환)</small></div>';
    for (const id of d.party) {
      const c = S().colonists.find(o => o.id === id);
      if (!c) continue;
      if (c.loc === 'dead') { h += `<div class="pcard dead">☠ ${esc(c.name)}</div>`; continue; }
      const mx = G.Chars.maxHP(c), mm = G.Chars.maxMP(c);
      const sts = Object.keys(c.status).filter(k => k !== 'tauntBy').map(k => ({ poison: '중독', might: '괴력', haste: '신속', slow: '감속', stun: '기절' }[k] || k));
      const w = c.equip.weapon ? G.Chars.gearName(c.equip.weapon) : '맨손';
      h += `<div class="pcard ${d.ctrl === id ? 'on' : ''}" data-act="ctrl" data-id="${id}">
        <div><b style="color:${c.color}">@</b> <b>${esc(c.name)}</b> <small>Lv${c.xl} ${G.Chars.title(c)}</small> ${sts.map(s => `<span class="st">${s}</span>`).join('')}</div>
        <div class="bars">HP ${bar(c.hp, mx, c.hp < mx * 0.3 ? '#f33' : '#d33', 70)} ${Math.ceil(c.hp)}/${mx} MP ${bar(c.mp, mm, '#46f', 40)} ${Math.floor(c.mp)}</div>
        <div class="bars"><small>${esc(w)}</small> · 🍖${bar(c.food, 100, c.food < 25 ? '#f63' : '#da3', 30)}</div></div>`;
    }
    const c = G.Dun.ctrl();
    if (c) {
      const abs = G.Dun.abilities(c);
      h += `<div class="sect">${esc(c.name)}의 행동 ${ui.target ? '<span class="warn">— 대상 선택 중 (Tab 순환, Enter 확정, Esc 취소)</span>' : ''}</div><div class="abil">`;
      abs.forEach((a, i) => {
        const tip = a.spell ? G.SPELLS[a.id].d : a.id === 'fire' ? '장착한 활로 사격' : G.ABIL[a.id].d;
        h += btn('abil', `<b>${i + 1}</b> ${a.n}${a.mp ? ` <small>MP${a.mp}</small>` : ''}`, { i }, (c.mp < a.mp ? 'locked ' : '') + (ui.target && ui.target.ab.id === a.id ? 'on' : ''), tip);
      });
      if (!abs.length) h += '<small>특수 행동 없음 (무기 기술 2 이상에서 해금)</small>';
      h += '</div>';
    }
    const foes = G.Dun.visibleMons();
    h += `<div class="sect">보이는 적 ${foes.length ? foes.length : ''}</div>`;
    if (!foes.length) h += '<small class="dim">없음</small>';
    for (const m of foes.slice(0, 10)) {
      const md = G.MON[m.type], th = G.Dun.threat(m);
      h += `<div class="foe"><b style="color:${md.c}">${md.g}</b> <span style="color:${th.c}">${esc(G.Dun.monLine(m))}</span>${md.desc ? `<div class="fd">${md.desc}</div>` : ''}</div>`;
    }
    h += `<div class="sect">명령</div><div class="tools">
      ${btn('dcmd', '탐험 (o)', { v: 'explore' })}${btn('dcmd', '휴식 (R)', { v: 'rest' })}${btn('dcmd', '줍기 (g)', { v: 'pickup' })}${btn('dcmd', '대기 (.)', { v: 'wait' })}
      ${btn('dcmd', '계단 &lt;', { v: '<' })}${btn('dcmd', '계단 &gt;', { v: '>' })}
      ${btn('dcmd', d.hold ? '동료: 자리 지킴 (H)' : '동료: 따라옴 (H)', { v: 'hold' }, d.hold ? 'on' : '')}
      ${btn('dcmd', d.manual ? '수동 지휘 켜짐 (M)' : '수동 지휘 꺼짐 (M)', { v: 'manual' }, d.manual ? 'on' : '', '켜면 모든 대원의 차례마다 직접 명령한다')}
      ${btn('dcmd', '캐릭터 (c)', { v: 'sheet' })}</div>`;
    return h;
  }

  // ───────── 로그 ─────────
  function renderLog() {
    const log = S().log.slice(-80);
    $('log').innerHTML = log.map(m => `<div class="${m.c}">${esc(m.t)}</div>`).join('');
    $('log').scrollTop = $('log').scrollHeight;
  }

  function setHTML(id, html) {
    if (ui.last[id] === html) return;
    ui.last[id] = html;
    const el = $(id), sc = el.scrollTop;
    el.innerHTML = html;
    el.scrollTop = sc;
  }

  function refresh() {
    if (!S() || S().mode === 'title') { setHTML('topbar', '<div class="tb-title">던전 개척단</div>'); setHTML('side', ''); return; }
    if (S().mode === 'settle') { setHTML('topbar', topSettle()); setHTML('side', sideSettle()); }
    else if (S().dun) { setHTML('topbar', topDungeon()); setHTML('side', sideDungeon()); }
    if (G.logDirty) { renderLog(); G.logDirty = false; }
    renderTooltip();
  }

  function renderTooltip() {
    const tip = $('tooltip');
    if (!ui.hover || !ui.mouse || ui.modals.length) { tip.style.display = 'none'; return; }
    const info = S().mode === 'settle' ? G.Settle.tileInfo(ui.hover.x, ui.hover.y) : S().dun ? G.Dun.tileInfo(ui.hover.x, ui.hover.y) : null;
    if (!info || !info.length) { tip.style.display = 'none'; return; }
    tip.innerHTML = info.map(esc).join('<br>');
    tip.style.display = 'block';
    const r = $('mapwrap').getBoundingClientRect();
    let x = ui.mouse.x + 16, y = ui.mouse.y + 14;
    if (x + 260 > r.width) x = ui.mouse.x - 260;
    if (y + 90 > r.height) y = ui.mouse.y - 80;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }

  // ───────── 모달 ─────────
  function openModal(fn, opts) { ui.modals.push({ fn, opts: opts || {} }); renderModal(); }
  function closeModal() { const m = ui.modals.pop(); renderModal(); if (m && m.opts.onClose) m.opts.onClose(); }
  function closeAll() { ui.modals = []; renderModal(); }
  function renderModal() {
    const m = ui.modals[ui.modals.length - 1];
    const el = $('modal');
    if (!m) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const box = $('modalbox'), sc = box.scrollTop;
    box.innerHTML = m.fn() + (m.opts.locked ? '' : `<div class="mclose">${btn('close', '닫기 (Esc)', {})}</div>`);
    box.scrollTop = sc;
  }
  const modalOpen = () => ui.modals.length > 0;

  function prompt(text, yes, no) {
    openModal(() => `<h2>확인</h2><p>${esc(text)}</p><div class="row">${btn('yes', '예 (y)', {}, 'big')}${btn('no', '아니요 (n)', {})}</div>`, { prompt: { yes, no }, locked: true });
  }

  function charSheet(c) {
    return `<h2>${esc(c.name)}</h2>${details(c, false)}`;
  }

  function gearPicker(cid, slot) {
    const c = S().colonists.find(o => o.id === cid);
    const items = S().armory.filter(g => G.GEAR[g.base].slot === slot);
    let h = `<h2>${esc(c.name)} — ${G.SLOTS[slot]} 선택</h2>`;
    if (!items.length) h += '<p class="dim">무기고에 해당 장비가 없다. 작업대·대장간에서 만들거나 던전에서 찾아오자.</p>';
    for (const it of items) h += `<div class="gear pick" data-act="equipFrom" data-id="${cid}" data-g="${it.id}"><b>${esc(G.Chars.gearName(it))}</b> <small>${G.Chars.gearDesc(it)}</small></div>`;
    return h;
  }

  function equipFromArmory(c, gid) {
    const it = S().armory.find(g => g.id === gid);
    if (!it) return;
    const gd = G.GEAR[it.base];
    S().armory.splice(S().armory.indexOf(it), 1);
    const un = sl => { if (c.equip[sl]) { S().armory.push(c.equip[sl]); c.equip[sl] = null; } };
    un(gd.slot);
    if (gd.slot === 'weapon' && gd.two) un('shield');
    if (gd.slot === 'shield' && c.equip.weapon && G.GEAR[c.equip.weapon.base].two) un('weapon');
    c.equip[gd.slot] = it;
    c.hp = Math.min(c.hp, G.Chars.maxHP(c)); c.mp = Math.min(c.mp, G.Chars.maxMP(c));
  }

  // 원정 준비
  const SUPPLY = ['ration', 'hearty_ration', 'meal', 'fine_meal', 'potion_heal', 'potion_might', 'potion_haste', 'scroll_return', 'scroll_blink', 'scroll_mapping', 'book_dart', 'book_fire', 'book_heal', 'book_blink', 'book_slow'];
  function openExpedition() {
    const home = S().colonists.filter(c => c.loc === 'home');
    if (!home.length) { toast('원정을 떠날 정착민이 없다.', 'bad'); return; }
    const pick = home.slice().sort((a, b) => b.xl * 10 + b.hp / G.Chars.maxHP(b) - (a.xl * 10 + a.hp / G.Chars.maxHP(a))).slice(0, Math.min(4, Math.max(1, home.length - 1)));
    ui.exp = { sel: pick.map(c => c.id), sup: {}, depth: 1 };
    ui.exp.sup.ration = Math.min(S().store.ration || 0, pick.length * 3);
    ui.exp.sup.potion_heal = Math.min(S().store.potion_heal || 0, 3);
    ui.exp.sup.scroll_return = Math.min(S().store.scroll_return || 0, 1);
    ui.paused = true;
    const n = autoEquip(ui.exp.sel);
    if (n) toast(`무기고에서 빈 슬롯 장비 ${n}개를 자동으로 챙겼다.`);
    openModal(renderExpedition);
  }
  // 원정대의 빈 슬롯을 무기고의 가장 좋은 장비로 채운다
  function autoEquip(ids) {
    const score = it => { const d = G.GEAR[it.base]; return (d.dmg || 0) + (d.ac || 0) * 1.5 + (d.cap || 0) / 4 + it.plus * 2 + (it.ego ? 2 : 0); };
    let n = 0;
    for (const id of ids) {
      const c = S().colonists.find(o => o.id === id);
      for (const sl of ['weapon', 'armor', 'shield', 'pack']) {
        if (c.equip[sl]) continue;
        if (sl === 'shield' && c.equip.weapon && G.GEAR[c.equip.weapon.base].two) continue;
        const cands = S().armory.filter(g => G.GEAR[g.base].slot === sl && !(sl === 'weapon' && G.GEAR[g.base].two && c.equip.shield)).sort((a, b) => score(b) - score(a));
        if (cands.length) { equipFromArmory(c, cands[0].id); n++; }
      }
    }
    return n;
  }
  function expCap() {
    let cap = 10;
    for (const id of ui.exp.sel) { const c = S().colonists.find(o => o.id === id); cap += c.str; if (c.equip.pack) cap += G.GEAR[c.equip.pack.base].cap; }
    return cap;
  }
  function expWeight() { let w = 0; for (const k in ui.exp.sup) w += G.RES[k].w * ui.exp.sup[k]; return Math.round(w * 10) / 10; }
  function renderExpedition() {
    const e = ui.exp;
    const home = S().colonists.filter(c => c.loc === 'home');
    let h = '<h2>⚔ 원정 준비</h2><div class="sect">대원 (최대 4명)</div>';
    for (const c of home) {
      const on = e.sel.includes(c.id), mx = G.Chars.maxHP(c);
      const eq = ['weapon', 'shield', 'armor', 'pack'].map(sl => c.equip[sl] ? G.Chars.gearName(c.equip[sl]) : null).filter(Boolean).join(', ') || '장비 없음';
      h += `<div class="exprow ${on ? 'on' : ''}"><span data-act="expToggle" data-id="${c.id}" class="chk">${on ? '☑' : '☐'}</span>
        <b style="color:${c.color}">@</b> <b>${esc(c.name)}</b> <small>Lv${c.xl} ${G.Chars.title(c)}</small> HP ${bar(c.hp, mx, '#d33', 40)} ${Math.ceil(c.hp)}/${mx}
        ${c.hp < mx * 0.5 ? '<span class="miss">부상</span>' : ''} ${c.food < 40 ? '<span class="miss">배고픔</span>' : ''}
        <div class="eqline"><small>${esc(eq)}</small> ${['weapon', 'shield', 'armor', 'pack'].map(sl => btn('pickgear', G.SLOTS[sl], { id: c.id, slot: sl }, 'mini')).join('')}</div></div>`;
    }
    const left = home.length - e.sel.length;
    h += `<div class="hint ${left === 0 ? 'warn' : ''}">정착지에 남는 인원: ${left}명 ${left === 0 ? '— 아무도 남지 않으면 습격 때 정착지가 무방비로 파괴된다!' : ''}</div>`;
    h += `<div class="sect">보급품 — 가방 ${expWeight()} / ${expCap()} <small>(남는 공간에 전리품을 담아 온다)</small></div>`;
    let any = false;
    for (const k of SUPPLY) {
      const have = S().store[k] || 0;
      if (!have && !e.sup[k]) continue;
      any = true;
      const q = e.sup[k] || 0;
      h += `<div class="rec"><span class="rn"><b style="color:${G.RES[k].c}">${G.RES[k].g}</b> ${G.RES[k].n}</span><small>${G.RES[k].d || (G.RES[k].eat ? '배고픔 +' + G.RES[k].eat : '')} · 보유 ${have}</small>
        <span class="tgt">${btn('expSup', '−', { k, dv: -1 })}<b>${q}</b>${btn('expSup', '+', { k, dv: 1 })}</span></div>`;
    }
    if (!any) h += '<div class="hint warn">가져갈 보급품이 없다. 화덕에서 휴대식량을 만들자.</div>';
    const food = (e.sup.ration || 0) * 55 + (e.sup.hearty_ration || 0) * 80 + (e.sup.meal || 0) * 70 + (e.sup.fine_meal || 0) * 85;
    const turns = e.sel.length ? Math.floor(food / (e.sel.length * (100 / 1320))) : 0;
    h += `<div class="hint">식량으로 버틸 수 있는 시간: 약 ${turns}턴 (+ 대원들의 현재 포만감)</div>`;
    const depths = [1];
    if (G.Settle.bldCount('waystone')) { if (S().maxDepth >= 4) depths.push(4); if (S().maxDepth >= 7) depths.push(7); }
    if (depths.length > 1) h += `<div class="sect">출발 층 (길잡이 돌)</div><div class="tools">${depths.map(v => btn('expDepth', v + '층', { v }, e.depth === v ? 'on' : '')).join('')}</div>`;
    h += `<div class="row">${btn('expGo', '던전으로 출발', {}, 'big')}</div>`;
    return h;
  }

  function startExpedition() {
    const e = ui.exp;
    if (!e.sel.length) { toast('대원을 한 명 이상 고르자.', 'bad'); return; }
    if (expWeight() > expCap()) { toast('가방이 너무 무겁다.', 'bad'); return; }
    for (const k in e.sup) { if (!e.sup[k]) { delete e.sup[k]; continue; } S().store[k] -= e.sup[k]; }
    closeAll();
    ui.tool = 'select'; ui.drag = null; ui.target = null;
    S().mode = 'dungeon';
    G.Dun.start(e.sel, e.sup, e.depth);
    G.save();
  }

  // 지원자
  function recruitModal() {
    const cands = S().pendingRecruits[0];
    if (!cands) return '';
    let h = `<h2>지원자가 찾아왔다</h2><p class="dim">정착지에 합류하고 싶어 한다. ${cands.length > 1 ? '한 명을 고를 수 있다.' : ''}</p><div class="cards">`;
    cands.forEach((c, i) => { h += `<div class="card">${candCard(c)}<div class="row">${btn('recruit', '영입', { i }, 'big')}</div></div>`; });
    return h + `</div><div class="row">${btn('reject', '모두 돌려보내기', {})}</div>`;
  }
  function candCard(c) {
    const cs = G.Chars.stats(c);
    const skills = Object.entries(c.skills).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${G.SKILLS[k]} ${v}`).join(' · ');
    const eq = ['weapon', 'shield', 'armor'].map(s => c.equip[s] && G.Chars.gearName(c.equip[s])).filter(Boolean).join(', ') || '장비 없음';
    return `<div class="cn"><b style="color:${c.color}">@</b> <b>${esc(c.name)}</b></div><div>${G.Chars.title(c)}</div><div>${traitsHtml(c)}</div>
      <div class="kv">힘 ${c.str} · 민첩 ${c.dex} · 지능 ${c.int} · HP ${G.Chars.maxHP(c)} · 회피 ${cs.ev.toFixed(0)}</div>
      <div class="kv"><small>${skills}</small></div><div class="kv"><small>${esc(eq)}${c.spells.length ? ' · 주문: ' + c.spells.map(k => G.SPELLS[k].n).join(', ') : ''}</small></div>`;
  }
  function showRecruitIfAny() {
    if (S().mode !== 'settle' || modalOpen() || !S().pendingRecruits.length) return;
    ui.paused = true;
    openModal(recruitModal, { locked: true });
  }

  // 원정 결과
  function summaryModal(sum) {
    const loot = Object.entries(sum.loot).map(([k, q]) => `<span class="res"><b style="color:${G.RES[k].c}">${G.RES[k].g}</b>${G.RES[k].n} ×${q}</span>`).join(' ');
    return `<h2>${sum.kind === 'wipe' ? '☠ 원정대 전멸' : '원정 귀환'}</h2>
      <div class="kv">최고 깊이 지하 ${sum.deepest}층 · 처치 ${sum.kills} · ${sum.turns}턴</div>
      ${sum.dead.length ? `<div class="kv bad">잃은 대원: ${sum.dead.map(esc).join(', ')}</div>` : ''}
      ${sum.rescued.length ? `<div class="kv good">구출: ${sum.rescued.map(esc).join(', ')}</div>` : ''}
      ${sum.kind !== 'wipe' ? `<div class="sect">전리품</div><div>${loot || '<span class="dim">없음</span>'}</div>${sum.gear.length ? `<div class="kv">장비: ${sum.gear.map(esc).join(', ')}</div>` : ''}${sum.loot.relic ? `<div class="kv good">고대 유물 해독 점수 +${sum.loot.relic * 150}</div>` : ''}` : '<p class="dim">가방에 든 모든 것을 잃었다.</p>'}`;
  }

  // 가방 (던전)
  function bagModal() {
    const d = S().dun;
    if (!d) return '';
    const party = G.Dun.alive();
    let h = `<h2>가방 ${G.Dun.bagWeight()} / ${G.Dun.bagCap()}</h2><div class="hint">버튼의 이름은 대상이 되는 대원. 사용에 한 턴이 든다.</div>`;
    const stacks = Object.keys(d.bag.stacks).filter(k => d.bag.stacks[k] > 0);
    for (const k of stacks) {
      const r = G.RES[k], usable = r.use || r.eat;
      const targets = usable ? (r.use === 'return' || r.use === 'mapping' ? [G.Dun.ctrl()] : party) : [];
      h += `<div class="rec"><span class="rn"><b style="color:${r.c}">${r.g}</b> ${r.n} ×${d.bag.stacks[k]}</span><small>${r.d || ''}</small>
        <span class="tgt">${targets.map(c => btn('use', esc(c.name), { k, id: c.id }, 'mini')).join('')}${btn('drop', '버림', { k }, 'mini')}</span></div>`;
    }
    if (d.bag.gear.length) h += '<div class="sect">장비</div>';
    for (const g of d.bag.gear) {
      h += `<div class="rec"><span class="rn"><b>${G.R.gearGlyph(g)}</b> ${esc(G.Chars.gearName(g))}</span><small>${G.Chars.gearDesc(g)}</small>
        <span class="tgt">${party.map(c => btn('equipBag', esc(c.name), { g: g.id, id: c.id }, 'mini')).join('')}${btn('drop', '버림', { k: 'gear', g: g.id }, 'mini')}</span></div>`;
    }
    if (!stacks.length && !d.bag.gear.length) h += '<p class="dim">비어 있다.</p>';
    return h;
  }

  const HELP = `<h2>던전 개척단 — 도움말</h2>
  <p>길드가 보낸 개척단을 이끌어 던전 입구 앞에 정착지를 세우고, 원정대를 보내 <b>지하 10층의 던전의 심장</b>을 파괴하라. 죽은 정착민은 돌아오지 않는다.</p>
  <div class="sect">순환</div>
  <p>정착지에서 식량·휴대식량·장비를 만든다 → 최대 4명이 원정을 떠난다 → 던전에서 광석·가죽·뼈·수정·정수·유물을 가방에 담아 온다 → 그 재료로 연구하고 더 좋은 장비를 만든다.
  원정 중에도 정착지의 시간은 흐른다. <b>던전 압력</b>이 100%가 되면 괴물이 입구에서 쏟아져 나오므로, 남은 정착민과 벽·문·함정으로 지켜야 한다. 던전에서 괴물을 처치하고 새 깊이에 도달하면 압력이 줄어든다.</p>
  <div class="sect">정착지 조작</div>
  <p>Space: 일시정지 · 1/2/3: 속도 · 건설 탭에서 도구를 고르고 지도에서 드래그 · 우클릭/Esc: 선택 도구 · 방향키: 지도 이동(화면이 작을 때) · 빈 땅 드래그: 지도 이동 · 마우스 휠: 확대/축소 · T: 타일/글자 화면 전환 · E: 원정 준비 · R: 전원 징집/해제</p>
  <p><b>징집</b>: 정착민을 징집하면 일을 멈추고, 선택한 뒤 지도를 우클릭해 그곳으로 보낼 수 있다. 징집된 정착민은 닿는 적을 공격한다. 습격 때 문 앞을 지키게 하자.</p>
  <div class="sect">던전 조작 (DCSS 방식)</div>
  <p>방향키 / 숫자패드 / hjklyubn: 이동·공격 · 적에게 부딪히면 공격, 광맥에 부딪히면 채굴 · . 또는 숫자패드5: 대기 · o: 자동 탐험 · R: 휴식(회복까지)
  · &lt; &gt;: 계단 이용 (계단 위가 아니면 계단까지 자동 이동) · g: 줍기 · i: 가방 · f: 사격 · 1~9: 행동/주문 · Tab: 조종할 대원 전환 · H: 동료 따라오기/자리 지킴 · M: 수동 지휘 · c: 캐릭터 정보 · 지도 클릭: 그곳으로 이동</p>
  <p>적 이름 색: <span style="color:#909090">쉬움</span> · 보통 · <span style="color:#ffd040">위험</span> · <span style="color:#ff4040">매우 위험</span> (파티 평균 레벨 기준). 잠든 적은 기습하면 피해 1.5배.</p>
  <p>첫 층의 올라가는 계단(&lt;)으로 정착지에 돌아간다. 전멸하면 가방의 전리품도 모두 잃는다.</p>`;

  // 새 게임
  function titleModal() {
    return `<div class="title"><h1>던전 개척단</h1><p class="dim">림월드식 정착지 × DCSS식 던전 탐험</p>
      <div class="row">${btn('newgame', '새 게임', {}, 'big')}${G.hasSave() ? btn('continue', '이어하기', {}, 'big') : ''}</div>
      <p class="dim small">영감: Dungeon Settlers (CanOpener), RimWorld, Dungeon Crawl Stone Soup, Brogue</p></div>`;
  }
  function draftModal() {
    let h = '<h2>개척단 구성</h2><p class="dim">길드가 보낸 네 명의 개척자. 마음에 들지 않으면 다시 뽑을 수 있다.</p><div class="cards">';
    ui.draft.forEach((c, i) => { h += `<div class="card">${candCard(c)}<div class="row">${btn('reroll', '다시 뽑기', { i })}</div></div>`; });
    return h + `</div><div class="row">${btn('rerollAll', '모두 다시 뽑기', {})}${btn('draftGo', '이대로 출발', {}, 'big')}</div>`;
  }
  function draftOne(i) {
    const taken = ui.draft.filter((c, j) => j !== i).map(c => c.name);
    ui.draft[i] = G.Chars.create(taken);
  }

  // ───────── 동작 ─────────
  const A = {
    tab: el => { ui.tab = el.dataset.v; },
    sel: el => { ui.sel = +el.dataset.id; const c = S().colonists.find(o => o.id === ui.sel); if (c && c.loc === 'home') { ui.camX = c.x; ui.camY = c.y; } },
    speed: el => { const v = +el.dataset.v; if (v === 0) ui.paused = !ui.paused; else { ui.speed = v; ui.paused = false; } },
    tool: el => { ui.tool = el.dataset.v; ui.drag = null; },
    pri: el => { const c = S().colonists.find(o => o.id === +el.dataset.id); const w = el.dataset.w; c.pri[w] = (c.pri[w] + 1) % 4; },
    bill: (el, ev) => { const k = el.dataset.id; S().bills[k] = Math.max(0, (S().bills[k] || 0) + (+el.dataset.dv) * (ev.shiftKey ? 5 : 1)); },
    research: el => {
      const k = el.dataset.id, R = S().research, r = G.RESEARCH[k];
      if (!R.paid[k] && Object.keys(r.cost).length) {
        if (!G.Settle.Store.has(r.cost)) { toast(`재료가 부족하다: ${Object.entries(r.cost).map(([a, b]) => G.RES[a].n + ' ' + b).join(', ')}`, 'bad'); return; }
        G.Settle.Store.take(r.cost);
        R.paid[k] = true;
      }
      R.cur = k;
      toast(`연구 시작: ${r.n}`);
    },
    expedition: () => openExpedition(),
    draft: el => { const c = S().colonists.find(o => o.id === +el.dataset.id); G.Settle.setDraft(c, !c.drafted); },
    draftAll: () => {
      const home = S().colonists.filter(c => c.loc === 'home');
      const on = !home.some(c => c.drafted);
      for (const c of home) G.Settle.setDraft(c, on);
      if (on) toast('전원 징집. 정착민을 골라 우클릭으로 배치하자.');
    },
    expToggle: el => {
      const id = +el.dataset.id, e = ui.exp;
      if (e.sel.includes(id)) e.sel = e.sel.filter(o => o !== id);
      else if (e.sel.length < 4) { e.sel.push(id); autoEquip([id]); }
      else toast('원정대는 최대 4명이다.', 'bad');
    },
    expSup: (el, ev) => {
      const k = el.dataset.k, e = ui.exp, n = ev.shiftKey ? 5 : 1;
      e.sup[k] = U.clamp((e.sup[k] || 0) + (+el.dataset.dv) * n, 0, S().store[k] || 0);
    },
    expDepth: el => { ui.exp.depth = +el.dataset.v; },
    expGo: () => startExpedition(),
    pickgear: el => openModal(() => gearPicker(+el.dataset.id, el.dataset.slot)),
    equipFrom: el => { const c = S().colonists.find(o => o.id === +el.dataset.id); equipFromArmory(c, +el.dataset.g); closeModal(); },
    unequip: el => { const c = S().colonists.find(o => o.id === +el.dataset.id); const sl = el.dataset.slot; if (c.equip[sl]) { S().armory.push(c.equip[sl]); c.equip[sl] = null; c.hp = Math.min(c.hp, G.Chars.maxHP(c)); } },
    recruit: el => {
      const cands = S().pendingRecruits.shift(), c = cands[+el.dataset.i];
      S().colonists.push(c);
      G.Settle.arrive(c);
      G.msg(`${c.name}(${G.Chars.title(c)})이(가) 정착지에 합류했다.`, 'good');
      closeModal();
      showRecruitIfAny();
    },
    reject: () => { S().pendingRecruits.shift(); closeModal(); showRecruitIfAny(); },
    close: () => closeModal(),
    yes: () => { const p = ui.modals[ui.modals.length - 1].opts.prompt; ui.modals.pop(); renderModal(); if (p.yes) p.yes(); },
    no: () => { const p = ui.modals[ui.modals.length - 1].opts.prompt; ui.modals.pop(); renderModal(); if (p.no) p.no(); },
    help: () => openModal(() => HELP),
    gfx: () => { G.R.setGfx(G.R.gfx() === 'tiles' ? 'glyph' : 'tiles'); refresh(); },
    savegame: () => { const ok = G.save(); toast(ok ? '저장했다.' : '저장 실패', ok ? '' : 'bad'); },
    ctrl: el => { G.Dun.switchCtrl(+el.dataset.id); ui.target = null; },
    abil: el => startAbility(+el.dataset.i),
    dcmd: el => dungeonCmd(el.dataset.v),
    use: el => {
      const c = S().colonists.find(o => o.id === +el.dataset.id);
      closeAll();
      if (!G.Dun.cmd('use', el.dataset.k, c)) toast('사용할 수 없다.', 'bad');
    },
    equipBag: el => { closeAll(); G.Dun.cmd('equip', +el.dataset.g, +el.dataset.id); },
    drop: el => { closeAll(); G.Dun.cmd('drop', el.dataset.k, el.dataset.g ? +el.dataset.g : null); },
    newgame: () => {
      G.newState();
      ui.draft = [];
      for (let i = 0; i < 4; i++) ui.draft.push(G.Chars.create(ui.draft.map(c => c.name)));
      closeAll();
      openModal(draftModal, { locked: true });
    },
    continue: () => { if (G.load()) { closeAll(); ui.paused = true; toast('불러왔다. (일시정지 상태)'); afterLoad(); } else toast('불러오기 실패', 'bad'); },
    reroll: el => draftOne(+el.dataset.i),
    rerollAll: () => { for (let i = 0; i < 4; i++) draftOne(i); },
    draftGo: () => {
      G.startGame(ui.draft);
      ui.draft = null; closeAll();
      ui.paused = false; ui.speed = 1; ui.tab = 'build';
      G.save();
      openModal(() => HELP + '<div class="hint">처음에는: 벌목 지정 → 침대·식탁 → 농지 구역 → 연구대. 화덕에서 휴대식량을 만들어 원정을 준비하자.</div>');
    },
    restart: () => { G.deleteSave(); closeAll(); openModal(titleModal, { locked: true }); },
    keepPlaying: () => closeAll(),
  };

  function afterLoad() { ui.last = {}; G.logDirty = true; }

  // ───────── 던전 명령 ─────────
  function startAbility(i) {
    const c = G.Dun.ctrl();
    if (!c || !S().dun.waiting) return;
    const ab = G.Dun.abilities(c)[i];
    if (!ab) return;
    if (c.mp < ab.mp) { G.msg('MP가 부족하다.', 'warn'); return; }
    if (ab.tgt === 'self') { G.Dun.cmd('ability', ab.id, c); return; }
    const list = G.Dun.targetsFor(c, ab);
    if (!list.length) { G.msg(ab.tgt === 'ally' ? '치유할 대상이 없다.' : '사정거리 안에 대상이 없다.', 'warn'); return; }
    let idx = Math.max(0, list.findIndex(t => t.id === S().dun.focus));
    ui.target = { ab, list, idx, key: i };
  }
  function confirmTarget() {
    const t = ui.target;
    ui.target = null;
    if (t) G.Dun.cmd('ability', t.ab.id, t.list[t.idx]);
  }
  function dungeonCmd(v) {
    const d = S().dun;
    if (!d) return;
    switch (v) {
      case 'explore': G.Dun.setAuto('explore'); break;
      case 'rest': G.Dun.setAuto('rest'); break;
      case 'pickup': G.Dun.cmd('pickup'); break;
      case 'wait': G.Dun.cmd('wait'); break;
      case '<': case '>': G.Dun.cmd('stairs', v); break;
      case 'hold': d.hold = !d.hold; G.msg(d.hold ? '동료들이 자리를 지킨다.' : '동료들이 따라온다.', 'dim'); break;
      case 'manual': d.manual = !d.manual; G.msg(d.manual ? '수동 지휘: 모든 대원의 차례마다 직접 명령한다.' : '수동 지휘 해제: 조종 중인 대원 외에는 스스로 싸운다.', 'dim'); break;
      case 'inv': openModal(bagModal); break;
      case 'sheet': { const c = G.Dun.ctrl(); if (c) openModal(() => charSheet(c)); break; }
    }
  }

  // ───────── 입력 ─────────
  const DIRK = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    h: [-1, 0], j: [0, 1], k: [0, -1], l: [1, 0], y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
  };
  const NUMPAD = { Numpad1: [-1, 1], Numpad2: [0, 1], Numpad3: [1, 1], Numpad4: [-1, 0], Numpad6: [1, 0], Numpad7: [-1, -1], Numpad8: [0, -1], Numpad9: [1, -1] };

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (modalOpen()) {
      const m = ui.modals[ui.modals.length - 1];
      if (m.opts.prompt) {
        if (k === 'y' || k === 'Y' || k === 'Enter') { A.yes(); e.preventDefault(); }
        else if (k === 'n' || k === 'N' || k === 'Escape') { A.no(); e.preventDefault(); }
        return;
      }
      if (k === 'Escape' && !m.opts.locked) { closeModal(); e.preventDefault(); }
      else if ((k === 'i' && S().dun) || (k === 'c' && S().dun) || k === '?') { if (!m.opts.locked) { closeModal(); e.preventDefault(); } }
      return;
    }
    if (!S() || S().mode === 'title') return;
    if (k === 'T') { A.gfx(); e.preventDefault(); return; }
    if (S().mode === 'settle') {
      if (k === ' ') { ui.paused = !ui.paused; e.preventDefault(); }
      else if (k === '1' || k === '2' || k === '3') { ui.speed = +k; ui.paused = false; }
      else if (k === 'Escape') { ui.tool = 'select'; ui.drag = null; }
      else if (k === 'e' || k === 'E') openExpedition();
      else if (k === 'r' || k === 'R') A.draftAll();
      else if (k === '?') A.help();
      else if (DIRK[k] && k.startsWith('Arrow')) {
        const [dx, dy] = DIRK[k];
        ui.camX = U.clamp((ui.camX != null ? ui.camX : G.Settle.W / 2) + dx * 4, 0, G.Settle.W);
        ui.camY = U.clamp((ui.camY != null ? ui.camY : G.Settle.H / 2) + dy * 4, 0, G.Settle.H);
        e.preventDefault();
      }
      return;
    }
    // 던전
    const d = S().dun;
    if (!d) return;
    if (ui.target) {
      const t = ui.target;
      if (k === 'Escape') ui.target = null;
      else if (k === 'Tab' || k === '+' || k === '=' || k === ' ') t.idx = (t.idx + 1) % t.list.length;
      else if (k === '-') t.idx = (t.idx - 1 + t.list.length) % t.list.length;
      else if (k === 'Enter' || k === 'f' || k === String(t.key + 1)) confirmTarget();
      e.preventDefault();
      return;
    }
    if (d.auto && k !== 'Shift') { d.auto = null; G.msg('자동 행동을 멈췄다.', 'dim'); e.preventDefault(); return; }
    const dir = NUMPAD[e.code] || DIRK[k];
    if (dir) { G.Dun.cmd('move', dir[0], dir[1]); e.preventDefault(); return; }
    switch (k) {
      case '.': case 's': G.Dun.cmd('wait'); break;
      case 'Clear': G.Dun.cmd('wait'); break;
      case 'o': dungeonCmd('explore'); break;
      case 'R': dungeonCmd('rest'); break;
      case '<': case '>': G.Dun.cmd('stairs', k); break;
      case 'g': case ',': G.Dun.cmd('pickup'); break;
      case 'i': dungeonCmd('inv'); break;
      case 'c': dungeonCmd('sheet'); break;
      case 'H': dungeonCmd('hold'); break;
      case 'M': dungeonCmd('manual'); break;
      case '?': A.help(); break;
      case 'f': {
        const c = G.Dun.ctrl(), abs = c ? G.Dun.abilities(c) : [];
        const i = abs.findIndex(a => a.id === 'fire');
        if (i >= 0) startAbility(i); else G.msg('원거리 무기가 없다.', 'warn');
        break;
      }
      case 'Tab': {
        const party = G.Dun.alive();
        const i = party.findIndex(c => c.id === d.ctrl);
        const nx = party[(i + 1) % party.length];
        if (nx) G.Dun.switchCtrl(nx.id);
        break;
      }
      default:
        if (e.code === 'Numpad5') { G.Dun.cmd('wait'); break; }
        if (/^[1-9]$/.test(k)) startAbility(+k - 1);
        else return;
    }
    e.preventDefault();
  }

  function onPointerDownUI(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.act];
    if (!fn) return;
    e.preventDefault();
    fn(el, e);
    ui.last = {};
    refresh();
    if (modalOpen()) renderModal();
  }

  function canvasPos(e) {
    const r = G.R && document.getElementById('cv').getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onCanvasDown(e) {
    if (modalOpen() || !S() || S().mode === 'title') return;
    const p = canvasPos(e), m = G.R.toMap(p.x, p.y);
    if (e.button === 2) {
      if (S().mode === 'settle' && ui.tool === 'select') {
        const c = S().colonists.find(o => o.id === ui.sel && o.loc === 'home' && o.drafted);
        if (c) { G.Settle.orderMove(c, m.x, m.y); return; }
      }
      ui.tool = 'select'; ui.drag = null; ui.target = null; return;
    }
    if (S().mode === 'settle') {
      if (ui.tool === 'select') {
        const c = S().colonists.find(o => o.loc === 'home' && o.x === m.x && o.y === m.y);
        if (c) { ui.sel = c.id; ui.tab = 'colonists'; }
        else { const v = G.R.view(); ui.pan = { x: p.x, y: p.y, cx: v.cx, cy: v.cy }; }
        return;
      }
      ui.drag = m;
      return;
    }
    const d = S().dun;
    if (!d) return;
    if (ui.target) {
      const i = ui.target.list.findIndex(t => t.x === m.x && t.y === m.y);
      if (i >= 0) { ui.target.idx = i; confirmTarget(); }
      else ui.target = null;
      return;
    }
    const pc = G.Dun.alive().find(c => c.x === m.x && c.y === m.y);
    if (pc) { G.Dun.switchCtrl(pc.id); return; }
    const c = G.Dun.ctrl();
    if (!c) return;
    if (U.cheb(c.x, c.y, m.x, m.y) === 1) { G.Dun.cmd('move', m.x - c.x, m.y - c.y); return; }
    const lv = G.Dun.level();
    if (m.x >= 0 && m.y >= 0 && m.x < G.Dun.W && m.y < G.Dun.H && lv.seen[m.y * G.Dun.W + m.x] && G.Dun.passT(m.x, m.y)) G.Dun.setAuto('travel', m.x, m.y);
  }

  function onCanvasMove(e) {
    const p = canvasPos(e);
    ui.mouse = p;
    ui.hover = G.R.toMap(p.x, p.y);
    if (ui.pan && S() && S().mode === 'settle') {
      const v = G.R.view();
      ui.camX = U.clamp(ui.pan.cx - (p.x - ui.pan.x) / v.cell, 0, G.Settle.W);
      ui.camY = U.clamp(ui.pan.cy - (p.y - ui.pan.y) / v.cell, 0, G.Settle.H);
    }
  }

  function onWheel(e) {
    if (modalOpen() || !S() || S().mode === 'title') return;
    e.preventDefault();
    const p = canvasPos(e), view = S().mode === 'settle' ? 'settle' : 'dungeon';
    const c = G.R.zoomAt(view, e.deltaY < 0 ? 1 : -1, p.x, p.y);
    if (view === 'settle') { ui.camX = U.clamp(c.x, 0, G.Settle.W); ui.camY = U.clamp(c.y, 0, G.Settle.H); }
  }

  function onCanvasUp(e) {
    ui.pan = null;
    if (!ui.drag || S().mode !== 'settle') { ui.drag = null; return; }
    const p = canvasPos(e), m = G.R.toMap(p.x, p.y);
    const n = G.Settle.applyTool(ui.tool, ui.drag.x, ui.drag.y, m.x, m.y);
    ui.drag = null;
    if (!n && ui.tool.startsWith('b:')) toast('그곳에는 지을 수 없다.', 'bad');
  }

  // ───────── 게임 이벤트 ─────────
  function onEvent(kind, data) {
    switch (kind) {
      case 'raid':
        toast('⚠ 습격! 괴물들이 던전에서 쏟아져 나왔다!', 'bad');
        if (S().mode === 'settle') ui.paused = true;
        break;
      case 'recruit': if (S().mode === 'settle') toast('지원자가 찾아왔다.'); showRecruitIfAny(); break;
      case 'expedition_end':
        ui.target = null;
        openModal(() => summaryModal(data), { onClose: () => { checkGameOver(); showRecruitIfAny(); } });
        ui.paused = true;
        G.save();
        break;
      case 'death': setTimeout(checkGameOver, 0); break;
      case 'victory':
        openModal(() => `<h2>♥ 승리!</h2><p>던전의 심장이 무너졌다. 땅의 울음이 멎고, 정착지에 더는 괴물이 몰려오지 않는다.</p>
          <p class="dim">${G.Settle.day()}일째 · 정착민 ${S().colonists.filter(c => c.loc !== 'dead').length}명 생존 · 잃은 이 ${S().colonists.filter(c => c.loc === 'dead').length}명</p>
          <div class="row">${btn('keepPlaying', '계속하기', {}, 'big')}${btn('restart', '새 게임', {})}</div>`, { locked: true });
        break;
      case 'newday': G.save(); break;
      case 'rumble': toast('⚠ 곧 습격이 온다! (던전 압력 85%)', 'bad'); break;
      case 'research': toast('연구 완료!'); break;
    }
  }

  function checkGameOver() {
    if (!S() || S().over) return;
    if (S().colonists.some(c => c.loc !== 'dead')) return;
    S().over = true;
    G.deleteSave();
    openModal(() => `<h2>☠ 개척단이 무너졌다</h2><p>마지막 정착민이 쓰러졌다. 던전의 심장은 여전히 뛰고 있다.</p>
      <p class="dim">${G.Settle.day()}일 버팀 · 최고 깊이 지하 ${S().maxDepth}층</p><div class="row">${btn('restart', '새 게임', {}, 'big')}</div>`, { locked: true });
  }

  function init() {
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', e => { if (e.target.closest('[data-act]')) onPointerDownUI(e); });
    const cv = $('cv');
    cv.addEventListener('pointerdown', onCanvasDown);
    cv.addEventListener('pointermove', onCanvasMove);
    cv.addEventListener('pointerleave', () => { ui.hover = null; ui.mouse = null; });
    window.addEventListener('pointerup', onCanvasUp);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', onWheel, { passive: false });
    G.onEvent = onEvent;
    G.onPrompt = (text, yes) => prompt(text, yes);
    openModal(titleModal, { locked: true });
  }

  return { ui, init, refresh, modalOpen, toast, afterLoad };
})();
