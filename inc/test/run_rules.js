'use strict';
// 탐사 시제품 규칙 시험: node test/run_rules.js [판 수]  (ROGUELIKE_PLAN 10절 1번 · 8-1)
// 지도 생성 불변식 + 성격이 다른 봇 둘(정찰하는 봇 · 눈 감고 가는 봇)로 판 전체를 돌려 본다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const LOAD = require('./_load.js');
const ctx = { console, Math, JSON }; vm.createContext(ctx);
for (const n of ['core', 'data', 'combat', 'gen', 'rules', 'layout']) vm.runInContext(fs.readFileSync(LOAD.jsPath('run/' + n), 'utf8'), ctx, { filename: n + '.js' });
const R = ctx.RUN, GEN = R.gen;
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };

// ── 판정 확률 ──
t('DC 15에 +5면 55%', Math.abs(R.pCheck(5, 15) - 0.55) < 1e-9);
t('이점은 오른다', R.pCheck(5, 15, 1) > R.pCheck(5, 15));
t('인도는 오른다', R.pCheck(5, 15, 0, true) > R.pCheck(5, 15));
t('능력 판정은 20 자동 성공이 없다', R.pCheck(0, 25) === 0);
t('무리 판정: 둘 중 하나', Math.abs(R.pGroup([0.5, 0.5]) - 0.75) < 1e-9);

// ── 지도 불변식 ──
const N = +(process.argv[2] || 300);
for (let s = 1; s <= N; s++) {
  const m = GEN.make(s), outs = id => m.edges.filter(e => e.a === id), ins = id => m.edges.filter(e => e.b === id);
  const tag = `시드 ${s}`;
  t('입구 하나 · 우두머리 하나', m.nodes.filter(n => n.type === 'start').length === 1 && m.nodes.filter(n => n.type === 'boss').length === 1, tag);
  t('모든 방에 열쇠 없이 나갈 길', m.nodes.every(n => n.type === 'boss' || outs(n.id).some(GEN.keyless)), tag);
  t('입구 말고는 들어오는 길이 있다', m.nodes.every(n => n.id === 0 || ins(n.id).length > 0), tag);
  t('열쇠 없이 끝까지', GEN.path(m), tag);
  t('정예를 피해서도 끝까지', GEN.path(m, n => n.type === 'elite'), tag);
  const tr = m.nodes.filter(n => n.type === 'treasure');
  t('봉인된 보물 방 하나, 들어오는 길은 모두 잠김', tr.length === 1 && ins(tr[0].id).every(e => e.kind === 'locked'), tag);
  t('숨은 통로 하나, 들어가는 방은 다른 길로도 간다', m.edges.filter(e => e.kind === 'hidden').length === 1 && m.edges.filter(e => e.kind === 'hidden').every(e => ins(e.b).length > 1), tag);
  t('우두머리 말고는 막다른 방이 없다', m.nodes.every(n => n.type === 'boss' || outs(n.id).length > 0), tag);
  t('방향은 순서가 오르는 쪽 (되돌아가기 · 고리 없음)', m.edges.every(e => e.b > e.a), tag);
  t('정예 하나 이상', m.nodes.some(n => n.type === 'elite'), tag);
  t('같은 시드는 같은 지도', JSON.stringify(GEN.make(s).edges.map(e => e.kind)) === JSON.stringify(m.edges.map(e => e.kind)), tag);
}

// ── 칸 지도 ──
for (let s = 1; s <= N; s++) {
  const m = GEN.make(s), L = R.layout.make(m), occ = new Map(), tag = `시드 ${s}`;
  let overlap = false, through = false, out = false;
  for (const n of m.nodes) for (const [x, y] of L.room[n.id].cells) { if (x < 0 || y < 0 || x >= L.COLS || y >= L.ROWS) out = true; if (occ.has(x + ',' + y)) overlap = true; occ.set(x + ',' + y, n.id); }
  let doorsOk = true;
  for (const e of m.edges) { const c = L.cor[e.id]; for (const [x, y] of c.cells) if (occ.has(x + ',' + y)) through = true;
    const adj = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) === 1;
    if (occ.get(c.doorA.join(',')) !== e.a || occ.get(c.doorB.join(',')) !== e.b || !adj(c.doorA, c.doorAout) || !adj(c.doorB, c.doorBout)) doorsOk = false;
    for (let i = 1; i < c.cells.length; i++) if (!adj(c.cells[i - 1], c.cells[i])) doorsOk = false; }
  t('문은 제 방에 있고 복도는 이어져 있다', doorsOk, tag);
  t('방이 판 안에 있다', !out, tag); t('방끼리 겹치지 않는다', !overlap, tag); t('복도가 방을 뚫지 않는다', !through, tag);
}

// ── 사건: 직업 선택지 ──
{
  const ALL = R.CLS_ORDER; let lockSeen = 0, mineSeen = 0;
  const trios = []; for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) for (let c = b + 1; c < 5; c++) trios.push([ALL[a], ALL[b], ALL[c]]);
  for (const ev of R.EVENTS) for (const pk of trios) {
    const st = R.newRun(7, pk), n = st.map.nodes[1], ch = R.eventScene(st, n, ev.id), tag = `${ev.id} ${pk.join('+')}`;
    const mine = ch.filter(c => c.cls), locks = ch.filter(c => c.lock);
    t('직업 선택지는 파티에 있는 직업만', mine.every(c => pk.includes(c.cls)), tag);
    t('직업 선택지는 2개까지', mine.length <= 2, tag);
    t('잠긴 선택지는 1개까지, 못 고른다', locks.length <= 1 && locks.every(c => c.off()), tag);
    t('공통 선택지는 모두 나온다', ev.opts.filter(o => !o.cls).every(o => ch.some(c => c.n === o.n)), tag);
    t('고를 수 있는 길이 남아 있다', ch.some(c => !(c.off && c.off())), tag);
    lockSeen += locks.length; mineSeen += mine.length;
    // 모든 선택지를 실제로 골라 봐도 깨지지 않는다
    ch.forEach((c, i) => { if (c.off && c.off()) return; const s2 = R.newRun(11 + i, pk); s2.scene = { kind: 'event', choices: R.eventScene(s2, s2.map.nodes[1], ev.id) }; try { R.choose(s2, i); t('선택지 실행', true); } catch (err) { t('선택지 실행', false, `${tag} ${c.n} ${err.message}`); } });
  }
  console.log(`  사건 ${R.EVENTS.length}개 × 파티 ${trios.length}조합: 직업 선택지 평균 ${(mineSeen / R.EVENTS.length / trios.length).toFixed(1)} · 잠긴 선택지 평균 ${(lockSeen / R.EVENTS.length / trios.length).toFixed(1)}`);
}

// ── 봇 ──
const PARTIES = [['fighter', 'rogue', 'wizard'], ['fighter', 'cleric', 'ranger'], ['rogue', 'wizard', 'cleric'], ['fighter', 'ranger', 'wizard']];
function play(seed, picks, scout) {
  const st = R.newRun(seed, picks); let guard = 0;
  while (!st.done && guard++ < 400) {
    if (st.scene) {
      const ch = st.scene.choices; let i = 0;
      const pick = name => ch.findIndex(c => c.n.startsWith(name));
      if (st.scene.kind === 'fight') { const hpf = R.alive(st).reduce((a, m) => a + m.hp / m.max, 0) / R.alive(st).length; i = scout && hpf < 0.5 && pick('몰래') >= 0 ? pick('몰래') : pick('기습') >= 0 ? pick('기습') : pick('싸운다'); }
      else if (st.scene.kind === 'camp') i = pick('긴 휴식');
      else if (st.scene.kind === 'shop') i = st.gold >= 25 && !st.boughtHere ? (st.boughtHere = true, pick('치유 물약')) : pick('떠난다');
      else { let bp = -1; ch.forEach((c, k) => { if (c.off && c.off()) return; const p = c.check ? c.p : 0.4; if (p > bp) { bp = p; i = k; } }); }
      R.choose(st, Math.max(0, i)); continue;
    }
    st.boughtHere = false;
    if (R.alive(st).some(m => m.hp < m.max * 0.4) && st.items.potion) R.usePotion(st);
    const nx = R.nexts(st);
    if (scout) {
      for (const a of R.roomActs(st)) R.doAct(st, a);
      for (const { e } of R.nexts(st)) for (const a of R.infoActs(st, e)) if (a.id !== 'see') R.doAct(st, a);
    }
    const all = R.nexts(st);
    const score = ({ e, n }) => {
      let s = 0;
      if (scout) { if (n.augury === 'woe') s -= 3; if (n.notes.some(x => x.t.includes('큰 놈'))) s -= 2; if (n.notes.some(x => /적 \d+~(\d+)/.test(x.t) && +x.t.match(/~(\d+)/)[1] >= 7)) s -= 2; if (n.notes.some(x => /쉴 만한|불빛|반짝|마법의/.test(x.t))) s += 2; if (n.alert) s -= 1; }
      if (e.kind === 'locked' && !e.opened) s += scout && n.notes.some(x => x.t === '마법의 기운') ? 1 : -5;
      if (e.kind === 'hidden') s += 2;
      return s + st.rng() * 0.5;
    };
    const best = all.slice().sort((a, b) => score(b) - score(a));
    let moved = false;
    for (const c of best) {
      const acts = R.moveActs(st, c.e); if (!acts.length) continue;
      const a = acts[0]; R.doAct(st, a); if (st.at === c.e.b || st.done) { moved = true; break; }
    }
    if (!moved && !st.done) { const c = nx.find(x => GEN.keyless(x.e)); R.doAct(st, R.moveActs(st, c.e).pop()); }
  }
  return st;
}
for (const scout of [true, false]) {
  let win = 0, runs = 0, hpEnd = 0, dead = 0, steps = 0;
  for (let s = 1; s <= 120; s++) for (const p of PARTIES) {
    const st = play(s, p, scout); runs++; steps += st.turn;
    t('판이 끝난다', !!st.done, `시드 ${s} ${p}`);
    if (st.done === 'win') { win++; hpEnd += R.alive(st).reduce((a, m) => a + m.hp / m.max, 0) / R.alive(st).length; }
    dead += st.party.filter(m => m.dead).length;
  }
  console.log(`  ${scout ? '정찰하는 봇' : '눈 감은 봇'}: 승률 ${(win / runs * 100).toFixed(0)}% · 이긴 판 평균 남은 체력 ${(hpEnd / Math.max(1, win) * 100).toFixed(0)}% · 판당 쓰러짐 ${(dead / runs).toFixed(2)} · 판당 이동 ${(steps / runs).toFixed(1)}`);
}
console.log(`run_rules: ${ok} 통과, ${bad} 실패`);
process.exit(bad ? 1 : 0);
