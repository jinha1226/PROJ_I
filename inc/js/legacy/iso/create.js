'use strict';
// 단장 만들기 화면 (DESIGN.md 139). 규칙과 표는 js/create.js. 새 게임에서만 열리고, 다 만들면 튜토리얼로 들어간다
function openCreate() {
  const C = G.Create, SR = G.SRD, DN = G.Dnd, GD = G.Guild, el = document.createElement('div'); el.id = 'create'; document.body.append(el);
  const mk = (tag, cls, s) => { const e = document.createElement(tag); if (cls) e.className = cls; if (s != null) e.textContent = s; return e; };
  const S = { mode: 'quick', step: 'cls', method: 'std', o: C.quick('dragoon'), name: '', swap: null, three: false };
  const STEPS = [['cls', '직업'], ['bg', '배경'], ['sp', '종족'], ['ab', '능력치'], ['sk', '기술'], ['spell', '주문']];
  const hasSpell = cls => { const L = GD.limits(cls, 1); return L.cantrip + L.prepared > 0; };
  const steps = () => STEPS.filter(q => q[0] !== 'spell' || hasSpell(S.o.cls));
  const pv = () => GD.preview(f, S.o), sign = v => (v < 0 ? `−${-v}` : `+${v}`), nameOf = k => G.D.F.allies[k].n, abN = k => DN.AB_N[k];
  const row = C2 => ['전열', '중열', '후열'][G.Tactics.HOME_ROW[G.Tactics.roleOf({ cls: C2 })]];
  // 직접 모드에 처음 들어갈 때: 기술과 주문을 지금 값에서 채워 둔다
  function fillDirect() {
    const o = S.o, c = SR.CLS[o.cls], have = SR.BG[o.bg].sk, ab = DN.ab(pv());
    if (!o.skillPick || !C.okSkills(o.cls, o.bg, o.skillPick)) o.skillPick = c.from.filter(k => !have.includes(k)).sort((p, q) => DN.mod(ab[DN.SKILL_AB[q]]) - DN.mod(ab[DN.SKILL_AB[p]])).slice(0, c.sk);
    if (!o.skills) o.skills = C.fillSpells(o.cls, GD.recommend(pv()));
  }
  function setCls(k) { const name = S.o.name; S.o = C.quick(k, name); S.method = 'std'; S.swap = null; S.three = false; if (S.mode === 'direct') fillDirect(); }
  function setBg(k) { S.o.bg = k; S.o.bgAdj = C.adjOf(S.o.cls, k); S.three = false; S.o.skillPick = null; fillDirect(); }
  function setSp(k) { S.o.sp = k; const L = SR.SPECIES[k].line; S.o.line = L ? (C.CLS[S.o.cls].sp === k && C.CLS[S.o.cls].line) || Object.keys(L)[0] : null; }
  const chip = (s, on, fn, cls = '') => { const b = mk('button', 'cr-chip ' + cls + (on ? ' on' : ''), s); b.onclick = () => { fn(); draw(); }; return b; };
  const star = on => (on ? '★ ' : '');
  // 직업 카드
  function classCards(box) {
    const g = mk('div', 'cr-cards');
    for (const k of C.ORDER) {
      const D = C.CLS[k], B = DN.CLS[k], b = mk('button', 'cr-card' + (S.o.cls === k ? ' on' : ''));
      const head = mk('div', 'h'); head.append(mk('b', '', nameOf(k)), mk('small', '', D.en), mk('i', 'cx cx-' + D.cx, `복잡도 ${C.CX_N[D.cx]}`)); b.append(head);
      b.append(mk('p', '', `좋아하는 것 ${D.likes} · ${row(k)}`), mk('p', '', `주능력 ${D.pri.map(abN).join(D.en === 'Fighter' ? ' 또는 ' : ' · ')} · 체력 주사위 d${B.hd}`), mk('p', 'f', D.feats.join(' · ')));
      b.onclick = () => { setCls(k); draw(); }; g.append(b);
    }
    box.append(g);
  }
  function bgStep(box) {
    const pri = C.CLS[S.o.cls].pri, g = mk('div', 'cr-cards two');
    for (const k of Object.keys(SR.BG)) {
      const B = SR.BG[k], rec = C.CLS[S.o.cls].bg === k, F0 = G.D.FEATS[B.feat], b = mk('button', 'cr-card' + (S.o.bg === k ? ' on' : ''));
      const head = mk('div', 'h'); head.append(mk('b', '', star(rec) + B.n), mk('small', '', B.en)); b.append(head);
      b.append(mk('p', '', `능력치 ${B.ab.map(q => (pri.includes(q) ? `[${abN(q)}]` : abN(q))).join(' · ')}`), mk('p', '', `재주 ${F0.n}: ${F0.d}`), mk('p', 'f', `기술 ${B.sk.map(q => DN.SKILL_N[q]).join(' · ')} · 도구 ${B.tool}`));
      b.onclick = () => { setBg(k); draw(); }; g.append(b);
    }
    box.append(g);
  }
  function spStep(box) {
    const g = mk('div', 'cr-cards');
    for (const k of Object.keys(SR.SPECIES)) {
      const P = SR.SPECIES[k], rec = C.CLS[S.o.cls].sp === k, b = mk('button', 'cr-card' + (S.o.sp === k ? ' on' : ''));
      const head = mk('div', 'h'); head.append(mk('b', '', star(rec) + P.n), mk('small', '', P.en)); b.append(head);
      b.append(mk('p', '', `${k === 'human' || k === 'tiefling' ? '보통 또는 작음' : P.size === 'Small' ? '작음' : '보통'} · 속도 ${P.move * 5}피트${P.dark ? ` · 암시야 ${P.dark * 5}피트` : ''}`));
      for (const t of P.traits) b.append(mk('p', 'f', `${t[0]}: ${t[1]}`));
      b.onclick = () => { setSp(k); draw(); }; g.append(b);
    }
    box.append(g);
    const L = SR.SPECIES[S.o.sp].line;
    if (L) { const r = mk('div', 'cr-row'); r.append(mk('small', '', '계통')); for (const q of Object.keys(L)) r.append(chip(L[q].n, S.o.line === q, () => { S.o.line = q; })); box.append(r); const d = L[S.o.line]?.d; if (d) box.append(mk('p', 'cr-note', d)); }
  }
  function abStep(box) {
    const o = S.o, r0 = mk('div', 'cr-row'), left = C.POOL - C.spent(o.ab);
    r0.append(chip('표준 배열', S.method === 'std', () => { S.method = 'std'; o.ab = C.arrOf(o.cls); S.swap = null; }), chip('포인트 27', S.method === 'pt', () => { S.method = 'pt'; o.ab = C.arrOf(o.cls); S.swap = null; }), chip('4d6 굴림', S.method === 'roll', () => { const v = C.AB.map(() => DN.roll4()).sort((a, b) => b - a), by = C.AB.slice().sort((p, q) => C.arrOf(o.cls)[q] - C.arrOf(o.cls)[p]); S.method = 'roll'; by.forEach((k, i) => { o.ab[k] = v[i]; }); S.swap = null; }));
    if (S.method === 'pt') r0.append(mk('b', 'cr-left' + (left < 0 ? ' bad' : ''), `남은 ${left}`)); box.append(r0);
    const adj = o.bgAdj, t = mk('div', 'cr-abs'), final = DN.ab(pv());
    for (const k of C.AB) {
      const c = mk('div', 'cr-ab' + (C.CLS[o.cls].pri.includes(k) ? ' pri' : '') + (S.swap === k ? ' sel' : ''));
      c.append(mk('b', '', abN(k)), mk('small', '', C.AB_D[k]));
      const v = mk('div', 'v'); v.append(mk('span', 'base', o.ab[k]), mk('span', 'adj', adj[k] ? sign(adj[k]) : ''), mk('b', '', final[k]), mk('i', '', sign(DN.mod(final[k]))));
      c.append(v);
      if (S.method === 'pt') { const p = mk('div', 'pt'); p.append(chip('−', false, () => { if (o.ab[k] > 8) o.ab[k]--; }), chip('+', false, () => { if (o.ab[k] < 15 && C.spent({ ...o.ab, [k]: o.ab[k] + 1 }) <= C.POOL) o.ab[k]++; })); c.append(p); } else c.onclick = () => { if (!S.swap) S.swap = k; else { const q = S.swap; [o.ab[q], o.ab[k]] = [o.ab[k], o.ab[q]]; S.swap = null; } draw(); };
      t.append(c);
    }
    box.append(t);
    const B = SR.BG[o.bg], r1 = mk('div', 'cr-row'); r1.append(mk('small', '', `${B.n} 보너스`), chip('+2 · +1', !S.three, () => { S.three = false; o.bgAdj = C.adjOf(o.cls, o.bg); }), chip('+1 · +1 · +1', S.three, () => { S.three = true; o.bgAdj = Object.fromEntries(B.ab.map(q => [q, 1])); })); box.append(r1);
    if (!S.three) { const r2 = mk('div', 'cr-row'); for (const k of B.ab) { r2.append(mk('small', '', abN(k))); for (const n of [2, 1]) r2.append(chip(`+${n}`, adj[k] === n, () => { const other = Object.keys(adj).find(q => adj[q] === n && q !== k), mine = adj[k]; delete adj[k]; if (other) { delete adj[other]; if (mine) adj[other] = mine; } adj[k] = n; const keys = Object.keys(adj); if (keys.length < 2) adj[B.ab.find(q => q !== k)] = n === 2 ? 1 : 2; })); } box.append(r2); }
  }
  function skStep(box) {
    const o = S.o, c = SR.CLS[o.cls], B = SR.BG[o.bg], r = mk('div', 'cr-row'); r.append(mk('small', '', `직업 ${o.skillPick.length} / ${c.sk}`)); box.append(r);
    const g = mk('div', 'cr-skills');
    for (const k of c.from) { const fromBg = B.sk.includes(k), on = o.skillPick.includes(k), b = mk('button', 'cr-sk' + (on || fromBg ? ' on' : '') + (fromBg ? ' lock' : '')); b.append(mk('b', '', DN.SKILL_N[k]), mk('small', '', `${abN(DN.SKILL_AB[k])}${fromBg ? ` · ${B.n}` : ''}`), mk('small', 'd', SR.SKILL_D[k] || '')); b.disabled = fromBg; b.onclick = () => { if (on) o.skillPick = o.skillPick.filter(q => q !== k); else if (o.skillPick.length < c.sk) o.skillPick = [...o.skillPick, k]; draw(); }; g.append(b); }
    box.append(g);
  }
  function spellStep(box) {
    const o = S.o, L = GD.limits(o.cls, 1), m = pv(), list = C.spellPool(o.cls), sec = (title, keys, cap) => {
      const n = o.skills.filter(k => keys.includes(k)).length, h = mk('div', 'cr-row'); h.append(mk('small', '', `${title} ${n} / ${cap}`)); box.append(h);
      const g = mk('div', 'cr-skills');
      for (const k of keys) { const D = G.D.MSKILLS[k], on = o.skills.includes(k), b = mk('button', 'cr-sk' + (on ? ' on' : '')); b.append(mk('b', '', D.n), mk('small', '', D.en || ''), mk('small', 'd', G.Skill.text(m, k))); b.onclick = () => { if (on) o.skills = o.skills.filter(q => q !== k); else if (n < cap) o.skills = [...o.skills, k]; draw(); }; g.append(b); }
      box.append(g);
    };
    if (L.cantrip) sec('소마법', list.filter(k => GD.spLv(k) === 0), L.cantrip);
    if (L.prepared) sec('준비 주문', list.filter(k => GD.spLv(k) > 0), L.prepared);
  }
  // 오른쪽: 지금 캐릭터
  function summary(box) {
    const o = S.o, m = pv(), B = SR.BG[o.bg], P = SR.SPECIES[o.sp], D = C.CLS[o.cls], ab = DN.ab(m), s = mk('aside', 'cr-sum');
    const h = mk('h3', '', nameOf(o.cls)); h.append(mk('small', '', ` ${P.n}${o.line && P.line?.[o.line] ? ` ${P.line[o.line].n}` : ''} · ${B.n}`)); s.append(h);
    const n3 = mk('div', 'cr-n3'); for (const [a, b] of [['체력', DN.srdHP(m)], ['AC', DN.ac({ merc: m })], ['속도', `${(o.line && P.line?.[o.line]?.move || P.move) * 5}피트`]]) { const q = mk('span', ''); q.append(mk('small', '', a), mk('b', '', b)); n3.append(q); } s.append(n3);
    const a6 = mk('div', 'cr-a6'); for (const k of C.AB) { const q = mk('span', D.pri.includes(k) ? 'pri' : ''); q.append(mk('small', '', abN(k)), mk('b', '', ab[k]), mk('i', '', sign(DN.mod(ab[k])))); a6.append(q); } s.append(a6);
    s.append(mk('p', '', `재주 ${G.D.FEATS[B.feat].n}`), mk('p', '', `내성 ${DN.CLS[o.cls].saves.map(abN).join(' · ')}`));
    const rec = mk('div', 'cr-rec'); rec.append(mk('h5', '', '★ 추천'), mk('p', '', `${SR.BG[D.bg].n}: ${D.pri.filter(q => SR.BG[D.bg].ab.includes(q)).map(abN).join(' · ')}이 든 배경`), mk('p', '', `${SR.SPECIES[D.sp].n}: ${D.spWhy}`)); s.append(rec);
    box.append(s);
  }
  function draw() {
    el.textContent = ''; const wrap = mk('div', 'cr-wrap'); el.append(wrap);
    const top = mk('div', 'cr-top'); top.append(mk('h2', '', '단장 만들기'));
    const tabs = mk('div', 'cr-tabs'); tabs.append(chip('간단', S.mode === 'quick', () => { S.o = C.quick(S.o.cls, S.o.name); S.mode = 'quick'; S.method = 'std'; }), chip('직접', S.mode === 'direct', () => { S.mode = 'direct'; S.step = 'cls'; fillDirect(); })); top.append(tabs, mk('small', 'cr-src', 'SRD 5.2.1')); wrap.append(top);
    const main = mk('div', 'cr-main'), body = mk('div', 'cr-body'); main.append(body); wrap.append(main);
    if (S.mode === 'quick') { body.append(mk('p', 'cr-guide', `${C.GUIDE.cls} ${C.GUIDE.start}`)); classCards(body); }
    else {
      const st = mk('div', 'cr-steps'); steps().forEach(([k, n], i) => st.append(chip(`${i + 1} ${n}`, S.step === k, () => { S.step = k; }))); body.append(st);
      if (!steps().some(q => q[0] === S.step)) S.step = 'cls';
      body.append(mk('p', 'cr-guide', C.GUIDE[S.step]));
      if (S.step === 'cls' && C.FS[S.o.cls]) { const fr = mk('div', 'cr-tabs'); for (const k of C.FS[S.o.cls]) fr.append(chip(G.D.MSKILLS[k].n, (S.o.fs || G.Create.quick(S.o.cls).fs) === k, () => { S.o.fs = k; })); body.append(fr); }
      ({ cls: classCards, bg: bgStep, sp: spStep, ab: abStep, sk: skStep, spell: spellStep })[S.step](body);
    }
    summary(main);
    const bot = mk('div', 'cr-bot'), inp = mk('input', 'cr-name'); inp.maxLength = 8; inp.placeholder = '이름'; inp.value = S.name; inp.oninput = () => { S.name = inp.value; }; inp.onkeydown = e => e.stopPropagation(); bot.append(inp);
    const bad = S.mode === 'direct' && ((S.method === 'pt' && C.spent(S.o.ab) > C.POOL) || !C.okSkills(S.o.cls, S.o.bg, S.o.skillPick || []));
    const go = mk('button', 'go', '시작'); go.disabled = bad; go.onclick = () => { const o = { ...S.o, name: S.name.trim() }; if (S.mode === 'quick') { o.skillPick = null; o.skills = null; } if (!C.make(f, o)) return; el.remove(); G.Tut.start(f, G.Fantasy.rt(f)); G.save(); }; bot.append(go); wrap.append(bot);
  }
  draw();
}
if (f.leaderNew) openCreate();
