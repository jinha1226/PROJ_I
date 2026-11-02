'use strict';
// 지휘 (DESIGN.md 32): 맵을 누르는 것은 공격이 아니라 명령이다. 길드장이 원정대에 내리는 지시.
//  몬스터 = 집중 표적(파티 전원이 그 적을 노린다) · 라이벌 = 방침 선택지 · 계단 = 서둘러 내려가기(남은 적을 두고) · 바닥 = 집결 · 원정대 = 그 사람 상태창 (명령 취소는 V)
// 명령이 없어도 원정대는 알아서 움직인다(방치). 「전술 본능」을 배우면 집중 표적도 알아서 고른다.
G.Cmd = (() => {
  const GR = G.Grid;
  const RALLY_T = 25, PICK_R = 0.9, MEMBER_R = 0.6, FOCUS_COL = '#ffd24a';
  const ta = k => G.Tree.add('fantasy', G.S.w.fantasy.tree, k);

  const C = {
    setFocus(rt, m, auto) {
      if (rt.focus && rt.focus.kind === 'mon') rt.focus.ring = null;
      rt.focus = m;
      rt.focusAuto = !!auto;
      if (m) m.ring = FOCUS_COL;
    },
    clear(rt) { C.setFocus(rt, null); rt.rally = null; rt.rush = false; },
    // 누른 칸 → 명령
    click(f, rt, x, y) {
      if (rt.phase === 'dead') return false;
      const m = rt.map, seen = o => rt.seen[Math.round(o.y) * m.w + Math.round(o.x)];
      // 누른 자리에서 가장 가까운 것: 단장(취소) · 라이벌(방침) · 몬스터(집중 표적). 계단 칸을 정확히 눌렀으면 그 위에 겹친 것이 아닌 한 계단이 먼저
      const tx = Math.round(x), ty = Math.round(y), stairs = tx === m.end.cx && ty === m.end.cy, d = o => Math.hypot(o.x - x, o.y - y);
      const cand = [];
      // 원정대를 누르면 그 사람 상태창
      for (const p of rt.party) if (!p.dead && p.merc) cand.push({ o: p, k: 'member', r: MEMBER_R });
      for (const e of G.Rivals.members(rt)) if (seen(e)) cand.push({ o: e, k: 'rival', r: PICK_R });
      for (const o of rt.mons) if (seen(o)) cand.push({ o, k: 'mon', r: PICK_R + o.s * 0.3 });
      const hit = cand.filter(c => d(c.o) <= (stairs ? 0.45 : c.r)).sort((a, b) => d(a.o) - d(b.o))[0];
      if (hit && hit.k === 'member') { G.UI?.sheet?.open(hit.o.merc); return true; }
      if (hit && hit.k === 'rival') { G.Rivals.openAsk(rt, G.Rivals.partyOf(rt, hit.o)); return true; }
      if (hit) {
        const mo = hit.o;
        C.setFocus(rt, mo);
        rt.rally = null;
        G.fx(rt, { k: 'ring', x: mo.x, y: mo.y, r: 1.1, t: 0.4, col: FOCUS_COL });
        G.J.sfx('fantasy', 'select');
        G.Banter.line(rt, 'focus', rt.hero.dead ? null : rt.hero, { m: mo.n }, { pri: true });
        return true;
      }
      if (!GR.pass(m, tx, ty) || !rt.seen[ty * m.w + tx]) return false;
      if (stairs) {
        rt.rush = !rt.rush;
        rt.rally = null;
        if (rt.rush) G.Banter.line(rt, 'descend', rt.hero.dead ? null : rt.hero, null, { pri: true });
        return true;
      }
      rt.rally = { rally: true, x: tx, y: ty, t: RALLY_T, pulse: 0 };
      rt.rush = false;
      G.fx(rt, { k: 'ring', x: tx, y: ty, r: 1, t: 0.6, col: '#9fe0ff' });
      G.J.sfx('fantasy', 'select');
      G.Banter.line(rt, 'rally', rt.hero.dead ? null : rt.hero, null, { pri: true });
      return true;
    },
    // 집결 지점에 닿았다 (집결 나팔: 10초간 공격 속도)
    arrive(f, rt) {
      rt.rally = null;
      if (ta('t_rally')) G.Fantasy.buff(f, rt, rt.hero, 'static', 10);
    },
    tick(f, rt, dt) {
      if (rt.focus && (rt.focus.hp <= 0 || !rt.mons.includes(rt.focus))) C.setFocus(rt, null);
      const r = rt.rally;
      if (r) {
        if ((r.t -= dt) <= 0) rt.rally = null;
        else if ((r.pulse -= dt) <= 0) { r.pulse = 0.7; G.fx(rt, { k: 'ring', x: r.x, y: r.y, r: 0.8, t: 0.7, col: '#9fe0ff' }); }
      }
      // 전술 본능: 직접 고른 표적이 없으면 보이는 적 중 보스, 아니면 체력이 가장 많은 덤벼 오는 적
      if (ta('t_auto') && (!rt.focus || rt.focusAuto)) {
        const seen = rt.mons.filter(o => o.aggro && G.Fantasy.inView(rt, o.x, o.y));
        const pick = seen.find(o => o.boss) || seen.sort((a, b) => b.hp - a.hp)[0] || null;
        if (pick !== rt.focus) C.setFocus(rt, pick, true);
      }
    },
    // 지금 걸린 명령 (화면 왼쪽 위 한 줄)
    label(rt) {
      const out = [];
      if (rt.focus && !rt.focusAuto) out.push(`🎯 ${rt.focus.n}`);
      if (rt.rally) out.push(`⚑ 집결 ${Math.ceil(rt.rally.t)}초`);
      if (rt.rush) out.push('⤓ 서둘러 내려가기');
      if (rt.stairWait) out.push('⏸ 계단 대기 · X 내려가기');
      return out.join(' · ');
    },
  };
  return C;
})();
