'use strict';
// 판타지 · 끝없는 던전 (2D 던전 맵, 자동 전투)
// 층마다 방과 복도로 된 던전이 새로 생긴다. 원정대(기사 + 출전 동료)가 몬스터를 찾아가 싸우고, 모두 잡으면 계단으로 내려간다.
// 4층부터 2층마다 계단 앞에 보스 (층이 넓어 한 층이 예전 2.5층 — F.depth). 파티원은 각자 체력이 있고 쓰러지면 잠시 뒤 일어난다. 전원이 쓰러지면 패배(같은 층 다시, 세 번이면 한 층 후퇴).
// 6층부터 던전 오염이 파티 전원의 체력을 최대치의 %씩 계속 깎는다(깊을수록 짙다). 재생·치유·정화로 버틴다.
// 동료는 트리에서 열고, 출전 칸(기사 + 3명, 트리로 +)에 들어간 동료만 싸운다. 기본은 자동 편성.
// 맵 클릭 = 벼락 일격. 동료별 기술과 ★택1 짝 노드는 트리에서. 기사 주변 칸은 「본 칸」으로 남는다(안개·미니맵).
G.RT = G.RT || {};
G.Fantasy = (() => {
  const D = G.D.F, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('fantasy', G.S.w.fantasy.tree, k);
  const ta = k => G.Tree.add('fantasy', G.S.w.fantasy.tree, k);
  // 층은 넓고 길게 (DESIGN.md 30): 라이벌이 멀리서 다가오는 게 보이고, 마주침이 사건이 되게. 몬스터 수·층 정수는 그만큼 키운다
  // 넓어진 층 하나 = 예전 DEPTH_K층: 몬스터 세기·골드·정수·구간은 깊이(F.depth)를 따르고, 보스는 BOSS_EVERY층마다
  const MW = 64, MH = 40, ROOMS = 14, LOOPS = 3, MON_K = 2.5, DEPTH_K = 2.5, BOSS_EVERY = 2, FIRST_BOSS = 4, REVIVE = 4, ALLY_REVIVE = 8, SIGHT = 7, SONG_CD = 12, WARP_CD = 15, SNIPE_CD = 12, STOP_CD = 30, DASH_CD = 5, SKIP_T = 50;
  // 성격 (DESIGN.md 42): 겁쟁이 — 체력 기준 · 확률 · 물러서는 초 / 다혈질 — 확률 · 뛰어드는 초 · 첫 타 배율
  const COWARD_AT = 0.3, COWARD_P = 0.6, COWARD_T = 3, HOT_P = 0.2, HOT_T = 2, HOT_HIT = 1.5;
  // 구간별 오염: 초당 최대 체력의 몇 %
  const CORRUPT = [0, 0.01, 0.018, 0.026, 0.034, 0.042];
  // 기사 기술(need = 트리 노드) — 독의 단추. 용병 스킬은 사람마다 자동(js/skills.js, DESIGN.md 43)
  const SKILLS = {
    rage: { n: '전투 함성', t: 'r_dragon', cd: 40, need: 'sk_rage' },
    assault: { n: '총공세', t: 'u_god', cd: 90, need: 'sk_assault' },
  };
  // 상태이상 (DESIGN.md 43): 지속 피해 셋은 dots, 나머지는 몸의 타이머. 받아치는 것은 G.Combo
  const DOTS = ['poison', 'burn', 'bleed'], SHOCK = 0.6;
  // 자동 편성 우선순위: 치유가 있어야 오염을 버티므로 수도사 먼저, 길잡이(탐험), 그다음 강한 순
  const AUTO = ['cleric', 'scout', 'archmage', 'rogue', 'dragoon', 'paladin', 'mage', 'bard', 'archer'];

  const F = {
    SKILLS, CORRUPT, AUTO,
    init(head = 0) {
      return { floor: 1, maxFloor: 1, gold: 60 * Math.pow(10, head), tree: G.Tree.init('fantasy'), buffs: {}, deaths: 0, auto: true, kills: 0, cds: {}, autoParty: true, lineup: [], mercs: [], nextUid: 0,
        // 원정 (G.Exp): 마을에서 시작한다. 짐·체크포인트·출발층·귀환 방침·자동 출발
        town: true, carry: 0, checkpoint: 1, start: 1, retreat: 'hp30', autoGo: true };
    },
    rt(f) { return G.RT.fantasy || (G.RT.fantasy = F.boot(f)); },
    depth: fl => 1 + (fl - 1) * DEPTH_K,
    // 보스: FIRST_BOSS층부터 BOSS_EVERY층마다 (첫 원정이 둘만으로 보스 벽에 막히지 않게)
    isBoss: fl => fl >= FIRST_BOSS && fl % BOSS_EVERY === 0,
    band: fl => D.bands.findIndex(b => F.depth(fl) <= b.to),
    monHP: (fl, boss) => 10 * Math.pow(1.13, F.depth(fl) - 1) * (boss ? 8 : 1),
    monAtk: (fl, boss) => 1.6 * Math.pow(1.105, F.depth(fl) - 1) * (boss ? 2 : 1),
    monGold: (fl, boss) => 2 * Math.pow(1.14, F.depth(fl) - 1) * (boss ? 10 : 1),
    floorEss: fl => DEPTH_K * 0.25 * Math.pow(F.depth(fl), 1.3) * (F.isBoss(fl) ? 3 * (1 + ta('bossEss')) : 1) * tm('floorEss'),

    // ── 원정대 편성 (용병 한 사람 한 사람 — G.Guild) ──
    slots: () => 3 + ta('slot') + G.Season.fameAdd('fm_slot'),
    // 고용한 순서 (초상 줄 순서)
    recruits: f => f.mercs.map(m => m.uid),
    // 출전 명단(용병 uid): 자동이면 G.Guild.autoPick, 아니면 직접 고른 것 중 다치지 않은 사람
    lineup(f) {
      const n = F.slots();
      if (f.autoParty !== false) return G.Guild.autoPick(f, n);
      const ok = new Set(G.Guild.ready(f).map(m => m.uid));
      return (f.lineup || []).filter(u => ok.has(u)).slice(0, n);
    },
    // 자동 편성을 끄고 그 용병을 넣거나 뺀다
    toggleMember(f, uid) {
      const cur = F.lineup(f);
      f.autoParty = false;
      f.lineup = cur.includes(uid) ? cur.filter(x => x !== uid) : cur.length < F.slots() ? [...cur, uid] : cur;
      F.syncAllies(f);
    },
    setAuto(f, v) { f.autoParty = v; F.syncAllies(f); },
    // 지금 맵에 나와 있어야 할 용병: 평소엔 편성, 총공세 중엔 다치지 않은 전원
    members: f => (f.buffs.assault ? [...F.lineup(f), ...G.Guild.ready(f).map(m => m.uid).filter(u => !F.lineup(f).includes(u))] : F.lineup(f)),
    // 출전 중인 직업들 (동료 기술 단추)
    memberClasses: f => F.members(f).map(u => G.Guild.get(f, u)?.cls).filter(Boolean),
    inParty: (rt, id) => rt.allies.some(a => a.id === id && !a.dead),

    // 영구 배율은 출처끼리 더한다: 1 + Σ(출처 배수 − 1) (트리·차원 넥서스·유물). 버프는 따로 곱한다.
    sum: parts => 1 + parts.reduce((a, p) => a + p[1] - 1, 0),
    parts(k) {
      const dim = ['차원', G.globalMult()];
      const fame = ['명성', 1 + G.Season.fameAdd('fm_power')];
      if (k === 'atk') return [['트리', tm('atk')], dim, ['유물', 1 + G.relicVal('f_atk')], fame];
      if (k === 'hp') return [['트리', tm('hp')], dim, ['유물', 1 + G.relicVal('f_hp')], fame];
      if (k === 'gold') return [['트리', tm('gold')], dim, ['유물', 1 + G.relicVal('f_gold')], ['명성', 1 + G.Season.fameAdd('fm_gold')], ['용병', 1 + (G.RT.fantasy ? G.Guild.goldBonus(G.RT.fantasy) : 0)]];
      return [];
    },
    atkMult: () => F.sum(F.parts('atk')),
    // 버프(노래·함성·전쟁의 북·총공세): 걸려 있는 동안만 곱한다
    dmgMult(f) {
      let m = G.RT.fantasy && F.has(G.RT.fantasy, 'b_rally') ? 1.1 : 1;
      for (const k in f.buffs) {
        if (k === 'atk') m *= 1.5;
        else if (k === 'assault') m *= 1 + ta('k_rally');
        else if (D.buffs[k] && D.buffs[k].dmg) m *= D.buffs[k].dmg;
      }
      return m;
    },
    heroAtk: f => 5 * F.atkMult() * F.dmgMult(f),
    heroHP: f => 60 * F.sum(F.parts('hp')),
    allyAtk: (f, a) => F.heroAtk(f) * a.def.atk * 0.5 * tm('allyAtk') * (a.merc ? G.Guild.mult(a.merc, 'atk') : 1),
    allyHP: (f, a) => F.heroHP(f) * a.def.hp * tm('allyHp') * (a.merc ? G.Guild.mult(a.merc, 'hp') : 1),
    aspd: f => tm('aspd') * (f.buffs.haste ? 1.5 : 1) * (f.buffs.static ? 1.2 : 1),
    crit: () => Math.min(0.75, 0.05 + ta('crit')),
    critD: () => 2 + ta('critd'),
    armor: () => Math.min(0.75, ta('armor')),
    regen: f => 0.01 + ta('regen') + (f.buffs.regen ? 0.04 : 0),
    goldMult: f => F.sum(F.parts('gold')) * (f.buffs.gold ? 2 : 1),
    // 초반 층은 작게 (첫 층이 몇 분씩 걸리지 않게): 44×28 방 9 → 52×32 방 11 → 64×40 방 14, 몬스터 수도 방 수에 비례
    rooms: fl => (fl <= 1 ? 9 : fl === 2 ? 11 : ROOMS),
    dims: fl => (fl <= 1 ? [44, 28] : fl === 2 ? [52, 32] : [MW, MH]),
    // 시야 (정찰 노드)
    sight: () => SIGHT + ta('t_scout') + (G.RT.fantasy ? G.Season.sightBonus(G.RT.fantasy) : 0),
    // 오염: 초당 최대 체력의 비율 (정화 노드, 성역)
    corruption(f, rt) {
      const base = CORRUPT[F.band(f.floor)] || 0;
      const sanct = F.has(rt, 'c_sanct') ? 0.5 : 1;
      return base * Math.max(0.2, 1 - ta('purify')) * sanct;
    },
    // 원정 중에 번 골드는 짐으로 (귀환하면 금고로 — G.Exp)
    gain(f, n) { if (f.town) f.gold += n; else G.Exp.stow(f, n); G.tally('fantasy', n); },
    // 음유시인이 번갈아 부르는 노래
    songs: () => { const rt = G.RT.fantasy; return ['atk', 'gold'].concat(rt && F.has(rt, 'songWar') ? ['fury'] : [], rt && F.has(rt, 'songRegen') ? ['regen'] : []); },
    songDur: () => 8 * (1 + 0.5 * (G.RT.fantasy && F.has(G.RT.fantasy, 'b_encore') ? 1 : 0)),
    // 파티 합산: 체력·초당 피해 (화면 표시용)
    partyHP(rt) {
      let hp = 0, max = 0;
      for (const p of rt.party) { max += p.max || 0; if (!p.dead) hp += Math.max(0, p.hp); }
      return { hp, max };
    },
    partyDps(f, rt) {
      const sp = F.aspd(f);
      let d = F.heroAtk(f) * sp * (1 + F.crit() * (F.critD() - 1));
      for (const a of rt.allies) if (!a.def.heal) d += F.allyAtk(f, a) / F.allyCd(a) * sp * (a.def.splash || a.def.chain ? 1.6 : 1);
      return d;
    },
    allyCd(a) {
      let cd = a.def.cd * (a.merc ? G.Guild.mult(a.merc, 'cd') : 1);
      if (F.sk(a, 'm_quick')) cd *= 0.7;
      if (a.furyT > 0) cd *= 0.5;
      return cd;
    },

    // ── 층 만들기 ──
    boot(f) {
      const rt = { fx: [], ents: [], mons: [], party: [], allies: [], chests: [], rivals: [], phase: 'explore', reviveT: 0, killN: 0, warpT: WARP_CD, stopT: 6, focus: null, target: null, song: 0, floorT: 0, fields: [], volley: null, tstorm: null, traps: [] };
      F.newFloor(f, rt);
      // 마을에 있던 저장(처음 시작 포함): 층은 깔아 두되 비워 둔다
      if (f.town) { rt.phase = 'town'; rt.mons = []; rt.chests = []; rt.rivals = []; F.refreshEnts(rt); }
      return rt;
    },
    // 용병 uid → 맵 위 몸. id는 직업(기술·택1 노드가 직업으로 묶인다), uid·merc는 그 사람
    newAlly(f, uid, x, y) {
      const merc = G.Guild.get(f, uid), id = merc.cls, def = G.Guild.def(merc);
      const a = { kind: 'ally', id, uid, merc, def, t: G.Guild.tile(merc), wpn: def.wpn, s: 0.95, bar: true, x, y, atkT: Math.random(), dead: false, reviveT: 0, skT: 3, dashT: 0, shots: 0, snipeT: 4, cds: {}, gcd: 1 };
      a.max = a.hp = F.allyHP(f, a);
      return a;
    },
    newFloor(f, rt) {
      // 떠나는 층의 지도 지식을 남기고, 이 시즌의 같은 층은 같은 모양으로 (G.Season)
      G.Season.save(f, rt);
      const fl = f.floor, boss = F.isBoss(fl), rooms = F.rooms(fl), rng = G.Season.rng(f, fl), [mw, mh] = F.dims(fl), m = GR.dungeon(mw, mh, rooms, LOOPS, rng);
      rt.map = m;
      rt.mons = [];
      rt.chests = [];
      rt.seenVer = rt.seenVer || 0;
      G.Season.load(f, rt, fl);
      rt.floorT = 0;
      rt.fields = []; rt.volley = null; rt.tstorm = null; rt.traps = []; rt.pathShown = rt.chestShown = false; rt.hpHist = [];
      G.Guild.newFloor(f);
      const st = m.start;
      const hero = rt.hero || { kind: 'hero', t: 'knight', wpn: 'w_sword', s: 1.15, bar: true };
      Object.assign(hero, { x: st.cx, y: st.cy, max: F.heroHP(f), atkT: 0, dead: false, reviveT: 0 });
      hero.hp = hero.max;
      rt.hero = hero;
      rt.undying = false;
      // 스킬 쿨다운은 층을 넘어 이어진다
      const old = rt.allies || [];
      rt.allies = F.members(f).map((uid, i) => Object.assign(F.newAlly(f, uid, st.cx + (i % 3) - 1, st.cy + (i > 2 ? 1 : 0)), { cds: old.find(o => o.uid === uid)?.cds || {} }));
      rt.party = [hero, ...rt.allies];
      const band = D.bands[F.band(fl)];
      const n = Math.round(MON_K * (10 + Math.min(12, Math.floor(fl / 4))) * rooms / ROOMS);
      const spot = () => { const room = m.rooms[1 + U.rand(m.rooms.length - 1)]; const x = room.x + U.rand(room.w), y = room.y + U.rand(room.h); return m.c[y * m.w + x] === '.' ? [x, y] : null; };
      for (let i = 0; i < n; i++) { const p = spot(); if (p) F.spawnMon(rt, fl, U.pick(band.mons), p[0], p[1], false); }
      if (boss) F.spawnMon(rt, fl, D.bosses[((fl - FIRST_BOSS) / BOSS_EVERY) % D.bosses.length], m.end.cx - 1, m.end.cy, true);
      // 보물상자: 층마다 트리 레벨만큼. 미믹 사냥을 배우면 30%는 미믹
      // 보물 방: 시즌마다 고정 (같은 층이면 같은 방들). 자리는 방 안에서 그때그때
      const tRooms = m.rooms.slice(1, -1).map(r => [rng(), r]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      m.treasure = tRooms.slice(0, ta('g_chest'));
      for (let i = 0; i < ta('g_chest') && tRooms.length; i++) {
        const room = tRooms[i % tRooms.length], p = [room.x + U.rand(room.w), room.y + U.rand(room.h)];
        if (m.c[p[1] * m.w + p[0]] === '.') rt.chests.push({ kind: 'obj', chest: true, t: 'x_chest', x: p[0], y: p[1], s: 0.9, mimic: ta('g_mimic') > 0 && U.chance(0.3) });
      }
      // 황금 고블린: 가끔 나타나 파티에게서 달아난다. 20초 안에 잡지 못하면 사라진다
      if (ta('g_goblin') && U.chance(0.25 + ta('g_goblin2'))) {
        const p = spot();
        if (p) F.spawnMon(rt, fl, { n: '황금 고블린', t: 'm_ggoblin' }, p[0], p[1], false, { hp: F.monHP(fl) * 2, max: F.monHP(fl) * 2, atk: 0, gold: F.monGold(fl) * 30, flee: 20, label: '황금 고블린' });
      }
      rt.phase = 'explore';
      rt.focus = null; rt.rally = null; rt.rush = false;
      rt.target = null;
      rt.room = null;
      rt.monTotal = rt.mons.length;
      G.Rivals.enter(f, rt);
      F.refreshEnts(rt);
      F.look(rt);
      G.emit('f_floor', fl);
    },
    refreshEnts(rt) { rt.ents = [...rt.chests, ...(rt.traps || []), ...rt.party, ...G.Rivals.ents(rt), ...rt.mons]; },
    spawnMon(rt, fl, d, x, y, boss, extra) {
      const hp = F.monHP(fl, boss);
      const mo = {
        kind: 'mon', n: d.n, t: d.t, wpn: d.wpn, x, y, s: boss ? d.s || 1.6 : 1, hp, max: hp, atk: F.monAtk(fl, boss), gold: F.monGold(fl, boss),
        boss, aggro: false, atkT: Math.random(), bar: true, label: boss ? d.n : null, dots: [],
      };
      rt.mons.push(Object.assign(mo, extra));
      return mo;
    },
    // 시야: F.sight()칸 안에서 벽에 가리지 않은 칸만. 공격도 시야 안에서만 (벽 너머로 치지 않는다)
    sees: (m, a, b) => GR.los(m, a.x, a.y, b.x, b.y),
    // 지금 원정대 누군가에게 보이는 칸인가 (벼락을 내릴 수 있는 곳)
    inView(rt, x, y) {
      const S = F.sight();
      return rt.party.some(p => !p.dead && (p.x - x) ** 2 + (p.y - y) ** 2 <= S * S && GR.los(rt.map, p.x, p.y, x, y));
    },
    // 살아 있는 파티원 모두의 시야 안 칸을 본 칸으로 (기사가 쓰러져도 동료가 보는 곳은 밝다)
    look(rt) {
      const m = rt.map, S = F.sight();
      let added = false;
      for (const p of rt.party) {
        if (p.dead) continue;
        const hx = Math.round(p.x), hy = Math.round(p.y);
        for (let y = hy - S; y <= hy + S; y++) for (let x = hx - S; x <= hx + S; x++) {
          if (x < 0 || y < 0 || x >= m.w || y >= m.h || (x - hx) ** 2 + (y - hy) ** 2 > S * S) continue;
          const i = y * m.w + x;
          if (rt.seen[i] || !GR.los(m, hx, hy, x, y)) continue;
          rt.seen[i] = 1; added = true;
        }
      }
      if (added) rt.seenVer++;
    },
    // 편성이 바뀌면(트리 구매·직접 편성) 지금 층에도 바로 반영: 빠진 동료는 돌아가고 새 동료가 기사 옆에 합류
    syncAllies(f) {
      const rt = F.rt(f), want = F.members(f), h = rt.hero;
      const keep = rt.allies.filter(a => want.includes(a.uid));
      for (const uid of want) if (!keep.some(a => a.uid === uid)) {
        keep.push(F.newAlly(f, uid, h.x, h.y));
        G.fx(rt, { k: 'tile', key: 'fx_holy', x: h.x, y: h.y, t: 0.8 });
        G.J.sfx('fantasy', 'chime');
      }
      rt.allies = want.map(uid => keep.find(a => a.uid === uid));
      rt.resync = false;
      rt.party = [h, ...rt.allies];
      F.refreshEnts(rt);
    },

    // ── 전투 ──
    hurt(f, rt, m, dmg, src, from) {
      if (m.hp <= 0) return;
      if (rt.focus === m) dmg *= 1 + ta('t_focus');
      if (F.sk(from, 's_first') && m.hp >= m.max * 0.999) dmg *= 1.5;
      if (m.kind === 'rival') dmg *= G.Rivals.ambushMult(rt, m);
      if (m.mark > 0) dmg *= 1.25;
      if (from?.merc) dmg *= G.Quirk.dmg(rt, from, m) * G.Trinket.dmg(rt, from, m);
      m.hp -= dmg;
      m.aggro = true;
      // 숫자 크기로 위계: 치명타·벼락은 크게 튀고, 보통 타격은 체력 대비 피해만큼 커진다
      const big = src !== 'hit' && src !== 'dot';
      if (src !== 'dot' || Math.random() < 0.3) G.fx(rt, { k: 'text', x: m.x, y: m.y - 0.6, s: U.fmt(dmg) + (src === 'crit' ? '!' : ''), col: src === 'crit' ? '#ffd24a' : src === 'smite' ? '#bfe8ff' : src === 'dot' ? '#9fe79f' : '#fff', t: 0.8, sz: (big ? 1.3 : src === 'dot' ? 0.7 : 0.85) + 0.5 * Math.min(1, dmg / m.max), pop: big });
      if (src !== 'dot') {
        G.J.hit('fantasy', m, src === 'smite' ? 0.5 : src === 'crit' ? 0.25 : 0, from);
        const dx = from ? m.x - from.x : 0, dy = from ? m.y - from.y : 0;
        G.fx(rt, { k: 'splat', x: m.x, y: m.y, dx, dy, n: big ? 9 : 5, s: big ? 1.3 : 0.9, t: 0.5 });
        if (big) G.fx(rt, { k: 'impact', x: m.x, y: m.y - 0.1, s: src === 'smite' ? 1.8 : 1.4, col: src === 'smite' ? '#d8f0ff' : '#fff3b0', t: 0.22 });
      }
      if (src === 'crit') G.J.sfx('fantasy', 'crit');
      if (m.hp <= 0) F.kill(f, rt, m, src, from);
    },
    // 지속 피해(독·화상): 같은 종류는 새로 걸면 덮어쓴다
    dot(m, kind, dps, t) {
      const d = m.dots.find(x => x.kind === kind);
      if (d) { d.dps = Math.max(d.dps, dps); d.t = t; } else m.dots.push({ kind, dps, t });
    },
    // 상태이상을 건다: 독 · 화상 · 출혈(지속 피해) · 표식 · 기절 · 정지 · 감전. 동료가 걸면 연계기가 받아칠 수 있다(noCombo면 받지 않는다)
    inflict(f, rt, m, k, t, from, dps, noCombo) {
      if (!m || m.hp <= 0 || !m.dots) return;
      if (DOTS.includes(k)) F.dot(m, k, dps, t);
      else if (m.kind !== 'mon') return;
      else m[k] = Math.max(m[k] || 0, t);
      if (!noCombo && m.kind === 'mon') G.Combo.on(f, rt, k, from, m);
    },
    kill(f, rt, m, src, from) {
      // 라이벌 몸이 쓰러졌다 / 라이벌이 먼저 잡았다 (골드는 그들 몫)
      if (m.kind === 'rival') return G.Rivals.down(f, rt, m, from);
      if (from && from.kind === 'rival') return G.Rivals.stole(f, rt, m, from);
      let g = m.gold * F.goldMult(f);
      if (m.boss) g *= 1 + ta('g_boss');
      if (m.mimic) g *= ta('g_mimic2') ? 10 : 5;
      if (rt.focus === m) g *= 1 + ta('t_mark');
      // 황금열: 30마리마다 10초간 골드 ×2
      if (ta('g_fever') && ++rt.killN % 30 === 0) F.buff(f, rt, rt.hero, 'gold', 10);
      if (ta('g_jack') && U.chance(0.03)) { g *= 5; G.fx(rt, { k: 'text', x: m.x, y: m.y - 1.6, s: '대박!', col: '#ffe08a', t: 1.3, sz: 1.4, pop: true }); G.J.sfx('fantasy', 'jackpot'); }
      F.gain(f, g);
      f.kills++;
      G.Guild.onKill(f, rt, m);
      G.fx(rt, { k: 'die', spr: m.t, x: m.x, y: m.y, s: m.s, flip: m.flip, t: 0.45 });
      G.fx(rt, { k: 'text', x: m.x, y: m.y - 1, s: '+' + U.fmt(g), col: '#ffd24a', t: 1.1, sz: m.mimic ? 1.4 : 1, pop: !!m.mimic });
      G.J.sfx('fantasy', 'coin');
      if (m.boss) {
        G.Quirk.event(f, rt, from, 'bosshunt');
        G.Trinket.drop(f, rt, 'boss', m.x, m.y);
        G.J.finish('fantasy', m.x, m.y);
        G.J.sfx('fantasy', 'finish');
        if (f.floor % (2 * BOSS_EVERY) === 0) G.addSigns(1, 'fantasy');
        G.log(`${f.floor}층 · ${m.n} 토벌`, 'fantasy', 'good');
      }
      F.removeMon(rt, m);
    },
    removeMon(rt, m) {
      rt.mons = rt.mons.filter(x => x !== m);
      if (rt.focus === m) rt.focus = null;
      if (rt.target === m) rt.target = null;
      F.refreshEnts(rt);
    },
    // 상자 열기: 골드, 또는 미믹이 깨어난다
    openChest(f, rt, c) {
      rt.chests = rt.chests.filter(x => x !== c);
      if (c.mimic) {
        F.spawnMon(rt, f.floor, { n: '미믹', t: 'm_mimic' }, c.x, c.y, false, { hp: F.monHP(f.floor) * 3, max: F.monHP(f.floor) * 3, atk: F.monAtk(f.floor) * 1.5, mimic: true, aggro: true, s: 1.2 });
        G.fx(rt, { k: 'text', x: c.x, y: c.y - 1, s: '미믹!', col: '#ff6a6a', t: 1.2, sz: 1.3, pop: true });
        G.J.shake('fantasy', 6);
        G.J.sfx('fantasy', 'hurt');
      } else {
        // 도벽 (기벽): 몇몇이 슬쩍 챙긴다 — 그 사람 머리 위에 금화
        const kl = rt.allies.filter(a => !a.dead && a.merc && G.Quirk.prod(a.merc, 'chest') < 1);
        for (const a of kl) G.fx(rt, { k: 'tile', key: 'ui_gold', x: a.x, y: a.y - 1.1, t: 1, s: 0.6 });
        const g = F.monGold(f.floor) * 8 * (1 + ta('g_lucky')) * (F.has(rt, 's_loot') ? 1.5 : 1) * F.goldMult(f) * kl.reduce((v, a) => v * G.Quirk.prod(a.merc, 'chest'), 1);
        F.gain(f, g);
        G.fx(rt, { k: 'tile', key: 'x_chest_open', x: c.x, y: c.y, t: 1.2, s: 0.9 });
        G.fx(rt, { k: 'text', x: c.x, y: c.y - 1, s: '+' + U.fmt(g), col: '#ffd24a', t: 1.3, sz: 1.3, pop: true });
        G.J.sfx('fantasy', 'jackpot');
      }
      F.refreshEnts(rt);
    },
    nearestMon(rt, e, maxD = 1e9) {
      let best = null, bd = maxD;
      for (const m of rt.mons) { const d = GR.dist(e, m); if (d < bd) { bd = d; best = m; } }
      return best;
    },
    // 방 안(문턱 한 칸 포함)에 있나
    inRoom: (r, o) => o.x >= r.x - 1 && o.x < r.x + r.w + 1 && o.y >= r.y - 1 && o.y < r.y + r.h + 1,
    // 기사가 다음에 갈 곳: 덤벼 오는 적 → 눈에 띈 상자(곁의 적부터 치우고) → 길로 가장 가까운 방의 적·상자 → 방 밖에 남은 적.
    // 한 번 고른 적·방은 끝낼 때까지 바꾸지 않는다 (벽 너머 두 곳 사이에서 오가지 않게). 없으면 null (계단으로).
    plan(rt) {
      const h = rt.hero, m = rt.map, d = GR.field(m, Math.round(h.x), Math.round(h.y));
      const far = o => { const v = d[Math.round(o.x) + Math.round(o.y) * m.w]; return v >= 0 ? v : 1e6 + GR.dist(h, o); };
      // 피하기 방침인 라이벌 곁(5칸)의 적·상자는 고르지 않는다 (덤벼 오는 적은 예외)
      const shun = G.Rivals.avoided(rt), ok = o => !shun.some(e => GR.dist(e, o) < 5);
      const near = list => { let best = null, bd = 1e9; for (const o of list) { const k = far(o); if (k < bd && (o.aggro && GR.dist(o, h) < 6 || ok(o))) { bd = k; best = o; } } return best; };
      const lock = o => (rt.target = o);
      const foes = G.Rivals.hostiles(rt);
      const t = rt.target, held = t && t.hp > 0 && (rt.mons.includes(t) || foes.includes(t)) ? t : null;
      const close = o => o.aggro && GR.dist(o, h) < 6;
      if (held && close(held)) return held;
      // 덤벼 오는 라이벌도 덤벼 오는 적과 같이 먼저 친다
      const fight = near(rt.mons.filter(close).concat(foes.filter(o => GR.dist(o, h) < 8)));
      if (fight) return lock(fight);
      // 지휘: 서둘러 내려가기면 계단으로(null), 집결이면 그 자리로
      if (rt.rush) return null;
      if (rt.rally) return rt.rally;
      // 아는 층(탐사율이 기준 이상): 헤매지 않고 보스 → 보물 → 계단만 (G.Season)
      if (G.Season.known(G.S.w.fantasy, rt)) return lock(rt.mons.find(o => o.boss)) || near(rt.chests);
      const chest = near(rt.chests.filter(c => rt.seen[c.y * m.w + c.x]));
      if (chest) return lock(near(rt.mons.filter(o => GR.dist(o, chest) < 4))) || chest;
      if (held) return held;
      const busy = r => !shun.some(e => F.inRoom(r, e)) && (rt.mons.some(o => F.inRoom(r, o)) || rt.chests.some(c => F.inRoom(r, c)));
      if (!rt.room || !busy(rt.room)) rt.room = near(m.rooms.filter(busy).map(r => ({ x: r.cx, y: r.cy, r })))?.r || null;
      if (rt.room) return lock(near(rt.mons.filter(o => F.inRoom(rt.room, o)))) || near(rt.chests.filter(c => F.inRoom(rt.room, c)));
      return lock(near(rt.mons)) || near(rt.chests);
    },
    descend(f, rt) {
      G.Bond.floor(f, rt);
      if (F.isBoss(f.floor)) { G.Exp.cleared(f, f.floor); if (G.Exp.afterBoss(f, rt)) { G.addEss(F.floorEss(f.floor), 'fantasy'); return; } }
      G.addEss(F.floorEss(f.floor), 'fantasy');
      G.J.sfx('fantasy', 'wave');
      if (f.auto) {
        // 층 도약: 빨리 정리하면 한 층 더
        const skip = ta('g_skip') && rt.floorT < SKIP_T && !F.isBoss(f.floor + 1) ? 2 : 1;
        if (skip > 1) G.fx(rt, { k: 'text', x: rt.hero.x, y: rt.hero.y - 1.2, s: '도약!', col: '#9fe0ff', t: 1.2, sz: 1.3, pop: true });
        f.floor += skip;
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

    // ── 지휘: 맵을 누르면 명령 (G.Cmd) ──
    click: (f, x, y) => G.Cmd.click(f, F.rt(f), x, y),

    // ── 기술 ──
    // 용병 스킬 (DESIGN.md 39 · 43): 출전 중인 누군가가 가졌나 / 그 사람 / 이 사람이 가졌나 (전직 스킬 포함)
    has: (rt, key) => rt.allies.some(a => !a.dead && G.Guild.skill(a.merc, key)),
    who: (rt, key) => rt.allies.find(a => !a.dead && G.Guild.skill(a.merc, key)),
    sk: (a, key) => !!a && G.Guild.skill(a.merc, key),
    // 기사 기술: 트리로 연다
    unlocked: id => ta(SKILLS[id].need) > 0,
    canCast: (f, id) => F.unlocked(id) && !(f.cds[id] > 0),
    cast(f, id) {
      const rt = F.rt(f);
      if (!F.canCast(f, id) || rt.phase === 'dead' || f.town) return false;
      f.cds[id] = SKILLS[id].cd;
      if (id === 'rage') {
        f.buffs.rage = 10;
        G.fx(rt, { k: 'ring', x: rt.hero.x, y: rt.hero.y, r: 2.5, t: 0.6, col: '#ff5a3a' });
        G.J.sfx('fantasy', 'chime');
      } else if (id === 'assault') {
        f.buffs.assault = 15 + ta('k_assault2');
        F.syncAllies(f);
        G.fx(rt, { k: 'ring', x: rt.hero.x, y: rt.hero.y, r: 4, t: 0.8, col: '#ffd24a' });
        G.fx(rt, { k: 'text', x: rt.hero.x, y: rt.hero.y - 1.5, s: '총공세!', col: '#ffd24a', t: 1.5, sz: 1.5, pop: true });
        G.J.finish('fantasy', rt.hero.x, rt.hero.y, 1.2);
        G.J.sfx('fantasy', 'finish');
      }
      return true;
    },
    // 기술 표적: 지정한 적(보이면), 아니면 기사에게 가장 가까운 보이는 적
    skillTarget(rt) {
      const seen = rt.mons.filter(o => F.inView(rt, o.x, o.y));
      return (rt.focus && seen.includes(rt.focus) ? rt.focus : seen.sort((p, q) => GR.dist(p, rt.hero) - GR.dist(q, rt.hero))[0]) || rt.hero;
    },
    // 음유시인의 노래 / 대현자의 시간 왜곡 / 성벽: 버프를 건다
    buff(f, rt, who, k, dur) {
      f.buffs[k] = dur;
      const B = D.buffs[k];
      // 파티 전체에 걸린다: 시전자 고리 + 살아 있는 파티원마다 작은 고리
      G.fx(rt, { k: 'ring', x: who.x, y: who.y, r: 3, t: 0.7, col: B.col });
      for (const p of rt.party) if (!p.dead && p !== who) G.fx(rt, { k: 'ring', x: p.x, y: p.y, r: 0.9, t: 0.6, col: B.col });
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

    // 파티원이 맞는다 (몬스터 공격·오염). 쓰러지면 잠시 뒤 부활, 전원이 쓰러지면 패배.
    hurtMember(f, rt, p, dmg, mo) {
      if (p.dead) return;
      if (mo) {
        // 수호 맹세: 지키는 사람이 대신 맞는다 · 무적(신성 방벽 · 최후의 보루)
        const g = rt.allies.find(q => !q.dead && q.guardT > 0 && q.guardOf === p && q !== p);
        if (g) p = g;
        if (p.inv > 0) return;
        // 단짝 (DESIGN.md 49): 체력 절반 아래에서 맞으면, 곁(2칸)에 있는 더 성한 전우가 40%를 대신 맞는다 — 분홍 줄
        const bd = p.merc && p.hp < p.max * 0.5 && G.Persona.buddy(f, rt, p);
        if (bd && GR.dist(bd, p) <= 2 && bd.hp / bd.max > p.hp / p.max + 0.2 && !(bd.inv > 0)) {
          const share = dmg * 0.4;
          dmg -= share;
          bd.hp -= share;
          G.fx(rt, { k: 'beam', x: bd.x, y: bd.y, x2: p.x, y2: p.y, col: '#ff8ab0', w: 2, t: 0.25 });
          if (!(bd.coverT > G.S.runTime)) { bd.coverT = G.S.runTime + 6; G.fx(rt, { k: 'emote', key: 'rl_heart', ent: bd, x: bd.x, y: bd.y, t: 1 }); }
          if (bd.hp <= 0) bd.hp = 1;
        }
        if (p === rt.hero) dmg *= 1 - F.armor();
        if (p.shoutT > 0) dmg *= 0.7;
        if (f.buffs.ward) dmg *= 0.7;
        if (F.sk(p, 'p_guard')) dmg *= 1 - G.D.MSKILLS.p_guard.v;
        if (f.buffs.wall) dmg *= 0.5;
        if (ta('t_hold') && rt.focus && rt.focus.hp > 0) dmg *= 0.85;
        if (p.merc) dmg *= G.Quirk.taken(rt, p, mo) * G.Trinket.taken(rt, p);
        G.J.hit('fantasy', p, 0, mo);
        G.J.lunge('fantasy', mo, p);
        G.fx(rt, { k: 'splat', x: p.x, y: p.y, dx: p.x - mo.x, dy: p.y - mo.y, n: 4, s: 0.8, t: 0.45 });
        G.fx(rt, { k: 'slash', x: p.x, y: p.y, t: 0.22, rot: Math.random() - 0.5, flip: mo.x > p.x });
        G.fx(rt, { k: 'text', x: p.x, y: p.y - 0.6, s: '-' + U.fmt(dmg), col: '#ff6b6b', t: 0.7 });
        if (F.sk(p, 'p_counter')) F.hurt(f, rt, mo, dmg * 0.5, 'hit', p);
        if (p.retT > 0) F.hurt(f, rt, mo, dmg, 'hit', p);
        if (p === rt.hero) G.J.sfx('fantasy', 'hurt');
      }
      p.hp -= dmg;
      if (p.hp > 0) return;
      if (p === rt.hero && ta('k_undying') && !rt.undying) {
        rt.undying = true;
        p.hp = p.max * 0.3;
        G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.3, s: '불굴!', col: '#ffe08a', t: 1.3, sz: 1.3, pop: true });
        G.J.sfx('fantasy', 'chime');
        return;
      }
      p.dead = true;
      p.reviveT = ALLY_REVIVE * (F.has(rt, 'c_revive') ? 0.5 : 1) * (p.merc ? G.Guild.mult(p.merc, 'revive') : 1);
      if (p.merc) G.Guild.onDown(f, rt, p);
      // 기벽 사건: 라이벌에게 쓰러짐 → 그 라이벌단 공포 · 전멸에서 마지막으로 쓰러짐 → 악몽
      if (mo?.kind === 'rival') G.Quirk.event(f, rt, p, 'fear:' + mo.rival.id);
      if (rt.party.every(q => q.dead)) G.Quirk.event(f, rt, p, 'nightmare');
      if (rt.party.every(q => q.dead)) {
        rt.phase = 'dead';
        rt.reviveT = REVIVE;
        f.deaths++;
        G.J.sfx('fantasy', 'lose');
        G.J.shake('fantasy', 8, 1, 0, 0.4);
        G.log(`${f.floor}층 · 전멸`, 'fantasy', 'bad');
        if (mo && mo.kind === 'rival') G.Rivals.beatUs(f, mo);
      }
    },

    tick(f, dt) {
      const rt = F.rt(f);
      G.fxTick(rt, dt);
      // 시즌 시계 (G.Season): 끝났으면 결과를 보여 주는 동안 멈춘다
      if (G.Season.clock(f, rt, dt)) return;
      for (const k in f.buffs) if ((f.buffs[k] -= dt) <= 0) {
        delete f.buffs[k];
        if (k === 'assault') F.syncAllies(f);
        // 노래가 끝났다 → 연계기 「피날레」
        if (rt.songBy && F.songs().includes(k) && !f.town) G.Combo.on(f, rt, 'song_end', rt.songBy, rt.songBy);
      }
      for (const k in f.cds) if ((f.cds[k] -= dt) <= 0) delete f.cds[k];
      // 라이벌: 다른 층에 있으면 시간으로 내려가고, 같은 층이면 맵 위에서 움직인다 (우리가 전멸해 있어도)
      G.Rivals.tick(f, rt, dt);
      // 용병: 부상 회복·선술집. 부상·회복으로 편성이 바뀌면 한 번에 다시 맞춘다
      G.Guild.tick(f, rt, dt);
      if (rt.resync && rt.phase !== 'dead') F.syncAllies(f);
      // 마을: 정비하는 동안 던전은 멈춘다 (라이벌·선술집은 그대로 흐른다)
      if (f.town) { G.Exp.townTick(f, rt, dt); return; }
      G.Cmd.tick(f, rt, dt);
      // 기사 기술은 알아서 쓴다 (방치). 독의 단추·숫자키로 먼저 쓸 수 있다. 용병 스킬은 아래 동료 고리에서 사람마다
      if (rt.phase !== 'dead') {
        if (rt.mons.length && F.canCast(f, 'rage')) F.cast(f, 'rage');
        if (rt.mons.length >= 4 && F.canCast(f, 'assault')) F.cast(f, 'assault');
      }
      // 전멸: 잠시 뒤 마을로 (짐 절반을 잃는다 — G.Exp)
      if (rt.phase === 'dead') {
        if ((rt.reviveT -= dt) <= 0) G.Exp.home(f, rt, 'wipe');
        return;
      }
      G.Exp.tick(f, rt);
      if (f.town) return;
      G.Season.tick(f, rt, dt);
      rt.floorT += dt;
      const m = rt.map, hero = rt.hero;
      const aspd = F.aspd(f), speed = 3.2 * tm('speed') * (f.buffs.path ? 1.5 : 1) * (1 + rt.allies.reduce((a, q) => a + (q.dead || !q.merc ? 0 : G.Guild.sum(q.merc, 'move')), 0));
      const hmax = F.heroHP(f) * (f.buffs.hp ? 1.6 : 1);
      hero.max = hmax;
      // 재생과 오염 (오염은 최대 체력 비율이라 체력이 커져도 늘 의미가 있다)
      const corr = F.corruption(f, rt);
      for (const p of rt.party) {
        if (p.dead) {
          if ((p.reviveT -= dt) <= 0) {
            p.dead = false; p.hp = p.max * 0.5;
            // 쓰러진 자리에서 일어난다. 원정대가 멀리 가 버렸으면 곁으로
            const lead = hero.dead ? rt.party.find(q => !q.dead && q !== p) || hero : hero;
            if (GR.dist(p, lead) > 8) { p.x = lead.x; p.y = lead.y; }
            G.fx(rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.6 });
          }
          continue;
        }
        if (p !== hero) p.max = F.allyHP(f, p);
        p.hp = Math.min(p.max, p.hp + p.max * F.regen(f) * dt);
        if (corr > 0) F.hurtMember(f, rt, p, p.max * corr * dt, null);
      }
      if (rt.phase === 'dead') return;
      // 지속 피해와 감전
      for (const mo of [...rt.mons]) {
        if (mo.mark > 0) mo.mark -= dt;
        if (mo.shock > 0) mo.shock -= dt;
        for (const d of mo.dots) { d.t -= dt; F.hurt(f, rt, mo, d.dps * dt, 'dot', null); }
        mo.dots = mo.dots.filter(d => d.t > 0);
      }
      // 되감기용: 1초마다 파티 체력을 적어 둔다 (5초 전이 맨 앞)
      if ((rt.histT = (rt.histT || 0) - dt) <= 0) {
        rt.histT = 1;
        (rt.hpHist = rt.hpHist || []).push(Object.fromEntries(rt.party.map(p => [p.uid || 'hero', p.dead ? 0 : p.hp])));
        if (rt.hpHist.length > 5) rt.hpHist.shift();
      }
      // 덫: 밟은 적은 기절 + 출혈
      if (rt.traps.length) {
        for (const tr of rt.traps) {
          tr.t -= dt;
          const o = rt.mons.find(q => GR.dist(q, tr) < 0.8);
          if (o && tr.t > 0) { tr.t = 0; G.fx(rt, { k: 'impact', x: tr.x, y: tr.y, s: 1.2, col: '#ffe08a', t: 0.25 }); F.inflict(f, rt, o, 'stun', 3, tr.c); F.inflict(f, rt, o, 'bleed', 2, tr.c, F.allyAtk(f, tr.c) * 0.8 * G.Skill.pow(tr.c)); }
        }
        const n = rt.traps.length;
        rt.traps = rt.traps.filter(tr => tr.t > 0);
        if (rt.traps.length !== n) F.refreshEnts(rt);
      }
      // 시간 왜곡 / 시간 정지
      const wz = F.who(rt, 'a_warp'), am = F.who(rt, 'a_stop');
      if (wz && rt.mons.length && (rt.warpT -= dt) <= 0) {
        rt.warpT = WARP_CD;
        F.buff(f, rt, wz, 'haste', 5);
      }
      if (am && rt.mons.length && (rt.stopT -= dt) <= 0) {
        rt.stopT = STOP_CD;
        for (const o of rt.mons) if (F.inView(rt, o.x, o.y)) F.inflict(f, rt, o, 'stop', 4, am);
        G.fx(rt, { k: 'ring', x: am.x, y: am.y, r: 6, t: 0.8, col: '#c9a6ff' });
        G.fx(rt, { k: 'text', x: am.x, y: am.y - 1.2, s: '시간 정지', col: '#c9a6ff', t: 1.3, sz: 1.2, pop: true });
      }
      // 화살비: 0.2초마다 표적 주변 3칸 안 적 하나
      const arch = rt.volley?.c;
      if (rt.volley && (rt.volley.t -= dt) > 0 && arch && !arch.dead) {
        if ((rt.volley.tick -= dt) <= 0) {
          rt.volley.tick = 0.2;
          const near = rt.mons.filter(o => Math.hypot(o.x - rt.volley.x, o.y - rt.volley.y) <= 3);
          if (near.length) {
            const o = U.pick(near), dmg = F.allyAtk(f, arch);
            G.fx(rt, { k: 'proj', key: 'fx_arrow', x: o.x - 1.5, y: o.y - 3, x2: o.x, y2: o.y, t: 0.18 });
            F.hurt(f, rt, o, dmg, 'hit', arch);
            if (F.sk(arch, 'r_poison')) F.inflict(f, rt, o, 'poison', 4, arch, dmg * 0.3);
          }
        }
      } else rt.volley = null;
      // 뇌우: 0.5초마다 보이는 적 셋에게 번개
      const sage = rt.tstorm?.c;
      if (rt.tstorm && (rt.tstorm.t -= dt) > 0 && sage && !sage.dead) {
        if ((rt.tstorm.tick -= dt) <= 0) {
          rt.tstorm.tick = 0.5;
          const seen = rt.mons.filter(o => F.inView(rt, o.x, o.y));
          for (let k = 0; k < 3 && seen.length; k++) { const o = seen.splice(U.rand(seen.length), 1)[0]; G.fx(rt, { k: 'bolt', x: o.x, y: o.y, t: 0.3, col: '#c9a6ff' }); F.hurt(f, rt, o, F.allyAtk(f, sage) * 1.5, 'hit', { x: o.x, y: o.y - 1 }); }
        }
      } else rt.tstorm = null;
      // 화염 폭풍 불길
      for (const fd of rt.fields) {
        fd.t -= dt;
        if (Math.random() < dt * 6) G.fx(rt, { k: 'tile', key: 'fx_flame', x: fd.x + (Math.random() - 0.5) * fd.r * 1.6, y: fd.y + (Math.random() - 0.5) * fd.r * 1.6, t: 0.4 });
        for (const o of [...rt.mons]) if (Math.hypot(o.x - fd.x, o.y - fd.y) <= fd.r) { F.hurt(f, rt, o, fd.dps * dt, 'dot', null); if (fd.burn && !o.dots.some(d => d.kind === 'burn')) F.inflict(f, rt, o, 'burn', 3, fd.burn, fd.dps * 0.5); }
      }
      rt.fields = rt.fields.filter(fd => fd.t > 0);
      // 몬스터: 가까이 오면 깨어나 가장 가까운 파티원을 쫓는다 (도발 중이면 성기사)
      // 먼저 노려지는 사람: 도발의 함성 중 → 성기사(몸 성질 · 도발이면 더 멀리서) → 성벽을 세운 사람
      const shouter = rt.allies.find(q => !q.dead && q.shoutT > 0);
      const pal = shouter || rt.allies.find(q => !q.dead && q.id === 'paladin') || (f.buffs.wall && rt.wallBy && !rt.wallBy.dead ? rt.wallBy : null);
      const palR = shouter ? 8 : pal && F.sk(pal, 'p_taunt') ? 9 : 6;
      for (const mo of [...rt.mons]) {
        mo.moving = false;
        if (mo.stun > 0 || mo.stop > 0) { mo.stun -= dt; mo.stop -= dt; continue; }
        const slow = mo.shock > 0 ? SHOCK : 1;
        if (mo.flee) {
          // 황금 고블린: 파티 반대쪽으로 달아나다 시간이 다 되면 사라진다
          if ((mo.flee -= dt) <= 0) { rt.mons = rt.mons.filter(o => o !== mo); F.refreshEnts(rt); G.fx(rt, { k: 'text', x: mo.x, y: mo.y - 1, s: '놓쳤다…', col: '#aaa', t: 1 }); continue; }
          const dx = mo.x - hero.x, dy = mo.y - hero.y, l = Math.hypot(dx, dy) || 1;
          if (l < 7) GR.moveTo(m, mo, U.clamp(Math.round(mo.x + dx / l * 3), 1, m.w - 2), U.clamp(Math.round(mo.y + dy / l * 3), 1, m.h - 2), 2.6, dt, 0.3);
          continue;
        }
        if (!mo.aggro && GR.dist(mo, hero) < (mo.boss ? 4 : 6) && F.sees(m, mo, hero)) mo.aggro = true;
        if (!mo.aggro) continue;
        let tg = pal && GR.dist(mo, pal) < palR ? pal : null, bd = tg ? GR.dist(mo, tg) : 1e9;
        if (!tg) for (const p of rt.party.concat(G.Rivals.members(rt))) if (!p.dead) { const d = GR.dist(mo, p); if (d < bd) { bd = d; tg = p; } }
        if (!tg) continue;
        if (bd > 1.1 + mo.s * 0.2 || !F.sees(m, mo, tg)) { GR.moveTo(m, mo, tg.x, tg.y, (mo.boss ? 1.8 : 2.2) * slow, dt, 0.6); continue; }
        mo.flip = tg.x < mo.x;
        if ((mo.atkT -= dt * slow) <= 0) {
          mo.atkT = 1;
          if (tg.kind === 'rival') G.Rivals.hurt(f, rt, tg, mo.atk, mo);
          else F.hurtMember(f, rt, tg, mo.atk, mo);
          if (rt.phase === 'dead') return;
        }
      }
      // 기사: 지정한 적, 아니면 F.plan이 고른 적·상자. 둘 다 없으면 계단.
      hero.moving = false;
      rt.heroTg = null;
      if (!hero.dead) {
        const goal = (rt.focus && rt.focus.hp > 0) ? rt.focus : F.plan(rt);
        const chest = goal && goal.chest ? goal : null, rally = goal && goal.rally ? goal : null, target = chest || rally ? null : goal, march = speed * (1 + ta('t_march'));
        rt.heroTg = target;
        if (target) {
          if (GR.dist(hero, target) > 1.2 + target.s * 0.2 || !F.sees(m, hero, target)) GR.moveTo(m, hero, target.x, target.y, speed, dt, 0.6);
          else {
            hero.flip = target.x < hero.x;
            if ((hero.atkT -= dt * aspd) <= 0) {
              hero.atkT = 1;
              const c = U.chance(F.crit());
              G.fx(rt, { k: 'slash', x: target.x, y: target.y, t: 0.3, crit: c, rot: Math.random() - 0.5, flip: hero.x > target.x });
              G.J.lunge('fantasy', hero, target);
              if (!c) G.J.sfx('fantasy', 'tap');
              const dmg = F.heroAtk(f) * (c ? F.critD() : 1);
              F.hurt(f, rt, target, dmg, c ? 'crit' : 'hit', hero);
              if (ta('k_cleave')) { const o = rt.mons.find(q => q !== target && GR.dist(q, hero) < 1.8); if (o) F.hurt(f, rt, o, dmg * 0.5, 'hit', hero); }
              if (ta('k_leech')) hero.hp = Math.min(hero.max, hero.hp + dmg * ta('k_leech'));
            }
          }
        } else if (rally) {
          if (GR.moveTo(m, hero, rally.x, rally.y, march, dt, 0.6)) G.Cmd.arrive(f, rt);
        } else if (chest) {
          if (GR.moveTo(m, hero, chest.x, chest.y, speed, dt, 0.9)) F.openChest(f, rt, chest);
        } else if (GR.moveTo(m, hero, m.end.cx, m.end.cy, rt.rush ? march : speed, dt, 0.2)) {
          F.descend(f, rt);
          return;
        }
      }
      F.look(rt);
      // 동료: 기사가 노리는 적을 함께 친다 (파티가 갈라져 따로 싸우지 않게). 기사가 싸우지 않을 땐 따라다닌다.
      // 기사가 쓰러지면 각자 가까운 적과 싸우며 살아 있는 전열(성기사·용기병)을 따르고,
      // 전열도 없으면 제자리를 지킨다 — 쓰러진 기사(대개 적 한가운데)를 따라가 후열이 적진에 뛰어들지 않게
      const seenMons = rt.mons.filter(o => F.inView(rt, o.x, o.y));
      const front = hero.dead ? rt.allies.find(q => !q.dead && (q.id === 'paladin' || q.id === 'dragoon')) : hero;
      // 대열 (DESIGN.md 49): 앞장선 사람이 가는 쪽(부드럽게)을 기준으로 앞장은 앞에, 뒤는 뒤에 선다. 단짝은 서로 곁으로
      const ld = rt.leadDir || (rt.leadDir = { x: 1, y: 0 }), L0 = front || hero;
      if (rt.lpx != null) {
        const vx = L0.x - rt.lpx, vy = L0.y - rt.lpy, vl = Math.hypot(vx, vy);
        if (vl > 0.005) { ld.x = ld.x * 0.92 + vx / vl * 0.08; ld.y = ld.y * 0.92 + vy / vl * 0.08; const n = Math.hypot(ld.x, ld.y) || 1; ld.x /= n; ld.y /= n; }
      }
      rt.lpx = L0.x; rt.lpy = L0.y;
      const FORM = { front: 1.3, mid: -1.3, back: -2.8 };
      const follow = (a, lead, k) => {
        if (lead === a) return;
        const off = FORM[G.Persona.stance(a)], b = G.Persona.buddy(f, rt, a);
        let tx = lead.x + ld.x * off, ty = lead.y + ld.y * off;
        if (b) { tx = (tx * 2 + b.x) / 3; ty = (ty * 2 + b.y) / 3; }
        let px = U.clamp(Math.round(tx), 1, m.w - 2), py = U.clamp(Math.round(ty), 1, m.h - 2);
        if (!GR.pass(m, px, py)) { px = Math.round(lead.x); py = Math.round(lead.y); }
        GR.moveTo(m, a, px + (tx - Math.round(tx)) * 0.5, py + (ty - Math.round(ty)) * 0.5, speed * k, dt, 0.5);
      };
      for (const a of rt.allies) {
        const lead = front || a;
        a.moving = false;
        if (a.dead) continue;
        const def = a.def, PS = G.Persona;
        if (a.dashT > 0) a.dashT -= dt;
        // 스킬이 건 몸 타이머 (무적 · 수호 맹세 · 응보 · 도발 · 분노 · 독 바르기)
        for (const k of ['inv', 'guardT', 'retT', 'shoutT', 'furyT', 'venomT']) if (a[k] > 0) a[k] -= dt;
        // 개인 스킬 (DESIGN.md 43): 자동, 사람마다 쿨다운. 겁쟁이로 물러서는 동안은 쓰지 않는다
        if (!(a.fleeT > 0) && rt.phase !== 'dead') G.Skill.tick(f, rt, a, dt, seenMons);
        G.Quirk.brink(f, rt, a, dt);
        // 성격 (DESIGN.md 42) — 겁쟁이: 체력 30% 아래에서 적이 붙으면 3초간 떨며 앞장선 사람 뒤로 (그동안 싸우지 않는다)
        if (a.fleeT > 0) {
          a.fleeT -= dt;
          const foe = F.nearestMon(rt, a, 6);
          if (foe && lead !== a) {
            const dx = lead.x - foe.x, dy = lead.y - foe.y, l = Math.hypot(dx, dy) || 1;
            const bx = U.clamp(Math.round(lead.x + dx / l * 1.5), 1, m.w - 2), by = U.clamp(Math.round(lead.y + dy / l * 1.5), 1, m.h - 2);
            if (GR.pass(m, bx, by)) GR.moveTo(m, a, bx, by, speed * 1.2, dt, 0.3);
          }
          continue;
        }
        if (!a.cowRolled && a.hp < a.max * COWARD_AT && F.nearestMon(rt, a, 2.5) && PS.free(rt, a, 'coward')) {
          a.cowRolled = true;
          if (U.chance(COWARD_P)) { PS.fire(rt, a, 'coward'); a.fleeT = COWARD_T; continue; }
        }
        // 레인저 저격: 12초마다 보이는 적 중 체력이 가장 많은 적에게 ×8
        if (F.sk(a, 'r_snipe') && rt.mons.length && (a.snipeT -= dt) <= 0) {
          const tg = rt.mons.filter(o => F.inView(rt, o.x, o.y)).sort((p, q) => q.hp - p.hp)[0];
          if (tg) {
            a.snipeT = SNIPE_CD;
            G.fx(rt, { k: 'beam', x: a.x, y: a.y, x2: tg.x, y2: tg.y, col: '#fff3b0', w: 2, t: 0.2 });
            F.hurt(f, rt, tg, F.allyAtk(f, a) * 8, 'crit', a);
          }
        }
        // 음유시인: 노래를 번갈아 부른다
        if (def.song && rt.mons.length && (a.skT -= dt) <= 0) {
          a.skT = SONG_CD;
          const ss = F.songs(), k = ss[rt.song++ % ss.length];
          rt.songBy = a;
          F.buff(f, rt, a, k, F.songDur() * (k === 'fury' ? 0.6 : 1));
        }
        if (def.heal) {
          // 수도사: 가장 다친 파티원을 치유
          if ((a.atkT -= dt) <= 0) {
            let low = null;
            for (const p of rt.party) if (!p.dead && p.hp < p.max * 0.9 && (!low || p.hp / p.max < low.hp / low.max)) low = p;
            a.atkT = low ? def.cd : 0.3;
            const heal = def.heal * (a.merc ? G.Guild.mult(a.merc, 'heal') : 1);
            if (low && F.sk(a, 'c_mass') && ++a.shots % 5 === 0) {
              for (const p of rt.party) if (!p.dead) { p.hp = Math.min(p.max, p.hp + p.max * heal); G.fx(rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.5 }); }
            } else if (low) {
              low.hp = Math.min(low.max, low.hp + low.max * heal);
              G.J.lunge('fantasy', a, low);
              G.fx(rt, { k: 'tile', key: 'fx_holy', x: low.x, y: low.y, t: 0.5 });
            }
          }
          follow(a, lead, 1.1);
          continue;
        }
        const range = def.range, stc = PS.stance(a);
        const prefer = rt.focus && rt.focus.hp > 0 && GR.dist(rt.focus, a) < range + 4 ? rt.focus : null;
        let tg = hero.dead ? prefer || F.nearestMon(rt, a, range + 4) : rt.heroTg;
        // 성격 — 싸움꾼: 덤벼 온 라이벌이 있으면 늘 그쪽부터 (지휘 중이 아닐 때)
        if (PS.has(a.merc, 'brawler') && !PS.commanded(rt)) { const rv = G.Rivals.hostiles(rt).filter(e => GR.dist(e, a) < 8).sort((p, q) => GR.dist(p, a) - GR.dist(q, a))[0]; if (rv) tg = rv; }
        if (tg && (!hero.dead || GR.dist(tg, lead) < 9)) {
          // 성격 — 온순: 라이벌과는 싸우지 않고 깃발을 든 채 물러서 있다 (라이벌도 노리지 않는다 — G.Rivals.goal)
          if (tg.kind === 'rival' && PS.has(a.merc, 'meek')) {
            if (PS.free(rt, a, 'meek', true)) PS.fire(rt, a, 'meek');
            if (lead !== a && GR.dist(a, lead) > 1.8) GR.moveTo(m, a, lead.x, lead.y, speed, dt, 1.4);
            continue;
          }
          // 성격 — 다혈질: 새 적이 보이면 가끔 혼자 먼저 뛰어들어 첫 타를 크게 (원거리도 붙어서 친다)
          if (a.hotT > 0) {
            a.hotT -= dt;
            if (GR.dist(a, tg) > 1.1) { GR.moveTo(m, a, tg.x, tg.y, speed * 1.8, dt, 0.9); continue; }
          } else if (a.persTg !== tg && tg.kind === 'mon' && GR.dist(a, tg) > 2 && GR.dist(a, tg) < 7 && PS.free(rt, a, 'hot')) {
            a.persTg = tg;
            if (U.chance(HOT_P)) {
              PS.fire(rt, a, 'hot');
              a.hotT = HOT_T; a.hotHit = true;
              G.fx(rt, { k: 'beam', x: a.x, y: a.y, x2: tg.x, y2: tg.y, col: '#ff5a3a', w: 2, t: 0.3 });
              continue;
            }
          }
          // 성격 — 겁쟁이: 다른 사람이 먼저 붙기 전에는 3칸 떨어져 기다린다
          const engaged = rt.party.some(q => !q.dead && q !== a && GR.dist(q, tg) < 2.5);
          if (PS.has(a.merc, 'coward') && tg.kind === 'mon' && !engaged && range < 3) {
            if (GR.dist(a, tg) > 3.5) { GR.moveTo(m, a, tg.x, tg.y, speed, dt, 3); continue; }
            if (GR.dist(a, tg) < 3) { const dx = a.x - tg.x, dy = a.y - tg.y, l = Math.hypot(dx, dy) || 1, bx = U.clamp(Math.round(a.x + dx / l), 1, m.w - 2), by = U.clamp(Math.round(a.y + dy / l), 1, m.h - 2); if (GR.pass(m, bx, by)) GR.moveTo(m, a, bx, by, speed, dt, 0.3); }
            a.flip = tg.x < a.x;
            continue;
          }
          // 뒤에 서는 근접(치고 빠지기): 한 번 치고 잠깐 물러섰다가 다시 들어간다
          if (a.hopT > 0) {
            a.hopT -= dt;
            const dx = a.x - tg.x, dy = a.y - tg.y, l = Math.hypot(dx, dy) || 1, bx = U.clamp(Math.round(tg.x + dx / l * 2), 1, m.w - 2), by = U.clamp(Math.round(tg.y + dy / l * 2), 1, m.h - 2);
            if (GR.pass(m, bx, by)) GR.moveTo(m, a, bx, by, speed * 1.2, dt, 0.3);
            a.atkT -= dt * aspd;
            continue;
          }
          // 원거리: 적이 붙으면 물러나 쏜다 (앞에 막아 줄 동료가 있을 때만 — 혼자면 그냥 싸운다). 뒤에 서는 사람은 사거리 끝까지 벌린다
          const keep = stc === 'back' ? range * 0.65 : 1.4;
          if (range >= 3 && stc !== 'front' && !a.hotHit && GR.dist(a, tg) < keep && engaged) {
            const dx = a.x - tg.x, dy = a.y - tg.y, l = Math.hypot(dx, dy) || 1;
            const bx = U.clamp(Math.round(a.x + dx / l * 2), 1, m.w - 2), by = U.clamp(Math.round(a.y + dy / l * 2), 1, m.h - 2);
            if (GR.pass(m, bx, by)) { GR.moveTo(m, a, bx, by, speed, dt, 0.3); continue; }
          }
          // 용기병 돌진: 사거리 밖 6칸 안의 적에게 뛰어든다
          if (F.sk(a, 'd_dash') && a.dashT <= 0 && GR.dist(a, tg) > range && GR.dist(a, tg) <= 6 && F.sees(m, a, tg)) {
            a.dashT = DASH_CD;
            G.fx(rt, { k: 'beam', x: a.x, y: a.y, x2: tg.x, y2: tg.y, col: '#ffe08a', w: 3, t: 0.2 });
            a.x = tg.x + (a.x > tg.x ? 0.8 : -0.8); a.y = tg.y;
            a.atkT = 0; a.dashHit = true;
          }
          // 사거리 밖이거나 벽에 가리면 다가간다 (보이는 자리까지). 앞장은 더 빨리, 원거리 앞장은 2칸까지 바짝 붙는다
          const reach = stc === 'front' && range >= 3 ? 2 : range;
          if (GR.dist(a, tg) > reach) { GR.moveTo(m, a, tg.x, tg.y, speed * (stc === 'front' ? 1.25 : 1), dt, reach * 0.8); continue; }
          if (!F.sees(m, a, tg)) { GR.moveTo(m, a, tg.x, tg.y, speed, dt, 0.6); continue; }
          a.flip = tg.x < a.x;
          if ((a.atkT -= dt * aspd) <= 0) {
            a.atkT = F.allyCd(a);
            F.allyAttack(f, rt, a, tg);
            if (stc === 'back' && range < 3) a.hopT = 0.6;
          }
        } else follow(a, lead, 1.1);
      }
      F.spread(m, rt.party, 0.75);
      F.spread(m, rt.mons, 0.8);
    },
    // 동료 한 번 공격: 동료마다·택1 노드마다 다르게
    allyAttack(f, rt, a, tg) {
      const def = a.def;
      let dmg = F.allyAtk(f, a);
      if (def.proj) G.fx(rt, { k: 'proj', key: def.proj, x: a.x, y: a.y, x2: tg.x, y2: tg.y, t: def.proj === 'fx_arrow' ? 0.3 : 0.25 });
      else G.fx(rt, { k: 'slash', x: tg.x, y: tg.y, t: 0.25, rot: Math.random() - 0.5, flip: a.x > tg.x });
      G.J.lunge('fantasy', a, tg);
      // 덤벼 온 라이벌에게는 한 방씩 (범위·연쇄는 몬스터 목록만 훑으므로)
      if (tg.kind === 'rival') return F.hurt(f, rt, tg, dmg, 'hit', a);
      // 본 공격: 범위 · 연쇄 · 한 명. 그 뒤의 타격 효과는 직업과 상관없이 가진 스킬 키로 (상위 직업이 다른 직업 패시브를 가져온다 — DESIGN.md 40)
      if (a.dashHit) { dmg *= 3; a.dashHit = false; }
      if (a.nextX) { dmg *= a.nextX; a.nextX = 0; }
      if (a.hotHit) { dmg *= HOT_HIT; a.hotHit = false; a.hotT = 0; }
      const exec = F.sk(a, 'd_exec') && tg.hp < tg.max * 0.25;
      if (exec) G.fx(rt, { k: 'text', x: tg.x, y: tg.y - 1.2, s: '처형', col: '#ffe08a', t: 1, pop: true });
      if (def.splash) {
        const r = def.splash + (a.merc ? G.Guild.sum(a.merc, 'splash') : 0);
        G.fx(rt, { k: 'ring', x: tg.x, y: tg.y, r, t: 0.3, col: '#ff8a3a' });
        for (const mo of [...rt.mons]) if (GR.dist(mo, tg) <= r) { F.hurt(f, rt, mo, mo === tg && exec ? mo.hp + 1 : dmg, 'hit', a); if (F.sk(a, 'm_burn')) F.inflict(f, rt, mo, 'burn', 3, a, dmg * 0.25); }
      } else if (def.chain) {
        const over = F.sk(a, 'a_overload'), n = def.chain + (over ? 2 : 0);
        const hit = rt.mons.slice().sort((p, q) => GR.dist(p, tg) - GR.dist(q, tg)).slice(0, n);
        G.fx(rt, { k: 'chain', pts: [[a.x, a.y], ...hit.map(o => [o.x, o.y])], col: '#c9a6ff', t: 0.2 });
        hit.forEach((mo, i) => F.hurt(f, rt, mo, dmg * (over ? 1 : Math.pow(0.85, i)), 'hit', a));
      } else {
        // 용기병 계열은 15% 치명
        const c = a.id === 'dragoon' && U.chance(0.15);
        F.hurt(f, rt, tg, exec ? tg.hp + 1 : dmg * (c ? F.critD() : 1), c ? 'crit' : 'hit', a);
        if (F.sk(a, 'm_burn')) F.inflict(f, rt, tg, 'burn', 3, a, dmg * 0.25);
      }
      if (F.sk(a, 'r_poison') || a.venomT > 0) F.inflict(f, rt, tg, 'poison', 4, a, dmg * 0.3);
      if (a.merc) G.Trinket.proc(f, rt, a, tg, dmg);
      if (F.sk(a, 'r_pierce') && ++a.shots % 4 === 0) for (const o of rt.mons.filter(o => o !== tg && GR.dist(o, tg) <= 2).slice(0, 2)) F.hurt(f, rt, o, dmg * 0.6, 'hit', a);
      if (F.sk(a, 'd_breath')) for (const o of rt.mons.filter(o => o !== tg && GR.dist(o, tg) <= 1.5)) F.hurt(f, rt, o, dmg * 0.6, 'hit', a);
      if (F.sk(a, 'ro_twin') && tg.hp > 0) F.hurt(f, rt, tg, dmg * 0.6, 'hit', a);
      if (F.sk(a, 'ro_mark')) F.inflict(f, rt, tg, 'mark', 4, a);
      if (F.sk(a, 'ro_steal')) F.gain(f, F.monGold(f.floor) * G.D.MSKILLS.ro_steal.v * F.goldMult(f));
    },
    view(f) {
      const rt = F.rt(f), b = F.band(f.floor), m = rt.map;
      if (m._band !== b) { m._band = b; m.ver++; }
      return {
        map: m, ents: f.town ? [] : rt.ents, fx: rt.fx, cam: rt.hero.dead ? rt.party.find(p => !p.dead) || rt.hero : rt.hero, viewH: 13, center: true, dimAll: rt.phase === 'dead' || f.town,
        fog: { seen: rt.seen, ver: rt.seenVer, light: rt.hero.dead ? rt.party.find(p => !p.dead) || rt.hero : rt.hero },
        mini: { seen: rt.seen, ver: rt.seenVer, start: m.start, end: m.end, treasure: m.treasure, chests: rt.chests, party: rt.party, mons: rt.mons, rivals: G.Rivals.members(rt), label: f.town ? '' : `${f.floor}층 · 탐사 ${Math.round(G.Season.coverage(f, f.floor) * 100)}%` },
        terrain(x, y) {
          const c = m.c[y * m.w + x];
          if (c === '#') {
            const open = (dx, dy) => '.>'.includes(GR.at(m, x + dx, y + dy));
            // 0x72 자동 타일(47조각): 맵 밖도 벽으로 친다. 바닥과 닿은 벽 칸은 밑에 바닥을 깐다(벽이 칸 가운데에 얇게 그려져 있다)
            if (G.ARTSET['f_hw0' + b]) {
              const k = 'f_hw' + GR.blob(x, y, (xx, yy) => xx < 0 || yy < 0 || xx >= m.w || yy >= m.h || m.c[yy * m.w + xx] === '#') + b;
              return GR.DIR.some(([dx, dy]) => open(dx, dy)) ? ['f_floor' + b, k] : [k];
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
