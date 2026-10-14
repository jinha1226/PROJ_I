export interface Vec2 {
  x: number;
  z: number;
}

export const TAU = Math.PI * 2;

export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

export const distSq = (a: Vec2, b: Vec2): number => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

/** Facing angle convention: 0 looks down +z, matching three.js `rotation.y`. */
export const angleTo = (from: Vec2, to: Vec2): number => Math.atan2(to.x - from.x, to.z - from.z);

export const wrapAngle = (a: number): number => {
  let r = (a + Math.PI) % TAU;
  if (r < 0) r += TAU;
  return r - Math.PI;
};

export const angleDiff = (a: number, b: number): number => wrapAngle(b - a);

/** Rotates `current` toward `target` by at most `maxStep` radians. */
export const turnTowards = (current: number, target: number, maxStep: number): number => {
  const d = angleDiff(current, target);
  return Math.abs(d) <= maxStep ? target : wrapAngle(current + Math.sign(d) * maxStep);
};

export const dirFromAngle = (a: number): Vec2 => ({x: Math.sin(a), z: Math.cos(a)});

export const approach = (v: number, target: number, step: number): number =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step);
