'use strict';
// 기술 이펙트: node test/fx_rules.js  (DESIGN.md 148). 전투에서 쓰는 모든 기술에 제 이펙트가 있고, 그 이펙트가 묶음에 들어 있다
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, GD = G.Guild, F = G.Fantasy, SK = G.Skill.SK, X = G.SkillFx, TB = X.TABLE;
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const entry = fs.readFileSync(path.join(__dirname, '..', 'js', 'iso', 'pixelfx', 'entry.js'), 'utf8'), bundled = new Set([...entry.matchAll(/"([a-z]+\/[a-z-]+)": m\d+/g)].map(m => m[1]));
const usable = Object.keys(SK).filter(k => SK[k].run || SK[k].rider);
// 빠짐없이
{ const miss = usable.filter(k => !TB[k]); t('쓰는 기술은 모두 표에 있다', !miss.length, miss.join(' ')); }
{ const ghost = Object.keys(TB).filter(k => !SK[k]); t('표에 없는 기술 이름이 없다', !ghost.length, ghost.join(' ')); }
for (const k in TB) { const e = TB[k]; if (!bundled.has(e.id)) t(`${k}: 이펙트 ${e.id} 묶음에 있음`, false); else ok++; if (e.mode === 'fly') t(`${k}: 터지는 이펙트 있음`, bundled.has(e.hit), e.hit); t(`${k}: 모양`, ['to', 'all', 'me', 'fly', 'dir'].includes(e.mode), e.mode); }
{ const s = fs.readFileSync(path.join(__dirname, '..', 'js', 'iso', 'pixelfx', 'pixelfx.bundle.js'), 'utf8'); for (const id of new Set(Object.values(TB).map(e => e.id))) if (!s.includes(`"${id}"`)) t(`묶음 빌드에 ${id}`, false); ok++; }
function setup() {
  G.newState(); G.quiet = false; const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = false; f.autoParty = false; L.lv = 9;
  const m = GD.make(f, 'archmage', { lv: 9 }); f.mercs.push(m); f.lineup = [m.uid]; F.syncAllies(f); f.floor = f.maxFloor = 5; f.checkpoint = f.start = 5; f.town = true; f.townT = 99; G.Exp.depart(f, F.rt(f));
  const rt = F.rt(f), r = rt.map.rooms.slice().sort((p, q) => q.w * q.h - p.w * p.h)[0], a = rt.party.find(p => p.merc === m); rt.mons = []; rt.seen.fill(1); a.x = r.cx; a.y = r.cy; rt.fx = [];
  F.spawnMon(rt, 5, { n: '산적', t: 'm_bandit', ty: 'humanoid' }, r.cx + 3, r.cy, false, { aggro: true, spotted: true, gold: 0 }); const o = rt.mons[rt.mons.length - 1]; o.hp = o.max = 9999;
  rt.turn = { map: rt.map, round: 1, order: [], i: 0, cur: a, ph: 'wait', t: 1, low: 1, downs: 0 };
  return { f, rt, a, o };
}
const castOf = rt => rt.fx.find(q => q.k === 'cast');
// 맞은 자리에 터지고, 공용 표시는 꺼진다
{ const { rt, a, o } = setup(); G.fx(rt, { k: 'beam', x: a.x, y: a.y, x2: o.x, y2: o.y, t: 1 }); const b = rt.fx[0]; G.fx(rt, { k: 'text', x: o.x, y: o.y, s: '12', t: 1 }); const tx = rt.fx[1]; G.fx(rt, { k: 'splat', x: o.x, y: o.y, t: 1 }); const sp = rt.fx[2]; X.cast(rt, a, 'sr_gbolt', [o], 0); const c = castOf(rt);
  t('cast가 생긴다', !!c); t('맞은 자리', c.pts[0][0] === o.x && c.pts[0][1] === o.y, JSON.stringify(c.pts)); t('공용 궤적은 끈다', b._own === 1); t('숫자는 그대로', !tx._own); t('피 튀김은 그대로', !sp._own); }
{ const { rt, a, o } = setup(); X.cast(rt, a, 'sr_bane_x', [o], 0); t('표에 없는 기술은 아무것도 안 남긴다', !castOf(rt)); }
{ const { rt, a, o } = setup(); X.cast(rt, a, 'sp_bane', [o], 0); t('흔적이 없으면 가장 가까운 적', castOf(rt).pts[0][0] === o.x); }
{ const { rt, a } = setup(); X.cast(rt, a, 'sr_cure', [], 0); t('치유에 적이 없으면 자기 자리', castOf(rt).pts[0][0] === a.x); }
{ const { rt, a, o } = setup(); for (let i = 0; i < 7; i++) G.fx(rt, { k: 'impact', x: o.x + i, y: o.y, t: 1 }); X.cast(rt, a, 'sr_sleep', [o], 0); t('여럿에게 거는 기술은 네 곳까지', castOf(rt).pts.length === 4, castOf(rt).pts.length); }
{ const { rt, a, o } = setup(); G.quiet = true; X.cast(rt, a, 'sr_gbolt', [o], 0); t('시뮬레이션 중엔 안 남긴다', !castOf(rt)); G.quiet = false; }
// 실제 차례
{ const { f, rt, a, o } = setup(); a.merc.skills = ['sr_firebolt']; const act0 = GD.active; GD.active = () => ['sr_firebolt']; G.Skill.tick(f, rt, a, 0, [o]); GD.active = act0; const c = castOf(rt); t('차례에 쓰면 cast', c && c.sk === 'sr_firebolt', rt.fx.map(q => q.k).join()); }
// 몬스터 원거리 공격: 같은 기술이면 같은 이펙트
{ const { rt, a, o } = setup(); rt.fx = []; t('이름으로 잇는다', X.foeSkill({ name: 'Hurl Flame', t: 'fire' }) === 'sr_firebolt'); t('이름이 달라도 피해 종류로', X.foeSkill({ name: 'Ember', t: 'fire' }) === 'sr_firebolt'); t('무기는 기술이 아니다', X.foeSkill({ name: 'Shortbow', t: 'piercing' }) === null);
  t('마법은 그 기술의 이펙트', X.foeShot(rt, o, a, { name: 'Force Bolt', t: 'force' }) && castOf(rt).sk === 'sr_mm' && castOf(rt).pts[0][0] === a.x); rt.fx = []; t('활은 화살', X.foeShot(rt, o, a, { name: 'Longbow', t: 'piercing' }) && rt.fx[0].key === 'fx_arrow'); rt.fx = []; t('바위는 원래 표시', !X.foeShot(rt, o, a, { name: 'Rock Launch', t: 'bludgeoning' }) && !rt.fx.length); }
{ const seen = new Set(); for (const s of Object.values(G.SRD_MON)) if (s.far) seen.add(s.far); for (const q of seen) { const k = X.foeSkill(q); if (k) t(`${q.name}: 표의 기술`, !!TB[k], k); else ok++; } }
{ const { rt, a, o } = setup(); o.stat = Object.values(G.SRD_MON).find(s => s.far && s.far.name === 'Hurl Flame'); if (o.stat) { o.kind = 'mon'; const r0 = G.Foe.ranged; G.Foe.ranged = () => true; rt.fx = []; G.Foe.shot(rt, o, a); G.Foe.ranged = r0; t('Foe.shot이 표로 간다', castOf(rt)?.sk === 'sr_firebolt' && !rt.fx.some(q => q.k === 'beam'), rt.fx.map(q => q.k).join()); } else t('시험 몬스터', false); }
{ const { rt, a, o } = setup(); X.play(rt, o, 'sr_hword', a); t('몬스터 치유는 받는 쪽에', castOf(rt).pts[0][0] === a.x); }
// 이펙트는 규칙에 끼어들지 않는다
{ const { rt, a, o } = setup(); const hp = o.hp, h = a.hp; X.cast(rt, a, 'sr_meteor', [o], 0); t('피해를 주지 않는다', o.hp === hp && a.hp === h); }
console.log(`fx_rules: 통과 ${ok} · 실패 ${bad}`);
if (bad) process.exitCode = 1;
