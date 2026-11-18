'use strict';
// 사건 줄 (화면 없이): 규칙 쪽(js/game)이 일어난 일을 넣고, 화면 쪽(js/app)이 매 틱 꺼내 그린다 — 고돗의 시그널 자리.
// 사건 모양: { k: 'noise' | 'aware' | 'ignite' | 'burn' | 'caltrops' | 'dodge' | 'try' | 'open' …, … }
G.Feed = (() => {
  let q = [];
  return {
    push(...evs) { for (const e of evs.flat()) if (e) q.push(e); },
    take() { const out = q; q = []; return out; },
    clear() { q = []; },
  };
})();
