import type {Rng} from '../core/rng';
import type {ContainerType} from '../items/loot';

export type RoomTheme = 'armory' | 'storage' | 'hall' | 'library' | 'crypt' | 'barracks' | 'treasure';

export interface ThemeDef {
  name: string;
  /** Floor pieces for room tiles, weighted by repetition. */
  floors: readonly string[];
  /** Torch light and flame color: gives each room its own mood. */
  light: number;
  containers: readonly (readonly [ContainerType, number])[];
  dormantChance: number;
  mageChance: number;
  /** Chance that a north wall segment uses this variant instead of the plain wall. */
  northWall?: {piece: string; chance: number};
}

export const THEMES: Readonly<Record<RoomTheme, ThemeDef>> = {
  armory: {
    name: '무기고',
    floors: ['floor_tile_large', 'floor_tile_large', 'floor_tile_big_grate'],
    light: 0xa9c6ff,
    containers: [
      ['weapon_rack', 4],
      ['crate', 2],
      ['trunk', 1],
    ],
    dormantChance: 0.3,
    mageChance: 0.15,
  },
  storage: {
    name: '창고',
    floors: ['floor_wood_large_dark', 'floor_wood_large_dark', 'floor_wood_large'],
    light: 0xff9a4a,
    containers: [
      ['crate', 4],
      ['barrel', 4],
      ['trunk', 1],
    ],
    dormantChance: 0.35,
    mageChance: 0.15,
  },
  hall: {
    name: '연회장',
    floors: ['floor_tile_large'],
    light: 0xffcf7a,
    containers: [
      ['chest', 3],
      ['barrel', 2],
      ['crate', 1],
    ],
    dormantChance: 0.4,
    mageChance: 0.25,
  },
  library: {
    name: '연구실',
    floors: ['floor_wood_large', 'floor_wood_large_dark'],
    light: 0xa98bff,
    containers: [
      ['trunk', 3],
      ['chest', 2],
    ],
    dormantChance: 0.2,
    mageChance: 0.55,
    northWall: {piece: 'wall_shelves', chance: 0.6},
  },
  crypt: {
    name: '지하 묘지',
    floors: ['floor_dirt_large_rocky', 'floor_dirt_large', 'floor_tile_large_rocks'],
    light: 0x6dffa8,
    containers: [
      ['chest', 2],
      ['trunk', 2],
    ],
    dormantChance: 0.75,
    mageChance: 0.25,
    northWall: {piece: 'wall_cracked', chance: 0.4},
  },
  barracks: {
    name: '숙소',
    floors: ['floor_wood_large_dark', 'floor_wood_large'],
    light: 0xffb070,
    containers: [
      ['trunk', 4],
      ['crate', 2],
      ['weapon_rack', 1],
    ],
    dormantChance: 0.5,
    mageChance: 0.1,
  },
  treasure: {name: '보물방', floors: ['floor_tile_large'], light: 0xffd35a, containers: [['gold_chest', 1]], dormantChance: 0.3, mageChance: 0.35},
};

/** Every dungeon piece the themes can place (for the asset loader). */
export const THEME_PIECES = [
  'floor_wood_large',
  'floor_wood_large_dark',
  'floor_dirt_large_rocky',
  'wall_shelves',
  'wall_cracked',
  'crates_stacked',
  'box_stacked',
  'barrel_small',
  'keg_decorated',
  'table_long_tablecloth_decorated_A',
  'chair',
  'stool',
  'table_small_decorated_A',
  'candle_lit',
  'candle_melted',
  'candle_triple',
  'shelf_small_candles',
  'bottle_A_green',
  'bed_floor',
  'bed_frame',
  'trunk_medium_A',
  'pillar_decorated',
  'coin_stack_large',
  'coin_stack_medium',
  'banner_shield_red',
  'banner_shield_blue',
  'sword_shield',
  'plate_food_A',
] as const;

export interface WallSlot {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/** What the theme decorator may do; mapgen provides the implementation. */
export interface DecorApi {
  rng: Rng;
  /** Free wall-backed tiles (excluding doorways and reserved tiles). */
  wallSlots(): WallSlot[];
  /** Interior tiles not touching a wall. */
  innerTiles(): [number, number][];
  /** Reserves a tile; false if already taken. */
  claim(tx: number, ty: number): boolean;
  /** Places a piece against a wall (`depth` = how far it sticks out, `y` for wall-mounted). */
  againstWall(slot: WallSlot, piece: string, depth: number, radius: number, y?: number): void;
  /** Places a piece at a world offset from a tile center. */
  at(tx: number, ty: number, piece: string, dx: number, dz: number, rot: number, radius: number): void;
}

type Decorator = (api: DecorApi, room: {w: number; h: number}) => void;

const some = <T>(rng: Rng, items: readonly T[], n: number): T[] => rng.shuffle(items).slice(0, n);

const DECORATORS: Readonly<Record<RoomTheme, Decorator>> = {
  armory: api => {
    for (const s of some(
      api.rng,
      api.wallSlots().filter(s => s.dy !== 1),
      3,
    ))
      api.againstWall(s, 'sword_shield', 0, 0, 1.9);
    for (const s of some(api.rng, api.wallSlots(), 2)) if (api.claim(s.x, s.y)) api.againstWall(s, 'barrel_small', 0.6, 0.5);
  },
  storage: api => {
    const pieces: [string, number, number][] = [
      ['crates_stacked', 1.2, 1.1],
      ['keg_decorated', 1.0, 1.1],
      ['barrel_small', 0.6, 0.5],
      ['crates_stacked', 1.2, 1.1],
    ];
    for (const s of some(api.rng, api.wallSlots(), 4)) {
      if (!api.claim(s.x, s.y)) continue;
      const [piece, depth, r] = api.rng.pick(pieces);
      api.againstWall(s, piece, depth, r);
    }
    const inner = api.innerTiles();
    if (inner.length) {
      const [tx, ty] = api.rng.pick(inner);
      if (api.claim(tx, ty)) api.at(tx, ty, 'box_stacked', 0, 0, api.rng.pick([0, Math.PI / 2]), 1.7);
    }
  },
  hall: (api, room) => {
    const inner = api.innerTiles();
    if (inner.length) {
      const [tx, ty] = inner[Math.floor(inner.length / 2)];
      if (api.claim(tx, ty)) {
        const alongZ = room.h >= room.w;
        const rot = alongZ ? 0 : Math.PI / 2;
        api.at(tx, ty, 'table_long_tablecloth_decorated_A', 0, 0, rot, 0);
        // Two circles approximate the long table; chairs line both sides.
        for (const t of [-1.1, 1.1]) api.at(tx, ty, '', alongZ ? 0 : t, alongZ ? t : 0, 0, 1.15);
        for (const side of [-1.5, 1.5])
          for (const t of [-1.2, 0, 1.2]) {
            const ox = alongZ ? side : t;
            const oz = alongZ ? t : side;
            api.at(tx, ty, 'chair', ox, oz, Math.atan2(-ox, -oz), 0);
          }
      }
    }
    for (const s of some(
      api.rng,
      api.wallSlots().filter(s => s.dy === -1),
      2,
    ))
      api.againstWall(s, api.rng.pick(['banner_shield_red', 'banner_shield_blue']), 0, 0);
    for (const s of some(api.rng, api.wallSlots(), 2)) api.againstWall(s, 'candle_triple', 0.4, 0);
  },
  library: api => {
    const inner = api.innerTiles();
    for (const [tx, ty] of some(api.rng, inner, 2)) if (api.claim(tx, ty)) api.at(tx, ty, 'table_small_decorated_A', 0, 0, api.rng.range(0, Math.PI), 0.8);
    for (const s of some(
      api.rng,
      api.wallSlots().filter(s => s.dy !== -1),
      2,
    ))
      if (api.claim(s.x, s.y)) api.againstWall(s, 'shelf_small_candles', 0.5, 0.5, 1.4);
    for (const s of some(api.rng, api.wallSlots(), 2)) api.againstWall(s, 'candle_lit', 0.3, 0);
  },
  crypt: api => {
    for (const s of some(api.rng, api.wallSlots(), 5)) api.againstWall(s, api.rng.pick(['candle_melted', 'candle_lit', 'candle_melted']), 0.3 + api.rng.range(0, 0.6), 0);
    const inner = api.innerTiles();
    for (const [tx, ty] of some(api.rng, inner, 2)) if (api.claim(tx, ty)) api.at(tx, ty, 'pillar_decorated', 0, 0, api.rng.pick([0, Math.PI / 2]), 1.0);
  },
  barracks: api => {
    for (const s of some(
      api.rng,
      api.wallSlots().filter(s => s.dy !== 1),
      3,
    ))
      if (api.claim(s.x, s.y)) api.againstWall(s, api.rng.pick(['bed_floor', 'bed_frame']), 1.6, 0.9);
    const inner = api.innerTiles();
    for (const [tx, ty] of some(api.rng, inner, 1)) {
      if (!api.claim(tx, ty)) continue;
      api.at(tx, ty, 'table_small_decorated_A', 0, 0, 0, 0.8);
      api.at(tx, ty, 'stool', 1.0, 0.2, 0, 0);
      api.at(tx, ty, 'stool', -1.0, -0.2, 0, 0);
    }
  },
  treasure: api => {
    for (const s of some(api.rng, api.wallSlots(), 3)) if (api.claim(s.x, s.y)) api.againstWall(s, api.rng.pick(['coin_stack_large', 'coin_stack_medium']), 0.9, 0.8);
    for (const s of some(
      api.rng,
      api.wallSlots().filter(s => s.dy === -1),
      2,
    ))
      api.againstWall(s, 'banner_shield_red', 0, 0);
  },
};

export function decorateThemed(theme: RoomTheme, api: DecorApi, room: {w: number; h: number}): void {
  DECORATORS[theme](api, room);
}

const NORMAL_THEMES: readonly RoomTheme[] = ['armory', 'storage', 'hall', 'library', 'crypt', 'barracks'];

/** Spreads themes so neighbors rarely repeat; halls need room for their table. */
export function pickTheme(rng: Rng, room: {w: number; h: number}, recent: readonly RoomTheme[]): RoomTheme {
  const options = NORMAL_THEMES.filter(t => (t !== 'hall' || (room.w >= 4 && room.h >= 4)) && !recent.includes(t));
  return rng.pick(options.length ? options : NORMAL_THEMES);
}
