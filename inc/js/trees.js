'use strict';
// 스킬트리 정의. x, y는 트리 화면의 칸 좌표(뿌리 = 0, 0). req는 공백으로 구분한 부모 id.
// eff 값은 레벨당: 배수 키는 노드마다 (1 + v·lv)를 곱하고, 합 키는 Σ v·lv 로 읽는다 (각 세계 로직이 키마다 정한다).
(function () {
  // 반복 노드(max > 1)는 비용이 가파르게 오르고 레벨 상한이 높다: 세계 진행(지수)과 균형을 맞추려는 것
  const N = (id, x, y, req, t, n, d, max, base, g, eff, more) => {
    if (max > 1 && g > 1) { g = 1 + (g - 1) * 1.3; if (max >= 10) max = Math.round(max * 1.6); }
    return Object.assign({ id, x, y, req: req ? req.split(' ') : [], t, n, d, max, base, g, eff }, more);
  };
  const S = () => G.S;

  // ───── 판타지 (골드) ─────
  // 북: 원정대(동료 해금 → 그 동료 전용 가지, 끝에 ★택1 짝) · 남: 기사(리더)와 파티 전체 · 동: 벼락(클릭) · 서: 재화
  // 짝 노드(pair)는 둘 다 배울 수 있고 효과는 고른 하나만, 바꾸기는 공짜.
  const PAIR = (id, x, y, req, t, n, d, base, eff, pair) => N(id, x, y, req, t, n, d, 1, base, 1, eff, { pair, notable: true });
  const NOTE = (id, x, y, req, t, n, d, base, eff) => N(id, x, y, req, t, n, d, 1, base, 1, eff, { notable: true });
  G.Tree.define('fantasy', [
    N('root', 0, 0, '', 'knight', '모험의 시작', '', 1, 0, 1, {}, { root: true }),

    // ── 북: 원정대 ──
    N('party', 0, -1.9, 'root', 'u_legend', '원정대', '동료 3명까지 출전', 1, 20, 1, {}),
    // 레인저
    N('archer', -2.92, -3.13, 'party', 'u_archer', '레인저', '합류 · 원거리', 1, 40, 1, { ally_archer: 1 }),
    N('r_atk', -3.97, -3.52, 'archer', 'fx_arrow', '날카로운 화살촉', '레인저 피해 +25%', 15, 60, 1.45, { archerAtk: 0.25 }),
    N('r_range', -5.16, -3.9, 'r_atk', 'w_bow', '매의 눈', '사거리 +1칸 · 연사 +10%', 5, 500, 2, { r_range: 1 }),
    PAIR('r_pierce', -6.31, -3.56, 'r_range', 'fx_arrow', '관통 화살', '뒤의 적 2마리까지 꿰뚫는다', 4000, { r_pierce: 1 }, 'r_pair'),
    PAIR('r_poison', -5.98, -4.75, 'r_range', 'r_stew', '독화살', '4초간 초당 피해 30%', 4000, { r_poison: 1 }, 'r_pair'),
    // 음유시인
    N('bard', -1.47, -3.26, 'party', 'u_bard', '음유시인', '합류 · 노래: 피해 ×1.5 ↔ 골드 ×2', 1, 150, 1, { ally_bard: 1 }),
    N('songDur', -2.34, -4.05, 'bard', 'fx_song', '앙코르', '노래·축복 지속 +20%', 16, 1500, 1.8, { songDur: 0.2 }),
    N('songPow', -3.15, -4.75, 'songDur', 'b_atk', '격정', '용맹의 노래 피해 배율 +0.1', 10, 4000, 1.8, { songPow: 0.1 }),
    PAIR('songWar', -4.39, -4.98, 'songPow', 'b_fury', '전쟁의 북', '노래 추가: 피해 ×3', 30000, { songWar: 1 }, 'b_pair'),
    PAIR('songRegen', -3.56, -5.91, 'songPow', 'b_regen', '회복의 노래', '노래 추가: 초당 체력 +4%', 30000, { songRegen: 1 }, 'b_pair'),
    // 수도사
    N('cleric', -0.93, -4.4, 'party', 'u_cleric', '수도사', '합류 · 치유', 1, 300, 1, { ally_cleric: 1 }),
    N('c_heal', -1.27, -5.32, 'cleric', 'fx_holy', '치유술', '수도사 치유량 +20%', 15, 400, 1.5, { clericHeal: 0.2 }),
    N('bless', -1.67, -6.34, 'c_heal', 'b_regen', '축복', '15초마다 10초간 파티 초당 체력 +4%', 1, 800, 1, { bless: 1 }),
    NOTE('heal', -2.05, -7.25, 'bless', 'fx_holy', '치유의 빛', '기술: 파티 체력 50% 회복 (30초)', 3000, { sk_heal: 1 }),
    PAIR('c_revive', -3.01, -7.97, 'heal', 'u_god', '부활 기도', '동료 부활 시간 절반', 20000, { c_revive: 1 }, 'c_pair'),
    PAIR('c_sanct', -1.86, -8.42, 'heal', 'q_peak', '성역', '수도사가 서 있으면 오염 절반', 20000, { c_sanct: 1 }, 'c_pair'),
    // 화염 마법사
    N('mage', 0.02, -3.77, 'party', 'u_mage', '화염 마법사', '합류 · 범위 공격', 1, 1200, 1, { ally_mage: 1 }),
    N('m_atk', 0.05, -4.89, 'mage', 'fx_flame', '불꽃 단련', '마법사 피해 +25%', 15, 1500, 1.45, { mageAtk: 0.25 }),
    N('m_area', 0.09, -5.9, 'm_atk', 'fx_fire', '대폭발', '폭발 범위 +0.3칸', 5, 6000, 2, { m_area: 0.3 }),
    NOTE('meteor', 0.16, -7.01, 'm_area', 'fx_fire', '유성 낙하', '기술: 마법사 공격 ×30 광역 (25초)', 20000, { sk_meteor: 1 }),
    PAIR('m_burn', -0.39, -8.01, 'meteor', 'fx_flame', '화상', '맞은 적이 3초간 초당 피해 25%', 60000, { m_burn: 1 }, 'm_pair'),
    PAIR('m_quick', 0.84, -7.93, 'meteor', 'st_haste', '빠른 영창', '마법사 공격·유성 재사용 -30%', 60000, { m_quick: 1 }, 'm_pair'),
    // 성기사
    N('paladin', 1.02, -4.61, 'party', 'u_paladin', '성기사', '합류 · 탱커', 1, 8000, 1, { ally_paladin: 1 }),
    N('p_hp', 1.49, -5.58, 'paladin', 'u_armor', '성스러운 갑주', '성기사 체력 +30%', 15, 9000, 1.45, { paladinHp: 0.3 }),
    N('p_guard', 1.99, -6.42, 'p_hp', 'd_shield', '방패 막기', '성기사 받는 피해 -6%', 8, 20000, 1.8, { p_guard: 0.06 }),
    PAIR('p_taunt', 2.06, -7.59, 'p_guard', 'u_paladin', '도발', '적이 성기사를 먼저 노린다', 60000, { p_taunt: 1 }, 'p_pair'),
    PAIR('p_counter', 3.09, -6.9, 'p_guard', 'w_hammer', '반격', '받은 피해의 50%를 되돌린다', 60000, { p_counter: 1 }, 'p_pair'),
    // 용기병
    N('dragoon', 1.3, -3.26, 'party', 'u_dragoon', '용기병', '합류 · 강타', 1, 60000, 1, { ally_dragoon: 1 }),
    N('d_atk', 2.09, -4.07, 'dragoon', 'w_spear', '용의 창', '용기병 피해 +25%', 15, 70000, 1.45, { dragoonAtk: 0.25 }),
    N('d_crit', 2.83, -4.76, 'd_atk', 'g_dagger', '급소 꿰뚫기', '용기병 치명 +6%', 6, 150000, 1.8, { d_crit: 0.06 }),
    PAIR('d_dash', 3.18, -5.91, 'd_crit', 'a_escape', '돌진', '6칸 안 적에게 뛰어들어 첫 타 ×3', 4e5, { d_dash: 1 }, 'd_pair'),
    PAIR('d_exec', 4.04, -5.01, 'd_crit', 'u_sword', '처형', '체력 25% 이하 적은 즉사', 4e5, { d_exec: 1 }, 'd_pair'),
    // 대현자
    N('archmage', 2.79, -3.18, 'party', 'u_archmage', '대현자', '합류 · 연쇄 번개', 1, 400000, 1, { ally_archmage: 1 }),
    N('a_atk', 3.8, -3.58, 'archmage', 'fx_zap', '번개 숙련', '대현자 피해 +25%', 15, 450000, 1.45, { archmageAtk: 0.25 }),
    N('a_chain', 4.97, -3.95, 'a_atk', 'a_thunder', '연쇄 확장', '연쇄 +1', 3, 1e6, 3, { a_chain: 1 }),
    PAIR('a_warp', 5.78, -4.78, 'a_chain', 'st_haste', '시간 왜곡', '15초마다 5초간 파티 공격 속도 +50%', 3e6, { a_warp: 1 }, 'a_pair'),
    PAIR('a_overload', 6.09, -3.58, 'a_chain', 'fx_zap', '과부하', '연쇄 +2, 튈 때 피해가 줄지 않는다', 3e6, { a_overload: 1 }, 'a_pair'),

    // ── 남: 기사(리더)와 파티 전체 (동료 공격력·체력은 기사를 따라간다) ──
    N('atk1', 0.9, 1.4, 'root', 'u_sword', '예리한 검', '파티 공격력 +15%', 10, 10, 1.45, { atk: 0.15 }),
    N('aspd1', 1.9, 2.3, 'atk1', 'n_auto_duel', '연속 베기', '파티 공격 속도 +8%', 10, 60, 1.6, { aspd: 0.08 }),
    N('crit1', 0.9, 2.6, 'atk1', 'g_dagger', '급소 찌르기', '기사 치명 +3%', 10, 80, 1.6, { crit: 0.03 }),
    N('atk2', 1.6, 3.5, 'aspd1 crit1', 'u_sword', '명검 단련', '파티 공격력 +20%', 15, 300, 1.5, { atk: 0.2 }),
    N('critd', 2.7, 4, 'atk2', 'g_dagger', '일격필살', '치명 피해 +25%', 15, 1500, 1.6, { critd: 0.25 }),
    N('atk3', 1.6, 4.7, 'atk2', 'u_sword', '성검', '파티 공격력 +35%', 20, 10000, 1.6, { atk: 0.35 }),
    N('atk4', 1.6, 6, 'atk3', 'u_sword', '용살검', '파티 공격력 +50%', 25, 500000, 1.7, { atk: 0.5 }),
    N('hp1', -0.9, 1.4, 'root', 'u_armor', '판금 갑옷', '파티 체력 +18%', 10, 15, 1.45, { hp: 0.18 }),
    N('regen1', -1.9, 2.3, 'hp1', 'r_stew', '붕대', '초당 체력 회복 +0.5%', 10, 120, 1.6, { regen: 0.005 }),
    N('armor1', -0.9, 2.6, 'hp1', 'd_shield', '방패술', '기사 받는 피해 -3% (최대 75%)', 15, 200, 1.55, { armor: 0.03 }),
    N('hp2', -1.6, 3.5, 'regen1 armor1', 'u_armor', '미스릴 사슬', '파티 체력 +25%', 15, 1000, 1.5, { hp: 0.25 }),
    N('hp3', -1.6, 4.7, 'hp2', 'i_scale', '용비늘 갑주', '파티 체력 +40%', 25, 100000, 1.6, { hp: 0.4 }),
    N('k_pure1', -2.9, 3, 'regen1', 'b_regen', '정화', '오염 피해 -8%', 6, 2000, 1.7, { purify: 0.08 }),
    N('k_pure2', -3.1, 4.2, 'k_pure1', 'fx_holy', '성수', '오염 피해 -10%', 4, 40000, 2, { purify: 0.1 }),
    NOTE('rage', 0, 3.4, 'atk1 hp1', 'r_dragon', '전투 함성', '기술: 10초간 모든 피해 ×2 (40초)', 6000, { sk_rage: 1 }),
    N('allyAtk1', -0.5, 4.4, 'rage', 'u_legend', '전우애', '동료 공격력 +18%', 15, 1500, 1.5, { allyAtk: 0.18 }),
    N('allyHp', 0.5, 4.4, 'rage', 'rl_herb', '진형', '동료 체력 +20%', 15, 1500, 1.5, { allyHp: 0.2 }),
    N('allyAtk2', 0, 5.4, 'allyAtk1 allyHp', 'u_god', '영웅단', '동료 공격력 +35%', 25, 200000, 1.6, { allyAtk: 0.35 }),
    NOTE('autocast', 0, 6.4, 'allyAtk2', 'n_auto_build', '전투 본능', '기술을 재사용마다 알아서 쓴다', 200000, { autocast: 1 }),
    N('slot', 0, 7.4, 'autocast', 'u_legend', '대원정', '출전 동료 +1 (최대 4명)', 1, 2e6, 1, { slot: 1 }),
    NOTE('k_cleave', 2.8, 2.6, 'aspd1', 'w_waraxe', '휩쓸기', '기사 공격이 옆의 적에게도 50%', 3000, { k_cleave: 1 }),
    N('k_leech', 0, 2.2, 'hp1', 'r_dragon', '흡혈', '기사가 준 피해의 2%만큼 회복', 5, 800, 1.9, { k_leech: 0.02 }),
    NOTE('k_undying', -2.7, 5.7, 'hp3', 'u_armor', '불굴', '층마다 한 번, 기사가 쓰러질 때 체력 30%로 버틴다', 3e5, { k_undying: 1 }),
    N('k_crit2', 2.8, 5.3, 'critd', 'g_dagger', '약점 간파', '기사 치명 +2%', 10, 2e5, 1.7, { crit: 0.02 }),
    NOTE('k_assault', 0, 8.5, 'slot', 'u_god', '총공세', '기술: 열어 둔 동료 전원이 15초간 함께 싸운다 (90초)', 5e6, { sk_assault: 1 }),
    N('k_assault2', 1.1, 9.4, 'k_assault', 'st_haste', '끝없는 진격', '총공세 지속 +3초', 5, 8e6, 2.2, { k_assault2: 3 }),
    N('k_rally', -1.1, 9.4, 'k_assault', 'b_fury', '함성의 물결', '총공세 중 피해 +10%', 10, 8e6, 1.9, { k_rally: 0.1 }),

    // ── 동: 벼락 (클릭) ──
    N('smite1', 1.3, 0, 'root', 'n_auto_break', '벼락 일격', '벼락 피해 +30%', 20, 20, 1.45, { smite: 0.3 }),
    N('smiteR', 2.4, -0.6, 'smite1', 'a_thunder', '낙뢰', '벼락 범위 +0.25칸', 6, 400, 2, { smiteR: 0.25 }),
    N('s_cd', 2.4, 0.6, 'smite1', 'st_haste', '연속 낙뢰', '벼락 재사용 -10%', 5, 600, 2, { s_cd: 0.1 }),
    NOTE('s_chain', 3.6, 0, 'smiteR s_cd', 'fx_zap', '연쇄 번개', '벼락이 주변 2마리로 튄다 (60%)', 3000, { s_chain: 1 }),
    NOTE('s_shock', 4.7, -0.7, 's_chain', 'a_thunder', '감전', '맞은 적은 4초간 받는 피해 +30%', 12000, { s_shock: 1 }),
    NOTE('s_focus', 4.7, 0.7, 's_chain', 'u_legend', '집중 표적', '파티가 벼락 맞은 적을 노린다 · 피해 +20%', 12000, { s_focus: 1 }),
    NOTE('s_exec', 5.8, -0.7, 's_shock', 'u_sword', '심판', '벼락 맞은 뒤 체력 20% 이하면 즉사', 60000, { s_exec: 1 }),
    N('s_crit', 5.8, 0.7, 's_focus', 'g_dagger', '천둥 강타', '벼락 치명(×3) 확률 +8%', 5, 40000, 1.9, { s_crit: 0.08 }),
    NOTE('s_storm', 7, 0, 's_exec s_crit', 'fx_storm', '낙뢰 폭풍', '8초마다 근처 적에게 자동 벼락', 3e5, { s_storm: 1 }),
    N('s_storm2', 8.1, 0, 's_storm', 'fx_storm', '폭풍의 눈', '자동 벼락 간격 -12%', 5, 1e6, 2, { s_storm2: 0.12 }),
    NOTE('s_stun', 3.6, -1.4, 'smiteR', 'a_seal', '기절', '벼락 맞은 적은 1초간 멈춘다', 2500, { s_stun: 1 }),
    NOTE('s_charge', 3.6, 1.4, 's_cd', 'n_auto_break', '벼락 충전', '벼락을 2번까지 모아 연달아 쓴다', 2500, { s_charge: 1 }),
    N('s_power2', 6.9, -1.4, 's_exec', 'a_thunder', '뇌신의 분노', '벼락 피해 +25%', 10, 2e5, 1.8, { smite: 0.25 }),
    NOTE('s_over', 6.9, 1.4, 's_crit', 'fx_zap', '과충전', '5번째 벼락마다 피해 ×5', 1.5e5, { s_over: 1 }),
    NOTE('s_mark', 8.1, -1.3, 's_storm', 'ui_gold', '번개 표식', '벼락으로 쓰러뜨린 적은 골드 ×1.5', 1.5e6, { s_mark: 1 }),
    N('s_r2', 8.1, 1.3, 's_storm', 'a_thunder', '광역 낙뢰', '벼락 범위 +0.25칸', 4, 1.5e6, 2.2, { smiteR: 0.25 }),
    NOTE('s_storm3', 9.3, 0, 's_storm2', 'fx_storm', '폭풍 쌍뢰', '자동 벼락이 2발씩 떨어진다', 5e6, { s_storm3: 1 }),
    N('s_lv1', 1.6, -1.3, 'smite1', 'n_auto_break', '전류 강화', '벼락 피해 +10%', 10, 3000, 1.7, { smite: 0.1 }),
    N('s_bounce', 4.7, -2.1, 's_stun s_shock', 'fx_zap', '튕기는 번개', '연쇄 번개 +1마리 · 거리 +1칸', 2, 20000, 4, { s_bounce: 1 }),
    NOTE('s_static', 4.7, 2.1, 's_charge s_focus', 'st_haste', '정전기 장막', '벼락을 내리면 3초간 파티 공격 속도 +20%', 15000, { s_static: 1 }),
    NOTE('s_purge', 5.9, 2.2, 's_static', 'b_regen', '정화의 벼락', '벼락이 적을 맞힐 때마다 파티 체력 +1% (한 번에 5%까지)', 80000, { s_purge: 1 }),
    N('s_boss', 5.9, -2.2, 's_bounce', 'b_dragon', '거인 사냥', '보스에게 벼락 피해 +50%', 5, 80000, 2, { s_boss: 0.5 }),
    N('s_storm_r', 9.3, 1.3, 's_storm2', 'fx_storm', '폭풍 범위', '자동 벼락이 2칸 더 멀리까지', 3, 3e6, 2.5, { s_storm_r: 2 }),

    // ── 서: 재화 ──
    N('gold1', -1.3, 0, 'root', 'ui_gold', '약탈', '골드 +15%', 15, 25, 1.5, { gold: 0.15 }),
    N('speed1', -2.4, -0.6, 'gold1', 'a_escape', '가벼운 발걸음', '이동 속도 +8%', 8, 50, 1.7, { speed: 0.08 }),
    N('g_boss', -2.4, 0.6, 'gold1', 'b_goblinchief', '현상금', '보스 골드 +100%', 5, 300, 2.2, { g_boss: 1 }),
    N('gold2', -3.6, 0, 'speed1 g_boss', 'ui_gold', '보물 사냥꾼', '골드 +30%', 20, 5000, 1.55, { gold: 0.3 }),
    N('g_chest', -4.7, -0.7, 'gold2', 'x_chest', '보물상자', '층마다 보물상자 +1', 3, 2000, 4, { g_chest: 1 }),
    NOTE('g_mimic', -5.8, -1.3, 'g_chest', 'm_mimic', '미믹 사냥', '상자 30%가 미믹: 잡으면 골드 ×5', 20000, { g_mimic: 1 }),
    N('g_lucky', -6.9, -0.7, 'g_chest', 'x_chest', '행운의 열쇠', '상자 골드 +50%', 10, 30000, 1.7, { g_lucky: 0.5 }),
    NOTE('g_skip', -4.7, 0.7, 'gold2', 'f_stairs', '층 도약', '20초 안에 층을 정리하면 한 층 더 내려간다', 1.5e5, { g_skip: 1 }),
    N('essf', -5.8, 0.9, 'g_skip', 'ui_ess', '심연의 기운', '이 세계의 정수 +15%', 10, 50000, 1.9, { ess: 0.15 }),
    N('g_kill', -3.6, -1.4, 'speed1', 'u_sword', '전리품', '처치 골드 +10%', 10, 1500, 1.6, { gold: 0.1 }),
    NOTE('g_jack', -3.6, 1.4, 'g_boss', 'b_gold', '대박', '처치의 3%는 골드 ×5', 4000, { g_jack: 1 }),
    NOTE('g_goblin', -6.9, -1.9, 'g_mimic', 'm_ggoblin', '황금 고블린', '층마다 25% 확률로 나타나 달아난다 · 잡으면 골드 ×30', 2e5, { g_goblin: 1 }),
    N('g_bargain', -6.9, 0.3, 'g_lucky g_skip', 'ui_gold', '흥정', '이 트리 비용 -3%', 10, 1e5, 1.8, { g_bargain: 0.03 }),
    N('g_floor', -4.7, 1.9, 'g_skip', 'f_stairs', '층 보상', '층을 내려갈 때 정수 +10%', 10, 2e5, 1.9, { floorEss: 0.1 }),
    N('ess2', -8, 0.9, 'essf g_bargain', 'ui_ess', '심연의 정수', '이 세계의 정수 +15%', 10, 2e6, 2.2, { ess: 0.15 }),
    N('g_lucky2', -5.2, -2, 'g_mimic', 'x_chest', '상자 장인', '상자 골드 +100%', 5, 2e5, 2, { g_lucky: 1 }),
    N('g_mimic2', -6.1, -2.6, 'g_lucky2', 'm_mimic', '미믹 감정', '미믹 보상 ×10 (원래 ×5)', 1, 8e5, 1, { g_mimic2: 1 }),
    N('g_goblin2', -8, -1.9, 'g_goblin', 'm_ggoblin', '고블린 사냥꾼', '황금 고블린 등장 확률 +15%', 3, 6e5, 2.5, { g_goblin2: 0.15 }),
    NOTE('g_fever', -3.6, 2.4, 'g_boss', 'b_gold', '황금열', '30마리 처치마다 10초간 골드 ×2', 6000, { g_fever: 1 }),
    N('g_bossEss', -4.7, 3.0, 'g_fever g_jack', 'b_slimeking', '보스 정수', '보스 층 정수 +20%', 5, 1e5, 2.5, { bossEss: 0.2 }),
    N('gold3', -8, 2.2, 'ess2', 'ui_gold', '용의 보고', '골드 +25%', 10, 3e6, 2, { gold: 0.25 }),
  ], { get: () => S().w.fantasy.gold, spend: n => { S().w.fantasy.gold -= n; }, tile: 'ui_gold', name: '골드' },
  { costMul: st => Math.max(0.5, 1 - G.Tree.add('fantasy', st, 'g_bargain')) });

  // ───── 무협 (깨달음: 회귀해도 남는다) ─────
  // ───── 무협 (깨달음) ─────
  // 북: 진로(왼쪽 위 화산 · 오른쪽 위 마교) · 남: 무공 계열(심법·외공·경공·잡학) · 동: 회귀 · 서: 강호(활동·여정·특산)
  G.Tree.define('wuxia', [
    N('root', 0, 0, '', 'w_wuxia', '회귀자', '', 1, 0, 1, {}, { root: true }),

    // ── 북: 진로 (왼쪽 위 정파 · 위 사파 · 오른쪽 위 마교). 진로 전용 노드(<진로>_plum 등)는 지금 진로일 때만 켜진다 ──
    N('path', 0, -1.8, 'root', 'j_nangin', '강호행', '명성 +15%', 10, 2, 1.6, { fame: 0.15 }),
    // 정파
    N('jeong_1', -2.20, -2.67, 'path', 'j_jeja', '정파 입문', '명성 +20%', 10, 4, 1.6, { fame: 0.2 }),
    N('jeong_work', -3.39, -2.85, 'jeong_1', 'j_jangro', '문파 임무', '일·임무 명성 +30%', 10, 8, 1.7, { work: 0.3 }),
    N('jeong_xp', -2.17, -3.88, 'jeong_1', 's_naegong', '자하의 기운', '심법 숙련 +25%', 10, 10, 1.7, { xp_sim: 0.25 }),
    NOTE('jeong_sect', -4.42, -3.29, 'jeong_work', 'x_statue', '문파의 지원', '근거지에서 일하면 명성 ×2', 120, { jeong_sect: 1 }),
    N('jeong_combat', -2.80, -4.78, 'jeong_xp', 's_geom', '매화검로', '전투력 +25%', 10, 25, 1.8, { combat: 0.25 }),
    NOTE('jeong_plum', -4, -4.82, 'jeong_sect jeong_combat', 'v_plum', '매화개화', '이 진로면 전투력 ×1.3', 300, { jeong_plum: 1 }),
    NOTE('jeong_blood', -5.35, -3.94, 'jeong_sect', 'a_sword', '마교 토벌령', '이 진로면 원정(녹림·마교 토벌) 명성 ×2', 800, { jeong_blood: 1 }),
    N('jeong_raid', -6.06, -4.78, 'jeong_blood', 'w_katana', '정의의 검', '원정 명성 +40%', 10, 1500, 1.9, { raid: 0.4 }),
    PAIR('jeong_pa', -4.48, -5.85, 'jeong_plum', 'ww_sword2', '검의 길', '전투력 +50%', 2500, { combat: 0.5 }, 'jeong_pair'),
    PAIR('jeong_pb', -3.31, -6.18, 'jeong_plum', 'q_qi', '기의 길', '무공 숙련 +30%', 2500, { sxp: 0.3 }, 'jeong_pair'),
    N('jeong_top', -5.72, -6.25, 'jeong_raid jeong_pa jeong_pb', 'j_geomseon', '매화검선의 꿈', '명성 +50%', 10, 8000, 2, { fame: 0.5 }),
    // 사파
    N('sa_1', 0, -4.30, 'path', 'j_pyosa', '녹림 입산', '명성 +20%', 10, 4, 1.6, { fame: 0.2 }),
    N('sa_work', -0.80, -5.20, 'sa_1', 'x_table', '산채 일', '일·임무 명성 +30%', 10, 8, 1.7, { work: 0.3 }),
    N('sa_xp', 0.80, -5.20, 'sa_1', 's_magong', '흑살의 숨', '외공 숙련 +25%', 10, 10, 1.7, { xp_oe: 0.25 }),
    NOTE('sa_sect', -1.30, -6.20, 'sa_work', 'wx_bandit0', '산채의 의리', '근거지에서 일하면 명성 ×2', 120, { sa_sect: 1 }),
    N('sa_combat', 0.90, -6.30, 'sa_xp', 's_geom', '녹림도로', '전투력 +25%', 10, 25, 1.8, { combat: 0.25 }),
    NOTE('sa_plum', 0, -7.10, 'sa_sect sa_combat', 'w_waraxe', '도객의 혼', '이 진로면 전투력 ×1.3', 300, { sa_plum: 1 }),
    NOTE('sa_blood', -1.60, -7.30, 'sa_sect', 'w_knife', '털이꾼', '이 진로면 원정(화산 털기·무당 습격) 명성 ×2', 800, { sa_blood: 1 }),
    N('sa_raid', -1.60, -8.40, 'sa_blood', 'w_katana', '약탈', '원정 명성 +40%', 10, 1500, 1.9, { raid: 0.4 }),
    PAIR('sa_pa', 0.30, -8.20, 'sa_plum', 'm_demon', '공포', '원정 적 체력 -30%', 2500, { sa_fear: 1 }, 'sa_pair'),
    PAIR('sa_pb', 1.40, -7.70, 'sa_plum', 'wa_crown', '두목의 몫', '녹봉 ×1.5', 2500, { sa_dom: 1 }, 'sa_pair'),
    N('sa_top', -0.40, -9.30, 'sa_raid sa_pa sa_pb', 'j_geomseon', '사왕의 꿈', '명성 +50%', 10, 8000, 2, { fame: 0.5 }),
    // 마교
    N('ma_1', 2.20, -2.67, 'path', 'j_nangin', '흑도 입문', '명성 +20%', 10, 4, 1.6, { fame: 0.2 }),
    N('ma_work', 2.17, -3.88, 'ma_1', 'x_altar', '교단 임무', '일·임무 명성 +30%', 10, 8, 1.7, { work: 0.3 }),
    N('ma_xp', 3.39, -2.85, 'ma_1', 's_magong', '천마의 숨', '심법 숙련 +25%', 10, 10, 1.7, { xp_sim: 0.25 }),
    NOTE('ma_sect', 2.43, -4.96, 'ma_work', 'r_dragon', '교단의 지원', '근거지에서 일하면 명성 ×2', 120, { ma_sect: 1 }),
    N('ma_combat', 4.17, -3.63, 'ma_xp', 's_geom', '혈영검로', '전투력 +25%', 10, 25, 1.8, { combat: 0.25 }),
    NOTE('ma_plum', 4, -4.82, 'ma_sect ma_combat', 'fx_fire', '혈마의 힘', '이 진로면 전투력 ×1.3', 300, { ma_plum: 1 }),
    NOTE('ma_blood', 2.90, -6, 'ma_sect', 'fx_fire', '혈겁', '이 진로면 원정(화산·무당 습격) 명성 ×2', 800, { ma_blood: 1 }),
    N('ma_raid', 3.61, -6.84, 'ma_blood', 'w_duel', '혈살 원정', '원정 명성 +40%', 10, 1500, 1.9, { raid: 0.4 }),
    PAIR('ma_pa', 4.94, -5.47, 'ma_plum', 'r_dragon', '천마 해방', '마교 무공의 천수 감소 절반', 2500, { ma_free: 1 }, 'ma_pair'),
    PAIR('ma_pb', 5.46, -4.38, 'ma_plum', 'wa_crown', '군림', '녹봉 ×1.5', 2500, { ma_dom: 1 }, 'ma_pair'),
    N('ma_top', 5.11, -6.76, 'ma_raid ma_pa ma_pb', 'j_geomseon', '천마신의 꿈', '명성 +50%', 10, 8000, 2, { fame: 0.5 }),

    // ── 남: 무공 계열 ──
    N('mu', 0, 1.8, 'root', 's_tuna', '무학의 길', '무공 숙련 +15%', 15, 1, 1.45, { sxp: 0.15 }),
    N('realm1', 0, 3.8, 'mu', 'q_qi', '경지 깨달음', '경지 문턱 -4%', 10, 30, 1.9, { realmEase: 0.04 }),
    NOTE('realm2', 0, 5.1, 'realm1', 'a_dao', '심즉검', '경지 문턱 -10%', 600, { realmEase: 0.1 }),
    // 심법
    N('sim1', -1.4, 3.1, 'mu', 's_naegong', '운기조식', '심법 숙련 +25%', 15, 3, 1.5, { xp_sim: 0.25 }),
    N('sim2', -2.5, 3.7, 'sim1', 'q_qi', '대주천', '심법 숙련 +40%', 10, 50, 1.8, { xp_sim: 0.4 }),
    NOTE('sim_cycle', -3.5, 3.1, 'sim2', 'a_gong', '주천순환', '심법을 익히면 이 지역 다른 심법도 25%', 400, { sim_cycle: 1 }),
    N('sim_hp', -2.4, 4.8, 'sim2', 'u_armor', '호신강기', '체력 +25%', 10, 120, 1.8, { hp: 0.25 }),
    // 외공
    N('oe1', 1.4, 3.1, 'mu', 's_geom', '초식 연마', '외공 숙련 +25%', 15, 3, 1.5, { xp_oe: 0.25 }),
    N('oe2', 2.5, 3.7, 'oe1', 'ww_sword', '검기', '전투력 +30%', 10, 40, 1.8, { combat: 0.3 }),
    NOTE('oe_combo', 3.5, 3.1, 'oe2', 'a_sword', '연환검', '공격 속도 +30%', 400, { oe_combo: 1 }),
    N('oe3', 2.4, 4.8, 'oe2', 'w_duel', '검강', '외공 숙련 +40%', 10, 120, 1.8, { xp_oe: 0.4 }),
    // 경공
    N('gg1', -1.1, 5.6, 'realm1 sim_hp', 's_gyeong', '경신술', '경공 숙련 +30%', 10, 40, 1.7, { xp_gg: 0.3 }),
    N('gg2', -2.3, 6.2, 'gg1', 'st_haste', '답설무흔', '이동·여정 +15%', 10, 100, 1.8, { walk: 0.15 }),
    NOTE('gg_fly', -3.5, 5.8, 'gg2', 'a_escape', '초상비', '여정 +25% 더 빠르게', 900, { gg_fly: 1 }),
    // 잡학
    N('jh1', 1.1, 5.6, 'realm1 oe3', 's_yangsaeng', '잡학 박식', '잡학 숙련 +30%', 10, 40, 1.7, { xp_jh: 0.3 }),
    N('yang', 2.3, 6.2, 'jh1', 's_yangsaeng', '양생술 비전', '무공 「양생술」을 익힐 수 있다', 1, 60, 1, { unlock_yang: 1 }),
    NOTE('jh_med', 3.5, 5.8, 'yang', 'q_herb', '의술', '천수 +3년 · 쓰러진 뒤 회복 2배', 900, { jh_med: 1 }),
    N('magong', 3.6, 4.5, 'oe_combo jh1', 's_magong', '천마혈공 비급', '무공 「천마혈공」을 익힐 수 있다', 1, 700, 1, { unlock_magong: 1 }),
    PAIR('mu_in', -0.9, 6.6, 'gg1 jh1', 'a_gong', '내가', '심법 숙련 ×1.5', 3000, { xp_sim: 0.5 }, 'mu_pair'),
    PAIR('mu_out', 0.9, 6.6, 'gg1 jh1', 'a_sword', '외가', '외공 숙련 ×1.5', 3000, { xp_oe: 0.5 }, 'mu_pair'),
    N('mu_top', 0, 7.6, 'mu_in mu_out', 'a_dao', '무학대가', '무공 숙련 +40%', 10, 6000, 2, { sxp: 0.4 }),
    N('twin', -1.3, 4.4, 'sim1 realm1', 's_gyeong', '일하며 수련', '활동하는 동안에도 무공을 25%씩 익힌다', 4, 20, 2, { twin: 0.25 }),
    N('elix1', 1.3, 4.4, 'oe1 realm1', 'q_pill', '영단 흡수', '영단 하나의 효과 +3%', 10, 25, 1.8, { elixEff: 0.03 }),

    // ── 동: 회귀 ──
    N('reg', 1.4, 0, 'root', 'ui_star', '회귀의 기억', '전생 최고 레벨 보너스 +20%', 10, 1, 1.55, { peak: 0.2 }),
    N('life1', 2.5, 0.6, 'reg', 'it_pill', '섭생', '천수 +2년', 10, 3, 1.7, { life: 2 }),
    N('young', 2.5, -0.6, 'reg', 'wx_hero0', '조숙', '회귀 나이 -1세 (최소 10세)', 6, 10, 2.3, { young: 1 }),
    N('ins1', 3.6, 0, 'life1 young', 'ui_star', '대오각성', '깨달음 +25%', 10, 20, 1.8, { ins: 0.25 }),
    NOTE('reg_rank', 4.7, -0.7, 'ins1', 'j_pyosa', '전생의 이름', '회귀하면 표사부터 (점소이 건너뜀)', 150, { reg_rank: 1 }),
    N('reg_rank2', 5.8, -1.3, 'reg_rank', 'j_nangin', '전생의 명성', '회귀하면 낭인부터', 1, 2500, 1, { reg_rank: 1 }),
    N('head', 4.7, 0.7, 'ins1', 'c_coin', '숨겨 둔 재물', '회귀하면 명성 +50로 시작', 10, 30, 1.9, { head: 1 }),
    N('peak2', 5.8, 0.2, 'reg_rank head', 'ui_star', '회귀의 축복', '전생 최고 레벨 보너스 +50%', 10, 300, 1.9, { peak: 0.5 }),
    N('life2', 4.6, 1.8, 'head', 'it_daehwan', '반로환동', '천수 +5년', 5, 250, 2.2, { life: 5 }),
    NOTE('reg_soul', 6.9, 0.8, 'peak2', 'wa_halo', '윤회의 깨달음', '깨달음 ×2', 4000, { ins: 1 }),
    PAIR('reg_fast', 7, -0.6, 'peak2', 'wx_hero0', '빠른 회귀', '회귀 나이 -2세', 3000, { young: 2 }, 'reg_pair'),
    PAIR('reg_long', 7.6, 0.2, 'peak2', 'it_pill', '긴 생', '천수 +6년', 3000, { life: 6 }, 'reg_pair'),
    N('essw', 3.6, 1.3, 'life1', 'ui_ess', '천기', '이 세계의 정수 +15%', 10, 200, 1.9, { ess: 0.15 }),
    N('essw2', 6, 1.7, 'life2 reg_soul', 'ui_ess', '천기누설', '이 세계의 정수 +25%', 10, 5000, 2, { ess: 0.25 }),
    N('reg_top', 8.2, 1.2, 'reg_soul essw2', 'j_cheonha', '천년의 회귀', '모든 숙련 +30%', 10, 12000, 2, { sxp: 0.3 }),
    N('ins2', 5.4, -2.2, 'reg_rank', 'ui_star', '깨우침의 날', '깨달음 +40%', 10, 600, 1.9, { ins: 0.4 }),
    N('rankEase', 4.2, -1.9, 'young reg_rank', 'j_jangro', '이름값', '지위에 필요한 명성 -8%', 8, 100, 1.9, { rankEase: 0.08 }),

    // ── 서: 강호 ──
    N('gh', -1.4, 0, 'root', 'c_coin', '강호 출도', '명성 +20%', 15, 1, 1.5, { fame: 0.2 }),
    N('stip1', -2.5, -0.6, 'gh', 'c_coin', '녹봉', '녹봉 +30%', 15, 3, 1.6, { stipend: 0.3 }),
    N('walk', -2.5, 0.6, 'gh', 'st_haste', '경공 입문', '이동·여정 +15%', 10, 4, 1.8, { walk: 0.15 }),
    N('bounty', -3.6, -1.1, 'stip1', 'w_board', '현상금 사냥', '산적 명성 +40%, 무공 숙련 +20%', 10, 15, 1.8, { bounty: 0.4 }),
    PAIR('gh_hero', -4.8, -1.4, 'bounty', 'wx_hero2', '협객', '산적을 쓰러뜨리면 명성 ×3', 400, { gh_hero: 1 }, 'gh_pair'),
    PAIR('gh_merchant', -4.8, -0.3, 'bounty', 'wx_merchant', '상인의 눈', '특산 값 -30%', 400, { gh_merchant: 1 }, 'gh_pair'),
    N('shop1', -3.6, 0.1, 'stip1 walk', 'it_manual', '흥정', '특산 값 -5%', 6, 30, 1.9, { shop: 0.05 }),
    N('duel1', -3.6, 1.3, 'walk', 'w_dummy', '비무 연습', '비무 명성 +50%', 10, 60, 1.8, { duel: 0.5 }),
    NOTE('gh_duelist', -4.8, 1.8, 'duel1', 'a_sword', '비무광', '비무 명성 ×2 더', 700, { duel: 1 }),
    N('raid1', -5.9, -0.9, 'gh_hero gh_merchant', 'w_katana', '원정 대장', '원정 명성 +30%', 10, 600, 1.9, { raid: 0.3 }),
    N('combat_gh', -5.9, 0.4, 'gh_merchant shop1', 'ww_sword', '실전 감각', '전투력 +30%', 10, 150, 1.8, { combat: 0.3 }),
    N('boss1', -5.9, 1.7, 'gh_duelist combat_gh', 'j_cheonha', '천하제일을 향해', '천하제일 고수 체력 -15%', 5, 1500, 2.2, { gh_boss: 1 }),
    N('boss2', -7, 2.3, 'boss1', 'wa_crown', '천하제일의 상', '천하제일 비무 명성 +100%', 10, 4000, 2, { boss: 1 }),
    N('walk2', -2.4, 1.7, 'walk', 'a_escape', '역참', '이동·여정 +20%', 10, 200, 1.9, { walk: 0.2 }),
    N('fame2', -7, -0.2, 'raid1 combat_gh', 'wa_band', '천하의 이름', '명성 +60%', 10, 3000, 2, { fame: 0.6 }),
    N('stip2', -7, -1.5, 'raid1', 'c_coin', '봉록', '녹봉 +60%', 10, 2000, 2, { stipend: 0.6 }),
    NOTE('gh_legend', -8.1, -0.8, 'fame2 stip2', 'u_god', '강호의 전설', '명성 ×2', 9000, { fame: 1 }),
    N('work2', -4, -2, 'bounty', 'x_table', '부지런함', '일·임무 명성 +30%', 10, 120, 1.8, { work: 0.3 }),
    N('gh_top', -8.2, 1.4, 'boss2 gh_legend', 'j_maengju', '무림지존', '명성 +80%', 10, 15000, 2, { fame: 0.8 }),

  ], { get: () => S().w.wuxia.ins, spend: n => { S().w.wuxia.ins -= n; }, tile: 'ui_star', name: '깨달음' });

  // ───── 수선 (영석): 경맥도 ─────
  // 사람 몸 위에 경맥을 그린다. 임맥(가운데 위)은 진법 칸·영기·천겁, 팔다리와 아랫배는 오행 경맥.
  // 경맥의 혈자리를 찍으면 그 오행 진기가 세지고, 끝 혈자리(개통)를 뚫으면 그 오행 진기 ×2.
  const ACU = (id, x, y, req, el, n, base) => N(id, x, y, req, 'e_' + el, n, `${G.D.X.el[el].n} 진기 +20%`, 15, base, 1.5, { [el]: 0.2 });
  const OPEN = (id, x, y, req, el, n, base) => N(id, x, y, req, 'e_' + el, n, `${G.D.X.el[el].n} 진기 ×2`, 1, base, 1, { [el + 'Open']: 1 }, { open: true });
  G.Tree.define('xianxia', [
    N('root', 0, 0, '', 'cultivator', '단전', '', 1, 0, 1, {}, { root: true }),
    // 임맥
    N('slot1', 0, -1.2, 'root', 'q_peak', '기해혈', '진법 칸 +2', 12, 40, 2.6, { slots: 2 }),
    N('qi1', 0, -2.4, 'slot1', 'a_gong', '전중혈', '영기 +25%', 20, 40, 1.45, { qi: 0.25 }),
    N('trib1', 0, -3.6, 'qi1', 'q_aura3', '천돌혈', '천겁 성공률 +3%', 10, 300, 1.65, { trib: 0.03 }),
    N('head', 0, -4.8, 'trib1', 'a_dao', '백회혈', '심마 -40% · 천겁 실패 손실 -30%', 1, 2e4, 1, { demon: 0.4, tribSafe: 0.3 }),
    N('essx', 1.3, -4.5, 'trib1', 'ui_ess', '선연', '이 세계의 정수 +15%', 10, 5e4, 1.9, { ess: 0.15 }),
    // 금: 수태음폐경 (왼팔) — 비검
    ACU('m1', -1.3, -3.0, 'qi1', 'metal', '중부혈', 25),
    ACU('m2', -2.3, -2.3, 'm1', 'metal', '척택혈', 250),
    ACU('m3', -3.1, -1.4, 'm2', 'metal', '열결혈', 2500),
    OPEN('mOpen', -3.7, -0.4, 'm3', 'metal', '소상혈 · 폐경 개통', 3e4),
    N('fly1', -2.6, -3.5, 'm1', 'fx_sword', '비검술', '비검 피해 +30%', 15, 30, 1.5, { fly: 0.3 }),
    N('fly2', -3.8, -3.2, 'fly1', 'a_escape', '만검귀종', '비검이 2마리 더 꿰뚫는다', 1, 6000, 1, { flyChain: 1 }),
    N('beast1', -4.6, -2.2, 'fly2', 'q_beast', '요수 사냥', '요수 영석 +35%', 15, 100, 1.55, { beast: 0.35 }),
    // 화: 수소음심경 (오른팔) — 제자·연단
    ACU('f1', 1.3, -3.0, 'qi1', 'fire', '극천혈', 25),
    ACU('f2', 2.3, -2.3, 'f1', 'fire', '청령혈', 250),
    ACU('f3', 3.1, -1.4, 'f2', 'fire', '신문혈', 2500),
    OPEN('fOpen', 3.7, -0.4, 'f3', 'fire', '소충혈 · 심경 개통', 3e4),
    N('disc1', 2.6, -3.5, 'f1', 'q_disciple', '제자 거두기', '제자 +1', 6, 60, 3, { disciple: 1 }),
    // 목: 족궐음간경 (왼다리)
    ACU('w1', -0.9, 1.3, 'root', 'wood', '기문혈', 20),
    ACU('w2', -1.1, 2.5, 'w1', 'wood', '곡천혈', 200),
    ACU('w3', -1.3, 3.7, 'w2', 'wood', '태충혈', 2000),
    OPEN('wOpen', -1.5, 4.9, 'w3', 'wood', '대돈혈 · 간경 개통', 2e4),
    // 수: 족소음신경 (오른다리) — 영기
    ACU('a1', 0.9, 1.3, 'root', 'water', '수부혈', 10),
    ACU('a2', 1.1, 2.5, 'a1', 'water', '음곡혈', 100),
    ACU('a3', 1.3, 3.7, 'a2', 'water', '태계혈', 1000),
    OPEN('aOpen', 1.5, 4.9, 'a3', 'water', '용천혈 · 신경 개통', 1.5e4),
    // 토: 족태음비경 (아랫배)
    ACU('t1', 0, 1.7, 'root', 'earth', '대횡혈', 20),
    ACU('t2', 0, 2.9, 't1', 'earth', '혈해혈', 200),
    ACU('t3', 0, 4.1, 't2', 'earth', '삼음교', 2000),
    OPEN('tOpen', 0, 5.3, 't3', 'earth', '은백혈 · 비경 개통', 2e4),
  ], { get: () => S().w.xianxia.stone, spend: n => { S().w.xianxia.stone -= n; }, tile: 'q_stone', name: '영석' }, {
    // 몸 실루엣 (트리 뒤 배경). P(x, y) → 화면 좌표
    bg(P, U) {
      const pl = pts => pts.map(([x, y]) => P(x, y).join(',')).join(' ');
      const [hx, hy] = P(0, -5.9);
      const limb = pts => `<polyline points="${pl(pts)}" />`;
      return `<g class="body">
        <circle cx="${hx}" cy="${hy}" r="${U * 0.6}" />
        <polygon points="${pl([[-1.4, -3.3], [1.4, -3.3], [1.1, 0.9], [-1.1, 0.9]])}" />
        ${limb([[0, -5.3], [0, -3.3]])}
        ${limb([[-1.4, -3.2], [-2.4, -2.3], [-3.2, -1.3], [-3.8, -0.1]])}
        ${limb([[1.4, -3.2], [2.4, -2.3], [3.2, -1.3], [3.8, -0.1]])}
        ${limb([[-0.7, 0.9], [-1.0, 2.5], [-1.3, 3.9], [-1.6, 5.6]])}
        ${limb([[0.7, 0.9], [1.0, 2.5], [1.3, 3.9], [1.6, 5.6]])}
        <circle class="dantian" cx="${P(0, 0)[0]}" cy="${P(0, 0)[1]}" r="${U * 0.55}" />
      </g>`;
    },
  });

  // ───── SF (크레딧) ─────
  G.Tree.define('scifi', [
    N('root', 0, 0, '', 's_core', '방어 사령부', '', 1, 0, 1, {}, { root: true }),
    N('laser1', 1.2, -0.6, 'root', 't_laser', '펄스 증폭', '레이저 피해 +25%', 20, 15, 1.45, { laser: 0.25 }),
    N('rail', 2.3, -1.4, 'laser1', 't_rail', '레일건', '포탑 「레일건」 건설 가능 (관통)', 1, 150, 1, { t_rail: 1 }),
    N('rail1', 3.4, -2.0, 'rail', 't_rail', '가속 코일', '레일건 피해 +30%', 20, 600, 1.5, { rail: 0.3 }),
    N('cryo', 1.2, 0.6, 'root', 't_cryo', '냉각 투사기', '포탑 「냉각 투사기」 건설 가능 (감속)', 1, 250, 1, { t_cryo: 1 }),
    N('cryo1', 2.3, 1.3, 'cryo', 't_cryo', '절대영도', '냉각 피해 +30%, 감속 +5%', 15, 800, 1.5, { cryo: 0.3, slow: 0.05 }),
    N('mortar', 3.4, 0, 'rail cryo', 't_mortar', '플라즈마 박격포', '포탑 「박격포」 건설 가능 (범위)', 1, 2000, 1, { t_mortar: 1 }),
    N('mortar1', 4.6, -0.6, 'mortar', 't_mortar', '고폭탄', '박격포 피해 +30%', 20, 6000, 1.5, { mortar: 0.3 }),
    N('tesla', 4.6, 0.8, 'mortar', 't_tesla', '테슬라 코일', '포탑 「테슬라」 건설 가능 (연쇄)', 1, 3e4, 1, { t_tesla: 1 }),
    N('tesla1', 5.8, 1.4, 'tesla', 't_tesla', '초전도', '테슬라 피해 +30%', 20, 1e5, 1.5, { tesla: 0.3 }),
    N('over', 5.8, -0.2, 'mortar1 tesla', 'rs_overclock', '오버클럭', '모든 포탑 피해 +30%', 25, 3e5, 1.6, { allDmg: 0.3 }),
    N('rate', 3.4, -3.0, 'rail1', 'rs_regen', '자동 장전', '모든 포탑 연사 +6%', 10, 2e4, 1.7, { rate: 0.06 }),
    N('pads1', 0, -1.2, 'root', 'rs_slots', '포대 증설 I', '포대 자리 +2', 1, 120, 1, { pads: 2 }),
    N('pads2', 0, -2.4, 'pads1', 'rs_slots', '포대 증설 II', '포대 자리 +2', 1, 3000, 1, { pads: 2 }),
    N('pads3', 0, -3.6, 'pads2', 'rs_slots', '포대 증설 III', '포대 자리 +3', 1, 2e5, 1, { pads: 3 }),
    N('core1', -1.2, 0.6, 'root', 'rs_core', '코어 장갑', '코어 내구도 +25%', 15, 40, 1.5, { core: 0.25 }),
    N('regen', -2.3, 1.3, 'core1', 'rs_regen', '나노 수리', '코어 초당 1% 수리', 10, 300, 1.6, { coreRegen: 0.01 }),
    N('salv1', -1.2, -0.6, 'root', 'rs_salvage', '잔해 회수', '크레딧 +20%', 20, 30, 1.5, { credit: 0.2 }),
    N('strike1', -2.3, -1.3, 'salv1', 'rs_overclock', '궤도 폭격', '폭격(클릭) 피해 +35%', 20, 60, 1.5, { strike: 0.35 }),
    N('strikeCd', -3.4, -2.0, 'strike1', 'n_sands', '위성 재정렬', '폭격 재사용 -8%', 8, 800, 1.8, { strikeCd: 0.08 }),
    N('esss', -3.4, 0.6, 'salv1 regen', 'ui_ess', '전투 기록 분석', '이 세계의 정수 +15%', 10, 5e4, 1.9, { ess: 0.15 }),
  ], { get: () => S().w.scifi.credits, spend: n => { S().w.scifi.credits -= n; }, tile: 's_credit', name: '크레딧' });

  // ───── 크툴루 (동전): 낚시 ─────
  G.Tree.define('cthulhu', [
    N('root', 0, 0, '', 'w_cthulhu', '낡은 어선', '', 1, 0, 1, {}, { root: true }),
    // 아래: 줄 (깊이)
    N('line1', 0, 1.2, 'root', 'item_line', '낚싯줄', '+10m', 40, 15, 1.4, { line: 2 }),
    N('line2', 0, 2.6, 'line1', 'item_wire', '강철 와이어', '+20m', 40, 5e4, 1.45, { line: 4 }),
    N('lamp', 1.2, 3.2, 'line2', 'c_candle', '심해 등불', '빛 반경 +1칸', 3, 3000, 3, { lamp: 1 }),
    // 오른쪽: 바늘·릴·손
    N('hook1', 1.2, 0, 'root', 'fs_cod', '바늘 추가', '한 번에 +1마리', 8, 40, 2.2, { catch: 1 }),
    N('reel1', 2.3, -0.8, 'hook1', 'n_auto_build', '릴', '감는 속도 +15%', 10, 60, 1.6, { reel: 0.15 }),
    N('skill1', 2.3, 0.8, 'hook1', 'c_investigator', '노련한 손', '자동 조종이 1칸 더 멀리 본다', 6, 100, 2, { skill: 1 }),
    N('bait1', 3.5, 0, 'reel1 skill1', 'fs_kraken', '심해 미끼', '희귀 어종 +20%', 10, 2000, 1.7, { bait: 0.2 }),
    // 왼쪽: 값
    N('value1', -1.2, 0, 'root', 'c_coin', '어시장', '어획 +20%', 20, 30, 1.45, { value: 0.2 }),
    N('value2', -2.4, 0, 'value1', 'fs_deepone', '인스머스 상회', '어획 +40%', 20, 1e4, 1.55, { value: 0.4 }),
    N('essc', -3.6, 0, 'value2', 'ui_ess', '심연의 부름', '이 세계의 정수 +15%', 10, 5e4, 1.9, { ess: 0.15 }),
    // 위: 정신
    N('mind1', 0, -1.2, 'root', 'cu_mind', '정신 수양', '최대 이성 +20 · 회복 +1/초', 10, 80, 1.6, { mind: 1 }),
    N('ward1', -1.1, -2.2, 'mind1', 'c_ward', '엘더 사인', '이성 소모 -8%', 8, 500, 1.8, { ward: 0.08 }),
    N('charm', -2.3, -2.8, 'ward1', 'c_sign', '촉수 부적', '촉수에 닿아도 줄이 버틸 확률 +15%', 4, 3000, 2.2, { charm: 0.15 }),
    N('deal', 1.1, -2.2, 'mind1', 'fs_siren', '심해인과의 거래', '도감 등록 인장 ×2 · 인장 어종 ×2', 1, 5000, 1, { deal: 1 }),
  ], { get: () => S().w.cthulhu.coins, spend: n => { S().w.cthulhu.coins -= n; }, tile: 'c_coin', name: '동전' });

  // ───── 차원 넥서스 (정수) ─────
  const unlockCost = () => G.D.UNLOCK_COST[Object.values(S().unlocked).filter(Boolean).length - 1] || 1e9;
  const W = (id, x, y, t, n) => N('open_' + id, x, y, 'root', t, `차원 개방: ${n}`, `${G.D.WORLD[id].genre} · ${G.D.WORLD[id].style}`, 1, 0, 1, { ['open_' + id]: 1 },
    { costFn: unlockCost, onBuy: () => { S().unlocked[id] = true; G.log(`새로운 차원 「${G.D.WORLD[id].name}」이 열렸다`, 'nexus', 'good'); } });
  const SYN = (id, x, y, req, t, n, d, cost) => N(id, x, y, req, t, n, d, 1, cost, 1, { [id]: 1 }, { reqAll: true, syn: true });
  G.Tree.define('nexus', [
    N('root', 0, 0, '', 'ui_nexus', '균열의 핵', '', 1, 0, 1, {}, { root: true }),
    W('wuxia', -2.2, -1.2, 'w_wuxia', '화산귀환록'),
    W('xianxia', 2.2, -1.2, 'w_xianxia', '구천등선'),
    W('scifi', 2.2, 1.2, 'w_scifi', '최후의 방어선'),
    W('cthulhu', -2.2, 1.2, 'w_cthulhu', '금단의 복권'),
    N('res1', 0, -1.3, 'root', 'n_resonance', '차원 공명', '모든 세계 생산 +25%', 5, 8, 2.3, { all: 0.25 }),
    N('res2', 0, -2.6, 'res1', 'n_resonance', '차원 공명 II', '모든 세계 생산 +25%', 10, 600, 2.4, { all: 0.25 }),
    N('res3', 0, -3.9, 'res2', 'n_resonance', '차원 공명 III', '모든 세계 생산 +30%', 20, 8e4, 2.5, { all: 0.3 }),
    N('flow', 0, 1.3, 'root', 'n_essflow', '정수 응결', '정수 획득 +15%', 10, 30, 2.6, { ess: 0.15 }),
    N('sands', 0, 2.6, 'flow', 'n_sands', '시간의 모래', '오프라인 진행 한도 +2시간 (기본 2시간)', 5, 20, 3, { sands: 1 }),
    SYN('syn_sword', -3.4, -1.9, 'open_wuxia', 'w_wuxia', '검기상인', '무협 무공 총 레벨 1마다 던전 피해 +1%', 60),
    SYN('syn_marrow', -1.1, -2.5, 'open_wuxia open_xianxia', 'w_xianxia', '환골탈태', '수선 경지 1마다 무협 천수 +5년', 60),
    SYN('syn_regress', 1.1, -2.5, 'open_wuxia open_xianxia', 'w_wuxia', '회귀자의 도심', '회귀 1회당 천겁 성공률 +3% (최대 30%)', 90),
    SYN('syn_tactics', 3.4, 0, 'open_scifi open_xianxia', 'w_scifi', '전술 데이터', '최고 웨이브 1마다 영기 수련 +4%', 120),
    SYN('syn_magitech', 3.4, 1.9, 'open_scifi', 'w_fantasy', '마도공학', '던전 최고층 1층마다 포탑 피해 +3%', 120),
    SYN('syn_madblade', -3.4, 1.9, 'open_cthulhu', 'w_cthulhu', '광기의 검', '잃은 이성 1%마다 던전 피해 +1.5%', 200),
    SYN('syn_heaven', -1.1, 2.6, 'open_xianxia open_cthulhu', 'w_xianxia', '천기누설', '수선 경지 1마다 어획 +15%', 200),
    SYN('syn_void', 1.1, 2.6, 'open_cthulhu open_scifi', 'w_cthulhu', '공허 통신', '인장 1개당 크레딧 +2% (최대 200%)', 300),
  ], { get: () => S().ess, spend: n => { S().ess -= n; }, tile: 'ui_ess', name: '정수' });

  // ───── 별 (차원 붕괴 후 남는다) ─────
  G.Tree.define('stars', [
    N('root', 0, 0, '', 'ui_prestige', '붕괴의 잔해', '', 1, 0, 1, {}, { root: true }),
    N('keep_worlds', -1.2, -0.8, 'root', 'ss_keep_worlds', '세계의 기억', '붕괴 후에도 연 세계를 유지', 1, 4, 1, { keepWorlds: 1 }),
    N('keep_syn', -2.4, -1.4, 'keep_worlds', 'ss_keep_auto', '인연의 실', '붕괴 후에도 시너지 노드를 유지', 1, 8, 1, { keepSyn: 1 }),
    N('head', 1.2, -0.8, 'root', 'ss_head_start', '선행 투자', '모든 세계의 시작 재화 ×10', 5, 2, 2, { head: 1 }),
    N('starpow', 0, 1.2, 'root', 'ui_star', '별의 공명', '별 하나당 생산 보너스 +2%p', 10, 3, 1.8, { starPow: 0.02 }),
    N('staress', 1.2, 2.0, 'starpow', 'ss_star_ess', '별빛 응결', '정수 획득 +50%', 10, 3, 2, { starEss: 0.5 }),
    N('relic', -1.2, 2.0, 'starpow', 'ss_relic_amp', '유물 공명', '모든 유물 효과 +25%', 10, 5, 2, { relicAmp: 0.25 }),
  ], { get: () => S().stars, spend: n => { S().stars -= n; }, tile: 'ui_star', name: '별의 파편' });
})();
