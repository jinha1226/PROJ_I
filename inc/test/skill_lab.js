'use strict';
// 스킬 전수 시험: node test/skill_lab.js [횟수]  → 스킬마다 같은 전투 상황에서 실제 G.Skill.tick으로 발동해 본다.
// 잡는 것: 오류 · 발동 안 됨 · 효과 없음 · 표시 없음 · 사거리를 넘은 피해. 피해는 그 시전자의 기본 공격력 대비 배수.
const fs = require('fs'), vm = require('vm'), path = require('path');
const N = +process.argv[2] || 30;
const M = Object.create(Math); let s0 = 12345;
M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of ['core', 'data', 'srd_mons', 'grid', 'juice', 'tree', 'trees', 'season', 'fantasy', 'rivals', 'guild', 'persona', 'dnd', 'feats', 'trinkets', 'bonds', 'report', 'skills', 'srd', 'srd_spells', 'spells', 'traits', 'options', 'pools', 'combo', 'events', 'command', 'expedition', 'mission', 'explore', 'banter', 'sight', 'tactics', 'foe', 'region', 'res', 'turn', 'flow', 'story', 'state'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, D = G.D, GD = G.Guild, F = G.Fantasy, LV = 20;
const IGNORE = new Set(['hp', 'x', 'y', 'moving', 'atkT', 'gcd', 'cds', 'lastSk', 'flip', 'merc', 'def', 'dots_']);
const sig = e => { const o = {}; for (const k of Object.keys(e)) { if (IGNORE.has(k) || k.startsWith('_')) continue; const v = e[k]; if (v == null || v === false || v === 0) continue; if (typeof v === 'object') { try { const j = JSON.stringify(v, (kk, vv) => (typeof vv === 'object' && vv && (vv.merc || vv.kind) ? '#' : typeof vv === 'number' ? 1 : vv)); o[k] = j.length > 300 ? j.slice(0, 300) : j; } catch (x) { o[k] = '?'; } } else if (typeof v !== 'function') o[k] = typeof v === 'number' ? 1 : v; } return o; };
const classOf = k => { const L0 = D.MSKILLS[k]?.lv; if (L0 && typeof L0 === 'object' && /^(iv_|mm_|fs_)/.test(k)) return Object.keys(L0)[0]; for (const c in D.MPOOL) if (D.MPOOL[c].includes(k)) return c; for (const a in D.ADV) if (D.ADV[a].sig.includes(k)) return D.ADV[a].base; return null; };
function fixture(cls) {
  G.newState();
  const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = false; L.lv = LV; f.autoParty = false;
  const caster = GD.make(f, cls, { lv: LV }); f.mercs.push(caster);
  const a2 = GD.make(f, cls === 'cleric' ? 'bard' : 'cleric', { lv: LV }), a3 = GD.make(f, cls === 'dragoon' ? 'paladin' : 'dragoon', { lv: LV }); f.mercs.push(a2, a3);
  f.lineup = [caster.uid, a2.uid, a3.uid];
  F.syncAllies(f);
  f.floor = f.maxFloor = 6; f.checkpoint = f.start = 6; f.town = true; f.townT = 99;
  G.Exp.depart(f, F.rt(f));
  const rt = F.rt(f), m = rt.map;
  // 빈 칸이 가장 넓은 방에 세운다
  const open = (x, y) => m.c[y * m.w + x] === '.';
  let best = null, bs = -1;
  for (const r of m.rooms) { let n = 0; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (open(x, y)) n++; if (n > bs) { bs = n; best = r; } }
  const cells = []; for (let y = best.y; y < best.y + best.h; y++) for (let x = best.x; x < best.x + best.w; x++) if (open(x, y)) cells.push([x, y]);
  const cx = best.cx, cy = best.cy, take = d => { let b = null, bd = 1e9; for (const c of cells) { const dd = Math.abs(Math.hypot(c[0] - cx, c[1] - cy) - d); if (dd < bd) { bd = dd; b = c; } } cells.splice(cells.indexOf(b), 1); return b; };
  rt.mons = []; rt.chests = []; rt.seen.fill(1);
  const a = rt.party.find(p => p.merc === caster), others = rt.party.filter(p => p !== a);
  const [ax, ay] = take(0); a.x = ax; a.y = ay;
  others.forEach((p, i) => { const c = take(1 + i); p.x = c[0]; p.y = c[1]; });
  others[0].hp = others[0].max * 0.3; a.hp = a.max * 0.3;
  const band = D.F.bands[F.band(6)].mons;
  [1, 1.5, 3, 4, 6].forEach((d, i) => { const c = take(d), def = i === 3 ? { n: '해골', t: 'm_skel', ty: 'undead' } : i === 2 ? { n: '산적', t: 'm_bandit', ty: 'humanoid' } : band[i % band.length]; const o = F.spawnMon(rt, 6, def, c[0], c[1], false, { aggro: true, major: true, spotted: true }); o.hp = o.max = 1e12; });
  F.refreshEnts(rt);
  rt.turn = { map: m, round: 1, order: [], i: 0, cur: a, ph: 'wait', t: 1, low: 1, downs: 0 };
  return { f, rt, a, others, m };
}
const keys = Object.keys(G.Skill.SK), rows = [];
const active = GD.active, hurt = F.hurt;
for (const k of keys) {
  const cls = classOf(k) || 'archmage', R = { k, n: D.MSKILLS[k]?.n, cls, range: D.SK_RANGE[k], fired: 0, err: new Map(), dmg: 0, far: 0, heal: 0, state: new Set(), fx: new Set() };
  for (let t = 0; t < N; t++) {
    let X; try { X = fixture(cls); } catch (e) { R.err.set('준비: ' + e.message, 1); continue; }
    const { f, rt, a, others } = X;
    if (k === 'sr_revive') { others[1].dead = true; others[1].reviveT = 1e9; others[1].dying = { ok: 0, no: 0, by: null }; others[1].hp = 0; }
    GD.active = () => [k];
    const atk = F.allyAtk(f, a) || 1, all = rt.party.concat(rt.mons), before = all.map(e => [e, sig(e)]), hp0 = rt.party.map(p => [p, p.hp]); let dmg = 0, far = 0; const ax0 = a.x, ay0 = a.y, fields0 = rt.fields.length;
    F.hurt = function (ff, r, m, d, src, from) { if (from === a) { dmg += d; far = Math.max(far, Math.hypot(m.x - a.x, m.y - a.y)); } return hurt.apply(this, arguments); };
    rt.fx.length = 0;
    try {
      a.gcd = 0; a.cds = {}; a.lastSk = null;
      const seen = rt.mons.filter(o => F.inView(rt, o.x, o.y) && F.sees(rt.map, a, o));
      { a.lastBonus = null; a.freeDone = null; a.lastHitSk = null; a.slotUsed = false;
        if (k === 'sr_brutal') G.Dnd.buff(a, 'reckless', 10, { adv: 1, hitAdv: 1 }); // 무모한 공격 뒤에만 쓴다
        G.Skill.tick(f, rt, a, 0, seen, 'free'); G.Skill.tick(f, rt, a, 0, seen); G.Skill.tick(f, rt, a, 0, seen, true);
        if (G.Skill.SK[k]?.rider && seen.length) { const t0 = rt.turn; rt.turn = t0 || { round: 1 }; const c0 = rt.turn.cur; rt.turn.cur = a; a.lastBonus = null; a.slotUsed = false; G.Skill.onHit(f, rt, a, seen[0]); rt.turn.cur = c0; rt.turn = t0; } }
      if ((a.lastSk === k || a.lastBonus === k || a.lastHitSk === k || a.freeDone?.[k])) {
        R.fired++;
        // 몇 초 이어지는 기술 (c.pe): 8초를 돌린다
        for (let s = 0; s < 80 && G.Skill.persist; s++) G.Skill.persist(f, rt, a, 0.1);
      }
    } catch (e) { const key = e.message.slice(0, 70); R.err.set(key, (R.err.get(key) || 0) + 1); }
    GD.active = active; F.hurt = hurt;
    if (a.lastSk !== k && a.lastBonus !== k && a.lastHitSk !== k && !a.freeDone?.[k]) continue;
    R.dmg += dmg / atk; R.far = Math.max(R.far, far);
    for (const [p, h] of hp0) if (p.hp > h) R.heal += (p.hp - h) / p.max;
    for (const [e, s] of before) { const n = sig(e); for (const q of new Set([...Object.keys(s), ...Object.keys(n)])) if (s[q] !== n[q]) R.state.add(q); }
    if (Math.hypot(a.x - ax0, a.y - ay0)) R.state.add('이동');
    if (rt.fields.length > fields0) R.state.add('바닥효과');
    for (const o of rt.fx) R.fx.add(o.k);
  }
  rows.push(R);
}
const SHOWN = new Set(['text', 'proj', 'tile', 'ring', 'beam', 'chain', 'slash', 'impact', 'splat', 'bolt']);
const flag = R => { const out = []; if (R.err.size) out.push('오류'); if (!R.fired) out.push('발동안됨'); else { if (!R.dmg && !R.heal && !R.state.size) out.push('효과없음'); if (!R.fx.size) out.push('표시없음'); const un = [...R.fx].filter(x => !SHOWN.has(x)); if (un.length) out.push('화면에 안 그려지는 효과:' + un.join('/')); if (R.range != null && R.far > Math.max(R.range + 3, 4) + 0.01) out.push('사거리초과'); } return out; };
for (const R of rows.sort((a, b) => (b.dmg / (b.fired || 1)) - (a.dmg / (a.fired || 1)))) {
  const fl = flag(R);
  console.log([R.k.padEnd(13), (R.n || '').padEnd(10), R.cls.padEnd(9), 'R' + String(R.range ?? '-').padEnd(4), `발동${R.fired}/${N}`.padEnd(9), `피해x${(R.dmg / (R.fired || 1)).toFixed(1)}`.padEnd(10), `치유${Math.round(R.heal / (R.fired || 1) * 100)}%`.padEnd(8), `최대${R.far.toFixed(1)}`.padEnd(8), [...R.state].slice(0, 5).join(','), '|', [...R.fx].join(','), fl.length ? '  ✗ ' + fl.join(' ') : '', R.err.size ? JSON.stringify([...R.err.keys()]) : ''].join(' '));
}
// 패시브: 코드 어디서도 읽지 않는 것
const src = fs.readdirSync(path.join(__dirname, '..', 'js')).filter(n => n !== 'data.js' && n.endsWith('.js')).map(n => fs.readFileSync(path.join(__dirname, '..', 'js', n), 'utf8')).join('\n'), dataSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
const pas = Object.keys(D.MSKILLS).filter(k => D.MSKILLS[k].passive), deadP = pas.filter(k => !src.includes("'" + k + "'"));
const unlisted = (Object.keys(D.MSKILLS).filter(k => !G.Skill.SK[k] && !D.MSKILLS[k].passive)).filter(k => !D.MSKILLS[k].explore);
const bad = rows.filter(R => flag(R).length);
console.log(`\n액티브 ${rows.length} · 문제 ${bad.length} · 패시브 ${pas.length} (아무도 안 읽음 ${deadP.length}: ${deadP.join(' ')}) · 효과 코드 없는 액티브 ${unlisted.length}: ${unlisted.join(' ')}`);
