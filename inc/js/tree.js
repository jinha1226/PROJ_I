'use strict';
// 스킬트리 엔진
// 노드: { id, x, y, req:[부모 id], reqAll, t(타일), n, d, max, base, g, eff:{키: 레벨당 값}, root, costFn }
// 효과 읽기: mul(키) = Π(1 + v·lv) (노드 안에서는 더하고, 노드끼리는 곱한다),  add(키) = Σ v·lv,  has(키) = add > 0
// 트리 상태(레벨)는 세이브에 들어가는 평범한 객체 { 노드id: 레벨 }. 계산 캐시는 열거되지 않는 _c에 둔다.
// 짝 노드(pair: 그룹 이름): 같은 그룹은 둘 다 배울 수 있지만 효과는 고른 하나만. 고른 것은 st['@그룹']. 바꾸기는 공짜.
G.Tree = {
  defs: {},   // 트리 id → 노드 배열
  idx: {},    // 트리 id → { 노드 id → 노드 }
  wallet: {}, // 트리 id → { get(), spend(n), tile, name }
  opts: {},   // 트리 id → { bg(P, unit): 배경 SVG 문자열 }
  define(id, nodes, wallet, opts) {
    G.Tree.defs[id] = nodes;
    G.Tree.idx[id] = Object.fromEntries(nodes.map(n => [n.id, n]));
    if (wallet) G.Tree.wallet[id] = wallet;
    G.Tree.opts[id] = opts || {};
  },
  init(id) {
    const st = {};
    for (const n of G.Tree.defs[id]) if (n.root) st[n.id] = 1;
    return st;
  },
  lv: (st, nid) => st[nid] || 0,
  cache(st) {
    if (!st._c) Object.defineProperty(st, '_c', { value: {}, writable: true, enumerable: false });
    return st._c;
  },
  // 짝 노드 중 고르지 않은 쪽은 효과가 없다
  on: (st, n) => !!st[n.id] && (!n.pair || G.Tree.picked(st, n) === n.id),
  picked(st, n) {
    const p = st['@' + n.pair];
    if (p && st[p]) return p;
    return n.id;
  },
  pick(id, st, nid) {
    const n = G.Tree.idx[id][nid];
    if (!n || !n.pair || !st[nid]) return false;
    st['@' + n.pair] = nid;
    st._c = {};
    G.emit('tree', { id, nid, pick: true });
    return true;
  },
  mul(id, st, key) {
    const c = G.Tree.cache(st), ck = 'm' + key;
    if (c[ck] !== undefined) return c[ck];
    let v = 1;
    for (const n of G.Tree.defs[id]) if (n.eff && n.eff[key] && G.Tree.on(st, n)) v *= 1 + n.eff[key] * st[n.id];
    return (c[ck] = v);
  },
  add(id, st, key) {
    const c = G.Tree.cache(st), ck = 'a' + key;
    if (c[ck] !== undefined) return c[ck];
    let v = 0;
    for (const n of G.Tree.defs[id]) if (n.eff && n.eff[key] && G.Tree.on(st, n)) v += n.eff[key] * st[n.id];
    return (c[ck] = v);
  },
  has: (id, st, key) => G.Tree.add(id, st, key) > 0,

  cost(id, st, nid) {
    const n = G.Tree.idx[id][nid];
    if (n.costFn) return n.costFn();
    const cm = G.Tree.opts[id] && G.Tree.opts[id].costMul;
    return n.base * Math.pow(n.g || 1, G.Tree.lv(st, nid)) * (cm ? cm(st) : 1);
  },
  maxed: (id, st, nid) => G.Tree.lv(st, nid) >= (G.Tree.idx[id][nid].max || 1),
  // 살 수 있는 위치인가 (부모 조건)
  open(id, st, nid) {
    const n = G.Tree.idx[id][nid];
    if (n.root || !n.req || !n.req.length) return true;
    const ok = r => G.Tree.lv(st, r) > 0;
    return n.reqAll ? n.req.every(ok) : n.req.some(ok);
  },
  // 화면에 보이는가: 열려 있거나, 부모 중 하나가 열려 있으면 (한 칸 앞은 흐릿하게 보인다)
  visible(id, st, nid) {
    if (G.Tree.lv(st, nid) > 0 || G.Tree.open(id, st, nid)) return true;
    const n = G.Tree.idx[id][nid];
    return (n.req || []).some(r => G.Tree.open(id, st, r));
  },
  canBuy(id, st, nid) {
    if (!G.Tree.open(id, st, nid) || G.Tree.maxed(id, st, nid)) return false;
    const n = G.Tree.idx[id][nid];
    if (n.gate && !n.gate()) return false;
    return G.Tree.wallet[id].get() >= G.Tree.cost(id, st, nid);
  },
  buy(id, st, nid) {
    if (!G.Tree.canBuy(id, st, nid)) return false;
    G.Tree.wallet[id].spend(G.Tree.cost(id, st, nid));
    st[nid] = G.Tree.lv(st, nid) + 1;
    G.Tree.cache(st);
    st._c = {};
    const n = G.Tree.idx[id][nid];
    // 짝 노드는 새로 배운 쪽을 바로 쓴다
    if (n.pair) st['@' + n.pair] = nid;
    if (n.onBuy) n.onBuy();
    G.emit('tree', { id, nid });
    return true;
  },
  // 가장 싼 살 수 있는 노드 (자동 구매·봇용)
  cheapest(id, st, filter) {
    let best = null, bc = Infinity;
    for (const n of G.Tree.defs[id]) {
      if (filter && !filter(n)) continue;
      if (!G.Tree.open(id, st, n.id) || G.Tree.maxed(id, st, n.id) || (n.gate && !n.gate())) continue;
      const c = G.Tree.cost(id, st, n.id);
      if (c < bc) { bc = c; best = n; }
    }
    return best ? { node: best, cost: bc } : null;
  },
};
