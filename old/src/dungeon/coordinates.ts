import {Vector3} from 'three';
import {TILE_SIZE} from '../config';
import type {Dungeon} from './types';

/** Scene-independent tile <-> world conversion shared by exploration and rendering. */
export function tileToWorld(x: number, y: number, dungeon: Pick<Dungeon, 'width' | 'height'>): Vector3 {
  return new Vector3((x - dungeon.width / 2) * TILE_SIZE, 0, (y - dungeon.height / 2) * TILE_SIZE);
}

export function worldToTile(x: number, z: number, dungeon: Pick<Dungeon, 'width' | 'height'>): {x: number; y: number} {
  return {x: Math.round(x / TILE_SIZE + dungeon.width / 2), y: Math.round(z / TILE_SIZE + dungeon.height / 2)};
}
