'use strict';
// 5e-bits 데이터 + 원문 PDF로 고친 값 = data/srd521/clean.json : node test/gen_srd_clean.js (DESIGN.md 108)
const fs = require('fs'), path = require('path'), D = path.join(__dirname, '..', 'data', 'srd521'), out = {};
for (const f of fs.readdirSync(D)) { const m = /^5e-SRD-(.+)\.json$/.exec(f); if (m) out[m[1]] = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); }
let n = 0; for (const p of JSON.parse(fs.readFileSync(path.join(D, 'PATCHES.json'), 'utf8'))) {
  const e = out[p.file].find(q => q.index === p.index); if (!e) throw new Error('없음 ' + p.index);
  if (p.set) Object.assign(e, p.set); if (p.path) { let o = e; for (const k of p.path.slice(0, -1)) o = o[k]; o[p.path.at(-1)] = p.value; }
  if (p.skillAdd || p.skillDel) { const ch = e.proficiency_choices.find(q => JSON.stringify(q).includes('skill-')), L = ch.from.options; if (p.skillDel) ch.from.options = L.filter(o => o.item?.index !== 'skill-' + p.skillDel); if (p.skillAdd) L.push({ option_type: 'reference', item: { index: 'skill-' + p.skillAdd, name: 'Skill: ' + p.skillAdd[0].toUpperCase() + p.skillAdd.slice(1), url: '/api/2024/proficiencies/skill-' + p.skillAdd } }); }
  n++;
}
fs.writeFileSync(path.join(D, 'clean.json'), JSON.stringify(out)); console.log(`고침 ${n} · ${Object.keys(out).length}개 표`);
