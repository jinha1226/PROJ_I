// DCSS 타일 복사: node tools/build_tiles.js [rltiles 경로]
// tilemap.js에 적힌 원본을 assets/tiles/<키>[_n].png로 복사하고 js/tileset.js(키 → 변형 개수)를 만든다.
const fs = require('fs');
const path = require('path');
const SRC = process.argv[2] || '/mnt/d/PROJ_D/crawl/crawl-ref/source/rltiles';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'tiles');
const MAP = require('./tilemap');

function walk(dir, base, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), rel, acc);
    else if (e.name.endsWith('.png')) acc.push(rel);
  }
  return acc;
}

const all = ['dngn', 'mon', 'item', 'player', 'gui', 'effect'].flatMap(d => walk(path.join(SRC, d), d, []));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
let missing = 0, files = 0;
for (const [key, pats] of Object.entries(MAP)) {
  const hits = [];
  for (const p of pats) {
    const re = new RegExp('^' + p + '\\.png$');
    const found = all.filter(f => re.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    if (!found.length) { console.log('없음:', key, p); missing++; }
    hits.push(...found);
  }
  if (!hits.length) continue;
  hits.forEach((f, i) => {
    fs.copyFileSync(path.join(SRC, f), path.join(OUT, hits.length > 1 ? `${key}_${i}.png` : `${key}.png`));
    files++;
  });
  manifest[key] = hits.length;
}
fs.copyFileSync(path.join(SRC, 'license.txt'), path.join(OUT, 'LICENSE-rltiles.txt'));
fs.writeFileSync(path.join(ROOT, 'js', 'tileset.js'),
  "'use strict';\n// 자동 생성 (tools/build_tiles.js). 키 → 변형 개수. 타일: Dungeon Crawl Stone Soup rltiles (CC0)\n" +
  'G.TILESET = ' + JSON.stringify(manifest) + ';\n');
console.log(`타일 ${Object.keys(manifest).length}종, 파일 ${files}개 복사` + (missing ? `, 없음 ${missing}` : ''));
if (missing) process.exit(1);
