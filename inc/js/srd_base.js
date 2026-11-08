'use strict';
// SRD 5.2.1 기본 표 그대로: 무기 · 갑옷 · 배경 · 종족 · 직업 숙련 (DESIGN.md 107). 숫자를 고치려면 원문을 먼저 본다.
// 사거리는 5피트 = 1칸, SRD 값 그대로 (js/srd_range.js)
G.SRD = (() => {
  const R = G.SRD_RAW, KO_W = { club: '곤봉', dagger: '단검', greatclub: '대곤봉', handaxe: '손도끼', javelin: '투창', 'light-hammer': '경량 망치', mace: '메이스', quarterstaff: '쿼터스태프', sickle: '낫', spear: '창', dart: '다트', 'light-crossbow': '경량 석궁', shortbow: '쇼트보우', sling: '슬링', battleaxe: '배틀액스', flail: '플레일', glaive: '글레이브', greataxe: '그레이트액스', greatsword: '그레이트소드', halberd: '할버드', lance: '랜스', longsword: '롱소드', maul: '몰', morningstar: '모닝스타', pike: '파이크', rapier: '레이피어', scimitar: '시미터', shortsword: '쇼트소드', trident: '삼지창', warhammer: '워해머', 'war-pick': '워픽', whip: '채찍', blowgun: '취관', 'hand-crossbow': '손 석궁', 'heavy-crossbow': '중량 석궁', longbow: '롱보우', musket: '머스킷', pistol: '권총' };
  const KO_A = { 'padded-armor': '누비 갑옷', 'leather-armor': '가죽 갑옷', 'studded-leather-armor': '징 박은 가죽 갑옷', 'hide-armor': '짐승 가죽 갑옷', 'chain-shirt': '체인 셔츠', 'scale-mail': '스케일 메일', breastplate: '흉갑', 'half-plate-armor': '하프 플레이트', 'ring-mail': '링 메일', 'chain-mail': '체인 메일', 'splint-armor': '스플린트 갑옷', 'plate-armor': '판금 갑옷' };
  // 수치는 전부 G.SRD_RAW (원문). 여기서는 한글 이름만 붙인다
  const WEAPON = { unarmed: { n: '비무장 타격', en: 'Unarmed Strike', cat: 'none', rng: 'melee', dn: 0, dd: 0, flat: 1, t: 'bludgeoning', props: [], m: null, lb: 0, gp: 0, ft: 0, vd: 0, hidden: true } }; for (const k in R.WEAPON) WEAPON[k] = { ...R.WEAPON[k], n: KO_W[k] || R.WEAPON[k].en };
  const ARMOR = { none: { n: '비무장', en: 'Unarmored', cat: 'none', base: 10, dexMax: 99, str: 0, stealth: false, lb: 0, gp: 0 } }; for (const k in R.ARMOR) ARMOR[k] = { ...R.ARMOR[k], n: KO_A[k] || R.ARMOR[k].en };
  const SHIELD = { n: '방패', en: R.SHIELD.en, ac: R.SHIELD.base, lb: R.SHIELD.lb, gp: R.SHIELD.gp };
  const PROP_N = { light: '경량', finesse: '기교', thrown: '투척', two: '양손', versatile: '양용', ammo: '탄약', loading: '장전', heavy: '중량', reach: '긴 거리' };
  const MASTERY = { cleave: ['가르기', '곁의 둘째 적에게 무기 주사위 (턴당 1번)'], graze: ['스치기', '빗나가도 능력 수정치 피해'], nick: ['닉', '경량 무기 추가 공격 (턴당 1번)'], push: ['밀치기', '2칸 밀침'], sap: ['약화', '다음 공격 불리'], slow: ['둔화', '이동 −2칸'], topple: ['넘어뜨리기', '건강 내성 실패 시 넘어짐'], vex: ['괴롭히기', '다음 공격 이점'] };
  const CAT_N = { simple: '단순', martial: '군용', light: '경갑', medium: '평갑', heavy: '중갑', none: '비무장' };
  // 직업 표: 주능력 · 내성은 G.Dnd.CLS. 기술 고르기 · 무기 · 갑옷 · 도구 · 시작 장비
  const ALL18 = ['athletics', 'acrobatics', 'sleight', 'stealth', 'arcana', 'history', 'investigation', 'nature', 'religion', 'animal', 'insight', 'medicine', 'perception', 'survival', 'deception', 'intimidation', 'performance', 'persuasion'];
  const RAW_CLS = { barbarian: 'barbarian', bard: 'bard', cleric: 'cleric', scout: 'druid', dragoon: 'fighter', monk: 'monk', paladin: 'paladin', archer: 'ranger', rogue: 'rogue', mage: 'sorcerer', warlock: 'warlock', archmage: 'wizard' }, SKILL_K = { 'animal-handling': 'animal', 'sleight-of-hand': 'sleight' }, skK = q => { const b = q.replace(/^skill-/, ''); return SKILL_K[b] || b; };
  const CLS0 = {
    barbarian: { w: ['simple', 'martial'], a: ['light', 'medium', 'shield'], tool: '', start: { w: 'greataxe', a: 'none' }, wm: [[1, 2], [4, 3], [10, 4]] },
    bard: { w: ['simple'], a: ['light'], tool: '악기 3', start: { w: 'dagger', a: 'leather-armor' } },
    cleric: { w: ['simple'], a: ['light', 'medium', 'shield'], tool: '', start: { w: 'mace', a: 'chain-shirt', shield: true } },
    scout: { w: ['simple'], a: ['light', 'shield'], tool: '약초 도구', start: { w: 'sickle', a: 'leather-armor', shield: true } },
    dragoon: { w: ['simple', 'martial'], a: ['light', 'medium', 'heavy', 'shield'], tool: '', start: { w: 'greatsword', a: 'chain-mail' }, wm: [[1, 3], [4, 4], [10, 5], [16, 6]] },
    monk: { w: ['simple', 'martial-light'], a: [], tool: '장인 도구 또는 악기 1', start: { w: 'unarmed', a: 'none' } },
    paladin: { w: ['simple', 'martial'], a: ['light', 'medium', 'heavy', 'shield'], tool: '', start: { w: 'longsword', a: 'chain-mail', shield: true }, wm: [[1, 2]] },
    archer: { w: ['simple', 'martial'], a: ['light', 'medium', 'shield'], tool: '', start: { w: 'longbow', a: 'studded-leather-armor' }, wm: [[1, 2]] },
    rogue: { w: ['simple', 'martial-fl'], a: ['light'], tool: '도둑 도구', start: { w: 'shortsword', a: 'leather-armor' }, wm: [[1, 2]] },
    mage: { w: ['simple'], a: [], tool: '', start: { w: 'spear', a: 'none' } },
    warlock: { w: ['simple'], a: ['light'], tool: '', start: { w: 'sickle', a: 'leather-armor' } },
    archmage: { w: ['simple'], a: [], tool: '', start: { w: 'quarterstaff', a: 'none' } },
  };
  const CLS = {}; for (const k in CLS0) { const q = R.CLASS[RAW_CLS[k]]; CLS[k] = { ...CLS0[k], sk: q.n, from: q.from.map(skK) }; }
  // 배경: 능력치 셋(+2 · +1 또는 +1 · +1 · +1) · 기원 재주 · 기술 둘 · 도구
  const BG_KO = { acolyte: ['수행자', '서예 도구'], criminal: ['범죄자', '도둑 도구'], sage: ['현자', '서예 도구'], soldier: ['군인', '놀이 도구'] }, FEAT_K = { 'magic-initiate:Cleric': 'mi_cleric', 'magic-initiate:Wizard': 'mi_wizard', 'magic-initiate': 'mi_wizard' /* 현자: 데이터에 주문 목록이 빠졌다. PDF는 Wizard */, alert: 'alert', 'savage-attacker': 'savage' };
  const BG = {}; for (const k in R.BG) { const q = R.BG[k]; BG[k] = { n: BG_KO[k][0], en: q.en, ab: q.ab, feat: FEAT_K[q.note ? `${q.feat}:${q.note}` : q.feat], sk: q.prof.filter(p => p.startsWith('skill-')).map(skK), tool: BG_KO[k][1] }; }
  // 종족: 속도 · 암시야 · 계통은 원문 데이터에서. 특성 글은 한글 요약
  const SP0 = {
    human: { n: '인간', traits: [['재주꾼', '긴 휴식 후 영웅의 영감'], ['숙련', '기술 1'], ['다재다능', '기원 재주 1']] },
    elf: { n: '엘프', traits: [['요정 혈통', '매혹 내성 이점'], ['예리한 감각', '통찰 · 지각 · 생존 중 숙련 1'], ['무아지경', '수면 면역']] },
    dwarf: { n: '드워프', traits: [['드워프의 강인함', '독 저항 · 중독 내성 이점'], ['드워프의 튼튼함', '레벨마다 체력 +1'], ['돌의 지식', '추가 행동: 진동 감지 12칸']] },
    halfling: { n: '하플링', traits: [['용감함', '공포 내성 이점'], ['재빠름', '큰 생물 칸 통과'], ['행운', 'd20의 1을 다시 굴림'], ['타고난 은신', '큰 생물 뒤에 숨기']] },
    gnome: { n: '노움', traits: [['노움의 교활함', '지능 · 지혜 · 매력 내성 이점']] },
    dragonborn: { n: '드래곤본', traits: [['숨결', '1d10 (5 · 11 · 17레벨 +1d10) · 민첩 내성 절반 · 숙련 보너스만큼'], ['피해 저항', '조상의 피해 유형'], ['드래곤의 비행', '5레벨 · 추가 행동 · 비행']] },
    tiefling: { n: '티플링', traits: [['다른 세계의 기운', '기적술']] },
    orc: { n: '오크', traits: [['아드레날린', '추가 행동 질주 · 임시 체력 = 숙련 보너스 · 숙련 보너스만큼'], ['불굴', '체력 0이 되면 1로 버팀 (1번)']] },
    goliath: { n: '골리앗', traits: [['거대화', '5레벨 · 추가 행동 · 근력 판정 이점 · 이동 +2칸'], ['강인한 체격', '붙잡힘 탈출 판정 이점']] },
  };
  const LINE_KO = { black: '검은 용', blue: '푸른 용', brass: '황동 용', bronze: '청동 용', copper: '구리 용', gold: '금 용', green: '녹색 용', red: '붉은 용', silver: '은 용', white: '흰 용', drow: '드로우', high: '하이 엘프', wood: '우드 엘프', forest: '숲 노움', rock: '바위 노움', abyssal: '심연', chthonic: '지하', infernal: '지옥', cloud: '구름 거인', fire: '불 거인', frost: '서리 거인', hill: '언덕 거인', stone: '돌 거인', storm: '폭풍 거인' }, LINE_D = { cloud: '추가 행동: 6칸 순간 이동', fire: '명중 시 1d10 화염', frost: '명중 시 1d6 냉기 · 이동 −2칸', hill: '명중 시 넘어뜨림', stone: '반응: 피해 −(1d12 + 건강)', storm: '반응: 12칸 안 공격자에게 1d8 천둥' };
  const lineKey = k => (/^giant-ancestry-(\w+?)s?[-_]/.exec(k + '-')?.[1] || k).replace(/^(draconic-ancestor|elven-lineage|gnomish-lineage|fiendish-legacy)-/, '').replace(/-(elf|gnome)$/, '').replace(/^(cloud|fire|frost|hill|stone|storm).*/, '$1');
  // 원문 표에 있는데 데이터에 빠진 계통 주문 (PDF 기준): 숲 노움 동물과 대화, 소마법
  const LINE_FIX = { forest: { sp: { 1: 'speak-with-animals' } }, rock: { cantrip: 'mending' }, high: { cantrip: 'prestidigitation' }, wood: { cantrip: 'druidcraft' } };
  const SPECIES = {}; for (const k in R.SPECIES) { const q = R.SPECIES[k], tr = q.traits.map(t => t[0]), dark = tr.includes('darkvision-120') ? 24 : tr.includes('darkvision-60') ? 12 : 0, line = {}; for (const sk0 of q.sub) { const u = R.SUB[sk0], key = lineKey(sk0), o = { n: LINE_KO[key] || u.en, sp: {} }; if (LINE_D[key]) o.d = LINE_D[key]; if (u.dt) o.dt = u.dt; for (const [t, lv] of u.traits) { let m0; if ((m0 = /^lineage-spell-(.+)$/.exec(t))) { if (lv === 1 && !LINE_FIX[key]?.sp?.[1]) o.cantrip = m0[1]; else o.sp[lv] = m0[1]; } if ((m0 = /^lineage-resistance-(.+)$/.exec(t))) o.dt = m0[1]; if (t === 'darkvision-120') o.dark = 24; if (t === 'wood-elf-speed-increase') o.move = 7; } Object.assign(o.sp, LINE_FIX[key]?.sp); if (LINE_FIX[key]?.cantrip) o.cantrip = LINE_FIX[key].cantrip; line[key] = o; } SPECIES[k] = { ...SP0[k], en: q.en, size: q.size, move: q.speed / 5, dark, ...(q.sub.length ? { line } : {}) }; }
  // 사람마다 고정인 난수 (uid로)
  const seed = (m, salt) => { let h = 2166136261 ^ salt; for (const c of String(m.uid ?? m.name ?? 0) + salt) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pickN = (m, salt, list, n) => { const a = list.slice(), out = []; let h = seed(m, salt); while (out.length < n && a.length) { h = Math.imul(h ^ (h >>> 13), 1597334677) >>> 0; out.push(a.splice(h % a.length, 1)[0]); } return out; };
  // 기술 설명: SRD 기술 표 번역
  const SKILL_D = { athletics: '멀리 뛰기, 거친 물에서 뜨기, 물건 부수기', acrobatics: '어려운 상황에서 중심 잡기, 곡예', sleight: '소매치기, 물건 감추기, 손기술', stealth: '조용히 움직이고 숨어서 들키지 않기', arcana: '주문, 마법 물건, 다른 세계에 대한 지식', history: '역사적 사건, 인물, 나라, 문화에 대한 지식', investigation: '책에서 숨은 정보 찾기, 원리 추론', nature: '지형, 식물, 동물, 날씨에 대한 지식', religion: '신, 종교 의식, 성표에 대한 지식', animal: '동물 달래기, 훈련, 원하는 대로 행동시키기', insight: '상대의 기분과 의도 알아채기', medicine: '병 진단, 방금 죽은 자의 사인 알아내기', perception: '감각으로 놓치기 쉬운 것 알아채기', survival: '발자국 추적, 먹거리 찾기, 길 찾기, 자연 위험 피하기', deception: '그럴듯한 거짓말, 변장', intimidation: '위압하거나 위협해서 따르게 하기', performance: '연기, 이야기, 음악, 춤', persuasion: '정직하고 예의 바르게 설득하기' };
  const KIT = { fs_gwf: { w: 'greatsword', shield: false }, fs_defense: { w: 'longsword', shield: true }, fs_twf: { w: 'shortsword', shield: false } };
  const S = {
    SKILL_D, RAW_CLS,
    WEAPON, ARMOR, SHIELD, PROP_N, MASTERY, CAT_N, CLS, BG, SPECIES, ALL18,
    // 배경: 재주에 맞는 배경을 찾고, 없으면 사람마다 고정
    bg(m) { if (m.bg && BG[m.bg]) return m.bg; const keys = Object.keys(BG), hit = keys.filter(k => BG[k].feat === m.feat); m.bg = (hit.length ? hit : keys)[seed(m, 11) % (hit.length || keys.length)]; return m.bg; },
    // 배경 능력치: 직업 놓는 순서에서 먼저인 쪽에 +2 · 다음에 +1
    bgAb(m, order) { if (m.bgAdj) return m.bgAdj; const b = BG[S.bg(m)].ab, sorted = b.slice().sort((p, q) => order.indexOf(p) - order.indexOf(q)); return { [sorted[0]]: 2, [sorted[1]]: 1 }; },
    line(m, sp) { const L = SPECIES[sp]?.line; if (!L) return null; const K = Object.keys(L); if (!m.line || !L[m.line]) m.line = K[seed(m, 23) % K.length]; return L[m.line]; },
    feat2(m, sp) { return sp === 'human' ? (m.feat === 'skilled' ? 'alert' : 'skilled') : null; },
    // 기술 숙련 전부: 직업 · 배경 · 종족 · 재주
    profs(m, sp) { const c = CLS[m.cls] || CLS.archer, out = new Set(m.skillPick || pickN(m, 31, c.from, c.sk)), hasF = k => m.feat === k || S.feat2(m, sp) === k; for (const k of BG[S.bg(m)].sk) out.add(k); if (m.cls === 'barbarian' && m.lv >= 3) for (const k of pickN(m, 47, c.from.filter(q => !out.has(q)), 1)) out.add(k); if (m.adv === 'lore') for (const k of pickN(m, 53, ALL18.filter(q => !out.has(q)), 3)) out.add(k); if (sp === 'human') out.add(pickN(m, 37, ALL18, 1)[0]); if (sp === 'elf') out.add(pickN(m, 41, ['insight', 'perception', 'survival'], 1)[0]); if (hasF('skilled')) for (const k of pickN(m, 43, ALL18, 3)) out.add(k); return [...out]; },
    // 전문가 (숙련 두 배): 바드 2 · 9레벨 · 로그 1 · 6레벨 · 레인저 2 · 9레벨 · 위저드 2레벨(학자)
    expert(m, sp) { const P = S.profs(m, sp), n = { bard: m.lv >= 9 ? 4 : m.lv >= 2 ? 2 : 0, rogue: m.lv >= 6 ? 4 : 2, archer: m.lv >= 9 ? 3 : m.lv >= 2 ? 1 : 0, archmage: m.lv >= 2 ? 1 : 0 }[m.cls] || 0; if (!n) return []; const from = m.cls === 'archmage' ? P.filter(k => ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'].includes(k)) : P; return pickN(m, 59, from, n); },
    // 신성한 / 원초적 질서: 클레릭 · 드루이드 1레벨 (사람마다 고정)
    order(m) { if (m.cls === 'cleric') return seed(m, 61) % 2 ? 'protector' : 'thaumaturge'; if (m.cls === 'scout') return seed(m, 61) % 2 ? 'warden' : 'magician'; return null; },
    orderBonus(m, sk, wisMod) { const o = S.order(m); if ((o === 'thaumaturge' && (sk === 'arcana' || sk === 'religion')) || (o === 'magician' && (sk === 'arcana' || sk === 'nature'))) return Math.max(1, wisMod); return 0; },
    // 장비: 사람마다 m.eq = { w, a, shield }. 처음은 직업 시작 장비
    eq(m) {
      if (!m.eq || m.eqCls !== m.cls || !WEAPON[m.eq.w] || !ARMOR[m.eq.a]) { const st = (CLS[m.cls] || CLS.archer).start; m.eq = { ...st, shield: !!st.shield }; m.eqCls = m.cls; m.eqFs = null; }
      // 파이터의 기본 무기는 전투 방식을 따른다. 직접 바꾼 무기는 건드리지 않는다
      if (m.cls === 'dragoon' && G.Opt) { const fs = (m.opts || (m.opts = G.Opt.roll(m))).fs?.[0]; if (fs && m.eqFs !== fs) { const was = KIT[m.eqFs] || CLS.dragoon.start, kit = KIT[fs]; if (kit && m.eq.w === was.w && !!m.eq.shield === !!was.shield) Object.assign(m.eq, kit); m.eqFs = fs; } }
      return m.eq;
    },
    // 전투 방식이 지금 장비로 효과를 내나 (SRD Fighting Style Feats)
    styleOn(m, k) { const e = S.eq(m), w = S.weaponOf(m), p = w.props || []; if (k === 'fs_gwf') return w.rng === 'melee' && !e.shield && (p.includes('two') || p.includes('versatile')); if (k === 'fs_twf') return p.includes('light') && !e.shield; if (k === 'fs_defense') return S.armorOf(m).cat !== 'none'; return true; },
    weaponOf: m => WEAPON[S.eq(m).w] || WEAPON.unarmed,
    armorOf: m => ARMOR[S.eq(m).a] || ARMOR.none,
    canWeapon(cls, k) { const w = WEAPON[k], c = CLS[cls]; if (!w || !c || w.hidden) return false; return c.w.some(q => q === w.cat || (q === 'martial-light' && w.cat === 'martial' && w.props.includes('light')) || (q === 'martial-fl' && w.cat === 'martial' && (w.props.includes('light') || w.props.includes('finesse')))); },
    canArmor(cls, k) { const a = ARMOR[k], c = CLS[cls]; return !!a && !!c && (a.cat === 'none' || c.a.includes(a.cat)); },
    canShield: cls => !!CLS[cls]?.a.includes('shield'),
    // 사람 기준 (질서가 더해 준다)
    canW(m, k) { return S.canWeapon(m.cls, k) || (['protector', 'warden'].includes(S.order(m)) && WEAPON[k]?.cat === 'martial'); },
    canA(m, k) { return S.canArmor(m.cls, k) || (S.order(m) === 'protector' && ARMOR[k]?.cat === 'heavy') || (S.order(m) === 'warden' && ARMOR[k]?.cat === 'medium'); },
    // 항상 준비된 하위 직업 주문
    SUB_SP: { life: { 3: ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration'], 5: ['Mass Healing Word', 'Revivify'], 7: ['Aura of Life', 'Death Ward'], 9: ['Greater Restoration', 'Mass Cure Wounds'] }, devotion: { 3: ['Protection from Evil and Good', 'Shield of Faith'], 5: ['Aid', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] }, draconic: { 3: ['Alter Self', 'Chromatic Orb', 'Command', "Dragon's Breath"], 5: ['Fear', 'Fly'], 7: ['Arcane Eye', 'Charm Monster'], 9: ['Legend Lore', 'Summon Dragon'] }, fiend: { 3: ['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion'], 5: ['Fireball', 'Stinking Cloud'], 7: ['Fire Shield', 'Wall of Fire'], 9: ['Geas', 'Insect Plague'] }, land_arid: { 3: ['Blur', 'Burning Hands', 'Fire Bolt'], 5: ['Fireball'], 7: ['Blight'], 9: ['Wall of Stone'] }, land_polar: { 3: ['Fog Cloud', 'Hold Person', 'Ray of Frost'], 5: ['Sleet Storm'], 7: ['Ice Storm'], 9: ['Cone of Cold'] }, land_temperate: { 3: ['Misty Step', 'Shocking Grasp', 'Sleep'], 5: ['Lightning Bolt'], 7: ['Freedom of Movement'], 9: ['Tree Stride'] }, land_tropical: { 3: ['Acid Splash', 'Ray of Sickness', 'Web'], 5: ['Stinking Cloud'], 7: ['Polymorph'], 9: ['Insect Plague'] } },
    landOf: m => ['arid', 'polar', 'temperate', 'tropical'][seed(m, 67) % 4],
    landRes: m => ({ arid: 'fire', polar: 'cold', temperate: 'lightning', tropical: 'poison' })[S.landOf(m)],
    fiendRes: m => ['acid', 'bludgeoning', 'cold', 'fire', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'][seed(m, 71) % 12],
    subSpells(m) { const key = m.adv === 'land' ? 'land_' + S.landOf(m) : m.adv, T = S.SUB_SP[key]; if (!T) return []; const out = []; for (const lv in T) if (m.lv >= +lv) out.push(...T[lv]); return out; },
    // 무기 숙련: 그 직업에 Weapon Mastery가 있으면 든 무기의 숙련을 쓴다
    masteryOf(m) { const c = CLS[m.cls]; if (!c?.wm || m.lv < c.wm[0][0]) return null; return S.weaponOf(m).m || null; },
  };
  return S;
})();
