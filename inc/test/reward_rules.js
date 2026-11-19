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
// 2) 레벨업: SRD 직업 표대로 — 그 레벨의 기능은 저절로, 고르게 돼 있는 것만 고른다 (추천 셋 또는 전부)
{
  const { G, r, f } = boot(2); spawn(G, r, ['홉고블린 전사']); G.Reward.on = true; const R = G.Reward;
  const fighter = r.party.find(p => p.merc.cls === 'dragoon').merc, mage = r.party.find(p => p.merc.cls === 'mage').merc;
  for (const m of [fighter, mage]) { m.lv = 1; m.skills = G.Guild.roll(m.cls, 1).slice(0, 3); m.xp = G.Guild.needOf(m) - 1; } // 시전자는 5칸 중 셋만 찬 채로
  const k0 = mage.skills.length; G.Guild.onKill(f, r, r.mons[0]);
  t('레벨업: 둘 다 2레벨', fighter.lv === 2 && mage.lv === 2, [fighter.lv, mage.lv]);
  const fn = R.offer(fighter);
  t('무예 2레벨: 새로 얻은 것(행동 쇄도)을 보여 주고, 고를 것은 없다', fn.kind === 'new' && fn.list.some(x => x.n === '행동 쇄도') && R.pending(fighter) === 1, JSON.stringify(fn.list));
  R.choose(fighter, { kind: 'new' }); t('확인하면 남은 것 0 · 능력치는 그대로 (매 레벨 +1은 없다)', R.pending(fighter) === 0 && fighter.abPend === undefined);
  t('시전자: 기술을 저절로 더하지 않는다', mage.skills.length === k0 && R.pending(mage) > 0, [k0, mage.skills.length, R.pending(mage)]);
  const kinds = []; let o = null;
  for (let i = 0; i < 9 && R.pending(mage); i++) { o = R.offer(mage, seq([0.1, 0.5, 0.9, 0.3])); kinds.push(o.kind); if (o.kind === 'spell') break; R.choose(mage, o.kind === 'new' ? { kind: 'new' } : o.options[0]); }
  t('소서러 2레벨: 새로 얻은 것 → 초마법 둘 → 주문', kinds.join() === 'new,mm,mm,spell', kinds.join());
  t('고른 초마법이 켜진다', G.Opt.of(mage).filter(k => k.startsWith('mm_')).length === 2, G.Opt.of(mage).join());
  t('주문 후보: 셋, 모두 아직 모르고 그 레벨에 배울 수 있는 것', o.kind === 'spell' && o.options.length === 3 && o.options.every(q => !mage.skills.includes(q.id) && G.Guild.skLv(mage.cls, q.id) <= mage.lv), JSON.stringify(o.options.map(q => q.id)));
  t('전부 보기: 셋보다 많고 추천 셋을 품는다', R.offer(mage, Math.random, true).options.length > 3 && o.options.every(q => R.offer(mage, Math.random, true).options.some(x => x.id === q.id)));
  const p0 = R.pending(mage); R.choose(mage, o.options[0]);
  t('주문을 고르면 배우고 남은 고르기가 준다', mage.skills.includes(o.options[0].id) && R.pending(mage) === p0 - 1);
  // 3레벨: 하위 직업 · 4레벨: 능력치 향상
  fighter.lv = 3; G.Guild.grow(fighter); t('3레벨: 하위 직업이 붙는다 (하나뿐이라 고르지 않는다)', fighter.adv === 'champion' && R.offer(fighter).list.some(x => /챔피언/.test(x.n)));
  R.choose(fighter, { kind: 'new' }); fighter.lv = 4; G.Guild.grow(fighter); R.choose(fighter, { kind: 'new' });
  const a = R.offer(fighter), s0 = G.Dnd.ab(fighter).str;
  t('4레벨: 능력치 향상 — 추천 셋 (+2 · +1/+1 · +2)', a.kind === 'asi' && a.options.length === 3 && a.options[0].add.str === 2 && Object.keys(a.options[1].add).length === 2, JSON.stringify(a.options.map(x => x.n)));
  R.choose(fighter, a.options[0]); t('고르면 +2 · 엔진이 저절로 더하지 않는다', G.Dnd.ab(fighter).str === Math.min(20, s0 + 2) && R.pending(fighter) === 0, [s0, G.Dnd.ab(fighter).str]);
  { const all = R.offer({ ...fighter, lvq: [{ k: 'asi' }] }, Math.random, true).options; t('전부 보기에는 다른 재주(붙잡기)도 있다 — SRD: 능력치 향상 또는 다른 재주', all.some(x => x.feat === 'grappler') && all.length > 3, all.map(x => x.n).join()); }
  t('가진 직업 기능 전부 (재기 · 행동 쇄도 · 하위 직업 …)', ['재기', '행동 쇄도'].every(n => R.features(fighter).some(x => x.n === n)) && R.features(fighter).every(x => x.lv <= 4), R.features(fighter).map(x => x.n).join());
}
// 2-1) 손에 든 기술 5칸: 다 찼으면 레벨업 때 새 주문 셋 중 하나로 바꾸거나 그대로
{
  const { G, r, f } = boot(12); spawn(G, r, ['홉고블린 전사']); G.Reward.on = true;
  const mage = r.party.find(p => p.merc.cls === 'mage').merc; mage.lv = 3; mage.skills = G.Guild.roll('mage', 3); G.Party.trim(mage);
  t('새 게임: 손에 든 기술은 5개로 맞춘다', mage.skills.length === 5, mage.skills.length);
  t('5칸이 다 차면 더 열리지 않는다', G.Reward.slotsOpen(mage).cantrip + G.Reward.slotsOpen(mage).prepared === 0);
  mage.xp = G.Guild.needOf(mage) - 1; G.Guild.onKill(f, r, r.mons[0]);
  t('5칸이 다 찬 채 4레벨: 새로 얻은 것 · 능력치 향상 · 바꾸기 기회 하나', mage.lv === 4 && mage.swapPend === 1 && G.Reward.pending(mage) === 3 && mage.lvq.map(q => q.k).join() === 'new,asi', [mage.lv, mage.swapPend, JSON.stringify(mage.lvq)]);
  G.Reward.choose(mage, { kind: 'new' }); G.Reward.choose(mage, G.Reward.offer(mage).options[0]);
  const o = G.Reward.offer(mage, seq([0.4, 0.2, 0.8]));
  t('바꾸기 후보: 아직 모르는 주문 셋', o.kind === 'swap' && o.options.length === 3 && o.options.every(q => !mage.skills.includes(q.id)), JSON.stringify(o.options.map(q => q.id)));
  const drop = mage.skills[4]; G.Reward.choose(mage, o.options[0], drop);
  t('바꾸면 내려놓은 자리에 새 주문 · 여전히 5개 · 기회 끝', mage.skills.length === 5 && mage.skills.includes(o.options[0].id) && !mage.skills.includes(drop) && G.Reward.pending(mage) === 0);
  mage.swapPend = 1; const keep = mage.skills.slice(); G.Reward.choose(mage, 'keep');
  t('그대로 두기: 기술은 그대로 · 기회 끝', mage.skills.join() === keep.join() && G.Reward.pending(mage) === 0);
  const nm = G.Guild.make(f, 'archmage', { lv: 5 }); t('새 게임에서 만든 사람은 5개만 든다', nm.skills.length <= 5, nm.skills.length);
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
  t('상인: 도둑 도구를 더한다 (옛 물건은 그대로 · 기름 · 마름쇠는 없다)', shop.tools && !shop.oil && !shop.caltrops && shop.potion.cost === 25);
}
// 5) 정예 · 보스 3택1: 마법 물건 · 규칙 카드 · 면 새기기
{
  const { G, r, f } = boot(5), R = G.Reward; G.Dice.rules.clear(); f.trinkets = [];
  const opts = R.bigOffer(f, r.party, 'elite', seq([0.3, 0.6, 0.2, 0.8, 0.1]));
  t('3택1: 마법 물건 · 규칙 카드 · 면 새기기 (동료 합류는 없다 — 파티는 선술집에서)', opts.length === 3 && ['art', 'rule', 'carve'].every(k => opts.some(o => o.kind === k)), JSON.stringify(opts.map(o => o.kind)));
  const art = opts.find(o => o.kind === 'art'); R.takeBig(f, art);
  t('마법 물건: 가방(f.trinkets)에 들어간다 — 저절로 끼워지지 않는다 (누구에게 줄지는 화면이 묻는다)', f.trinkets.some(q => q.k === art.id) && f.trinkets.every(q => q.on == null), JSON.stringify(f.trinkets));
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
  t('소문으로 열리는 물건 · 주사위는 없다 (선술집의 의자만 는다)', R.unlocked(999).length === 0);
}
console.log(`reward_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
