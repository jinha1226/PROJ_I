import type { StatusDef, StatusId } from '../sim/defs';

export const STATUSES: Record<StatusId, StatusDef> = {
  burn: {
    id: 'burn', name: '화상', icon: '화', color: '#ff7a2f', harmful: true, stacking: 'refresh',
    resist: 'fire', dot: { element: 'fire', perSecond: 3 }, severity: 10,
  },
  poison: {
    id: 'poison', name: '중독', icon: '독', color: '#7dd35a', harmful: true, stacking: 'intensity',
    maxStacks: 5, resist: 'poison', dot: { element: 'poison', perSecond: 1.5 }, severity: 6,
  },
  slow: {
    id: 'slow', name: '감속', icon: '감', color: '#66ccff', harmful: true, stacking: 'refresh',
    mods: { moveMult: 0.55, actionMult: 0.7 }, severity: 12,
  },
  stun: {
    id: 'stun', name: '기절', icon: '기', color: '#ffe14d', harmful: true, stacking: 'refresh',
    immuneTag: 'unstunnable', stun: true, severity: 30,
  },
  fear: {
    id: 'fear', name: '공포', icon: '공', color: '#c080ff', harmful: true, stacking: 'refresh',
    immuneTag: 'mindless', severity: 15,
  },
  taunted: {
    id: 'taunted', name: '도발됨', icon: '도', color: '#ff5555', harmful: true, stacking: 'refresh', severity: 0,
  },
  guarded: {
    id: 'guarded', name: '방어 태세', icon: '수', color: '#c8c8c8', harmful: false, stacking: 'refresh',
    mods: { ac: 6 }, severity: 0,
  },
  protected: {
    id: 'protected', name: '보호', icon: '보', color: '#ffeeaa', harmful: false, stacking: 'refresh',
    mods: { dmgTakenMult: 0.7 }, severity: 0,
  },
  might: {
    id: 'might', name: '괴력', icon: '힘', color: '#ff9944', harmful: false, stacking: 'refresh',
    mods: { dmgMult: 1.3 }, severity: 0,
  },
};
