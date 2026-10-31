'use strict';
// 무협 · 화산귀환록 (회귀 루프 — Increlution, Progress Knight 계열을 강호 지도 위에서)
// 강호는 지역마다 타일 지도 하나. 주인공은 한 지역에 머물며 그 지역의 활동(일·임무·원정·비무·천하제일 비무)과
// 수련을 번갈아 한다. 지역마다 역할이 다르다(진로마다도): 명성이 잘 오르는 곳 / 심법·외공·경공·잡학 수련이 잘 되는 곳. 1년은 8초.
// 명성: 쓰는 돈(w.gold)이자, 이번 생에 쌓은 양(w.fameT)이 지위(점소이 … 매화검선·천마신)를 정한다 — 써도 지위는 안 내려간다.
// 지위마다 녹봉(초당 명성)과 숙련 보너스. 점소이·표사·낭인 다음 소속(정파 화산·사파 녹림·마교 십만대산)을 고른다(w.path).
// 소속은 맛이다: 지위 이름·옷·근거지·원정 대상·무공 이름이 달라질 뿐 수치는 같다 (세계마다 핵심 결정은 하나 — 무협은 생애 계획표).
// 무공 레벨 합이 경지(삼류 … 생사경). 다른 지역으로 가면 강호로 나가 여정 — 세월이 흐른다(경공·경지로 줄인다).
// 생애 계획표(w.plan): 나이 구간마다 어느 지역에서 무엇(명성·심법·외공·경공·잡학)에 집중할지. 회귀해도 남는다.
// 천수가 다하면 회귀: 전생 최고 무공 레벨이 다음 생의 숙련 속도, 이번 생의 업적이 「깨달음」(스킬트리).
G.RT = G.RT || {};
G.Wuxia = (() => {
  const D = G.D.WX, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('wuxia', G.S.w.wuxia.tree, k);
  const ta = k => G.Tree.add('wuxia', G.S.w.wuxia.tree, k);
  const YEAR = 8, BASE_LIFE = 70, WORK_T = 8, TRAIN_T = 16, BANDIT_T = 25, WALK = 5, RAID_T = 2.5, DUEL_T = 20, BOSS_T = 30;
  const FAM = { 심법: 'xp_sim', 외공: 'xp_oe', 경공: 'xp_gg', 잡학: 'xp_jh' };
  const jobDef = id => D.jobs.find(j => j.id === id);
  const skillDef = id => D.skills.find(s => s.id === id);

  const W = {
    YEAR,
    init(head = 0) {
      return {
        age: 16, gold: 5 * Math.pow(10, head), fameT: 0, job: 'jumso', skill: 'tuna', lvl: {}, xp: {}, peak: {}, items: {}, path: 'jeong', hold: null, errand: null, champ: false, plan: null, planAuto: true,
        lives: 0, ins: 0, tree: G.Tree.init('wuxia'), dead: false, bestJob: 0, autoPromote: true, autoSkill: true, autoBuy: true, mode: 'work', elix: 0, goal: null,
      };
    },
    rt(w) { return G.RT.wuxia || (G.RT.wuxia = W.boot(w)); },
    boot(w) {
      const rt = { fx: [], foes: [], villagers: [], hero: { kind: 'hero', x: 0, y: 0, s: 1.1, bar: true }, stay: 0, banditT: 4, raidT: 2, duelT: 6, bossT: 4, focus: null, restT: 0, deadT: 0, travel: null, rage: 0, rageHits: 0, zixia: 0, zixiaCd: 0 };
      // 처음 켤 때는 가야 할 지역에서 바로 (여정 없이)
      W.enter(w, rt, W.target(w), null);
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
      rt.foes = [];
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
      rt.raidT = 2; rt.duelT = 6; rt.bossT = 4;
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
    // 여정 속도: 경공 무공 × 트리 × 경지(한 단계마다 +15%) × 초상비
    realmTravel: w => 1 + 0.15 * W.realm(w),
    travelMult: w => W.sum(W.parts(w, 'walk')),
    tripYears: (w, a, b) => W.route(a, b).years / W.travelMult(w),

    startAge: () => Math.max(10, 16 - ta('young')),
    // 레벨. 'realm'은 지금 경지
    L: (w, id) => (id === 'realm' ? W.realm(w) : w.lvl[id] || 0),
    // 무공 효과 합: 레벨 × 레벨당 효과 (data.js skills[].eff)
    eff(w, k) { let s = 0; for (const sk of D.skills) if (sk.eff[k]) s += (w.lvl[sk.id] || 0) * sk.eff[k]; return s; },
    // 경지: 이번 생 무공 레벨 합. 문턱은 트리 「경지 깨달음」으로 낮춘다
    realmSum(w) { let s = 0; for (const sk of D.skills) s += w.lvl[sk.id] || 0; return s; },
    realmNeed: i => D.realms[i][1] * Math.max(0.5, 1 - ta('realmEase')),
    realm(w) { const t = W.realmSum(w); let i = 0; while (i + 1 < D.realms.length && t >= W.realmNeed(i + 1)) i++; return i; },
    realmName: i => D.realms[i][0],
    need: lv => 10 * (lv + 1) * Math.pow(1.025, lv),
    // 전생 최고 레벨: 늘 조금(+2.5%/레벨), 그리고 그 레벨까지는 ×2로 따라잡는다 (Increlution·Progress Knight처럼)
    peakMult: (w, id) => (1 + (w.peak[id] || 0) / 40 * (1 + ta('peak'))) * ((w.lvl[id] || 0) < (w.peak[id] || 0) ? 2 + ta('pl_catch') : 1),
    catchingUp: (w, id) => (w.lvl[id] || 0) < (w.peak[id] || 0),
    // 특산 효과: 가진 물건의 배수 곱 / 계열 배수 / 천수 합
    itemMul(w, k) { let m = 1; for (const it of D.items) if (w.items[it.id] && it.eff[k]) m *= it.eff[k]; return m; },
    itemFam(w, f) { let m = 1; for (const it of D.items) if (w.items[it.id] && it.eff.fam && it.eff.fam[f]) m *= it.eff.fam[f]; return m; },
    itemLife(w) { let y = 0; for (const it of D.items) if (w.items[it.id] && it.eff.life) y += it.eff.life; return y; },
    // 지역 수련 배수 (그 지역 그 진로의 train 표)
    regionTrain: (w, region, fam) => ((W.act(w, region).train || {})[fam] || 1),
    // 지위 보너스: 단계마다 숙련 +10%
    rankXp: w => 1 + 0.1 * jobDef(w.job).tier,
    // 계열 숙련 배율 (전생 레벨·지역을 뺀 것): 무공 효과 × 특산 × 트리 × 넥서스·유물·붕괴(globalMult)
    famXp(w, fam) { return W.sum(W.parts(w, fam)); },
    // 영구 배율은 출처끼리 더한다: 1 + Σ(출처 배수 − 1). 곱하면 출처 하나하나가 서로를 키워 후반이 폭주한다.
    // (지역 수련 배수·전생 따라잡기·버프처럼 상황에 따라 켜지는 것은 따로 곱한다)
    sum: parts => 1 + parts.reduce((a, p) => a + p[1] - 1, 0),
    // 배율이 어디서 왔나: [[이름, 배수], ...] — 더하면 화면의 총 배율 (말풍선용)
    parts(w, k) {
      const dim = G.globalMult(), x = v => +v.toFixed(2);
      if (FAM[k]) return [['무공', x((1 + 0.01 * W.eff(w, 'xp')) * (1 + 0.01 * W.eff(w, 'sxp')))], ['지위', x(W.rankXp(w))], ['영단', x(1 + (0.1 + ta('elixEff')) * w.elix)],
        ['특산', x(W.itemMul(w, 'xp') * W.itemFam(w, k))], ['트리', x(tm('sxp') * tm(FAM[k]))], ['차원', x(dim * (1 + G.relicVal('w_xp')))]];
      if (k === 'fame') return [['무공', x(1 + 0.01 * W.eff(w, 'fame'))], ['특산', x(W.itemMul(w, 'fame'))], ['트리', x(tm('fame'))], ['차원', x(dim * (1 + G.relicVal('w_gold')))]];
      if (k === 'pow') return [['무공(기본)', x(3 + W.eff(w, 'pow'))], ['경지', x(1 + 0.3 * W.realm(w))], ['트리', x(tm('combat') * (1 + 0.3 * W.pathNote(w, 'plum')))], ['특산', x(W.itemMul(w, 'pow'))], ['차원', x(dim)]];
      if (k === 'walk') return [['무공', x(1 + 0.01 * W.eff(w, 'walk'))], ['경지', x(W.realmTravel(w))], ['트리', x(tm('walk') * (1 + 0.25 * ta('gg_fly')))]];
      if (k === 'ins') return [['트리', x(tm('ins'))]];
      return [];
    },
    skillXp(w, id, region) {
      const sk = skillDef(id);
      // 계획표 집중 계열이면 트리 「집중 수련」만큼 더
      const focus = sk.fam === W.curFocus(w) ? 1 + ta('focusXp') : 1;
      return 15 * W.famXp(w, sk.fam) * W.peakMult(w, id) * W.regionTrain(w, region || w.region || 'hwaeum', sk.fam) * focus;
    },
    // 녹봉: 지위의 초당 명성 × 무공·물건·트리
    stipend(w) {
      const j = jobDef(w.job);
      let m = j.inc * W.fameMult(w) * tm('stipend');
      m *= 1 + 0.5 * W.pathNote(w, 'dom');
      return m;
    },
    income: w => W.stipend(w),
    // 명성 배율 (녹봉 빼고): 무공 효과 × 특산 × 트리 × 넥서스·유물·붕괴
    fameMult: w => W.sum(W.parts(w, 'fame')),
    addFame(w, n) { w.gold += n; w.fameT += n; },
    lifespan(w) {
      // 마교 무공의 천수 감소는 「천마 해방」으로 절반
      let neg = 0, pos = 0;
      for (const sk of D.skills) { const v = (w.lvl[sk.id] || 0) * (sk.eff.life || 0); if (v < 0) neg += v; else pos += v; }
      let y = BASE_LIFE + ta('life') + pos + neg * (1 - 0.5 * ta('ma_free')) + 4 * Math.max(0, W.realm(w) - 4) + 3 * ta('jh_med');
      y += W.itemLife(w);
      if (G.synergy('syn_marrow')) y += 5 * G.S.w.xianxia.realm;
      return Math.max(W.startAge() + 10, y);
    },
    // 무공 총 레벨(전생 최고 기준) — 판타지 시너지가 쓴다
    mastery(w) {
      let s = 0;
      for (const sk of D.skills) s += Math.max(w.peak[sk.id] || 0, W.L(w, sk.id));
      return s;
    },
    // 경지마다 전투력 +30%. 화산 「매화개화」: 화산 진로면 ×1.3
    powMult: w => W.sum(W.parts(w, 'pow').slice(1)),
    power: w => (3 + W.eff(w, 'pow')) * W.powMult(w),
    maxHp: w => (40 + W.eff(w, 'hp')) * tm('combat') * tm('hp') * G.globalMult() * W.itemMul(w, 'hp'),
    atkCd: () => 0.7 / (1 + 0.3 * ta('oe_combo')),
    jobIdx: w => jobDef(w.job).tier,
    pathOf: w => jobDef(w.job).path || w.path,
    // 진로가 바뀌면 트리 배율을 다시 셈 (진로 가지는 지금 진로일 때만 켜진다)
    pathChanged(w) { if (w.tree && w.tree._c) w.tree._c = {}; },
    setPath(w, k) { if (jobDef(w.job).tier >= 3) return false; w.path = k; W.pathChanged(w); return true; },
    // 소속 가지 노드 (어느 소속이든 같다)
    pathNote: (w, k) => ta(k),
    // 무공 이름: 소속 무공은 소속마다 이름이 다르다
    skillName: (w, sk) => (sk.names ? sk.names[W.pathOf(w)] || sk.n : sk.n),
    // 무공을 이 지역에서 익힐 수 있는 장소 (없으면 null)
    skillAt: (s, region) => (s.at.find(a => a[0] === region) || [])[1] || null,
    reqMet(w, def) {
      if (def.unlock && !ta(def.unlock)) return false;
      return !def.req || Object.entries(def.req).every(([id, lv]) => W.L(w, id) >= lv);
    },
    // 지위: 지금 진로의 한 단계 위 / 오를 수 있나 (쌓은 명성·경지·천하제일 비무)
    nextJob(w) {
      const cur = jobDef(w.job), path = cur.path || w.path;
      return D.jobs.find(j => j.tier === cur.tier + 1 && (!j.path || j.path === path)) || null;
    },
    fameNeed: j => j.fame * Math.max(0.3, 1 - ta('rankEase')),
    rankOk: (w, j) => w.fameT >= W.fameNeed(j) && W.realm(w) >= (j.realm || 0) && (!j.champ || w.champ),
    chain: w => D.jobs.filter(j => !j.path || j.path === W.pathOf(w)),
    gainIns(w, n) { n *= tm('ins'); w.ins += n; G.tally('wuxia', n); },

    gain(w, id, amt) {
      w.xp[id] = (w.xp[id] || 0) + amt;
      let lv = W.L(w, id);
      while (w.xp[id] >= W.need(lv)) {
        w.xp[id] -= W.need(lv);
        lv++;
        if (lv > (w.peak[id] || 0)) {
          G.addEss(0.002 * lv * (1 + jobDef(w.job).tier * 0.5), 'wuxia');
          W.gainIns(w, 0.05);
        }
      }
      w.lvl[id] = lv;
    },
    rebirth(w) {
      // 전생 기록 (최근 12생): 코스 · 도달 지위 · 경지 · 천수 · 이번 생 깨달음
      const insGain = (W.realmSum(w) / 10 + 0.5 * Math.pow(jobDef(w.job).tier, 2)) * tm('ins');
      w.hist = [...(w.hist || []), { n: w.lives + 1, auto: !!w.planAuto, job: w.job, realm: W.realm(w), sum: W.realmSum(w), age: Math.floor(w.age), ins: +insGain.toFixed(1) }].slice(-12);
      let sum = 0;
      for (const sk of D.skills) { const id = sk.id; sum += w.lvl[id] || 0; w.peak[id] = Math.max(w.peak[id] || 0, w.lvl[id] || 0); }
      W.gainIns(w, sum / 10 + 0.5 * Math.pow(jobDef(w.job).tier, 2));
      const keep = { peak: w.peak, lives: w.lives + 1, ins: w.ins, tree: w.tree, bestJob: w.bestJob, autoPromote: w.autoPromote, autoSkill: w.autoSkill, autoBuy: w.autoBuy, path: w.path, plan: w.plan, planAuto: w.planAuto, hist: w.hist, bestRealm: w.bestRealm || 0 };
      Object.assign(w, W.init(G.S.stree ? G.Tree.add('stars', G.S.stree, 'head') : 0), keep);
      w.age = W.startAge();
      W.pathChanged(w);
      // 「전생의 이름」: 회귀해도 앞 지위 몇 단계는 건너뛴다
      const skip = D.jobs.filter(j => !j.path && j.tier <= ta('reg_rank'));
      if (skip.length) { const top = skip[skip.length - 1]; w.fameT = top.fame; w.job = top.id; }
      w.gold += 50 * ta('head');
      G.addSigns(1, 'wuxia');
      const rt = W.rt(w);
      rt.travel = null;
      W.enter(w, rt, 'hwaeum', 'i');
      rt.lastRealm = 0;
      const { x, y } = rt.hero;
      W.heal(w, rt);
      G.fx(rt, { k: 'ring', x, y, r: 2, t: 1, col: '#ffe08a' });
      G.J.finish('wuxia', x, y, 1.3);
      G.J.sfx('wuxia', 'finish');
      G.log(`회귀했다. ${w.lives + 1}번째 삶, 다시 ${Math.floor(w.age)}세`, 'wuxia', 'good');
    },
    heal(w, rt) { rt.hero.max = W.maxHp(w); rt.hero.hp = rt.hero.max; },
    // 지역 특산: 그 지역에 있을 때만 산다
    itemCost: it => it.cost * Math.max(0.4, 1 - ta('shop') - 0.3 * ta('gh_merchant')),
    buyItem(w, id) {
      const it = D.items.find(x => x.id === id), rt = W.rt(w);
      if (w.items[id] || w.gold < W.itemCost(it) || it.r !== rt.region || rt.travel) return false;
      w.gold -= W.itemCost(it);
      w.items[id] = true;
      if (w.errand === it.r) w.errand = null;
      const h = rt.hero;
      G.fx(rt, { k: 'text', x: h.x, y: h.y - 1, s: it.n, col: '#ffe08a', t: 1.5, sz: 1.2, pop: true });
      G.J.sfx('wuxia', 'coin');
      return true;
    },
    // 영단: 생마다 몇 번이고 산다. 하나에 모든 숙련 +10%, 값은 ×4씩 (어디서나)
    elixCost: w => 50 * Math.pow(4, w.elix),
    buyElixir(w) {
      const c = W.elixCost(w);
      if (w.gold < c) return false;
      w.gold -= c;
      w.elix++;
      const h = W.rt(w).hero;
      G.fx(W.rt(w), { k: 'text', x: h.x, y: h.y - 1, s: '영단', col: '#9fe79f', t: 1.2, pop: true });
      G.J.sfx('wuxia', 'coin');
      return true;
    },

    // ── 어디서 무엇을 ──
    // 가야 할 지역: 직접 고른 곳(📍) → 심부름(다른 지역 특산) → 천하제일 비무가 필요하면 천산 → 지위의 근거지
    // ── 생애 계획표 ──
    // 단계: { r: 지역, f: 집중('fame' | 심법 | 외공 | 경공 | 잡학), u: 끝나는 조건('rank' 지위 단계 | 'realm' 경지 | 'end' 끝까지), v: 그 값 }
    // 위에서부터 차례로. 이미 이룬 단계는 건너뛴다(지위·경지는 이번 생에 내려가지 않으니 매번 계산해도 된다). 회귀하면 처음부터.
    // 나이로 나누지 않는 이유: 천수가 늘면 구간이 어긋나고, 따라잡기로 같은 목표를 생마다 더 일찍 이룬다.
    FOCUS: ['fame', '심법', '외공', '경공', '잡학'],
    focusName: f => (f === 'fame' ? '명성' : f),
    // 추천 코스 (진로마다): 마을 명성 → 본산 수련 → 수련지 → 낙양 명성 → 본산 수련 → 낙양 끝까지
    recommend(path) {
      const R = {
        jeong: [['hwaeum', 'fame', 'rank', 2], ['hwasan', '심법', 'realm', 3], ['wudang', '외공', 'realm', 4], ['nakyang', 'fame', 'rank', 7], ['hwasan', '심법', 'realm', 6], ['nakyang', 'fame', 'end', 0]],
        sa: [['hwaeum', 'fame', 'rank', 2], ['noklim', '외공', 'realm', 3], ['noklim', '심법', 'realm', 4], ['nakyang', 'fame', 'rank', 7], ['noklim', '외공', 'realm', 6], ['nakyang', 'fame', 'end', 0]],
        ma: [['hwaeum', 'fame', 'rank', 2], ['sipman', '심법', 'realm', 3], ['sipman', '외공', 'realm', 4], ['nakyang', 'fame', 'rank', 7], ['sipman', '심법', 'realm', 6], ['nakyang', 'fame', 'end', 0]],
      }[path] || [];
      return R.map(([r, f, u, v]) => ({ r, f, u, v }));
    },
    // 단계 칸: 기본 4, 트리 「계획표」 가지로 늘린다
    maxSteps: () => 4 + ta('pl_steps'),
    // 자동 코스: 추천 코스를 칸 수에 맞춰 줄인 것 (4칸: 1·2·4·6단계, 5칸: 1·2·3·4·6단계, 6칸 이상: 전부)
    // 상황을 보고 그때그때 정하는 방식도 봇으로 재 봤지만 이 고정 코스보다 느렸다 — 손대지 않는 사람에게 가장 검증된 길을 준다.
    autoPlan(w) {
      const full = W.recommend(W.pathOf(w)), n = W.maxSteps();
      return n >= full.length ? full : n === 5 ? [0, 1, 2, 3, 5].map(i => full[i]) : [0, 1, 3, 5].map(i => full[i]);
    },
    // 지금 따르는 계획: 자동이면 자동 코스, 아니면 내 코스(w.plan — 처음 고칠 때 자동 코스를 복사해 시작)
    plan(w) {
      if (w.planAuto) return W.autoPlan(w);
      if (w.plan && w.plan.some(b => b.u == null)) w.plan = null;
      if (!w.plan || !w.plan.length) w.plan = W.autoPlan(w);
      return w.plan;
    },
    // 지금 집중 (자동 코스도 집중이 있다 — 계획표 가지 노드가 자동에도 듣게)
    curFocus: w => W.block(w).f,
    stepDone: (w, b) => (b.u === 'rank' ? jobDef(w.job).tier >= b.v : b.u === 'realm' ? W.realm(w) >= b.v : false),
    // 지금 단계 (모두 이뤘으면 마지막)
    stepIdx(w) { const P = W.plan(w); const i = P.findIndex(b => !W.stepDone(w, b)); return i < 0 ? P.length - 1 : i; },
    block(w) { return W.plan(w)[W.stepIdx(w)]; },
    stepGoal(w, b) {
      if (b.u === 'end') return '끝까지';
      if (b.u === 'realm') return `경지 ${W.realmName(b.v)}까지`;
      const path = W.pathOf(w), j = D.jobs.find(x => x.tier === b.v && (!x.path || x.path === path));
      return `지위 ${j ? j.n : b.v + '단계'}까지`;
    },
    // 계획표를 직접 고치면 내 코스로 (회귀해도 남는다). 자동 코스로 돌아가도 내 코스는 남아 있다
    editPlan(w, fn) { if (w.planAuto) { w.planAuto = false; W.plan(w); } fn(w.plan); },
    setAuto(w, on) { w.planAuto = on; if (!on) W.plan(w); },
    // 내 코스를 자동 코스로 덮어쓴다
    resetPlan(w) { w.plan = JSON.parse(JSON.stringify(W.autoPlan(w))); },
    // 가야 할 지역: 직접 고른 곳(📍) → 천하제일 비무(조건이 되면) → 계획표의 지금 블록
    target(w) {
      if (w.hold) return w.hold;
      const nx = W.nextJob(w);
      if (nx && nx.champ && !w.champ && w.fameT >= W.fameNeed(nx) && W.realm(w) >= (nx.realm || 0)) return 'cheonsan';
      return W.block(w).r;
    },
    // 그 지역의 활동 (진로마다 다를 수 있다)
    act(w, region) {
      const A = D.acts[region];
      return A[W.pathOf(w)] || A.any;
    },
    // 지금 가야 할 장소 (이 지역 지도의 글자)
    dest(w) {
      const rt = W.rt(w), a = W.act(w, rt.region);
      if (w.mode === 'train' && W.localSkills(w, rt.region).length) return a.ta || a.at;
      return a.at0 && jobDef(w.job).tier === 0 ? a.at0 : a.at;
    },
    spot(rt, ch) { return rt.map.poi[ch][0]; },
    // 익힐 수 있는 무공: 진로가 맞고 조건을 채운 것 (어디서든). 적 본산에서는 수련하지 않는다
    localSkills(w, region) {
      if (W.act(w, region).kind === 'raid') return [];
      // 소속 무공은 소속에 들어선 뒤(지위 4단계부터)
      const inPath = jobDef(w.job).tier >= 3;
      return D.skills.filter(sk => (!sk.sect || inPath) && W.reqMet(w, sk));
    },
    // 자동 수련: 경지가 모자라면 지금 가장 빨리 오르는 무공(숙련 속도 ÷ 다음 레벨 필요량 — 전생 최고 레벨 보너스까지 따진다)
    // → 아니면 모든 숙련을 올리는 심법 → 가장 빨리 오르는 무공
    pickSkill(w) {
      const here = W.localSkills(w, W.rt(w).region);
      if (!here.length) return;
      const nx = W.nextJob(w);
      const speed = sk => W.skillXp(w, sk.id) / W.need(W.L(w, sk.id));
      // 지역이 밀어 주는 계열부터 (경지가 모자라지 않아도)
      const boosted = here.filter(sk => W.regionTrain(w, W.rt(w).region, sk.fam) > 1);
      const low = () => here.reduce((a, b) => (speed(b) > speed(a) ? b : a)).id;
      let best = null;
      // 계획표 집중 계열이 있으면 그 계열에서 가장 빨리 오르는 무공
      const f = W.curFocus(w), fam = here.filter(sk => sk.fam === f);
      if (fam.length) best = fam.reduce((a, b) => (speed(b) > speed(a) ? b : a)).id;
      if (!best && nx && (nx.realm || 0) > W.realm(w)) best = low();
      if (!best && boosted.length) best = boosted.reduce((a, b) => (speed(b) > speed(a) ? b : a)).id;
      if (!best) best = (here.find(sk => sk.eff.xp) || {}).id || low();
      w.skill = best;
    },
    setSkill(w, id) {
      const d = skillDef(id);
      if (!W.reqMet(w, d) || !W.localSkills(w, W.rt(w).region).includes(d)) return false;
      w.skill = id; w.mode = 'train'; w.autoSkill = false; W.rt(w).stay = 0;
      return true;
    },
    // 강호 지도에서 지역을 누르면 그곳에 머문다(📍). 지금 머무는 곳·근거지를 다시 누르면 자동으로 돌아간다
    goRegion(w, id) {
      if (w.hold === id || (!w.hold && id === jobDef(w.job).home)) { w.hold = null; return true; }
      w.hold = id;
      w.errand = null;
      return true;
    },
    // 맵 클릭: 적이면 공격 지시, 수련터면 그 무공으로
    click(w, x, y) {
      const rt = W.rt(w);
      for (const b of rt.foes) if (Math.hypot(b.x - x, b.y - y) < 1) { rt.focus = b; b.aggro = true; G.J.hit('wuxia', b); G.J.sfx('wuxia', 'select'); return true; }
      let best = null, bd = 1.6;
      const R = D.regions[rt.region];
      for (const ch in R.places) for (const [px, py] of rt.map.poi[ch] || []) {
        const d = Math.hypot(px - x, py - y);
        if (d < bd) { bd = d; best = ch; }
      }
      if (!best) return false;
      const a = W.act(w, rt.region);
      if (best === a.ta && W.localSkills(w, rt.region).length) { w.mode = 'train'; rt.stay = 0; }
      else { w.mode = 'work'; rt.stay = 0; }
      G.fx(rt, { k: 'ring', x: rt.map.poi[best][0][0], y: rt.map.poi[best][0][1], r: 1, t: 0.6, col: '#ffe08a' });
      G.J.sfx('wuxia', 'select');
      return true;
    },
    // ── 이번 생 예상: 지금 상태를 복사해 이번 생을 끝까지 빠르게 돌린다 (실제 게임에는 영향 없음) ──
    // auto: 자동 코스로 / plan: 이 계획표로. 같은 난수(시드)로 돌려 두 코스를 공정하게 비교한다.
    forecast(w, auto, plan) {
      const c = JSON.parse(JSON.stringify(w));
      c.planAuto = auto; c.goal = null;
      if (!auto) c.plan = JSON.parse(JSON.stringify(plan || w.plan || W.autoPlan(w)));
      c.autoBuy = w.autoBuy; c.autoSkill = w.autoSkill; c.autoPromote = true; c.hold = null;
      // 바깥에 흔적을 남기는 것들은 잠시 막는다
      W.sim = true;
      const keep = { rt: G.RT.wuxia, ess: G.addEss, log: G.log, signs: G.addSigns, tally: G.tally, J: G.J, rnd: Math.random, S: G.S.w.wuxia };
      let seed = 12345;
      Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const noop = () => {};
      G.addEss = noop; G.log = noop; G.addSigns = noop; G.tally = noop;
      G.J = new Proxy({}, { get: () => noop });
      G.S.w.wuxia = c;
      G.RT.wuxia = null;
      const out = { marks: [] };
      try {
        W.rt(c);
        let lastJob = c.job, lastRealm = W.realm(c), steps = 0;
        const insStart = c.ins;
        while (!c.dead && steps < 20000) {
          W.tick(c, 0.25);
          steps++;
          if (c.job !== lastJob) { lastJob = c.job; out.marks.push({ age: Math.floor(c.age), s: jobDef(c.job).n }); }
          const rl = W.realm(c);
          if (rl !== lastRealm) { lastRealm = rl; out.marks.push({ age: Math.floor(c.age), s: W.realmName(rl) }); }
        }
        out.job = jobDef(c.job).n; out.tier = jobDef(c.job).tier;
        out.realm = W.realm(c); out.sum = W.realmSum(c); out.age = Math.floor(c.age);
        // 이번 생 깨달음: 생 동안 얻은 것 + 회귀할 때 받을 것
        out.ins = c.ins - insStart + (W.realmSum(c) / 10 + 0.5 * Math.pow(jobDef(c.job).tier, 2)) * tm('ins');
      } finally {
        W.sim = false;
        G.RT.wuxia = keep.rt; G.addEss = keep.ess; G.log = keep.log; G.addSigns = keep.signs; G.tally = keep.tally; G.J = keep.J; Math.random = keep.rnd; G.S.w.wuxia = keep.S;
      }
      return out;
    },
    // 여정 상태 (강호 지도 그리기용): { from, to, frac, path }
    journey(w) { const t = W.rt(w).travel; return t ? { ...t, frac: Math.min(1, t.t / t.T) } : null; },

    // ── 적 ──
    // kind: bandit(화음현 산적) · raid(적 본산 문도) · duel(비무대 고수) · boss(천하제일 비무)
    spawnFoe(w, rt, kind, x, y) {
      const P = W.power(w), H = W.maxHp(w), region = rt.region;
      const RAID = { hwasan: 'wx_hero3', sipman: 'wx_mhero4', noklim: 'wx_shero3', wudang: 'wx_hero5' };
      const art = kind === 'raid' ? RAID[region] || 'wx_bandit0' : kind === 'duel' ? 'wx_hero' + (2 + U.rand(5)) : kind === 'boss' ? 'wx_mhero8' : 'wx_bandit' + U.rand(2);
      const st = {
        bandit: [P * 6, H / 14], raid: [P * 7 * (1 - 0.3 * W.pathNote(w, 'fear')), H / 12],
        duel: [P * 14, H / 9], boss: [P * 12 * Math.pow(0.85, ta('gh_boss')), H / 16],
      }[kind];
      const f = { kind: 'mon', foe: kind, t: 'wx_bandit0', art, wpn: kind === 'bandit' ? 'w_knife' : 'w_katana', x, y, s: kind === 'boss' ? 1.25 : 1, hp: st[0], max: st[0], atk: st[1], bar: true, goal: null, atkT: 1, aggro: kind !== 'bandit', label: kind === 'boss' ? '천하제일 고수' : null };
      rt.foes.push(f);
      return f;
    },
    // ── 소속 무공 (UNITS.md 무협 시트): 정파 검객 · 사파 도객 · 마교 마인 ──
    kitName(w, id) { const n = G.Tree.idx.wuxia[id]; return n.names[['jeong', 'sa', 'ma'].indexOf(W.pathOf(w))] || n.n; },
    // 한 번 칠 때의 배율: 분노 ×2 · 혈흔(체력 50% 이하 적) ×1.5 · 천마신공 ×2
    kitMult(w, rt, foe) {
      const P = W.pathOf(w);
      let m = 1;
      if (P === 'sa' && rt.rageHits > 0) { m *= 2; rt.rageHits--; }
      if (P === 'ma' && ta('kit_sp') && foe.hp < foe.max * 0.5) m *= 1.5;
      if (P === 'ma' && ta('kit_a')) m *= 2;
      return m;
    },
    // 친 뒤: 매화 낙화(치명이면 주변 50%) · 사파 기본 앞 범위 50% · 마교 기본 흡혈 10% · 흡성대법(약화)
    kitOnHit(w, rt, h, foe, dmg, crit) {
      const P = W.pathOf(w);
      const around = r => rt.foes.filter(o => o !== foe && GR.dist(o, foe) <= r);
      if (P === 'jeong' && crit && ta('kit_sp')) for (const o of around(2)) { o.hp -= dmg * 0.5; G.fx(rt, { k: 'tile', key: 'v_plum', x: o.x, y: o.y - 0.3, t: 0.5, s: 0.6 }); W.kitKill(w, rt, o); }
      if (P === 'sa') for (const o of around(1.5)) { o.hp -= dmg * 0.5; W.kitKill(w, rt, o); }
      if (P === 'ma') h.hp = Math.min(h.max, h.hp + dmg * 0.1);
      if (P === 'ma' && ta('kit_b')) foe.weak = true;
    },
    // 기술로 쓰러진 적 (주 표적 말고)
    kitKill(w, rt, o) {
      if (o.hp > 0) return;
      W.reward(w, rt, o);
      G.fx(rt, { k: 'die', spr: o.art || o.t, x: o.x, y: o.y, s: o.s, flip: o.flip, t: 0.5 });
      rt.foes = rt.foes.filter(b => b !== o);
      if (rt.focus === o) rt.focus = null;
    },
    // 기술 1과 암향표. 쓰면 true (그 틈에는 평타를 치지 않는다)
    kitCast(w, rt, h, foe, dt) {
      const P = W.pathOf(w), pw = W.power(w);
      if (rt.zixia > 0) { rt.zixia -= dt; h.hp = Math.min(h.max, h.hp + h.max * 0.05 * dt); }
      if (rt.zixiaCd > 0) rt.zixiaCd -= dt;
      if (P === 'ma' && ta('kit_a')) h.hp -= h.max * 0.02 * dt;
      // 암향표: 처음 붙는 적에게 5연타
      if (P === 'jeong' && ta('kit_b') && rt.lastFoe !== foe) {
        rt.lastFoe = foe;
        for (let i = 0; i < 5; i++) G.fx(rt, { k: 'slash', x: foe.x + (Math.random() - 0.5) * 0.6, y: foe.y + (Math.random() - 0.5) * 0.6, t: 0.25 + i * 0.05, rot: Math.random() * 2 - 1, flip: i % 2 > 0 });
        foe.hp -= pw * 5;
        G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.2, s: W.kitName(w, 'kit_b'), col: '#ffe08a', t: 1, pop: true });
        G.J.hit('wuxia', foe, 0.3, h);
        if (foe.hp <= 0) W.kitKill(w, rt, foe);
        return true;
      }
      rt.lastFoe = foe;
      if (!ta('kit_sk') || (rt.kitT = (rt.kitT == null ? 4 : rt.kitT) - dt) > 0) return false;
      rt.kitT = 12;
      G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.3, s: W.kitName(w, 'kit_sk'), col: '#ffe08a', t: 1.2, sz: 1.2, pop: true });
      G.J.sfx('wuxia', 'hit');
      G.J.shake('wuxia', 4, 0, 1, 0.18);
      if (P === 'jeong') {
        // 이십사수매화검법: 주변 2.5칸 적 모두 ×3
        for (const o of rt.foes.filter(o => GR.dist(o, h) <= 2.5)) { o.hp -= pw * 3; G.fx(rt, { k: 'tile', key: 'v_plum', x: o.x, y: o.y - 0.3, t: 0.6, s: 0.8 }); G.fx(rt, { k: 'slash', x: o.x, y: o.y, t: 0.3, crit: true }); W.kitKill(w, rt, o); }
      } else if (P === 'sa') {
        // 녹림 장법: 장풍 ×4, 2칸 밀어낸다
        const dx = foe.x - h.x, dy = foe.y - h.y, l = Math.hypot(dx, dy) || 1, m = rt.map;
        const nx = U.clamp(Math.round(foe.x + dx / l * 2), 1, m.w - 2), ny = U.clamp(Math.round(foe.y + dy / l * 2), 1, m.h - 2);
        G.fx(rt, { k: 'impact', x: foe.x, y: foe.y, s: 2, col: '#ffd9a0', t: 0.3 });
        if (GR.pass(m, nx, ny)) { foe.x = nx; foe.y = ny; }
        foe.hp -= pw * 4;
        W.kitKill(w, rt, foe);
      } else {
        // 혈영마검: 표적을 꿰뚫고 지나간다 — 지나는 길 1칸 안 적 모두 ×3
        const dx = foe.x - h.x, dy = foe.y - h.y, l = Math.hypot(dx, dy) || 1, m = rt.map;
        const tx = U.clamp(Math.round(foe.x + dx / l * 1.5), 1, m.w - 2), ty = U.clamp(Math.round(foe.y + dy / l * 1.5), 1, m.h - 2);
        G.fx(rt, { k: 'beam', x: h.x, y: h.y, x2: tx, y2: ty, col: '#ff4a4a', w: 4, t: 0.25 });
        for (const o of rt.foes.filter(o => GR.dist(o, foe) <= 1.2 || GR.dist(o, h) <= 1.2)) { o.hp -= pw * 3; W.kitKill(w, rt, o); }
        if (GR.pass(m, tx, ty)) { h.x = tx; h.y = ty; }
      }
      return true;
    },
    // 쓰러뜨린 적의 보상
    reward(w, rt, f) {
      const s = W.stipend(w);
      let g = 0;
      if (f.foe === 'bandit') {
        g = s * 8 * tm('bounty') * (ta('gh_hero') ? 3 : 1);
        W.gain(w, w.skill, 20 * (W.jobIdx(w) + 1) * tm('bounty'));
      } else if (f.foe === 'raid') {
        g = s * 20 * tm('raid') * (1 + W.pathNote(w, 'blood'));
        W.gainIns(w, 0.03);
      } else if (f.foe === 'duel') {
        g = s * 60 * tm('duel');
        G.log('비무대에서 이겼다', 'wuxia');
      } else if (f.foe === 'boss') {
        g = s * 200 * tm('boss');
        if (!w.champ) { w.champ = true; G.log('천산 비무에서 천하제일 고수를 꺾었다!', 'wuxia', 'good'); G.J.flash('wuxia', '#ffd24a'); }
        W.gainIns(w, 1);
      }
      W.addFame(w, g);
      G.fx(rt, { k: 'text', x: f.x, y: f.y - 1, s: '+' + U.fmt(g), col: '#ffd24a', t: 1.1 });
      G.J.sfx('wuxia', 'coin');
    },

    tick(w, dt) {
      const rt = W.rt(w), h = rt.hero, m = rt.map;
      G.fxTick(rt, dt);
      const jd0 = jobDef(w.job);
      h.t = D.outfits[jd0.tier];
      h.art = ({ ma: 'wx_mhero', sa: 'wx_shero' }[jd0.path] || 'wx_hero') + jd0.tier;
      h.wpn = jd0.tier >= 2 ? (jd0.tier >= 6 ? 'w_duel' : 'w_katana') : null;
      h.moving = false;
      if (w.dead) {
        h.dim = true;
        if ((rt.deadT -= dt) <= 0) W.rebirth(w);
        return;
      }
      h.dim = false;
      w.age += dt / YEAR;
      // 녹봉: 늘 들어온다(일터에서는 그 지역 일 배수로, 그 밖에서는 절반)
      const a = W.act(w, rt.region), atWork = !rt.travel && w.mode === 'work' && (a.kind === 'work' || a.kind === 'duel') && rt.stay > 0;
      const home = a.kind === 'work' && W.pathNote(w, 'sect') && jd0.home === rt.region ? 2 : 1;
      const focusF = W.curFocus(w) === 'fame' ? 1 + ta('focusFame') : 1;
      W.addFame(w, W.stipend(w) * dt * (atWork ? (a.fame || 1) * tm('work') * home * focusF : 0.5));
      // 지위: 쌓은 명성·경지가 차면 오른다
      for (let nx = W.nextJob(w); nx && W.rankOk(w, nx); nx = W.nextJob(w)) {
        w.job = nx.id;
        if (nx.path) w.path = nx.path;
        W.pathChanged(w);
        if (nx.tier > w.bestJob) {
          w.bestJob = nx.tier;
          G.addEss(2 * Math.pow(nx.tier, 2), 'wuxia');
          G.log(`강호에 이름을 알렸다: 「${nx.n}」`, 'wuxia', 'good');
          G.J.flash('wuxia', '#ffd24a');
          G.J.sfx('wuxia', 'unlock');
        } else G.J.sfx('wuxia', 'chime');
        G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.2, s: nx.n, col: '#ffd24a', t: 1.8, sz: 1.4, pop: true });
      }
      // 명성 쓰기: 여기서 파는 특산, 남으면 영단. 다른 지역 특산을 살 만하면 심부름을 간다(자동 이동일 때)
      if (w.autoBuy && !rt.travel) {
        for (const it of D.items) if (!w.items[it.id] && it.r === rt.region && w.gold >= W.itemCost(it)) W.buyItem(w, it.id);
        if (w.gold >= W.elixCost(w) * 2) W.buyElixir(w);
      }
      if (w.autoSkill) W.pickSkill(w);
      h.max = W.maxHp(w);
      const jd = jobDef(w.job);

      // 여정: 가야 할 지역이 다르면 강호 길목(X)으로 걸어 나가 길을 떠난다. 길 위에서도 세월은 흐른다.
      const goal = w.autoPromote || w.hold ? W.target(w) : rt.region;
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
        W.ageUp(w, rt);
        return;
      }
      if (rt.region !== goal && !rt.foes.some(b => b.aggro)) {
        h.hp = Math.min(h.max, h.hp + h.max * 0.05 * dt);
        const [ex, ey] = rt.map.poi.X[0];
        if (GR.moveTo(m, h, ex, ey, WALK * tm('walk'), dt, 0.2)) {
          const r = W.route(rt.region, goal);
          rt.travel = { from: rt.region, to: goal, path: r.path, t: 0, T: Math.max(1.5, r.years * YEAR / W.travelMult(w)) };
          G.log(`${D.regions[goal].n}(으)로 길을 떠난다`, 'wuxia');
        }
        W.ageUp(w, rt);
        return;
      }
      // 적 나타남: 산적(일하는 지역) · 원정(적 본산) · 비무(낙양) · 천하제일 비무(천산)
      const near = (ch, r) => GR.randomCell(m, (cx, cy) => GR.pass(m, cx, cy) && Math.hypot(cx - ch[0], cy - ch[1]) <= r && Math.hypot(cx - ch[0], cy - ch[1]) >= 2);
      if (a.kind === 'work' && m.poi.S && (rt.banditT -= dt) <= 0 && rt.foes.length < 2) {
        rt.banditT = BANDIT_T;
        const [bx, by] = U.pick(m.poi.S);
        W.spawnFoe(w, rt, 'bandit', bx, by);
      }
      if (a.kind === 'raid' && (rt.raidT -= dt) <= 0 && rt.foes.length < 3) {
        rt.raidT = RAID_T;
        const c = near(W.spot(rt, a.at), 6);
        if (c) W.spawnFoe(w, rt, 'raid', c[0], c[1]);
      }
      if (a.kind === 'duel' && !rt.foes.length && (rt.duelT -= dt) <= 0) {
        rt.duelT = DUEL_T;
        const c = near(W.spot(rt, a.at), 2);
        if (c) W.spawnFoe(w, rt, 'duel', c[0], c[1]);
      }
      if (a.kind === 'boss' && !rt.foes.length && (rt.bossT -= dt) <= 0) {
        rt.bossT = BOSS_T;
        const c = near(W.spot(rt, a.at), 2);
        if (c) W.spawnFoe(w, rt, 'boss', c[0], c[1]);
      }
      for (const b of rt.foes) {
        b.moving = false;
        if (GR.dist(b, h) < 1.8 || rt.focus === b) b.aggro = true;
        if (b.aggro) {
          if (GR.dist(b, h) > 1.1) GR.moveTo(m, b, h.x, h.y, 2.6, dt, 1);
          else if ((b.atkT -= dt) <= 0) {
            b.atkT = 1;
            const P = W.pathOf(w);
            if (P === 'sa' && ta('kit_b') && Math.random() < 0.25) { G.fx(rt, { k: 'text', x: h.x, y: h.y - 0.8, s: '회피', col: '#9fe0ff', t: 0.6 }); continue; }
            const dmg = b.atk * (b.weak ? 0.7 : 1) * (rt.zixia > 0 ? 0.5 : 1);
            h.hp -= dmg;
            // 사파 분노: 다섯 번 맞으면 다음 3타 ×2
            if (P === 'sa' && ta('kit_sp') && ++rt.rage >= 5) { rt.rage = 0; rt.rageHits = 3; G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.1, s: '분노!', col: '#ff7a5a', t: 0.9, pop: true }); }
            // 정파 자하신공: 체력 50% 아래로 떨어지면
            if (P === 'jeong' && ta('kit_a') && h.hp < h.max * 0.5 && !(rt.zixiaCd > 0)) { rt.zixia = 10; rt.zixiaCd = 60; G.fx(rt, { k: 'ring', x: h.x, y: h.y, r: 1.6, t: 0.7, col: '#c9a6ff' }); G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.2, s: W.kitName(w, 'kit_a'), col: '#c9a6ff', t: 1.2, pop: true }); }
            G.J.lunge('wuxia', b, h);
            G.fx(rt, { k: 'text', x: h.x, y: h.y - 0.6, s: '-' + U.fmt(dmg), col: '#ff6b6b', t: 0.7 });
            G.fx(rt, { k: 'impact', x: h.x, y: h.y - 0.1, s: 0.9, col: '#ff6b6b', t: 0.18 });
            G.J.hit('wuxia', h, 0.15, b);
            G.J.shake('wuxia', 2.5, h.x > b.x ? 1 : -1, 0, 0.12);
            G.J.sfx('wuxia', 'hurt');
          }
        } else if (!b.goal || GR.moveTo(m, b, b.goal[0], b.goal[1], 1.4, dt)) b.goal = U.pick(m.poi['='] || m.poi.S || m.poi.X);
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
        h.hp = Math.min(h.max, h.hp + h.max * 0.2 * (1 + ta('jh_med')) * dt);
      } else {
        const foe = rt.foes.find(b => b.aggro);
        if (foe) {
          if (GR.dist(h, foe) > 1.1) GR.moveTo(m, h, foe.x, foe.y, WALK * tm('walk'), dt, 1);
          else {
            h.flip = foe.x < h.x;
            // 소속 기술 1 (12초마다 저절로) / 암향표: 새 적과 붙으면 5연타
            if (W.kitCast(w, rt, h, foe, dt)) { /* 기술이 이번 틈을 썼다 */ }
            else if ((rt.atkT = (rt.atkT || 0) - dt) <= 0) {
              rt.atkT = W.atkCd();
              // 타격: 치명(15%, ×2)·연타 세 번째는 크게 — 판타지와 같은 손맛(히트스톱·넉백·충격·결정타 확대)
              rt.combo = ((rt.combo || 0) + 1) % 3;
              const crit = Math.random() < 0.15, big = crit || rt.combo === 0;
              const dmg = W.power(w) * (crit ? 2 : 1) * W.kitMult(w, rt, foe);
              foe.hp -= dmg;
              W.kitOnHit(w, rt, h, foe, dmg, crit);
              const kill = foe.hp <= 0, heavy = kill || big, dir = foe.x > h.x ? 1 : -1;
              G.fx(rt, { k: 'slash', x: foe.x, y: foe.y, t: 0.3, crit: big, rot: Math.random() - 0.5, flip: h.x > foe.x });
              G.J.lunge('wuxia', h, foe);
              G.fx(rt, { k: 'splat', x: foe.x, y: foe.y, dx: foe.x - h.x, dy: foe.y - h.y, n: heavy ? 9 : 5, t: 0.5 });
              G.fx(rt, { k: 'impact', x: foe.x, y: foe.y - 0.1, s: heavy ? 1.6 : 1, col: crit ? '#ffe08a' : '#ffffff', t: 0.2 });
              G.fx(rt, { k: 'text', x: foe.x, y: foe.y - 0.6, s: U.fmt(dmg) + (crit ? '!' : ''), col: crit ? '#ffe08a' : '#fff', t: 0.8, sz: (crit ? 1.25 : 0.85) + 0.5 * Math.min(1, dmg / foe.max), pop: heavy });
              G.J.hit('wuxia', foe, kill ? 0.6 : big ? 0.35 : 0.12, h);
              G.J.sfx('wuxia', kill ? 'hit' : big ? 'hit' : 'tap');
              if (big && !kill) G.J.shake('wuxia', 3, dir, 0, 0.12);
              if (kill) {
                if (W.pathOf(w) === 'sa' && ta('kit_a')) h.hp = Math.min(h.max, h.hp + h.max * 0.15);
                W.reward(w, rt, foe);
                G.fx(rt, { k: 'die', spr: foe.art || foe.t, x: foe.x, y: foe.y, s: foe.s, flip: foe.flip, t: 0.5 });
                // 결정타: 비무·천하제일 비무·원정 마지막 한 방은 느려지며 다가간다
                if (foe.foe === 'boss' || foe.foe === 'duel') G.J.finish('wuxia', foe.x, foe.y, foe.foe === 'boss' ? 1.6 : 1.4);
                else G.J.shake('wuxia', 6, dir, 0, 0.22);
                rt.foes = rt.foes.filter(b => b !== foe);
                if (rt.focus === foe) rt.focus = null;
              }
            }
          }
          if (h.hp <= 0) {
            // 패퇴: 적 본산·천산에서 지면 그 지역을 떠난다(머물기 풀림), 마을에서는 일터에서 몸을 추스른다
            G.J.sfx('wuxia', 'lose');
            rt.foes = rt.foes.filter(b => b.foe === 'bandit' && b !== foe);
            for (const b of rt.foes) b.aggro = false;
            h.hp = h.max * 0.3;
            rt.restT = 5;
            rt.focus = null;
            if (a.kind === 'raid' || a.kind === 'boss' || a.kind === 'duel') {
              if (w.hold === rt.region) w.hold = null;
              G.log(a.kind === 'raid' ? `${a.n}에서 밀려났다…` : `${a.n}에서 졌다…`, 'wuxia', 'bad');
              if (a.kind === 'boss') rt.bossT = BOSS_T * 2;
            } else G.log('산적에게 당했다… 몸을 추스른다', 'wuxia', 'bad');
          }
        } else {
          h.hp = Math.min(h.max, h.hp + h.max * 0.05 * dt);
          const [tx, ty] = W.spot(rt, W.dest(w));
          if (GR.moveTo(m, h, tx, ty, WALK * tm('walk'), dt, 0.1)) {
            rt.stay += dt;
            if (w.mode === 'train') {
              W.gain(w, w.skill, W.skillXp(w, w.skill) * dt);
              // 두 계열 섞기(계획표 가지): 다른 계열에서 가장 빨리 오르는 무공도 30%
              if (ta('pl_mix')) {
                const cur = skillDef(w.skill), other = W.localSkills(w, rt.region).filter(k => k.fam !== cur.fam);
                if (other.length) { const o = other.reduce((p, q) => (W.skillXp(w, q.id) / W.need(W.L(w, q.id)) > W.skillXp(w, p.id) / W.need(W.L(w, p.id)) ? q : p)); W.gain(w, o.id, W.skillXp(w, o.id) * 0.3 * dt); }
              }
              // 주천순환: 심법을 익히면 이 지역의 다른 심법도 25%
              if (ta('sim_cycle') && skillDef(w.skill).fam === '심법') for (const sk of W.localSkills(w, rt.region)) if (sk.fam === '심법' && sk.id !== w.skill) W.gain(w, sk.id, W.skillXp(w, sk.id) * 0.25 * dt);
            }
            else if (ta('twin') && W.localSkills(w, rt.region).length) W.gain(w, w.skill, W.skillXp(w, w.skill) * ta('twin') * dt);
            if (Math.random() < dt * 1.5) G.fx(rt, { k: 'text', x: h.x + (Math.random() - 0.5), y: h.y - 0.8, s: w.mode === 'work' ? '…' : '気', col: w.mode === 'work' ? '#ccc' : '#9fe0ff', t: 0.8 });
            // 명성 단계는 주로 일, 계열 단계는 주로 수련. 명성 단계라도 다음 지위에 경지가 모자라면 수련 위주로 (그 단계에 갇히지 않게)
            const nxj = W.nextJob(w), fameB = W.block(w).f === 'fame' && !(nxj && W.realm(w) < (nxj.realm || 0));
            if (rt.stay >= (w.mode === 'work' ? (fameB ? WORK_T * 2.5 : WORK_T * 0.5) : (fameB ? TRAIN_T * 0.25 : TRAIN_T))) {
              // 이 지역에 익힐 무공이 없으면 활동만 한다
              const canTrain = W.localSkills(w, rt.region).some(s => s.id === w.skill);
              w.mode = w.mode === 'work' && canTrain ? 'train' : 'work';
              rt.stay = 0;
            }
          }
        }
      }
      // 경지 돌파: 오르는 순간을 잡아 연출
      const rl = W.realm(w);
      if (rt.lastRealm == null) rt.lastRealm = rl;
      if (rl > rt.lastRealm) W.breakthrough(w, rt, rl);
      rt.lastRealm = rl;
      W.ageUp(w, rt);
    },
    // 경지 돌파 연출: 경지가 높을수록 화려하게. 처음 넘는 경지는 크게, 전생에 넘어 본 경지는 짧게 (회귀 직후 연달아 뜨므로)
    REALM_COL: ['#ffffff', '#e8e2d0', '#9fe0ff', '#ffd24a', '#c78bff', '#ff7a3a', '#7dffcf', '#ffffff'],
    breakthrough(w, rt, rl) {
      const first = rl > (w.bestRealm || 0), h = rt.hero, col = W.REALM_COL[rl];
      if (first) w.bestRealm = rl;
      if (W.sim) return;
      const n = first ? rl : 1;
      for (let i = 0; i < n + 1; i++) G.fx(rt, { k: 'ring', x: h.x, y: h.y, r: 1.5 + i * 1.2, t: 0.6 + i * 0.25, col });
      // 사방의 기운이 주인공에게 빨려 든다
      for (let i = 0; i < (first ? 10 + rl * 6 : 8); i++) {
        const a = Math.random() * 6.28, d = 3 + Math.random() * 5;
        G.fx(rt, { k: 'mote', x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, x2: h.x, y2: h.y, col, t: 0.6 + Math.random() * 0.8 });
      }
      // 처음 넘는 경지는 화면 가운데 큰 배너가 맡고, 맵 위 글씨는 짧은 연출에만
      if (!first) G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.6, s: `경지 · ${W.realmName(rl)}`, col, t: 1.2, sz: 1.1, pop: true });
      if (first) {
        G.J.finish('wuxia', h.x, h.y, 1.3 + rl * 0.08);
        G.J.flash('wuxia', col);
        if (rl >= 4) G.J.shake('wuxia', 4 + rl * 1.5, 0, 0, 0.4 + rl * 0.08);
        G.J.sfx('wuxia', rl >= 5 ? 'finish' : 'unlock');
        G.log(`경지 돌파: 「${W.realmName(rl)}」`, 'wuxia', 'good');
      } else G.J.sfx('wuxia', 'chime');
      G.emit('wx_realm', { rl, first });
    },
    ageUp(w, rt) {
      const h = rt.hero;
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
        map: rt.map, ents: [...rt.villagers, ...rt.foes, ...(rt.hero.hidden ? [] : [rt.hero])], fx: rt.fx, fit: true, cam: rt.hero,
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
          { x: rt.map.poi.X[0][0], y: rt.map.poi.X[0][1], s: '강호', on: rt.region !== W.target(w) }],
      };
    },
    status: w => `${jobDef(w.job).n} · ${Math.floor(w.age)}세`,
    regionOf: w => W.rt(w).region,
    jobDef, skillDef,
  };
  return W;
})();
