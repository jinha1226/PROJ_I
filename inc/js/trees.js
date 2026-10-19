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
  G.Tree.define('fantasy', [
    N('root', 0, 0, '', 'knight', '모험의 시작', '', 1, 0, 1, {}, { root: true }),
    // 동: 공격
    N('atk1', 1.2, 0, 'root', 'u_sword', '예리한 검', '영웅 공격력 +15%', 10, 10, 1.45, { atk: 0.15 }),
    N('aspd1', 2.3, -0.7, 'atk1', 'n_auto_duel', '연속 베기', '공격 속도 +8%', 10, 60, 1.6, { aspd: 0.08 }),
    N('crit1', 2.3, 0.7, 'atk1', 'g_dagger', '급소 찌르기', '치명타 확률 +3%', 10, 80, 1.6, { crit: 0.03 }),
    N('atk2', 3.5, 0, 'aspd1 crit1', 'it_sword', '명검 단련', '영웅 공격력 +20%', 15, 300, 1.5, { atk: 0.2 }),
    N('critd', 4.6, 0.8, 'atk2', 'j_nangin', '일격필살', '치명타 피해 +25%', 15, 1500, 1.6, { critd: 0.25 }),
    N('atk3', 5.8, 0, 'atk2', 'j_jangmun', '성검', '영웅 공격력 +35%', 20, 10000, 1.6, { atk: 0.35 }),
    N('atk4', 7.2, 0, 'atk3', 'rl_heart', '용살검', '영웅 공격력 +50%', 25, 500000, 1.7, { atk: 0.5 }),
    // 남: 방어
    N('hp1', 0, 1.2, 'root', 'u_armor', '판금 갑옷', '영웅 최대 체력 +18%', 10, 15, 1.45, { hp: 0.18 }),
    N('regen1', -0.8, 2.3, 'hp1', 'r_stew', '붕대', '초당 체력 회복 +0.5%', 10, 120, 1.6, { regen: 0.005 }),
    N('armor1', 0.8, 2.3, 'hp1', 'd_shield', '방패술', '받는 피해 -3% (최대 75%)', 15, 200, 1.55, { armor: 0.03 }),
    N('hp2', 0, 3.5, 'regen1 armor1', 'rl_plating', '미스릴 사슬', '영웅 최대 체력 +25%', 15, 1000, 1.5, { hp: 0.25 }),
    N('hp3', 0, 4.8, 'hp2', 'i_scale', '용비늘 갑주', '영웅 최대 체력 +40%', 25, 100000, 1.6, { hp: 0.4 }),
    // 북: 동료
    N('archer', 0, -1.2, 'root', 'u_archer', '레인저', '합류 · 원거리', 1, 40, 1, { ally_archer: 1 }),
    N('cleric', -1.1, -2.3, 'archer', 'u_cleric', '떠돌이 수도사', '합류 · 치유', 1, 300, 1, { ally_cleric: 1 }),
    N('mage', 1.1, -2.3, 'archer', 'u_mage', '화염 마법사', '합류 · 범위 공격', 1, 1200, 1, { ally_mage: 1 }),
    N('paladin', 0, -3.4, 'cleric mage', 'u_paladin', '성기사', '합류 · 탱커', 1, 8000, 1, { ally_paladin: 1 }),
    N('dragoon', -1.1, -4.5, 'paladin', 'u_dragoon', '용기병', '합류 · 강타', 1, 60000, 1, { ally_dragoon: 1 }),
    N('archmage', 1.1, -4.5, 'paladin', 'u_archmage', '대현자', '합류 · 연쇄 번개', 1, 400000, 1, { ally_archmage: 1 }),
    N('allyAtk1', 2.3, -3.4, 'mage', 'u_legend', '전우애', '동료 공격력 +18%', 15, 1500, 1.5, { allyAtk: 0.18 }),
    N('allyAtk2', 2.3, -5.6, 'archmage allyAtk1', 'u_god', '영웅단', '동료 공격력 +35%', 25, 200000, 1.6, { allyAtk: 0.35 }),
    N('allyHp', -2.3, -3.4, 'cleric', 'rl_herb', '결속', '동료 최대 체력 +20%', 15, 1500, 1.5, { allyHp: 0.2 }),
    // 서: 살림·음유시인
    N('gold1', -1.2, 0, 'root', 'ui_gold', '약탈', '골드 +15%', 15, 25, 1.5, { gold: 0.15 }),
    N('speed1', -2.3, -0.8, 'gold1', 'a_escape', '가벼운 발걸음', '이동 속도 +8%', 8, 50, 1.7, { speed: 0.08 }),
    N('gold2', -3.5, 0, 'gold1', 'rs_salvage', '보물 사냥꾼', '골드 +30%', 20, 5000, 1.55, { gold: 0.3 }),
    N('essf', -4.7, -0.8, 'gold2', 'ui_ess', '심연의 기운', '이 세계의 정수 +15%', 10, 50000, 1.9, { ess: 0.15 }),
    N('bard', -2.3, 0.8, 'gold1', 'u_bard', '음유시인', '노래: 피해 ×1.5 ↔ 골드 ×2', 1, 150, 1, { ally_bard: 1 }),
    N('bless', -3.5, 1.6, 'bard', 'b_regen', '축복', '수도사 · 10초: 초당 체력 +4%', 1, 800, 1, { bless: 1 }),
    N('songDur', -2.3, 2.4, 'bard', 'fx_song', '앙코르', '노래·축복 지속 +20%', 16, 1500, 1.8, { songDur: 0.2 }),
    N('songWar', -4.7, 2.4, 'bless songDur', 'b_fury', '전쟁의 북', '노래 추가: 피해 ×3', 1, 30000, 1, { songWar: 1 }),
    // 남동: 벼락 일격과 기술
    N('smite1', 1.2, 1.2, 'root', 'n_auto_break', '벼락 일격', '맵 클릭 피해 +30%', 20, 20, 1.45, { smite: 0.3 }),
    N('smiteR', 2.4, 1.9, 'smite1', 'a_thunder', '낙뢰', '벼락 범위 +0.25칸', 6, 400, 2, { smiteR: 0.25 }),
    N('heal', 1.9, 3.0, 'smite1', 'fx_holy', '치유의 빛', '기술: 파티 체력 50% 회복 (30초)', 1, 800, 1, { sk_heal: 1 }),
    N('rage', 3.3, 3.0, 'smiteR heal', 'r_dragon', '전투 함성', '기술: 10초간 모든 피해 ×2 (40초)', 1, 6000, 1, { sk_rage: 1 }),
    N('meteor', 4.4, 2.2, 'rage', 'fx_fire', '유성 낙하', '기술: 클릭 피해 ×20 광역 (25초)', 1, 50000, 1, { sk_meteor: 1 }),
    N('autocast', 4.6, 3.6, 'rage', 'n_auto_build', '전투 본능', '기술을 쿨다운마다 알아서 쓴다', 1, 200000, 1, { autocast: 1 }),
  ], { get: () => S().w.fantasy.gold, spend: n => { S().w.fantasy.gold -= n; }, tile: 'ui_gold', name: '골드' });

  // ───── 무협 (깨달음: 회귀해도 남는다) ─────
  G.Tree.define('wuxia', [
    N('root', 0, 0, '', 'w_wuxia', '회귀자', '', 1, 0, 1, {}, { root: true }),
    N('jxp1', 1.2, 0, 'root', 'j_jumso', '눈치', '직업 숙련 +15%', 15, 1, 1.45, { jobXp: 0.15 }),
    N('gold1', 2.3, 0.8, 'jxp1', 'c_coin', '장사 수완', '은자 +20%', 15, 3, 1.5, { gold: 0.2 }),
    N('jxp2', 3.5, 0, 'jxp1', 'j_daejeja', '처세술', '직업 숙련 +30%', 20, 60, 1.5, { jobXp: 0.3 }),
    N('sxp1', -1.2, 0, 'root', 's_naegong', '깨우침', '무공 숙련 +15%', 15, 1, 1.45, { skillXp: 0.15 }),
    N('sxp2', -3.5, 0, 'sxp1', 's_tuna', '오성', '무공 숙련 +30%', 20, 60, 1.5, { skillXp: 0.3 }),
    N('twin', -2.3, 0.8, 'sxp1', 's_gyeong', '일하며 수련', '일하는 동안에도 무공을 25%씩 익힌다', 4, 15, 2, { twin: 0.25 }),
    N('peak1', 0, -1.2, 'root', 'it_manual', '전생의 기억', '전생 최고 레벨 보너스 +25%', 10, 5, 1.6, { peak: 0.25 }),
    N('peak2', 0, -2.6, 'peak1', 'n_auto_skill', '회귀의 축복', '전생 최고 레벨 보너스 +50%', 10, 300, 1.7, { peak: 0.5 }),
    N('life1', 0, 1.2, 'root', 'it_pill', '섭생', '천수 +2년', 10, 2, 1.55, { life: 2 }),
    N('young', 1.2, 2.2, 'life1', 'wh_topknot', '조숙', '회귀 나이 -1세 (최소 10세)', 6, 10, 2, { young: 1 }),
    N('life2', 0, 2.6, 'life1', 'it_daehwan', '반로환동', '천수 +5년', 10, 250, 1.7, { life: 5 }),
    N('walk', -1.2, 2.2, 'life1', 's_gyeong', '경공 입문', '이동 속도 +15%', 5, 4, 1.8, { walk: 0.15 }),
    N('fight1', 1.2, -1.2, 'root', 's_geom', '강호 실전', '전투력 +25%', 15, 3, 1.5, { combat: 0.25 }),
    N('bounty', 2.4, -1.9, 'fight1', 'j_nangin', '현상금 사냥', '산적 은자 +40%, 무공 숙련 +20%', 10, 20, 1.6, { bounty: 0.4 }),
    N('fight2', 3.4, -1.2, 'fight1', 'j_cheonha', '절세고수', '전투력 +50%', 20, 400, 1.6, { combat: 0.5 }),
    N('yang', -1.2, -1.2, 'root', 's_yangsaeng', '양생술 비전', '무공 「양생술」을 익힐 수 있다', 1, 25, 1, { unlock_yang: 1 }),
    N('magong', -2.4, -1.9, 'yang', 's_magong', '천마혈공 비급', '무공 「천마혈공」을 익힐 수 있다', 1, 400, 1, { unlock_magong: 1 }),
    N('ins1', 2.4, 1.9, 'gold1', 'ui_star', '대오각성', '깨달음 획득 +25%', 15, 20, 1.6, { ins: 0.25 }),
    N('essw', -4.6, 0.8, 'sxp2', 'ui_ess', '천기', '이 세계의 정수 +15%', 10, 800, 1.9, { ess: 0.15 }),
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
