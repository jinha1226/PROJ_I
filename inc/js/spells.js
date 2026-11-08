'use strict';
// SRD 5.2.1 주문 전부 (DESIGN.md 91): 데이터는 js/srd_spells.js (tools/srd_spells.py). 전투 효과는 종류별로 여기서 한 번만 짠다.
// atk 명중 · save 내성 피해 · heal 치유 · cond 상태이상 · buff 강화 · field 장판 · summon 소환 · clean 해제 · pw 권능어 · rider 맞힌 뒤 · react 반응 · util 전투 밖(데이터만)
(() => {
  const D = G.D, SK = G.Skill.SK, H = G.Skill.H, DN = G.Dnd, F = () => G.Fantasy, GR = G.Grid;
  const CLS = { barbarian: 'barbarian', bard: 'bard', cleric: 'cleric', druid: 'scout', fighter: 'dragoon', monk: 'monk', paladin: 'paladin', ranger: 'archer', rogue: 'rogue', sorcerer: 'mage', warlock: 'warlock', wizard: 'archmage' };
  const FULL = l => l * 2 - 1, HALF = l => [1, 5, 9, 13, 17][l - 1] || 20, PACT = l => l * 2 - 1;
  const lvAt = (c, l) => (!l ? 1 : c === 'paladin' || c === 'archer' ? HALF(l) : c === 'warlock' ? PACT(l) : FULL(l));
  const COND_N = { blinded: '실명', charmed: '매혹', frightened: '공포', paralyzed: '행동 불능', poisoned: '중독', prone: '넘어짐', restrained: '속박', stunned: '기절', sapped: '약화', outlined: '빛남', push: '밀침', slow: '느려짐' };
  const AB = k => DN.AB_N[k] || k, DT = k => G.Trinket.DT_N[k] || k || '';
  const diceTxt = s => (s ? (s[0] ? `${s[0]}d${s[1]}` : '') + (s[2] ? `${s[0] ? ' + ' : ''}${s[2]}` : '') : '');
  const PROP = { hitD: v => `명중 +1d${v}`, saveD: v => `내성 +1d${v}`, hit: v => `명중 +${v}`, ac: v => `AC +${v}`, save: v => `내성 +${v}`, dmgB: v => `피해 +${v}`, adv: () => '공격 이점', hitDis: () => '나를 노리는 공격 불리', taken: v => `받는 피해 ×${v}`, moveK: v => `이동 +${Math.round(v * 100)}%`, thp: v => `임시 체력 ${diceTxt(v)}`, extraAtk: v => `공격 +${v}`, deathWard: () => '쓰러질 때 한 번 버팀', imm: k => `${COND_N[k] || k} 면역` };
  const propsTxt = p => Object.keys(p).filter(k => k !== 'self').map(k => (k.startsWith('res_') ? `${DT(k.slice(4))} 저항` : PROP[k] ? PROP[k](p[k]) : '')).filter(Boolean).join(' · ');
  function descOf(o) {
    const area = o.area ? `반경 ${o.area}칸 ` : '', sv = o.save ? `${AB(o.save)} 내성${o.half ? ' 절반' : ''}` : '', dice = `${diceTxt(o.dice)} ${DT(o.dt)}`.trim(), T = n => `${n}라운드`;
    switch (o.k) {
      case 'atk': return `명중 ${dice}${o.cond ? ` · ${COND_N[o.cond]}` : ''}${o.noHeal ? ' · 치유 불가' : ''}${o.noReact ? ' · 반응 불가' : ''}${o.dot ? ` · 다음 차례 ${diceTxt(o.dot)}` : ''}`;
      case 'save': return `${area}${dice} · ${sv}${o.cond ? ` · ${COND_N[o.cond]}` : ''}`;
      case 'heal': return `${o.n > 1 ? `파티 ${o.n}명 ` : ''}${diceTxt(o.heal)}${o.heal[0] && !o.heal[2] ? ' + 능력치' : ''} 회복${o.clean ? ' · 상태이상 해제' : ''}`;
      case 'cond': return `${area}${o.save ? `${AB(o.save)} 내성 · ` : ''}${COND_N[o.cond] || o.cond} ${T(o.T)}${o.only ? ` (${o.only === 'beast' ? '야수' : '인간형'})` : ''}`;
      case 'buff': return `${o.props?.self ? '자신 ' : o.n > 1 ? `${o.n}명 ` : ''}${propsTxt(o.props || {})}${o.T >= 100 ? '' : ` · ${T(o.T)}`}`;
      case 'field': return `${o.area ? `반경 ${o.area}칸 ` : ''}차례마다 ${dice}${sv ? ` · ${sv}` : ''}${o.cond ? ` · ${COND_N[o.cond]}` : ''}`;
      case 'summon': return `소환: 차례마다 명중 ${dice}`;
      case 'clean': return '동료의 상태이상 해제';
      case 'stab': return '쓰러진 동료를 안정시킨다';
      case 'blink': return '위험하면 순간 이동';
      case 'pw': return o.kill ? `체력 ${o.lim} 이하면 즉사` : `체력 ${o.lim} 이하면 기절`;
      case 'rider': return `무기로 맞히면 +${dice}${o.cond ? ` · ${COND_N[o.cond]}` : ''}`;
      case 'react': return '적이 주문을 쓰면 건강 내성으로 끊는다';
      default: return '';
    }
  }
  // 높은 슬롯 (G.SRD_UP · DESIGN.md 125): o.lv 위로 몇 레벨인가. 지속 효과의 x에는 base가 없으므로 o.lv로 잰다
  const plus = (o, x) => Math.max(0, (x.slot || o.lv) - o.lv);
  const upS = (o, x, s) => { const u = o.upR, p = plus(o, x), r = [s[0], s[1], s[2] || 0]; if (!u || !p) return r; if (u.d) { if (u.d[1] === s[1]) r[0] += u.d[0] * p; else r[3] = [u.d[0] * p, u.d[1]]; } if (u.flat) r[2] += u.flat * p; return r; };
  const nOf = (o, x) => (o.n || 1) + (o.upR?.n || 0) * plus(o, x), areaOf = (o, x) => (o.area ? o.area + (o.upR?.area || 0) * plus(o, x) : 0);
  const scale = (o, x, c) => (o.cantrip || o.cantripDice ? H.tierS(c, o.dice) : upS(o, x, o.dice));
  // 원문 지속 (SRD): 1분 = 10라운드 … 「다음 차례 끝까지」면 1라운드. 재내성: 「차례 끝마다 다시 내성」 · 「피해를 받을 때마다 다시 내성」 · 「시전자 쪽이 해치면 풀린다」
  const DURR = { '1 round': 1, '1 minute': 10, '10 minutes': 100, '1 hour': 600, '8 hours': 4800, '24 hours': 14400 };
  const durR = o => { const t = o.srd?.text || '', d = (o.srd?.dur || '').replace(/^Concentration, up to /, ''); if (/(?:has|have) the \w+ condition until the (?:start|end) of (?:your|its|the target.s) next turn/i.test(t)) return 1; return DURR[d] ?? o.T ?? 1; };
  const repOf = o => /repeats? the save at the end of each of its turns|end of each of (?:its|the target.s) turns[^.]*(?:repeats?|makes? another)[^.]*sav|a target repeats the save|the target repeats the save, ending/i.test(o.srd?.text || '');
  const repDmgOf = o => /(?:each time|whenever) (?:it|the target) takes damage,? (?:it|the target) (?:repeats|makes another)/i.test(o.srd?.text || '');
  const endDmgOf = o => /ends? (?:early )?if (?:you or (?:one of )?your (?:allies|companions)|you or your allies) (?:deal damage to|damage)/i.test(o.srd?.text || '');
  const condOn = (x, c, t, o, k) => { if (o.conc && c.concK) (c.concK.conds = c.concK.conds || []).push([t, k]); if (repOf(o) && o.save) (t.rep = t.rep || []).push({ k, ab: o.save, dc: DN.dc(c) }); if (repDmgOf(o) && o.save) (t.repDmg = t.repDmg || []).push({ k, ab: o.save, dc: DN.dc(c) }); if (endDmgOf(o)) t.endOnDmgBy = c; if (/can take an action to [^.]{0,40}repeat the save/i.test(o.srd?.text || '') && o.save) t.actSave = { k, ab: o.save, dc: DN.dc(c) }; }; // 피할 수 없는 춤 (SRD): 자기 행동을 써서 다시 내성
  const hit = (x, c, t, kind, n) => {
    if (kind === 'push') return H.push(x, c, t, 2);
    if (kind === 'slow') { t.shock = Math.max(t.shock || 0, 60); return; }
    // SRD 상태 그대로 (G.Dnd.COND 15종). 매혹은 매혹한 쪽을 공격하지 못하게 할 뿐 움직임은 막지 않는다 (G.Foe.target)
    DN.give(x.rt, t, kind, H.R6(n), c);
  };
  // 원문 범위 (G.SRD_SP[id].srd.area · tools/srd_spells_db.py): 모양 · 크기 그대로, 아군도. 「creatures of your choice」면 고른 적만
  const shapeOf = o => (o.srd?.area ? { ...o.srd.area, self: /^self/i.test(o.srd.range || '') } : null);
  const choiceOf = o => /creatures? of your choice|any number of creatures/i.test(o.srd?.text || '');
  const areaCast = (o, x, c) => H.AREA.cast(x, c, null, shapeOf(o), { choice: choiceOf(o), sculpt: !!F().sk(c, 'ft_sculpt') && o.sch === 'evocation', up: (o.upR?.area || 0) * plus(o, x) });
  const targets = (o, x, c) => { if (!o.rng) return H.near(x, c, areaOf(o, x) || 2); const t = H.pick(x); if (!t) return []; if (o.area) return H.near(x, t, areaOf(o, x)); if (nOf(o, x) > 1) return [t, ...x.seen.filter(q => q !== t)].slice(0, nOf(o, x)); if (o.k === 'cond' && G.Skill.twin) { const t2 = x.seen.find(q => q !== t); if (t2) { G.Skill.twinUsed = true; return [t, t2]; } } return [t]; };
  // 차례를 마칠 때 (SRD 장판 주문: 「enters … or ends its turn there」): 그 생물 하나에게, 차례에 한 번
  const fieldCond = (o, x, c, t) => { const txt = o.srd?.text || '', long = new RegExp('has the ' + o.cond + ' condition until the spell ends', 'i').test(txt); hit(x, c, t, o.cond, long ? durR(o) : o.condT || 1); if (long) { condOn(x, c, t, o, o.cond); const esc = /take an action to make a (Strength|Dexterity) \((?:Athletics|Acrobatics)\) check/i.exec(txt); if (esc && t.kind === 'mon') t.escape = { ab: [esc[1].slice(0, 3).toLowerCase()], dc: DN.dc(c) }; } };
  const fieldOne = (o, x, c, e, m) => {
    if (!e || m.hp <= 0) return; const at = o.follow ? c : (e.tg && e.tg.hp > 0 ? e.tg : e.pos); if (!at) return;
    const list = o.area ? H.near(x, o.follow ? c : e.pos, o.area) : e.tg && e.tg.hp > 0 ? [e.tg] : []; if (!list.includes(m)) return;
    const no = G.Turn.no(); if ((e.hitNo || (e.hitNo = new Map())).get(m) === no) return; e.hitNo.set(m, no);
    G.Foe.dtype = o.dt; const s = upS(o, x, o.dice); if (o.save) { const ok = H.saveHit(x, c, m, o.save, s, o.half); if (!ok && o.cond && !G.Dnd.has(m, o.cond)) fieldCond(o, x, c, m); } else F().hurt(x.f, x.rt, m, H.dmg(x, c, s), 'dot', c); G.Foe.dtype = null;
  };
  const fieldTick = (o, x, c, e) => {
    const at = o.follow ? c : (e.tg && e.tg.hp > 0 ? e.tg : e.pos); if (!at) return;
    if (!e.pos) e.pos = { x: at.x, y: at.y };
    const list = o.area ? H.near(x, o.follow ? c : e.pos, o.area) : e.tg && e.tg.hp > 0 ? [e.tg] : [];
    G.Foe.dtype = o.dt;
    for (const t of list) { const s = upS(o, x, o.dice); if (o.save) { const ok = H.saveHit(x, c, t, o.save, s, o.half); if (!ok && o.cond && !G.Dnd.has(t, o.cond)) fieldCond(o, x, c, t); } else F().hurt(x.f, x.rt, t, H.dmg(x, c, s), 'dot', c); }
    G.Foe.dtype = null;
  };
  function build(o) {
    const S = { base: o.lv, bonus: o.ct === 'b', conc: !!o.conc, dt: o.dt, T: o.T, save: o.save, res: o.lv ? { slot: o.lv } : undefined };
    const seen = H.W.seen, want = (o.area || 0) >= 2 ? H.W.pack(2) : seen;
    switch (CUSTOM[o.en] ? 'custom' : o.k) {
      case 'atk': S.when = seen; S.run = (c, x) => {
        const t = H.pick(x); if (!t) return false;
        const r = H.strike(x, c, t, scale(o, x, c));
        if (!r.hit || t.hp <= 0) return;
        if (o.cond) { hit(x, c, t, o.cond, o.condT || durR(o)); condOn(x, c, t, o, o.cond); }
        if (o.noHeal) t.noHeal = true;
        if (o.noReact) t.noReact = true;
        if (o.dot) F().inflict(x.f, x.rt, t, 'burn', H.R6(1), c, { dice: [o.dot[0] + (o.upR?.dot ? o.upR.dot[0] * plus(o, x) : 0), o.dot[1]], dt: o.dotT || o.dt }, true); /* 다음 차례 시작에 주사위 (SRD) */
        if (o.splash) { G.Foe.dtype = o.splash[2]; for (const q of H.near(x, t, o.splash[4])) H.saveHit(x, c, q, o.splash[3], [o.splash[0] + (o.upR?.splash ? o.upR.splash[0] * plus(o, x) : 0), o.splash[1]], false); G.Foe.dtype = o.dt; }
      }; break;
      case 'save': S.when = want; S.run = (c, x) => {
        const s = scale(o, x, c);
        if (shapeOf(o)) { const q = areaCast(o, x, c); if (!q) return false; H.AREA.save(x, c, q.list, o.save, s, !!o.half, t => { if (o.cond) hit(x, c, t, o.cond, o.condT || 1); }, q.sc, o.dual); return; }
        const list = targets(o, x, c); if (!list.length) return false; for (const t of list) { const ok = H.saveHit(x, c, t, o.save, s, !!o.half); if (!ok && t.hp > 0 && o.cond) hit(x, c, t, o.cond, o.condT || 1); } }; break;
      case 'heal': S.heal = true; S.when = H.W.low(0.6); S.run = (c, x) => {
        const list = H.alive(x).filter(p => !p.noHeal && p.hp < p.max * (o.n > 1 ? 0.8 : 0.6)).sort((p, q) => p.hp / p.max - q.hp / q.max).slice(0, o.n || 1); if (!list.length) return false;
        const s = upS(o, x, o.heal), add = o.heal[2] ? s[2] : o.heal[0] ? H.pmod(c) : 0;
        for (const p of list) { H.heal(x, c, p, [s[0], s[1], add]); if (o.clean) p.cond = {}; }
      }; break;
      case 'cond': S.when = (c, x) => want(c, x) && (!o.only || x.seen.some(t => (o.only === 'beast' ? t.ty === 'beast' : DN.humanoid(t)))); S.run = (c, x) => {
        let list; if (shapeOf(o)) { const q = areaCast(o, x, c); if (!q) return false; list = q.sc ? q.list.filter(t => x.rt.mons.includes(t)) : q.list; } else list = targets(o, x, c); if (o.only) list = list.filter(t => (o.only === 'beast' ? t.ty === 'beast' : DN.humanoid(t))); if (!list.length) return false;
        for (const t of list) { if (o.save && DN.save(t, o.save, DN.dc(c))) continue; hit(x, c, t, o.cond, durR(o)); condOn(x, c, t, o, o.cond); } // 원문 지속 · 재내성 · 집중
      }; break;
      case 'buff': { const p = o.props || {}, key = 'sp_' + o.en; S.when = (c, x) => H.W.fight(c, x) && (p.self ? !DN.bon(c, key) : H.alive(x).some(q => !DN.bon(q, key))); S.run = (c, x) => {
        const list = p.self ? [c] : H.alive(x).filter(q => !DN.bon(q, key)).sort((a, b) => a.hp / a.max - b.hp / b.max).slice(0, nOf(o, x)); if (!list.length) return false;
        const step = o.upR?.steps?.filter(q => (x.slot || o.lv) >= q[0]).pop()?.[1], thpUp = (o.upR?.thp || 0) * plus(o, x);
        const props = {}; for (const k in p) if (k !== 'self' && k !== 'thp' && k !== 'imm') props[k] = step ?? p[k]; if (p.imm) props['imm_' + p.imm] = 1;
        for (const q of list) { if (p.thp) q.thp = Math.max(q.thp || 0, (DN.dice(p.thp[0], p.thp[1]) + p.thp[2] + thpUp) * (q.merc ? q.max / Math.max(1, DN.srdHP(q.merc)) : 1)); if (o.conc) G.Res.concOn(c, q, key, H.R6(o.T), props); else DN.buff(q, key, H.R6(o.T), props); H.ring(x, q, 0.9, '#8fd8ff'); }
      }; break; }
      case 'field': S.when = want; S.run = (c, x) => { const t = o.follow ? c : H.pick(x); if (!t) return false; if (/Difficult Terrain/.test(o.srd?.text || '')) { const A = shapeOf(o); G.Terrain.add(x.rt, { x: t.x, y: t.y, r: A ? (A.shape === 'cube' || A.shape === 'square' ? A.ft / 10 : A.ft / 5) : o.area || 2, sq: !!A && (A.shape === 'cube' || A.shape === 'square'), at: o.follow ? c : null, until: G.S.runTime + H.R6(o.T || 10), by: c, conc: !!o.conc }); } /* 원문이 어려운 지형이라 하면 (SRD) */ H.persist(c, 'gen', H.R6(durR(o)), { conc: !!o.conc, slot: x.slot, tg: o.area ? null : t, pos: { x: t.x, y: t.y }, fn: () => {}, endFn: (x2, m) => fieldOne(o, x2, c, ent, m) }); const ent = c.pe[c.pe.length - 1]; fieldTick(o, x, c, { tg: o.area ? null : t, pos: { x: t.x, y: t.y } }); /* 나타날 때 한 번 · 그 뒤는 그 생물의 차례 끝 (SRD) */ }; break;
      case 'summon': S.when = seen; S.run = (c, x) => { if ((c.pe || []).some(e => e.sum === o.en)) return false; H.persist(c, 'gen', H.R6(o.T), { sum: o.en, conc: !!o.conc, slot: x.slot, fn: x2 => { const t = H.nearest(x2, c, 8); if (t) { G.Foe.dtype = o.dt; const d = upS(o, x2, o.dice), plus = /plus your spellcasting ability modifier/i.test(o.srd?.text || '') ? H.pmod(c) : 0; H.strike(x2, c, t, [d[0], d[1], (d[2] || 0) + plus]); G.Foe.dtype = null; } } }); const e0 = c.pe[c.pe.length - 1]; if (/When the (?:sword|hand|blade) appears|you can make a melee spell attack/i.test(o.srd?.text || '')) e0.fn(x); }; break; /* 나타날 때 바로 한 번 (SRD) */
      case 'clean': S.when = (c, x) => H.alive(x).some(p => p.cond && Object.keys(p.cond).length); S.run = (c, x) => { const p = H.alive(x).find(q => q.cond && Object.keys(q.cond).length); if (!p) return false; p.cond = {}; H.ring(x, p, 0.9, '#9fe79f'); }; break;
      case 'stab': S.when = (c, x) => H.alive2(x).length > 0; S.run = (c, x) => { const p = H.alive2(x)[0]; p.dying = null; }; break;
      case 'blink': S.when = (c, x) => c.hp < c.max * 0.4 && H.near(x, c, 1.5).length > 0; S.run = (c, x) => { G.Foe.shove(x.rt, c, H.nearest(x, c, 1.5), o.cells || 6); }; break;
      // 권능어 (SRD 2024): 죽음 — 체력 100 이하 즉사, 넘으면 12d12 정신 · 기절 — 150 이하 기절 (처음 내성 없음, 차례 끝마다 건강 재내성), 넘으면 다음 차례 시작까지 속도 0
      case 'pw': S.when = (c, x) => (o.kill ? x.seen.length > 0 : x.seen.some(t => t.hp <= o.lim * (t.scale || 1))); S.run = (c, x) => { const low = x.seen.filter(q => q.hp <= o.lim * (q.scale || 1)).sort((p, q) => q.hp - p.hp)[0], t = low || (o.kill ? H.strong(x) : null); if (!t) return false; if (o.kill) { if (low) F().hurt(x.f, x.rt, t, t.hp * 9, 'smite', c); else { G.Foe.dtype = 'psychic'; F().hurt(x.f, x.rt, t, H.roll([12, 12, 0]), 'smite', c); G.Foe.dtype = null; } } else { hit(x, c, t, o.cond, 100); (t.rep = t.rep || []).push({ k: o.cond, ab: 'con', dc: DN.dc(c) }); } }; break;
      case 'rider': S.rider = (c, x, t) => { G.Foe.dtype = o.dt; F().hurt(x.f, x.rt, t, H.dmg(x, c, upS(o, x, o.dice)), 'smite', c); G.Foe.dtype = null; if (t.hp > 0 && o.cond) hit(x, c, t, o.cond, o.condT || 1); }; S.bonus = true; break;
      case 'react': S.react = true; S.when = () => false; S.run = () => false; break;
      case 'custom': { const C = CUSTOM[o.en]; if (!C) return null; Object.assign(S, C(o, S)); break; }
      default: return null;
    }
    return S;
  }
  // ── 원문의 고유 규칙 (틀에 끼울 수 없는 주문). 숫자 · 표는 SRD 5.2.1 원문 그대로 ──
  const ALL = rt => rt.mons.filter(o => o.hp > 0).concat(rt.party.filter(p => !p.dead));
  const banishTy = t => ['celestial', 'elemental', 'fey', 'fiend'].includes(t.ty);
  const gone = (x, c, t) => { if (t.kind === 'mon') { t.hp = 0; F().kill(x.f, x.rt, t, 'smite', c); } else { t.hp = 0; t.dead = true; G.Story.die(x.f, x.rt, t); } }; // 다른 세계로 · 죽음
  const CUSTOM = {
    // 화염 방패 (SRD): 따뜻한 방패(냉기 저항) · 차가운 방패(화염 저항) 중 하나. 곁 5피트에서 근접으로 맞힌 생물은 2d8 화염 · 냉기 (G.Fantasy.hurtMember)
    'Fire Shield': () => ({ when: (c, x) => H.W.fight(c, x) && !DN.bon(c, 'fireShield'), run(c, x) { const fireFoe = x.seen.some(o => (o.stat?.melee || []).concat(o.stat?.alt || []).some(a => a.t === 'fire' || a.ex?.t === 'fire')), warm = !fireFoe; DN.buff(c, 'fireShield', H.R6(100), warm ? { res_cold: 1, shieldT: 'fire' } : { res_fire: 1, shieldT: 'cold' }); H.ring(x, c, 1, warm ? '#ff9a5a' : '#9fd8ff'); } }),
    // 성스러운 오라 (SRD): 30피트 안 고른 생물 — 모든 내성에 이점 · 그를 노리는 공격에 불리. 악마 · 언데드가 근접으로 맞히면 건강 내성, 실패면 실명
    'Holy Aura': () => ({ conc: true, when: H.W.fight, run(c, x) { for (const q of H.alive(x).filter(q => Math.hypot(q.x - c.x, q.y - c.y) <= 6.5)) G.Res.concOn(c, q, 'holyAura', H.R6(10), { hitDis: 1, saveAdv: 1, holyBy: 1 }); H.ring(x, c, 2, '#fff3c4'); } }),
    // 투명화 (SRD): 투명 — 공격하거나 피해를 주거나 주문을 쓰면 끝 (1시간 · 집중) · 상위 투명화는 끝나지 않는다 (1분 · 집중)
    'Invisibility': () => ({ conc: true, when: (c, x) => H.W.fight(c, x) && H.alive(x).some(q => !DN.invis(q)), run(c, x) { const q = H.alive(x).filter(q => !DN.invis(q)).sort((p, r) => (r.merc && DN.rng(r) < 2 ? 1 : 0) - (p.merc && DN.rng(p) < 2 ? 1 : 0))[0]; if (!q) return false; G.Res.concOn(c, q, 'invis2', H.R6(600), {}); } }),
    'Greater Invisibility': () => ({ conc: true, when: (c, x) => H.W.fight(c, x) && H.alive(x).some(q => !DN.invis(q)), run(c, x) { const q = H.alive(x).filter(q => !DN.invis(q)).sort((p, r) => F().allyAtk(x.f, r) - F().allyAtk(x.f, p))[0]; if (!q) return false; G.Res.concOn(c, q, 'invisC', H.R6(10), {}); } }),
    // 유도 분신 (SRD): 시전자는 투명 (공격 · 주문으로 끝나지 않는다, 1시간 · 집중)
    'Mislead': () => ({ conc: true, when: (c, x) => H.W.fight(c, x) && !DN.invis(c), run(c) { G.Res.concOn(c, c, 'invisC', H.R6(600), {}); } }),
    // 거울상 (SRD): 분신 셋 — 맞을 때마다 남은 분신마다 d6, 하나라도 3 이상이면 분신이 대신 맞고 사라진다 (1분)
    'Mirror Image': () => ({ when: (c, x) => H.W.fight(c, x) && !(c.images > 0), run(c) { c.images = 3; c.imagesT = G.S.runTime + H.R6(10); } }),
    // 충직한 사냥개 (SRD): 사냥개 곁 5피트 안의 적 하나 — 주인의 차례 시작마다 민첩 내성, 실패 4d8 역장 (8시간)
    'Faithful Hound': o => ({ when: H.W.seen, run(c, x) { if ((c.pe || []).some(e => e.sum === o.en)) return false; const t = H.pick(x); if (!t) return false; const spot = { x: t.x, y: t.y }; H.persist(c, 'gen', H.R6(4800), { sum: o.en, fn: x2 => { const e = x2.rt.mons.filter(m => m.hp > 0 && Math.hypot(m.x - spot.x, m.y - spot.y) <= 1.6)[0]; if (!e) return; G.Foe.dtype = 'force'; H.saveHit(x2, c, e, 'dex', [4, 8, 0], false); G.Foe.dtype = null; } }); } }),
    // 살을 돌로 (SRD): 건강 내성 실패 → 속박. 차례 끝마다 다시 — 성공 셋이면 끝, 실패 셋이면 석화 (구조물은 자동 성공)
    'Flesh to Stone': o => ({ conc: true, when: H.W.seen, run(c, x) { const t = H.strong(x); if (!t) return false; if (t.ty === 'construct' || DN.save(t, 'con', DN.dc(c))) return; DN.give(x.rt, t, 'restrained', H.R6(10), c); t.indigo = { ok: 0, no: 0, dc: DN.dc(c) }; if (c.concK) (c.concK.conds = c.concK.conds || []).push([t, 'restrained']); } }),
    // 전염병 (SRD): 건강 내성 실패 → 11d8 사령 · 중독 (7일). 차례 끝마다 다시 — 성공 셋이면 끝, 실패 셋이면 그대로
    'Contagion': o => ({ when: H.W.seen, run(c, x) { const t = H.near(x, c, 1.6)[0]; if (!t) return false; if (DN.save(t, 'con', DN.dc(c))) return; G.Foe.dtype = 'necrotic'; F().hurt(x.f, x.rt, t, H.roll([11, 8, 0]), 'smite', c); G.Foe.dtype = null; if (t.hp > 0) { DN.give(x.rt, t, 'poisoned', H.R6(100800), c); t.rep3 = { k: 'poisoned', ab: 'con', dc: DN.dc(c), ok: 0, no: 0 }; } } }),
    // 기괴한 환영 (SRD): 고른 생물, 지혜 내성 — 실패 10d10 정신 · 공포, 성공 절반. 공포 상태는 차례 끝마다 다시: 실패 5d10, 성공이면 끝
    'Weird': o => ({ conc: true, when: H.W.seen, run(c, x) { const q = areaCast(o, x, c); if (!q) return false; G.Foe.dtype = 'psychic'; for (const t of q.list.filter(t => x.rt.mons.includes(t))) { const ok = H.saveHit(x, c, t, 'wis', [10, 10, 0], true); if (!ok && t.hp > 0) { DN.give(x.rt, t, 'frightened', H.R6(10), c); t.weird = { dc: DN.dc(c), by: c }; if (c.concK) (c.concK.conds = c.concK.conds || []).push([t, 'frightened']); } } G.Foe.dtype = null; } }),
    // 기억 조작 (SRD): 지혜 내성 (싸우는 중이면 이점) — 실패 매혹 · 행동 불능. 피해를 받으면 끝
    'Modify Memory': o => ({ conc: true, when: H.W.seen, run(c, x) { const t = H.strong(x); if (!t) return false; if (DN.save(t, 'wis', DN.dc(c)) || DN.save(t, 'wis', DN.dc(c))) return; for (const k of ['charmed', 'incapacitated']) { DN.give(x.rt, t, k, H.R6(10), c); if (c.concK) (c.concK.conds = c.concK.conds || []).push([t, k]); } t.endOnDmg = ['charmed', 'incapacitated']; } }),
    // 아이바이트 (SRD): 1분 · 집중. 차례마다 60피트 안의 하나 — 지혜 내성 실패면 잠 (의식 없음, 피해를 받으면 깬다) · 잠이 안 들면 공포
    'Eyebite': o => ({ conc: true, when: H.W.seen, run(c, x) { const saved = new Set(), r = G.SRD_RANGE.cells(60); const one = x2 => { const t = x2.rt.mons.filter(m => m.hp > 0 && !saved.has(m) && !G.Dnd.has(m, 'unconscious') && Math.hypot(m.x - c.x, m.y - c.y) <= r && F().sees(x2.rt.map, c, m)).sort((p, q) => q.hp - p.hp)[0]; if (!t) return false; if (DN.save(t, 'wis', DN.dc(c))) { saved.add(t); return true; } const sleep = !(t.stat?.cimm || []).includes('unconscious') && t.ty !== 'undead' && t.ty !== 'construct'; const k = sleep ? 'unconscious' : 'frightened'; DN.give(x2.rt, t, k, H.R6(10), c); if (sleep) t.endOnDmg = ['unconscious']; if (c.concK) (c.concK.conds = c.concK.conds || []).push([t, k]); return true; }; if (!one(x)) return false; H.persist(c, 'gen', H.R6(10), { conc: true, fn: x2 => one(x2) }); } }),
    // 식물 성장 (SRD 무성함): 100피트 구, 그 안에서는 1피트에 4피트 이동 (8시간)
    'Plant Growth': o => ({ when: H.W.seen, run(c, x) { const t = H.pick(x); if (!t) return false; G.Terrain.add(x.rt, { x: t.x, y: t.y, at: { x: t.x, y: t.y }, r: 20, until: G.S.runTime + H.R6(4800), cost: 4 }); } }),
    // 차원 이동 (SRD 2024): 자원한 생물만 데려간다 — 전투에서 적을 보내지 않는다 (전투 밖 귀환은 G.Util)
    'Plane Shift': () => ({ noCombat: true, when: () => false, run: () => false }),
    // 신성한 말: 30피트 안 고른 생물 매력 내성. 실패하면 지금 체력에 따라 (Divine Word Effects 표). 천상체 · 원소 · 요정 · 악마는 원래 세계로
    'Divine Word': () => ({ bonus: true, when: (c, x) => x.seen.some(t => t.hp <= 50 || banishTy(t)), run(c, x) {
      const list = x.rt.mons.filter(t => t.hp > 0 && Math.hypot(t.x - c.x, t.y - c.y) <= 6.5 && F().sees(x.rt.map, c, t)); if (!list.length) return false;
      for (const t of list) { if (DN.save(t, 'cha', DN.dc(c))) continue; if (banishTy(t)) { gone(x, c, t); continue; } const hp = t.hp;
        if (hp <= 20) gone(x, c, t); else if (hp <= 30) { for (const k of ['blinded', 'deafened', 'stunned']) DN.give(x.rt, t, k, H.R6(600), c); } else if (hp <= 40) { for (const k of ['blinded', 'deafened']) DN.give(x.rt, t, k, H.R6(100), c); } else if (hp <= 50) DN.give(x.rt, t, 'deafened', H.R6(10), c); }
    } }),
    // 혼란: 반경 10피트(슬롯당 +5피트) 구, 지혜 내성. 실패하면 보너스 행동 · 반응 없이 차례마다 1d10 (G.Foe.confused), 차례 끝에 다시 내성
    'Confusion': o => ({ conc: true, when: H.W.seen, run(c, x) { const q = areaCast(o, x, c); if (!q) return false; for (const t of q.list) { if (DN.save(t, 'wis', DN.dc(c))) continue; G.Res.concOn(c, t, 'confusion', H.R6(10), {}); t.confDC = DN.dc(c); t.noReact = true; } } }),
    // 혼미: 지능 내성, 실패 10d12 정신 + 주문 · 마법 행동을 못 한다 (30일), 성공 절반
    'Befuddlement': () => ({ when: H.W.seen, run(c, x) { const t = H.strong(x); if (!t) return false; G.Foe.dtype = 'psychic'; const ok = H.saveHit(x, c, t, 'int', [10, 12], true); G.Foe.dtype = null; if (!ok && t.hp > 0) t.noSpell = true; } }),
    // 분광 분사: 시전자에서 60피트 원뿔, 대상마다 민첩 내성과 1d8 광선 (Prismatic Rays 표)
    'Prismatic Spray': o => ({ when: H.W.seen, run(c, x) {
      const q = areaCast(o, x, c); if (!q) return false; const dc = DN.dc(c), DTY = [null, 'fire', 'acid', 'lightning', 'poison', 'cold'];
      const ray = (t, n, ok) => {
        if (n <= 5) { const v = DN.dice(12, 6) * (ok ? 0.5 : 1); G.Foe.dtype = DTY[n]; if (t.kind === 'mon') F().hurt(x.f, x.rt, t, v * H.G0(x, c), 'smite', c); else G.Foe.blast(x.f, x.rt, { atk: 1 }, t, v, null, 0, DTY[n]); G.Foe.dtype = null; return; }
        if (ok) return;
        if (n === 6) { DN.give(x.rt, t, 'restrained', 1e6, c); t.indigo = { ok: 0, no: 0, dc }; } // 남색: 속박 · 차례 끝 건강 내성 셋이면 풀림 · 실패 셋이면 석화 (G.Foe.turnEnd)
        else if (n === 7) { DN.give(x.rt, t, 'blinded', 1e6, c); t.violet = { dc, by: c }; } // 보라: 실명 · 시전자의 다음 차례 시작에 지혜 내성 — 실패하면 다른 세계로 (G.Foe.startTurn)
      };
      for (const t of q.list) { const ok = DN.save(t, 'dex', dc); let n = DN.dice(1, 8); if (n === 8) { let a, b; do a = DN.dice(1, 8); while (a === 8); do b = DN.dice(1, 8); while (b === 8); ray(t, a, ok); ray(t, b, ok); } else ray(t, n, ok); }
    } }),
    // 분광 벽: 벽의 일곱 층(통과)은 이 게임의 전투에 없다 — 벽이 나타날 때의 섬광만: 20피트 안 건강 내성, 실패하면 실명 1분 (SRD)
    'Prismatic Wall': () => ({ when: H.W.seen, run(c, x) { /* 10분 (SRD) */ const list = x.rt.mons.filter(t => t.hp > 0 && Math.hypot(t.x - c.x, t.y - c.y) <= 4.5 && F().sees(x.rt.map, c, t)); if (!list.length) return false; for (const t of list) if (!DN.save(t, 'con', DN.dc(c))) DN.give(x.rt, t, 'blinded', H.R6(100), c); } }),
    // 복수의 폭풍: 반경 300피트 구름 아래 모두 (아군도). 시전: 건강 내성 실패 2d6 천둥 · 귀먹음. 이후 시전자 차례마다 2: 산성 4d6 · 3: 번개 여섯 10d6 민첩 절반 · 4: 우박 2d6 · 5~10: 냉기 1d6
    'Storm of Vengeance': () => ({ conc: true, when: (c, x) => { const all = ALL(x.rt).filter(o => Math.hypot(o.x - c.x, o.y - c.y) <= 60); return all.filter(o => o.kind === 'mon').length > 2 * all.filter(o => o.kind !== 'mon').length; }, run(c, x) {
      const under = () => ALL(x.rt).filter(o => Math.hypot(o.x - c.x, o.y - c.y) <= 60), hitAll = (n, d, t) => { G.Foe.dtype = t; H.AREA.save(x, c, under(), null, [n, d], false); G.Foe.dtype = null; };
      G.Foe.dtype = 'thunder'; H.AREA.save(x, c, under(), 'con', [2, 6], false, o => DN.give(x.rt, o, 'deafened', H.R6(10), c)); G.Foe.dtype = null;
      H.persist(c, 'gen', H.R6(10), { conc: true, n: 1, fn: (x2, e) => { e.n++; if (e.n === 2) hitAll(4, 6, 'acid'); else if (e.n === 3) { G.Foe.dtype = 'lightning'; H.AREA.save(x2, c, x2.rt.mons.filter(o => o.hp > 0 && Math.hypot(o.x - c.x, o.y - c.y) <= 60).slice(0, 6), 'dex', [10, 6], true); G.Foe.dtype = null; } else if (e.n === 4) hitAll(2, 6, 'bludgeoning'); else if (e.n <= 10) { hitAll(1, 6, 'cold'); if (e.n === 5) G.Terrain.add(x2.rt, { at: c, r: 60, until: G.S.runTime + H.R6(6), by: c, conc: true }); } } }); /* 5~10: 어려운 지형 */
    } }),
  };
  // ── 소환 (SRD 5.2.1 원문): 실제 생물(G.Sum) · 영혼 (이어지는 효과) ──
  const best = (x, c, types) => { const s = x.seen.filter(o => o.hp > 0); return types.slice().sort((a, b) => s.reduce((v, o) => v + G.Foe.typeK(o, b, c), 0) - s.reduce((v, o) => v + G.Foe.typeK(o, a, c), 0))[0]; }; // 적에게 가장 잘 드는 종류
  const mine = (x, c, src) => G.Sum.alive(x.rt).some(s => s.by === c && s.src === src);
  const spirit = (x, c, near) => { const p = near || H.pick(x); if (!p) return null; for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = Math.round(p.x) + dx, Y = Math.round(p.y) + dy; if (GR.pass(x.rt.map, X, Y) && !x.rt.mons.some(o => o.hp > 0 && Math.round(o.x) === X && Math.round(o.y) === Y)) return { x: X, y: Y }; } return { x: p.x, y: p.y }; };
  const ring = (x, p, r, col) => H.ring(x, p, r, col);
  Object.assign(CUSTOM, {
    // 비행 (3레벨): 동료 하나(슬롯 하나 위마다 하나 더)에게 비행 60피트 · 공중 정지 · 10분 집중. 깊은 물 · 어려운 지형이 곁에 있을 때
    'Fly': () => ({ conc: true, when: (c, x) => { const m = x.rt.map; for (let y = Math.round(c.y) - 6; y <= Math.round(c.y) + 6; y++) for (let X = Math.round(c.x) - 6; X <= Math.round(c.x) + 6; X++) { const ch = G.Grid.at(m, X, y); if (ch === '~' || ch === ',' || G.Terrain.diffAt(x.rt, c, X, y)) return H.W.fight(c, x); } return false; }, run(c, x) { const n = 1 + Math.max(0, (x.slot || 3) - 3), list = H.alive(x).filter(p => !G.Terrain.fly(p) && Math.hypot(p.x - c.x, p.y - c.y) <= 1.5 + 1).slice(0, n); if (!list.length) return false; for (const p of list) { G.Res.concOn(c, p, 'flySp', H.R6(100), {}); G.Res.concOn(c, p, 'hoverSp', H.R6(100), {}); } } }),
    // 사자 되살리기: 시전 시간 1분 — 싸움 중에는 쓰지 않고 싸운 뒤 (G.Sum.afterFight)
    'Animate Dead': () => ({ when: () => false, run: () => false }),
    // 거대 곤충 (4레벨 드루이드): 거미 · 능력치표는 주문 레벨로 · 10분 집중
    'Giant Insect': () => ({ conc: true, when: H.W.fight, run(c, x) { if (mine(x, c, 'Giant Insect')) return false; if (!G.Sum.spawn(x.f, x.rt, G.Sum.spell(x.f, x.rt, c, 'insect', x.slot || 4), { by: c, conc: true, rounds: 100, src: 'Giant Insect', near: H.pick(x) || c, n: '거대 거미' })) return false; } }),
    // 용 소환 (5레벨): 용의 영혼 · 공유 저항 (고른 종류에 시전자도 저항)
    'Summon Dragon': () => ({ conc: true, when: H.W.fight, run(c, x) { if (mine(x, c, 'Summon Dragon')) return false; const t = best(x, c, ['acid', 'cold', 'fire', 'lightning', 'poison']); if (!G.Sum.spawn(x.f, x.rt, G.Sum.spell(x.f, x.rt, c, 'dragon', x.slot || 5, { t }), { by: c, conc: true, rounds: 10 * 60, src: 'Summon Dragon', near: H.pick(x) || c, n: '용의 영혼' })) return false; G.Res.concOn(c, c, 'dragonRes', H.R6(600), { ['res_' + t]: 1 }); } }),
    // 사물 움직이기 (5레벨): 주문 능력 수정치만큼 중형 사물 · 1분 집중
    'Animate Objects': () => ({ conc: true, when: H.W.pack(2), run(c, x) { if (mine(x, c, 'Animate Objects')) return false; const n = Math.max(1, DN.mod(DN.ab(c.merc)[c.castAb || DN.cls(c.merc).dc])), B = G.Sum.spell(x.f, x.rt, c, 'object', x.slot || 5); let k = 0; for (let i = 0; i < n; i++) if (G.Sum.spawn(x.f, x.rt, { ...B }, { by: c, conc: true, rounds: 10, src: 'Animate Objects', near: c, n: '움직이는 사물' })) k++; if (!k) return false; } }),
    // 원소 소환 (5레벨): 대형 · 만질 수 없는 영혼. 그 곁 5피트에서 차례를 시작하는 적: 민첩 내성 실패 8d8 + 속박 (한 번에 하나). 속박된 적은 차례 시작에 다시: 실패 4d8 · 성공 풀림
    'Conjure Elemental': () => ({ conc: true, when: H.W.fight, run(c, x) {
      const p = spirit(x, c); if (!p) return false; const t = best(x, c, ['lightning', 'thunder', 'fire', 'cold']), up = Math.max(0, (x.slot || 5) - 5), dc = DN.dc(c); ring(x, p, 1, '#9fd8ff');
      H.persist(c, 'gen', H.R6(100), { conc: true, pos: p, held: null, startFn: (x2, o) => { const e = (c.pe || []).find(q => q.pos === p); if (!e || o.kind !== 'mon' || o.hp <= 0) return; G.Foe.dtype = t;
        if (e.held === o) { if (DN.save(o, 'dex', dc)) { delete o.cond.restrained; e.held = null; } else F().hurt(x2.f, x2.rt, o, DN.dice(4 + up, 8), 'smite', c); }
        else if (!e.held && Math.hypot(o.x - p.x, o.y - p.y) <= 1.6 && !DN.save(o, 'dex', dc)) { F().hurt(x2.f, x2.rt, o, DN.dice(8 + up, 8), 'smite', c); if (o.hp > 0) { DN.give(x2.rt, o, 'restrained', H.R6(100), c); e.held = o; } }
        G.Foe.dtype = null; }, fn: () => {} });
    } }),
    // 요정 소환 (6레벨): 영혼이 나타나 곁 5피트의 적에게 근접 주문 공격 3d12 + 주문 능력 정신 · 맞으면 다음 차례 시작까지 공포. 이후 차례마다 (추가 행동) 30피트 순간 이동해 다시
    'Conjure Fey': () => ({ conc: true, when: H.W.seen, run(c, x) {
      const up = Math.max(0, (x.slot || 6) - 6), mod = DN.mod(DN.ab(c.merc)[c.castAb || DN.cls(c.merc).dc]);
      const hitOne = (x2, tg) => { if (!tg || tg.hp <= 0) return; const r = DN.attack(c, tg); if (!r.hit) return DN.miss(x2.rt, tg); G.Foe.dtype = 'psychic'; F().hurt(x2.f, x2.rt, tg, DN.dice((3 + up) * (r.crit ? 2 : 1), 12) + mod, r.crit ? 'crit' : 'smite', c); G.Foe.dtype = null; if (tg.hp > 0) DN.give(x2.rt, tg, 'frightened', G.Res_ROUND, c); };
      const tg = H.pick(x); if (!tg) return false; const e = { pos: spirit(x, c, tg) }; ring(x, e.pos, 0.8, '#e08aff'); hitOne(x, tg);
      H.persist(c, 'gen', H.R6(100), { conc: true, pos: e.pos, fn: (x2, q) => { const t2 = x2.rt.mons.filter(o => o.hp > 0 && o.aggro && Math.hypot(o.x - q.pos.x, o.y - q.pos.y) <= 7).sort((a, b) => a.hp - b.hp)[0]; if (!t2) return; q.pos = spirit(x2, c, t2); ring(x2, q.pos, 0.8, '#e08aff'); hitOne(x2, t2); } });
    } }),
    // 하급 원소 소환 (4레벨): 15피트 발산 · 그 안의 생물을 맞히면 +2d8 (산성 · 냉기 · 화염 · 번개 중) · 적에게 어려운 지형
    'Conjure Minor Elementals': () => ({ conc: true, when: H.W.fight, run(c, x) { if (DN.bon(c, 'minorEl')) return false; G.Res.concOn(c, c, 'minorEl', H.R6(100), { minorD: 2 + Math.max(0, (x.slot || 4) - 4) }); G.Terrain.add(x.rt, { at: c, r: 3, foe: true, until: G.S.runTime + H.R6(100), by: c, conc: true }); ring(x, c, 3, '#ffb070'); } }), // 적에게 어려운 지형
    // 숲의 존재 소환 (4레벨): 10피트 발산 · 그 안에서 차례를 마치는 적: 지혜 내성 5d8 역장 · 절반 (차례에 한 번) · 추가 행동으로 물러나기
    'Conjure Woodland Beings': () => ({ conc: true, when: H.W.fight, run(c, x) {
      const up = Math.max(0, (x.slot || 4) - 4), hit = (x2, o) => { if (o.kind !== 'mon' || o.hp <= 0 || o.woodN === G.Turn.no() || Math.hypot(o.x - c.x, o.y - c.y) > 2.5) return; o.woodN = G.Turn.no(); G.Foe.dtype = 'force'; H.saveHit(x2, c, o, 'wis', [5 + up, 8], true); G.Foe.dtype = null; };
      for (const o of x.rt.mons) hit(x, o); ring(x, c, 2, '#7fcf8a');
      H.persist(c, 'gen', H.R6(100), { conc: true, endFn: hit, fn: () => { c.fleetN = G.Turn.no(); } });
    } }),
    // 천상체 소환 (7레벨): 반경 10피트 원기둥의 빛 · 아군은 4d12 + 주문 능력 회복, 적은 민첩 내성 6d12 광휘 · 절반. 그 안에서 차례를 마치면 다시 (차례에 한 번) · 시전자 차례마다 30피트 옮긴다
    'Conjure Celestial': () => ({ conc: true, when: H.W.fight, run(c, x) {
      const up = Math.max(0, (x.slot || 7) - 7), mod = DN.mod(DN.ab(c.merc)[c.castAb || DN.cls(c.merc).dc]), A = { shape: 'cylinder', ft: 10 };
      const light = (x2, o, at) => { if (o.celN === G.Turn.no() || Math.hypot(o.x - at.x, o.y - at.y) > 2.5) return; o.celN = G.Turn.no(); if (o.kind === 'mon') { G.Foe.dtype = 'radiant'; H.saveHit(x2, c, o, 'dex', [6 + up, 12], true); G.Foe.dtype = null; } else if (!o.dead && o.merc) H.heal(x2, c, o, [4 + up, 12, mod]); };
      const at = H.AREA.aim(x, c, A, 0, x.reach ?? 99, true); if (!at) return false; const e = { pos: { x: at.x, y: at.y } }; ring(x, e.pos, 2, '#fff3c4');
      for (const o of H.AREA.hits(x, c, A, e.pos)) light(x, o, e.pos);
      H.persist(c, 'gen', H.R6(100), { conc: true, pos: e.pos, endFn: (x2, o) => light(x2, o, e.pos), fn: (x2) => { const t = H.AREA.aim({ ...x2, seen: x2.rt.mons.filter(o => o.hp > 0 && Math.hypot(o.x - e.pos.x, o.y - e.pos.y) <= 6) }, c, A, 0, 99, true); if (t) { e.pos.x = t.x; e.pos.y = t.y; ring(x2, e.pos, 2, '#fff3c4'); for (const o of H.AREA.hits(x2, c, A, e.pos)) light(x2, o, e.pos); } } });
    } }),
  });
  const byEn = {}; for (const k in D.MSKILLS) byEn[D.MSKILLS[k].en?.replace('’', "'")] = k;
  let added = 0;
  for (const id in G.SRD_SP) {
    const o = G.SRD_SP[id]; o.upR = G.SRD_UP?.[id]; const cl = o.cls.map(c => CLS[c]).filter(Boolean), old = byEn[o.en];
    const lvMap = {}; for (const c of cl) lvMap[c] = lvAt(c, o.lv);
    if (old) { // 이미 손으로 짠 주문: 그 직업들의 풀에 넣는다
      const S = D.MSKILLS[old], prev = typeof S.lv === 'object' ? S.lv : Object.fromEntries(Object.keys(D.MPOOL).filter(c => D.MPOOL[c].includes(old)).map(c => [c, S.lv || 1]));
      S.lv = { ...lvMap, ...prev };
      for (const c of cl) if (!D.MPOOL[c].includes(old)) D.MPOOL[c].push(old);
      continue;
    }
    if (o.k === 'util' || !o.k) continue;
    const S = build(o); if (!S) continue;
    const k = 'sp_' + id.replace(/-/g, '_');
    SK[k] = S; D.MSKILLS[k] = { n: o.ko, en: o.en, t: 'fx_zap', d: descOf(o), lv: lvMap, sch: o.sch, dt: o.dt };
    D.SK_RANGE[k] = o.rng || o.area || 1.5; // 자기 주변 · 자신
    for (const c of cl) D.MPOOL[c].push(k);
    added++;
  }
  G.SPELLS_ADDED = added;
})();
