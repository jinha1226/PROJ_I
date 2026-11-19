'use strict';
// 전투 결과 · 고르기 · 기록 화면 (화면 쪽, 설계 5-12). 규칙은 js/game/reward.js — 여기는 창과 카드뿐.
// REWARDUI.show(res, then): 전투 결과(금화 · 경험치 · 전리품) → 레벨업 고르기(남은 만큼) → 정예 · 보스 3택1 → then()
// REWARDUI.record(sum, then): 판 끝 기록(소문 · 새로 열린 것) → 「다시 들어간다」
const REWARDUI = (() => {
  const { $, esc } = UI;
  let queue = [], then = null, res = null;
  const KIND = { spell: '주문', swap: '바꿀 주문', ability: '능력치', art: '마법 물건', rule: '규칙 카드', carve: '면 새기기' };
  const skN = k => G.D.MSKILLS[k]?.n || k, clsN = m => G.Guild.def(m)?.n || m.cls;
  function open() { let box = $('reward'); if (!box) { box = document.createElement('div'); box.id = 'reward'; box.onpointerup = ev => ev.stopPropagation(); $('stage').append(box); } return box; }
  function close() { const b = $('reward'); if (b) b.remove(); }
  // res = { title, gold, xp: [{ p, lv0, lv, xp, need }], loot: [{ name, n }], big: [옵션] | null, type, f }
  function show(r, cb) {
    res = r; then = cb; queue = [{ k: 'sum' }];
    for (const x of r.xp) for (let i = 0; i < G.Reward.pending(x.p.merc); i++) queue.push({ k: 'lv', p: x.p });
    if (r.big?.length) queue.push({ k: 'big' });
    step();
  }
  function step() {
    while (queue.length && queue[0].k === 'lv' && !G.Reward.pending(queue[0].p.merc)) queue.shift(); // 이미 다 골랐으면 건너뛴다
    const q = queue.shift();
    if (!q) { close(); const cb = then; then = null; if (cb) cb(); return; }
    const box = open();
    if (q.k === 'sum') {
      box.innerHTML = `<h3>${esc(res.title)}</h3>` +
        `<div class="rw-line"><b>금화</b> +${res.gold}</div>` +
        `<div class="rw-xp">${res.xp.map(x => `<div><b>${esc(x.p.merc.name)}</b> ${x.lv > x.lv0 ? `<em>레벨업! ${x.lv0} → ${x.lv}</em>` : `${x.lv}레벨`}<i style="width:${Math.round(100 * Math.min(1, x.xp / x.need))}%"></i></div>`).join('')}</div>` +
        `<div class="rw-line"><b>전리품</b> ${res.loot.length ? res.loot.map(l => `${esc(l.name)} ${l.n}`).join(' · ') : '없다'}</div>` +
        `<button class="rw-go">계속</button>`;
      box.querySelector('.rw-go').onclick = step; return;
    }
    if (q.k === 'lv') {
      const m = q.p.merc, o = G.Reward.offer(m);
      if (o.kind === 'swap') return swap(box, m, o);
      box.innerHTML = `<h3>${esc(m.name)} — ${m.lv}레벨</h3><p>${o.kind === 'spell' ? '새 주문 하나를 배운다' : '능력치 하나를 올린다'}</p>` +
        `<div class="rw-cards">${o.options.map((c, i) => `<button data-i="${i}"><small>${KIND[c.kind]}${c.lv ? ` · ${c.lv}레벨` : c.kind === 'spell' ? ' · 소마법' : ''}</small><b>${esc(c.n)}</b><span>${esc(c.d || '')}</span></button>`).join('')}</div>`;
      box.querySelector('.rw-cards').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; G.Reward.choose(m, o.options[+b.dataset.i]); step(); };
      return;
    }
    if (q.k === 'big') {
      box.innerHTML = `<h3>${res.type === 'boss' ? '보스' : '정예'}의 보상</h3><p>하나를 고른다</p>` +
        `<div class="rw-cards">${res.big.map((c, i) => `<button data-i="${i}" class="k-${c.kind}"><small>${KIND[c.kind]}</small><b>${c.ic ? `${c.ic} ` : ''}${esc(c.n)}</b><span>${esc(c.d || '')}</span></button>`).join('')}</div>`;
      box.querySelector('.rw-cards').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; const opt = res.big[+b.dataset.i]; G.Reward.takeBig(res.f, opt); step(); };
    }
  }
  // 5칸이 다 찬 채 레벨업: 새 주문 셋 중 하나를 골라 지금 기술 하나와 바꾸거나, 그대로 둔다
  function swap(box, m, o) {
    if (!o.options.length) { G.Reward.choose(m, 'keep'); return step(); }
    box.innerHTML = `<h3>${esc(m.name)} — ${m.lv}레벨</h3><p>손에 든 기술은 다섯 — 새 주문으로 하나를 바꿀 수 있다</p>` +
      `<div class="rw-cards">${o.options.map((c, i) => `<button data-i="${i}"><small>${KIND.swap}${c.lv ? ` · ${c.lv}레벨` : ' · 소마법'}</small><b>${esc(c.n)}</b><span>${esc(c.d || '')}</span></button>`).join('')}</div>` +
      `<button class="rw-go rw-keep">지금 기술 그대로 둔다</button>`;
    box.querySelector('.rw-keep').onclick = () => { G.Reward.choose(m, 'keep'); step(); };
    box.querySelector('.rw-cards').onclick = ev => {
      const b = ev.target.closest('button'); if (!b) return; const pickd = o.options[+b.dataset.i];
      box.innerHTML = `<h3>무엇과 바꿀까</h3><p>${esc(pickd.n)}을(를) 들고, 하나를 내려놓는다</p><div class="rw-cards">${m.skills.map(k => `<button data-k="${esc(k)}"><small>내려놓기</small><b>${esc(skN(k))}</b></button>`).join('')}</div><button class="rw-go rw-keep">바꾸지 않는다</button>`;
      box.querySelector('.rw-keep').onclick = () => { G.Reward.choose(m, 'keep'); step(); };
      box.querySelector('.rw-cards').onclick = ev2 => { const d = ev2.target.closest('button'); if (!d) return; G.Reward.choose(m, pickd, d.dataset.k); step(); };
    };
  }
  // 판 끝: sum = { win, rooms, fights, elites, boss, lv, gold, gain, total, fresh: [새로 열린 것 이름] }
  function record(sum, cb) {
    const box = open(); box.classList.add('rw-record');
    box.innerHTML = `<h3>${sum.win ? `${sum.floor}층을 넘었다` : `${sum.floor}층에서 쓰러졌다`}</h3>` +
      `<div class="rw-stats"><div><b>${sum.rooms}</b>간 방</div><div><b>${sum.fights}</b>이긴 전투</div><div><b>${sum.lv}</b>레벨</div><div><b>${sum.gold}</b>금화</div></div>` +
      `<div class="rw-line"><b>소문</b> +${sum.gain} (합계 ${sum.total})</div>` +
      (sum.lured?.length ? `<div class="rw-line rw-new"><b>새 직업</b> ${sum.lured.map(esc).join(' · ')}</div>` : '') +
      (sum.seat ? `<div class="rw-line rw-new"><b>파티 자리 +1</b></div>` : '') +
      (sum.fresh.length ? `<div class="rw-line rw-new"><b>해금</b> ${sum.fresh.map(esc).join(' · ')}</div>` : '') +
      `<button class="rw-go">선술집으로</button>`;
    box.querySelector('.rw-go').onclick = () => { close(); cb(); };
  }
  return { show, record, get active() { return !!$('reward'); } };
})();
