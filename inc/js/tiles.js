'use strict';
// 타일 그리기: DOM 아이콘, 겹친 인형, 타일 배경 장면, 캔버스용 이미지 캐시
// 타일 키는 G.TILESET(tools/build_tiles.js가 생성)에 있다. 없는 키는 글자(이모지)로 대신 그린다.
// 같은 키의 그림이 assets/art/에 있으면(G.ARTSET, tools/build_art.js가 생성) DCSS 타일 대신 그것을 쓴다.
// 인형(여러 타일을 겹친 캐릭터)도 인형 이름으로 된 그림이 있으면 그 한 장으로 바뀐다. 자세한 것은 ART.md.
G.T = {
  base: 'assets/tiles/',
  // 여러 타일을 겹친 인형. 순서대로 위에 그린다.
  DOLLS: {
    knight: ['d_base', 'd_boots', 'd_legs', 'd_plate', 'd_lsword', 'd_shield', 'd_helm'],
    w_wuxia: ['wb_human', 'wl_black', 'wc_china', 'wh_queue', 'ww_sword'],
    cultivator: ['wb_human', 'wl_white', 'qd_robe', 'qd_hair', 'qd_staff'],
  },
  has: k => !!(G.TILESET[k] || G.ARTSET[k] || G.T.DOLLS[k]),
  known: k => !!(G.TILESET[k] || G.ARTSET[k]),
  isArt: k => !!G.ARTSET[k],
  src(k, v = 0) {
    const a = G.ARTSET[k];
    if (a) return 'assets/art/' + (a > 1 ? `${k}_${((v % a) + a) % a}` : k) + '.png';
    const n = G.TILESET[k];
    if (!n) return null;
    return G.T.base + (n > 1 ? `${k}_${((v % n) + n) % n}` : k) + '.png';
  },
  count: k => G.ARTSET[k] || G.TILESET[k] || 0,
  // HTML 문자열 안에 넣을 작은 타일 (모달 본문 등)
  html(spec) {
    const L = G.T.layers(spec).filter(([k]) => G.T.known(k));
    return `<span class="tl-inline">${L.map(([k, v]) => `<img src="${G.T.src(k, v)}"${G.ARTSET[k] ? ' class="art"' : ''} alt="">`).join('')}</span>`;
  },
  layers(spec) {
    if (Array.isArray(spec)) return spec.flatMap(s => G.T.layers(s));
    if (G.T.DOLLS[spec] && !G.ARTSET[spec]) return G.T.DOLLS[spec].map(k => [k, 0]);
    if (typeof spec === 'object' && spec) return [[spec.k, spec.v || 0]];
    return [[spec, 0]];
  },
  // spec: '키' | ['키', ...](겹침) | {k, v} | 인형 이름. fallback은 타일이 없을 때 보일 글자.
  el(spec, cls = '', fallback = '') {
    const box = document.createElement('span');
    box.className = 'tl' + (cls ? ' ' + cls : '');
    G.T.set(box, spec, fallback);
    return box;
  },
  // 같은 상자의 그림을 바꾼다 (같으면 건드리지 않는다)
  set(box, spec, fallback = '') {
    const key = JSON.stringify(spec);
    if (box._spec === key) return;
    box._spec = key;
    box.innerHTML = '';
    const L = G.T.layers(spec).filter(([k]) => G.T.known(k));
    if (!L.length) { box.textContent = fallback; box.classList.add('txt'); return; }
    box.classList.remove('txt');
    for (const [k, v] of L) {
      const im = document.createElement('img');
      im.src = G.T.src(k, v);
      if (G.ARTSET[k]) im.className = 'art';
      im.draggable = false;
      im.alt = '';
      box.append(im);
    }
  },

  // ── 캔버스용 ──
  cache: {},
  image(k, v = 0) {
    const s = G.T.src(k, v);
    if (!s) return null;
    let im = G.T.cache[s];
    if (!im) { im = G.T.cache[s] = new Image(); im.src = s; }
    return im;
  },
  ready: im => im && im.complete && im.naturalWidth > 0,
  draw(ctx, k, v, x, y, w, h) {
    const im = G.T.image(k, v);
    if (G.T.ready(im)) ctx.drawImage(im, x, y, w, h || w);
  },
  // 위치에 따라 고정된 변형 번호 (바닥 무늬가 깜빡이지 않게)
  hash: (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0,

  // 타일 배경 장면: cols×rows, cell(x, y)가 그 칸에 겹쳐 그릴 키 목록을 준다.
  // 32px 원본 크기의 캔버스에 그리고 CSS로 확대한다(픽셀 그대로).
  scene(cols, rows, cell) {
    const wrap = document.createElement('div');
    wrap.className = 'scene';
    wrap.style.aspectRatio = `${cols} / ${rows}`;
    const cv = document.createElement('canvas');
    cv.width = cols * 32; cv.height = rows * 32;
    cv.className = 'scene-bg';
    wrap.append(cv);
    const ctx = cv.getContext('2d');
    let gen = 0;
    wrap.paint = (fn = cell) => {
      const my = ++gen;
      const jobs = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        for (const spec of fn(x, y) || []) {
          const [k, v] = Array.isArray(spec) ? spec : [spec, G.T.hash(x, y)];
          const im = G.T.image(k, v);
          if (im) jobs.push({ im, x, y });
        }
      }
      const draw = () => {
        if (my !== gen) return;
        ctx.clearRect(0, 0, cv.width, cv.height);
        for (const j of jobs) if (G.T.ready(j.im)) ctx.drawImage(j.im, j.x * 32, j.y * 32, 32, 32);
      };
      Promise.all(jobs.map(j => (j.im.complete ? null : new Promise(r => {
        j.im.addEventListener('load', r, { once: true });
        j.im.addEventListener('error', r, { once: true });
      })))).then(draw);
      draw();
    };
    // 장면 위의 그림(인형·몬스터). x, y, s는 칸 단위.
    wrap.sprite = (spec, x, y, s = 1, cls = '') => {
      const el = G.T.el(spec, 'sprite' + (cls ? ' ' + cls : ''));
      G.T.place(el, cols, rows, x, y, s);
      wrap.append(el);
      return el;
    };
    wrap.cols = cols; wrap.rows = rows;
    wrap.paint();
    return wrap;
  },
  place(el, cols, rows, x, y, s = 1) {
    el.style.left = (x / cols * 100) + '%';
    el.style.top = (y / rows * 100) + '%';
    el.style.width = (s / cols * 100) + '%';
    el.style.height = (s / rows * 100) + '%';
  },
};
