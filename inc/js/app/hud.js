'use strict';
// 화면 틀 (모바일 우선, 넓은 화면은 app.css의 미디어 쿼리로): 위 바 · 아래 파티 바 · 캐릭터 시트 · 확대.
// - 위 바: 층 · 지금 상태(탐사 / 문 앞 준비 / N라운드) · 금화 · 물자 · 배속
// - 파티 바: 최대 다섯 장 — 직업 · 이름 · 레벨 · 체력, 지금 차례는 밝게, 전투 중엔 그 라운드 운명판 주사위. 누르면 캐릭터 시트
// - 확대: 기기 픽셀이 아니라 화면 너비 기준 — 폰은 게임 픽셀 250쯤, 넓은 화면은 560쯤이 한 화면 너비
// 읽는 것은 CRAWL.view()뿐 (규칙 · 상태를 바꾸지 않는다).
const HUD = (() => {
  const { $, esc } = UI;
  let el = null, key = '';
  const f = () => G.S.w.fantasy;
  const ITEM = [['potion', '물약'], ['tools', '도구'], ['torch', '횃불'], ['knockScroll', '열림'], ['seeScroll', '투시']];
  const clsOf = m => G.Guild.def(m) || {};
  // 화면 너비 기준 확대: 폰은 게임 픽셀 250(탐사) · 340(전투 — 적까지 보이게), 넓은 화면은 560 · 660
  const zoom = (fight = false) => { const w = STG.clientWidth || innerWidth; return Math.max(1, w * DPR / (w < 700 ? (fight ? 340 : 250) : (fight ? 660 : 560))); };
  let wasFight = false;
  function mount() {
    el = document.createElement('div'); el.id = 'hud';
    el.innerHTML = '<div class="hud-top"></div><div class="hud-party"></div>';
    el.onpointerup = ev => ev.stopPropagation(); // 바 위를 누른 것은 바닥 누르기가 아니다
    el.querySelector('.hud-top').onclick = ev => { if (ev.target.closest('.hud-spd')) { G.Turn.nextSpeed(f()); key = ''; } };
    el.querySelector('.hud-party').onclick = ev => { const b = ev.target.closest('.pm'); if (b) sheet(+b.dataset.i); };
    $('stage').append(el);
  }
  const dieHTML = r => (r ? `<b class="pm-die k-${r.kind}">${r.special === 'death' ? '☠' : r.value}${r.sym ? `<sup class="sy s-${r.sym}">${G.Dice.SYM[r.sym].n}</sup>` : ''}</b>` : '');
  // 파티 카드의 초상 (그림이 늦게 오면 올 때까지 다시 그린다)
  let faceLeft = 0;
  function drawFaces(v) { faceLeft = 0; el.querySelectorAll('.pm-face').forEach((cv, i) => { if (cv.dataset.ok) return; if (v.party[i]?.m && UI.face(cv, v.party[i].m)) cv.dataset.ok = '1'; else faceLeft++; }); }
  function frame() {
    const v = CRAWL.view(); if (!v) return; if (!el) mount();
    if (v.fighting !== wasFight) { wasFight = v.fighting; if (typeof setZoom === 'function') setZoom(zoom(wasFight), true); } // 전투가 시작되면 넓게, 끝나면 되돌린다
    const dice = v.fighting && G.Dice.st ? v.party.map(p => G.Dice.dieOf(p.a)) : [], ins = v.party.map(p => (G.Dice.insp(p.a) ? '✦' : '') + (v.fighting ? G.Dice.bonus(p.a).join('') : ''));
    const k = JSON.stringify([v.title, v.sub, v.gold, v.items, GEARUI.count(), G.Turn.speed(f()), v.party.map(p => [p.m?.name, p.m?.lv, p.hp, p.max, p.dead, p.cur]), dice.map(r => r && `${r.value}${r.sym}`), ins]);
    if (k === key) { if (faceLeft) drawFaces(v); return; } key = k;
    const res = v.items ? ITEM.filter(([id]) => v.items[id] > 0).map(([id, n]) => `<span class="chip c-${id}" title="${n}">${n} ${v.items[id]}</span>`).join('') : '';
    el.querySelector('.hud-top').innerHTML = `<div class="hud-l"><b>${esc(v.title)}</b><small>${esc(v.sub)}</small></div>` +
      `<div class="hud-r">${v.gold != null ? `<span class="chip c-gold" title="금화">금화 ${v.gold}</span>` : ''}${res}${v.gold != null ? GEARUI.chip() : ''}<button class="hud-spd" title="배속 (T)">×${G.Turn.speed(f())}</button></div>`;
    el.querySelector('.hud-party').innerHTML = v.party.map((p, i) => { const m = p.m, c = clsOf(m), w = Math.round(100 * Math.max(0, p.hp) / Math.max(1, p.max));
      return `<button class="pm${p.cur ? ' cur' : ''}${p.dead ? ' dead' : ''}" data-i="${i}"><canvas class="pm-face" width="26" height="30" style="--cc:${c.col || '#888'}"></canvas>` +
        `<span class="pm-name">${esc(m?.name || '동료')}${ins[i] ? ` <i class="pm-ins" title="영웅적 영감 · 얹히는 주사위">${ins[i]}</i>` : ''}</span><small class="pm-lv">${esc(c.n || '')} · ${m?.lv || 1}레벨</small>` +
        `<span class="pm-hp"><i style="width:${w}%;background:${w > 50 ? '#7fcf8a' : w > 25 ? '#e8c860' : '#e06050'}"></i></span><small class="pm-hpn">${Math.max(0, p.hp)}/${p.max}</small>${dieHTML(dice[i])}</button>`; }).join(''); drawFaces(v);
  }
  // 캐릭터 시트 (바텀 시트): 직업 · 레벨 · 경험치 · 체력 · 능력치 · 손에 든 기술(5칸) · 끼운 물건 · 직업 주사위
  function sheet(i) {
    const v = CRAWL.view(), p = v && v.party[i]; if (!p || !p.m) return;
    const m = p.m, c = clsOf(m), need = G.Guild.needOf(m), AB = G.Reward.AB_N, skills = (m.skills || []).filter(k => G.Guild.spLv(k) != null);
    const worn = (G.Trinket.worn?.(f(), m.uid) || []).map(t => G.Trinket.def(t)?.n).filter(Boolean), die = G.Dice.KINDS[G.Dice.dieFor(p.a)];
    let box = $('csheet'); if (!box) { box = document.createElement('div'); box.id = 'csheet'; box.onpointerup = ev => ev.stopPropagation(); $('stage').append(box); }
    box.innerHTML = `<h3>${esc(m.name)} <small>${esc(c.n || m.cls)} · ${m.lv}레벨</small></h3>` +
      `<div class="sh-bar"><span>체력 ${Math.max(0, p.hp)}/${p.max}</span><i style="width:${Math.round(100 * Math.max(0, p.hp) / Math.max(1, p.max))}%"></i></div>` +
      `<div class="sh-bar xp"><span>경험치 ${Math.round(m.xp || 0)}/${need}</span><i style="width:${Math.round(100 * Math.min(1, (m.xp || 0) / need))}%"></i></div>` +
      `<div class="sh-ab">${Object.keys(AB).map(a => `<span><small>${AB[a]}</small>${G.Dnd.ab(m)[a]}</span>`).join('')}</div>` +
      `<h4>직업 기능</h4><ul class="sh-sk">${G.Reward.features(m).map(x => `<li><b>${esc(x.n)}</b><small>${x.lv}레벨</small><span>${esc(x.d || '')}</span></li>`).join('')}${G.Opt.of(m).filter(k => G.D.MSKILLS[k]).map(k => `<li><b>${esc(G.D.MSKILLS[k].n)}</b><small>고른 것</small><span>${esc(G.D.MSKILLS[k].d || '')}</span></li>`).join('')}</ul>` +
      `<h4>손에 든 기술 <small>${skills.length}/${G.Party.CAP}</small></h4>` +
      (skills.length ? `<ul class="sh-sk">${skills.map(k => `<li><b>${esc(G.D.MSKILLS[k]?.n || k)}</b><small>${G.Guild.spLv(k) ? `${G.Guild.spLv(k)}레벨 주문` : '소마법'}</small><span>${esc(G.D.MSKILLS[k]?.d || '')}</span></li>`).join('')}</ul>` : '<p class="sh-none">직업 기능으로 싸운다 (기술 칸 없음)</p>') +
      GEARUI.section(m, v.fighting) + // 장비: 무기 · 갑옷 · 방패 · 마법 칸 셋 (js/app/gear_ui.js)
      (die ? `<h4>주사위</h4><p class="sh-none">${esc(m.dieN || die.n)} · ${(c => [['atk', '검'], ['def', '방'], ['arc', '주'], ['holy', '빛'], ['wild', '★'], ['blank', '빈 면']].filter(([k]) => c[k]).map(([k, n]) => `${n} ×${c[k]}`).join(' · '))(G.Dice.faces(p.a) || {})}${m.carve ? ` · 새긴 면 ${Object.keys(m.carve).join(' · ')}` : ''}${G.Dice.tags(p.a).length ? ` · ${G.Dice.tags(p.a).map(esc).join(' · ')}` : ''}</p>` : '') +
      '<button class="sh-x">닫기</button>';
    box.querySelector('.sh-x').onclick = () => box.remove();
  }
  const closeSheet = () => { const s = $('csheet'); if (s) { s.remove(); return true; } return false; };
  // 화면 크기가 바뀌면 확대를 다시 (돌리기 · 창 크기)
  let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (typeof setZoom === 'function') setZoom(zoom(wasFight), true); key = ''; }, 150); });
  return { frame, zoom, sheet, closeSheet };
})();
