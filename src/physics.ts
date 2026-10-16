import { pieceById } from './data';
import { geom, TABLE_Y } from './geom';
import { Drink, levels } from './state';

const G = 1400;

// Returns number of pieces that just landed in liquid (for sound).
export function stepPieces(d: Drink, dt: number, stirring: boolean): number {
  if (!d.pieces.length) return 0;
  const g = geom(d.cup);
  const lv = levels(d);
  const hasLiquid = lv.surface < g.bot - 1;
  const rTop = g.r(g.top);
  let splashes = 0;

  for (const p of d.pieces) {
    const def = pieceById.get(p.k);
    if (!def) continue;
    const r = def.r;
    const prevY = p.y;

    let inLiquid = false;
    if (p.inCup && hasLiquid) {
      if (def.buoy === 'top') inLiquid = p.y > lv.surface - r;
      else inLiquid = p.y > lv.liquidTop;
    }

    if (!inLiquid) {
      p.vy += G * dt;
    } else {
      const depth = g.bot - lv.liquidTop;
      switch (def.buoy) {
        case 'sink': p.vy += 420 * dt; break;
        case 'slow': p.vy += 110 * dt; break;
        case 'float': p.vy += (lv.liquidTop + r * 0.45 - p.y) * 30 * dt; break;
        case 'top': p.vy += (lv.surface - r * 0.2 - p.y) * 30 * dt; break;
        case 'suspend': p.vy += (lv.liquidTop + depth * (0.25 + p.v * 0.4) - p.y) * 6 * dt; break;
      }
      const drag = Math.exp(-5 * dt);
      p.vx *= drag; p.vy *= drag; p.vz *= drag;
      p.vr *= drag;
      if (stirring) {
        p.vx += -p.z * 6 * dt * 10;
        p.vz += p.x * 6 * dt * 10;
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.rot += p.vr * dt;

    if (!p.inCup && prevY < g.top && p.y >= g.top) {
      if (Math.hypot(p.x, p.z) < rTop - r * 0.3) p.inCup = true;
    }
    if (p.inCup && hasLiquid && prevY <= lv.liquidTop && p.y > lv.liquidTop && p.vy > 200) splashes++;

    if (p.inCup) {
      const rMax = Math.max(0, g.r(p.y) - r);
      const R = Math.hypot(p.x, p.z);
      if (R > rMax) {
        const k = rMax / (R || 1);
        p.x *= k; p.z *= k;
        const nx = p.x / (R || 1), nz = p.z / (R || 1);
        const vn = p.vx * nx + p.vz * nz;
        if (vn > 0) { p.vx -= 1.4 * vn * nx; p.vz -= 1.4 * vn * nz; }
      }
      const floor = g.bot - r * 0.8;
      if (p.y > floor) {
        p.y = floor;
        if (p.vy > 0) p.vy *= -0.15;
        p.vx *= 0.9; p.vz *= 0.9; p.vr *= 0.9;
      }
    } else {
      // Outside: bounce off the glass, land on the table.
      const Rm = Math.hypot(p.x, p.z);
      if (p.y > g.top - r && (p.y > g.top || Rm > rTop - r * 0.3)) {
        const R = Rm;
        const out = g.outer(p.y) + r;
        if (R < out) {
          const k = out / (R || 1);
          p.x = (R ? p.x : 1) * k; p.z *= k;
          p.vx *= 0.5; p.vz *= 0.5;
        }
      }
      const floor = TABLE_Y - r * 0.6;
      if (p.y > floor) {
        p.y = floor;
        p.vy *= -0.25;
        p.vx *= 0.8; p.vz *= 0.8; p.vr *= 0.8;
      }
      p.x = Math.max(-170, Math.min(170, p.x));
      p.z = Math.max(-60, Math.min(60, p.z));
    }
  }

  // Simple sphere separation between pieces in the same region.
  const ps = d.pieces;
  for (let it = 0; it < 2; it++) {
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i];
      const ra = pieceById.get(a.k)!.r;
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j];
        if (a.inCup !== b.inCup) continue;
        const rb = pieceById.get(b.k)!.r;
        const min = (ra + rb) * 0.9;
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        if (Math.abs(dx) > min || Math.abs(dy) > min || Math.abs(dz) > min) continue;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist >= min || dist === 0) continue;
        const push = (min - dist) / dist / 2;
        a.x -= dx * push; a.y -= dy * push; a.z -= dz * push;
        b.x += dx * push; b.y += dy * push; b.z += dz * push;
      }
    }
  }
  return splashes;
}
