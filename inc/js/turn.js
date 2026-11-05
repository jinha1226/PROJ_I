'use strict';
// 턴제 전투 시제품 (DESIGN.md 71 · 주소에 ?turn): 처음 가는 층의 전투만 탁상 D&D처럼 — 선제권 순서대로 한 명씩 움직이고 굴림을 보여 준다.
// 아는 층(G.Season.known)은 지금까지처럼 실시간으로 빠르게 지나간다 — 새 층은 구경하는 곳, 지나온 층은 쌓는 곳 (인크레멘탈).
// 공격 · 기술 · 내성은 기존 규칙(allyAttack · G.Skill · G.Dnd)을 그대로 부르고, 차례만 나눈다. 타이머는 실제 시간으로 흐르고 한 라운드는 6초 안팎이다.
G.Turn = (() => {
  const U = G.U, GR = G.Grid;
  const F = () => G.Fantasy, B = () => G.Banter, DN = () => G.Dnd;
  const SHOW_T = 0.5, BEAT = 0.55, PRE_T = 1.05, PRE_ALL = 0.6, DEATH_T = 1.5, STAKE_HP = 0.35, STAKE_BOSS = 0.2, SKIP = 0.35, MOVE_V = 4.5, CLOSE_T = 0.3, MELEE_R = 1.5, ROUND = 6, DM_T = 3.2, HEAL_N = 1, SPEEDS = [1, 2, 4];
  // 한 행동의 피해 배율 (실시간의 1초 공격을 라운드에 한 번으로 묶는다)
  const ACT_K = 1, SK_K = 1;
  G.Res_ROUND = 10; // 시계로 한 라운드 (버프 · 상태이상 지속)
  // 조우 (DESIGN.md 74): 층마다 방 1~2곳에 몬스터를 모은다. 나머지 작은 몬스터는 실시간으로 지나간다
  const ENC_ROOMS = 2, ENC_ONE = 0.5, ENC_MIN = 5, ENC_MAX = 6, EMPTY_DM = 0.3, GUARD = 0.5, RAGE_TAKEN = 1.3;
  // 승부가 기운 전투는 빨리 감는다 (DM: 「나머지는 정리했다」). 위험 없는 차례를 하나씩 구경시키지 않는다
  const MOP_X = 1, MOP_LOW = 0.85, MOP_HP = 0.5;
  const nameOf = e => e.merc?.name || e.n || e.def?.n || '';
  const gone = (rt, e) => (e.kind === 'mon' ? e.hp <= 0 || !rt.mons.includes(e) : (e.dead && !e.dying) || !rt.party.includes(e));
  const dex = (f, e) => (e.merc ? DN().mod(DN().ab(e.merc).dex) + (G.Feat.has(e.merc, 'alert') ? DN().prof(e.merc.lv) : 0) + (G.Persona.has(e.merc, 'hot') ? 3 : 0) : (e.stat ? e.stat.dex : Math.floor(f.floor / 6)) + (e.boss ? 2 : 0));

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
    // 먼저 굴린 주사위 눈: 행동보다 앞서 보여 주고, 그 눈으로 판정한다
    pre: null,
    rolls: { all: 0, shown: 0 },
    takePre() { const n = T.pre; T.pre = null; return n; },
    on: (f, rt) => !rt.rush,
    rollId: rt => (rt.rollN = (rt.rollN || 1000) + 1000), // 앞 굴림과 번호가 겹치면 주사위가 구르지 않는다
    // 층이 바뀌었다 (G.Flow.init)
    floorStart(f, rt) { if (rt.turn) G.Story.endFight(f, rt); rt.turn = null; rt.scene = null; dm(rt, G.Story.omen(f) || describe(SCENE.floor)); G.Story.onFloor(f, rt); },
    dm,
    // 판정 결과를 화면에 보여 줄 일 (주사위가 멈춘 뒤 그리는 쪽이 꺼내 쓴다)
    vis(rt, o) { if (!G.quiet && G.ISO) (rt.vis || (rt.vis = [])).push(o); },
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
      const reg = G.Region.of(f); if (reg) { G.Region.stage(f, rt, reg); return; }
      const m = rt.map, rooms = U.shuffle(m.rooms.slice(1, -1)).slice(0, F().isBoss(f.floor) || U.chance(ENC_ONE) ? 1 : ENC_ROOMS), inRoom = o => rooms.some(r => o.x >= r.x && o.y >= r.y && o.x < r.x + r.w && o.y < r.y + r.h);
      const pool = U.shuffle(rt.mons.filter(o => !o.boss && !o.flee)).sort((a, b) => inRoom(a) - inRoom(b)); // 조우 방에 있던 몬스터부터 쓴다: 다른 무리가 섞이지 않게
      // 조우 방은 한 무리로 다시 짠다 (전체 수는 그대로)
      for (const r of rooms) {
        const n = Math.min(pool.length, F().packN(f.floor)); // 무리 크기는 난이도 곡선
        for (const d of n ? G.Foe.troop(f.floor, n) : []) {
          const old = pool.pop(); rt.mons = rt.mons.filter(o => o !== old);
          const c = []; for (let t = 0; t < 12 && !c.length; t++) { const x = r.x + U.rand(r.w), y = r.y + U.rand(r.h); if (m.c[y * m.w + x] === '.') c.push(x, y); }
          F().spawnMon(rt, f.floor, d, c.length ? c[0] : old.x, c.length ? c[1] : old.y, false, { major: true });
        }
      }
    },
    k: (f, rt, a) => (rt.turn ? ACT_K * T.pace * F().aspd(f) * G.Story.atkK(rt, a, rt.turn.tg) : 1),
    skK: rt => (rt.turn ? SK_K * T.pace : 1),
    // 한 행동의 피해 배율: 양쪽을 같이 올리면 승패 비율은 두고 전투만 짧아진다
    pace: 1.6,
    // 굴림 기록 (G.Dnd가 부른다)
    note(r) { if (T.rec) T.rec.push(r); },
    speed: f => f.turnX || 1,
    nextSpeed(f) { f.turnX = SPEEDS[(SPEEDS.indexOf(T.speed(f)) + 1) % SPEEDS.length]; },
    // 배속: 이번 틱을 더 돌린다
    extra: (f, rt) => (G.quiet || f.town || rt.ask ? 0 : T.speed(f) - 1 + (rt.turn?.mop ? MOP_X : 0)), // 전투 · 이동 모두. 묻는 동안은 제 속도로

    // 매 틱. true면 전투 중 — 실시간 이동 · 공격을 건너뛴다
    run(f, rt, dt) {
      if (rt.turn && (rt.turn.map !== rt.map || !T.on(f, rt))) { G.Story.endFight(f, rt); rt.turn = null; }
      // 작은 몬스터는 실시간으로: 조우 · 우두머리 · 보스가 끼어야 차례를 나눈다
      if (!rt.turn) { if (!T.on(f, rt) || !foes(rt).some(big)) return false; begin(f, rt); }
      const st = rt.turn;
      // 묻는 동안 차례는 멈춘다
      if (rt.ask && !foes(rt).length) G.Story.answer(rt, rt.ask.def); // 적이 다 쓰러졌으면 묻지 않고 넘어간다
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
  const foes = rt => rt.mons.filter(o => o.aggro && !o.flee); // 누구와 싸울지는 G.Flow가 aggro로 정한다
  const rt0 = () => G.RT.fantasy;
  const initOf = (f, e) => { const nat = DN().d20(e.merc ? (G.Trinket.has(e.merc, 'init') || F().sk(e, 'ft_athlete') || F().sk(e, 'sr_feral') ? 1 : 0) : rt0()?.sneaked ? -1 : 0); return { e, nat, init: nat + dex(f, e) + (e.merc && F().sk(e, 'ft_jack') ? Math.floor(DN().prof(e.merc.lv) / 2) : 0) }; };

  function begin(f, rt) {
    const list = foes(rt);
    G.Story.clearWalk(rt);
    G.Tactics.snap(rt);
    for (const p of rt.party) p.fateUsed = false; // 운명의 은혜: 선제권을 굴리면 다시
    const st = rt.turn = { map: rt.map, round: 0, order: [], i: -1, cur: null, ph: 'wait', t: 0.9, low: 1, downs: 0 };
    // 첫 라운드의 선공: 기습에 성공한 무리(stop) · 매복 판정 · 장면의 결과 (G.Flow · G.Story)
    const planned = list.some(o => o.stop > 0), forced = rt.nextFirst;
    rt.sneaked = !forced && !planned && G.Pool.sneak(rt, list); // 들키지 않고 다가갔다: 적은 놀람 (선제권 불리)
    rt.nextFirst = null;
    st.first = planned ? 'party' : forced || null;
    roster(f, rt, st);
    if (!forced) rt.roll = null; // 판정 결과는 남겨 둔다
    dm(rt, st.first === 'party' ? `${count(foes(rt))} — 우리가 먼저 친다` : st.first === 'foes' ? `${count(foes(rt))} — 놈들이 먼저 덮친다!` : `${count(foes(rt))} — 전투 시작`);
    G.Res.fightStart(rt.party); rt.undying = false;
    G.Story.beginFight(f, rt);
  }
  // 라운드 시작: 새로 합류한 사람 · 몬스터를 선제권대로 끼운다
  function roster(f, rt, st) {
    st.order = st.order.filter(x => !gone(rt, x.e));
    const has = new Set(st.order.map(x => x.e));
    G.Story.heat(f, foes(rt));
    for (const e of rt.party.filter(p => !p.dead || p.dying).concat(foes(rt))) if (!has.has(e)) { const x = initOf(f, e); st.order.push(x); if (!st.round && e.merc && F().sk(e, 'sr_reflex')) st.order.push({ e, nat: x.nat, init: x.init - 10 }); } // 도둑의 반사신경 (SRD): 첫 라운드에 두 번
    // 첫 라운드만 선공 쪽이 앞선다
    const lead = x => (!st.round && st.first && (x.e.kind === 'mon') === (st.first === 'foes') ? 100 : 0);
    st.order.sort((a, b) => b.init + lead(b) - a.init - lead(a));
    st.round++;
    st.i = -1;
    if (G.Foe.assess(f, rt, st) && !st.askedLose) { st.askedLose = true; G.Story.askRetreat(f, rt); } // 승산이 없으면 묻는다. 기본은 방침대로
    if (!st.mop && st.round >= 2 && st.low >= MOP_LOW && !st.downs) {
      const fs = foes(rt), hp = fs.reduce((a, o) => a + Math.max(0, o.hp), 0), max = fs.reduce((a, o) => a + (o.max || 0), 0);
      if (fs.length && !fs.some(o => o.boss || o.chief) && hp < max * MOP_HP) { st.mop = true; dm(rt, '승부가 기울었다. 남은 것들을 몰아붙인다.'); }
    }
  }
  // 곧 일어날 트롤이 있고 이 사람이 태우러 가야 하나: 불이 있거나, 근접이거나, 남은 적이 그뿐일 때
  const burnFirst = (rt, e) => { const all = foes(rt), b = all.filter(G.Foe.needsFire); return b.length && (G.Foe.burns(e) || (G.Dnd.rng(e) || 0) < 2 || all.every(o => o.down)) ? b : []; };
  function target(rt, e) {
    if (e.kind === 'mon') {
      return G.Foe.target(rt, e);
    }
    const all = foes(rt), burn = burnFirst(rt, e), stand = all.filter(o => !o.down);
    if (burn.length) return burn.reduce((a, b) => (GR.dist(b, e) < GR.dist(a, e) ? b : a)); // 곧 일어난다: 불부터
    const fs = stand.length ? stand : all, v = e.merc && e.merc.vow && fs.find(o => nameOf(o) === e.merc.vow.n);
    if ((e.broke === 'rage' || e.bigT) && fs.length) return fs.reduce((a, b) => (b.hp > a.hp ? b : a));
    if (rt.focus && rt.focus.hp > 0 && rt.mons.includes(rt.focus)) return rt.focus;
    if (v) return v;
    // 전술 설정의 표적: 이 사람 눈에 보이는 적 중에서. 없으면 가장 가까운 적으로 다가간다
    const vis = fs.filter(o => F().sees(rt.map, e, o));
    return G.Tactics.guardTarget(rt, e, fs) || G.Tactics.pick(rt, vis, e) || G.Tactics.pick(rt, fs, e); // 싸우는 상대 중에서만
  }
  // 사거리 (칸): 근접은 옆 칸(대각선 포함), 원거리는 직업 사거리
  const reach = (e, tg) => (e.kind === 'mon' ? G.Foe.reach(e) : tg && tg.down && !G.Foe.burns(e) ? MELEE_R : G.Dnd.rng(e) >= 2 ? G.Dnd.rng(e) : MELEE_R); // 횃불은 곁에서
  // 한 차례의 이동력 (칸). D&D의 이동 속도 30피트 = 6칸이 기준
  // SRD: 종족 속도 + 몽크 비무장 이동(2 · 6 · 10 · 14 · 18레벨) · 바바리안 빠른 이동(5레벨, 중갑 제외) − 근력이 모자란 갑옷 2칸
  const srdMove = m => { const SR = G.SRD, sp = G.Res.species(m), base = SR.SPECIES[sp] || { move: 6 }, ln = SR.line(m, sp), q = SR.armorOf(m), str = DN().ab(m).str; let c = ln?.move || base.move; if (m.cls === 'monk' && q.cat === 'none' && !SR.eq(m).shield) c += m.lv >= 18 ? 6 : m.lv >= 14 ? 5 : m.lv >= 10 ? 4 : m.lv >= 6 ? 3 : m.lv >= 2 ? 2 : 0; if (m.cls === 'barbarian' && m.lv >= 5 && q.cat !== 'heavy') c += 2; if (m.cls === 'archer' && m.lv >= 6 && q.cat !== 'heavy') c += 2; if (q.str && str < q.str) c -= 2; return c; }; // 레인저 6레벨: 떠돌이
  const moveOf = e => (DN().held(e) || (DN().bon(e, 'daze') && G.RT.fantasy?.party?.some(p => !p.dead && Math.hypot(p.x - e.x, p.y - e.y) <= G.Foe.reach(e))) ? 0 : e.stood ? Math.floor(moveBase(e) / 2) : moveBase(e)); // 붙잡힘 · 속박 0, 일어선 차례는 절반 (SRD)
  const moveBase = e => (e.kind === 'mon' ? G.Foe.move(e) : Math.round((e.merc ? srdMove(e.merc) : 6) * (1 + (e.merc ? G.Guild.sum(e.merc, 'move') : 0) + DN().bsum(e, 'moveK')))); // 빠른 이동 · 이동 장비도 칸으로

  function step(f, rt, st, dt) {
    const m = rt.map;
    if ((st.ph === 'show' || st.ph === 'move' || st.ph === 'back') && !foes(rt).length) { pause(st, 0); return; } // 적이 다 쓰러졌으면 걸음을 마저 걷지 않는다
    if (st.ph === 'wait') { G.Tactics.snap(rt); if ((st.t -= dt) > 0) return; next(f, rt, st); return; } // 행동이 끝나면 밀리거나 소환된 인물을 칸 위로
    if (st.ph === 'show') { G.Tactics.snap(rt, st.cur); if ((st.t -= dt) <= 0) { st.ph = 'move'; st.t = 0; } return; }
    if (st.ph === 'pre') {
      if ((st.t -= dt) > 0) return;
      const e = st.cur, tg = st.tg;
      if (gone(rt, e) || !tg || (tg.kind === 'mon' ? gone(rt, tg) : tg.dead)) { T.pre = null; pause(st, SKIP); return; }
      act(f, rt, st, e, tg); T.pre = null;
      return;
    }
    if (st.ph === 'back') { // 치고 빠지기: 걸어서 물러난 뒤 차례가 끝난다
      if (gone(rt, st.cur) || (st.path.length && !G.Tactics.walk(st.cur, st.path, MOVE_V, dt))) { if (gone(rt, st.cur)) pause(st, SKIP); return; }
      pause(st, SKIP); return;
    }
    if (st.ph === 'move') {
      const e = st.cur, tg = st.tg;
      if (gone(rt, e) || !tg || (tg.kind === 'mon' ? gone(rt, tg) : tg.dead)) { pause(st, SKIP); return; }
      G.Tactics.snap(rt, e); // 그사이 일어난 사람 등이 겹치지 않게
      // 칸을 따라 걷고, 다 걸었을 때 칠 수 있으면 친다. 아니면 그 자리에서 차례가 끝난다
      G.Tactics.blocked(rt, e, st.path); // 그사이 누가 길을 막았으면 거기서 멈춘다
      const px = e.x, py = e.y, done = !st.path.length || G.Tactics.walk(e, st.path, MOVE_V, dt);
      opportunity(f, rt, st, e, px, py);
      if (gone(rt, e) || rt.phase === 'dead') { pause(st, SKIP); return; }
      if (!done) return;
      if (canHit(m, e, e.x, e.y, tg)) { strike(f, rt, st, e, tg); return; }
      // 표적에 닿지 못했어도 닿는 적이 있으면 그쪽을 친다 (길이 막혔을 때)
      const alt = (e.kind === 'mon' ? rt.party.filter(p => !p.dead) : foes(rt)).find(o => canHit(m, e, e.x, e.y, o));
      if (alt) { st.tg = alt; strike(f, rt, st, e, alt); return; }
      pause(st, SKIP);
    }
  }
  // 기회 공격 (SRD): 근접 상대의 곁을 떠나면 그 상대가 라운드에 한 번 친다. 그래서 전열이 후열을 지킨다. 날렵한 도주는 빠져나간다
  // 몬스터의 공격 하나: 주사위 × 배율. 명중 보정은 그 공격의 값을 쓴다
  function hitBy(f, rt, e, tg, a, k) {
    if (!a) { F().hurtMember(f, rt, tg, e.atk * T.pace * k, e); return; }
    const av = G.Foe.avgOf(a);
    e.useAtk = a; e._critK = (av + a.n * (a.d + 1) / 2 + (a.ex ? a.ex.n * (a.ex.d + 1) / 2 : 0)) / Math.max(1, av); // 치명타는 주사위만 두 배
    const hp0 = tg.hp;
    F().hurtMember(f, rt, tg, (av * DN().monRoll(a, false) + G.Foe.extra(rt, e, tg, a)) * e.atk * T.pace * k, e);
    if (a.name === 'Life Drain' && tg.hp < hp0) { tg.max = Math.max(1, tg.max - (hp0 - tg.hp)); if (tg.hp > tg.max) tg.hp = tg.max; } // SRD: 받은 피해만큼 최대 체력이 준다
    e.useAtk = null;
  }
  function opportunity(f, rt, st, e, px, py) {
    if (px === e.x && py === e.y || G.Foe.has(e, 'nimble')) return;
    const list = e.kind === 'mon' ? rt.party.filter(p => !p.dead && !p.dying) : foes(rt).filter(o => o.hp > 0 && !o.down && !DN().bon(o, 'stagger'));
    // 준비 행동 (SRD): 곁으로 들어오는 적을 반응으로 친다. 반응은 라운드에 한 번
    if (e.kind === 'mon') for (const o of list) {
      if (!o.ready || o.noReact || o.oaRound === st.round || DN().out(o)) continue;
      if (Math.hypot(e.x - o.x, e.y - o.y) > MELEE_R || Math.hypot(px - o.x, py - o.y) <= MELEE_R) continue;
      o.ready = false; o.oaRound = st.round; T.oa = true; T.pre = null;
      G.fx(rt, { k: 'text', x: o.x, y: o.y - 1.1, s: '준비 공격', col: '#9fc8ff', t: 0.8, sz: 0.75 });
      F().allyAttack(f, rt, o, e);
      T.oa = false;
      if (gone(rt, e)) return;
    }
    for (const o of list) {
      if (o.oaRound === st.round || o.noReact || reach(o) > MELEE_R || (o.kind === 'mon' && (o.stun > 0 || o.stop > 0 || DN().held(o))) || DN().out(o)) continue;
      if (Math.hypot(px - o.x, py - o.y) > MELEE_R || Math.hypot(e.x - o.x, e.y - o.y) <= MELEE_R) continue;
      if (!F().sees(rt.map, o, e)) continue; // 모퉁이를 돌아 안 보이면 못 친다
      o.oaRound = st.round; T.oa = true; T.pre = null;
      G.fx(rt, { k: 'text', x: o.x, y: o.y - 1.1, s: '기회 공격', col: '#ffb060', t: 0.8, sz: 0.75 });
      if (o.kind === 'mon') hitBy(f, rt, o, e, o.stat ? G.Foe.attacks(o, e)[0] : null, 1);
      else F().allyAttack(f, rt, o, e);
      T.oa = false;
      if (gone(rt, e) || (e.kind !== 'mon' && e.dead)) return;
    }
  }
  // 그 칸에서 표적을 칠 수 있나: 사거리 안 + 시야
  const canHit = (m, e, x, y, tg) => Math.hypot(x - tg.x, y - tg.y) <= reach(e, tg) && F().sees(m, { x, y }, tg);
  function strike(f, rt, st, e, tg) {
    // 명중 굴림이 있는 공격은 주사위부터 (광역 · 내성 공격은 굴리는 쪽이 상대라 바로)
        if (!G.quiet && (e.kind === 'mon' || !(e.def.splash || e.def.chain || e.def.saveAtk))) {
          T.pre = DN().d20(DN().adv(e, tg));
          const why = stakeOf(e, tg, T.pre);
          T.rolls.all++;
          // 판이 갈리는 굴림만 크게 보여 준다. 나머지는 바로 치고 숫자만 뜬다
          if (why !== null || G.DICE_ALL) {
            T.rolls.shown++;
            rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: nameOf(e), foe: e.kind === 'mon', what: '공격', why, tg: nameOf(tg), nat: T.pre, need: DN().ac(tg) - Math.round(DN().hit(e) + DN().bsum(e, 'hit')), pre: true, ok: true };
            st.ph = 'pre'; st.t = why !== null ? PRE_T : PRE_ALL;
            return;
          }
          // 주사위가 없어도 그림이 도착한 뒤에 친다
          st.ph = 'pre'; st.t = CLOSE_T;
          return;
        }
        if (!G.quiet) { st.ph = 'pre'; st.t = CLOSE_T; return; } // 범위 공격도 그림이 도착한 뒤에
        act(f, rt, st, e, tg);
        return;
  }
  const pause = (st, t) => { st.ph = 'wait'; st.t = t; st.ov = null; };
  // 굴림을 크게 보여 줄 때: 동료가 쓰러질 수 있을 때 · 우두머리를 끝낼 수 있을 때 · 20과 1
  function stakeOf(e, tg, nat) {
    if (e.kind === 'mon' && tg.merc && tg.hp / (tg.max || 1) < STAKE_HP) return '쓰러질 위기';
    if (e.kind !== 'mon' && tg.boss && tg.hp / (tg.max || 1) < STAKE_BOSS) return '결정타';
    if (nat === 20 || nat === 1) return '';
    return null;
  }

  function next(f, rt, st) {
    G.Foe.turnEnd(f, rt, st); // 히드라 머리 (SRD)
    // 적이 다 쓰러지면 라운드 중간이라도 바로 끝난다
    if (!foes(rt).length) { finish(f, rt, st); return; }
    // 끝: 남은 적이 없다
    if (st.i + 1 >= st.order.length) {
      if (!st.order.some(x => x.e.kind === 'mon' && !gone(rt, x.e)) && !foes(rt).length) { finish(f, rt, st); return; }
      roster(f, rt, st);
      if (!st.order.some(x => x.e.kind === 'mon')) { finish(f, rt, st); return; }
    }
    const x = st.order[++st.i];
    if (!x || gone(rt, x.e)) { pause(st, 0); return; }
    const e = st.cur = x.e;
    e.ready = false;
    st.ov = null; st.info = { n: nameOf(e), cls: e.merc ? G.Guild.def(e.merc).n : '', foe: e.kind === 'mon', mv: moveOf(e), rg: reach(e) >= 2 ? reach(e) : 1 };
    // 쓰러진 사람의 차례: 사망 내성
    if (e.dying) { G.Story.deathSave(f, rt, e); pause(st, DEATH_T); return; }
    if (e.dead) { pause(st, 0); return; }
    G.Foe.startTurn(f, rt, e); // 일어서기 · 붙잡힘 (SRD)
    if (e.dead) { pause(st, SKIP); return; }
    // 우두머리: 약해지면 달아난다
    if (e.chief && G.Story.chiefTurn(f, rt, e)) { pause(st, BEAT); return; }
    G.fx(rt, { k: 'ring', x: e.x, y: e.y, r: 0.8, t: 0.5, col: e.kind === 'mon' ? '#ff8a8a' : '#ffe08a' });
    // 기절 · 정지 · 마비: 차례를 넘긴다
    const stunned = e.kind === 'mon' && (e.stun > 0 || e.stop > 0);
    if ((stunned || DN().out(e)) && e.kind === 'mon' && G.Foe.regen(f, rt, e)) { pause(st, BEAT); return; } // 재생은 차례 시작에
    if (stunned) { e.stun -= ROUND; e.stop -= ROUND; }
    if (stunned || DN().out(e)) { G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '차례를 넘긴다', col: '#9aa0a8', t: 0.8, sz: 0.75 }); pause(st, SKIP); return; }
    if (e.kind === 'mon' && G.Foe.turn(f, rt, st, e)) { pause(st, BEAT); return; } // 재생 · 치유 (G.Foe)
    // 무너진 사람 · 성격이 나서는 차례 (G.Story · G.Persona)
    if (e.merc && (G.Story.brokenTurn(f, rt, st, e) || G.Persona.turn(f, rt, st, e))) { pause(st, BEAT); return; }
    if (e.kind !== 'mon' && e.broke !== 'rage') {
      e.gcd = 0; e.lastSk = null; e.lastBonus = null; e.freeDone = null; e.lastHitSk = null; e.hit1Done = false; e.heroic = !!(e.merc && F().sk(e, 'ft_heroic'));
      if (G.Skill.persist) G.Skill.persist(f, rt, e, ROUND);
      F().song(f, rt, e, ROUND);
      if (e.fleeT) e.fleeT = 0;
      if (G.Story.aid(f, rt, e)) { pause(st, BEAT); return; }
      if (G.Trinket.beads(f, rt, e)) { pause(st, BEAT); return; } // 화염구 구슬 (SRD)
      // 치유 → 기술 → 공격 순서로 그 차례의 행동을 정한다
      // 기술은 자기 눈에 보이는 적 중 그 기술의 사거리 안에서만 고른다 (G.Skill.tick · G.D.SK_RANGE)
      const before = snapshot(rt), seen = rt.mons.filter(o => !o.down && F().inView(rt, o.x, o.y) && F().sees(rt.map, e, o));
      e.slotUsed = false;
      T.rec = []; for (let i = 0; i < 3; i++) G.Skill.tick(f, rt, e, 0, seen, 'free'); T.rec = null; // 행동 쇄도 · 무모한 공격처럼 칸을 안 쓰는 기능
      T.rec = []; G.Skill.tick(f, rt, e, 0, seen, 1); T.rec = null; // 추가 행동 (SRD): 행동과 따로 하나. 슬롯 주문은 행동 뒤로 미룬다 (큰 주문이 막히지 않게)
      let healed = false;
      for (let i = 0; i < HEAL_N && e.def.heal; i++) healed = F().healTurn(f, rt, e, 99) || healed;
      if (healed) { report(f, rt, e, null, [], before, '치유'); pause(st, BEAT); return; }
      T.rec = [];
      if (!G.Tactics.rushes(e, seen) && !burnFirst(rt, e).length) G.Skill.tick(f, rt, e, 0, seen); // 트롤을 태울 차례에 다른 기술로 행동을 쓰지 않는다
      if (!e.lastBonus) G.Skill.tick(f, rt, e, 0, seen, 2); // 행동이 슬롯을 안 썼으면 추가 행동 슬롯 주문
      const rec = T.rec; T.rec = null;
      if (e.lastSk) { report(f, rt, e, null, rec, before, G.D.MSKILLS[e.lastSk].n); pause(st, BEAT); return; }
    }
    // 내 공격이 아무에게도 안 들으면 걸어 나가지 않고 몸을 사린다 (SRD 회피: 나를 노리는 공격에 불리)
    if (e.kind !== 'mon' && !burnFirst(rt, e).length && G.Foe.useless(e, foes(rt).filter(o => !o.down))) { DN().buff(e, 'dodge', G.Res_ROUND, { hitDis: 1 }); G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '회피', col: '#9fc8ff', t: 0.7, sz: 0.7 }); pause(st, SKIP); return; }
    G.Tactics.snap(rt); // 기술로 옮겨 간 사람이 겹치지 않게
    st.tg = target(rt, e);
    if (!st.tg) { pause(st, SKIP); return; }
    const held = DN().held(e), keep = e.kind === 'mon' ? G.Foe.ranged(e) : G.Dnd.rng(e) >= 2 && G.Tactics.keeps(e) && !st.tg.down, can = (x, y) => canHit(rt.map, e, x, y, st.tg);
    // 유지 · 후퇴: 칠 수 없고 적이 멀면 자리를 지킨다
    if (e.kind !== 'mon' && !canHit(rt.map, e, e.x, e.y, st.tg) && G.Tactics.waits(rt, st, e)) { e.ready = true; G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '준비', col: '#9fc8ff', t: 0.7, sz: 0.7 }); pause(st, SKIP); return; } // 준비 행동 (SRD): 적이 곁에 오면 반응으로 먼저 친다
    // 위기 지시: 체력이 낮은 근접은 후열 동료 곁으로 물러난다
    if (e.kind !== 'mon') { const away = G.Tactics.fall(rt, e, moveOf(e)); if (away && away.length) { G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '물러남', col: '#d8c79a', t: 0.8, sz: 0.75 }); st.path = away; st.ph = 'back'; return; } }
    st.path = e.kind !== 'mon' && keep ? G.Tactics.rearward(rt, e, st.tg, moveOf(e), can) : keep ? G.Tactics.kite(rt, e, st.tg, held ? 0 : moveOf(e), can) : G.Tactics.plan(rt, e, st.tg, held ? 0 : moveOf(e), can); // 원거리 몬스터 · 후퇴 설정의 원거리는 거리를 벌리고 쏜다
    // 무엇을 할지 먼저 보여 준다: 갈 수 있는 칸 · 칠 수 있는 칸 (그리는 쪽: drawRange)
    e.walked = st.path.length; // 돌진 판정 (G.Foe)
    if (!G.quiet) { st.ov = G.Tactics.overlay(rt, e, held ? 0 : moveOf(e), reach(e, st.tg), st.path); st.ph = 'show'; st.t = SHOW_T; return; }
    st.ph = 'move'; st.t = 0;
  }
  function act(f, rt, st, e, tg) {
    // 그사이 밀려나 닿지 않게 되었으면 치지 않는다
    if (GR.dist(e, tg) > reach(e, tg) + 0.01) { pause(st, SKIP); return; }
    e.flip = tg.x < e.x;
    const before = snapshot(rt), hp0 = tg.hp;
    T.rec = [];
    if (e.kind === 'mon') {
      const slow = e.shock > 0 ? 0.6 : 1;
      if (tg.kind === 'rival') G.Rivals.hurt(f, rt, tg, e.atk * ACT_K * slow, e);
      else {
        G.Foe.shot(rt, e, tg);
        const k = (tg.guard ? GUARD : 1) * (tg.broke === 'rage' ? RAGE_TAKEN : 1); tg.guard = false;
        // SRD: 연속 공격은 공격마다 명중 · 피해를 굴린다
        const list = e.stat ? G.Foe.attacks(e, tg) : [null];
        const swap = e.stat && G.Foe.engulf(rt, e, tg); // 슈블링 마운드: 공격 하나를 삼키기로
        for (const a of swap ? list.slice(1) : list) { if (tg.dead || GR.dist(e, tg) > reach(e, tg) + 0.01 || !F().sees(rt.map, e, tg)) break; hitBy(f, rt, e, tg, a, slow * k); } // 밀어내 닿지 않으면 남은 공격은 없다
      }
    } else if (tg.down && !G.Foe.burns(e)) G.Foe.torch(f, rt, e, tg);
    else F().allyAttack(f, rt, e, tg);
    const rec = T.rec; T.rec = null;
    if (rt.phase === 'dead') return;
    G.Story.afterAct(f, rt, e, tg, rec, hp0);
    report(f, rt, e, tg, rec, before, null);
    if (e.merc && DN().boon(e.merc, 'dimension') && tg.hp > 0 && GR.dist(e, tg) <= MELEE_R && (G.Dnd.rng(e) >= 2 || e.hp < e.max * 0.5)) G.Foe.shove(rt, e, tg, 6); // 차원 여행의 은혜: 공격 뒤 순간 이동
    const back = e.kind === 'mon' ? G.Foe.retreat(rt, e, tg) : null;
    if (back && back.length) { st.path = back; st.ph = 'back'; return; }
    pause(st, BEAT);
  }
  function finish(f, rt, st) {
    if (st.round >= 5 || st.downs) dm(rt, `전투 끝 · ${st.round}라운드`);
    G.Story.endFight(f, rt);
    G.Foe.endFight(rt);
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
    const prev = rt.roll, kept = !!(prev && prev.pre && main && prev.nat === main.nat), R = rt.roll = { id: (prev ? prev.id : 0) + 1, keep: kept, quiet: !kept && !G.DICE_ALL, why: kept ? prev.why : undefined, need: kept ? prev.need : undefined, who: nameOf(e), foe: e.kind === 'mon', what: label || '공격', res: res.join(' · ') };
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
