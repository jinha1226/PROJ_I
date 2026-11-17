'use strict';
// 다중 직업 (SRD 5.2.1 Multiclassing, DESIGN.md 165): m.mc = [{ cls, lv, adv, skills }] — 첫 직업은 m.cls, 그 레벨은 m.lv − Σ(다른 직업 레벨).
// 캐릭터 레벨(숙련 · 경험치 · 소마법)은 m.lv. 직업 기능 · 그 직업의 자원 · 주문 목록은 그 직업의 레벨로 본다 (직업 시점: MC.view).
// 선행 조건: 지금 직업들과 새 직업의 주 능력치가 모두 13 이상. 히트 다이스는 직업마다 · 내성은 첫 직업만 · 다중 직업 숙련 표 · 주문 슬롯은 다중 직업 시전자 표 · 추가 공격은 겹치지 않는다
G.MC = (() => {
  const D = G.D, Gd = () => G.Guild, DN = () => G.Dnd;
  // [그룹]: 그룹마다 하나 이상이 13 — 파이터는 근력이나 민첩, 몽크는 민첩과 지혜 …
  const REQ = { barbarian: [['str']], bard: [['cha']], cleric: [['wis']], scout: [['wis']], dragoon: [['str', 'dex']], monk: [['dex'], ['wis']], paladin: [['str'], ['cha']], archer: [['dex'], ['wis']], rogue: [['dex']], mage: [['cha']], warlock: [['cha']], archmage: [['int']] };
  const FULLC = new Set(['bard', 'cleric', 'scout', 'mage', 'archmage']), HALFC = new Set(['paladin', 'archer']);
  // 다중 직업으로 얻는 숙련 (SRD 표)
  const PROF = { barbarian: { shield: 1, martial: 1 }, bard: { light: 1 }, cleric: { light: 1, medium: 1, shield: 1 }, scout: { light: 1, shield: 1 }, dragoon: { light: 1, medium: 1, shield: 1, martial: 1 }, monk: {}, paladin: { light: 1, medium: 1, shield: 1, martial: 1 }, archer: { light: 1, medium: 1, shield: 1, martial: 1 }, rogue: { light: 1 }, mage: {}, warlock: { light: 1 }, archmage: {} };
  const FULL = [[2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
  const PACT = lv => (lv < 1 ? null : { n: lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1, s: lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : lv >= 3 ? 2 : 1 });
  const base = m => (m && m.__base) || m;
  const MC = {
    REQ, PROF,
    on: m => !!(m && base(m).mc && base(m).mc.length),
    list(m) { m = base(m); const sec = m.mc || [], p = m.lv - sec.reduce((a, c) => a + c.lv, 0); return [{ cls: m.cls, lv: p, adv: m.adv, prim: true }, ...sec]; },
    lvOf(m, cls) { m = base(m); if (!MC.on(m)) return m.cls === cls ? m.lv : 0; return MC.list(m).find(c => c.cls === cls)?.lv || 0; },
    base,
    // 직업 시점: 그 직업 · 그 레벨 · 그 하위 직업 · 그 직업의 준비 주문으로 본 같은 사람 (자원 · 상태는 원래 사람 것)
    view(m, cls) {
      m = base(m); if (!MC.on(m)) return m; const L = MC.list(m), e = L.find(c => c.cls === cls) || L[0];
      if (!Object.prototype.hasOwnProperty.call(m, '__views')) Object.defineProperty(m, '__views', { value: {}, enumerable: false, writable: true });
      const key = `${e.cls}:${e.lv}:${e.adv || ''}`; let v = m.__views[e.cls];
      if (!v || v.__key !== key) {
        v = Object.create(m);
        Object.defineProperties(v, { cls: { value: e.cls, writable: true }, lv: { value: e.lv, writable: true }, adv: { value: e.adv || null, writable: true }, __base: { value: m }, __key: { value: key },
          skills: { get: () => (e.prim ? m.skills : (e.skills || (e.skills = []))), set: s => { if (e.prim) m.skills = s; else e.skills = s; } } });
        m.__views[e.cls] = v;
      }
      return v;
    },
    // 기능 · 주문이 어느 직업의 것인가 (그 직업 목록 · 하위 직업 · 레벨표)
    ownerOf(m, k) { m = base(m); const L = MC.list(m), S = D.MSKILLS[k]; for (const c of L) { if (c.adv && D.ADV[c.adv]?.sig.includes(k)) return c.cls; } for (const c of L) { if ((typeof S?.lv === 'object' && S.lv[c.cls] != null) || D.MPOOL[c.cls]?.includes(k) || (!c.prim && c.skills?.includes(k))) return c.cls; } return m.cls; },
    viewFor: (m, k) => (MC.on(m) ? MC.view(m, MC.ownerOf(m, k)) : m),
    // 선행 조건 (SRD): 지금 직업 모두와 새 직업
    meets(m, cls) { const ab = DN().ab(base(m)); return (REQ[cls] || []).every(g => g.some(a => ab[a] >= 13)); },
    canAdd(m, cls) { m = base(m); if (!REQ[cls] || m.lv >= 20) return false; return MC.list(m).every(c => MC.meets(m, c.cls)) && MC.meets(m, cls); },
    // 주문 슬롯 (SRD 다중 직업 시전자): 바드 · 클레릭 · 드루이드 · 소서러 · 위저드 레벨 + 팔라딘 · 레인저 레벨의 절반(올림). 워락 계약 마법은 따로 (짧은 휴식)
    casterLv(m) { return MC.list(m).reduce((a, c) => a + (FULLC.has(c.cls) ? c.lv : HALFC.has(c.cls) ? Math.ceil(c.lv / 2) : 0), 0); },
    pact: m => PACT(MC.lvOf(m, 'warlock')),
    slots(m) { const cl = MC.casterLv(m), row = (cl ? FULL[Math.min(20, cl) - 1] : []).slice(), p = MC.pact(m); if (p) { while (row.length < p.s) row.push(0); row[p.s - 1] += p.n; } return row; },
    // 히트 다이스 (SRD): 1레벨은 첫 직업 주사위 최대, 그 뒤 레벨마다 그 직업 주사위의 평균 + 1
    hdPart(m) { const L = MC.list(m); let v = 0; for (const c of L) { const h = DN().cls({ cls: c.cls }).hd; v += c.prim ? h + (c.lv - 1) * (h / 2 + 1) : c.lv * (h / 2 + 1); } return v; },
    shield: m => MC.on(m) && MC.list(m).some(c => !c.prim && PROF[c.cls]?.shield),
    armor: (m, cat) => MC.on(m) && MC.list(m).some(c => !c.prim && PROF[c.cls]?.[cat]),
    martial: m => MC.on(m) && MC.list(m).some(c => !c.prim && PROF[c.cls]?.martial),
    // 레벨이 올랐다: 고른 직업(m.nextCls)이 조건을 채우면 그 직업에. 하위 직업은 그 직업 3레벨에
    levelUp(m) {
      const pick = m.nextCls;
      if (!pick || pick === m.cls || !MC.canAdd({ ...m, lv: m.lv - 1, __base: null, mc: m.mc }, pick)) return m.cls;
      m.mc = m.mc || []; let e = m.mc.find(c => c.cls === pick); if (!e) { e = { cls: pick, lv: 0, skills: [] }; m.mc.push(e); }
      e.lv++; if (e.lv >= 3 && !e.adv) e.adv = Object.keys(D.ADV).find(a => D.ADV[a].base === pick) || null;
      return pick;
    },
    label(m) { m = base(m); return MC.list(m).map(c => `${D.F.allies[c.cls]?.n || c.cls} ${c.lv}`).join(' / '); },
  };
  // ── 기존 계산을 직업마다로 ──
  const G0 = Gd();
  { const t0 = G0.traits; G0.traits = m => (MC.on(m) && !m.__base ? [...new Set(MC.list(m).flatMap(c => t0(MC.view(m, c.cls))))] : t0(m)); }
  { const p0 = G0.picks; G0.picks = m => (MC.on(m) && !m.__base ? [...new Set(MC.list(m).flatMap(c => p0(MC.view(m, c.cls))))] : p0(m)); }
  { const g0 = G0.grow; G0.grow = m => { if (m.lvSeen == null) m.lvSeen = m.lv - 1; let cls = m.cls; while (m.lvSeen < m.lv) { m.lvSeen++; cls = MC.levelUp(m); } return g0(MC.on(m) ? MC.view(m, cls) : m); }; }
  { const N = DN(), h0 = N.srdHP; N.srdHP = m => { if (!MC.on(m) || m.__base) return h0(m); const h = N.cls(m).hd, prim = h + (m.lv - 1) * (h / 2 + 1); return Math.max(1, h0(m) - prim + MC.hdPart(m)); }; }
  { const N = DN(), a0 = N.attacks; N.attacks = a => (a.merc && MC.on(a.merc) && !a.merc.__base ? Math.max(...MC.list(a.merc).map(c => a0({ ...a, merc: MC.view(a.merc, c.cls) }))) : a0(a)); } // 추가 공격은 겹치지 않는다 (SRD)
  { const N = DN(), s0 = N.sneak; N.sneak = (rt, a, tg, adv) => { if (!a.merc || !MC.on(a.merc) || !MC.lvOf(a.merc, 'rogue')) return s0(rt, a, tg, adv); const m0 = a.merc; a.merc = MC.view(m0, 'rogue'); try { return s0(rt, a, tg, adv); } finally { a.merc = m0; } }; } // 급소 공격: 로그 레벨
  { const S = G.SRD, w0 = S.canW, a0 = S.canA; S.canW = (m, k) => w0(m, k) || (MC.martial(m) && S.WEAPON?.[k]?.cat === 'martial') || (MC.on(m) && S.WEAPON?.[k]?.cat === 'simple'); S.canA = (m, k) => a0(m, k) || (S.ARMOR?.[k] && MC.armor(m, S.ARMOR[k].cat)); }
  return MC;
})();
