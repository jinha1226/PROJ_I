'use strict';
// 바닥에 놓는 것 — 기름 · 마름쇠 (설계 5-11, SRD 그대로): node test/ground_rules.js
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const { boot, spawn } = require('./_fight.js');

// 1) 규칙만 (엔진 없이: io를 흉내 낸다)
{
  const { G } = boot(1), GR = G.Ground, rt = {}, hurt = [];
  let round = 1, turn = 1, saveOk = false;
  const io = { round: () => round, turnNo: () => turn, save: () => saveOk, hurt: (e, n, type) => { hurt.push([e.n, n, type]); e.hp -= n; } };
  const oil = GR.place(rt, 'oil', 5, 5), cal = GR.place(rt, 'caltrops', 9, 5, 'party');
  t('놓은 것은 rt.terrain에 (JSON으로 저장할 수 있는 모양)', rt.terrain.length === 2 && JSON.parse(JSON.stringify(rt.terrain)).length === 2);
  t('선분이 원에 들어서는 첫 지점', Math.abs(GR.cross(oil, 0, 5, 10, 5) - (5 - 0.8) / 10) < 1e-6 && GR.cross(oil, 0, 0, 10, 0) === null && GR.cross(oil, 5, 5, 9, 5) === null);
  const gob = { n: '고블린', kind: 'mon', x: 5, y: 5, hp: 10 };
  t('마른 기름은 그냥 지나가면 아무 일 없다', GR.moved(rt, Object.assign(gob, { x: 7, y: 5 }), 3, 5, io).length === 0 && hurt.length === 0);
  gob.x = 5; gob.y = 5; const ev = GR.fireAt(rt, gob, io);
  t('불이 닿으면 그 자리 기름이 타오른다 (불붙은 라운드 + 2까지)', ev[0]?.k === 'ignite' && oil.lit && oil.until === 3);
  const orc = { n: '오크', kind: 'mon', x: 7, y: 5, hp: 20 }; GR.moved(rt, orc, 3, 5, io);
  t('타는 기름에 들어서면 화염 5', hurt.some(h => h[0] === '오크' && h[1] === 5 && h[2] === 'fire'), JSON.stringify(hurt));
  GR.turnEnd(rt, Object.assign(orc, { x: 5, y: 5 }), io);
  t('같은 차례에는 한 번만', hurt.filter(h => h[0] === '오크').length === 1);
  turn++; GR.turnEnd(rt, orc, io);
  t('차례를 타는 기름 안에서 끝내면 화염 5', hurt.filter(h => h[0] === '오크').length === 2);
  const me = { n: '파이터', kind: 'hero', x: 7, y: 5, hp: 20 }; turn++; GR.moved(rt, me, 3, 5, io);
  t('타는 기름은 아군도 다친다', hurt.some(h => h[0] === '파이터'));
  // 마름쇠: 놓은 쪽의 적만, 처음 들어설 때 DC 15 — 실패하면 들어선 자리에서 멈추고 관통 1
  const wolf = { n: '늑대', kind: 'mon', x: 12, y: 5, hp: 10 }; turn++; saveOk = false; GR.moved(rt, wolf, 6.5, 5, io);
  t('마름쇠 실패: 들어선 자리에서 멈춘다', Math.abs(wolf.x - (9 - 0.8)) < 1e-6 && wolf.y === 5, wolf.x);
  t('마름쇠 실패: 관통 1', hurt.some(h => h[0] === '늑대' && h[1] === 1 && h[2] === 'piercing'));
  const wolf2 = { n: '늑대2', kind: 'mon', x: 12, y: 5, hp: 10 }; turn++; saveOk = true; GR.moved(rt, wolf2, 6.5, 5, io);
  t('마름쇠 성공: 그대로 지나간다', wolf2.x === 12 && !hurt.some(h => h[0] === '늑대2'));
  const ally = { n: '로그', kind: 'hero', x: 12, y: 5, hp: 10 }; saveOk = false; GR.moved(rt, ally, 6.5, 5, io);
  t('마름쇠는 놓은 쪽(아군)은 걸리지 않는다', ally.x === 12);
  round = 3; GR.tick(rt, round); t('불붙은 라운드 + 2까지는 탄다', rt.terrain.some(p => p.kind === 'oil'));
  round = 4; GR.tick(rt, round); t('그 뒤에는 다 타서 사라진다 (마름쇠는 남는다)', !rt.terrain.some(p => p.kind === 'oil') && rt.terrain.some(p => p.kind === 'caltrops'));
}
// 2) 옛 엔진에 걸기 (bridge.js): 화염 피해 → 점화, 걸음 · 차례 끝 → 타는 기름, 사건은 G.Feed로
{
  const { G, r, f } = boot(2); spawn(G, r, ['고블린 졸개', '고블린 졸개']); const [a, b] = r.mons, mage = r.party.find(p => p.merc.cls === 'mage');
  G.Feed.clear(); G.Ground.place(r, 'oil', a.x, a.y);
  G.Foe.dtype = 'fire'; G.Fantasy.hurt(f, r, a, 1, 'hit', mage); G.Foe.dtype = null;
  t('엔진: 화염 피해를 입은 자리의 기름이 타오른다', r.terrain[0].lit, JSON.stringify(r.terrain[0]));
  t('엔진: 사건 줄에 점화', G.Feed.take().some(e => e.k === 'ignite'));
  const hp0 = b.hp, x0 = b.x, y0 = b.y; b.x = a.x + 0.3; b.y = a.y; G.Fantasy.fieldMove(f, r, b, x0, y0);
  t('엔진: 타는 기름에 걸어 들어오면 다친다', b.hp < hp0 || b.hp <= 0, [hp0, b.hp]);
  t('엔진: 사건 줄에 화상', G.Feed.take().some(e => e.k === 'burn'));
}
// 3) 유틸리티 AI: 마른 기름 위에 적이 서 있으면 화염 기술 점수가 오른다
{
  const { G, r, f } = boot(3); spawn(G, r, ['고블린 졸개', '고블린 졸개']); const mage = r.party.find(p => p.merc.cls === 'mage');
  const x = { f, rt: r, seen: r.mons.filter(m => m.hp > 0) }, fire = 'sr_firebolt', other = 'sp_sorcerous_burst';
  const f0 = G.SkillAI.score(fire, mage, x, 1), o0 = G.SkillAI.score(other, mage, x, 1);
  for (const m of r.mons) G.Ground.place(r, 'oil', m.x, m.y);
  const f1 = G.SkillAI.score(fire, mage, x, 1), o1 = G.SkillAI.score(other, mage, x, 1);
  t('AI: 기름 위 적에게는 화염살 점수가 오른다', f1 > f0 + 1, [f0, f1]);
  t('AI: 화염이 아닌 기술은 그대로', Math.abs(o1 - o0) < 1e-9, [o0, o1]);
}
console.log(`ground_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
