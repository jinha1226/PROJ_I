'use strict';
// 층 임무 (DESIGN.md 64 · 픽 미 업의 층별 임무): 보스 층이 아닌 3층부터, 시즌 씨앗으로 층마다 임무 하나.
// 토벌 · 생존 · 수비 · 호위 · 탐색 · 탈출. 같은 숫자 싸움이 아니라 층마다 다른 일을 시킨다.
// 성공하면 보상(골드 + 마법 물건 40%), 실패해도 층은 넘어간다 (실패는 보상을 못 받는 것뿐).
// rt.mission = { k, t(남은 초), done, fail, n(찾은 수), need, obj(수비 대상 · 호위 상인), waveT }
G.Mission = (() => {
  const U = G.U, GR = G.Grid, F = () => G.Fantasy;
  const HOLD_T = 40, ESCAPE_T = 60, WAVE_T = 7, WAVE_N = 3, RELICS = 3, REWARD_K = 40, FIRST = 3;
  const DEF = {
    hunt: { n: '토벌', d: '모두 처치', ic: '⚔' },
    survive: { n: '생존', d: `${HOLD_T}초 버티기`, ic: '⏳' },
    defend: { n: '수비', d: `결계석 ${HOLD_T}초 지키기`, ic: '🛡' },
    escort: { n: '호위', d: '상인을 계단까지', ic: '🧳' },
    search: { n: '탐색', d: `유물 ${RELICS}개 찾기`, ic: '🔍' },
    escape: { n: '탈출', d: `${ESCAPE_T}초 안에 계단으로`, ic: '🏃' },
  };
  const KEYS = Object.keys(DEF);
  // 탐험 판정 난이도 (DESIGN.md 66): 10 + 층/5
  const DC = fl => 10 + Math.floor(fl / 5);
  const M = {
    DEF,
    // 임무 적성 (G.D.APT): 원정대(단장 포함)에서 그 임무에 맞는 직업인 사람들 — 셋까지 센다
    apt: (rt, k) => rt.party.filter(p => p.merc && !p.dead && G.D.APT[k]?.cls.includes(p.merc.cls)).slice(0, 3),
    // 탐험 판정 (지각 · 조사 · 설득): 원정대에서 가장 잘하는 사람이 굴린다. 성공하면 그 사람 머리 위에 🎲
    check(f, rt, sk, extra = 0) {
      const r = M.roll(f, rt, sk, extra);
      return r && r.ok ? r.who : null;
    },
    // 굴린 결과까지: { who(굴린 사람), nat, mod, dc, ok } — 말풍선에 판정을 보여 줄 때 (실패해도 who가 있다)
    roll(f, rt, sk, extra = 0, by = null, fixDC = null) {
      const ms = rt.party.filter(p => p.merc && !p.dead), b = G.Dnd.best(ms.map(p => p.merc), sk);
      if (!b.m) return null;
      // 가장 잘하는 사람과 2 이내면 누구든 나선다 (늘 같은 사람만 말하지 않게)
      const val = p => G.Dnd.best([p.merc], sk).v, who = by && !by.dead ? by : U.pick(ms.filter(p => val(p) >= b.v - 2)), B = G.Items.bag(f), climb = sk === 'athletics' && B['Potion of Climbing'] > 0 && (B['Potion of Climbing']--, true), adv = climb || G.Trinket.props(who.merc, 'skAdv').some(q => q[1] === sk), nat0 = G.Dnd.d20(adv ? 1 : 0), nat = G.Dnd.reliable(who.merc) && G.Dnd.profs(who.merc).includes(sk) ? Math.max(10, nat0) : nat0, mod = (sk === 'athletics' && who.merc.adv === 'thief' && who.merc.lv >= 3 ? Math.max(G.Dnd.skill(who.merc, sk), G.Dnd.skill(who.merc, 'acrobatics')) : G.Dnd.skill(who.merc, sk)) /* 2층 작업 (SRD 도둑) */ - 2 * (who.merc.exh || 0) - (who.merc.raisePen || 0), /* 사자 소생 (SRD): d20 −4, 긴 휴식마다 1씩 */ /* 믿음직한 재능 (SRD): 숙련 판정은 9 이하를 10으로 · 등반의 물약 · 엘프의 장화 같은 이점 · 탈진 */ dc = fixDC ?? DC(f.floor) + extra + (G.CHECK_DC || 0);
      let tot = nat + mod;
      if (tot < dc) { const h = G.Util?.help(rt, sk, who); if (h?.adv) tot = Math.max(tot, G.Dnd.d20(0) + mod); else if (h?.b) tot += h.b; } // 전투 밖 주문 (G.Util): 유도 +1d4 · 그 판정에 맞는 주문은 이점
      if (tot < dc && G.Guild.skill(who.merc, 'x_tmind') && G.Res.can(who.merc, 'sr_second', G.Skill.SK.sr_second.res)) { tot += 1 + U.rand(10); if (tot >= dc) { G.Res.pay(who.merc, 'sr_second', G.Skill.SK.sr_second.res); G.Pool.used(who, 'x_tmind'); } } // 전술적 사고 (SRD): 실패에 d10. 그래도 실패면 소모 안 함
      return { who, nat, mod: tot - nat, dc, ok: tot >= dc };
    },
    // 이 층의 임무 (시즌마다 같은 층은 같은 임무)
    kind(f, fl) {
      return null; // 임무는 실시간 규칙이라 뺐다. 턴제로 다시 만들 때까지 없다 (DESIGN.md 77)
      // eslint-disable-next-line no-unreachable
      if (fl < FIRST || F().isBoss(fl)) return null;
      return KEYS[Math.floor(G.Season.rng(f, fl * 31 + 7)() * KEYS.length)];
    },
    // 출발층부터 다음 임무들 [{ fl, k }] (마을 계획 · 자동 편성)
    ahead(f, from, n = 6) { const out = []; for (let fl = from; out.length < n && fl < from + 30; fl++) { const k = M.kind(f, fl); if (k) out.push({ fl, k }); } return out; },
    // 이 사람이 적성인 임무들
    aptOf: m => Object.keys(G.D.APT).filter(k => G.D.APT[k].cls.includes(m.cls)),
    // 층에 들어섰다: 임무를 놓고 알린다
    start(f, rt) {
      const k = M.kind(f, f.floor);
      rt.mission = null;
      if (!k) return;
      const h = rt.hero, ms = rt.mission = { k, t: k === 'escape' ? ESCAPE_T : HOLD_T, done: false, fail: false, n: 0, need: 0, waveT: 3 };
      // 적성: 맞는 직업 수(n)만큼 임무가 쉬워진다 — 그 사람들 머리 위에 「적성」
      const ap = M.apt(rt, k), n = ms.apt = ap.length;
      for (const p of ap) G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.3, s: `✦ ${DEF[k].n} 적성`, col: '#9fe0ff', t: 1.6, sz: 0.85, pop: true });
      if (k === 'survive') ms.t -= 5 * n;
      if (k === 'escape') ms.t += 10 * n;
      const hpK = 1 + 0.3 * n;
      if (k === 'defend') ms.obj = { kind: 'obj', ward: true, t: 'a_seal', x: h.x + 1, y: h.y, s: 1.1, bar: true, hp: F().heroHP(f) * 2 * hpK, max: F().heroHP(f) * 2 * hpK, glow: '#9fe0ff' };
      if (k === 'escort') ms.obj = { kind: 'obj', npc: true, t: 'v_explorer', x: h.x - 1, y: h.y, s: 0.95, bar: true, hp: F().heroHP(f) * 1.2 * hpK, max: F().heroHP(f) * 1.2 * hpK };
      if (k === 'search') {
        // 유물: 보물상자처럼 줍는 것 (F.plan이 상자처럼 찾아간다)
        const m = rt.map, rooms = U.shuffle(m.rooms.slice(1, -1));
        for (const r of rooms.slice(0, RELICS)) {
          const x = r.x + U.rand(r.w), y = r.y + U.rand(r.h);
          if (m.c[y * m.w + x] === '.') { rt.chests.push({ kind: 'obj', chest: true, relic: true, t: 'ui_star', x, y, s: 0.8, glow: '#ffd27a' }); ms.need++; }
        }
        // 적성 n개는 바로 보이고, 나머지는 하나씩 조사 판정 — 성공하면 그 자리가 지도에 드러난다 (믿음직한 재능 +5)
        let seen = 0, who = null;
        rt.chests.filter(c => c.relic).forEach((c, i) => { const p = i < n ? ap[i] : M.check(f, rt, 'investigation'); if (p) { G.Skill.reveal(rt, c.x, c.y, 2); seen++; who = who || (i >= n ? p : null); } });
        if (who) G.Dnd.flip(who, `조사 · 유물 ${seen}/${ms.need} 발견`);
      }
      G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.8, s: `${DEF[k].ic} ${DEF[k].n} · ${DEF[k].d}`, col: '#ffd27a', t: 2.6, sz: 1.3, pop: true });
      G.log(`${f.floor}층 임무 · ${DEF[k].n} — ${DEF[k].d}`, 'fantasy');
    },
    // 수비 대상 · 호위 상인 (그리기 · 몬스터 표적)
    ents: rt => (rt.mission && rt.mission.obj && !rt.mission.obj.dead ? [rt.mission.obj] : []),
    // 몬스터가 노릴 수 있는 것 (파티원과 함께)
    targets: rt => M.ents(rt),
    // 임무 진행: 시간 · 몰려오는 적 · 상인 걸음
    tick(f, rt, dt) {
      const ms = rt.mission;
      if (!ms || ms.done || ms.fail) return;
      const hold = ms.k === 'survive' || ms.k === 'defend', h = rt.hero;
      if (hold || ms.k === 'escape') {
        ms.t -= dt;
        if ((ms.waveT -= dt) <= 0) { ms.waveT = WAVE_T; M.wave(f, rt, hold ? (ms.obj || h) : h); }
        if (hold && ms.t <= 0) M.win(f, rt);
        if (ms.k === 'escape' && ms.t <= 0) M.lose(f, rt, '시간 초과');
      }
      if (ms.obj) {
        const o = ms.obj;
        if (o.hp <= 0) { o.dead = true; F().refreshEnts(rt); M.lose(f, rt, o.npc ? '상인이 쓰러졌다' : '결계석이 부서졌다'); return; }
        // 상인은 단장 곁을 따라간다
        if (o.npc && !h.dead && GR.dist(o, h) > 1.6) { o.moving = true; GR.moveTo(rt.map, o, h.x, h.y, 3, dt, 1.2); } else o.moving = false;
      }
    },
    // 몰려오는 적: 대상 둘레 6~9칸의 빈 칸에서 깨어 있는 채로
    wave(f, rt, c) {
      const m = rt.map, band = G.D.F.bands[F().band(f.floor)];
      // 지각 판정: 성공하면 몰려오는 적을 미리 보고 — 그 무리는 1.5초 늦게 움직인다 (기습 간파)
      const spot = M.check(f, rt, 'perception');
      if (spot) G.Dnd.flip(spot, '지각 · 기습 간파');
      for (let i = 0; i < WAVE_N; i++) for (let k = 0; k < 12; k++) {
        const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 3, x = Math.round(c.x + Math.cos(a) * r), y = Math.round(c.y + Math.sin(a) * r);
        if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1 || m.c[y * m.w + x] !== '.') continue;
        F().spawnMon(rt, f.floor, U.pick(band.mons), x, y, false, { aggro: true, wave: true, gold: F().monGold(f.floor) * 0.3, stop: spot ? 1.5 : 0 });
        break;
      }
      F().refreshEnts(rt);
    },
    // 단장이 갈 곳 (F.plan이 덤벼 오는 적 다음에 묻는다): undefined = 평소대로, null = 계단으로, 그 밖 = 그 자리를 지킨다
    goal(rt) {
      const ms = rt.mission;
      if (!ms || ms.done || ms.fail) return undefined;
      if (ms.k === 'survive') return ms.hold || (ms.hold = { x: rt.hero.x, y: rt.hero.y, hold: true });
      if (ms.k === 'defend') return { x: ms.obj.x - 1, y: ms.obj.y, hold: true };
      if (ms.k === 'escape') return null;
      // 토벌: 아는 층이라도 남은 적을 찾아간다
      // 한번 고른 적은 잡을 때까지 쫓는다 (매번 직선거리로 다시 고르면 벽 사이에서 두 적을 오가며 멈춘다)
      if (ms.k === 'hunt' && G.Season.known(G.S.w.fantasy, rt)) {
        const t = rt.target;
        if (t && t.hp > 0 && !t.flee && rt.mons.includes(t)) return t;
        const m = rt.map, d = GR.field(m, Math.round(rt.hero.x), Math.round(rt.hero.y)), far = o => { const v = d[Math.round(o.x) + Math.round(o.y) * m.w]; return v >= 0 ? v : 1e6 + GR.dist(o, rt.hero); };
        return (rt.target = rt.mons.filter(o => !o.flee).sort((p, q) => far(p) - far(q))[0]) || undefined;
      }
      return undefined;
    },
    // 유물을 주웠다 (F.openChest)
    relic(f, rt, c) {
      const ms = rt.mission;
      if (!ms) return;
      ms.n++;
      G.fx(rt, { k: 'text', x: c.x, y: c.y - 1, s: `유물 ${ms.n}/${ms.need}`, col: '#ffd27a', t: 1.3, sz: 1.2, pop: true });
      G.J.sfx('fantasy', 'chime');
      if (ms.n >= ms.need) M.win(f, rt);
    },
    // 계단에 닿았다 (F.descend 전에): 토벌 · 호위 · 탈출은 여기서 판정
    leave(f, rt) {
      const ms = rt.mission;
      if (!ms || ms.done || ms.fail) return;
      if (ms.k === 'hunt') { if (!rt.mons.some(o => !o.flee)) M.win(f, rt); else M.lose(f, rt, '남은 적'); }
      else if (ms.k === 'escort' || ms.k === 'escape') M.win(f, rt);
      else M.lose(f, rt, '미완');
    },
    // 계단으로 가도 되나: 생존 · 수비는 끝날 때까지 못 내려간다 (F.plan이 지킬 자리를 주므로 거의 오지 않는다)
    blocks: rt => !!(rt.mission && !rt.mission.done && !rt.mission.fail && (rt.mission.k === 'survive' || rt.mission.k === 'defend')),
    win(f, rt) {
      const ms = rt.mission, h = rt.hero;
      ms.done = true;
      let g = F().monGold(f.floor) * REWARD_K;
      // 적성: 토벌 · 호위는 보상 +25%씩. 호위는 설득 판정에 성공하면 상인 사례 ×1.5
      if (ms.k === 'hunt' || ms.k === 'escort') g *= 1 + 0.25 * (ms.apt || 0);
      if (ms.k === 'escort') { const p = M.check(f, rt, 'persuasion'); if (p) { g *= 1.5; G.Dnd.flip(p, '설득 · 사례 ×1.5'); } }
      F().gain(f, g);
      if (U.chance(0.4)) G.Trinket.gain(f, rt, h.x, h.y);
      // 끝난 수비 대상 · 상인은 물러난다
      if (ms.obj) { ms.obj.dead = true; F().refreshEnts(rt); }
      G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.8, s: `${DEF[ms.k].n} 성공 · +${U.coin(g)}`, col: '#9fe79f', t: 2.2, sz: 1.3, pop: true });
      G.J.sfx('fantasy', 'finish');
      G.log(`${f.floor}층 임무 성공 · ${DEF[ms.k].n}`, 'fantasy', 'good');
      f.missions = (f.missions || 0) + 1;
    },
    lose(f, rt, why) {
      const ms = rt.mission, h = rt.hero;
      ms.fail = true;
      G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.8, s: `${DEF[ms.k].n} 실패 · ${why}`, col: '#ff8a8a', t: 2, sz: 1.2, pop: true });
      G.log(`${f.floor}층 임무 실패 · ${DEF[ms.k].n} (${why})`, 'fantasy', 'bad');
    },
    // 미니맵 줄
    label(rt) {
      const ms = rt.mission;
      if (!ms) return '';
      const D_ = DEF[ms.k];
      if (ms.done) return ` · ${D_.ic} 성공`;
      if (ms.fail) return ` · ${D_.ic} 실패`;
      if (ms.k === 'survive' || ms.k === 'defend' || ms.k === 'escape') return ` · ${D_.ic} ${D_.n} ${Math.ceil(ms.t)}초`;
      if (ms.k === 'search') return ` · ${D_.ic} 유물 ${ms.n}/${ms.need}`;
      return ` · ${D_.ic} ${D_.n}`;
    },
  };
  return M;
})();
