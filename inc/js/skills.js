'use strict';
// 개인 기술 (DESIGN.md 43 · 56): 직업 풀에서 한 사람 넷 + 서브클래스 기능. 전부 자동 — 사람마다 쿨다운(a.cds)을 따로 돈다.
// when(c, x) = 지금 쓸 만한가, run(c, x) = 쓴다(false면 쓰지 않은 것으로 — 쿨다운도 돌지 않는다). 효과는 js/srd.js.
// 기술은 주로 상태이상을 건다. 걸린 상태를 규칙대로 받아치는 것은 트리의 연계기(G.Combo).
G.Skill = (() => {
  const D = G.D;
  const F = () => G.Fantasy;
  const GAP = 0.8, LV_K = 0.15, RIDER_MIN = 0.3;
  // 시전자 공격력 × 배율 × 스킬 레벨(+15%/레벨)
  const pow = c => 1 + LV_K * (G.Guild.skillLv(c.merc) - 1);
  // 기술 효과는 js/srd.js가 채운다 (SRD 직업 기술 · 주문 — DESIGN.md 56)
  const SK = {};

  // 기술의 피해 종류 (SRD 주문 이름에서): 없으면 그 사람의 기본 공격 종류
  const TYPE = [[/thunderwave|shatter/i, 'thunder'], [/spike/i, 'piercing'], [/ice storm/i, 'bludgeoning'], [/meteor/i, 'fire'], [/fire|flame|burn|searing|scorch|rebuke|breath/i, 'fire'], [/frost|cold|chill/i, 'cold'], [/lightning|storm/i, 'lightning'], [/acid/i, 'acid'], [/poison|spray/i, 'poison'], [/radiant|sacred|guiding|smite|moon|holy|dawn|turn undead|spirit guardians/i, 'radiant'], [/necrotic|vampiric|blight|inflict|harm|hex/i, 'necrotic'], [/psychic|mock|dissonant|wrack|hurl/i, 'psychic'], [/force|magic missile|eldritch|spiritual|quivering|hunter/i, 'force']];
  const spellType = k => { if (SK[k]?.dt) return SK[k].dt; const en = D.MSKILLS[k]?.en || ''; for (const [re, t] of TYPE) if (re.test(en)) return t; return null; };
  const skillType = (k, a) => { if (SK[k]?.dt) return SK[k].dt; const en = D.MSKILLS[k]?.en || ''; for (const [re, t] of TYPE) if (re.test(en)) return t; return G.Dnd.weapon(a).t; };
  // 자기 차례 밖에 저절로 나가는 기술
  const REACT = { sr_shield: 1, sr_rebuke: 1, sr_uncanny: 1, sr_deflect: 1, sr_cutting: 1, sr_retal: 1 }, AUTO_RES = { sr_shield: { slot: 1 }, sr_rebuke: { slot: 1 }, sr_indom: { long: 1 }, sr_luck: { long: 1 } };
  const Sk = {
    SK, pow, spellType, skillType,
    // 설명 + 전투당 횟수
    // 무엇을 소모하나: 행동 · 추가 행동 · 반응 · 늘 적용 (게임에서 실제로 쓰는 칸)
    kindOf: k => (D.MSKILLS[k]?.explore ? '탐험' : REACT[k] || SK[k]?.react ? '반응' : D.MSKILLS[k]?.passive ? '늘 적용' : SK[k]?.free ? '소모 없음' : SK[k]?.bonus ? '추가 행동' : '행동'),
    resOf: k => SK[k]?.res || AUTO_RES[k] || null,
    desc(m, k) { const S = D.MSKILLS[k], R0 = Sk.resOf(k); const kd = Sk.kindOf(k); return `${kd === '늘 적용' || kd === '탐험' ? '' : `[${kd}] `}${S.d}${R0 ? ` · 전투당 ${G.Res.usesOf(m, R0, k)}번` : ''}`; },
    // 동료 한 명: 열린 칸의 스킬 중 쿨다운이 끝났고 쓸 만한 것 하나 (한 번 쓰면 GAP초 쉰다)
    tick(f, rt, a, dt, seen, bonus) {
      if (G.Skill.persist && !bonus && dt) G.Skill.persist(f, rt, a, dt);
      if (!a.merc || a.dead) return;
      const pri = a.merc.skPri, rank = p => { if (SK[p]?.prio) return 1000 + SK[p].prio; const i = pri ? pri.indexOf(p) : -1; return i >= 0 ? 100 - i : G.Res.cost(a.merc, SK[p]?.res); }, dealt = p => { const t = spellType(p); if (!t || !seen.length) return 1; return Math.max(...seen.map(o => (o.stat ? G.Foe.typeK(o, t, a) + (t === 'fire' && G.Foe.needsFire(o) ? 2 : 0) : 1))); };
      const list = G.Guild.active(a.merc).slice().sort((p, q) => rank(q) - rank(p) || dealt(q) - dealt(p)); // 사람이 정한 순서, 아니면 큰 것부터. 같으면 더 잘 드는 종류
      for (const k of list) {
        const S = SK[k];
        const quick = bonus && S && !S.bonus && S.res && S.res.slot && G.Opt.can(a, 'sr_quicken'); // 주문 가속 (SRD): 주문을 추가 행동으로
        if (!S || S.rider) continue; // 맞힌 뒤에 붙는 기술은 G.Skill.onHit
        if (bonus === 'free' ? !S.free || (a.freeDone && a.freeDone[k]) : S.free) continue; // 행동도 추가 행동도 안 쓰는 기능: 차례 첫머리에 한 번씩
        if (bonus !== 'free' && (!!S.bonus !== !!bonus && !quick)) continue;
        if (!G.Res.can(a.merc, k, S.res)) continue;
        // SRD: 주문 슬롯을 쓰는 주문은 차례에 하나 · 집중은 한 번에 하나 (이미 집중 중이면 새로 걸지 않는다)
        if (S.res?.slot && (a.slotUsed || bonus === 1)) continue;
        if (S.conc && a.concK) continue;
        if (a.wild && S.res?.slot) continue; // 야생 변신 중엔 주문을 못 쓴다 (SRD)
        // 사거리는 여기서만 건다: 그 기술이 볼 수 있는 적 · 동료를 사거리 안으로 좁힌다
        const reach = D.SK_RANGE[k] != null && k === 'sr_eb' && G.Opt.has(a, 'iv_spear') ? D.SK_RANGE[k] + 3 : D.SK_RANGE[k], x = { f, rt, c: a, reach, base: S.base, seen: reach == null ? seen : seen.filter(o => G.Opt.inReach(a, rt, o, reach)) };
        let one = quick ? 'sr_quicken' : null; // 메타매직은 주문에 하나 (강화 · 추적만 겹친다)
        if (!x.seen.length && reach > 1.5 && !S.heal && S.res?.slot && G.Opt.can(a, 'mm_distant')) { const far = seen.filter(o => Math.hypot(o.x - a.x, o.y - a.y) <= reach * 2); if (far.length) { x.seen = far; x.reach = reach * 2; one = 'mm_distant'; } } // 먼 주문
        let ty = spellType(k), over = null; // 종류가 분명한 공격 주문만 거른다 (버프 · 제어 · 무기 기술은 그대로)
        if (ty && !S.heal && x.seen.length) { if (!one) { over = G.Opt.transmute(a, x.seen, ty); if (over) { ty = over; one = 'mm_trans'; } } const fit = x.seen.filter(o => G.Foe.dealK(a, o, ty) >= 0.5); if (!fit.length) continue; x.seen = fit; } // 안 듣는 적에게 쓰지 않는다
        if (!S.when(a, x)) continue;
        if (S.res && S.res.slot >= 2 && G.Foe.counter(x.rt, a)) { if (bonus) a.lastBonus = k; else a.lastSk = k; return; } // 메이지의 반격 주문
        G.Foe.dtype = over || skillType(k, a); G.Skill.dtOver = over;
        if (S.res && S.res.slot) x.slot = G.Res.castLevel(a.merc, S.res);
        if (S.conc) G.Res.conc(a, k);
        const oc = S.res?.slot && S.res.slot <= 5 && !S.heal && F().sk(a, 'ft_overchannel') && !G.Res.of(a.merc).fu.ft_overchannel;
        if (oc) { G.Res.once(a.merc, 'ft_overchannel'); G.Skill.maxDice = true; }
        const mm = G.Opt.begin(a, k, S, x, one);
        const ran = S.run(a, x);
        G.Opt.end(a, mm, ran);
        G.Skill.maxDice = false;
        G.Foe.dtype = null; G.Skill.dtOver = null;
        if (ran === false) continue;
        G.Res.pay(a.merc, k, S.res);
        if (S.res?.slot) a.slotUsed = true;
        if (bonus === 'free') { (a.freeDone = a.freeDone || {})[k] = 1; } else if (bonus) { a.lastBonus = k; } else a.lastSk = k;
        if (!G.quiet && rt.turn) (a.skLog = a.skLog || []).push(k); // 쓰는 순간: 이름 + 아이콘 번쩍임 (그리는 쪽이 꺼내 간다)
        if (G.Sim) G.Sim.casts[k] = (G.Sim.casts[k] || 0) + 1;
        return;
      }
    },
    // 무기 공격이 맞았다: 강타처럼 맞힌 뒤에 붙는 기술 (차례에 한 번). 추가 행동을 쓰는 것은 추가 행동이 남았을 때만
    onHit(f, rt, a, o) {
      G.Opt.onHit(f, rt, a, o);
      // 축복받은 일격 · 원소의 분노: 차례에 한 번 주사위 (SRD)
      if (a.merc && rt.turn && !a.hit1Done && o.hp > 0) { const kind = F().sk(a, 'ft_bstrike') ? ['radiant', F().sk(a, 'ft_bstrike2') ? 2 : 1] : F().sk(a, 'ft_fury') ? ['fire', F().sk(a, 'ft_fury2') ? 2 : 1] : null; if (kind) { a.hit1Done = true; G.Foe.dtype = kind[0]; F().hurt(f, rt, o, G.Dnd.dice(kind[1], 8) * F().allyAtk(f, a) / Math.max(1, G.Dnd.avg(G.Dnd.weapon(a))) * G.Turn.pace, 'extra', a); G.Foe.dtype = null; } }
      if (!a.merc || !rt.turn || rt.turn.cur !== a || a.lastHitSk) return;
      if (o.hp < o.max * RIDER_MIN && !o.boss) return; // 곧 쓰러질 적에게 아끼기
      for (const k of G.Guild.active(a.merc)) {
        const S = SK[k]; if (!S || !S.rider || !G.Res.can(a.merc, k, S.res)) continue;
        if (S.bonus && a.lastBonus) continue;
        if (S.res?.slot && a.slotUsed) continue;
        if (S.conc && a.concK) continue;
        const reach = D.SK_RANGE[k], x = { f, rt, c: a, reach, base: S.base, seen: [o], slot: S.res?.slot ? G.Res.castLevel(a.merc, S.res) : 0 };
        if (S.conc) G.Res.conc(a, k);
        G.Foe.dtype = skillType(k, a); S.rider(a, x, o); G.Foe.dtype = null;
        G.Res.pay(a.merc, k, S.res); if (S.res?.slot) a.slotUsed = true; if (S.bonus) a.lastBonus = k;
        a.lastHitSk = k;
        if (!G.quiet) (a.skLog = a.skLog || []).push(k);
        if (G.Sim) G.Sim.casts[k] = (G.Sim.casts[k] || 0) + 1;
        return;
      }
    },
    // 지도 밝히기 (정찰 · 지름길 · 보물 감지)
    reveal(rt, cx, cy, R) {
      const m = rt.map; cx = Math.round(cx); cy = Math.round(cy);
      for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) if (x >= 0 && y >= 0 && x < m.w && y < m.h && (x - cx) ** 2 + (y - cy) ** 2 <= R * R) rt.seen[y * m.w + x] = 1;
      rt.seenVer++;
    },
  };
  return Sk;
})();
