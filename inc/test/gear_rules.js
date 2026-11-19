'use strict';
// 장비 (js/game/gear.js): node test/gear_rules.js
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const { boot } = require('./_fight.js');
const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const mk = seed => { const B = boot(seed), G = B.G, f = G.S.w.fantasy; G.Reward.on = true; const add = c => { const m = G.Party.trim(G.Guild.make(f, c, { lv: 1 })); f.mercs.push(m); return m; };
  const fi = add('dragoon'), cl = add('cleric'), ro = add('rogue'), wi = add('archmage'); const party = [fi, cl, ro, wi].map(m => ({ merc: m })); return { G, f, fi, cl, ro, wi, party, X: G.Gear }; };
// 1) 굴림: 층의 희귀도 · 값 상한 안, 파티가 쓸 수 있는 것만
{
  const { G, f, party, X } = mk(1), rng = seeded(7), T = G.Trinket, S = G.SRD;
  let over = '', useless = 0, magic = { 1: 0, 5: 0, 9: 0 }, n = 0, r4 = 0;
  for (const fl of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) for (const ty of ['fight', 'elite', 'boss', 'treasure']) for (let i = 0; i < 60; i++) {
    const d = X.roll(fl, ty, rng, f, party); if (!d) continue; n++;
    if (d.kind === 'base') { const gp = d.slot === 's' ? 10 : (d.slot === 'a' ? S.ARMOR[d.k] : S.WEAPON[d.k]).gp; if (gp > X.GP_CAP[fl - 1]) over = `${fl}층 ${d.k} ${gp}gp`; if (!party.some(p => X.better(p.merc, d) > 0)) useless++; }
    else { const r = X.info(d).r; if (r > X.cap(fl, ty)) over = `${fl}층 ${ty} 희귀도 ${r}`; if (magic[fl] != null) magic[fl]++; if (r === 4) r4++; const x = { kind: 'magic', t: { id: 0, k: d.k, rand: d.rand, base: d.base, on: null } }; if (!party.some(p => X.can(p.merc, x, f).ok)) useless++; if (['weapon', 'armor'].includes(X.kindOf(x.t)) && !(d.base && X.bases(T.def(x.t)).includes(d.base))) over = `종류가 안 붙었다: ${X.info(d).n}`; }
  }
  t('굴림이 층의 희귀도 · 값 상한 안이다', !over && n > 1500, over || n);
  t('쓸모없는 줍기가 없다 (기본 장비는 누군가에게 더 낫고, 마법 물건은 누군가가 낄 수 있다)', useless === 0, useless);
  t('깊을수록 마법 물건이 많이 나온다', magic[1] < magic[5] && magic[5] <= magic[9] + 20, JSON.stringify(magic));
  t('희귀도 상한: 1~4층 1 · 5~6층 2 · 7~10층 3 · 9~10층 우두머리만 4', X.cap(1, 'boss') === 1 && X.cap(4, 'elite') === 1 && X.cap(5, 'fight') === 2 && X.cap(8, 'boss') === 3 && X.cap(9, 'elite') === 3 && X.cap(9, 'boss') === 4 && X.cap(10, 'boss') === 4);
  t('전설은 깊은 층 우두머리에서만 나온다', r4 >= 0);
  const cnt = ty => { let a = 0; for (let i = 0; i < 400; i++) a += X.drops(3, ty, rng, f, party).length; return a / 400; };
  const cf = cnt('fight'), ce = cnt('elite'), cb = cnt('boss');
  t('나오는 수: 보통 전투는 드물게 · 정예 하나 · 우두머리 둘', cf > 0.05 && cf < 0.3 && ce > 0.9 && ce <= 1 && cb > 1.5 && cb <= 2, JSON.stringify([cf, ce, cb]));
}
// 2) 숙련 규칙과 바꿔 끼기
{
  const { G, f, fi, cl, ro, wi, X } = mk(2), S = G.SRD, N = G.Dnd;
  const plate = X.take(f, { kind: 'base', slot: 'a', k: 'plate-armor' }), ac0 = N.acBase({ merc: fi }), a0 = S.eq(fi).a;
  t('숙련이 없으면 못 낀다 (위저드 · 로그는 판금을 못 입는다)', !X.can(wi, plate).ok && !X.can(ro, plate).ok && X.can(fi, plate).ok && X.equip(f, wi, plate) === false && X.count(f) === 1);
  t('견주기 한 줄: AC가 얼마에서 얼마로', X.cmp(fi, plate) === `AC ${ac0} → ${ac0 + 18 - S.ARMOR[a0].base}`, X.cmp(fi, plate));
  t('갑옷을 바꿔 입으면 AC가 바로 바뀌고 벗은 것은 가방으로', X.equip(f, fi, plate) && N.acBase({ merc: fi }) > ac0 && S.eq(fi).a === 'plate-armor' && X.bag(f).length === 1 && X.bag(f)[0].e.k === a0);
  const gs = X.take(f, { kind: 'base', slot: 'w', k: 'greatsword' }); S.eq(fi).w = 'longsword'; S.eq(fi).shield = true; const acS = N.acBase({ merc: fi });
  t('양손 무기를 들면 방패를 내린다 (방패 · 옛 무기가 가방으로)', X.equip(f, fi, gs) && S.eq(fi).w === 'greatsword' && !S.eq(fi).shield && N.acBase({ merc: fi }) === acS - 2 && X.bag(f).some(x => x.e?.slot === 's') && X.bag(f).some(x => x.e?.k === 'longsword'));
  const sh = X.bag(f).find(x => x.e?.slot === 's');
  t('양손 무기를 든 채로는 방패를 못 든다', !X.can(fi, sh).ok && X.can(fi, sh).why === '양손 무기');
  t('무기를 바꾸면 피해가 바로 바뀐다', N.gearWeapon(fi).d === 6 && N.gearWeapon(fi).n === 2);
  t('로그에게 권하는 무기는 기교 · 원거리뿐 (암습)', X.better(ro, { kind: 'base', slot: 'w', k: 'greatsword' }) === 0 && X.better(ro, { kind: 'base', slot: 'w', k: 'rapier' }) > 0);
  t('주문으로 싸우는 사람에게는 무기를 권하지 않는다', X.better(wi, { kind: 'base', slot: 'w', k: 'quarterstaff' }) === 0 && X.better(wi, { kind: 'base', slot: 'w', k: 'dagger' }) === 0);
  t('방패를 벗으면 가방으로', (S.eq(cl).shield = true) && X.unequip(f, cl, 's') && !S.eq(cl).shield && X.bag(f).filter(x => x.e?.slot === 's').length === 2);
  const w = X.worn(f, fi); t('낀 것: 무기(주 무기 + 보조 손) · 방어구 · 장신구 둘', w.map(r => r.group).join() === '무기,무기,방어구,장신구,장신구' && w[0].n === '그레이트소드' && w[1].empty && /AC \d+/.test(w[2].sub) && w[3].empty && w[4].empty, JSON.stringify(w.map(r => r.n)));
  // 보조 손: 방패 또는 둘째 경량 무기 (SRD 경량 속성)
  const ss = X.take(f, { kind: 'base', slot: 'w', k: 'shortsword' }), sc = X.take(f, { kind: 'base', slot: 'w', k: 'scimitar' }), ls = X.take(f, { kind: 'base', slot: 'w', k: 'longsword' });
  t('보조 손의 둘째 무기: 주 무기가 경량이어야 한다', !X.can(fi, sc, f, 'o').ok && X.can(fi, sc, f, 'o').why === '주 무기가 경량이어야');
  X.equip(f, fi, ss);
  t('둘 다 경량이면 든다 (쇼트소드 + 시미터) · 경량이 아닌 무기는 못 든다', X.can(fi, sc, f, 'o').ok && !X.can(fi, ls, f, 'o').ok && X.equip(f, fi, sc, 'o') && S.eq(fi).w2 === 'scimitar' && X.off(fi) === 'scimitar' && X.worn(f, fi)[1].n === S.WEAPON.scimitar.n);
  t('보조 손에 든 사람은 추가 행동 공격을 쓴다 (전투 방식이 없어도)', G.Guild.active(fi).includes('fs_twf'));
  t('보조 손 목록: 방패와 경량 무기', X.options(f, fi, 'o').every(o => X.slotOf(o.x) === 's' || S.WEAPON[o.x.e.k].props.includes('light')) && X.options(f, fi, 'o').length >= 2);
  const sh2 = X.bag(f).find(x => x.e?.slot === 's');
  t('방패를 들면 둘째 무기는 가방으로', X.equip(f, fi, sh2) && S.eq(fi).shield && !X.off(fi) && X.bag(f).some(x => x.e?.k === 'scimitar'));
  t('경량이 아닌 주 무기로 바꾸면 둘째 무기를 내려놓는다', (S.eq(fi).shield = false, S.eq(fi).w2 = 'dagger', true) && X.equip(f, fi, X.bag(f).find(x => x.e?.k === 'longsword')) && !X.off(fi));
}
// 3) 마법 물건 (SRD): 무기 · 갑옷은 종류가 정해진 한 물건 · 숙련 · 장신구 둘 · 조율 셋
{
  const { G, f, fi, cl, ro, wi, X } = mk(3), T = G.Trinket, N = G.Dnd, S = G.SRD, A = G.D.ARTS, key = en => Object.keys(A).find(k => A[k].en === en);
  // 마법 무기
  const ft = X.take(f, { kind: 'art', k: key('Flame Tongue'), base: 'longsword' }, 5), w0 = (S.eq(fi).w = 'battleaxe');
  t('마법 무기는 종류가 붙은 한 물건이다 (화염의 혀 · 롱소드)', ft.t.base === 'longsword' && /롱소드/.test(X.info(ft).n) && X.info(ft).lines.some(l => /1d8/.test(l)) && X.info(ft).lines.includes('조율 필요'), JSON.stringify(X.info(ft)));
  t('SRD가 허락하는 종류만: 화염의 혀는 근접 무기 · 드워프의 투척 망치는 워해머', X.bases(A[key('Flame Tongue')]).every(k => S.WEAPON[k].rng === 'melee') && X.bases(A[key('Dwarven Thrower')] || { slot: 'w', en: 'Dwarven Thrower' }).join() === 'warhammer');
  t('그 종류의 숙련이 있어야 든다 (위저드는 롱소드를 못 쓴다 · 직업 묶음이 아니라 숙련)', !X.can(wi, ft).ok && X.can(wi, ft).why === '숙련 없음' && X.can(fi, ft).ok && X.can(cl, ft).ok === S.canW(cl, 'longsword'));
  t('들면 들던 무기를 내려놓는다 (그 종류가 곧 든 무기)', X.equip(f, fi, ft) && S.eq(fi).w === 'longsword' && T.worn(f, fi.uid).includes(ft.t) && X.bag(f).some(x => x.e?.k === w0) && X.worn(f, fi)[0].n === X.info(ft).n);
  const dg = X.take(f, { kind: 'base', slot: 'w', k: 'greataxe' });
  t('다른 무기로 바꾸면 마법 무기는 통째로 가방으로 (롱소드가 따로 남지 않는다)', X.equip(f, fi, dg) && S.eq(fi).w === 'greataxe' && ft.t.on == null && X.bag(f).some(x => x.t === ft.t) && !X.bag(f).some(x => x.e?.k === 'longsword'));
  // 마법 갑옷 · 방패
  const pa = X.take(f, { kind: 'art', k: key('Armor, +1'), base: 'plate-armor' }, 5), a0 = S.eq(fi).a;
  t('마법 갑옷: 「판금 갑옷 +1」 — 입으면 입던 갑옷은 가방으로', /판금 갑옷 \+1/.test(X.info(pa).n) && X.equip(f, fi, pa) && S.eq(fi).a === 'plate-armor' && X.bag(f).some(x => x.e?.k === a0) && N.acBase({ merc: fi }) >= 19, [X.info(pa).n, N.acBase({ merc: fi })]);
  t('벗으면 통째로 가방으로', X.unequip(f, fi, 'a') && S.eq(fi).a === 'none' && pa.t.on == null);
  const ms = X.take(f, { kind: 'art', k: key('Shield, +1') }, 5); S.eq(cl).shield = false;
  t('마법 방패는 보조 손에 든다 (주 무기와 함께)', X.slotOf(ms) === 's' && X.equip(f, cl, ms) && S.eq(cl).shield && T.worn(f, cl.uid).includes(ms.t) && X.worn(f, cl)[1].n === T.name(ms.t) && X.worn(f, cl)[1].group === '무기');
  // 장신구 둘
  const acc = Object.keys(A).filter(k => !A[k].slot && !A[k].fit && A[k].props?.length && X.kindOf({ k, id: 0 }) === 'acc' && !X.att({ k, id: 0 })), [a, b, c] = ['cloak_prot', acc.find(k => k !== 'cloak_prot'), acc.filter(k => k !== 'cloak_prot')[1]].map(k => X.take(f, { kind: 'art', k }, 3));
  const ac0 = N.acBase({ merc: ro });
  t('장신구는 둘까지 — 끼우면 수치가 바로 바뀐다 (보호의 망토 AC +1)', X.equip(f, ro, a) && N.acBase({ merc: ro }) === ac0 + 1 && X.equip(f, ro, b) && X.held(f, ro).t.length === 2);
  t('셋째는 고른 자리의 것과 바꾼다', X.equip(f, ro, c, 't1') && X.held(f, ro).t.length === 2 && a.t.on == null && c.t.on === ro.uid && N.acBase({ merc: ro }) === ac0);
  t('벗는다', X.unequip(f, ro, 't1') && X.held(f, ro).t.length === 1);
  // 조율 셋 (SRD)
  const need = Object.keys(A).filter(k => !A[k].slot && !A[k].fit && A[k].props?.length && X.kindOf({ k, id: 0 }) === 'acc' && X.att({ k, id: 0 })), [n1, n2] = need.slice(0, 2).map(k => X.take(f, { kind: 'art', k }, 5));
  for (const q of T.worn(f, fi.uid)) q.on = null; X.equip(f, fi, X.bag(f).find(x => x.t === ft.t)); X.equip(f, fi, n1); X.equip(f, fi, n2);
  t('조율이 필요한 물건 셋을 꼈다', X.attuned(f, fi) === 3, X.attuned(f, fi));
  const dsm = X.take(f, { kind: 'art', k: key('Dragon Scale Mail'), base: 'scale-mail' }, 7);
  t('넷째 조율은 못 한다 (조율 셋)', X.att(dsm.t) && !X.can(fi, dsm).ok && X.can(fi, dsm).why === '조율 셋');
  const plain = X.take(f, { kind: 'art', k: key('Armor, +1'), base: 'chain-mail' }, 5);
  t('조율이 필요 없는 것은 셋과 별개로 낀다', !X.att(plain.t) && X.can(fi, plain).ok);
  // 지팡이 · 막대 · 완드: 주문 직업의 무기 칸
  const fk = Object.keys(A).find(k => X.kindOf({ k, id: 0 }) === 'focus' && (!A[k].fit || A[k].fit.includes('archmage'))), st = fk && X.take(f, { kind: 'art', k: fk }, 5);
  t('지팡이 · 막대 · 완드는 주문 직업이 무기 칸에 든다', !!st && X.slotOf(st) === 'w' && !X.can(fi, st).ok && X.can(fi, st).why === '주문 직업만' && X.equip(f, wi, st) && X.worn(f, wi)[0].n === T.name(st.t), fk);
  // 3택1
  const got = G.Reward.takeBig(f, { kind: 'art', id: Object.keys(A).find(k => !A[k].fit && !A[k].slot && A[k].props?.length && !f.trinkets.some(q => q.k === k)) });
  t('3택1의 마법 물건은 가방에 들어가고 저절로 끼워지지 않는다', got && got.on == null);
  const i = X.info(a); t('물건 카드: 이름 · 희귀도 · 효과 문구', i.n === '보호의 망토' && i.rn === '고급' && i.lines.includes('AC+1') && X.info({ kind: 'base', slot: 'w', k: 'longsword' }).lines[0].includes('1d8'), JSON.stringify(i));
}
// 4) 상인
{
  const { f, party, X } = mk(4), rng = seeded(3), st = X.stock(3, rng, f, party);
  t('상인: 기본 장비 둘 · 셋 (가끔 마법 물건), 값이 붙는다', st.filter(q => q.d.kind === 'base').length >= 2 && st.length <= 4 && st.every(q => q.cost >= 10), JSON.stringify(st.map(q => [q.d.k || q.d.rand?.n, q.cost])));
  t('값: 판금 250 · 고급 마법 물건 120', X.price({ kind: 'base', slot: 'a', k: 'plate-armor' }) === 250 && X.price({ kind: 'art', k: 'cloak_prot' }) === 120);
}
console.log(`gear_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
