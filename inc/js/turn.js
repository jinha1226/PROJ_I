'use strict';
// 턴제 전투 시제품 (DESIGN.md 71 · 주소에 ?turn): 처음 가는 층의 전투만 탁상 D&D처럼 — 선제권 순서대로 한 명씩 움직이고 굴림을 보여 준다.
// 아는 층(G.Season.known)은 지금까지처럼 실시간으로 빠르게 지나간다 — 새 층은 구경하는 곳, 지나온 층은 쌓는 곳 (인크레멘탈).
// 공격 · 기술 · 내성은 기존 규칙(allyAttack · G.Skill · G.Dnd)을 그대로 부르고, 차례만 나눈다. 타이머는 실제 시간으로 흐르고 한 라운드는 6초 안팎이다.
G.Turn = (() => {
  const U = G.U, GR = G.Grid;
  const F = () => G.Fantasy, B = () => G.Banter, DN = () => G.Dnd;
  const BEAT = 0.85, SKIP = 0.35, MOVE_V = 7, MOVE_T = 1.2, JOIN_R = 9, ROUND = 6, DM_T = 3.2, HEAL_N = 3, PAL_R = 6, SPEEDS = [1, 2, 4];
  // 한 행동의 피해 배율 (실시간의 1초 공격을 라운드에 한 번으로 묶는다)
  const ACT_K = 3, SK_K = 2;
  // 조우 (DESIGN.md 74): 층마다 방 1~2곳에 몬스터를 모은다. 나머지 작은 몬스터는 실시간으로 지나간다
  const ENC_ROOMS = 2, ENC_ONE = 0.5, ENC_MIN = 3, ENC_MAX = 5, EMPTY_DM = 0.3, GUARD = 0.5, RAGE_TAKEN = 1.3;
  // 승부가 기운 전투는 빨리 감는다 (DM: 「나머지는 정리했다」). 위험 없는 차례를 하나씩 구경시키지 않는다
  const MOP_X = 3, MOP_LOW = 0.85, MOP_HP = 0.5;
  const nameOf = e => e.merc?.name || e.n || e.def?.n || '';
  const gone = (rt, e) => (e.kind === 'mon' ? e.hp <= 0 || !rt.mons.includes(e) : (e.dead && !e.dying) || !rt.party.includes(e));
  const dex = (f, e) => (e.merc ? DN().mod(DN().ab(e.merc).dex) + (G.Feat.has(e.merc, 'alert') ? DN().prof(e.merc.lv) : 0) + (G.Persona.has(e.merc, 'hot') ? 3 : 0) : Math.floor(f.floor / 6) + (e.boss ? 2 : 0));

  // DM의 말: 화면 위 자막 + 대화 기록
  function dm(rt, s) {
    if (G.quiet) return;
    rt.dm = { s, until: G.S.runTime + DM_T };
    const chat = rt.chat || (rt.chat = []);
    chat.push({ n: 'DM', col: '#ffd27a', s, t: G.S.runTime, id: rt.chatId = (rt.chatId || 0) + 1 });
    if (chat.length > 40) chat.shift();
  }
  const count = list => { const c = {}; for (const o of list) c[o.n] = (c[o.n] || 0) + 1; return Object.keys(c).map(k => `${k} ${c[k]}`).join(' · '); };
  const SCENE = {
    floor: ['아래층에서 쇠 긁는 소리가 올라온다.', '천장이 낮아졌다. 다들 고개를 숙인다.', '벽을 타고 물이 흐른다. 물에서 쇠 맛이 난다.', '오래된 표식이 벽에 남아 있다. 누가 먼저 지나갔다.', '계단 아래로 찬 공기가 올라온다.', '횃불이 흔들린다. 벽에 오래된 긁힌 자국이 있다.', '발소리가 멀리까지 울린다.', '바닥이 축축하다. 어디선가 물이 떨어진다.'],
    mons: ['썩은 냄새가 먼저 나온다.', '문틈으로 불빛이 잠깐 흔들렸다가 꺼진다.', '안쪽에서 낮게 으르렁대는 소리가 난다.', '무언가 뼈를 씹는 소리가 그친다.', '방 안쪽에서 무언가 움직인다.', '어둠 속에서 숨소리가 들린다.', '바닥에 생긴 지 얼마 안 된 발자국이 있다.'],
    chest: ['부서진 선반 밑에 상자가 깔려 있다.', '누가 급히 숨겨 놓은 듯한 상자가 보인다.', '방 한가운데 상자가 놓여 있다.', '먼지 쌓인 상자가 벽에 기대어 있다.'],
    empty: ['꺼진 모닥불 자리가 있다. 재는 식은 지 오래다.', '벽에 누군가 날짜를 긁어 세어 놓았다.', '깨진 항아리 조각만 굴러다닌다.', '텅 빈 방이다. 먼지만 쌓여 있다.', '오래전에 누군가 머물다 떠난 자리다.', '무너진 기둥이 길을 반쯤 막고 있다.'],
  };

  // 묘사: 방금 쓴 줄은 피한다
  const said = [], describe = l => { const o = l.filter(q => !said.includes(q)), v = U.pick(o.length ? o : l); said.push(v); if (said.length > 12) said.shift(); return v; };

  const T = {
    rec: null,
    // 처음 온 층은 끝까지 턴제 (탐사하다 '아는 층'이 되어도 도중에 바뀌지 않게 — rt.fresh는 T.stage가 남긴다)
    on: (f, rt) => !!G.TURN && !rt.rush && (rt.fresh === rt.map || !G.Season.known(f, rt)),
    dm,
    // 방에 들어설 때 (G.Explore)
    scene(f, rt, mons, chest) {
      if (!T.on(f, rt)) return;
      if (mons.some(big)) dm(rt, describe(SCENE.mons));
      else if (chest) dm(rt, describe(SCENE.chest));
      else if (!mons.length && Math.random() < EMPTY_DM) dm(rt, describe(SCENE.empty));
    },
    // 층을 세울 때 (F.newFloor): 흩어진 몬스터를 방 1~2곳에 모아 조우로 만든다. 수는 그대로라 보상은 줄지 않는다
    stage(f, rt) {
      if (!T.on(f, rt)) return;
      rt.fresh = rt.map;
      const m = rt.map, rooms = U.shuffle(m.rooms.slice(1, -1)).slice(0, F().isBoss(f.floor) || U.chance(ENC_ONE) ? 1 : ENC_ROOMS), pool = U.shuffle(rt.mons.filter(o => !o.boss && !o.flee));
      for (const r of rooms) for (let i = ENC_MIN + Math.min(ENC_MAX - ENC_MIN, Math.floor(f.floor / 8)); i > 0 && pool.length; i--) {
        const o = pool.pop();
        o.major = true;
        for (let t = 0; t < 12; t++) { const x = r.x + U.rand(r.w), y = r.y + U.rand(r.h); if (m.c[y * m.w + x] === '.') { o.x = x; o.y = y; break; } }
      }
    },
    k: (f, rt, a) => (rt.turn ? ACT_K * F().aspd(f) / F().allyCd(a) * G.Story.atkK(rt, a, rt.turn.tg) : 1),
    skK: rt => (rt.turn ? SK_K : 1),
    // 굴림 기록 (G.Dnd가 부른다)
    note(r) { if (T.rec) T.rec.push(r); },
    speed: f => f.turnX || 1,
    nextSpeed(f) { f.turnX = SPEEDS[(SPEEDS.indexOf(T.speed(f)) + 1) % SPEEDS.length]; },
    // 전투 중 배속: 이번 틱을 더 돌린다
    extra: (f, rt) => (rt.turn && !G.quiet ? T.speed(f) - 1 + (rt.turn.mop ? MOP_X : 0) : 0),

    // 매 틱. true면 전투 중 — 실시간 이동 · 공격을 건너뛴다
    run(f, rt, dt) {
      if (rt.turnFl !== f.floor) { rt.turnFl = f.floor; if (rt.turn) G.Story.endFight(f, rt); rt.turn = null; rt.scene = null; if (T.on(f, rt)) dm(rt, G.Story.omen(f) || describe(SCENE.floor)); G.Story.onFloor(f, rt); }
      if (rt.turn && (rt.turn.map !== rt.map || !T.on(f, rt))) { G.Story.endFight(f, rt); rt.turn = null; }
      // 작은 몬스터는 실시간으로: 조우 · 우두머리 · 보스가 끼어야 차례를 나눈다
      if (!rt.turn) { if (!T.on(f, rt) || !foes(rt).some(big)) return false; begin(f, rt); }
      const st = rt.turn;
      // 묻는 동안 차례는 멈춘다
      if (G.Story.askTick(rt, dt)) return true;
      if (f.town) return true;
      if (!rt.turn) return false;
      const php = F().partyHP(rt);
      if (php.max) st.low = Math.min(st.low, php.hp / php.max);
      for (const p of rt.party) { p.moving = false; const c = p.cds; if (c) for (const k in c) if ((c[k] -= dt) <= 0) delete c[k]; }
      for (const o of rt.mons) o.moving = false;
      step(f, rt, st, dt);
      return true;
    },
  };

  // 싸울 상대: 깨어 있고 가까운 몬스터 (달아나는 황금 고블린은 실시간으로)
  const big = o => !!(o.major || o.chief || o.boss);
  const foes = rt => { const ref = rt.hero.dead ? rt.party.find(p => !p.dead) : rt.hero; return ref ? rt.mons.filter(o => o.aggro && !o.flee && GR.dist(o, ref) < JOIN_R) : []; };
  const initOf = (f, e) => { const nat = DN().d20(0); return { e, nat, init: nat + dex(f, e) }; };

  function begin(f, rt) {
    const list = foes(rt);
    // 같은 방에서 잠자던 것도 함께 깨어난다
    for (const o of rt.mons) if (!o.aggro && !o.flee && list.some(q => GR.dist(q, o) < 5)) o.aggro = true;
    const st = rt.turn = { map: rt.map, round: 0, order: [], i: -1, cur: null, ph: 'wait', t: 0.9, low: 1, downs: 0 };
    roster(f, rt, st);
    rt.roll = null;
    dm(rt, `${count(foes(rt))} — 전투 시작`);
    G.Story.beginFight(f, rt);
  }
  // 라운드 시작: 새로 합류한 사람 · 몬스터를 선제권대로 끼운다
  function roster(f, rt, st) {
    st.order = st.order.filter(x => !gone(rt, x.e));
    const has = new Set(st.order.map(x => x.e));
    G.Story.heat(f, foes(rt));
    for (const e of rt.party.filter(p => !p.dead || p.dying).concat(foes(rt))) if (!has.has(e)) st.order.push(initOf(f, e));
    st.order.sort((a, b) => b.init - a.init);
    st.round++;
    st.i = -1;
    if (!st.mop && st.round >= 2 && st.low >= MOP_LOW && !st.downs) {
      const fs = foes(rt), hp = fs.reduce((a, o) => a + Math.max(0, o.hp), 0), max = fs.reduce((a, o) => a + (o.max || 0), 0);
      if (fs.length && !fs.some(o => o.boss || o.chief) && hp < max * MOP_HP) { st.mop = true; dm(rt, '승부가 기울었다. 남은 것들을 몰아붙인다.'); }
    }
  }
  function target(rt, e) {
    if (e.kind === 'mon') {
      const pal = rt.allies.find(q => !q.dead && q.id === 'paladin');
      if (pal && GR.dist(e, pal) < PAL_R) return pal;
      let tg = null, bd = 1e9;
      for (const p of rt.party.concat(G.Mission.targets(rt))) if (!p.dead) { const d = GR.dist(e, p); if (d < bd) { bd = d; tg = p; } }
      return tg;
    }
    const fs = foes(rt), v = e.merc && e.merc.vow && fs.find(o => nameOf(o) === e.merc.vow.n);
    if ((e.broke === 'rage' || e.bigT) && fs.length) return fs.reduce((a, b) => (b.hp > a.hp ? b : a));
    if (rt.focus && rt.focus.hp > 0 && rt.mons.includes(rt.focus)) return rt.focus;
    if (v) return v;
    return F().nearestMon(rt, e, 40);
  }
  const reach = (e, tg) => (e.kind === 'mon' ? 1.1 + e.s * 0.2 : e.def.range >= 2 ? e.def.range : 1.2 + (tg.s || 1) * 0.2);
  const stopAt = (e, tg) => (e.kind !== 'mon' && e.def.range >= 2 ? e.def.range * 0.8 : 0.9);

  function step(f, rt, st, dt) {
    const m = rt.map;
    if (st.ph === 'wait') { if ((st.t -= dt) > 0) return; next(f, rt, st); return; }
    if (st.ph === 'move') {
      const e = st.cur, tg = st.tg;
      if (gone(rt, e) || !tg || (tg.kind === 'mon' ? gone(rt, tg) : tg.dead)) { pause(st, SKIP); return; }
      st.t += dt;
      if (GR.dist(e, tg) <= reach(e, tg) && F().sees(m, e, tg)) { act(f, rt, st, e, tg); return; }
      GR.moveTo(m, e, tg.x, tg.y, MOVE_V, dt, F().sees(m, e, tg) ? stopAt(e, tg) : 0.6);
      e.moving = true;
      if (st.t >= MOVE_T) pause(st, SKIP);
    }
  }
  const pause = (st, t) => { st.ph = 'wait'; st.t = t; };

  function next(f, rt, st) {
    // 끝: 남은 적이 없다
    if (st.i + 1 >= st.order.length) {
      if (!st.order.some(x => x.e.kind === 'mon' && !gone(rt, x.e)) && !foes(rt).length) { finish(f, rt, st); return; }
      roster(f, rt, st);
      if (!st.order.some(x => x.e.kind === 'mon')) { finish(f, rt, st); return; }
    }
    const x = st.order[++st.i];
    if (!x || gone(rt, x.e)) { pause(st, 0); return; }
    const e = st.cur = x.e;
    // 쓰러진 사람의 차례: 사망 내성
    if (e.dying) { G.Story.deathSave(f, rt, e); pause(st, BEAT); return; }
    if (e.dead) { pause(st, 0); return; }
    // 우두머리: 약해지면 달아난다
    if (e.chief && G.Story.chiefTurn(f, rt, e)) { pause(st, BEAT); return; }
    G.fx(rt, { k: 'ring', x: e.x, y: e.y, r: 0.8, t: 0.5, col: e.kind === 'mon' ? '#ff8a8a' : '#ffe08a' });
    // 기절 · 정지 · 마비: 차례를 넘긴다
    const stunned = e.kind === 'mon' && (e.stun > 0 || e.stop > 0);
    if (stunned) { e.stun -= ROUND; e.stop -= ROUND; }
    if (stunned || DN().out(e)) { G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '차례를 넘긴다', col: '#9aa0a8', t: 0.8, sz: 0.75 }); pause(st, SKIP); return; }
    // 무너진 사람 · 성격이 나서는 차례 (G.Story · G.Persona)
    if (e.merc && (G.Story.brokenTurn(f, rt, st, e) || G.Persona.turn(f, rt, st, e))) { pause(st, BEAT); return; }
    if (e.kind !== 'mon' && e.broke !== 'rage') {
      e.gcd = 0; e.lastSk = null;
      if (G.Skill.persist) G.Skill.persist(f, rt, e, ROUND);
      F().song(f, rt, e, ROUND);
      if (e.fleeT) e.fleeT = 0;
      if (G.Story.aid(f, rt, e)) { pause(st, BEAT); return; }
      // 치유 → 기술 → 공격 순서로 그 차례의 행동을 정한다
      const before = snapshot(rt), seen = rt.mons.filter(o => F().inView(rt, o.x, o.y));
      let healed = false;
      for (let i = 0; i < HEAL_N && e.def.heal; i++) healed = F().healTurn(f, rt, e, 99) || healed;
      if (healed) { report(f, rt, e, null, [], before, '치유'); pause(st, BEAT); return; }
      T.rec = [];
      G.Skill.tick(f, rt, e, 0, seen);
      const rec = T.rec; T.rec = null;
      if (e.lastSk) { report(f, rt, e, null, rec, before, G.D.MSKILLS[e.lastSk].n); pause(st, BEAT); return; }
    }
    st.tg = target(rt, e);
    if (!st.tg || (e.kind === 'mon' && DN().held(e) && GR.dist(e, st.tg) > reach(e, st.tg))) { pause(st, SKIP); return; }
    st.ph = 'move'; st.t = 0;
  }
  function act(f, rt, st, e, tg) {
    e.flip = tg.x < e.x;
    const before = snapshot(rt), hp0 = tg.hp;
    T.rec = [];
    if (e.kind === 'mon') {
      const slow = e.shock > 0 ? 0.6 : 1;
      if (tg.kind === 'rival') G.Rivals.hurt(f, rt, tg, e.atk * ACT_K * slow, e);
      else { const k = (tg.guard ? GUARD : 1) * (tg.broke === 'rage' ? RAGE_TAKEN : 1); tg.guard = false; F().hurtMember(f, rt, tg, e.atk * ACT_K * slow * k, e); }
    } else F().allyAttack(f, rt, e, tg);
    const rec = T.rec; T.rec = null;
    if (rt.phase === 'dead') return;
    G.Story.afterAct(f, rt, e, tg, rec, hp0);
    report(f, rt, e, tg, rec, before, null);
    pause(st, BEAT);
  }
  function finish(f, rt, st) {
    if (st.round >= 5 || st.downs) dm(rt, `전투 끝 · ${st.round}라운드`);
    G.Story.endFight(f, rt);
    rt.turn = null;
  }

  // 그 차례의 굴림은 화면 한 곳(rt.roll → 판독 패널)에 모은다. 머리 위에는 피해 숫자, 말풍선은 20 · 1일 때의 대사만.
  const snapshot = rt => (G.quiet ? null : rt.mons.concat(rt.party).map(e => [e, e.hp]));
  const log = (rt, who, s) => { const c = rt.chat || (rt.chat = []); c.push({ n: nameOf(who), col: who.merc ? G.Guild.def(who.merc).col : '#c9c2b2', s, t: G.S.runTime, id: rt.chatId = (rt.chatId || 0) + 1 }); if (c.length > 40) c.shift(); };
  function report(f, rt, e, tg, rec, before, label) {
    if (G.quiet) return;
    const foeSide = o => (e.kind === 'mon' ? o.kind !== 'mon' : o.kind === 'mon');
    let dmg = 0, heal = 0;
    for (const [o, h] of before) { const d = Math.max(0, h) - Math.max(0, o.hp); if (foeSide(o) && d > 0) dmg += d; if (!foeSide(o) && d < 0) heal -= d; }
    const atks = rec.filter(r => r.att === e), main = atks[0] || rec.find(r => r.sv), hits = atks.filter(r => r.hit).length;
    const down = tg && (tg.kind === 'mon' ? gone(rt, tg) : tg.dead);
    const res = [];
    if (atks.length > 1) res.push(`${atks.length}회 중 ${hits} 명중`);
    if (dmg > 0) res.push(`${U.fmt(dmg)} 피해`);
    if (heal > 0) res.push(`+${U.fmt(heal)} 회복`);
    if (down) res.push('쓰러짐');
    const R = rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: nameOf(e), foe: e.kind === 'mon', what: label || '공격', res: res.join(' · ') };
    if (main && main.sv) { R.tg = nameOf(main.tg); R.calc = `${DN().AB_N[main.k]} 내성 DC ${main.dc}`; R.word = main.ok ? '저항' : '실패'; R.ok = !main.ok; }
    else if (main) {
      R.tg = nameOf(main.tg); R.nat = main.nat; R.ok = main.hit;
      R.calc = `${main.mod < 0 ? '−' : '+'}${Math.abs(Math.round(main.mod))} · AC ${main.ac}`;
      R.word = main.nat === 1 ? '대실패' : main.nat === 20 ? '대성공' : main.crit ? '치명타' : main.hit ? '명중' : '빗나감';
    } else { R.ok = true; if (tg) R.tg = nameOf(tg); }
    // 기록과 말풍선은 기억할 순간만
    if (e.merc && main && main.nat === 20) B().say(rt, e, B().pick('crit', e), { pri: true });
    else if (e.merc && main && main.nat === 1) B().say(rt, e, B().pick('fumble', e), { pri: true });
    if (down) log(rt, e, `${nameOf(tg)} 쓰러뜨림`);
  }
  return T;
})();
if (typeof location !== 'undefined' && /[?&]turn\b/.test(location.search)) G.TURN = true;
