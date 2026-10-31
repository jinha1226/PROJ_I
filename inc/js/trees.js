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

    // ── 북: 원정대 (직업 기술·★짝은 용병 개인 스킬로 옮겼다 — DESIGN.md 39) ──
    N('party', 0, -1.9, 'root', 'u_legend', '원정대', '동료 3명까지 출전', 1, 20, 1, {}),
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
    // 연계기 (DESIGN.md 43): 거는 상태 → 받는 직업. 한 번 열면 끝, 수치는 올리지 않는다 (효과는 js/combo.js)
    NOTE('cb_aim', -1.2, -3, 'party', 'u_archer', '정조준', '기절 → 레인저 ×6', 600, { cb_aim: 1 }),
    NOTE('cb_back', -2.3, -4, 'cb_aim', 'u_rogue', '뒤치기', '기절 → 암살자 ×4 · 20% 처형', 4000, { cb_back: 1 }),
    NOTE('cb_volley', 1.2, -3, 'party', 'u_archer', '일제 사격', '표식 → 원거리 전원 ×1.5', 600, { cb_volley: 1 }),
    NOTE('cb_drop', 2.3, -4, 'cb_volley', 'u_dragoon', '낙하 창', '표식 → 용기병 ×6 · 출혈', 4000, { cb_drop: 1 }),
    NOTE('cb_toxin', -1.2, -7.3, 'allyAtk1', 'u_mage', '독 연소', '독 → 화염 마법사 폭발', 2e4, { cb_toxin: 1 }),
    NOTE('cb_over', -2.3, -8.3, 'cb_toxin', 'u_archmage', '과전류', '화상 → 대현자 연쇄 6', 8e4, { cb_over: 1 }),
    NOTE('cb_net', 1.2, -7.3, 'allyAtk1', 'u_scout', '쇠 그물', '감전 → 길잡이 정지 2초', 2e4, { cb_net: 1 }),
    NOTE('cb_shatter', 2.3, -8.3, 'cb_net', 'u_dragoon', '산산조각', '정지 → 용기병 ×8', 8e4, { cb_shatter: 1 }),
    NOTE('cb_blood', -1.2, -11.5, 'allyHp', 'u_cleric', '피의 기도', '출혈 → 수도사 파티 치유', 4e5, { cb_blood: 1 }),
    NOTE('cb_shield', 1.2, -11.5, 'allyHp', 'u_paladin', '방패 너머', '신성 방벽 → 성기사 기절', 4e5, { cb_shield: 1 }),
    NOTE('cb_burn', -1.2, -15.7, 'allyAtk2', 'u_mage', '모아서 태우기', '도발의 함성 → 유성 낙하', 3e6, { cb_burn: 1 }),
    NOTE('cb_finale', 1.2, -15.7, 'allyAtk2', 'u_bard', '피날레', '노래 끝 → 전원 동시 공격', 3e6, { cb_finale: 1 }),
    N('allyAtk1', 0, -6.15, 'party', 'u_legend', '전우애', '동료 공격력 +18%', 15, 1500, 1.5, { allyAtk: 0.18 }),
    N('allyHp', 0, -10.4, 'allyAtk1', 'rl_herb', '진형', '동료 체력 +20%', 15, 1500, 1.5, { allyHp: 0.2 }),
    N('allyAtk2', 0, -14.65, 'allyHp', 'u_god', '영웅단', '동료 공격력 +35%', 25, 200000, 1.6, { allyAtk: 0.35 }),
    N('slot', 0, -20.85, 'k_assault2 k_rally', 'u_legend', '대원정', '출전 동료 +1 (최대 4명)', 1, 1.5e7, 1, { slot: 1 }),
    NOTE('k_cleave', 1.6, 2.4, 'aspd1', 'w_waraxe', '휩쓸기', '기사 공격이 옆의 적에게도 50%', 3000, { k_cleave: 1 }),
    N('k_leech', -1.6, 2.4, 'hp1', 'r_dragon', '흡혈', '기사가 준 피해의 2%만큼 회복', 5, 800, 1.9, { k_leech: 0.02 }),
    NOTE('k_undying', -1.6, 6.4, 'hp3', 'u_armor', '불굴', '층마다 한 번, 기사가 쓰러질 때 체력 30%로 버틴다', 3e5, { k_undying: 1 }),
    N('k_crit2', 1.6, 6.4, 'critd', 'g_dagger', '약점 간파', '기사 치명 +2%', 10, 2e5, 1.7, { crit: 0.02 }),
    NOTE('k_assault', 0, -18.55, 'allyAtk2', 'u_god', '총공세', '기술: 열어 둔 동료 전원이 15초간 함께 싸운다 (90초)', 5e6, { sk_assault: 1 }),
    N('k_assault2', -0.7, -19.65, 'k_assault', 'st_haste', '끝없는 진격', '총공세 지속 +3초', 5, 8e6, 2.2, { k_assault2: 3 }),
    N('k_rally', 0.7, -19.65, 'k_assault', 'b_fury', '함성의 물결', '총공세 중 피해 +10%', 10, 8e6, 1.9, { k_rally: 0.1 }),

    // ── 동: 전술 (지휘 — DESIGN.md 32). 위 줄 라이벌, 가운데 줄 지휘, 아래 줄 이동·협상 ──
    N('t_cmd', 1.3, 0, 'root', 'u_legend', '지휘', '표적 피해 +15%', 20, 20, 1.45, { t_focus: 0.15 }),
    N('t_bounty', 2.3, -0.95, 't_cmd', 'ui_gold', '표적 현상금', '표적 처치 골드 +30%', 6, 400, 2, { t_mark: 0.3 }),
    N('t_scout', 2.3, 0, 't_cmd', 'a_seal', '정찰', '시야 +1', 3, 3000, 2.5, { t_scout: 1 }),
    N('t_march', 2.3, 0.95, 't_cmd', 'st_haste', '강행군', '집결·서둘러 이동 +15%', 5, 600, 2, { t_march: 0.15 }),
    NOTE('t_ambush', 3.3, -0.95, 't_bounty', 'w_knife', '기습', '기습 +1초 · 기습 중 피해 +50%', 3000, { t_ambush: 1 }),
    NOTE('t_rally', 3.3, 0, 't_scout', 'b_fury', '집결 나팔', '집결 도착 · 공속 +20% 10초', 40000, { t_rally: 1 }),
    N('t_pact', 3.3, 0.95, 't_march', 'ui_gold', '협상', '통행료 -25%', 3, 2500, 2, { t_pact: 0.25 }),
    N('t_hunter', 4.3, -0.95, 't_ambush', 'b_dragon', '현상금 사냥꾼', '라이벌 격파 골드 +50%', 5, 12000, 2, { t_hunter: 0.5 }),
    NOTE('t_hold', 4.3, 0, 't_rally', 'd_shield', '진형 유지', '표적 공격 중 받는 피해 -15%', 2e5, { t_hold: 1 }),
    NOTE('t_ally', 4.3, 0.95, 't_pact', 'fx_holy', '동맹 신호', '우호 지원 체력 70%부터 · +5초', 15000, { t_ally: 1 }),
    NOTE('t_recruit', 5.3, -0.95, 't_hunter', 'u_legend', '포섭', '입단 희망 +30%p', 60000, { t_recruit: 0.3 }),
    N('t_cmd2', 5.3, 0, 't_hold', 'u_god', '명장', '표적 피해 +25%', 10, 2e5, 1.8, { t_focus: 0.25 }),
    NOTE('t_evade', 5.3, 0.95, 't_ally', 'a_seal', '그림자 행군', '우회 시 교전 없음', 80000, { t_evade: 1 }),
    NOTE('t_auto', 6.3, 0, 't_cmd2', 'n_auto_build', '전술 본능', '자동 표적 · 보스·최강', 3e5, { t_auto: 1 }),

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

  // ───── 차원 넥서스 (정수) ─────
  G.Tree.define('nexus', [
    N('root', 0, 0, '', 'ui_nexus', '균열의 핵', '', 1, 0, 1, {}, { root: true }),
    N('res1', 0, -1.3, 'root', 'n_resonance', '차원 공명', '모든 생산 +25%', 5, 8, 2.3, { all: 0.25 }),
    N('res2', 0, -2.6, 'res1', 'n_resonance', '차원 공명 II', '모든 생산 +25%', 10, 600, 2.4, { all: 0.25 }),
    N('res3', 0, -3.9, 'res2', 'n_resonance', '차원 공명 III', '모든 생산 +30%', 20, 8e4, 2.5, { all: 0.3 }),
    N('flow', 0, 1.3, 'root', 'n_essflow', '정수 응결', '정수 획득 +15%', 10, 30, 2.6, { ess: 0.15 }),
    N('sands', 0, 2.6, 'flow', 'n_sands', '시간의 모래', '오프라인 진행 한도 +2시간 (기본 2시간)', 5, 20, 3, { sands: 1 }),
  ], { get: () => S().ess, spend: n => { S().ess -= n; }, tile: 'ui_ess', name: '정수' });

  // ───── 명성 (시즌이 끝나면 쌓인다 · 영구 — DESIGN.md 38) ─────
  G.Tree.define('fame', [
    N('root', 0, 0, '', 'u_legend', '명성', '', 1, 0, 1, {}, { root: true }),
    N('fm_power', 0, -1.3, 'root', 'u_sword', '이름값', '피해·체력 +10%', 20, 2, 1.35, { fm_power: 0.1 }),
    N('fm_gold', 1.2, -0.7, 'root', 'ui_gold', '후원', '골드 +15%', 20, 2, 1.35, { fm_gold: 0.15 }),
    N('fm_start', 1.2, 0.7, 'root', 'x_chest', '출발 자금', '시즌 시작 금고 ×2', 5, 4, 2, { fm_start: 1 }),
    N('fm_xp', -1.2, -0.7, 'root', 'b_atk', '교관', '경험치 +25%', 8, 3, 1.6, { fm_xp: 1 }),
    N('fm_keep', -1.2, 0.7, 'root', 'u_armor', '전통', '시즌 넘김 레벨 유지 +25%p', 2, 10, 3, { fm_keep: 1 }),
    N('fm_tavern', 0, 1.3, 'root', 'u_bard', '단골 선술집', '선술집 후보 +1', 2, 8, 3, { fm_tavern: 1 }),
    N('fm_roster', -2.4, 0, 'fm_xp fm_keep', 'u_legend', '길드관', '명단 +2', 2, 15, 2.5, { fm_roster: 1 }),
    N('fm_slot', 2.4, 0, 'fm_gold fm_start', 'u_god', '정예 원정', '출전 칸 +1', 1, 40, 1, { fm_slot: 1 }, { reqAll: true }),
  ], { get: () => S().w.fantasy.fame || 0, spend: n => { S().w.fantasy.fame -= n; }, tile: 'u_legend', name: '명성' });

  // ───── 별 (차원 붕괴 후 남는다) ─────
  G.Tree.define('stars', [
    N('root', 0, 0, '', 'ui_prestige', '붕괴의 잔해', '', 1, 0, 1, {}, { root: true }),
    N('head', 1.2, -0.8, 'root', 'ss_head_start', '선행 투자', '시작 골드 ×10', 5, 2, 2, { head: 1 }),
    N('starpow', 0, 1.2, 'root', 'ui_star', '별의 공명', '별 하나당 생산 보너스 +2%p', 10, 3, 1.8, { starPow: 0.02 }),
    N('staress', 1.2, 2.0, 'starpow', 'ss_star_ess', '별빛 응결', '정수 획득 +50%', 10, 3, 2, { starEss: 0.5 }),
    N('relic', -1.2, 2.0, 'starpow', 'ss_relic_amp', '유물 공명', '모든 유물 효과 +25%', 10, 5, 2, { relicAmp: 0.25 }),
  ], { get: () => S().stars, spend: n => { S().stars -= n; }, tile: 'ui_star', name: '별의 파편' });
})();
