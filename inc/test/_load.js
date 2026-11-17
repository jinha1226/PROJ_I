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
// 'iso/core' · 'run/gen'처럼 '/'가 있으면 render · explore · game에서 끝부분이 같은 항목.
function rel(n) {
  if (n.startsWith('js/')) return n.replace(/\.js$/, '');
  if (n.includes('/')) { const tail = '/' + n.split('/').pop(), dir = n.split('/').slice(-2, -1)[0];
    const hit = [...group('render'), ...group('explore'), ...group('game')].find(p => p.endsWith(tail) && (p.includes('/' + dir + '/') || DIR_ALIAS[dir]?.some(d => p.includes('/' + d + '/'))));
    if (hit) return hit; }
  else { const hit = [...group('game'), ...group('render'), ...group('unused')].find(p => base(p) === n); if (hit) return hit; }
  throw new Error('알 수 없는 파일: ' + n);
}
// 옛 폴더 이름(iso · run)으로도 찾을 수 있게 — 폴더를 옮긴 뒤에도 시험이 옛 이름을 쓸 수 있다
const DIR_ALIAS = { iso: ['render', 'legacy/iso', 'iso'], run: ['explore', 'run'] };
const jsPath = n => path.join(ROOT, rel(n) + '.js');
function load(ctx, names = group('game')) {
  for (const n of names) { const p = jsPath(n); vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: path.relative(ROOT, p) }); }
}
const NAMES = { game: group('game').map(base) };
module.exports = { group, jsPath, load, NAMES, ROOT };
