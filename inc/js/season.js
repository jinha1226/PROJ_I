'use strict';
// 시즌 지도 (DESIGN.md 0·36): 시즌마다 던전 씨앗값이 하나 — 같은 시즌의 같은 층은 늘 같은 모양.
// 층마다 본 칸(지도 지식)을 시즌 동안 저장하고, 탐사율이 기준을 넘으면 그 층은 「아는 층」:
// 원정대가 헤매지 않고 주요 지점(보스 · 보물 방 · 계단)만 곧장 돈다. 길잡이·길눈 특성이 시야와 기준을 낮춘다.
// 시즌 (DESIGN.md 38): 접속해 플레이한 시간으로 LEN초. 끝나면 순위·최고층·라이벌 전적으로 명성 → 명성 트리(영구).
// 다음 시즌: 한 번만 찍는 트리 노드(기술·★짝·전술·훈련)는 남고, 여러 레벨짜리 수치 노드 · 금고 · 층 · 지도 · 라이벌은 처음부터.
// 용병은 남고 레벨은 절반(명성 「전통」으로 더 남긴다).
G.Season = (() => {
  const KNOW_AT = 0.8, GUIDE_AT = 0.5, KEEN_STEP = 0.1, SAVE_T = 5;
  const LEN = 45 * 60, RESULT_T = 30, RANK_FAME = [10, 6, 3, 0], START_GOLD = 60;

  const S = {
    LEN,
    st(f) {
      if (!f.season) f.season = { n: 1, seed: (Math.random() * 2 ** 31) >>> 0, maps: {}, cov: {}, t: 0 };
      if (f.season.t == null) f.season.t = 0;
      return f.season;
    },
    left: f => Math.max(0, LEN - S.st(f).t),


    // ── 시즌 시계: 접속 중 틱에서만 흐른다 (오프라인 보상은 시즌을 끝내지 않는다). 끝났으면 true ──
    clock(f, rt, dt) {
      const R = f.seasonEnd;
      if (R) {
        if (f.autoGo !== false && G.S.runTime >= (f.townHold || 0) && (R.t -= dt) <= 0) S.next(f, rt);
        return true;
      }
      const s = S.st(f);
      if ((s.t += dt) < LEN) return false;
      S.end(f, rt);
      return true;
    },
    // 시즌 끝: 원정 중이면 짐을 챙겨 귀환하고 결과를 남긴다
    end(f, rt) {
      if (!f.town) G.Exp.home(f, rt, 'manual');
      const rows = G.Rivals.standings(f, rt).map(r => (r.us ? { ...r, floor: f.maxFloor } : r)).sort((a, b) => b.floor - a.floor || (a.us ? -1 : 1));
      const rank = rows.findIndex(r => r.us), st = G.Rivals.st(f);
      const won = Object.values(st).reduce((a, x) => a + x.losses, 0), lost = Object.values(st).reduce((a, x) => a + x.wins, 0);
      const legend = G.Story.legendFame(f), anc = G.Story.seasonEnd(f);
      const fame = f.maxFloor + (RANK_FAME[rank] || 0) + won + legend;
      G.Guild.earnFame(f, fame);
      f.seasonEnd = { n: S.st(f).n, rank: rank + 1, of: rows.length, floor: f.maxFloor, won, lost, fame, legend, anc, rows: rows.map(r => ({ n: r.n, col: r.col, floor: r.floor, us: !!r.us })), t: RESULT_T };
      G.log(`시즌 ${S.st(f).n} · ${rank + 1}위 · ${f.maxFloor}층 · 명성 +${fame}`, 'fantasy', 'good');
      G.J.sfx('fantasy', 'finish');
    },
    // 다음 시즌: 한 번만 찍는 노드만 남기고, 나머지는 처음부터
    next(f, rt) {
      for (const n of G.Tree.defs.fantasy) if ((n.max || 1) > 1) delete f.tree[n.id];
      f.tree._c = {};
      f.gold = START_GOLD * Math.pow(2, G.Guild.fac(f, 'vault'));
      f.artSeen = [];
      Object.assign(f, { floor: 1, maxFloor: 1, checkpoint: 1, start: 1, startAuto: true, carry: 0, buffs: {}, cds: {}, deaths: 0, last: null, rivals: {}, seasonEnd: null, town: true, townT: 0 });
      const keep = Math.min(1, 0.5 + 0.25 * G.Guild.fac(f, 'archive'));
      // 레벨 + 서사 단계를 한 줄로 줄인다 (DESIGN.md 59). 받은 은혜는 남는다
      for (const m of G.Guild.crew(f)) { const e = Math.max(1, Math.round((m.lv + (m.bt || 0)) * keep)); Object.assign(m, { lv: Math.min(G.Guild.LV_MAX, e), bt: Math.max(0, e - G.Guild.LV_MAX), xp: 0, inj: 0, downs: 0 }); }
      const old = S.st(f);
      f.season = { n: old.n + 1, seed: (Math.random() * 2 ** 31) >>> 0, maps: {}, cov: {}, t: 0 };
      G.Rivals.news.length = 0; G.Rivals.said = {}; G.Rivals.peace = {};
      G.Guild.refresh(f);
      G.Story.seasonNext(f);
      rt.rivals = []; rt.mons = []; rt.chests = []; rt.mapFl = null;
      G.Fantasy.refreshEnts(rt);
      G.log(`시즌 ${f.season.n} 시작`, 'fantasy', 'good');
    },
    // 그 층의 난수 (시즌 씨앗 × 층) — 지도 모양과 보물 방 자리
    rng(f, fl) { return G.Grid.seeded(Math.imul(S.st(f).seed ^ 0x9e3779b9, 31) + fl * 7919); },

    // ── 지도 지식: 본 칸 비트를 base64로 ──
    encode(bits) {
      let out = '';
      for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) if (bits[i + k]) b |= 1 << k; out += String.fromCharCode(b); }
      return btoa(out);
    },
    decode(str, n) {
      const bits = new Uint8Array(n);
      if (!str) return bits;
      const raw = atob(str);
      for (let i = 0; i < n; i++) if (raw.charCodeAt(i >> 3) & (1 << (i & 7))) bits[i] = 1;
      return bits;
    },
    // 새 층: 이 시즌에 이미 본 칸을 불러온다
    load(f, rt, fl) {
      const m = rt.map;
      rt.seen = S.decode(S.st(f).maps[fl], m.w * m.h);
      rt.seenVer++;
      rt.mapFl = fl; rt.mapSaveT = SAVE_T;
      m.passN = m.c.reduce((a, ch) => a + (ch !== '#' && ch !== '~' ? 1 : 0), 0);
    },
    save(f, rt) {
      if (!rt.map || rt.mapFl == null) return;
      const s = S.st(f), m = rt.map;
      s.maps[rt.mapFl] = S.encode(rt.seen);
      let k = 0;
      for (let i = 0; i < m.c.length; i++) if (rt.seen[i] && m.c[i] !== '#') k++;
      s.cov[rt.mapFl] = Math.min(1, k / (m.passN || 1));
    },
    tick(f, rt, dt) { if ((rt.mapSaveT -= dt) <= 0) { rt.mapSaveT = SAVE_T; S.save(f, rt); } },
    coverage: (f, fl) => S.st(f).cov[fl] || 0,
    // 지금 원정대의 길잡이 힘: 길잡이 출전 · 길눈 특성 수
    guides(rt) {
      let guide = 0, keen = 0;
      for (const a of rt.allies) if (!a.dead) { if (a.def.guide) guide++; if (a.merc) keen += G.Guild.sum(a.merc, 'sight'); }
      return { guide, keen };
    },
    // 시야 보너스 (길잡이 +2, 길눈 +1씩)
    sightBonus(rt) { const g = S.guides(rt); return (g.guide ? 2 : 0) + g.keen; },
    // 「아는 층」 기준: 80% · 길잡이가 있으면 50% · 길눈 하나마다 -10%p
    knowAt(rt) { const g = S.guides(rt); return Math.max(0.3, (g.guide ? GUIDE_AT : KNOW_AT) - KEEN_STEP * g.keen); },
    known: (f, rt) => !G.Region.of(f) && f.direct !== false && rt.mapFl != null && S.coverage(f, rt.mapFl) >= S.knowAt(rt),
  };
  return S;
})();
