'use strict';
// 보상 · 성장 · 명성 (설계 5-12): node test/reward_rules.js
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const { boot, spawn } = require('./_fight.js');
const seq = a => { let i = 0; return () => a[i++ % a.length]; };

// 1) 경험치: 새 게임은 SRD 경험치 3배 (한 층 판), 옛 방식은 그대로
{
  const { G, r, f } = boot(1); spawn(G, r, ['홉고블린 전사']); const mo = r.mons[0], m = r.party[0].merc;
  m.lv = 1; m.xp = 0; G.Reward.on = false; G.Guild.onKill(f, r, mo); const off = m.xp;
  m.xp = 0; G.Reward.on = true; G.Guild.onKill(f, r, mo); const on = m.xp;
  t('경험치 3배 (새 게임)', off > 0 && Math.abs(on - off * 3) < 1e-6, [off, on]);
}
// 2) 레벨업: 새 게임은 기술 칸을 저절로 채우지 않고 고르게 한다 — 시전자는 열린 주문 칸, 무예는 능력치 +1
{
  const { G, r, f } = boot(2); spawn(G, r, ['홉고블린 전사']); G.Reward.on = true;
  const fighter = r.party.find(p => p.merc.cls === 'dragoon').merc, mage = r.party.find(p => p.merc.cls === 'mage').merc;
  for (const m of [fighter, mage]) { m.lv = 1; m.skills = G.Guild.roll(m.cls, 1); m.xp = G.Guild.needOf(m) - 1; }
  const k0 = mage.skills.length; G.Guild.onKill(f, r, r.mons[0]);
  t('레벨업: 둘 다 2레벨', fighter.lv === 2 && mage.lv === 2, [fighter.lv, mage.lv]);
  t('시전자: 기술을 저절로 더하지 않는다 · 열린 칸만큼 고를 것이 남는다', mage.skills.length === k0 && G.Reward.pending(mage) > 0, [k0, mage.skills.length, G.Reward.pending(mage)]);
  t('무예: 능력치 고르기 하나가 남는다', G.Reward.pending(fighter) === 1);
  const o = G.Reward.offer(mage, seq([0.1, 0.5, 0.9, 0.3]));
  t('시전자 후보: 주문 셋, 모두 아직 모르고 그 레벨에 배울 수 있는 것', o.kind === 'spell' && o.options.length === 3 && o.options.every(q => !mage.skills.includes(q.id) && G.Guild.skLv(mage.cls, q.id) <= mage.lv), JSON.stringify(o.options.map(q => q.id)));
  const p0 = G.Reward.pending(mage); G.Reward.choose(mage, o.options[0]);
  t('주문을 고르면 배우고 남은 고르기가 준다', mage.skills.includes(o.options[0].id) && G.Reward.pending(mage) === p0 - 1);
  const fo = G.Reward.offer(fighter, seq([0.2])), str0 = fighter.ab.str;
  t('무예 후보: 능력치 +1 셋 (근력 · 건강 · 민첩)', fo.kind === 'ability' && fo.options.map(q => q.id).join() === 'str,con,dex');
  G.Reward.choose(fighter, fo.options[0]);
  t('능력치를 고르면 +1 · 남은 고르기 0', fighter.ab.str === Math.min(20, str0 + 1) && G.Reward.pending(fighter) === 0, [str0, fighter.ab.str]);
}
// 3) 옛 방식(새 게임 아님)은 레벨이 오르면 엔진이 그대로 채운다
{
  const { G, r, f } = boot(3); spawn(G, r, ['홉고블린 전사']); G.Reward.on = false; const mage = r.party.find(p => p.merc.cls === 'mage').merc;
  mage.lv = 1; mage.skills = G.Guild.roll('mage', 1); mage.skManual = false; mage.xp = G.Guild.needOf(mage) - 1; G.Guild.onKill(f, r, r.mons[0]);
  t('옛 방식: 레벨업 때 주문 칸을 저절로 채운다', mage.lv === 2 && G.Reward.pending(mage) === 0, G.Reward.pending(mage));
}
// 4) 전리품 · 상인 물자
{
  const { G } = boot(4), R = G.Reward;
  t('전리품: 보통 전투(적 둘)는 하나까지', R.loot('fight', 2, seq([0.1, 0.05])).reduce((a, q) => a + q.n, 0) <= 1);
  const b = R.loot('boss', 4, seq([0.1, 0.05, 0.2, 0.5, 0.3, 0.9]));
  t('전리품: 보스는 셋까지 · 이름이 붙는다', b.reduce((a, q) => a + q.n, 0) >= 2 && b.every(q => q.name), JSON.stringify(b));
  t('전리품: 굴림이 70% 넘으면 없다', R.loot('fight', 1, seq([0.95])).length === 0);
  const shop = { potion: { n: '치유 물약', cost: 25 } }; R.stockShop(shop);
  t('상인: 기름 · 마름쇠 · 도둑 도구를 더한다 (옛 물건은 그대로)', shop.oil && shop.caltrops && shop.tools && shop.potion.cost === 25);
}
// 5) 정예 · 보스 3택1: 마법 물건 · 규칙 카드 · 면 새기기
{
  const { G, r, f } = boot(5), R = G.Reward; G.Dice.rules.clear(); f.trinkets = [];
  const opts = R.bigOffer(f, r.party, 'elite', seq([0.3, 0.6, 0.2, 0.8, 0.1]));
  t('3택1: 마법 물건 · 규칙 카드 · 면 새기기', ['art', 'rule', 'carve'].every(k => opts.some(o => o.kind === k)), JSON.stringify(opts.map(o => o.kind)));
  const art = opts.find(o => o.kind === 'art'); R.takeBig(f, art);
  t('마법 물건: 가방(f.trinkets)에 들어가 누군가 낀다', f.trinkets.some(q => q.k === art.id) && f.trinkets.some(q => q.on != null), JSON.stringify(f.trinkets));
  const rule = opts.find(o => o.kind === 'rule'); R.takeBig(f, rule);
  t('규칙 카드: 운명판 규칙에 들어간다', G.Dice.rules.has(rule.id));
  const cv = opts.find(o => o.kind === 'carve'), kind = G.Dice.dieFor(cv.who); R.takeBig(f, cv);
  t('면 새기기: 그 사람 주사위의 그 빈 면이 ★', G.Dice.face(kind, cv.v, cv.who).sym === 'wild' && G.Dice.face(kind, cv.v).sym === null, [cv.v]);
}
// 6) 규칙 카드가 운명판에 걸린다
{
  const { G, r } = boot(6), D = G.Dice; D.rules.clear(); D.party = () => r.party.filter(p => !p.dead); D.loadout = [];
  D.newBoard(() => 0.5); t('기본: 다시 굴리기는 한 번', D.rerollCells([[0, 0]]) && !D.rerollCells([[0, 1]]));
  D.rules.add('reroll2'); D.newBoard(() => 0.5); t('두 번 굴리기: 두 번까지', D.rerollCells([[0, 0]]) && D.rerollCells([[0, 1]]) && !D.rerollCells([[0, 2]]));
  t('별의 면 없이는 19면이 표 그대로', D.face('c_war', 19).sym !== 'wild'); D.rules.add('wild19'); t('별의 면: 19면도 ★', D.face('c_war', 19).sym === 'wild');
  const pair = [D.face('c_war', 2), D.face('c_war', 4), D.face('c_arc', 3)]; t('맞물림 없이는 둘 = 보통', D.combos(pair).find(c => c.s === 'atk').n === 2);
  D.rules.add('pairUp'); t('맞물림: 둘도 셋처럼', D.combos(pair).find(c => c.s === 'atk').n === 3);
  D.rules.clear();
}
// 7) 명성 · 풀 넓히기
{
  const { G } = boot(7), R = G.Reward;
  t('명성: 간 방 1 · 전투 2 · 정예 3 · 보스 10 · 층 끝 5', R.renown({ rooms: 6, fights: 3, elites: 1, boss: true, win: true }) === 6 + 6 + 3 + 10 + 5);
  t('명성이 쌓이면 풀이 넓어진다 (10 쌍둥이 · 15 기름 · 25 죽음의 주사위)', R.unlocked(9).length === 0 && R.unlocked(15).join() === 'twin,oil1' && R.unlocked(30).includes('doom'));
}
console.log(`reward_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
