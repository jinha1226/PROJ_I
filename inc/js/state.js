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
G.Prestige = {
  gain: () => Math.floor(Math.sqrt(G.S.runEss / 200)),
  can: () => G.S.runEss >= G.D.PRESTIGE_MIN,
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
G.on('tree', e => { if (e.id === 'fantasy' && G.RT.fantasy) G.Fantasy.syncAllies(G.S.w.fantasy); });
