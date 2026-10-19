'use strict';
// 판타지 · 끝없는 던전 (2D 던전 맵, 자동 전투)
// 층마다 방과 복도로 된 던전이 새로 생긴다. 기사와 동료들이 몬스터를 찾아가 싸우고, 모두 잡으면 계단으로 내려간다.
// 5층마다 계단 앞에 보스. 기사가 쓰러지면 같은 층을 다시 시작하고, 세 번 쓰러지면 한 층 물러난다.
// 맵 클릭 = 벼락 일격(범위 피해). 스킬트리에서 동료·기술을 연다. 버프는 음유시인의 노래와 성직자의 축복.
// 기사 주변 칸은 「본 칸」으로 남는다(안개·미니맵).
G.RT = G.RT || {};
G.Fantasy = (() => {
  const D = G.D.F, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('fantasy', G.S.w.fantasy.tree, k);
  const ta = k => G.Tree.add('fantasy', G.S.w.fantasy.tree, k);
  const MW = 40, MH = 26, REVIVE = 4, SMITE_CD = 0.6, SIGHT = 5, SONG_CD = 12, BLESS_CD = 15;
  const SKILLS = {
    heal: { n: '치유의 빛', t: 'fx_holy', cd: 30, need: 'sk_heal' },
    rage: { n: '전투 함성', t: 'r_dragon', cd: 40, need: 'sk_rage' },
    meteor: { n: '유성 낙하', t: 'fx_fire', cd: 25, need: 'sk_meteor' },
  };

  const F = {
    SKILLS,
    init(head = 0) {
      return { floor: 1, maxFloor: 1, gold: 5 * Math.pow(10, head), tree: G.Tree.init('fantasy'), buffs: {}, deaths: 0, auto: true, kills: 0, cds: {} };
    },
    rt(f) { return G.RT.fantasy || (G.RT.fantasy = F.boot(f)); },
    isBoss: fl => fl % 5 === 0,
    band: fl => D.bands.findIndex(b => fl <= b.to),
    monHP: (fl, boss) => 10 * Math.pow(1.13, fl - 1) * (boss ? 8 : 1),
    monAtk: (fl, boss) => 1.6 * Math.pow(1.105, fl - 1) * (boss ? 2 : 1),
    monGold: (fl, boss) => 2 * Math.pow(1.14, fl - 1) * (boss ? 10 : 1),
    floorEss: fl => 0.25 * Math.pow(fl, 1.3) * (F.isBoss(fl) ? 3 : 1),

    dmgMult(f) {
      const S = G.S;
      let m = G.globalMult() * (1 + G.relicVal('f_atk'));
      if (G.synergy('syn_sword')) m *= 1 + 0.01 * G.Wuxia.mastery(S.w.wuxia);
      if (G.synergy('syn_madblade')) m *= 1 + 1.5 * (1 - S.w.cthulhu.san / G.Cthulhu.maxSan(S.w.cthulhu));
      for (const k in f.buffs) if (D.buffs[k] && D.buffs[k].dmg) m *= D.buffs[k].dmg;
      return m;
    },
    heroAtk: f => 5 * tm('atk') * F.dmgMult(f),
    heroHP: f => 60 * tm('hp') * G.globalMult() * (1 + G.relicVal('f_hp')),
    aspd: () => tm('aspd'),
    crit: () => Math.min(0.75, 0.05 + ta('crit')),
    critD: () => 2 + ta('critd'),
    armor: () => Math.min(0.75, ta('armor')),
    regen: f => 0.01 + ta('regen') + (f.buffs.regen ? 0.04 : 0),
    goldMult: f => G.globalMult() * tm('gold') * (1 + G.relicVal('f_gold')) * (f.buffs.gold ? 2 : 1),
    smiteDmg: f => F.heroAtk(f) * 2 * tm('smite'),
    smiteR: () => 1 + ta('smiteR'),
    gain(f, n) { f.gold += n; G.tally('fantasy', n); },
    // 음유시인이 번갈아 부르는 노래
    songs: () => ['atk', 'gold'].concat(ta('songWar') ? ['fury'] : []),
    songDur: () => 8 * (1 + ta('songDur')),

    // ── 층 만들기 ──
    boot(f) {
      const rt = { fx: [], ents: [], mons: [], party: [], allies: [], phase: 'explore', reviveT: 0, smiteCd: 0, focus: null, target: null, song: 0 };
      F.newFloor(f, rt);
      return rt;
    },
    newFloor(f, rt) {
      const fl = f.floor, boss = F.isBoss(fl), m = GR.dungeon(MW, MH);
      rt.map = m;
      rt.mons = [];
      rt.seen = new Uint8Array(m.w * m.h);
      rt.seenVer = 0;
      const st = m.start;
      const hero = rt.hero || { kind: 'hero', t: 'knight', wpn: 'w_sword', s: 1.15, bar: true };
      Object.assign(hero, { x: st.cx, y: st.cy, max: F.heroHP(f), atkT: 0, dead: false });
      hero.hp = hero.max;
      rt.hero = hero;
      rt.party = [hero];
      const keep = {};
      for (const a of rt.allies) keep[a.id] = a;
      rt.allies = [];
      Object.keys(D.allies).forEach((id, i) => {
        if (!ta('ally_' + id)) return;
        const def = D.allies[id];
        const a = keep[id] || { kind: 'ally', id, def, t: def.t, wpn: def.wpn, s: 0.95, bar: true };
        Object.assign(a, { x: st.cx + (i % 3) - 1, y: st.cy + (i > 2 ? 1 : 0), atkT: Math.random(), dead: false, reviveT: 0, skT: (a.skT || 3) });
        a.max = a.hp = F.heroHP(f) * def.hp * tm('allyHp');
        rt.allies.push(a);
        rt.party.push(a);
      });
      const band = D.bands[F.band(fl)];
      const n = 10 + Math.min(12, Math.floor(fl / 4));
      for (let i = 0; i < n; i++) {
        const room = m.rooms[1 + U.rand(m.rooms.length - 1)];
        const x = room.x + U.rand(room.w), y = room.y + U.rand(room.h);
        if (m.c[y * m.w + x] !== '.') continue;
        F.spawnMon(rt, fl, U.pick(band.mons), x, y, false);
      }
      if (boss) {
        const d = D.bosses[(fl / 5 - 1) % D.bosses.length];
        F.spawnMon(rt, fl, d, m.end.cx - 1, m.end.cy, true);
      }
      rt.phase = 'explore';
      rt.focus = null;
      rt.target = null;
      rt.ents = [...rt.party, ...rt.mons];
      F.look(rt);
      G.emit('f_floor', fl);
    },
    spawnMon(rt, fl, d, x, y, boss) {
      const hp = F.monHP(fl, boss);
      rt.mons.push({
        kind: 'mon', n: d.n, t: d.t, wpn: d.wpn, x, y, s: boss ? d.s || 1.6 : 1, hp, max: hp, atk: F.monAtk(fl, boss), gold: F.monGold(fl, boss),
        boss, aggro: false, atkT: Math.random(), bar: true, label: boss ? d.n : null,
      });
    },
    // 기사 주변 SIGHT칸을 본 칸으로
    look(rt) {
      const m = rt.map, hx = Math.round(rt.hero.x), hy = Math.round(rt.hero.y);
      let added = false;
      for (let y = hy - SIGHT; y <= hy + SIGHT; y++) for (let x = hx - SIGHT; x <= hx + SIGHT; x++) {
        if (x < 0 || y < 0 || x >= m.w || y >= m.h || (x - hx) ** 2 + (y - hy) ** 2 > SIGHT * SIGHT) continue;
        const i = y * m.w + x;
        if (!rt.seen[i]) { rt.seen[i] = 1; added = true; }
      }
      if (added) rt.seenVer++;
    },
    // 동료 목록이 트리 구매로 바뀌면 다음 층부터 반영된다. 지금 층에도 바로 합류시킨다.
    syncAllies(f) {
      const rt = F.rt(f), have = new Set(rt.allies.map(a => a.id));
      Object.keys(D.allies).forEach(id => {
        if (have.has(id) || !ta('ally_' + id)) return;
        const def = D.allies[id], h = rt.hero;
        const a = { kind: 'ally', id, def, t: def.t, wpn: def.wpn, s: 0.95, bar: true, x: h.x, y: h.y, atkT: 0, dead: false, reviveT: 0, skT: 2 };
        a.max = a.hp = F.heroHP(f) * def.hp * tm('allyHp');
        rt.allies.push(a);
        rt.party.push(a);
        rt.ents = [...rt.party, ...rt.mons];
        G.fx(rt, { k: 'tile', key: 'fx_holy', x: h.x, y: h.y, t: 0.8 });
        G.J.sfx('fantasy', 'chime');
      });
    },

    // ── 전투 ──
    hurt(f, rt, m, dmg, src, from) {
      if (m.hp <= 0) return;
      m.hp -= dmg;
      m.aggro = true;
      // 숫자 크기로 위계: 치명타·벼락은 크게 튀고, 보통 타격은 체력 대비 피해만큼 커진다
      const big = src !== 'hit';
      G.fx(rt, { k: 'text', x: m.x, y: m.y - 0.6, s: U.fmt(dmg) + (src === 'crit' ? '!' : ''), col: src === 'crit' ? '#ffd24a' : src === 'smite' ? '#bfe8ff' : '#fff', t: 0.8, sz: (big ? 1.3 : 0.85) + 0.5 * Math.min(1, dmg / m.max), pop: big });
      G.J.hit('fantasy', m, src === 'smite' ? 0.5 : src === 'crit' ? 0.25 : 0, from);
      // 피 튀김(맞은 반대쪽으로), 치명타·벼락은 별 모양 충격
      const dx = from ? m.x - from.x : 0, dy = from ? m.y - from.y : 0;
      G.fx(rt, { k: 'splat', x: m.x, y: m.y, dx, dy, n: big ? 9 : 5, s: big ? 1.3 : 0.9, t: 0.5 });
      if (big) G.fx(rt, { k: 'impact', x: m.x, y: m.y - 0.1, s: src === 'smite' ? 1.8 : 1.4, col: src === 'smite' ? '#d8f0ff' : '#fff3b0', t: 0.22 });
      if (src === 'crit') G.J.sfx('fantasy', 'crit');
      if (m.hp <= 0) F.kill(f, rt, m);
    },
    kill(f, rt, m) {
      const g = m.gold * F.goldMult(f);
      F.gain(f, g);
      f.kills++;
      G.fx(rt, { k: 'die', spr: m.t, x: m.x, y: m.y, s: m.s, flip: m.flip, t: 0.45 });
      G.fx(rt, { k: 'text', x: m.x, y: m.y - 1, s: '+' + U.fmt(g), col: '#ffd24a', t: 1.1 });
      G.J.sfx('fantasy', 'coin');
      if (m.boss) {
        G.J.finish('fantasy', m.x, m.y);
        G.J.sfx('fantasy', 'finish');
        if (f.floor % 10 === 0) G.addSigns(1, 'fantasy');
        G.log(`${m.n} 토벌! (${f.floor}층)`, 'fantasy', 'good');
      }
      rt.mons = rt.mons.filter(x => x !== m);
      if (rt.focus === m) rt.focus = null;
      if (rt.target === m) rt.target = null;
      rt.ents = [...rt.party, ...rt.mons];
    },
    nearestMon(rt, e, maxD = 1e9) {
      let best = null, bd = maxD;
      for (const m of rt.mons) { const d = GR.dist(e, m); if (d < bd) { bd = d; best = m; } }
      return best;
    },
    // 길로 잰 가장 가까운 몬스터. 한 번 고르면 쓰러뜨릴 때까지 바꾸지 않는다 (벽 너머 두 적 사이에서 오가지 않게).
    pickTarget(rt) {
      const t = rt.target;
      if (t && t.hp > 0 && rt.mons.includes(t)) return t;
      const h = rt.hero, d = GR.field(rt.map, Math.round(h.x), Math.round(h.y));
      let best = null, bd = 1e9;
      for (const m of rt.mons) {
        const v = d[Math.round(m.x) + Math.round(m.y) * rt.map.w];
        const k = v >= 0 ? v : 1e6 + GR.dist(h, m);
        if (k < bd) { bd = k; best = m; }
      }
      return (rt.target = best);
    },
    descend(f, rt) {
      G.addEss(F.floorEss(f.floor), 'fantasy');
      G.J.sfx('fantasy', 'wave');
      if (f.auto) {
        f.floor++;
        if (f.floor > f.maxFloor) f.maxFloor = f.floor;
      }
      f.deaths = 0;
      F.newFloor(f, rt);
    },
    goto(f, fl) {
      f.floor = U.clamp(fl, 1, f.maxFloor);
      f.deaths = 0;
      F.newFloor(f, F.rt(f));
    },

    // ── 기술 ──
    click(f, x, y) {
      const rt = F.rt(f);
      if (rt.phase === 'dead' || rt.smiteCd > 0) return false;
      rt.smiteCd = SMITE_CD;
      const r = F.smiteR(), dmg = F.smiteDmg(f);
      G.fx(rt, { k: 'bolt', x, y, t: 0.35, col: '#bfe8ff' });
      G.fx(rt, { k: 'ring', x, y, r, t: 0.35, col: '#bfe8ff' });
      G.J.sfx('fantasy', 'smite');
      G.J.shake('fantasy', 5, 0, 1, 0.2);
      let last = null;
      for (const m of [...rt.mons]) if (Math.hypot(m.x - x, m.y - y) <= r) { last = m; F.hurt(f, rt, m, dmg, 'smite', { x, y: y - 1 }); }
      if (last && last.hp > 0) rt.focus = last;
      return true;
    },
    unlocked: id => ta(SKILLS[id].need) > 0,
    canCast: (f, id) => F.unlocked(id) && !(f.cds[id] > 0),
    cast(f, id) {
      const rt = F.rt(f);
      if (!F.canCast(f, id) || rt.phase === 'dead') return false;
      f.cds[id] = SKILLS[id].cd;
      if (id === 'heal') {
        for (const p of rt.party) if (!p.dead) { p.hp = Math.min(p.max, p.hp + p.max * 0.5); G.fx(rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.8 }); }
        G.J.sfx('fantasy', 'bell');
      } else if (id === 'rage') {
        f.buffs.rage = 10;
        G.fx(rt, { k: 'ring', x: rt.hero.x, y: rt.hero.y, r: 2.5, t: 0.6, col: '#ff5a3a' });
        G.J.sfx('fantasy', 'chime');
      } else if (id === 'meteor') {
        const tg = rt.focus || F.nearestMon(rt, rt.hero) || rt.hero;
        const x = tg.x, y = tg.y;
        G.fx(rt, { k: 'tile', key: 'fx_fire', x, y, t: 0.9, s: 3 });
        G.J.sfx('fantasy', 'boom');
        G.J.shake('fantasy', 10, 0, 1, 0.35);
        for (const m of [...rt.mons]) if (Math.hypot(m.x - x, m.y - y) <= 2.5) F.hurt(f, rt, m, F.smiteDmg(f) * 20, 'smite', { x, y: y - 1 });
      }
      return true;
    },
    // 음유시인의 노래 / 성직자의 축복: 버프를 건다
    buff(f, rt, who, k, dur) {
      f.buffs[k] = dur;
      const B = D.buffs[k];
      G.fx(rt, { k: 'ring', x: who.x, y: who.y, r: 3, t: 0.7, col: B.col });
      G.fx(rt, { k: 'text', x: who.x, y: who.y - 1.1, s: B.n, col: B.col, t: 1.4, sz: 1.1, pop: true });
      G.J.sfx('fantasy', k === 'regen' ? 'bell' : 'chime');
    },

    // 같은 무리끼리 겹치지 않게 살짝 밀어낸다 (벽 칸으로는 밀지 않는다)
    spread(m, list, r) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.dead || b.dead) continue;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= r) continue;
        if (d < 1e-3) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
        const p = (r - d) * 0.25, ux = dx / d * p, uy = dy / d * p;
        if (a.kind !== 'hero' && GR.pass(m, Math.round(a.x - ux), Math.round(a.y - uy))) { a.x -= ux; a.y -= uy; }
        if (b.kind !== 'hero' && GR.pass(m, Math.round(b.x + ux), Math.round(b.y + uy))) { b.x += ux; b.y += uy; }
      }
    },

    tick(f, dt) {
      const rt = F.rt(f);
      G.fxTick(rt, dt);
      for (const k in f.buffs) if ((f.buffs[k] -= dt) <= 0) delete f.buffs[k];
      for (const k in f.cds) if ((f.cds[k] -= dt) <= 0) delete f.cds[k];
      if (rt.smiteCd > 0) rt.smiteCd -= dt;
      if (ta('autocast') && rt.phase !== 'dead') {
        if (rt.mons.length && F.canCast(f, 'rage')) F.cast(f, 'rage');
        if (rt.mons.length && F.canCast(f, 'meteor')) F.cast(f, 'meteor');
        if (rt.hero.hp < rt.hero.max * 0.5 && F.canCast(f, 'heal')) F.cast(f, 'heal');
      }
      if (rt.phase === 'dead') {
        if ((rt.reviveT -= dt) <= 0) {
          if (f.deaths >= 3) {
            f.floor = Math.max(1, f.floor - 1);
            f.deaths = 0;
            G.log(`세 번 쓰러졌다 — ${f.floor}층으로 물러나 힘을 기른다`, 'fantasy', 'bad');
          }
          F.newFloor(f, rt);
        }
        return;
      }
      const m = rt.map, hero = rt.hero;
      const aspd = F.aspd(), speed = 3.2 * tm('speed');
      const hmax = F.heroHP(f) * (f.buffs.hp ? 1.6 : 1);
      hero.max = hmax;
      for (const p of rt.party) {
        if (p.dead) continue;
        if (p !== hero) p.max = hmax * p.def.hp * tm('allyHp');
        p.hp = Math.min(p.max, p.hp + p.max * F.regen(f) * dt);
      }
      // 몬스터: 가까이 오면 깨어나 가장 가까운 파티원을 쫓는다
      for (const mo of rt.mons) {
        mo.moving = false;
        if (!mo.aggro && GR.dist(mo, hero) < (mo.boss ? 4 : 6)) mo.aggro = true;
        if (!mo.aggro) continue;
        let tg = null, bd = 1e9;
        for (const p of rt.party) if (!p.dead) { const d = GR.dist(mo, p); if (d < bd) { bd = d; tg = p; } }
        if (!tg) continue;
        if (bd > 1.1 + mo.s * 0.2) { GR.moveTo(m, mo, tg.x, tg.y, mo.boss ? 1.8 : 2.2, dt, 1); continue; }
        mo.flip = tg.x < mo.x;
        if ((mo.atkT -= dt) <= 0) {
          mo.atkT = 1;
          const dmg = mo.atk * (tg === hero ? 1 - F.armor() : 1);
          tg.hp -= dmg;
          G.J.lunge('fantasy', mo, tg);
          G.J.hit('fantasy', tg, 0, mo);
          G.fx(rt, { k: 'splat', x: tg.x, y: tg.y, dx: tg.x - mo.x, dy: tg.y - mo.y, n: 4, s: 0.8, t: 0.45 });
          G.fx(rt, { k: 'slash', x: tg.x, y: tg.y, t: 0.22, rot: Math.random() - 0.5, flip: mo.x > tg.x });
          G.fx(rt, { k: 'text', x: tg.x, y: tg.y - 0.6, s: '-' + U.fmt(dmg), col: '#ff6b6b', t: 0.7 });
          if (tg === hero) G.J.sfx('fantasy', 'hurt');
          if (tg.hp <= 0) {
            tg.dead = true;
            if (tg === hero) {
              rt.phase = 'dead';
              rt.reviveT = REVIVE;
              f.deaths++;
              G.J.sfx('fantasy', 'lose');
              G.J.shake('fantasy', 8, 1, 0, 0.4);
              G.log(`${mo.n}에게 쓰러졌다 (${f.floor}층)`, 'fantasy', 'bad');
              return;
            }
            tg.reviveT = 8;
          }
        }
      }
      // 기사: 지정한 적 또는 길로 가장 가까운 적. 적이 없으면 계단으로.
      hero.moving = false;
      const target = (rt.focus && rt.focus.hp > 0) ? rt.focus : F.pickTarget(rt);
      if (target) {
        if (GR.dist(hero, target) > 1.2 + target.s * 0.2) GR.moveTo(m, hero, target.x, target.y, speed, dt, 1);
        else {
          hero.flip = target.x < hero.x;
          if ((hero.atkT -= dt * aspd) <= 0) {
            hero.atkT = 1;
            const c = U.chance(F.crit());
            G.fx(rt, { k: 'slash', x: target.x, y: target.y, t: 0.3, crit: c, rot: Math.random() - 0.5, flip: hero.x > target.x });
            G.J.lunge('fantasy', hero, target);
            if (!c) G.J.sfx('fantasy', 'tap');
            F.hurt(f, rt, target, F.heroAtk(f) * (c ? F.critD() : 1), c ? 'crit' : 'hit', hero);
          }
        }
      } else if (GR.moveTo(m, hero, m.end.cx, m.end.cy, speed, dt, 0.2)) {
        F.descend(f, rt);
        return;
      }
      F.look(rt);
      // 동료
      for (const a of rt.allies) {
        a.moving = false;
        if (a.dead) {
          if ((a.reviveT -= dt) <= 0) { a.dead = false; a.hp = a.max; a.x = hero.x; a.y = hero.y; }
          continue;
        }
        const def = a.def;
        // 음유시인: 노래를 번갈아 부른다
        if (def.song && rt.mons.length && (a.skT -= dt) <= 0) {
          a.skT = SONG_CD;
          const ss = F.songs(), k = ss[rt.song++ % ss.length];
          F.buff(f, rt, a, k, F.songDur() * (k === 'fury' ? 0.6 : 1));
        }
        if (def.heal) {
          // 성직자: 축복(트리)으로 파티 재생
          if (ta('bless') && (a.skT -= dt) <= 0) { a.skT = BLESS_CD; F.buff(f, rt, a, 'regen', 10 * (1 + ta('songDur'))); }
          if ((a.atkT -= dt) <= 0) {
            let low = null;
            for (const p of rt.party) if (!p.dead && p.hp < p.max * 0.9 && (!low || p.hp / p.max < low.hp / low.max)) low = p;
            a.atkT = low ? def.cd : 0.3;
            if (low) {
              low.hp = Math.min(low.max, low.hp + low.max * def.heal);
              G.fx(rt, { k: 'tile', key: 'fx_holy', x: low.x, y: low.y, t: 0.5 });
            }
          }
          if (GR.dist(a, hero) > 1.8) GR.moveTo(m, a, hero.x, hero.y, speed * 1.1, dt, 1.4);
          continue;
        }
        const tg = F.nearestMon(rt, a, def.range + 4);
        if (tg && GR.dist(tg, hero) < 9) {
          if (GR.dist(a, tg) > def.range) { GR.moveTo(m, a, tg.x, tg.y, speed, dt, def.range * 0.8); continue; }
          a.flip = tg.x < a.x;
          if ((a.atkT -= dt * aspd) <= 0) {
            a.atkT = def.cd;
            const dmg = F.heroAtk(f) * def.atk * 0.5 * tm('allyAtk');
            if (def.proj) G.fx(rt, { k: 'proj', key: def.proj, x: a.x, y: a.y, x2: tg.x, y2: tg.y, t: 0.25 });
            else { G.fx(rt, { k: 'slash', x: tg.x, y: tg.y, t: 0.25, rot: Math.random() - 0.5, flip: a.x > tg.x }); G.J.lunge('fantasy', a, tg); }
            if (def.splash) { for (const mo of [...rt.mons]) if (GR.dist(mo, tg) <= def.splash) F.hurt(f, rt, mo, dmg, 'hit', a); }
            else if (def.chain) {
              const hit = rt.mons.slice().sort((p, q) => GR.dist(p, tg) - GR.dist(q, tg)).slice(0, def.chain);
              for (const mo of hit) F.hurt(f, rt, mo, dmg, 'hit', a);
            } else F.hurt(f, rt, tg, dmg, 'hit', a);
          }
        } else if (GR.dist(a, hero) > 1.8) GR.moveTo(m, a, hero.x, hero.y, speed * 1.1, dt, 1.4);
      }
      F.spread(m, rt.party, 0.75);
      F.spread(m, rt.mons, 0.8);
    },
    view(f) {
      const rt = F.rt(f), b = F.band(f.floor), m = rt.map;
      if (m._band !== b) { m._band = b; m.ver++; }
      return {
        map: m, ents: rt.ents, fx: rt.fx, cam: rt.hero, viewH: 13, dimAll: rt.phase === 'dead',
        fog: { seen: rt.seen, ver: rt.seenVer, light: rt.hero },
        mini: { seen: rt.seen, ver: rt.seenVer, end: m.end, party: rt.party, mons: rt.mons },
        terrain(x, y) {
          const c = m.c[y * m.w + x];
          if (c === '#') {
            // 0x72 벽: 아래가 바닥이면 앞면(벽돌이 보인다), 그 밖에 바닥과 닿으면 윗면
            const open = (dx, dy) => '.>'.includes(GR.at(m, x + dx, y + dy));
            if (G.ARTSET['f_wface' + b]) {
              if (open(0, 1)) return ['f_wface' + b];
              // 벽 속은 어두운 돌. 바닥과 닿은 쪽마다 테두리, 앞면 바로 위 칸에는 앞면의 윗단
              const face = GR.at(m, x, y + 1) === '#' && '.>'.includes(GR.at(m, x, y + 2));
              if (!face && !GR.DIR.some(([dx, dy]) => open(dx, dy))) return null;
              const L = ['f_wdark' + b];
              if (face) L.push('f_cS' + b);
              if (open(0, -1)) L.push('f_cN' + b);
              if (open(1, 0)) L.push('f_cE' + b);
              if (open(-1, 0)) L.push('f_cW' + b);
              return L;
            }
            for (const [dx, dy] of GR.DIR) if (open(dx, dy)) return ['f_wall' + b];
            return null;
          }
          return c === '>' ? ['f_floor' + b, 'f_stairs'] : ['f_floor' + b];
        },
      };
    },
    status: f => `${f.floor}층`,
  };
  return F;
})();
