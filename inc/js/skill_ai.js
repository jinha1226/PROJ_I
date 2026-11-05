'use strict';
// 자동 전투의 스킬 고르기 (유틸리티 AI, DESIGN.md 113): 차례마다 쓸 수 있는 스킬에 점수를 매겨 가장 높은 것을 쓴다.
// 점수 단위: 기본 공격 한 번 = 1. 피해는 넘치는 몫을 뺀 값, 회복은 파티 체력의 몫 × 위급함.
// 슬롯은 위협이 낮을수록 아낀다. 기본 공격보다 낮으면 행동에 쓰지 않는다.
G.SkillAI = (() => {
  const D = G.D, SK = () => G.Skill.SK, H = () => G.Skill.H, DN = () => G.Dnd, F = () => G.Fantasy;
  const byEn = {}; for (const id in G.SRD_SP) byEn[G.SRD_SP[id].en] = G.SRD_SP[id];
  const meta = k => byEn[D.MSKILLS[k]?.en] || null;
  const diceAvg = s => { if (!s) return 0; let m = /^(\d+)×(\d+)d(\d+)/.exec(s); if (m) return m[1] * m[2] * (+m[3] + 1) / 2; m = /^(\d+)d(\d+)/.exec(s); return m ? m[1] * (+m[2] + 1) / 2 : 0; };
  const PARTY_ROUNDS = 3, HIT_P = 0.65, SAVE_FAIL = 0.6, SLOT_K = 0.4, HEAL_K = 12, COND_K = 3.5, BUFF_K = 1.5, SUMMON_K = 2, DEFAULT_K = 1;
  const alive = x => (x.rt.party || x.rt.allies || []).filter(p => !p.dead && p.merc);
  const AI = {
    // 위협: 파티가 이 전투를 끝내는 데 드는 라운드 ÷ 3, 체력이 낮거나 보스면 더 높다
    threat(a, x) {
      const foes = x.rt.mons.filter(o => o.hp > 0 && (o.aggro || x.seen.includes(o))), ps = alive(x); if (!foes.length || !ps.length) return 0;
      const hp = foes.reduce((s, o) => s + o.hp, 0), dpr = Math.max(1, ps.reduce((s, p) => s + F().allyAtk(x.f, p) * DN().attacks(p) * HIT_P, 0)), hpK = ps.reduce((s, p) => s + p.hp / p.max, 0) / ps.length;
      return Math.max(0, hp / dpr / PARTY_ROUNDS) + (1 - hpK) + (foes.some(o => o.boss) ? 0.5 : 0);
    },
    // 범위 안에 가장 많이 잡히는 적
    best(x, r) { let top = []; for (const o of x.seen) { const q = x.seen.filter(t => Math.hypot(t.x - o.x, t.y - o.y) <= r); if (q.length > top.length) top = q; } return top; },
    // 기본 공격 한 번의 피해 (넘치는 몫은 뺀다)
    basic(a, x) { const t = x.seen[0]; if (!t) return 1; return Math.max(1, Math.min(t.hp, F().allyAtk(x.f, a) * (DN().caster(a) && a.merc.cls !== 'warlock' ? DN().tier(a) : 1) * DN().attacks(a) * HIT_P)); },
    score(k, a, x, threat) {
      const S = SK()[k], M = D.MSKILLS[k], m = a.merc, o = meta(k), num = G.SkillNum_at?.(k, m.cls, m.lv), res = S.res; if (S.prio) return 2 + S.prio;
      let v;
      const ps = alive(x), tot = Math.max(1, x.seen.reduce((s, q) => s + q.hp, 0)), base = AI.basic(a, x);
      if (S.heal || o?.k === 'heal' || o?.heal) {
        const hurt = ps.filter(p => p.hp < p.max).sort((p, q) => p.hp / p.max - q.hp / q.max), n = o?.n || 1, g = H().G0 ? H().G0(x, a) : 1, each = diceAvg(num?.d) * (p => p.max / Math.max(1, DN().srdHP(p.merc)))(a), healed = hurt.slice(0, n).reduce((s, p) => s + Math.min(p.max - p.hp, each || p.max * 0.2), 0), whole = Math.max(1, ps.reduce((s, p) => s + p.max, 0)), low = hurt[0] ? hurt[0].hp / hurt[0].max : 1, dying = (x.rt.party || []).some(p => p.dying);
        v = hurt.length ? (healed / whole) * HEAL_K * (dying ? 6 : low < 0.25 ? 4 : low < 0.5 ? 2 : 0.6) + (dying ? 12 : low < 0.25 ? 8 : low < 0.5 ? 2 : 0) : 0;
      } else if (num?.d && !S.heal) {
        const r = o?.area || (M.d && /반경 (\d+)칸|곁 (\d+)칸/.exec(M.d)?.slice(1).find(Boolean)) || 0, list = r ? AI.best(x, +r) : o?.n > 1 ? x.seen.slice(0, o.n) : x.seen.slice(0, 1), p = o?.save || num.sv ? SAVE_FAIL + (o?.half ? 0.2 : 0) : HIT_P, g = H().G0(x, a), ty = G.Skill.spellType(k), dmg = list.reduce((s, q) => s + Math.min(q.hp, diceAvg(num.d) * g * p * (ty ? G.Foe.dealK(a, q, ty) : 1)), 0);
        v = dmg / base;
      } else if (o?.k === 'cond' || num?.c?.length) {
        const r = o?.area || 0, list = r ? AI.best(x, r) : x.seen.slice(0, 1), share = list.reduce((s, q) => s + q.hp, 0) / tot; v = COND_K * SAVE_FAIL * share * Math.min(1, threat) * Math.min(4, Math.max(1, list.length));
      } else if (o?.k === 'buff' || /축복|방패|신앙/.test(M.n)) v = BUFF_K * Math.min(1, threat) * (o?.props?.self ? 0.7 : 1);
      else if (o?.k === 'summon' || o?.k === 'field') v = SUMMON_K * Math.min(1, threat);
      else if (!res) v = DEFAULT_K; else v = DEFAULT_K * Math.min(1.5, 0.5 + threat);
      if (res?.slot) { const L = G.Res.castLevel(m, res), left = G.Res.left(m, res, k), need = Math.max(0, 1.2 - Math.min(1, threat)); v -= SLOT_K * L * need * (left <= 1 ? 1.5 : 1); }
      else if (res) v -= 0.1 * Math.max(0, 1 - threat);
      if (S.conc && a.concK) v -= 0.5;
      return v;
    },
    // 스킬 순서와 값: 값이 낮으면 쓰지 않는다 (행동은 기본 공격보다 높아야)
    rank(list, a, x0, bonus) {
      const threat = AI.threat(a, x0), base = bonus ? 0 : 1, out = [];
      for (const k of list) { const S = SK()[k]; if (!S || S.rider) continue; const reach = D.SK_RANGE[k], x = { ...x0, reach, seen: reach == null ? x0.seen : x0.seen.filter(o => Math.hypot(o.x - a.x, o.y - a.y) <= Math.max(reach, 1.5) + 0.5) }; let v; try { v = AI.score(k, a, x.seen.length ? x : x0, threat); } catch (e) { v = 0; } out.push([k, v]); }
      out.sort((p, q) => q[1] - p[1]); AI.last = { threat, base, out: out.slice(0, 6) };
      return out.filter(q => bonus || q[1] > base * 0.9 || !x0.seen.length || SK()[q[0]].heal).map(q => q[0]);
    },
  };
  return AI;
})();
