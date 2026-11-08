'use strict';
// 옛 코드 그림 인물 (?art=old 전용)
// 직업별 모습: a 몸통 · l 다리 · hat 머리 · w 무기 · o 왼손 · robe 긴 옷 · b 체격
const CLS = {
  dragoon: { a: C.steel, l: C.steelD, skin: C.skin, hair: C.wood, hat: 'helm', hatC: C.steel, w: 'spear', o: null, pad: C.blue, b: 1.05 },
  paladin: { a: C.gold, l: C.steel, skin: C.skin, hair: C.gold, hat: 'helm', hatC: C.gold, w: 'hammer', o: 'shield', oC: C.blue, pad: C.white, b: 1.08 },
  barbarian: { a: C.skinD, l: C.fur, skin: C.skinD, hair: C.red, hat: 'horns', hatC: C.furD, w: 'axe', o: null, pad: C.fur, b: 1.2 },
  rogue: { a: C.dark, l: C.ink, skin: C.skin, hair: C.ink, hat: 'hood', hatC: C.dark, w: 'dagger', o: 'dagger', cape: C.ink, b: .92 },
  archer: { a: C.green, l: C.wood, skin: C.skin, hair: C.wood, hat: 'hood', hatC: C.leaf, w: null, o: 'bow', cape: C.leaf, b: .98 },
  cleric: { a: C.cream, l: C.cream, skin: C.skin, hair: C.yellow, hat: 'cap', hatC: C.gold, w: 'mace', o: null, robe: C.cream, trim: C.gold, b: 1 },
  bard: { a: C.red, l: C.yellow, skin: C.skin, hair: C.wood, hat: 'feather', hatC: C.red, w: null, o: 'lute', pad: C.yellow, b: .96 },
  mage: { a: C.orange, l: C.red, skin: C.skin, hair: C.red, hat: 'none', w: 'flame', o: 'flame', robe: C.orange, trim: C.red, b: .95 },
  archmage: { a: C.purple, l: C.purple, skin: C.skin, hair: C.white, hat: 'pointy', hatC: C.purple, w: 'staff', o: null, robe: C.purple, trim: C.gold, b: .98 },
  scout: { a: C.leaf, l: C.fur, skin: C.skin, hair: C.fur, hat: 'antler', hatC: C.woodL, w: 'staff', o: null, robe: C.green, trim: C.leaf, b: .98 },
  monk: { a: C.yellow, l: C.orange, skin: C.skin, hair: null, hat: 'none', w: null, o: null, sash: C.red, b: .95 },
  warlock: { a: C.ink, l: C.ink, skin: [190, 170, 200], hair: C.purple, hat: 'horns', hatC: C.dark, w: null, o: 'orb', robe: C.dark, trim: C.purple, b: 1 },
};
const hum = (a, l, skin, opt = {}) => Object.assign({ a, l, skin, hair: null, hat: 'none', eyes: true }, opt);
function monModel(o) {
  const n = o.n || '';
  if (/점액/.test(n)) return { blob: true, c: /진흙/.test(n) ? C.slime2 : C.slime };
  if (/버섯/.test(n)) return { mush: true, c: C.mush, b: /거인/.test(n) ? 1.7 : 1 };
  if (/늑대|곰/.test(n)) return { quad: true, c: /곰/.test(n) ? C.furD : [120, 120, 128], b: /곰/.test(n) ? 1.45 : 1 };
  if (/거미|초트/.test(n)) return { spider: true, c: C.ink };
  if (/망령/.test(n)) return { ghost: true, c: C.orange };
  if (/해골/.test(n)) return hum(C.bone, C.bone, C.bone, { thin: true, w: /기사/.test(n) ? 'axe' : 'dagger', b: .98 });
  if (/좀비/.test(n)) return hum(C.wood, C.earth, /얼음/.test(n) ? [150, 190, 210] : C.zom, { hunch: .35, b: /꼬마/.test(n) ? .72 : /거대/.test(n) ? 1.5 : 1 });
  if (/고블린/.test(n)) return hum(C.earth, C.furD, C.gob, { w: 'dagger', b: .72, ears: true });
  if (/임프/.test(n)) return hum(C.imp, C.imp, C.imp, { hat: 'horns', hatC: C.ink, b: .68, tail: true });
  if (/오크/.test(n)) return hum(C.earth, C.furD, C.orc, { w: 'axe', b: 1.18, hat: /가면/.test(n) ? 'cap' : 'none', hatC: C.bone, ears: true });
  if (/놀/.test(n)) return hum(C.furD, C.fur, C.gnoll, { w: /주술/.test(n) ? 'staff' : 'spear', snout: true, b: 1.08 });
  if (/산적/.test(n)) return hum(C.wood, C.ink, C.skin, { w: 'dagger', hat: 'hood', hatC: C.red });
  if (/오우거|트롤|워골|거인|골렘|엔트/.test(n)) return hum(/골렘/.test(n) ? C.stone : C.fur, C.furD, /골렘/.test(n) ? C.stone : C.orc, { w: 'hammer', b: 1.55 });
  if (/악마/.test(n)) return hum(C.imp, C.ink, C.imp, { hat: 'horns', hatC: C.ink, w: 'axe', b: 1.45, tail: true });
  if (/강령|주술/.test(n)) return hum(C.dark, C.dark, C.bone, { robe: C.dark, trim: C.teal, w: 'staff', hat: 'hood', hatC: C.dark });
  return hum(C.dark, C.ink, C.zom, { w: 'dagger' });
}

// ───── 사람 그리기 ─────
const pend = [];
const bone = (a, b, r0, r1, c) => { capsule(a, b, r0, r1, c); pend.push(a, r0, b); };
function flushShadow() {
  for (let i = 0; i < pend.length; i += 3) {
    const a = pend[i], ra = pend[i + 1], c = pend[i + 2], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) / .3));
    for (let k = 0; k <= n; k++) { const t = k / n; castShadow(lerp(a[0], c[0], t), lerp(a[1], c[1], t), lerp(a[2], c[2], t), ra * .9); }
    if (a[2] < .25) castShadow(a[0], a[1], 0, .22, 2);
  }
  pend.length = 0;
}
// 납작한 원판: 방패 · 둥근 도끼날
function disc(c, ux, uy, uz, vx, vy, vz, R, col) {
  const n = Math.ceil(R / .09);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const a = i / n, b = j / n; if (a * a + b * b > 1) continue; sphere(c[0] + (ux * a + vx * b) * R, c[1] + (uy * a + vy * b) * R, c[2] + (uz * a + vz * b) * R, .09, col, 'solid'); }
}
function weapon(kind, hand, dir, up, k, oc) {
  const sx = -dir[1], sy = dir[0], cu = Math.cos(up), su = Math.sin(up);
  const at = f => [hand[0] + dir[0] * f * cu * k, hand[1] + dir[1] * f * cu * k, hand[2] + f * su * k];
  if (kind === 'spear') { capsule(at(-.5), at(1.75), .05 * k, .05 * k, C.wood); capsule(at(1.7), at(2.15), .1 * k, .025 * k, C.white); }
  else if (kind === 'hammer') { capsule(at(-.1), at(.95), .055 * k, .055 * k, C.wood); const h = at(1); capsule([h[0] + dir[0] * su * .2 * k, h[1] + dir[1] * su * .2 * k, h[2] - cu * .2 * k], [h[0] - dir[0] * su * .2 * k, h[1] - dir[1] * su * .2 * k, h[2] + cu * .2 * k], .15 * k, .15 * k, C.steel); }
  else if (kind === 'axe') { capsule(at(-.1), at(1.05), .055 * k, .055 * k, C.wood); const h = at(.92); disc([h[0] + dir[0] * .2 * k, h[1] + dir[1] * .2 * k, h[2]], dir[0], dir[1], 0, 0, 0, 1, .24 * k, C.white); }
  else if (kind === 'mace') { capsule(at(-.05), at(.72), .055 * k, .055 * k, C.wood); const h = at(.8); sphere(h[0], h[1], h[2], .15 * k, C.gold, 'solid'); }
  else if (kind === 'dagger') capsule(at(0), at(.5), .07 * k, .025 * k, C.white);
  else if (kind === 'staff') { capsule([hand[0], hand[1], .1], [hand[0], hand[1], hand[2] + .95 * k], .05 * k, .05 * k, C.woodL); sphere(hand[0], hand[1], hand[2] + 1.05 * k, .17 * k, C.gem, 'glow'); }
  else if (kind === 'flame') { sphere(hand[0], hand[1], hand[2] + .16 * k, .17 * k, C.flame, 'glow'); sphere(hand[0], hand[1], hand[2] + .26 * k, .08 * k, C.flameH, 'glow'); }
  else if (kind === 'orb') sphere(hand[0], hand[1], hand[2] + .26 * k, .15 * k, C.purple, 'glow');
  else if (kind === 'bow') { let last = null; for (let i = -4; i <= 4; i++) { const t = i / 4, f = (1 - t * t) * .3, pt = [hand[0] + (dir[0] * f) * k, hand[1] + (dir[1] * f) * k, hand[2] + t * .72 * k]; if (last) capsule(last, pt, .04 * k, .04 * k, C.woodL); last = pt; } capsule([hand[0], hand[1], hand[2] - .72 * k], [hand[0], hand[1], hand[2] + .72 * k], .012, .012, C.white); }
  else if (kind === 'shield') disc([hand[0] + dir[0] * .16 * k, hand[1] + dir[1] * .16 * k, hand[2] + .04], sx, sy, 0, 0, 0, 1, .4 * k, oc || C.blue);
  else if (kind === 'lute') { sphere(hand[0] + dir[0] * .16 * k, hand[1] + dir[1] * .16 * k, hand[2], .2 * k, C.woodL, 'solid'); capsule([hand[0], hand[1], hand[2]], [hand[0] - dir[0] * .3 * k, hand[1] - dir[1] * .3 * k, hand[2] + .5 * k], .04 * k, .04 * k, C.wood); }
}
// 미니어처 비율: 머리가 크고 다리가 짧다 (작게 찍혀도 누구인지 읽히게)
function person(x, y, yaw, m, p) {
  const k = (m.b || 1) * (p.scale || 1), fx = Math.cos(yaw), fy = Math.sin(yaw), sx = -fy, sy = fx, Z = p.z || 0;
  const P = (a, b, c) => [x + (fx * a + sx * b) * k, y + (fy * a + sy * b) * k, c * k + Z];
  const col = c => (p.flash ? C.hit : c);
  const lean = (p.lean || 0) + (m.hunch || 0), hipZ = .78, shA = Math.sin(lean) * .68, shZ = hipZ + Math.cos(lean) * .68, HR = m.thin ? .3 : .35;
  const head = P(shA + Math.sin(lean) * .34, 0, shZ + .44), neck = P(shA, 0, shZ + .06), fat = m.thin ? .55 : 1;
  const sw = p.step || 0;
  const footB = P(-sw * .36 - .06, .19, .1 + Math.max(0, sw) * .18), footF = P(sw * .36 + .08, -.19, .1 + Math.max(0, -sw) * .18);
  if (m.robe) { bone(P(0, 0, hipZ + .1), P(-.02, 0, .2), .32, .46, col(m.robe)); if (m.trim) capsule(P(-.02, 0, .12), P(-.02, 0, .12), .47, .47, col(m.trim)); }
  else {
    bone(P(0, .17, hipZ), footB, .19 * fat, .14 * fat, col(m.l)); bone(P(0, -.17, hipZ), footF, .19 * fat, .14 * fat, col(m.l));
    capsule(footB, P(-sw * .36 + .12, .19, .09), .13 * fat, .12 * fat, col(C.ink)); capsule(footF, P(sw * .36 + .26, -.19, .09), .13 * fat, .12 * fat, col(C.ink));
  }
  if (m.cape) capsule(P(shA - .22, 0, shZ), P(-.4, 0, .34), .3, .44, col(m.cape));
  if (m.tail) capsule(P(-.2, 0, hipZ), P(-.85, 0, .6), .09, .04, col(m.a));
  bone(P(0, 0, hipZ), neck, .31 * fat, .36 * fat, col(m.a));
  if (m.sash) capsule(P(.02, .26, hipZ + .1), P(.02, -.26, hipZ + .1), .13, .13, col(m.sash));
  const shR = P(shA, .42, shZ - .02), shL = P(shA, -.42, shZ - .02);
  if (m.pad) { sphere(shR[0], shR[1], shR[2] + .05, .2 * k, col(m.pad), 'solid'); sphere(shL[0], shL[1], shL[2] + .05, .2 * k, col(m.pad), 'solid'); }
  const armR = p.arm == null ? .45 : p.arm, armL = p.armL == null ? .55 : p.armL;
  const handR = P(shA + Math.sin(armR) * .62, .46, shZ - .02 - Math.cos(armR) * .62), handL = P(shA + Math.sin(armL) * .58, -.48, shZ - .02 - Math.cos(armL) * .58);
  const sleeve = col(m.a === m.skin || !m.a ? m.skin : m.robe || m.a);
  bone(shR, handR, .13 * fat, .1 * fat, sleeve); bone(shL, handL, .13 * fat, .1 * fat, sleeve);
  sphere(handR[0], handR[1], handR[2], .1 * k, col(m.skin), 'solid'); sphere(handL[0], handL[1], handL[2], .1 * k, col(m.skin), 'solid');
  capsule(head, head, HR, HR, col(m.skin));
  if (m.snout) capsule(P(shA + .3, 0, shZ + .4), P(shA + .66, 0, shZ + .34), .17, .1, col(m.skin));
  if (m.ears) { capsule(P(shA, .3, shZ + .5), P(shA - .08, .62, shZ + .62), .08, .03, col(m.skin)); capsule(P(shA, -.3, shZ + .5), P(shA - .08, -.62, shZ + .62), .08, .03, col(m.skin)); }
  if (m.hair) sphere(head[0] - fx * .08 * k, head[1] - fy * .08 * k, head[2] + .1 * k, (HR - .03) * k, col(m.hair), 'solid');
  const hc = col(m.hatC || C.dark), top = (a, b, c) => P(shA + a, b, shZ + .44 + c), H2 = (dz, r, back = 0) => sphere(head[0] - fx * back * k, head[1] - fy * back * k, head[2] + dz * k, r * k, hc, 'solid');
  if (m.hat === 'helm') { H2(.05, .385); capsule(top(.02, 0, .32), top(-.3, 0, .56), .08, .03, col(C.red)); }
  else if (m.hat === 'hood') H2(.04, .395, .08);
  else if (m.hat === 'cap') H2(.14, .32);
  else if (m.hat === 'pointy') { for (let a = 0; a < 6.28; a += .5) sphere(head[0] + Math.cos(a) * .5 * k, head[1] + Math.sin(a) * .5 * k, head[2] + .18 * k, .12 * k, hc, 'solid'); capsule(top(0, 0, .22), top(-.16, 0, 1.05), .32, .03, hc); }
  else if (m.hat === 'horns') { H2(.08, .35); capsule(top(0, .28, .2), top(.08, .54, .62), .09, .025, col(C.bone)); capsule(top(0, -.28, .2), top(.08, -.54, .62), .09, .025, col(C.bone)); }
  else if (m.hat === 'feather') { H2(.13, .345); capsule(top(-.08, .26, .26), top(-.5, .42, .85), .07, .02, col(C.white)); }
  else if (m.hat === 'antler') { capsule(top(0, .22, .24), top(0, .52, .78), .06, .025, hc); capsule(top(0, -.22, .24), top(0, -.52, .78), .06, .025, hc); capsule(top(0, .38, .52), top(.2, .58, .62), .035, .02, hc); capsule(top(0, -.38, .52), top(.2, -.58, .62), .035, .02, hc); }
  if (m.eyes && fx + fy > -.2) for (const b of [.13, -.13]) { const e = project(head[0] + (fx * HR * .92 + sx * b) * k, head[1] + (fy * HR * .92 + sy * b) * k, head[2] + .04 * k), i = (e.sy | 0) * W + (e.sx | 0); if (i > 0 && i < pix.length) { pix[i] = rgb(...C.eye); zb[i] = 1e6; } }
  const up = p.up == null ? .9 : p.up, d = [fx, fy];
  if (m.w) weapon(m.w, handR, d, up, k);
  if (m.o) weapon(m.o, handL, d, up, k, m.oC);
}
function lying(x, y, yaw, m) {
  const fx = Math.cos(yaw) * FIG, fy = Math.sin(yaw) * FIG, P = (a, c) => [x + fx * a, y + fy * a, c];
  bone(P(-.9, .2), P(-.1, .22), .16, .16, m.l); bone(P(-.1, .28), P(.75, .3), .3, .3, m.a); capsule(P(1.1, .28), P(1.1, .28), .25, .25, m.skin);
  if (m.hair) sphere(x + fx * 1.2, y + fy * 1.2, .34, .2 * FIG, m.hair, 'solid');
  for (let i = 0; i < 26; i++) { const a = hash(i, x | 0) * 6.28, r = hash(i, 3) * .9, pt = project(x + Math.cos(a) * r, y + Math.sin(a) * r, 0), j = (pt.sy | 0) * W + (pt.sx | 0); if (j > 0 && j < pix.length && zb[j] === bakedZ[j]) pix[j] = rgb(...C.blood); }
}
function grave(x, y) {
  block(x - .42, y - .15, 0, x + .42, y + .15, 1.45, [188, 182, 170]); sphere(x, y, 1.45, .42, [188, 182, 170], 'solid');
  capsule([x - .55, y + .5, .06], [x + .55, y + .5, .06], .3, .3, C.earth); castShadow(x, y, .6, .4);
}
function blob(x, y, m, t, flash) { const c = flash ? C.hit : m.c, w = 1 + Math.sin(t * 4 + x) * .08, k = FIG; sphere(x, y, .52 * k / w, .62 * k * w, c, 'solid'); sphere(x + .22 * k, y + .1 * k, .85 * k / w, .24 * k, flash ? C.hit : C.white, 'solid'); castShadow(x, y, 0, .68 * k, 2); }
function shroom(x, y, m, t, flash) { const b = m.b * FIG; bone([x, y, 0], [x, y, .9 * b], .24 * b, .2 * b, flash ? C.hit : C.cream); sphere(x, y, 1.08 * b, .56 * b, flash ? C.hit : m.c, 'solid'); sphere(x - .2 * b, y - .15 * b, 1.38 * b, .1 * b, C.white, 'solid'); }
function quad(x, y, yaw, m, t, moving, flash) {
  const b = m.b * FIG, fx = Math.cos(yaw), fy = Math.sin(yaw), sx = -fy, sy = fx, c = flash ? C.hit : m.c, P = (a, s, z) => [x + (fx * a + sx * s) * b, y + (fy * a + sy * s) * b, z * b];
  const sw = moving ? Math.sin(t * 12) * .25 : 0;
  for (const [a, s, ph] of [[.55, .2, 1], [.55, -.2, -1], [-.55, .2, -1], [-.55, -.2, 1]]) bone(P(a, s, .7), P(a + sw * ph, s, .08), .11, .08, c);
  capsule(P(-.6, 0, .85), P(.6, 0, .9), .34, .32, c); pend.push(P(-.6, 0, .85), .34 * b, P(.6, 0, .9));
  capsule(P(.75, 0, 1.15), P(1.15, 0, 1.08), .25, .13, c); capsule(P(.72, .13, 1.32), P(.72, .13, 1.55), .07, .02, c); capsule(P(.72, -.13, 1.32), P(.72, -.13, 1.55), .07, .02, c);
  capsule(P(-.9, 0, 1), P(-1.25, 0, 1.2), .08, .03, c);
  const e = project(...P(1.05, .1, 1.15)), i = (e.sy | 0) * W + (e.sx | 0); if (i > 0 && i < pix.length) { pix[i] = rgb(...C.eye); zb[i] = 1e6; }
}
function spider(x, y, m, t, flash) { const c = flash ? C.hit : m.c, k = FIG; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + .4, f = [x + Math.cos(a) * 1.15 * k, y + Math.sin(a) * 1.15 * k, .05], j = [x + Math.cos(a) * .72 * k, y + Math.sin(a) * .72 * k, (.72 + Math.sin(t * 8 + i) * .05) * k]; capsule([x, y, .55 * k], j, .08, .06, c); capsule(j, f, .06, .04, c); } sphere(x, y, .55 * k, .46 * k, c, 'solid'); sphere(x + .32 * k, y + .32 * k, .52 * k, .24 * k, c, 'solid'); castShadow(x, y, 0, .7 * k, 2); }
function ghost(x, y, m, t, flash) { const k = FIG, z = .5 + Math.sin(t * 2 + x) * .12, c = flash ? C.hit : m.c; sphere(x, y, z + .9 * k, .46 * k, c, 'glow'); capsule([x, y, z + .8 * k], [x, y, z], .4 * k, .12 * k, c); castShadow(x, y, 0, .4 * k); }
