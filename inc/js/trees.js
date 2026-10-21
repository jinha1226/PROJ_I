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
  // 트리 뒤 그림 도우미: P(x, y) → 화면 좌표. 선협 경맥도처럼 노드 배치가 그림의 부위가 되게 그린다
  const FIG = P => ({
    pts: pts => pts.map(([x, y]) => P(x, y).join(',')).join(' '),
    poly(pts, cls = '') { return `<polygon class="${cls}" points="${this.pts(pts)}" />`; },
    line(pts, cls = '') { return `<polyline class="${cls}" points="${this.pts(pts)}" />`; },
    circle(x, y, r, U, cls = '') { const [cx, cy] = P(x, y); return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r * U}" />`; },
    path(d, cls = '') { return `<path class="${cls}" d="${d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, a, b) => P(+a, +b).join(' '))}" />`; },
  });

  // ───── 판타지 (골드) ─────
  // 검 그림 (좌표·선행 노드는 tools/swordtree.js가 정한다):
  //  검신 가운데 홈 = 원정대 → 동료 지휘 줄기, 마디마다 좌우 가로대 끝에서 동료 해금 → 강화가 날을 따라 위로 → ★택1 짝, 검 끝 = 대현자
  //  가드 왼쪽 재화 · 오른쪽 벼락(클릭), 각각 세 줄 / 손잡이 왼쪽 체력 · 오른쪽 공격 / 폼멜 전투 함성
  // 짝 노드(pair)는 둘 다 배울 수 있고 효과는 고른 하나만, 바꾸기는 공짜.
  const PAIR = (id, x, y, req, t, n, d, base, eff, pair, more) => N(id, x, y, req, t, n, d, 1, base, 1, eff, { pair, notable: true, ...more });
  const NOTE = (id, x, y, req, t, n, d, base, eff, more) => N(id, x, y, req, t, n, d, 1, base, 1, eff, { notable: true, ...more });
  G.Tree.define('fantasy', [
    N('root', 0, 0, '', 'knight', '모험의 시작', '', 1, 0, 1, {}, { root: true }),

    // ── 북: 원정대 ──
    N('party', 0, -1.9, 'root', 'u_legend', '원정대', '동료 3명까지 출전', 1, 20, 1, {}),
    // 동료마다 같은 꼴(UNITS.md): 합류(기본 공격·특성) → 특수 공격 → 기술 1(버튼) → 기술 2 ★짝(둘 다 배우고 효과는 고른 하나)
    // 비용: 특수 = 합류 ×4, 기술 1 = ×15, 짝 = ×40. 동료별 피해는 검 홈의 공용 노드(전우애·영웅단)로만 올린다
    // 레인저
    N('archer', -1.2, -2.6, 'party', 'u_archer', '레인저', '합류 · 원거리', 1, 40, 1, { ally_archer: 1 }),
    NOTE('r_pierce', -2.3, -3.4, 'archer', 'fx_arrow', '관통 화살', '4발째 화살은 뒤의 적 2마리까지 꿰뚫는다', 160, { r_pierce: 1 }),
    NOTE('r_volley', -2.3, -4.6, 'r_pierce', 'w_bow', '화살비', '기술: 3초간 표적 주변에 화살을 쏟는다 (20초)', 600, { sk_volley: 1 }),
    PAIR('r_poison', -2.3, -5.8, 'r_volley', 'r_stew', '독화살', '화살·화살비가 4초간 초당 피해 30%', 1600, { r_poison: 1 }, 'r_pair'),
    PAIR('r_snipe', -1.2, -5.8, 'r_volley', 'fx_arrow', '저격', '12초마다 가장 센 적에게 ×8 화살', 1600, { r_snipe: 1 }, 'r_pair'),
    // 음유시인
    N('bard', 1.2, -2.6, 'party', 'u_bard', '음유시인', '합류 · 노래: 피해 ×1.5 ↔ 골드 ×2', 1, 150, 1, { ally_bard: 1 }),
    NOTE('b_encore', 2.3, -3.4, 'bard', 'fx_song', '앙코르', '노래 지속 +50%', 600, { b_encore: 1 }),
    NOTE('b_rhap', 2.3, -4.6, 'b_encore', 'b_atk', '광시곡', '기술: 10초간 노래를 모두 함께 (30초)', 2250, { sk_rhap: 1 }),
    PAIR('songWar', 2.3, -5.8, 'b_rhap', 'b_fury', '전쟁의 북', '노래 추가: 피해 ×3', 6000, { songWar: 1 }, 'b_pair'),
    PAIR('songRegen', 1.2, -5.8, 'b_rhap', 'b_regen', '회복의 노래', '노래 추가: 초당 체력 +4%', 6000, { songRegen: 1 }, 'b_pair'),
    // 수도사
    N('cleric', -1.2, -6.85, 'allyAtk1', 'u_cleric', '수도사', '합류 · 치유', 1, 300, 1, { ally_cleric: 1 }),
    NOTE('c_mass', -2.3, -7.65, 'cleric', 'fx_holy', '은총', '5번째 치유는 파티 전체', 1200, { c_mass: 1 }),
    NOTE('heal', -2.3, -8.85, 'c_mass', 'fx_holy', '치유의 빛', '기술: 파티 체력 50% 회복 (30초)', 4500, { sk_heal: 1 }),
    PAIR('c_revive', -1.2, -10.05, 'heal', 'u_god', '부활 기도', '동료 부활 시간 절반', 12000, { c_revive: 1 }, 'c_pair'),
    PAIR('c_sanct', -2.3, -10.05, 'heal', 'q_peak', '성역', '수도사가 서 있으면 오염 절반', 12000, { c_sanct: 1 }, 'c_pair'),
    // 화염 마법사
    N('mage', 1.2, -6.85, 'allyAtk1', 'u_mage', '화염 마법사', '합류 · 범위 공격', 1, 1200, 1, { ally_mage: 1 }),
    NOTE('m_burn', 2.3, -7.65, 'mage', 'fx_flame', '화상', '맞은 적이 3초간 초당 피해 25%', 4800, { m_burn: 1 }),
    NOTE('meteor', 2.3, -8.85, 'm_burn', 'fx_fire', '유성 낙하', '기술: 마법사 공격 ×30 광역 (25초)', 18000, { sk_meteor: 1 }),
    PAIR('m_storm', 2.3, -10.05, 'meteor', 'fx_fire', '화염 폭풍', '유성 자리에 8초간 불길 (초당 마법사 공격 ×1)', 48000, { m_storm: 1 }, 'm_pair'),
    PAIR('m_quick', 1.2, -10.05, 'meteor', 'st_haste', '빠른 영창', '마법사 공격·유성 재사용 -30%', 48000, { m_quick: 1 }, 'm_pair'),
    // 성기사
    N('paladin', -1.2, -11.1, 'allyHp', 'u_paladin', '성기사', '합류 · 탱커', 1, 8000, 1, { ally_paladin: 1 }),
    NOTE('p_guard', -2.3, -11.9, 'paladin', 'd_shield', '방패 막기', '성기사 받는 피해 -30%', 32000, { p_guard: 0.3 }),
    NOTE('p_wall', -2.3, -13.1, 'p_guard', 'u_armor', '성벽', '기술: 8초간 적을 끌어모으고 파티 받는 피해 -50% (30초)', 120000, { sk_wall: 1 }),
    PAIR('p_taunt', -1.2, -14.3, 'p_wall', 'u_paladin', '도발', '적이 성기사를 먼저 노린다', 320000, { p_taunt: 1 }, 'p_pair'),
    PAIR('p_counter', -2.3, -14.3, 'p_wall', 'w_hammer', '반격', '받은 피해의 50%를 되돌린다', 320000, { p_counter: 1 }, 'p_pair'),
    // 용기병
    N('dragoon', 1.2, -11.1, 'allyHp', 'u_dragoon', '용기병', '합류 · 강타', 1, 60000, 1, { ally_dragoon: 1 }),
    NOTE('d_dash', 2.3, -11.9, 'dragoon', 'a_escape', '돌진', '6칸 안 적에게 뛰어들어 첫 타 ×3', 240000, { d_dash: 1 }),
    NOTE('d_leap', 2.3, -13.1, 'd_dash', 'w_spear', '용의 도약', '기술: 가장 센 적에게 뛰어들어 ×10 (20초)', 900000, { sk_leap: 1 }),
    PAIR('d_exec', 2.3, -14.3, 'd_leap', 'u_sword', '처형', '체력 25% 이하 적은 즉사', 2.4e6, { d_exec: 1 }, 'd_pair'),
    PAIR('d_breath', 1.2, -14.3, 'd_leap', 'fx_flame', '용의 숨결', '공격이 표적 곁 적에게도 60%', 2.4e6, { d_breath: 1 }, 'd_pair'),
    // 대현자
    N('archmage', -1.2, -15.35, 'allyAtk2', 'u_archmage', '대현자', '합류 · 연쇄 번개', 1, 400000, 1, { ally_archmage: 1 }),
    NOTE('a_overload', -2.3, -16.15, 'archmage', 'fx_zap', '과부하', '연쇄 +2, 튈 때 피해가 줄지 않는다', 1.6e6, { a_overload: 1 }),
    NOTE('a_storm', -2.3, -17.35, 'a_overload', 'a_thunder', '뇌우', '기술: 5초간 보이는 적에게 번개가 쏟아진다 (40초)', 6e6, { sk_tstorm: 1 }),
    PAIR('a_warp', -2.3, -18.55, 'a_storm', 'st_haste', '시간 왜곡', '15초마다 5초간 파티 공격 속도 +50%', 1.6e7, { a_warp: 1 }, 'a_pair'),
    PAIR('a_stop', -1.2, -18.55, 'a_storm', 'a_seal', '시간 정지', '30초마다 보이는 적이 4초간 멈춘다', 1.6e7, { a_stop: 1 }, 'a_pair'),
    // 암살자
    N('rogue', 1.2, -15.35, 'allyAtk2', 'u_rogue', '암살자', '합류 · 빠른 칼질', 1, 400000, 1, { ally_rogue: 1 }),
    NOTE('ro_twin', 2.3, -16.15, 'rogue', 'g_dagger', '쌍검', '한 번 더 벤다 (60%)', 1.6e6, { ro_twin: 1 }),
    NOTE('ro_shadow', 2.3, -17.35, 'ro_twin', 'w_knife', '그림자 처형', '기술: 체력 30% 이하 적을 차례로 벤다 · 없으면 가장 약한 적 ×5 (25초)', 6e6, { sk_shadow: 1 }),
    PAIR('ro_mark', 2.3, -18.55, 'ro_shadow', 'a_seal', '표식', '맞은 적은 4초간 받는 피해 +25%', 1.6e7, { ro_mark: 1 }, 'ro_pair'),
    PAIR('ro_steal', 1.2, -18.55, 'ro_shadow', 'ui_gold', '소매치기', '암살자가 때릴 때마다 골드 (그 층 처치 골드의 5%)', 1.6e7, { ro_steal: 0.05 }, 'ro_pair'),
    // ── 남: 기사(리더)와 파티 전체 (동료 공격력·체력은 기사를 따라간다) ──
    N('atk1', 0.6, 2.4, 'root', 'u_sword', '예리한 검', '파티 공격력 +15%', 10, 10, 1.45, { atk: 0.15 }),
    N('aspd1', 1.6, 3.4, 'atk1', 'n_auto_duel', '연속 베기', '파티 공격 속도 +8%', 10, 60, 1.6, { aspd: 0.08 }),
    N('crit1', 0.6, 3.4, 'atk1', 'g_dagger', '급소 찌르기', '기사 치명 +3%', 10, 80, 1.6, { crit: 0.03 }),
    N('atk2', 1.6, 4.4, 'crit1 aspd1', 'u_sword', '명검 단련', '파티 공격력 +20%', 15, 300, 1.5, { atk: 0.2 }),
    N('critd', 1.6, 5.4, 'atk2', 'g_dagger', '일격필살', '치명 피해 +25%', 15, 1500, 1.6, { critd: 0.25 }),
    N('atk3', 0.6, 5.4, 'atk2', 'u_sword', '성검', '파티 공격력 +35%', 20, 10000, 1.6, { atk: 0.35 }),
    N('atk4', 0.6, 6.4, 'atk3', 'u_sword', '용살검', '파티 공격력 +50%', 25, 500000, 1.7, { atk: 0.5 }),
    N('hp1', -0.6, 2.4, 'root', 'u_armor', '판금 갑옷', '파티 체력 +18%', 10, 15, 1.45, { hp: 0.18 }),
    N('regen1', -0.6, 3.4, 'hp1', 'r_stew', '붕대', '초당 체력 회복 +0.5%', 10, 120, 1.6, { regen: 0.005 }),
    N('armor1', -1.6, 3.4, 'hp1', 'd_shield', '방패술', '기사 받는 피해 -3% (최대 75%)', 15, 200, 1.55, { armor: 0.03 }),
    N('hp2', -1.6, 4.4, 'regen1 armor1', 'u_armor', '미스릴 사슬', '파티 체력 +25%', 15, 1000, 1.5, { hp: 0.25 }),
    N('hp3', -1.6, 5.4, 'hp2', 'i_scale', '용비늘 갑주', '파티 체력 +40%', 25, 100000, 1.6, { hp: 0.4 }),
    N('k_pure1', -0.6, 5.4, 'regen1', 'b_regen', '정화', '오염 피해 -8%', 6, 2000, 1.7, { purify: 0.08 }),
    N('k_pure2', -0.6, 6.4, 'k_pure1', 'fx_holy', '성수', '오염 피해 -10%', 4, 40000, 2, { purify: 0.1 }),
    NOTE('rage', 0, 7.9, 'root', 'r_dragon', '전투 함성', '기술: 10초간 모든 피해 ×2 (40초)', 6000, { sk_rage: 1 }),
    N('allyAtk1', 0, -6.15, 'party', 'u_legend', '전우애', '동료 공격력 +18%', 15, 1500, 1.5, { allyAtk: 0.18 }),
    N('allyHp', 0, -10.4, 'allyAtk1', 'rl_herb', '진형', '동료 체력 +20%', 15, 1500, 1.5, { allyHp: 0.2 }),
    N('allyAtk2', 0, -14.65, 'allyHp', 'u_god', '영웅단', '동료 공격력 +35%', 25, 200000, 1.6, { allyAtk: 0.35 }),
    NOTE('autocast', 0, -16.6, 'allyAtk2', 'n_auto_build', '전투 본능', '기술을 재사용마다 알아서 쓴다', 200000, { autocast: 1 }),
    N('slot', 0, -20.85, 'k_assault2 k_rally', 'u_legend', '대원정', '출전 동료 +1 (최대 4명)', 1, 1.5e7, 1, { slot: 1 }),
    NOTE('k_cleave', 1.6, 2.4, 'aspd1', 'w_waraxe', '휩쓸기', '기사 공격이 옆의 적에게도 50%', 3000, { k_cleave: 1 }),
    N('k_leech', -1.6, 2.4, 'hp1', 'r_dragon', '흡혈', '기사가 준 피해의 2%만큼 회복', 5, 800, 1.9, { k_leech: 0.02 }),
    NOTE('k_undying', -1.6, 6.4, 'hp3', 'u_armor', '불굴', '층마다 한 번, 기사가 쓰러질 때 체력 30%로 버틴다', 3e5, { k_undying: 1 }),
    N('k_crit2', 1.6, 6.4, 'critd', 'g_dagger', '약점 간파', '기사 치명 +2%', 10, 2e5, 1.7, { crit: 0.02 }),
    NOTE('k_assault', 0, -18.55, 'autocast', 'u_god', '총공세', '기술: 열어 둔 동료 전원이 15초간 함께 싸운다 (90초)', 5e6, { sk_assault: 1 }),
    N('k_assault2', -0.7, -19.65, 'k_assault', 'st_haste', '끝없는 진격', '총공세 지속 +3초', 5, 8e6, 2.2, { k_assault2: 3 }),
    N('k_rally', 0.7, -19.65, 'k_assault', 'b_fury', '함성의 물결', '총공세 중 피해 +10%', 10, 8e6, 1.9, { k_rally: 0.1 }),

    // ── 동: 벼락 (클릭) ──
    N('smite1', 1.3, 0, 'root', 'n_auto_break', '벼락 일격', '벼락 피해 +30%', 20, 20, 1.45, { smite: 0.3 }),
    N('smiteR', 2.3, -0.95, 'smite1', 'a_thunder', '낙뢰', '벼락 범위 +0.25칸', 6, 400, 2, { smiteR: 0.25 }),
    N('s_cd', 2.3, 0.95, 'smite1', 'st_haste', '연속 낙뢰', '벼락 재사용 -10%', 5, 600, 2, { s_cd: 0.1 }),
    NOTE('s_chain', 3.3, -0.95, 'smiteR', 'fx_zap', '연쇄 번개', '벼락이 주변 2마리로 튄다 (60%)', 3000, { s_chain: 1 }),
    NOTE('s_shock', 4.3, -0.95, 's_chain', 'a_thunder', '감전', '맞은 적은 4초간 받는 피해 +30%', 12000, { s_shock: 1 }),
    NOTE('s_focus', 5.3, 0.95, 's_stun', 'u_legend', '집중 표적', '파티가 벼락 맞은 적을 노린다 · 피해 +20%', 12000, { s_focus: 1 }),
    NOTE('s_exec', 4.3, 0, 's_crit', 'u_sword', '심판', '벼락 맞은 뒤 체력 20% 이하면 즉사', 60000, { s_exec: 1 }),
    N('s_crit', 3.3, 0, 's_lv1', 'g_dagger', '천둥 강타', '벼락 치명(×3) 확률 +8%', 5, 40000, 1.9, { s_crit: 0.08 }),
    NOTE('s_storm', 6.3, 0, 's_power2', 'fx_storm', '낙뢰 폭풍', '8초마다 근처 적에게 자동 벼락', 3e5, { s_storm: 1 }),
    N('s_storm2', 7.3, 0, 's_storm', 'fx_storm', '폭풍의 눈', '자동 벼락 간격 -12%', 5, 1e6, 2, { s_storm2: 0.12 }),
    NOTE('s_stun', 4.3, 0.95, 's_charge', 'a_seal', '기절', '벼락 맞은 적은 1초간 멈춘다', 2500, { s_stun: 1 }),
    NOTE('s_charge', 3.3, 0.95, 's_cd', 'n_auto_break', '벼락 충전', '벼락을 2번까지 모아 연달아 쓴다', 2500, { s_charge: 1 }),
    N('s_power2', 5.3, 0, 's_exec', 'a_thunder', '뇌신의 분노', '벼락 피해 +25%', 10, 2e5, 1.8, { smite: 0.25 }),
    NOTE('s_over', 8.3, 0.95, 's_purge', 'fx_zap', '과충전', '5번째 벼락마다 피해 ×5', 1.5e5, { s_over: 1 }),
    NOTE('s_mark', 8.3, -0.95, 's_r2', 'ui_gold', '번개 표식', '벼락으로 쓰러뜨린 적은 골드 ×1.5', 1.5e6, { s_mark: 1 }),
    N('s_r2', 7.3, -0.95, 's_boss', 'a_thunder', '광역 낙뢰', '벼락 범위 +0.25칸', 4, 1.5e6, 2.2, { smiteR: 0.25 }),
    NOTE('s_storm3', 9.3, 0, 's_storm_r', 'fx_storm', '폭풍 쌍뢰', '자동 벼락이 2발씩 떨어진다', 5e6, { s_storm3: 1 }),
    N('s_lv1', 2.3, 0, 'smite1', 'n_auto_break', '전류 강화', '벼락 피해 +10%', 10, 3000, 1.7, { smite: 0.1 }),
    N('s_bounce', 5.3, -0.95, 's_shock', 'fx_zap', '튕기는 번개', '연쇄 번개 +1마리 · 거리 +1칸', 2, 20000, 4, { s_bounce: 1 }),
    NOTE('s_static', 6.3, 0.95, 's_focus', 'st_haste', '정전기 장막', '벼락을 내리면 3초간 파티 공격 속도 +20%', 15000, { s_static: 1 }),
    NOTE('s_purge', 7.3, 0.95, 's_static', 'b_regen', '정화의 벼락', '벼락이 적을 맞힐 때마다 파티 체력 +1% (한 번에 5%까지)', 80000, { s_purge: 1 }),
    N('s_boss', 6.3, -0.95, 's_bounce', 'b_dragon', '거인 사냥', '보스에게 벼락 피해 +50%', 5, 80000, 2, { s_boss: 0.5 }),
    N('s_storm_r', 8.3, 0, 's_storm2', 'fx_storm', '폭풍 범위', '자동 벼락이 2칸 더 멀리까지', 3, 3e6, 2.5, { s_storm_r: 2 }),

    // ── 서: 재화 ──
    N('gold1', -1.3, 0, 'root', 'ui_gold', '약탈', '골드 +15%', 15, 25, 1.5, { gold: 0.15 }),
    N('speed1', -2.3, 0, 'gold1', 'a_escape', '가벼운 발걸음', '이동 속도 +8%', 8, 50, 1.7, { speed: 0.08 }),
    N('g_boss', -2.3, 0.95, 'gold1', 'b_goblinchief', '현상금', '보스 골드 +100%', 5, 300, 2.2, { g_boss: 1 }),
    N('gold2', -3.3, 0, 'speed1', 'ui_gold', '보물 사냥꾼', '골드 +30%', 20, 5000, 1.55, { gold: 0.3 }),
    N('g_chest', -2.3, -0.95, 'gold1', 'x_chest', '보물상자', '층마다 보물상자 +1', 3, 2000, 4, { g_chest: 1 }),
    NOTE('g_mimic', -3.3, -0.95, 'g_chest', 'm_mimic', '미믹 사냥', '상자 30%가 미믹: 잡으면 골드 ×5', 20000, { g_mimic: 1 }),
    N('g_lucky', -4.3, -0.95, 'g_mimic', 'x_chest', '행운의 열쇠', '상자 골드 +50%', 10, 30000, 1.7, { g_lucky: 0.5 }),
    NOTE('g_skip', -5.3, 0, 'essf', 'f_stairs', '층 도약', '20초 안에 층을 정리하면 한 층 더 내려간다', 1.5e5, { g_skip: 1 }),
    N('essf', -4.3, 0, 'gold2', 'ui_ess', '심연의 기운', '이 세계의 정수 +15%', 10, 50000, 1.9, { ess: 0.15 }),
    N('g_kill', -3.3, 0.95, 'g_boss', 'u_sword', '전리품', '처치 골드 +10%', 10, 1500, 1.6, { gold: 0.1 }),
    NOTE('g_jack', -4.3, 0.95, 'g_kill', 'b_gold', '대박', '처치의 3%는 골드 ×5', 4000, { g_jack: 1 }),
    NOTE('g_goblin', -5.3, -0.95, 'g_lucky', 'm_ggoblin', '황금 고블린', '층마다 25% 확률로 나타나 달아난다 · 잡으면 골드 ×30', 2e5, { g_goblin: 1 }),
    N('g_bargain', -7.3, 0.95, 'g_bossEss', 'ui_gold', '흥정', '이 트리 비용 -3%', 10, 1e5, 1.8, { g_bargain: 0.03 }),
    N('g_floor', -8.3, 0.95, 'g_bargain', 'f_stairs', '층 보상', '층을 내려갈 때 정수 +10%', 10, 2e5, 1.9, { floorEss: 0.1 }),
    N('ess2', -6.3, 0, 'g_skip', 'ui_ess', '심연의 정수', '이 세계의 정수 +15%', 10, 2e6, 2.2, { ess: 0.15 }),
    N('g_lucky2', -6.3, -0.95, 'g_goblin', 'x_chest', '상자 장인', '상자 골드 +100%', 5, 2e5, 2, { g_lucky: 1 }),
    N('g_mimic2', -8.3, -0.95, 'g_goblin2', 'm_mimic', '미믹 감정', '미믹 보상 ×10 (원래 ×5)', 1, 8e5, 1, { g_mimic2: 1 }),
    N('g_goblin2', -7.3, -0.95, 'g_lucky2', 'm_ggoblin', '고블린 사냥꾼', '황금 고블린 등장 확률 +15%', 3, 6e5, 2.5, { g_goblin2: 0.15 }),
    NOTE('g_fever', -5.3, 0.95, 'g_jack', 'b_gold', '황금열', '30마리 처치마다 10초간 골드 ×2', 6000, { g_fever: 1 }),
    N('g_bossEss', -6.3, 0.95, 'g_fever', 'b_slimeking', '보스 정수', '보스 층 정수 +20%', 5, 1e5, 2.5, { bossEss: 0.2 }),
    N('gold3', -7.3, 0, 'ess2', 'ui_gold', '용의 보고', '골드 +25%', 10, 3e6, 2, { gold: 0.25 }),
  ], { get: () => S().w.fantasy.gold, spend: n => { S().w.fantasy.gold -= n; }, tile: 'ui_gold', name: '골드' },
  { costMul: st => Math.max(0.5, 1 - G.Tree.add('fantasy', st, 'g_bargain')) });

  // ───── 무협 (깨달음: 회귀해도 남는다) ─────
  // ───── 무협 (깨달음) ─────
  // 북: 진로(왼쪽 위 화산 · 오른쪽 위 마교) · 남: 무공 계열(심법·외공·경공·잡학) · 동: 회귀 · 서: 강호(활동·여정·특산)
  // 깨달음 비용 눈금: 노드 값은 처음 적은 그대로 두고 여기서 한 번에 줄인다 — 비용 0.6×값^0.3, 오름폭 ×0.15, 최대 8레벨.
  // 목표(사용자): 모든 노드 최대까지 2시간 안. 봇(깨달음을 바로 씀): 정파·사파 117분 · 마교 103분.
  // 원래 눈금은 노드 하나씩만 사도 13만 — 대부분을 영영 못 봤다.
  const WX = list => list.map(n => (n.root ? n : Object.assign(n, { base: Math.max(1, Math.round(0.6 * Math.pow(n.base, 0.3))), g: 1 + ((n.g || 1) - 1) * 0.15, max: Math.min(n.max || 1, 8) })));
  G.Tree.define('wuxia', WX([
    N('root', 0, 0, '', 'w_wuxia', '회귀자', '', 1, 0, 1, {}, { root: true }),

    // ── 북: 왼쪽 위 계획표(생애 계획표를 넓힌다 — 자동 코스로 두는 사람에게도 늘 이득이 있게) · 오른쪽 위 소속(어느 소속이든 같은 효과) ──
    N('path', 0, -1.8, 'root', 'j_nangin', '강호행', '명성 +15%', 10, 2, 1.6, { fame: 0.15 }),
    // 계획표
    N('pl1', -1.4, -2.7, 'path', 'x_table', '계획', '집중한 계열 숙련 +10%', 10, 4, 1.6, { focusXp: 0.1 }),
    N('pl_fame', -2.6, -2.2, 'pl1', 'c_coin', '명성 집중', '명성 단계에서 명성 +15%', 10, 8, 1.7, { focusFame: 0.15 }),
    NOTE('pl_steps', -2.3, -3.6, 'pl1', 'x_table', '한 단계 더', '계획표 단계 칸 +1 · 무공 숙련 +10%', 60, { pl_steps: 1, sxp: 0.1 }),
    N('pl_steps2', -3.5, -4.2, 'pl_steps', 'x_table', '더 긴 계획', '계획표 단계 칸 +1 · 무공 숙련 +10%', 2, 500, 3, { pl_steps: 1, sxp: 0.1 }),
    N('pl_walk', -3.8, -2.9, 'pl_fame pl_steps', 'a_escape', '이정표', '이동·여정 +15%', 10, 60, 1.8, { walk: 0.15 }),
    NOTE('pl_mix', -1.4, -4.4, 'pl_steps', 'a_gong', '두 계열 섞기', '수련하는 동안 다른 계열에서 가장 빨리 오르는 무공도 30%', 400, { pl_mix: 1 }),
    N('pl_catch', -2.4, -5.3, 'pl_mix pl_steps2', 'ui_star', '전생의 길', '전생 레벨까지 따라잡기 +0.5배', 4, 600, 2.2, { pl_catch: 0.5 }),
    N('pl_top', -4.6, -5.0, 'pl_steps2 pl_walk', 'j_geomseon', '천하를 그리다', '집중한 계열 숙련 +30%', 10, 6000, 2, { focusXp: 0.3 }),
    // 소속
    N('sect1', 1.4, -2.7, 'path', 'j_jeja', '입문', '명성 +20%', 10, 4, 1.6, { fame: 0.2 }),
    N('sect_work', 2.6, -2.2, 'sect1', 'j_jangro', '본산 임무', '일·임무 명성 +30%', 10, 8, 1.7, { work: 0.3 }),
    N('sect_xp', 1.4, -3.9, 'sect1', 's_naegong', '본산 무학', '심법 숙련 +25%', 10, 10, 1.7, { xp_sim: 0.25 }),
    NOTE('sect_home', 3.7, -2.7, 'sect_work', 'x_statue', '본산의 지원', '근거지에서 일하면 명성 ×2', 120, { sect: 1 }),
    N('sect_combat', 2.5, -4.6, 'sect_xp', 's_geom', '본산 무예', '전투력 +25%', 10, 25, 1.8, { combat: 0.25 }),
    NOTE('sect_plum', 3.6, -4.0, 'sect_home sect_combat', 'v_plum', '독문절기', '전투력 ×1.3', 300, { plum: 1 }),
    NOTE('sect_blood', 4.9, -3.3, 'sect_home', 'a_sword', '원정령', '원정 명성 ×2', 800, { blood: 1 }),
    N('sect_raid', 5.8, -4.1, 'sect_blood', 'w_katana', '원정대', '원정 명성 +40%', 10, 1500, 1.9, { raid: 0.4 }),
    PAIR('sect_fear', 4.6, -5.2, 'sect_plum', 'm_demon', '공포', '원정 적 체력 -30%', 2500, { fear: 1 }, 'sect_pair'),
    PAIR('sect_dom', 3.4, -5.6, 'sect_plum', 'wa_crown', '군림', '녹봉 ×1.5', 2500, { dom: 1 }, 'sect_pair'),
    N('sect_top', 5.6, -5.6, 'sect_raid sect_fear sect_dom', 'j_geomseon', '천하의 주인', '명성 +50%', 10, 8000, 2, { fame: 0.5 }),
    // 소속 무공 (UNITS.md 캐릭터 시트): 특수 공격 → 기술 1 → 기술 2 ★짝. 이름·설명은 지금 소속(정파·사파·마교)을 따른다. 전투에서 저절로 쓴다
    NOTE('kit_sp', 0, -3.4, 'sect1', 'v_plum', '독문 수법', '', 30, { kit_sp: 1 }, { names: ['매화 낙화', '분노', '혈흔'], descs: ['치명타 때 주변 적에게 50%', '맞을 때마다 분노, 다섯 번이면 다음 3타 ×2', '체력 50% 이하 적에게 ×1.5'] }),
    NOTE('kit_sk', 0, -4.8, 'kit_sp', 's_geom', '본산 비기', '', 250, { kit_sk: 1 }, { names: ['이십사수매화검법', '녹림 장법', '혈영마검'], descs: ['12초마다 주변 적 모두에게 ×3', '12초마다 장풍 ×4, 적을 밀어낸다', '12초마다 일직선으로 꿰뚫고 지나가며 ×3'] }),
    PAIR('kit_a', -0.6, -6.1, 'kit_sk', 's_naegong', '본산 심법', '', 1500, { kit_a: 1 }, 'kit_pair', { names: ['자하신공', '흡정대법', '천마신공'], descs: ['체력 50% 아래면 10초간 받는 피해 -50%·재생 (60초)', '적을 쓰러뜨리면 체력 15% 회복', '공격 ×2, 싸우는 동안 초당 체력 -2%'] }),
    PAIR('kit_b', 0.6, -6.1, 'kit_sk', 's_gyeong', '본산 경공', '', 1500, { kit_b: 1 }, 'kit_pair', { names: ['암향표', '비영보', '흡성대법'], descs: ['새 적과 붙으면 순식간에 5연타', '공격의 25%를 피한다', '맞힌 적의 공격력 -30%'] }),

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

  ]), { get: () => S().w.wuxia.ins, spend: n => { S().w.wuxia.ins -= n; }, tile: 'ui_star', name: '깨달음' }, {
    // 소속 무공 노드: 지금 소속의 이름·설명
    label: n => (n.names ? { n: n.names[['jeong', 'sa', 'ma'].indexOf(G.Wuxia.pathOf(S().w.wuxia))] || n.n, d: n.descs[['jeong', 'sa', 'ma'].indexOf(G.Wuxia.pathOf(S().w.wuxia))] || n.d } : n),
    bg(P, U) {
      const f = FIG(P), oct = r => Array.from({ length: 8 }, (_, k) => { const a = (k + 0.5) * Math.PI / 4; return [Math.cos(a) * r, Math.sin(a) * r * 0.85 + 0.9]; });
      // 괘: 방향마다 막대 셋 (이은 것 —, 끊긴 것 - -)
      const TRI = ['111', '011', '101', '001', '110', '010', '100', '000'];
      let bars = '';
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, cx = Math.cos(a), cy = Math.sin(a) * 0.85, tx = -Math.sin(a), ty = Math.cos(a) * 0.85;
        for (let j = 0; j < 3; j++) {
          const r = 7.0 + j * 0.45, mx = cx * r, my = cy * r + 0.9, half = 1.6;
          const seg = (s0, s1) => f.line([[mx + tx * s0, my + ty * s0], [mx + tx * s1, my + ty * s1]], 'bar');
          bars += TRI[k][j] === '1' ? seg(-half, half) : seg(-half, -0.3) + seg(0.3, half);
        }
      }
      const [cx0, cy0] = P(0, 0), R = 1.5 * U;
      return `<g class="fig bagua">
        ${f.poly(oct(6.4), 'ring')}${f.poly(oct(8.4), 'ring2')}${bars}
        <circle class="yang" cx="${cx0}" cy="${cy0}" r="${R}" />
        <path class="yin" d="M ${cx0} ${cy0 - R} A ${R} ${R} 0 0 1 ${cx0} ${cy0 + R} A ${R / 2} ${R / 2} 0 0 1 ${cx0} ${cy0} A ${R / 2} ${R / 2} 0 0 0 ${cx0} ${cy0 - R} Z" />
      </g>`;
    },
  });

  // ───── 수선 (영석): 경맥도 ─────
  // 사람 몸 위에 경맥을 그린다. 임맥(가운데 위)은 진법 칸·영기·천겁, 팔다리와 아랫배는 오행 경맥.
  // 경맥의 혈자리를 찍으면 그 오행 진기가 세지고, 끝 혈자리(개통)를 뚫으면 그 오행 진기 ×2.
  const ACU = (id, x, y, req, el, n, base) => N(id, x, y, req, 'e_' + el, n, `${G.D.X.el[el].n} 진기 +20%`, 15, base, 1.5, { [el]: 0.2 });
  const OPEN = (id, x, y, req, el, n, base) => N(id, x, y, req, 'e_' + el, n, `${G.D.X.el[el].n} 진기 ×2`, 1, base, 1, { [el + 'Open']: 1 }, { open: true });
  // 경맥도 몸 + 바깥을 도는 대주천 고리. 임맥(가운데)은 진법 칸·영기·천겁·등선, 팔다리·아랫배는 오행 경맥과 그 살림(비검·요수·연단·영초·영기),
  // 바깥 대주천은 경맥 끝(개통)에서 이어져 몸을 한 바퀴 돈다 — 진법 퍼즐 자체(상생·상극·영맥)를 키운다.
  const XX = list => list.map(n => (n.root ? n : Object.assign(n, { base: Math.max(1, Math.round(0.8 * n.base)), g: 1 + ((n.g || 1) - 1) * 0.6, max: Math.min(n.max || 1, 10) })));
  G.Tree.define('xianxia', XX([
    N('root', 0, 0, '', 'xx_hero0', '단전', '', 1, 0, 1, {}, { root: true }),
    // ── 임맥 (가운데 위): 진법 칸 · 영기 · 천겁 · 등선
    N('slot1', 0, -1.2, 'root', 'q_peak', '기해혈', '진법 칸 +2', 12, 40, 2.6, { slots: 2 }),
    N('qi1', 0, -2.4, 'slot1', 'a_gong', '전중혈', '영기 +25%', 20, 40, 1.45, { qi: 0.25 }),
    N('trib1', 0, -3.6, 'qi1', 'q_aura3', '천돌혈', '천겁 성공률 +3%', 10, 300, 1.65, { trib: 0.03 }),
    NOTE('head', 0, -4.8, 'trib1', 'a_dao', '백회혈', '심마 -40% · 천겁에 실패해도 영기 30% 남는다', 2e4, { demon: 0.4, tribSafe: 0.3 }),
    N('mind', 0, -5.9, 'head', 'q_qi', '인당혈', '도심 동요 -20%', 3, 3e4, 2.5, { dev: 0.2 }),
    NOTE('asc', 0, -7.0, 'mind', 'q_aura3', '니환궁 · 등선의 길', '천겁 성공률 +10%', 5e6, { trib: 0.1 }),
    N('tribc', 1.1, -4.4, 'trib1', 'a_thunder', '뇌정체', '천겁 영기 -5%', 8, 2000, 2, { tribCost: 0.05 }),
    N('trib2', -1.1, -4.4, 'trib1', 'a_seal', '금강신', '천겁 성공률 +2%', 10, 3000, 1.8, { trib: 0.02 }),
    N('essx', 1.1, -5.6, 'head', 'ui_ess', '선연', '이 세계의 정수 +15%', 10, 5e4, 1.9, { ess: 0.15 }),
    N('essx2', -1.1, -5.6, 'head', 'ui_ess', '천기', '이 세계의 정수 +15%', 10, 2e5, 2, { ess: 0.15 }),
    N('qi2', 1.0, -1.7, 'slot1', 'q_qi', '단중혈', '영기 +40%', 15, 400, 1.6, { qi: 0.4 }),
    N('click1', -1.0, -1.7, 'slot1', 'xx_hero0', '운기조식', '운기(좌선 누르기) 영기 +50%', 10, 60, 1.6, { click: 0.5 }),
    // ── 금: 수태음폐경 (왼팔) — 비검·요수
    ACU('m1', -1.4, -3.0, 'qi1', 'metal', '중부혈', 25),
    ACU('m2', -2.3, -2.3, 'm1', 'metal', '척택혈', 250),
    ACU('m3', -3.1, -1.4, 'm2', 'metal', '열결혈', 2500),
    OPEN('mOpen', -3.7, -0.4, 'm3', 'metal', '소상혈 · 폐경 개통', 3e4),
    N('fly1', -2.5, -3.5, 'm1', 'fx_sword', '비검술', '비검 피해 +30%', 15, 30, 1.5, { fly: 0.3 }),
    // 수도자 캐릭터 시트 (UNITS.md): 비검(기본) → 비검 연환(특수) → 만검귀종(기술 1) → 천뢰 ↔ 호신 결계(기술 2). 특성 오행은 진법에서
    NOTE('fly2', -3.6, -3.4, 'fly1', 'a_escape', '비검 연환', '비검이 맞힌 뒤 2마리 더 튕긴다', 6000, { flyChain: 1 }),
    NOTE('xx_rain', -4.2, -4.3, 'fly2', 'fx_sword', '만검귀종', '기술: 15초마다 보이는 적 모두에게 비검 ×2', 3e4, { xx_rain: 1 }),
    PAIR('xx_thunder', -5.5, -3.7, 'xx_rain', 'a_thunder', '천뢰', '20초마다 요수 셋에게 벼락 ×4', 2e5, { xx_thunder: 1 }, 'xx_kit'),
    PAIR('xx_ward', -3.6, -5.3, 'xx_rain', 'a_seal', '호신 결계', '30초마다 8초간 요수가 진기를 깨지 못한다', 2e5, { xx_ward: 1 }, 'xx_kit'),
    N('sword1', -4.6, -3.0, 'fly2', 'fx_sword', '어검술', '비검 간격 -20%', 5, 2e4, 2.2, { sword: 0.25 }),
    N('beast1', -4.4, -1.9, 'fly2', 'q_beast', '요수 사냥', '요수 영석 +35%', 15, 100, 1.55, { beast: 0.35 }),
    N('power1', -5.4, -2.2, 'sword1 beast1', 'a_sword', '검의', '도력 +30%', 15, 5e4, 1.7, { power: 0.3 }),
    N('stone1', -4.4, 0.4, 'mOpen', 'q_stone', '영석광', '영석 +30%', 15, 5e3, 1.6, { stone: 0.3 }),
    N('stone2', -5.2, 1.2, 'stone1', 'q_stone', '영맥 채굴', '영석 +50%', 15, 2e5, 1.7, { stone: 0.5 }),
    // ── 화: 수소음심경 (오른팔) — 제자·연단·단약
    ACU('f1', 1.4, -3.0, 'qi1', 'fire', '극천혈', 25),
    ACU('f2', 2.3, -2.3, 'f1', 'fire', '청령혈', 250),
    ACU('f3', 3.1, -1.4, 'f2', 'fire', '신문혈', 2500),
    OPEN('fOpen', 3.7, -0.4, 'f3', 'fire', '소충혈 · 심경 개통', 3e4),
    N('disc1', 2.5, -3.5, 'f1', 'q_disciple', '제자 거두기', '제자 +1 (영초 성장 +25%)', 6, 60, 3, { disciple: 1 }),
    N('alch1', 3.6, -3.4, 'disc1', 'q_furnace', '단로', '연단 속도 +30%', 15, 500, 1.6, { alch: 0.3 }),
    // 제자 캐릭터 시트: 채집·운반(기본·특수) → 단약 심부름(기술 1) → 호법 ↔ 영초 재배(기술 2)
    NOTE('disc_run', 4.2, -4.3, 'alch1', 'q_pill', '단약 심부름', '20초마다 제자가 단약 +1', 3e4, { disc_run: 1 }),
    PAIR('disc_guard', 5.5, -3.7, 'disc_run', 'q_disciple', '호법', '제자가 곁의 요수를 친다 (초당 도력 ×0.3)', 2e5, { disc_guard: 1 }, 'disc_kit'),
    PAIR('disc_farm', 3.6, -5.3, 'disc_run', 'q_herb', '영초 재배', '영초 성장 ×2', 2e5, { disc_farm: 1 }, 'disc_kit'),
    N('pill1', 4.6, -3.0, 'alch1', 'q_pill', '단방', '단약 하나의 성공률 +1%', 6, 5000, 2, { pillPow: 0.01 }),
    NOTE('pillMax', 4.4, -1.9, 'alch1', 'q_pill', '구전금단', '천겁에 쓰는 단약 +2개', 3e4, { pillMax: 2 }),
    N('alch2', 5.4, -2.2, 'pill1 pillMax', 'q_furnace', '삼매진화', '연단 속도 +50%', 15, 8e4, 1.7, { alch: 0.5 }),
    N('click2', 4.4, 0.4, 'fOpen', 'xx_hero0', '주천 호흡', '운기 영기 +100%', 10, 5e3, 1.7, { click: 1 }),
    N('qi3', 5.2, 1.2, 'click2', 'a_gong', '영기 순환', '영기 +60%', 15, 2e5, 1.7, { qi: 0.6 }),
    // ── 목: 족궐음간경 (왼다리) — 영초
    ACU('w1', -0.9, 1.3, 'root', 'wood', '기문혈', 20),
    ACU('w2', -1.1, 2.5, 'w1', 'wood', '곡천혈', 200),
    ACU('w3', -1.3, 3.7, 'w2', 'wood', '태충혈', 2000),
    OPEN('wOpen', -1.5, 4.9, 'w3', 'wood', '대돈혈 · 간경 개통', 2e4),
    N('herb1', -2.2, 1.9, 'w1', 'q_herb', '영초 재배', '영초 성장 +30%', 15, 60, 1.55, { herb: 0.3 }),
    N('herb2', -2.5, 3.1, 'herb1 w2', 'q_herbplot', '영전', '영초 성장 +50%', 15, 3000, 1.6, { herb: 0.5 }),
    N('disc2', -2.8, 4.3, 'herb2', 'q_disciple', '외문 제자', '제자 +1 (영초 성장 +25%)', 3, 2e4, 3, { disciple: 1 }),
    // ── 수: 족소음신경 (오른다리) — 영기
    ACU('a1', 0.9, 1.3, 'root', 'water', '수부혈', 10),
    ACU('a2', 1.1, 2.5, 'a1', 'water', '음곡혈', 100),
    ACU('a3', 1.3, 3.7, 'a2', 'water', '태계혈', 1000),
    OPEN('aOpen', 1.5, 4.9, 'a3', 'water', '용천혈 · 신경 개통', 1.5e4),
    N('qi4', 2.2, 1.9, 'a1', 'a_gong', '토납', '영기 +30%', 15, 80, 1.55, { qi: 0.3 }),
    N('vein1', 2.5, 3.1, 'qi4 a2', 'q_vein', '영맥 감응', '영맥 칸 출력 +0.5배', 4, 5000, 2.4, { vein: 0.5 }),
    N('tribc2', 2.8, 4.3, 'vein1', 'a_thunder', '피뢰', '천겁 영기 -5%', 4, 5e4, 2.4, { tribCost: 0.05 }),
    // ── 토: 족태음비경 (아랫배) — 방어·천겁
    ACU('t1', 0, 1.7, 'root', 'earth', '대횡혈', 20),
    ACU('t2', 0, 2.9, 't1', 'earth', '혈해혈', 200),
    ACU('t3', 0, 4.1, 't2', 'earth', '삼음교', 2000),
    OPEN('tOpen', 0, 5.3, 't3', 'earth', '은백혈 · 비경 개통', 2e4),
    N('guard1', 0, 6.4, 'tOpen', 'q_gate', '호산대진', '요수에 깨진 진기 회복 2배 빠르게', 3, 3e4, 2.4, { guard: 0.2 }),
    // ── 바깥 대주천: 경맥 끝에서 이어져 몸을 한 바퀴 — 진법 퍼즐(상생·상극·영맥·칸)을 키운다
    N('c1', -4.0, 4.5, 'wOpen disc2', 'q_cloud', '소주천', '상생 보너스 +10%p', 8, 4e4, 2, { gen: 0.1 }),
    N('c2', -5.6, 3.0, 'c1 stone2', 'e_wood', '목생화', '목 진기 +40%', 10, 6e4, 1.8, { wood: 0.4 }),
    N('c3', -6.4, 0.4, 'c2', 'e_metal', '금생수', '금 진기 +40%', 10, 1e5, 1.8, { metal: 0.4 }),
    N('c4', -6.4, -2.4, 'c3 power1', 'q_vein', '영맥 공명', '영맥 칸 출력 +0.5배', 4, 3e5, 2.4, { vein: 0.5 }),
    N('c5', -5.2, -4.8, 'c4', 'a_seal', '상극 조화', '상극 손해 -30%', 3, 5e5, 2.5, { over: 0.3 }),
    N('c6', -3.0, -6.4, 'c5', 'q_peak', '진법 확장', '진법 칸 +2', 4, 8e5, 3, { slots: 2 }),
    N('c7', 4.0, 4.5, 'aOpen tribc2', 'q_cloud', '대주천', '상생 보너스 +10%p', 8, 4e4, 2, { gen: 0.1 }),
    N('c8', 5.6, 3.0, 'c7 qi3', 'e_water', '수생목', '수 진기 +40%', 10, 6e4, 1.8, { water: 0.4 }),
    N('c9', 6.4, 0.4, 'c8', 'e_fire', '화생토', '화 진기 +40%', 10, 1e5, 1.8, { fire: 0.4 }),
    N('c10', 6.4, -2.4, 'c9 alch2', 'e_earth', '토생금', '토 진기 +40%', 10, 3e5, 1.8, { earth: 0.4 }),
    N('c11', 5.2, -4.8, 'c10', 'a_seal', '오행 상생', '상생 보너스 +15%p', 4, 5e5, 2.5, { gen: 0.15 }),
    N('c12', 3.0, -6.4, 'c11', 'q_peak', '천지 진법', '진법 칸 +2', 4, 8e5, 3, { slots: 2 }),
    NOTE('c13', 0, -8.2, 'c6 c12 asc', 'q_pagoda', '천인합일', '영기 ×2 · 영석 ×2', 2e7, { qi: 1, stone: 1 }),
    N('gd2', -1.2, 6.3, 'guard1 c1', 'q_gate', '호법 결계', '요수에 깨지는 시간 -20%', 3, 2e5, 2.5, { guard: 0.2 }),
    N('pw2', 1.2, 6.3, 'guard1 c7', 'a_sword', '검기 호체', '도력 +50%', 15, 2e5, 1.7, { power: 0.5 }),
    // ── 빈자리: 기경팔맥 (경맥과 대주천 사이)
    N('meso1', -2.2, -4.8, 'trib2 fly1', 'a_seal', '금강불괴', '천겁 성공률 +2%', 5, 2e4, 2, { trib: 0.02 }),
    N('meso2', 2.2, -4.8, 'tribc disc1', 'q_qi', '청정심', '심마 -15%', 2, 3e4, 3, { demon: 0.15 }),
    N('ho1', -2.0, -6.0, 'meso1 essx2', 'q_stone', '선기', '영석 +40%', 15, 3e5, 1.7, { stone: 0.4 }),
    N('ho2', 2.0, -6.0, 'meso2 essx', 'a_gong', '선기 II', '영기 +40%', 15, 3e5, 1.7, { qi: 0.4 }),
    N('tp1', -1.6, -7.2, 'ho1', 'q_qi', '천지 영기', '영기 +80%', 15, 2e6, 1.8, { qi: 0.8 }),
    N('tp2', 1.6, -7.2, 'ho2', 'ui_ess', '선원', '이 세계의 정수 +20%', 10, 2e6, 2, { ess: 0.2 }),
    N('lw1', -3.6, 2.2, 'herb1 stone1', 'q_furnace', '영약', '연단 속도 +40%', 15, 1e4, 1.7, { alch: 0.4 }),
    N('rw1', 3.6, 2.2, 'qi4 click2', 'a_gong', '진원', '영기 +40%', 15, 1e4, 1.7, { qi: 0.4 }),
    N('lm1', -5.4, -0.6, 'stone1', 'q_beast', '요단', '요수 영석 +50%', 15, 2e4, 1.7, { beast: 0.5 }),
    N('rm1', 5.4, -0.6, 'click2', 'q_pill', '단독', '단약 하나의 성공률 +1%', 4, 4e4, 2.2, { pillPow: 0.01 }),
    N('lb1', -2.6, 5.6, 'disc2 wOpen', 'e_wood', '목영', '목 진기 +30%', 10, 3e4, 1.8, { wood: 0.3 }),
    N('rb1', 2.6, 5.6, 'tribc2 aOpen', 'e_water', '수영', '수 진기 +30%', 10, 3e4, 1.8, { water: 0.3 }),
    N('bt1', 0, 7.5, 'guard1', 'e_earth', '대지 진법', '토 진기 +30%', 10, 5e4, 1.8, { earth: 0.3 }),
    N('bt2', 0, 8.6, 'bt1', 'q_peak', '지맥 진법', '진법 칸 +2', 2, 2e6, 4, { slots: 2 }),
    N('lc5', -4.6, -5.8, 'c5', 'e_metal', '금영', '금 진기 +30%', 10, 6e5, 1.8, { metal: 0.3 }),
    N('rc5', 4.6, -5.8, 'c11', 'e_fire', '화영', '화 진기 +30%', 10, 6e5, 1.8, { fire: 0.3 }),
    N('lc3', -7.4, -1.0, 'c3 c4', 'q_cloud', '상생 극의', '상생 보너스 +10%p', 4, 1e6, 2.5, { gen: 0.1 }),
    N('rc3', 7.4, -1.0, 'c9 c10', 'q_vein', '영맥 극의', '영맥 칸 출력 +0.5배', 4, 1e6, 2.5, { vein: 0.5 }),
  ]), { get: () => S().w.xianxia.stone, spend: n => { S().w.xianxia.stone -= n; }, tile: 'q_stone', name: '영석' }, {
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
  ], { get: () => S().w.scifi.credits, spend: n => { S().w.scifi.credits -= n; }, tile: 's_credit', name: '크레딧' }, {
    // 밑그림: 동쪽을 향한 전함 — 앞(동) 포탑 계열, 위 돛대 포대 증설, 뒤(서) 엔진·코어
    bg(P, U) {
      const f = FIG(P);
      return `<g class="fig ship">
        ${f.poly([[1.6, -1.0], [3.8, -3.6], [5.0, -3.6], [4.4, -1.0]], 'wing')}
        ${f.poly([[1.6, 0.6], [3.8, 2.0], [6.4, 2.0], [5.0, 0.6]], 'wing')}
        ${f.poly([[-4.0, -1.0], [-4.0, 1.0], [4.0, 1.0], [7.0, 0.0], [4.0, -1.0]], 'hull')}
        ${f.line([[-0.6, -1.0], [-0.6, -3.6]], 'mast')}${f.line([[0.6, -1.0], [0.6, -3.6]], 'mast')}
        ${f.line([[-0.6, -2.4], [0.6, -2.4]], 'mast')}${f.line([[-0.6, -3.6], [0.6, -3.6]], 'mast')}
        ${f.poly([[-4.0, -0.7], [-5.6, -1.1], [-5.6, 1.1], [-4.0, 0.7]], 'engine')}
        ${f.poly([[-5.6, -0.7], [-7.2, 0], [-5.6, 0.7]], 'flame')}
        ${f.line([[2.6, -0.4], [5.6, -0.4]], 'stripe')}
      </g>`;
    },
  });

  // ───── 크툴루 (동전): 낚시 ─────
  // 이성이 한 번 출항의 한도다 (판타지의 체력, 무협의 나이). 위: 이성(최대치·소모·회복·휴식), 그 왼쪽 위 끝: 광기 활용
  // 아래: 줄·추 · 오른쪽: 바늘·릴·자동 조종 · 왼쪽: 값·정수
  G.Tree.define('cthulhu', [
    N('root', 0, 0, '', 'w_cthulhu', '낡은 어선', '', 1, 0, 1, {}, { root: true }),
    // 아래: 줄 (깊이)
    N('line1', 0, 1.2, 'root', 'item_line', '낚싯줄', '+10m', 40, 15, 1.26, { line: 2 }),
    N('line2', 0, 2.6, 'line1', 'item_wire', '강철 와이어', '+20m', 40, 2500, 1.35, { line: 4 }),
    N('line3', 0, 4.0, 'line2', 'sea_w3', '심연용 줄', '+40m', 40, 1e6, 1.6, { line: 8 }),
    N('lamp', 1.2, 3.2, 'line2', 'c_candle', '심해 등불', '빛 반경 +1칸', 3, 3000, 3, { lamp: 1 }),
    N('sink', -1.2, 3.2, 'line2', 'sea_rock', '무거운 추', '내리는 속도 +15%', 10, 200, 1.6, { sink: 0.15 }),
    // 아래 오른쪽: 등불 (빛이 닿는 곳)
    N('lamp2', 2.4, 3.8, 'lamp', 'x_lantern', '고래기름 등불', '빛 반경 +1칸', 3, 8e4, 3, { lamp: 1 }),
    N('lure', 3.6, 3.4, 'lamp2', 'fs_blind', '유인등', '빛 속 물고기 끌림 +0.3칸/초', 5, 1.5e5, 2, { lure: 0.3 }),
    N('flare', 3.6, 4.6, 'lamp2', 'cu_foil', '청색 조명탄', '촉수 속도 -15%', 4, 3e5, 2.2, { flare: 0.15 }),
    // 아래 왼쪽: 발톱·촉수에 버티기
    N('gloves', -2.4, 3.8, 'sink', 'c_tentacle', '갈고리 장갑', '줄 끊김 이성 피해 -15%', 5, 6e4, 2, { clawWard: 0.15 }),
    N('grip', -3.6, 3.4, 'gloves', 'a_seal', '쇠사슬 목줄', '줄 끊김 손실 -20%', 3, 1.5e5, 2.5, { grip: 0.2 }),
    N('harpoon', -3.6, 4.6, 'gloves', 'a_sword', '작살', '퇴마 피해 +1', 2, 3e5, 4, { harpoon: 1 }),
    // 오른쪽: 바늘·밑밥·손 (감는 속도 노드는 없다: 다 잡으면 저절로 빠르게 올라온다)
    N('hook1', 1.2, 0, 'root', 'fs_cod', '바늘 추가', '한 번에 +1마리', 8, 40, 2.2, { catch: 1 }),
    N('reel1', 2.3, -0.8, 'hook1', 'n_auto_build', '쌍바늘', '한 번에 +1마리', 4, 300, 3, { catch: 1 }),
    N('autoreel', 3.4, -1.6, 'reel1', 'n_auto_tier', '자동 릴', '자동 던지기 감는 속도 +20%', 10, 400, 1.6, { autoReel: 0.2 }),
    N('reel2', 4.6, -2.2, 'autoreel', 'q_herb', '밑밥', '물고기 출현 +4%p', 5, 5000, 2, { school: 0.04 }),
    N('skill1', 2.3, 0.8, 'hook1', 'c_investigator', '노련한 손', '자동 조종 시야 +1칸', 6, 100, 2, { skill: 1 }),
    N('sonar', 3.4, 1.6, 'skill1', 'c_lamp', '음파 탐지기', '자동 조종 시야 +1칸', 4, 3000, 2, { skill: 1 }),
    N('exorcise', 2.4, 2.4, 'skill1', 'cu_cultist', '자동 퇴마', '바늘 근처 촉수 퇴마 (6초 · 3초 · 2초)', 3, 1e4, 3, { exorcise: 1 }),
    // 낚시꾼 캐릭터 시트 기술 2 (UNITS.md): 줄 끝에서 한 번
    PAIR('kit_net', 1.0, 1.9, 'exorcise', 'fs_bone', '그물 투척', '줄 끝에서 바늘 2칸 안 물고기를 한꺼번에 건다', 5e4, { kit_net: 1 }, 'c_kit'),
    PAIR('kit_abyss', 3.9, 2.4, 'exorcise', 'fs_kraken', '심연 낚시', '줄 끝에서 그 깊이의 희귀 어종이 하나 걸린다', 5e4, { kit_abyss: 1 }, 'c_kit'),
    N('bait1', 3.5, 0, 'reel1 skill1', 'fs_kraken', '심해 미끼', '희귀 어종 +20%', 10, 2000, 1.7, { bait: 0.2 }),
    N('net', 4.7, 0, 'bait1', 'fs_bone', '그물', '걸림 범위 +15%', 3, 2e4, 2.5, { net: 0.15 }),
    // 오른쪽 끝: 자석
    N('magnet', 5.9, 0, 'net', 'a_field', '자석 바늘', '자석 당김 +0.5칸/초', 5, 6e4, 2, { magnet: 0.5 }),
    N('magR', 7.1, 0, 'magnet', 'a_thunder', '전자석', '자석 범위 +0.5칸', 4, 2.5e5, 2.2, { magR: 0.5 }),
    N('magnet2', 5.9, 1.2, 'magnet', 'i_scale', '강자석', '자석 당김 +0.5칸/초', 5, 1.2e5, 2, { magnet: 0.5 }),
    // 왼쪽: 값
    N('value1', -1.2, 0, 'root', 'c_coin', '어시장', '물고기 값 +20%', 20, 30, 1.45, { value: 0.2 }),
    N('value2', -2.4, 0, 'value1', 'fs_deepone', '인스머스 상회', '물고기 값 +40%', 20, 1e4, 1.55, { value: 0.4 }),
    N('essc', -3.6, 0, 'value2', 'ui_ess', '심연의 부름', '이 세계의 정수 +15%', 10, 5e4, 1.9, { ess: 0.15 }),
    N('shallow', -1.8, 1.0, 'value1', 'fs_crab', '얕은 바다 어부', '얕은 바다 물고기 값 +20%', 10, 100, 1.6, { shallow: 0.2 }),
    N('chain', -3.0, 1.2, 'value2', 'fs_jelly', '줄줄이 낚시', '둘째 마리부터 물고기 값 +5%', 5, 1500, 1.8, { chain: 0.05 }),
    N('collector', -4.2, 1.0, 'chain', 'cu_luck', '수집가', '도감 1종마다 물고기 값 +1%', 5, 8000, 2, { collector: 0.01 }),
    N('bigfish', -4.8, 0, 'essc', 'fs_dagon', '대어 전문', '대어 물고기 값 +30%', 5, 1e5, 2, { bigfish: 0.3 }),
    N('value3', -6.0, 0, 'bigfish', 'ui_gold', '르뤼에 경매장', '물고기 값 +60%', 20, 5e5, 1.6, { value: 0.6 }),
    N('runes', -4.8, -1.0, 'essc', 'ui_sign', '고대 문자 해독', '고대 인장 출현 +50%', 5, 2e4, 2, { runes: 0.5 }),
    N('essc2', -6.0, -1.0, 'runes', 'ui_ess', '심연의 부름 II', '이 세계의 정수 +15%', 10, 5e5, 2, { ess: 0.15 }),
    // 위: 이성 — 최대치(가운데 줄), 소모 감소(왼쪽), 회복·휴식(오른쪽)
    N('mind1', 0, -1.2, 'root', 'cu_mind', '정신 수양', '최대 이성 +20', 10, 80, 1.6, { sanMax: 20 }),
    N('mind2', 0, -2.6, 'mind1', 'cu_mind', '정신 수양 II', '최대 이성 +40', 10, 2000, 1.7, { sanMax: 40 }),
    N('mind3', 0, -4.0, 'mind2', 'cu_mind', '정신 수양 III', '최대 이성 +80', 10, 1e5, 1.8, { sanMax: 80 }),
    N('dream', 0, -5.4, 'mind3', 'n_sands', '꿈 없는 잠', '출항 이성 +10%', 3, 5e5, 3, { dream: 0.1 }),
    N('ward1', -1.1, -2.2, 'mind1', 'c_ward', '엘더 사인', '깊이 이성 소모 -8%', 8, 500, 1.8, { ward: 0.08 }),
    N('salt', -1.2, -3.4, 'ward1 mind2', 'sea_w1', '짠물 적응', '기본 이성 소모 -10%', 6, 300, 1.7, { salt: 0.1 }),
    N('charm', -2.3, -2.8, 'ward1', 'c_sign', '촉수 부적', '줄 버팀 +15%', 4, 3000, 2.2, { charm: 0.15 }),
    N('charm2', -3.4, -3.4, 'charm', 'c_tentacle', '방수 부적', '줄 버팀 +10%', 4, 2e4, 2.2, { charm: 0.1 }),
    N('deal', 1.1, -2.2, 'mind1', 'fs_siren', '심해인과의 거래', '도감 인장 ×2 · 인장 어종 출현 ×2', 1, 5000, 1, { deal: 1 }),
    N('song', 1.2, -3.4, 'mind2 deal', 'c_hat', '뱃노래', '수면 도착 이성 +1', 5, 400, 1.8, { song: 1 }),
    N('rum', 2.4, -4.0, 'song', 'c_kiosk', '독한 럼', '물고기당 이성 +0.5', 5, 3000, 1.9, { rum: 0.5 }),
    N('bunk', 1.2, -4.8, 'song', 'c_house', '선실 침상', '휴식 -2초', 3, 1500, 2, { bunk: 2 }),
    // 광기 활용: 이성이 낮을수록 값이 오르는 것을 키운다. 끝의 택1
    N('madval', -2.4, -4.2, 'salt', 'c_horror', '광기의 값어치', '낮은 이성 물고기 값 배율 상한 +30%p', 5, 5000, 1.8, { madVal: 0.3 }),
    N('edge', -3.6, -4.8, 'madval', 'c_tentacle', '위태로운 줄타기', '이성 30% 이하 희귀 어종 +25%', 5, 2e4, 2, { edge: 0.25 }),
    N('whisper', -2.4, -5.4, 'madval', 'cu_ritual', '속삭임 듣기', '이성 50% 이하 정수 +20%', 5, 3e4, 2, { whisper: 0.2 }),
    N('pact', -1.7, -6.8, 'whisper', 'c_cultist', '공포의 탐닉', '낮은 이성 물고기 값 보너스 ×2 · 이성 소모 +30%', 1, 1e5, 1, { pact: 1 }, { pair: 'c_mad' }),
    N('calm', -0.5, -6.8, 'whisper', 'c_ward', '평정심', '이성 소모 -30% · 낮은 이성 물고기 값 보너스 ×0.5', 1, 1e5, 1, { calm: 1 }, { pair: 'c_mad' }),
  ], { get: () => S().w.cthulhu.coins, spend: n => { S().w.cthulhu.coins -= n; }, tile: 'c_coin', name: '동전' }, {
    bg(P, U) {
      const f = FIG(P);
      const tent = (x0, sway) => f.path(`M ${x0} 0.2 Q ${x0 + sway} 1.8 ${x0 - sway * 0.6} 3.2 Q ${x0 - sway * 1.4} 4.6 ${x0 + sway * 0.4} 5.8`, 'tent');
      return `<g class="fig cthu">
        ${f.path('M -1.6 -3.4 Q -4.5 -5.2 -6.8 -3.6 Q -5.8 -2.6 -6.4 -1.4 Q -4.8 -1.6 -4.2 -0.6 Q -2.8 -1.6 -1.6 -1.0 Z', 'wing')}
        ${f.path('M 1.6 -3.4 Q 4.5 -5.2 7.4 -3.6 Q 6.4 -2.6 7.0 -1.4 Q 5.2 -1.6 4.6 -0.6 Q 3.0 -1.6 1.6 -1.0 Z', 'wing')}
        ${tent(-1.8, -0.8)}${tent(-0.9, 0.7)}${tent(0, -0.6)}${tent(0.9, 0.8)}${tent(1.8, 0.7)}
        ${f.path('M -2.4 -0.4 Q -3.0 -4.6 0 -7.2 Q 3.0 -4.6 2.4 -0.4 Q 0 0.8 -2.4 -0.4 Z', 'head')}
        ${f.circle(-0.9, -2.8, 0.38, U, 'eye')}${f.circle(0.9, -2.8, 0.38, U, 'eye')}
      </g>`;
    },
  });

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
    SYN('syn_heaven', -1.1, 2.6, 'open_xianxia open_cthulhu', 'w_xianxia', '천기누설', '수선 경지 1마다 물고기 값 +15%', 200),
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
