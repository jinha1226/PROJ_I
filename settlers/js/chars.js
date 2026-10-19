'use strict';
// 정착민(캐릭터) 생성, 능력치 계산, 전투 판정 — 정착지와 던전이 함께 쓴다


G.Chars = {
  COLORS: ['#ffffff', '#ffe080', '#80e0ff', '#ff9ad0', '#a0ff90', '#ffb070', '#c0a0ff', '#70ffd0', '#ff8080', '#e0e0a0'],

  create(taken) {
    const raceK = U.pick(Object.keys(G.RACES)), bgK = U.pick(Object.keys(G.BGS));
    const race = G.RACES[raceK], bg = G.BGS[bgK];
    const traits = [];
    const nT = U.chance(0.55) ? 2 : 1;
    const keys = U.shuffle(Object.keys(G.TRAITS));
    for (const t of keys) {
      if (traits.length >= nT) break;
      if (traits.some(o => G.TRAITS[o].x === t || G.TRAITS[t].x === o)) continue;
      traits.push(t);
    }
    const skills = {};
    for (const s in G.SKILLS) skills[s] = 0;
    for (const s in bg.sk) skills[s] += bg.sk[s];
    if (race.sk) for (const s in race.sk) skills[s] += race.sk[s];
    for (let i = 0; i < 2; i++) skills[U.pick(Object.keys(G.SKILLS))] += 1;
    const used = new Set(G.S.colonists.map(c => c.name).concat(taken || []));
    const names = G.NAMES.filter(n => !used.has(n));
    const c = {
      id: U.uid(), name: U.pick(names.length ? names : G.NAMES), race: raceK, bg: bgK, traits,
      str: Math.max(3, U.randi(6, 13) + race.str), dex: Math.max(3, U.randi(6, 13) + race.dex), int: Math.max(3, U.randi(6, 13) + race.int),
      xl: 1, xp: 0, skills, skx: {}, hp: 1, mp: 1, food: U.randi(70, 90), rest: U.randi(70, 95), mood: 55, thoughts: [],
      equip: { weapon: null, armor: null, shield: null, pack: null }, spells: (bg.spells || []).slice(),
      pri: {}, loc: 'home', color: U.pick(G.Chars.COLORS), kills: 0, status: {}, x: 0, y: 0,
      expeditions: 0, deepest: 0,
    };
    for (const w of G.WORK) {
      const sk = G.WORK_SKILL[w];
      c.pri[w] = sk && c.skills[sk] >= 3 ? 1 : w === 'research' ? (c.int >= 11 || c.skills.research >= 2 ? 2 : 3) : w === 'haul' ? 3 : 2;
    }
    for (const g of bg.gear) {
      const it = G.Chars.makeGear(g);
      c.equip[G.GEAR[g].slot] = it;
    }
    c.hp = G.Chars.maxHP(c);
    c.mp = G.Chars.maxMP(c);
    return c;
  },

  makeGear(base, plus, ego) {
    return { id: U.uid(), base, plus: plus || 0, ego: ego || null };
  },

  gearName(it) {
    const d = G.GEAR[it.base];
    let s = (it.plus ? (it.plus > 0 ? '+' : '') + it.plus + ' ' : '') + d.n;
    if (it.ego) s += ' (' + G.EGO[it.ego].n + ')';
    return s;
  },

  gearDesc(it) {
    const d = G.GEAR[it.base];
    if (d.slot === 'weapon') return `${G.SKILLS[d.skill]} · 피해 ${d.dmg} · 속도 ${d.delay}${d.ranged ? ' · 사거리 ' + d.range : ''}${d.two ? ' · 양손' : ''}${d.spell ? ' · 주문 +' + d.spell : ''}`;
    if (d.slot === 'pack') return `가방 용량 +${d.cap}`;
    return `방어 ${d.ac + (it.plus || 0)}${d.evp ? ' · 회피 -' + d.evp : ''}${d.mp ? ' · MP +' + d.mp : ''}`;
  },

  has: (c, t) => c.traits.includes(t),

  maxHP(c) {
    let hp = (12 + c.xl * 5 + c.str) * (1 + c.skills.fighting * 0.03) * G.RACES[c.race].hp;
    if (G.Chars.has(c, 'tough')) hp *= 1.2;
    return Math.round(hp);
  },

  maxMP(c) {
    let mp = 1 + c.xl * 0.8 + c.skills.magic * 1.2 + c.int / 4;
    if (c.equip.armor && G.GEAR[c.equip.armor.base].mp) mp += G.GEAR[c.equip.armor.base].mp;
    return Math.round(mp);
  },

  weaponDef(c) {
    if (c.equip.weapon) return G.GEAR[c.equip.weapon.base];
    // 정착지에서는 무기가 없어도 농기구를 집어 든다
    if (c.loc === 'home') return { n: '농기구', dmg: 5, delay: 12, skill: 'fighting', slot: 'weapon' };
    return { n: '맨손', dmg: 3, delay: 10, skill: 'fighting', slot: 'weapon' };
  },

  // 전투 프로필
  stats(c) {
    const w = c.equip.weapon, wd = G.Chars.weaponDef(c);
    const sk = c.skills[wd.skill] || 0, ft = c.skills.fighting, st = c.status || {};
    let acc = 4 + c.dex * 0.5 + sk + ft * 0.5 + (w ? w.plus : 0);
    if (G.Chars.has(c, 'brave')) acc += 2;
    if (st.might) acc += 3;
    let mul = 1 + (c.str - 10) * 0.035 + sk * 0.05 + ft * 0.02;
    if (wd.ranged) mul = 1 + (c.dex - 10) * 0.03 + sk * 0.06;
    if (G.S.research.done.anatomy) mul *= 1.1;
    if (st.might) mul *= 1.3;
    let ac = 0, evp = 0;
    const arm = c.equip.armor, sh = c.equip.shield;
    if (arm) { const d = G.GEAR[arm.base]; ac += (d.ac + arm.plus + (arm.ego === 'protection' ? 3 : 0)) * (1 + c.skills.armour * 0.07); evp += Math.max(0, d.evp - c.skills.armour * 0.5); }
    if (sh) { const d = G.GEAR[sh.base]; ac += (d.ac + sh.plus) * (1 + c.skills.armour * 0.04); evp += d.evp; }
    let ev = 3 + c.dex * 0.5 + c.skills.dodging * 0.9 - evp;
    if (G.Chars.has(c, 'nimble')) ev += 3;
    if (G.Chars.has(c, 'coward')) ev += 2;
    let delay = Math.max(wd.delay * 0.6, wd.delay - sk * 0.4);
    return {
      acc, dmg: wd.dmg, mul: Math.max(0.5, mul), plus: w ? w.plus : 0, ac: Math.max(0, ac), ev: Math.max(0, ev), delay,
      ranged: !!wd.ranged, range: wd.range || 1, skill: wd.skill, ego: w ? w.ego : null,
    };
  },

  moveCost(c) {
    let m = G.Chars.has(c, 'quick') ? 8 : 10;
    if (c.status && c.status.haste) m *= 0.6;
    if (c.status && c.status.slow) m *= 1.5;
    return m;
  },

  learnMul(c) {
    let m = G.RACES[c.race].learn || 1;
    if (G.Chars.has(c, 'genius')) m *= 1.4;
    if (G.Chars.has(c, 'dull')) m *= 0.7;
    return m;
  },

  train(c, sk, amt) {
    if (!sk || c.skills[sk] >= 15) return;
    c.skx[sk] = (c.skx[sk] || 0) + amt * G.Chars.learnMul(c);
    const need = (c.skills[sk] + 1) * 10;
    if (c.skx[sk] >= need) {
      c.skx[sk] -= need;
      c.skills[sk]++;
      if (sk === 'fighting' || sk === 'magic') { c.hp = Math.min(c.hp, G.Chars.maxHP(c)); }
      G.msg(`${c.name}의 ${G.SKILLS[sk]} 기술이 ${c.skills[sk]}(으)로 올랐다.`, 'good');
    }
  },

  xpNeed: xl => 8 * xl * xl,

  gainXP(c, amt) {
    c.xp += amt;
    while (c.xl < 20 && c.xp >= G.Chars.xpNeed(c.xl)) {
      const oh = G.Chars.maxHP(c), om = G.Chars.maxMP(c);
      c.xl++;
      if (c.xl % 3 === 0) {
        const s = U.pick(['str', 'dex', 'int']);
        c[s]++;
      }
      c.hp += G.Chars.maxHP(c) - oh;
      c.mp += G.Chars.maxMP(c) - om;
      G.msg(`★ ${c.name}의 레벨이 ${c.xl}(으)로 올랐다!`, 'good');
    }
  },

  gainXPQuiet(c) { c.xp = G.Chars.xpNeed(c.xl); c.xl++; },

  workSpeed(c, sk) {
    let s = sk ? 0.55 + c.skills[sk] * 0.1 : 1;
    if (G.Chars.has(c, 'industrious')) s *= 1.25;
    if (G.Chars.has(c, 'lazy')) s *= 0.75;
    if (c.mood > 70) s *= 1.1;
    else if (c.mood < 35) s *= 0.85;
    if (c.hp < G.Chars.maxHP(c) * 0.5) s *= 0.7;
    return s;
  },

  foodRate(c) {
    let r = 100 / (1200 * 1.1);
    r *= G.RACES[c.race].food || 1;
    if (G.Chars.has(c, 'glutton')) r *= 1.5;
    if (G.Chars.has(c, 'light_eater')) r *= 0.7;
    return r;
  },

  stealth(c) {
    const armEvp = c.equip.armor ? G.GEAR[c.equip.armor.base].evp : 0;
    return c.dex * 0.5 + c.skills.dodging * 0.6 + (G.RACES[c.race].stealth || 0) - armEvp * 0.5;
  },

  spellPower(c) {
    const st = c.equip.weapon && G.GEAR[c.equip.weapon.base].spell || 0;
    return c.skills.magic + c.int * 0.25 + st;
  },

  title(c) {
    return `${G.RACES[c.race].n} ${G.BGS[c.bg].n}`;
  },

  addThought(c, id, v, dur, label) {
    const now = G.S.settle.tick;
    c.thoughts = c.thoughts.filter(t => t.id !== id);
    c.thoughts.push({ id, v, until: now + dur, label });
  },
};

// 전투 판정 (캐릭터·몬스터 공통)
G.Combat = {
  profile(e) {
    if (!e.isMon) return G.Chars.stats(e);
    const d = G.MON[e.type], st = e.status;
    return { acc: d.acc + (st.might ? 3 : 0), dmg: d.dmg, mul: st.might ? 1.3 : 1, plus: 0, ac: d.ac, ev: d.ev, delay: 10, ranged: false };
  },

  hitChance(acc, ev) { return U.clamp(0.62 + (acc - ev) * 0.035, 0.08, 0.97); },

  // opts: mul, sure, accBonus, dmgOverride
  attack(att, def, opts) {
    opts = opts || {};
    const A = G.Combat.profile(att), D = G.Combat.profile(def);
    const unaware = def.isMon && (def.state === 'sleep' || def.status.stun);
    let acc = A.acc + (opts.accBonus || 0) + (unaware ? 8 : 0);
    if (!opts.sure && Math.random() > G.Combat.hitChance(acc, D.ev)) {
      if (!def.isMon) G.Chars.train(def, 'dodging', 0.6);
      return { hit: false, dmg: 0 };
    }
    let dmg;
    const base = opts.dmgOverride || A.dmg;
    if (!att.isMon) dmg = U.randi(1, base) * A.mul + A.plus;
    else dmg = U.randi(1, base) * A.mul;
    dmg *= opts.mul || 1;
    if (!att.isMon && def.isMon && def.state === 'sleep') dmg *= 1.5;
    let extra = '';
    if (A.ego === 'flaming') { dmg += U.randi(1, 5); extra = '화염'; }
    if (A.ego === 'freezing') { dmg += U.randi(1, 4); if (U.chance(0.25) && def.status) def.status.slow = 4; extra = '냉기'; }
    if (A.ego === 'venom' && def.status && U.chance(0.5)) { def.status.poison = (def.status.poison || 0) + 4; extra = '맹독'; }
    dmg -= U.randi(0, Math.round(D.ac));
    dmg = Math.max(0, Math.round(dmg));
    def.hp -= dmg;
    if (!att.isMon) {
      const sk = G.Chars.weaponDef(att).skill;
      G.Chars.train(att, sk, 1);
      if (sk !== 'fighting') G.Chars.train(att, 'fighting', 0.4);
    } else {
      const md = G.MON[att.type];
      if (!def.isMon) {
        if (dmg > 0) G.Chars.train(def, 'armour', def.equip.armor ? 0.5 : 0.1);
        if (md.poison && dmg > 0 && U.chance(0.6)) { def.status.poison = (def.status.poison || 0) + U.randi(3, 6); extra = '중독'; }
        if (md.acid && def.equip.armor && U.chance(0.35) && def.equip.armor.plus > -3) { def.equip.armor.plus--; extra = '부식'; }
      }
      if (md.drain && dmg > 0) att.hp = Math.min(att.maxhp, att.hp + Math.ceil(dmg / 2));
    }
    return { hit: true, dmg, extra };
  },
};
