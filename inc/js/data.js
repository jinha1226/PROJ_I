'use strict';
// 게임 데이터: 세계 정보, 2D 맵(ASCII), 적·직업·포탑 등. 업그레이드는 trees.js의 스킬트리에 있다.
G.D = {};

G.D.WORLDS = [
  { id: 'fantasy', name: '끝없는 던전', genre: '판타지', style: '던전 전투형', icon: '🗡️', ref: 'Chef Knight · 무한던전피버 · Clicker Heroes',
    blurb: '기사와 동료들이 끝없는 던전을 내려간다.' },
];
G.D.WORLD = Object.fromEntries(G.D.WORLDS.map(w => [w.id, w]));

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
  // 동료: col 직업 색(카드·칩), 영웅 기본 공격력 대비 배율, 사거리(칸), 공격 간격(초)
  allies: {
    archer: { col: '#c8566a', n: '레인저', t: 'u_archer', wpn: 'w_bow', atk: 0.6, hp: 0.5, range: 5, cd: 1.0, proj: 'fx_arrow' },
    cleric: { col: '#e9dfbf', n: '수도사', t: 'u_cleric', wpn: 'w_holymace', atk: 0.2, hp: 0.6, range: 4, cd: 2.0, heal: 0.08, proj: 'fx_holy' },
    bard: { col: '#e0a040', n: '음유시인', t: 'u_bard', atk: 0.3, hp: 0.6, range: 4, cd: 1.5, proj: 'fx_ice', song: true },
    mage: { col: '#e2742e', n: '화염 마법사', t: 'u_mage', wpn: 'w_staff', atk: 1.4, hp: 0.5, range: 5, cd: 1.8, splash: 1.4, proj: 'fx_flame' },
    paladin: { col: '#8fc4ef', n: '성기사', t: 'u_paladin', wpn: 'w_hammer', atk: 0.8, hp: 1.6, range: 1.3, cd: 1.0 },
    dragoon: { col: '#6f8fe8', n: '용기병', t: 'u_dragoon', wpn: 'w_spear', atk: 3, hp: 1.2, range: 1.5, cd: 1.4 },
    archmage: { col: '#a98bf0', n: '대현자', t: 'u_archmage', wpn: 'w_arcstaff', atk: 2.5, hp: 0.7, range: 6, cd: 1.6, chain: 4, proj: 'fx_zap' },
    scout: { col: '#7fcf8a', n: '길잡이', t: 'u_scout', wpn: 'w_knife', atk: 0.7, hp: 0.8, range: 4, cd: 1.1, proj: 'fx_arrow', guide: true },
    rogue: { col: '#7d8794', n: '암살자', t: 'u_rogue', wpn: 'w_knife', atk: 2.5, hp: 0.8, range: 1.3, cd: 0.8 },
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
G.D.QUIRKS = {
  brave: { n: '용감', ic: '🔥', d: '공격 +15%', atk: 1.15, price: 1.3 },
  tough: { n: '튼튼함', ic: '🪨', d: '체력 +25%', hp: 1.25, price: 1.3 },
  swift: { n: '재빠름', ic: '💨', d: '공격 간격 -15%', cd: 0.85, price: 1.35 },
  hardy: { n: '회복력', ic: '✚', d: '부활·부상 ×0.5', revive: 0.5, price: 1.25 },
  keen: { n: '길눈', ic: '🧭', d: '시야 +1 · 직행 기준 -10%p', price: 1.25 },
  veteran: { n: '노련함', ic: '📜', d: '경험치 +50%', xp: 1.5, price: 1.2 },
  clutch: { n: '배수진', ic: '🩸', d: '체력 50% 아래 · 공격 +25%', w: 'low', dmg: 1.25, price: 1.2 },
  pioneer: { n: '개척자', ic: '🚩', d: '최고층 · 공격 +20%', w: 'front', dmg: 1.2, price: 1.25 },
  rivalry: { n: '승부욕', ic: '⚔', d: '라이벌에게 +20%', w: 'rival', dmg: 1.2, price: 1.15 },
  steady: { n: '침착', ic: '🛡', d: '받는 피해 -15%', taken: 0.85, price: 1.3 },
  quick: { n: '날쌘 발', ic: '👟', d: '이동 +10%', move: 0.1, price: 1.15 },
  lucky: { n: '행운', ic: '🍀', d: '골드 +10%', gold: 0.1, price: 1.3 },
  opener: { n: '기선', ic: '⚡', d: '층 처음 10초 · 공격 +30%', w: 'fresh', dmg: 1.3, price: 1.15 },
  bosshunt: { n: '보스 사냥꾼', ic: '👑', d: '보스에게 +25%', w: 'boss', dmg: 1.25, ev: 1, price: 1.3 },
  foe: { n: '천적', ic: '🎯', d: '그 라이벌단에게 +30%', w: 'foe', dmg: 1.3, ev: 1, price: 1.2 },
  clumsy: { n: '덜렁이', ic: '🌀', d: '공격 간격 +15%', cd: 1.15, price: 0.65, bad: true },
  frail: { n: '허약', ic: '🥀', d: '체력 -20%', hp: 0.8, price: 0.7, bad: true },
  dull: { n: '무딘 손', ic: '🪵', d: '공격 -12%', atk: 0.88, price: 0.7, bad: true },
  slowheal: { n: '더딘 회복', ic: '🩹', d: '부활·부상 ×1.6', revive: 1.6, price: 0.8, bad: true },
  slowwit: { n: '둔함', ic: '💤', d: '경험치 -40%', xp: 0.6, price: 0.85, bad: true },
  glass: { n: '유리턱', ic: '🥚', d: '받는 피해 +15%', taken: 1.15, price: 0.7, bad: true },
  klepto: { n: '도벽', ic: '🫳', d: '상자 골드 -30%', chest: 0.7, price: 0.85, bad: true },
  winded: { n: '지구력 부족', ic: '😮‍💨', d: '층 60초 뒤 · 공격 -15%', w: 'late', dmg: 0.85, price: 0.8, bad: true },
  dread: { n: '어둠 공포', ic: '🌑', d: '최고층 · 공격 -15%', w: 'front', dmg: 0.85, price: 0.8, bad: true },
  shy: { n: '라이벌 기피', ic: '🙈', d: '라이벌에게 -15%', w: 'rival', dmg: 0.85, price: 0.85, bad: true },
  sluggish: { n: '느림보', ic: '🐌', d: '이동 -10%', move: -0.1, price: 0.85, bad: true },
  giantfear: { n: '거인 공포', ic: '🗿', d: '보스에게 -20%', w: 'boss', dmg: 0.8, price: 0.8, bad: true },
  nightmare: { n: '악몽', ic: '👁', d: '체력 50% 아래 · 공격 -20%', w: 'low', dmg: 0.8, ev: 1, price: 0.8, bad: true },
  fear: { n: '공포', ic: '😱', d: '그 라이벌단에게 -25% · 받는 피해 +25%', w: 'foe', dmg: 0.75, taken: 1.25, ev: 1, price: 0.8, bad: true },
};
// 장신구 (DESIGN.md 45, Darkest Dungeon 장신구): 용병마다 2칸. 얻는 것과 잃는 것이 함께 — 1칸이면 최강 하나로 끝, 2칸이라 조합을 고민한다.
// 필드는 기벽과 같다(atk·hp·cd·revive·xp·heal 배율 · gold·move 더하기 · taken 받는 피해 · w+dmg 조건부). proc = 기본 공격에 확률로 상태이상(연계기의 방아쇠).
// up = 등급이 오르면 커지는 쪽(나머지는 그대로). r = 희귀도(1 흔함 · 2 드묾 · 3 귀함, 드롭 무게 4 · 2 · 1). heal만 = 치유 직업에게만 의미
G.D.TRINKETS = {
  tr_poison: { n: '독 바른 촉', ic: '🧪', d: '공격 15% 독 · 공격 -5%', proc: ['poison', 0.15], atk: 0.95, r: 1 },
  tr_ember: { n: '불씨 반지', ic: '💍', d: '공격 15% 화상 · 받는 피해 +5%', proc: ['burn', 0.15], taken: 1.05, r: 1 },
  tr_saw: { n: '톱니 날', ic: '🪚', d: '공격 15% 출혈 · 공격 간격 +5%', proc: ['bleed', 0.15], cd: 1.05, r: 1 },
  tr_spark: { n: '번개 구슬', ic: '🔮', d: '공격 10% 감전 · 체력 -10%', proc: ['shock', 0.1], hp: 0.9, r: 2 },
  tr_frost: { n: '서리 조각', ic: '❄', d: '공격 8% 정지 · 공격 -10%', proc: ['stop', 0.08], atk: 0.9, r: 2 },
  tr_brand: { n: '낙인 인장', ic: '🔖', d: '공격 10% 표식', proc: ['mark', 0.1], r: 2 },
  tr_weight: { n: '납 추', ic: '⚓', d: '공격 8% 기절 · 공격 간격 +10%', proc: ['stun', 0.08], cd: 1.1, r: 2 },
  tr_belt: { n: '거인의 허리띠', ic: '🎗', d: '체력 +30% · 이동 -10%', hp: 1.3, move: -0.1, up: 'hp', r: 1 },
  tr_berserk: { n: '광전사 목걸이', ic: '📿', d: '공격 +25% · 받는 피해 +15%', atk: 1.25, taken: 1.15, up: 'atk', r: 2 },
  tr_ward: { n: '수호 부적', ic: '🧿', d: '받는 피해 -15% · 공격 -10%', taken: 0.85, atk: 0.9, up: 'taken', r: 1 },
  tr_feather: { n: '바람 깃털', ic: '🪶', d: '공격 간격 -15% · 체력 -10%', cd: 0.85, hp: 0.9, up: 'cd', r: 2 },
  tr_dice: { n: '황금 주사위', ic: '🎲', d: '골드 +15% · 받는 피해 +10%', gold: 0.15, taken: 1.1, up: 'gold', r: 2 },
  tr_lens: { n: '학자의 안경', ic: '👓', d: '경험치 +40%', xp: 1.4, up: 'xp', r: 1 },
  tr_vial: { n: '성수병', ic: '⚱', d: '치유 +30%', heal: 1.3, up: 'heal', only: 'heal', r: 1 },
  tr_pact: { n: '피의 계약', ic: '🩸', d: '체력 50% 아래 · 공격 +35% · 체력 -10%', w: 'low', dmg: 1.35, hp: 0.9, up: 'dmg', r: 2 },
  tr_trophy: { n: '사냥 표', ic: '🦴', d: '보스에게 +25%', w: 'boss', dmg: 1.25, up: 'dmg', r: 2 },
  tr_badge: { n: '결투 휘장', ic: '🎖', d: '라이벌에게 +30%', w: 'rival', dmg: 1.3, up: 'dmg', r: 3 },
  tr_crown: { n: '용병왕의 관', ic: '👑', d: '공격 +15% · 체력 +15%', atk: 1.15, hp: 1.15, up: 'atk', r: 3 },
};
// 성격 (DESIGN.md 42): 축 셋(용기 · 욕심 · 싸움)에 둘씩. 한 사람은 0~2개, 같은 축에서는 하나만. ic = 머리 위 기호(ni_<ic>)
G.D.PERSONA = {
  hot: { n: '다혈질', ax: 'nerve', ic: 'pe_hot', d: '먼저 돌진 · 첫 타 ×1.5' },
  coward: { n: '겁쟁이', ax: 'nerve', ic: 'pe_coward', d: '체력 30% · 3초 후퇴' },
  greedy: { n: '욕심쟁이', ax: 'greed', ic: 'pe_greedy', d: '귀환 기준 -10%p' },
  careful: { n: '신중', ax: 'greed', ic: 'pe_careful', d: '귀환 기준 +10%p' },
  brawler: { n: '싸움꾼', ax: 'fight', ic: 'pe_brawler', d: '맞서기 라이벌에게 먼저 덤빔' },
  meek: { n: '온순', ax: 'fight', ic: 'pe_meek', d: '라이벌전 빠짐 · 노려지지 않음' },
};
// 개인 스킬 (DESIGN.md 43): 직업마다 일곱, 고용할 때 그중 넷이 정해진다(Lv 1에 둘 · Lv 3에 셋 · Lv 5에 넷). 전부 자동 시전.
// 스킬 쿨다운은 cool(초) — cd는 G.Guild.mult가 읽는 공격 간격 배율이라 이름을 나눴다. 효과 코드는 js/skills.js, 상태이상을 받아치는 연계기는 js/combo.js.
// 패시브(아래 「패시브」)는 이제 상위 직업의 전직 스킬(sig)로만 얻는다.
G.D.MSKILLS = {
  // 레인저 — 멀리서 갉는 사수 (독 · 기절)
  sk_aimed: { n: '조준 사격', t: 'fx_arrow', d: '최강 적 ×8', cool: 15 }, sk_volley: { n: '화살비', t: 'w_bow', d: '3초 연사', cool: 20 },
  sk_bind: { n: '속박 사격', t: 'fx_arrow', d: '최강 적 ×3 · 기절 2초', cool: 14 }, sk_toxcloud: { n: '독구름 화살', t: 'r_stew', d: '범위 독', cool: 18 },
  sk_pierce: { n: '관통 화살', t: 'fx_arrow', d: '일직선 ×3', cool: 12 }, sk_weak: { n: '급소 사격', t: 'fx_arrow', d: '기절 · 정지 적 ×5', cool: 8 },
  sk_kite: { n: '후퇴 사격', t: 'a_escape', d: '밀치고 물러남 ×2', cool: 10 },
  // 수도사 — 살리고 심판한다 (표식)
  sk_heal: { n: '치유의 빛', t: 'fx_holy', d: '파티 체력 +50%', cool: 30 }, sk_bless: { n: '축복', t: 'b_regen', d: '재생 +4% 10초', cool: 25 },
  sk_aegis: { n: '신성 방벽', t: 'd_shield', d: '가장 약한 동료 4초 무적', cool: 25 }, sk_raise: { n: '소생', t: 'u_god', d: '쓰러진 동료 50%로', cool: 40 },
  sk_judge: { n: '심판의 빛', t: 'fx_holy', d: '보이는 적 표식 6초', cool: 20 }, sk_hammer: { n: '성광 망치', t: 'w_holymace', d: '×4 · 표식', cool: 10 },
  sk_halo: { n: '신성 고리', t: 'q_peak', d: '주변 ×2 · 동료 +10%', cool: 14 },
  // 음유시인 — 노래로 판을 바꾼다 (기절 · 감전 · 표식)
  sk_rhap: { n: '광시곡', t: 'b_atk', d: '노래 전부 10초', cool: 30 }, sk_hymn: { n: '진군가', t: 'st_haste', d: '공속 ×1.5 6초', cool: 25 },
  sk_ward: { n: '수호의 노래', t: 'd_shield', d: '받는 피해 -30% 8초', cool: 25 }, sk_luck: { n: '행운의 노래', t: 'b_gold', d: '골드 ×2 10초', cool: 30 },
  sk_lull: { n: '자장가', t: 'fx_song', d: '주변 기절 3초', cool: 16 }, sk_disc: { n: '불협화음', t: 'fx_zap', d: '보이는 적 감전 4초', cool: 18 },
  sk_mock: { n: '조롱', t: 'b_fury', d: '최강 적 표식 6초', cool: 12 },
  // 화염 마법사 — 불바다 (화상)
  sk_meteor: { n: '유성 낙하', t: 'fx_fire', d: '범위 ×30', cool: 25 }, sk_nova: { n: '화염 고리', t: 'fx_flame', d: '주변 ×6', cool: 14 },
  sk_fireball: { n: '화염구', t: 'fx_fire', d: '범위 ×4 · 화상', cool: 10 }, sk_pillar: { n: '불기둥', t: 'fx_flame', d: '최강 적 강한 화상 6초', cool: 16 },
  sk_firewall: { n: '화염 장벽', t: 'fx_flame', d: '불길 5초', cool: 22 }, sk_heatwave: { n: '열파', t: 'fx_fire', d: '밀치고 화상', cool: 12 },
  sk_ignite: { n: '점화', t: 'r_dragon', d: '남은 화상이 한 번에', cool: 14 },
  // 성기사 — 대신 맞는다 (기절)
  sk_wall: { n: '성벽', t: 'u_armor', d: '받는 피해 -50% 8초', cool: 30 }, sk_smash: { n: '방패 강타', t: 'd_shield', d: '×5 · 기절 2초', cool: 12 },
  sk_oath: { n: '수호 맹세', t: 'u_armor', d: '약한 동료 대신 맞기 6초', cool: 25 }, sk_shout: { n: '도발의 함성', t: 'b_fury', d: '6초 나를 노림 · 피해 -30%', cool: 18 },
  sk_slam: { n: '내려찍기', t: 'w_hammer', d: '주변 ×2 · 기절 1.5초', cool: 12 }, sk_retri: { n: '응보', t: 'd_shield', d: '5초 받은 피해 반사', cool: 20 },
  sk_bastion: { n: '최후의 보루', t: 'u_god', d: '체력 30% 아래 4초 무적', cool: 60 },
  // 용기병 — 뚫고 들어간다 (출혈)
  sk_leap: { n: '용의 도약', t: 'w_spear', d: '최강 적 ×10', cool: 20 }, sk_spin: { n: '회전 베기', t: 'w_spear', d: '주변 ×4', cool: 12 },
  sk_lance: { n: '꿰뚫기', t: 'w_spear', d: '일직선 ×4 · 출혈', cool: 12 }, sk_rend: { n: '찢어발기기', t: 'w_cleaver', d: '×3 · 강한 출혈', cool: 10 },
  sk_charge: { n: '돌격', t: 'a_escape', d: '먼 적까지 돌진 · 길목 ×2', cool: 16 }, sk_fury: { n: '용의 분노', t: 'r_dragon', d: '6초 공격 간격 ×0.5', cool: 25 },
  sk_doom: { n: '처단', t: 'w_waraxe', d: '출혈 적 ×5', cool: 10 },
  // 대현자 — 번개와 시간 (감전 · 정지)
  sk_tstorm: { n: '뇌우', t: 'a_thunder', d: '5초 낙뢰', cool: 40 }, sk_freeze: { n: '시간 정지', t: 'a_seal', d: '보이는 적 정지 3초', cool: 35 },
  sk_chainl: { n: '연쇄 번개', t: 'fx_zap', d: '연쇄 10 ×3 · 감전', cool: 14 }, sk_jolt: { n: '전격', t: 'a_thunder', d: '최강 적 ×4 · 감전 4초', cool: 10 },
  sk_slowf: { n: '감속장', t: 'st_haste', d: '범위 감전 5초', cool: 18 }, sk_rewind: { n: '되감기', t: 'a_seal', d: '파티 체력을 5초 전으로', cool: 45 },
  sk_blink: { n: '점멸', t: 'a_escape', d: '위험하면 뒤로 순간 이동', cool: 12 },
  // 암살자 — 하나를 확실히 (독 · 출혈 · 표식)
  sk_shadow: { n: '그림자 처형', t: 'w_knife', d: '30% 이하 처형', cool: 25 }, sk_fan: { n: '단검 투척', t: 'w_knife', d: '5명 ×2', cool: 10 },
  sk_smoke: { n: '연막탄', t: 'a_seal', d: '주변 기절 2초 · 다음 타 ×3', cool: 16 }, sk_venom: { n: '독 바르기', t: 'r_stew', d: '8초 타격마다 독', cool: 20 },
  sk_vital: { n: '급소 찌르기', t: 'g_dagger', d: '×6 · 표식', cool: 10 }, sk_bleedcut: { n: '출혈 베기', t: 'w_knife', d: '×2 · 출혈', cool: 8 },
  sk_step: { n: '그림자 걸음', t: 'a_escape', d: '약한 적 뒤로 ×3', cool: 12 },
  // 길잡이 — 길과 덫 (출혈 · 기절 · 정지 · 표식)
  sk_scan: { n: '정찰', t: 'a_seal', d: '반경 14칸 지도', cool: 30 }, sk_path: { n: '지름길', t: 'f_stairs', d: '계단 위치 · 이동 +50% 8초', cool: 40 },
  sk_sense: { n: '보물 감지', t: 'x_chest', d: '상자 위치 · 골드 ×2 8초', cool: 30 }, sk_trap: { n: '덫 놓기', t: 'w_board', d: '밟으면 기절 3초 · 출혈', cool: 14 },
  sk_net: { n: '투척 그물', t: 'a_seal', d: '최강 적 정지 3초', cool: 16 }, sk_saw: { n: '톱니 화살', t: 'fx_arrow', d: '×2 · 출혈', cool: 8 },
  sk_hunt: { n: '사냥 표식', t: 'b_fury', d: '최강 적 표식 8초', cool: 14 },
  // 패시브 (행동)
  r_pierce: { n: '관통', t: 'fx_arrow', d: '4발째 관통 2' }, r_poison: { n: '독화살', t: 'r_stew', d: '독 30% 4초' }, r_snipe: { n: '저격', t: 'fx_arrow', d: '12초마다 ×8' },
  b_encore: { n: '앙코르', t: 'fx_song', d: '노래 +50%' }, songWar: { n: '전쟁의 북', t: 'b_fury', d: '노래 추가 · 피해 ×3' }, songRegen: { n: '회복의 노래', t: 'b_regen', d: '노래 추가 · 재생 +4%' }, b_rally: { n: '응원', t: 'b_atk', d: '파티 피해 +10%' },
  c_mass: { n: '은총', t: 'fx_holy', d: '5번째 치유 전체' }, c_revive: { n: '부활 기도', t: 'u_god', d: '부활 ×0.5' }, c_sanct: { n: '성역', t: 'q_peak', d: '오염 ×0.5' },
  m_burn: { n: '화상', t: 'fx_fire', d: '화상 25% 3초' }, m_storm: { n: '화염 폭풍', t: 'fx_flame', d: '유성 자리 불길' }, m_quick: { n: '빠른 영창', t: 'st_haste', d: '공격·유성 ×0.7' },
  p_guard: { n: '방패 막기', t: 'd_shield', d: '받는 피해 -30%', v: 0.3 }, p_taunt: { n: '도발', t: 'u_armor', d: '먼저 노려진다' }, p_counter: { n: '반격', t: 'd_shield', d: '받은 피해 50% 반사' },
  d_dash: { n: '돌진', t: 'w_spear', d: '돌진 첫 타 ×3' }, d_exec: { n: '처형', t: 'w_spear', d: '25% 이하 즉사' }, d_breath: { n: '용의 숨결', t: 'fx_fire', d: '곁의 적 60%' },
  a_overload: { n: '과부하', t: 'fx_zap', d: '연쇄 +2 · 감쇠 없음' }, a_warp: { n: '시간 왜곡', t: 'st_haste', d: '15초마다 공속 ×1.5' }, a_stop: { n: '정지 결계', t: 'a_seal', d: '30초마다 정지 4초' },
  ro_twin: { n: '쌍검', t: 'w_knife', d: '한 번 더 60%' }, ro_mark: { n: '표식', t: 'ui_gold', d: '받는 피해 +25% 4초' }, ro_steal: { n: '소매치기', t: 'ui_gold', d: '타격마다 골드', v: 0.05 },
  s_eye: { n: '매의 눈', t: 'a_seal', d: '시야 +1 · 직행 기준 -10%p', sight: 1 }, s_loot: { n: '보물 사냥', t: 'x_chest', d: '보물 골드 +50%' }, s_first: { n: '선제', t: 'w_knife', d: '온전한 적 ×1.5' },
  // 패시브 (수치)
  r_quick: { n: '속사', t: 'st_haste', d: '공격 간격 -20%', cd: 0.8 }, c_power: { n: '신성', t: 'fx_holy', d: '치유 +50%', heal: 1.5 }, m_big: { n: '폭발 확장', t: 'fx_fire', d: '범위 +0.6칸', splash: 0.6 },
  p_tough: { n: '강철', t: 'u_armor', d: '체력 +30%', hp: 1.3 }, d_fury: { n: '투지', t: 'b_fury', d: '공격 +20%', atk: 1.2 }, a_wis: { n: '지혜', t: 'u_god', d: '공격 +20%', atk: 1.2 },
  ro_quick: { n: '날렵함', t: 'st_haste', d: '공격 간격 -20%', cd: 0.8 }, s_swift: { n: '강행', t: 'st_haste', d: '파티 이동 +10%', move: 0.1 },
};
G.D.MPOOL = {
  archer: ['sk_aimed', 'sk_volley', 'sk_bind', 'sk_toxcloud', 'sk_pierce', 'sk_weak', 'sk_kite'],
  cleric: ['sk_heal', 'sk_bless', 'sk_aegis', 'sk_raise', 'sk_judge', 'sk_hammer', 'sk_halo'],
  bard: ['sk_rhap', 'sk_hymn', 'sk_ward', 'sk_luck', 'sk_lull', 'sk_disc', 'sk_mock'],
  mage: ['sk_meteor', 'sk_nova', 'sk_fireball', 'sk_pillar', 'sk_firewall', 'sk_heatwave', 'sk_ignite'],
  paladin: ['sk_wall', 'sk_smash', 'sk_oath', 'sk_shout', 'sk_slam', 'sk_retri', 'sk_bastion'],
  dragoon: ['sk_leap', 'sk_spin', 'sk_lance', 'sk_rend', 'sk_charge', 'sk_fury', 'sk_doom'],
  archmage: ['sk_tstorm', 'sk_freeze', 'sk_chainl', 'sk_jolt', 'sk_slowf', 'sk_rewind', 'sk_blink'],
  rogue: ['sk_shadow', 'sk_fan', 'sk_smoke', 'sk_venom', 'sk_vital', 'sk_bleedcut', 'sk_step'],
  scout: ['sk_scan', 'sk_path', 'sk_sense', 'sk_trap', 'sk_net', 'sk_saw', 'sk_hunt'],
};

// 상위 직업 (DESIGN.md 40): Lv 10에 직업마다 둘 중 하나로 전직. 그림(t)·색이 바뀌고 수치 배율(atk·hp·cd·heal)과 몸 수치(def: 사거리·범위·연쇄·치유)를 덮어쓴다.
// sig = 전직하면 얻는 스킬 (다른 직업 풀의 패시브도 가져온다 — 전투 코드는 직업과 상관없이 키로 읽는다).
G.D.ADV = {
  sniper: { base: 'archer', n: '저격수', t: 'v_sniper', col: '#e6c06a', atk: 1.5, cd: 1.25, def: { range: 8 }, sig: ['r_snipe', 'r_pierce'] },
  hunter: { base: 'archer', n: '사냥꾼', t: 'v_hunter', col: '#7fbf5a', cd: 0.75, sig: ['r_poison', 's_first'] },
  priest: { base: 'cleric', n: '사제', t: 'v_priest', col: '#fff3c4', heal: 1.6, hp: 1.2, sig: ['c_mass', 'c_revive'] },
  inquis: { base: 'cleric', n: '심판관', t: 'v_inquis', col: '#d9a441', atk: 6, def: { heal: 0, range: 4 }, sig: ['d_exec', 'ro_mark'] },
  maestro: { base: 'bard', n: '음유대가', t: 'v_maestro', col: '#f0c060', sig: ['b_encore', 'songWar', 'songRegen'] },
  dancer: { base: 'bard', n: '무희', t: 'v_dancer', col: '#ef7fb0', atk: 4, cd: 0.6, hp: 1.3, def: { range: 1.3, proj: null }, sig: ['ro_twin', 'b_rally'] },
  arch: { base: 'mage', n: '대마법사', t: 'v_arch', col: '#ff9a4a', atk: 1.3, def: { splash: 2.2 }, sig: ['m_big', 'm_storm'] },
  warlock: { base: 'mage', n: '흑마법사', t: 'v_warlock', col: '#9a5ad0', atk: 2.2, def: { splash: 0, proj: 'fx_zap' }, sig: ['m_burn', 'r_poison'] },
  guard: { base: 'paladin', n: '수호기사', t: 'v_guard', col: '#a8c8e8', hp: 1.6, sig: ['p_guard', 'p_taunt'] },
  crusader: { base: 'paladin', n: '성전사', t: 'v_crusader', col: '#e8d070', atk: 1.7, sig: ['p_counter', 'd_breath'] },
  dknight: { base: 'dragoon', n: '용기사', t: 'v_dknight', col: '#5ac0a0', hp: 1.4, atk: 1.2, sig: ['d_dash', 'd_breath'] },
  berserk: { base: 'dragoon', n: '광전사', t: 'v_berserk', col: '#d04a3a', atk: 1.5, cd: 0.7, hp: 0.85, sig: ['d_exec', 'ro_twin'] },
  chrono: { base: 'archmage', n: '시간술사', t: 'v_chrono', col: '#c9a6ff', sig: ['a_warp', 'a_stop'] },
  thunder: { base: 'archmage', n: '뇌신', t: 'v_thunder', col: '#8fd8ff', atk: 1.3, def: { chain: 7 }, sig: ['a_overload'] },
  shade: { base: 'rogue', n: '그림자', t: 'v_shade', col: '#6a5a8a', atk: 1.4, sig: ['ro_mark', 's_first'] },
  thiefk: { base: 'rogue', n: '도적왕', t: 'v_thiefk', col: '#e0b040', cd: 0.8, sig: ['ro_steal', 's_loot'] },
  explorer: { base: 'scout', n: '탐험가', t: 'v_explorer', col: '#a0d070', hp: 1.3, sig: ['s_eye', 's_swift'] },
  tracker: { base: 'scout', n: '추적자', t: 'v_tracker', col: '#c08a5a', atk: 1.6, def: { range: 5 }, sig: ['r_snipe', 's_first'] },
};

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

// ───────── 유물 (가차) ─────────
// eff 키: f_atk f_gold f_hp ess all
G.D.RARITY = {
  common: { n: '일반', p: 0.6, col: '#9aa4ad' },
  rare: { n: '희귀', p: 0.28, col: '#4fa3ff' },
  epic: { n: '영웅', p: 0.1, col: '#c06bff' },
  legend: { n: '전설', p: 0.02, col: '#ffb547' },
};
G.D.RELICS = [
  { id: 'dagger', n: '녹슨 단검', e: '🗡️', r: 'common', w: 'fantasy', eff: 'f_atk', v: 0.1, d: '던전 피해' },
  { id: 'herb', n: '마른 약초', e: '🌿', r: 'common', w: 'fantasy', eff: 'f_hp', v: 0.15, d: '던전 최대 체력' },
  { id: 'string', n: '엘프의 활시위', e: '🎯', r: 'rare', w: 'fantasy', eff: 'f_gold', v: 0.2, d: '던전 골드' },
  { id: 'heart', n: '용의 심장', e: '❤️‍🔥', r: 'epic', w: 'fantasy', eff: 'f_atk', v: 0.4, d: '던전 피해' },
  { id: 'key', n: '차원의 열쇠', e: '🗝️', r: 'legend', w: 'all', eff: 'ess', v: 0.25, d: '모든 정수 획득' },
  { id: 'flute', n: '아자토스의 피리', e: '🪈', r: 'legend', w: 'all', eff: 'all', v: 0.3, d: '모든 생산' },
];

G.D.SUMMON_COST = 10;
G.D.PITY = 40;
G.D.PRESTIGE_MIN = 3000;
