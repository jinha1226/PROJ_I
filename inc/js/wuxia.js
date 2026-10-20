'use strict';
// 무협 · 화산귀환록 (회귀 루프 — Increlution, Progress Knight 계열을 강호 지도 위에서)
// 강호는 지역(화음현·화산·낙양·십만대산·천산)마다 타일 지도 하나. 주인공은 직업이 있는 지역에 살며
// 일터(직업 장소)와 그 지역의 수련터(무공 장소)를 번갈아 오간다. 그 자리에 있을 때만 숙련이 오른다. 1년은 8초.
// 직업이 다른 지역이면 강호로 나가 여정을 떠난다 — 여정에도 세월이 흐른다(경공으로 줄인다).
// 점소이·표사·낭인 다음 정파·마도로 갈린다 (w.path: 이번 생에 갈 진로). 무공 레벨 합이 경지(삼류 … 생사경)가 된다.
// 길에는 산적이 나타나 싸움이 붙는다. 천수가 다하면 회귀한다: 전생 최고 레벨이 다음 생의 숙련 속도가 되고,
// 이번 생의 업적이 「깨달음」이 되어 스킬트리(회귀해도 남는다)를 찍는다.
G.RT = G.RT || {};
G.Wuxia = (() => {
  const D = G.D.WX, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('wuxia', G.S.w.wuxia.tree, k);
  const ta = k => G.Tree.add('wuxia', G.S.w.wuxia.tree, k);
  const YEAR = 8, BASE_LIFE = 70, WORK_T = 15, TRAIN_T = 12, BANDIT_T = 25, WALK = 5;
  const jobDef = id => D.jobs.find(j => j.id === id);
  const skillDef = id => D.skills.find(s => s.id === id);

  const W = {
    YEAR,
    init(head = 0) {
      return {
        age: 16, gold: 5 * Math.pow(10, head), job: 'jumso', skill: 'tuna', lvl: {}, xp: {}, peak: {}, items: {}, path: 'jeong',
        lives: 0, ins: 0, tree: G.Tree.init('wuxia'), dead: false, bestJob: 0, autoPromote: true, autoSkill: true, autoBuy: true, mode: 'work', elix: 0,
      };
    },
    rt(w) { return G.RT.wuxia || (G.RT.wuxia = W.boot(w)); },
    boot(w) {
      const rt = { fx: [], bandits: [], villagers: [], hero: { kind: 'hero', x: 0, y: 0, s: 1.1, bar: true }, stay: 0, banditT: 4, focus: null, restT: 0, deadT: 0, travel: null };
      // 처음 켤 때는 지금 직업의 지역에서 (여정 없이)
      W.enter(w, rt, jobDef(w.job).r, jobDef(w.job).at);
      W.heal(w, rt);
      return rt;
    },
    // 지역 지도 (지역마다 한 번 만들어 둔다)
    maps: {},
    regionMap(id) {
      if (W.maps[id]) return W.maps[id];
      const R = D.regions[id];
      return (W.maps[id] = GR.fromAscii(R.map, D.pass + Object.keys(R.places).join('')));
    },
    // 지역에 들어선다: 지도 교체, 마을 사람, 주인공은 장소 ch(없으면 강호 길목 X)에
    enter(w, rt, id, ch) {
      const map = W.regionMap(id), R = D.regions[id];
      rt.region = w.region = id;
      rt.map = map;
      rt.bandits = [];
      rt.focus = null;
      const [x, y] = (ch && map.poi[ch] ? map.poi[ch] : map.poi.X)[0];
      Object.assign(rt.hero, { x, y, _rx: x, _ry: y });
      rt.villagers = [];
      const kinds = id === 'nakyang' ? ['wx_merchant', 'wx_vil_m', 'wx_vil_f', 'wx_merchant', 'wx_vil_f', 'wx_vil_m'] : ['wx_vil_m', 'wx_vil_f', 'wx_merchant', 'wx_vil_f'];
      for (let i = 0; i < R.npc; i++) {
        const c = GR.randomCell(map, (cx, cy) => '.=,'.includes(GR.at(map, cx, cy)));
        if (c) rt.villagers.push({ kind: 'npc', t: kinds[i % kinds.length], x: c[0], y: c[1], s: 0.9, goal: null, wait: Math.random() * 3 });
      }
      rt.stay = 0;
    },
    // 강호 길: 두 지역 사이 가장 짧은 길 (지역 목록, 햇수)
    route(a, b) {
      const dist = { [a]: 0 }, prev = {}, todo = new Set(Object.keys(D.regions));
      while (todo.size) {
        let u = null;
        for (const r of todo) if (dist[r] != null && (u == null || dist[r] < dist[u])) u = r;
        if (u == null || u === b) break;
        todo.delete(u);
        for (const [p, q, y] of D.links) {
          const v = p === u ? q : q === u ? p : null;
          if (v && todo.has(v) && (dist[v] == null || dist[u] + y < dist[v])) { dist[v] = dist[u] + y; prev[v] = u; }
        }
      }
      const path = [b];
      while (path[0] !== a && prev[path[0]]) path.unshift(prev[path[0]]);
      return { path, years: dist[b] || 0 };
    },
    // 여정 속도: 경공 무공 + 트리 「경공 입문」
    travelMult: w => (1 + 0.01 * W.eff(w, 'walk')) * tm('walk'),
    startAge: () => Math.max(10, 16 - ta('young')),
    // 레벨. 'realm'은 지금 경지 (직업 조건에 쓴다)
    L: (w, id) => (id === 'realm' ? W.realm(w) : w.lvl[id] || 0),
    // 무공 효과 합: 레벨 × 레벨당 효과 (data.js skills[].eff)
    eff(w, k) { let s = 0; for (const sk of D.skills) if (sk.eff[k]) s += (w.lvl[sk.id] || 0) * sk.eff[k]; return s; },
    // 경지: 이번 생 무공 레벨 합
    realmSum(w) { let s = 0; for (const sk of D.skills) s += w.lvl[sk.id] || 0; return s; },
    realm(w) { const t = W.realmSum(w); let i = 0; while (i + 1 < D.realms.length && t >= D.realms[i + 1][1]) i++; return i; },
    realmName: i => D.realms[i][0],
    need: (lv, isJob) => (isJob ? 12 : 10) * (lv + 1) * Math.pow(1.025, lv),
    peakMult: (w, id) => 1 + (w.peak[id] || 0) / 10 * (1 + ta('peak')),
    xpMult(w) {
      let m = (1 + 0.01 * W.eff(w, 'xp')) * G.globalMult() * (1 + G.relicVal('w_xp'));
      if (w.items.manual) m *= 2;
      if (w.items.manor) m *= 2;
      if (w.items.daehwan) m *= 1.5;
      return m * (1 + 0.1 * w.elix);
    },
    jobXp: (w, id) => 15 * W.xpMult(w) * W.peakMult(w, id) * (1 + 0.01 * W.eff(w, 'jxp')) * tm('jobXp'),
    skillXp: (w, id) => 15 * W.xpMult(w) * W.peakMult(w, id) * (1 + 0.01 * W.eff(w, 'sxp')) * (w.items.room ? 1.5 : 1) * tm('skillXp'),
    income(w) {
      const j = jobDef(w.job);
      let m = j.inc * (1 + 0.1 * W.L(w, j.id)) * (1 + 0.01 * W.eff(w, 'gold')) * G.globalMult() * (1 + G.relicVal('w_gold')) * tm('gold');
      if (w.items.sword) m *= 1.5;
      return m;
    },
    lifespan(w) {
      // 화경부터는 반로환동: 경지마다 천수 +4년
      let y = BASE_LIFE + ta('life') + W.eff(w, 'life') + 4 * Math.max(0, W.realm(w) - 4);
      if (w.items.pill) y += 8;
      if (w.items.daehwan) y += 15;
      if (G.synergy('syn_marrow')) y += 5 * G.S.w.xianxia.realm;
      return Math.max(W.startAge() + 10, y);
    },
    // 무공 총 레벨(전생 최고 기준) — 판타지 시너지가 쓴다
    mastery(w) {
      let s = 0;
      for (const sk of D.skills) s += Math.max(w.peak[sk.id] || 0, W.L(w, sk.id));
      return s;
    },
    // 경지마다 전투력 +30%
    power: w => (3 + W.eff(w, 'pow')) * (1 + 0.3 * W.realm(w)) * tm('combat') * G.globalMult(),
    maxHp: w => (40 + W.eff(w, 'hp')) * tm('combat') * G.globalMult(),
    jobIdx: w => jobDef(w.job).tier,
    // 무공을 이 지역에서 익힐 수 있는 장소 (없으면 null)
    skillAt: (s, region) => (s.at.find(a => a[0] === region) || [])[1] || null,
    reqMet(w, def) {
      if (def.unlock && !ta(def.unlock)) return false;
      return !def.req || Object.entries(def.req).every(([id, lv]) => W.L(w, id) >= lv);
    },
    // 다음 직업: 지금 진로(직업에 진로가 있으면 그것, 아직 공통이면 w.path)의 한 단계 위
    nextJob(w) {
      const cur = jobDef(w.job), path = cur.path || w.path;
      return D.jobs.find(j => j.tier === cur.tier + 1 && (!j.path || j.path === path)) || null;
    },
    gainIns(w, n) { n *= tm('ins'); w.ins += n; G.tally('wuxia', n); },

    gain(w, id, amt, isJob) {
      w.xp[id] = (w.xp[id] || 0) + amt;
      let lv = W.L(w, id);
      while (w.xp[id] >= W.need(lv, isJob)) {
        w.xp[id] -= W.need(lv, isJob);
        lv++;
        if (lv > (w.peak[id] || 0)) {
          G.addEss(0.004 * lv * (isJob ? 1 + jobDef(id).tier : 1), 'wuxia');
          W.gainIns(w, 0.05);
        }
      }
      w.lvl[id] = lv;
    },
    rebirth(w) {
      let sum = 0;
      for (const id in w.lvl) { sum += w.lvl[id]; w.peak[id] = Math.max(w.peak[id] || 0, w.lvl[id]); }
      W.gainIns(w, Math.pow(sum / 10, 1.2));
      const keep = { peak: w.peak, lives: w.lives + 1, ins: w.ins, tree: w.tree, bestJob: w.bestJob, autoPromote: w.autoPromote, autoSkill: w.autoSkill, autoBuy: w.autoBuy, path: w.path };
      Object.assign(w, W.init(G.S.stree ? G.Tree.add('stars', G.S.stree, 'head') : 0), keep);
      w.age = W.startAge();
      G.addSigns(1, 'wuxia');
      const rt = W.rt(w);
      rt.travel = null;
      W.enter(w, rt, 'hwaeum', 'i');
      const { x, y } = rt.hero;
      W.heal(w, rt);
      G.fx(rt, { k: 'ring', x, y, r: 2, t: 1, col: '#ffe08a' });
      G.J.finish('wuxia', x, y, 1.3);
      G.J.sfx('wuxia', 'finish');
      G.log(`회귀했다. ${w.lives + 1}번째 삶, 다시 ${Math.floor(w.age)}세`, 'wuxia', 'good');
    },
    heal(w, rt) { rt.hero.max = W.maxHp(w); rt.hero.hp = rt.hero.max; },
    buyItem(w, id) {
      const it = D.items.find(x => x.id === id);
      if (w.items[id] || w.gold < it.cost) return false;
      w.gold -= it.cost;
      w.items[id] = true;
      const h = W.rt(w).hero;
      G.fx(W.rt(w), { k: 'text', x: h.x, y: h.y - 1, s: it.n, col: '#ffe08a', t: 1.5, sz: 1.2, pop: true });
      G.J.sfx('wuxia', 'coin');
      return true;
    },
    // 영단: 생마다 몇 번이고 산다. 하나에 모든 숙련 +10%, 값은 ×3씩
    elixCost: w => 50 * Math.pow(3, w.elix),
    buyElixir(w) {
      const c = W.elixCost(w);
      if (w.gold < c) return false;
      w.gold -= c;
      w.elix++;
      const h = W.rt(w).hero;
      G.fx(W.rt(w), { k: 'text', x: h.x, y: h.y - 1, s: '영단 +10%', col: '#9fe79f', t: 1.2, pop: true });
      G.J.sfx('wuxia', 'coin');
      return true;
    },

    // 지금 가야 할 장소 (이 지역 지도의 글자)
    dest(w) {
      if (w.mode === 'work') return jobDef(w.job).at;
      return W.skillAt(skillDef(w.skill), W.rt(w).region) || jobDef(w.job).at;
    },
    spot(rt, ch) { return rt.map.poi[ch][0]; },
    // 이 지역에서 익힐 수 있는 무공
    localSkills: (w, region) => D.skills.filter(sk => W.skillAt(sk, region) && W.reqMet(w, sk)),
    // 자동 수련: 다음 직업 조건 중 이 지역에서 가장 모자란 무공 → 경지가 모자라면 가장 낮은 무공(빨리 오른다)
    // → 아니면 모든 숙련을 올리는 심법, 그것도 없으면 가장 낮은 무공
    pickSkill(w) {
      const region = W.rt(w).region, here = W.localSkills(w, region);
      if (!here.length) return;
      const nx = W.nextJob(w);
      let best = null, gap = 0;
      if (nx && nx.req) for (const [id, lv] of Object.entries(nx.req)) {
        const sd = skillDef(id);
        if (sd && here.includes(sd) && W.L(w, id) < lv && lv - W.L(w, id) > gap) { gap = lv - W.L(w, id); best = id; }
      }
      const low = () => here.reduce((a, b) => (W.L(w, b.id) < W.L(w, a.id) ? b : a)).id;
      if (!best && nx && nx.req && nx.req.realm > W.realm(w)) best = low();
      if (!best) best = (here.find(sk => sk.eff.xp) || {}).id || low();
      w.skill = best;
    },
    setJob(w, id) { const d = jobDef(id); if (W.reqMet(w, d)) { w.job = id; w.mode = 'work'; if (d.path) w.path = d.path; W.rt(w).stay = 0; } },
    // 무공은 지금 지역에서 익힐 수 있는 것만 (다른 지역 무공은 그 지역에 살 때)
    setSkill(w, id) {
      const d = skillDef(id);
      if (!W.reqMet(w, d) || !W.skillAt(d, W.rt(w).region)) return false;
      w.skill = id; w.mode = 'train'; w.autoSkill = false; W.rt(w).stay = 0;
      return true;
    },
    // 강호 지도에서 지역을 누르면: 거기서 할 수 있는 가장 높은 직업으로 (여정은 알아서 떠난다)
    goRegion(w, id) {
      const jobs = D.jobs.filter(j => j.r === id && W.reqMet(w, j) && (!j.path || j.path === (jobDef(w.job).path || w.path) || jobDef(w.job).tier < 3));
      if (!jobs.length) return false;
      W.setJob(w, jobs.reduce((a, b) => (b.tier > a.tier ? b : a)).id);
      return true;
    },
    // 맵 클릭: 산적이면 공격 지시, 장소면 그 장소의 직업·무공으로
    click(w, x, y) {
      const rt = W.rt(w);
      for (const b of rt.bandits) if (Math.hypot(b.x - x, b.y - y) < 1) { rt.focus = b; G.J.hit('wuxia', b); G.J.sfx('wuxia', 'select'); return true; }
      let best = null, bd = 1.6;
      const R = D.regions[rt.region];
      for (const ch in R.places) for (const [px, py] of rt.map.poi[ch] || []) {
        const d = Math.hypot(px - x, py - y);
        if (d < bd) { bd = d; best = ch; }
      }
      if (!best) return false;
      const jobs = D.jobs.filter(j => j.r === rt.region && j.at === best && W.reqMet(w, j));
      const skills = D.skills.filter(s => W.skillAt(s, rt.region) === best && W.reqMet(w, s));
      if (jobs.length && (!skills.length || w.mode === 'train')) W.setJob(w, jobs[jobs.length - 1].id);
      else if (skills.length) W.setSkill(w, skills[0].id);
      else { G.fx(rt, { k: 'text', x, y, s: '아직 갈 수 없다', col: '#ff9a9a', t: 1 }); G.J.sfx('wuxia', 'error'); return true; }
      G.fx(rt, { k: 'ring', x: rt.map.poi[best][0][0], y: rt.map.poi[best][0][1], r: 1, t: 0.6, col: '#ffe08a' });
      G.J.sfx('wuxia', 'select');
      return true;
    },
    // 여정 상태 (강호 지도 그리기용): { from, to, frac, path }
    journey(w) { const t = W.rt(w).travel; return t ? { ...t, frac: Math.min(1, t.t / t.T) } : null; },

    tick(w, dt) {
      const rt = W.rt(w), h = rt.hero, m = rt.map;
      G.fxTick(rt, dt);
      const jd = jobDef(w.job);
      h.t = D.outfits[jd.tier];
      h.art = (jd.path === 'ma' ? 'wx_mhero' : 'wx_hero') + jd.tier;
      h.wpn = W.jobIdx(w) >= 2 ? (W.jobIdx(w) >= 6 ? 'w_duel' : 'w_katana') : null;
      h.moving = false;
      if (w.dead) {
        h.dim = true;
        if ((rt.deadT -= dt) <= 0) W.rebirth(w);
        return;
      }
      h.dim = false;
      w.age += dt / YEAR;
      const inc = W.income(w) * dt;
      w.gold += inc;
      // 은자: 이번 생의 물건과 영단에 쓴다 (회귀하면 사라진다)
      if (w.autoBuy) {
        for (const it of D.items) if (!w.items[it.id] && w.gold >= it.cost) W.buyItem(w, it.id);
        if (w.gold >= W.elixCost(w) * 2) W.buyElixir(w);
      }
      // 승진·자동 수련
      if (w.autoPromote) {
        const nx = W.nextJob(w);
        if (nx && W.reqMet(w, nx)) {
          w.job = nx.id;
          if (nx.path) w.path = nx.path;
          const idx = nx.tier;
          if (idx > w.bestJob) {
            w.bestJob = idx;
            G.addEss(2 * Math.pow(idx, 2), 'wuxia');
            G.log(`강호에 이름을 알렸다: 「${nx.n}」`, 'wuxia', 'good');
            G.J.flash('wuxia', '#ffd24a');
            G.J.sfx('wuxia', 'unlock');
          } else G.J.sfx('wuxia', 'chime');
          G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.2, s: nx.n, col: '#ffd24a', t: 1.8, sz: 1.4, pop: true });
        }
      }
      if (w.autoSkill) W.pickSkill(w);
      h.max = W.maxHp(w);
      // 여정: 직업이 다른 지역이면 강호 길목(X)으로 걸어 나가 길을 떠난다. 길 위에서도 세월은 흐르고 녹봉은 들어온다.
      const home = jobDef(w.job).r;
      if (rt.travel) {
        h.hidden = true;
        if ((rt.travel.t += dt) >= rt.travel.T) {
          const to = rt.travel.to;
          rt.travel = null;
          h.hidden = false;
          W.enter(w, rt, to, null);
          G.fx(rt, { k: 'ring', x: h.x, y: h.y, r: 2, t: 0.8, col: '#ffe08a' });
          G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.3, s: D.regions[to].n, col: '#ffe08a', t: 1.8, sz: 1.5, pop: true });
          G.J.sfx('wuxia', 'chime');
        }
        W.ageUp(w, rt, 0);
        return;
      }
      if (rt.region !== home && !rt.bandits.some(b => b.aggro)) {
        h.hp = Math.min(h.max, h.hp + h.max * 0.05 * dt);
        const [ex, ey] = rt.map.poi.X[0];
        if (GR.moveTo(m, h, ex, ey, WALK * tm('walk'), dt, 0.2)) {
          const r = W.route(rt.region, home);
          rt.travel = { from: rt.region, to: home, path: r.path, t: 0, T: Math.max(1.5, r.years * YEAR / W.travelMult(w)) };
          G.log(`${D.regions[home].n}(으)로 길을 떠난다 · ${r.years}년 길`, 'wuxia');
        }
        W.ageUp(w, rt, 0);
        return;
      }
      // 산적
      if ((rt.banditT -= dt) <= 0 && rt.bandits.length < 2) {
        rt.banditT = BANDIT_T;
        const [bx, by] = U.pick(m.poi.S || m.poi.X);
        // 산적은 주인공 수준에 맞춰 나온다: 여섯 대쯤 맞으면 쓰러지고, 주인공 체력의 절반 남짓을 깎는다
        const ji = W.jobIdx(w), hp = W.power(w) * 6;
        rt.bandits.push({ kind: 'mon', t: 'wx_bandit' + U.rand(2), wpn: 'w_knife', x: bx, y: by, s: 1, hp, max: hp, atk: W.maxHp(w) / 14, bar: true, goal: null, atkT: 1, ji });
      }
      for (const b of rt.bandits) {
        b.moving = false;
        if (GR.dist(b, h) < 1.8 || rt.focus === b) b.aggro = true;
        if (b.aggro) {
          if (GR.dist(b, h) > 1.1) GR.moveTo(m, b, h.x, h.y, 2.6, dt, 1);
          else if ((b.atkT -= dt) <= 0) {
            b.atkT = 1;
            h.hp -= b.atk;
            G.fx(rt, { k: 'text', x: h.x, y: h.y - 0.6, s: '-' + U.fmt(b.atk), col: '#ff6b6b', t: 0.7 });
            G.J.hit('wuxia', h);
            G.J.sfx('wuxia', 'hurt');
          }
        } else {
          if (!b.goal || GR.moveTo(m, b, b.goal[0], b.goal[1], 1.4, dt)) b.goal = U.pick(m.poi['='] || m.poi.S);
        }
      }
      // 마을 사람
      for (const v of rt.villagers) {
        v.moving = false;
        if (v.wait > 0) { v.wait -= dt; continue; }
        if (!v.goal) v.goal = GR.randomCell(m, (cx, cy) => '.=,'.includes(GR.at(m, cx, cy)));
        if (v.goal && GR.moveTo(m, v, v.goal[0], v.goal[1], 1.2, dt)) { v.goal = null; v.wait = 2 + Math.random() * 4; }
      }
      // 주인공
      if (rt.restT > 0) {
        rt.restT -= dt;
        h.hp = Math.min(h.max, h.hp + h.max * 0.2 * dt);
      } else {
        const foe = rt.bandits.find(b => b.aggro);
        if (foe) {
          if (GR.dist(h, foe) > 1.1) GR.moveTo(m, h, foe.x, foe.y, WALK * tm('walk'), dt, 1);
          else {
            h.flip = foe.x < h.x;
            if ((rt.atkT = (rt.atkT || 0) - dt) <= 0) {
              rt.atkT = 0.7;
              const dmg = W.power(w);
              foe.hp -= dmg;
              G.fx(rt, { k: 'slash', x: foe.x, y: foe.y, t: 0.3, rot: Math.random() - 0.5, flip: h.x > foe.x });
              G.J.lunge('wuxia', h, foe);
              G.fx(rt, { k: 'splat', x: foe.x, y: foe.y, dx: foe.x - h.x, dy: foe.y - h.y, n: 5, t: 0.5 });
              G.fx(rt, { k: 'text', x: foe.x, y: foe.y - 0.6, s: U.fmt(dmg), col: '#fff', t: 0.7, sz: 0.85 + 0.5 * Math.min(1, dmg / foe.max) });
              G.J.hit('wuxia', foe, foe.hp <= 0 ? 0.45 : 0);
              G.J.sfx('wuxia', foe.hp <= 0 ? 'hit' : 'tap');
              if (foe.hp <= 0) {
                const g = jobDef(D.jobs[foe.ji].id).inc * 8 * tm('bounty') * G.globalMult();
                w.gold += g;
                W.gain(w, 'geom', 20 * (foe.ji + 1) * tm('bounty'), false);
                G.fx(rt, { k: 'text', x: foe.x, y: foe.y - 1, s: '+' + U.fmt(g), col: '#ffd24a', t: 1.1 });
                G.J.sfx('wuxia', 'coin');
                G.J.shake('wuxia', 5, foe.x > h.x ? 1 : -1, 0, 0.2);
                rt.bandits = rt.bandits.filter(b => b !== foe);
                if (rt.focus === foe) rt.focus = null;
              }
            }
          }
          if (h.hp <= 0) {
            G.log('산적에게 당했다… 객잔에서 몸을 추스른다', 'wuxia', 'bad');
            G.J.sfx('wuxia', 'lose');
            for (const b of rt.bandits) b.aggro = false;
            rt.bandits = rt.bandits.filter(b => b !== foe);
            const [ix, iy] = W.spot(rt, jd.at);
            h.x = ix; h.y = iy;
            h.hp = 1;
            rt.restT = 5;
            rt.focus = null;
          }
        } else {
          h.hp = Math.min(h.max, h.hp + h.max * 0.05 * dt);
          const [tx, ty] = W.spot(rt, W.dest(w));
          if (GR.moveTo(m, h, tx, ty, WALK * tm('walk'), dt, 0.1)) {
            rt.stay += dt;
            if (w.mode === 'work') {
              W.gain(w, w.job, W.jobXp(w, w.job) * dt, true);
              if (ta('twin')) W.gain(w, w.skill, W.skillXp(w, w.skill) * ta('twin') * dt, false);
            } else W.gain(w, w.skill, W.skillXp(w, w.skill) * dt, false);
            if (Math.random() < dt * 1.5) G.fx(rt, { k: 'text', x: h.x + (Math.random() - 0.5), y: h.y - 0.8, s: w.mode === 'work' ? '…' : '気', col: w.mode === 'work' ? '#ccc' : '#9fe0ff', t: 0.8 });
            if (rt.stay >= (w.mode === 'work' ? WORK_T : TRAIN_T)) {
              // 이 지역에 익힐 무공이 없으면 일만 한다
              const canTrain = !!W.skillAt(skillDef(w.skill), rt.region);
              w.mode = w.mode === 'work' && canTrain ? 'train' : 'work';
              rt.stay = 0;
            }
          }
        }
      }
      W.ageUp(w, rt, 0);
    },
    // 천수: 다하면 쓰러지고 잠시 뒤 회귀
    ageUp(w, rt, dt) {
      const h = rt.hero;
      if (dt) w.age += dt / YEAR;
      if (w.age >= W.lifespan(w) && !w.dead) {
        rt.travel = null;
        h.hidden = false;
        w.dead = true;
        rt.deadT = 2.5;
        G.log(`${Math.floor(w.age)}세, 천수를 다했다`, 'wuxia', 'bad');
        G.J.sfx('wuxia', 'lose');
        G.fx(rt, { k: 'tile', key: 'x_statue', x: h.x, y: h.y, t: 2.5 });
      }
    },
    view(w) {
      const rt = W.rt(w);
      // 장소 글자 → 그 지역 장소의 타일 (이름 뒤 목록)
      const P = D.regions[rt.region].places, pt = c => (P[c] ? P[c].slice(1) : ['v_grass']);
      return {
        map: rt.map, ents: [...rt.villagers, ...rt.bandits, ...(rt.hero.hidden ? [] : [rt.hero])], fx: rt.fx, fit: true, cam: rt.hero,
        // 여정 중에는 지역 지도를 어둡게 (강호 지도가 가운데로 나온다)
        tint: rt.travel ? 'rgba(5,6,10,0.72)' : D.regions[rt.region].tint || null,
        terrain(x, y) {
          // 민가 벽(#)·화산파 전각 벽(W)은 0x72식으로 방향마다 다른 조각 (바위·벽이 아닌 칸이 트인 쪽)
          const ch = GR.at(rt.map, x, y), pre = ch === '#' ? 'vw_' : ch === 'W' ? 'vm_' : null;
          const isWall = (xx, yy) => '#W'.includes(GR.at(rt.map, xx, yy)) && GR.at(rt.map, xx, yy) !== ' ';
          if (pre && G.ARTSET[pre + 'hw0']) {
            // 벽 밑 땅: 사분면마다 그쪽 이웃(가로 → 세로 → 대각선 순)의 땅을 깐다. 실내 쪽은 마루, 바깥쪽은 풀밭.
            const ground = (xx, yy) => { const c = GR.at(rt.map, xx, yy); return '#WM '.includes(c) ? null : (D.tiles[c] || pt(c))[0]; };
            const L = [];
            for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
              const sx = qx ? 1 : -1, sy = qy ? 1 : -1;
              const pick = [[sx, 0], [0, sy], [sx, sy]].map(([dx, dy]) => [ground(x + dx, y + dy), dx, dy]).find(g => g[0]);
              if (pick) L.push({ k: pick[0], q: [qx, qy], dx: pick[1], dy: pick[2] });
            }
            L.push(pre + 'hw' + GR.blob(x, y, (xx, yy) => GR.at(rt.map, xx, yy) === ch));
            return L;
          }
          if (pre && G.ARTSET[pre + 'wface']) return GR.wallKeys(x, y, (xx, yy) => GR.at(rt.map, xx, yy) === ch, (xx, yy) => !'#WM '.includes(GR.at(rt.map, xx, yy)), pre, '', true);
          const base = D.tiles[ch] || pt(ch);
          // 땅 그림자: 바로 위가 벽(앞면)이면 그 밑동만 살짝 어둡다. 좌우 그림자는 0x72 벽과 어울리지 않아 쓰지 않는다.
          if (!base || !G.ARTSET.sh_N || ch === 'M' || !isWall(x, y - 1)) return base || null;
          return [base[0], 'sh_N', ...base.slice(1)];
        },
        labels: [...Object.entries(P).map(([ch, p]) => ({ x: rt.map.poi[ch][0][0], y: rt.map.poi[ch][0][1], s: p[0], on: W.dest(w) === ch })),
          { x: rt.map.poi.X[0][0], y: rt.map.poi.X[0][1], s: '강호', on: rt.region !== jobDef(w.job).r }],
      };
    },
    status: w => `${jobDef(w.job).n} · ${Math.floor(w.age)}세`,
    regionOf: w => W.rt(w).region,
    jobDef, skillDef,
  };
  return W;
})();
