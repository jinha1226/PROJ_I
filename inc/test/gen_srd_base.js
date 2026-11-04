'use strict';
// SRD 원본 데이터 → 게임이 읽는 js/srd_gen.js : node test/gen_srd_clean.js 뒤에 node test/gen_srd_base.js (DESIGN.md 108)
// 손으로 고치지 않는다. 틀리면 data/srd521/PATCHES.json을 PDF 기준으로 고친다.
const fs = require('fs'), path = require('path'), C = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'srd521', 'clean.json'), 'utf8'));
const ix = o => o?.index, cats = q => (q.equipment_categories || []).map(ix), GP = { gp: 1, sp: 0.1, cp: 0.01 }, gp = c => (c ? +(c.quantity * GP[c.unit]).toFixed(2) : 0), txt = d => (Array.isArray(d) ? d.join('\n') : d) || '';
const PROP = { finesse: 'finesse', light: 'light', thrown: 'thrown', 'two-handed': 'two', versatile: 'versatile', ammunition: 'ammo', loading: 'loading', heavy: 'heavy', reach: 'reach' };
const W = {}, A = {}, GEAR = {}; let SHIELD = null;
for (const q of C.Equipment) {
  const c = cats(q);
  if (q.damage || c.includes('weapons')) { const d = /^(\d+)d(\d+)$/.exec(q.damage?.damage_dice || ''); W[q.index] = { en: q.name, cat: c.includes('martial-weapons') ? 'martial' : 'simple', rng: c.includes('ranged-weapons') ? 'ranged' : 'melee', dn: d ? +d[1] : 0, dd: d ? +d[2] : 0, flat: d ? 0 : +(q.damage?.damage_dice || 0) || 0, t: ix(q.damage?.damage_type), props: (q.properties || []).map(p => PROP[p.index] || p.index), m: ix(q.mastery) || null, lb: q.weight ?? 0, gp: gp(q.cost), ft: q.range && c.includes('ranged-weapons') ? q.range.normal : q.throw_range?.normal || 0, ftL: q.range && c.includes('ranged-weapons') ? q.range.long : q.throw_range?.long || 0, vd: q.two_handed_damage ? +/d(\d+)/.exec(q.two_handed_damage.damage_dice)[1] : 0 }; continue; }
  if (q.armor_class) { const cat = c.includes('light-armor') ? 'light' : c.includes('medium-armor') ? 'medium' : c.includes('heavy-armor') ? 'heavy' : 'shield'; const o = { en: q.name, cat, base: q.armor_class.base, dexMax: q.armor_class.dex_bonus ? q.armor_class.max_bonus ?? 99 : 0, str: q.str_minimum || 0, stealth: !!q.stealth_disadvantage, lb: q.weight ?? 0, gp: gp(q.cost) }; if (cat === 'shield') SHIELD = o; else A[q.index] = o; continue; }
  GEAR[q.index] = { en: q.name, cat: c[0], gp: gp(q.cost), lb: q.weight ?? 0, d: txt(q.description || q.desc).slice(0, 400) };
}
const out = {
  WEAPON: W, ARMOR: A, SHIELD, GEAR,
  MASTERY: Object.fromEntries(C['Weapon-Mastery-Properties'].map(q => [q.index, { en: q.name, d: txt(q.description || q.desc) }])),
  WPROP: Object.fromEntries(C['Weapon-Properties'].map(q => [q.index, { en: q.name, d: txt(q.description || q.desc) }])),
  COND: Object.fromEntries(C.Conditions.map(q => [q.index, { en: q.name, d: txt(q.description || q.desc) }])),
  SKILL: Object.fromEntries(C.Skills.map(q => [q.index, { en: q.name, ab: ix(q.ability_score), d: txt(q.description || q.desc) }])),
  TRAIT: Object.fromEntries(C.Traits.map(q => [q.index, { en: q.name, d: txt(q.description || q.desc) }])),
  SPECIES: Object.fromEntries(C.Species.map(q => [q.index, { en: q.name, size: q.size, speed: q.speed, traits: (q.traits || []).map(t => [t.index, t.level || 1]), sub: (q.subspecies || []).map(ix) }])),
  SUB: Object.fromEntries(C.Subspecies.map(q => [q.index, { en: q.name, sp: ix(q.species), dt: ix(q.damage_type) || null, traits: (q.traits || []).map(t => [t.index, t.level || 1]) }])),
  BG: Object.fromEntries(C.Backgrounds.map(q => [q.index, { en: q.name, ab: q.ability_scores.map(ix), feat: ix(q.feat), note: q.feat.note || '', prof: q.proficiencies.map(ix) }])),
  FEAT: Object.fromEntries(C.Feats.map(q => [q.index, { en: q.name, type: q.type || '', pre: q.prerequisite || q.prerequisites || null, d: txt(q.description || q.desc) }])),
  CLASS: Object.fromEntries(C.Classes.map(q => { const ch = q.proficiency_choices.find(o => JSON.stringify(o).includes('skill-')); return [q.index, { en: q.name, hd: q.hit_die, saves: q.saving_throws.map(ix), n: ch?.choose || 0, from: (ch?.from.options || []).map(o => ix(o.item)).filter(Boolean), prof: (q.proficiencies || []).map(ix), start: q.starting_equipment_options?.[0]?.desc || '' }]; })),
  LEVEL: Object.fromEntries(C.Levels.filter(q => q.class && !q.subclass).map(q => [q.index, { lv: q.level, pb: q.prof_bonus, c: q.class_specific || {}, sp: q.spellcasting || null }])),
  SUBCLASS: Object.fromEntries(C.Subclasses.map(q => [q.index, { en: q.name, cls: ix(q.class), d: txt(q.description || q.desc) }])),
  FEATURE: Object.fromEntries(C.Features.map(q => [q.index, { en: q.name, cls: ix(q.class), sub: ix(q.subclass) || null, lv: q.level?.level ?? +(/(\d+)$/.exec(q.level?.index || '')?.[1] || 0), d: txt(q.description || q.desc) }])),
  MAGIC: Object.fromEntries(C['Magic-Items'].map(q => [q.index, { en: q.name, cat: ix(q.equipment_category), rar: q.rarity?.name || '', att: !!q.attunement, variant: !!q.variant, of: (q.variants || []).map(ix), d: txt(q.desc).slice(0, 900) }])),
};
const s = `'use strict';\n// 자동 생성 (test/gen_srd_base.js) · SRD 5.2.1 · CC-BY-4.0 · 정리 데이터 5e-bits/5e-srd-api (MIT) · 손으로 고치지 말 것\nG.SRD_RAW = ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'srd_gen.js'), s); console.log('srd_gen.js', Math.round(s.length / 1024) + 'KB', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.keys(v).length])));
