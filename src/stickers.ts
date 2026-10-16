import { TEXT_STICKERS } from './data';

// Pre-rendered die-cut stickers (white outline around the art), cached per key.
const cache = new Map<string, HTMLCanvasElement>();

export const textStickerById = new Map(TEXT_STICKERS.map((t) => [t.id, t]));

export function clearStickerCache() {
  cache.clear();
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function stickerCanvas(key: string, size: number, outline = true): HTMLCanvasElement {
  const ck = `${key}|${size}|${outline}`;
  const hit = cache.get(ck);
  if (hit) return hit;

  const ts = textStickerById.get(key);
  const pad = Math.ceil(size * 0.18);
  const art = document.createElement('canvas');
  const actx = art.getContext('2d')!;

  if (ts) {
    const font = ts.style === 'pixel' ? `${Math.round(size * 0.42)}px "Press Start 2P"` : `${Math.round(size * 0.62)}px "Rubik Bubbles"`;
    actx.font = font;
    const tw = Math.ceil(actx.measureText(ts.text).width);
    art.width = tw + pad * 2;
    art.height = Math.ceil(size * 0.8) + pad * 2;
    actx.font = font;
    actx.textAlign = 'center';
    actx.textBaseline = 'middle';
    const cx = art.width / 2, cy = art.height / 2 + 1;
    let fill: string | CanvasGradient = '#ff4fa3';
    if (ts.style === 'chrome') {
      const gr = actx.createLinearGradient(0, cy - size * 0.35, 0, cy + size * 0.35);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#9aa3b5'); gr.addColorStop(0.55, '#5d6577'); gr.addColorStop(1, '#e8ecf5');
      fill = gr;
    } else if (ts.style === 'holo') {
      const gr = actx.createLinearGradient(0, 0, art.width, art.height);
      ['#ff9ad5', '#b49bff', '#8ee7ff', '#a8ffb0', '#fff59a'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c));
      fill = gr;
    } else if (ts.style === 'pixel') fill = '#1b3a1b';
    actx.lineJoin = 'round';
    actx.lineWidth = Math.max(2, size * 0.08);
    actx.strokeStyle = ts.style === 'pixel' ? '#ff8fc0' : '#d0307f';
    if (ts.style !== 'pixel') actx.strokeText(ts.text, cx, cy);
    actx.fillStyle = fill;
    actx.fillText(ts.text, cx, cy);
  } else {
    art.width = size + pad * 2;
    art.height = size + pad * 2;
    actx.font = `${size}px ${EMOJI_FONT}`;
    actx.textAlign = 'center';
    actx.textBaseline = 'middle';
    actx.fillText(key, art.width / 2, art.height / 2 + size * 0.06);
  }

  if (!outline) {
    cache.set(ck, art);
    return art;
  }

  // White silhouette dilated around the art = die-cut border.
  const sil = document.createElement('canvas');
  sil.width = art.width; sil.height = art.height;
  const sctx = sil.getContext('2d')!;
  sctx.drawImage(art, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = '#fff';
  sctx.fillRect(0, 0, sil.width, sil.height);

  const out = document.createElement('canvas');
  out.width = art.width; out.height = art.height;
  const o = out.getContext('2d')!;
  const rad = Math.max(2, Math.round(size * 0.09));
  o.shadowColor = 'rgba(0,0,0,0.25)';
  o.shadowBlur = 3;
  o.shadowOffsetY = 1;
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    o.drawImage(sil, Math.cos(ang) * rad, Math.sin(ang) * rad);
  }
  o.shadowColor = 'transparent';
  o.drawImage(art, 0, 0);
  cache.set(ck, out);
  return out;
}

// Plain emoji (no border), e.g. for charms, pitchers, effects.
export function emojiCanvas(e: string, size: number) {
  return stickerCanvas(e, size, false);
}
