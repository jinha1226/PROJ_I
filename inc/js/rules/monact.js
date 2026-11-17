'use strict';
// 몬스터 행동 엔진 (SRD 5.2.1 능력치표 원문 → G.SRD_MON, tools/srd_mons_db.py · DESIGN.md 160).
// 충전(Recharge X–6) · 하루 N번 · 내성 행동(숨결 · 응시 …) · 주문 시전(목록 · 횟수 · 「레벨 N 버전」) · 보너스 행동 · 반응(받아넘기기)
// · 전설 행동(다른 생물의 차례가 끝날 때) · 오라(차례 시작 · 끝) · 죽음의 폭발 · 명중 뒤 효과(상태 · 붙잡기 DC · 밀기 · 당기기 · 내성)
// 메이지 · 히드라 · 트롤처럼 손으로 짠 몬스터는 그 규칙이 먼저다. 원문 이름은 그대로 두고 화면에는 우리말로 (NAME)
G.MonAct = (() => {
  const DN = () => G.Dnd, F = () => G.Fantasy, FO = () => G.Foe, H = () => G.Skill.H;
  const R6 = n => n * G.Res_ROUND, cells = ft => ft / 5;
  const enemies = rt => rt.party.filter(p => !p.dead).concat(G.Sum ? G.Sum.alive(rt) : []);
  const use = e => e._use || (e._use = { rech: {}, day: {}, leg: 0, once: {} });
  const ok = (e, a) => { const u = use(e); if (a.recharge && u.rech[a.name] === false) return false; if (a.perDay && (u.day[a.name] || 0) >= a.perDay) return false; return true; };
  const spend = (e, a) => { const u = use(e); if (a.recharge) u.rech[a.name] = false; if (a.perDay) u.day[a.name] = (u.day[a.name] || 0) + 1; };
  const CV = { petrified: 25, unconscious: 20, paralyzed: 20, stunned: 15, incapacitated: 12, charmed: 10, restrained: 8, blinded: 8, frightened: 6, grappled: 5, poisoned: 5, prone: 4, deafened: 1 }, condV = l => Math.max(0, ...(l || []).map(c => CV[c] ?? 6)) * 0.6; // 상태의 값 (실패할 몫 0.6)
  const avg = l => (l || []).reduce((s, d) => s + d.n * (d.d + 1) / 2 + d.b, 0);
  const W = { Fire: '화염', Cold: '냉기', Lightning: '번개', Acid: '산성', Poison: '독', Breath: '숨결', Necrotic: '사령', Radiant: '광휘', Thunder: '천둥', Gaze: '응시', Spit: '뱉기', Web: '거미줄', Spray: '분사', Cloud: '구름', Frightful: '공포의', Presence: '위엄', Paralyzing: '마비의', Petrifying: '석화의', Slowing: '감속의', Weakening: '약화의', Sleep: '잠의', Repulsion: '밀어내는', Whirlwind: '회오리', Constrict: '조이기', Swallow: '삼키기', Charm: '매혹', Moan: '신음', Wail: '울부짖음', Shriek: '비명', Roar: '포효', Stench: '악취', Engulf: '삼키기', Trample: '짓밟기', Teleport: '순간 이동', Spores: '포자', Tail: '꼬리', Wing: '날개', Attack: '공격', Life: '생명', Drain: '흡수', Disrupt: '교란', Spellcasting: '주문' };
  const NM = {"Disrupt Life":"생명 교란","Sleep":"잠","Frightful Presence":"공포의 위엄","Poison Breath":"독 숨결","Animate Trees":"나무 깨우기","Antennae":"더듬이","Aquatic Charge":"물속 돌진","Arcane Prowl":"비전의 잠행","Baleful Command":"사악한 명령","Banish":"추방","Beguile":"현혹","Bite":"물기","Blazing Light":"타오르는 빛","Blinding Breath":"실명의 숨결","Blinding Gaze":"실명의 응시","Blinding Spittle":"실명의 침","Boulder Toss":"바위 던지기","Bubble Dash":"거품 질주","Cacophony":"불협화음","Captain’s Charm":"선장의 매력","Charge":"돌진","Charging Horn":"뿔 돌진","Chill":"한기","Cloaked Flight":"망토 비행","Cloud of Insects":"벌레 구름","Cold Gale":"찬 돌풍","Commanding Presence":"위엄 있는 명령","Consume Life":"생명 삼키기","Consume Memories":"기억 삼키기","Conjure Infernal Chain":"지옥 사슬 소환","Corrupting Touch":"타락의 손길","Create Specter":"스펙터 만들기","Create Whirlwind":"회오리 만들기","Cunning Action":"교활한 행동","Darkness Aura":"어둠의 오라","Deadly Leap":"죽음의 도약","Death Glare":"죽음의 눈길","Deathless Agility":"죽지 않는 민첩","Deathless Strike":"죽지 않는 일격","Deathly Teleport":"죽음의 순간 이동","Destroy Metal":"금속 파괴","Divine Aid":"신성한 도움","Dominate Mind":"정신 지배","Dragon’s Breath":"용의 숨결","Draining Kiss":"흡수의 입맞춤","Dread Command":"공포의 명령","Dreadful Glare":"끔찍한 눈길","Entangling Rope":"휘감는 밧줄","Enthralling Panache":"매혹의 기백","Ethereal Jaunt":"에테르 걸음","Ethereal Stride":"에테르 활보","Etherealness":"에테르화","Fetid Cloud":"악취 구름","Fiery Rays":"불타는 광선","First Roar":"첫 포효","Fling":"내던지기","Fog Cloud":"안개 구름","Freezing Burst":"얼어붙는 폭발","Frightening Gaze":"겁주는 응시","Frost Breath":"서리 숨결","Giggling Magic":"킥킥대는 마법","Glare":"노려보기","Guiding Light":"인도의 빛","Hasten":"가속","Heart Sight":"마음 꿰뚫기","Hellfire Spellcasting":"지옥불 주문","Holy Burst":"신성한 폭발","Horrific Visage":"끔찍한 얼굴","Horror Nimbus":"공포의 후광","Ice Wall":"얼음 벽","Ignited Illumination":"불붙은 빛","Illusory Appearance":"환영의 모습","Infernal Tail":"지옥의 꼬리","Invisibility":"투명","Lash":"채찍질","Leap":"도약","Lightning Storm":"번개 폭풍","Lightning Strike":"번개 일격","Luring Song":"유혹의 노래","Magic of the Spider Queen":"거미 여왕의 마법","Mind Invasion":"정신 침입","Mind Jolt":"정신 충격","Mind-Rending Roar":"정신을 찢는 포효","Misty Step":"안개 걸음","Mockery":"조롱","Necrotic Strike":"사령 일격","Nightmare":"악몽","Nightmare Haunting":"악몽 출몰","Nimble Escape":"재빠른 도주","Noxious Miasma":"유독한 독기","Onslaught":"맹공","Paralyzing Tentacles":"마비 촉수","Phantasms":"환영","Poisonous Spittle":"독침 뱉기","Possession":"빙의","Pounce":"덮치기","Prowl":"배회","Psychic Drain":"정신 흡수","Pummel":"두들기기","Quick Grapple":"재빠른 붙잡기","Rampage":"광란","Read Thoughts":"생각 읽기","Reel":"끌어당기기","Scare":"겁주기","Scorching Sands":"타오르는 모래","Shadow Stealth":"그림자 은신","Shape-Shift":"모습 바꾸기","Shield Bash":"방패 치기","Shimmering Shield":"어른거리는 방패","Slaying Bow":"처단의 활","Slow":"감속","Sonic Boom":"음속 폭음","Spiritual Weapon":"영체 무기","Steam Breath":"증기 숨결","Sting":"침","Storm Bolt":"폭풍 화살","Stunning Screech":"기절의 비명","Swoop":"급강하","Tail Swipe":"꼬리 휘두르기","Tentacle Slam":"촉수 내리치기","Thunderclap":"천둥소리","Thunderous Bellow":"천둥 같은 고함","Toxic Ink":"독 먹물","Trampling Charge":"짓밟는 돌진","Tree Stride":"나무 걸음","Unicorn’s Blessing":"유니콘의 축복","Unsettling Visage":"불안한 얼굴","Vanish":"사라지기","Vortex":"소용돌이","War Cry":"함성","Web Strand":"거미줄 가닥","Weight of Years":"세월의 무게","Whelm":"휩쓸기","World-Shaking Movement":"세상을 흔드는 움직임"};
  const ko = n => NM[n] || n.split(/\s+/).map(w => W[w.replace(/[’']s$/, '')] || w).join(' '); // 이름 전체 → 낱말
  const say = (rt, e, s, col = '#ffb060') => { if (G.quiet) return; G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.4, s, col, t: 1.3, sz: 0.95, pop: true }); G.Turn.dm?.(rt, `${e.n} · ${s}`); };
  // 상태 하나 붙이기: 붙잡힘 · 속박은 탈출 DC와 함께, 「다음 차례까지」면 1라운드, 아니면 1분 (차례 끝에 다시 내성이면 rep)
  function give(rt, o, c, e, a, dc) {
    if (o.kind === 'mon' && o.stat?.cimm?.includes(c)) return;
    if (c === 'grappled' || (c === 'restrained' && a.grab)) { DN().give(rt, o, c, 1e6, e); o.grabBy = e; o.grabDC = a.grab || dc || 10; return; }
    DN().give(rt, o, c, a.until === 'next' ? R6(1) : R6(10), e);
    if (/repeats the save at the end of each of its turns/.test(a.text || '') && dc) (o.rep = o.rep || []).push({ k: c, ab: a.save || 'con', dc });
  }
  // 상태 여럿: 붙잡기와 함께 걸린 상태는 붙잡기가 풀릴 때 같이 풀린다 (「… until the grapple ends」) · 「First Failure … Second Failure」는 첫 상태만, 다음 차례 끝의 내성에 또 실패하면 둘째로
  function giveAll(rt, o, conds, e, a, dc) {
    if (/First Failure/.test(a.text || '') && conds.length > 1) { const [late, first] = /Second Failure: The target has the (\w+)/.exec(a.text) ? [conds.find(c => new RegExp('Second Failure: The target has the ' + c, 'i').test(a.text)), conds.find(c => !new RegExp('Second Failure: The target has the ' + c, 'i').test(a.text))] : [null, conds[0]];
      if (first) { DN().give(rt, o, first, 1e6, e); (o.rep = o.rep || []).push({ k: first, ab: a.save || 'con', dc, then: late }); } return; }
    for (const c of conds) give(rt, o, c, e, a, dc);
    if (conds.includes('grappled') && o.grabBy === e) { o.grabCo = conds.filter(c => c !== 'grappled'); for (const c of o.grabCo) if (o.cond?.[c]) o.cond[c] = 1e6; }
  }
  // 범위 · 대상: { x, list, n(맞는 적 수), score }
  function plan(rt, e, a, reach = 24) {
    const x = { f: G.S.w.fantasy, rt, c: e, seen: enemies(rt).filter(o => F().sees(rt.map, e, o)), reach };
    if (!x.seen.length) return null;
    if (a.area) {
      const A = { shape: a.area[0], ft: a.area[1], w: a.area[2] || 5, self: ['cone', 'line', 'emanation'].includes(a.area[0]) || /originating from|centered on (?:it|itself)/.test(a.text || '') };
      if (A.shape === 'sphere' && A.self) A.shape = 'emanation';
      const t = A.shape === 'emanation' ? e : H().AREA.aim(x, e, A, 0, reach); if (!t) return null;
      const list = H().AREA.hits(x, e, A, t), foes = list.filter(o => !H().isMon(x, o)).length; if (!foes) return null;
      return { x, list, n: foes, score: foes - 0.5 * (list.length - foes) };
    }
    const r = a.one ? cells(a.one) + 0.6 : 12; const t = x.seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= r).sort((p, q) => p.hp / (p.max || 1) - q.hp / (q.max || 1))[0];
    return t ? { x, list: [t], n: 1, score: 1 } : null;
  }
  // 내성 행동 · 주문 실행: 한 번 굴려 모두에게 (SRD) · 아군 · 회피 · 저항은 AREA.save가
  function doSave(rt, e, a, q, label) {
    say(rt, e, label || ko(a.name));
    const d = a.dmg || [], conds = a.cond || [];
    if (d.length) { FO().dtype = d[0].t === 'chosen' ? (e.stat.res?.[0] || 'fire') : d[0].t; H().AREA.save(q.x, e, q.list, a.save, [d[0].n, d[0].d, d[0].b], a.half !== false && !!a.half, o => giveAll(rt, o, conds, e, a, a.dc), false, d[1] ? [d[1].n, d[1].d, d[1].t] : null, a.dc); FO().dtype = null; }
    else for (const o of q.list) { if (H().isMon(q.x, o) && q.x.c.kind === 'mon') continue; if (!DN().save(o, a.save, a.dc)) giveAll(rt, o, conds, e, a, a.dc); }
    if (a.move) for (const o of q.list) if (!H().isMon(q.x, o)) FO().shove(rt, o, e, Math.round(a.move / 5));
  }
  // ── 몬스터 주문 (Spellcasting 행동): 목록 · 횟수 · 「레벨 N 버전」 → G.SRD_SP 원문 데이터 ──
  const SPID = {}; const spOf = n => { if (!Object.keys(SPID).length) for (const id in G.SRD_SP) SPID[G.SRD_SP[id].en.toLowerCase().replace('’', "'")] = id; return SPID[n.toLowerCase().replace('’', "'")]; };
  function spells(e) {
    const s = e.stat, out = [];
    for (const a of s.acts.concat(s.bonus || [])) { if (a.kind !== 'spells') continue;
      for (const [per, list] of Object.entries(a.spells || {})) for (const raw of list) { const m = /^(.*?)(?:\s*\((?:level (\d) version|[^)]*)\))?$/.exec(raw.trim()); const id = spOf(m[1].trim()); if (!id) continue; const n = per === 'At Will' ? 0 : parseInt(per) || 1; out.push({ id, lv: m[2] ? +m[2] : G.SRD_SP[id].lv, per, n, key: 'sp:' + id, dc: a.dc || s.dc, hit: a.hit ?? (a.dc || s.dc) - 8, bonus: a !== s.acts.find(q => q === a) }); } }
    return out;
  }
  // 주문 하나를 몬스터가 쓰면 무엇이 되나 (원문 칸): 피해 내성 · 명중 · 상태 · 치유
  function spellAct(sp, o) {
    const S = sp.srd || {}, text = S.text || '', up = Math.max(0, o.lv - sp.lv), U = /increases by (\d+)d(\d+) for each spell slot level above/.exec(S.up || ''), d0 = S.dice || sp.dice;
    const dice = d0 ? [d0[0] + (U && +U[2] === d0[1] ? +U[1] * up : 0), d0[1], d0[2] || 0] : null, A = S.area;
    const area = A ? [A.shape === 'square' ? 'cube' : A.shape, A.ft, A.w || 5] : null, one = area ? 0 : (S.rangeFt || 60), cond = S.conds || [], dt = S.dt || 'force';
    if (S.save && dice) return { kind: 'save', name: sp.en, save: S.save, dc: o.dc, dmg: [{ n: dice[0], d: dice[1], b: dice[2], t: dt }], half: !!S.half, cond, area, one, text };
    if (S.atk && dice) return { kind: 'atk', name: sp.en, hit: o.hit, dmg: [{ n: dice[0], d: dice[1], b: dice[2], t: dt }], cond, range: S.rangeFt || 60, rays: /three (?:\w+ )?rays/i.test(text) ? 3 + up : 1 }; /* 불타는 광선: 광선마다 명중 굴림 */
    if (/three glowing darts/i.test(text) && dice) return { kind: 'atk', auto: true, name: sp.en, hit: 99, dmg: [{ n: dice[0], d: dice[1], b: dice[2], t: dt }], cond: [], range: S.rangeFt || 120, rays: 3 + up }; /* 마법 화살: 반드시 맞는다 */
    if (S.save && cond.length) return { kind: 'save', name: sp.en, save: S.save, dc: o.dc, dmg: [], cond, area, one, text, conc: sp.conc };
    if (S.heal && /regains? .*Hit Points/.test(text)) return { kind: 'heal', name: sp.en, heal: [S.heal[0] + (U && +U[2] === S.heal[1] ? +U[1] * up : 0), S.heal[1], 0] };
    return null;
  }
  function spellOpts(rt, e) {
    const out = [], u = use(e);
    for (const o of spells(e)) { if (o.n && (u.day[o.key] || 0) >= o.n) continue; const sp = G.SRD_SP[o.id], a = spellAct(sp, o); if (!a) continue;
      if (a.kind === 'save') { const q = plan(rt, e, a); if (!q) continue; out.push({ v: (avg(a.dmg) * (a.half ? 0.75 : 0.6) + condV(a.cond)) * q.score + (o.lv >= 3 ? 2 : 0), a, q, spell: o }); }
      else if (a.kind === 'atk') { const r = G.SRD_RANGE.cells(cells(a.range)); const t = enemies(rt).filter(p => F().sees(rt.map, e, p) && Math.hypot(p.x - e.x, p.y - e.y) <= r).sort((p, q) => p.hp - q.hp)[0]; if (!t) continue; out.push({ v: avg(a.dmg) * a.rays * 0.6 + condV(a.cond) / 2, a, t, spell: o }); }
      else if (a.kind === 'heal') { const t = rt.mons.filter(m => m.hp > 0 && m.aggro && m.hp < m.max * 0.5 && Math.hypot(m.x - e.x, m.y - e.y) <= 6).sort((p, q) => p.hp / p.max - q.hp / q.max)[0]; if (!t) continue; out.push({ v: 10, a, t, spell: o }); }
    }
    return out;
  }
  const SPN = {}; const spName = (id, d) => { if (!SPN._) { SPN._ = 1; for (const k in G.D.MSKILLS) { const q = G.D.MSKILLS[k]; if (q.en && q.n && !/[A-Za-z]/.test(q.n)) SPN[q.en] = SPN[q.en] || q.n; } } return SPN[G.SRD_SP[id]?.en] || d; }; // 주문 이름 (우리말)
  function castSpell(rt, e, b) {
    const u = use(e), o = b.spell, a = b.a, f = G.S.w.fantasy; if (o.n) u.day[o.key] = (u.day[o.key] || 0) + 1;
    { const one = a.kind === 'atk' ? b.t : !a.area && b.q?.list?.length === 1 ? b.q.list[0] : null; if (one && G.ItemX?.absorb(rt, one, o.lv)) return; } // 흡수의 막대 (SRD): 나만 노리는 주문
    const nm = spName(o.id, a.name);
    if (a.kind === 'save') return doSave(rt, e, a, b.q, nm);
    say(rt, e, nm, '#c9a6ff');
    if (a.kind === 'heal') { const v = DN().dice(a.heal[0], a.heal[1]) + (a.heal[2] || 0) + Math.max(0, (o.dc - 8) - (e.stat.pb || 2)); b.t.hp = Math.min(b.t.max, b.t.hp + v); return; }
    for (let i = 0; i < a.rays; i++) { const t = b.t; if (!t || t.dead || t.hp <= 0) break; const nat = a.auto ? 10 : DN().d20(DN().adv(e, t)), cov = a.auto ? 0 : FO().cover(rt, e, t), hit = a.auto || (nat !== 1 && (nat === 20 || nat + a.hit >= DN().ac(t) + cov)); if (!hit) { DN().miss(rt, t); continue; } const v = a.dmg.reduce((s, d) => s + DN().dice(d.n * (nat === 20 ? 2 : 1), d.d) + d.b, 0); FO().dtype = a.dmg[0].t; FO().blast(f, rt, { atk: 1 }, t, v, null, 0, a.dmg[0].t); FO().dtype = null; for (const c of a.cond) give(rt, t, c, e, a); }
  }
  // 공격 하나 (전설 행동 · 보너스 행동): 능력치표의 그 공격 (명중 굴림 · 명중 뒤 효과는 F.hurtMember → G.Foe.onHit)
  function attackOne(f, rt, e, tg, name) {
    const s = e.stat, q = [...(s.melee || []), ...(s.alt || []), s.far].filter(Boolean).find(a => a.name === name) || (s.melee || [])[0]; if (!q || !tg) return false;
    if (Math.hypot(tg.x - e.x, tg.y - e.y) > (q === s.far ? FO().reach(e) + 6 : FO().reach0(e)) + 0.01) return false;
    const av = FO().avgOf(q); e.useAtk = q; e._critK = (av + q.n * (q.d + 1) / 2 + (q.ex ? q.ex.n * (q.ex.d + 1) / 2 : 0)) / Math.max(1, av); /* turn.js hitBy와 같은 굴림 */
    F().hurtMember(f, rt, tg, (av * DN().monRoll(q, false) + FO().extra(rt, e, tg, q)) * e.atk * G.Turn.pace, e); e.useAtk = null; return true;
  }
  const LATER = []; const setTimeout0 = fn => LATER.push(fn); // 광란처럼 공격이 끝난 뒤에 할 일
  const nearestFoe = (rt, e) => enemies(rt).filter(o => F().sees(rt.map, e, o)).sort((p, q) => Math.hypot(p.x - e.x, p.y - e.y) - Math.hypot(q.x - e.x, q.y - e.y))[0];
  // ── 특수 행동 (원문 kind 'other' · 조건이 붙은 내성 행동): 이름별. true면 그 행동(또는 보너스 행동)을 썼다 ──
  // 원문 「Strength Saving Throw: DC 14 … Failure: 7 (1d6 + 4) Bludgeoning damage, and the target has the Prone condition」
  const failOf = t => { const s = /(\w+) Saving Throw:\s*DC (\d+)/.exec(t), d = /Failure:[^.]*?\d+ \((\d+)d(\d+)(?: ?\+ ?(\d+))?\) (\w+) damage/.exec(t), c = /Failure:[^]*?has the (\w+) condition/.exec(t);
    return { save: s ? s[1].slice(0, 3).toLowerCase() : null, dc: s ? +s[2] : 10, dmg: d ? [{ n: +d[1], d: +d[2], b: +(d[3] || 0), t: d[4].toLowerCase() }] : [], cond: c ? [c[1].toLowerCase()] : [], half: /Success: Half damage/.test(t) }; };
  const dotOf = t => { const d = /takes \d+ \((\d+)d(\d+)\) (\w+) damage at the start of each/.exec(t); return d ? { n: +d[1], d: +d[2], t: d[3].toLowerCase() } : null; };
  const near = (rt, e, r) => enemies(rt).filter(o => !o.swallowBy && Math.hypot(o.x - e.x, o.y - e.y) <= r && F().sees(rt.map, e, o)).sort((p, q) => Math.hypot(p.x - e.x, p.y - e.y) - Math.hypot(q.x - e.x, q.y - e.y));
  const held = (rt, e) => enemies(rt).filter(o => o.grabBy === e && !o.swallowBy);
  const saveOn = (rt, e, list, q, extra) => { const x = { f: G.S.w.fantasy, rt, c: e, seen: [], reach: 0 }; if (q.dmg.length) { FO().dtype = q.dmg[0].t; H().AREA.save(x, e, list, q.save, [q.dmg[0].n, q.dmg[0].d, q.dmg[0].b], q.half, o => { for (const c of q.cond) give(rt, o, c, e, {}, q.dc); extra?.(o); }, false, null, q.dc); FO().dtype = null; } else for (const o of list) if (!DN().save(o, q.save, q.dc)) { for (const c of q.cond) give(rt, o, c, e, {}, q.dc); extra?.(o); } };
  const release = (rt, o, prone) => { const by = o.swallowBy; o.swallowBy = null; o.swDot = null; if (o.cond) { delete o.cond.restrained; delete o.cond.blinded; } if (by) { by._swN = Math.max(0, (by._swN || 1) - 1); FO().shove(rt, o, by, 2); } if (prone) DN().give(rt, o, 'prone', R6(10)); };
  const step = (rt, e, t, budget) => { const p = G.Tactics.plan(rt, e, t, budget, (x, y) => Math.hypot(x - t.x, y - t.y) <= 1.6); if (p.length) { const z = p[p.length - 1]; e.x = z.x; e.y = z.y; } return Math.hypot(t.x - e.x, t.y - e.y) <= 1.6; };
  const SP = {
    // 삼키기 (베히르 · 크라켄): 붙잡은 생물만. 삼켜지면 실명(베히르) · 속박 · 완전 엄폐, 삼킨 쪽의 차례 시작마다 산성. 안에서 한 차례 30 넘게 치면 건강 내성 — 실패하면 토해 낸다
    Swallow(f, rt, e, a) { const max = /up to (\w+) creatures swallowed/.exec(a.text) ? 4 : 1; if ((e._swN || 0) >= max) return false; const t = held(rt, e)[0]; if (!t) return false;
      say(rt, e, '삼키기'); if (DN().save(t, 'dex', a.dc)) return true; const v = (a.dmg || []).reduce((s, d) => s + DN().dice(d.n, d.d) + d.b, 0); if (v) { FO().dtype = a.dmg[0].t; FO().blast(f, rt, { atk: 1 }, t, v, null, 0, a.dmg[0].t); FO().dtype = null; }
      if (t.dead || t.hp <= 0) return true; t.grabBy = null; if (t.cond) delete t.cond.grappled; t.swallowBy = e; t.swDot = dotOf(a.text); t.swCut = { n: +(/takes (\d+) damage or more on a single turn/.exec(a.text)?.[1] || 30), dc: +(/DC (\d+) Constitution saving throw at the end of that turn/.exec(a.text)?.[1] || 15) };
      DN().give(rt, t, 'restrained', 1e6, e); if (/Blinded/.test(a.text)) DN().give(rt, t, 'blinded', 1e6, e); t.x = e.x; t.y = e.y; e._swN = (e._swN || 0) + 1; return true; },
    // 흡수 (젤라틴 큐브): 이동하며 덮친 생물. 실패하면 산성 3d6 · 흡수(속박), 큐브 차례마다 산성 — 근력(운동) DC 12로 빠져나온다
    Engulf(f, rt, e, a) { const t = near(rt, e, FO().move(e) + 1.6).find(o => !o.engulfed); if (!t || !step(rt, e, t, FO().move(e))) return false; const q = failOf(a.text); say(rt, e, '흡수');
      saveOn(rt, e, [t], { ...q, cond: [] }, o => { o.grabBy = e; o.grabDC = q.dc; o.engulfed = true; o.engulfDot = { n: q.dmg[0]?.n || 3, d: q.dmg[0]?.d || 6, t: q.dmg[0]?.t || 'acid' }; DN().give(rt, o, 'restrained', 1e6, e); }); return true; },
    // 빙의 (유령): 매력 내성. 실패하면 대상은 행동 불능, 유령은 사라져 그 몸으로 싸운다 (몸이 0이 되면 끝)
    Possession(f, rt, e, a) { if (e.possess) return false; const t = near(rt, e, 1.6).find(o => !o.possImm && o.merc); if (!t) return false; say(rt, e, '빙의', '#c9a6ff');
      if (DN().save(t, 'cha', a.dc)) { t.possImm = true; return true; } e.possess = t; e.ethereal = true; t.possBy = e; DN().give(rt, t, 'incapacitated', 1e6, e); return true; },
    // 에테르화 (유령 · 나이트메어): 위험하면 경계 에테르로 물러난다 — 이 싸움에서 빠진다
    Etherealness(f, rt, e) { if (e.hp > e.max * 0.35 || e.possess) return false; say(rt, e, '에테르화', '#c9a6ff'); e.ethereal = true; e.flee = true; return true; },
    'Ethereal Stride'(f, rt, e) { return SP.Etherealness(f, rt, e); },
    // 투명 (임프 · 오니): 다치면 투명 — 공격하면 풀린다
    Invisibility(f, rt, e) { if (DN().invis(e) || e.hp > e.max * 0.6) return false; say(rt, e, '투명', '#c9a6ff'); DN().buff(e, 'invis2', R6(600), {}); return true; },
    // 순간 이동 (행동): 둘러싸였으면 멀리
    Teleport(f, rt, e) { if (near(rt, e, 1.6).length < 2 || e.hp > e.max * 0.6) return false; const t = near(rt, e, 2)[0]; FO().shove(rt, e, t, 12); G.Tactics.snap(rt); say(rt, e, '순간 이동', '#c9a6ff'); return true; },
    // 죽음의 도약 (불레트): 15피트 안의 생물에게 뛰어든다. 실패 3d12 · 넘어짐, 성공 절반 · 밀려남
    'Deadly Leap'(f, rt, e, a) { const t = near(rt, e, 3.6)[0]; if (!t) return false; const list = near(rt, t, 1.6).concat(t).filter((o, i, l) => l.indexOf(o) === i); if (list.length < 2 && Math.random() < 0.5) return false;
      say(rt, e, '죽음의 도약'); step(rt, e, t, 3); saveOn(rt, e, list, failOf(a.text)); for (const o of list) if (!DN().has(o, 'prone') && !o.dead) FO().shove(rt, o, e, 1); return true; },
    // 짓밟는 돌진 (켄타우로스, 보너스 행동): 속도만큼 달려 지나간 생물마다 근력 내성 — 실패 피해 · 넘어짐
    'Trampling Charge'(f, rt, e, a) { const t = near(rt, e, FO().move(e) + 1.6)[0]; if (!t || Math.hypot(t.x - e.x, t.y - e.y) <= 1.6) return false; if (!step(rt, e, t, FO().move(e))) return false; say(rt, e, '짓밟는 돌진'); saveOn(rt, e, [t], failOf(a.text)); return true; },
    // 내던지기 (크라켄): 붙잡은 생물을 던진다 — 민첩 내성, 실패 4d8 · 넘어짐, 성공 절반
    Fling(f, rt, e, a) { const t = held(rt, e)[0]; if (!t) return false; say(rt, e, '내던지기'); t.grabBy = null; if (t.cond) delete t.cond.grappled; FO().shove(rt, t, e, 12); saveOn(rt, e, [t], failOf(a.text)); return true; },
    // 끌어당기기 (로퍼 · 에터캡): 붙잡은(에터캡은 거미줄로 묶은) 생물을 끌어온다
    Reel(f, rt, e, a) { const ft = +(/up to (\d+) feet/.exec(a.text)?.[1] || 25), list = /Restrained by its Web/.test(a.text) ? near(rt, e, 6.6).filter(o => DN().has(o, 'restrained') && Math.hypot(o.x - e.x, o.y - e.y) > 1.6) : held(rt, e).filter(o => Math.hypot(o.x - e.x, o.y - e.y) > 1.6); if (!list.length) return false; say(rt, e, '끌어당기기'); for (const o of list) FO().shove(rt, o, e, -Math.round(ft / 5)); return true; },
    // 급강하 (로크, 보너스 행동): 붙잡은 생물을 들고 날아올라 떨어뜨린다 — 추락 (SRD 10피트마다 1d6)
    Swoop(f, rt, e) { const t = held(rt, e)[0]; if (!t) return false; const ft = Math.floor((e.stat.speed?.fly || 60) / 2); say(rt, e, '급강하'); t.grabBy = null; if (t.cond) delete t.cond.grappled; FO().dtype = 'bludgeoning'; FO().blast(G.S.w.fantasy, rt, { atk: 1 }, t, DN().dice(Math.min(20, Math.floor(ft / 10)), 6), null, 0, 'bludgeoning'); FO().dtype = null; DN().give(rt, t, 'prone', R6(10)); FO().shove(rt, t, e, 3); return true; },
    // 스펙터 만들기 (망령): 1분 안에 죽은 인간형 시체에서 (거느릴 수 있는 것은 일곱)
    'Create Specter'(f, rt, e) { const L = rt.corpses || [], c = L.find(q => Math.hypot(q.x - e.x, q.y - e.y) <= 2.1); if (!c || rt.mons.filter(o => o.specterBy === e && o.hp > 0).length >= 7) return false; L.splice(L.indexOf(c), 1);
      const s = F().spawnMon(rt, f.floor, { n: '스펙터', ...G.D.F.mon['스펙터'] }, Math.round(c.x), Math.round(c.y), false, { aggro: true, spotted: true, major: true }); if (s) { s.specterBy = e; say(rt, e, '스펙터 만들기', '#c9a6ff'); } return !!s; },
    // 나무 깨우기 (트리언트): 60피트 안의 나무 둘 (늪의 맹그로브 칸). 트리언트 능력치, 이 행동은 없다
    'Animate Trees'(f, rt, e) { if (e._noAnim || e._animDone || rt.map?.theme !== 'swamp') return false; const m = rt.map, out = [];
      for (let y = Math.round(e.y) - 12; y <= Math.round(e.y) + 12 && out.length < 2; y++) for (let x = Math.round(e.x) - 12; x <= Math.round(e.x) + 12 && out.length < 2; x++) { if (G.Grid.at(m, x, y) !== '#' || Math.hypot(x - e.x, y - e.y) > 12) continue; const p = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(([u, v]) => G.Grid.pass(m, u, v) && !rt.mons.some(o => Math.round(o.x) === u && Math.round(o.y) === v)); if (p) out.push(p); }
      if (!out.length) return false; e._animDone = true; say(rt, e, '나무 깨우기', '#9fe79f');
      for (const [x, y] of out) { const t = F().spawnMon(rt, f.floor, { n: '트리언트', ...G.D.F.mon['트리언트'] }, x, y, false, { aggro: true, spotted: true, major: true }); if (t) t._noAnim = true; } return true; },
    'Shape-Shift'() { return false; }, // 모습 바꾸기: 원문 능력치표에 모든 모습의 공격이 있다 (전투 효과 없음)
    Leap() { return false; }, // 도약: 이동의 한 방식 (전투 효과 없음)
  };
  // ── 「casts X, Y, or Z」 (신성한 도움 · 거미 여왕의 마법 · 수면 · 안개 구름 · 감속 · 매혹 · 지옥불 주문 …): 원문 주문을 몬스터가 쓴다 ──
  const castsOf = t => { const m = /casts? (?:the )?(.+?)(?:,? (?:requiring|using)|\.(?:\s|$))/.exec(t); return m ? m[1].replace(/ twice$/, '').split(/, or |, | or /).map(s => s.trim().replace(/ spell$/, '')).filter(Boolean) : []; }; // 「the Slow spell」 · 「Fireball twice」
  function castBuff(f, rt, e, id, o) {
    const allies = rt.mons.filter(m => m.hp > 0 && m.aggro && Math.hypot(m.x - e.x, m.y - e.y) <= 6), foes = enemies(rt).filter(p => F().sees(rt.map, e, p));
    if (id === 'bless') { if (allies.some(m => DN().bon(m, 'bless'))) return false; for (const m of allies.slice(0, 3)) DN().buff(m, 'bless', R6(10), { hitD: 4, saveD: 4 }); return true; }
    if (id === 'invisibility' || id === 'greater-invisibility') { if (DN().invis(e) || e.hp > e.max * 0.7) return false; DN().buff(e, id === 'invisibility' ? 'invis2' : 'invisC', R6(id === 'invisibility' ? 600 : 10), {}); return true; }
    if (id === 'mirror-image') { if (e.images > 0) return false; e.images = 3; e.imagesT = G.S.runTime + R6(10); return true; }
    if (id === 'darkness' || id === 'fog-cloud') { if ((rt.darks || []).some(d => d.by === e)) return false; (rt.darks = rt.darks || []).push({ x: e.x, y: e.y, r: id === 'darkness' ? 3 : 4, until: G.S.runTime + R6(id === 'darkness' ? 100 : 600), lv: 2, by: e }); return true; }
    if (id === 'faerie-fire') { const q = plan(rt, e, { area: ['cube', 20] }); if (!q) return false; for (const p of q.list) if (!H().isMon(q.x, p) && !DN().save(p, 'dex', o.dc)) DN().give(rt, p, 'outlined', R6(10), e); return true; }
    if (id === 'slow') { const q = plan(rt, e, { area: ['cube', 40] }); if (!q || q.n < 2) return false; for (const p of q.list.filter(p => !H().isMon(q.x, p)).slice(0, 6)) if (!DN().save(p, 'wis', o.dc)) { DN().buff(p, 'slow', R6(10), { ac: -2, slowed: 1 }); (p.rep = p.rep || []).push({ k: 'bf:slow', ab: 'wis', dc: o.dc }); } return true; }
    if (id === 'sleep') { const q = plan(rt, e, { area: ['sphere', 5] }); if (!q) return false; for (const p of q.list.filter(p => !H().isMon(q.x, p))) if (!DN().save(p, 'wis', o.dc)) { DN().give(rt, p, 'incapacitated', R6(1), e); p.sleep = { dc: o.dc }; } return true; }
    if (['lesser-restoration', 'remove-curse', 'dispel-magic', 'detect-thoughts', 'disguise-self', 'dream', 'sanctuary', 'detect-magic'].includes(id)) return false; // 전투에서 쓸 곳 없음
    return null;
  }
  function castNamed(f, rt, e, a) {
    const dc = +(/spell save DC (\d+)/.exec(a.text)?.[1] || 0) || e.stat.acts.find(q => q.kind === 'spells')?.dc || e.stat.dc || 12, n = /twice/.test(a.text) ? 2 : 1;
    for (const raw of castsOf(a.text)) { const lvM = /\(level (\d) version\)/.exec(raw), id = spOf(raw.replace(/\s*\(.*\)/, '')); if (!id) continue; const sp = G.SRD_SP[id], o = { id, lv: lvM ? +lvM[1] : sp.lv, n: 0, key: 'c:' + id, dc, hit: dc - 8 };
      const b = castBuff(f, rt, e, id, o); if (b) { say(rt, e, spName(id, ko(a.name)), '#c9a6ff'); return true; } if (b === false) continue;
      const act = spellAct(sp, o); if (!act) continue;
      if (act.kind === 'save') { if (!plan(rt, e, act)) continue; for (let i = 0; i < n; i++) { const q = plan(rt, e, act); if (q) doSave(rt, e, act, q, spName(id, act.name)); } return true; }
      if (act.kind === 'atk') { const t = nearestFoe(rt, e); if (!t) continue; castSpell(rt, e, { a: act, t, spell: o }); return true; }
      if (act.kind === 'heal') { const t = rt.mons.filter(m => m.hp > 0 && m.aggro && m.hp < m.max * 0.5 && Math.hypot(m.x - e.x, m.y - e.y) <= 6).sort((p, q) => p.hp / p.max - q.hp / q.max)[0]; if (!t) continue; castSpell(rt, e, { a: act, t, spell: o }); return true; }
    }
    return false;
  }
  Object.assign(SP, {
    // 지옥 사슬 (체인 데빌): 60피트 안 하나 — 민첩 내성, 실패 2d4+4 화염 · 속박(데빌의 다음 차례 끝까지) · 30피트 끌려온다
    'Conjure Infernal Chain'(f, rt, e, a) { const t = near(rt, e, 12)[0]; if (!t) return false; const q = failOf(a.text); say(rt, e, ko(a.name)); if (DN().save(t, 'dex', q.dc)) return true; FO().dtype = 'fire'; FO().blast(f, rt, { atk: 1 }, t, DN().dice(2, 4) + 4, null, 0, 'fire'); FO().dtype = null; DN().give(rt, t, 'restrained', R6(1), e); FO().shove(rt, t, e, -6); return true; },
    // 바위 던지기 (거대 유인원): 90피트 안 지점의 5피트 구 — 민첩 내성 7d6 · 넘어짐
    'Boulder Toss'(f, rt, e, a) { const q = plan(rt, e, { area: ['sphere', 5], text: a.text }, 18); if (!q) return false; say(rt, e, ko(a.name)); saveOn(rt, e, q.list.filter(o => !H().isMon(q.x, o)), failOf(a.text)); return true; },
    // 회오리 만들기 (지니): 20피트 원기둥 — 근력 내성, 실패면 속박 (차례 시작에 다시 내성)
    'Create Whirlwind'(f, rt, e, a) { if (e._whirl) return false; const q = plan(rt, e, { area: ['cylinder', 20], text: a.text }, 24); if (!q) return false; e._whirl = true; say(rt, e, ko(a.name)); for (const o of q.list.filter(o => !H().isMon(q.x, o))) if (!DN().save(o, 'str', 17)) { DN().give(rt, o, 'restrained', R6(10), e); (o.rep = o.rep || []).push({ k: 'restrained', ab: 'str', dc: 17 }); } return true; },
    // 빛의 순간 이동 (솔라, 전설): 60피트 순간 이동 · 도착한 자리 10피트 — 민첩 내성 2d10 광휘, 성공 절반
    'Radiant Teleport'(f, rt, e, a) { const t = nearestFoe(rt, e); if (!t) return false; const sp = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => [Math.round(t.x) + dx, Math.round(t.y) + dy]).find(([x, y]) => G.Grid.pass(rt.map, x, y) && !rt.mons.concat(rt.party).some(o => Math.round(o.x) === x && Math.round(o.y) === y)); if (!sp) return false; e.x = sp[0]; e.y = sp[1]; say(rt, e, ko(a.name)); saveOn(rt, e, near(rt, e, 2.1), { save: 'dex', dc: 25, dmg: [{ n: 2, d: 10, b: 0, t: 'radiant' }], cond: [], half: true }); return true; },
    // 죽음의 순간 이동 (리치, 전설): 60피트 떠난다 · 떠난 자리 10피트 안 2d10 사령 (내성 없음)
    'Deathly Teleport'(f, rt, e) { const adj = near(rt, e, 2.1); if (!adj.length) return false; for (const o of adj) { FO().dtype = 'necrotic'; FO().blast(G.S.w.fantasy, rt, { atk: 1 }, o, DN().dice(2, 10), null, 0, 'necrotic'); FO().dtype = null; } FO().shove(rt, e, adj[0], 12); G.Tactics.snap(rt); say(rt, e, '죽음의 순간 이동', '#c9a6ff'); return true; },
    // 세상을 흔드는 움직임 (타라스크, 전설): 속도만큼 움직이고 60피트 충격파 — 집중이 끊기고 중간 이하 크기는 넘어짐
    'World-Shaking Movement'(f, rt, e) { const t = nearestFoe(rt, e); if (t) step(rt, e, t, FO().move(e)); say(rt, e, '세상을 흔드는 움직임'); for (const o of enemies(rt).filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= 12.5)) { if (o.concK) G.Res.endConc(o); DN().give(rt, o, 'prone', R6(10), e); } return true; },
    // 함성 (서리 거인, 보너스): 자신이나 동료 하나 — 임시 체력 2d10+5 · 다음 차례 시작까지 공격 이점
    'War Cry'(f, rt, e) { if (DN().bon(e, 'warcry')) return false; const m = rt.mons.filter(o => o.hp > 0 && o.aggro && Math.hypot(o.x - e.x, o.y - e.y) <= 6).sort((p, q) => p.hp / p.max - q.hp / q.max)[0] || e; m.thp = Math.max(m.thp || 0, DN().dice(2, 10) + 5); DN().buff(m, 'warcry', R6(1), { adv: 1 }); say(rt, e, '함성'); return true; },
    // 반짝이는 방패 (유니콘, 전설): 임시 체력 3d6 · AC +2 (유니콘의 다음 차례 끝까지)
    'Shimmering Shield'(f, rt, e) { const m = rt.mons.filter(o => o.hp > 0 && o.aggro && Math.hypot(o.x - e.x, o.y - e.y) <= 12).sort((p, q) => p.hp / p.max - q.hp / q.max)[0] || e; m.thp = Math.max(m.thp || 0, DN().dice(3, 6)); DN().buff(m, 'shimmer', R6(2), { ac: 2 }); say(rt, e, '반짝이는 방패'); return true; },
    // 어둠의 오라 (다크맨틀): 15피트 마법적 어둠 (집중, 따라다닌다)
    'Darkness Aura'(f, rt, e) { if ((rt.darks || []).some(d => d.by === e)) return false; (rt.darks = rt.darks || []).push({ x: e.x, y: e.y, r: 3, until: G.S.runTime + R6(100), lv: 2, by: e, follow: e }); say(rt, e, '어둠의 오라'); return true; },
    // 유혹의 노래 (하피): 300피트 인간형 · 거인 — 지혜 DC 11, 실패면 매혹 · 행동 불능 (차례 끝마다 다시)
    'Luring Song'(f, rt, e) { if (e._sang) return false; e._sang = true; say(rt, e, '유혹의 노래', '#c9a6ff'); for (const o of enemies(rt).filter(o => o.merc)) if (!DN().save(o, 'wis', 11)) { DN().give(rt, o, 'charmed', R6(10), e); DN().give(rt, o, 'incapacitated', R6(10), e); (o.rep = o.rep || []).push({ k: 'charmed', with: 'incapacitated', ab: 'wis', dc: 11 }); } return true; },
    // 더듬이 (녹 괴물): 곁의 생물의 금속 갑옷 · 무기 — 민첩 DC 11, 실패면 −1 (갑옷 AC)
    Antennae(f, rt, e) { const t = near(rt, e, 1.6).find(o => o.merc && G.Dnd.ac(o) > 10); if (!t) return false; say(rt, e, '더듬이'); if (!DN().save(t, 'dex', 11)) { t.acMinus = (t.acMinus || 0) + 1; G.Dnd.flip(t, '갑옷 부식', '#b8d67a'); } return true; },
    // 불붙기 (마그민, 보너스): 밝은 빛 10피트 · 어스름 10피트
    'Ignited Illumination'(f, rt, e) { if (e.glowOn) return false; e.glowOn = [10, 10]; return true; },
    // 사라지기 · 그림자 은신 · 배회: 투명 (공격하면 끝 — 숨기)
    Vanish(f, rt, e) { if (DN().invis(e)) return false; DN().buff(e, 'invis2', R6(10), {}); return true; },
    'Shadow Stealth'(f, rt, e) { if (DN().invis(e) || (G.Light && G.Light.level(rt, e.x, e.y) >= 2)) return false; return G.Act.hide(rt, e, true); }, // 숨기 (SRD Hide): DC 15 은신 · 그 값이 찾기 DC
    Prowl(f, rt, e) { if (DN().invis(e)) return false; const t = nearestFoe(rt, e); if (t) { const p = G.Tactics.plan(rt, e, t, FO().move(e), (x, y) => !enemies(rt).some(o => F().sees(rt.map, o, { x, y }))); if (p.length) { const z = p[p.length - 1]; e.x = z.x; e.y = z.y; } } return G.Act.hide(rt, e, true); }, // 배회: 기회 공격 없이 이동 · 숨기
    // 나무 걷기 (드라이어드): 큰 나무 곁에서 60피트 떨어진 다른 나무 곁으로 (늪)
    'Tree Stride'(f, rt, e) { if (rt.map?.theme !== 'swamp' || e.hp > e.max * 0.6 || !near(rt, e, 1.6).length) return false; FO().shove(rt, e, near(rt, e, 1.6)[0], 12); G.Tactics.snap(rt); say(rt, e, '나무 걷기'); return true; },
    // 환영 (클로커): 거울상 (밝은 빛에서 끝)
    Phantasms(f, rt, e) { if (e.images > 0 || (G.Light && G.Light.level(rt, e.x, e.y) >= 2)) return false; e.images = 3; e.imagesT = G.S.runTime + R6(10); say(rt, e, '환영'); return true; },
    Rampage() { return false; }, // 광란: 맞힌 뒤 (onHit)
    'Destroy Metal'() { return false; }, 'Bubble Dash'() { return false; }, 'Illusory Appearance'() { return false; }, 'Read Thoughts'() { return false; }, 'Nightmare Haunting'() { return false; }, Roar() { return false; }, // 전투 효과 없음 · 물속 · 첫째 · 둘째 · 셋째 포효는 따로
  });
  // 공격 하나를 X로 바꿀 수 있다 (용의 연속 공격): 바꿀 수 있는 이름들 · 몇 개를
  const replaceOf = s => { const m = (s.acts || []).find(a => a.kind === 'multi'), r = m && /can replace (one|two) attacks? with a use of (.+?)\.$/.exec(m.text.trim()); return r ? { n: r[1] === 'two' ? 2 : 1, txt: r[2] } : null; };
  const inReplace = (rp, o) => !!rp && (o.spell ? rp.txt.includes(G.SRD_SP[o.spell.id]?.en || '#') : rp.txt.includes(o.a.name));
  const M = {
    ko, spells, use, flush() { while (LATER.length) LATER.shift()(); },
    // 몬스터 차례 시작 (G.Foe.turn): 충전 굴림 · 전설 행동 되찾기
    startTurn(f, rt, e) {
      const s = e.stat; if (!s) return; const u = use(e);
      for (const a of (s.acts || []).concat(s.bonus || [])) if (a.recharge && u.rech[a.name] === false && DN().dice(1, 6) >= a.recharge) { u.rech[a.name] = true; if (!G.quiet) G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: `${ko(a.name)} 충전`, col: '#ffd27a', t: 0.9, sz: 0.7 }); } // 충전 (SRD): 차례 시작에 d6
      u.leg = 0; u.once = {}; G.ItemX?.shackle(rt, e);
      if (e._jaunt) { e._jaunt = false; e.ethereal = false; }
      for (const d of rt.darks || []) if (d.follow === e) { d.x = e.x; d.y = e.y; }
      for (const o of enemies(rt)) if (o.swallowBy === e) { o.x = e.x; o.y = e.y; if (o.swDot) { FO().dtype = o.swDot.t; FO().blast(f, rt, { atk: 1 }, o, DN().dice(o.swDot.n, o.swDot.d), null, 0, o.swDot.t); FO().dtype = null; } } // 삼킨 생물: 차례 시작에 산성
    },
    // 행동 (G.Foe.turn): 쓸 만한 특수 행동이 연속 공격보다 나으면 그것으로 차례를 쓴다. true면 썼다
    act(f, rt, st, e) {
      const s = e.stat; if (!s || DN().out(e) || s.id === 'mage') return false; // 메이지는 손으로 짠 주문 (G.Foe.spell)
      if (e.possess) { const t = e.possess; if (t.dead || t.dying || t.hp <= 0 || !rt.party.includes(t)) { e.possess = null; e.ethereal = false; t.possBy = null; t.possImm = true; if (t.cond) delete t.cond.incapacitated; e.x = t.x; e.y = t.y; FO().shove(rt, e, { x: t.x + 1, y: t.y }, -1); say(rt, e, '빙의가 끝났다', '#c9a6ff'); return false; }
        e.x = t.x; e.y = t.y; const v = near(rt, e, 1.6).find(o => o !== t) || near(rt, e, FO().move(t) + 1.6).find(o => o !== t); if (v) { step(rt, t, v, FO().move(t)); e.x = t.x; e.y = t.y; attackOne(f, rt, e, v, (s.melee || [])[0]?.name); } return true; } // 빙의한 몸으로 싸운다
      const tele = a => e.shackled && /teleport|ethereal|misty step|plane shift|stride|vanish/i.test(a.name + ' ' + a.text); // 차원 족쇄 (SRD)
      for (const a of s.acts || []) if (SP[a.name] && !tele(a) && ok(e, a) && SP[a.name](f, rt, e, a)) { spend(e, a); return true; }
      for (const a of s.acts || []) if (a.kind === 'other' && !SP[a.name] && /\bcasts? /.test(a.text) && ok(e, a) && !e.noSpell && !G.Util?.silenced(rt, e) && castNamed(f, rt, e, a)) { spend(e, a); return true; } // 「casts X」
      let best = null;
      const inMulti = ((s.acts || []).find(a => a.kind === 'multi' && !/replace/.test(a.text))?.text.match(/\buses (?:either )?(.+?)(?: if available)?\.$/)?.[1] || '').split(/ or |, | and /).map(x => x.trim()); // 연속 공격에 든 행동은 after()가 공격 뒤에
      const opts = [];
      for (const a of (s.acts || []).filter(a => a.kind === 'save' && !SP[a.name] && ok(e, a) && !inMulti.includes(a.name))) { const q = plan(rt, e, a); if (!q) continue; const v = (avg(a.dmg) * (a.half ? 0.75 : 0.6) + condV(a.cond)) * q.score; opts.push({ v, a, q }); }
      if (!e.noSpell && !G.Util.silenced(rt, e)) opts.push(...spellOpts(rt, e)); // 침묵 (SRD): 말로 하는 주문을 못 쓴다
      for (const o of opts) if (!best || o.v > best.v) best = o;
      if (!best) return false;
      const melee = (FO().attacks(e, null) || []).reduce((v, a) => v + (a ? a.n * (a.d + 1) / 2 + a.b + (a.ex ? a.ex.n * (a.ex.d + 1) / 2 : 0) : 0), 0) * 0.6, reachable = enemies(rt).some(o => Math.hypot(o.x - e.x, o.y - e.y) <= FO().reach(e) + FO().move(e));
      const limited = best.a.recharge || best.a.perDay || best.spell?.n, rp = replaceOf(s), nAtk = (FO().attacks(e, null) || []).length || 1;
      const rb = rp && opts.filter(o => inReplace(rp, o)).sort((p, q) => q.v - p.v)[0]; // 바꿀 수 있는 것 + 남은 공격이 통째 행동보다 나으면 그쪽
      if (rb && rb.v + melee * (nAtk - rp.n) / nAtk >= Math.max(best.v, melee)) best = rb;
      if (rp && inReplace(rp, best) && best.v >= melee * rp.n / nAtk) { if (best.spell) castSpell(rt, e, best); else { spend(e, best.a); doSave(rt, e, best.a, best.q); } e._skipAtk = rp.n; return false; } // 공격 하나(둘)를 바꾼다: 나머지 공격은 그대로
      if (best.v < melee * (reachable ? 1 : 0.2) && !(limited && best.q?.n >= 2)) return false; // 연속 공격이 낫다
      if (best.spell) castSpell(rt, e, best); else { spend(e, best.a); doSave(rt, e, best.a, best.q); }
      return true;
    },
    // 보너스 행동 (차례 시작에, 행동과 따로): 내성 · 공격형 보너스 행동 · 위험하면 순간 이동
    bonus(f, rt, st, e) {
      const s = e.stat; if (!s?.bonus?.length || DN().out(e) || e.possess) return;
      for (const a of s.bonus) {
        if (!ok(e, a) || (e.shackled && /teleport|ethereal|misty step|plane shift|stride/i.test(a.name + ' ' + a.text))) continue;
        if (SP[a.name]) { if (SP[a.name](f, rt, e, a)) { spend(e, a); return; } if (a.name !== 'Teleport') continue; }
        if (a.kind === 'other' && /\bcasts? /.test(a.text) && !e.noSpell) { if (castNamed(f, rt, e, a)) { spend(e, a); return; } continue; }
        if (a.kind === 'save') { const q = plan(rt, e, a); if (q) { spend(e, a); doSave(rt, e, a, q); return; } }
        else if (a.kind === 'atk') { const t = nearestFoe(rt, e); if (t && attackOne(f, rt, e, t, a.name)) { spend(e, a); say(rt, e, ko(a.name)); return; } }
        else if (/^(Misty Step|Teleport|Shadow Step|Fey Step)/.test(a.name) || /teleports? up to/.test(a.text)) { const t = nearestFoe(rt, e); if (t && Math.hypot(t.x - e.x, t.y - e.y) <= 1.6 && e.hp < e.max * 0.6) { spend(e, a); FO().shove(rt, e, t, 6); G.Tactics.snap(rt); say(rt, e, ko(a.name), '#c9a6ff'); return; } }
      }
    },
    // 전설 행동 (SRD): 다른 생물의 차례가 끝날 때마다 하나 (횟수는 제 차례 시작에 되찾는다)
    legendary(f, rt, prev) {
      for (const e of rt.mons) {
        const s = e.stat; if (!s?.legN || e.hp <= 0 || e === prev || DN().out(e) || !e.aggro) continue; const u = use(e); if (u.leg >= s.legN) continue;
        const rank = a => (/regains/.test(a.text) && e.hp < e.max * 0.8 ? 0 : a.kind === 'save' || SP[a.name] ? 1 : /\b(uses|casts?)\b/.test(a.text) ? 2 : 3); // 전설 행동 고르기: 회복(다쳤으면) · 내성 · 특수 · 주문 · 공격 순
        for (const a of (s.legend || []).slice().sort((p, q) => rank(p) - rank(q))) {
          const cost = a.cost || 1; if (u.leg + cost > s.legN || u.once[a.name]) continue;
          let done = false;
          if (SP[a.name]) done = !!SP[a.name](f, rt, e, a);
          else if (/\buses (?!Spellcasting)([A-Z][\w’' ]+?)(?: and| \(|\.)/.test(a.text)) { const nm = /\buses ([A-Z][\w’' ]+?)(?: and| \(|\.)/.exec(a.text)[1].trim(), q0 = s.acts.concat(s.bonus || []).find(q => q.name === nm), only = /Charmed or Grappled by/.test(q0?.text || ''); if (q0?.kind === 'save') { const q = plan(rt, e, q0); if (q && only) q.list = q.list.filter(o => o.grabBy === e || (DN().has(o, 'charmed') && o.charmBy === e)); if (q && q.list.length) { doSave(rt, e, q0, q); done = true; } } else if (q0?.kind === 'atk') { const t = nearestFoe(rt, e); done = !!(t && attackOne(f, rt, e, t, nm)); } if (done && /regains \d+ \((\d+)d(\d+)\) Hit Points/.test(a.text)) { const m = /regains \d+ \((\d+)d(\d+)\)/.exec(a.text); e.hp = Math.min(e.max, e.hp + DN().dice(+m[1], +m[2])); } } // 「uses X」 (정신 흡수 · 폭풍 화살 · 노려보기)
          else if (a.kind === 'save') { const q = plan(rt, e, a); if (q) { doSave(rt, e, a, q); done = true; } }
          else { const at = /makes one ([A-Z][\w’' -]*?) attack/.exec(a.text), cast = /(?:uses Spellcasting to cast|casts) ([A-Z][\w’' ]*?)(?: \(level (\d) version\))?[,.]/.exec(a.text);
            if (at) { if (/moves up to half its Speed/.test(a.text)) { const t = nearestFoe(rt, e); if (t) { const p = G.Tactics.plan(rt, e, t, Math.floor(FO().move(e) / 2), (x, y) => Math.hypot(x - t.x, y - t.y) <= FO().reach0(e)); if (p.length) { const z = p[p.length - 1]; e.x = z.x; e.y = z.y; } } } const t = nearestFoe(rt, e); done = !!(t && attackOne(f, rt, e, t, at[1].trim())); if (done) say(rt, e, ko(a.name)); }
            else if (cast) { const id = spOf(cast[1].trim()); if (id) { const sp = G.SRD_SP[id], o = { id, lv: cast[2] ? +cast[2] : sp.lv, n: 0, key: 'leg:' + id, dc: s.acts.find(q => q.kind === 'spells')?.dc || s.dc, hit: s.acts.find(q => q.kind === 'spells')?.hit ?? s.dc - 8 }, act = spellAct(sp, o); if (act?.kind === 'save') { const q = plan(rt, e, act); if (q) { doSave(rt, e, act, q, spName(id, act.name)); done = true; } } else if (act?.kind === 'atk') { const t = nearestFoe(rt, e); if (t) { castSpell(rt, e, { a: act, t, spell: o }); done = true; } } } } }
          if (done) { u.leg += cost; if (/can[’']t take this action again until/.test(a.text)) u.once[a.name] = true; break; }
        }
      }
    },
    // 연속 공격 뒤 (SRD Multiattack 「… and uses Constrict」 · 「uses either A or B if available」): 공격을 마친 뒤 그 행동을 쓴다
    after(f, rt, e, tg) {
      if (e.stat?.bonus?.some(b => b.name === 'Ethereal Jaunt') && !e.ethereal && !e.shackled && !DN().out(e)) { e.ethereal = true; e._jaunt = true; say(rt, e, '에테르 도약', '#c9a6ff'); } // 위상 거미: 치고 에테르로 (다음 차례 시작에 돌아온다)
      const s = e.stat, m = (s.acts || []).find(a => a.kind === 'multi'); if (!m || DN().out(e) || /replace/.test(m.text)) return;
      const w = /\buses (?:either )?(.+?)(?: if available)?\.$/.exec(m.text.trim()); if (!w) return;
      for (const n of w[1].split(/ or |, | and /).map(x => x.replace(/^\([A-Z]\) /, '').trim())) {
        const a = s.acts.find(q => q.name === n && q.kind === 'save'); if (!a || !ok(e, a)) continue;
        const q = plan(rt, e, a); if (!q) continue; spend(e, a); doSave(rt, e, a, q); return;
      }
    },
    // 오라 (SRD): 「차례 시작에 곁에 있으면」 — 그 생물의 차례 시작 · 「제 차례 끝에」 — 몬스터의 차례 끝
    startOf(f, rt, o) {
      for (const e of rt.mons) { if (e.hp <= 0 || e === o || !e.stat?.auras?.length) continue; for (const a of e.stat.auras) { if (a.when !== 'start' || Math.hypot(o.x - e.x, o.y - e.y) > cells(a.ft) + 0.6 || (o.kind === 'mon' && !a.dmg.length)) continue; aura(f, rt, e, a, [o]); } }
    },
    endTurn(f, rt, e) {
      if (e?.kind !== 'mon' || e.hp <= 0 || !e.stat?.auras?.length) return;
      for (const a of e.stat.auras) if (a.when === 'end') aura(f, rt, e, a, rt.mons.filter(o => o !== e && o.hp > 0).concat(enemies(rt)).filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= cells(a.ft) + 0.6));
    },
    // 죽음의 폭발 (SRD Death Burst · Death Throes): 쓰러진 자리에서
    onDeath(f, rt, m) {
      for (const o of enemies(rt)) if (o.swallowBy === m) release(rt, o, false); // 죽으면 삼킨 생물이 빠져나온다
      if (m.possess) { const t = m.possess; t.possBy = null; if (t.cond) delete t.cond.incapacitated; m.possess = null; }
      const b = m.stat?.deathBurst; if (!b) return false;
      say(rt, m, '죽음의 폭발', '#ff9a5a');
      const x = { f, rt, c: m, seen: [], reach: 0 }, list = H().AREA.hits(x, m, { shape: 'emanation', ft: b.ft }, m);
      if (b.dmg.length) { FO().dtype = b.dmg[0].t; H().AREA.save(x, m, list, b.save, [b.dmg[0].n, b.dmg[0].d, b.dmg[0].b], b.half, o => { for (const c of b.cond) give(rt, o, c, m, b, b.dc); }, false, b.dmg[1] ? [b.dmg[1].n, b.dmg[1].d, b.dmg[1].t] : null, b.dc); FO().dtype = null; }
      else for (const o of list) if (!DN().save(o, b.save, b.dc)) for (const c of b.cond) give(rt, o, c, m, b, b.dc);
      return true;
    },
    // 안에서 친 피해 (삼키기 · SRD): 한 차례에 기준을 넘으면 건강 내성 — 실패하면 토해 낸다
    hurt(f, rt, m, dmg, from) { if (!from || from.swallowBy !== m || !from.swCut) return; const no = G.Turn.no(); if (m._swNo !== no) { m._swNo = no; m._swD = 0; } const was = m._swD; m._swD += dmg; if (was < from.swCut.n && m._swD >= from.swCut.n && m.hp > 0 && !DN().save(m, 'con', from.swCut.dc)) { say(rt, m, '토해 냈다'); release(rt, from, true); } },
    // 명중 뒤 효과 (손으로 짠 RIDER가 없을 때): 상태 · 붙잡기 DC · 밀기 · 당기기 · 명중 뒤 내성 · 치유 불가
    onHit(rt, mo, p, a) {
      if (!a) return;
      if (mo.stat?.bonus?.some(b => b.name === 'Rampage') && p.hp <= p.max / 2 && mo._rampNo !== G.Turn.no() && !mo._rampOn) { mo._rampNo = G.Turn.no(); mo._rampOn = true; const nm = /makes one ([A-Z][\w ]+?) attack/.exec(mo.stat.bonus.find(b => b.name === 'Rampage').text)?.[1]; setTimeout0(() => { const t = nearestFoe(rt, mo); if (t) { step(rt, mo, t, Math.floor(FO().move(mo) / 2)); attackOne(G.S.w.fantasy, rt, mo, t, nm); } mo._rampOn = false; }); }
      for (const c of a.cond || []) give(rt, p, c, mo, a);
      if (a.move) FO().shove(rt, p, mo, Math.round(a.move / 5));
      if (a.rider && !DN().save(p, a.rider.save, a.rider.dc)) { giveAll(rt, p, a.rider.cond, mo, { ...a, save: a.rider.save }, a.rider.dc); const v = a.rider.dmg.reduce((s, d) => s + DN().dice(d.n, d.d) + d.b, 0); if (v) { FO().dtype = a.rider.dmg[0].t; FO().blast(G.S.w.fantasy, rt, { atk: 1 }, p, v, null, 0, a.rider.dmg[0].t); FO().dtype = null; } }
      if (a.noHeal) { p.noHeal = true; p.effBy = mo; }
    },
  };
  function aura(f, rt, e, a, list) {
    const ab = a.save, x = { f, rt, c: e, seen: [], reach: 0 };
    if (/^While underwater/.test(a.text) && G.Grid.at(rt.map, Math.round(e.x), Math.round(e.y)) !== '~') return; // 아볼레스의 점액: 물속에서만
    if (/unless the [\w ]+ has the Incapacitated/.test(a.text)) { if (DN().out(e)) return; a = { ...a, cond: [] }; } // 아제르: 행동 불능이면 꺼진다 (상태를 거는 것이 아니다)
    if (/of the [\w’' ]+ choice/.test(a.text)) list = list.filter(o => o.kind !== 'mon'); // 고른 생물만
    if (a.dmg.length) { FO().dtype = a.dmg[0].t; H().AREA.save(x, e, list, ab, [a.dmg[0].n, a.dmg[0].d, a.dmg[0].b], false, o => { for (const c of a.cond) give(rt, o, c, e, { ...a, until: 'next' }, a.dc); }, false, null, a.dc || 10); FO().dtype = null; }
    else for (const o of list) if (ab && !DN().save(o, ab, a.dc)) for (const c of a.cond) give(rt, o, c, e, { ...a, until: 'next' }, a.dc);
  }
  return M;
})();
