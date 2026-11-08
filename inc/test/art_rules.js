'use strict';
// 몬스터 그림: node test/art_rules.js. 표에 없는 이름은 사람 그림으로 나오므로 빠지면 실패한다
const fs = require('fs'), vm = require('vm'), path = require('path'), ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', n + '.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/dcss/map.js'), 'utf8'), ctx);
const G = ctx.G, F = G.D.F, M = G.DCSS.mon; let ok = 0, bad = 0; const t = (n, c, x = '') => { if (c) ok++; else { bad++; console.log('  실패:', n, x); } };
const HUMAN = new Set(['산적', '암살자']), art = n => F.mon[n]?.dl || M.find(x => n.includes(x[0]))?.[1]; // 그림: 몬스터 표의 dl이 먼저 (sprites.js dcssOf)
const names = [...Object.keys(F.mon), ...F.bosses.map(b => b.n), '미믹'];
const TY = {}; for (const m of JSON.parse(fs.readFileSync(path.join(ROOT, 'data/srd521/clean.json'), 'utf8')).Monsters) TY[m.index] = m;
for (const n of names) { const id = F.STAT[n]?.[0], s = G.SRD_MON[id]; t(n + ': 능력치표', !!s, id); if (s) { t(n + ': 표 밖의 공격 없음', !F.STAT[n][1], id); const fs0 = F.mon[n]?.ty; if (fs0 && !['각성한 나무', '보라 버섯', '거대 쥐', '스터지', '도깨비불', '거대 거미', '유령', '도플갱어', '로크', '가고일', '움직이는 갑옷', '공기 정령', '대지 정령', '좀비'].includes(n)) t(n + ': 종류가 원문과 같다', fs0 === (TY[id]?.type ?? s.ty), fs0 + ' ' + (TY[id]?.type ?? s.ty)); const q = G.Foe.stat({ n, ...F.mon[n] }); t(n + ': 원거리 역할은 원거리 공격이 있을 때만', !G.Foe.ROLES?.[q.role]?.range || !!s.far); } }
for (const n of names) { const a = art(n); t(n + ': 표에 있다', !!a); if (a) { t(n + ': 사람이 아니다', a !== 'm_human' || HUMAN.has(n), a); t(n + ': 그림 파일', fs.existsSync(path.join(ROOT, 'assets/dcss', a + '.png')), a); } }
for (const [n, a] of [['거대 쥐', 'm_rat'], ['워그', 'm_warg'], ['트롤', 'm_troll'], ['거대 악어', 'm_alligator'], ['악어', 'm_crocodile'], ['유령', 'm_ghost']]) t(n + ' = ' + a, art(n) === a, art(n));
console.log(`art_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
