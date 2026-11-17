'use strict';
// 인물 사건 (DESIGN.md 146): 손으로 쓴 장면 대신 부품을 조합한다. RimWorld · Wildermyth처럼 규칙이 이야기를 만든다.
//   인물(누구) × 처지(어떤 상황) × 수단(파티가 가진 방법) → 한 일(deed)과 태도(att)가 인물에 남는다
//   → 다음 원정에 그 인물이 돌아온다(돌아옴). 그 일을 한 용병이 파티에 있으면 그 일을 말한다.
// 부품을 늘리는 법: KINDS에 인물 종류, PLIGHT에 처지(쓸 수 있는 수단 목록), WAYS에 수단, BACK에 돌아옴, LINES에 대사.
// 장면 실행 · 판정 · 결과 연산은 G.Event와 G.Story.event가 그대로 맡는다 (여기서는 사건 객체를 만들기만 한다)
G.Npc = (() => {
  const U = G.U, E = () => G.Event, ST = () => G.Story, DN = () => G.Dnd;
  const jong = n => { const c = n.charCodeAt(n.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 > 0; };
  const J = n => ({ n, ig: n + (jong(n) ? '이' : '가'), eul: n + (jong(n) ? '을' : '를'), wa: n + (jong(n) ? '과' : '와'), eun: n + (jong(n) ? '은' : '는'), ya: n + (jong(n) ? '아' : '야') });
  const RETIRE = 2; // 돌아온 횟수가 이만큼이면 이야기가 끝난다

  // ── 인물 종류: 세력의 말하는 몬스터 · 어디에나 있는 사람 ──
  const KINDS = {
    goblin: { front: 'green', w: '고블린', mon: '고블린 전사', boss: '고블린 두목', lang: 'goblin', names: ['스닉', '그릭', '누크', '자브', '틱', '보그', '릭스', '멍크', '키글', '얍'], kin: ['형', '누이', '삼촌', '패거리'] },
    bandit: { front: 'raider', w: '산적', mon: '산적', boss: '산적 두목', lang: 'common', names: ['데브', '오슬', '가렛', '미라', '토브', '한스', '레아', '버크'], kin: ['동생', '형', '두목', '패거리'] },
    civ: { front: null, w: '사람', mon: null, lang: 'common', civ: true, names: ['마렌', '이벨', '코르', '사냐', '벤', '로잘', '피트', '아델', '노라', '케일'], jobs: ['행상', '탐험가', '순례자', '약초꾼', '광부'] },
  };
  const foeKind = front => Object.keys(KINDS).find(k => KINDS[k].front === front) || null;

  // ── 처지: 누가 어떤 상황에 있나. ways = 이 처지에서 고를 수 있는 수단 (파티가 가진 것만 보인다) ──
  const PLIGHT = {
    trapped: { who: ['foe', 'civ'], n: q => `덫에 걸린 ${q.civ ? q.job : q.w}`, open: q => `${q.civ ? `${q.job} ` : ''}${q.ig} 덫에 발목이 걸려 버둥거린다. 우리를 보자 얼어붙는다.`, prop: q => ['trap', { fig: q.civ ? 'civ' : q.mon }], ways: ['talk', 'free', 'heal', 'scare', 'kill', 'leave'] },
    caged: { who: ['civ'], needFoe: true, n: q => `갇힌 ${q.job}`, open: q => `나무 우리 안에 ${q.job} ${q.ig} 묶여 있다. "살려 줘!" ${q.captor} 셋이 우리 앞에서 주사위를 굴린다.`, prop: q => ['cage', { cls: 'bard', guards: [q.captorMon, q.captorMon, q.captorMon] }], ways: ['lock', 'break', 'ransom', 'leave'] },
    wounded: { who: ['civ', 'foe'], n: q => `쓰러진 ${q.civ ? q.job : q.w}`, open: q => `${q.civ ? `${q.job} ` : ''}${q.ig} {lean} 피를 흘리고 있다. 숨이 가쁘다.`, prop: q => ['mercy', { mon: q.mon, civ: q.civ }], ways: ['heal', 'cure', 'talk', 'rob', 'kill', 'leave'] },
    guard: { who: ['foe'], n: q => `${q.w} 보초`, open: q => `좁은 길목 초소에서 ${q.w} ${q.ig} 졸고 있다. 옆에 징이 걸려 있다.`, prop: q => ['post', { guards: [q.mon] }], ways: ['sneak', 'sleep', 'talk', 'cant', 'trick', 'bribe', 'attack', 'detour'] },
    toll: { who: ['foe'], n: q => `${q.w}의 길목`, open: q => `${q.w} 무리가 길을 막는다. 앞에 선 ${q.ig} 손을 내민다. "지나가려면 내."`, prop: q => ['band', { guards: [q.mon, q.mon, q.mon] }], ways: ['pay', 'persuade', 'cant', 'scare', 'attackT', 'back'] },
    lost: { who: ['civ'], n: q => `길 잃은 ${q.job}`, open: q => `${q.job} ${q.ig} 횃불도 없이 {grope} 있다. "출구가 어디요?"`, prop: () => ['stranger', {}], ways: ['guide', 'escort', 'rob', 'leave'] },
  };

  // ── 수단: 고르려면 무엇이 있어야 하나(need) · 판정 · 결과. deed는 인물에 남는 한 일, att는 태도 변화 ──
  // need: lang(그 인물의 말을 하는 사람) · x(그 주문이나 기술) · cls(그 직업) · foe/civ(인물 종류)
  const WAYS = {
    // 도둑 은어 (SRD 희귀 언어: 로그): 산적과 같은 바닥 사람으로 말을 튼다
    cant: { need: { kind: 'bandit', langK: 'cant' }, label: () => '은어로 말을 섞는다', pol: ['party', 'careful'],
      win: { deed: 'talked', att: 5, state: 'leave', dm: q => `은어 한마디에 ${q.n}의 눈빛이 바뀐다. "같은 바닥 사람이구먼." 지나갈 길과 아래층 이야기까지 털어놓는다.`, log: q => `{who} 도둑 은어로 ${q.eul} 구슬렸다.`, ops: [['scout']] } },
    talk: { need: { lang: true }, label: q => `${q.langN}로 말을 건다`, check: { sk: 'persuasion', dc: 10, adv: true, what: '말 걸기' }, pol: ['party', 'careful'], pers: { meek: 2 },
      win: { deed: 'talked', att: 4, state: 'leave', dm: q => `"${q.n}! 내 이름 ${q.n}!" 사정을 털어놓고, 이 층 길을 알려 준다.`, log: q => `{who} ${q.langN}로 ${q.eul} 달랬다.`, ops: [['scout']] },
      lose: { deed: 'freed', att: 2, state: 'leave', dm: q => `말은 통했다. 그래도 ${q.eun} 뒤도 안 보고 달아난다.`, log: q => `{who} ${q.eul} 풀어 줬다.` } },
    free: { label: () => '풀어 준다', sub: '말없이 보낸다', pol: ['careful'], pers: { meek: 3 }, win: { who: true, deed: 'freed', att: 3, state: 'leave', dm: q => `덫을 벌리자 ${q.ig} 절뚝이며 달아난다. {beyond} 사라지기 전에 한 번 뒤를 돌아본다.`, log: q => `{who} 덫에 걸린 ${q.eul} 풀어 줬다.` } },
    heal: { label: () => '상처를 돌본다', check: { sk: 'medicine', dc: 10, what: '치료' }, pol: ['party', 'careful'], cls: ['cleric', 'paladin', 'scout'], pers: { meek: 3 },
      win: { deed: 'healed', att: 5, state: 'leave', ops: [['stress', -4]], dm: q => `피가 멎었다. ${q.ig} 몇 번이고 고개를 숙인다.`, log: q => `{who} 다친 ${q.eul} 돌봐 줬다.` },
      lose: { deed: 'healed', att: 2, state: 'leave', dm: q => `붕대는 감았지만 서툴렀다. ${q.ig} 이를 악물고 일어선다.`, log: q => `{who} 다친 ${q.eul} 서툴게 돌봐 줬다.` } },
    cure: { need: { x: 'sr_cure' }, label: () => '치유 주문을 건다', sub: '주문 슬롯', pol: ['party'], win: { deed: 'healed', att: 6, state: 'leave', dm: q => `빛이 상처를 덮는다. ${q.ig} 제 다리를 믿기지 않는 듯 내려다본다.`, log: q => `{who} 치유 주문으로 ${q.eul} 살렸다.` } },
    scare: { need: { foe: true }, label: () => '겁을 줘서 캐낸다', check: { sk: 'intimidation', dc: 12, what: '겁주기' }, pol: ['bold', 'coin'], cls: ['barbarian', 'dragoon'], pers: { hothead: 3 },
      win: { deed: 'scared', att: -3, state: 'leave', ops: [['scout'], ['gold', 2]], dm: q => `칼끝 앞에서 ${q.ig} 아는 것을 줄줄 분다. 풀려나자 이를 갈며 사라진다.`, log: q => `{who} ${q.eul} 겁줘서 길을 알아냈다.` },
      lose: { deed: 'scared', att: -4, state: 'leave', ops: [['ambush', 2]], dm: q => `${q.ig} 목청껏 소리친다. {far}에서 대답이 온다!`, log: q => `{who} 겁을 주자 ${q.ig} 동료를 불렀다.` } },
    kill: { need: { foe: true }, label: () => '끝낸다', sub: '금화 ×2', pol: ['coin'], pers: { greedy: 2, hothead: 1 }, win: { who: true, deed: 'killed', att: 0, dead: true, state: 'gone', ops: [['gold', 2], ['stressPers', 'meek', 6]], dm: () => '조용해졌다. 목에 건 패거리 표식이 덜렁거린다.', log: q => `{who} ${q.eul} 죽였다.` } },
    rob: { label: () => '짐을 챙긴다', sub: '금화 ×4', pol: ['coin'], pers: { greedy: 3 }, win: { who: true, deed: 'robbed', att: -5, state: 'leave', ops: [['gold', 4], ['stressPers', 'meek', 8]], dm: q => `짐을 빼앗자 ${q.ig} 노려본다. "기억해 두겠어."`, log: q => `{who} ${q.civ ? q.job + ' ' : ''}${q.n}의 짐을 털었다.` } },
    lock: { need: { cls: 'rogue' }, label: () => '자물쇠를 딴다', check: { sk: 'sleight', dc: 15, what: '자물쇠' }, pol: ['careful', 'party'],
      win: { deed: 'rescued', att: 6, state: 'freed', ops: [['stress', -4]], dm: q => `딸깍. ${q.ig} 기어 나온다. ${q.captor}들은 아직 주사위를 굴린다.`, log: q => `{who} 몰래 우리를 따 ${q.eul} 구했다.` },
      lose: { deed: 'rescued', att: 5, state: 'empty', ops: [['ambush', 3]], dm: q => `자물쇠가 부러지며 큰 소리가 난다. ${q.captor}들이 돌아본다!`, log: q => `{who} 들켰지만 ${q.eul} 끌어냈다.` } },
    break: { label: () => '우리를 부순다', check: { sk: 'athletics', dc: 15, what: '우리 부수기' }, pol: ['bold'], cls: ['barbarian', 'dragoon', 'paladin'], pers: { hothead: 2 },
      win: { deed: 'rescued', att: 6, state: 'empty', ops: [['fight', 3]], dm: () => '나무 창살이 한 번에 부러진다. 주사위가 굴러떨어진다!', log: q => `{who} 우리를 부수고 ${q.eul} 꺼냈다.` },
      lose: { deed: 'rescued', att: 5, state: 'empty', ops: [['ambush', 3]], dm: q => `창살이 버틴다. ${q.captor}들이 먼저 달려든다!`, log: q => `{who} 우리를 부수다 먼저 맞았다.` } },
    ransom: { label: () => '몸값을 낸다', sub: '짐 −20%', pol: ['coin', 'careful'], win: { who: true, deed: 'rescued', att: 4, state: 'freed', ops: [['pay', 0.2]], dm: q => `금화 자루를 던지자 ${q.captor}들이 우리를 연다.`, log: q => `몸값을 내고 ${q.eul} 데려왔다.` } },
    sneak: { label: () => '몰래 지나간다', check: { sk: 'stealth', dc: 12, group: true, bonusX: ['x_pass', 10], what: '몰래 지나가기' }, pol: ['careful', 'party'],
      win: { deed: 'unseen', att: 0, dm: () => '아무도 돌 하나 차지 않았다. 보초는 끝내 몰랐다.', log: () => '일행이 보초를 몰래 지나쳤다.' },
      lose: { deed: 'alarmed', att: -2, state: 'gone', ops: [['ambush', 3]], dm: q => `누군가 자갈을 밟았다. ${q.ig} 징을 친다!`, log: q => `보초 ${q.n}에게 들켰다.` } },
    sleep: { need: { x: 'sr_sleep' }, foeSave: true, label: () => '잠재운다', pol: ['careful', 'bold'],
      win: { deed: 'unseen', att: 0, ops: [['gold', 3]], dm: q => `${q.ig} 창을 끌어안고 코를 곤다. 주머니까지 챙겼다.`, log: q => `{who} 보초 ${q.eul} 잠재우고 지나갔다.` },
      lose: { deed: 'alarmed', att: -2, state: 'gone', ops: [['fight', 2]], dm: q => `${q.ig} 고개를 젓더니 징채로 손을 뻗는다!`, log: q => `{who} 잠재우기에 실패했다.` } },
    trick: { label: () => '지나가는 상인인 척한다', check: { sk: 'deception', dc: 13, what: '속이기' }, pol: ['coin', 'party'], cls: ['bard', 'rogue', 'warlock'],
      win: { deed: 'tricked', att: -1, state: 'woken', dm: q => `${q.ig} 고개를 끄덕이며 길을 비킨다.`, log: q => `{who} 보초 ${q.eul} 속여 넘겼다.` },
      lose: { deed: 'alarmed', att: -3, state: 'gone', ops: [['ambush', 2]], dm: q => `"상인이 칼을 차고 다녀?" ${q.ig} 소리친다!`, log: q => `{who} 보초를 속이려다 들켰다.` } },
    bribe: { label: () => '뇌물을 쥐여 준다', sub: '짐 −5%', pol: ['coin'], win: { who: true, deed: 'paid', att: 1, state: 'woken', ops: [['pay', 0.05]], dm: q => `${q.ig} 금화를 깨물어 보고는 도로 눈을 감는다.`, log: q => `보초 ${q.n}에게 뇌물을 줬다.` } },
    attack: { label: () => '먼저 친다', sub: '우리 먼저', pol: ['bold'], pers: { hothead: 3 }, win: { deed: 'fought', att: -4, state: 'gone', ops: [['npcFight', 1, 'party']], dm: q => `${q.ig} 눈을 뜨기 전에 덮친다!`, log: q => `보초 ${q.eul} 덮쳤다.` } },
    detour: { leave: true, label: () => '돌아서 간다', pol: ['careful'], win: { dm: () => '길목을 피해 먼 길로 돌았다.' } },
    pay: { label: () => '통행료를 낸다', sub: '짐 −10%', pol: ['coin', 'careful'], win: { who: true, deed: 'paid', att: 1, state: 'gone', ops: [['pay', 0.1]], dm: q => `${q.ig} 자루를 받아 들고 길을 비킨다. "또 와."`, log: q => `${q.w} ${q.n}에게 통행료를 냈다.` } },
    persuade: { label: () => '말로 푼다', check: { sk: 'persuasion', dc: 15, what: '설득' }, advLang: true, pol: ['careful', 'party'], cls: ['bard', 'paladin'],
      win: { deed: 'talked', att: 2, state: 'gone', dm: q => `${q.ig} 혀를 차더니 길을 비킨다. "다음엔 낼 거지?"`, log: q => `{who} ${q.wa} 말로 길을 텄다.` },
      lose: { deed: 'fought', att: -3, state: 'gone', ops: [['npcFight', 2, 'foes']], dm: q => `${q.ig} 침을 뱉는다. "말은 끝났다!"`, log: q => `{who} ${q.wa} 말이 틀어졌다.` } },
    attackT: { label: () => '밀고 지나간다', sub: '우두머리', pol: ['bold'], pers: { hothead: 3 }, win: { deed: 'fought', att: -4, state: 'gone', ops: [['npcFight', 2, null]], dm: q => `${q.ig} 무기를 뽑는다!`, log: q => `${q.w} ${q.eul} 힘으로 밀어냈다.` } },
    back: { leave: true, label: () => '물러난다', pol: ['careful'], win: { ops: [['stress', 3]], dm: () => '등 뒤로 비웃음이 따라온다.' } },
    guide: { label: () => '길을 알려 준다', check: { sk: 'survival', dc: 12, what: '길 찾기' }, pol: ['party', 'careful'], cls: ['archer', 'scout', 'barbarian'],
      win: { deed: 'guided', att: 4, state: 'leave', dm: q => `${q.ig} 횃불을 받아 들고 {beyond} 걸어간다. "이 빚은 갚겠소."`, log: q => `{who} 길 잃은 ${q.eul} 내보냈다.` },
      lose: { deed: 'guided', att: 1, state: 'leave', ops: [['stress', 2]], dm: q => `알려 준 길이 맞는지 모르겠다. ${q.ig} 불안한 얼굴로 떠난다.`, log: q => `{who} ${q.ig} 길을 알려 줬다.` } },
    escort: { label: () => '데려다준다', sub: '이 층 남은 방을 포기', pol: ['careful'], pers: { meek: 2 }, win: { who: true, deed: 'rescued', att: 6, state: 'leave', ops: [['rush']], dm: q => `${q.wa} 함께 계단까지 걸었다. 몇 번이고 손을 잡는다.`, log: q => `{who} ${q.eul} 계단까지 데려다줬다.` } },
    leave: { leave: true, label: () => '지나간다', win: { dm: () => '아무도 걸음을 멈추지 않는다.' } },
  };

  // ── 돌아옴: 다음 원정에 그 인물이 다시 나타난다. 태도와 한 일이 무엇이 일어날지 정한다 ──
  const BACK = [
    { k: 'kin', when: q => q.st === 'dead' && !q.civ && !q.kinDone, line: 'kin', open: q => `${q.kinN} 무리가 길을 막는다. "${q.n}${jong(q.n) ? '을' : '를'} 죽인 놈들이 너희냐!"`, ops: q => [['npcKin', 3]], log: q => `죽인 ${q.n}의 ${q.kinW}${jong(q.kinW) ? '이' : '가'} 복수하러 왔다.` },
    { k: 'revenge', when: q => q.st === 'alive' && q.att <= -3, line: 'grudge', open: q => `${q.ig} 패거리를 끌고 돌아왔다. "기억하지?"`, ops: () => [['npcFight', 2, 'foes']], log: q => `${q.ig} 앙갚음하러 돌아왔다.` },
    { k: 'extort', when: q => q.st === 'alive' && q.deed === 'paid', line: 'paid', open: q => `${q.ig} 또 길을 막는다. "지난번엔 싸게 해 줬지?"`, ask: true },
    { k: 'gift', when: q => q.st === 'alive' && q.att >= 4, line: 'thanks', open: q => `${q.ig} 길목에서 기다리고 있었다. "그때 그 사람들이지?"`, ops: () => [['relic'], ['scout']], log: q => `${q.ig} 그때 받은 은혜를 갚았다.` },
    { k: 'tip', when: q => q.st === 'alive' && q.att >= 1, line: 'thanks', open: q => `${q.ig} 그림자 속에서 손짓한다. "{far}에 매복이 있어."`, ops: () => [['scout'], ['gold', 3]], log: q => `${q.ig} 매복을 귀띔해 줬다.` },
  ];
  // 그 일을 한 용병이 하는 말 ({n} 인물 이름). 말할 사람이 없으면 말하지 않는다
  const LINES = {
    thanks: ['{n}! 살아 있었네.', '거봐, 그때 보내 주길 잘했지.', '그때 그 {n}이야. 날 알아봤어.', '세상 좁네.'],
    grudge: ['…저 얼굴, 기억나.', '그때 끝냈어야 했어.', '내 탓이야. 저 녀석을 그냥 보냈어.', '또 너냐.'],
    paid: ['한 번 내주니까 이러지.', '이번엔 안 줘.', '버릇이 들었네.'],
    kin: ['{n}… 그 녀석 가족인가 봐.', '그때 그 덫, 그냥 지나갈걸.', '내가 한 일이야. 내가 막을게.'],
  };

  const store = f => (f.npcs = f.npcs || []);
  const get = (f, id) => store(f).find(q => q.id === id) || null;
  const view = q => ({ ...J(q.n), ...q, w: KINDS[q.kind].w, langN: G.SrdX.LANG_N[q.lang] || '공용어', kinOf: q.kinW ? `${q.kinW}` : '두목', captor: q.captor || '', civ: !!KINDS[q.kind].civ, mon: q.mon });
  const pickName = (f, K, R) => { const used = new Set(store(f).map(q => q.n)), free = K.names.filter(n => !used.has(n)); const L = free.length ? free : K.names; return L[Math.floor(R() * L.length)]; };

  // 파티가 이 수단을 쓸 수 있나 (보이는 선택지를 정한다)
  function can(rt, w, q) {
    const N = w.need || {};
    if (N.foe && q.civ) return false;
    if (N.lang && (q.lang === 'common' || !E().speaker(rt, q.lang))) return false;
    if (N.kind && q.kind !== N.kind) return false;
    if (N.langK && !E().speaker(rt, N.langK)) return false;
    if (N.x && !E().canX(rt, N.x)) return false;
    if (N.cls && !ST().living(rt).some(p => p.merc.cls === N.cls)) return false;
    return true;
  }
  // 결과 묶음 → G.Event 결과 (문장은 인물 이름으로 채워 둔다)
  const res = (b, q) => b && { ...(b.who ? { who: true } : {}), state: b.state, dm: b.dm?.(q), log: b.log?.(q), ops: [...(b.ops || []), ['npc', q.id, b.deed || null, b.att || 0, !!b.dead]] };

  const N = {
    KINDS, PLIGHT, WAYS, BACK, LINES, store, get,
    // 첫 만남: 이 지역 · 이 파티에 맞는 인물과 처지를 고른다 (시즌 씨앗으로 재현된다)
    meet(f, rt, r) {
      const R = E().rng(f, f.floor, 'pick', (r?.ri || 0) + 911), fk = foeKind(f.front);
      const ps = Object.keys(PLIGHT).filter(k => { const P = PLIGHT[k]; return (P.who.includes('foe') && fk) || (P.who.includes('civ') && (!P.needFoe || fk)); });
      if (!ps.length) return null;
      const pk = ps[Math.floor(R() * ps.length)], P = PLIGHT[pk], asFoe = P.who.includes('foe') && fk && (!P.who.includes('civ') || R() < 0.5), kind = asFoe ? fk : 'civ', K = KINDS[kind];
      const CIVL = ['dwarvish', 'elvish', 'gnomish', 'halfling', 'giant', 'orc', 'draconic', 'sign']; // SRD 표준 언어 (공용어 밖)
      const q = { id: (f.npcN = (f.npcN || 0) + 1), n: pickName(f, K, R), kind, front: asFoe ? f.front : null, lang: K.civ && R() < 0.5 ? CIVL[Math.floor(R() * CIVL.length)] : K.lang, mon: K.mon, att: 0, deed: null, doer: null, st: 'alive', run: f.runs || 0, fl: f.floor, plight: pk, back: 0 };
      if (K.jobs) q.job = K.jobs[Math.floor(R() * K.jobs.length)];
      if (P.needFoe) { q.captor = KINDS[fk].w; q.captorMon = KINDS[fk].mon; }
      if (!K.civ) { q.kinW = K.kin[Math.floor(R() * K.kin.length)]; q.kinN = `${q.n}의 ${q.kinW}`; }
      store(f).push(q);
      return N.scene(f, rt, q);
    },
    // 처지 + 수단 → G.Event 사건 객체
    scene(f, rt, q0) {
      const q = view(q0), P = PLIGHT[q0.plight], choices = [];
      for (const k of P.ways) {
        const w = WAYS[k], ok = can(rt, w, q), Nd = w.need || {};
        const lock = ok ? null : Nd.foe && q.civ ? null : Nd.kind && q.kind !== Nd.kind ? null : Nd.langK ? `${G.SrdX.LANG_N[Nd.langK]} 화자` : Nd.lang && q.lang !== 'common' && !E().speaker(rt, q.lang) ? `${q.langN} 화자` : Nd.x && !E().canX(rt, Nd.x) ? E().lockOf(rt, { x: Nd.x }) : Nd.cls ? E().clsN(Nd.cls) : null;
        if (!ok && !lock) continue;
        const o = { key: 'npc:' + k, label: w.label(q), sub: w.sub, pol: w.pol, pers: w.pers, cls: w.cls, leave: w.leave, win: res(w.win, q), lose: res(w.lose, q) };
        if (w.check) o.check = { ...w.check, ...(w.advLang && q.lang !== 'common' ? { advLang: q.lang } : {}) };
        if (w.need?.lang) o.lang = q.lang;
        if (w.need?.langK) o.lang = w.need.langK;
        if (w.need?.x) o.x = w.need.x;
        if (w.need?.cls) o.byCls = w.need.cls;
        if (w.foeSave) o.foeSave = { ab: 'wis', n: 1, mon: q.mon, what: '잠재우기' };
        if (lock) o.locked = lock;
        choices.push(o);
      }
      const [prop, propOpt] = P.prop ? P.prop(q) : [null, null];
      return { id: 'npc_meet', type: 'encounter', tags: [], n: P.n(q), open: P.open(q), choices, prop, propOpt, askT: 10, npc: q0.id };
    },
    // 다음 원정에 돌아올 인물 (같은 지역 · 사람은 어디서든)
    due(f) { return store(f).find(q => q.back < RETIRE && (f.runs || 0) > q.run && (!q.front || q.front === f.front) && BACK.some(b => b.when(q))) || null; },
    comeBack(f, rt) {
      const q0 = N.due(f); if (!q0) return null; const q = view(q0), b = BACK.find(x => x.when(q0));
      q0.back++; q0.run = f.runs || 0; if (b.k === 'kin') q0.kinDone = true;
      const line = [['npcLine', q0.id, b.line]];
      const fig = q.civ ? ['stranger', {}] : ['band', { guards: [q.mon] }];
      if (b.ask) return { id: 'npc_back', type: 'encounter', tags: [], n: `또 ${q.n}`, open: b.open(q), openOps: [], preOps: line, askT: 10, npc: q0.id, prop: fig[0], propOpt: fig[1],
        choices: [
          { label: '또 낸다', sub: '짐 −15%', pol: ['coin'], win: { who: true, ops: [['pay', 0.15], ['npc', q0.id, 'paid', 0, false]], dm: `${q.ig} 히죽 웃는다. 다음엔 더 달라고 하겠지.`, log: `${q.n}에게 또 통행료를 냈다.` } },
          { label: '이번엔 거절한다', sub: '싸움', pol: ['bold', 'party'], pers: { hothead: 2 }, win: { state: 'gone', ops: [['npc', q0.id, 'fought', -4, false], ['npcFight', 2, null]], dm: `"그럼 피로 내라!" ${q.ig} 무기를 든다.`, log: `${q.n}의 통행료를 거절했다.` } },
          { label: '돌아서 간다', leave: true, win: { ops: [['stress', 3]], dm: '먼 길로 돌았다.' } },
        ] };
      const calm = b.k === 'gift' || b.k === 'tip';
      return { id: 'npc_back', type: 'encounter', tags: [], n: b.k === 'kin' ? q0.kinN : q.n, open: b.open(q), preOps: line, npc: q0.id, ...(calm ? { prop: fig[0], propOpt: fig[1] } : {}), auto: [{ if: [], ops: b.ops(q), dm: b.log(q), log: b.log(q) }] };
    },
    // 이 인물을 기억하는 용병의 말
    line(f, rt, id, group) {
      const q = get(f, id), p = q && q.doer != null && ST().living(rt).find(x => x.merc.uid === q.doer); if (!p) return;
      const m = p.merc, said = (m.said = m.said || []), L = (LINES[group] || []).map(s => s.replace('{n}', q.n)), s = L.find(x => !said.includes(x)) || L[0]; if (!s) return;
      said.push(s); if (said.length > 60) said.shift(); G.Banter.say(rt, p, s, { pri: true });
    },
  };
  // 결과 연산 (G.Event.ops에 얹는다)
  const OPS = {
    npc(f, rt, who, id, deed, att, dead) { const q = get(f, id); if (!q) return; if (deed) q.deed = deed; q.att = Math.max(-10, Math.min(10, q.att + att)); if (dead) q.st = 'dead'; if (who?.merc && deed) q.doer = who.merc.uid; if (deed === 'unseen' || deed === 'tricked') q.back = RETIRE; }, // 몰랐던 사람은 돌아오지 않는다
    npcLine(f, rt, who, id, group) { N.line(f, rt, id, group); },
    // 인물이 우두머리로 나선다. 쓰러지면 죽은 것으로 남는다 (G.Story.chiefDown)
    npcFight(f, rt, who, n, first) { const q = get(f, E().curE?.npc); if (q && q.mon) { const base = { n: q.mon, ...G.D.F.mon[q.mon] }, o = ST().chief(f, rt, null, q.n, base); o.npc = q.id; } ST().pack(f, rt, null, n); if (first) rt.nextFirst = first; },
    npcKin(f, rt, who, n) { const q = get(f, E().curE?.npc); if (q) { const K = KINDS[q.kind], o = ST().chief(f, rt, null, q.kinN, { n: K.boss, ...G.D.F.mon[K.boss] }); o.npcKin = q.id; } ST().pack(f, rt, null, n); rt.nextFirst = 'foes'; },
  };
  N.down = (f, o) => { const q = o.npc && get(f, o.npc); if (q) { q.st = 'dead'; q.back = Math.max(q.back, RETIRE - 1); } };
  N.OPS = OPS;
  Object.assign(G.Event.ops, OPS);
  return N;
})();
