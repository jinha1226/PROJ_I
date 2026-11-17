'use strict';
// 판타지 · 끝없는 던전 (2D 던전 맵, 자동 전투)
// 층마다 방과 복도로 된 던전이 새로 생긴다. 원정대(단장 + 출전 동료)가 몬스터를 찾아가 싸우고, 모두 잡으면 계단으로 내려간다.
// 4층부터 2층마다 계단 앞에 보스 (층이 넓어 한 층이 예전 2.5층 — F.depth). 파티원은 각자 체력이 있고 쓰러지면 잠시 뒤 일어난다. 전원이 쓰러지면 패배(같은 층 다시, 세 번이면 한 층 후퇴).
// 6층부터 던전 오염이 파티 전원의 체력을 최대치의 %씩 계속 깎는다(깊을수록 짙다). 재생·치유·정화로 버틴다.
// 동료는 트리에서 열고, 출전 칸(단장 + 3명, 트리로 +)에 들어간 동료만 싸운다. 기본은 자동 편성.
// 맵 클릭 = 벼락 일격. 동료별 기술과 ★택1 짝 노드는 트리에서. 단장 주변 칸은 「본 칸」으로 남는다(안개·미니맵).
G.RT = G.RT || {};
G.Fantasy = (() => {
  const D = G.D.F, U = G.U, GR = G.Grid;
  // 층은 넓고 길게 (DESIGN.md 30): 라이벌이 멀리서 다가오는 게 보이고, 마주침이 사건이 되게. 몬스터 수·층 정수는 그만큼 키운다
  // 넓어진 층 하나 = 예전 DEPTH_K층: 몬스터 세기·골드·정수·구간은 깊이(F.depth)를 따르고, 보스는 BOSS_EVERY층마다
  const HEAL_REACH = 6, CHAIN_HOP = 3, TRAIL_STEP = 0.4, TRAIL_MAX = 60, TRAIL_GAP = 1.6, BASE_CHEST = 1, RICH_K = 1.5, HALL_K = 0.6, STAIR_WAIT = 1.4, MW = 64, MH = 40, ROOMS = 14, LOOPS = 3, MON_K = 2.5, DEPTH_K = 2.5, BOSS_EVERY = 2, FIRST_BOSS = 4, REVIVE = 4, ALLY_REVIVE = 8, SIGHT = 7, SONG_CD = 12, WARP_CD = 15, SNIPE_CD = 12, STOP_CD = 30, DASH_CD = 5, SKIP_T = 50;
  // 성격 (DESIGN.md 42): 겁쟁이 — 체력 기준 · 확률 · 물러서는 초 / 다혈질 — 확률 · 뛰어드는 초 · 첫 타 배율
  const COWARD_AT = 0.3, COWARD_P = 0.6, COWARD_T = 3, HOT_P = 0.2, HOT_T = 2, HOT_HIT = 1.5;
  // 구간별 오염: 초당 최대 체력의 몇 %
  // 상태이상 (DESIGN.md 43): 지속 피해 셋은 dots, 나머지는 몸의 타이머. 받아치는 것은 G.Combo
  const DOTS = ['poison', 'burn', 'bleed'], SHOCK = 0.6;
  // 자동 편성 우선순위: 치유가 있어야 오염을 버티므로 수도사 먼저, 길잡이(탐험), 그다음 강한 순
  const FORM_GAP = 1.3; // 진형 한 칸의 간격
  const FORM_RUSH = 1.4;
  const ENGAGE = 2.5; // 단장이 공격 거리 + 이만큼 안에 들면 동료도 진형을 풀고 달려든다
  const AUTO = ['cleric', 'scout', 'archmage', 'rogue', 'dragoon', 'paladin', 'barbarian', 'monk', 'warlock', 'mage', 'bard', 'archer'];

  const F = {
    AUTO,
    init(head = 0) {
      return { floor: 1, maxFloor: 1, gold: 60 * Math.pow(10, head), deaths: 0, auto: true, explore: 'full', kills: 0, autoParty: true, lineup: [], mercs: [], nextUid: 0,
        // 원정 (G.Exp): 마을에서 시작한다. 짐·체크포인트·출발층·귀환 방침·자동 출발
        town: true, carry: 0, checkpoint: 1, start: 1, retreat: 'hp30', autoGo: true };
    },
    rt(f) { return G.RT.fantasy || (G.RT.fantasy = F.boot(f)); },
    depth: fl => 1 + (fl - 1) * DEPTH_K,
    // 보스: FIRST_BOSS층부터 BOSS_EVERY층마다 (첫 원정이 둘만으로 보스 벽에 막히지 않게)
    isBoss: fl => fl >= FIRST_BOSS && fl % BOSS_EVERY === 0,
    band: fl => D.bands.findIndex(b => F.depth(fl) <= b.to),
    // 그 구간 몬스터의 평균 체력 (우두머리 · 미믹 · 황금 고블린이 기준으로 쓴다)
    // 층의 난이도는 그 층에 맞는 파티 레벨로 나타낸다 (SRD 조우 예산의 기준. DESIGN.md 121)
    floorLv: fl => U.clamp(Math.round(fl * 0.8), 1, 20),
    monHP: fl => { const b = D.bands[F.band(fl)].mons; return b.reduce((s, m) => s + G.SRD_MON[D.STAT[m.n][0]].hp, 0) / b.length; },
    monAtk: () => 1, // 몬스터의 atk는 SRD 주사위에 곱하는 배율: 언제나 1
    // 금화는 SRD GP. SRD에 드롭표가 없어 값은 게임 규칙이다: 사건의 값 기준은 그 층의 조우 예산에 비례 (DESIGN 참고)
    monGold: (fl, boss) => Math.max(1, G.Region.BUDGET[F.floorLv(fl) - 1][1] * 0.02) * (boss ? 10 : 1),

    // ── 원정대 편성 (용병 한 사람 한 사람 — G.Guild) ──
    slots: () => 3, // 턴제는 단장 + 3명(네 명이 한 판을 읽기 좋다) · 원정대는 단장 + 4명, 다섯이 기본 (DESIGN.md 67)
    // 고용한 순서 (초상 줄 순서)
    recruits: f => f.mercs.map(m => m.uid),
    // 출전 명단(용병 uid): 자동이면 G.Guild.autoPick, 아니면 직접 고른 것 중 다치지 않은 사람
    lineup(f) {
      const n = F.slots();
      if (f.autoParty !== false) return G.Guild.autoPick(f, n);
      const ok = new Set(G.Guild.ready(f).map(m => m.uid));
      return (f.lineup || []).filter(u => ok.has(u)).slice(0, n);
    },
    // 진형 (DESIGN.md 67): uid → 칸 0~8. 윗줄(0~2)이 전열, 왼쪽→오른쪽은 진행 방향 기준. 단장 + 출전만 칸을 갖는다 (레이드 둘째 파티는 자동)
    formation(f) {
      const form = f.form || (f.form = {}), mem = f.formMem || (f.formMem = {}), L = G.Guild.leader(f), want = [L.uid, ...F.lineup(f)];
      // 명단에서 빠진 사람(부상 · 교체)의 자리는 기억해 두었다가, 돌아오면 그 칸이 비어 있는 한 되돌린다
      for (const u of Object.keys(form)) if (!want.some(w => String(w) === u)) { mem[u] = form[u]; delete form[u]; }
      for (const u of want) if (form[u] == null && mem[u] != null) { if (!Object.values(form).includes(mem[u])) form[u] = mem[u]; delete mem[u]; }
      for (const u of want) if (form[u] == null) {
        const m = G.Guild.get(f, u), def = G.Guild.def(m), used = new Set(Object.values(form));
        const row = G.Tactics.HOME_ROW[G.Tactics.roleOf(m)]; // 기본 자리는 역할로: 위저드가 앞줄에 서지 않는다
        const cell = [row, row + 1, row - 1, row + 2, row - 2].filter(r => r >= 0 && r < 3).flatMap(r => [1, 0, 2].map(c => r * 3 + c)).find(c => !used.has(c));
        form[u] = cell;
      }
      return form;
    },
    // 그 칸으로 옮긴다. 누가 있으면 자리를 바꾼다
    setCell(f, uid, cell) {
      const form = F.formation(f), other = Object.keys(form).find(u => form[u] === cell);
      if (other != null) form[other] = form[uid];
      form[uid] = cell;
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
    // 원정 중 합류 (철창에서 구한 사람 등): 용병단에 넣고, 출전 칸이 남으면 이번 원정에 바로 함께 간다
    join(f, m) { f.mercs.push(m); const cur = F.lineup(f); if (f.autoParty === false && cur.length < F.slots()) f.lineup = [...cur, m.uid]; F.syncAllies(f); },
    members: f => [...F.lineup(f), ...F.subParty(f)],
    // 레이드 (DESIGN.md 64 · 픽 미 업의 다중 파티): 보스 층에는 대기 인원으로 둘째 파티가 함께 들어간다 — 출전 칸만큼, 레벨 높은 순
    raid: f => !f.town && F.isBoss(f.floor),
    subParty(f) {
      if (!F.raid(f)) return [];
      const line = F.lineup(f);
      return G.Guild.ready(f).filter(m => !line.includes(m.uid)).sort((a, b) => b.lv - a.lv).slice(0, F.slots()).map(m => m.uid);
    },
    // 출전 중인 직업들 (동료 기술 단추)
    memberClasses: f => F.members(f).map(u => G.Guild.get(f, u)?.cls).filter(Boolean),
    inParty: (rt, id) => rt.allies.some(a => a.id === id && !a.dead),

    // 힘의 출처 (DESIGN.md 62): 이름값(누적 명성) × 대장간. 금 트리는 수치를 올리지 않는다
    // 단장 (DESIGN.md 63): 던전의 rt.hero는 단장의 몸 — 수치는 동료와 같은 식
    leadBody(f) { const rt = G.RT.fantasy, L = G.Guild.leader(f); return rt && rt.hero && rt.hero.merc === L ? rt.hero : { kind: 'hero', merc: L, def: G.Guild.def(L) }; },
    heroAtk: f => F.allyAtk(f, F.leadBody(f)),
    heroHP: f => F.allyHP(f, F.leadBody(f)),
    // 평균 한 대 (SRD 주사위 + 능력 수정치). 성장 배율을 곱하지 않는다 (DESIGN.md 121)
    allyAtk: (f, a) => (a.merc ? G.Dnd.avg(G.Dnd.weapon(a)) : 3), // SRD: 무기 피해 평균 그대로 (배율 없음). 굴림은 rollK가 평균 대비로 준다
    allyHP: (f, a) => (a.merc ? G.Dnd.srdHP(a.merc) + (a.merc.feast || 0) : 30), // 영웅의 연회: 최대 체력 +2d10
    crit: () => 0.05,
    critD: () => 2,
    armor: () => 0,
    // 초반 층은 작게 (첫 층이 몇 분씩 걸리지 않게): 44×28 방 9 → 52×32 방 11 → 64×40 방 14, 몬스터 수도 방 수에 비례
    rooms: fl => (fl <= 1 ? 9 : fl === 2 ? 11 : ROOMS),
    dims: fl => (fl <= 1 ? [44, 28] : fl === 2 ? [52, 32] : [MW, MH]),
    // 시야
    sight: () => SIGHT + (G.RT.fantasy ? G.Season.sightBonus(G.RT.fantasy) : 0),
    // 원정 중에 번 골드는 짐으로 (귀환하면 금고로 — G.Exp)
    gain(f, n) { if (f.town) f.gold += n; else G.Exp.stow(f, n); G.tally('fantasy', n); },
    // 음유시인이 번갈아 부르는 노래
    // 파티 합산: 체력·초당 피해 (화면 표시용)
    partyHP(rt) {
      let hp = 0, max = 0;
      for (const p of rt.party) { max += p.max || 0; if (!p.dead) hp += Math.max(0, p.hp); }
      return { hp, max };
    },


    // ── 층 만들기 ──
    boot(f) {
      const rt = { fx: [], ents: [], mons: [], party: [], allies: [], chests: [], rivals: [], phase: 'explore', reviveT: 0, killN: 0, warpT: WARP_CD, stopT: 6, focus: null, target: null, song: 0, floorT: 0, fields: [], volley: null, tstorm: null, traps: [] };
      F.newFloor(f, rt);
      // 마을에 있던 저장(처음 시작 포함): 층은 깔아 두되 비워 둔다
      if (f.town) { rt.phase = 'town'; rt.mons = []; rt.chests = []; F.refreshEnts(rt); }
      return rt;
    },
    // 용병 uid → 맵 위 몸. id는 직업(기술·택1 노드가 직업으로 묶인다), uid·merc는 그 사람
    // 단장의 몸에 지금 직업 · 그림을 입힌다 (만들기 · 서브클래스가 바뀌면 다시)
    dressHero(f, hero) {
      const L = G.Guild.leader(f), def = G.Guild.def(L);
      Object.assign(hero, { merc: L, id: L.cls, uid: L.uid, def, t: G.Guild.tile(L), wpn: def.wpn, skT: hero.skT ?? 3 });
      if (!hero.cds) hero.cds = {};
    },
    newAlly(f, uid, x, y) {
      const merc = G.Guild.get(f, uid), id = merc.cls, def = G.Guild.def(merc);
      const a = { kind: 'ally', id, uid, merc, def, t: G.Guild.tile(merc), wpn: def.wpn, s: 0.95, bar: true, x, y, atkT: Math.random(), dead: false, reviveT: 0, skT: 3, dashT: 0, shots: 0, snipeT: 4, cds: {}, gcd: 1 };
      a.max = a.hp = F.allyHP(f, a);
      return a;
    },
    newFloor(f, rt) {
      // 떠나는 층의 지도 지식을 남기고, 이 시즌의 같은 층은 같은 모양으로 (G.Season)
      G.Season.save(f, rt);
      const fl = f.floor, boss = F.isBoss(fl) && !G.Region.of(f), rooms = F.rooms(fl), rng = G.Season.rng(f, fl), [mw, mh] = F.dims(fl), reg = G.Region.of(f), m = reg ? reg.gen(mw, mh, rng, f) : GR.layout(GR.layoutOf(G.Season.st(f).seed, fl), mw, mh, Math.ceil(rooms * HALL_K), LOOPS, rng); // 층마다 짓는 법이 다르다 (DESIGN.md 145)
      rt.map = m;
      rt.mons = [];
      rt.chests = [];
      rt.seenVer = rt.seenVer || 0;
      G.Season.load(f, rt, fl);
      if (reg) rt.seen = new Uint8Array(m.w * m.h); // 지역 지도는 원정마다 새로
      rt.floorT = 0;
      rt.fields = []; rt.traps = []; rt.pathShown = rt.chestShown = false; rt.hpHist = [];
      G.Guild.newFloor(f);
      F.formation(f);
      if (!rt.carryHp) G.Res.longRest(f.mercs.concat(G.Guild.leader(f))); // 출발 · 첫 원정: 전부 찬다. 그 밖에 층을 내려갈 때는 차지 않는다 (G.Camp)
      const st = m.start;
      const hero = rt.hero || { kind: 'hero', s: 1.15, bar: true, cds: {}, gcd: 1 };
      F.dressHero(f, hero);
      Object.assign(hero, { x: st.cx, y: st.cy, atkT: 0, dead: false, reviveT: 0 });
      hero.max = F.heroHP(f);
      hero.hp = hero.max;
      rt.hero = hero;
      rt.undying = false;
      // 스킬 쿨다운은 층을 넘어 이어진다
      const old = rt.allies || [];
      rt.allies = F.members(f).map((uid, i) => Object.assign(F.newAlly(f, uid, st.cx + (i % 3) - 1, st.cy + (i > 2 ? 1 : 0)), { cds: old.find(o => o.uid === uid)?.cds || {} }));
      rt.party = [hero, ...rt.allies];
      // 둘째 파티는 하늘색 고리
      const line1 = F.lineup(f);
      for (const a of rt.allies) if (!line1.includes(a.uid)) Object.assign(a, { sub: true, ring: '#7fd0ff' });
      const n = Math.round(MON_K * (10 + Math.min(12, Math.floor(fl / 4))) * rooms / ROOMS);
      const spot = () => { const room = m.rooms[1 + U.rand(m.rooms.length - 1)]; const x = room.x + U.rand(room.w), y = room.y + U.rand(room.h); return m.c[y * m.w + x] === '.' ? [x, y] : null; };
      if (!reg) G.Foe.populate(rt, fl, m, n);
      if (boss) {
        F.spawnMon(rt, fl, G.Foe.bossFor(G.S.w.fantasy, fl), m.end.cx - 1, m.end.cy, true);
      }
      // 보물상자: 층마다 트리 레벨만큼. 미믹 사냥을 배우면 30%는 미믹
      // 보물 방: 시즌마다 고정 (같은 층이면 같은 방들). 자리는 방 안에서 그때그때
      const tRooms = m.rooms.slice(1, -1).map(r => [rng(), r]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      // 턴제는 스킬이 없어도 층마다 기본 상자가 있다
      const chestN = BASE_CHEST;
      m.treasure = tRooms.slice(0, chestN);
      for (let i = 0; i < chestN && tRooms.length; i++) {
        const room = tRooms[i % tRooms.length]; let p = [room.x + U.rand(room.w), room.y + U.rand(room.h)];
        for (let t = 0; m.c[p[1] * m.w + p[0]] !== '.' && t < 12; t++) p = [room.x + U.rand(room.w), room.y + U.rand(room.h)]; // 기둥 · 모서리를 피한다
        if (m.c[p[1] * m.w + p[0]] === '.') rt.chests.push({ kind: 'obj', chest: true, t: 'x_chest', x: p[0], y: p[1], s: 0.9, mimic: false });
      }
      rt.phase = 'explore';
      rt.focus = null; rt.rally = null; rt.rush = false;
      rt.target = null;
      rt.room = null;
      G.Turn.stage(f, rt);
      rt.monTotal = rt.mons.length;
      G.Mission.start(f, rt);
      F.refreshEnts(rt);
      F.look(rt);
      G.emit('f_floor', fl);
    },
    refreshEnts(rt) { rt.ents = [...rt.chests, ...(rt.sums || []), ...(rt.traps || []), ...G.Mission.ents(rt), ...G.Explore.ents(rt), ...rt.party, ...rt.mons]; },
    spawnMon(rt, fl, d, x, y, boss, extra) {
      const st = G.Foe.stat(d), sc = 1, hp = st.block.hp; // 체력 · 피해는 능력치표 그대로 (DESIGN.md 121). 어려움은 G.Foe.encounter의 CR과 수로
      const mo = {
        kind: 'mon', n: d.n, t: d.t, wpn: d.wpn, ty: d.ty, role: st.role, tr: st.tr, hand: st.hand, stat: st.block, scale: sc, x, y, s: boss ? d.s || 1.6 : d.s || 1, hp, max: hp, atk: 1, gold: G.Items.coinOf(st.block, d.ty),
        boss, aggro: false, atkT: Math.random(), bar: true, label: boss ? d.n : null, dots: [],
      };
      rt.mons.push(Object.assign(mo, extra));
      return mo;
    },
    // 시야: F.sight()칸 안에서 벽에 가리지 않은 칸만. 공격도 시야 안에서만 (벽 너머로 치지 않는다)
    // 턴제는 실제 위치를 잇는 선도 본다: 격자 시야로는 통과해도 선이 벽을 3/4칸 넘게 지나면 안 보인다
    sees: (m, a, b) => {
      if (!GR.los(m, a.x, a.y, b.x, b.y)) return false;
      const n = Math.ceil(GR.dist(a, b) * 8);
      let w = 0;
      for (let i = 1; i < n; i++) if (!GR.clear(m, Math.round(a.x + (b.x - a.x) * i / n), Math.round(a.y + (b.y - a.y) * i / n)) && ++w >= 6) return false;
      return true;
    },
    // 지금 원정대 누군가에게 보이는 칸인가 (벼락을 내릴 수 있는 곳)
    inView(rt, x, y) {
      const S = F.sight();
      return rt.party.some(p => !p.dead && (p.x - x) ** 2 + (p.y - y) ** 2 <= S * S && GR.los(rt.map, p.x, p.y, x, y));
    },
    // 살아 있는 파티원 모두의 시야 안 칸을 본 칸으로 (단장가 쓰러져도 동료가 보는 곳은 밝다)
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
    // 편성이 바뀌면(트리 구매·직접 편성) 지금 층에도 바로 반영: 빠진 동료는 돌아가고 새 동료가 단장 옆에 합류
    syncAllies(f) {
      F.formation(f);
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
      if (m.ethereal) return; // 에테르 · 빙의 (SRD): 이쪽 세계의 것이 닿지 않는다
      if (m.endOnDmgBy && from && from.kind !== 'mon' && m.cond) { delete m.cond.charmed; m.endOnDmgBy = null; } // 매혹 (SRD): 시전자나 동료가 해치면 끝
      if (m.repDmg?.length && dmg > 0) m.repDmg = m.repDmg.filter(q => { if (!G.Dnd.has(m, q.k)) return false; if (G.Dnd.save(m, q.ab, q.dc)) { delete m.cond[q.k]; if (q.k === 'paralyzed') m.stop = 0; return false; } return true; }); // 피해를 받을 때마다 다시 내성
      G.MonAct.hurt(f, rt, m, dmg, from);
      // 턴제: 벽 너머로는 맞지 않는다 (광역 · 연쇄 포함)
      if (from && from.x != null && from !== m && !F.sees(rt.map, from, m)) return;
      if (m.hp <= 0) return;
      // 매복 · 집중 표적은 피해를 곱하지 않고 명중 굴림에 이점을 준다 (G.Dnd.adv)
      // 피해 종류 (SRD): 지금 공격의 종류가 저항 · 약점 · 면역에 닿으면 표시한다
      const dtype = G.Skill.dtOver || G.Foe.dtype || (from?.merc ? G.Dnd.weapon(from).t : null), tk = G.Foe.typeK(m, dtype, from);
      if (m.max0 == null) m.max0 = m.max;
      if (from && m._minorBy === from && src !== 'extra') { m._minorBy = null; const t0 = G.Foe.dtype, n = G.Dnd.bsum(from, 'minorD'), ty = ['acid', 'cold', 'fire', 'lightning'].sort((a, b) => G.Foe.typeK(m, b, from) - G.Foe.typeK(m, a, from))[0]; G.Foe.dtype = ty; F.hurt(f, rt, m, G.Dnd.dice(n, 8), 'extra', from); G.Foe.dtype = t0; if (m.hp <= 0) return; } /* 하급 원소: +2d8, 가장 잘 드는 종류 */
      if (src !== 'dot') G.Foe.split(f, rt, m, dtype); // 번개 · 베기에 분열 (면역이어도)
      if (tk === 0 && m.stat?.absorb && m.stat.absorb === dtype) { const h = Math.min(m.max - m.hp, dmg); m.hp += h; G.fx(rt, { k: 'text', x: m.x, y: m.y - 1.1, s: `흡수 +${U.fmt(h)}`, col: '#9fe79f', t: 0.8, sz: 0.75 }); return; } // 슈블링 마운드: 번개를 흡수
      if (tk !== 1) { dmg *= tk; G.fx(rt, { k: 'text', x: m.x, y: m.y - 1.1, s: tk === 0 ? '면역' : tk < 1 ? '저항' : '약점!', col: tk > 1 ? '#ffd24a' : '#9aa0a8', t: 0.7, sz: 0.7 }); if (tk === 0) return; }
      if (src !== 'dot') G.Foe.thorn(f, rt, m, from); // 검은 푸딩: 근접으로 맞히면 산성 1d8
      m.lastType = dtype; if ((m.stat?.regenStop?.length ? m.stat.regenStop : ['fire', 'acid']).includes(dtype)) m.noRegen = true; /* 재생을 멈추는 피해 (SRD 능력치표) */
      // 사냥꾼의 표식 · 헥스: 건 사람이 맞히면 +40%
      if (from && m.hm && m.hm.by === from && m.hm.until > G.S.runTime && src !== 'dot') dmg += G.Dnd.dice(1, F.sk(from, 'ft_slayer') ? 10 : 6); // 사냥꾼의 표식 · 헥스: +1d6
      // SRD: 피해는 정수다. 배율이 남긴 소수는 내린다(저항의 절반처럼). 지속 피해는 조각을 모아 1이 되면 깎는다
      if (src === 'dot') { m._dotAcc = (m._dotAcc || 0) + dmg; dmg = Math.floor(m._dotAcc); m._dotAcc -= dmg; if (dmg <= 0) return; } else dmg = Math.max(0, Math.floor(dmg));
      if (m.images > 0 && m.imagesT > G.S.runTime && (src === 'hit' || src === 'crit')) { let img = false; for (let i = 0; i < m.images; i++) if (G.Dnd.dice(1, 6) >= 3) img = true; if (img) { m.images--; G.fx(rt, { k: 'text', x: m.x, y: m.y - 1.1, s: '분신이 맞았다', col: '#c9a6ff', t: 0.8, sz: 0.75 }); return; } } // 거울상 (SRD)
      if (m.thp > 0) { const a = Math.min(m.thp, dmg); m.thp -= a; dmg -= a; if (m.thp <= 0 && m.polyFrom) { m.stat = m.polyFrom; m.polyFrom = null; } } // 임시 체력 (SRD) · 다형 변신이 풀린다
      m.hp -= dmg;
      if (dmg > 0 && m.endOnDmg) { if (m.cond) for (const k of m.endOnDmg) delete m.cond[k]; m.endOnDmg = null; m.sleep = null; } // 피해를 받으면 끝나는 상태 (SRD: 수면 · 최면 무늬 · 언데드 퇴치)
      if (m.koHit) { m.koHit = false; m.stop = 0; } // 교묘한 일격: 맞으면 깬다
      G.Foe.heads(rt, m, dtype, dmg); // 히드라 (SRD): 한 턴 25 피해에 머리 하나
      if (m.hp > 0) G.Foe.split(f, rt, m, null); // 절반 이하가 되면 분열
      m.aggro = true;
      m.spotted = true; // 맞은 적은 보인다: 범위 공격에 맞아 끼어든 옆 무리도 전투 상대다
      // 숫자 크기로 위계: 치명타·벼락은 크게 튀고, 보통 타격은 체력 대비 피해만큼 커진다
      const big = src !== 'hit' && src !== 'dot';
      if (src !== 'dot' || Math.random() < 0.3) G.fx(rt, { k: 'text', x: m.x, y: m.y - 0.6, s: U.fmt(dmg) + (src === 'crit' ? '!' : ''), col: src === 'crit' ? '#ffd24a' : src === 'smite' ? '#bfe8ff' : src === 'dot' ? '#9fe79f' : '#fff', t: 0.8, sz: (big ? 1.3 : src === 'dot' ? 0.7 : 0.85) + 0.5 * Math.min(1, dmg / m.max), pop: big });
      if (src !== 'dot') {
        G.J.hit('fantasy', m, src === 'smite' ? 0.5 : src === 'crit' ? 0.25 : 0, from, dmg);
        const dx = from ? m.x - from.x : 0, dy = from ? m.y - from.y : 0;
        G.fx(rt, { k: 'splat', x: m.x, y: m.y, dx, dy, n: big ? 9 : 5, s: big ? 1.3 : 0.9, t: 0.5 });
        if (big) G.fx(rt, { k: 'impact', x: m.x, y: m.y - 0.1, s: src === 'smite' ? 1.8 : 1.4, col: src === 'smite' ? '#d8f0ff' : '#fff3b0', t: 0.22 });
      }
      if (src === 'crit') G.J.sfx('fantasy', 'crit');
      if (m.hp <= 0 && !G.Foe.survive(rt, m, src, dmg)) F.kill(f, rt, m, src, from);
    },
    // 지속 피해(독·화상): 같은 종류는 새로 걸면 덮어쓴다
    // dps: SRD 주사위 { dice: [개수, 면, 더함], save: [능력, DC], dt: 피해 종류, c: 건 사람 } — 그 몸의 차례가 시작될 때 굴린다 (F.startTurnFx)
    dot(m, kind, dps, t) {
      const spec = typeof dps === 'object' ? dps : { dice: [0, 0, Math.max(1, Math.round(dps * G.Res_ROUND))] }; // 옛 호출(초당 값)은 라운드당 고정값으로
      const d = m.dots.find(x => x.kind === kind);
      if (d) { Object.assign(d, spec); d.t = t; } else m.dots.push({ kind, t, ...spec });
    },
    // 시계가 흐른 만큼: 표식 · 감전 · 지속 피해 · 바닥 효과의 남은 시간 (피해는 주지 않는다)
    roundTick(f, rt, q) { F.decay(f, rt, q); rt._gq = (rt._gq || 0) + q; }, // 차례마다: 표식 · 지속 피해 · 바닥은 바로, 나머지 규칙 시계(버프 · 재사용 · 임무 · 라이벌)는 다음 틱의 gdt로
    decay(f, rt, q) {
      if (!q) return;
      for (const mo of rt.mons) { if (mo.mark > 0) mo.mark -= q; if (mo.shock > 0) mo.shock -= q; for (const d of mo.dots) d.t -= q; mo.dots = mo.dots.filter(d => d.t > 0); }
      for (const fd of rt.fields) fd.t -= q;
      rt.fields = rt.fields.filter(fd => fd.t > 0);
    },
    // 차례 시작 (SRD '차례를 시작할 때'): 지속 피해를 주사위로 굴리고, 내성이 붙은 것은 그 뒤 내성 — 성공하면 끝난다
    startTurnFx(f, rt, e) {
      if (!e.dots || !e.dots.length || e.hp <= 0) return;
      for (const d of [...e.dots]) {
        if (e.hp <= 0) break;
        const amt = (d.dice[0] ? G.Dnd.dice(d.dice[0], d.dice[1]) : 0) + (d.dice[2] || 0);
        G.Foe.dtype = d.dt || (d.kind === 'burn' ? 'fire' : d.kind === 'poison' ? 'poison' : null);
        F.hurt(f, rt, e, amt, 'dot', null);
        G.Foe.dtype = null;
        if (d.save && e.hp > 0 && G.Dnd.save(e, d.save[0], d.save[1])) e.dots = e.dots.filter(q => q !== d);
      }
    },
    // 가시 성장 (SRD): 그 안에서 5피트(1칸) 움직일 때마다 2d4 관통. 차례 중 움직인 거리로 센다
    fieldMove(f, rt, e, px, py) {
      if (!rt.fields.length || e.kind !== 'mon' || e.hp <= 0) return;
      const fd = rt.fields.find(q => Math.hypot(e.x - q.x, e.y - q.y) <= q.r); if (!fd) return;
      e._fmv = (e._fmv || 0) + Math.hypot(e.x - px, e.y - py);
      while (e._fmv >= 1 && e.hp > 0) { e._fmv -= 1; G.Foe.dtype = 'piercing'; F.hurt(f, rt, e, G.Dnd.dice(fd.dice ? fd.dice[0] : 2, fd.dice ? fd.dice[1] : 4), 'dot', fd.c || null); G.Foe.dtype = null; }
    },
    // 상태이상을 건다: 독 · 화상 · 출혈(지속 피해) · 표식 · 기절 · 정지 · 감전. 동료가 걸면 연계기가 받아칠 수 있다(noCombo면 받지 않는다)
    inflict(f, rt, m, k, t, from, dps, noCombo) {
      if (!m || m.hp <= 0 || !m.dots) return;
      if (G.Foe.immune(m, k)) return G.fx(rt, { k: 'text', x: m.x, y: m.y - 1, s: '면역', col: '#9aa0a8', t: 0.7, sz: 0.7 });
      if (DOTS.includes(k)) {
        F.dot(m, k, dps, t);
        // 거미줄 · 얽힘에 걸린 적에게 불이 붙었다 (G.Combo 「불붙은 거미줄」)
      }
      else if (m.kind !== 'mon') return;
      // 내성 (DESIGN.md 56): 기절 = 건강 · 정지 = 지혜 · 감전 = 건강 — 성공하면 걸리지 않는다
      else if (G.Dnd.resists(m, k, from)) return G.fx(rt, { k: 'text', x: m.x, y: m.y - 1, s: '저항', col: '#9aa0a8', t: 0.7, sz: 0.7 });
      else m[k] = Math.max(m[k] || 0, t);
    },
    kill(f, rt, m, src, from) {
      G.Lore.learn(f, rt, m, 'kill');
      if (m.chief) G.Story.chiefDown(f, rt, m, from);
      const g = m.gold || 0; F.gain(f, g); // 몬스터의 재물 (SRD 보물): 배율 없음
      f.kills++;
      // 어둠의 축복 (워락): 처치하면 임시 체력 15%
      if (from && F.sk(from, 'sr_dob')) from.thp = Math.max(from.thp || 0, Math.max(1, G.Dnd.mod(G.Dnd.ab(from.merc).cha) + from.merc.lv) * from.max / Math.max(1, G.Dnd.srdHP(from.merc))); // 어둠의 축복 (SRD): 매력 + 레벨
      G.Guild.onKill(f, rt, m);
      if (G.Trinket.carries(m) && m.hp <= 0 && !m.summon) G.Trinket.drop(f, rt, 'mon', m.x, m.y);
      G.Items.monGear(f, rt, m);
      G.Foe.onDeath(f, rt, m);
      if (from?.merc && m.major && m.max > 50) G.Story.note(rt, 'slay', from, null, m.n); // 야영 이야깃거리
      G.fx(rt, { k: 'die', spr: m.t, x: m.x, y: m.y, s: m.s, flip: m.flip, t: 0.45 });
      if (g >= 1) G.fx(rt, { k: 'text', x: m.x, y: m.y - 1, s: '+' + U.coin(g), col: '#ffd24a', t: 1.1, sz: m.mimic ? 1.4 : 1, pop: !!m.mimic });
      G.J.sfx('fantasy', 'coin');
      if (m.boss) {
        G.Trinket.drop(f, rt, 'boss', m.x, m.y);
        G.J.finish('fantasy', m.x, m.y);
        G.J.sfx('fantasy', 'finish');
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
      if (c.relic) { G.Mission.relic(f, rt, c); F.refreshEnts(rt); return; }
      if (c.mimic) {
        // 조사 (DESIGN.md 56): 알아채면 미믹이 먼저 치지 못하고 3초 정지 상태로 깨어난다
        const spot = c.spotted || G.Dnd.spotMimic(rt);
        F.spawnMon(rt, f.floor, { n: '미믹', t: 'm_mimic', ty: 'monstrosity', fx: ['restrained', 'str', 2] }, c.x, c.y, false, { mimic: true, aggro: true, spotted: true, s: 1.2, stop: spot ? 3 : 0 });
        if (spot) G.Dnd.flip(spot, '조사 · 미믹 간파');
        G.Banter.line(rt, spot ? 'mimicKnown' : 'mimic', spot || null, null, { pri: true });
        G.fx(rt, { k: 'text', x: c.x, y: c.y - 1, s: '미믹!', col: '#ff6a6a', t: 1.2, sz: 1.3, pop: true });
        G.J.shake('fantasy', 6);
        G.J.sfx('fantasy', 'hurt');
      } else {
        // 상자에서 가끔 마법 물건 (DESIGN.md 58)
        G.Trinket.drop(f, rt, 'chest', c.x, c.y);
        G.Banter.line(rt, 'chest');
        G.Turn.vis(rt, { k: 'coins', x: c.x, y: c.y });
        (rt.map.props || (rt.map.props = [])).push({ x: c.x, y: c.y, state: 'open', t0: 1 }); // 열린 상자는 그 자리에 남는다
        const g = G.Region.floorBudget(f, f.floor, 1) * 0.1 * (c.rich ? RICH_K : 1); // 상자 살피기에 성공하면 더 든다
        F.gain(f, g);
        G.fx(rt, { k: 'tile', key: 'x_chest_open', x: c.x, y: c.y, t: 1.2, s: 0.9 });
        G.fx(rt, { k: 'text', x: c.x, y: c.y - 1, s: '+' + U.coin(g), col: '#ffd24a', t: 1.3, sz: 1.3, pop: true });
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
    // 단장가 다음에 갈 곳: 덤벼 오는 적 → 눈에 띈 상자(곁의 적부터 치우고) → 길로 가장 가까운 방의 적·상자 → 방 밖에 남은 적.
    descend(f, rt) {
      G.Mission.leave(f, rt);
      G.Bond.floor(f, rt);
      const reg0 = G.Region.of(f);
      if (reg0 && G.Region.done(f, reg0)) { if (f.floor >= (f.checkpoint || 1)) f.checkpoint = f.floor + 1; G.Exp.home(f, rt, 'clear'); return; } // 지역 끝: 돌아간다
      if (F.isBoss(f.floor)) { G.Exp.cleared(f, f.floor); if (G.Exp.afterBoss(f, rt)) return; }
      G.J.sfx('fantasy', 'wave');
      f.floor += 1;
      if (f.floor > f.maxFloor) { f.maxFloor = f.floor; G.Guild.earnFame(f, Math.max(1, F.floorLv(f.floor)), `${f.floor}층 도달`); }
      f.deaths = 0;
      rt.carryHp = G.Camp.carry(f, rt);
      F.newFloor(f, rt);
      if (rt.carryHp) G.Camp.restore(rt, rt.carryHp);
      rt.carryHp = null;
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
    has: (rt, key) => (rt.party || rt.allies).some(a => !a.dead && G.Guild.skill(a.merc, key)),
    who: (rt, key) => (rt.party || rt.allies).find(a => !a.dead && G.Guild.skill(a.merc, key)),
    sk: (a, key) => !!a && G.Guild.skill(a.merc, key),
    // 기술 표적: 지정한 적(보이면), 아니면 단장에게 가장 가까운 보이는 적
    skillTarget(rt) {
      const seen = rt.mons.filter(o => F.inView(rt, o.x, o.y));
      return (rt.focus && seen.includes(rt.focus) ? rt.focus : seen.sort((p, q) => GR.dist(p, rt.hero) - GR.dist(q, rt.hero))[0]) || rt.hero;
    },
    // 같은 무리끼리 겹치지 않게 살짝 밀어낸다 (벽 칸으로는 밀지 않는다)
    spread(m, list, r) {
      const nudge = (e, x, y) => { if (e.kind !== 'hero' && GR.walkable(m, e.x, e.y, x, y)) { e.x = x; e.y = y; } };
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.dead || b.dead) continue;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= r) continue;
        if (d < 1e-3) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
        const p = (r - d) * 0.25, ux = dx / d * p, uy = dy / d * p;
        nudge(a, a.x - ux, a.y - uy);
        nudge(b, b.x + ux, b.y + uy);
      }
    },

    // 파티원이 맞는다 (몬스터 공격·오염). 쓰러지면 잠시 뒤 부활, 전원이 쓰러지면 패배.
    hurtMember(f, rt, p, dmg, mo) {
      if (p.kind === 'sum') return G.Sum.hurt(f, rt, p, dmg, mo); // 아군 생물 (G.Sum)
      if (mo && mo.x != null && !F.sees(rt.map, mo, p)) return;
      if (p.dead) { if (p.dying && mo && rt.turn) G.Story.hitDying(f, rt, p, mo); return; } // 체력 0에서 맞으면 사망 내성 실패 (SRD)
      if (mo) {
        // d20 명중 (DESIGN.md 56): 빗나가면 아무 일도 없다 · 1은 늘 빗나감 · 20은 치명타(피해 2배)
        const r = G.Dnd.attack(mo, p);
        if (!r.hit) { G.J.lunge('fantasy', mo, p); G.Dnd.miss(rt, p); return; }
        if (p.images > 0 && p.imagesT > G.S.runTime) { let hitImg = false; for (let i = 0; i < p.images; i++) if (G.Dnd.dice(1, 6) >= 3) hitImg = true; if (hitImg) { p.images--; G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.1, s: '분신이 맞았다', col: '#c9a6ff', t: 0.8, sz: 0.75 }); return; } } // 거울상 (SRD)
        if (G.Dnd.bon(p, 'fireShield') && Math.hypot(mo.x - p.x, mo.y - p.y) <= 1.6 && !G.Foe.ranged(mo) && mo.kind === 'mon') { const t0 = p.bf.fireShield.shieldT; G.Foe.dtype = t0; F.hurt(f, rt, mo, G.Dnd.dice(2, 8), 'smite', p); G.Foe.dtype = null; } // 화염 방패 (SRD): 근접으로 맞힌 생물에게 2d8
        if (G.Dnd.bon(p, 'holyAura') && (mo.ty === 'fiend' || mo.ty === 'undead') && !G.Foe.ranged(mo) && !G.Dnd.save(mo, 'con', G.Dnd.dc(rt.party.find(q => q.concK?.k && q.concK.on?.some(([w, k]) => w === p && k === 'holyAura')) || p))) G.Dnd.give(rt, mo, 'blinded', G.Res_ROUND * 10, p); // 성스러운 오라 (SRD): 악마 · 언데드는 실명
        // 아다만틴 갑옷: 치명타가 보통 명중이 된다
        if (r.crit && !(p.merc && G.Trinket.has(p.merc, 'nocrit'))) dmg *= mo._critK || 2; // 치명타는 주사위만 두 배 (G.Turn이 재 둔 비율)
        G.Dnd.onHit(rt, mo, p);
        p.dispOff = true; // 전위의 망토: 맞으면 다음 차례까지 꺼진다
        if (p.merc && G.Foe.ranged(mo) && G.Trinket.has(p.merc, 'snare') && !G.Dnd.out(p) && p.oaRound !== rt.turn?.round) { p.oaRound = rt.turn?.round; dmg = Math.max(0, dmg - (1 + U.rand(10) + G.Dnd.mod(G.Dnd.ab(p.merc).dex)) * (mo.atk || 1)); } // 화살 잡기: 반응
        F.react(f, rt, p, mo);
        dmg *= G.Dnd.bprod(p, 'taken') * G.Res.takenK(p, mo.useAtk?.t, G.Foe.ranged(mo)); dmg = Math.max(0, dmg - G.Res.flat(p, mo.useAtk?.t));
        dmg = G.Res.stone(rt, p, dmg);
        if (p.merc && G.Res.species(p.merc) === 'goliath' && (G.SRD.line(p.merc, 'goliath'), p.merc.line) === 'storm' && Math.hypot(mo.x - p.x, mo.y - p.y) <= 12 && G.Res.once(p.merc, 'giant', G.Dnd.prof(p.merc.lv))) { G.Foe.dtype = 'thunder'; F.hurt(f, rt, mo, G.Dnd.dice(1, 8) * F.allyAtk(f, p) / Math.max(1, G.Dnd.avg(G.Dnd.weapon(p))), 'hit', p); G.Foe.dtype = null; } // 폭풍 거인: 반응 1d8 천둥
        // 반응 (SRD, 라운드에 하나 — G.Dnd.react): 직감 회피 · 공격 쳐내기 · 상위 사냥꾼의 방어
        const now = G.S.runTime;
        if (F.sk(p, 'sr_uncanny') && G.Dnd.react(p) && mo && F.sees(rt.map, p, mo)) { G.Dnd.useReact(p); dmg *= 0.5; } // 직감 회피 (SRD): 보이는 공격자의 명중 피해 절반
        if (F.sk(p, 'sr_deflect') && G.Dnd.react(p) && (F.sk(p, 'ft_denergy') || ['slashing', 'piercing', 'bludgeoning'].includes(mo.useAtk?.t))) { G.Dnd.useReact(p); /* 공격 쳐내기 (SRD) */ dmg = Math.max(0, dmg - (1 + U.rand(10) + G.Dnd.mod(G.Dnd.ab(p.merc).dex) + p.merc.lv)); G.fx(rt, { k: 'ring', x: p.x, y: p.y, r: 0.6, t: 0.25, col: '#e8c860' }); }
        // 상위 사냥꾼의 방어 (SRD): 반응 — 그 종류를 이번 라운드 저항
        { const t0 = mo.useAtk?.t, round = rt.turn?.round; if (p.shdef?.t === t0 && p.shdef.r === round) dmg *= 0.5; else if (t0 && F.sk(p, 'ft_shdef') && dmg > p.max * 0.15 && G.Dnd.react(p)) { G.Dnd.useReact(p); p.shdef = { t: t0, r: round }; dmg *= 0.5; G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.1, s: '사냥꾼의 방어', col: '#9fc8ff', t: 0.8, sz: 0.75 }); } }
        if (F.sk(p, 'sr_mdef')) G.Dnd.buff(p, 'mdef', 1, { hitDis: 1 }); // 다중 공격 방어 (SRD): 그 상대의 남은 공격에 불리
        // 단짝 (DESIGN.md 49): 체력 절반 아래에서 맞으면, 곁(1칸)의 더 성한 전우가 막아 준다 — SRD 가로막기(Interception): 반응, 피해 −(1d10 + 숙련), 라운드에 한 번
        const bd = p.merc && p.hp < p.max * 0.5 && G.Persona.buddy(f, rt, p);
        if (bd && bd.merc && GR.dist(bd, p) <= 1.5 && bd.hp / bd.max > p.hp / p.max + 0.2 && bd.icR !== (rt.turn?.round ?? now)) {
          bd.icR = rt.turn?.round ?? now;
          dmg = Math.max(0, dmg - (G.Dnd.dice(1, 10) + G.Dnd.prof(bd.merc.lv)));
          G.fx(rt, { k: 'beam', x: bd.x, y: bd.y, x2: p.x, y2: p.y, col: '#ff8ab0', w: 2, t: 0.25 });
          if (!(bd.coverT > G.S.runTime)) { bd.coverT = G.S.runTime + 6; G.fx(rt, { k: 'emote', key: 'rl_heart', ent: bd, x: bd.x, y: bd.y, t: 1 }); }
          if (bd.hp <= 0) bd.hp = 1;
        }
        // 수호의 노래 · 성벽은 AC로, 버티기 전술은 공격에 불리로 (G.Dnd.ac · adv)
        dmg = Math.max(0, Math.floor(dmg)); // SRD: 피해는 정수 (소수는 내림)
        
        G.J.hit('fantasy', p, 0, mo, dmg);
        G.J.lunge('fantasy', mo, p);
        G.fx(rt, { k: 'splat', x: p.x, y: p.y, dx: p.x - mo.x, dy: p.y - mo.y, n: 4, s: 0.8, t: 0.45 });
        G.fx(rt, { k: 'slash', x: p.x, y: p.y, t: 0.22, rot: Math.random() - 0.5, flip: mo.x > p.x });
        G.fx(rt, { k: 'text', x: p.x, y: p.y - 0.6, s: '-' + U.fmt(dmg), col: '#ff6b6b', t: 0.7 });
        if (p === rt.hero) G.J.sfx('fantasy', 'hurt');
      }
      // 임시 체력 (야생 변신 · 어둠의 축복)이 먼저 깎인다
      if (!mo) { p._dotAcc = (p._dotAcc || 0) + dmg; dmg = Math.floor(p._dotAcc); p._dotAcc -= dmg; if (dmg <= 0) return; } // 공격이 아닌 피해(오염 · 지속): 조각을 모아 정수로
      if (p.thp > 0) { const a = Math.min(p.thp, dmg); p.thp -= a; dmg -= a; }
      p.hp -= dmg;
      G.Res.concHit(rt, p, dmg);
      if (p.hp > 0) return;
      if (G.Res.onDown(rt, p)) return;
      // 끈질긴 격노: 격노 중 쓰러지면 건강 내성(DC 10, 버틸 때마다 +5)으로 체력 15%
      if (p.merc && F.sk(p, 'sr_relent') && G.Dnd.bon(p, 'rage') && G.Dnd.save(p, 'con', 10 + 5 * (p.relN || 0))) {
        p.relN = (p.relN || 0) + 1;
        p.hp = 2 * p.merc.lv; // 끈질긴 격노 (SRD): 체력이 바바리안 레벨의 두 배가 된다
        G.fx(rt, { k: 'text', x: p.x, y: p.y - 1.3, s: '끈질긴 격노', col: '#ff5a3a', t: 1.2, sz: 1, pop: true });
        return;
      }
      p.dead = true;
      p.stable = true; // 의식 없음 (SRD): 치유를 받거나 쉬면 깬다 (G.Story.wake · G.Res.shortRest)
      if (p.merc) G.Guild.onDown(f, rt, p);
      G.Story.onDown(f, rt, p, mo);
      if (rt.party.every(q => q.dead)) {
        G.Story.wipe(f, rt);
        rt.phase = 'dead';
        rt.reviveT = REVIVE;
        f.deaths++;
        G.J.sfx('fantasy', 'lose');
        G.J.shake('fantasy', 8, 1, 0, 0.4);
        G.log(`${f.floor}층 · 전멸`, 'fantasy', 'bad');
      }
    },

    tick(f, dt) {
      const rt = F.rt(f);
      // 게임 시간 (SRD): 전투 밖은 실제 시간, 전투 중에는 차례마다 오른 라운드 시간만 (F.roundTick이 모은다). 규칙 시계는 모두 이것으로
      const gdt = rt.turn ? (rt._gq || 0) : dt; rt._gq = 0; rt.gdt = gdt;
      // 배속 (G.Turn): 이번 틱을 더 돌린다. 시즌 시계는 실제 시간으로 (아래)
      if (!rt.turnFF) { const n = G.Turn.extra(f, rt); if (n) { rt.turnFF = true; for (let i = 0; i < n && !f.town && !rt.ask; i++) { if (!rt.turn) G.S.runTime += dt; F.tick(f, dt); } rt.turnFF = false; } } // 상태이상 시계도 함께 간다
      G.fxTick(rt, dt);
      // 시즌 시계 (G.Season): 끝났으면 결과를 보여 주는 동안 멈춘다
      // 라이벌: 다른 층에 있으면 시간으로 내려가고, 같은 층이면 맵 위에서 움직인다 (우리가 전멸해 있어도)
      // 용병: 부상 회복·선술집. 부상·회복으로 편성이 바뀌면 한 번에 다시 맞춘다
      G.Guild.tick(f, rt, dt);
      if (rt.resync && rt.phase !== 'dead') F.syncAllies(f);
      // 마을: 정비하는 동안 던전은 멈춘다 (라이벌·선술집은 그대로 흐른다)
      if (f.town) { G.Exp.townTick(f, rt, dt); return; }
      G.Cmd.tick(f, rt, dt);
      if (rt.resyncHero && rt.hero) { rt.resyncHero = false; F.dressHero(f, rt.hero); rt.hero.max = F.heroHP(f); rt.hero.hp = Math.min(rt.hero.hp, rt.hero.max); }
      // 전멸: 잠시 뒤 마을로 (짐 절반을 잃는다 — G.Exp)
      if (rt.phase === 'dead') {
        if ((rt.reviveT -= dt) <= 0) G.Exp.home(f, rt, 'wipe');
        return;
      }
      G.Exp.tick(f, rt);
      if (f.town) return;
      G.Season.tick(f, rt, dt);
      rt.floorT += gdt;
      G.Mission.tick(f, rt, gdt);
      const m = rt.map, hero = rt.hero;
      const aspd = 1, speed = 3.2 * (1 + (rt.party || rt.allies).reduce((a, q) => a + (q.dead || !q.merc ? 0 : G.Guild.sum(q.merc, 'move')), 0));
      const hmax = F.heroHP(f);
      hero.max = hmax;
      for (const p of rt.party) if (!p.dead && p !== hero) p.max = F.allyHP(f, p); // 쓰러져 안정된 사람은 끌려 다니다 쉬거나 치유받으면 깬다 (SRD 1d4시간)
      if (rt.phase === 'dead') return;
      // 지속 피해와 감전
      // 표식 · 감전 · 지속 피해의 시간: 전투 밖에서만 실제 시간으로 흐른다 (전투 중에는 차례마다 F.roundTick). 피해는 차례 시작에 (F.startTurnFx)
      if (!rt.turn) F.decay(f, rt, gdt);
      // 바닥 효과 (가시 성장 등): fd.key 그림 · fd.c 시전자
      for (const fd of rt.fields) if (Math.random() < dt * 6) G.fx(rt, { k: 'tile', key: fd.key || 'fx_flame', x: fd.x + (Math.random() - 0.5) * fd.r * 1.6, y: fd.y + (Math.random() - 0.5) * fd.r * 1.6, t: 0.4 });
      // 여기부터의 진행 순서는 G.Flow가 정한다
      G.Banter.tick(f, rt, dt);
      G.Flow.tick(f, rt, speed, dt);
    },
    // 동료 한 번 공격: 동료마다·택1 노드마다 다르게
    // 맞은 사람의 반응 (SRD, 라운드에 하나): 지옥의 질책 · 보복
    react(f, rt, p, mo) {
      if (!p.merc || p.dead) return;
      const now = G.S.runTime, DN = G.Dnd;
      if (F.sk(p, 'sr_rebuke') && DN.react(p) && G.Res.can(p.merc, 'sr_rebuke', { slot: 1 }) && F.sees(rt.map, p, mo)) {
        DN.useReact(p);
        G.fx(rt, { k: 'tile', key: 'fx_fire', x: mo.x, y: mo.y, t: 0.5, s: 1.2 });
        { if (!G.Res.can(p.merc, 'sr_rebuke', { slot: 1 })) return; const sl = G.Res.pay(p.merc, 'sr_rebuke', { slot: 1 }) || 1; G.Foe.dtype = 'fire'; F.hurt(f, rt, mo, DN.dice(1 + sl, 10) * F.allyAtk(f, p) / Math.max(1, DN.avg(DN.weapon(p))) * (DN.save(mo, 'dex', DN.dc(p)) ? 0.5 : 1), 'smite', p); G.Foe.dtype = null; }
      }
      if (F.sk(p, 'sr_retal') && DN.react(p) && GR.dist(p, mo) <= 1.8 && mo.hp > 0) { DN.useReact(p); /* 보복 (SRD) */ F.allyAttack(f, rt, p, mo); }
    },
    // 치명 범위: 기본 20 · 향상된 치명타 19 (Lv 15에 18)
    critAt: a => (F.sk(a, 'sr_impcrit') ? (a.merc.lv >= 15 ? 18 : 19) : 20) - (a.merc ? G.Trinket.sum(a.merc, 'crit') : 0),
    // 동료 한 번 공격 (DESIGN.md 56): 한 명을 노리면 명중 굴림 — 추가 공격(Lv 5)이면 여러 번, 워락은 광선 여러 개.
    // 범위 · 연쇄는 맞는 쪽 민첩 내성(성공하면 절반). 소마법 직업은 Lv 5 · 11 · 17에 피해가 오른다
    // 클레릭 (SRD): 70% 아래 동료가 있으면 치유를 먼저 (그 차례는 공격하지 않는다 — true)
    healTurn(f, rt, a, dt) {
      if (!a.def.heal) return false;
      let low = null;
      for (const p of rt.party) if (!p.dead && !p.noHeal && p.hp < p.max * G.Tactics.healAt(a) && F.sees(rt.map, a, p) && GR.dist(a, p) <= Math.max(a.def.range, HEAL_REACH) && (!low || p.hp / p.max < low.hp / low.max)) low = p;
      if (!low) return false;
      if ((a.atkT -= dt) <= 0) {
        a.atkT = a.def.cd;
        if (a.merc) { if (!G.Res.can(a.merc, 'cure', { slot: 1 })) return false; if (a.slotUsed) return false; a.slotUsed = true; const sl = G.Res.pay(a.merc, 'cure', { slot: 1 }); if (!G.quiet) (a.skLog = a.skLog || []).push('sr_cure'); low.hp = Math.min(low.max, low.hp + (G.Dnd.dice(sl * 2, 8) + G.Dnd.mod(G.Dnd.ab(a.merc)[G.Dnd.cls(a.merc).dc]) + (F.sk(a, 'sr_disciple') ? 2 + sl : 0))); } else low.hp = Math.min(low.max, low.hp + Math.round(low.max * a.def.heal)); // 상처 치료 (SRD): 슬롯 하나, 1d8 + 지혜
        G.J.lunge('fantasy', a, low);
        G.fx(rt, { k: 'tile', key: 'fx_holy', x: low.x, y: low.y, t: 0.5 });
      }
      return true;
    },
    chainFrom(rt, first, n, hop) {
      const hit = [first]; let cur = first;
      while (hit.length < n) {
        let best = null, bd = hop;
        for (const o of rt.mons) { if (hit.includes(o) || o.hp <= 0) continue; const d = GR.dist(o, cur); if (d <= bd && F.sees(rt.map, cur, o)) { bd = d; best = o; } }
        if (!best) break;
        hit.push(best); cur = best;
      }
      return hit;
    },
    // 주문 직업: 곁의 적에게 무기가 소마법보다 세면 무기로 친다 (SRD 무기 표 · 무기 능력 · 한 번)
    allyAttack(f, rt, a, tg) {
      const DN = G.Dnd, cp = a.merc && DN.cantrip(a.merc);
      if (cp && GR.dist(a, tg) <= 1.8 && DN.avg(DN.gearWeapon(a.merc)) >= DN.avg(DN.weapon(a)) * DN.tier(a)) a.swing = true;
      a.masUsed = false; try { return F.allyAttack0(f, rt, a, tg); } finally { a.swing = false; }
    },
    allyAttack0(f, rt, a, tg) {
      const def = a.swing ? { ...a.def, proj: null, splash: 0, chain: 0, saveAtk: null } : a.def, DN = G.Dnd;
      const dmg = F.allyAtk(f, a) * DN.HIT_K * G.Turn.k(f, rt, a);
      const nd = !a.swing && DN.caster(a) && a.merc.cls !== 'warlock' ? DN.tier(a) : 1; // 소마법: 5 · 11 · 17레벨에 주사위가 늘어난다 (SRD)
      if (def.proj) G.fx(rt, { k: 'proj', key: def.proj, x: a.x, y: a.y, x2: tg.x, y2: tg.y, t: def.proj === 'fx_arrow' ? 0.3 : 0.25 });
      else G.fx(rt, { k: 'slash', x: tg.x, y: tg.y, t: 0.25, rot: Math.random() - 0.5, flip: a.x > tg.x });
      G.J.lunge('fantasy', a, tg);
      const area = def.splash || def.chain, dc = area ? DN.dc(a) : 0, sv = mo => (DN.save(mo, 'dex', dc) ? 0.5 : 1);
      if (area && tg.kind !== 'rival') {
        const ad = dmg * DN.rollK(a, false, nd); // 범위 공격은 한 번 굴려 모두에게 (SRD)
        if (def.splash) {
          const rr = def.splash + (a.merc ? G.Guild.sum(a.merc, 'splash') : 0);
          G.fx(rt, { k: 'ring', x: tg.x, y: tg.y, r: rr, t: 0.3, col: '#ff8a3a' });
          for (const mo of [...rt.mons]) if (GR.dist(mo, tg) <= rr && F.sees(rt.map, tg, mo)) F.hurt(f, rt, mo, ad * sv(mo), 'hit', a);
        } else {
          // 번개는 가까운 적에게로만 튄다: 한 번에 CHAIN_HOP칸, 벽 너머로는 안 간다 (턴제)
          const hit = F.chainFrom(rt, tg, def.chain, CHAIN_HOP);
          G.fx(rt, { k: 'chain', pts: [[a.x, a.y], ...hit.map(o => [o.x, o.y])], col: '#c9a6ff', t: 0.2 });
          hit.forEach(mo => F.hurt(f, rt, mo, ad * sv(mo), 'hit', a)); // 연쇄: 모두 같은 피해, 각자 내성 (SRD)
        }
        return;
      }
      // 한 명: 추가 공격 · 섬뜩한 폭발 광선 수만큼 따로 굴린다
      const n = a.swing ? 1 : a.merc && a.merc.cls === 'warlock' && !DN.melee(a) ? DN.tier(a) : DN.attacks(a), critAt = F.critAt(a), now = G.S.runTime;
      let any = false;
      for (let i = 0; i < n && tg.hp > 0; i++) {
        if (i > 0) { if (def.proj) G.fx(rt, { k: 'proj', key: def.proj, x: a.x, y: a.y, x2: tg.x, y2: tg.y, t: 0.25 + i * 0.06 }); else G.fx(rt, { k: 'slash', x: tg.x, y: tg.y, t: 0.25, rot: Math.random() - 0.5, flip: i % 2 === 0 }); }
        // 신성한 불꽃 (클레릭 기본): 명중 굴림 대신 민첩 내성 — 버티면 피해 없음
        const r = def.saveAtk ? { hit: !DN.save(tg, def.saveAtk, DN.dc(a)), crit: false, adv: 0 } : DN.attack(a, tg, critAt);
        if (r.hit && def.saveAtk && def.saveCond && tg.kind === 'mon') DN.give(rt, tg, def.saveCond, G.Res_ROUND, a); // 잔인한 조롱: 다음 공격 불리 (SRD)
        if (!r.hit) { DN.miss(rt, tg);  if (a.merc && (a.swing || !DN.cantrip(a.merc))) G.SrdX?.onMiss(f, rt, a, tg); continue; }
        any = true;
        let d = dmg * DN.rollK(a, r.crit, nd), src = r.crit ? 'crit' : 'hit';
        if (G.Feat.savage(a)) d = Math.max(d, dmg * DN.rollK(a, r.crit, nd)); // 야만적 공격자 (SRD): 턴에 한 번 무기 주사위를 다시 굴려 큰 쪽
        // 기습 (로그) · 거인 사냥꾼 (레인저, 다친 적에게 한 번)
        const sn = DN.sneak(rt, a, tg, r.adv);
        if (sn) { d += G.Dnd.dice(sn * (r.crit ? 2 : 1), 6) * dmg / Math.max(1, DN.avg(DN.weapon(a))); src = r.crit ? 'crit' : 'smite'; }
        if (F.sk(a, 'sr_colossus') && tg.hp < tg.max && a.colN !== G.Turn.no()) { a.colN = G.Turn.no(); /* 턴에 한 번 */ d += DN.dice(1, 8) * dmg / Math.max(1, DN.avg(DN.weapon(a))); }
        // 광휘의 일격 (팔라딘 Lv 11): 근접 ×1.3
        if (F.sk(a, 'sr_radiant') && DN.melee(a)) d += DN.dice(1, 8) * dmg / Math.max(1, DN.avg(DN.weapon(a)));
        // 야만적 공격자 (출신 재주): 한 턴에 한 번 피해를 두 번 굴려 큰 쪽
        d += DN.frenzy(a) * dmg / Math.max(1, DN.avg(DN.weapon(a)));
        F.hurt(f, rt, tg, d, src, a);
        if (tg.hp > 0) G.Trinket.onHit(f, rt, a, tg, dmg / Math.max(1, DN.avg(DN.weapon(a))), r.nat); if (a.merc && (a.swing || !DN.cantrip(a.merc))) G.SrdX?.onHit(f, rt, a, tg); else if (a.merc?.cls === 'archmage') tg.shock = Math.max(tg.shock || 0, 6); // 서리 광선: 이동 −2칸
        if (tg.hp > 0) G.Skill.onHit(f, rt, a, tg);
        // 상위 사냥감: 내 표식이 붙은 적을 맞히면 곁(2칸)의 다른 적에게 절반
        if (F.sk(a, 'sr_sprey') && tg.hm && tg.hm.by === a) { const o = rt.mons.find(q => q !== tg && q.hp > 0 && GR.dist(q, tg) <= 6); if (o) F.hurt(f, rt, o, DN.dice(1, 6) * dmg / Math.max(1, DN.avg(DN.weapon(a))), 'hit', a); } // 상위 사냥감 (SRD): 표식 피해를 30피트 안 다른 적에게
      }
    },
    view(f) {
      const rt = F.rt(f), b = F.band(f.floor), m = rt.map;
      if (m._band !== b) { m._band = b; m.ver++; }
      return {
        map: m, ents: f.town ? [] : rt.ents, fx: rt.fx, bubbles: f.town ? null : G.Banter.live(rt), cam: rt.hero.dead ? rt.party.find(p => !p.dead) || rt.hero : rt.hero, viewH: 13, center: true, dimAll: rt.phase === 'dead' || f.town,
        fog: { seen: rt.seen, ver: rt.seenVer, light: rt.hero.dead ? rt.party.find(p => !p.dead) || rt.hero : rt.hero, torches: f.town ? null : rt.party.filter(p => !p.dead), torchR: F.sight() },
        mini: { seen: rt.seen, ver: rt.seenVer, start: m.start, end: m.end, treasure: m.treasure, chests: rt.chests, party: rt.party, mons: rt.mons, rivals: [], label: f.town ? '' : `${f.floor}층 · 탐사 ${Math.round(G.Season.coverage(f, f.floor) * 100)}%${G.Mission.label(rt)}` },
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
