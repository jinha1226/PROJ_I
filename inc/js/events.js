'use strict';
// 사건 (EVENT_SYSTEM_DIRECTION.md · DESIGN.md 98): 방에 뜻을 붙이고(태그), 층마다 사건 자리를 정하고, 조건에 맞는 사건을 가중치로 고른다.
// 지형 난수와 따로 놀도록 (시즌 씨앗 × 층 × 용도)에서 난수를 파생하고, 정해진 결과는 시즌 동안 f.ev에 남는다.
// 기존 장면(G.Story)도 후보로 함께 고른다: scene이 있으면 그 생성기, 없으면 choices를 이 파일이 돌린다.
G.Event = (() => {
  const U = G.U, F = () => G.Fantasy, DN = () => G.Dnd, ST = () => G.Story;
  const THEMES = {
    def: ['crypt', 'prison', 'library', 'altar', 'treasury', 'cave', 'collapsed'],
    swamp: ['altar', 'ruin', 'ruin', 'thicket', 'thicket'], // 야외: 천장 · 복도 · 철창 사건은 나오지 않는다
  };
  const NAMES = { crypt: '납골당', prison: '감옥', library: '서고', altar: '제단', treasury: '보물고', cave: '동굴', collapsed: '무너진 방', ruin: '폐허', thicket: '수풀' };
  // 방침: pass = 판정을 고를 성공률(%), risk = 판정 없이 위험을 감수하는 선택에 대한 태도, leave = 지나가기, fit = 방침에 맞는 선택지 가산, pers = 성격의 무게
  const POLICY = { party: { pass: 55, risk: -0.5, leave: 0.5, fit: 0.5, pers: 0.5 }, careful: { pass: 70, risk: -3, leave: 1, fit: 0.5, pers: 0.1 }, bold: { pass: 30, risk: 1, leave: -1, fit: 3, pers: 0.25 }, coin: { pass: 45, risk: 0.5, leave: 0, fit: 3, pers: 0.25 } };
  const LOG_MAX = 300;
  const CHAIN_K = 10, START_K = 1;
  const SALT = { tag: 0x51a7, slot: 0x2b1d, pick: 0x77e3, id: 0x1c0f }, TYPE_K = 0.5, TYPE_RECENT = 2;
  const rng = (f, fl, what, n = 0) => G.Grid.seeded(Math.imul(G.Season.st(f).seed ^ SALT[what], 31) + fl * 7919 + n * 104729);
  // SRD 함정표: 레벨 구간 [1~4, 5~10, 11~16, 17~20]
  const tier = lv => (lv >= 17 ? 3 : lv >= 11 ? 2 : lv >= 5 ? 1 : 0);
  const BOSS_K = { broken: 2, def: 4, ignored: 6 }, BOSS_ATK = { broken: 1.5, def: 3, ignored: 4 }, BOSS_BAND = { broken: 0, def: 2, ignored: 4 };
  const ROOF = { d: [2, 4, 10, 18], dc: [13, 15, 17, 19] }, DART = [1, 2, 4, 7], FALL = [1, 3, 6, 12], STATUE = [2, 4, 10, 18], NEEDLE = { d: [1, 2, 4, 10], dc: [11, 13, 15, 17] }, NET_DC = [10, 12, 14, 16];

  // ── 사건 데이터 ──
  // 기존 장면: 태그 · 유형 · 가중치만 얹는다
  const SCENE = (id, type, tags, w) => ({ id, scene: id, type, tags, w });
  const LIST = [
    SCENE('door', 'explore', [], 2), SCENE('sleepers', 'encounter', ['cave', 'collapsed', 'prison', 'thicket'], 2),
    SCENE('merchant', 'encounter', [], (f, c) => (c.hurt > 0.4 ? 4 : 1)), SCENE('shrine', 'discovery', ['altar', 'crypt'], 3),
    SCENE('hoard', 'discovery', ['treasury', 'crypt', 'ruin'], 3), SCENE('captive', 'encounter', ['prison'], 4),
    SCENE('mercy', 'encounter', [], 1.5), { ...SCENE('quarrel', 'party', [], 4), when: (f, c) => c.quarrel },
    // 무너지는 천장 (SRD Collapsing Roof): 줄을 찾으면 그냥 끊는다 (DC 11 지각) · 실패하면 민첩 내성, 성공해도 절반
    { id: 'roof', type: 'hazard', tags: ['collapsed', 'cave', 'treasury'], w: 3, cool: 5, prop: 'hoard', propOpt: { plain: true },
      vary: { treasury: { n: '걸린 자루', open: '금화 자루 밑에 줄이 매여 있다. 줄은 천장의 종까지 이어진다.', choices: { 0: { lose: { ops: [['ambush', 2]], state: 'taken', dm: '종이 울린다. 발소리가 몰려온다!', log: '{who} 줄을 건드려 경보가 울렸다.' } }, 1: { sub: '금화 ×8 · 적이 몰려온다', win: { ops: [['gold', 8], ['ambush', 2]], state: 'taken', dm: '자루를 낚아채자 종이 울린다!', log: '경보를 울리며 금화 자루를 들고 뛰었다.' } } } }, cave: { n: '흔들리는 바위', open: '금화 자루 위로 바위들이 위태롭게 얹혀 있다. 받침돌에 줄이 감겨 있다.' } }, n: '금 간 천장', open: '기둥 사이에 금화 자루가 있다. 바닥 가까이에 가는 줄이 보이는 듯하다.',
      choices: [
        { label: '줄부터 찾는다', check: { sk: 'perception', dc: 11, what: '줄 찾기' }, pol: ['careful', 'party'], pers: { careful: 2 },
          win: { ops: [['gold', 5]], state: 'taken', dm: '줄을 끊었다. 기둥은 그대로 서 있다.', log: '{who} 천장을 무너뜨릴 줄을 찾아 끊었다.' }, lose: { ops: [['roof']], state: 'taken', dm: '발끝에 줄이 걸렸다. 천장이 내려앉는다!', log: '{who} 줄을 건드려 천장이 무너졌다.' } },
        { label: '자루만 들고 뛴다', sub: '금화 ×8 · 전원 민첩 내성', pol: ['bold', 'coin'], pers: { greedy: 3 }, win: { ops: [['gold', 8], ['roof']], state: 'taken', dm: '자루를 낚아채자 천장이 내려앉는다!', log: '무너지는 천장 밑에서 금화 자루를 들고 뛰었다.' } },
        { label: '돌아서 간다', leave: true, win: { dm: '아무도 그 기둥들 사이로 들어가지 않는다.' } },
      ] },
    // 독침 복도 (SRD Poisoned Darts): 구멍을 찾아 막는다 (DC 15 지각) · 민첩 내성 실패에 1d3발
    { id: 'darts', type: 'hazard', tags: ['crypt', 'treasury', 'library'], w: 3, cool: 5, prop: 'hoard', propOpt: { plain: true }, n: '구멍 뚫린 복도', open: '벽 부조마다 작은 구멍이 나 있다. 복도 끝에 궤짝이 있다.',
      choices: [
        { label: '구멍을 찾아 막는다', check: { sk: 'perception', dc: 15, what: '구멍 찾기' }, pol: ['careful', 'party'], pers: { careful: 2 },
          win: { ops: [['relic']], dm: '구멍을 전부 막았다. 궤짝까지 조용하다.', log: '{who} 독침 구멍을 모두 막고 궤짝을 열었다.' }, lose: { ops: [['darts']], dm: '딸깍. 벽에서 독침이 쏟아진다!', log: '{who} 발판을 밟아 독침이 쏟아졌다.' } },
        { label: '달려가 쓸어 담는다', sub: '금화 ×8 · 전원 민첩 내성', pol: ['bold'], pers: { hothead: 2 }, win: { ops: [['darts'], ['gold', 8]], dm: '독침을 맞으며 궤짝을 부쉈다. 금화만 건졌다.', log: '독침을 뚫고 궤짝의 금화를 쓸어 담았다.' } },
        { label: '둔다', leave: true, win: { dm: '구멍 앞을 지나치지 않기로 했다.' } },
      ] },
    // 봉인 문자: 비전학의 자리. 마법 탐지가 있으면 이점 (읽을 곳이 보인다)
    { id: 'seal', type: 'discovery', tags: ['library', 'altar', 'crypt', 'ruin'], w: 3, cool: 5, prop: 'shrine',
      vary: { library: { n: '옛글 돌판', open: '서가 사이 돌판에 옛글이 빽빽하다. 그 밑에서 빛이 샌다.', choices: { 0: { label: '옛글을 해독한다', check: { sk: 'investigation', dc: 15, what: '해독', advX: 'x_detect' }, cls: ['mage', 'archmage', 'bard', 'rogue'] } } }, altar: { n: '제단의 기도문', open: '제단 돌판에 기도문이 새겨져 있다. 끝 구절만 지워져 있다.', choices: { 0: { label: '기도문을 잇는다', check: { sk: 'religion', dc: 15, what: '기도문', advX: 'x_detect' }, cls: ['cleric', 'paladin'] } } } }, n: '봉인 문자', open: '돌판에 문자가 새겨져 있고, 그 밑에서 희미하게 빛이 샌다.',
      choices: [
        { label: '문자를 읽는다', check: { sk: 'arcana', dc: 15, what: '문자 읽기', advX: 'x_detect' }, pol: ['careful', 'party'], cls: ['mage', 'archmage', 'warlock', 'bard'],
          win: { ops: [['relic']], state: 'holy', dm: '봉인이 풀렸다. 안에 든 것이 그대로다.', log: '{who} 봉인 문자를 읽어 냈다.' }, lose: { ops: [['stress', 10]], state: 'boil', dm: '문자가 머릿속을 긁고 지나간다.', log: '{who} 봉인 문자를 잘못 읽었다.' } },
        { label: '돌판을 부순다', check: { sk: 'athletics', dc: 20, what: '돌판 부수기' }, pol: ['bold', 'coin'], pers: { hothead: 3 },
          win: { ops: [['gold', 10], ['heat', 1]], state: 'fed', dm: '돌판이 쪼개졌다. 아래쪽 어딘가가 울린다.', log: '{who} 봉인 돌판을 맨손으로 부쉈다.' }, lose: { ops: [['one', 'FALL', 6], ['heat', 1]], state: 'boil', dm: '돌판이 튕겨 나와 몸을 때린다.', log: '{who} 돌판을 부수려다 다쳤다.' } },
        { label: '둔다', leave: true, win: { dm: '빛은 계속 새어 나온다. 아무도 손대지 않는다.' } },
      ] },
    // 버려진 야영지: 생존의 자리 (발자국을 읽어 매복을 드러낸다) · 조사는 금화를 찾지만 숨은 구덩이 (SRD)
    { id: 'oldcamp', type: 'discovery', tags: ['cave', 'collapsed', 'prison', 'thicket'], w: 3, cool: 5, prop: 'camp', propOpt: { state: 'cold' }, n: '버려진 야영지', open: '식은 재와 찢어진 천막이 있다. 떠난 지 오래되지 않았다.',
      choices: [
        { label: '발자국을 읽는다', check: { sk: 'survival', dc: 15, what: '발자국' }, pol: ['careful', 'party'], cls: ['archer', 'scout', 'barbarian'],
          win: { ops: [['gold', 4], ['scout']], dm: '어디서 왔고 어디로 갔는지 보인다.', log: '{who} 발자국을 읽어 앞길을 알아냈다.' }, lose: { ops: [['stress', 4]], dm: '발자국이 뒤엉켜 있다. 괜히 뒤가 서늘하다.' } },
        { label: '천막을 뒤진다', check: { sk: 'investigation', dc: 15, what: '천막 뒤지기' }, pol: ['coin', 'bold'], pers: { greedy: 3 },
          win: { ops: [['gold', 8]], dm: '천막 밑에 묻어 둔 주머니가 나왔다.', log: '{who} 버려진 야영지에서 숨겨 둔 금화를 찾았다.' }, lose: { ops: [['one', 'FALL', 6]], dm: '천막 밑이 꺼진다. 구덩이다!', log: '{who} 야영지의 구덩이에 빠졌다.' } },
        { label: '지나간다', leave: true, win: { dm: '아무도 재를 건드리지 않는다.' } },
      ] },
    // 길 잃은 사람: 넷 중 하나는 변신 괴물 (시드로 정해진다). 통찰로 알아보거나, 믿고 치료해 주거나
    { id: 'stranger', type: 'encounter', tags: ['prison', 'cave', 'collapsed', 'thicket'], w: 3, cool: 6, prop: 'stranger',
      vary: { prison: { n: '갇힌 사람', prop: 'cage', propOpt: { cls: 'rogue' }, open: '철창 안에서 누군가 손을 내민다. 다리가 피투성이다.', choices: { 1: { label: '철창을 뜯고 치료한다', check: { sk: 'athletics', dc: 15, what: '철창 뜯기' }, cls: ['barbarian', 'dragoon', 'paladin'] } } }, thicket: { open: '수풀 속에 누군가 주저앉아 손을 든다. 다리가 피투성이다.' } }, n: '길 잃은 사람', open: '누군가 주저앉은 채 손을 든다. 다리가 피투성이다.', fake: 0.25,
      choices: [
        { label: '먼저 캐묻는다', check: { sk: 'insight', dc: 15, what: '속내 읽기' }, pol: ['careful', 'party'], pers: { careful: 2 },
          win: { fake: { ops: [['fight', 2]], state: 'gone', dm: '말이 앞뒤가 안 맞는다. 얼굴이 흘러내린다!', log: '{who} 변신 괴물의 거짓말을 꿰뚫어 봤다.' }, real: { ops: [['gold', 3], ['scout']], dm: '진짜다. 사례와 함께 이 층 길을 알려 준다.', log: '{who} 길 잃은 사람에게서 길을 들었다.' } }, lose: { ops: [['stress', 4]], dm: '믿을 수 없어 그냥 두고 간다. 뒤에서 부르는 소리가 난다.' } },
        { label: '다리를 치료해 준다', check: { sk: 'medicine', dc: 10, what: '치료' }, pol: ['coin'], cls: ['cleric', 'paladin', 'scout'], pers: { meek: 3 },
          win: { fake: { ops: [['ambush', 2]], state: 'gone', dm: '붕대를 감던 손을 잡아챈다. 다리에 상처가 없다!', log: '{who} 치료하던 사람에게 뒤통수를 맞았다.' }, real: { ops: [['gold', 6], ['stress', -10]], dm: '걸을 수 있게 됐다. 몇 번이고 고개를 숙인다.', log: '{who} 길 잃은 사람을 살려 보냈다.' } }, lose: { fake: { ops: [['ambush', 2]], state: 'gone', dm: '상처를 들추자 살이 움직인다!' }, real: { ops: [['stress', 3]], dm: '피가 멎지 않는다. 할 수 있는 게 없다.' } } },
        { label: '지나간다', leave: true, pol: ['bold'], win: { ops: [['stress', 3]], dm: '시선이 등 뒤에 오래 남는다.' } },
      ] },
    // 쉴 곳: 작은 오두막의 자리 (SRD: 안에 있지 않던 것은 들어오지 못한다). 불만 피우면 망을 잘 봐야 한다
    { id: 'shelter', type: 'explore', tags: ['deadend'], w: (f, c) => (c.hurt > 0.4 ? 6 : 2), when: (f, c) => c.hurt > 0.2, cool: 4, prop: 'camp', propOpt: { state: 'cold' }, n: '막다른 방', open: '입구가 하나뿐인 방이다. 쉬어 갈 수 있을 것 같다.',
      choices: [
        { label: '작은 오두막을 친다', x: 'x_hut', sub: '안전하게 쉰다', pol: ['careful', 'party'], win: { ops: [['rest']], state: 'lit', dm: '돔 안으로는 아무것도 들어오지 못한다. 다들 눕는다.', log: '{who} 작은 오두막 안에서 일행을 쉬게 했다.' } },
        { label: '불을 피우고 쉰다', check: { sk: 'perception', dc: 15, what: '망보기' }, pol: ['party', 'bold'],
          win: { ops: [['rest']], state: 'lit', dm: '아무도 오지 않았다. 숨을 돌렸다.', log: '{who} 망을 보는 동안 일행이 쉬었다.' }, lose: { ops: [['rest'], ['ambush', 2]], state: 'lit', dm: '불빛을 보고 무언가 다가왔다. 망을 보던 눈이 놓쳤다!', log: '{who} 망을 놓쳐 쉬던 일행이 습격받았다.' } },
        { label: '그냥 간다', leave: true, pol: ['careful'], win: { dm: '쉬지 않고 다시 걷는다.' } },
      ] },

    // ── SRD 함정 나머지: 원문의 DC · 피해표 ──
    { id: 'net', type: 'hazard', tags: ['cave', 'thicket', 'collapsed'], w: 3, cool: 5, prop: 'hoard', propOpt: { plain: true }, n: '늘어진 줄', open: '금화 주머니가 줄에 매달려 있다. 머리 위가 어쩐지 무겁다.',
      choices: [
        { label: '줄부터 찾는다', check: { sk: 'perception', dc: 11, what: '줄 찾기' }, pol: ['careful', 'party'], win: { ops: [['gold', 4]], state: 'taken', dm: '줄을 끊자 위에서 그물이 힘없이 떨어진다.', log: '{who} 그물 덫을 찾아 끊었다.' }, lose: { ops: [['net']], dm: '머리 위로 그물이 쏟아진다!', log: '{who} 그물 덫을 건드렸다.' } },
        { label: '주머니를 낚아챈다', sub: '금화 ×4 · 한 사람 민첩 내성', pol: ['bold', 'coin'], pers: { greedy: 2, hothead: 1 }, win: { who: true, ops: [['gold', 4], ['net']], state: 'taken', dm: '주머니는 손에 들어왔다. 그물도 함께 떨어진다!', log: '{who} 그물을 뒤집어쓰며 금화 주머니를 챙겼다.' } },
        { label: '지나간다', leave: true, win: { dm: '머리 위를 살피며 지나간다.' } },
      ] },
    { id: 'needle', type: 'hazard', tags: ['treasury', 'crypt', 'ruin'], w: 3, cool: 5, prop: 'hoard', propOpt: { plain: true }, n: '잠긴 상자', open: '자물쇠가 달린 작은 상자가 있다. 열쇠 구멍에 검은 얼룩이 있다.',
      choices: [
        { label: '자물쇠를 살핀다', check: { sk: 'perception', dc: 15, what: '자물쇠 살피기' }, pol: ['careful', 'party'], win: { ops: [['relic']], state: 'taken', dm: '안쪽에 독침이 있다. 빼내고 나니 쉽게 열린다.', log: '{who} 독침을 빼내고 상자를 열었다.' }, lose: { ops: [['needle']], dm: '찌릿하다. 손끝이 금세 부어오른다.', log: '{who} 자물쇠의 독침에 찔렸다.' } },
        { label: '그냥 비틀어 연다', sub: '금화 ×4 · 한 사람 건강 내성', pol: ['bold', 'coin'], pers: { greedy: 2 }, win: { who: true, ops: [['gold', 4], ['needle']], state: 'taken', dm: '상자는 열렸다. 독침도 튀어나왔다.', log: '{who} 독침을 맞으며 상자를 비틀어 열었다.' } },
        { label: '둔다', leave: true, win: { dm: '상자를 그 자리에 둔다.' } },
      ] },
    { id: 'statue', type: 'hazard', tags: ['altar', 'crypt', 'library', 'ruin'], w: 3, cool: 5, prop: 'shrine', n: '입 벌린 석상', open: '입을 벌린 석상이 궤짝을 바라본다. 입안이 그을려 있다.',
      choices: [
        { label: '문양을 찾아 지운다', check: { sk: 'arcana', dc: 15, what: '문양 읽기', advX: 'x_detect' }, pol: ['careful', 'party'], cls: ['mage', 'archmage', 'warlock', 'bard'], win: { ops: [['relic']], state: 'holy', dm: '"불"이라 새긴 문양을 긁어냈다. 석상은 조용하다.', log: '{who} 불꽃 석상의 문양을 지웠다.' }, lose: { ops: [['statue']], state: 'boil', dm: '석상이 불을 뿜는다!', log: '{who} 문양을 잘못 건드려 석상이 불을 뿜었다.' } },
        { label: '달려가 쓸어 담는다', sub: '금화 ×10 · 전원 민첩 내성', pol: ['bold'], pers: { hothead: 2 }, win: { ops: [['statue'], ['gold', 10]], state: 'boil', dm: '불길을 뚫고 궤짝을 부쉈다. 금화만 건졌다.', log: '불꽃 석상의 불길을 뚫고 금화를 쓸어 담았다.' } },
        { label: '둔다', leave: true, win: { dm: '석상의 시선을 피해 돌아간다.' } },
      ] },
    // 구르는 돌: SRD는 11레벨부터의 함정 (10d10)
    { id: 'stone', type: 'hazard', tags: ['cave', 'collapsed', 'treasury'], w: 3, cool: 6, when: (f, c) => c.lv >= 11, n: '기울어진 바닥', open: '바닥이 앞쪽으로 기울어져 있다. 발판 하나가 유난히 깨끗하다.',
      choices: [
        { label: '발판을 조사한다', check: { sk: 'investigation', dc: 15, what: '발판 조사' }, pol: ['careful', 'party'], win: { ops: [['gold', 8]], dm: '쐐기를 박았다. 천장에서 돌덩이가 움직이다 멈춘다. 뒤쪽에 금화가 있다.', log: '{who} 구르는 돌의 발판을 막았다.' }, lose: { ops: [['stone']], dm: '철컥. 뒤에서 돌덩이가 굴러온다!', log: '{who} 발판을 밟아 돌덩이를 불렀다.' } },
        { label: '뛰어 지나간다', sub: '금화 ×12 · 전원 민첩 내성', pol: ['bold'], win: { ops: [['gold', 12], ['stone']], dm: '돌덩이가 등 뒤로 쫓아온다!', log: '구르는 돌덩이를 피해 달렸다.' } },
        { label: '돌아서 간다', leave: true, win: { dm: '기울어진 바닥을 피해 돌아간다.' } },
      ] },
    // ── 탐험 ──
    { id: 'shortcut', type: 'explore', tags: ['collapsed', 'cave', 'thicket'], w: (f, c) => (c.hurt > 0.3 ? 5 : 2), cool: 4, n: '아래로 난 길', open: '땅이 꺼진 틈으로 아래층이 바로 보인다.',
      choices: [
        { label: '바로 내려간다', sub: '남은 방과 상자를 포기', pol: ['careful'], win: { ops: [['rush']], dm: '틈으로 내려갈 길을 잡았다.', log: '남은 방을 버리고 지름길로 내려갔다.' } },
        { label: '이 층을 마저 돈다', leave: true, pol: ['bold', 'coin', 'party'], win: { dm: '틈을 표시해 두고 돌아선다.' } },
      ] },
    { id: 'secret', type: 'explore', tags: ['library', 'crypt', 'treasury', 'deadend'], w: 3, cool: 5, n: '안 맞는 벽돌', open: '벽돌 하나만 색이 다르다. 그 앞 먼지가 긁혀 있다.',
      choices: [
        { label: '벽을 조사한다', check: { sk: 'investigation', dc: 15, what: '벽 조사' }, pol: ['careful', 'party', 'coin'], win: { ops: [['relic']], dm: '벽이 밀린다. 안쪽의 작은 방에 궤짝이 있다.', log: '{who} 숨겨진 방을 찾아냈다.' }, lose: { ops: [['stress', 2]], dm: '아무것도 없다. 먼지만 뒤집어썼다.' } },
        { label: '벽을 부순다', check: { sk: 'athletics', dc: 20, what: '벽 부수기' }, pol: ['bold'], pers: { hothead: 3 }, win: { ops: [['gold', 8], ['heat', 1]], dm: '벽이 무너졌다. 궤짝은 깨졌지만 금화는 남았다. 소리가 멀리 울린다.', log: '{who} 벽을 부수고 금화를 꺼냈다.' }, lose: { ops: [['heat', 1]], dm: '꿈쩍도 안 한다. 소리만 멀리 울린다.' } },
        { label: '둔다', leave: true, win: { dm: '벽돌을 두고 간다.' } },
      ] },
    { id: 'flood', type: 'explore', tags: ['cave', 'thicket', 'crypt'], w: 3, cool: 5, n: '물에 잠긴 길', open: '길이 검은 물에 잠겨 있다. 건너편에 궤짝이 보인다.',
      choices: [
        { label: '헤엄쳐 건넌다', check: { sk: 'athletics', dc: 15, what: '수영' }, pol: ['bold', 'coin', 'party'], win: { ops: [['gold', 7]], dm: '젖은 채로 궤짝을 끌고 돌아왔다.', log: '{who} 물을 건너 궤짝을 가져왔다.' }, lose: { ops: [['one', 'FALL', 6], ['stress', 3]], dm: '물속에서 무언가에 부딪혔다. 간신히 빠져나왔다.', log: '{who} 물에 빠져 다쳤다.' } },
        { label: '돌아간다', leave: true, pol: ['careful'], win: { dm: '물에 손도 대지 않고 돌아선다.' } },
      ] },
    // ── 파티: 그 파티에 그런 사람이 있어야 나온다. {a} · {b}는 G.Event.subject가 고른다 ──
    { id: 'fear', type: 'party', tags: [], w: 5, cool: 4, when: (f, c) => c.party.some(p => (p.merc.stress || 0) >= 60), subject: 'stressed', n: '떠는 손', open: '{a}의 손이 멈추지 않는다. 무기를 쥐었다 놓았다 한다.',
      choices: [
        { label: '곁에서 달랜다', other: true, check: { sk: 'persuasion', dc: 10, what: '달래기' }, pol: ['careful', 'party'], pers: { meek: 2 }, win: { ops: [['stressA', -25], ['bondWho', 6]], dm: '숨이 조금씩 가라앉는다.', log: '{who} 떨고 있는 {a} 곁을 지켰다.' }, lose: { ops: [['stressA', 5]], dm: '아무 말도 들리지 않는 눈치다.' } },
        { label: '정신 차리라고 다그친다', other: true, sub: '스트레스 −10 · 정 −6', pol: ['bold', 'coin'], pers: { hothead: 3 }, win: { who: true, other: true, ops: [['stressA', -10], ['bondWho', -6]], dm: '멱살을 잡혔다. 눈빛은 돌아왔지만 입을 닫았다.', log: '{who} 떨고 있는 {a}의 멱살을 잡았다.' } },
        { label: '못 본 척한다', leave: true, win: { ops: [['stressA', 5]], dm: '아무도 그 손을 보지 않는다.' } },
      ] },
    { id: 'pocket', type: 'party', tags: [], w: 3, cool: 8, when: (f, c) => c.party.some(p => (p.merc.pers || []).includes('greedy')) && G.Exp.carry(f) > 0, subject: 'greedy', n: '불룩한 주머니', open: '{a}의 주머니가 아침보다 불룩하다. 짐이 조금 가벼워진 것 같다.',
      choices: [
        { label: '따져 묻는다', other: true, check: { sk: 'insight', dc: 15, what: '속내 읽기' }, pol: ['careful', 'party'], win: { ops: [['gold', 3], ['stressA', 10], ['bondWho', -4]], dm: '금화가 도로 나왔다. 아무도 눈을 맞추지 않는다.', log: '{who} {a}의 주머니에서 금화를 되찾았다.' }, lose: { ops: [['stressA', 6], ['bondWho', -8]], dm: '"날 도둑으로 보는 거야?" 큰 소리가 났다.', log: '{who} {a}를 도둑으로 몰았다가 사이가 틀어졌다.' } },
        { label: '눈감아 준다', sub: '짐 −5%', leave: true, pol: ['bold', 'coin'], win: { ops: [['pay', 0.05], ['stressA', -10]], dm: '아무도 묻지 않았다. {a}의 어깨가 가볍다.' } },
      ] },
    { id: 'watch', type: 'party', tags: [], w: 3, cool: 8, when: (f, c) => c.party.length >= 3, subject: 'pair', n: '함께 서는 망', open: '잠깐 쉬는 동안 누군가는 망을 봐야 한다. {a}와 {b}가 눈을 마주친다.',
      choices: [
        { label: '둘에게 맡긴다', sub: '둘의 정 +10 · 전원 스트레스 −3', pol: ['party', 'careful'], win: { ops: [['bondAB', 10], ['stress', -3]], dm: '둘이 나란히 앉아 무언가를 낮게 이야기한다.', log: '{a}와 {b}가 망을 보며 오래 이야기를 나눴다.' } },
        { label: '각자 쉬게 한다', sub: '전원 스트레스 −6', leave: true, pol: ['bold', 'coin'], win: { ops: [['stress', -6]], dm: '다들 벽에 기대 눈을 감는다.' } },
      ] },
    { id: 'mourn', type: 'party', tags: [], w: 6, cool: 6, when: (f, c) => c.party.some(p => p.merc.grief), subject: 'griever', n: '남은 사람', open: '{a}가 {n}의 물건을 꺼내 들여다본다.',
      choices: [
        { label: '다 같이 멈춰 기린다', sub: '전설 +1 · 슬픔이 끝난다 · 층 위험 +1', pol: ['careful', 'party'], win: { ops: [['griefEnd'], ['stress', -8], ['legend', 1], ['heat', 1]], dm: '돌을 하나씩 쌓고 {n}의 이름을 불렀다.', log: '{a}와 일행이 {n}을 기렸다.' } },
        { label: '앞으로 간다', leave: true, pol: ['bold', 'coin'], win: { ops: [['stressA', 6]], dm: '{a}가 물건을 도로 넣고 일어선다.' } },
      ] },
    { id: 'stubborn', type: 'party', tags: [], w: 5, cool: 5, when: (f, c) => c.party.some(p => p.hp < p.max * 0.4), subject: 'hurt', n: '괜찮다는 말', open: '{a}가 피를 흘리면서 괜찮다고 한다.',
      choices: [
        { label: '붙잡아 치료한다', other: true, check: { sk: 'medicine', dc: 10, what: '치료' }, pol: ['careful', 'party'], cls: ['cleric', 'paladin', 'scout'], win: { ops: [['healA', 0.3], ['bondWho', 4]], dm: '"괜찮다니까." 말은 그래도 팔은 내민다.', log: '{who} 고집부리는 {a}를 앉혀 치료했다.' }, lose: { ops: [['stressA', 4]], dm: '붕대가 금세 젖는다.' } },
        { label: '믿고 맡긴다', sub: '스트레스 −10', leave: true, pol: ['bold', 'coin'], win: { ops: [['stressA', -10]], dm: '{a}가 씩 웃고 앞장선다.' } },
      ] },

    // ── 튜토리얼 첫 원정 (G.Tut): 후보로 뽑히지 않는다 ──
    { id: 'tut_bag', tut: true, type: 'discovery', tags: [], w: 0, n: '찢어진 자루', open: '찢어진 자루가 굴러다닌다. 안에서 쇳소리가 난다.',
      choices: [
        { label: '뒤져 본다', check: { sk: 'perception', dc: 5, what: '자루 뒤지기' }, pol: ['party', 'careful', 'bold', 'coin'], win: { ops: [['gold', 3]], dm: '금화 몇 닢이 나왔다.' }, lose: { ops: [['stress', 1]], dm: '쥐가 튀어나온다. 자루는 비었다.' } },
        { label: '둔다', leave: true, win: { dm: '자루를 밟지 않고 지나간다.' } },
      ] },
    { id: 'tut_floor', tut: true, type: 'hazard', tags: [], w: 0, n: '꺼진 바닥', open: '앞쪽 바닥이 살짝 꺼져 있다. 건너편에 주머니가 보인다.',
      choices: [
        { label: '살피고 간다', check: { sk: 'investigation', dc: 15, what: '바닥 살피기' }, win: { ops: [['gold', 4]], dm: '밟으면 안 되는 판을 피해 주머니를 챙겼다.' }, lose: { ops: [['one', 'FALL', 6], ['pitted']], dm: '판이 뒤집혔다. 구덩이다!', log: '{who} 첫 구덩이에 빠졌다.' } },
        { label: '그냥 건너간다', sub: '금화 ×4 · 한 사람 낙하', pol: ['bold', 'coin', 'party', 'careful'], win: { who: true, ops: [['gold', 4], ['one', 'FALL', 6], ['pitted']], dm: '주머니는 챙겼다. 발밑이 꺼진다!', log: '{who} 첫 구덩이에 빠졌다.' } },
        { label: '둔다', leave: true, win: { dm: '꺼진 바닥을 돌아서 간다.' } },
      ] },

    // ── 연속 사건 (DESIGN.md 99): 같은 chain의 stage를 차례로. 고른 것은 flag로 남아 뒤 단계의 문장 · DC · 적을 바꾼다 ──
    // 붉은 의식: 발자국 → 다친 탐험가 → 제단 → 의식의 주인. 안 보고 지나가도 의식은 계속된다
    { id: 'rit_tracks', chain: 'ritual', stage: 0, type: 'discovery', tags: [], w: 3, minFl: 2, n: '붉은 발자국', open: '맨발 자국이 줄지어 아래로 향한다. 흙에 붉은 가루가 섞여 있다.',
      choices: [
        { label: '발자국을 읽는다', check: { sk: 'survival', dc: 10, what: '발자국' }, pol: ['careful', 'party'], cls: ['archer', 'scout', 'barbarian'], win: { flag: 'known', ops: [['scout']], dm: '여럿이 무언가를 끌고 갔다. 앞길이 조금 보인다.', log: '{who} 붉은 발자국을 읽었다.' }, lose: { ops: [['stress', 2]], dm: '어디로 갔는지 알 수 없다.' } },
        { label: '가루를 살핀다', check: { sk: 'arcana', dc: 15, what: '붉은 가루' }, pol: ['bold'], cls: ['mage', 'archmage', 'warlock', 'bard'], win: { flag: 'known', ops: [['gold', 2]], dm: '의식에 쓰는 가루다. 누가 흘린 은화도 하나 있다.', log: '{who} 붉은 가루가 의식에 쓰인다는 걸 알아냈다.' }, lose: { ops: [['stress', 5]], dm: '가루가 손끝에서 따갑게 타들어 간다.' } },
        { label: '지나간다', leave: true, pol: ['coin'], win: { dm: '자국을 밟고 지나간다.' } },
      ] },
    { id: 'rit_wounded', chain: 'ritual', stage: 1, gap: 1, type: 'encounter', tags: [], w: 3, prop: 'stranger', n: '다친 탐험가', open: '탐험가 하나가 쓰러져 있다. 온몸에 붉은 가루가 묻어 있다.',
      choices: [
        { label: '상처를 치료한다', check: { sk: 'medicine', dc: 10, what: '치료' }, pol: ['party', 'careful'], cls: ['cleric', 'paladin', 'scout'], pers: { meek: 3 }, win: { flag: 'saved', saver: true, ops: [['stress', -5]], dm: '탐험가가 눈을 뜬다. "동료들이 아래로 끌려갔어. 제단이 있어."', log: '{who} 붉은 가루 범벅인 탐험가를 살렸다.' }, lose: { flag: 'died', state: 'gone', ops: [['stress', 6]], dm: '숨이 멎었다. 입술이 "제단"이라고 움직였다.', log: '{who} 끝내 탐험가를 살리지 못했다.' } },
        { label: '말만 듣는다', check: { sk: 'insight', dc: 15, what: '말 듣기' }, pol: ['coin', 'bold'], win: { flag: 'known', state: 'gone', dm: '띄엄띄엄 들은 말로 제단의 위치를 짐작했다.', log: '{who} 죽어 가는 탐험가에게서 제단 이야기를 들었다.' }, lose: { flag: 'died', state: 'gone', ops: [['stress', 3]], dm: '알아들을 수 없는 말만 남기고 조용해졌다.' } },
        { label: '지나간다', leave: true, win: { flag: 'left', ops: [['stress', 4]], dm: '뒤에서 부르는 소리가 곧 끊긴다.' } },
      ] },
    { id: 'rit_altar', chain: 'ritual', stage: 2, gap: 1, type: 'big', tags: [], w: 3, prop: 'shrine', n: '의식의 제단', open: '제단 둘레로 붉은 가루가 원을 그린다. 아직 끝나지 않았다.', openIf: { saved: '{saver} 덕에 살아난 탐험가가 말한 제단이다. 붉은 가루가 원을 그린다.' },
      choices: [
        { label: '의식을 끊는다', check: { sk: 'arcana', dc: 15, dcIf: ['known', 10], what: '의식 끊기' }, pol: ['careful', 'party'], cls: ['mage', 'archmage', 'warlock', 'cleric'], win: { flag: 'broken', state: 'holy', dm: '원이 끊겼다. 아래쪽에서 비명이 울린다.', log: '{who} 의식의 원을 끊었다.' }, lose: { state: 'boil', ops: [['stress', 8]], dm: '원이 오히려 밝아진다.', log: '{who} 의식을 끊지 못했다.' } },
        { label: '제단을 부순다', check: { sk: 'athletics', dc: 15, what: '제단 부수기' }, pol: ['bold'], pers: { hothead: 3 }, win: { flag: 'broken', state: 'fed', ops: [['heat', 1]], dm: '제단이 갈라졌다. 층 전체가 웅웅 울린다.', log: '{who} 의식의 제단을 부쉈다.' }, lose: { state: 'boil', ops: [['one', 'FALL', 6], ['heat', 1]], dm: '돌조각이 튀어 몸을 때린다.', log: '{who} 제단을 부수려다 다쳤다.' } },
        { label: '돌아가서 준비한다', wait: 'run', sub: '다음 원정 · 먼저 친다 · 축복', pol: ['coin'], win: { flag: 'prepared', dm: '위치를 지도에 적었다. 다음에 제대로 온다.', log: '의식의 제단을 지도에 적어 두고 물러났다.' } },
        { label: '지나간다', leave: true, win: { flag: 'ignored', dm: '아무도 원 안으로 들어가지 않는다.', log: '의식의 제단을 그냥 지나쳤다.' } },
      ] },
    { id: 'rit_end', chain: 'ritual', stage: 3, gap: 1, type: 'big', tags: [], w: 3, n: '의식의 주인', open: '붉은 가루를 뒤집어쓴 자가 길을 막고 서 있다.', openIf: { broken: '의식을 망친 자가 길을 막는다. 몸이 절반쯤 무너져 있다.', ignored: '의식이 끝났다. 무언가가 그 몸을 빌려 걸어온다.', prepared: '준비는 끝났다. 의식의 주인이 아직 우리를 보지 못했다.' },
      choices: [
        { label: '맞선다', sub: '우두머리', base: 1.5, pol: ['party', 'careful', 'bold', 'coin'], win: { hold: true, ops: [['ritualBoss']], dm: '가루가 피어오른다.' } },
        { label: '물러난다', leave: true, win: { end: 'fled', ops: [['heat', 2], ['stress', 6]], dm: '등 뒤에서 웃음소리가 따라온다.', log: '의식의 주인에게 등을 보였다.' } },
      ],
      won: { ops: [['relic'], ['legend', 3]], dm: '붉은 가루가 바람에 흩어진다.', log: '붉은 의식을 끝냈다.', ifSaved: { ops: [['gold', 12]], dm: '{saver} 덕에 살아난 탐험가가 찾아와 동료들 몫까지 값을 치른다.' } } },
    // 도굴꾼: 털린 궤짝 → 도굴꾼 무리 → 다음 원정에서 되돌아오는 값
    { id: 'rob_chest', chain: 'robbers', stage: 0, type: 'discovery', tags: [], w: 3, minFl: 3, prop: 'hoard', propOpt: { plain: true, state: 'taken' }, n: '털린 궤짝', open: '누가 먼저 다녀갔다. 빈 궤짝에 문장 새긴 단도가 꽂혀 있다.',
      choices: [
        { label: '단도를 챙긴다', sub: '금화 ×3', pol: ['coin', 'bold'], pers: { greedy: 3 }, win: { flag: 'took', who: true, ops: [['gold', 3]], dm: '좋은 단도다. 임자가 찾으러 올지도 모른다.', log: '{who} 빈 궤짝에서 문장 새긴 단도를 챙겼다.' } },
        { label: '흔적을 쫓는다', check: { sk: 'survival', dc: 15, what: '흔적' }, pol: ['careful', 'party'], cls: ['archer', 'scout', 'barbarian'], win: { flag: 'tracked', ops: [['scout']], dm: '여섯 명, 짐이 무겁다. 어느 쪽으로 갔는지 안다.', log: '{who} 도굴꾼의 흔적을 찾았다.' }, lose: { ops: [['stress', 3]], dm: '흔적이 물길에서 끊겼다.' } },
        { label: '둔다', leave: true, win: { dm: '단도는 그대로 꽂혀 있다.' } },
      ] },
    { id: 'rob_meet', chain: 'robbers', stage: 1, gap: 2, type: 'encounter', tags: [], w: 3, n: '도굴꾼 무리', open: '짐을 잔뜩 진 무리가 무기를 든다. "먼저 온 쪽이 임자지."', openIf: { took: '"그 단도, 우리 거야." 짐을 진 무리가 {who0} 쪽을 가리킨다.', tracked: '흔적대로다. 짐을 진 무리가 아직 우리를 못 봤다.' },
      choices: [
        { label: '말로 푼다', check: { sk: 'persuasion', dc: 15, dcIf: ['took', 20], what: '설득' }, pol: ['careful', 'party'], cls: ['bard', 'paladin'], win: { flag: 'pact', ops: [['stress', -5]], dm: '칼이 내려간다. 다음에 만나면 값을 쳐 주겠다고 한다.', log: '{who} 도굴꾼들과 말을 맞췄다.' }, lose: { flag: 'fought', ops: [['ambush', 2]], dm: '말이 끝나기 전에 칼이 나온다!', log: '{who} 꺼낸 말이 도굴꾼들을 화나게 했다.' } },
        { label: '먼저 친다', sub: '우리 먼저', pol: ['bold'], pers: { hothead: 3 }, win: { flag: 'fought', ops: [['fight', 3]], dm: '짐을 벗기 전에 덮친다!', log: '도굴꾼 무리를 먼저 덮쳤다.' } },
        { label: '짐을 나눈다', sub: '짐 −15%', pol: ['coin'], leave: true, win: { flag: 'paid', ops: [['pay', 0.15]], dm: '금화 자루를 건네자 비켜선다. 다시 보자는 눈빛이다.', log: '도굴꾼에게 짐 일부를 내주고 지나갔다.' } },
      ], nextWait: 'run' },
    { id: 'rob_after', chain: 'robbers', stage: 2, wait: 'run', type: 'encounter', tags: [], w: 3, n: '도굴꾼의 값', auto: [
        { if: 'pact', ops: [['relic'], ['stress', -5]], dm: '약속대로 도굴꾼이 나타나 물건 하나를 내려놓는다.', log: '도굴꾼이 약속한 값을 치렀다.' },
        { if: 'paid', ops: [['ambush', 3]], dm: '"그때 보니 만만하더라고." 더 많이 데리고 왔다!', log: '짐을 내줬던 도굴꾼들이 더 많이 돌아왔다.' },
        { if: 'fought', ops: [['ambush', 2], ['stress', 4]], dm: '살아남은 도굴꾼들이 복수하러 왔다!', log: '살아남은 도굴꾼들이 복수하러 왔다.' },
      ] },
  ];
  const BY = Object.fromEntries(LIST.map(e => [e.id, e]));

  // ── 방 태그 · 사건 자리 ──
  const store = f => { const sn = G.Season.st(f).n; if (!f.ev || f.ev.sn !== sn) f.ev = { sn, fl: {}, last: {}, chains: {} }; return f.ev; };
  // 입구가 하나뿐인 방: 방 둘레 밖으로 이어지는 바닥을 덩어리로 센다
  function exits(m, r) {
    const open = new Set(), out = (x, y) => x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h, fl = (x, y) => m.c[y * m.w + x] !== '#' && m.c[y * m.w + x] != null && x >= 0 && y >= 0 && x < m.w && y < m.h;
    for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (out(x, y) && fl(x, y)) open.add(y * m.w + x);
    let n = 0; const seen = new Set();
    for (const k of open) { if (seen.has(k)) continue; n++; const q = [k]; seen.add(k); while (q.length) { const c = q.pop(), x = c % m.w, y = Math.floor(c / m.w); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const t = (y + b) * m.w + x + a; if (open.has(t) && !seen.has(t)) { seen.add(t); q.push(t); } } } }
    return n;
  }
  // 지형을 건드리지 않고 방마다 태그 하나 (시즌 × 층 × 방 번호 — 다시 와도 같다)
  function tagMap(f, m) {
    if (m.tagged || !m.rooms) return; m.tagged = true;
    const T = THEMES[f.front] || THEMES.def; // 지도 생성기를 정하는 것과 같은 값 (G.Region.of)
    m.rooms.forEach((r, i) => { r.ri = i; r.tags = [T[Math.floor(rng(f, f.floor, 'tag', i)() * T.length)]]; if (m.theme !== 'swamp' && r !== m.end && i > 0 && exits(m, r) === 1) r.tags.push('deadend'); });
  }
  const tagRooms = (f, rt) => tagMap(f, rt.map);
  // 연속 사건
  const chainOf = (f, id) => store(f).chains[id] || null;
  const ready = (f, s, e) => { if (!s || s.st === 'done' || s.stage !== e.stage) return false; if (s.wait === 'run' || e.wait === 'run') return (f.runs || 0) > s.run; return f.floor >= s.fl + (e.gap || 1) || (f.runs || 0) > s.run; };
  const chainOk = (f, e) => { if (!e.chain) return true; const s = chainOf(f, e.chain); return e.stage === 0 ? !s : ready(f, s, e); };
  const pending = f => LIST.some(e => e.chain && e.stage > 0 && ready(f, chainOf(f, e.chain), e));
  // 층의 사건 자리: 처음 정한 것을 시즌 동안 지킨다. 없는 층도 정상이다
  function slot(f, rooms, room) {
    const e = store(f), s = e.fl[f.floor]; if (s) return s;
    const R = rng(f, f.floor, 'slot'), dry = f.sceneDry || 0, p = 1 - (1 - room) ** 2 + dry * 0.15;
    const yes = f.floor >= 2 && (!f.sceneN || pending(f) || R() < p), at = rooms[Math.floor(R() * rooms.length)];
    return (e.fl[f.floor] = { room: yes && at ? at.ri : -1, id: null });
  }
  const weightOf = (e, f, c) => (typeof e.w === 'function' ? e.w(f, c) : e.w);
  // 후보 걸러내기: 태그 → 층 → 상황 → 최근에 나온 것
  function candidates(f, r, c0) {
    const c = { hurt: 0, party: [], lv: 1, ...c0 };
    const E = store(f), recent = f.recent || [], types = recent.slice(-TYPE_RECENT).map(k => BY[k]?.type);
    return LIST.filter(e => !e.tut && chainOk(f, e) && (e.chain && e.stage ? true : !e.tags.length || e.tags.some(t => r.tags.includes(t))) && f.floor >= (e.minFl || 2) && f.floor <= (e.maxFl || 1e9) && (!e.when || e.when(f, c)) && !recent.includes(e.id) && !(e.cool && E.last[e.id] != null && f.floor - E.last[e.id] < e.cool))
      .map(e => ({ e, w: weightOf(e, f, c) * (e.chain ? (e.stage ? CHAIN_K : START_K) : types.includes(e.type) ? TYPE_K : 1) }));
  }
  const Ev = {
    LIST, BY, NAMES, tagRooms, tagMap, rng, candidates, chainOf, pending, exits,
    // 지금 서 있는 방의 이름 (화면 위쪽)
    nameAt(rt, e) { const r = e && rt.map?.rooms?.find(q => q.tags && F().inRoom(q, e)); return r ? NAMES[r.tags[0]] : ''; },
    // 층을 세울 때 (G.Flow): 빈 방 중에서 사건 자리를 정한다. 파티는 그 방에 들른다 (빈 방은 원래 지나치지 않으면 안 들어간다)
    plan(f, rt, rooms, room) {
      tagRooms(f, rt);
      const tut = G.Tut.eventFor(f), E0 = store(f);
      if (tut && !E0.fl[f.floor]) { const near = rooms.slice().sort((a, b) => Math.hypot(a.cx - rt.hero.x, a.cy - rt.hero.y) - Math.hypot(b.cx - rt.hero.x, b.cy - rt.hero.y))[0]; E0.fl[f.floor] = { room: tut !== 'none' && near ? near.ri : -1, id: null, force: tut }; }
      const s = slot(f, rooms, room), r = rt.map.rooms[s.room];
      if (r && !s.done) r.evSlot = true;
    },
    // 이 방에 사건이 있나. 정해진 사건을 돌려주고 기록한다 (후보가 없으면 없는 대로)
    at(f, rt, r, c) {
      const s = store(f).fl[f.floor]; if (!s || s.done || s.room !== r.ri) return null;
      s.done = true;
      if (s.force && BY[s.force]) { s.id = s.force; return BY[s.force]; }
      const list = candidates(f, r, c); let n = rng(f, f.floor, 'pick', r.ri)() * list.reduce((a, q) => a + q.w, 0), got = null;
      for (const q of list) { got = q.e; if ((n -= q.w) <= 0) break; }
      if (!got) return null;
      s.id = got.id; store(f).last[got.id] = f.floor;
      if (got.scene) Ev.record(f, rt, got, { how: 'scene' }); // 기존 장면은 고른 시점만 남긴다
      return got;
    },
    // ── 판정 ──
    // 가장 잘하는 사람이 나선다 (전술적 사고 · 믿음직한 재주까지 G.Mission.roll이 본다)
    who: (rt, sk) => { const ms = rt.party.filter(p => p.merc && !p.dead && !p.dying), b = DN().best(ms.map(p => p.merc), sk); return ms.find(p => p.merc === b.m) || null; },
    // 가장 잘하는 사람과 2 이내면 누구든 나선다 (G.Mission.roll과 같다: 늘 같은 사람만 나서지 않게)
    pickWho(rt, sk, not) { const ms = rt.party.filter(p => p.merc && !p.dead && !p.dying && p !== not), v = p => DN().best([p.merc], sk).v; if (!ms.length) return Ev.who(rt, sk); const top = Math.max(...ms.map(v)); return U.pick(ms.filter(p => v(p) >= top - 2)); },
    hasX: (rt, k) => G.Pool.who(rt, k),
    check(f, rt, ch, by) {
      const who = by && !by.dead ? by : Ev.who(rt, ch.sk); if (!who) return null;
      const adv = ch.advX && Ev.hasX(rt, ch.advX);
      let c = G.Mission.roll(f, rt, ch.sk, 0, who, ch.dc);
      if (adv && !c.ok) { const c2 = G.Mission.roll(f, rt, ch.sk, 0, who, ch.dc); if (c2.nat > c.nat) c = c2; G.Pool.used(adv, ch.advX); }
      rt.roll = { id: (rt.roll ? rt.roll.id : 0) + 1, who: ST().nameOf(who), what: ch.what, nat: c.nat, ok: c.ok, need: c.dc - c.mod, calc: `${DN().SKILL_N?.[ch.sk] || ch.what} ${c.mod < 0 ? '−' : '+'}${Math.abs(c.mod)} · DC ${c.dc}`, word: c.ok ? '성공' : '실패', res: '' };
      return { who, ok: c.ok };
    },
    pct(rt, ch, by) { const who = by || Ev.who(rt, ch.sk); if (!who) return 0; const mod = DN().best([who.merc], ch.sk).v; let p = U.clamp((21 - (ch.dc - mod)) / 20, 0.05, 1); if (ch.advX && Ev.hasX(rt, ch.advX)) p = 1 - (1 - p) ** 2; return Math.round(p * 100); },
    // 안 고르면: 방침마다 감수하는 위험이 다르다. 판정은 성공률이 그 방침의 문턱을 넘어야 고르고, 맡김만 파티 성격이 크게 흔든다
    score(f, rt, o, pol, ch) {
      const P = POLICY[pol] || POLICY.party, crew = rt.party.filter(p => p.merc && !p.dead); let v = (o.leave ? P.leave : 0) + (o.base || 0);
      if (o.pol && o.pol.includes(pol)) v += P.fit;
      if (o.check) v += (Ev.pct(rt, ch || o.check) - P.pass) / 20;
      else if (!o.leave) v += P.risk;
      for (const p of crew) { for (const k in o.pers || {}) if ((p.merc.pers || []).includes(k)) v += o.pers[k] * P.pers; if (o.cls && o.cls.includes(p.merc.cls)) v += 0.25; }
      return v;
    },
    def(f, rt, opts, chs) {
      const pol = G.S.w.fantasy.policy || 'party'; let best = opts.length - 1, bv = -1e9;
      opts.forEach((o, i) => { const v = Ev.score(f, rt, o, pol, chs && chs[i]); if (v > bv) { bv = v; best = i; } });
      return best;
    },
    // 파티 사건의 주인공
    subject(f, rt, e) {
      const c = ST().living(rt), P = U.pick, S = e.subject, pr = k => c.filter(p => (p.merc.pers || []).includes(k));
      let a = S === 'stressed' ? c.slice().sort((p, q) => (q.merc.stress || 0) - (p.merc.stress || 0))[0] : S === 'greedy' ? P(pr('greedy')) : S === 'griever' ? c.find(p => p.merc.grief) : S === 'hurt' ? c.slice().sort((p, q) => p.hp / p.max - q.hp / q.max)[0] : S === 'pair' ? P(c) : null;
      if (!S) return null;
      a = a || P(c); const b = S === 'pair' ? P(c.filter(p => p !== a)) : null;
      return { a, b, n: a?.merc.grief?.n || '' };
    },
    // 방 태그에 따른 변형: 사건을 복제하지 않고 문장 · 판정 · 결과만 덧씌운다 (base0 = 원래 선택지)
    view(e, r) {
      const v = e.vary && r?.tags?.map(t => e.vary[t]).find(Boolean); if (!v) return e;
      return { ...e, ...v, choices: e.choices.map((o, i) => (v.choices?.[i] ? { ...o, ...v.choices[i], base0: o } : o)) };
    },
    // 사건 기록: 층 · 시각 · 직접/자동 · 고른 것 · 결과. 빈도 측정과 "왜 이걸 골랐나"의 추적에 쓴다
    record(f, rt, e, q) { const E = store(f); (E.log = E.log || []).push({ id: e.id, type: e.type, fl: f.floor, run: f.runs || 0, t: Math.round(G.Season.st(f).t || 0), ...q }); if (E.log.length > LOG_MAX) E.log.shift(); },
    // ── 연속 사건의 상태 ──
    has: (f, e, k) => !!chainOf(f, e.chain)?.flags[k],
    dcOf: (f, e, ch) => (e.chain && ch.dcIf && Ev.has(f, e, ch.dcIf[0]) ? ch.dcIf[1] : ch.dc),
    openOf(f, e) { for (const k in e.openIf || {}) if (Ev.has(f, e, k)) return e.openIf[k]; return e.open; },
    nameOfUid(f, uid) { const m = (f.mercs || []).find(q => q.uid === uid && !q.deadAt && !q.dead); return m ? m.name : '누군가'; },
    text(f, e, s, who) { if (!s) return s; const c = e.chain && chainOf(f, e.chain), X = Ev.cur; const J = { 가: ['이', '가'], 이: ['이', '가'], 와: ['과', '와'], 과: ['과', '와'], 를: ['을', '를'], 을: ['을', '를'] }, nm = k => (k === 'n' ? X?.n || '' : X?.[k] ? ST().nameOf(X[k]) : ''); return s.replace(/\{(a|b|n)\}(가|이|와|과|를|을)?/g, (_, k, j) => nm(k) + (j ? J[j][ST().jong(nm(k)) ? 0 : 1] : '')).replace('{saver}', c?.who.saver ? Ev.nameOfUid(f, c.who.saver) : '누군가').replace('{who0}', c?.who.first ? Ev.nameOfUid(f, c.who.first) : '우리').replace('{who}', who ? ST().ig(ST().nameOf(who)) : ''); },
    // 사건을 고르면 시작 · 결과가 나면 다음 단계로. hold면 그 단계에 남는다 (맞서서 이겨야 끝난다)
    advance(f, e, o, res, who) {
      if (!e.chain) return; const E = store(f), s = E.chains[e.chain] || (E.chains[e.chain] = { stage: 0, st: 'on', fl: f.floor, run: f.runs || 0, flags: {}, who: {} });
      if (res?.flag) s.flags[res.flag] = 1;
      if (who?.merc) { if (res?.saver) s.who.saver = who.merc.uid; if (res?.who || !s.who.first) s.who.first = who.merc.uid; }
      s.fl = f.floor; s.run = f.runs || 0; s.res = res?.end || s.res;
      if (res?.hold) return;
      if (res?.end || !LIST.some(q => q.chain === e.chain && q.stage === e.stage + 1)) { s.st = 'done'; return; }
      s.stage = e.stage + 1; s.wait = o?.wait || e.nextWait || null;
    },
    // 의식의 주인을 쓰러뜨렸다 (G.Story.chiefDown)
    chainWon(f, rt, o) {
      const e = BY[o.chain]; if (!e) return; const s = chainOf(f, e.chain); if (!s || s.st === 'done') return;
      s.st = 'done'; s.res = 'won';
      Ev.run(f, rt, e.won, o, e); ST().dmSay(rt, Ev.text(f, e, e.won.dm)); ST().add(f, `${f.floor}층 · ${Ev.text(f, e, e.won.log)}`);
      if (e.won.ifSaved && s.flags.saved) { Ev.run(f, rt, e.won.ifSaved, o, e); ST().dmSay(rt, Ev.text(f, e, e.won.ifSaved.dm)); }
    },
    // ── 결과 ──
    ops: {
      pitted(f, rt, q) { const p = q && !q.dead ? q : U.pick(ST().living(rt)); if (p) G.Banter.say(rt, p, '누가 바닥 좀 먼저 봐 주지.', { pri: true }); },
      stressA(f, rt, q, n) { if (Ev.cur?.a) ST().stress(f, rt, Ev.cur.a, n); },
      bondAB(f, rt, q, n) { const X = Ev.cur; if (X?.a && X.b) { G.Bond.add(f, rt, X.a.merc, X.b.merc, n); Ev.bondFx(rt, X.a, n); Ev.bondFx(rt, X.b, n); } },
      bondWho(f, rt, q, n) { const a = Ev.cur?.a; if (a && q?.merc && q !== a) { G.Bond.add(f, rt, q.merc, a.merc, n); Ev.bondFx(rt, q, n); Ev.bondFx(rt, a, n); } },
      healA(f, rt, q, k) { const a = Ev.cur?.a; if (a) a.hp = Math.min(a.max, a.hp + a.max * k); },
      griefEnd() { const a = Ev.cur?.a; if (a?.merc.grief) a.merc.grief = null; },
      rush(f, rt) { rt.rush = true; },
      // SRD 함정: 낚는 그물은 한 사람 (민첩 실패 시 운동으로 풀어야 하고, 못 풀면 소리가 난다)
      net(f, rt, q) { const p = q && !q.dead ? q : U.pick(ST().living(rt)); if (!p) return; const dc = NET_DC[tier(p.merc.lv)]; if (DN().save(p, 'dex', dc)) return; const c = G.Mission.roll(f, rt, 'athletics', 0, Ev.who(rt, 'athletics'), dc); if (!c?.ok) { ST().stress(f, rt, p, 5); ST().pack(f, rt, null, 2); rt.nextFirst = 'foes'; } },
      needle(f, rt, q) { const p = q && !q.dead ? q : U.pick(ST().living(rt)); if (!p) return; const t = tier(p.merc.lv), n = DN().dice(NEEDLE.d[t], 10), ok = DN().save(p, 'con', NEEDLE.dc[t]); Ev.hit(f, rt, p, ok ? Math.floor(n / 2) : n); if (!ok && !p.dead && !p.dying) DN().give(rt, p, 'poisoned', 10); },
      statue(f, rt) { for (const p of ST().living(rt)) { const t = tier(p.merc.lv), n = DN().dice(STATUE[t], 10), ok = DN().save(p, 'dex', 15); Ev.hit(f, rt, p, ok ? Math.floor(n / 2) : n); } },
      stone(f, rt) { for (const p of ST().living(rt)) if (!DN().save(p, 'dex', 15)) Ev.hit(f, rt, p, DN().dice(10, 10)); },
      pay(f, rt, q, k) { const c = Math.min(G.Exp.carry(f), G.Exp.carry(f) * k); f.carry -= c; },
      legend(f, rt, q, n) { ST().legend(f, n); },
      // 앞선 선택이 우두머리를 정한다: 의식을 끊었으면 약하고, 지나쳤으면 강하다
      ritualBoss(f, rt) { const s = chainOf(f, 'ritual'), key = s.flags.broken ? 'broken' : s.flags.ignored ? 'ignored' : 'def', o = ST().chief(f, rt, null, '의식의 주인', null, BOSS_K[key]); o.chain = 'rit_end'; o.noFlee = true; o.atk *= BOSS_ATK[key]; if (BOSS_BAND[key]) ST().pack(f, rt, null, BOSS_BAND[key]); if (s.flags.prepared) { rt.nextFirst = 'party'; f.bless = Math.max(f.bless || 0, 3); } },
      gold(f, rt, q, k) { const g = F().monGold(f.floor) * k * F().goldMult(f); F().gain(f, g); if (rt.roll) rt.roll.res = `+${U.fmt(g)}`; },
      relic(f, rt, q) { const at = q || rt.hero; G.Trinket.drop(f, rt, 'chest', at.x, at.y); },
      stress(f, rt, q, n) { for (const p of ST().living(rt)) ST().stress(f, rt, p, n); },
      heat(f, rt, q, n) { f.heat = Math.min(ST().dmOf(f).max, (f.heat || 0) + n); },
      rest(f, rt) { for (const p of ST().living(rt)) { p.hp = Math.min(p.max, p.hp + p.max * ST().REST_HP); ST().stress(f, rt, p, -ST().REST_RELIEF); } },
      scout(f, rt) { for (const r of rt.map.rooms) if (r.ambush) { r.ambush = false; G.Sight.revealRoom(rt, r); } const r = rt.map.rooms.find(q => !q.ent && !rt.seen[q.cy * rt.map.w + q.cx]); if (r) G.Sight.revealRoom(rt, r); },
      // 한 사람: 숨은 구덩이 표. 천장 · 독침은 전원 민첩 내성 (SRD)
      one(f, rt, q, tb, s) { const p = q && !q.dead ? q : U.pick(ST().living(rt)); if (p) Ev.hit(f, rt, p, DN().dice(FALL[tier(p.merc.lv)], s)); },
      roof(f, rt) { for (const p of ST().living(rt)) { const t = tier(p.merc.lv), n = DN().dice(ROOF.d[t], 10), ok = DN().save(p, 'dex', ROOF.dc[t]); Ev.hit(f, rt, p, ok ? Math.floor(n / 2) : n); } },
      darts(f, rt) { for (const p of ST().living(rt)) { const t = tier(p.merc.lv); if (!DN().save(p, 'dex', 13)) { let n = 0; const k = 1 + U.rand(3); for (let i = 0; i < k; i++) n += DN().dice(DART[t], 6); Ev.hit(f, rt, p, n); } } },
      // 적: fight는 먼저 알아챘다 (우리 먼저), ambush는 당했다 (적 먼저)
      fight(f, rt, q, n) { ST().pack(f, rt, null, n); rt.nextFirst = 'party'; },
      ambush(f, rt, q, n) { ST().pack(f, rt, null, n); rt.nextFirst = 'foes'; },
    },
    bondFx(rt, p, n) { G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.2, s: `정 ${n > 0 ? '+' : '−'}${Math.abs(n)}`, col: n > 0 ? '#f2a0b8' : '#9aa0a8', t: 1.2, sz: 0.8 }); },
    hit(f, rt, p, srd) { F().hurtMember(f, rt, p, srd * p.max / Math.max(1, DN().srdHP(p.merc)), null); },
    run(f, rt, res, who, e) { for (const [k, ...a] of res?.ops || []) { Ev.ops[k](f, rt, who, ...a); if (rt.phase === 'dead') return; } },
    // 결과 고르기: 변신 괴물처럼 진짜 · 가짜로 갈리는 사건
    outcome(o, ok, fake) { const b = ok ? o.win : o.lose ?? o.win; return b && (b.fake || b.real) ? (fake ? b.fake : b.real) : b; },
    fakeOf(f, e, r) { return !!e.fake && rng(f, f.floor, 'id', r.ri)() < e.fake; },
  };
  return Ev;
})();
