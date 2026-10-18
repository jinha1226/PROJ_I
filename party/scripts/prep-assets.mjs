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
  // 본 게임 몬스터용
  ['quaternius_monsters/Big/glTF/Tribal.gltf', 'Tribal'], ['quaternius_monsters/Big/glTF/Ninja.gltf', 'Ninja'],
  ['quaternius_monsters/Flying/glTF/Hywirl.gltf', 'Hywirl'], ['quaternius_monsters/Flying/glTF/Armabee.gltf', 'Armabee'],
  ['quaternius_monsters/Flying/glTF/Armabee_Evolved.gltf', 'Armabee_Evolved'], ['quaternius_monsters/Flying/glTF/Ghost_Skull.gltf', 'Ghost_Skull'],
  ['quaternius_monsters/Blob/glTF/GreenBlob.gltf', 'GreenBlob'],
];
for (const [src, name] of QUAT) {
  const doc = await io.read(join(Q, src));
  await doc.transform(prune(), dedup());
  const out = join(QOUT, `${name}.glb`);
  await io.write(out, doc);
  console.log('Q', name, `${(statSync(out).size / 1e6).toFixed(2)}MB`);
}

// ── UAL (Quaternius Universal Animation Library, CC0): 마네킹 + 애니메이션 51종 ──
mkdirSync('public/assets/ual', { recursive: true });
copyFileSync('/mnt/d/PROJ_A/public/assets/models/ual/ual.glb', 'public/assets/ual/ual.glb');
copyFileSync('/mnt/d/PROJ_A/public/assets/models/ual/LICENSE.txt', 'public/assets/ual/LICENSE.txt');
// 마네킹 손에 쥐여 줄 KayKit 무기
const WSRC = '/mnt/d/PROJ_SV/art3d/vendor/kaykit_adventurers/addons/kaykit_character_pack_adventures/Assets/gltf';
for (const w of ['sword_1handed', 'axe_2handed', 'staff', 'crossbow_2handed', 'shield_round', 'wand', 'spellbook_open']) {
  const doc = await io.read(join(WSRC, `${w}.gltf`));
  await io.write(join(OUT, `w_${w}.glb`), doc);
}
console.log('ual + weapons');

copyFileSync('/mnt/d/PROJ_E/public/assets/kaykit/Skeleton_Minion.glb', join(OUT, 'Skeleton_Minion.glb'));
console.log('extra monsters');
