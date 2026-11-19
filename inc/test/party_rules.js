'use strict';
// 파티 · 선술집 · 구역 규칙표 (ROGUELIKE_PLAN 0-0): node test/party_rules.js
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const LOAD = require('./_load.js'), { boot } = require('./_fight.js');
const solo = seed => { const B = boot(seed), { G, ctx } = B; LOAD.load(ctx, ['run/core', 'run/data', 'run/gen']); G.Reward.on = true; return { ...B, RUN: ctx.RUN }; };
const seq = a => { let i = 0; return () => a[i++ % a.length]; };

// 1) 손에 든 기술은 5개까지
{ const { G, f } = solo(1), m = G.Party.trim(G.Guild.make(f, 'archmage', { lv: 5 })); t('기술 5칸', m.skills.length <= 5 && m.skManual, m.skills.length); t('파티는 넷까지', G.Party.MAX === 4); }
// 2) 선술집: 자리 · 의자 · 오늘 밤의 손님 · 구역 발견 · 판 끝
{
  const { G, f } = solo(2), T = G.Tavern, m = T.fresh();
  t('처음: 자리 둘 · 기본 직업 셋 · 다음 자리는 2층 우두머리', T.seats(m) === 2 && T.classes(m).join() === 'dragoon,rogue,cleric' && T.nextSeat(m) === 2);
  t('의자: 소문 0이면 넷, 30 · 80 · 150에서 하나씩', T.stools(0) === 4 && T.stools(30) === 5 && T.stools(100) === 6 && T.stools(999) === 7);
  const n = T.night(f, m, 0, seq([0.1, 0.7, 0.3]));
  t('오늘 밤: 의자 수만큼, 오는 직업만, 1레벨, 기술 5칸', n.length === 4 && n.every(g => T.classes(m).includes(g.cls) && g.lv === 1 && (g.skills || []).length <= 5), n.map(g => g.cls).join());
  t('오는 직업이 다 앉아 있다', new Set(n.map(g => g.cls)).size === 3);
  t('다시 열어도 같은 사람들', T.night(f, m, 0) === n);
  t('손님마다 생김새의 씨앗이 있다 (던전에서도 같은 모습)', n.every(g => g.lid) && new Set(n.map(g => g.lid)).size === n.length);
  { const all = G.Party.CLASSES.map(c => T.sheet(G.Party.trim(G.Guild.make(f, c, { lv: 1 })))), s = T.sheet(n.find(g => g.cls === 'cleric'));
    t('상태창: 체력 · AC · 능력치 여섯 · 기본 공격 · 방어구', all.every(a => a.hp > 0 && a.ac >= 10 && a.ab.length === 6 && /^명중 [+-]\d+ · \d+d\d+/.test(a.weapon.d) && a.armor && a.cls && a.sp && a.role), all.map(a => a.weapon.d).join(' | '));
    t('상태창: 기술마다 효과 한 줄', s.skills.length > 0 && s.skills.every(k => k.n && k.d && k.tag), JSON.stringify(s.skills)); }
  const r1 = T.finish(m, { bossFloor: 0, names: ['가', '나'], floor: 1, win: false });
  t('판 끝: 명패가 걸리고 손님은 바뀐다 (넘어가는 돈은 없다)', m.wall[0].names.join() === '가,나' && m.night === null && !r1.seat && T.seats(m) === 2 && m.coin === undefined);
  t('고블린 굴에 닿으면 레인저 · 바바리안이 온다', r1.cls.join() === 'archer,barbarian' && T.classes(m).length === 5);
  t('같은 구역에 다시 닿아도 새로 오는 직업은 없다', T.finish(m, { floor: 2 }).cls.length === 0);
  const r2 = T.finish(m, { bossFloor: 2, floor: 3, win: false });
  t('2층 우두머리를 잡으면 셋째 자리, 3층(폐성채)에 닿으면 위저드 · 바드', r2.seat && T.seats(m) === 3 && T.nextSeat(m) === 4 && r2.cls.join() === 'archmage,bard');
  T.finish(m, { bossFloor: 4, floor: 4 }); t('4층 우두머리를 잡으면 넷째 자리, 그 뒤로는 없다', T.seats(m) === 4 && T.nextSeat(m) === null);
  T.finish(m, { bossFloor: 2, floor: 1 }); t('얕게 끝난 판이 있어도 줄지 않는다', m.boss === 4 && m.deep === 4);
  T.finish(m, { floor: 9 }); t('용의 둥지까지 닿으면 열두 직업이 다 온다', T.classes(m).length === 12 && new Set(T.classes(m)).size === 12 && T.classes(m).every(c => G.Party.CLASSES.includes(c)));
  t('저장한 것을 읽는다 (깨진 값이면 새로)', T.load(JSON.stringify(m)).boss === 4 && T.load('{깨짐').deep === 0 && T.classes(T.load(null)).length === 3);
}
// 2-1) 구출: 드문 사건, 그 판에만 함께한다
{
  const { G, RUN } = solo(3), ev = RUN.EVENTS.find(e => e.id === 'captive');
  let hit = 0, dup = 0; for (let s = 1; s <= 300; s++) { const m = RUN.gen.make(s, 1), k = m.nodes.filter(n => n.ev === 'captive').length; hit += k > 0; dup += k > 1; }
  t('구출 사건은 드물다 (층 열에 하나꼴, 한 층에 하나까지)', ev.rare === 0.1 && hit > 10 && hit < 55 && dup === 0, hit);
  t('구하면 함께한다는 결과가 붙는다', ev.opts.filter(o => o.ok.ally).length === 3 && !ev.opts[3].ok.ally);
}
// 3) 구역 규칙표: 층마다 예산 안에서 무리를 채운다 (파티 수로 바꾸지 않는다)
{
  const { G, RUN } = solo(3), END = { 1: '버그베어', 2: '버그베어 추적자', 3: '가고일', 4: '에틴' };
  t('1 · 2층은 고블린 굴, 3 · 4층은 드워프 폐성채', RUN.zone(1).id === 'goblin' && RUN.zone(2) === RUN.zone(1) && RUN.zone(3).id === 'hold' && RUN.zone(4) === RUN.zone(3));
  t('규칙표의 몬스터는 탐사 수치 · 전투 엔진에 다 있다', RUN.ZONES.every(z => Object.keys(z.cost).every(k => RUN.MON[k] && G.D.F.mon[G.Encounter.monName(k)] && G.Encounter.monName(k).includes(k))), RUN.ZONES.flatMap(z => Object.keys(z.cost)).filter(k => !RUN.MON[k] || !G.Encounter.monName(k).includes(k)).join());
  for (const fl of [1, 2, 3, 4]) { const Z = RUN.zone(fl);
    let ok1 = true, mixed = 0, why = '';
    for (let seed = 1; seed <= 12; seed++) {
      const m = RUN.gen.make(seed, fl), bud = Z.budget[fl - Z.floors[0]];
      for (const n of m.nodes) { if (!n.g) continue; const cap = n.type === 'boss' ? 99 : n.type === 'elite' ? bud[3] + 2 : bud[2] * 1.2 + 1;
        if (n.g.units.length > 1) mixed++;
        if (n.g.d > cap || n.g.units.some(u => !(u[0] in Z.cost) || u[1] < 1)) { ok1 = false; why = `${fl}층 seed ${seed}: ${n.g.label} (${n.g.d} > ${cap})`; } }
      const boss = m.nodes.find(n => n.type === 'boss').g;
      if (boss.name !== END[fl]) { ok1 = false; why = `${fl}층 끝: ${boss.label}`; }
    }
    t(`${fl}층: 무리가 예산 안 · 규칙표의 몬스터만 · 끝은 ${fl % 2 ? '문지기' : '우두머리'}`, ok1, why); t(`${fl}층: 섞인 무리가 나온다`, mixed > 0);
  }
}
// 4) 구역 끝 야영지: 긴 휴식 한 번 · 상인 · 내려간다
{
  const B = boot(4); LOAD.load(B.ctx, ['run/core', 'run/data', 'run/gen', 'run/rules']); const RUN = B.ctx.RUN, st = RUN.newRun(7, ['fighter', 'wizard'], 2);
  st.party[0].hp = 3; st.party[1].sl[1] = 0; st.gold = 30; RUN.campsite(st, '고블린 굴');
  const at = n => st.scene.choices.findIndex(c => c.n === n);
  t('야영지: 긴 휴식 · 물건 · 내려간다', st.scene.kind === 'rest' && at('긴 휴식') === 0 && at('치유 물약 사기') > 0 && at('내려간다') === st.scene.choices.length - 1);
  RUN.choose(st, at('긴 휴식'));
  t('긴 휴식: 체력 · 슬롯이 돌아오고 야영지에 남는다', st.party[0].hp === st.party[0].max && st.party[1].sl[1] > 0 && st.scene?.kind === 'rest');
  t('긴 휴식은 한 번뿐', st.scene.choices[0].off() === true);
  RUN.choose(st, at('치유 물약 사기')); t('상인: 금화를 내고 산다', st.gold === 5 && st.items.potion >= 1 && st.scene?.kind === 'rest');
  RUN.choose(st, at('내려간다')); t('내려간다: 야영지가 닫힌다', !st.scene || st.scene.kind !== 'rest');
}
console.log(`party_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
