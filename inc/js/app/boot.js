'use strict';
// 새 게임 시작 (2026-11-17 2단계): 옛 legacy/iso/game.js에서 그리기에 필요한 부분(타격감 · 타격 연출 연결 · 무덤)만 가져오고,
// 옛 원정 · 길드 단장 만들기 · 튜토리얼 · 저장은 뺐다. 시험 층에 파티를 세운다. 주소: ?fight=test (방 하나에 적 셋) · ?end=won|lost (층 끝 화면 자리)
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
G.isoFx = (id, ex, ey, o) => pfx(id, wx(ex), wy(ey), (o && o.z) || 0, o || {});
// 무덤: 죽은 자리에 남는다
const graves = []; const die0 = G.Story.die;
G.Story.die = function (ff, r, p) { graves.push({ x: p.x, y: p.y, map: r.map }); pfx('spawn/soul-rise', wx(p._dx ?? p.x), wy(p._dy ?? p.y), 0, { body: p }); return die0.call(this, ff, r, p); };

// ───── 시험 층 ─────
// 'floor': 방 넷을 복도로 이은 층 (옛 튜토리얼 지도 모양) · 'fight': 방 하나
const TestFloor = (() => {
  const LAYOUT = {
    floor: { w: 36, h: 15, rooms: [['A', '입구', 2, 4, 6, 6], ['B', '곁방', 11, 2, 6, 5], ['C', '안쪽 방', 13, 9, 6, 5], ['D', '계단 방', 24, 3, 9, 8]], links: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D']] },
    fight: { w: 20, h: 14, rooms: [['H', '복도', 1, 6, 4, 3], ['A', '전투 방', 6, 2, 12, 10]], links: [['H', 'A']] }, // 복도로 들어와 방에서 맞닥뜨린다
    door: { w: 24, h: 16, rooms: [['H', '복도', 1, 6, 8, 4], ['A', '고블린 방', 10, 2, 12, 12]], links: [['H', 'A']] }, // 문 앞 준비: 복도 끝 잠긴 문 (9, 8) 너머 고블린 방
  };
  function build(kind = 'floor') {
    const L = LAYOUT[kind], W = L.w, H = L.h, c = new Array(W * H).fill('#'), ix = (x, y) => y * W + x, cut = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) c[ix(x, y)] = '.'; };
    const rooms = L.rooms.map(([id, title, x, y, w, h]) => { for (let v = y; v < y + h; v++) for (let u = x; u < x + w; u++) cut(u, v); return { id, title, x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), tags: ['hall'] }; });
    const by = id => rooms.find(r => r.id === id);
    for (const [a, b] of L.links) { const p = by(a), q = by(b); let x = p.cx, y = p.cy; while (x !== q.cx) { cut(x, y); x += Math.sign(q.cx - x); } while (y !== q.cy) { cut(x, y); y += Math.sign(q.cy - y); } cut(x, y); }
    const start = rooms[0], end = rooms[rooms.length - 1];
    if (kind === 'floor') c[ix(end.cx, end.cy)] = '>';
    return { w: W, h: H, c, kindAt: new Uint8Array(W * H), poi: {}, passChars: '.>,', ver: 1, dist: {}, rooms, start, end, fixed: true, title: kind === 'fight' ? '시험 전투' : '시험 층' };
  }
  // 파티: 파이터 + 소서러 · 클레릭, 3레벨 (3단계에서 G.Char로 바꾼다). 적: fight일 때 셋
  // picks (탐사 층): 선술집에서 고른 사람들(첫 사람이 앞장) 또는 직업 이름들 — 판마다 새 모험가, 1레벨
  function world(kind = 'floor', map0 = null, picks = null) {
    G.newState();
    const f = G.S.w.fantasy, adopt = p => (typeof p === 'string' ? (m => { if (m.lv >= 3) m.adv = Object.keys(G.D.ADV).find(k => G.D.ADV[k].base === p) || null; return G.Party.forge(m); })(G.Party.trim(G.Guild.make(f, p, { lv: G.Party.START_LV, ab: G.Party.stdAb(p) }))) : { ...p, uid: f.nextUid = (f.nextUid || 0) + 1, lv: Math.max(G.Party.START_LV, p.lv || 1), xp: 0 });
    if (picks && typeof picks[0] !== 'string') f.leader = { ...adopt(picks[0]), lead: true };
    const L = G.Guild.leader(f);
    const lv = kind === 'crawl' ? G.Party.START_LV : 3; // 탐사 층은 시작 레벨에서 전투로 큰다 · 시험 장면은 3레벨
    f.leaderNew = false; f.autoTr = f.autoParty = false; f.askMeet = false; L.lv = lv;
    const ms = kind === 'crawl' ? (picks || []).slice(1).map(adopt) : ['mage', 'cleric'].map(c => G.Guild.make(f, c, { lv })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); // 탐사 층: 선술집에서 고른 파티 (던전 안 영입은 없다)
    f.floor = f.maxFloor = f.start = f.checkpoint = 1; f.town = true;
    if (kind === 'crawl') G.Party.members(f).forEach(m => G.Party.place(f, m)); // 전투 자리 (클레릭은 앞줄)
    const r = G.Fantasy.rt(f); G.Fantasy.syncAllies(f);
    f.town = false; r.phase = 'explore'; r.turn = null; r.mons = []; r.chests = []; r.fields = [];
    const m = r.map = map0 || build(kind), s = m.start;
    r.party.forEach((p, i) => { p.x = s.cx - 1 + i; p.y = s.cy + (i % 2); p._dx = p._rx = p.x; p._dy = p._ry = p.y; });
    if (kind === 'door') { // 문 앞 준비 시험: 문은 닫혀 있고(벽 칸) 방은 아직 안 보인다. 적은 잠들었거나 모른다
      const A = m.rooms.find(q => q.id === 'A'); m.door = { x: 9, y: 8 }; G.Floor.setTiles(m, [m.door.y * m.w + m.door.x], '#');
      [['고블린 졸개', A.x + 3, A.cy - 2], ['고블린 졸개', A.x + 5, A.cy + 2], ['홉고블린', A.x + 8, A.cy]].forEach(([n, x, y]) => { const nm = G.D.F.mon[n] ? n : Object.keys(G.D.F.mon)[0]; G.Fantasy.spawnMon(r, 1, { n: nm, ...G.D.F.mon[nm] }, x, y, false, { major: true }); });
      for (const o of r.mons) { o.aggro = false; o.spotted = false; } G.Prep.prime(r.mons);
      r.seen = new Uint8Array(m.w * m.h); for (let y = 5; y <= 10; y++) for (let x = 0; x <= 9; x++) r.seen[y * m.w + x] = 1; r.seenVer = (r.seenVer || 0) + 1;
      G.Fantasy.refreshEnts(r); return { f, r };
    }
    if (kind === 'fight') {
      const names = ['고블린 졸개', '고블린 졸개', '홉고블린'].map(n => G.D.F.mon[n] ? n : Object.keys(G.D.F.mon)[0]);
      const A = m.rooms.find(q => q.id === 'A') || s;
      names.forEach((n, i) => G.Fantasy.spawnMon(r, 1, { n, ...G.D.F.mon[n] }, A.x + A.w - 3, A.y + 2 + i * 2, false, { major: true, spotted: true }));
    }
    r.seen = new Uint8Array(m.w * m.h).fill(1); r.seenVer = (r.seenVer || 0) + 1;
    G.Fantasy.refreshEnts(r); if (G.Sight?.update) G.Sight.update(r);
    return { f, r };
  }
  return { build, world };
})();
// 탐사 층 (3단계): 지도 시제품의 생성기 · 규칙으로 한 층 (CRAWL). ?fight=test는 시험 전투 방, ?seed=숫자로 같은 층
G.Reward.on = true; // 새 게임: 경험치 3배 · 레벨업은 고르기 (설계 5-12)
const TEST_FIGHT = !!q.get('fight'); // ?fight=test: 탐사 층 없이 시험 전투 방 하나
const SCENE = q.get('scene'); // ?scene=door: 문 앞 준비 시험 (복도 + 잠긴 문 + 고블린 방)
G.Turn.smooth = !q.get('steps'); // 흐르는 턴제 (?steps=1이면 옛 방식: 범위 칠하기 · 차례마다 쉼)
// 선술집 (ROGUELIKE_PLAN 0-0): 판은 선술집에서 파티를 골라 시작한다. 고른 파티는 화면을 다시 열며 넘어온다 (TAVERNUI.takeParty).
// ?seed= · ?auto= · ?party=직업,직업 이면 선술집 없이 바로 층으로 (시험 · 캡처용 — 기본은 파이터 · 클레릭)
const PICKS = TAVERNUI.takeParty() || (q.get('party') || q.get('seed') || q.get('auto') ? (q.get('party') || 'dragoon,cleric').split(',') : null);
const TAVERN = !PICKS && !SCENE && !TEST_FIGHT;
const W0 = SCENE === 'door' ? TestFloor.world('door') : SCENE === 'reward' ? TestFloor.world('fight') : TEST_FIGHT ? TestFloor.world('fight') : TestFloor.world('crawl', CRAWL.start(+q.get('seed') || ((Math.random() * 1e6) | 0), PICKS || ['dragoon']), PICKS);
if (SCENE === 'door') CRAWL.doorTest(W0.r); else if (SCENE === 'reward') CRAWL.rewardTest(W0.r); else if (TAVERN) { TAVERNUI.open(W0.f, CRAWL.renown()); TITLEUI.open(W0.f, null); /* 타이틀은 선술집 위에 덮는다 (이 탭에서 처음 열 때만) */ } else if (!TEST_FIGHT) CRAWL.attach(W0.r); else CRAWL.fightTest(W0.r);
const f = W0.f, rt = () => W0.r;
addEventListener('error', e => { document.body.dataset.err = String(e.message || e); });
if (q.get('end')) document.addEventListener('DOMContentLoaded', () => { const d = document.createElement('div'); d.className = 'record-stub'; d.textContent = '층 끝 화면 자리 (7단계)'; document.body.append(d); });

