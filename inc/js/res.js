'use strict';
// 자원 (DESIGN.md 90): 기술마다 전투당 횟수 하나로 단순화. 슬롯 표는 주문 위력(몇 레벨로 쓰나)에만 쓴다. 집중 유지 · 종족도 여기
G.Res = (() => {
  const U = G.U, DN = () => G.Dnd;
  // 레벨별 슬롯 [1~9레벨]
  const FULL = [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];
  const HALF = [[2],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]];
  const PACT = lv => { const n = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1, s = lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : lv >= 3 ? 2 : 1, a = Array(s).fill(0); a[s - 1] = n; return a; };
  const KIND = { cleric: FULL, bard: FULL, scout: FULL, mage: FULL, archmage: FULL, paladin: HALF, archer: HALF };
  const AFTER_FIGHT = 0.25;
  const table = m => (m.cls === 'warlock' ? PACT(m.lv) : (KIND[m.cls] || [])[m.lv - 1] || []);
  const R = {
    rageDmg: lv => (lv >= 16 ? 4 : lv >= 9 ? 3 : 2),
    // 지금 자원. 없으면 긴 휴식 상태로 만든다
    of(m) { if (!m.rs || m.rs.lv !== m.lv) R.long(m); return m.rs; },
    long(m) { m.rs = { lv: m.lv, fu: {}, sp: {} }; }, // fu: 전투에 쓰는 것은 전부 전투당 (DESIGN.md 97). sp: 전투 밖 탐험 칸만 (좋은 열매 · 치유의 기도)
    maxSlot: m => table(m).length || Math.max(1, Math.ceil(m.lv / 5)),
    cost: (m, res) => (!res ? 0 : res.slot || (res.rage ? 1 : res.focus || (res.long ? 3 : 2))),
    // 전투당 횟수: 가벼운 기술 3 · 보통 2 · 큰 기술 1. 11레벨부터 +1. 주문 회상의 은혜 +1
    usesOf(m, res, k) { if (!res) return 99; { const q = k && G.SrdX?.uses(m, k); if (q != null) return q; } const c = R.cost(m, res), G0 = G.Guild.skill; return (c <= 1 ? 3 : c === 2 ? 2 : 1) + (m.lv >= 11 ? 1 : 0) + (DN().boon(m, 'recall') ? 1 : 0) + (k === 'sr_smite' && m.cls === 'paladin' ? 1 : 0) + (k === 'sr_rage' && G0(m, 'ft_persist') ? 1 : 0) + (k === 'sr_insp' && G0(m, 'ft_superinsp') ? 1 : 0) + (k === 'sr_wild' ? (G0(m, 'ft_resurge') ? 1 : 0) + (G0(m, 'ft_archdruid') ? 1 : 0) : 0); },
    fightStart(list) { for (const p of list) if (p.merc) { R.of(p.merc).fu = {}; if (G.Guild.skill(p.merc, 'ft_metabolism') && p.hp < p.max) p.hp = Math.min(p.max, p.hp + (p.merc.lv + DN().dice(1, DN().weapon(p).d)) * p.max / Math.max(1, DN().srdHP(p.merc))); } },
    castLevel: (m, res) => Math.max(res.slot, R.maxSlot(m)), // 주문은 자동으로 가장 높은 레벨로
    can(m, k, res) { return !res || ((R.of(m).fu[k] || 0) < R.usesOf(m, res, k)); },
    // 자동으로 터지는 것 (종족 · 물건 · 기능): 전투당 n번까지, 쓰면 true
    once(m, k, n = 1) { const f = R.of(m).fu; if ((f[k] || 0) >= n) return false; f[k] = (f[k] || 0) + 1; return true; },
    pay(m, k, res) { if (!res) return 0; const s = R.of(m); s.fu[k] = (s.fu[k] || 0) + 1; return res.slot ? R.castLevel(m, res) : 0; },
    // 싸운 뒤: 체력 일부 (AFTER_FIGHT). 집중은 끝나고 횟수는 다시 찬다
    afterFight(rt) {
      for (const p of rt.party) { if (p.dead || !p.merc) continue; const m = p.merc, k = p.max / Math.max(1, DN().srdHP(m)); R.endConc(p); R.of(m).fu = {};
        p.hp = Math.min(p.max, p.hp + p.max * AFTER_FIGHT * (G.Trinket.has(m, 'hdX2') ? 2 : 1));
        for (const q of G.Trinket.props(m, 'regenRest')) p.hp = Math.min(p.max, p.hp + DN().dice(q[1], 6) * k); }
    G.Pool.afterFight(rt); },
    // 야영 (층 사이): 전부 회복
    longRest(list) { for (const m of list) if (m) R.long(m); },
    // ── 집중 (SRD): 한 번에 하나. 새로 걸면 앞의 것이 끝나고, 맞으면 건강 내성 DC max(10, 피해 ÷ 2) ──
    conc(c, k) { R.endConc(c); c.concK = { k, on: [] }; },
    concOn(c, p, k, t, props) { DN().buff(p, k, t, props); if (c.concK) c.concK.on.push([p, k]); },
    endConc(c) { const q = c.concK; if (!q) return; for (const [p, k] of q.on) if (p.bf) delete p.bf[k]; c.pe = (c.pe || []).filter(e => !e.conc); c.concK = null; c.extConc = false; },
    concHit(rt, p, dmg) { if (!p.concK || p.dead || (p.concK.k === 'sr_hmark' && G.Fantasy.sk(p, 'ft_rhunter'))) return; const raw = dmg * Math.max(1, DN().srdHP(p.merc)) / (p.max || 1); const dc = Math.max(10, Math.round(raw / 2)), adv = p.extConc || G.Opt.has(p, 'iv_mind'); if (!DN().save(p, 'con', dc) && !(adv && DN().save(p, 'con', dc))) { R.endConc(p); G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.1, s: '집중 끊김', col: '#c9a6ff', t: 0.8, sz: 0.75 }); } },
    // 종족 (SRD 5.2.1)
    SPECIES: {
      ...Object.fromEntries(Object.keys(G.SRD.SPECIES).map(k => [k, { n: G.SRD.SPECIES[k].n, d: G.SRD.SPECIES[k].traits.map(q => q[0]).join(' · ') }])),
    },
    species(m) { if (!m) return null; if (!m.sp) { const K = Object.keys(R.SPECIES); m.sp = K[((m.uid || 0) * 7 + (m.name ? m.name.charCodeAt(0) : 0)) % K.length]; } return m.sp; },
    // 몸에 맞는 피해 (피해 종류 저항 · 격노 · 골리앗)
    takenK(p, t) { const m = p.merc; if (!m || !t) return 1; if (G.Trinket.props(m, 'immT').some(q => q[1] === t)) return 0; const sp = R.species(m), phys = t === 'slashing' || t === 'piercing' || t === 'bludgeoning'; let k = 1; if (DN().bsum(p, 'res_' + t) > 0) k *= 0.5; if (t !== 'force' && DN().bon(p, 'sdef')) k *= 0.5; if (DN().boon(m, 'night') && t !== 'psychic' && t !== 'radiant') k *= 0.5; if (G.Trinket.props(m, 'res').some(q => q[1] === t)) k *= 0.5;  if (G.Fantasy.sk(p, 'sr_affinity') && t === 'fire') k *= 0.5; if (G.SrdX?.resists(m).includes(t)) k *= 0.5; if (DN().bon(p, 'rage') && (t === 'slashing' || t === 'piercing' || t === 'bludgeoning')) k *= 0.5; return k; },
    // 쓰러지기 직전 (오크 불굴)
    onDown(rt, p) { const m = p.merc; if (DN().bsum(p, 'deathWard') > 0) { if (p.bf) delete p.bf['sp_Death Ward']; p.hp = 1; return true; } const pr = rt.party?.find(q => !q.dead && q.merc && G.Opt.has(q, 'iv_protect') && !R.of(q.merc).fu.iv_protect); if (pr) { R.once(pr.merc, 'iv_protect'); p.hp = 1; G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.2, s: '수호자의 선물', col: '#b98aff', t: 1, sz: 0.85 }); return true; } if (R.species(m) !== 'orc') return false; if (!R.once(m, 'orc')) return false; p.hp = 1; G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.2, s: '오크의 불굴', col: '#ffb060', t: 1, sz: 0.85 }); return true; },
    // 골리앗 돌의 인내
    stone(rt, p, dmg) { const m = p.merc; if (R.species(m) !== 'goliath' || (G.SRD.line(m, 'goliath'), m.line) !== 'stone') return dmg; if (!R.once(m, 'stone', R.usesOf(m, { short: 1 }))) return dmg; const k = p.max / Math.max(1, DN().srdHP(m)); G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.2, s: '돌의 인내', col: '#c9c2b2', t: 0.8, sz: 0.75 }); return Math.max(0, dmg - (1 + U.rand(12) + DN().mod(DN().ab(m).con)) * k); },
    // 내성 재굴림
    saveAdv(tg, k) { const sp = R.species(tg.merc); return sp === 'gnome' && (k === 'int' || k === 'wis' || k === 'cha'); },
    saveRetry(tg) { const m = tg.merc; if (R.species(m) !== 'human') return false; return R.once(m, 'human'); },
  };
  return R;
})();
// 사람별 기록 (상태창): 이번 전투에 준 피해와 처치. 전투가 끝나면 최근 다섯 전투의 피해 비중으로 남는다
(() => {
  const F = G.Fantasy, h0 = F.hurt, a0 = G.Res.afterFight, FORM_N = 5;
  F.hurt = function (f, rt, m, dmg, src, from) { const was = m.hp, r = h0.apply(this, arguments); if (from?.merc && m.kind === 'mon' && was > m.hp) { from.merc._fd = (from.merc._fd || 0) + (was - Math.max(0, m.hp)); if (m.hp <= 0) from.merc.kills = (from.merc.kills || 0) + 1; } return r; };
  G.Res.afterFight = function (rt) { const ms = rt.party.filter(p => p.merc).map(p => p.merc), tot = ms.reduce((a, m) => a + (m._fd || 0), 0); if (tot > 0) for (const m of ms) { m.form = (m.form || []).concat((m._fd || 0) / tot).slice(-FORM_N); m.fights = (m.fights || 0) + 1; m._fd = 0; } return a0.apply(this, arguments); };
})();
