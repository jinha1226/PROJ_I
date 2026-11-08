'use strict';
// 도감 (DESIGN.md 122): 죽이는 조건이 있는 몬스터는 처음엔 모른다. 조우 때 SRD 지식 판정 · 싸우며 관찰 · 처치로 알아내고,
// 알면 원정대 AI가 그 뒤로 알아서 대처한다. 용병단의 지식이라 시즌이 지나도 남는다.
G.Lore = (() => {
  // SRD 5.2.1 Study 행동의 Areas of Knowledge
  const KNOW = { aberration: 'arcana', construct: 'arcana', elemental: 'arcana', fey: 'arcana', monstrosity: 'arcana', giant: 'history', humanoid: 'history', beast: 'nature', dragon: 'nature', ooze: 'nature', plant: 'nature', celestial: 'religion', fiend: 'religion', undead: 'religion' };
  const DC = 15, DC_STEP = 2, DC_MIN = 5;
  const book = f => f.lore || (f.lore = {});
  const entry = (f, id) => book(f)[id] || (book(f)[id] = { known: false, dc: DC });
  const gated = o => !!o.stat && G.Foe.must(o.stat.id);
  const L = {
    all: false, // 시험용: 모두 안다
    skillOf: o => KNOW[o.ty] || 'arcana',
    knowsId: (f, id) => L.all || !G.Foe.must(id) || !!book(f)[id]?.known,
    knows: (f, o) => !gated(o) || L.knowsId(f, o.stat.id),
    learn(f, rt, o, how) {
      if (!gated(o)) return;
      const e = entry(f, o.stat.id); if (e.known) return;
      e.known = true; e.by = how;
      const n = o.base?.n || o.n, tip = G.Foe.notes(n).filter(q => q.c === 'must').map(q => q.s).join(' · ');
      if (rt) G.fx(rt, { k: 'text', x: o.x, y: o.y - 1.4, s: `도감 · ${n}`, col: '#ffd24a', t: 1.8, sz: 1, pop: true });
      G.log(`${f.floor}층 · ${n} · 도감 · ${tip}`, 'fantasy', 'good');
    },
    // 지식 판정
    study(f, rt, o) {
      const e = entry(f, o.stat.id), r = G.Mission.roll(f, rt, L.skillOf(o), 0, null, e.dc);
      if (!r) return;
      const name = G.Dnd.SKILL_N[L.skillOf(o)];
      G.fx(rt, { k: 'text', x: r.who.x, y: r.who.y - 1.2, s: `${name} ${r.nat}+${r.mod} ${r.ok ? '≥' : '<'} ${r.dc}`, col: r.ok ? '#9fe79f' : '#ff8a8a', t: 1.4, sz: 0.8 });
      if (r.ok) L.learn(f, rt, o, 'study');
    },
    meet(f, rt, list) {
      if (rt.studiedOn !== rt.map) { rt.studiedOn = rt.map; rt.studied = {}; } // 한 층에 몬스터 종류당 한 번. 그 사이 다시 굴리는 건 observe
      const seen = rt.studied;
      for (const o of list) { if (!gated(o) || L.knows(f, o) || seen[o.stat.id]) continue; seen[o.stat.id] = true; L.study(f, rt, o); }
    },
    // 다시 일어서는 걸 봤다: 알아채기 쉬워진다
    observe(f, rt, o) {
      if (!gated(o) || L.knows(f, o)) return;
      const e = entry(f, o.stat.id); e.dc = Math.max(DC_MIN, e.dc - DC_STEP);
      L.study(f, rt, o);
    },
    count: f => Object.values(book(f)).filter(e => e.known).length,
  };
  return L;
})();
