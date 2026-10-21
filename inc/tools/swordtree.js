// 판타지 트리를 검 그림에 맞춰 손으로 배치한다 (좌표와 선행 노드를 함께 정한다). node tools/swordtree.js write
//  검신: 가운데 홈 = 원정대 → 동료 지휘 줄기, 홈 마디마다 좌우 가로대 끝에서 동료 해금 → 동료 강화가 날을 따라 위로 → 택1 짝
//        (레인저·음유시인 → 수도사·화염 마법사 → 성기사·용기병 → 전투 본능·총공세), 검 끝 = 대현자
//  가드: 왼쪽 재화, 오른쪽 벼락 — 각각 세 줄(가운데 줄기 + 위·아래 줄)
//  손잡이: 왼쪽 체력, 오른쪽 공격 / 폼멜: 전투 함성 (뿌리에서 손잡이 한가운데로)
const fs = require('fs');
const SRC = __dirname + '/../js/trees.js';
const L = {};               // id → [x, y, req]
const put = (id, x, y, req) => { L[id] = [+x.toFixed(2), +y.toFixed(2), req]; };

// ── 검신
const EDGE = 2.3, IN = 1.2, ST = 1.1;
put('party', 0, -1.9, 'root');
const spine = [['party', -1.9], ['allyAtk1', -6.0], ['allyHp', -11.2], ['allyAtk2', -15.3]];
put('allyAtk1', 0, -6.0, 'party'); put('allyHp', 0, -11.2, 'allyAtk1'); put('allyAtk2', 0, -15.3, 'allyHp');
// 가로대 하나: 동료(안쪽) → 강화 사슬(날) → 짝(날 위·안쪽 위)
function rung(s, ys, side, ally, chain, pair) {
  put(ally, side * IN, ys - 0.7, s);
  let prev = ally, y = ys - 1.5;
  for (const c of chain) { put(c, side * EDGE, y, prev); prev = c; y -= ST; }
  if (pair) { put(pair[0], side * EDGE, y, prev); put(pair[1], side * IN, y, prev); }
}
rung('party', -1.9, -1, 'archer', ['r_atk', 'r_range'], ['r_pierce', 'r_poison']);
rung('party', -1.9, 1, 'bard', ['songDur', 'songPow'], ['songWar', 'songRegen']);
rung('allyAtk1', -6.0, -1, 'cleric', ['c_heal', 'bless', 'heal'], ['c_sanct', 'c_revive']);
rung('allyAtk1', -6.0, 1, 'mage', ['m_atk', 'm_area', 'meteor'], ['m_burn', 'm_quick']);
rung('allyHp', -11.2, -1, 'paladin', ['p_hp', 'p_guard'], ['p_counter', 'p_taunt']);
rung('allyHp', -11.2, 1, 'dragoon', ['d_atk', 'd_crit'], ['d_exec', 'd_dash']);
rung('allyAtk2', -15.3, -1, 'autocast', ['slot']);
rung('allyAtk2', -15.3, 1, 'k_assault', ['k_assault2', 'k_rally']);
// 검 끝: 대현자
put('archmage', 0, -16.7, 'allyAtk2'); put('a_atk', 0, -17.8, 'archmage'); put('a_chain', 0, -18.9, 'a_atk');
put('a_warp', -0.9, -20.0, 'a_chain'); put('a_overload', 0.9, -20.0, 'a_chain');

// ── 가드: 세 줄 (가운데 y=0, 위 -0.95, 아래 0.95), 칸 k → x = ±(1.3 + k)
function rails(side, center, upper, lower) {
  const X = k => side * (1.3 + k);
  center.forEach((id, k) => put(id, X(k), 0, k ? center[k - 1] : 'root'));
  upper.forEach((id, k) => put(id, X(k + 1), -0.95, k ? upper[k - 1] : center[0]));
  lower.forEach((id, k) => put(id, X(k + 1), 0.95, k ? lower[k - 1] : center[0]));
}
rails(-1, ['gold1', 'speed1', 'gold2', 'essf', 'g_skip', 'ess2', 'gold3'],
  ['g_chest', 'g_mimic', 'g_lucky', 'g_goblin', 'g_lucky2', 'g_goblin2', 'g_mimic2'],
  ['g_boss', 'g_kill', 'g_jack', 'g_fever', 'g_bossEss', 'g_bargain', 'g_floor']);
rails(1, ['smite1', 's_lv1', 's_crit', 's_exec', 's_power2', 's_storm', 's_storm2', 's_storm_r', 's_storm3'],
  ['smiteR', 's_chain', 's_shock', 's_bounce', 's_boss', 's_r2', 's_mark'],
  ['s_cd', 's_charge', 's_stun', 's_focus', 's_static', 's_purge', 's_over']);

// ── 손잡이: 체력(왼쪽 -0.6·-1.6) / 공격(오른쪽), 줄 y = 2.4 …
const G1 = 0.6, G2 = 1.6;
for (const s of [-1, 1]) {
  const [a, b2, c, dd, e, f, g, h, i] = s < 0
    ? ['hp1', 'regen1', 'armor1', 'k_pure1', 'hp2', 'k_pure2', 'hp3', 'k_leech', 'k_undying']
    : ['atk1', 'crit1', 'aspd1', 'atk3', 'atk2', 'atk4', 'critd', 'k_cleave', 'k_crit2'];
  put(a, s * G1, 2.4, 'root');
  put(h, s * G2, 2.4, s < 0 ? a : c);          // 흡혈(체력 옆) / 휩쓸기(연속 베기 위)
  put(b2, s * G1, 3.4, a); put(c, s * G2, 3.4, a);
  put(e, s * G2, 4.4, `${b2} ${c}`);
  put(dd, s * G1, 5.4, s < 0 ? b2 : e);
  put(g, s * G2, 5.4, e);
  put(f, s * G1, 6.4, dd);
  put(i, s * G2, 6.4, g);
}
put('rage', 0, 7.9, 'root');

// ── 검사·쓰기
let s = fs.readFileSync(SRC, 'utf8');
const a0 = s.indexOf("G.Tree.define('fantasy'"), b0 = s.indexOf("G.Tree.define('wuxia'");
let seg = s.slice(a0, b0);
const ids = [...seg.matchAll(/(?:N|PAIR|NOTE)\('(\w+)'/g)].map(m => m[1]).filter(id => id !== 'root');
const miss = ids.filter(id => !L[id]), extra = Object.keys(L).filter(id => !ids.includes(id));
console.log('노드', ids.length, '배치', Object.keys(L).length, '빠짐', miss, '없는 id', extra);
// 겹침·엇갈림 검사
const P = { root: [0, 0], ...Object.fromEntries(Object.entries(L).map(([k, v]) => [k, v.slice(0, 2)])) };
const E = []; for (const [k, v] of Object.entries(L)) for (const r of v[2].split(' ')) E.push([r, k]);
const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
let X = 0, O = 0, C = 0;
for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
  const [p, q] = E[i].map(k => P[k]), [r, t] = E[j].map(k => P[k]);
  if (E[i].some(k => E[j].includes(k))) continue;
  if (o(p, q, r) * o(p, q, t) < 0 && o(r, t, p) * o(r, t, q) < 0) { X++; console.log('엇갈림', E[i], E[j]); }
}
const ptSeg = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], l = vx * vx + vy * vy, u = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l)); return Math.hypot(a[0] + u * vx - p[0], a[1] + u * vy - p[1]); };
for (const [a, b] of E) for (const k in P) if (k !== a && k !== b && ptSeg(P[k], P[a], P[b]) < 0.45) { O++; console.log('관통', k, a, '→', b, ptSeg(P[k], P[a], P[b]).toFixed(2)); }
const ks = Object.keys(P); for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) if (Math.hypot(P[ks[i]][0] - P[ks[j]][0], P[ks[i]][1] - P[ks[j]][1]) < 0.9) { C++; console.log('붙음', ks[i], ks[j]); }
console.log('엇갈림', X, '관통', O, '붙음', C);
if (process.argv[2] === 'write' && !miss.length && !extra.length) {
  for (const [id, [x, y, req]] of Object.entries(L)) {
    const re = new RegExp(`((?:N|PAIR|NOTE)\\('${id}', )-?[\\d.]+, -?[\\d.]+, '[^']*',`);
    seg = seg.replace(re, `$1${x}, ${y}, '${req}',`);
  }
  fs.writeFileSync(SRC, s.slice(0, a0) + seg + s.slice(b0));
  console.log('썼다');
}
