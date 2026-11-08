'use strict';
// 자원 (DESIGN.md 112): SRD 표대로 슬롯 · 횟수를 쓰고 휴식에 되찾는다. 층을 내려가면 긴 휴식, 층마다 짧은 휴식 한 번. 집중 유지 · 종족도 여기
G.Res = (() => {
  const U = G.U, DN = () => G.Dnd;
  // 레벨별 슬롯 [1~9레벨]
  const FULL = [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];
  const HALF = [[2],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]];
  const PACT = lv => { const n = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1, s = lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : lv >= 3 ? 2 : 1, a = Array(s).fill(0); a[s - 1] = n; return a; };
  const KIND = { cleric: FULL, bard: FULL, scout: FULL, mage: FULL, archmage: FULL, paladin: HALF, archer: HALF };
  const table = m => (G.MC?.on(m) ? G.MC.slots(m) : m.cls === 'warlock' ? PACT(m.lv) : (KIND[m.cls] || [])[m.lv - 1] || []); // 다중 직업 시전자 표 (G.MC)
  const R = {
    rageDmg: lv => (lv >= 16 ? 4 : lv >= 9 ? 3 : 2),
    // 지금 자원. 없으면 긴 휴식 상태로 만든다
    of(m) { if (m.__base) m = m.__base; if (!m.rs || m.rs.lv !== m.lv) R.long(m, false); return m.rs; }, // 직업 시점이면 그 사람의 자원 // 처음 · 레벨이 바뀌면 자원표만 새로 (휴식 효과는 없다)
    long(m, rest = true) { const had = rest && !!m.rs; m.rs = { lv: m.lv, fu: {}, sp: {}, sl: [], fp: 0, hd: 0 }; if (had) { if (m.exh) { m.exh--; if (m.exhWhy) for (const k in m.exhWhy) { if (m.exhWhy[k] > 0) { m.exhWhy[k]--; break; } } } if (m.cloakCh != null) m.cloakCh = Math.min(3, m.cloakCh + 1 + U.rand(3)); } }, // 긴 휴식 (SRD): 탈진 1단계 회복 · 투명 망토 새벽 1d3 충전 // hd: 쓴 히트 다이스 (긴 휴식에 모두 돌아온다 — SRD 5.2.1) // fu: 기술별 쓴 횟수 · sl: 레벨별 쓴 슬롯 · fp: 쓴 집중/마력 · sp: 좋은 열매 · 치유의 기도
    table,
    // 집중(몽크) · 마력(소서러) 점수: 직업 레벨 (2레벨부터)
    pool: m => { const b = m.__base || m, v = G.MC?.on(b) ? Math.max(G.MC.lvOf(b, 'monk'), G.MC.lvOf(b, 'mage')) : (b.cls === 'monk' || b.cls === 'mage') ? b.lv : 0; return v >= 2 ? v : 0; }, // 집중 · 마법 지점: 몽크 · 소서러 레벨
    rages: m => (m.lv >= 17 ? 6 : m.lv >= 12 ? 5 : m.lv >= 6 ? 4 : m.lv >= 3 ? 3 : 2),
    maxSlot: m => table(m).length || Math.max(1, Math.ceil(m.lv / 5)),
    // 남은 슬롯의 몫 (시전자가 아니면 1)
    slotFrac(m) { const t = table(m), tot = t.reduce((a, b) => a + b, 0); if (!tot) return 1; const used = (R.of(m).sl || []).reduce((a, b) => a + (b || 0), 0); return Math.max(0, 1 - used / tot); },
    cost: (m, res) => (!res ? 0 : res.slot || (res.rage ? 1 : res.focus || (res.long ? 3 : 2))), // 기술 고르는 순서에만
    // 쓸 수 있는 슬롯 레벨: base 이상에서 남은 가장 낮은 것 (워락은 계약 슬롯 · 6레벨 이상은 신비 비전 긴 휴식에 1번)
    slotAt(m, base) { const T = table(m), sl = R.of(m).sl; for (let i = base - 1; i < T.length; i++) if ((T[i] || 0) - (sl[i] || 0) > 0) return i + 1; return 0; },
    // 최대 횟수 (SRD 표)
    usesOf(m, res, k) { if (!res) return 99; { const q = k && G.SrdX?.uses(m, k); if (q != null) return q; } const G0 = G.Guild.skill; let n; if (res.slot) { const T = table(m); if (m.cls === 'warlock' && res.slot > 5) n = 1; else n = T.slice(res.slot - 1).reduce((a, b) => a + (b || 0), 0); } else if (res.rage) n = R.rages(m); else if (res.focus) n = Math.floor(R.pool(m) / res.focus); else { const v = res.short ?? res.long; n = typeof v === 'function' ? v(m) : v || 1; } return n + (DN().boon(m, 'recall') && res.slot ? 1 : 0) + (res.slot && R.freeOf(m, k) ? 1 : 0) + (k === 'sr_rage' && G0(m, 'ft_persist') ? 1 : 0) + (k === 'sr_insp' && G0(m, 'ft_superinsp') ? 1 : 0) + (k === 'sr_wild' ? (G0(m, 'ft_resurge') ? 1 : 0) + (G0(m, 'ft_archdruid') ? 1 : 0) : 0); },
    // 슬롯 없이 긴 휴식에 한 번: 팔라딘의 신성 강타 · 마법 입문의 1레벨 주문
    freeOf: (m, k) => (k === 'sr_smite' && m.cls === 'paladin') || !!G.SrdX?.miFree(m, k),
    // 남은 횟수
    // 같은 횟수를 나눠 쓰는 기능 (SRD): 신성 변환 · 야생 변신
    SHARE: { sr_preserve: 'sr_turn', ft_abjure: 'sr_sacred', sr_landaid: 'sr_wild', ft_sanctuary: 'sr_wild' },
    sh(k, res) { const t = R.SHARE[k]; return t ? [t, G.Skill.SK[t]?.res || res] : [k, res]; },
    left(m, res, k) { [k, res] = R.sh(k, res); if (!res) return 99; const s = R.of(m); if (res.slot && !(k && G.SrdX?.uses(m, k) != null)) { if (m.cls === 'warlock' && res.slot > 5) return 1 - (s.fu[k] || 0); const T = table(m); return T.slice(res.slot - 1).reduce((a, b, i) => a + (b || 0) - (s.sl[i + res.slot - 1] || 0), 0) + (R.freeOf(m, k) ? 1 - (s.fu['free_' + k] || 0) : 0); } if (res.focus) return Math.floor((R.pool(m) - s.fp) / res.focus); return R.usesOf(G.MC ? G.MC.viewFor(m, k) : m, res, k) - (s.fu[k] || 0); }, /* 횟수는 그 기능의 직업 레벨로 (다중 직업) */
    fightStart(list) { for (const p of list) if (p.merc) { R.of(p.merc); if (G.Guild.skill(p.merc, 'ft_perfect')) { const s = R.of(p.merc); if (R.pool(p.merc) - s.fp <= 3) s.fp = Math.max(0, R.pool(p.merc) - 4); } /* 완벽한 집중 (SRD 몽크 15) */ if (G.Trinket.has(p.merc, 'invisCloak') && !DN().bon(p, 'invisC') && (p.merc.cloakCh ?? 3) > 0) { p.merc.cloakCh = (p.merc.cloakCh ?? 3) - 1; DN().buff(p, 'invisC', G.Res_ROUND * 600, {}); } /* 투명 망토: 충전 하나로 1시간 */ if (G.Guild.skill(p.merc, 'ft_metabolism') && p.hp < p.max && R.once(p.merc, 'ft_metabolism')) p.hp = Math.min(p.max, p.hp + (p.merc.lv + DN().dice(1, DN().weapon(p).d)) * p.max / Math.max(1, DN().srdHP(p.merc))); } },
    castLevel(m, res) { if (m.cls === 'warlock' && res.slot > 5) return res.slot; return R.slotAt(m, res.slot) || res.slot; }, // 남은 슬롯 중 가장 낮은 것
    can(m, k, res) { [k, res] = R.sh(k, res); if (res && R.left(m, res, k) <= 0) { const s = R.of(m); if (k === 'sr_insp' && G.Guild.skill(m, 'ft_fontslot')) { const L = R.slotAt(m, 1); if (L) { s.sl[L - 1] = (s.sl[L - 1] || 0) + 1; s.fu[k] = Math.max(0, (s.fu[k] || 0) - 1); } } /* 영감의 샘 (SRD): 슬롯 하나로 영감 하나 */ if (k === 'ft_innate' && G.Guild.skill(m, 'ft_incarnate') && R.pool(m) - s.fp >= 2) { s.fp += 2; s.fu[k] = Math.max(0, (s.fu[k] || 0) - 1); } /* 마법의 화신 (SRD): 마력 점수 2 */ } return !res || R.left(m, res, k) > 0; },
    // 자동으로 터지는 것 (종족 · 물건 · 기능): 휴식까지 n번, 쓰면 true
    once(m, k, n = 1) { const f = R.of(m).fu; if ((f[k] || 0) >= n) return false; f[k] = (f[k] || 0) + 1; return true; },
    pay(m, k, res) { [k, res] = R.sh(k, res); if (!res) return 0; const s = R.of(m); if (res.slot && !(G.SrdX?.uses(m, k) != null)) { if (m.cls === 'warlock' && res.slot > 5) { s.fu[k] = (s.fu[k] || 0) + 1; return res.slot; } if (R.freeOf(m, k) && !s.fu['free_' + k]) { s.fu['free_' + k] = 1; return res.slot; } const L = R.slotAt(m, res.slot); if (L) { s.sl[L - 1] = (s.sl[L - 1] || 0) + 1; return L; } return res.slot; } if (res.focus) { s.fp += res.focus; return 0; } s.fu[k] = (s.fu[k] || 0) + 1; return res.slot ? res.slot : 0; },
    // 짧은 휴식 (SRD): 남은 히트 다이스를 하나씩 쓴다(주사위 + 건강 수정치, 최소 1). 넘칠 만큼은 쓰지 않는다. 긴 휴식에 모두 돌아온다(R.long)
    hdLeft: m => Math.max(0, m.lv - (R.of(m).hd || 0)),
    shortRest(rt, list) { for (const p of rt.party) if (p.dead && p.stable && !p.dying) { p.dead = false; p.stable = false; p.hp = 1; list = list.includes(p) ? list : list.concat(p); } /* 의식 없이 안정된 사람 (SRD): 1d4시간 — 한 시간 쉬는 동안 체력 1로 깬다 */ for (const p of list) if (p.merc) delete R.of(p.merc).sp.memo; /* 주문 기억 (SRD 위저드 5): 짧은 휴식마다 */ for (const p of list) { if (p.dead || !p.merc) continue; const m = p.merc, s = R.of(m), SK = G.Skill.SK, hd = DN().cls(m).hd, con = DN().mod(DN().ab(m).con), x2 = G.Trinket.has(m, 'hdX2') ? 2 : 1; const dieAt = i => (G.MC?.on(m) ? G.MC.list(m).flatMap(c => Array(c.lv).fill(DN().cls({ cls: c.cls }).hd)).sort((u, v) => v - u)[i] || hd : hd); /* 다중 직업: 직업마다 주사위, 큰 것부터 */ if (p.hp >= 1) while (R.hdLeft(m) > 0 && p.max - p.hp >= Math.max(1, (dieAt(s.hd || 0) + 1) / 2 + con) * x2) { const d = dieAt(s.hd || 0); s.hd = (s.hd || 0) + 1; p.hp = Math.min(p.max, p.hp + Math.max(1, DN().dice(1, d) + con) * x2); } /* 상처 봉합의 부적 (SRD): 히트 다이스 회복 2배 */ for (const k of Object.keys(s.fu)) { const q = SK[k]?.res; if (k === 'sr_second' || k === 'sr_rage') { s.fu[k] = Math.max(0, s.fu[k] - 1); continue; } if (k === 'sr_insp' && m.lv >= 5) { delete s.fu[k]; continue; } /* 영감의 샘 (SRD 바드 5레벨): 짧은 휴식에 모두 */ if (q?.short) delete s.fu[k]; } if (m.cls === 'warlock' && !G.MC?.on(m)) s.sl = []; else if (G.MC?.pact(m)) { const p = G.MC.pact(m); s.sl[p.s - 1] = Math.max(0, (s.sl[p.s - 1] || 0) - p.n); } /* 계약 마법 (SRD): 짧은 휴식에 계약 슬롯만 */ if (G.Guild.skill(m, 'ft_natrec') && !s.fu.natRec) { s.fu.natRec = 1; let bud = Math.ceil(m.lv / 2); for (let i = Math.min(5, s.sl.length) - 1; i >= 0; i--) while ((s.sl[i] || 0) > 0 && bud >= i + 1) { s.sl[i]--; bud -= i + 1; } } /* 자연 회복 (SRD 대지 6): 긴 휴식까지 한 번 */ if (m.cls === 'monk') s.fp = 0; if (m.cls === 'mage' && m.lv >= 5 && !s.fu.sorcRest) { s.fu.sorcRest = 1; s.fp = Math.max(0, s.fp - Math.floor(m.lv / 2)); } if (m.cls === 'archmage' && !s.fu.arcRec) { s.fu.arcRec = 1; let bud = Math.ceil(m.lv / 2); for (let i = Math.min(5, s.sl.length) - 1; i >= 0; i--) while ((s.sl[i] || 0) > 0 && bud >= i + 1) { s.sl[i]--; bud -= i + 1; } } if (!G.quiet && rt) G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.2, s: '짧은 휴식', col: '#9fe79f', t: 1.2, sz: 0.75 }); } },
    // 층마다 짧은 휴식 한 번: 싸운 뒤 체력이나 슬롯이 넉넉지 않으면
    autoShort(rt) { if (rt.shortDone) return; const list = rt.party.filter(p => p.merc && !p.dead); if (!list.length) return; const hp = list.reduce((a, p) => a + p.hp / p.max, 0) / list.length; if (hp >= 0.6 && !rt.party.some(p => p.dead && p.stable)) return; /* 쓰러진 동료가 있으면 쉰다 */ rt.shortDone = true; R.shortRest(rt, list); },
    // 싸운 뒤: 집중은 끝난다. 체력과 횟수는 휴식에만 찬다
    afterFight(rt) {
      for (const p of rt.party) { if (p.dead || !p.merc) continue; const m = p.merc, k = p.max / Math.max(1, DN().srdHP(m)); R.endConc(p);
                for (const q of G.Trinket.props(m, 'regenRest')) p.hp = Math.min(p.max, p.hp + DN().dice(q[1], 6) * k); }
    G.Pool.afterFight(rt); G.Items.pearl?.(rt); G.Sum?.afterFight(rt); for (const p of rt.party) { const m = p.merc; if (!m || p.dead || !G.Guild.skill(m, 'ft_mcunning')) continue; const s = R.of(m), used = (s.sl || []).reduce((a, b) => a + (b || 0), 0); if (used && !s.fu.mcun) { s.fu.mcun = 1; const T = table(m), max = T.reduce((a, b) => a + b, 0), back = m.lv >= 20 ? used : Math.ceil(max / 2); for (let i = 0, n = back; i < s.sl.length && n > 0; i++) while ((s.sl[i] || 0) > 0 && n > 0) { s.sl[i]--; n--; } } } /* 마법의 기지 · 엘드리치 마스터 (SRD 워락 2 · 20): 1분 의식으로 계약 슬롯 절반(20레벨 전부) */ R.autoShort(rt); }, // 힘의 진주
    // 야영 (층 사이): 전부 회복
    longRest(list) { for (const m of list) if (m) { m.feast = 0; if (m.raisePen > 0) m.raisePen--; R.long(m); } G.Util?.feast(list); G.Util?.longRest(); G.ItemX?.longRest(list); }, // 영웅의 연회 · 사자 소생 벌점 (SRD)
    // ── 집중 (SRD): 한 번에 하나. 새로 걸면 앞의 것이 끝나고, 맞으면 건강 내성 DC max(10, 피해 ÷ 2) ──
    conc(c, k) { R.endConc(c); c.concK = { k, on: [] }; },
    concOn(c, p, k, t, props) { DN().buff(p, k, t, props); if (c.concK) c.concK.on.push([p, k]); },
    endConc(c) { const q = c.concK; if (!q) return; if (q.sums && G.RT.fantasy) G.Sum.endConc(G.RT.fantasy, c); /* 집중의 생물도 사라진다 */ if (G.RT.fantasy?.darks) G.RT.fantasy.darks = G.RT.fantasy.darks.filter(d => d.by !== c); /* 어둠 주문도 */ if (G.RT.fantasy?.diffs) G.RT.fantasy.diffs = G.RT.fantasy.diffs.filter(z => !(z.conc && z.by === c)); /* 집중의 어려운 지형도 */ for (const [p, k] of q.on) if (p.bf) delete p.bf[k]; for (const [p, k] of q.conds || []) { if (p.cond) delete p.cond[k]; if (k === 'paralyzed') p.stop = 0; if (k === 'stunned') p.stun = 0; if (p.rep) p.rep = p.rep.filter(r => r.k !== k); } /* 집중으로 건 상태 (SRD) */ c.pe = (c.pe || []).filter(e => !e.conc); c.concK = null; c.extConc = false; },
    concHit(rt, p, dmg) { if (!p.concK || p.dead || (p.concK.k === 'sr_hmark' && G.Fantasy.sk(p, 'ft_rhunter'))) return; const raw = dmg * Math.max(1, DN().srdHP(p.merc)) / (p.max || 1); const dc = Math.max(10, Math.round(raw / 2)), adv = p.extConc || G.Opt.has(p, 'iv_mind'); if (!DN().save(p, 'con', dc) && !(adv && DN().save(p, 'con', dc))) { R.endConc(p); G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.1, s: '집중 끊김', col: '#c9a6ff', t: 0.8, sz: 0.75 }); } },
    // 종족 (SRD 5.2.1)
    SPECIES: {
      ...Object.fromEntries(Object.keys(G.SRD.SPECIES).map(k => [k, { n: G.SRD.SPECIES[k].n, d: G.SRD.SPECIES[k].traits.map(q => q[0]).join(' · ') }])),
    },
    species(m) { if (!m) return null; if (!m.sp) { const K = Object.keys(R.SPECIES); m.sp = K[((m.uid || 0) * 7 + (m.name ? m.name.charCodeAt(0) : 0)) % K.length]; } return m.sp; },
    // 몸에 맞는 피해 (피해 종류 저항 · 격노 · 골리앗)
    takenK(p, t, ranged) { const m = p.merc; if (!m || !t) return 1; if (G.Trinket.props(m, 'immT').some(q => q[1] === t)) return 0; const sp = R.species(m), phys = t === 'slashing' || t === 'piercing' || t === 'bludgeoning'; // SRD: 같은 피해에 저항이 여럿이어도 한 번만 (절반)
      const res = DN().bsum(p, 'res_' + t) > 0 || (t !== 'force' && DN().bon(p, 'sdef')) || (DN().boon(m, 'night') && t !== 'psychic' && t !== 'radiant') || G.Trinket.props(m, 'res').some(q => q[1] === t) || (G.Fantasy.sk(p, 'sr_affinity') && t === 'fire') || !!G.SrdX?.resists(m).includes(t) || (DN().bon(p, 'rage') && phys) || DN().bon(p, 'invuln') /* 무적의 물약 */ || DN().any(p, 'resAll') /* 석화 */ || (ranged && G.Trinket.has(m, 'resRanged')) /* 투사체 유인의 방패 */;
      const vul = G.Trinket.props(m, 'vul').some(q => q[1] === t); // 취약의 갑옷 (저주)
      return (res ? 0.5 : 1) * (vul ? 2 : 1); },
    // 받는 피해를 깎는 물건 (온기의 반지: 냉기 −2d8)
    flat(p, t) { const m = p.merc; if (!m || !t) return 0; let v = 0; if (t === 'cold') for (const q of G.Trinket.props(m, 'redCold')) v += DN().dice(2, q[1]); return v; },
    // 쓰러지기 직전 (오크 불굴)
    onDown(rt, p) { if (G.Util?.contingency(rt, p)) return true; const m = p.merc; if (DN().bsum(p, 'deathWard') > 0) { if (p.bf) delete p.bf['sp_Death Ward']; p.hp = 1; return true; } const pr = rt.party?.find(q => !q.dead && q.merc && G.Opt.has(q, 'iv_protect') && !R.of(q.merc).fu.iv_protect); if (pr) { R.once(pr.merc, 'iv_protect'); p.hp = 1; G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.2, s: '수호자의 선물', col: '#b98aff', t: 1, sz: 0.85 }); return true; } if (R.species(m) !== 'orc') return false; if (!R.once(m, 'orc')) return false; p.hp = 1; G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.2, s: '오크의 불굴', col: '#ffb060', t: 1, sz: 0.85 }); return true; },
    // 골리앗 돌의 인내
    stone(rt, p, dmg) { const m = p.merc; if (R.species(m) !== 'goliath' || (G.SRD.line(m, 'goliath'), m.line) !== 'stone') return dmg; if (!R.once(m, 'stone', DN().prof(m.lv))) return dmg; /* 돌의 인내 (SRD): 숙련 보너스만큼, 긴 휴식에 */ const k = p.max / Math.max(1, DN().srdHP(m)); G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.2, s: '돌의 인내', col: '#c9c2b2', t: 0.8, sz: 0.75 }); return Math.max(0, dmg - (1 + U.rand(12) + DN().mod(DN().ab(m).con)) * k); },
    // 내성 재굴림
    saveAdv(tg, k) { const sp = R.species(tg.merc); return sp === 'gnome' && (k === 'int' || k === 'wis' || k === 'cha'); },
    saveRetry(tg) { const m = tg.merc; if (R.species(m) !== 'human') return false; return R.once(m, 'human'); },
  };
  { const can0 = R.can, pay0 = R.pay; R.can = function (m, k, res) { if (can0.call(this, m, k, res)) return true; const [, r] = R.sh(k, res); return !!(r?.slot && G.ItemX && G.ItemX.ringLeft() >= r.slot && ['archmage', 'mage', 'cleric', 'scout', 'bard', 'warlock', 'paladin', 'archer'].includes(m.cls)); }; R.pay = function (m, k, res) { const [, r] = R.sh(k, res); if (r?.slot && !can0.call(this, m, k, res) && G.ItemX?.ringUse(r.slot)) return r.slot; return pay0.call(this, m, k, res); }; } // 주문 저장의 반지 (SRD): 슬롯이 없을 때
  return R;
})();
// 사람별 기록 (상태창): 이번 전투에 준 피해와 처치. 전투가 끝나면 최근 다섯 전투의 피해 비중으로 남는다
(() => {
  const F = G.Fantasy, h0 = F.hurt, a0 = G.Res.afterFight, FORM_N = 5;
  F.hurt = function (f, rt, m, dmg, src, from) { const was = m.hp, r = h0.apply(this, arguments); if (from?.merc && m.kind === 'mon' && was > m.hp) { from.merc._fd = (from.merc._fd || 0) + (was - Math.max(0, m.hp)); if (m.hp <= 0) from.merc.kills = (from.merc.kills || 0) + 1; } return r; };
  G.Res.afterFight = function (rt) { const ms = rt.party.filter(p => p.merc).map(p => p.merc), tot = ms.reduce((a, m) => a + (m._fd || 0), 0); if (tot > 0) for (const m of ms) { m.form = (m.form || []).concat((m._fd || 0) / tot).slice(-FORM_N); m.fights = (m.fights || 0) + 1; m._fd = 0; } return a0.apply(this, arguments); };
})();
