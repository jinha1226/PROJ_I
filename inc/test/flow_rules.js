'use strict';
// 진행 순서 규칙 검사: node test/sim.js 60 --seed=1 --check
// 어긴 것이 있으면 끝날 때 목록을 찍고 실패(종료 코드 1)한다.
const ALLOWED = {
  travel: ['deploy', 'fight', 'ambush', 'scene', 'checks', 'loot', 'stairs'],
  checks: ['loot'], scene: ['arrive', 'deploy', 'fight', 'loot'], arrive: ['deploy', 'fight'], ambush: ['deploy', 'fight'], deploy: ['fight'],
  fight: ['after'], after: ['loot'], wait: ['loot', 'deploy', 'fight'],
  loot: ['travel', 'wait', 'deploy', 'fight'], stairs: ['stairScene', 'travel', 'stairAsk'], stairAsk: ['stairs', 'travel'], stairScene: [],
};
module.exports = G => {
  const bad = {}, note = k => { bad[k] = (bad[k] || 0) + 1; }, seen = {};
  G.Flow.trace = (a, b) => { seen[a + '>' + b] = (seen[a + '>' + b] || 0) + 1; if (!(ALLOWED[a] || []).includes(b)) note(`허용되지 않은 전환 ${a} > ${b}`); };
  const F = G.Fantasy, hurt = F.hurt, member = F.hurtMember;
  // 전투 밖에서는 아무도 공격하지 않는다 (함정 · 장면의 피해는 공격자가 없다)
  F.hurt = function (f, rt, m, dmg, src, from) { if (from && !rt.turn) note(`전투 밖 공격: ${from.merc ? from.merc.cls : from.n} (${src})`); return hurt.apply(this, arguments); };
  F.hurtMember = function (f, rt, p, dmg, mo) {
    if (mo && mo.x != null) {
      if (!rt.turn) note(`전투 밖 몬스터 공격: ${mo.n}`);
      if (!G.Turn.oa && Math.hypot(mo.x - p.x, mo.y - p.y) > G.Foe.reach(mo) + 0.01) note(`닿지 않는 거리의 공격: ${mo.n}`);
      else if (!F.sees(rt.map, mo, p)) note(`벽 너머 공격: ${mo.n}`);
    }
    return member.apply(this, arguments);
  };
  // 차례가 시작될 때 칸마다 한 명
  const step = G.Turn.run;
  G.Turn.run = function (f, rt, dt) { const r = step.apply(this, arguments);
    // 전투 중에는 상대가 모두 보이고, 적이 없으면 전투가 곧 끝난다
    if (rt.turn) {
      if (rt.mons.some(o => o.aggro && !o.flee && !o.spotted)) note('전투 상대가 안 보임');
      if (!rt.mons.some(o => o.aggro && !o.flee && o.hp > 0)) { rt.turn._idle = (rt.turn._idle || 0) + dt; if (rt.turn._idle > 1.5) note('적이 없는데 전투가 계속됨'); }
    } if (rt.turn && (rt.turn.ph === 'move' || rt.turn.ph === 'show') && G.Tactics.overlap(rt, rt.turn.ph === 'move' ? rt.turn.cur : null)) note('한 칸에 두 명'); return r; };
  // 안 보이던 적이 눈앞에 생기지 않는다: 파티가 보는 자리에, 본 적 없는 몬스터가 나타나면 위반 (누워 있던 자리 · 철창 · 미믹은 spotted로 나온다)
  const spawn = F.spawnMon;
  F.spawnMon = function (rt, fl, d, x, y, boss, o) { const e = spawn.apply(this, arguments); if (rt.flow && rt.flow.map === rt.map && rt.party.length && !(o && o.spotted) && rt.party.some(p => !p.dead && F.sees(rt.map, p, { x, y }))) note('보이는 곳에 몬스터 생성'); return e; };
  const sup = G.Sight.update;
  G.Sight.update = function (rt) { const was = new Set(rt.mons.filter(o => o.spotted)); sup.apply(this, arguments); for (const o of rt.mons) if (o.spotted && !was.has(o) && rt.veil && rt.veil.has(Math.round(o.y) * rt.map.w + Math.round(o.x))) note('베일 안의 적이 보임'); for (const o of rt.mons) if (o.spotted && !was.has(o) && !(rt.seen[Math.round(o.y) * rt.map.w + Math.round(o.x)])) note('어둠 위에 보이는 적'); };
  // 숨 고르기 중에는 아무도 걷지 않는다 (전투가 끝난 뒤 다 같이 흩어지지 않는다)
  const flowTick = G.Flow.tick;
  G.Flow.tick = function (f, rt, speed, dt) {
    const st0 = rt.flow && rt.flow.map === rt.map ? rt.flow.st : null, pos = rt.party.map(p => [p, p.x, p.y]);
    flowTick.apply(this, arguments);
    if (st0 !== 'after') return;
    const lead = rt.hero.dead ? rt.party.find(p => !p.dead) : rt.hero, n = pos.filter(([p, x, y]) => Math.hypot(p.x - x, p.y - y) > 0.001 && Math.hypot(x - lead.x, y - lead.y) <= 3.5).length;
    if (n > 0) note(`${st0} 중 ${n}명이 움직임`);
  };
  // 모든 몬스터에 역할이 있고, 무리 이름이 그 구간의 몬스터를 가리킨다
  for (const k of Object.keys(G.D.F.mon)) if (!G.Foe.ROLES[G.D.F.mon[k].r]) note(`역할 없는 몬스터: ${k}`);
  for (const x of Object.values(G.D.F.factions)) { if (x.by.length !== G.D.F.bands.length) note(`구간이 빠진 세력: ${x.n}`); for (const t of x.by) for (const n of t) if (!G.D.F.mon[n]) note(`도감에 없는 몬스터: ${n}`); }
  // 모든 기술에 사거리가 있다
  for (const k of Object.keys(G.Skill.SK)) if (G.D.SK_RANGE[k] == null) note(`사거리 없는 기술: ${k}`);
  process.on('exit', () => {
    const k = Object.keys(bad);
    console.log(`\n진행 규칙 검사: 전환 ${Object.values(seen).reduce((a, b) => a + b, 0)}회, 위반 ${k.length}종`);
    for (const x of k) console.log(`  ✗ ${x} × ${bad[x]}`);
    if (k.length) process.exitCode = 1;
  });
};
