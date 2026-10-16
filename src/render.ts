import { liquidById, pieceById, PieceDef, RGB } from './data';
import { CX, Geom, geom, H, P, proj, rng, TABLE_Y, W } from './geom';
import { Drink, Layer, levels, Levels, liquidMl, Piece, Sticker } from './state';
import { emojiCanvas, stickerCanvas } from './stickers';

export interface PourVis { kind: 'liquid' | 'piece' | 'stir'; id: string; sx: number }
export interface View { yaw: number; t: number; wobble: number; pour: PourVis | null }

// Visible area in logical units; wider/taller than W x H when the stage aspect differs.
let X0 = 0, XW = W, Y0 = 0;
export function setViewport(x0: number, xw: number, y0: number) {
  X0 = x0; XW = xw; Y0 = y0;
}

const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const light = (c: RGB, t: number): RGB => mixRGB(c, [255, 255, 255], t);
const dark = (c: RGB, t: number): RGB => mixRGB(c, [0, 0, 0], t);

interface Band { l: Layer; top: number; bot: number; color: RGB; alpha: number; foam: boolean }

function bands(d: Drink, g: Geom, lv: Levels): Band[] {
  const liq = liquidMl(d);
  if (liq <= 0.5) return [];
  const scale = lv.total / liq;
  // Stirring pulls every (non-foam) color toward the weighted average.
  let avg: RGB = [0, 0, 0];
  let wsum = 0;
  for (const l of d.layers) {
    const L = liquidById.get(l.id)!;
    if (L.density < 0.8) continue;
    const w = l.ml * (0.3 + L.alpha);
    avg = [avg[0] + L.color[0] * w, avg[1] + L.color[1] * w, avg[2] + L.color[2] * w];
    wsum += w;
  }
  if (wsum) avg = [avg[0] / wsum, avg[1] / wsum, avg[2] / wsum];
  const out: Band[] = [];
  let cum = 0;
  for (const l of d.layers) {
    const L = liquidById.get(l.id)!;
    const bot = g.levelY(cum * scale);
    cum += l.ml;
    const top = g.levelY(cum * scale);
    const foam = L.density < 0.8;
    const st = foam ? 0 : d.stir;
    out.push({ l, top, bot, color: mixRGB(L.color, avg, st * st), alpha: L.alpha + (0.95 - L.alpha) * st * 0.6, foam });
  }
  return out;
}

function interiorPath(ctx: CanvasRenderingContext2D, g: Geom, yTop: number) {
  ctx.beginPath();
  ctx.moveTo(CX - g.r(yTop), yTop);
  for (let y = yTop; y <= g.bot; y += 3) ctx.lineTo(CX + g.r(y), y);
  const rb = g.r(g.bot);
  ctx.ellipse(CX, g.bot, rb, rb * P, 0, 0, Math.PI, false);
  for (let y = g.bot; y >= yTop; y -= 3) ctx.lineTo(CX - g.r(y), y);
  ctx.closePath();
}

function outerPath(ctx: CanvasRenderingContext2D, g: Geom) {
  const baseR = g.outer(g.bot - 14) - 2;
  ctx.beginPath();
  ctx.moveTo(CX - g.outer(g.top), g.top);
  for (let y = g.top; y <= g.bot - 14; y += 3) ctx.lineTo(CX + g.outer(y), y);
  ctx.lineTo(CX + baseR, TABLE_Y - 2);
  ctx.ellipse(CX, TABLE_Y - 2, baseR, baseR * P, 0, 0, Math.PI, false);
  for (let y = g.bot - 14; y >= g.top; y -= 3) ctx.lineTo(CX - g.outer(y), y);
  ctx.closePath();
}

// ---------- backgrounds ----------

function drawBg(ctx: CanvasRenderingContext2D, d: Drink, t: number) {
  const r = rng(7);
  switch (d.bg) {
    case 'leo': {
      ctx.fillStyle = '#ffb8dc';
      ctx.fillRect(X0, Y0, XW, H - Y0);
      for (let i = 0; i < 46; i++) {
        const x = X0 + r() * XW, y = Y0 + r() * (H - Y0), s = 6 + r() * 8;
        ctx.fillStyle = '#e0559e';
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.75, r() * 3, 0, Math.PI * 1.6);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#7a1f52';
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'holo': {
      const anyCtx = ctx as CanvasRenderingContext2D & { createConicGradient?: (a: number, x: number, y: number) => CanvasGradient };
      const gr = anyCtx.createConicGradient ? anyCtx.createConicGradient(t * 0.2, CX, 200) : ctx.createLinearGradient(0, 0, W, H);
      ['#ffd1f0', '#c8b6ff', '#a8eaff', '#c4ffd0', '#fff6a8', '#ffd1f0'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c));
      ctx.fillStyle = gr;
      ctx.fillRect(X0, Y0, XW, H - Y0);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      for (let i = 1; i < 14; i++) {
        ctx.beginPath();
        ctx.arc(CX, 200, i * 26, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'night': {
      const gr = ctx.createLinearGradient(0, Y0, 0, H);
      gr.addColorStop(0, '#120a2e'); gr.addColorStop(1, '#3b1d66');
      ctx.fillStyle = gr;
      ctx.fillRect(X0, Y0, XW, H - Y0);
      for (let i = 0; i < 70; i++) {
        const x = X0 + r() * XW, y = Y0 + r() * (H - Y0) * 0.85, ph = r() * 6;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + ph))})`;
        const s = r() < 0.2 ? 3 : 2;
        ctx.fillRect(x | 0, y | 0, s, s);
      }
      break;
    }
    case 'check': {
      const s = 30;
      for (let y = Math.floor(Y0 / s) * s; y < H; y += s) for (let x = Math.floor(X0 / s) * s; x < X0 + XW; x += s) {
        ctx.fillStyle = (((x + y) / s) % 2 + 2) % 2 ? '#ffffff' : '#ffc3e1';
        ctx.fillRect(x, y, s, s);
      }
      break;
    }
    case 'cloud': {
      const gr = ctx.createLinearGradient(0, Y0, 0, H);
      gr.addColorStop(0, '#7fd3ff'); gr.addColorStop(1, '#e3f6ff');
      ctx.fillStyle = gr;
      ctx.fillRect(X0, Y0, XW, H - Y0);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) {
        const x = X0 + ((r() * XW + t * (6 + i * 2)) % (XW + 120)) - 60, y = Y0 + 30 + r() * (260 - Y0);
        for (let k = 0; k < 4; k++) ctx.fillRect(x + k * 12 - 6, y - (k % 3) * 8, 30, 16);
      }
      break;
    }
    case 'myspace': {
      ctx.fillStyle = '#0a1640';
      ctx.fillRect(X0, Y0, XW, H - Y0);
      ctx.fillStyle = '#ff7ad9';
      for (let y = 10 + Math.floor(Y0 / 36) * 36; y < H; y += 36) for (let x = Math.floor(X0 / 36) * 36 + 10 + (((y - 10) / 36) % 2 ? 18 : 0); x < X0 + XW; x += 36) {
        ctx.fillRect(x, y, 3, 3); ctx.fillRect(x - 3, y + 3, 9, 3); ctx.fillRect(x, y + 6, 3, 3);
      }
      ctx.font = '9px "Press Start 2P"';
      ctx.fillStyle = '#8ef0ff';
      ctx.textAlign = 'center';
      ctx.fillText('♥ thx 4 the add ♥', CX, Y0 + 26);
      break;
    }
    case 'flip': {
      const gr = ctx.createLinearGradient(X0, Y0, X0 + XW, H);
      gr.addColorStop(0, '#d9b8ff'); gr.addColorStop(1, '#ff9fd6');
      ctx.fillStyle = gr;
      ctx.fillRect(X0, Y0, XW, H - Y0);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 4; i++) ctx.fillRect(X0 + 16 + i * 8, Y0 + 30 - i * 5, 5, 6 + i * 5);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeRect(X0 + XW - 52, Y0 + 14, 34, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(X0 + XW - 18, Y0 + 19, 4, 6);
      ctx.fillRect(X0 + XW - 48, Y0 + 18, 20, 8);
      break;
    }
    default: {
      ctx.fillStyle = '#c4f0c2';
      ctx.fillRect(X0, Y0, XW, H - Y0);
      ctx.fillStyle = '#a9e0a6';
      for (let x = Math.floor(X0 / 20) * 20; x < X0 + XW; x += 20) ctx.fillRect(x, Y0, 1, H - Y0);
      for (let y = Math.floor(Y0 / 20) * 20; y < H; y += 20) ctx.fillRect(X0, y, XW, 1);
    }
  }
}

function drawTable(ctx: CanvasRenderingContext2D) {
  const top = TABLE_Y - 34;
  const gr = ctx.createLinearGradient(0, top, 0, H);
  gr.addColorStop(0, '#fff3f8'); gr.addColorStop(1, '#ffd9ea');
  ctx.fillStyle = gr;
  ctx.fillRect(X0, top, XW, H - top);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(X0, top, XW, 2);
  ctx.fillStyle = '#ff9cc8';
  ctx.fillRect(X0, H - 12, XW, 12);
  ctx.fillStyle = '#ffc1dd';
  for (let x = Math.floor(X0 / 16) * 16; x < X0 + XW; x += 16) ctx.fillRect(x, H - 12, 8, 3);
}

// ---------- pieces ----------

const POP_COLORS: RGB[] = [[255, 163, 26], [255, 79, 109], [255, 214, 232], [140, 220, 90]];
const MOCHI_COLORS: RGB[] = [[255, 198, 217], [255, 246, 238], [207, 232, 176]];
const SPRINKLES = ['#ff4fa3', '#ffd23f', '#3ec1ff', '#7cf07c', '#b98cff', '#ffffff'];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heartPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 0.9, -s * 0.2, -s * 0.45, -s * 0.85, 0, -s * 0.4);
  ctx.bezierCurveTo(s * 0.45, -s * 0.85, s * 0.9, -s * 0.2, 0, s * 0.35);
  ctx.closePath();
}

// Draws the piece shape at origin; leaves the outline as current path for tinting.
function pieceShape(ctx: CanvasRenderingContext2D, def: PieceDef, p: Piece, t: number) {
  const r = def.r;
  switch (def.id) {
    case 'ic': case 'lj': case 'gj': case 'mg': case 'mo': {
      const s = def.id === 'ic' ? r * 1.55 : r * 1.5;
      roundRect(ctx, -s / 2, -s / 2, s, s, def.id === 'mo' ? s * 0.35 : s * 0.18);
      if (def.id === 'ic') {
        ctx.fillStyle = 'rgba(226,246,255,0.5)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-s * 0.32, -s * 0.34, s * 0.4, 2);
        ctx.fillStyle = 'rgba(150,200,230,0.25)'; ctx.fillRect(-s * 0.1, -s * 0.05, s * 0.4, s * 0.38);
      } else if (def.id === 'gj') {
        ctx.fillStyle = 'rgba(48,34,24,0.92)'; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-s * 0.3, -s * 0.32, s * 0.3, 2);
      } else if (def.id === 'lj') {
        ctx.fillStyle = 'rgba(255,240,245,0.6)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
      } else if (def.id === 'mg') {
        const gr = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
        gr.addColorStop(0, '#ffc845'); gr.addColorStop(1, '#f28b0c');
        ctx.fillStyle = gr; ctx.fill();
      } else {
        const c = MOCHI_COLORS[Math.floor(p.v * 3)];
        const gr = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 1, 0, 0, s * 0.8);
        gr.addColorStop(0, rgba(light(c, 0.5), 1)); gr.addColorStop(1, rgba(dark(c, 0.08), 1));
        ctx.fillStyle = gr; ctx.fill();
      }
      roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.2);
      break;
    }
    case 'ih': {
      const s = r * 1.8;
      heartPath(ctx, s);
      ctx.fillStyle = 'rgba(255,225,238,0.55)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-s * 0.4, -s * 0.35, 4, 2);
      heartPath(ctx, s);
      break;
    }
    case 'ir': {
      const rr = rng(Math.floor(p.v * 1e6));
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2, d = r * (0.7 + rr() * 0.6);
        if (i) ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); else ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(235,250,255,0.6)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.stroke();
      break;
    }
    case 'is': {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 1, 0, 0, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.5, 'rgba(220,244,255,0.4)'); gr.addColorStop(1, 'rgba(180,220,245,0.6)');
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    }
    case 'bo': case 'pb': case 'cb': case 'bb': {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      let c0 = 'rgba(120,72,44,1)', c1 = 'rgba(26,12,5,1)';
      if (def.id === 'pb') { const c = POP_COLORS[Math.floor(p.v * 4)]; c0 = rgba(light(c, 0.4), 0.9); c1 = rgba(c, 0.85); }
      if (def.id === 'cb') { c0 = 'rgba(255,255,255,0.85)'; c1 = 'rgba(220,226,235,0.6)'; }
      if (def.id === 'bb') { c0 = 'rgba(120,130,200,1)'; c1 = 'rgba(30,38,110,1)'; }
      const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 0.5, 0, 0, r);
      gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      ctx.fillStyle = gr; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.4, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    }
    case 'rb': {
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#6e1a1d'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-r * 0.6, -r * 0.4, r * 0.6, 1.2);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.8, 0, 0, Math.PI * 2);
      break;
    }
    case 'st': {
      const s = r * 1.1;
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.bezierCurveTo(-s * 1.2, s * 0.1, -s * 0.9, -s, 0, -s * 0.8);
      ctx.bezierCurveTo(s * 0.9, -s, s * 1.2, s * 0.1, 0, s);
      ctx.closePath();
      ctx.fillStyle = '#e3203d'; ctx.fill();
      ctx.save();
      ctx.scale(0.62, 0.62);
      ctx.fillStyle = '#ff9aa6'; ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff3c4';
      for (let i = 0; i < 6; i++) ctx.fillRect(Math.cos(i) * s * 0.5, Math.sin(i * 1.7) * s * 0.5, 1.5, 2);
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.bezierCurveTo(-s * 1.2, s * 0.1, -s * 0.9, -s, 0, -s * 0.8);
      ctx.bezierCurveTo(s * 0.9, -s, s * 1.2, s * 0.1, 0, s);
      break;
    }
    case 'sk': {
      ctx.fillStyle = SPRINKLES[Math.floor(p.v * SPRINKLES.length)];
      roundRect(ctx, -1.3, -3.5, 2.6, 7, 1.3);
      ctx.fill();
      break;
    }
    case 'gl': {
      ctx.globalAlpha *= 0.5 + 0.5 * Math.abs(Math.sin(t * 4 + p.v * 20));
      ctx.fillStyle = SPRINKLES[Math.floor(p.v * SPRINKLES.length)];
      ctx.fillRect(-1.5, -1.5, 3, 3);
      ctx.beginPath(); ctx.rect(-1.5, -1.5, 3, 3);
      break;
    }
  }
}

function drawPiece(ctx: CanvasRenderingContext2D, p: Piece, yaw: number, t: number, tint?: (y: number, d: number) => string | null) {
  const def = pieceById.get(p.k);
  if (!def) return;
  const pr = proj(p.x, p.y, p.z, yaw);
  const s = 1 + pr.d / 700;
  ctx.save();
  ctx.translate(pr.sx, pr.sy);
  ctx.scale(s, s);
  ctx.rotate(p.rot);
  pieceShape(ctx, def, p, t);
  const tc = tint?.(p.y, pr.d);
  if (tc) {
    ctx.fillStyle = tc;
    ctx.fill();
  }
  ctx.restore();
}

// ---------- glass decorations on the cylinder ----------

function forEachGlassItem(d: Drink, g: Geom, yaw: number, back: boolean, fn: (s: Sticker, x: number, y: number, c: number) => void) {
  for (const s of d.stickers) {
    if (s.on === 'bg') continue;
    const q = s.a + yaw;
    const c = Math.cos(q);
    if (back ? c >= 0 : c < 0) continue;
    if (s.on === 'rim') {
      const R = g.r(g.top) + g.def.wall * 0.5;
      fn(s, CX + R * Math.sin(q), g.top + R * c * P - 4, c);
    } else {
      const R = g.outer(s.y);
      fn(s, CX + R * Math.sin(q), s.y + R * c * P, c);
    }
  }
}

function drawGlassStickers(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, yaw: number, back: boolean) {
  forEachGlassItem(d, g, yaw, back, (s, x, y, c) => {
    const rim = s.on === 'rim';
    const size = (rim ? 30 : 34) * s.s;
    const cv = stickerCanvas(s.k, 64, !rim);
    const k = size / 64;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = back ? (rim ? 0.9 : 0.35 * Math.min(1, -c * 1.5)) : 1;
    ctx.scale(rim ? Math.max(0.35, Math.abs(c)) * k : c * k, k);
    ctx.rotate(s.rot);
    ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
    ctx.restore();
  });
}

function printFill(ctx: CanvasRenderingContext2D, style: string, i: number, h: number): string | CanvasGradient {
  switch (style) {
    case 'pink': return '#ff4fa3';
    case 'black': return '#1a1a1a';
    case 'gold': {
      const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#d4a017'); gr.addColorStop(1, '#fff0a0');
      return gr;
    }
    case 'holo': return `hsl(${(i * 47) % 360},90%,70%)`;
    default: {
      const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#aab2c4'); gr.addColorStop(0.55, '#5b6375'); gr.addColorStop(1, '#eef1f8');
      return gr;
    }
  }
}

function drawPrint(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, yaw: number, back: boolean) {
  const pn = d.print;
  if (!pn || !pn.text) return;
  const size = 24;
  ctx.font = `${size}px "Rubik Bubbles"`;
  const R = g.outer(pn.y) + 0.5;
  const ws = [...pn.text].map((ch) => ctx.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) / R;
  let a = pn.a - total / 2;
  [...pn.text].forEach((ch, i) => {
    const ac = a + ws[i] / R / 2;
    a += ws[i] / R;
    const q = ac + yaw;
    const c = Math.cos(q);
    if (back ? c >= 0 : c < 0) return;
    ctx.save();
    ctx.translate(CX + R * Math.sin(q), pn.y + R * c * P);
    ctx.scale(c, 1);
    ctx.globalAlpha = back ? 0.3 : 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (pn.style !== 'black') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = pn.style === 'pink' ? '#ffffff' : 'rgba(40,40,60,0.6)';
      ctx.strokeText(ch, 0, 0);
    }
    ctx.fillStyle = printFill(ctx, pn.style, i, size);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
}

// ---------- straw & charms ----------

interface StrawPts { bx: number; by: number; tx: number; ty: number; d: number }

function strawPts(g: Geom, yaw: number): StrawPts {
  const a0 = 0.9;
  const rb = g.r(g.bot - 20) * 0.35, rt = g.r(g.top) * 1.0;
  const b = proj(rb * Math.sin(a0), g.bot - 8, rb * Math.cos(a0), yaw);
  const t = proj(rt * Math.sin(a0 + 0.5) * 1.15, g.top - 78, rt * Math.cos(a0 + 0.5) * 1.15, yaw);
  return { bx: b.sx, by: b.sy, tx: t.sx, ty: t.sy, d: (b.d + t.d) / 2 };
}

function drawStraw(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, yaw: number, t: number) {
  if (d.straw === 'none') return;
  const s = strawPts(g, yaw);
  const w = d.straw === 'boba' ? 13 : 9;
  ctx.save();
  ctx.lineCap = 'round';
  const line = (style: string | CanvasGradient, lw: number, dash?: number[]) => {
    ctx.beginPath();
    ctx.moveTo(s.bx, s.by);
    ctx.lineTo(s.tx, s.ty);
    ctx.setLineDash(dash ?? []);
    ctx.strokeStyle = style;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.setLineDash([]);
  };
  switch (d.straw) {
    case 'clear': line('rgba(255,255,255,0.45)', w); line('rgba(255,255,255,0.8)', 2); break;
    case 'pink': line('#ff7ab8', w); line('rgba(255,255,255,0.5)', 2); break;
    case 'boba': line('#1d1d22', w); line('rgba(255,255,255,0.25)', 3); break;
    case 'rainbow': {
      const cols = ['#ff4f6d', '#ffa31a', '#ffe14d', '#5fe07a', '#3ec1ff', '#b98cff'];
      cols.forEach((c, i) => {
        ctx.beginPath(); ctx.moveTo(s.bx, s.by); ctx.lineTo(s.tx, s.ty);
        ctx.setLineDash([8, 8 * (cols.length - 1)]);
        ctx.lineDashOffset = -i * 8;
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
      });
      ctx.setLineDash([]);
      break;
    }
    case 'chrome': {
      const gr = ctx.createLinearGradient(s.bx - 5, 0, s.bx + 5, 0);
      gr.addColorStop(0, '#d9dde8'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#6d7486');
      line(gr, w); line('rgba(255,255,255,0.9)', 2.5);
      break;
    }
    case 'pearl': case 'curly': {
      line(d.straw === 'curly' ? '#ff8fc0' : 'rgba(255,255,255,0.55)', w);
      line('rgba(255,255,255,0.7)', 2);
      if (d.straw === 'curly') {
        // loop near the top
        const mx = s.tx + (s.bx - s.tx) * 0.18, my = s.ty + (s.by - s.ty) * 0.18;
        ctx.beginPath();
        ctx.ellipse(mx + 10, my, 14, 10, 0.3 + Math.sin(t) * 0.05, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff8fc0'; ctx.lineWidth = 7; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        for (let i = 0; i < 9; i++) {
          const k = i / 9 * 0.45;
          const x = s.tx + (s.bx - s.tx) * k, y = s.ty + (s.by - s.ty) * k;
          const gr = ctx.createRadialGradient(x - 2, y - 2, 0.5, x, y, 6);
          gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#e8d8e8');
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
  }
  ctx.restore();
}

function drawCharms(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, yaw: number, t: number, swing: number) {
  if (!d.charms.length) return;
  let ax: number, ay: number;
  if (d.straw !== 'none') {
    const s = strawPts(g, yaw);
    ax = s.tx + (s.bx - s.tx) * 0.1; ay = s.ty + (s.by - s.ty) * 0.1;
  } else {
    const R = g.outer(g.top);
    const pr = proj(R * Math.sin(1.3), g.top, R * Math.cos(1.3), yaw);
    ax = pr.sx; ay = pr.sy;
  }
  d.charms.forEach((c, i) => {
    const L = 24 + i * 10;
    const th = Math.sin(t * 2.1 + i * 1.7) * 0.18 + Math.sin(t * 9) * swing * 0.4;
    const ex = ax + i * 3 + Math.sin(th) * L, ey = ay + Math.cos(th) * L;
    for (let k = 0; k <= 8; k++) {
      const f = k / 8;
      ctx.fillStyle = k % 2 ? '#ffffff' : '#ffb8dc';
      ctx.beginPath();
      ctx.arc(ax + i * 3 + (ex - ax - i * 3) * f, ay + (ey - ay) * f, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    const cv = emojiCanvas(c, 40);
    ctx.save();
    ctx.translate(ex, ey + 9);
    ctx.rotate(th);
    ctx.drawImage(cv, -14, -14, 28, 28 * cv.height / cv.width);
    ctx.restore();
  });
}

// ---------- rim ----------

function drawRim(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, yaw: number, back: boolean) {
  if (d.rim === 'none') return;
  const R = g.r(g.top) + g.def.wall * 0.5;
  const N = d.rim === 'gems' ? 26 : d.rim === 'sugar' ? 160 : d.rim === 'sprk' ? 90 : d.rim === 'gold' ? 44 : 0;
  const rr = rng(99);
  const pt = (a: number) => {
    const q = a + yaw;
    return { x: CX + R * Math.sin(q), y: g.top + R * Math.cos(q) * P, c: Math.cos(q) };
  };
  if (d.rim === 'choc' || d.rim === 'berry' || d.rim === 'sugar') {
    ctx.beginPath();
    ctx.ellipse(CX, g.top, R, R * P, 0, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
    ctx.strokeStyle = d.rim === 'choc' ? '#4a2412' : d.rim === 'berry' ? '#c81d48' : 'rgba(255,255,255,0.95)';
    ctx.lineWidth = d.rim === 'sugar' ? 6 : 7;
    ctx.stroke();
  }
  if (d.rim === 'choc' || d.rim === 'berry') {
    const col = d.rim === 'choc' ? '#4a2412' : '#c81d48';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rr() * 0.3;
      const len = 10 + rr() * 38;
      const p = pt(a);
      if (back ? p.c >= 0 : p.c < 0) continue;
      if (back) continue; // drips run down the outside, only visible in front
      const w = 3 + 5 * p.c;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(p.x - w / 2, p.y);
      ctx.lineTo(p.x - w / 2, p.y + len);
      ctx.arc(p.x, p.y + len, w / 2 + 1, Math.PI, 0, true);
      ctx.lineTo(p.x + w / 2, p.y);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(p.x - w / 4, p.y + 2, 1.2, len - 3);
    }
  }
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const p = pt(a + (d.rim === 'gems' ? 0 : rr() * 0.05));
    const jitter = (rr() - 0.5) * 5;
    if (back ? p.c >= 0 : p.c < 0) continue;
    ctx.globalAlpha = back ? 0.6 : 1;
    if (d.rim === 'sugar') {
      ctx.fillStyle = rr() < 0.5 ? '#ffffff' : '#e8f4ff';
      ctx.fillRect(p.x - 1, p.y + jitter, 2, 2);
    } else if (d.rim === 'sprk') {
      ctx.save();
      ctx.translate(p.x, p.y + jitter);
      ctx.rotate(rr() * 3);
      ctx.fillStyle = SPRINKLES[i % SPRINKLES.length];
      ctx.fillRect(-1.2, -3, 2.4, 6);
      ctx.restore();
    } else if (d.rim === 'gems') {
      const cols = ['#ff7ad9', '#8ef0ff', '#c9a6ff', '#ffffff'];
      const s = 3.4 * (0.7 + 0.3 * Math.abs(p.c));
      const gr = ctx.createRadialGradient(p.x - 1, p.y - 1, 0.3, p.x, p.y, s);
      gr.addColorStop(0, '#fff'); gr.addColorStop(1, cols[i % 4]);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
    } else if (d.rim === 'gold') {
      const s = 2 + rr() * 4;
      ctx.fillStyle = rr() < 0.5 ? '#f7d774' : '#c99a2e';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + jitter - s);
      ctx.lineTo(p.x + s, p.y + jitter + rr() * 8);
      ctx.lineTo(p.x - s * 0.6, p.y + jitter + s);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- glass ----------

const glitterSpecks = (() => {
  const r = rng(2024);
  return Array.from({ length: 170 }, () => ({ a: r() * Math.PI * 2, f: r(), c: ['#ff7ad9', '#ffffff', '#b98cff', '#8ef0ff', '#ffd23f'][Math.floor(r() * 5)] }));
})();
const drops = (() => {
  const r = rng(77);
  return Array.from({ length: 80 }, () => ({ a: r() * Math.PI * 2, f: r(), s: 0.8 + r() * 1.4 }));
})();

function drawGlassBack(ctx: CanvasRenderingContext2D, g: Geom) {
  interiorPath(ctx, g, g.top);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fill();
  const R = g.r(g.top) + g.def.wall * 0.5;
  ctx.beginPath();
  ctx.ellipse(CX, g.top, R, R * P, 0, Math.PI, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(1.5, g.def.wall * 0.6);
  ctx.stroke();
}

function drawGlassFront(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, lv: Levels, yaw: number, t: number, bs: Band[]) {
  const kind = g.def.kind;
  // Thick glass base picks up the color of what sits on it.
  const baseCol = bs.length ? bs[0].color : ([230, 240, 250] as RGB);
  const baseR = g.outer(g.bot - 14) - 2;
  ctx.save();
  outerPath(ctx, g);
  ctx.clip();
  ctx.fillStyle = kind === 'tumbler' ? 'rgba(255,170,220,0.16)' : kind === 'plastic' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.07)';
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, g.bot, 0, TABLE_Y);
  bg.addColorStop(0, rgba(light(baseCol, 0.4), bs.length ? 0.45 : 0.25));
  bg.addColorStop(1, 'rgba(255,255,255,0.35)');
  ctx.fillStyle = bg;
  ctx.fillRect(CX - baseR - 10, g.bot + 2, (baseR + 10) * 2, TABLE_Y - g.bot);

  // Tumbler: glitter floating inside the double wall.
  if (kind === 'tumbler') {
    for (const s of glitterSpecks) {
      const q = s.a + yaw;
      const c = Math.cos(q);
      if (c < 0) continue;
      const y = g.top + 6 + s.f * (g.bot - g.top - 4);
      const R = g.r(y) + g.def.wall * 0.5;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + s.a * 9));
      ctx.fillStyle = s.c;
      ctx.fillRect(CX + R * Math.sin(q) - 1, y + R * c * P - 1, 2.2 * c + 0.5, 2.2);
    }
    ctx.globalAlpha = 1;
  }

  // Fixed studio-light reflections (they don't spin with the cup).
  const rm = g.outer((g.top + g.bot) / 2);
  const hl = ctx.createLinearGradient(CX - rm * 0.78, 0, CX - rm * 0.5, 0);
  hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.5, 'rgba(255,255,255,0.5)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(CX - rm * 0.78, g.top, rm * 0.28, g.bot - g.top);
  const hr = ctx.createLinearGradient(CX + rm * 0.7, 0, CX + rm * 0.86, 0);
  hr.addColorStop(0, 'rgba(255,255,255,0)'); hr.addColorStop(0.6, 'rgba(255,255,255,0.35)'); hr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hr;
  ctx.fillRect(CX + rm * 0.7, g.top, rm * 0.16, g.bot - g.top);
  // Darker refraction at the edges.
  const ed = ctx.createLinearGradient(CX - rm - 8, 0, CX + rm + 8, 0);
  ed.addColorStop(0, 'rgba(40,60,80,0.22)'); ed.addColorStop(0.1, 'rgba(40,60,80,0)'); ed.addColorStop(0.9, 'rgba(40,60,80,0)'); ed.addColorStop(1, 'rgba(40,60,80,0.25)');
  ctx.fillStyle = ed;
  ctx.fillRect(0, g.top, W, TABLE_Y - g.top);

  // Condensation when iced.
  const iced = d.pieces.some((p) => p.inCup && pieceById.get(p.k)?.tab === 'ice');
  if (iced && kind !== 'tumbler') {
    const y0 = Math.max(lv.surface, g.top + 10);
    for (const dr of drops) {
      const q = dr.a + yaw;
      const c = Math.cos(q);
      if (c < 0.25) continue;
      const y = y0 + dr.f * (g.bot - y0);
      const R = g.outer(y);
      const x = CX + R * Math.sin(q), yy = y + R * c * P;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.ellipse(x, yy, dr.s * c, dr.s * 1.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(x - 0.5, yy - dr.s * 0.6, 1, 1);
    }
  }
  ctx.restore();

  // Outline.
  outerPath(ctx, g);
  ctx.strokeStyle = kind === 'plastic' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.8)';
  ctx.lineWidth = kind === 'plastic' ? 1.2 : 1.8;
  ctx.stroke();
  interiorPath(ctx, g, g.top);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (kind === 'jar') {
    for (let i = 0; i < 3; i++) {
      const y = g.top + 5 + i * 6;
      const R = g.outer(y) + 1;
      ctx.beginPath();
      ctx.ellipse(CX, y + 2, R, R * P, -0.04, 0.15, Math.PI - 0.15);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  // Front rim.
  const R = g.r(g.top) + g.def.wall * 0.5;
  ctx.beginPath();
  ctx.ellipse(CX, g.top, R, R * P, 0, 0, Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(2, g.def.wall * 0.7);
  ctx.stroke();
}

// ---------- liquid ----------

function drawLiquid(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, lv: Levels, bs: Band[], yaw: number, t: number, wobble: number) {
  if (!bs.length) return;
  const yTop = lv.surface;
  ctx.save();
  interiorPath(ctx, g, yTop);
  ctx.clip();

  const y0 = yTop, y1 = g.bot + g.r(g.bot) * P + 1;
  const gr = ctx.createLinearGradient(0, y0, 0, y1);
  const off = (y: number) => Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
  const stops: [number, string][] = [];
  for (let i = bs.length - 1; i >= 0; i--) {
    const b = bs[i];
    const above = bs[i + 1];
    const hTop = above && !above.foam ? above.l.mix * 26 : 0;
    const hBot = i > 0 && !b.foam ? b.l.mix * 26 : 0;
    let a = b.top + hTop, z = b.bot - hBot;
    if (i === bs.length - 1) a = y0;
    if (i === 0) z = y1;
    if (a > z) a = z = (b.top + b.bot) / 2;
    stops.push([off(a), rgba(b.color, b.alpha)], [off(z), rgba(b.color, b.alpha)]);
  }
  let last = 0;
  for (const [o, c] of stops) {
    last = Math.max(last, o);
    gr.addColorStop(last, c);
  }
  ctx.fillStyle = gr;
  ctx.fillRect(0, y0 - 2, W, y1 - y0 + 4);

  // Clouds: the upper liquid billowing into the one below.
  for (let i = 1; i < bs.length; i++) {
    const up = bs[i], lo = bs[i - 1];
    const m = up.l.mix * (1 - d.stir);
    if (up.foam || m < 0.18) continue;
    const r = rng(i * 131 + up.l.id.charCodeAt(0));
    const reach = Math.min(90, (lo.bot - lo.top) * 0.9 + 10);
    for (let k = 0; k < 9; k++) {
      const a = r() * Math.PI * 2 + yaw;
      const rr = Math.sqrt(r()) * 0.85;
      const by = up.bot + r() * m * reach + Math.sin(t * 0.6 + k) * 2;
      const bx = CX + Math.sin(a) * g.r(by) * rr + Math.cos(t * 0.4 + k * 2) * 3;
      const rad = 8 + r() * 26 * m;
      const cg = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
      cg.addColorStop(0, rgba(up.color, 0.55 * m));
      cg.addColorStop(1, rgba(up.color, 0));
      ctx.fillStyle = cg;
      ctx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
    }
  }

  // Bubbles in fizzy layers.
  for (const b of bs) {
    if (b.l.id !== 'sw') continue;
    const r = rng(5);
    for (let k = 0; k < 26; k++) {
      const a = r() * Math.PI * 2 + yaw;
      const h = b.bot - b.top;
      const y = b.bot - ((t * (20 + r() * 30) + r() * h) % Math.max(1, h));
      const x = CX + Math.sin(a) * g.r(y) * 0.85;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(x, y, 1 + r() * 1.5, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // Foam texture.
  for (const b of bs) {
    if (!b.foam) continue;
    const r = rng(11);
    const n = Math.min(120, Math.floor((b.bot - b.top) * 4));
    for (let k = 0; k < n; k++) {
      const y = b.top + r() * (b.bot - b.top);
      const x = CX + (r() * 2 - 1) * g.r(y);
      ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.7)' : rgba(dark(b.color, 0.07), 0.6);
      ctx.beginPath(); ctx.arc(x, y, 0.8 + r() * 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Rounded shading across the cylinder.
  const rm = g.r((yTop + g.bot) / 2);
  const sh = ctx.createLinearGradient(CX - rm, 0, CX + rm, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.20)'); sh.addColorStop(0.3, 'rgba(255,255,255,0.06)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.24)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, y0 - 2, W, y1 - y0 + 4);
  ctx.restore();

  // Surface.
  const topB = bs[bs.length - 1];
  const rs = g.r(yTop);
  const ry = rs * P + Math.sin(t * 12) * wobble * 2;
  ctx.beginPath();
  ctx.ellipse(CX, yTop, rs, Math.max(1, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(light(topB.color, topB.foam ? 0.15 : 0.1), Math.min(1, topB.alpha + 0.05));
  ctx.fill();
  if (topB.foam) {
    const r = rng(3);
    for (let k = 0; k < 40; k++) {
      const a = r() * Math.PI * 2;
      const rr = Math.sqrt(r());
      ctx.fillStyle = r() < 0.6 ? 'rgba(255,255,255,0.9)' : rgba(dark(topB.color, 0.06), 0.8);
      ctx.beginPath();
      ctx.arc(CX + Math.cos(a) * rs * rr, yTop + Math.sin(a) * ry * rr - 2, 2 + r() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(CX, yTop, rs, Math.max(1, ry), 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
}

function drawDrips(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, yaw: number, back: boolean) {
  for (const dr of d.drips) {
    const q = dr.a + yaw;
    const c = Math.cos(q);
    if (back ? c >= 0 : c < 0) continue;
    const L = liquidById.get(dr.id);
    if (!L) continue;
    const r = rng(Math.floor(dr.a * 1000));
    const strands = 3;
    for (let k = 0; k < strands; k++) {
      const qa = q + (k - 1) * 0.07;
      const len = dr.len * (0.6 + r() * 0.4);
      ctx.beginPath();
      for (let y = g.top + 3; y < g.top + 3 + len; y += 3) {
        const R = g.r(y) - 1;
        const x = CX + R * Math.sin(qa + Math.sin(y * 0.08 + k) * 0.02);
        const yy = y + R * Math.cos(qa) * P;
        if (y === g.top + 3) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = rgba(L.color, back ? 0.35 : 0.8);
      ctx.lineWidth = 2.5 * Math.max(0.3, Math.abs(c)) + 1;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
}

function drawSpill(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, lv: Levels, yaw: number) {
  if (d.spilled < 2) return;
  const L = liquidById.get(d.spillId);
  const c: RGB = L ? L.color : [200, 230, 200];
  const rx = Math.min(120, 10 + Math.sqrt(d.spilled) * 4.5);
  const pr = proj(70, TABLE_Y + 6, 30, yaw);
  ctx.beginPath();
  ctx.ellipse(pr.sx, TABLE_Y + 8, rx, rx * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(c, 0.75);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(pr.sx - rx * 0.3, TABLE_Y + 6, rx * 0.35, rx * 0.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  // Running over the rim.
  if (lv.surface <= g.top + 2) {
    for (let i = 0; i < 4; i++) {
      const q = -0.6 + i * 0.4;
      const R = g.outer(g.top);
      const x = CX + R * Math.sin(q);
      ctx.strokeStyle = rgba(c, 0.8);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, g.top + R * Math.cos(q) * P);
      ctx.lineTo(CX + g.outer(g.top + 60 + i * 20) * Math.sin(q), g.top + 60 + i * 20 + R * Math.cos(q) * P);
      ctx.stroke();
    }
  }
}

// ---------- effects ----------

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string | CanvasGradient) {
  ctx.save();
  ctx.translate(x, y);
  heartPath(ctx, s);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawFx(ctx: CanvasRenderingContext2D, d: Drink, t: number, layer: 'back' | 'front') {
  const r = rng(42);
  if (layer === 'back') {
    if (d.fx.includes('rainbow')) {
      const cols = ['#ff4f6d', '#ffa31a', '#ffe14d', '#5fe07a', '#3ec1ff', '#b98cff'];
      cols.forEach((c, i) => {
        const rad = 170 - i * 10;
        for (let a = Math.PI; a < Math.PI * 2; a += 0.06) {
          ctx.fillStyle = c;
          ctx.fillRect(CX + Math.cos(a) * rad - 4, 250 + Math.sin(a) * rad - 4, 8, 8);
        }
      });
    }
    if (d.fx.includes('flare')) {
      const gr = ctx.createRadialGradient(60, 60, 0, 60, 60, 120);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.2, 'rgba(255,240,200,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(X0, Y0, XW, H - Y0);
    }
    return;
  }
  if (d.fx.includes('glitter')) {
    for (let i = 0; i < 70; i++) {
      const x = X0 + r() * XW + Math.sin(t + i) * 6, sp = 25 + r() * 40;
      const y = Y0 + ((r() * H + t * sp) % (H - Y0));
      ctx.fillStyle = SPRINKLES[i % SPRINKLES.length];
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 5 + i));
      ctx.fillRect(x | 0, y | 0, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
  if (d.fx.includes('twinkle')) {
    for (let i = 0; i < 14; i++) {
      const x = X0 + r() * XW, y = Y0 + r() * (H - 60 - Y0), ph = r() * 6;
      const s = 3 + 6 * Math.max(0, Math.sin(t * 2.5 + ph));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - s, y - 1, s * 2, 2);
      ctx.fillRect(x - 1, y - s, 2, s * 2);
      ctx.fillStyle = '#ffd1f0';
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }
  if (d.fx.includes('hearts')) {
    for (let i = 0; i < 10; i++) {
      const sp = 20 + r() * 30, x0 = X0 + r() * XW;
      const y = H - ((t * sp + r() * H) % (H - Y0 + 40));
      const x = x0 + Math.sin(t * 1.5 + i) * 12;
      const s = 9 + r() * 10;
      const gr = ctx.createLinearGradient(x - s, y - s, x + s, y + s);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#c0c6d6'); gr.addColorStop(1, '#ff9ad5');
      heart(ctx, x, y, s, gr);
    }
  }
  if (d.fx.includes('bubbles')) {
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const sp = 18 + r() * 25, x0 = X0 + r() * XW;
      const y = H - ((t * sp + r() * H) % (H - Y0 + 20));
      const x = x0 + Math.sin(t + i) * 8;
      const s = 4 + r() * 9;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x - s * 0.5, y - s * 0.5, 2, 2);
    }
  }
  if (d.fx.includes('flare')) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(140, 120); ctx.stroke();
    [[120, 110, 10], [190, 165, 6], [260, 215, 14]].forEach(([x, y, s]) => {
      ctx.fillStyle = 'rgba(200,230,255,0.25)';
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    });
  }
  if (d.fx.includes('butter')) {
    const cv = emojiCanvas('🦋', 40);
    for (let i = 0; i < 4; i++) {
      const x = CX + Math.sin(t * 0.5 + i * 1.6) * 140, y = 120 + Math.sin(t * 0.8 + i * 2.3) * 90;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(Math.abs(Math.sin(t * 8 + i)) * 0.8 + 0.2, 1);
      ctx.drawImage(cv, -12, -12, 24, 24);
      ctx.restore();
    }
  }
}

// ---------- pour visuals ----------

function drawPour(ctx: CanvasRenderingContext2D, d: Drink, g: Geom, lv: Levels, v: View) {
  const pv = v.pour;
  if (!pv) return;
  const x = CX + pv.sx;
  if (pv.kind === 'liquid') {
    const L = liquidById.get(pv.id);
    if (!L) return;
    const outside = Math.abs(pv.sx) > g.r(g.top) - 3;
    const land = outside ? TABLE_Y + 4 : Math.min(lv.surface, g.bot);
    const w = 2 + L.rate / 22;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, 52);
    for (let y = 52; y <= land; y += 6) ctx.lineTo(x - w / 2 + Math.sin(y * 0.15 + v.t * 30) * 0.8, y);
    for (let y = land; y >= 52; y -= 6) ctx.lineTo(x + w / 2 + Math.sin(y * 0.15 + v.t * 30) * 0.8, y);
    ctx.closePath();
    ctx.fillStyle = rgba(L.color, Math.max(0.65, L.alpha));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x - w / 4, 52, 1, land - 52);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = rgba(light(L.color, 0.2), 0.9);
      ctx.beginPath();
      ctx.arc(x + (Math.random() - 0.5) * 26, land - Math.random() * 10, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const cv = emojiCanvas(L.emoji, 64);
    ctx.save();
    ctx.translate(x + 12, 34);
    ctx.rotate(-0.7);
    ctx.drawImage(cv, -20, -20, 40, 40);
    ctx.restore();
  } else if (pv.kind === 'piece') {
    const def = pieceById.get(pv.id);
    if (!def) return;
    const cv = emojiCanvas(def.emoji, 64);
    ctx.drawImage(cv, x - 18, 14 + Math.sin(v.t * 20) * 2, 36, 36);
  } else {
    const tx = x, ty = g.top - 70;
    const bx = CX + pv.sx * 0.5 + Math.sin(v.t * 8) * 20, by = g.bot - 25;
    const gr = ctx.createLinearGradient(tx - 3, 0, tx + 3, 0);
    gr.addColorStop(0, '#9aa2b4'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#6d7486');
    ctx.strokeStyle = gr;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = '#c9cfdb';
    ctx.beginPath(); ctx.ellipse(bx, by, 9, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- scene ----------

export function drawScene(ctx: CanvasRenderingContext2D, d: Drink, v: View, swing = 0) {
  const g = geom(d.cup);
  const lv = levels(d);
  const bs = bands(d, g, lv);
  const { yaw, t } = v;

  drawBg(ctx, d, t);
  drawFx(ctx, d, t, 'back');
  for (const s of d.stickers) {
    if (s.on !== 'bg') continue;
    const cv = stickerCanvas(s.k, 64);
    const size = 40 * s.s / 64;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.scale(size, size);
    ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
    ctx.restore();
  }
  drawTable(ctx);
  drawSpill(ctx, d, g, lv, yaw);

  const outside = d.pieces.filter((p) => !p.inCup).map((p) => ({ p, d: proj(p.x, p.y, p.z, yaw).d }));
  for (const o of outside) if (o.d < 0) drawPiece(ctx, o.p, yaw, t);

  // Contact shadow.
  const so = g.outer(g.bot - 14) + 10;
  ctx.save();
  ctx.translate(CX, TABLE_Y);
  ctx.scale(1, P * 1.6);
  const sg2 = ctx.createRadialGradient(0, 0, so * 0.3, 0, 0, so);
  sg2.addColorStop(0, 'rgba(60,20,50,0.28)'); sg2.addColorStop(1, 'rgba(60,20,50,0)');
  ctx.fillStyle = sg2;
  ctx.beginPath(); ctx.arc(0, 0, so, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  drawGlassBack(ctx, g);
  drawRim(ctx, d, g, yaw, true);
  drawGlassStickers(ctx, d, g, yaw, true);
  drawPrint(ctx, d, g, yaw, true);
  drawDrips(ctx, d, g, yaw, true);
  drawStraw(ctx, d, g, yaw, t);
  drawLiquid(ctx, d, g, lv, bs, yaw, t, v.wobble);

  // Pieces inside: back-to-front, tinted by the liquid they sit in.
  const bandAt = (y: number) => bs.find((b) => y >= b.top && y <= b.bot + 0.01) ?? null;
  const tint = (y: number, dep: number) => {
    if (y < lv.surface) return null;
    const b = bandAt(y);
    if (!b) return null;
    const R = g.r(y);
    const f = Math.min(0.95, Math.max(0.08, 0.1 + (1 - (dep + R) / (2 * R)) * 0.9));
    return rgba(b.color, b.alpha * f * (b.foam ? 1 : 0.95));
  };
  const inside = d.pieces.filter((p) => p.inCup).map((p) => ({ p, d: proj(p.x, p.y, p.z, yaw).d })).sort((a, b) => a.d - b.d);
  for (const o of inside) drawPiece(ctx, o.p, yaw, t, tint);

  // Straw above the surface stays crisp.
  if (d.straw !== 'none' && bs.length) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, lv.surface);
    ctx.clip();
    drawStraw(ctx, d, g, yaw, t);
    ctx.restore();
  }
  drawDrips(ctx, d, g, yaw, false);
  drawGlassFront(ctx, d, g, lv, yaw, t, bs);
  drawRim(ctx, d, g, yaw, false);
  drawPrint(ctx, d, g, yaw, false);
  drawGlassStickers(ctx, d, g, yaw, false);
  for (const o of outside) if (o.d >= 0) drawPiece(ctx, o.p, yaw, t);
  drawCharms(ctx, d, g, yaw, t, swing);
  drawFx(ctx, d, t, 'front');
  drawPour(ctx, d, g, lv, v);
}

// Is the screen point on the glass body? Returns world angle + y if so.
export function hitGlass(d: Drink, x: number, y: number, yaw: number): { a: number; y: number } | null {
  const g = geom(d.cup);
  if (y < g.top + 4 || y > g.bot) return null;
  const R = g.outer(y);
  const s = (x - CX) / R;
  if (Math.abs(s) > 0.97) return null;
  return { a: Math.asin(s) - yaw, y };
}

export function hitRim(d: Drink, x: number, y: number, yaw: number): number | null {
  const g = geom(d.cup);
  const R = g.outer(g.top);
  if (Math.abs(y - g.top) > 14 || Math.abs(x - CX) > R + 6) return null;
  return Math.asin(Math.max(-1, Math.min(1, (x - CX) / R))) - yaw;
}

