'use strict';
// 공용 유틸리티: 난수, 큰 수 표기, 이벤트
var G = {};

G.SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

const U = G.U = {
  rand: n => Math.floor(Math.random() * n),
  chance: p => Math.random() < p,
  pick: a => a[Math.floor(Math.random() * a.length)],
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  // 가중치 뽑기: list의 각 원소에서 w(원소)를 가중치로 쓴다
  wpick(list, w) {
    let tot = 0;
    for (const x of list) tot += w(x);
    let r = Math.random() * tot;
    for (const x of list) { r -= w(x); if (r <= 0) return x; }
    return list[list.length - 1];
  },
  fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + U.fmt(-n);
    if (n < 1000) {
      if (n < 100 && n % 1 !== 0) return (Math.floor(n * 10) / 10).toString();
      return Math.floor(n).toString();
    }
    const e = Math.floor(Math.log10(n) / 3);
    if (e >= G.SUFFIX.length) return n.toExponential(2).replace('+', '');
    const v = n / Math.pow(1000, e);
    const s = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v).toString();
    return s + G.SUFFIX[e];
  },
  pct: (v, d = 0) => (v * 100).toFixed(d) + '%',
  fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h) return `${h}시간 ${m}분`;
    if (m) return `${m}분 ${s}초`;
    return `${s}초`;
  },
};

// 이벤트: 로직은 emit만 하고, 화면은 on으로 듣는다. 오프라인 계산 중(quiet)에는 보내지 않는다.
G.quiet = false;
G.handlers = {};
G.on = (type, fn) => (G.handlers[type] = G.handlers[type] || []).push(fn);
G.emit = (type, data) => {
  if (G.quiet) return;
  for (const fn of G.handlers[type] || []) fn(data);
};
G.log = (msg, world, cls) => G.emit('log', { msg, world, cls });
