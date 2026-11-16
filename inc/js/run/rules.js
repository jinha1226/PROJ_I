'use strict';
// 탐사 규칙 (ROGUELIKE_PLAN 4-3 · 4-4 · 5절): 정보 단계 · 정찰 · 열쇠 · 길 · 방 · 사건.
// 전투는 임시 계산이다 (6절의 전투 구조가 정해지면 바꾼다). 화면과 무관해서 봇 · 시험이 그대로 쓴다.
RUN.K = 4.2; // 임시 전투의 피해 계수 (시험값)
RUN.TYPE = { start: '입구', fight: '전투', elite: '정예', event: '사건', camp: '야영', shop: '상인', treasure: '보물', boss: '우두머리' };
RUN.HINT2 = { event: '뭔가 있다', camp: '쉴 만한 곳', shop: '불빛 · 사람 소리', treasure: '반짝임', start: '' };

(() => {
  const C = RUN.CLS, G = () => RUN.gen;
  const alive = st => st.party.filter(m => !m.dead);
  const has = (st, cls) => alive(st).find(m => m.cls === cls);
  const best = (st, sk, only) => { let b = null; for (const m of alive(st)) { if (only && !only(m)) continue; const v = C[m.cls].sk[sk]; if (b === null || v > b.bonus) b = { m, bonus: v }; } return b; };
  const guid = st => !!has(st, 'cleric');          // 인도(Guidance) 소마법: 능력 판정 +1d4
  const lit = st => !!has(st, 'wizard') || alive(st).every(m => C[m.cls].dv); // 빛 소마법 또는 모두 암시야
  const say = (st, t, k = 'info') => { st.log.push({ t, k, at: st.turn }); };
  const note = (n, t, ink = 'pencil') => { if (!n.notes.some(x => x.t === t)) n.notes.push({ t, ink }); };
  const node = (st, id) => st.map.nodes[id];
  const mkCheck = (st, sk, dc, who, extra = {}) => ({ skill: sk, bonus: who.bonus, dc, guid: extra.guid ?? guid(st), adv: extra.adv || 0 });
  const pOf = c => RUN.pCheck(c.bonus, c.dc, c.adv, c.guid);
  const roll = (st, c, whoName, what) => { const r = RUN.check(st.rng, c.bonus, c.dc, c.adv, c.guid); say(st, `${whoName} ${what}: ${RUN.fmtRoll(r)} — ${r.ok ? '성공' : '실패'}`, 'roll'); return r; };

  // 정보 단계를 올리고 지도 여백에 메모를 남긴다 (4-4)
  function reveal(st, n, lv) {
    if (lv <= n.info && lv < 3) return;
    n.info = Math.max(n.info, lv);
    if (lv === 1) note(n, n.hostile ? '기척 있음' : '조용하다');
    if (lv === 2) {
      note(n, n.size === 'large' ? '넓음' : '좁음');
      if (n.hostile) { const c = n.g.count; note(n, `적 ${Math.max(1, c - 1)}~${c + 1}?`); if (n.type === 'elite') note(n, '큰 놈이 있다?'); }
      else if (RUN.HINT2[n.type]) note(n, RUN.HINT2[n.type]);
    }
    if (lv === 3) { n.notes = n.notes.filter(x => x.ink !== 'pencil' || x.keep); note(n, n.hostile ? n.g.label : RUN.TYPE[n.type], 'ink'); }
  }
  // 도착하면 수동 지각으로 다음 방의 기척을 듣고, 길의 잠김 · 어둠이 보인다 (4-4: 지각 숙련자 자동)
  function look(st) {
    const pp = 10 + (best(st, '지각')?.bonus ?? 0);
    for (const e of G().outs(st.map, st.at)) {
      const n = node(st, e.b);
      if (e.kind === 'locked') e.seen.lock = true;
      if (e.kind === 'dark') e.seen.dark = true;
      if (e.kind === 'trap' && pp >= 15 && !e.seen.trap) { e.seen.trap = true; say(st, '복도 바닥에 이상한 이음매가 보인다. 함정이다.', 'good'); }
      if (n.info < 1 && (n.hostile ? pp >= n.dc : pp >= 11)) reveal(st, n, 1);
    }
  }

  RUN.newRun = (seed, picks) => {
    const st = { seed, rng: RUN.rng((seed ^ 0x9e3779b9) >>> 0), map: RUN.gen.make(seed), at: 0, gold: 20, items: { torch: 1 },
      party: picks.map(cls => ({ cls, n: C[cls].n, hp: C[cls].hp, max: C[cls].hp, dead: false, sl: { ...(C[cls].slots || {}) } })),
      log: [], scene: null, done: null, flags: {}, here: {}, turn: 0, path: [0] };
    const s = node(st, 0); s.visited = true; s.info = 3; note(s, '입구', 'ink');
    say(st, `탐사대가 심연의 입구에 섰다. ${st.party.map(m => m.n).join(' · ')}.`);
    look(st);
    return st;
  };

  RUN.alive = alive;
  RUN.lit = lit;
  // 지금 방에서 갈 수 있는 길 (숨은 통로는 찾았을 때만)
  RUN.nexts = st => G().outs(st.map, st.at).filter(e => e.kind !== 'hidden' || e.seen.hidden).map(e => ({ e, n: node(st, e.b) }));

  // ── 정보 행동 (4-4) ─────────────────────────────────────────────
  RUN.infoActs = (st, e) => {
    const n = node(st, e.b), acts = [];
    const sc = best(st, '은신', m => C[m.cls].scout);
    if (sc && !n.scoutTried && n.info < 3) {
      const c = mkCheck(st, '은신', n.hostile ? n.dc : 10, sc, { guid: false });
      acts.push({ id: 'scout', label: '정찰한다', who: sc.m.n, check: c, p: pOf(c), note: '실패하면 들킨다', run: () => {
        n.scoutTried = true; const r = roll(st, c, sc.m.n, '정찰');
        if (r.ok) { reveal(st, n, 2); n.scouted = true; say(st, '들키지 않고 방 안을 엿보았다.', 'good'); }
        else if (n.hostile) { n.alert = true; note(n, '들킴!', 'red'); say(st, '발소리가 들렸다. 안쪽이 술렁인다.', 'bad'); }
        else say(st, '어두워서 잘 보이지 않는다.');
      } });
    }
    const tr = best(st, '생존', m => C[m.cls].sk.생존 >= 3);
    if (tr && !n.trackTried && n.info < 3) {
      const c = mkCheck(st, '생존', 12, tr);
      acts.push({ id: 'track', label: '흔적을 쫓는다', who: tr.m.n, check: c, p: pOf(c), run: () => {
        n.trackTried = true; const r = roll(st, c, tr.m.n, '추적');
        if (!r.ok) return say(st, '흔적이 엉켜 알 수 없다.');
        if (n.hostile) { note(n, RUN.FAMS[n.g.fam]?.n || '짐승', 'pencil'); n.famKnown = true; say(st, `${RUN.FAMS[n.g.fam]?.n || '짐승'}의 흔적이다.`, 'good'); }
        else { note(n, '흔적 없음'); say(st, '저쪽으로 간 발자국은 없다.', 'good'); }
      } });
    }
    const cl = has(st, 'cleric');
    if (cl && !st.here.augury && n.info < 3) acts.push({ id: 'augury', label: '점술 (의식)', who: cl.n, check: null, p: 1, cost: '이 방에서 한 번', run: () => {
      st.here.augury = true;
      const woe = n.type === 'elite' || n.type === 'boss' || n.alert || (e.kind === 'trap' && !e.seen.trap);
      note(n, `점술: ${woe ? '나쁨' : '좋음'}`, woe ? 'red' : 'pencil'); n.augury = woe ? 'woe' : 'weal';
      say(st, `${cl.n}의 점술 — 그 길은 ${woe ? '화가 닥친다' : '복이 따른다'}.`, woe ? 'bad' : 'good');
    } });
    if (st.items.seeScroll && n.info < 3) acts.push({ id: 'see', label: '투시 두루마리', who: null, check: null, p: 1, cost: '두루마리 1', run: () => {
      st.items.seeScroll--; reveal(st, n, 3); n.seen3 = true; say(st, '두루마리가 타오르며 방 안을 비춘다.', 'good');
    } });
    return acts;
  };

  // 지금 방에서 하는 행동: 함정 · 숨은 통로 찾기, 마법 탐지
  RUN.roomActs = st => {
    const acts = [], outs = G().outs(st.map, st.at);
    const iv = best(st, '조사');
    if (iv && !st.here.search) {
      const c = mkCheck(st, '조사', 13, iv), c2 = { ...c, dc: 15 };
      acts.push({ id: 'search', label: '함정 · 숨은 통로를 찾는다', who: iv.m.n, check: c, p: pOf(c), sub: `숨은 통로는 ${RUN.fmtCheck(c2, pOf(c2))}`, run: () => {
        st.here.search = true; const r = roll(st, c, iv.m.n, '조사');
        let found = 0;
        if (r.tot >= 13) for (const e of outs) if (e.kind === 'trap' && !e.seen.trap) { e.seen.trap = true; found++; }
        if (r.tot >= 15) for (const e of outs) if (e.kind === 'hidden' && !e.seen.hidden) { e.seen.hidden = true; found++; note(node(st, st.at), '숨은 통로!', 'ink'); say(st, '벽에 금이 가 있다 — 숨은 통로다!', 'good'); }
        if (!found) say(st, '더 찾을 것은 없어 보인다.');
        else if (r.tot < 15 || !outs.some(e => e.kind === 'hidden')) say(st, '함정을 찾았다.', 'good');
      } });
    }
    const wz = has(st, 'wizard');
    if (wz && !st.here.detect) acts.push({ id: 'detect', label: '마법 탐지 (의식)', who: wz.n, check: null, p: 1, cost: '이 방에서 한 번', run: () => {
      st.here.detect = true; let any = false;
      for (const e of outs) { const n = node(st, e.b); if (n.type === 'treasure') { note(n, '마법의 기운', 'pencil'); any = true; } }
      say(st, any ? '잠긴 문 너머에서 마법의 기운이 느껴진다.' : '가까이에 마법의 기운은 없다.', any ? 'good' : 'info');
    } });
    return acts;
  };

  // ── 이동 (4-3) ──────────────────────────────────────────────────
  RUN.moveActs = (st, e) => {
    const n = node(st, e.b), acts = [], go = (label, cost, extra = {}) => ({ id: 'go', label, who: null, check: null, p: 1, cost, run: () => traverse(st, e, extra) });
    if (e.kind === 'locked' && !e.opened) {
      e.tried = e.tried || {};
      const rg = has(st, 'rogue');
      if (rg && !e.tried.tools) { const c = mkCheck(st, '도둑 도구', 15, { bonus: C.rogue.tools }); acts.push({ id: 'pick', label: '자물쇠를 딴다', who: rg.n, check: c, p: pOf(c), note: '한 번만 해 볼 수 있다', run: () => {
        e.tried.tools = true; const r = roll(st, c, rg.n, '자물쇠'); if (r.ok) { e.opened = true; return traverse(st, e); } say(st, '자물쇠가 버틴다.', 'bad');
      } }); }
      const wz = has(st, 'wizard');
      if (wz && wz.sl[2] > 0) acts.push({ id: 'knock', label: '열림 (주문)', who: wz.n, check: null, p: 1, cost: '2레벨 슬롯', note: '쾅 소리가 울린다 (안쪽이 깬다)', run: () => {
        wz.sl[2]--; e.opened = true; if (n.hostile) n.alert = true; say(st, `${wz.n}이 열림을 외운다. 쾅 — 문이 열린다.`, 'info'); return traverse(st, e);
      } });
      if (st.items.knockScroll) acts.push({ id: 'kscroll', label: '열림 두루마리', who: null, check: null, p: 1, cost: '두루마리 1', note: '쾅 소리가 울린다', run: () => {
        st.items.knockScroll--; e.opened = true; if (n.hostile) n.alert = true; say(st, '두루마리가 타오르고 문이 열린다.', 'info'); return traverse(st, e);
      } });
      const at = best(st, '운동');
      if (at && !e.tried.brk) { const c = mkCheck(st, '운동', 15, at); acts.push({ id: 'break', label: '부순다', who: at.m.n, check: c, p: pOf(c), note: '시끄럽다 · 한 번만', run: () => {
        e.tried.brk = true; const r = roll(st, c, at.m.n, '문 부수기'); if (r.ok) { e.opened = true; if (n.hostile) n.alert = true; return traverse(st, e); } say(st, '문이 꿈쩍도 않는다.', 'bad');
      } }); }
      return acts;
    }
    if (e.kind === 'dark' && !lit(st)) {
      if (st.items.torch) acts.push(go('횃불을 켜고 간다', '횃불 1', { torch: true }));
      acts.push(go('어둠 속으로 간다', null, { dark: true }));
      return acts;
    }
    if (e.kind === 'trap' && e.seen.trap) return [go('함정을 피해 지나간다', null)];
    if (e.kind === 'dark') return [go(has(st, 'wizard') ? '빛 소마법을 켜고 간다' : '암시야로 간다', null)];
    return [go('이 길로 간다', null)];
  };

  function hurt(st, m, dmg, why) {
    m.hp -= dmg;
    if (m.hp <= 0 && !m.dead) { m.dead = true; m.hp = 0; say(st, `${m.n} 쓰러짐${why ? ` (${why})` : ''}.`, 'bad'); note(node(st, st.at), `${m.n} 쓰러짐`, 'red'); }
  }
  function traverse(st, e, opt = {}) {
    e.walked = true; st.turn++;
    if (opt.torch) { st.items.torch--; say(st, '횃불을 켠다.'); }
    st.dark = !!opt.dark;
    st.at = e.b; st.here = {}; st.path.push(e.b);
    if (e.kind === 'trap' && !e.seen.trap) {
      e.seen.trap = true; say(st, '딸깍 — 함정이다! 칼날이 튀어나온다.', 'bad');
      for (const m of alive(st)) { const r = RUN.check(st.rng, C[m.cls].dex, 13); const d = RUN.roll(st.rng, '2d6'); hurt(st, m, r.ok ? Math.floor(d / 2) : d, '함정'); }
    }
    if (!alive(st).length) { st.done = 'lose'; say(st, '탐사대가 전멸했다.', 'bad'); return { moved: e.id }; }
    arrive(st, node(st, e.b));
    return { moved: e.id };
  }

  // ── 방에 들어서면 ───────────────────────────────────────────────
  function arrive(st, n) {
    n.visited = true; const wasScouted = n.scouted; reveal(st, n, 3);
    if (n.hostile) {
      const ch = [{ n: '싸운다', run: () => fight(st, n, n.g, { dark: st.dark }) }];
      const sc = alive(st).some(m => C[m.cls].scout);
      if (wasScouted && !n.alert && sc) ch.unshift({ n: '기습한다', sub: '먼저 덮쳐 피해가 준다', run: () => fight(st, n, n.g, { ambush: true, dark: st.dark }) });
      if (wasScouted && !n.alert && n.type !== 'boss') {
        const ps = alive(st).map(m => RUN.pCheck(C[m.cls].sk.은신, n.dc));
        ch.push({ n: '몰래 지나간다', sub: `무리 은신 ${RUN.view.mode === 'dnd' ? `대 DC ${n.dc}` : `성공 ${Math.round(RUN.pGroup(ps) * 100)}%`} · 전리품 없음`, run: () => {
          const ok = alive(st).filter(m => RUN.check(st.rng, C[m.cls].sk.은신, n.dc).ok).length >= Math.ceil(alive(st).length / 2);
          if (ok) { note(n, '몰래 지나감', 'ink'); say(st, '숨을 죽이고 그 곁을 빠져나갔다.', 'good'); }
          else { n.alert = true; say(st, '누군가 돌부리를 찼다. 들켰다!', 'bad'); fight(st, n, n.g, { dark: st.dark }); }
        } });
      }
      const intro = n.type === 'boss' ? `${n.g.name}가 길을 막고 서 있다.` : n.alert ? `${n.g.label} — 이미 우리를 기다리고 있다.` : `${n.g.label}.`;
      st.scene = { kind: 'fight', title: RUN.TYPE[n.type], text: intro, choices: ch };
    } else if (n.type === 'event') {
      const ev = RUN.EVENTS.find(x => x.id === n.ev);
      st.scene = { kind: 'event', title: ev.t, text: ev.d, choices: ev.opts.map(o => eventChoice(st, n, o)).filter(Boolean) };
    } else if (n.type === 'camp') {
      st.scene = { kind: 'camp', title: '야영', text: '바람이 들지 않는 구석. 여기서 긴 휴식을 할 수 있다.', choices: [
        { n: '긴 휴식', sub: '체력 · 주문 슬롯을 모두 되찾는다', run: () => { for (const m of alive(st)) { m.hp = m.max; m.sl = { ...(C[m.cls].slots || {}) }; } note(n, '야영', 'ink'); say(st, '불을 피우고 긴 휴식을 했다. 모두 기운을 되찾았다.', 'good'); } },
        { n: '그냥 지나간다', run: () => say(st, '쉬지 않고 계단 쪽으로 향한다.') }] };
    } else if (n.type === 'shop') {
      st.scene = shopScene(st, n);
    } else if (n.type === 'treasure') {
      const gold = 50 + RUN.d(st.rng, 20), its = RUN.shuffle(st.rng, ['potion', 'knockScroll', 'seeScroll', 'potion']).slice(0, 2);
      st.gold += gold; its.forEach(k => { st.items[k] = (st.items[k] || 0) + 1; });
      note(n, '보물을 찾음', 'ink'); say(st, `봉인된 방의 보물: 금화 ${gold}, ${its.map(k => RUN.ITEMS[k].n).join(' · ')}.`, 'good');
    }
    if (!st.scene) look(st);
  }
  const after = st => { st.scene = null; st.dark = false; if (!st.done) look(st); };

  function shopScene(st, n) {
    const ch = Object.entries(RUN.ITEMS).map(([k, it]) => ({ n: `${it.n} 사기`, sub: `금화 ${it.cost} · ${it.line}`, stay: true, off: () => st.gold < it.cost, run: () => {
      if (st.gold < it.cost) return say(st, '금화가 모자란다.', 'bad');
      st.gold -= it.cost; st.items[k] = (st.items[k] || 0) + 1; say(st, `${it.n}을 샀다.`, 'good');
    } }));
    ch.push({ n: '떠난다', run: () => { note(n, '상인', 'ink'); } });
    return { kind: 'shop', title: '떠돌이 상인', text: '등불 아래 상인이 짐을 풀어 놓았다.', choices: ch };
  }

  function eventChoice(st, n, o) {
    if (o.cost && st.gold < o.cost) return { n: o.n, sub: `금화 ${o.cost} — 모자란다`, off: () => true, run: () => {} };
    let c = null, who = null;
    if (o.sk) { who = best(st, o.sk); if (!who) return null; c = mkCheck(st, o.sk, o.dc, who); }
    return { n: o.n, who: who?.m.n, check: c, p: c ? pOf(c) : 1, sub: o.cost ? `금화 ${o.cost}` : null, run: () => {
      if (o.cost) st.gold -= o.cost;
      let res = o.ok;
      if (c) { const r = roll(st, c, who.m.n, o.sk); res = r.ok ? o.ok : o.no; }
      say(st, res.msg, res.fight || res.alert ? 'bad' : 'info'); note(n, `${o.n}${c ? (res === o.ok ? ' — 성공' : ' — 실패') : ''}`, 'ink');
      if (res.gold) { st.gold += res.gold; say(st, `금화 ${res.gold}.`, 'good'); }
      if (res.item) st.items[res.item] = (st.items[res.item] || 0) + 1;
      if (res.bless) st.flags.bless = true;
      if (res.bossHint) st.flags.bossHint = true;
      if (res.revealRow) for (const id of st.map.rows[n.row + 1] || []) reveal(st, node(st, id), 2);
      if (res.mapPiece) { const later = RUN.shuffle(st.rng, st.map.nodes.filter(x => x.row > n.row && x.info < 2)).slice(0, 3); later.forEach(x => reveal(st, x, 2)); say(st, '지도 조각에 방 몇 개가 그려져 있다.', 'good'); }
      if (res.revealTraps) for (const e of G().outs(st.map, n.id)) if (e.kind === 'trap') e.seen.trap = true;
      if (res.fight) { const [nm, per, cnt] = res.fight; fight(st, n, { name: nm, count: cnt, d: per * cnt, label: `${nm} ${cnt}`, fam: 'humanoid' }, { alert: !!res.alert }); }
    } };
  }

  // ── 전투 (임시 계산) ───────────────────────────────────────────
  // 위험도 D와 파티 힘 P의 비로 받는 피해를 정한다. 주문 슬롯을 쓰면 힘이 오른다. 6절이 정해지면 바꾼다.
  function fight(st, n, g, mod = {}) {
    let D = g.d; if (n.type === 'boss' && st.flags.bossHint) D -= 3;
    const small = n.size === 'small';
    let P = 0; for (const m of alive(st)) P += C[m.cls].pow * (small && C[m.cls].ranged ? 0.85 : 1);
    // 슬롯 쓰기: 일반 전투는 아끼고, 정예 · 우두머리는 쓴다. 클레릭의 1레벨은 치유용으로 남긴다
    let spent = 0; const wz = has(st, 'wizard'), cl = has(st, 'cleric');
    const use = (m, lv, k) => { const u = Math.min(k, m.sl[lv] || 0); m.sl[lv] -= u; spent += u * lv; };
    if (wz) { if (n.type === 'boss') { use(wz, 2, 9); use(wz, 1, 9); } else if (n.type === 'elite') { use(wz, 2, 1); use(wz, 1, 1); } else if (D / P > 0.6) use(wz, 1, 1); }
    if (cl) { if (n.type === 'boss') use(cl, 2, 9); else if (n.type === 'elite') use(cl, 2, 1); }
    P += spent * 0.5;
    let mul = (0.75 + st.rng() * 0.5);
    const why = [];
    if (mod.ambush) { mul *= 0.65; why.push('기습'); }
    if (n.alert || mod.alert) { mul *= 1.25; why.push('들킴'); }
    if (mod.dark) { mul *= 1.2; why.push('어둠'); }
    if (st.flags.bless) { mul *= 0.75; why.push('축복'); st.flags.bless = false; }
    if (small && alive(st).some(m => C[m.cls].ranged)) why.push('좁은 방');
    const total = Math.max(0, Math.round(RUN.K * D * Math.min(2, D / P) * mul));
    const ws = alive(st).map(m => C[m.cls].w * (0.6 + st.rng() * 0.8)), sw = ws.reduce((a, b) => a + b, 0);
    say(st, `전투 — ${g.label}${why.length ? ` (${why.join(' · ')})` : ''}${spent ? ` · 주문 슬롯 ${spent}레벨어치 사용` : ''}. 파티가 받은 피해 ${total}.`, 'fight');
    alive(st).forEach((m, i) => hurt(st, m, Math.round(total * ws[i] / sw)));
    note(n, `싸움: ${g.name} (-${total})`, 'red');
    if (!alive(st).length) { st.done = 'lose'; say(st, '탐사대가 전멸했다.', 'bad'); return; }
    // 싸움 뒤 치유: 클레릭이 1레벨 슬롯으로 상처 치료 (1d8+3), 두 번까지
    const healer = has(st, 'cleric');
    for (let k = 0; healer && k < 2 && healer.sl[1] > 0; k++) {
      const low = alive(st).filter(m => m.hp < m.max * 0.5).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (!low) break;
      healer.sl[1]--; const h = RUN.roll(st.rng, '1d8+3'); low.hp = Math.min(low.max, low.hp + h); say(st, `${healer.n}이 ${low.n}의 상처를 치료한다 (+${h}).`, 'good');
    }
    if (n.type === 'boss') { st.done = 'win'; note(n, `${g.name} 쓰러뜨림`, 'ink'); say(st, `${g.name}가 쓰러졌다. 이 층의 지도가 완성됐다.`, 'good'); return; }
    const gold = n.type === 'elite' ? 35 + RUN.d(st.rng, 15) : 6 + g.count * 2; st.gold += gold;
    let loot = `금화 ${gold}`;
    if (n.type === 'elite') { const it = RUN.pick(st.rng, ['potion', 'knockScroll', 'seeScroll']); st.items[it] = (st.items[it] || 0) + 1; loot += ` · ${RUN.ITEMS[it].n}`; }
    say(st, `전리품: ${loot}.`, 'good');
  }

  RUN.doAct = (st, a) => { if (st.done || st.scene) return {}; const r = a.run() || {}; return r; };
  RUN.choose = (st, i) => {
    const s = st.scene; if (!s || st.done) return;
    const c = s.choices[i]; if (!c || (c.off && c.off())) return;
    c.run();
    if (st.done) { st.scene = null; return; }
    if (c.stay) { st.scene = shopScene(st, node(st, st.at)); return; }
    after(st);
  };
  // 물약: 가장 다친 사람에게
  RUN.usePotion = st => {
    if (!st.items.potion) return; const low = alive(st).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (!low) return;
    st.items.potion--; const h = RUN.roll(st.rng, '2d4+2'); low.hp = Math.min(low.max, low.hp + h); say(st, `${low.n}이 치유 물약을 마신다 (+${h}).`, 'good');
  };
})();
