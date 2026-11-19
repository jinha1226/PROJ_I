'use strict';
// 탐사 규칙 (ROGUELIKE_PLAN 4-3 · 4-4 · 5절): 정보 단계 · 정찰 · 열쇠 · 길 · 방 · 사건.
// 전투는 임시 계산이다 (6절의 전투 구조가 정해지면 바꾼다). 화면과 무관해서 봇 · 시험이 그대로 쓴다.
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
  const roll = (st, c, whoName, what) => { const r = RUN.check(st.rng, c.bonus, c.dc, c.adv, c.guid); say(st, `${whoName} ${what}: ${RUN.fmtRoll(r)} — ${r.ok ? '성공' : '실패'}`, 'roll'); st.lastCheck = { ...r, who: whoName, skill: what, at: st.log.length }; return r; }; // lastCheck: 화면 쪽이 굴림 연출에 쓴다

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
    if (lv === 3) { n.notes = n.notes.filter(x => x.ink !== 'pencil' || x.keep); if (n.hostile) note(n, n.g.label, 'ink'); else if (!n.visited) note(n, RUN.TYPE[n.type], 'ink'); } // 들어간 방은 아이콘이 종류를 말한다
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

  RUN.newRun = (seed, picks, floor = 1) => {
    const st = { seed, rng: RUN.rng((seed ^ 0x9e3779b9) >>> 0), floor, map: RUN.gen.make(seed, floor), at: 0, gold: 20, items: { torch: 1 },
      party: picks.map(cls => ({ cls, n: C[cls].n, hp: C[cls].hp, max: C[cls].hp, dead: false, sl: { ...(C[cls].slots || {}) } })),
      log: [], scene: null, done: null, flags: {}, here: {}, turn: 0, path: [0] };
    const s = node(st, 0); s.visited = true; s.info = 3; note(s, '입구', 'ink');
    say(st, `일행이 ${RUN.zone(floor).n} ${floor}층 입구에 섰다. ${st.party.map(m => m.n).join(' · ')}.`);
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
        if (n.hostile) { note(n, n.g.fam || '짐승', 'pencil'); n.famKnown = true; say(st, `${n.g.fam || '짐승'}의 흔적이다.`, 'good'); }
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
    n.visited = true; const wasScouted = n.scouted, pre = n.info; reveal(st, n, 3);
    if (n.hostile && n.type !== 'boss' && st.flags.warn > 0 && !n.alert) { st.flags.warn--; n.alert = true; note(n, '소문이 앞섰다', 'red'); say(st, '도망친 놈들이 먼저 알렸다. 안쪽이 무기를 들고 기다린다.', 'bad'); }
    if (n.hostile) {
      // 아무것도 모르고 들어서면 적이 먼저 덮칠 수 있다 (SRD 기습: 기척만 들었으면 덜하다)
      const surprised = !n.alert && n.type !== 'boss' && st.rng() < (pre >= 2 ? 0 : pre >= 1 ? 0.2 : 0.45);
      if (surprised) { note(n, '기습당함', 'red'); say(st, '어둠 속에서 적이 먼저 덮쳐 왔다!', 'bad'); }
      const ch = [{ n: '싸운다', run: () => fight(st, n, n.g, { dark: st.dark, surprised }) }];
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
      st.scene = { kind: 'event', title: ev.t, text: ev.d, choices: eventChoices(st, n, ev) };
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

  // 받침이 있으면 '이', 없으면 '가'
  const iga = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이' : '가'; };
  const member = (st, cls) => alive(st).find(m => m.cls === cls);
  // 직업 선택지는 파티에 그 직업이 있을 때만, 최대 2개를 앞에 세운다. 빠진 직업 하나는 '???'로 잠가 다음 판에 데려올 이유를 남긴다.
  function eventChoices(st, n, ev) {
    const usable = o => o.cls && member(st, o.cls) && (!o.item || st.items[o.item]);
    const mine = ev.opts.filter(usable).slice(0, 2);
    const lack = ev.opts.filter(o => o.cls && !member(st, o.cls));
    const out = [...mine, ...ev.opts.filter(o => !o.cls)].map(o => eventChoice(st, n, o)).filter(Boolean);
    if (lack.length) {
      const o = lack[Math.floor(st.rng() * lack.length)], nm = C[o.cls].n;
      out.splice(mine.length, 0, { n: `[${nm}] ???`, sub: `${nm}${iga(nm)} 있었다면…`, lock: true, off: () => true, run: () => {} });
    }
    return out;
  }

  function eventChoice(st, n, o) {
    if (o.cost && st.gold < o.cost) return { n: o.n, sub: `금화 ${o.cost} — 모자란다`, off: () => true, run: () => {} };
    let c = null, who = null; const by = o.cls ? member(st, o.cls) : null;
    const label = by ? `[${C[o.cls].n}] ${o.n}` : o.n;
    if (by && o.slot && !(by.sl[o.slot] > 0)) return { n: label, who: by.n, sub: `${o.slot}레벨 주문 슬롯이 없다`, off: () => true, run: () => {} };
    if (o.sk) { who = by ? { m: by, bonus: C[by.cls].sk[o.sk] } : best(st, o.sk); if (!who) return null; c = mkCheck(st, o.sk, o.dc, who); }
    const sub = o.cost ? `금화 ${o.cost}` : o.slot ? `${o.slot}레벨 슬롯` : o.item ? `${RUN.ITEMS[o.item].n} 1` : null;
    return { n: label, who: by ? null : who?.m.n, check: c, p: c ? pOf(c) : 1, sub, cls: o.cls, run: () => {
      if (o.cost) st.gold -= o.cost;
      if (by && o.slot) by.sl[o.slot]--;
      let res = o.ok;
      if (c) { const r = roll(st, c, who.m.n, o.sk); res = r.ok ? o.ok : o.no; }
      say(st, res.msg, res.fight || res.alert || res.warn || res.curse || res.hurt ? 'bad' : 'info');
      const base = o.tag || o.n;
      note(n, c ? `${base.replace(/한다$/, '')} ${res === o.ok ? '성공' : '실패'}` : o.tag || o.n.replace(/를 낸다$/, ' 냄').replace(/한다$/, '함'), 'ink');
      if (res.hurt) hurt(st, (who?.m || by), res.hurt);
      if (res.healAll) for (const m of alive(st)) m.hp = Math.min(m.max, m.hp + res.healAll);
      if (res.warn) st.flags.warn = (st.flags.warn || 0) + 1;
      if (res.curse) st.flags.curse = true;
      if (res.scoutAhead) { const ahead = RUN.shuffle(st.rng, st.map.nodes.filter(x => x.row > n.row && x.hostile && !x.visited && x.info < 2)).slice(0, 2); ahead.forEach(x => { reveal(st, x, 2); note(x, '흔적', 'pencil'); }); if (ahead.length) say(st, `앞쪽 적 방 ${ahead.length}곳이 지도에 표시됐다.`, 'good'); }
      if (res.gold) { st.gold += res.gold; say(st, `금화 ${res.gold}.`, 'good'); }
      if (res.item) st.items[res.item] = (st.items[res.item] || 0) + 1;
      if (res.bless) st.flags.bless = true;
      if (res.ally) st.flags.ally = true; // 구출: 화면 쪽(crawl.js)이 사람을 세운다
      if (res.bossHint) st.flags.bossHint = true;
      if (res.revealRow) for (const id of st.map.rows[n.row + 1] || []) reveal(st, node(st, id), 2);
      if (res.mapPiece) { const later = RUN.shuffle(st.rng, st.map.nodes.filter(x => x.row > n.row && x.info < 2)).slice(0, 3); later.forEach(x => reveal(st, x, 2)); say(st, '지도 조각에 방 몇 개가 그려져 있다.', 'good'); }
      if (res.revealTraps) for (const e of G().outs(st.map, n.id)) if (e.kind === 'trap') e.seen.trap = true;
      if (res.fight) { const [nm, per, cnt] = res.fight; fight(st, n, { name: nm, count: cnt, d: per * cnt, label: `${nm} ${cnt}`, fam: '고블린 무리' }, { alert: !!res.alert }); }
    } };
  }

  // ── 전투 (임시 계산) ───────────────────────────────────────────
  // 위험도 D와 파티 힘 P의 비로 받는 피해를 정한다. 주문 슬롯을 쓰면 힘이 오른다. 6절이 정해지면 바꾼다.
  function fight(st, n, g, mod = {}) {
    if (st.real) { st.pend = { g, mod: { ...mod, alert: !!(n.alert || mod.alert) } }; return; } // 새 게임(crawl.js): 숫자로 치르지 않고 그 방에서 실제 전투를 연다
    const small = n.size === 'small';
    const why = [];
    if (mod.ambush) why.push('기습');
    if (mod.surprised) why.push('기습당함');
    if (n.alert || mod.alert) why.push('들킴');
    if (mod.dark) why.push('어둠');
    if (st.flags.bless) why.push('축복');
    if (st.flags.curse) why.push('저주');
    if (small && alive(st).some(m => C[m.cls].ranged)) why.push('좁은 방');
    if (n.type === 'boss' && st.flags.bossHint) why.push('약점을 앎');
    const units = g.units || [[g.name, g.count]];
    const r = RUN.combat(st, units, { ambush: mod.ambush, surprised: mod.surprised, alert: n.alert || mod.alert, dark: mod.dark, small, boss: n.type === 'boss', elite: n.type === 'elite', bossHint: st.flags.bossHint });
    const total = r.loss.reduce((a, x) => a + Math.max(0, x.d), 0);
    st.combat = { title: g.label, why, ...r };
    say(st, `전투 — ${g.label}${why.length ? ` (${why.join(' · ')})` : ''} · ${r.rounds.length}라운드. ${r.loss.filter(x => x.d > 0).map(x => `${x.n} -${x.d}`).join(', ') || '피해 없음'}.`, 'fight');
    for (const x of r.loss) if (x.dead) { say(st, `${x.n} 쓰러짐.`, 'bad'); note(n, `${x.n} 쓰러짐`, 'red'); }
    note(n, `싸움: ${g.name} (-${total})`, 'red');
    if (!alive(st).length) { st.done = 'lose'; say(st, '탐사대가 전멸했다.', 'bad'); return; }
    // 싸움 뒤 치유: 클레릭이 1레벨 슬롯으로 상처 치료 (1d8+3), 두 번까지
    const healer = has(st, 'cleric');
    for (let k = 0; healer && k < 2 && healer.sl[1] > 0; k++) {
      const low = alive(st).filter(m => m.hp < m.max * 0.5).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (!low) break;
      healer.sl[1]--; const h = RUN.roll(st.rng, '1d8+3'); low.hp = Math.min(low.max, low.hp + h); say(st, `${healer.n}이 ${low === healer ? '자기' : `${low.n}의`} 상처를 치료한다 (+${h}).`, 'good');
    }
    if (n.type === 'boss') { st.done = 'win'; note(n, `${g.name} 쓰러뜨림`, 'ink'); say(st, `${g.name}가 쓰러졌다. 이들을 부린 자는 더 아래에 있다.`, 'good'); return; }
    const gold = n.type === 'elite' ? 35 + RUN.d(st.rng, 15) : 6 + g.count * 2 + (g.tier === 'heavy' ? 15 : 0); st.gold += gold;
    let loot = `금화 ${gold}`;
    if (n.type === 'elite' || g.tier === 'heavy') { const it = RUN.pick(st.rng, ['potion', 'knockScroll', 'seeScroll']); st.items[it] = (st.items[it] || 0) + 1; loot += ` · ${RUN.ITEMS[it].n}`; }
    say(st, `전리품: ${loot}.`, 'good');
  }

  RUN.doAct = (st, a) => { if (st.done || st.scene) return {}; const r = a.run() || {}; return r; };
  RUN.eventScene = (st, n, id) => eventChoices(st, n, RUN.EVENTS.find(x => x.id === id)); // 시험용
  // 구역 끝 야영지 (ROGUELIKE_PLAN 0-0): 우두머리를 잡은 자리에서 긴 휴식 한 번 · 상인 · 내려가기. 돌아가는 길은 없다
  RUN.campsite = (st, zone) => {
    let rested = false;
    const mk = () => ({ kind: 'rest', title: '야영지', again: mk, text: `${zone} 끝. 쉴 자리와 상인이 있다. 내려가면 돌아올 수 없다.`, choices: [
      { n: '긴 휴식', sub: '체력 · 주문 슬롯을 모두 되찾는다', stay: true, off: () => rested, run: () => { rested = true; for (const m of alive(st)) { m.hp = m.max; m.sl = { ...(C[m.cls].slots || {}) }; } say(st, '긴 휴식. 체력과 주문 슬롯을 되찾았다.', 'good'); } },
      ...shopScene(st, node(st, st.at)).choices.slice(0, -1),
      { n: '내려간다', run: () => say(st, '계단을 내려간다.') }] });
    st.scene = mk();
  };
  RUN.choose = (st, i) => {
    const s = st.scene; if (!s || st.done) return;
    const c = s.choices[i]; if (!c || (c.off && c.off())) return;
    c.run();
    if (!st.done && !alive(st).length) { st.done = 'lose'; say(st, '탐사대가 전멸했다.', 'bad'); }
    if (st.done) { st.scene = null; return; }
    if (c.stay) { st.scene = s.again ? s.again() : shopScene(st, node(st, st.at)); return; }
    after(st);
  };
  // 물약: 가장 다친 사람에게
  RUN.usePotion = st => {
    if (!st.items.potion) return; const low = alive(st).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (!low) return;
    st.items.potion--; const h = RUN.roll(st.rng, '2d4+2'); low.hp = Math.min(low.max, low.hp + h); say(st, `${low.n}이 치유 물약을 마신다 (+${h}).`, 'good');
  };
})();
