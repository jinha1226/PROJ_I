'use strict';
// 시험 도우미: js/manifest.js의 목록으로 코드를 vm에 올린다.
//   const L = require('./_load.js');
//   L.load(ctx)                       // game 묶음 전부 (옛 party_lab.js 목록과 같다)
//   L.load(ctx, ['run/core', 'dnd'])  // 이름이나 경로 목록
//   L.jsPath('dnd')                   // 파일의 절대 경로
const fs = require('fs'), vm = require('vm'), path = require('path');
const M = require('../js/manifest.js');
const ROOT = path.join(__dirname, '..');
const base = p => p.split('/').pop();
const group = name => M[name].filter(p => p.startsWith('js/'));
// 이름 → 경로: '/'가 없으면 game → render → unused 순서로 basename이 같은 첫 항목 ('core'는 game의 core).
// '/'가 있으면 ① 경로가 '/' + n 으로 끝나는 항목 (예: 'legacy/create' → js/legacy/create, 'legacy/iso/create' → js/legacy/iso/create)
// ② 없으면 옛 폴더 이름 iso · run을 새 폴더로 바꿔 다시 찾는다 (예: 'iso/core' → js/render/core, 'run/gen' → js/explore/gen).
const ALL = () => [...group('game'), ...group('render'), ...group('explore'), ...group('unused')];
const DIR_ALIAS = { iso: ['render', 'legacy/iso'], run: ['explore'] };
function rel(n) {
  if (n.startsWith('js/')) return n.replace(/\.js$/, '');
  if (n.includes('/')) {
    const exact = ALL().find(p => p.endsWith('/' + n)); if (exact) return exact;
    const [head, ...rest] = n.split('/');
    for (const d of DIR_ALIAS[head] || []) { const hit = ALL().find(p => p.endsWith('/' + d + '/' + rest.join('/'))); if (hit) return hit; }
  } else { const hit = [...group('game'), ...group('render'), ...group('unused')].find(p => base(p) === n); if (hit) return hit; }
  throw new Error('알 수 없는 파일: ' + n);
}
const jsPath = n => path.join(ROOT, rel(n) + '.js');
function load(ctx, names = group('game')) {
  for (const n of names) { const p = jsPath(n); vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: path.relative(ROOT, p) }); }
}
const NAMES = { game: group('game').map(base) };
module.exports = { group, jsPath, load, NAMES, ROOT };
