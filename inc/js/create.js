'use strict';
// 단장 만들기 (DESIGN.md 139): SRD 5.2.1 「Character Creation」 19~22쪽 순서. 수치는 원문 표 그대로이고 test/create_rules.js가 data/srd521/manual.json과 대조한다.
// 간단 = 직업만 고르면 원문의 표(직업별 표준 배열 · 주능력이 든 배경)로 채운다. 직접 = 원문 순서대로 고른다. 종족 추천은 원문에 없어 게임 효과를 근거로 따로 적는다(spWhy)
G.Create = (() => {
  const CX_N = { low: '낮음', avg: '보통', high: '높음' }, POOL = 27, COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }, STD = [15, 14, 13, 12, 10, 8];
  // en: 원문 표의 이름. likes · cx: Class Overview 표. arr: Standard Array by Class 표 (근 민 건 지 혜 매). feats: 각 직업 Features 표의 1레벨. bg: 주능력이 든 배경 (Ability Scores and Backgrounds 표)
  const CLS = {
    dragoon: { en: 'Fighter', likes: '무기', cx: 'low', pri: ['str', 'dex'], arr: [15, 14, 13, 8, 10, 12], feats: ['전투 방식', '재기', '무기 숙련'], bg: 'soldier', sp: 'human', spWhy: '기원 재주를 하나 더 받는다' },
    rogue: { en: 'Rogue', likes: '은신', cx: 'low', pri: ['dex'], arr: [12, 15, 13, 14, 10, 8], feats: ['전문가', '기습 공격', '도둑 은어', '무기 숙련'], bg: 'criminal', sp: 'halfling', spWhy: 'd20의 1을 다시 굴린다' },
    barbarian: { en: 'Barbarian', likes: '전투', cx: 'avg', pri: ['str'], arr: [15, 13, 14, 10, 12, 8], feats: ['격노', '비무장 방어', '무기 숙련'], bg: 'soldier', sp: 'goliath', spWhy: '이동이 빠르고 5레벨에 커진다' },
    cleric: { en: 'Cleric', likes: '신', cx: 'avg', pri: ['wis'], arr: [14, 8, 13, 10, 15, 12], feats: ['주문 시전', '신성한 질서'], bg: 'acolyte', sp: 'dwarf', spWhy: '레벨마다 체력 +1 · 독 저항' },
    paladin: { en: 'Paladin', likes: '방어', cx: 'avg', pri: ['str', 'cha'], arr: [15, 10, 13, 8, 12, 14], feats: ['치유의 손길', '주문 시전', '무기 숙련'], bg: 'soldier', sp: 'dragonborn', spWhy: '숨결 공격과 피해 저항' },
    archer: { en: 'Ranger', likes: '생존', cx: 'avg', pri: ['dex', 'wis'], arr: [12, 15, 13, 8, 14, 10], feats: ['주문 시전', '숙적', '무기 숙련'], bg: 'soldier', sp: 'elf', line: 'wood', spWhy: '우드 엘프는 이동이 빠르다' },
    archmage: { en: 'Wizard', likes: '주문서', cx: 'avg', pri: ['int'], arr: [8, 12, 13, 15, 14, 10], feats: ['주문 시전', '의식 숙련', '비전 회복'], bg: 'sage', sp: 'gnome', spWhy: '지능 · 지혜 · 매력 내성 이점' },
    bard: { en: 'Bard', likes: '공연', cx: 'high', pri: ['cha'], arr: [8, 14, 12, 13, 10, 15], feats: ['바드의 영감', '주문 시전'], bg: 'acolyte', sp: 'human', spWhy: '기원 재주를 하나 더 받는다' },
    scout: { en: 'Druid', likes: '자연', cx: 'high', pri: ['wis'], arr: [8, 12, 14, 13, 15, 10], feats: ['주문 시전', '드루이드어', '원초의 질서'], bg: 'sage', sp: 'elf', line: 'wood', spWhy: '우드 엘프는 이동이 빠르다' },
    monk: { en: 'Monk', likes: '맨손 전투', cx: 'high', pri: ['dex', 'wis'], arr: [12, 15, 13, 10, 14, 8], feats: ['무술', '비무장 방어'], bg: 'criminal', sp: 'elf', line: 'wood', spWhy: '우드 엘프는 이동이 빠르다' },
    mage: { en: 'Sorcerer', likes: '힘', cx: 'high', pri: ['cha'], arr: [10, 13, 14, 8, 12, 15], feats: ['주문 시전', '타고난 마력'], bg: 'acolyte', sp: 'dragonborn', spWhy: '숨결 공격과 피해 저항' },
    warlock: { en: 'Warlock', likes: '비술', cx: 'high', pri: ['cha'], arr: [8, 14, 13, 12, 10, 15], feats: ['섬뜩한 영창', '계약 마법'], bg: 'acolyte', sp: 'tiefling', spWhy: '계통 주문을 배운다' },
  };
  const AB = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const AB_D = { str: '힘', dex: '민첩함 · 반사 신경 · 균형', con: '건강 · 체력', int: '추론 · 기억', wis: '지각 · 정신력', cha: '자신감 · 침착함 · 매력' };
  // 안내: 각 단계의 원문을 옮겼다
  const GUIDE = {
    start: '복잡도가 낮을수록 신경 쓸 것이 적다.',
    cls: '직업은 하는 일과 재능, 즐겨 쓰는 전술을 정한다.',
    bg: '모험을 떠나기 전 어디서 무엇을 하며 살았나. 능력치 셋을 올리고 재주 하나와 기술 둘을 준다. 고르기 어려우면 직업의 주능력이 든 배경을 고른다.',
    sp: '조상이 누구인가. 크기와 속도, 특성을 정한다.',
    ab: '여섯 숫자를 만들어 능력치에 놓는다. 두 칸을 차례로 누르면 값이 바뀐다. 가장 높은 값은 직업의 주능력에. 그다음 배경의 능력치 하나를 +2, 다른 하나를 +1 (또는 셋을 +1) 올린다. 주능력을 올리는 사람도, 낮은 값을 메우는 사람도 있다.',
    sk: '숙련한 기술에는 숙련 보너스(1레벨 +2)를 더한다.',
    spell: '소마법은 언제든 쓰고, 준비한 주문은 슬롯을 쓴다.',
  };
  const arrOf = cls => Object.fromEntries(AB.map((k, i) => [k, CLS[cls].arr[i]]));
  // 배경 능력치 기본값: 그 직업의 표준 배열에서 높은 쪽부터 +2 · +1
  const adjOf = (cls, bg) => { const s = G.SRD.BG[bg].ab.slice().sort((p, q) => arrOf(cls)[q] - arrOf(cls)[p]); return { [s[0]]: 2, [s[1]]: 1 }; };
  const spent = ab => AB.reduce((a, k) => a + (COST[ab[k]] ?? 99), 0);
  // 주문: 1레벨 표의 수까지 채운다 (원문: 소마법과 준비 주문 수는 직업 표대로)
  const spellPool = cls => G.Guild.spellList(cls).filter(k => !G.D.MSKILLS[k]?.noAuto && G.Guild.skLv(cls, k) <= 1);
  const fillSpells = (cls, cur) => { const GD = G.Guild, L = GD.limits(cls, 1), out = cur.filter(k => GD.spLv(k) != null), n = t => out.filter(k => (GD.spLv(k) === 0) === t).length; for (const k of spellPool(cls)) { if (out.includes(k)) continue; const c = GD.spLv(k) === 0; if (n(c) < (c ? L.cantrip : L.prepared)) out.push(k); } return out; };
  // 간단: 직업 하나로 전부. 파이터의 방어는 SRD가 권하는 전투 방식이다
  const QUICK_FS = { dragoon: 'fs_defense' };
  const quick = (cls, name) => { const C = CLS[cls]; return { cls, name, bg: C.bg, sp: C.sp, line: C.line || null, ab: arrOf(cls), bgAdj: adjOf(cls, C.bg), skillPick: null, skills: null, fs: QUICK_FS[cls] || null }; };
  const okAdj = (bg, a) => { if (!a) return false; const K = Object.keys(a), V = K.map(k => a[k]).sort().join(); return K.every(k => G.SRD.BG[bg].ab.includes(k)) && (V === '1,2' || V === '1,1,1'); };
  const okSkills = (cls, bg, list) => { const C = G.SRD.CLS[cls], have = G.SRD.BG[bg].sk; return list.length === C.sk && new Set(list).size === list.length && list.every(k => C.from.includes(k) && !have.includes(k)); };
  // 만든다. 틀린 값은 기본값으로 돌려놓지 않고 거절한다
  function make(f, o) {
    if (!CLS[o.cls] || !G.SRD.BG[o.bg] || !G.SRD.SPECIES[o.sp] || !okAdj(o.bg, o.bgAdj)) return false;
    if (o.skillPick && !okSkills(o.cls, o.bg, o.skillPick)) return false;
    const L = G.Guild.leader(f); L.lv = 1;
    return G.Guild.createLeader(f, { ...o, feat: G.SRD.BG[o.bg].feat, skills: o.skills || fillSpells(o.cls, G.Guild.roll(o.cls, 1)), manual: !!o.skills });
  }
  return { CLS, AB, AB_D, CX_N, GUIDE, POOL, COST, STD, spellPool, fillSpells, arrOf, adjOf, spent, quick, okAdj, okSkills, make, ORDER: Object.keys(CLS), FS: { dragoon: ['fs_defense', 'fs_gwf', 'fs_twf'] } };
})();
