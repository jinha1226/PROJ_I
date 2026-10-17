// 특성: 정해진 레벨(TALENT_LEVELS)마다 직업별 세 가지 중 하나를 고른다 (배틀하트 식).
// 단계마다 성격이 정해져 있다: ① 기본 기술 변형 ② 새 기술 ③ 특성 ④ 궁극기
// 효과는 세 종류를 섞어 쓴다: learn(새 기술, 수동 전용) · mod(기존 기술 변형) · props(능력치·특수 태그)
// 특수 태그의 실제 효과는 sim 쪽 (TAG_TEXT 의 주석 참고).
import type { AbilityDef, Effect, Prop } from '../sim/defs';
import type { ClassId } from './classes';

export const TALENT_LEVELS = [3, 5, 7, 8];
export const TIER_NAME = ['기술 변형', '새 기술', '특성', '궁극기'];

export interface TalentDef {
  id: string;
  name: string;
  desc: string;
  /** 새 기술 (수동 전용) */
  learn?: string;
  /** 기존 기술 변형. effects/selfEffects 를 주면 통째로 바꾸고, addEffects 는 덧붙인다 */
  mod?: { ability: string; patch?: Partial<AbilityDef>; addEffects?: Effect[] };
  props?: Prop[];
}

const tag = (t: string): Prop => ({ kind: 'tag', tag: t });

/** 특수 태그 설명 (종족 특성과 공유) */
export const TAG_TEXT: Record<string, string> = {
  unstunnable: '기절 면역',
  retaliate: '근접 공격을 받으면 피해의 30%를 되돌려준다', // combat.applyDamage
  last_stand: '체력 35% 이하일 때 주는 피해 +30%, 받는 피해 -20%', // stats.computeStats
  stress_ward: '스트레스를 40% 덜 받는다', // stress.addStress
  undying: '층마다 한 번, 쓰러질 피해를 받으면 체력 1로 버티고 4초간 보호', // combat.applyDamage
  vampiric: '평타 피해의 15%만큼 체력 회복', // combat.resolveWeaponHit
  mana_flow: '마나 회복 +60%', // behavior.updateUnit
  spell_echo: '마법이 25% 확률로 한 번 더 발동 (마나 소모 없음)', // abilities.resolveAbility
  sniper: '4.5칸 이상 떨어진 적에게 평타·사격 피해 +25%', // combat.resolveWeaponHit
  double_strike: '평타가 25% 확률로 한 번 더 들어간다', // combat.performAttack
  calming: '전투 중 주변 아군의 스트레스를 주기적으로 덜어 준다', // stress.tickStress
  bloodlust: '적을 쓰러뜨리면 최대 체력의 8% 회복', // world.kill
  shatter: '감속·기절한 적에게 냉기 피해 +35%', // combat.applyDamage
  sturdy: '기절 시간 절반', // combat.tryApplyStatus
  quick_learner: '경험치 +15%', // hero.gainXp
};

const list: TalentDef[] = [
  // ── 공용 ──
  { id: 'last_stand', name: '배수진', desc: TAG_TEXT.last_stand, props: [tag('last_stand')] },
  { id: 'undying', name: '불굴', desc: TAG_TEXT.undying, props: [tag('undying')] },
  { id: 'vampiric', name: '피의 굶주림', desc: TAG_TEXT.vampiric, props: [tag('vampiric')] },
  { id: 'iron_will', name: '강철 의지', desc: '기절 면역, 의지력 +8', props: [tag('unstunnable'), { kind: 'will', v: 8 }] },
  { id: 'clear_mind', name: '맑은 정신', desc: `${TAG_TEXT.stress_ward}, 의지력 +6`, props: [tag('stress_ward'), { kind: 'will', v: 6 }] },
  { id: 'mana_flow', name: '마나 순환', desc: `${TAG_TEXT.mana_flow}, 최대 마나 +10`, props: [tag('mana_flow'), { kind: 'mp', v: 10 }] },
  { id: 'spell_echo', name: '메아리 주문', desc: TAG_TEXT.spell_echo, props: [tag('spell_echo')] },
  { id: 'quick_cast', name: '빠른 시전', desc: '시전 속도 +30%', props: [{ kind: 'castSpeed', v: 30 }] },
  { id: 'retaliate', name: '반격', desc: TAG_TEXT.retaliate, props: [tag('retaliate')] },
  { id: 'double_strike', name: '연타', desc: TAG_TEXT.double_strike, props: [tag('double_strike')] },

  // ── 전사 ──
  {
    id: 'wide_bash', name: '충격파 방패', desc: '방패 강타가 대상 주변 1.3칸의 적도 모두 기절시킨다.',
    mod: { ability: 'shield_bash', patch: { radius: 1.3, affects: 'enemies' } },
  },
  {
    id: 'iron_taunt', name: '철벽 도발', desc: '도발 범위 4 → 5.5칸, 도발하면 자신도 보호(받는 피해 -30%).',
    mod: {
      ability: 'taunt',
      patch: { radius: 5.5, selfEffects: [{ kind: 'status', status: 'guarded', duration: 6 }, { kind: 'status', status: 'protected', duration: 6 }] },
    },
  },
  { id: 'learn_whirlwind', name: '회전 베기', desc: '새 기술: 주변 적 모두를 크게 베고 잠시 기절.', learn: 'whirlwind' },
  { id: 'learn_shield_wall', name: '방벽', desc: '새 기술: 주변 아군이 6초간 받는 피해 -30%.', learn: 'shield_wall' },
  { id: 'bulwark', name: '성채', desc: '최대 체력 +35, AC +4', props: [{ kind: 'hp', v: 35 }, { kind: 'ac', v: 4 }] },
  { id: 'learn_war_cry', name: '전투 함성', desc: '새 기술: 주변 아군 전원이 10초간 피해 +30%, 받는 피해 -30%.', learn: 'war_cry' },

  // ── 화염술사 ──
  {
    id: 'rapid_bolt', name: '연속 화염', desc: '화염 화살 재사용 대기 2.5 → 1.4초.',
    mod: { ability: 'fire_bolt', patch: { cooldown: 1.4 } },
  },
  {
    id: 'searing', name: '작열', desc: '화염 화살의 화상 확률 35% → 80%, 지속 3 → 5초.',
    mod: {
      ability: 'fire_bolt',
      patch: { effects: [{ kind: 'damage', element: 'fire', base: [5, 9], scale: 0.5 }, { kind: 'status', status: 'burn', duration: 5, chance: 0.8 }] },
    },
  },
  { id: 'learn_fireball', name: '화염구', desc: '새 기술: 지점 폭발. 아군도 피해를 입는다.', learn: 'fireball' },
  { id: 'learn_frost_nova', name: '서리 폭발', desc: '새 기술: 주변 적을 얼려 기절시키고 감속. 붙은 적을 떼어낼 때.', learn: 'frost_nova' },
  { id: 'pyromancy', name: '화염 숙련', desc: '화염 위력 +35%, 시전 속도 +20%', props: [{ kind: 'power', school: 'fire', v: 35 }, { kind: 'castSpeed', v: 20 }] },
  { id: 'fire_affinity', name: '불의 친화', desc: '화염 저항 +1, 화염 위력 +20%', props: [{ kind: 'resist', key: 'fire', v: 1 }, { kind: 'power', school: 'fire', v: 20 }] },
  { id: 'learn_fire_storm', name: '화염 폭풍', desc: '새 기술: 2.5초 집중 뒤 넓은 범위를 불태운다. 아군도 피해.', learn: 'fire_storm' },

  // ── 사냥꾼 ──
  {
    id: 'quick_aim', name: '속사 조준', desc: '조준 사격 조준 시간 1.2 → 0.6초.',
    mod: { ability: 'aimed_shot', patch: { castTime: 0.6 } },
  },
  {
    id: 'virulent', name: '맹독', desc: '독화살 중독 2 → 4중첩.',
    mod: { ability: 'poison_arrow', patch: { effects: [{ kind: 'weapon', mult: 0.6 }, { kind: 'status', status: 'poison', duration: 6, stacks: 4 }] } },
  },
  { id: 'venom_tips', name: '독 묻은 화살촉', desc: '평타가 30% 확률로 중독', props: [{ kind: 'onHit', apply: { status: 'poison', duration: 5, chance: 0.3 } }] },
  { id: 'learn_pinning_shot', name: '속박 사격', desc: '새 기술: 맞은 적 2초 기절, 이후 감속. 시전을 끊는다.', learn: 'pinning_shot' },
  { id: 'learn_multishot', name: '산탄 사격', desc: '새 기술: 대상과 주변 적 모두에게 화살.', learn: 'multishot' },
  { id: 'keen_eye', name: '매의 눈', desc: '민첩 +4, 명중 +6, 평타 피해 +15%', props: [{ kind: 'stat', stat: 'dex', v: 4 }, { kind: 'acc', v: 6 }, { kind: 'weaponDmg', v: 15 }] },
  { id: 'sniper', name: '저격수', desc: TAG_TEXT.sniper, props: [tag('sniper')] },
  { id: 'evasive', name: '날렵함', desc: '회피 +4, 기절 면역', props: [{ kind: 'ev', v: 4 }, tag('unstunnable')] },
  { id: 'learn_volley', name: '화살비', desc: '새 기술: 지점에 화살을 쏟아붓는다. 아군 피해 없음.', learn: 'volley' },
  { id: 'learn_deadeye', name: '명사수의 일격', desc: '새 기술: 2초 조준 뒤 평타 5배 한 발, 기절.', learn: 'deadeye' },

  // ── 사제 ──
  {
    id: 'greater_heal', name: '큰 치유', desc: '치유량 약 +50%.',
    mod: { ability: 'heal', patch: { effects: [{ kind: 'heal', base: [16, 22], scale: 0.8 }] } },
  },
  {
    id: 'healing_prayer', name: '회복의 기도', desc: '보호의 기도가 범위 안 아군의 체력도 회복한다.',
    mod: { ability: 'prayer', addEffects: [{ kind: 'heal', base: [8, 12], scale: 0.4 }] },
  },
  { id: 'learn_smite', name: '심판', desc: '새 기술: 저항할 수 없는 신성 피해, 2초 기절.', learn: 'smite' },
  { id: 'learn_divine_shield', name: '신성한 방패', desc: '새 기술: 아군 하나를 정화하고 6초간 보호·방어 태세.', learn: 'divine_shield' },
  { id: 'devotion', name: '헌신', desc: '신앙 위력 +35%, 최대 마나 +10', props: [{ kind: 'power', school: 'faith', v: 35 }, { kind: 'mp', v: 10 }] },
  { id: 'calming', name: '평온의 기도', desc: TAG_TEXT.calming, props: [tag('calming')] },
  { id: 'sturdy_faith', name: '굳은 신앙', desc: '최대 체력 +20, AC +2', props: [{ kind: 'hp', v: 20 }, { kind: 'ac', v: 2 }] },
  { id: 'learn_mass_heal', name: '치유의 빛', desc: '새 기술: 주변 아군 모두 크게 회복 + 정화.', learn: 'mass_heal' },

  // ── 광전사 ──
  {
    id: 'long_leap', name: '맹렬한 도약', desc: '도약 베기 재사용 대기 9 → 6초, 위력 증가, 기절 0.8 → 1.4초.',
    mod: { ability: 'leap', patch: { cooldown: 6, effects: [{ kind: 'weapon', mult: 1.6 }, { kind: 'status', status: 'stun', duration: 1.4 }] } },
  },
  {
    id: 'frenzy', name: '광란 전파', desc: '광폭화가 주변 3칸 아군 모두에게 퍼진다.',
    mod: { ability: 'berserk', patch: { radius: 3 } },
  },
  { id: 'bloodlust', name: '피의 갈증', desc: TAG_TEXT.bloodlust, props: [tag('bloodlust')] },
  { id: 'brute', name: '괴력', desc: '힘 +4, 최대 체력 +20, 평타 피해 +10%', props: [{ kind: 'stat', stat: 'str', v: 4 }, { kind: 'hp', v: 20 }, { kind: 'weaponDmg', v: 10 }] },

  // ── 서리술사 ──
  {
    id: 'deep_chill', name: '깊은 냉기', desc: '서리 화살 위력 증가, 항상 감속.',
    mod: {
      ability: 'frost_bolt',
      patch: { effects: [{ kind: 'damage', element: 'cold', base: [7, 11], scale: 0.6 }, { kind: 'status', status: 'slow', duration: 3 }] },
    },
  },
  {
    id: 'wide_nova', name: '한파', desc: '서리 폭발 범위 2.2 → 3칸.',
    mod: { ability: 'frost_nova', patch: { radius: 3 } },
  },
  { id: 'learn_ice_lance', name: '얼음 창', desc: '새 기술: 큰 냉기 피해, 감속.', learn: 'ice_lance' },
  { id: 'learn_frost_armor', name: '서리 갑옷', desc: '새 기술: 아군 하나에게 8초간 AC+6과 보호.', learn: 'frost_armor' },
  { id: 'cryomancy', name: '냉기 숙련', desc: '냉기 위력 +35%, 시전 속도 +20%', props: [{ kind: 'power', school: 'ice', v: 35 }, { kind: 'castSpeed', v: 20 }] },
  { id: 'shatter', name: '산산조각', desc: TAG_TEXT.shatter, props: [tag('shatter')] },
  { id: 'learn_blizzard', name: '눈보라', desc: '새 기술: 2초 집중 뒤 넓은 범위 눈보라. 적만 맞는다.', learn: 'blizzard' },
];

export const TALENTS: Record<string, TalentDef> = Object.fromEntries(list.map((t) => [t.id, t]));

/** 직업별 단계 × 선택지 3개 */
export const CLASS_TALENTS: Record<ClassId, string[][]> = {
  warrior: [
    ['wide_bash', 'iron_taunt', 'retaliate'],
    ['learn_whirlwind', 'learn_shield_wall', 'bulwark'],
    ['last_stand', 'iron_will', 'clear_mind'],
    ['learn_war_cry', 'undying', 'vampiric'],
  ],
  fire_mage: [
    ['rapid_bolt', 'searing', 'mana_flow'],
    ['learn_fireball', 'learn_frost_nova', 'pyromancy'],
    ['fire_affinity', 'quick_cast', 'clear_mind'],
    ['learn_fire_storm', 'spell_echo', 'undying'],
  ],
  hunter: [
    ['quick_aim', 'virulent', 'venom_tips'],
    ['learn_pinning_shot', 'learn_multishot', 'keen_eye'],
    ['sniper', 'evasive', 'clear_mind'],
    ['learn_volley', 'learn_deadeye', 'double_strike'],
  ],
  priest: [
    ['greater_heal', 'healing_prayer', 'mana_flow'],
    ['learn_smite', 'learn_divine_shield', 'devotion'],
    ['calming', 'iron_will', 'sturdy_faith'],
    ['learn_mass_heal', 'spell_echo', 'undying'],
  ],
  berserker: [
    ['long_leap', 'frenzy', 'bloodlust'],
    ['learn_whirlwind', 'retaliate', 'brute'],
    ['last_stand', 'iron_will', 'vampiric'],
    ['learn_war_cry', 'undying', 'double_strike'],
  ],
  frost_mage: [
    ['deep_chill', 'wide_nova', 'mana_flow'],
    ['learn_ice_lance', 'learn_frost_armor', 'cryomancy'],
    ['shatter', 'quick_cast', 'clear_mind'],
    ['learn_blizzard', 'spell_echo', 'undying'],
  ],
};
