// js/srd_range.js 생성: 표는 PDF에서 뽑은 db의 값 그대로 (1칸 = 5피트). 게임 칸은 cells()가 K배로 줄인다
const fs = require('fs'), path = require('path'), vm = require('vm'), ROOT = path.join(__dirname, '..');
const db = f => { const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/srd521/db', f + '.json'), 'utf8')); return Array.isArray(d) ? d : Object.values(d); };
const norm = s => s.toLowerCase().replace(/’/g, "'");
const spell = {}, selfOnly = [];
for (const s of db('spell')) {
  const r = s.range || '', k = norm(s.name); let m;
  if ((m = /(\d+) feet/.exec(r))) spell[k] = +m[1] / 5;
  else if (/Touch/.test(r)) spell[k] = 1.5;
  else if (/mile|Sight|Unlimited/.test(r)) spell[k] = 999;
  else if (/^Self/.test(r)) { m = /(\d+)-foot(?:-long|-radius|-wide)?[ ,-]/.exec((s.text || '').replace(/Light in a \d+-foot radius/g, '')); if (m && /Cone|Line|Emanation|Sphere|Cube|Cylinder|radius/.test((s.text || '').replace(/Light in a \d+-foot radius/g, '').slice(m.index, m.index + 60))) spell[k] = Math.max(+m[1] / 5, 1.5); else selfOnly.push(s.name); }
}
spell['gust of wind'] = 12; // 원문이 「60 feet long」 선
spell['produce flame'] = 12; // 던지는 거리 60피트
spell['flame blade'] = 1.5; // 근접 주문 공격
const ctx = { console }; ctx.G = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/srd_mons.js'), 'utf8'), ctx);
const MDB = {}; for (const m of db('monster')) MDB[norm(m.name).replace(/[^a-z]/g, '')] = m;
const mon = {};
for (const id in ctx.G.SRD_MON) {
  const s = ctx.G.SRD_MON[id], q = MDB[norm(s.n || id).replace(/[^a-z]/g, '')]; if (!q) { console.log('db 없음', id); continue; }
  const lines = (q.actions || '').replace(/\n(?=[a-z0-9])/g, ' ').split('\n'), of = n => lines.find(l => l.startsWith(n)) || '';
  const reach = Math.max(1, ...(s.melee || []).map(a => { const x = /reach\s+(\d+) ft/.exec(of(a.name)); return x ? +x[1] / 5 : 1; }));
  const fa = s.spell || s.far, x = fa ? /range\s+(\d+)(?:\/(\d+))? ft/.exec(of(fa.name)) : null, o = { reach };
  if (x) o.far = [+x[1] / 5, +(x[2] || x[1]) / 5];
  mon[id] = o;
}
const basic = { cleric: 'sacred flame', bard: 'vicious mockery', mage: 'fire bolt', archmage: 'ray of frost', scout: 'produce flame', warlock: 'eldritch blast' }; for (const c in basic) basic[c] = spell[basic[c]];
// 주문이 아닌 기능의 사거리 (class_feature.json 원문)
const feature = { "bardic inspiration": 12, 'abjure foes': 12, "land's aid": 12, "nature's sanctuary": 24, 'turn undead': 6, 'preserve life': 6 };
const code = `// 생성: test/gen_srd_range.js — 손으로 고치지 말 것. 표는 SRD 칸(5피트), 게임 칸은 cells()
(() => {
  const T = G.SRD_RANGE = ${JSON.stringify({ spell, feature, basic, mon })};
  const norm = s => s.toLowerCase().replace(/’/g, "'");
  // 사거리 비율: 접촉 · 옆 칸은 그대로, 원거리는 근접과 구분되게 최소 2칸, 시야 주문은 그대로
  T.K = 0.5;
  T.cells = c => (c >= 999 || c <= 1.5 ? c : Math.max(2, Math.floor(c * T.K + 0.5)));
  for (const k in G.D.MSKILLS) { const en = norm(G.D.MSKILLS[k].en || ''), r = T.spell[en] ?? T.feature[en]; if (r != null) G.D.SK_RANGE[k] = T.cells(r); }
})();
`;
fs.writeFileSync(path.join(ROOT, 'js/srd_range.js'), code);
console.log('주문', Object.keys(spell).length, '자신만', selfOnly.length, '몬스터', Object.keys(mon).length, 'far 없음', Object.entries(mon).filter(([i, o]) => (ctx.G.SRD_MON[i].far || ctx.G.SRD_MON[i].spell) && !o.far).map(e => e[0]).join());
console.log(selfOnly.join(', '));
