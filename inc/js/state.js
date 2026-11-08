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
  if (!(G.RT && G.RT.fantasy && G.RT.fantasy.turn)) G.S.runTime += dt; /* 전투 중에는 라운드 시계: G.Turn이 차례마다 올린다 (SRD 1라운드 = G.Res_ROUND) */
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
  // 옛 방치형 저장의 남은 칸 (스킬트리 · 파티 버프 · 단장 기술 · 강화 · 라이벌 · 다른 세계)은 지운다
  const f0 = G.S.w.fantasy; for (const k of ['tree', 'buffs', 'cds', 'rivals', 'heroGear', 'autoForge', 'fameTree', 'ing', 'qlog', 'skMig']) delete f0[k];
  G.Guild.migrate(f0);
  G.Trinket.migrate(f0);
  for (const id of Object.keys(G.S.w)) if (!G.MODS[id]) delete G.S.w[id];
  for (const id of Object.keys(G.S.unlocked)) if (!G.MODS[id]) delete G.S.unlocked[id];
  for (const k of ['ess', 'runEss', 'totalEss', 'essBy', 'stars', 'starsEarned', 'signs', 'pulls', 'pity', 'relics', 'ntree', 'stree', 'prestiges']) delete G.S[k];
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
  try { return G.deserialize(raw); } catch (e) {
    // 못 읽은 저장은 새 게임의 자동 저장에 덮이지 않게 따로 남긴다 (G.SAVE_KEY + '_broken')
    console.error('저장을 불러오지 못했다. 원본은 ' + G.SAVE_KEY + '_broken에 남긴다', e);
    try { localStorage.setItem(G.SAVE_KEY + '_broken', raw); } catch (e2) { /* 저장소 없음 */ }
    G.loadError = e;
    return null;
  }
};
G.exportSave = () => btoa(unescape(encodeURIComponent(G.serialize())));
G.importSave = str => G.deserialize(decodeURIComponent(escape(atob(str.trim()))));
G.hardReset = function () {
  try { localStorage.removeItem(G.SAVE_KEY); } catch (e) { /* 저장소 없음 */ }
  G.newState();
};

