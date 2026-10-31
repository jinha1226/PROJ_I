// 밸런스 봇: node test/sim.js [분] [--seed=N] [--block=노드,...] [--prestige] [-v]
// 화면 없이 맵 시뮬레이션을 돌리며, 스킬트리에서 가장 싼 노드를 사는 플레이어처럼 진행한다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').slice(k.length + 1);
const seed = +arg('--seed') || 12345;
const MIN = +process.argv[2] || 120, VERBOSE = process.argv.includes('-v'), PRESTIGE = process.argv.includes('--prestige');

function boot() {
  const M = Object.create(Math);
  let st = seed >>> 0;
  M.random = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ctx = { console, Math: M, JSON, Date, btoa, atob };
  vm.createContext(ctx);
  for (const f of ['core', 'data', 'grid', 'juice', 'tree', 'trees', 'season', 'fantasy', 'rivals', 'guild', 'persona', 'quirks', 'trinkets', 'bonds', 'report', 'skills', 'combo', 'command', 'expedition', 'state'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return ctx.G;
}
const G = boot();
// 스킬 · 연계기 시전 횟수 (G.Skill · G.Combo가 센다)
G.Sim = { casts: {}, combos: {} };
G.newState();
const logs = [];
G.on('log', e => logs.push(`[${fmtT(G.S.runTime)}] ${e.msg}`));
function fmtT(s) { return `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}`; }

// --block=노드1,노드2 : 그 노드는 사지 않는다 (밸런스 원인 찾기용)
const BLOCK = (arg('--block') || '').split(',').filter(Boolean);
function buyTree(id, st) {
  for (let i = 0; i < 30; i++) {
    const c = G.Tree.cheapest(id, st, n => !BLOCK.includes(n.id));
    if (!c || !G.Tree.buy(id, st, c.node.id)) return;
  }
}
function bot() {
  const S = G.S;
  buyTree('nexus', S.ntree);
  if (S.signs >= 10) G.Relic.summon(1);
  // 길드 (트리보다 먼저): 명단에 없는 직업을 먼저 고용하고, 명단이 출전 칸 +1을 넘으면 가장 낮은 레벨의 중복 직업을 내보낸다
  const ff = S.w.fantasy, GD = G.Guild, T = GD.tavern(ff), have = new Set(ff.mercs.map(m => m.cls));
  const pickI = T.offers.findIndex(o => !have.has(o.m.cls) && o.price <= ff.gold);
  const cheap = T.offers.findIndex(o => o.price <= ff.gold);
  if (pickI >= 0 || (ff.mercs.length < G.Fantasy.slots() && cheap >= 0)) {
    if (ff.mercs.length >= GD.ROSTER_MAX || ff.mercs.length > G.Fantasy.slots()) {
      const dup = ff.mercs.filter(m => ff.mercs.some(o => o !== m && o.cls === m.cls)).sort((a, b) => a.lv - b.lv)[0];
      if (dup) GD.dismiss(ff, dup.uid);
    }
    GD.hire(ff, pickI >= 0 ? pickI : cheap);
  }
  // 전직: Lv 10이 되면 마을에서 둘 중 아무거나 (트리보다 먼저)
  // 요양소: 금고의 10% 안이면 부정 기벽을 지운다
  if (ff.town) for (const m of ff.mercs) for (const k of m.traits.slice()) if (G.Quirk.bad(k) && G.Quirk.cost(ff, m, k) <= ff.gold * 0.1) G.Quirk.treat(ff, m, k);
  if (ff.town) for (const m of ff.mercs) if (GD.canPromote(m)) GD.promote(ff, m, G.U.pick(GD.advs(m.cls)));
  for (const id in G.MODS) if (S.unlocked[id]) buyTree(id, S.w[id].tree);
  // 명성 트리: 쌓이면 가장 싼 노드부터
  if (S.w.fantasy.fame) buyTree('fame', G.Season.fameSt(S.w.fantasy));
  // 판타지: 초반엔 몬스터를 직접 친다
  const f = S.w.fantasy, rt = G.Fantasy.rt(f);
  if (S.runTime < 900 && rt.mons.length) { const m = rt.mons.find(o => G.Fantasy.inView(rt, o.x, o.y)); if (m) G.Fantasy.click(f, m.x, m.y); }
  for (const k of Object.keys(G.Fantasy.SKILLS)) if (k !== 'assault' && rt.mons.length) G.Fantasy.cast(f, k);
}

const marks = [1, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360].filter(m => m <= MIN);
let prest = 0;
const t0 = Date.now();
for (let t = 0; t < MIN * 60; t++) {
  G.tick(1, 0.1);
  bot();
  if (PRESTIGE && G.Prestige.can() && G.Prestige.gain() >= Math.max(3, G.S.starsEarned)) {
    const g = G.Prestige.go();
    prest++;
    console.log(`  ★ 붕괴 #${prest} @${fmtT(t)} 별 +${g} (누적 ${G.S.starsEarned})`);
    buyTree('stars', G.S.stree);
  }
  const m = (t + 1) / 60;
  if (marks.includes(m)) {
    const S = G.S, f = S.w.fantasy, U = G.U;
    const nodes = id => Object.values(S.w[id].tree).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
    console.log(`${String(m).padStart(3)}분 | 정수 ${U.fmt(S.ess).padStart(6)} (누적 ${U.fmt(S.runEss)}) 인장 ${S.signs} 유물 ${Object.keys(S.relics).length} | ` +
      `던전 ${f.maxFloor}층 노드${nodes('fantasy')} | ` +
      `붕괴 ${G.Prestige.can() ? G.Prestige.gain() : '-'}`);
  }
}
console.log("용병 " + G.S.w.fantasy.mercs.map(m => `${G.Guild.def(m).n} ${m.lv}`).join(" · "));
console.log('기벽 ' + G.S.w.fantasy.mercs.map(m => m.traits.map(k => G.Quirk.def(k).n + (G.Quirk.locked(m, k) ? '🔒' : '')).join('/')).join(' · '));
{ const ff = G.S.w.fantasy, T = G.Trinket; console.log(`장신구 ${T.all(ff).length}개 (창고 ${T.store(ff).length}) · ` + T.all(ff).filter(t => t.on != null).map(t => G.D.TRINKETS[t.k].n + '★' + t.g).join(' · ')); }
{ const ff = G.S.w.fantasy; console.log('관계 ' + G.Bond.pairs(ff, ff.mercs).map(p => `${p.a.name}-${p.b.name} ${p.r === 'friend' ? '전우' : '앙숙'}`).join(' · ')); }
console.log('라이벌 ' + G.D.RIVALS.map(d => { const r = G.S.w.fantasy.rivals[d.id]; return `${d.n} ${r.floor}층(실력 ${r.power.toFixed(1)})`; }).join(' · '));
console.log(`스킬 ${Object.keys(G.Sim.casts).length}종 ${Object.values(G.Sim.casts).reduce((a, b) => a + b, 0)}회 · 연계기 ` + Object.entries(G.Sim.combos).map(([k, n]) => `${G.Combo.CB[k].n} ${n}`).join(' · '));
if (VERBOSE) console.log(JSON.stringify(G.Sim.casts));
console.log(`실행 ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (VERBOSE) console.log(logs.slice(-40).join('\n'));
