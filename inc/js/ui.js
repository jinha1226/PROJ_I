'use strict';
// 화면 뼈대: DOM 도우미, 상단 자원 막대, 왼쪽 차원 막대(아이콘), 토스트, 모달
const h = G.h = function (tag, attrs, ...kids) {
  const [t, ...cls] = tag.split('.');
  const el = document.createElement(t || 'div');
  if (cls.length) el.className = cls.join(' ');
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null) continue;
    if (k === 'on') for (const ev in v) el.addEventListener(ev, v[ev]);
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('data-') || k === 'title' || k === 'role' || k.startsWith('aria-')) el.setAttribute(k, v);
    else el[k] = v;
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};
// 값이 바뀔 때만 DOM을 건드린다
const setText = G.setText = (el, s) => { s = String(s); if (el.textContent !== s) el.textContent = s; };
const setW = G.setW = (el, frac) => { const v = (G.U.clamp(frac, 0, 1) * 100).toFixed(1) + '%'; if (el.style.width !== v) el.style.width = v; };
const tog = G.tog = (el, cls, on) => { if (el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on); };
const bar = G.bar = (cls = '') => { const fill = h('i'); const el = h('div.bar' + (cls ? '.' + cls : ''), null, fill); el.fill = fill; return el; };

G.UI = {
  cur: 'fantasy', views: {},
  init() {
    const app = document.getElementById('app');
    this.res = h('div.res');
    this.nav = h('nav.rail');
    this.main = h('main.main');
    app.append(
      h('header.top', null,
        h('div.brand', null, h('b', null, '차원 균열'), h('small', null, 'INFINITE RIFT')),
        this.res,
        h('button.icon-btn', { title: '설정', on: { click: () => this.settings() } }, '⚙')),
      h('div.shell', null, this.nav, this.main));
    this.buildRes();
    this.buildNav();
    G.on('log', e => this.addLog(e));
    G.on('signs', e => { if (e.world !== 'cthulhu' || e.n > 1) this.toast([G.T.el('ui_sign', 'li'), ` 고대 인장 +${e.n}`], 'sign'); });
    this.show(this.cur);
  },
  buildRes() {
    const item = (tile, label, title) => {
      const v = h('b');
      this.res.append(h('div.res-item', { title }, G.T.el(tile, 'ri'), v));
      return v;
    };
    this.rEss = item('ui_ess', '정수', '차원 정수: 모든 세계에서 모이며 넥서스에서 쓴다');
    this.rSign = item('ui_sign', '인장', '고대 인장: 유물 제단에서 유물을 소환한다');
    this.rStar = item('ui_star', '별', '별의 파편: 차원 붕괴로 얻는다. 개당 모든 생산 +10%');
  },
  // 차원 막대: 세계마다 차원문 아이콘 하나. 이름·상태는 올려 두면 뜬다. 살 것이 있으면 초록 점, 붕괴 준비되면 빛난다.
  // 이유: 목록·부제 글자가 붙은 대시보드 대신, 세계를 오가는 버튼만 남겨 맵이 화면을 차지하게 (Idleon 캐릭터 막대 같은 아이콘 줄)
  buildNav() {
    this.navItems = {};
    const add = (id, tile, name) => {
      const st = h('small');
      const el = h('button.rail-item', { 'data-id': id, 'aria-label': name, on: { click: () => this.show(id) } },
        G.T.el(tile, 'ri-ic'), h('i.rdot'), h('span.rtip', null, h('b', null, name), st));
      this.nav.append(el);
      this.navItems[id] = { el, st };
    };
    for (const w of G.D.WORLDS) add(w.id, 'w_' + w.id, w.name);
    this.nav.append(h('div.rail-sep'));
    add('nexus', 'ui_nexus', '차원 넥서스');
    add('altar', 'ui_altar', '유물 제단');
    add('prestige', 'ui_prestige', '차원 붕괴');
  },
  show(id) {
    if (this.view && this.view.unmount) this.view.unmount();
    this.cur = id;
    const S = G.S;
    const isWorld = !!G.D.WORLD[id];
    const locked = isWorld && !S.unlocked[id];
    document.body.dataset.theme = isWorld ? id : 'nexus';
    this.main.innerHTML = '';
    this.main.scrollTop = 0;
    const v = locked ? G.V.locked(id) : this.views[id]();
    this.view = v;
    this.main.append(v.el);
    for (const k in this.navItems) tog(this.navItems[k].el, 'on', k === id);
    v.update && v.update();
  },
  update() {
    const S = G.S;
    setText(this.rEss, G.U.fmt(S.ess));
    setText(this.rSign, G.U.fmt(S.signs));
    setText(this.rStar, G.U.fmt(S.stars));
    for (const w of G.D.WORLDS) {
      const it = this.navItems[w.id];
      const lock = !S.unlocked[w.id];
      tog(it.el, 'locked', lock);
      setText(it.st, lock ? `🔒 ${G.U.fmt(G.Tree.cost('nexus', S.ntree, 'open_' + w.id))}` : G.MODS[w.id].status(S.w[w.id]));
      const c = !lock && G.Tree.cheapest(w.id, S.w[w.id].tree);
      tog(it.el, 'dot', !!(c && G.Tree.wallet[w.id].get() >= c.cost));
    }
    const nc = G.Tree.cheapest('nexus', S.ntree);
    tog(this.navItems.nexus.el, 'dot', !!(nc && S.ess >= nc.cost));
    setText(this.navItems.altar.st, `소환 ×${Math.floor(S.signs / G.D.SUMMON_COST)}`);
    const pc = G.Prestige.WORLD_CONDS ? G.Prestige.conds() : null;
    setText(this.navItems.prestige.st, G.Prestige.can() ? `★ +${G.Prestige.gain()}` : pc ? `조건 ${pc.filter(c => c.ok).length} / ${pc.length}` : `${G.U.fmt(S.runEss)} / ${G.U.fmt(G.D.PRESTIGE_MIN)}`);
    tog(this.navItems.prestige.el, 'ready', G.Prestige.can());
    if (this.view && this.view.update) this.view.update();
  },
  frame(t) { if (this.view && this.view.frame) this.view.frame(t); },

  // 기록 목록은 없앴다. 큰 소식만 오른쪽 아래 알림으로
  addLog(e) {
    const tile = e.world && G.D.WORLD[e.world] ? 'w_' + e.world : 'ui_nexus';
    if (e.cls === 'good' && (e.world === 'nexus' || /돌파|천겁을|토벌|격추|당첨|강호/.test(e.msg))) this.toast([G.T.el(tile, 'li'), ' ', e.msg], 'good');
  },
  toast(msg, cls = '') {
    const box = document.getElementById('toasts');
    const t = h('div.toast' + (cls ? '.' + cls : ''), null, Array.isArray(msg) ? msg : [msg]);
    box.append(t);
    while (box.childNodes.length > 4) box.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  },
  modal(title, body, buttons = [{ label: '확인' }]) {
    const wrap = document.getElementById('modal'), box = document.getElementById('modalbox');
    box.innerHTML = '';
    const close = () => wrap.classList.add('hidden');
    box.append(h('h2', null, title), typeof body === 'string' ? h('div.mbody', { html: body }) : body,
      h('div.mbtns', null, buttons.map(b => h('button.btn' + (b.cls ? '.' + b.cls : ''), { on: { click: () => { if (b.fn && b.fn() === false) return; close(); } } }, b.label))));
    wrap.classList.remove('hidden');
  },
  settings() {
    const ta = h('textarea.save-box', { rows: 4, placeholder: '여기에 저장 코드를 붙여 넣고 [불러오기]' });
    this.modal('설정', h('div', null,
      h('p', null, `플레이 시간 ${G.U.fmtTime(G.S.playTime)} · 차원 붕괴 ${G.S.prestiges}회 · 누적 정수 ${G.U.fmt(G.S.totalEss)}`),
      h('div.opt-row', null,
        this.toggle('효과음', () => G.OPT.sfx, v => { G.OPT.sfx = v; G.saveOpt(); }).el,
        h('input.vol', { type: 'range', min: 0, max: 1, step: 0.05, value: G.OPT.vol, title: '음량',
          on: { input: e => G.SFX.setVol(+e.target.value), change: () => { G.saveOpt(); G.SFX.play('coin'); } } }),
        this.toggle('화면 흔들림', () => G.OPT.shake, v => { G.OPT.shake = v; G.saveOpt(); }).el),
      ta,
      h('div.row-btns', null,
        h('button.btn', { on: { click: () => { G.save(); this.toast('저장했다'); } } }, '지금 저장'),
        h('button.btn', { on: { click: () => { ta.value = G.exportSave(); ta.select(); } } }, '내보내기'),
        h('button.btn', { on: { click: () => { try { G.importSave(ta.value); G.save(); this.show(this.cur); this.toast('불러왔다'); } catch (e) { this.toast('저장 코드가 올바르지 않다', 'bad'); } } } }, '불러오기'),
        h('button.btn.danger', { on: { click: () => { if (confirm('모든 진행을 지울까요? 되돌릴 수 없습니다.')) { G.hardReset(); G.save(); this.show('fantasy'); } } } }, '초기화'))),
    [{ label: '닫기' }]);
  },

  // 켜기/끄기 버튼
  toggle(label, get, set, title) {
    const el = h('button.tgl', { title, on: { click: () => { set(!get()); update(); } } }, label);
    const update = () => tog(el, 'on', get());
    update();
    return { el, update };
  },
};

G.V = {
  // 잠긴 세계 미리보기
  locked(id) {
    const w = G.D.WORLD[id];
    const btn = h('button.btn.big', { on: { click: () => { if (G.Tree.buy('nexus', G.S.ntree, 'open_' + id)) { G.SFX.play('unlock'); G.UI.show(id); } } } });
    const el = h('section.locked-view', null,
      h('div.lk-card', null,
        G.T.el('w_' + id, 'lk-icon'),
        h('div.tag', null, `${w.genre} · ${w.style}`),
        h('h1', null, w.name),
        btn));
    return {
      el,
      update() {
        const c = G.Tree.cost('nexus', G.S.ntree, 'open_' + id);
        btn.innerHTML = '';
        btn.append(G.T.el('ui_ess', 'xs'), ` ${G.U.fmt(c)} · 열기`);
        btn.disabled = G.S.ess < c;
      },
    };
  },
  // 세계 화면 공통 머리말
  head(id, extra) {
    const w = G.D.WORLD[id];
    return h('div.whead', null,
      h('div.wtitle', null, G.T.el('w_' + id, 'wh-icon'), h('div', null, h('div.tag', null, `${w.genre} · ${w.style}`), h('h1', null, w.name))),
      extra || null);
  },
};
