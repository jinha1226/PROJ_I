'use strict';
// 파일 위치 정리(2026-11-17) 뒤 옛 경로가 남지 않았는지: node test/path_rules.js
// 옛 최상위 js/<이름>.js · js/iso/ · js/run/ 경로가 생성 도구 · 시험 · 페이지 · 배포 워크플로에 남아 있으면 실패한다.
// (남아 있으면 생성 도구가 옛 자리에 새 파일을 만들고, 게임은 옮긴 파일을 계속 읽어 둘이 어긋난다.)
// 옛 경로 → 새 경로 표는 js/README.md.
const fs = require('fs'), path = require('path');
const INC = path.join(__dirname, '..'), REPO = path.join(INC, '..');
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 정리 전 inc/js/ 바로 아래에 있던 파일 (manifest.js 제외)
const MOVED = ['actions', 'artset', 'banter', 'bonds', 'camp', 'command', 'core', 'create', 'data', 'dnd', 'events', 'expedition', 'explore', 'fantasy', 'feats', 'flow', 'foe', 'grid', 'guild', 'items', 'juice', 'light', 'lines_danger', 'lore', 'mission', 'monact', 'multiclass', 'npc', 'options', 'paperdoll', 'persona', 'pools', 'region', 'report', 'res', 'scn_astral', 'season', 'sfx', 'sight', 'skill_ai', 'skill_fx', 'skill_nums', 'skills', 'spells', 'srd', 'srd_base', 'srd_gen', 'srd_items', 'srd_mons', 'srd_range', 'srd_species', 'srd_spells', 'srd_upcast', 'state', 'story', 'summon', 'tactics', 'team', 'traits', 'trinkets', 'turn', 'tut_map', 'tutorial', 'utilspell'];
const SELF = new Set(['path_rules.js']);
const SCAN = ['inc/tools', 'inc/test', 'inc/index.html', 'inc/run.html', 'inc/vfx.html', 'inc/px_lab.html', 'inc/parts.html', '.github/workflows/pages.yml'];
const files = [];
for (const s of SCAN) { const p = path.join(REPO, s); if (!fs.existsSync(p)) continue; if (fs.statSync(p).isDirectory()) { for (const f of fs.readdirSync(p)) if (!SELF.has(f) && /\.(js|py|html|yml)$/.test(f)) files.push(path.join(p, f)); } else files.push(p); }
const hits = re => { const out = []; for (const f of files) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (re.test(l)) out.push(`${path.relative(REPO, f)}:${i + 1}`); }); return out; };

// 앞에 / 또는 줄 처음 · 따옴표 · 공백이 오는 js/ (js/render/core.js 같은 새 경로의 일부가 아닌 것)
const h1 = hits(new RegExp(`(^|[\\s'"\`(/])js/(${MOVED.join('|')})\\.js`));
t('옛 js/<이름>.js 경로가 없다', h1.length === 0, h1.slice(0, 12).join(' '));
const h2 = hits(/(^|[\s'"`(/])js\/(iso|run)\//);
t('옛 js/iso/ · js/run/ 경로가 없다', h2.length === 0, h2.slice(0, 12).join(' '));
const top = fs.readdirSync(path.join(INC, 'js')).filter(f => /\.(js|md)$/.test(f)).sort();
t('js/ 바로 아래에는 manifest.js와 README.md만', eq(top, ['README.md', 'manifest.js']), top.join(' '));
t('js/iso · js/run 폴더가 없다', !fs.existsSync(path.join(INC, 'js', 'iso')) && !fs.existsSync(path.join(INC, 'js', 'run')));

console.log(`path_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
