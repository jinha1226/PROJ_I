'use strict';
// 보상 · 성장 · 명성 (설계 5-12, 화면 없이): 레벨업 고르기 · 전리품 · 정예 · 보스 3택1 · 명성.
// - 경험치는 옛 엔진(G.Guild.onKill: SRD 몬스터 CR별, 살아 있는 파티원이 나눔)이 준다. 새 게임은 한 층 판이라 3배(bridge.js).
// - 레벨이 오르면 엔진이 기술 칸을 저절로 채우지 않고(bridge.js) 여기서 후보 셋을 낸다:
//   SRD 직업 표대로 — 그 레벨의 기능은 저절로, 고르게 돼 있는 것(능력치 향상 · 전투 방식 · 영창 · 초마법 · 주문)만 고른다.
//   후보는 추천 셋(셋 중 하나) 또는 전부(직접 고르기).
// - 상태는 사람(merc)에 붙는다: skills · ab · lvq(남은 고르기의 줄) · opts(고른 기능) · adv(하위 직업) · carve(새긴 면). 난수는 넘겨받는다(rng).
G.Reward = (() => {
  const XP_PACE = 3;
  const AB_N = { str: '근력', dex: '민첩', con: '건강', int: '지능', wis: '지혜', cha: '매력' };
  const GD = () => G.Guild;
  const pick = (list, n, rng) => { const a = list.slice(), out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return out; };

  // ── 레벨업 ──
  const caster = m => { const L = GD().limits(m.cls, Math.max(1, m.lv)); return L.cantrip + L.prepared > 0; };
  // 열린 칸: SRD 표의 소마법 · 준비 주문 수 − 지금 아는 수. 손에 든 기술은 5칸까지(G.Party.CAP) — 주문 칸을 먼저 연다
  const CAP = () => G.Party?.CAP ?? 99;
  function slotsOpen(m) {
    const L = GD().limits(m.cls, m.lv), cur = (m.skills || []).filter(k => GD().spLv(k) != null), free = Math.max(0, CAP() - cur.length);
    const p = Math.min(free, Math.max(0, L.prepared - cur.filter(k => GD().spLv(k) > 0).length)), c = Math.min(free - p, Math.max(0, L.cantrip - cur.filter(k => GD().spLv(k) === 0).length));
    return { cantrip: c, prepared: p };
  }
  // ── SRD 직업 표대로 오른다 (2026-11-19): 레벨이 오르면 그 레벨의 기능은 저절로 생기고, SRD가 고르게 한 것만 고른다 ──
  // m.lvq = 남은 일의 줄: new(새로 얻은 것 보기) · asi(능력치 향상) · fs(전투 방식) · iv(영창) · mm(초마법). 주문 칸 · 바꾸기는 그 뒤 (slotsOpen · swapPend)
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const subOf = cls => Object.keys(G.D.ADV).find(k => G.D.ADV[k].base === cls) || null; // SRD 5.2.1은 직업마다 하위 직업 하나
  const ASI_AT = cls => (cls === 'dragoon' ? [4, 6, 8, 12, 14, 16] : cls === 'rogue' ? [4, 8, 10, 12, 16] : [4, 8, 12, 16]);
  // 엔진에 한글 이름이 없는 SRD 기능 (이름 · 한 줄)
  const KO = { 'Unarmored Defense': ['비무장 방어', '갑옷 없이 AC를 능력치로'], 'Weapon Mastery': ['무기 숙련', '든 무기의 숙련 효과를 쓴다'], 'Ability Score Improvement': ['능력치 향상', '능력치 +2 또는 둘에 +1'], 'Extra Attack': ['추가 공격', '공격 행동에 두 번 친다'],
    'Two Extra Attacks': ['추가 공격 둘', '공격 행동에 세 번 친다'], 'Three Extra Attacks': ['추가 공격 셋', '공격 행동에 네 번 친다'], 'Epic Boon': ['서사 은혜', '서사 은혜 하나'], Spellcasting: ['주문 시전', '주문 슬롯으로 주문을 쓴다'], 'Pact Magic': ['계약 마법', '짧은 휴식마다 돌아오는 주문 슬롯'],
    Expertise: ['전문화', '기술 숙련 둘의 보너스가 두 배'], 'Sneak Attack': ['암습', '이점이 있거나 동료가 적 곁에 있으면 추가 피해'], 'Fighting Style': ['전투 방식', '전투 방식 하나'], 'Channel Divinity': ['신성 변환', '언데드 퇴치 · 신성한 불꽃'], 'Divine Order': ['신성한 질서', '수호자 또는 기적술사'],
    'Primal Order': ['원초의 질서', '감시자 또는 마법사'], Druidic: ['드루이드어', '드루이드의 비밀 언어'], "Monk's Focus": ['집중', '집중 점수로 연타 · 인내 · 바람 걸음'], 'Unarmored Movement': ['비무장 이동', '갑옷 없이 이동 속도가 오른다'], "Paladin's Smite": ['팔라딘의 강타', '신성 강타를 늘 준비한다'],
    'Favored Enemy': ['선호하는 적', '사냥꾼의 표식을 늘 준비한다'], 'Deft Explorer': ['능숙한 탐험가', '전문화 하나 · 언어 둘'], "Thieves' Cant": ['도둑의 은어', '은어와 언어 하나'], 'Font of Magic': ['마법의 샘', '마력 점수로 슬롯을 만든다'], Metamagic: ['초마법', '주문을 비트는 선택지 둘'],
    'Eldritch Invocations': ['섬뜩한 영창', '영창 하나'], 'Ritual Adept': ['의식 숙련', '의식 주문을 준비 없이'], 'Arcane Recovery': ['비전 회복', '짧은 휴식에 슬롯을 되찾는다'], Scholar: ['학자', '기술 하나 전문화'], 'Bonus Proficiencies': ['추가 숙련', '기술 숙련 셋'], 'Mystic Arcanum': ['신비한 비전', '높은 레벨 주문 하나를 하루 한 번'],
    'Second-Story Work': ['2층 작업', '오르기 · 도약이 빨라진다'], 'Sorcerous Restoration': ['마력 회복', '짧은 휴식에 마력 점수를 되찾는다'], "Dark One's Own Luck": ['어둠의 행운', '판정 · 내성에 d10을 더한다'], 'Superior Critical': ['상급 치명타', '18~20에 치명타'],
    'Primal Knowledge': ['원초의 지식', '기술 숙련 하나'], 'Magical Discoveries': ['마법의 발견', '다른 직업의 주문 둘'], 'Greater Divine Intervention': ['상급 신의 개입', '소원을 빈다'], "Nature's Ward": ['자연의 보호', '독 면역 · 지형의 저항'], 'Heightened Focus': ['고조된 집중', '연타 · 인내 · 바람 걸음이 세진다'],
    'Body and Mind': ['몸과 마음', '민첩 · 지혜 +4'], Roving: ['방랑', '이동 속도 · 오르기 · 헤엄'], "Hunter's Prey": ['사냥꾼의 사냥감', '다친 적에게 추가 피해'], "Thief's Reflexes": ['도둑의 반사신경', '첫 라운드에 차례가 둘'], 'Dragon Wings': ['용의 날개', '날개로 난다'],
    'Contact Patron': ['후원자와 교신', '후원자에게 묻는다'], 'Eldritch Master': ['섬뜩한 대가', '계약 슬롯을 모두 되찾는다'], 'Memorize Spell': ['주문 암기', '짧은 휴식에 준비 주문 하나를 바꾼다'], 'Spell Mastery': ['주문 통달', '1 · 2레벨 주문 하나씩을 슬롯 없이'], 'Signature Spells': ['대표 주문', '3레벨 주문 둘을 늘 준비'], 'Evocation Savant': ['방출 전문가', '방출 주문을 더 배운다'] };
  // SRD 기능 표의 한 줄 → 화면에 쓸 이름 · 설명 (엔진에 한글 자료가 있으면 그것)
  let EN = null;
  function feat(x, m) {
    EN = EN || new Map(Object.entries(G.D.MSKILLS).map(([k, v]) => [v.en, k]));
    if (/Subclass$/.test(x.en)) { const a = G.D.ADV[m.adv || subOf(m.cls)]; return { n: `하위 직업 — ${a ? a.n : '?'}`, d: '' , lv: x.lv }; }
    if (/ Spells$/.test(x.en)) return { n: '하위 직업 주문', d: '늘 준비된 주문이 생긴다', lv: x.lv };
    const k = EN.get(x.en), K = k && G.D.MSKILLS[k]; let n = K ? K.n : KO[x.en] ? KO[x.en][0] : x.en, d = K ? K.d : KO[x.en] ? KO[x.en][1] : '';
    if (x.en === 'Sneak Attack') d = `${Math.ceil(m.lv / 2)}d6 · ${d}`;
    return { n, d, lv: x.lv };
  }
  const rows = m => { const cls = G.SRD.RAW_CLS[m.cls], sub = m.adv ? slug(G.D.ADV[m.adv]?.en) : null; return Object.values(G.SRD_RAW.FEATURE).filter(x => x.cls === cls && (!x.sub || (sub && slug(x.sub).includes(sub)))); };
  // 그 사람이 지금 가진 직업 기능 전부 (레벨 순) · 그 레벨에 새로 얻은 것
  const features = m => rows(m).filter(x => x.lv <= m.lv).sort((a, b) => a.lv - b.lv).map(x => feat(x, m));
  const gained = (m, lv) => rows(m).filter(x => x.lv === lv).map(x => feat(x, m));
  // 레벨이 하나 올랐다 (bridge.js의 G.Guild.grow가 부른다 — m.lv는 이미 오른 값)
  function levelUp(m) {
    const q = m.lvq || (m.lvq = []), O = G.Opt;
    if (m.lv >= 3 && !m.adv) m.adv = subOf(m.cls); // 3레벨: 하위 직업 (하나뿐이라 고르지 않는다)
    q.push({ k: 'new', lv: m.lv });
    if (ASI_AT(m.cls).includes(m.lv)) q.push({ k: 'asi' });
    O.of(m); // 고르는 기능이 있는 직업만 m.opts가 생긴다 (파이터 · 팔라딘 · 레인저의 전투 방식, 워락의 영창, 소서러의 초마법)
    for (const g of ['fs', 'iv', 'mm']) { if (!m.opts?.[g]) continue; const n1 = O.count(m, g); m.lv--; const n0 = O.count(m, g); m.lv++; for (let i = n0; i < n1; i++) if (!(g === 'fs' && m.cls === 'dragoon' && m.lv === 1)) q.push({ k: g }); }
    if (caster(m) && (m.skills || []).filter(k => GD().spLv(k) != null).length >= CAP()) m.swapPend = (m.swapPend || 0) + 1; // 5칸이 다 찼다: 바꾸기 기회
  }
  // 남은 고르기 수: 줄(lvq) + 열린 주문 칸 + 바꾸기 기회
  function pending(m) { const o = caster(m) ? slotsOpen(m) : { cantrip: 0, prepared: 0 }; return (m.lvq || []).length + o.cantrip + o.prepared + (caster(m) ? m.swapPend || 0 : 0); }
  // 배울 수 있는 주문 (그 칸 종류 · 그 레벨까지 · 아직 모르는 것)
  function learnable(m, slot) {
    const S = GD();
    return S.pickable(m.cls).filter(k => S.skLv(m.cls, k) <= m.lv && S.spLv(k) != null && !G.D.MSKILLS[k]?.noAuto && !(m.skills || []).includes(k) && (slot === 'cantrip' ? S.spLv(k) === 0 : S.spLv(k) > 0));
  }
  // 능력치 향상 (SRD): 하나에 +2 또는 둘에 +1씩, 20까지. 후보는 그 직업의 능력치 우선 순서대로
  function asiOptions(m, all) {
    const ord = G.Dnd.cls(m).order, cur = G.Dnd.ab(m), room = k => 20 - cur[k], nm = k => AB_N[k], out = [];
    const two = k => ({ kind: 'asi', id: k, add: { [k]: 2 }, n: `${nm(k)} +2`, d: `${cur[k]} → ${cur[k] + 2}` }), pair = (a, b) => ({ kind: 'asi', id: a + b, add: { [a]: 1, [b]: 1 }, n: `${nm(a)} +1 · ${nm(b)} +1`, d: `${cur[a]} → ${cur[a] + 1} · ${cur[b]} → ${cur[b] + 1}` });
    const up2 = ord.filter(k => room(k) >= 2), up1 = ord.filter(k => room(k) >= 1);
    // SRD: 능력치 향상 재주 「또는 다른 재주」 — SRD 5.2.1의 일반 재주는 붙잡기 하나 (근력 또는 민첩 +1, 맨손 공격에 붙잡기를 얹는다)
    const gk = ord.find(k => (k === 'str' || k === 'dex') && room(k) >= 1), grap = gk && !m.gfeat?.includes('grappler') ? [{ kind: 'asi', id: 'grappler', feat: 'grappler', add: { [gk]: 1 }, n: `붙잡기 · ${nm(gk)} +1`, d: '재주 — 맨손으로 맞히면 피해와 붙잡기를 함께 · 붙잡은 적에게 이점' }] : [];
    if (all) { out.push(...up2.map(two)); for (let i = 0; i < up1.length; i++) for (let j = i + 1; j < Math.min(up1.length, 4); j++) out.push(pair(up1[i], up1[j])); return out.concat(grap); }
    if (up2[0]) out.push(two(up2[0])); if (up1.length >= 2) out.push(pair(up1[0], up1[1])); const c = up2.find(k => k !== up2[0] && (k === 'con' || true)); if (c) out.push(two(c));
    return (m.cls === 'monk' && grap.length ? [...out.slice(0, 2), grap[0]] : out.slice(0, 3)); // 추천 셋: 맨손으로 싸우는 몽크에게는 붙잡기를 끼운다
  }
  // 고르는 기능 (전투 방식 · 영창 · 초마법): 아직 안 켠 것 가운데 지금 켤 수 있는 것
  function optOptions(m, g, all, rng) {
    const O = G.Opt, r0 = m.opts || (m.opts = O.roll(m)), on = O.of(m).filter(k => (r0[g] || []).includes(k)), cnt = O.count(m, g), keep = on.slice(0, Math.max(0, cnt - 1));
    const ok = k => { m.opts = { ...r0, [g]: [...keep, k, ...(r0[g] || []).filter(q => q !== k && !keep.includes(q))] }; const v = O.of(m).includes(k); m.opts = r0; return v; };
    const cand = (r0[g] || []).filter(k => !keep.includes(k) && ok(k));
    return (all ? cand : pick(cand, 3, rng)).map(k => ({ kind: g, id: k, keep, n: G.D.MSKILLS[k]?.n || k, d: G.D.MSKILLS[k]?.d || '' }));
  }
  // 후보: 추천 셋(뱀파이어 서바이버처럼 셋 중 하나) · all = 전부 (직접 고르기). 줄(lvq)의 맨 앞부터, 그다음 주문 칸
  function offer(m, rng = Math.random, all = false) {
    const h = (m.lvq || [])[0];
    if (h) {
      if (h.k === 'new') return { kind: 'new', lv: h.lv, list: gained(m, h.lv), options: [] };
      const options = h.k === 'asi' ? asiOptions(m, all) : optOptions(m, h.k, all, rng);
      if (!options.length) { m.lvq.shift(); return offer(m, rng, all); } // 고를 것이 없다 (다 찼다)
      return { kind: h.k, options };
    }
    const sp = k => ({ id: k, n: G.D.MSKILLS[k]?.n || k, lv: GD().spLv(k), d: G.D.MSKILLS[k]?.d || '' }), byLv = (a, b) => GD().spLv(b) - GD().spLv(a);
    const three = pool => { const top = Math.max(...pool.map(k => GD().spLv(k))), first = pick(pool.filter(k => GD().spLv(k) === top), 1, rng); return first.concat(pick(pool.filter(k => !first.includes(k)), 2, rng)); }; // 높은 레벨 주문이 하나는 끼게
    const o = slotsOpen(m);
    if (!o.prepared && !o.cantrip) { // 5칸이 다 찼다: 새 주문으로 하나를 바꾸거나 그대로
      const pool = learnable(m, 'prepared').concat(learnable(m, 'cantrip')); if (!pool.length) return { kind: 'swap', options: [] };
      return { kind: 'swap', options: (all ? pool.slice().sort(byLv) : three(pool)).map(k => ({ kind: 'swap', ...sp(k) })) };
    }
    const slot = o.prepared > 0 ? 'prepared' : 'cantrip', pool = learnable(m, slot);
    if (!pool.length) return { kind: 'swap', options: [] };
    return { kind: 'spell', slot, options: (all ? pool.slice().sort(byLv) : three(pool)).map(k => ({ kind: 'spell', ...sp(k) })) };
  }
  // 고른 것을 적용 (바꾸기는 drop = 내려놓을 기술 — 없으면 그대로 둔다)
  function choose(m, opt, drop = null) {
    if (opt?.kind === 'swap' || opt === 'keep') { if (opt !== 'keep' && drop && (m.skills || []).includes(drop)) { m.skills = m.skills.map(k => (k === drop ? opt.id : k)); m.skPri = m.skills.slice(); } m.swapPend = Math.max(0, (m.swapPend || 0) - 1); return true; }
    if (opt.kind === 'spell') { m.skills = (m.skills || []).concat(opt.id); m.skManual = true; m.skPri = m.skills.slice(); return true; }
    if (opt.kind === 'new') { m.lvq.shift(); return true; }
    if (opt.kind === 'asi') { G.Dnd.ab(m); for (const k in opt.add) m.ab[k] = (m.ab[k] ?? 10) + opt.add[k]; if (opt.feat) (m.gfeat = m.gfeat || []).push(opt.feat); m.lvq.shift(); return true; }
    if (opt.kind === 'fs' || opt.kind === 'iv' || opt.kind === 'mm') { const g = opt.kind, r = m.opts || G.Opt.roll(m); m.opts = { ...r, [g]: [...opt.keep, opt.id, ...(r[g] || []).filter(q => q !== opt.id && !opt.keep.includes(q))] }; if (g === 'fs') m.fsLv = m.lv; m.lvq.shift(); return true; }
    return false;
  }

  // ── 전리품 · 상인 물자 ──
  const ITEM = {
    tools: { n: '도둑 도구', cost: 20, line: '잠긴 문을 조용히 딴다 (DC 15)' },
    potion: { n: '치유 물약' }, torch: { n: '횃불' }, knockScroll: { n: '열림 두루마리' }, seeScroll: { n: '투시 두루마리' },
  };
  const LOOT = [['potion', 26], ['torch', 10], ['knockScroll', 6], ['tools', 6], ['seeScroll', 5]]; // 기름 · 마름쇠는 문 앞 준비와 함께 뺐다 (2026-11-18)
  // 전투마다: 굴림 수 = 보스 3 · 정예 2 · 적 셋 이상 2 · 아니면 1, 굴림마다 70%로 하나 (무게 표에서)
  function loot(type, count, rng = Math.random) {
    const rolls = type === 'boss' ? 3 : type === 'elite' || count >= 3 ? 2 : 1, tot = LOOT.reduce((a, [, w]) => a + w, 0), out = {};
    for (let i = 0; i < rolls; i++) { if (rng() >= 0.7) continue; let x = rng() * tot; for (const [k, w] of LOOT) { if ((x -= w) < 0) { out[k] = (out[k] || 0) + 1; break; } } }
    return Object.entries(out).map(([k, n]) => ({ k, n, name: ITEM[k]?.n || k }));
  }
  // 상인의 물건 목록에 새 물자를 더한다 (탐사 규칙의 RUN.ITEMS — 옛 것은 그대로)
  function stockShop(items) { for (const k of ['tools']) if (!items[k]) items[k] = { n: ITEM[k].n, cost: ITEM[k].cost, line: ITEM[k].line }; return items; }

  // ── 정예 · 보스 3택1: 마법 물건 · 운명판 규칙 카드 · 면 새기기 ──
  const RULES = {
    reroll2: { n: '두 번 굴리기', d: '운명판 다시 굴리기를 한 번 더 할 수 있다' },
    wild19: { n: '별의 면', d: '모든 직업 주사위의 19면도 ★ (아무 기호)' },
    pairUp: { n: '맞물림', d: '같은 기호 둘만 모여도 셋처럼 강한 조합' },
  };
  // 마법 물건 후보: 엔진의 SRD 물건(G.D.ARTS) 가운데 아직 없고 파티 누군가가 낄 수 있는 것, 정예는 희귀도 2까지 · 보스는 3까지
  function artOptions(f, party, type, rng) {
    const own = new Set((f.trinkets || []).map(t => t.k)), cap = type === 'boss' ? 3 : 2, fits = k => party.some(p => p.merc && !p.dead && (!G.D.ARTS[k].fit || G.D.ARTS[k].fit.includes(p.merc.cls)));
    return pick(Object.keys(G.D.ARTS).filter(k => !own.has(k) && (G.D.ARTS[k].r || 1) <= cap && G.D.ARTS[k].props && fits(k)), 1, rng).map(k => ({ kind: 'art', id: k, n: G.D.ARTS[k].n, ic: G.D.ARTS[k].ic, d: (G.D.ARTS[k].en || '') }));
  }
  // 면 새기기 후보: 빈 면(1면 빼고)이 남은 사람 하나 — 그 빈 면 하나를 ★로
  function carveOptions(party, rng) {
    const can = party.filter(p => !p.dead && p.merc && blanks(p).length), who = pick(can, 1, rng)[0]; if (!who) return [];
    const v = pick(blanks(who), 1, rng)[0];
    return [{ kind: 'carve', id: `${who.merc.uid}:${v}`, who, v, n: `면 새기기 — ${who.merc.name}`, d: `${who.merc.name}의 직업 주사위 ${v}면(빈 면)을 ★로` }];
  }
  function blanks(p) { const kind = G.Dice.dieFor(p), K = G.Dice.KINDS[kind]; if (!K?.sym) return []; const out = []; for (let v = 2; v <= 19; v++) if (G.Dice.face(kind, v, p).sym === null) out.push(v); return out; }
  function ruleOptions(rng) { const left = Object.keys(RULES).filter(k => !G.Dice.rules.has(k)); return pick(left, 1, rng).map(k => ({ kind: 'rule', id: k, n: RULES[k].n, d: RULES[k].d })); }
  // 셋: 마법 물건 · 규칙 카드 · 면 새기기 — 파티가 5명이 안 되면 규칙 카드 · 면 새기기 중 하나 대신 「동료 합류」
  function bigOffer(f, party, type, rng = Math.random) {
    const out = [...artOptions(f, party, type, rng), ...ruleOptions(rng), ...carveOptions(party, rng)];
    return out;
  }
  function takeBig(f, opt) {
    if (opt.kind === 'art') { const t = { id: f.trUid = (f.trUid || 0) + 1, lv: f.floor || 1, on: null, k: opt.id }; G.Trinket.all(f).push(t); (f.artSeen = f.artSeen || []).push(opt.id); return t; } // 가방에 넣기만 한다 — 누구에게 줄지는 화면이 묻는다 (GEARUI.give, js/game/gear.js)
    if (opt.kind === 'rule') { G.Dice.rules.add(opt.id); return true; }
    if (opt.kind === 'carve') { const m = opt.who.merc; m.carve = { ...(m.carve || {}), [opt.v]: 'wild' }; return true; }
    return false;
  }

  // ── 소문 (판 밖 — 코드 이름은 renown) ──: 고를 것만 넓힌다. 물건 · 돈은 넘어가지 않는다
  // 한 판의 소문: 간 방 1 · 이긴 전투 2 · 정예 3 · 보스 10 · 층 끝까지 가면 5 더
  const renown = s => (s.rooms || 0) + 2 * (s.fights || 0) + 3 * (s.elites || 0) + 10 * (s.boss ? 1 : 0) + (s.win ? 5 : 0);
  const UNLOCKS = []; // 소문으로 열리던 특수 주사위는 들어설 때 고르기와 함께 뺐다 (2026-11-19). 소문은 선술집의 의자만 늘린다
  const unlocked = total => UNLOCKS.filter(u => total >= u.at).map(u => u.id);

  return { on: false, XP_PACE, AB_N, ITEM, RULES, UNLOCKS, caster, slotsOpen, pending, learnable, offer, choose, levelUp, features, gained, loot, stockShop, bigOffer, takeBig, blanks, renown, unlocked };
})();
