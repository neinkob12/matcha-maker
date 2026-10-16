import { liquidById, pieceById } from './data';
import { geom, unproj } from './geom';

export interface Layer { id: string; ml: number; mix: number }
// Syrup drizzle on the inner wall, at world angle a.
export interface Drip { id: string; a: number; len: number }
export interface Piece {
  k: string; x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  rot: number; vr: number; v: number; inCup: boolean;
}
// on 'glass': a = world angle around the cup, y = height. on 'rim': a only. on 'bg': x,y screen.
export interface Sticker { k: string; on: 'glass' | 'rim' | 'bg'; a: number; x: number; y: number; rot: number; s: number }
export interface PrintName { text: string; style: string; y: number; a: number }

export interface Drink {
  cup: string;
  bg: string;
  rim: string;
  straw: string;
  layers: Layer[];
  spilled: number;
  spillId: string;
  drips: Drip[];
  pieces: Piece[];
  stickers: Sticker[];
  charms: string[];
  fx: string[];
  stir: number;
  print: PrintName | null;
}

export const MAX_PIECES = 260;

export function newDrink(): Drink {
  return {
    cup: 'gl', bg: 'mint', rim: 'none', straw: 'none',
    layers: [], spilled: 0, spillId: '', drips: [], pieces: [], stickers: [],
    charms: [], fx: [], stir: 0, print: null,
  };
}

export const clone = (d: Drink): Drink => JSON.parse(JSON.stringify(d));

export const liquidMl = (d: Drink) => d.layers.reduce((s, l) => s + l.ml, 0);

export const dispMl = (d: Drink) =>
  d.pieces.reduce((s, p) => s + (p.inCup ? pieceById.get(p.k)?.disp ?? 0 : 0), 0);

export const density = (l: Layer) => liquidById.get(l.id)?.density ?? 1;

export interface Levels { surface: number; liquidTop: number; total: number }

// surface: top of everything (incl. foam). liquidTop: top of non-foam liquid.
export function levels(d: Drink): Levels {
  const g = geom(d.cup);
  const liq = liquidMl(d);
  const disp = dispMl(d);
  const foam = d.layers.reduce((s, l) => s + (density(l) < 0.8 ? l.ml : 0), 0);
  const total = liq + disp;
  const surface = liq > 0.5 ? g.levelY(total) : g.bot;
  const liquidTop = liq - foam > 0.5 ? g.levelY(total - foam) : g.bot;
  return { surface, liquidTop, total };
}

// Anything above capacity runs over the rim.
export function settleOverflow(d: Drink) {
  const g = geom(d.cup);
  let excess = liquidMl(d) + dispMl(d) - g.capacity;
  while (excess > 0.01 && d.layers.length) {
    const top = d.layers[d.layers.length - 1];
    const take = Math.min(top.ml, excess);
    top.ml -= take;
    excess -= take;
    d.spilled += take;
    d.spillId = top.id;
    if (top.ml <= 0.01) d.layers.pop();
  }
}

export interface PourSession { layer: Layer | null; passed: Layer[] }

export type PourResult = 'ok' | 'spill' | 'overflow';

// Pour ml of liquid id at screen offset sx (relative to cup center).
export function pour(d: Drink, id: string, ml: number, sx: number, yaw: number, s: PourSession): PourResult {
  const L = liquidById.get(id);
  if (!L) return 'ok';
  const g = geom(d.cup);
  const rTop = g.r(g.top);
  if (Math.abs(sx) > rTop - 3) {
    d.spilled += ml;
    d.spillId = id;
    return 'spill';
  }
  const room = g.capacity - liquidMl(d) - dispMl(d);
  const add = Math.max(0, Math.min(ml, room));
  if (add < ml) {
    d.spilled += ml - add;
    d.spillId = id;
  }
  if (add <= 0) return 'overflow';

  const center = 1 - Math.min(1, Math.abs(sx) / rTop);
  const isSyrup = L.tab === 'sweet';
  const isFoam = L.tab === 'foam';

  if (!s.layer) {
    // Dense liquids sink below lighter ones; whatever they pass through gets stirred up.
    let idx = d.layers.length;
    while (idx > 0 && density(d.layers[idx - 1]) < L.density - 0.005) idx--;
    s.passed = d.layers.slice(idx).filter((l) => density(l) >= 0.8);
    const below = d.layers[idx - 1];
    if (below && below.id === id) s.layer = below;
    else {
      s.layer = { id, ml: 0, mix: isSyrup ? 0.1 : isFoam ? 0.04 : 0.22 };
      d.layers.splice(idx, 0, s.layer);
    }
  }
  s.layer.ml += add;
  if (!isSyrup && !isFoam) s.layer.mix = Math.min(1, Math.max(s.layer.mix, 0.22 + center * 0.4));
  for (const p of s.passed) p.mix = Math.min(1, p.mix + add / (isSyrup ? 400 : 160));

  // Syrup aimed at the wall drizzles down the glass.
  if (isSyrup && center < 0.45) {
    const w = unproj(Math.sign(sx) * rTop, 0, yaw);
    const a = Math.atan2(w.x, w.z);
    let drip = d.drips.find((q) => q.id === id && Math.abs(angDiff(q.a, a)) < 0.25);
    if (!drip && d.drips.length < 24) {
      drip = { id, a: a + (Math.random() - 0.5) * 0.2, len: 0 };
      d.drips.push(drip);
    }
    if (drip) drip.len = Math.min(g.bot - g.top - 6, drip.len + add * 3.2);
  }
  return 'ok';
}

export const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function stirStep(d: Drink, dt: number) {
  d.stir = Math.min(1, d.stir + dt * 0.35);
  for (const l of d.layers) if (density(l) >= 0.8) l.mix = Math.min(1, l.mix + dt * 0.5);
}

export function spawnPiece(d: Drink, k: string, sx: number, yaw: number) {
  const def = pieceById.get(k);
  if (!def || d.pieces.length >= MAX_PIECES) return;
  const depth = (Math.random() - 0.5) * 30;
  const w = unproj(sx + (Math.random() - 0.5) * 6, depth, yaw);
  d.pieces.push({
    k, x: w.x, y: 40, z: w.z,
    vx: (Math.random() - 0.5) * 20, vy: 60, vz: (Math.random() - 0.5) * 20,
    rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 6,
    v: Math.random(), inCup: false,
  });
}
