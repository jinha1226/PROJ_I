'use strict';
// 원정과 마을 (DESIGN.md 0·33): 마을에서 정비하고 → 원정을 떠나 → 귀환하거나 전멸해 돌아온다.
// 원정 중에 번 골드는 짐(f.carry). 귀환하면 다 금고(f.gold)로, 전멸하면 절반을 잃는다. 트리·고용은 금고로 산다.
// 보스 층을 깨면 그다음 층이 체크포인트 — 다음 원정은 거기서(또는 더 얕은 체크포인트에서) 시작한다.
// 방치: 귀환 방침(체력 기준)이 알아서 돌아오게 하고, 자동 출발이 부상이 나으면 다시 내보낸다.
G.Exp = (() => {
  const U = G.U;
  // 짐 한도 = 지금 층 몬스터 골드 × CAP_K (대략 1~2층 분량). 가득 차면 넘치는 골드는 버리고,
  // 기본 방침이면 이 구간 보스를 잡고 귀환한다 (바로 돌아오면 체크포인트가 안 늘어 같은 구간에 갇힌다)
  const WIPE_KEEP = 0.5, TOWN_MIN = 8, TOWN_MAX = 45, TOWN_HEAL = 3, HOME_GRACE = 4, HOLD_T = 20, CAP_K = 200, PRESS_CAP = 0.3;
  const RETREAT = {
    wipe: { n: '전멸까지', d: '귀환 없음', at: 0 },
    hp50: { n: '체력 50%', d: '체력 50%', at: 0.5 },
    hp30: { n: '체력 30%', d: '체력 30%', at: 0.3 },
  };
  const F = () => G.Fantasy;

  const E = {
    RETREAT,
    carry: f => f.carry || 0,
    cap: f => F().monGold(f.floor) * CAP_K * (1 + (f.press || 0) * PRESS_CAP),
    // 짐에 넣는다 (F.gain): 한도까지만
    stow(f, n) { f.carry = Math.min(E.cap(f), (f.carry || 0) + n); },
    full: f => (f.carry || 0) >= E.cap(f) * 0.999,
    // 출발할 수 있는 층: 1층과 깬 보스 층 다음 층들
    starts(f) {
      const out = [1];
      for (let fl = 2; fl < (f.checkpoint || 1); fl++) if (F().isBoss(fl)) out.push(fl + 1);
      return out;
    },
    // 보스 층을 깼다: 그다음 층이 체크포인트
    cleared(f, fl) {
      if (fl + 1 > (f.checkpoint || 1)) {
        f.checkpoint = fl + 1;
        if (f.startAuto !== false) f.start = f.checkpoint;
        G.log(`출발점 · ${fl + 1}층`, 'fantasy', 'good');
      }
    },
    pickStart(f, dir) {
      const s = E.starts(f), i = Math.max(0, s.indexOf(f.start || 1));
      f.start = s[U.clamp(i + dir, 0, s.length - 1)];
      f.startAuto = f.start === s[s.length - 1];
    },
    // 마을로 (why: 'wipe' 전멸 · 'retreat' 방침 · 'manual' 귀환 단추)
    home(f, rt, why, who) {
      G.Season.save(f, rt);
      const c = E.carry(f), keep = why === 'wipe' ? c * WIPE_KEEP : c;
      if (why === 'wipe') G.Trinket.wipe(f, rt);
      G.Story.home(f);
      G.Report.make(f, why, keep, c - keep);
      f.press = 0;
      f.front = null;
      f.gold += keep;
      f.last = { floor: f.floor, got: keep, lost: c - keep, why, who, at: G.S.runTime };
      f.carry = 0;
      f.town = true;
      f.townT = 0;
      f.deaths = 0;
      if (f.startAuto !== false) f.start = f.checkpoint || 1;
      G.Cmd.clear(rt);
      rt.rivals = []; rt.prompt = null; rt.ask = null; rt.scene = null; rt.ambush = null; rt.mons = []; rt.chests = [];
      rt.phase = 'town';
      rt.homeAfterBoss = false;
      rt.leaving = null;
      F().refreshEnts(rt);
      const msg = `${f.floor}층 · ${{ clear: '지역 완주', full: '짐 가득', wipe: '전멸', retreat: '방침 귀환', careful: '신중 귀환', manual: '귀환' }[why] || '귀환'} · 짐 +${U.fmt(keep)}${c - keep ? ` · 잃음 ${U.fmt(c - keep)}` : ''}`;
      G.log(msg, 'fantasy', why === 'wipe' ? 'bad' : 'good');
      G.J.sfx('fantasy', why === 'wipe' ? 'lose' : 'coin');
    },
    // 보스 층을 깨고 내려가려 한다: 짐이 차 있었으면 여기서 귀환 (F.descend)
    afterBoss(f, rt) {
      if (!rt.homeAfterBoss) return false;
      rt.homeAfterBoss = false;
      E.home(f, rt, 'full');
      return true;
    },
    depart(f, rt) {
      G.Guild.autoForge(f);
      f.town = false;
      f.runs = (f.runs || 0) + 1;
      if (f.autoTr !== false) G.Trinket.auto(f);
      f.floor = f.runStart = U.clamp(f.start || f.checkpoint || 1, 1, Math.max(1, f.checkpoint || 1));
      f.deaths = 0;
      G.Res.longRest(f.mercs.concat(G.Guild.leader(f)));
      f.front = f.frontLock || f.front || G.Foe.offer(1)[0]; // 원정 세력 (고른 게 없으면 무작위)
      rt.btDepart = true;
      F().newFloor(f, rt);
      G.Bond.depart(f, rt);
      G.Report.snap(f, rt);
      G.J.sfx('fantasy', 'wave');
    },
    // 마을: 부상이 TOWN_HEAL배 빨리 낫는다. 자동 출발은 TOWN_MIN초 뒤, 출전할 사람이 다 나았거나 TOWN_MAX초가 지나면
    townTick(f, rt, dt) {
      f.townT = (f.townT || 0) + dt;
      for (const m of f.mercs) if (m.inj > 0) m.inj = Math.max(0, m.inj - dt * (TOWN_HEAL - 1));
      if (f.autoGo !== false && E.departIn(f) <= 0) E.depart(f, rt);
    },
    // 마을 화면을 만지는 동안은 자동 출발을 미룬다 (탭을 둘러보다 끌려 나가지 않게)
    hold(f) { f.townHold = G.S.runTime + HOLD_T; },
    // 자동 출발까지 남은 초 (Infinity: 자동 출발 꺼짐)
    departIn(f) {
      if (f.autoGo === false || f.seasonEnd) return Infinity;
      const hurt = f.mercs.some(m => m.inj > 0), t = f.townT || 0;
      return Math.max(0, TOWN_MIN - t, (f.townHold || 0) - G.S.runTime, hurt ? Math.min(TOWN_MAX - t, Math.max(...f.mercs.map(m => m.inj || 0)) / TOWN_HEAL) : 0);
    },
    // 원정 중: 귀환 방침. 보스와 싸우는 중에는 물러서지 않는다 (보스전은 이기거나 전멸하거나)
    tick(f, rt) {
      const R = RETREAT[f.retreat || 'hp30'];
      // 신중이 귀환을 불렀다: 기호를 잠깐 보여 주고 돌아간다
      if (rt.leaving) { if (rt.phase !== 'dead' && G.S.runTime >= rt.leaving.t) E.home(f, rt, 'careful', rt.leaving.who); return; }
      if (rt.floorT < HOME_GRACE || rt.phase === 'dead' || rt.mons.some(o => o.boss && o.aggro)) return;
      if (f.fullHome !== false && E.full(f)) rt.homeAfterBoss = true;
      if (!R.at) return;
      // 살아 있는 사람 기준 (쓰러진 동료는 곧 일어나므로, 한 명 쓰러졌다고 바로 돌아오지 않게)
      let hp = 0, max = 0;
      for (const p of rt.party) if (!p.dead) { hp += Math.max(0, p.hp); max += p.max || 0; }
      // 성격 (DESIGN.md 42): 신중이 기준을 올려 먼저 돌아오자고 하고, 욕심쟁이는 기준을 내려 버틴다 — 그 사람 머리 위에 기호
      const at = G.Persona.retreatAt(rt, R.at), P = G.Persona;
      if (max > 0 && hp < max * R.at && hp >= max * at) { const a = P.who(rt, 'greedy').find(q => P.free(rt, q, 'greedy', true)); if (a) P.fire(rt, a, 'greedy'); }
      if (!(max > 0 && hp < max * at)) return;
      const c = hp >= max * R.at && P.who(rt, 'careful')[0];
      if (!c) return E.home(f, rt, 'retreat');
      P.fire(rt, c, 'careful');
      rt.leaving = { t: G.S.runTime + 1.2, who: c.merc.name };
    },
  };
  return E;
})();
