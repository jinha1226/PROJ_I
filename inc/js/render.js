'use strict';
// 2D 타일 맵 그리기. 세계 로직의 view()가 주는 { map, terrain(x,y), ents, fx, cam|fit, tint, labels }를 캔버스에 그린다.
// 좌표: 엔티티 x, y는 칸 좌표(정수 = 칸 중심). 지형은 32px 원본 크기로 한 번 그려 두고 확대해서 찍는다(픽셀 그대로).
// 로직은 10Hz라 엔티티 위치를 그릴 때 부드럽게 따라가게(_rx, _ry) 한다. 손맛 효과(G.J)는 세계 id로 찾는다.
G.MapView = function (canvas, id) {
  const ctx = canvas.getContext('2d');
  G.UI.zoom = G.UI.zoom || {};
  let camMode = false, baseTS = 32, minZ = 0.3;
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
      for (const it of keys) {
        // { k, q: [qx, qy] } 이면 그 그림의 사분면 하나만 이 칸의 같은 사분면에 (벽 밑 땅을 양쪽에 맞게 깔 때)
        const k = typeof it === 'string' ? it : it.k;
        const im = G.T.image(k, G.T.hash(x + (it.dx || 0), y + (it.dy || 0)));
        if (!G.T.ready(im)) { ready = false; continue; }
        if (it.q) {
          const hw = im.naturalWidth / 2, h2 = TSRC / 2;
          b.drawImage(im, it.q[0] * hw, it.q[1] * hw, hw, hw, x * TSRC + it.q[0] * h2, y * TSRC + it.q[1] * h2, h2, h2);
          continue;
        }
        // 0x72 높은 벽(16×32): 아래 절반이 이 칸, 위 절반(윗단 턱)은 위 칸에 겹친다
        if (im.naturalHeight === im.naturalWidth * 2) b.drawImage(im, x * TSRC, (y - 1) * TSRC, TSRC, TSRC * 2);
        else b.drawImage(im, x * TSRC, y * TSRC, TSRC, TSRC);
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
    let ang = 0.45, pull = 0;
    // 활은 휘두르지 않고 앞에 세워 들었다가, 쏠 때 뒤로 당겼다 놓는다.
    // 지팡이·성직자 철퇴는 주문 때 세워 들어 올리고 끝이 빛난다.
    const bow = e.wpn === 'w_bow', staff = /staff|holymace/.test(e.wpn);
    let lift = 0;
    if (bow) { ang = 0; pull = lq < 1 ? Math.sin(Math.PI * lq) * size * 0.12 : 0; }
    else if (staff) { ang = 0.25; if (lq < 1) { const u = Math.sin(Math.PI * lq); ang = 0.25 - 0.3 * u; lift = u * size * 0.28; } }
    else if (lq < 1) { const q = 1 - Math.pow(1 - lq, 3); ang = lq < 0.15 ? 0.45 - 1.9 * (lq / 0.15) : -1.45 + 3.1 * q; }
    ctx.save();
    ctx.translate(cx + face * (size * (bow ? 0.38 : 0.32) - pull), cy + size * (bow ? 0.05 : 0.22) - lift);
    ctx.scale(face, 1);
    ctx.rotate(ang);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, -w / 2, -h * 0.85, w, h);
    if (staff && lift > 0) {
      const col = e.wpn === 'w_arcstaff' ? '200,140,255' : e.wpn === 'w_holymace' ? '255,230,140' : e.wpn === 'w_gstaff' ? '150,255,140' : '255,140,90';
      const g = ctx.createRadialGradient(0, -h * 0.8, 1, 0, -h * 0.8, size * 0.45);
      g.addColorStop(0, `rgba(${col},0.95)`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.arc(0, -h * 0.8, size * 0.45, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
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
    // 겁쟁이가 물러서는 동안 부들부들 떤다 (DESIGN.md 42)
    if (e.fleeT > 0) cx += Math.sin(now / 25) * TS * 0.05;
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
    // 쓰러짐: 옆으로 눕고 흑백, 부활하면 다시 일어선다 (_down 0 → 1을 부드럽게)
    e._down = (e._down || 0) + ((e.dead ? 1 : 0) - (e._down || 0)) * 0.18;
    const down = e._down > 0.02 ? e._down : 0;
    ctx.globalAlpha = e.alpha == null ? 1 : e.alpha;
    if (down) {
      ctx.save();
      ctx.translate(cx, foot); ctx.rotate((e.flip ? -1 : 1) * down * Math.PI / 2); ctx.translate(-cx, -foot);
    }
    if (!e.under && e.kind && !down) {
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
    // 라이벌 원정대: 발밑에 그 파티 색 고리
    if (e.ring && !down) {
      ctx.strokeStyle = e.ring; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(cx, foot, size * 0.34, size * 0.12, 0, 0, 7); ctx.stroke();
      ctx.globalAlpha = e.alpha == null ? 1 : e.alpha;
    }
    if (e.glow) { ctx.shadowColor = e.glow; ctx.shadowBlur = 14; }
    if (e.dim) ctx.filter = 'grayscale(1) brightness(0.45)';
    if (down) ctx.filter = `grayscale(${down}) brightness(${1 - 0.35 * down})`;
    // 정지(시간 정지 · 그물)는 얼음빛으로
    const tint = e.stop > 0 ? '#9fd8ff' : e.tint, tc = tint && tinted(spec, tint);
    const top = tc ? blit(tc, cx, cy, size, e.flip) : drawSprite(spec, cx, cy, size, e.flip);
    if (e.wpn && G.ARTSET[e.wpn]) drawWeapon(e, cx, cy, size, lq);
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    if (down) {
      ctx.restore();
      // 다시 일어날 때까지 남은 초
      // 누운 몸 한가운데 위 (발을 축으로 90° 돌았으니 몸 중심은 발 옆으로 간다)
      if (e.dead && e.reviveT > 0) text(Math.ceil(e.reviveT), cx + (e.flip ? -1 : 1) * (foot - cy) * down, foot - size * 0.32, '#ff9a9a', Math.max(11, TS * 0.32), true);
    }
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
      ctx.fillStyle = e.barCol || (e.kind === 'mon' ? '#ff5a5a' : '#5fdc7a');
      ctx.fillRect(cx - bw / 2, by, bw * r, 3);
    }
    if (e.label) text(e.label, cx, top - 10, e.ring || '#ffd9a0', 11);
    if (e.dots && !down) drawStatus(e, cx, cy, foot, top, size, now);
  }
  // 상태이상 (DESIGN.md 43): 글 없이 — 표식 붉은 과녁 · 기절 머리 위 도는 별 · 감전 푸른 번개 · 지속 피해는 체력 막대 밑 색 점(독 초록 · 화상 주황 · 출혈 빨강)
  const DOT_COL = { poison: '#7fe05a', burn: '#ff9a3a', bleed: '#ff3a4a' };
  function drawStatus(e, cx, cy, foot, top, size, now) {
    if (e.mark > 0) {
      const r = size * 0.42, a = now / 400;
      ctx.strokeStyle = '#ff4a4a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
      for (let i = 0; i < 4; i++) { const q = a + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(q) * r * 0.7, cy + Math.sin(q) * r * 0.7); ctx.lineTo(cx + Math.cos(q) * r * 1.2, cy + Math.sin(q) * r * 1.2); ctx.stroke(); }
    }
    if (e.stun > 0) {
      ctx.fillStyle = '#ffe08a'; ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) { const q = now / 220 + i * 2.1; star(cx + Math.cos(q) * size * 0.3, top - 4 + Math.sin(q) * size * 0.08, Math.max(2.5, size * 0.08)); }
    }
    if (e.shock > 0 && Math.floor(now / 90) % 2) {
      ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9;
      for (let i = 0; i < 2; i++) {
        let x = cx + (Math.random() - 0.5) * size * 0.6, y = cy - size * 0.3;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 3; k++) { x += (Math.random() - 0.5) * size * 0.3; y += size * 0.18; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }
    if (e.dots.length) {
      const r = Math.max(2, size * 0.06);
      e.dots.forEach((d, i) => { ctx.globalAlpha = 1; ctx.fillStyle = DOT_COL[d.kind] || '#fff'; ctx.beginPath(); ctx.arc(cx - (e.dots.length - 1) * r * 1.4 + i * r * 2.8, top + 2 + r * 1.6, r, 0, 7); ctx.fill(); });
    }
    ctx.globalAlpha = 1;
  }
  function star(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const q = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(q) * rr, y + Math.sin(q) * rr); }
    ctx.closePath(); ctx.fill();
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
  // 말풍선 (G.Banter): 말하는 사람 머리 위를 따라다닌다. 글자 크기는 확대와 상관없이 읽을 수 있게, 겹치면 위로 쌓는다
  function drawBubbles(list) {
    const px = Math.max(12, Math.min(15, TS * 0.3)), lh = px * 1.3, pad = px * 0.55, maxW = px * 13, placed = [], tnow = G.S.runTime;
    const FONT = `"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif`, MAIN = `600 ${px}px ${FONT}`, TAG = `700 ${Math.max(11, px * 0.82)}px ${FONT}`;
    ctx.save();
    ctx.font = MAIN;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    for (const b of list) {
      if (b._px !== px) {
        b._px = px; b._lines = [];
        let cur = '';
        for (const w of b.s.split(' ')) {
          const next = cur ? cur + ' ' + w : w;
          if (cur && ctx.measureText(next).width > maxW) { b._lines.push(cur); cur = w; } else cur = next;
        }
        b._lines.push(cur);
        b._w = Math.max(...b._lines.map(l => ctx.measureText(l).width));
        if (b.tag) { ctx.font = TAG; b._w = Math.max(b._w, ctx.measureText(b.tag.s).width); ctx.font = MAIN; }
      }
      const e = b.e, rows = b._lines.length + (b.tag ? 1 : 0), w = b._w + pad * 2, hh = rows * lh + pad * 1.1, cx = sx(e._rx ?? e.x);
      let x = Math.max(4, Math.min(W - w - 4, cx - w / 2)), y = sy(e._ry ?? e.y) - TS * 0.85 - hh;
      for (let i = 0; i < placed.length; i++) { const p = placed[i]; if (x < p.x + p.w + 3 && x + w + 3 > p.x && y < p.y + p.h + 3 && y + hh + 3 > p.y) { y = p.y - hh - 3; i = -1; } }
      y = Math.max(4, y);
      placed.push({ x, y, w, h: hh });
      const age = tnow - b.at, left = b.until - tnow;
      ctx.globalAlpha = Math.min(1, Math.min(age / 0.12, left / 0.3));
      const tx = Math.max(x + 8, Math.min(x + w - 8, cx)), r = 5;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r);
      ctx.lineTo(tx + 5, y + hh); ctx.lineTo(tx, y + hh + 6); ctx.lineTo(tx - 5, y + hh);
      ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      ctx.fillStyle = '#efe4cb'; ctx.fill();
      ctx.lineWidth = b.col ? 2 : 1.5; ctx.strokeStyle = b.col || '#2a1e12'; ctx.stroke();
      if (b.tag) { ctx.font = TAG; ctx.fillStyle = b.tag.ok ? '#1f6b2c' : '#a32a1c'; ctx.fillText(b.tag.s, x + pad, y + pad * 0.55 + lh * 0.78); ctx.font = MAIN; }
      ctx.fillStyle = '#21170d';
      b._lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad * 0.55 + lh * (i + (b.tag ? 1 : 0) + 0.78)));
    }
    ctx.restore();
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
      // 0x72 화살은 위를 향해 그려져 있다: 날아가는 방향으로 돌린다 (살짝 포물선)
      if (G.ARTSET[f.key] && f.key === 'fx_arrow') {
        const im = G.T.image('fx_arrow', 0);
        if (G.T.ready(im)) {
          const k = TS / 16 * 0.8, arc = Math.sin(Math.PI * p) * 0.35, ang = Math.atan2(f.y2 - f.y, f.x2 - f.x) + Math.PI / 2 - (f.x2 >= f.x ? 1 : -1) * (0.5 - p) * 0.6;
          ctx.save(); ctx.translate(sx(x), sy(y - arc)); ctx.rotate(ang); ctx.imageSmoothingEnabled = false;
          ctx.drawImage(im, -im.naturalWidth * k / 2, -im.naturalHeight * k / 2, im.naturalWidth * k, im.naturalHeight * k); ctx.restore();
        }
      } else drawSprite({ k: f.key, v: Math.floor(t / 80) }, sx(x), sy(y), TS * 0.8, f.x2 < f.x);
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
    } else if (f.k === 'emote') {
      // 성격 기호 (DESIGN.md 42): 그 사람 머리 위 말풍선 — 톡 튀어나와 떠 있다가 사라진다
      const e = f.ent, x = sx(e ? e._rx ?? e.x : f.x), pop = Math.min(1, p * 8), y = sy(e ? e._ry ?? e.y : f.y) - TS * (1.15 + 0.08 * Math.sin(p * 12)), r = TS * 0.36 * (0.6 + 0.4 * pop);
      ctx.globalAlpha = Math.min(1, (1 - p) * 4);
      ctx.fillStyle = '#f4efe2'; ctx.strokeStyle = '#120e16'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.moveTo(x - r * 0.3, y + r * 0.8); ctx.lineTo(x, y + r * 1.35); ctx.lineTo(x + r * 0.3, y + r * 0.8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r - 1, 0, 7); ctx.fill();
      drawSprite({ k: f.key, v: 0 }, x, y, r * 1.5, false);
    } else if (f.k === 'banner') {
      // 그 자리에서 생긴 일 (DESIGN.md 50): 빛기둥이 솟고, 머리 위에 현판(아이콘 + 이름)이 톡 튀어나와 떠 있다가 사라진다
      const age = p * f.max, w0 = f.wait || 0;
      if (age < w0) return;
      const q = (age - w0) / (f.max - w0);
      const e = f.ent, ex = sx(e ? e._rx ?? e.x : f.x), ey = sy(e ? e._ry ?? e.y : f.y);
      const px = Math.max(12, TS * 0.32), y = ey - TS * 1.75 - Math.min(1, q * 4) * TS * 0.2;
      const pop = q < 0.06 ? 0.4 + q * 12 : q < 0.12 ? 1.12 - (q - 0.06) * 2 : 1;
      if (q < 0.35) {
        const a = (0.35 - q) / 0.35, g = ctx.createLinearGradient(0, ey - TS * 2.6, 0, ey + TS * 0.3);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, f.col);
        ctx.globalAlpha = a * 0.55; ctx.fillStyle = g;
        ctx.fillRect(ex - TS * 0.35 * a, ey - TS * 2.6, TS * 0.7 * a, TS * 2.9);
      }
      ctx.globalAlpha = Math.min(1, (1 - q) * 5);
      ctx.font = `900 ${px}px "Noto Serif KR","Nanum Myeongjo",Georgia,serif`;
      const w = ctx.measureText(f.s).width + px * 2.4, h = px * 1.75;
      ctx.save(); ctx.translate(ex, y); ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(14,10,18,0.94)'; ctx.strokeStyle = f.col; ctx.lineWidth = 2; ctx.shadowColor = f.col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(-5, h / 2); ctx.lineTo(0, h / 2 + 6); ctx.lineTo(5, h / 2); ctx.fill(); ctx.stroke();
      ctx.font = `${px * 0.95}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(f.ic, -w / 2 + px * 0.95, 1);
      ctx.textBaseline = 'alphabetic';
      text(f.s, px * 0.5, px * 0.36, f.col, px, true);
      ctx.restore();
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
    // 길잡이의 덫: 바닥에 벌린 이빨
    if (e.shape === 'trap') {
      const r = size * 0.3;
      ctx.strokeStyle = '#9aa4ad'; ctx.lineWidth = 2; ctx.fillStyle = '#3a3a44';
      ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.3, r, r * 0.55, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8dde4';
      for (let i = 0; i < 6; i++) { const q = i * Math.PI / 3, x = cx + Math.cos(q) * r * 0.8, y = cy + r * 0.3 + Math.sin(q) * r * 0.45; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx + Math.cos(q) * r * 0.35, cy + r * 0.3 + Math.sin(q) * r * 0.2 - r * 0.25); ctx.lineTo(x + r * 0.15, y); ctx.fill(); }
      return;
    }
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
    if (fg.torches) drawTorches(fg);
    else if (fg.light) {
      const lx = sx(fg.light._rx ?? fg.light.x), ly = sy(fg.light._ry ?? fg.light.y);
      const g = ctx.createRadialGradient(lx, ly, TS * 4, lx, ly, TS * 11);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }
  // 횃불 (DESIGN.md 68): 화면을 어둡게 덮고 살아 있는 파티원 자리만 도려낸다. 앞사람 불이 가장 크고 조금씩 일렁인다. 어둠은 작은 캔버스로 그려 늘린다
  const DARK = 'rgba(6,5,12,0.72)', TORCH_K = 4, TORCH_LEAD = 0.95, TORCH_ALLY = 0.5;
  let darkC = null;
  function drawTorches(fg) {
    const w = Math.ceil(W / TORCH_K), h = Math.ceil(H / TORCH_K);
    if (!darkC) darkC = document.createElement('canvas');
    if (darkC.width !== w || darkC.height !== h) { darkC.width = w; darkC.height = h; }
    const d = darkC.getContext('2d'), now = performance.now(), pts = [];
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, w, h);
    d.fillStyle = DARK; d.fillRect(0, 0, w, h);
    d.globalCompositeOperation = 'destination-out';
    fg.torches.forEach((p, i) => {
      const x = sx(p._rx ?? p.x), y = sy(p._ry ?? p.y), wob = 1 + 0.035 * Math.sin(now / 110 + i * 2) + 0.02 * Math.sin(now / 47 + i * 5), r = fg.torchR * (i ? TORCH_ALLY : TORCH_LEAD) * TS * wob;
      pts.push([x, y, r]);
      const g = d.createRadialGradient(x / TORCH_K, y / TORCH_K, r * 0.3 / TORCH_K, x / TORCH_K, y / TORCH_K, r / TORCH_K);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect(0, 0, w, h);
    });
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(darkC, 0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    // 불빛의 따뜻한 기운
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of pts) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.7);
      g.addColorStop(0, 'rgba(255,160,80,0.07)'); g.addColorStop(1, 'rgba(255,160,80,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // 미니맵: 오른쪽 위. 본 칸, 계단, 파티(초록·금색), 본 칸 위의 몬스터(빨강)
  // 미니맵 (DESIGN.md 37, UNDERDEEP식): 탐색한 칸을 칸 격자로 — 바닥 양피지색, 벽 어둡게.
  // 표식 S 시작 · ▼ 계단 · B 보스 · T 보물 방. M 키·미니맵 클릭 = 큰 지도 (G.UI.bigMap)
  let miniRect = null;
  function miniBox(view) {
    const m = view.map, big = !!G.UI.bigMap;
    // 큰 지도는 아래 독(약 140px) 위 공간에 맞춘다
    // 세로 화면(모바일)에서는 작은 지도를 폭의 40% 안으로 (DESIGN.md 51)
    const AH = H - 150, k = big ? Math.max(3, Math.floor(Math.min(W * 0.86 / m.w, AH * 0.9 / m.h))) : Math.max(2, Math.min(6, Math.floor(Math.min(260, W * 0.4) / m.w)));
    const w = m.w * k, h = m.h * k;
    return { k, w, h, x0: big ? Math.round((W - w) / 2) : W - w - 10, y0: big ? Math.round((AH - h) / 2) + 16 : 10, big };
  }
  function drawMini(view) {
    const m = view.map, mi = view.mini, B = miniRect = miniBox(view), { k, w, h, x0, y0, big } = B;
    const key = mi.ver + ':' + k;
    if (!m._mini || m._miniKey !== key || m._miniSeen !== mi.seen) {
      const c = m._mini || document.createElement('canvas');
      c.width = w; c.height = h;
      const b = c.getContext('2d'), gap = k >= 5 ? 1 : 0;
      b.clearRect(0, 0, w, h);
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        const i = y * m.w + x;
        if (!mi.seen[i]) continue;
        const wall = m.c[i] === '#';
        b.fillStyle = wall ? '#3b342b' : '#c8bc9f';
        b.fillRect(x * k, y * k, k - (wall ? 0 : gap), k - (wall ? 0 : gap));
      }
      m._mini = c; m._miniKey = key; m._miniSeen = mi.seen;
    }
    if (big) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = 'rgba(10,10,14,0.85)'; ctx.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
    ctx.strokeStyle = '#6b5434'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 4.5, y0 - 4.5, w + 9, h + 9);
    ctx.drawImage(m._mini, x0, y0);
    const seen = (x, y) => mi.seen[Math.round(y) * m.w + Math.round(x)];
    const dot = (x, y, col, r) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x0 + (x + 0.5) * k - r), Math.round(y0 + (y + 0.5) * k - r), Math.ceil(r * 2), Math.ceil(r * 2)); };
    const mark = (x, y, s, col) => {
      const fs = Math.max(9, Math.round(k * (big ? 1.6 : 2.2)));
      ctx.font = `700 ${fs}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(s, x0 + (x + 0.5) * k, y0 + (y + 0.5) * k);
      ctx.fillStyle = col; ctx.fillText(s, x0 + (x + 0.5) * k, y0 + (y + 0.5) * k);
    };
    for (const r of mi.treasure || []) if (seen(r.cx, r.cy)) mark(r.cx, r.cy, 'T', '#ffd24a');
    if (mi.start && seen(mi.start.cx, mi.start.cy)) mark(mi.start.cx, mi.start.cy, 'S', '#e8e0cc');
    if (seen(mi.end.cx, mi.end.cy)) mark(mi.end.cx, mi.end.cy, '▼', '#ffd24a');
    for (const e of mi.chests || []) if (seen(e.x, e.y)) dot(e.x, e.y, '#ffd24a', k * 0.45);
    for (const e of mi.mons) if (seen(e.x, e.y)) { if (e.boss) mark(e.x, e.y, 'B', '#ff6a5a'); else dot(e.x, e.y, '#d8483e', k * 0.4); }
    if (mi.rivals) for (const e of mi.rivals) if (seen(e.x, e.y)) dot(e.x, e.y, e.ring, k * 0.55);
    for (const e of mi.party) if (!e.dead) dot(e.x, e.y, e.kind === 'hero' ? '#ffffff' : '#6fe39a', e.kind === 'hero' ? k * 0.7 : k * 0.45);
    if (big) {
      ctx.font = '700 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#c9a26a';
      ctx.fillText(mi.label || '', x0, y0 - 10);
      return;
    }
    // 지금 화면에 보이는 범위
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.strokeRect(x0 + Math.max(0, -ox / TS * k), y0 + Math.max(0, -oy / TS * k), Math.min(w, W / TS * k), Math.min(h, H / TS * k));
    if (mi.label) { ctx.font = '700 11px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = '#c9a26a'; ctx.fillText(mi.label, x0 + w, y0 + h + 7); }
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
        // 확대·축소: 기본 크기 × 배율. 가장 작게는 맵 전체가 한 화면에 들어올 때까지
        // 세로 화면: 높이로만 맞추면 너무 크게 확대돼 옆이 좁다 — 폭에도 viewH의 85%칸은 들어오게
        baseTS = view.fit ? MIN_TS : Math.min(H / view.viewH, H > W ? W / (view.viewH * 0.85) : 1e9);
        minZ = Math.min(1, fitTS / baseTS);
        camMode = true;
        const z = G.UI.zoom[id] = G.U.clamp(G.UI.zoom[id] || 1, minZ, 2.5);
        TS = baseTS * z;
        const c = view.cam;
        if (!cam.ok || Math.hypot(c.x - cam.x, c.y - cam.y) > 12) { cam.x = c.x; cam.y = c.y; cam.ok = true; }
        const ck = c.k || 0.12;  // k: 1이면 지연 없이 딱 붙는다 (빠르게 움직이는 바늘을 따라갈 때)
        cam.x += (c.x - cam.x) * ck; cam.y += (c.y - cam.y) * ck;
        ox = W / 2 - (cam.x + 0.5) * TS; oy = H / 2 - (cam.y + 0.5) * TS;
        // view.center: 캐릭터를 늘 화면 가운데에 (던전처럼 바깥이 어둠이어도 되는 맵). 아니면 맵 가장자리에서 멈춘다
        if (!view.center) {
          if (m.w * TS > W) ox = Math.min(0, Math.max(W - m.w * TS, ox)); else ox = (W - m.w * TS) / 2;
          if (m.h * TS > H) oy = Math.min(0, Math.max(H - m.h * TS, oy)); else oy = (H - m.h * TS) / 2;
        }
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
      //  vx·vy가 있으면 마지막 틱 뒤로 흐른 만큼 앞서 그린다 (틱 사이에 뚝뚝 끊기지 않게)
      const k = 1 - Math.exp(-fdt * 18), lead = G.tickLead ? G.tickLead() : 0;
      for (const e of view.ents) {
        const tx = e.x + (e.vx || 0) * lead, ty = e.y + (e.vy || 0) * lead;
        if (e._rx === undefined || Math.abs(tx - e._rx) + Math.abs(ty - e._ry) > 2.5) { e._rx = tx; e._ry = ty; }
        else {
          e._rx = e.vx ? tx : e._rx + (tx - e._rx) * k;
          e._ry = e.vy ? ty : e._ry + (ty - e._ry) * k;
        }
      }
      const fog = view.fog;
      const hidden = e => fog && (e.kind === 'mon' || e.kind === 'rival') && !fog.seen[Math.round(e.y) * m.w + Math.round(e.x)];
      const ents = view.ents.filter(e => !hidden(e)).sort((a, b) => (b.under || b.dead ? 1 : 0) - (a.under || a.dead ? 1 : 0) || a._ry - b._ry);
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
        // 방향: 상생은 받는 쪽 앞에 화살촉, 상극은 가운데 ✕
        const ax = sx(l.x + (l.x2 - l.x) * 0.62), ay = sy(l.y + (l.y2 - l.y) * 0.62), ang = Math.atan2(l.y2 - l.y, l.x2 - l.x), w = TS * 0.16;
        ctx.setLineDash([]); ctx.globalAlpha = 0.95;
        if (l.good) {
          ctx.fillStyle = l.col; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(ax + Math.cos(ang) * w, ay + Math.sin(ang) * w);
          ctx.lineTo(ax + Math.cos(ang + 2.5) * w, ay + Math.sin(ang + 2.5) * w); ctx.lineTo(ax + Math.cos(ang - 2.5) * w, ay + Math.sin(ang - 2.5) * w); ctx.closePath();
          ctx.stroke(); ctx.fill();
        } else {
          const mx = sx((l.x + l.x2) / 2), my = sy((l.y + l.y2) / 2), r = TS * 0.1;
          ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(mx - r, my - r); ctx.lineTo(mx + r, my + r); ctx.moveTo(mx + r, my - r); ctx.lineTo(mx - r, my + r); ctx.stroke();
        }
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (view.lines) for (const l of view.lines) {
        ctx.strokeStyle = l.col; ctx.lineWidth = l.w || 1;
        // to: 끝을 엔티티에 묶는다 (그려지는 부드러운 위치를 따라가야 바늘과 줄이 따로 놀지 않는다)
        const x2 = l.to ? l.to._rx : l.x2, y2 = l.to ? l.to._ry + (l.dy || 0) : l.y2;
        ctx.beginPath(); ctx.moveTo(sx(l.x), sy(l.y)); ctx.lineTo(sx(x2), sy(y2)); ctx.stroke();
      }
      for (const e of ents) if (!e.under) drawEnt(e, t, now);
      if (fog) drawFog(view);
      if (view.labels) for (const l of view.labels) text(l.s, sx(l.x), sy(l.y) - TS * 0.7, l.on ? '#ffe08a' : 'rgba(255,255,255,0.75)', Math.max(10, TS * 0.32));
      for (const f of view.fx) drawFx(f, t);
      if (view.bubbles) drawBubbles(view.bubbles);
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
    // 휠·손가락 확대: f배 (1보다 크면 확대)
    zoomBy(f) { if (camMode) G.UI.zoom[id] = G.U.clamp((G.UI.zoom[id] || 1) * f, minZ, 2.5); },
    canZoom: () => camMode,
    // 화면 좌표 → 칸 좌표(실수)
    toTile(px, py) { return { x: (px - ox) / TS - 0.5, y: (py - oy) / TS - 0.5 }; },
    // 미니맵을 눌렀나 (큰 지도가 펼쳐져 있으면 어디든)
    miniHit(px, py) { const r = miniRect; return !!r && (r.big || (px >= r.x0 - 4 && px <= r.x0 + r.w + 4 && py >= r.y0 - 4 && py <= r.y0 + r.h + 4)); },
    // 칸 좌표 → 화면 좌표 (맵 위에 HTML을 띄울 때). ts: 지금 칸 한 변의 픽셀
    toScreen(x, y) { return { x: ox + (x + 0.5) * TS, y: oy + (y + 0.5) * TS, ts: TS }; },
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
