'use strict';
// 빌드 (화면 없이, 2026-11-21 개편): 손에 드는 것은 언제나 기술 6칸 + 종족 칸 1.
// - 칸 6개는 정해진 레벨에 열린다 (SLOT_LV: 1 · 1 · 3 · 5 · 9 · 13 — 하위 직업 · 3레벨 주문 · 5레벨 주문 · 7레벨 주문 시점).
// - 빌드는 앞 칸들에 필수 기술(core)을 둔다. 칸이 열리고 그 기술의 SRD 레벨이 되면 무조건 생긴다 — 빼거나 바꿀 수 없다 (클레릭 = 치유 · 소생 같은 컨셉이 늘 유지된다).
// - 필수가 없는 칸은 자유 칸: 열리면 레벨업 카드 셋 중 하나 (그 직업의 기술 · 하위 직업이 늘 준비해 주는 주문). 전투 밖에서 바꿀 수 있다 (SRD: 긴 휴식에 준비 주문 바꾸기).
//   고르지 않았으면 빌드의 추천(sug) 순서대로 들어간다.
// - 주문끼리 교체하지 않는다: 주문은 SRD 슬롯표 · 상위 시전대로 레벨에 맞게 강해진다 (G.Res). 상위 주문(유성 폭풍 …)은 자유 칸으로.
// - 종족 칸: 숨결 · 비행 · 아드레날린 · 거대화 · 혈통 주문 중 하나 (둘 이상이면 고른다).
// - 늘 적용되는 기능(추가 공격 · 오라 · 암습)과 기본 공격(무기 · 대표 소마법)은 칸 밖.
// - 다중 직업 빌드는 mc: { cls, from, n } — 캐릭터 레벨 from부터 그 직업을 n레벨 찍는다 (선행 조건은 G.MC가 본다).
G.Builds = (() => {
  const GD = () => G.Guild, D = G.D, SLOT_N = 6, SLOT_LV = [1, 1, 3, 5, 9, 13];
  const W_BASIC = 6, W_VAR = 3, W_MC = 1;
  // core = 칸 1~에 차례로 드는 필수 기술 · sug = 자유 칸 추천 순서 (고르지 않았을 때)
  const LIST = [
    // 파이터 (챔피언): 고르는 기능이 둘뿐 — 나머지(추가 공격 · 불굴 · 향상된 치명타)는 늘 적용. 변형은 전투 방식
    { id: 'fighter', cls: 'dragoon', n: '파이터', w: W_BASIC, core: ['sr_second', 'sr_surge'], sug: [], opts: { fs: ['fs_gwf'] } },
    { id: 'fighter_shield', cls: 'dragoon', n: '방패 파이터', w: W_VAR, core: ['sr_second', 'sr_surge'], sug: [], opts: { fs: ['fs_defense'] } },
    { id: 'fighter_bow', cls: 'dragoon', n: '궁수 파이터', w: W_VAR, core: ['sr_second', 'sr_surge'], sug: [], opts: { fs: ['fs_archery'] } },
    { id: 'barbarian', cls: 'barbarian', n: '바바리안', w: W_BASIC, core: ['sr_rage', 'sr_reckless', 'sr_brutal', 'sr_intim'], sug: [] },
    { id: 'rogue', cls: 'rogue', n: '로그', w: W_BASIC, core: ['sr_cunning', 'sr_steady', 'sr_cstrike', 'sr_devious'], sug: [] },
    { id: 'monk', cls: 'monk', n: '몽크', w: W_BASIC, core: ['sr_flurry', 'sr_patient', 'sr_wind', 'sr_stun', 'sr_whole', 'sr_quiver'], sug: [] },
    // 팔라딘 (헌신의 맹세)
    { id: 'paladin', cls: 'paladin', n: '팔라딘', w: W_BASIC, core: ['sr_smite', 'sr_lay', 'sr_sacred', 'sr_bless'], sug: ['sp_divine_favor', 'sr_sof', 'sp_banishment', 'sp_aura_of_life'], opts: { fs: ['fs_gwf'] } },
    { id: 'paladin_shield', cls: 'paladin', n: '방패 팔라딘', w: W_VAR, core: ['sr_smite', 'sr_lay', 'sr_sof', 'sr_bless'], sug: ['sr_cure', 'sp_aura_of_life', 'sr_sacred'], opts: { fs: ['fs_defense'] } },
    // 레인저 (헌터)
    { id: 'ranger', cls: 'archer', n: '레인저', w: W_BASIC, core: ['sr_hmark', 'sr_ensnare', 'sr_cure', 'sr_spike'], sug: ['sp_conjure_animals', 'ft_veil', 'sp_barkskin'], opts: { fs: ['fs_archery'] } },
    { id: 'ranger_twin', cls: 'archer', n: '쌍수 레인저', w: W_VAR, core: ['sr_hmark', 'sr_ensnare', 'sr_cure', 'sp_barkskin'], sug: ['sr_spike', 'ft_veil', 'sp_conjure_animals'], opts: { fs: ['fs_twf'] } },
    // 클레릭 (생명 권역): 기본 공격은 신성한 불꽃
    { id: 'cleric', cls: 'cleric', n: '클레릭', w: W_BASIC, core: ['sr_hword', 'sr_bless', 'sr_preserve', 'sr_revive'], sug: ['sr_mhw', 'sr_guard', 'sp_heal', 'sp_mass_heal', 'sr_gbolt'] },
    { id: 'cleric_war', cls: 'cleric', n: '전투 클레릭', w: W_VAR, core: ['sr_bless', 'sr_gbolt', 'sr_sweapon', 'sr_guard'], sug: ['sp_flame_strike', 'sr_turn', 'sp_holy_aura', 'sr_hword'] },
    // 드루이드 (대지의 회합): 기본 공격은 불꽃 생성
    { id: 'druid', cls: 'scout', n: '드루이드', w: W_BASIC, core: ['sr_hword', 'sr_wild', 'sr_moon', 'sr_call'], sug: ['sr_spike', 'sp_conjure_animals', 'sp_sunbeam', 'sp_storm_of_vengeance'] },
    { id: 'druid_heal', cls: 'scout', n: '치유 드루이드', w: W_VAR, core: ['sr_hword', 'sr_cure', 'sr_wild', 'sp_mass_cure_wounds'], sug: ['sr_entangle', 'sr_moon', 'sp_heal'] },
    // 바드 (전승 학파): 기본 공격은 잔인한 조롱
    { id: 'bard', cls: 'bard', n: '바드', w: W_BASIC, core: ['sr_insp', 'sr_hword', 'sr_faerie', 'sr_hypno'], sug: ['sr_fear', 'sr_mhw', 'sp_hold_monster', 'sp_power_word_stun'] },
    { id: 'bard_control', cls: 'bard', n: '통제 바드', w: W_VAR, core: ['sr_insp', 'sp_hideous_laughter', 'sr_hold', 'sr_hypno'], sug: ['sp_hold_monster', 'sr_whisper', 'sp_power_word_stun'] },
    // 소서러 (용의 혈통): 기본 공격은 화염살
    { id: 'sorcerer', cls: 'mage', n: '소서러', w: W_BASIC, core: ['sr_chroma', 'sr_mm', 'sr_sray', 'sr_fireball'], sug: ['sr_haste', 'sp_wall_of_fire', 'sr_chain', 'sr_meteor'], opts: { mm: ['sr_quicken', 'mm_empower', 'sr_twin'] } },
    { id: 'sorcerer_storm', cls: 'mage', n: '번개 소서러', w: W_VAR, core: ['sr_chroma', 'sr_sray', 'sr_misty', 'sr_lbolt'], sug: ['sr_haste', 'sr_chain', 'sp_disintegrate', 'sr_meteor'], opts: { mm: ['sr_twin', 'sr_quicken', 'mm_empower'] } },
    // 워락 (악마 후원자): 기본 공격은 섬뜩한 폭발
    { id: 'warlock', cls: 'warlock', n: '워락', w: W_BASIC, core: ['sr_hex', 'sr_hold', 'sr_dark', 'sr_fireball'], sug: ['sr_hypno', 'sp_wall_of_fire', 'sp_circle_of_death', 'sp_finger_of_death'], opts: { iv: ['sr_agon', 'iv_repel', 'iv_dsight', 'iv_spear', 'iv_mind'] } },
    { id: 'warlock_blade', cls: 'warlock', n: '칼날 워락', w: W_VAR, core: ['sr_hex', 'sr_misty', 'sr_hold', 'sr_vtouch'], sug: ['sp_hold_monster', 'sr_fear', 'sp_eyebite'], opts: { iv: ['iv_pblade', 'iv_thirst', 'iv_smite', 'iv_life', 'iv_devour'] } },
    // 위저드 (방출계): 기본 공격은 서리 광선
    { id: 'wizard', cls: 'archmage', n: '위저드', w: W_BASIC, core: ['sr_mm', 'sr_misty', 'sr_sray', 'sr_fireball'], sug: ['sr_ice', 'sr_cone', 'sr_chain', 'sp_disintegrate', 'sr_meteor', 'sp_time_stop'] },
    { id: 'wizard_control', cls: 'archmage', n: '통제 위저드', w: W_VAR, core: ['sr_sleep', 'sr_web', 'sr_hold', 'sr_slow'], sug: ['sr_hypno', 'sp_banishment', 'sp_hold_monster', 'sp_forcecage', 'sp_power_word_stun'] },
    // 다중 직업 (드물게)
    { id: 'sorcadin', cls: 'paladin', n: '소서딘', w: W_MC, mc: { cls: 'mage', from: 7, n: 5 }, core: ['sr_smite', 'sr_lay', 'sr_sacred', 'sr_haste'], sug: ['sr_bless', 'sp_divine_favor', 'sr_fireball'], opts: { fs: ['fs_gwf'], mm: ['sr_quicken', 'sr_twin'] } },
    { id: 'sorlock', cls: 'mage', n: '섬뜩한 폭발 소서러', w: W_MC, mc: { cls: 'warlock', from: 2, n: 2 }, core: ['sr_chroma', 'sr_hex', 'sr_sray', 'sr_fireball'], sug: ['sr_haste', 'sr_misty', 'sr_chain', 'sr_meteor'], opts: { iv: ['sr_agon', 'iv_repel'], mm: ['sr_quicken', 'mm_empower'] } },
    { id: 'hexadin', cls: 'paladin', n: '헥사딘', w: W_MC, mc: { cls: 'warlock', from: 6, n: 3 }, core: ['sr_smite', 'sr_lay', 'sr_sacred', 'sr_hex'], sug: ['sr_bless', 'sp_divine_favor', 'sp_banishment'], opts: { fs: ['fs_gwf'], iv: ['iv_pblade', 'sr_agon'] } },
    { id: 'surgecaster', cls: 'mage', n: '쇄도 주문사', w: W_MC, mc: { cls: 'dragoon', from: 4, n: 2 }, core: ['sr_chroma', 'sr_sray', 'sr_surge', 'sr_fireball'], sug: ['sr_second', 'sr_haste', 'sr_chain', 'sr_meteor'], opts: { mm: ['sr_quicken', 'mm_empower'] } },
  ];
  const byId = id => LIST.find(b => b.id === id) || null, base = m => (G.MC?.base ? G.MC.base(m) : m);
  const ITEMS = new Set(['it_wonder', 'it_sphere']);
  // 그 기술이 어느 직업의 것인가 (계획 안의 직업 중) · 그 직업의 지금 레벨
  const classes = b => [b.cls].concat(b.mc ? [b.mc.cls] : []);
  const subSig = (c, k) => Object.values(D.ADV).some(A => A.base === c && A.sig.includes(k));
  const owns = (c, k) => D.MPOOL[c]?.includes(k) || GD().spellList(c).includes(k) || subSig(c, k);
  const ownerOf = (b, k) => classes(b).find(c => owns(c, k)) || b.cls;
  const lvIn = (m, c) => (G.MC?.on(m) ? G.MC.lvOf(m, c) : m.cls === c ? m.lv : 0);
  const always = m => G.SrdX?.classSkills(m) || []; // 하위 직업 · 재주 · 직업 기능이 늘 준비해 주는 것
  // 지금 쓸 수 있나: 그 직업 레벨이 그 기술의 레벨에 닿았다 (하위 직업 기능은 3레벨부터)
  function ready(m, k) {
    m = base(m); const b = byId(m.build); if (!b) return false; const c = ownerOf(b, k), L = lvIn(m, c);
    if (subSig(c, k) && L < 3) return false;
    return L > 0 && L >= GD().skLv(c, k);
  }
  const usable = (m, k) => ready(m, k) || always(m).includes(k);
  // 캐릭터 없이: 그 빌드의 캐릭터 레벨 L에서 직업마다의 레벨 (다중 직업은 from부터 n레벨을 그 직업으로)
  const clsLvAt = (b, c, L) => { const t = b.mc ? Math.max(0, Math.min(b.mc.n, L - b.mc.from + 1)) : 0; return b.mc && c === b.mc.cls ? t : c === b.cls ? L - t : 0; };
  const readyAt = (b, k, L) => { const c = ownerOf(b, k), cl = clsLvAt(b, c, L); if (subSig(c, k) && cl < 3) return false; return cl > 0 && cl >= GD().skLv(c, k); };
  // 필수 기술이 생기는 캐릭터 레벨 = 칸이 열리는 레벨과 그 기술의 레벨 중 늦은 것
  const coreLv = (b, i) => { const k = b.core[i]; if (!k) return null; const L = [...Array(20).keys()].map(q => q + 1).find(q => readyAt(b, k, q)); return L ? Math.max(SLOT_LV[i], L) : null; };
  // 종족 칸 후보: 종족이 주는 고르는 기술 (숨결 · 비행 · 아드레날린 · 거대화 · 혈통 주문)
  const raceOpts = m => { const cs = always(m); return [...new Set(G.SrdX?.skills(m) || [])].filter(k => !cs.includes(k) && GD().isPick(k) && G.Skill.SK[k]?.run); };
  const race = m => { m = base(m); const o = raceOpts(m); return o.includes(m.race) ? m.race : o[0] || null; };
  // 자유 칸 i에 든 것: 고른 것(m.free[i] — null이면 비움) · 안 골랐으면 추천 순서의 첫 쓸 수 있는 것
  function freeAt(m, i) {
    const b = byId(m.build); if (!b || b.core[i] || m.lv < SLOT_LV[i]) return null;
    if (m.free && i in m.free) return m.free[i] && usable(m, m.free[i]) ? m.free[i] : null;
    const seen = new Set(); for (let j = 0; j < i; j++) if (!b.core[j]) { const k = freeAt(m, j); if (k) seen.add(k); }
    return b.sug.find(k => !seen.has(k) && !b.core.includes(k) && ready(m, k)) || null;
  }
  // 자유 칸 후보: 그 직업들의 고르는 기술 + 늘 준비해 주는 것 (필수 · 종족 기술 · 다른 칸에 든 것 빼고)
  function pool(m, i) {
    m = base(m); const b = byId(m.build); if (!b) return []; const K = D.MSKILLS, used = new Set(b.core), ro = new Set(raceOpts(m));
    SLOT_LV.forEach((_, j) => { if (j !== i && !b.core[j]) { const k = freeAt(m, j); if (k) used.add(k); } });
    const cand = [...new Set(classes(b).flatMap(c => GD().pickable(c)).concat(always(m)))];
    return cand.filter(k => !used.has(k) && !ro.has(k) && !ITEMS.has(k) && GD().isPick(k) && G.Skill.SK[k] && !K[k]?.noAuto && usable(m, k));
  }
  // 칸 6개 (자리 그대로 — 아직 안 열렸거나 빈 칸은 null)
  function slots(m) {
    m = base(m); const b = byId(m.build); if (!b) return [];
    return SLOT_LV.map((lv, i) => (m.lv < lv ? null : b.core[i] ? (ready(m, b.core[i]) ? b.core[i] : null) : freeAt(m, i)));
  }
  // 손에 든 것: 칸 6개 + 종족 칸
  const slotted = m => { m = base(m); if (!byId(m.build)) return []; const r = race(m); return slots(m).filter(Boolean).concat(r ? [r] : []); };
  // 자유 칸 고치기 (전투 밖): k = 후보 중 하나 · null = 비움. 필수 칸은 못 고친다
  function setSlot(m, i, k) {
    m = base(m); const b = byId(m.build); if (!b || b.core[i] || m.lv < SLOT_LV[i]) return false;
    if (k != null && !pool(m, i).includes(k)) return false;
    m.free = { ...(m.free || {}), [i]: k }; refresh(m); return true;
  }
  function setRace(m, k) { m = base(m); if (!raceOpts(m).includes(k)) return false; m.race = k; refresh(m); return true; }
  function resetSlots(m) { m = base(m); delete m.free; refresh(m); }
  // 손에 든 주문을 엔진의 준비 목록에 (m.skills · 다중 직업은 그 직업 줄). 고르는 기술 걸러내기는 G.Guild.active
  function refresh(m) {
    m = base(m); const b = byId(m.build); if (!b) return m;
    const sp = slots(m).filter(k => k && GD().spLv(k) != null && owns(ownerOf(b, k), k));
    m.skills = sp.filter(k => ownerOf(b, k) === b.cls); for (const e of m.mc || []) e.skills = sp.filter(k => ownerOf(b, k) === e.cls);
    m.skManual = true; m.skPri = slotted(m); return m;
  }
  function apply(m, b) {
    m.build = b.id; delete m.free;
    if (b.opts) { const r = m.opts || G.Opt.roll(m) || {}; m.opts = { ...r }; for (const g of ['fs', 'iv', 'mm']) if (b.opts[g]) m.opts[g] = [...b.opts[g], ...(r[g] || []).filter(k => !b.opts[g].includes(k))]; }
    return refresh(m);
  }
  // 손님에게 빌드 하나 (그 직업의 빌드 중 무게대로)
  function assign(m, rng = Math.random) {
    const L = LIST.filter(b => b.cls === m.cls); if (!L.length) return m;
    let r = rng() * L.reduce((s, b) => s + b.w, 0); const b = L.find(q => (r -= q.w) < 0) || L[0];
    return apply(m, b);
  }
  // 성장표: 칸마다 열리는 레벨 · 필수면 그 기술과 생기는 레벨
  const timeline = b => { if (typeof b === 'string') b = byId(b); if (!b) return []; return SLOT_LV.map((lv, i) => ({ i, open: lv, core: !!b.core[i], k: b.core[i] || null, n: b.core[i] ? D.MSKILLS[b.core[i]]?.n || b.core[i] : null, lv: b.core[i] ? coreLv(b, i) : lv })); };
  // ── 엔진에 잇기 ──
  // 칸 걸러내기: 빌드를 가진 사람은 고르는 기술(행동 · 추가 행동)을 칸에 든 것만 쓴다. 늘 적용되는 기능 · 고정 기능(전투 방식 · 영창 · 초마법)은 그대로
  { const active0 = GD().active; GD().active = m => { const out = active0(m), b = base(m); if (!byId(b?.build)) return out; const s = new Set(slotted(b)); return out.filter(k => !GD().isPick(k) || s.has(k) || ITEMS.has(k)).concat([...s].filter(k => !out.includes(k) && G.Skill.SK[k]?.run)); }; }
  // 레벨이 올랐다: 다중 직업 빌드는 그 레벨을 계획한 직업으로, 그 뒤 칸을 다시 든다 · 레벨업 카드 (새 필수 기술 알림 · 열린 자유 칸 고르기)
  { const grow0 = GD().grow; GD().grow = function (m) {
    const b = byId(m.build);
    if (b?.mc && G.MC) { if (m.lvSeen == null) m.lvSeen = m.lv - 1; while (m.lvSeen < m.lv) { m.lvSeen++; m.nextCls = m.lvSeen >= b.mc.from && G.MC.lvOf(m, b.mc.cls) < b.mc.n ? b.mc.cls : null; G.MC.levelUp(m); } m.nextCls = null; }
    const out = grow0.call(this, m); if (!b) return out;
    if (G.Reward?.on) { const q = (m.lvq = m.lvq || []);
      b.core.forEach((k, i) => { if (coreLv(b, i) === m.lv) q.push({ k: 'plan', lv: m.lv, slot: i, key: k, core: true }); });
      SLOT_LV.forEach((lv, i) => { if (!b.core[i] && lv === m.lv && pool(m, i).length) q.push({ k: 'plan', lv: m.lv, slot: i, free: true }); }); }
    refresh(m); return out;
  }; }
  // 레벨업 카드: 필수 기술은 그것 하나 (알림) · 자유 칸은 추천 하나 + 후보 중 무작위 둘 (all이면 전부)
  function offer(m, h, rng = Math.random, all = false) {
    m = base(m); const b = byId(m.build); if (!b) return []; const K = D.MSKILLS;
    const card = (k, plan) => ({ kind: 'plan', id: k, plan, n: K[k]?.n || k, d: K[k]?.d || '', lv: GD().spLv(k) || 0 });
    if (h.core) return [card(h.key, true)];
    const f0 = m.free; if (f0 && h.slot in f0) { m.free = { ...f0 }; delete m.free[h.slot]; } // 추천은 그 칸을 안 고른 셈 치고
    const P = pool(m, h.slot), r0 = freeAt(m, h.slot); m.free = f0; if (!P.length) return [];
    const rec = r0 && P.includes(r0) ? r0 : P[0], rest = P.filter(k => k !== rec);
    const alt = all ? rest : (() => { const a = rest.slice(), o = []; while (a.length && o.length < 2) o.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return o; })();
    return [card(rec, true), ...alt.map(k => card(k, false))];
  }
  // 고른 카드: 자유 칸이면 그 칸에
  function choose(m, h, opt) { m = base(m); if (h?.free && opt) setSlot(m, h.slot, opt.id); return refresh(m); }
  // 상태창에 쓸 것 (화면 없이): 칸 6개(열리는 레벨 · 필수 / 자유 · 든 것 · 남은 횟수) · 종족 칸
  function view(m) {
    m = base(m); const b = byId(m.build); if (!b) return null; const K = D.MSKILLS, S = slots(m), tag = k => (GD().spLv(k) == null ? '기능' : GD().spLv(k) ? `${GD().spLv(k)}레벨 주문` : '소마법');
    const left = k => { const res = G.Skill.SK[k]?.res; if (!res) return null; const n = G.Res.left(m, res, k); return n >= 99 ? null : n; };
    const one = k => (k ? { k, n: K[k]?.n || k, d: K[k]?.d || '', tag: tag(k), left: left(k) } : null);
    const r = race(m);
    return { n: b.n, max: SLOT_N,
      slots: SLOT_LV.map((lv, i) => ({ i, open: lv, locked: m.lv < lv, core: !!b.core[i], coreLv: b.core[i] ? coreLv(b, i) : null, coreN: b.core[i] ? K[b.core[i]]?.n || b.core[i] : null, s: one(S[i]) })),
      custom: !!m.free, race: r ? one(r) : null, raceOpts: raceOpts(m).map(one), pool: i => pool(m, i).map(one) };
  }
  return { LIST, SLOT_N, SLOT_LV, byId, assign, apply, refresh, slots, slotted, pool, race, setSlot, setRace, resetSlots, ready, timeline, view, offer, choose, ownerOf: (m, k) => ownerOf(byId(base(m).build), k) };
})();
