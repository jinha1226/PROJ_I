'use strict';
// 관계 (DESIGN.md 46): 같이 다닌 사람끼리 정이 든다. 누구와 누구를 함께 보내느냐가 결정이 된다.
// f.bonds = { 'uidA-uidB': 정 } — 같이 층을 내려갈 때마다 +1, 서로 연계기를 이으면 +1.
// 전우(정 FRIEND_N 이상): 둘 사이 연계기 쿨다운 ×0.6 · 피해 ×1.3, 이으면 머리 위에 하트.
// 앙숙: 같은 축 반대 성격(다혈질 — 겁쟁이 · 욕심쟁이 — 신중 · 싸움꾼 — 온순). 서로의 연계기를 잇지 않는다. 정이 2배 쌓이면 화해해 전우가 된다.
G.Bond = (() => {
  const U = G.U, D = G.D;
  const FRIEND_N = 12, MAKEUP_K = 2, FRIEND_CD = 0.6, FRIEND_DMG = 1.3;
  const key = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
  const B = {
    FRIEND_N,
    n: (f, a, b) => (f.bonds || {})[key(a, b)] || 0,
    // 같은 축 반대 성격인가 (성격은 평생 그대로라 이 짝은 늘 앙숙 후보)
    clash(m1, m2) {
      for (const p of m1.pers || []) for (const q of m2.pers || []) if (p !== q && D.PERSONA[p].ax === D.PERSONA[q].ax) return true;
      return false;
    },
    // 관계: 'friend' · 'foe' · null
    rel(f, m1, m2) {
      if (!m1 || !m2 || m1 === m2) return null;
      const n = B.n(f, m1.uid, m2.uid), c = B.clash(m1, m2);
      if (n >= FRIEND_N * (c ? MAKEUP_K : 1)) return 'friend';
      return c ? 'foe' : null;
    },
    // 정을 쌓는다: 문턱을 넘으면 알린다 (머리 위 하트)
    add(f, rt, m1, m2, d) {
      const k = key(m1.uid, m2.uid), was = B.rel(f, m1, m2);
      (f.bonds = f.bonds || {})[k] = (f.bonds[k] || 0) + d;
      if (was !== 'friend' && B.rel(f, m1, m2) === 'friend') {
        G.log(`${was === 'foe' ? '화해' : '전우'} · ${m1.name} · ${m2.name}`, 'fantasy', 'good');
        if (rt) for (const a of rt.allies) if (a.merc === m1 || a.merc === m2) G.Feat.banner(rt, a, '💞', was === 'foe' ? '화해' : '전우', 'bond');
      }
    },
    // 층을 내려갔다 (F.descend): 살아 있는 사람 짝마다 +1
    floor(f, rt) {
      const ms = rt.allies.filter(a => a.merc && !a.dead).map(a => a.merc);
      for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) B.add(f, rt, ms[i], ms[j], 1);
    },
    // 연계기 (G.Combo.on): 앙숙은 잇지 않는다 · 전우는 쿨다운이 짧고 세다
    canLink: (f, a, b) => !(a.merc && b.merc && B.rel(f, a.merc, b.merc) === 'foe'),
    linked(f, rt, a, b) {
      if (!a.merc || !b.merc) return 1;
      B.add(f, rt, a.merc, b.merc, 1);
      if (B.rel(f, a.merc, b.merc) !== 'friend') return 1;
      G.fx(rt, { k: 'emote', key: 'rl_heart', ent: b, x: b.x, y: b.y, t: 1.2 });
      return FRIEND_DMG;
    },
    cdK: (f, a, b) => a.merc && b.merc && B.rel(f, a.merc, b.merc) === 'friend' ? FRIEND_CD : 1,
    // 출발할 때 앙숙이 같이 있으면 서로에게 핏대 (한 번)
    depart(f, rt) {
      const as = rt.allies.filter(a => a.merc);
      for (let i = 0; i < as.length; i++) for (let j = i + 1; j < as.length; j++) if (B.rel(f, as[i].merc, as[j].merc) === 'foe') {
        for (const a of [as[i], as[j]]) G.fx(rt, { k: 'emote', key: 'ni_pe_hot', ent: a, x: a.x, y: a.y, t: 1.5 });
        return;
      }
    },
    // 이 편성의 관계 (마을 표시 · 자동 편성)
    pairs(f, ms) {
      const out = [];
      for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) { const r = B.rel(f, ms[i], ms[j]); if (r) out.push({ a: ms[i], b: ms[j], r }); }
      return out;
    },
    // 해고: 그 사람의 정을 지운다
    free(f, uid) { if (f.bonds) for (const k of Object.keys(f.bonds)) if (k.split('-').includes(String(uid))) delete f.bonds[k]; },
  };
  return B;
})();
