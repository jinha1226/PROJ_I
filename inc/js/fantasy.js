'use strict';
// 판타지 · 끝없는 던전 (2D 던전 맵, 자동 전투)
// 층마다 방과 복도로 된 던전이 새로 생긴다. 원정대(기사 + 출전 동료)가 몬스터를 찾아가 싸우고, 모두 잡으면 계단으로 내려간다.
// 5층마다 계단 앞에 보스. 파티원은 각자 체력이 있고 쓰러지면 잠시 뒤 일어난다. 전원이 쓰러지면 패배(같은 층 다시, 세 번이면 한 층 후퇴).
// 6층부터 던전 오염이 파티 전원의 체력을 최대치의 %씩 계속 깎는다(깊을수록 짙다). 재생·치유·정화로 버틴다.
// 동료는 트리에서 열고, 출전 칸(기사 + 3명, 트리로 +)에 들어간 동료만 싸운다. 기본은 자동 편성.
// 맵 클릭 = 벼락 일격. 동료별 기술과 ★택1 짝 노드는 트리에서. 기사 주변 칸은 「본 칸」으로 남는다(안개·미니맵).
G.RT = G.RT || {};
G.Fantasy = (() => {
  const D = G.D.F, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('fantasy', G.S.w.fantasy.tree, k);
  const ta = k => G.Tree.add('fantasy', G.S.w.fantasy.tree, k);
  const MW = 40, MH = 26, REVIVE = 4, ALLY_REVIVE = 8, SMITE_CD = 0.6, SIGHT = 7, SONG_CD = 12, WARP_CD = 15, SNIPE_CD = 12, STOP_CD = 30, DASH_CD = 5, SKIP_T = 20;
  // 구간별 오염: 초당 최대 체력의 몇 %
  const CORRUPT = [0, 0.01, 0.018, 0.026, 0.034, 0.042];
  const SKILLS = {
    rage: { n: '전투 함성', t: 'r_dragon', cd: 40, need: 'sk_rage' },
    assault: { n: '총공세', t: 'u_god', cd: 90, need: 'sk_assault' },
    // 동료 기술 1 (UNITS.md): 그 동료가 출전해 서 있어야 쓴다
    volley: { n: '화살비', t: 'w_bow', cd: 20, need: 'sk_volley', who: 'archer' },
    rhap: { n: '광시곡', t: 'b_atk', cd: 30, need: 'sk_rhap', who: 'bard' },
    heal: { n: '치유의 빛', t: 'fx_holy', cd: 30, need: 'sk_heal', who: 'cleric' },
    meteor: { n: '유성 낙하', t: 'fx_fire', cd: 25, need: 'sk_meteor', who: 'mage' },
    wall: { n: '성벽', t: 'u_armor', cd: 30, need: 'sk_wall', who: 'paladin' },
    leap: { n: '용의 도약', t: 'w_spear', cd: 20, need: 'sk_leap', who: 'dragoon' },
    tstorm: { n: '뇌우', t: 'a_thunder', cd: 40, need: 'sk_tstorm', who: 'archmage' },
    shadow: { n: '그림자 처형', t: 'w_knife', cd: 25, need: 'sk_shadow', who: 'rogue' },
  };
  // 자동 편성 우선순위: 치유가 있어야 오염을 버티므로 수도사 먼저, 그다음 강한 순
  const AUTO = ['cleric', 'archmage', 'rogue', 'dragoon', 'paladin', 'mage', 'bard', 'archer'];

  const F = {
    SKILLS, CORRUPT,
    init(head = 0) {
      return { floor: 1, maxFloor: 1, gold: 5 * Math.pow(10, head), tree: G.Tree.init('fantasy'), buffs: {}, deaths: 0, auto: true, kills: 0, cds: {}, autoParty: true, lineup: [] };
    },
    rt(f) { return G.RT.fantasy || (G.RT.fantasy = F.boot(f)); },
    isBoss: fl => fl % 5 === 0,
    band: fl => D.bands.findIndex(b => fl <= b.to),
    monHP: (fl, boss) => 10 * Math.pow(1.13, fl - 1) * (boss ? 8 : 1),
    monAtk: (fl, boss) => 1.6 * Math.pow(1.105, fl - 1) * (boss ? 2 : 1),
    monGold: (fl, boss) => 2 * Math.pow(1.14, fl - 1) * (boss ? 10 : 1),
    floorEss: fl => 0.25 * Math.pow(fl, 1.3) * (F.isBoss(fl) ? 3 * (1 + ta('bossEss')) : 1) * tm('floorEss'),

    // ── 원정대 편성 ──
    slots: () => 3 + ta('slot'),
    roster: () => Object.keys(D.allies).filter(id => ta('ally_' + id)),
    // 영입한 순서 (새로 연 동료는 뒤에 붙는다. 붕괴로 트리가 비면 같이 비운다)
    recruits(f) {
      const have = F.roster();
      f.recruits = (f.recruits || []).filter(id => have.includes(id));
      for (const id of have) if (!f.recruits.includes(id)) f.recruits.push(id);
      return f.recruits;
    },
    lineup(f) {
      const have = F.roster(), n = F.slots();
      if (f.autoParty !== false) return AUTO.filter(id => have.includes(id)).slice(0, n);
      return (f.lineup || []).filter(id => have.includes(id)).slice(0, n);
    },
    // 자동 편성을 끄고 그 동료를 넣거나 뺀다
    toggleMember(f, id) {
      const cur = F.lineup(f);
      f.autoParty = false;
      f.lineup = cur.includes(id) ? cur.filter(x => x !== id) : cur.length < F.slots() ? [...cur, id] : cur;
      F.syncAllies(f);
    },
    setAuto(f, v) { f.autoParty = v; F.syncAllies(f); },
    // 지금 맵에 나와 있어야 할 동료: 평소엔 편성, 총공세 중엔 열어 둔 전원
    members: f => (f.buffs.assault ? [...F.lineup(f), ...F.roster().filter(id => !F.lineup(f).includes(id))] : F.lineup(f)),
    inParty: (rt, id) => rt.allies.some(a => a.id === id && !a.dead),

    // 영구 배율은 출처끼리 더한다: 1 + Σ(출처 배수 − 1) (트리·차원 넥서스·유물·시너지). 버프는 따로 곱한다.
    sum: parts => 1 + parts.reduce((a, p) => a + p[1] - 1, 0),
    parts(k) {
      const S = G.S, dim = ['차원', G.globalMult()];
      if (k === 'atk') {
        let syn = 1;
        if (G.synergy('syn_sword')) syn += 0.01 * G.Wuxia.mastery(S.w.wuxia);
        if (G.synergy('syn_madblade')) syn += 1.5 * (1 - S.w.cthulhu.san / G.Cthulhu.maxSan(S.w.cthulhu));
        return [['트리', tm('atk')], dim, ['유물', 1 + G.relicVal('f_atk')], ['시너지', syn]];
      }
      if (k === 'hp') return [['트리', tm('hp')], dim, ['유물', 1 + G.relicVal('f_hp')]];
      if (k === 'gold') return [['트리', tm('gold')], dim, ['유물', 1 + G.relicVal('f_gold')]];
      return [];
    },
    atkMult: () => F.sum(F.parts('atk')),
    // 버프(노래·함성·전쟁의 북·총공세): 걸려 있는 동안만 곱한다
    dmgMult(f) {
      let m = 1;
      for (const k in f.buffs) {
        if (k === 'atk') m *= 1.5;
        else if (k === 'assault') m *= 1 + ta('k_rally');
        else if (D.buffs[k] && D.buffs[k].dmg) m *= D.buffs[k].dmg;
      }
      return m;
    },
    heroAtk: f => 5 * F.atkMult() * F.dmgMult(f),
    heroHP: f => 60 * F.sum(F.parts('hp')),
    allyAtk: (f, a) => F.heroAtk(f) * a.def.atk * 0.5 * tm('allyAtk'),
    allyHP: (f, a) => F.heroHP(f) * a.def.hp * tm('allyHp'),
    aspd: f => tm('aspd') * (f.buffs.haste ? 1.5 : 1) * (f.buffs.static ? 1.2 : 1),
    crit: () => Math.min(0.75, 0.05 + ta('crit')),
    critD: () => 2 + ta('critd'),
    armor: () => Math.min(0.75, ta('armor')),
    regen: f => 0.01 + ta('regen') + (f.buffs.regen ? 0.04 : 0),
    goldMult: f => F.sum(F.parts('gold')) * (f.buffs.gold ? 2 : 1),
    smiteDmg: f => F.heroAtk(f) * 2 * tm('smite'),
    smiteR: () => 1 + ta('smiteR'),
    smiteCd: () => SMITE_CD * Math.max(0.3, 1 - ta('s_cd')),
    stormT: () => 8 * Math.max(0.3, 1 - ta('s_storm2')),
    // 오염: 초당 최대 체력의 비율 (정화 노드, 성역)
    corruption(f, rt) {
      const base = CORRUPT[F.band(f.floor)] || 0;
      const sanct = ta('c_sanct') && F.inParty(rt, 'cleric') ? 0.5 : 1;
      return base * Math.max(0.2, 1 - ta('purify')) * sanct;
    },
    gain(f, n) { f.gold += n; G.tally('fantasy', n); },
    // 음유시인이 번갈아 부르는 노래
    songs: () => ['atk', 'gold'].concat(ta('songWar') ? ['fury'] : ta('songRegen') ? ['regen'] : []),
    songDur: () => 8 * (1 + 0.5 * ta('b_encore')),
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
      let cd = a.def.cd;
      if (a.id === 'mage' && ta('m_quick')) cd *= 0.7;
      return cd;
    },

    // ── 층 만들기 ──
    boot(f) {
      const rt = { fx: [], ents: [], mons: [], party: [], allies: [], chests: [], phase: 'explore', reviveT: 0, smiteCd: 0, charges: 1, smiteN: 0, killN: 0, stormT: 4, warpT: WARP_CD, stopT: 6, focus: null, target: null, song: 0, floorT: 0, fields: [], volley: null, tstorm: null };
      F.newFloor(f, rt);
      return rt;
    },
    newAlly(f, id, x, y) {
      const def = D.allies[id];
      const a = { kind: 'ally', id, def, t: def.t, wpn: def.wpn, s: 0.95, bar: true, x, y, atkT: Math.random(), dead: false, reviveT: 0, skT: 3, dashT: 0, shots: 0, snipeT: 4 };
      a.max = a.hp = F.allyHP(f, a);
      return a;
    },
    newFloor(f, rt) {
      const fl = f.floor, boss = F.isBoss(fl), m = GR.dungeon(MW, MH);
      rt.map = m;
      rt.mons = [];
      rt.chests = [];
      rt.seen = new Uint8Array(m.w * m.h);
      rt.seenVer = 0;
      rt.floorT = 0;
      rt.fields = []; rt.volley = null; rt.tstorm = null;
      const st = m.start;
      const hero = rt.hero || { kind: 'hero', t: 'knight', wpn: 'w_sword', s: 1.15, bar: true };
      Object.assign(hero, { x: st.cx, y: st.cy, max: F.heroHP(f), atkT: 0, dead: false, reviveT: 0 });
      hero.hp = hero.max;
      rt.hero = hero;
      rt.undying = false;
      rt.allies = F.members(f).map((id, i) => F.newAlly(f, id, st.cx + (i % 3) - 1, st.cy + (i > 2 ? 1 : 0)));
      rt.party = [hero, ...rt.allies];
      const band = D.bands[F.band(fl)];
      const n = 10 + Math.min(12, Math.floor(fl / 4));
      const spot = () => { const room = m.rooms[1 + U.rand(m.rooms.length - 1)]; const x = room.x + U.rand(room.w), y = room.y + U.rand(room.h); return m.c[y * m.w + x] === '.' ? [x, y] : null; };
      for (let i = 0; i < n; i++) { const p = spot(); if (p) F.spawnMon(rt, fl, U.pick(band.mons), p[0], p[1], false); }
      if (boss) F.spawnMon(rt, fl, D.bosses[(fl / 5 - 1) % D.bosses.length], m.end.cx - 1, m.end.cy, true);
      // 보물상자: 층마다 트리 레벨만큼. 미믹 사냥을 배우면 30%는 미믹
      for (let i = 0; i < ta('g_chest'); i++) {
        const p = spot();
        if (p) rt.chests.push({ kind: 'obj', chest: true, t: 'x_chest', x: p[0], y: p[1], s: 0.9, mimic: ta('g_mimic') > 0 && U.chance(0.3) });
      }
      // 황금 고블린: 가끔 나타나 파티에게서 달아난다. 20초 안에 잡지 못하면 사라진다
      if (ta('g_goblin') && U.chance(0.25 + ta('g_goblin2'))) {
        const p = spot();
        if (p) F.spawnMon(rt, fl, { n: '황금 고블린', t: 'm_ggoblin' }, p[0], p[1], false, { hp: F.monHP(fl) * 2, max: F.monHP(fl) * 2, atk: 0, gold: F.monGold(fl) * 30, flee: 20, label: '황금 고블린' });
      }
      rt.phase = 'explore';
      rt.focus = null;
      rt.target = null;
      rt.room = null;
      F.refreshEnts(rt);
      F.look(rt);
      G.emit('f_floor', fl);
    },
    refreshEnts(rt) { rt.ents = [...rt.chests, ...rt.party, ...rt.mons]; },
    spawnMon(rt, fl, d, x, y, boss, extra) {
      const hp = F.monHP(fl, boss);
      const mo = {
        kind: 'mon', n: d.n, t: d.t, wpn: d.wpn, x, y, s: boss ? d.s || 1.6 : 1, hp, max: hp, atk: F.monAtk(fl, boss), gold: F.monGold(fl, boss),
        boss, aggro: false, atkT: Math.random(), bar: true, label: boss ? d.n : null, dots: [], shock: 0,
      };
      rt.mons.push(Object.assign(mo, extra));
      return mo;
    },
    // 시야: SIGHT칸 안에서 벽에 가리지 않은 칸만. 공격도 시야 안에서만 (벽 너머로 치지 않는다)
    sees: (m, a, b) => GR.los(m, a.x, a.y, b.x, b.y),
    // 지금 원정대 누군가에게 보이는 칸인가 (벼락을 내릴 수 있는 곳)
    inView(rt, x, y) {
      return rt.party.some(p => !p.dead && (p.x - x) ** 2 + (p.y - y) ** 2 <= SIGHT * SIGHT && GR.los(rt.map, p.x, p.y, x, y));
    },
    // 살아 있는 파티원 모두의 시야 안 칸을 본 칸으로 (기사가 쓰러져도 동료가 보는 곳은 밝다)
    look(rt) {
      const m = rt.map;
      let added = false;
      for (const p of rt.party) {
        if (p.dead) continue;
        const hx = Math.round(p.x), hy = Math.round(p.y);
        for (let y = hy - SIGHT; y <= hy + SIGHT; y++) for (let x = hx - SIGHT; x <= hx + SIGHT; x++) {
          if (x < 0 || y < 0 || x >= m.w || y >= m.h || (x - hx) ** 2 + (y - hy) ** 2 > SIGHT * SIGHT) continue;
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
      const keep = rt.allies.filter(a => want.includes(a.id));
      for (const id of want) if (!keep.some(a => a.id === id)) {
        keep.push(F.newAlly(f, id, h.x, h.y));
        G.fx(rt, { k: 'tile', key: 'fx_holy', x: h.x, y: h.y, t: 0.8 });
        G.J.sfx('fantasy', 'chime');
      }
      rt.allies = want.map(id => keep.find(a => a.id === id));
      rt.party = [h, ...rt.allies];
      F.refreshEnts(rt);
    },

    // ── 전투 ──
    hurt(f, rt, m, dmg, src, from) {
      if (m.hp <= 0) return;
      if (m.shock > 0) dmg *= 1.3;
      if (ta('s_focus') && rt.focus === m) dmg *= 1.2;
      if (m.mark > 0) dmg *= 1.25;
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
      if (m.hp <= 0) F.kill(f, rt, m, src);
    },
    // 지속 피해(독·화상): 같은 종류는 새로 걸면 덮어쓴다
    dot(m, kind, dps, t) {
      const d = m.dots.find(x => x.kind === kind);
      if (d) { d.dps = Math.max(d.dps, dps); d.t = t; } else m.dots.push({ kind, dps, t });
    },
    kill(f, rt, m, src) {
      let g = m.gold * F.goldMult(f);
      if (m.boss) g *= 1 + ta('g_boss');
      if (m.mimic) g *= ta('g_mimic2') ? 10 : 5;
      if (src === 'smite' && ta('s_mark')) g *= 1.5;
      // 황금열: 30마리마다 10초간 골드 ×2
      if (ta('g_fever') && ++rt.killN % 30 === 0) F.buff(f, rt, rt.hero, 'gold', 10);
      if (ta('g_jack') && U.chance(0.03)) { g *= 5; G.fx(rt, { k: 'text', x: m.x, y: m.y - 1.6, s: '대박!', col: '#ffe08a', t: 1.3, sz: 1.4, pop: true }); G.J.sfx('fantasy', 'jackpot'); }
      F.gain(f, g);
      f.kills++;
      G.fx(rt, { k: 'die', spr: m.t, x: m.x, y: m.y, s: m.s, flip: m.flip, t: 0.45 });
      G.fx(rt, { k: 'text', x: m.x, y: m.y - 1, s: '+' + U.fmt(g), col: '#ffd24a', t: 1.1, sz: m.mimic ? 1.4 : 1, pop: !!m.mimic });
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
        const g = F.monGold(f.floor) * 8 * (1 + ta('g_lucky')) * F.goldMult(f);
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
      const near = list => { let best = null, bd = 1e9; for (const o of list) { const k = far(o); if (k < bd) { bd = k; best = o; } } return best; };
      const lock = o => (rt.target = o);
      const t = rt.target, held = t && t.hp > 0 && rt.mons.includes(t) ? t : null;
      const close = o => o.aggro && GR.dist(o, h) < 6;
      if (held && close(held)) return held;
      const fight = near(rt.mons.filter(close));
      if (fight) return lock(fight);
      const chest = near(rt.chests.filter(c => rt.seen[c.y * m.w + c.x]));
      if (chest) return lock(near(rt.mons.filter(o => GR.dist(o, chest) < 4))) || chest;
      if (held) return held;
      const busy = r => rt.mons.some(o => F.inRoom(r, o)) || rt.chests.some(c => F.inRoom(r, c));
      if (!rt.room || !busy(rt.room)) rt.room = near(m.rooms.filter(busy).map(r => ({ x: r.cx, y: r.cy, r })))?.r || null;
      if (rt.room) return lock(near(rt.mons.filter(o => F.inRoom(rt.room, o)))) || near(rt.chests.filter(c => F.inRoom(rt.room, c)));
      return lock(near(rt.mons)) || near(rt.chests);
    },
    descend(f, rt) {
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

    // ── 벼락 (클릭·낙뢰 폭풍) ──
    click(f, x, y) {
      const rt = F.rt(f);
      if (rt.phase === 'dead' || rt.charges <= 0 || !F.inView(rt, x, y)) return false;
      if (rt.charges-- >= 1 + ta('s_charge')) rt.smiteCd = F.smiteCd();
      if (rt.smiteCd <= 0) rt.smiteCd = F.smiteCd();
      F.smite(f, rt, x, y, true);
      return true;
    },
    smite(f, rt, x, y, manual) {
      const over = manual && ta('s_over') && ++rt.smiteN % 5 === 0;
      const r = F.smiteR(), crit = U.chance(ta('s_crit')), dmg = F.smiteDmg(f) * (crit ? 3 : 1) * (manual ? 1 : 0.6) * (over ? 5 : 1);
      if (over) G.fx(rt, { k: 'text', x, y: y - 1.5, s: '과충전!', col: '#ffe08a', t: 1, sz: 1.4, pop: true });
      G.fx(rt, { k: 'bolt', x, y, t: 0.35, col: crit ? '#ffe08a' : '#bfe8ff' });
      G.fx(rt, { k: 'ring', x, y, r, t: 0.35, col: '#bfe8ff' });
      G.J.sfx('fantasy', 'smite');
      if (manual) G.J.shake('fantasy', crit ? 9 : 5, 0, 1, 0.2);
      const hit = rt.mons.filter(m => Math.hypot(m.x - x, m.y - y) <= r);
      for (const m of hit) F.zap(f, rt, m, dmg, { x, y: y - 1 });
      // 정전기 장막: 파티 공격 속도 / 정화의 벼락: 맞힌 수만큼 파티 회복
      if (manual && ta('s_static')) f.buffs.static = 3;
      if (ta('s_purge') && hit.length) for (const p of rt.party) if (!p.dead) p.hp = Math.min(p.max, p.hp + p.max * Math.min(0.05, 0.01 * hit.length));
      // 연쇄 번개: 맞은 적마다 주변 2마리로 튄다
      if (ta('s_chain')) {
        const done = new Set(hit);
        for (const m of hit) {
          const near = rt.mons.filter(o => !done.has(o) && GR.dist(o, m) <= 3 + ta('s_bounce')).sort((p, q) => GR.dist(p, m) - GR.dist(q, m)).slice(0, 2 + ta('s_bounce'));
          for (const o of near) { done.add(o); G.fx(rt, { k: 'chain', pts: [[m.x, m.y], [o.x, o.y]], col: '#bfe8ff', t: 0.25 }); F.zap(f, rt, o, dmg * 0.6, m); }
        }
      }
      const last = hit.filter(m => m.hp > 0).pop();
      if (last && (manual || ta('s_focus'))) rt.focus = last;
    },
    zap(f, rt, m, dmg, from) {
      if (ta('s_shock')) m.shock = 4;
      if (ta('s_stun')) m.stun = 1;
      F.hurt(f, rt, m, dmg * (m.boss ? 1 + ta('s_boss') : 1), 'smite', from);
      if (m.hp > 0 && ta('s_exec') && m.hp < m.max * 0.2) { G.fx(rt, { k: 'text', x: m.x, y: m.y - 1.2, s: '심판', col: '#ffe08a', t: 1, pop: true }); F.hurt(f, rt, m, m.hp + 1, 'smite', from); }
    },

    // ── 기술 ──
    unlocked: id => ta(SKILLS[id].need) > 0,
    // 동료 기술은 그 동료가 출전해 서 있어야 쓴다
    canCast(f, id) {
      const sk = SKILLS[id];
      return F.unlocked(id) && !(f.cds[id] > 0) && (!sk.who || F.inParty(F.rt(f), sk.who));
    },
    cast(f, id) {
      const rt = F.rt(f);
      if (!F.canCast(f, id) || rt.phase === 'dead') return false;
      f.cds[id] = SKILLS[id].cd * (id === 'meteor' && ta('m_quick') ? 0.7 : 1);
      if (id === 'heal') {
        for (const p of rt.party) if (!p.dead) { p.hp = Math.min(p.max, p.hp + p.max * 0.5); G.fx(rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.8 }); }
        G.J.sfx('fantasy', 'bell');
      } else if (id === 'rage') {
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
      } else if (id === 'volley') {
        // 화살비: 3초간 표적 주변 3칸에 0.2초마다 화살
        const tg = F.skillTarget(rt);
        rt.volley = { x: tg.x, y: tg.y, t: 3, tick: 0 };
        G.J.sfx('fantasy', 'chime');
      } else if (id === 'rhap') {
        // 광시곡: 부를 수 있는 노래를 모두 10초간
        const bard = rt.allies.find(q => q.id === 'bard');
        for (const k of F.songs()) F.buff(f, rt, bard, k, 10);
      } else if (id === 'wall') {
        const pal = rt.allies.find(q => q.id === 'paladin');
        F.buff(f, rt, pal, 'wall', 8);
        for (const mo of rt.mons) if (GR.dist(mo, pal) < 6) mo.aggro = true;
      } else if (id === 'leap') {
        // 용의 도약: 보이는 적 중 체력이 가장 많은 적에게
        const dr = rt.allies.find(q => q.id === 'dragoon'), seen = rt.mons.filter(o => F.inView(rt, o.x, o.y));
        const tg = seen.sort((p, q) => q.hp - p.hp)[0];
        if (tg) {
          G.fx(rt, { k: 'beam', x: dr.x, y: dr.y, x2: tg.x, y2: tg.y, col: '#ffe08a', w: 4, t: 0.25 });
          dr.x = tg.x + (dr.x > tg.x ? 0.8 : -0.8); dr.y = tg.y;
          G.J.shake('fantasy', 9, 0, 1, 0.25);
          F.hurt(f, rt, tg, F.allyAtk(f, dr) * 10, 'crit', dr);
        }
      } else if (id === 'tstorm') {
        rt.tstorm = { t: 5, tick: 0 };
        G.J.sfx('fantasy', 'smite');
      } else if (id === 'shadow') {
        // 그림자 처형: 체력 30% 이하인 적을 차례로 (최대 5), 없으면 가장 약한 적 ×5
        const ro = rt.allies.find(q => q.id === 'rogue'), seen = rt.mons.filter(o => F.inView(rt, o.x, o.y));
        const low = seen.filter(o => o.hp < o.max * 0.3).slice(0, 5);
        let from = ro;
        if (low.length) for (const o of low) { G.fx(rt, { k: 'beam', x: from.x, y: from.y, x2: o.x, y2: o.y, col: '#b98aff', w: 2, t: 0.2 }); F.hurt(f, rt, o, o.hp + 1, 'crit', from); from = o; }
        else { const o = seen.sort((p, q) => p.hp - q.hp)[0]; if (o) F.hurt(f, rt, o, F.allyAtk(f, ro) * 5, 'crit', ro); }
        if (from !== ro) { ro.x = from.x; ro.y = from.y; }
        G.J.sfx('fantasy', 'crit');
      } else if (id === 'meteor') {
        const tg = F.skillTarget(rt), x = tg.x, y = tg.y;
        G.fx(rt, { k: 'tile', key: 'fx_fire', x, y, t: 0.9, s: 3 });
        G.J.sfx('fantasy', 'boom');
        G.J.shake('fantasy', 10, 0, 1, 0.35);
        // 마법사 기술이라 마법사 공격력 기준 (벼락 가지가 유성까지 키우지 않게)
        const mage = rt.allies.find(q => q.id === 'mage'), dmg = mage ? F.allyAtk(f, mage) * 30 : 0;
        for (const m of [...rt.mons]) if (Math.hypot(m.x - x, m.y - y) <= 2.5) F.hurt(f, rt, m, dmg, 'smite', { x, y: y - 1 });
        if (ta('m_storm') && mage) rt.fields.push({ x, y, r: 2.5, t: 8, dps: F.allyAtk(f, mage) });
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
        if (p === rt.hero) dmg *= 1 - F.armor();
        if (p.id === 'paladin') dmg *= Math.max(0.3, 1 - ta('p_guard'));
        if (f.buffs.wall) dmg *= 0.5;
        G.J.hit('fantasy', p, 0, mo);
        G.J.lunge('fantasy', mo, p);
        G.fx(rt, { k: 'splat', x: p.x, y: p.y, dx: p.x - mo.x, dy: p.y - mo.y, n: 4, s: 0.8, t: 0.45 });
        G.fx(rt, { k: 'slash', x: p.x, y: p.y, t: 0.22, rot: Math.random() - 0.5, flip: mo.x > p.x });
        G.fx(rt, { k: 'text', x: p.x, y: p.y - 0.6, s: '-' + U.fmt(dmg), col: '#ff6b6b', t: 0.7 });
        if (p.id === 'paladin' && ta('p_counter')) F.hurt(f, rt, mo, dmg * 0.5, 'hit', p);
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
      p.reviveT = ALLY_REVIVE * (ta('c_revive') ? 0.5 : 1);
      if (rt.party.every(q => q.dead)) {
        rt.phase = 'dead';
        rt.reviveT = REVIVE;
        f.deaths++;
        G.J.sfx('fantasy', 'lose');
        G.J.shake('fantasy', 8, 1, 0, 0.4);
        G.log(`원정대가 전멸했다 (${f.floor}층)`, 'fantasy', 'bad');
      }
    },

    tick(f, dt) {
      const rt = F.rt(f);
      G.fxTick(rt, dt);
      for (const k in f.buffs) if ((f.buffs[k] -= dt) <= 0) { delete f.buffs[k]; if (k === 'assault') F.syncAllies(f); }
      for (const k in f.cds) if ((f.cds[k] -= dt) <= 0) delete f.cds[k];
      const maxCh = 1 + ta('s_charge');
      if (rt.charges < maxCh && (rt.smiteCd -= dt) <= 0) { rt.charges++; rt.smiteCd = rt.charges < maxCh ? F.smiteCd() : 0; }
      if (ta('autocast') && rt.phase !== 'dead') {
        if (rt.mons.length && F.canCast(f, 'rage')) F.cast(f, 'rage');
        for (const id of ['volley', 'rhap', 'meteor', 'leap', 'tstorm', 'shadow']) if (rt.mons.some(o => F.inView(rt, o.x, o.y)) && F.canCast(f, id)) F.cast(f, id);
        if (rt.mons.some(o => o.aggro) && F.canCast(f, 'wall')) F.cast(f, 'wall');
        if (rt.mons.length >= 4 && F.canCast(f, 'assault')) F.cast(f, 'assault');
        const ph = F.partyHP(rt);
        if (ph.hp < ph.max * 0.5 && F.canCast(f, 'heal')) F.cast(f, 'heal');
      }
      if (rt.phase === 'dead') {
        if ((rt.reviveT -= dt) <= 0) {
          if (f.deaths >= 3) {
            f.floor = Math.max(1, f.floor - 1);
            f.deaths = 0;
            G.log(`세 번 전멸했다 — ${f.floor}층으로 물러나 힘을 기른다`, 'fantasy', 'bad');
          }
          F.newFloor(f, rt);
        }
        return;
      }
      rt.floorT += dt;
      const m = rt.map, hero = rt.hero;
      const aspd = F.aspd(f), speed = 3.2 * tm('speed');
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
        if (mo.shock > 0) mo.shock -= dt;
        if (mo.mark > 0) mo.mark -= dt;
        for (const d of mo.dots) { d.t -= dt; F.hurt(f, rt, mo, d.dps * dt, 'dot', null); }
        mo.dots = mo.dots.filter(d => d.t > 0);
      }
      // 낙뢰 폭풍: 방치 중에도 일정 간격으로 근처 적에게 벼락
      if (ta('s_storm') && rt.mons.length && (rt.stormT -= dt) <= 0) {
        rt.stormT = F.stormT();
        const near = rt.mons.filter(o => GR.dist(o, hero) < 8 + ta('s_storm_r') && F.inView(rt, o.x, o.y));
        for (let k = 0; k < (ta('s_storm3') ? 2 : 1) && near.length; k++) { const t = U.pick(near); F.smite(f, rt, t.x, t.y, false); }
      }
      // 시간 왜곡 / 시간 정지
      if (ta('a_warp') && F.inParty(rt, 'archmage') && rt.mons.length && (rt.warpT -= dt) <= 0) {
        rt.warpT = WARP_CD;
        F.buff(f, rt, rt.allies.find(a => a.id === 'archmage'), 'haste', 5);
      }
      if (ta('a_stop') && F.inParty(rt, 'archmage') && rt.mons.length && (rt.stopT -= dt) <= 0) {
        rt.stopT = STOP_CD;
        const am = rt.allies.find(a => a.id === 'archmage');
        for (const o of rt.mons) if (F.inView(rt, o.x, o.y)) o.stun = 4;
        G.fx(rt, { k: 'ring', x: am.x, y: am.y, r: 6, t: 0.8, col: '#c9a6ff' });
        G.fx(rt, { k: 'text', x: am.x, y: am.y - 1.2, s: '시간 정지', col: '#c9a6ff', t: 1.3, sz: 1.2, pop: true });
      }
      // 화살비: 0.2초마다 표적 주변 3칸 안 적 하나
      const arch = rt.allies.find(a => a.id === 'archer' && !a.dead);
      if (rt.volley && (rt.volley.t -= dt) > 0 && arch) {
        if ((rt.volley.tick -= dt) <= 0) {
          rt.volley.tick = 0.2;
          const near = rt.mons.filter(o => Math.hypot(o.x - rt.volley.x, o.y - rt.volley.y) <= 3);
          if (near.length) {
            const o = U.pick(near), dmg = F.allyAtk(f, arch);
            G.fx(rt, { k: 'proj', key: 'fx_arrow', x: o.x - 1.5, y: o.y - 3, x2: o.x, y2: o.y, t: 0.18 });
            F.hurt(f, rt, o, dmg, 'hit', arch);
            if (ta('r_poison')) F.dot(o, 'poison', dmg * 0.3, 4);
          }
        }
      } else rt.volley = null;
      // 뇌우: 0.5초마다 보이는 적 셋에게 번개
      const sage = rt.allies.find(a => a.id === 'archmage' && !a.dead);
      if (rt.tstorm && (rt.tstorm.t -= dt) > 0 && sage) {
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
        for (const o of [...rt.mons]) if (Math.hypot(o.x - fd.x, o.y - fd.y) <= fd.r) F.hurt(f, rt, o, fd.dps * dt, 'dot', null);
      }
      rt.fields = rt.fields.filter(fd => fd.t > 0);
      // 몬스터: 가까이 오면 깨어나 가장 가까운 파티원을 쫓는다 (도발 중이면 성기사)
      const pal = ta('p_taunt') || f.buffs.wall ? rt.allies.find(a => a.id === 'paladin' && !a.dead) : null;
      for (const mo of [...rt.mons]) {
        mo.moving = false;
        if (mo.stun > 0) { mo.stun -= dt; continue; }
        if (mo.flee) {
          // 황금 고블린: 파티 반대쪽으로 달아나다 시간이 다 되면 사라진다
          if ((mo.flee -= dt) <= 0) { rt.mons = rt.mons.filter(o => o !== mo); F.refreshEnts(rt); G.fx(rt, { k: 'text', x: mo.x, y: mo.y - 1, s: '놓쳤다…', col: '#aaa', t: 1 }); continue; }
          const dx = mo.x - hero.x, dy = mo.y - hero.y, l = Math.hypot(dx, dy) || 1;
          if (l < 7) GR.moveTo(m, mo, U.clamp(Math.round(mo.x + dx / l * 3), 1, m.w - 2), U.clamp(Math.round(mo.y + dy / l * 3), 1, m.h - 2), 2.6, dt, 0.3);
          continue;
        }
        if (!mo.aggro && GR.dist(mo, hero) < (mo.boss ? 4 : 6) && F.sees(m, mo, hero)) mo.aggro = true;
        if (!mo.aggro) continue;
        let tg = pal && GR.dist(mo, pal) < 6 ? pal : null, bd = tg ? GR.dist(mo, tg) : 1e9;
        if (!tg) for (const p of rt.party) if (!p.dead) { const d = GR.dist(mo, p); if (d < bd) { bd = d; tg = p; } }
        if (!tg) continue;
        if (bd > 1.1 + mo.s * 0.2 || !F.sees(m, mo, tg)) { GR.moveTo(m, mo, tg.x, tg.y, mo.boss ? 1.8 : 2.2, dt, 0.6); continue; }
        mo.flip = tg.x < mo.x;
        if ((mo.atkT -= dt) <= 0) {
          mo.atkT = 1;
          F.hurtMember(f, rt, tg, mo.atk, mo);
          if (rt.phase === 'dead') return;
        }
      }
      // 기사: 지정한 적, 아니면 F.plan이 고른 적·상자. 둘 다 없으면 계단.
      hero.moving = false;
      rt.heroTg = null;
      if (!hero.dead) {
        const goal = (rt.focus && rt.focus.hp > 0) ? rt.focus : F.plan(rt);
        const chest = goal && goal.chest ? goal : null, target = chest ? null : goal;
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
        } else if (chest) {
          if (GR.moveTo(m, hero, chest.x, chest.y, speed, dt, 0.9)) F.openChest(f, rt, chest);
        } else if (GR.moveTo(m, hero, m.end.cx, m.end.cy, speed, dt, 0.2)) {
          F.descend(f, rt);
          return;
        }
      }
      F.look(rt);
      // 동료: 기사가 노리는 적을 함께 친다 (파티가 갈라져 따로 싸우지 않게). 기사가 싸우지 않을 땐 따라다닌다.
      // 기사가 쓰러지면 각자 가까운 적과 싸우며 살아 있는 전열(성기사·용기병)을 따르고,
      // 전열도 없으면 제자리를 지킨다 — 쓰러진 기사(대개 적 한가운데)를 따라가 후열이 적진에 뛰어들지 않게
      const front = hero.dead ? rt.allies.find(q => !q.dead && (q.id === 'paladin' || q.id === 'dragoon')) : hero;
      for (const a of rt.allies) {
        const lead = front || a;
        a.moving = false;
        if (a.dead) continue;
        const def = a.def;
        if (a.dashT > 0) a.dashT -= dt;
        // 레인저 저격: 12초마다 보이는 적 중 체력이 가장 많은 적에게 ×8
        if (a.id === 'archer' && ta('r_snipe') && rt.mons.length && (a.snipeT -= dt) <= 0) {
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
          F.buff(f, rt, a, k, F.songDur() * (k === 'fury' ? 0.6 : 1));
        }
        if (def.heal) {
          // 수도사: 가장 다친 파티원을 치유
          if ((a.atkT -= dt) <= 0) {
            let low = null;
            for (const p of rt.party) if (!p.dead && p.hp < p.max * 0.9 && (!low || p.hp / p.max < low.hp / low.max)) low = p;
            a.atkT = low ? def.cd : 0.3;
            if (low && ta('c_mass') && ++a.shots % 5 === 0) {
              for (const p of rt.party) if (!p.dead) { p.hp = Math.min(p.max, p.hp + p.max * def.heal); G.fx(rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.5 }); }
            } else if (low) {
              low.hp = Math.min(low.max, low.hp + low.max * def.heal);
              G.J.lunge('fantasy', a, low);
              G.fx(rt, { k: 'tile', key: 'fx_holy', x: low.x, y: low.y, t: 0.5 });
            }
          }
          if (lead !== a && GR.dist(a, lead) > 1.8) GR.moveTo(m, a, lead.x, lead.y, speed * 1.1, dt, 1.4);
          continue;
        }
        const range = def.range;
        const prefer = ta('s_focus') && rt.focus && rt.focus.hp > 0 && GR.dist(rt.focus, a) < range + 4 ? rt.focus : null;
        const tg = hero.dead ? prefer || F.nearestMon(rt, a, range + 4) : rt.heroTg;
        if (tg && (!hero.dead || GR.dist(tg, lead) < 9)) {
          // 원거리: 적이 바로 붙으면 한 걸음 물러나 쏜다 (앞에 막아 줄 동료가 있을 때만 — 혼자면 그냥 싸운다)
          if (range >= 3 && GR.dist(a, tg) < 1.4 && rt.party.some(q => !q.dead && q !== a && GR.dist(q, tg) < 2.5)) {
            const dx = a.x - tg.x, dy = a.y - tg.y, l = Math.hypot(dx, dy) || 1;
            const bx = U.clamp(Math.round(a.x + dx / l * 2), 1, m.w - 2), by = U.clamp(Math.round(a.y + dy / l * 2), 1, m.h - 2);
            if (GR.pass(m, bx, by)) { GR.moveTo(m, a, bx, by, speed, dt, 0.3); continue; }
          }
          // 용기병 돌진: 사거리 밖 6칸 안의 적에게 뛰어든다
          if (a.id === 'dragoon' && ta('d_dash') && a.dashT <= 0 && GR.dist(a, tg) > range && GR.dist(a, tg) <= 6 && F.sees(m, a, tg)) {
            a.dashT = DASH_CD;
            G.fx(rt, { k: 'beam', x: a.x, y: a.y, x2: tg.x, y2: tg.y, col: '#ffe08a', w: 3, t: 0.2 });
            a.x = tg.x + (a.x > tg.x ? 0.8 : -0.8); a.y = tg.y;
            a.atkT = 0; a.dashHit = true;
          }
          // 사거리 밖이거나 벽에 가리면 다가간다 (보이는 자리까지)
          if (GR.dist(a, tg) > range) { GR.moveTo(m, a, tg.x, tg.y, speed, dt, range * 0.8); continue; }
          if (!F.sees(m, a, tg)) { GR.moveTo(m, a, tg.x, tg.y, speed, dt, 0.6); continue; }
          a.flip = tg.x < a.x;
          if ((a.atkT -= dt * aspd) <= 0) {
            a.atkT = F.allyCd(a);
            F.allyAttack(f, rt, a, tg);
          }
        } else if (lead !== a && GR.dist(a, lead) > 1.8) GR.moveTo(m, a, lead.x, lead.y, speed * 1.1, dt, 1.4);
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
      if (a.id === 'archer') {
        F.hurt(f, rt, tg, dmg, 'hit', a);
        if (ta('r_poison')) F.dot(tg, 'poison', dmg * 0.3, 4);
        if (ta('r_pierce') && ++a.shots % 4 === 0) for (const o of rt.mons.filter(o => o !== tg && GR.dist(o, tg) <= 2).slice(0, 2)) F.hurt(f, rt, o, dmg * 0.6, 'hit', a);
      } else if (def.splash) {
        const r = def.splash;
        G.fx(rt, { k: 'ring', x: tg.x, y: tg.y, r, t: 0.3, col: '#ff8a3a' });
        for (const mo of [...rt.mons]) if (GR.dist(mo, tg) <= r) { F.hurt(f, rt, mo, dmg, 'hit', a); if (ta('m_burn')) F.dot(mo, 'burn', dmg * 0.25, 3); }
      } else if (def.chain) {
        const over = ta('a_overload') > 0, n = def.chain + (over ? 2 : 0);
        const hit = rt.mons.slice().sort((p, q) => GR.dist(p, tg) - GR.dist(q, tg)).slice(0, n);
        G.fx(rt, { k: 'chain', pts: [[a.x, a.y], ...hit.map(o => [o.x, o.y])], col: '#c9a6ff', t: 0.2 });
        hit.forEach((mo, i) => F.hurt(f, rt, mo, dmg * (over ? 1 : Math.pow(0.85, i)), 'hit', a));
      } else if (a.id === 'dragoon') {
        if (a.dashHit) { dmg *= 3; a.dashHit = false; }
        const c = U.chance(0.15);
        if (ta('d_exec') && tg.hp < tg.max * 0.25) { G.fx(rt, { k: 'text', x: tg.x, y: tg.y - 1.2, s: '처형', col: '#ffe08a', t: 1, pop: true }); dmg = tg.hp + 1; }
        F.hurt(f, rt, tg, dmg * (c ? F.critD() : 1), c ? 'crit' : 'hit', a);
        if (ta('d_breath')) for (const o of rt.mons.filter(o => o !== tg && GR.dist(o, tg) <= 1.5)) F.hurt(f, rt, o, dmg * 0.6, 'hit', a);
      } else if (a.id === 'rogue') {
        // 암살자: 빠른 칼질, 때릴 때마다 골드를 훔친다 / ★쌍검(한 번 더 60%) ↔ 표식(4초간 받는 피해 +25%)
        F.hurt(f, rt, tg, dmg, 'hit', a);
        if (ta('ro_twin') && tg.hp > 0) F.hurt(f, rt, tg, dmg * 0.6, 'hit', a);
        if (ta('ro_mark')) tg.mark = 4;
        if (ta('ro_steal')) F.gain(f, F.monGold(f.floor) * ta('ro_steal') * F.goldMult(f));
      } else F.hurt(f, rt, tg, dmg, 'hit', a);
    },
    view(f) {
      const rt = F.rt(f), b = F.band(f.floor), m = rt.map;
      if (m._band !== b) { m._band = b; m.ver++; }
      return {
        map: m, ents: rt.ents, fx: rt.fx, cam: rt.hero.dead ? rt.party.find(p => !p.dead) || rt.hero : rt.hero, viewH: 13, center: true, dimAll: rt.phase === 'dead',
        fog: { seen: rt.seen, ver: rt.seenVer, light: rt.hero.dead ? rt.party.find(p => !p.dead) || rt.hero : rt.hero },
        mini: { seen: rt.seen, ver: rt.seenVer, end: m.end, party: rt.party, mons: rt.mons },
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
