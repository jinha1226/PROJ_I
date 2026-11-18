'use strict';
// 페이지 연기 시험: node test/page_smoke.js [--dump 페이지.html]
// inc/ 를 Node http로 임의 포트에 띄우고 헤드리스 크롬으로 페이지를 열어(--dump-dom) 표지를 확인한 뒤 서버를 닫는다.
// 시험이 안 덮는 것 — 페이지가 스크립트를 제 경로에서 불러오는가 — 을 본다. 서버가 받은 .js 요청 중 404가 있으면 실패.
// 크롬: 환경 변수 CHROME, 없으면 ~/.cache/ms-playwright/chromium_headless_shell-*/ 아래 chrome-headless-shell. 못 찾으면 건너뜀(종료 코드 0).
// BASE=https://.../inc 이면 로컬 서버 없이 그 주소를 본다(404 검사는 건너뜀).
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), { execFile } = require('child_process');
const ROOT = path.join(__dirname, '..'), BASE = process.env.BASE || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse()) {
    const stack = [path.join(base, d)];
    while (stack.length) { const p = stack.pop(); for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, e.name); if (e.isDirectory()) stack.push(q); else if (e.name === 'chrome-headless-shell') return q; } }
  }
  return null;
}

// 표지: dom 문자열(스크립트 본문은 뺀 것) → 실패 이유 목록 (빈 목록이면 통과). 표지는 2026-11-17 지금 상태의 dump에서 골랐다.
const count = (s, re) => (s.match(re) || []).length;
const strip = d => d.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
const game = (d, ents) => [
  !/data-floor="ready"/.test(d) && '층을 다 굽지 못했다 (data-floor)',
  !new RegExp(`data-ents="${ents}"`).test(d) && `인물 ${(d.match(/data-ents="(\d+)"/) || [])[1] ?? '?'}명 (${ents}명이어야)`,
  /data-err="/.test(d) && `JS 오류: ${(d.match(/data-err="([^"]*)"/) || [])[1]}`,
  /data-load-err="/.test(d) && `불러오기 오류: ${(d.match(/data-load-err="([^"]*)"/) || [])[1]}`,
  !/id="hud"/.test(d) && '화면 틀(위 바 · 파티 바)이 없다',
].filter(Boolean);
const PAGES = {
  // 새 게임 껍데기 (2026-11-17 2단계): 탐사 층은 혼자 시작(2026-11-18) · ?fight=test · ?scene=*는 파티 셋 + 적 셋 · 폰 크기 · DCSS 인형 모드
  'index.html': d => game(d, 1), // 탐사 층은 혼자 시작 (설계 5-13)
  // 시험 전투: 걸어 들어오는 동안 6명, 싸우는 중엔 살아 있는 적 + 아군(data-fight), 이기면 파티 셋
  'index.html?fight=test': d => { const f = d.match(/data-fight="\d+r:(\d+)foes:(\d+)ps"/); return game(d, /data-fights="1w"/.test(d) ? 3 : f ? +f[1] + +f[2] : 6); },
  'index.html?scene=door': d => game(d, 6),
  'index.html?scene=recruit': d => [...game(d, 6), !/id="reward"/.test(d) && '영입 창이 없다'].filter(Boolean), // 영입 시험: 후보 셋
  'index.html?scene=reward': d => [...game(d, 6), !/id="reward"/.test(d) && '보상 창이 없다'].filter(Boolean), // 보상 시험: 레벨업 · 3택1 · 기록 창 // 문 앞 준비 시험: 파티 셋 + 문 너머(안 보이는) 적 셋
  'index.html?art=dcss': d => game(d, 1),
  'index.html?phone=1': d => game(d, 1),
  'run.html': d => [
    count(d, /class="cand"/g) !== 5 && `후보 카드 ${count(d, /class="cand"/g)}장 (5장이어야)`,
  ].filter(Boolean),
  'px_lab.html': d => [
    !/id="flC"/.test(d) && '층 그림(flC)이 없다', // 2026-11-18: 던전 한 층 시험만 남김
    /불러오기 실패/.test(d) && '불러오기 실패 문구',
  ].filter(Boolean),
  'vfx.html': d => [
    count(d, /class="it( on)?"/g) < 1 && '목록 버튼이 없다',
  ].filter(Boolean),
};

// 요청 검사 (로컬 서버일 때만): 목록 파일은 ?v=로 매번 새로 받고(바뀌면 옛 경로로 404가 나지 않게),
// 큰 정적 파일 넷(artset · DCSS 지도 · pixelfx 묶음 · paperdoll)은 정리 전처럼 ?v 없이 받아 캐시를 쓴다.
const NOCACHE = ['/js/render/artset.js', '/assets/dcss/map.js', '/js/render/pixelfx/pixelfx.bundle.js', '/js/render/paperdoll.js'];
const REQS = {
  'index.html': urls => [
    urls.some(u => u.startsWith('/js/legacy/iso/')) && '옛 화면 파일(legacy/iso)을 불러온다',
    !urls.some(u => /^\/js\/manifest\.js\?v=/.test(u)) && '목록 파일(js/manifest.js)을 ?v= 없이 받는다',
    ...NOCACHE.filter(f => !urls.includes(f)).map(f => `${f}를 ?v 없이 받지 않는다`),
  ].filter(Boolean),
  'run.html': urls => [!urls.some(u => /^\/js\/manifest\.js\?v=/.test(u)) && '목록 파일(js/manifest.js)을 ?v= 없이 받는다'].filter(Boolean),
};

function serve() {
  const miss = [], seen = [];
  const srv = http.createServer((req, res) => {
    seen.push(req.url);
    const u = decodeURIComponent(req.url.split('?')[0]), p = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { if (u.endsWith('.js')) miss.push(u); res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ srv, miss, seen, url: `http://127.0.0.1:${srv.address().port}` })));
}
// 매 프레임 그리는 페이지(px_lab)에서 헤드리스 크롬이 가끔 가상 시간을 못 끝내고 멈춘다 — 45초에 끊고, 빈 DOM이면 한 번 더.
const dump1 = (chrome, url) => new Promise(ok => execFile(chrome, ['--no-sandbox', '--headless', '--disable-gpu', '--hide-scrollbars', `--window-size=${/phone=1/.test(url) ? '412,900' : '1100,900'}`, '--virtual-time-budget=8000', '--dump-dom', url],
  { maxBuffer: 64 << 20, timeout: 45000 }, (e, out) => ok(out || '')));
const dump = async (chrome, url) => (await dump1(chrome, url)) || (await dump1(chrome, url)) || dump1(chrome, url); // 전투 장면도 매 프레임 그린다 — 두 번까지 더

(async () => {
  const chrome = findChrome();
  if (!chrome) { console.log('page_smoke: 크롬을 못 찾아 건너뜀'); return; }
  const one = process.argv.includes('--dump') ? process.argv[process.argv.indexOf('--dump') + 1] : null;
  const s = BASE ? { url: BASE.replace(/\/$/, ''), miss: [], seen: [], srv: null } : await serve();
  let bad = 0;
  try {
    for (const page of one ? [one] : Object.keys(PAGES)) {
      const before = s.miss.length, seen0 = s.seen.length, d = await dump(chrome, `${s.url}/${page}`);
      if (one) { console.log(d); continue; }
      const why = PAGES[page](strip(d)), miss = s.miss.slice(before);
      if (miss.length) why.push(`404: ${miss.slice(0, 5).join(', ')}${miss.length > 5 ? ` 외 ${miss.length - 5}` : ''}`);
      if (!d) why.push('DOM을 받지 못했다');
      if (!BASE && REQS[page]) why.push(...REQS[page](s.seen.slice(seen0)));
      if (why.length) bad++;
      console.log(`${page.padEnd(12)} ${why.length ? '실패 — ' + why.join(' · ') : '통과'}`);
    }
  } finally { if (s.srv) s.srv.close(); }
  if (!one) console.log(`page_smoke: ${Object.keys(PAGES).length - bad}/${Object.keys(PAGES).length} 통과${BASE ? ` (${BASE})` : ''}`);
  process.exit(bad ? 1 : 0);
})();
