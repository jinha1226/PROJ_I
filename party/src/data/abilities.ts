import type { AbilityDef } from '../sim/defs';

const list: AbilityDef[] = [
  // ── 전사 ──
  {
    id: 'shield_bash', name: '방패 강타', icon: '강', color: '#ffe14d', type: 'technique', schools: ['shield'],
    desc: '붙어 있는 적을 방패로 가격해 2초간 기절시킨다. 시전 중인 적의 마법을 끊는다.',
    cost: 0, castTime: 0, cooldown: 8, range: 0.6, target: 'enemy',
    effects: [{ kind: 'weapon', mult: 0.7 }, { kind: 'status', status: 'stun', duration: 2 }],
    aiRole: 'disable',
  },
  {
    id: 'taunt', name: '도발', icon: '도', color: '#ff5555', type: 'technique',
    desc: '주변 4칸의 적이 4초간 자신만 공격하게 만들고, 방어 태세(AC+6)에 들어간다.',
    cost: 0, castTime: 0, cooldown: 12, range: 0, target: 'self', radius: 4, affects: 'enemies',
    effects: [{ kind: 'taunt', duration: 4 }],
    selfEffects: [{ kind: 'status', status: 'guarded', duration: 6 }],
    aiRole: 'taunt',
  },
  // ── 화염술사 ──
  {
    id: 'fire_bolt', name: '화염 화살', icon: '화', color: '#ff7a2f', type: 'spell', schools: ['fire'], level: 2,
    desc: '화염 피해를 주는 화살. 확률적으로 화상.',
    cost: 4, castTime: 0.5, cooldown: 2.5, range: 7, target: 'enemy',
    projectile: { speed: 12, color: '#ff7a2f' },
    effects: [
      { kind: 'damage', element: 'fire', base: [5, 9], scale: 0.5 },
      { kind: 'status', status: 'burn', duration: 3, chance: 0.35 },
    ],
    aiRole: 'damage',
  },
  {
    id: 'fireball', name: '화염구', icon: '구', color: '#ff9a3f', type: 'spell', schools: ['fire'], level: 4,
    desc: '지점에서 크게 폭발한다. 아군도 피해를 입는다. (수동 전용)',
    cost: 10, castTime: 1.0, cooldown: 10, range: 7, target: 'ground', radius: 1.8, affects: 'all',
    projectile: { speed: 10, color: '#ff9a3f' },
    effects: [
      { kind: 'damage', element: 'fire', base: [14, 20], scale: 0.8 },
      { kind: 'status', status: 'burn', duration: 4, chance: 0.7 },
    ],
    aiRole: 'damage',
  },

  {
    id: 'fire_storm', name: '화염 폭풍', icon: '폭', color: '#ff4422', type: 'spell', schools: ['fire'], level: 5,
    desc: '2.5초 동안 집중한 뒤 넓은 범위를 불태운다. 피격 시 방해받기 쉽다. 아군도 피해를 입는다.',
    cost: 18, castTime: 2.5, cooldown: 20, range: 7, target: 'ground', radius: 2.5, affects: 'all',
    effects: [
      { kind: 'damage', element: 'fire', base: [30, 42], scale: 1.4 },
      { kind: 'status', status: 'burn', duration: 5, chance: 0.9 },
    ],
    aiRole: 'damage',
  },

  {
    id: 'frost_bolt', name: '서리 화살', icon: '서', color: '#66ccff', type: 'spell', schools: ['ice'], level: 2,
    desc: '냉기 피해를 주고 확률적으로 감속시킨다. (냉기 스킬이 낮아 위력이 약하다)',
    cost: 4, castTime: 0.5, cooldown: 3, range: 7, target: 'enemy',
    projectile: { speed: 12, color: '#66ccff' },
    effects: [
      { kind: 'damage', element: 'cold', base: [5, 9], scale: 0.5 },
      { kind: 'status', status: 'slow', duration: 3, chance: 0.5 },
    ],
    aiRole: 'damage',
  },
  // ── 사냥꾼 ──
  {
    id: 'aimed_shot', name: '조준 사격', icon: '조', color: '#e8d8a0', type: 'technique', schools: ['bow'],
    desc: '1.2초 조준 후 강력한 한 발.',
    cost: 0, castTime: 1.2, cooldown: 10, range: 7.5, target: 'enemy',
    projectile: { speed: 20, color: '#fff2b0' },
    effects: [{ kind: 'weapon', mult: 2.4 }],
    aiRole: 'damage',
  },
  {
    id: 'poison_arrow', name: '독화살', icon: '독', color: '#7dd35a', type: 'technique', schools: ['bow'],
    desc: '중독 2중첩. 독 면역에게는 화살 피해만 들어간다.',
    cost: 0, castTime: 0, cooldown: 6, range: 7, target: 'enemy',
    projectile: { speed: 16, color: '#7dd35a' },
    effects: [{ kind: 'weapon', mult: 0.6 }, { kind: 'status', status: 'poison', duration: 6, stacks: 2 }],
    aiRole: 'damage',
  },
  {
    id: 'pinning_shot', name: '속박 사격', icon: '속', color: '#66ccff', type: 'technique', schools: ['bow'],
    desc: '맞은 적을 2초간 기절, 이후 4초간 감속. 시전 중인 적을 끊는다.',
    cost: 0, castTime: 0, cooldown: 12, range: 7.5, target: 'enemy',
    projectile: { speed: 22, color: '#66ccff' },
    effects: [
      { kind: 'weapon', mult: 1.0 },
      { kind: 'status', status: 'stun', duration: 2 },
      { kind: 'status', status: 'slow', duration: 6 },
    ],
    aiRole: 'disable',
  },

  // ── 사제 ──
  {
    id: 'heal', name: '치유', icon: '치', color: '#88ff88', type: 'spell', schools: ['faith'], level: 2,
    desc: '아군 하나의 체력을 회복한다.',
    cost: 5, castTime: 0.6, cooldown: 2, range: 6, target: 'ally',
    effects: [{ kind: 'heal', base: [10, 14], scale: 0.6 }],
    aiRole: 'heal',
  },
  {
    id: 'cleanse', name: '정화', icon: '정', color: '#ccffff', type: 'spell', schools: ['faith'], level: 2,
    desc: '아군의 해로운 상태이상(기절, 중독, 화상, 감속)을 모두 제거한다.',
    cost: 4, castTime: 0, cooldown: 6, range: 6, target: 'ally',
    effects: [{ kind: 'cleanse' }],
    aiRole: 'cleanse',
  },
  {
    id: 'prayer', name: '보호의 기도', icon: '보', color: '#ffeeaa', type: 'spell', schools: ['faith'], level: 3,
    desc: '주변 4칸 아군이 8초간 받는 피해 30% 감소.',
    cost: 8, castTime: 0.8, cooldown: 15, range: 0, target: 'self', radius: 4, affects: 'allies',
    effects: [{ kind: 'status', status: 'protected', duration: 8 }],
    aiRole: 'buff',
  },
  // ── 성장으로 배우는 기술 ──
  {
    id: 'whirlwind', name: '회전 베기', icon: '회', color: '#ffd080', type: 'technique', schools: ['fighting'],
    desc: '주변 적 모두를 크게 베고 잠시 기절시킨다.',
    cost: 0, castTime: 0, cooldown: 12, range: 0, target: 'self', radius: 1.8, affects: 'enemies',
    effects: [{ kind: 'weapon', mult: 1.6 }, { kind: 'status', status: 'stun', duration: 1, chance: 0.6 }],
    aiRole: 'damage',
  },

  {
    id: 'war_cry', name: '전투 함성', icon: '함', color: '#ff9944', type: 'technique', schools: ['fighting'],
    desc: '주변 5칸 아군이 10초간 괴력(피해 +30%)과 보호(받는 피해 -30%).',
    cost: 0, castTime: 0, cooldown: 30, range: 0, target: 'self', radius: 5, affects: 'allies',
    effects: [{ kind: 'status', status: 'might', duration: 10 }, { kind: 'status', status: 'protected', duration: 10 }],
    aiRole: 'buff',
  },

  {
    id: 'frost_nova', name: '서리 폭발', icon: '빙', color: '#99ddff', type: 'spell', schools: ['ice'], level: 3,
    desc: '주변 적에게 냉기 피해를 주고 얼려서 2초간 기절, 이후 감속. 붙은 적을 떼어낼 때.',
    cost: 8, castTime: 0, cooldown: 14, range: 0, target: 'self', radius: 2.2, affects: 'enemies',
    effects: [
      { kind: 'damage', element: 'cold', base: [8, 12], scale: 0.6 },
      { kind: 'status', status: 'stun', duration: 2, chance: 0.85 },
      { kind: 'status', status: 'slow', duration: 4 },
    ],
    aiRole: 'damage',
  },

  {
    id: 'volley', name: '화살비', icon: '비', color: '#e8d8a0', type: 'technique', schools: ['bow'],
    desc: '지점에 화살을 쏟아부어 범위 안의 적을 모두 크게 맞힌다. (아군 피해 없음)',
    cost: 0, castTime: 0.8, cooldown: 14, range: 7.5, target: 'ground', radius: 2, affects: 'enemies',
    projectile: { speed: 14, color: '#e8d8a0' },
    effects: [{ kind: 'weapon', mult: 2.0 }],
    aiRole: 'damage',
  },

  {
    id: 'mass_heal', name: '치유의 빛', icon: '빛', color: '#ccffaa', type: 'spell', schools: ['faith'], level: 4,
    desc: '주변 5칸 아군 모두의 체력을 크게 회복하고 해로운 상태를 씻어낸다.',
    cost: 14, castTime: 1.0, cooldown: 20, range: 0, target: 'self', radius: 5, affects: 'allies',
    effects: [{ kind: 'heal', base: [22, 30], scale: 1.0 }, { kind: 'cleanse' }],
    aiRole: 'heal',
  },

  {
    id: 'smite', name: '심판', icon: '심', color: '#fff2a0', type: 'spell', schools: ['faith'], level: 3,
    desc: '신성한 일격. 저항할 수 없는 큰 피해를 주고 2초간 기절시킨다.',
    cost: 8, castTime: 0.4, cooldown: 12, range: 7, target: 'enemy',
    effects: [{ kind: 'damage', element: 'holy', base: [18, 26], scale: 1.0 }, { kind: 'status', status: 'stun', duration: 2 }],
    aiRole: 'damage',
  },

  // ── 광전사 ──
  {
    id: 'leap', name: '도약 베기', icon: '도', color: '#ff8a5a', type: 'technique', schools: ['axe'],
    desc: '멀리 있는 적에게 뛰어들어 베고 잠시 기절시킨다. (2.5칸 이상 떨어진 적)',
    cost: 0, castTime: 0, cooldown: 9, range: 6, minRange: 2.5, target: 'enemy', dash: true,
    effects: [{ kind: 'weapon', mult: 1.3 }, { kind: 'status', status: 'stun', duration: 0.8 }],
    aiRole: 'charge',
  },
  {
    id: 'berserk', name: '광폭화', icon: '광', color: '#ff4444', type: 'technique', schools: ['axe'],
    desc: '8초간 괴력(피해 +30%). 바로 옆 아군도 함께.',
    cost: 0, castTime: 0, cooldown: 16, range: 0, target: 'self', radius: 0.8, affects: 'allies',
    effects: [{ kind: 'status', status: 'might', duration: 8 }],
    aiRole: 'buff',
  },
  // ── 서리술사 ──
  {
    id: 'ice_lance', name: '얼음 창', icon: '창', color: '#aee6ff', type: 'spell', schools: ['ice'], level: 3,
    desc: '큰 냉기 피해를 주는 얼음 창. 확률적으로 감속.',
    cost: 7, castTime: 0.8, cooldown: 7, range: 7, target: 'enemy',
    projectile: { speed: 16, color: '#aee6ff' },
    effects: [
      { kind: 'damage', element: 'cold', base: [16, 22], scale: 0.9 },
      { kind: 'status', status: 'slow', duration: 3, chance: 0.6 },
    ],
    aiRole: 'damage',
  },
  {
    id: 'blizzard', name: '눈보라', icon: '눈', color: '#d0f0ff', type: 'spell', schools: ['ice'], level: 5,
    desc: '2초 집중 후 넓은 범위에 눈보라. 적만 맞고, 모두 감속되며 일부는 얼어붙는다.',
    cost: 16, castTime: 2.0, cooldown: 18, range: 7, target: 'ground', radius: 2.4, affects: 'enemies',
    effects: [
      { kind: 'damage', element: 'cold', base: [18, 26], scale: 1.0 },
      { kind: 'status', status: 'slow', duration: 4 },
      { kind: 'status', status: 'stun', duration: 1.2, chance: 0.5 },
    ],
    aiRole: 'damage',
  },
  // ── 몬스터 ──
  {
    id: 'lightning_bolt', name: '번개 화살', icon: '번', color: '#ffe14d', type: 'spell', level: 3,
    desc: '전기 피해.', cost: 5, castTime: 1.0, cooldown: 4, range: 7, target: 'enemy',
    projectile: { speed: 18, color: '#ffe14d' },
    effects: [{ kind: 'damage', element: 'elec', base: [7, 11], scale: 0.4 }],
    aiRole: 'damage',
  },
  {
    id: 'slow_spell', name: '감속 저주', icon: '감', color: '#66ccff', type: 'spell', level: 3,
    desc: '의지력 판정. 5초간 감속.', cost: 6, castTime: 0.8, cooldown: 10, range: 7, target: 'enemy',
    effects: [{ kind: 'status', status: 'slow', duration: 5, will: true }],
    aiRole: 'disable',
  },
  {
    id: 'bless_ally', name: '전투 가호', icon: '가', color: '#ff9944', type: 'spell', level: 2,
    desc: '아군 하나에게 괴력(피해 +30%).', cost: 5, castTime: 0.6, cooldown: 12, range: 6, target: 'ally',
    effects: [{ kind: 'status', status: 'might', duration: 8 }],
    aiRole: 'buff',
  },
  {
    id: 'pounce', name: '돌진', icon: '돌', color: '#ffaa66', type: 'technique',
    desc: '멀리 있는 대상에게 달려들어 물고 잠시 기절시킨다.',
    cost: 0, castTime: 0, cooldown: 9, range: 7, minRange: 2.5, target: 'enemy', dash: true,
    effects: [{ kind: 'weapon', mult: 1.0 }, { kind: 'status', status: 'stun', duration: 0.8 }],
    aiRole: 'charge',
  },
  {
    id: 'ground_slam', name: '내려찍기', icon: '찍', color: '#ff4444', type: 'technique',
    desc: '1.2초 뒤 주변을 강타한다. 범위 표시를 보고 피하자.',
    cost: 0, castTime: 1.2, cooldown: 8, range: 0, target: 'self', radius: 1.9, affects: 'enemies',
    effects: [
      { kind: 'damage', element: 'physical', base: [26, 36], scale: 0 },
      { kind: 'status', status: 'stun', duration: 1.2, chance: 0.5 },
    ],
    aiRole: 'damage',
  },
  {
    id: 'roar', name: '포효', icon: '포', color: '#ff9944', type: 'technique',
    desc: '주변 아군에게 괴력.', cost: 0, castTime: 0, cooldown: 20, range: 0, target: 'self', radius: 6, affects: 'allies',
    effects: [{ kind: 'status', status: 'might', duration: 10 }],
    aiRole: 'buff',
  },
];

export const ABILITIES: Record<string, AbilityDef> = Object.fromEntries(list.map((a) => [a.id, a]));
