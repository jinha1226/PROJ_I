'use strict';
// 선술집 (화면 없이, ROGUELIKE_PLAN 0-0) — 판과 판 사이의 한 화면. 드워프 성채 입구 위에 선 선술집에 소문을 듣고 온 모험가들이 앉아 있다.
// 내려간 사람은 돌아오지 않는다: 다음 판으로 넘어가는 물건 · 돈은 없다. 남는 것은 세상에 알려진 것뿐이다.
// - 새 구역에 처음 닿으면 그 구역에 끌린 직업이 오기 시작한다 (LURE).
// - 소문(쌓이기만 하는 값)이 퍼지면 의자가 늘어 오늘 밤 앉아 있는 사람이 많아진다.
// - 파티 자리는 둘에서 시작해 2층 · 4층 우두머리를 처음 잡을 때마다 하나씩 (최대 넷).
// meta: 가장 깊이 닿은 층 · 잡은 우두머리 층 · 벽의 명패 · 오늘 밤 손님. 저장은 화면 쪽(tavern_ui.js)이 한다.
G.Tavern = (() => {
  const START = ['dragoon', 'rogue', 'cleric'];
  // 구역의 첫 층 → 그 구역에 끌려 오는 직업 (구역은 두 층씩: 고블린 굴 · 드워프 폐성채 · 지하 묘지 · 숭배자의 신전 · 용의 둥지)
  const LURE = [[1, ['archer', 'barbarian']], [3, ['archmage', 'bard']], [5, ['paladin', 'monk']], [7, ['warlock', 'mage']], [9, ['scout']]];
  const SEAT_AT = [2, 4], STOOL_AT = [30, 80, 150], WALL = 8;
  const fresh = () => ({ deep: 0, boss: 0, wall: [], night: null });
  const load = raw => { try { return { ...fresh(), ...JSON.parse(raw || '{}') }; } catch (e) { return fresh(); } };
  const classes = m => START.concat(...LURE.filter(([fl]) => m.deep >= fl).map(([, c]) => c)); // 지금 선술집에 오는 직업
  const seats = m => 2 + SEAT_AT.filter(fl => m.boss >= fl).length;
  const nextSeat = m => SEAT_AT.find(fl => m.boss < fl) || null; // 다음 자리가 열리는 우두머리 층
  const stools = rumor => 4 + STOOL_AT.filter(v => rumor >= v).length;
  // 손님 한 명: 1레벨. 같은 직업이라도 능력치 · 재주 · 기술은 사람마다 다르다 (G.Guild.make가 굴린다)
  // lid = 생김새의 씨앗: 던전에 들어가며 번호(uid)가 바뀌어도 선술집에서 본 모습 그대로다 (js/render/minidoll.js)
  const guest = (f, cls) => { const m = G.Party.trim(G.Guild.make(f, cls, { lv: 1 })); m.lid = 't' + m.uid + m.name; return m; };
  // 상태창에 적을 것 (화면 없이): 직업 · 종족 · 체력 · AC · 능력치 · 무기 · 갑옷 · 늘 적용되는 특성 · 손에 든 기술(효과 한 줄) · 종족 특성 · 탐사에서 맡는 일
  const ROLE = { fighter: '문 부수기 · 앞줄', rogue: '자물쇠 · 함정 찾기 · 정찰', wizard: '열림 주문 · 마법 탐지 · 빛', cleric: '점술 · 치유', ranger: '길 찾기 · 정찰 · 활' };
  const DMG_T = { slashing: '참격', piercing: '관통', bludgeoning: '타격', fire: '화염', cold: '냉기', radiant: '광휘', force: '역장', psychic: '정신', necrotic: '사령', lightning: '번개', poison: '독', acid: '산성', thunder: '천둥' };
  function sheet(m) {
    const N = G.Dnd, S = G.SRD, K = G.D.MSKILLS, ab = N.ab(m), w = S.weaponOf(m), a = S.armorOf(m), sp = S.SPECIES[G.Res.species(m)] || { n: '?', traits: [] }, mas = S.MASTERY[w.m];
    const mod = v => (v >= 0 ? '+' : '') + v, e = { merc: m }, q = N.weapon(e), spell = !('flat' in q) && !G.Guild.traits(m).includes('iv_pblade'); // 주문 직업의 기본 공격은 소마법이다 (엔진이 실제로 쓰는 값)
    const sk = k => ({ n: K[k]?.n || k, d: K[k]?.d || '' });
    return {
      name: m.name, cls: G.Guild.def(m).n, sp: sp.n, lv: m.lv, hp: N.srdHP(m), ac: N.acBase({ merc: m }), role: ROLE[G.Party.RUN_CLS[m.cls]] || '',
      ab: Object.keys(N.AB_N || G.Reward.AB_N).map(k => ({ n: (N.AB_N || G.Reward.AB_N)[k], v: ab[k], mod: mod(N.mod(ab[k])) })),
      weapon: { n: spell ? '소마법 공격' : w.n || '맨손', d: `명중 ${mod(N.hit(e))} · ${q.n}d${q.d}${q.b ? mod(q.b) : ''} ${DMG_T[q.t] || ''}${spell || w.rng === 'ranged' ? ' · 원거리' : ''}${!spell && mas ? ` · ${mas[0]}: ${mas[1]}` : ''}` },
      armor: `${a.n}${S.eq(m).shield ? ' · 방패' : ''}`,
      traits: G.Guild.traits(m).filter(k => K[k]).map(sk),
      skills: (m.skills || []).filter(k => G.Guild.spLv(k) != null).map(k => ({ ...sk(k), tag: G.Guild.spLv(k) ? `${G.Guild.spLv(k)}레벨 주문` : '소마법' })),
      spTraits: sp.traits.map(([n, d]) => ({ n, d })),
    };
  }
  // 오늘 밤 앉아 있는 사람들: 열린 직업을 돌아가며 의자 수만큼. 떠날 때까지 그대로다 (다시 열어도 같은 사람들)
  function night(f, m, rumor, rng = Math.random) {
    if (m.night) return m.night;
    const order = classes(m).sort(() => rng() - 0.5);
    return m.night = Array.from({ length: stools(rumor) }, (_, i) => guest(f, order[i % order.length]));
  }
  // 판이 끝났다: sum = { floor: 닿은 층, bossFloor: 이번에 잡은 가장 깊은 우두머리 층, names, win } → { seat: 자리가 새로 열렸나, cls: 새로 오기 시작한 직업 }
  function finish(m, sum) {
    const was = seats(m), had = classes(m); m.deep = Math.max(m.deep, sum.floor || 1); if ((sum.bossFloor || 0) > m.boss) m.boss = sum.bossFloor;
    m.wall.unshift({ names: sum.names || [], floor: sum.floor || 1, win: !!sum.win }); m.wall.length = Math.min(m.wall.length, WALL); m.night = null;
    return { seat: seats(m) > was, cls: classes(m).filter(c => !had.includes(c)) };
  }
  return { START, LURE, SEAT_AT, fresh, load, classes, seats, nextSeat, stools, night, sheet, finish };
})();
