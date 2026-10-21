// 밸런스 봇: node test/sim.js [분] [--seed=N] [--order=wuxia,xianxia,scifi,cthulhu] [--block=노드,...] [--prestige] [-v]
// 화면 없이 맵 시뮬레이션을 돌리며, 스킬트리에서 가장 싼 노드를 사는 플레이어처럼 진행한다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').slice(k.length + 1);
const seed = +arg('--seed') || 12345;
const MIN = +process.argv[2] || 120, VERBOSE = process.argv.includes('-v'), PRESTIGE = process.argv.includes('--prestige');
const order = (arg('--order') || 'wuxia,xianxia,scifi,cthulhu').split(',');

function boot() {
  const M = Object.create(Math);
  let st = seed >>> 0;
  M.random = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ctx = { console, Math: M, JSON, Date };
  vm.createContext(ctx);
  for (const f of ['core', 'data', 'grid', 'juice', 'tree', 'trees', 'fantasy', 'wuxia', 'xianxia', 'scifi', 'cthulhu', 'state'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return ctx.G;
}
const G = boot();
G.newState();
// 봇은 수선 자동 천겁을 켠다 (사람은 처음에 꺼져 있다 — 천겁은 직접 고르는 리스크)
G.S.w.xianxia.autoBreak = true;
const logs = [];
G.on('log', e => logs.push(`[${fmtT(G.S.runTime)}] ${e.msg}`));
function fmtT(s) { return `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}`; }
const firstUnlock = {};

// --block=노드1,노드2 : 그 노드는 사지 않는다 (밸런스 원인 찾기용)
const BLOCK = (arg('--block') || '').split(',').filter(Boolean);
function buyTree(id, st) {
  for (let i = 0; i < 30; i++) {
    const c = G.Tree.cheapest(id, st, n => !BLOCK.includes(n.id));
    if (!c || !G.Tree.buy(id, st, c.node.id)) return;
  }
}
let acc = 0;
function bot(dt) {
  const S = G.S, T = G.Tree;
  acc += dt;
  for (const id of order) if (!S.unlocked[id] && T.buy('nexus', S.ntree, 'open_' + id)) firstUnlock[id] = fmtT(S.runTime);
  const pending = order.find(id => !S.unlocked[id]);
  if (!pending || S.ess > T.cost('nexus', S.ntree, 'open_' + pending) * 2) buyTree('nexus', S.ntree);
  if (S.signs >= 10) G.Relic.summon(1);
  for (const id in G.MODS) if (S.unlocked[id]) buyTree(id, S.w[id].tree);
  // 판타지: 초반엔 몬스터를 직접 친다
  const f = S.w.fantasy, rt = G.Fantasy.rt(f);
  if (S.runTime < 900 && rt.mons.length) { const m = rt.mons.find(o => G.Fantasy.inView(rt, o.x, o.y)); if (m) G.Fantasy.click(f, m.x, m.y); }
  for (const k of Object.keys(G.Fantasy.SKILLS)) if (k !== 'assault' && rt.mons.length) G.Fantasy.cast(f, k);
  if (S.unlocked.scifi) {
    const s = S.w.scifi, SF = G.Scifi;
    const types = ['laser', 'rail', 'cryo', 'amp', 'mortar', 'drone', 'tesla', 'missile'].filter(SF.unlocked);
    for (let i = 0; i < SF.padCount(); i++) if (!s.towers[i]) SF.build(s, i, types[i % types.length]);
    const srt = SF.rt(s);
    if (srt.en.length) { const e = srt.en.reduce((a, b) => (a.rem < b.rem ? a : b)); SF.strike(s, e.x, e.y); }
  }
  if (S.unlocked.xianxia) {
    const x = S.w.xianxia, xr = G.Xianxia.rt(x);
    if (xr.beasts.length && acc > 1) G.Xianxia.flySword(x, xr.beasts[0]);
  }
  if (S.unlocked.cthulhu) {
    // 바늘 근처 촉수는 눌러서 퇴치한다 (나머지는 자동 조종에 맡긴다)
    const c = S.w.cthulhu, C = G.Cthulhu, cr = C.rt(c);
    const tn = acc > 1 && cr.tents.find(o => Math.abs(o.y - cr.hook.y) < 3);
    if (tn) C.click(c, tn.x, tn.y);
  }
  if (acc > 3) acc = 0;
}

const marks = [1, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360].filter(m => m <= MIN);
let prest = 0;
const t0 = Date.now();
for (let t = 0; t < MIN * 60; t++) {
  G.tick(1, 0.1);
  bot(1);
  if (PRESTIGE && G.Prestige.can() && G.Prestige.gain() >= Math.max(3, G.S.starsEarned)) {
    const g = G.Prestige.go();
    prest++;
    console.log(`  ★ 붕괴 #${prest} @${fmtT(t)} 별 +${g} (누적 ${G.S.starsEarned})`);
    buyTree('stars', G.S.stree);
  }
  const m = (t + 1) / 60;
  if (marks.includes(m)) {
    const S = G.S, f = S.w.fantasy, w = S.w.wuxia, x = S.w.xianxia, s = S.w.scifi, c = S.w.cthulhu, U = G.U;
    const nodes = id => Object.values(S.w[id].tree).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
    console.log(`${String(m).padStart(3)}분 | 정수 ${U.fmt(S.ess).padStart(6)} (누적 ${U.fmt(S.runEss)}) 인장 ${S.signs} 유물 ${Object.keys(S.relics).length} | ` +
      `던전 ${f.maxFloor}층 노드${nodes('fantasy')} | ` +
      (S.unlocked.wuxia ? `무협 ${w.lives + 1}생 ${G.Wuxia.status(w)} 깨달음${U.fmt(w.ins)} | ` : '') +
      (S.unlocked.xianxia ? `수선 ${G.Xianxia.realmName(x.realm)} 진기${G.Xianxia.slotCount()} | ` : '') +
      (S.unlocked.scifi ? `SF W${s.maxWave} 포탑${Object.keys(s.towers).length} | ` : '') +
      (S.unlocked.cthulhu ? `크툴루 ${U.fmt(c.coins)} ${c.best}m 도감${Object.keys(c.dex).length} | ` : '') +
      `붕괴 ${G.Prestige.can() ? G.Prestige.gain() : '-'}`);
  }
}
console.log('해금 시각:', JSON.stringify(firstUnlock), `| 실행 ${((Date.now() - t0) / 1000).toFixed(1)}초`);
console.log('정수 출처:', Object.entries(G.S.essBy).map(([k, v]) => `${k} ${G.U.fmt(v)}`).join(', '));
if (VERBOSE) console.log(logs.slice(-40).join('\n'));
