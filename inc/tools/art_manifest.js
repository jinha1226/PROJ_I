// 그림 목록 만들기: node tools/art_manifest.js
// 게임이 실제로 쓰는 타일 키마다 무엇을 어떤 크기·배경으로 그려야 하는지 assets/art/MANIFEST.json에 적는다.
// Codex(이미지 생성)가 이 목록과 ART.md 스타일 가이드를 보고 assets/art/<키>.png를 만든다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const MAP = require('./tilemap');

// 게임 데이터를 읽어 타일 키 → 쓰이는 이름(한국어)을 모은다
const ctx = { console, Math, JSON, Date };
vm.createContext(ctx);
for (const f of ['core', 'data', 'grid', 'juice', 'tree', 'trees']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx);
const G = ctx.G, names = {};
const note = (t, n) => { if (typeof t === 'string' && n) (names[t] = names[t] || new Set()).add(n); else if (t && t.k && n) note(t.k, n); };
(function walk(o, depth) {
  if (!o || typeof o !== 'object' || depth > 6) return;
  if (o.t && o.n) note(o.t, o.n);
  for (const k in o) walk(o[k], depth + 1);
})(G.D, 0);
for (const id in G.Tree.defs) for (const n of G.Tree.defs[id]) note(n.t, n.n);
for (const w of G.D.WORLDS) note('w_' + w.id, `${w.name} (세계 아이콘)`);
for (const [id, j] of Object.entries(G.D.WX.jobs)) note('j_' + j.id, j.n);
for (const s of G.D.WX.skills) note('s_' + s.id, s.n);
for (const it of G.D.WX.items) note('it_' + it.id, it.n);
for (const r of G.D.RELICS) note('rl_' + r.id, `${r.n} (유물)`);

// 소스에서 실제로 쓰는 키인지: 글자 그대로 나오거나, 이름을 조립해 쓰는 계열
const src = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && !/^(tileset|artset)\.js$/.test(f))
  .map(f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('\n');
const FAMILY = [/^f_(floor|wall)\d$/, /^j_/, /^s_(naegong|geom|gyeong|tuna|yangsaeng|magong)$/, /^it_/, /^rl_/, /^q_aura\d$/, /^e_(drone|walker|swarm|shield|boss)$/];
const used = k => src.includes(`'${k}'`) || FAMILY.some(r => r.test(k));
// 인형 부품(겹쳐 그리는 옷·머리·무기)은 따로 그리지 않고, 완성된 캐릭터 한 장으로 바꾼다
const PART = /^(wb|wl|wc|wh|wa|ww|qd|d)_|^c_hat$/;

const world = k =>
  /^(sea_|fs_|item_|c_)|^cu_mind$/.test(k) ? 'cthulhu'
  : /^(f_|m_|b_|u_|i_|r_)|^(knight|st_haste|fx_song|g_dagger)$/.test(k) ? 'fantasy'
  : /^(v_|x_|j_|it_|w_dummy|w_cave|w_board|wx_hero)/.test(k) || /^s_(naegong|geom|gyeong|tuna|yangsaeng|magong)$/.test(k) ? 'wuxia'
  : /^(q_|o_|a_|e_(wood|fire|earth|metal|water))|^(cultivator|x_disciple)$/.test(k) ? 'xianxia'
  : /^(s_|e_|t_|rs_)/.test(k) ? 'scifi'
  : 'shared';
const kindOf = (k, p) =>
  /^fs_|^sea_tent$/.test(k) ? 'sprite'
  : /^dngn\/(floor|wall|water)/.test(p) ? 'terrain'
  : /^dngn\//.test(p) ? 'object'
  : /^(mon|player)\//.test(p) ? 'sprite'
  : /^effect\//.test(p) ? 'fx'
  : 'icon';
const SPEC = {
  terrain: { size: 128, transparent: false, view: '위에서 내려다본 바닥/벽 텍스처, 이음새 없이 반복(seamless tile)' },
  object: { size: 256, transparent: true, view: '바닥 위에 놓이는 사물, 약간 위에서 본 정면(3/4), 아래쪽 중앙에 붙임' },
  sprite: { size: 256, transparent: true, view: '전신 캐릭터/괴물, 측면~3/4 시점, 왼쪽을 향함, 발이 아래쪽 중앙(여백 8%)' },
  icon: { size: 128, transparent: true, view: '아이콘, 사물 하나를 가운데에, 배경 없음' },
  fx: { size: 128, transparent: true, view: '효과(투사체·빛·불꽃), 가운데, 배경 없음' },
};
// 키별 예외: UI·세계 아이콘은 무조건 아이콘, 바다 단면은 옆에서 본 시점
const WORLD_ICON = /^w_(fantasy|wuxia|xianxia|scifi|cthulhu)$/;
const OVERRIDE = {
  sea_wave: { kind: 'terrain', transparent: true, view: '바다 단면의 수면: 타일 위쪽 1/3에 밤바다 물결 마루, 아래는 투명, 좌우 이음새 없이 반복' },
  sea_rock: { view: '바다 단면의 절벽 바위 텍스처(옆에서 본 시점), 젖은 돌, 이음새 없이 반복' },
  item_wire: { kind: 'icon' }, c_ward: { kind: 'icon' },
};
const subjectOf = p => p.replace(/\[[^\]]*\]|\(.*?\)|\*|\d+$/g, '').split('/').slice(-2).join(' / ').replace(/_/g, ' ').trim();

const assets = [];
for (const [key, pats] of Object.entries(MAP)) {
  if (PART.test(key) || !used(key)) continue;
  const kind = (OVERRIDE[key] && OVERRIDE[key].kind) || (/^ui_/.test(key) || WORLD_ICON.test(key) ? 'icon' : kindOf(key, pats[0])), w = world(key);
  const sp = Object.assign({}, SPEC[kind], { kind: undefined }, /^sea_w\d$/.test(key) ? { view: '바다 단면의 물 텍스처(옆에서 본 깊은 물, 깊이마다 더 어둡고 기괴하게), 이음새 없이 반복' } : null,
    /^fs_|^sea_tent$/.test(key) ? { view: '옆에서 본 바다 생물, 왼쪽을 향해 헤엄치는 자세, 가운데에' } : null, OVERRIDE[key]);
  // 변형 수: 지형은 원본처럼 몇 장(무늬가 반복돼 보이지 않게), 나머지는 1장. 어종 「q_beast」처럼 원본이 여러 종이면 그 수만큼.
  const multi = pats.length > 1 ? pats.length : kind === 'terrain' && /\[/.test(pats[0]) ? 2 : 1;
  const pri = w === 'cthulhu' || /^ui_/.test(key) || WORLD_ICON.test(key) ? 1 : kind === 'sprite' ? 2 : kind === 'terrain' || kind === 'object' ? 3 : 4;
  assets.push({
    key, world: w, kind, priority: pri, size: sp.size, transparent: sp.transparent, variants: multi,
    use: names[key] ? [...names[key]].slice(0, 4).join(', ') : '', subject: pats.map(subjectOf).join(' | '),
    view: sp.view, ref: '',
  });
}
// 인형 대신 그릴 완성 캐릭터 (DCSS에는 한 장짜리가 없다)
const CHAR = [
  ['knight', 'fantasy', '기사 (판타지 주인공): 판금 갑옷, 붉은 깃털 투구, 장검과 방패'],
  ['w_wuxia', 'shared', '화산귀환록 (세계 아이콘): 붉은 장포의 무협 검객 상반신'],
  ['cultivator', 'xianxia', '수선자 (선협 주인공): 흰 도포, 긴 머리, 지팡이, 신선 같은 분위기'],
  ['x_disciple', 'xianxia', '외문 제자: 흰 도포, 상투, 약초 바구니'],
  ['c_fisher', 'cthulhu', '인스머스의 낚시꾼 (조사관): 낡은 트렌치코트, 페도라, 낚싯대를 든 지친 남자'],
  ...['객잔 점소이: 흰 무명 저고리, 상투', '표국 표사: 가죽 갑옷, 삿갓, 몽둥이', '낭인 검객: 검은 바지, 붉은 장포, 변발, 검',
    '화산파 제자: 흰 도복, 상투, 검', '화산 대제자: 푸른 승복풍 도포, 쌍검', '화산 장로: 흰·붉은 도포, 흰 머리, 지팡이',
    '화산 장문인: 붉은 장포, 머리띠, 명검', '무림맹주: 붉은·금빛 장포, 관', '천하제일인: 붉은·금빛 장포, 흰 머리, 관',
    '매화검선: 흰 도포, 흰 머리, 머리 뒤 은은한 빛, 검'].map((d, i) => ['wx_hero' + i, 'wuxia', `무협 주인공 ${i + 1}단계 — ${d}`]),
];
for (const [key, w, use] of CHAR) {
  const icon = key === 'w_wuxia';
  assets.push({ key, world: w, kind: icon ? 'icon' : 'sprite', priority: /^(knight|cultivator|c_fisher|wx_hero0|w_wuxia)$/.test(key) ? 1 : 2, size: icon ? 128 : 256, transparent: true, variants: 1, use, subject: use, view: (icon ? SPEC.icon : SPEC.sprite).view, ref: '' });
}
// 참고 타일 경로를 실제 파일로
const tiles = fs.readdirSync(path.join(ROOT, 'assets', 'tiles'));
for (const a of assets) { const f = tiles.filter(t => t === a.key + '.png' || t.startsWith(a.key + '_')).sort(); a.ref = f.length ? 'assets/tiles/' + f[0] : ''; }
assets.sort((a, b) => a.priority - b.priority || a.world.localeCompare(b.world) || a.key.localeCompare(b.key));

fs.mkdirSync(path.join(ROOT, 'assets', 'art'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'assets', 'art', 'MANIFEST.json'), JSON.stringify({
  note: 'ART.md의 스타일 가이드를 따라 각 key를 assets/art/<key>.png (변형이 여럿이면 <key>_0.png, <key>_1.png …)로 저장한 뒤 node tools/build_art.js',
  assets,
}, null, 1));
const cnt = p => assets.filter(a => a.priority === p).length;
console.log(`그림 목록 ${assets.length}종 · P1 ${cnt(1)} · P2 ${cnt(2)} · P3 ${cnt(3)} · P4 ${cnt(4)}`);
