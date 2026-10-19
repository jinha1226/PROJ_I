'use strict';
// 크툴루 · 금단의 복권 (밤의 아컴 거리 — Scritchy Scratchy, Luck be a Landlord 계열)
// 광신도(스킬트리)가 집 → 복권방 → (인장을 얻으면) 제단을 오가며 복권을 긁는다. 맨홀에서 촉수가 기어 나와 이성을 갉아먹는다.
// 촉수를 클릭하면 조사관이 퇴마한다. 복권방을 클릭하면 직접 긁는다: 같은 그림 3개 = 상금.
// 이성이 낮을수록 당첨금이 최대 ×2.5. 0이 되면 15초 광기: 광신도가 얼어붙고 촉수가 쏟아진다.
G.RT = G.RT || {};
G.Cthulhu = (() => {
  const D = G.D.C, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('cthulhu', G.S.w.cthulhu.tree, k);
  const ta = k => G.Tree.add('cthulhu', G.S.w.cthulhu.tree, k);
  const MAD = 15, REST_EVERY = 8;

  const C = {
    init(head = 0) {
      return { coins: 20 * Math.pow(10, head), san: 100, tree: G.Tree.init('cthulhu'), tier: 0, madT: 0, cur: null, tickets: 0, wins: 0, best: 0, recent: [] };
    },
    rt(c) { return G.RT.cthulhu || (G.RT.cthulhu = C.boot(c)); },
    boot(c) {
      const map = GR.fromAscii(D.map, D.pass);
      const [kx, ky] = map.poi.K[0];
      return { map, fx: [], cultists: [], horrors: [], horrorT: 6, wardT: 0, inv: { kind: 'hero', t: ['wb_human', 'c_investigator', 'c_hat'], x: kx + 1, y: ky + 1, s: 1.05 } };
    },
    unlocked: () => Math.min(D.tickets.length - 1, ta('tier')),
    maxSan: () => 100 + 20 * ta('mind'),
    sanRegen: () => (1 + 0.3 * ta('mind')) * (1 + G.relicVal('c_san')),
    sanMult: c => 1 + 1.5 * (1 - c.san / C.maxSan()),
    prizeMult() {
      // 전역 배수는 당첨금이 아니라 광신도 속도에 붙는다 (당첨금에 붙으면 복권 한 장의 기댓값이 폭주한다)
      let m = (1 + G.relicVal('c_prize')) * tm('prize');
      if (G.synergy('syn_heaven')) m *= 1 + 0.15 * G.S.w.xianxia.realm;
      return m;
    },
    luck: () => 1 + ta('luck'),
    cultCount: () => Math.min(25, ta('cult')),
    probs() {
      const l = C.luck(), ps = D.prizes.map(p => p.p * l), tot = ps.reduce((a, b) => a + b, 0);
      return tot > 0.9 ? ps.map(p => p * 0.9 / tot) : ps;
    },
    price: tier => D.tickets[tier].price,
    roll(tier) {
      const ps = C.probs();
      let r = Math.random(), prize = -1;
      for (let i = ps.length - 1; i >= 0; i--) { if (r < ps[i]) { prize = i; break; } r -= ps[i]; }
      return {
        prize, tentacles: U.chance(0.45) ? (U.chance(0.25) ? 2 : 1) : 0,
        sign: U.chance(0.02 * tm('sign')) ? 1 : 0, candle: U.chance(0.05) ? 1 : 0,
      };
    },
    gen(tier) {
      const R = C.roll(tier), cells = new Array(9).fill(null), pos = U.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      let p = 0;
      if (R.prize >= 0) for (let i = 0; i < 3; i++) cells[pos[p++]] = R.prize;
      for (let i = 0; i < R.tentacles; i++) cells[pos[p++]] = 'tentacle';
      if (R.sign) cells[pos[p++]] = 'sign';
      if (R.candle) cells[pos[p++]] = 'candle';
      const cnt = [0, 0, 0, 0, 0, 0];
      if (R.prize >= 0) cnt[R.prize] = 3;
      for (; p < 9; p++) {
        const s = U.pick(cnt.map((n, i) => i).filter(i => cnt[i] < 2));
        cnt[s]++;
        cells[pos[p]] = s;
      }
      return { tier, prize: R.prize, cells: cells.map(s => ({ s, rev: false })), done: false };
    },
    gain(c, n) { c.coins += n; G.tally('cthulhu', n); },
    // 직접 긁기
    buy(c) {
      if (c.madT > 0 || (c.cur && !c.cur.done)) return false;
      const pr = C.price(c.tier);
      if (c.coins < pr) return false;
      c.coins -= pr;
      c.cur = C.gen(c.tier);
      c.tickets++;
      return true;
    },
    reveal(c, i) {
      const t = c.cur;
      if (!t || t.done || c.madT > 0 || t.cells[i].rev) return;
      const cell = t.cells[i];
      cell.rev = true;
      if (cell.s === 'tentacle') { C.hurt(c, 8); G.J.sfx('cthulhu', 'hurt'); G.J.shake('cthulhu', 5); }
      else if (cell.s === 'candle') { c.san = Math.min(C.maxSan(), c.san + 12); G.J.sfx('cthulhu', 'bell'); }
      else if (cell.s === 'sign') { G.addSigns(1, 'cthulhu'); G.J.sfx('cthulhu', 'chime'); }
      else G.J.sfx('cthulhu', 'reveal');
      G.emit('c_reveal', { i, s: cell.s });
      if (c.madT <= 0 && t.cells.every(x => x.rev)) C.resolve(c, t);
    },
    revealAll(c) {
      if (!c.cur || c.cur.done) return;
      for (let i = 0; i < 9 && c.madT <= 0; i++) C.reveal(c, i);
    },
    hurt(c, n) {
      c.san -= n;
      if (c.san <= 0) {
        c.san = 0;
        c.madT = MAD;
        G.log('광기 발작! 눈앞의 숫자들이 꿈틀거린다…', 'cthulhu', 'bad');
        G.J.sfx('cthulhu', 'mad');
        G.J.shake('cthulhu', 12, 0, 0, 0.8);
        G.J.flash('cthulhu', '#8f2bd6');
        G.emit('c_mad');
      }
    },
    payout(c, tier, prize) {
      if (prize < 0) return 0;
      const m = D.prizes[prize].m, win = C.price(tier) * m * C.sanMult(c) * C.prizeMult();
      C.gain(c, win);
      c.wins++;
      if (win > c.best) c.best = win;
      if (m >= 25) G.addEss(D.tickets[tier].ess * m / 25, 'cthulhu');
      return win;
    },
    resolve(c, t) {
      t.done = true;
      const win = C.payout(c, t.tier, t.prize), res = { tier: t.tier, prize: t.prize, win };
      c.recent.unshift(res);
      if (c.recent.length > 8) c.recent.pop();
      // 당첨 크기에 맞춘 소리: 꽝은 작게, 대박은 화면까지 번쩍
      if (t.prize < 0) G.J.sfx('cthulhu', 'dud');
      else if (D.prizes[t.prize].m >= 25) { G.J.sfx('cthulhu', 'jackpot'); G.J.flash('cthulhu', '#ffd24a'); G.J.shake('cthulhu', 8); }
      else G.J.sfx('cthulhu', 'win', { tier: t.prize });
      if (t.prize >= 3) G.log(`${D.tickets[t.tier].n} ${D.prizes[t.prize].m}배 당첨! +${U.fmt(win)}`, 'cthulhu', 'good');
      G.emit('c_result', res);
    },
    beg(c) { c.coins += 1; },
    // 광신도 몫: 결과만 굴린다. 촉수는 맨홀에서 실제로 기어 나온다.
    autoTier(c) {
      let t = C.unlocked();
      while (t > 0 && c.coins < C.price(t) * 3) t--;
      return t;
    },
    horrorHp: () => 10 * Math.pow(3, C.unlocked()),
    spawnHorror(c, rt, near) {
      if (rt.horrors.length >= 8) return;
      const holes = rt.map.poi.o;
      const [hx, hy] = near ? holes.reduce((a, b) => (Math.hypot(a[0] - near.x, a[1] - near.y) < Math.hypot(b[0] - near.x, b[1] - near.y) ? a : b)) : U.pick(holes);
      const hp = C.horrorHp();
      rt.horrors.push({ kind: 'mon', t: { k: 'c_horror', v: U.rand(5) }, x: hx, y: hy, s: 1, hp, max: hp, bar: true });
      G.fx(rt, { k: 'ring', x: hx, y: hy, r: 0.8, t: 0.6, col: '#8f5bd6' });
      G.J.sfx('cthulhu', 'gurgle');
    },
    // power > 0: 직접 퇴마 (히트스톱)
    hitHorror(c, rt, h, dmg, from, col, power = 0) {
      h.hp -= dmg;
      G.fx(rt, { k: 'beam', x: from.x, y: from.y, x2: h.x, y2: h.y, col, w: 2, t: 0.15 });
      G.J.hit('cthulhu', h, power);
      if (power) G.fx(rt, { k: 'text', x: h.x, y: h.y - 0.5, s: U.fmt(dmg), col: '#e8d48a', t: 0.7, sz: 1.2 + 0.5 * Math.min(1, dmg / h.max), pop: true });
      if (h.hp <= 0) {
        G.J.sfx('cthulhu', 'banish');
        rt.horrors = rt.horrors.filter(o => o !== h);
        c.san = Math.min(C.maxSan(), c.san + 3);
        G.fx(rt, { k: 'text', x: h.x, y: h.y - 0.7, s: '퇴마', col: '#c7a6ff', t: 0.9 });
      }
    },
    click(c, x, y) {
      const rt = C.rt(c);
      for (const h of rt.horrors) if (Math.hypot(h.x - x, h.y - y) < 1) {
        C.hitHorror(c, rt, h, 4 * tm('banish') * G.globalMult(), rt.inv, '#e8d48a', 0.4);
        G.J.sfx('cthulhu', 'hit');
        return true;
      }
      const [kx, ky] = rt.map.poi.K[0];
      if (Math.hypot(kx - x, ky - y) < 1.3) { G.emit('c_kiosk'); G.J.sfx('cthulhu', 'select'); return true; }
      return false;
    },

    tick(c, dt) {
      const rt = C.rt(c), m = rt.map, [kx, ky] = m.poi.K[0], [ax, ay] = m.poi.A[0];
      G.fxTick(rt, dt);
      const mad = c.madT > 0;
      if (mad) { if ((c.madT -= dt) <= 0) { c.madT = 0; c.san = C.maxSan() * 0.5; } }
      else c.san = Math.min(C.maxSan(), c.san + C.sanRegen() * dt - 0.3 * rt.horrors.length * dt);
      if (!mad && c.san <= 0) C.hurt(c, 0);
      // 조사관: 직접 긁는 중이면 복권방 앞, 아니면 그 옆
      rt.inv.moving = false;
      GR.moveTo(m, rt.inv, kx + (c.cur && !c.cur.done ? 0 : 1), ky + 1, 3, dt, 0.1);
      // 광신도
      const homes = m.poi.H, n = C.cultCount();
      while (rt.cultists.length < n) {
        const home = homes[rt.cultists.length % homes.length];
        rt.cultists.push({ kind: 'ally', t: 'c_cultist', x: home[0], y: home[1], s: 0.95, home, state: 'go', t0: 0, done: 0, slot: rt.cultists.length });
      }
      const scratchT = 2.5 / (tm('cultSpeed') * Math.sqrt(G.globalMult()));
      for (const cu of rt.cultists) {
        cu.moving = false;
        if (mad) { cu.dim = true; continue; }
        cu.dim = false;
        if (cu.state === 'stun') { if ((cu.t0 -= dt) <= 0) cu.state = 'go'; continue; }
        if (cu.state === 'go') {
          const a = cu.slot * 2.4, tx = kx + Math.cos(a) * 1.2, ty = ky + 0.4 + Math.abs(Math.sin(a)) * 1.1;
          if (GR.moveTo(m, cu, tx, ty, 2.2, dt, 0.15)) {
            const tier = C.autoTier(c);
            if (c.coins >= C.price(tier)) { c.coins -= C.price(tier); cu.tier = tier; cu.state = 'scratch'; cu.t0 = scratchT; }
          }
        } else if (cu.state === 'scratch') {
          if ((cu.t0 -= dt) > 0) { if (Math.random() < dt * 2) G.fx(rt, { k: 'text', x: cu.x, y: cu.y - 0.6, s: '…', col: '#aaa', t: 0.5 }); continue; }
          c.tickets++;
          const R = C.roll(cu.tier), win = C.payout(c, cu.tier, R.prize);
          if (win) G.fx(rt, { k: 'text', x: cu.x, y: cu.y - 0.8, s: '+' + U.fmt(win), col: R.prize >= 3 ? '#ffd24a' : '#bfe8a0', t: 1, sz: R.prize >= 3 ? 1.3 : 0.9, pop: R.prize >= 3 });
          if (R.prize >= 3) G.J.sfx('cthulhu', 'coin');
          if (R.tentacles) C.spawnHorror(c, rt, cu);
          cu.done++;
          cu.state = R.sign ? 'altar' : cu.done % REST_EVERY === 0 ? 'home' : 'go';
        } else if (cu.state === 'altar') {
          if (GR.moveTo(m, cu, ax, ay + 1, 2.2, dt, 0.4)) { G.addSigns(1, 'cthulhu'); G.fx(rt, { k: 'tile', key: 'c_sign', x: ax, y: ay, t: 1 }); cu.state = 'go'; }
        } else if (cu.state === 'home') {
          if (GR.moveTo(m, cu, cu.home[0], cu.home[1], 2.2, dt, 0.2)) { cu.state = 'rest'; cu.t0 = 4; }
        } else if (cu.state === 'rest') {
          if ((cu.t0 -= dt) <= 0) cu.state = 'go';
        }
      }
      // 촉수
      rt.horrorT -= dt * (mad ? 3 : 1);
      // 촉수는 광신도가 많을수록 자주 꼬인다 (광신도가 없으면 거리는 조용하다)
      if (rt.horrorT <= 0) { rt.horrorT = Math.max(4, 14 * (0.4 + c.san / C.maxSan())); if (rt.horrors.length < Math.ceil(rt.cultists.length / 3)) C.spawnHorror(c, rt); }
      for (const h of rt.horrors) {
        h.moving = false;
        let tg = null, bd = 1e9;
        for (const cu of rt.cultists) if (cu.state !== 'stun' && cu.state !== 'rest') { const d = GR.dist(h, cu); if (d < bd) { bd = d; tg = cu; } }
        if (!tg) continue;
        if (bd > 0.8) GR.moveTo(m, h, tg.x, tg.y, 1.1, dt, 0.7);
        else { tg.state = 'stun'; tg.t0 = 4; G.fx(rt, { k: 'text', x: tg.x, y: tg.y - 0.7, s: '으아악', col: '#c7a6ff', t: 1 }); }
      }
      // 엘더 사인 결계
      if (ta('ward') && (rt.wardT -= dt) <= 0) {
        rt.wardT = 1;
        for (const [wx, wy] of [[kx, ky], [ax, ay]]) {
          const h = rt.horrors.find(o => Math.hypot(o.x - wx, o.y - wy) <= 4);
          if (h) C.hitHorror(c, rt, h, 5 * tm('wardDmg') * G.globalMult(), { x: wx, y: wy }, '#9b6bd6');
        }
      }
    },
    view(c) {
      const rt = C.rt(c), ents = [...rt.horrors, ...rt.cultists, rt.inv];
      if (ta('ward')) for (const ch of ['K', 'A']) { const [x, y] = rt.map.poi[ch][0]; ents.unshift({ t: 'c_ward', x, y: y + 0.05, s: 1.6, alpha: 0.35, under: true }); }
      const lowSan = 1 - c.san / C.maxSan();
      return {
        map: rt.map, ents, fx: rt.fx, fit: true, terrain: (x, y) => D.tiles[GR.at(rt.map, x, y)] || null,
        tint: c.madT > 0 ? 'rgba(90,20,120,0.35)' : `rgba(20,40,30,${0.15 + lowSan * 0.25})`, lamps: true,
      };
    },
    status: c => `동전 ${U.fmt(c.coins)}`,
  };
  return C;
})();
