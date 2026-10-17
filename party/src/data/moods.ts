// 스트레스가 가득 찼을 때의 결과 (다키스트 던전의 붕괴 · 각성을 단순화).
// 붕괴는 수치보다 자동전투 행동을 망가뜨린다 — 그 파티원은 플레이어가 직접 챙겨야 한다.
export type MoodId = 'afraid' | 'reckless' | 'selfish' | 'hesitant' | 'stalwart' | 'focused';

export interface MoodDef {
  id: MoodId;
  name: string;
  icon: string;
  color: string;
  /** true = 각성(좋은 쪽) */
  virtue: boolean;
  desc: string;
  mods?: { dmgMult?: number; dmgTakenMult?: number; actionMult?: number };
  /** 전투 중 가끔 외치는 말 */
  barks: string[];
}

export const MOODS: Record<MoodId, MoodDef> = {
  afraid: {
    id: 'afraid', name: '겁에 질림', icon: '겁', color: '#c080ff', virtue: false,
    desc: '적이 5칸 안에 오면 싸우지 않고 도망친다. 주는 피해 -15%. 명령을 가끔 거부한다.',
    mods: { dmgMult: 0.85 },
    barks: ['다 죽을 거야!', '여긴 싫어…', '도망쳐야 해!'],
  },
  reckless: {
    id: 'reckless', name: '무모함', icon: '광', color: '#ff6655', virtue: false,
    desc: '대열과 위치 고수를 무시하고 멀리 있는 적에게까지 혼자 돌진한다. 주는 피해 +10%, 받는 피해 +25%. 명령을 가끔 거부한다.',
    mods: { dmgMult: 1.1, dmgTakenMult: 1.25 },
    barks: ['내가 다 쓸어버리겠어!', '비켜, 겁쟁이들!', '피를 보여 줘!'],
  },
  selfish: {
    id: 'selfish', name: '이기적', icon: '욕', color: '#d8b04a', virtue: false,
    desc: '치유와 강화를 자기에게만 쓴다. 명령을 가끔 거부한다.',
    barks: ['내 목숨이 먼저야.', '알아서들 해.', '…왜 내가?'],
  },
  hesitant: {
    id: 'hesitant', name: '망설임', icon: '망', color: '#8fa0b8', virtue: false,
    desc: '자주 멍하니 멈추고 행동이 15% 느려진다. 명령을 가끔 거부한다.',
    mods: { actionMult: 0.85 },
    barks: ['잠깐… 잠깐만…', '이게 맞나…?', '못 하겠어…'],
  },
  stalwart: {
    id: 'stalwart', name: '굳건함', icon: '굳', color: '#7fe0ff', virtue: true,
    desc: '받는 피해 -20%, 스트레스를 절반만 받는다. 전투 중 동료들의 스트레스를 덜어 준다.',
    mods: { dmgTakenMult: 0.8 },
    barks: ['버텨라! 우리가 이긴다!', '내 뒤로!', '아직 끝나지 않았다!'],
  },
  focused: {
    id: 'focused', name: '집중', icon: '집', color: '#ffe14d', virtue: true,
    desc: '주는 피해 +20%, 기술 재사용 대기가 30% 빨리 돈다.',
    mods: { dmgMult: 1.2 },
    barks: ['보인다.', '하나도 놓치지 않아.', '숨을 고르고…'],
  },
};

export const AFFLICTIONS: MoodId[] = ['afraid', 'reckless', 'selfish', 'hesitant'];
export const VIRTUES: MoodId[] = ['stalwart', 'focused'];
