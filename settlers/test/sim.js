// 헤드리스 시뮬레이션 테스트: node test/sim.js [days] [expeditions]
// 정착지를 며칠 돌리고, 봇이 원정을 여러 번 수행하며 예외·정지·밸런스를 확인한다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } } };
vm.createContext(ctx);
for (const f of ['core', 'data', 'chars', 'settle', 'dungeon', 'state']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}
const G = ctx.G;
let problems = 0;
const problem = (...a) => { problems++; console.log('!!', ...a); };
const DAYS = +process.argv[2] || 6, EXPS = +process.argv[3] || 4;
const events = {};
G.onEvent = k => { events[k] = (events[k] || 0) + 1; };
G.onPrompt = (t, yes) => yes();

G.newState();
const cols = [];
for (let k = 0; k < 4; k++) cols.push(G.Chars.create(cols.map(c => c.name)));
G.startGame(cols);
const s = G.S.settle, W = G.Settle.W;
// 플레이어 흉내: 벌목·채굴 지정, 침대·식탁·작업대·연구대, 농지
const e = s.entrance;
G.Settle.applyTool('chop', 20, 15, 52, 35);
G.Settle.applyTool('mine', e.x - 4, e.y - 4, e.x + 4, e.y + 4);
const cx = 36, cy = 25;
G.Settle.applyTool('farm', cx + 6, cy + 2, cx + 11, cy + 5);
G.Settle.applyTool('b:wall_wood', cx - 2, cy - 7, cx + 6, cy - 3);
G.Settle.applyTool('b:door', cx + 2, cy - 3, cx + 2, cy - 3);
s.bld[(cy - 3) * W + cx + 2] = null; G.Settle.applyTool('b:door', cx + 2, cy - 3, cx + 2, cy - 3);
for (let k = 0; k < 4; k++) G.Settle.applyTool('b:bed', cx - 1 + k, cy - 6, cx - 1 + k, cy - 6);
G.Settle.applyTool('b:table', cx + 3, cy - 5, cx + 3, cy - 5);
G.Settle.applyTool('b:workbench', cx - 3, cy + 3, cx - 3, cy + 3);
G.Settle.applyTool('b:research_desk', cx - 1, cy + 3, cx - 1, cy + 3);
G.S.research.cur = 'cuisine';
G.S.bills.leather_armor = 1;

function settleDays(n) {
  const t0 = s.tick;
  while (G.S.settle.tick < t0 + n * G.Settle.DAY) {
    G.Settle.tick();
    while (G.S.pendingRecruits.length) {
      const c = G.S.pendingRecruits.shift()[0];
      G.S.colonists.push(c); G.Settle.arrive(c);
    }
  }
}

const t0 = Date.now();
settleDays(DAYS);
const alive = () => G.S.colonists.filter(c => c.loc !== 'dead');
console.log(`정착지 ${DAYS}일: ${Date.now() - t0}ms, 생존 ${alive().length}/${G.S.colonists.length}`);
console.log('저장소', JSON.stringify(G.S.store));
console.log('건물', s.bld.filter(b => b && b.built).map(b => b.type).join(','), '| 미완성', s.bld.filter(b => b && !b.built).length);
console.log('연구', JSON.stringify(G.S.research.done), '진행', JSON.stringify(G.S.research.prog));
console.log('이벤트', JSON.stringify(events));
for (const c of alive()) console.log(' ', c.name, G.Chars.title(c), `HP ${c.hp}/${G.Chars.maxHP(c)} 식량 ${c.food.toFixed(0)} 휴식 ${c.rest.toFixed(0)} 기분 ${c.mood.toFixed(0)}`, G.Settle.jobLabel(c));

// ───── 원정 봇 ─────
function bot(maxTurns) {
  const D = G.Dun;
  let guard = 0;
  while (G.S.dun && guard++ < 20000) {
    const d = G.S.dun;
    if (d.turn > maxTurns) { // 오래 걸리면 귀환 시도
      const c = D.ctrl(), lv = D.level();
      if (lv.t[c.y * D.W + c.x] === 'up') { D.cmd('stairs', '<'); continue; }
    }
    if (!d.waiting) { D.run(); if (!G.S.dun) break; if (!G.S.dun.waiting) { problem('대기 상태가 아님'); break; } }
    const c = D.ctrl();
    const foes = D.visibleMons();
    const mx = G.Chars.maxHP(c);
    if (c.hp < mx * 0.35 && d.bag.stacks.potion_heal) { D.cmd('use', 'potion_heal', c); continue; }
    if (foes.length) {
      foes.sort((a, b) => Math.max(Math.abs(a.x - c.x), Math.abs(a.y - c.y)) - Math.max(Math.abs(b.x - c.x), Math.abs(b.y - c.y)));
      const m = foes[0];
      const dx = Math.sign(m.x - c.x), dy = Math.sign(m.y - c.y);
      const abs = D.abilities(c);
      const ranged = abs.find(a => a.id === 'fire' || a.id === 'magic_dart');
      if (ranged && D.targetsFor(c, ranged).includes(m) && c.mp >= ranged.mp) { if (D.cmd('ability', ranged.id, m)) continue; }
      if (D.cmd('move', dx, dy)) continue;
      // 막히면 대충 다른 방향
      let ok = false;
      for (const [ax, ay] of G.DIRS8) if (D.cmd('move', ax, ay)) { ok = true; break; }
      if (!ok) D.cmd('wait');
      continue;
    }
    const party = D.alive();
    if (party.some(o => o.hp < G.Chars.maxHP(o) * 0.6)) { D.setAuto('rest'); let n = 0; while (G.S.dun && G.S.dun.auto && n++ < 500) D.autoStep(); continue; }
    if (d.turn > maxTurns) { D.cmd('stairs', '<'); let n = 0; while (G.S.dun && G.S.dun.auto && n++ < 3000) D.autoStep(); if (G.S.dun && !G.S.dun.auto) { const lv = D.level(); const cc = D.ctrl(); if (lv.t[cc.y * D.W + cc.x] !== 'up') { D.setAuto('explore'); let k = 0; while (G.S.dun && G.S.dun.auto && k++ < 300) D.autoStep(); } } continue; }
    D.setAuto('explore');
    let n = 0, moved = false;
    while (G.S.dun && G.S.dun.auto && n++ < 3000) { D.autoStep(); moved = true; }
    if (!G.S.dun) break;
    if (D.visibleMons().length) continue;
    // 탐험 완료 → 내려가기
    const lv = D.level(), cc = D.ctrl();
    if (lv.t[cc.y * D.W + cc.x] === 'down') { D.cmd('stairs', '>'); continue; }
    const r = D.cmd('stairs', '>');
    if (r) { let k = 0; while (G.S.dun && G.S.dun.auto && k++ < 3000) D.autoStep(); }
    else if (!moved) D.cmd('wait');
  }
}

let lastSum = null;
G.onEvent = (k, sum) => { events[k] = (events[k] || 0) + 1; if (k === 'expedition_end') lastSum = sum; };
for (let x = 0; x < EXPS; x++) {
  const home = alive().filter(c => c.loc === 'home').sort((a, b) => b.hp / G.Chars.maxHP(b) - a.hp / G.Chars.maxHP(a));
  if (home.length < 2) { console.log('원정 가능 인원 부족'); break; }
  const team = home.slice(0, Math.min(4, home.length - 1 > 0 ? Math.min(4, home.length - 1) : 1));
  for (const c of team) for (const sl of ['weapon', 'armor']) if (!c.equip[sl]) { const g = G.S.armory.find(o => G.GEAR[o.base].slot === sl); if (g) { G.S.armory.splice(G.S.armory.indexOf(g), 1); c.equip[sl] = g; } }
  const sup = {};
  for (const k of ['ration', 'potion_heal', 'meal']) { const q = Math.min(G.S.store[k] || 0, k === 'meal' ? 4 : 8); if (q) { sup[k] = q; G.S.store[k] -= q; } }
  const t1 = Date.now();
  G.Dun.start(team.map(c => c.id), sup, 1);
  bot(1800 + x * 600);
  console.log(`원정 ${x + 1}: ${Date.now() - t1}ms`, lastSum && JSON.stringify({ kind: lastSum.kind, deepest: lastSum.deepest, kills: lastSum.kills, turns: lastSum.turns, dead: lastSum.dead, loot: lastSum.loot, gear: lastSum.gear.length, rescued: lastSum.rescued }));
  if (G.S.dun) { problem('원정이 끝나지 않음 turn', G.S.dun.turn, 'depth', G.S.dun.depth); G.S.dun = null; }
  for (const c of alive()) if (c.loc === 'away') problem('away 상태로 남음', c.name);
  // 저장/불러오기 왕복
  const raw = G.serialize();
  G.S = JSON.parse(raw); G.Settle.onLoad();
  settleDays(1);
}
console.log('최종 생존', alive().length, '최대 깊이', G.S.maxDepth, '이벤트', JSON.stringify(events));
for (const c of alive()) console.log(' ', c.name, `XL${c.xl}`, G.Chars.title(c), `HP ${c.hp}/${G.Chars.maxHP(c)}`, Object.entries(c.skills).filter(([, v]) => v > 0).map(([k, v]) => G.SKILLS[k] + v).join(' '));
for (const c of G.S.colonists.filter(c => c.loc === 'dead')) console.log('  ☠', c.name, c.deathCause);

if (problems) { console.log(`실패: 문제 ${problems}건`); process.exit(1); }
console.log('통과');
