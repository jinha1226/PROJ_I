'use strict';
// 장비 (화면 없이, ROGUELIKE_PLAN 0-0): 그 판 안에서 줍고 사고 바꿔 끼는 것. 내려간 사람은 돌아오지 않으니 다음 판으로 넘어가지 않는다.
// 칸은 사람마다 셋 (2026-11-19, 관리할 것을 줄이려고): 무기(주 무기 + 보조 손 — 방패 또는 둘째 경량 무기) · 방어구(갑옷) · 장신구 둘. SRD대로:
// - 보조 손: 방패, 또는 주 무기가 경량이면 둘째 경량 무기(m.eq.w2 — SRD 경량 속성: 추가 행동으로 그 무기로 한 번 더, 전투 방식이 없으면 피해에 능력치를 더하지 않는다).
// - 마법 무기 · 갑옷은 종류가 정해진 한 물건이다 (「화염의 혀 롱소드」 · 「판금 갑옷 +1」 — t.base). 끼면 들던 것은 내려놓고, 그 종류의 숙련이 있어야 쓴다.
//   종류는 SRD 물건 표의 표기(아무 근접 무기 · 워해머 · 스케일 메일 …)에서 고른다.
// - 조율이 필요한 물건은 한 사람에 셋까지 (SRD). 지팡이 · 막대 · 완드는 주문 직업이 무기 칸에 든다.
// - SRD와 다른 곳: 조율이 필요 없는 장신구도 칸(둘)을 차지한다 — 부위별로 더 걸치지 못한다.
// 엔진의 장비는 두 겹이다 — 여기서 하나로 묶는다:
// - 기본 장비 (SRD 무기 · 갑옷 · 방패): 사람마다 m.eq = { w, a, shield }. 엔진에 보관 자리가 없어 f.gearBag = [{ id, slot: 'w' | 'a' | 's', k }]를 둔다.
// - 마법 물건: 파티 공용 f.trinkets (t.on = 낀 사람의 uid, 안 낀 것이 가방). 효과는 엔진이 낀 것 전부를 더한다 — 칸 · 조율 · 숙련은 여기서 지킨다 (엔진의 「칸마다 하나 · 직업 묶음」 판정은 쓰지 않는다).
// 가방 속 물건 하나(entry) = { kind: 'base', e: gearBag의 줄 } | { kind: 'magic', t: f.trinkets의 줄 }
// 굴린 것(drop) = { kind: 'base', slot, k } | { kind: 'art', k } | { kind: 'rand', rand } — take()가 가방에 넣고 entry를 돌려준다.
G.Gear = (() => {
  const S = () => G.SRD, T = () => G.Trinket, N = () => G.Dnd;
  // ── 10층용 표 (시험값) ──
  const R_CAP = [1, 1, 1, 1, 2, 2, 3, 3, 3, 3];      // 층 → 마법 물건 희귀도 상한 (9 · 10층 우두머리만 4)
  const R_W = [0, 6, 3, 1.5, 0.5];                   // 희귀도 무게 (상한 안에서)
  const R_N = ['', '고급', '희귀', '매우 희귀', '전설'];
  const GP_CAP = [75, 75, 200, 200, 750, 750, 1500, 1500, 1500, 1500]; // 층 → 기본 장비의 SRD 값 상한 (1 · 2층은 사슬 갑옷급, 7층부터 판금)
  const P_MAGIC = { fight: 0.3, elite: 0.6, boss: 1, treasure: 0.7, shop: 1 }; // 마법 물건일 확률 (아니면 기본 장비). 1 · 2층은 절반
  const N_DROP = { fight: 0.15, elite: 1, boss: 2, treasure: 1 };             // 방 종류 → 나오는 수 (1 미만은 확률)
  const PRICE_R = [0, 120, 300, 700, 1500];          // 상인: 마법 물건 값 (금화)
  const cap = (floor, type) => (type === 'boss' && floor >= 9 ? 4 : R_CAP[Math.max(0, Math.min(9, floor - 1))]);
  const alive = party => (party || []).filter(p => p.merc && !p.dead).map(p => p.merc);

  // ── SRD 표기: 물건의 갈래 · 될 수 있는 종류 · 조율 ──
  let SRDM = null; const srd = en => (SRDM = SRDM || new Map(G.SRD_ITEMS.magic.map(x => [x.en, x]))).get(en);
  const def = t => T().def(t);
  // 갈래: weapon | armor | shield | focus(지팡이 · 막대 · 완드 — 무기 칸, 주문 직업) | acc(장신구)
  const kindOf = t => { const d = def(t); if (d.shield) return 'shield'; if (d.slot === 'w') return 'weapon'; if (d.slot === 'a') return 'armor'; return /^(staff|rod|wand)/i.test(srd(d.en)?.cat || '') ? 'focus' : 'acc'; };
  const SLOT_OF = { weapon: 'w', focus: 'w', armor: 'a', shield: 's', acc: 't' };
  const att = t => { const d = def(t); return d.fixed ? !!srd(d.en)?.att : (d.r || 1) >= 2; }; // 랜다트는 희귀부터 조율
  const norm = s => String(s || '').toLowerCase().replace(/-/g, ' ');
  // 그 마법 무기 · 갑옷이 될 수 있는 기본 종류 (SRD 표의 괄호 안. 자료에서 목록이 잘린 셋은 원문대로 적는다)
  const CUT = { 'weapon (glaive': ['glaive', 'greatsword', 'longsword', 'scimitar'], 'weapon (battleaxe': ['battleaxe', 'greataxe', 'halberd'], 'weapon (greatsword': ['greatsword', 'longsword', 'rapier', 'scimitar', 'shortsword'] };
  function bases(d) {
    const c = norm(srd(d.en)?.cat), W = S().WEAPON, A = S().ARMOR, named = (all, tab) => { const hit = all.filter(k => new RegExp(`(^|[^a-z])${norm(tab[k].en)}([^a-z]|$)`).test(c)); return hit.length ? hit : all; };
    if (d.slot === 'w' && !d.shield) { const all = Object.keys(W).filter(k => !W[k].hidden); if (CUT[c]) return CUT[c].filter(k => W[k]); if (!c || /any simple or martial/.test(c)) return all; if (/any melee/.test(c)) return all.filter(k => W[k].rng === 'melee'); return named(all, W); }
    if (d.slot === 'a') { const all = Object.keys(A).filter(k => k !== 'none'); if (!c || /any light/.test(c)) return all; if (/any medium or heavy/.test(c)) return all.filter(k => A[k].cat !== 'light' && k !== 'hide-armor'); return named(all, A); }
    return null;
  }
  // 물건의 이름: 「화염의 혀 · 롱소드」 · 「롱소드 +1」 (종류가 하나뿐인 물건은 제 이름 그대로)
  function nameOf(t) {
    const d = def(t), b = t.base && (kindOf(t) === 'armor' ? S().ARMOR : S().WEAPON)[t.base]; if (!b) return d.n;
    const plus = /^마법 (?:무기|갑옷) (\+\d)$/.exec(d.n); if (plus) return `${b.n} ${plus[1]}`;
    if (!d.fixed) { const i = d.n.lastIndexOf('의 '); return i > 0 ? `${d.n.slice(0, i + 2)}${b.n}` : `${d.n} · ${b.n}`; } // 랜다트: 「고요한 비명의 스플린트 갑옷」
    return bases(d).length === 1 ? d.n : `${d.n} · ${b.n}`;
  }

  // ── 그 사람이 그 장비를 끼면 ──
  const avg = (w, shield) => { const dd = !shield && w.vd ? w.vd : w.dd; return w.dn * (dd + 1) / 2 + (w.flat || 0); };
  const dmgTxt = (w, shield) => `${w.dn}d${!shield && w.vd ? w.vd : w.dd}`;
  const caster = m => { const q = N().weapon({ merc: m }), g = N().gearWeapon(m); return q.d !== g.d || q.t !== g.t || q.n !== g.n; }; // 기본 공격이 소마법이다 (든 무기를 안 쓴다)
  const acWith = (m, patch) => { const e = S().eq(m), was = { ...e }; Object.assign(e, patch); const v = N().acBase({ merc: m }); Object.assign(e, was); return v; };
  const two = k => (S().WEAPON[k]?.props || []).includes('two'), light = k => { const w = S().WEAPON[k]; return !!w && w.rng === 'melee' && (w.props || []).includes('light'); };
  // 보조 손의 둘째 무기 (m.eq.w2). 쌍수 전투 방식으로 온 사람은 같은 무기 두 자루로 시작한다
  function off(m) { const e = S().eq(m); if (!e.w2init) { e.w2init = true; if (!e.w2 && !e.shield && light(e.w) && (G.Opt?.of?.(m) || []).includes('fs_twf')) e.w2 = e.w; } if (e.w2 && (e.shield || !light(e.w) || !light(e.w2))) e.w2 = null; return e.w2 || null; }
  // 낀 마법 물건: { w: 마법 무기 또는 지팡이류, a: 마법 갑옷, s: 마법 방패, t: [장신구 …] }
  function held(f, m) { const o = { w: null, a: null, s: null, t: [] }; for (const t of T().worn(f, m.uid)) { const sl = SLOT_OF[kindOf(t)]; if (sl === 't') o.t.push(t); else o[sl] = t; } return o; }
  const attuned = (f, m) => T().worn(f, m.uid).filter(att).length;
  const view = x => (x.kind === 'magic' ? { slot: SLOT_OF[kindOf(x.t)], k: x.t.base, kind: kindOf(x.t) } : { slot: x.e ? x.e.slot : x.slot, k: x.e ? x.e.k : x.k, kind: 'base' });
  // 그 무기 종류가 그 사람의 싸우는 방식에 맞나 (추천 · 굴림용 — 못 끼는 것은 아니다)
  function suits(m, k) {
    const e = S().eq(m), w = S().WEAPON[k], cur = S().weaponOf(m);
    if (caster(m) || m.cls === 'monk' || !S().canW(m, k) || w.rng !== cur.rng) return false;                    // 근접 ↔ 원거리는 바꾸지 않는다
    if (m.cls === 'rogue' && !(w.props.includes('finesse') || w.rng === 'ranged')) return false;                  // 암습 (SRD): 기교 · 원거리 무기
    if (two(k) && e.shield) return false;                                                                         // 방패를 든 사람에게 양손 무기는 권하지 않는다
    const fs = G.Opt?.of?.(m) || []; if (fs.includes('fs_twf') && S().styleOn(m, 'fs_twf') && !w.props.includes('light')) return false; if (fs.includes('fs_gwf') && S().styleOn(m, 'fs_gwf') && !(two(k) || w.props.includes('versatile'))) return false; // 전투 방식이 꺼지는 무기
    return true;
  }
  // 낄 수 있나: { ok, why }. SRD — 그 종류의 숙련이 있어야 하고, 조율은 셋까지
  function can(m, x, f = G.S.w.fantasy, at = null) {
    const v = view(x), e = S().eq(m);
    if (at === 'o' && v.slot === 'w') { if (x.kind !== 'base') return { ok: false, why: '보조 손에는 기본 무기만' }; if (!S().canW(m, v.k)) return { ok: false, why: '숙련 없음' }; if (!light(v.k)) return { ok: false, why: '경량 무기만' }; if (!light(e.w)) return { ok: false, why: '주 무기가 경량이어야' }; return { ok: true }; }
    if (v.slot === 'w' && v.kind === 'focus') { if (!caster(m)) return { ok: false, why: '주문 직업만' }; }
    else if (v.slot === 'w') { if (m.cls === 'monk') return { ok: false, why: '맨손' }; if (!S().canW(m, v.k)) return { ok: false, why: '숙련 없음' }; }
    else if (v.slot === 'a') { if (!S().canA(m, v.k)) return { ok: false, why: '숙련 없음' }; }
    else if (v.slot === 's') { if (!S().canShield(m.cls)) return { ok: false, why: '숙련 없음' }; if (two(e.w)) return { ok: false, why: '양손 무기' }; if (x.kind === 'base' && e.shield && !held(f, m).s) return { ok: false, why: '이미 들었다' }; }
    else if (!T().fits(x.t, m)) return { ok: false, why: '직업 제한' };
    if (x.kind === 'magic' && att(x.t) && x.t.on !== m.uid) { const h = held(f, m), out = v.slot === 't' ? (h.t.length >= 2 ? h.t.filter(att).length ? 1 : 0 : 0) : h[v.slot] && att(h[v.slot]) ? 1 : 0; if (attuned(f, m) - out + 1 > 3) return { ok: false, why: '조율 셋' }; }
    return { ok: true };
  }
  // 지금 낀 것과 견준 한 줄
  function cmp(m, x, f = G.S.w.fantasy) {
    const v = view(x), e = S().eq(m), h = held(f, m);
    if (v.slot === 'a') return `AC ${N().acBase({ merc: m })} → ${acWith(m, { a: v.k })}${x.kind === 'magic' ? ' + 효과' : ''}`;
    if (v.slot === 's') return e.shield ? (x.kind === 'magic' ? '방패와 바꾼다' : '') : `AC ${N().acBase({ merc: m })} → ${acWith(m, { shield: true })}`;
    if (v.slot === 't') return h.t.length >= 2 ? '하나와 바꾼다' : '빈 칸';
    if (v.kind === 'focus') return h.w ? `${nameOf(h.w)}와 바꾼다` : '무기 대신 든다';
    const w = S().WEAPON[v.k], cur = S().weaponOf(m);
    return `${cur.n} ${dmgTxt(cur, e.shield)} → ${w.n} ${dmgTxt(w, e.shield && !two(v.k))}${two(v.k) && e.shield ? ' · 방패를 내린다' : ''}${caster(m) ? ' (주문으로 싸운다)' : ''}`;
  }
  // 더 나아지나 (기본 장비의 굴림 · 추천용): 무기는 평균 피해, 갑옷 · 방패는 AC
  function better(m, x) {
    const v = view(x), e = S().eq(m); if (!can(m, x).ok) return 0;
    if (v.slot === 'a') return acWith(m, { a: v.k }) - N().acBase({ merc: m });
    if (v.slot === 's') return e.shield ? 0 : 2;
    if (v.slot !== 'w' || v.kind === 'focus' || !suits(m, v.k)) return 0;
    return avg(S().WEAPON[v.k], e.shield && !two(v.k)) - avg(S().weaponOf(m), e.shield);
  }

  // ── 굴림 ──
  const pickW = (list, w, rng) => { let x = rng() * list.reduce((a, q) => a + w(q), 0); for (const q of list) if ((x -= w(q)) < 0) return q; return list[list.length - 1] || null; };
  // 기본 장비: 지금 파티 누군가가 숙련이 있고, 지금 든 것보다 나은 것만 (그 층의 값 상한 안)
  function rollBase(floor, rng, f, party) {
    const ms = alive(party), gp = GP_CAP[Math.max(0, Math.min(9, floor - 1))], have = new Set((f.gearBag || []).map(e => e.slot + e.k)), out = [];
    const add = (slot, k, gpv) => { if (gpv > gp || have.has(slot + k)) return; const gain = Math.max(0, ...ms.map(m => better(m, { kind: 'base', slot, k }))); if (gain > 0) out.push({ kind: 'base', slot, k, gain }); };
    for (const k in S().WEAPON) if (!S().WEAPON[k].hidden) add('w', k, S().WEAPON[k].gp || 0);
    for (const k in S().ARMOR) if (k !== 'none') add('a', k, S().ARMOR[k].gp || 0);
    add('s', 'shield', S().SHIELD.gp || 10);
    const d = pickW(out, q => 1 + q.gain, rng); if (d) delete d.gain;
    return d || null;
  }
  // 마법 무기 · 갑옷의 종류 고르기: SRD가 허락하는 종류 가운데 파티 누군가의 싸우는 방식에 맞는 것 (지금 든 종류와 같으면 더 자주)
  function bind(d, ms, rng) {
    const bs = bases(d); if (!bs) return null;
    const fitW = k => ms.some(m => suits(m, k) && avg(S().WEAPON[k], S().eq(m).shield && !two(k)) >= avg(S().weaponOf(m), S().eq(m).shield) - 0.01), fitA = k => ms.some(m => S().canA(m, k) && acWith(m, { a: k }) >= N().acBase({ merc: m }));
    const ok = bs.filter(d.slot === 'a' ? fitA : fitW); if (!ok.length) return null;
    return pickW(ok, k => (ms.some(m => S().eq(m)[d.slot === 'a' ? 'a' : 'w'] === k) ? 4 : 1), rng);
  }
  // 마법 물건: 희귀도를 상한 안에서 뽑고(우두머리는 두 번 뽑아 높은 쪽), 고정 물건 60% · 랜다트 40%. 파티 누군가가 쓸 수 있는 것만
  function rollMagic(floor, type, rng, f, party) {
    const ms = alive(party), c = cap(floor, type), A = G.D.ARTS, own = new Set((f.trinkets || []).map(t => t.k).filter(Boolean));
    const rr = () => pickW([1, 2, 3, 4].filter(r => r <= c), r => R_W[r], rng), r = type === 'boss' ? Math.max(rr(), rr()) : rr();
    // 굴린 것(drop)으로: 무기 · 갑옷이면 종류를 붙인다. 아무도 못 쓰면 null
    const made = (d, t) => { const kd = kindOf(t); if (kd === 'weapon' || kd === 'armor') { const base = bind(def(t), ms, rng); return base ? { ...d, base } : null; } return ms.some(m => can(m, { kind: 'magic', t }, f).ok) ? d : null; };
    const art = k => made({ kind: 'art', k }, { k, id: 0 }), rand = rd => made({ kind: 'rand', rand: rd }, { rand: rd, id: 0 });
    const tryArts = ks => { for (const k of ks.slice().sort(() => rng() - 0.5).slice(0, 24)) { const d = art(k); if (d) return d; } return null; };
    if (rng() < 0.6) { const d = tryArts(Object.keys(A).filter(k => (A[k].r || 1) === r && A[k].props?.length && !own.has(k))); if (d) return d; }
    for (let i = 0; i < 16; i++) { const rd = T().randart(floor * 4); if (rd.r <= c) { const d = rand(rd); if (d) return d; } }
    return tryArts(Object.keys(A).filter(k => (A[k].r || 1) <= c && A[k].props?.length && !own.has(k)));
  }
  // 하나 굴린다. type = fight | elite | boss | treasure | shop
  function roll(floor, type, rng = Math.random, f = G.S.w.fantasy, party = []) {
    const pm = (P_MAGIC[type] ?? 0.3) * (floor <= 2 && type !== 'boss' ? 0.5 : 1);
    return (rng() < pm ? rollMagic(floor, type, rng, f, party) || rollBase(floor, rng, f, party) : rollBase(floor, rng, f, party) || rollMagic(floor, type, rng, f, party));
  }
  // 그 방에서 나오는 것들 (보통 전투 15% · 정예 하나 · 우두머리 둘 · 보물 방 하나)
  function drops(floor, type, rng = Math.random, f = G.S.w.fantasy, party = []) {
    const n = N_DROP[type] ?? 0, k = n >= 1 ? n : rng() < n ? 1 : 0, out = [];
    for (let i = 0; i < k; i++) { const d = roll(floor, type, rng, f, party); if (d && !out.some(q => q.kind === d.kind && q.k && q.k === d.k)) out.push(d); }
    return out;
  }

  // ── 가방 ──
  function take(f, d, floor = 1) {
    if (d.kind === 'base') { const e = { id: f.gearUid = (f.gearUid || 0) + 1, slot: d.slot, k: d.k }; (f.gearBag = f.gearBag || []).push(e); return { kind: 'base', e }; }
    const t = { id: f.trUid = (f.trUid || 0) + 1, lv: floor, on: null }; if (d.kind === 'art') { t.k = d.k; (f.artSeen = f.artSeen || []).push(d.k); } else t.rand = d.rand;
    const kd = kindOf(t); if (kd === 'weapon' || kd === 'armor') t.base = d.base || bases(def(t))[0]; // 종류가 안 붙어 온 것(3택1 · 시험)은 첫 종류로
    T().all(f).push(t); return { kind: 'magic', t };
  }
  const bag = f => [...(f.gearBag || []).map(e => ({ kind: 'base', e })), ...T().store(f).map(t => ({ kind: 'magic', t }))];
  const count = f => (f.gearBag || []).length + T().store(f).length;
  const SLOT_N = { w: '주 무기', o: '보조 손', a: '갑옷', s: '방패', t: '장신구', t1: '장신구', t2: '장신구' };
  const slotOf = x => view(x).slot;
  const PROP_N = { versatile: '양용', two: '양손', light: '경량', finesse: '기교', heavy: '중량', reach: '긴 닿기', thrown: '투척', ammo: '탄약', loading: '장전' };
  const wLine = k => { const w = S().WEAPON[k], mas = S().MASTERY[w.m], pr = (w.props || []).filter(q => PROP_N[q]).map(q => PROP_N[q]); return [`${w.n} · ${w.dn}d${w.dd}${w.vd ? ` (양손 ${w.dn}d${w.vd})` : ''} · ${w.rng === 'ranged' ? '원거리' : '근접'} · ${w.cat === 'martial' ? '군용' : '단순'}`, ...(pr.length ? [pr.join(' · ')] : []), ...(mas ? [`${mas[0]}: ${mas[1]}`] : [])]; };
  const aLine = k => { const a = S().ARMOR[k]; return [`${a.n} · AC ${a.base}${a.dexMax > 0 ? ` + 민첩(최대 ${a.dexMax})` : a.dexMax === 0 ? '' : ' + 민첩'} · ${S().CAT_N?.[a.cat] || a.cat}`, ...(a.stealth ? ['은신 불리'] : [])]; };
  // 물건 카드에 적을 것: { n, ic, r, rn, slot, slotN, lines: [효과 한 줄씩] }
  function info(x) {
    if (x.kind === 'art') return info({ kind: 'magic', t: { k: x.k, id: 0, base: x.base } });
    if (x.kind === 'rand') return info({ kind: 'magic', t: { rand: x.rand, id: 0, base: x.base } });
    if (x.kind === 'magic') { const t = x.t, d = def(t), kd = kindOf(t), sl = SLOT_OF[kd], base = t.base ? (kd === 'armor' ? aLine(t.base) : wLine(t.base)) : [];
      return { n: nameOf(t), ic: d.ic || '', r: d.r || 1, rn: R_N[d.r || 1], slot: sl, slotN: kd === 'focus' ? '무기 · 주문 직업' : kd === 'shield' ? '보조 손 · 방패' : kd === 'armor' ? '방어구' : SLOT_N[sl],
        lines: [...base, ...T().tags(t), ...(att(t) ? ['조율 필요'] : []), ...(sl === 't' && d.fit ? [`쓰는 직업: ${d.fit.map(c => G.D.F.allies[c]?.n || c).join(' · ')}`] : [])] }; }
    const v = view(x);
    if (v.slot === 's') return { n: '방패', ic: '🛡️', r: 0, rn: '', slot: 's', slotN: '보조 손 · 방패', lines: ['AC +2', '한 손을 쓴다'] };
    if (v.slot === 'a') return { n: S().ARMOR[v.k].n, ic: '🥋', r: 0, rn: '', slot: 'a', slotN: '방어구', lines: aLine(v.k) };
    return { n: S().WEAPON[v.k].n, ic: S().WEAPON[v.k].rng === 'ranged' ? '🏹' : '⚔️', r: 0, rn: '', slot: 'w', slotN: SLOT_N.w, lines: wLine(v.k) };
  }
  // 끼운다 (at = 't1' | 't2' — 장신구 둘이 다 찼을 때 바꿀 자리). 들던 것은 가방으로: 기본 장비는 가방 줄로, 마법 물건은 벗긴다.
  // 마법 무기 · 갑옷은 한 물건이라 그 종류(t.base)가 곧 든 무기 · 입은 갑옷이 된다. 양손 무기를 들면 방패를 내린다
  function equip(f, m, x, at = null) {
    if (!can(m, x, f, at).ok) return false;
    const e = S().eq(m), h = held(f, m), v = view(x), B = f.gearBag = f.gearBag || [], put = (slot, k) => B.push({ id: f.gearUid = (f.gearUid || 0) + 1, slot, k }), off = t => { if (t) t.on = null; };
    if (x.kind === 'base') { const i = B.indexOf(x.e); if (i < 0) return false; B.splice(i, 1); }
    const dropShield = () => { if (!e.shield) return; if (h.s) off(h.s); else put('s', 'shield'); e.shield = false; }, dropOff = () => { if (G.Gear.off(m)) { put('w', e.w2); e.w2 = null; } };
    if (at === 'o' && v.slot === 'w') { dropShield(); dropOff(); e.w2 = v.k; e.w2init = true; T().sync?.(f); return true; } // 보조 손에 둘째 경량 무기
    if (v.slot === 'w' && v.kind === 'focus') { off(h.w); x.t.on = m.uid; }                                    // 지팡이류: 든 무기는 그대로 두고 손에 든다
    else if (v.slot === 'w') { if (h.w && kindOf(h.w) === 'weapon') off(h.w); else { off(h.w); if (e.w && S().WEAPON[e.w] && e.w !== 'unarmed') put('w', e.w); } e.w = v.k; if (x.kind === 'magic') x.t.on = m.uid; if (two(v.k)) dropShield(); if (!light(v.k)) dropOff(); }
    else if (v.slot === 'a') { if (h.a) off(h.a); else if (e.a && e.a !== 'none') put('a', e.a); e.a = v.k; if (x.kind === 'magic') x.t.on = m.uid; }
    else if (v.slot === 's') { dropShield(); dropOff(); e.shield = true; if (x.kind === 'magic') x.t.on = m.uid; }
    else { if (h.t.length >= 2) off(h.t[at === 't1' ? 0 : 1]); x.t.on = m.uid; }
    T().sync?.(f); return true;
  }
  // 벗는다: slot = a | s | t1 | t2, 그리고 w에 든 지팡이류 (무기는 못 벗는다 — 바꿔 들 뿐)
  function unequip(f, m, slot) {
    const e = S().eq(m), h = held(f, m), B = f.gearBag = f.gearBag || [], put = (s, k) => B.push({ id: f.gearUid = (f.gearUid || 0) + 1, slot: s, k });
    if (slot === 'w') { if (!h.w || kindOf(h.w) !== 'focus') return false; h.w.on = null; }
    else if (slot === 's' || slot === 'o') { if (G.Gear.off(m)) { put('w', e.w2); e.w2 = null; } else { if (!e.shield) return false; if (h.s) h.s.on = null; else put('s', 'shield'); e.shield = false; } }
    else if (slot === 'a') { if (!e.a || e.a === 'none') return false; if (h.a) h.a.on = null; else put('a', e.a); e.a = 'none'; }
    else { const t = h.t[slot === 't1' ? 0 : 1]; if (!t) return false; t.on = null; }
    T().sync?.(f); return true;
  }
  // 그 사람이 낀 것: 칸마다 { slot, slotN, group(무기 · 방어구 · 장신구), n, sub, r, empty, off(벗을 수 있나) }
  function worn(f, m) {
    const e = S().eq(m), w = S().weaponOf(m), a = S().armorOf(m), h = held(f, m), q = N().gearWeapon(m), tag = t => T().tags(t).join(' · '), R = t => (t ? def(t).r || 1 : 0);
    const row = (slot, group, n, sub, r = 0, empty = false, off = !empty) => ({ slot, slotN: SLOT_N[slot], group, n, sub, r, empty, off });
    const hit = `${q.n}d${q.d}${q.b ? (q.b > 0 ? '+' : '') + q.b : ''} · 명중 ${N().hit({ merc: m }) >= 0 ? '+' : ''}${N().hit({ merc: m })}`;
    const focus = h.w && kindOf(h.w) === 'focus';
    return [
      focus ? row('w', '무기', nameOf(h.w), tag(h.w), R(h.w)) : row('w', '무기', h.w ? nameOf(h.w) : w.n, `${hit}${h.w ? ' · ' + tag(h.w) : ''}${caster(m) ? ' · 주문으로 싸운다' : ''}`, R(h.w), false, false),
      (o2 => (o2 ? row('o', '무기', S().WEAPON[o2].n, `보조 손 · ${S().WEAPON[o2].dn}d${S().WEAPON[o2].dd}${(G.Opt?.of?.(m) || []).includes('fs_twf') ? '' : ' (능력치 없음)'}`) : row('o', '무기', h.s ? nameOf(h.s) : e.shield ? '방패' : two(e.w) ? '양손으로 든다' : '보조 손 비었다', h.s ? tag(h.s) : e.shield ? 'AC +2' : '', R(h.s), !e.shield, e.shield)))(G.Gear.off(m)),
      row('a', '방어구', h.a ? nameOf(h.a) : a.cat === 'none' ? (m.cls === 'barbarian' || m.cls === 'monk' ? '비무장 방어' : '갑옷 없음') : a.n, `AC ${N().acBase({ merc: m })}${h.a ? ' · ' + tag(h.a) : ''}`, R(h.a), a.cat === 'none'),

      ...[0, 1].map(i => (h.t[i] ? row('t' + (i + 1), '장신구', nameOf(h.t[i]), tag(h.t[i]), R(h.t[i])) : row('t' + (i + 1), '장신구', '없음', '', 0, true))),
    ];
  }
  // 그 칸에 끼울 수 있는 가방 속 물건: [{ x, ok, why, cmp }]
  // 보조 손(o): 방패와, 경량 무기 (둘째 무기로)
  const options = (f, m, slot) => bag(f).filter(x => (slot === 'o' ? slotOf(x) === 's' || (x.kind === 'base' && x.e.slot === 'w' && light(x.e.k)) : slotOf(x) === slot[0])).map(x => { const o = slot === 'o' && slotOf(x) === 'w', c = can(m, x, f, o ? 'o' : null); return { x, ok: c.ok, why: c.why || '', cmp: !c.ok ? '' : o ? '보조 손에 든다' : cmp(m, x, f) }; });

  // ── 상인 ──
  const price = d => { if (d.kind === 'base') { const gp = d.slot === 's' ? 10 : (d.slot === 'a' ? S().ARMOR[d.k] : S().WEAPON[d.k]).gp || 0; return Math.max(10, Math.min(250, Math.round(10 + gp / 4))); } return PRICE_R[info(d).r] || 120; };
  // 상인의 장비: 기본 장비 둘 · 셋(파티에 쓸모 있는 것) + 35%로 마법 물건 하나
  function stock(floor, rng = Math.random, f = G.S.w.fantasy, party = []) {
    const out = [], key = d => d.kind + (d.slot || '') + (d.k || d.rand?.n);
    for (let i = 0, g = 0; out.length < 2 + (rng() < 0.5 ? 1 : 0) && g < 12; g++) { const d = rollBase(Math.min(10, floor + 1), rng, f, party); if (d && !out.some(q => key(q) === key(d))) out.push(d); }
    if (rng() < 0.35) { const d = rollMagic(floor, 'shop', rng, f, party); if (d) out.push(d); }
    return out.map(d => ({ d, cost: price(d) }));
  }
  return { R_CAP, R_N, GP_CAP, N_DROP, SLOT_N, cap, roll, drops, take, bag, count, info, can, cmp, better, equip, unequip, worn, options, slotOf, price, stock, kindOf, bases, att, attuned, nameOf, held, off };
})();
