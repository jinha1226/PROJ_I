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
    N('root', 0, 0, '', 'ui_star', '모험의 시작', '', 1, 0, 1, {}, { root: true }),

    // ── 북: 원정대 (직업 기술·★짝은 용병 개인 스킬로 옮겼다 — DESIGN.md 39) ──
    N('party', 0, -1.9, 'root', 'u_legend', '원정대', '동료 3명까지 출전', 1, 20, 1, {}),
    // ── 남: 단장과 파티 전체 ──
    NOTE('rage', 0, 3.4, 'k_cleave k_undying', 'r_dragon', '전투 함성', '기술: 10초간 모든 피해 ×2 (40초)', 6000, { sk_rage: 1 }),
    // 연계기 (DESIGN.md 43): 거는 상태 → 받는 직업. 한 번 열면 끝, 수치는 올리지 않는다 (효과는 js/combo.js)
    NOTE('cb_aim', -1.2, -3, 'party', 'v_berserk', '넘어진 적 강타', '넘어짐 → 근접 이점 ×5', 600, { cb_aim: 1 }),
    NOTE('cb_back', -2.3, -4, 'cb_aim', 'u_rogue', '급습', '기절 · 속박 · 실명 · 빛남 → 로그 기습 ×2', 4000, { cb_back: 1 }),
    NOTE('cb_volley', 1.2, -3, 'party', 'u_archer', '집중 사격', '속박 · 빛남 → 원거리 전원 ×1.5', 600, { cb_volley: 1 }),
    NOTE('cb_drop', 2.3, -4, 'cb_volley', 'u_paladin', '마비 강타', '마비 → 근접 치명타 ×4', 4000, { cb_drop: 1 }),
    NOTE('cb_toxin', -1.2, -7.3, 'cb_aim', 'u_mage', '독 연소', '중독 → 소서러 폭발', 2e4, { cb_toxin: 1 }),
    NOTE('cb_over', -2.3, -8.3, 'cb_toxin', 'u_archmage', '과전류', '화상 → 위저드 연쇄 6', 8e4, { cb_over: 1 }),
    NOTE('cb_net', 1.2, -7.3, 'cb_volley', 'v_warlock', '기회 공격', '공포 → 곁의 근접 전원 ×1.5', 2e4, { cb_net: 1 }),
    NOTE('cb_shatter', 2.3, -8.3, 'cb_net', 'u_dragoon', '쇄도 일격', '기절 → 파이터 ×8', 8e4, { cb_shatter: 1 }),
    NOTE('cb_blood', -1.2, -11.5, 'cb_toxin', 'u_scout', '불붙은 거미줄', '속박 + 화상 → 속박된 적 전부 ×3', 4e5, { cb_blood: 1 }),
    NOTE('cb_shield', 1.2, -11.5, 'cb_net', 'u_paladin', '수호', '동료 넘어짐 · 마비 → 팔라딘 AC +2 · 주변 기절', 4e5, { cb_shield: 1 }),
    NOTE('cb_burn', -1.2, -15.7, 'cb_blood', 'u_archer', '집중 포화', '사냥꾼의 표식 · 헥스 → 전원 ×1', 3e6, { cb_burn: 1 }),
    NOTE('cb_finale', 1.2, -15.7, 'cb_shield', 'u_bard', '영감 일제 공격', '바드의 영감 → 전원 동시 공격', 3e6, { cb_finale: 1 }),
    N('slot', 0, -20.85, 'k_assault', 'u_legend', '대원정', '출전 동료 +1 (최대 4명)', 1, 1.5e7, 1, { slot: 1 }),
    NOTE('k_cleave', 0.6, 2.4, 'root', 'w_waraxe', '휩쓸기', '단장 공격이 표적 옆의 적에게도 50%', 3000, { k_cleave: 1 }),
    NOTE('k_undying', -0.6, 2.4, 'root', 'u_armor', '불굴', '층마다 한 번, 단장이 쓰러질 때 체력 30%로 버틴다', 3e5, { k_undying: 1 }),
    NOTE('k_assault', 0, -18.55, 'cb_burn cb_finale', 'u_god', '총공세', '기술: 열어 둔 동료 전원이 15초간 함께 싸운다 (90초)', 5e6, { sk_assault: 1 }),

    // ── 동: 전술 (지휘 — DESIGN.md 32). 위 줄 라이벌, 가운데 줄 지휘, 아래 줄 이동·협상 ──
    N('t_bounty', 2.3, -0.95, 'root', 'ui_gold', '표적 현상금', '표적 처치 골드 +30%', 6, 400, 2, { t_mark: 0.3 }),
    N('t_scout', 2.3, 0, 'root', 'a_seal', '정찰', '시야 +1', 3, 3000, 2.5, { t_scout: 1 }),
    N('t_march', 2.3, 0.95, 'root', 'st_haste', '강행군', '집결·서둘러 이동 +15%', 5, 600, 2, { t_march: 0.15 }),
    NOTE('t_ambush', 3.3, -0.95, 't_bounty', 'w_knife', '기습', '기습 +1초 · 기습 중 피해 +50%', 3000, { t_ambush: 1 }),
    NOTE('t_rally', 3.3, 0, 't_scout', 'b_fury', '집결 나팔', '집결 도착 · 공속 +20% 10초', 40000, { t_rally: 1 }),
    N('t_pact', 3.3, 0.95, 't_march', 'ui_gold', '협상', '통행료 -25%', 3, 2500, 2, { t_pact: 0.25 }),
    N('t_hunter', 4.3, -0.95, 't_ambush', 'b_dragon', '현상금 사냥꾼', '라이벌 격파 골드 +50%', 5, 12000, 2, { t_hunter: 0.5 }),
    NOTE('t_hold', 4.3, 0, 't_rally', 'd_shield', '진형 유지', '표적 공격 중 받는 피해 -15%', 2e5, { t_hold: 1 }),
    NOTE('t_ally', 4.3, 0.95, 't_pact', 'fx_holy', '동맹 신호', '우호 지원 체력 70%부터 · +5초', 15000, { t_ally: 1 }),
    NOTE('t_recruit', 5.3, -0.95, 't_hunter', 'u_legend', '포섭', '입단 희망 +30%p', 60000, { t_recruit: 0.3 }),
    NOTE('t_evade', 5.3, 0.95, 't_ally', 'a_seal', '그림자 행군', '우회 시 교전 없음', 80000, { t_evade: 1 }),
    NOTE('t_auto', 5.3, 0, 't_hold', 'n_auto_build', '전술 본능', '자동 표적 · 보스·최강', 3e5, { t_auto: 1 }),

    // ── 서: 재화 ──
    N('gold1', -1.3, 0, 'root', 'ui_gold', '약탈', '골드 +15%', 15, 25, 1.5, { gold: 0.15 }),
    N('speed1', -2.3, 0, 'gold1', 'a_escape', '가벼운 발걸음', '이동 속도 +8%', 8, 50, 1.7, { speed: 0.08 }),
    N('g_boss', -2.3, 0.95, 'gold1', 'b_goblinchief', '현상금', '보스 골드 +100%', 5, 300, 2.2, { g_boss: 1 }),
    N('gold2', -3.3, 0, 'speed1', 'ui_gold', '보물 사냥꾼', '골드 +30%', 20, 5000, 1.55, { gold: 0.3 }),
    N('g_chest', -2.3, -0.95, 'gold1', 'x_chest', '보물상자', '층마다 보물상자 +1', 3, 2000, 4, { g_chest: 1 }),
    NOTE('g_mimic', -3.3, -0.95, 'g_chest', 'm_mimic', '미믹 사냥', '상자 30%가 미믹: 잡으면 골드 ×5', 20000, { g_mimic: 1 }),
    N('g_lucky', -4.3, -0.95, 'g_mimic', 'x_chest', '행운의 열쇠', '상자 골드 +50%', 10, 30000, 1.7, { g_lucky: 0.5 }),
    NOTE('g_skip', -4.3, 0, 'gold2', 'f_stairs', '층 도약', '20초 안에 층을 정리하면 한 층 더 내려간다', 1.5e5, { g_skip: 1 }),
    N('g_kill', -3.3, 0.95, 'g_boss', 'u_sword', '전리품', '처치 골드 +10%', 10, 1500, 1.6, { gold: 0.1 }),
    NOTE('g_jack', -4.3, 0.95, 'g_kill', 'b_gold', '대박', '처치의 3%는 골드 ×5', 4000, { g_jack: 1 }),
    NOTE('g_goblin', -5.3, -0.95, 'g_lucky', 'm_ggoblin', '황금 고블린', '층마다 25% 확률로 나타나 달아난다 · 잡으면 골드 ×30', 2e5, { g_goblin: 1 }),
    N('g_bargain', -6.3, 0.95, 'g_fever', 'ui_gold', '흥정', '이 트리 비용 -3%', 10, 1e5, 1.8, { g_bargain: 0.03 }),
    N('g_lucky2', -6.3, -0.95, 'g_goblin', 'x_chest', '상자 장인', '상자 골드 +100%', 5, 2e5, 2, { g_lucky: 1 }),
    N('g_mimic2', -8.3, -0.95, 'g_goblin2', 'm_mimic', '미믹 감정', '미믹 보상 ×10 (원래 ×5)', 1, 8e5, 1, { g_mimic2: 1 }),
    N('g_goblin2', -7.3, -0.95, 'g_lucky2', 'm_ggoblin', '고블린 사냥꾼', '황금 고블린 등장 확률 +15%', 3, 6e5, 2.5, { g_goblin2: 0.15 }),
    NOTE('g_fever', -5.3, 0.95, 'g_jack', 'b_gold', '황금열', '30마리 처치마다 10초간 골드 ×2', 6000, { g_fever: 1 }),
    N('gold3', -5.3, 0, 'g_skip', 'ui_gold', '용의 보고', '골드 +25%', 10, 3e6, 2, { gold: 0.25 }),
  ], { get: () => S().w.fantasy.gold, spend: n => { S().w.fantasy.gold -= n; }, tile: 'ui_gold', name: '골드' },
  { costMul: st => Math.max(0.5, 1 - G.Tree.add('fantasy', st, 'g_bargain')) });


})();
