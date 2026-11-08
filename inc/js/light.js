'use strict';
// 빛과 시야 (SRD 5.2.1 「Vision and Light」 · 용어집 Bright Light · Dim Light · Darkness · Darkvision · Blindsight · Truesight, DESIGN.md 159).
// 밝음 2 · 어스름 1 (가볍게 가려짐) · 어둠 0 (짙게 가려짐). 1칸 = 5피트 (범위와 같은 눈금).
// 보이지 않는 표적을 치면 불리 · 보이지 않는 공격자는 이점 (G.Dnd.adv). 어둠 시야는 그 거리 안의 어둠을 어스름처럼 · 마법적 어둠(어둠 주문)은 어둠 시야로도 안 보인다
G.Light = (() => {
  const GR = G.Grid, DN = () => G.Dnd, U = G.U;
  const TORCH = [4, 8]; // 횃불: 밝음 20피트 · 어스름 20피트 더 (SRD Torch)
  const DV = { dragonborn: 60, dwarf: 120, elf: 60, gnome: 60, orc: 120, tiefling: 60 }; // 종족 어둠 시야 (SRD 원문)
  const ft = n => n / 5;
  // 층마다 방의 밝기: 벽 횃불이 있는 방 · 어스름 (빛나는 이끼 · 틈으로 드는 빛) · 어둠. 복도는 어둠. 늪 · 바깥은 낮
  function gen(m) {
    if (m.amb) return;
    m.amb = new Uint8Array(m.w * m.h); m.lights = [];
    if (m.theme === 'swamp' || m.outdoor || m.scn) { m.amb.fill(2); return; } // 늪 · 바깥은 낮 · 손으로 짠 지도(튜토리얼 · 시나리오)는 밝게
    let i = 0;
    for (const r of m.rooms) {
      const h = U.hash ? U.hash(r.x * 31 + r.y * 7 + (m.seed || 0)) : ((Math.sin(r.x * 12.9898 + r.y * 78.233 + (m.seed || 0)) * 43758.5453) % 1 + 1) % 1, k = r === m.rooms[0] || r === m.end ? 2 : h < 0.35 ? 2 : h < 0.65 ? 1 : 0;
      if (k === 1) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) m.amb[y * m.w + x] = 1;
      if (k === 2) { // 벽 횃불 둘: 방의 마주 보는 벽
        for (const [x, y] of [[r.x, r.y + (r.h >> 1)], [r.x + r.w - 1, r.y + (r.h >> 1)]]) if (GR.pass(m, x, y)) m.lights.push({ x, y, b: TORCH[0], d: TORCH[1], wall: true, id: i++ });
        if (!m.lights.some(l => l.x >= r.x && l.x < r.x + r.w && l.y >= r.y && l.y < r.y + r.h)) m.lights.push({ x: r.cx, y: r.cy, b: TORCH[0], d: TORCH[1], id: i++ });
      }
    }
  }
  // 빛을 내는 것: 벽 횃불 · 파티의 횃불 (어둠 시야가 없는 사람이 든다) · 빛 주문 · 햇빛
  function sources(rt) {
    const out = (rt.map.lights || []).slice();
    for (const p of rt.party) if (!p.dead && p.merc && !L.darkvision(p)) out.push({ x: p.x, y: p.y, b: TORCH[0], d: TORCH[1], held: p });
    for (const e of rt.party.concat(rt.mons, rt.sums || [])) if (DN().bon(e, 'lightSp')) out.push({ x: e.x, y: e.y, b: 4, d: 8 }); // 빛 (SRD 소마법): 밝음 20 · 어스름 20
    for (const e of rt.mons) { const gl = e.stat?.glow || e.glowOn; if (e.hp > 0 && gl) out.push({ x: e.x, y: e.y, b: ft(gl[0]), d: ft(gl[1]), held: e }); } // 빛을 내는 몬스터 (Illumination)
    for (const s of rt.suns || []) if (s.until > G.S.runTime) out.push({ x: s.x, y: s.y, b: ft(60), d: ft(120), sun: true });
    return out;
  }
  const inDark = (rt, x, y) => (rt.darks || []).some(d => d.until > G.S.runTime && Math.hypot(x - d.x, y - d.y) <= d.r + 0.5 && !(rt.suns || []).some(s => s.until > G.S.runTime && s.lv >= d.lv && Math.hypot(d.x - s.x, d.y - s.y) <= ft(60) + d.r));
  const L = {
    gen, sources, inDark, TORCH,
    // 그 칸의 밝기: 0 어둠 · 1 어스름 · 2 밝음 (마법적 어둠은 −1)
    level(rt, x, y) {
      const m = rt.map; if (!m) return 2; if (!m.amb) gen(m);
      if (inDark(rt, x, y)) return -1; // 어둠 주문: 보통 빛은 밝히지 못한다
      let v = m.amb[Math.round(y) * m.w + Math.round(x)] || 0;
      if (v >= 2) return 2;
      for (const s of sources(rt)) { const d = Math.hypot(x - s.x, y - s.y); if (d > s.d + 0.5) continue; if (s.held || GR.los(m, s.x, s.y, x, y)) { if (d <= s.b + 0.5) return 2; v = Math.max(v, 1); } }
      return v;
    },
    // 어둠 시야 (피트 → 칸): 종족 · 몬스터 능력치표 · 밤의 고글(+60) · 용의 영혼 등
    darkvision(e) { let v = 0; if (e.merc) { v = Math.max(DV[G.Res.species(e.merc)] || 0, e.dvSpell || 0); if (G.Trinket.has(e.merc, 'nightEyes')) v = v ? v + 60 : 60; } else v = e.stat?.senses?.darkvision || 0; return ft(v); },
    special(e) { const s = e.stat?.senses || {}, o = { blind: ft(s.blindsight || 0) + 0, true: ft(s.truesight || 0), tremor: ft(s.tremorsense || 0), devil: 0 }; if (e.merc) { if (G.Opt?.has(e, 'iv_dsight')) o.devil = ft(120); if (DN().boon(e.merc, 'truesight')) o.true = Math.max(o.true, ft(60)); } return o; },
    // obs가 tgt를 볼 수 있나 (시야선은 F.sees가 따로 본다)
    sees(rt, obs, tgt) {
      if (!rt?.map || !obs || !tgt || obs === tgt) return true;
      if (DN().has(obs, 'blinded') && !(L.special(obs).blind > 0)) return false;
      const d = Math.hypot(obs.x - tgt.x, obs.y - tgt.y), sp = L.special(obs);
      if (sp.blind && d <= sp.blind + 0.5) return true; // 맹안시: 보지 않고 안다
      if (sp.tremor && d <= sp.tremor + 0.5 && !tgt.stat?.speed?.fly) return true;
      const darkT = inDark(rt, tgt.x, tgt.y), darkO = inDark(rt, obs.x, obs.y);
      if (darkT || darkO) return (sp.devil && d <= sp.devil + 0.5) || (sp.true && d <= sp.true + 0.5); // 마법적 어둠: 어둠 시야로도 못 본다
      const lv = L.level(rt, tgt.x, tgt.y);
      if (lv >= 1) return true; // 밝음 · 어스름은 보인다 (어스름은 지각 판정만 불리)
      return d <= L.darkvision(obs) + 0.5 || (sp.devil && d <= sp.devil + 0.5) || (sp.true && d <= sp.true + 0.5);
    },
    // 공격의 이점 · 불리 (G.Dnd.adv): [이점, 불리]
    adv(att, tg) { const rt = G.RT.fantasy; if (!rt?.map || att.x == null || tg.x == null) return [0, 0]; const a = L.sees(rt, att, tg), b = L.sees(rt, tg, att); return [b ? 0 : 1, a ? 0 : 1]; },
    // 햇빛 (햇빛 민감 · SRD Sunlight Sensitivity): 낮의 바깥(늪) · 햇빛 주문
    sunAt(rt, x, y) { const m = rt?.map; if (!m) return false; if (m.theme === 'swamp' || m.outdoor) return true; return (rt.suns || []).some(s => s.until > G.S.runTime && Math.hypot(x - s.x, y - s.y) <= ft(60) + 0.5); },
    // 시작: 층이 바뀌면 · 어둠 · 햇빛을 지운다
    floor(rt) { rt.darks = []; rt.suns = []; if (rt.map) gen(rt.map); },
  };
  return L;
})();
// 지형 (SRD 5.2.1 용어집 Difficult Terrain · Swimming · Flying · Falling): 얕은 물(,) = 어려운 지형 · 깊은 물(~) = 헤엄 · 주문이 만든 어려운 지형 (rt.diffs)
G.Terrain = (() => {
  const GR = G.Grid, DN = () => G.Dnd;
  const fly = e => !!(e.stat?.speed?.fly || (e.merc && (DN().bsum(e, 'fly') > 0 || DN().bon(e, 'flySp') || (e.merc.adv === 'draconic' && e.merc.lv >= 14)))); // 용의 날개 (SRD 드라코닉 14)
  const swim = e => !!(e.stat?.speed?.swim || e.stat?.swim || (e.merc && (G.Trinket.has(e.merc, 'swimSp') || DN().bon(e, 'swimSp') || G.Opt?.has(e, 'iv_depths'))));
  const hover = e => !!(e.stat?.hover || DN().bon(e, 'hoverSp'));
  const T = {
    fly, swim, hover,
    // 일반 던전의 웅덩이: 방 넷 중 하나 꼴로 얕은 물 (지도를 그리기 전에 · 한 번)
    gen(m) {
      if (m.terrGen || m.theme === 'swamp' || !m.rooms || m.scn || m.tut || m.hand) return; m.terrGen = true; /* 손으로 짠 지도(튜토리얼 · 시나리오)는 그대로 */
      if (!m.passChars.includes(',')) m.passChars += ','; m.water = true;
      for (const r of m.rooms) { if (r === m.rooms[0] || r === m.end || r.w < 5 || r.h < 5) continue; const h = ((Math.sin(r.x * 91.7 + r.y * 13.3 + 7) * 43758.5453) % 1 + 1) % 1; if (h > 0.25) continue;
        const cx = r.x + 1 + Math.floor(h * 4 * (r.w - 3)) % (r.w - 2), cy = r.y + 1 + Math.floor(h * 16 * (r.h - 3)) % (r.h - 2), rr = 1 + (h < 0.12 ? 1 : 0);
        for (let y = cy - rr; y <= cy + rr; y++) for (let x = cx - rr; x <= cx + rr; x++) if (x > r.x && y > r.y && x < r.x + r.w - 1 && y < r.y + r.h - 1 && m.c[y * m.w + x] === '.' && Math.hypot(x - cx, y - cy) <= rr + 0.3) m.c[y * m.w + x] = ','; }
    },
    // 주문 · 효과가 만든 어려운 지형: { x, y, r, until, foe(적에게만), by, sq(정사각형) }
    add(rt, z) { (rt.diffs = rt.diffs || []).push(z); },
    diffAt(rt, e, x, y) { for (const z of rt.diffs || []) { if (z.until <= G.S.runTime) continue; if (z.foe && e.kind !== 'mon') continue; if (z.at ? Math.hypot(x - z.at.x, y - z.at.y) <= z.r + 0.5 : z.sq ? Math.abs(x - z.x) <= z.r + 0.5 && Math.abs(y - z.y) <= z.r + 0.5 : Math.hypot(x - z.x, y - z.y) <= z.r + 0.5) return true; } return false; },
    // 한 칸 들어갈 때 드는 이동 (칸): 어려운 지형 +1 (겹쳐도 한 번) · 헤엄 +1 (어려운 물이면 +2), 수영 속도가 있으면 헤엄 추가 없음 · 날면 땅의 지형을 안 탄다
    cost(rt, e, x, y) {
      const m = rt.map, c = m.c[y * m.w + x], fl = fly(e);
      if (c === '~') return fl ? 1 : swim(e) ? 1 : 2;
      if (!fl) for (const z of rt.diffs || []) if (z.cost > 2 && z.until > G.S.runTime && z.at && Math.hypot(x - z.at.x, y - z.at.y) <= z.r + 0.5) return z.cost; // 식물 성장 (SRD): 1피트에 4피트
      const diff = !fl && (c === ',' || T.diffAt(rt, e, x, y));
      return diff ? 2 : 1;
    },
    // 깊은 물은 날거나 헤엄쳐 건넌다 (전투 칸 · 걷는 길찾기는 그대로)
    enter(rt, e, x, y) { const m = rt.map, c = GR.at(m, x, y); return GR.pass(m, x, y) || (c === '~' && !!e && (fly(e) || swim(e) || !!G.Util?.water(rt, e))); },
    // 날다가 넘어짐 · 행동 불능 · 붙잡힘 · 속박(속도 0)이면 떨어진다 (공중 정지 제외): 10피트 1d6 타격 · 넘어짐
    fall(rt, e, why) {
      if (!fly(e) || hover(e) || e.landed) return;
      if (G.Util?.fall(rt, e)) { e.landed = true; return; } // 깃털 낙하 (SRD 반응)
      e.landed = true; G.Foe.dtype = 'bludgeoning';
      if (e.kind === 'mon') G.Fantasy.hurt(G.S.w.fantasy, rt, e, DN().dice(1, 6), 'hit', null); else G.Foe.blast(G.S.w.fantasy, rt, { atk: 1 }, e, DN().dice(1, 6), null, 0, 'bludgeoning');
      G.Foe.dtype = null;
      if (!G.quiet) G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.2, s: '추락', col: '#d8c79a', t: 0.9, sz: 0.8 });
    },
  };
  return T;
})();
