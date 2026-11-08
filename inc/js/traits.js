'use strict';
// SRD 5.2.1 직업 기능 나머지 (DESIGN.md 91): 전투에 영향을 주는 것. 효과는 규칙 쪽(G.Dnd · G.Res · G.Foe · G.Skill)이 G.Guild.skill(m, 'ft_...')로 읽는다.
(() => {
  const D = G.D, SK = G.Skill.SK, H = G.Skill.H, DN = G.Dnd, F = () => G.Fantasy;
  const T = (k, n, en, cls, lv, d, t = 'ui_star') => { D.MSKILLS[k] = { n, en, t, d, lv: { [cls]: lv }, passive: true }; D.MPOOL[cls].push(k); };
  // 바바리안
  T('ft_danger', '위험 감지', 'Danger Sense', 'barbarian', 2, '민첩 내성 이점');
  T('ft_mindless', '무심한 격노', 'Mindless Rage', 'barbarian', 6, '격노 중 공포 · 매혹 면역');
  T('ft_pounce', '본능적 도약', 'Instinctive Pounce', 'barbarian', 7, '격노할 때 이동 절반 더');
  T('ft_persist', '끊임없는 격노', 'Persistent Rage', 'barbarian', 15, '격노 +1번');
  T('ft_might', '불굴의 힘', 'Indomitable Might', 'barbarian', 18, '근력 내성 최소값 = 근력');
  T('ft_champion', '원초의 투사', 'Primal Champion', 'barbarian', 20, '근력 · 건강 +4');
  // 바드
  T('ft_jack', '만능 재주꾼', 'Jack of All Trades', 'bard', 2, '숙련 없는 판정 · 선제권 + 숙련 절반');
  T('ft_counter', '대항 매력', 'Countercharm', 'bard', 7, '지혜 · 매력 내성 이점');
  T('ft_superinsp', '탁월한 영감', 'Superior Inspiration', 'bard', 18, '바드의 영감 +1번');
  // 클레릭
  T('ft_sear', '언데드 불태우기', 'Sear Undead', 'cleric', 5, '언데드 퇴치에 지혜만큼 d8 광휘');
  T('ft_bhealer', '축복받은 치유사', 'Blessed Healer', 'cleric', 6, '남을 치유하면 나도 2 + 주문 레벨');
  T('ft_bstrike', '축복받은 일격', 'Blessed Strikes', 'cleric', 7, '차례에 한 번 명중 +1d8 광휘');
  T('ft_bstrike2', '향상된 축복받은 일격', 'Improved Blessed Strikes', 'cleric', 14, '축복받은 일격 2d8');
  T('ft_supreme', '최고의 치유', 'Supreme Healing', 'cleric', 17, '치유 주사위는 늘 최대');
  // 드루이드
  T('ft_resurge', '야생의 재기', 'Wild Resurgence', 'scout', 5, '야생 변신 +1번');
  T('ft_fury', '원소의 분노', 'Elemental Fury', 'scout', 7, '차례에 한 번 명중 +1d8 화염');
  T('ft_fury2', '향상된 원소의 분노', 'Improved Elemental Fury', 'scout', 15, '원소의 분노 2d8');
  T('ft_archdruid', '대드루이드', 'Archdruid', 'scout', 20, '야생 변신 +1번');
  // 파이터
  T('ft_athlete', '뛰어난 운동선수', 'Remarkable Athlete', 'dragoon', 3, '선제권 이점');
  T('ft_heroic', '영웅적 전사', 'Heroic Warrior', 'dragoon', 10, '차례마다 빗나간 공격 한 번 다시');
  T('ft_studied', '공격 연구', 'Studied Attacks', 'dragoon', 13, '빗나간 상대에게 다음 공격 이점');
  // 몽크
  T('ft_metabolism', '놀라운 신진대사', 'Uncanny Metabolism', 'monk', 2, '전투가 시작되면 레벨 + 무술 주사위 회복');
  T('ft_empowered', '강화된 타격', 'Empowered Strikes', 'monk', 6, '맨손 피해가 역장');
  T('ft_evasion', '회피', 'Evasion', 'monk', 7, '민첩 내성 성공 0 · 실패 절반');
  T('ft_denergy', '에너지 튕겨내기', 'Deflect Energy', 'monk', 13, '공격 튕겨내기가 모든 피해에');
  T('ft_survivor', '단련된 생존자', 'Disciplined Survivor', 'monk', 14, '모든 내성 숙련');
  T('ft_sdefense', '탁월한 방어', 'Superior Defense', 'monk', 18, '집중 3 · 역장 외 피해 저항 10라운드');
  // 팔라딘
  T('ft_adev', '헌신의 오라', 'Aura of Devotion', 'paladin', 7, '오라 안 매혹 면역');
  T('ft_acourage', '용기의 오라', 'Aura of Courage', 'paladin', 10, '오라 안 공포 면역');
  T('ft_restore', '회복의 손길', 'Restoring Touch', 'paladin', 14, '안수가 상태이상도 푼다');
  T('ft_sprotect', '보호의 강타', 'Smite of Protection', 'paladin', 15, '강타하면 오라 안 AC +2');
  T('ft_aexpand', '오라 확장', 'Aura Expansion', 'paladin', 18, '오라 반경 6칸');
  // 레인저
  T('ft_rhunter', '끈질긴 사냥꾼', 'Relentless Hunter', 'archer', 13, '맞아도 사냥꾼의 표식이 안 끊긴다');
  T('ft_feral', '야성의 감각', 'Feral Senses', 'archer', 18, '실명해도 공격 불리 없음');
  T('ft_slayer', '적 학살자', 'Foe Slayer', 'archer', 20, '사냥꾼의 표식 d10');
  // 로그
  T('ft_evasion_r', '회피', 'Evasion', 'rogue', 7, '민첩 내성 성공 0 · 실패 절반');
  T('ft_slippery', '미끄러운 정신', 'Slippery Mind', 'rogue', 15, '지혜 · 매력 내성 숙련');
  T('ft_stroke', '행운의 일격', 'Stroke of Luck', 'rogue', 20, '빗나간 공격을 명중으로 (전투당 한 번)');
  // 위저드
  T('ft_overchannel', '과충전', 'Overchannel', 'archmage', 14, '5레벨 이하 주문 피해 최대 (전투당 한 번)');
  // 고르는 기능
  const A = (k, n, en, cls, lv, d, S, t = 'ui_star') => { const lvm = {}; for (const c of [].concat(cls)) { lvm[c] = lv; D.MPOOL[c].push(k); } D.MSKILLS[k] = { n, en, t, d, lv: lvm }; SK[k] = S; };
  A('ft_innate', '타고난 마력', 'Innate Sorcery', 'mage', 1, '10라운드 주문 DC +1 · 주문 공격 이점', { res: { long: 1 }, bonus: true, when: (c, x) => H.W.fight(c, x) && !DN.bon(c, 'innate'), run(c, x) { DN.buff(c, 'innate', H.R6(10), { dcB: 1, adv: 1 }); H.ring(x, c, 1, '#c9a6ff'); } });
  A('ft_veil', '자연의 장막', "Nature's Veil", 'archer', 14, '투명: 나를 노리는 공격 불리 · 내 공격 이점', { res: { long: 1 }, bonus: true, when: (c, x) => H.W.fight(c, x) && !DN.bon(c, 'veil'), run(c, x) { DN.buff(c, 'veil', H.R6(1), { hitDis: 1, adv: 1 }); H.ring(x, c, 0.9, '#9fd8a0'); } });
  A('ft_abjure', '적 물리치기', 'Abjure Foes', 'paladin', 9, '매력만큼의 적 지혜 내성 · 공포 10라운드', { res: { short: 1 }, when: H.W.pack(2), run(c, x) { for (const o of x.seen.slice(0, Math.max(1, DN.mod(DN.ab(c.merc).cha)))) H.cond(x, c, o, 'wis', 'frightened', 10); } });
  A('ft_sanctuary', '자연의 성역', "Nature's Sanctuary", 'scout', 14, '곁의 동료 절반 엄폐(AC +2) · 대지의 저항 · 10라운드 · 야생 변신', { res: { short: 1 }, when: H.W.fight, run(c, x) { const t = G.SRD.landRes(c.merc); for (const p of x.rt.party.filter(p => !p.dead && Math.hypot(p.x - c.x, p.y - c.y) <= 3)) { DN.buff(p, 'sanct', H.R6(10), Object.assign({ ac: 2 }, t && p !== c ? { ['res_' + t]: 1 } : {})); H.ring(x, p, 0.9, '#9fd8a0'); } } }); // SRD: 15피트 정육면체 안 절반 엄폐, 동료는 자연의 수호 저항 · 1분
  // 무기 숙련 (SRD Mastery): 근접 직업의 선택지
  const WM = ['dragoon', 'barbarian', 'paladin', 'archer', 'rogue'], close = H.W.close(1.8);
  A('wm_slow', '느리게', 'Slow', WM, 1, '무기 공격 · 이동 −2칸', { when: close, run(c, x) { const o = H.nearest(x, c, 1.8); H.weaponAtk(x, c, o, null, () => { o.shock = Math.max(o.shock || 0, 6); }); } }, 'w_mace');
  A('wm_graze', '스치기', 'Graze', WM, 1, '무기 공격 · 빗나가도 능력치만큼 피해', { when: close, run(c, x) { const o = H.nearest(x, c, 1.8), w = DN.weapon(c); if (!H.weaponAtk(x, c, o).hit) F().hurt(x.f, x.rt, o, Math.max(1, w.b) * H.G0(x, c), 'hit', c); } }, 'w_sword');
  A('wm_vex', '괴롭히기', 'Vex', WM, 1, '무기 공격 · 맞히면 다음 공격 이점', { when: close, run(c, x) { const o = H.nearest(x, c, 1.8); H.weaponAtk(x, c, o, null, () => DN.buff(c, 'vex', H.R6(1), { adv: 1 })); } }, 'w_knife');
  A('wm_nick', '베어 넘기기', 'Nick', ['dragoon', 'rogue', 'barbarian'], 1, '곁의 적에게 무기 주사위 한 번 더', { bonus: true, when: close, run(c, x) { const o = H.nearest(x, c, 1.8), w = DN.weapon(c); H.strike(x, c, o, [w.n, w.d], 'hit'); } }, 'w_knife');
  for (const k of ['ft_innate', 'ft_veil', 'wm_slow', 'wm_graze', 'wm_vex', 'wm_nick']) D.SK_RANGE[k] = 1.5; D.SK_RANGE.ft_abjure = 6; D.SK_RANGE.ft_sanctuary = 6;
  // 무기 숙련은 다른 직업도 고른다
  for (const k of ['sr_cleave', 'sr_topple', 'sr_sap', 'sr_push']) { const S = D.MSKILLS[k]; S.lv = {}; for (const c of WM) { S.lv[c] = 1; if (!D.MPOOL[c].includes(k)) D.MPOOL[c].push(k); } }
  // 바바리안 · 몽크 · 로그 기본 기능을 풀에 (전직 없이도)
  const add = (c, k, lv) => { const S = D.MSKILLS[k]; if (typeof S.lv !== 'object') S.lv = { [c]: S.lv || lv }; S.lv[c] = lv; if (!D.MPOOL[c].includes(k)) D.MPOOL[c].push(k); };
  add('barbarian', 'sr_intim', 14); add('monk', 'sr_whole', 6); add('monk', 'sr_quiver', 17); add('rogue', 'sr_cstrike', 5); add('rogue', 'sr_devious', 14); add('archer', 'sr_sray', 99);
  delete D.MSKILLS.sr_sray.lv.archer; D.MPOOL.archer = D.MPOOL.archer.filter(k => k !== 'sr_sray');
  // ── SRD 5.2.1 직업 기능 나머지 (2026-11-08, DESIGN.md 158): 전투 · 휴식에 효과가 있는 것 ──
  const SUBT = (adv, k, n, en, cls, lv, d) => { T(k, n, en, cls, lv, d); if (!D.ADV[adv].sig.includes(k)) D.ADV[adv].sig.push(k); };
  T('ft_fontslot', '영감의 샘', 'Font of Inspiration', 'bard', 5, '짧은 휴식에 바드의 영감 · 주문 슬롯으로 영감 하나');
  T('ft_words', '창조의 말', 'Words of Creation', 'bard', 20, '권능어: 치유 · 권능어: 죽음을 늘 준비');
  T('ft_beastsp', '야수 주문', 'Beast Spells', 'scout', 18, '야생 변신 중에도 주문');
  SUBT('land', 'ft_natrec', '자연 회복', 'Natural Recovery', 'scout', 6, '짧은 휴식에 슬롯 합 레벨 절반까지 (6레벨 이상 없음)');
  T('ft_perfect', '완벽한 집중', 'Perfect Focus', 'monk', 15, '선제권을 굴릴 때 집중 점수가 3 이하면 4로');
  SUBT('openhand', 'ft_fleet', '날랜 걸음', 'Fleet Step', 'monk', 11, '다른 추가 행동 뒤 바람의 걸음 (기회 공격을 받지 않는다)');
  SUBT('hunter', 'ft_hlore', '사냥꾼의 지식', "Hunter's Lore", 'archer', 3, '표식한 적의 면역 · 저항 · 취약을 안다');
  SUBT('hunter', 'ft_escape', '무리 벗어나기', 'Defensive Tactics', 'archer', 7, '나를 노리는 기회 공격 불리');
  SUBT('thief', 'ft_supsneak', '최상급 잠행', 'Supreme Sneak', 'rogue', 9, '투명한 채로 공격해도 투명이 풀리지 않는다');
  SUBT('thief', 'ft_umd', '마법 도구 사용', 'Use Magic Device', 'rogue', 13, '충전을 쓸 때 1d6이 6이면 그대로 · 아무 두루마리나 (지능 판정)');
  T('ft_incarnate', '마법의 화신', 'Sorcery Incarnate', 'mage', 7, '타고난 마력이 없으면 마력 점수 2로');
  T('ft_apotheosis', '비전 승천', 'Arcane Apotheosis', 'mage', 20, '타고난 마력 중 차례에 메타매직 하나 무료');
  T('ft_mcunning', '마법의 기지', 'Magical Cunning', 'warlock', 2, '긴 휴식까지 한 번: 계약 슬롯 절반 되찾기 (20레벨 전부)');
  SUBT('evoker', 'ft_sculpt', '주문 조각', 'Sculpt Spells', 'archmage', 6, '내 방출계 주문에 아군은 피해가 없다');
})();
