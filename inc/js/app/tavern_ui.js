'use strict';
// 선술집 화면 (화면 쪽). 규칙은 js/game/tavern.js — 여기는 창 · 저장 · 떠나기뿐.
// TAVERNUI.open(f, rumor): 오늘 밤의 모험가에서 자리 수만큼 고르고 「내려간다」. rumor = 쌓인 소문 (의자 수).
// 떠나면 고른 사람들을 이 탭에 적어 두고 화면을 다시 연다 — boot.js가 TAVERNUI.takeParty()로 읽어 그 파티로 층을 세운다.
const TAVERNUI = (() => {
  const { $, esc } = UI, KEY = 'inc.tavern', GO = 'inc.go';
  const get = (S, k) => { try { return S.getItem(k); } catch (e) { return null; } }, put = (S, k, v) => { try { S.setItem(k, v); } catch (e) { /* 저장 못 해도 판은 돈다 */ } };
  const load = () => G.Tavern.load(get(localStorage, KEY)), save = m => put(localStorage, KEY, JSON.stringify(m));
  function takeParty() { const raw = get(sessionStorage, GO); if (!raw) return null; try { sessionStorage.removeItem(GO); return JSON.parse(raw); } catch (e) { return null; } }
  const skN = k => G.D.MSKILLS[k]?.n || k, AB = G.Reward.AB_N;
  // 직업이 던전에서 푸는 것 (탐사 규칙의 열쇠)
  const KEYS = { fighter: '문 부수기 · 앞줄', rogue: '자물쇠 · 함정', wizard: '열림 주문 · 빛', cleric: '점술 · 치유', ranger: '길 찾기 · 활' };
  function open(f, rumor) {
    const T = G.Tavern, m = load(), picks = [];
    const box = document.createElement('div'); box.id = 'tavern'; box.onpointerup = ev => ev.stopPropagation(); $('stage').append(box);
    const card = (g, i) => { const c = G.Guild.def(g) || {}, k = picks.indexOf(i), top = Object.entries(g.ab || {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([a, v]) => `${AB[a]} ${v}`).join(' · ');
      return `<button class="tv-g${k >= 0 ? ' on' : ''}" data-i="${i}"><i class="tv-cls" style="background:${c.col || '#888'}">${esc((c.n || '?').slice(0, 1))}</i><b>${esc(g.name)}</b><small>${esc(c.n || g.cls)} · ${esc(KEYS[G.Party.RUN_CLS[g.cls]] || '')}</small>` +
        `<span>${esc(top)}</span><span>${(g.skills || []).slice(0, 4).map(skN).map(esc).join(' · ') || '무기와 직업 기능'}</span>${k >= 0 ? `<em>${k === 0 ? '앞장' : k + 1}</em>` : ''}</button>`; };
    function draw() {
      const night = T.night(f, m, rumor), n = T.seats(m), nx = T.nextSeat(m); save(m);
      box.innerHTML = `<div class="tv-in"><header><h2>선술집</h2><div class="tv-res"><span class="chip">소문 ${rumor}</span></div></header>` +
        `<p class="tv-dm">성채로 내려가는 문 위에 선 선술집. 소문을 듣고 온 모험가들이 난롯불 곁에 앉아 있고, 탁자 위에는 낡은 주사위 한 벌이 놓여 있다. 내려간 사람은 돌아오지 않는다. 누구를 보내겠는가.</p>` +
        `<h4>오늘 밤의 모험가 <small>자리 ${picks.length}/${n}${nx ? ` · ${nx}층 우두머리를 잡으면 한 자리 더` : ''}</small></h4><div class="tv-guests">${night.map(card).join('')}</div>` +
        (() => { const nl = T.LURE.find(([fl]) => m.deep < fl); return nl ? `<p class="tv-hint">${m.deep ? `${nl[0]}층에 닿으면` : '누군가 굴에 발을 들이면'} 새 얼굴이 찾아온다 — ${nl[1].map(c => esc((G.Guild.def({ cls: c }) || {}).n || c)).join(' · ')}</p>` : ''; })() +
        (m.wall.length ? `<h4>벽의 명패</h4><ul class="tv-wall">${m.wall.map(w => `<li><b>${esc((w.names || []).join(' · '))}</b> <small>${w.win ? `${w.floor}층을 넘었다` : `${w.floor}층에서 쓰러졌다`}</small></li>`).join('')}</ul>` : '') +
        `<button class="tv-go"${picks.length ? '' : ' disabled'}>${picks.length ? `${picks.length}명이 내려간다` : '함께 갈 사람을 고른다'}</button></div>`;
    }
    box.onclick = ev => {
      const g = ev.target.closest('.tv-g'), go = ev.target.closest('.tv-go');
      if (g) { const i = +g.dataset.i, k = picks.indexOf(i); if (k >= 0) picks.splice(k, 1); else if (picks.length < T.seats(m)) picks.push(i); else return; draw(); }
      else if (go && !go.disabled) { const party = picks.map(i => m.night[i]); m.night = null; save(m); put(sessionStorage, GO, JSON.stringify(party)); location.href = location.pathname; }
    };
    draw(); document.body.dataset.tavern = '1';
  }
  return { open, takeParty, load, save, get active() { return !!$('tavern'); } };
})();
