// 층별 몬스터 무리. 방마다 하나씩 뽑는다. 마지막 방(계단 방)은 한 단계 깊은 무리가 지킨다.
export const ENCOUNTERS: Record<number, string[][]> = {
  1: [
    ['spider', 'spiderling', 'spiderling'],
    ['zombie', 'zombie'],
    ['slime'],
    ['goblin', 'goblin'],
    ['goblin', 'goblin', 'goblin'],
    ['goblin', 'goblin_archer'],
    ['hyena', 'goblin'],
  ],
  2: [
    ['spider', 'spider', 'spiderling'],
    ['zombie', 'zombie', 'skeleton_minion'],
    ['imp', 'imp', 'goblin'],
    ['slime', 'slime'],
    ['goblin', 'goblin', 'goblin', 'goblin_archer'],
    ['hyena', 'hyena', 'goblin'],
    ['orc', 'goblin', 'goblin'],
    ['goblin_archer', 'goblin_archer', 'goblin', 'goblin'],
  ],
  3: [
    ['necromancer', 'skeleton', 'zombie'],
    ['wraith', 'wraith'],
    ['spider', 'spider', 'spider', 'spiderling'],
    ['troll', 'goblin_archer'],
    ['cultist', 'orc', 'orc'],
    ['orc', 'orc', 'goblin_archer'],
    ['orc', 'orc_shaman', 'goblin', 'goblin'],
    ['hyena', 'hyena', 'goblin_archer', 'goblin_archer'],
    ['skeleton', 'skeleton', 'goblin'],
    ['fire_elemental', 'fire_elemental', 'goblin'],
  ],
  4: [
    ['troll', 'goblin', 'goblin_archer'],
    ['necromancer', 'wraith', 'skeleton'],
    ['cultist', 'ogre', 'goblin_archer'],
    ['imp', 'imp', 'imp', 'fire_elemental'],
    ['spider', 'spider', 'spider', 'slime'],
    ['fire_elemental', 'fire_elemental', 'goblin_archer'],
    ['skeleton', 'skeleton', 'goblin_archer', 'goblin_archer'],
    ['orc', 'orc', 'orc_shaman', 'goblin'],
    ['hyena', 'hyena', 'orc', 'orc'],
    ['ogre', 'goblin_archer', 'goblin_archer'],
  ],
  5: [
    ['troll', 'cultist', 'orc', 'orc'],
    ['necromancer', 'zombie', 'zombie', 'skeleton'],
    ['wraith', 'wraith', 'wraith'],
    ['spider', 'spider', 'spider', 'spider'],
    ['fire_elemental', 'fire_elemental', 'skeleton', 'skeleton'],
    ['orc', 'orc', 'orc_shaman', 'hyena', 'hyena'],
    ['skeleton', 'skeleton', 'orc_shaman', 'orc_shaman'],
    ['fire_elemental', 'fire_elemental', 'fire_elemental', 'goblin_archer'],
    ['ogre', 'orc_shaman', 'orc'],
    ['ogre', 'ogre'],
  ],
};

/** 마지막 층 마지막 방 (계약마다 보스가 다르다) */
export const BOSS_GROUP = ['ogre_chief', 'orc', 'orc_shaman', 'hyena'];
export const BOSS_GROUPS: Record<string, string[]> = {
  ogre_chief: BOSS_GROUP,
  lich: ['lich', 'skeleton', 'skeleton', 'wraith'],
  spider_queen: ['spider_queen', 'spider', 'spider'],
};

export const FLOORS = 5;
