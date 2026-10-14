import type {Chamber, Dungeon} from '../../src/dungeon/types';

/** Builds a Dungeon from ASCII rows: '#' is rock, '.' is floor. */
export function dungeonFromRows(rows: readonly string[], chambers: readonly Chamber[] = [], centers: readonly (readonly [number, number])[] = [[1, 1]]): Dungeon {
  const grid: number[][] = rows.map(row => [...row].map(c => (c === '.' ? 1 : 0)));
  return {
    seed: 0,
    width: grid[0].length,
    height: grid.length,
    grid,
    chambers,
    centers,
    openTileCount: grid.reduce((n, row) => n + row.reduce((m, v) => m + v, 0), 0),
  };
}

export const OPEN_3X3 = ['...', '...', '...'];
