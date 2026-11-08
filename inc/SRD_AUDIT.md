# SRD 5.2.1 전수 대조

작성 2026-11-08. 기존 문서(SRD_COVERAGE.md 등)를 보지 않고, `data/srd521/db/*.json`(PDF에서 뽑은 원본)의 모든 항목을 게임 코드에 대 본 결과다. 대조 스크립트는 모듈을 그대로 불러 직업 · 레벨별 캐릭터를 만들고 실제로 갖는 기능을 본다.

상태: **SRD** = 코드가 있고 원문과 맞춘 것 · **있음** = 코드는 있으나 원문과 한 줄씩 대조하지 않음 · **공통** = 이름은 없지만 공통 코드가 처리 · **없음** = 코드가 없음 · **팔기만** = 전리품으로 팔기만 하고 효과 없음

## 요약

| 분야 | SRD 항목 | 코드에 있음 | 없음 / 효과 없음 |
|---|---|---|---|
| 직업 기능 (하위 직업 포함) | 232 | 231 (2026-11-08 2층 작업 · 용의 날개 · 후원자와 교신 · 의식 숙련 · 주문 기억 추가, DESIGN.md 164) | 주문책이 없어 효과 없음 1 (환기 전문가) |
| 주문 | 339 | 339 (2026-11-08 전투 밖 121개 추가 — G.Util, DESIGN.md 162) | 0 (효과의 크기는 원문, 쓰이는 곳은 판정 · 휴식 · 층 · 귀환) |
| 몬스터 | 330 | 330 (출현 158 · 2026-11-08 세력 여섯 추가, DESIGN.md 161) | 0 |
| 마법 물건 | 258 | 256 (G.Util.ITEM 65 · G.ItemX 15, DESIGN.md 162 · 164) | 팔기만 2: 신비한 카드(뽑기는 플레이어 몫) · 장수의 물약(나이 없음) |
| 상태 | 15 | 15 (2026-11-08에 행동 불능 · 의식 없음 · 석화 · 투명 · 매혹 · 귀먹음 · 탈진 추가) | 0 |
| 무기 · 갑옷 | 38 · 13 | 38 · 13 (Half Plate는 `Half-Plate Armor`, 방패는 `G.SRD.SHIELD`) | 0 |
| 종족 | 9 | 9 | 특성 일부 (아래) |

## 왜 SRD와 다른 것이 계속 나왔나

- 주문은 `js/spells.js`가 **종류별 틀**(명중 · 내성 · 치유 · 상태 · 강화 · 장판 …)로 한꺼번에 만든다. 데이터 변환(tools/srd_spells.py)이 원문을 틀에 끼우며 근사한다 — 예: "행동 불능"을 마비로, 투명을 "나를 노리는 공격 불리"로. 214개에 효과가 있지만 원문과 한 줄씩 맞춘 것은 손으로 짠 `js/srd.js`의 약 60개뿐이다.
- (2026-11-08 이전) 몬스터는 330종 중 64종만 게임에 나왔고 특성 · 행동은 일부만 코드가 있었다. 지금은 158종이 나오고 행동 엔진이 원문 행동을 쓴다 (DESIGN.md 160 · 161).
- (지웠다, DESIGN.md 161) 옛 방치형 게임의 규칙(트리 노드 · 노래 · 배율)이 SRD 규칙 옆에 남아 있었다. 시험은 "배율이 없나 · 정수인가"를 보고, "원문과 같은가"는 보지 않았다.
- 코드 주석에 "SRD"라고 적고 원문과 다르게 짠 곳이 있었다 (히드라 · 분열 · 언데드 퇴치 · 바드의 영감 등).

## 직업 기능

### 없음 (코드가 없다)

| 직업 | 하위 직업 | 레벨 | 기능 | 원문 첫 줄 |
|---|---|---|---|---|

### 있음 · 공통

| 직업 | 하위 | 레벨 | 기능 | 코드 | 부여 |
|---|---|---|---|---|---|
| Barbarian |  | 1 | Rage | sr_rage | 레벨에 자동 |
| Barbarian |  | 1 | Unarmored Defense | 공통: dnd.js armorAC | — |
| Barbarian |  | 1 | Weapon Mastery | 공통: srd_base masteryOf · srd_species onHit | — |
| Barbarian |  | 2 | Danger Sense | ft_danger | 레벨에 자동 |
| Barbarian |  | 2 | Reckless Attack | sr_reckless | 레벨에 자동 |
| Barbarian |  | 3 | Barbarian Subclass | 공통: 하위 직업 (G.D.ADV) | — |
| Barbarian |  | 3 | Primal Knowledge | 공통: srd_base profs (기술 하나 · 격노 중 근력 판정은 판정 장면에 격노가 없어 아직) | — |
| Barbarian |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Barbarian |  | 5 | Extra Attack | 공통: dnd.js attacks | — |
| Barbarian |  | 5 | Fast Movement | sr_fastmove | 레벨에 자동 |
| Barbarian |  | 7 | Feral Instinct | sr_feral | 레벨에 자동 |
| Barbarian |  | 7 | Instinctive Pounce | ft_pounce | 레벨에 자동 |
| Barbarian |  | 9 | Brutal Strike | sr_brutal | 레벨에 자동 |
| Barbarian |  | 11 | Relentless Rage | sr_relent | 레벨에 자동 |
| Barbarian |  | 13 | Improved Brutal Strike | ft_ibrutal ft_ibrutal2 | 레벨에 자동 |
| Barbarian |  | 15 | Persistent Rage | ft_persist | 레벨에 자동 |
| Barbarian |  | 17 | Improved Brutal Strike | ft_ibrutal ft_ibrutal2 | 레벨에 자동 |
| Barbarian |  | 18 | Indomitable Might | ft_might | 레벨에 자동 |
| Barbarian |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Barbarian |  | 20 | Primal Champion | ft_champion | 레벨에 자동 |
| Barbarian | Path of the Berserker | 3 | Frenzy | sr_frenzy | 레벨에 자동 |
| Barbarian | Path of the Berserker | 6 | Mindless Rage | ft_mindless | 레벨에 자동 |
| Barbarian | Path of the Berserker | 10 | Retaliation | sr_retal | 레벨에 자동 |
| Barbarian | Path of the Berserker | 14 | Intimidating Presence | sr_intim | 레벨에 자동 |
| Bard |  | 1 | Bardic Inspiration | sr_insp | 레벨에 자동 |
| Bard |  | 1 | Spellcasting | 공통: res.js 슬롯 표 | — |
| Bard |  | 2 | Expertise | 공통: srd_base expert | — |
| Bard |  | 2 | Jack of All Trades | ft_jack | 레벨에 자동 |
| Bard |  | 3 | Bard Subclass | 공통: 하위 직업 | — |
| Bard |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Bard |  | 5 | Font of Inspiration | ft_fontslot | 레벨에 자동 |
| Bard |  | 7 | Countercharm | ft_counter | 레벨에 자동 |
| Bard |  | 10 | Magical Secrets | ft_secrets | 레벨에 자동 |
| Bard |  | 18 | Superior Inspiration | ft_superinsp | 레벨에 자동 |
| Bard |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Bard |  | 20 | Words of Creation | ft_words | 레벨에 자동 |
| Bard | College of Lore | 3 | Bonus Proficiencies | 공통: srd_base profs (기술 셋) | — |
| Bard | College of Lore | 3 | Cutting Words | sr_cutting | 레벨에 자동 |
| Bard | College of Lore | 6 | Magical Discoveries | 공통: srd_species discover | — |
| Bard | College of Lore | 14 | Peerless Skill | sr_peerless | 레벨에 자동 |
| Cleric |  | 1 | Spellcasting | 공통: res.js 슬롯 표 | — |
| Cleric |  | 1 | Divine Order | 공통: srd_base | — |
| Cleric |  | 2 | Channel Divinity | 공통: sr_turn · sr_sacred 횟수 | — |
| Cleric |  | 3 | Cleric Subclass | 공통: 하위 직업 | — |
| Cleric |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Cleric |  | 5 | Sear Undead | ft_sear | 레벨에 자동 |
| Cleric |  | 7 | Blessed Strikes | ft_bstrike | 레벨에 자동 |
| Cleric |  | 10 | Divine Intervention | ft_intervene | 레벨에 자동 |
| Cleric |  | 14 | Improved Blessed Strikes | ft_bstrike2 | 레벨에 자동 |
| Cleric |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Cleric |  | 20 | Greater Divine Intervention | 공통: options.js | — |
| Cleric | Life Domain | 3 | Disciple of Life | sr_disciple | 레벨에 자동 |
| Cleric | Life Domain | 3 | Life Domain Spells | 공통: srd_base subSpells | — |
| Cleric | Life Domain | 3 | Preserve Life | sr_preserve | 레벨에 자동 |
| Cleric | Life Domain | 6 | Blessed Healer | ft_bhealer | 레벨에 자동 |
| Cleric | Life Domain | 17 | Supreme Healing | ft_supreme | 레벨에 자동 |
| Druid |  | 1 | Spellcasting | 공통: res.js 슬롯 표 | — |
| Druid |  | 1 | Druidic | 공통: 언어 (srd_species langs) | — |
| Druid |  | 1 | Primal Order | 공통: srd_base | — |
| Druid |  | 2 | Wild Shape | sr_wild | 레벨에 자동 |
| Druid |  | 2 | Wild Companion | ft_wcomp | 레벨에 자동 |
| Druid |  | 3 | Druid Subclass | 공통: 하위 직업 | — |
| Druid |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Druid |  | 5 | Wild Resurgence | ft_resurge | 레벨에 자동 |
| Druid |  | 7 | Elemental Fury | ft_fury | 레벨에 자동 |
| Druid |  | 15 | Improved Elemental Fury | ft_fury2 | 레벨에 자동 |
| Druid |  | 18 | Beast Spells | ft_beastsp | 레벨에 자동 |
| Druid |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Druid |  | 20 | Archdruid | ft_archdruid | 레벨에 자동 |
| Druid | Circle of the Land | 3 | Circle of the Land Spells | 공통: srd_base subSpells | — |
| Druid | Circle of the Land | 3 | Land’s Aid | sr_landaid | 레벨에 자동 |
| Druid | Circle of the Land | 6 | Natural Recovery | ft_natrec | 레벨에 자동 |
| Druid | Circle of the Land | 10 | Nature’s Ward | sr_ward | 레벨에 자동 |
| Druid | Circle of the Land | 14 | Nature’s Sanctuary | ft_sanctuary | 레벨에 자동 |
| Fighter |  | 1 | Fighting Style | 공통: fs_* (options) | — |
| Fighter |  | 1 | Second Wind | sr_second | 레벨에 자동 |
| Fighter |  | 1 | Weapon Mastery | 공통: srd_base masteryOf · srd_species onHit | — |
| Fighter |  | 2 | Action Surge | sr_surge | 레벨에 자동 |
| Fighter |  | 2 | Tactical Mind | x_tmind | 레벨에 자동 |
| Fighter |  | 3 | Fighter Subclass | 공통: 하위 직업 | — |
| Fighter |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Fighter |  | 5 | Extra Attack | 공통: dnd.js attacks | — |
| Fighter |  | 5 | Tactical Shift | ft_tshift | 레벨에 자동 |
| Fighter |  | 9 | Indomitable | sr_indom | 레벨에 자동 |
| Fighter |  | 9 | Tactical Master | ft_tmaster | 레벨에 자동 |
| Fighter |  | 11 | Two Extra Attacks | 공통: dnd.js attacks | — |
| Fighter |  | 13 | Studied Attacks | ft_studied | 레벨에 자동 |
| Fighter |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Fighter |  | 20 | Three Extra Attacks | 공통: dnd.js attacks | — |
| Fighter | Champion | 3 | Improved Critical | sr_impcrit | 레벨에 자동 |
| Fighter | Champion | 3 | Remarkable Athlete | ft_athlete | 레벨에 자동 |
| Fighter | Champion | 7 | Additional Fighting Style | ft_afs | 레벨에 자동 |
| Fighter | Champion | 10 | Heroic Warrior | ft_heroic | 레벨에 자동 |
| Fighter | Champion | 15 | Superior Critical | 공통: fantasy critAt | — |
| Fighter | Champion | 18 | Survivor | sr_survivor | 레벨에 자동 |
| Monk |  | 1 | Martial Arts | sx_ma | 레벨에 자동 |
| Monk |  | 1 | Unarmored Defense | 공통: dnd.js armorAC | — |
| Monk |  | 2 | Monk’s Focus | 공통: res.js pool · FOCUS | — |
| Monk |  | 2 | Unarmored Movement | 공통: turn.js srdMove | — |
| Monk |  | 2 | Uncanny Metabolism | ft_metabolism | 레벨에 자동 |
| Monk |  | 3 | Deflect Attacks | sr_deflect | 레벨에 자동 |
| Monk |  | 3 | Monk Subclass | 공통: 하위 직업 | — |
| Monk |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Monk |  | 4 | Slow Fall | x_fall | 레벨에 자동 |
| Monk |  | 5 | Extra Attack | 공통: dnd.js attacks | — |
| Monk |  | 5 | Stunning Strike | sr_stun | 레벨에 자동 |
| Monk |  | 6 | Empowered Strikes | ft_empowered | 레벨에 자동 |
| Monk |  | 7 | Evasion | ft_evasion ft_evasion_r | 레벨에 자동 |
| Monk |  | 9 | Acrobatic Movement | x_acro | 레벨에 자동 |
| Monk |  | 10 | Heightened Focus | 공통: srd.js sr_flurry 3회 · sr_patient | — |
| Monk |  | 10 | Self-Restoration | sr_selfrest | 레벨에 자동 |
| Monk |  | 13 | Deflect Energy | ft_denergy | 레벨에 자동 |
| Monk |  | 14 | Disciplined Survivor | ft_survivor | 레벨에 자동 |
| Monk |  | 15 | Perfect Focus | ft_perfect | 레벨에 자동 |
| Monk |  | 18 | Superior Defense | ft_sdefense | 레벨에 자동 |
| Monk |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Monk |  | 20 | Body and Mind | 공통: dnd.js ab | — |
| Monk | Warrior of the Open Hand | 3 | Open Hand Technique | sr_ohtech | 레벨에 자동 |
| Monk | Warrior of the Open Hand | 6 | Wholeness of Body | sr_whole | 레벨에 자동 |
| Monk | Warrior of the Open Hand | 11 | Fleet Step | ft_fleet | 레벨에 자동 |
| Monk | Warrior of the Open Hand | 17 | Quivering Palm | sr_quiver | 레벨에 자동 |
| Paladin |  | 1 | Lay On Hands | sr_lay | 레벨에 자동 |
| Paladin |  | 1 | Spellcasting | 공통: res.js 슬롯 표 | — |
| Paladin |  | 1 | Weapon Mastery | 공통: srd_base masteryOf · srd_species onHit | — |
| Paladin |  | 2 | Fighting Style | 공통: fs_* (options) | — |
| Paladin |  | 2 | Paladin’s Smite | 공통: res.js freeOf sr_smite | — |
| Paladin |  | 3 | Channel Divinity | 공통: sr_turn · sr_sacred 횟수 | — |
| Paladin |  | 3 | Paladin Subclass | 공통: 하위 직업 | — |
| Paladin |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Paladin |  | 5 | Extra Attack | 공통: dnd.js attacks | — |
| Paladin |  | 5 | Faithful Steed | ft_steed | 레벨에 자동 |
| Paladin |  | 6 | Aura of Protection | sr_aura | 레벨에 자동 |
| Paladin |  | 9 | Abjure Foes | ft_abjure | 레벨에 자동 |
| Paladin |  | 10 | Aura of Courage | ft_acourage | 레벨에 자동 |
| Paladin |  | 11 | Radiant Strikes | sr_radiant | 레벨에 자동 |
| Paladin |  | 14 | Restoring Touch | ft_restore | 레벨에 자동 |
| Paladin |  | 18 | Aura Expansion | ft_aexpand | 레벨에 자동 |
| Paladin |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Paladin | Oath of Devotion | 3 | Oath of Devotion Spells | 공통: srd_base subSpells | — |
| Paladin | Oath of Devotion | 3 | Sacred Weapon | sr_sacred | 레벨에 자동 |
| Paladin | Oath of Devotion | 7 | Aura of Devotion | ft_adev | 레벨에 자동 |
| Paladin | Oath of Devotion | 15 | Smite of Protection | ft_sprotect | 레벨에 자동 |
| Paladin | Oath of Devotion | 20 | Holy Nimbus | sr_nimbus | 레벨에 자동 |
| Ranger |  | 1 | Spellcasting | 공통: res.js 슬롯 표 | — |
| Ranger |  | 1 | Favored Enemy | 공통: sr_hmark 횟수 | — |
| Ranger |  | 1 | Weapon Mastery | 공통: srd_base masteryOf · srd_species onHit | — |
| Ranger |  | 2 | Deft Explorer | 공통: srd_base expert · 언어 | — |
| Ranger |  | 2 | Fighting Style | 공통: fs_* (options) | — |
| Ranger |  | 3 | Ranger Subclass | 공통: 하위 직업 | — |
| Ranger |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Ranger |  | 5 | Extra Attack | 공통: dnd.js attacks | — |
| Ranger |  | 6 | Roving | 공통: turn.js srdMove | — |
| Ranger |  | 9 | Expertise | 공통: srd_base expert | — |
| Ranger |  | 10 | Tireless | sr_tireless | 레벨에 자동 |
| Ranger |  | 13 | Relentless Hunter | ft_rhunter | 레벨에 자동 |
| Ranger |  | 14 | Nature’s Veil | ft_veil | 레벨에 자동 |
| Ranger |  | 17 | Precise Hunter | sr_precise | 레벨에 자동 |
| Ranger |  | 18 | Feral Senses | ft_feral | 레벨에 자동 |
| Ranger |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Ranger |  | 20 | Foe Slayer | ft_slayer | 레벨에 자동 |
| Ranger | Hunter | 3 | Hunter’s Lore | ft_hlore | 레벨에 자동 |
| Ranger | Hunter | 3 | Hunter’s Prey | 공통: sr_colossus | — |
| Ranger | Hunter | 7 | Defensive Tactics | ft_escape | 레벨에 자동 |
| Ranger | Hunter | 11 | Superior Hunter’s Prey | sr_sprey | 레벨에 자동 |
| Ranger | Hunter | 15 | Superior Hunter’s Defense | ft_shdef | 레벨에 자동 |
| Rogue |  | 1 | Expertise | 공통: srd_base expert | — |
| Rogue |  | 1 | Sneak Attack | 공통: dnd.js sneak | — |
| Rogue |  | 1 | Thieves’ Cant | 공통: 언어 (srd_species langs) | — |
| Rogue |  | 1 | Weapon Mastery | 공통: srd_base masteryOf · srd_species onHit | — |
| Rogue |  | 2 | Cunning Action | sr_cunning | 레벨에 자동 |
| Rogue |  | 3 | Rogue Subclass | 공통: 하위 직업 | — |
| Rogue |  | 3 | Steady Aim | sr_steady | 레벨에 자동 |
| Rogue |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Rogue |  | 5 | Cunning Strike | sr_cstrike | 레벨에 자동 |
| Rogue |  | 5 | Uncanny Dodge | sr_uncanny | 레벨에 자동 |
| Rogue |  | 7 | Evasion | ft_evasion ft_evasion_r | 레벨에 자동 |
| Rogue |  | 7 | Reliable Talent | sr_reliable | 레벨에 자동 |
| Rogue |  | 11 | Improved Cunning Strike | ft_icunning | 레벨에 자동 |
| Rogue |  | 14 | Devious Strikes | sr_devious | 레벨에 자동 |
| Rogue |  | 15 | Slippery Mind | ft_slippery | 레벨에 자동 |
| Rogue |  | 18 | Elusive | sr_elusive | 레벨에 자동 |
| Rogue |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Rogue |  | 20 | Stroke of Luck | ft_stroke | 레벨에 자동 |
| Rogue | Thief | 3 | Fast Hands | sr_fasthands | 레벨에 자동 |
| Rogue | Thief | 3 | Second-Story Work | 공통: 게임에 그 상황 없음 (등반 · 도약) | — |
| Rogue | Thief | 9 | Supreme Sneak | ft_supsneak | 레벨에 자동 |
| Rogue | Thief | 13 | Use Magic Device | ft_umd | 레벨에 자동 |
| Rogue | Thief | 17 | Thief’s Reflexes | sr_reflex | 레벨에 자동 |
| Sorcerer |  | 1 | Spellcasting | 공통: res.js 슬롯 표 | — |
| Sorcerer |  | 1 | Innate Sorcery | ft_innate | 레벨에 자동 |
| Sorcerer |  | 2 | Font of Magic | 공통: res.js pool | — |
| Sorcerer |  | 2 | Metamagic | 공통: mm_* (options) | — |
| Sorcerer |  | 3 | Sorcerer Subclass | 공통: 하위 직업 | — |
| Sorcerer |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Sorcerer |  | 5 | Sorcerous Restoration | 공통: res.js sorcRest | — |
| Sorcerer |  | 7 | Sorcery Incarnate | ft_incarnate | 레벨에 자동 |
| Sorcerer |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Sorcerer |  | 20 | Arcane Apotheosis | ft_apotheosis | 레벨에 자동 |
| Sorcerer | Draconic Sorcery | 3 | Draconic Resilience | sr_dres | 레벨에 자동 |
| Sorcerer | Draconic Sorcery | 3 | Draconic Spells | 공통: srd_base subSpells? | — |
| Sorcerer | Draconic Sorcery | 6 | Elemental Affinity | sr_affinity | 레벨에 자동 |
| Sorcerer | Draconic Sorcery | 14 | Dragon Wings | 공통: 게임에 그 상황 없음 (비행 · 높이) | — |
| Sorcerer | Draconic Sorcery | 18 | Dragon Companion | ft_drcomp | 레벨에 자동 |
| Warlock |  | 1 | Eldritch Invocations | 공통: iv_* (options) | — |
| Warlock |  | 1 | Pact Magic | 공통: res.js PACT | — |
| Warlock |  | 2 | Magical Cunning | ft_mcunning | 레벨에 자동 |
| Warlock |  | 3 | Warlock Subclass | 공통: 하위 직업 | — |
| Warlock |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Warlock |  | 9 | Contact Patron | 공통: 게임에 그 상황 없음 (교신) | — |
| Warlock |  | 11 | Mystic Arcanum | 공통: res.js slot>5 | — |
| Warlock |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Warlock |  | 20 | Eldritch Master | 공통: ft_mcunning (20레벨: 전부) | — |
| Warlock | Fiend Patron | 3 | Dark One’s Blessing | sr_dob | 레벨에 자동 |
| Warlock | Fiend Patron | 3 | Fiend Spells | 공통: srd_base subSpells | — |
| Warlock | Fiend Patron | 6 | Dark One’s Own Luck | sr_luck | 레벨에 자동 |
| Warlock | Fiend Patron | 10 | Fiendish Resilience | sr_fres | 레벨에 자동 |
| Warlock | Fiend Patron | 14 | Hurl Through Hell | sr_hurl | 레벨에 자동 |
| Wizard |  | 1 | Spellcasting | 공통: res.js 슬롯 표 | — |
| Wizard |  | 1 | Ritual Adept | 공통: 게임에 그 상황 없음 (의식 시전) | — |
| Wizard |  | 1 | Arcane Recovery | 공통: res.js arcRec | — |
| Wizard |  | 2 | Scholar | 공통: srd_base expert | — |
| Wizard |  | 3 | Wizard Subclass | 공통: 하위 직업 | — |
| Wizard |  | 4 | Ability Score Improvement | 공통: dnd.js ab (ASI_LV) | — |
| Wizard |  | 5 | Memorize Spell | 공통: 게임에 그 상황 없음 (주문책 교체) | — |
| Wizard |  | 18 | Spell Mastery | 공통: srd_species mastered | — |
| Wizard |  | 19 | Epic Boon | 공통: dnd.js boons | — |
| Wizard |  | 20 | Signature Spells | 공통: srd_species signature | — |
| Wizard | Evoker | 3 | Evocation Savant | 공통: 게임에 그 상황 없음 (주문책 베끼기) | — |
| Wizard | Evoker | 3 | Potent Cantrip | sr_potent | 레벨에 자동 |
| Wizard | Evoker | 6 | Sculpt Spells | ft_sculpt | 레벨에 자동 |
| Wizard | Evoker | 10 | Empowered Evocation | sr_empower | 레벨에 자동 |
| Wizard | Evoker | 14 | Overchannel | ft_overchannel | 레벨에 자동 |

## 주문

### 효과 코드 없음

| 레벨 | 주문 | 직업 | 원문 첫 줄 |
|---|---|---|---|
| 0 | Dancing Lights | Bard, Sorcerer, Wizard | You create up to four torch-size lights within range, making them appear as torches, lanterns, or glowing orbs that hove |
| 0 | Druidcraft | Druid | Whispering to the spirits of nature, you create one of the following effects within range. Weather Sensor. You create a  |
| 0 | Elementalism | Druid, Sorcerer, Wizard | You exert control over the elements, creating one of the following effects within range. Beckon Air. You create a breeze |
| 0 | Guidance | Cleric, Druid | You touch a willing creature and choose a skill. Until the spell ends, the creature adds 1d4 to any ability check using  |
| 0 | Light | Bard, Cleric, Sorcerer, Wizard | You touch one Large or smaller object that isn’t being worn or carried by someone else. Until the spell ends, the object |
| 0 | Mage Hand | Bard, Sorcerer, Warlock, Wizard | A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration. The hand vanishes |
| 0 | Mending | Bard, Cleric, Druid, Sorcerer, Wizard | This spell repairs a single break or tear in an object you touch, such as a broken chain link, two halves of a broken ke |
| 0 | Message | Bard, Druid, Sorcerer, Wizard | You point toward a creature within range and whisper a message. The target (and only the target) hears the message and c |
| 0 | Minor Illusion | Bard, Sorcerer, Warlock, Wizard | You create a sound or an image of an object within range that lasts for the duration. See the descriptions below for the |
| 0 | Prestidigitation | Bard, Sorcerer, Warlock, Wizard | You create a magical effect within range. Choose the effect from the options below. If you cast this spell multiple time |
| 0 | Thaumaturgy | Cleric | You manifest a minor wonder within range. You create one of the effects below within range. If you cast this spell multi |
| 1 | Alarm | Ranger, Wizard | You set an alarm against intrusion. Choose a door, a window, or an area within range that is no larger than a 20-foot Cu |
| 1 | Comprehend Languages | Bard, Sorcerer, Warlock, Wizard | For the duration, you understand the literal meaning of any language that you hear or see signed. You also understand an |
| 1 | Create or Destroy Water | Cleric, Druid | You do one of the following: Create Water. You create up to 10 gallons of clean water within range in an open container. |
| 1 | Detect Evil and Good | Cleric, Paladin | For the duration, you sense the location of any Aberration, Celestial, Elemental, Fey, Fiend, or Undead within 30 feet o |
| 1 | Detect Poison and Disease | Cleric, Druid, Paladin, Ranger | For the duration, you sense the location of poisons, poisonous or venomous creatures, and magical contagions within 30 f |
| 1 | Disguise Self | Bard, Sorcerer, Wizard | You make yourself—including your clothing, armor, weapons, and other belongings on your person— look different until the |
| 1 | Feather Fall | Bard, Sorcerer, Wizard | Choose up to five falling creatures within range. A falling creature’s rate of descent slows to 60 feet per round until  |
| 1 | Find Familiar | Wizard | You gain the service of a familiar, a spirit that takes an animal form you choose: Bat, Cat, Frog, Hawk, Lizard, Octopus |
| 1 | Floating Disk | Wizard | This spell creates a circular, horizontal plane of force, 3 feet in diameter and 1 inch thick, that floats 3 feet above  |
| 1 | Identify | Bard, Wizard | You touch an object throughout the spell’s casting. If the object is a magic item or some other magical object, you lear |
| 1 | Illusory Script | Bard, Warlock, Wizard | You write on parchment, paper, or another suitable material and imbue it with an illusion that lasts for the duration. T |
| 1 | Purify Food and Drink | Cleric, Druid, Paladin | You remove poison and rot from nonmagical food and drink in a 5-foot-radius Sphere centered on a point within range. |
| 1 | Silent Image | Bard, Sorcerer, Wizard | You create the image of an object, a creature, or some other visible phenomenon that is no larger than a 15-foot Cube. T |
| 1 | Speak with Animals | Bard, Druid, Ranger, Warlock | For the duration, you can comprehend and verbally communicate with Beasts, and you can use any of the Influence action’s |
| 1 | Unseen Servant | Bard, Warlock, Wizard | This spell creates an Invisible, mindless, shapeless, Medium force that performs simple tasks at your command until the  |
| 2 | Alter Self | Sorcerer, Wizard | You alter your physical form. Choose one of the following options. Its effects last for the duration, during which you c |
| 2 | Animal Messenger | Bard, Druid, Ranger | A Tiny Beast of your choice that you can see within range must succeed on a Charisma saving throw, or it attempts to del |
| 2 | Arcane Lock | Wizard | You touch a closed door, window, gate, container, or hatch and magically lock it for the duration. This lock can’t be un |
| 2 | Arcanist’s Magic Aura | Wizard | With a touch, you place an illusion on a willing creature or an object that isn’t being worn or carried. A creature gain |
| 2 | Augury | Cleric, Druid, Wizard | You receive an omen from an otherworldly entity about the results of a course of action that you plan to take within the |
| 2 | Continual Flame | Cleric, Druid, Wizard | A flame springs from an object that you touch. The effect casts Bright Light in a 20-foot radius and Dim Light for an ad |
| 2 | Darkvision | Druid, Ranger, Sorcerer, Wizard | For the duration, a willing creature you touch has Darkvision with a range of 150 feet. |
| 2 | Detect Thoughts | Bard, Sorcerer, Wizard | You activate one of the effects below. Until the spell ends, you can activate either effect as a Magic action on your la |
| 2 | Find Steed | Paladin | You summon an otherworldly being that appears as a loyal steed in an unoccupied space of your choice within range. This  |
| 2 | Gentle Repose | Cleric, Paladin, Wizard | You touch a corpse or other remains. For the duration, the target is protected from decay and can’t become Undead.   The |
| 2 | Knock | Bard, Sorcerer, Wizard | Choose an object that you can see within range. The object can be a door, a box, a chest, a set of manacles, a padlock,  |
| 2 | Locate Animals or Plants | Bard, Druid, Ranger | Describe or name a specific kind of Beast, Plant creature, or nonmagical plant. You learn the direction and distance to  |
| 2 | Locate Object | Bard, Cleric, Druid, Paladin, Ranger, Wizard | Describe or name an object that is familiar to you. You sense the direction to the object’s location if that object is w |
| 2 | Magic Mouth | Bard, Wizard | You implant a message within an object in range—a message that is uttered when a trigger condition is met. Choose an obj |
| 2 | Rope Trick | Wizard | You touch a rope. One end of it hovers upward until the rope hangs perpendicular to the ground or the rope reaches a cei |
| 2 | See Invisibility | Bard, Sorcerer, Wizard | For the duration, you see creatures and objects that have the Invisible condition as if they were visible, and you can s |
| 2 | Silence | Bard, Cleric, Ranger | For the duration, no sound can be created within or pass through a 20-foot-radius Sphere centered on a point you choose  |
| 2 | Spider Climb | Sorcerer, Warlock, Wizard | Until the spell ends, one willing creature you touch gains the ability to move up, down, and across vertical surfaces an |
| 2 | Zone of Truth | Bard, Cleric, Paladin | You create a magical zone that guards against deception in a 15-foot-radius Sphere centered on a point within range. Unt |
| 3 | Create Food and Water | Cleric, Paladin | You create 45 pounds of food and 30 gallons of fresh water on the ground or in containers within range—both useful in fe |
| 3 | Daylight | Cleric, Druid, Paladin, Ranger, Sorcerer | For the duration, sunlight spreads from a point within range and fills a 60-foot-radius Sphere. The sunlight’s area is B |
| 3 | Gaseous Form | Sorcerer, Warlock, Wizard | A willing creature you touch shape-shifts, along with everything it’s wearing and carrying, into a misty cloud for the d |
| 3 | Glyph of Warding | Bard, Cleric, Wizard | You inscribe a glyph that later unleashes a magical effect. You inscribe it either on a surface (such as a table or a se |
| 3 | Magic Circle | Cleric, Paladin, Warlock, Wizard | You create a 10-foot-radius, 20-foot-tall Cylinder of magical energy centered on a point on the ground that you can see  |
| 3 | Major Image | Bard, Sorcerer, Warlock, Wizard | You create the image of an object, a creature, or some other visible phenomenon that is no larger than a 20-foot Cube. T |
| 3 | Meld into Stone | Cleric, Druid, Ranger | You step into a stone object or surface large enough to fully contain your body, merging yourself and your equipment wit |
| 3 | Nondetection | Bard, Ranger, Wizard | For the duration, you hide a target that you touch from Divination spells. The target can be a willing creature, or it c |
| 3 | Phantom Steed | Wizard | A Large, quasi-real, horselike creature appears on the ground in an unoccupied space of your choice within range. You de |
| 3 | Sending | Bard, Cleric, Wizard | You send a short message of 25 words or fewer to a creature you have met or a creature described to you by someone who h |
| 3 | Speak with Dead | Bard, Cleric, Wizard | You grant the semblance of life to a corpse of your choice within range, allowing it to answer questions you pose. The c |
| 3 | Speak with Plants | Bard, Druid, Ranger | You imbue plants in an immobile 30-foot Emanation with limited sentience and animation, giving them the ability to commu |
| 3 | Tongues | Bard, Cleric, Sorcerer, Warlock, Wizard | This spell grants the creature you touch the ability to understand any spoken or signed language that it hears or sees.  |
| 3 | Water Breathing | Druid, Ranger, Sorcerer, Wizard | This spell grants up to ten willing creatures of your choice within range the ability to breathe underwater until the sp |
| 3 | Water Walk | Cleric, Druid, Ranger, Sorcerer | This spell grants the ability to move across any liquid surface—such as water, acid, mud, snow, quicksand, or lava—as if |
| 4 | Control Water | Cleric, Druid, Wizard | Until the spell ends, you control any water inside an area you choose that is a Cube up to 100 feet on a side, using one |
| 4 | Divination | Cleric, Druid, Wizard | This spell puts you in contact with a god or a god’s servants. You ask one question about a specific goal, event, or act |
| 4 | Fabricate | Wizard | You convert raw materials into products of the same material. For example, you can fabricate a wooden bridge from a clum |
| 4 | Hallucinatory Terrain | Bard, Druid, Warlock, Wizard | You make natural terrain in a 150-foot Cube in range look, sound, and smell like another sort of natural terrain. Thus,  |
| 4 | Locate Creature | Bard, Cleric, Druid, Paladin, Ranger, Wizard | Describe or name a creature that is familiar to you. You sense the direction to the creature’s location if that creature |
| 4 | Private Sanctum | Wizard | You make an area within range magically secure. The area is a Cube that can be as small as 5 feet to as large as 100 fee |
| 4 | Secret Chest | Wizard | You hide a chest and all its contents on the Ethereal Plane. You must touch the chest and the miniature replica that ser |
| 4 | Stone Shape | Cleric, Druid, Wizard | You touch a stone object of Medium size or smaller or a section of stone no more than 5 feet in any dimension and form i |
| 5 | Awaken | Bard, Druid | You spend the casting time tracing magical pathways within a precious gemstone, and then touch the target. The target mu |
| 5 | Commune | Cleric | You contact a deity or a divine proxy and ask up to three questions that can be answered with yes or no. You must ask yo |
| 5 | Commune with Nature | Druid, Ranger | You commune with nature spirits and gain knowledge of the surrounding area. In the outdoors, the spell gives you knowled |
| 5 | Contact Other Plane | Warlock, Wizard | You mentally contact a demigod, the spirit of a longdead sage, or some other knowledgeable entity from another plane. Co |
| 5 | Creation | Sorcerer, Wizard | You pull wisps of shadow material from the Shadowfell to create an object within range. It is either an object of vegeta |
| 5 | Dream | Bard, Warlock, Wizard | You target a creature you know on the same plane of existence. You or a willing creature you touch enters a trance state |
| 5 | Geas | Bard, Cleric, Druid, Paladin, Wizard | You give a verbal command to a creature that you can see within range, ordering it to carry out some service or refrain  |
| 5 | Hallow | Cleric | You touch a point and infuse an area around it with holy or unholy power. The area can have a radius up to 60 feet, and  |
| 5 | Legend Lore | Bard, Cleric, Wizard | Name or describe a famous person, place, or object. The spell brings to your mind a brief summary of the significant lor |
| 5 | Passwall | Wizard | A passage appears at a point that you can see on a wooden, plaster, or stone surface (such as a wall, ceiling, or floor) |
| 5 | Planar Binding | Bard, Cleric, Druid, Warlock, Wizard | You attempt to bind a Celestial, an Elemental, a Fey, or a Fiend to your service. The creature must be within range for  |
| 5 | Raise Dead | Bard, Cleric, Paladin | With a touch, you revive a dead creature if it has been dead no longer than 10 days and it wasn’t Undead when it died.   |
| 5 | Reincarnate | Druid | You touch a dead Humanoid or a piece of one. If the creature has been dead no longer than 10 days, the spell forms a new |
| 5 | Scrying | Bard, Cleric, Druid, Warlock, Wizard | You can see and hear a creature you choose that is on the same plane of existence as you. The target makes a Wisdom savi |
| 5 | Seeming | Bard, Sorcerer, Wizard | You give an illusory appearance to each creature of your choice that you can see within range. An unwilling target can m |
| 5 | Telepathic Bond | Bard, Wizard | You forge a telepathic link among up to eight willing creatures of your choice within range, psychically linking each cr |
| 5 | Teleportation Circle | Bard, Sorcerer, Warlock, Wizard | As you cast the spell, you draw a 5-foot-radius circle on the ground inscribed with sigils that link your location to a  |
| 5 | Tree Stride | Druid, Ranger | You gain the ability to enter a tree and move from inside it to inside another tree of the same kind within 500 feet. Bo |
| 6 | Contingency | Wizard | Choose a spell of level 5 or lower that you can cast, that has a casting time of an action, and that can target you. You |
| 6 | Create Undead | Cleric, Warlock, Wizard | You can cast this spell only at night. Choose up to three corpses of Medium or Small Humanoids within range. Each one be |
| 6 | Find the Path | Bard, Cleric, Druid | You magically sense the most direct physical route to a location you name. You must be familiar with the location, and t |
| 6 | Forbiddance | Cleric | You create a ward against magical travel that protects up to 40,000 square feet of floor space to a height of 30 feet ab |
| 6 | Guards and Wards | Bard, Wizard | You create a ward that protects up to 2,500 square feet of floor space. The warded area can be up to 20 feet tall, and y |
| 6 | Heroes’ Feast | Bard, Cleric, Druid | You conjure a feast that appears on a surface in an unoccupied 10-foot Cube next to you. The feast takes 1 hour to consu |
| 6 | Instant Summons | Wizard | You touch the sapphire used in the casting and an object weighing 10 pounds or less whose longest dimension is 6 feet or |
| 6 | Magic Jar | Wizard | Your body falls into a catatonic state as your soul leaves it and enters the container you used for the spell’s Material |
| 6 | Move Earth | Druid, Sorcerer, Wizard | Choose an area of terrain no larger than 40 feet on a side within range. You can reshape dirt, sand, or clay in the area |
| 6 | Planar Ally | Cleric | You beseech an otherworldly entity for aid. The being must be known to you: a god, a demon prince, or some other being o |
| 6 | Programmed Illusion | Bard, Wizard | You create an illusion of an object, a creature, or some other visible phenomenon within range that activates when a spe |
| 6 | Transport via Plants | Druid | This spell creates a magical link between a Large or larger inanimate plant within range and another plant, at any dista |
| 6 | True Seeing | Bard, Cleric, Sorcerer, Warlock, Wizard | For the duration, the willing creature you touch has Truesight with a range of 120 feet. |
| 6 | Wind Walk | Druid | You and up to ten willing creatures of your choice within range assume gaseous forms for the duration, appearing as wisp |
| 6 | Word of Recall | Cleric | You and up to five willing creatures within 5 feet of you instantly teleport to a previously designated sanctuary. You a |
| 7 | Etherealness | Bard, Cleric, Sorcerer, Warlock, Wizard | You step into the border regions of the Ethereal Plane, where it overlaps with your current plane. You remain in the Bor |
| 7 | Magnificent Mansion | Bard, Wizard | You conjure a shimmering door in range that lasts for the duration. The door leads to an extradimensional dwelling and i |
| 7 | Mirage Arcane | Bard, Druid, Wizard | You make terrain in an area up to 1 mile square look, sound, smell, and even feel like some other sort of terrain. Open  |
| 7 | Project Image | Bard, Wizard | You create an illusory copy of yourself that lasts for the duration. The copy can appear at any location within range th |
| 7 | Resurrection | Bard, Cleric | With a touch, you revive a dead creature that has been dead for no more than a century, didn’t die of old age, and wasn’ |
| 7 | Sequester | Wizard | With a touch, you magically sequester an object or a willing creature. For the duration, the target has the Invisible co |
| 7 | Simulacrum | Wizard | You create a simulacrum of one Beast or Humanoid that is within 10 feet of you for the entire casting of the spell. You  |
| 7 | Symbol | Bard, Cleric, Druid, Wizard | You inscribe a harmful glyph either on a surface (such as a section of floor or wall) or within an object that can be cl |
| 7 | Teleport | Bard, Sorcerer, Wizard | This spell instantly transports you and up to eight willing creatures that you can see within range, or a single object  |
| 8 | Animal Shapes | Druid | Choose any number of willing creatures that you can see within range. Each target shape-shifts into a Large or smaller B |
| 8 | Antipathy/Sympathy | Bard, Druid, Wizard | As you cast the spell, choose whether it creates antipathy or sympathy, and target one creature or object that is Huge o |
| 8 | Clone | Wizard | You touch a creature or at least 1 cubic inch of its flesh. An inert duplicate of that creature forms inside the vessel  |
| 8 | Control Weather | Cleric, Druid, Wizard | You take control of the weather within 5 miles of you for the duration. You must be outdoors to cast this spell, and it  |
| 8 | Demiplane | Sorcerer, Warlock, Wizard | You create a shadowy Medium door on a flat solid surface that you can see within range. This door can be opened and clos |
| 8 | Glibness | Bard, Warlock | Until the spell ends, when you make a Charisma check, you can replace the number you roll with a 15. Additionally, no ma |
| 8 | Tsunami | Druid | A wall of water springs into existence at a point you choose within range. You can make the wall up to 300 feet long, 30 |
| 9 | Astral Projection | Cleric, Warlock, Wizard | You and up to eight willing creatures within range project your astral bodies into the Astral Plane (the spell ends inst |
| 9 | Gate | Cleric, Sorcerer, Warlock, Wizard | You conjure a portal linking an unoccupied space you can see within range to a precise location on a different plane of  |
| 9 | True Resurrection | Cleric, Druid | You touch a creature that has been dead for no longer than 200 years and that died for any reason except old age. The cr |
| 9 | Wish | Sorcerer, Wizard | Wish is the mightiest spell a mortal can cast. By simply speaking aloud, you can alter reality itself.   The basic use o |

### 효과 있음 (원문과 한 줄씩 대조 필요: 손으로 짠 sr_* 외에는 종류별 틀로 근사)

| 레벨 | 주문 | 코드 | 직업 칸에 있음 |
|---|---|---|---|
| 0 | Acid Splash | sp_acid_splash | — |
| 0 | Chill Touch | sp_chill_touch sx_s_chill_touch | Warlock |
| 0 | Eldritch Blast | sr_eb | Warlock |
| 0 | Fire Bolt | sr_firebolt | Sorcerer |
| 0 | Poison Spray | sp_poison_spray sx_s_poison_spray | — |
| 0 | Produce Flame | sr_pflame | Druid |
| 0 | Ray of Frost | sr_rof | Wizard |
| 0 | Resistance | sp_resistance | — |
| 0 | Sacred Flame | sr_sflame | Cleric |
| 0 | Shillelagh | sp_shillelagh | — |
| 0 | Shocking Grasp | sp_shocking_grasp | Sorcerer, Wizard |
| 0 | Sorcerous Burst | sp_sorcerous_burst | Sorcerer |
| 0 | Spare the Dying | sp_spare_the_dying | — |
| 0 | Starry Wisp | sp_starry_wisp | Druid |
| 0 | True Strike | sp_true_strike | — |
| 0 | Vicious Mockery | sr_mock | Bard |
| 1 | Animal Friendship | sp_animal_friendship | — |
| 1 | Bane | sp_bane | Cleric, Warlock |
| 1 | Bless | sr_bless | Cleric, Paladin |
| 1 | Burning Hands | sp_burning_hands | Sorcerer, Wizard |
| 1 | Charm Person | sp_charm_person | Bard |
| 1 | Chromatic Orb | sr_chroma | Sorcerer |
| 1 | Color Spray | sp_color_spray | — |
| 1 | Command | sp_command | Cleric, Paladin |
| 1 | Cure Wounds | sr_cure | Bard, Cleric, Druid, Paladin, Ranger |
| 1 | Detect Magic | x_detect | Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard |
| 1 | Dissonant Whispers | sr_whisper | Bard |
| 1 | Divine Favor | sp_divine_favor | Paladin |
| 1 | Divine Smite | sr_smite | Paladin |
| 1 | Ensnaring Strike | sr_ensnare | Ranger |
| 1 | Entangle | sr_entangle | Druid, Ranger |
| 1 | Expeditious Retreat | sp_expeditious_retreat | Warlock |
| 1 | Faerie Fire | sr_faerie | Bard, Druid |
| 1 | False Life | sp_false_life sx_s_false_life | — |
| 1 | Fog Cloud | sp_fog_cloud | — |
| 1 | Goodberry | x_berry | Druid, Ranger |
| 1 | Grease | sp_grease | — |
| 1 | Guiding Bolt | sr_gbolt | Cleric |
| 1 | Healing Word | sr_hword | Bard, Cleric, Druid |
| 1 | Hellish Rebuke | sr_rebuke (반응) | — |
| 1 | Heroism | sp_heroism | — |
| 1 | Hex | sr_hex | Warlock |
| 1 | Hideous Laughter | sp_hideous_laughter | Bard, Warlock |
| 1 | Hunter’s Mark | sr_hmark | Ranger |
| 1 | Ice Knife | sp_ice_knife | — |
| 1 | Inflict Wounds | sp_inflict_wounds | Cleric |
| 1 | Jump | sp_jump | — |
| 1 | Longstrider | sp_longstrider sx_s_longstrider | — |
| 1 | Mage Armor | sp_mage_armor | Wizard |
| 1 | Magic Missile | sr_mm | Wizard |
| 1 | Protection from Evil and Good | sp_protection_from_evil_and_good | — |
| 1 | Ray of Sickness | sp_ray_of_sickness sx_s_ray_of_sickness | Sorcerer |
| 1 | Sanctuary | sp_sanctuary | — |
| 1 | Searing Smite | sr_searing | Paladin |
| 1 | Shield | sr_shield (반응) | — |
| 1 | Shield of Faith | sr_sof | Cleric, Paladin |
| 1 | Sleep | sr_sleep | Bard, Sorcerer, Wizard |
| 1 | Thunderwave | sr_tw | Bard, Druid |
| 2 | Acid Arrow | sp_acid_arrow | — |
| 2 | Aid | sp_aid | Cleric, Paladin |
| 2 | Barkskin | sp_barkskin | Druid, Ranger |
| 2 | Blindness/Deafness | sp_blindness_deafness | — |
| 2 | Blur | sp_blur | Sorcerer |
| 2 | Calm Emotions | sp_calm_emotions | — |
| 2 | Darkness | sr_dark | Warlock |
| 2 | Dragon’s Breath | sp_dragons_breath | Sorcerer |
| 2 | Enhance Ability | sp_enhance_ability | — |
| 2 | Enlarge/Reduce | sp_enlarge_reduce | — |
| 2 | Enthrall | sp_enthrall | — |
| 2 | Find Traps | x_traps | Cleric, Druid, Ranger |
| 2 | Flame Blade | sp_flame_blade | — |
| 2 | Flaming Sphere | sp_flaming_sphere | Druid |
| 2 | Gust of Wind | sp_gust_of_wind | — |
| 2 | Heat Metal | sp_heat_metal | — |
| 2 | Hold Person | sr_hold | Bard, Cleric, Warlock, Wizard |
| 2 | Invisibility | sp_invisibility | Bard, Warlock, Wizard |
| 2 | Lesser Restoration | sp_lesser_restoration | Cleric |
| 2 | Levitate | sp_levitate | — |
| 2 | Magic Weapon | sp_magic_weapon | Paladin |
| 2 | Mind Spike | sp_mind_spike | Warlock |
| 2 | Mirror Image | sp_mirror_image | Bard, Sorcerer, Warlock |
| 2 | Misty Step | sr_misty | Sorcerer, Warlock, Wizard |
| 2 | Moonbeam | sr_moon | Druid |
| 2 | Pass without Trace | x_pass | Druid, Ranger |
| 2 | Phantasmal Force | sp_phantasmal_force | — |
| 2 | Prayer of Healing | x_prayer | Cleric, Paladin |
| 2 | Protection from Poison | sp_protection_from_poison | — |
| 2 | Ray of Enfeeblement | sp_ray_of_enfeeblement sx_s_ray_of_enfeeblement | Warlock |
| 2 | Scorching Ray | sr_sray | Sorcerer, Wizard |
| 2 | Shatter | sr_shatter | Bard, Sorcerer, Wizard |
| 2 | Shining Smite | sp_shining_smite | Paladin |
| 2 | Spike Growth | sr_spike | Druid, Ranger |
| 2 | Spiritual Weapon | sr_sweapon | Cleric |
| 2 | Suggestion | sp_suggestion | — |
| 2 | Warding Bond | sp_warding_bond | — |
| 2 | Web | sr_web | Sorcerer, Wizard |
| 3 | Animate Dead | sp_animate_dead | — |
| 3 | Beacon of Hope | sp_beacon_of_hope | Cleric |
| 3 | Bestow Curse | sp_bestow_curse | — |
| 3 | Blink | sp_blink | — |
| 3 | Call Lightning | sr_call | Druid |
| 3 | Clairvoyance | x_clair | Bard, Cleric, Sorcerer, Wizard |
| 3 | Conjure Animals | sp_conjure_animals | Druid, Ranger |
| 3 | Counterspell | sp_counterspell | — |
| 3 | Dispel Magic | sp_dispel_magic | — |
| 3 | Fear | sr_fear | Bard, Warlock |
| 3 | Fireball | sr_fireball | Sorcerer, Wizard |
| 3 | Fly | sp_fly | — |
| 3 | Haste | sr_haste | Sorcerer, Wizard |
| 3 | Hypnotic Pattern | sr_hypno | Bard, Sorcerer, Warlock, Wizard |
| 3 | Lightning Bolt | sr_lbolt | Sorcerer, Wizard |
| 3 | Mass Healing Word | sr_mhw | Bard, Cleric |
| 3 | Plant Growth | sp_plant_growth | — |
| 3 | Protection from Energy | sp_protection_from_energy | — |
| 3 | Remove Curse | sp_remove_curse | — |
| 3 | Revivify | sr_revive | Cleric, Druid, Paladin, Ranger |
| 3 | Sleet Storm | sp_sleet_storm | Druid |
| 3 | Slow | sr_slow wm_slow | Bard, Wizard |
| 3 | Spirit Guardians | sr_guard | Cleric |
| 3 | Stinking Cloud | sp_stinking_cloud | — |
| 3 | Tiny Hut | x_hut | Bard, Wizard |
| 3 | Vampiric Touch | sr_vtouch | Warlock |
| 3 | Wind Wall | sp_wind_wall | Ranger |
| 4 | Arcane Eye | x_eye | Wizard |
| 4 | Aura of Life | sp_aura_of_life | — |
| 4 | Banishment | sp_banishment | Cleric, Paladin, Warlock, Wizard |
| 4 | Black Tentacles | sp_black_tentacles | — |
| 4 | Blight | sp_blight | Druid, Warlock |
| 4 | Charm Monster | sp_charm_monster | — |
| 4 | Compulsion | sp_compulsion | — |
| 4 | Confusion | sp_confusion | Bard |
| 4 | Conjure Minor Elementals | sp_conjure_minor_elementals | — |
| 4 | Conjure Woodland Beings | sp_conjure_woodland_beings | Ranger |
| 4 | Death Ward | sp_death_ward | Cleric, Paladin |
| 4 | Dimension Door | sp_dimension_door | Warlock |
| 4 | Dominate Beast | sp_dominate_beast | — |
| 4 | Faithful Hound | sp_faithful_hound | — |
| 4 | Fire Shield | sp_fire_shield | — |
| 4 | Freedom of Movement | sp_freedom_of_movement | — |
| 4 | Giant Insect | sp_giant_insect | — |
| 4 | Greater Invisibility | sp_greater_invisibility | Bard, Sorcerer |
| 4 | Guardian of Faith | sp_guardian_of_faith | Cleric |
| 4 | Ice Storm | sr_ice | Druid, Sorcerer, Wizard |
| 4 | Phantasmal Killer | sp_phantasmal_killer | — |
| 4 | Polymorph | sp_polymorph | Bard, Druid |
| 4 | Resilient Sphere | sp_resilient_sphere | — |
| 4 | Stoneskin | sp_stoneskin | Ranger |
| 4 | Vitriolic Sphere | sp_vitriolic_sphere | — |
| 4 | Wall of Fire | sp_wall_of_fire | Druid, Sorcerer, Wizard |
| 5 | Animate Objects | sp_animate_objects | — |
| 5 | Antilife Shell | sp_antilife_shell | — |
| 5 | Arcane Hand | sp_arcane_hand | — |
| 5 | Cloudkill | sp_cloudkill | Sorcerer |
| 5 | Cone of Cold | sr_cone | Druid, Sorcerer, Wizard |
| 5 | Conjure Elemental | sp_conjure_elemental | — |
| 5 | Contagion | sp_contagion | — |
| 5 | Dispel Evil and Good | sp_dispel_evil_and_good | — |
| 5 | Dominate Person | sp_dominate_person | — |
| 5 | Flame Strike | sp_flame_strike | Cleric |
| 5 | Greater Restoration | sp_greater_restoration | — |
| 5 | Hold Monster | sp_hold_monster | Bard, Sorcerer, Warlock, Wizard |
| 5 | Insect Plague | sp_insect_plague | Druid |
| 5 | Mass Cure Wounds | sp_mass_cure_wounds | Bard, Cleric, Druid |
| 5 | Mislead | sp_mislead | — |
| 5 | Modify Memory | sp_modify_memory | — |
| 5 | Summon Dragon | sp_summon_dragon | — |
| 5 | Telekinesis | sp_telekinesis | — |
| 5 | Wall of Force | sp_wall_of_force | — |
| 5 | Wall of Stone | sp_wall_of_stone | — |
| 6 | Blade Barrier | sp_blade_barrier | Cleric |
| 6 | Chain Lightning | sr_chain | Sorcerer, Wizard |
| 6 | Circle of Death | sp_circle_of_death | Warlock |
| 6 | Conjure Fey | sp_conjure_fey | — |
| 6 | Disintegrate | sp_disintegrate | Sorcerer, Wizard |
| 6 | Eyebite | sp_eyebite | Warlock |
| 6 | Flesh to Stone | sp_flesh_to_stone | — |
| 6 | Freezing Sphere | sp_freezing_sphere | — |
| 6 | Globe of Invulnerability | sp_globe_of_invulnerability | — |
| 6 | Harm | sp_harm | Cleric |
| 6 | Heal | sp_heal | Cleric, Druid |
| 6 | Irresistible Dance | sp_irresistible_dance | Bard |
| 6 | Mass Suggestion | sp_mass_suggestion | Bard |
| 6 | Sunbeam | sp_sunbeam | Druid |
| 6 | Wall of Ice | sp_wall_of_ice | — |
| 6 | Wall of Thorns | sp_wall_of_thorns | — |
| 7 | Arcane Sword | sp_arcane_sword | — |
| 7 | Conjure Celestial | sp_conjure_celestial | — |
| 7 | Delayed Blast Fireball | sp_delayed_blast_fireball | Sorcerer |
| 7 | Divine Word | sp_divine_word | — |
| 7 | Finger of Death | sp_finger_of_death | Warlock, Wizard |
| 7 | Fire Storm | sp_fire_storm | Cleric, Druid |
| 7 | Forcecage | sp_forcecage | Warlock |
| 7 | Plane Shift | sp_plane_shift | — |
| 7 | Prismatic Spray | sp_prismatic_spray | — |
| 7 | Regenerate | sp_regenerate | — |
| 7 | Reverse Gravity | sp_reverse_gravity | — |
| 8 | Antimagic Field | sp_antimagic_field | — |
| 8 | Befuddlement | sp_befuddlement | — |
| 8 | Dominate Monster | sp_dominate_monster | — |
| 8 | Earthquake | sp_earthquake | Druid |
| 8 | Holy Aura | sp_holy_aura | — |
| 8 | Incendiary Cloud | sp_incendiary_cloud | Sorcerer |
| 8 | Maze | sp_maze | — |
| 8 | Mind Blank | sp_mind_blank | — |
| 8 | Power Word Stun | sp_power_word_stun | Bard, Warlock |
| 8 | Sunburst | sp_sunburst | Cleric |
| 9 | Foresight | sp_foresight | — |
| 9 | Imprisonment | sp_imprisonment | — |
| 9 | Mass Heal | sp_mass_heal | Cleric |
| 9 | Meteor Swarm | sr_meteor | Sorcerer, Wizard |
| 9 | Power Word Heal | sp_power_word_heal | Bard |
| 9 | Power Word Kill | sp_power_word_kill | Bard, Warlock, Wizard |
| 9 | Prismatic Wall | sp_prismatic_wall | — |
| 9 | Shapechange | sp_shapechange | Druid |
| 9 | Storm of Vengeance | sp_storm_of_vengeance | Druid |
| 9 | Time Stop | sp_time_stop | Wizard |
| 9 | True Polymorph | sp_true_polymorph | — |
| 9 | Weird | sp_weird | Warlock |

## 몬스터

게임에 있는 330종 (체력 · AC는 원문과 같다. 특성 · 행동은 원문 이름과 게임 공격 이름):

| 몬스터 | CR | 출현 | SRD 특성 | SRD 행동 | 게임 공격 |
|---|---|---|---|---|---|
| Aboleth | 10 | — | Amphibious, Eldritch Restoration, Mucus Cloud, Probing Telepathy | Multiattack, Tentacle, Consume Memories, Success: Half damage, Dominate Mind (2/Day), Lash, Psychic Drain | Tentacle |
| Air Elemental | 5 | O | Air Form | Multiattack, Thunderous Slam, Whirlwind (Recharge 4–6) | Thunderous Slam |
| Animated Armor | 1 | O |  | Multiattack, Slam | Slam |
| Animated Flying Sword | 1/4 | — |  | Slash | Slash |
| Animated Rug of Smothering | 2 | — |  | Smother | Smother |
| Ankheg | 2 | — | Tunneler | Bite, Acid Spray (Recharge 6) | Bite |
| Assassin | 8 | — | Evasion | Multiattack, Shortsword, Light Crossbow, Cunning Action | Shortsword, Light Crossbow |
| Awakened Shrub | 0 | — |  | Rake | Rake |
| Awakened Tree | 2 | O |  | Slam | Slam |
| Axe Beak | 1/4 | — |  | Beak | Beak |
| Azer Sentinel | 2 | — | Fire Aura, Illumination | Burning Hammer | Burning Hammer |
| Balor | 19 | O | Death Throes, Fire Aura, Legendary Resistance (3/Day), Magic Resistance | Multiattack, Flame Whip, Lightning Blade, Teleport | Flame Whip, Lightning Blade |
| Bandit | 1/8 | O |  | Scimitar, Light Crossbow | Scimitar, Light Crossbow |
| Bandit Captain | 2 | O |  | Multiattack, Scimitar, Pistol, Parry | Scimitar, Pistol |
| Barbed Devil | 5 | O | Barbed Hide, Diabolical Restoration, Magic Resistance | Multiattack, Claws, Tail, Hurl Flame | Claws, Tail, Hurl Flame |
| Basilisk | 3 | — |  | Bite, Petrifying Gaze (Recharge 4–6) | Bite |
| Bearded Devil | 3 | — | Magic Resistance | Multiattack, Beard, Infernal Glaive | Beard, Infernal Glaive |
| Behir | 11 | — |  | Multiattack, Bite, Constrict, Lightning Breath (Recharge 5–6), Swallow | Bite |
| Berserker | 2 | — | Bloodied Frenzy | Greataxe | Greataxe |
| Black Dragon Wyrmling | 2 | — | Amphibious | Multiattack, Rend, Acid Breath (Recharge 5–6) | Rend |
| Young Black Dragon | 7 | — | Amphibious | Multiattack, Rend, Acid Breath (Recharge 5–6) | Rend |
| Adult Black Dragon | 14 | — | Amphibious | Multiattack, Rend, Acid Breath (Recharge 5–6), Spellcasting, Cloud of Insects, Frightful Presence, Pounce | Rend |
| Ancient Black Dragon | 21 | — | Amphibious | Multiattack, Rend, Acid Breath (Recharge 5–6), Spellcasting, Cloud of Insects, Frightful Presence, Pounce | Rend |
| Black Pudding | 4 | O | Amorphous, Corrosive Form, Spider Climb | Dissolving Pseudopod, Split | Dissolving Pseudopod |
| Blink Dog | 1/4 | — |  | Bite, Teleport (Recharge 4–6) | Bite |
| Blue Dragon Wyrmling | 3 | — |  | Multiattack, Rend, Lightning Breath (Recharge 5–6) | Rend |
| Young Blue Dragon | 9 | — |  | Multiattack, Rend, Lightning Breath (Recharge 5–6) | Rend |
| Adult Blue Dragon | 16 | — |  | Multiattack, Rend, Lightning Breath (Recharge 5–6), Spellcasting, Cloaked Flight, Sonic Boom, Tail Swipe | Rend |
| Ancient Blue Dragon | 23 | — |  | Multiattack, Rend, Lightning Breath (Recharge 5–6), Spellcasting, Cloaked Flight, Sonic Boom, Tail Swipe | Rend |
| Bone Devil | 9 | O | Diabolical Restoration, Magic Resistance | Multiattack, Claw, Infernal Sting | Claw, Infernal Sting |
| Brass Dragon Wyrmling | 1 | — |  | Rend, Fire Breath (Recharge 5–6), Sleep Breath | Rend |
| Young Brass Dragon | 6 | — |  | Multiattack, Rend, Fire Breath (Recharge 5–6), Sleep Breath | Rend |
| Adult Brass Dragon | 13 | — |  | Multiattack, Rend, Fire Breath (Recharge 5–6), Sleep Breath, Spellcasting, Blazing Light, Pounce, Scorching Sands | Rend |
| Ancient Brass Dragon | 20 | — |  | Multiattack, Rend, Fire Breath (Recharge 5–6), Sleep Breath, Spellcasting, Blazing Light, Pounce, Scorching Sands | Rend |
| Bronze Dragon Wyrmling | 2 | — | Amphibious | Multiattack, Rend, Lightning Breath (Recharge 5–6), Repulsion Breath | Rend |
| Young Bronze Dragon | 8 | — | Amphibious | Multiattack, Rend, Lightning Breath (Recharge 5–6), Repulsion Breath | Rend |
| Adult Bronze Dragon | 15 | — | Amphibious | Multiattack, Rend, Lightning Breath (Recharge 5–6), Repulsion Breath, Spellcasting, Guiding Light, Pounce, Thunderclap | Rend |
| Ancient Bronze Dragon | 22 | — | Amphibious | Multiattack, Rend, Lightning Breath (Recharge 5–6), Repulsion Breath, Spellcasting, Guiding Light, Pounce, Thunderclap | Rend |
| Bugbear Stalker | 3 | — | Abduct | Multiattack, Javelin, Morningstar, Quick Grapple | Javelin, Morningstar |
| Bugbear Warrior | 1 | O | Abduct | Grab, Light Hammer | Grab, Light Hammer |
| Bulette | 5 | — |  | Multiattack, Bite, Deadly Leap, Leap | Bite |
| Centaur Trooper | 2 | — |  | Multiattack, Pike, Longbow, Trampling Charge (Recharge 5–6) | Pike, Longbow |
| Chain Devil | 8 | — | Diabolical Restoration, Magic Resistance | Multiattack, Chain, Conjure Infernal Chain, Unnerving Gaze | Chain |
| Chimera | 6 | — |  | Multiattack, Bite, Claw, Ram, Fire Breath (Recharge 5–6) | Ram, Bite, Claw |
| Chuul | 4 | — | Amphibious, Sense Magic | Multiattack, Pincer, Paralyzing Tentacles | Pincer |
| Clay Golem | 9 | — | Acid Absorption, Berserk, Immutable Form, Magic Resistance | Multiattack, Slam, Hasten (Recharge 5–6) | Slam |
| Cloaker | 8 | — | Light Sensitivity | Multiattack, Attach, Tail, Moan | Attach, Tail |
| Cloud Giant | 9 | — |  | Multiattack, Thunderous Mace, Thundercloud, Spellcasting, Misty Step | Thunderous Mace, Thundercloud |
| Cockatrice | 1/2 | — |  | Petrifying Bite | Petrifying Bite |
| Commoner | 0 | — | Training | Club | Club |
| Copper Dragon Wyrmling | 1 | — |  | Rend, Acid Breath (Recharge 5–6), Slowing Breath | Rend |
| Young Copper Dragon | 7 | — |  | Multiattack, Rend, Acid Breath (Recharge 5–6), Slowing Breath | Rend |
| Adult Copper Dragon | 14 | — |  | Multiattack, Rend, Acid Breath (Recharge 5–6), Slowing Breath, Spellcasting, Giggling Magic, Mind Jolt, Pounce | Rend |
| Ancient Copper Dragon | 21 | — |  | Multiattack, Rend, Acid Breath (Recharge 5–6), Slowing Breath, Spellcasting, Giggling Magic, Mind Jolt, Pounce | Rend |
| Couatl | 4 | — | Shielded Mind | Bite, Constrict, Spellcasting, Divine Aid (2/Day) | Bite |
| Swarm of Crawling Claws | 3 | — | Swarm | Swarm of Grasping Hands | Swarm of Grasping Hands |
| Cultist | 1/8 | — |  | Ritual Sickle | Ritual Sickle |
| Cultist Fanatic | 2 | — |  | Pact Blade, Spellcasting, Spiritual Weapon (2/Day) | Pact Blade |
| Darkmantle | 1/2 | — |  | Crush, Darkness Aura (1/Day) | Crush |
| Death Dog | 1 | — |  | Multiattack, Bite | Bite |
| Deva | 10 | — | Exalted Restoration, Magic Resistance | Multiattack, Holy Mace, Spellcasting, Divine Aid (2/Day) | Holy Mace |
| Djinni | 11 | — | Elemental Restoration, Magic Resistance, Wishes | Multiattack, Storm Blade, Storm Bolt, Create Whirlwind, Spellcasting | Storm Blade, Storm Bolt |
| Doppelganger | 3 | O |  | Multiattack, Slam, Read Thoughts, Unsettling Visage (Recharge 6), Shape-Shift | Slam |
| Dragon Turtle | 17 | — | Amphibious | Multiattack, Bite, Tail, Steam Breath (Recharge 5–6) | Bite, Tail |
| Dretch | 1/4 | O |  | Rend, Fetid Cloud (1/Day) | Rend |
| Drider | 6 | — | Spider Climb, Sunlight Sensitivity, Web Walker | Multiattack, Foreleg, Poison Burst, Magic of the Spider Queen (Recharge 5–6) | Foreleg, Poison Burst |
| Druid | 2 | — |  | Multiattack, Vine Staff, Verdant Wisp, Spellcasting | Vine Staff, Verdant Wisp |
| Dryad | 1 | — | Magic Resistance, Speak with Beasts and Plants | Multiattack, Vine Lash, Thorn Burst, Spellcasting, Tree Stride | Vine Lash, Thorn Burst |
| Earth Elemental | 5 | O | Earth Glide, Siege Monster | Multiattack, Slam, Rock Launch | Slam, Rock Launch |
| Efreeti | 11 | — | Elemental Restoration, Magic Resistance, Wishes | Multiattack, Heated Blade, Hurl Flame, Spellcasting | Heated Blade, Hurl Flame |
| Erinyes | 12 | — | Diabolical Restoration, Magic Resistance, Magic Rope | Multiattack, Withering Sword, Entangling Rope (Requires Magic Rope), Parry | Withering Sword |
| Ettercap | 2 | — | Spider Climb, Web Walker | Multiattack, Bite, Claw, Web Strand (Recharge 5–6), Reel | Bite, Claw |
| Ettin | 4 | — |  | Multiattack, Battleaxe, Morningstar | Battleaxe, Morningstar |
| Fire Elemental | 5 | — | Fire Aura, Fire Form, Illumination, Water Susceptibility | Multiattack, Burn | Burn |
| Fire Giant | 9 | — |  | Multiattack, Flame Sword, Hammer Throw | Flame Sword, Hammer Throw |
| Flesh Golem | 5 | — | Aversion to Fire, Berserk, Immutable Form, Lightning Absorption, Magic Resistance | Multiattack, Slam | Slam |
| Frost Giant | 8 | — |  | Multiattack, Frost Axe, Great Bow, War Cry (Recharge 5–6) | Frost Axe, Great Bow |
| Shrieker Fungus | 0 | — |  | Shriek |  |
| Violet Fungus | 1/4 | O |  | Multiattack, Rotting Touch | Rotting Touch |
| Gargoyle | 2 | O | Flyby | Multiattack, Claw | Claw |
| Gelatinous Cube | 2 | — | Ooze Cube, Transparent | Pseudopod, Engulf | Pseudopod |
| Ghast | 2 | — | Stench | Bite, Claw | Bite, Claw |
| Ghost | 4 | O | Ethereal Sight, Incorporeal Movement | Multiattack, Withering Touch, Etherealness, Horrific Visage, Possession (Recharge 6) | Withering Touch |
| Ghoul | 1 | O |  | Multiattack, Bite, Claw | Bite, Claw |
| Gibbering Mouther | 2 | — | Aberrant Ground, Gibbering | Bite, Blinding Spittle (Recharge 5–6) | Bite |
| Glabrezu | 9 | — | Demonic Restoration, Magic Resistance | Multiattack, Pincer, Pummel, Spellcasting | Pincer |
| Gladiator | 5 | — |  | Multiattack, Spear, Shield Bash, Parry | Spear |
| Gnoll Warrior | 1/2 | O |  | Rend, Bone Bow, Rampage (1/Day) | Rend, Bone Bow |
| Goblin Minion | 1/8 | O |  | Dagger, Nimble Escape | Dagger |
| Goblin Warrior | 1/4 | O |  | Scimitar, Shortbow, Nimble Escape | Scimitar, Shortbow |
| Goblin Boss | 1 | O |  | Multiattack, Scimitar, Shortbow, Nimble Escape, Redirect Attack | Scimitar, Shortbow |
| Gold Dragon Wyrmling | 3 | — | Amphibious | Multiattack, Rend, Fire Breath (Recharge 5–6), Weakening Breath | Rend |
| Young Gold Dragon | 10 | — | Amphibious | Multiattack, Rend, Fire Breath (Recharge 5–6), Weakening Breath | Rend |
| Adult Gold Dragon | 17 | — | Amphibious | Multiattack, Rend, Fire Breath (Recharge 5–6), Spellcasting, Weakening Breath, Banish, Guiding Light, Pounce | Rend |
| Ancient Gold Dragon | 24 | — | Amphibious | Multiattack, Rend, Fire Breath (Recharge 5–6), Spellcasting, Weakening Breath, Banish, Guiding Light, Pounce | Rend |
| Gorgon | 5 | — |  | Gore, Petrifying Breath (Recharge 5–6), Trample | Gore |
| Gray Ooze | 1/2 | O | Amorphous, Corrosive Form | Pseudopod | Pseudopod |
| Green Dragon Wyrmling | 2 | — | Amphibious | Multiattack, Rend, Poison Breath (Recharge 5–6) | Rend |
| Young Green Dragon | 8 | — | Amphibious | Multiattack, Rend, Poison Breath (Recharge 5–6) | Rend |
| Adult Green Dragon | 15 | — | Amphibious | Multiattack, Rend, Poison Breath (Recharge 5–6), Spellcasting, Mind Invasion, Noxious Miasma, Pounce | Rend |
| Ancient Green Dragon | 22 | — | Amphibious | Multiattack, Rend, Poison Breath (Recharge 5–6), Spellcasting, Mind Invasion, Noxious Miasma, Pounce | Rend |
| Green Hag | 3 | — | Amphibious, Coven Magic, Mimicry | Multiattack, Claw, Spellcasting | Claw |
| Grick | 2 | — |  | Multiattack, Beak, Tentacles | Beak, Tentacles |
| Griffon | 2 | — |  | Multiattack, Rend | Rend |
| Grimlock | 1/4 | — |  | Bone Cudgel | Bone Cudgel |
| Guardian Naga | 10 | — | Celestial Restoration | Multiattack, Bite, Poisonous Spittle, Spellcasting | Bite |
| Guard | 1/8 | — |  | Spear | Spear |
| Guard Captain | 4 | — |  | Multiattack, Javelin, Longsword | Javelin, Longsword |
| Half-Dragon | 5 | — | Draconic Origin | Multiattack, Claw, Dragon’s Breath (Recharge 5–6), Leap | Claw |
| Harpy | 1 | — |  | Claw, Luring Song | Claw |
| Hell Hound | 3 | — | Pack Tactics | Multiattack, Bite, Fire Breath (Recharge 5–6) | Bite |
| Hezrou | 8 | — | Demonic Restoration, Magic Resistance, Stench | Multiattack, Rend, Leap | Rend |
| Hill Giant | 5 | — |  | Multiattack, Tree Club, Trash Lob | Tree Club, Trash Lob |
| Hippogriff | 1 | — | Flyby | Multiattack, Rend | Rend |
| Hobgoblin Warrior | 1/2 | O | Pack Tactics | Longsword, Longbow | Longsword, Longbow |
| Hobgoblin Captain | 3 | O | Aura of Authority | Multiattack, Greatsword, Longbow | Greatsword, Longbow |
| Homunculus | 0 | — | Telepathic Bond | Bite | Bite |
| Horned Devil | 11 | O | Diabolical Restoration, Magic Resistance | Multiattack, Searing Fork, Hurl Flame, Infernal Tail | Searing Fork, Hurl Flame |
| Hydra | 8 | O | Hold Breath, Multiple Heads, Reactive Heads | Multiattack, Bite | Bite |
| Ice Devil | 14 | O | Diabolical Restoration, Magic Resistance | Multiattack, Ice Spear, Tail, Ice Wall (Recharge 6) | Ice Spear, Tail |
| Imp | 1 | O | Magic Resistance | Sting, Invisibility, Shape-Shift | Sting |
| Incubus | 4 | — | Succubus Form | Multiattack, Restless Touch, Spellcasting, Nightmare (Recharge 6) | Restless Touch |
| Invisible Stalker | 6 | — | Air Form, Invisibility | Multiattack, Wind Swipe, Vortex | Wind Swipe |
| Iron Golem | 16 | — | Fire Absorption, Immutable Form, Magic Resistance | Multiattack, Bladed Arm, Fiery Bolt, Poison Breath (Recharge 6) | Bladed Arm, Fiery Bolt |
| Knight | 3 | — |  | Multiattack, Greatsword, Heavy Crossbow, Parry | Greatsword, Heavy Crossbow |
| Kobold Warrior | 1/8 | — | Pack Tactics, Sunlight Sensitivity | Dagger | Dagger |
| Kraken | 23 | — | Amphibious, Siege Monster | Multiattack, Tentacle, Fling, Lightning Strike, Swallow, Storm Bolt, Toxic Ink | Tentacle |
| Lamia | 4 | — |  | Multiattack, Claw, Corrupting Touch, Spellcasting, Leap | Claw |
| Lemure | 0 | — | Hellish Restoration | Vile Slime | Vile Slime |
| Lich | 21 | — | Spirit Jar | Multiattack, Eldritch Burst, Paralyzing Touch, Spellcasting, Protective Magic, Deathly Teleport, Disrupt Life, Frightening Gaze | Eldritch Burst, Paralyzing Touch |
| Mage | 6 | O |  | Multiattack, Arcane Burst, Spellcasting, Misty Step (3/Day), Protective Magic (3/Day) | Arcane Burst |
| Archmage | 12 | — | Magic Resistance | Multiattack, Arcane Burst, Spellcasting, Misty Step (3/Day), Protective Magic (3/Day) | Arcane Burst |
| Magmin | 1/2 | — | Death Burst | Touch, Ignited Illumination | Touch |
| Manticore | 3 | — |  | Multiattack, Rend, Tail Spike | Rend, Tail Spike |
| Marilith | 16 | O | Demonic Restoration, Magic Resistance, Reactive | Multiattack, Pact Blade, Constrict, Teleport (Recharge 5–6), Parry | Pact Blade |
| Medusa | 6 | — |  | Multiattack, Claw, Snake Hair, Poison Ray, Petrifying Gaze (Recharge5–6) | Claw, Snake Hair, Poison Ray |
| Dust Mephit | 1/2 | — | Death Burst | Claw, Blinding Breath (Recharge 6), Sleep (1/Day) | Claw |
| Ice Mephit | 1/2 | — | Death Burst | Claw, Fog Cloud (1/Day), Frost Breath (Recharge 6) | Claw |
| Magma Mephit | 1/2 | — | Death Burst | Claw, Fire Breath (Recharge 6) | Claw |
| Steam Mephit | 1/4 | — | Blurred Form, Death Burst | Claw, Steam Breath (Recharge 6) | Claw |
| Merfolk Skirmisher | 1/8 | — | Amphibious | Ocean Spear | Ocean Spear |
| Merrow | 2 | — | Amphibious | Multiattack, Bite, Claw, Harpoon | Bite, Harpoon, Claw |
| Mimic | 2 | O | Adhesive (Object Form Only) | Bite, Pseudopod, Shape-Shift | Bite, Pseudopod |
| Minotaur of Baphomet | 3 | — |  | Abyssal Glaive, Gore (Recharge 5–6) | Abyssal Glaive, Gore |
| Mummy | 3 | — |  | Multiattack, Rotting Fist, Dreadful Glare | Rotting Fist |
| Mummy Lord | 15 | — | Magic Resistance, Undead Restoration | Multiattack, Rotting Fist, Channel Negative Energy, Dreadful Glare, Spellcasting, Whirlwind of Sand, Dread Command, Glare, Necrotic Strike | Rotting Fist, Channel Negative Energy |
| Nalfeshnee | 13 | — | Demonic Restoration, Magic Resistance | Multiattack, Rend, Teleport, Horror Nimbus (Recharge 5–6), Pursuit | Rend |
| Night Hag | 5 | — | Coven Magic, Magic Resistance, Soul Bag | Multiattack, Claw, Spellcasting, Shape-Shift | Claw |
| Nightmare | 3 | — | Confer Fire Resistance, Illumination | Hooves, Ethereal Stride | Hooves |
| Noble | 1/8 | — |  | Rapier, Parry | Rapier |
| Ochre Jelly | 2 | O | Amorphous, Spider Climb | Pseudopod, Split | Pseudopod |
| Ogre | 2 | O |  | Greatclub, Javelin | Greatclub, Javelin |
| Oni | 7 | — | Regeneration | Multiattack, Claw, Nightmare Ray, Shape-Shift, Spellcasting, Invisibility | Claw, Nightmare Ray |
| Otyugh | 5 | — |  | Multiattack, Bite, Tentacle, Tentacle Slam | Bite, Tentacle |
| Owlbear | 3 | — |  | Multiattack, Rend | Rend |
| Pegasus | 2 | — |  | Hooves | Hooves |
| Phase Spider | 3 | — | Ethereal Sight, Spider Climb, Web Walker | Multiattack, Bite, Ethereal Jaunt | Bite |
| Pirate | 1 | — |  | Multiattack, Dagger, Enthralling Panache | Dagger |
| Pirate Captain | 6 | — |  | Multiattack, Rapier, Pistol, Captain’s Charm, Riposte | Rapier, Pistol |
| Pit Fiend | 20 | — | Diabolical Restoration, Fear Aura, Legendary Resistance (4/Day), Magic Resistance | Multiattack, Bite, Devilish Claw, Fiery Mace, Hellfire Spellcasting (Recharge 4–6) | Bite, Devilish Claw, Fiery Mace |
| Planetar | 16 | — | Divine Awareness, Exalted Restoration, Magic Resistance | Multiattack, Radiant Sword, Holy Burst, Spellcasting, Divine Aid (2/Day) | Radiant Sword |
| Priest Acolyte | 1/4 | O |  | Mace, Radiant Flame, Spellcasting, Divine Aid (1/Day) | Mace, Radiant Flame |
| Priest | 2 | O |  | Multiattack, Mace, Radiant Flame, Spellcasting, Divine Aid (3/Day) | Mace, Radiant Flame |
| Pseudodragon | 1/4 | — | Magic Resistance | Multiattack, Bite, Sting | Bite |
| Purple Worm | 15 | — | Tunneler | Multiattack, Bite, Tail Stinger, Swallow | Bite, Tail Stinger |
| Quasit | 1 | — | Magic Resistance | Rend, Invisibility, Scare (1/Day), Shape-Shift | Rend |
| Rakshasa | 13 | — | Greater Magic Resistance, Fiendish Restoration | Multiattack, Cursed Touch, Baleful Command (Recharge 5–6), Spellcasting | Cursed Touch |
| Red Dragon Wyrmling | 4 | — |  | Multiattack, Rend, Fire Breath (Recharge 5–6) | Rend |
| Young Red Dragon | 10 | — |  | Multiattack, Rend, Fire Breath (Recharge 5–6) | Rend |
| Adult Red Dragon | 17 | — |  | Multiattack, Rend, Fire Breath (Recharge 5–6), Spellcasting, Commanding Presence, Fiery Rays, Pounce | Rend |
| Ancient Red Dragon | 24 | — |  | Multiattack, Rend, Fire Breath (Recharge 5–6), Spellcasting, Commanding Presence, Fiery Rays, Pounce | Rend |
| Remorhaz | 11 | — | Heat Aura | Bite, Swallow | Bite |
| Roc | 11 | O |  | Multiattack, Beak, Talons, Swoop (Recharge 5–6) | Beak, Talons |
| Roper | 5 | — | Spider Climb | Multiattack, Bite, Tentacle, Reel | Bite |
| Rust Monster | 1/2 | — | Iron Scent | Multiattack, Bite, Antennae, Destroy Metal, Reflexive Antennae | Bite |
| Sahuagin Warrior | 1/2 | — | Blood Frenzy, Limited Amphibiousness, Shark Telepathy | Multiattack, Claw, Aquatic Charge | Claw |
| Salamander | 5 | — | Fire Aura | Multiattack, Flame Spear, Constrict | Flame Spear |
| Satyr | 1/2 | — | Magic Resistance | Hooves, Mockery | Hooves |
| Scout | 1/2 | — |  | Multiattack, Shortsword, Longbow | Shortsword, Longbow |
| Sea Hag | 2 | — | Amphibious, Coven Magic, Vile Appearance | Claw, Death Glare (Recharge 5–6), Illusory Appearance | Claw |
| Shadow | 1/2 | — | Amorphous, Sunlight Weakness | Draining Swipe, Shadow Stealth | Draining Swipe |
| Shambling Mound | 5 | O | Lightning Absorption | Multiattack, Charged Tendril, Engulf | Charged Tendril |
| Shield Guardian | 7 | — | Bound, Regeneration, Spell Storing | Multiattack, Fist, Protection | Fist |
| Silver Dragon Wyrmling | 2 | — |  | Multiattack, Rend, Cold Breath (Recharge 5–6), Paralyzing Breath | Rend |
| Young Silver Dragon | 9 | — |  | Multiattack, Rend, Cold Breath (Recharge 5–6), Paralyzing Breath | Rend |
| Adult Silver Dragon | 16 | — |  | Multiattack, Rend, Cold Breath (Recharge 5–6), Paralyzing Breath, Spellcasting, Chill, Cold Gale, Pounce | Rend |
| Ancient Silver Dragon | 23 | — |  | Multiattack, Rend, Cold Breath (Recharge 5–6), Paralyzing Breath, Spellcasting, Chill, Cold Gale, Pounce | Rend |
| Skeleton | 1/4 | O |  | Shortsword, Shortbow | Shortsword, Shortbow |
| Warhorse Skeleton | 1/2 | — |  | Hooves | Hooves |
| Minotaur Skeleton | 2 | O |  | Gore, Slam | Gore, Slam |
| Solar | 21 | — | Divine Awareness, Exalted Restoration, Legendary Resistance (4/Day), Magic Resistance | Multiattack, Flying Sword, Slaying Bow, Spellcasting, Divine Aid (3/Day), Blinding Gaze, Radiant Teleport | Flying Sword |
| Specter | 1 | — | Incorporeal Movement, Sunlight Sensitivity | Life Drain | Life Drain |
| Sphinx of Wonder | 1 | — | Magic Resistance | Rend, Burst of Ingenuity (2/Day) | Rend |
| Sphinx of Lore | 11 | — | Inscrutable | Multiattack, Claw, Mind-Rending Roar (Recharge 5–6), Spellcasting, Arcane Prowl, Weight of Years | Claw |
| Sphinx of Valor | 17 | — | Inscrutable | Multiattack, Claw, Roar (3/Day), First Roar, Spellcasting, Arcane Prowl, Weight of Years | Claw |
| Spirit Naga | 8 | — | Fiendish Restoration | Multiattack, Bite, Necrotic Ray, Spellcasting | Bite, Necrotic Ray |
| Sprite | 1/4 | — |  | Needle Sword, Enchanting Bow, Heart Sight, Invisibility | Needle Sword, Enchanting Bow |
| Spy | 1 | — |  | Shortsword, Hand Crossbow, Cunning Action | Shortsword, Hand Crossbow |
| Stirge | 1/8 | O |  | Proboscis | Proboscis |
| Stone Giant | 7 | — |  | Multiattack, Stone Club, Boulder, Deflect Missile (Recharge 5–6) | Stone Club, Boulder |
| Stone Golem | 10 | O | Immutable Form, Magic Resistance | Multiattack, Slam, Force Bolt, Slow (Recharge 5–6) | Slam, Force Bolt |
| Storm Giant | 13 | — | Amphibious | Multiattack, Storm Sword, Thunderbolt, Lightning Storm (Recharge 5–6), Spellcasting | Storm Sword, Thunderbolt |
| Succubus | 4 | — | Incubus Form | Multiattack, Fiendish Touch, Charm, Draining Kiss, Shape-Shift | Fiendish Touch |
| Tarrasque | 30 | — | Legendary Resistance (6/Day), Magic Resistance, Reflective Carapace, Siege Monster | Multiattack, Bite, Claw, Tail, Thunderous Bellow (Recharge 5–6), Swallow, Onslaught, World-Shaking Movement | Bite, Claw, Tail |
| Tough | 1/2 | O | Pack Tactics | Mace, Heavy Crossbow | Mace, Heavy Crossbow |
| Tough Boss | 4 | O | Pack Tactics | Multiattack, Warhammer, Heavy Crossbow | Warhammer, Heavy Crossbow |
| Treant | 9 | O | Siege Monster | Multiattack, Slam, Hail of Bark, Animate Trees (1/Day) | Slam, Hail of Bark |
| Troll | 5 | O | Loathsome Limbs (4/Day), Regeneration | Multiattack, Rend, Charge | Rend |
| Troll Limb | 1/2 | — | Regeneration, Troll Spawn | Rend | Rend |
| Unicorn | 5 | — | Legendary Resistance (3/Day), Magic Resistance | Multiattack, Hooves, Radiant Horn, Spellcasting, Unicorn’s Blessing (3/Day), Charging Horn, Shimmering Shield | Hooves, Radiant Horn |
| Vampire Familiar | 3 | — | Vampiric Connection | Multiattack, Umbral Dagger, Deathless Agility | Umbral Dagger |
| Vampire Spawn | 5 | O | Spider Climb, Vampire Weakness, Forbiddance | Multiattack, Claw, Bite, Deathless Agility | Claw |
| Vampire | 13 | — | Misty Escape, Spider Climb, Vampire Weakness, Forbiddance | Multiattack (Vampire Form Only), Grave Strike (Vampire Form Only), Bite (Bat or Vampire Form Only), Charm (Recharge 5–6), Shape-Shift, Beguile, Deathless Strike | Grave Strike |
| Vrock | 6 | — | Demonic Restoration, Magic Resistance | Multiattack, Shred, Spores (Recharge 6), Stunning Screech (1/Day) | Shred |
| Warrior Infantry | 1/8 | — | Pack Tactics | Spear | Spear |
| Warrior Veteran | 3 | — |  | Multiattack, Greatsword, Heavy Crossbow, Parry | Greatsword, Heavy Crossbow |
| Water Elemental | 5 | — | Freeze, Water Form | Multiattack, Slam, Whelm (Recharge 4–6) | Slam |
| Werebear | 5 | — |  | Multiattack, Bite (Bear or Hybrid Form Only), Handaxe (Humanoid or Hybrid Form Only), Rend (Bear or Hybrid Form Only), Shape-Shift | Handaxe, Bite, Rend |
| Wereboar | 4 | — |  | Multiattack, Gore (Boar or Hybrid Form Only), Javelin (Humanoid or Hybrid Form Only), Tusk (Boar or Hybrid Form Only), Shape-Shift | Javelin, Gore, Tusk |
| Wererat | 2 | — |  | Multiattack, Bite (Rat or Hybrid Form Only), Scratch, Shape-Shift | Scratch, Hand Crossbow, Bite |
| Weretiger | 4 | — |  | Multiattack, Bite (Tiger or Hybrid Form Only), Scratch, Longbow (Humanoid or Hybrid Form Only), Prowl (Tiger or Hybrid Form Only), Shape-Shift | Scratch, Longbow, Bite |
| Werewolf | 3 | — | Pack Tactics | Multiattack, Bite (Wolf or Hybrid Form Only), Scratch, Longbow (Humanoid or Hybrid Form Only), Shape-Shift | Scratch, Longbow, Bite |
| White Dragon Wyrmling | 2 | — | Ice Walk | Multiattack, Rend, Cold Breath (Recharge 5–6) | Rend |
| Young White Dragon | 6 | — | Ice Walk | Multiattack, Rend, Cold Breath (Recharge 5–6) | Rend |
| Adult White Dragon | 13 | — | Ice Walk | Multiattack, Rend, Cold Breath (Recharge 5–6), Freezing Burst, Frightful Presence, Pounce | Rend |
| Ancient White Dragon | 20 | — | Ice Walk | Multiattack, Rend, Cold Breath (Recharge 5–6), Freezing Burst, Frightful Presence, Pounce | Rend |
| Wight | 3 | O | Sunlight Sensitivity | Multiattack, Necrotic Sword, Necrotic Bow, Life Drain | Necrotic Sword, Necrotic Bow |
| Will-o’-Wisp | 2 | O | Ephemeral, Illumination, Incorporeal Movement | Shock, Consume Life, Vanish | Shock |
| Winter Wolf | 3 | — | Pack Tactics | Bite, Cold Breath (Recharge 5–6) | Bite |
| Worg | 1/2 | O |  | Bite | Bite |
| Wraith | 5 | O | Incorporeal Movement, Sunlight Sensitivity | Life Drain, Create Specter | Life Drain |
| Wyvern | 6 | — |  | Multiattack, Bite, Sting | Bite, Sting |
| Xorn | 5 | — | Earth Glide, Treasure Sense | Multiattack, Bite, Claw, Charge | Bite, Claw |
| Zombie | 1/4 | O | Undead Fortitude | Slam | Slam |
| Ogre Zombie | 2 | O | Undead Fortitude | Slam | Slam |
| Allosaurus | 2 | — |  | Bite, Claws | Bite, Claws |
| Ankylosaurus | 3 | — |  | Multiattack, Tail | Tail |
| Ape | 1/2 | — |  | Multiattack, Fist, Rock (Recharge 6) | Fist, Rock |
| Archelon | 4 | — | Amphibious | Multiattack, Bite | Bite |
| Baboon | 0 | — | Pack Tactics | Bite | Bite |
| Badger | 0 | — |  | Bite | Bite |
| Bat | 0 | — |  | Bite | Bite |
| Black Bear | 1/2 | — |  | Multiattack, Rend | Rend |
| Blood Hawk | 1/8 | — | Pack Tactics | Beak | Beak |
| Boar | 1/4 | — | Bloodied Fury | Gore | Gore |
| Brown Bear | 1 | O |  | Multiattack, Bite, Claw | Bite, Claw |
| Camel | 1/8 | — |  | Bite | Bite |
| Cat | 0 | — | Jumper | Scratch | Scratch |
| Constrictor Snake | 1/4 | — |  | Bite, Constrict | Bite |
| Crab | 0 | — | Amphibious | Claw | Claw |
| Crocodile | 1/2 | O | Hold Breath | Bite | Bite |
| Deer | 0 | — | Agile | Ram | Ram |
| Dire Wolf | 1 | O | Pack Tactics | Bite | Bite |
| Draft Horse | 1/4 | — |  | Hooves | Hooves |
| Eagle | 0 | — |  | Talons | Talons |
| Elephant | 4 | — |  | Multiattack, Gore, Trample | Gore |
| Elk | 1/4 | — |  | Ram | Ram |
| Flying Snake | 1/8 | — | Flyby | Bite | Bite |
| Frog | 0 | — | Amphibious, Standing Leap | Bite | Bite |
| Giant Ape | 7 | — |  | Multiattack, Fist, Boulder Toss (Recharge 6), Leap | Fist |
| Giant Badger | 1/4 | — |  | Bite | Bite |
| Giant Bat | 1/4 | — |  | Bite | Bite |
| Giant Boar | 2 | — | Bloodied Fury | Gore | Gore |
| Giant Centipede | 1/4 | — |  | Bite | Bite |
| Giant Constrictor Snake | 2 | O |  | Multiattack, Bite, Constrict | Bite |
| Giant Crab | 1/8 | — | Amphibious | Claw | Claw |
| Giant Crocodile | 5 | O | Hold Breath | Multiattack, Bite, Tail | Bite, Tail |
| Giant Eagle | 1 | — |  | Multiattack, Rend | Rend |
| Giant Elk | 2 | — |  | Ram | Ram |
| Giant Fire Beetle | 0 | — | Illumination | Bite | Bite |
| Giant Frog | 1/4 | O | Amphibious, Standing Leap | Bite, Swallow | Bite |
| Giant Goat | 1/2 | — |  | Ram | Ram |
| Giant Hyena | 1 | — |  | Bite, Rampage (1/Day) | Bite |
| Giant Lizard | 1/4 | — | Spider Climb | Bite | Bite |
| Giant Octopus | 1 | — | Water Breathing | Tentacles, Ink Cloud (1/Day) | Tentacles |
| Giant Owl | 1/4 | — | Flyby | Talons, Spellcasting | Talons |
| Giant Rat | 1/8 | O | Pack Tactics | Bite | Bite |
| Giant Scorpion | 3 | — |  | Multiattack, Claw, Sting | Claw, Sting |
| Giant Seahorse | 1/2 | — | Water Breathing | Ram, Bubble Dash | Ram |
| Giant Shark | 5 | — | Water Breathing | Multiattack, Bite | Bite |
| Giant Spider | 1 | O | Spider Climb, Web Walker | Bite, Web (Recharge 5–6) | Bite |
| Giant Toad | 1 | — | Amphibious, Standing Leap | Bite, Swallow | Bite |
| Giant Venomous Snake | 1/4 | — |  | Bite | Bite |
| Giant Vulture | 1 | — | Pack Tactics | Gouge | Gouge |
| Giant Wasp | 1/2 | — | Flyby | Sting | Sting |
| Giant Weasel | 1/8 | — |  | Bite | Bite |
| Giant Wolf Spider | 1/4 | — | Spider Climb | Bite | Bite |
| Goat | 0 | — |  | Ram | Ram |
| Hawk | 0 | — |  | Talons | Talons |
| Hippopotamus | 4 | — | Hold Breath | Multiattack, Bite | Bite |
| Hunter Shark | 2 | — | Water Breathing | Bite | Bite |
| Hyena | 0 | — | Pack Tactics | Bite | Bite |
| Jackal | 0 | — |  | Bite | Bite |
| Killer Whale | 3 | — | Hold Breath | Bite | Bite |
| Lion | 1 | — | Pack Tactics, Running Leap | Multiattack, Rend, Roar | Rend |
| Lizard | 0 | — | Spider Climb | Bite | Bite |
| Mammoth | 6 | — |  | Multiattack, Gore, Trample | Gore |
| Mastiff | 1/8 | — |  | Bite | Bite |
| Mule | 1/8 | — | Beast of Burden | Hooves | Hooves |
| Octopus | 0 | — | Compression, Water Breathing | Tentacles, Ink Cloud (1/Day) | Tentacles |
| Owl | 0 | — | Flyby | Talons | Talons |
| Panther | 1/4 | — |  | Rend, Nimble Escape | Rend |
| Piranha | 0 | — | Water Breathing | Bite | Bite |
| Plesiosaurus | 2 | — | Hold Breath | Bite | Bite |
| Polar Bear | 2 | — |  | Multiattack, Rend | Rend |
| Pony | 1/8 | — |  | Hooves | Hooves |
| Pteranodon | 1/4 | — | Flyby | Bite | Bite |
| Rat | 0 | — | Agile | Bite | Bite |
| Raven | 0 | — | Mimicry | Beak | Beak |
| Reef Shark | 1/2 | — | Pack Tactics, Water Breathing | Bite | Bite |
| Rhinoceros | 2 | — |  | Gore | Gore |
| Riding Horse | 1/4 | — |  | Hooves | Hooves |
| Saber-Toothed Tiger | 2 | — | Running Leap | Multiattack, Rend, Nimble Escape | Rend |
| Scorpion | 0 | — |  | Sting | Sting |
| Seahorse | 0 | — | Water Breathing | Bubble Dash |  |
| Spider | 0 | — | Spider Climb, Web Walker | Bite | Bite |
| Swarm of Bats | 1/4 | — | Swarm | Bites | Bites |
| Swarm of Insects | 1/2 | — | Spider Climb, Swarm | Bites | Bites |
| Swarm of Piranhas | 1 | — | Swarm, Water Breathing | Bites | Bites |
| Swarm of Rats | 1/4 | — | Swarm | Bites | Bites |
| Swarm of Ravens | 1/4 | — | Swarm | Beaks, Cacophony (Recharge 6) | Beaks |
| Swarm of Venomous Snakes | 2 | — | Swarm | Bites | Bites |
| Tiger | 1 | — |  | Rend, Nimble Escape | Rend |
| Triceratops | 5 | — |  | Multiattack, Gore | Gore |
| Tyrannosaurus Rex | 8 | — |  | Multiattack, Bite, Tail | Bite, Tail |
| Venomous Snake | 1/8 | O |  | Bite | Bite |
| Vulture | 0 | — | Pack Tactics | Beak | Beak |
| Warhorse | 1/2 | — |  | Hooves | Hooves |
| Weasel | 0 | — |  | Bite | Bite |
| Wolf | 1/4 | O | Pack Tactics | Bite | Bite |

없는 0종: 

## 마법 물건

| 물건 | 희귀도 | 상태 |
|---|---|---|
| Adamantine Armor | Uncommon | 효과 |
| Ammunition, +1, +2, or +3 | Uncommon | 팔기만 |
| Ammunition of Slaying | Very Rare | 효과 |
| Amulet of Health | Rare | 효과 |
| Amulet of Proof against Detection and Location | Uncommon | 팔기만 |
| Amulet of the Planes | Very Rare | 팔기만 |
| Animated Shield | Very Rare | 효과 |
| Apparatus of the Crab | Legendary | 팔기만 |
| Armor, +1, +2, or +3 | Medium, or Heavy), Rare (+1) | 효과 (Armor, +1 · +2 · +3 따로) |
| Armor of Invulnerability | Legendary | 효과 |
| Armor of Resistance | Medium, or Heavy), Rare (Requires Attunement) | 효과 |
| Armor of Vulnerability | Medium, or Heavy), Rare (Requires Attunement) | 효과 |
| Arrow-Catching Shield | Rare | 효과 |
| Bag of Beans | Rare | 팔기만 |
| Bag of Devouring | Very Rare | 팔기만 |
| Bag of Holding | Uncommon | 팔기만 |
| Bag of Tricks | Uncommon | 효과 |
| Bead of Force | Rare | 소모품 효과 |
| Bead of Nourishment | Common | 팔기만 |
| Belt of Dwarvenkind | Rare | 효과 |
| Belt of Giant Strength | Rarity Varies | 효과 |
| Berserker Axe | Greataxe, or Halberd), Rare (Requires Attunement) | 효과 |
| Boots of Elvenkind | Uncommon | 효과 |
| Boots of Levitation | Rare | 팔기만 |
| Boots of Speed | Rare | 효과 |
| Boots of Striding and Springing | Uncommon | 효과 |
| Boots of the Winterlands | Uncommon | 효과 |
| Bowl of Commanding Water Elementals | Rare | 효과 |
| Bracers of Archery | Uncommon | 효과 |
| Bracers of Defense | Rare | 효과 |
| Brazier of Commanding Fire Elementals | Rare | 효과 |
| Brooch of Shielding | Uncommon | 효과 |
| Broom of Flying | Uncommon | 효과 |
| Candle of Invocation | Very Rare | 팔기만 |
| Cape of the Mountebank | Rare | 효과 |
| Carpet of Flying | Very Rare | 효과 |
| Censer of Controlling Air Elementals | Rare | 효과 |
| Chime of Opening | Rare | 팔기만 |
| Circlet of Blasting | Uncommon | 효과 |
| Cloak of Arachnida | Very Rare | 효과 |
| Cloak of Displacement | Rare | 효과 |
| Cloak of Elvenkind | Uncommon | 효과 |
| Cloak of Invisibility | Legendary | 효과 |
| Cloak of Protection | Uncommon | 효과 |
| Cloak of the Bat | Rare | 효과 |
| Cloak of the Manta Ray | Uncommon | 효과 |
| Crystal Ball | Very Rare | 팔기만 |
| Crystal Ball of Mind Reading | Legendary | 팔기만 |
| Crystal Ball of Telepathy | Legendary | 팔기만 |
| Crystal Ball of True Seeing | Legendary | 팔기만 |
| Cube of Force | Rare | 팔기만 |
| Cubic Gate | Legendary | 팔기만 |
| Dagger of Venom | Rare | 효과 |
| Dancing Sword | Longsword, Rapier, Scimitar, or Shortsword), Very Rare (Requires Attunement) | 효과 |
| Decanter of Endless Water | Uncommon | 팔기만 |
| Deck of Illusions | Uncommon | 팔기만 |
| Defender | Legendary | 효과 |
| Demon Armor | Medium, or Heavy), Very Rare (Requires Attunement) | 효과 |
| Dimensional Shackles | Rare | 팔기만 |
| Dragon Orb | Artifact | 없음 |
| Dragon Scale Mail | Very Rare | 효과 |
| Dragon Slayer | Rare | 효과 |
| Dust of Disappearance | Uncommon | 소모품 효과 |
| Dust of Dryness | Uncommon | 팔기만 |
| Dust of Sneezing and Choking | Uncommon | 팔기만 |
| Dwarven Plate | Very Rare | 효과 |
| Dwarven Thrower | Very Rare | 효과 |
| Efficient Quiver | Uncommon | 팔기만 |
| Efreeti Bottle | Very Rare | 효과 |
| Elemental Gem | Uncommon | 소모품 효과 |
| Elixir of Health | Rare | 소모품 효과 |
| Elven Chain | Rare | 효과 |
| Energy Bow | Very Rare | 효과 |
| Eversmoking Bottle | Uncommon | 팔기만 |
| Eyes of Charming | Uncommon | 효과 |
| Eyes of Minute Seeing | Uncommon | 팔기만 |
| Eyes of the Eagle | Uncommon | 효과 |
| Feather Token | Rarity Varies | 팔기만 |
| Figurine of Wondrous Power | Rarity Varies | 효과 |
| Flame Tongue | Rare | 효과 |
| Folding Boat | Rare | 팔기만 |
| Frost Brand | Greatsword, Longsword, Rapier, Scimitar, or Shortsword), Very Rare (Requires Attunement) | 효과 |
| Gauntlets of Ogre Power | Uncommon | 효과 |
| Gem of Brightness | Uncommon | 효과 |
| Gem of Seeing | Rare | 팔기만 |
| Giant Slayer | Rare | 효과 |
| Glamoured Studded Leather | Rare | 효과 |
| Gloves of Missile Snaring | Uncommon | 효과 |
| Gloves of Swimming and Climbing | Uncommon | 효과 |
| Gloves of Thievery | Uncommon | 효과 |
| Goggles of Night | Uncommon | 효과 |
| Hammer of Thunderbolts | Legendary | 효과 |
| Handy Haversack | Rare | 팔기만 |
| Hat of Disguise | Uncommon | 팔기만 |
| Hat of Many Spells | Very Rare | 효과 없음(낄 수만) |
| Headband of Intellect | Uncommon | 효과 |
| Helm of Brilliance | Very Rare | 효과 |
| Helm of Comprehending Languages | Uncommon | 팔기만 |
| Helm of Telepathy | Uncommon | 팔기만 |
| Helm of Teleportation | Rare | 효과 없음(낄 수만) |
| Holy Avenger | Legendary | 효과 |
| Horn of Blasting | Rare | 소모품 효과 |
| Horn of Valhalla | Rare | 효과 |
| Horseshoes of a Zephyr | Very Rare | 팔기만 |
| Horseshoes of Speed | Rare | 팔기만 |
| Immovable Rod | Uncommon | 팔기만 |
| Instant Fortress | Rare | 팔기만 |
| Ioun Stone | Rarity Varies | 효과 |
| Iron Bands | Rare | 효과 |
| Iron Flask | Legendary | 효과 |
| Javelin of Lightning | Uncommon | 효과 |
| Lantern of Revealing | Uncommon | 팔기만 |
| Luck Blade | Greatsword, Longsword, Rapier, Scimitar, Sickle, or Shortsword), Legendary (Requires Attunement) | 효과 |
| Mace of Disruption | Rare | 효과 |
| Mace of Smiting | Rare | 효과 |
| Mace of Terror | Rare | 효과 |
| Mantle of Spell Resistance | Rare | 효과 |
| Manual of Bodily Health | Very Rare | 소모품 효과 |
| Manual of Gainful Exercise | Very Rare | 소모품 효과 |
| Manual of Golems | Very Rare | 팔기만 |
| Manual of Quickness of Action | Very Rare | 소모품 효과 |
| Marvelous Pigments | Very Rare | 팔기만 |
| Medallion of Thoughts | Uncommon | 팔기만 |
| Mirror of Life Trapping | Very Rare | 팔기만 |
| Mithral Armor | Uncommon | 효과 |
| Mysterious Deck | Legendary | 팔기만 |
| Necklace of Adaptation | Uncommon | 효과 |
| Necklace of Fireballs | Rare | 효과 |
| Necklace of Prayer Beads | Rare | 효과 |
| Nine Lives Stealer | Very Rare | 효과 |
| Oathbow | Very Rare | 효과 |
| Oil of Etherealness | Rare | 팔기만 |
| Oil of Sharpness | Very Rare | 소모품 효과 |
| Oil of Slipperiness | Uncommon | 소모품 효과 |
| Pearl of Power | Uncommon | 효과 |
| Periapt of Health | Uncommon | 효과 |
| Periapt of Proof against Poison | Rare | 효과 |
| Periapt of Wound Closure | Uncommon | 효과 |
| Philter of Love | Uncommon | 팔기만 |
| Pipes of Haunting | Uncommon | 효과 |
| Pipes of the Sewers | Uncommon | 팔기만 |
| Plate Armor of Etherealness | Legendary | 효과 없음(낄 수만) |
| Portable Hole | Rare | 팔기만 |
| Potion of Animal Friendship | Uncommon | 팔기만 |
| Potion of Clairvoyance | Rare | 팔기만 |
| Potion of Climbing | Common | 소모품 효과 |
| Potion of Diminution | Rare | 팔기만 |
| Potion of Flying | Very Rare | 소모품 효과 |
| Potion of Gaseous Form | Rare | 팔기만 |
| Potion of Giant Strength | Rarity Varies | 소모품 효과 |
| Potion of Growth | Uncommon | 소모품 효과 |
| Potions of Healing | Rarity Varies | 소모품 효과 (네 종류 따로) |
| Potion of Heroism | Rare | 소모품 효과 |
| Potion of Invisibility | Rare | 소모품 효과 |
| Potion of Invulnerability | Rare | 소모품 효과 |
| Potion of Longevity | Very Rare | 팔기만 |
| Potion of Mind Reading | Rare | 팔기만 |
| Potion of Poison | Uncommon | 팔기만 |
| Potion of Resistance | Uncommon | 소모품 효과 |
| Potion of Speed | Very Rare | 소모품 효과 |
| Potion of Vitality | Very Rare | 소모품 효과 |
| Potion of Water Breathing | Uncommon | 팔기만 |
| Quarterstaff of the Acrobat | Very Rare | 효과 |
| Ring of Animal Influence | Rare | 팔기만 |
| Ring of Djinni Summoning | Legendary | 효과 |
| Ring of Elemental Command | Legendary | 팔기만 |
| Ring of Evasion | Rare | 효과 |
| Ring of Feather Falling | Rare | 팔기만 |
| Ring of Free Action | Rare | 효과 |
| Ring of Invisibility | Legendary | 효과 |
| Ring of Jumping | Uncommon | 팔기만 |
| Ring of Mind Shielding | Uncommon | 팔기만 |
| Ring of Protection | Rare | 효과 |
| Ring of Regeneration | Very Rare | 효과 |
| Ring of Resistance | Rare | 효과 |
| Ring of Shooting Stars | Very Rare | 효과 |
| Ring of Spell Storing | Rare | 팔기만 |
| Ring of Spell Turning | Legendary | 효과 |
| Ring of Swimming | Uncommon | 효과 |
| Ring of Telekinesis | Very Rare | 팔기만 |
| Ring of the Ram | Rare | 효과 |
| Ring of Three Wishes | Legendary | 팔기만 |
| Ring of Warmth | Uncommon | 효과 |
| Ring of Water Walking | Uncommon | 팔기만 |
| Ring of X-ray Vision | Rare | 팔기만 |
| Robe of Eyes | Rare | 효과 |
| Robe of Scintillating Colors | Very Rare | 효과 |
| Robe of Stars | Very Rare | 효과 |
| Robe of the Archmagi | Legendary | 효과 |
| Robe of Useful Items | Uncommon | 팔기만 |
| Rod of Absorption | Very Rare | 팔기만 |
| Rod of Alertness | Very Rare | 효과 |
| Rod of Lordly Might | Legendary | 효과 |
| Rod of Resurrection | Legendary | 효과 |
| Rod of Rulership | Rare | 효과 |
| Rod of Security | Very Rare | 팔기만 |
| Rope of Climbing | Uncommon | 팔기만 |
| Rope of Entanglement | Rare | 효과 |
| Scarab of Protection | Legendary | 효과 |
| Scimitar of Speed | Very Rare | 효과 |
| Sending Stones | Uncommon | 팔기만 |
| Sentinel Shield | Uncommon | 효과 |
| Shield, +1, +2, or +3 | Uncommon | 일부 (+1 · +3만, +2 없음) |
| Shield of Missile Attraction | Rare | 효과 |
| Shield of the Cavalier | Very Rare | 효과 |
| Slippers of Spider Climbing | Uncommon | 팔기만 |
| Sovereign Glue | Legendary | 팔기만 |
| Spellguard Shield | Very Rare | 효과 |
| Spell Scroll | Rarity Varies | 소모품 효과 (두루마리) |
| Sphere of Annihilation | Legendary | 팔기만 |
| Staff of Charming | Rare | 효과 |
| Staff of Fire | Very Rare | 효과 |
| Staff of Frost | Very Rare | 효과 |
| Staff of Healing | Rare | 효과 |
| Staff of Power | Very Rare | 효과 |
| Staff of Striking | Very Rare | 효과 |
| Staff of Swarming Insects | Rare | 효과 |
| Staff of the Magi | Legendary | 효과 |
| Staff of the Python | Uncommon | 효과 |
| Staff of the Woodlands | Rare | 효과 |
| Staff of Thunder and Lightning | Very Rare | 효과 |
| Staff of Withering | Rare | 효과 |
| Stone of Controlling Earth Elementals | Rare | 효과 |
| Stone of Good Luck (Luckstone) | Uncommon | 효과 |
| Sun Blade | Rare | 효과 |
| Sword of Life Stealing | Greatsword, Longsword, Rapier, Scimitar, or Shortsword), Rare (Requires Attunement) | 효과 |
| Sword of Sharpness | Greatsword, Longsword, or Scimitar), Very Rare (Requires Attunement) | 효과 |
| Sword of Wounding | Greatsword, Longsword, Rapier, Scimitar, or Shortsword), Rare (Requires Attunement) | 효과 |
| Talisman of Pure Good | Legendary | 효과 |
| Talisman of the Sphere | Legendary | 팔기만 |
| Talisman of Ultimate Evil | Legendary | 효과 |
| Thunderous Greatclub | Very Rare | 효과 |
| Tome of Clear Thought | Very Rare | 소모품 효과 |
| Tome of Leadership and Influence | Very Rare | 소모품 효과 |
| Tome of Understanding | Very Rare | 소모품 효과 |
| Trident of Fish Command | Uncommon | 효과 없음(낄 수만) |
| Universal Solvent | Legendary | 팔기만 |
| Vicious Weapon | Rare | 효과 |
| Vorpal Sword | Greatsword, Longsword, or Scimitar), Legendary (Requires Attunement) | 효과 |
| Wand of Binding | Rare | 효과 |
| Wand of Enemy Detection | Rare | 팔기만 |
| Wand of Fear | Rare | 효과 |
| Wand of Fireballs | Rare | 효과 |
| Wand of Lightning Bolts | Rare | 효과 |
| Wand of Magic Detection | Uncommon | 팔기만 |
| Wand of Magic Missiles | Uncommon | 효과 |
| Wand of Paralysis | Rare | 효과 |
| Wand of Polymorph | Very Rare | 효과 |
| Wand of Secrets | Uncommon | 팔기만 |
| Wand of the War Mage, +1, +2, or +3 | Uncommon | 없음 |
| Wand of Web | Uncommon | 효과 |
| Wand of Wonder | Rare | 팔기만 |
| Weapon, +1, +2, or +3 | Uncommon | 효과 (Weapon, +1 · +2 · +3 따로) |
| Weapon of Warning | Uncommon | 효과 |
| Well of Many Worlds | Legendary | 팔기만 |
| Wind Fan | Uncommon | 효과 |
| Winged Boots | Uncommon | 효과 |
| Wings of Flying | Rare | 효과 |

## 종족 특성

| 종족 | SRD 특성 | 코드 특성 |
|---|---|---|
| Dragonborn | Draconic Ancestry, Breath Weapon, Damage Resistance, Darkvision, Draconic Flight | 숨결, 피해 저항, 드래곤의 비행 |
| Dwarf | Darkvision, Dwarven Resilience, Dwarven Toughness, Stonecunning | 드워프의 강인함, 드워프의 튼튼함, 돌의 지식 |
| Elf | Darkvision, Elven Lineage, Fey Ancestry, Keen Senses, Trance | 요정 혈통, 예리한 감각, 무아지경 |
| Gnome | Darkvision, Gnomish Cunning, Gnomish Lineage, Forest Gnome | 노움의 교활함 |
| Goliath | Giant Ancestry, Large Form, Powerful Build | 거대화, 강인한 체격 |
| Halfling | Brave, Halfling Nimbleness, Luck, Naturally Stealthy | 용감함, 재빠름, 행운, 타고난 은신 |
| Human | Resourceful, Skillful, Versatile | 재주꾼, 숙련, 다재다능 |
| Orc | Adrenaline Rush, Darkvision, Relentless Endurance | 아드레날린, 불굴 |
| Tiefling | Darkvision, Fiendish Legacy, Otherworldly Presence | 다른 세계의 기운 |

어둠 시야(Darkvision)는 어느 종족에도 없다 — 게임의 시야가 빛 · 어둠을 나누지 않는다.

## 재주

| 재주 | 분류 | 코드에서 쓰이는 수 |
|---|---|---|
| Alert | Origin | 6 |
| Magic Initiate | Origin | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Savage Attacker | Origin | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Skilled | Origin | 3 |
| Ability Score Improvement | General | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Grappler | General | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Archery | Fighting Style | 3 |
| Defense | Fighting Style | 10 |
| Great Weapon Fighting | Fighting Style | 9 |
| Two-Weapon Fighting | Fighting Style | 6 |
| Boon of Combat Prowess | Epic Boon | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Boon of Dimensional Travel | Epic Boon | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Boon of Fate | Epic Boon | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Boon of Irresistible Offense | Epic Boon | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Boon of Spell Recall | Epic Boon | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Boon of the Night Spirit | Epic Boon | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
| Boon of Truesight | Epic Boon | (키 이름이 달라 자동 대조 못 함 — feats.js · dnd.js boon) |
## 2026-11-08 SRD로 고친 것

- 바드의 영감: 저절로 도는 노래를 없애고 SRD 직업 기능으로 (1레벨 · 매력 수정치 횟수 · D20 실패 때 굴려 더하고 사라짐 · 5 · 10 · 15레벨 주사위 · 5레벨 짧은 휴식 회복)
- 히드라: 한 턴 25 피해마다 머리 하나 · 차례 끝 둘씩 · 체력 20 · 화염이면 안 자람 · 반응 머리
- 상태: 행동 불능 · 의식 없음 · 석화 · 투명 · 매혹 · 귀먹음 추가, 기절 · 마비 · 의식 없음 · 석화의 근력 · 민첩 내성 자동 실패, 속박의 민첩 내성 불리, 붙잡힘의 공격 불리, 행동 불능이면 집중 끊김
- 탈진 (6단계 · D20 −2/단계 · 6이면 죽음 · 긴 휴식에 1단계) · 아스트랄 타워 시계 끝은 질식 (체력 25% 피해 → 숨 참기 후 탈진)
- 언데드 퇴치: 공포 + 행동 불능 1분, 피해를 받으면 끝 · 수면: 행동 불능 → 다시 내성 → 의식 없음 · 최면 무늬: 매혹 + 행동 불능, 피해로 끝
- 투명 반지 (늘 투명) · 투명 망토 (충전 3 · 1시간 · 새벽 1d3) · 투명의 물약 (1시간, 공격하면 끝)
- 거인 힘의 물약 (근력 23 · 1시간) · 성장의 물약 (+1d4 · 근력 내성 이점 · 10분) · 영웅 · 저항 1시간 · 무적의 물약은 저항(겹치지 않음)
- 치유의 기도: 짧은 휴식 효과 · 방어막: 다음 차례까지 · 종잡을 수 없음: 행동 불능이면 꺼짐 · 자연의 성역: 절반 엄폐 + 대지 저항
- 직업 기능 부여: 등록만 되고 아무에게도 안 붙던 4개(야성의 본능 · 종잡을 수 없음 · 자연의 성역 · 생명 보존 레벨 6→3), 하위 직업과 상관없이 새던 11개(무심한 격노 · 위협적 존재 · 몸의 온전함 · 떨리는 손바닥 · 축복받은 치유사 · 최상의 치유 · 헌신의 오라 · 보호의 강타 · 뛰어난 운동선수 · 영웅적 전사 · 과충전)
- 같은 횟수를 나눠 쓰는 기능: 생명 보존 · 언데드 퇴치(신성 변환), 적 물리치기 · 신성한 무기(신성 변환), 대지의 도움 · 자연의 성역 · 야생 변신


## 주문 원문 대조 (tools/srd_spells_db.py → data/srd521/spell_check.json)

> **2026-11-08 실행 대조 (DESIGN.md 163)**: `node test/spell_lab.js`가 주문을 실제로 시전해 원문과 비교한다 — 216개 중 같음 153 · 원인 확인 48 · 시험 자리 없음 15 · 설명 안 된 차이 0. 아래 표는 그 전의 데이터 대조(칸끼리 비교)라 낡았다.

- 339개 모두 `G.SRD_SP[id].srd`에 원문 칸. 범위는 원문 모양 · 크기 (`G.Skill.H.AREA`, 아군 포함).
- 고유 규칙으로 짠 주문: 신성한 말 · 혼란 · 혼미 · 분광 분사 · 분광 벽 · 복수의 폭풍 · 거대 곤충 · 용 소환 · 사물 움직이기 · 원소 · 요정 · 하급 원소 · 숲의 존재 · 천상체 소환 · 사자 되살리기 · 비행.
- 남은 차이 (대부분 대조 도구가 원문 표 · 소환수 능력치표를 못 읽는 것):

| 주문 | 차이 |
|---|---|
| Acid Arrow | 절반 True ≠ False |
| Animate Objects | 피해 [1, 6, 3] ≠ None |
| Arcane Sword | 피해 [4, 12, 0] ≠ None |
| Befuddlement | 상태 incapacitated는 원문에 없음 (원문: 없음) |
| Confusion | 상태 incapacitated는 원문에 없음 (원문: 없음) |
| Conjure Animals | 내성 dex ≠ str |
| Conjure Elemental | 피해 [8, 8, 0] ≠ None |
| Conjure Fey | 피해 [3, 12, 0] ≠ None |
| Conjure Minor Elementals | 피해 [2, 8, 0] ≠ None |
| Delayed Blast Fireball | 피해 [12, 6, 0] ≠ None |
| Divine Word | 상태 deafened는 원문에 없음 (원문: 없음); 상태 blinded는 원문에 없음 (원문: 없음); 상태 incapacitated는 원문에 없음 (원문: 없음); 상태 stunned는 원문에 없음 (원문: 없음) |
| Dragon’s Breath | 피해 [3, 6, 0] ≠ None |
| Flame Blade | 피해 [3, 6, 0] ≠ None |
| Fog Cloud | 상태 blinded는 원문에 없음 (원문: 없음) |
| Forcecage | 내성 None ≠ cha; 상태 restrained는 원문에 없음 (원문: invisible) |
| Giant Insect | 피해 [2, 8, 0] ≠ None |
| Heat Metal | 내성 None ≠ con |
| Levitate | 상태 restrained는 원문에 없음 (원문: 없음) |
| Magic Missile | 피해 None ≠ [1, 4, 1]; 피해 종류 None ≠ force |
| Maze | 상태 incapacitated는 원문에 없음 (원문: 없음) |
| Plane Shift | 내성 cha ≠ None; 상태 incapacitated는 원문에 없음 (원문: 없음) |
| Polymorph | 상태 incapacitated는 원문에 없음 (원문: 없음) |
| Prismatic Spray | 절반 True ≠ False; 피해 [12, 6, 0] ≠ None; 상태 restrained는 원문에 없음 (원문: 없음); 상태 petrified는 원문에 없음 (원문: 없음) |
| Prismatic Wall | 절반 True ≠ False; 피해 [12, 6, 0] ≠ None; 상태 petrified는 원문에 없음 (원문: blinded); 상태 restrained는 원문에 없음 (원문: blinded) |
| Resilient Sphere | 상태 incapacitated는 원문에 없음 (원문: 없음) |
| Reverse Gravity | 상태 incapacitated는 원문에 없음 (원문: 없음) |
| Sorcerous Burst | 피해 [1, 8, 0] ≠ None |
| Storm of Vengeance | 피해 [6, 6, 0] ≠ [2, 6, 0] |
| Summon Dragon | 피해 [2, 10, 4] ≠ None |
| True Polymorph | 상태 incapacitated는 원문에 없음 (원문: 없음) |
| True Strike | 피해 [1, 6, 0] ≠ None |
| Wall of Force | 상태 restrained는 원문에 없음 (원문: invisible) |
| Wall of Stone | 상태 incapacitated는 원문에 없음 (원문: 없음) |

## 2026-11-08 늦게 들어간 것 (DESIGN.md 159)

- **아군 생물** (`js/summon.js`): 부른 몸과 선제권을 나누고 바로 뒤 차례 · 적의 표적 · 범위 · 기회 공격 · 집중이 끊기면 사라짐. 주문(거대 곤충 · 용의 영혼 · 움직이는 사물 · 사자 되살리기)과 물건(원소 보석 · 원소 조종 넷 · 발할라의 뿔피리 · 경이로운 조각상 · 요술 주머니 · 비단뱀 지팡이 · 이프리트 병 · 진 소환의 반지)이 원문 능력치표로 부른다.
- **빛과 시야** (`js/light.js`): 밝음 · 어스름 · 어둠, 벽 횃불 · 파티 횃불 · 빛 · 햇빛 · 어둠 주문, 어둠 시야(종족 · 몬스터 · 밤의 고글) · 맹안시 · 진시야 · 악마의 시야. 보이지 않는 표적 불리 · 보이지 않는 공격자 이점.
- **지형** (`G.Terrain`): 어려운 지형(얕은 물 · 주문) · 헤엄(깊은 물, 수영 속도) · 비행(땅 지형을 안 탐) · 추락(날다가 넘어짐 · 행동 불능 · 속도 0, 공중 정지 제외). 수영 · 비행 물건 8 · 비행의 물약 · 비행 주문.

## 남은 일

- **행동 · 다중 직업**: SRD 행동 12개를 동료 · 몬스터가 쓴다 (질주 · 물러나기 · 숨기 · 찾기 · 연구 · 설득 추가, DESIGN.md 165). 다중 직업은 선행 조건 · 히트 다이스 · 숙련 · 슬롯 표 · 계약 마법 · 추가 공격까지 (G.MC). 남은 것: 기승 전투 · 수중 전투.

- **전투 밖 물건 · 주문**: 주문 339개 모두 · 마법 물건 256개 (DESIGN.md 162 · 164). 팔기만: 신비한 카드 · 장수의 물약.
- **높이**: 날아오른 높이 · 낙하 거리 · 근접이 닿는 높이는 없다 (비행은 땅 지형 · 물을 무시하고, 떨어지면 10피트로 친다).
- **몬스터 행동 동작**: 비공격 행동 363개 중 360개 (DESIGN.md 160 · 161 · 164). 남은 셋: 거품 질주 둘(물속 전용) · 포효(첫째 · 둘째 · 셋째 포효로 따로 처리).
- **반응 · 옛 규칙**: 반응은 라운드에 하나(G.Dnd.react). 스킬트리 · 파티 버프 · 금화 배율 · 강화 단계 · 라이벌 · 연계기 · 시즌 초기화 · 실시간 전투 · 시간 부활 · 오염은 지웠다 (DESIGN.md 161). 사거리 1/2은 사용자가 정한 것이라 위반이 아니다.

## SRD와 다르게 느껴질 것 (2026-11-09 정리)

SRD를 아는 사람이 플레이할 때 "원문과 다르다"고 느낄 만한 것. 고칠지는 사용자가 정한다.

**일부러 둔 것 (손대지 않는다)**
- 사거리 1/2 (G.SRD_RANGE.cells) — 사용자가 정한 것.
- 부상 타이머 · 훈련소 경험치 ×1.2 — 원문에 없는 게임 규칙. 사용자: "일단 이건 냅둬".
- 이야기 · 성격의 수치 효과 — 유지.

**바꿀 만한 것 (아직 안 함)**
- 동료를 직접 조종하지 않는다 — 규칙은 SRD지만 차례마다 무엇을 할지 동료가 스스로 고른다 (G.Turn · G.Act.idle). 테이블의 "내 차례에 뭘 할까" 감각이 약하다. 바꾸려면 차례 입력(행동 · 추가 행동 · 이동 · 대상 고르기) UI가 필요하다.
- 높이 없음 — 날아오른 높이 · 낙하 거리 · 근접이 닿는 높이 (비행은 땅 지형을 무시할 뿐).
- 기승 전투 · 수중 전투 없음 (몬스터 거품 질주 둘도 이 때문에 빠짐).
- 팔기만 하는 물건: 신비한 카드 · 장수의 물약.
- 브라우저 실플레이 확인 안 함 — 특히 시트의 "다음 레벨 · 직업" 칸 (DESIGN.md 165).
- 진행 속도: 물러날 때 기회 공격 · 근접 질주가 들어가 sim 15분에 7층 → 5층. 원문대로지만 난이도가 올랐다.
