import { CupDef, cupById } from './data';

// Logical canvas size; everything is drawn in these units and scaled to fit.
export const W = 360;
export const H = 480;
export const CX = 180;
export const TABLE_Y = 440;
// Vertical squash of circles seen from slightly above.
export const P = 0.16;

export interface Geom {
  def: CupDef;
  top: number;
  bot: number;
  capacity: number;
  r: (y: number) => number;
  outer: (y: number) => number;
  levelY: (ml: number) => number;
}

const cache = new Map<string, Geom>();

export function geom(cupId: string): Geom {
  const hit = cache.get(cupId);
  if (hit) return hit;
  const def = cupById.get(cupId) ?? cupById.get('gl')!;
  const bot = TABLE_Y - def.base;
  const r = (y: number) => Math.max(2, def.radius(Math.min(Math.max(y, def.top), bot), bot));
  // Cumulative volume per pixel row, bottom up (volume ~ r^2 per row).
  const cum: number[] = [0];
  let acc = 0;
  for (let y = bot; y > def.top; y--) {
    const rr = r(y - 0.5);
    acc += rr * rr;
    cum.push(acc);
  }
  const k = def.capacity / acc;
  const levelY = (ml: number) => {
    const v = ml / k;
    if (v <= 0) return bot;
    if (v >= acc) return def.top;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < v) lo = mid; else hi = mid;
    }
    const f = (v - cum[lo]) / (cum[hi] - cum[lo] || 1);
    return bot - (lo + f);
  };
  const g: Geom = { def, top: def.top, bot, capacity: def.capacity, r, outer: (y) => r(y) + def.wall, levelY };
  cache.set(cupId, g);
  return g;
}

export interface Proj { sx: number; sy: number; d: number }

export function proj(x: number, y: number, z: number, yaw: number): Proj {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const sx = x * c + z * s;
  const d = -x * s + z * c;
  return { sx: CX + sx, sy: y + d * P, d };
}

// Screen offset (from center) + depth -> world x,z.
export function unproj(sx: number, d: number, yaw: number) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: sx * c - d * s, z: sx * s + d * c };
}

// Seeded PRNG (mulberry32).
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
