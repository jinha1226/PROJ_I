// 실행: 개발 서버(5199)를 켠 상태에서 playwright-core 가 있는 곳에서 node scripts/bake-sprites.cjs
// 스프라이트 굽기 실행: bake.html 을 열어 window.bakeAll() 결과를 public/sprites 로 저장
const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext()).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:5199/bake.html');
  await p.waitForFunction(() => window.bakeReady, null, { timeout: 60000 });
  const out = await p.evaluate(() => window.bakeAll());
  fs.mkdirSync('/mnt/d/PROJ_BH/public/sprites', { recursive: true });
  for (const o of out) {
    fs.writeFileSync(`/mnt/d/PROJ_BH/public/sprites/${o.id}.png`, Buffer.from(o.png.split(',')[1], 'base64'));
    fs.writeFileSync(`/mnt/d/PROJ_BH/public/sprites/${o.id}.json`, JSON.stringify(o.meta));
    console.log(o.id, o.meta.cols, 'x', o.meta.rows, Object.keys(o.meta.anims).join(','));
  }
  console.log(errs.slice(0, 5));
  await b.close();
})();
