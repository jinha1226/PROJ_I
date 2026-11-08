'use strict';
// 턴제 전투 시제품 (DESIGN.md 71 · 주소에 ?turn): 처음 가는 층의 전투만 탁상 D&D처럼 — 선제권 순서대로 한 명씩 움직이고 굴림을 보여 준다.
// 모든 전투는 턴제다 (옛 실시간 전투 · 아는 층의 빠른 통과는 지웠다, DESIGN.md 161).
// 공격 · 기술 · 내성은 기존 규칙(allyAttack · G.Skill · G.Dnd)을 그대로 부르고, 차례만 나눈다. 타이머는 실제 시간으로 흐르고 한 라운드는 6초 안팎이다.
G.Turn = (() => {
  const U = G.U, GR = G.Grid;
  const F = () => G.Fantasy, B = () => G.Banter, DN = () => G.Dnd;
  const BIG_N = 20; // 이만큼 넘으면 큰 전투
  const SHOW_T = 0.5, BEAT = 0.55, PRE_T = 1.05, PRE_ALL = 0.6, DEATH_T = 1.5, STAKE_HP = 0.35, STAKE_BOSS = 0.2, SKIP = 0.35, MOVE_V = 4.5, CLOSE_T = 0.3, MELEE_R = 1.5, ROUND = 6, DM_T = 3.2, HEAL_N = 1, SPEEDS = [1, 2, 4];
  // 한 행동의 피해 배율 (실시간의 1초 공격을 라운드에 한 번으로 묶는다)
  const ACT_K = 1, SK_K = 1;
  G.Res_ROUND = 10; // 시계로 한 라운드 (버프 · 상태이상 지속)
  // 조우 (DESIGN.md 74): 층마다 방 1~2곳에 몬스터를 모은다. 나머지 작은 몬스터는 실시간으로 지나간다
  const ENC_ROOMS = 2, ENC_ONE = 0.5, ENC_MIN = 5, ENC_MAX = 6, EMPTY_DM = 0.3, GUARD = 0.5, RAGE_TAKEN = 1.3;
  // 승부가 기운 전투는 빨리 감는다 (DM: 「나머지는 정리했다」). 위험 없는 차례를 하나씩 구경시키지 않는다
  const MOP_X = 1, MOP_LOW = 0.85, MOP_HP = 0.5;
  const nameOf = e => e.merc?.name || e.n || e.def?.n || '';
  const gone = (rt, e) => (e.kind === 'mon' ? e.hp <= 0 || !rt.mons.includes(e) : e.kind === 'sum' ? e.hp <= 0 || !(rt.sums || []).includes(e) : (e.dead && !e.dying) || !rt.party.includes(e)); // 아군 생물 (G.Sum)
  const dex = (f, e) => (e.merc ? DN().mod(DN().ab(e.merc).dex) + (G.Feat.has(e.merc, 'alert') ? DN().prof(e.merc.lv) : 0) : (e.stat ? e.stat.dex : Math.floor(f.floor / 6)) + (e.boss ? 2 : 0));

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
    on: () => true, // 서둘러 내려가도 싸움은 차례로
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
        for (const name of G.Foe.encounter(f, f.floor, F().isBoss(f.floor) ? 0 : G.Foe.floorDiff(f.floor))) { // SRD XP 예산으로 짠 무리
          const d = { n: name, ...G.D.F.mon[name] };
          const old = pool.pop(); if (old) rt.mons = rt.mons.filter(o => o !== old);
          const c = []; for (let t = 0; t < 12 && !c.length; t++) { const x = r.x + U.rand(r.w), y = r.y + U.rand(r.h); if (m.c[y * m.w + x] === '.') c.push(x, y); }
          F().spawnMon(rt, f.floor, d, c.length ? c[0] : r.cx, c.length ? c[1] : r.cy, false, { major: true });
        }
      }
    },
    k: (f, rt, a) => (rt.turn ? ACT_K * T.pace : 1), // 성격 · 서사는 피해를 곱하지 않고 굴림(이점 · 주사위)으로 (G.Story.advOf · hitDie)
    skK: rt => (rt.turn ? SK_K * T.pace : 1),
    // 한 행동의 피해 배율. SRD 그대로라 1 (DESIGN.md 121)
    pace: 1,
    no: () => T.turnNo || 0, // 지금 차례 번호: '턴에 한 번' (SRD)
    nameOf: e => nameOf(e),
    // 누가 누구를 노리나 (그리는 쪽: drawAim). 걷는 동안은 표적, 행동 뒤에는 실제로 맞은 쪽. kind: atk 적이 우리를 · foe 우리가 적을 · heal 회복
    aim(rt) {
      const st = rt.turn; if (!st || !st.cur) return null;
      const from = st.cur, side = o => (from.kind === 'mon' ? (o.kind === 'mon' ? 'heal' : 'atk') : o.kind === 'mon' ? 'foe' : 'heal');
      if (st.ph === 'wait') return st.done && st.done.from === from && st.done.list.length ? { from, plan: false, list: st.done.list } : null;
      if ((st.ph === 'show' || st.ph === 'move' || st.ph === 'pre') && st.tg) return { from, plan: true, list: [{ e: st.tg, kind: side(st.tg) }] };
      return null;
    },
    // 굴림 기록 (G.Dnd가 부른다)
    note(r) { if (T.rec) T.rec.push(r); },
    // 굴림 표시: 엄폐와 이점 · 불리까지 보여야 왜 빗나갔는지 안다 (DESIGN.md 131)
    rollMark: r => [r.dark ? '안 보임' : '', r.cov ? `엄폐 +${r.cov}` : '', r.adv > 0 ? '이점' : r.adv < 0 ? '불리' : ''].filter(Boolean).join(' · '),
    rollCalc: r => [`${r.mod < 0 ? '−' : '+'}${Math.abs(Math.round(r.mod))}`, `AC ${r.ac}`, T.rollMark(r)].filter(Boolean).join(' · '),
    speed: f => f.turnX || 1,
    nextSpeed(f) { f.turnX = SPEEDS[(SPEEDS.indexOf(T.speed(f)) + 1) % SPEEDS.length]; },
    // 배속: 이번 틱을 더 돌린다
    extra: (f, rt) => (G.quiet || f.town || rt.ask ? 0 : T.speed(f) - 1 + (rt.turn?.mop ? MOP_X : 0)), // 전투 · 이동 모두. 묻는 동안은 제 속도로

    // 매 틱. true면 전투 중 — 실시간 이동 · 공격을 건너뛴다
    run(f, rt, dt) {
      if (rt.turn && (rt.turn.map !== rt.map || !T.on(f, rt))) { G.Story.endFight(f, rt); rt.turn = null; }
      if (!rt.turn) { if (!foes(rt).length) return false; begin(f, rt); } // 깨어 있는 적이 있으면 차례를 나눈다
      const st = rt.turn;
      // 묻는 동안 차례는 멈춘다
      if (rt.ask && !foes(rt).length) G.Story.answer(rt, rt.ask.def); // 적이 다 쓰러졌으면 묻지 않고 넘어간다
      if (G.Story.askTick(rt, dt)) return true;
      if (f.town) return true;
      if (!rt.turn) return false;
      const php = F().partyHP(rt);
      if (php.max) st.low = Math.min(st.low, php.hp / php.max);
      for (const p of rt.party) { p.moving = false; const c = p.cds; if (c) for (const k in c) if ((c[k] -= (rt.gdt || 0)) <= 0) delete c[k]; } // 재사용 대기: 라운드 시간으로
      for (const o of rt.mons) o.moving = false;
      step(f, rt, st, dt);
      for (let k = 0; k < 120 && rt.turn === st && st.fast && st.t <= 0 && (st.ph === 'wait' || st.ph === 'pre' || st.ph === 'move'); k++) step(f, rt, st, 0); // 같은 선제권 무리는 한 프레임에
      return true;
    },
  };

  // 싸울 상대: 깨어 있고 가까운 몬스터 (달아나는 황금 고블린은 실시간으로)
  const big = o => !!(o.major || o.chief || o.boss);
  const foes = rt => rt.mons.filter(o => o.aggro && !o.flee && !o.ethereal); // 에테르 · 빙의 중인 몸은 노릴 수 없다 // 누구와 싸울지는 G.Flow가 aggro로 정한다
  const rt0 = () => G.RT.fantasy;
  const initOf = (f, e) => { const nat = DN().d20(e.merc ? (G.Trinket.has(e.merc, 'init') || F().sk(e, 'ft_athlete') || F().sk(e, 'sr_feral') || G.Persona.has(e.merc, 'hot') ? 1 : 0) : rt0()?.sneaked ? -1 : 0); return { e, nat, init: nat + dex(f, e) + (e.merc && F().sk(e, 'ft_jack') ? Math.floor(DN().prof(e.merc.lv) / 2) : 0) }; };

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
    G.Res.fightStart(rt.party); G.Util.fightStart(f, rt); rt.undying = false; for (const o of rt.party.concat(rt.mons)) o.reacted = false;
    G.Story.beginFight(f, rt);
  }
  // 라운드 시작: 새로 합류한 사람 · 몬스터를 선제권대로 끼운다
  function roster(f, rt, st) {
    st.order = st.order.filter(x => !gone(rt, x.e));
    const has = new Set(st.order.map(x => x.e));
    if (!st.round) st.bigInit = rt.party.length + foes(rt).length >= BIG_N; // 큰 전투: 선제권 점수(10 + 민첩)를 쓴다 (SRD 용어집 Initiative) — 민첩이 같은 사람끼리 무리가 된다
    G.Story.heat(f, foes(rt));
    G.Lore.meet(f, rt, foes(rt));
    for (const e of rt.party.filter(p => !p.dead || p.dying).concat(G.Sum.alive(rt), foes(rt))) if (!has.has(e)) { let x = st.bigInit ? { e, nat: 10, init: 10 + dex(f, e) } : initOf(f, e); if (e.kind === 'sum' && e.by) { const b = st.order.find(q => q.e === e.by); if (b) x = { e, nat: b.nat, init: b.init - 0.001 }; } /* 아군 생물: 부른 몸과 선제권을 나누고 바로 뒤 (SRD) */ if (e.kind === 'mon' && e.n) { const g = st.gi || (st.gi = {}); if (g[e.n]) x = { ...g[e.n], e }; else g[e.n] = x; } st.order.push(x); if (!st.round && e.merc && F().sk(e, 'sr_reflex')) st.order.push({ e, nat: x.nat, init: x.init - 10 }); } // 도둑의 반사신경 (SRD): 첫 라운드에 두 번
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
  const burnFirst = (rt, e) => { const all = foes(rt), b = all.filter(o => G.Foe.needsFire(o) && G.Lore.knows(G.S.w.fantasy, o)); return b.length && (G.Foe.burns(e) || (G.Dnd.rng(e) || 0) < 2 || all.every(o => o.down)) ? b : []; };
  function target(rt, e) {
    if (e.swallowBy) return e.swallowBy.hp > 0 ? e.swallowBy : null; // 삼켜진 사람은 삼킨 몸만 친다 (완전 엄폐)
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
  const reach = (e, tg) => (e.kind === 'mon' || e.kind === 'sum' ? G.Foe.reach(e) : tg && tg.down && !G.Foe.burns(e) ? MELEE_R : G.Dnd.rng(e) >= 2 ? G.Dnd.rng(e) : MELEE_R); // 횃불은 곁에서
  // 한 차례의 이동력 (칸). D&D의 이동 속도 30피트 = 6칸이 기준
  // SRD: 종족 속도 + 몽크 비무장 이동(2 · 6 · 10 · 14 · 18레벨) · 바바리안 빠른 이동(5레벨, 중갑 제외) − 근력이 모자란 갑옷 2칸
  const srdMove = m => { const SR = G.SRD, sp = G.Res.species(m), base = SR.SPECIES[sp] || { move: 6 }, ln = SR.line(m, sp), q = SR.armorOf(m), str = DN().ab(m).str; let c = ln?.move || base.move; if (m.cls === 'monk' && q.cat === 'none' && !SR.eq(m).shield) c += m.lv >= 18 ? 6 : m.lv >= 14 ? 5 : m.lv >= 10 ? 4 : m.lv >= 6 ? 3 : m.lv >= 2 ? 2 : 0; if (m.cls === 'barbarian' && m.lv >= 5 && q.cat !== 'heavy') c += 2; if (m.cls === 'archer' && m.lv >= 6 && q.cat !== 'heavy') c += 2; if (q.str && str < q.str && !G.Trinket.has(m, 'mithral')) c -= 2; if (G.Trinket.has(m, 'spdMin')) c = Math.max(c, 6); return c; }; // 미스릴: 근력 조건 없음 · 성큼걸음의 장화: 속도 최소 30피트 // 레인저 6레벨: 떠돌이
  const moveOf = e => (G.Act?.dashing(e) && !DN().held(e) ? moveBase(e) : 0) /* 질주 (SRD) */ + (DN().held(e) || (DN().bon(e, 'daze') && G.RT.fantasy?.party?.some(p => !p.dead && Math.hypot(p.x - e.x, p.y - e.y) <= G.Foe.reach(e))) ? 0 : e.stood ? Math.floor(moveBase(e) / 2) : moveBase(e)); // 붙잡힘 · 속박 0, 일어선 차례는 절반 (SRD)
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
      { const e = st.cur, px = e.x, py = e.y, done = gone(rt, e) || !st.path.length || G.Tactics.walk(e, st.path, MOVE_V, st.fast ? 99 : dt); if (!gone(rt, e)) { F().fieldMove(f, rt, e, px, py); opportunity(f, rt, st, e, px, py); } if (gone(rt, e) || rt.phase === 'dead') { pause(st, SKIP); return; } if (!done) return; } // 물러나기 · 재빠른 도주가 아니면 기회 공격 (SRD)
      pause(st, SKIP); return;
    }
    if (st.ph === 'move') {
      const e = st.cur, tg = st.tg;
      if (gone(rt, e) || !tg || (tg.kind === 'mon' ? gone(rt, tg) : tg.dead)) { pause(st, SKIP); return; }
      G.Tactics.snap(rt, e); // 그사이 일어난 사람 등이 겹치지 않게
      // 칸을 따라 걷고, 다 걸었을 때 칠 수 있으면 친다. 아니면 그 자리에서 차례가 끝난다
      G.Tactics.blocked(rt, e, st.path); // 그사이 누가 길을 막았으면 거기서 멈춘다
      const px = e.x, py = e.y, done = !st.path.length || G.Tactics.walk(e, st.path, MOVE_V, st.fast ? 99 : dt);
      F().fieldMove(f, rt, e, px, py);
      opportunity(f, rt, st, e, px, py);
      if (gone(rt, e) || rt.phase === 'dead') { pause(st, SKIP); return; }
      if (!done) return;
      if (G.Act.noAttack(e)) { pause(st, SKIP); return; } // 행동을 질주 · 물러나기 · 숨기에 썼다
      if (canHit(m, e, e.x, e.y, tg)) { strike(f, rt, st, e, tg); return; }
      // 표적에 닿지 못했어도 닿는 적이 있으면 그쪽을 친다 (길이 막혔을 때)
      const alt = (e.kind === 'mon' ? rt.party.filter(p => !p.dead).concat(G.Sum.alive(rt)) : foes(rt)).find(o => canHit(m, e, e.x, e.y, o));
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
    if (px === e.x && py === e.y || G.Foe.has(e, 'nimble') || G.Foe.has(e, 'flyby') || e.fleetN === T.no()) return; /* 근접 비행 (SRD Flyby): 기회 공격을 부르지 않는다 */ // 날랜 걸음: 바람의 걸음(물러나기)
    const list = e.kind === 'mon' ? rt.party.filter(p => !p.dead && !p.dying).concat(G.Sum.alive(rt)) : foes(rt).filter(o => o.hp > 0 && !o.down && !DN().bon(o, 'stagger'));
    // 준비 행동 (SRD): 곁으로 들어오는 적을 반응으로 친다. 반응은 라운드에 한 번
    if (e.kind === 'mon') for (const o of list) {
      if (!o.ready || !DN().react(o)) continue;
      if (Math.hypot(e.x - o.x, e.y - o.y) > MELEE_R || Math.hypot(px - o.x, py - o.y) <= MELEE_R) continue;
      o.ready = false; DN().useReact(o); T.oa = true; T.pre = null;
      G.fx(rt, { k: 'text', x: o.x, y: o.y - 1.1, s: '준비 공격', col: '#9fc8ff', t: 0.8, sz: 0.75 });
      F().allyAttack(f, rt, o, e);
      T.oa = false;
      if (gone(rt, e)) return;
    }
    for (const o of list) {
      const extra = o.reacted && o.oaRound === st.round && (o.oaN || 0) < G.Foe.oaMax(o); // 히드라 반응 머리 (SRD): 기회 공격 전용 반응이 더
      if ((!DN().react(o) && !extra) || o.noReact || reach(o) > MELEE_R || (o.kind === 'mon' && (o.stun > 0 || o.stop > 0 || DN().held(o))) || DN().out(o)) continue;
      if (Math.hypot(px - o.x, py - o.y) > MELEE_R || Math.hypot(e.x - o.x, e.y - o.y) <= MELEE_R) continue;
      if (!F().sees(rt.map, o, e)) continue; // 모퉁이를 돌아 안 보이면 못 친다
      o.oaN = o.oaRound === st.round ? (o.oaN || 0) + 1 : 1; o.oaRound = st.round; DN().useReact(o); T.oa = true; T.pre = null;
      G.fx(rt, { k: 'text', x: o.x, y: o.y - 1.1, s: '기회 공격', col: '#ffb060', t: 0.8, sz: 0.75 });
      if (o.kind === 'mon') hitBy(f, rt, o, e, o.stat ? G.Foe.attacks(o, e)[0] : null, 1);
      else if (o.kind === 'sum') G.Sum.attack(f, rt, o, e, true);
      else F().allyAttack(f, rt, o, e);
      T.oa = false;
      if (gone(rt, e) || (e.kind !== 'mon' && e.dead)) return;
    }
  }
  // 그 칸에서 표적을 칠 수 있나: 사거리 안 + 시야
  const canHit = (m, e, x, y, tg) => Math.hypot(x - tg.x, y - tg.y) <= reach(e, tg) && F().sees(m, { x, y }, tg);
  function strike(f, rt, st, e, tg) {
    // 명중 굴림이 있는 공격은 주사위부터 (광역 · 내성 공격은 굴리는 쪽이 상대라 바로)
        if (!G.quiet && (e.kind === 'mon' || e.kind === 'sum' || !(e.def.splash || e.def.chain || e.def.saveAtk))) {
          T.pre = DN().d20(DN().adv(e, tg));
          const why = stakeOf(e, tg, T.pre);
          T.rolls.all++;
          // 판이 갈리는 굴림만 크게 보여 준다. 나머지는 바로 치고 숫자만 뜬다
          if (why !== null || G.DICE_ALL) {
            T.rolls.shown++;
            rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: nameOf(e), foe: e.kind === 'mon', what: '공격', why, tg: nameOf(tg), nat: T.pre, need: DN().ac(tg) + G.Foe.cover(rt, e, tg) - Math.round(DN().hit(e) + DN().bsum(e, 'hit')), pre: true, ok: true };
            st.ph = 'pre'; st.t = st.fast ? 0 : why !== null ? PRE_T : PRE_ALL;
            return;
          }
          // 주사위가 없어도 그림이 도착한 뒤에 친다
          st.ph = 'pre'; st.t = st.fast ? 0 : CLOSE_T;
          return;
        }
        if (!G.quiet) { st.ph = 'pre'; st.t = st.fast ? 0 : CLOSE_T; return; } // 범위 공격도 그림이 도착한 뒤에
        act(f, rt, st, e, tg);
        return;
  }
  const sameNext = st => { const a = st.order[st.i], b = st.order[st.i + 1]; return !!(a && b && a.init === b.init); }; // 같은 선제권 무리 (SRD: 같은 몬스터 무리는 한 번 굴린다)
  const pause = (st, t) => { st.ph = 'wait'; st.t = st.fast && sameNext(st) ? 0 : t; st.ov = null; };
  // 굴림을 크게 보여 줄 때: 동료가 쓰러질 수 있을 때 · 우두머리를 끝낼 수 있을 때 · 20과 1
  function stakeOf(e, tg, nat) {
    if (e.kind === 'mon' && tg.merc && tg.hp / (tg.max || 1) < STAKE_HP) return '쓰러질 위기';
    if (e.kind !== 'mon' && tg.boss && tg.hp / (tg.max || 1) < STAKE_BOSS) return '결정타';
    if (nat === 20 || nat === 1) return '';
    return null;
  }

  function next(f, rt, st) {
    if (st.cur) st.cur.longNow = false;
    if (st.cur && !gone(rt, st.cur)) G.Skill.endTurn?.(f, rt, st.cur); /* 차례를 마칠 때의 효과 (SRD) */
    st.done = null;
    G.Foe.turnEnd(f, rt, st); // 히드라 머리 (SRD)
    if (st.cur && rt.phase !== 'dead') G.MonAct.legendary(f, rt, st.cur); G.MonAct.flush(); // 전설 행동 (SRD): 다른 생물의 차례가 끝날 때
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
    e.ready = false; e.reacted = false; // 반응은 자기 차례 시작에 되찾는다 (SRD)
    st.fast = sameNext(st) || st.prevInit === x.init; st.prevInit = x.init; // 무리로 함께 움직인다: 미리 보기 · 걷기 · 겨누기를 기다리지 않는다
    // SRD 라운드 시계: 차례마다 한 라운드를 차례 수로 나눠 올린다. 지속 시간 · 반응(라운드에 한 번)은 실제 시간이 아니라 라운드를 따른다
    { const q = G.Res_ROUND / Math.max(1, st.order.length); G.S.runTime += q; F().roundTick(f, rt, q); T.turnNo = (T.turnNo || 0) + 1; }
    F().startTurnFx(f, rt, e); /* 지속 피해: 그 몸의 차례가 시작될 때 주사위로 (SRD) */
    G.Skill.startOf?.(f, rt, e); /* 원소 소환 같은 이어지는 효과 */
    G.MonAct.startOf(f, rt, e); /* 악취 같은 차례 시작의 오라 (SRD) */
    G.Util.turn(f, rt, e); /* 사역마의 돕기 */
    if (gone(rt, e) || rt.phase === 'dead') { pause(st, SKIP); return; }
    st.ov = null; st.info = { n: nameOf(e), cls: e.merc ? G.Guild.def(e.merc).n : '', foe: e.kind === 'mon', mv: moveOf(e), rg: reach(e) >= 2 ? reach(e) : 1 };
    // 쓰러진 사람의 차례: 사망 내성
    if (e.dying) { G.Story.deathSave(f, rt, e); pause(st, DEATH_T); return; }
    if (e.dead) { pause(st, 0); return; }
    G.Foe.startTurn(f, rt, e); // 일어서기 · 붙잡힘 (SRD)
    if (e.kind === 'sum') { if (DN().out(e)) { pause(st, SKIP); return; } if (!G.Sum.turn(f, rt, st, e, tg => G.Tactics.plan(rt, e, tg, moveOf(e), (x, y) => canHit(rt.map, e, x, y, tg)))) { pause(st, SKIP); return; } e.walked = st.path.length; if (!G.quiet && !st.fast) { st.ov = G.Tactics.overlay(rt, e, moveOf(e), reach(e, st.tg), st.path); st.ph = 'show'; st.t = SHOW_T; return; } st.ph = 'move'; st.t = 0; return; } // 아군 생물: 가장 가까운 적에게 걸어가 친다
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
      if (e.fleeT) e.fleeT = 0;
      if (G.Story.aid(f, rt, e)) { pause(st, BEAT); return; }
      if (G.Trinket.beads(f, rt, e)) { pause(st, BEAT); return; } // 화염구 구슬 (SRD)
      // 치유 → 기술 → 공격 순서로 그 차례의 행동을 정한다
      // 기술은 자기 눈에 보이는 적 중 그 기술의 사거리 안에서만 고른다 (G.Skill.tick · G.D.SK_RANGE)
      const before = snapshot(rt), seen = rt.mons.filter(o => !o.down && !o.ethereal && F().inView(rt, o.x, o.y) && F().sees(rt.map, e, o));
      e.slotUsed = false;
      T.rec = []; for (let i = 0; i < 3; i++) G.Skill.tick(f, rt, e, 0, seen, 'free'); T.rec = null; // 행동 쇄도 · 무모한 공격처럼 칸을 안 쓰는 기능
      T.rec = []; G.Skill.tick(f, rt, e, 0, seen, 1); T.rec = null; // 추가 행동 (SRD): 행동과 따로 하나. 슬롯 주문은 행동 뒤로 미룬다 (큰 주문이 막히지 않게)
      { T.rec = []; const itm = G.Items.turn(f, rt, e, seen), r0 = T.rec; T.rec = null; if (itm) { report(f, rt, e, null, r0, before, itm); pause(st, BEAT); return; } } // 물약 · 두루마리 · 충전 주문
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
    e.longNow = false;
    if (e.merc && ['bard', 'paladin', 'warlock', 'mage'].includes(e.merc.cls) && G.Act.influence(f, rt, e)) { pause(st, BEAT); return; } // 설득 (SRD Influence): 꺾인 적을 항복시킨다
    st.tg = target(rt, e);
    if (!st.tg) { if (e.kind !== 'mon' && G.Act.search(rt, e)) { pause(st, BEAT); return; } pause(st, SKIP); return; } // 보이는 적이 없으면 찾기 (SRD Search)
    const held = DN().held(e), keep = e.kind === 'mon' ? G.Foe.ranged(e) : !G.Dnd.melee(e) && G.Dnd.rng(e) >= 2 && G.Tactics.keeps(e) && !st.tg.down, can = (x, y) => canHit(rt.map, e, x, y, st.tg);
    // 유지 · 후퇴: 칠 수 없고 적이 멀면 자리를 지킨다
    if (e.kind !== 'mon' && !canHit(rt.map, e, e.x, e.y, st.tg) && G.Tactics.waits(rt, st, e)) { if (G.Act.idle(f, rt, e)) { pause(st, BEAT); return; } e.ready = true; G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '준비', col: '#9fc8ff', t: 0.7, sz: 0.7 }); pause(st, SKIP); return; } // 준비 행동 (SRD): 적이 곁에 오면 반응으로 먼저 친다
    // 위기 지시: 체력이 낮은 근접은 후열 동료 곁으로 물러난다
    if (e.kind !== 'mon') { const away = G.Tactics.fall(rt, e, moveOf(e)); if (away && away.length) { if (G.Act.adjacent(rt, e).length) G.Act.disengage(rt, e); else G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '물러남', col: '#d8c79a', t: 0.8, sz: 0.75 }); /* 물러나기 (SRD Disengage): 기회 공격 없이 */ st.path = away; st.ph = 'back'; return; } }
    st.path = e.kind !== 'mon' && keep ? G.Tactics.rearward(rt, e, st.tg, moveOf(e), can) : keep ? G.Tactics.kite(rt, e, st.tg, held ? 0 : moveOf(e), can) : G.Tactics.plan(rt, e, st.tg, held ? 0 : moveOf(e), can); // 원거리 몬스터 · 후퇴 설정의 원거리는 거리를 벌리고 쏜다
    { const end = st.path.length ? st.path[st.path.length - 1] : e; if (!held && !keep && !can(end.x, end.y) && !G.Act.dashing(e) && !(e.kind === 'mon' ? G.Foe.ranged(e) : DN().rng(e) >= 2) && (e.kind !== 'mon' || !G.Foe.reachL?.(e))) { G.Act.dash(e); const p2 = G.Tactics.plan(rt, e, st.tg, moveOf(e), can); if (p2.length >= st.path.length) { st.path = p2; G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '질주', col: '#9fc8ff', t: 0.7, sz: 0.7 }); } } } // 질주 (SRD Dash): 행동으로 두 배 — 닿아도 이번 차례엔 치지 않는다
    // 기본 사거리로 못 치면 긴 사거리 · 투척으로 (SRD: 불리)
    { const end = st.path.length ? st.path[st.path.length - 1] : e, L = e.kind === 'mon' ? G.Foe.reachL(e) : G.Dnd.rngL(e); if (L && !st.tg.down && !can(end.x, end.y)) { e.longNow = true; if (!can(end.x, end.y)) e.longNow = false; } }
    // 무엇을 할지 먼저 보여 준다: 갈 수 있는 칸 · 칠 수 있는 칸 (그리는 쪽: drawRange)
    e.walked = st.path.length; // 돌진 판정 (G.Foe)
    if (!G.quiet && !st.fast) { st.ov = G.Tactics.overlay(rt, e, held ? 0 : moveOf(e), reach(e, st.tg), st.path); st.ph = 'show'; st.t = SHOW_T; return; }
    st.ph = 'move'; st.t = 0;
  }
  function act(f, rt, st, e, tg) {
    // 그사이 밀려나 닿지 않게 되었으면 치지 않는다
    if (GR.dist(e, tg) > reach(e, tg) + 0.01) { pause(st, SKIP); return; }
    e.flip = tg.x < e.x;
    const before = snapshot(rt), hp0 = tg.hp;
    T.rec = [];
    if (e.kind === 'sum') G.Sum.attack(f, rt, e, tg);
    else if (e.kind === 'mon') {
      const slow = 1; // 서리 광선 (SRD)은 이동만 줄인다
      {
        G.Foe.shot(rt, e, tg);
        const k = 1; tg._dodge = !!tg.guard; tg.guard = false; // 수비 = 회피 행동 (SRD): 이번 공격들에 불리 · 날뛰는 사람은 G.Dnd.adv에서 이점
        // SRD: 연속 공격은 공격마다 명중 · 피해를 굴린다
        const list = (e.stat ? G.Foe.attacks(e, tg) : [null]).slice(e._skipAtk || 0); e._skipAtk = 0; // 공격 하나를 숨결 · 주문으로 바꿨다 (SRD 용)
        const swap = e.stat && G.Foe.engulf(rt, e, tg); // 슈블링 마운드: 공격 하나를 삼키기로
        for (const a of swap ? list.slice(1) : list) { if (tg.dead || GR.dist(e, tg) > reach(e, tg) + 0.01 || !F().sees(rt.map, e, tg)) break; hitBy(f, rt, e, tg, a, slow * k); } tg._dodge = false; if (e.stat && !tg.dead) G.MonAct.after(f, rt, e, tg); G.MonAct.flush(); /* 광란 */ /* 연속 공격의 「… and uses Constrict」 (SRD) */ // 밀어내 닿지 않으면 남은 공격은 없다
      }
    } else if (tg.down && !G.Foe.burns(e)) { if (G.Lore.knows(f, tg)) G.Foe.torch(f, rt, e, tg); }
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
    for (const [o, h] of before) { const d = Math.floor(Math.max(0, h)) - Math.floor(Math.max(0, o.hp)); /* 재생 중 쓰러진 체력(0.001)은 0으로 */ if (foeSide(o) && d > 0) dmg += d; if (!foeSide(o) && d < 0) heal -= d; }
    const atks = rec.filter(r => r.att === e), main = atks[0] || rec.find(r => r.sv), hits = atks.filter(r => r.hit).length;
    { const list = new Map(), put = (o, kind) => { if (o && !list.has(o)) list.set(o, { e: o, kind }); }; for (const [o, h] of before) { const d = Math.floor(Math.max(0, h)) - Math.floor(Math.max(0, o.hp)); /* 재생 중 쓰러진 체력(0.001)은 0으로 */ if (foeSide(o) && d > 0) put(o, e.kind === 'mon' ? 'atk' : 'foe'); else if (!foeSide(o) && d < 0) put(o, 'heal'); } for (const r of rec) if (r.att === e || r.sv) put(r.tg, e.kind === 'mon' ? 'atk' : 'foe'); if (rt.turn) rt.turn.done = { from: e, list: [...list.values()] }; }
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
      R.calc = T.rollCalc(main); R.mark = T.rollMark(main);
      R.atk = true; R.word = main.crit ? '치명타' : main.hit ? '명중' : !hits && dmg > 0 ? '스침' : '빗나감'; // 스침: 빗나가도 피해가 들어가는 무기 숙련 (SRD Graze)
    } else { R.ok = true; if (tg) R.tg = nameOf(tg); }
    // 기록과 말풍선은 기억할 순간만
    { // 기록: 맞은 사람마다 한 줄 (범위 주문은 여러 줄)
      const lines = []; for (const [o, h] of before) { const d = Math.floor(Math.max(0, h)) - Math.floor(Math.max(0, o.hp)); /* 재생 중 쓰러진 체력(0.001)은 0으로 */ if (!d) continue; const gone0 = o.kind === 'mon' ? gone(rt, o) : o.dead; if (foeSide(o) && d > 0) lines.push(`${nameOf(o)} ${U.fmt(d)} 피해${gone0 ? ' · 쓰러짐' : ''}`); else if (!foeSide(o) && d < 0) lines.push(`${nameOf(o)} +${U.fmt(-d)} 회복`); }
      const head = [label || '', atks.length > 1 && hits ? `${atks.length}회 중 ${hits} 명중` : R.word || ''].filter(Boolean).join(' '); // 여러 번 치면 첫 굴림 하나로 말하지 않는다
      if (lines.length > 1) { log(rt, e, label || '공격'); for (const s of lines) log(rt, e, `→ ${s}`); }
      else if (lines.length) log(rt, e, `${head ? head + ' ' : ''}→ ${lines[0]}`);
      else if (main || label) log(rt, e, [head, R.tg ? `→ ${R.tg}${hits ? ' 피해 없음' : ''}` : ''].filter(Boolean).join(' ')); // 맞았는데 체력이 그대로: 면역 · 임시 체력 · 반응
    }
  }
  return T;
})();
