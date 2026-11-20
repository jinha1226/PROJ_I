'use strict';
// 쿼터뷰 전투 + 라운드 주사위 (화면 없이): node test/crawl_fight_rules.js
// 새 게임이 전투 방에서 하는 것과 같게 — 몬스터를 세우고(major · aggro · spotted) 옛 SRD 턴제 전투(G.Turn · G.Flow)를 G.tick으로 돌린다.
// 운명판(G.Dice)의 줄을 굴려 두고, 그 칸이 아군 공격 d20에 쓰이는지 본다.
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };

const { boot, spawn, run } = require('./_fight.js');

// 1) 몬스터를 세우면 전투가 시작되고 끝난다 (주사위 없이)
for (const seed of [1, 2, 3]) {
  const { G, r } = boot(seed); spawn(G, r, ['고블린 졸개', '고블린 졸개']);
  t(`씨앗 ${seed}: 세운 몬스터가 살아 있다`, r.mons.filter(m => m.hp > 0).length === 2);
  let started = false; for (let k = 0; k < 200 && !started; k++) { G.tick(0.1); started = !!r.turn; }
  t(`씨앗 ${seed}: 전투(차례)가 시작된다`, started, `mons=${r.mons.length}`);
  const res = run(G, r);
  t(`씨앗 ${seed}: 전투가 끝난다`, !res.timeout, JSON.stringify(res));
}
// 2) 운명판: 층에 들어설 때 줄(사람마다 네 칸)을 굴려 두고, 라운드의 첫 공격 d20에 자기 줄의 다음 칸을 쓴다
for (const seed of [4, 5]) {
  const { G, r } = boot(seed); spawn(G, r, ['고블린 졸개', '홉고블린 전사', '홉고블린 전사']);
  const res = run(G, r, { dice: ['steady'] }), D = G.Dice;
  t(`씨앗 ${seed}: 운명판 전투가 끝난다`, !res.timeout, JSON.stringify(res));
  t(`씨앗 ${seed}: 줄은 늘 네 칸, 다음 칸은 0~4`, D.rows().length === r.party.length && D.rows().every(p => D.line(p).cells.length === 4 && D.line(p).at >= 0 && D.line(p).at <= 4));
  t(`씨앗 ${seed}: 판의 값이 공격 굴림에 쓰였다`, res.used >= 1 && D.board.uses.length >= res.used, JSON.stringify(res));
  t(`씨앗 ${seed}: 전투가 끝나도 판은 남는다 (층 내내)`, D.board !== null && D.st === null);
}
// 2-1) 흐르는 턴제: 판정은 SRD 차례 그대로, 범위 칠하기 · 큰 주사위 창 · 차례 사이 쉼이 없어 라운드가 짧다
{
  const play = smooth => { let tot = 0, rounds = 0, ov = 0, ends = 0; for (const seed of [6, 7, 8, 9, 10, 11, 12, 13]) { // 시드 셋이면 AI가 고르는 행동에 따라 비율이 0.9 ~ 1.6으로 흔들렸다 — 여덟로 (2026-11-20)
    const { G, r } = boot(seed); G.quiet = false; G.Turn.smooth = smooth; const ov0 = G.Tactics.overlay; G.Tactics.overlay = function (...a) { ov++; return ov0.apply(this, a); };
    spawn(G, r, ['고블린 졸개', '고블린 졸개', '홉고블린 전사']); const res = run(G, r); if (!res.timeout) ends++; tot += res.t; rounds += Math.max(1, res.rounds); }
    return { per: tot / rounds, ov, ends }; };
  const sm = play(true), old = play(false);
  t('흐르는 턴제: 전투가 끝난다', sm.ends === 8, JSON.stringify(sm));
  t('흐르는 턴제: 범위를 칠하지 않는다', sm.ov === 0 && old.ov > 0, JSON.stringify({ sm: sm.ov, old: old.ov }));
  // 앞줄 근접도 첫 라운드부터 나선다 — 옛 '버티기'(달려오는 근접 적을 서서 기다림)는 흐르는 턴제에선 끈다
  { const { G, r } = boot(12); spawn(G, r, ['좀비']); const L = r.party[0], z = r.mons[0]; z.x = 12; z.y = 7; z.aggro = true;
    G.Turn.smooth = false; const holdOld = G.Tactics.waits(r, { round: 1 }, L); G.Turn.smooth = true; const holdNew = G.Tactics.waits(r, { round: 1 }, L);
    t('옛 방식: 앞줄 파이터는 1라운드에 서서 기다린다 (버티기)', holdOld === true, holdOld);
    t('흐르는 턴제: 기다리지 않고 바로 나선다', holdNew === false, holdNew);
    t('단장 칭호 없이 이름으로 부른다', L.merc.name && L.merc.name !== '단장', L.merc.name); }
  // 위쪽 한계 1.5배 (2026-11-20에 1.4에서 넓혔다 — 스킬 AI가 고르는 행동이 달라지면 비율이 같이 움직인다)
  t('흐르는 턴제: 읽을 수 있는 속도 — 행동 하나에 1초쯤 (옛 방식의 절반보다 길고 1.5배보다 짧다)', sm.per > old.per * 0.5 && sm.per < old.per * 1.5, JSON.stringify({ sm: sm.per.toFixed(2), old: old.per.toFixed(2) }));
}
// 3) 운명판 규칙
{
  const { G } = boot(9), D = G.Dice;
  const ps = [{ hp: 10, max: 10, merc: { cls: 'dragoon' } }, { hp: 5, max: 10, merc: { cls: 'mage' } }, { hp: 8, max: 10, merc: { cls: 'cleric' } }];
  D.party = () => ps; D.roster = () => ps; D.loadout = []; D.bearer = null; let B = D.newBoard(() => 0.5);
  t('판 = 파티원 줄 × 네 칸', D.rows().length === 3 && ps.every(p => D.line(p).cells.length === 4 && D.line(p).at === 0));
  t('줄마다 그 사람의 직업 주사위 (파이터 전사 · 소서러 비전 · 클레릭 신성)', D.line(ps[0]).cells.every(d => d.kind === 'c_war') && D.line(ps[1]).cells.every(d => d.kind === 'c_arc') && D.line(ps[2]).cells.every(d => d.kind === 'c_div'));
  t('직업은 SRD 직업으로: 정찰(드루이드) = 신성 · 궁수(레인저) = 재주꾼 · 워락 = 비전', D.dieFor({ merc: { cls: 'scout' } }) === 'c_div' && D.dieFor({ merc: { cls: 'archer' } }) === 'c_skl' && D.dieFor({ merc: { cls: 'warlock' } }) === 'c_arc');
  // 쓰기: 각자 자기 줄을 앞에서부터, 쓴 사람의 줄만 넘어간다
  const L0 = D.line(ps[0]); L0.cells[0] = D.face('c_war', 17); L0.cells[1] = D.face('c_war', 3); D.useRound(1);
  t('이번 라운드의 내 칸 = 줄에서 아직 안 쓴 맨 앞 칸', D.dieOf(ps[0]).value === 17);
  D.use(ps[0], 'atk');
  t('칸을 쓰면 그 사람의 줄만 넘어간다 · 한 라운드에 한 칸', L0.at === 1 && D.line(ps[1]).at === 0 && D.dieOf(ps[0]) === null && D.use(ps[0], 'atk') === null && L0.at === 1);
  D.useRound(2); t('다음 라운드에는 다음 칸 — 안 쓴 사람의 칸은 그대로', D.dieOf(ps[0]).value === 3 && D.line(ps[1]).at === 0);
  // 다 쓰면 그 줄만 새로 굴린다
  L0.at = 4; const keep1 = D.line(ps[1]); D.useRound(3, () => 0.5);
  t('줄을 다 쓰면 그 줄만 새로 굴린다', D.line(ps[0]) !== L0 && D.line(ps[0]).at === 0 && D.line(ps[0]).cells.every(d => d.value === 11) && D.line(ps[1]) === keep1 && B.turned.length === 1 && B.turned[0].kept === false, JSON.stringify(B.turned.map(x => x.kept)));
  // 붙잡기: 유지비를 내고 한 바퀴 더 (이어서 붙잡을수록 오른다), 금화가 모자라면 새로 굴린다
  let gold = 7; D.purse = { gold: () => gold, pay: n => { gold -= n; } };
  const L1 = D.line(ps[0]); L1.at = 4; D.setHold(ps[0], true); D.useRound(4);
  t('붙잡은 줄: 유지비 5를 내고 처음부터 한 번 더 (다음 유지비는 10)', D.line(ps[0]) === L1 && L1.at === 0 && gold === 2 && L1.hold === false && L1.holds === 1 && D.holdCost(L1) === 10 && B.turned[0].kept === true, [gold, L1.at]);
  L1.at = 4; D.setHold(ps[0], true); D.useRound(5);
  t('유지비가 모자라면 새로 굴린다', D.line(ps[0]) !== L1 && gold === 2 && D.holdCost(D.line(ps[0])) === 5);
  // 탐험 판정: 전투 밖에서도 그 사람의 다음 칸
  D.end(); const L2 = D.line(ps[1]); L2.cells[0] = D.face('c_arc', 13);
  t('탐험 판정: 그 사람의 다음 칸 눈을 쓰고 그 줄만 넘어간다', D.take(ps[1]) === 13 && L2.at === 1 && D.line(ps[2]).at === 0);
  L2.at = 4; t('탐험: 다 쓴 줄은 다음 판정 앞에 새로 굴린다', D.take(ps[1], () => 0.5) === 11 && D.line(ps[1]) !== L2 && D.line(ps[1]).at === 1);
  // 한 칸 다시 굴리기
  gold = 100; B = D.newBoard(() => 0.5);
  t('다시 굴리기 값: 층마다 첫 번은 공짜, 그 뒤 5 · 10 · 15', [1, 2, 3, 4].map(D.rerollCost).join() === '0,5,10,15');
  const r1 = D.rerollCell(ps[0], 0, () => 0.99), c0 = D.line(ps[0]).cells;
  t('한 칸 다시 굴리기: 그 칸만 바뀐다 (20 = ★), 첫 번은 공짜', r1 && r1.cost === 0 && c0[0].value === 20 && c0[0].sym === 'wild' && c0[1].value === 11 && gold === 100);
  D.rerollCell(ps[0], 1); t('둘째부터 금화를 낸다', gold === 95 && D.nextCost() === 10, [gold, D.nextCost()]);
  gold = 3; t('금화가 모자라면 못 굴린다', D.rerollCell(ps[0], 2) === null && B.rerolls === 2);
  gold = 100; D.line(ps[0]).at = 2; t('이미 쓴 칸은 못 굴린다', D.rerollCell(ps[0], 1) === null && D.canReroll(ps[0], 2) === true);
  D.rules.add('reroll2'); t('규칙 카드 「두 번 굴리기」: 두 번까지 공짜', D.rerollCost(2) === 0 && D.rerollCost(3) === 5); D.rules.delete('reroll2');
  // 빙고: 가로 = 한 사람의 네 칸, 세로 = 같은 자리 칸이 살아 있는 전원. ★는 아무 기호, 빈 면 · 특수 주사위가 끼면 없다
  const W = v => D.face('c_war', v);
  t('한 줄: 검 넷 · 검 셋 + ★ · 섞이면 없음 · 빈 면이 끼면 없음 · ★만은 없음', D.rowCombo([W(2), W(4), W(6), W(8)]) === 'atk' && D.rowCombo([W(2), W(20), W(4), W(6)]) === 'atk' && D.rowCombo([W(2), W(3), W(4), W(6)]) === null && D.rowCombo([W(2), W(1), W(4), W(6)]) === null && D.rowCombo([W(20), W(20), W(20), W(20)]) === null);
  t('한 줄: 특수 주사위가 끼면 없다', D.rowCombo([W(2), W(4), W(6), D.roll('steady', () => 0)]) === null);
  B = D.newBoard(() => 0.5); t('빈 면뿐인 판에는 줄이 없다', D.bingo().length === 0);
  D.line(ps[0]).cells = [W(2), W(4), W(6), W(8)]; D.line(ps[1]).cells[3] = D.face('c_arc', 20); D.line(ps[2]).cells[3] = D.face('c_div', 20); D.line(ps[1]).cells[2] = D.face('c_arc', 20); D.line(ps[2]).cells[2] = D.face('c_div', 1);
  const bg = D.bingo();
  t('빙고: 가로줄(그 사람) + 세로줄(전원 같은 기호 — ★ 포함, 사람 수)', bg.length === 2 && bg.some(x => x.t === 'r' && x.p === ps[0] && x.s === 'atk') && bg.some(x => x.t === 'c' && x.c === 3 && x.s === 'atk' && x.n === 3), JSON.stringify(bg.map(x => [x.t, x.c, x.s, x.n])));
  D.party = () => ps.slice(0, 2); t('쓰러진 사람의 칸은 세로줄에서 빠진다 (빈 면이 빠지니 3열이 맞는다)', D.bingo().some(x => x.t === 'c' && x.c === 2 && x.n === 2)); D.party = () => ps;
  t('세로줄은 넷까지 센다 · 규칙 카드 「맞물림」이면 둘도 셋처럼', D.colN({ n: 5 }) === 4 && D.colN({ n: 2 }) === 2 && D.SYM.atk.txt(4) === '아군 피해 +5' && (D.rules.add('pairUp'), D.colN({ n: 2 }) === 3)); D.rules.delete('pairUp');
  { const hf = { hp: 5, max: 5, merc: { uid: 77, cls: 'rogue', sp: 'halfling' } }, hu = { hp: 5, max: 5, merc: { uid: 78, cls: 'rogue', sp: 'human' } }, seq = a => () => a.shift();
    const lr = D.roll('c_skl', seq([0, 0.5]), hf), nr = D.roll('c_skl', seq([0, 0.5]), hu);
    t('하플링 행운: 1이 나온 칸은 다시 굴린다 (다른 종족은 그대로 1)', lr.value === 11 && lr.lucky === true && nr.value === 1 && !nr.lucky, [lr.value, nr.value]);
    t('이름표: 하플링 = 행운 · 영감이 있으면 ✦', D.tags(hf).includes('행운') && !D.tags(hu).includes('행운') && (D.giveInsp(hu), D.tags(hu).includes('✦ 영감')) && D.giveInsp(hu) === false);
    D.rested([hf.merc, hu.merc]); hu.merc.insp = false; D.rested([hf.merc, hu.merc]); t('긴 휴식: 인간만 영감', hu.merc.insp === true && !hf.merc.insp);
    t('칸 표시: 20 = 치명 · 1 = 빗나감', D.mark(hu, W(20)) === 'crit' && D.mark(hu, W(1)) === 'miss' && D.mark(hu, W(10)) === null); }
  // 특수 주사위: 줄을 굴릴 때 칸 하나씩, 죽음의 주사위는 맡은 사람 줄
  D.loadout = ['gamble', 'doom']; D.bearer = null; D.newBoard(() => 0.1);
  const where = k => ps.find(p => D.line(p).cells.some(d => d.kind === k)) || null;
  t('특수 주사위는 칸 하나씩 들어간다', where('gamble') && where('doom') && D.line(where('doom')).cells.filter(d => d.kind === 'doom').length === 1);
  t('죽음의 주사위는 맡은 사람(체력 비율이 가장 높은 사람) 줄', where('doom') === ps[0]);
  D.setBearer(ps[1], () => 0.1); t('맡을 사람을 바꾸면 죽음의 주사위가 그 줄로 옮겨 간다', where('doom') === ps[1] && !D.line(ps[0]).cells.some(d => d.kind === 'doom'));
  D.loadout = [];
  const n = 20000; let one = 0, death = 0; for (let i = 0; i < n; i++) { if (D.roll('gamble').value === 1) one++; if (D.roll('doom').special === 'death') death++; }
  t('모 아니면 도: 1이 2/3쯤', one / n > 0.62 && one / n < 0.71, one / n);
  t('죽음의 주사위: 즉사가 1/5쯤', death / n > 0.17 && death / n < 0.23, death / n);
}
// 4) 직업 주사위 · 빙고 효과 (5-9-1) — 직업 주사위는 SRD d20에 기호를 새긴 것
{
  const { G } = boot(10), D = G.Dice;
  for (const k of ['c_war', 'c_skl', 'c_arc', 'c_div']) {
    const cnt = new Array(21).fill(0), n = 40000; for (let i = 0; i < n; i++) cnt[D.roll(k).value]++;
    t(`${k}: 1~20이 고르게 (각 5%쯤)`, cnt.slice(1).every(c => c / n > 0.042 && c / n < 0.058) && cnt[0] === 0, cnt.slice(1).map(c => (c / n * 100).toFixed(1)).join(' '));
    t(`${k}: 20면 ★ · 1면 빈 면`, D.face(k, 20).sym === 'wild' && D.face(k, 1).sym === null);
  }
  t('면에는 값과 기호가 있다 (전사 2면 = 검2)', D.roll('c_war', () => 0.05).value === 2 && D.roll('c_war', () => 0.05).sym === 'atk');
  // 효과: 줄이 판에 있는 동안 라운드마다 켜진다 (라운드가 넘어갈 때 지웠다가 다시), 전투가 끝나면 지워진다
  const { G: G2 } = boot(11), D2 = G2.Dice, r2 = G2.Fantasy.rt(G2.S.w.fantasy), team = r2.party.filter(p => p.hp > 0), ac = p => G2.Dnd.ac(p);
  D2.party = () => team; D2.roster = () => team; D2.loadout = []; const set = (p, c, d) => { D2.line(p).cells[c] = d; };
  const ac0 = ac(team[0]), ac1 = ac(team[1]); D2.newBoard(() => 0); team.forEach(p => set(p, 0, D2.face('c_war', 3))); // 첫 칸이 모두 방 — 세로줄
  D2.useRound(1); D2.fire();
  t('세로 방진: 아군 AC가 오른다 (사람 수로 세진다)', ac(team[0]) === ac0 + (team.length >= 3 ? 3 : 2), [ac0, ac(team[0])]);
  G2.S.runTime += 100;
  t('방진은 시계가 흘러도 그 라운드 동안 남는다', ac(team[0]) > ac0);
  D2.useRound(2); const mid = ac(team[0]); D2.fire();
  t('줄이 판에 있는 동안 라운드마다 다시 켜진다', mid === ac0 && ac(team[0]) > ac0, [ac0, mid, ac(team[0])]);
  set(team[1], 0, D2.face('c_war', 2)); D2.useRound(3); D2.fire();
  t('줄이 깨지면 효과도 사라진다', ac(team[0]) === ac0);
  set(team[1], 0, D2.face('c_war', 3)); D2.useRound(4); D2.fire(); D2.end();
  t('전투가 끝나면 효과가 지워지고 판은 남는다', ac(team[0]) === ac0 && D2.st === null && D2.board !== null);
  { team.forEach(p => { p.merc.insp = false; }); D2.newBoard(() => 0); [3, 7, 20, 3].forEach((v, c) => set(team[0], c, D2.face('c_war', v))); // 방 · 방 · ★ · 방 — 첫 사람의 가로줄
    D2.useRound(1); D2.fire();
    t('가로줄이 새로 맞으면 그 사람이 영웅적 영감을 얻는다 (한 사람에 하나)', team[0].merc.insp === true && !team[1].merc.insp && D2.giveInsp(team[0]) === false);
    t('가로줄 방진: 그 사람만 AC +3', ac(team[0]) === ac0 + 3 && ac(team[1]) === ac1, [ac(team[0]) - ac0, ac(team[1]) - ac1]);
    D2.line(team[0]).at = 1;
    t('영감 다시 굴리기: 자기 줄의 안 쓴 칸만', D2.canInsp(team[0], 0) === false && D2.canInsp(team[0], 1) === true && D2.canInsp(team[1], 1) === false);
    t('영감을 쓰면 그 칸이 다시 굴러가고 영감은 사라진다', D2.inspReroll(team[0], 2, () => 0.05) === true && D2.line(team[0]).cells[2].value === 2 && team[0].merc.insp === false && D2.inspReroll(team[0], 1) === false);
    D2.useRound(2); D2.fire(); t('줄이 깨지면 가로줄 효과도 사라진다 (방 · 방 · 검 · 방)', ac(team[0]) === ac0, [ac(team[0]) - ac0]);
    D2.end(); }
  D2.newBoard(() => 0); team.forEach(p => { set(p, 1, D2.face('c_div', 2)); p.hp = p.max; }); team[1].hp = team[1].max - 1; const hp0 = team.map(p => p.hp); // 둘째 칸이 모두 빛 — 세로 기도
  D2.useRound(1); D2.fire();
  t('기도: 체력 최대를 넘지 않고, 가득 찬 사람은 그대로', team.every(p => p.hp <= p.max) && team[1].hp === team[1].max && team.every((p, i) => i === 1 || p.hp === hp0[i]), team.map(p => p.hp + '/' + p.max).join());
  // 판의 20 = 자연 20 → 치명타 (SRD), 그 라운드의 둘째 공격부터는 보통 d20
  D2.end(); spawn(G2, r2, ['고블린 졸개']); const mon = r2.mons.find(m => m.hp > 0);
  D2.newBoard(() => 0); set(team[0], 0, D2.face('c_war', 20)); D2.useRound(1);
  G2.Dnd.adv = () => 0; const hit = G2.Dnd.attack(team[0], mon); G2.Dnd.attack(team[0], mon);
  t('판의 20은 자연 20 — 치명타 · 그 칸을 썼다 (한 라운드에 한 칸)', hit.crit === true && hit.nat === 20 && D2.line(team[0]).at === 1, JSON.stringify({ crit: hit.crit, nat: hit.nat, at: D2.line(team[0]).at }));
  // 문 열기: 운명판의 다음 칸이 보이면 기술 + 그 눈이 가장 높은 사람이 나선다
  { const a = { n: 'a' }, b = { n: 'b' }, P = { opened: null, locked: true, items: { tools: 0 }, tries: [] }, sk = { skill: w => (w === a ? 5 : 2) };
    t('문 열기: 눈을 모르면 기술이 좋은 사람', G2.Prep.next(P, [a, b], sk).who === a);
    t('문 열기: 다음 칸이 보이면 기술 + 눈이 높은 사람', G2.Prep.next(P, [a, b], { ...sk, peek: w => (w === a ? 2 : 16) }).who === b); }
}
console.log(`crawl_fight_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
