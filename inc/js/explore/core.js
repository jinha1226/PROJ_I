'use strict';
// 탐사 시제품 공용 (ROGUELIKE_PLAN 10절 1번): 난수 · 주사위 · 판정 확률 · 표기.
// run.html 전용이다. 본 게임(G)과 이름을 나누지 않는다.
globalThis.RUN = globalThis.RUN || {};

// 시드가 같으면 같은 판 (mulberry32)
RUN.rng = seed => {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
RUN.d = (rng, n) => 1 + Math.floor(rng() * n);
RUN.pick = (rng, list) => list[Math.floor(rng() * list.length)];
RUN.shuffle = (rng, list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// "2d6+3" 꼴
RUN.parse = expr => { const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(expr); return m ? { n: +m[1], s: +m[2], b: +(m[3] || 0) } : { n: 0, s: 0, b: +expr }; };
RUN.roll = (rng, expr) => { const e = RUN.parse(expr); let t = e.b; for (let i = 0; i < e.n; i++) t += RUN.d(rng, e.s); return t; };
RUN.range = expr => { const e = RUN.parse(expr); return [e.n + e.b, e.n * e.s + e.b]; };
RUN.avg = expr => { const e = RUN.parse(expr); return e.n * (e.s + 1) / 2 + e.b; };

// 능력 판정 성공 확률: d20 + 보정 ≥ DC. 능력 판정에는 20 자동 성공이 없다 (SRD).
// adv: 1 이점 · -1 불리, guid: 인도(Guidance) +1d4
RUN.pCheck = (bonus, dc, adv = 0, guid = false) => {
  const one = b => Math.min(1, Math.max(0, (21 - (dc - b)) / 20));
  const base = b => { const p = one(b); return adv > 0 ? 1 - (1 - p) * (1 - p) : adv < 0 ? p * p : p; };
  if (!guid) return base(bonus);
  let s = 0; for (let k = 1; k <= 4; k++) s += base(bonus + k); return s / 4;
};
// 무리 판정 (SRD 무리 판정): 절반 이상 성공하면 성공
RUN.pGroup = ps => {
  let dp = [1]; for (const p of ps) { const n = new Array(dp.length + 1).fill(0); dp.forEach((v, k) => { n[k] += v * (1 - p); n[k + 1] += v * p; }); dp = n; }
  const need = Math.ceil(ps.length / 2); return dp.slice(need).reduce((a, b) => a + b, 0);
};
// fate: 미리 정해진 눈 (운명판의 칸 — RUN.fate) · 없으면 굴린다. 이점 · 불리의 다른 한 번은 늘 굴린다
RUN.fate = null; // 화면 쪽이 채운다: m(파티원) → 그 사람의 다음 칸 눈 | null
RUN.check = (rng, bonus, dc, adv = 0, guid = false, fate = null) => {
  const r1 = fate ?? RUN.d(rng, 20), r2 = adv ? RUN.d(rng, 20) : r1, r = adv > 0 ? Math.max(r1, r2) : adv < 0 ? Math.min(r1, r2) : r1;
  const g = guid ? RUN.d(rng, 4) : 0, tot = r + bonus + g;
  return { ok: tot >= dc, r, g, tot, bonus, dc };
};

// 표기 (ROGUELIKE_PLAN 6-4): 숫자 모드 · D&D 모드
RUN.view = { mode: 'num' };
const sgn = n => (n >= 0 ? '+' : '') + n;
RUN.fmtCheck = (c, p) => RUN.view.mode === 'dnd'
  ? `${c.skill} ${sgn(c.bonus)}${c.guid ? ' +1d4' : ''} 대 DC ${c.dc}${c.adv > 0 ? ' · 이점' : c.adv < 0 ? ' · 불리' : ''}`
  : `성공 ${Math.round(p * 100)}%`;
RUN.fmtRoll = r => RUN.view.mode === 'dnd'
  ? `[${r.r}]${sgn(r.bonus)}${r.g ? `+[${r.g}]` : ''} = ${r.tot} 대 DC ${r.dc}`
  : `${r.tot} (필요 ${r.dc})`;
RUN.fmtDice = expr => { if (RUN.view.mode === 'dnd') return expr; const [a, b] = RUN.range(expr); return a === b ? `${a}` : `${a}~${b}`; };
