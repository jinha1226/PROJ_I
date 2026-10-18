// 3D 겉모습: 영웅은 흰 마네킹(UAL) + 색 있는 장비, 몬스터는 Quaternius · KayKit 모델 (또는 물들인 마네킹).
// 키는 유닛 반지름 × 4 를 기준으로 h 배율만큼 (작은 고블린 · 큰 오우거가 크기로 읽히게).
export interface Look3D {
  model: string;
  /** 키 배율 (반지름 × 4 × h) */
  h?: number;
  /** 마네킹을 흰색 대신 이 색으로 */
  tint?: string;
  /** 흰 마네킹 (텍스처 버림) */
  white?: boolean;
  weapon?: string;
  offhand?: string;
  /** 근접 콤보 (1 · 2 · 마무리) 또는 공격 하나 */
  attack: string[];
  /** 시전 중 · 시전 끝 */
  cast?: string;
  shoot?: string;
  idle?: string;
  run?: string;
  dash?: string;
  /** 애니메이션 배속 */
  speed?: number;
}

const UAL = 'ual/ual';
const SWORD = ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C'];
const SPELL = { cast: 'Spell_Simple_Idle_Loop', shoot: 'Spell_Simple_Shoot' };

export const HERO_LOOKS: Record<string, Look3D> = {
  warrior: { model: UAL, white: true, weapon: 'kaykit/w_sword_1handed', offhand: 'kaykit/w_shield_round', attack: SWORD, idle: 'Sword_Idle', dash: 'Shield_Dash_RM', speed: 1.35 },
  berserker: { model: UAL, white: true, h: 1.05, weapon: 'kaykit/w_axe_2handed', attack: ['Sword_Regular_A', 'Sword_Regular_C', 'Sword_Attack'], idle: 'Sword_Idle', dash: 'Sword_Dash_RM', speed: 1.45 },
  fire_mage: { model: UAL, white: true, weapon: 'kaykit/w_staff', attack: ['Spell_Simple_Shoot'], ...SPELL, speed: 1.3 },
  frost_mage: { model: UAL, white: true, weapon: 'kaykit/w_wand', offhand: 'kaykit/w_spellbook_open', attack: ['Spell_Simple_Shoot'], ...SPELL, speed: 1.3 },
  hunter: { model: UAL, white: true, weapon: 'kaykit/w_crossbow_2handed', attack: ['Bow_Shoot'], cast: 'Pistol_Aim_Neutral', shoot: 'Bow_Shoot', speed: 1.4 },
  priest: { model: UAL, white: true, weapon: 'kaykit/w_wand', offhand: 'kaykit/w_spellbook_open', attack: ['Spell_Simple_Shoot'], ...SPELL, speed: 1.3 },
};

/** 몬스터 id → 모델. 없으면 붉게 물들인 마네킹 */
export const MONSTER_LOOKS: Record<string, Look3D> = {
  goblin: { model: 'quaternius/Tribal', h: 1.1, attack: ['Weapon'] },
  goblin_archer: { model: 'quaternius/Ninja', h: 1.1, attack: ['Weapon'] },
  orc: { model: 'quaternius/Orc', h: 1.05, attack: ['Weapon', 'Punch'] },
  orc_shaman: { model: 'quaternius/Orc_Skull', h: 1.05, attack: ['Punch'], cast: 'Wave', shoot: 'Punch' },
  hyena: { model: 'quaternius/Wolf', h: 0.85, attack: ['Attack'] },
  fire_elemental: { model: 'quaternius/Hywirl', h: 1.0, attack: ['Headbutt', 'Punch'] },
  skeleton: { model: 'kaykit/Skeleton_Warrior', h: 1.0, attack: ['1H_Melee_Attack_Chop'] },
  skeleton_minion: { model: 'kaykit/Skeleton_Minion', h: 1.0, attack: ['1H_Melee_Attack_Chop', 'Unarmed_Melee_Attack_Punch_A'] },
  mimic: { model: 'kaykit/chest_gold', h: 0.7, attack: [] },
  ogre: { model: 'quaternius/Yeti', h: 1.05, attack: ['Punch', 'Weapon'] },
  ogre_chief: { model: 'quaternius/Yeti', h: 1.15, tint: '#ffb0a0', attack: ['Punch', 'Weapon'] },
  spider: { model: 'quaternius/Armabee', h: 0.9, attack: ['Headbutt'] },
  spiderling: { model: 'quaternius/Armabee', h: 0.8, tint: '#e0c8ff', attack: ['Headbutt'] },
  spider_queen: { model: 'quaternius/Armabee_Evolved', h: 1.2, attack: ['Headbutt', 'Punch'] },
  zombie: { model: UAL, tint: '#9ab88a', attack: ['Zombie_Scratch'], idle: 'Zombie_Idle_Loop', run: 'Zombie_Walk_Fwd_Loop' },
  wraith: { model: 'quaternius/Ghost', h: 1.0, attack: ['Headbutt', 'Punch'] },
  necromancer: { model: UAL, tint: '#7a6a9a', weapon: 'kaykit/w_staff', attack: ['Spell_Simple_Shoot'], ...SPELL },
  slime: { model: 'quaternius/GreenBlob', h: 0.9, attack: ['Bite_Front'] },
  slimelet: { model: 'quaternius/GreenBlob', h: 0.75, tint: '#d0ffd0', attack: ['Bite_Front'] },
  troll: { model: 'quaternius/Yeti', h: 1.0, tint: '#a8d8a0', attack: ['Punch', 'Weapon'] },
  cultist: { model: UAL, tint: '#b06070', weapon: 'kaykit/w_wand', attack: ['Spell_Simple_Shoot'], ...SPELL },
  imp: { model: 'quaternius/Demon', h: 0.95, attack: ['Punch'], cast: 'Wave', shoot: 'Punch' },
  lich: { model: 'kaykit/Skeleton_Mage', h: 1.1, tint: '#c8e0ff', attack: ['Spellcast_Shoot'], cast: 'Spellcasting', shoot: 'Spellcast_Shoot' },
};

export const FALLBACK: Look3D = { model: UAL, tint: '#c07070', attack: ['Punch_Cross', 'Punch_Jab'] };

/** 애니메이션 이름 후보 (팩마다 다르다) */
export const ANIMS = {
  idle: ['Idle_Combat', 'Idle_Weapon', 'Idle', 'Flying_Idle', 'Idle_Loop'],
  run: ['Running_A', 'Run_Weapon', 'Run', 'Fast_Flying', 'Gallop', 'Jog_Fwd_Loop', 'Walk', 'Walk_Loop'],
  hit: ['Hit_A', 'RecieveHit', 'HitReact', 'HitRecieve', 'Idle_HitReact1', 'Hit_Chest'],
  death: ['Death_A', 'Death', 'Death01'],
};
