'use strict';
// 튜토리얼 (DESIGN.md 103): 설명문이 없다. 처음엔 볼 것이 적고, 필요해지는 순간에 하나씩 나타난다.
// 던전은 손으로 짠 세 층이다 (js/tut_map.js, DESIGN.md 156). 규칙은 그대로이고, 무엇이 어디 있는지만 정해 둔다.
// 순서: ① 혼자 2층 오우거에게 진다 ② 마을: 신전 · 주점 · 모집소(한 명) ③ 2층 오우거를 이긴다 ④ 3층 계단의 자물쇠에 막힌다 ⑤ 열쇠를 가진 동료 한 명 → 문을 열면 끝
G.Tut = (() => {
  const SEED = 41, HOLD_PICKS = 2, PULSE_T = 2.6;
  const FLOORS = { 1: 'tut_bag', 2: 'tut_floor' };
  // 막힘 두 가지 (INCREMENTAL_PLAN 1-1 · 1-2): 화력의 벽 = 2층 계단의 오우거, 열쇠의 벽 = 3층 계단의 녹슨 철문 (도둑 도구)
  // 막히면 마을로 돌아오고, 모집소에 그 벽을 넘을 사람이 기다린다 (설명문 없이)
  const WALL_FL = 2, GATE_FL = 3, WALL_MON = '오우거', FIRST_STRESS = 60, WALL_LINE = '혼자선 못 이겨. 사람이 더 있어야 해.', FIRST_CREW = ['barbarian', 'dragoon', 'paladin', 'cleric'], FIRST_N = 1;
  const BRIEF = { board: 2, explore: 2, front: 3, order: 3, target: 4 };
  // 열쇠의 벽의 자물쇠: 단장이 못 여는 첫 번째. 모집소에는 그 열쇠를 가진 사람이 한 명 나온다 (DESIGN.md 154)
  const LOCKS = [
    { id: 'gate', ev: 'tut_gate', cls: 'rogue', has: m => G.Event.tools(m).some(x => x.includes('도둑 도구')) }, // 녹슨 철문 · 도둑 도구 (로그 · 범죄자)
    { id: 'seal', ev: 'tut_seal', cls: 'archmage', has: m => m.cls === 'archmage' }, // 비전 봉인 문 · 위저드
    { id: 'mark', ev: 'tut_mark', cls: 'scout', has: m => m.cls === 'scout' }, // 가시덩굴 벽 · 드루이드
  ];
  const st = f => f.tut || null;
  const T = {
    on: f => !!st(f)?.on,
    start(f, rt) {
      f.tut = { on: true, run: 1, picks: 0, got: {}, pulse: {} };
      f.mercs = []; f.lineup = []; // 만들기 화면에 있는 동안 빈 명단을 채운 사람을 비운다 (G.Guild 틱)
      G.Season.st(f).seed = SEED;
      const L = G.Guild.leader(f); L.lv = 1; L.pers = [];
      f.starter = 1; G.Fantasy.syncAllies(f); // 혼자 떠난다: 견습 레인저를 채우지 않는다 (G.Guild.tick)
      f.floor = f.maxFloor = f.start = f.checkpoint = 1; f.frontLock = f.front = 'tut'; f.askMeet = true; // 튜토리얼 던전 (G.TutMap)
      f.town = true; f.autoGo = false; G.Exp.depart(f, rt);
    },
    skip(f) { if (f.tut?.on) T.finish(f); },
    // 끝: 평소 규칙 · 일반 던전 1층부터
    finish(f) { const t = st(f); if (t) t.on = false; if (f.frontLock === 'tut') f.frontLock = null; if (f.front === 'tut') f.front = null; f.start = f.checkpoint = f.maxFloor = 1; if (f.town) f.floor = 1; },
    // 전투 · 화면 어디서든: 꺼져 있으면 전부 보인다
    has: (f, k) => !T.on(f) || !!st(f).got[k],
    brief: (f, k) => !T.on(f) || st(f).run >= BRIEF[k],
    newInBrief: (f, k) => T.on(f) && st(f).run === BRIEF[k],
    get(f, rt, k) { const t = st(f); if (t.got[k]) return; t.got[k] = 1; t.pulse[k] = PULSE_T; },
    pulsing: (f, k) => (st(f)?.pulse[k] || 0) > 0,
    // 첫 층의 사건은 정해져 있고, 첫 원정의 나머지 층엔 다른 사건이 없다
    eventFor: f => (T.on(f) && st(f).run === 1 ? FLOORS[f.floor] || 'none' : null),
    // 처음 두 번은 기다려 준다. 그 뒤로 시간제한이 보인다
    holdAsk: f => T.on(f) && st(f).picks < HOLD_PICKS,
    picked(f) { if (T.on(f)) { st(f).picks++; if (st(f).picks >= HOLD_PICKS) T.get(f, null, 'timer'); } },
    // 첫 원정의 오우거 층 계단에선 돌아갈지 꼭 묻는다
    askStairs: f => T.safe(f) && f.floor >= WALL_FL,
    // 첫 원정 1층 계단: 야영을 한 번 (G.Camp.auto). 그때 야영 단추가 나타난다
    campNow: (f, rt) => T.safe(f) && f.floor === 1 && rt.flow?.st === 'stairs' && rt.campOn !== rt.map,
    // 첫 원정에선 죽지 않는다
    safe: f => T.on(f) && st(f).run === 1,
    // 이번 자물쇠: 한 번 보면 그대로 (단장이 바뀌어도)
    lock(f) { const t = st(f), L = G.Guild.leader(f); return LOCKS.find(k => k.id === t?.lock) || LOCKS.find(k => !k.has(L)) || LOCKS[0]; },
    // 열쇠의 벽: 철문이 닫혀 있으면 계단에서 사건을 띄운다. true면 계단을 내려가지 않는다
    gate(f, rt) {
      const t = st(f); if (!t || !t.on || t.gateOpen || f.floor !== GATE_FL || t.run < 2) return false;
      if (t.gateBack) { t.gateBack = false; rt.gateAsk = null; G.Exp.home(f, rt, 'return'); return true; }
      if (rt.scene) return true;
      if (rt.gateAsk === rt.map) { rt.gateAsk = null; return true; } // 사건이 끝났는데 안 열렸으면 한 번 더 (다시 시도할 수 있다)
      rt.gateAsk = rt.map; t.lock = T.lock(f).id; t.gateSeen = true; const e = rt.map.end, Rm = rt.map.rooms.find(o => G.Fantasy.inRoom(o, { x: e.cx, y: e.cy })) || rt.map.rooms[0];
      G.Story.play(f, rt, rt.ex, Rm, 'event', G.Event.BY[T.lock(f).ev]);
      return true;
    },
    // 화력의 벽: 오우거를 계단 곁에 (G.TutMap.stage가 부른다). 싸움은 일반 전투와 같다 — 혼자면 거의 지고, 쓰러지면 다쳐서 돌아온다
    wall(f, rt) {
      const t = st(f), m = rt.map; if (!t || !t.on || t.ogreDown || f.floor !== WALL_FL) return;
      rt.wallMap = m;
      const e = m.end, near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [2, 0], [0, 2]].map(([dx, dy]) => [e.cx + dx, e.cy + dy]).filter(([x, y]) => G.Grid.pass(m, x, y));
      rt.wallMons = [];
      for (let i = 0; i < T.WALL_N; i++) { const [x, y] = near[i] || [e.cx, e.cy]; G.Fantasy.spawnMon(rt, f.floor, { n: WALL_MON, ...G.D.F.mon[WALL_MON] }, x, y, false, { major: true }); const o = rt.mons[rt.mons.length - 1]; if (o) { o.tutWall = true; if (t.ogreHp > 0) o.hp = Math.min(o.hp, t.ogreHp); rt.wallMons.push(o); } } // 지난번에 입힌 상처는 남는다 (같은 오우거)
    },
    // 벽은 지나칠 수 없다: 계단에 닿았는데 살아 있으면 싸운다 (방 밖에 서 있거나 서두르는 중이어도)
    wallFoe(f, rt) {
      const t = st(f); if (!t || !t.on || t.ogreDown || f.floor !== WALL_FL) return null;
      const w = rt.mons.filter(o => o.tutWall && o.hp > 0); for (const o of w) { o.aggro = true; o.spotted = true; }
      return w[0] || null;
    },
    // 첫 원정은 무너지지 않는다: 혼자 도망만 다니면 전투가 끝나지 않는다 (G.Story.stress)
    stressMax: f => (T.safe(f) ? FIRST_STRESS : 100),
    // 매 틱: 일어난 일을 보고 하나씩 드러낸다
    tick(f, rt, dt) {
      const t = st(f); if (!t || !t.on) return;
      for (const k in t.pulse) if (t.pulse[k] > 0) t.pulse[k] -= dt;
      if (f.town || !rt.party) return;
      // 죽은 몬스터는 rt.mons에서 바로 빠진다 (G.Fantasy.kill): 벽을 세울 때 받아 둔 목록으로 본다
      if (!t.ogreDown && rt.wallMap === rt.map && rt.wallMons?.length && rt.wallMons.every(o => o.hp <= 0)) t.ogreDown = true;
      const walls = rt.mons.filter(o => o.tutWall && o.hp > 0), ogre = walls.find(o => o.aggro) || walls[0];
      if (ogre) t.ogreHp = ogre.hp;
      // 혼자 오우거와 싸우다 밀리면 한마디 한다 (대사만 — 결과는 일반 전투대로)
      if (ogre?.aggro && rt.turn) { t.wallMet = true; const p = rt.party.find(q => q.merc && !q.dead && !q.dying); if (!t.wallSay && rt.party.filter(q => q.merc).length === 1 && p && p.hp <= (p.max || 1) * 0.5) { t.wallSay = 1; G.Banter.say(rt, p, WALL_LINE, { pri: true, hold: true }); } }
      if (rt.turn) t.fought = true; else if (t.fought) T.get(f, rt, 'speed');
      if (f.floor >= 2) T.get(f, rt, 'map');
      if (G.Exp.carry(f) > 0) T.get(f, rt, 'haul');
      for (const p of rt.party) if (p.merc) { if (p.lastSk || p.lastBonus) T.get(f, rt, 'skills'); if ((p.merc.stress || 0) >= 1) T.get(f, rt, 'stress'); }
    },
    // 마을 (DESIGN.md 155): 첫 원정 전엔 영지를 건너뛰고, 처음 돌아오면 영지가 열린다
    townOpen: f => !T.on(f) || st(f).run >= 2,
    // 지금 빛낼 곳: 다친 사람이 있으면 신전 → 스트레스가 있으면 주점 → 값 없는 동료가 있으면 모집소 → 출정 (금화가 모자라면 건너뛴다)
    townStep(f) {
      if (!T.on(f) || !f.town || !T.townOpen(f)) return null;
      const GD = G.Guild, crew = GD.crew(f);
      if (crew.some(m => m.inj > 0 && f.gold >= GD.treatCost(m))) return 'temple';
      if (crew.some(m => m.stress > 0 && m.drank !== (f.lastHome || 0) && f.gold >= GD.drinkCost(m))) return 'pub';
      if (GD.tavern(f).offers.some(o => o.tut)) return 'tavern';
      return 'embark';
    },
    // 마을로 돌아왔다: 다음 원정에 볼 것이 늘어난다. 자물쇠를 열고 돌아오면 끝
    home(f) {
      const t = st(f); if (!t || !t.on) return; t.run++;
      if (t.gateOpen) { T.finish(f); return; }
      f.checkpoint = f.start = 1; // 튜토리얼 던전은 늘 1층부터 (세 층뿐)
      // 막힌 벽을 넘을 사람이 모집소에 한 명 기다린다 (값 없이). 화력의 벽이면 첫 동료, 열쇠의 벽이면 그 자물쇠의 열쇠를 가진 사람
      const L = G.Guild.leader(f), have = c => f.mercs.concat(L).some(m => m.cls === c), want = [], K = T.lock(f), key = K.has;
      if (!t.ogreDown || !f.mercs.length) { for (const c of FIRST_CREW) if (!have(c) && want.length < FIRST_N) want.push(c); } // 혼자 오우거를 잡았어도 첫 동료는 한 명 온다
      else if (t.gateSeen && !t.gateOpen && !f.mercs.concat(L).some(key)) want.push(K.cls);
      // 첫 동료는 이번 자물쇠의 열쇠(도둑 도구 · 범죄자 배경 등)를 들고 오지 않는다: 열쇠의 벽은 따로 겪는다
      if (want.length) { const T0 = G.Guild.tavern(f); for (const c of want) { let m = G.Guild.make(f, c, { lv: L.lv }); for (let i = 0; i < 20 && c !== K.cls && key(m); i++) m = G.Guild.make(f, c, { lv: L.lv }); T0.offers.unshift({ m, price: 0, tut: true }); } t.hire = want.length; if (want.includes(K.cls) && t.ogreDown) t.keyHint = true; }
    },
    PULSE_T, LOCKS, WALL_N: 1, // SRD 오우거 한 마리 (시험값 · test/wall_lab.js)
  };
  return T;
})();
