'use strict';
// 탐사 시제품 수치 표. SRD 5.2.1 3레벨 캐릭터 · SRD 몬스터를 손으로 옮긴 시험값이다
// (본 게임은 srd_gen.js에서 읽는다 — 시제품이 자리 잡으면 그쪽으로 잇는다).
RUN.CLS = {
  fighter: { n: '파이터', sp: '드워프', hp: 31, dv: true, cb: { ac: 18, atk: 5, dmg: '1d8+3', what: '장검' }, pow: 3.2, w: 1.5, ranged: false, dex: 1,
    sk: { 운동: 5, 지각: 3, 위협: 2, 은신: -1, 조사: 0, 생존: 1, 설득: 0, 종교: 0, 비전: 0, 의학: 1, 역사: 0 } },
  rogue: { n: '로그', sp: '하플링', hp: 21, dv: false, cb: { ac: 14, atk: 5, dmg: '1d6+3', what: '단검' }, pow: 2.6, w: 0.9, ranged: false, dex: 5, tools: 7, scout: true,
    sk: { 운동: -1, 지각: 5, 위협: 1, 은신: 9, 조사: 4, 생존: 1, 설득: 4, 종교: 0, 비전: 0, 의학: 1, 역사: 0 } },
  wizard: { n: '위저드', sp: '엘프', hp: 17, dv: true, cb: { ac: 12, atk: 5, dmg: '1d10', what: '불꽃 화살' }, pow: 2.2, w: 0.7, ranged: true, dex: 2, caster: true, slots: { 1: 4, 2: 2 },
    spells: ['knock', 'detect', 'light'],
    sk: { 운동: -1, 지각: 3, 위협: 0, 은신: 2, 조사: 5, 생존: 1, 설득: 0, 종교: 3, 비전: 5, 의학: 1, 역사: 5 } },
  cleric: { n: '클레릭', sp: '인간', hp: 24, dv: false, cb: { ac: 18, atk: 4, dmg: '1d6+2', what: '철퇴' }, pow: 2.4, w: 1.1, ranged: false, dex: 0, caster: true, slots: { 1: 4, 2: 2 },
    spells: ['augury', 'guidance', 'cure'],
    sk: { 운동: 1, 지각: 3, 위협: 1, 은신: -1, 조사: 0, 생존: 3, 설득: 4, 종교: 4, 비전: 0, 의학: 5, 역사: 2 } },
  ranger: { n: '레인저', sp: '엘프', hp: 28, dv: true, cb: { ac: 15, atk: 7, dmg: '1d8+3', what: '장궁' }, pow: 3.0, w: 1.2, ranged: true, dex: 3, scout: true, slots: { 1: 3 },
    sk: { 운동: 2, 지각: 5, 위협: 0, 은신: 5, 조사: 1, 생존: 5, 설득: 0, 종교: 0, 비전: 0, 의학: 2, 역사: 0 } },
};
RUN.CLS_ORDER = ['fighter', 'rogue', 'wizard', 'cleric', 'ranger'];
// 이름 · 한 줄 (출발 화면)
RUN.CLS_LINE = {
  fighter: '앞줄의 벽 · 문을 부순다 · 암시야',
  rogue: '정찰 · 자물쇠 · 함정 찾기',
  wizard: '열림 · 마법 탐지 · 빛 · 암시야',
  cleric: '점술 · 인도 · 치유',
  ranger: '정찰 · 추적 · 활 · 암시야',
};

// 무리 수는 SRD 기준(4~5인 파티)보다 하나 적게 — 파티가 셋이다.
// 위험도 = SRD 경험치 / 50 (고블린 · 해골 · 늑대 1, 홉고블린 2, 구울 4, 오우거 9)
// 구역 규칙표 (ROGUELIKE_PLAN 0-0 · 4-7): 생성기(gen.js)는 하나이고, 구역마다 다른 값은 여기 한 줄이다 — 새 층은 한 줄 더하기.
// - floors: 이 구역의 층 (두 층). 앞 층 끝에는 문지기(gate), 뒤 층 끝에는 우두머리(boss).
// - seats · lv: 그 층을 맞춘 기준 인원 · 레벨. 적의 수는 이 기준으로 고정이다 (파티 수로 깎거나 불리지 않는다).
// - budget: 층마다 [소규모, 보통, 대규모, 정예] 위험도. 위험도 = SRD 경험치 / 50, 값은 SRD 조우 예산(낮음 · 보통 · 높음)을 기준 인원 · 레벨로 곱한 것.
//   방이 입구에서 멀수록 0.8배 → 1.2배 (gen.js group).
// - cost: 몬스터 하나의 위험도. packs · elites: 섞이는 틀 [앞에 서는 종류, 뒤따르는 종류] — 앞 종류가 예산의 절반, 나머지를 뒤 종류로.
//   좁은 방에는 센 놈 적게, 넓은 방에는 약한 놈 여럿 (틀 둘을 뽑아 방 크기에 맞는 쪽).
// - rooms: 방 종류 비율 (near = 입구 곁 두 줄의 사건 비율). paths: 길의 상황 수. furn: 방 종류 → 소품. events: 나오는 사건 (null = 전부).
// - shape (2026-11-19, 구역마다 생김새가 달라 보이게): rooms · big = 방 모양 무게 [모양, 무게], pair = 대칭 날개를 붙일 확률, frames = 층 윤곽,
//   cave = 방 · 복도를 모두 흙 · 바위 동굴로 그린다 (voxel.js). 재질 색은 voxel.js의 구역 팔레트.
RUN.ZONES = [
  { id: 'goblin', n: '고블린 굴', floors: [1, 2], seats: [2, 2], lv: [1, 2],
    budget: [[2, 3, 4, 6], [4, 6, 8, 10]],
    cost: { '거대 쥐': 0.5, 고블린: 1, 늑대: 1, 홉고블린: 2, 워그: 2, 버그베어: 4, '버그베어 추적자': 14 },
    packs: [{ n: '고블린 무리', u: ['고블린'] }, { n: '고블린 무리', u: ['홉고블린', '고블린'] }, { n: '굴의 짐승', u: ['늑대'] }, { n: '굴의 짐승', u: ['거대 쥐'] }, { n: '늑대를 부리는 고블린', u: ['늑대', '고블린'] }],
    elites: [{ n: '고블린 무리', u: ['버그베어', '고블린'] }, { n: '늑대를 부리는 고블린', u: ['워그', '고블린'] }],
    gate: { n: '굴 문지기', u: [['버그베어', 1], ['고블린', 2]] },
    boss: { n: '고블린 무리', u: [['버그베어 추적자', 1]] },
    rooms: { near: 0.4, event: 0.3, elite: 0.15 }, paths: { trap: 3, dark: 2, locked: 1 },
    shape: { rooms: [['cave', 0.4], ['round', 0.3], ['rect', 0.18], ['hall', 0.07], ['cross', 0.05]], big: [['round', 0.65], ['cross', 0.2], ['hall', 0.15]], pair: 0.2, frames: ['blob', 'diag', 'ell', 'square'], cave: true }, // 짐승 굴: 둥글고 불규칙한 방 · 대칭이 드물다
    furn: { fight: ['bones', 'crate', 'barrel', 'debris', 'web'], elite: ['bones', 'bones', 'debris', 'web', 'brokenpillar'], event: ['statue', 'rug', 'urn', 'web'],
      camp: ['bedroll', 'bedroll', 'barrel', 'crate'], shop: ['table', 'crate', 'barrel', 'rug'], treasure: ['urn', 'urn', 'crate'], boss: ['bones', 'brokenpillar', 'web', 'debris', 'bones'], start: ['crate', 'barrel', 'web'] },
    events: null },
  // 드워프 폐성채: 주인 잃은 병기(움직이는 갑옷 · 날아다니는 검 · 석상)가 아직 돌고, 빈 방은 굴러든 것들이 차지했다. 값은 시험값
  { id: 'hold', n: '드워프 폐성채', floors: [3, 4], seats: [3, 3], lv: [3, 4],
    budget: [[8, 12, 16, 22], [12, 17, 22, 30]],
    cost: { 스터지: 0.5, '날아다니는 검': 1, 그림록: 1, 홉고블린: 2, '녹 괴물': 2, 다크맨틀: 2, '움직이는 갑옷': 4, 오우거: 9, 가고일: 9, 에틴: 22 },
    packs: [{ n: '깨어난 병기', u: ['움직이는 갑옷', '날아다니는 검'] }, { n: '깨어난 병기', u: ['날아다니는 검'] }, { n: '성채의 불청객', u: ['홉고블린'] }, { n: '어둠의 주민', u: ['그림록'] },
      { n: '천장의 것들', u: ['다크맨틀', '스터지'] }, { n: '쇠를 먹는 것', u: ['녹 괴물'] }],
    elites: [{ n: '성채의 불청객', u: ['오우거', '홉고블린'] }, { n: '깨어난 석상', u: ['가고일', '날아다니는 검'] }],
    gate: { n: '성문 석상', u: [['가고일', 2]] },
    boss: { n: '성채를 차지한 거인', u: [['에틴', 1], ['홉고블린', 2]] },
    rooms: { near: 0.35, event: 0.3, elite: 0.2 }, paths: { trap: 4, dark: 2, locked: 2 },
    shape: { rooms: [['hall', 0.36], ['rect', 0.32], ['cross', 0.22], ['round', 0.08], ['cave', 0.02]], big: [['hall', 0.7], ['cross', 0.3]], pair: 0.7, frames: ['tall', 'wide', 'square'] }, // 다듬은 성채: 반듯한 방 · 기둥 홀 · 좌우 대칭
    furn: { fight: ['brokenpillar', 'crate', 'debris', 'statue', 'barrel'], elite: ['statue', 'brokenpillar', 'debris', 'bones', 'statue'], event: ['statue', 'urn', 'table', 'rug'],
      camp: ['bedroll', 'bedroll', 'barrel', 'crate'], shop: ['table', 'crate', 'barrel', 'rug'], treasure: ['urn', 'urn', 'crate'], boss: ['brokenpillar', 'statue', 'debris', 'bones', 'brokenpillar'], start: ['crate', 'debris', 'statue'] },
    events: null },
];
RUN.zone = floor => RUN.ZONES.find(z => floor >= z.floors[0] && floor <= z.floors[1]) || RUN.ZONES[RUN.ZONES.length - 1];
// 몬스터 전투 수치 (SRD 5.2.1 몬스터 블록을 줄인 것: AC · 체력 · 명중 · 피해). pack = 무리 전술(동료가 있으면 이점)
RUN.MON = {
  고블린: { ac: 15, hp: 10, atk: 4, dmg: '1d6+2', what: '단검' },
  홉고블린: { ac: 18, hp: 11, atk: 3, dmg: '1d8+1', what: '장검' },
  해골: { ac: 14, hp: 13, atk: 5, dmg: '1d6+3', what: '짧은 활' },
  좀비: { ac: 8, hp: 15, atk: 3, dmg: '1d8+1', what: '주먹' },
  늑대: { ac: 12, hp: 11, atk: 4, dmg: '1d6+2', what: '물기', pack: true },
  '거대 쥐': { ac: 12, hp: 7, atk: 4, dmg: '1d4+2', what: '물기', pack: true },
  오우거: { ac: 11, hp: 68, atk: 6, dmg: '2d8+4', what: '몽둥이' },
  구울: { ac: 12, hp: 22, atk: 4, dmg: '2d4+2', what: '발톱' },
  '거대 거미': { ac: 14, hp: 26, atk: 5, dmg: '1d8+3', what: '독니' },
  버그베어: { ac: 14, hp: 33, atk: 4, dmg: '2d6+2', what: '움켜쥐기' },
  워그: { ac: 13, hp: 26, atk: 5, dmg: '1d8+3', what: '물기' },
  '버그베어 추적자': { ac: 15, hp: 65, atk: 5, dmg: '2d8+3', what: '모닝스타' },
  스터지: { ac: 13, hp: 5, atk: 5, dmg: '1d4+3', what: '주둥이' },
  '날아다니는 검': { ac: 17, hp: 14, atk: 4, dmg: '1d8+2', what: '칼날' },
  그림록: { ac: 11, hp: 11, atk: 4, dmg: '1d8+2', what: '뼈 몽둥이' },
  '녹 괴물': { ac: 14, hp: 33, atk: 3, dmg: '1d8+1', what: '물기' },
  다크맨틀: { ac: 11, hp: 22, atk: 5, dmg: '1d6+3', what: '덮치기' },
  '움직이는 갑옷': { ac: 18, hp: 33, atk: 4, dmg: '2d6+4', what: '내리치기' },
  가고일: { ac: 15, hp: 67, atk: 4, dmg: '4d4+4', what: '발톱' },
  에틴: { ac: 12, hp: 85, atk: 7, dmg: '4d8+10', what: '도끼와 철퇴' },
};

RUN.ITEMS = {
  potion: { n: '치유 물약', cost: 25, line: '한 명 2d4+2 회복' },
  knockScroll: { n: '열림 두루마리', cost: 30, line: '잠긴 문 하나를 연다' },
  seeScroll: { n: '투시 두루마리', cost: 25, line: '방 하나를 전부 보여 준다' },
  torch: { n: '횃불', cost: 5, line: '어두운 길 하나를 밝힌다' },
};

// 사건 (ROGUELIKE_PLAN 5절): 선택지마다 누가 무슨 판정을 굴리는지
// cls가 붙은 선택지는 그 직업이 파티에 있을 때만 나온다 (화면에 최대 2개). 빠진 직업 하나는 '???'로 잠가 보여 준다.
// slot = 그 직업이 쓰는 주문 슬롯 레벨, item = 쓰고 없어지는 물건.
// 결과의 뒤끝: warn(다음 적 방이 미리 알고 기다림) · curse(다음 전투가 힘듦) · hurt(굴린 사람이 다침)
//             healAll(모두 회복) · scoutAhead(앞쪽 적 방 둘이 드러남) · ally(구한 사람이 이 판에만 함께한다 — 자리 수와 별개)
// rare = 층마다 나올 확률 (없으면 늘 섞이는 보통 사건)
RUN.EVENTS = [
  { id: 'captive', rare: 0.1, t: '우리에 갇힌 사람', d: '녹슨 쇠우리 안에 누군가 웅크리고 있다. 먼저 내려왔다가 붙잡힌 모험가다.',
    opts: [
      { cls: 'rogue', n: '자물쇠를 딴다', tag: '구출', ok: { msg: '자물쇠가 딸깍 열린다. "빚을 졌군. 끝까지 같이 가지."', ally: true } },
      { cls: 'fighter', n: '창살을 벌린다', tag: '구출', sk: '운동', dc: 11,
        ok: { msg: '창살이 비명을 지르며 휜다. "빚을 졌군. 끝까지 같이 가지."', ally: true },
        no: { msg: '창살은 꿈쩍도 않고 손바닥만 찢어졌다. 한참을 더 씨름한 끝에야 문이 떨어진다.', hurt: 4, ally: true } },
      { n: '우리를 부순다', tag: '구출', sk: '운동', dc: 13,
        ok: { msg: '경첩이 떨어져 나간다. "빚을 졌군. 끝까지 같이 가지."', ally: true },
        no: { msg: '쇠우리가 요란하게 넘어간다. 사람은 꺼냈지만, 이 소리를 못 들었을 리 없다.', warn: true, ally: true } },
      { n: '지나친다', ok: { msg: '눈을 마주치지 않고 지나간다.' } },
    ] },
  { id: 'toll', t: '다리를 막은 고블린', d: '고블린 다섯이 다리를 막고 통행세를 요구한다.',
    opts: [
      { cls: 'rogue', n: '"두목이 너희 몫을 빼돌린다"고 속인다', tag: '이간질', sk: '설득', dc: 11,
        ok: { msg: '고블린들이 서로 멱살을 잡는다. 그 틈에 떨어진 주머니까지 줍고 다리를 건넌다.', gold: 15 },
        no: { msg: '"거짓말이다!" 고블린들이 한꺼번에 덤빈다.', fight: ['고블린', 1, 5], alert: true } },
      { cls: 'wizard', n: '손바닥에 불꽃을 피워 겁준다', tag: '불꽃으로 쫓음', slot: 1,
        ok: { msg: '고블린들이 비명을 지르며 달아난다. 저 녀석들, 안쪽에 우리가 온다고 떠들겠지.', warn: true } },
      { cls: 'fighter', n: '두목에게 일대일 결투를 청한다', tag: '결투', sk: '운동', dc: 13,
        ok: { msg: '두목을 다리 아래로 메다꽂았다. 고블린들이 두목의 주머니를 바치고 물러난다.', gold: 10 },
        no: { msg: '결투에서 밀렸다. 고블린들은 낄낄대면서도 약속대로 길을 비킨다.', hurt: 7 } },
      { cls: 'cleric', n: '고블린들이 두려워하는 신의 저주를 들먹인다', tag: '저주 엄포', sk: '종교', dc: 12,
        ok: { msg: '고블린들이 부적을 움켜쥐고 납작 엎드린다.' },
        no: { msg: '"그런 신 몰라!" 칼이 뽑힌다.', fight: ['고블린', 1, 5] } },
      { n: '설득한다', sk: '설득', dc: 13, ok: { msg: '고블린들이 투덜대며 길을 비킨다.' }, no: { msg: '고블린들이 비웃으며 칼을 뽑는다.', fight: ['고블린', 1, 5] } },
      { n: '금화 15를 낸다', cost: 15, ok: { msg: '고블린들이 금화를 세며 길을 비킨다.' } },
      { n: '싸운다', ok: { msg: '칼을 뽑는다.', fight: ['고블린', 1, 5] } },
    ] },
  { id: 'altar', t: '무너진 제단', d: '먼지 쌓인 제단에 희미한 성스러운 문양이 남아 있다.',
    opts: [
      { cls: 'cleric', n: '제단을 다시 축성한다', tag: '축성', slot: 1,
        ok: { msg: '제단에 빛이 돌아온다. 상처가 아물고, 다음 전투에도 가호가 따른다.', bless: true, healAll: 6 } },
      { cls: 'rogue', n: '제단 밑 공물함을 턴다', tag: '공물함을 텀', sk: '조사', dc: 12,
        ok: { msg: '공물함 바닥에 금화가 수북하다.', gold: 25 },
        no: { msg: '자물쇠에 손대는 순간 문양이 붉게 번뜩인다. 등골이 서늘하다.', curse: true } },
      { cls: 'wizard', n: '문양 속 지도를 읽는다', tag: '문양을 읽음', sk: '비전', dc: 12,
        ok: { msg: '문양이 이 층의 구조를 비춘다. 다음 줄의 방들이 드러난다.', revealRow: true },
        no: { msg: '문양이 흐려져 읽을 수 없다.' } },
      { n: '기도한다', sk: '종교', dc: 12, ok: { msg: '따뜻한 빛이 파티를 감싼다. 다음 전투가 수월해진다.', bless: true }, no: { msg: '아무 일도 일어나지 않는다.' } },
      { n: '지나간다', ok: { msg: '제단을 뒤로한다.' } },
    ] },
  { id: 'wounded', t: '쓰러진 탐사대원', d: '다른 길드의 탐사대원이 벽에 기대 신음한다.',
    opts: [
      { cls: 'cleric', n: '치유 주문을 건다', tag: '치유', slot: 1,
        ok: { msg: '탐사대원이 일어나 고개를 숙인다. 지도 조각과 함께, 앞쪽에 무엇이 있었는지 일러 준다.', mapPiece: true, scoutAhead: true } },
      { cls: 'rogue', n: '치료하는 척 가방을 뒤진다', tag: '가방을 뒤짐', sk: '은신', dc: 12,
        ok: { msg: '붕대를 감아 주는 사이 지도 조각과 금화를 슬쩍했다.', mapPiece: true, gold: 12 },
        no: { msg: '"도둑이야!" 고함이 복도 안쪽까지 울린다.', warn: true } },
      { cls: 'ranger', n: '그를 다치게 한 놈의 흔적을 쫓는다', tag: '흔적을 쫓음', sk: '생존', dc: 12,
        ok: { msg: '핏자국과 발자국을 따라가 보니, 앞쪽 소굴 두 곳이 보인다.', scoutAhead: true },
        no: { msg: '흔적이 바위틈에서 끊겼다.' } },
      { n: '치료한다', sk: '의학', dc: 10, ok: { msg: '탐사대원이 고맙다며 자기 지도 조각을 건넨다.', mapPiece: true }, no: { msg: '손쓸 수 없었다. 지니고 있던 물약 하나를 챙긴다.', item: 'potion' } },
      { n: '짐을 뒤진다', ok: { msg: '금화 몇 닢을 챙긴다.', gold: 12 } },
      { n: '지나간다', ok: { msg: '발걸음을 서두른다.' } },
    ] },
  { id: 'runes', t: '벽에 새긴 옛 글씨', d: '복도 벽에 오래된 글씨가 빽빽하다.',
    opts: [
      { cls: 'wizard', n: '글씨 사이에 숨은 주문을 깨운다', tag: '숨은 주문', sk: '비전', dc: 12,
        ok: { msg: '글씨가 빛나며 굴의 두목이 불을 두려워한다는 것, 그리고 다음 방들의 모양을 보여 준다.', bossHint: true, revealRow: true },
        no: { msg: '글씨가 터지듯 번쩍인다. 눈앞이 하얘진다.', hurt: 6 } },
      { cls: 'fighter', n: '글씨가 새겨진 벽을 부숴 본다', tag: '벽을 부숨', sk: '운동', dc: 14,
        ok: { msg: '벽 뒤 좁은 틈에 누군가 숨겨 둔 두루마리가 있다.', item: 'knockScroll' },
        no: { msg: '쾅, 쾅 — 벽은 멀쩡하고 소리만 안쪽까지 울렸다.', warn: true } },
      { cls: 'ranger', n: '글씨 밑 긁힌 자국을 살핀다', tag: '긁힌 자국', sk: '생존', dc: 11,
        ok: { msg: '무언가 큰 놈이 자주 지나다닌 자국이다. 앞쪽 소굴이 어디인지 짐작이 간다.', scoutAhead: true },
        no: { msg: '오래된 자국이라 알 수 없다.' } },
      { n: '해독한다', sk: '역사', dc: 13, ok: { msg: '글씨는 굴의 두목이 불을 두려워한다고 적고 있다. 우두머리가 약해진다.', bossHint: true }, no: { msg: '뜻을 알 수 없다.' } },
      { n: '함정을 살핀다', sk: '조사', dc: 12, ok: { msg: '글씨 아래 숨은 함정 장치를 찾았다. 이 방에서 나가는 함정이 모두 드러난다.', revealTraps: true }, no: { msg: '이상한 것은 없다.' } },
      { n: '지나간다', ok: { msg: '글씨를 뒤로한다.' } },
    ] },
];
