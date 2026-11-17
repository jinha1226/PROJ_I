'use strict';
// SRD 5.2.1 마법 물건 · 물약 · 장비 연결 (DESIGN 참고). data/srd521/db의 모든 물건이 여기 어딘가에 있다 (test/item_rules.js)
//  wear = 끼는 물건 → G.D.ARTS에 더한다 (G.Trinket이 다룬다) · cast = 끼고 주문을 쓴다(충전 횟수) · use = 가방의 소모품 · sell = 전투 효과가 없어 귀환 때 판다
G.Items = (() => {
  const D = G.D, U = G.U, F = () => G.Fantasy, DN = () => G.Dnd;
  const RAR = { Common: 0, Uncommon: 1, Rare: 2, 'Very Rare': 3, Legendary: 4 }, VALUE = [100, 400, 4000, 40000, 200000]; // SRD Magic Item Values by Rarity
  const CARRY = new Set(['humanoid', 'fey', 'fiend', 'undead', 'giant', 'monstrosity', 'dragon']);
  const CASTER = ['mage', 'archmage', 'warlock', 'bard', 'cleric', 'scout', 'paladin', 'archer'];
  const ICON = { ring: '💍', wand: '🪄', staff: '🪄', cloak: '🧥', boots: '🥾', amulet: '📿', weapon: '⚔️', armor: '🛡️', misc: '🔮', potion: '🧪', scroll: '📜' };
  // 끼는 물건: [영문, 한글, 희귀도, 슬롯(없으면 장신구), 속성, 아이콘]
  const WEAR = [
    ['Weapon, +1', '마법 무기 +1', 1, 'w', [['hit', 1], ['dmgB', 1]], 'weapon'], ['Weapon, +2', '마법 무기 +2', 2, 'w', [['hit', 2], ['dmgB', 2]], 'weapon'], ['Weapon, +3', '마법 무기 +3', 3, 'w', [['hit', 3], ['dmgB', 3]], 'weapon'],
    ['Armor, +1', '마법 갑옷 +1', 2, 'a', [['ac', 1]], 'armor'], ['Armor, +2', '마법 갑옷 +2', 3, 'a', [['ac', 2]], 'armor'], ['Armor, +3', '마법 갑옷 +3', 4, 'a', [['ac', 3]], 'armor'],
    ['Shield, +1', '마법 방패 +1', 1, 'w', [['ac', 1]], 'armor', { shield: true }], ['Shield, +3', '마법 방패 +3', 3, 'w', [['ac', 3]], 'armor', { shield: true }],
    ['Animated Shield', '움직이는 방패', 3, 'w', [['ac', 2]], 'armor', { shield: true }], ['Shield of the Cavalier', '기사의 방패', 3, 'w', [['ac', 2]], 'armor', { shield: true }],
    ['Armor of Vulnerability', '취약의 갑옷', 2, 'a', [['res', 'slashing']], 'armor'], ['Mithral Armor', '미스릴 갑옷', 1, 'a', [], 'armor'], ['Plate Armor of Etherealness', '에테르 판금 갑옷', 4, 'a', [], 'armor'],
    ['Energy Bow', '에너지 활', 3, 'w', [['hit', 1], ['dmgB', 1]], 'weapon'], ['Mace of Smiting', '강타의 철퇴', 2, 'w', [['hit', 1], ['dmgB', 1]], 'weapon'], ['Scimitar of Speed', '신속의 시미터', 3, 'w', [['hit', 2], ['dmgB', 2], ['extraAtk', 1]], 'weapon'],
    ['Quarterstaff of the Acrobat', '곡예사의 쿼터스태프', 3, 'w', [['hit', 2], ['dmgB', 2]], 'weapon'], ['Sword of Wounding', '상처의 검', 2, 'w', [['ex', 2, 6, 'necrotic']], 'weapon'], ['Vicious Weapon', '잔혹한 무기', 2, 'w', [['ex', 2, 6]], 'weapon'],
    ['Thunderous Greatclub', '천둥의 대곤봉', 3, 'w', [['set', 'str', 20], ['ex', 1, 8, 'thunder']], 'weapon'], ['Javelin of Lightning', '번개 자벨린', 1, 'w', [['wtype', 'lightning']], 'weapon'], ['Trident of Fish Command', '물고기 지배의 삼지창', 1, 'w', [], 'weapon'], ['Weapon of Warning', '경고의 무기', 1, 'w', [['init', 1]], 'weapon'],
    ['Stone of Good Luck (Luckstone)', '행운석', 1, null, [['save', 1]], 'misc'], ['Mantle of Spell Resistance', '주문 저항의 망토', 2, null, [['magicRes', 1]], 'cloak'], ['Robe of Stars', '별의 로브', 3, null, [['save', 1]], 'cloak'], ['Belt of Dwarvenkind', '드워프 혈통의 허리띠', 2, null, [['ab', 'con', 2], ['res', 'poison']], 'misc'],
    ['Boots of the Winterlands', '겨울땅의 장화', 1, null, [['res', 'cold']], 'boots'], ['Cloak of Arachnida', '거미의 망토', 3, null, [['res', 'poison']], 'cloak'], ['Cloak of Invisibility', '투명 망토', 4, null, [['invisCloak', 1]], 'cloak'], ['Ring of Invisibility', '투명 반지', 4, null, [['invis', 1]], 'ring'],
    ['Periapt of Health', '건강의 부적', 1, null, [['imm', 'poisoned']], 'amulet'], ['Rod of Alertness', '경계의 막대', 3, null, [['init', 1]], 'misc'], ['Staff of the Woodlands', '숲의 지팡이', 2, null, [['hit', 2], ['dmgB', 2]], 'staff', { cast: [['Faerie Fire', 1], ['Moonbeam', 2]], ch: 6 }], ['Staff of Thunder and Lightning', '천둥 번개의 지팡이', 3, null, [['hit', 2], ['dmgB', 2]], 'staff'], ['Staff of Striking', '타격의 지팡이', 3, null, [['hit', 3], ['dmgB', 3]], 'staff'],
    ['Staff of Fire', '불의 지팡이', 3, null, [['res', 'fire']], 'staff', { cast: [['Burning Hands', 1], ['Fireball', 3], ['Wall of Fire', 4]], ch: 10 }], ['Staff of Frost', '서리의 지팡이', 3, null, [['res', 'cold']], 'staff', { cast: [['Cone of Cold', 5], ['Ice Storm', 4], ['Fog Cloud', 1]], ch: 10 }],
    ['Staff of Healing', '치유의 지팡이', 2, null, [], 'staff', { cast: [['Cure Wounds', 1], ['Mass Cure Wounds', 5]], ch: 10 }], ['Staff of Charming', '매혹의 지팡이', 2, null, [], 'staff', { cast: [['Charm Person', 1], ['Command', 1]], ch: 10 }], ['Staff of Swarming Insects', '곤충 떼의 지팡이', 2, null, [], 'staff', { cast: [['Insect Plague', 5], ['Web', 2]], ch: 10 }],
    ['Wand of Binding', '속박의 완드', 2, null, [], 'wand', { cast: [['Hold Monster', 5], ['Hold Person', 2]], ch: 7 }], ['Wand of Fear', '공포의 완드', 2, null, [], 'wand', { cast: [['Command', 1], ['Fear', 3]], ch: 7 }], ['Wand of Fireballs', '화염구의 완드', 2, null, [], 'wand', { cast: [['Fireball', 3]], ch: 7 }], ['Wand of Lightning Bolts', '번개의 완드', 2, null, [], 'wand', { cast: [['Lightning Bolt', 3]], ch: 7 }], ['Wand of Magic Missiles', '마법 화살의 완드', 1, null, [], 'wand', { cast: [['Magic Missile', 1]], ch: 7 }], ['Wand of Paralysis', '마비의 완드', 2, null, [], 'wand', { cast: [['Hold Monster', 5]], ch: 7 }], ['Wand of Polymorph', '변이의 완드', 3, null, [], 'wand', { cast: [['Polymorph', 4]], ch: 7 }], ['Wand of Web', '거미줄의 완드', 1, null, [], 'wand', { cast: [['Web', 2]], ch: 7 }],
    ['Ring of Shooting Stars', '유성의 반지', 3, null, [], 'ring', { cast: [['Faerie Fire', 1]], ch: 6 }], ['Circlet of Blasting', '폭발의 머리띠', 1, null, [], 'misc', { cast: [['Scorching Ray', 2]], ch: 1 }], ['Eyes of Charming', '매혹의 눈', 1, null, [], 'misc', { cast: [['Charm Person', 1]], ch: 3 }], ['Hat of Many Spells', '수많은 주문의 모자', 3, null, [], 'misc'], ['Helm of Brilliance', '광휘의 투구', 3, null, [['res', 'fire']], 'misc', { cast: [['Fireball', 3]], ch: 5 }], ['Helm of Teleportation', '순간 이동의 투구', 2, null, [], 'misc'], ['Ring of the Ram', '충각의 반지', 2, null, [], 'ring'], ['Mace of Terror', '공포의 철퇴', 2, 'w', [], 'weapon', { cast: [['Fear', 3]], ch: 3 }],
  ];
  // 소모품: [영문, 한글, 희귀도, 효과]
  const heal = (n, d, b) => ({ k: 'heal', n, d, b });
  const USE = [
    ['Potion of Healing', '치유 물약', 0, heal(2, 4, 2)], ['Potion of Greater Healing', '상급 치유 물약', 1, heal(4, 4, 4)], ['Potion of Superior Healing', '고급 치유 물약', 2, heal(8, 4, 8)], ['Potion of Supreme Healing', '최상급 치유 물약', 3, heal(10, 4, 20)],
    ['Potion of Heroism', '영웅의 물약', 2, { k: 'buff', thp: 10, dur: 600, props: { hitD: 4, saveD: 4 } }], ['Potion of Speed', '신속의 물약', 3, { k: 'buff', key: 'haste', dur: 10, props: { ac: 2, extraAtk: 1 } }], ['Potion of Growth', '성장의 물약', 1, { k: 'buff', key: 'large', dur: 100, props: { dmgD: 4 } }] /* 확대 (SRD): 무기 피해 +1d4 · 근력 내성 이점 · 10분 */, ['Potion of Invisibility', '투명의 물약', 2, { k: 'buff', key: 'invis2', dur: 600, props: {} }] /* 투명 1시간 · 공격 · 피해 · 주문이면 끝 (SRD) */, ['Potion of Invulnerability', '무적의 물약', 2, { k: 'buff', key: 'invuln', dur: 10, props: {} }] /* 모든 피해에 저항 1분 (SRD) — G.Res.takenK */, ['Potion of Resistance', '저항의 물약', 1, { k: 'buff', resRand: true, dur: 600, props: {} }],
    ['Potion of Giant Strength', '거인 힘의 물약', 2, { k: 'buff', key: 'gstr', strSet: 23, dur: 600, props: {} }] /* 서리 · 바위 거인 (희귀): 근력 23 · 1시간 (SRD) */, ['Elixir of Health', '건강의 비약', 2, { k: 'cure' }], ['Potion of Vitality', '활력의 물약', 3, { k: 'cure' }],
    ['Bead of Force', '역장 구슬', 2, { k: 'throw', n: 5, d: 4, t: 'force', save: 'dex', dc: 15, r: 12, area: 2 }], ['Horn of Blasting', '폭발의 뿔피리', 2, { k: 'throw', n: 5, d: 6, t: 'thunder', save: 'con', dc: 15, r: 6, area: 2 }],
    ['Acid', '산성액', 0, { k: 'throw', n: 2, d: 6, t: 'acid', save: 'dex', r: 4, gear: 25 }], ['Alchemist’s Fire', '연금술 화염', 0, { k: 'throw', n: 1, d: 4, t: 'fire', save: 'dex', r: 4, gear: 50 }], ['Holy Water', '성수', 0, { k: 'throw', n: 2, d: 8, t: 'radiant', save: 'dex', r: 4, only: ['fiend', 'undead'], gear: 25 }],
  ];
  const SELL_KO = { 'Ammunition, +1, +2, or +3': '마법 탄환', 'Ammunition of Slaying': '처단의 탄환', 'Amulet of Proof against Detection and Location': '탐지 방지 부적', 'Amulet of the Planes': '차원의 부적', 'Apparatus of the Crab': '게의 기계', 'Bag of Beans': '콩 주머니', 'Bag of Devouring': '삼키는 주머니', 'Bag of Holding': '보관의 주머니', 'Bag of Tricks': '재주 주머니', 'Bead of Nourishment': '양분 구슬', 'Boots of Elvenkind': '엘프의 장화', 'Boots of Levitation': '부양의 장화', 'Boots of Striding and Springing': '성큼 도약 장화', 'Bowl of Commanding Water Elementals': '물 정령 지배의 그릇', 'Brazier of Commanding Fire Elementals': '불 정령 지배의 화로', 'Broom of Flying': '비행 빗자루', 'Candle of Invocation': '기원의 양초', 'Cape of the Mountebank': '협잡꾼의 망토', 'Carpet of Flying': '비행 양탄자', 'Censer of Controlling Air Elementals': '공기 정령 지배의 향로', 'Chime of Opening': '열림의 종', 'Cloak of Elvenkind': '엘프의 망토', 'Cloak of the Bat': '박쥐 망토', 'Cloak of the Manta Ray': '쥐가오리 망토', 'Crystal Ball': '수정구', 'Crystal Ball of Mind Reading': '독심의 수정구', 'Crystal Ball of Telepathy': '텔레파시 수정구', 'Crystal Ball of True Seeing': '진시의 수정구', 'Cube of Force': '역장의 정육면체', 'Cubic Gate': '입방체 관문', 'Decanter of Endless Water': '끝없는 물병', 'Deck of Illusions': '환영의 카드', 'Dimensional Shackles': '차원의 족쇄', 'Dragon Orb': '용의 보주', 'Dust of Disappearance': '사라짐의 가루', 'Dust of Dryness': '건조의 가루', 'Dust of Sneezing and Choking': '재채기와 질식의 가루', 'Efficient Quiver': '효율의 화살통', 'Efreeti Bottle': '이프리트의 병', 'Elemental Gem': '정령 보석', 'Eversmoking Bottle': '연기 병', 'Eyes of Minute Seeing': '세밀한 눈', 'Eyes of the Eagle': '독수리의 눈', 'Feather Token': '깃털 징표', 'Figurine of Wondrous Power': '경이의 조각상', 'Folding Boat': '접이식 배', 'Gem of Brightness': '광채의 보석', 'Gem of Seeing': '투시의 보석', 'Gloves of Swimming and Climbing': '수영과 등반의 장갑', 'Gloves of Thievery': '도둑의 장갑', 'Goggles of Night': '밤의 고글', 'Handy Haversack': '편리한 배낭', 'Hat of Disguise': '변장의 모자', 'Helm of Comprehending Languages': '언어 이해의 투구', 'Helm of Telepathy': '텔레파시 투구', 'Horn of Valhalla': '발할라의 뿔피리', 'Horseshoes of a Zephyr': '산들바람의 편자', 'Horseshoes of Speed': '속도의 편자', 'Immovable Rod': '움직이지 않는 막대', 'Instant Fortress': '순간 요새', 'Iron Bands': '쇠 띠', 'Iron Flask': '쇠 플라스크', 'Lantern of Revealing': '드러냄의 등불', 'Manual of Bodily Health': '신체 건강의 교본', 'Manual of Gainful Exercise': '유익한 운동의 교본', 'Manual of Golems': '골렘 교본', 'Manual of Quickness of Action': '민첩한 행동의 교본', 'Marvelous Pigments': '경이로운 안료', 'Medallion of Thoughts': '생각의 메달', 'Mirror of Life Trapping': '생명 가두는 거울', 'Mysterious Deck': '신비의 카드', 'Necklace of Adaptation': '적응의 목걸이', 'Necklace of Prayer Beads': '기도 구슬 목걸이', 'Oil of Etherealness': '에테르 기름', 'Oil of Sharpness': '날카로움의 기름', 'Oil of Slipperiness': '미끄러움의 기름', 'Pearl of Power': '힘의 진주', 'Philter of Love': '사랑의 묘약', 'Pipes of Haunting': '유령 피리', 'Pipes of the Sewers': '하수도 피리', 'Portable Hole': '휴대용 구멍', 'Potion of Animal Friendship': '동물 친화 물약', 'Potion of Clairvoyance': '천리안 물약', 'Potion of Climbing': '등반 물약', 'Potion of Diminution': '축소 물약', 'Potion of Flying': '비행 물약', 'Potion of Gaseous Form': '기체화 물약', 'Potion of Longevity': '장수 물약', 'Potion of Mind Reading': '독심 물약', 'Potion of Poison': '독 물약', 'Potion of Water Breathing': '수중 호흡 물약', 'Ring of Animal Influence': '동물 지배 반지', 'Ring of Djinni Summoning': '지니 소환 반지', 'Ring of Elemental Command': '정령 지배 반지', 'Ring of Feather Falling': '깃털 낙하 반지', 'Ring of Jumping': '도약 반지', 'Ring of Mind Shielding': '정신 보호 반지', 'Ring of Spell Storing': '주문 저장 반지', 'Ring of Spell Turning': '주문 반사 반지', 'Ring of Swimming': '수영 반지', 'Ring of Telekinesis': '염동력 반지', 'Ring of Three Wishes': '세 소원의 반지', 'Ring of Warmth': '온기의 반지', 'Ring of Water Walking': '수면 보행 반지', 'Ring of X-ray Vision': '투시 반지', 'Robe of Eyes': '눈의 로브', 'Robe of Scintillating Colors': '찬란한 색의 로브', 'Robe of Useful Items': '쓸모의 로브', 'Rod of Absorption': '흡수의 막대', 'Rod of Resurrection': '부활의 막대', 'Rod of Rulership': '통치의 막대', 'Rod of Security': '안전의 막대', 'Rope of Climbing': '등반 밧줄', 'Rope of Entanglement': '얽힘의 밧줄', 'Sending Stones': '전언의 돌', 'Shield of Missile Attraction': '투사체 유인 방패', 'Slippers of Spider Climbing': '거미 등반 신발', 'Sovereign Glue': '지고의 접착제', 'Sphere of Annihilation': '소멸의 구체', 'Staff of Withering': '시듦의 지팡이', 'Staff of the Python': '비단뱀의 지팡이', 'Stone of Controlling Earth Elementals': '대지 정령 지배의 돌', 'Talisman of Pure Good': '순수한 선의 부적', 'Talisman of the Sphere': '구체의 부적', 'Talisman of Ultimate Evil': '궁극의 악의 부적', 'Tome of Clear Thought': '맑은 생각의 서', 'Tome of Leadership and Influence': '지도력의 서', 'Tome of Understanding': '이해의 서', 'Universal Solvent': '만능 용매', 'Wand of Enemy Detection': '적 탐지 완드', 'Wand of Magic Detection': '마법 탐지 완드', 'Wand of Secrets': '비밀의 완드', 'Wand of Wonder': '경이의 완드', 'Well of Many Worlds': '여러 세계의 우물', 'Wind Fan': '바람 부채', 'Winged Boots': '날개 장화', 'Wings of Flying': '비행의 날개', 'Spell Scroll': '주문 두루마리', 'Potions of Healing': '치유 물약', 'Amulet of the Planes ': '' };
  const GEAR_KO = { Ink: '잉크', 'Ink Pen': '펜', Jug: '물병', Ladder: '사다리', Ammunition: '탄환', Lamp: '등잔', Antitoxin: '해독제', 'Lantern, Bullseye': '집광 등불', 'Arcane Focus': '비전 초점', 'Lantern, Hooded': '덮개 등불', Backpack: '배낭', Lock: '자물쇠', 'Ball Bearings': '쇠구슬', 'Magnifying Glass': '돋보기', Barrel: '통', Manacles: '수갑', Basket: '바구니', Map: '지도', Bedroll: '침낭', Mirror: '거울', Bell: '종', Net: '그물', Blanket: '담요', Oil: '기름', 'Block and Tackle': '도르래', Paper: '종이', Book: '책', Parchment: '양피지', 'Bottle, Glass': '유리병', Perfume: '향수', Bucket: '양동이', 'Poison, Basic': '기본 독', 'Burglar’s Pack': '도둑 꾸러미', Pole: '장대', Caltrops: '마름쇠', 'Pot, Iron': '쇠솥', Candle: '양초', 'Case, Crossbow Bolt': '볼트 통', Pouch: '주머니', 'Case, Map or Scroll': '두루마리 통', 'Priest’s Pack': '사제 꾸러미', Chain: '사슬', Quiver: '화살통', Chest: '궤', 'Ram, Portable': '휴대 공성추', 'Climber’s Kit': '등반 도구', Rations: '식량', 'Clothes, Fine': '고급 옷', Robe: '로브', 'Clothes, Traveler’s': '여행복', Rope: '밧줄', 'Component Pouch': '재료 주머니', Sack: '자루', Costume: '의상', 'Scholar’s Pack': '학자 꾸러미', Crowbar: '쇠지레', Shovel: '삽', 'Diplomat’s Pack': '외교관 꾸러미', 'Signal Whistle': '호루라기', 'Druidic Focus': '드루이드 초점', 'Spell Scroll (Cantrip)': '소마법 두루마리', 'Dungeoneer’s Pack': '던전 탐험 꾸러미', 'Spell Scroll (Level 1)': '1레벨 두루마리', 'Entertainer’s Pack': '연예인 꾸러미', 'Spikes, Iron': '쇠못', 'Explorer’s Pack': '탐험가 꾸러미', Spyglass: '망원경', Flask: '플라스크', String: '끈', 'Healer’s Kit': '치료 도구', Tent: '천막', 'Holy Symbol': '성표', Tinderbox: '부싯돌', 'Hunting Trap': '사냥 덫', Torch: '횃불', Vial: '약병', Waterskin: '물주머니', 'Grappling Hook': '갈고리', 'Rope, Silk': '비단 밧줄' };
  const key = en => 'it_' + en.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const useD = {}; for (const [en, n, r, fx] of USE) useD[en] = { en, n, r, fx };
  // 끼는 물건을 G.D.ARTS에 더한다
  const rSpell = en => Object.keys(D.MSKILLS).find(k => D.MSKILLS[k].en === en && G.Skill?.SK[k]?.run && !D.MSKILLS[k].noAuto) || null;
  for (const [en, n, r, slot, props, ic, o] of WEAR) { if (Object.values(D.ARTS).some(a => a.en === en)) continue; const A = { n, en, ic: ICON[ic] || '🔮', r, props: props.slice(), ...(slot ? { slot } : {}), ...(o || {}) }; if (o?.shield) A.fit = D.ARTS.shield_plus?.fit; if (o?.cast) A.props.push(['castN', o.ch]); D.ARTS[key(en)] = A; }
  G.Trinket.PROPS.castN = { t: v => `주문 ${v}회`, sc: () => 6 };
  const It = {
    USE: useD, WEAR, SELL_KO, GEAR_KO, VALUE, RAR,
    bag: f => f.bag || (f.bag = {}),
    add(f, en, n = 1) { const B = It.bag(f); B[en] = (B[en] || 0) + n; (f.trip = f.trip || []).push(useD[en]?.n || en); },
    // 전투 효과가 없는 물건은 짐으로 들고 있다가 귀환하면 절반 값에 판다 (SRD)
    treasure(f, rt, en, n, gp, x, y) { if (en === 'Robe of Useful Items') { G.ItemX?.robe(f); return; } /* 쓸모 있는 물건의 로브 (SRD): 조각을 떼어 쓴다 */ if (G.Util?.ITEM?.[en] || ['Potion of Poison', 'Dust of Sneezing and Choking', 'Bag of Devouring', 'Dimensional Shackles', 'Mirror of Life Trapping', 'Horseshoes of Speed', 'Horseshoes of a Zephyr', 'Manual of Golems', 'Bag of Beans', 'Rod of Absorption', 'Ring of Spell Storing', 'Wand of Wonder', 'Sphere of Annihilation', 'Talisman of the Sphere'].includes(en)) { const B = It.bag(f); B[en] = (B[en] || 0) + 1; (f.trip = f.trip || []).push(n); G.log(`마법 물건 · ${n}`, 'fantasy', 'good'); return; } /* 효과가 있는 물건은 가방에 (G.Util) — 팔지 않는다 */ (f.treasure = f.treasure || []).push({ en, n, gp }); (f.trip = f.trip || []).push(n); G.log(`전리품 · ${n}`, 'fantasy', 'good'); },
    sellAll(f, why) { const L = f.treasure || []; let g = 0; for (const q of L) g += why === 'wipe' ? 0 : Math.floor(q.gp / 2); f.treasure = []; if (g) f.gold += g; return g; },
    // 금화: SRD에 드롭표가 없어 게임 규칙이다. 지닐 만한 몬스터만, 경험치의 10%
    coinOf: (st, ty) => (st && CARRY.has(ty) ? Math.max(1, Math.round((G.Region.XP[st.cr] || 10) * 0.1)) : 0),
    // 몬스터의 장비: SRD 능력치표의 Gear 줄 그대로. 망가지지 않은 것은 절반 (시험값)
    gearOf(mo) { return (G.SRD_ITEMS?.mgear || {})[mo.stat?.n] || []; },
    gearItem(en) { const lo = en.toLowerCase(), W = G.SRD.WEAPON, A = G.SRD.ARMOR; for (const k in W) if (W[k].en?.toLowerCase() === lo || W[k].en?.toLowerCase() + 's' === lo) return { n: W[k].n, gp: W[k].gp, en }; for (const k in A) if (A[k].en?.toLowerCase() === lo || (A[k].en || '').toLowerCase() + ' armor' === lo) return { n: A[k].n, gp: A[k].gp, en }; const g = It.GEAR_DB.find(q => q.en.toLowerCase() === lo); if (g) return { n: g.n, gp: g.gp, en }; if (lo === 'shield') return { n: '방패', gp: 10, en }; if (lo === 'half plate armor') return { n: '반판금 갑옷', gp: 750, en }; if (lo === 'thieves’ tools') return { n: '도둑 도구', gp: 25, en }; if (lo === 'wand') return { n: '완드', gp: 10, en }; return null; },
    monGear(f, rt, mo) { if (mo.summon || mo.hp > 0) return; for (const en of It.gearOf(mo)) if (Math.random() < 0.5) { const q = It.gearItem(en); if (q) It.treasure(f, rt, q.en, q.n, q.gp); } },
    // 마을 상점 (SRD: 흔한 물건은 어느 도시나, 고급일수록 드물다). 귀환하면 바뀐다
    // 대장간 단계가 희귀도를 연다
    stockN(f) { const l = G.Guild.fac(f, 'forge'); return [0, 2 + 2 * l, l >= 1 ? l + 1 : 0, l >= 2 ? l - 1 : 0]; },
    stock(f) { if (f.stock && f.stockAt === (f.lastHome || 0) + ':' + G.Guild.fac(f, 'forge')) return f.stock; const out = [], lim = It.stockN(f); for (const en of ['Potion of Healing', 'Acid', 'Alchemist’s Fire', 'Holy Water']) out.push({ use: en, gp: useD[en].fx.gear || 50 }); for (const [en, n, r] of USE) if (r >= 1 && r <= 3 && lim[r] > 0 && Math.random() < [0, 0.6, 0.3, 0.1][r]) out.push({ use: en, gp: VALUE[r] }); const owned = new Set(G.Trinket.all(f).map(t => t.k).concat(f.artSeen || [])); for (const r of [1, 2, 3]) { const ks = U.shuffle(Object.keys(D.ARTS).filter(k => D.ARTS[k].r === r && !owned.has(k))).slice(0, lim[r]); for (const k of ks) out.push({ art: k, gp: VALUE[r] }); } f.stockAt = (f.lastHome || 0) + ':' + G.Guild.fac(f, 'forge'); return f.stock = out; },
    buy(f, q) { if (f.gold < q.gp) return false; f.gold -= q.gp; if (q.use) { const B = It.bag(f); B[q.use] = (B[q.use] || 0) + 1; } else { G.Trinket.all(f).push({ id: f.trUid = (f.trUid || 0) + 1, lv: f.maxFloor || 1, on: null, k: q.art }); (f.artSeen = f.artSeen || []).push(q.art); if (f.autoTr !== false) G.Trinket.auto(f); f.stock = f.stock.filter(x => x !== q); } return true; },
    sell(f, t) { f.gold += G.Trinket.price(f, t); f.trinkets = f.trinkets.filter(q => q !== t); },
    // 희귀도: 층이 깊을수록
    pickUse(fl, onlyGear) { const mr = G.Trinket.maxR(fl) ; const l = USE.filter(q => q[2] <= mr - (onlyGear ? 99 : 0) || (onlyGear && q[3].gear)); const tot = l.reduce((a, q) => a + [8, 4, 2, 1, 1][q[2]], 0); let r = Math.random() * tot; for (const q of l) if ((r -= [8, 4, 2, 1, 1][q[2]]) <= 0) return q; return l[0]; },
    pickSell(fl) { const mr = G.Trinket.maxR(fl), L = (It.SELL_DB || []).filter(q => q.r <= mr); return L.length ? U.pick(L) : null; },
    pickGear() { const L = It.GEAR_DB || []; return L.length ? U.pick(L) : null; },
    // 전리품 하나. src: chest · mon
    loot(f, rt, src, x, y) {
      const fl = f.floor || 1, p = Math.random();
      if (p < (src === 'chest' ? 0.3 : 0.35)) { const q = It.pickUse(fl); It.add(f, q[0]); It.note(rt, q[1], x, y); return q; }
      if (p < (src === 'chest' ? 0.4 : 0.5)) { const sp = It.scroll(f, rt, fl); if (sp) return sp; }
      if (p < (src === 'chest' ? 0.6 : 0.8)) { const q = It.pickGear(); if (q) { It.treasure(f, rt, q.en, q.n, q.gp, x, y); It.note(rt, q.n, x, y); return q; } }
      if (p < (src === 'chest' ? 0.75 : 0.9)) { const q = It.pickSell(fl); if (q) { It.treasure(f, rt, q.en, q.n, q.gp, x, y); It.note(rt, q.n, x, y); return q; } }
      return G.Trinket.gain(f, rt, x, y);
    },
    note(rt, n, x, y) { if (rt && x != null) G.fx(rt, { k: 'text', x, y: y - 1, s: n, col: '#ffe08a', t: 1.4, sz: 0.85 }); },
    // 두루마리: 그 레벨 주문 중 하나. 파티에 쓸 수 있는 사람이 있을 때 값이 있다
    scroll(f, rt, fl) { const lv = Math.min(9, 1 + U.rand(Math.ceil(Math.max(1, G.Fantasy.floorLv(fl)) / 2))), ks = Object.keys(D.MSKILLS).filter(k => G.Guild.spLv(k) === lv && G.Skill.SK[k]?.run && !D.MSKILLS[k].noAuto); if (!ks.length) return null; const k = U.pick(ks), en = 'scroll:' + k, n = `${D.MSKILLS[k].n} 두루마리`; useD[en] = { en, n, r: Math.ceil(lv / 2), fx: { k: 'scroll', sk: k, lv } }; It.add(f, en); It.note(rt, n, rt.hero?.x, rt.hero?.y); return useD[en]; },
    useOf(en) { if (useD[en]) return useD[en]; if (en.startsWith('scroll:')) { const k = en.slice(7), lv = G.Guild.spLv(k) || 1; return useD[en] = { en, n: `${D.MSKILLS[k]?.n || k} 두루마리`, r: Math.ceil(lv / 2), fx: { k: 'scroll', sk: k, lv } }; } return null; },
    dice(n, d, b) { let s = b || 0; for (let i = 0; i < n; i++) s += 1 + U.rand(d); return s; },
    canCast(m, k) { if (G.Guild.spellList(m.cls).includes(k)) return true; if (!G.Guild.skill(m, 'ft_umd')) return false; const lv = G.Guild.spLv(k) || 0; return DN().d20(0) + DN().mod(DN().ab(m).int) >= 10 + lv; }, // 마법 도구 사용: 아무 두루마리나 지능 판정 DC 10 + 주문 레벨
    // 차례 시작 (G.Turn): 추가 행동으로 물약. 행동을 썼으면 그 이름을 돌려준다
    turn(f, rt, e, seen) {
      if (!e.merc) return null; const st = rt.turn, B = It.bag(f), has = en => (B[en] || 0) > 0, take = en => { B[en]--; if (B[en] <= 0) delete B[en]; }, low = e.hp < e.max * 0.5;
      // 치유 물약: 쓰러진 곁의 동료 먼저 (SRD: 곁의 사람에게 먹일 수 있다)
      const near = rt.party.find(p => p !== e && p.dying && Math.hypot(p.x - e.x, p.y - e.y) <= 1.5) /* 쓰러진 사람은 늘 dead=true (dying이 함께 붙는다) */, who = near || (low ? e : null);
      if (who && !G.ItemX?.drink(rt, who)) for (const en of ['Potion of Supreme Healing', 'Potion of Superior Healing', 'Potion of Greater Healing', 'Potion of Healing']) if (has(en)) { take(en); const q = useD[en].fx, v = It.dice(q.n, q.d, q.b); who.hp = Math.min(who.max, Math.max(0, who.hp) + v); if (who.dying || (who.dead && who.downed)) { who.dying = null; who.dead = false; who.stable = false; } /* SRD: 체력을 되찾으면 바로 깨어난다 (dead를 남기면 전투가 끝날 때 체력 1로 덮였다) */ G.fx(rt, { k: 'text', x: who.x, y: who.y - 1, s: '+' + v, col: '#9fe79f', t: 1 }); It.say(rt, e, `${useD[en].n}${who === e ? '' : ` → ${who.merc?.name || ''}`} +${v}`); break; }
      if (st && st.round <= 1 && seen.length && rt.mons.some(o => o.aggro && (o.boss || o.chief))) for (const [en, , , fx] of USE) if (fx.k === 'buff' && has(en) && !DN().bon(e, fx.key || en)) { take(en); DN().buff(e, fx.key || en, G.Res_ROUND * (fx.dur || 10), fx.resRand ? { ['res_' + U.pick(['acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder'])]: 1 } : fx.props || {}); /* 저항의 물약 (SRD): 피해 종류 하나에 저항 */ if (fx.strSet && e.merc) e.merc.strSet = { v: fx.strSet, until: G.S.runTime + G.Res_ROUND * fx.dur }; if (fx.thp) e.thp = Math.max(e.thp || 0, fx.thp); It.say(rt, e, useD[en].n); break; }
      if (!seen.length) return null;
      // 행동: 끼는 물건의 주문 · 두루마리 · 던지기
      for (const t of G.Trinket.worn(f, e.merc.uid)) { const A = t.k && D.ARTS[t.k]; if (!A?.cast) continue; t.chLeft = t.chLeft ?? A.ch; for (const [spell, lv] of A.cast) { const k = rSpell(spell); if (!k || t.chLeft <= 0) continue; const r = It.castFree(f, rt, e, k, lv, seen); if (r) { if (!(G.Guild.skill(e.merc, 'ft_umd') && DN().dice(1, 6) === 6)) t.chLeft--; /* 마법 도구 사용 (SRD 도둑 13) */ It.say(rt, e, `${A.n} · ${D.MSKILLS[k].n}`); return A.n; } } }
      for (const en of Object.keys(B)) { const u = It.useOf(en); if (u?.fx.k === 'scroll' && has(en) && It.canCast(e.merc, u.fx.sk) && It.castFree(f, rt, e, u.fx.sk, u.fx.lv, seen)) { take(en); It.say(rt, e, u.n); return u.n; } }
      for (const en of ['Holy Water', 'Bead of Force', 'Horn of Blasting', 'Acid', 'Alchemist’s Fire']) { if (!has(en)) continue; const fx = useD[en].fx, cells = G.SRD_RANGE.cells(fx.r), list = seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= cells && (!fx.only || fx.only.includes(o.ty))); if (!list.length) continue; if (fx.gear && !DN().melee(e) && !fx.only) continue; const tg = list[0], dc = fx.dc || 8 + DN().prof(e.merc.lv) + DN().mod(DN().ab(e.merc).dex); G.Foe.dtype = fx.t; for (const o of fx.area ? list.filter(q => Math.hypot(q.x - tg.x, q.y - tg.y) <= fx.area) : [tg]) { const sv = DN().save(o, fx.save, dc); const d = It.dice(fx.n, fx.d); F().hurt(f, rt, o, sv ? (fx.area ? d / 2 : 0) : d, 'hit', e); } G.Foe.dtype = null; take(en); It.say(rt, e, useD[en].n); return useD[en].n; }
      return null;
    },
    say(rt, e, s) { if (!G.quiet) { const c = rt.chat || (rt.chat = []); c.push({ n: e.merc?.name || '', col: e.merc ? G.Guild.def(e.merc).col : '#c9c2b2', s, t: G.S.runTime, id: rt.chatId = (rt.chatId || 0) + 1 }); if (c.length > 40) c.shift(); } },
    // 슬롯 없이 주문을 쓴다
    castFree(f, rt, a, k, lv, seen) { const S = G.Skill.SK[k]; if (!S?.run || !S.when) return false; const reach = D.SK_RANGE[k], x = { f, rt, c: a, reach, base: S.base, slot: lv, seen: reach == null ? seen : seen.filter(o => Math.hypot(o.x - a.x, o.y - a.y) <= reach) }; if (!x.seen.length && !S.heal) return false; try { if (!S.when(a, x)) return false; a.castAb = null; return S.run(a, x) !== false; } catch (err) { return false; } },
    // 출발할 때: 끼는 물건 충전 (SRD: 새벽에 회복)
    recharge(f) { for (const t of G.Trinket.all(f)) { const A = t.k && D.ARTS[t.k]; if (A?.cast) t.chLeft = A.ch; } },
  };
  // 값 표 (SRD): 마법 물건은 희귀도, 장비는 표시 가격
  const wearEn = new Set(WEAR.map(q => q[0]).concat(Object.values(D.ARTS).map(a => a.en)));
  It.SELL_DB = (G.SRD_ITEMS?.magic || []).filter(m => SELL_KO[m.en] && !wearEn.has(m.en) && RAR[m.rar] != null && !['Spell Scroll', 'Potions of Healing'].includes(m.en)).map(m => ({ en: m.en, n: SELL_KO[m.en], r: RAR[m.rar], gp: VALUE[RAR[m.rar]] }));
  const GP = { CP: 0.01, SP: 0.1, EP: 0.5, GP: 1, PP: 10 };
  It.GEAR_DB = (G.SRD_ITEMS?.gear || []).filter(g => GEAR_KO[g.en]).map(g => { const q = /([\d,.]+)\s*(CP|SP|EP|GP|PP)/.exec(g.cost || ''); return { en: g.en, n: GEAR_KO[g.en], r: 0, gp: q ? +q[1].replace(',', '') * GP[q[2]] : 0 }; });
  return It;
})();
// ── SRD 5.2.1 마법 물건: 팔기만 하던 물건의 효과 (2026-11-08, DESIGN.md 158). 숫자 · 내성 DC · 충전은 원문 그대로 ──
// 소환하는 물건(원소 보석 · 조종 물건 · 발할라의 뿔피리 · 경이로운 조각상 · 요술 주머니 · 비단뱀 지팡이 · 이프리트 병 · 진의 반지)은 아군 생물이 없어 아직이다 (SRD_AUDIT.md)
(() => {
  const D = G.D, DN = G.Dnd, T = G.Trinket, It = G.Items, F = () => G.Fantasy, U = G.U;
  const cells = ft => G.SRD_RANGE.cells(ft / 5), key = en => 'it_' + en.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const add = (en, n, r, slot, props, ic, o = {}) => { const A = { n, en, ic, r, props, ...(slot ? { slot } : {}), ...o }; if (o.shield) A.fit = D.ARTS.shield_plus?.fit; if (o.cast) A.props = A.props.concat([['castN', o.ch]]); D.ARTS[key(en)] = A; It.WEAR.push([en, n, r, slot, props, ic, o]); };
  const P = (k, t, sc = 4) => { T.PROPS[k] = { t, sc: () => sc }; };
  // 낄 때 늘 붙는 것
  for (const [b, r] of [[1, 1], [2, 2], [3, 3]]) add(`Ammunition, +${b}`, `마법 탄환 +${b}`, r, null, [['hitR', b], ['dmgR', b]], '🏹'); // 원거리 무기 명중 · 피해 +b. 맞히면 그 발은 평범해진다 (20발)
  add('Shield, +2', '마법 방패 +2', 2, 'w', [['ac', 2]], '🛡️', { shield: true });
  for (const [b, r] of [[1, 1], [2, 2], [3, 3]]) add(`Wand of the War Mage, +${b}`, `전쟁 마법사의 완드 +${b}`, r, null, [['spellHit', b], ['noCoverSp', 1]], '🪄');
  add('Boots of Elvenkind', '엘프의 장화', 1, null, [['skAdv', 'stealth']], '🥾');
  add('Cloak of Elvenkind', '엘프의 망토', 1, null, [['skAdv', 'stealth'], ['hideMe', 1]], '🧥');
  add('Eyes of the Eagle', '독수리의 눈', 1, null, [['skAdv', 'perception']], '🔮');
  add('Robe of Eyes', '눈의 로브', 2, null, [['skAdv', 'perception'], ['seeInv', 1]], '🧥');
  add('Gloves of Swimming and Climbing', '수영과 등반의 장갑', 1, null, [['skB', 'athletics', 5]], '🔮');
  add('Gloves of Thievery', '도둑의 장갑', 1, null, [['skB', 'sleight', 5]], '🔮');
  add('Necklace of Adaptation', '적응의 목걸이', 1, null, [['poisonAdv', 1]], '📿');
  add('Ring of Warmth', '온기의 반지', 1, null, [['redCold', 8]], '💍');
  add('Shield of Missile Attraction', '투사체 유인의 방패', 2, 'w', [['resRanged', 1], ['lure', 1]], '🛡️', { shield: true });
  add('Goggles of Night', '밤의 고글', 1, null, [['nightEyes', 1]], '🥽'); // 어둠 시야 60피트 (이미 있으면 +60)
  add('Ring of Spell Turning', '주문 반사의 반지', 4, null, [['magicRes', 1]], '💍');
  add('Boots of Striding and Springing', '성큼걸음의 장화', 1, null, [['spdMin', 6]], '🥾');
  add('Talisman of Pure Good', '순수한 선의 부적', 4, null, [['spellHit', 2], ['rebuke', 'good']], '📿', { ch: 7 });
  add('Talisman of Ultimate Evil', '궁극의 악의 부적', 4, null, [['spellHit', 2], ['rebuke', 'evil']], '📿', { ch: 6 });
  // 충전으로 쓰는 행동 (G.Items.turn)
  add('Ring of the Ram', '숫양의 반지', 2, null, [['ram', 1]], '💍', { ch: 3, regain: [1, 3] });
  add('Robe of Scintillating Colors', '반짝이는 빛깔의 로브', 3, null, [['dazzle', 1]], '🧥', { ch: 3, regain: [1, 3] });
  add('Staff of Withering', '시듦의 지팡이', 2, null, [['wither', 1]], '🪄', { ch: 3, regain: [1, 3] });
  add('Rope of Entanglement', '얽힘의 밧줄', 2, null, [['rope', 1]], '🔮');
  add('Iron Bands', '쇠띠', 2, null, [['bands', 1]], '🔮', { ch: 1, regain: [1, 1, 0, 1] });
  add('Gem of Brightness', '광휘의 보석', 1, null, [['gemBeam', 1]], '🔮', { ch: 50 });
  add('Pipes of Haunting', '유령의 피리', 1, null, [['haunt', 1]], '🔮', { ch: 3, regain: [1, 3] });
  add('Rod of Rulership', '지배의 막대', 2, null, [['rule', 1]], '🔮', { ch: 1, regain: [1, 1, 0, 1] });
  add('Pearl of Power', '힘의 진주', 1, null, [['pearl', 1]], '🔮', { ch: 1, regain: [1, 1, 0, 1] });
  // 끼고 주문을 쓴다 (기존 cast 틀)
  add('Necklace of Prayer Beads', '기도 구슬 목걸이', 2, null, [], '📿', { cast: [['Bless', 1], ['Cure Wounds', 2], ['Lesser Restoration', 2]], ch: 4 });
  add('Cape of the Mountebank', '협잡꾼의 망토', 2, null, [], '🧥', { cast: [['Dimension Door', 4]], ch: 1, regain: [1, 1, 0, 1] });
  add('Rod of Resurrection', '부활의 막대', 4, null, [], '🔮', { cast: [['Heal', 6]], ch: 5, regain: [0, 0, 1] });
  add('Wind Fan', '바람 부채', 1, null, [], '🔮', { cast: [['Gust of Wind', 2]], ch: 1 });
  add('Ammunition of Slaying', '처단의 탄환', 3, null, [['slay', 1]], '🏹'); // 정한 종류가 이 탄환에 피해를 입으면 건강 DC 17: 실패 6d10 역장 · 성공 절반, 그 뒤 평범해진다
  add('Cloak of the Bat', '박쥐의 망토', 2, null, [['skAdv', 'stealth']], '🧥'); // 비행 · 박쥐 변신은 빛 · 어둠이 없어 아직
  add('Iron Flask', '강철 플라스크', 4, null, [['flask', 1]], '🔮', { ch: 1 }); // 다른 세계에서 온 생물: 지혜 DC 17 실패면 갇힌다 (한 번에 하나)
  // 이미 있던 물건의 빠진 효과
  if (D.ARTS[key('Mithral Armor')]) D.ARTS[key('Mithral Armor')].props = [['mithral', 1]]; // 은신 불리 · 근력 조건 없음
  { const A = D.ARTS[key('Armor of Vulnerability')]; if (A) A.props = [['res', 'slashing'], ['vul', 'bludgeoning'], ['vul', 'piercing']]; } // 저주: 다른 두 물리 피해에 취약 (원문의 한 종류 예)
  P('nightEyes', () => '어둠 시야 60피트', 3);
  P('hitR', v => `원거리 명중 +${v}`, 3); P('dmgR', v => `원거리 피해 +${v}`, 3); P('spellHit', v => `주문 명중 +${v}`, 3); P('noCoverSp', () => '주문: 절반 엄폐 무시', 2);
  P('skAdv', k => `${DN.SKILL_N[k]} 이점`, 2); P('skB', (k, v) => `${DN.SKILL_N[k]} +${v}`, 2); P('hideMe', () => '나를 찾는 지각 불리', 2); P('seeInv', () => '투명을 본다', 3); P('poisonAdv', () => '중독 내성 이점', 2);
  P('redCold', v => `냉기 피해 −2d${v}`, 3); P('resRanged', () => '원거리 무기 피해 저항', 4); P('lure', () => '저주: 10피트 안 원거리 공격이 나에게', -2); P('spdMin', () => '속도 최소 30피트', 1); P('mithral', () => '은신 불리 · 근력 조건 없음', 1); P('vul', k => `${T.DT_N[k]} 취약`, -3);
  P('rebuke', k => (k === 'good' ? '정화: 민첩 DC 20 · 실패하면 소멸' : '종말: 민첩 DC 20 · 실패하면 소멸'), 9); P('ram', () => '숫양: +7 · 충전당 2d10 역장', 5); P('dazzle', () => '현란: 지혜 DC 15 기절', 7); P('wither', () => '시듦: +2d10 사령', 5);
  P('slay', () => '처단: 건강 DC 17 · 6d10', 6); P('flask', () => '가두기: 지혜 DC 17', 8);
  P('rope', () => '얽힘: 민첩 DC 15 속박', 4); P('bands', () => '쇠띠: 속박 (근력 DC 20)', 5); P('gemBeam', () => '광선: 건강 DC 15 실명', 4); P('haunt', () => '공포: 지혜 DC 15', 4); P('rule', () => '지배: 지혜 DC 15 매혹', 6); P('pearl', () => '3레벨 이하 슬롯 하나 되찾기', 4);
  // 충전: 새벽(출발)에 regain = [개수, 면, 더함, 최댓값만큼 채움]
  const rec0 = It.recharge; It.recharge = function (f) { rec0.apply(this, arguments); for (const t of T.all(f)) { const A = t.k && D.ARTS[t.k]; if (!A?.ch || A.cast && !A.regain) continue; if (!A.regain) { t.chLeft = t.chLeft ?? A.ch; continue; } const [n, d, b = 0] = A.regain, g = (n ? DN.dice(n, d) : 0) + b; t.chLeft = Math.min(A.ch, (t.chLeft ?? A.ch) + g); } };
  const worn = (f, m, k) => T.worn(f, m.uid).find(t => D.ARTS[t.k]?.props.some(p => p[0] === k));
  const ch = t => (t.chLeft = t.chLeft ?? D.ARTS[t.k].ch ?? 0);
  const say = (rt, e, s) => It.say(rt, e, s);
  // 행동: 물약 · 두루마리보다 뒤에 (G.Items.turn이 아무것도 안 했을 때)
  const ACT = {
    ram(f, rt, e, seen, t) { const n = Math.min(3, ch(t)); if (!n) return; const tg = seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= cells(60)).sort((p, q) => q.hp - p.hp)[0]; if (!tg) return; t.chLeft -= n; const nat = DN.d20(DN.adv(e, tg)), hit = nat !== 1 && (nat === 20 || nat + 7 >= DN.ac(tg) + G.Foe.cover(rt, e, tg)); if (hit) { G.Foe.dtype = 'force'; F().hurt(f, rt, tg, DN.dice(2 * n * (nat === 20 ? 2 : 1), 10), nat === 20 ? 'crit' : 'smite', e); G.Foe.dtype = null; if (tg.hp > 0) G.Foe.shove(rt, tg, e, n); } else DN.miss(rt, tg); return '숫양의 반지'; },
    dazzle(f, rt, e, seen, t) { if (!ch(t)) return; const list = rt.mons.filter(o => o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) <= 6.5 && F().sees(rt.map, o, e) && !DN.out(o)); if (list.length < 2) return; t.chLeft--; DN.buff(e, 'dazzle', G.Res_ROUND, { hitDis: 1 }); for (const o of list) if (!DN.save(o, 'wis', 15)) DN.give(rt, o, 'stunned', G.Res_ROUND, e); return '반짝이는 빛깔의 로브'; },
    rope(f, rt, e, seen) { if (rt.mons.some(o => o.hp > 0 && o.ropeBy === e && DN.has(o, 'restrained'))) return; const tg = seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= cells(20) && !DN.held(o)).sort((p, q) => q.hp - p.hp)[0]; if (!tg) return; if (!DN.save(tg, 'dex', 15)) { DN.give(rt, tg, 'restrained', 1e6, e); tg.ropeBy = e; tg.escape = { dc: 15, ab: ['str', 'dex'] }; } return '얽힘의 밧줄'; },
    bands(f, rt, e, seen, t) { if (!ch(t)) return; const tg = seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= cells(60) && o.stat?.size !== 'gargantuan' && !DN.held(o)).sort((p, q) => q.hp - p.hp)[0]; if (!tg) return; t.chLeft--; const nat = DN.d20(DN.adv(e, tg)), b = DN.mod(DN.ab(e.merc).dex) + DN.prof(e.merc.lv); if (nat !== 1 && (nat === 20 || nat + b >= DN.ac(tg))) { DN.give(rt, tg, 'restrained', 1e6, e); tg.escape = { dc: 20, ab: ['str'] }; } else DN.miss(rt, tg); return '쇠띠'; },
    gemBeam(f, rt, e, seen, t) { if (!ch(t)) return; const tg = seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= cells(60) && !DN.has(o, 'blinded')).sort((p, q) => q.hp - p.hp)[0]; if (!tg || !(tg.boss || tg.chief || seen.length === 1)) return; t.chLeft--; if (!DN.save(tg, 'con', 15)) { DN.give(rt, tg, 'blinded', G.Res_ROUND * 10, e); (tg.rep = tg.rep || []).push({ k: 'blinded', ab: 'con', dc: 15 }); } return '광휘의 보석'; },
    haunt(f, rt, e, seen, t) { if (!ch(t)) return; const list = seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= 6.5 && !(o.hauntImm > G.S.runTime) && !DN.has(o, 'frightened')); if (list.length < 2) return; t.chLeft--; for (const o of list) { if (DN.save(o, 'wis', 15)) { o.hauntImm = G.S.runTime + 1e6; continue; } DN.give(rt, o, 'frightened', G.Res_ROUND * 10, e); (o.rep = o.rep || []).push({ k: 'frightened', ab: 'wis', dc: 15 }); } return '유령의 피리'; },
    rule(f, rt, e, seen, t) { if (!ch(t) || seen.length < 3) return; t.chLeft--; for (const o of seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= cells(120))) if (!DN.save(o, 'wis', 15)) { DN.give(rt, o, 'charmed', G.Res_ROUND * 4800, e); o.charmAll = true; o.endOnDmg = (o.endOnDmg || []).concat(['charmed']); } return '지배의 막대'; }, // 매혹된 몸은 우리를 공격하지 않는다 · 우리 쪽이 해치면 끝 (SRD)
    flask(f, rt, e, seen, t) { if (!ch(t)) return; const tg = seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= cells(60) && ['celestial', 'elemental', 'fey', 'fiend'].includes(o.ty)).sort((a, b) => b.hp - a.hp)[0]; if (!tg) return; t.chLeft--; if (!DN.save(tg, 'wis', 17)) { tg.hp = 0; F().kill(f, rt, tg, 'smite', e); G.log(`강철 플라스크에 ${tg.n}을(를) 가뒀다`, 'fantasy', 'good'); } else t.chLeft++; return '강철 플라스크'; }, // 비어 있을 때만 · 성공하면 플라스크는 그대로 빈다
    rebuke(f, rt, e, seen, t, p) { if (!ch(t)) return; const evil = p[1] === 'evil', bad = o => (evil ? o.ty === 'celestial' : o.ty === 'fiend' || o.ty === 'undead'); const tg = seen.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= cells(120) && !o.stat?.speed?.fly).sort((a, b) => (bad(b) - bad(a)) || b.hp - a.hp)[0]; if (!tg) return; t.chLeft--; const ok = DN.save(tg, 'dex', 20); /* 불리는 saveRoll에 직접 */ if (!ok || (bad(tg) && !DN.save(tg, 'dex', 20))) { tg.hp = 0; F().kill(f, rt, tg, 'smite', e); } else { G.Foe.dtype = 'psychic'; F().hurt(f, rt, tg, DN.dice(4, 6), 'smite', e); G.Foe.dtype = null; } return evil ? '궁극의 악의 부적' : '순수한 선의 부적'; },
  };
  // 가방의 소모품 (원래 팔기만 하던 것)
  const BAG = { 'Oil of Sharpness': '날카로움의 기름', 'Oil of Slipperiness': '미끄러움의 기름', 'Dust of Disappearance': '사라짐의 가루', 'Potion of Climbing': '등반의 물약' };
  const BOOK = { 'Manual of Bodily Health': 'con', 'Manual of Gainful Exercise': 'str', 'Manual of Quickness of Action': 'dex', 'Tome of Clear Thought': 'int', 'Tome of Leadership and Influence': 'cha', 'Tome of Understanding': 'wis' };
  for (const [en, n] of Object.entries(BAG)) It.USE[en] = { en, n, r: en === 'Oil of Sharpness' ? 3 : en === 'Potion of Climbing' ? 0 : 1, fx: { k: 'bag' } };
  for (const en of Object.keys(BOOK)) It.USE[en] = { en, n: It.SELL_KO[en] || en, r: 3, fx: { k: 'book' } };
  const GROUP = { 'Ammunition, +1, +2, or +3': 'Ammunition', 'Wand of the War Mage, +1, +2, or +3': 'Wand of the War Mage', 'Ammunition of Slaying': null, 'Iron Flask': null, 'Cloak of the Bat': null };
  const giveArt = (f, en) => { G.Trinket.all(f).push({ id: f.trUid = (f.trUid || 0) + 1, lv: f.maxFloor || 1, on: null, k: key(en) }); (f.artSeen = f.artSeen || []).push(key(en)); if (f.autoTr !== false) G.Trinket.auto(f); G.log(`전리품 · ${D.ARTS[key(en)].n}`, 'fantasy', 'good'); };
  const tr0 = It.treasure; It.treasure = function (f, rt, en) { if (en in GROUP) { const b = Math.min(3, Math.max(1, (G.Trinket.maxR?.(f.floor || 1) || 1))); giveArt(f, GROUP[en] ? `${GROUP[en]}, +${GROUP[en] === 'Ammunition' ? DN.dice(1, b) : DN.dice(1, b)}` : en); return; } if (BAG[en]) { It.add(f, en); return; } if (BOOK[en]) { const k = BOOK[en], m = f.mercs.filter(q => !q.dead).sort((a, b) => (G.Dnd.cls(b).pri === k) - (G.Dnd.cls(a).pri === k) || DN.ab(b)[k] - DN.ab(a)[k]).find(q => DN.ab(q)[k] < 30); if (m) { (m.abPerm = m.abPerm || {})[k] = (m.abPerm[k] || 0) + 2; G.log(`${m.name} · ${It.USE[en].n} · ${DN.AB_N[k]} +2`, 'fantasy', 'good'); return; } } return tr0.apply(this, arguments); }; // 능력치 책 (SRD): 48시간 공부하면 그 능력치 +2 (최대 30)
  const turn0 = It.turn; It.turn = function (f, rt, e, seen) {
    const r = turn0.apply(this, arguments); if (r || !e.merc || !seen.length) return r; const B = It.bag(f), take = en => { B[en]--; if (B[en] <= 0) delete B[en]; }, st = rt.turn, big = st && st.round <= 1 && rt.mons.some(o => o.aggro && (o.boss || o.chief));
    if (big && B['Oil of Sharpness'] && DN.melee(e) && !G.Guild.magicW(e.merc) && /slashing|piercing/.test(DN.weapon({ merc: e.merc, swing: true }).t) && !DN.bon(e, 'sharpOil')) { take('Oil of Sharpness'); DN.buff(e, 'sharpOil', G.Res_ROUND * 600, { hit: 3, dmgB: 3 }); say(rt, e, BAG['Oil of Sharpness']); return BAG['Oil of Sharpness']; } // +3 무기 1시간
    if (B['Oil of Slipperiness'] && (DN.held(e) || big) && !DN.bon(e, 'slipOil')) { take('Oil of Slipperiness'); DN.buff(e, 'slipOil', G.Res_ROUND * 4800, { imm_grappled: 1, imm_restrained: 1 }); if (e.cond) { delete e.cond.grappled; delete e.cond.restrained; } e.grabBy = null; say(rt, e, BAG['Oil of Slipperiness']); return BAG['Oil of Slipperiness']; } // 자유 이동 8시간
    if (big && B['Dust of Sneezing and Choking'] && G.ItemX?.dust(rt, e)) { /* 재채기 가루 (SRD) */ } else if (big && B['Dust of Disappearance']) { take('Dust of Disappearance'); const n = G.Res_ROUND * 10 * DN.dice(2, 4); for (const p of rt.party.filter(p => !p.dead && Math.hypot(p.x - e.x, p.y - e.y) <= 2.5)) DN.buff(p, 'invis2', n, {}); say(rt, e, BAG['Dust of Disappearance']); return BAG['Dust of Disappearance']; } // 10피트 발산 · 투명 2d4분 · 공격하면 끝
    for (const t of T.worn(f, e.merc.uid)) { const A = D.ARTS[t.k]; if (!A) continue; for (const p of A.props) if (ACT[p[0]]) { const s = ACT[p[0]](f, rt, e, seen, t, p); if (s) { say(rt, e, s); return s; } } }
    return null;
  };
  // 시듦의 지팡이: 근접 명중에 충전 하나 → 2d10 사령 · 건강 DC 15 실패면 근력 · 건강 판정과 내성 불리 1시간
  const SLAY = ['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'humanoid', 'fiend', 'giant', 'monstrosity', 'ooze', 'plant', 'undead'];
  const hit0 = T.onHit; T.onHit = function (f, rt, a, o, k, nat) { hit0.apply(this, arguments); const m = a.merc; if (!m || o.kind !== 'mon') return;
    if (!DN.melee(a)) { const t = worn(f, m, 'slay'); if (t) { t.slay = t.slay || SLAY[DN.dice(1, SLAY.length) - 1]; if (o.ty === t.slay && o.hp > 0) { const v = DN.dice(6, 10) * (DN.save(o, 'con', 17) ? 0.5 : 1); G.Foe.dtype = 'force'; F().hurt(f, rt, o, v, 'extra', a); G.Foe.dtype = null; f.trinkets = f.trinkets.filter(q => q !== t); } } } if (DN.melee(a) && o.hp > 0) { const t = worn(f, m, 'wither'); if (t && ch(t) > 0) { t.chLeft--; G.Foe.dtype = 'necrotic'; F().hurt(f, rt, o, DN.dice(2, 10), 'extra', a); G.Foe.dtype = null; if (o.hp > 0 && !DN.save(o, 'con', 15)) DN.buff(o, 'wither', G.Res_ROUND * 600, {}); } } if (!DN.melee(a)) { const t = T.of(m).find(q => D.ARTS[q.k]?.props.some(p => p[0] === 'hitR')); if (t && (t.ammo = (t.ammo ?? 20) - 1) <= 0) { f.trinkets = f.trinkets.filter(q => q !== t); G.log(`${D.ARTS[t.k].n} 다 썼다`, 'fantasy'); } } }; // 마법 탄환: 맞히면 평범해진다
  // 힘의 진주: 싸운 뒤 3레벨 이하 쓴 슬롯 하나 (새벽까지 한 번)
  It.pearl = rt => { const f = G.S.w.fantasy; for (const p of rt.party) { if (p.dead || !p.merc) continue; const t = worn(f, p.merc, 'pearl'); if (!t || !ch(t)) continue; const s = G.Res.of(p.merc).sl; for (let i = 2; i >= 0; i--) if ((s[i] || 0) > 0) { s[i]--; t.chLeft--; break; } } }; // G.Res.afterFight가 부른다 (불러오는 순서)
  It.ammoOK = m => T.of(m).some(t => D.ARTS[t.k]?.props.some(p => p[0] === 'hitR') && (t.ammo ?? 20) > 0);
})();
// ── 생물을 부르는 마법 물건 (SRD 5.2.1 원문 표 · 지속 · 재사용) — G.Sum (DESIGN.md 159). 새벽 = 원정 출발 ──
(() => {
  const D = G.D, DN = G.Dnd, T = G.Trinket, It = G.Items, F = () => G.Fantasy, U = G.U;
  const key = en => 'it_' + en.toLowerCase().replace(/[^a-z0-9]+/g, '_'), H1 = 600; // 1시간 = 600라운드
  const add = (en, n, r, props, ic, o = {}) => { D.ARTS[key(en)] = { n, en, ic, r, props, ...o }; It.WEAR.push([en, n, r, null, props, ic, o]); };
  T.PROPS.summonIt = { t: () => '생물을 부른다', sc: () => 7 };
  const dawn = f => f.dawnN || 0;
  const rec0 = It.recharge; It.recharge = function (f) { f.dawnN = dawn(f) + 1; return rec0.apply(this, arguments); };
  const ready = (f, t) => !(t.readyAt > dawn(f));
  const call = (f, rt, e, id, opt) => { const B = G.SRD_MON[id]; return B ? G.Sum.spawn(f, rt, B, { by: e, near: e, src: opt.src, rounds: opt.rounds, conc: opt.conc, n: opt.n }) : null; };
  const big = rt => rt.turn && rt.turn.round <= 2 && rt.mons.some(o => o.aggro && (o.boss || o.chief || o.hp > 60));
  // [영문, 한글, 희귀도, 부르는 생물 id(또는 함수), 지속(라운드), 재사용(새벽 수), 집중]
  const ELEM = [['Bowl of Commanding Water Elementals', '물의 정령 그릇', 'water-elemental'], ['Brazier of Commanding Fire Elementals', '불의 정령 화로', 'fire-elemental'], ['Censer of Controlling Air Elementals', '바람의 정령 향로', 'air-elemental'], ['Stone of Controlling Earth Elementals', '땅의 정령 돌', 'earth-elemental']];
  for (const [en, n, id] of ELEM) add(en, n, 2, [['summonIt', 1]], '🔮', { sum: { id, rounds: H1, wait: 1, conc: true } }); // 새벽마다 한 번 · 집중 1시간 (원문: 1시간 · 다음 새벽)
  add('Horn of Valhalla', '발할라의 뿔피리', 2, [['summonIt', 1]], '📯', { sum: { id: 'berserker', rounds: H1, wait: 7, n: t => t.hornN } }); // 7일에 한 번 · 광전사 2~5 (뿔의 금속)
  add('Ring of Djinni Summoning', '진 소환의 반지', 4, [['summonIt', 1]], '💍', { sum: { id: 'djinni', rounds: H1, wait: 1, conc: true } });
  add('Staff of the Python', '비단뱀 지팡이', 1, [['summonIt', 1]], '🪄', { sum: { id: 'giant-constrictor-snake', rounds: 14400, wait: 0, staff: true } });
  add('Bag of Tricks', '요술 주머니', 1, [['summonIt', 1]], '👜', { sum: { bag: true, rounds: 14400 } });
  add('Figurine of Wondrous Power', '경이로운 조각상', 2, [['summonIt', 1]], '🗿', { sum: { fig: true } });
  add('Efreeti Bottle', '이프리트 병', 3, [['summonIt', 1]], '🍶', { sum: { efreeti: true } });
  // 원문 표
  const HORN = [[40, '은', 2], [75, '놋쇠', 3], [90, '청동', 4], [100, '쇠', 5]];
  const BAGS = { gray: ['weasel', 'giant-rat', 'badger', 'boar', 'panther', 'giant-badger', 'dire-wolf', 'giant-elk'], rust: ['rat', 'owl', 'mastiff', 'goat', 'giant-goat', 'giant-boar', 'lion', 'brown-bear'], tan: ['jackal', 'ape', 'baboon', 'axe-beak', 'black-bear', 'giant-weasel', 'giant-hyena', 'tiger'] };
  const FIG = [['griffon', '청동 그리폰', 6 * H1, 5], ['lion', '황금 사자', H1, 7], ['giant-goat', '상아 염소', 3 * H1, 7], ['elephant', '대리석 코끼리', 24 * H1, 7], ['nightmare', '흑요석 말', 24 * H1, 5], ['mastiff', '마노 개', 6 * H1, 7], ['giant-owl', '사문석 올빼미', 8 * H1, 2], ['raven', '은 까마귀', 12 * H1, 2]];
  const inst = (f, t) => { if (t.k === key('Horn of Valhalla') && !t.hornN) { const r = DN.dice(1, 100); t.hornN = HORN.find(q => r <= q[0])[2]; } if (t.k === key('Bag of Tricks') && !t.bag) t.bag = U.pick(Object.keys(BAGS)); if (t.k === key('Figurine of Wondrous Power') && t.fig == null) t.fig = DN.dice(1, FIG.length) - 1; };
  const turn0 = It.turn; It.turn = function (f, rt, e, seen) {
    const r = turn0.apply(this, arguments); if (r || !e.merc || !seen.length || !big(rt)) return r;
    for (const t of T.worn(f, e.merc.uid)) {
      const A = D.ARTS[t.k], s = A?.sum; if (!s || !ready(f, t)) continue; inst(f, t);
      if (s.conc && e.concK) continue; // 집중은 하나
      if (s.bag) { t.used = t.readyAt > dawn(f) - 1 ? t.used || 0 : 0; if ((t.used || 0) >= 3) continue; const id = BAGS[t.bag][DN.dice(1, 8) - 1]; if (!call(f, rt, e, id, { src: A.en, rounds: s.rounds })) continue; t.used = (t.used || 0) + 1; if (t.used >= 3) t.readyAt = dawn(f) + 1; It.say(rt, e, `${A.n} · ${G.SRD_MON[id]?.n || id}`); return A.n; } // 새벽까지 셋
      if (s.fig) { const [id, nm, rounds, wait] = FIG[t.fig]; if (!call(f, rt, e, id, { src: A.en, rounds, n: nm })) continue; t.readyAt = dawn(f) + wait; It.say(rt, e, nm); return nm; }
      if (s.efreeti) { if (t.spent) continue; const roll = t.eRoll ?? (t.eRoll = DN.dice(1, 10)); t.opens = (t.opens || 0) + 1; if (roll === 1) { const B = G.SRD_MON.efreeti; if (B) { const d = { n: '이프리트', t: 'm_demon', ty: 'elemental', r: 'brute' }; F().spawnMon(rt, f.floor, d, e.x + 1, e.y, false, { aggro: true, spotted: true, major: true, stat: B, hp: B.hp, max: B.hp }); } t.spent = true; It.say(rt, e, '이프리트가 덤빈다!'); return A.n; } if (!call(f, rt, e, 'efreeti', { src: A.en, rounds: H1, n: '이프리트' })) continue; if (roll === 10 || t.opens >= 3) t.spent = true; t.readyAt = dawn(f) + 1; It.say(rt, e, A.n); return A.n; } // 1d10: 1 덤빈다 · 2~9 1시간 섬긴다(세 번) · 10 소원 하나 (소원은 이 게임에 없어 1시간 섬김으로)
      const n = typeof s.n === 'function' ? s.n(t) : 1; let k = 0;
      if (s.conc) G.Res.conc(e, 'item_' + t.k);
      for (let i = 0; i < n; i++) { const c = call(f, rt, e, s.id, { src: A.en, rounds: s.rounds, conc: !!s.conc }); if (c) { k++; if (s.staff) c.staffOf = t; } }
      if (!k) { if (s.conc) G.Res.endConc(e); continue; }
      t.readyAt = dawn(f) + (s.wait || 0); It.say(rt, e, A.n); return A.n;
    }
    // 원소 보석 (가방): 깨면 원소 하나 · 1시간
    const B = It.bag(f); for (const [en, id, nm] of [['Elemental Gem (Blue Sapphire)', 'air-elemental', '공기 원소'], ['Elemental Gem (Emerald)', 'water-elemental', '물 원소'], ['Elemental Gem (Red Corundum)', 'fire-elemental', '불 원소'], ['Elemental Gem (Yellow Diamond)', 'earth-elemental', '땅 원소']]) if (B[en] > 0) { if (!call(f, rt, e, id, { src: 'Elemental Gem', rounds: H1, n: nm })) continue; B[en]--; if (B[en] <= 0) delete B[en]; It.say(rt, e, `원소 보석 · ${nm}`); return '원소 보석'; }
    return null;
  };
  // 원소 보석은 가방으로 (원문 표의 보석 넷 중 하나)
  const GEM = ['Elemental Gem (Blue Sapphire)', 'Elemental Gem (Emerald)', 'Elemental Gem (Red Corundum)', 'Elemental Gem (Yellow Diamond)'];
  for (const en of GEM) It.USE[en] = { en, n: '원소 보석', r: 1, fx: { k: 'bag' } };
  It.USE['Elemental Gem'] = { en: 'Elemental Gem', n: '원소 보석', r: 1, fx: { k: 'bag' } };
  const tr0 = It.treasure; It.treasure = function (f, rt, en) { if (en === 'Elemental Gem') { It.add(f, U.pick(GEM)); return; } return tr0.apply(this, arguments); };
})();
// ── 수영 · 비행 (SRD 원문 · G.Terrain): 깊은 물을 건너고, 날면 땅의 어려운 지형을 안 탄다 ──
(() => {
  const D = G.D, DN = G.Dnd, T = G.Trinket, It = G.Items;
  const key = en => 'it_' + en.toLowerCase().replace(/[^a-z0-9]+/g, '_'), H1 = 600;
  const add = (en, n, r, props, ic, o = {}) => { D.ARTS[key(en)] = { n, en, ic, r, props, ...o }; It.WEAR.push([en, n, r, null, props, ic, o]); };
  T.PROPS.swimSp = { t: v => `수영 속도 ${v}피트`, sc: () => 2 }; T.PROPS.flyIt = { t: v => `비행 ${v}피트`, sc: () => 4 };
  add('Cloak of the Manta Ray', '쥐가오리 망토', 1, [['swimSp', 60]], '🧥');
  add('Ring of Swimming', '수영의 반지', 1, [['swimSp', 40]], '💍');
  { const A = D.ARTS[key('Gloves of Swimming and Climbing')]; if (A) A.props = A.props.concat([['swimSp', 30]]); }
  // 비행: 쓰면 1시간 (날개 장화는 충전 4 · 새벽 1d4, 비행의 날개는 1d12시간 뒤 다시 → 새벽 하나, 빗자루 · 양탄자는 탈것)
  add('Winged Boots', '날개 장화', 1, [['flyIt', 30]], '🥾', { ch: 4, regain: [1, 4] });
  add('Wings of Flying', '비행의 날개', 2, [['flyIt', 60]], '🧥', { ch: 1, regain: [1, 1, 0] });
  add('Broom of Flying', '비행 빗자루', 1, [['flyIt', 50]], '🧹');
  add('Carpet of Flying', '비행 양탄자', 3, [['flyIt', 60]], '🟥');
  It.USE['Potion of Flying'] = { en: 'Potion of Flying', n: '비행의 물약', r: 3, fx: { k: 'bag' } };
  const tr0 = It.treasure; It.treasure = function (f, rt, en) { if (en === 'Potion of Flying') { It.add(f, en); return; } return tr0.apply(this, arguments); };
  // 깊은 물이나 어려운 지형이 곁에 있는 싸움에서만 쓴다 (날 이유가 있을 때)
  const need = (rt, e) => { const m = rt.map; for (let y = Math.round(e.y) - 6; y <= Math.round(e.y) + 6; y++) for (let x = Math.round(e.x) - 6; x <= Math.round(e.x) + 6; x++) { const c = G.Grid.at(m, x, y); if (c === '~' || c === ',' || G.Terrain.diffAt(rt, e, x, y)) return true; } return false; };
  const turn0 = It.turn; It.turn = function (f, rt, e, seen) {
    const r = turn0.apply(this, arguments); if (r || !e.merc || !seen.length || G.Terrain.fly(e) || !need(rt, e)) return r;
    for (const t of T.worn(f, e.merc.uid)) { const A = D.ARTS[t.k], p = A?.props.find(q => q[0] === 'flyIt'); if (!p) continue; if (A.ch) { t.chLeft = t.chLeft ?? A.ch; if (t.chLeft <= 0) continue; t.chLeft--; } DN.buff(e, 'flySp', G.Res_ROUND * H1, {}); It.say(rt, e, A.n); return A.n; }
    const B = It.bag(f); if (B['Potion of Flying'] > 0) { B['Potion of Flying']--; if (B['Potion of Flying'] <= 0) delete B['Potion of Flying']; DN.buff(e, 'flySp', G.Res_ROUND * H1, {}); DN.buff(e, 'hoverSp', G.Res_ROUND * H1, {}); It.say(rt, e, '비행의 물약'); return '비행의 물약'; } // 날 수 있고 공중에 떠 있는다
    return null;
  };
  // 수영 속도: 몸에 붙은 물건 (G.Terrain.swim)
  const has0 = T.has; T.has = (m, k) => (k === 'swimSp' ? T.props(m, 'swimSp').length > 0 : has0(m, k));
})();
