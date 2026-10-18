// KayKit 에셋을 게임용으로 다듬어 public/assets/kaykit 에 복사한다.
// 캐릭터는 애니메이션이 76~95개씩 들어 있어 무거우므로 쓰는 것만 남긴다.
// 사용: node scripts/prep-assets.mjs
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup } from '@gltf-transform/functions';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CHAR_SRC = '/mnt/d/PROJ_I/public/assets/kaykit';
const DUNGEON_SRC = '/mnt/d/PROJ_SV/art3d/vendor/kaykit_dungeon/addons/kaykit_dungeon_remastered/Assets/gltf';
const OUT = 'public/assets/kaykit';

const CHARACTERS = ['Knight', 'Barbarian', 'Mage', 'Rogue_Hooded', 'Rogue', 'Skeleton_Warrior', 'Skeleton_Mage'];
const KEEP_ANIMS = new Set([
  'Idle', 'Idle_Combat', '2H_Melee_Idle', 'Unarmed_Idle', 'Running_A', 'Walking_A',
  '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '2H_Melee_Attack_Chop', '2H_Melee_Attack_Spin',
  '1H_Ranged_Shoot', '2H_Ranged_Shoot', 'Spellcast_Shoot', 'Spellcast_Long', 'Spellcasting', 'Spellcast_Raise',
  'Block', 'Hit_A', 'Hit_B', 'Death_A', 'Death_A_Pose', 'Cheer', 'Throw', 'Unarmed_Melee_Attack_Punch_A',
]);
const DUNGEON = [
  'floor_tile_large', 'floor_tile_small', 'floor_dirt_large', 'wall', 'wall_corner', 'wall_half', 'pillar', 'column',
  'torch_mounted', 'torch_lit', 'chest', 'chest_gold', 'stairs', 'barrel_small', 'box_small', 'rubble_half', 'banner_red',
];

mkdirSync(OUT, { recursive: true });
const io = new NodeIO();

for (const name of CHARACTERS) {
  const src = join(CHAR_SRC, `${name}.glb`);
  const doc = await io.read(src);
  for (const a of doc.getRoot().listAnimations()) if (!KEEP_ANIMS.has(a.getName())) a.dispose();
  await doc.transform(prune(), dedup());
  const out = join(OUT, `${name}.glb`);
  await io.write(out, doc);
  console.log(name, `${(statSync(src).size / 1e6).toFixed(1)}MB → ${(statSync(out).size / 1e6).toFixed(1)}MB`);
}

for (const name of DUNGEON) {
  for (const ext of ['.gltf.glb', '.glb']) {
    try {
      copyFileSync(join(DUNGEON_SRC, name + ext), join(OUT, `${name}.glb`));
      break;
    } catch {
      // 다음 확장자
    }
  }
}
console.log('dungeon pieces copied');

// ── Quaternius (CC0): .gltf(base64 내장) → .glb ──
const Q = '/mnt/d/PROJ_SV/art3d/vendor';
const QOUT = 'public/assets/quaternius';
mkdirSync(QOUT, { recursive: true });
const QUAT = [
  ['quaternius_rpgchars/glTF/Warrior.gltf', 'Warrior'], ['quaternius_rpgchars/glTF/Cleric.gltf', 'Cleric'],
  ['quaternius_rpgchars/glTF/Ranger.gltf', 'Ranger'], ['quaternius_rpgchars/glTF/Wizard.gltf', 'Wizard'],
  ['quaternius_rpgchars/glTF/Monk.gltf', 'Monk'], ['quaternius_rpgchars/glTF/Rogue.gltf', 'Rogue'],
  ['quaternius_monsters/Big/glTF/Orc.gltf', 'Orc'], ['quaternius_monsters/Big/glTF/Orc_Skull.gltf', 'Orc_Skull'],
  ['quaternius_monsters/Big/glTF/Demon.gltf', 'Demon'], ['quaternius_monsters/Big/glTF/Yeti.gltf', 'Yeti'],
  ['quaternius_monsters/Big/glTF/MushroomKing.gltf', 'MushroomKing'],
  ['quaternius_monsters/Flying/glTF/Ghost.gltf', 'Ghost'], ['quaternius_monsters/Flying/glTF/Glub.gltf', 'Glub'],
  ['quaternius_animals/glTF/Wolf.gltf', 'Wolf'],
];
for (const [src, name] of QUAT) {
  const doc = await io.read(join(Q, src));
  await doc.transform(prune(), dedup());
  const out = join(QOUT, `${name}.glb`);
  await io.write(out, doc);
  console.log('Q', name, `${(statSync(out).size / 1e6).toFixed(2)}MB`);
}
