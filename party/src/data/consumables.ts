// 소모품: 파티가 함께 쓰는 벨트(4칸)에 들어간다. 효과는 sim/objects.ts 의 useConsumable.
export type ConsumableId = 'heal_potion' | 'banish_scroll' | 'fear_scroll' | 'fire_bomb';

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  icon: string;
  color: string;
  desc: string;
  /** 대상: 없음(즉시) / 적 하나 / 지점 */
  target: 'none' | 'enemy' | 'ground';
  /** 상자에서 나올 가중치 */
  w: number;
}

export const CONSUMABLES: Record<ConsumableId, ConsumableDef> = {
  heal_potion: {
    id: 'heal_potion', name: '회복 물약', icon: '약', color: '#ff6688', target: 'none', w: 4,
    desc: '파티 전원이 최대 체력의 40%를 회복한다.',
  },
  banish_scroll: {
    id: 'banish_scroll', name: '추방 두루마리', icon: '추', color: '#c9a0ff', target: 'enemy', w: 2,
    desc: '적 하나를 멀리 떨어진 곳으로 날려 보낸다. 시전이 끊기고 파티를 잊는다. (보스 불가)',
  },
  fear_scroll: {
    id: 'fear_scroll', name: '공포 두루마리', icon: '공', color: '#c080ff', target: 'none', w: 2,
    desc: '파티 주변 6칸의 적이 5초간 겁에 질려 도망친다. (정신 없는 적은 면역)',
  },
  fire_bomb: {
    id: 'fire_bomb', name: '화염 폭탄', icon: '폭', color: '#ff7a2f', target: 'ground', w: 3,
    desc: '지점에 던져 반경 2칸을 불태운다. 아군도 피해를 입는다.',
  },
};

export const BELT_SIZE = 4;
