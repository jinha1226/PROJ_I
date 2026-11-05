'use strict';
// SRD 5.2.1 종족 특성 · 무기 숙련 · 재주의 전투 동작 (DESIGN.md 107). 표는 G.SRD
G.SrdX = (() => {
  const D = G.D, SK = G.Skill.SK, H = G.Skill.H, DN = G.Dnd, SR = G.SRD, R6 = H.R6, sp = m => G.Res.species(m), prof = c => DN.prof(c.merc.lv), onceBy = (c, k, n) => G.Res.once(c.merc, k, n);
  const add = (k, n, en, t, d, S) => { SK[k] = S; D.MSKILLS[k] = { n, en, t, d, lv: 1 }; D.SK_RANGE[k] = S.rng ?? 0; };
  const LONG = { long: 1 };
  add('sx_orc', '아드레날린', 'Adrenaline Rush', 'st_haste', '추가 행동 질주 · 임시 체력 = 숙련 보너스', { res: LONG, bonus: true, when: H.W.fight, run(c) { DN.buff(c, 'dash', R6(1), { moveK: 1 }); c.thp = Math.max(c.thp || 0, prof(c)); } });
  add('sx_large', '거대화', 'Large Form', 'b_fury', '추가 행동 · 이동 +2칸 · 근력 판정 이점', { res: LONG, bonus: true, when: (c, x) => c.merc.lv >= 5 && H.W.fight(c, x) && !DN.bon(c, 'large'), run(c) { DN.buff(c, 'large', R6(100), { moveK: 1 / 3 }); } });
  add('sx_fly', '드래곤의 비행', 'Draconic Flight', 'st_haste', '추가 행동 · 비행 (지형 비용 없음)', { res: LONG, bonus: true, when: (c, x) => c.merc.lv >= 5 && H.W.fight(c, x) && !DN.bon(c, 'fly'), run(c) { DN.buff(c, 'fly', R6(100), { fly: 1 }); } });
  add('sx_cloud', '구름 걸음', "Cloud's Jaunt", 'st_haste', '추가 행동 · 6칸 순간 이동', { res: LONG, bonus: true, when: (c, x) => !!H.nearest(x, c, 1.8) && DN.rng(c) >= 2, run(c, x) { let best = null, bd = -1; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, tx = Math.round(c.x + Math.cos(a) * 6), ty = Math.round(c.y + Math.sin(a) * 6); if (!G.Grid?.pass?.(x.rt.map, tx, ty)) continue; const near0 = Math.min(...x.rt.mons.filter(o => o.hp > 0).map(o => Math.hypot(o.x - tx, o.y - ty))); if (near0 > bd) { bd = near0; best = [tx, ty]; } } if (best) { c.x = best[0]; c.y = best[1]; } } });
  // 몽크 무술: 추가 행동 맨손 타격 한 번 (SRD Martial Arts) · 탁월한 방어: 집중 3
  add('sx_ma', '무술', 'Martial Arts', 'st_haste', '추가 행동: 무술 주사위 타격', { bonus: true, free: true, when: H.W.close(1.8), run(c, x) { const o = H.nearest(x, c, 1.8), w = DN.weapon(c); H.strike(x, c, o, [w.n, w.d, w.b], 'hit'); } });
  SK.ft_sdefense = { res: { focus: 3 }, free: true, when: (c, x) => H.W.fight(c, x) && !DN.bon(c, 'sdef'), run(c) { DN.buff(c, 'sdef', R6(10), { sdef: 1 }); } }; if (D.MSKILLS.ft_sdefense) D.MSKILLS.ft_sdefense.passive = false; D.SK_RANGE.ft_sdefense = 0;
  // 계통 주문: 슬롯 없이 전투당 한 번 · 소마법은 제한 없음
  const spellKey = id => 'sx_s_' + id.replace(/-/g, '_');
  const ids = new Set(); for (const q of Object.values(SR.SPECIES)) for (const L of Object.values(q.line || {})) { if (L.cantrip) ids.add(L.cantrip); for (const id of Object.values(L.sp || {})) ids.add(id); }
  for (const id of ids) { const base = SK['sp_' + id.replace(/-/g, '_')], M = D.MSKILLS['sp_' + id.replace(/-/g, '_')]; if (!base?.run || !M) continue; const k = spellKey(id), lv0 = G.SRD_SP[id].lv === 0; SK[k] = { ...base, res: lv0 ? null : LONG, spell: id }; D.MSKILLS[k] = { ...M, lv: 1 }; D.SK_RANGE[k] = D.SK_RANGE['sp_' + id.replace(/-/g, '_')]; }
  const enMap = {}; for (const k in D.MSKILLS) if (SK[k]?.run && D.MSKILLS[k].en) enMap[D.MSKILLS[k].en] = enMap[D.MSKILLS[k].en] || k;
  const byEn = en => enMap[en] || null, lvMap = {}; for (const id in G.SRD_SP) lvMap[G.SRD_SP[id].en] = G.SRD_SP[id].lv;
  const lvlOf = k => lvMap[D.MSKILLS[k]?.en];
  const X = {
    // 종족이 주는 스킬 (4칸 밖)
    skills(m) { const s = sp(m), L = SR.line(m, s), out = []; if (s === 'dragonborn') out.push('sr_breath', 'sx_fly'); if (s === 'orc') out.push('sx_orc'); if (s === 'goliath') { out.push('sx_large'); if (m.line === 'cloud') out.push('sx_cloud'); } if (L?.cantrip && SK[spellKey(L.cantrip)]) out.push(spellKey(L.cantrip)); for (const lv in L?.sp || {}) if (m.lv >= +lv && SK[spellKey(L.sp[lv])]) out.push(spellKey(L.sp[lv])); return out.filter(k => k !== 'sx_fly' && k !== 'sx_large' || m.lv >= 5).concat(X.classSkills(m)); },
    // 직업 · 하위 직업이 항상 주는 주문 (4칸 밖)
    classSkills(m) { const out = []; if (m.cls === 'archer') out.push('sr_hmark'); if (m.cls === 'paladin' && m.lv >= 2) out.push('sr_smite'); if (m.cls === 'monk') out.push('sx_ma'); if (DN.profs(m).includes('medicine')) out.push('x_med'); if (m.adv === 'draconic' && m.lv >= 14) out.push('sx_fly'); if (m.cls === 'bard' && m.lv >= 20) out.push('sp_power_word_heal', 'sp_power_word_kill'); for (const en of SR.subSpells(m)) { const k = byEn(en); if (k) out.push(k); } if (m.adv === 'lore' && m.lv >= 6) out.push(...X.discover(m)); return out.filter(k => SK[k]); },
    discover(m) { const P = ['sr_hword', 'sr_bless', 'sr_entangle', 'sr_mm', 'sr_fireball', 'sr_shield'].filter(k => SK[k]); const h = m.uid || 0; return [P[h % P.length], P[(h + 2) % P.length]]; },
    // 조상 · 계통의 저항
    resists(m) { const s = sp(m), L = SR.line(m, s), o = L?.dt ? [L.dt] : s === 'dwarf' ? ['poison'] : []; if (G.Guild.skill(m, 'sr_ward')) o.push(SR.landRes(m)); if (G.Guild.skill(m, 'sr_fres')) o.push(SR.fiendRes(m)); return o; },
    // 횟수 (SRD): 숙련 보너스만큼 · 계통 주문 1번
    uses(m, k) { if (m.cls === 'archer' && k === 'sr_hmark') return m.lv >= 17 ? 6 : m.lv >= 13 ? 5 : m.lv >= 9 ? 4 : m.lv >= 5 ? 3 : 2; if (m.cls === 'archmage' && m.lv >= 18 && X.mastered(m).includes(k)) return 99; if (m.cls === 'archmage' && m.lv >= 20 && X.signature(m).includes(k)) return G.Res.cost(m, G.Skill.resOf(k)) <= 1 ? 4 : G.Res.cost(m, G.Skill.resOf(k)) === 2 ? 3 : 2; if (k === 'sr_breath' || k === 'sx_orc' || k === 'sx_cloud') return DN.prof(m.lv); if (k === 'sx_large' || k === 'sx_fly' || k.startsWith('sx_s_')) return 1; return null; },
    // 조건 내성 이점 (종족): 실패하면 한 번 더. 엘프는 수면 면역
    condBlock(e, k, from) { const m = e.merc; if (!m) return false; const s = sp(m); if (s === 'elf' && (k === 'asleep' || k === 'sleep')) return true; if (G.Guild.skill(m, 'sr_selfrest') && (k === 'charmed' || k === 'frightened' || k === 'poisoned')) return true; if (G.Guild.skill(m, 'sr_ward') && k === 'poisoned') return true; const ab = { charmed: s === 'elf' && 'wis', poisoned: s === 'dwarf' && 'con', frightened: s === 'halfling' && 'wis' }[k]; return !!ab && !!from && DN.save(e, ab, DN.dc(from)); },
    // 명중 뒤: 무기 숙련 · 골리앗 조상
    onHit(f, rt, a, tg) {
      const m = a.merc; if (!m) return; const x = { f, rt, seen: rt.mons };
      if (sp(m) === 'goliath' && tg.hp > 0 && !DN.cantrip(m) && onceBy(a, 'giant', DN.prof(m.lv))) { if (m.line === 'fire') { G.Foe.dtype = 'fire'; G.Fantasy.hurt(f, rt, tg, DN.dice(1, 10) * H.G0(x, a), 'hit', a); G.Foe.dtype = null; } else if (m.line === 'frost') { G.Foe.dtype = 'cold'; G.Fantasy.hurt(f, rt, tg, DN.dice(1, 6) * H.G0(x, a), 'hit', a); G.Foe.dtype = null; tg.shock = Math.max(tg.shock || 0, 6); } else if (m.line === 'hill' && !DN.has(tg, 'prone')) DN.give(rt, tg, 'prone', R6(1), a); else G.Res.of(m).fu.giant--; }
      if (X.grappler(m) && SR.weaponOf(m).hidden && tg.hp > 0 && !a.masUsed && !DN.has(tg, 'grappled')) { a.masUsed = true; if (H.cond(x, a, tg, 'str', 'grappled', 1)) tg.grabby = a; }
      let k = SR.masteryOf(m); if (!k || tg.hp <= 0) return; const w = DN.weapon(a); if (k === 'sap' && G.Guild.skill(m, 'ft_tmaster') && DN.has(tg, 'sapped')) k = 'slow'; // 전술의 대가
      if (k === 'cleave' && !a.masUsed) { const o = rt.mons.find(q => q !== tg && q.hp > 0 && Math.hypot(q.x - a.x, q.y - a.y) <= 1.8); if (o) { a.masUsed = true; H.strike(x, a, o, [w.n, w.d], 'hit'); } }
      if (k === 'nick' && !a.masUsed) { a.masUsed = true; H.strike(x, a, tg, [w.n, w.d], 'hit'); }
      if (k === 'push') H.push(x, a, tg, 2);
      if (k === 'sap') DN.give(rt, tg, 'sapped', R6(1), a);
      if (k === 'slow') tg.shock = Math.max(tg.shock || 0, 6);
      if (k === 'vex') DN.buff(a, 'vex', R6(1), { adv: 1 });
      if (k === 'topple' && !DN.has(tg, 'prone')) H.cond(x, a, tg, 'con', 'prone', 1);
    },
    onMiss(f, rt, a, tg) { const m = a.merc; if (m && SR.masteryOf(m) === 'graze') { const w = DN.weapon(a); G.Fantasy.hurt(f, rt, tg, Math.max(1, w.b) * H.G0({ f, rt }, a), 'hit', a); } },
    // 위저드 18레벨 주문 숙달: 고른 스킬 중 1 · 2레벨 주문 하나씩은 제한 없이
    mastered(m) { const out = []; for (const lv of [1, 2]) { const k = G.Guild.picks(m).find(q => lvlOf(q) === lv); if (k) out.push(k); } return out; },
    // 위저드 20레벨 대표 주문: 3레벨 주문 둘 +1번
    signature: m => G.Guild.picks(m).filter(q => lvlOf(q) === 3).slice(0, 2),
    // 몽크 붙잡기: 일반 재주 (4레벨, 근력 또는 민첩 13)
    grappler: m => m.cls === 'monk' && m.lv >= 4 && (m.uid || 0) % 3 === 0,
  };
  // SRD 직업 표: 하프 캐스터도 1레벨부터 1레벨 슬롯
  for (const [k, c] of [['sr_smite', 'paladin'], ['sp_searing_smite', 'paladin'], ['sr_cure', 'archer']]) { const M = D.MSKILLS[k]; if (!M) continue; if (typeof M.lv === 'object') M.lv[c] = 1; else M.lv = 1; }
  // 근접 무기 숙련은 스킬 칸이 아니라 든 무기로 (Weapon Mastery)
  const WM = new Set(['wm_slow', 'wm_graze', 'wm_vex', 'wm_nick', 'sr_cleave', 'sr_topple', 'sr_push', 'sr_sap']);
  for (const c of Object.keys(D.MPOOL)) D.MPOOL[c] = D.MPOOL[c].filter(k => !WM.has(k)); for (const c of Object.keys(G.Pool.POOL)) G.Pool.POOL[c] = G.Pool.POOL[c].filter(k => !WM.has(k));
  const adv0 = DN.adv; DN.adv = function (att, tg) { const v = adv0.apply(this, arguments); return att?.merc && tg?.grabby === att && X.grappler(att.merc) ? (typeof v === 'number' ? Math.min(1, v + 1) : v) : v; };
  return X;
})();
