'use strict';
// 보상 · 성장 · 명성 (설계 5-12, 화면 없이): 레벨업 고르기 · 전리품 · 정예 · 보스 3택1 · 명성.
// - 경험치는 옛 엔진(G.Guild.onKill: SRD 몬스터 CR별, 살아 있는 파티원이 나눔)이 준다. 새 게임은 한 층 판이라 3배(bridge.js).
// - 레벨이 오르면 엔진이 기술 칸을 저절로 채우지 않고(bridge.js) 여기서 후보 셋을 낸다:
//   시전자 — 새로 열린 주문 칸마다 그 레벨에 배울 수 있는 주문 3개 중 하나 · 무예(칸이 없는 직업) — 능력치 +1 셋 중 하나.
// - 상태는 사람(merc)에 붙는다: skills · ab · abPend(무예의 남은 고르기) · carve(새긴 면). 난수는 넘겨받는다(rng).
G.Reward = (() => {
  const XP_PACE = 3;
  const AB_N = { str: '근력', dex: '민첩', con: '건강', int: '지능', wis: '지혜', cha: '매력' };
  // 무예 직업이 올릴 능력치 (SRD 주 능력치 · 건강)
  const AB_OF = { dragoon: ['str', 'con', 'dex'], barbarian: ['str', 'con', 'dex'], rogue: ['dex', 'con', 'int'], monk: ['dex', 'wis', 'con'] };
  const GD = () => G.Guild;
  const pick = (list, n, rng) => { const a = list.slice(), out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return out; };

  // ── 레벨업 ──
  const caster = m => { const L = GD().limits(m.cls, Math.max(1, m.lv)); return L.cantrip + L.prepared > 0; };
  // 열린 칸: SRD 표의 소마법 · 준비 주문 수 − 지금 아는 수
  function slotsOpen(m) {
    const L = GD().limits(m.cls, m.lv), cur = (m.skills || []).filter(k => GD().spLv(k) != null);
    return { cantrip: Math.max(0, L.cantrip - cur.filter(k => GD().spLv(k) === 0).length), prepared: Math.max(0, L.prepared - cur.filter(k => GD().spLv(k) > 0).length) };
  }
  // 남은 고르기 수
  function pending(m) { if (caster(m)) { const o = slotsOpen(m); return o.cantrip + o.prepared; } return m.abPend || 0; }
  // 배울 수 있는 주문 (그 칸 종류 · 그 레벨까지 · 아직 모르는 것)
  function learnable(m, slot) {
    const S = GD();
    return S.pickable(m.cls).filter(k => S.skLv(m.cls, k) <= m.lv && S.spLv(k) != null && !G.D.MSKILLS[k]?.noAuto && !(m.skills || []).includes(k) && (slot === 'cantrip' ? S.spLv(k) === 0 : S.spLv(k) > 0));
  }
  const abilityOffer = m => ({ kind: 'ability', options: (AB_OF[m.cls] || ['str', 'dex', 'con']).map(a => ({ kind: 'ability', id: a, n: `${AB_N[a]} +1`, d: `${AB_N[a]} ${m.ab?.[a] ?? 10} → ${Math.min(20, (m.ab?.[a] ?? 10) + 1)}` })) });
  // 후보 셋: 시전자는 새 칸의 주문 (높은 레벨 주문이 하나는 끼게), 무예는 능력치
  function offer(m, rng = Math.random) {
    if (!caster(m)) return abilityOffer(m);
    const o = slotsOpen(m), slot = o.prepared > 0 ? 'prepared' : 'cantrip', pool = learnable(m, slot);
    if (!pool.length) return abilityOffer(m);
    const top = Math.max(...pool.map(k => GD().spLv(k))), hi = pool.filter(k => GD().spLv(k) === top);
    const first = pick(hi, 1, rng), rest = pick(pool.filter(k => !first.includes(k)), 2, rng);
    return { kind: 'spell', slot, options: first.concat(rest).map(k => ({ kind: 'spell', id: k, n: G.D.MSKILLS[k]?.n || k, lv: GD().spLv(k), d: G.D.MSKILLS[k]?.d || '' })) };
  }
  // 고른 것을 적용
  function choose(m, opt) {
    if (opt.kind === 'spell') { m.skills = (m.skills || []).concat(opt.id); m.skManual = true; m.skPri = m.skills.slice(); return true; }
    if (opt.kind === 'ability') { m.ab = m.ab || {}; m.ab[opt.id] = Math.min(20, (m.ab[opt.id] ?? 10) + 1); m.abPend = Math.max(0, (m.abPend || 0) - 1); return true; }
    return false;
  }

  // ── 전리품 · 상인 물자 ──
  const ITEM = {
    oil: { n: '기름', cost: 6, line: '5피트 칸에 붓는다 — 불이 닿으면 2라운드 탄다' },
    caltrops: { n: '마름쇠', cost: 8, line: '처음 밟는 적은 멈춘다 (DC 15)' },
    tools: { n: '도둑 도구', cost: 20, line: '잠긴 문을 조용히 딴다 (DC 15)' },
    potion: { n: '치유 물약' }, torch: { n: '횃불' }, knockScroll: { n: '열림 두루마리' }, seeScroll: { n: '투시 두루마리' },
  };
  const LOOT = [['oil', 30], ['potion', 26], ['caltrops', 14], ['torch', 10], ['knockScroll', 6], ['tools', 6], ['seeScroll', 5]];
  // 전투마다: 굴림 수 = 보스 3 · 정예 2 · 적 셋 이상 2 · 아니면 1, 굴림마다 70%로 하나 (무게 표에서)
  function loot(type, count, rng = Math.random) {
    const rolls = type === 'boss' ? 3 : type === 'elite' || count >= 3 ? 2 : 1, tot = LOOT.reduce((a, [, w]) => a + w, 0), out = {};
    for (let i = 0; i < rolls; i++) { if (rng() >= 0.7) continue; let x = rng() * tot; for (const [k, w] of LOOT) { if ((x -= w) < 0) { out[k] = (out[k] || 0) + 1; break; } } }
    return Object.entries(out).map(([k, n]) => ({ k, n, name: ITEM[k]?.n || k }));
  }
  // 상인의 물건 목록에 새 물자를 더한다 (탐사 규칙의 RUN.ITEMS — 옛 것은 그대로)
  function stockShop(items) { for (const k of ['oil', 'caltrops', 'tools']) if (!items[k]) items[k] = { n: ITEM[k].n, cost: ITEM[k].cost, line: ITEM[k].line }; return items; }

  // ── 정예 · 보스 3택1: 마법 물건 · 운명판 규칙 카드 · 면 새기기 ──
  const RULES = {
    reroll2: { n: '두 번 굴리기', d: '운명판 다시 굴리기를 한 번 더 할 수 있다' },
    wild19: { n: '별의 면', d: '모든 직업 주사위의 19면도 ★ (아무 기호)' },
    pairUp: { n: '맞물림', d: '같은 기호 둘만 모여도 셋처럼 강한 조합' },
  };
  // 마법 물건 후보: 엔진의 SRD 물건(G.D.ARTS) 가운데 아직 없고 파티 누군가가 낄 수 있는 것, 정예는 희귀도 2까지 · 보스는 3까지
  function artOptions(f, party, type, rng) {
    const own = new Set((f.trinkets || []).map(t => t.k)), cap = type === 'boss' ? 3 : 2, fits = k => party.some(p => p.merc && !p.dead && (!G.D.ARTS[k].fit || G.D.ARTS[k].fit.includes(p.merc.cls)));
    return pick(Object.keys(G.D.ARTS).filter(k => !own.has(k) && (G.D.ARTS[k].r || 1) <= cap && G.D.ARTS[k].props && fits(k)), 1, rng).map(k => ({ kind: 'art', id: k, n: G.D.ARTS[k].n, ic: G.D.ARTS[k].ic, d: (G.D.ARTS[k].en || '') }));
  }
  // 면 새기기 후보: 빈 면(1면 빼고)이 남은 사람 하나 — 그 빈 면 하나를 ★로
  function carveOptions(party, rng) {
    const can = party.filter(p => !p.dead && p.merc && blanks(p).length), who = pick(can, 1, rng)[0]; if (!who) return [];
    const v = pick(blanks(who), 1, rng)[0];
    return [{ kind: 'carve', id: `${who.merc.uid}:${v}`, who, v, n: `면 새기기 — ${who.merc.name}`, d: `${who.merc.name}의 직업 주사위 ${v}면(빈 면)을 ★로` }];
  }
  function blanks(p) { const kind = G.Dice.dieFor(p), K = G.Dice.KINDS[kind]; if (!K?.sym) return []; const out = []; for (let v = 2; v <= 19; v++) if (G.Dice.face(kind, v, p).sym === null) out.push(v); return out; }
  function ruleOptions(rng) { const left = Object.keys(RULES).filter(k => !G.Dice.rules.has(k)); return pick(left, 1, rng).map(k => ({ kind: 'rule', id: k, n: RULES[k].n, d: RULES[k].d })); }
  // 셋: 마법 물건 · 규칙 카드 · 면 새기기 (모자라면 있는 만큼)
  function bigOffer(f, party, type, rng = Math.random) { return [...artOptions(f, party, type, rng), ...ruleOptions(rng), ...carveOptions(party, rng)]; }
  function takeBig(f, opt) {
    if (opt.kind === 'art') { const t = { id: f.trUid = (f.trUid || 0) + 1, lv: f.floor || 1, on: null, k: opt.id }; G.Trinket.all(f).push(t); (f.artSeen = f.artSeen || []).push(opt.id); G.Trinket.overflow?.(f); G.Trinket.auto?.(f); return t; }
    if (opt.kind === 'rule') { G.Dice.rules.add(opt.id); return true; }
    if (opt.kind === 'carve') { const m = opt.who.merc; m.carve = { ...(m.carve || {}), [opt.v]: 'wild' }; return true; }
    return false;
  }

  // ── 명성 (판 밖) ──
  // 한 판의 명성: 간 방 1 · 이긴 전투 2 · 정예 3 · 보스 10 · 층 끝까지 가면 5 더
  const renown = s => (s.rooms || 0) + 2 * (s.fights || 0) + 3 * (s.elites || 0) + 10 * (s.boss ? 1 : 0) + (s.win ? 5 : 0);
  const UNLOCKS = [{ id: 'twin', at: 10, n: '쌍둥이 주사위 (특수 주사위)' }, { id: 'oil1', at: 15, n: '시작 기름 +1' }, { id: 'doom', at: 25, n: '죽음의 주사위 (특수 주사위)' }, { id: 'potion1', at: 35, n: '시작 치유 물약 +1' }];
  const unlocked = total => UNLOCKS.filter(u => total >= u.at).map(u => u.id);

  return { on: false, XP_PACE, AB_N, ITEM, RULES, UNLOCKS, caster, slotsOpen, pending, learnable, offer, choose, loot, stockShop, bigOffer, takeBig, blanks, renown, unlocked };
})();
