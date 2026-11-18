'use strict';
// 사건 그리기 (화면 쪽): 규칙이 G.Feed에 넣은 일을 매 틱 꺼내 보여 준다 + 바닥에 놓인 것(기름 · 마름쇠)을 그린다.
// - 소리: 소리 난 곳에서 파문이 크기만큼 퍼진다 (클수록 진하게)
// - 적의 상태: 머리 위에 z · ? · ! · !! (아직 모르는 적 — 안 보이고 엿듣지도 않은 적은 그리지 않는다)
// - 기름: 마른 기름은 거무스름한 웅덩이, 타는 기름은 주황빛 + 불꽃. 마름쇠는 잿빛 가시
// - 판정: 굴린 사람 머리 위에 「따기 12 + 7 = 19 성공」처럼
const FXUI = (() => {
  const { $ } = UI;
  let R = null, anim = [], extra = () => []; // extra: 아직 엔진에 안 넣은 바닥 것 (문 앞 준비 중 놓은 것)
  const AW = { sleep: ['z', '#9fb4d8'], idle: ['?', '#e8d890'], alert: ['!', '#f0a050'], hunt: ['!!', '#ff5a40'] };
  const knownMon = e => e.kind !== 'mon' || e.spotted || e._known;
  const text = (x, y, s, col = '#f3e4c3', t = 1.3, sz = 0.85) => G.fx(R, { k: 'text', x, y: y - 1.15, s, col, t, sz });
  const TRY = { pick: '따기', kick: '걷어차기', knock: '노크', push: '열기' };
  function show(e) {
    switch (e.k) {
      case 'noise': if (e.n > 0) anim.push({ k: 'ripple', x: e.x, y: e.y, r: e.r, n: e.n, t: 0, T: 0.6 + e.r * 0.04 }); break;
      case 'aware': if (knownMon(e.who)) { const [s, col] = AW[e.to] || ['?', '#fff']; text(e.who.x, e.who.y, s, col, 1.4, 1.1); } break;
      case 'ignite': text(e.p.x, e.p.y, '기름이 타오른다!', '#ffb050', 1.6, 1); anim.push({ k: 'flash', x: e.p.x, y: e.p.y, t: 0, T: 0.6 }); break;
      case 'burn': text(e.e.x, e.e.y + 0.4, '불탄다', '#ff8a40', 1, 0.75); break;
      case 'caltrops': text(e.e.x, e.e.y, '마름쇠!', '#d0d0d0', 1.2, 0.9); break;
      case 'dodge': text(e.e.x, e.e.y, '마름쇠를 피했다', '#a0a0a0', 1, 0.75); break;
      case 'listen': text(e.who.x, e.who.y, e.clue ? '단서로 안다' : `지각 ${e.nat} + ${e.mod} = ${e.nat + e.mod} / ${e.dc} ${e.ok ? '들었다' : '흐릿하다'}`, e.ok ? '#9fe08a' : '#c0b090', 2.2, 0.8); break;
      case 'try': text(e.who.x, e.who.y, e.nat == null ? `${TRY[e.id] || e.n}` : `${TRY[e.id] || e.n} ${e.nat} + ${e.mod} = ${e.nat + e.mod} / ${e.dc} ${e.ok ? '성공' : '실패'}`, e.ok ? '#9fe08a' : '#ff8a70', 2.2, 0.8); break;
      case 'open': text(e.who.x, e.who.y - 0.3, '문이 열렸다!', '#f0c070', 1.6, 1); break;
    }
  }
  // 바닥 것 하나를 그린다
  function decal(p) {
    if (p.kind === 'oil') return p.lit ? `<path class="g-oil lit" d="${UI.ring(p.x, p.y, p.r)}"/>` : `<path class="g-oil" d="${UI.ring(p.x, p.y, p.r)}"/><path class="g-sheen" d="${UI.ring(p.x - 0.18, p.y - 0.12, p.r * 0.35, 12)}"/>`;
    if (p.kind === 'caltrops') { let s = `<path class="g-cal" d="${UI.ring(p.x, p.y, p.r)}"/>`; for (const [dx, dy] of [[0, 0], [-0.35, 0.15], [0.35, -0.1], [0.1, 0.38], [-0.15, -0.36]]) { const [X, Y] = UI.toStage(p.x + dx, p.y + dy); s += `<text class="g-spike" x="${X.toFixed(1)}" y="${Y.toFixed(1)}">✶</text>`; } return s; }
    return '';
  }
  function frame(dt) {
    if (!R) return;
    for (const e of G.Feed.take()) show(e);
    const ground = (R.terrain || []).concat(extra());
    // 타는 기름 위로 불꽃 (옛 엔진의 지형 불꽃과 같은 방식)
    for (const p of R.terrain || []) if (p.lit && Math.random() < dt * 9) G.fx(R, { k: 'tile', key: 'fx_flame', x: p.x + (Math.random() - 0.5) * p.r * 1.5, y: p.y + (Math.random() - 0.5) * p.r * 1.5, t: 0.45 });
    if (!ground.length && !anim.length) { const s = $('fxsvg'); if (s) s.innerHTML = ''; return; }
    let out = ground.map(decal).join('');
    anim = anim.filter(a => (a.t += dt) < a.T);
    for (const a of anim) {
      const q = a.t / a.T;
      if (a.k === 'ripple') for (const off of [0, 0.18, 0.36]) { const qq = q - off; if (qq <= 0) continue; out += `<path class="ripple" style="opacity:${((1 - qq) * Math.min(1, 0.25 + a.n / 12)).toFixed(2)};stroke-width:${(1 + a.n / 5).toFixed(1)}" d="${UI.ring(a.x, a.y, Math.max(0.2, Math.min(a.r, 14) * qq))}"/>`; } // 화면을 다 덮지 않게 그리는 크기는 14타일까지
      if (a.k === 'flash') out += `<path class="g-flash" style="opacity:${(1 - q).toFixed(2)}" d="${UI.ring(a.x, a.y, 0.8 + q * 1.4)}"/>`;
    }
    UI.svg('fxsvg', 2).innerHTML = out;
  }
  return { attach(rt) { R = rt; }, frame, show, set extra(f) { extra = f || (() => []); } };
})();
