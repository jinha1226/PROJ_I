'use strict';
// 공용 상태: 정수·인장 경제, 넥서스/별 트리 효과, 유물 소환, 차원 붕괴, 저장, 시간 진행, 오프라인 보상
// 맵 위의 엔티티(G.RT)는 저장하지 않는다. 불러오면 맵을 새로 만든다.
G.MODS = { fantasy: G.Fantasy, wuxia: G.Wuxia, xianxia: G.Xianxia, scifi: G.Scifi, cthulhu: G.Cthulhu };
G.CUR = { fantasy: 'gold', wuxia: 'ins', xianxia: 'stone', scifi: 'credits', cthulhu: 'coins' };
G.SAVE_KEY = 'rift_inc_save_v2';

G.newState = function (keep) {
  const stree = keep ? keep.stree : G.Tree.init('stars');
  const head = G.Tree.add('stars', stree, 'head');
  G.RT = {};
  G.S = {
    v: 2, time: Date.now(), playTime: 0, runTime: 0,
    ess: 0, runEss: 0, totalEss: 0, essBy: { fantasy: 0, wuxia: 0, xianxia: 0, scifi: 0, cthulhu: 0 },
    stars: 0, starsEarned: 0, signs: 0, pulls: 0, pity: 0, relics: {},
    unlocked: { fantasy: true, wuxia: false, xianxia: false, scifi: false, cthulhu: false },
    ntree: G.Tree.init('nexus'), stree, prestiges: 0, w: {}, rates: {}, coach: {},
  };
  for (const id in G.MODS) G.S.w[id] = G.MODS[id].init(head);
  if (keep) {
    const S = G.S;
    for (const k of ['stars', 'starsEarned', 'signs', 'pulls', 'pity', 'relics', 'totalEss', 'playTime', 'coach']) S[k] = keep[k];
    S.prestiges = keep.prestiges + 1;
    if (G.Tree.has('stars', stree, 'keepWorlds')) {
      S.unlocked = keep.unlocked;
      for (const id in keep.unlocked) if (keep.unlocked[id] && id !== 'fantasy') S.ntree['open_' + id] = 1;
    }
    if (G.Tree.has('stars', stree, 'keepSyn')) for (const n of G.Tree.defs.nexus) if (n.syn && keep.ntree[n.id]) S.ntree[n.id] = 1;
  }
  return G.S;
};

// ───── 배수 ─────
G.relicVal = function (eff) {
  let v = 0;
  for (const r of G.D.RELICS) if (r.eff === eff && G.S.relics[r.id]) v += r.v * G.S.relics[r.id];
  return v * (1 + G.Tree.add('stars', G.S.stree, 'relicAmp'));
};
G.starBonus = () => G.S.stars * (0.1 + G.Tree.add('stars', G.S.stree, 'starPow'));
G.globalMult = () => (1 + G.starBonus()) * G.Tree.mul('nexus', G.S.ntree, 'all') * (1 + G.relicVal('all'));
G.essMult = () => G.Tree.mul('nexus', G.S.ntree, 'ess') * (1 + G.relicVal('ess')) * (1 + G.Tree.add('stars', G.S.stree, 'starEss'));
G.synergy = id => {
  if (!G.S.ntree[id]) return false;
  return G.Tree.idx.nexus[id].req.every(r => G.S.ntree[r]);
};
G.addEss = function (n, world) {
  n *= G.essMult() * (1 + G.Tree.add(world, G.S.w[world].tree, 'ess'));
  G.S.ess += n;
  G.S.runEss += n;
  G.S.totalEss += n;
  G.S.essBy[world] += n;
  G.tally('ess', n);
};
G.addSigns = function (n, world) {
  G.S.signs += n;
  G.tally('signs', n);
  G.emit('signs', { n, world });
};

// ───── 수입 측정 (오프라인 보상용) ─────
// 각 세계 재화·정수·인장의 초당 수입을 지수 이동 평균으로 잰다.
G.tallyBuf = {};
G.tally = (k, n) => { G.tallyBuf[k] = (G.tallyBuf[k] || 0) + n; };
G.sampleRates = function (dt) {
  const R = G.S.rates, a = Math.min(1, dt / 120);
  for (const k of Object.keys(G.CUR).concat(['ess', 'signs'])) {
    const v = (G.tallyBuf[k] || 0) / dt;
    R[k] = R[k] == null ? v : R[k] + (v - R[k]) * a;
  }
  G.tallyBuf = {};
};

// ───── 유물 소환 (가차) ─────
G.Relic = {
  summon(times) {
    const cost = G.D.SUMMON_COST * times;
    if (G.S.signs < cost) return null;
    G.S.signs -= cost;
    const out = [];
    for (let i = 0; i < times; i++) {
      G.S.pulls++;
      G.S.pity++;
      const r = G.S.pity >= G.D.PITY ? 'legend' : G.U.wpick(Object.keys(G.D.RARITY), k => G.D.RARITY[k].p);
      if (r === 'legend') G.S.pity = 0;
      const relic = G.U.pick(G.D.RELICS.filter(x => x.r === r));
      const isNew = !G.S.relics[relic.id];
      G.S.relics[relic.id] = (G.S.relics[relic.id] || 0) + 1;
      out.push({ relic, isNew, lv: G.S.relics[relic.id] });
    }
    return out;
  },
};

// ───── 차원 붕괴 ─────
// 작은 차원 붕괴: 세계마다 작은 조건 하나. 판타지·무협은 늘, 나머지는 연 세계만 (판타지·무협만 열고 붕괴할 수도, 더 열고 할 수도)
// 크툴루 각성으로 일어나는 큰 붕괴(세계 융합)는 나중 콘텐츠
G.Prestige = {
  conds() {
    const S = G.S, w = S.w, out = [
      { id: 'fantasy', n: '판타지 · 최고 30층', v: w.fantasy.maxFloor, need: 30 },
      { id: 'wuxia', n: '무협 · 지위 6단계 (장문인급)', v: G.Wuxia.jobDef(w.wuxia.job).tier, need: 6 },
      { id: 'xianxia', n: `수선 · 경지 ${G.D.X.realms[4]}`, v: w.xianxia.realm, need: 4 },
      { id: 'scifi', n: 'SF · 15웨이브', v: w.scifi.maxWave, need: 15 },
      { id: 'cthulhu', n: '크툴루 · 해구 (200m)', v: w.cthulhu.best, need: 200 },
    ];
    return out.filter(c => c.id === 'fantasy' || c.id === 'wuxia' || S.unlocked[c.id]).map(c => ({ ...c, ok: c.v >= c.need }));
  },
  gain: () => Math.max(1, Math.floor(Math.sqrt(G.S.runEss / 200))),
  can: () => G.Prestige.conds().every(c => c.ok),
  go() {
    if (!G.Prestige.can()) return false;
    const old = G.S, gain = G.Prestige.gain();
    old.stars += gain;
    old.starsEarned += gain;
    G.newState(old);
    G.save();
    G.log(`차원이 붕괴했다. 별의 파편 ${gain}개가 남았다`, 'nexus', 'good');
    return gain;
  },
};

// ───── 시간 진행 ─────
G.step = function (dt) {
  G.S.playTime += dt;
  G.S.runTime += dt;
  // 히트스톱·슬로모션은 세계별로 dt를 늦추고, 멈춘 만큼 뒤에 갚는다 (G.J.dt)
  for (const id in G.MODS) if (G.S.unlocked[id]) G.MODS[id].tick(G.S.w[id], G.J.dt(id, dt));
};
G.tick = function (dt, maxStep = 0.1) {
  const total = dt;
  while (dt > 1e-9) {
    const d = Math.min(dt, maxStep);
    G.step(d);
    dt -= d;
  }
  G._rateAcc = (G._rateAcc || 0) + total;
  if (G._rateAcc >= 2) { G.sampleRates(G._rateAcc); G._rateAcc = 0; }
};
// 자리를 비운 시간: 맵을 돌리지 않고, 측정해 둔 수입 × 시간을 준다
G.offlineCap = () => (2 + 2 * G.Tree.add('nexus', G.S.ntree, 'sands')) * 3600;
G.catchUp = function (sec) {
  sec = Math.min(sec, G.offlineCap());
  const R = G.S.rates, got = { sec };
  for (const id in G.CUR) {
    if (!G.S.unlocked[id] || !R[id]) continue;
    const n = R[id] * sec;
    G.S.w[id][G.CUR[id]] += n;
    got[id] = n;
  }
  if (R.ess) { const n = R.ess * sec; G.S.ess += n; G.S.runEss += n; G.S.totalEss += n; got.ess = n; }
  if (R.signs) { const n = Math.floor(R.signs * sec); G.S.signs += n; got.signs = n; }
  G.S.playTime += sec;
  return got;
};

// ───── 저장 ─────
G.serialize = function () {
  G.S.time = Date.now();
  return JSON.stringify(G.S);
};
// 저장본을 새 상태 위에 덮어써서, 이후 버전에 생긴 필드가 비지 않게 한다
G.deserialize = function (json) {
  const data = JSON.parse(json);
  if (data.v !== 2) throw new Error('지원하지 않는 저장 버전');
  const merge = (dst, src) => {
    for (const k in src) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], src[k]);
      else dst[k] = src[k];
    }
  };
  G.newState();
  merge(G.S, data);
  // 판타지 요리 노드 → 음유시인 노드 (요리 컨셉 제거)
  const ft = G.S.w.fantasy.tree, MOVE = { cook1: 'bard', cook2: 'bless', cook3: 'songDur', cook4: 'songWar' };
  for (const k in MOVE) if (ft[k]) { ft[MOVE[k]] = Math.max(ft[MOVE[k]] || 0, 1); delete ft[k]; }
  if (ft.chef) { ft.songDur = (ft.songDur || 0) + ft.chef; delete ft.chef; }
  delete G.S.w.fantasy.ing;
  // 원정대 노드가 생기기 전 저장: 동료를 이미 열었으면 원정대도 연 것으로
  if (['archer', 'bard', 'cleric', 'mage', 'paladin', 'dragoon', 'archmage'].some(k => ft[k])) ft.party = 1;
  // 무협: 직업 레벨 → 명성 지위로 바뀌기 전 저장. 옛 트리는 쓴 깨달음을 돌려주고 비운다, 쌓은 명성은 지금 지위만큼 채운다
  const wx = G.S.w.wuxia;
  const OLD = { jxp1: [1, 1.585], gold1: [3, 1.65], jxp2: [60, 1.65], sxp1: [1, 1.585], sxp2: [60, 1.65], twin: [15, 2.3], peak1: [5, 1.78], peak2: [300, 1.91], life1: [2, 1.715], young: [10, 2.3], life2: [250, 1.91], walk: [4, 2.04], fight1: [3, 1.65], bounty: [20, 1.78], fight2: [400, 1.78], yang: [25, 1], magong: [400, 1], ins1: [20, 1.78], essw: [800, 2.17] };
  if (wx.tree && (wx.tree.jxp1 != null || wx.tree.sxp1 != null || wx.tree.fight1 != null)) {
    let back = 0;
    for (const [k, [b, g]] of Object.entries(OLD)) for (let i = 0; i < (wx.tree[k] || 0); i++) back += b * Math.pow(g, i);
    wx.tree = G.Tree.init('wuxia');
    wx.ins += back;
  }
  // 두 갈래(화산·마교) 트리 때 저장(hw1 노드가 있다): 그때 쓴 깨달음을 돌려주고 비운다 (세 갈래로 바뀌며 노드 비용이 달라졌다)
  const V2 = {'path': [2, 1.78], 'hw1': [4, 1.78], 'hw_work': [8, 1.91], 'hw_naegong': [10, 1.91], 'hw_sect': [120, 1], 'hw_geom': [25, 1.91], 'hw_plum': [300, 1], 'hw_combat': [60, 2.04], 'hw_purge': [800, 1], 'hw_raid': [1500, 2.17], 'hw_sword': [2500, 1], 'hw_qi': [2500, 1], 'hw_life': [400, 2.56], 'hw_top': [8000, 2.3], 'ma1': [4, 1.78], 'ma_work': [8, 1.91], 'ma_cheonma': [10, 1.91], 'ma_free': [120, 1], 'ma_geom': [25, 1.91], 'ma_fear': [300, 1], 'ma_combat': [60, 2.04], 'ma_blood': [800, 1], 'ma_raid': [1500, 2.17], 'ma_kill': [2500, 1], 'ma_dom': [2500, 1], 'ma_hp': [400, 2.04], 'ma_top': [8000, 2.3], 'mu': [1, 1.585], 'realm1': [30, 2.17], 'realm2': [600, 1], 'sim1': [3, 1.65], 'sim2': [50, 2.04], 'sim_cycle': [400, 1], 'sim_hp': [120, 2.04], 'oe1': [3, 1.65], 'oe2': [40, 2.04], 'oe_combo': [400, 1], 'oe3': [120, 2.04], 'gg1': [40, 1.91], 'gg2': [100, 2.04], 'gg_fly': [900, 1], 'jh1': [40, 1.91], 'yang': [60, 1], 'jh_med': [900, 1], 'magong': [700, 1], 'mu_in': [3000, 1], 'mu_out': [3000, 1], 'mu_top': [6000, 2.3], 'twin': [20, 2.3], 'elix1': [25, 2.04], 'reg': [1, 1.715], 'life1': [3, 1.91], 'young': [10, 2.69], 'ins1': [20, 2.04], 'reg_rank': [150, 1], 'reg_rank2': [2500, 1], 'head': [30, 2.17], 'peak2': [300, 2.17], 'life2': [250, 2.56], 'reg_soul': [4000, 1], 'reg_fast': [3000, 1], 'reg_long': [3000, 1], 'essw': [200, 2.17], 'essw2': [5000, 2.3], 'reg_top': [12000, 2.3], 'ins2': [600, 2.17], 'young2': [200, 2.82], 'rankEase': [100, 2.17], 'gh': [1, 1.65], 'stip1': [3, 1.78], 'walk': [4, 2.04], 'bounty': [15, 2.04], 'gh_hero': [400, 1], 'gh_merchant': [400, 1], 'shop1': [30, 2.17], 'duel1': [60, 2.04], 'gh_duelist': [700, 1], 'raid1': [600, 2.17], 'combat_gh': [150, 2.04], 'boss1': [1500, 2.56], 'boss2': [4000, 2.3], 'walk2': [200, 2.17], 'fame2': [3000, 2.3], 'stip2': [2000, 2.3], 'gh_legend': [9000, 1], 'work2': [120, 2.04], 'hp_gh': [250, 2.04], 'gh_top': [15000, 2.3], 'hw_stip': [300, 2.17], 'hw_realm': [1200, 2.56], 'ma_stip': [300, 2.17], 'ma_life': [1200, 2.56], 'sim3': [2000, 2.3], 'oe4': [2000, 2.3], 'gg3': [2500, 2.3], 'jh2': [2500, 2.3], 'life3': [3000, 2.69], 'ins3': [4000, 2.3], 'shop2': [500, 2.82]};
  if (wx.tree && wx.tree.hw1 != null) {
    let back = 0;
    for (const [k, [b, g]] of Object.entries(V2)) for (let i = 0; i < (wx.tree[k] || 0); i++) back += b * Math.pow(g, i);
    wx.tree = G.Tree.init('wuxia');
    wx.ins += back;
  }
  // 진로 셋을 소속(맛)으로 합치기 전 저장: 진로 가지(jeong_·sa_·ma_) 노드에 쓴 깨달음을 돌려주고, 진로 무공 레벨은 합친 소속 무공으로
  const PC = {"1": [1, 1.117], "work": [1, 1.1365], "xp": [1, 1.1365], "sect": [2, 1], "combat": [1, 1.156], "plum": [3, 1], "blood": [4, 1], "raid": [5, 1.1755], "pa": [6, 1], "pb": [6, 1], "top": [8, 1.195]};
  for (const k of Object.keys(wx.tree || {})) {
    const m = /^@?(jeong|sa|ma)_(\w+)$/.exec(k);
    if (!m) continue;
    const c = PC[m[2]];
    if (c && k[0] !== '@') for (let i = 0; i < wx.tree[k]; i++) wx.ins += c[0] * Math.pow(c[1], i);
    delete wx.tree[k];
  }
  const MERGE = { p_sim1: ['naegong', 'heuksal', 'cheonma'], p_sim2: ['yangui', 'heupjeong', 'heupseong'], p_oe1: ['geom', 'nokdo', 'hyeolgeom'], p_oe2: ['taeguk', 'nokjang', 'cheonmasu'], p_gg: ['gyeong', 'biyeong', 'hyeolyeong'] };
  for (const [to, from] of Object.entries(MERGE)) for (const f of from) for (const box of ['lvl', 'peak', 'xp']) {
    if (!wx[box] || wx[box][f] == null) continue;
    wx[box][to] = Math.max(wx[box][to] || 0, wx[box][f]);
    delete wx[box][f];
  }
  if (MERGE[wx.skill] === undefined && Object.values(MERGE).some(l => l.includes(wx.skill))) wx.skill = Object.keys(MERGE).find(k => MERGE[k].includes(wx.skill));
  if (!data.w || !data.w.wuxia || data.w.wuxia.fameT == null) { const j = G.D.WX.jobs.find(x => x.id === wx.job) || G.D.WX.jobs[0]; wx.job = j.id; wx.fameT = j.fame; }
  G.RT = {};
  return G.S;
};
G.save = function () {
  try { localStorage.setItem(G.SAVE_KEY, G.serialize()); } catch (e) { /* 저장소 없음 */ }
};
G.load = function () {
  let raw = null;
  try { raw = localStorage.getItem(G.SAVE_KEY); } catch (e) { /* 저장소 없음 */ }
  if (!raw) return null;
  try { return G.deserialize(raw); } catch (e) { return null; }
};
G.exportSave = () => btoa(unescape(encodeURIComponent(G.serialize())));
G.importSave = str => G.deserialize(decodeURIComponent(escape(atob(str.trim()))));
G.hardReset = function () {
  try { localStorage.removeItem(G.SAVE_KEY); } catch (e) { /* 저장소 없음 */ }
  G.newState();
};

// 트리 구매가 맵에 바로 보이게
G.on('tree', e => { if (e.id === 'fantasy' && G.RT.fantasy) { G.Fantasy.recruits(G.S.w.fantasy); G.Fantasy.syncAllies(G.S.w.fantasy); } });
