'use strict';
// 빌드 검증: node test/build_lab.js [판 수] [빌드 이름 일부]
//   SRD 재료로 짜는 알려진 빌드(강타 팔라딘 · 섬뜩한 폭발 난사 · 화염 소서러 …)를 실제 캐릭터로 만들어 진짜 전투(턴 엔진 + 스킬 AI + 운명판)를 돌린다.
//   보는 것: ① 그 조각을 가졌나 (G.Guild.skill · G.Opt) ② 스킬 AI가 실제로 쓰나 (라운드당 횟수) ③ 맞물림 — 초마법이 붙나 · 다른 직업의 슬롯이 나가나 ④ 라운드당 피해
//   조각 표기: 'sr_smite' = 쓰는 기술 (AI가 써야 한다) · '+sr_agon' = 늘 적용되는 기능 (가졌는지만 본다) · '~sr_quicken' = 초마법 (붙은 횟수)
//   sit = { 기술: 장면 } — 상황이 맞아야 쓰는 기술 (교활한 행동 · 재기 · 감속 …): 보통 전투의 횟수로 보지 않고, 그 상황을 만든 장면(SCENES)에서 쓰는지 본다
const { boot } = require('./_fight.js');
const N = +process.argv[2] || 3, ONLY = process.argv[3] || '';
const { G, f } = boot(7);
const D = G.D, GD = G.Guild, F = G.Fantasy, DN = G.Dnd, FATE = G.Dice, ROUNDS = 8;

// 빌드: cls = [[직업, 레벨], …] (첫 줄이 시작 직업 · 뒤는 다중 직업) · skills = 준비한 기술 · opts = { fs · iv · mm } 앞에서부터 켠다 · want = 맞물려야 할 조각
const BUILDS = [
  { n: '강타 팔라딘', cls: [['paladin', 8]], skills: ['sr_smite', 'sr_searing', 'sp_shining_smite', 'sr_bless', 'sp_divine_favor', 'sr_lay', 'sr_sof'], opts: { fs: ['fs_gwf'] }, want: ['sr_smite', 'sr_bless', 'sp_divine_favor', 'sr_sacred', '+fs_gwf', '+sr_aura'] },
  { n: '소서딘 (팔라딘 6 + 소서러 6)', cls: [['paladin', 6], ['mage', 6]], skills: ['sr_smite', 'sr_bless', 'sr_haste', 'sr_fireball', 'sr_firebolt', 'sr_mm'], opts: { fs: ['fs_gwf'], mm: ['sr_quicken', 'sr_twin'] }, want: ['sr_smite', 'sr_haste', 'sr_fireball', '~sr_quicken', '+sr_aura'] },
  { n: '섬뜩한 폭발 난사 (소서러 8 + 워락 2)', cls: [['mage', 8], ['warlock', 2]], skills: ['sr_eb', 'sr_hex', 'sr_fireball', 'sr_sray', 'sr_firebolt'], opts: { mm: ['sr_quicken', 'sr_twin', 'mm_empower'], iv: ['sr_agon', 'iv_repel', 'iv_dsight'] }, want: ['sr_eb', 'sr_hex', '~sr_quicken', '+sr_agon'], sit: { sr_hex: 'boss' } }, // 무리에는 화염구 — 헥스는 오래 칠 큰 적 하나에
  { n: '워락 5 + 팔라딘 5', cls: [['paladin', 5], ['warlock', 5]], skills: ['sr_smite', 'sr_hex', 'sr_eb', 'sr_bless'], opts: { fs: ['fs_gwf'], iv: ['iv_pblade', 'iv_thirst', 'iv_smite'] }, want: ['sr_smite', 'sr_hex'] }, // 근접 강타 빌드 — 섬뜩한 폭발은 거리가 벌어질 때만
  { n: '순수 워락 (악마 후원자)', cls: [['warlock', 10]], skills: ['sr_eb', 'sr_hex', 'sr_fear', 'sr_dark', 'sr_hold', 'sr_hypno'], opts: { iv: ['iv_ptome', 'sr_agon', 'iv_repel', 'iv_dsight', 'iv_spear', 'iv_mind'] }, want: ['sr_eb', 'sr_hex', 'sr_fear', 'sr_dark', 'sp_wall_of_fire', 'sp_insect_plague', '+sr_agon', '+iv_repel', '+iv_dsight', '+sr_rebuke', '+sr_dob'] },
  { n: '칼날 계약 워락', cls: [['warlock', 9]], skills: ['sr_eb', 'sr_hex', 'sr_fear', 'sr_hold'], opts: { iv: ['iv_pblade', 'iv_thirst', 'iv_smite', 'iv_life', 'iv_devour'] }, want: ['+sr_hex', '+iv_pblade', '+iv_thirst', 'iv_smite', '+iv_life'], sit: { iv_smite: 'boss' } }, // 계약 슬롯 둘을 무리에는 큰 주문, 큰 적 하나에는 강타
  { n: '화염 소서러 (용의 혈통)', cls: [['mage', 9]], skills: ['sr_firebolt', 'sr_chroma', 'sr_sray', 'sr_fireball', 'sp_burning_hands', 'sp_wall_of_fire', 'sr_haste'], opts: { mm: ['sr_quicken', 'mm_empower', 'sr_twin'] }, want: ['sr_fireball', 'sr_sray', 'sr_firebolt', '~sr_quicken', '~mm_empower', '+sr_affinity'] },
  { n: '방출계 위저드', cls: [['archmage', 11]], skills: ['sr_rof', 'sr_mm', 'sr_fireball', 'sr_cone', 'sr_chain', 'sr_ice', 'sr_firebolt'], want: ['sr_fireball', 'sr_cone', '+ft_sculpt', '+sr_empower', '+sr_potent'] },
  { n: '제어 위저드', cls: [['archmage', 9]], skills: ['sr_rof', 'sr_web', 'sr_hypno', 'sr_slow', 'sr_hold', 'sp_hold_monster', 'sp_banishment', 'sp_counterspell'], want: ['sr_web', 'sr_hypno', 'sr_slow', 'sr_hold', 'sp_hold_monster', 'sp_banishment'], sit: { sr_slow: 'multi' } },
  { n: '챔피언 파이터', cls: [['dragoon', 11]], skills: ['sr_second', 'sr_surge'], opts: { fs: ['fs_gwf', 'fs_defense'] }, want: ['sr_surge', 'sr_second', '+sr_impcrit', '+fs_gwf'], sit: { sr_second: 'hurt' } },
  { n: '궁수 헌터 레인저', cls: [['archer', 9]], skills: ['sr_hmark', 'sr_ensnare', 'sr_spike', 'sr_cure'], opts: { fs: ['fs_archery'] }, want: ['sr_hmark', '+sr_colossus', '+fs_archery'], sit: { sr_hmark: 'boss' } }, // 무리에는 가시 성장 (같은 집중) — 표식은 큰 적 하나에
  { n: '쌍수 레인저', cls: [['archer', 8]], skills: ['sr_hmark', 'sr_ensnare'], opts: { fs: ['fs_twf'] }, want: ['sr_hmark', '+fs_twf'] },
  { n: '열린 손 몽크', cls: [['monk', 11]], skills: ['sr_flurry', 'sr_patient', 'sr_wind', 'sr_stun', 'sr_whole'], want: ['sr_flurry', 'sr_stun', '+sr_ohtech'] },
  { n: '암습 로그 (도둑)', cls: [['rogue', 9]], skills: ['sr_cunning', 'sr_steady', 'sr_cstrike'], want: ['sr_cunning', 'sr_steady', 'sr_cstrike'], sit: { sr_cunning: 'hurt' } },
  { n: '광전사 바바리안', cls: [['barbarian', 10]], skills: ['sr_rage', 'sr_reckless', 'sr_brutal'], want: ['sr_rage', 'sr_reckless', 'sr_brutal', '+sr_frenzy', '+sr_retal'] },
  { n: '생명 클레릭', cls: [['cleric', 11]], skills: ['sr_sflame', 'sr_cure', 'sr_hword', 'sr_bless', 'sr_mhw', 'sp_heal', 'sr_guard', 'sr_sweapon'], want: ['sr_bless', 'sr_guard', 'sr_hword', '+sr_disciple'] },
  { n: '근접 클레릭 (영혼 수호자)', cls: [['cleric', 9]], skills: ['sr_sflame', 'sr_guard', 'sr_sweapon', 'sr_sof', 'sr_bless', 'sr_cure'], want: ['sr_guard', 'sr_sweapon', 'sr_sof'] },
  { n: '전승 바드', cls: [['bard', 10]], skills: ['sr_mock', 'sr_insp', 'sr_hypno', 'sr_fear', 'sr_hold', 'sr_hword', 'sr_faerie', 'sr_fireball'], want: ['sr_insp', 'sr_hypno', 'sr_fear', 'sr_mock', '+sr_cutting', 'sr_fireball'] },
  { n: '대지 드루이드', cls: [['scout', 9]], skills: ['sr_pflame', 'sr_call', 'sr_moon', 'sr_spike', 'sp_conjure_animals', 'sr_ice', 'sr_wild', 'sr_hword'], want: ['sr_call', 'sr_moon', 'sr_spike', 'sp_conjure_animals', 'sr_wild'], sit: { sr_wild: 'dry' } },
  { n: '행동 쇄도 주문사 (소서러 8 + 파이터 2)', cls: [['mage', 8], ['dragoon', 2]], skills: ['sr_firebolt', 'sr_fireball', 'sr_sray', 'sr_surge', 'sr_second'], opts: { mm: ['sr_quicken', 'mm_empower'] }, want: ['sr_fireball', 'sr_surge', '~sr_quicken'] },
  { n: '언데드 군단 (위저드)', cls: [['archmage', 9]], skills: ['sr_rof', 'sp_animate_dead', 'sr_fireball', 'sr_web'], want: ['+sp_animate_dead', 'sr_fireball'] }, // 시체가 있어야 — 시험 방의 적은 잘 안 죽는다
].filter(b => b.n.includes(ONLY));

// 캐릭터를 만든다: 시작 직업으로 만들고, 다중 직업은 한 레벨씩 올린다. 하위 직업은 그 직업의 것으로. 능력치는 선행 조건을 넘게 고르게 높인다
function make(b) {
  const [c0, l0] = b.cls[0], m = GD.make(f, c0, { lv: l0 });
  m.ab = { str: 16, dex: 16, con: 14, int: 16, wis: 16, cha: 16 }; m.abCls = m.cls;
  const advOf = c => Object.keys(D.ADV).find(a => D.ADV[a].base === c);
  if (l0 >= 3 && !m.adv) m.adv = advOf(c0);
  for (const [c, l] of b.cls.slice(1)) { m.nextCls = c; for (let i = 0; i < l; i++) { m.lv++; GD.grow(m); } }
  m.nextCls = null;
  if (b.opts) { const r = m.opts || G.Opt.roll(m) || {}; m.opts = { ...r }; for (const g of ['fs', 'iv', 'mm']) if (b.opts[g]) m.opts[g] = [...b.opts[g], ...(r[g] || []).filter(k => !b.opts[g].includes(k))]; }
  // 준비한 기술: 그 기술의 직업(다중 직업이면 그 직업의 목록)에 넣는다. 자동 채우기는 끈다
  const own = k => b.cls.map(c => c[0]).find(c => D.MPOOL[c]?.includes(k) || Object.values(D.ADV).some(A => A.base === c && A.sig.includes(k))) || c0;
  m.skManual = true; m.skills = b.skills.filter(k => own(k) === c0);
  for (const e of m.mc || []) e.skills = b.skills.filter(k => own(k) === e.cls);
  return m;
}
// 상황 장면: start = 전투 전에 한 번 · round = 라운드마다 (그 상황을 유지) · mons = 적을 바꾼다
const SCENES = {
  hurt: { n: '다쳐서 적에게 붙어 있다', round: (r, a) => { a.hp = Math.min(a.hp, a.max * 0.35); const o = r.mons.filter(q => q.hp > 0).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0]; if (o && Math.hypot(o.x - a.x, o.y - a.y) > 1.5) { a.x = o.x - 1; a.y = o.y; } } },
  multi: { n: '여러 번 치는 적', mons: [['트롤', 8, 7], ['와이트', 8.6, 6.2], ['홉고블린 대장', 8.8, 7.8], ['트롤', 9.4, 7]] },
  boss: { n: '체력 많은 적 하나', mons: [['오우거', 9, 7]], start: (r) => { for (const o of r.mons) o.hp = o.max = o.max * 4; } },
  dry: { n: '주문 슬롯을 다 썼다', start: (r, a) => { G.Res.of(a.merc).sl = new Array(9).fill(99); } },
};
const MONS = [['산적', 8, 7], ['해골', 8.6, 6.2], ['고블린 전사', 8.8, 7.8], ['늑대', 9.4, 7], ['불량배', 9.2, 6], ['오우거', 11, 7]];
// 방: 빌드 캐릭터 + 동료 둘(클레릭 · 파이터, 같은 레벨), 잘 안 죽는 적 여섯
function stage(m, mons = MONS) {
  f.mercs.length = 0; const ms = [m, GD.make(f, m.cls === 'cleric' ? 'bard' : 'cleric', { lv: m.lv }), GD.make(f, m.cls === 'dragoon' ? 'barbarian' : 'dragoon', { lv: m.lv })]; f.mercs.push(...ms); f.lineup = ms.map(x => x.uid);
  f.town = true; const r = F.rt(f); F.syncAllies(f); f.town = false; r.mons = []; r.fields = []; r.fx = [];
  const a = r.party.find(p => p.merc === m); r.party = r.party.filter(p => ms.includes(p.merc));
  r.party.forEach((p, i) => { p.x = 5 + (i % 2); p.y = 6 + i; });
  mons.forEach(([n, x, y]) => { const o = F.spawnMon(r, 1, { n, ...D.F.mon[n] }, x, y, false, { aggro: true, spotted: true, major: true }); o.hp = o.max = Math.max(o.max, 16 * m.lv); });
  F.refreshEnts(r); if (G.Sight?.update) G.Sight.update(r);
  FATE.end(); FATE.board = null; r.phase = 'explore'; r.turn = null;
  FATE.party = () => r.party.filter(p => !p.dead && p.hp > 0); FATE.roster = () => r.party; FATE.cur = () => r.turn?.cur || null; FATE.newBoard();
  return { r, a };
}

// 감시: 누가 어떤 기술을 썼나 · 초마법이 붙었나 · 누가 얼마나 때렸나
let watch = null;
for (const k of Object.keys(G.Skill.SK)) { const S = G.Skill.SK[k], run = S.run, rider = S.rider;
  if (run) S.run = function (c, x) { const out = run.apply(this, arguments); if (watch && c === watch.a && out !== false) { watch.use[k] = (watch.use[k] || 0) + 1; if (process.env.TRACE) console.log(`      썼다: ${D.MSKILLS[k]?.n || k}`); } return out; };
  if (rider) S.rider = function (c, x, o) { if (watch && c === watch.a) watch.use[k] = (watch.use[k] || 0) + 1; return rider.apply(this, arguments); }; } // 맞힌 뒤에 붙는 기술(강타)
// 기본 공격: 주문 직업은 소마법이 기본 공격이다 (시작 직업의 것 — js/rules/dnd.js CANTRIP)
const BASIC = { warlock: 'sr_eb', mage: 'sr_firebolt', cleric: 'sr_sflame', bard: 'sr_mock', archmage: 'sr_rof', scout: 'sr_pflame' };
{ const at = F.allyAttack; F.allyAttack = function (ff, r, a, tg) { if (watch && a === watch.a) { const k = DN.cantripAtk(a) ? (DN.ebOf(a.merc) ? 'sr_eb' : BASIC[a.merc.cls] || '기본 공격') : '무기 공격'; watch.use[k] = (watch.use[k] || 0) + 1; } return at.apply(this, arguments); }; }
{ const end = G.Opt.end; G.Opt.end = function (a, out, ran) { if (watch && a === watch.a && ran !== false && out) { for (const k of out.used || []) watch.meta[k] = (watch.meta[k] || 0) + 1; if (out.emp && DN.rerollUsed) watch.meta.mm_empower = (watch.meta.mm_empower || 0) + 1; if (out.tw) watch.meta.sr_twin = (watch.meta.sr_twin || 0) + 1; if (out.ht) watch.meta.mm_height = (watch.meta.mm_height || 0) + 1; } return end.apply(this, arguments); }; }
// 왜 안 쓰나: 스킬 AI가 순서를 매길 때마다 — 후보 목록에 있었나 · 점수가 얼마였나 · 문턱(기본 공격)을 넘었나
{ const rank = G.SkillAI.rank; G.SkillAI.rank = function (list, a, x0, bonus) { const out = rank.apply(this, arguments); if (watch && a === watch.a) { const th = G.SkillAI.last?.threat || 0; if (process.env.TRACE && !bonus) console.log(`  [r${watch.r?.turn?.round} 행동] 위협 ${th.toFixed(2)} 후보 ${(G.SkillAI.last?.out || []).map(q => nm(q[0]) + ' ' + q[1].toFixed(2)).join(' · ')} → 통과 ${out.length}개 | 집중 ${a.concK || '-'} 변신 ${!!a.wild} 슬롯씀 ${!!a.slotUsed}`); for (const k of watch.want) { const d = watch.why[k] || (watch.why[k] = { n: 0, inList: 0, pass: 0, score: 0 }); d.n++; if (!list.includes(k)) continue; d.inList++; let v = 0; try { const reach = D.SK_RANGE[k], x = { ...x0, reach, seen: reach == null ? x0.seen : x0.seen.filter(o => Math.hypot(o.x - a.x, o.y - a.y) <= Math.max(reach, 1.5) + 0.5) }; v = G.SkillAI.score(k, a, x.seen.length ? x : x0, th); } catch (e) { v = NaN; } d.score += v; if (out.includes(k)) d.pass++; } } return out; }; }
{ const heal = F.healTurn; F.healTurn = function (ff, r, a) { const out = heal.apply(this, arguments); if (watch && a === watch.a && out) watch.use['기본 치유'] = (watch.use['기본 치유'] || 0) + 1; return out; }; }
{ const hurt = F.hurt; F.hurt = function (ff, r, mo, d, src, from) { if (watch && from === watch.a && d > 0) watch.dmg += d; return hurt.apply(this, arguments); }; }

const nm = k => D.MSKILLS[k]?.n || k;
// 전투를 돌린다 (rounds 라운드까지). sc = 상황 장면 (라운드마다 그 상황을 다시 만든다)
function fight(r, a, rounds, sc) {
  let round = 0;
  for (let k = 0; k < 6000; k++) {
    const U = r.turn;
    if (U && U.round !== round) { if (U.round > rounds) break; round = U.round; FATE.useRound(U.round); FATE.fire(); for (const p of r.party) if (!p.dead) p.hp = Math.max(p.hp, p.max * 0.3); /* 빌드를 보려는 것이라 파티는 안 죽게 (다치기는 한다 — 치유를 봐야 하니) */ sc?.round?.(r, a); }
    if (sc?.round && U?.cur === a && !a._scAt) { sc.round(r, a); a._scAt = 1; } else if (U?.cur !== a) a._scAt = 0; // 그 사람의 차례가 올 때 상황이 살아 있게
    G.tick(0.1);
    if (!r.mons.some(o => o.hp > 0) || a.dead) break;
  }
  return round;
}
// 상황 장면에서 그 기술을 쓰나: 라운드당 횟수
const SIT_ROUNDS = 3;
function sitRun(b, k) {
  const sc = SCENES[b.sit[k]]; let n = 0, rounds = 0;
  for (let t = 0; t < N; t++) { const m = make(b), { r, a } = stage(m, sc.mons); sc.start?.(r, a); watch = { a, r, use: {}, meta: {}, dmg: 0, why: {}, want: [k] }; try { rounds += Math.max(1, fight(r, a, SIT_ROUNDS, sc)); } catch (e) { rounds++; } n += watch.use[k] || 0; FATE.end(); watch = null; }
  return { n, rounds, sc };
}
for (const b of BUILDS) {
  const T = { use: {}, meta: {}, dmg: 0, rounds: 0, has: {}, why: {}, err: '' };
  for (let t = 0; t < N; t++) {
    let m, X; try { m = make(b); X = stage(m); } catch (e) { T.err = '준비: ' + e.message.slice(0, 80); break; }
    const { r, a } = X; watch = { a, r, use: {}, meta: {}, dmg: 0, why: {}, want: b.want.filter(w => !/^[+~]/.test(w)) };
    for (const w of b.want) { const k = w.replace(/^[+~]/, ''); T.has[k] = !!(GD.skill(m, k) || G.Opt.has(a, k) || (G.MC.on(m) && G.MC.list(m).some(c => GD.skill(G.MC.view(m, c.cls), k) || G.Opt.has({ merc: G.MC.view(m, c.cls) }, k)))); }
    let round = 0;
    try { round = fight(r, a, ROUNDS); } catch (e) { T.err = e.message.slice(0, 80); }
    T.rounds += Math.max(1, round); T.dmg += watch.dmg; for (const k in watch.use) T.use[k] = (T.use[k] || 0) + watch.use[k]; for (const k in watch.meta) T.meta[k] = (T.meta[k] || 0) + watch.meta[k];
    for (const k in watch.why) { const d = T.why[k] || (T.why[k] = { n: 0, inList: 0, pass: 0, score: 0 }); for (const q in d) d[q] += watch.why[k][q]; }
    FATE.end(); watch = null;
  }
  const per = n => (n / Math.max(1, T.rounds)).toFixed(2), per0 = (n, R) => (n / Math.max(1, R)).toFixed(2), bad = [];
  // 집중 주문은 한 번에 하나 — 원하는 집중 주문들은 한 묶음으로 본다 (하나라도 쓰면 된다)
  const isConc = w => !/^[+~]/.test(w) && G.Skill.SK[w]?.conc, cg = b.want.filter(isConc);
  const concCell = cg.length > 1 ? (() => { const used = cg.filter(k => T.use[k]); if (!used.length) bad.push(`집중 주문(${cg.map(nm).join(' · ')}) 하나도 안 씀`); return `집중(하나씩): ${cg.map(k => `${nm(k)} ${T.use[k] ? per(T.use[k]) : '0'}`).join(' · ')}`; })() : null;
  const sit = b.sit || {}, cells = b.want.filter(w => !(cg.length > 1 && isConc(w)) && !sit[w]).map(w => { const k = w.replace(/^[+~]/, ''), kind = w[0] === '+' ? 'has' : w[0] === '~' ? 'meta' : 'use';
    if (kind === 'has') { if (!T.has[k]) bad.push(`${nm(k)} 없음`); return `${nm(k)} ${T.has[k] ? '있음' : '✗없음'}`; }
    const n = kind === 'meta' ? T.meta[k] || 0 : T.use[k] || 0;
    if (!n) { const d = T.why[k], S = G.Skill.SK[k], why = kind === 'meta' ? '안 붙음' : !S ? '기술 코드 없음' : S.rider ? '맞힌 뒤 기술 — 안 붙음' : !d || !d.inList ? '후보 목록에 없음' : !d.pass ? `점수 낮음 (평균 ${(d.score / d.inList).toFixed(2)} · 문턱 0.9)` : `점수는 넘었다(${(d.score / d.inList).toFixed(2)}) — 조건 · 자원 · 더 높은 기술에 밀림`; bad.push(`${nm(k)}: ${why}`); } return `${nm(k)} ${n ? per(n) + '/라운드' : '✗0'}`; });
  const extra = Object.keys(T.use).filter(k => !b.want.includes(k)).sort((p, q) => T.use[q] - T.use[p]).slice(0, 5).map(k => `${nm(k)} ${per(T.use[k])}`);
  if (concCell) cells.push(concCell);
  for (const k in sit) { const { n, rounds, sc } = sitRun(b, k); if (!n) bad.push(`${nm(k)}: 「${sc.n}」에서도 안 씀`); cells.push(`${nm(k)} 「${sc.n}」 ${n ? per0(n, rounds) + '/라운드' : '✗0'}`); }
  console.log(`\n■ ${b.n} — ${bad.length || T.err ? '✗ ' + (T.err || bad.join(' · ')) : '맞물린다'}`);
  console.log(`  조각: ${cells.join(' | ')}`);
  console.log(`  그 밖에 쓴 것: ${extra.join(' · ') || '없음'} · 라운드당 피해 ${Math.round(T.dmg / Math.max(1, T.rounds))} (${T.rounds}라운드)`);
}
