'use strict';
// 캐릭터 상태창 (DESIGN.md 106): 세 칸. 왼쪽 위 페이퍼돌과 장비 · 왼쪽 아래 스탯 · 가운데 숙련 전부 · 오른쪽 스킬. 설명은 줄에 마우스를 올리면 뜬다.
// 숫자는 색으로 먼저 읽힌다. 설명문은 없고 자세한 뜻은 마우스를 올리면 나온다.
const SH = { el: null, m: null, open: false, pin: null, tip: null, own: null, tab: 'tr', drag: null, fold: {} };
const shEl = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const abCol = v => (v >= 18 ? 'v5' : v >= 15 ? 'v4' : v >= 12 ? 'v3' : v >= 9 ? 'v2' : 'v1'); // 1~20: 낮음 → 높음
const bonusCol = v => (v >= 9 ? 'v5' : v >= 6 ? 'v4' : v >= 3 ? 'v3' : v >= 0 ? 'v2' : 'v1');
const sg0 = n => (n >= 0 ? '+' : '−') + Math.abs(n);
function shPortrait(m) {
  const cv = shEl('canvas', 'face'); cv.width = 32; cv.height = 32; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  const parts = G.DCSS.cls[m.cls] || G.DCSS.cls.dragoon;
  (async () => { for (const n of parts) await new Promise(r => { const im = new Image(); im.onload = () => { x.drawImage(im, 0, 0); r(); }; im.onerror = r; im.src = 'dcss/' + n + '.png'; }); })();
  return cv;
}
// 장비 그림: 물건의 기호 → 아이템 타일, 기본 장비는 직업 무기 · 갑옷
const IC_TILE = { '🧥': 'ii_cloak_0', '💍': 'ii_ring_0', '📿': 'ii_amulet_0', '🧿': 'ii_amulet_1', '🧤': 'ii_glove', '👢': 'ii_boots_0', '🛡️': 'ii_shield_1', '🦺': 'ii_armor_1', '🥻': 'ii_robe', '🗡️': 'ii_dagger', '⚔️': 'ii_sword', '🪓': 'ii_axe', '🔨': 'ii_hammer', '👑': 'ii_hat', '🪄': 'ii_qstaff', '🔮': 'ii_orb', '🎗️': 'ii_brooch', '🪨': 'ii_orb', '📌': 'ii_brooch', '🩹': 'ii_belt', '✨': 'ii_amulet_2', '🍀': 'ii_ring_1' };
function itemIcon(m, sl, it) {
  const ic = it && G.Trinket.def(it).ic; if (ic && IC_TILE[ic]) return `../../assets/tiles/${IC_TILE[ic]}.png`;
  if (ic === '🏹') return 'dcss/p_hand1_bow.png';
  if (sl === 't') return `../../assets/tiles/${it ? 'ii_ring_1' : 'ii_ring_0'}.png`;
  const q = sl === 'w' ? G.SRD.weaponOf(m) : G.SRD.armorOf(m), en0 = q.en.toLowerCase(); if (sl === 'w' && /bow|sling|crossbow|blowgun|musket|pistol/.test(en0)) return 'dcss/p_hand1_bow.png'; const t = sl === 'w' ? (/axe/.test(en0) ? 'ii_axe' : /mace|hammer|flail|maul|club|morning/.test(en0) ? 'ii_hammer' : /staff|sickle|spear|pike|glaive|halberd|lance|trident|whip/.test(en0) ? 'ii_qstaff' : /dagger|rapier|shortsword|dart|pick/.test(en0) ? 'ii_dagger' : /unarmed/.test(en0) ? 'ii_glove' : 'ii_sword') : (/none|unarmored/.test(en0) || q.cat === 'none' ? 'ii_robe' : /padded|leather|hide/.test(en0) ? 'ii_armor_0' : /plate|splint/.test(en0) ? 'ii_armor_2' : 'ii_armor_1');
  return `../../assets/tiles/${t}.png`;
}
const shIcon = k => { const i = shEl('i', 'sk k-' + (KIND_C[G.Skill.kindOf(k)] || 'act')), im = document.createElement('img'); im.alt = ''; im.src = `dcss/${skIcon(k)}.png`; i.append(im); return i; };
// 기술 한 줄: 아이콘 · 이름 · 주사위 · 남은 횟수. 설명은 호버
function shTipHide() { SH.tip?.classList.add('hidden'); }
// 호버 창 하나를 돌려 쓴다: 기술 · 장비 · 짧은 글(data-tip). 기준 칸의 화면 안쪽 옆에 뜬다. 장비를 누르면 고정되어 버튼을 누를 수 있다
function shTipPut(anchor, node, cls) { if (!SH.tip) { SH.tip = shEl('div', 'hidden'); SH.tip.id = 'shtip'; document.body.append(SH.tip); } SH.tip.textContent = ''; SH.tip.className = cls || ''; SH.tip.append(node); const a = anchor.getBoundingClientRect(), b = SH.tip.getBoundingClientRect(), x = a.left + a.width / 2 < innerWidth / 2 ? a.right + 8 : a.left - b.width - 8; SH.tip.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, x)) + 'px'; SH.tip.style.top = Math.max(8, Math.min(innerHeight - b.height - 8, a.top + a.height / 2 - b.height / 2)) + 'px'; }
function shTipShow(row, m, k) { if (!SH.pin) shTipPut(row, shSkillDetail(m, k)); }
function shSkillRow(m, k, on, act) {
  const D = G.D.MSKILLS[k], rs = G.Skill.resOf(k), n0 = rs ? G.Res.usesOf(m, rs, k) : null, left = rs ? G.Res.left(m, rs, k) : null, lv = G.Guild.skLv(m.cls, k), locked = lv > m.lv, r = shEl('button', 'skr' + (on === false || locked ? ' off' : '') + (act ? ' act' : ''));
  const nm0 = G.SkillNum_at(k, m.cls, m.lv); r.append(shIcon(k), shEl('span', 'n', D.n), shEl('small', 'kd', locked ? `Lv ${lv}` : nm0?.d || ''));
  r.onpointerenter = () => shTipShow(r, m, k); r.onpointerleave = () => { if (!SH.pin) shTipHide(); }; r.onfocus = () => shTipShow(r, m, k); r.onblur = () => { if (!SH.pin) shTipHide(); }; if (act) r.onclick = () => { act(); drawSheet(); }; return r;
}
// 끌어 놓기: 칸 사이 순서 바꾸기 · 전체 목록에서 칸으로 · 칸에서 목록으로 빼기 (마을에서만)
function shDrag(r, m, k, from) { r.draggable = true; r.ondragstart = e => { shTipHide(); SH.drag = { k, from }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', k); r.classList.add('drag'); }; r.ondragend = () => { SH.drag = null; r.classList.remove('drag'); }; }
function shDrop(el, fn) { el.ondragover = e => { if (SH.drag) { e.preventDefault(); el.classList.add('over'); } }; el.ondragleave = () => el.classList.remove('over'); el.ondrop = e => { e.preventDefault(); el.classList.remove('over'); if (SH.drag) { fn(SH.drag); SH.drag = null; drawSheet(); } }; }
function shSkillDetail(m, k) {
  const w = shEl('div', 'skd'); if (!k || !G.D.MSKILLS[k]) { w.append(shEl('span', 'nil', '—')); return w; }
  const D = G.D.MSKILLS[k], S0 = G.Skill.SK[k], rs = G.Skill.resOf(k), DN = G.Dnd, head = shEl('div', 'dh'); head.append(shIcon(k)); const nm = shEl('div', ''); nm.append(shEl('b', '', D.n), shEl('small', '', D.en || '')); head.append(nm); w.append(head);
  const num = G.SkillNum_at(k, m.cls, m.lv), sp = Object.values(G.SRD_SP).find(q => q.en === D.en), ty = num?.t || G.Skill.spellType(k), kind = G.Skill.kindOf(k), dc = 8 + DN.prof(m.lv) + DN.mod(DN.ab(m)[DN.cls(m).pri]) + G.Trinket.sum(m, 'dc'), COND = DN.COND || {};
  const facts = [num?.d ? [S0?.heal ? '회복' : '피해', `${num.d}${!S0?.heal && DT[ty] ? ' ' + DT[ty] : ''}`] : null, num?.sv ? ['내성', `${DN.AB_N[num.sv]} DC ${dc}`] : null, num?.c?.length ? ['상태', num.c.map(q => COND[q]?.n || q).join(' · ')] : null, sp?.area ? ['범위', `반경 ${sp.area}칸`] : null, G.D.SK_RANGE[k] != null ? ['사거리', G.D.SK_RANGE[k] ? `${G.D.SK_RANGE[k]}칸` : '자신'] : null, kind === '늘 적용' || kind === '탐험' ? null : ['소모', kind], rs?.slot ? ['사용', `${rs.slot}레벨 슬롯`] : rs ? [rs.focus ? (m.cls === 'monk' ? '집중' : '마력') : rs.short ? '짧은 휴식' : '긴 휴식', rs.focus ? `${rs.focus}점` : f.town ? `${G.Res.usesOf(m, rs, k)}번` : `${G.Res.left(m, rs, k)}/${G.Res.usesOf(m, rs, k)}`] : null, S0?.conc ? ['집중', ''] : null, null].filter(Boolean), g = shEl('div', 'facts');
  for (const [a, b] of facts) { const q = shEl('span', ''); q.append(shEl('small', '', a), shEl('b', '', b)); g.append(q); } w.append(g, shEl('p', 'ds', D.d || ''));
  const lv = G.Guild.skLv(m.cls, k); if (lv > m.lv) w.append(shEl('em', '', `Lv ${lv}부터`));
  return w;
}
// 장비 설명: 실제 규칙의 수치. 무기 칸 = 주사위 · 강화 배율 · 마법 명중 · 방패, 갑옷 칸 = AC 계산, 장신구 = 속성. 마을에서 고정하면 강화 · 벗기 · 창고
const SLOT_N = { w: '무기', a: '갑옷', t: '장신구' };
function shGearTip(m, sl, a, pinned) {
  const GD = G.Guild, TK = G.Trinket, DN = G.Dnd, c = DN.cls(m), town = !!f.town, it = TK.of(m).find(t => TK.slot(t) === sl), D0 = it && TK.def(it), SR = G.SRD, eq0 = SR.eq(m), wq = SR.weaponOf(m), aq = SR.armorOf(m), base = sl === 'w' ? [wq.n, wq.en] : [aq.n, aq.en], n = sl === 't' ? 0 : GD.gear(m)[sl], mg = GD.magic(n), name = sl === 't' ? (it ? TK.name(it) : SLOT_N.t) : GD.gearName(m, sl), w = shEl('div', 'skd'), head = shEl('div', 'dh'), im = document.createElement('img'), nm = shEl('div', ''); im.alt = ''; im.className = 'gi'; im.src = itemIcon(m, sl, D0?.shield ? null : it); nm.append(shEl('b', it ? 'art' : '', name), shEl('small', '', D0?.en || (sl === 't' ? '' : base[1]))); head.append(im, nm); w.append(head);
  const facts = [], k = n ? Math.pow(GD.gearK, n).toFixed(2) : 0;
  if (sl === 'w') { const q = DN.gearWeapon(m), cp = DN.cantrip(m), mk = SR.masteryOf(m) || wq.m; facts.push(['피해', `${q.n ? `${q.n}d${q.d}` : ''}${q.b ? (q.n ? ' ' : '') + sg0(q.b) : ''} ${DT[q.t] || ''}`.trim()]); if (cp) facts.push([cp.name, `${cp.n}d${cp.d} ${DT[cp.t] || ''}`.trim()]); facts.push(['분류', `${SR.CAT_N[wq.cat] || '—'} ${wq.rng === 'ranged' ? '원거리' : '근접'}`]); if (wq.props.length) facts.push(['속성', wq.props.map(q0 => SR.PROP_N[q0]).join(' · ')]); if (wq.ft) facts.push(['사거리', `${wq.ft}피트`]); if (SR.masteryOf(m)) facts.push(['숙련', `${SR.MASTERY[mk][0]} · ${SR.MASTERY[mk][1]}`]); if (n) facts.push([`강화 +${n}`, `피해 ×${k}`]); if (mg) facts.push(['마법', `명중 +${mg}`]); if (eq0.shield) facts.push(['방패', 'AC +2']); }
  if (sl === 'a') { const un = aq.cat === 'none' && (m.cls === 'barbarian' || m.cls === 'monk'); facts.push(['AC', DN.ac(a || { merc: m })], ['계산', un ? (m.cls === 'barbarian' ? '10 + 민첩 + 건강' : '10 + 민첩 + 지혜') : `${aq.base}${aq.dexMax ? ` + 민첩${aq.dexMax < 9 ? ` (최대 ${aq.dexMax})` : ''}` : ''}`], ['분류', SR.CAT_N[aq.cat]]); if (aq.str) facts.push(['근력', aq.str]); if (aq.stealth) facts.push(['은신', '불리']); if (mg) facts.push(['마법', `AC +${mg}`]); if (n) facts.push([`강화 +${n}`, `체력 ×${k}`]); }
  if (facts.length) { const g = shEl('div', 'facts'); for (const [x, y] of facts) { const q = shEl('span', ''); q.append(shEl('small', '', x), shEl('b', '', y)); g.append(q); } w.append(g); }
  if (it) { for (const tg of TK.tags(it)) w.append(shEl('div', 'tgl', tg)); if (D0.fit) w.append(shEl('small', 'fit', D0.fit.map(q => G.D.F.allies[q].n).join(' · '))); } else if (sl === 't') w.append(shEl('span', 'nil', '—'));
  if (!pinned) return w;
  const act = shEl('div', 'acts'); if (it && town) { const off = shEl('button', 'mini', '벗기'); off.onclick = () => { TK.equip(f, it.id, null); drawSheet(); }; act.append(off); } if (sl !== 't' && town) { const cost = GD.gearCost(m, sl), u = shEl('button', 'mini', `강화 ${U0(cost)} · ${sl === 'w' ? '피해' : '체력'} ×${GD.gearK}`); u.disabled = f.gold < cost; u.onclick = () => { GD.upgrade(f, m, sl); drawSheet(); }; act.append(u); } if (act.children.length) w.append(act);
  const st = TK.store(f).filter(t => TK.slot(t) === sl && TK.fits(t, m)); if (town && sl !== 't') { const shop = shEl('div', 'stash'), tb = sl === 'w' ? SR.WEAPON : SR.ARMOR, cur = sl === 'w' ? eq0.w : eq0.a; for (const q0 of Object.keys(tb)) { if (q0 === cur || (sl === 'w' ? !SR.canW(m, q0) : !SR.canA(m, q0) || q0 === 'none')) continue; const I = tb[q0], q1 = shEl('button', 'strow'), i1 = document.createElement('img'), tx = shEl('span', ''); i1.alt = ''; const ol = sl === 'w' ? eq0.w : eq0.a; if (sl === 'w') eq0.w = q0; else eq0.a = q0; i1.src = itemIcon(m, sl, null); if (sl === 'w') eq0.w = ol; else eq0.a = ol; tx.append(shEl('b', '', `${I.n} · ${U0(I.gp)} GP`), shEl('small', '', sl === 'w' ? `${I.dn ? `${I.dn}d${I.dd}` : I.flat} ${DT[I.t]}${I.m ? ` · ${SR.MASTERY[I.m][0]}` : ''}` : `AC ${I.base}${I.dexMax ? ' + 민첩' : ''} · ${SR.CAT_N[I.cat]}`)); q1.append(i1, tx); q1.disabled = f.gold < I.gp; q1.onclick = () => { f.gold -= I.gp; if (sl === 'w') eq0.w = q0; else eq0.a = q0; drawSheet(); }; shop.append(q1); } if (sl === 'w' && SR.canShield(m.cls) && !eq0.shield) { const q1 = shEl('button', 'strow', `방패 · ${SR.SHIELD.gp} GP · AC +2`); q1.disabled = f.gold < SR.SHIELD.gp; q1.onclick = () => { f.gold -= SR.SHIELD.gp; eq0.shield = true; drawSheet(); }; shop.append(q1); } w.append(shop); }
  if (st.length) { const g = shEl('div', 'stash'); for (const t of st) { const q = shEl('button', 'strow'), i0 = document.createElement('img'), tx = shEl('span', ''); i0.alt = ''; i0.src = itemIcon(m, sl, t); tx.append(shEl('b', '', TK.name(t)), shEl('small', '', TK.tags(t).join(' · '))); q.append(i0, tx); q.disabled = !town; if (town) q.onclick = () => { TK.equip(f, t.id, m.uid); drawSheet(); }; g.append(q); } w.append(g); }
  return w;
}
const DT = { fire: '화염', cold: '냉기', lightning: '번개', thunder: '천둥', acid: '산성', poison: '독', radiant: '광휘', necrotic: '사령', psychic: '정신', force: '역장', piercing: '관통', slashing: '베기', bludgeoning: '타격' };
function drawSheet() {
  const m = SH.m, el = SH.el; if (!m) return; el.textContent = ''; SH.own = null; shTipHide();
  const DN = G.Dnd, GD = G.Guild, T = G.Tactics, TK = G.Trinket, r0 = rt(), a = r0.party?.find(p => p.merc === m) || (m === GD.leader(f) ? r0.hero : null), def = GD.def(m), c = DN.cls(m), ab = DN.ab(m), pr = DN.prof(m.lv), SP = G.Res.SPECIES[G.Res.species(m)], marks = G.Story.marks(m), deeds = m.deeds || {}, town = !!f.town;
  const scrl = shEl('div', 'scrl'), box = shEl('div', 'sh'); scrl.append(box, shEl('i', 'rod t'), shEl('i', 'rod b')); el.append(scrl);
  const hpMax = a?.max || DN.srdHP(m), hp = a ? Math.max(0, a.hp) : hpMax, w = a ? DN.weapon(a) : null;
  // 머리글
  const head = shEl('header', 'sh-h'); head.style.setProperty('--c', def.col);
  const tt = shEl('div', 'tt'), nm = shEl('h2', '', m.name || '단장'); nm.append(shEl('b', 'lv', `Lv ${m.lv}`)); const sp0 = G.Res.species(m), ln0 = G.SRD.line(m, sp0); tt.append(nm, shEl('small', '', `${ln0 && /엘프|노움/.test(ln0.n) ? ln0.n : (ln0 ? ln0.n + ' ' : '') + SP.n} ${def.n} · ${G.SRD.BG[G.SRD.bg(m)].n}${m.lead ? ' · 단장' : ''}`)); head.append(tt);
  const P = G.D.PERSONA, ft = G.Feat.def(m); head.append(shEl('div', 'sp0'));
  const hd = (n, v, t) => { const q = shEl('div', 'hd'); q.append(shEl('small', '', n), shEl('b', '', v)); if (t) q.dataset.tip = t; return q; };
  head.append(hd('체력', `${Math.round(hp)}/${Math.round(hpMax)}`), hd('AC', a ? DN.ac(a) : '-'), hd('공격', w ? `${w.n}d${w.d}` : `d${c.hd}`), hd('숙련', sg0(pr)));
  const x = shEl('button', 'x', '닫기'); x.onclick = closeSheet; head.append(x); box.append(head);
  const body = shEl('div', 'sh-b'), LF = shEl('div', 'sh-l'); box.append(body); body.append(LF);
  // 왼쪽 위: 페이퍼돌 + 장비. 방패는 무기 칸 하나에 함께
  const E = shEl('section', 'sh-c eqp'), doll = shEl('div', 'doll'), worn = TK.of(m), SLOTS = [['a', 'l1'], ['t', 'l2'], ['w', 'r1']];
  const slotBtn = (sl, pos) => { const it = worn.find(t => TK.slot(t) === sl), name = sl === 't' ? (it ? TK.name(it) : '') : GD.gearName(m, sl), up = sl === 't' ? 0 : GD.gear(m)[sl], shld = sl === 'w' && G.SRD.eq(m).shield, sa = shld && it && TK.def(it).shield ? it : null, b = shEl('button', `slot ${pos}${SH.pin === sl ? ' on' : ''}${it ? ' art' : ''}${!it && sl === 't' ? ' empty' : ''}${shld ? ' dual' : ''}`), im = document.createElement('img'); im.alt = name; im.src = itemIcon(m, sl, sa ? null : it); b.append(im); if (shld) { const s0 = document.createElement('img'); s0.alt = ''; s0.className = 'sd'; s0.src = sa ? itemIcon(m, sl, sa) : '../../assets/tiles/ii_shield_0.png'; b.append(s0); } if (up) b.append(shEl('b', 'up', `+${up}`)); b.onpointerenter = () => { if (!SH.pin) shTipPut(doll, shGearTip(m, sl, a)); }; b.onpointerleave = () => { if (!SH.pin) shTipHide(); }; b.onclick = () => { SH.pin = SH.pin === sl ? null : sl; drawSheet(); }; return b; };
  for (const [sl, pos] of SLOTS) doll.append(slotBtn(sl, pos));
  const fig = shPortrait(m); fig.className = 'fig'; doll.append(fig); E.append(doll);
  LF.append(E);
  // 왼쪽 아래: 스탯
  const L = shEl('section', 'sh-c sts'), abBox = shEl('div', 'box ab'), ah = shEl('div', 'row hd0'); ah.append(shEl('span', '', '능력치'), shEl('small', '', '점수'), shEl('small', '', '내성')); abBox.append(ah);
  for (const k of DN.AB) { const on = c.saves.includes(k), sv = DN.mod(ab[k]) + (on ? pr : 0), q = shEl('div', 'row' + (c.pri === k ? ' key' : '')); q.dataset.tip = `수정치 ${sg0(DN.mod(ab[k]))}${on ? ` · 내성 숙련 ${sg0(pr)}` : ''}${c.pri === k ? ' · 주능력' : ''}`; q.append(shEl('span', '', DN.AB_N[k]), shEl('b', abCol(ab[k]), ab[k]), shEl('b', 'sv ' + bonusCol(sv) + (on ? ' pro' : ''), sg0(sv))); abBox.append(q); } L.append(abBox);
  const R0 = shEl('div', 'sts-r');
  const hiAb = DN.AB.filter(k => ab[k] >= 16).map(k => ({ n: `${DN.AB_N[k]} ${ab[k]}`, d: `수정치 ${sg0(DN.mod(ab[k]))}` })), loAb = DN.AB.filter(k => ab[k] <= 9).map(k => ({ n: `${DN.AB_N[k]} ${ab[k]}`, d: `수정치 ${sg0(DN.mod(ab[k]))}` })), good = marks.filter(q => !/스트레스|죽음|저주|빚/.test(q.n) && !/×0\.9/.test(q.d)), bad = marks.filter(q => /죽음|저주/.test(q.n)), SC = G.Story.SCARS || {};
  for (const id of m.scars || []) if (SC[id]) bad.push({ n: SC[id].n, d: SC[id].d });
  if (m.habit) { const h0 = marks.find(q => q.d === '스트레스 ×1.15'); if (h0) { good.splice(good.indexOf(h0), 1); bad.push(h0); } }
  const lst = (h, list, cls) => { const b = shEl('div', 'pc-l ' + cls); b.append(shEl('h5', '', h)); if (!list.length) b.append(shEl('span', 'nil', '—')); const g = shEl('div', 'tags'); for (const q of list) { const i = shEl('span', 'tag', q.n); if (q.d) i.dataset.tip = q.d; g.append(i); } b.append(g); return b; };
  if ((m.pers || []).length) { const pb0 = shEl('div', 'pers'); pb0.append(shEl('h5', '', '성격')); for (const k of m.pers) { const q = shEl('div', 'prs'); q.append(shEl('b', '', P[k]?.n || k), shEl('span', '', P[k]?.d || '')); pb0.append(q); } R0.append(pb0); }
  R0.append(lst('장점', [...hiAb, ...G.SRD.SPECIES[sp0].traits.map(q => ({ n: q[0], d: q[1] })), ...(ln0 ? [{ n: ln0.n, d: ln0.d || (ln0.dt ? `${DT[ln0.dt]} 저항` : '') }] : []), ...(ft ? [{ n: ft.n, d: ft.d }] : []), ...good], 'up'), lst('단점', [...loAb, ...bad], 'dn'));
  const fr = shEl('div', 'tags'); for (const o of f.mercs.concat(GD.leader(f))) { if (o === m || o.dead) continue; const rel = G.Bond.rel(f, m, o); if (!rel) continue; fr.append(shEl('span', 'tag ' + rel, `${o.name || '단장'} ${rel === 'friend' ? '전우' : '앙숙'}`)); } if (fr.children.length) { R0.append(shEl('h5', '', '관계'), fr); } L.append(R0); LF.append(L);
  // 가운데: 숙련 전부. SRD 18기술(숙련은 표시) · 내성 · 장비 숙련
  const M = shEl('section', 'sh-c prf'), TR = DN.TRAIN[m.cls] || []; M.append(shEl('h5', '', '기술'));
  for (const k of Object.keys(DN.SKILL_AB)) { const v = DN.skill(m, k), on = DN.profs(m).includes(k), q = shEl('div', 'pfr' + (on ? ' on' : '')); q.dataset.tip = G.SRD.SKILL_D[k]; q.append(shEl('i', 'dot'), shEl('span', '', DN.SKILL_N[k]), shEl('small', '', DN.AB_N[DN.SKILL_AB[k]]), shEl('b', bonusCol(v), sg0(v))); M.append(q); }
  M.append(shEl('h5', '', '장비'));
  const SR0 = G.SRD, wN = Object.keys(SR0.WEAPON).filter(q => SR0.canW(m, q)).map(q => SR0.WEAPON[q].n).join(', '), aN = Object.keys(SR0.ARMOR).filter(q => q !== 'none' && SR0.canA(m, q)).map(q => SR0.ARMOR[q].n).join(', ') + (SR0.canShield(m.cls) ? ', 방패' : '');
  for (const [h, v, tip] of [['무기', TR[0], `명중에 숙련 보너스: ${wN}`], ['갑옷', TR[1], aN ? `입어도 판정 불리 · 주문 제한 없음: ${aN}` : '갑옷 훈련 없음'], ['도구', [TR[2], SR0.BG[SR0.bg(m)].tool].filter(Boolean).join(' · '), '그 도구를 쓰는 판정에 숙련 보너스']]) { if (!v) continue; const q = shEl('div', 'pft'); q.append(shEl('small', '', h), shEl('span', '', v)); q.dataset.tip = tip; M.append(q); }
  body.append(M);
  // 왼쪽 맨 아래: 지금 상태 한 줄
  const foot = shEl('footer', 'sh-f'), s0 = Math.round(m.stress || 0), cell = (h, v, cls) => { const q = shEl('div', 'cd'); q.append(shEl('small', '', h), v.nodeType ? v : shEl('b', cls || '', v)); return q; };
  foot.append(cell('스트레스', s0, s0 >= 70 ? 'v1' : s0 >= 40 ? 'v2' : 'v4'));
  const bars = shEl('div', 'bars'), fm = m.form || []; for (let i = 0; i < 5; i++) { const v = fm[i], q = shEl('i', v == null ? 'none' : v >= 0.35 ? 'hi' : v >= 0.15 ? 'mid' : 'lo'); q.style.height = (v == null ? 4 : 4 + Math.min(1, v * 1.6) * 18) + 'px'; if (v != null) q.dataset.tip = `피해 비중 ${Math.round(v * 100)}%`; bars.append(q); } foot.append(cell('최근 전투', bars));
  for (const [n, v] of [['전투', m.fights], ['처치', m.kills], ['쓰러짐', m.downs], ['구함', deeds.saves], ['위기', deeds.crises]]) foot.append(cell(n, v ?? 0));
  // 오른쪽: 기술
  const K = shEl('section', 'sh-c sk-p'), traits = GD.traits(m), L0 = GD.limits(m.cls, m.lv), spells = GD.spellList(m.cls), sel = new Set(m.skills || []), nC = (m.skills || []).filter(q => GD.spLv(q) === 0).length, nP = (m.skills || []).filter(q => GD.spLv(q) > 0).length, levels = [...new Set(spells.map(q => GD.spLv(q)).filter(q => q > 0))].sort((p, q) => p - q);
  GD.fillSlots(m); const nAt = L => (m.skills || []).filter(q => GD.spLv(q) === L).length, tabsDef = [...(spells.some(q => GD.spLv(q) === 0) ? [['c', `소마법 ${nAt(0)}`]] : []), ...levels.map(q => ['L' + q, `${q}레벨 ${nAt(q)}`]), ['f', '기능'], ['t', '특성']]; if (!tabsDef.some(q => q[0] === SH.tab)) SH.tab = tabsDef[0][0];
  const h0 = shEl('div', 'skh'); h0.append(shEl('h5', '', spells.length ? `소마법 ${nC}/${L0.cantrip} · 준비 ${nP}/${L0.prepared}` : '기능')); if (town && spells.length) { const rec = shEl('button', 'mini', '추천'); rec.onclick = () => { GD.useRecommend(m); drawSheet(); }; h0.append(rec); } K.append(h0);
  const T0 = G.Res.table(m); if (T0.length) { const rs0 = G.Res.of(m), row = shEl('div', 'slbar'); row.append(shEl('small', '', '시전 횟수')); T0.forEach((n, i) => { if (n) { const q = shEl('span', ''); q.append(shEl('small', '', `${i + 1}레벨`), shEl('b', '', town ? `${n}` : `${n - (rs0.sl[i] || 0)}/${n}`)); row.append(q); } }); K.append(row); } if (G.Res.pool(m)) { const row = shEl('div', 'slbar'), q = shEl('span', ''); q.append(shEl('small', '', m.cls === 'monk' ? '집중' : '마력'), shEl('b', '', town ? `${G.Res.pool(m)}` : `${G.Res.pool(m) - G.Res.of(m).fp}/${G.Res.pool(m)}`)); row.append(q); K.append(row); }
  const tabs = shEl('div', 'sk-tabs'); for (const [t, n] of tabsDef) { const q = shEl('button', 'tb' + (SH.tab === t ? ' on' : ''), n); q.onclick = () => { SH.tab = t; drawSheet(); }; tabs.append(q); } K.append(tabs);
  const scroll = shEl('div', 'sk-l'), sec = (h, list, fn) => { if (!list.length) return; if (h) scroll.append(shEl('h5', '', h)); for (const q of list) scroll.append(fn(q)); };
  if (SH.tab === 'c' || SH.tab[0] === 'L') { const lv0 = SH.tab === 'c' ? 0 : +SH.tab.slice(1), list = spells.filter(q => GD.spLv(q) === lv0).sort((p, q) => (sel.has(q) - sel.has(p)) || G.D.MSKILLS[p].n.localeCompare(G.D.MSKILLS[q].n)); const row0 = q => { const on = sel.has(q), r = shSkillRow(m, q, on ? undefined : true, town ? () => GD.toggle(m, q) : null); if (on) r.classList.add('in'); return r; }, noC = q => !!G.D.MSKILLS[q]?.noAuto, fold = (id, name, l, def) => { if (!l.length) return; const key = `${SH.tab}:${id}`, open = SH.fold[key] ?? def, h = shEl('button', 'fold' + (open ? ' on' : ''), `${open ? '▾' : '▸'} ${name} ${l.filter(q => sel.has(q)).length}/${l.length}`); h.onclick = () => { SH.fold[key] = !open; drawSheet(); }; scroll.append(h); if (open) for (const q of l) scroll.append(row0(q)); }; fold('c', '전투', list.filter(q => !noC(q)), true); fold('n', '비전투', list.filter(noC), false); }
  else if (SH.tab === 'f') { const acts = GD.pickable(m.cls).filter(q => GD.spLv(q) == null && G.D.MSKILLS[q]).sort((p, q) => GD.skLv(m.cls, p) - GD.skLv(m.cls, q)); sec('', acts, q => shSkillRow(m, q)); sec('종족 · 직업', G.SrdX.skills(m).filter(q => GD.spLv(q) == null), q => shSkillRow(m, q)); }
  else { sec('', traits, q => shSkillRow(m, q)); }
  K.append(scroll); body.append(K); box.append(foot);
  scrl.style.setProperty('--h', box.offsetHeight + 'px');
  if (SH.pin) shTipPut(doll, shGearTip(m, SH.pin, a, true), 'pin');
}
const U0 = n => G.U.fmt(n);
function openSheet(m) { if (!SH.el) { SH.el = shEl('div', ''); SH.el.id = 'sheet'; document.body.append(SH.el); addEventListener('keydown', e => { if (e.key === 'Escape' && SH.open) closeSheet(); }); SH.el.addEventListener('pointerover', e => { if (SH.pin) return; const t = e.target.closest?.('[data-tip]'); if (t && t.dataset.tip && t !== SH.own) { SH.own = t; shTipPut(t, shEl('div', 'skd', t.dataset.tip), 'sm'); } }); SH.el.addEventListener('pointerout', e => { if (SH.own && !SH.own.contains(e.relatedTarget)) { SH.own = null; if (!SH.pin) shTipHide(); } }); SH.el.addEventListener('pointerdown', e => { if (SH.pin && !e.target.closest('.slot')) { SH.pin = null; drawSheet(); } }); } if (SH.m !== m) SH.pin = null; const again = SH.open; SH.m = m; SH.open = true; clearTimeout(SH.t); SH.el.classList.remove('hidden', 'rollup'); if (!again) { SH.el.classList.add('unroll'); SH.t = setTimeout(() => SH.el.classList.remove('unroll'), 660); } drawSheet(); } // 펼치는 중 다시 그리면 처음부터 펼쳐지니 끝나면 표시를 뗀다
function closeSheet() { SH.pin = null; shTipHide(); SH.open = false; clearTimeout(SH.t); SH.el.classList.remove('unroll'); SH.el.classList.add('rollup'); SH.t = setTimeout(() => SH.el.classList.add('hidden'), 230); }
