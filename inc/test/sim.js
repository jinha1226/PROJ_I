// 밸런스 봇: node test/sim.js [분] [--seed=N] [--block=노드,...] [-v]
// 화면 없이 맵 시뮬레이션을 돌리며, 스킬트리에서 가장 싼 노드를 사는 플레이어처럼 진행한다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').slice(k.length + 1);
const seed = +arg('--seed') || 12345;
const MIN = +process.argv[2] || 120, VERBOSE = process.argv.includes('-v');

function boot() {
  const M = Object.create(Math);
  let st = seed >>> 0;
  M.random = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ctx = { console, Math: M, JSON, Date, btoa, atob };
  vm.createContext(ctx);
  for (const f of ['core', 'data', 'srd_gen', 'srd_base', 'srd_mons', 'grid', 'juice', 'season', 'fantasy', 'guild', 'create', 'persona', 'dnd', 'feats', 'trinkets', 'bonds', 'report', 'skills', 'srd', 'srd_spells', 'srd_upcast', 'spells', 'traits', 'options', 'pools', 'utilspell', 'srd_species', 'multiclass', 'srd_range', 'srd_items', 'items', 'skill_ai', 'team', 'camp', 'skill_fx', 'events', 'npc', 'tutorial', 'skill_nums', 'command', 'expedition', 'mission', 'explore', 'banter', 'lines_danger', 'sight', 'tactics', 'foe', 'summon', 'light','monact', 'actions', 'lore', 'region', 'scn_astral', 'tut_map', 'res', 'turn', 'flow', 'story', 'state'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return ctx.G;
}
const G = boot();
// --check: 진행 순서가 G.Flow의 규칙을 지키는지 검사한다 (test/flow_rules.js)
if (process.argv.includes('--check')) require('./flow_rules.js')(G);
// 스킬 시전 횟수 (G.Skill이 센다)
G.Sim = { casts: {}, combos: {} };
G.newState();
const logs = [];
G.on('log', e => logs.push(`[${fmtT(G.S.runTime)}] ${e.msg}`));
function fmtT(s) { return `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}`; }

function bot() {
  const S = G.S;
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
  if (ff.town) for (const m of ff.mercs) if (GD.canPromote(m)) GD.promote(ff, m, G.U.pick(GD.advs(m.cls)));
  // 길드 시설: 명성이 쌓이면 가장 싼 것부터
  for (let i = 0; i < 20; i++) { const ff2 = S.w.fantasy, k = Object.keys(G.D.FAC).sort((a, b) => GD.facCost(ff2, a) - GD.facCost(ff2, b))[0]; if (!GD.build(ff2, k)) break; }
  // 판타지: 초반엔 몬스터를 직접 친다
  const f = S.w.fantasy, rt = G.Fantasy.rt(f);
  if (S.runTime < 900 && rt.mons.length) { const m = rt.mons.find(o => G.Fantasy.inView(rt, o.x, o.y)); if (m) G.Fantasy.click(f, m.x, m.y); }
}

const marks = [1, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360].filter(m => m <= MIN);
const t0 = Date.now();
for (let t = 0; t < MIN * 60; t++) {
  G.tick(1, 0.1);
  bot();
  const m = (t + 1) / 60;
  if (marks.includes(m)) {
    const S = G.S, f = S.w.fantasy, U = G.U;
    console.log(`${String(m).padStart(3)}분 | 골드 ${U.fmt(f.gold).padStart(6)} 명성 ${f.fame || 0} | 던전 ${f.maxFloor}층`);
  }
}
console.log("용병 " + G.S.w.fantasy.mercs.map(m => `${G.Guild.def(m).n} ${m.lv}`).join(" · "));
console.log('재주 ' + G.S.w.fantasy.mercs.map(m => G.Feat.def(m)?.n).join(' · ') + ' | 시설 ' + JSON.stringify(G.S.w.fantasy.fac || {}) + ' | 단장 ' + G.Guild.def(G.Guild.leader(G.S.w.fantasy)).n + ' ' + G.Guild.lvText(G.Guild.leader(G.S.w.fantasy)) + ' | 임무 성공 ' + (G.S.w.fantasy.missions || 0));
{ const ff = G.S.w.fantasy, T = G.Trinket; console.log(`마법 물건 ${T.all(ff).length}개 (창고 ${T.store(ff).length}) · ` + T.all(ff).filter(t => t.on != null).map(t => T.name(t) + (T.def(t).fixed ? '' : '*')).join(' · ')); }
{ const ff = G.S.w.fantasy; console.log('관계 ' + G.Bond.pairs(ff, ff.mercs).map(p => `${p.a.name}-${p.b.name} ${p.r === 'friend' ? '전우' : '앙숙'}`).join(' · ')); }
console.log(`스킬 ${Object.keys(G.Sim.casts).length}종 ${Object.values(G.Sim.casts).reduce((a, b) => a + b, 0)}회`);
if (VERBOSE) console.log(JSON.stringify(G.Sim.casts));
{ const ff = G.S.w.fantasy; console.log(`이야기 일지 ${(ff.saga || []).length}줄 · 사망 ${(ff.fallen || []).length}명 · 흉터 ${G.Guild.crew(ff).reduce((a, m) => a + (m.scars || []).length, 0)} · 원한 ${(ff.grudges || []).length}`); if (VERBOSE) console.log((ff.saga || []).slice(0, 30).join ? (ff.saga || []).slice(0, 30).map(x => x.s).join('\n') : ''); }
console.log(`실행 ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (VERBOSE) console.log(logs.slice(-40).join('\n'));
