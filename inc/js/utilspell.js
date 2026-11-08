'use strict';
// 전투 밖 주문 (SRD 5.2.1 주문 129개 중 util, DESIGN.md 162): 고르는 칸에 넣은 사람이 원정대에 있으면 그 자리에서 효과가 난다.
// 판정 보조 (G.Mission.roll) · 전투 시작 (G.Res.fightStart) · 층 시작 (G.Flow.init) · 휴식 (사건의 오두막 · 야영) · 귀환 · 되살리기 (G.Exp.home) · 지형 · 비상 대책.
// 슬롯 (SRD): 소마법은 공짜 · 의식(ritual) 주문은 전투 밖에서 슬롯 없이 · 나머지는 그 레벨 슬롯. 원문 재료값(되살리기 다이아몬드)은 금고에서
G.Util = (() => {
  const D = G.D, SK = G.Skill.SK, DN = () => G.Dnd, F = () => G.Fantasy, R6 = n => n * G.Res_ROUND;
  const CLS = { bard: 'bard', cleric: 'cleric', druid: 'scout', paladin: 'paladin', ranger: 'archer', sorcerer: 'mage', warlock: 'warlock', wizard: 'archmage' };
  const lvAt = (c, l) => (c === 'paladin' || c === 'archer' ? [1, 5, 9, 13, 17][l - 1] || 17 : Math.max(1, l * 2 - 1));
  // [id, 이름, 효과 종류 { chk: 판정 · adv | d4 , fight, floor, rest, raise, escape, camp, terr, sum, ward }]
  const T = [
    ['alarm', '경보', { ward: 1, chk: ['perception'] }], ['alter-self', '자기 변형', { chk: ['deception', 'athletics', 'stealth'] }], ['animal-messenger', '동물 전령', { chk: ['animal', 'persuasion'] }],
    ['animal-shapes', '동물 변신', { chk: ['athletics', 'survival'] }], ['antipathy-sympathy', '반감 · 공감', { ward: 1, chk: ['persuasion'] }], ['arcane-lock', '비전 자물쇠', { ward: 1, chk: ['sleight'] }],
    ['arcanists-magic-aura', '비전술사의 마법 오라', { chk: ['deception', 'arcana'] }], ['astral-projection', '아스트랄 투사', { escape: 1 }], ['augury', '징조', { floor: 'augury', chk: ['religion', 'insight'] }],
    ['awaken', '각성', { chk: ['animal', 'nature'] }], ['clone', '복제', { raise: { gp: 3000, pen: 0, self: 1 } }], ['commune-with-nature', '자연과의 교감', { floor: 'map', chk: ['nature', 'survival'] }],
    ['commune', '신과의 교감', { floor: 'lore', chk: ['religion', 'history'] }], ['comprehend-languages', '언어 이해', { chk: ['history', 'arcana', 'persuasion'] }], ['contact-other-plane', '이계와의 접촉', { floor: 'lore', chk: ['arcana', 'history'] }],
    ['contingency', '비상 대책', { contingency: 1 }], ['continual-flame', '꺼지지 않는 불꽃', { fight: 'light', chk: ['perception', 'investigation'] }], ['control-water', '물 조종', { terr: 'water', chk: ['athletics'] }],
    ['control-weather', '날씨 조종', { chk: ['survival', 'nature'] }], ['create-food-and-water', '음식과 물 창조', { camp: 1, chk: ['survival'] }], ['create-or-destroy-water', '물 창조 · 파괴', { chk: ['survival'] }],
    ['create-undead', '언데드 창조', { sum: ['ghoul', 3] }], ['creation', '창조', { chk: ['athletics', 'sleight'] }], ['dancing-lights', '춤추는 빛', { fight: 'light', chk: ['perception'] }],
    ['darkvision', '암시야', { fight: 'dv', chk: ['perception'] }], ['daylight', '일광', { fight: 'sun', chk: ['perception'] }], ['demiplane', '반차원', { rest: 1, escape: 1 }],
    ['detect-evil-and-good', '선악 탐지', { floor: 'evil', chk: ['religion', 'insight'] }], ['detect-poison-and-disease', '독과 질병 탐지', { chk: ['medicine', 'investigation'] }], ['detect-thoughts', '생각 탐지', { chk: ['insight', 'persuasion', 'intimidation'] }],
    ['disguise-self', '변장', { chk: ['deception', 'stealth'] }], ['divination', '점술', { floor: 'lore', chk: ['religion', 'insight'] }], ['dream', '꿈', { chk: ['persuasion', 'intimidation'] }],
    ['druidcraft', '드루이드술', { chk: ['nature'] }], ['elementalism', '원소 다루기', { chk: ['nature', 'performance'] }], ['etherealness', '에테르화', { escape: 1 }],
    ['fabricate', '제작', { chk: ['sleight', 'athletics'] }], ['feather-fall', '깃털 낙하', { terr: 'fall', chk: ['acrobatics'] }], ['find-familiar', '사역마 찾기', { fight: 'familiar', chk: ['perception', 'investigation'] }],
    ['find-steed', '탈것 찾기', { sum: ['warhorse', 1] }], ['find-the-path', '길 찾기', { floor: 'path', chk: ['survival'] }], ['floating-disk', '떠다니는 원반', { carry: 1, chk: ['athletics'] }],
    ['forbiddance', '금제', { ward: 1 }], ['gaseous-form', '기체 변신', { escape: 1, chk: ['stealth', 'acrobatics'] }], ['gate', '관문', { sum: ['deva', 1] }],
    ['geas', '강제', { chk: ['intimidation', 'persuasion'] }], ['gentle-repose', '온화한 휴식', { repose: 1, chk: ['medicine'] }], ['glibness', '달변', { chk: ['persuasion', 'deception', 'intimidation', 'performance'] }],
    ['glyph-of-warding', '수호 문양', { ward: 1, chk: ['arcana'] }], ['guards-and-wards', '경비와 수호', { ward: 1 }], ['guidance', '유도', { d4: 1 }],
    ['hallow', '신성화', { ward: 1, chk: ['religion'] }], ['hallucinatory-terrain', '환각 지형', { chk: ['deception', 'stealth'] }], ['heroes-feast', '영웅의 연회', { feast: 1 }],
    ['identify', '감정', { chk: ['arcana', 'investigation'] }], ['illusory-script', '환영 문자', { chk: ['deception', 'arcana'] }], ['instant-summons', '즉시 소환', { chk: ['sleight'] }],
    ['knock', '열쇠 없이 열기', { chk: ['sleight', 'athletics'] }], ['legend-lore', '전승 지식', { floor: 'lore', chk: ['history', 'arcana', 'religion'] }], ['light', '빛', { fight: 'light', chk: ['perception'] }],
    ['locate-animals-or-plants', '동식물 찾기', { chk: ['survival', 'nature'] }], ['locate-creature', '생물 찾기', { floor: 'mons', chk: ['survival', 'perception'] }], ['locate-object', '물건 찾기', { floor: 'chest', chk: ['investigation'] }],
    ['mage-hand', '마법사의 손', { chk: ['sleight'] }], ['magic-circle', '마법진', { ward: 1, chk: ['arcana'] }], ['magic-jar', '마법 항아리', { chk: ['deception'] }],
    ['magic-mouth', '마법 입', { chk: ['deception', 'performance'] }], ['magnificent-mansion', '장엄한 저택', { rest: 1, camp: 1 }], ['major-image', '고급 환영', { chk: ['deception', 'stealth', 'performance'] }],
    ['meld-into-stone', '돌 속으로', { escape: 1, chk: ['stealth'] }], ['mending', '수선', { chk: ['sleight'] }], ['message', '전언', { chk: ['persuasion', 'stealth'] }],
    ['minor-illusion', '하급 환영', { chk: ['deception', 'stealth'] }], ['mirage-arcane', '비전 신기루', { chk: ['deception', 'stealth'] }], ['move-earth', '대지 이동', { floor: 'path', chk: ['athletics'] }],
    ['nondetection', '탐지 방해', { chk: ['stealth'] }], ['passwall', '벽 통과', { floor: 'path', chk: ['athletics'] }], ['phantom-steed', '환영 탈것', { escape: 1, chk: ['survival'] }],
    ['planar-ally', '이계의 동맹', { sum: ['deva', 1] }], ['planar-binding', '이계 속박', { chk: ['arcana', 'intimidation'] }], ['prestidigitation', '마법 손재주', { chk: ['performance', 'sleight'] }],
    ['private-sanctum', '사적 성소', { rest: 1, ward: 1 }], ['programmed-illusion', '예약된 환영', { chk: ['deception', 'performance'] }], ['project-image', '분신 투영', { chk: ['deception', 'stealth'] }],
    ['purify-food-and-drink', '음식 정화', { camp: 1, chk: ['medicine'] }], ['raise-dead', '사자 소생', { raise: { gp: 500, pen: 4 } }], ['reincarnate', '환생', { raise: { gp: 1000, pen: 0, sp: 1 } }],
    ['resurrection', '부활', { raise: { gp: 1000, pen: 0 } }], ['rope-trick', '밧줄 속임수', { rest: 1 }], ['scrying', '원격 투시', { floor: 'mons', chk: ['perception'] }],
    ['secret-chest', '비밀 상자', { carry: 1 }], ['see-invisibility', '투명체 보기', { fight: 'see', chk: ['perception'] }], ['seeming', '외모 위장', { chk: ['deception', 'stealth'] }],
    ['sending', '전갈', { chk: ['persuasion'] }], ['sequester', '격리', { chk: ['stealth'] }], ['silence', '침묵', { fight: 'silence', chk: ['stealth'] }],
    ['silent-image', '조용한 환영', { chk: ['deception', 'stealth'] }], ['simulacrum', '분신 창조', { sum: ['self', 1] }], ['speak-with-animals', '동물과 대화', { chk: ['animal', 'survival'] }],
    ['speak-with-dead', '망자와 대화', { chk: ['history', 'religion', 'investigation'] }], ['speak-with-plants', '식물과 대화', { chk: ['nature', 'survival'] }], ['spider-climb', '거미 등반', { chk: ['athletics', 'acrobatics'] }],
    ['stone-shape', '돌 모양 바꾸기', { chk: ['athletics', 'sleight'] }], ['symbol', '상징', { ward: 1, chk: ['arcana', 'intimidation'] }], ['telepathic-bond', '정신 연결', { chk: ['insight', 'persuasion'] }],
    ['teleport', '순간 이동', { escape: 1 }], ['teleportation-circle', '순간 이동 진', { escape: 1 }], ['thaumaturgy', '기적술', { chk: ['intimidation', 'performance'] }],
    ['tongues', '언어 통달', { chk: ['persuasion', 'history', 'insight'] }], ['transport-via-plants', '식물 통로', { escape: 1 }], ['tree-stride', '나무 걷기', { escape: 1, chk: ['stealth'] }],
    ['true-resurrection', '진정한 부활', { raise: { gp: 25000, pen: 0 } }], ['true-seeing', '진시야', { fight: 'truesee', chk: ['perception', 'insight'] }], ['tsunami', '해일', { tsunami: 1 }],
    ['unseen-servant', '보이지 않는 하인', { carry: 1, chk: ['sleight'] }], ['water-breathing', '수중 호흡', { terr: 'water', chk: ['athletics'] }], ['water-walk', '수면 보행', { terr: 'water', chk: ['acrobatics', 'athletics'] }],
    ['wind-walk', '바람 걷기', { escape: 1 }], ['wish', '소원', { wish: 1 }], ['word-of-recall', '귀환의 말', { escape: 1 }],
    ['zone-of-truth', '진실의 영역', { chk: ['insight', 'intimidation'] }],
    ['plane-shift', '차원 이동', { escape: 1 }], // SRD 2024: 자원한 생물과 함께 다른 세계로 — 전투에서 적을 보내지 않는다
  ];
  const keyOf = id => 'u_' + id.replace(/-/g, '_');
  const ITEM = {
    'Amulet of Proof against Detection and Location': ['nondetection', 'p'], 'Amulet of the Planes': ['teleport', 'p'], 'Apparatus of the Crab': ['water-breathing', 'p'], 'Bag of Holding': ['floating-disk', 'p'], 'Handy Haversack': ['floating-disk', 'p'], 'Portable Hole': ['secret-chest', 'p'], 'Efficient Quiver': ['unseen-servant', 'p'],
    'Bead of Nourishment': ['create-food-and-water', 'c'], 'Boots of Levitation': ['feather-fall', 'p'], 'Candle of Invocation': ['gate', 'c'], 'Chime of Opening': ['knock', 10], 'Crystal Ball': ['scrying', 1], 'Crystal Ball of Mind Reading': ['scrying', 1, 'detect-thoughts'], 'Crystal Ball of Telepathy': ['scrying', 1, 'telepathic-bond'], 'Crystal Ball of True Seeing': ['scrying', 1, 'true-seeing'],
    'Cube of Force': ['rope-trick', 3, 'guards-and-wards'], 'Cubic Gate': ['teleportation-circle', 3], 'Decanter of Endless Water': ['create-or-destroy-water', 'p'], 'Deck of Illusions': ['major-image', 'p'], 'Dust of Dryness': ['control-water', 'c'], 'Eversmoking Bottle': ['gaseous-form', 'p', 'nondetection'], 'Eyes of Minute Seeing': ['identify', 'p'],
    'Feather Token': ['feather-fall', 'c'], 'Folding Boat': ['water-walk', 'p'], 'Gem of Seeing': ['true-seeing', 3], 'Hat of Disguise': ['disguise-self', 'p'], 'Helm of Comprehending Languages': ['comprehend-languages', 'p'], 'Helm of Telepathy': ['detect-thoughts', 'p'], 'Immovable Rod': ['stone-shape', 'p'], 'Instant Fortress': ['private-sanctum', 'p', 'guards-and-wards'],
    'Lantern of Revealing': ['see-invisibility', 'p', 'light'], 'Marvelous Pigments': ['magnificent-mansion', 'c'], 'Medallion of Thoughts': ['detect-thoughts', 5], 'Oil of Etherealness': ['etherealness', 'c'], 'Philter of Love': ['glibness', 'c'], 'Pipes of the Sewers': ['speak-with-animals', 'p'], 'Potion of Animal Friendship': ['speak-with-animals', 'c'],
    'Potion of Clairvoyance': ['locate-creature', 'c'], 'Potion of Diminution': ['alter-self', 'c'], 'Potion of Gaseous Form': ['gaseous-form', 'c'], 'Potion of Mind Reading': ['detect-thoughts', 'c'], 'Potion of Water Breathing': ['water-breathing', 'c'], 'Ring of Animal Influence': ['speak-with-animals', 3], 'Ring of Elemental Command': ['planar-binding', 'p'],
    'Ring of Feather Falling': ['feather-fall', 'p'], 'Ring of Jumping': ['spider-climb', 'p'], 'Ring of Mind Shielding': ['nondetection', 'p'], 'Ring of Telekinesis': ['mage-hand', 'p'], 'Ring of Three Wishes': ['wish', 'c3'], 'Ring of Water Walking': ['water-walk', 'p'], 'Ring of X-ray Vision': ['locate-object', 'p'], 'Rod of Security': ['magnificent-mansion', 1, 'guards-and-wards'],
    'Rope of Climbing': ['spider-climb', 'p'], 'Sending Stones': ['sending', 1], 'Slippers of Spider Climbing': ['spider-climb', 'p'], 'Sovereign Glue': ['fabricate', 'c'], 'Universal Solvent': ['knock', 'c'], 'Wand of Enemy Detection': ['locate-creature', 7], 'Wand of Magic Detection': ['locate-object', 3], 'Wand of Secrets': ['find-the-path', 3], 'Well of Many Worlds': ['teleport', 'p'],
    'Plate Armor of Etherealness': ['etherealness', 1], 'Trident of Fish Command': ['speak-with-animals', 3], 'Hat of Many Spells': ['identify', 'p'], 'Helm of Teleportation': ['teleport', 3],
  };
  const BY = {}, FX = {};
  for (const [id, n, fx] of T) {
    const o = G.SRD_SP[id]; if (!o) continue; const k = keyOf(id), lv = {};
    for (const c of o.cls) if (CLS[c]) lv[CLS[c]] = lvAt(CLS[c], Math.max(1, o.lv));
    D.MSKILLS[k] = { n, en: o.en, t: 'ui_star', ic: 's_spellcasting', d: descOf(fx, o), lv, noAuto: true, util: true };
    SK[k] = { when: () => false, run() {} }; D.SK_RANGE[k] = 0;
    for (const c in lv) if (D.MPOOL[c] && !D.MPOOL[c].includes(k)) D.MPOOL[c].push(k); // 데이터 목록 (대표 기술 목록 POOL은 그대로) — 고르는 칸에는 G.Guild.pickable이 넣는다
    BY[id] = k; FX[k] = { ...fx, id, lv: o.lv, ritual: !!o.srd?.ritual };
  }
  function descOf(fx, o) {
    const s = [];
    if (fx.chk) s.push(`판정 이점: ${fx.chk.map(k => DN().SKILL_N?.[k] || k).join(' · ')}`); if (fx.d4) s.push('판정 +1d4');
    if (fx.fight) s.push({ light: '어두우면 빛', dv: '암시야 150피트', sun: '일광 (햇빛)', see: '투명체 보기', truesee: '진시야', silence: '주문쟁이 몬스터 침묵', familiar: '사역마의 돕기' }[fx.fight]);
    if (fx.floor) s.push({ augury: '위험한 방 경고', map: '층 전체 지도', lore: '이 층 몬스터 정보', evil: '언데드 · 악마 방', path: '계단까지', mons: '몬스터 있는 방', chest: '보물 자리' }[fx.floor]);
    if (fx.rest) s.push('안전한 휴식처'); if (fx.ward) s.push('휴식 중 기습 없음'); if (fx.camp) s.push('야영 물자 없이'); if (fx.escape) s.push('짐을 잃지 않고 귀환');
    if (fx.raise) s.push(`죽은 동료 되살리기 (${fx.raise.gp} GP${fx.raise.pen ? ' · d20 −4' : ''})`); if (fx.terr) s.push(fx.terr === 'fall' ? '추락 피해 없음' : '물 위 · 물속');
    if (fx.sum) s.push('싸울 때 부른다'); if (fx.feast) s.push('긴 휴식: 최대 체력 +2d10 · 중독 · 공포 면역'); if (fx.contingency) s.push('쓰러질 때 치유 5레벨');
    if (fx.carry) s.push('짐 +'); if (fx.repose) s.push('되살리기 기한'); if (fx.tsunami) s.push('물의 벽 6d10'); if (fx.wish) s.push('8레벨 이하 주문 하나');
    return s.join(' · ') + (o.srd?.ritual ? ' · 의식' : '');
  }
  // 그 주문을 고른 사람 · 쓸 수 있으면 슬롯을 낸다 (소마법 · 전투 밖 의식은 공짜)
  const IBY = {}; // 효과 키 → 물건 이름들
  for (const en in ITEM) for (const id of [ITEM[en][0], ITEM[en][2]].filter(Boolean)) (IBY[keyOf(id)] = IBY[keyOf(id)] || []).push(en);
  const fz = () => G.S.w.fantasy;
  const haveItem = en => (G.Items.bag(fz())[en] || 0) > 0 || G.Trinket.all(fz()).some(t => t.on != null && G.Trinket.def(t)?.en === en);
  const itemLeft = en => { const u = ITEM[en][1], used = (fz().itemUse || {})[en] || 0; return u === 'p' || u === 'c' || u === 'c3' ? true : used < u; };
  const itemOf = (rt, k) => (IBY[k] || []).find(en => haveItem(en) && itemLeft(en)) || null;
  const holder = rt => (rt.party || []).find(p => p.merc && !p.dead && !p.dying) || null;
  // 위저드 (SRD): 의식 숙련 — 주문책의 의식 주문은 준비하지 않아도 의식으로 · 주문 기억 — 짧은 휴식마다 준비 주문 하나를 바꾼다 (고르지 않은 주문 하나)
  const wiz = (rt, k) => { const q = FX[k]; if (!q) return null; const id = q.id, sp = G.SRD_SP[id]; if (!sp?.cls.includes('wizard')) return null; return (rt.party || []).find(p => p.merc && !p.dead && !p.dying && p.merc.cls === 'archmage' && G.Guild.skLv('archmage', k) <= p.merc.lv && ((q.ritual) || (p.merc.lv >= 5 && !G.Res.of(p.merc).sp.memo))) || null; };
  const who = (rt, k) => G.Pool.who(rt, k) || wiz(rt, k) || (itemOf(rt, k) ? holder(rt) : null);
  // 물건을 쓴다: 쓰면 사라짐 · 충전 (긴 휴식에 돌아온다) · 세 소원은 셋
  function useItem(en) { const f = fz(), u = ITEM[en][1], B = G.Items.bag(f); if (u === 'c') { if (B[en] > 0) B[en]--; } else if (u === 'c3') { f.itemUse = f.itemUse || {}; f.itemUse[en] = (f.itemUse[en] || 0) + 1; if (f.itemUse[en] >= 3) { if (B[en] > 0) B[en]--; delete f.itemUse[en]; } } else if (u !== 'p') { f.itemUse = f.itemUse || {}; f.itemUse[en] = (f.itemUse[en] || 0) + 1; } G.log?.(`${G.Items.SELL_KO?.[en] || en} 사용`, 'fantasy'); }
  function cast(rt, k, inFight) {
    if (!G.Pool.who(rt, k) && wiz(rt, k)) { const p = wiz(rt, k), q = FX[k]; if (!q.ritual || inFight) { const s = G.Res.of(p.merc).sp; if (q.lv && !G.Res.can(p.merc, k, { slot: q.lv })) return null; if (q.lv) G.Res.pay(p.merc, k, { slot: q.lv }); s.memo = true; } G.Pool.used(p, k); return p; } // 의식 숙련 · 주문 기억 (짧은 휴식에 다시)
    if (!G.Pool.who(rt, k)) { const en = itemOf(rt, k); if (!en) return null; useItem(en); return holder(rt); } // 물건으로
    const p = who(rt, k); if (!p) return null; const q = FX[k];
    if (q.lv === 0 || (q.ritual && !inFight)) { G.Pool.used(p, k); return p; }
    const res = { slot: q.lv }; if (!G.Res.can(p.merc, k, res)) return null; G.Res.pay(p.merc, k, res); G.Pool.used(p, k); return p;
  }
  const crewOf = rt => (rt.party || []).filter(p => p.merc && !p.dead && !p.dying);
  const dm = (rt, s) => G.Turn.dm?.(rt, s);
  const U = {
    FX, BY, keyOf, ITEM, haveItem,
    longRest() { const f = fz(); if (f) { const w = f.itemUse?.['Ring of Three Wishes']; f.itemUse = w ? { 'Ring of Three Wishes': w } : {}; } }, // 충전식 물건은 긴 휴식에 돌아온다 (세 소원은 남은 수 유지)

    has: (rt, pred) => Object.keys(FX).filter(k => pred(FX[k])).map(k => [k, who(rt, k)]).find(([, p]) => p),
    // ── 판정 (G.Mission.roll): 실패했으면 도와줄 주문 하나 — { adv } 다시 굴림 · { b } 더하기 ──
    help(rt, sk, p0) {
      for (const k in FX) { const q = FX[k]; if (q.d4) { const p = who(rt, k); if (p && p !== p0 && cast(rt, k)) return { b: DN().dice(1, 4), k }; } } // 유도 (SRD): 다른 생물에게 · 1d4
      for (const k in FX) { const q = FX[k]; if (!q.chk?.includes(sk)) continue; if (cast(rt, k)) return { adv: true, k }; }
      return null;
    },
    // ── 전투 시작 ──
    fightStart(f, rt) {
      if (!rt?.map || !rt.party) return; G.ItemX?.fightStart(f, rt);
      const mons = rt.mons.filter(o => o.aggro && o.hp > 0), dark = () => crewOf(rt).some(p => G.Light && G.Light.level(rt, p.x, p.y) < 2 && !G.Light.darkvision(p));
      for (const k in FX) {
        const q = FX[k], p = who(rt, k); if (!p || !q.fight) continue;
        if (q.fight === 'light' && dark() && !DN().bon(p, 'lightSp') && cast(rt, k, true)) DN().buff(p, 'lightSp', R6(600), {}); // 빛 · 춤추는 빛 · 꺼지지 않는 불꽃
        else if (q.fight === 'sun' && (mons.some(o => G.Foe.has(o, 'sunsens')) || (rt.darks || []).length) && cast(rt, k, true)) { (rt.suns = rt.suns || []).push({ x: p.x, y: p.y, until: G.S.runTime + R6(600), lv: 3 }); dm(rt, '일광'); } // 일광 (SRD): 60피트 햇빛 · 3레벨 이하의 마법적 어둠을 걷는다
        else if (q.fight === 'dv' && dark()) { const need = crewOf(rt).filter(o => !G.Light.darkvision(o)); if (need.length && cast(rt, k, true)) for (const o of need.slice(0, 1)) o.dvSpell = 150; } // 암시야: 한 명 (만지는 생물)
        else if ((q.fight === 'see' || q.fight === 'truesee') && mons.some(o => DN().invis(o) || o.stat?.tr?.includes('incorp') || (q.fight === 'truesee' && (rt.darks || []).length)) && cast(rt, k, true)) { p.seeInv = true; if (q.fight === 'truesee') p.trueSee = true; }
        else if (q.fight === 'silence') { const c = mons.find(o => o.stat?.acts?.some(a => a.kind === 'spells') || o.stat?.id === 'mage'); if (c && cast(rt, k, true)) { (rt.silences = rt.silences || []).push({ x: c.x, y: c.y, r: 4, by: p }); dm(rt, '침묵'); } } // 침묵 (SRD): 20피트 구 — 안에서는 말로 하는 주문을 못 쓴다
        else if (q.fight === 'familiar' && !p.famOn && cast(rt, k)) p.famOn = true; // 사역마 (SRD): 돕기 — 주인의 공격에 이점 (라운드마다)
      }
      for (const k in FX) { const q = FX[k]; if (!q.sum) continue; const p = who(rt, k); if (!p || !mons.length || !G.Sum) continue; const s = G.Res.of(p.merc).sp; if (s['sum_' + k]) continue; if (!cast(rt, k, true)) continue; s['sum_' + k] = true; // 소환은 긴 휴식에 한 번 (언데드 창조 · 탈것 · 동맹 · 관문)
        const id = q.sum[0], block = id === 'self' ? null : G.SRD_MON[id]; if (id === 'self') { const b = G.SRD_MON.mage; if (b) G.Sum.spawn(f, rt, { ...b, hp: Math.ceil(p.max / 2) }, { by: p, n: `${p.merc.name}의 분신` }); continue; } if (!block) continue;
        for (let i = 0; i < q.sum[1]; i++) G.Sum.spawn(f, rt, block, { by: p }); }
    },
    // 침묵 안의 몬스터는 주문을 못 쓴다
    silenced: (rt, e) => (rt.silences || []).some(s => Math.hypot(e.x - s.x, e.y - s.y) <= s.r + 0.5 && s.by && !s.by.dead),
    // 사역마의 돕기 (주인의 차례 시작에): 이번 라운드 공격 이점
    turn(f, rt, e) { if (e.famOn && rt.mons.some(o => o.aggro && o.hp > 0)) DN().buff(e, 'famHelp', R6(1), { adv: 1 }); },
    // ── 층 시작: 정보 주문 (의식이면 슬롯 없이) ──
    floor(f, rt) {
      if (!rt?.map || !rt.party) return; const m = rt.map, rooms = m.rooms || [], mons = rt.mons.filter(o => o.hp > 0);
      { const w = rt.party.find(p => p.merc && !p.dead && p.merc.cls === 'warlock' && p.merc.lv >= 9 && !G.Res.of(p.merc).sp.patron); if (w && mons.length) { G.Res.of(w.merc).sp.patron = true; for (const o of mons) G.Lore.observe?.(f, rt, o); dm(rt, `${w.merc.name} · 후원자와 교신`); } } // 후원자와 교신 (SRD 워락 9): 긴 휴식에 한 번, 이계와의 접촉을 슬롯 없이 · 저절로 성공
      for (const k in FX) { const q = FX[k]; if (!q.floor || !who(rt, k)) continue;
        const roomOf = e => rooms.find(r => e.x >= r.x && e.y >= r.y && e.x < r.x + r.w && e.y < r.y + r.h);
        if (q.floor === 'path') { const r = m.end && rooms.find(r => m.end.cx >= r.x && m.end.cy >= r.y && m.end.cx < r.x + r.w && m.end.cy < r.y + r.h); if (r && cast(rt, k)) { G.Sight.revealRoom(rt, r); dm(rt, '길이 보인다'); } }
        else if (q.floor === 'chest') { const c = rt.chests.find(c => !c.opened); if (c && cast(rt, k)) G.Skill.reveal?.(rt, c.x, c.y, 2); }
        else if (q.floor === 'mons' || q.floor === 'evil') { const l = mons.filter(o => q.floor === 'mons' || o.ty === 'undead' || o.ty === 'fiend' || o.ty === 'aberration'); const r = l.length && roomOf(l[0]); if (r && cast(rt, k)) G.Sight.revealRoom(rt, r); }
        else if (q.floor === 'map') { if (cast(rt, k)) for (const r of rooms) G.Sight.revealRoom(rt, r); }
        else if (q.floor === 'lore') { if (mons.length && cast(rt, k)) { for (const o of mons) G.Lore.observe?.(f, rt, o); dm(rt, '이 층에 무엇이 있는지 안다'); } }
        else if (q.floor === 'augury') { const big = mons.filter(o => o.boss || o.chief || (o.stat?.cr || 0) >= 5)[0]; if (big && cast(rt, k)) dm(rt, `징조: 화 (${big.n})`); }
      }
    },
    // 안전한 휴식처 (사건의 x_hut 선택지): 오두막 · 밧줄 속임수 · 저택 · 반차원 · 성소
    rest: rt => who(rt, 'x_hut') || U.has(rt, q => q.rest)?.[1] || null,
    // 휴식을 지키는 주문 (기습 없음)
    ward: rt => U.has(rt, q => q.ward)?.[1] || null,
    // 야영 물자 없이 (음식과 물 창조 · 저택 · 정화)
    camp: rt => U.has(rt, q => q.camp)?.[1] || null,
    // 귀환 (순간 이동 · 귀환의 말 …): 짐을 잃지 않는다. 쓴 사람
    escape(rt) { for (const k in FX) if (FX[k].escape && who(rt, k)) { const p = cast(rt, k); if (p) return p; } return null; },
    // 추락 (깃털 낙하 · 반응): 피해 없음
    fall(rt, e) { if (!e.merc) return false; for (const k in FX) { if (FX[k].terr !== 'fall') continue; const w = who(rt, k); if (!w || !DN().react(w)) continue; const p = cast(rt, k, true); if (p) { DN().useReact(w); return true; } } return false; },
    // 물 (수면 보행 · 수중 호흡 · 물 조종): 원정대가 깊은 물을 건넌다
    water: (rt, e) => !!(e?.merc && rt && U.has(rt, q => q.terr === 'water')),
    // 짐 (떠다니는 원반 · 보이지 않는 하인 · 비밀 상자): 짐 한도 +
    carry: rt => (U.has(rt, q => q.carry) ? 1 : 0),
    // 비상 대책 (SRD 6레벨): 쓰러질 때 미리 걸어 둔 치유 (5레벨 치유 10d8 + 주문 능력)
    contingency(rt, p) { const k = BY.contingency; if (!k || !p.merc || !G.Guild.picks(p.merc).includes(k)) return false; const s = G.Res.of(p.merc).sp; if (s.contUsed) return false; s.contUsed = true; const v = DN().dice(10, 8) + Math.max(0, DN().mod(DN().ab(p.merc)[DN().cls(p.merc).spAb || 'int'] || 10)); p.hp = Math.min(p.max, v); G.Pool.used(p, k); dm(rt, `${p.merc.name} · 비상 대책`); return true; },
    // 영웅의 연회 (긴 휴식): 최대 체력 +2d10 · 중독 · 공포 면역 (다음 긴 휴식까지)
    feast(list) { const k = BY['heroes-feast']; if (!k) return; const cook = list.find(m => m && G.Guild.picks(m).includes(k) && G.Res.can(m, k, { slot: 6 })); if (!cook) return; G.Res.pay(cook, k, { slot: 6 }); for (const m of list) if (m) m.feast = DN().dice(2, 10); },
    // ── 되살리기 (귀환할 때): 이번 원정에 죽은 동료를 원문 재료값으로. 사자 소생은 d20 −4 (긴 휴식마다 1씩) · 환생은 종족을 새로 굴린다 ──
    raise(f) {
      const crew = G.Guild.crew(f).filter(m => !(m.inj > 0)), out = [];
      for (const d of (f.fallen || []).filter(d => d.snap && !d.raised && d.run === f.lastHome)) {
        let best = null; for (const k in FX) { const q = FX[k].raise; if (!q || q.self) continue; const m = crew.find(c => G.Guild.picks(c).includes(k) && G.Res.can(c, k, { slot: FX[k].lv })); if (m && f.gold >= q.gp && (!best || q.gp < best.q.gp)) best = { k, q, m }; }
        if (!best && haveItem('Ring of Three Wishes')) { useItem('Ring of Three Wishes'); best = { k: BY.wish, q: { gp: 0, pen: 0 }, m: null }; }
        if (!best) continue; f.gold -= best.q.gp; if (best.m)  G.Res.pay(best.m, best.k, { slot: FX[best.k].lv }); const r = JSON.parse(d.snap); r.uid = r.uid ?? d.uid; r.raisePen = best.q.pen; r.inj = 0; r.downs = 0;
        if (best.q.sp) { const all = Object.keys(G.SRD_RACE || {}); if (all.length) r.sp = all[Math.floor(Math.random() * all.length)]; }
        f.mercs.push(r); d.raised = true; out.push(`${r.name} · ${D.MSKILLS[best.k].n}`);
      }
      if (out.length) G.log(`되살렸다 · ${out.join(', ')}`, 'fantasy', 'good');
      return out;
    },
    // 해일 (SRD 8레벨): 물의 벽 — 근력 내성, 실패 6d10 둔기 · 성공 절반 (한 번 덮친다)
    tsunami(c, x) { const H = G.Skill.H, q = H.AREA.cast(x, c, 'u_tsunami', { shape: 'cube', ft: 50 }); /* 물의 벽: 두께 50피트 — 범위 안 한 지점에서 밀려온다 */ if (!q) return false; G.Foe.dtype = 'bludgeoning'; H.AREA.save(x, c, q.list, 'str', [6, 10, 0], true); G.Foe.dtype = null; return true; },
  };
  // 해일 · 소원은 전투 주문 (그 레벨 슬롯)
  if (BY.tsunami) SK[BY.tsunami] = { res: { slot: 8 }, base: 8, conc: false, when: (c, x) => x.seen.length >= 2, run: (c, x) => U.tsunami(c, x) };
  if (BY.wish) SK[BY.wish] = { res: { slot: 9 }, base: 9, when: (c, x) => x.seen.length >= 1, run(c, x) { // 소원 (SRD): 8레벨 이하 주문 하나를 그대로 — 원정대가 아는 가장 높은 전투 주문
    const best = Object.keys(SK).filter(k => SK[k].run && !SK[k].noCombat && (SK[k].res?.slot || 0) <= 8 && (SK[k].res?.slot || 0) >= 5 && k !== BY.wish && SK[k].when?.(c, x)).sort((a, b) => (SK[b].res.slot || 0) - (SK[a].res.slot || 0))[0];
    return best ? SK[best].run(c, { ...x, slot: 9 }) : false; } };
  for (const k of [BY.tsunami, BY.wish]) if (k && D.MSKILLS[k]) { delete D.MSKILLS[k].noAuto; D.MSKILLS[k].util = false; }
  return U;
})();

// ── 남은 마법 물건 (SRD 5.2.1, DESIGN.md 164): 경이의 완드 · 독 물약 · 재채기 가루 · 삼키는 가방 · 소멸의 구 + 구의 부적 · 흡수의 막대 · 주문 저장의 반지
//    · 차원 족쇄 · 생명 포획 거울 · 편자 둘 · 골렘 교본 · 쓸모 있는 물건의 로브 · 콩 주머니. 신비한 카드(뽑을지는 플레이어의 몫) · 장수의 물약(나이 없음)은 팔기만
G.ItemX = (() => {
  const DN = () => G.Dnd, F = () => G.Fantasy, fz = () => G.S.w.fantasy, B = () => G.Items.bag(fz()), R6 = n => n * G.Res_ROUND, H = () => G.Skill.H, SK = G.Skill.SK;
  const has = en => (B()[en] || 0) > 0, take = en => { if (B()[en] > 0) B()[en]--; };
  const crew = rt => (rt.party || []).filter(p => p.merc && !p.dead && !p.dying);
  // 감정할 수 있나 (감정 · 마법 탐지 · 세밀한 눈 · 주문의 모자 · 위저드 의식): 독 물약 · 재채기 가루 · 삼키는 가방을 알아본다
  const knows = rt => !!(G.Pool.who(rt, 'x_detect') || G.Util.FX && (G.Pool.who(rt, 'u_identify') || crew(rt).some(p => p.merc.cls === 'archmage')) || has('Eyes of Minute Seeing') || has('Hat of Many Spells'));
  const roll = (n, d) => DN().dice(n, d), keyByEn = en => Object.keys(SK).find(k => G.D.MSKILLS[k]?.en === en && SK[k].run && !SK[k].noCombat);
  const X = {
    // 독 물약 (SRD): 치유 물약처럼 보인다 — 감정 못 했으면 치유 물약 대신 마실 수 있다. 4d6 독 · 건강 DC 13 실패 중독 1시간
    drink(rt, who) { if (!has('Potion of Poison') || knows(rt)) return false; const heal = ['Potion of Healing', 'Potion of Greater Healing', 'Potion of Superior Healing', 'Potion of Supreme Healing'].reduce((a, en) => a + (B()[en] || 0), 0); if (Math.random() >= B()['Potion of Poison'] / (B()['Potion of Poison'] + heal)) return false; take('Potion of Poison'); G.Foe.dtype = 'poison'; G.Foe.blast(fz(), rt, { atk: 1 }, who, roll(4, 6), null, 0, 'poison'); G.Foe.dtype = null; if (!DN().save(who, 'con', 13)) DN().give(rt, who, 'poisoned', R6(600)); G.Dnd.flip(who, '독 물약이었다', '#9fe79f'); return true; },
    // 재채기 가루 (SRD): 사라짐의 가루처럼 보인다 — 감정 못 했으면 그것 대신 뿌린다. 자신 둘레 30피트, 건강 DC 15 — 행동 불능 · 질식 (차례 끝마다 다시)
    dust(rt, e) { if (!has('Dust of Sneezing and Choking') || knows(rt) || (has('Dust of Disappearance') && Math.random() < 0.5)) return false; take('Dust of Sneezing and Choking'); G.Turn.dm?.(rt, '재채기 가루였다!'); for (const o of rt.party.concat(rt.mons).filter(o => !o.dead && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) <= 6.5)) { if (['construct', 'elemental', 'ooze', 'plant', 'undead'].includes(o.ty) || DN().save(o, 'con', 15)) continue; DN().give(rt, o, 'incapacitated', R6(10)); (o.rep = o.rep || []).push({ k: 'incapacitated', ab: 'con', dc: 15 }); } return true; },
    // 삼키는 가방 (SRD): 보관 가방처럼 보인다 — 모르고 짐을 넣으면 사라진다 (짐 한도는 늘지만 늘어난 몫은 잃는다)
    devour: rt => has('Bag of Devouring') && !has('Bag of Holding') && !knows(rt),
    // 차원 족쇄 (SRD): 행동 불능인 생물에게 — 순간 이동 · 에테르 · 다른 세계로 가지 못한다
    shackle(rt, e) { if (!has('Dimensional Shackles') || e.shackled || !DN().out(e) || !crew(rt).some(p => Math.hypot(p.x - e.x, p.y - e.y) <= 1.6)) return; e.shackled = true; G.Dnd.flip(e, '차원 족쇄', '#c9a6ff'); },
    // 편자 (SRD): 말 · 그와 비슷한 생물 — 속도의 편자 +30피트 · 바람의 편자 어려운 지형 무시
    horse(e) { if (!/horse|pony|mule|camel|elk|warhorse/.test(e.stat?.id || '')) return; if (has('Horseshoes of Speed')) e.mvB = (e.mvB || 0) + 6; if (has('Horseshoes of a Zephyr')) e.hover = true; },
    // 생명 포획 거울 (SRD): 벽에 걸고 켜야 한다 — 기습당하지 않은 싸움에서 대형을 갖출 때. 30피트 안에서 비친 생물 매력 DC 15, 실패면 갇힌다 (열둘까지)
    mirror(f, rt) { if (!has('Mirror of Life Trapping') || rt.nextFirst === 'foes') return; const s = fz(); s.mirrorN = s.mirrorN || 0; const lead = crew(rt)[0]; if (!lead) return; for (const o of rt.mons.filter(o => o.aggro && o.hp > 0 && !DN().has(o, 'blinded') && Math.hypot(o.x - lead.x, o.y - lead.y) <= 6.5 && F().sees(rt.map, lead, o))) { if (s.mirrorN >= 12) break; if (DN().save(o, 'cha', 15)) continue; s.mirrorN++; o.hp = 0; G.Turn.dm?.(rt, `${o.n} · 거울에 갇혔다`); F().kill(f, rt, o, 'smite', lead); } },
    // 흡수의 막대 (SRD): 나만 노리는 주문 (범위 없음)을 반응으로 없애고 그 레벨을 담는다 (평생 50)
    absorb(rt, t, lv) { if (!has('Rod of Absorption') || !t?.merc || t !== crew(rt)[0] || !DN().react(t)) return false; const s = fz(); if ((s.rodLv || 0) + lv > 50) return false; s.rodLv = (s.rodLv || 0) + lv; DN().useReact(t); G.Dnd.flip(t, '흡수의 막대', '#c9a6ff'); return true; },
    // 주문 저장의 반지 (SRD): 5레벨까지 — 시전자가 긴 휴식 전에 넣어 둔다. 슬롯이 없을 때 그 레벨만큼 꺼내 쓴다
    ringLeft: () => (has('Ring of Spell Storing') ? (fz().ringLv ?? (fz().ringLv = Math.max(0, roll(1, 6) - 1))) : 0),
    ringUse(lv) { const s = fz(); if (X.ringLeft() < lv) return false; s.ringLv -= lv; return true; },
    longRest(list) { const s = fz(); if (has('Ring of Spell Storing') && list.some(m => m && ['archmage', 'mage', 'cleric', 'scout', 'bard', 'warlock'].includes(m.cls))) s.ringLv = 5; if (has('Wand of Wonder')) { s.wandCh = Math.min(7, (s.wandCh ?? 7) + roll(1, 6) + 1); } },
    // 골렘 교본 (SRD): 금고에서 재료값을 내고 만든다 — 흙 65000 · 살덩이 50000 · 쇠 100000 · 돌 80000 GP. 싸울 때마다 함께
    golem(f) { if (!has('Manual of Golems') || f.golem) return; const opts = [['flesh-golem', 50000], ['clay-golem', 65000], ['stone-golem', 80000], ['iron-golem', 100000]].filter(([, g]) => f.gold >= g * 1.5); const o = opts[opts.length - 1]; if (!o) return; f.gold -= o[1]; take('Manual of Golems'); f.golem = o[0]; G.log?.(`골렘을 만들었다 · ${o[0]}`, 'fantasy', 'good'); },
    fightStart(f, rt) { if (f.golem && G.SRD_MON[f.golem] && !(rt.sums || []).some(s => s.golemOf)) { const g = G.Sum.spawn(f, rt, G.SRD_MON[f.golem], { by: crew(rt)[0] }); if (g) g.golemOf = true; } for (const s of rt.sums || []) X.horse(s); X.mirror(f, rt); if (fz().mastiffs) { for (let i = 0; i < fz().mastiffs; i++) G.Sum.spawn(f, rt, G.SRD_MON.mastiff, { by: crew(rt)[0] }); fz().mastiffs = 0; } },
    // 쓸모 있는 물건의 로브 (SRD): 단검 · 등불 · 거울 · 장대 · 밧줄 · 자루 + 4d4 개 무작위 조각. 주웠을 때 떼어 쓴다
    robe(f) { const n = roll(4, 4), got = []; for (let i = 0; i < n; i++) { const r = roll(1, 100); if (r <= 8) { f.gold += 100; got.push('100 GP'); } else if (r <= 15) { f.gold += 500; got.push('은상자 500 GP'); } else if (r <= 22) got.push('쇠문'); else if (r <= 30) { f.gold += 1000; got.push('보석 1000 GP'); } else if (r <= 44) got.push('사다리'); else if (r <= 51) got.push('승용마'); else if (r <= 59) got.push('구덩이'); else if (r <= 68) { B()['Potion of Healing'] = (B()['Potion of Healing'] || 0) + 4; got.push('치유 물약 넷'); } else if (r <= 75) got.push('나룻배'); else if (r <= 83) { const rt0 = G.RT.fantasy; if (rt0?.hero) G.Items.scroll?.(f, rt0, roll(1, 3) * 4); else { const B0 = B(); B0['Spell Scroll'] = (B0['Spell Scroll'] || 0) + 1; } got.push('주문 두루마리'); } else if (r <= 90) { fz().mastiffs = (fz().mastiffs || 0) + 2; got.push('마스티프 둘'); } else if (r <= 96) got.push('창문'); else got.push('공성 망치'); } G.log?.(`쓸모 있는 물건의 로브 · ${got.join(', ')}`, 'fantasy', 'good'); },
    // 콩 주머니 (SRD): 야영할 때 하나를 심는다 — 1분 뒤 표에 따라
    bean(f, rt) { if (!has('Bag of Beans')) return; const lead = crew(rt)[0]; if (!lead) return; take('Bag of Beans'); const r = roll(1, 100), NM = { treant: '트리언트', bulette: '불레트', mummy: '미라', 'mummy-lord': '미라 군주' };
      const spawn = id => F().spawnMon(rt, f.floor, { n: NM[id], ...G.D.F.mon[NM[id]] }, Math.round(lead.x) + 2, Math.round(lead.y), false, { aggro: true, spotted: true, major: true });
      let s = '콩에서 아무 일도 없었다'; if (r <= 1) s = '독버섯이 돋았다'; else if (r <= 10) s = '간헐천이 솟았다'; else if (r <= 20) { if (roll(1, 2) === 1) { spawn('treant'); s = '나무 정령이 솟았다 — 적의를 품었다'; } else s = '선한 나무 정령이 솟았다'; } else if (r <= 30) s = '돌 석상이 일어나 욕을 한다'; else if (r <= 40) s = '푸른 모닥불'; else if (r <= 50) s = '비명 버섯 셋'; else if (r <= 60) s = '분홍 두꺼비들'; else if (r <= 70) { spawn('bulette'); s = '굶주린 불레트가 땅을 뚫고 나왔다'; } else if (r <= 80) { const k = roll(1, 8), L = ['Potion of Healing', 'Potion of Greater Healing', 'Potion of Climbing', 'Potion of Heroism', 'Potion of Water Breathing']; for (let i = 0; i < k; i++) { const en = L[roll(1, L.length) - 1]; B()[en] = (B()[en] || 0) + 1; } s = `과일나무 · 물약 열매 ${k}`; } else if (r <= 90) s = '무지개 알 둥지 (아무도 먹지 않았다)'; else if (r <= 95) { spawn(roll(1, 2) === 1 ? 'mummy' : 'mummy-lord'); s = '피라미드 · 무덤의 주인이 깨어났다'; } else s = '거대한 콩나무';
      G.Turn.dm?.(rt, s); G.log?.(`콩 주머니 · ${s}`, 'fantasy'); },
    // 소멸의 구 + 구의 부적 (SRD): 지능(비전) DC 25 (부적이면 이점)로 조종 — 닿은 생물 8d10 역장. 부적이 없으면 쓰지 않는다
    sphereOK: rt => has('Sphere of Annihilation') && has('Talisman of the Sphere'),
  };
  // 동료의 행동: 경이의 완드 · 소멸의 구 (고르는 칸 없이, 들고 있으면)
  SK.it_wonder = { when: (c, x) => has('Wand of Wonder') && (fz().wandCh ?? 7) > 0 && x.seen.length >= 1 && c === crew(x.rt).slice().sort((p, q) => DN().dc(q) - DN().dc(p))[0], run(c, x) { // 주문 DC가 가장 높은 동료가 든다
    const s = fz(); s.wandCh = (s.wandCh ?? 7) - 1; if (s.wandCh <= 0 && roll(1, 20) === 1) take('Wand of Wonder'); const r = roll(1, 100), t = H().pick(x); c.bf = c.bf || {}; DN().buff(c, 'wandDC', 1, { dcB: 15 - DN().dc(c) }); let ran = true;
    const castEn = en => { const k = keyByEn(en); if (!k) return; G.Foe.dtype = G.Skill.skillType(k, c); SK[k].run(c, { ...x, slot: G.SRD_SP[Object.keys(G.SRD_SP).find(i => G.SRD_SP[i].en === en)]?.lv || 1 }); G.Foe.dtype = null; };
    if (r <= 20) castEn(['Darkness', 'Darkness', 'Faerie Fire', 'Faerie Fire', 'Fireball', 'Fireball', 'Slow', 'Slow', 'Stinking Cloud', 'Stinking Cloud'][roll(1, 10) - 1]);
    else if (r <= 25) DN().give(x.rt, c, 'stunned', R6(1));
    else if (r <= 30) castEn('Gust of Wind'); else if (r <= 35) { G.Foe.dtype = 'psychic'; G.Foe.blast(x.f, x.rt, { atk: 1 }, c, roll(1, 6), null, 0, 'psychic'); G.Foe.dtype = null; }
    else if (r <= 45) { if (t) (x.rt.darks = x.rt.darks || []).push({ x: t.x, y: t.y, r: r <= 40 ? 0 : 6, until: G.S.runTime + R6(r <= 40 ? 10 : 100), lv: 1, by: c }); }
    else if (r <= 50) castEn('Lightning Bolt'); else if (r <= 55) { if (t) DN().buff(t, 'large', R6(10), { dmgD: 4 }); }
    else if (r <= 60) { const pool = Object.values(G.SRD_MON).filter(m => m.cr <= 2 && m.ty === 'beast'), b = pool[roll(1, pool.length) - 1]; if (t && b) { G.D.F.STAT['완드 ' + b.id] = [b.id]; F().spawnMon(x.rt, x.f.floor, { n: '완드 ' + b.id, t: 'm_wolf', ty: 'beast', r: 'brute' }, Math.round(t.x), Math.round(t.y) + 1, false, { aggro: true, spotted: true, major: true }); } }
    else if (r <= 68) ran = true; else if (r <= 72) DN().buff(c, 'small', R6(10), { dmgD: -4 }); else if (r <= 77) ran = true;
    else if (r <= 82) { for (const o of x.rt.party.concat(x.rt.mons).filter(o => o !== c && !o.dead && o.hp > 0 && Math.hypot(o.x - c.x, o.y - c.y) <= 6.5)) if (!DN().save(o, 'con', 15)) DN().give(x.rt, o, 'blinded', R6(10), c); }
    else if (r <= 87) DN().buff(c, 'invis2', R6(600), {});
    else if (r <= 92) { const n = roll(1, 4) * 10, line = x.seen.filter(o => Math.hypot(o.x - c.x, o.y - c.y) <= 6); for (const o of line) F().hurt(x.f, x.rt, o, Math.max(1, Math.floor(n / Math.max(1, line.length))), 'smite', c); }
    else if (r <= 97) { if (t && !DN().save(t, 'wis', 15)) { const form = ['black-bear', 'giant-wasp', 'jackal', 'jackal'][roll(1, 4) - 1], b = G.SRD_MON[form]; if (b) { t.polyFrom = t.polyFrom || t.stat; t.stat = b; t.thp = b.hp; } } }
    else { if (t && !DN().save(t, 'con', 15)) { DN().give(x.rt, t, 'restrained', R6(10), c); t.indigo = { ok: 0, no: 0, dc: 15 }; } }
    delete c.bf.wandDC; G.Turn.dm?.(x.rt, `경이의 완드 · ${r}`); return ran; } };
  SK.it_sphere = { when: (c, x) => X.sphereOK(x.rt) && x.seen.length && c === crew(x.rt).sort((p, q) => DN().skill(q.merc, 'arcana') - DN().skill(p.merc, 'arcana'))[0], run(c, x) { const t = H().pick(x); if (!t) return false; const a = Math.max(DN().d20(0), DN().d20(0)) + DN().skill(c.merc, 'arcana'); if (a < 25) { G.Turn.dm?.(x.rt, '소멸의 구가 말을 듣지 않는다'); return true; } G.Foe.dtype = 'force'; F().hurt(x.f, x.rt, t, roll(8, 10), 'smite', c); G.Foe.dtype = null; G.Turn.dm?.(x.rt, '소멸의 구'); return true; } };
  G.D.MSKILLS.it_wonder = { n: '경이의 완드', en: 'Wand of Wonder', t: 'ui_star', d: '무작위 효과 (SRD 표)', lv: 1 }; G.D.MSKILLS.it_sphere = { n: '소멸의 구', en: 'Sphere of Annihilation', t: 'ui_star', d: '비전 DC 25 · 8d10 역장', lv: 1 };
  return X;
})();
