'use strict';
// 공용 상태: 저장, 시간 진행, 오프라인 보상. 화폐는 골드(세계)와 명성(시즌)뿐 — 정수 · 인장 · 유물 · 별 · 넥서스는 정리했다 (DESIGN.md 57)
// 맵 위의 엔티티(G.RT)는 저장하지 않는다. 불러오면 맵을 새로 만든다.
// 다른 세계(무협·수선·SF·크툴루)는 정리했다 — 캐릭터 컨셉만 던전 동료로 가져온다 (코드는 old/worlds/)
G.MODS = { fantasy: G.Fantasy };
G.CUR = { fantasy: 'gold' };
// 턴제 시제품(?turn)은 영구 사망이 있어 저장을 따로 쓴다
G.SAVE_KEY = 'rift_inc_save_v2' + (typeof location !== 'undefined' && /[?&]turn\b/.test(location.search) ? '_turn' : '');

G.newState = function (keep) {
  G.RT = {};
  G.S = {
    v: 2, time: Date.now(), playTime: 0, runTime: 0,
    unlocked: { fantasy: true }, w: {}, rates: {}, coach: {}, mig: { xx2: 1 },
  };
  for (const id in G.MODS) G.S.w[id] = G.MODS[id].init(0);
  if (keep) for (const k of ['playTime', 'coach']) G.S[k] = keep[k];
  return G.S;
};

// ───── 수입 측정 (오프라인 보상용) ─────
// 골드의 초당 수입을 지수 이동 평균으로 잰다.
G.tallyBuf = {};
G.tally = (k, n) => { G.tallyBuf[k] = (G.tallyBuf[k] || 0) + n; };
G.sampleRates = function (dt) {
  const R = G.S.rates, a = Math.min(1, dt / 120);
  for (const k of Object.keys(G.CUR)) {
    const v = (G.tallyBuf[k] || 0) / dt;
    R[k] = R[k] == null ? v : R[k] + (v - R[k]) * a;
  }
  G.tallyBuf = {};
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
G.OFFLINE_H = 8;
G.offlineCap = () => G.OFFLINE_H * 3600;
G.catchUp = function (sec) {
  sec = Math.min(sec, G.offlineCap());
  const R = G.S.rates, got = { sec };
  for (const id in G.CUR) {
    if (!G.S.unlocked[id] || !R[id]) continue;
    const n = R[id] * sec;
    G.S.w[id][G.CUR[id]] += n;
    got[id] = n;
  }
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
  // 동료 강화 노드를 동료마다 둘로 맞추며 뺀 축복·대폭발: 쓴 골드를 돌려준다
  // 캐릭터 시트(UNITS.md)로 바꾸며 뺀 동료별 강화 노드: 쓴 골드를 돌려준다 [기본 비용, 레벨당 배율, 남길 레벨]
  const GONE = { bless: [800, 1], m_area: [6000, 2.3], r_atk: [60, 1.585], r_range: [500, 2.3], songDur: [1500, 2.04], songPow: [4000, 2.04], c_heal: [400, 1.65], m_atk: [1500, 1.585],
    p_hp: [9000, 1.585], d_atk: [70000, 1.585], d_crit: [150000, 2.04], a_atk: [450000, 1.585], a_chain: [1e6, 3.6], ro_atk: [450000, 1.585], p_guard: [20000, 2.04, 1], ro_steal: [1e6, 2.3, 1] };
  // 벼락(클릭 공격)을 지휘로 바꾸며 뺀 동쪽 가지 (DESIGN.md 32): 쓴 골드를 돌려준다
  Object.assign(GONE, { smite1: [20, 1.45], smiteR: [400, 2], s_cd: [600, 2], s_chain: [3000, 1], s_shock: [12000, 1], s_focus: [12000, 1], s_exec: [60000, 1], s_crit: [40000, 1.9],
    s_storm: [3e5, 1], s_storm2: [1e6, 2], s_stun: [2500, 1], s_charge: [2500, 1], s_power2: [2e5, 1.8], s_over: [1.5e5, 1], s_mark: [1.5e6, 1], s_r2: [1.5e6, 2.2], s_storm3: [5e6, 1],
    s_lv1: [3000, 1.7], s_bounce: [20000, 4], s_static: [15000, 1], s_purge: [80000, 1], s_boss: [80000, 2], s_storm_r: [3e6, 2.5] });
  // 직업 기술·★짝을 용병 개인 스킬로 옮기며 뺀 북쪽 가지 (DESIGN.md 39): 쓴 골드를 돌려준다
  Object.assign(GONE, { archer: [40, 1], r_pierce: [160, 1], r_volley: [600, 1], r_poison: [1600, 1], r_snipe: [1600, 1], scout: [120, 1], bard: [150, 1], b_encore: [600, 1], b_rhap: [2250, 1], songWar: [6000, 1], songRegen: [6000, 1], cleric: [300, 1], c_mass: [1200, 1], heal: [4500, 1], c_revive: [12000, 1], c_sanct: [12000, 1], mage: [1200, 1], m_burn: [4800, 1], meteor: [18000, 1], m_storm: [48000, 1], m_quick: [48000, 1], paladin: [8000, 1], p_guard: [32000, 1], p_wall: [120000, 1], p_taunt: [320000, 1], p_counter: [320000, 1], dragoon: [60000, 1], d_dash: [240000, 1], d_leap: [900000, 1], d_exec: [2400000, 1], d_breath: [2400000, 1], archmage: [400000, 1], a_overload: [1600000, 1], a_storm: [6000000, 1], a_warp: [16000000, 1], a_stop: [16000000, 1], rogue: [400000, 1], ro_twin: [1600000, 1], ro_shadow: [6000000, 1], ro_mark: [16000000, 1], ro_steal: [16000000, 1], autocast: [200000, 1] });
  for (const [k, [b, g, keep = 0]] of Object.entries(GONE)) if (ft[k] > keep) { for (let i = keep; i < ft[k]; i++) G.S.w.fantasy.gold += b * Math.pow(g, i); if (keep) ft[k] = keep; else delete ft[k]; }
  // 짝이 바뀐 노드: 고른 것이 더는 그 짝이 아니면 고르기를 지운다
  // 용병 명단이 생기기 전 저장: 면허가 있는 직업마다 한 명씩 (G.Guild.migrate)
  G.Guild.migrate(G.S.w.fantasy);
  G.Trinket.migrate(G.S.w.fantasy);
  const idx = G.Tree.idx.fantasy;
  for (const k of Object.keys(ft)) if (k[0] === '@' && (!idx[ft[k]] || idx[ft[k]].pair !== k.slice(1))) delete ft[k];
  // 다른 세계를 정리하기 전 저장: 그 세계 상태와 세계 개방·시너지 노드를 지운다
  for (const id of Object.keys(G.S.w)) if (!G.MODS[id]) delete G.S.w[id];
  for (const id of Object.keys(G.S.unlocked)) if (!G.MODS[id]) delete G.S.unlocked[id];
  // 정수 · 인장 · 유물 · 별 · 넥서스를 정리하기 전 저장 (DESIGN.md 57): 남은 필드를 지운다
  for (const k of ['ess', 'runEss', 'totalEss', 'essBy', 'stars', 'starsEarned', 'signs', 'pulls', 'pity', 'relics', 'ntree', 'stree', 'prestiges']) delete G.S[k];
  for (const k of ['essf', 'ess2', 'g_floor', 'g_bossEss']) delete ft[k];
  for (const k of Object.keys(G.S.rates)) if (!G.CUR[k]) delete G.S.rates[k];
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
// 직업 면허를 새로 따면 선술집이 비어 있을 때 바로 후보를 들인다
G.on('tree', e => {
  if (e.id !== 'fantasy') return;
  const f = G.S.w.fantasy;
  if (!G.Guild.tavern(f).offers.length) G.Guild.refresh(f);
  if (G.RT.fantasy) G.Fantasy.syncAllies(f);
});
