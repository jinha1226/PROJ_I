'use strict';
// 타이틀 화면 (화면 쪽): 「ROLL FOR FATE」 — 선술집 위에 덮는다. 누르면 걷힌다.
// 배경은 따로 그린 그림이 아니라 게임의 내용물로 짠 장면이다: 보물 더미 위의 용(부위 인형)과 맞서는 파티(게임 안 픽셀 인형 — MD.pix).
// 로고는 5×7 픽셀 글자로 직접 찍는다 (게임 그림과 같은 결). 이 탭에서 한 번 봤으면 다시 띄우지 않는다 (판이 끝나 선술집으로 돌아올 때).
const TITLEUI = (() => {
  const { $ } = UI, SEEN = 'inc.title';
  const GL = { R: '11110,10001,10001,11110,10100,10010,10001', O: '01110,10001,10001,10001,10001,10001,01110', L: '10000,10000,10000,10000,10000,10000,11111', F: '11111,10000,10000,11110,10000,10000,10000',
    A: '01110,10001,10001,11111,10001,10001,10001', T: '11111,00100,00100,00100,00100,00100,00100', E: '11111,10000,10000,11110,10000,10000,11111', ' ': '000,000,000,000,000,000,000' };
  const widthOf = s => [...s].reduce((a, ch) => a + GL[ch].split(',')[0].length + 1, -1);
  // 글자를 px 크기의 네모로 찍는다. col(줄 0~6) = 그 줄의 색 · 아래 오른쪽에 그림자
  function text(x, s, x0, y0, px, col) {
    for (const pass of [1, 0]) { let cx = x0; for (const ch of s) { const rows = GL[ch].split(','); rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '1') { x.fillStyle = pass ? '#000' : col(j); x.fillRect(cx + i * px + (pass ? px * 0.6 : 0), y0 + j * px + (pass ? px * 0.6 : 0), px, px); } }); cx += (rows[0].length + 1) * px; } }
  }
  const seen = () => { try { return sessionStorage.getItem(SEEN) === '1'; } catch (e) { return false; } };
  function open(f, then) {
    if (seen()) return then && then();
    const box = document.createElement('div'); box.id = 'titlescreen'; box.innerHTML = '<canvas class="tt-wall"></canvas><canvas class="tt-logo"></canvas><div class="tt-menu"><button class="tt-go">선술집으로</button></div>';
    document.body.append(box);
    const wall = box.querySelector('.tt-wall'), wx = wall.getContext('2d'), logo = box.querySelector('.tt-logo'), lx = logo.getContext('2d');
    // 장면 (2026-11-19): 장르의 오래된 구도 — 보물 더미 위에서 날개를 펴고 일어선 용이 화면을 덮고, 불빛을 등진 작은 파티가 앞에서 맞선다.
    // 특정 그림을 따라 그리지 않는다 (구도 관습만). 용은 게임 안의 부위 인형(js/render/dragon.js)을 크게 구운 것, 파티는 게임 안 픽셀 인형(MD.pix)
    const CL = G.Party.CLASSES, party = ['dragoon', 'mage', 'cleric', 'rogue'].map(c => (CL.includes(c) ? c : CL[0])).map((c, i) => { const m = G.Guild.make(f, c, { lv: 1 }); m.lid = 't' + i + m.name; return m; });
    const bmp = new WeakMap(), bitmap = (sp, fx) => { const key = sp; let c = bmp.get(key); if (!c) { c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h; const px = fx ? fx(sp) : sp.px; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px.buffer.slice(0)), sp.w, sp.h), 0, 0); bmp.set(key, c); } return c; };
    // 불빛을 등진 몸: 어둡게 누르고, 불 쪽(오른쪽) 가장자리만 주황으로
    const rim = sp => { const o = new Uint32Array(sp.px.length), w = sp.w; for (let i = 0; i < o.length; i++) { const c = sp.px[i]; if (!c) continue; const x = i % w, edge = x === w - 1 || !sp.px[i + 1] || i < w || !sp.px[i - w]; /* 불 쪽(오른쪽) · 위 가장자리 */ o[i] = edge ? rgb(255, 150, 60) : rgb((c & 255) * .4 + 18, (c >> 8 & 255) * .3 + 12, (c >> 16 & 255) * .3 + 16); } return o; };
    let LW = 0, LH = 0, port = false, t = 0, drag = null, embers = [];
    const R = (a, b) => a + Math.random() * (b - a);
    function size() {
      // 세로 화면: 너비를 고정하고 위아래로 쌓는다 (위 로고 · 가운데 용 · 아래 파티 · 맨 아래 단추)
      port = innerWidth < innerHeight * .9;
      if (port) { LW = 180; LH = Math.round(LW * innerHeight / innerWidth); } else { LH = innerWidth < 700 ? 240 : 300; LW = Math.round(LH * innerWidth / innerHeight); }
      wall.width = LW; wall.height = LH;
      const dH = port ? Math.round(Math.min(LH * .4, LW * 1.15 / 1.6)) : Math.round(LH * .6); // 세로면 용 그림(너비 ≈ 1.6×높이)이 화면 너비를 조금 넘는 정도
      drag = typeof DRAGON !== 'undefined' ? DRAGON.bake(DRAGON.COLORS.red, { ...DRAGON.AGE.adult, H: dH }, 'w0', 0, 1) : null;
      embers = Array.from({ length: 70 }, () => ({ x: R(0, LW), y: R(0, LH), v: R(6, 22), p: R(0, 6) }));
      // 로고: 화면 너비에 맞춘 픽셀 크기
      const W = Math.min(innerWidth, 720), px = Math.max(3, Math.floor(W * 0.86 / widthOf('ROLL FOR'))), px2 = Math.round(px * 1.5);
      logo.width = W; logo.height = px * 7 + px2 * 7 + px * 5; lx.clearRect(0, 0, W, logo.height);
      text(lx, 'ROLL FOR', Math.round((W - widthOf('ROLL FOR') * px) / 2), px, px, () => '#efe6cf');
      text(lx, 'FATE', Math.round((W - widthOf('FATE') * px2) / 2), px * 10, px2, j => ['#ffe08a', '#ffd070', '#ffb84a', '#f59a36', '#e87a2a', '#d65c22', '#b8431c'][j]); // 운명은 불빛 색으로 (위는 밝고 아래는 짙다)
    }
    function paint() {
      const W = LW, H = LH, x = wx, fl = 1 + Math.sin(t * 2.3) * .04 + Math.sin(t * 5.1) * .02; x.imageSmoothingEnabled = false;
      const dx = Math.round(W * (port ? .56 : .62)), floorY = Math.round(H * (port ? .6 : .8)), gy = port && drag ? floorY - drag.h * .5 : H * .5, gr = (port ? W * 1.1 : H * .95) * fl, hw = W * (port ? .5 : .3), hh = H * (port ? .06 : .1);
      // 굴: 용 뒤의 불빛 → 가장자리는 어둠
      x.fillStyle = '#0b0706'; x.fillRect(0, 0, W, H);
      const g = x.createRadialGradient(dx, gy, 4, dx, gy, gr); g.addColorStop(0, '#ff9a3a'); g.addColorStop(.18, '#c4471e'); g.addColorStop(.45, '#4a160e'); g.addColorStop(1, 'rgba(11,7,6,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      // 굴 벽 · 종유석 (양옆 · 위의 들쭉날쭉한 그림자)
      x.fillStyle = '#0b0706'; x.beginPath(); x.moveTo(0, 0); for (let i = 0; i <= 24; i++) { const u = i / 24, yy = H * (.06 + .1 * Math.abs(Math.sin(u * 17.3))) * (1 - Math.sin(u * Math.PI) * .6); x.lineTo(u * W, yy); } x.lineTo(W, 0); x.fill();
      for (const side of [0, 1]) { x.beginPath(); x.moveTo(side * W, 0); for (let i = 0; i <= 16; i++) { const u = i / 16, ww = W * (.07 + .06 * Math.abs(Math.sin(u * 9.7 + side * 3))); x.lineTo(side ? W - ww : ww, u * H); } x.lineTo(side * W, H); x.fill(); }
      // 보물 더미: 용 발밑의 금 · 반짝이
      x.fillStyle = '#7a4a14'; x.beginPath(); x.ellipse(dx, floorY + 6, hw, hh, 0, Math.PI, 0); x.fill();
      x.fillStyle = '#d8a030'; x.beginPath(); x.ellipse(dx, floorY + 8, hw * .9, hh * .75, 0, Math.PI, 0); x.fill();
      for (let i = 0; i < 90; i++) { const a = (i * 2.399) % Math.PI, r = ((i * 37) % 100) / 100, px2 = dx + Math.cos(a) * hw * .87 * r, py = floorY + 8 - Math.sin(a) * hh * .7 * r; x.fillStyle = (i + Math.floor(t * 3)) % 9 ? '#f6d060' : '#fff6c8'; x.fillRect(px2 | 0, py | 0, 1, 1); }
      const fg = x.createLinearGradient(0, floorY + 8, 0, H); fg.addColorStop(0, '#3a1a0e'); fg.addColorStop(1, '#120a07'); x.fillStyle = fg; x.fillRect(0, floorY + 8, W, H); // 바닥: 불빛이 닿아 앞쪽 파티가 묻히지 않게
      // 용
      if (drag) x.drawImage(bitmap(drag), dx - (drag.w >> 1), floorY + 4 - drag.foot);
      // 불티: 아래에서 위로
      for (const e of embers) { const yy = (e.y - t * e.v) % H, y2 = yy < 0 ? yy + H : yy, xx = e.x + Math.sin(t + e.p) * 3; x.fillStyle = e.v > 16 ? '#ffd070' : '#f07a2a'; x.fillRect(xx | 0, y2 | 0, 1, 1); }
      // 파티: 앞쪽 아래, 용을 마주 본다 (인형은 왼쪽을 보므로 뒤집는다)
      const base = port ? Math.round(H * .83) : H - 6, step = port ? Math.round(W * .2) : Math.max(18, Math.round(W * .055)), x0 = Math.round(W * (port ? .08 : .14));
      party.forEach((m, i) => { const sp = typeof MD !== 'undefined' && MD.pix ? MD.pix(m, 0) : null; if (!sp) return; const c = bitmap(sp, rim), px2 = x0 + i * step - (i % 2) * 4, py = base - (i % 2) * 7;
        x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(px2 + sp.w / 2, py, sp.w * .32, 2, 0, 0, Math.PI * 2); x.fill(); // 발밑 그림자
        x.save(); x.translate(px2 + sp.w, py - sp.foot); x.scale(-1, 1); x.drawImage(c, 0, 0); x.restore(); });
      // 둘레를 어둡게 (로고 · 단추가 읽히게)
      const v = x.createLinearGradient(0, 0, 0, H); v.addColorStop(0, 'rgba(8,5,4,.75)'); v.addColorStop(.3, 'rgba(8,5,4,0)'); v.addColorStop(port ? .9 : .85, 'rgba(8,5,4,0)'); v.addColorStop(1, 'rgba(8,5,4,.6)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
    }
    size(); paint();
    const timer = setInterval(() => { if (!box.isConnected) return clearInterval(timer); t += 0.12; paint(); }, 120), onRz = () => { size(); paint(); };
    addEventListener('resize', onRz);
    box.querySelector('.tt-go').onclick = () => { try { sessionStorage.setItem(SEEN, '1'); } catch (e) { /* 기억 못 해도 된다 */ } clearInterval(timer); removeEventListener('resize', onRz); box.remove(); then && then(); };
  }
  return { open, get active() { return !!$('titlescreen'); } };
})();
