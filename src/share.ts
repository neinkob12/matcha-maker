import { CUPS, BGS, CHARMS, FX, liquidById, pieceById, PRINT_STYLES, RIMS, STRAWS } from './data';
import { H, W } from './geom';
import { drawScene } from './render';
import { Drink, newDrink, Sticker } from './state';
import { Taste } from './taste';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

function toCompact(d: Drink) {
  return {
    c: d.cup, b: d.bg, r: d.rim, s: d.straw,
    l: d.layers.map((l) => [l.id, r1(l.ml), r2(l.mix)]),
    sp: r1(d.spilled), si: d.spillId,
    dr: d.drips.map((q) => [q.id, r2(q.a), Math.round(q.len)]),
    p: d.pieces.map((p) => [p.k, r1(p.x), r1(p.y), r1(p.z), r1(p.rot), r2(p.v), p.inCup ? 1 : 0]),
    st: d.stickers.map((s) => [s.k, s.on, r2(s.a), Math.round(s.x), Math.round(s.y), r2(s.rot), r2(s.s)]),
    ch: d.charms, fx: d.fx, sr: r2(d.stir),
    pn: d.print ? [d.print.text, d.print.style, Math.round(d.print.y), r2(d.print.a)] : null,
  };
}

const num = (v: unknown, lo: number, hi: number, dflt = 0) => {
  const n = typeof v === 'number' && isFinite(v) ? v : dflt;
  return Math.max(lo, Math.min(hi, n));
};
const oneOf = <T extends { id: string }>(v: unknown, list: T[], dflt: string) =>
  typeof v === 'string' && list.some((x) => x.id === v) ? v : dflt;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// Never trust a shared link: every field is validated and clamped.
function fromCompact(o: any): Drink {
  const d = newDrink();
  d.cup = oneOf(o?.c, CUPS, 'gl');
  d.bg = oneOf(o?.b, BGS, 'mint');
  d.rim = oneOf(o?.r, RIMS, 'none');
  d.straw = oneOf(o?.s, STRAWS, 'none');
  d.layers = arr(o?.l).slice(0, 40).filter((l: any) => Array.isArray(l) && liquidById.has(l[0]))
    .map((l: any) => ({ id: l[0], ml: num(l[1], 0, 2000), mix: num(l[2], 0, 1) }));
  d.spilled = num(o?.sp, 0, 99999);
  d.spillId = typeof o?.si === 'string' && liquidById.has(o.si) ? o.si : '';
  d.drips = arr(o?.dr).slice(0, 24).filter((q: any) => Array.isArray(q) && liquidById.has(q[0]))
    .map((q: any) => ({ id: q[0], a: num(q[1], -10, 10), len: num(q[2], 0, 400) }));
  d.pieces = arr(o?.p).slice(0, 260).filter((p: any) => Array.isArray(p) && pieceById.has(p[0]))
    .map((p: any) => ({
      k: p[0], x: num(p[1], -200, 200), y: num(p[2], 0, H), z: num(p[3], -200, 200),
      vx: 0, vy: 0, vz: 0, rot: num(p[4], -100, 100), vr: 0, v: num(p[5], 0, 0.999), inCup: p[6] === 1,
    }));
  d.stickers = arr(o?.st).slice(0, 80).filter((s: any) => Array.isArray(s) && typeof s[0] === 'string' && s[0].length <= 16)
    .map((s: any): Sticker => ({
      k: s[0], on: s[1] === 'glass' || s[1] === 'rim' ? s[1] : 'bg',
      a: num(s[2], -10, 10), x: num(s[3], 0, W), y: num(s[4], 0, H), rot: num(s[5], -4, 4), s: num(s[6], 0.4, 2.5, 1),
    }));
  d.charms = arr(o?.ch).filter((c): c is string => typeof c === 'string' && CHARMS.includes(c)).slice(0, 5);
  d.fx = arr(o?.fx).filter((f): f is string => typeof f === 'string' && FX.some((x) => x.id === f));
  d.stir = num(o?.sr, 0, 1);
  if (Array.isArray(o?.pn) && typeof o.pn[0] === 'string') {
    d.print = {
      text: o.pn[0].slice(0, 16),
      style: oneOf(o.pn[1], PRINT_STYLES, 'chrome'),
      y: num(o.pn[2], 0, H, 280),
      a: num(o.pn[3], -10, 10),
    };
  }
  return d;
}

const b64url = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream as unknown as TransformStream<Uint8Array, Uint8Array>));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeDrink(d: Drink): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toCompact(d)));
  if (typeof CompressionStream !== 'undefined') {
    return 'z' + b64url(await pipe(json, new CompressionStream('deflate-raw')));
  }
  return 'j' + b64url(json);
}

export async function decodeDrink(s: string): Promise<Drink | null> {
  try {
    let bytes = unb64url(s.slice(1));
    if (s[0] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (s[0] !== 'j') return null;
    if (bytes.length > 200_000) return null;
    return fromCompact(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

export function remixUrl(code: string) {
  return `${location.origin}${location.pathname}#d=${code}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// 9:16 share card for TikTok / Stories.
export function renderCard(d: Drink, ts: Taste, name: string, emoji: string, yaw: number, t: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 1080; cv.height = 1920;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#c4f0c2';
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = 'rgba(27,58,27,0.06)';
  for (let y = 0; y < 1920; y += 6) ctx.fillRect(0, y, 1080, 2);
  ctx.strokeStyle = '#1b3a1b';
  ctx.lineWidth = 16;
  ctx.strokeRect(24, 24, 1032, 1872);

  ctx.textAlign = 'center';
  ctx.font = '64px "Press Start 2P"';
  ctx.fillStyle = '#1b3a1b';
  ctx.fillText('MATCHA MAKER', 546, 156);
  ctx.fillStyle = '#ff4fa3';
  ctx.fillText('MATCHA MAKER', 540, 150);

  const sx = 72, sy = 210, sc = 936 / W;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(sc, sc);
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  drawScene(ctx, d, { yaw, t, wobble: 0, pour: null });
  ctx.restore();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#1b3a1b';
  ctx.strokeRect(sx, sy, 936, H * sc);

  ctx.font = '40px "Press Start 2P"';
  ctx.fillStyle = '#1b3a1b';
  const lines = wrap(ctx, `${emoji} ${name}`, 960);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 540, 1560 + i * 58));

  const by = 1560 + Math.min(3, lines.length) * 58 + 30;
  ctx.font = '30px "Press Start 2P"';
  ctx.fillStyle = '#1b3a1b';
  ctx.fillText(`TASTE ${ts.score.toFixed(1)}/10 · ${ts.verdict}`, 540, by);
  ctx.fillStyle = '#e8fff0';
  ctx.fillRect(120, by + 24, 840, 44);
  ctx.strokeStyle = '#1b3a1b';
  ctx.lineWidth = 8;
  ctx.strokeRect(120, by + 24, 840, 44);
  ctx.fillStyle = '#ff4fa3';
  const fw = 840 * ts.score / 10;
  for (let x = 0; x < fw - 4; x += 24) ctx.fillRect(124 + x, by + 28, Math.min(18, fw - x - 4), 36);

  ctx.font = '22px "Press Start 2P"';
  ctx.fillStyle = '#1b3a1b';
  ctx.fillText(`make yours @ ${location.host}`, 540, 1850);
  return cv;
}

export async function saveCard(cv: HTMLCanvasElement, name: string) {
  const blob: Blob | null = await new Promise((res) => cv.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], `${name.replace(/[^\w]+/g, '-').toLowerCase() || 'matcha'}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
