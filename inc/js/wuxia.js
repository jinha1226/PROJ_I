'use strict';
// 무협 · 화산귀환록 (회귀 루프 — Increlution, Progress Knight 계열을 마을 지도 위에서)
// 주인공은 일터(직업 장소)와 수련터(무공 장소)를 번갈아 오간다. 그 자리에 있을 때만 숙련이 오른다. 1년은 8초.
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
        age: 16, gold: 5 * Math.pow(10, head), job: 'jumso', skill: 'naegong', lvl: {}, xp: {}, peak: {}, items: {},
        lives: 0, ins: 0, tree: G.Tree.init('wuxia'), dead: false, bestJob: 0, autoPromote: true, autoSkill: true, autoBuy: true, mode: 'work', elix: 0,
      };
    },
    rt(w) { return G.RT.wuxia || (G.RT.wuxia = W.boot(w)); },
    boot(w) {
      const map = GR.fromAscii(D.map, D.pass);
      const [x, y] = map.poi.i[0];
      const rt = { map, fx: [], bandits: [], villagers: [], hero: { kind: 'hero', x, y, s: 1.1, bar: true }, stay: 0, banditT: 4, focus: null, restT: 0, deadT: 0 };
      for (let i = 0; i < 4; i++) {
        const c = GR.randomCell(map, (cx, cy) => '.=,'.includes(GR.at(map, cx, cy)) && cy > 12);
        if (c) rt.villagers.push({ kind: 'npc', t: { k: 'v_villager', v: i }, x: c[0], y: c[1], s: 0.9, goal: null, wait: Math.random() * 3 });
      }
      W.heal(w, rt);
      return rt;
    },
    startAge: () => Math.max(10, 16 - ta('young')),
    L: (w, id) => w.lvl[id] || 0,
    need: (lv, isJob) => (isJob ? 12 : 10) * (lv + 1) * Math.pow(1.025, lv),
    peakMult: (w, id) => 1 + (w.peak[id] || 0) / 10 * (1 + ta('peak')),
    xpMult(w) {
      let m = (1 + 0.01 * W.L(w, 'naegong')) * (1 + 0.03 * W.L(w, 'magong')) * G.globalMult() * (1 + G.relicVal('w_xp'));
      if (w.items.manual) m *= 2;
      if (w.items.manor) m *= 2;
      if (w.items.daehwan) m *= 1.5;
      return m * (1 + 0.1 * w.elix);
    },
    jobXp: (w, id) => 15 * W.xpMult(w) * W.peakMult(w, id) * (1 + 0.01 * W.L(w, 'gyeong')) * tm('jobXp'),
    skillXp: (w, id) => 15 * W.xpMult(w) * W.peakMult(w, id) * (1 + 0.01 * W.L(w, 'tuna')) * (w.items.room ? 1.5 : 1) * tm('skillXp'),
    income(w) {
      const j = jobDef(w.job);
      let m = j.inc * (1 + 0.1 * W.L(w, j.id)) * (1 + 0.01 * W.L(w, 'geom')) * G.globalMult() * (1 + G.relicVal('w_gold')) * tm('gold');
      if (w.items.sword) m *= 1.5;
      return m;
    },
    lifespan(w) {
      let y = BASE_LIFE + ta('life') + 0.25 * W.L(w, 'yangsaeng') - 0.1 * W.L(w, 'magong');
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
    power: w => (3 + 1.2 * W.L(w, 'geom') + 0.6 * W.L(w, 'naegong') + 0.3 * W.L(w, 'gyeong')) * tm('combat') * G.globalMult(),
    maxHp: w => (40 + 4 * W.L(w, 'naegong') + 2 * W.L(w, 'gyeong')) * tm('combat') * G.globalMult(),
    jobIdx: w => D.jobs.findIndex(j => j.id === w.job),
    reqMet(w, def) {
      if (def.unlock && !ta(def.unlock)) return false;
      return !def.req || Object.entries(def.req).every(([id, lv]) => W.L(w, id) >= lv);
    },
    nextJob: w => D.jobs[W.jobIdx(w) + 1] || null,
    gainIns(w, n) { n *= tm('ins'); w.ins += n; G.tally('wuxia', n); },

    gain(w, id, amt, isJob) {
      w.xp[id] = (w.xp[id] || 0) + amt;
      let lv = W.L(w, id);
      while (w.xp[id] >= W.need(lv, isJob)) {
        w.xp[id] -= W.need(lv, isJob);
        lv++;
        if (lv > (w.peak[id] || 0)) {
          G.addEss(0.004 * lv * (isJob ? 1 + D.jobs.findIndex(j => j.id === id) : 1), 'wuxia');
          W.gainIns(w, 0.05);
        }
      }
      w.lvl[id] = lv;
    },
    rebirth(w) {
      let sum = 0;
      for (const id in w.lvl) { sum += w.lvl[id]; w.peak[id] = Math.max(w.peak[id] || 0, w.lvl[id]); }
      W.gainIns(w, Math.pow(sum / 10, 1.2));
      const keep = { peak: w.peak, lives: w.lives + 1, ins: w.ins, tree: w.tree, bestJob: w.bestJob, autoPromote: w.autoPromote, autoSkill: w.autoSkill, autoBuy: w.autoBuy };
      Object.assign(w, W.init(G.S.stree ? G.Tree.add('stars', G.S.stree, 'head') : 0), keep);
      w.age = W.startAge();
      G.addSigns(1, 'wuxia');
      const rt = W.rt(w), [x, y] = rt.map.poi.i[0];
      Object.assign(rt.hero, { x, y });
      rt.focus = null;
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

    // 지금 가야 할 장소
    dest(w) {
      const def = w.mode === 'work' ? jobDef(w.job) : skillDef(w.skill);
      return def.at;
    },
    spot(rt, ch) { return rt.map.poi[ch][0]; },
    pickSkill(w) {
      const nx = W.nextJob(w);
      let best = null, gap = 0;
      if (nx && nx.req) for (const [id, lv] of Object.entries(nx.req)) {
        const sd = skillDef(id);
        if (sd && W.reqMet(w, sd) && W.L(w, id) < lv && lv - W.L(w, id) > gap) { gap = lv - W.L(w, id); best = id; }
      }
      // 다음 직업 조건이 다 찼으면 모든 숙련을 올려 주는 자하신공(객잔 옆 약초방)
      w.skill = best || 'naegong';
    },
    setJob(w, id) { const d = jobDef(id); if (W.reqMet(w, d)) { w.job = id; w.mode = 'work'; W.rt(w).stay = 0; } },
    setSkill(w, id) { const d = skillDef(id); if (W.reqMet(w, d)) { w.skill = id; w.mode = 'train'; w.autoSkill = false; W.rt(w).stay = 0; } },
    // 맵 클릭: 산적이면 공격 지시, 장소면 그 장소의 직업·무공으로
    click(w, x, y) {
      const rt = W.rt(w);
      for (const b of rt.bandits) if (Math.hypot(b.x - x, b.y - y) < 1) { rt.focus = b; G.J.hit('wuxia', b); G.J.sfx('wuxia', 'select'); return true; }
      let best = null, bd = 1.6;
      for (const ch in D.places) for (const [px, py] of rt.map.poi[ch] || []) {
        const d = Math.hypot(px - x, py - y);
        if (d < bd) { bd = d; best = ch; }
      }
      if (!best) return false;
      const jobs = D.jobs.filter(j => j.at === best && W.reqMet(w, j));
      const skills = D.skills.filter(s => s.at === best && W.reqMet(w, s));
      if (jobs.length && (!skills.length || w.mode === 'train')) W.setJob(w, jobs[jobs.length - 1].id);
      else if (skills.length) W.setSkill(w, skills[0].id);
      else { G.fx(rt, { k: 'text', x, y, s: '아직 갈 수 없다', col: '#ff9a9a', t: 1 }); G.J.sfx('wuxia', 'error'); return true; }
      G.fx(rt, { k: 'ring', x: rt.map.poi[best][0][0], y: rt.map.poi[best][0][1], r: 1, t: 0.6, col: '#ffe08a' });
      G.J.sfx('wuxia', 'select');
      return true;
    },

    tick(w, dt) {
      const rt = W.rt(w), h = rt.hero, m = rt.map;
      G.fxTick(rt, dt);
      h.t = D.outfits[W.jobIdx(w)];
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
          const idx = D.jobs.indexOf(nx);
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
      // 산적
      if ((rt.banditT -= dt) <= 0 && rt.bandits.length < 2) {
        rt.banditT = BANDIT_T;
        const [bx, by] = U.pick(m.poi.S);
        // 산적은 주인공 수준에 맞춰 나온다: 여섯 대쯤 맞으면 쓰러지고, 주인공 체력의 절반 남짓을 깎는다
        const ji = W.jobIdx(w), hp = W.power(w) * 6;
        rt.bandits.push({ kind: 'mon', t: { k: 'v_bandit', v: U.rand(2) }, x: bx, y: by, s: 1, hp, max: hp, atk: W.maxHp(w) / 14, bar: true, goal: null, atkT: 1, ji });
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
        if (!v.goal) v.goal = GR.randomCell(m, (cx, cy) => '.=,'.includes(GR.at(m, cx, cy)) && cy > 12);
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
              G.fx(rt, { k: 'slash', x: foe.x, y: foe.y, t: 0.18 });
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
            const [ix, iy] = W.spot(rt, 'i');
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
            if (rt.stay >= (w.mode === 'work' ? WORK_T : TRAIN_T)) { w.mode = w.mode === 'work' ? 'train' : 'work'; rt.stay = 0; }
          }
        }
      }
      if (w.age >= W.lifespan(w)) {
        w.dead = true;
        rt.deadT = 2.5;
        G.log(`${Math.floor(w.age)}세, 천수를 다했다`, 'wuxia', 'bad');
        G.J.sfx('wuxia', 'lose');
        G.fx(rt, { k: 'tile', key: 'x_statue', x: h.x, y: h.y, t: 2.5 });
      }
    },
    view(w) {
      const rt = W.rt(w);
      return {
        map: rt.map, ents: [...rt.villagers, ...rt.bandits, rt.hero], fx: rt.fx, fit: true, cam: rt.hero,
        terrain: (x, y) => D.tiles[GR.at(rt.map, x, y)] || null,
        labels: Object.entries(D.places).map(([ch, n]) => ({ x: rt.map.poi[ch][0][0], y: rt.map.poi[ch][0][1], s: n, on: W.dest(w) === ch })),
      };
    },
    status: w => `${jobDef(w.job).n} · ${Math.floor(w.age)}세`,
    jobDef, skillDef,
  };
  return W;
})();
