'use strict';
// 문 열기 (설계 5-11, 화면 없이): 적이 있는 방의 문 앞에 서면 — 누가 어떻게 여나를 저절로 고르고, 판정 · 소리 · 적의 상태 → 전투 조건.
// 2026-11-18: 손으로 하는 준비(엿듣기 · 자리 잡기 · 기름 · 마름쇠)는 뺐다 (사용자: 「이 과정이 너무 번거롭다」). 여는 판정과 소리는 그대로.
// 판정은 SRD 그대로: 자물쇠 따기 = 도둑 도구(손재주) DC 15 · 걷어차기 = 근력(운동) DC 15 · 노크 = 늘 열림.
// 여는 소리는 G.Noise로 방 안에 퍼진다 — 문이 닫혀 있으니 우리 쪽 문 앞에서 나서 닫힌 문을 지난다. 그래서 조용히 따면 아무도 못 듣는다.
// 엔진 판정(d20 · 기술 보정)은 io로 넘겨받는다: { d20() → 1~20, skill(who, sk) → 보정, insp(who) → 영웅적 영감을 썼으면 true (없어도 된다) }. 함수는 사건 목록(ev)을 돌려준다 — 화면은 이걸 그린다.
// 상태 P는 이 문 하나: { door, out, locked, grid, mons, items, others(다른 방 — 소리만 듣는다), opened, tries }.
G.Prep = (() => {
  const DC = 15, PICK_TRIES = 2; // 자물쇠는 두 번까지 따 보고, 안 되면 걷어찬다
  const LV = () => G.Noise.LV;
  // 시작: door { x, y } 문 칸 · out 문에서 우리 쪽으로 향하는 방향 · grid { w, h, pass(k), door(k) } · mons 방 안 몬스터(aware 있음) · items { tools }
  function begin(o) {
    const l = Math.hypot(o.out.x, o.out.y) || 1;
    return { door: { x: o.door.x, y: o.door.y }, out: { x: o.out.x / l, y: o.out.y / l }, locked: !!o.locked, grid: o.grid, mons: o.mons,
      items: { tools: 0, ...o.items }, others: o.others || [], opened: null, tries: [] };
  }
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
  // 다음에 누가 어떻게 열까 (저절로): 안 잠겼으면 맨 앞 사람이 살살 · 잠겼으면 손재주가 가장 좋은 사람이 따 보고(두 번까지) · 그래도 안 되면 운동이 가장 좋은 사람이 걷어찬다.
  // 노크 주문은 고르지 않는다 (300피트 밖까지 들리는 소리 — 걷어차기보다 시끄럽다)
  function next(P, party, io) {
    if (P.opened || !party.length) return null;
    const best = sk => party.reduce((a, w) => (io.skill(w, sk) > io.skill(a, sk) ? w : a), party[0]);
    if (!P.locked) return { who: party[0], id: 'push' };
    if (P.items.tools > 0 && P.tries.filter(t => t.id === 'pick').length < PICK_TRIES) return { who: best('sleight'), id: 'pick' };
    return { who: best('athletics'), id: 'kick' };
  }
  // 소리가 나는 자리: 우리 쪽 문 앞 (닫힌 문을 지나 방 안으로 퍼진다)
  const src = P => ({ x: P.door.x + P.out.x, y: P.door.y + P.out.y });
  // 열어 본다: 판정 → 소리 → 들은 적의 상태. 돌려주는 것: { ok, nat, mod, dc, noise, ev } (못 하는 방법이면 null)
  function open(P, who, id, io) {
    const m = methods(P, who).find(q => q.id === id); if (!m || !m.ok || P.opened) return null;
    let ok = true, nat = null, mod = 0;
    let insp = false;
    if (m.dc) { nat = io.d20(); mod = io.skill(who, m.sk); ok = nat + mod >= m.dc; if (!ok && io.insp && io.insp(who)) { insp = true; nat = io.d20(); ok = nat + mod >= m.dc; } } // 영웅적 영감 (SRD): 실패한 d20을 다시 굴리고 새 눈을 쓴다
    const noise = ok ? m.noise : m.fail, ev = [{ k: 'try', who, id, n: m.n, ok, nat, mod, dc: m.dc || null, insp }];
    ev.push(...G.Noise.emit(P.grid, src(P), noise, P.mons.concat(P.others))); // 다른 방(others)도 듣는다 — 쫓아오면 증원
    P.tries.push({ who, id, ok, noise });
    if (ok) { P.opened = { who, id }; P.locked = false; ev.push({ k: 'open', who, id }); }
    return { ok, nat, mod, dc: m.dc || null, noise, ev };
  }
  // 전투 조건 (문이 열린 뒤): 기습(모든 적이 잠듦 · 모름이면 — SRD: 선제권 불리) · 잠든 적 · 쫓아오는 적
  function setup(P) {
    const awake = P.mons.filter(m => !G.Noise.surprised(m));
    return { surprise: P.mons.length > 0 && awake.length === 0, asleep: P.mons.filter(m => m.aware === 'sleep'), hunters: P.mons.filter(m => m.aware === 'hunt') };
  }
  // 처음 상태: 방 안 적은 잠들었거나(반) 아무것도 모른다
  function prime(mons, rng = Math.random) { for (const m of mons) m.aware = rng() < 0.5 ? 'sleep' : 'idle'; return mons; }
  return { DC, PICK_TRIES, begin, methods, next, open, setup, prime };
})();
