'use strict';
// 대사 (DESIGN.md 70 · 조르버스의 동료 대사 · 림월드의 말풍선 + 기록): 머리 위 말풍선과 왼쪽 대화 기록.
// 상황 대사(LINES)는 그 일이 일어나는 곳에서 부르거나 tick이 살펴서 부른다. 말하는 사람의 성격 · 직업에 맞는 줄을 먼저 고른다.
// 조용히 걸을 때는 둘이 주고받는다(TALKS) — 층 깊이 · 체력 · 짐 · 관계에 맞는 것만. 판정이 걸린 대사는 말풍선 첫 줄에 무슨 판정인지 적는다 (B.tag).
G.Banter = (() => {
  const U = G.U, GR = G.Grid;
  const F = () => G.Fantasy;
  const SHOW_MIN = 1.7, SHOW_MAX = 4, PER_CHAR = 0.07, MAX_BUB = 3, CHAT_MAX = 40, FIGHT_R = 8, LOW = 0.3, LOW_OK = 0.6;
  const TALK_MIN = 11, TALK_MAX = 22, QUIET_AFTER = 4, LINE_GAP = 0.5, POLL = 0.25;
  const DEF_CD = 6, CD = { stairs: 30, fight: 10, clear: 10, crit: 8, fumble: 14, combo: 12, hurt: 6, healing: 6, look: 7, quiet: 5, loot: 2, chest: 5, levelup: 1 };
  const now = () => G.S.runTime;

  // 대사: 키 → { any, 성격 · 직업 } — 말하는 사람에게 맞는 묶음이 있으면 그쪽을 먼저. {m} = 상대 이름 · 몬스터 · 물건 ({m이} {m은} {m을} {m과} {m야} {m다}: 받침에 맞춰)
  const LINES = {
    depart: { any: ['자, 가자.', '다들 준비됐지? 출발한다.', '오늘은 몇 층까지 갈까.', '해 지기 전엔 못 돌아오겠네.'], greedy: ['이번엔 짐 가득 채워 오자.', '금화 냄새가 벌써 나는데.'], coward: ['벌써 또 가는 거야?', '이번엔 좀 얕게만 돌자, 응?'], hot: ['오래 쉬었어. 빨리 가자!'], careful: ['붕대 챙겼어? 한 번 더 확인해.'] },
    floor: { any: ['{m}층이다. 대열 맞춰.', '여긴 처음 보는 데네.', '다들 있지? 내려왔다.', '공기가 달라졌어.', '횃불 앞으로.'], coward: ['{m}층… 더 내려가야 해?'], greedy: ['{m}층이면 상자도 좀 낫겠지.'], careful: ['서두르지 마. 길부터 보자.'] },
    known: { any: ['여긴 아는 길이야. 곧장 가자.', '지난번에 왔던 데네. 계단까지 금방이야.', '이 층은 눈 감고도 가겠다.'] },
    look: { any: ['잠깐, 살펴볼게.', '멈춰. 먼저 볼게.', '안쪽 좀 보고.', '기다려 봐, 뭔가 있나.'], rogue: ['바닥부터 볼게. 밟지 마.'], archer: ['내가 볼게. 눈은 좋으니까.'], scout: ['발자국이 있나 볼게.'], coward: ['나, 나는 뒤에서 볼게.'] },
    quiet: { any: ['별거 없어 보이는데.', '조용해. 들어가자.', '아무것도 안 보여.', '괜찮아 보여.'], careful: ['일단은 괜찮아. 조심은 해.'], coward: ['조용해서 더 무서운데…'] },
    spotTrap: { any: ['함정이다! 저기 밟지 마.', '바닥에 줄 있어. 돌아가.', '저 판, 눌리게 돼 있어.'], rogue: ['저런 건 내 전문이지. 밟지 마.'] },
    spotAmbush: { any: ['안에 뭔가 있어. 먼저 치자.', '숨어 있어! 눈치 못 챈 척해.', '움직였어, 저쪽!'], archer: ['저기 숨었어. 내가 먼저 쏜다.'] },
    spotChest: { any: ['저기 상자 있다.', '보물이다! 저 구석에.'], greedy: ['상자다! 내가 찜했어!'] },
    spotMimic: { any: ['저 상자 수상해. 숨 쉬는데?', '미믹이야! 열지 마… 아니, 패고 열자.', '상자에 이빨이 있어.'] },
    search: { any: ['정리됐네. 좀 뒤져 보자.', '흩어져서 찾아봐.', '돈 될 만한 게 있나 보자.', '뭐 떨어진 거 없어?'], greedy: ['주머니부터 뒤져!'], careful: ['함정 조심하고, 천천히 찾아.'] },
    found: { any: ['여기 있다!', '찾았어, 금화야.', '바닥 밑에 숨겨 놨네.', '오, 이거 돈 되겠는데.'], greedy: ['내 거… 아니, 우리 거!'] },
    nofind: { any: ['아무것도 없네.', '허탕이야. 가자.', '먼지밖에 없어.', '이미 누가 털어 갔나 봐.'], greedy: ['이럴 리가 없는데… 한 번만 더.'] },
    trap: { any: ['으악, 함정!', '젠장, 밟았어!', '발밑이 꺼졌어!'], coward: ['그러니까 조심하자고 했잖아!'] },
    trapBlame: { any: ['별거 없다며!', '{m야}, 잘 좀 보라고!', '다 봤다더니 이게 뭐야!'] },
    fight: { any: ['온다!', '{m다}! 붙어!', '대열 유지해!', '{m다}. 정신 차려.'], hot: ['내가 먼저 간다!', '드디어 몸 좀 풀겠네!'], coward: ['왜 우리 쪽으로 와!', '{m다}! 어떡해!'], brawler: ['덤벼 봐, 어디!'], meek: ['싸우기 싫은데…'], cleric: ['다치면 바로 말해!'], bard: ['좋아, 노래 한 곡 뽑아 볼까!'], mage: ['가까이 오기 전에 끝낸다.'], barbarian: ['으하하! 와라!'], paladin: ['물러서지 마라!'] },
    clear: { any: ['끝났나?', '다 잡았어.', '다들 괜찮아?', '정리 끝.', '휴, 지나갔다.'], hot: ['벌써 끝이야? 시시하네.'], greedy: ['자, 이제 전리품!'], coward: ['살았다…'], cleric: ['다친 사람 이리 와.'] },
    clearHurt: { any: ['방금 건 위험했어.', '이대로 더 가도 되는 거야?', '숨 좀 돌리자.'], careful: ['돌아갈 때를 생각해 둬.'], hot: ['이 정도는 아무것도 아냐.'] },
    boss: { any: ['{m다}! 저게 이 층 대장이야!', '크다… {m다}.', '{m야}, 오늘 네 목은 우리 거다.'], coward: ['저걸 잡자고? 진심이야?'], greedy: ['저놈 보물은 내 거야!'] },
    bossDead: { any: ['해냈다! {m이} 쓰러졌어!', '{m}, 끝!', '이걸 잡네, 우리가.'], greedy: ['자, 이제 털어 보자!'], hot: ['봤냐! 다음은 누구야!'], coward: ['진짜 죽은 거 맞지? 찔러 봐.'] },
    hurt: { any: ['크윽, 많이 맞았어!', '여기 피가 멈추질 않아!', '좀 도와줘!', '더는 못 버텨!'], hot: ['이 정도로 안 쓰러져!'], coward: ['나 죽어! 진짜 죽어!'], barbarian: ['아직이다… 아직!'] },
    healing: { any: ['{m야}, 버텨! 간다!', '{m야}, 조금만 참아!', '치료할게, {m} 뒤로 빠져!'] },
    down: { any: ['{m이} 쓰러졌어!', '{m야}! 정신 차려!', '{m을} 뒤로 빼!'], hot: ['{m을} 건드렸겠다? 이 자식들!'], coward: ['{m이} 쓰러졌어… 우리 끝났어!'] },
    downLead: { any: ['단장님이 쓰러졌다!', '단장님을 지켜!', '단장님! 일어나요!'] },
    up: { any: ['으… 아직 안 죽었어.', '머리야… 어떻게 됐어?', '다시 싸울 수 있어.'], hot: ['누가 날 눕혔어! 나와!'] },
    crit: { any: ['제대로 들어갔다!', '봤어?', '이게 실력이지.'], bard: ['이건 노래로 남겨야 해!'], rogue: ['급소다.'] },
    fumble: { any: ['손이 미끄러졌어.', '못 본 걸로 해 줘.', '오늘 왜 이러지.'] },
    combo: { any: ['{m야}, 지금이야!', '좋아, 맞췄어!', '{m과} 같이 간다!'] },
    chest: { any: ['열렸다!', '뭐가 들었나 보자.', '금화다!'], greedy: ['으하하, 내 사랑!'], careful: ['열기 전에 좀 보고 열어.'] },
    mimic: { any: ['상자가 물었어!', '미믹이다! 뒤로!', '으악, 상자가 움직여!'], greedy: ['내, 내 보물이 왜 이빨이…'] },
    mimicKnown: { any: ['그럴 줄 알았지! 쳐!', '미믹이라고 했잖아. 먼저 친다!'] },
    loot: { any: ['이것 봐, {m}!', '{m을} 주웠어.', '{m}? 좋은 건가?'], greedy: ['{m}! 이건 비싸겠는데!'], bard: ['{m}… 이름부터 멋진데.'] },
    full: { any: ['짐이 꽉 찼어.', '더는 못 들어. 돌아갈까?'], greedy: ['아직 들 수 있어! 조금만 더!'], careful: ['가득 찼어. 돌아가자.'] },
    levelup: { any: ['좀 알 것 같아!', '몸이 가벼운데?', '요령이 생겼어.'], bard: ['내 전설에 한 줄 추가!'], hot: ['더 강해졌다!'] },
    stairs: { any: ['계단이야. 내려갈까?', '여기서 기다릴게. 말만 해.', '내려갈 준비 됐어.'] },
    descend: { any: ['내려간다.', '서둘러, 내려가자!', '계단으로!'] },
    rally: { any: ['거기로 모이라고? 간다.', '알겠어, 그쪽으로!', '다들 저기로!'] },
    focus: { any: ['{m}부터 잡아!', '{m을} 노려!', '전원, {m}!'] },
    cancel: { any: ['알아서 가자.', '명령 취소, 하던 대로 해.'] },
    rival: { any: ['{m다}. 저 녀석들도 왔네.', '{m}, 조심해.', '{m이} 여기까지 왔어?'], greedy: ['{m}보다 먼저 털어야 해!'], brawler: ['{m}? 한판 붙을까?'], meek: ['{m과}는 엮이지 말자.'] },
    p_hot: { any: ['못 참겠다, 먼저 간다!'] },
    p_coward: { any: ['난 잠깐 빠질게!', '뒤로, 뒤로!'] },
    p_greedy: { any: ['아직 돌아갈 때 아니야! 더 벌 수 있어!'] },
    p_careful: { any: ['여기까지야. 돌아가자.'] },
    p_brawler: { any: ['쟤네 먼저 패자!'] },
    p_meek: { any: ['저, 저는 빠질게요.'] },
    ms_hunt: { any: ['여기 놈들 다 잡으면 보상 나온대.', '하나도 남기지 마.'] },
    ms_survive: { any: ['몰려온다! 자리 지켜!', '여기서 버텨야 해!'], coward: ['버티라고? 도망이 아니라?'] },
    ms_defend: { any: ['결계석을 지켜!', '저 돌 깨지면 끝이야!'] },
    ms_escort: { any: ['상인 놓치지 마.', '아저씨, 바짝 붙어요!'], greedy: ['사례 두둑이 받는 거 잊지 마.'] },
    ms_search: { any: ['유물을 찾아야 해. 눈 크게 떠.', '이 층 어딘가 유물이 있대.'] },
    ms_escape: { any: ['시간 없어! 계단으로 뛰어!', '뛰어! 멈추면 죽어!'] },
    msWin: { any: ['임무 끝! 보수 받자!', '해냈어!'], greedy: ['보수 계산부터 하자고.'] },
    msLose: { any: ['망했다… 임무는 글렀어.', '보수는 날아갔네.'] },
  };

  // 주고받기: 조건(when) · 말 꺼내는 사람(a) · 받는 사람(b)의 태그 — 줄은 번갈아 a, b, a … {a} {b} = 이름
  const TALKS = [
    // 아무나
    { l: ['{b야}, 저 소리 들었어?', '무슨 소리?', '…아니야, 내 발소리인가 봐.'] },
    { l: ['돌아가면 뭐부터 할 거야?', '뜨거운 물에 몸부터 담글 거야.', '그거 좋다.'] },
    { l: ['이 던전은 누가 판 걸까.', '판 놈이 누구든 여기 살진 않았으면.'] },
    { l: ['{b야}, 네 신발 소리 너무 커.', '네 숨소리가 더 커.'] },
    { l: ['배고프다.', '방금 먹었잖아.', '그게 벌써 언제야.'] },
    { l: ['왜 이 일을 시작했어?', '돈. 너는?', '나도 돈.'] },
    { l: ['횃불 얼마나 남았지?', '충분해. 아마.', '아마?'] },
    { l: ['{b야}, 뒤 좀 봐 줘. 등이 간지러워.', '거미네.', '뭐?!', '농담이야.'] },
    { l: ['지도 제대로 보는 거 맞지?', '지도 없는데.', '…아.'] },
    // 층 깊이
    { when: c => c.depth < 6, l: ['여긴 아직 얕은 편이지?', '방심하다 죽는 것도 이런 데야.'] },
    { when: c => c.depth >= 6 && c.depth < 15, l: ['고블린 냄새 안 나?', '네 양말 냄새야.'] },
    { when: c => c.depth >= 15, l: ['꽤 깊이 왔네.', '올라갈 길 기억나?', '그런 건 내려가고 생각하자.'] },
    { when: c => c.depth >= 15, l: ['점점 추워지는 거 같아.', '돌벽이 땀을 흘리고 있어. 기분 나빠.'] },
    { when: c => c.depth >= 40, l: ['이 깊이까지 온 사람 또 있을까?', '있겠지. 저기 뼈가 그 사람들이고.'] },
    // 상황
    { when: c => c.hp < 0.55, l: ['다들 상태가 말이 아닌데.', '아직 걸을 수 있으면 괜찮은 거야.'] },
    { when: c => c.hp < 0.55, l: ['{b야}, 어디 다쳤어?', '괜찮아. 팔이 하나 더 있잖아.'] },
    { when: c => c.hp > 0.9, l: ['아직 다들 멀쩡하네.', '그런 말 하면 꼭 일이 터지던데.'] },
    { when: c => c.bag > 0.7, l: ['짐이 슬슬 무거워.', '금화 무거워서 죽으면 그것도 복이지.'] },
    { when: c => c.bag < 0.1, l: ['아직 번 게 거의 없네.', '좀만 더 가 보자. 저 앞엔 있겠지.'] },
    { when: c => c.mission === 'escort', l: ['저 상인, 뭘 그렇게 많이 들고 다니는 거야?', '묻지 마. 사례나 받자.'] },
    { when: c => c.time > 90, l: ['이 층 너무 오래 있는 거 아냐?', '길이 다 비슷비슷해서 그래.'] },
    // 관계
    { when: c => c.rel === 'friend', l: ['{b야}, 아까 고마웠어.', '뭘. 다음엔 네가 막아 줘.'] },
    { when: c => c.rel === 'friend', l: ['너랑 있으면 그래도 덜 무섭다.', '나도. 말은 안 했지만.'] },
    { when: c => c.rel === 'friend', l: ['끝나면 한잔 어때?', '네가 사는 거지?', '당연히 아니지.'] },
    { when: c => c.rel === 'foe', l: ['내 뒤에 서지 마.', '누가 할 소리를.'] },
    { when: c => c.rel === 'foe', l: ['{b}, 아까 일부러 늦게 왔지?', '증거 있어?', '두고 보자.'] },
    { when: c => c.rel === 'foe', l: ['넌 왜 항상 그 모양이야?', '네가 그걸 물을 처지야?'] },
    // 성격
    { a: 'greedy', l: ['그 상자 비었던 거 진짜야?', '진짜야. 네 주머니나 확인해 봐.'] },
    { a: 'greedy', l: ['몫은 똑같이 나누는 거지?', '당연하지. 너 빼고.'] },
    { a: 'coward', l: ['우리 이제 돌아가면 안 돼?', '방금 왔잖아.', '그러니까.'] },
    { a: 'coward', l: ['뭐가 움직인 것 같아.', '그림자야.', '그림자가 원래 저렇게 커?'] },
    { a: 'hot', l: ['왜 이렇게 느려? 그냥 뛰어가자.', '그러다 함정 밟았던 게 누구더라.'] },
    { a: 'careful', l: ['방금 그 갈림길, 표시해 뒀어.', '넌 진짜 꼼꼼하다.', '그래서 아직 살아 있지.'] },
    { a: 'brawler', l: ['{b야}, 끝나면 팔씨름 한판.', '또? 지난번에 울었잖아.', '안 울었어!'] },
    { a: 'meek', l: ['저기… 다들 안 무서워요?', '무서워. 근데 말하면 더 무서워져.'] },
    // 직업
    { a: 'bard', l: ['이번 원정 노래 제목 뭐가 좋을까?', '「제발 조용히 좀」 어때.'] },
    { a: 'bard', l: ['{b야}, 네 이야기도 노래로 만들어 줄까?', '멋지게 해 주면.', '돈 내면.'] },
    { a: 'cleric', l: ['오늘 기도는 드렸어?', '네 신이 내 지갑도 지켜 준대?'] },
    { a: 'cleric', l: ['붕대가 얼마 안 남았어. 살살 다쳐.', '그걸 내가 고를 수 있으면 좋겠네.'] },
    { a: 'mage', l: ['이 벽 무늬, 꽤 오래된 문자야.', '뭐라고 쓰여 있는데?', '「돌아가」.'] },
    { a: 'archmage', l: ['어제 책에서 봤는데 이 층엔—', '그 책 때문에 지난번에 죽을 뻔했잖아.'] },
    { a: 'warlock', l: ['가끔 벽 너머에서 누가 날 불러.', '대답은 하지 마.', '이미 했는데.'] },
    { a: 'rogue', l: ['{b야}, 네 주머니 좀 가벼워 보인다.', '…내 금화 돌려줘.', '어머, 이게 왜 여기 있지.'] },
    { a: 'archer', l: ['화살 몇 개 남았어?', '너 맞힐 만큼은.'] },
    { a: 'barbarian', l: ['배고프다. 저 쥐 구워 먹을까.', '제발 그러지 마.'] },
    { a: 'monk', l: ['호흡을 가다듬어. 그럼 덜 지쳐.', '내 호흡은 비명 지를 때만 안 흐트러져.'] },
    { a: 'paladin', l: ['약한 자를 지키는 게 우리 일이다.', '우린 돈 받고 온 건데.', '…그것도 맞다.'] },
    { a: 'scout', l: ['저 이끼, 먹을 수 있어.', '먹어 봤어?', '한 번. 사흘 앓았어.'] },
    { a: 'dragoon', l: ['창은 길수록 좋아. 멀리서 찌르면 안 다치거든.', '그래서 복도마다 걸리는구나.'] },
    // 혼잣말 (혼자일 때)
    { solo: true, l: ['혼자 오니까 조용해서 좋네.'] },
    { solo: true, l: ['동료 좀 구할걸 그랬나.'] },
    { solo: true, l: ['…여기 나 혼자 맞지?'] },
  ];

  // 받침에 맞춰 조사를 고른다
  const JO = { 이: ['이', '가'], 은: ['은', '는'], 을: ['을', '를'], 과: ['과', '와'], 야: ['아', '야'], 다: ['이다', '다'] };
  const hasBatchim = s => { const c = String(s).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 > 0 : /[013678lmnr]$/i.test(s); };
  const fill = (s, v) => s.replace(/\{([mab])(이|은|을|과|야|다)?\}/g, (_, k, j) => { const n = v[k] ?? ''; if (j === '야' && n.endsWith('님')) return n; return j ? n + JO[j][hasBatchim(n) ? 0 : 1] : n; });
  const tags = e => (e.merc ? [...(e.merc.pers || []), e.merc.cls] : []);
  const living = rt => rt.party.filter(p => !p.dead && p.merc);
  const nameOf = e => e.merc?.name || e.n || e.def?.n || '';
  // 부를 때: 이름을 안 지은 단장은 「단장님」
  const callOf = e => (e.merc?.lead && e.merc.name === '단장' ? '단장님' : nameOf(e));
  const chatOf = rt => rt.chat || (rt.chat = []);

  const B = {
    LINES, TALKS, call: callOf,
    // 말풍선 첫 줄: 무슨 판정 · 눈 + 수정치 · 목표 · 결과
    tag: (what, r) => ({ s: `🎲 ${what} ${r.nat}${r.mod < 0 ? '' : '+'}${r.mod} ${r.ok ? '≥' : '<'} ${r.dc} ${r.ok ? '성공' : '실패'}`, ok: r.ok }),
    // 명중 굴림의 20 · 1
    hitTag: (tg, nat) => ({ s: `🎲 ${tg.n ? tg.n + '에게 ' : ''}공격 ${nat} ${nat === 20 ? '대성공' : '대실패'}`, ok: nat === 20 }),
    // 지금 떠 있는 말풍선 (그리기)
    live(rt) { const t = now(); return rt.bubbles && rt.bubbles.length ? (rt.bubbles = rt.bubbles.filter(b => b.until > t && !b.e.dead)) : null; },
    // 말풍선 + 대화 기록. pri: 꼭 보여 줄 말이면 true(자리가 없으면 가장 오래된 것을 밀어낸다)
    say(rt, who, s, opt = {}) {
      if (G.quiet || !who || !s) return false;
      const list = B.live(rt) || (rt.bubbles = []), t = now(), mine = list.find(b => b.e === who);
      if (mine && !opt.pri) return false;
      if (!mine && list.length >= MAX_BUB) { if (!opt.pri) return false; list.shift(); }
      if (mine) list.splice(list.indexOf(mine), 1);
      const len = s.length + (opt.tag ? opt.tag.s.length : 0);
      list.push({ e: who, s, tag: opt.tag, col: opt.col, at: t, until: t + U.clamp(SHOW_MIN + len * PER_CHAR, SHOW_MIN, SHOW_MAX) });
      const chat = chatOf(rt);
      chat.push({ n: nameOf(who), col: who.merc ? G.Guild.def(who.merc).col : '#c9c2b2', s, tag: opt.tag, t: G.S.runTime, id: rt.chatId = (rt.chatId || 0) + 1 });
      if (chat.length > CHAT_MAX) chat.shift();
      rt.quietT = t + QUIET_AFTER;
      return true;
    },
    // 그 사람에게 맞는 줄 하나 (없으면 null). v = { m } 등
    pick(key, who, v = {}) {
      const set = LINES[key];
      if (!set) return null;
      const mine = tags(who).filter(k => set[k]), list = mine.length && Math.random() < 0.7 ? set[U.pick(mine)] : set.any;
      return fill(U.pick(list), v);
    },
    // 상황 대사. who가 없으면 살아 있는 사람 중에서 (성격 · 직업이 맞는 사람을 먼저). 같은 키는 쿨다운
    line(rt, key, who, v, opt = {}) {
      if (G.quiet || !rt.party) return null;
      const cds = rt.barkCd || (rt.barkCd = {}), t = now();
      if (!opt.pri && cds[key] > t) return null;
      if (!who) {
        const set = LINES[key] || {}, ps = living(rt), fit = ps.filter(p => tags(p).some(k => set[k]));
        who = U.pick(fit.length && Math.random() < 0.6 ? fit : ps);
      }
      if (!who || who.dead) return null;
      const s = B.pick(key, who, v);
      if (!s || !B.say(rt, who, s, opt)) return null;
      cds[key] = t + (CD[key] ?? DEF_CD);
      return who;
    },
    // 줄줄이 (앞사람 말이 끝날 무렵 다음 사람)
    queue(rt, list) { rt.barkQ = (rt.barkQ || []).concat(list); },
    // 주고받기 하나 고르기
    talk(f, rt) {
      const ps = U.shuffle(living(rt));
      if (!ps.length) return;
      const hp = F().partyHP(rt), a0 = ps[0], ctx = { depth: f.floor, hp: hp.max ? hp.hp / hp.max : 1, bag: G.Exp.carry(f) / (G.Exp.cap(f) || 1), mission: rt.mission && !rt.mission.done && !rt.mission.fail ? rt.mission.k : null, time: rt.floorT, rel: null };
      if (ps.length < 2) {
        const t = U.pick(TALKS.filter(q => q.solo));
        B.say(rt, a0, t.l[0]);
        return;
      }
      // 관계 있는 짝이 있으면 그 둘을 앞세운다
      let a = a0, b = ps[1];
      outer: for (const p of ps) for (const q of ps) if (p !== q && G.Bond.rel(f, p.merc, q.merc)) { a = p; b = q; break outer; }
      ctx.rel = G.Bond.rel(f, a.merc, b.merc);
      const opts = [];
      for (const q of TALKS) {
        if (q.solo || (q.when && !q.when(ctx))) continue;
        if (q.a) { const hit = ps.find(p => tags(p).includes(q.a)); if (!hit) continue; }
        opts.push(q);
      }
      // 조건이 붙은 대화(지금 상황 · 이 사람 이야기)를 더 자주, 방금 한 말은 빼고
      const last = rt.lastTalks || (rt.lastTalks = []), fresh = opts.filter(q => !last.includes(q)), pool = fresh.length ? fresh : opts, spec = pool.filter(q => q.when || q.a);
      const t = spec.length && Math.random() < 0.65 ? U.pick(spec) : U.pick(pool);
      if (!t) return;
      last.push(t); if (last.length > 12) last.shift();
      if (t.a) { const hit = ps.find(p => tags(p).includes(t.a)); if (hit && hit !== a) { if (hit === b) b = a; a = hit; } }
      const v = { a: callOf(a), b: callOf(b) };
      B.queue(rt, t.l.map((s, i) => ({ who: i % 2 ? b : a, s: fill(s, v) })));
    },
    // 매 틱: 대기 줄 · 상황 살피기 · 주고받기 시계
    tick(f, rt, dt) {
      if (G.quiet) return;
      const t = now();
      const q = rt.barkQ;
      if (q && q.length && !(rt.barkNext > t)) {
        const x = q.shift();
        if (!x.who.dead && B.say(rt, x.who, x.s, { pri: true })) rt.barkNext = t + U.clamp(SHOW_MIN + x.s.length * PER_CHAR, SHOW_MIN, SHOW_MAX) - 1.0 + LINE_GAP;
      }
      if ((rt.barkPoll = (rt.barkPoll || 0) - dt) > 0) return;
      rt.barkPoll = POLL;
      B.watch(f, rt, t);
    },
    // 일어난 일을 살핀다: 층 도착 · 전투 시작 · 끝 · 보스 · 위험 · 쓰러짐 · 임무 · 라이벌 · 짐
    watch(f, rt, t) {
      let st = rt.bt;
      const h = rt.hero;
      if (!st || st.map !== rt.map) {
        const first = !st;
        st = rt.bt = { map: rt.map, fight: false, boss: null, ms: false, msEnd: false, rv: new Set(), full: false, fightAt: 0 };
        rt.barkQ = [];
        rt.talkT = t + TALK_MIN * 0.6;
        if (rt.btDepart) { rt.btDepart = false; B.line(rt, 'depart', h.dead ? null : h, null, { pri: true }); }
        else if (!first) B.line(rt, G.Season.known(f, rt) ? 'known' : 'floor', null, { m: f.floor });
      }
      const ps = rt.party;
      // 전투
      const near = rt.mons.filter(o => o.aggro && ps.some(p => !p.dead && GR.dist(o, p) < FIGHT_R));
      const fight = near.length > 0;
      if (fight && !st.fight) { st.fight = true; st.fightAt = t; const o = near[0]; if (!near.some(q => q.boss)) B.line(rt, 'fight', null, { m: o.n }); }
      if (!fight && st.fight) {
        st.fight = false;
        if (t - st.fightAt > 2 && !st.bossDown) { const hp = F().partyHP(rt); B.line(rt, hp.max && hp.hp / hp.max < 0.5 ? 'clearHurt' : 'clear'); }
      }
      // 보스
      const boss = near.find(o => o.boss);
      if (boss && !st.boss) { st.boss = boss; B.line(rt, 'boss', null, { m: boss.n }, { pri: true }); }
      if (st.boss && !st.bossDead && !rt.mons.includes(st.boss)) { st.bossDead = st.bossDown = true; B.line(rt, 'bossDead', null, { m: st.boss.n }, { pri: true }); }
      // 몸 상태
      for (const p of ps) {
        if (!p.merc) continue;
        if (p.dead) {
          if (!p._btDown) {
            p._btDown = true; p._btLow = false;
            const by = living(rt).sort((x, y) => GR.dist(x, p) - GR.dist(y, p))[0];
            if (by) B.line(rt, p === h ? 'downLead' : 'down', by, { m: callOf(p) }, { pri: true });
          }
          continue;
        }
        if (p._btDown) { p._btDown = false; B.line(rt, 'up', p); }
        const r = p.hp / (p.max || 1);
        if (r < LOW && !p._btLow && fight) {
          p._btLow = true;
          if (B.line(rt, 'hurt', p)) {
            const healer = living(rt).find(q => q !== p && q.def?.heal);
            if (healer) B.queue(rt, [{ who: healer, s: B.pick('healing', healer, { m: callOf(p) }) }]);
          }
        } else if (r > LOW_OK) p._btLow = false;
      }
      // 임무
      const ms = rt.mission;
      if (ms && !st.ms) { st.ms = true; B.line(rt, 'ms_' + ms.k, null, null, { pri: true }); }
      if (ms && !st.msEnd && (ms.done || ms.fail)) { st.msEnd = true; B.line(rt, ms.done ? 'msWin' : 'msLose', null, null, { pri: true }); }
      // 라이벌: 눈에 들어온 파티마다 한 번
      for (const p of rt.rivals || []) if (!st.rv.has(p.d.id) && p.mem.some(e => !e.dead && F().inView(rt, e.x, e.y))) { st.rv.add(p.d.id); B.line(rt, 'rival', null, { m: p.d.n }); }
      // 짐
      if (G.Exp.full(f) && !st.full) { st.full = true; B.line(rt, 'full'); }
      // 조용히 걷는 중이면 잡담
      const quiet = !fight && !rt.barkQ?.length && !(rt.quietT > t) && !rt.ex?.search && !(rt.ex?.brace > 0) && rt.phase !== 'dead';
      if (quiet && !(rt.talkT > t)) { rt.talkT = t + TALK_MIN + Math.random() * (TALK_MAX - TALK_MIN); B.talk(f, rt); }
    },
  };
  return B;
})();
