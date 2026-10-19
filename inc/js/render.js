'use strict';
// 2D 타일 맵 그리기. 세계 로직의 view()가 주는 { map, terrain(x,y), ents, fx, cam|fit, tint, labels }를 캔버스에 그린다.
// 좌표: 엔티티 x, y는 칸 좌표(정수 = 칸 중심). 지형은 32px 원본 크기로 한 번 그려 두고 확대해서 찍는다(픽셀 그대로).
// 로직은 10Hz라 엔티티 위치를 그릴 때 부드럽게 따라가게(_rx, _ry) 한다. 손맛 효과(G.J)는 세계 id로 찾는다.
G.MapView = function (canvas) {
  const ctx = canvas.getContext('2d');
  const MIN_TS = 28;
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
    // 칸당 32px로 그려 두고 확대한다 (16px 픽셀 타일은 2배, 픽셀 그대로)
    const TSRC = 32;
    cv.width = m.w * TSRC; cv.height = m.h * TSRC;
    const b = cv.getContext('2d');
    b.imageSmoothingEnabled = false;
    b.clearRect(0, 0, cv.width, cv.height);
    let ready = true;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const keys = view.terrain(x, y);
      if (!keys) continue;
      for (const k of keys) {
        const im = G.T.image(k, G.T.hash(x, y));
        if (!G.T.ready(im)) { ready = false; continue; }
        b.drawImage(im, x * TSRC, y * TSRC, TSRC, TSRC);
      }
    }
    m._bg = cv; m._bgVer = m.ver; m._bgReady = ready;
    return cv;
  }
  const sx = x => ox + (x + 0.5) * TS;
  const sy = y => oy + (y + 0.5) * TS;

  // 손에 든 무기: 평소엔 앞으로 비스듬히 들고, 공격(내딛기) 때 뒤에서 앞으로 크게 휘두른다
  function drawWeapon(e, cx, cy, size, lq) {
    const im = G.T.image(e.wpn, 0);
    if (!G.T.ready(im)) return;
    const k = size / 16 * 0.65, w = im.naturalWidth * k, h = im.naturalHeight * k, face = e.flip ? -1 : 1;
    let ang = 0.45;
    if (lq < 1) { const q = 1 - Math.pow(1 - lq, 3); ang = lq < 0.15 ? 0.45 - 1.9 * (lq / 0.15) : -1.45 + 3.1 * q; }
    ctx.save();
    ctx.translate(cx + face * size * 0.32, cy + size * 0.22);
    ctx.scale(face, 1);
    ctx.rotate(ang);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, -w / 2, -h * 0.85, w, h);
    ctx.restore();
  }
  // 그리고 나서 그림의 윗변 y를 돌려준다 (체력바·이름표를 머리 위에 두려고)
  function drawSprite(spec, cx, cy, size, flip) {
    let top = cy - size / 2;
    for (const [k, v] of G.T.layers(spec)) {
      const im = G.T.image(k, v);
      if (!G.T.ready(im)) continue;
      top = Math.min(top, blit(im, cx, cy, size, flip));
    }
    return top;
  }
  // DCSS 타일(32×32)은 칸 가운데에 칸 크기로. 0x72 픽셀 그림(16px 기준, 세로로 긴 것도)은
  // 원본 1px = 칸/16 비율로 키우고 발을 칸 아래쪽에 맞춘다.
  function blit(im, cx, cy, size, flip) {
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    ctx.imageSmoothingEnabled = false;
    let dw = size, dh = size, x = cx - size / 2, y = cy - size / 2;
    if (w !== 32 || h !== 32) {
      const k = size / 16;
      dw = w * k; dh = h * k; x = cx - dw / 2; y = cy + size * 0.45 - dh;
    }
    if (flip) {
      ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1);
      ctx.drawImage(im, x - cx, y, dw, dh);
      ctx.restore();
    } else ctx.drawImage(im, x, y, dw, dh);
    return y;
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
    if (e.shape) return drawShape(e, cx, cy, size, t);
    let spec = e.art && G.ARTSET[e.art] ? e.art : e.t;
    if (!spec) return;
    const foot = cy + size * 0.38;
    // 0x72 그림: 맞을 때 한 장, 걸을 때 run, 아니면 대기 애니메이션 (걷는 들썩임은 run이 대신한다)
    const anim = typeof spec === 'string' && G.ARTSET[spec];
    const hitNow = e._hit && now - e._hit < 160;
    if (anim) {
      const key = hitNow && G.ARTSET[spec + '_hit'] ? spec + '_hit' : e.moving && G.ARTSET[spec + '_run'] ? spec + '_run' : spec;
      if (e._ph == null) e._ph = Math.random() * 4;
      spec = { k: key, v: Math.floor(now / (key.endsWith('_run') ? 90 : 140) + e._ph) };
    }
    if (e.moving && !(anim && G.ARTSET[e.t + '_run'])) cy -= Math.abs(Math.sin(t / 90 + e.x * 3)) * TS * 0.06;
    // 공격: 대상 쪽으로 내딛었다 돌아온다
    const lq = e._lu ? (now - e._lu) / 170 : 1;
    if (lq < 1) { const k = Math.sin(Math.PI * lq) * TS * 0.3; cx += e._lx * k; cy += e._ly * k; }
    // 맞음: 뒤로 밀렸다 돌아오며 떤다
    const hq = e._hit ? (now - e._hit) / (110 + 180 * (e._hitP || 0)) : 1;
    if (hq < 1) {
      const kb = (1 - hq) * (1 - hq) * TS * (0.16 + 0.2 * (e._hitP || 0));
      cx += (e._kx || 0) * kb + Math.sin(now / 11) * TS * 0.05 * (1 - hq);
      cy += (e._ky || 0) * kb;
    }
    ctx.globalAlpha = e.alpha == null ? 1 : e.alpha;
    if (!e.under && e.kind) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(cx, foot, size * 0.3, size * 0.1, 0, 0, 7); ctx.fill();
    }
    // 주인공: 발밑 고리와 밝은 외곽선 — 사람·몬스터 사이에서도 한눈에
    if (e.kind === 'hero') {
      ctx.strokeStyle = `rgba(255,214,110,${0.55 + 0.25 * Math.sin(t / 260)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, foot, size * 0.36, size * 0.13, 0, 0, 7); ctx.stroke();
      const sil = silhouette(spec, '#fff3c4');
      if (sil) {
        const o = Math.max(1, size / 20);
        ctx.globalAlpha *= 0.8;
        for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o]]) blit(sil, cx + dx, cy + dy, size, e.flip);
        ctx.globalAlpha = e.alpha == null ? 1 : e.alpha;
      }
    }
    if (e.glow) { ctx.shadowColor = e.glow; ctx.shadowBlur = 14; }
    if (e.dim) ctx.filter = 'grayscale(1) brightness(0.45)';
    const tc = e.tint && tinted(spec, e.tint);
    const top = tc ? blit(tc, cx, cy, size, e.flip) : drawSprite(spec, cx, cy, size, e.flip);
    if (e.wpn && G.ARTSET[e.wpn]) drawWeapon(e, cx, cy, size, lq);
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    if (hq < 1) {
      // 몬스터는 하얗게, 아군은 붉게 번쩍
      const sil = silhouette(spec, e.kind === 'mon' ? '#ffffff' : '#ff6060');
      if (sil) { ctx.globalAlpha = (e.kind === 'mon' ? 0.9 : 0.7) * (1 - hq); blit(sil, cx, cy, size, e.flip); }
    }
    ctx.globalAlpha = 1;
    if (e.bar && e.max && e.hp < e.max && e.hp > 0) {
      const bw = Math.max(18, size * 0.8), by = top - 5, r = Math.max(0, e.hp / e.max);
      // 깎인 만큼 흰 띠가 잠깐 남았다가 따라 줄어든다
      e._hpv = e._hpv == null || e._hpv < r ? r : e._hpv + (r - e._hpv) * 0.08;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(cx - bw / 2 - 1, by - 1, bw + 2, 5);
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - bw / 2, by, bw * e._hpv, 3);
      ctx.fillStyle = e.kind === 'mon' ? '#ff5a5a' : '#5fdc7a';
      ctx.fillRect(cx - bw / 2, by, bw * r, 3);
    }
    if (e.label) text(e.label, cx, top - 10, '#ffd9a0', 11);
  }
  // 굵은 잉크 붓질 초승달 (베기 그림이 없을 때)
  function inkSlash(x, y, r, rot, p, crit) {
    const sweep = Math.min(1, p * 4);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot - 0.6);
    const a0 = -1.9, a1 = a0 + 2.6 * sweep;
    ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.arc(r * 0.18, r * 0.22, r * 0.78, a1, a0, true); ctx.closePath();
    ctx.fillStyle = '#000'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.94, a0 + 0.1, a1 - 0.05); ctx.arc(r * 0.16, r * 0.2, r * 0.84, a1 - 0.05, a0 + 0.1, true); ctx.closePath();
    ctx.fillStyle = crit ? '#e0262a' : '#f4efe2'; ctx.fill();
    ctx.restore();
  }
  // 숫자는 굵은 세리프 + 두꺼운 검은 테두리 (다크스트 던전의 묵직한 숫자)
  function text(s, x, y, col, px, bold) {
    ctx.font = bold ? `900 ${px}px "Noto Serif KR","Nanum Myeongjo",Georgia,serif` : `700 ${px}px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, px / (bold ? 4 : 6)); ctx.strokeStyle = 'rgba(0,0,0,0.9)';
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
      // 다크스트 던전식 베기: 대상 위를 가로지르는 굵은 붓질. 그림(fx_slash)이 있으면 그것을 돌려 찍는다.
      const x = sx(f.x), y = sy(f.y), key = f.crit ? 'fx_slash_crit' : 'fx_slash';
      const pop = 1 + 0.35 * Math.max(0, 1 - p / 0.25), sz = TS * (f.crit ? 2 : 1.5) * pop;
      ctx.globalAlpha = Math.min(1, (1 - p) * 2.5);
      if (G.ARTSET[key]) {
        const im = G.T.image(key, 0);
        if (G.T.ready(im)) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot || 0); if (f.flip) ctx.scale(-1, 1);
          ctx.imageSmoothingEnabled = true; ctx.drawImage(im, -sz / 2, -sz / 2, sz, sz); ctx.restore();
        }
      } else inkSlash(x, y, sz * 0.5, f.rot || 0, p, f.crit);
    } else if (f.k === 'splat') {
      // 피(잉크) 튀김: 맞은 반대쪽으로 방울이 튀고 떨어진다. 그림(fx_blood·fx_ichor)이 있으면 그것.
      const x = sx(f.x), y = sy(f.y), key = f.ichor ? 'fx_ichor' : 'fx_blood';
      if (G.ARTSET[key]) {
        const im = G.T.image(key, 0), sz = TS * (0.9 + 0.6 * Math.min(1, p * 4)) * (f.s || 1);
        if (G.T.ready(im)) { ctx.save(); ctx.translate(x + (f.dx || 0) * TS * 0.3 * p, y); ctx.rotate(Math.atan2(f.dy || 0, f.dx || 1)); ctx.imageSmoothingEnabled = true; ctx.drawImage(im, -sz / 2, -sz / 2, sz, sz); ctx.restore(); }
      } else {
        if (!f._d) f._d = Array.from({ length: f.n || 6 }, () => ({ a: (f.dx || f.dy ? Math.atan2(f.dy, f.dx) : Math.random() * 6.3) + (Math.random() - 0.5) * 1.6, v: 0.6 + Math.random() * 1.2, r: 0.04 + Math.random() * 0.06 }));
        ctx.fillStyle = f.ichor ? '#3f6b2a' : '#8a1010'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
        for (const d of f._d) {
          const k = p * d.v, px = x + Math.cos(d.a) * k * TS, py = y + Math.sin(d.a) * k * TS + p * p * TS * 0.6;
          ctx.beginPath(); ctx.arc(px, py, TS * d.r * (1 - p * 0.4), 0, 7); ctx.fill(); ctx.stroke();
        }
      }
    } else if (f.k === 'impact') {
      // 치명타·강타: 들쭉날쭉한 별 모양 충격
      const x = sx(f.x), y = sy(f.y), sz = TS * (f.s || 1.4) * (0.6 + 0.6 * Math.min(1, p * 5));
      ctx.globalAlpha = Math.min(1, (1 - p) * 2);
      if (G.ARTSET.fx_impact && G.T.ready(G.T.image('fx_impact', 0))) { ctx.imageSmoothingEnabled = true; ctx.drawImage(G.T.image('fx_impact', 0), x - sz / 2, y - sz / 2, sz, sz); }
      else {
        ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = (i % 2 ? 0.22 : 0.5) * sz; i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        ctx.closePath(); ctx.fillStyle = f.col || '#fff3b0'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.stroke();
      }
    } else if (f.k === 'mote') {
      // 영기 알갱이: 살짝 휘며 목적지로 빨려 든다
      const e = p * p, x = f.x + (f.x2 - f.x) * e + Math.sin(p * 3.1) * 0.4, y = f.y + (f.y2 - f.y) * e - Math.sin(p * 3.1) * 0.6;
      ctx.fillStyle = f.col; ctx.shadowColor = f.col; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(sx(x), sy(y), Math.max(1.5, TS * 0.07), 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (f.k === 'die') {
      // 쓰러짐: 번쩍인 뒤 납작해지며 사라진다
      const size = TS * (f.s || 1), cx = sx(f.x), cy = sy(f.y);
      ctx.save(); ctx.translate(cx, cy + size * 0.4); ctx.scale(1 + p * 0.3, 1 - p * 0.8); ctx.translate(-cx, -(cy + size * 0.4));
      ctx.globalAlpha = 1 - p;
      drawSprite(f.spr, cx, cy, size, f.flip);
      const sil = p < 0.4 && silhouette(f.spr, '#ffffff');
      if (sil) { ctx.globalAlpha = 1 - p / 0.4; blit(sil, cx, cy, size, f.flip); }
      ctx.restore();
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
  // 타일로 없는 것: 배(나무 선체·돛대 등불·낚싯대), 낚싯바늘
  function drawShape(e, cx, cy, size, t) {
    if (e.shape === 'boat') {
      cy += Math.sin(t / 600) * TS * 0.05;
      const w = size * 0.6, top = cy - size * 0.02, bot = cy + size * 0.22;
      ctx.fillStyle = '#5a3a22'; ctx.strokeStyle = '#1e120a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - w, top); ctx.lineTo(cx + w, top); ctx.lineTo(cx + w * 0.72, bot); ctx.lineTo(cx - w * 0.72, bot); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7a5434'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - w * 0.9, top + (bot - top) * 0.45); ctx.lineTo(cx + w * 0.9, top + (bot - top) * 0.45); ctx.stroke();
      // 돛대와 등불
      const mx = cx + w * 0.55;
      ctx.strokeStyle = '#3a2716'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, top); ctx.lineTo(mx, top - size * 0.55); ctx.stroke();
      const g = ctx.createRadialGradient(mx, top - size * 0.55, 1, mx, top - size * 0.55, TS * 1.2);
      g.addColorStop(0, 'rgba(255,200,110,0.9)'); g.addColorStop(0.15, 'rgba(255,190,90,0.35)'); g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, top - size * 0.55, TS * 1.2, 0, 7); ctx.fill();
      // 낚싯대
      if (e.rod) { ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - w * 0.2, top - size * 0.25); ctx.lineTo(sx(e.rod.x), sy(e.rod.y)); ctx.stroke(); }
    } else if (e.shape === 'hook') {
      ctx.strokeStyle = '#dfe6ee'; ctx.lineWidth = Math.max(1.5, TS * 0.05); ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(cx, cy - TS * 0.3); ctx.lineTo(cx, cy + TS * 0.05); ctx.arc(cx - TS * 0.1, cy + TS * 0.05, TS * 0.1, 0, Math.PI); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  // 안개: 본 적 없는 칸은 어둡게(칸당 1px 캔버스를 부드럽게 확대), 주인공 주변은 등불처럼 밝게
  function drawFog(view) {
    const m = view.map, fg = view.fog;
    if (!m._fog || m._fogVer !== fg.ver || m._fogSeen !== fg.seen) {
      const c = m._fog || document.createElement('canvas');
      c.width = m.w; c.height = m.h;
      const b = c.getContext('2d'), img = b.createImageData(m.w, m.h);
      for (let i = 0; i < m.w * m.h; i++) img.data[i * 4 + 3] = fg.seen[i] ? 0 : 235;
      b.putImageData(img, 0, 0);
      m._fog = c; m._fogVer = fg.ver; m._fogSeen = fg.seen;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(m._fog, ox, oy, m.w * TS, m.h * TS);
    ctx.imageSmoothingEnabled = false;
    if (fg.light) {
      const lx = sx(fg.light._rx ?? fg.light.x), ly = sy(fg.light._ry ?? fg.light.y);
      const g = ctx.createRadialGradient(lx, ly, TS * 3, lx, ly, TS * 9);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }
  // 미니맵: 오른쪽 위. 본 칸, 계단, 파티(초록·금색), 본 칸 위의 몬스터(빨강)
  function drawMini(view) {
    const m = view.map, mi = view.mini, k = Math.max(2, Math.min(4, Math.floor(Math.min(W, H) * 0.28 / m.w)));
    const w = m.w * k, h = m.h * k, x0 = W - w - 8, y0 = 8;
    if (!m._mini || m._miniVer !== mi.ver || m._miniSeen !== mi.seen) {
      const c = m._mini || document.createElement('canvas');
      c.width = m.w; c.height = m.h;
      const b = c.getContext('2d'), img = b.createImageData(m.w, m.h);
      for (let i = 0; i < m.w * m.h; i++) {
        if (!mi.seen[i]) continue;
        const ch = m.c[i], o = i * 4;
        const col = ch === '#' ? [70, 62, 54, 255] : [150, 140, 120, 255];
        img.data.set(col, o);
      }
      b.putImageData(img, 0, 0);
      m._mini = c; m._miniVer = mi.ver; m._miniSeen = mi.seen;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 3.5, y0 - 3.5, w + 7, h + 7);
    ctx.drawImage(m._mini, x0, y0, w, h);
    const dot = (x, y, col, r) => { ctx.fillStyle = col; ctx.fillRect(x0 + (x + 0.5) * k - r, y0 + (y + 0.5) * k - r, r * 2, r * 2); };
    if (mi.seen[mi.end.cy * m.w + mi.end.cx]) dot(mi.end.cx, mi.end.cy, '#ffd24a', k);
    for (const e of mi.mons) if (mi.seen[Math.round(e.y) * m.w + Math.round(e.x)]) dot(e.x, e.y, '#ff4a4a', e.boss ? k : k * 0.6);
    for (const e of mi.party) if (!e.dead) dot(e.x, e.y, e.kind === 'hero' ? '#fff3c4' : '#6fe39a', e.kind === 'hero' ? k * 0.9 : k * 0.6);
    // 지금 화면에 보이는 범위
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeRect(x0 + Math.max(0, -ox / TS * k), y0 + Math.max(0, -oy / TS * k), Math.min(w, W / TS * k), Math.min(h, H / TS * k));
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
      const m = view.map, bg = background(view), fitTS = Math.min(W / m.w, H / m.h);
      if (view.fit && (!view.cam || fitTS >= MIN_TS)) {
        TS = fitTS;
        ox = (W - m.w * TS) / 2; oy = (H - m.h * TS) / 2;
      } else {
        TS = view.fit ? MIN_TS : H / view.viewH;
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
      const fog = view.fog;
      const hidden = e => fog && e.kind === 'mon' && !fog.seen[Math.round(e.y) * m.w + Math.round(e.x)];
      const ents = view.ents.filter(e => !hidden(e)).sort((a, b) => (b.under ? 1 : 0) - (a.under ? 1 : 0) || a._ry - b._ry);
      // 바닥에 깔린 것(진기 등) → 오행 선 → 나머지
      for (const e of ents) if (e.under) drawEnt(e, t, now);
      // 오행 상생(빛나는 흐름)·상극(붉은 금) 선
      if (view.links) for (const l of view.links) {
        ctx.strokeStyle = l.good ? l.col : 'rgba(255,70,70,0.75)';
        ctx.lineWidth = l.good ? Math.max(2, TS * 0.08) : 2;
        ctx.globalAlpha = l.good ? 0.55 + 0.25 * Math.sin(t / 250) : 0.8;
        ctx.setLineDash(l.good ? [TS * 0.18, TS * 0.12] : [3, 4]);
        ctx.lineDashOffset = l.good ? -t / 40 : 0;
        if (l.good) { ctx.shadowColor = l.col; ctx.shadowBlur = 6; }
        ctx.beginPath(); ctx.moveTo(sx(l.x), sy(l.y)); ctx.lineTo(sx(l.x2), sy(l.y2)); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (view.lines) for (const l of view.lines) {
        ctx.strokeStyle = l.col; ctx.lineWidth = l.w || 1;
        ctx.beginPath(); ctx.moveTo(sx(l.x), sy(l.y)); ctx.lineTo(sx(l.x2), sy(l.y2)); ctx.stroke();
      }
      for (const e of ents) if (!e.under) drawEnt(e, t, now);
      if (fog) drawFog(view);
      if (view.labels) for (const l of view.labels) text(l.s, sx(l.x), sy(l.y) - TS * 0.7, l.on ? '#ffe08a' : 'rgba(255,255,255,0.75)', Math.max(10, TS * 0.32));
      for (const f of view.fx) drawFx(f, t);
      if (view.lamp && view.lamp.a > 0) {
        const L = view.lamp, lx = sx(L.x), ly = sy(L.y);
        const g = ctx.createRadialGradient(lx, ly, TS * L.r * 0.35, lx, ly, TS * L.r * 1.6);
        g.addColorStop(0, 'rgba(0,0,8,0)'); g.addColorStop(1, `rgba(0,0,8,${L.a})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
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
      if (view.mini) drawMini(view);
      const fa = G.J.flashA(id, now);
      if (fa > 0) { ctx.fillStyle = G.J.st[id].flC; ctx.globalAlpha = fa; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    },
    // 화면 좌표 → 칸 좌표(실수)
    toTile(px, py) { return { x: (px - ox) / TS - 0.5, y: (py - oy) / TS - 0.5 }; },
  };
};

// 타일 위에 색을 반쯤 덧칠한 것 (Safari도 되도록 ctx.filter 대신 합성으로)
const tintCache = new Map();
function tinted(spec, col) {
  const key = JSON.stringify(spec) + col;
  let c = tintCache.get(key);
  if (c) return c;
  const ims = G.T.layers(spec).map(([k, v]) => G.T.image(k, v)).filter(Boolean);
  if (!ims.length || !ims.every(G.T.ready)) return null;
  c = document.createElement('canvas');
  const W = ims[0].naturalWidth || 32, H = ims[0].naturalHeight || 32;
  c.width = W; c.height = H;
  const b = c.getContext('2d');
  for (const im of ims) b.drawImage(im, 0, 0, W, H);
  b.globalCompositeOperation = 'source-atop';
  b.globalAlpha = 0.55; b.fillStyle = col; b.fillRect(0, 0, W, H);
  tintCache.set(key, c);
  return c;
}
// 타일을 한 색으로 칠한 실루엣 (번쩍임·외곽선용). 겹친 인형도 한 장으로 합친다.
const silCache = new Map();
function silhouette(spec, col) {
  const key = JSON.stringify(spec) + col;
  let c = silCache.get(key);
  if (c) return c;
  const ims = G.T.layers(spec).map(([k, v]) => G.T.image(k, v)).filter(Boolean);
  if (!ims.length || !ims.every(G.T.ready)) return null;
  c = document.createElement('canvas');
  const W = ims[0].naturalWidth || 32, H = ims[0].naturalHeight || 32;
  c.width = W; c.height = H;
  const b = c.getContext('2d');
  for (const im of ims) b.drawImage(im, 0, 0, W, H);
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = col; b.fillRect(0, 0, W, H);
  if (silCache.size > 400) silCache.clear();
  silCache.set(key, c);
  return c;
}
