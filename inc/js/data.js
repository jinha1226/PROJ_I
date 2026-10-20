'use strict';
// 게임 데이터: 세계 정보, 2D 맵(ASCII), 적·직업·포탑 등. 업그레이드는 trees.js의 스킬트리에 있다.
G.D = {};

G.D.WORLDS = [
  { id: 'fantasy', name: '끝없는 던전', genre: '판타지', style: '던전 전투형', icon: '🗡️', ref: 'Chef Knight · 무한던전피버 · Clicker Heroes',
    blurb: '기사와 동료들이 끝없는 던전을 내려간다.' },
  { id: 'wuxia', name: '화산귀환록', genre: '무협', style: '회귀 루프형', icon: '🥋', ref: 'Increlution · Progress Knight',
    blurb: '천수를 다하면 열여섯 살로 회귀한다. 전생에 쌓은 무공만큼 다음 생은 빨라진다. 점소이에서 검선까지.' },
  { id: 'xianxia', name: '구천등선', genre: '수선', style: '경지 수련형', icon: '☁️', ref: 'Cultivation Idle · Xiuzhen Idle',
    blurb: '영기를 모아 천겁을 넘고 경지를 돌파한다. 실패하면 도심이 흔들린다. 천교방에 도전해 영석을 벌어라.' },
  { id: 'scifi', name: '최후의 방어선', genre: 'SF', style: '디펜스형', icon: '🛰️', ref: 'The Tower · Sir, We Have an Orc Problem',
    blurb: '궤도 기지의 코어를 노리는 기계 군단. 포대를 짓고 강화해 끝없는 웨이브를 막아라.' },
  { id: 'cthulhu', name: '인스머스의 밤', genre: '크툴루', style: '심해 낚시형', icon: '🐙', ref: 'Tiny Fishing · Dredge',
    blurb: '깊이 내릴수록 값진 것이 걸린다. 그리고 그것들도 당신을 본다.' },
];
G.D.WORLD = Object.fromEntries(G.D.WORLDS.map(w => [w.id, w]));
// 세계 해금 비용(정수): 이미 해금한 세계 수에 따라 오른다. 순서는 플레이어가 고른다.
G.D.UNLOCK_COST = [15, 120, 800, 4000];

// ───────── 판타지: 끝없는 던전 ─────────
G.D.F = {
  // 몬스터 그림은 0x72 DungeonTileset II (tools/art72.js에서 키 → 원본)
  bands: [
    { to: 5, mons: [{ n: '꼬마 좀비', t: 'm_rat' }, { n: '늪 점액', t: 'm_slime' }, { n: '작은 버섯', t: 'm_mush' }, { n: '숲 늑대', t: 'm_wolf' }] },
    { to: 15, mons: [{ n: '고블린', t: 'm_goblin', wpn: 'w_knife' }, { n: '임프', t: 'm_shroom' }, { n: '해골', t: 'm_bat', wpn: 'w_rusty' }, { n: '산적', t: 'm_bandit' }] },
    { to: 30, mons: [{ n: '오크 전사', t: 'm_skeleton', wpn: 'w_axe' }, { n: '가면 오크', t: 'm_warg', wpn: 'w_waraxe' }, { n: '오크 주술사', t: 'm_mandrake', wpn: 'w_gstaff' }, { n: '놀 정찰병', t: 'm_gnoll' }] },
    { to: 50, mons: [{ n: '얼음 좀비', t: 'm_troll' }, { n: '진흙 점액', t: 'm_phantom' }, { n: '좀비', t: 'm_ghoul', wpn: 'w_cleaver' }, { n: '놀 전사', t: 'm_gnollb' }, { n: '버섯 거인', t: 'm_lmush' }] },
    { to: 80, mons: [{ n: '워골', t: 'm_ogre', wpn: 'w_mace' }, { n: '초트', t: 'm_spider' }, { n: '강령술사', t: 'm_lich' }, { n: '놀 주술사', t: 'm_gshaman' }, { n: '트롤', t: 'm_troll2' }, { n: '동굴 곰', t: 'm_bear' }] },
    { to: 1e9, mons: [{ n: '대악마', t: 'm_demon' }, { n: '오우거', t: 'm_golem' }, { n: '호박 망령', t: 'm_spell' }, { n: '고목 엔트', t: 'm_ent' }, { n: '돌 골렘', t: 'm_golem2' }] },
  ],
  // 보스: 큰 그림(32px)은 s를 작게 — 그림 자체가 이미 두 칸이다
  bosses: [
    { n: '늪의 군주', e: '👑', t: 'b_slimeking', s: 2 }, { n: '놀 감독관', e: '👺', t: 'b_goblinchief' }, { n: '해골 기사', e: '💀', t: 'b_bat' },
    { n: '거대 좀비', e: '🧟', t: 'b_skeleton', s: 1.1 }, { n: '숲의 수호자', e: '🛡️', t: 'b_wolf' }, { n: '오우거 대장', e: '🗿', t: 'b_troll', s: 1.1 },
    { n: '심연의 초트', e: '👿', t: 'b_spider' }, { n: '역병 거인', e: '🧟', t: 'b_ogre', s: 1.1 }, { n: '강령술사 군주', e: '🧙', t: 'b_lich' }, { n: '황금 대악마', e: '😈', t: 'b_dragon', s: 1.1 },
  ],
  // 동료: 영웅 기본 공격력 대비 배율, 사거리(칸), 공격 간격(초)
  allies: {
    archer: { n: '레인저', t: 'u_archer', wpn: 'w_bow', atk: 0.6, hp: 0.5, range: 5, cd: 1.0, proj: 'fx_arrow' },
    cleric: { n: '수도사', t: 'u_cleric', wpn: 'w_holymace', atk: 0.2, hp: 0.6, range: 4, cd: 2.0, heal: 0.08, proj: 'fx_holy' },
    bard: { n: '음유시인', t: 'u_bard', atk: 0.3, hp: 0.6, range: 4, cd: 1.5, proj: 'fx_ice', song: true },
    mage: { n: '화염 마법사', t: 'u_mage', wpn: 'w_staff', atk: 1.4, hp: 0.5, range: 5, cd: 1.8, splash: 1.4, proj: 'fx_flame' },
    paladin: { n: '성기사', t: 'u_paladin', wpn: 'w_hammer', atk: 0.8, hp: 1.6, range: 1.3, cd: 1.0 },
    dragoon: { n: '용기병', t: 'u_dragoon', wpn: 'w_spear', atk: 3, hp: 1.2, range: 1.5, cd: 1.4 },
    archmage: { n: '대현자', t: 'u_archmage', wpn: 'w_arcstaff', atk: 2.5, hp: 0.7, range: 6, cd: 1.6, chain: 4, proj: 'fx_zap' },
  },
  // 버프: 음유시인의 노래, 성직자의 축복, 기술 「전투 함성」. dmg는 모든 피해 배율.
  buffs: {
    atk: { n: '용맹의 노래', t: 'b_atk', dmg: 1.5, col: '#ffb36b', d: '피해 ×1.5' },
    gold: { n: '행운의 노래', t: 'b_gold', col: '#ffd24a', d: '골드 ×2' },
    fury: { n: '전쟁의 북', t: 'b_fury', dmg: 3, col: '#ff5a3a', d: '피해 ×3' },
    regen: { n: '축복', t: 'b_regen', col: '#9fe79f', d: '초당 체력 +4%' },
    rage: { n: '전투 함성', t: 'r_dragon', dmg: 2, col: '#ff7a5a', d: '피해 ×2' },
    haste: { n: '시간 왜곡', t: 'st_haste', col: '#c9a6ff', d: '공격 속도 ×1.5' },
    assault: { n: '총공세', t: 'u_god', col: '#ffd24a', d: '열어 둔 동료 전원 출전' },
  },
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

// ───────── 수선: 구천등선 (동부 진법) ─────────
// 지형: M 바위 c 동굴 바닥 o 진법 칸 v 영맥 위 진법 칸(효과 ×2) V 좌선대 h 영초밭 F 단로 Q 제자 숙소 G 동부 입구(요수가 들어온다)
G.D.X = {
  map: [
    'MMMMMMMMMMMMMMMMMMMMMMMMMMM',
    'MMMMMMMMcccccccccccMMMMMMMM',
    'MMMMMcccccccccccccccccMMMMM',
    'MMMMQccoooooovoooooocccMMMM',
    'MMMccccoovooooooovooccccMMM',
    'MMchhccooooooooooooocccccMM',
    'MMchhccvoooooVooooovcccFcMM',
    'MMchhccooooooooooooocccccMM',
    'MMMccccooovooooovoooccccMMM',
    'MMMMcccoooooovoooooocccMMMM',
    'MMMMMcccccccccccccccccMMMMM',
    'MMMMMMMMcccccccccccMMMMMMMM',
    'MMMMMMMMMMMMMcMMMMMMMMMMMMM',
    'MMMMMMMMMMMMMcMMMMMMMMMMMMM',
    'MMMMMMMMMMMMMGMMMMMMMMMMMMM',
  ],
  pass: 'covVhFQG',
  tiles: {
    'M': ['q_rock'], 'c': ['q_cavefloor'], 'o': ['q_cave'], 'v': ['q_veinfloor'], 'V': ['q_cave', 'q_vein'],
    'h': ['q_cavefloor', 'q_herbplot'], 'F': ['q_cavefloor', 'q_furnace'], 'Q': ['q_cavefloor'], 'G': ['q_cavefloor', 'q_gate'],
  },
  // 오행: 상생 순서(목→화→토→금→수→목). 상극: 목→토, 토→수, 수→화, 화→금, 금→목
  els: ['wood', 'fire', 'earth', 'metal', 'water'],
  el: {
    wood: { n: '목', t: 'e_wood', col: '#6fe39a', d: '영초 성장' },
    fire: { n: '화', t: 'e_fire', col: '#ff6a4a', d: '연단 속도' },
    earth: { n: '토', t: 'e_earth', col: '#f2c84b', d: '요수 방어 · 천겁' },
    metal: { n: '금', t: 'e_metal', col: '#e8eef5', d: '영석' },
    water: { n: '수', t: 'e_water', col: '#4fb4ff', d: '영기' },
  },
  realms: ['연기', '축기', '결단', '원영', '화신', '연허', '합체', '대승', '도겁', '진선'],
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

// ───────── 크툴루: 인스머스 심해 낚시 (Tiny Fishing · Dredge 계열) ─────────
// 바다 단면 맵. 한 칸 = 5m. 바늘이 내려갈 때 물고기에 닿으면 거기서 감기 시작하고, 올라올 때 닿는 물고기는 걸린다.
// 깊을수록 값비싼 기괴한 것들이 나오고 이성이 깎인다. 해구부터 촉수가 줄을 끊는다.
G.D.C = {
  M_PER_TILE: 5,
  zones: [
    { to: 12, n: '얕은 바다', t: 'sea_w0' },
    { to: 40, n: '깊은 바다', t: 'sea_w1' },
    { to: 90, n: '해구', t: 'sea_w2' },
    { to: 1e9, n: '심연', t: 'sea_w3' },
  ],
  // z: 나오는 구역, v: 기본 값, w: 빈도, spd: 헤엄 속도(칸/초), tint: 같은 그림을 다른 색으로
  fish: [
    { id: 'cod', n: '대구', t: 'fs_cod', z: 0, v: 1, w: 5, spd: 1.2 },
    { id: 'mackerel', n: '고등어', t: 'fs_cod', tint: '#3b8cff', z: 0, v: 1.5, w: 4, spd: 2 },
    { id: 'crab', n: '유령게', t: 'fs_crab', z: 0, v: 2, w: 2, spd: 0.6 },
    { id: 'jelly', n: '해파리', t: 'fs_jelly', z: 0, v: 2.5, w: 1.5, spd: 0.5 },
    { id: 'eel', n: '전기뱀장어', t: 'fs_eel', z: 1, v: 4, w: 3, spd: 1.8 },
    { id: 'octo', n: '문어', t: 'fs_octo', z: 1, v: 5, w: 2, spd: 0.8 },
    { id: 'blind', n: '눈먼 물고기', t: 'fs_blind', z: 1, v: 6, w: 3, spd: 1 },
    { id: 'ghost', n: '유령 물고기', t: 'fs_ghost', z: 1, v: 8, w: 1.5, spd: 1.4 },
    { id: 'deepone', n: '심해인', t: 'fs_deepone', z: 2, v: 15, w: 3, spd: 1.3 },
    { id: 'bone', n: '뼈물고기', t: 'fs_bone', z: 2, v: 12, w: 3, spd: 1.1 },
    { id: 'siren', n: '세이렌', t: 'fs_siren', z: 2, v: 20, w: 1.5, spd: 1.2 },
    { id: 'slime', n: '심해 점액', t: 'fs_slime', z: 2, v: 18, w: 2, spd: 0.4 },
    { id: 'kraken', n: '크라켄', t: 'fs_kraken', z: 2, v: 60, w: 0.3, spd: 0.7, s: 1.5 },
    { id: 'star', n: '별의 자식', t: 'fs_star', z: 3, v: 80, w: 3, spd: 1 },
    { id: 'mass', n: '저주받은 덩어리', t: 'fs_mass', z: 3, v: 100, w: 2, spd: 0.5 },
    { id: 'thrash', n: '몸부림치는 공포', t: 'fs_thrash', z: 3, v: 120, w: 2, spd: 1.6 },
    { id: 'acrab', n: '종말의 게', t: 'fs_acrab', z: 3, v: 150, w: 1, spd: 0.7 },
    { id: 'eye', n: '촉수 괴물', t: 'fs_eye', z: 3, v: 300, w: 0.4, spd: 0.6, s: 1.3 },
    { id: 'dagon', n: '다곤의 그림자', t: 'fs_dagon', z: 3, v: 1000, w: 0.1, spd: 0.4, s: 1.8 },
    // 고대 인장: 얕은 바다 밖 어디서나 드물게. 잡으면 인장 +1
    { id: 'sign', n: '고대 인장', t: 'ui_sign', z: 1, zMax: 3, v: 0, w: 0.25, spd: 0.3, sign: true },
  ],
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
  { id: 'coin', n: '녹색 동전', e: '🪙', r: 'common', w: 'cthulhu', eff: 'c_prize', v: 0.08, d: '어획 가치' },
  { id: 'string', n: '엘프의 활시위', e: '🎯', r: 'rare', w: 'fantasy', eff: 'f_gold', v: 0.2, d: '던전 골드' },
  { id: 'plum', n: '매화 검수', e: '🌸', r: 'rare', w: 'wuxia', eff: 'w_xp', v: 0.25, d: '무협 숙련' },
  { id: 'jade', n: '태극 옥패', e: '🟢', r: 'rare', w: 'xianxia', eff: 'x_power', v: 0.2, d: '도력' },
  { id: 'battery', n: '양자 축전지', e: '🔋', r: 'rare', w: 'scifi', eff: 's_credit', v: 0.2, d: '크레딧 수입' },
  { id: 'seal', n: '미지의 인장', e: '🔯', r: 'rare', w: 'cthulhu', eff: 'c_san', v: 0.25, d: '이성 회복' },
  { id: 'heart', n: '용의 심장', e: '❤️‍🔥', r: 'epic', w: 'fantasy', eff: 'f_atk', v: 0.4, d: '던전 피해' },
  { id: 'cheonma', n: '천마의 비급', e: '📕', r: 'epic', w: 'wuxia', eff: 'w_xp', v: 0.5, d: '무협 숙련' },
  { id: 'gourd', n: '자금 호로', e: '🏺', r: 'epic', w: 'xianxia', eff: 'x_qi', v: 0.4, d: '영기 수련' },
  { id: 'antimatter', n: '반물질 코어', e: '⚛️', r: 'epic', w: 'scifi', eff: 's_dmg', v: 0.4, d: '포탑 피해' },
  { id: 'necro', n: '네크로노미콘 사본', e: '📖', r: 'epic', w: 'cthulhu', eff: 'c_prize', v: 0.3, d: '어획 가치' },
  { id: 'key', n: '차원의 열쇠', e: '🗝️', r: 'legend', w: 'all', eff: 'ess', v: 0.25, d: '모든 정수 획득' },
  { id: 'flute', n: '아자토스의 피리', e: '🪈', r: 'legend', w: 'all', eff: 'all', v: 0.3, d: '모든 세계 생산' },
];

G.D.SUMMON_COST = 10;
G.D.PITY = 40;
G.D.PRESTIGE_MIN = 3000;
