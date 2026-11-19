'use strict';
// 판정 굴림 연출 (화면 쪽): 탐사의 능력 판정을 기록 한 줄로만 넘기지 않고 한 장면으로 보여 준다.
// CHECKUI.show({ who, skill, dc, r: d20 눈, g: 인도 d4(없으면 0), bonus, tot, ok, text: 결과 글 }, done)
// 차례: 난이도가 뜬다 → d20이 구른다 → 눈이 멈춘다 → 보정이 하나씩 붙어 합계가 된다 → 성공 / 실패 → 누르면 닫힌다 (구르는 동안 누르면 건너뛴다)
// 굴림은 이미 끝난 것(탐사 규칙 RUN.check)을 받아 보여 주기만 한다.
const CHECKUI = (() => {
  const { $, esc } = UI;
  const D20 = '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon class="d-out" points="50,3 91,26 91,74 50,97 9,74 9,26"/><polygon class="d-in" points="50,22 76,66 24,66"/><path class="d-ln" d="M50,3 50,22 M91,26 76,66 M9,26 24,66 M50,97 76,66 M50,97 24,66 M9,74 24,66 M91,74 76,66 M9,26 50,22 M91,26 50,22"/></svg>';
  function show(o, done) {
    const box = document.createElement('div'); box.id = 'checkroll'; box.onpointerup = ev => ev.stopPropagation();
    const mods = [[o.bonus, o.skill], ...(o.g ? [[o.g, '인도 d4']] : [])].filter(m => m[0]);
    box.innerHTML = `<div class="ck-in"><div class="ck-hd"><b>${esc(o.skill)} 판정</b><small>${esc(o.who || '')}</small></div>` +
      `<div class="ck-dc"><small>난이도</small><b>${o.dc}</b></div>` +
      `<div class="ck-die roll">${D20}<b class="ck-n">?</b></div>` +
      `<div class="ck-mods">${mods.map(([v, n]) => `<span><b>${v > 0 ? '+' : '−'}${Math.abs(v)}</b> ${esc(n)}</span>`).join('')}</div>` +
      `<div class="ck-tot"></div><div class="ck-res"></div><p class="ck-txt"></p><button class="ck-go">계속</button></div>`;
    $('stage').append(box);
    const die = box.querySelector('.ck-die'), num = box.querySelector('.ck-n'), tot = box.querySelector('.ck-tot'), res = box.querySelector('.ck-res'), chips = [...box.querySelectorAll('.ck-mods span')];
    let step = 0, timer = 0, spin = setInterval(() => { num.textContent = 1 + Math.floor(Math.random() * 20); }, 60), closed = false;
    const steps = [
      [1100, () => { clearInterval(spin); num.textContent = o.r; die.classList.remove('roll'); die.classList.add('land', o.r === 20 ? 'crit' : o.r === 1 ? 'fumble' : 'n'); tot.textContent = o.r; tot.classList.add('on'); }],
      ...chips.map((c, i) => [420, () => { c.classList.add('on'); tot.textContent = o.r + mods.slice(0, i + 1).reduce((a, m) => a + m[0], 0); tot.classList.remove('bump'); void tot.offsetWidth; tot.classList.add('bump'); }]),
      [520, () => { box.classList.add('done', o.ok ? 'ok' : 'no'); tot.textContent = o.tot; res.textContent = o.ok ? '성공' : '실패'; box.querySelector('.ck-txt').textContent = o.text || ''; }],
    ];
    const next = () => { if (step >= steps.length) return; const [ms, fn] = steps[step]; timer = setTimeout(() => { fn(); step++; next(); }, ms); };
    const skip = () => { clearTimeout(timer); while (step < steps.length) steps[step++][1](); };
    const close = () => { if (closed) return; closed = true; clearInterval(spin); clearTimeout(timer); box.remove(); done(); };
    box.onclick = () => { if (step < steps.length) skip(); else close(); };
    next();
  }
  return { show, get active() { return !!$('checkroll'); } };
})();
