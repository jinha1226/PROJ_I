'use strict';
// 게임 연결: 실제 로직 시작 · 타격 연출 훅 · 시험용 주소
// ───── 시작 상태: 실제 게임 로직 그대로 ─────
let shakeT = 0;
G.quiet = false; G.DICE_ALL = q.get('dice') === 'all'; G.ISO = true; G.CHECK_DC = +q.get('dc') || 0; // ?dc=10 : 판정을 어렵게 (실패 장면 보기)
const J = G.J, now = () => performance.now();
J.hit = (id, e, power = 0, from) => { e._hit = now(); e._hitP = power; if (power > .5) shakeT = now();
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
G.newState();
const f = G.S.w.fantasy;
f.autoTr = false;
const LV = +(q.get('lv') || 7), LEAD = G.Guild.leader(f); f.leaderNew = false;
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
if (TUT_ON) { f.mercs = []; G.Tut.start(f, G.Fantasy.rt(f)); } else if (q.get('go')) G.Exp.depart(f, G.Fantasy.rt(f));
const rt = () => G.Fantasy.rt(f);
G.isoFx = (id, ex, ey, o) => pfx(id, wx(ex), wy(ey), (o && o.z) || 0, o || {});
// 시험용: ?scene=door&nat=20 — 잠시 뒤 그 장면을 바로 연다 (nat: 주사위 고정. 20 성공 · 2 실패)
if (q.get('scene')) setTimeout(() => { const r0 = rt(), Rm = r0.map.rooms.find(o => G.Fantasy.inRoom(o, r0.hero)) || r0.map.rooms[0]; if (q.get('nat')) G.Dnd.d20 = () => +q.get('nat'); f.carry = 1e6; r0.scene = null; G.Story.play(f, r0, r0.ex, Rm, q.get('scene')); }, 1500);
// 무덤: 죽은 자리에 남는다
const graves = []; const die0 = G.Story.die;
G.Story.die = function (ff, r, p) { graves.push({ x: p.x, y: p.y, map: r.map }); pfx('spawn/soul-rise', wx(p._dx ?? p.x), wy(p._dy ?? p.y), 0, { body: p }); return die0.call(this, ff, r, p); };
