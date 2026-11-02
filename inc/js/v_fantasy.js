'use strict';
// 판타지 화면: 맵이 화면을 채우고, 중요한 정보는 아래 가운데 독 하나에 모은다 (디아블로·마인크래프트 — DESIGN.md 34)
//  독 윗줄: 층 · 다음 보스 · 이 층 진행 · 금고 · 정수 · 지금 명령
//  독 본체: 왼쪽 구슬(원정대 체력) · 초상(단장 + 출전, 아래에 스킬 넷의 쿨타임) · 단장 기술 · 명령(Z X C V) · 오른쪽 구슬(짐)
//  왼쪽 위: 대화 기록 / 오른쪽 위: 미니맵(캔버스) 아래 라이벌 한 줄 / 오른쪽 가운데: 경고 / 사람을 누르면 상태창(v_sheet)
//  원정 사이에는 마을 화면(v_town)이 맵 자리를 채운다. 글은 이름표와 숫자만 (설명은 올렸을 때 한 구절)
G.UI.views.fantasy = function () {
  const f = () => G.S.w.fantasy, F = G.Fantasy, U = G.U, EX = G.Exp, GD = G.Guild;
  const RS = G.Rivals.STANCES, ORDER = Object.keys(RS), CHAT_N = 6;
  const sheet = G.UI.sheet = G.UI.charSheet();

  // ════════ 아래 가운데 독 ════════
  // 윗줄
  const floorEl = h('b.d-floor'), bossEl = h('small.d-boss'), covEl = h('small.d-cov'), progBar = bar(), progTxt = h('small'), vaultEl = h('small'), orderEl = h('small.d-order');
  const dockTop = h('div.d-top', null, floorEl, bossEl, covEl, h('div.d-prog', null, progBar, progTxt), h('span.sp'), orderEl,
    h('small.d-season'), h('span.d-res', { 'data-tip': '금고' }, G.T.el('ui_gold', 'xs'), vaultEl), h('button.d-cog', { 'aria-label': '설정', on: { click: e => { e.stopPropagation(); G.UI.settings(); } } }, '⚙'));
  // 구슬: --v = 0~1 (아래에서 차오른다)
  const orb = (cls, tip) => { const v = h('b.o-v'), el = h('div.orb.' + cls, { 'data-tip': tip }, h('i.o-fill'), v); return { el, v }; };
  const orbHP = orb('hp', '원정대 체력'), orbBag = orb('bag', '짐');
  // 초상 칸: 단장 + 출전 칸 수만큼 (빈 칸은 자리만)
  const partyEl = h('div.d-party');
  let partyKey = '';
  const slots = [];
  function buildParty(s, rt) {
    const order = F.recruits(s), list = [rt.hero, ...[...rt.allies].sort((a, b) => order.indexOf(a.uid) - order.indexOf(b.uid))];
    const key = list.map(p => p.uid || 'hero').join() + '|' + F.slots();
    if (key === partyKey && slots.length && slots.every((r, i) => r.p === list[i] || (!r.p && !list[i]))) return;
    partyKey = key;
    partyEl.innerHTML = '';
    slots.length = 0;
    for (let i = 0; i < 1 + F.slots(); i++) {
      const p = list[i];
      if (!p) { partyEl.append(h('div.d-col', null, h('div.d-slot.empty', null, '+'))); slots.push({ p: null }); continue; }
      const hp = bar('hp'), lv = h('b.d-lv'), down = h('b.d-down');
      // 스킬 넷 (DESIGN.md 43): 자동이라 누르지 않는다 — 아이콘 위로 쿨타임이 걷힌다. 아직 안 열린 칸은 흐리게
      const sks = (p.merc?.skills || []).map((k, j) => { const S = G.D.MSKILLS[k]; return { k, j, el: h('i.d-sk', { 'data-tip': `${S.n} · ${S.d}${S.passive ? '' : ` · ${S.cool}초`}` }, G.T.el(S.t, 'd-ski')) }; });
      const el = h('div.d-slot' + (p.kind === 'hero' ? '.lead' : ''), { on: { click: e => { e.stopPropagation(); if (p.merc) sheet.open(p.merc); } } }, G.T.el(p.t, 'd-img'), lv, down, hp,
        p.merc?.pers?.length ? h('div.d-pers', null, ...p.merc.pers.map(k => G.T.el('ni_' + G.D.PERSONA[k].ic, 'd-pi'))) : null);
      partyEl.append(h('div.d-col', null, el, sks.length ? h('div.d-sks', null, sks.map(x => x.el)) : null));
      slots.push({ p, el, hp, lv, down, sks });
    }
  }
  // 단장 기술 (트리로 연다)
  const skillEl = h('div.d-skills');
  const skills = Object.entries(F.SKILLS).map(([id, sk]) => {
    const cd = h('span.cd'), b = h('button.d-btn', { 'data-tip': sk.n, on: { click: e => { e.stopPropagation(); F.cast(f(), id); } } }, G.T.el(sk.t, 'md'), cd);
    skillEl.append(b);
    return { id, sk, b, cd };
  });
  // 명령 (단축키)
  const cmd = (key, ic, tip, fn) => { const b = h('button.d-btn.cmd', { 'data-tip': tip, on: { click: e => { e.stopPropagation(); fn(); } } }, h('b', null, ic), h('kbd', null, key)); return { key, b, fn }; };
  const CMDS = [
    cmd('Z', '⌂', '귀환', () => { const s = f(); if (!s.town) EX.home(s, F.rt(s), 'manual'); }),
    cmd('X', '⤓', '서둘러 내려가기', () => { const rt = F.rt(f()); if (!f().town) { rt.rush = !rt.rush; rt.rally = null; } }),
    cmd('C', '⏬', '자동 하강 (끄면 계단에서 기다린다)', () => { f().auto = !f().auto; }),
    cmd('V', '✕', '명령 취소', () => G.Cmd.clear(F.rt(f()))),
  ];
  const cmdEl = h('div.d-cmds', null, CMDS.map(c => c.b));
  const dock = h('div.fdock', { on: { click: e => e.stopPropagation() } }, dockTop,
    h('div.d-main', null, orbHP.el, partyEl, h('i.d-sep'), skillEl, h('i.d-sep'), cmdEl, orbBag.el));
  // 대화 기록 (G.Banter): 왼쪽 위. 말풍선을 놓쳐도 여기서 읽는다 — 오래된 줄일수록 흐리게
  const chatEl = h('div.f-chat');
  let chatId = -1;
  function drawChat(rt, town) {
    tog(chatEl, 'hidden', town);
    const list = rt.chat || [], last = list.length ? list[list.length - 1].id : 0;
    if (last === chatId) return;
    chatId = last;
    chatEl.innerHTML = '';
    for (const c of list.slice(-CHAT_N)) chatEl.append(h('div', null, h('b', { style: `color:${c.col}` }, c.n), c.s));
  }
  // 단축키
  // 화면을 다시 만들어도 처리기는 하나만 (둘이면 누를 때마다 두 번 토글되어 제자리다)
  if (G.UI.fantasyKeys) document.removeEventListener('keydown', G.UI.fantasyKeys);
  document.addEventListener('keydown', G.UI.fantasyKeys = e => {
    if (G.UI.cur !== 'fantasy' || e.target.closest?.('input,textarea')) return;
    if (e.key.toLowerCase() === 'm') { G.UI.bigMap = !G.UI.bigMap; e.preventDefault(); return; }
    const c = CMDS.find(x => x.key.toLowerCase() === e.key.toLowerCase());
    if (c) { c.fn(); e.preventDefault(); return; }
    const n = +e.key;
    if (n >= 1 && n <= 9) { const vis = skills.filter(x => !x.b.classList.contains('hidden')); if (vis[n - 1]) F.cast(f(), vis[n - 1].id); }
  });

  // ════════ 오른쪽 위: 라이벌 한 줄 (미니맵 아래) ════════
  const rivLine = h('div.m-rivals');
  const menuEl = h('div.fmenu', null, rivLine);
  let rivKey = '';
  function drawRivLine(s, rt) {
    const rows = G.Rivals.standings(s, rt).filter(r => !r.us);
    const k = rows.map(r => r.id + r.floor + (r.here ? 'h' : '')).join();
    if (k === rivKey) return;
    rivKey = k;
    rivLine.innerHTML = '';
    for (const r of rows) rivLine.append(h('span' + (r.here ? '.here' : ''), { style: `--rc:${r.col}`, 'data-tip': `${r.n} · ${RS[r.stance].n}` }, h('i'), `${r.floor}층`));
  }

  // ════════ 오른쪽 가운데: 경고 (처리할 일) ════════
  const alertEl = h('div.falerts');
  let alertKey = '';
  function drawAlerts(s, rt) {
    const out = [], T = GD.tavern(s), line = F.lineup(s), hurt = s.mercs.filter(m => m.inj > 0).length;
    if (line.length < F.slots()) out.push(['출전 칸 ' + (F.slots() - line.length) + ' 빔', 'guild']);
    if (hurt) out.push(['부상 ' + hurt, 'guild']);
    if (!s.town && EX.full(s)) out.push(['짐 가득', null]);
    if (T.offers.some(o => o.price <= s.gold) && s.mercs.length < GD.ROSTER_MAX) out.push(['고용 가능', 'guild']);
    if (rt.rivals.some(p => p.clash > 0)) out.push(['라이벌 교전', 'rival']);
    const k = out.map(a => a[0]).join();
    if (k === alertKey) return;
    alertKey = k;
    alertEl.innerHTML = '';
    for (const [t] of out) alertEl.append(h('div.al', null, h('span', null, t), h('b', null, '!')));
  }

  // 관리(길드·선술집·라이벌·트리·기록)는 마을 화면(v_town)에서
  const town = G.UI.fantasyTown();

  // ════════ 조우 선택지: 그 파티 머리 위에 방침 넷 ════════
  const askT = h('div.enc-t'), askBar = bar(), askBtns = {};
  const askEl = h('div.encounter.hidden', null, askT, h('div.enc-b', null, ORDER.map(k => (askBtns[k] = h('button', { on: { click: e => { e.stopPropagation(); const pr = F.rt(f()).prompt; if (pr) G.Rivals.setStance(f(), pr.p.d, k); G.SFX.play('select'); } } }, h('b', null, RS[k].ic), h('small', null, RS[k].n))))), askBar);
  let askKey = '';
  function frameAsk(mv) {
    const pr = F.rt(f()).prompt, lead = pr && pr.p.mem.find(e => !e.dead);
    tog(askEl, 'hidden', !lead);
    if (!lead) { askKey = ''; return; }
    const d = pr.p.d, cur = G.Rivals.stance(f(), d);
    if (askKey !== d.id + cur) {
      askKey = d.id + cur;
      askT.innerHTML = '';
      askT.append(h('b', { style: `color:${d.col}` }, d.n));
      for (const k of ORDER) tog(askBtns[k], 'on', k === cur);
    }
    setW(askBar.fill, pr.t / pr.max);
    const p = mv.toScreen(lead._rx ?? lead.x, lead._ry ?? lead.y);
    askEl.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y - p.ts * 1.1)}px) translate(-50%, -100%)`;
  }

  const overlay = h('div.fover', null, chatEl, menuEl, alertEl, askEl, dock, town.el, sheet.el);
  return G.UI.worldScreen('fantasy', {
    overlay,
    frame: mv => frameAsk(mv),
    update() {
      const s = f(), rt = F.rt(s), ph = F.partyHP(rt);
      // 윗줄
      setText(floorEl, s.town ? '마을' : `${s.floor}층`);
      const nextBoss = (() => { for (let fl = s.floor; fl < s.floor + 8; fl++) if (F.isBoss(fl)) return fl; return 0; })();
      setText(bossEl, s.town ? `출발점 ${s.checkpoint || 1}층` : F.isBoss(s.floor) ? '보스' : nextBoss ? `보스 ${nextBoss}층` : '');
      tog(bossEl, 'boss', !s.town && F.isBoss(s.floor));
      const cov = G.Season.coverage(s, s.floor), known = !s.town && G.Season.known(s, rt);
      setText(covEl, s.town ? '' : `탐사 ${Math.round(cov * 100)}%${known ? ' · 직행' : ''}`);
      tog(covEl, 'on', known);
      const tot = rt.monTotal || 1, left = s.town ? 0 : rt.mons.length;
      setW(progBar.fill, s.town ? 0 : 1 - left / tot);
      setText(progTxt, s.town ? '' : rt.phase === 'dead' ? `전멸 ${Math.ceil(rt.reviveT)}` : `${left}/${tot}`);
      setText(vaultEl, U.fmt(s.gold));
      setText(dockTop.querySelector('.d-season'), `시즌 ${G.Season.st(s).n} · ${U.fmtTime(G.Season.left(s))}`);
      setText(orderEl, G.Cmd.label(rt));
      // 구슬
      const hpR = ph.max ? ph.hp / ph.max : 0, cap = EX.cap(s), c = EX.carry(s);
      orbHP.el.style.setProperty('--v', s.town ? 1 : hpR);
      tog(orbHP.el, 'low', !s.town && hpR < 0.3);
      setText(orbHP.v, s.town ? '' : `${Math.round(hpR * 100)}%`);
      orbHP.el.dataset.tip = `원정대 체력 ${U.fmt(Math.max(0, ph.hp))}/${U.fmt(ph.max)} · 공격 ×${U.fmt(F.atkMult() * F.dmgMult(s))} · 체력 ×${U.fmt(F.sum(F.parts('hp')))} · 재생 ${(F.regen(s) * 100).toFixed(1)}%/초 · 오염 ${(F.corruption(s, rt) * 100).toFixed(1)}%/초`;
      orbBag.el.style.setProperty('--v', s.town ? 0 : c / cap);
      tog(orbBag.el, 'full', !s.town && EX.full(s));
      setText(orbBag.v, s.town ? '' : U.fmt(c));
      orbBag.el.dataset.tip = s.town ? '짐' : `짐 ${U.fmt(c)}/${U.fmt(cap)}${rt.homeAfterBoss ? ' · 보스 후 귀환' : ''}`;
      // 초상
      buildParty(s, rt);
      for (const r of slots) {
        if (!r.p) continue;
        const p = r.p, dead = p.dead;
        setW(r.hp.fill, dead ? 0 : p.hp / p.max);
        tog(r.hp, 'low', !dead && p.hp / p.max < 0.3);
        tog(r.el, 'down', dead);
        tog(r.el, 'on', !!p.merc && sheet.current() === p.merc);
        setText(r.lv, p.merc ? p.merc.lv : '');
        setText(r.down, dead ? Math.ceil(p.reviveT) : '');
        // 연계기가 나가면 두 사람 초상이 함께 번쩍
        tog(r.el, 'combo', !!p._combo && G.S.runTime - p._combo < 0.8);
        // 기벽 · 장신구 · 전우가 생기면 초상이 그 색으로 번쩍 (DESIGN.md 50)
        const qa = p._qfx ? G.S.runTime - p._qfx.t : -1, qf = qa >= 0 && qa < 1.6 ? p._qfx.kind : '';
        for (const k of ['good', 'bad', 'bond', 'loot']) tog(r.el, 'q' + k, qf === k);
        if (r.sks) for (const x of r.sks) {
          const cd = p.cds?.[x.k] || 0, max = G.D.MSKILLS[x.k].cool || 1;
          x.el.style.setProperty('--cd', s.town ? 0 : Math.max(0, cd / max));
          tog(x.el, 'off', p.merc.lv < GD.slotLv(x.j, p.merc, x.k));
          tog(x.el, 'fire', p.lastSk === x.k && cd > max - 0.5);
        }
      }
      // 기술 (동료 기술은 그 동료가 출전 중일 때만)
      for (const x of skills) {
        const un = F.unlocked(x.id), cd = s.cds[x.id] || 0;
        tog(x.b, 'hidden', !un);
        x.b.disabled = s.town || cd > 0 || !F.canCast(s, x.id);
        setText(x.cd, cd > 0 ? Math.ceil(cd) : '');
      }
      tog(skillEl, 'hidden', !skills.some(x => !x.b.classList.contains('hidden')));
      // 명령
      for (const c of CMDS) c.b.disabled = s.town;
      tog(CMDS[1].b, 'on', !!rt.rush);
      tog(CMDS[1].b, 'wait', !!rt.stairWait);
      tog(CMDS[2].b, 'on', !!s.auto);
      // 오른쪽
      drawRivLine(s, rt);
      drawAlerts(s, rt);
      // 마을: 던전 HUD를 숨기고 마을 화면을 맵 자리에 (스킬트리 단추도 마을 탭으로)
      for (const e of [dock, menuEl, alertEl]) tog(e, 'hidden', !!s.town);
      tog(overlay.parentNode, 'town', !!s.town);
      town.update();
      drawChat(rt, !!s.town);
      sheet.update();
    },
  });
};
