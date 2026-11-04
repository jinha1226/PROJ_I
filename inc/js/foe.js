'use strict';
// 몬스터 역할 · 특성 (DESIGN.md 78). 누구를 노리고, 어디에 서고, 차례에 무엇을 하는지는 여기서만 정한다.
// 역할은 D&D 4판의 몬스터 역할에서 가져왔고, 특성은 SRD 몬스터 능력을 따른다. 숫자는 나중에 한 번에 맞춘다.
G.Foe = (() => {
  const U = G.U, F = () => G.Fantasy, DN = () => G.Dnd;
  const ROLES = {
    soldier: { hp: 1, atk: 1, mv: 6 },
    brute: { hp: 1.5, atk: 1.2, mv: 5 },
    skirmisher: { hp: 0.7, atk: 0.9, mv: 8 },
    artillery: { hp: 0.6, atk: 0.8, mv: 6, range: 6, bolt: '#d8c79a', hand: 'p_hand1_bow' },
    controller: { hp: 0.6, atk: 0.7, mv: 6, range: 6, bolt: '#c08cff' },
    support: { hp: 0.7, atk: 0.5, mv: 6, range: 5, bolt: '#9fe79f' },
  };
  const ROLE_N = { soldier: '병사', brute: '우람', skirmisher: '돌격', artillery: '궁수', controller: '제어', support: '치유' }, MAIN = 0.7, TROOP_MIN = 4, TROOP_VAR = 3;
  // SRD 5.2.1 공격의 추가 효과 (원문 그대로, 확률 굴림 없음. 크기 조건은 파티가 모두 중형 이하라 늘 적용)
  const RIDER = {
    wolf: { Bite: { prone: 1 } }, 'dire-wolf': { Bite: { prone: 1 } }, 'brown-bear': { Claw: { prone: 1 } }, worg: { Bite: { mark: 1 } },
    'tough-boss': { Warhammer: { push: 2 } }, 'shambling-mound': { 'Charged Tendril': { pull: 1 } }, 'bone-devil': { 'Infernal Sting': { sting: 1 } },
    balor: { 'Flame Whip': { pull: 5, prone: 1 }, 'Lightning Blade': { noReact: 1 } }, 'gray-ooze': { Pseudopod: { corrode: 1 } }, 'black-pudding': { 'Dissolving Pseudopod': { corrode: 1 } },
    mimic: { Pseudopod: { grab: 13 } }, 'giant-frog': { Bite: { grab: 11 } }, crocodile: { Bite: { grab: 12 } }, 'giant-crocodile': { Bite: { grab: 15 }, Tail: { prone: 1 } }, 'giant-constrictor-snake': { Bite: { constrict: 14 } }, 'minotaur-skeleton': { Gore: { charge: 1 } },
  };
  const SPLITS = { 'black-pudding': 1, 'ochre-jelly': 1 };
  const NOTE = { 'ochre-jelly': [{ s: '베기 · 번개에 분열', c: 'must' }], troll: [{ s: '화염 · 산성으로 마무리', c: 'must' }], hydra: [{ s: '베기에 머리 증식 · 화염이면 막힘', c: 'must' }], 'black-pudding': [{ s: '베기 · 번개에 분열', c: 'must' }], zombie: [{ s: '광휘 · 치명타로 마무리', c: 'must' }], 'ogre-zombie': [{ s: '광휘 · 치명타로 마무리', c: 'must' }] };
  const DOWN_HP = 0.001, COND_T = 10, CHARGE_CELLS = 4, FIREBALL = [9, 6], FIREBALL_R = 4, FIREBALL_USES = 2, CONE = [8, 8], CONE_R = 6, MAGE_DC = 14, ENGULF_DC = 15, ENGULF_ESC = 14, ENGULF_DOT = [3, 6], AURA = [3, 8], THROES = [18, 6], THROES_R = 6, THROES_DC = 20, THORN = [1, 8], HEAL_DICE = [2, 4], HEAL_MOD = 2;
  const FIST = { hit: 3, n: 1, d: 4, b: 1, t: 'bludgeoning' }, COVER = 2, MELEE_R = 1.5, PAL_R = 6, HEAL_AT = 0.6, HEALS = 1, NIMBLE = 3, AWAY_R = 3, AGGR = 2, REGEN = 15, SPLIT_GEN = 2, HEADS = 5, HEAD_MAX = 9, MISTY_USES = 3, MISTY_CELLS = 6, INVIS_USES = 2, PROTECT_USES = 3, ASSESS_ROUND = 3, STALE_ROUND = 8, ASSESS_K = 1.5, FORT_DC = 12;
  // SRD 종류별 면역: 우리가 거는 지속 피해 · 상태
  const IMMUNE = { undead: ['poison', 'bleed'], construct: ['poison', 'bleed', 'stun', 'stop'], ooze: ['bleed', 'stop'] };
  const def = e => ROLES[e.role] || ROLES.soldier;
  const has = (e, k) => !!(e.tr && e.tr.includes(k));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const near = (e, list) => list.reduce((a, b) => (dist(e, b) < dist(e, a) ? b : a));
  const line = (rt, e, s, col) => G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s, col, t: 0.9, sz: 0.75 });
  const band = fl => G.D.F.bands[F().band(fl)];
  const byName = (b, n) => b.mons.find(m => m.n === n);

  const Foe = {
    ROLES, has, smart: true, retreatOn: true,
    // 만들 때의 숫자: 역할이 평균 체력 · 공격을 나눠 갖는다
    stat: d => { const r = ROLES[d.r] || ROLES.soldier, t = G.D.F.STAT[d.n] || ['tough'], base = G.SRD_MON[t[0]], x = t[1] || {}; return { role: d.r || 'soldier', tr: d.tr, hand: d.hand || r.hand, block: { ...base, spell: x.spell ? { hit: x.spell[0], n: x.spell[1], d: x.spell[2], b: x.spell[3], t: x.spell[4] } : null }, hpK: x.hpK || 1 }; },
    // 이번 공격 하나 (SRD): 원거리 역할은 원거리 공격 · 주문, 근접은 연속 공격의 첫째
    attackOf(e) { if (e.useAtk) return e.useAtk; const s = e.stat; return (Foe.ranged(e) && (s.spell || s.far)) || s.melee[0] || s.far || s.spell || FIST; },
    // 한 차례의 공격 목록 (SRD Multiattack)
    attacks(e, tg) {
      const s = e.stat;
      if (s.id === 'hydra') return Array(e.heads ?? HEADS).fill(s.melee[0]); // 머리 수만큼 문다
      if (s.id === 'mimic' && s.alt.length) return [tg && tg.grabBy === e ? s.melee[0] : s.alt[0]]; // 위족으로 붙잡고, 붙잡은 상대를 문다
      if (Foe.ranged(e)) return s.spell ? [s.spell] : s.far ? Array(s.farN || 1).fill(s.far) : s.melee.length ? s.melee : [Foe.attackOf(e)];
      return s.melee.length ? s.melee : [Foe.attackOf(e)];
    },
    // 조건이 붙는 추가 피해 (평균이 아니라 이번 굴림): 이점 · 붙잡힌 상대 · 돌진
    extra(rt, e, tg, a) {
      let x = 0, D = DN();
      if (a.advEx && D.adv(e, tg) > 0) x += D.dice(a.advEx.n, a.advEx.d);
      if (e.stat.id === 'mimic' && a.name === 'Bite' && tg.grabBy === e) x += D.dice(1, 8);
      if (a.condEx && (e.walked || 0) >= CHARGE_CELLS) x += D.dice(a.condEx.n, a.condEx.d);
      return x;
    },
    // 맞혔을 때의 효과 (G.Dnd.onHit)
    onHit(rt, mo, p) {
      const a = mo.useAtk, r = a && mo.stat && RIDER[mo.stat.id]?.[a.name], D = DN();
      if (!r || p.dead) return;
      const may = k => { if (k === 'poisoned' && (F().sk(p, 'sr_selfrest') || F().sk(p, 'sr_ward'))) { D.flip(p, '중독 무효', '#9fe79f'); return false; } if (p.merc && G.Trinket.imm(p.merc, k)) { D.flip(p, `${D.COND[k].n} 면역`, '#9fe79f'); return false; } return true; };
      if ((r.prone || (r.charge && (mo.walked || 0) >= CHARGE_CELLS)) && may('prone')) { D.give(rt, p, 'prone', COND_T); if (p.kind === 'ally') G.Combo.on(G.S.w.fantasy, rt, 'ally_down', p, p); }
      if (r.mark) D.give(rt, p, 'outlined', COND_T);
      if (r.push) Foe.shove(rt, p, mo, r.push);
      if (r.pull) Foe.shove(rt, p, mo, -r.pull);
      if (r.noReact) { p.noReact = true; p.effBy = mo; }
      if (r.sting && may('poisoned')) { D.give(rt, p, 'poisoned', COND_T); p.noHeal = true; p.effBy = mo; }
      if (r.corrode && D.ac(p) > 10) { p.acMinus = (p.acMinus || 0) + 1; D.flip(p, '갑옷 부식', '#b8d67a'); }
      if (r.constrict && !p.grabBy && !D.save(p, 'str', r.constrict)) { Foe.blast(G.S.w.fantasy, rt, mo, p, D.dice(2, 8) + 4, null, 0, 'bludgeoning'); if (may('grappled')) { D.give(rt, p, 'grappled', 99); p.grabBy = mo; p.grabDC = 14; } } // 왕뱀: 조이기
      if (r.grab && !p.grabBy && may('grappled')) { D.give(rt, p, 'grappled', 99); p.grabBy = mo; p.grabDC = r.grab; }
    },
    // 밀치기 (n > 0) · 끌어오기 (n < 0): 벽이나 다른 인물 앞에서 멈춘다
    shove(rt, p, from, n) {
      const dx = Math.sign(Math.round(p.x - from.x)), dy = Math.sign(Math.round(p.y - from.y)), sx = n > 0 ? dx : -dx, sy = n > 0 ? dy : -dy, all = rt.party.concat(rt.mons).filter(o => o !== p && (o.kind === 'mon' ? o.hp > 0 : !o.dead));
      if (p.merc && G.Trinket.has(p.merc, 'stand')) n = n > 0 ? Math.max(0, n - 2) : Math.min(0, n + 2); // 드워프 판금: 끌려가는 거리 −10피트
      for (let i = 0; i < Math.abs(n); i++) {
        const x = Math.round(p.x) + sx, y = Math.round(p.y) + sy;
        if (!G.Grid.pass(rt.map, x, y) || all.some(o => Math.round(o.x) === x && Math.round(o.y) === y)) return;
        p.x = x; p.y = y;
      }
    },
    // 굴림 없는 피해 (범위 · 지속): 내성에 성공하면 절반
    blast(f, rt, e, p, roll, ab, dc, t) {
      let d = roll * e.atk * G.Turn.pace * G.Res.takenK(p, t);
      const ev = ab === 'dex' && p.merc && (F().sk(p, 'ft_evasion') || F().sk(p, 'ft_evasion_r')); // 회피 (SRD): 성공 0 · 실패 절반
      if (ab && DN().save(p, ab, dc)) d *= ev ? 0 : 0.5; else if (ev) d *= 0.5;
      if (d <= 0) return;
      F().hurtMember(f, rt, p, d, null);
    },
    // 파티 쪽 차례의 시작 (G.Turn): 일어서기 · 붙잡힘 · 삼켜짐
    startTurn(f, rt, e) {
      const D = DN(), c = e.cond;
      e.stood = false; e.dispOff = false;
      if (c && D.has(e, 'prone')) { delete c.prone; e.stood = true; } // 넘어진 사람은 이동력 절반을 써서 일어선다
      const by = e.grabBy;
      if (!by) return;
      if (by.hp > 0 && !D.save(e, 'str', e.grabDC)) { if (e.engulfed) Foe.blast(f, rt, by, e, D.dice(...ENGULF_DOT), null, 0, 'lightning'); return; }
      if (c) { delete c.grappled; if (e.engulfed) { delete c.restrained; delete c.blinded; } }
      e.grabBy = null; e.engulfed = false;
    },
    // 삼키기 (슈블링 마운드): 연속 공격 하나를 대신한다
    engulf(rt, e, tg) {
      if (e.stat.id !== 'shambling-mound' || tg.grabBy || DN().save(tg, 'str', ENGULF_DC)) return e.stat.id === 'shambling-mound' && !tg.grabBy;
      const D = DN(); D.give(rt, tg, 'grappled', 99); D.give(rt, tg, 'restrained', 99); D.give(rt, tg, 'blinded', 99);
      tg.grabBy = e; tg.grabDC = ENGULF_ESC; tg.engulfed = true;
      return true;
    },
    // 공격하는 쪽이 받는 부식 (검은 푸딩)
    thorn(f, rt, m, from) {
      if (m.stat?.id === 'black-pudding' && from?.merc && !G.Foe.dtype && !((from.def.range || 0) >= 2)) Foe.blast(f, rt, m, from, DN().dice(...THORN), null, 0, 'acid');
    },
    // 죽을 때 폭발 (발로르)
    onDeath(f, rt, m) {
      if (m.stat?.id !== 'balor') return;
      line(rt, m, '죽음의 폭발', '#ff9a5a');
      for (const p of rt.party.filter(q => !q.dead && dist(q, m) <= THROES_R)) Foe.blast(f, rt, m, p, DN().dice(...THROES), 'dex', THROES_DC, 'fire');
    },
    // 전투가 끝나면 고친다
    endFight(rt) { for (const p of rt.party) { p.acMinus = 0; p.noReact = false; p.noHeal = false; p.effBy = null; p.grabBy = null; p.engulfed = false; p.stood = false; if (p.cond) { delete p.cond.grappled; } } },
    avgOf: a => a.n * (a.d + 1) / 2 + a.b + (a.ex ? a.ex.n * (a.ex.d + 1) / 2 : 0),
    // 저항 ×½ · 약점 ×2 · 면역 ×0 (SRD). 마법 무기가 아니면 물리 저항도 받는다
    typeK(m, t, from) {
      const s = m.stat; if (!s || !t) return 1;
      if (s.imm.includes(t)) return 0;
      const phys = t === 'slashing' || t === 'piercing' || t === 'bludgeoning', magic = from?.merc && G.Guild.magic(G.Guild.gear(from.merc).w) > 0;
      if (s.vul.includes(t)) return 2;
      if (phys && from?.merc && (DN().boon(from.merc, 'irresistible') || (t === 'slashing' && G.Trinket.has(from.merc, 'vorpal')))) return 1; // 저항 무시
      return s.res.includes(t) || (phys && s.nonmag && !magic) ? 0.5 : 1;
    },
    reach: e => def(e).range || MELEE_R,
    ranged: e => !!def(e).range,
    move: e => { const v = (e.stat ? e.stat.mv : e.mv || def(e).mv) + (has(e, 'aggr') ? AGGR : 0); return e.stat?.id === 'troll' ? Math.floor(v * 1.5) : v; }, // 돌진 (추가 행동): 이동력 절반 더
    back: o => !!def(o).range, // 전술 「후열」이 노리는 적
    // 원정 세력: 주 세력이 MAIN 비율, 나머지는 다른 세력 (준비가 빗나가는 순간)
    offer(n) { return U.shuffle(Object.keys(G.D.F.factions)).slice(0, n); },
    // 세력의 구성: 지금 층에서 무엇이 얼마나 나오나 (원정 선택 화면)
    brief(key, fl) {
      const fc = G.D.F.factions[key], reg = G.Region.REGIONS[key], names = (reg && G.Region.preview(G.S.w.fantasy, key)) || fc.by[F().band(fl)], roles = [...new Set(names.map(x => G.D.F.mon[x].r))];
      return { key, n: fc.n, names, roles: roles.map(r => ROLE_N[r]), mons: names.map(n => ({ n, notes: Foe.notes(n) })), terrain: reg?.note || null };
    },
    // 무리: 앞줄 + 뒷줄. 치유사는 한 무리에 하나
    troop(fl, n, only) { // only: 그 세력만 (실험 · 장면용)
      const reg0 = !only && G.Region.of(G.S.w.fantasy); if (reg0) return G.Region.defs(G.Region.pick(reg0, G.Region.budget(G.S.w.fantasy, 0), n)); // 지역: 쉬움 예산의 무리
      const b = band(fl), front0 = G.S.w.fantasy.front, key = only || (front0 && U.chance(MAIN) ? front0 : U.pick(Object.keys(G.D.F.factions))), t = G.D.F.factions[key].by[F().band(fl)].map(x => byName(b, x)), front = t.filter(m => !ROLES[m.r]?.range), rear = t.filter(m => ROLES[m.r]?.range), out = [];
      const nBack = rear.length ? (front.length ? (n >= 3 ? Math.max(1, Math.floor(n / 3)) : 0) : n) : 0;
      let heal = false;
      for (let i = 0; i < nBack; i++) { const pool = rear.filter(m => m.r !== 'support' || !heal), m = U.pick(pool.length ? pool : rear); heal = heal || m.r === 'support'; out.push(m); }
      while (out.length < n) out.push(U.pick(front.length ? front : rear));
      return out;
    },
    // 층에 흩어 둔다: 방마다 한 무리
    populate(rt, fl, m, n) {
      for (let left = n, guard = 0; left > 0 && guard < 60; guard++) {
        const room = m.rooms[1 + U.rand(m.rooms.length - 1)], k = Math.min(left, TROOP_MIN + U.rand(TROOP_VAR));
        for (const d of Foe.troop(fl, k)) {
          const x = room.x + U.rand(room.w), y = room.y + U.rand(room.h);
          if (m.c[y * m.w + x] === '.') { F().spawnMon(rt, fl, d, x, y, false); left--; }
        }
      }
    },
    // 표적
    target(rt, e) {
      const list = rt.party.concat(G.Mission.targets(rt)).filter(p => !p.dead);
      if (!list.length) return null;
      if (e.role === 'skirmisher') { // 전열을 돌아 후열로
        const soft = list.filter(p => p.def && (p.def.range >= 2 || p.def.heal) && dist(e, p) <= Foe.move(e) + MELEE_R);
        return near(e, soft.length ? soft : list);
      }
      if (Foe.ranged(e)) { // 보이는 사람 중 가장 약한 쪽
        const vis = list.filter(p => F().sees(rt.map, e, p) && dist(e, p) <= Foe.reach(e) + Foe.move(e));
        return vis.length ? vis.reduce((a, b) => (b.hp / (b.max || 1) < a.hp / (a.max || 1) ? b : a)) : near(e, list);
      }
      const pal = rt.allies.find(q => !q.dead && q.id === 'paladin');
      if (pal && dist(e, pal) < PAL_R) return pal;
      return near(e, list);
    },
    // 차례 시작. true면 그 차례의 행동을 썼다
    turn(f, rt, st, e) {
      if (Foe.regen(f, rt, e)) return true;
      // 그 몬스터가 건 효과는 그 몬스터의 다음 차례 시작에 끝난다
      for (const p of rt.party) if (p.effBy === e) { p.noReact = false; p.noHeal = false; p.effBy = null; }
      if (e.stat?.id === 'balor') for (const p of rt.party.filter(q => !q.dead && dist(q, e) <= MELEE_R)) Foe.blast(f, rt, e, p, DN().dice(...AURA), null, 0, 'fire'); // 화염 오라
      if (Foe.spell(f, rt, e)) return true;
      if (e.role === 'support' && (e.heals || 0) < HEALS) {
        const hurt = rt.mons.filter(o => o.hp > 0 && o.aggro && o.hp < o.max * HEAL_AT && dist(e, o) <= Foe.reach(e) && F().sees(rt.map, e, o));
        if (hurt.length) { // 치유의 말 (SRD Divine Aid 1/Day): 추가 행동이라 공격도 한다
          const o = hurt.reduce((a, b) => (b.hp / b.max < a.hp / a.max ? b : a)), h = Math.min(o.max - o.hp, (DN().dice(...HEAL_DICE) + HEAL_MOD) * (e.scale || 1));
          o.hp += h; e.heals = (e.heals || 0) + 1;
          if (o !== e) G.fx(rt, { k: 'beam', x: e.x, y: e.y, x2: o.x, y2: o.y, col: def(e).bolt, w: 2, t: 0.3 });
          line(rt, o, `치유 +${U.fmt(h)}`, '#9fe79f');
        }
      }
      return false;
    },
    // 메이지 주문 (SRD 5.2.1): 안개 걸음 3/일 (추가 행동) · 투명 2/일 · 화염구 2/일(4레벨 9d6) · 냉기 원뿔 1/일(8d8). 방어막 · 반격 주문은 합쳐 3/일 (반응)
    spell(f, rt, e) {
      if (e.stat?.id !== 'mage') return false;
      if (e.bf?.invis) delete e.bf.invis; // 투명은 다시 행동하면 풀린다
      const adj = rt.party.filter(p => !p.dead && !p.dying && dist(e, p) <= MELEE_R);
      if (adj.length && (e.misty || 0) < MISTY_USES && !DN().held(e)) { e.misty = (e.misty || 0) + 1; line(rt, e, '안개 걸음', '#c9a6ff'); Foe.shove(rt, e, near(e, adj), MISTY_CELLS); G.Tactics.snap(rt); }
      if ((e.invisN || 0) < INVIS_USES && e.hp < e.max * 0.5) { e.invisN = (e.invisN || 0) + 1; DN().buff(e, 'invis', G.Res_ROUND, { hitDis: 1 }); line(rt, e, '투명', '#c9a6ff'); return true; }
      const ps = rt.party.filter(p => !p.dead && F().sees(rt.map, e, p) && dist(e, p) <= Foe.reach(e));
      const cs = rt.party.find(p => !p.dead && !p.noReact && p.merc && F().sk(p, 'sp_counterspell') && G.Res.can(p.merc, 'sp_counterspell', { slot: 3 }) && dist(p, e) <= 6 && F().sees(rt.map, p, e));
      const inBall = c => ps.filter(p => dist(c, p) <= FIREBALL_R);
      const c = ps.length ? ps.reduce((a, b) => (inBall(b).length > inBall(a).length ? b : a)) : null;
      const cone0 = ps.filter(p => dist(e, p) <= CONE_R);
      if (c && (e.balls || 0) < FIREBALL_USES && inBall(c).length >= 2 && (e.cone || cone0.length < 2 || U.chance(0.5))) { // 둘 다 쓸 수 있으면 번갈아 나오게
        e.balls = (e.balls || 0) + 1; line(rt, e, '화염구', '#ff9a5a');
        if (cs) { G.Res.pay(cs.merc, 'sp_counterspell', { slot: 3 }); (cs.skLog = cs.skLog || []).push('sp_counterspell'); if (!DN().save(e, 'con', DN().dc(cs))) { line(rt, e, '주문이 끊겼다', '#9aa0a8'); return true; } }
        G.fx(rt, { k: 'ring', x: c.x, y: c.y, r: FIREBALL_R, t: 0.5, col: '#ff9a5a' });
        const roll = DN().dice(...FIREBALL); // 범위 주문은 한 번 굴려 모두에게
        for (const p of inBall(c)) Foe.blast(f, rt, e, p, roll, 'dex', MAGE_DC, 'fire');
        return true;
      }
      const cone = ps.filter(p => dist(e, p) <= CONE_R);
      if (!e.cone && cone.length >= 2) {
        e.cone = true; line(rt, e, '냉기 원뿔', '#9fd8ff');
        const roll = DN().dice(...CONE);
        for (const p of cone) Foe.blast(f, rt, e, p, roll, 'con', MAGE_DC, 'cold');
        return true;
      }
      return false;
    },
    // 재생 (SRD 트롤 · 트롤 팔다리): 차례 시작에 회복. 화염 · 산성을 받았으면 다음 차례엔 못 한다.
    // 체력 0으로 차례를 시작했는데 재생하지 못하면 그때 죽는다. 죽었으면 true
    regen(f, rt, e) {
      if (!has(e, 'regen')) return false;
      const stop = e.noRegen || e.dots.some(d => d.kind === 'burn'), amt = REGEN * (e.scale || 1);
      e.noRegen = false;
      if (e.down) {
        if (stop) { e.down = false; e.hp = 0; line(rt, e, '재생 실패', '#ff9a5a'); F().kill(f, rt, e, 'hit', null); return true; }
        e.down = false; e.hp = amt; line(rt, e, '다시 일어선다', '#ff9a5a');
        return false;
      }
      if (stop) { if (e.hp < e.max) line(rt, e, '재생 멈춤', '#ff9a5a'); return false; }
      if (e.hp < e.max) { const h = Math.min(e.max - e.hp, amt); e.hp += h; line(rt, e, `재생 +${U.fmt(h)}`, '#9fe79f'); }
      return false;
    },
    // 쓰러졌지만 아직 안 죽은 트롤: 횃불이라도 대야 한다
    burns: e => !!e.merc && (G.Dnd.weapon(e).t === 'fire' || G.Dnd.weapon(e).t === 'acid'),
    needsFire: o => !!o.down && !o.noRegen,
    // 횃불 (SRD 5.2.1): 근접 공격, 명중하면 화염 1. 불이 없는 사람의 마지막 수단
    torch(f, rt, e, tg) {
      const r = DN().attack(e, tg);
      line(rt, e, '횃불', '#ffb060');
      if (!r.hit) { DN().miss(rt, tg); return; }
      Foe.dtype = 'fire'; F().hurt(f, rt, tg, 1, 'hit', e); Foe.dtype = null;
      G.Story.note(rt, 'torch', e);
    },
    // 히드라 머리 (DCSS 방식으로 단순화): 베기에 맞으면 머리가 하나 는다. 화염을 맞으면 그 히드라의 다음 차례 끝까지 늘지 않는다
    heads(rt, m, dtype) {
      if (m.stat?.id !== 'hydra') return;
      if (m.heads == null) m.heads = HEADS;
      if (dtype === 'fire') { m.seared = true; return; }
      if (dtype !== 'slashing' || m.seared || m.heads >= HEAD_MAX) return;
      m.heads++; line(rt, m, `머리 ${m.heads}`, '#ff9a5a');
    },
    turnEnd(f, rt, st) { if (st.cur?.stat?.id === 'hydra') st.cur.seared = false; },
    // 지능: 이 사람이 이 종류로 이 적을 치면 얼마나 들어가나. 흡수 −1 · 면역 0 · 역효과(히드라 베기 · 푸딩 분열) 0.25
    dealK(e, o, t) {
      if (!G.Foe.smart || !o.stat) return 1;
      const k = Foe.typeK(o, t, e);
      if (k === 0) return o.stat.absorb === t ? -1 : SPLITS[o.stat.id] && (t === 'slashing' || t === 'lightning') ? -0.5 : 0;
      if (o.stat.id === 'hydra' && t === 'slashing' && !o.seared) return 0.25;
      if (SPLITS[o.stat.id] && (t === 'slashing' || t === 'lightning')) return 0.25;
      return k;
    },
    // 맞서 볼 만한 적만 남긴다. 다 나쁘면 그대로
    good(e, list, t) { const l = list.filter(o => Foe.dealK(e, o, t) >= 0.5); return l.length ? l : list; },
    // 승산 판단: 지난 두 라운드의 피해로 어느 쪽이 먼저 쓰러지나 어림한다. 3라운드부터 · 보스 제외
    assess(f, rt, st) {
      const pHP = rt.party.reduce((a, p) => a + (p.dead || p.dying ? 0 : p.hp), 0), fs = rt.mons.filter(o => o.aggro && !o.flee && o.hp > 0), mHP = fs.reduce((a, o) => a + o.hp, 0), h = st.hist = st.hist || [];
      h.push([pHP, mHP]); if (h.length > 3) h.shift();
      st.lose = false;
      if (!Foe.retreatOn || st.round < ASSESS_ROUND || h.length < 3 || !fs.length || fs.some(o => o.boss)) return false;
      const pLoss = (h[0][0] - pHP) / 2, mLoss = (h[0][1] - mHP) / 2;
      if (pLoss <= 0 && mLoss <= 0 && st.round >= STALE_ROUND) { st.lose = true; return true; } // 서로 못 깎는다: 끝나지 않는 전투
      if (pLoss <= 0) return false; // 우리가 안 다치면 시간은 우리 편
      st.lose = mLoss <= 0 || mHP / mLoss > pHP / pLoss * ASSESS_K;
      return st.lose;
    },
    // 이 사람의 공격이 남은 적 누구에게도 안 듣나 (면역 · 흡수). 역효과라도 피해가 들어가면 친다
    useless(e, list) { const t = DN().weapon(e).t; return list.length > 0 && Foe.smart && list.every(o => Foe.dealK(e, o, t) <= 0); },
    // 약점 표시 (원정 선택): 파티를 고르는 데 필요한 것만. must 공략 · weak 약점 · bad 면역 · 흡수 · res 저항
    notes(n) {
      const t = G.D.F.STAT[n], s = t && G.SRD_MON[t[0]], DT = G.Trinket.DT_N, out = [];
      if (!s) return out;
      for (const q of NOTE[s.id] || []) out.push(q);
      for (const k of s.vul) out.push({ s: `${DT[k]} ×2`, c: 'weak' });
      for (const k of s.imm) out.push(k === s.absorb ? { s: `${DT[k]} 흡수`, c: 'bad' } : { s: `${DT[k]} 면역`, c: 'bad' });
      for (const k of s.res) out.push({ s: `${DT[k]} 저항`, c: 'res' });
      return out;
    },
    // 분열 (SRD 검은 푸딩): 큰 · 중간 크기에 체력 10 이상일 때, 절반 이하가 되거나 번개 · 베기를 받으면 한 크기 작은 둘로 나뉜다. 체력은 반씩
    split(f, rt, m, dtype) {
      if (!SPLITS[m.stat?.id] || m.hp < 10 * (m.scale || 1) || (m.gen || 0) >= SPLIT_GEN) return;
      if (dtype !== 'lightning' && dtype !== 'slashing' && !(m.hp <= m.max0 / 2)) return;
      const st = rt.turn; if (st && m.splitRound === st.round) return; // 반응은 라운드에 한 번
      const half = Math.floor(m.hp / 2 / (m.scale || 1)) * (m.scale || 1), d = { n: m.n, ...G.D.F.mon[m.n] }, o = (F().spawnMon(rt, G.S.w.fantasy.floor, d, m.x, m.y, false, { aggro: true, major: true, spotted: true, gold: 0 }), rt.mons[rt.mons.length - 1]);
      m.gen = (m.gen || 0) + 1; m.hp = half; m.max = Math.max(half, m.max / 2); m.splitRound = st ? st.round : 0;
      if (o) { o.gen = m.gen; o.hp = half; o.max = m.max; o.max0 = m.max0; o.splitRound = m.splitRound; o.s = (m.s || 1) * 0.85; m.s = o.s; }
      line(rt, m, '분열', '#b8d67a');
      G.Tactics.snap(rt);
      if (st && o) st.order.splice(Math.max(0, st.order.findIndex(x => x.e === m)) + 1, 0, { e: o, nat: 10, init: 0 });
    },
    // 반격 주문 (SRD): 2레벨 이상 주문을 시전하면 건강 내성. 실패하면 주문이 사라지고 행동만 날린다 (슬롯은 그대로)
    counter(rt, a) {
      const m = rt.turn && rt.mons.find(o => o.stat?.id === 'mage' && o.hp > 0 && o.aggro && (o.pm || 0) < PROTECT_USES && !DN().out(o) && dist(o, a) <= Foe.reach(o) && F().sees(rt.map, o, a));
      if (!m) return false;
      if (G.Opt.can(a, 'mm_subtle')) { G.Opt.pay(a, 'mm_subtle'); return false; } // 은밀한 주문: 시전을 알아채지 못한다
      m.pm = (m.pm || 0) + 1; line(rt, m, '반격 주문', '#c9a6ff');
      if (DN().save(a, 'con', MAGE_DC)) return false;
      line(rt, a, '주문이 사라졌다', '#9aa0a8');
      return true;
    },
    // 쏘는 그림
    shot(rt, e, tg) { if (Foe.ranged(e)) G.fx(rt, { k: 'beam', x: e.x, y: e.y, x2: tg.x, y2: tg.y, col: def(e).bolt, w: 2, t: 0.2 }); },
    // 날렵한 도주: 치고 빠진다 (경로를 돌려준다)
    retreat(rt, e, tg) {
      if (!has(e, 'nimble') || e.hp <= 0 || DN().held(e) || dist(e, tg) >= AWAY_R) return null;
      const p = G.Tactics.plan(rt, e, tg, NIMBLE, (x, y) => Math.hypot(x - tg.x, y - tg.y) >= AWAY_R, true);
      if (p.length) line(rt, e, '날렵한 도주', '#d8c79a');
      return p;
    },
    // 언데드의 강인함: 치명타 · 강타가 아니면 한 번은 1로 버틴다
    survive(rt, m, src, dmg) {
      if (has(m, 'regen') && rt.turn) { const was = m.down; m.down = true; m.hp = DOWN_HP; if (!was) line(rt, m, '쓰러졌다 · 재생 중', '#ff9a5a'); return true; } // 체력 0: 차례가 올 때까지 안 죽는다 (F.hurt가 화염 · 산성을 기록)
      if (!has(m, 'fort') || src === 'crit' || src === 'smite' || m.lastType === 'radiant') return false; // SRD: 광휘 · 치명타가 아니면 건강 내성 DC 5 + 피해
      if (!DN().save(m, 'con', 5 + Math.round((dmg || 0) / (m.scale || 1)))) return false;
      m.hp = 1; line(rt, m, '언데드의 강인함', '#c9c2b2');
      return true;
    },
    immune: (m, k) => m.kind === 'mon' && !!IMMUNE[m.ty]?.includes(k),
    // 무리 전술: 표적 곁에 다른 몬스터가 있으면 이점
    pack(rt, att, tg) { return has(att, 'pack') && rt.mons.some(o => o !== att && o.hp > 0 && !o.down && dist(o, tg) <= MELEE_R); },
    // SRD 절반 엄폐: 쏘는 쪽과 표적 사이에 다른 인물이 서 있으면 AC +2 (전열이 후열을 가려 준다)
    cover(rt, att, tg) {
      const far = att.kind === 'mon' ? Foe.ranged(att) : att.def && att.def.range >= 2;
      if (!far) return 0;
      const shield = tg.merc ? G.Trinket.sum(tg.merc, 'acFar') : 0; // 화살 잡이 방패
      if (dist(att, tg) <= MELEE_R) return shield;
      if (att.merc && G.Trinket.has(att.merc, 'noCover')) return shield;
      const n = Math.ceil(dist(att, tg)), block = rt.party.concat(rt.mons).filter(o => o !== att && o !== tg && (o.kind === 'mon' ? o.hp > 0 : !o.dead));
      for (let i = 1; i < n; i++) { const x = att.x + (tg.x - att.x) * i / n, y = att.y + (tg.y - att.y) * i / n; if (block.some(o => Math.abs(o.x - x) < 0.5 && Math.abs(o.y - y) < 0.5)) return COVER + shield; }
      return shield;
    },
    // SRD: 적이 붙어 있으면 원거리 공격에 불리
    pointBlank(rt, att) {
      const far = att.kind === 'mon' ? Foe.ranged(att) : att.def && att.def.range >= 2;
      if (!far) return false;
      const foes = att.kind === 'mon' ? rt.party.filter(p => !p.dead) : rt.mons.filter(o => o.hp > 0 && o.aggro);
      return foes.some(o => dist(o, att) <= MELEE_R);
    },
  };
  return Foe;
})();
