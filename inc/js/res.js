'use strict';
// 자원 (DESIGN.md 112): SRD 표대로 슬롯 · 횟수를 쓰고 휴식에 되찾는다. 층을 내려가면 긴 휴식, 층마다 짧은 휴식 한 번. 집중 유지 · 종족도 여기
G.Res = (() => {
  const U = G.U, DN = () => G.Dnd;
  // 레벨별 슬롯 [1~9레벨]
  const FULL = [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];
  const HALF = [[2],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]];
  const PACT = lv => { const n = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1, s = lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : lv >= 3 ? 2 : 1, a = Array(s).fill(0); a[s - 1] = n; return a; };
  const KIND = { cleric: FULL, bard: FULL, scout: FULL, mage: FULL, archmage: FULL, paladin: HALF, archer: HALF };
  const table = m => (m.cls === 'warlock' ? PACT(m.lv) : (KIND[m.cls] || [])[m.lv - 1] || []);
  const R = {
    rageDmg: lv => (lv >= 16 ? 4 : lv >= 9 ? 3 : 2),
    // 지금 자원. 없으면 긴 휴식 상태로 만든다
    of(m) { if (!m.rs || m.rs.lv !== m.lv) R.long(m); return m.rs; },
    long(m) { m.rs = { lv: m.lv, fu: {}, sp: {}, sl: [], fp: 0 }; }, // fu: 기술별 쓴 횟수 · sl: 레벨별 쓴 슬롯 · fp: 쓴 집중/마력 · sp: 좋은 열매 · 치유의 기도
    table,
    // 집중(몽크) · 마력(소서러) 점수: 직업 레벨 (2레벨부터)
    pool: m => ((m.cls === 'monk' || m.cls === 'mage') && m.lv >= 2 ? m.lv : 0),
    rages: m => (m.lv >= 17 ? 6 : m.lv >= 12 ? 5 : m.lv >= 6 ? 4 : m.lv >= 3 ? 3 : 2),
    maxSlot: m => table(m).length || Math.max(1, Math.ceil(m.lv / 5)),
    cost: (m, res) => (!res ? 0 : res.slot || (res.rage ? 1 : res.focus || (res.long ? 3 : 2))), // 기술 고르는 순서에만
    // 쓸 수 있는 슬롯 레벨: base 이상에서 남은 가장 낮은 것 (워락은 계약 슬롯 · 6레벨 이상은 신비 비전 긴 휴식에 1번)
    slotAt(m, base) { const T = table(m), sl = R.of(m).sl; for (let i = base - 1; i < T.length; i++) if ((T[i] || 0) - (sl[i] || 0) > 0) return i + 1; return 0; },
    // 최대 횟수 (SRD 표)
    usesOf(m, res, k) { if (!res) return 99; { const q = k && G.SrdX?.uses(m, k); if (q != null) return q; } const G0 = G.Guild.skill; let n; if (res.slot) { const T = table(m); if (m.cls === 'warlock' && res.slot > 5) n = 1; else n = T.slice(res.slot - 1).reduce((a, b) => a + (b || 0), 0); } else if (res.rage) n = R.rages(m); else if (res.focus) n = Math.floor(R.pool(m) / res.focus); else { const v = res.short ?? res.long; n = typeof v === 'function' ? v(m) : v || 1; } return n + (DN().boon(m, 'recall') && res.slot ? 1 : 0) + (k === 'sr_smite' && m.cls === 'paladin' ? 1 : 0) + (k === 'sr_rage' && G0(m, 'ft_persist') ? 1 : 0) + (k === 'sr_insp' && G0(m, 'ft_superinsp') ? 1 : 0) + (k === 'sr_wild' ? (G0(m, 'ft_resurge') ? 1 : 0) + (G0(m, 'ft_archdruid') ? 1 : 0) : 0); },
    // 남은 횟수
    left(m, res, k) { if (!res) return 99; const s = R.of(m); if (res.slot && !(k && G.SrdX?.uses(m, k) != null)) { if (m.cls === 'warlock' && res.slot > 5) return 1 - (s.fu[k] || 0); const T = table(m); return T.slice(res.slot - 1).reduce((a, b, i) => a + (b || 0) - (s.sl[i + res.slot - 1] || 0), 0) + (k === 'sr_smite' && m.cls === 'paladin' ? 1 - (s.fu.freeSmite || 0) : 0); } if (res.focus) return Math.floor((R.pool(m) - s.fp) / res.focus); return R.usesOf(m, res, k) - (s.fu[k] || 0); },
    fightStart(list) { for (const p of list) if (p.merc) { R.of(p.merc); if (G.Guild.skill(p.merc, 'ft_metabolism') && p.hp < p.max && R.once(p.merc, 'ft_metabolism')) p.hp = Math.min(p.max, p.hp + (p.merc.lv + DN().dice(1, DN().weapon(p).d)) * p.max / Math.max(1, DN().srdHP(p.merc))); } },
    castLevel(m, res) { if (m.cls === 'warlock' && res.slot > 5) return res.slot; return R.slotAt(m, res.slot) || res.slot; }, // 남은 슬롯 중 가장 낮은 것
    can(m, k, res) { return !res || R.left(m, res, k) > 0; },
    // 자동으로 터지는 것 (종족 · 물건 · 기능): 휴식까지 n번, 쓰면 true
    once(m, k, n = 1) { const f = R.of(m).fu; if ((f[k] || 0) >= n) return false; f[k] = (f[k] || 0) + 1; return true; },
    pay(m, k, res) { if (!res) return 0; const s = R.of(m); if (res.slot && !(G.SrdX?.uses(m, k) != null)) { if (m.cls === 'warlock' && res.slot > 5) { s.fu[k] = (s.fu[k] || 0) + 1; return res.slot; } const L = R.slotAt(m, res.slot); if (L) { s.sl[L - 1] = (s.sl[L - 1] || 0) + 1; return L; } if (k === 'sr_smite' && m.cls === 'paladin') { s.fu.freeSmite = 1; return res.slot; } return res.slot; } if (res.focus) { s.fp += res.focus; return 0; } s.fu[k] = (s.fu[k] || 0) + 1; return res.slot ? res.slot : 0; },
    // 짧은 휴식 (SRD): 히트 다이스 절반만큼 회복 · 짧은 휴식 기능 · 워락 슬롯 · 몽크 집중 · 격노와 재기 1번
    shortRest(rt, list) { for (const p of list) { if (p.dead || !p.merc) continue; const m = p.merc, s = R.of(m), SK = G.Skill.SK, k0 = p.max / Math.max(1, DN().srdHP(m)), hd = DN().cls(m).hd, n = Math.max(1, Math.ceil(m.lv / 2)), con = DN().mod(DN().ab(m).con); let v = 0; for (let i = 0; i < n; i++) v += Math.max(1, DN().dice(1, hd) + con); p.hp = Math.min(p.max, p.hp + v * k0 * (G.Trinket.has(m, 'hdX2') ? 2 : 1)); for (const k of Object.keys(s.fu)) { const q = SK[k]?.res; if (k === 'sr_second' || k === 'sr_rage') { s.fu[k] = Math.max(0, s.fu[k] - 1); continue; } if (q?.short) delete s.fu[k]; } if (m.cls === 'warlock') s.sl = []; if (m.cls === 'monk') s.fp = 0; if (m.cls === 'mage' && m.lv >= 5 && !s.fu.sorcRest) { s.fu.sorcRest = 1; s.fp = Math.max(0, s.fp - Math.floor(m.lv / 2)); } if (m.cls === 'archmage' && !s.fu.arcRec) { s.fu.arcRec = 1; let bud = Math.ceil(m.lv / 2); for (let i = Math.min(5, s.sl.length) - 1; i >= 0; i--) while ((s.sl[i] || 0) > 0 && bud >= i + 1) { s.sl[i]--; bud -= i + 1; } } if (!G.quiet && rt) G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.2, s: '짧은 휴식', col: '#9fe79f', t: 1.2, sz: 0.75 }); } },
    // 층마다 짧은 휴식 한 번: 싸운 뒤 체력이나 슬롯이 넉넉지 않으면
    autoShort(rt) { if (rt.shortDone) return; const list = rt.party.filter(p => p.merc && !p.dead); if (!list.length) return; const hp = list.reduce((a, p) => a + p.hp / p.max, 0) / list.length; if (hp >= 0.6) return; rt.shortDone = true; R.shortRest(rt, list); },
    // 싸운 뒤: 집중은 끝난다. 체력과 횟수는 휴식에만 찬다
    afterFight(rt) {
      for (const p of rt.party) { if (p.dead || !p.merc) continue; const m = p.merc, k = p.max / Math.max(1, DN().srdHP(m)); R.endConc(p);
                for (const q of G.Trinket.props(m, 'regenRest')) p.hp = Math.min(p.max, p.hp + DN().dice(q[1], 6) * k); }
    G.Pool.afterFight(rt); R.autoShort(rt); },
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
