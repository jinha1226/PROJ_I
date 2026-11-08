'use strict';
// 전투 주문 원문 대조 (DESIGN.md 163): node test/spell_lab.js [주문 id …] [-v]
// 주문마다 그 직업의 최소 레벨 시전자가 실제로 시전한다 (SK[k].run). 시전 중의 내성 · 명중 · 피해 · 피해 종류 · 상태 · 범위를 가로채 원문(G.SRD_SP[id].srd)과 비교한다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
const ctx = { console: { ...console, error() {} }, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G; G.quiet = true; G.newState();
const f = G.S.w.fantasy, GD = G.Guild, DN = G.Dnd, F = G.Fantasy, SK = G.Skill.SK, D = G.D;
GD.leader(f); f.leaderNew = false; f.lineup = ['cleric', 'archmage', 'bard'].map(c => { const m = GD.make(f, c, { lv: 5 }); f.mercs.push(m); return m.uid; }); F.syncAllies(f); f.floor = f.maxFloor = 6;
f.frontLock = 'green'; const rt = F.rt(f); G.Exp.depart(f, rt); for (let i = 0; i < 5 && !rt.map; i++) G.tick(1, 0.1);
const ARGS = process.argv.slice(2).filter(a => !a.startsWith('-')), VERBOSE = process.argv.includes('-v');
const CLS = { bard: 'bard', cleric: 'cleric', druid: 'scout', paladin: 'paladin', ranger: 'archer', sorcerer: 'mage', warlock: 'warlock', wizard: 'archmage' };
const lvAt = (c, l) => (c === 'paladin' || c === 'archer' ? [1, 1, 5, 9, 13, 17][l] || 17 : Math.max(1, l * 2 - 1));
const avg = d => (d ? d[0] * (d[1] + 1) / 2 + (d[2] || 0) : 0);
// 넓은 빈터 하나를 고른다
const room = rt.map.rooms.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0], cx = room.cx ?? room.x + (room.w >> 1), cy = room.cy ?? room.y + (room.h >> 1);
const cellsFree = []; for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (G.Grid.pass(rt.map, x, y)) cellsFree.push([x, y]);
G.D.F.STAT.T_dummy = ['tough'];
function setup(cls, lv) {
  rt.mons = []; rt.sums = []; rt.fields = []; rt.darks = []; rt.diffs = [];
  const m = GD.make(f, cls, { lv }); m.ab = { str: 16, dex: 16, con: 16, int: 18, wis: 18, cha: 18 };
  const c = rt.party[1]; c.merc = m; c.def = GD.def(m); c.x = cx - 4; c.y = cy; c.max = c.hp = 999; c.cond = {}; c.bf = {}; c.concK = null; c.dead = false; c.pe = []; c.slotUsed = false;
  for (const p of rt.party) if (p !== c) { p.x = c.x - 1; p.y = c.y + (rt.party.indexOf(p) ? 1 : -1) * (rt.party.indexOf(p) > 1 ? 2 : 1); p.pe = []; p.max = 999; p.hp = 1; p.cond = {}; p.bf = {}; p.dead = false; }
  // 표적: 시전자 앞 3칸에 무리 (가운데 하나 + 둘레), 멀리 하나
  const spots = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [6, 0]];
  const mons = spots.map(([dx, dy]) => { const o = F.spawnMon(rt, 6, { n: 'T_dummy', r: 'brute' }, cx + dx, cy + dy, false, { aggro: true, spotted: true }); o.x = cx + dx; o.y = cy + dy; o.hp = o.max = 1e5; o.ty = 'humanoid'; o.cond = {}; o.bf = {}; o.stun = o.stop = 0; o.rep = null; return o; });
  rt.turn = { round: 1, order: [], map: rt.map };
  return { c, m, mons };
}
const rec = { save: [], atk: 0, hurt: [], give: [], area: [], dur: [] };
let FORCE = null; // 'fail' | 'ok'
const sv0 = DN.save; DN.save = (o, ab, dc) => { rec.save.push(ab); if (o.kind === 'mon' && FORCE) return FORCE === 'ok'; return sv0(o, ab, dc); };
const ar0 = DN.attackRoll; DN.attackRoll = (att, tg, critAt) => { rec.atk++; if (tg.kind === 'mon') return { hit: true, crit: false, nat: 12, adv: 0 }; return ar0(att, tg, critAt); };
const hu0 = F.hurt; F.hurt = function (f0, rt0, m, dmg, src, from) { if (m.kind === 'mon') rec.hurt.push({ m, dmg, t: G.Foe.dtype }); return hu0.apply(this, arguments); };
const gv0 = DN.give; DN.give = function (rt0, e, k, t, from) { rec.give.push(k); if (e.kind === 'mon' && t < 1e5) rec.dur.push(t / G.Res_ROUND); return gv0.apply(this, arguments); };
const H = G.Skill.H, hits0 = H.AREA.hits; H.AREA.hits = function (x, c, A, t, up) { rec.area.push(A.shape + ':' + A.ft); return hits0.apply(this, arguments); };
const condsOf = mons => { const s = new Set(rec.give); for (const o of mons) { for (const k in o.cond || {}) s.add(k); if (o.stun > 0) s.add('stunned'); if (o.stop > 0) s.add('paralyzed'); for (const k in o.bf || {}) s.add('bf:' + k); } return [...s]; };
// 주문마다 필요한 장면 (체력 문턱 · 접촉 · 쓰러진 동료 · 상태 · 야수)
const ally = () => rt.party.find(p => p !== rt.party[1]);
const SCENE = {
  'power-word-kill': (c, M) => { M[0].hp = 80; }, 'power-word-stun': (c, M) => { M[0].hp = 120; }, 'divine-word': (c, M) => { M.forEach((o, i) => { o.hp = [20, 35, 45, 60, 20, 35, 45][i]; }); },
  'vampiric-touch': (c, M) => { c.x = M[0].x - 1; c.y = M[0].y; }, 'contagion': (c, M) => { c.x = M[0].x - 1; c.y = M[0].y; },
  'revivify': () => { const p = ally(); p.dead = true; p.hp = 0; p.deadAt = G.S.runTime; p.diedT = G.S.runTime; }, 'spare-the-dying': () => { const p = ally(); p.dead = true; p.hp = 0; p.dying = { ok: 0, no: 1 }; },
  'lesser-restoration': () => { DN.give(rt, ally(), 'poisoned', 600); }, 'greater-restoration': () => { DN.give(rt, ally(), 'charmed', 600); ally().merc.exh = 2; }, 'remove-curse': () => { ally().cursed = true; },
  'animal-friendship': (c, M) => { M.forEach(o => { o.ty = 'beast'; }); }, 'dominate-beast': (c, M) => { M.forEach(o => { o.ty = 'beast'; }); },
  'misty-step': (c, M) => { c.x = M[0].x - 1; c.y = M[0].y; c.hp = 100; }, 'dimension-door': (c, M) => { c.x = M[0].x - 1; c.y = M[0].y; c.hp = 100; },
};
function cast(k, id, slot, mode) {
  const sp = G.SRD_SP[id], cls = Object.keys(CLS).find(c => sp.cls.includes(c)), mc = CLS[cls], lv = lvAt(mc, sp.lv);
  const { c, mons } = setup(mc, lv); for (const r in rec) rec[r] = Array.isArray(rec[r]) ? [] : 0; SCENE[id]?.(c, mons);
  FORCE = mode; const S = SK[k], x = { f, rt, c, reach: D.SK_RANGE[k] ?? 12, base: S.base, seen: mons.slice(), slot };
  G.Foe.dtype = G.Skill.skillType(k, c); let ran; if (S.when && !S.when(c, x)) return { skip: true };
  const hp0 = rt.party.map(p => p.hp);
  try { ran = S.run(c, x); } catch (e) { return { err: e.message + ' @ ' + (e.stack.split('\n')[1] || '').trim() }; }
  G.Foe.dtype = null;
  const fieldT = Math.max(0, ...(rt.fields || []).map(q => q.t / G.Res_ROUND), ...(c.pe || []).map(q => (q.until - G.S.runTime) / G.Res_ROUND).filter(v => v > 0 && v < 1e5));
  for (const o of mons) { G.Skill.startOf(f, rt, o); F.startTurnFx(f, rt, o); G.Skill.endTurn?.(f, rt, o); }
  if (G.Skill.persist) { const sv = x.seen; G.Skill.persist(f, rt, c, G.Res_ROUND); } // 시전자의 다음 차례 (소환 · 이동하는 범위)
  FORCE = null;
  const per = new Map(); for (const h of rec.hurt) per.set(h.m, (per.get(h.m) || 0) + h.dmg);
  // 이어지는 효과 (지속 피해 · 장판): 한 라운드 돌린다
  return { ran, saves: [...new Set(rec.save)], atk: rec.atk, dmg: per.size ? [...per.values()].reduce((a, b) => a + b, 0) / per.size : 0, /* 맞은 표적의 평균 */ types: [...new Set(rec.hurt.map(h => h.t).filter(Boolean))], hitN: per.size, conds: condsOf(mons), area: [...new Set(rec.area)], conc: !!S.conc, fieldT, heal: Math.max(0, ...rt.party.map((p, i) => p.hp - hp0[i])), dur: Math.max(0, ...rec.dur, ...mons.map(o => Math.max(o.stun || 0, o.stop || 0) / G.Res_ROUND)), rep: mons.some(o => o.rep?.length || o.repDmg?.length || o.actSave || o.indigo || o.rep3 || o.weird || o.sleep || o.confDC) };
}
const N = 60;
function measure(k, id, slot) {
  let s = 0, s2 = 0, last = null, err = null;
  let h = 0; for (let i = 0; i < N; i++) { const r = cast(k, id, slot, 'fail'); if (r.err) { err = r.err; break; } if (r.skip) return { skip: true }; s += r.dmg; h += r.heal; last = r; }
  if (err) return { err };
  for (let i = 0; i < N; i++) s2 += cast(k, id, slot, 'ok').dmg || 0;
  return { ...last, avg: s / N, avgOk: s2 / N, healAvg: h / N };
}
// 원문 기대값
const TYPES = 'acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder';
const textDice = t => { const body = t.split(/Using a Higher-Level Spell Slot|Cantrip Upgrade/)[0]; return [...body.matchAll(new RegExp('(\\d+)d(\\d+)(?: ?\\+ ?(\\d+))?(?: plus your spellcasting ability modifier| \\+ your spellcasting ability modifier)? (' + TYPES + ') damage', 'gi'))].map(m => [+m[1], +m[2], +(m[3] || 0), m[4].toLowerCase()]); };
const condReq = t => [...t.matchAll(/(?:has|have|gains?) the (\w+) condition/gi)].filter(m => !/(doesn.t|can.t|isn.t|no longer|ends?|immune|Immunity|end the|without)[^.]{0,30}$/i.test(t.slice(Math.max(0, m.index - 40), m.index))).map(m => m[1].toLowerCase());
const textSave = t => { const m = /(?:make|makes|succeed on|must succeed on) an? (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/i.exec(t); return m ? m[1].slice(0, 3).toLowerCase() : null; };
const expect = id => { const sp = G.SRD_SP[id], S = sp.srd; return { save: textSave(S.text) || S.save, atk: S.atk, dice: S.dice, dt: S.dt, half: S.half, conds: [...new Set(condReq(S.text))], tdice: textDice(S.text), rider: /when you hit|hits? (?:a|the) (?:creature|target) with an attack|extra \d+d\d+|next attack|weapon attack/i.test(S.text), area: S.area, conc: S.conc, heal: S.heal }; };
const ids = ARGS.length ? ARGS : Object.keys(G.SRD_SP).filter(id => G.SRD_SP[id].k !== 'util');
const byEn = {}; for (const k in D.MSKILLS) { const e = D.MSKILLS[k].en; if (e && SK[k]?.run && !SK[k].noCombat && !G.Util?.FX[k] && !k.startsWith('wm_')) (byEn[e] = byEn[e] || []).push(k); } // 무기 숙련 (Slow · Vex …)은 주문이 아니다
const out = [];
for (const id of ids) {
  const sp = G.SRD_SP[id]; const ks = byEn[sp.en] || []; if (!ks.length) { out.push([id, '-', '전투 코드 없음 (반응 · 명중 뒤 · 전투 밖)']); continue; }
  const E = expect(id);
  for (const k of ks) {
    const r = measure(k, id, Math.max(1, sp.lv)), bad = [];
    if (r.err) { out.push([id, k, '오류 ' + r.err]); continue; }
    if (r.skip) { out.push([id, k, '조건 안 맞음 (시험 자리)']); continue; }
    const DUR = { 'Instantaneous': 0, '1 round': 1, '1 minute': 10, '10 minutes': 100, '1 hour': 600, '8 hours': 4800, '24 hours': 14400 }, dw = DUR[(sp.srd.dur || '').replace(/^Concentration, up to /, '').replace(/^up to /, '')];
    const short = /(?:has|have) the \w+ condition until the (?:start|end) of (?:your|its|the target.s) next turn/i.test(sp.srd.text), timed = E.conds.filter(k => k !== 'prone');
    if (timed.length && !short && dw > 1 && r.dur && Math.max(r.dur, r.fieldT) < Math.min(dw, 100) * 0.9 && !r.rep) bad.push(`지속 ${r.dur.toFixed(1)}라운드 ≠ ${sp.srd.dur}`);
    if (E.conds.length && /repeats? the save|repeat the save/i.test(sp.srd.text) && r.dur && !r.rep) bad.push('차례 끝 재내성 없음');
    if (E.heal && r.ran !== false) { const want = avg(E.heal); if (r.healAvg < want * 0.8 || r.healAvg > want + 9) bad.push(`치유 평균 ${r.healAvg.toFixed(1)} ≠ ${E.heal.join(',')} (+주문 능력)`); }
    if (r.ran === false && !(SK[k].when && false)) bad.push('시전 안 됨(ran=false)');
    const field = sp.k === 'field' && !/willing|touch/i.test(sp.srd.range || ''), wants0 = [E.dice && avg(E.dice), E.tdice.length && E.tdice.reduce((a, d) => a + avg(d), 0), ...E.tdice.map(avg)].filter(v => v > 0), wants = field ? wants0.map(w => w * 2) : wants0 /* 장판 (SRD): 나타날 때 + 그 생물의 차례 끝 */, near = v => wants.some(w => Math.abs(v - w) <= Math.max(1.5, w * 0.2));
    if (E.save && r.ran !== false && !r.saves.includes(E.save) && (E.conds.length || wants.length) && !/(?:willing|unwilling)/i.test(sp.srd.text.slice(0, 200))) bad.push(`내성 ${r.saves.join('/') || '없음'} ≠ ${E.save}`);
    if (!E.save && r.saves.length && !E.atk) bad.push(`원문에 없는 내성 ${r.saves.join('/')}`);
    if (E.atk && r.ran !== false && !r.atk) bad.push('명중 굴림 없음');

    if (wants.length && !E.heal && r.ran !== false && !(E.rider && r.avg === 0)) { const want = Math.max(...wants); if (!near(r.avg) && !(/three rays|three darts|glowing darts|beams|bolts/i.test(sp.srd.text) && r.avg > want * 0.8)) bad.push(`피해 평균 ${r.avg.toFixed(1)} ≠ ${wants.map(w => w.toFixed(1)).join('/')}`);
      if (E.save && E.dice) { const okW = wants.map(w => (E.half ? w / 2 : 0)); if (!okW.some(w => Math.abs(r.avgOk - w) <= Math.max(1.5, w * 0.25)) && !(r.avgOk > 0 && !/saving throw[^.]*(?:or take|failed save|half as much)/i.test(sp.srd.text))) bad.push(`내성 성공 ${r.avgOk.toFixed(1)} ≠ ${E.half ? '절반' : '0'}`); }
      if (E.dt && r.types.length && !r.types.includes(E.dt)) bad.push(`피해 종류 ${r.types.join('/')} ≠ ${E.dt}`); }
    if (!wants.length && r.dmg > 0 && !E.heal) bad.push(`원문에 없는 피해 ${r.avg.toFixed(1)}`);
    for (const cnd of E.conds) if (r.ran !== false && !r.conds.includes(cnd) && !r.conds.some(q => q.includes(cnd)) && !(r.rep && r.conds.length) && !new RegExp('(Immunity to|immune to|can\'t be|doesn\'t have|ends the) [^.]{0,40}' + cnd, 'i').test(sp.srd.text)) bad.push(`상태 ${cnd} 없음`);
    if (E.area && r.area.length && !r.area.some(a => a.startsWith(E.area.shape === 'square' ? 'cube' : E.area.shape) && a.endsWith(':' + E.area.ft)) && !r.area.some(a => a.endsWith(':' + E.area.ft))) bad.push(`범위 ${r.area.join('/')} ≠ ${E.area.shape}:${E.area.ft}`);
    if (E.conc !== r.conc) bad.push(`집중 ${r.conc} ≠ ${E.conc}`);
    out.push([id, k, bad.join(' · ') || 'ok', VERBOSE ? JSON.stringify({ avg: r.avg, ok: r.avgOk, heal: r.healAvg, dur: r.dur, rep: r.rep, saves: r.saves, types: r.types, conds: r.conds, area: r.area, hitN: r.hitN }) : '']);
  }
}
// 원인을 확인한 차이 (DESIGN.md 163): 시험대의 한계 · 원문을 그대로 따른 AI 판단
const KNOWN = {"tick":[],"dice":["conjure-fey","arcane-sword","chromatic-orb","delayed-blast-fireball","prismatic-spray","sorcerous-burst","true-strike","flame-blade","spiritual-weapon","conjure-elemental","scorching-ray","ice-knife","arcane-hand"],"place":["remove-curse","revivify","circle-of-death","freezing-sphere","sunburst","dragons-breath","contagion","conjure-woodland-beings"],"seq":["power-word-kill","power-word-stun","dimension-door","eyebite","flesh-to-stone","imprisonment","fire-shield","spike-growth","web"],"sub":["mass-cure-wounds","cure-wounds","healing-word","mass-healing-word","heal","mass-heal","prayer-of-healing"],"text":["heat-metal","greater-invisibility","invisibility","mind-spike","mirror-image","mislead","power-word-heal","holy-aura","conjure-celestial"]}, WHY = {"tick":"시전 + 다음 차례를 함께 잰 값 (라운드당 한 번은 원문과 같다 · 시점은 시전자 차례)","dice":"원문 피해가 고른 종류 · 무기 · 광선 여럿이라 시험대가 못 읽는다","place":"시험 자리 (60피트 구가 파티를 덮어 AI가 안 쓴다 · 접촉 · 발산)","seq":"여러 차례 · 고르는 효과 · 적이 움직여야 생기는 효과","sub":"하위 직업 기능이 더한 값 (생명의 제자: 치유 +2 + 슬롯 레벨)","text":"원문의 해제 · 면역 문장 · 아군에게 거는 주문"}, knownOf = id => Object.keys(KNOWN).find(k => KNOWN[k].includes(id));
for (const o of out) if (o[2] !== 'ok' && !/조건 안 맞음|전투 코드 없음/.test(o[2]) && knownOf(o[0])) o[2] = '확인됨 · ' + WHY[knownOf(o[0])] + ' — ' + o[2];
const badN = out.filter(o => o[2] !== 'ok' && !o[2].startsWith('확인됨') && !/조건 안 맞음|전투 코드 없음/.test(o[2])).length;
for (const o of out) if ((o[2] !== 'ok' && !o[2].startsWith('확인됨') && !/조건 안 맞음|전투 코드 없음/.test(o[2])) || VERBOSE) console.log(o.filter(Boolean).join(' | '));
console.log(`spell_lab: ${out.length}개 · 원문과 같음 ${out.filter(o => o[2] === 'ok').length} · 확인된 차이 ${out.filter(o => o[2].startsWith('확인됨')).length} · 시험 자리 없음 ${out.filter(o => /조건 안 맞음|전투 코드 없음/.test(o[2])).length} · 설명 안 된 차이 ${badN}`);
