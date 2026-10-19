'use strict';
// 게임 데이터 정의

G.SKILLS = {
  fighting: '격투', blades: '도검', maces: '둔기', axes: '도끼', bows: '활', magic: '마법', armour: '방어구', dodging: '회피',
  construction: '건설', mining: '채굴', plants: '재배', cooking: '요리', crafting: '제작', research: '연구',
};
G.COMBAT_SKILLS = ['fighting', 'blades', 'maces', 'axes', 'bows', 'magic', 'armour', 'dodging'];
G.WORK_SKILLS = ['construction', 'mining', 'plants', 'cooking', 'crafting', 'research'];

G.WORK = ['cook', 'build', 'farm', 'mine', 'chop', 'craft', 'haul', 'research'];
G.WORK_NAMES = { build: '건설', mine: '채굴', chop: '벌목', farm: '농사', cook: '요리', craft: '제작', research: '연구', haul: '운반' };
G.WORK_SKILL = { build: 'construction', mine: 'mining', chop: 'plants', farm: 'plants', cook: 'cooking', craft: 'crafting', research: 'research', haul: null };

G.RACES = {
  human: { n: '인간', str: 0, dex: 0, int: 0, hp: 1, learn: 1.15, desc: '기술 습득 +15%' },
  dwarf: { n: '드워프', str: 2, dex: -1, int: -1, hp: 1.15, sk: { mining: 2, crafting: 1 }, desc: 'HP +15%, 채굴·제작 재능' },
  elf: { n: '엘프', str: -2, dex: 2, int: 2, hp: 0.9, sk: { bows: 2, magic: 1 }, desc: '활·마법 재능, HP -10%' },
  orc: { n: '오크', str: 3, dex: 0, int: -2, hp: 1.1, sk: { fighting: 1, axes: 1 }, desc: '힘 +3, HP +10%' },
  halfling: { n: '하플링', str: -3, dex: 3, int: 0, hp: 0.85, food: 0.7, stealth: 4, sk: { dodging: 1 }, desc: '은신 +, 배고픔 -30%' },
};

G.BGS = {
  farmer: { n: '농부', sk: { plants: 4, cooking: 1 }, gear: [] },
  smith: { n: '대장장이', sk: { crafting: 4, maces: 2 }, gear: ['club'] },
  soldier: { n: '병사', sk: { fighting: 3, blades: 3, armour: 2 }, gear: ['short_sword', 'leather_armor'] },
  hunter: { n: '사냥꾼', sk: { bows: 4, dodging: 2, plants: 1 }, gear: ['shortbow'] },
  scholar: { n: '학자', sk: { research: 4, magic: 3 }, spells: ['magic_dart'], gear: ['robe'] },
  priest: { n: '사제', sk: { magic: 2, research: 1, maces: 1 }, spells: ['heal_other'], gear: ['staff'] },
  miner: { n: '광부', sk: { mining: 4, axes: 2 }, gear: ['hand_axe'] },
  cook: { n: '요리사', sk: { cooking: 4, plants: 1, blades: 1 }, gear: ['dagger'] },
  carpenter: { n: '목수', sk: { construction: 4, crafting: 1 }, gear: [] },
  mercenary: { n: '용병', sk: { fighting: 2, axes: 3, armour: 1 }, gear: ['hand_axe', 'buckler'] },
};

G.TRAITS = {
  tough: { n: '강인함', d: '최대 HP +20%', good: 1 },
  nimble: { n: '날렵함', d: '회피 +3', good: 1 },
  industrious: { n: '근면함', d: '작업 속도 +25%', good: 1, x: 'lazy' },
  lazy: { n: '게으름', d: '작업 속도 -25%', x: 'industrious' },
  glutton: { n: '대식가', d: '배고픔 +50%', x: 'light_eater' },
  light_eater: { n: '소식가', d: '배고픔 -30%', good: 1, x: 'glutton' },
  coward: { n: '겁쟁이', d: '습격 때 도망침, 회피 +2', x: 'brave' },
  brave: { n: '용감함', d: '명중 +2, 동료의 죽음에 덜 흔들림', good: 1, x: 'coward' },
  optimist: { n: '낙천가', d: '기분 +10', good: 1, x: 'pessimist' },
  pessimist: { n: '비관론자', d: '기분 -10', x: 'optimist' },
  quick: { n: '재빠름', d: '이동 속도 +20%', good: 1 },
  genius: { n: '천재', d: '기술 습득 +40%', good: 1, x: 'dull' },
  dull: { n: '둔재', d: '기술 습득 -30%', x: 'genius' },
};

G.NAMES = ['에린', '카일', '미라', '도윤', '하람', '세라', '루크', '아린', '바엘', '노아', '토린', '리아', '가렌', '유나', '오웬', '시엘',
  '브람', '테아', '단', '이브', '로완', '헤일', '마커스', '솔', '케이', '나래', '보리', '라온', '그웬', '피오', '잭', '엘라', '하론', '모건',
  '라일라', '덱스', '이든', '자라', '벨라', '고든', '실바', '레나', '울프', '아샤', '키라', '퀸', '타오', '윤슬', '바람', '한결'];

G.RES = {
  wood: { n: '목재', g: '=', c: '#c08a50', w: 1 },
  stone: { n: '석재', g: '•', c: '#a8a8a8', w: 1 },
  food: { n: '식재료', g: '%', c: '#d8c070', w: 1, eat: 30, raw: true },
  meal: { n: '식사', g: '%', c: '#f0a040', w: 1, eat: 70 },
  fine_meal: { n: '고급 식사', g: '%', c: '#ffd060', w: 1, eat: 85, fine: true },
  ration: { n: '휴대식량', g: '%', c: '#c0a080', w: 1, eat: 55, travel: true },
  hearty_ration: { n: '든든한 휴대식량', g: '%', c: '#e8b080', w: 1, eat: 80, travel: true },
  herb: { n: '약초', g: 'ψ', c: '#7fe07f', w: 0.5 },
  iron_ore: { n: '철광석', g: '*', c: '#d08850', w: 1 },
  iron: { n: '철괴', g: '≡', c: '#c0c8d0', w: 1 },
  hide: { n: '가죽', g: '~', c: '#b07850', w: 1 },
  bone: { n: '뼈', g: '/', c: '#e8e0c8', w: 1 },
  crystal: { n: '수정 조각', g: '♦', c: '#60e0ff', w: 0.5 },
  essence: { n: '마력 정수', g: '°', c: '#d080ff', w: 0.5 },
  relic: { n: '고대 유물', g: '¤', c: '#ffd700', w: 2, d: '정착지로 가져오면 연구 점수 150' },
  potion_heal: { n: '치유 물약', g: '!', c: '#ff5050', w: 0.5, use: 'heal', d: 'HP를 크게 회복' },
  potion_might: { n: '괴력 물약', g: '!', c: '#ff9030', w: 0.5, use: 'might', d: '20턴간 피해 +30%, 명중 +3' },
  potion_haste: { n: '신속 물약', g: '!', c: '#50c0ff', w: 0.5, use: 'haste', d: '15턴간 행동 속도 증가' },
  scroll_blink: { n: '점멸 두루마리', g: '?', c: '#c0c0ff', w: 0.3, use: 'blink', d: '근처 안전한 곳으로 순간이동' },
  scroll_mapping: { n: '지도 두루마리', g: '?', c: '#c0ffc0', w: 0.3, use: 'mapping', d: '이번 층의 지형을 밝힌다' },
  scroll_return: { n: '귀환 두루마리', g: '?', c: '#ffffa0', w: 0.3, use: 'return', d: '파티 전원 정착지로 귀환' },
  book_dart: { n: '마법 화살 교본', g: '+', c: '#d0d0ff', w: 1, use: 'learn', spell: 'magic_dart' },
  book_fire: { n: '화염 마법서', g: '+', c: '#ff6030', w: 1, use: 'learn', spell: 'fire_bolt' },
  book_heal: { n: '치유 마법서', g: '+', c: '#80ff80', w: 1, use: 'learn', spell: 'heal_other' },
  book_blink: { n: '점멸 마법서', g: '+', c: '#a0a0ff', w: 1, use: 'learn', spell: 'blink' },
  book_slow: { n: '감속 마법서', g: '+', c: '#c0c060', w: 1, use: 'learn', spell: 'slow' },
};

G.GEAR = {
  dagger: { n: '단검', skill: 'blades', dmg: 4, delay: 9, w: 1 },
  short_sword: { n: '숏소드', skill: 'blades', dmg: 6, delay: 11, w: 2 },
  long_sword: { n: '롱소드', skill: 'blades', dmg: 9, delay: 13, w: 3 },
  club: { n: '몽둥이', skill: 'maces', dmg: 5, delay: 12, w: 2 },
  mace: { n: '철퇴', skill: 'maces', dmg: 8, delay: 13, w: 3 },
  war_hammer: { n: '워해머', skill: 'maces', dmg: 14, delay: 16, w: 5, two: true },
  hand_axe: { n: '손도끼', skill: 'axes', dmg: 7, delay: 12, w: 2 },
  battle_axe: { n: '전투도끼', skill: 'axes', dmg: 14, delay: 16, w: 5, two: true },
  staff: { n: '지팡이', skill: 'maces', dmg: 4, delay: 11, w: 2, two: true, spell: 3 },
  shortbow: { n: '숏보우', skill: 'bows', dmg: 6, delay: 12, w: 2, two: true, ranged: true, range: 7 },
  longbow: { n: '롱보우', skill: 'bows', dmg: 10, delay: 14, w: 3, two: true, ranged: true, range: 8 },
  robe: { n: '로브', slot: 'armor', ac: 1, evp: 0, w: 1, mp: 3 },
  leather_armor: { n: '가죽 갑옷', slot: 'armor', ac: 3, evp: 1, w: 3 },
  chain_mail: { n: '사슬 갑옷', slot: 'armor', ac: 6, evp: 4, w: 6 },
  plate_armor: { n: '판금 갑옷', slot: 'armor', ac: 10, evp: 8, w: 9 },
  buckler: { n: '버클러', slot: 'shield', ac: 2, evp: 0, w: 1 },
  kite_shield: { n: '카이트 실드', slot: 'shield', ac: 4, evp: 2, w: 3 },
  backpack: { n: '배낭', slot: 'pack', cap: 12, w: 0 },
};
for (const k in G.GEAR) if (!G.GEAR[k].slot) G.GEAR[k].slot = 'weapon';
G.SLOTS = { weapon: '무기', shield: '방패', armor: '갑옷', pack: '배낭' };

G.EGO = {
  flaming: { n: '화염', weapon: true },
  freezing: { n: '냉기', weapon: true },
  venom: { n: '맹독', weapon: true },
  protection: { n: '보호', armor: true },
};

// 몬스터. d=[최소층, 최대층], w=출현 가중치, lv=위협 판정용 레벨
G.MON = {
  rat: { n: '쥐', g: 'r', c: '#b09070', hp: 5, ac: 0, ev: 4, acc: 5, dmg: 3, spd: 10, xp: 1, lv: 1, d: [1, 3], w: 10, drops: { hide: 0.25 } },
  jackal: { n: '자칼', g: 'j', c: '#d0a860', hp: 7, ac: 0, ev: 6, acc: 6, dmg: 3, spd: 8, xp: 1, lv: 1, d: [1, 4], w: 8, pack: [2, 4], drops: { hide: 0.3 } },
  kobold: { n: '코볼트', g: 'k', c: '#c08060', hp: 9, ac: 1, ev: 5, acc: 7, dmg: 4, spd: 10, xp: 2, lv: 2, d: [1, 4], w: 9, drops: { iron_ore: 0.3 } },
  goblin: { n: '고블린', g: 'g', c: '#90c060', hp: 11, ac: 1, ev: 6, acc: 8, dmg: 5, spd: 10, xp: 3, lv: 2, d: [1, 5], w: 10, gear: 0.12 },
  bat: { n: '큰박쥐', g: 'b', c: '#b090b0', hp: 7, ac: 1, ev: 12, acc: 8, dmg: 3, spd: 6, xp: 2, lv: 2, d: [2, 5], w: 6, erratic: true },
  acid_blob: { n: '산성 점액', g: 'J', c: '#a0ff40', hp: 20, ac: 0, ev: 2, acc: 10, dmg: 5, spd: 14, xp: 6, lv: 4, d: [3, 7], w: 6, acid: true, drops: { essence: 0.25 }, desc: '맞으면 갑옷이 부식된다' },
  orc: { n: '오크', g: 'o', c: '#e06040', hp: 20, ac: 2, ev: 6, acc: 11, dmg: 8, spd: 10, xp: 6, lv: 4, d: [3, 8], w: 10, gear: 0.22, pack: [1, 3] },
  orc_archer: { n: '오크 궁수', g: 'o', c: '#e0b040', hp: 16, ac: 1, ev: 7, acc: 12, dmg: 4, spd: 10, xp: 7, lv: 4, d: [3, 8], w: 5, bolt: { dmg: 7, range: 6, n: '화살' }, keep: true, gear: 0.18, desc: '거리를 유지하며 활을 쏜다' },
  spider: { n: '거대 거미', g: 's', c: '#a07850', hp: 16, ac: 2, ev: 10, acc: 12, dmg: 5, spd: 9, xp: 7, lv: 5, d: [3, 7], w: 6, poison: true, drops: { hide: 0.5 }, desc: '독을 주입한다' },
  skeleton: { n: '해골 전사', g: 'z', c: '#e8e0c8', hp: 22, ac: 4, ev: 5, acc: 12, dmg: 8, spd: 11, xp: 8, lv: 5, d: [4, 9], w: 8, undead: true, drops: { bone: 0.9 } },
  orc_shaman: { n: '오크 주술사', g: 'o', c: '#c060ff', hp: 16, ac: 1, ev: 7, acc: 9, dmg: 5, spd: 10, xp: 11, lv: 6, d: [4, 9], w: 4, bolt: { dmg: 9, range: 6, n: '주술 화살' }, healer: true, keep: true, drops: { essence: 0.6 }, desc: '동료를 치유하고 주술을 쏜다' },
  ogre: { n: '오우거', g: 'O', c: '#d0a070', hp: 48, ac: 2, ev: 3, acc: 14, dmg: 17, spd: 12, xp: 20, lv: 8, d: [5, 10], w: 5, drops: { hide: 0.6 }, desc: '느리지만 한 방이 무겁다' },
  troll: { n: '트롤', g: 'T', c: '#60b060', hp: 55, ac: 3, ev: 6, acc: 15, dmg: 13, spd: 10, xp: 28, lv: 9, d: [6, 10], w: 4, regen: 0.7, drops: { hide: 1 }, desc: '빠르게 재생한다' },
  golem: { n: '석상 골렘', g: 'G', c: '#a8a8d0', hp: 75, ac: 10, ev: 1, acc: 15, dmg: 18, spd: 15, xp: 32, lv: 10, d: [6, 10], w: 3, drops: { crystal: 2 }, desc: '매우 단단하고 느리다' },
  wraith: { n: '망령', g: 'W', c: '#8890ff', hp: 32, ac: 4, ev: 10, acc: 16, dmg: 10, spd: 9, xp: 28, lv: 9, d: [7, 10], w: 4, drain: true, undead: true, drops: { essence: 1 }, desc: '생명력을 흡수한다' },
  necromancer: { n: '강령술사', g: 'p', c: '#ff60c0', hp: 30, ac: 2, ev: 8, acc: 12, dmg: 6, spd: 10, xp: 40, lv: 11, d: [8, 10], w: 2, bolt: { dmg: 13, range: 7, n: '흡혈 화살' }, summon: 'skeleton', keep: true, drops: { essence: 1.5 }, gear: 0.5, desc: '해골을 일으키고 흡혈 화살을 쏜다' },
  heart: { n: '던전의 심장', g: '♥', c: '#ff2040', hp: 280, ac: 6, ev: 0, acc: 18, dmg: 12, spd: 10, xp: 200, lv: 15, d: [99, 99], w: 0, immobile: true, boss: true, bolt: { dmg: 10, range: 7, n: '핏빛 파동' }, desc: '던전의 근원. 주기적으로 하수인을 낳는다' },
};

G.SPELLS = {
  magic_dart: { n: '마법 화살', mp: 1, tgt: 'enemy', range: 7, d: '확실히 명중하는 약한 마법' },
  fire_bolt: { n: '화염 화살', mp: 4, tgt: 'enemy', range: 7, d: '강력한 화염 피해' },
  heal_other: { n: '치유', mp: 3, tgt: 'ally', range: 6, d: '아군 하나의 HP 회복' },
  blink: { n: '점멸', mp: 2, tgt: 'self', d: '근처 안전한 곳으로 순간이동' },
  slow: { n: '감속', mp: 3, tgt: 'enemy', range: 6, d: '적을 8턴간 느리게' },
};

// 무기 기술 특수 능력 (기술 2 이상에서 해금)
G.ABIL = {
  double_slash: { n: '연속 베기', mp: 2, skill: 'blades', min: 2, tgt: 'adj', d: '인접한 적을 두 번 공격' },
  stun_blow: { n: '기절 강타', mp: 2, skill: 'maces', min: 2, tgt: 'adj', d: '적을 2턴 기절시킨다' },
  whirl: { n: '휩쓸기', mp: 2, skill: 'axes', min: 2, tgt: 'self', d: '인접한 모든 적 공격' },
  aimed: { n: '조준 사격', mp: 2, skill: 'bows', min: 2, tgt: 'enemy', d: '반드시 명중, 피해 1.8배' },
  taunt: { n: '도발', mp: 1, shield: true, tgt: 'self', d: '주변 적이 6턴간 자신을 노린다' },
};

G.BUILD = {
  wall_wood: { n: '나무 벽', g: '#', c: '#d0a070', bg: '#5a3a1c', cost: { wood: 3 }, work: 50, hp: 60, block: true, cat: 'struct' },
  wall_stone: { n: '돌 벽', g: '#', c: '#d8d8e0', bg: '#585862', cost: { stone: 3 }, work: 90, hp: 160, block: true, cat: 'struct' },
  door: { n: '문', g: '+', c: '#f0b060', bg: '#3a2410', cost: { wood: 2 }, work: 40, hp: 50, door: true, cat: 'struct' },
  bed: { n: '침대', g: 'Θ', c: '#e8a0c8', cost: { wood: 4 }, work: 60, hp: 30, bed: true, cat: 'furn' },
  table: { n: '식탁', g: 'π', c: '#d8b070', cost: { wood: 3 }, work: 40, hp: 30, cat: 'furn' },
  stove: { n: '화덕', g: '&', c: '#ff8040', cost: { stone: 4, wood: 2 }, work: 60, hp: 50, station: 'cook', cat: 'prod' },
  workbench: { n: '작업대', g: 'Ω', c: '#e0c090', cost: { wood: 6 }, work: 70, hp: 40, station: 'craft', cat: 'prod' },
  research_desk: { n: '연구대', g: '¶', c: '#80c0ff', cost: { wood: 5 }, work: 60, hp: 30, station: 'craft', cat: 'prod' },
  forge: { n: '대장간', g: '¤', c: '#ff6020', cost: { stone: 8, wood: 2 }, work: 100, hp: 80, station: 'craft', res: 'smithing', cat: 'prod' },
  alchemy: { n: '연금술대', g: '§', c: '#c080ff', cost: { wood: 4, stone: 2 }, work: 80, hp: 40, station: 'craft', res: 'alchemy', cat: 'prod' },
  med_bed: { n: '치료 침대', g: 'Θ', c: '#80ff90', cost: { wood: 4, hide: 2 }, work: 80, hp: 30, bed: true, heal: 3, res: 'medicine', cat: 'furn' },
  notice_board: { n: '모집 게시판', g: '‡', c: '#e8e880', cost: { wood: 4 }, work: 40, hp: 30, res: 'recruitment', cat: 'furn' },
  spikes: { n: '가시 함정', g: '^', c: '#d0d0d0', cost: { wood: 2, iron: 1 }, work: 40, hp: 40, trap: true, res: 'fortify', cat: 'struct' },
  waystone: { n: '길잡이 돌', g: '▲', c: '#60e0ff', cost: { stone: 10, crystal: 2, essence: 2 }, work: 150, hp: 100, res: 'waystone', cat: 'furn' },
};

G.RESEARCH = {
  smithing: { n: '대장술', pts: 250, cost: { iron_ore: 4 }, d: '대장간, 철 제련, 철제 무기·갑옷' },
  alchemy: { n: '연금술', pts: 220, cost: { herb: 4 }, d: '연금술대, 치유·괴력·신속 물약' },
  cuisine: { n: '요리법', pts: 150, cost: {}, d: '고급 식사(기분↑), 든든한 휴대식량' },
  medicine: { n: '의술', pts: 180, cost: { herb: 2 }, d: '치료 침대 (회복 속도 3배)' },
  recruitment: { n: '인재 모집', pts: 120, cost: {}, d: '모집 게시판: 지원자가 더 자주 오고 3명 중 선택' },
  anatomy: { n: '괴물 해부학', pts: 200, cost: { bone: 5, hide: 3 }, d: '모든 정착민 피해 +10%' },
  fortify: { n: '방어 공학', pts: 200, cost: { bone: 4 }, req: ['smithing'], d: '가시 함정, 모든 벽 내구도 +50%' },
  steelwork: { n: '강철 단조', pts: 400, cost: { crystal: 3, iron: 3 }, req: ['smithing'], d: '롱소드, 워해머, 전투도끼, 판금 갑옷' },
  runecraft: { n: '룬 각인', pts: 350, cost: { essence: 3 }, req: ['alchemy'], d: '귀환·점멸·지도 두루마리' },
  arcane: { n: '비전 연구', pts: 350, cost: { essence: 4 }, req: ['runecraft'], d: '연구대에서 마법서 제작' },
  waystone: { n: '길잡이 돌', pts: 400, cost: { crystal: 3, essence: 3 }, d: '도달했던 4층·7층에서 원정 시작' },
};

// st=제작소, out/q=자원 산출, gear=장비 산출, def=기본 유지 목표
G.RECIPES = {
  meal: { st: 'stove', in: { food: 2 }, out: 'meal', q: 1, work: 35, def: 6 },
  ration: { st: 'stove', in: { food: 3 }, out: 'ration', q: 2, work: 50, def: 6 },
  fine_meal: { st: 'stove', in: { food: 2, herb: 1 }, out: 'fine_meal', q: 1, work: 50, res: 'cuisine' },
  hearty_ration: { st: 'stove', in: { food: 4, herb: 1 }, out: 'hearty_ration', q: 2, work: 60, res: 'cuisine' },
  club: { st: 'workbench', in: { wood: 3 }, gear: 'club', work: 50 },
  staff: { st: 'workbench', in: { wood: 4 }, gear: 'staff', work: 50 },
  shortbow: { st: 'workbench', in: { wood: 5 }, gear: 'shortbow', work: 70 },
  buckler: { st: 'workbench', in: { wood: 4 }, gear: 'buckler', work: 50 },
  robe: { st: 'workbench', in: { hide: 2 }, gear: 'robe', work: 50 },
  leather_armor: { st: 'workbench', in: { hide: 4 }, gear: 'leather_armor', work: 80 },
  backpack: { st: 'workbench', in: { hide: 3 }, gear: 'backpack', work: 60 },
  longbow: { st: 'workbench', in: { wood: 4, iron: 1 }, gear: 'longbow', work: 90, res: 'smithing' },
  iron: { st: 'forge', in: { iron_ore: 2, wood: 1 }, out: 'iron', q: 1, work: 40, res: 'smithing', def: 4 },
  dagger: { st: 'forge', in: { iron: 1 }, gear: 'dagger', work: 50, res: 'smithing' },
  short_sword: { st: 'forge', in: { iron: 2 }, gear: 'short_sword', work: 70, res: 'smithing' },
  mace: { st: 'forge', in: { iron: 3 }, gear: 'mace', work: 80, res: 'smithing' },
  hand_axe: { st: 'forge', in: { iron: 2, wood: 1 }, gear: 'hand_axe', work: 70, res: 'smithing' },
  chain_mail: { st: 'forge', in: { iron: 6 }, gear: 'chain_mail', work: 140, res: 'smithing' },
  kite_shield: { st: 'forge', in: { iron: 4 }, gear: 'kite_shield', work: 90, res: 'smithing' },
  long_sword: { st: 'forge', in: { iron: 3, crystal: 1 }, gear: 'long_sword', work: 120, res: 'steelwork' },
  war_hammer: { st: 'forge', in: { iron: 4, crystal: 1 }, gear: 'war_hammer', work: 130, res: 'steelwork' },
  battle_axe: { st: 'forge', in: { iron: 4, crystal: 1 }, gear: 'battle_axe', work: 130, res: 'steelwork' },
  plate_armor: { st: 'forge', in: { iron: 8, crystal: 2 }, gear: 'plate_armor', work: 200, res: 'steelwork' },
  potion_heal: { st: 'alchemy', in: { herb: 2 }, out: 'potion_heal', q: 1, work: 50, res: 'alchemy', def: 3 },
  potion_might: { st: 'alchemy', in: { herb: 1, crystal: 1 }, out: 'potion_might', q: 1, work: 60, res: 'alchemy' },
  potion_haste: { st: 'alchemy', in: { herb: 1, essence: 1 }, out: 'potion_haste', q: 1, work: 60, res: 'alchemy' },
  scroll_return: { st: 'alchemy', in: { essence: 2 }, out: 'scroll_return', q: 1, work: 70, res: 'runecraft', def: 1 },
  scroll_blink: { st: 'alchemy', in: { essence: 1 }, out: 'scroll_blink', q: 1, work: 50, res: 'runecraft' },
  scroll_mapping: { st: 'alchemy', in: { essence: 1, herb: 1 }, out: 'scroll_mapping', q: 1, work: 50, res: 'runecraft' },
  book_dart: { st: 'research_desk', in: { essence: 1 }, out: 'book_dart', q: 1, work: 80, res: 'arcane' },
  book_fire: { st: 'research_desk', in: { essence: 3 }, out: 'book_fire', q: 1, work: 120, res: 'arcane' },
  book_heal: { st: 'research_desk', in: { essence: 2, herb: 3 }, out: 'book_heal', q: 1, work: 120, res: 'arcane' },
  book_blink: { st: 'research_desk', in: { essence: 2 }, out: 'book_blink', q: 1, work: 100, res: 'arcane' },
  book_slow: { st: 'research_desk', in: { essence: 2, bone: 2 }, out: 'book_slow', q: 1, work: 100, res: 'arcane' },
};
for (const k in G.RECIPES) {
  const r = G.RECIPES[k];
  r.n = r.gear ? G.GEAR[r.gear].n : G.RES[r.out].n + (r.q > 1 ? ' ×' + r.q : '');
}
