'use strict';
// 문 앞 준비 (설계 5-11, 화면 없이): 적이 있는 방의 문 앞에서 — 엿듣기 · 자리 잡기 · 물건 놓기 · 누가 어떻게 여나 → 전투 조건.
// 판정은 SRD 그대로: 엿듣기 = 지혜(지각) vs 수동 은신 · 자물쇠 따기 = 도둑 도구(손재주) DC 15 · 걷어차기 = 근력(운동) DC 15 · 노크 = 늘 열림.
// 여는 소리는 G.Noise로 방 안에 퍼진다 — 문이 닫혀 있으니 우리 쪽 문 앞에서 나서 닫힌 문(+6타일)을 지난다. 그래서 조용히 따면 아무도 못 듣는다.
// 엔진 판정(d20 · 기술 보정)은 io로 넘겨받는다: { d20() → 1~20, skill(who, sk) → 보정 }. 함수는 사건 목록(ev)을 돌려준다 — 화면은 이걸 그린다.
// 상태 P는 이 문 하나의 준비: { door, out, locked, grid, party, mons, items, clue, listened, starts, dropped, opened, tries }.
G.Prep = (() => {
  const ZONE_R = 4.5; // 문에서 이만큼 안까지 (우리 쪽) 세우고 놓을 수 있다
  const DC = 15;
  const LV = () => G.Noise.LV;
  // 시작: door { x, y } 문 칸 · out 문에서 우리 쪽으로 향하는 방향 · grid { w, h, pass(k), door(k) } · mons 방 안 몬스터(aware 있음) · items { oil, caltrops, tools } · clue 앞 방에서 얻은 단서
  function begin(o) {
    const l = Math.hypot(o.out.x, o.out.y) || 1;
    return { door: { x: o.door.x, y: o.door.y }, out: { x: o.out.x / l, y: o.out.y / l }, locked: !!o.locked, grid: o.grid, party: o.party, mons: o.mons,
      items: { oil: 0, caltrops: 0, tools: 0, ...o.items }, clue: !!o.clue, listened: null, starts: new Map(), dropped: [], opened: null, tries: [] };
  }
  const front = (P, x, y) => (x - P.door.x) * P.out.x + (y - P.door.y) * P.out.y; // 문에서 우리 쪽으로 얼마나 나왔나
  const walk = (P, x, y) => { const X = Math.round(x), Y = Math.round(y); return X >= 0 && Y >= 0 && X < P.grid.w && Y < P.grid.h && P.grid.pass(Y * P.grid.w + X); };
  // 우리 쪽 문 앞 (세우고 놓을 수 있는 곳)
  const inZone = (P, x, y) => Math.hypot(x - P.door.x, y - P.door.y) <= ZONE_R && front(P, x, y) >= 0.6 && walk(P, x, y);
  // 몬스터의 수동 은신 (10 + 은신 보정, 없으면 민첩 보정)
  const passiveStealth = m => 10 + (m.stat?.skills?.stealth ?? Math.floor(((m.stat?.abil?.dex ?? 10) - 10) / 2));

  // 엿듣기 (문 하나에 한 번): who의 지각 vs 방 안에서 가장 높은 수동 은신. 단서가 있으면 판정 없이 성공.
  // 성공하면 몇이 어디에(실루엣), 실패하면 기척만
  function listen(P, who, io) {
    if (P.listened) return { ev: [], res: P.listened };
    const dc = Math.max(10, ...P.mons.map(passiveStealth)), mod = io.skill(who, 'perception'), nat = P.clue ? null : io.d20(), ok = P.clue || nat + mod >= dc;
    P.listened = { who, nat, mod, dc, ok, clue: P.clue, seen: ok ? P.mons.map(m => ({ x: m.x, y: m.y, n: m.n, aware: m.aware })) : [], hint: P.mons.length ? (ok ? `${P.mons.length}` : '무언가 움직인다') : '조용하다' };
    return { ev: [{ k: 'listen', who, nat, mod, dc, ok, clue: P.clue }], res: P.listened };
  }
  // 자리 잡기: 문 앞 우리 쪽, 다른 사람과 0.9칸 넘게 떨어져서
  function canStand(P, who, x, y) {
    if (P.opened || !inZone(P, x, y)) return false;
    for (const [w, q] of P.starts) if (w !== who && Math.hypot(q.x - x, q.y - y) < 0.9) return false;
    return true;
  }
  function stand(P, who, x, y) { if (!canStand(P, who, x, y)) return false; P.starts.set(who, { x, y }); return true; }
  // 물건 놓기: 우리 쪽 문 앞 또는 문간(문 칸에서 1칸 안). 놓은 것끼리 1.2칸 넘게 떨어져서
  function canDrop(P, kind, x, y) {
    if (P.opened || !(P.items[kind] > 0)) return false;
    const doorway = Math.hypot(x - P.door.x, y - P.door.y) <= 1 && front(P, x, y) >= -0.2;
    if (!inZone(P, x, y) && !doorway) return false;
    return !P.dropped.some(d => Math.hypot(d.x - x, d.y - y) < 1.2);
  }
  function drop(P, kind, x, y) { if (!canDrop(P, kind, x, y)) return false; P.items[kind]--; P.dropped.push({ kind, x, y }); return true; }
  function undrop(P, i) { const d = P.dropped[i]; if (!d || P.opened) return false; P.dropped.splice(i, 1); P.items[d.kind]++; return true; }
  // 여는 방법: who가 할 수 있는 것 (못 하면 이유)
  const knows = (who, k) => !!who.merc?.skills?.includes(k);
  function methods(P, who) {
    const L = LV();
    return [
      { id: 'push', n: '살살 연다', ok: !P.locked, why: P.locked ? '잠겨 있다' : '', noise: L.push },
      { id: 'pick', n: '자물쇠 따기', ok: P.locked && P.items.tools > 0, why: !P.locked ? '잠기지 않았다' : P.items.tools > 0 ? '' : '도둑 도구가 없다', dc: DC, sk: 'sleight', noise: L.pick, fail: L.pickFail },
      { id: 'kick', n: '걷어차기', ok: true, why: '', dc: DC, sk: 'athletics', noise: L.kick, fail: L.kick },
      { id: 'knock', n: '노크 주문', ok: knows(who, 'u_knock'), why: knows(who, 'u_knock') ? '' : '노크 주문을 모른다', noise: L.knock },
    ];
  }
  // 소리가 나는 자리: 우리 쪽 문 앞 (닫힌 문을 지나 방 안으로 퍼진다)
  const src = P => ({ x: P.door.x + P.out.x, y: P.door.y + P.out.y });
  // 열어 본다: 판정 → 소리 → 들은 적의 상태. 돌려주는 것: { ok, nat, mod, dc, noise, ev } (못 하는 방법이면 null)
  function open(P, who, id, io) {
    const m = methods(P, who).find(q => q.id === id); if (!m || !m.ok || P.opened) return null;
    let ok = true, nat = null, mod = 0;
    if (m.dc) { nat = io.d20(); mod = io.skill(who, m.sk); ok = nat + mod >= m.dc; }
    const noise = ok ? m.noise : m.fail, ev = [{ k: 'try', who, id, n: m.n, ok, nat, mod, dc: m.dc || null }];
    ev.push(...G.Noise.emit(P.grid, src(P), noise, P.mons));
    P.tries.push({ who, id, ok, noise });
    if (ok) { P.opened = { who, id }; P.locked = false; ev.push({ k: 'open', who, id }); }
    return { ok, nat, mod, dc: m.dc || null, noise, ev };
  }
  // 전투 조건 (문이 열린 뒤): 시작 자리 · 놓은 것 · 기습(모든 적이 잠듦 · 모름이면 — SRD: 선제권 불리) · 잠든 적
  function setup(P) {
    const awake = P.mons.filter(m => !G.Noise.surprised(m));
    return { starts: P.starts, dropped: P.dropped, surprise: P.mons.length > 0 && awake.length === 0, asleep: P.mons.filter(m => m.aware === 'sleep'), hunters: P.mons.filter(m => m.aware === 'hunt') };
  }
  // 처음 상태: 방 안 적은 잠들었거나(반) 아무것도 모른다
  function prime(mons, rng = Math.random) { for (const m of mons) m.aware = rng() < 0.5 ? 'sleep' : 'idle'; return mons; }
  return { ZONE_R, DC, begin, front, inZone, passiveStealth, listen, canStand, stand, canDrop, drop, undrop, methods, open, setup, prime };
})();
