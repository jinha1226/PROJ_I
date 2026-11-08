'use strict';
// 시즌 지도 (DESIGN.md 0·36): 시즌마다 던전 씨앗값이 하나 — 같은 시즌의 같은 층은 늘 같은 모양.
// 층마다 본 칸(지도 지식)을 시즌 동안 저장하고, 탐사율이 기준을 넘으면 그 층은 「아는 층」:
// 원정대가 헤매지 않고 주요 지점(보스 · 보물 방 · 계단)만 곧장 돈다. 길잡이·길눈 특성이 시야와 기준을 낮춘다.
// 시즌 끝 · 다음 시즌(옛 방치형의 초기화 · 명성 · 라이벌 순위)은 지웠다 (DESIGN.md 161).
G.Season = (() => {
  const KNOW_AT = 0.8, GUIDE_AT = 0.5, KEEN_STEP = 0.1, SAVE_T = 5;

  const S = {
    st(f) {
      if (!f.season) f.season = { n: 1, seed: (Math.random() * 2 ** 31) >>> 0, maps: {}, cov: {}, t: 0 };
      if (f.season.t == null) f.season.t = 0;
      return f.season;
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
