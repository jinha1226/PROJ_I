'use strict';
// 게임 데이터: 세계 정보, 2D 맵(ASCII), 적·직업·포탑 등. 업그레이드는 trees.js의 스킬트리에 있다.
G.D = {};

G.D.WORLDS = [
  { id: 'fantasy', name: '끝없는 던전', genre: '판타지', style: '던전 전투형', icon: '🗡️', ref: 'Chef Knight · 무한던전피버 · Clicker Heroes',
    blurb: '요리하는 기사와 동료들이 끝없는 던전을 내려간다. 몬스터 재료로 요리해 버프를 얻어라.' },
  { id: 'wuxia', name: '화산귀환록', genre: '무협', style: '회귀 루프형', icon: '🥋', ref: 'Increlution · Progress Knight',
    blurb: '천수를 다하면 열여섯 살로 회귀한다. 전생에 쌓은 무공만큼 다음 생은 빨라진다. 점소이에서 검선까지.' },
  { id: 'xianxia', name: '구천등선', genre: '수선', style: '경지 수련형', icon: '☁️', ref: 'Cultivation Idle · Xiuzhen Idle',
    blurb: '영기를 모아 천겁을 넘고 경지를 돌파한다. 실패하면 도심이 흔들린다. 천교방에 도전해 영석을 벌어라.' },
  { id: 'scifi', name: '최후의 방어선', genre: 'SF', style: '디펜스형', icon: '🛰️', ref: 'The Tower · Sir, We Have an Orc Problem',
    blurb: '궤도 기지의 코어를 노리는 기계 군단. 포대를 짓고 강화해 끝없는 웨이브를 막아라.' },
  { id: 'cthulhu', name: '금단의 복권', genre: '크툴루', style: '운·가차형', icon: '🐙', ref: 'Scritchy Scratchy · Luck be a Landlord',
    blurb: '긁을 때마다 무언가가 속삭인다. 이성이 낮을수록 당첨금은 커지지만, 바닥나면 광기가 덮친다.' },
];
G.D.WORLD = Object.fromEntries(G.D.WORLDS.map(w => [w.id, w]));
// 세계 해금 비용(정수): 이미 해금한 세계 수에 따라 오른다. 순서는 플레이어가 고른다.
G.D.UNLOCK_COST = [15, 120, 800, 4000];

// ───────── 판타지: 끝없는 던전 ─────────
G.D.F = {
  bands: [
    { to: 5, mons: [{ n: '시궁쥐', e: '🐀', t: 'm_rat', drop: 'meat' }, { n: '산성 점액', e: '🟢', t: 'm_slime', drop: 'jelly' }] },
    { to: 15, mons: [{ n: '고블린', e: '👺', t: 'm_goblin', drop: 'meat' }, { n: '걷는 버섯', e: '🍄', t: 'm_shroom', drop: 'herb' }, { n: '흡혈박쥐', e: '🦇', t: 'm_bat', drop: 'meat' }] },
    { to: 30, mons: [{ n: '해골 전사', e: '💀', t: 'm_skeleton', drop: 'bone' }, { n: '와르그', e: '🐺', t: 'm_warg', drop: 'meat' }, { n: '맨드레이크', e: '🌱', t: 'm_mandrake', drop: 'herb' }] },
    { to: 50, mons: [{ n: '동굴 트롤', e: '🧌', t: 'm_troll', drop: 'meat' }, { n: '원혼', e: '👻', t: 'm_phantom', drop: 'jelly' }, { n: '구울', e: '🧟', t: 'm_ghoul', drop: 'bone' }] },
    { to: 80, mons: [{ n: '오우거', e: '👹', t: 'm_ogre', drop: 'meat' }, { n: '늑대거미', e: '🕷️', t: 'm_spider', drop: 'jelly' }, { n: '리치', e: '🧙', t: 'm_lich', drop: 'bone' }] },
    { to: 1e9, mons: [{ n: '발로그', e: '😈', t: 'm_demon', drop: 'meat' }, { n: '강철 골렘', e: '🗿', t: 'm_golem', drop: 'bone' }, { n: '살아있는 주문', e: '🌀', t: 'm_spell', drop: 'herb' }] },
  ],
  bosses: [
    { n: '왕실 젤리', e: '👑', t: 'b_slimeking' }, { n: '고블린 족장 이지브', e: '👺', t: 'b_goblinchief' }, { n: '거대 박쥐', e: '🦇', t: 'b_bat' },
    { n: '고대 용사의 해골', e: '☠️', t: 'b_skeleton' }, { n: '지옥견', e: '🐺', t: 'b_wolf' }, { n: '강철 트롤', e: '🧌', t: 'b_troll' },
    { n: '거미 여왕', e: '🕷️', t: 'b_spider' }, { n: '쌍두 오우거', e: '👹', t: 'b_ogre' }, { n: '고대 리치', e: '🧟', t: 'b_lich' }, { n: '황금 고룡', e: '🐉', t: 'b_dragon' },
  ],
  ingredients: {
    meat: { n: '고기', e: '🍖' }, herb: { n: '약초', e: '🌿' }, jelly: { n: '젤리', e: '🫧' },
    bone: { n: '뼈', e: '🦴' }, scale: { n: '용비늘', e: '🐲' },
  },
  // 동료: 영웅 기본 공격력 대비 배율, 사거리(칸), 공격 간격(초)
  allies: {
    archer: { n: '엘프 궁수', t: 'u_archer', atk: 0.6, hp: 0.5, range: 5, cd: 1.0, proj: 'fx_arrow' },
    cleric: { n: '수도사', t: 'u_cleric', atk: 0.2, hp: 0.6, range: 4, cd: 2.0, heal: 0.08, proj: 'fx_holy' },
    mage: { n: '화염 마법사', t: 'u_mage', atk: 1.4, hp: 0.5, range: 5, cd: 1.8, splash: 1.4, proj: 'fx_flame' },
    paladin: { n: '성기사', t: 'u_paladin', atk: 0.8, hp: 1.6, range: 1.3, cd: 1.0 },
    dragoon: { n: '용기병', t: 'u_dragoon', atk: 3, hp: 1.2, range: 1.5, cd: 1.4 },
    archmage: { n: '대현자', t: 'u_archmage', atk: 2.5, hp: 0.7, range: 6, cd: 1.6, chain: 4, proj: 'fx_zap' },
  },
  recipes: [
    { id: 'steak', n: '기사의 스테이크', e: '🥩', need: { meat: 3 }, buff: 'atk', dur: 15, d: '모든 피해 ×1.5' },
    { id: 'stew', n: '약초 스튜', e: '🍲', need: { herb: 2, meat: 1 }, buff: 'regen', dur: 15, d: '초당 체력 4% 회복' },
    { id: 'pudding', n: '젤리 푸딩', e: '🍮', need: { jelly: 3 }, buff: 'gold', dur: 20, d: '골드 ×2' },
        { id: 'dragon', n: '용 꼬리 구이', e: '🍗', need: { scale: 1, meat: 3 }, buff: 'fury', dur: 12, d: '모든 피해 ×3' },
  ],
};

// ───────── 무협: 화산귀환록 (회귀 루프, 마을 지도) ─────────
// 지형: M 바위 : 산길 . 풀 , 꽃 = 흙길 T 나무 P 매화 ~ 강 f 폭포 # 벽 _ 실내 D 문 W 대리석 벽 m 대리석
// 장소(걸을 수 있다): i 객잔 e 표국 b 현상금 길목 d 연무장 h 장로전 a 무림맹 p 정상 w 폭포 수련터 g 약초방 c 동굴 t 대숲 S 산적 출몰
G.D.WX = {
  map: [
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
    'MM:::::MMMMMMMMMMWWWWWWWWWWWMMMMMMMM',
    'MM::p::MMMMMMMMMMWmmmmmmmmmWMMfffffM',
    'MM:::::::MMMMMMMMWmmmmhmmmmWMMfffffM',
    'MMMM:MM:::::MMMMMWmmmmmmmmmWM::w:::M',
    'M.TT:.MMMM:::P:::mmmmmmmmmmm:::::::M',
    'M.T.:..PMMM::::::WmmmmdmmmmW:P::T.MM',
    'M...:.....MMM:P::WmmmmmmmmmW::...T.M',
    'MT..:..T.....::::WWWWWmWWWWW.......M',
    'M...:====.........TT..=......T.....M',
    'M.T.....=.T.TT..t.....=.......T....M',
    'M~~~~~~~=~~~~~~~~~~~~~=~~~~~~~=~~~~M',
    'M~~~~~~~=~~~~~~~~~~~~~=~~~~~~~=~~~~M',
    'M..T....=....T...T....=....T..=..T.M',
    'M.#####.=..TT..T..T...=...#######..M',
    'M.#___#=S==========b==S===D_____#..M',
    'M.#_i_D=.....T.......T=...#__a__#..M',
    'M.##D##=.#####...TT....=..#_____#..M',
    'M...=.=..#_g_#..T..c...=..###D###..M',
    'M.###D#..##D##.......TT=.....=.....M',
    'M.#_e_#..=====.=========.....=,,...M',
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  ],
  pass: ':.,=_Dmiebdhapwgct S',
  tiles: {
    'M': ['v_rock'], ':': ['v_path'], '.': ['v_grass'], ',': ['v_flowers'], '=': ['v_road'], 'T': ['v_grass', 'v_tree'],
    'P': ['v_grass', 'v_plum'], '~': ['v_water'], 'f': ['v_falls'], '#': ['v_wall'], '_': ['v_inner'], 'D': ['v_inner', 'v_door'],
    'W': ['v_mwall'], 'm': ['v_marble'], 'i': ['v_inner', 'x_table'], 'e': ['v_inner', 'x_cart'], 'b': ['v_road', 'w_board'],
    'd': ['v_marble', 'w_dummy'], 'h': ['v_marble', 'x_statue'], 'a': ['v_inner', 'x_altar'], 'p': ['v_path', 'x_lantern'],
    'w': ['v_path'], 'g': ['v_inner', 'q_herb'], 'c': ['v_grass', 'w_cave'], 't': ['v_grass'], 'S': ['v_road'],
  },
  places: {
    i: '객잔', e: '표국', b: '현상금 길목', d: '화산 연무장', h: '장로전', a: '무림맹', p: '화산 정상',
    w: '폭포 수련터', g: '약초방', c: '마교 동굴', t: '대나무 숲',
  },
  jobs: [
    { id: 'jumso', n: '객잔 점소이', at: 'i', inc: 1 },
    { id: 'pyosa', n: '표국 표사', at: 'e', inc: 6, req: { jumso: 10 } },
    { id: 'nangin', n: '낭인 검객', at: 'b', inc: 30, req: { pyosa: 10, geom: 10 } },
    { id: 'jeja', n: '화산파 제자', at: 'd', inc: 150, req: { nangin: 10, naegong: 15 } },
    { id: 'daejeja', n: '화산 대제자', at: 'd', inc: 800, req: { jeja: 10, geom: 30 } },
    { id: 'jangro', n: '화산 장로', at: 'h', inc: 5000, req: { daejeja: 10, naegong: 40 } },
    { id: 'jangmun', n: '화산 장문인', at: 'h', inc: 35000, req: { jangro: 10, gyeong: 40 } },
    { id: 'maengju', n: '무림맹주', at: 'a', inc: 3e5, req: { jangmun: 10, naegong: 80 } },
    { id: 'cheonha', n: '천하제일인', at: 'p', inc: 4e6, req: { maengju: 10, geom: 120 } },
    { id: 'geomseon', n: '매화검선', at: 'p', inc: 6e7, req: { cheonha: 10, naegong: 200 } },
  ],
  skills: [
    { id: 'naegong', n: '자하신공', at: 'g', d: '모든 숙련 +1%' },
    { id: 'geom', n: '이십사수매화검법', at: 't', d: '은자 +1%, 전투력 +' },
    { id: 'gyeong', n: '암향표', at: 'w', d: '직업 숙련 +1%' },
    { id: 'tuna', n: '토납법', at: 'p', d: '무공 숙련 +1%' },
    { id: 'yangsaeng', n: '양생술', at: 'g', d: '천수 +0.25년', unlock: 'unlock_yang', req: { naegong: 20 } },
    { id: 'magong', n: '천마혈공', at: 'c', d: '모든 숙련 +3%, 천수 -0.1년', unlock: 'unlock_magong', req: { naegong: 60 } },
  ],
  items: [
    { id: 'room', n: '객잔 독방', cost: 40, d: '무공 숙련 ×1.5' },
    { id: 'sword', n: '청강검', cost: 600, d: '은자 ×1.5' },
    { id: 'manual', n: '낡은 비급', cost: 8000, d: '모든 숙련 ×2' },
    { id: 'pill', n: '소환단', cost: 1.2e5, d: '천수 +8년' },
    { id: 'manor', n: '장원', cost: 2e6, d: '모든 숙련 ×2' },
    { id: 'daehwan', n: '대환단', cost: 5e7, d: '천수 +15년, 모든 숙련 ×1.5' },
  ],
  // 직업 단계별 옷차림 (인형 겹치기)
  outfits: [
    ['wb_human', 'wl_pants', 'wc_shirt', 'wh_topknot'],
    ['wb_human', 'wl_pants', 'wc_leather', 'wa_straw', 'ww_club'],
    ['wb_human', 'wl_black', 'wc_china', 'wh_queue', 'ww_sword'],
    ['wb_human', 'wl_white', 'wc_karate', 'wh_topknot', 'ww_sword'],
    ['wb_human', 'wl_white', 'wc_monk', 'wh_topknot', 'ww_sword2'],
    ['wb_human', 'wl_white', 'wc_robe', 'wh_white', 'ww_staff'],
    ['wb_human', 'wl_red', 'wc_china2', 'wh_queue', 'wa_band', 'ww_sword2'],
    ['wb_human', 'wl_red', 'wc_gold', 'wh_queue', 'wa_crown', 'ww_sword2'],
    ['wb_human', 'wl_red', 'wc_gold', 'wh_white', 'wa_crown', 'ww_sword2'],
    ['wb_human', 'wl_white', 'wc_white', 'wh_white', 'wa_halo', 'ww_sword2'],
  ],
};

// ───────── 수선: 구천등선 (선문 산) ─────────
// 지형: M 바위 . 풀 d 숲 T 소나무 t 숲속 소나무 : 돌길 c 동굴 ~ 연못 l 연꽃 W 전각 벽 m 전각 바닥 h 영초밭
// 장소: V 영맥(좌선) F 단로 G 산문 p 정상(천겁) B 요수 출몰 Q 제자 숙소
G.D.X = {
  map: [
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
    'MMMMMMMMMMMMMM::::::MMMMMMMMMMMMMMMM',
    'MMMMMMMMMMMMM:::p::::MMMMMddddddddMM',
    'MMcccccMMMMMM::::::::MMMddtdBddtdddM',
    'MMcccccMMMMMMMM::::MMMMdddddddddtddM',
    'MMccVcccccc::::::::::::ddtdddBddddMM',
    'MMcccccMMM.T...:..T...ddddddtdddBddM',
    'MMMMMMMMMM.....:.....dddBdddddtddddM',
    'M.T.......WWWWWmWWWW..ddddtdddddddtM',
    'M...hhh...WmmmmmmmmW...ddddddBddddMM',
    'M...hhh...WmmmQmmmmW....dddtddddddMM',
    'M...hhh...mmmmmmmmmm.............T.M',
    'M..T......WmmFmmmmmW..~~~~~~~...T..M',
    'M.........WWWWmWWWWW..~~lll~~......M',
    'M.T..T.........:......~~~~~~~..T...M',
    'M......T.......:.................T.M',
    'MMMMMMMM.......:.......T.......MMMMM',
    'MMMMMMMMMMM....G....MMMMMMMMMMMMMMMM',
  ],
  pass: '.d:cmhVFGpBQ',
  tiles: {
    'M': ['q_rock'], '.': ['v_grass'], 'd': ['q_dark'], 'T': ['v_grass', 'q_tree'], 't': ['q_dark', 'q_tree'], ':': ['v_path'],
    'c': ['q_cave'], '~': ['v_water'], 'l': ['v_water', 'q_lotus'], 'W': ['v_mwall'], 'm': ['v_marble'], 'h': ['q_herbplot'],
    'V': ['q_cave', 'q_vein'], 'F': ['v_marble', 'q_furnace'], 'G': ['v_path', 'q_gate'], 'p': ['v_path', 'q_peak'],
    'B': ['q_dark'], 'Q': ['v_marble'],
  },
  realms: ['연기', '축기', '결단', '원영', '화신', '연허', '합체', '대승', '도겁', '진선'],
  sects: ['청운문', '천음사', '만검종', '태현종', '소요곡', '합환파', '귀왕종', '현천궁', '천검산', '봉래각',
    '영허전', '자소궁', '태을문', '혈신교', '마라종', '북명해', '곤륜선궁', '서천불국', '유리궁', '천기각'],
  sur: ['한', '육', '소', '엽', '진', '임', '백', '능', '고', '단목', '상관', '남궁', '공손', '구양', '동방', '서문', '화', '설', '운', '초'],
  giv: ['립', '무쌍', '염', '범', '청', '소요', '천', '월화', '진', '현', '운', '령', '하', '선', '명', '현천', '무기', '청선', '혼', '장생', '유', '자'],
  titles: [[20, '외문 제자'], [40, '내문 제자'], [60, '진전 제자'], [80, '성자'], [100, '장로'], [120, '태상장로'],
    [140, '노괴'], [160, '선존'], [1e9, '선제']],
  beasts: ['적염랑', '뇌수', '견귀', '수정 고슴도치', '천마', '빙백수'],
};

// ───────── SF: 최후의 방어선 (경로형 타워디펜스) ─────────
// 지형: # 벽 . 바닥 = 적 이동 경로 S 출현 지점 C 코어 O 포대 자리
G.D.S = {
  map: [
    '####################################',
    '#..................................#',
    '#S==========....O.......O..........#',
    '#..........=.......................#',
    '#..O.......=.....============......#',
    '#..........=..O..=..........=..O...#',
    '#......O...=.....=...O......=......#',
    '#..........=.....=..........=......#',
    '#..........=======....O.....=......#',
    '#..O........................=...O..#',
    '#.......O.............O.....=......#',
    '#..........==================......#',
    '#..........=.......O...............#',
    '#....O.....=..........O............#',
    '#..........=.......................#',
    '#..........======================C.#',
    '#.....O..............O.......O.....#',
    '#..................................#',
    '####################################',
  ],
  pass: '.=SCO',
  tiles: { '#': ['s_wall'], '.': ['s_ground'], '=': ['s_path'], 'S': ['s_path', 's_portal'], 'C': ['s_path'], 'O': ['s_ground', 's_pad'] },
  turrets: {
    laser: { n: '펄스 레이저', t: 't_laser', dmg: 3, rate: 2.2, range: 3.2, cost: 15, col: '#46f0ff', d: '빠른 단일 사격' },
    rail: { n: '레일건', t: 't_rail', dmg: 24, rate: 0.45, range: 6, pierce: 4, cost: 120, col: '#ffe066', d: '일직선 관통', unlock: 't_rail' },
    cryo: { n: '냉각 투사기', t: 't_cryo', dmg: 1.5, rate: 1, range: 2.6, slow: 0.45, cost: 200, col: '#9ad8ff', d: '범위 감속', unlock: 't_cryo' },
    mortar: { n: '플라즈마 박격포', t: 't_mortar', dmg: 10, rate: 0.6, range: 5, splash: 1.3, cost: 350, col: '#ff7ad9', d: '착탄 범위 피해', unlock: 't_mortar' },
    tesla: { n: '테슬라 코일', t: 't_tesla', dmg: 16, rate: 1.1, range: 2.8, chain: 5, cost: 2500, col: '#c7a6ff', d: '연쇄 방전', unlock: 't_tesla' },
  },
  enemies: {
    drone: { n: '정찰 드론', hp: 1, spd: 2.2, bounty: 1, dmg: 6, s: 0.8 },
    walker: { n: '강습 보행기', hp: 3.5, spd: 1.3, bounty: 2.5, dmg: 15, s: 1 },
    swarm: { n: '나노 군체', hp: 0.35, spd: 1.9, bounty: 0.4, dmg: 3, s: 0.55 },
    shield: { n: '방패 전차', hp: 8, spd: 0.9, bounty: 5, dmg: 25, s: 1.1 },
    boss: { n: '침공 모선', hp: 45, spd: 0.6, bounty: 40, dmg: 60, s: 1.8 },
  },
};

// ───────── 크툴루: 금단의 복권 ─────────
G.D.C = {
  // 거리 지도. M 외벽 # 집 벽 _ 집 안 H 집 문(광신도 숙소) . 길 , 공원 T 고목 L 가로등 o 맨홀(촉수) K 복권방 A 제단
  map: [
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
    'M#####.#####.#####.,,,,,,.#####.###M',
    'M#___#.#___#.#___#.,T,,T,.#___#.#_#M',
    'M##H##.##H##.##H##.,,,A,,.##H##.#H#M',
    'M.....L..o.L.......,,,,,,.....L....M',
    'M..................,T,,,T,.........M',
    'M.......K..........,,,,,,,....o....M',
    'M..L.......o...L..........L........M',
    'M#####.#####......o.....#####.#####M',
    'M#___#.#___#.,,,,.......#___#.#___#M',
    'M##H##.##H##.,T,,...L...##H##.##H##M',
    'M..........,,,,,...........o.......M',
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  ],
  pass: '._,HoKA',
  tiles: {
    'M': ['c_house'], '#': ['c_house'], '_': ['c_hfloor'], 'H': ['c_street', 'c_hdoor'], '.': ['c_street'], ',': ['c_park'],
    'T': ['c_park', 'c_deadtree'], 'L': ['c_street', 'c_lamp'], 'o': ['c_street', 'c_manhole'], 'K': ['c_street', 'c_kiosk'], 'A': ['c_park', 'c_altar'],
  },
  tickets: [
    { n: '속삭이는 쪽지', price: 5, unlock: 0, ess: 0.1, col: '#5d6b4c', syms: ['💀', '📜', '🦴', '🕷️', '👁️', '🗿'] },
    { n: '심연 복권', price: 60, unlock: 400, ess: 0.3, col: '#2e5a62', syms: ['🐚', '🦑', '⚓', '🌊', '🐟', '🔱'] },
    { n: '검은 파라오의 표', price: 2000, unlock: 1.5e4, ess: 0.8, col: '#6b5222', syms: ['🐈‍⬛', '🏺', '🦂', '🪲', '🐍', '🔺'] },
    { n: '르뤼에 대복권', price: 8e4, unlock: 6e5, ess: 1.2, col: '#244a3a', syms: ['🌀', '🗝️', '🏛️', '🌒', '🦠', '🪸'] },
    { n: '아자토스의 꿈', price: 4e6, unlock: 3e7, ess: 2, col: '#4a2a66', syms: ['🎺', '🥁', '✨', '🌌', '🪐', '♾️'] },
    { n: '별들의 정렬', price: 2.5e8, unlock: 2e9, ess: 3.5, col: '#661f2c', syms: ['⭐', '☄️', '🌠', '🔮', '👑', '☀️'] },
  ],
  // 상금 배수(복권 값 대비)와 기본 확률. 각 단계는 그 복권의 기호 하나에 대응한다.
  prizes: [
    { m: 1, p: 0.22 }, { m: 3, p: 0.12 }, { m: 8, p: 0.05 },
    { m: 25, p: 0.015 }, { m: 100, p: 0.004 }, { m: 1000, p: 0.0004 },
  ],
  specials: {
    tentacle: { e: '🐙', d: '이성 -8' },
    sign: { e: '✴️', d: '고대 인장 획득' },
    candle: { e: '🕯️', d: '이성 +12' },
  },
};

// ───────── 유물 (가차) ─────────
// eff 키: f_atk f_gold f_hp w_xp w_gold x_qi x_power x_stone s_dmg s_credit s_core c_prize c_san ess all
G.D.RARITY = {
  common: { n: '일반', p: 0.6, col: '#9aa4ad' },
  rare: { n: '희귀', p: 0.28, col: '#4fa3ff' },
  epic: { n: '영웅', p: 0.1, col: '#c06bff' },
  legend: { n: '전설', p: 0.02, col: '#ffb547' },
};
G.D.RELICS = [
  { id: 'dagger', n: '녹슨 단검', e: '🗡️', r: 'common', w: 'fantasy', eff: 'f_atk', v: 0.1, d: '던전 피해' },
  { id: 'herb', n: '마른 약초', e: '🌿', r: 'common', w: 'fantasy', eff: 'f_hp', v: 0.15, d: '던전 최대 체력' },
  { id: 'beads', n: '낡은 염주', e: '📿', r: 'common', w: 'wuxia', eff: 'w_xp', v: 0.1, d: '무협 숙련' },
  { id: 'pouch', n: '은자 주머니', e: '👝', r: 'common', w: 'wuxia', eff: 'w_gold', v: 0.15, d: '무협 은자' },
  { id: 'talisman', n: '누런 부적', e: '📃', r: 'common', w: 'xianxia', eff: 'x_qi', v: 0.1, d: '영기 수련' },
  { id: 'spirit', n: '하품 영석', e: '💎', r: 'common', w: 'xianxia', eff: 'x_stone', v: 0.12, d: '영석 수입' },
  { id: 'chip', n: '고장 난 칩', e: '💾', r: 'common', w: 'scifi', eff: 's_dmg', v: 0.1, d: '포탑 피해' },
  { id: 'plating', n: '장갑판 조각', e: '🔩', r: 'common', w: 'scifi', eff: 's_core', v: 0.15, d: '코어 내구도' },
  { id: 'coin', n: '녹색 동전', e: '🪙', r: 'common', w: 'cthulhu', eff: 'c_prize', v: 0.08, d: '복권 당첨금' },
  { id: 'string', n: '엘프의 활시위', e: '🎯', r: 'rare', w: 'fantasy', eff: 'f_gold', v: 0.2, d: '던전 골드' },
  { id: 'plum', n: '매화 검수', e: '🌸', r: 'rare', w: 'wuxia', eff: 'w_xp', v: 0.25, d: '무협 숙련' },
  { id: 'jade', n: '태극 옥패', e: '🟢', r: 'rare', w: 'xianxia', eff: 'x_power', v: 0.2, d: '도력' },
  { id: 'battery', n: '양자 축전지', e: '🔋', r: 'rare', w: 'scifi', eff: 's_credit', v: 0.2, d: '크레딧 수입' },
  { id: 'seal', n: '미지의 인장', e: '🔯', r: 'rare', w: 'cthulhu', eff: 'c_san', v: 0.25, d: '이성 회복' },
  { id: 'heart', n: '용의 심장', e: '❤️‍🔥', r: 'epic', w: 'fantasy', eff: 'f_atk', v: 0.4, d: '던전 피해' },
  { id: 'cheonma', n: '천마의 비급', e: '📕', r: 'epic', w: 'wuxia', eff: 'w_xp', v: 0.5, d: '무협 숙련' },
  { id: 'gourd', n: '자금 호로', e: '🏺', r: 'epic', w: 'xianxia', eff: 'x_qi', v: 0.4, d: '영기 수련' },
  { id: 'antimatter', n: '반물질 코어', e: '⚛️', r: 'epic', w: 'scifi', eff: 's_dmg', v: 0.4, d: '포탑 피해' },
  { id: 'necro', n: '네크로노미콘 사본', e: '📖', r: 'epic', w: 'cthulhu', eff: 'c_prize', v: 0.3, d: '복권 당첨금' },
  { id: 'key', n: '차원의 열쇠', e: '🗝️', r: 'legend', w: 'all', eff: 'ess', v: 0.25, d: '모든 정수 획득' },
  { id: 'flute', n: '아자토스의 피리', e: '🪈', r: 'legend', w: 'all', eff: 'all', v: 0.3, d: '모든 세계 생산' },
];

G.D.SUMMON_COST = 10;
G.D.PITY = 40;
G.D.PRESTIGE_MIN = 3000;
