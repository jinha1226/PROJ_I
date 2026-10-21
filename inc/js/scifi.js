'use strict';
// SF · 최후의 방어선 (경로형 타워디펜스 — The Tower, Sir We Have an Orc Problem 계열)
// 적은 출현 지점(S, 여럿이면 번갈아)에서 금속 통로(=)를 따라 코어(C)로 간다. 갈림길·합류는 코어까지 남은 거리(흐름장)를 따른다.
// 포대 자리(O)에 포탑을 짓는다. 10웨이브(모선)마다 다음 구역으로 넘어가 맵이 바뀌고, 포탑은 비싼 것부터 좋은 자리로 다시 놓인다.
// 포탑 종류와 위력은 스킬트리로 연다. 맵 빈 곳 클릭 = 궤도 폭격. 코어가 무너지면 3웨이브 물러난다.
G.RT = G.RT || {};
G.Scifi = (() => {
  const D = G.D.S, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('scifi', G.S.w.scifi.tree, k);
  const ta = k => G.Tree.add('scifi', G.S.w.scifi.tree, k);
  // TEMPO: 전투 시간 배속 (적·포탑·투사체가 함께 빨라진다 — 난이도는 그대로, 웨이브 하나 20~30초)
  const PAUSE = 1.5, BASE_PADS = 4, SECTOR_WAVES = 10, LANE = '=SC', TEMPO = +(G.SF_TEMPO || 1.7);
  const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // 통로만 따라 코어까지 남은 칸 수 (4방향 BFS, 통로 밖은 -1)
  const flow = (map, [cx, cy]) => {
    const d = new Int16Array(map.w * map.h).fill(-1), q = [cx + cy * map.w];
    d[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], x = i % map.w, y = (i / map.w) | 0;
      for (const [dx, dy] of DIR4) {
        const nx = x + dx, ny = y + dy;
        if (!LANE.includes(GR.at(map, nx, ny)) || d[nx + ny * map.w] >= 0) continue;
        d[nx + ny * map.w] = d[i] + 1;
        q.push(nx + ny * map.w);
      }
    }
    return d;
  };

  const S = {
    init(head = 0) {
      // 펄스 레이저는 처음부터 지을 수 있다 (트리의 레이저 노드를 배운 채로 시작)
      return { wave: 1, maxWave: 1, credits: 30 * Math.pow(10, head), core: 100, towers: {}, tree: Object.assign(G.Tree.init('scifi'), { laser: 1 }), auto: true };
    },
    rt(s) { return G.RT.scifi || (G.RT.scifi = S.boot(s)); },
    boot(s) {
      const rt = { fx: [], en: [], queue: [], spawnT: 0, spawnI: 0, state: 'pause', pauseT: PAUSE, cds: {}, strikeCd: 0, frame: 0, fields: [], sk: {}, boost: {}, idle: {}, heat: {}, rebuilt: false };
      S.loadSector(s, rt, S.sectorOf(s.wave));
      return rt;
    },
    // ── 구역 ──
    sectorOf: w => Math.floor((w - 1) / SECTOR_WAVES),
    // 한 바퀴 돌 때마다 좌우(1)·상하(2)로 뒤집는다
    sectorRows(k) {
      const n = D.sectors.length, flip = Math.floor(k / n) % 4;
      let rows = D.sectors[k % n].map;
      if (flip & 1) rows = rows.map(r => [...r].reverse().join(''));
      if (flip & 2) rows = rows.slice().reverse();
      return rows;
    },
    sectorName(k) {
      const n = D.sectors.length, r = Math.floor(k / n);
      return D.sectors[k % n].n + (r ? ` ${r + 1}차` : '');
    },
    loadSector(s, rt, k) {
      const map = GR.fromAscii(S.sectorRows(k), D.pass), dist = flow(map, map.poi.C[0]);
      const path = [];
      for (let i = 0; i < dist.length; i++) if (dist[i] >= 0) path.push([i % map.w, (i / map.w) | 0]);
      // 포대 자리: 사거리 3 안에 통로가 많은 자리부터 쓴다
      const cover = ([px, py]) => path.filter(([x, y]) => Math.hypot(x - px, y - py) <= 3).length;
      const pads = (map.poi.O || []).slice().sort((a, b) => cover(b) - cover(a));
      Object.assign(rt, { map, dist, path, pads, spawns: map.poi.S, sector: k, cds: {}, sk: {}, boost: {}, idle: {}, heat: {}, fields: [] });
      // 예전 저장(구역 없음)은 첫 구역에 지은 것으로 본다
      if ((s.mapKey ?? 0) !== k) S.redeploy(s);
      s.mapKey = k;
    },
    // 새 맵: 가진 포탑을 비싼 것부터 좋은 자리(앞 번호)에 다시 놓는다
    redeploy(s) {
      const list = Object.values(s.towers).sort((a, b) => D.turrets[b].cost - D.turrets[a].cost);
      s.towers = {};
      list.forEach((t, i) => { s.towers[i] = t; });
    },
    // 웨이브가 바뀐 뒤(클리어·후퇴) 구역이 달라졌으면 맵을 바꾼다
    checkSector(s, rt) {
      const k = S.sectorOf(s.wave);
      if (k === rt.sector) return;
      const fwd = k > rt.sector;
      S.loadSector(s, rt, k);
      G.log(`${fwd ? '새 구역' : '구역 후퇴'}: ${S.sectorName(k)}`, 'scifi', fwd ? 'good' : 'bad');
      if (fwd) G.emit('sf_sector', { k });
    },
    padCount: () => BASE_PADS + ta('pads'),
    unlocked: t => !D.turrets[t].unlock || ta(D.turrets[t].unlock) > 0,
    built: (s, t) => Object.values(s.towers).filter(x => x === t).length,
    buildCost: (s, t) => D.turrets[t].cost * Math.pow(1.5, S.built(s, t)),
    coreMax: () => 100 * tm('core') * (1 + G.relicVal('s_core')),
    dmgMult() {
      let m = G.globalMult() * (1 + G.relicVal('s_dmg')) * tm('allDmg');
      if (G.synergy('syn_magitech')) m *= 1 + 0.03 * (G.S.w.fantasy.maxFloor - 1);
      return m;
    },
    creditMult() {
      let m = G.globalMult() * (1 + G.relicVal('s_credit')) * tm('credit');
      if (G.synergy('syn_void')) m *= 1 + Math.min(2, 0.02 * G.S.signs);
      return m;
    },
    turretDmg: t => D.turrets[t].dmg * S.dmgMult(),
    rate: t => D.turrets[t].rate * tm('rate'),
    // 포탑 i 둘레의 증폭기 (UNITS.md 증폭기 = 음유시인): 연사 +25% · 공명 피해 +20% · 과충전 중 연사 ×2
    amps(s, rt, i) {
      const [px, py] = rt.pads[i], r = D.turrets.amp.range + (ta('am_wide') ? 1.5 : 0), out = [];
      for (const [j, t] of Object.entries(s.towers)) if (t === 'amp' && +j !== i && +j < S.padCount()) { const [ax, ay] = rt.pads[j]; if (Math.hypot(ax - px, ay - py) <= r) out.push(+j); }
      return out;
    },
    towerRate(s, rt, i, t) {
      const am = S.amps(s, rt, i);
      let r = S.rate(t) * (1 + 0.25 * am.length);
      if (am.some(j => rt.boost[j] > 0)) r *= 2;
      if (t === 'laser' && rt.boost[i] > 0) r *= 2;
      if (t === 'rail' && ta('r_rapid')) r *= 2;
      return r;
    },
    towerDmg(s, rt, i, t) {
      let d = S.turretDmg(t) * (1 + (ta('am_res') ? 0.2 : 0) * S.amps(s, rt, i).length);
      if (t === 'rail' && ta('r_rapid')) d *= 0.6;
      if (t === 'laser' && ta('l_focus')) d *= 2;
      if (t === 'drone' && ta('d_combat')) d *= 4;
      return d;
    },
    hpScale: w => 6 * Math.pow(1.14, w - 1),
    bounty: w => 1.5 * Math.pow(1.12, w - 1),
    clearBonus: w => 4 * Math.pow(1.12, w),
    waveEss: w => 0.3 * Math.pow(w / 3, 1.4),
    strikeDmg: s => 15 * Math.pow(1.14, s.wave - 1) * tm('strike') * G.globalMult(),
    strikeCdMax: () => 4 * Math.max(0.3, 1 - ta('strikeCd')),
    gain(s, n) { s.credits += n; G.tally('scifi', n); },

    genWave(w) {
      const q = [], n = Math.min(8 + Math.floor(w * 0.7), 40);
      for (let i = 0; i < n; i++) {
        const t = U.wpick(['drone', 'walker', 'swarm', 'shield'], k =>
          k === 'drone' ? 1 : k === 'walker' ? (w >= 4 ? 0.45 : 0) : k === 'swarm' ? (w >= 7 ? 0.35 : 0) : (w >= 15 ? 0.2 : 0));
        if (t === 'swarm') q.push('swarm', 'swarm', 'swarm'); else q.push(t);
      }
      if (w % 10 === 0) q.push('boss');
      return q;
    },
    startWave(s) {
      const rt = S.rt(s);
      if (rt.state === 'wave') return;
      rt.state = 'wave';
      rt.queue = S.genWave(s.wave);
      G.J.sfx('scifi', 'wave');
      rt.spawnT = 0;
    },
    // 코어 쪽 다음 칸. 갈림길에서 남은 거리가 같으면 아무 쪽으로나
    next(rt, e) {
      const m = rt.map, here = rt.dist[e.tx + e.ty * m.w];
      const opts = DIR4.map(([dx, dy]) => [e.tx + dx, e.ty + dy]).filter(([x, y]) => GR.at(m, x, y) !== ' ' && rt.dist[x + y * m.w] === here - 1);
      if (opts.length) [e.tx, e.ty] = U.pick(opts);
    },
    // len칸만큼 통로를 따라 걷는다. 코어에 닿으면 true
    walk(rt, e, len) {
      const w = rt.map.w;
      while (len > 0) {
        if (e.x === e.tx && e.y === e.ty) {
          if (rt.dist[e.tx + e.ty * w] <= 0) return true;
          S.next(rt, e);
          if (e.x === e.tx && e.y === e.ty) break;
        }
        const dx = e.tx - e.x, dy = e.ty - e.y, l = Math.hypot(dx, dy);
        if (Math.abs(dx) > 0.001) e.flip = dx < 0;
        if (l <= len) { e.x = e.tx; e.y = e.ty; len -= l; } else { e.x += dx / l * len; e.y += dy / l * len; len = 0; }
      }
      e.rem = rt.dist[e.tx + e.ty * w] + Math.hypot(e.tx - e.x, e.ty - e.y);
      return false;
    },
    spawn(s, rt, type) {
      const T = D.enemies[type], hp = T.hp * S.hpScale(s.wave);
      const [x, y] = rt.spawns[rt.spawnI++ % rt.spawns.length];
      const e = { kind: 'mon', type, t: 'e_' + type, s: T.s, hp, max: hp, x, y, tx: x, ty: y, rem: rt.dist[x + y * rt.map.w], spd: T.spd * Math.min(1.6, 1 + s.wave * 0.004), slow: 0, chill: 0, shock: 0, freeze: 0, bounty: T.bounty * S.bounty(s.wave), dmg: T.dmg, bar: true };
      rt.en.push(e);
    },
    // power > 0: 궤도 폭격처럼 직접 때린 것 (히트스톱)
    hit(s, rt, e, dmg, power = 0, cash = 1) {
      if (e.hp <= 0) return;
      if (e.shock > 0) dmg *= 1.2;
      if (ta('c_brittle') && e.slow > 0) dmg *= 1.5;
      e.hp -= dmg;
      G.J.hit('scifi', e, power);
      if (e.hp <= 0) {
        const g = e.bounty * S.creditMult() * cash;
        S.gain(s, g);
        G.fx(rt, { k: 'text', x: e.x, y: e.y - 0.7, s: '+' + U.fmt(g), col: '#7ff0ff', t: 0.9, sz: e.type === 'boss' ? 1.6 : 1, pop: e.type === 'boss' });
        G.J.sfx('scifi', 'pop');
        if (e.type === 'boss') { G.J.finish('scifi', e.x, e.y); G.J.sfx('scifi', 'finish'); }
      }
    },
    range: t => D.turrets[t].range + (t === 'cryo' && ta('c_zone') ? 1 : 0),
    inRange(rt, i, t) { const [px, py] = rt.pads[i], r = S.range(t); return rt.en.filter(e => e.hp > 0 && Math.hypot(e.x - px, e.y - py) <= r); },
    fire(s, rt, i, t) {
      const T = D.turrets[t], [px, py] = rt.pads[i];
      if (T.support) return false;
      const near = S.inRange(rt, i, t);
      // 미사일은 체력이 가장 낮은 적부터, 나머지는 코어에 가장 가까운 적부터
      const tg = T.seek ? near.sort((a, b) => a.hp - b.hp) : near.sort((a, b) => a.rem - b.rem);
      if (!tg.length) return false;
      let dmg = S.towerDmg(s, rt, i, t);
      const from = { x: px, y: py }, cash = ta('am_cash') && S.amps(s, rt, i).length ? 1.5 : 1;
      // 레일건 충전: 3초 넘게 쉬었으면 ×3
      if (t === 'rail' && ta('r_charge') && rt.idle[i] >= 3) dmg *= 3;
      rt.idle[i] = 0;
      G.J.sfx('scifi', 'zap');
      if (T.pierce) {
        for (const e of tg.slice(0, T.pierce)) S.hit(s, rt, e, dmg, 0, cash);
        G.fx(rt, { k: 'beam', x: px, y: py, x2: tg[0].x, y2: tg[0].y, col: T.col, w: 3, t: 0.25 });
        if (ta('r_orbit')) S.blast(s, rt, tg[0].x, tg[0].y, 1.2, S.strikeDmg(s) * 0.5);
      } else if (T.splash) {
        const c = tg[0], r = T.splash * (ta('m_big') ? 2 : 1);
        for (const e of rt.en) if (Math.hypot(e.x - c.x, e.y - c.y) <= r) S.hit(s, rt, e, dmg, 0, cash);
        G.fx(rt, { k: 'proj', key: 'fx_dart', x: px, y: py, x2: c.x, y2: c.y, t: 0.3 });
        G.fx(rt, { k: 'ring', x: c.x, y: c.y, r, t: 0.4, col: T.col });
        if (ta('m_fire')) rt.fields.push({ x: c.x, y: c.y, r, t: 3, dps: dmg * 0.3 });
        if (ta('m_cluster')) for (let k = 0; k < 4; k++) S.blast(s, rt, c.x + Math.cos(k * 1.57) * r, c.y + Math.sin(k * 1.57) * r, 0.7, dmg * 0.5);
      } else if (T.slow) {
        for (const e of tg) {
          S.hit(s, rt, e, dmg, 0, cash); e.slow = 1.5;
          if (ta('c_freeze') && ++e.chill >= 3) { e.chill = 0; e.freeze = 1; }
        }
        G.fx(rt, { k: 'ring', x: px, y: py, r: S.range(t), t: 0.3, col: T.col });
      } else if (T.chain) {
        let d = dmg;
        const pts = [from];
        for (const e of tg.slice(0, T.chain + (ta('t_more') ? 5 : 0))) { S.hit(s, rt, e, d, 0, cash); if (ta('t_shock')) e.shock = 4; d *= 0.85; pts.push(e); }
        G.fx(rt, { k: 'chain', pts: pts.map(p => [p.x, p.y]), col: T.col, t: 0.2 });
      } else if (T.seek) {
        S.missile(s, rt, from, tg[0], dmg);
      } else if (t === 'laser') {
        // 가열: 같은 적을 계속 쏘면 +10%씩 / 분광: 세 갈래
        const h = rt.heat[i] || (rt.heat[i] = { e: null, n: 0 });
        if (h.e === tg[0]) h.n = Math.min(10, h.n + 1); else { h.e = tg[0]; h.n = 0; }
        const hm = ta('l_heat') ? 1 + 0.1 * h.n : 1;
        for (const e of tg.slice(0, ta('l_split') ? 3 : 1)) { S.hit(s, rt, e, dmg * hm, 0, cash); G.fx(rt, { k: 'beam', x: px, y: py, x2: e.x, y2: e.y, col: T.col, w: 1.5 + h.n * 0.15, t: 0.12 }); }
      } else {
        S.hit(s, rt, tg[0], dmg, 0, cash);
        G.fx(rt, { k: 'beam', x: px, y: py, x2: tg[0].x, y2: tg[0].y, col: T.col, w: 1.5, t: 0.12 });
      }
      return true;
    },
    // 범위 폭발 (궤도 표적·집속탄)
    blast(s, rt, x, y, r, dmg) {
      G.fx(rt, { k: 'ring', x, y, r, t: 0.3, col: '#ff9a3a' });
      for (const e of rt.en) if (Math.hypot(e.x - x, e.y - y) <= r) S.hit(s, rt, e, dmg);
    },
    // 미사일 한 발: 처형 탄두(25% 이하 즉사) · 분열 탄두(처치하면 곁에 50%) · 현상금(크레딧 ×2)
    missile(s, rt, from, e, dmg) {
      G.fx(rt, { k: 'proj', key: 'fx_dart', x: from.x, y: from.y, x2: e.x, y2: e.y, t: 0.35 });
      if (ta('mi_exec') && e.hp < e.max * 0.25) dmg = e.hp + 1;
      S.hit(s, rt, e, dmg, 0, ta('mi_bounty') ? 2 : 1);
      if (e.hp <= 0 && ta('mi_split')) for (const o of rt.en) if (o !== e && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) <= 1.5) S.hit(s, rt, o, dmg * 0.5);
    },
    // 포탑 기술 1 (저절로): 사거리 안에 적이 있을 때
    skill(s, rt, i, t, dt) {
      const KEY = { laser: 'l_over', amp: 'am_surge', rail: 'r_snipe', cryo: 'c_burst', mortar: 'm_salvo', drone: 'd_nano', tesla: 't_burst', missile: 'mi_volley' }, k = KEY[t];
      if (rt.boost[i] > 0) rt.boost[i] -= dt;
      if (!k || !ta(k)) return;
      const CD = { laser: 20, amp: 20, rail: 15, cryo: 15, mortar: 15, drone: 20, tesla: 15, missile: 20 };
      if ((rt.sk[i] = (rt.sk[i] == null ? 6 : rt.sk[i]) - dt) > 0) return;
      const near = S.inRange(rt, i, t), [px, py] = rt.pads[i];
      if (t !== 'drone' && t !== 'amp' && !near.length) return;
      if (t === 'drone' && s.core >= S.coreMax() * 0.9) return;
      if (t === 'amp' && !rt.en.length) return;
      rt.sk[i] = CD[t];
      const dmg = S.towerDmg(s, rt, i, t);
      G.fx(rt, { k: 'ring', x: px, y: py, r: 1.3, t: 0.5, col: D.turrets[t].col });
      if (t === 'laser') rt.boost[i] = 5;
      else if (t === 'amp') rt.boost[i] = 8;
      else if (t === 'rail') { const e = near.sort((a, b) => b.hp - a.hp)[0]; G.fx(rt, { k: 'beam', x: px, y: py, x2: e.x, y2: e.y, col: '#fff3b0', w: 4, t: 0.3 }); S.hit(s, rt, e, dmg * 5, 0.3); }
      else if (t === 'cryo') for (const e of near) e.freeze = 2;
      else if (t === 'mortar') for (let n = 0; n < 3; n++) S.fire(s, rt, i, t);
      else if (t === 'drone') { s.core = Math.min(S.coreMax(), s.core + S.coreMax() * 0.15); G.fx(rt, { k: 'ring', x: rt.map.poi.C[0][0], y: rt.map.poi.C[0][1], r: 1.6, t: 0.6, col: '#9fe79f' }); }
      else if (t === 'tesla') { for (const e of near) { S.hit(s, rt, e, dmg * 2); if (ta('t_emp')) e.freeze = 1; } G.fx(rt, { k: 'ring', x: px, y: py, r: S.range(t), t: 0.4, col: '#c7a6ff' }); }
      else if (t === 'missile') for (const e of near.sort((a, b) => a.hp - b.hp).slice(0, 6)) S.missile(s, rt, { x: px, y: py }, e, dmg);
      G.J.sfx('scifi', 'boom');
    },
    build(s, i, t) {
      if (i >= S.padCount() || s.towers[i] || !S.unlocked(t)) return false;
      const c = S.buildCost(s, t);
      if (s.credits < c) return false;
      s.credits -= c;
      s.towers[i] = t;
      const [px, py] = S.rt(s).pads[i];
      G.fx(S.rt(s), { k: 'ring', x: px, y: py, r: 1.2, t: 0.5, col: '#3ef0ff' });
      G.J.sfx('scifi', 'build');
      return true;
    },
    scrap(s, i) { delete s.towers[i]; },
    // 포탑 옮기기 (무료). 옮길 자리에 포탑이 있으면 서로 바꾼다
    move(s, from, to) {
      if (from === to || !s.towers[from] || to >= S.padCount()) return false;
      [s.towers[from], s.towers[to]] = [s.towers[to], s.towers[from]];
      if (!s.towers[from]) delete s.towers[from];
      const rt = S.rt(s), [px, py] = rt.pads[to];
      rt.cds[from] = rt.cds[to] = 0;
      G.fx(rt, { k: 'ring', x: px, y: py, r: 1.2, t: 0.5, col: '#3ef0ff' });
      G.J.sfx('scifi', 'build');
      return true;
    },
    padAt(s, x, y) {
      const rt = S.rt(s);
      return rt.pads.findIndex(([px, py]) => Math.abs(px - x) < 0.6 && Math.abs(py - y) < 0.6);
    },
    // 빈 곳 클릭 = 궤도 폭격
    strike(s, x, y) {
      const rt = S.rt(s);
      if (rt.strikeCd > 0) { G.J.sfx('scifi', 'error'); return false; }
      rt.strikeCd = S.strikeCdMax();
      const dmg = S.strikeDmg(s);
      G.fx(rt, { k: 'bolt', x, y, t: 0.4, col: '#ff9a3a' });
      G.fx(rt, { k: 'ring', x, y, r: 1.5, t: 0.4, col: '#ff9a3a' });
      G.J.sfx('scifi', 'boom');
      G.J.shake('scifi', 7, 0, 1, 0.3);
      for (const e of rt.en) if (Math.hypot(e.x - x, e.y - y) <= 1.5) {
        G.fx(rt, { k: 'text', x: e.x, y: e.y - 0.5, s: U.fmt(dmg), col: '#ffb36b', t: 0.7, sz: 1.3, pop: true });
        S.hit(s, rt, e, dmg, 0.4);
      }
      return true;
    },
    clearWave(s, rt) {
      const w = s.wave;
      S.gain(s, S.clearBonus(w) * S.creditMult());
      G.addEss(S.waveEss(w), 'scifi');
      G.J.sfx('scifi', 'chime');
      if (w % 10 === 0) { G.addSigns(1, 'scifi'); G.log(`WAVE ${w} 모선 격추!`, 'scifi', 'good'); }
      s.wave++;
      rt.rebuilt = false;
      if (s.wave > s.maxWave) s.maxWave = s.wave;
      rt.state = 'pause';
      rt.pauseT = PAUSE;
      s.core = Math.min(S.coreMax(), s.core + S.coreMax() * 0.25);
      S.checkSector(s, rt);
    },
    failWave(s, rt) {
      G.log(`WAVE ${s.wave} 방어 실패 — 코어 재가동, 3웨이브 후퇴`, 'scifi', 'bad');
      G.J.sfx('scifi', 'lose');
      G.J.shake('scifi', 10, 0, 0, 0.5);
      s.wave = Math.max(1, s.wave - 3);
      rt.en = [];
      rt.queue = [];
      s.core = S.coreMax();
      rt.state = 'pause';
      rt.pauseT = PAUSE * 2;
      S.checkSector(s, rt);
    },

    tick(s, dt) {
      const rt = S.rt(s);
      G.fxTick(rt, dt);
      // 궤도 폭격 재사용은 실제 시간 (누르는 손은 빨라지지 않는다)
      if (rt.strikeCd > 0) rt.strikeCd -= dt;
      dt *= TEMPO;
      rt.frame += dt;
      const cm = S.coreMax();
      s.core = Math.min(cm, s.core + cm * ta('coreRegen') * dt);
      if (rt.state === 'pause') {
        if (s.auto && (rt.pauseT -= dt) <= 0) S.startWave(s);
        return;
      }
      if (rt.queue.length && (rt.spawnT -= dt) <= 0) {
        S.spawn(s, rt, rt.queue.shift());
        rt.spawnT = s.wave < 20 ? 0.45 : 0.3;
      }
      for (const e of rt.en) {
        if (e.shock > 0) e.shock -= dt;
        if (e.freeze > 0) { e.freeze -= dt; e.moving = false; continue; }
        const v = e.spd * (e.slow > 0 ? 1 - D.turrets.cryo.slow - ta('slow') : 1);
        if (e.slow > 0) e.slow -= dt;
        e.moving = true;
        if (S.walk(rt, e, v * dt) && e.hp > 0) {
          const dr = Object.values(s.towers).includes('drone');
          s.core -= e.dmg * (dr && ta('d_shield') ? 0.85 : 1);
          // 재건: 웨이브마다 한 번 50%로 버틴다
          if (s.core <= 0 && dr && ta('d_rebuild') && !rt.rebuilt) { rt.rebuilt = true; s.core = S.coreMax() * 0.5; G.fx(rt, { k: 'text', x: e.x, y: e.y - 1, s: '재건', col: '#9fe79f', t: 1.3, sz: 1.3, pop: true }); }
          e.hp = 0;
          e.leak = true;
          G.fx(rt, { k: 'ring', x: e.x, y: e.y, r: 1, t: 0.4, col: '#ff5a6e' });
          G.J.sfx('scifi', 'hurt');
          G.J.shake('scifi', 4, 1, 0, 0.2);
        }
      }
      for (const [i, t] of Object.entries(s.towers)) {
        if (+i >= S.padCount()) continue;
        if (t === 'drone') s.core = Math.min(S.coreMax(), s.core + S.coreMax() * D.turrets.drone.repair * dt);
        S.skill(s, rt, +i, t, dt);
        if (D.turrets[t].support) continue;
        rt.idle[i] = (rt.idle[i] || 0) + dt;
        rt.cds[i] = (rt.cds[i] || 0) - dt;
        while (rt.cds[i] <= 0) {
          if (!S.fire(s, rt, +i, t)) { rt.cds[i] = 0; break; }
          rt.cds[i] += 1 / S.towerRate(s, rt, +i, t);
        }
      }
      // 박격포 불길
      for (const fd of rt.fields) { fd.t -= dt; for (const e of rt.en) if (e.hp > 0 && Math.hypot(e.x - fd.x, e.y - fd.y) <= fd.r) S.hit(s, rt, e, fd.dps * dt); }
      rt.fields = rt.fields.filter(fd => fd.t > 0);
      rt.en = rt.en.filter(e => e.hp > 0);
      if (s.core <= 0) return S.failWave(s, rt);
      if (!rt.queue.length && !rt.en.length) S.clearWave(s, rt);
    },
    view(s) {
      const rt = S.rt(s), ents = [];
      const [cx, cy] = rt.map.poi.C[0];
      ents.push({ t: { k: 's_core', v: Math.floor(rt.frame * 7) }, x: cx, y: cy, s: 1.6, glow: s.core / S.coreMax() > 0.3 ? '#3ef0ff' : '#ff5a6e' });
      rt.pads.forEach(([px, py], i) => {
        const t = s.towers[i];
        if (i >= S.padCount()) ents.push({ t: 'ui_lock', x: px, y: py, s: 0.6, alpha: 0.5 });
        else if (t) ents.push({ t: { k: D.turrets[t].t, v: Math.floor(rt.frame * 6) }, x: px, y: py, s: 1.05 });
        else ents.push({ x: px, y: py, s: 1, pad: true });
        if (i === s.selPad) ents.push({ x: px, y: py, s: 1.15, pad: true, sel: true });
      });
      ents.push(...rt.en);
      // 구역 테마: 바닥·통로·벽 타일을 장소마다 바꾼다 (0번은 기본 타일 그대로)
      const th = D.sectors[rt.sector % D.sectors.length].th || 0, swap = { s_ground: 's_g' + th, s_path: 's_p' + th, s_wall: 's_w' + th };
      return { map: rt.map, ents, fx: rt.fx, fit: true, terrain: (x, y) => { const t = D.tiles[GR.at(rt.map, x, y)]; return t ? (th ? t.map(k => swap[k] || k) : t) : null; } };
    },
    status: s => `WAVE ${s.wave}`,
  };
  return S;
})();
