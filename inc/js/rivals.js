'use strict';
// 라이벌 원정대 (DESIGN.md 29): 같은 던전을 내려가는 다른 파티
// 우리와 다른 층에 있으면 시간으로 내려가고, 같은 층이면 맵 위에 나와 직접 움직인다 (계단으로 내려오는 것도 보인다).
// 그들이 먼저 잡은 몬스터의 골드는 그들 몫이다. 호전적인 파티는 우리든 다른 라이벌이든 보면 덤비고,
// 도둑은 보스 층에 숨어들어 약해진 보스를 가로채고, 우호적인 파티는 위기에 빠진 우리를 돕는다.
// 상태(층·실력·기세·전적)는 f.rivals에 저장하고, 맵 위 몸(rt.rivals)은 저장하지 않는다 — 층을 새로 만들면 다시 놓는다.
G.Rivals = (() => {
  const U = G.U, GR = G.Grid;
  const SIGHT = 6, CLASH_T = 14, TRUCE_T = 90, REST_BEATEN = 45, REST_WIPED = 30, REVIVE = 10, FLOOR_T = 60, SPEED = 3, NEWS_MAX = 6;
  // 실력이 목표를 따라가는 시간(초) / 기세가 바뀌는 간격 / 도둑이 보스를 노리는 체력 / 우호 파티가 돕기 시작하는 우리 체력
  // 각자의 성장 (DESIGN.md 47): 실력 목표 = 시즌 곡선 × 성향 × 기세 × 기세(이기고 짐). 우리 최고층은 보지 않는다
  const P_END = 20, P_EXP = 0.7, P_SEASON = 0.25, P_SEASON_MAX = 2.5, EDGE_LOSE = 0.12, EDGE_WIN = 0.06, EDGE_MIN = 0.7, EDGE_MAX = 1.3, EDGE_BACK = 600;
  const POWER_LAG = 90, FORM_T = [60, 120], THIEF_AT = 0.5, THIEF_HIT = 5, HELP_T = 10;
  // 조우 선택지: 처음 보면 묻는다 (같은 라이벌은 ASK_CD초에 한 번), 고를 시간(로직 초 — 처음 2.5초는 느려진다)
  const ASK_CD = 90, ASK_T = 2.5, SURPRISE_T = 1.5;
  // 싸움꾼이 먼저 덤빌 확률 (DESIGN.md 42)
  const BRAWL_P = 0.5;
  const F = () => G.Fantasy;
  const ta = k => G.Tree.add('fantasy', G.S.w.fantasy.tree, k);
  // 라이벌마다 미리 정해 두는 방침 (DESIGN.md 30). 그 순간에 묻지 않아도 방침대로 움직인다
  const STANCES = {
    attack: { n: '선제공격', ic: '⚔', d: '선공 · 기습 1.5초' },
    meet: { n: '맞서기', ic: '🛡', d: '응전' },
    avoid: { n: '피하기', ic: '↪', d: '우회' },
    ally: { n: '협력', ic: '🤝', d: '지원 · 통행료' },
  };

  const R = {
    STANCES,
    news: [],
    stance(f, d) {
      f.stance = f.stance || {};
      return f.stance[d.id] || (d.friendly ? 'ally' : 'meet');
    },
    setStance(f, d, k) {
      f.stance = f.stance || {};
      f.stance[d.id] = k;
      const rt = F().rt(f), p = rt.rivals.find(q => q.d === d);
      if (rt.prompt && rt.prompt.p.d === d) rt.prompt = null;
      // 협력·피하기로 바꾸면 지금 싸움을 멈춘다
      if (p && (k === 'ally' || k === 'avoid') && p.clash > 0) { p.clash = 0; R.st(f)[d.id].truce = 20; }
    },
    // 피하기 방침인 라이벌의 몸 (기사가 그 곁을 피한다)
    avoided: rt => {
      const f = G.S.w.fantasy;
      return (rt.rivals || []).filter(p => R.stance(f, p.d) === 'avoid').flatMap(p => p.mem.filter(e => !e.dead));
    },
    st(f) {
      f.rivals = f.rivals || {};
      for (const d of G.D.RIVALS) {
        const s = f.rivals[d.id] = f.rivals[d.id] || { floor: 1, t: 0, rest: 0, truce: 0, kills: 0, bosses: 0, wins: 0, losses: 0 };
        if (s.power == null) Object.assign(s, { power: Math.max(1, s.floor), form: 1, formT: FORM_T[0], helps: 0, rwins: 0 });
      }
      return f.rivals;
    },
    // 실력(편하게 싸우는 층)은 각자의 시즌 곡선을 따라간다 — 우리가 빨리 가도 따라 빨라지지 않는다(고무줄 없음).
    // 곡선 = P_END × (시즌 진행)^P_EXP × 시즌 배율(시즌마다 +25%) × 성향(pace) × 기세(form, 오르내림) × 기선(edge: 우리에게 지면 꺾이고, 이기면 오른다. 10분에 걸쳐 1로 돌아온다)
    curve(f, d, s) {
      const S = G.Season, n = S.st(f).n || 1, k = Math.min(P_SEASON_MAX, 1 + P_SEASON * (n - 1));
      return Math.max(2, P_END * k * Math.pow(Math.min(1, S.st(f).t / S.LEN), P_EXP)) * d.pace * s.form * (s.edge || 1);
    },
    grow(f, d, s, dt) {
      if (s.edge && s.edge !== 1) s.edge += (1 - s.edge) * Math.min(1, dt / EDGE_BACK);
      const target = R.curve(f, d, s);
      s.power += (target - s.power) * Math.min(1, dt / POWER_LAG);
      if ((s.formT -= dt) > 0) return;
      s.formT = FORM_T[0] + Math.random() * (FORM_T[1] - FORM_T[0]);
      const nf = U.clamp(s.form + (Math.random() * 2 - 1) * 0.12, 0.85, 1.18), up = nf - s.form;
      s.form = nf;
      if (up > 0.09) R.say(`${d.n} · 기세 ▲`, d.col, d.id + 'form', 180);
      else if (up < -0.09) R.say(`${d.n} · 기세 ▼`, d.col, d.id + 'form', 180);
    },
    // 다른 층에 있을 때 한 층을 내려가는 데 걸리는 초: 실력보다 얕으면 빠르고, 깊을수록 막힌다
    floorTime(s, fl) {
      const gap = fl - s.power;
      return FLOOR_T * (gap < 0 ? 1 / (1 + Math.min(3, -gap * 0.15)) : Math.min(20, Math.pow(1.6, gap + 1)));
    },
    // key를 주면 같은 라이벌의 같은 종류 소식은 cd초에 한 번만 (도착·체류·기세가 소식을 덮지 않게)
    said: {},
    say(s, col, key, cd = 60) {
      if (key) { if (G.S.runTime - (R.said[key] ?? -1e9) < cd) return; R.said[key] = G.S.runTime; }
      R.news.unshift({ s, col, at: G.S.runTime });
      if (R.news.length > NEWS_MAX) R.news.length = NEWS_MAX;
    },
    // 라이벌 둘이 한 번 싸우고 나면 한동안 서로 건드리지 않는다
    peace: {},
    pairKey: (a, b) => [a.id, b.id].sort().join(),

    // ── 맵 위의 몸 ──
    newMember(f, d, id, x, y) {
      const def = G.D.F.allies[id], c = Math.max(1, R.st(f)[d.id].power);
      const e = { kind: 'rival', rival: d, id, def, t: def.t, wpn: def.wpn, s: 0.95, bar: true, x, y, atkT: Math.random() * def.cd, dead: false, reviveT: 0, ring: d.col, barCol: d.col, dots: [], aggro: true };
      // 공격 간격과 상관없이 한 사람의 초당 피해를 맞춘다 (몬스터 한 마리를 8초에, 우리에게는 몬스터 0.8마리만큼)
      e.max = e.hp = F().monHP(c) * 1.8 * def.hp;
      e.atkMon = F().monHP(c) * 0.12 * def.cd;
      e.atkPvp = F().monAtk(c) * 0.8 * def.cd;
      return e;
    },
    // where: 'start' 방금 계단으로 내려왔다 / 'mid' 먼저 와서 가운데 방 어딘가 / 'boss' 보스 방 바로 앞에 숨어 있다
    spawn(f, rt, d, where) {
      const m = rt.map, mid = m.rooms.slice(1, -1);
      const room = where === 'start' || !mid.length ? m.start : where === 'boss' ? mid[mid.length - 1] : U.pick(mid);
      // 인원은 우리 원정대만큼 (기사 혼자인 초반에 셋이 덤비면 억울하다)
      const n = Math.max(1, Math.min(1 + d.crew.length, rt.party.length));
      const mem = [d.lead, ...d.crew].slice(0, n).map((id, i) => R.newMember(f, d, id, room.cx + (i % 2), room.cy + (i > 1 ? 1 : 0)));
      mem[0].label = d.n;
      rt.rivals.push({ d, mem, clash: 0, enemy: null, enemyT: 0, assist: 0, surprise: 0, met: false, tg: null });
      F().refreshEnts(rt);
    },
    // 새 층: 이미 이 층에 있는 라이벌을 놓는다. 보스 층이면 근처 층의 도둑이 잠시 뒤 숨어든다
    enter(f, rt) {
      rt.rivals = [];
      rt.ambush = null;
      rt.prompt = null;
      const st = R.st(f);
      for (const d of G.D.RIVALS) {
        const s = st[d.id];
        if (s.floor === f.floor && s.rest <= 0) { R.spawn(f, rt, d, 'mid'); R.say(`${f.floor}층 · ${d.n} · 먼저 도착`, d.col, d.id + 'here'); }
      }
      if (!F().isBoss(f.floor)) return;
      const thief = G.D.RIVALS.find(d => d.thief && st[d.id].rest <= 0 && st[d.id].floor !== f.floor && Math.abs(st[d.id].floor - f.floor) <= 3);
      if (thief) rt.ambush = { d: thief, t: 10 + Math.random() * 6 };
    },
    ents: rt => (rt.rivals || []).flatMap(p => p.mem),
    members: rt => (rt.rivals || []).flatMap(p => p.mem.filter(e => !e.dead)),
    // 지금 우리와 싸우는 중인 라이벌 몸 (기사가 노릴 수 있는 것)
    hostiles: rt => (rt.rivals || []).filter(p => p.clash > 0).flatMap(p => p.mem.filter(e => !e.dead)),
    partyOf: (rt, e) => rt.rivals.find(p => p.mem.includes(e)),
    bossOf: rt => rt.mons.find(o => o.boss),

    tick(f, rt, dt) {
      const st = R.st(f);
      for (const d of G.D.RIVALS) {
        const s = st[d.id];
        if (s.truce > 0) s.truce -= dt;
        R.grow(f, d, s, dt);
        if (rt.rivals.some(p => p.d === d)) continue;
        if (s.rest > 0) { s.rest -= dt; continue; }
        if ((s.t += dt) < R.floorTime(s, s.floor)) continue;
        s.t = 0;
        s.floor++;
        if (s.floor === f.floor && rt.phase !== 'dead' && !f.town) { R.spawn(f, rt, d, 'start'); R.say(`${f.floor}층 · ${d.n} · 도착`, d.col, d.id + 'here'); }
      }
      const am = rt.ambush;
      if (am && (am.t -= dt) <= 0) {
        rt.ambush = null;
        const s = st[am.d.id];
        if (R.bossOf(rt) && rt.phase !== 'dead' && !rt.rivals.some(p => p.d === am.d)) {
          s.floor = f.floor; s.t = 0;
          R.spawn(f, rt, am.d, 'boss');
          R.say(`${f.floor}층 · ${am.d.n} · 보스방 잠입`, am.d.col);
        }
      }
      if (rt.prompt && ((rt.prompt.t -= dt) <= 0 || !rt.rivals.includes(rt.prompt.p))) rt.prompt = null;
      for (const p of [...rt.rivals]) R.live(f, rt, p, dt);
    },

    // 같은 층에 있는 라이벌 하나: 지도자가 목표를 고르고 나머지는 같이 친다 (우리 파티와 같은 규칙)
    live(f, rt, p, dt) {
      const m = rt.map, d = p.d;
      if (p.clash > 0) p.clash -= dt;
      if (p.assist > 0) p.assist -= dt;
      if (p.surprise > 0) p.surprise -= dt;
      if (p.enemy && ((p.enemyT -= dt) <= 0 || !rt.rivals.includes(p.enemy))) p.enemy = null;
      // 싸우는 중에 쓰러진 라이벌은 일어나지 않는다 (안 그러면 거의 이길 수 없다)
      if (p.clash <= 0 && !p.enemy) for (const e of p.mem) if (e.dead && (e.reviveT -= dt) <= 0) { e.dead = false; e.hp = e.max * 0.5; }
      const alive = p.mem.filter(e => !e.dead);
      if (!alive.length) return;
      const lead = alive[0], ours = rt.party.filter(q => !q.dead), boss = R.bossOf(rt);
      R.sense(f, rt, p, lead, ours, boss);
      const goal = R.goal(rt, p, lead, ours, boss);
      if (goal === 'lurk') return;
      if (!goal) {
        // 몬스터가 없으면 계단으로. 지도자가 닿으면 다음 층으로 떠난다
        for (const e of alive) if (e !== lead && GR.dist(e, lead) > 1.6) GR.moveTo(m, e, lead.x, lead.y, SPEED * 1.1, dt, 1.2);
        if (GR.moveTo(m, lead, m.end.cx, m.end.cy, SPEED, dt, 0.3)) R.leave(f, rt, p, 'down');
        return;
      }
      for (const e of alive) {
        e.moving = false;
        const def = e.def;
        if (def.heal) { R.heal(rt, p, e, alive, ours, dt); continue; }
        if (p.surprise > 0 && goal.kind !== 'mon') continue;
        if (GR.dist(e, goal) > def.range || !GR.los(m, e.x, e.y, goal.x, goal.y)) { GR.moveTo(m, e, goal.x, goal.y, SPEED, dt, Math.min(def.range * 0.8, 0.9)); continue; }
        e.flip = goal.x < e.x;
        if ((e.atkT -= dt) > 0) continue;
        e.atkT = def.cd;
        G.J.lunge('fantasy', e, goal);
        if (def.proj) G.fx(rt, { k: 'proj', key: def.proj, x: e.x, y: e.y, x2: goal.x, y2: goal.y, t: 0.25 });
        if (goal.kind === 'mon') R.hitMon(f, rt, e, goal);
        else if (goal.kind === 'rival') R.hurtRival(f, rt, goal, e.atkMon, e);
        else F().hurtMember(f, rt, goal, e.atkPvp, e);
        if (rt.phase === 'dead') return;
      }
      F().spread(m, alive, 0.75);
    },
    // 주변을 본다: 호전적이면 우리나 다른 라이벌에게 덤비고, 우호적이면 위기에 빠진 우리를 돕는다
    sense(f, rt, p, lead, ours, boss) {
      const m = rt.map, d = p.d, s = R.st(f)[d.id], k = R.stance(f, d);
      const sees = o => GR.dist(o, lead) < SIGHT && GR.los(m, o.x, o.y, lead.x, lead.y);
      const busy = d.thief && boss; // 도둑은 보스가 있는 동안 보스만 본다
      // 이 층에서 처음 마주쳤다: 묻는 중이면 고를 때까지 양쪽 다 싸움을 걸지 않는다
      if (!p.met && ours.some(o => GR.dist(o, lead) < SIGHT + 2 && GR.los(m, o.x, o.y, lead.x, lead.y))) {
        p.met = true;
        R.ask(f, rt, p, lead);
        if (k === 'ally' && d.hostile) R.toll(f, rt, p, lead);
      }
      if (rt.prompt && rt.prompt.p === p) return;
      // 성격 — 싸움꾼 (DESIGN.md 42): 맞서기 방침인 라이벌을 보면 우리 쪽에서 먼저 덤빈다 — 기습처럼 상대가 잠깐 손을 못 쓴다 (이 층에서 라이벌마다 한 번 굴림)
      if (k === 'meet' && !busy && p.clash <= 0 && s.truce <= 0 && !p.brawl && ours.some(sees)) {
        const PS = G.Persona, a = PS.who(rt, 'brawler').find(q => PS.free(rt, q, 'brawler'));
        if (a) {
          p.brawl = true;
          if (U.chance(BRAWL_P)) {
            p.clash = CLASH_T;
            p.surprise = SURPRISE_T;
            PS.fire(rt, a, 'brawler');
            G.fx(rt, { k: 'beam', x: a.x, y: a.y, x2: lead.x, y2: lead.y, col: '#ff5a3a', w: 2, t: 0.4 });
            R.say(`${a.merc.name} ⚔ ${d.n}`, d.col);
          }
        }
      }
      // 선제공격: 우리가 보면 먼저 친다 (기습당한 쪽은 잠깐 손을 못 쓴다)
      if (k === 'attack' && p.clash <= 0 && s.truce <= 0 && ours.some(sees)) {
        p.clash = CLASH_T;
        p.surprise = SURPRISE_T + ta('t_ambush');
        G.fx(rt, { k: 'text', x: lead.x, y: lead.y - 1.3, s: '기습!', col: '#ffe08a', t: 1.3, sz: 1.3, pop: true });
        G.J.sfx('fantasy', 'crit');
        R.say(`${d.n} · 기습`, d.col, d.id + 'atk');
      }
      // 호전적인 파티: 피하기면 바짝 붙었을 때만, 협력(통행료)이면 덤비지 않는다
      const theyStart = k === 'meet' || k === 'attack' || (k === 'avoid' && !ta('t_evade') && ours.some(o => GR.dist(o, lead) < 2.5));
      if (d.hostile && theyStart && !busy && p.clash <= 0 && s.truce <= 0 && ours.some(sees)) {
        p.clash = CLASH_T;
        G.fx(rt, { k: 'text', x: lead.x, y: lead.y - 1.3, s: '덤빈다!', col: d.col, t: 1.3, sz: 1.2, pop: true });
        G.J.sfx('fantasy', 'hurt');
      }
      if (d.hostile && !busy && p.clash <= 0 && !p.enemy) {
        for (const q of rt.rivals) {
          const ql = q !== p && !q.enemy && q.mem.find(e => !e.dead), key = ql && R.pairKey(d, q.d);
          if (!ql || G.S.runTime < (R.peace[key] || 0) || !sees(ql)) continue;
          p.enemy = q; q.enemy = p; p.enemyT = q.enemyT = CLASH_T;
          G.fx(rt, { k: 'text', x: lead.x, y: lead.y - 1.3, s: '덮친다!', col: d.col, t: 1.3, sz: 1.2, pop: true });
          R.say(`${d.n} ⚔ ${q.d.n}`, d.col);
          break;
        }
      }
      if (d.friendly && k === 'ally' && p.assist <= 0 && rt.phase !== 'dead' && ours.some(o => GR.dist(o, lead) < 12)) {
        const ph = F().partyHP(rt);
        if (ph.hp < ph.max * (ta('t_ally') ? 0.7 : 0.5)) {
          p.assist = HELP_T + 5 * ta('t_ally');
          s.helps++;
          G.fx(rt, { k: 'text', x: lead.x, y: lead.y - 1.3, s: '돕겠다!', col: d.col, t: 1.3, sz: 1.2, pop: true });
          R.say(`${d.n} · 지원`, d.col, d.id + 'help');
        }
      }
    },
    // 조우 선택지: 화면을 보고 있으면 잠깐 느려지고 그 파티 머리 위에 방침 넷이 뜬다 (v_fantasy). 안 고르면 지금 방침대로
    ask(f, rt, p, lead) {
      const now = G.S.runTime;
      R.asked = R.asked || {};
      if (f.askMeet === false || !G.J.live('fantasy') || now - (R.asked[p.d.id] ?? -1e9) < ASK_CD) return;
      R.asked[p.d.id] = now;
      rt.prompt = { p, t: ASK_T, max: ASK_T };
      const js = G.J.s('fantasy');
      js.slow = Math.max(js.slow, 2.5);
      G.J.sfx('fantasy', 'chime');
    },
    // 라이벌을 눌렀다(지휘): 그 파티의 방침 선택지를 연다 — 느려지지 않고, 조금 더 오래
    openAsk(rt, p) {
      if (!p) return;
      rt.prompt = { p, t: ASK_T * 2.4, max: ASK_T * 2.4, manual: true };
      G.J.sfx('fantasy', 'select');
    },
    // 기습당해 손을 못 쓰는 라이벌에게 주는 피해 (기습 노드)
    ambushMult(rt, e) {
      const p = R.partyOf(rt, e);
      return p && p.surprise > 0 && ta('t_ambush') ? 1.5 : 1;
    },
    // 호전적인 파티와 협력: 마주칠 때마다 통행료 (보스 한 마리 골드, 협상 노드로 줄인다)
    toll(f, rt, p, lead) {
      // 통행료는 짐에서 낸다
      const g = Math.min(f.carry || 0, F().monGold(f.floor, true) * F().goldMult(f) * Math.max(0, 1 - ta('t_pact')));
      if (g <= 0) return;
      f.carry -= g;
      G.fx(rt, { k: 'text', x: lead.x, y: lead.y - 1.3, s: `통행료 -${U.fmt(g)}`, col: p.d.col, t: 1.5, sz: 1.1, pop: true });
      R.say(`${p.d.n} · 통행료 -${U.fmt(g)}`, p.d.col, p.d.id + 'toll');
    },
    // 지도자의 목표 (위에서부터): 도둑은 체력 절반 아래 보스(아직이면 숨어 기다린다) → 우리와 싸우는 중이면 가장 가까운 우리 파티원
    // → 다투는 라이벌 → 돕는 중이면 우리 기사가 노리는 적 → 붙잡은 몬스터 → 길로 가장 가까운 몬스터. 'lurk'는 제자리
    goal(rt, p, lead, ours, boss) {
      const near = list => list.reduce((a, b) => (GR.dist(a, lead) < GR.dist(b, lead) ? a : b));
      if (p.d.thief && boss) return boss.hp < boss.max * THIEF_AT ? (p.tg = boss) : 'lurk';
      // 온순한 사람은 노리지 않는다 (모두 온순하면 어쩔 수 없이)
      if (p.clash > 0 && ours.length) { const pick = ours.filter(o => !G.Persona.has(o.merc, 'meek')); return near(pick.length ? pick : ours); }
      const foes = p.enemy ? p.enemy.mem.filter(e => !e.dead) : [];
      if (foes.length) return near(foes);
      if (p.assist > 0 && rt.heroTg && rt.heroTg.kind === 'mon' && rt.heroTg.hp > 0) return rt.heroTg;
      if (p.tg && p.tg.hp > 0 && rt.mons.includes(p.tg)) return p.tg;
      const m = rt.map, dist = GR.field(m, Math.round(lead.x), Math.round(lead.y));
      let best = null, bd = 1e9;
      for (const o of rt.mons) {
        if (o.flee) continue;
        const v = dist[Math.round(o.x) + Math.round(o.y) * m.w];
        if (v >= 0 && v < bd) { bd = v; best = o; }
      }
      return (p.tg = best);
    },
    // 수도사: 가장 다친 동료를 치유 (돕는 중이면 우리 파티원도)
    heal(rt, p, e, alive, ours, dt) {
      const lead = alive[0];
      if ((e.atkT -= dt) <= 0) {
        const pool = p.assist > 0 ? alive.concat(ours) : alive;
        const low = pool.filter(q => q.hp < q.max * 0.9).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
        e.atkT = low ? e.def.cd : 0.3;
        if (low) { low.hp = Math.min(low.max, low.hp + low.max * e.def.heal); G.fx(rt, { k: 'tile', key: 'fx_holy', x: low.x, y: low.y, t: 0.5 }); }
      }
      if (e !== lead && GR.dist(e, lead) > 1.8) GR.moveTo(rt.map, e, lead.x, lead.y, SPEED * 1.1, dt, 1.4);
    },
    hitMon(f, rt, e, mo) {
      // 도둑은 보스에게 뛰어들어 크게 벤다 (안 그러면 우리 파티보다 늦어 가로채지 못한다)
      const def = e.def, dmg = e.atkMon * (mo.boss && e.rival.thief ? THIEF_HIT : 1);
      if (def.splash) { for (const o of rt.mons.filter(o => GR.dist(o, mo) <= def.splash)) F().hurt(f, rt, o, dmg, 'hit', e); return; }
      if (def.chain) { for (const o of rt.mons.slice().sort((a, b) => GR.dist(a, mo) - GR.dist(b, mo)).slice(0, def.chain)) F().hurt(f, rt, o, dmg * 0.8, 'hit', e); return; }
      F().hurt(f, rt, mo, dmg, 'hit', e);
    },
    // 몬스터에게 맞는다 (라이벌은 몬스터 피해에 조금 더 약하다 — 안 그러면 몬스터가 거의 흠집도 못 낸다)
    hurt(f, rt, e, dmg, mo) {
      if (e.dead) return;
      e.hp -= dmg * 1.5;
      G.J.hit('fantasy', e, 0, mo);
      G.J.lunge('fantasy', mo, e);
      if (e.hp <= 0) R.down(f, rt, e, mo);
    },
    // 라이벌끼리 싸운다 (몬스터 사냥 피해로 — 라이벌 체력이 몬스터 기준이라)
    hurtRival(f, rt, e, dmg, from) {
      if (e.dead) return;
      e.hp -= dmg;
      G.J.hit('fantasy', e, 0, from);
      G.fx(rt, { k: 'slash', x: e.x, y: e.y, t: 0.22, rot: Math.random() - 0.5, flip: from.x > e.x });
      if (e.hp <= 0) R.down(f, rt, e, from);
    },
    // 라이벌 하나가 쓰러진다. 전원이 쓰러지면 그 파티는 이 층에서 물러난다
    down(f, rt, e, from) {
      const p = R.partyOf(rt, e);
      if (!p || e.dead) return;
      e.dead = true; e.hp = 0; e.reviveT = REVIVE;
      if (from?.merc) G.Quirk.event(f, rt, from, 'foe:' + e.rival.id);
      if (p.mem.some(q => !q.dead)) return;
      const d = p.d, s = R.st(f)[d.id];
      s.truce = TRUCE_T;
      if (from && from.kind === 'rival') {
        // 라이벌끼리: 이긴 쪽 기록, 둘은 한동안 서로 건드리지 않는다
        const w = from.rival, q = rt.rivals.find(o => o.d === w);
        R.st(f)[w.id].rwins++;
        R.peace[R.pairKey(d, w)] = G.S.runTime + TRUCE_T;
        if (q) q.enemy = null;
        G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.4, s: `${w.n} 승리`, col: w.col, t: 1.6, sz: 1.2, pop: true });
        R.say(`${f.floor}층 · ${w.n} 승 · ${d.n} 패`, w.col);
        R.leave(f, rt, p, 'beaten');
      } else if (from && from.kind !== 'mon') {
        const g = F().monGold(f.floor, true) * 2 * F().goldMult(f) * (1 + ta('t_hunter'));
        F().gain(f, g);
        s.losses++;
        G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.4, s: `격파! +${U.fmt(g)}`, col: '#ffd24a', t: 1.6, sz: 1.4, pop: true });
        G.J.finish('fantasy', e.x, e.y, 0.8);
        G.J.sfx('fantasy', 'finish');
        R.say(`${f.floor}층 · ${d.n} 격파 · +${U.fmt(g)}`, d.col);
        G.log(`${d.n} 격파 +${U.fmt(g)}`, 'fantasy', 'good');
        G.Guild.defector(f, d);
        // 우리에게 졌다: 기선이 꺾여 한동안 더디게 내려간다
        s.edge = Math.max(EDGE_MIN, (s.edge || 1) - EDGE_LOSE);
        G.Trinket.drop(f, rt, 'rival', e.x, e.y);
        R.leave(f, rt, p, 'beaten');
      } else {
        R.say(`${f.floor}층 · ${d.n} · 전멸`, d.col);
        R.leave(f, rt, p, 'wiped');
      }
    },
    // 라이벌이 몬스터를 먼저 잡았다: 골드는 그들 몫
    stole(f, rt, mo, e) {
      const d = e.rival, s = R.st(f)[d.id];
      s.kills++;
      G.fx(rt, { k: 'die', spr: mo.t, x: mo.x, y: mo.y, s: mo.s, flip: mo.flip, t: 0.45 });
      if (mo.boss) {
        s.bosses++;
        G.fx(rt, { k: 'text', x: mo.x, y: mo.y - 1.6, s: '가로챘다!', col: d.col, t: 1.8, sz: 1.5, pop: true });
        G.J.sfx('fantasy', 'lose');
        R.say(`${f.floor}층 · ${d.n} · 보스 「${mo.n}」 강탈`, d.col);
        G.log(`${d.n} · 보스 강탈`, 'fantasy', 'bad');
      }
      F().removeMon(rt, mo);
    },
    // 라이벌이 우리 원정대를 무너뜨렸다
    beatUs(f, e) {
      const d = e.rival, s = R.st(f)[d.id];
      s.wins++;
      s.truce = TRUCE_T;
      s.edge = Math.min(EDGE_MAX, (s.edge || 1) + EDGE_WIN);
      R.say(`${f.floor}층 · ${d.n}에게 패배`, d.col);
    },
    leave(f, rt, p, why) {
      const s = R.st(f)[p.d.id];
      rt.rivals = rt.rivals.filter(q => q !== p);
      for (const q of rt.rivals) if (q.enemy === p) q.enemy = null;
      if (why === 'down') {
        s.floor++; s.t = 0;
        G.fx(rt, { k: 'text', x: rt.map.end.cx, y: rt.map.end.cy - 1, s: `${p.d.n} ↓`, col: p.d.col, t: 1.4 });
        R.say(`${p.d.n} · ${s.floor}층 진입`, p.d.col, p.d.id + 'down');
      } else s.rest = why === 'beaten' ? REST_BEATEN : REST_WIPED;
      F().refreshEnts(rt);
    },

    // 층 순위: 우리(지금 층)와 라이벌. 같은 층이면 맵 위에 있는지, 아니면 기세(▲ 탔다 ▼ 주춤)
    standings(f, rt) {
      const st = R.st(f), here = new Set((rt.rivals || []).map(p => p.d.id));
      const rows = G.D.RIVALS.map(d => {
        const s = st[d.id];
        return { id: d.id, d, n: d.n, col: d.col, floor: s.floor, here: here.has(d.id), rest: s.rest > 0, mood: s.form > 1.07 ? '▲' : s.form < 0.93 ? '▼' : '', stance: R.stance(f, d) };
      });
      rows.push({ id: 'us', n: '우리 원정대', col: '#fff3c4', floor: f.floor, us: true });
      return rows.sort((a, b) => b.floor - a.floor || (a.us ? -1 : b.us ? 1 : 0));
    },
  };
  return R;
})();
