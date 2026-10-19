'use strict';
// 2D 타일 맵 그리기. 세계 로직의 view()가 주는 { map, terrain(x,y), ents, fx, cam|fit, tint, labels }를 캔버스에 그린다.
// 좌표: 엔티티 x, y는 칸 좌표(정수 = 칸 중심). 지형은 32px 원본 크기로 한 번 그려 두고 확대해서 찍는다(픽셀 그대로).
// 로직은 10Hz라 엔티티 위치를 그릴 때 부드럽게 따라가게(_rx, _ry) 한다. 손맛 효과(G.J)는 세계 id로 찾는다.
G.MapView = function (canvas) {
  const ctx = canvas.getContext('2d');
  const TSRC = 32;
  let W = 0, H = 0, TS = 32, ox = 0, oy = 0, lastT = 0;
  const cam = { x: 0, y: 0, ok: false };

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width || !r.height) return false;
    if (r.width !== W || r.height !== H || canvas.width !== Math.round(r.width * dpr)) {
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return true;
  }
  // 지형 캐시: 타일이 다 불러와질 때까지 다시 그린다
  function background(view) {
    const m = view.map;
    if (m._bg && m._bgVer === m.ver && m._bgReady) return m._bg;
    const cv = m._bg || document.createElement('canvas');
    cv.width = m.w * TSRC; cv.height = m.h * TSRC;
    const b = cv.getContext('2d');
    b.clearRect(0, 0, cv.width, cv.height);
    let ready = true;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const keys = view.terrain(x, y);
      if (!keys) continue;
      for (const k of keys) {
        const im = G.T.image(k, G.T.hash(x, y));
        if (!G.T.ready(im)) { ready = false; continue; }
        b.drawImage(im, x * TSRC, y * TSRC);
      }
    }
    m._bg = cv; m._bgVer = m.ver; m._bgReady = ready;
    return cv;
  }
  const sx = x => ox + (x + 0.5) * TS;
  const sy = y => oy + (y + 0.5) * TS;

  function drawSprite(spec, cx, cy, size, flip) {
    for (const [k, v] of G.T.layers(spec)) {
      const im = G.T.image(k, v);
      if (!G.T.ready(im)) continue;
      blit(im, cx, cy, size, flip);
    }
  }
  function blit(im, cx, cy, size, flip) {
    if (flip) {
      ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1);
      ctx.drawImage(im, -size / 2, cy - size / 2, size, size);
      ctx.restore();
    } else ctx.drawImage(im, cx - size / 2, cy - size / 2, size, size);
  }
  function drawEnt(e, t, now) {
    const size = (e.s || 1) * TS;
    let cx = sx(e._rx), cy = sy(e._ry);
    if (e.pad) {
      const a = 0.35 + 0.25 * Math.sin(t / 300);
      ctx.strokeStyle = e.sel ? `rgba(255,224,138,${a + 0.3})` : `rgba(62,240,255,${a})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.strokeRect(cx - size * 0.42, cy - size * 0.42, size * 0.84, size * 0.84);
      ctx.setLineDash([]);
      return;
    }
    if (!e.t) return;
    const foot = cy + size * 0.38;
    if (e.moving) cy -= Math.abs(Math.sin(t / 90 + e.x * 3)) * TS * 0.06;
    // 맞은 직후: 떨림
    const hq = e._hit ? (now - e._hit) / (90 + 180 * (e._hitP || 0)) : 1;
    if (hq < 1) cx += Math.sin(now / 11) * TS * 0.07 * (0.5 + (e._hitP || 0)) * (1 - hq);
    ctx.globalAlpha = e.alpha == null ? 1 : e.alpha;
    if (!e.under && e.kind) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(cx, foot, size * 0.3, size * 0.1, 0, 0, 7); ctx.fill();
    }
    // 주인공: 발밑 고리와 밝은 외곽선 — 사람·몬스터 사이에서도 한눈에
    if (e.kind === 'hero') {
      ctx.strokeStyle = `rgba(255,214,110,${0.55 + 0.25 * Math.sin(t / 260)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, foot, size * 0.36, size * 0.13, 0, 0, 7); ctx.stroke();
      const sil = silhouette(e.t, '#fff3c4');
      if (sil) {
        const o = Math.max(1, size / 32);
        ctx.globalAlpha *= 0.8;
        for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o]]) blit(sil, cx + dx, cy + dy, size, e.flip);
        ctx.globalAlpha = e.alpha == null ? 1 : e.alpha;
      }
    }
    if (e.glow) { ctx.shadowColor = e.glow; ctx.shadowBlur = 14; }
    if (e.dim) ctx.filter = 'grayscale(1) brightness(0.45)';
    drawSprite(e.t, cx, cy, size, e.flip);
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    if (hq < 1) {
      const sil = silhouette(e.t, '#ffffff');
      if (sil) { ctx.globalAlpha = 0.9 * (1 - hq); blit(sil, cx, cy, size, e.flip); }
    }
    ctx.globalAlpha = 1;
    if (e.bar && e.max && e.hp < e.max && e.hp > 0) {
      const bw = Math.max(18, size * 0.8), by = cy - size / 2 - 5;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(cx - bw / 2 - 1, by - 1, bw + 2, 5);
      ctx.fillStyle = e.kind === 'mon' ? '#ff5a5a' : '#5fdc7a';
      ctx.fillRect(cx - bw / 2, by, bw * Math.max(0, e.hp / e.max), 3);
    }
    if (e.label) text(e.label, cx, cy - size / 2 - 10, '#ffd9a0', 11);
  }
  function text(s, x, y, col, px, bold) {
    ctx.font = `${bold ? 800 : 700} ${px}px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = Math.max(3, px / 6); ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function drawFx(f, t) {
    const p = 1 - f.t / f.max, a = Math.min(1, f.t / f.max * 2);
    ctx.globalAlpha = a;
    if (f.k === 'text') {
      // 큰 피해일수록 크게, pop이면 처음에 크게 튀었다가 줄어든다
      const pop = f.pop ? 1 + 0.8 * Math.max(0, 1 - p / 0.15) : 1;
      text(f.s, sx(f.x), sy(f.y) - p * TS * 0.8, f.col || '#fff', Math.max(11, TS * 0.36) * (f.sz || 1) * pop, true);
    } else if (f.k === 'proj') {
      const x = f.x + (f.x2 - f.x) * p, y = f.y + (f.y2 - f.y) * p;
      drawSprite({ k: f.key, v: Math.floor(t / 80) }, sx(x), sy(y), TS * 0.8, f.x2 < f.x);
    } else if (f.k === 'ring') {
      ctx.strokeStyle = f.col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), f.r * TS * (0.6 + 0.4 * p), 0, 7); ctx.stroke();
    } else if (f.k === 'bolt') {
      const x = sx(f.x), y = sy(f.y);
      ctx.strokeStyle = f.col; ctx.lineWidth = 3; ctx.shadowColor = f.col; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(x + (Math.random() - 0.5) * 20, y - TS * 5);
      for (let i = 1; i <= 6; i++) ctx.lineTo(x + (i < 6 ? (Math.random() - 0.5) * TS * 0.7 : 0), y - TS * 5 + i * TS * 5 / 6);
      ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = f.col; ctx.globalAlpha = a * 0.35;
      ctx.beginPath(); ctx.arc(x, y, TS * 0.7, 0, 7); ctx.fill();
    } else if (f.k === 'slash') {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), TS * 0.45, -2.4 + p * 1.2, -0.6 + p * 1.2); ctx.stroke();
    } else if (f.k === 'tile') {
      drawSprite({ k: f.key, v: Math.floor(t / 120) }, sx(f.x), sy(f.y), TS * (f.s || 1), false);
    } else if (f.k === 'beam') {
      ctx.strokeStyle = f.col; ctx.lineWidth = f.w || 2; ctx.shadowColor = f.col; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(sx(f.x), sy(f.y)); ctx.lineTo(sx(f.x2), sy(f.y2)); ctx.stroke(); ctx.shadowBlur = 0;
    } else if (f.k === 'chain') {
      ctx.strokeStyle = f.col; ctx.lineWidth = 2; ctx.shadowColor = f.col; ctx.shadowBlur = 8;
      ctx.beginPath();
      f.pts.forEach(([x, y], i) => { const X = sx(x) + (i ? (Math.random() - 0.5) * 8 : 0), Y = sy(y) + (i ? (Math.random() - 0.5) * 8 : 0); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
  // 처음 해 보는 사람에게 "여기를 눌러"를 글 대신 화살표로
  function drawCoach(c, t) {
    const x = sx(c.x), y = sy(c.y), r = (c.s || 1) * TS * 0.6;
    const a = 0.6 + 0.4 * Math.sin(t / 200);
    ctx.strokeStyle = `rgba(255,224,138,${a})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r * (1 + 0.15 * Math.sin(t / 200)), 0, 7); ctx.stroke();
    const ay = y - r - TS * 0.25 - Math.abs(Math.sin(t / 220)) * TS * 0.35, w = TS * 0.32;
    ctx.fillStyle = '#ffe08a'; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - w, ay - w * 1.3); ctx.lineTo(x + w, ay - w * 1.3); ctx.lineTo(x, ay); ctx.closePath();
    ctx.stroke(); ctx.fill();
    if (c.label) text(c.label, x, ay - w * 1.3 - 6, '#ffe08a', Math.max(12, TS * 0.38), true);
  }

  return {
    draw(view, t, id) {
      if (!resize() || !view) return;
      const now = performance.now(), fdt = Math.min(0.1, Math.max(0, (t - lastT) / 1000));
      lastT = t;
      const m = view.map, bg = background(view);
      if (view.fit) {
        TS = Math.min(W / m.w, H / m.h);
        ox = (W - m.w * TS) / 2; oy = (H - m.h * TS) / 2;
      } else {
        TS = H / view.viewH;
        const c = view.cam;
        if (!cam.ok || Math.hypot(c.x - cam.x, c.y - cam.y) > 12) { cam.x = c.x; cam.y = c.y; cam.ok = true; }
        cam.x += (c.x - cam.x) * 0.12; cam.y += (c.y - cam.y) * 0.12;
        ox = W / 2 - (cam.x + 0.5) * TS; oy = H / 2 - (cam.y + 0.5) * TS;
        if (m.w * TS > W) ox = Math.min(0, Math.max(W - m.w * TS, ox)); else ox = (W - m.w * TS) / 2;
        if (m.h * TS > H) oy = Math.min(0, Math.max(H - m.h * TS, oy)); else oy = (H - m.h * TS) / 2;
      }
      // 결정타 확대: 초점을 화면 가운데 쪽으로 끌어오며 키운다
      const zk = G.J.zoomK(id, now);
      if (zk > 0) {
        const s = G.J.st[id], ts2 = TS * (1 + (s.z - 1) * zk);
        const X0 = ox + (s.zx + 0.5) * TS, Y0 = oy + (s.zy + 0.5) * TS;
        ox = X0 + (W / 2 - X0) * zk * 0.8 - (s.zx + 0.5) * ts2;
        oy = Y0 + (H / 2 - Y0) * zk * 0.8 - (s.zy + 0.5) * ts2;
        TS = ts2;
      }
      const [shx, shy] = G.J.shakeOff(id, now);
      ox += shx; oy += shy;

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(bg, ox, oy, m.w * TS, m.h * TS);
      // 그릴 위치를 로직 위치 쪽으로 부드럽게 (멀리 순간이동하면 바로 붙인다)
      const k = 1 - Math.exp(-fdt * 18);
      for (const e of view.ents) {
        if (e._rx === undefined || Math.abs(e.x - e._rx) + Math.abs(e.y - e._ry) > 2.5) { e._rx = e.x; e._ry = e.y; }
        else { e._rx += (e.x - e._rx) * k; e._ry += (e.y - e._ry) * k; }
      }
      const ents = view.ents.slice().sort((a, b) => (b.under ? 1 : 0) - (a.under ? 1 : 0) || a._ry - b._ry);
      for (const e of ents) drawEnt(e, t, now);
      if (view.labels) for (const l of view.labels) text(l.s, sx(l.x), sy(l.y) - TS * 0.7, l.on ? '#ffe08a' : 'rgba(255,255,255,0.75)', Math.max(10, TS * 0.32));
      for (const f of view.fx) drawFx(f, t);
      const coach = G.Coach && G.Coach.target(id);
      if (coach) drawCoach(coach, t);
      if (view.dimAll) { ctx.fillStyle = 'rgba(60,0,0,0.45)'; ctx.fillRect(0, 0, W, H); }
      if (view.tint) {
        ctx.fillStyle = view.tint; ctx.fillRect(0, 0, W, H);
        if (view.lamps && m.poi.L) {
          ctx.globalCompositeOperation = 'lighter';
          for (const [lx, ly] of m.poi.L) {
            const g = ctx.createRadialGradient(sx(lx), sy(ly), 2, sx(lx), sy(ly), TS * 3);
            g.addColorStop(0, 'rgba(255,190,90,0.28)'); g.addColorStop(1, 'rgba(255,190,90,0)');
            ctx.fillStyle = g; ctx.fillRect(sx(lx) - TS * 3, sy(ly) - TS * 3, TS * 6, TS * 6);
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      const fa = G.J.flashA(id, now);
      if (fa > 0) { ctx.fillStyle = G.J.st[id].flC; ctx.globalAlpha = fa; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    },
    // 화면 좌표 → 칸 좌표(실수)
    toTile(px, py) { return { x: (px - ox) / TS - 0.5, y: (py - oy) / TS - 0.5 }; },
  };
};

// 타일을 한 색으로 칠한 실루엣 (번쩍임·외곽선용). 겹친 인형도 한 장으로 합친다.
const silCache = new Map();
function silhouette(spec, col) {
  const key = JSON.stringify(spec) + col;
  let c = silCache.get(key);
  if (c) return c;
  const ims = G.T.layers(spec).map(([k, v]) => G.T.image(k, v)).filter(Boolean);
  if (!ims.length || !ims.every(G.T.ready)) return null;
  c = document.createElement('canvas');
  c.width = c.height = 32;
  const b = c.getContext('2d');
  for (const im of ims) b.drawImage(im, 0, 0);
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = col; b.fillRect(0, 0, 32, 32);
  if (silCache.size > 400) silCache.clear();
  silCache.set(key, c);
  return c;
}
