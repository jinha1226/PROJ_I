'use strict';
// 불러오기 목록(js/manifest.js)과 시험 도우미(test/_load.js): node test/manifest_rules.js
// 순서가 곧 의존 순서다 — 목록 순서는 정리 전(2026-11-17) index.html · run.html의 순서와 같아야 한다.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const base = p => p.split('/').pop();
const throws = f => { try { f(); return false; } catch (e) { return true; } };

// 정리 전 index.html · run.html에서 뽑아 굳힌 목록
const OLD_GAME = ['core', 'data', 'srd_gen', 'srd_base', 'srd_mons', 'grid', 'juice', 'old_stubs', 'fantasy', 'guild', 'create', 'dnd', 'fate', 'feats', 'trinkets', 'skills', 'srd', 'srd_spells', 'srd_upcast', 'spells', 'traits', 'options', 'pools', 'utilspell', 'srd_species', 'multiclass', 'srd_range', 'srd_items', 'items', 'skill_ai', 'team', 'camp', 'skill_fx', 'events', 'skill_nums', 'check', 'explore', 'sight', 'tactics', 'foe', 'summon', 'light', 'monact', 'actions', 'lore', 'region', 'mons_extra', 'res', 'turn', 'flow', 'story', 'state', 'feed', 'floor', 'noise', 'ground', 'prep', 'encounter', 'bridge']; // 2026-11-17 2단계: 옛 흐름 13개를 old로, check · old_stubs · mons_extra를 그 자리에
const OLD_ISO = ['core', 'models', 'bake', 'sprites', 'minidoll', 'ui', 'pmap', 'fight', 'crawl', 'boot', 'fxlayer', 'pfx', 'vfx', 'hdbg', 'dice', 'actors', 'props', 'main']; // 2026-11-17 2단계: 옛 화면(legacy/iso)을 빼고 game 자리에 app/* · app/boot, 끝에 app/main (2026-11-18: crawl을 ui · pmap · fight · crawl로 나눔)
const OLD_RUN = ['core', 'data', 'combat', 'gen', 'rules', 'layout', 'draw', 'ui'];

const M = require('../js/manifest.js'), L = require('./_load.js');

t('game 순서가 옛 index.html과 같다', eq(M.game.map(base), OLD_GAME), JSON.stringify(M.game.map(base)));
t('render 앞 넷은 artset · dcss map · pixelfx · paperdoll', eq(M.render.slice(0, 4).map(base), ['artset', 'map', 'pixelfx.bundle', 'paperdoll']));
t('render 나머지 순서 (그리기 → app/boot → 그리기 → app/main)', eq(M.render.slice(4).map(base), OLD_ISO));
t('explore 순서가 옛 run.html과 같다', eq(M.explore.map(base), OLD_RUN));
t('fixed는 render 앞 넷 (캐시를 쓰는 큰 정적 파일)', eq(M.fixed, M.render.slice(0, 4)));
t('unused는 sfx 하나', eq(M.unused.map(base), ['sfx']));

// 대소문자까지: 경로 조각마다 실제 디렉터리 항목과 맞춰 본다 (Pages는 대소문자를 가린다)
const existsExactCase = rel => { let dir = ROOT; const parts = (rel + '.js').split('/'); for (const p of parts) { if (!fs.existsSync(dir) || !fs.readdirSync(dir).includes(p)) return false; dir = path.join(dir, p); } return true; };
const all = [...M.game, ...M.render, ...M.explore, ...M.unused];
const missing = all.filter(p => !existsExactCase(p));
t('모든 경로의 파일이 대소문자까지 그대로 있다', missing.length === 0, missing.join(', '));
t('game 안 basename은 서로 다르다', new Set(M.game.map(base)).size === M.game.length);

t('group은 js/로 시작하는 것만', L.group('render').every(p => p.startsWith('js/')) && !L.group('render').some(p => p.startsWith('assets/')));
t('jsPath("dnd")는 game의 dnd', L.jsPath('dnd') === path.join(ROOT, M.game.find(p => base(p) === 'dnd') + '.js'));
t('jsPath("core")는 game의 core (iso · run의 core가 아님)', L.jsPath('core') === path.join(ROOT, M.game[0] + '.js'));
t('jsPath("iso/core")는 render의 core', L.jsPath('iso/core') === path.join(ROOT, M.render.find(p => p.endsWith('/core')) + '.js'));
t('jsPath("run/gen")은 explore의 gen', L.jsPath('run/gen') === path.join(ROOT, M.explore.find(p => p.endsWith('/gen')) + '.js'));
t('jsPath("sfx")는 unused의 sfx', L.jsPath('sfx') === path.join(ROOT, M.unused[0] + '.js'));
t('jsPath("legacy/create")는 legacy의 create', L.jsPath('legacy/create') === path.join(ROOT, 'js/legacy/create.js'), L.jsPath('legacy/create'));
t('jsPath("pixelfx/pixelfx.bundle")은 render의 묶음', L.jsPath('pixelfx/pixelfx.bundle') === path.join(ROOT, 'js/render/pixelfx/pixelfx.bundle.js'));
t('jsPath("core/sfx")는 unused의 sfx', (() => { try { return L.jsPath('core/sfx') === path.join(ROOT, 'js/core/sfx.js'); } catch (e) { return false; } })());
t('jsPath("render/core")는 render의 core', L.jsPath('render/core') === path.join(ROOT, 'js/render/core.js'));
t('jsPath 모르는 이름은 던진다', throws(() => L.jsPath('없는파일')));
t('NAMES.game은 옛 목록과 같다', eq(L.NAMES.game, OLD_GAME));

// load: 실제로 vm에 올려 G가 생기는지
const vm = require('vm'), ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
L.load(ctx);
t('load(ctx)로 G.Dnd · G.Fantasy가 생긴다', !!(ctx.G && ctx.G.Dnd && ctx.G.Fantasy));
const c2 = { console, Math, JSON }; vm.createContext(c2); L.load(c2, ['run/core', 'run/data']);
t('load(ctx, 이름 목록)도 된다', !!(c2.RUN && c2.RUN.CLS));

console.log(`manifest_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
