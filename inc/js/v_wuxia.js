'use strict';
// 무협 화면: 마을 지도 + 옆 패널(삶·나이, 지금 하는 일, 직업·무공 목록). 지도의 장소를 눌러도 직업·수련을 바꾼다.
G.UI.views.wuxia = function () {
  const w = () => G.S.w.wuxia, W = G.Wuxia, D = G.D.WX, U = G.U;

  const hudMode = h('b'), hudAge = h('small');
  const hud = h('div', null, hudMode, hudAge, h('small.dim', null, '장소를 누르면 그곳의 직업·무공으로 · 산적을 누르면 공격'));

  const lifeEl = h('b'), age = G.UI.meter('나이 / 천수'), goldEl = h('b'), incEl = h('small'), insEl = h('b');
  const jobM = G.UI.meter('직업'), skillM = G.UI.meter('수련');
  const tPromote = G.UI.toggle('자동 승진', () => w().autoPromote, v => { w().autoPromote = v; });
  const tSkill = G.UI.toggle('자동 수련', () => w().autoSkill, v => { w().autoSkill = v; }, '다음 직업에 필요한 무공을 알아서 고른다');
  const tRebirth = h('p.dim.note');

  const mk = (defs, isJob) => defs.map(d => {
    const lv = h('span.lv'), xb = bar('xp'), sub = h('small');
    const el = h('button.lrow', { on: { click: () => (isJob ? W.setJob(w(), d.id) : W.setSkill(w(), d.id)) } },
      G.T.el((isJob ? 'j_' : 's_') + d.id, 'sm'), h('span.lm', null, h('span.ln', null, h('b', null, d.n), lv), xb, sub));
    return { d, el, lv, xb, sub, isJob };
  });
  const jobs = mk(D.jobs, true), skills = mk(D.skills, false);
  const itemsEl = h('div.items');

  const side = h('div', null,
    h('div.card', null,
      h('div.card-h', null, h('b', null, '삶 '), lifeEl, h('span.sp'), G.T.el('ui_star', 'cur'), insEl, h('small', null, ' 깨달음')),
      age.el, h('div.card-h', null, G.T.el('c_coin', 'cur'), goldEl, incEl), itemsEl, tRebirth),
    h('div.card', null, jobM.el, skillM.el, h('div.tgls', null, tPromote.el, tSkill.el)),
    h('div.card', null, h('div.card-h', null, h('b', null, '강호 경력')), jobs.map(x => x.el)),
    h('div.card', null, h('div.card-h', null, h('b', null, '무공')), skills.map(x => x.el)));

  const req = d => !d.req ? '' : Object.entries(d.req).filter(([id, lv]) => W.L(w(), id) < lv).map(([id, lv]) => `${(W.jobDef(id) || W.skillDef(id)).n} ${lv}`).join(', ');
  return G.UI.worldScreen('wuxia', {
    side, hud,
    update() {
      const s = w(), life = W.lifespan(s), jd = W.jobDef(s.job), sd = W.skillDef(s.skill);
      setText(hudMode, s.dead ? '천수를 다했다…' : s.mode === 'work' ? `${D.places[jd.at]}에서 일하는 중` : `${D.places[sd.at]}에서 수련 중`);
      setText(hudAge, ` · ${Math.floor(s.age)}세`);
      setText(lifeEl, `${s.lives + 1}번째`);
      age.set((s.age - W.startAge()) / (life - W.startAge()), `${Math.floor(s.age)} / ${Math.floor(life)}세`);
      tog(age.bar, 'late', s.age > life - 8);
      setText(goldEl, U.fmt(s.gold));
      setText(incEl, ` 은자 · +${U.fmt(W.income(s))}/초`);
      setText(insEl, U.fmt(s.ins));
      setText(tRebirth, s.lives ? `회귀 ${s.lives}회 · 전생 최고 레벨 10마다 그 항목 숙련 +${Math.round(100 * (1 + G.Tree.add('wuxia', s.tree, 'peak')))}%` : '천수가 다하면 회귀한다. 이번 생에 쌓은 것이 깨달음이 되어 스킬트리에 남는다.');
      const itemKey = Object.keys(s.items).join();
      if (itemsEl._k !== itemKey) {
        itemsEl._k = itemKey; itemsEl.innerHTML = '';
        for (const it of D.items) itemsEl.append(h('span.item' + (s.items[it.id] ? '.on' : ''), { title: `${it.n}: ${it.d} (은자 ${U.fmt(it.cost)}, 모이면 자동 구입)` }, G.T.el('it_' + it.id, 'sm')));
      }
      jobM.set((s.xp[s.job] || 0) / W.need(W.L(s, s.job), true), `${jd.n} Lv ${W.L(s, s.job)}`);
      skillM.set((s.xp[s.skill] || 0) / W.need(W.L(s, s.skill), false), `${sd.n} Lv ${W.L(s, s.skill)}`);
      tPromote.update(); tSkill.update();
      for (const x of [...jobs, ...skills]) {
        const d = x.d, lv = W.L(s, d.id), ok = W.reqMet(s, d), on = x.isJob ? s.job === d.id : s.skill === d.id, pk = s.peak[d.id] || 0;
        tog(x.el, 'on', on);
        tog(x.el, 'locked', !ok);
        x.el.disabled = !ok;
        setText(x.lv, ` Lv ${lv}` + (pk ? ` (전생 ${pk})` : ''));
        setW(x.xb.fill, (s.xp[d.id] || 0) / W.need(lv, x.isJob));
        setText(x.sub, !ok ? (d.unlock && !G.Tree.add('wuxia', s.tree, d.unlock) ? '스킬트리에서 비급을 얻어야 한다' : `조건: ${req(d)}`)
          : `${D.places[d.at]} · ` + (x.isJob ? `은자 ${U.fmt(d.inc * (1 + 0.1 * lv))}/초` : d.d));
      }
    },
  });
};
