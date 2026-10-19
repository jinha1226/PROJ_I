// 생성 그림 등록: node tools/build_art.js
// assets/art/<키>.png 또는 <키>_<n>.png(변형)를 찾아 js/artset.js(키 → 변형 개수)를 만든다.
// 같은 키의 DCSS 타일보다 우선한다. 크기·투명 배경을 간단히 검사해 경고한다.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'art');
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'MANIFEST.json'), 'utf8'));
const known = new Map(manifest.assets.map(a => [a.key, a]));

// PNG 헤더에서 너비·높이·색 형식(알파 여부)을 읽는다
function pngInfo(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 6 || b[25] === 4 };
}

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.png')) : [];
const set = {}, warn = [];
for (const f of files) {
  const base = f.slice(0, -4);
  // 키 자체가 _숫자로 끝날 수 있다(o_0 등): 이름 전체가 아는 키면 그것, 아니면 끝의 _n을 변형 번호로 본다
  let key = base, n = null;
  if (!known.has(base)) { const m = base.match(/^(.+)_(\d+)$/); if (m && known.has(m[1])) { key = m[1]; n = +m[2]; } }
  const a = known.get(key);
  if (!a) { warn.push(`${f}: MANIFEST에 없는 키`); continue; }
  const info = pngInfo(path.join(DIR, f));
  if (!info) { warn.push(`${f}: PNG가 아니다`); continue; }
  if (info.w !== info.h) warn.push(`${f}: 정사각형이 아니다 (${info.w}×${info.h})`);
  if (info.w < 64) warn.push(`${f}: 너무 작다 (${info.w}px, 권장 ${a.size}px)`);
  if (a.transparent && !info.alpha) warn.push(`${f}: 투명 배경이어야 한다`);
  set[key] = Math.max(set[key] || 0, n == null ? 1 : n + 1);
}
// 변형 번호가 빠짐없이 0부터 있는지
for (const [k, c] of Object.entries(set)) {
  if (c > 1) for (let i = 0; i < c; i++) if (!fs.existsSync(path.join(DIR, `${k}_${i}.png`))) warn.push(`${k}_${i}.png 가 빠졌다 (변형은 0부터 연속)`);
}
fs.writeFileSync(path.join(ROOT, 'js', 'artset.js'),
  "'use strict';\n// 자동 생성 (tools/build_art.js). assets/art/의 그림: 키 → 변형 개수. 비어 있으면 모두 DCSS 타일을 쓴다.\n" +
  'G.ARTSET = ' + JSON.stringify(set) + ';\n');
for (const w of warn) console.log('경고:', w);
const done = Object.keys(set).length, total = manifest.assets.length;
const byPri = p => manifest.assets.filter(a => a.priority === p);
console.log(`그림 ${done} / ${total}종 등록` + [1, 2, 3, 4].map(p => ` · P${p} ${byPri(p).filter(a => set[a.key]).length}/${byPri(p).length}`).join(''));
