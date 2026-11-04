'use strict';
// 튜토리얼 (DESIGN.md 103): 설명문이 없다. 처음엔 볼 것이 적고, 필요해지는 순간에 하나씩 나타난다.
// 첫 원정은 짧은 대본이고 죽지 않는다. 일부러 잘못 세운 진형과 밟은 함정이 다음 원정 화면의 이유가 된다.
G.Tut = (() => {
  const SEED = 41, FIRST_FLOORS = 3, HOLD_PICKS = 2, PULSE_T = 2.6;
  const FLOORS = { 1: 'tut_bag', 2: 'tut_floor' };
  // 원정 화면에서 몇 번째 원정부터 보이나
  const JOIN = { 2: 'archer', 3: 'mage' };
  const BRIEF = { board: 2, explore: 2, front: 3, order: 3, target: 4 };
  const st = f => f.tut || null;
  const T = {
    on: f => !!st(f)?.on,
    start(f, rt) {
      f.tut = { on: true, run: 1, picks: 0, got: {}, pulse: {} };
      G.Season.st(f).seed = SEED;
      const L = G.Guild.leader(f); L.lv = 1; L.pers = [];
      const c = G.Guild.make(f, 'cleric', { lv: 1 }); c.pers = []; f.mercs.push(c); f.lineup = [c.uid]; G.Fantasy.syncAllies(f);
      f.tut.healer = c.uid;
      G.Fantasy.setCell(f, c.uid, 1); G.Fantasy.setCell(f, L.uid, 7); // 일부러: 치유사가 맨 앞, 단장이 뒤
      f.floor = f.maxFloor = f.start = f.checkpoint = 1; f.frontLock = null; f.front = Object.keys(G.D.F.factions).find(k => k !== 'swamp'); f.askMeet = true;
      f.town = true; f.autoGo = false; G.Exp.depart(f, rt);
    },
    skip(f) { if (f.tut) f.tut.on = false; },
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
    // 첫 원정의 3층 계단에선 돌아갈지 꼭 묻는다
    askStairs: f => T.safe(f) && f.floor >= FIRST_FLOORS,
    // 첫 원정에선 죽지 않는다
    safe: f => T.on(f) && st(f).run === 1,
    // 매 틱: 일어난 일을 보고 하나씩 드러낸다
    tick(f, rt, dt) {
      const t = st(f); if (!t || !t.on) return;
      for (const k in t.pulse) if (t.pulse[k] > 0) t.pulse[k] -= dt;
      if (f.town || !rt.party) return;
      if (rt.turn) t.fought = true; else if (t.fought) T.get(f, rt, 'speed');
      if (f.floor >= 2) T.get(f, rt, 'map');
      for (const p of rt.party) if (p.merc) { if (p.lastSk || p.lastBonus) T.get(f, rt, 'skills'); if ((p.merc.stress || 0) >= 1) T.get(f, rt, 'stress'); }
      if (!t.said && !rt.turn && t.fought) { const h = rt.party.find(p => p.merc?.uid === t.healer); if (h && h.hurtOnce) { t.said = true; G.Banter.say(rt, h, '왜 내가 맨 앞이야?', { pri: true }); } }
      const h0 = rt.party.find(p => p.merc?.uid === t.healer); if (h0 && h0.hp < h0.max) h0.hurtOnce = true;
    },
    // 마을로 돌아왔다: 다음 원정에 볼 것이 늘어난다. 다 보이면 끝
    home(f) {
      const t = st(f); if (!t || !t.on) return; t.run++;
      if (t.run > Math.max(...Object.values(BRIEF))) { t.on = false; return; }
      f.checkpoint = f.start = Math.min(f.checkpoint || 1, 3);
      const cls = JOIN[t.run]; if (cls) { const L = G.Guild.leader(f), m = G.Guild.make(f, cls, { lv: L.lv }); f.mercs.push(m); (f.lineup = f.lineup || []).push(m.uid); G.Fantasy.syncAllies(f); } // 고용 화면이 합쳐지기 전까지는 스스로 합류한다
    },
    PULSE_T,
  };
  return T;
})();
