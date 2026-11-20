'use strict';
// 빌드 (화면 없이, 2026-11-20): 선술집 손님은 "어떻게 클 사람인가"를 가지고 온다 — 1~20레벨 성장 경로. 손에 드는 것은 언제나 기술 6칸.
// - 기술 칸 = 직업 기능(격노 · 연타 · 강타 …)과 주문을 한 범주로. 6칸 고정. 늘 적용되는 기능(추가 공격 · 오라 · 암습)과 기본 공격(무기 · 대표 소마법)은 칸 밖.
// - 계획의 칸은 그 기술의 직업 레벨에 닿으면 저절로 열린다 (SRD 직업 표대로). 계획에 없는 종족 · 재주 기술은 들고 가지 않는다 (칸이 기술의 전부).
// - 기본 빌드 = 직업 하나로 쭉 (SRD 5.2.1은 직업마다 하위 직업 하나라 이것이 "그냥 파이터"). 변형 = 전투 방식 · 주문 고르기가 다른 것. 다중 직업 = 드물게.
// - 다중 직업 빌드는 mc: { cls, from, n } — 캐릭터 레벨 from부터 그 직업을 n레벨 찍는다 (선행 조건은 G.MC가 본다).
// - 20레벨까지 짠다 (사용자: 「20레벨까지 성장했을때 쓰는 스킬들을 모두 볼수 있게 … 몇레벨에 습득할지도」). test/builds_rules.js가 경로가 실제로 열리는지 본다.
G.Builds = (() => {
  const GD = () => G.Guild, D = G.D, SLOT_N = 6;
  const W_BASIC = 6, W_VAR = 3, W_MC = 1;
  // path = 1~20레벨 성장 경로 (배우는 순서). 'k' = 칸에 넣는다 · ['k', 'old'] = 그 기술이 생기면 old를 내려놓고 그 자리에 (6칸이 찼을 때). 각 기술이 생기는 레벨은 SRD 직업 표에서 (G.Builds.timeline)
  const LIST = [
    // 파이터 (챔피언): 고르는 기능이 둘뿐이다 — 나머지(추가 공격 · 불굴 · 향상된 치명타)는 늘 적용. 변형은 전투 방식
    { id: 'fighter', cls: 'dragoon', n: '파이터', w: W_BASIC, path: ['sr_second', 'sr_surge'], opts: { fs: ['fs_gwf'] } },
    { id: 'fighter_shield', cls: 'dragoon', n: '방패 파이터', w: W_VAR, path: ['sr_second', 'sr_surge'], opts: { fs: ['fs_defense'] } },
    { id: 'fighter_bow', cls: 'dragoon', n: '궁수 파이터', w: W_VAR, path: ['sr_second', 'sr_surge'], opts: { fs: ['fs_archery'] } },
    { id: 'barbarian', cls: 'barbarian', n: '바바리안', w: W_BASIC, path: ['sr_rage', 'sr_reckless', 'sr_brutal', 'sr_intim'] },
    { id: 'rogue', cls: 'rogue', n: '로그', w: W_BASIC, path: ['sr_cunning', 'sr_steady', 'sr_cstrike', 'sr_devious'] },
    { id: 'monk', cls: 'monk', n: '몽크', w: W_BASIC, path: ['sr_flurry', 'sr_patient', 'sr_wind', 'sr_stun', 'sr_whole', 'sr_quiver'] },
    // 팔라딘 (헌신의 맹세): 강타 · 축복 → 13레벨 추방 · 생명의 오라
    { id: 'paladin', cls: 'paladin', n: '팔라딘', w: W_BASIC, path: ['sr_smite', 'sr_lay', 'sr_bless', 'sp_divine_favor', 'sr_sof', 'sr_sacred', ['sp_banishment', 'sr_sof']], opts: { fs: ['fs_gwf'] } },
    { id: 'paladin_shield', cls: 'paladin', n: '방패 팔라딘', w: W_VAR, path: ['sr_smite', 'sr_lay', 'sr_bless', 'sr_sof', 'sr_cure', 'sr_sacred', ['sp_aura_of_life', 'sr_cure']], opts: { fs: ['fs_defense'] } },
    // 레인저 (헌터)
    { id: 'ranger', cls: 'archer', n: '레인저', w: W_BASIC, path: ['sr_hmark', 'sr_ensnare', 'sr_cure', 'sr_spike', 'sp_conjure_animals', 'ft_veil'], opts: { fs: ['fs_archery'] } },
    { id: 'ranger_twin', cls: 'archer', n: '쌍수 레인저', w: W_VAR, path: ['sr_hmark', 'sr_ensnare', 'sr_cure', 'sp_barkskin', 'sr_spike', 'ft_veil'], opts: { fs: ['fs_twf'] } },
    // 클레릭 (생명 권역): 기본 공격은 신성한 불꽃
    { id: 'cleric', cls: 'cleric', n: '클레릭', w: W_BASIC, path: ['sr_bless', 'sr_hword', 'sr_gbolt', 'sr_preserve', 'sr_guard', 'sr_mhw', ['sp_heal', 'sr_gbolt'], ['sp_mass_heal', 'sr_mhw']] },
    { id: 'cleric_war', cls: 'cleric', n: '전투 클레릭', w: W_VAR, path: ['sr_bless', 'sr_hword', 'sr_gbolt', 'sr_turn', 'sr_sweapon', 'sr_guard', ['sp_flame_strike', 'sr_gbolt'], ['sp_holy_aura', 'sr_bless']] },
    // 드루이드 (대지의 회합): 기본 공격은 불꽃 생성
    { id: 'druid', cls: 'scout', n: '드루이드', w: W_BASIC, path: ['sr_hword', 'sr_wild', 'sr_moon', 'sr_spike', 'sr_call', 'sp_conjure_animals', ['sp_sunbeam', 'sr_spike'], ['sp_storm_of_vengeance', 'sr_call']] },
    { id: 'druid_heal', cls: 'scout', n: '치유 드루이드', w: W_VAR, path: ['sr_hword', 'sr_cure', 'sr_entangle', 'sr_wild', 'sr_moon', 'sp_mass_cure_wounds', ['sp_heal', 'sr_cure']] },
    // 바드 (전승 학파): 기본 공격은 잔인한 조롱
    { id: 'bard', cls: 'bard', n: '바드', w: W_BASIC, path: ['sr_insp', 'sr_hword', 'sr_faerie', 'sr_hypno', 'sr_fear', 'sr_mhw', ['sp_hold_monster', 'sr_faerie'], ['sp_power_word_stun', 'sr_fear'], ['sp_power_word_kill', 'sr_mhw']] },
    { id: 'bard_control', cls: 'bard', n: '통제 바드', w: W_VAR, path: ['sr_insp', 'sr_hword', 'sr_whisper', 'sp_hideous_laughter', 'sr_hold', 'sr_hypno', ['sp_hold_monster', 'sr_hold'], ['sp_power_word_stun', 'sp_hideous_laughter']] },
    // 소서러 (용의 혈통): 기본 공격은 화염살
    { id: 'sorcerer', cls: 'mage', n: '소서러', w: W_BASIC, path: ['sr_chroma', 'sr_mm', 'sr_sray', 'sr_fireball', 'sr_haste', 'sp_wall_of_fire', ['sr_chain', 'sr_chroma'], ['sp_delayed_blast_fireball', 'sr_mm'], ['sr_meteor', 'sr_sray']], opts: { mm: ['sr_quicken', 'mm_empower', 'sr_twin'] } },
    { id: 'sorcerer_storm', cls: 'mage', n: '번개 소서러', w: W_VAR, path: ['sr_chroma', 'sr_misty', 'sr_sray', 'sr_lbolt', 'sr_haste', 'sr_chain', ['sp_disintegrate', 'sr_chroma'], ['sr_meteor', 'sr_sray']], opts: { mm: ['sr_twin', 'sr_quicken', 'mm_empower'] } },
    // 워락 (악마 후원자): 기본 공격은 섬뜩한 폭발
    { id: 'warlock', cls: 'warlock', n: '워락', w: W_BASIC, path: ['sr_hex', 'sr_hold', 'sr_dark', 'sr_fear', 'sr_hypno', 'sp_wall_of_fire', ['sp_circle_of_death', 'sr_hold'], ['sp_finger_of_death', 'sr_dark'], ['sp_power_word_kill', 'sr_fear']], opts: { iv: ['sr_agon', 'iv_repel', 'iv_dsight', 'iv_spear', 'iv_mind'] } },
    { id: 'warlock_blade', cls: 'warlock', n: '칼날 워락', w: W_VAR, path: ['sr_hex', 'sr_misty', 'sr_hold', 'sr_fear', 'sr_vtouch', ['sp_hold_monster', 'sr_hold'], 'sp_eyebite'], opts: { iv: ['iv_pblade', 'iv_thirst', 'iv_smite', 'iv_life', 'iv_devour'] } },
    // 위저드 (방출계): 기본 공격은 서리 광선
    { id: 'wizard', cls: 'archmage', n: '위저드', w: W_BASIC, path: ['sr_mm', 'sr_misty', 'sr_fireball', 'sr_ice', 'sr_cone', 'sr_chain', ['sp_disintegrate', 'sr_mm'], ['sr_meteor', 'sr_ice'], ['sp_time_stop', 'sr_misty']] },
    { id: 'wizard_control', cls: 'archmage', n: '통제 위저드', w: W_VAR, path: ['sr_web', 'sr_hold', 'sr_hypno', 'sr_slow', 'sp_banishment', 'sp_hold_monster', ['sp_forcecage', 'sr_web'], ['sp_power_word_stun', 'sr_hold'], ['sp_time_stop', 'sr_hypno']] },
    // 다중 직업 (드물게)
    { id: 'sorcadin', cls: 'paladin', n: '소서딘', w: W_MC, mc: { cls: 'mage', from: 7, n: 5 }, path: ['sr_smite', 'sr_lay', 'sr_bless', 'sp_divine_favor', 'sr_sacred', 'sr_haste', ['sr_fireball', 'sp_divine_favor']], opts: { fs: ['fs_gwf'], mm: ['sr_quicken', 'sr_twin'] } },
    { id: 'sorlock', cls: 'mage', n: '섬뜩한 폭발 소서러', w: W_MC, mc: { cls: 'warlock', from: 2, n: 2 }, path: ['sr_chroma', 'sr_hex', 'sr_misty', 'sr_sray', 'sr_fireball', 'sr_haste', ['sr_chain', 'sr_chroma'], ['sr_meteor', 'sr_sray']], opts: { iv: ['sr_agon', 'iv_repel'], mm: ['sr_quicken', 'mm_empower'] } },
    { id: 'hexadin', cls: 'paladin', n: '헥사딘', w: W_MC, mc: { cls: 'warlock', from: 6, n: 3 }, path: ['sr_smite', 'sr_lay', 'sr_bless', 'sp_divine_favor', 'sr_sacred', 'sr_hex', ['sp_banishment', 'sp_divine_favor']], opts: { fs: ['fs_gwf'], iv: ['iv_pblade', 'sr_agon'] } },
    { id: 'surgecaster', cls: 'mage', n: '쇄도 주문사', w: W_MC, mc: { cls: 'dragoon', from: 4, n: 2 }, path: ['sr_chroma', 'sr_sray', 'sr_surge', 'sr_second', 'sr_fireball', 'sr_haste', ['sr_chain', 'sr_chroma'], ['sr_meteor', 'sr_sray']], opts: { mm: ['sr_quicken', 'mm_empower'] } },
  ];
  const keyOf = e => (Array.isArray(e) ? e[0] : e), outOf = e => (Array.isArray(e) ? e[1] : null);
  // 경로를 따라 칸을 채운다: 쓸 수 있게 된 기술을 순서대로 넣고, 바꿀 대상이 칸에 있으면 그 자리에. 6칸을 넘지 않는다
  function fill(path, can) {
    const out = [];
    for (const e of path) { const k = keyOf(e), o = outOf(e); if (!can(k) || out.includes(k)) continue; const i = o ? out.indexOf(o) : -1; if (i >= 0) out[i] = k; else if (out.length < SLOT_N) out.push(k); }
    return out;
  }
  const byId = id => LIST.find(b => b.id === id) || null, base = m => (G.MC?.base ? G.MC.base(m) : m);
  // 그 기술이 어느 직업의 것인가 (계획 안의 직업 중) · 그 직업의 지금 레벨
  const classes = b => [b.cls].concat(b.mc ? [b.mc.cls] : []);
  const owns = (c, k) => D.MPOOL[c]?.includes(k) || GD().spellList(c).includes(k) || Object.values(D.ADV).some(A => A.base === c && A.sig.includes(k));
  const ownerOf = (b, k) => classes(b).find(c => owns(c, k)) || b.cls;
  const lvIn = (m, c) => (G.MC?.on(m) ? G.MC.lvOf(m, c) : m.cls === c ? m.lv : 0);
  // 지금 쓸 수 있나: 그 직업 레벨이 그 기술의 레벨에 닿았다 (하위 직업 기능은 3레벨부터 — 하위 직업이 있어야)
  function ready(m, k) {
    m = base(m); const b = byId(m.build); if (!b) return false; const c = ownerOf(b, k), L = lvIn(m, c);
    if (Object.values(D.ADV).some(A => A.base === c && A.sig.includes(k)) && L < 3) return false;
    return L > 0 && L >= GD().skLv(c, k);
  }
  const slotted = m => { m = base(m); return m.plan ? fill(m.plan, k => ready(m, k)) : []; };
  // 캐릭터 없이: 그 빌드의 캐릭터 레벨 L에서 직업마다의 레벨 (다중 직업은 from부터 n레벨을 그 직업으로)
  const clsLvAt = (b, c, L) => { const t = b.mc ? Math.max(0, Math.min(b.mc.n, L - b.mc.from + 1)) : 0; return b.mc && c === b.mc.cls ? t : c === b.cls ? L - t : 0; };
  const readyAt = (b, k, L) => { const c = ownerOf(b, k), cl = clsLvAt(b, c, L); if (Object.values(D.ADV).some(A => A.base === c && A.sig.includes(k)) && cl < 3) return false; return cl > 0 && cl >= GD().skLv(c, k); };
  // 성장표 (화면이 보여 준다): 경로의 기술마다 생기는 캐릭터 레벨 · 그때 내려놓는 기술. 그리고 레벨마다의 6칸
  function timeline(b, path) {
    if (typeof b === 'string') b = byId(b); if (!b) return [];
    return (path || b.path).map(e => { const k = keyOf(e), lv = [...Array(20).keys()].map(i => i + 1).find(L => readyAt(b, k, L)) || null; return { k, n: D.MSKILLS[k]?.n || k, lv, out: outOf(e), outN: outOf(e) ? D.MSKILLS[outOf(e)]?.n || outOf(e) : null, cls: ownerOf(b, k) }; });
  }
  const loadoutAt = (b, L) => fill(b.path, k => readyAt(b, k, L));
  // 계획대로 손에 든다: 주문은 그 직업의 준비 목록(m.skills · 다중 직업은 그 직업 줄)에, 직업 기능은 레벨이 되면 저절로 (칸 걸러내기는 G.Guild.active)
  function refresh(m) {
    m = base(m); const b = byId(m.build); if (!b) return m;
    const sp = slotted(m).filter(k => GD().spLv(k) != null);
    m.skills = sp.filter(k => ownerOf(b, k) === b.cls); for (const e of m.mc || []) e.skills = sp.filter(k => ownerOf(b, k) === e.cls);
    m.skManual = true; m.skPri = slotted(m); return m;
  }
  function apply(m, b) {
    m.build = b.id; m.plan = b.path.slice();
    if (b.opts) { const r = m.opts || G.Opt.roll(m) || {}; m.opts = { ...r }; for (const g of ['fs', 'iv', 'mm']) if (b.opts[g]) m.opts[g] = [...b.opts[g], ...(r[g] || []).filter(k => !b.opts[g].includes(k))]; }
    return refresh(m);
  }
  // 손님에게 빌드 하나 (그 직업의 빌드 중 무게대로)
  function assign(m, rng = Math.random) {
    const L = LIST.filter(b => b.cls === m.cls); if (!L.length) return m;
    let r = rng() * L.reduce((s, b) => s + b.w, 0); const b = L.find(q => (r -= q.w) < 0) || L[0];
    return apply(m, b);
  }
  // ── 엔진에 잇기 ──
  // 칸 걸러내기: 계획을 가진 사람은 고르는 기술(행동 · 추가 행동)을 칸에 든 것만 쓴다. 늘 적용되는 기능 · 고정 기능(전투 방식 · 영창 · 초마법)은 그대로
  const ITEMS = new Set(['it_wonder', 'it_sphere']);
  { const active0 = GD().active; GD().active = m => { const out = active0(m), b = base(m); if (!b?.plan) return out; const s = new Set(slotted(b)); return out.filter(k => !GD().isPick(k) || s.has(k) || ITEMS.has(k)); }; }
  // 레벨이 올랐다: 다중 직업 빌드는 그 레벨을 계획한 직업으로 (G.MC.levelUp — 새 게임의 레벨업은 G.Reward가 받아 다중 직업이 오르지 않았다), 그 뒤 계획을 다시 든다
  { const grow0 = GD().grow; GD().grow = function (m) {
    const b = byId(m.build);
    if (b?.mc && G.MC) { if (m.lvSeen == null) m.lvSeen = m.lv - 1; while (m.lvSeen < m.lv) { m.lvSeen++; m.nextCls = m.lvSeen >= b.mc.from && G.MC.lvOf(m, b.mc.cls) < b.mc.n ? b.mc.cls : null; G.MC.levelUp(m); } m.nextCls = null; }
    const out = grow0.call(this, m); if (!m.plan) return out;
    // 레벨업 카드: 이 레벨에 경로의 기술이 생기면 고르기 하나 (계획한 기술은 꼭 끼고, 나머지 둘은 그 레벨에 배울 수 있는 다른 기술 — G.Reward가 화면에 낸다)
    if (G.Reward?.on && b) for (const k of m.plan.map(keyOf)) if (readyAt(b, k, m.lv) && !readyAt(b, k, m.lv - 1)) (m.lvq = m.lvq || []).push({ k: 'plan', lv: m.lv, key: k });
    refresh(m); return out;
  }; }
  // 레벨업 카드 셋: 계획한 기술 + 같은 종류(직업 기능 · 소마법 · 레벨 주문)로 지금 배울 수 있고 경로에 없는 것 중 무작위 둘 (all이면 전부)
  function offer(m, h, rng = Math.random, all = false) {
    m = base(m); const b = byId(m.build); if (!b) return []; const K = D.MSKILLS, keys = m.plan.map(keyOf), kind = k => (GD().spLv(k) == null ? 'f' : GD().spLv(k) === 0 ? 'c' : 's');
    const card = (k, plan) => ({ kind: 'plan', id: k, plan, n: K[k]?.n || k, d: K[k]?.d || '', lv: GD().spLv(k) || 0 });
    const pool = [...new Set(classes(b).flatMap(c => GD().pickable(c)))].filter(k => !keys.includes(k) && G.Skill.SK[k]?.run && !K[k]?.noAuto && kind(k) === kind(h.key) && readyAt(b, k, m.lv));
    const alt = all ? pool : (() => { const a = pool.slice(), o = []; while (a.length && o.length < 2) o.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return o; })();
    return [card(h.key, true), ...alt.map(k => card(k, false))];
  }
  // 고른 카드: 다른 기술을 골랐으면 경로의 그 자리를 그 기술로 (나중에 그 기술을 내려놓기로 한 자리도 따라 바꾼다)
  function choose(m, h, opt) {
    m = base(m); if (!opt || opt.id === h.key) return refresh(m);
    m.plan = m.plan.map(e => (keyOf(e) === h.key ? (Array.isArray(e) ? [opt.id, e[1]] : opt.id) : Array.isArray(e) && e[1] === h.key ? [e[0], opt.id] : e));
    return refresh(m);
  }
  // 상태창에 쓸 것 (화면 없이): 지금 6칸 · 성장 경로(기술마다 생기는 레벨 · 내려놓는 것 · 지금 들었나 · 이미 내려놓았나)
  function view(m) {
    m = base(m); const b = byId(m.build); if (!b) return null; const K = D.MSKILLS, now = slotted(m), tag = k => (GD().spLv(k) == null ? '직업 기능' : GD().spLv(k) ? `${GD().spLv(k)}레벨 주문` : '소마법');
    return { n: b.n, max: SLOT_N, now: now.map(k => ({ k, n: K[k]?.n || k, d: K[k]?.d || '', tag: tag(k) })),
      path: timeline(b, m.plan).map(t => ({ ...t, d: K[t.k]?.d || '', tag: tag(t.k), have: now.includes(t.k), gone: !now.includes(t.k) && t.lv != null && t.lv <= m.lv })) };
  }
  return { LIST, SLOT_N, byId, assign, apply, refresh, slotted, ready, timeline, loadoutAt, view, offer, choose, ownerOf: (m, k) => ownerOf(byId(base(m).build), k) };
})();
