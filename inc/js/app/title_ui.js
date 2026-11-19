'use strict';
// 타이틀 화면 (화면 쪽): 「ROLL FOR FATE」 — 선술집 위에 덮는다. 누르면 걷힌다.
// 배경은 따로 그린 그림이 아니라 게임의 내용물이다: 모험가들의 초상(게임 안 픽셀 인형 — MD.pix)을 벽처럼 깔고 가운데로 갈수록 어둡게.
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
    // 벽에 걸 사람들: 열두 직업을 고루, 사람마다 다르게 생겼다
    const CL = G.Party.CLASSES, pool = Array.from({ length: 48 }, (_, i) => { const m = G.Guild.make(f, CL[i % CL.length], { lv: 1 }); m.lid = 'w' + i + m.name; return m; });
    const CELL = 40, bmp = new WeakMap(), bitmap = sp => { let c = bmp.get(sp); if (!c) { c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(sp.px.buffer.slice(0)), sp.w, sp.h), 0, 0); bmp.set(sp, c); } return c; };
    let cols = 0, rows = 0, order = [], t = 0;
    function size() {
      const k = innerWidth < 700 ? 2 : 2; cols = Math.ceil(innerWidth / k / CELL); rows = Math.ceil(innerHeight / k / CELL); wall.width = cols * CELL; wall.height = rows * CELL;
      order = Array.from({ length: cols * rows }, (_, i) => (i * 7 + ((i / cols) | 0) * 13) % pool.length);
      // 로고: 화면 너비에 맞춘 픽셀 크기
      const W = Math.min(innerWidth, 720), px = Math.max(3, Math.floor(W * 0.86 / widthOf('ROLL FOR'))), px2 = Math.round(px * 1.5);
      logo.width = W; logo.height = px * 7 + px2 * 7 + px * 5; lx.clearRect(0, 0, W, logo.height);
      text(lx, 'ROLL FOR', Math.round((W - widthOf('ROLL FOR') * px) / 2), px, px, () => '#efe6cf');
      text(lx, 'FATE', Math.round((W - widthOf('FATE') * px2) / 2), px * 10, px2, j => ['#ffe08a', '#ffd070', '#ffb84a', '#f59a36', '#e87a2a', '#d65c22', '#b8431c'][j]); // 운명은 불빛 색으로 (위는 밝고 아래는 짙다)
    }
    function paint() {
      wx.fillStyle = '#17110c'; wx.fillRect(0, 0, wall.width, wall.height); wx.imageSmoothingEnabled = false;
      for (let i = 0; i < cols * rows; i++) { const m = pool[order[i]], x = (i % cols) * CELL, y = ((i / cols) | 0) * CELL, sp = typeof MD !== 'undefined' && MD.pix ? MD.pix(m, t + i * 0.31) : null, col = (G.Guild.def(m) || {}).col || '#666';
        wx.fillStyle = '#0d0906'; wx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4); wx.strokeStyle = col; wx.globalAlpha = 0.5; wx.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5); wx.globalAlpha = 1;
        if (sp) wx.drawImage(bitmap(sp), x + Math.floor(CELL / 2 - sp.w / 2), y + CELL - 5 - sp.foot); }
      // 가운데로 갈수록 어둡게 (로고와 메뉴가 선다)
      const g = wx.createLinearGradient(0, 0, wall.width, 0); g.addColorStop(0, 'rgba(14,10,7,.1)'); g.addColorStop(0.24, 'rgba(14,10,7,.82)'); g.addColorStop(0.5, 'rgba(14,10,7,.97)'); g.addColorStop(0.76, 'rgba(14,10,7,.82)'); g.addColorStop(1, 'rgba(14,10,7,.1)');
      wx.fillStyle = g; wx.fillRect(0, 0, wall.width, wall.height);
    }
    size(); paint();
    const timer = setInterval(() => { if (!box.isConnected) return clearInterval(timer); t += 0.12; paint(); }, 120), onRz = () => { size(); paint(); };
    addEventListener('resize', onRz);
    box.querySelector('.tt-go').onclick = () => { try { sessionStorage.setItem(SEEN, '1'); } catch (e) { /* 기억 못 해도 된다 */ } clearInterval(timer); removeEventListener('resize', onRz); box.remove(); then && then(); };
  }
  return { open, get active() { return !!$('titlescreen'); } };
})();
