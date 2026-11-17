'use strict';
// 용병 그림: LAYERLAB 「2D Minimal - Character Maker」 파츠 인형 (js/paperdoll.js, assets/chars/)
// 직업 · 장비(SRD 무기 · 갑옷 · 방패 · 아티팩트) · 종족이 모습을 정하고, 애니메이션은 원본 곡선을 그대로 쓴다.
// 강화(m.gear)는 수치만 바꾸고 모습은 그대로다. 모습이 다른 것은 다른 아이템이다 (같은 무기 종류는 같은 사람에게 늘 같은 그림)
//
// 그리기: 인형은 픽셀 버퍼(pix)에 찍지 않고 화면 위 고해상도 층(#hd)에 원본 그대로 그린다.
//  - 가림: 그 자리의 깊이(zb)가 인형 판보다 앞이면 가린다. 벽(구운 깊이)에 가리면 반투명으로 비친다(XRAY와 같은 뜻)
//  - 인형보다 나중에 픽셀 버퍼에 그린 것(이펙트 · 파편 · 피해 숫자)은 인형 위로 다시 얹는다
//  - 쓰러진 몸은 예전처럼 픽셀 버퍼에 눕혀 찍는다
// 원본 파츠는 유료 에셋: 저장소에 공개로 올리지 않는다 (게임에 넣어 배포하는 것은 된다).
// ?art=dcss 이면 쓰지 않는다 (예전 DCSS 인형). ?ms=0.38 로 크기를 바꾼다.
const MINI_ON = DCSS && q.get('art') !== 'dcss' && !!window.PaperDoll, MS = +(q.get('ms') || 0.38);
let MINI_READY = false;
if (MINI_ON) PaperDoll.load('assets/chars/').then(() => { MINI_READY = true; }).catch(e => console.warn('minidoll:', e.message));

const MD = (() => {
  const C = () => PaperDoll.catalog;
  const hs = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (a, n) => a[(n >>> 0) % a.length];
  const real = cat => C()[cat].filter(n => !/_Line_|_Down$/.test(n));
  // 직업 모습: 투구(Helmet 번호) · 머리 · 왼손 물건. 무기와 갑옷은 실제 장비에서 온다
  const CLS = {
    dragoon: { helm: 40 }, paladin: { helm: 67 }, barbarian: { helm: 23, beard: 1 }, rogue: { helm: 41 }, archer: { helm: 18 },
    cleric: { helm: 28 }, bard: { helm: 15, sub: 'Book_001_Red' }, mage: { hair: '#d8463a', sub: 'MagicBall_001_Blue', wand: 1 },
    archmage: { helm: 19, beard: 1, sub: 'Book_001_Purple' }, scout: { helm: 14 }, monk: { bald: 1 }, warlock: { helm: 32, sub: 'Skull_001_White', wand: 1 },
  };
  const SKIN = { human: ['#f6c7a5', '#e8b08a', '#c98e66', '#9a6646'], elf: ['#fbe0cc', '#f1d2b8'], dwarf: ['#f0b898', '#d9a07c'], halfling: ['#f6c7a5', '#e2a983'], gnome: ['#f8cfb0', '#efbd9a'], orc: ['#8fbf6a', '#7aa85a'], goliath: ['#b8b4c4', '#a8a2b8'], tiefling: ['#d0605a', '#b84c58'], dragonborn: ['#7aa0c8', '#c8905a', '#6cae78'], aasimar: ['#fff0dc', '#f6e0c8'] };
  const HAIR = ['#3a2a22', '#6a4428', '#c89a4a', '#e8d070', '#b8b0a8', '#8a3a2a', '#2a2a3a'];
  // SRD 무기 → 파츠 종류 · 그 무기로 보일 수 있는 그림들(정렬 번호). 사람마다 그중 하나로 정해진다
  const WPN = {
    dagger: ['Sword', [10, 11, 12]], sickle: ['Sword', [10, 13]], shortsword: ['Sword', [5, 0, 2, 3, 4, 1]], scimitar: ['Sword', [13, 19, 20]], rapier: ['Sword', [11, 12, 21]],
    longsword: ['Sword', [6, 7, 8, 9, 14, 15, 16, 17, 18]], greatsword: ['Sword', [22, 23, 24, 25]],
    handaxe: ['Axe', [0, 1, 2, 3]], battleaxe: ['Axe', [13, 4, 5, 6, 7]], greataxe: ['Axe', [8, 9, 10, 11]], 'war-pick': ['Axe', [2, 3]],
    club: ['Blunt', [0, 2]], greatclub: ['Blunt', [0, 2, 8]], mace: ['Blunt', [1, 3, 4, 5]], morningstar: ['Blunt', [6, 7]], flail: ['Blunt', [6, 7]], 'light-hammer': ['Blunt', [3, 4]], warhammer: ['Blunt', [8, 9, 10]], maul: ['Blunt', [10, 11, 12]], whip: ['Blunt', [0]],
    spear: ['Spear', [0, 1, 2, 3, 5]], javelin: ['Spear', [0, 2]], pike: ['Spear', [6, 7, 8]], lance: ['Spear', [9, 10]], trident: ['Spear', [11, 12]], glaive: ['Spear', [13, 14]], halberd: ['Spear', [15, 16]],
    quarterstaff: ['Staff', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]], shortbow: ['Bow', [2, 3, 4, 5, 6]], longbow: ['Bow', [7, 8, 9, 10]],
    'light-crossbow': ['Crossbow', [0, 1, 2, 3]], 'heavy-crossbow': ['Crossbow', [4, 5, 6, 7]], 'hand-crossbow': ['Crossbow', [0, 1]], musket: ['Crossbow', [6, 7, 8]], pistol: ['Crossbow', [0, 1]],
  };
  // 아티팩트 무기: 종류마다 화려한 끝쪽 그림 (아티팩트마다 하나로 정해진다)
  const WPN_MAGIC = { Sword: [26, 27, 28, 29, 30, 31], Axe: [9, 10, 11, 12], Blunt: [9, 10, 11, 12], Spear: [12, 13, 14, 15, 16], Staff: [12, 13, 14, 15, 16, 17], Wand: [5, 6, 7, 8, 9], Bow: [11, 12, 13, 14], Crossbow: [8, 9, 10] };
  // 갑옷 분류 → Chest 번호 (그림을 보고 나눴다)
  const CHEST = { cloth: [0, 1, 2, 3, 4], robe: [8, 9, 10, 20, 21, 22, 23], light: [5, 6, 7, 13, 14, 15, 16, 17, 18, 19, 38, 39, 40, 41, 42], medium: [24, 25, 26, 35, 36, 37], heavy: [27, 28, 29, 30, 43, 44, 45, 46, 47, 48, 49, 50, 51] };
  const CHEST_MAGIC = { cloth: [11, 12, 33, 34], robe: [33, 34, 55, 56], light: [31, 32, 52, 53], medium: [31, 32, 54, 56], heavy: [52, 53, 54, 55, 56] };
  const ROBE_CLS = new Set(['mage', 'archmage', 'warlock', 'cleric', 'scout', 'bard']);
  const CASTER = new Set(['mage', 'archmage', 'warlock', 'cleric', 'scout']);

  function weaponOf(m, L, cls) {
    const SR = G.SRD, wq = SR.weaponOf(m), art = G.Trinket.weapon(m);
    let wk = Object.keys(SR.WEAPON).find(k => SR.WEAPON[k] === wq), wm = WPN[wk];
    if (cls.wand && (!wm || wk === 'dagger' || wk === 'quarterstaff')) wm = ['Wand', [0, 1, 2, 3, 4]];
    if (!wm) return null;
    const all = real(wm[0]);
    const artId = art && String(art.id ?? art.k ?? art.n ?? 'a');
    const i = art ? pick(WPN_MAGIC[wm[0]] || [all.length - 1], hs(artId)) : pick(wm[1], hs(m.uid + ':' + wk));
    return [wm[0], all[Math.min(all.length - 1, i)]];
  }
  function chestOf(m, aq) {
    const art = G.Trinket.armor(m);
    const ak = aq.cat === 'heavy' ? 'heavy' : aq.cat === 'medium' ? 'medium' : aq.cat === 'light' ? 'light' : ROBE_CLS.has(m.cls) ? 'robe' : 'cloth';
    const i = art ? pick(CHEST_MAGIC[ak], hs(String(art.id ?? art.k ?? art.n ?? 'a'))) : pick(CHEST[ak], hs(m.uid + ':' + aq.en));
    return C().Chest[i];
  }
  function lookOf(m) {
    const cls = CLS[m.cls] || {}, SR = G.SRD, e = SR.eq(m), aq = SR.armorOf(m), sp = G.Res.species(m) || 'human', h = hs(m.uid + ':' + m.name + ':' + (m.look ?? ''));
    const L = { colors: {} };
    L.colors.skin = pick(SKIN[sp] || SKIN.human, h >> 3);
    L.colors.hair = cls.hair || pick(HAIR, h >> 6);
    L.colors.beard = L.colors.hair;
    L.Eye = pick(C().Eye.filter(n => !/_(Blue|Green)$/.test(n)), h >> 9);
    L.Hair = cls.bald ? null : pick(C().Hair, h >> 12);
    L.Beard = cls.beard || (sp === 'dwarf') ? pick(C().Beard, h >> 15) : null;
    L.Helmet = cls.helm != null ? C().Helmet[cls.helm] : null;
    L.Chest = chestOf(m, aq);
    L.weapon = weaponOf(m, L, cls);
    L.Shield = e.shield ? C().Shield[hs(m.uid + 'sh') % 6] : null;
    const ranged = L.weapon && /Bow|Crossbow/.test(L.weapon[0]);
    L.Sub_Item = !L.Shield && cls.sub && !ranged ? C().Sub_Item.find(n => n.includes(cls.sub)) : null;
    L.Arrow = pick(C().Arrow, h >> 18);
    L._caster = CASTER.has(m.cls) && !ranged;
    return L;
  }

  // 인물별 인형 (모습이 바뀌면 다시 입힌다 — 강화 · 장비 교체가 바로 보인다)
  const dolls = new Map();
  function dollOf(m) {
    const L = lookOf(m), key = JSON.stringify(L); let d = dolls.get(m.uid);
    if (!d) { d = { doll: PaperDoll.create(L), key, cast: L._caster, cache: new Map(), L }; dolls.set(m.uid, d); }
    else if (d.key !== key) { d.doll.setLook(L); d.key = key; d.cast = L._caster; d.cache.clear(); d.L = L; }
    return d;
  }
  const partUrl = key => 'assets/chars/parts/' + key + '.png';
  // 상태창 장비 칸 그림: 지금 입은 무기 · 갑옷 · 방패 파츠
  function iconUrl(m, sl) {
    if (!MINI_READY) return null;
    const L = lookOf(m);
    if (sl === 'w') return L.weapon ? partUrl(L.weapon.join('/')) : null;
    if (sl === 'a') return L.Chest ? partUrl('Chest/' + L.Chest) : null;
    if (sl === 's') return L.Shield ? partUrl('Shield/' + L.Shield) : null;
    return null;
  }

  // ── 사람형 몬스터 (같은 에셋 · 피부색 · 크기 · 조합). 붉은 외곽선으로 우리 편과 가른다. 짐승 · 점액 · 식물 · 정령은 DCSS 그대로 ──
  // h: 투구 번호 · c: 갑옷 번호(null = 맨몸) · w: [무기 종류, 번호] · sh: 방패 · hair: 머리색(null = 대머리) · eye: 눈 색 · z: 크기 · scar: 흉터 · beard · sub: 왼손
  const UNDEAD_EYE = '#ff5040', FIEND_EYE = '#ffb020';
  const MON = {
    '고블린 졸개': { skin: '#7fae4a', z: 0.75, hair: '#2a3a1a', c: 2, w: ['Sword', 10] },
    '고블린 전사': { skin: '#7fae4a', z: 0.8, h: 16, c: 5, w: ['Sword', 13], sh: 0 },
    '고블린 두목': { skin: '#6f9e3a', z: 0.95, h: 44, c: 24, w: ['Axe', 4], beard: 1, hair: '#2a3a1a' },
    '홉고블린 전사': { skin: '#d9733f', z: 1, h: 57, c: 25, w: ['Sword', 7], sh: 3 },
    '홉고블린 대장': { skin: '#c9632f', z: 1.1, h: 56, c: 29, w: ['Sword', 16], sh: 7 },
    '버그베어 전사': { skin: '#9a6a3a', z: 1.3, h: 52, c: 14, w: ['Blunt', 6], hair: '#5a3a1a' },
    '놀 전사': { skin: '#b89a5a', z: 1.1, h: 50, c: 15, w: ['Spear', 2] },
    '오우거': { skin: '#c9a27a', z: 1.6, c: null, w: ['Blunt', 0], scar: 1 },
    '오우거 좀비': { skin: '#8fa07a', z: 1.6, c: null, w: ['Blunt', 0], scar: 1, eye: UNDEAD_EYE },
    '트롤': { skin: '#5f8f4a', z: 1.5, c: null, hair: '#2f4a2a', scar: 1 },
    '좀비': { skin: '#8fa07a', c: 2, hair: '#3a3a2a', eye: UNDEAD_EYE },
    '해골': { skin: '#ece6d6', c: null, w: ['Sword', 2], sh: 1, eye: UNDEAD_EYE },
    '구울': { skin: '#9c9a8a', c: 1, eye: UNDEAD_EYE },
    '와이트': { skin: '#b8bcc8', h: 71, c: 27, w: ['Sword', 18], eye: UNDEAD_EYE },
    '뱀파이어 스폰': { skin: '#ece0ec', hair: '#1a1a22', c: 28, eye: UNDEAD_EYE },
    '미노타우로스 해골': { skin: '#ece6d6', z: 1.4, h: 6, c: null, w: ['Axe', 9], eye: UNDEAD_EYE },
    '메이지': { h: 11, c: 21, w: ['Staff', 6], sub: 'Book_001_Blue', hair: '#6a6a7a', beard: 1 },
    '수련 사제': { h: 43, c: 23, w: ['Blunt', 3] },
    '사제': { h: 28, c: 20, w: ['Blunt', 5], sh: 2 },
    '불량배': { c: 13, w: ['Blunt', 0], hair: '#4a3020' },
    '불량배 두목': { h: 23, c: 26, w: ['Blunt', 10], beard: 1, scar: 1 },
    '산적': { h: 42, c: 7, w: ['Sword', 13] },
    '산적 두목': { h: 22, c: 35, w: ['Sword', 9], sh: 5, beard: 1, scar: 1 },
    '도플갱어': { skin: '#c8c8d0', c: 2 },
    '움직이는 갑옷': { skin: '#2a2a30', h: 39, c: 30, w: ['Sword', 9], sh: 4, eye: '#80c0ff' },
    '임프': { skin: '#c8402a', z: 0.6, h: 32, c: null, eye: FIEND_EYE },
    '바브드 데빌': { skin: '#a03030', z: 1.2, h: 35, c: null, w: ['Spear', 12], eye: FIEND_EYE },
    '본 데빌': { skin: '#d8d0b8', z: 1.4, h: 33, c: null, w: ['Spear', 14], eye: FIEND_EYE },
    '혼드 데빌': { skin: '#8a2020', z: 1.5, h: 34, c: null, w: ['Spear', 15], eye: FIEND_EYE },
    '아이스 데빌': { skin: '#8ab8e0', z: 1.5, h: 33, c: null, w: ['Spear', 16], eye: '#c0f0ff' },
  };
  const isMon = e => e.kind === 'mon' && !!MON[e.n];
  function monLook(e) {
    const M = MON[e.n], C0 = C(), L = { colors: { skin: M.skin || '#e8b08a', hair: M.hair || '#3a2a22', beard: M.hair || '#3a2a22', eye: M.eye || '#ffffff' } };
    L.Eye = C0.Eye[0]; L.Hair = M.hair || (M.hair === undefined && !M.skin) ? pick(C0.Hair, hs(e.n)) : null;
    L.Beard = M.beard ? pick(C0.Beard, hs(e.n + 'b')) : null;
    L.Helmet = M.h != null ? C0.Helmet[M.h] : null;
    L.Chest = M.c != null ? C0.Chest[M.c] : null;
    L.weapon = M.w ? [M.w[0], real(M.w[0])[Math.min(real(M.w[0]).length - 1, M.w[1])]] : null;
    L.Shield = M.sh != null ? C0.Shield[M.sh] : null;
    L.Sub_Item = M.sub && !L.Shield ? C0.Sub_Item.find(n => n.includes(M.sub)) : null;
    L.Arrow = C0.Arrow[0]; L.scar = !!M.scar;
    return L;
  }
  const mdolls = new WeakMap();
  function monDoll(e) {
    let d = mdolls.get(e); if (d) return d;
    const L = monLook(e); d = { doll: PaperDoll.create(L), key: e.n, cast: /메이지|사제/.test(e.n), cache: new Map(), L, size: MON[e.n].z || 1, mon: true };
    mdolls.set(e, d); return d;
  }

  // 상태 → 장면(클립 · 시각). 공격(lq: 0→1)은 Attack 곡선의 들어 올림~휘두름~마무리 구간에 맞춘다
  function pose(e, st) {
    const d = isMon(e) ? monDoll(e) : dollOf(e.merc || f.leader), A = PaperDoll.anims;
    let clip = 'Idle', time;
    if (st.lq < 1) { clip = d.cast ? 'Skill' : 'Attack'; time = d.cast ? .3 + st.lq * .7 : .55 + st.lq * .85; }
    else if (st.aim) { clip = 'Attack'; time = .8; }
    else if (st.moving) { clip = 'Run'; time = (st.t + (e._ph || 0)) % A.Run.len; }
    else time = (st.t * .9 + (e._ph || 0)) % A.Idle.len;
    return { d, clip, time };
  }
  function setPose(doll, clip, time) { const a = PaperDoll.anims[clip]; doll.play(clip, { once: !a.loop }); doll.update(time); }

  // 버퍼 크기 실루엣: 가림 계산 · 머리 위 표시 위치 · 쓰러진 몸 그림에 쓴다 (프레임마다 캐시)
  const FPS = 15;
  const cv = document.createElement('canvas');
  const cx = cv.getContext('2d', { willReadFrequently: true });
  function raster(doll, clip, time, z = 1) {
    const CW = Math.ceil(64 * z), CH = Math.ceil(68 * z), FOOT = Math.round(58 * z); // 큰 몸은 판도 크게
    if (cv.width !== CW || cv.height !== CH) { cv.width = CW; cv.height = CH; }
    setPose(doll, clip, time);
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, CW, CH);
    doll.draw(cx, CW / 2, FOOT, { scale: MS * z, flip: true });
    const d = new Uint32Array(cx.getImageData(0, 0, CW, CH).data.buffer), o = new Uint32Array(CW * CH);
    for (let i = 0; i < o.length; i++) if ((d[i] >>> 24) > 90) o[i] = d[i] | 0xff000000;
    let top = 0; find: for (; top < CH; top++) for (let x = 0; x < CW; x++) if (o[top * CW + x]) break find;
    return { w: CW, h: CH, foot: FOOT, px: o, top };
  }
  function frame(e, st) {
    const { d, clip, time } = pose(e, st), fi = Math.round(time * FPS), key = clip + fi;
    let sp = d.cache.get(key);
    if (!sp) { if (d.cache.size > 160) d.cache.clear(); sp = raster(d.doll, clip, fi / FPS, d.size || 1); d.cache.set(key, sp); }
    return Object.assign({}, sp, { mini: { d, clip, time } });
  }

  // ───── 고해상도 층 ─────
  let hd = null, hx = null, tmp = null, tx = null, snapPix = null;
  const queue = [];
  function layer() {
    if (hd) return;
    hd = document.createElement('canvas'); hd.id = 'hd';
    hd.style.cssText = 'position:absolute;pointer-events:none;';
    canvas.after(hd); hx = hd.getContext('2d');
    tmp = document.createElement('canvas'); tx = tmp.getContext('2d');
  }
  // ── 픽셀 몬스터 (DCSS 그림)를 고해상도로: Scale2x 두 번(4배)으로 대각선을 잇고 → 부드럽게 줄여 → 붉은 외곽선 (선 그림 배경일 때, js/iso/hdbg.js) ──
  const svgM = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svgM.setAttribute('width', 0); svgM.setAttribute('height', 0); svgM.style.position = 'absolute';
  svgM.innerHTML = `<filter id="monline" color-interpolation-filters="sRGB" x="-10%" y="-10%" width="120%" height="120%"><feComponentTransfer in="SourceGraphic" result="sh"><feFuncA type="linear" slope="3" intercept="-.7"/></feComponentTransfer><feMorphology in="sh" operator="dilate" radius="2" result="fat"/><feFlood flood-color="#e0302a"/><feComposite in2="fat" operator="in" result="ol"/><feMorphology in="sh" operator="dilate" radius="1" result="fat2"/><feFlood flood-color="#1d1418"/><feComposite in2="fat2" operator="in" result="ol2"/><feMerge><feMergeNode in="ol"/><feMergeNode in="ol2"/><feMergeNode in="sh"/></feMerge></filter>`;
  document.body.append(svgM); const monMorph = svgM.querySelectorAll('feMorphology');
  function scale2(src, w, h) { const W2 = w * 2, out = new Uint32Array(W2 * h * 2); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const E = src[y * w + x], B = y > 0 ? src[(y - 1) * w + x] : E, Hh = y < h - 1 ? src[(y + 1) * w + x] : E, D = x > 0 ? src[y * w + x - 1] : E, F2 = x < w - 1 ? src[y * w + x + 1] : E; let e0 = E, e1 = E, e2 = E, e3 = E; if (B !== Hh && D !== F2) { if (D === B) e0 = D; if (B === F2) e1 = F2; if (D === Hh) e2 = D; if (Hh === F2) e3 = F2; } const o = y * 2 * W2 + x * 2; out[o] = e0; out[o + 1] = e1; out[o + W2] = e2; out[o + W2 + 1] = e3; } return out; }
  const sprC = new WeakMap(), x4 = new WeakMap(); let monK = 0;
  function spriteHD(sp, s, flip) {
    let m = sprC.get(sp.px); if (!m) sprC.set(sp.px, m = new Map());
    const key = (s * 100 | 0) + (flip ? 'f' : ''); let o = m.get(key); if (o) return o;
    let big4 = x4.get(sp.px); if (!big4) { const h = sp.foot + 1, src = sp.px.subarray(0, sp.w * h); big4 = document.createElement('canvas'); big4.width = sp.w * 4; big4.height = h * 4; const a = scale2(scale2(src, sp.w, h), sp.w * 2, h * 2); big4.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(a.buffer), sp.w * 4, h * 4), 0, 0); x4.set(sp.px, big4); }
    const p = Math.ceil(s) + 3, cw = Math.ceil(sp.w * s) + p * 2, ch = Math.ceil((sp.foot + 1) * s) + p * 2;
    o = document.createElement('canvas'); o.width = cw; o.height = ch; const c = o.getContext('2d');
    if (Math.abs(s - monK) > .01) { monK = s; monMorph[0].setAttribute('radius', Math.max(2, s * .7)); monMorph[1].setAttribute('radius', Math.max(1, s * .3)); }
    c.filter = 'url(#monline)'; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    if (flip) { c.translate(cw, 0); c.scale(-1, 1); }
    c.drawImage(big4, p, p, sp.w * s, (sp.foot + 1) * s);
    o.p = p; if (m.size > 24) m.clear(); m.set(key, o); return o;
  }
  // drawRec에서: 서 있는 인형을 버퍼 대신 줄에 세운다
  function enqueue(R0, flip, flash) { queue.push({ R0, flip, flash }); }
  // 인형 그리기 직후(픽셀 버퍼에 이펙트를 얹기 전): 인형마다 보이는 픽셀 판정을 만들고 버퍼를 기억해 둔다
  function snap() {
    if (!queue.length) { snapPix = null; return; }
    for (const Q of queue) {
      const { sp, sx, sy, d, sc } = Q.R0, w = sp.w, L = Math.round(sx - w * sc / 2), B = Math.round(sy);
      const mw = Math.ceil(w * sc), mh = Math.ceil((sp.foot + 1) * sc), M = new Uint8ClampedArray(mw * mh * 4);
      for (let up = 0; up < mh; up++) {
        const j = sp.foot - Math.floor(up / sc), iy = B - up; if (j < 0 || iy < 0 || iy >= H) continue;
        const dz = d + up / (COS * S) * SIN + .06;
        for (let a = 0; a < mw; a++) {
          const i = Math.floor(a / sc), ix = L + a; if (ix < 0 || ix >= W) continue;
          const k = iy * W + ix, o = ((mh - 1 - up) * mw + a) * 4;
          // 앞에 무언가 있으면: 벽 · 바닥(구운 깊이)이면 비치고, 다른 인물 · 소품이면 가린다
          const al = dz > zb[k] ? 255 : zb[k] === bakedZ[k] ? 150 : 0;
          M[o] = M[o + 1] = M[o + 2] = 255; M[o + 3] = al;
        }
      }
      Q.mask = { w: mw, h: mh, L, T: B - mh + 1, data: new ImageData(M, mw, mh) };
    }
    snapPix = pix.slice();
  }
  function clear() { if (hd && hd.width) hx.clearRect(0, 0, hd.width, hd.height); queue.length = 0; }
  // 화면에 올리기 (putImageData 다음)
  const mcv = document.createElement('canvas'), mx = mcv.getContext('2d'), ocv = document.createElement('canvas'), ox = ocv.getContext('2d');
  function present() {
    layer();
    const k = canvas.clientWidth / W * (devicePixelRatio || 1), cw = Math.round(canvas.clientWidth * (devicePixelRatio || 1)), ch = Math.round(canvas.clientHeight * (devicePixelRatio || 1));
    if (hd.width !== cw || hd.height !== ch) { hd.width = cw; hd.height = ch; }
    hd.style.left = canvas.offsetLeft + 'px'; hd.style.top = canvas.offsetTop + 'px'; hd.style.width = canvas.clientWidth + 'px'; hd.style.height = canvas.clientHeight + 'px';
    hd.style.transform = canvas.style.transform; hd.style.opacity = canvas.style.opacity; hd.style.transition = canvas.style.transition;
    hx.setTransform(1, 0, 0, 1, 0, 0); hx.clearRect(0, 0, cw, ch);
    if (!queue.length) return;
    queue.sort((a, b) => a.R0.d - b.R0.d); // 먼 것부터
    for (const Q of queue) {
      const { R0, mask } = Q; if (!mask) continue;
      const { sx, sy, sc } = R0, px = !R0.sp.mini, { d: D, clip, time } = R0.sp.mini || {};
      const bw = Math.ceil(mask.w * k), bh = Math.ceil(mask.h * k);
      if (tmp.width < bw || tmp.height < bh) { tmp.width = Math.max(tmp.width, bw); tmp.height = Math.max(tmp.height, bh); }
      tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, tmp.width, tmp.height); tx.globalCompositeOperation = 'source-over';
      if (px) { const sp = R0.sp, o = spriteHD(sp, sc * k, Q.flip); tx.drawImage(o, (sx - sp.w * sc / 2 - mask.L) * k - o.p, (sy - (sp.foot + 1) * sc + 1 - mask.T) * k - o.p); } // 픽셀 몬스터: 붉은 외곽선까지 담긴 그림
      else {
      setPose(D.doll, clip, time);
      // 인형 발끝 = 버퍼의 (sx, sy). tmp 안에서는 마스크 왼쪽 위 기준
      D.doll.draw(tx, (sx - mask.L) * k, (sy - mask.T) * k, { scale: MS * sc * k * (D.size || 1), flip: !Q.flip });
      // 몬스터: 붉은 외곽선 (실루엣을 붉게 칠해 둘레에 깔고 그 위에 몸)
      if (D.mon) {
        if (ocv.width !== tmp.width || ocv.height !== tmp.height) { ocv.width = tmp.width; ocv.height = tmp.height; }
        ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'source-over'; ox.clearRect(0, 0, ocv.width, ocv.height); ox.drawImage(tmp, 0, 0);
        ox.globalCompositeOperation = 'source-in'; ox.fillStyle = '#e0302a'; ox.fillRect(0, 0, ocv.width, ocv.height); ox.globalCompositeOperation = 'source-over';
        const r = Math.max(1.5, k * 0.9); tx.globalCompositeOperation = 'destination-over';
        for (const [a, b] of [[-r, 0], [r, 0], [0, -r], [0, r], [-r, -r], [r, r], [-r, r], [r, -r]]) tx.drawImage(ocv, a, b);
        tx.globalCompositeOperation = 'source-over';
      }
      }
      if (Q.flash) { tx.globalCompositeOperation = 'source-atop'; tx.fillStyle = 'rgba(255,252,240,.85)'; tx.fillRect(0, 0, bw, bh); }
      // 가림 판정 곱하기 (버퍼 픽셀 단위 그대로 키운다)
      mcv.width = mask.w; mcv.height = mask.h; mx.putImageData(mask.data, 0, 0);
      tx.globalCompositeOperation = 'destination-in'; tx.imageSmoothingEnabled = false; tx.drawImage(mcv, 0, 0, mask.w * k, mask.h * k); tx.imageSmoothingEnabled = true;
      tx.globalCompositeOperation = 'source-over';
      hx.drawImage(tmp, 0, 0, bw, bh, Math.round(mask.L * k), Math.round(mask.T * k), bw, bh);
    }
    // 인형 뒤에 그려진 이펙트 · 숫자를 인형 위로 다시 얹는다 (인형이 있는 상자 안에서 버퍼가 바뀐 픽셀만)
    if (snapPix) {
      for (const Q of queue) {
        const M = Q.mask; if (!M) continue;
        const x0 = Math.max(0, M.L), y0 = Math.max(0, M.T), x1 = Math.min(W, M.L + M.w), y1 = Math.min(H, M.T + M.h), w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) continue;
        const out = new Uint32Array(w * h); let any = false;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const kk = (y0 + y) * W + x0 + x; if (pix[kk] !== snapPix[kk]) { out[y * w + x] = pix[kk]; any = true; } }
        if (!any) continue;
        mcv.width = w; mcv.height = h; mx.putImageData(new ImageData(new Uint8ClampedArray(out.buffer), w, h), 0, 0);
        hx.imageSmoothingEnabled = false; hx.drawImage(mcv, Math.round(x0 * k), Math.round(y0 * k), w * k, h * k); hx.imageSmoothingEnabled = true;
      }
    }
    queue.length = 0;
  }

  // 상태창 · 영지 얼굴: 원본 그대로 (작은 칸은 상반신, 상태창 그림은 전신)
  function portrait(m, cvs, full) {
    const go = () => {
      const d = dollOf(m), x = cvs.getContext('2d'); setPose(d.doll, 'Idle', .2);
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cvs.width, cvs.height);
      if (full) d.doll.draw(x, cvs.width / 2, cvs.height * .86, { scale: cvs.height / 150 });
      else d.doll.draw(x, cvs.width / 2, cvs.height * 1.18, { scale: cvs.width / 52 });
    };
    cvs.style.imageRendering = 'auto';
    if (MINI_READY) go(); else PaperDoll.load('assets/chars/').then(go).catch(() => {});
  }
  return { lookOf, frame, portrait, iconUrl, enqueue, snap, present, clear, isMon };
})();
