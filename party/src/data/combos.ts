// 합동기: 주장과 동료 한 명이 함께 쓰는 큰 기술. 직업 짝마다 다르다.
// 합동 게이지(적을 쓰러뜨리면 찬다)를 100 쓰고, 둘 다 살아 있고 움직일 수 있어야 한다.
import type { AbilityDef } from '../sim/defs';
import type { ClassId } from './classes';

export interface ComboDef {
  id: string;
  /** 짝 (순서 무관). 같은 직업 둘이면 같은 값 */
  pair: [ClassId, ClassId];
  /** 위력의 주인 (그 직업의 스킬로 위력 계산): pair 의 0 또는 1 */
  lead: 0 | 1;
  /** 자기 중심 기술의 중심 (없으면 lead) */
  at?: 0 | 1;
  /** 둘이 외치는 말 */
  shout: [string, string];
  ability: AbilityDef;
}

const base = { cost: 0, castTime: 0, cooldown: 0 } as const;

export const COMBOS: ComboDef[] = [
  {
    id: 'holy_bulwark', pair: ['warrior', 'priest'], lead: 1, shout: ['내 뒤로!', '빛이여, 지켜 주소서!'],
    ability: {
      ...base, id: 'combo_holy_bulwark', name: '성스러운 방벽', icon: '벽', color: '#ffeeaa', type: 'spell', schools: ['faith'],
      desc: '파티 전원 크게 회복 · 정화하고 6초간 보호(받는 피해 -30%).',
      range: 0, target: 'self', radius: 12, affects: 'allies',
      effects: [{ kind: 'heal', base: [16, 22], scale: 0.8 }, { kind: 'cleanse' }, { kind: 'status', status: 'protected', duration: 6 }],
      aiRole: 'heal',
    },
  },
  {
    id: 'steam_burst', pair: ['fire_mage', 'frost_mage'], lead: 0, shout: ['불꽃!', '얼음!'],
    ability: {
      ...base, id: 'combo_steam_burst', name: '증기 폭발', icon: '증', color: '#e0d0ff', type: 'spell', schools: ['fire', 'ice'],
      desc: '얼음과 불이 맞부딪혀 지점을 크게 폭발. 적만 맞고 2초 기절.',
      range: 9, target: 'ground', radius: 2.6, affects: 'enemies',
      effects: [{ kind: 'damage', element: 'fire', base: [22, 30], scale: 1.0 }, { kind: 'status', status: 'stun', duration: 2 }],
      aiRole: 'damage',
    },
  },
  {
    id: 'pincer', pair: ['warrior', 'berserker'], lead: 1, shout: ['붙잡았다!', '찢어 주마!'],
    ability: {
      ...base, id: 'combo_pincer', name: '협공', icon: '협', color: '#ff9a5a', type: 'technique', schools: ['fighting'],
      desc: '적 하나에게 함께 뛰어들어 평타 4배 피해 · 3초 기절.',
      range: 9, target: 'enemy', dash: true,
      effects: [{ kind: 'weapon', mult: 4 }, { kind: 'status', status: 'stun', duration: 3 }],
      aiRole: 'damage',
    },
  },
  {
    id: 'fire_rain', pair: ['hunter', 'fire_mage'], lead: 0, shout: ['화살에 불을!', '타올라라!'],
    ability: {
      ...base, id: 'combo_fire_rain', name: '불화살비', icon: '비', color: '#ff7a2f', type: 'technique', schools: ['bow', 'fire'],
      desc: '넓은 지점에 불붙은 화살을 쏟는다. 적만 맞고 화상.',
      range: 9, target: 'ground', radius: 3, affects: 'enemies',
      effects: [{ kind: 'damage', element: 'fire', base: [16, 22], scale: 0.8 }, { kind: 'status', status: 'burn', duration: 5 }],
      aiRole: 'damage',
    },
  },
  {
    id: 'frost_volley', pair: ['hunter', 'frost_mage'], lead: 0, shout: ['얼려 줘!', '서리여!'],
    ability: {
      ...base, id: 'combo_frost_volley', name: '빙결 일제사격', icon: '빙', color: '#a8e8ff', type: 'technique', schools: ['bow', 'ice'],
      desc: '넓은 지점의 적을 얼려 2.5초 기절, 이후 감속.',
      range: 9, target: 'ground', radius: 3, affects: 'enemies',
      effects: [{ kind: 'damage', element: 'cold', base: [12, 16], scale: 0.6 }, { kind: 'status', status: 'stun', duration: 2.5 }, { kind: 'status', status: 'slow', duration: 5 }],
      aiRole: 'disable',
    },
  },
  {
    id: 'blessed_arrow', pair: ['hunter', 'priest'], lead: 0, shout: ['축복을!', '신의 이름으로!'],
    ability: {
      ...base, id: 'combo_blessed_arrow', name: '축복받은 화살', icon: '축', color: '#fff6b0', type: 'technique', schools: ['bow', 'faith'],
      desc: '적 하나에게 신성한 화살. 아주 큰 신성 피해, 2초 기절.',
      range: 10, target: 'enemy', projectile: { speed: 22, color: '#fff6b0' },
      effects: [{ kind: 'damage', element: 'holy', base: [40, 52], scale: 1.4 }, { kind: 'status', status: 'stun', duration: 2 }],
      aiRole: 'damage',
    },
  },
  {
    id: 'blood_rite', pair: ['berserker', 'priest'], lead: 1, shout: ['피를 바쳐라!', '힘을 내려 주소서!'],
    ability: {
      ...base, id: 'combo_blood_rite', name: '피의 의식', icon: '피', color: '#ff5566', type: 'spell', schools: ['faith'],
      desc: '파티 전원 10초간 괴력(피해 +30%) · 회복.',
      range: 0, target: 'self', radius: 12, affects: 'allies',
      effects: [{ kind: 'status', status: 'might', duration: 10 }, { kind: 'heal', base: [10, 14], scale: 0.5 }],
      aiRole: 'buff',
    },
  },
  {
    id: 'flaming_shield', pair: ['warrior', 'fire_mage'], lead: 1, at: 0, shout: ['막아 낸다!', '불길로 감싼다!'],
    ability: {
      ...base, id: 'combo_flaming_shield', name: '불의 방패', icon: '불', color: '#ff9a3f', type: 'spell', schools: ['fire'],
      desc: '전사 주변 적에게 화염 피해 · 화상 · 전사 도발.',
      range: 0, target: 'self', radius: 3, affects: 'enemies',
      effects: [{ kind: 'damage', element: 'fire', base: [16, 22], scale: 0.8 }, { kind: 'taunt', duration: 5 }, { kind: 'status', status: 'burn', duration: 4 }],
      aiRole: 'damage',
    },
  },
  {
    id: 'glacier_wall', pair: ['warrior', 'frost_mage'], lead: 1, at: 0, shout: ['버텨라!', '얼음 벽!'],
    ability: {
      ...base, id: 'combo_glacier_wall', name: '빙벽', icon: '벽', color: '#bfe8ff', type: 'spell', schools: ['ice'],
      desc: '전사 주변 적에게 냉기 피해 · 3초 기절.',
      range: 0, target: 'self', radius: 3, affects: 'enemies',
      effects: [{ kind: 'damage', element: 'cold', base: [10, 14], scale: 0.6 }, { kind: 'status', status: 'stun', duration: 3 }],
      aiRole: 'disable',
    },
  },
  {
    id: 'wild_hunt', pair: ['berserker', 'hunter'], lead: 0, at: 0, shout: ['몰아라!', '놓치지 않는다!'],
    ability: {
      ...base, id: 'combo_wild_hunt', name: '사냥 개시', icon: '사', color: '#c8f080', type: 'technique', schools: ['fighting'],
      desc: '주변 적 모두 크게 벤다(평타 2배). 광전사 중심.',
      range: 0, target: 'self', radius: 3, affects: 'enemies',
      effects: [{ kind: 'weapon', mult: 2 }, { kind: 'status', status: 'slow', duration: 4 }],
      aiRole: 'damage',
    },
  },
  {
    id: 'twin_spell', pair: ['fire_mage', 'fire_mage'], lead: 0, shout: ['함께!', '불태워라!'],
    ability: {
      ...base, id: 'combo_twin_fire', name: '쌍둥이 화염', icon: '쌍', color: '#ff5522', type: 'spell', schools: ['fire'],
      desc: '넓은 지점에 거대한 불기둥. 적만 맞는다.',
      range: 9, target: 'ground', radius: 3, affects: 'enemies',
      effects: [{ kind: 'damage', element: 'fire', base: [28, 36], scale: 1.2 }, { kind: 'status', status: 'burn', duration: 5 }],
      aiRole: 'damage',
    },
  },
];

/** 합동 게이지: 적 하나를 쓰러뜨릴 만큼 피해를 주면 이만큼 찬다 */
export const COMBO_PER_KILL = 22;
export const COMBO_COST = 100;
