'use strict';
// 직업별 대표 기술 (DESIGN.md 93): 고르는 칸(4)에 들어갈 수 있는 것은 이 목록뿐. 나머지 SRD 기술은 데이터로 남는다 (G.Skill.SK · D.MPOOL).
// 기준: 그 직업다운 것 · 효과가 서로 눈에 띄게 다른 것 · 실제 전투나 탐험에 도움이 되는 것. 전업 시전자 30 안팎 · 절반 시전자 20 안팎 · 무술 12 안팎.
G.Pool = (() => {
  const D = G.D, SK = G.Skill.SK, F = () => G.Fantasy;
  const CLS = { bard: 'bard', cleric: 'cleric', druid: 'scout', paladin: 'paladin', ranger: 'archer', sorcerer: 'mage', warlock: 'warlock', wizard: 'archmage' };
  const lvAt = (c, l) => (c === 'paladin' || c === 'archer' ? [1, 5, 9, 13, 17][l - 1] : l * 2 - 1);
  // ── 탐험 주문 (G.Explore · G.Res가 읽는다) ──
  const X = (k, id, ic, d) => { const o = G.SRD_SP[id], lv = {}; for (const c of o.cls) if (CLS[c]) lv[CLS[c]] = lvAt(CLS[c], o.lv); D.MSKILLS[k] = { n: o.ko, en: o.en, t: 'ui_star', ic, d, lv, explore: true }; };
  X('x_traps', 'find-traps', 's_traps', '함정 유무 · 종류');
  X('x_detect', 'detect-magic', 's_spellcasting', '6칸 안 마법 유물 표시');
  X('x_pass', 'pass-without-trace', 's_shroud_of_golubria', '파티 은신 판정 +10');
  X('x_clair', 'clairvoyance', 's_portal_projectile', '층마다 못 본 방 1개 시야');
  X('x_eye', 'arcane-eye', 's_portal_projectile', '라운드마다 6칸 전진 · 주변 6칸 시야');
  X('x_hut', 'tiny-hut', 's_summon_forest', '막다른 방에서 휴식');
  X('x_berry', 'goodberry', 's_regeneration', '열매 10개 · 싸운 뒤 다친 동료 체력 +1 · 야영까지');
  X('x_prayer', 'prayer-of-healing', 's_elyvilon_heal_other', '다섯 명 2d8 회복 · 슬롯 레벨당 +1d8 · 사람당 야영까지 1번');
  const POOL = {
    barbarian: ['sr_rage', 'sr_cleave', 'sr_topple', 'sr_sap', 'sr_push', 'wm_slow', 'wm_graze', 'wm_vex', 'wm_nick', 'sr_brutal', 'sr_intim'],
    dragoon: ['sr_second', 'sr_cleave', 'sr_topple', 'sr_sap', 'sr_push', 'wm_slow', 'wm_graze', 'wm_vex', 'wm_nick'],
    monk: ['sr_flurry', 'sr_patient', 'sr_wind', 'sr_stun', 'sr_whole', 'sr_quiver', 'sr_push', 'sr_topple', 'wm_nick', 'wm_vex'],
    rogue: ['sr_cunning', 'sr_steady', 'sr_cstrike', 'sr_devious', 'wm_nick', 'wm_vex', 'wm_graze', 'wm_slow', 'sr_sap', 'sr_topple', 'sr_push', 'sr_cleave'],
    paladin: ['sr_smite', 'sr_lay', 'sr_bless', 'sr_sof', 'sp_divine_favor', 'sp_command', 'sr_cure', 'sr_cleave', 'sr_topple', 'sr_push', 'wm_vex', 'sr_searing', 'sp_shining_smite', 'sp_aid', 'sp_magic_weapon', 'sr_revive', 'ft_abjure', 'sp_banishment', 'sp_death_ward'],
    archer: ['sr_hmark', 'sr_ensnare', 'sr_entangle', 'sr_cure', 'wm_vex', 'wm_slow', 'wm_graze', 'sr_sap', 'sr_push', 'sr_spike', 'sp_barkskin', 'sp_conjure_animals', 'sp_wind_wall', 'sr_revive', 'sp_stoneskin', 'sp_conjure_woodland_beings', 'ft_veil'],
    cleric: ['sr_cure', 'sr_bless', 'sr_gbolt', 'sr_hword', 'sr_sflame', 'sp_inflict_wounds', 'sr_sof', 'sp_bane', 'sp_command', 'sr_turn', 'sr_sweapon', 'sr_hold', 'sp_aid', 'sp_lesser_restoration', 'sr_guard', 'sr_revive', 'sr_mhw', 'sp_beacon_of_hope', 'sp_banishment', 'sp_death_ward', 'sp_guardian_of_faith', 'sp_flame_strike', 'sp_mass_cure_wounds', 'sp_heal', 'sp_harm', 'sp_blade_barrier', 'sp_fire_storm', 'sp_sunburst', 'sp_mass_heal'],
    scout: ['sr_pflame', 'sr_cure', 'sr_hword', 'sr_entangle', 'sr_faerie', 'sr_tw', 'sp_starry_wisp', 'sr_wild', 'sr_moon', 'sr_spike', 'sp_barkskin', 'sp_flaming_sphere', 'sr_call', 'sp_conjure_animals', 'sp_sleet_storm', 'sr_revive', 'sr_ice', 'sp_blight', 'sp_polymorph', 'sp_wall_of_fire', 'sr_cone', 'sp_insect_plague', 'sp_mass_cure_wounds', 'sp_sunbeam', 'sp_heal', 'sp_fire_storm', 'sp_earthquake', 'sp_storm_of_vengeance', 'sp_shapechange'],
    bard: ['sr_mock', 'sr_faerie', 'sr_hword', 'sr_whisper', 'sr_tw', 'sr_sleep', 'sr_cure', 'sp_hideous_laughter', 'sp_charm_person', 'sr_shatter', 'sr_hold', 'sp_invisibility', 'sp_mirror_image', 'sr_hypno', 'sr_fear', 'sr_slow', 'sr_mhw', 'sp_confusion', 'sp_polymorph', 'sp_greater_invisibility', 'sp_mass_cure_wounds', 'sp_hold_monster', 'sr_fireball', 'sr_guard', 'sp_irresistible_dance', 'sp_mass_suggestion', 'sp_power_word_stun', 'sp_power_word_heal', 'sp_power_word_kill'],
    mage: ['sr_firebolt', 'sr_chroma', 'sp_burning_hands', 'sp_sorcerous_burst', 'sp_shocking_grasp', 'sp_ray_of_sickness', 'ft_innate', 'sr_sleep', 'sr_sray', 'sp_dragons_breath', 'sr_misty', 'sp_mirror_image', 'sr_web', 'sr_shatter', 'sp_blur', 'sr_fireball', 'sr_lbolt', 'sr_haste', 'sr_hypno', 'sr_ice', 'sp_wall_of_fire', 'sp_greater_invisibility', 'sr_cone', 'sp_cloudkill', 'sp_hold_monster', 'sr_chain', 'sp_disintegrate', 'sp_delayed_blast_fireball', 'sp_incendiary_cloud', 'sr_meteor'],
    warlock: ['sr_eb', 'sr_hex', 'sp_chill_touch', 'sp_hideous_laughter', 'sp_bane', 'sp_expeditious_retreat', 'sr_misty', 'sr_dark', 'sr_hold', 'sp_invisibility', 'sp_mirror_image', 'sp_mind_spike', 'sp_ray_of_enfeeblement', 'sr_fear', 'sr_vtouch', 'sr_hypno', 'sp_banishment', 'sp_blight', 'sp_dimension_door', 'sp_hold_monster', 'sp_circle_of_death', 'sp_eyebite', 'sp_finger_of_death', 'sp_forcecage', 'sp_power_word_stun', 'sp_power_word_kill', 'sp_weird'],
    archmage: ['sr_mm', 'sr_rof', 'sp_burning_hands', 'sp_shocking_grasp', 'sr_sleep', 'sp_mage_armor', 'sr_misty', 'sr_web', 'sr_sray', 'sr_shatter', 'sp_invisibility', 'sr_hold', 'sr_fireball', 'sr_lbolt', 'sr_haste', 'sr_slow', 'sr_hypno', 'sr_ice', 'sp_wall_of_fire', 'sp_banishment', 'sr_cone', 'sp_hold_monster', 'sr_chain', 'sp_disintegrate', 'sp_finger_of_death', 'sr_meteor', 'sp_power_word_kill', 'sp_time_stop'],
  };
  // 몽크: 맨손 타격의 밀치기 · 넘어뜨리기 (SRD Unarmed Strike) · 무술의 추가 타격
  for (const k of ['sr_push', 'sr_topple', 'wm_nick', 'wm_vex']) D.MSKILLS[k].lv.monk = 1;
  // ── 탐험 칸 (DESIGN.md 95): 전투 4칸과 따로 한 칸. 이름은 SRD 직업 기술 숙련 · 기능, 게임 안 효과와 수치는 우리 것 ──
  const SK_X = (k, n, en, cls, ic, d) => { const lv = {}; for (const [c, L] of Object.entries(cls)) lv[c] = L; D.MSKILLS[k] = { n, en, t: 'ui_star', ic, d, lv, explore: true }; };
  const ALL = l => l.reduce((o, c) => ((o[c] = 1), o), {});
  SK_X('x_perc', '지각', 'Perception', ALL(['barbarian', 'dragoon', 'archer', 'rogue', 'scout', 'bard']), 's_ru_draw_out_power', '지각 숙련 · 매복 감지');
  SK_X('x_inv', '조사', 'Investigation', ALL(['archer', 'rogue', 'warlock', 'archmage', 'bard']), 's_stabbing', '조사 숙련 · 함정 · 상자 · 방 뒤지기');
  SK_X('x_stealth', '은신', 'Stealth', ALL(['monk', 'archer', 'rogue', 'bard']), 's_shroud_of_golubria', '은신 숙련 · 들키지 않으면 적 선제권 불리');
  SK_X('x_arcana', '비전학', 'Arcana', ALL(['mage', 'warlock', 'archmage', 'scout', 'bard']), 's_spellcasting', '비전학 숙련 · 봉인 문자');
  SK_X('x_surv', '생존', 'Survival', ALL(['barbarian', 'dragoon', 'archer', 'scout', 'bard']), 's_summon_forest', '생존 숙련 · 발자국');
  SK_X('x_med', '의학', 'Medicine', ALL(['cleric', 'scout', 'paladin', 'archmage', 'bard']), 's_cure_poison', '의학 숙련 · 곁의 쓰러진 동료 안정 DC 10');
  SK_X('x_expert', '전문가', 'Expertise', { rogue: 1 }, 's_sure_blade', '조사 · 지각 · 은신에 숙련 두 배');
  SK_X('x_feral', '야성의 본능', 'Feral Instinct', { barbarian: 7 }, 's_beastly_appendage', '선제권 이점');
  SK_X('x_tmind', '전술적 사고', 'Tactical Mind', { dragoon: 2 }, 's_fighting', '판정 실패 시 재기 1번 +1d10 · 그래도 실패하면 소모 없음');
  SK_X('x_fall', '느린 낙하', 'Slow Fall', { monk: 4 }, 's_phase_shift', '떨어지는 피해 −레벨 × 5');
  SK_X('x_acro', '곡예 이동', 'Acrobatic Movement', { monk: 9 }, 's_swiftness', '물 위 이동 · 얕은 물 이동 비용 없음');
  // 의학: 안정시키기는 행동 (SRD Help · DC 10 지혜(의학))
  SK.x_med = { auto: true, prio: 6, when: (c, x) => G.Skill.H.alive2(x).length > 0, run(c, x) { const p = G.Skill.H.alive2(x)[0], ok = G.Dnd.d20(0) + G.Dnd.skill(c.merc, 'medicine') >= 10; G.Skill.H.ring(x, p, 0.8, '#9fe79f'); if (ok) p.dying = null; } }; D.SK_RANGE.x_med = 1.5;
  const XS = {
    barbarian: ['x_perc', 'x_surv', 'x_feral'],
    dragoon: ['x_perc', 'x_surv', 'x_tmind'],
    monk: ['x_stealth', 'x_fall', 'x_acro'],
    rogue: ['x_perc', 'x_inv', 'x_stealth', 'x_expert'],
    paladin: ['x_med', 'x_detect', 'x_prayer'],
    archer: ['x_perc', 'x_inv', 'x_stealth', 'x_surv', 'x_detect', 'x_berry', 'x_traps', 'x_pass'],
    cleric: ['x_med', 'x_detect', 'x_traps', 'x_prayer', 'x_clair'],
    scout: ['x_perc', 'x_arcana', 'x_med', 'x_surv', 'x_detect', 'x_berry', 'x_traps', 'x_pass'],
    bard: ['x_perc', 'x_inv', 'x_arcana', 'x_stealth', 'x_med', 'x_surv', 'x_detect', 'x_clair', 'x_hut'],
    mage: ['x_arcana', 'x_detect', 'x_clair'],
    warlock: ['x_arcana', 'x_inv', 'x_detect'],
    archmage: ['x_arcana', 'x_inv', 'x_med', 'x_detect', 'x_clair', 'x_hut', 'x_eye'],
  };
  const lvOf = (m, k) => { const L = D.MSKILLS[k].lv; return (typeof L === 'object' ? L[m.cls] : L) || 1; };
  const Pool = {
    POOL, XS,
    // 지금 배울 수 있는 탐험 스킬
    can: m => (XS[m.cls] || []).filter(k => m.lv >= lvOf(m, k)),
    // 지금 탐험 칸의 스킬: 사람이 정했으면 그것, 아니면 처음 굴린 순서에서 레벨이 된 첫 번째
    of(m) { if (!m) return null; if (!XS[m.cls]) return null; if (!m.xRoll) m.xRoll = G.U.shuffle(XS[m.cls].slice()); if (m.xk && XS[m.cls].includes(m.xk) && m.lv >= lvOf(m, m.xk)) return m.xk; return m.xRoll.find(k => m.lv >= lvOf(m, k)) || null; },
    // 탐험 칸을 이 스킬로
    set(m, k) { if (Pool.can(m).includes(k)) m.xk = k; },
    // 원정대에 그 탐험 스킬을 쓸 수 있는 사람이 있으면 그 몸을 돌려준다
    who: (rt, k) => (rt.party || rt.allies || []).find(p => p.merc && !p.dead && !p.dying && Pool.of(p.merc) === k) || null,
    // 쓰는 순간 이름을 띄운다
    used(p, k) { if (p && !G.quiet) (p.skLog = p.skLog || []).push(k); },
    // 숙련 (G.Dnd.skill): 전문가는 조사 · 지각에 두 배. 나머지는 탐험 칸의 그 기술
    skillK(m, sk) { const k = Pool.of(m); if (k === 'x_expert' && (sk === 'investigation' || sk === 'perception' || sk === 'stealth')) return 2; return (k === 'x_perc' && sk === 'perception') || (k === 'x_stealth' && sk === 'stealth') || (k === 'x_inv' && sk === 'investigation') || (k === 'x_arcana' && sk === 'arcana') || (k === 'x_surv' && sk === 'survival') || (k === 'x_med' && sk === 'medicine') ? 1 : 0; },
    // 전투 직전 은신 (SRD 집단 판정 · 놀람): 절반 이상이 적의 수동 지각을 넘으면 적이 선제권 불리
    sneak(rt, foes) { const crew = rt.party.filter(p => p.merc && !p.dead), DN = G.Dnd, pw = Pool.who(rt, 'x_pass') ? 10 : 0, pp = Math.max(0, ...foes.map(o => 10 + (o.stat?.save?.wis ?? 0))); let n = 0; for (const p of crew) { const k = Pool.of(p.merc), pr = DN.prof(p.merc.lv) * (k === 'x_expert' ? 2 : k === 'x_stealth' ? 1 : 0); if (DN.d20(0) + DN.mod(DN.ab(p.merc).dex) + pr + pw >= pp) n++; } return crew.length > 0 && n * 2 >= crew.length; },
    // 걷는 동안: 마법 탐지 · 투시 · 비전의 눈
    scry(rt, dt) {
      const dm = Pool.who(rt, 'x_detect'), rooms = rt.map.rooms || [], R = rt.map.w;
      if (dm) for (const c of rt.chests) if (c.relic && !c.auraSeen && Math.hypot(c.x - dm.x, c.y - dm.y) <= 6) { c.auraSeen = true; G.Skill.reveal(rt, c.x, c.y, 2); Pool.used(dm, 'x_detect'); }
      const unseen = from => rooms.filter(r => !rt.seen[r.cy * R + r.cx]).sort((p, q) => Math.hypot(p.cx - from.x, p.cy - from.y) - Math.hypot(q.cx - from.x, q.cy - from.y))[0];
      const cv = Pool.who(rt, 'x_clair'); if (cv && !rt.clairDone) { const r = unseen(cv); rt.clairDone = true; if (r) { G.Sight.revealRoom(rt, r); Pool.used(cv, 'x_clair'); } }
      const ey = Pool.who(rt, 'x_eye'); if (ey && (rt.eyeT = (rt.eyeT || 0) - dt) <= 0) { rt.eyeT = G.Res_ROUND; const at = rt.eye || (rt.eye = { x: ey.x, y: ey.y }), r = unseen(at); if (r) { const dx = r.cx - at.x, dy = r.cy - at.y, l = Math.hypot(dx, dy) || 1, st = Math.min(6, l); for (let i = 1; i <= st; i++) { const nx = at.x + dx / l, ny = at.y + dy / l; if (!G.Grid.pass(rt.map, Math.round(nx), Math.round(ny))) break; at.x = nx; at.y = ny; } G.Skill.reveal(rt, at.x, at.y, 6); } }
    },
    // 싸운 뒤: 좋은 열매 · 치유의 기도 (체력 배율만큼 함께 자란다)
    afterFight(rt) {
      const hpK = q => q.max / Math.max(1, G.Dnd.srdHP(q.merc)), hurt = () => rt.party.filter(q => q.merc && !q.dead && !q.dying && q.hp < q.max).sort((a, b) => a.hp / a.max - b.hp / b.max);
      const pr = Pool.who(rt, 'x_prayer'); if (pr && hurt().some(q => q.hp < q.max * 0.5)) { const lv = G.Res.maxSlot(pr.merc), n = 2 + Math.max(0, lv - 2); let any = false; for (const q of hurt().filter(q => !G.Res.of(q.merc).sp.prayed).slice(0, 5)) { G.Res.of(q.merc).sp.prayed = true; q.hp = Math.min(q.max, q.hp + G.Dnd.dice(n, 8) * hpK(q)); any = true; } if (any) Pool.used(pr, 'x_prayer'); }
      const be = Pool.who(rt, 'x_berry'); if (be) { const s = G.Res.of(be.merc).sp; if (s.berry == null) s.berry = 10; while (s.berry > 0) { const q = hurt()[0]; if (!q) break; q.hp = Math.min(q.max, q.hp + hpK(q)); s.berry--; } }
    },
  };
  return Pool;
})();
