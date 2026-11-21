'use strict';
// 직접 조종 (2026-11-21, 사용자: 「eslabong처럼 캐릭터 하나만 직접 조작 … 이동 공격 스킬사용을 주사위 눈금 보고」 · 「모든 파티원을 조작하는 형태로 갈 수도 있으니까 모듈형태로」)
// - 누구를 조종하나는 집합(hand — 용병 uid)이다. 지금은 한 명(only), 나중에 전원(all)도 같은 코드로 된다. 집합 밖의 사람은 스킬 AI가 움직인다.
// - 조종하는 사람의 차례가 오면 차례 엔진(G.Turn)이 멈추고(st.ph 'input') 명령을 기다린다. 이동 · 공격 · 기술은 AI 차례와 같은 엔진 함수(G.Turn.io)를 부른다.
// - 그 차례의 눈은 운명판의 그 사람 다음 칸 (G.Dice.dieOf) — 미리보기(G.SkillAI.preview)가 그 눈으로 맞음 · 빗나감을 가른다.
// - 명령: { move: {x, y} } 남은 이동력 안에서 걷는다(행동 앞에, 나눠 걸어도 된다) · { atk: 적 } 기본 공격 → 차례 끝 · { sk: 기술, tg? } 기술 — 추가 행동 기술이면 차례가 이어지고, 행동 기술이면 끝
//   · { end: true } 차례 끝 · { auto: true } 이번 차례만 AI에게. 돌려주는 것: { ok, why? }
// 화면 없이 돈다 (화면은 js/app/fight.js가 view()를 그리고 cmd()를 부른다).
G.Ctrl = (() => {
  const SK = () => G.Skill.SK, IO = () => G.Turn.io, F = () => G.Fantasy;
  const AREA = k => { const d = G.D.MSKILLS[k]?.d || '', m = /반경 (\d+)칸|곁 (\d+)칸/.exec(d); return m ? +(m[1] || m[2]) : 0; }; // 범위 기술의 반경 (스킬 AI와 같은 읽기)
  const no = why => ({ ok: false, why }), yes = { ok: true };
  const C = {
    hand: new Set(),   // 조종하는 사람들 (용병 uid)
    auto: false,       // 모두 자동 (잡몹 전투: 조종하는 사람도 AI가)
    is: e => !!(e?.merc && !C.auto && C.hand.has(e.merc.uid)),
    set(m, on = true) { if (!m?.uid) return; if (on) C.hand.add(m.uid); else C.hand.delete(m.uid); },
    only(m) { C.hand.clear(); C.set(m); },          // 한 명만 (Eslabong 방식)
    all(ms) { C.hand.clear(); for (const m of ms) C.set(m); }, // 전원
    clear() { C.hand.clear(); },
    // 지금 명령을 기다리는 차례 (없으면 null)
    cur: rt => (rt?.turn?.ph === 'input' && rt.turn.inp ? rt.turn.inp : null),
    // 차례 엔진이 부른다: 조종하는 사람의 차례가 왔다
    begin(f, rt, st, e) { st.ph = 'input'; st.t = 0; st.tg = null; st.inp = { e, used: 0, bonus: false }; },
    // 화면이 그릴 것: 눈 · 남은 이동력 · 갈 수 있는 칸 · 적(칠 수 있나 · 미리보기) · 기술(쓸 수 있나 · 추가 행동인가)
    view(f, rt) {
      const I = C.cur(rt); if (!I) return null; const e = I.e, io = IO(), m = rt.map;
      const left = G.Dnd.held(e) ? 0 : Math.max(0, io.moveOf(e) - I.used), ov = G.Tactics.overlay(rt, e, left, io.reach(e), []);
      const move = [...ov.move.keys()].map(k => ({ x: k % m.w, y: Math.floor(k / m.w) }));
      const seen = io.seenBy(rt, e);
      const foes = seen.map(o => ({ e: o, can: io.canHit(m, e, e.x, e.y, o), pv: G.SkillAI?.preview(f, rt, e, 'basic', o) || null }));
      const skills = G.Guild.active(e.merc).filter(k => SK()[k] && !SK()[k].rider && !SK()[k].free && !/^it_/.test(k)).map(k => { const S = SK()[k], bonus = !!S.bonus; // 물건 충전(it_ — 경이의 완드 …)은 기술 막대에 안 둔다
        return { k, n: G.D.MSKILLS[k]?.n || k, bonus, area: AREA(k), heal: !!S.heal, ok: !(bonus && I.bonus) && G.Skill.usable(f, rt, e, k, seen, bonus ? 'bonus' : 'action', true, true), left: G.Res.left ? G.Res.left(e.merc, S.res, k) : null }; });
      const Dc = G.Dice, die = Dc?.st?.die.get(e) || Dc?.dieOf?.(e) || null; // 이번 라운드 칸을 반응 공격으로 이미 썼으면 그 눈 (그 라운드 굴림은 모두 그 눈)
      return { e, die, left, move, foes, skills, bonusUsed: I.bonus };
    },
    // 그 기술을 그 적에게 쓰면 (화면의 미리보기)
    preview: (f, rt, k, tg) => { const I = C.cur(rt); return I && G.SkillAI ? G.SkillAI.preview(f, rt, I.e, k, tg) : null; },
    cmd(f, rt, c) {
      const I = C.cur(rt); if (!I) return no('차례가 아니다'); const st = rt.turn, e = I.e, io = IO();
      if (c.move) {
        const { x, y } = c.move, left = G.Dnd.held(e) ? 0 : io.moveOf(e) - I.used; if (left <= 0) return no('이동력이 없다');
        const path = G.Tactics.plan(rt, e, { x, y }, left, (u, v) => u === x && v === y, true), end = path[path.length - 1];
        if (!path.length || end.x !== x || end.y !== y) return no('갈 수 없다');
        const px = e.x, py = e.y; G.Tactics.walk(e, path, io.MOVE_V, 99); F().fieldMove(f, rt, e, px, py); io.opportunity(f, rt, st, e, px, py); // 기회 공격 (SRD)
        I.used += path.length; e.walked = I.used;
        if (io.gone(rt, e) || e.dying || rt.phase === 'dead') { st.inp = null; io.pause(st, io.SKIP); }
        return yes;
      }
      if (c.atk) {
        const tg = c.atk; if (!io.foes(rt).includes(tg) || tg.hp <= 0) return no('칠 수 없는 상대');
        if (!io.canHit(rt.map, e, e.x, e.y, tg)) return no('닿지 않는다');
        st.inp = null; st.tg = tg; io.strike(f, rt, st, e, tg); return yes; // 명중 굴림 → act → 차례 끝 (AI 차례와 같은 길)
      }
      if (c.sk) {
        const k = c.sk, S = SK()[k]; if (!S || !G.Guild.active(e.merc).includes(k)) return no('없는 기술');
        const bonus = !!S.bonus; if (bonus && I.bonus) return no('추가 행동을 이미 썼다');
        let seen = io.seenBy(rt, e); const tg = c.tg, r = AREA(k);
        if (tg && tg.kind === 'mon') seen = r ? [tg].concat(seen.filter(o => o !== tg && Math.hypot(o.x - tg.x, o.y - tg.y) <= r)) : [tg]; // 고른 적 (범위면 그 둘레까지)
        if (!G.Skill.usable(f, rt, e, k, seen, bonus ? 'bonus' : 'action', true, true)) return no('지금은 못 쓴다');
        e.plan = { turn: G.Turn.no(), action: bonus ? null : k, bonus: bonus ? k : null, slotOk: bonus, swap: S.conc ? k : null };
        const before = io.snapshot(rt); G.Turn.rec = []; G.Skill.tick(f, rt, e, 0, seen, bonus ? 1 : undefined); const rec = G.Turn.rec; G.Turn.rec = null;
        if ((bonus ? e.lastBonus : e.lastSk) !== k) return no('지금은 못 쓴다');
        io.report(f, rt, e, null, rec, before, G.D.MSKILLS[k]?.n || k);
        if (bonus) { I.bonus = true; if (io.gone(rt, e) || !io.foes(rt).length) { st.inp = null; io.pause(st, io.SKIP); } return yes; }
        st.inp = null; io.pause(st, io.BEAT); return yes;
      }
      if (c.end) { st.inp = null; io.pause(st, io.SKIP); return yes; }
      if (c.auto) { st.inp = null; io.decide(f, rt, st, e); return yes; }
      return no('모르는 명령');
    },
  };
  return C;
})();
