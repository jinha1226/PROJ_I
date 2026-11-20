'use strict';
// 운명판 전수 조사: node test/dice_lab.js [횟수]
//   기술마다 (그리고 직업마다 기본 공격을) 실제 엔진으로 발동해, 우리 쪽이 굴린 d20이 운명판의 칸에서 왔는지 본다.
//   규칙 (js/game/fate.js): 한 사람의 한 라운드 = 한 칸 — 무엇을 하든 칸을 하나 쓰고, 그 라운드의 명중 d20 · 시킨 내성(21 − 눈) · 그 행동의 피해 · 치유 주사위가 모두 그 눈에서 나온다.
// 분류 (기술이 도는 동안):
//   칸        우리 쪽 d20이 판의 눈이었다 (정상)
//   공격!     우리 공격이 판 밖의 d20이었다 (샜다)
//   내성!     자기 차례에 시킨 적의 내성이 판 밖의 d20이었다 (샜다)
//   맨d20     공격 · 내성 틀을 안 거친 d20 (어디서 굴렸는지 함께 적는다) — 판을 모른다
//   칸안씀    행동했는데 그 라운드의 칸을 안 썼다 (샜다)
const { boot, spawn } = require('./_fight.js');
const N = +process.argv[2] || 6;
const { G, f, r: rt } = boot(11);
const D = G.D, GD = G.Guild, F = G.Fantasy, DN = G.Dnd, FATE = G.Dice, LV = 20;
// 그 기술을 쓸 수 있는 직업들 (여럿이면 차례로 시도해 실제로 발동하는 직업으로 본다 — 바드는 남의 주문을 빌려 쓰니 맨 뒤)
const classesOf = k => { const out = [], L0 = D.MSKILLS[k]?.lv; if (L0 && typeof L0 === 'object') out.push(...Object.keys(L0).filter(c => D.MPOOL[c])); for (const c in D.MPOOL) if (D.MPOOL[c].includes(k)) out.push(c); for (const a in D.ADV) if (D.ADV[a].sig.includes(k)) out.push(D.ADV[a].base); const u = [...new Set(out)]; return (u.length ? u : ['archmage']).sort((x, y) => (x === 'bard') - (y === 'bard')); };

// 그 직업 한 사람(20레벨) + 동료 둘을 방에 세우고, 안 죽는 적 여섯을 뭉쳐(광역이 고르게) · 하나는 멀리 놓는다. 판을 굴리고 1라운드를 연다.
function fixture(cls, lv = LV, live = false) {
  f.mercs.length = 0; const a2 = cls === 'cleric' ? 'bard' : 'cleric', ms = [cls, a2, cls === 'paladin' ? 'barbarian' : 'paladin'].map(c => GD.make(f, c, { lv })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid);
  f.town = true; const r = F.rt(f); F.syncAllies(f); f.town = false; r.phase = 'fight'; r.mons = []; r.fields = []; r.fx = [];
  const a = r.party.find(p => p.merc === ms[0]), others = r.party.filter(p => p.merc && p !== a && ms.includes(p.merc));
  r.party = r.party.filter(p => p === a || others.includes(p));
  a.x = 6; a.y = 7; others.forEach((p, i) => { p.x = 5; p.y = 6 + i * 2; if (!live) p.hp = p.max * 0.3; }); if (!live) a.hp = a.max * 0.3;
  [['산적', 7, 7], ['해골', 7.6, 6.4], ['고블린 전사', 7.8, 7.6], ['늑대', 8.4, 7], ['불량배', 8.2, 6.2], ['오우거', 11, 7]].forEach(([n, x, y]) => { const o = F.spawnMon(r, 1, { n, ...D.F.mon[n] }, x, y, false, { aggro: true, spotted: true, major: true }); o.hp = o.max = 1e12; });
  F.refreshEnts(r); if (G.Sight?.update) G.Sight.update(r);
  FATE.end(); FATE.board = null;
  if (live) { r.phase = 'explore'; r.turn = null; FATE.party = () => r.party.filter(p => !p.dead && p.hp > 0); FATE.roster = () => r.party; FATE.cur = () => r.turn?.cur || null; FATE.newBoard(); return { r, a, others }; } // 진짜 전투: 턴 엔진이 선제권부터
  r.turn = { map: r.map, round: 1, order: [], i: 0, cur: a, ph: 'wait', t: 1, low: 1, downs: 0 }; FATE.party = () => r.party.filter(p => !p.dead && p.hp > 0); FATE.roster = () => r.party; FATE.cur = () => r.turn?.cur || null; FATE.newBoard(); FATE.useRound(1);
  return { r, a, others };
}

// d20 감시: 굴릴 때마다 분류해 now에 쌓는다
let now = null;
const d20 = DN.d20, isOurs = e => !!e && e.kind !== 'mon';
DN.d20 = function (adv) {
  const c = FATE.ctx, cur = FATE.cur();
  const v = d20.call(this, adv); if (!now) return v;
  const S = FATE.st, from = p => !!(S && S.die.get(p)); // 그 사람의 이번 라운드 칸에서 나왔나
  let tag;
  if (c && c.kind === 'attack') tag = !isOurs(c.actor) ? null : from(c.actor) ? '칸' : '공격!';
  else if (c && c.kind === 'save') tag = isOurs(c.target) || !isOurs(cur) ? null : from(cur) ? '칸' : '내성!';
  else { const at = (new Error().stack.split('\n')[2] || '').match(/([\w/]+\.js:\d+)/); tag = '맨d20 ' + (at ? at[1] : '?'); }
  if (tag) { now[tag] = (now[tag] || 0) + 1; if (now.by && isOurs(cur)) { const m = now.by.get(cur) || {}; m[tag] = (m[tag] || 0) + 1; now.by.set(cur, m); } }
  return v;
};

const rows = [];
function tally(R, got, a) { R.fired++; if (!FATE.st.used.has(a)) got['칸안씀'] = 1; const ks = Object.keys(got); if (!ks.length) R.tags['d20 없음'] = (R.tags['d20 없음'] || 0) + 1; for (const k of ks) R.tags[k] = (R.tags[k] || 0) + 1; }

// 1) 기술마다 — 상황 점수(G.SkillAI)는 끈다: 고르는 눈이 아니라 쓰였을 때의 굴림을 보는 조사다
if (G.SkillAI) G.SkillAI.rank = list => list.slice();
const active = GD.active;
for (const k of Object.keys(G.Skill.SK)) {
  const cands = classesOf(k), R = { k, n: D.MSKILLS[k]?.n || '', cls: cands[0], fired: 0, tags: {}, err: new Set() };
  for (let t = 0, ci = 0; t < N; t++) {
    if (!R.fired && t > 0 && ci < cands.length - 1) { ci++; t = 0; } // 한 번도 안 터졌으면 다음 직업으로
    const cls = cands[ci]; R.cls = cls;
    let X; try { X = fixture(cls); } catch (e) { R.err.add('준비: ' + e.message.slice(0, 50)); continue; }
    const { r, a, others } = X;
    if (/spare_the_dying|x_med/.test(k)) { others[1].hp = 0; others[1].dying = { ok: 0, no: 0, by: null }; }
    if (/restoration|remove_curse|dispel/.test(k)) { DN.give(r, others[0], 'poisoned', 1e6, r.mons[0]); DN.give(r, others[0], 'blinded', 1e6, r.mons[0]); }
    if (k === 'sr_revive') { others[1].dead = true; others[1].reviveT = 1e9; others[1].dying = { ok: 0, no: 0, by: null }; others[1].hp = 0; }
    GD.active = () => [k]; now = {};
    try {
      a.gcd = 0; a.cds = {}; a.lastSk = a.lastBonus = a.lastHitSk = null; a.freeDone = null; a.slotUsed = false;
      if (k === 'sr_brutal') DN.buff(a, 'reckless', 10, { adv: 1, hitAdv: 1 });
      const seen = r.mons.filter(o => F.sees(r.map, a, o));
      G.Skill.tick(f, r, a, 0, seen, 'free'); G.Skill.tick(f, r, a, 0, seen); G.Skill.tick(f, r, a, 0, seen, true);
      if (G.Skill.SK[k]?.rider && seen.length) { a.lastBonus = null; a.slotUsed = false; G.Skill.onHit(f, r, a, seen[0]); }
      const fired = a.lastSk === k || a.lastBonus === k || a.lastHitSk === k || a.freeDone?.[k];
      if (fired) { for (let s = 0; s < 30 && G.Skill.persist; s++) G.Skill.persist(f, r, a, 0.1); tally(R, now, a); }
    } catch (e) { R.err.add(e.message.slice(0, 60)); }
    GD.active = active; now = null;
  }
  rows.push(R);
}
// 2) 직업마다 기본 공격 (기술 없이 한 번 친다)
for (const cls of Object.keys(D.MPOOL)) {
  const R = { k: '기본 공격', n: D.F.cls?.[cls]?.n || cls, cls, fired: 0, tags: {}, err: new Set() };
  for (let t = 0; t < N; t++) {
    const { r, a } = fixture(cls); GD.active = () => []; now = {};
    try { const tg = r.mons[0]; if (!(a.def.splash || a.def.chain || a.def.saveAtk)) G.Turn.pre = DN.atkDie(a, tg); /* 턴 엔진처럼: 명중 굴림이 있는 공격만 주사위부터 */ F.allyAttack(f, r, a, tg); G.Turn.pre = null; tally(R, now, a); } catch (e) { G.Turn.pre = null; R.err.add(e.message.slice(0, 60)); }
    GD.active = active; now = null;
  }
  rows.push(R);
}

// 3) 진짜 전투 (턴 엔진 · 앱과 같은 순서로 라운드 · 차례를 넘긴다): 직업 × 레벨마다 여섯 라운드. 사람마다 라운드에 칸을 썼는지, 자기 차례에 굴린 것이 샜는지
const live = [];
for (const cls of Object.keys(D.MPOOL)) for (const lv of [1, 5, 11, 17]) {
  const R = { cls, lv, turns: 0, cell: 0, leak: 0, raw: {}, idle: 0, idleSk: {}, err: '' };
  for (let t = 0; t < Math.max(2, N >> 1); t++) {
    let X; try { X = fixture(cls, lv, true); } catch (e) { R.err = e.message.slice(0, 60); continue; }
    const { r, a } = X; let round = 0; now = { by: new Map() };
    const close = () => { if (!round || a.dead || a.hp <= 0) return; const S = FATE.st, m = now.by.get(a) || {}, ks = Object.keys(m); R.turns++;
      if (S && S.used.has(a)) R.cell++; else if (ks.some(k => /!$/.test(k))) R.leak++; else if (!ks.length) { R.idle++; const sk = a.lastSk || a.lastBonus || '기본 · 이동'; R.idleSk[sk] = (R.idleSk[sk] || 0) + 1; }
      for (const k of ks) if (/^맨d20/.test(k)) R.raw[k] = (R.raw[k] || 0) + m[k]; now.by = new Map(); a.lastSk = a.lastBonus = null; };
    try {
      for (let k = 0; k < 4000; k++) {
        const T = r.turn;
        if (T && T.round !== round) { close(); if (T.round > 6) break; round = T.round; FATE.useRound(T.round); FATE.fire(); }
        G.tick(0.1);
        if (!r.mons.some(m => m.hp > 0) || !r.party.some(p => !p.dead && p.hp > 0)) { close(); break; }
      }
    } catch (e) { R.err = e.message.slice(0, 60); }
    FATE.end(); now = null;
  }
  live.push(R);
}

const show = R => [R.cls.padEnd(9), R.k.padEnd(26), R.n.padEnd(12), `발동 ${R.fired}/${N}`.padEnd(9), Object.entries(R.tags).map(([k, v]) => `${k} ${v}`).join(' · '), [...R.err].join(' / ')].join(' ');
const has = (R, re) => Object.keys(R.tags).some(k => re.test(k));
const sect = (title, list) => { console.log(`\n── ${title} (${list.length}) ──`); for (const R of list.sort((a, b) => a.cls.localeCompare(b.cls) || a.k.localeCompare(b.k))) console.log(show(R)); };
const fired = rows.filter(R => R.fired);
sect('샜다: 판 밖의 d20 · 행동했는데 칸을 안 썼다', fired.filter(R => has(R, /!$|^칸안씀/)));
sect('판을 모르는 d20 (공격 · 내성 틀 밖)', fired.filter(R => has(R, /^맨d20/)));
sect('정상: 칸을 쓴다', fired.filter(R => !has(R, /!$|^칸안씀|^맨d20/)));
sect('발동 안 됨 · 오류 (못 봤다)', rows.filter(R => !R.fired));
console.log(`\n기술 ${rows.length} · 발동 ${fired.length} · 샘 ${fired.filter(R => has(R, /!$|^칸안씀/)).length} · 틀 밖 ${fired.filter(R => has(R, /^맨d20/)).length}`);
console.log('\n── 진짜 전투: 직업 × 레벨 (그 사람의 라운드마다) ──');
console.log('직업      레벨  라운드  칸 씀  샘  칸 안 씀    (칸을 안 쓴 라운드에 한 일) · 틀 밖 d20');
for (const R of live) console.log([R.cls.padEnd(9), String(R.lv).padEnd(5), String(R.turns).padEnd(7), String(R.cell).padEnd(6), String(R.leak).padEnd(3), String(R.idle).padEnd(10), Object.entries(R.idleSk).map(([k, v]) => `${D.MSKILLS[k]?.n || k} ${v}`).join(' · '), Object.entries(R.raw).map(([k, v]) => `${k} ${v}`).join(' · '), R.err].join(' '));
