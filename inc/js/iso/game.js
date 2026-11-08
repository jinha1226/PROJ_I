'use strict';
// 게임 연결: 실제 로직 시작 · 타격 연출 훅 · 시험용 주소
// ───── 시작 상태: 실제 게임 로직 그대로 ─────
// 타격감 (Nuclear Throne · "The Art of Screenshake"): 흔들림은 값이 쌓였다가 빠르게 줄고(trauma), 맞은 쪽으로 화면이 밀렸다 돌아오며(kick),
// 치명타 · 처치 순간 게임 시간이 잠깐 멈춘다(hitstop). 큰 전투에서 계속 흔들리지 않게 상한 · 쿨다운을 둔다. ?noshake 또는 '동작 줄이기'면 끈다
const JU = { tr: 0, kx: 0, ky: 0, stop: 0, stopCd: 0, off: q.has('noshake') || matchMedia('(prefers-reduced-motion: reduce)').matches,
  add(a) { if (!this.off) this.tr = Math.min(1, this.tr + a); },
  push(dx, dy, px) { if (this.off) return; const l = Math.hypot(dx, dy) || 1; this.kx += dx / l * px; this.ky += dy / l * px; const m = Math.hypot(this.kx, this.ky); if (m > 10) { this.kx *= 10 / m; this.ky *= 10 / m; } },
  freeze(ms) { const n = now(); if (this.off || n < this.stopCd) return; this.stop = Math.max(this.stop, n + ms); this.stopCd = n + ms + 220; }, // 멈춤끼리 붙지 않게
  frozen() { return now() < this.stop; },
  // 매 프레임: 화면 이동량 (CSS px). 흔들림 = trauma² × 최대 8px
  step(dt) { const s = this.tr * this.tr * 8, o = [this.kx + (Math.random() * 2 - 1) * s, this.ky + (Math.random() * 2 - 1) * s]; // 이번 프레임은 쌓인 그대로 보이고, 줄어드는 건 다음부터
    dt = Math.min(dt, .05); this.tr = Math.max(0, this.tr - dt * 1.8); const k = Math.exp(-dt * 14); this.kx *= k; this.ky *= k; return o; },
};
G.quiet = false; G.DICE_ALL = q.get('dice') === 'all'; G.ISO = true; G.CHECK_DC = +q.get('dc') || 0; // ?dc=10 : 판정을 어렵게 (실패 장면 보기)
const J = G.J, now = () => performance.now();
J.hit = (id, e, power = 0, from, dmg = 0) => { e._hit = now(); e._hitP = power;
  if (win.map && inWin(e.x, e.y)) { // 화면 안 타격만
    const R = rt(), crowd = (R?.party?.length || 0) + (R?.mons?.filter(o => o.hp > 0 && o.aggro).length || 0), damp = crowd > 16 ? 16 / crowd : 1; // 큰 전투: 한 대 한 대는 작게
    const mon = e.kind === 'mon', kill = mon ? e.hp <= 0 : dmg >= e.hp, r = Math.min(1, dmg / (e.max || 1)), big = mon && (e.boss || e.major && e.s >= 2), me = !mon && (e.merc || e === rt()?.hero);
    // 쌓는 양: 체력 대비 피해 · 치명타 · 처치. 우리 편이 맞으면 더 크게 (위기감)
    JU.add((.05 + r * (me ? .7 : .45) + (power >= .25 ? .15 : 0) + (kill ? .2 : 0)) * damp + (kill && big ? .55 : 0));
    if (from) { const a = project(wx(from.x), wy(from.y), 0), b = project(wx(e.x), wy(e.y), 0); JU.push(b.sx - a.sx, b.sy - a.sy, (2.5 + r * 6 + (kill ? 3 : 0) + (power >= .25 ? 2 : 0)) * damp); }
    if (kill && big) JU.freeze(160); else if (damp < 1) { if (me && e === R?.hero && r > .3) JU.freeze(55); } // 큰 전투는 큰 놈 처치 · 단장 위기만 멈춘다
    else if (kill) JU.freeze(70); else if (power >= .25) JU.freeze(45); else if (me && r > .3) JU.freeze(55);
  }
  if (win.map && inWin(e.x, e.y)) { const flip = !!from && (from.x - from.y) > (e.x - e.y), ex = wx(e._dx == null ? e.x : e._dx), ey = wy(e._dy == null ? e.y : e._dy); pfx(power >= .25 ? 'impacts/crit-hit' : e.kind === 'mon' ? 'impacts/hit-spark' : 'impacts/blunt-hit', ex, ey, Z_CHEST, { flip, k: 1.3 }); } if (win.map && inWin(e.x, e.y)) { const p = project(wx(e._dx == null ? e.x : e._dx), wy(e._dy == null ? e.y : e._dy), 1.4); spark(p.sx, p.sy, 8 + power * 14 | 0, e.kind === 'mon' ? [rgb(255, 250, 220), rgb(255, 210, 90), rgb(240, 130, 60)] : [rgb(190, 40, 44), rgb(236, 90, 70), rgb(255, 220, 200)]); } if (from) { const dx = e.x - from.x, dy = e.y - from.y, l = Math.hypot(dx, dy) || 1; e._kx = dx / l; e._ky = dy / l; } };
J.lunge = (id, a, tg) => {
  const dx = tg.x - a.x, dy = tg.y - a.y, l = Math.hypot(dx, dy) || 1; a._lu = now(); a._lx = dx / l; a._ly = dy / l;
  // 근접 공격의 궤적. 같은 편에게 쓰는 치유 · 원거리는 그리지 않는다
  if (!win.map || a.kind !== 'mon' && tg.kind !== 'mon') return;
  const ranged = a.kind === 'mon' ? G.Foe.ranged(a) : a.def && a.def.range >= 2; if (ranged || l > 3.5) return;
  const flip = (tg.x - tg.y) < (a.x - a.y), ax = wx(a._dx == null ? a.x : a._dx), ay = wy(a._dy == null ? a.y : a._dy);
  if (a.kind === 'mon') { const beast = STYLE(a.n || '') === 'quad'; pfx(beast ? 'melee/claw-swipe' : 'melee/sword-slash', ax, ay, 0, { flip, k: 1.5, palette: FOE_SLASH }); }
  else { const id2 = SWING[(a.merc || f.leader).cls] || 'melee/sword-slash'; pfx(id2, ax, ay, 0, { flip, k: id2 === 'melee/heavy-cleave' ? 2.2 : 1.4 }); }
};
// 저장 (DESIGN.md 137): 시험용 주소가 아니면 이어서 한다. 옛 화면(index.html)의 저장과 섞지 않는다
G.SAVE_KEY += '_iso';
const TEST_URL = ['lv', 'fl', 'crew', 'go', 'scene', 'front', 'tut'].some(k => q.get(k));
let SAVE_ON = !TEST_URL;
const LOADED = SAVE_ON && !!G.load();
if (!LOADED) G.newState();
const f = G.S.w.fantasy;
f.autoTr = false;
if (!LOADED) {
  const LV = +(q.get('lv') || 7), LEAD = G.Guild.leader(f); f.leaderNew = !TEST_URL; // 새 게임은 단장 만들기부터 (src/create.js)
  f.gold = +(q.get('gold') || 0); LEAD.lv = LV; // 금화를 많이 주면 자동 강화로 피해가 몇 배가 된다. 측정이 어긋나므로 기본은 0 (?gold=로 준다)
  // 시험용 파티: 단장 + 직업 넷 (주소의 crew로 바꾼다)
  for (const cls of (q.get('crew') || 'cleric,archer,archmage').split(',')) f.mercs.push(G.Guild.make(f, cls, { lv: LV }));
  G.Fantasy.syncAllies(f);
  const startFl = +(q.get('fl') || 6);
  f.floor = f.maxFloor = startFl; f.checkpoint = f.start = startFl; f.town = true; f.townT = 99;
  f.dmStyle = q.get('dm') || 'steady';
  f.autoGo = false; // 출발은 원정 선택에서 (?go=1이면 바로)
  // 주소에 시험용 값이 없으면 새 게임: 튜토리얼로 시작한다
  if (q.get('front')) f.frontLock = f.front = q.get('front');
  const TUT_ON = q.get('tut') || !['lv', 'fl', 'crew', 'go', 'scene', 'front'].some(k => q.get(k));
  if (f.leaderNew) f.mercs = []; else if (TUT_ON) { f.mercs = []; G.Tut.start(f, G.Fantasy.rt(f)); } else if (q.get('go')) G.Exp.depart(f, G.Fantasy.rt(f));
} else G.Fantasy.syncAllies(f);
// 저장: 15초마다 · 떠날 때 · 가려질 때. 원정 중에 불러오면 그 층의 처음부터다
if (SAVE_ON) { setInterval(() => { if (SAVE_ON) G.save(); }, 15000); addEventListener('beforeunload', () => { if (SAVE_ON) G.save(); }); document.addEventListener('visibilitychange', () => { if (SAVE_ON && document.hidden) G.save(); }); }
G.newGame = () => { SAVE_ON = false; try { localStorage.removeItem(G.SAVE_KEY); } catch (e) { /* 저장소 없음 */ } location.href = location.pathname; };
const rt = () => G.Fantasy.rt(f);
G.isoFx = (id, ex, ey, o) => pfx(id, wx(ex), wy(ey), (o && o.z) || 0, o || {});
// 시험용: ?scene=door&nat=20 — 잠시 뒤 그 장면을 바로 연다 (nat: 주사위 고정. 20 성공 · 2 실패)
if (q.get('scene')) setTimeout(() => { const r0 = rt(), Rm = r0.map.rooms.find(o => G.Fantasy.inRoom(o, r0.hero)) || r0.map.rooms[0]; if (q.get('nat')) G.Dnd.d20 = () => +q.get('nat'); f.carry = 1e6; r0.scene = null; G.Story.play(f, r0, r0.ex, Rm, q.get('scene')); }, 1500);
// 무덤: 죽은 자리에 남는다
const graves = []; const die0 = G.Story.die;
G.Story.die = function (ff, r, p) { graves.push({ x: p.x, y: p.y, map: r.map }); pfx('spawn/soul-rise', wx(p._dx ?? p.x), wy(p._dy ?? p.y), 0, { body: p }); return die0.call(this, ff, r, p); };
