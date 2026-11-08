'use strict';
// 기술마다 어떤 이펙트를 보일까 (DESIGN.md 148). 규칙에 영향을 주지 않는다: 쓰는 순간 'cast' 효과 하나를 남기고, 그리는 쪽(js/iso/pfx.js)이 재생한다
// 모양: to 맞은 대상 · all 맞은 대상마다 · me 쓴 사람 · fly 날아가서 터짐 · dir 쓴 사람에서 대상 쪽으로
G.SkillFx = (() => {
  const VIOLET = ['#140a26', '#2b1252', '#481c88', '#6b2cc0', '#9a48ec', '#c684ff', '#ecc8ff', '#ffffff'];
  const GOLD = ['#2a1606', '#5a2f0c', '#96591a', '#cf8f2c', '#f2c04a', '#ffe07a', '#fff4c0', '#ffffff'];
  const GREEN = ['#0b1f12', '#123a1c', '#1e6a2c', '#3a9a3a', '#6ccc4a', '#a6ea6a', '#dcfaa8', '#ffffff'];
  const FROST = ['#151a3d', '#212f6b', '#2c58aa', '#3a8bd8', '#62c8f4', '#a6ecff', '#dcfbff', '#ffffff'];
  const CRIMSON = ['#1c060c', '#3e0c18', '#6e1424', '#a42030', '#d83a3a', '#f4745a', '#ffc0a0', '#ffffff'];
  const SPARK = 'impacts/hit-spark', BOOM = 'explosions/small-explosion', ICE = 'ice/snowflake-burst', SMITE = 'holy/smite', ACID = 'nature/acid-splash', MISSILE = 'projectiles/magic-missile', FIREBALL = 'fire/fireball', LANCE = 'ice/ice-lance';
  const GROUPS = [
    // 불
    ['fly', FIREBALL, SPARK, 'sr_firebolt sr_pflame sr_sray'],
    ['fly', FIREBALL, BOOM, 'sr_fireball sp_delayed_blast_fireball sp_flaming_sphere'],
    ['to', 'fire/meteor', 'sr_meteor'],
    ['to', 'fire/flame-pillar', 'sp_flame_strike'],
    ['to', 'fire/fire-tornado', 'sp_fire_storm sp_incendiary_cloud'],
    ['to', 'fire/fire-ring', 'sp_wall_of_fire'],
    ['dir', 'fire/fire-breath', 'sp_burning_hands sp_dragons_breath sr_breath'],
    ['all', 'status/burning', 'sp_heat_metal sr_searing'],
    ['me', 'status/burning', 'sp_fire_shield'],
    ['me', 'fire/spirit-flame', 'sp_flame_blade'],
    // 얼음
    ['fly', LANCE, ICE, 'sr_rof sp_ice_knife'],
    ['to', 'ice/icicle-fall', 'sr_ice'],
    ['dir', 'ice/frost-breath', 'sr_cone'],
    ['to', 'ice/frost-nova', 'sp_freezing_sphere'],
    ['to', 'ice/ice-spikes', 'sp_wall_of_ice'],
    ['to', 'ice/blizzard-vortex', 'sp_sleet_storm'],
    // 번개 · 천둥
    ['to', 'lightning/lightning-strike', 'sr_lbolt sr_call'],
    ['dir', 'lightning/chain-lightning', 'sr_chain'],
    ['to', 'lightning/zap-hit', 'sp_shocking_grasp'],
    ['me', 'lightning/thunderclap', 'sr_tw'],
    ['to', 'lightning/thunderclap', 'sr_shatter'],
    ['to', 'lightning/storm-cloud', 'sp_storm_of_vengeance'],
    // 산 · 독 · 자연
    ['to', ACID, 'sp_acid_splash sp_acid_arrow sp_vitriolic_sphere'],
    ['to', 'nature/poison-cloud', 'sp_poison_spray sx_s_poison_spray sp_cloudkill sp_stinking_cloud sp_ray_of_sickness sx_s_ray_of_sickness'],
    ['all', 'status/poisoned', 'sp_contagion'],
    ['to', 'nature/spore-burst', 'sp_insect_plague'],
    ['to', 'nature/root-snare', 'sr_entangle sr_web sr_ensnare'],
    ['to', 'nature/thorns', 'sr_spike sp_wall_of_thorns'],
    ['to', 'nature/toxic-puddle', 'sp_grease'],
    ['to', 'nature/earth-spike', 'sp_wall_of_stone'],
    ['to', 'nature/quake', 'sp_earthquake'],
    ['to', 'nature/tornado', 'sp_gust_of_wind sp_wind_wall'],
    ['me', 'nature/leaf-storm', 'sp_plant_growth ft_veil ft_sanctuary sp_barkskin'],
    ['me', 'spawn/poof', 'sr_wild sp_shapechange sp_polymorph sp_true_polymorph sx_large sp_enlarge_reduce'],
    // 빛 · 치유
    ['fly', MISSILE, SMITE, 'sr_gbolt', { palette: GOLD }],
    ['to', SMITE, 'sr_sflame sr_smite sp_shining_smite sp_dispel_evil_and_good sp_divine_word fs_blessed'],
    ['to', 'holy/holy-pillar', 'sp_sunbeam sp_heal sp_power_word_heal'],
    ['to', 'holy/sunburst', 'sp_sunburst'],
    ['me', 'holy/feather-burst', 'sr_turn ft_abjure ft_intervene'],
    ['to', 'holy/heal', 'sr_cure sr_hword sr_lay sr_second sr_whole x_med x_berry sp_spare_the_dying sp_lesser_restoration sp_greater_restoration sp_remove_curse'],
    ['me', 'holy/heal-aoe', 'sr_preserve sr_mhw sp_mass_cure_wounds sp_mass_heal x_prayer'],
    ['to', 'nature/healing-bloom', 'sp_regenerate sr_landaid iv_vigor sp_false_life sx_s_false_life'],
    ['to', 'holy/resurrection', 'sr_revive'],
    ['all', 'holy/blessing', 'sr_bless sp_aid sp_heroism sp_divine_favor sr_sacred sp_magic_weapon sp_shillelagh sr_insp'],
    ['me', 'holy/halo', 'sp_beacon_of_hope sp_holy_aura sp_aura_of_life sp_foresight sp_death_ward sr_guard sp_guardian_of_faith'],
    ['to', 'holy/divine-shield', 'sr_sof sr_patient sp_resistance sp_mage_armor sp_stoneskin sp_sanctuary sp_warding_bond sp_protection_from_energy sp_protection_from_evil_and_good sp_protection_from_poison sp_freedom_of_movement sp_mind_blank sp_enhance_ability ft_shdef ft_sdefense'],
    // 어둠 · 저주
    ['fly', MISSILE, SPARK, 'sr_eb iv_smite', { palette: VIOLET }],
    ['to', 'shadow/hex-sigil', 'sr_hex sr_hmark sp_bestow_curse'],
    ['all', 'shadow/curse', 'sp_bane sp_chill_touch sx_s_chill_touch sp_inflict_wounds sp_ray_of_enfeeblement sx_s_ray_of_enfeeblement sr_hurl sp_phantasmal_killer'],
    ['to', 'shadow/soul-drain', 'sp_blight'],
    ['to', 'shadow/dark-explosion', 'sp_harm sp_circle_of_death sp_power_word_kill'],
    ['to', 'shadow/necro-skulls', 'sr_fear sp_finger_of_death sr_intim sp_animate_dead'],
    ['to', 'shadow/eclipse', 'sr_dark'],
    ['me', 'arcane/blink-out', 'sp_mislead sp_invisibility sp_greater_invisibility iv_shadow sp_blur'],
    ['to', 'shadow/life-steal', 'sr_vtouch'],
    ['to', 'shadow/grasping-hands', 'sp_black_tentacles sp_imprisonment'],
    ['to', 'shadow/shadow-tendrils', 'sp_weird sp_maze'],
    ['to', 'shadow/void-orb', 'sp_reverse_gravity sp_banishment sp_plane_shift'],
    ['to', 'spawn/disintegrate', 'sp_disintegrate'],
    // 상태
    ['all', 'status/charmed', 'sp_charm_monster sp_charm_person sp_dominate_beast sp_dominate_monster sp_dominate_person sp_animal_friendship sp_enthrall sp_calm_emotions sp_suggestion sp_mass_suggestion sp_modify_memory sp_irresistible_dance sp_hideous_laughter'],
    ['all', 'status/confused', 'sp_confusion sp_befuddlement sp_compulsion sp_command sr_hypno sp_phantasmal_force sp_eyebite sr_whisper sr_mock iv_eye sp_mind_spike'],
    ['all', 'status/sleep', 'sr_sleep'],
    ['all', 'status/stunned', 'sr_hold sp_hold_monster sp_power_word_stun sp_blindness_deafness sr_stun sr_quiver'],
    ['all', 'status/petrified', 'sp_flesh_to_stone'],
    ['all', 'status/slowed', 'sr_slow wm_slow'],
    ['to', 'status/haste', 'sr_haste sp_fly sp_jump sp_longstrider sx_s_longstrider sp_expeditious_retreat sr_surge sr_wind sr_cunning sx_fly sp_levitate sp_mirror_image'],
    ['me', 'status/rage', 'sr_rage sr_reckless sx_orc'],
    // 비전
    ['dir', MISSILE, 'sr_mm sp_sorcerous_burst sp_starry_wisp', { palette: VIOLET }],
    ['fly', MISSILE, SPARK, 'sr_chroma sp_prismatic_spray sp_color_spray', { palette: FROST }],
    ['to', 'arcane/mana-burst', 'sp_antimagic_field sp_dispel_magic sp_counterspell ft_innate fs_druidic sr_faerie sp_true_strike sr_steady'],
    ['me', 'arcane/blink-out', 'sr_misty sp_blink sp_dimension_door sx_cloud'],
    ['me', 'arcane/time-stop', 'sp_time_stop'],
    ['to', 'arcane/star-fall', 'sr_moon sp_arcane_hand sp_telekinesis'],
    ['to', 'arcane/rune-circle', 'sp_arcane_sword sp_animate_objects sr_sweapon sp_faithful_hound x_traps x_detect x_pass x_clair x_eye x_hut'],
    ['to', 'scifi/force-field', 'sp_wall_of_force sp_forcecage sp_resilient_sphere sp_globe_of_invulnerability sp_antilife_shell sp_prismatic_wall'],
    ['to', 'explosions/smoke-bomb', 'sp_fog_cloud'],
    // 소환
    ['to', 'spawn/summon-rise', 'sp_conjure_animals sp_conjure_elemental sp_conjure_fey sp_conjure_minor_elementals sp_conjure_woodland_beings sp_giant_insect sp_summon_dragon iv_pchain ft_drcomp ft_wcomp ft_steed'],
    ['to', 'spawn/spawn-portal', 'sp_conjure_celestial'],
    // 무기 기술
    ['to', 'melee/spin-slash', 'sr_cleave wm_nick sp_blade_barrier'],
    ['to', 'melee/hammer-smash', 'sr_brutal'],
    ['to', 'impacts/ground-slam', 'sr_topple'],
    ['to', 'melee/uppercut', 'sr_push sx_ma'],
    ['to', 'impacts/blunt-hit', 'sr_sap wm_vex'],
    ['to', 'melee/double-slash', 'sr_cstrike sr_devious fs_twf wm_graze'],
    ['to', 'melee/dagger-flurry', 'sr_flurry'],
    ['to', 'impacts/shield-block', 'sr_help'],
  ];
  // 몬스터 원거리 공격 → 같은 기술. 이름이 다른 SRD 공격은 피해 종류로 잇는다
  const FOE = { 'Hurl Flame': 'sr_firebolt', 'Ice Spear': 'sr_rof', 'Arcane Burst': 'sr_mm', 'Force Bolt': 'sr_mm', 'Radiant Flame': 'sr_sflame' };
  const FOE_TYPE = { fire: 'sr_firebolt', cold: 'sr_rof', force: 'sr_mm', radiant: 'sr_sflame', lightning: 'sr_lbolt', thunder: 'sr_shatter', acid: 'sp_acid_splash', poison: 'sp_poison_spray', necrotic: 'sp_inflict_wounds', psychic: 'sp_mind_spike' };
  const ARROW = /bow|crossbow|pistol|javelin|spear|dagger|bark/i;
  const TABLE = {};
  for (const g of GROUPS) {
    const [mode, id] = g, hit = mode === 'fly' ? g[2] : null, keys = g[mode === 'fly' ? 3 : 2], opt = g[mode === 'fly' ? 4 : 3] || null;
    for (const k of keys.split(' ')) TABLE[k] = { mode, id, hit, opt };
  }
  for (const k of ['it_wonder', 'it_sphere']) TABLE[k] = TABLE[k] || TABLE.sr_fireball || TABLE.x_detect;
  for (const k in G.Util?.FX || {}) TABLE[k] = TABLE[k] || (k === 'u_tsunami' ? TABLE.sr_cone || TABLE.x_detect : TABLE.x_detect); // 전투 밖 주문 (G.Util): 룬 원
  const MAX_ALL = 4, DROP = new Set(['proj', 'beam', 'chain', 'bolt', 'tile', 'ring']);
  const spot = o => (o.x2 != null ? [o.x2, o.y2] : o.pts ? o.pts[o.pts.length - 1] : [o.x, o.y]);
  const same = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5;
  const C = {
    TABLE,
    // 기술이 남긴 공용 표시는 끄고, 맞은 자리에 이 기술의 이펙트를 건다. n0: 기술을 쓰기 전의 효과 수
    cast(rt, a, k, seen, n0) {
      const e = TABLE[k]; if (!e || G.quiet || !rt.fx) return;
      const pts = [], me = [a.x, a.y];
      for (const o of rt.fx.slice(n0)) {
        if (o.k === 'text' || o.x == null && !o.pts) continue;
        if (DROP.has(o.k)) o._own = 1;
        const p = spot(o); if (!same(p, me) && !pts.some(q => same(q, p))) pts.push(p);
      }
      if (!pts.length) { const l = (seen || []).slice().sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y)); if (l.length && !G.Skill.SK[k]?.heal) pts.push([l[0].x, l[0].y]); }
      if (!pts.length) pts.push(me);
      G.fx(rt, { k: 'cast', sk: k, mode: e.mode, id: e.id, hit: e.hit, opt: e.opt, x: a.x, y: a.y, who: a, pts: e.mode === 'all' ? pts.slice(0, MAX_ALL) : pts.slice(0, 1), t: 0.2 });
    },
    // 규칙을 거치지 않는 시전 (몬스터 주문): 공용 표시를 건드리지 않고 그 자리에
    play(rt, a, k, to) {
      const e = TABLE[k]; if (!e || G.quiet || !rt.fx) return;
      G.fx(rt, { k: 'cast', sk: k, mode: e.mode, id: e.id, hit: e.hit, opt: e.opt, x: a.x, y: a.y, who: a, pts: [to ? [to.x, to.y] : [a.x, a.y]], t: 0.2 });
    },
    FOE, FOE_TYPE, ARROW,
    // 몬스터 원거리 공격이 어느 기술과 같은가 (이름 → 피해 종류). 무기는 null
    foeSkill: atk => (atk ? FOE[atk.name] || FOE_TYPE[atk.t] || null : null),
    // 쏘는 그림: 같은 기술이면 같은 이펙트, 활 · 투척은 화살. 그 밖이면 false (원래 표시)
    foeShot(rt, e, tg, atk) {
      const k = C.foeSkill(atk); if (k) { C.play(rt, e, k, tg); return true; }
      if (atk && ARROW.test(atk.name)) { G.fx(rt, { k: 'proj', key: 'fx_arrow', x: e.x, y: e.y, x2: tg.x, y2: tg.y, t: 0.3 }); return true; }
      return false;
    },
  };
  return C;
})();
