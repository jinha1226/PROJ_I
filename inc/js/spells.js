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
  const PROP = { hit: v => `명중 +${v}`, ac: v => `AC +${v}`, save: v => `내성 +${v}`, dmgB: v => `피해 +${v}`, adv: () => '공격 이점', hitDis: () => '나를 노리는 공격 불리', taken: v => `받는 피해 ×${v}`, moveK: v => `이동 +${Math.round(v * 100)}%`, thp: v => `임시 체력 ${diceTxt(v)}`, extraAtk: v => `공격 +${v}`, deathWard: () => '쓰러질 때 한 번 버팀', imm: k => `${COND_N[k] || k} 면역` };
  const propsTxt = p => Object.keys(p).filter(k => k !== 'self').map(k => (k.startsWith('res_') ? `${DT(k.slice(4))} 저항` : PROP[k] ? PROP[k](p[k]) : '')).filter(Boolean).join(' · ');
  function descOf(o) {
    const area = o.area ? `반경 ${o.area}칸 ` : '', sv = o.save ? `${AB(o.save)} 내성${o.half ? ' 절반' : ''}` : '', dice = `${diceTxt(o.dice)} ${DT(o.dt)}`.trim(), T = n => `${n}라운드`;
    switch (o.k) {
      case 'atk': return `명중 ${dice}${o.cond ? ` · ${COND_N[o.cond]}` : ''}${o.noHeal ? ' · 치유 불가' : ''}${o.noReact ? ' · 반응 불가' : ''}${o.dot ? ` · 다음 차례 ${diceTxt(o.dot)}` : ''}`;
      case 'save': return `${area}${dice} · ${sv}${o.cond ? ` · ${COND_N[o.cond]}` : ''}`;
      case 'heal': return `${o.n > 1 ? `파티 ${o.n}명 ` : ''}${diceTxt(o.heal)}${o.heal[0] ? ' + 능력치' : ''} 회복${o.clean ? ' · 상태이상 해제' : ''}`;
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
  const scale = (o, x, c) => (o.cantrip || o.cantripDice ? H.tierS(c, o.dice) : H.lvUp(x, o.dice, o.up || 0));
  const hit = (x, c, t, kind, n) => {
    if (kind === 'push') return H.push(x, c, t, 2);
    if (kind === 'slow') { t.shock = Math.max(t.shock || 0, 60); return; }
    if (kind === 'stunned' || kind === 'paralyzed') return DN.give(x.rt, t, 'restrained', H.R6(0)), kind === 'stunned' ? (t.stun = Math.max(t.stun || 0, n * 6)) : (t.stop = Math.max(t.stop || 0, n * 6));
    if (kind === 'charmed') { t.stop = Math.max(t.stop || 0, n * 6); return; }
    DN.give(x.rt, t, kind, H.R6(n), c);
  };
  const targets = (o, x, c) => { if (!o.rng) return H.near(x, c, o.area || 2); const t = H.pick(x); if (!t) return []; if (o.area) return H.near(x, t, o.area); if (o.n > 1) return x.seen.slice(0, o.n); if (o.k === 'cond' && G.Skill.twin) { const t2 = x.seen.find(q => q !== t); if (t2) { G.Skill.twinUsed = true; return [t, t2]; } } return [t]; };
  const fieldTick = (o, x, c, e) => {
    const at = o.follow ? c : (e.tg && e.tg.hp > 0 ? e.tg : e.pos); if (!at) return;
    if (!e.pos) e.pos = { x: at.x, y: at.y };
    const list = o.area ? H.near(x, o.follow ? c : e.pos, o.area) : e.tg && e.tg.hp > 0 ? [e.tg] : [];
    G.Foe.dtype = o.dt;
    for (const t of list) { const s = H.lvUp(x, o.dice, o.up || 0); if (o.save) { const ok = H.saveHit(x, c, t, o.save, s, o.half); if (!ok && o.cond) hit(x, c, t, o.cond, o.condT || 1); } else F().hurt(x.f, x.rt, t, H.dmg(x, c, s), 'dot', c); }
    G.Foe.dtype = null;
  };
  function build(o) {
    const S = { base: o.lv, bonus: o.ct === 'b', conc: !!o.conc, dt: o.dt, T: o.T, save: o.save, res: o.lv ? { slot: o.lv } : undefined };
    const seen = H.W.seen, want = (o.area || 0) >= 2 ? H.W.pack(2) : seen;
    switch (o.k) {
      case 'atk': S.when = seen; S.run = (c, x) => {
        const t = H.pick(x); if (!t) return false;
        const r = H.strike(x, c, t, scale(o, x, c));
        if (!r.hit || t.hp <= 0) return;
        if (o.cond) hit(x, c, t, o.cond, o.condT || 1);
        if (o.noHeal) t.noHeal = true;
        if (o.noReact) t.noReact = true;
        if (o.dot) F().inflict(x.f, x.rt, t, 'burn', H.R6(1), c, (o.dot[0] * (o.dot[1] + 1) / 2) * H.G0(x, c) / G.Res_ROUND, true);
        if (o.splash) { G.Foe.dtype = o.splash[2]; for (const q of H.near(x, t, o.splash[4])) H.saveHit(x, c, q, o.splash[3], o.splash, false); G.Foe.dtype = o.dt; }
      }; break;
      case 'save': S.when = want; S.run = (c, x) => { const list = targets(o, x, c); if (!list.length) return false; const s = scale(o, x, c); for (const t of list) { const ok = H.saveHit(x, c, t, o.save, s, !!o.half); if (!ok && t.hp > 0 && o.cond) hit(x, c, t, o.cond, o.condT || 1); } }; break;
      case 'heal': S.heal = true; S.when = H.W.low(0.6); S.run = (c, x) => {
        const list = H.alive(x).filter(p => !p.noHeal && p.hp < p.max * (o.n > 1 ? 0.8 : 0.6)).sort((p, q) => p.hp / p.max - q.hp / q.max).slice(0, o.n || 1); if (!list.length) return false;
        for (const p of list) { H.heal(x, c, p, [o.heal[0], o.heal[1], o.heal[2] || (o.heal[0] ? H.pmod(c) : 0)]); if (o.clean) p.cond = {}; }
      }; break;
      case 'cond': S.when = (c, x) => want(c, x) && (!o.only || x.seen.some(t => (o.only === 'beast' ? t.ty === 'beast' : DN.humanoid(t)))); S.run = (c, x) => {
        let list = targets(o, x, c); if (o.only) list = list.filter(t => (o.only === 'beast' ? t.ty === 'beast' : DN.humanoid(t))); if (!list.length) return false;
        for (const t of list) { if (o.save && DN.save(t, o.save, DN.dc(c))) continue; hit(x, c, t, o.cond, o.T); }
      }; break;
      case 'buff': { const p = o.props || {}, key = 'sp_' + o.en; S.when = (c, x) => H.W.fight(c, x) && (p.self ? !DN.bon(c, key) : H.alive(x).some(q => !DN.bon(q, key))); S.run = (c, x) => {
        const list = p.self ? [c] : H.alive(x).filter(q => !DN.bon(q, key)).sort((a, b) => a.hp / a.max - b.hp / b.max).slice(0, o.n || 1); if (!list.length) return false;
        const props = {}; for (const k in p) if (k !== 'self' && k !== 'thp' && k !== 'imm') props[k] = p[k]; if (p.imm) props['imm_' + p.imm] = 1;
        for (const q of list) { if (p.thp) q.thp = Math.max(q.thp || 0, (DN.dice(p.thp[0], p.thp[1]) + p.thp[2]) * (q.merc ? q.max / Math.max(1, DN.srdHP(q.merc)) : 1)); if (o.conc) G.Res.concOn(c, q, key, H.R6(o.T), props); else DN.buff(q, key, H.R6(o.T), props); H.ring(x, q, 0.9, '#8fd8ff'); }
      }; break; }
      case 'field': S.when = want; S.run = (c, x) => { const t = o.follow ? c : H.pick(x); if (!t) return false; H.persist(c, 'gen', H.R6(o.T), { conc: !!o.conc, slot: x.slot, tg: o.area ? null : t, pos: { x: t.x, y: t.y }, fn: (x2, e) => fieldTick(o, x2, c, e) }); fieldTick(o, x, c, { tg: o.area ? null : t, pos: { x: t.x, y: t.y } }); }; break;
      case 'summon': S.when = seen; S.run = (c, x) => { if ((c.pe || []).some(e => e.sum === o.en)) return false; H.persist(c, 'gen', H.R6(o.T), { sum: o.en, conc: !!o.conc, slot: x.slot, fn: x2 => { const t = H.nearest(x2, c, 8); if (t) { G.Foe.dtype = o.dt; H.strike(x2, c, t, H.lvUp(x2, o.dice, o.up || 0)); G.Foe.dtype = null; } } }); }; break;
      case 'clean': S.when = (c, x) => H.alive(x).some(p => p.cond && Object.keys(p.cond).length); S.run = (c, x) => { const p = H.alive(x).find(q => q.cond && Object.keys(q.cond).length); if (!p) return false; p.cond = {}; H.ring(x, p, 0.9, '#9fe79f'); }; break;
      case 'stab': S.when = (c, x) => H.alive2(x).length > 0; S.run = (c, x) => { const p = H.alive2(x)[0]; p.dying = null; }; break;
      case 'blink': S.when = (c, x) => c.hp < c.max * 0.4 && H.near(x, c, 1.5).length > 0; S.run = (c, x) => { G.Foe.shove(x.rt, c, H.nearest(x, c, 1.5), o.cells || 6); }; break;
      case 'pw': S.when = (c, x) => x.seen.some(t => t.hp <= o.lim * (t.scale || 1)); S.run = (c, x) => { const t = x.seen.filter(q => q.hp <= o.lim * (q.scale || 1)).sort((p, q) => q.hp - p.hp)[0]; if (!t) return false; if (o.kill) F().hurt(x.f, x.rt, t, t.hp * 9, 'smite', c); else if (!o.save || !DN.save(t, o.save, DN.dc(c))) hit(x, c, t, o.cond, o.T); }; break;
      case 'rider': S.rider = (c, x, t) => { G.Foe.dtype = o.dt; F().hurt(x.f, x.rt, t, H.dmg(x, c, H.lvUp(x, o.dice, o.up || 0)), 'smite', c); G.Foe.dtype = null; if (t.hp > 0 && o.cond) hit(x, c, t, o.cond, o.condT || 1); }; S.bonus = true; break;
      case 'react': S.react = true; S.when = () => false; S.run = () => false; break;
      default: return null;
    }
    return S;
  }
  const byEn = {}; for (const k in D.MSKILLS) byEn[D.MSKILLS[k].en?.replace('’', "'")] = k;
  let added = 0;
  for (const id in G.SRD_SP) {
    const o = G.SRD_SP[id], cl = o.cls.map(c => CLS[c]).filter(Boolean), old = byEn[o.en];
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
