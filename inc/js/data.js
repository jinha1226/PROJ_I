'use strict';
// 게임 데이터: 세계 정보, 2D 맵(ASCII), 적·직업·포탑 등. 업그레이드는 trees.js의 스킬트리에 있다.
G.D = {};

G.D.WORLDS = [
  { id: 'fantasy', name: '끝없는 던전', genre: '판타지', style: '던전 전투형', icon: '🗡️', ref: 'Chef Knight · 무한던전피버 · Clicker Heroes',
    blurb: '단장과 용병들이 끝없는 던전을 내려간다.' },
];
G.D.WORLD = Object.fromEntries(G.D.WORLDS.map(w => [w.id, w]));

// ───────── 판타지: 끝없는 던전 ─────────
G.D.F = {
  // 몬스터 그림은 0x72 DungeonTileset II (tools/art72.js에서 키 → 원본)
  // 몬스터 (DESIGN.md 56): ty = SRD 생물 종류(언데드 퇴치 · 신성 강타 · 인간형 포박이 본다) · fx = 맞히면 30%로 거는 고유 능력 [상태이상, 내성 능력, 초]
  // 몬스터 도감. r = 역할 (G.Foe.ROLES) · tr = 특성 · mv = 이동력 덮어쓰기 · ty = SRD 종류 · fx = 고유 능력
  mon: {
    '꼬마 좀비': { t: 'm_rat', ty: 'undead', r: 'brute', tr: ['fort'], mv: 4 }, '좀비': { t: 'm_ghoul', wpn: 'w_cleaver', ty: 'undead', r: 'soldier', tr: ['fort'], mv: 4 }, '얼음 좀비': { t: 'm_troll', ty: 'undead', r: 'brute', tr: ['fort'], mv: 4 },
    '해골': { t: 'm_bat', wpn: 'w_rusty', ty: 'undead', r: 'soldier' }, '해골 궁수': { t: 'm_bat', ty: 'undead', r: 'artillery' }, '강령술사': { t: 'm_lich', ty: 'humanoid', r: 'controller' }, '호박 망령': { t: 'm_spell', ty: 'undead', r: 'controller' },
    '고블린': { t: 'm_goblin', wpn: 'w_knife', ty: 'humanoid', r: 'skirmisher', tr: ['nimble'] }, '고블린 궁수': { t: 'm_goblin', ty: 'humanoid', r: 'artillery', tr: ['nimble'] }, '고블린 주술사': { t: 'm_goblin', ty: 'humanoid', r: 'support', hand: 'p_hand1_quarterstaff' },
    '오크 전사': { t: 'm_skeleton', wpn: 'w_axe', ty: 'humanoid', r: 'soldier', tr: ['aggr'] }, '가면 오크': { t: 'm_warg', wpn: 'w_waraxe', ty: 'humanoid', r: 'brute', tr: ['aggr'] }, '오크 궁수': { t: 'm_skeleton', ty: 'humanoid', r: 'artillery' }, '오크 주술사': { t: 'm_mandrake', wpn: 'w_gstaff', ty: 'humanoid', r: 'support' },
    '히드라': { t: 'm_mandrake', ty: 'monstrosity', r: 'brute' }, '독사': { t: 'm_rat', ty: 'beast', r: 'skirmisher' }, '큰 개구리': { t: 'm_rat', ty: 'beast', r: 'skirmisher' }, '악어': { t: 'm_rat', ty: 'beast', r: 'brute' }, '왕뱀': { t: 'm_rat', ty: 'beast', r: 'soldier' }, '대왕 악어': { t: 'm_rat', ty: 'beast', r: 'brute' }, '황토 젤리': { t: 'm_slime', ty: 'ooze', r: 'brute' }, '오우거': { t: 'm_golem', ty: 'giant', r: 'brute' }, '트롤': { t: 'm_troll2', ty: 'giant', r: 'brute', tr: ['regen'] },
    '숲 늑대': { t: 'm_wolf', ty: 'beast', r: 'skirmisher', tr: ['pack'] }, '워골': { t: 'm_ogre', wpn: 'w_mace', ty: 'monstrosity', r: 'skirmisher', tr: ['pack'] }, '동굴 곰': { t: 'm_bear', ty: 'beast', r: 'brute' },
    '산적': { t: 'm_bandit', ty: 'humanoid', r: 'soldier' }, '산적 궁수': { t: 'm_bandit', ty: 'humanoid', r: 'artillery' }, '놀 전사': { t: 'm_gnollb', ty: 'humanoid', r: 'brute' }, '놀 정찰병': { t: 'm_gnoll', ty: 'humanoid', r: 'artillery' }, '놀 주술사': { t: 'm_gshaman', ty: 'humanoid', r: 'support' },
    '늪 점액': { t: 'm_slime', ty: 'ooze', r: 'brute', mv: 4 }, '진흙 점액': { t: 'm_phantom', ty: 'ooze', r: 'brute', mv: 4 }, '작은 버섯': { t: 'm_mush', ty: 'plant', r: 'controller', mv: 4 }, '버섯 거인': { t: 'm_lmush', ty: 'plant', r: 'controller', mv: 4 }, '고목 엔트': { t: 'm_ent', ty: 'plant', r: 'brute', tr: ['regen'], mv: 4 },
    '임프': { t: 'm_shroom', ty: 'fiend', r: 'skirmisher', tr: ['nimble'] }, '초트': { t: 'm_spider', ty: 'fiend', r: 'controller' }, '대악마': { t: 'm_demon', ty: 'fiend', r: 'brute' }, '돌 골렘': { t: 'm_golem2', ty: 'construct', r: 'soldier' },
  },
  // 세력: 원정 전에 알려 준다. 구간(bands)마다 함께 나오는 무리 (앞줄 · 뒷줄은 역할로 나뉜다)
  factions: {
    green: { n: '오크', by: [['고블린', '고블린 궁수'], ['고블린', '고블린 궁수', '고블린 주술사'], ['오크 전사', '가면 오크', '오크 궁수', '오크 주술사'], ['오크 전사', '가면 오크', '오크 궁수', '오크 주술사'], ['가면 오크', '트롤', '오크 궁수', '오크 주술사'], ['오우거', '트롤', '오크 궁수', '오크 주술사']] },
    beast: { n: '야수', by: [['숲 늑대'], ['숲 늑대'], ['숲 늑대', '동굴 곰'], ['숲 늑대', '동굴 곰'], ['워골', '동굴 곰'], ['워골', '동굴 곰', '오우거']] },
    undead: { n: '언데드', by: [['꼬마 좀비', '해골 궁수'], ['해골', '꼬마 좀비', '해골 궁수'], ['해골', '좀비', '해골 궁수'], ['좀비', '얼음 좀비', '강령술사'], ['좀비', '얼음 좀비', '강령술사'], ['얼음 좀비', '돌 골렘', '강령술사', '호박 망령']] },
    raider: { n: '약탈자', by: [['산적', '산적 궁수'], ['산적', '산적 궁수'], ['놀 전사', '산적', '놀 정찰병', '놀 주술사'], ['놀 전사', '놀 정찰병', '놀 주술사'], ['놀 전사', '놀 정찰병', '놀 주술사'], ['놀 전사', '오우거', '놀 정찰병', '놀 주술사']] },
    swamp: { n: '늪', by: [['늪 점액', '작은 버섯'], ['늪 점액', '작은 버섯'], ['진흙 점액', '작은 버섯'], ['진흙 점액', '버섯 거인'], ['히드라', '진흙 점액', '버섯 거인'], ['히드라', '고목 엔트', '버섯 거인']] },
    fiend: { n: '악마', by: [['임프'], ['임프'], ['임프', '초트'], ['임프', '초트'], ['대악마', '임프', '초트'], ['대악마', '임프', '초트']] },
  },
  bands: [{ to: 5 }, { to: 15 }, { to: 30 }, { to: 50 }, { to: 80 }, { to: 1e9 }],
  // 보스: 큰 그림(32px)은 s를 작게 — 그림 자체가 이미 두 칸이다
  bosses: [
    { n: '늪의 군주', e: '👑', t: 'b_slimeking', s: 2, ty: 'ooze' }, { n: '놀 감독관', e: '👺', t: 'b_goblinchief', ty: 'humanoid' }, { n: '해골 기사', e: '💀', t: 'b_bat', ty: 'undead' },
    { n: '거대 좀비', e: '🧟', t: 'b_skeleton', s: 1.1, ty: 'undead' }, { n: '숲의 수호자', e: '🛡️', t: 'b_wolf', ty: 'beast' }, { n: '오우거 대장', e: '🗿', t: 'b_troll', s: 1.1, ty: 'giant' },
    { n: '심연의 초트', e: '👿', t: 'b_spider', ty: 'fiend' }, { n: '역병 거인', e: '🧟', t: 'b_ogre', s: 1.1, ty: 'giant' }, { n: '강령술사 군주', e: '🧙', t: 'b_lich', ty: 'humanoid' }, { n: '황금 대악마', e: '😈', t: 'b_dragon', s: 1.1, ty: 'fiend' },
  ],
  // 동료: col 직업 색(카드·칩), 영웅 기본 공격력 대비 배율, 사거리(칸), 공격 간격(초)
  allies: {
    // 12직업 (SRD 5.2.1 — DESIGN.md 56). 내부 키는 옛 저장 때문에 그대로: archer 레인저 · dragoon 파이터 · mage 소서러 · archmage 위저드 · scout 드루이드
    // hp = 히트 다이스 × 0.12 (G.Dnd.hdK) — d6 0.72 · d8 0.96 · d10 1.2 · d12 1.44
    archer: { col: '#c8566a', n: '레인저', t: 'u_archer', wpn: 'w_bow', atk: 0.6, hp: 1.2, range: 5, cd: 1.0, proj: 'fx_arrow' },
    // 클레릭: 기본 행동 = 치유(70% 아래 동료) 또는 신성한 불꽃(민첩 내성) · 바드: 기본 = 잔인한 조롱 같은 소마법 + 바드의 영감(song)
    cleric: { col: '#e9dfbf', n: '클레릭', t: 'u_cleric', wpn: 'w_holymace', atk: 0.6, hp: 0.96, range: 4, cd: 2.0, heal: 0.12, proj: 'fx_holy', saveAtk: 'dex' },
    bard: { col: '#e0a040', n: '바드', t: 'u_bard', atk: 0.3, hp: 0.96, range: 4, cd: 1.5, proj: 'fx_ice', song: true },
    mage: { col: '#e2742e', n: '소서러', t: 'u_mage', wpn: 'w_staff', atk: 1.4, hp: 0.72, range: 5, cd: 1.8, splash: 1.4, proj: 'fx_flame' },
    paladin: { col: '#8fc4ef', n: '팔라딘', t: 'u_paladin', wpn: 'w_hammer', atk: 0.8, hp: 1.2, range: 1.3, cd: 1.0 },
    dragoon: { col: '#6f8fe8', n: '파이터', t: 'u_dragoon', wpn: 'w_spear', atk: 3, hp: 1.2, range: 1.5, cd: 1.4 },
    archmage: { col: '#a98bf0', n: '위저드', t: 'u_archmage', wpn: 'w_arcstaff', atk: 2.5, hp: 0.72, range: 6, cd: 1.6, chain: 4, proj: 'fx_zap' },
    scout: { col: '#7fcf8a', n: '드루이드', t: 'u_scout', wpn: 'w_staff', atk: 0.7, hp: 0.96, range: 4, cd: 1.1, proj: 'fx_ice', guide: true },
    rogue: { col: '#7d8794', n: '로그', t: 'u_rogue', wpn: 'w_knife', atk: 2.5, hp: 0.96, range: 1.3, cd: 0.8 },
    barbarian: { col: '#d0603a', n: '바바리안', t: 'v_berserk', wpn: 'w_waraxe', atk: 2.2, hp: 1.44, range: 1.3, cd: 1.2 },
    monk: { col: '#e8c860', n: '몽크', t: 'xx_disc', atk: 1.1, hp: 0.96, range: 1.3, cd: 0.6 },
    warlock: { col: '#9a5ad0', n: '워락', t: 'v_warlock', atk: 1.3, hp: 0.96, range: 5, cd: 1.4, proj: 'fx_zap' },
  },
  // 버프: 음유시인의 노래, 성직자의 축복, 기술 「전투 함성」. dmg는 모든 피해 배율.
  buffs: {
    atk: { n: '용맹의 노래', t: 'b_atk', dmg: 1.5, col: '#ffb36b', d: '피해 ×1.5' },
    gold: { n: '행운의 노래', t: 'b_gold', col: '#ffd24a', d: '골드 ×2' },
    fury: { n: '전쟁의 북', t: 'b_fury', dmg: 3, col: '#ff5a3a', d: '피해 ×3' },
    regen: { n: '축복', t: 'b_regen', col: '#9fe79f', d: '초당 체력 +4%' },
    rage: { n: '전투 함성', t: 'r_dragon', dmg: 2, col: '#ff7a5a', d: '피해 ×2' },
    haste: { n: '시간 왜곡', t: 'st_haste', col: '#c9a6ff', d: '공격 속도 ×1.5' },
    static: { n: '집결', t: 'st_haste', col: '#bfe8ff', d: '공격 속도 ×1.2' },
    assault: { n: '총공세', t: 'u_god', col: '#ffd24a', d: '열어 둔 동료 전원 출전' },
    wall: { n: '성벽', t: 'd_shield', col: '#9fd0ff', d: '받는 피해 -50%' },
    ward: { n: '수호의 노래', t: 'd_shield', col: '#bfe0ff', d: '받는 피해 -30%' },
    path: { n: '지름길', t: 'f_stairs', col: '#7fcf8a', d: '이동 +50%' },
  },
};

// ───────── 용병 (DESIGN.md 31) ─────────
// 선술집에서 고용하는 한 사람 한 사람. 직업(F.allies)은 트리 면허로 열리고, 이름·레벨·특성은 사람마다 다르다.
// 기벽 (DESIGN.md 44, Darkest Dungeon 기벽): 원정이 사람을 바꾼다. 긍정 최대 3 · 부정 최대 3, 요양소에서 고정 · 제거.
// 늘 걸리는 수치: atk·hp 배율 · cd 공격 간격 배율 · revive 부활·부상 시간 배율 · xp 경험치 배율 · gold 원정대 골드 + · move 이동 + · price 몸값 배율
// 조건부(w): boss 보스에게 · rival 라이벌에게 · foe 그 라이벌단에게(키 'foe:<라이벌 id>') · low 내 체력 절반 아래 · front 최고층 이상 · fresh 층 처음 10초 · late 층 60초 뒤
//   dmg = 그때 주는 피해 배율 · taken = 그때 받는 피해 배율. ev = 사건으로만 생긴다(무작위로 굴리지 않음). 길눈은 G.Season이 읽는다
// 출신 재주 (DESIGN.md 61 · SRD 5.2.1 Origin Feats — 원문 4종, 마법 입문은 주문 목록 셋으로 나눔)
G.D.FEATS = {
  alert: { n: '경계', en: 'Alert', t: 'a_seal', d: '선제권 + 숙련 보너스' },
  mi_cleric: { n: '마법 입문 · 클레릭', en: 'Magic Initiate (Cleric)', t: 'fx_holy', d: '치유의 말', spell: 'sr_hword' },
  mi_druid: { n: '마법 입문 · 드루이드', en: 'Magic Initiate (Druid)', t: 'w_board', d: '얽힘', spell: 'sr_entangle' },
  mi_wizard: { n: '마법 입문 · 위저드', en: 'Magic Initiate (Wizard)', t: 'fx_zap', d: '마법 화살', spell: 'sr_mm' },
  savage: { n: '야만적 공격자', en: 'Savage Attacker', t: 'b_fury', d: '한 턴에 한 번 피해를 두 번 굴려 큰 쪽' },
  skilled: { n: '숙련', en: 'Skilled', t: 'v_explorer', d: '지각 · 조사 · 설득 숙련' },
};

// 마법 물건 (DESIGN.md 58 — DCSS 고정 아티팩트 · 랜다트 느낌, 이름은 SRD 5.2.1 마법 물건): 무기 · 갑옷 · 장신구 한 칸씩(무기 · 갑옷 아티팩트가 기본 장비를 대신한다, 대장간 강화는 그대로).
// props = [[속성, 값(, 값2)]] — 속성 뜻은 js/trinkets.js PROPS. 피해 · 체력 · 치유 배율(atk · hp · heal)은 주운 층(ilvl)이 깊을수록 커진다(인크레멘탈).
// r = 희귀도 1 고급 · 2 희귀 · 3 매우 희귀 · 4 전설 (깊이 10 · 25 · 40층부터) · fit = 쓸 수 있는 직업(없으면 누구나) · slot 'w' 무기 · 'a' 갑옷 · 없으면 장신구
(() => {
  const MELEE = ['dragoon', 'paladin', 'barbarian', 'rogue', 'bard', 'monk'], BLADE = ['dragoon', 'paladin', 'barbarian', 'rogue', 'bard'];
  const CASTER = ['mage', 'archmage', 'warlock', 'scout', 'cleric', 'bard'];
  // 갑옷 묶음 (G.Dnd 직업 갑옷): 무거움 · 중간까지 · 가벼움 · 갑옷 입는 사람 전부
  const HEAVY = ['paladin', 'dragoon'], MEDIUM = ['paladin', 'dragoon', 'cleric'], LIGHT = ['bard', 'scout', 'archer', 'rogue', 'warlock'], ARMORED = MEDIUM.concat(LIGHT), SHIELD = ['cleric', 'paladin', 'scout'];
  G.D.ITEM_FIT = { MELEE, BLADE, CASTER, RANGED: ['archer'], HEAVY, MEDIUM, LIGHT, ARMORED, SHIELD };
  // SRD 5.2.1 마법 물건 효과 그대로. 희귀도 r: 1 고급 · 2 희귀 · 3 매우 희귀 · 4 전설. 켜고 끄는 물건은 늘 켠 것으로 친다
  const UF = ['undead', 'fiend'];
  G.D.ARTS = {
    cloak_prot: { n: '보호의 망토', en: 'Cloak of Protection', ic: '🧥', r: 1, props: [['ac', 1], ['save', 1]] },
    ring_prot: { n: '보호의 반지', en: 'Ring of Protection', ic: '💍', r: 2, props: [['ac', 1], ['save', 1]] },
    gauntlets: { n: '오우거 힘의 건틀릿', en: 'Gauntlets of Ogre Power', ic: '🧤', r: 1, props: [['set', 'str', 19]] },
    belt_giant: { n: '서리 거인 힘의 허리띠', en: 'Belt of Giant Strength', ic: '🎗️', r: 3, props: [['set', 'str', 23]] },
    amulet_health: { n: '건강의 아뮬렛', en: 'Amulet of Health', ic: '📿', r: 2, props: [['set', 'con', 19]] },
    headband: { n: '지능의 머리띠', en: 'Headband of Intellect', ic: '👑', r: 1, props: [['set', 'int', 19]] },
    boots_speed: { n: '신속의 장화', en: 'Boots of Speed', ic: '👢', r: 2, props: [['move', 1], ['oaDis', 1]] },
    bracers_arch: { n: '궁술의 팔찌', en: 'Bracers of Archery', ic: '🏹', r: 1, fit: ['archer'], props: [['dmgB', 2]] },
    bracers_def: { n: '방어의 팔찌', en: 'Bracers of Defense', ic: '⛓️', r: 2, slot: 'a', fit: ['monk', 'barbarian', 'mage', 'archmage'], props: [['ac', 2]] },
    periapt_wound: { n: '상처 봉합의 부적', en: 'Periapt of Wound Closure', ic: '🩹', r: 1, props: [['deathTen', 1], ['hdX2', 1]] },
    ring_regen: { n: '재생의 반지', en: 'Ring of Regeneration', ic: '💍', r: 3, props: [['regenRest', 6]] },
    cloak_disp: { n: '전위의 망토', en: 'Cloak of Displacement', ic: '🧥', r: 2, props: [['hitDis', 1]] },
    ring_evasion: { n: '회피의 반지', en: 'Ring of Evasion', ic: '💍', r: 2, props: [['evade', 3]] },
    luckstone: { n: '행운의 돌', en: 'Stone of Good Luck', ic: '🪨', r: 1, props: [['save', 1]] },
    free_action: { n: '자유 행동의 반지', en: 'Ring of Free Action', ic: '💍', r: 2, props: [['imm', 'restrained'], ['imm', 'paralyzed']] },
    periapt_poison: { n: '독 방지 부적', en: 'Periapt of Proof against Poison', ic: '🧿', r: 2, props: [['imm', 'poisoned'], ['immT', 'poison']] },
    scarab: { n: '보호의 스카라브', en: 'Scarab of Protection', ic: '🪲', r: 4, props: [['ac', 1], ['magicRes', 1]] },
    brooch: { n: '방패의 브로치', en: 'Brooch of Shielding', ic: '📌', r: 1, props: [['res', 'force']] },
    ring_resist: { n: '저항의 반지', en: 'Ring of Resistance', ic: '💍', r: 2, props: [['resPick', 1]] },
    ioun: { n: '보호의 아이운 스톤', en: 'Ioun Stone', ic: '🔮', r: 2, props: [['ac', 1]] },
    wand_war: { n: '전투 마법사의 완드 +2', en: 'Wand of the War Mage', ic: '🪄', r: 2, fit: CASTER, props: [['hit', 2], ['noCover', 1]] },
    robe_arch: { n: '대마법사의 로브', en: 'Robe of the Archmagi', ic: '🥻', r: 4, slot: 'a', fit: ['mage', 'archmage', 'warlock'], props: [['acSet', 15], ['magicRes', 1], ['dc', 2], ['hit', 2]] },
    missile_snare: { n: '화살 잡기 장갑', en: 'Gloves of Missile Snaring', ic: '🧤', r: 1, props: [['snare', 1]] },
    fireballs: { n: '화염구 목걸이', en: 'Necklace of Fireballs', ic: '📿', r: 2, props: [['beads', 1]] },
    // 갑옷 (slot 'a')
    armor_resist: { n: '저항의 갑옷', en: 'Armor of Resistance', ic: '🦺', r: 2, slot: 'a', fit: ARMORED, props: [['resPick', 1]] },
    dwarven_plate: { n: '드워프 판금', en: 'Dwarven Plate', ic: '🦺', r: 3, slot: 'a', fit: HEAVY, props: [['ac', 2], ['stand', 1]] },
    elven_chain: { n: '엘프 사슬', en: 'Elven Chain', ic: '🦺', r: 2, slot: 'a', fit: ARMORED, props: [['ac', 1]] },
    adamantine: { n: '아다만틴 갑옷', en: 'Adamantine Armor', ic: '🦺', r: 1, slot: 'a', fit: MEDIUM, props: [['nocrit', 1]] },
    demon_armor: { n: '악마 갑옷', en: 'Demon Armor', ic: '🦺', r: 3, slot: 'a', fit: HEAVY, props: [['ac', 1]] },
    dragon_scale: { n: '용비늘 갑옷', en: 'Dragon Scale Mail', ic: '🐉', r: 3, slot: 'a', fit: MEDIUM, props: [['ac', 1], ['resPick', 1]] },
    invulnerability: { n: '불가침의 갑옷', en: 'Armor of Invulnerability', ic: '🦺', r: 4, slot: 'a', fit: HEAVY, props: [['res', 'bludgeoning'], ['res', 'piercing'], ['res', 'slashing']] },
    glamoured: { n: '환영 징 박은 가죽', en: 'Glamoured Studded Leather', ic: '🦺', r: 2, slot: 'a', fit: LIGHT, props: [['ac', 1]] },
    // 방패 (slot 'w' · shield) — 방패 직업의 손: 기본 무기 + 이 방패. 마법 무기와 둘 중 하나
    shield_plus: { n: '마법 방패 +2', en: 'Shield, +2', ic: '🛡️', r: 2, slot: 'w', shield: true, fit: SHIELD, props: [['ac', 2]] },
    spellguard: { n: '주문 수호 방패', en: 'Spellguard Shield', ic: '🛡️', r: 3, slot: 'w', shield: true, fit: SHIELD, props: [['magicRes', 1]] },
    sentinel: { n: '파수꾼 방패', en: 'Sentinel Shield', ic: '🛡️', r: 1, slot: 'w', shield: true, fit: SHIELD, props: [['init', 1]] },
    arrow_catching: { n: '화살 잡이 방패', en: 'Arrow-Catching Shield', ic: '🛡️', r: 2, slot: 'w', shield: true, fit: SHIELD, props: [['acFar', 2]] },
    // 무기 (slot 'w')
    flame_tongue: { n: '화염의 혀', en: 'Flame Tongue', ic: '🔥', r: 2, slot: 'w', fit: MELEE, props: [['ex', 2, 6, 'fire']] },
    frost_brand: { n: '서리 낙인', en: 'Frost Brand', ic: '❄️', r: 3, slot: 'w', fit: BLADE, props: [['ex', 1, 6, 'cold'], ['res', 'fire']] },
    vorpal: { n: '보팔 검', en: 'Vorpal Sword', ic: '⚔️', r: 4, slot: 'w', fit: BLADE, props: [['hit', 3], ['dmgB', 3], ['vorpal', 1]] },
    holy_avenger: { n: '성스러운 복수자', en: 'Holy Avenger', ic: '✨', r: 4, slot: 'w', fit: ['paladin'], props: [['hit', 3], ['dmgB', 3], ['ex', 2, 10, 'radiant', UF], ['magicRes', 1]] },
    sun_blade: { n: '태양검', en: 'Sun Blade', ic: '☀️', r: 2, slot: 'w', fit: BLADE, props: [['hit', 2], ['dmgB', 2], ['wtype', 'radiant'], ['ex', 1, 8, 'radiant', ['undead']]] },
    mace_disrupt: { n: '붕괴의 메이스', en: 'Mace of Disruption', ic: '🔨', r: 2, slot: 'w', fit: ['cleric', 'paladin'], props: [['ex', 2, 6, 'radiant', UF], ['destroy', 25]] },
    giant_slayer: { n: '거인 학살자', en: 'Giant Slayer', ic: '🗡️', r: 2, slot: 'w', fit: MELEE, props: [['hit', 1], ['dmgB', 1], ['ex', 2, 6, null, ['giant']], ['giantProne', 15]] },
    dragon_slayer: { n: '용 학살자', en: 'Dragon Slayer', ic: '🗡️', r: 2, slot: 'w', fit: MELEE, props: [['hit', 1], ['dmgB', 1], ['ex', 3, 6, null, ['dragon']]] },
    dwarven_thrower: { n: '드워프 투척 망치', en: 'Dwarven Thrower', ic: '🔨', r: 3, slot: 'w', fit: ['dragoon', 'paladin', 'barbarian'], props: [['hit', 3], ['dmgB', 3]] },
    oathbow: { n: '맹세의 활', en: 'Oathbow', ic: '🏹', r: 3, slot: 'w', fit: ['archer'], props: [['oath', 1]] },
    defender: { n: '수호자', en: 'Defender', ic: '🛡️', r: 4, slot: 'w', fit: BLADE, props: [['hit', 2], ['dmgB', 2], ['ac', 1]] },
    luck_blade: { n: '행운의 검', en: 'Luck Blade', ic: '🍀', r: 4, slot: 'w', fit: BLADE, props: [['hit', 1], ['dmgB', 1], ['save', 1], ['reroll', 1]] },
    nine_lives: { n: '아홉 목숨 도둑', en: 'Nine Lives Stealer', ic: '💀', r: 3, slot: 'w', fit: BLADE, props: [['hit', 2], ['dmgB', 2], ['nine', 1]] },
    dagger_venom: { n: '독의 단검', en: 'Dagger of Venom', ic: '🗡️', r: 2, slot: 'w', fit: ['rogue', 'bard'], props: [['hit', 1], ['dmgB', 1], ['venom', 1]] },
    berserker_axe: { n: '광전사의 도끼', en: 'Berserker Axe', ic: '🪓', r: 2, slot: 'w', fit: ['barbarian', 'dragoon'], props: [['hit', 1], ['dmgB', 1], ['hpLv', 1]] },
    sharpness: { n: '예리함의 검', en: 'Sword of Sharpness', ic: '⚔️', r: 3, slot: 'w', fit: BLADE, props: [['sharp', 14]] },
    life_steal: { n: '생명 강탈의 검', en: 'Sword of Life Stealing', ic: '🩸', r: 2, slot: 'w', fit: BLADE, props: [['lifeS', 15]] },
    hammer_thunder: { n: '천둥 망치', en: 'Hammer of Thunderbolts', ic: '⚡', r: 4, slot: 'w', fit: ['dragoon', 'paladin', 'barbarian', 'cleric'], props: [['hit', 1], ['dmgB', 1]] },
    staff_power: { n: '권능의 지팡이', en: 'Staff of Power', ic: '🪄', r: 3, slot: 'w', fit: ['mage', 'archmage', 'warlock'], props: [['hit', 2], ['dmgB', 2], ['ac', 2], ['save', 2]] },
    staff_magi: { n: '마기의 지팡이', en: 'Staff of the Magi', ic: '🪄', r: 4, slot: 'w', fit: ['archmage', 'mage', 'warlock'], props: [['hit', 2], ['dmgB', 2], ['magicRes', 1]] },
    dancing: { n: '춤추는 검', en: 'Dancing Sword', ic: '🗡️', r: 3, slot: 'w', fit: BLADE, props: [['extraAtk', 1]] },
    lordly: { n: '군주의 권능 홀', en: 'Rod of Lordly Might', ic: '🔱', r: 4, slot: 'w', fit: MELEE, props: [['hit', 3], ['dmgB', 3]] },
  };
  // 랜다트: 바탕(장신구 · 무기 — 무기는 직업 묶음) · 이름 조각
  G.D.RANDART = {
    base: [['반지', '💍'], ['아뮬렛', '📿'], ['망토', '🧥'], ['장화', '👢'], ['장갑', '🧤'], ['허리띠', '🎗️'], ['머리띠', '👑'], ['팔찌', '⛓️'], ['브로치', '📌']],
    abase: [['판금 갑옷', '🦺', HEAVY], ['사슬 갑옷', '🦺', MEDIUM], ['가죽 갑옷', '🦺', LIGHT], ['로브', '🥻', ['mage', 'archmage', 'warlock']], ['팔보호대', '⛓️', ['monk', 'barbarian']]],
    sbase: ['방패', '🛡️', SHIELD],
    wbase: [['롱소드', '🗡️', BLADE], ['워해머', '🔨', ['dragoon', 'paladin', 'barbarian', 'cleric']], ['롱보우', '🏹', ['archer']], ['지팡이', '🪄', CASTER], ['단검', '🗡️', ['rogue', 'bard']], ['쿼터스태프', '🥢', ['monk', 'scout']]],
    adj: ['잿빛', '핏빛', '별빛', '오래된', '속삭이는', '굶주린', '얼어붙은', '타오르는', '고요한', '뒤틀린', '잊힌', '부서진', '검은', '은빛', '황금빛', '저주받은', '축복받은', '노래하는', '울부짖는', '잠든'],
    noun: ['맹세', '망각', '폭풍', '심연', '여명', '황혼', '송곳니', '왕관', '비명', '서리', '불꽃', '그림자', '메아리', '별', '피', '뼈', '달', '가시', '바람', '침묵'],
  };
})();
// 성격 (DESIGN.md 42): 축 셋(용기 · 욕심 · 싸움)에 둘씩. 한 사람은 0~2개, 같은 축에서는 하나만. ic = 머리 위 기호(ni_<ic>)
G.D.PERSONA = {
  hot: { n: '다혈질', ax: 'nerve', ic: 'pe_hot', d: '먼저 돌진 · 첫 타 ×1.5' },
  coward: { n: '겁쟁이', ax: 'nerve', ic: 'pe_coward', d: '체력 30% · 3초 후퇴' },
  greedy: { n: '욕심쟁이', ax: 'greed', ic: 'pe_greedy', d: '귀환 기준 -10%p' },
  careful: { n: '신중', ax: 'greed', ic: 'pe_careful', d: '귀환 기준 +10%p' },
  brawler: { n: '싸움꾼', ax: 'fight', ic: 'pe_brawler', d: '맞서기 라이벌에게 먼저 덤빔' },
  meek: { n: '온순', ax: 'fight', ic: 'pe_meek', d: '라이벌전 빠짐 · 노려지지 않음' },
};
// 개인 기술 (DESIGN.md 43 · 56): 아래 SRD 목록이 전부. 쿨다운은 없다 (자원은 G.Skill.SK의 res) 배율이라 이름을 나눴다.
// 출처 표기 (SRD 5.2.1 CC-BY-4.0가 요구하는 문구 그대로. NOTICE.md와 같다)
G.D.NOTICE = 'This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.';
G.D.MSKILLS = {};
// SRD 5.2.1 직업 기술 · 주문 (DESIGN.md 56 ②): 전투에 쓰는 유명한 것만, 전부 쿨다운으로. en = SRD 원문 이름(영문판).
// lv = 쓸 수 있는 용병 레벨(주문은 SRD 주문 레벨을 배우는 레벨, 직업마다 다르면 { 직업: 레벨 }) · passive = 늘 켜져 있음(칸은 차지한다)
Object.assign(G.D.MSKILLS, {
  // 공용 주문
  sr_cure: { n: '상처 치료', en: 'Cure Wounds', t: 'fx_holy', d: '가장 다친 동료 2d8 + 능력치', lv: { archer: 2, cleric: 1 } },
  sr_hword: { n: '치유의 말', en: 'Healing Word', t: 'b_regen', d: '멀리서 2d4 + 능력치', lv: 1 },
  sr_bless: { n: '축복', en: 'Bless', t: 'b_atk', d: '셋 명중 · 내성 +d4 · 10라운드 · 집중', lv: 1 },
  sr_spike: { n: '가시 성장', en: 'Spike Growth', t: 'w_board', d: '반경 4칸 라운드마다 2d4 · 집중', lv: { archer: 5, scout: 3 } },
  sr_breath: { n: '숨결', en: 'Breath Weapon', t: 'fx_fire', d: '곁 3칸 d10 (Lv 5 · 11 · 17에 +d10) · 민첩 내성 절반', lv: 1 },
  sr_fireball: { n: '화염구', en: 'Fireball', t: 'fx_fire', d: '반경 4칸 8d6 · 민첩 내성 절반', lv: 5 },
  // 바바리안
  sr_rage: { n: '격노', en: 'Rage', t: 'b_fury', d: '10라운드 피해 +2~+4 · 물리 피해 절반', lv: 1 },
  sr_reckless: { n: '무모한 공격', en: 'Reckless Attack', t: 'w_waraxe', d: '이번 라운드 공격 이점 · 적도 나에게 이점', lv: 2 },
  sr_frenzy: { n: '광란', en: 'Frenzy', t: 'r_dragon', d: '무모한 공격 + 격노 차례의 첫 명중에 격노 피해만큼 d6', passive: true, lv: 3 },
  sr_brutal: { n: '잔혹한 일격', en: 'Brutal Strike', t: 'w_cleaver', d: '무모한 공격 뒤 한 번 +1d10 · 밀침 또는 느려짐', lv: 9 },
  sr_intim: { n: '위협적인 존재감', en: 'Intimidating Presence', t: 'b_fury', d: '6칸 지혜 내성 · 공포 10라운드', lv: 10 },
  sr_relent: { n: '끈질긴 격노', en: 'Relentless Rage', t: 'u_god', d: '격노 중 쓰러지면 건강 내성으로 버팀', passive: true, lv: 11 },
  sr_retal: { n: '보복', en: 'Retaliation', t: 'd_shield', d: '곁의 적에게 맞으면 되받아침', passive: true, lv: 14 },
  // 파이터
  sr_second: { n: '재기', en: 'Second Wind', t: 'b_regen', d: '체력 절반 아래 1d10 + 레벨', lv: 1 },
  sr_surge: { n: '행동 쇄도', en: 'Action Surge', t: 'st_haste', d: '이번 차례에 공격 행동 한 번 더', lv: 2 },
  sr_cleave: { n: '가르기', en: 'Cleave', t: 'w_spear', d: '무기 공격 + 곁의 다른 적 무기 주사위', lv: 1 },
  sr_topple: { n: '넘어뜨리기', en: 'Topple', t: 'w_hammer', d: '무기 공격 · 건강 내성 · 넘어짐', lv: 1 },
  sr_sap: { n: '약화', en: 'Sap', t: 'w_mace', d: '무기 공격 · 다음 공격 불리', lv: 1 },
  sr_impcrit: { n: '향상된 치명타', en: 'Improved Critical', t: 'w_sword', d: '19~20 치명타 (Lv 15 18~20)', passive: true, lv: 3 },
  sr_indom: { n: '불굴', en: 'Indomitable', t: 'u_armor', d: '실패한 내성 + 레벨로 다시', passive: true, lv: 9 },
  // 로그
  sr_cunning: { n: '교활한 행동', en: 'Cunning Action', t: 'a_escape', d: '약한 적 곁으로 · 이번 라운드 이점', lv: 2 },
  sr_steady: { n: '정밀 조준', en: 'Steady Aim', t: 'g_dagger', d: '이번 라운드 공격 이점', lv: 3 },
  sr_fasthands: { n: '재빠른 손', en: 'Fast Hands', t: 'ui_gold', d: '기습마다 골드', passive: true, lv: 3 },
  sr_cstrike: { n: '교활한 일격', en: 'Cunning Strike', t: 'w_knife', d: '기습 −1d6 · 중독 · 넘어뜨리기 · 물러나기 중 하나', lv: 5 },
  sr_uncanny: { n: '직감 회피', en: 'Uncanny Dodge', t: 'd_shield', d: '라운드에 한 번 피해 절반', passive: true, lv: 5 },
  sr_reliable: { n: '믿음직한 재능', en: 'Reliable Talent', t: 'ui_star', d: '지각 · 조사 · 설득 +5', passive: true, lv: 7 },
  sr_devious: { n: '교묘한 일격', en: 'Devious Strikes', t: 'g_dagger', d: '기습 −2d6 멍함 · −3d6 실명 · −6d6 기절 중 하나', lv: 14 },
  // 몽크
  sr_flurry: { n: '연타', en: 'Flurry of Blows', t: 'st_haste', d: '무기 주사위 2번 (Lv 10 3번)', lv: 2 },
  sr_patient: { n: '인내의 방어', en: 'Patient Defense', t: 'd_shield', d: '이번 라운드 나를 노리는 공격 불리', lv: 2 },
  sr_wind: { n: '바람의 발걸음', en: 'Step of the Wind', t: 'a_escape', d: '먼 적 곁으로 뛰어든다', lv: 2 },
  sr_deflect: { n: '공격 튕겨내기', en: 'Deflect Attacks', t: 'd_shield', d: '피해 −(1d10 + 민첩 + 레벨)', passive: true, lv: 3 },
  sr_ohtech: { n: '열린 손 기법', en: 'Open Hand Technique', t: 'w_board', d: '연타 명중마다 민첩 내성 · 넘어짐', passive: true, lv: 3 },
  sr_stun: { n: '기절 타격', en: 'Stunning Strike', t: 'a_seal', d: '무기 공격 · 건강 내성 · 기절 1라운드', lv: 5 },
  sr_whole: { n: '신체의 완전함', en: 'Wholeness of Body', t: 'b_regen', d: '체력 절반 아래 무술 주사위 + 지혜', lv: 6 },
  sr_quiver: { n: '진동 장', en: 'Quivering Palm', t: 'a_thunder', d: '명중하면 10d12 · 건강 내성 절반', lv: 17 },
  // 팔라딘
  sr_lay: { n: '안수', en: 'Lay On Hands', t: 'fx_holy', d: '레벨 × 5 회복', lv: 1 },
  sr_sof: { n: '신앙의 방패', en: 'Shield of Faith', t: 'd_shield', d: '가장 다친 동료 AC +2 · 집중', lv: 1 },
  sr_smite: { n: '신성 강타', en: 'Divine Smite', t: 'w_hammer', d: '무기로 맞히면 +2d8 (언데드 · 악마 +3d8)', lv: 2 },
  sr_searing: { n: '작열 강타', en: 'Searing Smite', t: 'fx_flame', d: '무기로 맞히면 +1d6 · 라운드마다 화상', lv: 2 },
  sr_sacred: { n: '신성한 무기', en: 'Sacred Weapon', t: 'w_holymace', d: '10라운드 명중 + 매력', lv: 3 },
  sr_aura: { n: '보호의 오라', en: 'Aura of Protection', t: 'q_peak', d: '3칸 안 동료 내성 + 매력', passive: true, lv: 6 },
  // 레인저
  sr_hmark: { n: '사냥꾼의 표식', en: "Hunter's Mark", t: 'b_fury', d: '강한 적 표식 · 내가 맞히면 +1d6 · 집중', lv: 1 },
  sr_ensnare: { n: '속박의 일격', en: 'Ensnaring Strike', t: 'w_bow', d: '무기로 맞히면 근력 내성 · 속박 2라운드 · 집중', lv: 1 },
  sr_colossus: { n: '거인 사냥꾼', en: 'Colossus Slayer', t: 'fx_arrow', d: '다친 적에게 라운드에 한 번 +1d8', passive: true, lv: 3 },
  sr_mdef: { n: '다중 공격 방어', en: 'Multiattack Defense', t: 'd_shield', d: '맞은 뒤 그 상대의 남은 공격에 불리', passive: true, lv: 7 },
  sr_sprey: { n: '상위 사냥감', en: "Superior Hunter's Prey", t: 'fx_arrow', d: '표식 적을 맞히면 곁의 적에게 1d6', passive: true, lv: 11 },
  // 클레릭
  sr_gbolt: { n: '인도의 화살', en: 'Guiding Bolt', t: 'fx_holy', d: '명중 4d6 · 다음 공격 이점', lv: 1 },
  sr_sflame: { n: '신성한 불꽃', en: 'Sacred Flame', t: 'fx_holy', d: '1d8 (Lv 5 · 11 · 17에 +d8) · 민첩 내성 무효', lv: 1 },
  sr_turn: { n: '언데드 퇴치', en: 'Turn Undead', t: 'u_god', d: '6칸 언데드 지혜 내성 · 공포 · 기절', lv: 2 },
  sr_sweapon: { n: '영적 무기', en: 'Spiritual Weapon', t: 'w_holymace', d: '차례마다 떠다니는 무기 · 집중', lv: 3 },
  sr_guard: { n: '영혼 수호자', en: 'Spirit Guardians', t: 'q_peak', d: '3칸 차례마다 3d8 · 느려짐 · 집중', lv: 5 },
  sr_revive: { n: '소생술', en: 'Revivify', t: 'u_god', d: '쓰러진 동료 체력 1', lv: 5 },
  sr_mhw: { n: '집단 치유의 말', en: 'Mass Healing Word', t: 'b_regen', d: '파티 2d4 + 능력치', lv: 5 },
  // 바드
  sr_insp: { n: '바드의 영감', en: 'Bardic Inspiration', t: 'fx_song', d: '동료 명중 · 내성 +d6~d12 · 10라운드', lv: 1 },
  sr_faerie: { n: '요정 불꽃', en: 'Faerie Fire', t: 'fx_song', d: '반경 2칸 민첩 내성 · 빛남 10라운드 · 집중', lv: 1 },
  sr_mock: { n: '잔인한 조롱', en: 'Vicious Mockery', t: 'b_fury', d: '1d6 (Lv 5 · 11 · 17에 +d6) · 지혜 내성 · 다음 공격 불리', lv: 1 },
  sr_whisper: { n: '불협화음의 속삭임', en: 'Dissonant Whispers', t: 'fx_zap', d: '3d6 · 지혜 내성 절반 · 공포', lv: 1 },
  sr_tw: { n: '천둥파', en: 'Thunderwave', t: 'a_thunder', d: '곁 2칸 2d8 · 건강 내성 절반 · 밀침', lv: 1 },
  sr_sleep: { n: '수면', en: 'Sleep', t: 'fx_song', d: '반경 1칸 지혜 내성 · 기절 2라운드 · 집중', lv: 1 },
  sr_cutting: { n: '베는 말', en: 'Cutting Words', t: 'fx_song', d: '근처 적 명중 −d6', passive: true, lv: 3 },
  sr_shatter: { n: '산산조각', en: 'Shatter', t: 'a_thunder', d: '반경 2칸 3d8 · 건강 내성 절반', lv: 3 },
  sr_hypno: { n: '최면 문양', en: 'Hypnotic Pattern', t: 'fx_song', d: '반경 3칸 지혜 내성 · 기절 3라운드 · 집중', lv: 5 },
  // 드루이드
  sr_pflame: { n: '불꽃 생성', en: 'Produce Flame', t: 'fx_flame', d: '명중 1d8 (Lv 5 · 11 · 17에 +d8)', lv: 1 },
  sr_entangle: { n: '얽힘', en: 'Entangle', t: 'w_board', d: '반경 2칸 근력 내성 · 속박 3라운드 · 집중', lv: 1 },
  sr_wild: { n: '야생 변신', en: 'Wild Shape', t: 'm_bear', d: '곰으로 변신 · 임시 체력 = 레벨 · 근접', lv: 2 },
  sr_landaid: { n: '대지의 도움', en: "Land's Aid", t: 'b_regen', d: '반경 2칸 2d6 · 건강 내성 절반 · 동료 2d6 회복', lv: 3 },
  sr_moon: { n: '월광', en: 'Moonbeam', t: 'fx_holy', d: '따라가는 빛 2d10 · 건강 내성 절반 · 집중', lv: 3 },
  sr_call: { n: '번개 부르기', en: 'Call Lightning', t: 'a_thunder', d: '차례마다 낙뢰 3d10 · 민첩 내성 절반 · 집중', lv: 5 },
  sr_ice: { n: '얼음 폭풍', en: 'Ice Storm', t: 'fx_ice', d: '반경 4칸 2d10 + 4d6 · 민첩 내성 절반 · 느려짐', lv: 7 },
  // 소서러
  sr_firebolt: { n: '화염살', en: 'Fire Bolt', t: 'fx_flame', d: '명중 1d10 (Lv 5 · 11 · 17에 +d10)', lv: 1 },
  sr_chroma: { n: '색채의 구', en: 'Chromatic Orb', t: 'fx_zap', d: '명중 3d8', lv: 1 },
  sr_quicken: { n: '주문 가속', en: 'Quickened Spell', t: 'st_haste', d: '주문을 추가 행동으로', passive: true, lv: 2 },
  sr_twin: { n: '쌍둥이 주문', en: 'Twinned Spell', t: 'fx_zap', d: '한 명 주문이 둘에게', passive: true, lv: 2 },
  sr_sray: { n: '작열 광선', en: 'Scorching Ray', t: 'fx_fire', d: '광선 셋 · 각 명중 2d6', lv: 3 },
  sr_lbolt: { n: '번개 줄기', en: 'Lightning Bolt', t: 'a_thunder', d: '일직선 8d6 · 민첩 내성 절반', lv: 5 },
  sr_affinity: { n: '원소 친화', en: 'Elemental Affinity', t: 'r_dragon', d: '화염 주문 + 매력', passive: true, lv: 6 },
  sr_chain: { n: '연쇄 번개', en: 'Chain Lightning', t: 'fx_zap', d: '넷에게 10d8 · 민첩 내성 절반', lv: 11 },
  // 워락
  sr_eb: { n: '섬뜩한 폭발', en: 'Eldritch Blast', t: 'fx_zap', d: '광선 1d10 (Lv 5 · 11 · 17에 하나씩)', lv: 1 },
  sr_hex: { n: '헥스', en: 'Hex', t: 'b_fury', d: '강한 적 저주 · 내가 맞히면 +1d6 · 집중', lv: 1 },
  sr_rebuke: { n: '지옥의 질책', en: 'Hellish Rebuke', t: 'fx_fire', d: '맞으면 2d10 되갚음 · 민첩 내성 절반', passive: true, lv: 1 },
  sr_agon: { n: '고통의 폭발', en: 'Agonizing Blast', t: 'fx_zap', d: '섬뜩한 폭발 + 매력', passive: true, lv: 2 },
  sr_dob: { n: '어둠의 축복', en: "Dark One's Blessing", t: 'r_dragon', d: '처치하면 임시 체력 = 매력 + 레벨', passive: true, lv: 3 },
  sr_dark: { n: '어둠', en: 'Darkness', t: 'a_seal', d: '어둠 · 안의 적 실명 · 집중', lv: 3 },
  sr_fear: { n: '공포', en: 'Fear', t: 'b_fury', d: '4칸 지혜 내성 · 공포 3라운드 · 집중', lv: 5 },
  sr_vtouch: { n: '흡혈의 손길', en: 'Vampiric Touch', t: 'r_stew', d: '명중 3d6 · 절반 회복 · 집중', lv: 5 },
  // 위저드
  sr_rof: { n: '서리 광선', en: 'Ray of Frost', t: 'fx_ice', d: '명중 1d8 (Lv 5 · 11 · 17에 +d8) · 느려짐', lv: 1 },
  sr_mm: { n: '마법 화살', en: 'Magic Missile', t: 'fx_zap', d: '반드시 맞는 화살 셋 · 각 1d4 + 1', lv: 1 },
  sr_shield: { n: '방어막', en: 'Shield', t: 'd_shield', d: '아슬하게 맞을 공격을 AC +5로 막음', passive: true, lv: 1 },
  sr_misty: { n: '안개 걸음', en: 'Misty Step', t: 'a_escape', d: '위험하면 순간 이동', lv: 3 },
  sr_hold: { n: '인간형 포박', en: 'Hold Person', t: 'a_seal', d: '인간형 지혜 내성 · 마비 2라운드 · 집중', lv: 3 },
  sr_web: { n: '거미줄', en: 'Web', t: 'm_spider', d: '반경 2칸 민첩 내성 · 속박 3라운드 · 집중', lv: 3 },
  sr_haste: { n: '가속', en: 'Haste', t: 'st_haste', d: '동료 AC +2 · 공격 +1 · 10라운드 · 집중', lv: 5 },
  sr_slow: { n: '감속', en: 'Slow', t: 'st_haste', d: '여섯 지혜 내성 · 느려짐 · AC −2 · 집중', lv: 5 },
  sr_cone: { n: '냉기 분사', en: 'Cone of Cold', t: 'fx_ice', d: '곁 4칸 8d8 · 건강 내성 절반', lv: 9 },
  sr_meteor: { n: '유성 폭풍', en: 'Meteor Swarm', t: 'fx_fire', d: '반경 8칸 20d6 + 20d6 · 민첩 내성 절반', lv: 17 },
  // 직업 기능 (추가)
  sr_feral: { n: '야성의 본능', en: 'Feral Instinct', t: 'b_fury', d: '선제권 이점', passive: true, lv: 7 },
  sr_fastmove: { n: '빠른 이동', en: 'Fast Movement', t: 'a_escape', d: '이동 +2칸', passive: true, lv: 5, move: 0.33 },
  sr_push: { n: '밀쳐내기', en: 'Push', t: 'w_hammer', d: '무기 공격 · 2칸 밀침', lv: 1 },
  sr_elusive: { n: '종잡을 수 없음', en: 'Elusive', t: 'a_escape', d: '나를 노리는 공격에 이점 없음', passive: true, lv: 18 },
  sr_selfrest: { n: '자기 회복', en: 'Self-Restoration', t: 'b_regen', d: '공포 · 중독에 걸리지 않음', passive: true, lv: 10 },
  sr_radiant: { n: '광휘의 일격', en: 'Radiant Strikes', t: 'fx_holy', d: '근접 명중 +1d8 광휘', passive: true, lv: 11 },
  sr_tireless: { n: '지치지 않음', en: 'Tireless', t: 'b_regen', d: '차례마다 임시 체력 1d8 + 지혜', passive: true, lv: 10 },
  sr_precise: { n: '정밀한 사냥꾼', en: 'Precise Hunter', t: 'fx_arrow', d: '내 표식 적에게 공격 이점', passive: true, lv: 17 },
  // 서브클래스 기능 (G.D.ADV sig — 전직하면 그 레벨에 저절로)
  sr_survivor: { n: '생존자', en: 'Survivor', t: 'b_regen', d: '체력 절반 아래 차례마다 5 + 건강', passive: true, lv: 18 },
  sr_reflex: { n: '도둑의 반사신경', en: 'Thief’s Reflexes', t: 'st_haste', d: '첫 라운드에 두 번 행동', passive: true, lv: 17 },
  sr_nimbus: { n: '신성한 후광', en: 'Holy Nimbus', t: 'q_peak', d: '6칸 안 적 차례마다 광휘 10', passive: true, lv: 20 },
  sr_disciple: { n: '생명의 제자', en: 'Disciple of Life', t: 'fx_holy', d: '치유 + 2 + 주문 레벨', passive: true, lv: 3, heal: 1.3 },
  sr_preserve: { n: '생명 보존', en: 'Preserve Life', t: 'u_god', d: '절반 아래 동료들 절반까지 · 합쳐서 레벨 × 5', lv: 6 },
  sr_peerless: { n: '비길 데 없는 기술', en: 'Peerless Skill', t: 'fx_song', d: '명중 +3', passive: true, lv: 14, hitB: 3 },
  sr_ward: { n: '자연의 수호', en: 'Nature’s Ward', t: 'b_regen', d: '중독 · 공포에 걸리지 않음', passive: true, lv: 10 },
  sr_dres: { n: '용의 회복력', en: 'Draconic Resilience', t: 'r_dragon', d: 'AC 10 + 민첩 + 매력 · 체력 + 레벨 + 2', passive: true, lv: 3, hp: 1.1 },
  sr_luck: { n: '어둠의 행운', en: 'Dark One’s Own Luck', t: 'ui_star', d: '실패한 내성에 +d10', passive: true, lv: 6 },
  sr_fres: { n: '악마의 회복력', en: 'Fiendish Resilience', t: 'u_armor', d: '물리 피해 절반', passive: true, lv: 10 },
  sr_hurl: { n: '지옥 던지기', en: 'Hurl Through Hell', t: 'fx_fire', d: '맞히면 매력 내성 · 8d10 · 기절', lv: 14 },
  sr_potent: { n: '강력한 소마법', en: 'Potent Cantrip', t: 'fx_zap', d: '빗나간 소마법 · 버틴 내성도 절반', passive: true, lv: 3 },
  sr_empower: { n: '강화된 방출', en: 'Empowered Evocation', t: 'fx_fire', d: '방출계 주문 + 지능', passive: true, lv: 10 },
});
// 대표 기술 (DESIGN.md 66): 직업마다 하나는 늘 첫 칸 — 그 직업이 무엇을 하는지 한눈에 보이는 것. 나머지 셋은 풀에서
G.D.MSIG = { barbarian: 'sr_rage', bard: 'sr_tw', cleric: 'sr_gbolt', scout: 'sr_wild', dragoon: 'sr_surge', monk: 'sr_flurry', paladin: 'sr_smite', archer: 'sr_hmark', rogue: 'sr_cunning', mage: 'sr_firebolt', warlock: 'sr_eb', archmage: 'sr_mm' };
// 임무 적성 (DESIGN.md 66 · 픽 미 업): 그 임무에서 한 몫 하는 직업 — 원정대에 있으면 임무가 쉬워진다
G.D.APT = {
  hunt: { cls: ['dragoon', 'mage', 'archmage', 'warlock'], d: n => `보상 +${25 * n}%` },
  survive: { cls: ['barbarian', 'cleric', 'paladin'], d: n => `버틸 시간 −${5 * n}초` },
  defend: { cls: ['paladin', 'dragoon', 'barbarian'], d: n => `결계석 체력 +${30 * n}%` },
  escort: { cls: ['cleric', 'bard', 'paladin'], d: n => `상인 체력 +${30 * n}% · 사례 +${25 * n}%` },
  search: { cls: ['rogue', 'archer', 'scout'], d: n => `유물 ${n}개 바로 보임` },
  escape: { cls: ['monk', 'rogue', 'archer'], d: n => `제한 시간 +${10 * n}초` },
};
G.D.MPOOL = {
  barbarian: ['sr_rage', 'sr_reckless', 'sr_brutal', 'sr_relent', 'sr_fastmove'],
  bard: ['sr_faerie', 'sr_mock', 'sr_hword', 'sr_whisper', 'sr_tw', 'sr_sleep', 'sr_shatter', 'sr_hypno'],
  cleric: ['sr_cure', 'sr_bless', 'sr_gbolt', 'sr_turn', 'sr_sweapon', 'sr_guard', 'sr_revive', 'sr_mhw'],
  scout: ['sr_pflame', 'sr_entangle', 'sr_hword', 'sr_wild', 'sr_moon', 'sr_spike', 'sr_call', 'sr_ice'],
  dragoon: ['sr_second', 'sr_surge', 'sr_cleave', 'sr_topple', 'sr_sap', 'sr_push', 'sr_indom'],
  monk: ['sr_flurry', 'sr_patient', 'sr_wind', 'sr_deflect', 'sr_stun', 'sr_selfrest'],
  paladin: ['sr_lay', 'sr_sof', 'sr_bless', 'sr_smite', 'sr_searing', 'sr_aura', 'sr_radiant'],
  archer: ['sr_hmark', 'sr_ensnare', 'sr_cure', 'sr_spike', 'sr_tireless', 'sr_precise'],
  rogue: ['sr_cunning', 'sr_steady', 'sr_cstrike', 'sr_uncanny', 'sr_reliable', 'sr_devious'],
  mage: ['sr_firebolt', 'sr_chroma', 'sr_quicken', 'sr_twin', 'sr_sray', 'sr_fireball', 'sr_lbolt', 'sr_chain'],
  warlock: ['sr_eb', 'sr_hex', 'sr_rebuke', 'sr_agon', 'sr_dark', 'sr_fear', 'sr_vtouch'],
  archmage: ['sr_rof', 'sr_mm', 'sr_shield', 'sr_misty', 'sr_hold', 'sr_web', 'sr_fireball', 'sr_haste', 'sr_slow', 'sr_cone', 'sr_meteor'],
};

// 상위 직업 (DESIGN.md 40): Lv 10에 직업마다 둘 중 하나로 전직. 그림(t)·색이 바뀌고 수치 배율(atk·hp·cd·heal)과 몸 수치(def: 사거리·범위·연쇄·치유)를 덮어쓴다.
// sig = 전직하면 얻는 스킬 (다른 직업 풀의 패시브도 가져온다 — 전투 코드는 직업과 상관없이 키로 읽는다).
// 서브클래스 (SRD 5.2.1 — 직업마다 하나, DESIGN.md 56): Lv 3에 골드를 내고 들어간다. 기능(sig)은 그 레벨이 되면 저절로 켜진다. 수치 배율은 없다
G.D.ADV = {
  hunter: { base: 'archer', n: '헌터', en: 'Hunter', t: 'v_hunter', col: '#7fbf5a', sig: ['sr_colossus', 'sr_mdef', 'sr_sprey'] },
  life: { base: 'cleric', n: '생명 권역', en: 'Life Domain', t: 'v_priest', col: '#fff3c4', sig: ['sr_disciple', 'sr_preserve'] },
  lore: { base: 'bard', n: '전승 학파', en: 'College of Lore', t: 'v_maestro', col: '#f0c060', sig: ['sr_cutting', 'sr_peerless'] },
  draconic: { base: 'mage', n: '용의 혈통', en: 'Draconic Sorcery', t: 'v_arch', col: '#ff9a4a', sig: ['sr_dres', 'sr_affinity'] },
  devotion: { base: 'paladin', n: '헌신의 맹세', en: 'Oath of Devotion', t: 'v_crusader', col: '#e8d070', sig: ['sr_sacred', 'sr_nimbus'] },
  champion: { base: 'dragoon', n: '챔피언', en: 'Champion', t: 'v_dknight', col: '#5ac0a0', sig: ['sr_impcrit', 'sr_survivor'] },
  evoker: { base: 'archmage', n: '방출계 학파', en: 'Evoker', t: 'v_thunder', col: '#8fd8ff', sig: ['sr_potent', 'sr_empower'] },
  thief: { base: 'rogue', n: '도둑', en: 'Thief', t: 'v_thiefk', col: '#e0b040', sig: ['sr_fasthands', 'sr_reflex'] },
  land: { base: 'scout', n: '대지의 회합', en: 'Circle of the Land', t: 'v_explorer', col: '#a0d070', sig: ['sr_landaid', 'sr_ward'] },
  berserker: { base: 'barbarian', n: '광전사의 길', en: 'Path of the Berserker', t: 'v_berserk', col: '#d04a3a', sig: ['sr_frenzy', 'sr_intim', 'sr_retal'] },
  openhand: { base: 'monk', n: '열린 손의 전사', en: 'Warrior of the Open Hand', t: 'xx_disc', col: '#e8c860', sig: ['sr_ohtech', 'sr_whole', 'sr_quiver'] },
  fiend: { base: 'warlock', n: '악마 후원자', en: 'Fiend Patron', t: 'v_warlock', col: '#9a5ad0', sig: ['sr_dob', 'sr_luck', 'sr_fres', 'sr_hurl'] },
};
// 옛 전직 → 그 직업의 서브클래스
G.D.ADV_OLD = { sniper: 'hunter', priest: 'life', inquis: 'life', maestro: 'lore', dancer: 'lore', arch: 'draconic', warlock: 'draconic', guard: 'devotion', crusader: 'devotion', dknight: 'champion', berserk: 'champion', chrono: 'evoker', thunder: 'evoker', shade: 'thief', thiefk: 'thief', explorer: 'land', tracker: 'land' };

// 이름: 앞·뒤 음절을 하나씩
G.D.NAMES = [['아', '리', '엘', '카', '렌', '도', '세', '라', '유', '하', '진', '루', '테', '바', '노', '시', '온', '미', '가', '벨'], ['린', '안', '로', '스', '나', '온', '델', '르', '아', '윤', '크', '티', '엔', '라', '드', '몬', '샤', '베', '오', '하']];

// ───────── 라이벌 원정대 (DESIGN.md 29) ─────────
// lead·crew는 F.allies 그림·수치를 빌린다. pace: 내려가는 빠르기, hostile: 우리든 다른 라이벌이든 마주치면 덤빈다,
// thief: 보스 층에 숨어들어 약해진 보스를 가로챈다, friendly: 위기에 빠진 우리를 돕는다
G.D.RIVALS = [
  { id: 'lion', n: '붉은 사자단', col: '#ff6a4a', lead: 'paladin', crew: ['dragoon', 'cleric'], pace: 1.04, hostile: true, d: '돌격' },
  { id: 'arrow', n: '은빛 화살', col: '#8fd3ff', lead: 'archer', crew: ['mage', 'bard'], pace: 1.0, friendly: true, d: '우호' },
  { id: 'hand', n: '검은 손', col: '#c08cff', lead: 'rogue', crew: ['rogue', 'archmage'], pace: 0.98, hostile: true, thief: true, d: '보스 강탈' },
];


// 직업 기본 장비 (DESIGN.md 57 — SRD 5.2.1 직업 시작 장비): 용병마다 무기 · 갑옷 두 칸. 대장간에서 골드로 강화한다.
// 주문 직업의 무기 칸은 주문 초점(비전 초점 · 성표 · 드루이드 초점) — 강화하면 주문 명중 · 피해도 오른다. 방패(AC +2, G.Dnd 직업 규칙)는 손에 드는 것이라 무기 칸에 「무기 + 방패」로 — 마법 무기나 마법 방패 중 하나를 낀다(G.Guild.gearName). [이름, 영문, 아이콘]
G.D.GEAR = {
  barbarian: { w: ['그레이트액스', 'Greataxe', 'w_waraxe'], a: ['짐승 가죽', 'Hide Armor', 'u_armor'] },
  bard: { w: ['레이피어', 'Rapier', 'w_duel'], a: ['가죽 갑옷', 'Leather Armor', 'u_armor'] },
  cleric: { w: ['메이스', 'Mace', 'w_holymace'], a: ['체인 셔츠', 'Chain Shirt', 'u_armor'] },
  scout: { w: ['낫', 'Sickle', 'w_staff'], a: ['가죽 갑옷', 'Leather Armor', 'u_armor'] },
  dragoon: { w: ['파이크', 'Pike', 'w_spear'], a: ['체인 메일', 'Chain Mail', 'u_armor'] },
  monk: { w: ['쿼터스태프', 'Quarterstaff', 'w_staff'], a: ['방어의 팔찌', 'Bracers of Defense', 'd_shield'] },
  paladin: { w: ['워해머', 'Warhammer', 'w_hammer'], a: ['체인 메일', 'Chain Mail', 'u_armor'] },
  archer: { w: ['롱보우', 'Longbow', 'w_bow'], a: ['징 박은 가죽 갑옷', 'Studded Leather Armor', 'u_armor'] },
  rogue: { w: ['단검', 'Dagger', 'w_knife'], a: ['가죽 갑옷', 'Leather Armor', 'u_armor'] },
  mage: { w: ['비전 수정', 'Arcane Focus', 'w_gstaff'], a: ['로브', 'Robe', 'u_armor'] },
  warlock: { w: ['비전 구슬', 'Arcane Focus', 'w_arcstaff'], a: ['가죽 갑옷', 'Leather Armor', 'u_armor'] },
  archmage: { w: ['쿼터스태프', 'Quarterstaff', 'w_arcstaff'], a: ['로브', 'Robe', 'u_armor'] },
};

// 서사 은혜 (DESIGN.md 59 · SRD 5.2.1 「Epic Boon Feats」): Lv 19에 하나, 그 뒤 서사 단계 5마다 하나 더 (일곱까지).
// 각 은혜는 능력치 하나를 +1(최대 30) — 여기서는 주능력. pref = 먼저 고르는 직업
G.D.BOONS = {
  prowess: { n: '전투 기량의 은혜', en: 'Boon of Combat Prowess', t: 'b_atk', d: '빗나간 공격을 명중으로 (라운드 1번)', pref: ['dragoon', 'barbarian', 'paladin', 'monk'] },
  dimension: { n: '차원 여행의 은혜', en: 'Boon of Dimensional Travel', t: 'a_escape', d: '공격 뒤 6칸 순간 이동', pref: ['rogue', 'monk', 'scout'] },
  fate: { n: '운명의 은혜', en: 'Boon of Fate', t: 'ui_star', d: '실패한 내성에 2d4 (전투 1번)', pref: ['bard', 'cleric', 'paladin'] },
  irresistible: { n: '불가항력 공격의 은혜', en: 'Boon of Irresistible Offense', t: 'b_fury', d: '물리 저항 무시 · 20에 능력치만큼 피해', pref: ['rogue', 'archer', 'dragoon', 'barbarian'] },
  recall: { n: '주문 회상의 은혜', en: 'Boon of Spell Recall', t: 'fx_zap', d: '기술마다 전투당 +1번', pref: ['archmage', 'mage', 'warlock', 'cleric', 'scout'] },
  night: { n: '밤의 영혼의 은혜', en: 'Boon of the Night Spirit', t: 'v_warlock', d: '어둠에서 정신 · 광휘 외 피해 저항', pref: ['warlock', 'rogue', 'monk'] },
  truesight: { n: '진시안의 은혜', en: 'Boon of Truesight', t: 'u_scout', d: '어둠 · 투명을 꿰뚫어 봄', pref: ['archer', 'mage', 'archmage', 'bard'] },
};

// 길드 (DESIGN.md 60): 명성으로 짓는 시설 — 시즌을 넘어 남는 유일한 층. 비용 base × g^레벨
G.D.FAC = {
  hall: { n: '길드관', t: 'u_legend', max: 2, base: 15, g: 3, d: l => `명단 +${2 * l}` },
  tavern: { n: '선술집', t: 'u_bard', max: 5, base: 3, g: 2, d: l => `신입 Lv +${l} · 능력치 ${l + 1}번 굴려 좋은 쪽 · 후보 +${Math.floor(l / 2)}` },
  train: { n: '훈련장', t: 'w_board', max: 5, base: 3, g: 2, d: l => `경험치 +${l * 20}% · 대기 인원도 ${l * 10}%` },
  temple: { n: '신전', t: 'fx_holy', max: 5, base: 4, g: 2, d: l => `부상 시간 −${l * 12}% · 축복: 층 처음 ${l * 20}초 명중·내성 +2` },
  vault: { n: '금고', t: 'x_chest', max: 5, base: 4, g: 2.3, d: l => `시즌 시작 금고 ×${Math.pow(2, l)}` },
  archive: { n: '기록관', t: 'u_armor', max: 2, base: 10, g: 3.6, d: l => `시즌 넘김 레벨 유지 ${50 + 25 * l}%` },
  trade: { n: '상단', t: 'ui_gold', max: 10, base: 2, g: 1.5, d: l => `골드 +${l * 15}%` },
};

// 대기실 배치 (DESIGN.md 64): 쉬는 용병을 시설 자리에 앉힌다. 그 능력치 수정치가 효과를 키운다 (배율 p = 1 + 0.15 × 수정치, 최소 0.5)
// fac = 그 시설을 지어야 자리가 생긴다 (대장간은 처음부터)
G.D.JOBS = {
  smith: { n: '대장장이', t: 'w_hammer', ab: 'str', fac: null, d: p => `강화 비용 −${Math.round(8 * p)}%` },
  coach: { n: '교관', t: 'w_board', ab: 'wis', fac: 'train', d: p => `대기 인원 경험치 +${Math.round(10 * p)}%` },
  priest: { n: '사제', t: 'fx_holy', ab: 'wis', fac: 'temple', d: p => `부상 시간 −${Math.round(12 * p)}%` },
  merchant: { n: '상인', t: 'ui_gold', ab: 'cha', fac: 'trade', d: p => `골드 +${Math.round(8 * p)}%` },
};

// 기술 사거리 (칸). 표적은 시전자에게서 이 거리 안에 있어야 한다. 검사는 G.Skill.tick 한 곳에서 한다 (DESIGN.md 77)
// 새 기술은 여기에 꼭 넣는다 (test/flow_rules.js가 빠진 것을 잡는다). 범위 기술의 폭발 반경은 기술 쪽 값이다
G.D.SK_RANGE = {};
for (const [r, names] of Object.entries({
  // 자신 · 자기 주변
  0: 'rage intim second surge patient whole sacred guard tw wild fear misty cone',
  // 닿는 거리 (옆 칸)
  1.5: 'cure lay vtouch reckless brutal cleave topple push sap cstrike devious flurry stun quiver smite searing',
  // 중거리
  6: 'revive bless spike sof ensnare gbolt sflame turn sweapon preserve faerie mock whisper sleep shatter hypno pflame entangle landaid moon firebolt chroma sray eb hurl dark rof hold web haste slow wind cunning steady',
  // 장거리
  8: 'hword fireball hmark hex call ice lbolt chain mhw insp mm meteor',
})) for (const n of names.split(' ')) G.D.SK_RANGE['sr_' + n] = +r;

// 구간마다 나올 수 있는 몬스터 목록을 세력에서 만든다
{ const D = G.D.F; D.bands.forEach((b, i) => { const names = [...new Set(Object.values(D.factions).flatMap(x => x.by[i]))]; b.mons = names.map(n => ({ n, ...D.mon[n] })); }); }

// 몬스터 → SRD 5.2.1 능력치표 (js/srd_mons.js). 5.2.1에 오크 능력치는 없어 오크는 Tough · Tough Boss 표를 쓴다.
// spell = 그 표에 원거리 공격이 없는 시전자의 공격 [명중, 주사위 개수, 주사위, 더함, 종류] — 게임용 추가
G.D.F.STAT = {
  '꼬마 좀비': ['zombie'], '좀비': ['zombie'], '얼음 좀비': ['ogre-zombie'], '해골': ['skeleton'], '해골 궁수': ['skeleton'], '강령술사': ['mage'], '호박 망령': ['wraith', { spell: [6, 2, 8, 3, 'necrotic'] }],
  '고블린': ['goblin-warrior'], '고블린 궁수': ['goblin-warrior'], '고블린 주술사': ['priest-acolyte'],
  '오크 전사': ['tough'], '가면 오크': ['tough-boss'], '오크 궁수': ['tough'], '오크 주술사': ['priest-acolyte'], '오우거': ['ogre'], '트롤': ['troll'], '히드라': ['hydra'], '독사': ['venomous-snake'], '큰 개구리': ['giant-frog'], '악어': ['crocodile'], '왕뱀': ['giant-constrictor-snake'], '대왕 악어': ['giant-crocodile'], '황토 젤리': ['ochre-jelly'],
  '숲 늑대': ['wolf'], '워골': ['worg'], '동굴 곰': ['brown-bear'], '산적': ['bandit'], '산적 궁수': ['bandit'], '놀 전사': ['gnoll-warrior'], '놀 정찰병': ['gnoll-warrior'], '놀 주술사': ['priest-acolyte'],
  '늪 점액': ['gray-ooze'], '진흙 점액': ['black-pudding'], '작은 버섯': ['violet-fungus', { spell: [2, 1, 8, 0, 'poison'] }], '버섯 거인': ['shambling-mound', { spell: [7, 2, 8, 4, 'poison'] }], '고목 엔트': ['treant'],
  '임프': ['imp'], '초트': ['bone-devil', { spell: [7, 2, 8, 4, 'fire'] }], '대악마': ['balor'], '돌 골렘': ['stone-golem'],
  '늪의 군주': ['black-pudding'], '놀 감독관': ['bandit-captain'], '해골 기사': ['minotaur-skeleton'], '거대 좀비': ['ogre-zombie'], '숲의 수호자': ['dire-wolf'], '오우거 대장': ['ogre'], '심연의 초트': ['bone-devil'], '역병 거인': ['stone-golem'], '강령술사 군주': ['mage'], '미믹': ['mimic'], '황금 고블린': ['goblin-minion'],
};
G.D.SK_RANGE.sr_breath = 3;
