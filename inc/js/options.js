'use strict';
// SRD 5.2.1의 "골라서 얻는 기능": 전투 방식 · 초월 주문 · 메타매직 (DESIGN.md 92). 용병마다 처음 한 번 순서를 굴려 두고, 레벨이 되면 그 순서대로 켜진다.
// 나머지 직업 기능 (신의 개입 · 동반자 · 전술 · 마법의 비밀)도 여기. 효과는 키로 규칙 쪽이 읽는다.
G.Opt = (() => {
  const D = G.D, SK = G.Skill.SK, H = G.Skill.H, DN = G.Dnd, U = G.U, F = () => G.Fantasy;
  const R6 = H.R6;
  const reg = (k, n, en, cls, lv, d, S, extra = {}) => { D.MSKILLS[k] = { n, en, t: extra.t || 'ui_star', d, lv: { [cls]: lv }, ...(S ? {} : { passive: true }), ...extra }; if (S) SK[k] = S; };
  // 그룹: 고르는 기능 (need = 먼저 있어야 하는 것)
  const IV_N = [0, 1, 3, 3, 3, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10];
  const LIST = { fs: [], iv: [], mm: [] }, NEED = {}, LV = {};
  const opt = (g, k, n, en, cls, lv, d, S, extra = {}) => { reg(k, n, en, cls, lv, d, S, extra); LIST[g].push(k); LV[k] = lv; if (extra.need) NEED[k] = extra.need; };

  // ── 전투 방식 (Fighting Style) ──
  const castClose = (c, x) => H.W.seen(c, x) && (!H.near(x, c, 1.8).length || x.seen.every(o => G.Foe.typeK(o, DN.weapon(c).t, c) < 1));
  opt('fs', 'fs_archery', '궁술', 'Archery', 'archer', 2, '원거리 무기 명중 +2');
  opt('fs', 'fs_defense', '방어', 'Defense', 'dragoon', 1, '갑옷: AC +1');
  opt('fs', 'fs_gwf', '대형 무기 전투', 'Great Weapon Fighting', 'dragoon', 1, '양손 근접 무기: 주사위의 1 · 2를 3으로');
  opt('fs', 'fs_twf', '쌍수 전투', 'Two-Weapon Fighting', 'dragoon', 1, '경량 무기 두 자루: 곁의 적에게 무기 주사위 + 능력치', { bonus: true, when: (c, x) => G.SRD.styleOn(c.merc, 'fs_twf') && H.W.close(1.8)(c, x), run(c, x) { const o = H.nearest(x, c, 1.8), w = DN.weapon(c); H.strike(x, c, o, [w.n, w.d, w.b], 'hit'); } }, { t: 'w_knife' });
  opt('fs', 'fs_blessed', '축복받은 전사', 'Blessed Warrior', 'paladin', 2, '신성한 불꽃 · 민첩 내성 · 광휘', { dt: 'radiant', when: castClose, run(c, x) { const o = H.pick(x); if (!o) return false; const dc = 8 + DN.prof(c.merc.lv) + DN.mod(DN.ab(c.merc).cha), s = H.tierS(c, [1, 8]); H.beam(x, c, o, '#ffe08a', 2); if (!DN.save(o, 'dex', dc)) F().hurt(x.f, x.rt, o, H.dmg(x, c, s), 'smite', c); } });
  opt('fs', 'fs_druidic', '드루이드 전사', 'Druidic Warrior', 'archer', 2, '별빛 도깨비불 · 명중 · 광휘 · 빛남', { dt: 'radiant', when: castClose, run(c, x) { const o = H.pick(x); if (!o) return false; H.beam(x, c, o, '#bfe0ff', 2); if (H.strike(x, c, o, H.tierS(c, [1, 8])).hit && o.hp > 0) DN.give(x.rt, o, 'outlined', G.Res_ROUND, c); } });
  D.SK_RANGE.fs_twf = 1.5; D.SK_RANGE.fs_blessed = 6; D.SK_RANGE.fs_druidic = 6;
  const FS_OF = { dragoon: ['fs_defense', 'fs_gwf', 'fs_twf'], paladin: ['fs_defense', 'fs_blessed'], archer: ['fs_archery', 'fs_defense', 'fs_druidic'] };
  for (const k of ['fs_defense', 'fs_gwf', 'fs_twf']) D.MSKILLS[k].lv = { dragoon: 1, paladin: 2, archer: 2 };

  // ── 초월 주문 (Eldritch Invocations) ── 전투 효과가 없는 넷은 뺐다 (악마의 시야는 빛 · 시야가 생겨 넣었다, G.Light): Mask of Many Faces · Master of Myriad Forms · Misty Visions · Whispers of the Grave
  const W = 'warlock', iv = (k, n, en, lv, d, S, extra) => opt('iv', k, n, en, W, lv, d, S, extra);
  const once = (c, x, key) => { const s = G.Res.of(c.merc).fu; if (s[key]) return false; s[key] = 1; return true; };
  iv('iv_pblade', '칼날의 계약', 'Pact of the Blade', 1, '근접 무기 1d8 + 매력 · 광휘');
  iv('iv_pchain', '사슬의 계약', 'Pact of the Chain', 1, '사역마: 차례마다 적 하나에게 내 다음 공격 이점', { auto: true, prio: 5, when: (c, x) => H.W.fight(c, x) && !petOf(c, 'chain'), run(c, x) { H.persist(c, 'gen', R6(100), { sum: 'chain', fn: (x2, e) => chainTick(x2, c) }); chainTick(x, c); H.ring(x, c, 0.9, '#b98aff'); } });
  iv('iv_ptome', '서적의 계약', 'Pact of the Tome', 1, '다른 직업의 공격 소마법 셋을 함께 쓴다');
  reg('sr_agon', '고통의 폭발', 'Agonizing Blast', W, 2, '섬뜩한 폭발 + 매력', null); LIST.iv.push('sr_agon'); LV.sr_agon = 2;
  iv('iv_armor', '그림자 갑옷', 'Armor of Shadows', 1, '늘 마법 갑옷: AC 13 + 민첩');
  iv('iv_ascend', '상승의 걸음', 'Ascendant Step', 5, '험지 · 얕은 물 이동 비용 없음');
  iv('iv_depths', '심연의 선물', 'Gift of the Depths', 5, '얕은 물 이동 비용 없음');
  iv('iv_mind', '섬뜩한 정신', 'Eldritch Mind', 1, '집중 유지 내성 이점');
  iv('iv_spear', '섬뜩한 창', 'Eldritch Spear', 2, '섬뜩한 폭발 사거리 +레벨×30피트');
  iv('iv_repel', '밀쳐내는 폭발', 'Repelling Blast', 2, '섬뜩한 폭발이 맞으면 2칸 밀침');
  iv('iv_vigor', '악마의 활력', 'Fiendish Vigor', 2, '전투 시작: 임시 체력 12', { free: true, when: (c, x) => H.W.fight(c, x) && !(c.thp > 0) && once(c, x, 'iv_vigor'), run(c, x) { c.thp = Math.max(c.thp || 0, 12 * c.max / Math.max(1, DN.srdHP(c.merc))); H.ring(x, c, 0.9, '#9fe79f'); } });
  iv('iv_gaze', '두 정신의 응시', 'Gaze of Two Minds', 5, '곁의 동료 자리에서 주문 사거리를 잰다');
  iv('iv_shadow', '그림자와 하나', 'One with Shadows', 5, '체력 절반 아래: 투명 (휴식까지 한 번)', { prio: 3, when: (c, x) => c.hp < c.max * 0.5 && !DN.bon(c, 'iv_shadow') && !G.Res.of(c.merc).fu.iv_shadow, run(c, x) { G.Res.of(c.merc).fu.iv_shadow = 1; DN.buff(c, 'iv_shadow', R6(10), { hitDis: 1, adv: 1 }); H.ring(x, c, 0.9, '#6a5a9a'); } });
  iv('iv_eye', '머나먼 세계의 환영', 'Visions of Distant Realms', 9, '전투 시작: 주변 12칸을 밝힌다', { free: true, when: (c, x) => H.W.fight(c, x) && once(c, x, 'iv_eye'), run(c, x) { G.Skill.reveal(x.rt, c.x, c.y, 12); H.ring(x, c, 2, '#c9a6ff'); } });
  iv('iv_dsight', '악마의 시야', "Devil's Sight", 2, '120피트 안의 어스름 · 어둠(마법적 어둠도)을 본다');
  iv('iv_witch', '마녀의 눈', 'Witch Sight', 15, '적의 투명이 내 공격에 통하지 않음');
  iv('iv_alert', '태고의 가르침: 경계', 'Lessons of the First Ones', 2, '선제권 + 숙련');
  iv('iv_savage', '태고의 가르침: 야만', 'Lessons of the First Ones', 2, '차례에 한 번 무기 피해를 두 번 굴려 큰 쪽');
  iv('iv_smite', '섬뜩한 강타', 'Eldritch Smite', 5, '계약 무기로 맞히면 슬롯 레벨 + 1d8 역장 · 넘어짐', { base: 1, res: { slot: 1 }, free: true, dt: 'force', rider(c, x, o) { H.ring(x, o, 0.8, '#b98aff'); F().hurt(x.f, x.rt, o, H.dmg(x, c, [1 + (x.slot || 1), 8]), 'smite', c); if (o.hp > 0) DN.give(x.rt, o, 'prone', G.Res_ROUND, c); } }, { need: 'iv_pblade' });
  iv('iv_thirst', '갈망의 칼날', 'Thirsting Blade', 5, '계약 무기 공격 2번', null, { need: 'iv_pblade' });
  iv('iv_devour', '삼키는 칼날', 'Devouring Blade', 12, '계약 무기 공격 3번', null, { need: 'iv_thirst' });
  iv('iv_life', '생명을 마시는 자', 'Lifedrinker', 9, '차례에 한 번 명중 +1d6 사령 · 체력 d8 + 건강 회복 (전투당 2번)', null, { need: 'iv_pblade' });
  iv('iv_cmaster', '사슬 주인의 권능', 'Investment of the Chain Master', 5, '사역마도 공격: 1d6 + 3 광휘', null, { need: 'iv_pchain' });
  iv('iv_protect', '수호자의 선물', 'Gift of the Protectors', 9, '동료가 쓰러질 때 1로 버팀 (휴식까지 한 번)', null, { need: 'iv_ptome' });
  const PACTS = ['iv_pblade', 'iv_pchain', 'iv_ptome'];
  const petOf = (c, k) => (c.pe || []).some(e => e.sum === k);
  function chainTick(x, c) {
    const t = H.nearest(x, c, 8); if (!t) return;
    if (F().sk(c, 'iv_cmaster')) { G.Foe.dtype = 'radiant'; G.fx(x.rt, { k: 'slash', x: t.x, y: t.y, t: 0.25, rot: 0.3 }); H.strike(x, c, t, [1, 6, 3], 'hit'); G.Foe.dtype = null; } else { t.helped = true; H.ring(x, t, 0.6, '#b98aff'); }
  }

  // ── 메타매직 ── Careful Spell은 뺐다: 이 게임의 주문은 처음부터 동료를 맞히지 않는다
  const M = 'mage', mm = (k, n, en, cost, d) => { reg(k, n, en, M, 2, `마력 ${cost} · ${d}`, null, { mm: cost }); LIST.mm.push(k); LV[k] = 2; };
  mm('sr_quicken', '주문 가속', 'Quickened Spell', 2, '주문을 추가 행동으로');
  mm('sr_twin', '쌍둥이 주문', 'Twinned Spell', 1, '한 명 주문이 둘에게');
  mm('mm_distant', '먼 주문', 'Distant Spell', 1, '닿는 적이 없으면 사거리 2배');
  mm('mm_empower', '강화 주문', 'Empowered Spell', 1, '낮은 피해 주사위를 매력만큼 다시');
  mm('mm_extend', '연장 주문', 'Extended Spell', 1, '지속 2배 · 집중 내성 이점');
  mm('mm_height', '고조 주문', 'Heightened Spell', 2, '한 대상의 내성 불리');
  mm('mm_seek', '추적 주문', 'Seeking Spell', 1, '빗나간 주문 공격 다시');
  mm('mm_subtle', '은밀한 주문', 'Subtle Spell', 1, '적의 반격 주문을 막는다');
  mm('mm_trans', '변환 주문', 'Transmuted Spell', 1, '주문 피해 종류를 적의 약점으로');
  const TRANS = ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'];
  const SPELL_EN = new Set(Object.values(G.SRD_SP).map(o => o.en));
  const isSpell = k => SK[k]?.res?.slot || SPELL_EN.has(D.MSKILLS[k]?.en);

  // ── 나머지 기능 ──
  const T = (k, n, en, cls, lv, d) => { reg(k, n, en, cls, lv, d, null); D.MPOOL[cls].push(k); };
  const SUB = (k, n, en, adv, lv, d, S) => { reg(k, n, en, D.ADV[adv].base, lv, d, S, S ? { auto: true } : {}); D.ADV[adv].sig.push(k); };
  T('ft_tshift', '전술 이동', 'Tactical Shift', 'dragoon', 5, '재기를 쓰면 이동 절반 · 기회 공격 없음');
  T('ft_tmaster', '전술의 대가', 'Tactical Master', 'dragoon', 9, '무기 숙련을 밀치기 · 약화 · 둔화로 바꿈');
  T('ft_icunning', '향상된 교활한 일격', 'Improved Cunning Strike', 'rogue', 11, '교활한 일격 효과 둘');
  T('ft_ibrutal', '향상된 잔혹한 일격', 'Improved Brutal Strike', 'barbarian', 13, '잔혹한 일격: 비틀거림 · 가르기 추가');
  T('ft_ibrutal2', '향상된 잔혹한 일격 2', 'Improved Brutal Strike', 'barbarian', 17, '잔혹한 일격 2d10 · 효과 둘');
  T('ft_secrets', '마법의 비밀', 'Magical Secrets', 'bard', 10, '클레릭 · 드루이드 · 위저드 주문을 고를 수 있다');
  SUB('ft_afs', '추가 전투 방식', 'Additional Fighting Style', 'champion', 7, '전투 방식 하나 더');
  SUB('ft_shdef', '상위 사냥꾼의 방어', "Superior Hunter's Defense", 'hunter', 15, '큰 피해를 받으면 그 종류 저항 (라운드에 한 번)');
  SK.ft_shdef = { react: true, when: () => false, run: () => false };
  // 용 동반자: 슬롯 없이 · 집중 없이 용 소환 (야영까지 한 번)
  SUB('ft_drcomp', '용 동반자', 'Dragon Companion', 'draconic', 18, '용 소환: 슬롯 · 집중 없이', { auto: true, prio: 10, res: { long: 1 }, when: (c, x) => H.W.seen(c, x), run(c, x) { const s = SK.sp_summon_dragon; if (s.run(c, { ...x, slot: 5 }) === false) return false; for (const e of G.Sum.alive(x.rt)) if (e.by === c && e.src === 'Summon Dragon') { e.conc = false; e.until = G.S.runTime + H.R6(10); } H.ring(x, c, 1.4, '#ff9a4a'); } }); /* 용 동반자 (SRD 18): 슬롯 없이 · 집중 없이 1분 */
  // 야생 동반자 (드루이드 2): 야생 변신 한 번 → 사역마. 도움 행동: 적 하나에게 다음 공격 이점
  const wildRes = () => SK.sr_wild?.res;
  reg('ft_wcomp', '야생 동반자', 'Wild Companion', 'scout', 2, '야생 변신 한 번 · 사역마: 차례마다 적 하나에게 다음 공격 이점', { auto: true, prio: 5, when: (c, x) => H.W.fight(c, x) && !petOf(c, 'wild') && G.Res.can(c.merc, 'sr_wild', wildRes()), run(c, x) { G.Res.pay(c.merc, 'sr_wild', wildRes()); H.persist(c, 'gen', R6(100), { sum: 'wild', fn: x2 => helpTick(x2, c) }); helpTick(x, c); H.ring(x, c, 0.9, '#9fd8a0'); } }, { auto: true }); D.MPOOL.scout.push('ft_wcomp');
  function helpTick(x, c) { const t = H.nearest(x, c, 8); if (t) { t.helped = true; H.ring(x, t, 0.6, '#9fd8a0'); } }
  // 충직한 탈것 (팔라딘 5): 이동 2배 · 쾅 1d8 + 2 광휘 · 치유의 손길 한 번
  reg('ft_steed', '충직한 탈것', 'Faithful Steed', 'paladin', 5, '탈것: 이동 2배 · 차례마다 명중 1d8 + 2 광휘 · 치유의 손길 한 번', { auto: true, prio: 5, when: (c, x) => H.W.fight(c, x) && !petOf(c, 'steed'), run(c, x) { H.persist(c, 'gen', R6(100), { sum: 'steed', healed: false, fn: (x2, e) => steedTick(x2, c, e) }); DN.buff(c, 'steed', R6(100), { moveK: 1 }); H.ring(x, c, 1, '#e8d070'); } }, { auto: true }); D.MPOOL.paladin.push('ft_steed');
  function steedTick(x, c, e) {
    if (!DN.bon(c, 'steed')) DN.buff(c, 'steed', R6(100), { moveK: 1 });
    const t = H.nearest(x, c, 1.8); if (t) { G.Foe.dtype = 'radiant'; G.fx(x.rt, { k: 'slash', x: t.x, y: t.y, t: 0.25, rot: -0.3 }); H.strike(x, c, t, [1, 8, 2], 'hit'); G.Foe.dtype = null; }
    if (!e.healed) { const p = x.rt.party.filter(q => !q.dead && !q.noHeal && q.hp < q.max * 0.5 && Math.hypot(q.x - c.x, q.y - c.y) <= 1.8).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (p) { e.healed = true; H.heal(x, c, p, [2, 8, 2]); H.ring(x, p, 0.8, '#9fe79f'); } }
  }
  // 신의 개입 (클레릭 10): 위험할 때 5레벨 이하 클레릭 주문 하나를 슬롯 없이. 20레벨: 소원 — 8레벨 이하 아무 주문
  const danger = (c, x) => x.rt.party.some(p => !p.dead && p.hp < p.max * 0.4) || x.rt.mons.filter(o => o.hp > 0 && o.aggro).length >= 3 || x.seen.some(o => o.boss);
  const canCast = (k, c, x) => { const S = SK[k]; if (!S || !S.run || S.react || S.rider || S.free || S.conc && c.concK || !S.when) return null; const reach = D.SK_RANGE[k], x2 = { ...x, reach, base: S.base, slot: S.base || 0, seen: reach == null ? x.seen : x.seen.filter(o => Math.hypot(o.x - c.x, o.y - c.y) <= reach) }; const ty = G.Skill.spellType(k); if (ty && !S.heal && x2.seen.length) { x2.seen = x2.seen.filter(o => G.Foe.dealK(c, o, ty) >= 0.5); if (!x2.seen.length) return null; } try { return S.when(c, x2) ? x2 : null; } catch (e) { return null; } };
  const diPick = (c, x) => {
    const m = c.merc, wish = m.lv >= 20 && x.rt.party.some(p => !p.dead && p.hp < p.max * 0.3), cap = wish ? 8 : 5, keys = wish ? Object.keys(SK) : D.MPOOL.cleric;
    const low = x.rt.party.some(p => !p.dead && p.hp < p.max * 0.4), list = keys.filter(k => k !== 'ft_intervene' && isSpell(k) && (SK[k]?.base || 0) >= 1 && SK[k].base <= cap).sort((a, b) => (low ? !!SK[b].heal - !!SK[a].heal : 0) || SK[b].base - SK[a].base);
    for (const k of list) { const x2 = canCast(k, c, x); if (x2) return { k, x2, wish: wish && SK[k].base > 5 }; }
    return null;
  };
  reg('ft_intervene', '신의 개입', 'Divine Intervention', 'cleric', 10, '위험할 때 5레벨 이하 주문을 슬롯 없이 · 20레벨: 8레벨 이하', { auto: true, prio: 10, res: { long: 1 }, when: (c, x) => danger(c, x) && !!diPick(c, x), run(c, x) {
    const p = diPick(c, x); if (!p) return false; const S = SK[p.k], ty = G.Skill.skillType(p.k, c);
    if (S.conc) G.Res.conc(c, p.k);
    G.Foe.dtype = ty; const ran = S.run(c, p.x2); G.Foe.dtype = null; if (ran === false) return false;
    
    H.ring(x, c, 1.6, '#fff3c4'); G.fx(x.rt, { k: 'text', x: c.x, y: c.y - 1.2, s: `신의 개입: ${D.MSKILLS[p.k].n}`, col: '#fff3c4', t: 1.2, sz: 0.85, pop: true });
  } }, { auto: true }); D.MPOOL.cleric.push('ft_intervene');
  // 마법의 비밀 (바드 10): 클레릭 · 드루이드 · 위저드 주문을 고를 수 있다
  { const byEn = {}; for (const k in D.MSKILLS) if (D.MSKILLS[k].en) byEn[D.MSKILLS[k].en.replace('’', "'")] = k;
    const FULL = l => (l ? l * 2 - 1 : 1);
    for (const id in G.SRD_SP) { const o = G.SRD_SP[id]; if (o.cls.includes('bard') || !o.cls.some(c => c === 'cleric' || c === 'druid' || c === 'wizard')) continue; const k = byEn[o.en]; if (!k || !SK[k] || !SK[k].run || D.MPOOL.bard.includes(k)) continue; const L = D.MSKILLS[k].lv; D.MSKILLS[k].lv = { ...(typeof L === 'object' ? L : {}), bard: Math.max(10, FULL(o.lv)) }; D.MPOOL.bard.push(k); } }

  // 사거리: 자기에게 거는 것은 1.5, 먼저 살펴야 하는 것은 시야 전체
  Object.assign(D.SK_RANGE, { iv_pchain: 8, iv_vigor: 1.5, iv_shadow: 1.5, iv_eye: 1.5, iv_smite: 1.5, ft_shdef: 1.5, ft_drcomp: 6, ft_wcomp: 8, ft_steed: 1.5, ft_intervene: 40 });
  // ── 자동 특성에서 뺀다: 고르는 기능은 풀에 두지 않는다 ──
  D.MPOOL.mage = D.MPOOL.mage.filter(k => k !== 'sr_quicken' && k !== 'sr_twin');
  D.MPOOL.warlock = D.MPOOL.warlock.filter(k => k !== 'sr_agon');

  // 아이콘 (proto/iso/dcss의 CC0 주문 그림). 없으면 학파 · 피해 종류 공용 그림
  const IC = { fs_archery: 's_bows', fs_defense: 's_shields', fs_gwf: 's_axes', fs_twf: 's_short_blades', fs_blessed: 's_invocations', fs_druidic: 's_summon_forest',
    iv_pblade: 's_blade_hands', iv_pchain: 's_summon_small_mammal', iv_ptome: 's_spellcasting', sr_agon: 's_agony', iv_armor: 's_shroud_of_golubria', iv_ascend: 's_jump', iv_depths: 's_condensation_shield', iv_mind: 's_charms', iv_spear: 's_force_lance', iv_repel: 's_repel_missiles', iv_vigor: 's_regeneration', iv_gaze: 's_passage_of_golubria', iv_shadow: 's_darkness', iv_eye: 's_portal_projectile', iv_witch: 's_ru_draw_out_power', iv_alert: 's_swiftness', iv_savage: 's_berserker_rage', iv_smite: 's_magic_dart', iv_thirst: 's_sure_blade', iv_devour: 's_tukimas_dance', iv_life: 's_vampiric_draining', iv_cmaster: 's_summon_vermin', iv_protect: 's_deaths_door',
    sr_quicken: 's_haste', sr_twin: 's_fulminant_prism', mm_distant: 's_portal_projectile', mm_empower: 's_iskenderuns_mystic_blast', mm_extend: 's_sublimation_of_blood', mm_height: 's_gravitas', mm_seek: 's_battlesphere', mm_subtle: 's_ensorcelled_hibernation', mm_trans: 's_transmutations',
    ft_tshift: 's_controlled_blink', ft_tmaster: 's_fighting', ft_icunning: 's_stabbing', ft_ibrutal: 's_lees_rapid_deconstruction', ft_ibrutal2: 's_lees_rapid_deconstruction', ft_secrets: 's_spellcasting', ft_afs: 's_long_blades', ft_shdef: 's_deflect_missiles', ft_drcomp: 's_dragon_form', ft_wcomp: 's_summon_small_mammal', ft_steed: 's_swiftness', ft_intervene: 's_tso_bless_weapon',
    ft_danger: 's_dodging', ft_mindless: 's_berserker_rage', ft_pounce: 's_jump', ft_persist: 's_berserker_rage', ft_might: 's_unarmed_combat', ft_champion: 's_fighting', ft_jack: 's_evocations', ft_counter: 's_charms', ft_superinsp: 's_song_of_slaying', ft_sear: 's_dispel_undead', ft_bhealer: 's_elyvilon_heal_other', ft_bstrike: 's_kiku_bless_weapon', ft_bstrike2: 's_kiku_bless_weapon', ft_supreme: 's_elyvilon_heal_other', ft_resurge: 's_beastly_appendage', ft_fury: 's_flame_tongue', ft_fury2: 's_flame_tongue', ft_archdruid: 's_summon_forest', ft_athlete: 's_swiftness', ft_heroic: 's_fighting', ft_studied: 's_stabbing', ft_metabolism: 's_regeneration', ft_empowered: 's_unarmed_combat', ft_evasion: 's_dodging', ft_evasion_r: 's_dodging', ft_denergy: 's_repel_missiles', ft_survivor: 's_stoneskin', ft_sdefense: 's_stoneskin', ft_adev: 's_invocations', ft_acourage: 's_ru_sacrifice_courage', ft_restore: 's_cure_poison', ft_sprotect: 's_shields', ft_aexpand: 's_invocations', ft_rhunter: 's_bows', ft_feral: 's_ru_draw_out_power', ft_slayer: 's_sting', ft_slippery: 's_phase_shift', ft_stroke: 's_stabbing', ft_overchannel: 's_hellfire_burst', ft_innate: 's_spellcasting', ft_veil: 's_shroud_of_golubria', ft_abjure: 's_cause_fear', ft_sanctuary: 's_summon_forest', wm_slow: 's_slow', wm_graze: 's_long_blades', wm_vex: 's_short_blades', wm_nick: 's_short_blades' };
  for (const k in IC) if (D.MSKILLS[k]) D.MSKILLS[k].ic = IC[k];

  // ── 용병별 순서 ──
  const memo = new WeakMap(), COMBAT_CANTRIP = Object.keys(G.SRD_SP).filter(id => G.SRD_SP[id].lv === 0 && !G.SRD_SP[id].cls.includes('warlock')).map(id => 'sp_' + id.replace(/-/g, '_')).filter(k => SK[k]?.run && SK[k].dt);
  const Opt = {
    LIST, NEED, LV,
    // 처음 한 번 굴린다 (저장된다). 계약 하나를 앞세우고 그 뒤는 섞는다
    roll(m) {
      const o = {};
      if (FS_OF[m.cls]) o.fs = U.shuffle(FS_OF[m.cls].slice());
      if (m.cls === W) { const p = U.pick(PACTS), rest = U.shuffle(LIST.iv.filter(k => !PACTS.includes(k))); o.iv = [p, ...rest]; o.tome = U.shuffle(COMBAT_CANTRIP.slice()).slice(0, 3); }
      if (m.cls === M) o.mm = U.shuffle(LIST.mm.slice());
      return o;
    },
    count(m, g) {
      if (g === 'fs') return (m.cls === 'dragoon' || m.lv >= 2 ? 1 : 0) + (m.adv === 'champion' && m.lv >= 7 ? 1 : 0);
      if (g === 'iv') return IV_N[Math.min(20, m.lv)] || 0;
      if (g === 'mm') return (m.lv >= 2 ? 2 : 0) + (m.lv >= 10 ? 2 : 0) + (m.lv >= 17 ? 2 : 0);
      return 0;
    },
    // 지금 켜져 있는 기능 (반복해서 부르므로 레벨 · 전직 · 굴림이 같으면 저장해 둔 것을)
    of(m) {
      if (!m || !(FS_OF[m.cls] || m.cls === W || m.cls === M)) return [];
      const r = m.opts || (m.opts = Opt.roll(m)), c = memo.get(m);
      if (c && c.r === r && c.lv === m.lv && c.adv === m.adv) return c.list;
      const list = [];
      for (const g of ['fs', 'iv', 'mm']) { let n = Opt.count(m, g); for (const k of r[g] || []) { if (!n) break; const lv = typeof D.MSKILLS[k].lv === 'object' ? D.MSKILLS[k].lv[m.cls] ?? LV[k] : LV[k]; if (m.lv < lv || (NEED[k] && !list.includes(NEED[k]))) continue; list.push(k); n--; } }
      if (list.includes('iv_ptome')) list.push(...(r.tome || []));
      memo.set(m, { r, lv: m.lv, adv: m.adv, list });
      return list;
    },
    has: (a, k) => !!a.merc && Opt.of(a.merc).includes(k),
    // 전투 방식 고르기: SRD는 레벨이 오를 때마다 바꿀 수 있다
    fsList: m => (Opt.count(m, 'fs') ? FS_OF[m.cls] || [] : []),
    fsNow: m => (m.opts || (m.opts = Opt.roll(m))).fs?.[0] || null,
    canFs: m => m.fsLv == null || m.fsLv < m.lv,
    setFs(m, k, free) { if (!Opt.fsList(m).includes(k) && !free) return false; if (!free && !Opt.canFs(m)) return false; const r = m.opts || Opt.roll(m); m.opts = { ...r, fs: [k, ...(r.fs || []).filter(q => q !== k)] }; m.fsLv = m.lv; return true; },
    // ── 메타매직: SRD 마력 점수 (소서러 레벨) ──
    mmRes: k => ({ focus: D.MSKILLS[k].mm }),
    can: (a, k) => Opt.has(a, k) && G.Res.can(a.merc, k, Opt.mmRes(k)),
    pay(a, k) { if (G.Guild.skill(a.merc, 'ft_apotheosis') && DN.bon(a, 'innate') && a.apoN !== G.Turn.no()) { a.apoN = G.Turn.no(); return; } G.Res.pay(a.merc, k, Opt.mmRes(k)); }, // 비전 승천 (SRD 소서러 20)
    // 시전 직전: 어떤 메타매직을 붙이나. one = 이미 고른 하나 (둘은 안 된다 · 강화 · 추적만 겹친다)
    begin(a, k, S, x, one) {
      const out = { used: one ? [one] : [] }; if (!a.merc || a.merc.cls !== M || !isSpell(k)) return out;
      const slot = !!S.res?.slot, sk = G.Skill;
      if (slot && !S.heal && Opt.can(a, 'mm_empower')) { DN.reroll = Math.max(1, DN.mod(DN.ab(a.merc).cha)); DN.rerollUsed = false; out.emp = true; }
      if (slot && Opt.can(a, 'mm_seek')) { a.seek = true; out.seek = true; }
      if (!one && slot) {
        if ((S.conc || S.T >= 10) && Opt.can(a, 'mm_extend')) { sk.ext = true; if (S.conc) a.extConc = true; out.used.push('mm_extend'); }
        else if (S.save && S.res.slot >= 2 && Opt.can(a, 'mm_height')) { sk.height = true; out.ht = true; }
        else if (Opt.can(a, 'sr_twin')) { sk.twin = true; out.tw = true; }
      }
      return out;
    },
    end(a, out, ran) {
      const sk = G.Skill; sk.ext = false; DN.reroll = 0;
      const pay = [];
      if (out.emp && DN.rerollUsed) pay.push('mm_empower');
      if (out.seek && a.seekUsed) pay.push('mm_seek');
      if (out.ht && sk.heightUsed) pay.push('mm_height');
      if (out.tw && sk.twinUsed) pay.push('sr_twin');
      a.seek = false; a.seekUsed = false; sk.height = false; sk.heightUsed = false; sk.twin = false; sk.twinUsed = false;
      if (ran === false) { a.extConc = false; return; }
      for (const k of out.used.concat(pay)) if (Opt.can(a, k)) Opt.pay(a, k);
    },
    // 변환: 지금 종류보다 더 잘 드는 종류가 있으면 (약점 · 면역 회피 · 트롤의 불)
    transmute(a, seen, ty) {
      if (!TRANS.includes(ty) || !Opt.can(a, 'mm_trans')) return null;
      const val = t => Math.max(...seen.map(o => (o.stat ? (G.Foe.typeK(o, t, a) + (t === 'fire' && G.Foe.needsFire(o) ? 2 : 0)) : 1)));
      let best = ty, bv = val(ty); for (const t of TRANS) { const v = val(t); if (v > bv) { bv = v; best = t; } }
      return best === ty ? null : best;
    },
    // 주문을 어디서 재나: 나 + 두 정신의 응시로 묶인 동료
    inReach(a, rt, o, reach) {
      if (Math.hypot(o.x - a.x, o.y - a.y) <= reach) return true;
      if (reach <= 1.5 || !Opt.has(a, 'iv_gaze')) return false;
      return rt.party.some(p => p !== a && !p.dead && Math.hypot(p.x - a.x, p.y - a.y) <= 12 && Math.hypot(o.x - p.x, o.y - p.y) <= reach);
    },
    // 칼날의 계약: 근접 몸으로 · 섬뜩한 창: 사거리 +3
    defOf(m, base) {
      if (m.cls !== W) return base;
      const list = Opt.of(m), blade = list.includes('iv_pblade'), spear = list.includes('iv_spear');
      if (!blade && !spear) return base;
      const C = base._opt || Object.defineProperty(base, '_opt', { value: {}, enumerable: false })._opt, key = blade ? 'blade' : 'spear';
      return C[key] || (C[key] = blade ? { ...base, range: 1.3, proj: null, wpn: 'w_sword' } : { ...base });
    },
    // 무기가 맞았을 때 (G.Skill.onHit)
    onHit(f, rt, a, o) {
      if (!a.merc || o.hp <= 0) return; const m = a.merc, x = { f, rt, c: a }, round = rt.turn?.round;
      
      if (m.cls !== W) return;
      if (Opt.has(a, 'iv_repel') && !DN.melee(a)) H.push(x, a, o, 2);
      if (Opt.has(a, 'iv_life') && a.ldR !== round) { a.ldR = round; const u = F().allyAtk(f, a) / Math.max(1, DN.avg(DN.weapon(a))), s = { short: 1 }; G.Foe.dtype = 'necrotic'; F().hurt(f, rt, o, DN.dice(1, 6) * u, 'extra', a); G.Foe.dtype = null; if (a.hp < a.max && G.Res.can(m, 'iv_life', s)) { G.Res.pay(m, 'iv_life', s); a.hp = Math.min(a.max, a.hp + Math.max(1, DN.dice(1, 8) + DN.mod(DN.ab(m).con)) * a.max / Math.max(1, DN.srdHP(m))); } }
    },
    // 빠져나오기: n칸 안의 빈 칸 중 곁에 적이 없는 가장 가까운 곳 (기회 공격 없음)
    away(x, c, n) {
      const rt = x.rt, cx = Math.round(c.x), cy = Math.round(c.y), all = rt.party.concat(rt.mons).filter(o => o !== c && (o.kind === 'mon' ? o.hp > 0 : !o.dead)); let best = null, bv = 1e9;
      for (let y = cy - n; y <= cy + n; y++) for (let X = cx - n; X <= cx + n; X++) {
        const d = Math.hypot(X - cx, y - cy); if (!d || d > n || !G.Grid.pass(rt.map, X, y) || all.some(o => Math.round(o.x) === X && Math.round(o.y) === y) || !G.Grid.los(rt.map, cx, cy, X, y)) continue;
        const fr = rt.mons.filter(o => o.hp > 0 && Math.hypot(o.x - X, o.y - y) <= 1.8).length, v = fr * 100 + d; if (v < bv) { bv = v; best = [X, y]; }
      }
      if (best) { c.x = best[0]; c.y = best[1]; G.Tactics.snap(rt); }
    },
    // 전술 이동: 재기 뒤 절반 이동 — 붙은 적이 없으면 앞으로, 둘 이상에 둘러싸였으면 빠져나온다
    shift(x, c) {
      const rt = x.rt, near = H.near({ ...x, reach: null }, c, 1.8), o = H.nearest(x, c, 12); if (!o) return;
      if (near.length >= 2) { Opt.away(x, c, 3); return; }
      if (near.length) return;
      const dx = o.x - c.x, dy = o.y - c.y, l = Math.hypot(dx, dy) || 1; let px = c.x, py = c.y;
      for (let i = 1; i <= 3 && l - i > 1; i++) { const nx = c.x + dx / l * i, ny = c.y + dy / l * i; if (!G.Grid.pass(rt.map, Math.round(nx), Math.round(ny))) break; px = nx; py = ny; }
      c.x = px; c.y = py; G.Tactics.snap(rt);
    },
  };
  return Opt;
})();
