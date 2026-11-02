'use strict';
// 이야기 생성 (DESIGN.md 72 · 림월드의 스토리텔러 + 탁상 D&D): 대본 대신 사건이 다음 사건의 원인이 된다. 턴제 시제품(?turn)에서만.
// 조우: 파티가 성격 · 직업 · 능력치로 접근법을 고르고 굴린다. 결과가 전투 · 보상 · 원한으로 이어진다.
// 사망: 턴제 전투에서 쓰러지면 사망 내성 — 세 번 실패하면 영구히 죽는다. 살아나면 흉터가 남을 수 있다. 모두 f.saga(모험 일지)에 남는다.
G.Story = (() => {
  const U = G.U, GR = G.Grid;
  const F = () => G.Fantasy, B = () => G.Banter, DN = () => G.Dnd, GD = () => G.Guild;
  const SAY = 1.7, DM = 2.3, ROLL = 1.6, SAGA_MAX = 300, GRUDGE_P = 0.6, SCAR_P = 0.35, SCAR_MAX = 3, FRIEND_AID = 1, OTHER_AID = 0.25, MEEK_AID = 0.6, WAKE_HP = 0.3, CHIEF_FLEE = 0.35, ASK_T = 7, RETREAT_DROP = 0.3, NEM_BRIBE = 0.3;
  const nameOf = e => e.merc?.name || e.n || '';
  const jong = n => { const c = n.charCodeAt(n.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 > 0; };
  const ig = n => n + (jong(n) ? '이' : '가'), eul = n => n + (jong(n) ? '을' : '를'), wa = n => n + (jong(n) ? '과' : '와');
  const SCARS = {
    eye: { n: '한쪽 눈 흉터', d: '명중 −1 · 피해 ×1.1', hitB: -1, atk: 1.1 },
    leg: { n: '다리를 전다', d: '이동 −10% · 체력 ×1.1', move: -0.1, hp: 1.1 },
    hand: { n: '떨리는 손', d: '명중 −1 · 체력 ×1.12', hitB: -1, hp: 1.12 },
    face: { n: '얼굴의 흉터', d: '체력 ×0.95 · 피해 ×1.1', hp: 0.95, atk: 1.1 },
    rib: { n: '부러졌던 갈비뼈', d: '체력 ×0.92 · 명중 +1', hp: 0.92, hitB: 1 },
  };
  // 무너진 모습: 성격을 따라가고, 같은 모습으로 두 번 무너지면 버릇이 된다 (Darkest Dungeon: 사람마다 무너지는 방식이 다르다)
  const BREAKS = {
    flee: { n: '도망치는 버릇', dm: n => `${ig(n)} 무기를 떨어뜨리고 달아난다!`, say: '난 못 해, 못 한다고!', log: n => `${ig(n)} 싸움 한복판에서 달아났다.` },
    rage: { n: '뒤집히는 눈', dm: n => `${n}의 눈이 뒤집힌다.`, say: '다 죽여 버리겠어!', log: n => `${ig(n)} 이성을 잃고 날뛰었다.` },
    loot: { n: '손버릇', dm: n => `${ig(n)} 싸움 한복판에서 주머니부터 채운다.`, say: '어차피 다 죽어. 이건 내 거야!', log: n => `${ig(n)} 동료가 싸우는 동안 주머니를 채웠다.` },
    freeze: { n: '얼어붙는 몸', dm: n => `${ig(n)} 그 자리에 얼어붙었다.`, say: '…', log: n => `${ig(n)} 그 자리에 얼어붙었다.` },
  };
  const BREAK_OF = { coward: 'flee', hot: 'rage', brawler: 'rage', greedy: 'loot' };
  const BREAK_ANY = ['freeze', 'flee', 'rage'];
  const STRESS_K = { coward: 1.3, meek: 1.15, hot: 0.9, brawler: 0.85 };
  const RESOLVE_DC = 16, RESOLVE_K = 1.5, RAGE_K = 1.4, VOW_K = 1.25, GRIEF_ATK = 0.9, GRIEF_RUNS = 3, HABIT_K = 1.15, BROKE_AFTER = 60, HOME_RELIEF = 40, REST_RELIEF = 25, REST_HP = 0.35;
  const HEAT_MIN = -3, HEAT_MAX = 5, HEAT_K = 0.18, EASY_LOW = 0.7, CRISIS_LOW = 0.35, STAIR_HP = 0.7, STAIR_STRESS = 40, STAIR_EVERY = 3, STAIR_HOME = 0.4, PRESS_STRESS = 6;
  const LAST_SAVE = [0, 6, 10, 21], LEAD_AID = 0.45, DRY_K = 0.15, RECENT = 3, BLESS_K = 1.2, BLESS_FIGHTS = 3, FAVOR_P = 0.5, BETRAY_P = 0.25, HEX_RUNS = 2, HEX_ATK = 0.9;
  // DM 성향 (RimWorld의 스토리텔러 셋): 정석 · 느긋(세지 않고 자주 쉬게 한다) · 변덕(층마다 위험이 널뛴다)
  const DMS = {
    steady: { n: '정석', d: '편하면 세지고 위기면 쉰다', k: HEAT_K, ease: HEAT_K, room: 0.4, max: HEAT_MAX, restAt: CRISIS_LOW },
    gentle: { n: '느긋', d: '덜 세지고 자주 쉰다', k: 0.1, ease: 0.24, room: 0.5, max: 2, restAt: 0.55 },
    wild: { n: '변덕', d: '층마다 위험이 널뛴다', k: 0.24, ease: 0.24, room: 0.6, max: HEAT_MAX, restAt: CRISIS_LOW, swing: 2 },
  };
  // 결정 방침: 플레이어가 없을 때 기본값이 된다 (안 고른 선택창). 맡김은 파티 성격대로
  const POLICY = { party: { n: '맡김', d: '파티 성격대로' }, careful: { n: '신중', d: '위험하면 돌아온다' }, bold: { n: '과감', d: '끝까지 간다' }, coin: { n: '돈 먼저', d: '짐을 지킨다' } };
  const dmOf = f => DMS[f.dmStyle] || DMS.steady, polOf = () => G.S.w.fantasy.policy || 'party';
  const CHIEF = ['이빨 깨진', '애꾸눈', '붉은 손', '늙은', '피 묻은', '귀 잘린'];

  const add = (f, s, who = []) => { (f.saga = f.saga || []).unshift({ s, fl: f.floor, sn: G.Season.st(f).n, who: who.filter(Boolean).map(m => m.uid) }); if (f.saga.length > SAGA_MAX) f.saga.pop(); };
  const living = rt => rt.party.filter(p => !p.dead && p.merc);
  const dm = (rt, s) => G.Turn.dm(rt, s);
  const say = (rt, who, s) => B().say(rt, who, s, { pri: true });
  const hasPers = (p, k) => (p.merc.pers || []).includes(k);

  // 굴림 하나: 판독 패널에 보여 주고 성공 여부를 돌려준다
  function roll(rt, who, what, ab, dc, fit) {
    const m = who.merc, mod = DN().mod(DN().ab(m)[ab]) + (fit ? DN().prof(m.lv) : 0), nat = DN().d20(0), ok = nat !== 1 && (nat === 20 || nat + mod >= dc);
    rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: nameOf(who), what, nat, ok, calc: `${DN().AB_N[ab]} ${mod < 0 ? '−' : '+'}${Math.abs(mod)} · DC ${dc}`, word: nat === 20 ? '대성공' : nat === 1 ? '대실패' : ok ? '성공' : '실패', res: '' };
    return ok;
  }
  // 접근법 고르기: 잘하는 쪽 + 직업 + 성격 + 약간의 변덕. 다른 생각인 사람이 있으면 함께 돌려준다
  function choose(rt, opts, crew = living(rt)) {
    const scored = [];
    for (const p of crew) for (const o of opts) {
      let v = DN().mod(DN().ab(p.merc)[o.ab]) + Math.random() * 3;
      if (o.cls && o.cls.includes(p.merc.cls)) v += 3;
      if (o.pol && o.pol.includes(polOf())) v += 4;
      for (const k in o.pers || {}) if (hasPers(p, k)) v += o.pers[k];
      scored.push({ p, o, v });
    }
    scored.sort((a, b) => b.v - a.v);
    const best = scored[0];
    return best && { who: best.p, o: best.o, other: scored.find(x => x.o !== best.o && x.p !== best.p) };
  }
  const fitOf = (p, o) => !!(o.cls && o.cls.includes(p.merc.cls));
  // 그 접근법을 가장 잘할 사람
  const bestFor = (rt, o, crew = living(rt)) => crew.slice().sort((a, b) => modOf(b, o) - modOf(a, o))[0];
  const modOf = (p, o) => DN().mod(DN().ab(p.merc)[o.ab]) + (fitOf(p, o) ? DN().prof(p.merc.lv) : 0);
  const pct = (p, o, dc) => U.clamp(Math.round((21 - (dc - modOf(p, o))) * 5), 5, 95);
  // 묻기 (라이벌 조우처럼): 파티가 멈추고 잠깐 기다린다. 안 고르면 파티가 정한 대로(def). 조우 시 묻기를 끄면 묻지 않는다
  function ask(f, rt, title, opts, def, done) {
    if (G.quiet || f.askMeet === false) { done(def); return; }
    rt.ask = { id: (rt.askId = (rt.askId || 0) + 1), title, opts, def, t: ASK_T, max: ASK_T, done };
  }
  // 조우의 접근법: 고르게 하고 { who, o, other, by(플레이어가 골랐나) }로
  function* decide(f, rt, title, list, dc, extra = [], crew = living(rt)) {
    const c = choose(rt, list, crew);
    if (!c) return null;
    const opts = list.map(o => { const p = bestFor(rt, o, crew); return { label: o.what, who: nameOf(p), sub: `${nameOf(p)} · ${pct(p, o, dc)}%`, o, p }; }).concat(extra.map(e => ({ label: e.label, sub: e.sub || '', o: e })));
    let got = null;
    // 접근법 말고 다른 길(지나가기 · 제물 등)도 방침이나 파티 사정에 맞으면 기본값이 된다
    const alt = extra.find(e => (e.pol && e.pol.includes(polOf())) || (polOf() === 'party' && e.want && e.want(rt)));
    ask(f, rt, title, opts, opts.findIndex(x => x.o === (alt || c.o)), i => { got = i; });
    while (got === null) yield 0.1;
    const x = opts[got];
    if (x.o === c.o) return c;
    return { who: x.p || c.who, o: x.o, other: null, by: true };
  }
  function freeCell(rt, r) { const m = rt.map; for (let i = 0; i < 30; i++) { const x = r.x + U.rand(r.w), y = r.y + U.rand(r.h); if (m.c[y * m.w + x] === '.') return [x, y]; } return [r.cx, r.cy]; }
  function pack(f, rt, r, n, extra) {
    const band = G.D.F.bands[F().band(f.floor)], out = [];
    for (let i = 0; i < n; i++) { const [x, y] = freeCell(rt, r); out.push(F().spawnMon(rt, f.floor, U.pick(band.mons), x, y, false, { aggro: true, major: true, ...extra })); }
    F().refreshEnts(rt);
    return out;
  }
  function chief(f, rt, r, n, d, k = 3) {
    const [x, y] = freeCell(rt, r), band = G.D.F.bands[F().band(f.floor)], base = d || U.pick(band.mons);
    const o = F().spawnMon(rt, f.floor, base, x, y, false, { aggro: true, chief: true, s: 1.25, label: n, hp: F().monHP(f.floor) * k, max: F().monHP(f.floor) * k, atk: F().monAtk(f.floor) * 1.4, gold: F().monGold(f.floor) * 6 });
    o.n = n; o.base = { n: base.n, t: base.t, wpn: base.wpn, ty: base.ty };
    F().refreshEnts(rt);
    return o;
  }
  const reward = (f, k) => { const g = F().monGold(f.floor) * k * F().goldMult(f); F().gain(f, g); return g; };
  const pay = (f, g) => { const c = Math.min(G.Exp.carry(f), g); f.carry -= c; return c; };

  // ── 조우 (생성기: yield = 다음 줄까지 기다릴 초) ──
  const SCENES = {
    // 잠긴 문: 조용히 따면 보물, 부수면 소리가 난다
    *door(f, rt, r) {
      dm(rt, '낡은 철문이 앞을 막고 있다. 자물쇠가 녹슬었다.');
      yield DM;
      const pick = { ab: 'dex', cls: ['rogue', 'monk', 'archer'], pers: { careful: 2, hot: -2 }, pol: ['careful', 'coin'], what: '자물쇠 따기', line: ['내가 따 볼게. 잠깐만.', '조용히 하자. 금방 열어.'] };
      const force = { ab: 'str', cls: ['barbarian', 'dragoon', 'paladin'], pers: { hot: 3, brawler: 2, careful: -2 }, pol: ['bold'], what: '문 부수기', line: ['비켜. 부수는 게 빨라.', '문이 사람보다 약하지.'] };
      const c = choose(rt, [pick, force]);
      if (!c) return;
      say(rt, c.who, U.pick(c.o.line));
      yield SAY;
      if (c.other && Math.random() < 0.4) { say(rt, c.other.p, c.o === pick ? '그냥 부수자니까…' : '조용히 좀 하자니까!'); yield SAY; }
      const ok = roll(rt, c.who, c.o.what, c.o.ab, 12 + Math.floor(f.floor / 5), fitOf(c.who, c.o));
      yield ROLL;
      if (c.o === pick && ok) {
        const g = reward(f, 8);
        rt.roll.res = `+${U.fmt(g)}`;
        dm(rt, '찰칵. 문 너머에 먼지 쌓인 금화 궤짝이 있다.');
        G.Trinket.drop(f, rt, 'chest', r.cx, r.cy);
        add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 잠긴 문을 조용히 땄다.`, [c.who.merc]);
      } else if (c.o === pick) {
        dm(rt, '자물쇠 안에서 무언가 부러진다. 안쪽에서 발소리가 들린다.');
        pack(f, rt, r, 2);
      } else if (ok) {
        const g = reward(f, 5);
        rt.roll.res = `+${U.fmt(g)}`;
        dm(rt, '문이 쾅 하고 쓰러진다. 금화가 보인다 — 그리고 소리를 들은 것들도.');
        pack(f, rt, r, 2);
        add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 철문을 맨몸으로 부쉈다.`, [c.who.merc]);
      } else {
        c.who.hp = Math.max(1, c.who.hp - c.who.max * 0.15);
        dm(rt, '문은 꿈쩍도 않고 어깨만 나갔다. 소리는 온 층에 울렸다.');
        say(rt, c.who, '…아무 말도 하지 마.');
        pack(f, rt, r, 3);
      }
    },
    // 잠든 무리: 기습 · 살금살금 지나가기 · 말 걸기. 우두머리가 살아 달아나면 나중에 돌아온다
    *camp(f, rt, r) {
      const n = `${U.pick(CHIEF)} ${U.pick(G.D.F.bands[F().band(f.floor)].mons).n}`;
      dm(rt, `${n}의 무리가 모닥불 곁에서 잠들어 있다. 아직 우리를 못 봤다.`);
      yield DM;
      const ambush = { ab: 'dex', cls: ['rogue', 'archer'], pers: { hot: 3, brawler: 2, coward: -3 }, pol: ['bold', 'coin'], what: '기습', line: ['자는 놈부터 찌르자.', '내가 먼저 간다. 신호하면 따라와.'] };
      const sneak = { ab: 'dex', cls: ['rogue', 'monk'], pers: { careful: 3, coward: 3, hot: -3 }, pol: ['careful'], what: '살금살금 지나가기', line: ['건드리지 말고 지나가자.', '발소리 죽여. 그냥 가는 거야.'] };
      const talk = { ab: 'cha', cls: ['bard', 'paladin', 'warlock'], pers: { meek: 3, hot: -3, greedy: 1 }, what: '말 걸기', line: ['내가 말로 해 볼게.', '싸울 필요 없어. 깨워서 얘기하자.'] };
      const dc = 13 + Math.floor(f.floor / 5), c = yield* decide(f, rt, `${n}의 무리가 잠들어 있다`, [ambush, sneak, talk], dc);
      if (!c) return;
      say(rt, c.who, U.pick(c.o.line));
      yield SAY;
      if (c.other && Math.random() < 0.5) { say(rt, c.other.p, c.other.o === ambush ? '말은 무슨, 그냥 치자.' : c.other.o === talk ? '잠깐, 말이 통할지도 몰라.' : '제발 그냥 지나가자…'); yield SAY; }
      const ok = roll(rt, c.who, c.o.what, c.o.ab, dc, fitOf(c.who, c.o));
      yield ROLL;
      if (c.o === ambush) {
        const boss = chief(f, rt, r, n), rest = pack(f, rt, r, 2);
        if (ok) { for (const o of [boss, ...rest]) o.stop = 6; dm(rt, `${nameOf(c.who)}의 칼이 먼저 닿았다. 무리가 허둥지둥 일어난다.`); add(f, `${f.floor}층 · ${ig(nameOf(c.who))} ${n}의 무리를 기습했다.`, [c.who.merc]); }
        else dm(rt, '발밑에서 뼛조각이 부러진다. 무리가 벌떡 일어난다!');
      } else if (c.o === sneak) {
        if (ok) { const g = reward(f, 4); rt.roll.res = `+${U.fmt(g)}`; dm(rt, '숨소리 사이로 지나갔다. 나오는 길에 놈들의 주머니도 조금 가벼워졌다.'); add(f, `${f.floor}층 · ${n}의 무리 곁을 소리 없이 지나갔다.`, [c.who.merc]); }
        else { chief(f, rt, r, n); pack(f, rt, r, 2); dm(rt, `${nameOf(c.who)}의 발이 냄비를 찼다. 땡그랑.`); }
      } else if (ok) {
        const g = pay(f, F().monGold(f.floor) * 3 * F().goldMult(f));
        rt.roll.res = g > 0 ? `통행료 −${U.fmt(g)}` : '';
        dm(rt, `${ig(n)} 칼을 내린다. "통행료를 내면 지나가게 해 주지."`);
        add(f, `${f.floor}층 · ${ig(nameOf(c.who))} ${wa(n)} 협상해 피를 보지 않았다.`, [c.who.merc]);
        yield SAY;
        if (hasPers(c.who, 'greedy')) say(rt, c.who, '…이 돈 언젠가 돌려받을 거야.');
      } else {
        chief(f, rt, r, n); pack(f, rt, r, 2);
        dm(rt, `${ig(n)} 말을 끊고 칼을 뽑는다. "시끄러워."`);
      }
    },
    // 수상한 상인: 흥정 · 살피기. 욕심 많으면 덜컥 산다
    *merchant(f, rt, r) {
      const price = F().monGold(f.floor) * 10 * F().goldMult(f);
      dm(rt, '짐을 잔뜩 진 상인이 혼자 앉아 있다. "이런 데서 손님이라니, 싸게 드리지요."');
      yield DM;
      if (G.Exp.carry(f) < price * 0.4) { const p = U.pick(living(rt)); if (p) say(rt, p, '살 돈이 없어. 그냥 가자.'); yield SAY; return; }
      const haggle = { ab: 'cha', cls: ['bard', 'warlock'], pers: { greedy: 3 }, what: '흥정', line: ['그 값이면 도둑이지. 반으로 해.', '자, 얘기 좀 합시다.'] };
      const eye = { ab: 'wis', cls: ['scout', 'cleric', 'monk'], pers: { careful: 3 }, what: '물건 살피기', line: ['잠깐, 그거 진짜 맞아?', '이 사람, 눈빛이 이상한데.'] };
      const dc = 13 + Math.floor(f.floor / 5), pass = { label: '그냥 지나간다', leave: true, pol: ['careful', 'coin'] }, c = yield* decide(f, rt, `수상한 상인 · ${U.fmt(price)}`, [haggle, eye], dc, [pass]);
      if (!c) return;
      if (c.o === pass) { dm(rt, '상인이 등 뒤에서 혀를 찬다. "후회할 텐데."'); return; }
      say(rt, c.who, U.pick(c.o.line));
      yield SAY;
      const ok = roll(rt, c.who, c.o.what, c.o.ab, dc, fitOf(c.who, c.o));
      yield ROLL;
      if (c.o === eye && ok) {
        dm(rt, '가짜다. 들킨 상인이 짐을 내팽개치고 달아난다. 진짜 금화 몇 닢이 흘렀다.');
        const g = reward(f, 3); rt.roll.res = `+${U.fmt(g)}`;
        add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 가짜 상인을 알아봤다.`, [c.who.merc]);
      } else if (ok) {
        const g = pay(f, price * 0.5); rt.roll.res = `−${U.fmt(g)}`;
        dm(rt, '상인이 한숨을 쉬며 물건을 내민다. "이러면 남는 게 없는데…"');
        G.Trinket.drop(f, rt, 'chest', c.who.x, c.who.y);
        add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 상인에게서 반값에 물건을 샀다.`, [c.who.merc]);
      } else {
        const g = pay(f, price); rt.roll.res = `−${U.fmt(g)}`;
        dm(rt, '돌아서고 보니 상인은 없고, 산 물건은 돌멩이다.');
        say(rt, c.who, '…이건 아무한테도 말하지 마.');
        add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 수상한 상인에게 돌멩이를 샀다.`, [c.who.merc]);
      }
    },
    // 쉬어 가는 곳: 위기 뒤에 온다 (RimWorld의 재난 사이 숨 고르기). 지난 일이 입에 오른다
    *rest(f, rt) {
      dm(rt, '불씨가 남은 화덕이 있다. 잠시 숨을 돌린다.');
      yield DM;
      for (const p of living(rt)) { p.hp = Math.min(p.max, p.hp + p.max * REST_HP); S.stress(f, rt, p, -REST_RELIEF); }
      const a = U.pick(living(rt)), b = U.pick(living(rt).filter(p => p !== a));
      if (a && !S.memory(f, rt, a)) say(rt, a, U.pick(['조금만 쉬었다 가자.', '아직 손이 떨리네.', '다들 살아 있어서 다행이야.']));
      yield SAY;
      if (b) { say(rt, b, U.pick(['그래. 조금만.', '…', '다음엔 더 잘하자.'])); yield SAY; }
    },
    // 계단 앞: 더 갈까, 돌아갈까. 욕심쟁이와 신중이 먼저 입을 연다
    *stairs(f, rt) {
      const hp = F().partyHP(rt), rate = hp.max ? hp.hp / hp.max : 1, carry = G.Exp.carry(f), full = G.Exp.full(f), P = G.Persona, greedy = P.who(rt, 'greedy')[0], careful = P.who(rt, 'careful')[0];
      if (greedy) { say(rt, greedy, full ? '짐이야 더 묶으면 되지. 내려가자!' : '아직 더 벌 수 있어. 내려가자!'); yield SAY; }
      if (careful) { say(rt, careful, rate < STAIR_HP ? '이 상태로 더 내려가는 건 무리야.' : '이쯤에서 돌아가도 충분해.'); yield SAY; }
      let got = null;
      ask(f, rt, `${f.floor}층 계단 · 체력 ${Math.round(rate * 100)}%`, [{ label: '내려간다', sub: full ? `짐 한도 +30% · 위험 증가` : '위험 증가' }, { label: '돌아간다', sub: `짐 +${U.fmt(carry)}` }], stairDef(f, rate, careful && !greedy), i => { got = i; });
      while (got === null) yield 0.1;
      rt.stairAsk = f.floor;
      if (got === 1) { dm(rt, '오늘은 여기까지다. 왔던 길을 되짚는다.'); G.Exp.home(f, rt, 'retreat'); return; }
      if (full) f.press = (f.press || 0) + 1;
      f.heat = Math.min(HEAT_MAX, (f.heat || 0) + 1);
      if (rate < STAIR_HP) { for (const p of living(rt)) S.stress(f, rt, p, PRESS_STRESS); add(f, `${f.floor}층 · 체력 ${Math.round(rate * 100)}%로 더 내려가기로 했다.`); }
      dm(rt, '아무도 돌아가자는 말을 꺼내지 않는다. 계단을 내려간다.');
    },
    // 철창 속 사람: 구하면 동료가 되거나, 칼을 뽑는다
    *captive(f, rt, r) {
      const cls = U.pick(GD().licensed()), lv = Math.max(1, Math.round(living(rt).reduce((a, p) => a + p.merc.lv, 0) / (living(rt).length || 1)) - 2), m = GD().make(f, cls, { lv });
      m.lv = lv;
      dm(rt, `철창 안에 ${GD().def(m).n} 한 사람이 묶여 있다. "제발… 꺼내 주시오."`);
      yield DM;
      const dc = 12 + Math.floor(f.floor / 5);
      const pick = { ab: 'dex', cls: ['rogue', 'monk', 'archer'], pers: { careful: 2 }, pol: ['careful'], what: '자물쇠 따기', line: ['조용히 있어요. 금방 열어요.', '이 자물쇠 정도야.'] };
      const bend = { ab: 'str', cls: ['barbarian', 'dragoon', 'paladin'], pers: { hot: 2, meek: 1 }, pol: ['bold'], what: '창살 휘기', line: ['물러나 있어. 휘어 버릴게.', '이런 건 힘이지.'] };
      const pass = { label: '그냥 지나간다', leave: true, pol: ['coin'], want: q => G.Persona.who(q, 'coward').length > 0 && !G.Persona.who(q, 'meek').length };
      const c = yield* decide(f, rt, `철창 속 ${m.name} · ${GD().def(m).n} Lv ${lv}`, [pick, bend], dc, [pass]);
      if (!c) return;
      if (c.o === pass) {
        const p = living(rt).find(q => hasPers(q, 'meek') || q.merc.cls === 'paladin' || q.merc.cls === 'cleric');
        dm(rt, '등 뒤에서 쇠창살을 흔드는 소리가 한참 따라온다.');
        if (p) { say(rt, p, '…그 사람, 두고 와도 되는 거야?'); S.stress(f, rt, p, 12); add(f, `${f.floor}층 · ${ig(nameOf(p))} 철창 속 ${eul(m.name)} 두고 온 일을 마음에 담았다.`, [p.merc]); }
        return;
      }
      say(rt, c.who, U.pick(c.o.line));
      yield SAY;
      const ok = roll(rt, c.who, c.o.what, c.o.ab, dc, fitOf(c.who, c.o));
      yield ROLL;
      if (!ok) { dm(rt, '쇠 부딪는 소리가 복도를 울린다. 간수들이 온다!'); pack(f, rt, r, 2); return; }
      if (Math.random() < BETRAY_P) {
        dm(rt, `풀려난 ${ig(m.name)} 웃으며 칼을 뽑는다. "고맙군. 짐은 두고 가."`);
        chief(f, rt, r, m.name, null, 2);
        add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 철창에서 꺼내 준 ${m.name}에게 뒤통수를 맞았다.`, [c.who.merc]);
        return;
      }
      if (f.mercs.length >= GD().ROSTER_MAX) { const g = reward(f, 5); rt.roll.res = `+${U.fmt(g)}`; dm(rt, `${ig(m.name)} 고개를 숙이고 품에서 금화를 꺼낸다. "자리가 없다면 이거라도."`); return; }
      f.mercs.push(m);
      G.Bond.add(f, rt, c.who.merc, m, 6);
      m.owes = c.who.merc.name;
      F().syncAllies(f);
      dm(rt, `${ig(m.name)} 비틀거리며 일어난다. "이 은혜는 칼로 갚겠소."`);
      add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 철창에서 구한 ${ig(m.name)} 용병단에 들어왔다.`, [c.who.merc, m]);
      G.log(`합류 · ${m.name} (${GD().def(m).n} Lv ${lv})`, 'fantasy', 'good');
    },
    // 피 마르지 않는 제단: 기도는 판정, 제물은 확실한 축복
    *shrine(f, rt) {
      dm(rt, '이끼 낀 제단이 있다. 그릇에 담긴 피가 아직 마르지 않았다.');
      yield DM;
      const dc = 13 + Math.floor(f.floor / 5), price = G.Exp.carry(f) * 0.2;
      const pray = { ab: 'wis', cls: ['cleric', 'paladin', 'monk'], pers: { careful: 1, meek: 2 }, pol: ['careful', 'coin'], what: '기도', line: ['잠깐만. 예를 갖추자.', '함부로 건드리지 말고, 내가 할게.'] };
      const offer = { label: '제물을 바친다', sub: `짐 −${U.fmt(price)} · 전투 ${BLESS_FIGHTS}회 피해 ×${BLESS_K}`, offer: true, pol: ['bold'] };
      const pass = { label: '그냥 지나간다', leave: true };
      const c = yield* decide(f, rt, '피 묻은 제단', [pray], dc, price > 0 ? [offer, pass] : [pass]);
      if (!c || c.o === pass) { if (c) dm(rt, '아무도 제단을 돌아보지 않는다.'); return; }
      if (c.o === offer) {
        pay(f, price); f.bless = BLESS_FIGHTS;
        dm(rt, '금화가 그릇 속으로 가라앉는다. 무기가 조금 가벼워진 기분이다.');
        add(f, `${f.floor}층 · 피 묻은 제단에 금화를 바쳤다.`);
        return;
      }
      say(rt, c.who, U.pick(c.o.line));
      yield SAY;
      const ok = roll(rt, c.who, c.o.what, c.o.ab, dc, fitOf(c.who, c.o));
      yield ROLL;
      if (ok) { for (const p of living(rt)) S.stress(f, rt, p, -20); dm(rt, '촛불도 없는데 제단이 잠깐 환해진다. 어깨가 가벼워졌다.'); add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 제단에서 기도해 모두의 마음을 가라앉혔다.`, [c.who.merc]); return; }
      for (const p of living(rt)) S.stress(f, rt, p, 10);
      f.heat = Math.min(dmOf(f).max, (f.heat || 0) + 1);
      dm(rt, '그릇의 피가 끓어오른다. 아래쪽 어딘가에서 무언가 깨어났다.');
    },
    // 해골이 지키는 금화: 욕심의 대가
    *hoard(f, rt) {
      const g0 = F().monGold(f.floor) * 14 * F().goldMult(f), P = G.Persona, gr = P.who(rt, 'greedy')[0], ca = P.who(rt, 'careful')[0];
      dm(rt, '금화 더미 위에 해골이 앉아 있다. 손가락이 금화 한 닢을 움켜쥔 채다.');
      yield DM;
      if (gr) { say(rt, gr, '저 정도면 올해 장사 끝이야!'); yield SAY; }
      if (ca) { say(rt, ca, '저 사람도 그렇게 말했겠지.'); yield SAY; }
      const dc = 14 + Math.floor(f.floor / 5);
      const look = { ab: 'wis', cls: ['cleric', 'scout', 'mage', 'archmage'], pers: { careful: 3 }, pol: ['careful'], what: '살피고 조금만', line: ['손대지 말고 기다려. 내가 볼게.'] };
      const grab = { label: '다 쓸어 담는다', sub: `짐 +${U.fmt(g0)} · 저주`, grab: true, pol: ['bold', 'coin'], want: () => !!gr };
      const pass = { label: '둔다', leave: true };
      const c = yield* decide(f, rt, '해골의 금화', [look], dc, [grab, pass]);
      if (!c || c.o === pass) { if (c) dm(rt, '해골의 빈 눈이 파티를 따라오는 것만 같다.'); return; }
      if (c.o === grab) {
        F().gain(f, g0);
        const who = gr || U.pick(living(rt));
        who.merc.hex = { left: HEX_RUNS };
        for (const p of living(rt)) S.stress(f, rt, p, 8);
        f.heat = Math.min(dmOf(f).max, (f.heat || 0) + 2);
        dm(rt, `해골의 손가락이 ${nameOf(who)}의 손목을 스쳤다. 뼛속까지 차가워진다.`);
        add(f, `${f.floor}층 · ${ig(nameOf(who))} 해골의 금화를 쓸어 담고 저주를 받았다.`, [who.merc]);
        return;
      }
      say(rt, c.who, U.pick(c.o.line));
      yield SAY;
      const ok = roll(rt, c.who, c.o.what, c.o.ab, dc, fitOf(c.who, c.o));
      yield ROLL;
      if (ok) { const g = g0 * 0.4; F().gain(f, g); rt.roll.res = `+${U.fmt(g)}`; dm(rt, '저주받지 않은 금화만 골라 담았다. 해골은 그대로 앉아 있다.'); add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 해골의 금화에서 깨끗한 것만 골라냈다.`, [c.who.merc]); return; }
      c.who.merc.hex = { left: HEX_RUNS };
      dm(rt, `${ig(nameOf(c.who))} 금화를 집자 손끝이 검게 물든다.`);
      add(f, `${f.floor}층 · ${ig(nameOf(c.who))} 해골의 금화에 손을 댔다가 저주를 받았다.`, [c.who.merc]);
    },
    // 다친 적: 살려 보내면 언젠가 돌아온다 (은혜일 수도, 배신일 수도)
    *mercy(f, rt) {
      const d = U.pick(G.D.F.bands[F().band(f.floor)].mons), crew = living(rt);
      dm(rt, `다리가 부러진 ${ig(d.n)} 벽에 기대 떨고 있다. 무기는 이미 놓쳤다.`);
      yield DM;
      const soft = crew.filter(p => hasPers(p, 'meek') || p.merc.cls === 'paladin' || p.merc.cls === 'cleric').length, hard = crew.filter(p => hasPers(p, 'hot') || hasPers(p, 'brawler')).length;
      let got = null;
      ask(f, rt, `다친 ${d.n}`, [{ label: '끝낸다', sub: `+${U.fmt(F().monGold(f.floor) * 2 * F().goldMult(f))}` }, { label: '살려 보낸다', sub: '언젠가 돌아온다' }], polOf() === 'coin' || polOf() === 'bold' || hard > soft ? 0 : 1, i => { got = i; });
      while (got === null) yield 0.1;
      if (got === 0) {
        reward(f, 2);
        const p = crew.find(q => hasPers(q, 'meek'));
        if (p) { say(rt, p, '꼭 그래야 했어?'); S.stress(f, rt, p, 8); }
        else dm(rt, '짧은 비명이 복도에 흩어진다.');
        return;
      }
      (f.favors = f.favors || []).push({ n: d.n, fl: f.floor });
      dm(rt, `${ig(d.n)} 절뚝이며 어둠 속으로 사라진다. 한 번 뒤를 돌아본다.`);
      add(f, `${f.floor}층 · 다친 ${eul(d.n)} 살려 보냈다.`);
    },
    // 살려 보낸 적이 돌아왔다
    *favor(f, rt, r, q) {
      dm(rt, `절뚝이는 발소리가 다가온다. ${q.fl}층에서 살려 보낸 ${d_(q.n)}.`);
      yield DM;
      if (Math.random() < BETRAY_P) {
        dm(rt, '뒤에서 동족들이 줄줄이 따라 나온다. 다리는 이미 다 나은 모양이다.');
        pack(f, rt, r, 3);
        add(f, `${f.floor}층 · ${q.fl}층에서 살려 보낸 ${ig(q.n)} 동족을 끌고 돌아왔다.`);
        return;
      }
      const g = reward(f, 10);
      for (const o of rt.mons) if (o.major && !o.aggro) { o.major = false; o.stop = 6; }
      dm(rt, `${ig(q.n)} 금화 주머니를 내려놓고 아래층 길을 가리킨다. +${U.fmt(g)}`);
      add(f, `${f.floor}층 · ${q.fl}층에서 살려 보낸 ${ig(q.n)} 금화를 물고 돌아왔다.`);
      for (const p of living(rt)) S.stress(f, rt, p, -8);
    },
    // 앙숙 다툼 (RimWorld의 사회적 싸움): 말리거나, 주먹으로 풀게 둔다
    *quarrel(f, rt) {
      const pair = foePair(f, rt) || living(rt).filter(p => (p.merc.stress || 0) >= 55).slice(0, 2);
      const [a, b] = pair;
      if (!a || !b) return;
      say(rt, a, U.pick([`${B().call(b)}, 아까 일부러 늦게 왔지?`, `${B().call(b)}, 너 때문에 죽을 뻔했어.`, `또 그 소리야, ${B().call(b)}?`]));
      yield SAY;
      say(rt, b, U.pick(['그래서 어쩔 건데?', '한 번만 더 말해 봐.', '네 탓이지 누구 탓이야.']));
      yield SAY;
      dm(rt, `${wa(nameOf(a))} ${nameOf(b)} 사이에 칼이 반쯤 뽑혔다.`);
      yield DM;
      const others = living(rt).filter(p => p !== a && p !== b), dc = 13;
      if (!others.length) { S.brawl(f, rt, a, b); return; }
      const calm = { ab: 'cha', cls: ['bard', 'paladin', 'cleric'], pers: { meek: 2, careful: 1, hot: -2 }, pol: ['careful', 'coin'], what: '말리기', line: ['그만! 싸울 거면 나가서 싸워.', '둘 다 진정해. 살아 돌아가고 나서 해.'] };
      const letGo = { label: '주먹으로 풀게 둔다', sub: '진 쪽이 다친다 · 정 +4', brawl: true, pol: ['bold'], want: q => G.Persona.who(q, 'hot').concat(G.Persona.who(q, 'brawler')).length > 0 };
      const c = yield* decide(f, rt, `${wa(nameOf(a))} ${nameOf(b)}의 다툼`, [calm], dc, [letGo], others);
      if (!c || c.o === letGo) { S.brawl(f, rt, a, b); return; }
      say(rt, c.who, U.pick(c.o.line));
      yield SAY;
      const ok = roll(rt, c.who, c.o.what, c.o.ab, dc, fitOf(c.who, c.o));
      yield ROLL;
      if (ok) {
        G.Bond.add(f, rt, a.merc, b.merc, 6);
        for (const p of [a, b]) S.stress(f, rt, p, -10);
        dm(rt, '칼이 다시 칼집으로 들어간다. 아무도 눈을 마주치지 않는다.');
        add(f, `${f.floor}층 · ${ig(nameOf(c.who))} ${wa(nameOf(a))} ${nameOf(b)}의 싸움을 말렸다.`, [c.who.merc, a.merc, b.merc]);
      } else { dm(rt, `${nameOf(c.who)}의 말은 아무도 듣지 않았다.`); S.brawl(f, rt, a, b); }
    },
    // 쓰러진 동료의 유해: 거두면 마음이 놓이고, 뒤지면 돈이 남는다
    *remains(f, rt, d) {
      const friends = living(rt).filter(p => (p.merc.grief && p.merc.grief.n === d.name));
      const speak = friends[0] || U.pick(living(rt));
      if (speak) { say(rt, speak, d.by ? `여기였지. ${d.by}한테…` : `${d.name}, 또 왔어.`); yield SAY; }
      const loot = F().monGold(f.floor) * 6 * F().goldMult(f);
      let got = null;
      ask(f, rt, `${d.name}의 유해`, [{ label: '거두어 묻는다', sub: '스트레스 −20' }, { label: '주머니를 챙긴다', sub: `+${U.fmt(loot)} · 스트레스 +10` }], polOf() === 'coin' ? 1 : 0, i => { got = i; });
      while (got === null) yield 0.1;
      d.laid = true;
      if (got === 0) {
        for (const p of living(rt)) { S.stress(f, rt, p, -20); if (p.merc.grief && p.merc.grief.n === d.name) p.merc.grief.left = 1; }
        dm(rt, `돌을 쌓아 ${d.name}의 자리를 만들었다.`);
        add(f, `${f.floor}층 · ${d.name}의 유해를 거두어 묻었다.`);
        return;
      }
      F().gain(f, loot);
      for (const p of living(rt)) S.stress(f, rt, p, 10);
      if (speak) say(rt, speak, `미안해, ${d.name}.`);
      add(f, `${f.floor}층 · ${d.name}의 유해에서 주머니를 챙겼다.`);
    },
    // 돌아온 원수
    *nemesis(f, rt, r, g) {
      dm(rt, `낯익은 목소리가 어둠에서 울린다. "${g.fl}층의 빚을 받으러 왔다." — ${g.n}${jong(g.n) ? '이다' : '다'}.`);
      yield DM;
      const carry = G.Exp.carry(f);
      let got = null;
      ask(f, rt, `${ig(g.n)} 돌아왔다`, [{ label: '맞선다', sub: '우두머리 + 무리' }, { label: '돈으로 넘긴다', sub: `짐 −${U.fmt(carry * NEM_BRIBE)} · 또 돌아온다` }], polOf() === 'careful' ? 1 : 0, i => { got = i; });
      while (got === null) yield 0.1;
      if (got === 1) { pay(f, carry * NEM_BRIBE); (f.grudges = f.grudges || []).push({ ...g, fl: f.floor, times: (g.times || 1) + 1 }); dm(rt, `${ig(g.n)} 금화를 세며 웃는다. "다음엔 더 가져와."`); add(f, `${f.floor}층 · ${g.n}에게 돈을 주고 목숨을 샀다.`); return; }
      const m = rt.party.find(p => p.merc && p.merc.uid === g.by && !p.dead);
      if (m) { say(rt, m, `${g.n}! 이번엔 안 놓친다.`); yield SAY; }
      else { const p = U.pick(living(rt)); if (p) { say(rt, p, '저놈이 그놈이야? 조심해.'); yield SAY; } }
      chief(f, rt, r, g.n, g.base, 4 + (g.times || 0)).times = g.times || 1;
      pack(f, rt, r, 2);
    },
  };

  // 지금 원정대의 앙숙 한 쌍
  function foePair(f, rt) { const c = living(rt); for (const a of c) for (const b of c) if (a !== b && G.Bond.rel(f, a.merc, b.merc) === 'foe') return [a, b]; return null; }
  const d_ = n => n + (jong(n) ? '이다' : '다');
  // 계단의 기본값: 방침이 있으면 방침대로, 맡김이면 체력과 신중한 사람 말대로
  function stairDef(f, rate, cautious) {
    const pol = polOf();
    if (pol === 'bold') return 0;
    if (pol === 'careful') return rate < 0.85 || G.Exp.full(f) ? 1 : 0;
    if (pol === 'coin') return G.Exp.full(f) || rate < STAIR_HOME ? 1 : 0;
    return rate < STAIR_HOME || (cautious && rate < STAIR_HP) ? 1 : 0;
  }

  const S = {
    SCARS, add,
    // 주먹다짐: 힘 대결. 진 쪽이 다치고 이긴 쪽은 후련하다. 둘 다 조금 풀린다
    brawl(f, rt, a, b) {
      const v = p => DN().d20(0) + DN().mod(DN().ab(p.merc).str), [w, l] = v(a) >= v(b) ? [a, b] : [b, a];
      l.hp = Math.max(1, l.hp - l.max * 0.25);
      S.stress(f, rt, l, 12);
      S.stress(f, rt, w, -15);
      G.Bond.add(f, rt, a.merc, b.merc, 4);
      dm(rt, `${ig(nameOf(w))} ${eul(nameOf(l))} 벽에 밀어붙였다. 코피가 터지고서야 끝났다.`);
      add(f, `${f.floor}층 · ${ig(nameOf(w))} ${wa(nameOf(l))} 주먹다짐 끝에 이겼다.`, [w.merc, l.merc]);
    },
    on: (f, rt) => G.Turn.on(f, rt),
    // 흉터 수치 (G.Guild.mult · sum)
    scarMul(m, k) { let v = k === 'atk' && m.grief ? GRIEF_ATK : 1; for (const id of m.scars || []) if (SCARS[id][k] != null && k !== 'hitB' && k !== 'move') v *= SCARS[id][k]; return v; },
    scarSum(m, k) { let v = 0; for (const id of m.scars || []) if ((k === 'hitB' || k === 'move') && SCARS[id][k]) v += SCARS[id][k]; return v; },
    // 방에 들어섰다 (G.Explore): 스토리텔러 — 힘들면 쉬어 갈 조우, 편하면 위험한 조우, 원한이 남았으면 그쪽을 먼저
    room(f, rt, ex, r, mons, chest) {
      if (!S.on(f, rt) || mons.length || chest || rt.scene || rt.sceneFl === f.floor || r === rt.map.rooms[0]) return;
      if (f.restDue) { f.restDue = false; S.play(f, rt, ex, r, 'rest'); return; }
      const g = f.grudges && f.grudges.find(q => q.fl < f.floor), hp = F().partyHP(rt), hurt = hp.max ? 1 - hp.hp / hp.max : 0;
      if (g && Math.random() < GRUDGE_P) { f.grudges = f.grudges.filter(q => q !== g); S.play(f, rt, ex, r, 'nemesis', g); return; }
      const fav = f.favors && f.favors.find(q => q.fl < f.floor);
      if (fav && Math.random() < FAVOR_P) { f.favors = f.favors.filter(q => q !== fav); S.play(f, rt, ex, r, 'favor', fav); return; }
      // 첫 조우는 2층에서 꼭 보여 주고, 사건 없이 지나온 층이 쌓일수록 다음 방이 수상해진다 (RimWorld: 긴 공백을 두지 않는다)
      const seen = f.sceneDry || 0;
      if (f.floor < 2 || (f.sceneN && Math.random() > dmOf(f).room + seen * DRY_K)) return;
      const k = S.pickScene(f, rt, hurt);
      f.recent = (f.recent || []).concat(k).slice(-RECENT);
      S.play(f, rt, ex, r, k);
    },
    // 지금 일어날 수 있는 사건 중 최근에 없던 것. 파티 사정에 맞는 사건은 더 자주
    pickScene(f, rt, hurt) {
      const crew = living(rt), w = { door: 2, camp: 2, merchant: hurt > 0.4 ? 4 : 1, shrine: 1.5, hoard: 1.5, captive: 1.5, mercy: 1.5 };
      if (foePair(f, rt) || crew.filter(p => (p.merc.stress || 0) >= 55).length >= 2) w.quarrel = 4;
      const keys = Object.keys(w).filter(k => !(f.recent || []).includes(k));
      let n = Math.random() * keys.reduce((a, k) => a + w[k], 0);
      for (const k of keys) if ((n -= w[k]) <= 0) return k;
      return keys[0] || 'door';
    },
    // 목숨을 구했다: 그 짝에 처음일 때만 일지에 남기고, 구해진 사람은 빚을 기억한다
    owe(f, a, d, s) {
      const m = d.merc, saved = m.savedBy || (m.savedBy = {});
      if (!saved[a.merc.uid]) add(f, s, [a.merc, m]);
      saved[a.merc.uid] = 1;
      m.owes = a.merc.name;
    },
    play(f, rt, ex, r, k, arg) {
      rt.sceneFl = f.floor;
      f.sceneN = (f.sceneN || 0) + 1;
      f.sceneDry = -1;
      rt.roll = null;
      if (ex) ex.q.length = 0;
      rt.scene = { gen: SCENES[k](f, rt, r, arg), t: 0.2 };
    },
    // 매 틱 (G.Explore). true면 파티가 멈춰 있다
    tick(f, rt, dt) {
      const sc = rt.scene;
      if (!sc || rt.turn) return false;
      if (S.askTick(rt, dt)) return true;
      if ((sc.t -= dt) > 0) return true;
      const n = sc.gen.next();
      if (n.done) { rt.scene = null; return false; }
      sc.t = n.value;
      return true;
    },

    // ── 사망 내성 ──
    onDown(f, rt, p, mo) {
      if (!rt.turn || !p.merc) return;
      p.dying = { ok: 0, no: 0, by: mo ? nameOf(mo) : null };
      p.downed = true;
      p.downBy = p.dying.by;
      rt.turn.downs++;
      for (const q of rt.party) if (q !== p && q.merc && !q.dead) S.stress(f, rt, q, G.Bond.rel(f, q.merc, p.merc) === 'friend' ? 18 : 8);
      S.stress(f, rt, p, 15);
      p.reviveT = 1e9;
      dm(rt, `${ig(nameOf(p))} 쓰러졌다!`);
      // 위기: 끌고 물러날까 (전투에 한 번, 보스전은 물러설 수 없다)
      if (!rt.turn.asked) { rt.turn.asked = true; S.askBack(f, rt, p, `${ig(nameOf(p))} 쓰러졌다`, polOf() === 'careful'); }
    },
    askBack(f, rt, p, title, back) {
      if (rt.mons.some(o => o.boss && o.aggro) || !rt.party.some(q => !q.dead)) return;
      ask(f, rt, title, [{ label: '버틴다', sub: '내성에 맡긴다' }, { label: '끌고 후퇴', sub: `짐 −${Math.round(RETREAT_DROP * 100)}% · 귀환` }], back ? 1 : 0, i => { if (i === 1) S.retreat(f, rt, p); });
    },
    retreat(f, rt, p) {
      p.dying = null;
      const c = G.Exp.carry(f);
      f.carry = c * (1 - RETREAT_DROP);
      dm(rt, `${eul(nameOf(p))} 들쳐 업고 달린다.`);
      add(f, `${f.floor}층 · 쓰러진 ${eul(nameOf(p))} 업고 물러났다.`, [p.merc]);
      S.endFight(f, rt);
      rt.turn = null;
      G.Exp.home(f, rt, 'retreat');
    },
    // 묻기 시간: 흐르는 동안 그 장면과 차례는 멈춘다. true면 기다리는 중 (G.Turn · G.Story.tick)
    askTick(rt, dt) {
      const a = rt.ask;
      if (!a) return false;
      if ((a.t -= dt) > 0) return true;
      S.answer(rt, a.def);
      return false;
    },
    answer(rt, i) { const a = rt.ask; if (!a) return; rt.ask = null; a.done(i); },
    deathSave(f, rt, p) {
      const d = p.dying, nat = DN().d20(0);
      if (nat === 20) { S.wake(f, rt, p, 0.1); d.ok = 3; }
      else if (nat === 1) d.no += 2;
      else if (nat >= 10) d.ok++;
      else d.no++;
      rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: nameOf(p), what: '사망 내성', nat, ok: nat >= 10, calc: `성공 ${Math.min(d.ok, 3)} · 실패 ${Math.min(d.no, 3)}`, word: nat === 20 ? '일어났다' : nat === 1 ? '대실패' : nat >= 10 ? '버틴다' : '꺼져 간다', res: '' };
      if (d.no >= 3) S.die(f, rt, p);
      // 단장의 숨이 꺼져 간다: 한 번 더 묻는다. 기본은 후퇴 (용병단이 멈추지 않게 — 과감이면 버틴다)
      else if (p.merc.lead && d.no >= 1 && !rt.turn.askedLead && p.dying) { rt.turn.askedLead = true; S.askBack(f, rt, p, `${ig(nameOf(p))} 꺼져 간다`, polOf() !== 'bold'); }
      else if (d.ok >= 3 && p.dying) { p.dying = null; rt.roll.word = '숨이 돌아왔다'; }
    },
    wake(f, rt, p, k) {
      p.dying = null; p.dead = false; p.hp = p.max * k; p.reviveT = 0;
      G.fx(rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.7 });
      S.scar(f, rt, p);
    },
    // 동료의 차례: 쓰러진 사람을 돌본다 (치유사는 일으키고, 그 외에는 지혜 판정으로 숨을 붙인다). true면 차례를 썼다
    aid(f, rt, a) {
      const d = rt.party.find(p => p.dying && p !== a && p.merc.lead) || rt.party.find(p => p.dying && p !== a);
      if (!d || !a.merc) return false;
      const friend = G.Bond.rel(f, a.merc, d.merc) === 'friend';
      // 일으키는 기적은 치유사마다 전투에 한 번 (D&D의 주문 슬롯처럼 — 아니면 치유사가 있는 한 아무도 죽지 않는다)
      const raise = a.def.heal && !a.raised;
      if (!raise && Math.random() >= (friend ? FRIEND_AID : d.merc.lead ? LEAD_AID : hasPers(a, 'meek') ? MEEK_AID : OTHER_AID)) return false;
      if (raise) {
        a.raised = true;
        S.wake(f, rt, d, WAKE_HP);
        rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: nameOf(a), tg: nameOf(d), what: '일으키기', ok: true, word: '일어났다', res: '' };
        S.owe(f, a, d, `${f.floor}층 · ${ig(nameOf(a))} 죽어 가던 ${eul(nameOf(d))} 일으켰다.`);
      } else {
        const ok = roll(rt, a, '응급처치', 'wis', 10, false);
        rt.roll.tg = nameOf(d);
        say(rt, a, `${B().call(d)}, 눈 떠!`);
        if (ok) { d.dying = null; S.owe(f, a, d, `${f.floor}층 · ${ig(nameOf(a))} 쓰러진 ${nameOf(d)}의 숨을 붙였다.`); }
      }
      G.Bond.add(f, rt, a.merc, d.merc, 3);
      return true;
    },
    die(f, rt, p) {
      const m = p.merc, by = p.dying && p.dying.by;
      p.dying = null;
      (f.fallen = f.fallen || []).unshift({ lead: !!m.lead, name: m.name, cls: m.cls, look: m.look, adv: m.adv, lv: m.lv, fl: f.floor, by, sn: G.Season.st(f).n, scars: (m.scars || []).length });
      add(f, `${f.floor}층 · ${ig(nameOf(p))} ${by ? by + '에게 ' : ''}쓰러져 돌아오지 못했다. Lv ${m.lv}.`, [m]);
      dm(rt, `${nameOf(p)}의 숨이 멎었다.`);
      G.log(`사망 · ${m.name} (Lv ${m.lv}) · ${f.floor}층`, 'fantasy', 'bad');
      const friend = rt.party.find(q => q !== p && !q.dead && q.merc && G.Bond.rel(f, q.merc, m) === 'friend'), any = friend || U.pick(living(rt).filter(q => q !== p));
      if (any) say(rt, any, friend ? `${B().call(p)}! 안 돼, 일어나!` : `${B().call(p)}…`);
      S.aftermath(f, rt, p, m, by);
      if (m.lead) S.succeed(f, rt, p, m); else GD().dismiss(f, m.uid);
    },
    // 단장이 죽었다: 살아 있는 사람 중 가장 레벨이 높고 매력 있는 사람이 깃발을 든다. 아무도 없으면 새 단장을 만든다
    succeed(f, rt, hero, dead) {
      G.Trinket.free(f, dead.uid);
      G.Bond.free(f, dead.uid);
      const score = q => q.lv * 2 + DN().mod(DN().ab(q).cha) - (q.inj > 0 ? 3 : 0);
      const downed = q => { const b = rt.allies.find(a => a.merc === q); return !!(b && (b.dying || b.dead)); };
      const heir = f.mercs.slice().sort((a, b) => downed(a) - downed(b) || score(b) - score(a))[0];
      f.leader = null;
      if (!heir) { const L = GD().leader(f); hero.merc = L; hero.dead = true; hero.reviveT = 1e9; f.gen = (f.gen || 1) + 1; add(f, `${f.floor}층 · 아무도 남지 않았다. 소식을 들은 신참이 ${f.gen}대 단장으로 깃발을 물려받았다.`, [L]); F().dressHero(f, hero); return; }
      const body = rt.allies.find(a => a.merc === heir);
      f.mercs = f.mercs.filter(q => q !== heir);
      f.lineup = (f.lineup || []).filter(u => u !== heir.uid);
      delete heir.job;
      heir.lead = true;
      f.leader = heir;
      hero.merc = heir;
      F().dressHero(f, hero);
      hero.max = F().heroHP(f);
      if (body) {
        // 그 사람의 몸이 곧 단장의 몸이 된다
        hero.x = body.x; hero.y = body.y; hero.dead = body.dead; hero.dying = body.dying; hero.downed = body.downed; hero.reviveT = body.reviveT;
        hero.hp = hero.dead ? 0 : hero.max * Math.max(0.05, body.hp / (body.max || 1));
        body.dying = null; body.dead = true;
      } else { hero.dead = true; hero.reviveT = 1e9; }
      F().syncAllies(f);
      f.gen = (f.gen || 1) + 1;
      dm(rt, `${ig(heir.name)} 깃발을 집어 든다. ${f.gen}대 단장이다.`);
      add(f, `${f.floor}층 · ${ig(heir.name)} ${dead.name}의 뒤를 이어 ${f.gen}대 단장이 되었다.`, [heir]);
      G.log(`승계 · ${heir.name}`, 'fantasy', 'good');
    },
    // 전투가 끝났다: 쓰러졌던 사람이 일어난다. 흉터가 남을 수 있다
    endFight(f, rt) {
      S.settle(f, rt);
      for (const p of rt.party.slice()) if (p.dying && p.dying.no >= 1 && DN().d20(0) < LAST_SAVE[p.dying.no]) S.die(f, rt, p);
      for (const p of rt.party) {
        p.dying = null;
        p.raised = false;
        p.surge = 0; p.bigT = false; p.guard = false; p.resolve = false;
        if (p.dead && p.reviveT > 1e6) p.reviveT = 0.5;
        if (p.downed) { p.downed = false; S.scar(f, rt, p); }
      }
    },
    // 전멸: 쓰러진 사람마다 남은 내성을 몰아서 굴린다. 살아남은 사람은 끌려 나온다
    wipe(f, rt) {
      // 단장은 맨 마지막에: 살아남는 사람이 정해져야 깃발이 쓰러진 사람에게 넘어가 줄줄이 죽지 않는다
      const next = () => rt.party.find(q => q.dying && !q.merc.lead) || rt.party.find(q => q.dying);
      for (let p = next(); p; p = next()) {
        const d = p.dying;
        while (d.ok < 3 && d.no < 3) { const nat = DN().d20(0); if (nat === 1) d.no += 2; else if (nat >= 10) d.ok++; else d.no++; }
        if (d.no >= 3) S.die(f, rt, p); else { p.dying = null; p.downed = false; S.scar(f, rt, p); }
      }
    },
    scar(f, rt, p, force) {
      const m = p.merc;
      if (!m) return;
      p.downed = false;
      m.scars = m.scars || [];
      if (m.scars.length >= SCAR_MAX || (!force && Math.random() > SCAR_P)) return;
      const left = Object.keys(SCARS).filter(k => !m.scars.includes(k)), id = U.pick(left);
      m.scars.push(id);
      (m.scarAt = m.scarAt || {})[id] = { fl: f.floor, by: p.downBy || null };
      G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.3, s: SCARS[id].n, col: '#e0b080', t: 1.6, sz: 0.9, pop: true });
      add(f, `${f.floor}층 · ${nameOf(p)}에게 흉터가 남았다 — ${SCARS[id].n}.`, [m]);
    },
    // 우두머리: 약해지면 자기 차례에 달아나 원한이 된다
    chiefTurn(f, rt, o) {
      if (!o.chief || o.hp > o.max * CHIEF_FLEE) return false;
      rt.mons = rt.mons.filter(q => q !== o);
      F().refreshEnts(rt);
      const by = U.pick(living(rt));
      (f.grudges = f.grudges || []).push({ n: o.n, base: o.base, fl: f.floor, by: by && by.merc.uid, times: (o.times || 0) + 1 });
      dm(rt, `${ig(o.n)} 피를 흘리며 어둠 속으로 달아난다. "기억해 두마!"`);
      add(f, `${f.floor}층 · ${ig(o.n)} 복수를 맹세하며 달아났다.`, by ? [by.merc] : []);
      return true;
    },
    chiefDown(f, rt, o, from) { dm(rt, `${ig(o.n)} 쓰러졌다.`); add(f, `${f.floor}층 · ${from?.merc ? ig(nameOf(from)) + ' ' : ''}${eul(o.n)} 끝장냈다.`, from?.merc ? [from.merc] : []); },
    // 조용할 때 지난 일을 꺼낸다 (G.Banter.talk)
    recall(f, rt) {
      if (!S.on(f, rt) || Math.random() > 0.15) return false;
      const p = U.pick(living(rt));
      return p ? S.memory(f, rt, p) : false;
    },
    // 그 사람이 겪은 일을 입에 올린다: 슬픔 · 맹세 · 흉터 · 죽은 사람 · 원수 순서로 무게가 있는 것부터
    memory(f, rt, p) {
      const m = p.merc, dead = f.fallen && f.fallen[0], g = f.grudges && f.grudges[0], id = m.scars && U.pick(m.scars), at = id && m.scarAt && m.scarAt[id];
      if (m.owes && Math.random() < 0.5) return say(rt, p, U.pick([`${m.owes}, 그때 네가 아니었으면 나 죽었어.`, `${m.owes}한테 빚이 있어. 안 잊어.`]));
      if (m.grief && Math.random() < 0.7) return say(rt, p, U.pick([`아직도 ${m.grief.n} 목소리가 들려.`, `${ig(m.grief.n)} 여기 있었으면 뭐라고 했을까.`, `${m.grief.n} 얘기는 하지 마.`]));
      if (m.vow && Math.random() < 0.7) return say(rt, p, `${m.vow.n}, 두고 봐. ${m.vow.who} 몫은 받아 낸다.`);
      if (at && Math.random() < 0.5) return say(rt, p, at.by ? `이 ${SCARS[id].n}, ${at.by} 때문이야. ${at.fl}층이었지.` : `${at.fl}층에서 얻은 ${SCARS[id].n}이야. 안 잊어.`);
      if (dead && Math.random() < 0.6) return say(rt, p, U.pick([`${ig(dead.name)} 있었으면 좋아했을 텐데.`, `${dead.fl}층 지날 때마다 ${dead.name} 생각이 나.`, `${dead.name} 몫까지 벌어야지.`]));
      if (g) return say(rt, p, `${g.n}, 어딘가에서 또 기다리고 있겠지.`);
      return false;
    },

    // ── 위험의 굴곡 (RimWorld의 스토리텔러): 편하게 이기면 다음 조우가 세지고, 위기를 겪으면 약해지며 쉬어 갈 곳이 나온다 ──
    DMS, POLICY,
    pressure: f => { const h = f.heat || 0, D = dmOf(f); return 1 + (h > 0 ? D.k : D.ease) * h; },
    heat(f, list) { const k = S.pressure(f); for (const o of list) if (!o.heated) { o.heated = true; o.atk *= k; o.hp *= k; o.max *= k; } },
    omen: f => ((f.heat || 0) >= 3 ? U.pick(['너무 조용하다. 오래갈 리 없다.', '아래쪽에서 뭔가가 기다리는 기분이다.']) : (f.heat || 0) <= -2 ? U.pick(['공기가 한결 가볍다.', '한동안 무사할 것 같다.']) : null),
    settle(f, rt) {
      const st = rt.turn;
      if (!st) return;
      const D = dmOf(f);
      if (st.low < D.restAt || st.downs) { f.heat = Math.max(HEAT_MIN, Math.min(f.heat || 0, 0) - 1); f.restDue = true; }
      else if (st.low >= EASY_LOW) f.heat = Math.min(D.max, (f.heat || 0) + 1);
      if (f.bless > 0) f.bless--;
      const fled = rt.party.find(p => p.broke === 'flee' && !p.dead), o = fled && U.pick(living(rt).filter(q => q !== fled));
      if (o) say(rt, o, `${B().call(fled)}, 아까 어디 갔었어?`);
      for (const p of rt.party) if (p.broke) { if (p.merc) p.merc.stress = BROKE_AFTER; p.broke = null; }
    },

    // ── 스트레스 (Darkest Dungeon): 눈에 보이는 압박. 100에서 무너지거나, 드물게 이를 악문다 ──
    stress(f, rt, p, n) {
      const m = p.merc;
      if (!m) return;
      if (n > 0) { n *= (m.habit ? HABIT_K : 1); for (const k of m.pers || []) n *= STRESS_K[k] || 1; }
      m.stress = U.clamp((m.stress || 0) + n, 0, 100);
      if (m.stress >= 100 && rt.turn && !p.dead && !p.broke && !p.resolve) S.breakdown(f, rt, p);
    },
    breakdown(f, rt, p) {
      const m = p.merc, name = nameOf(p), nat = DN().d20(0), mod = DN().mod(DN().ab(m).wis);
      rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: name, what: '정신 판정', nat, ok: nat + mod >= RESOLVE_DC, calc: `지혜 ${mod < 0 ? '−' : '+'}${Math.abs(mod)} · DC ${RESOLVE_DC}`, word: nat + mod >= RESOLVE_DC ? '각성' : '무너짐', res: '' };
      if (nat + mod >= RESOLVE_DC) {
        p.resolve = true;
        m.stress = 40;
        p.hp = Math.min(p.max, p.hp + p.max * 0.25);
        dm(rt, `${ig(name)} 이를 악문다. 떨림이 멎었다.`);
        say(rt, p, '아직이야. 아직 안 끝났어.');
        add(f, `${f.floor}층 · 무너지기 직전의 ${ig(name)} 이를 악물고 일어섰다.`, [m]);
        return;
      }
      const kind = m.habit || (m.pers || []).map(k => BREAK_OF[k]).find(Boolean) || BREAK_ANY[m.uid % BREAK_ANY.length], B0 = BREAKS[kind];
      p.broke = kind;
      dm(rt, B0.dm(name));
      say(rt, p, B0.say);
      add(f, `${f.floor}층 · ${B0.log(name)}`, [m]);
      if (f.run) (f.run.broke = f.run.broke || []).push(name);
      m.breaks = m.breaks || {};
      m.breaks[kind] = (m.breaks[kind] || 0) + 1;
      if (m.breaks[kind] === 2 && !m.habit) { m.habit = kind; add(f, `${nameOf(p)}에게 버릇이 남았다 — ${B0.n}.`, [m]); }
    },
    // 무너진 사람의 차례. true면 차례를 썼다 (뒤집힌 눈은 싸운다)
    brokenTurn(f, rt, st, e) {
      if (!e.broke || e.broke === 'rage') return false;
      if (e.broke === 'flee') S.backOff(rt, e);
      else if (e.broke === 'loot') { const g = F().monGold(f.floor) * F().goldMult(f); F().gain(f, g); G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '+' + U.fmt(g), col: '#ffd24a', t: 0.8, sz: 0.75 }); }
      else G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '얼어붙음', col: '#c0a0ff', t: 0.8, sz: 0.75 });
      return true;
    },
    // 가장 가까운 적의 반대쪽으로 물러난다
    backOff(rt, e) {
      const o = F().nearestMon(rt, e, 40);
      if (!o) return;
      const dx = e.x - o.x, dy = e.y - o.y, l = Math.hypot(dx, dy) || 1;
      G.Grid.moveTo(rt.map, e, U.clamp(Math.round(e.x + dx / l * 4), 1, rt.map.w - 2), U.clamp(Math.round(e.y + dy / l * 4), 1, rt.map.h - 2), 7, 0.4, 0.3);
    },
    // 차례 한 번의 피해 배율 (G.Turn.k): 각성 · 광분 · 첫 타 · 맹세한 상대
    atkK(rt, a, tg) {
      let v = 1;
      if (a.resolve) v *= RESOLVE_K;
      if (a.broke === 'rage') v *= RAGE_K;
      if (a.surge) v *= a.surge;
      if (G.S.w.fantasy.bless > 0) v *= BLESS_K;
      if (a.merc && a.merc.hex) v *= HEX_ATK;
      if (a.merc && a.merc.vow && tg && nameOf(tg) === a.merc.vow.n) v *= VOW_K;
      return v;
    },
    // 전투 시작: 맹세한 상대를 알아본다
    beginFight(f, rt) {
      for (const p of living(rt)) {
        const v = p.merc.vow;
        if (v && rt.mons.some(o => nameOf(o) === v.n && o.aggro)) { say(rt, p, `${v.n}… ${v.who} 몫이다.`, true); return; }
      }
    },
    // 한 차례가 끝났다: 스트레스 · 복수
    afterAct(f, rt, e, tg, rec, hp0) {
      const r = rec[0];
      if (e.merc) {
        e.surge = 0;
        if (r && r.nat === 20) S.stress(f, rt, e, -6);
        else if (r && r.nat === 1) S.stress(f, rt, e, 4);
        if (tg.kind === 'mon' && tg.hp <= 0) {
          S.stress(f, rt, e, -3);
          const v = e.merc.vow;
          if (v && nameOf(tg) === v.n) {
            e.merc.vow = null;
            S.stress(f, rt, e, -30);
            say(rt, e, `${v.who}, 봤어? 끝났어.`, true);
            add(f, `${f.floor}층 · ${ig(nameOf(e))} ${eul(v.n)} 쓰러뜨려 ${v.who}의 원수를 갚았다.`, [e.merc]);
            if (f.run) (f.run.avenged = f.run.avenged || []).push(`${nameOf(e)} → ${v.who}`);
          }
        }
      } else if (tg.merc && r && r.hit) {
        const lost = tg.max ? Math.max(0, hp0 - tg.hp) / tg.max : 0;
        S.stress(f, rt, tg, 2 + lost * 30 + (r.crit ? 6 : 0));
      }
    },

    // ── 죽음의 여파 (RimWorld): 전우는 슬퍼하고 원수를 맹세한다. 파티 전원이 흔들린다 ──
    aftermath(f, rt, p, m, by) {
      if (f.run) (f.run.dead = f.run.dead || []).push(m.name);
      let vowed = false;
      for (const q of GD().crew(f)) {
        if (q === m || G.Bond.rel(f, q, m) !== 'friend') continue;
        q.grief = { n: m.name, left: GRIEF_RUNS };
        if (by) { q.vow = { n: by, who: m.name }; vowed = true; }
        add(f, `${f.floor}층 · ${ig(q.name)} ${m.name}의 죽음을 받아들이지 못했다.`, [q]);
      }
      if (by && !vowed) { const o = U.pick(living(rt).filter(q => q !== p)); if (o) o.merc.vow = { n: by, who: m.name }; }
      for (const q of rt.party) if (q !== p && q.merc && !q.dead) S.stress(f, rt, q, (G.Bond.rel(f, q.merc, m) === 'friend' ? 35 : 15) + (m.lead ? 10 : 0));
    },
    // 층에 들어섰다: 누군가 쓰러진 층이면 멈춰 서서 기억한다 (원정마다 한 번)
    onFloor(f, rt) {
      if (S.on(f, rt)) f.sceneDry = (f.sceneDry || 0) + 1;
      const sw = dmOf(f).swing;
      if (sw && S.on(f, rt)) f.heat = U.clamp((f.heat || 0) + U.rand(sw * 2 + 1) - sw, HEAT_MIN, HEAT_MAX);
      const d = (f.fallen || []).find(q => q.fl === f.floor && q.seenRun !== f.runs);
      if (!d) return;
      d.seenRun = f.runs;
      dm(rt, `${f.floor}층. ${ig(d.name)} 쓰러진 곳이다.`);
      // 아직 거두지 못했으면 멈춰 선다. 이미 거뒀으면 한마디만
      if (!d.laid && !rt.scene && living(rt).length) { rt.scene = { gen: SCENES.remains(f, rt, d), t: DM }; return; }
      const p = U.pick(living(rt));
      if (p) say(rt, p, d.by ? `여기였지. ${d.by}한테…` : `${d.name}, 또 왔어.`, true);
    },
    // 귀환 (G.Exp.home): 스트레스가 풀리고 슬픔이 옅어진다
    home(f) {
      for (const m of GD().crew(f)) {
        m.stress = Math.max(0, (m.stress || 0) - HOME_RELIEF);
        if (m.hex && --m.hex.left <= 0) m.hex = null;
        if (m.grief && --m.grief.left <= 0) { add(f, `${ig(m.name)} ${m.grief.n}을 보내 주었다.`, [m]); m.grief = null; }
      }
    },
    // 상태창에 보여 줄 상태
    marks(m) {
      const out = [];
      if (m.stress > 0) out.push({ n: `스트레스 ${Math.round(m.stress)}`, d: '100에서 무너짐' });
      if (m.habit) out.push({ n: BREAKS[m.habit].n, d: '스트레스 ×1.15' });
      if (m.grief) out.push({ n: `${m.grief.n}의 죽음`, d: `피해 ×0.9 · 원정 ${m.grief.left}회` });
      if (m.vow) out.push({ n: `맹세 · ${m.vow.n}`, d: `${m.vow.who}의 원수 · 피해 ×1.25` });
      if (m.hex) out.push({ n: '저주', d: `피해 ×0.9 · 원정 ${m.hex.left}회` });
      if (m.owes) out.push({ n: `빚 · ${m.owes}`, d: '목숨을 구해 준 사람' });
      return out;
    },
    // 계단 앞 (F.tick): 힘들거나 짐이 차면 묻는다. true면 아직 내려가지 않는다
    stairs(f, rt) {
      if (!S.on(f, rt) || rt.stairOK === f.floor || rt.scene || (rt.mission && !rt.mission.done)) return false;
      rt.stairOK = f.floor;
      const hp = F().partyHP(rt), crew = living(rt), avg = crew.reduce((a, p) => a + (p.merc.stress || 0), 0) / (crew.length || 1);
      if (!G.Exp.full(f) && (hp.max ? hp.hp / hp.max : 1) >= STAIR_HP && avg < STAIR_STRESS && f.floor - (rt.stairAsk || f.runStart || 1) < STAIR_EVERY) return false;
      rt.stairAsk = f.floor;
      rt.roll = null;
      rt.scene = { gen: SCENES.stairs(f, rt), t: 0.2 };
      return true;
    },
  };
  return S;
})();
