'use strict';
// 아군 생물 (SRD 5.2.1): 주문 · 마법 물건이 부르는 생물. 능력치표는 G.SRD_MON(몬스터 330종) 또는 주문 원문의 능력치표 (DESIGN.md 159).
// 원문: 「동료와 같은 편 · 시전자 바로 다음 차례 (선제권 공유) · 명령이 없으면 회피」 — 여기서는 시전자의 뜻대로 가장 가까운 적을 친다.
// 몸: { kind: 'sum', ally: true, stat, by(부른 몸), conc(집중이면 끊길 때 사라짐), until(사라지는 시각) }. rt.sums에 둔다 (rt.party · rt.mons와 따로)
G.Sum = (() => {
  const U = G.U, GR = G.Grid, F = () => G.Fantasy, DN = () => G.Dnd, FO = () => G.Foe;
  const ROUND = () => G.Res_ROUND;
  // 그림: 게임에 있는 몬스터면 그 그림, 아니면 종류로
  const TY_T = { beast: 'm_wolf', elemental: 'm_phantom', undead: 'm_skeleton', dragon: 'm_demon', construct: 'm_golem', celestial: 'm_phantom', fiend: 'm_demon', humanoid: 'm_bandit', monstrosity: 'm_warg', giant: 'm_ogre', fey: 'm_phantom', plant: 'm_ent', ooze: 'm_slime' };
  const ID_T = { 'earth-elemental': 'm_golem2', 'fire-elemental': 'm_spell', 'water-elemental': 'm_slime', 'air-elemental': 'm_phantom', 'brown-bear': 'm_bear', 'black-bear': 'm_bear', 'giant-rat': 'm_rat', rat: 'm_rat', 'giant-insect': 'm_spider', 'dire-wolf': 'm_warg', lion: 'm_warg', panther: 'm_warg', tiger: 'm_warg', mastiff: 'm_wolf', 'animated-object': 'm_golem', berserker: 'm_bandit', djinni: 'm_phantom', efreeti: 'm_demon', skeleton: 'm_skeleton', zombie: 'm_ghoul' };
  const tileOf = (id, ty) => { if (ID_T[id]) return ID_T[id]; for (const n in G.D.F.STAT) if (G.D.F.STAT[n][0] === id && G.D.F.mon[n]?.t) return G.D.F.mon[n].t; return TY_T[ty] || 'm_wolf'; };
  const KO = { berserker: '광전사', 'air-elemental': '공기 원소', 'earth-elemental': '땅 원소', 'fire-elemental': '불 원소', 'water-elemental': '물 원소', djinni: '진', efreeti: '이프리트', 'giant-constrictor-snake': '거대 왕뱀', griffon: '그리폰', lion: '사자', 'giant-goat': '거대 염소', elephant: '코끼리', nightmare: '나이트메어', mastiff: '마스티프', 'giant-owl': '거대 올빼미', raven: '까마귀', weasel: '족제비', 'giant-rat': '거대 쥐', badger: '오소리', boar: '멧돼지', panther: '표범', 'giant-badger': '거대 오소리', 'dire-wolf': '다이어 울프', 'giant-elk': '거대 엘크', rat: '쥐', owl: '올빼미', goat: '염소', 'giant-boar': '거대 멧돼지', 'brown-bear': '불곰', jackal: '자칼', ape: '유인원', baboon: '개코원숭이', 'axe-beak': '도끼부리', 'black-bear': '흑곰', 'giant-weasel': '거대 족제비', 'giant-hyena': '거대 하이에나', tiger: '호랑이', skeleton: '해골', zombie: '좀비' };
  const nameOf = id => { for (const n in G.D.F.STAT) if (G.D.F.STAT[n][0] === id) return n; return KO[id] || G.SRD_MON[id]?.n || id; };
  const alive = rt => (rt.sums || []).filter(s => s.hp > 0);
  // 주문의 능력치표 (원문): 「주문 레벨」 · 「시전자의 주문 공격 보정」을 넣어 만든다
  const SPELL_BLOCK = {
    // 거대 곤충 (4레벨 · 거미): AC 11 + 레벨 · 체력 30 + 10 × (레벨 − 4) · 독 찌르기 레벨/2회 (명중 = 주문 공격, 1d6 + 3 + 레벨 관통 + 1d4 독, 10피트)
    insect: (L, hit, dc) => ({ n: 'Giant Insect', id: 'giant-insect', ty: 'beast', size: 'large', ac: 11 + L, hp: 30 + 10 * (L - 4), mv: 8, speed: { walk: 40, climb: 40 }, dex: 1, abil: { str: 17, dex: 13, con: 15, int: 4, wis: 14, cha: 3 }, save: { str: 3, dex: 1, con: 2, int: -3, wis: 2, cha: -4 }, res: [], imm: [], vul: [], cimm: [], senses: { darkvision: 60 }, melee: Array(Math.max(1, Math.floor(L / 2))).fill({ name: 'Poison Jab', hit, n: 1, d: 6, b: 3 + L, t: 'piercing', ex: { n: 1, d: 4, t: 'poison' } }), far: null, farN: 1, alt: [], dc, acts: [], traits: [{ name: 'Spider Climb' }] }),
    // 용의 영혼 (5레벨): AC 14 + 레벨 · 체력 50 + 10 × (레벨 − 5) · 찢기 레벨/2회 (주문 공격, 1d6 + 4 + 레벨 관통, 10피트) + 숨결 (30피트 원뿔 · 주문 DC 민첩 · 2d6 · 절반)
    dragon: (L, hit, dc, t) => ({ n: 'Draconic Spirit', id: 'draconic-spirit', ty: 'dragon', size: 'large', ac: 14 + L, hp: 50 + 10 * (L - 5), mv: 12, speed: { walk: 30, fly: 60, swim: 30 }, dex: 2, abil: { str: 19, dex: 14, con: 17, int: 10, wis: 14, cha: 14 }, save: { str: 4, dex: 2, con: 3, int: 0, wis: 2, cha: 2 }, res: ['acid', 'cold', 'fire', 'lightning', 'poison'], imm: [], vul: [], cimm: ['charmed', 'frightened', 'poisoned'], senses: { blindsight: 30, darkvision: 60 }, melee: Array(Math.max(1, Math.floor(L / 2))).fill({ name: 'Rend', hit, n: 1, d: 6, b: 4 + L, t: 'piercing' }), far: null, farN: 1, alt: [], dc, breath: { dc, t }, acts: [], traits: [] }),
    // 움직이는 사물 (5레벨 · 중형 이하): AC 15 · 체력 10 · 내리치기 (주문 공격, 1d4 + 3 역장)
    object: (L, hit, dc) => ({ n: 'Animated Object', id: 'animated-object', ty: 'construct', size: 'medium', ac: 15, hp: 10, mv: 6, speed: { walk: 30 }, dex: 0, abil: { str: 16, dex: 10, con: 10, int: 3, wis: 3, cha: 1 }, save: { str: 3, dex: 0, con: 0, int: -4, wis: -4, cha: -5 }, res: [], imm: ['poison', 'psychic'], vul: [], cimm: ['charmed', 'exhaustion', 'frightened', 'paralyzed', 'poisoned'], senses: { blindsight: 30 }, melee: [{ name: 'Slam', hit, n: 1, d: 4, b: 3, t: 'force' }], far: null, farN: 1, alt: [], dc, acts: [], traits: [] }),
  };
  const S = {
    alive,
    // 부르기. block: 능력치표 · opt: { by, conc, rounds, n(이름), t(그림), near(나타날 자리) }
    spawn(f, rt, block, opt = {}) {
      const at = opt.near || opt.by, sp = G.Tactics.cellOf ? G.Tactics.cellOf(at) : [Math.round(at.x), Math.round(at.y)];
      const used = new Set(rt.party.concat(rt.mons, alive(rt)).map(e => Math.round(e.y) * rt.map.w + Math.round(e.x)));
      let xy = null; for (let r = 1; r <= 4 && !xy; r++) for (let dy = -r; dy <= r && !xy; dy++) for (let dx = -r; dx <= r && !xy; dx++) { const x = sp[0] + dx, y = sp[1] + dy; if (GR.pass(rt.map, x, y) && !used.has(y * rt.map.w + x) && F().sees(rt.map, at, { x, y })) xy = [x, y]; }
      if (!xy) return null;
      const e = { kind: 'sum', sum: true, ally: true, n: opt.n || nameOf(block.id), t: opt.t || tileOf(block.id, block.ty), ty: block.ty, stat: block, role: 'soldier', tr: [], x: xy[0], y: xy[1], s: block.size === 'large' ? 1.25 : block.size === 'huge' ? 1.5 : 1, hp: block.hp, max: block.hp, by: opt.by, conc: !!opt.conc, src: opt.src || '', until: G.S.runTime + ROUND() * (opt.rounds || 10), bar: true, aggro: true, spotted: true, dots: [], cond: {}, bf: {} };
      (rt.sums = rt.sums || []).push(e); F().refreshEnts(rt);
      if (opt.conc && opt.by?.concK) opt.by.concK.sums = (opt.by.concK.sums || []).concat([e]);
      // 선제권 공유: 부른 몸 바로 다음 차례 (SRD)
      const st = rt.turn; if (st) { const i = st.order.findIndex(q => q.e === opt.by); const base = i >= 0 ? st.order[i] : { nat: 10, init: 10 }; st.order.splice(i >= 0 ? i + 1 : st.order.length, 0, { e, nat: base.nat, init: base.init - 0.001 }); }
      G.fx(rt, { k: 'ring', x: e.x, y: e.y, r: 0.9, t: 0.6, col: '#9fe79f' }); G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.2, s: e.n, col: '#9fe79f', t: 1.1, sz: 0.85, pop: true });
      return e;
    },
    // 주문의 능력치표로 부르기
    spell(f, rt, c, kind, L, extra = {}) { const hit = DN().prof(c.merc.lv) + DN().mod(DN().ab(c.merc)[c.castAb || DN().cls(c.merc).dc]), dc = DN().dc(c); return SPELL_BLOCK[kind](L, hit, dc, extra.t); },
    block: id => G.SRD_MON[id] || null,
    // 사라진다
    remove(rt, e, why, dead) { if (dead && e.staffOf) { const f = G.S.w.fantasy; f.trinkets = f.trinkets.filter(q => q !== e.staffOf); G.log('비단뱀 지팡이가 부서졌다', 'fantasy'); } /* 비단뱀이 쓰러지면 지팡이가 부서진다 (SRD) */ e.hp = 0; rt.sums = (rt.sums || []).filter(q => q !== e); if (rt.turn) rt.turn.order = rt.turn.order.filter(q => q.e !== e); F().refreshEnts(rt); if (!G.quiet) G.fx(rt, { k: 'text', x: e.x, y: e.y - 1, s: why || '사라졌다', col: '#9aa0a8', t: 0.9, sz: 0.7 }); },
    // 집중이 끊기면 그 집중의 생물도 (SRD: 주문이 끝나면 사라진다)
    endConc(rt, c) { for (const e of alive(rt)) if (e.conc && e.by === c) S.remove(rt, e, '사라졌다'); },
    // 매 틱: 시간이 다 된 생물 · 전투 밖에서는 부른 사람을 따라 걷는다
    tick(f, rt, dt) {
      if (!rt.sums?.length) return;
      for (const e of alive(rt)) {
        if (G.S.runTime > e.until || (e.by && e.by.dead && !e.by.dying && e.conc)) { S.remove(rt, e); continue; }
        if (!rt.turn && e.by && !e.by.dead) { const d = Math.hypot(e.x - e.by.x, e.y - e.by.y); if (d > 2) GR.moveTo(rt.map, e, e.by.x, e.by.y, 3.5, dt, 1.5); }
      }
    },
    // 층이 바뀌면 (부른 생물은 같은 층에 남는다 — 따라오지 않는다)
    floor(rt) { rt.sums = []; },
    // 표적: 가장 가까운 보이는 적
    target(rt, e) { const l = rt.mons.filter(o => o.hp > 0 && o.aggro && !o.flee); if (!l.length) return null; const v = l.filter(o => F().sees(rt.map, e, o)); return (v.length ? v : l).reduce((a, b) => (Math.hypot(b.x - e.x, b.y - e.y) < Math.hypot(a.x - e.x, a.y - e.y) ? b : a)); },
    // 그 생물의 공격 (연속 공격 그대로). one: 기회 공격 하나
    attack(f, rt, e, tg, one) {
      const list = one ? [FO().attacks(e, tg)[0]] : FO().attacks(e, tg);
      for (const a of list) {
        if (!a || tg.hp <= 0) break;
        e.useAtk = a; const r = DN().attack(e, tg); e.useAtk = null;
        if (!r.hit) { DN().miss(rt, tg); continue; }
        const k = r.crit ? 2 : 1; // 치명타는 주사위만 두 배 (SRD)
        FO().dtype = a.t; F().hurt(f, rt, tg, Math.max(1, DN().dice(a.n * k, a.d) + a.b), r.crit ? 'crit' : 'hit', e);
        if (a.ex && tg.hp > 0) { FO().dtype = a.ex.t; F().hurt(f, rt, tg, DN().dice(a.ex.n * k, a.ex.d), 'extra', e); } // 둘째 피해는 그 종류대로 (저항 · 면역)
        FO().dtype = null;
      }
      // 용의 영혼: 연속 공격과 함께 숨결 (30피트 원뿔 · 주문 DC 민첩 · 2d6 · 절반)
      if (!one && e.stat.breath && tg.hp > 0) { const H = G.Skill.H, A = { shape: 'cone', ft: 30, self: true }, x = { f, rt, c: e, seen: rt.mons.filter(o => o.hp > 0), reach: 6 }, aim = H.AREA.aim(x, e, A); if (aim) { const list2 = H.AREA.hits(x, e, A, aim); FO().dtype = e.stat.breath.t || 'fire'; for (const o of list2) { if (o.kind !== 'mon') continue; const v = DN().dice(2, 6) * (DN().save(o, 'dex', e.stat.breath.dc) ? 0.5 : 1); F().hurt(f, rt, o, v, 'smite', e); } FO().dtype = null; } }
    },
    // 맞는다 (몬스터의 공격 · 범위). mo가 있으면 명중 굴림부터
    hurt(f, rt, p, dmg, mo) {
      if (p.hp <= 0) return;
      if (mo) { const r = DN().attack(mo, p); if (!r.hit) { DN().miss(rt, p); return; } if (r.crit) dmg *= mo._critK || 2; }
      const t = mo?.useAtk?.t || FO().dtype, k = FO().typeK(p, t, mo);
      dmg = Math.max(0, Math.floor(dmg * k)); if (!dmg) return;
      p.hp -= dmg;
      if (!G.quiet) G.fx(rt, { k: 'text', x: p.x, y: p.y - 0.6, s: U.fmt(dmg), col: '#ffb0b0', t: 0.8, sz: 0.8 });
      if (p.hp <= 0) S.remove(rt, p, '쓰러졌다', true);
    },
    // 그 생물의 차례 (G.Turn이 부른다). true면 걷기 · 치기를 G.Turn에 맡긴다 (st.tg · st.path)
    turn(f, rt, st, e, plan) {
      const tg = S.target(rt, e);
      if (!tg) { DN().buff(e, 'dodge', ROUND(), { hitDis: 1 }); return false; } // 명령이 없으면 회피 (SRD)
      st.tg = tg; st.path = plan(tg); return true;
    },
  };
  // 사자 되살리기 (SRD 3레벨, 시전 1분): 싸운 뒤 이번 싸움에서 쓰러진 중형 · 소형 인간형 하나를 해골(뼈) 또는 좀비(시체)로. 24시간 따른다
  S.corpse = (rt, m) => { if (m.ty === 'humanoid' && !m.summon && (m.stat?.size === 'medium' || m.stat?.size === 'small' || !m.stat?.size)) (rt.corpses = rt.corpses || []).push({ x: m.x, y: m.y }); };
  S.afterFight = rt => {
    const f = G.S.w.fantasy, L = rt.corpses || []; rt.corpses = [];
    for (const p of rt.party) { const m = p.merc; if (!m || p.dead || !L.length || !G.Guild.active(m).includes('sp_animate_dead') || !G.Res.can(m, 'sp_animate_dead', { slot: 3 })) continue;
      if (alive(rt).filter(s => s.by === p && s.src === 'Animate Dead').length >= 4) continue; // 다시 걸면 넷까지 붙잡아 둔다 — 그 이상은 슬롯을 아낀다
      const c = L.shift(), id = U.chance(0.5) ? 'zombie' : 'skeleton', B = G.SRD_MON[id]; if (!B) continue; const sl = G.Res.pay(m, 'sp_animate_dead', { slot: 3 }), n = 1 + 2 * Math.max(0, (sl || 3) - 3); // 높은 슬롯: 슬롯 하나 위마다 둘 더
      for (let i = 0; i < n; i++) S.spawn(f, rt, B, { by: p, rounds: 14400, src: 'Animate Dead', near: c, n: id === 'zombie' ? '좀비' : '해골' });
      G.log(`${m.name} · 사자 되살리기`, 'fantasy'); }
  };
  { const k0 = F().kill; F().kill = function (f, rt, m) { if (m && m.kind === 'mon') S.corpse(rt, m); return k0.apply(this, arguments); }; }
  return S;
})();
