'use strict';
// 판타지 · 끝없는 던전 (2D 던전 맵, 자동 전투)
// 층마다 방과 복도로 된 던전이 새로 생긴다. 기사와 동료들이 몬스터를 찾아가 싸우고, 모두 잡으면 계단으로 내려간다.
// 5층마다 계단 앞에 보스. 기사가 쓰러지면 같은 층을 다시 시작하고, 세 번 쓰러지면 한 층 물러난다.
// 맵 클릭 = 벼락 일격(범위 피해). 스킬트리에서 동료·기술·요리를 연다.
G.RT = G.RT || {};
G.Fantasy = (() => {
  const D = G.D.F, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('fantasy', G.S.w.fantasy.tree, k);
  const ta = k => G.Tree.add('fantasy', G.S.w.fantasy.tree, k);
  const MW = 40, MH = 26, REVIVE = 4, SMITE_CD = 0.6;
  const SKILLS = {
    heal: { n: '치유의 빛', t: 'fx_holy', cd: 30, need: 'sk_heal' },
    rage: { n: '전투 함성', t: 'r_dragon', cd: 40, need: 'sk_rage' },
    meteor: { n: '유성 낙하', t: 'fx_fire', cd: 25, need: 'sk_meteor' },
  };

  const F = {
    SKILLS,
    init(head = 0) {
      return {
        floor: 1, maxFloor: 1, gold: 5 * Math.pow(10, head), tree: G.Tree.init('fantasy'),
        ing: { meat: 0, herb: 0, jelly: 0, bone: 0, scale: 0 }, buffs: {}, deaths: 0, auto: true, kills: 0, cds: {},
      };
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
      if (f.buffs.atk) m *= 1.5;
      if (f.buffs.fury) m *= 3;
      if (f.buffs.rage) m *= 2;
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

    // ── 층 만들기 ──
    boot(f) {
      const rt = { fx: [], ents: [], mons: [], party: [], allies: [], phase: 'explore', reviveT: 0, smiteCd: 0, focus: null };
      F.newFloor(f, rt);
      return rt;
    },
    newFloor(f, rt) {
      const fl = f.floor, boss = F.isBoss(fl), m = GR.dungeon(MW, MH);
      rt.map = m;
      rt.mons = [];
      const st = m.start;
      const hero = rt.hero || { kind: 'hero', t: 'knight', s: 1.15, bar: true };
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
        const a = keep[id] || { kind: 'ally', id, def, t: def.t, s: 0.95, bar: true };
        Object.assign(a, { x: st.cx + (i % 3) - 1, y: st.cy + (i > 2 ? 1 : 0), atkT: Math.random(), dead: false, reviveT: 0 });
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
        F.spawnMon(rt, fl, Object.assign({ drop: 'scale' }, d), m.end.cx - 1, m.end.cy, true);
      }
      rt.phase = 'explore';
      rt.focus = null;
      rt.ents = [...rt.party, ...rt.mons];
      G.emit('f_floor', fl);
    },
    spawnMon(rt, fl, d, x, y, boss) {
      const hp = F.monHP(fl, boss);
      rt.mons.push({
        kind: 'mon', n: d.n, t: d.t, x, y, s: boss ? 1.7 : 1, hp, max: hp, atk: F.monAtk(fl, boss), gold: F.monGold(fl, boss),
        drop: d.drop, boss, aggro: false, atkT: Math.random(), bar: true, label: boss ? d.n : null,
      });
    },
    // 동료 목록이 트리 구매로 바뀌면 다음 층부터 반영된다. 지금 층에도 바로 합류시킨다.
    syncAllies(f) {
      const rt = F.rt(f), have = new Set(rt.allies.map(a => a.id));
      Object.keys(D.allies).forEach(id => {
        if (have.has(id) || !ta('ally_' + id)) return;
        const def = D.allies[id], h = rt.hero;
        const a = { kind: 'ally', id, def, t: def.t, s: 0.95, bar: true, x: h.x, y: h.y, atkT: 0, dead: false, reviveT: 0 };
        a.max = a.hp = F.heroHP(f) * def.hp * tm('allyHp');
        rt.allies.push(a);
        rt.party.push(a);
        rt.ents = [...rt.party, ...rt.mons];
        G.fx(rt, { k: 'tile', key: 'fx_holy', x: h.x, y: h.y, t: 0.8 });
      });
    },

    // ── 전투 ──
    hurt(f, rt, m, dmg, src) {
      if (m.hp <= 0) return;
      m.hp -= dmg;
      m.aggro = true;
      // 숫자 크기로 위계: 치명타·벼락은 크게 튀고, 보통 타격은 체력 대비 피해만큼 커진다
      const big = src !== 'hit';
      G.fx(rt, { k: 'text', x: m.x, y: m.y - 0.6, s: U.fmt(dmg) + (src === 'crit' ? '!' : ''), col: src === 'crit' ? '#ffd24a' : src === 'smite' ? '#bfe8ff' : '#fff', t: 0.8, sz: (big ? 1.3 : 0.85) + 0.5 * Math.min(1, dmg / m.max), pop: big });
      G.J.hit('fantasy', m, src === 'smite' ? 0.5 : src === 'crit' ? 0.25 : 0);
      if (src === 'crit') G.J.sfx('fantasy', 'crit');
      if (m.hp <= 0) F.kill(f, rt, m);
    },
    kill(f, rt, m) {
      const g = m.gold * F.goldMult(f);
      F.gain(f, g);
      f.kills++;
      G.fx(rt, { k: 'text', x: m.x, y: m.y - 1, s: '+' + U.fmt(g), col: '#ffd24a', t: 1.1 });
      G.J.sfx('fantasy', 'coin');
      if (m.boss) {
        G.J.finish('fantasy', m.x, m.y);
        G.J.sfx('fantasy', 'finish');
        f.ing.scale++;
        for (let i = 0; i < 2; i++) f.ing[U.pick(['meat', 'herb', 'jelly', 'bone'])]++;
        if (f.floor % 10 === 0) G.addSigns(1, 'fantasy');
        G.log(`${m.n} 토벌! (${f.floor}층)`, 'fantasy', 'good');
      } else if (U.chance(0.4)) f.ing[m.drop]++;
      rt.mons = rt.mons.filter(x => x !== m);
      if (rt.focus === m) rt.focus = null;
      rt.ents = [...rt.party, ...rt.mons];
    },
    nearestMon(rt, e, maxD = 1e9) {
      let best = null, bd = maxD;
      for (const m of rt.mons) { const d = GR.dist(e, m); if (d < bd) { bd = d; best = m; } }
      return best;
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
      for (const m of [...rt.mons]) if (Math.hypot(m.x - x, m.y - y) <= r) { last = m; F.hurt(f, rt, m, dmg, 'smite'); }
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
        for (const m of [...rt.mons]) if (Math.hypot(m.x - x, m.y - y) <= 2.5) F.hurt(f, rt, m, F.smiteDmg(f) * 20, 'smite');
      }
      return true;
    },

    canCook: (f, r) => Object.entries(r.need).every(([k, n]) => f.ing[k] >= n),
    cookUnlocked: r => ta('cook_' + r.id) > 0,

    tick(f, dt) {
      const rt = F.rt(f);
      G.fxTick(rt, dt);
      for (const k in f.buffs) if ((f.buffs[k] -= dt) <= 0) delete f.buffs[k];
      for (const k in f.cds) if ((f.cds[k] -= dt) <= 0) delete f.cds[k];
      if (rt.smiteCd > 0) rt.smiteCd -= dt;
      for (const r of D.recipes) {
        if (!F.cookUnlocked(r) || f.buffs[r.buff] || !F.canCook(f, r)) continue;
        for (const k in r.need) f.ing[k] -= r.need[k];
        f.buffs[r.buff] = r.dur * (1 + ta('cookDur'));
        G.emit('f_cook', r);
      }
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
          G.fx(rt, { k: 'text', x: tg.x, y: tg.y - 0.6, s: '-' + U.fmt(dmg), col: '#ff6b6b', t: 0.7 });
          G.J.hit('fantasy', tg);
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
      // 기사: 지정한 적 또는 가장 가까운 적. 적이 없으면 계단으로.
      hero.moving = false;
      const target = (rt.focus && rt.focus.hp > 0) ? rt.focus : F.nearestMon(rt, hero);
      if (target) {
        if (GR.dist(hero, target) > 1.2 + target.s * 0.2) GR.moveTo(m, hero, target.x, target.y, speed, dt, 1);
        else {
          hero.flip = target.x < hero.x;
          if ((hero.atkT -= dt * aspd) <= 0) {
            hero.atkT = 1;
            const c = U.chance(F.crit());
            G.fx(rt, { k: 'slash', x: target.x, y: target.y, t: 0.18 });
            if (!c) G.J.sfx('fantasy', 'tap');
            F.hurt(f, rt, target, F.heroAtk(f) * (c ? F.critD() : 1), c ? 'crit' : 'hit');
          }
        }
      } else if (GR.moveTo(m, hero, m.end.cx, m.end.cy, speed, dt, 0.2)) {
        F.descend(f, rt);
        return;
      }
      // 동료
      for (const a of rt.allies) {
        a.moving = false;
        if (a.dead) {
          if ((a.reviveT -= dt) <= 0) { a.dead = false; a.hp = a.max; a.x = hero.x; a.y = hero.y; }
          continue;
        }
        const def = a.def;
        if (def.heal) {
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
            else G.fx(rt, { k: 'slash', x: tg.x, y: tg.y, t: 0.18 });
            if (def.splash) { for (const mo of [...rt.mons]) if (GR.dist(mo, tg) <= def.splash) F.hurt(f, rt, mo, dmg, 'hit'); }
            else if (def.chain) {
              const hit = rt.mons.slice().sort((p, q) => GR.dist(p, tg) - GR.dist(q, tg)).slice(0, def.chain);
              for (const mo of hit) F.hurt(f, rt, mo, dmg, 'hit');
            } else F.hurt(f, rt, tg, dmg, 'hit');
          }
        } else if (GR.dist(a, hero) > 1.8) GR.moveTo(m, a, hero.x, hero.y, speed * 1.1, dt, 1.4);
      }
    },
    view(f) {
      const rt = F.rt(f), b = F.band(f.floor), m = rt.map;
      if (m._band !== b) { m._band = b; m.ver++; }
      return {
        map: m, ents: rt.ents, fx: rt.fx, cam: rt.hero, viewH: 13, dimAll: rt.phase === 'dead',
        terrain(x, y) {
          const c = m.c[y * m.w + x];
          if (c === '#') {
            for (const [dx, dy] of GR.DIR) if ('.>'.includes(GR.at(m, x + dx, y + dy))) return ['f_wall' + b];
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
