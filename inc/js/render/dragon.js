'use strict';
// 용 부위 인형 (설계 docs/superpowers/specs/2026-11-19-dragon-boss-design.md):
//  머리 · 목 · 몸통 · 날개 둘 · 다리 넷 · 꼬리를 굵은 외곽선 + 평평한 색(LAYERLAB 2D Minimal 결)으로 크게 그리고,
//  32px 인형과 같은 식(외곽선 우선 줄이기 · 1px 붉은 외곽선)으로 픽셀 그림을 만든다. 동작마다 몇 장을 미리 굽는다 —
//  그림 하나처럼 넘기므로 복셀 다시 칠하기(voxchar.js) · 그림자 · 가림이 다른 몬스터와 같은 길을 탄다.
//  왼쪽을 본다 (DCSS 그림과 같다 — 오른쪽을 볼 때 drawRec가 뒤집는다). 좌표: 가로 160 × 세로 100 단위, 땅 = y 96.
const DRAGON = (() => {
  const OL = '#2a1c22';
  const COLORS = { // 몸 · 그늘 · 배 · 날개막 · 뿔 · 눈
    red: ['#c9432f', '#8e2c25', '#efc27a', '#a3332c', '#efe3c4', '#ffd23a'],
    white: ['#e4ecf2', '#a9b9c9', '#c4d8e8', '#b4c6da', '#8aa0b8', '#4ab0ff'],
    black: ['#43404f', '#28262f', '#7a7458', '#34313e', '#d8d0b8', '#b8ff3a'],
    green: ['#4f9a4a', '#2f6a34', '#c8d070', '#3b7a40', '#e0dcb0', '#ffe040'],
    blue: ['#3f74c8', '#284c8e', '#a8c8e8', '#335ea8', '#e8e0c8', '#fff060'],
    brass: ['#c8963a', '#8e6624', '#f0d890', '#a87430', '#f4ecd0', '#ff6030'],
  };
  const colorOf = n => /붉은/.test(n) ? 'red' : /흰/.test(n) ? 'white' : /검은/.test(n) ? 'black' : /초록/.test(n) ? 'green' : /푸른/.test(n) ? 'blue' : /황동/.test(n) ? 'brass' : 'red';
  // 나이: 머리 크기 · 뿔 길이 · 등 가시 수 · 그림 높이(px, 칸 수에 맞춘다)
  const AGE = {
    wyrm: { head: 1.3, horn: 0.5, spikes: 4, H: 40 },
    young: { head: 1.12, horn: 0.8, spikes: 6, H: 58 },
    adult: { head: 1, horn: 1, spikes: 8, H: 86 },
    ancient: { head: 0.96, horn: 1.35, spikes: 10, H: 110, crown: true },
  };
  const ageOf = n => /새끼/.test(n) ? 'wyrm' : /어린/.test(n) ? 'young' : /고룡/.test(n) ? 'ancient' : 'adult';

  // ── 그리기 도구: 부위마다 외곽선(두 배 굵기 선)을 먼저, 그 위에 채우기 — 부위 사이에도 선이 남는다 ──
  let X = null, LW = 3;
  const part = (path, fill) => { X.beginPath(); path(); X.closePath(); X.lineJoin = 'round'; X.lineCap = 'round'; X.strokeStyle = OL; X.lineWidth = LW * 2; X.stroke(); X.fillStyle = fill; X.fill(); };
  const poly = pts => () => { X.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) X.lineTo(pts[i][0], pts[i][1]); };
  const rot = (p, o, a) => { const c = Math.cos(a), s = Math.sin(a), x = p[0] - o[0], y = p[1] - o[1]; return [o[0] + x * c - y * s, o[1] + x * s + y * c]; };
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const qbez = (a, c, b, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });
  // 굵기가 줄어드는 관(목 · 꼬리 · 다리): 등뼈 점 + 반지름 → 한 덩어리 윤곽 (끝은 둥글게)
  function tube(P, R) {
    const L = [], Rt = [], n = P.length;
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      L.push([P[i][0] + nx * R[i], P[i][1] + ny * R[i]]); Rt.push([P[i][0] - nx * R[i], P[i][1] - ny * R[i]]);
    }
    return () => {
      X.moveTo(L[0][0], L[0][1]); for (const p of L) X.lineTo(p[0], p[1]);
      const e = P[n - 1], a1 = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]); X.arc(e[0], e[1], R[n - 1], a1, a1 + Math.PI, true);
      for (let i = n - 1; i >= 0; i--) X.lineTo(Rt[i][0], Rt[i][1]);
      const s = P[0], a0 = Math.atan2(Rt[0][1] - s[1], Rt[0][0] - s[0]); X.arc(s[0], s[1], R[0], a0, a0 + Math.PI, true);
    };
  }
  const lerpN = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

  // ── 부위 ──
  function wing(sh, a, col, mem, far) {
    // 어깨 → 팔꿈치 → 손목, 손목에서 손가락 넷이 뒤로 펼쳐진다. a: 들어 올린 각 (+ 위로)
    const R = p => rot(p, sh, -a), el = R(add(sh, [10, -26])), wr = R(add(sh, [-2, -46])), tips = [[30, -50], [52, -32], [60, -8], [50, 12]].map(t => R(add(sh, t)));
    const root = add(sh, [34, 8]);
    const memPath = () => { X.moveTo(sh[0], sh[1]); X.lineTo(wr[0], wr[1]); X.lineTo(tips[0][0], tips[0][1]);
      for (let i = 1; i < tips.length; i++) { const p = tips[i - 1], q = tips[i], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], c = add(m, [(wr[0] - m[0]) * .28, (wr[1] - m[1]) * .28]); X.quadraticCurveTo(c[0], c[1], q[0], q[1]); }
      const p = tips[tips.length - 1], c = add([(p[0] + root[0]) / 2, (p[1] + root[1]) / 2], [-6, -4]); X.quadraticCurveTo(c[0], c[1], root[0], root[1]); };
    part(memPath, mem);
    for (const t of tips) part(tube([wr, t], [2.4, 1]), col); // 손가락 뼈
    part(tube([sh, el, wr], [5, 3.6, 2.8]), col); // 팔
    part(() => { X.moveTo(wr[0] - 2, wr[1]); X.lineTo(wr[0] - 7, wr[1] - 7); X.lineTo(wr[0] + 2, wr[1] - 2); }, far ? col : '#efe3c4'); // 손목 발톱
  }
  function leg(hip, k, ph, col, front) {
    // ph: 걸음 (−1 … 1). 넓적다리 → 무릎 → 발목 → 발가락
    const sw = ph * 6, lift = Math.max(0, -ph) * 4;
    const knee = add(hip, front ? [-3 + sw * .4, 13] : [7 + sw * .4, 12]), ank = add(hip, front ? [-6 + sw, 25 - lift] : [-2 + sw, 26 - lift]), toe = add(ank, [-8, 2]);
    part(tube([hip, knee, ank], [front ? 7 : 9.5, front ? 5 : 6, 4].map(r => r * k)), col);
    part(tube([ank, toe], [4.2 * k, 3 * k]), col);
    for (let i = 0; i < 3; i++) part(() => { const b = add(toe, [-1 + i * 2.6, 1.6]); X.moveTo(b[0], b[1] - 1.5); X.lineTo(b[0] - 4, b[1] + 1); X.lineTo(b[0] + .5, b[1] + 1.2); }, '#efe3c4');
  }
  function head(o, a, jaw, C, A) {
    // o: 머리 뒤(목이 붙는 곳), a: 기울기(− 코가 아래), jaw: 입 벌림(라디안)
    const k = A.head * 1.05, P = p => rot(add(o, [p[0] * k, p[1] * k]), o, a);
    const hinge = [-6, 5];
    // 뿔 (머리 뒤로 휘어 올라간다)
    const hk = A.horn;
    const horn = (b, mid, tip, w) => part(() => { const B = P(b), M = P(mid), T = P(tip), B2 = P(add(b, [w, 1])); X.moveTo(B[0], B[1]); X.quadraticCurveTo(M[0], M[1], T[0], T[1]); X.quadraticCurveTo(M[0] + 2, M[1] + 3, B2[0], B2[1]); }, C[4]);
    horn([2, -7], [12 * hk, -14 * hk], [24 * hk, -12 * hk - 4], 5);
    if (A.crown) horn([-3, -8], [4, -18], [12, -24], 4);
    // 아래턱 (경첩에서 돈다)
    const J = p => rot(P(p), P(hinge), -jaw);
    part(poly([J([-4, 4]), J([-26, 6]), J([-27, 9]), J([-22, 11]), J([-4, 11])]), C[1]);
    if (jaw > .12) { // 이빨 · 입 안
      part(poly([P([-6, 4]), P([-26, 3]), J([-26, 6]), J([-6, 6])]), '#5a1418');
      for (let i = 0; i < 4; i++) { const u = P([-10 - i * 4.4, 3.4]), d = J([-11 - i * 4.4, 6]); part(poly([u, add(u, [-1.6, 0]), add(u, [-.8, 3])]), '#fff6e8'); part(poly([d, add(d, [-1.6, 0]), add(d, [-.8, -2.6])]), '#fff6e8'); }
    }
    // 머리뼈: 뒤통수 · 이마 · 콧등 · 코끝 · 윗입술
    part(poly([P([6, -6]), P([0, -9]), P([-10, -7]), P([-24, -3]), P([-29, 0]), P([-28, 4]), P([-6, 6]), P([6, 5])]), C[0]);
    part(poly([P([-24, -3]), P([-29, 0]), P([-28, 4]), P([-20, 4]), P([-18, 0])]), C[0]); // 코
    // 눈두덩 · 눈 (눈은 밝게 — 줄여도 남는다)
    part(poly([P([-6, -7.5]), P([-15, -5.5]), P([-13, -3.4]), P([-5, -4.6])]), C[1]);
    const E = P([-9, -2.4]); X.beginPath(); X.ellipse(E[0], E[1], 3.2 * k, 2.2 * k, a, 0, 6.283); X.fillStyle = C[5]; X.fill();
    X.beginPath(); X.ellipse(E[0], E[1], .8 * k, 2 * k, a, 0, 6.283); X.fillStyle = OL; X.fill();
    // 콧구멍
    const N = P([-25, -.6]); X.beginPath(); X.arc(N[0], N[1], 1.1 * k, 0, 6.283); X.fillStyle = OL; X.fill();
  }

  // ── 자세 (동작마다 한 장) ──
  // b: 몸 위아래 · nk: 목이 향하는 머리 자리 · ha: 머리 기울기 · jaw · wa/wb: 앞 · 뒤 날개 각 · tp: 꼬리 물결 · lp: 걸음
  function pose(fk, i, n) {
    const t = i / n * 6.283, s = Math.sin(t);
    if (fk === 'run') return { b: -Math.abs(Math.sin(t)) * 2.4, nk: [30 + s, 22 + Math.abs(s) * 2], ha: -.22, jaw: .05, wa: .18 + s * .12, wb: .1 + s * .1, tp: t * 1.5, lp: Math.sin(t) };
    if (fk === 'w0') return { b: -1.5, nk: [50, 8], ha: .42, jaw: .3, wa: .42, wb: .34, tp: 1.2, lp: 0 }; // 들이마신다: 목을 젖히고 날개를 든다
    if (fk === 'w1') return { b: 1, nk: [14, 38], ha: -.38, jaw: .62, wa: -.08, wb: -.04, tp: 2.4, lp: .3 }; // 내뻗는다: 목을 앞아래로, 입을 크게
    if (fk === 'hit') return { b: 1.2, nk: [44, 16], ha: .5, jaw: .32, wa: .26, wb: .2, tp: 3, lp: 0 };
    return { b: s * .9, nk: [30 + s * .8, 21 - s * 1.2], ha: -.18 + s * .03, jaw: Math.max(0, s) * .05, wa: .06 + s * .06, wb: .02 + s * .05, tp: t, lp: 0 }; // 대기: 숨쉬기
  }
  function drawPose(P, C, A) {
    const by = P.b, body = [80, 60 + by], sh = [64, 47 + by];
    // 뒤 날개 · 뒤 다리 (그늘 색)
    wing(add(sh, [8, -4]), P.wb + .08, C[1], C[1], true);
    leg([100, 66 + by], 1, -P.lp, C[1], false); leg([62, 70 + by], 1, P.lp, C[1], true);
    // 꼬리: 엉덩이에서 오른쪽으로, 물결치며 가늘어진다 · 끝은 창 모양
    const tl = []; for (let i = 0; i <= 12; i++) { const u = i / 12; tl.push([104 + u * 50, 64 + by + u * 22 - Math.sin(u * 3.2) * 10 + Math.sin(P.tp + u * 4) * u * 6]); }
    const tip = tl[12], pre = tl[11], ang = Math.atan2(tip[1] - pre[1], tip[0] - pre[0]);
    part(poly([rot(add(tip, [-3, -6]), tip, ang), rot(add(tip, [9, 0]), tip, ang), rot(add(tip, [-3, 6]), tip, ang), rot(add(tip, [0, 0]), tip, ang)]), C[1]);
    part(tube(tl, lerpN(10, 2, 13)), C[0]);
    // 등 가시 (몸 뒤에 먼저 — 몸 외곽선이 뿌리를 덮는다)
    for (let i = 0; i < A.spikes; i++) { const u = i / Math.max(1, A.spikes - 1), x = 62 + u * 48, y = 40 + by + Math.pow(u - .45, 2) * 22, h = 9 - Math.abs(u - .4) * 7; part(poly([[x - 4, y + 4], [x + 2, y - h], [x + 5, y + 4]]), C[4]); }
    // 몸통 · 배
    part(() => X.ellipse(body[0], body[1], 31, 19, -.1, 0, 6.283), C[0]);
    part(() => X.ellipse(body[0] - 6, body[1] + 9, 21, 8.5, -.12, 0, 6.283), C[2]);
    for (let i = 0; i < 4; i++) { const x = body[0] - 20 + i * 9; X.beginPath(); X.moveTo(x, body[1] + 3); X.lineTo(x + 1, body[1] + 14); X.strokeStyle = OL; X.lineWidth = LW * .7; X.stroke(); }
    leg([98, 68 + by], 1.1, P.lp, C[0], false); // 앞쪽 뒷다리
    // 앞 날개 (목 뒤)
    wing(sh, P.wa, C[0], C[3], false);
    // 목: 어깨에서 머리 자리로 휘어진 관, 배 쪽은 밝게
    const base = [58, 52 + by], hd = add(P.nk, [0, by * .5]), ctrl = [base[0] - 16, (base[1] + hd[1]) / 2 + 6], spine = qbez(base, ctrl, add(hd, [6, 2]), 8);
    for (let i = 1; i < 6; i++) { const p = spine[i], q = spine[i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]) - Math.PI / 2, tipP = add(p, [Math.cos(a) * 12, Math.sin(a) * 12]); part(poly([rot(add(p, [-3, 0]), p, a + Math.PI / 2), tipP, rot(add(p, [3, 0]), p, a + Math.PI / 2)]), C[4]); }
    part(tube(spine, lerpN(13, 7, 9)), C[0]);
    part(tube(spine.slice(1, 8).map(p => add(p, [3, 2])), lerpN(6.5, 3.2, 7)), C[2]);
    head(add(hd, [2, 1]), P.ha, P.jaw, C, A);
    leg([60, 72 + by], 1.05, -P.lp, C[0], true); // 앞쪽 앞다리
  }

  // ── 픽셀로 줄이기 (minidoll.js px32와 같은 규칙: 어두운 선 우선 · 눈 색 살리기) ──
  const SS = 6, hi = document.createElement('canvas'), hx = hi.getContext('2d', { willReadFrequently: true });
  function bake(C, A, fk, i, n) {
    const H = A.H, Wd = Math.round(H * 1.62), h = H + 2, k = H * SS / 100;
    hi.width = Wd * SS; hi.height = h * SS; X = hx; hx.setTransform(1, 0, 0, 1, 0, 0); hx.clearRect(0, 0, hi.width, hi.height);
    LW = 1.15 * 100 / H; // 외곽선 ≈ 1.15px (줄인 뒤)
    hx.setTransform(k, 0, 0, k, (Wd * SS - 160 * k) / 2, SS);
    drawPose(pose(fk, i, n), C, A);
    const src = hx.getImageData(0, 0, hi.width, hi.height).data, HW = hi.width, N = SS * SS, px = new Uint32Array(Wd * h);
    const eye = [parseInt(C[5].slice(1, 3), 16), parseInt(C[5].slice(3, 5), 16), parseInt(C[5].slice(5, 7), 16)];
    for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < Wd; cx++) {
      let cov = 0, dk = 0, dr = 0, dg = 0, db = 0, fa = 0, fr = 0, fg = 0, fb = 0, ec = 0;
      for (let yy = 0; yy < SS; yy++) { let j = ((cy * SS + yy) * HW + cx * SS) * 4; for (let xx = 0; xx < SS; xx++, j += 4) {
        if (src[j + 3] < 128) continue; cov++; const r = src[j], g = src[j + 1], b = src[j + 2], L = .3 * r + .59 * g + .11 * b;
        if (Math.abs(r - eye[0]) + Math.abs(g - eye[1]) + Math.abs(b - eye[2]) < 40) ec++;
        if (L < 60) { dk++; dr += r; dg += g; db += b; } else { fa++; fr += r; fg += g; fb += b; }
      } }
      if (cov < N * .43) continue;
      const o = cy * Wd + cx;
      px[o] = ec >= N * .18 ? rgb(...eye) : dk >= N * .38 || !fa ? rgb(dr / dk, dg / dk, db / dk) : rgb(fr / fa, fg / fa, fb / fa);
    }
    const ink = rgb(196, 40, 36), solid = px.slice(); // 1px 붉은 외곽선 (몬스터)
    for (let y = 0; y < h; y++) for (let x = 0; x < Wd; x++) { const q = y * Wd + x; if (solid[q]) continue; if ((x > 0 && solid[q - 1]) || (x < Wd - 1 && solid[q + 1]) || (y > 0 && solid[q - Wd]) || (y < h - 1 && solid[q + Wd])) px[q] = ink; }
    let foot = h - 1; find: for (; foot > 0; foot--) for (let x = 0; x < Wd; x++) if (px[foot * Wd + x]) break find;
    let top = 0; find2: for (; top < h; top++) for (let x = 0; x < Wd; x++) if (px[top * Wd + x]) break find2;
    return { w: Wd, h, foot, px, top, native: true };
  }

  // 용 하나의 그림 묶음: 동작 → 프레임(그림 객체, 늘 같은 객체라 다시 칠하기 계산이 한 번이다)
  const FR = { idle: 4, run: 4, w0: 1, w1: 1, hit: 1 }, cache = new Map();
  function of(e) {
    const n = e.n || '', key = colorOf(n) + ':' + ageOf(n); let d = cache.get(key); if (d) return d;
    const C = COLORS[colorOf(n)], A = AGE[ageOf(n)], spr = {};
    for (const fk in FR) spr[fk] = Array.from({ length: FR[fk] }, (_, i) => bake(C, A, fk, i, FR[fk]));
    const s0 = spr.idle[0];
    d = { w: s0.w, h: s0.h, foot: s0.foot, top: s0.top, spr, fr: Object.fromEntries(Object.entries(spr).map(([k, l]) => [k, l.map(s => s.px)])), hop: false, native: true };
    cache.set(key, d); return d;
  }
  return { of, bake, COLORS, AGE };
})();
