'use strict';
// 옛 본 게임 모듈의 빈자리 (2026-11-17 inc/old/2026-11-17/로 옮김 — 대사 · 관계 · 성격 · 시즌 · 원정 · 튜토리얼 · 인물 · 지휘 · 옛 진행 · 탐험 · 단장 만들기).
// 남은 코드가 아직 부르는 이름만 둔다: 아무 일도 하지 않거나 기본값. 부르는 곳을 새 게임 코드로 바꾸면 여기서도 지운다.
(() => {
  const no = () => {}, none = () => null, F = () => false, Z = () => 0, E = () => [];
  const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const season = f => { if (!f.season) f.season = { n: 1, seed: 1, maps: {}, cov: {}, t: 0, legend: [] }; if (f.season.t == null) f.season.t = 0; return f.season; };
  G.Banter = { say: no, line: () => '', call: no, talk: no, tick: no, live: E, tag: no, queue: no, pick: none };
  G.Bond = { add: no, floor: no, free: no, pairs: E, rel: Z };
  G.Cmd = { click: no, tick: no, draw: no };
  // 출발: 옛 원정의 depart에서 층을 여는 데 필요한 것만 (시험 부팅이 쓴다) — 마을 · 보고서 · 관계는 뺐다
  const depart = (f, rt) => {
    f.trip = []; G.Items.recharge(f); f.town = false; f.runs = (f.runs || 0) + 1;
    f.floor = f.runStart = G.U.clamp(f.start || f.checkpoint || 1, 1, Math.max(1, f.checkpoint || 1)); f.deaths = 0;
    G.Res.longRest(f.mercs.concat(G.Guild.leader(f))); f.front = f.frontLock || f.front || G.Foe.offer(1)[0];
    rt.btDepart = true; G.Fantasy.newFloor(f, rt);
  };
  G.Exp = { afterBoss: no, carry: Z, cleared: F, depart, full: F, home: no, stow: no, tick: no, townTick: no };
  G.Npc = { WAYS: {}, comeBack: none, down: no, due: none, meet: none };
  G.Persona = { buddy: none, has: F, roll: E, turn: no, who: none, stance: none };
  G.Season = { st: season, coverage: Z, load: (f, rt, fl) => { const m = rt.map; rt.seen = new Uint8Array(m.w * m.h); rt.seenVer = (rt.seenVer || 0) + 1; rt.mapFl = fl; m.passN = m.c.reduce((a, ch) => a + (ch !== '#' && ch !== '~' ? 1 : 0), 0); }, rng: (f, s) => seeded((season(f).seed ^ (s >>> 0)) >>> 0), save: no, sightBonus: Z, tick: no, known: F };
  G.Scn = { stage: no, open: F, reachable: () => true, inside: F, route: none, GOT: {}, WORLD: {}, walk: none, canExit: () => true, frame: none }; // 아스트랄 타워 지도에서만 쓰던 것
  G.TutMap = { build: none, stage: no };
  G.Tut = { start: no, tick: no, wallFoe: none, gate: F, askStairs: F, campNow: F, eventFor: none, get: none, holdAsk: F, on: F, picked: F, safe: F, stressMax: none };
})();
