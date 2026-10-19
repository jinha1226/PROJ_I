'use strict';
// 게임 상태 생성과 저장/불러오기
G.SAVE_KEY = 'dungeon_pioneers_save_v1';

G.newState = function () {
  G.S = {
    uid: 0, mode: 'title', colonists: [], store: {}, armory: [], bills: {},
    research: { done: {}, cur: null, prog: {}, paid: {}, bank: 0 },
    settle: null, dun: null, log: [], maxDepth: 0, pendingRecruits: [], won: false, over: false,
  };
  return G.S;
};

G.startGame = function (colonists) {
  G.Settle.setupNew(colonists);
  G.S.mode = 'settle';
  G.msg('길드의 원정대가 던전 입구 앞 황무지에 도착했다. 정착지를 세우고, 던전의 심장(지하 10층)을 파괴하라.', 'good');
};

G.serialize = function () {
  return JSON.stringify(G.S, (k, v) => (k === 'vis' || k === 'light' ? undefined : v));
};

G.save = function () {
  try { localStorage.setItem(G.SAVE_KEY, G.serialize()); return true; } catch (e) { return false; }
};

G.hasSave = function () {
  try { return !!localStorage.getItem(G.SAVE_KEY); } catch (e) { return false; }
};

G.load = function () {
  let raw = null;
  try { raw = localStorage.getItem(G.SAVE_KEY); } catch (e) { return false; }
  if (!raw) return false;
  try {
    G.S = JSON.parse(raw);
    G.Settle.onLoad();
    if (G.S.dun) G.Dun.onLoad();
    return true;
  } catch (e) { return false; }
};

G.deleteSave = function () { try { localStorage.removeItem(G.SAVE_KEY); } catch (e) { /* 무시 */ } };
