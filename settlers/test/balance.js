// 밸런스 봇: node test/balance.js [runs] [maxDays]
// 정착지를 운영하면서 원정을 반복해 승리/전멸까지 몇 일이 걸리는지 본다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const SEEDARG = process.argv.find(a => a.startsWith('--seed='));
let seed = SEEDARG ? +SEEDARG.slice(7) : (Date.now() % 1e9);
function boot() {
  const M = Object.create(Math);
  let st = seed >>> 0;
  M.random = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ctx = { console, Math: M, JSON, Date };
  vm.createContext(ctx);
  for (const f of ['core', 'data', 'chars', 'settle', 'dungeon', 'state']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return ctx.G;
}
const RUNS = +process.argv[2] || 3, MAXDAYS = +process.argv[3] || 60, VERBOSE = process.argv.includes('-v');
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

function game(G) {
  G.newState();
  const cols = [];
  for (let k = 0; k < 4; k++) cols.push(G.Chars.create(cols.map(c => c.name)));
  G.startGame(cols);
  const s = G.S.settle, W = G.Settle.W;
  let lastSum = null, victory = false;
  G.onEvent = (k, sum) => { if (k === 'expedition_end') lastSum = sum; if (k === 'victory') victory = true; };
  G.onPrompt = (t, yes) => { if (!t.includes('만드라고라')) yes(); };
  // 기본 정착지 설계
  const e = s.entrance, cx = 36, cy = 25;
  const placeNear = (type, x, y) => {
    for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (G.Settle.canPlace(type, x + dx, y + dy)) return G.Settle.applyTool('b:' + type, x + dx, y + dy, x + dx, y + dy);
    }
    return 0;
  };
  G.Settle.applyTool('chop', cx - 14, cy - 8, cx + 14, cy + 8);
  G.Settle.applyTool('mine', e.x - 5, e.y - 5, e.x + 5, e.y + 3);
  G.Settle.applyTool('farm', cx + 4, cy + 3, cx + 11, cy + 6);
  G.Settle.applyTool('b:wall_wood', cx - 3, cy - 8, cx + 4, cy - 3);
  s.bld[(cy - 3) * W + cx] = null; G.Settle.applyTool('b:door', cx, cy - 3, cx, cy - 3);
  for (let k = 0; k < 6; k++) G.Settle.applyTool('b:bed', cx - 2 + k, cy - 7, cx - 2 + k, cy - 7);
  G.Settle.applyTool('b:table', cx + 2, cy - 5, cx + 2, cy - 5);
  placeNear('workbench', cx - 4, cy + 3);
  placeNear('research_desk', cx - 2, cy + 3);
  G.S.bills.ration = 12; G.S.bills.meal = 6; G.S.bills.leather_armor = 1; G.S.bills.club = 1; G.S.bills.shortbow = 1;
  const built = {};
  function manage() {
    const R = G.S.research;
    if (!R.cur) {
      for (const k of ['smithing', 'cuisine', 'alchemy', 'waystone', 'medicine', 'anatomy', 'steelwork', 'recruitment', 'fortify', 'runecraft', 'arcane']) {
        const r = G.RESEARCH[k];
        if (R.done[k] || !(r.req || []).every(q => R.done[q])) continue;
        if (!R.paid[k] && !G.Settle.Store.has(r.cost)) continue;
        if (!R.paid[k]) { G.Settle.Store.take(r.cost); R.paid[k] = true; }
        R.cur = k; break;
      }
    }
    const want = { smithing: ['forge', cx + 6, cy - 2], alchemy: ['alchemy', cx + 8, cy - 2], medicine: ['med_bed', cx + 3, cy - 7], waystone: ['waystone', cx - 8, cy] };
    for (const k in want) if (R.done[k] && !built[k]) built[k] = placeNear(want[k][0], want[k][1], want[k][2]) > 0;
    if (!G.Settle.bldCount('research_desk') && !s.bld.some(b => b && b.type === 'research_desk')) placeNear('research_desk', cx - 2, cy + 3);
    if (R.done.smithing) { G.S.bills.iron = 4; G.S.bills.short_sword = 1; G.S.bills.chain_mail = 1; G.S.bills.mace = 1; }
    if (R.done.steelwork) { G.S.bills.long_sword = 1; G.S.bills.plate_armor = 1; }
    if (R.done.alchemy) { G.S.bills.potion_heal = 5; }
    if (R.done.runecraft) G.S.bills.scroll_return = 2;
    if (R.done.cuisine) G.S.bills.hearty_ration = 6;
  }
  function settleDays(n) {
    const t0 = s.tick;
    let wt = Date.now(), wtick = s.tick;
    while (G.S.settle.tick < t0 + n * G.Settle.DAY) {
      G.Settle.tick();
      if (s.tick - wtick >= 100) {
        const ms = Date.now() - wt;
        if (ms > 1500 && process.argv.includes('-dbg')) {
          console.log('SLOW 100 ticks', ms, 'ms day', G.Settle.day(), 'mons', s.mons.length);
          for (const c of G.S.colonists.filter(c => c.loc === 'home')) console.log('  ', c.name, c.x, c.y, JSON.stringify(c.job), 'path', c.path.length, 'idle', c.idleUntil - s.tick, 'drafted', c.drafted);
          process.exit(1);
        }
        wt = Date.now(); wtick = s.tick;
      }
      if (G.S.settle.tick % 200 === 0) manage();
      while (G.S.pendingRecruits.length) {
        const cands = G.S.pendingRecruits.shift();
        const c = cands.sort((a, b) => (b.str + b.dex + b.int) - (a.str + a.dex + a.int))[0];
        G.S.colonists.push(c); G.Settle.arrive(c);
      }
      if (!G.S.colonists.some(c => c.loc !== 'dead')) return;
    }
  }

  function bot(targetDepth) {
    const D = G.Dun;
    let returning = false, guard = 0;
    let dumped = false;
    while (G.S.dun && guard++ < 60000) {
      const d = G.S.dun;
      if (d.depth !== d._dl) { d._dl = d.depth; d._dt = d.turn; }
      if (guard % 5000 === 0 && process.argv.includes('-dbg')) console.log('WATCH guard', guard, 'turn', d.turn, 'depth', d.depth, 'waiting', d.waiting, 'auto', JSON.stringify(d.auto), 'foes', D.visibleMons().length, 'returning', returning);
      if (d.turn - d._dt > 1500 && !dumped && process.argv.includes('-dbg')) {
        dumped = true;
        const c = D.ctrl(), lv = D.level();
        console.log('STUCK depth', d.depth, 'returning', returning, 'ctrl', c.x, c.y, 'up', JSON.stringify(lv.up), 'auto', JSON.stringify(d.auto));
        console.log(' vis mons', D.visibleMons().map(m => `${m.type}@${m.x},${m.y} ${m.state} hp${m.hp}`).join(' | '));
        console.log(' party', D.alive().map(o => `${o.name}@${o.x},${o.y} hp${o.hp}`).join(' | '));
        console.log(' log', G.S.log.slice(-12).map(m => m.t).join(' / '));
        const rows = [];
        for (let y = Math.max(0, c.y - 8); y < Math.min(D.H, c.y + 9); y++) { let r = ''; for (let x = Math.max(0, c.x - 20); x < Math.min(D.W, c.x + 21); x++) { const m = lv.mons.find(m => m.hp > 0 && m.x === x && m.y === y); const p = D.alive().find(o => o.x === x && o.y === y); r += p ? '@' : m ? G.MON[m.type].g : D.TT[lv.t[y * D.W + x]].g; } rows.push(r); }
        console.log(rows.join('\n'));
      }
      if (!d.waiting) { D.run(); if (!G.S.dun) break; continue; }
      const c = D.ctrl(), party = D.alive(), lv = D.level();
      const foes = D.visibleMons();
      const potions = d.bag.stacks.potion_heal || 0;
      const low = party.find(o => o.hp < G.Chars.maxHP(o) * 0.35);
      if (low && potions && foes.length) { D.cmd('use', 'potion_heal', low); continue; }
      if (foes.length) {
        if (party.length && party.every(o => o.hp < G.Chars.maxHP(o) * 0.25) && d.bag.stacks.scroll_return) { D.cmd('use', 'scroll_return', c); break; }
        foes.sort((a, b) => cheb(a, c) - cheb(b, c));
        const m = foes[0];
        const abs = D.abilities(c);
        const tryAb = id => { const a = abs.find(x => x.id === id); if (!a || c.mp < a.mp) return false; const t = D.targetsFor(c, a); if (a.tgt === 'self') return D.cmd('ability', id, c); const tg = t.includes(m) ? m : t[0]; return tg ? D.cmd('ability', id, tg) : false; };
        if (cheb(m, c) > 1 && (tryAb('fire_bolt') || tryAb('fire') || tryAb('magic_dart'))) continue;
        if (cheb(m, c) <= 1 && c.mp >= 3 && (tryAb('stun_blow') || tryAb('double_slash') || tryAb('whirl'))) continue;
        const pr = G.bfs(D.W, D.H, c.x, c.y, (x, y) => D.passT(x, y), (x, y) => x === m.x && y === m.y, 3000);
        let ok = false;
        if (pr && pr.path.length) ok = D.cmd('move', pr.path[0][0] - c.x, pr.path[0][1] - c.y);
        if (!ok) for (const [ax, ay] of G.DIRS8) if (D.cmd('move', ax, ay)) { ok = true; break; }
        if (!ok) D.cmd('wait');
        continue;
      }
      const rations = ['ration', 'hearty_ration', 'meal', 'fine_meal'].reduce((n, k) => n + (d.bag.stacks[k] || 0), 0);
      const avgXL = party.reduce((n, o) => n + o.xl, 0) / party.length;
      if (!returning && (rations < party.length || (party.length < 2 && d.depth > 1) || D.bagWeight() > D.bagCap() * 0.9)) returning = true;
      if (party.some(o => o.hp < G.Chars.maxHP(o) * 0.75 || o.mp < G.Chars.maxMP(o) * 0.5)) {
        D.setAuto('rest'); let n = 0; while (G.S.dun && G.S.dun.auto && n++ < 600) D.autoStep();
        if (G.S.dun && !G.S.dun.auto && D.visibleMons().length) continue;
        if (!G.S.dun) break;
        if (party.every(o => o.hp >= G.Chars.maxHP(o) * 0.75)) continue;
      }
      const onUp = lv.t[c.y * D.W + c.x] === 'up', onDown = lv.t[c.y * D.W + c.x] === 'down';
      if (returning) {
        if (onUp) { D.cmd('stairs', '<'); continue; }
        if (D.cmd('stairs', '<')) { let n = 0; while (G.S.dun && G.S.dun.auto && n++ < 3000) D.autoStep(); continue; }
        D.setAuto('explore'); let n = 0; while (G.S.dun && G.S.dun.auto && n++ < 3000) D.autoStep();
        if (G.S.dun && !G.S.dun.auto && !D.visibleMons().length && n <= 1) D.cmd('wait');
        continue;
      }
      D.setAuto('explore');
      let n = 0;
      while (G.S.dun && G.S.dun.auto && n++ < 3000) D.autoStep();
      if (!G.S.dun) break;
      if (D.visibleMons().length) continue;
      if (n > 1) continue;
      // 탐험 완료
      const deeper = d.depth < targetDepth && avgXL >= d.depth * 0.9 + 1 && rations >= party.length * 1.5;
      if (!deeper) { returning = true; continue; }
      if (onDown) { D.cmd('stairs', '>'); continue; }
      if (D.cmd('stairs', '>')) { let k = 0; while (G.S.dun && G.S.dun.auto && k++ < 3000) D.autoStep(); }
      else returning = true;
    }
    if (G.S.dun) { console.log('!! 봇 중단, 원정 강제 종료', G.S.dun.depth, G.S.dun.turn); G.S.dun = null; G.S.mode = 'settle'; for (const c of G.S.colonists) if (c.loc === 'away') G.Settle.arrive(c); }
  }

  settleDays(3);
  const log = [];
  while (G.Settle.day() < MAXDAYS && !victory) {
    const home = G.S.colonists.filter(c => c.loc === 'home');
    if (!G.S.colonists.some(c => c.loc !== 'dead')) break;
    const ready = home.filter(c => c.hp > G.Chars.maxHP(c) * 0.7).sort((a, b) => b.xl - a.xl);
    if (ready.length < 2) { settleDays(1); continue; }
    const team = ready.slice(0, Math.min(4, ready.length - 1));
    const score = it => { const dd = G.GEAR[it.base]; return (dd.dmg || 0) + (dd.ac || 0) * 1.5 + (dd.cap || 0) / 4 + it.plus * 2; };
    for (const c of team) for (const sl of ['weapon', 'armor', 'shield', 'pack']) {
      if (sl === 'shield' && c.equip.weapon && G.GEAR[c.equip.weapon.base].two) continue;
      const cand = G.S.armory.filter(o => G.GEAR[o.base].slot === sl && !(sl === 'weapon' && G.GEAR[o.base].two && c.equip.shield)).sort((a, b) => score(b) - score(a))[0];
      if (cand && (!c.equip[sl] || score(cand) > score(c.equip[sl]))) { G.S.armory.splice(G.S.armory.indexOf(cand), 1); if (c.equip[sl]) G.S.armory.push(c.equip[sl]); c.equip[sl] = cand; }
    }
    const sup = {};
    for (const [k, mx] of [['hearty_ration', 6], ['ration', team.length * 4], ['potion_heal', 4], ['scroll_return', 1], ['potion_might', 1]]) { const q = Math.min(G.S.store[k] || 0, mx); if (q) { sup[k] = q; G.S.store[k] -= q; } }
    if ((sup.ration || 0) + (sup.hearty_ration || 0) < team.length * 2) { for (const k in sup) G.S.store[k] += sup[k]; settleDays(1); continue; }
    let start = 1;
    if (G.Settle.bldCount('waystone') && G.S.maxDepth >= 7) start = 7; else if (G.Settle.bldCount('waystone') && G.S.maxDepth >= 4) start = 4;
    lastSum = null;
    G.Dun.start(team.map(c => c.id), sup, start);
    bot(10);
    const sm = lastSum || {};
    log.push(`d${G.Settle.day()} 시작${start} 최고${sm.deepest} ${sm.kind} 처치${sm.kills} ${sm.turns}턴 XL[${team.map(c => c.xl).join(',')}]${sm.dead && sm.dead.length ? ' 사망' + sm.dead.length : ''}${sm.rescued && sm.rescued.length ? ' 구출' + sm.rescued.length : ''}`);
    if (VERBOSE) console.log(log[log.length - 1], JSON.stringify(sm.loot || {}));
    if (victory) break;
    settleDays(1.5);
  }
  const alive = G.S.colonists.filter(c => c.loc !== 'dead').length;
  return { victory, day: G.Settle.day(), alive, dead: G.S.colonists.length - alive, maxDepth: G.S.maxDepth, research: Object.keys(G.S.research.done).length, exps: log.length, log, deaths: G.S.colonists.filter(c => c.loc === 'dead').map(c => c.deathCause) };
}

for (let r = 0; r < RUNS; r++) {
  const t0 = Date.now();
  if (r > 0) seed++;
  console.log('seed', seed);
  const res = game(boot());
  console.log(`#${r + 1} ${res.victory ? '승리' : '실패'} ${res.day}일 생존${res.alive} 사망${res.dead} 최고${res.maxDepth}층 연구${res.research} 원정${res.exps}회 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (VERBOSE) { console.log('  사인:', res.deaths.join(' / ')); }
}
