import './style.css';
import * as sfx from './audio';
import { BGS, CHARMS, CLIPS, CUPS, FX, liquidById, LIQUIDS, pieceById, PIECES, PRINT_STYLES, RIMS, STICKERS, STRAWS, TEXT_STICKERS } from './data';
import { CX, geom, H, P, W } from './geom';
import { cleanNick, fetchToday, online, submitEntry } from './leaderboard';
import { drinkName } from './names';
import { stepPieces } from './physics';
import { drawScene, hitGlass, hitRim, PourVis, setViewport } from './render';
import { decodeDrink, encodeDrink, remixUrl, renderCard, saveCard } from './share';
import { clone, Drink, levels, liquidMl, newDrink, pour, PourSession, settleOverflow, spawnPiece, stirStep } from './state';
import { clearStickerCache } from './stickers';
import { taste, Taste } from './taste';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

type ToolKind = 'pour' | 'drop' | 'sticker' | 'clip' | 'peel' | 'stir';
interface Tool { kind: ToolKind; id: string }

let d: Drink = newDrink();
const history: Drink[] = [];
let tool: Tool | null = null;
let yaw = 0.35, yawVel = 0;
let wobble = 0, swing = 0;
let t = 0;
let ts: Taste = taste(d);
let tab = 'matcha';

// pointer state
let holding = false, spinning = false;
let px = CX, lastX = 0, lastT = 0;
let session: PourSession = { layer: null, passed: [] };
let spawnAcc = 0;
let pouredThisHold = 0;
let lastPlop = 0;

const cv = $<HTMLCanvasElement>('cv');
const ctx = cv.getContext('2d')!;
const mini = $<HTMLCanvasElement>('mini');
const mctx = mini.getContext('2d')!;
let scale = 1, dpr = 1;

function snapshot() {
  history.push(clone(d));
  if (history.length > 40) history.shift();
}

// ---------- toast ----------
let toastTimer = 0;
function toast(msg: string, ms = 2200) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), ms);
}

// ---------- tabs & items ----------

interface Item { key: string; emoji: string; label: string; txt?: boolean; on?: () => boolean; act: () => void }

const tabs: { id: string; label: string; items: () => Item[] }[] = [
  { id: 'cup', label: 'CUP', items: () => CUPS.map((c) => radio(c.id, c.emoji, c.name, () => d.cup === c.id, () => { snapshot(); d.cup = c.id; settleOverflow(d); })) },
  { id: 'matcha', label: 'MATCHA', items: () => liquids('matcha') },
  { id: 'milk', label: 'MILK', items: () => liquids('milk') },
  { id: 'ice', label: 'ICE', items: () => pieces('ice') },
  { id: 'sweet', label: 'SWEET', items: () => liquids('sweet') },
  { id: 'foam', label: 'FOAM', items: () => liquids('foam') },
  { id: 'top', label: 'TOPPINGS', items: () => pieces('top') },
  { id: 'straw', label: 'STRAW', items: () => STRAWS.map((s) => radio(s.id, s.emoji, s.name, () => d.straw === s.id, () => { snapshot(); d.straw = s.id; })) },
  {
    id: 'sticker', label: 'STICKERS', items: () => [
      toolItem('peel', 'peel', '🧽', 'PEEL'),
      ...TEXT_STICKERS.map((s) => ({ ...toolItem('sticker', s.id, s.text, s.text), txt: true })),
      ...STICKERS.map((e) => toolItem('sticker', e, e, '')),
    ],
  },
  { id: 'clip', label: 'CLIPS', items: () => [toolItem('peel', 'peel', '🧽', 'PEEL'), ...CLIPS.map((e) => toolItem('clip', e, e, 'CLIP'))] },
  {
    id: 'charm', label: 'CHARMS', items: () => [
      { key: 'clear', emoji: '✂️', label: 'CLEAR', act: () => { snapshot(); d.charms = []; } },
      ...CHARMS.map((c) => ({
        key: c, emoji: c, label: '', on: () => d.charms.includes(c),
        act: () => {
          snapshot();
          if (d.charms.includes(c)) d.charms = d.charms.filter((x) => x !== c);
          else { d.charms.push(c); if (d.charms.length > 5) d.charms.shift(); }
          swing = 1;
        },
      })),
    ],
  },
  { id: 'rim', label: 'RIM', items: () => RIMS.map((r) => radio(r.id, r.emoji, r.name, () => d.rim === r.id, () => { snapshot(); d.rim = r.id; })) },
  {
    id: 'name', label: 'NAME', items: () => [
      { key: 'print', emoji: '✏️', label: d.print ? 'EDIT NAME' : 'PRINT NAME', act: openPrint },
      ...PRINT_STYLES.map((s) => radio(s.id, s.emoji, s.name, () => d.print?.style === s.id, () => {
        if (!d.print) { openPrint(); return; }
        snapshot(); d.print.style = s.id;
      })),
    ],
  },
  {
    id: 'fx', label: 'FX', items: () => FX.map((f) => ({
      key: f.id, emoji: f.emoji, label: f.name, on: () => d.fx.includes(f.id),
      act: () => { snapshot(); d.fx = d.fx.includes(f.id) ? d.fx.filter((x) => x !== f.id) : [...d.fx, f.id]; },
    })),
  },
  { id: 'bg', label: 'BG', items: () => BGS.map((b) => radio(b.id, b.emoji, b.name, () => d.bg === b.id, () => { snapshot(); d.bg = b.id; })) },
];

function radio(key: string, emoji: string, label: string, on: () => boolean, act: () => void): Item {
  return { key, emoji, label, on, act };
}

function toolItem(kind: ToolKind, id: string, emoji: string, label: string): Item {
  return {
    key: kind + id, emoji, label,
    on: () => tool?.kind === kind && tool.id === id,
    act: () => setTool(tool?.kind === kind && tool.id === id ? null : { kind, id }),
  };
}

function liquids(tabId: string): Item[] {
  return LIQUIDS.filter((l) => l.tab === tabId).map((l) => toolItem('pour', l.id, l.emoji, l.name));
}
function pieces(tabId: string): Item[] {
  return PIECES.filter((p) => p.tab === tabId).map((p) => toolItem('drop', p.id, p.emoji, p.name));
}

function renderTabs() {
  const el = $('tabs');
  el.innerHTML = '';
  for (const tb of tabs) {
    const b = document.createElement('button');
    b.textContent = tb.label;
    if (tb.id === tab) b.className = 'on';
    b.onclick = () => { sfx.blip(); tab = tb.id; renderTabs(); renderItems(); };
    el.appendChild(b);
  }
}

function renderItems() {
  const el = $('items');
  el.innerHTML = '';
  const tb = tabs.find((x) => x.id === tab)!;
  for (const it of tb.items()) {
    const b = document.createElement('button');
    b.className = 'chip' + (it.on?.() ? ' on' : '');
    const e = document.createElement('span');
    e.className = 'e' + (it.txt ? ' txt' : '');
    e.textContent = it.emoji;
    b.appendChild(e);
    if (it.label && !it.txt) b.appendChild(document.createTextNode(it.label.toUpperCase()));
    b.onclick = () => { sfx.unlockAudio(); sfx.blip(); it.act(); renderItems(); updateHint(); };
    el.appendChild(b);
  }
}

function setTool(tl: Tool | null) {
  tool = tl;
  $('aSpin').classList.toggle('on', !tool);
  $('aStir').classList.toggle('on', tool?.kind === 'stir');
  updateHint();
  renderItems();
}

function updateHint(extra?: string) {
  let h = 'SWIPE THE GLASS TO SPIN IT';
  if (extra) h = extra;
  else if (tool) {
    switch (tool.kind) {
      case 'pour': h = `HOLD TO POUR ${liquidById.get(tool.id)!.name.toUpperCase()} · MIDDLE MIXES, EDGE LAYERS`; break;
      case 'drop': h = `HOLD TO DROP ${pieceById.get(tool.id)!.name.toUpperCase()}`; break;
      case 'sticker': h = 'TAP THE GLASS OR BACKGROUND TO STICK IT'; break;
      case 'clip': h = 'TAP THE RIM TO CLIP IT ON'; break;
      case 'peel': h = 'TAP A STICKER TO PEEL IT OFF'; break;
      case 'stir': h = 'HOLD + WIGGLE TO STIR'; break;
    }
  }
  $('hint').textContent = h;
}

// ---------- print dialog ----------
let printStyle = 'chrome';
function openPrint() {
  const dlg = $('printDlg');
  const inp = $<HTMLInputElement>('pText');
  inp.value = d.print?.text ?? '';
  printStyle = d.print?.style ?? 'chrome';
  const st = $('pStyles');
  const draw = () => {
    st.innerHTML = '';
    for (const s of PRINT_STYLES) {
      const b = document.createElement('button');
      b.className = 'chip' + (s.id === printStyle ? ' on' : '');
      b.innerHTML = `<span class="e">${s.emoji}</span>${s.name.toUpperCase()}`;
      b.onclick = () => { printStyle = s.id; draw(); };
      st.appendChild(b);
    }
  };
  draw();
  dlg.hidden = false;
  setTimeout(() => inp.focus(), 50);
}
$('pOk').onclick = () => {
  const text = $<HTMLInputElement>('pText').value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 14);
  if (!text) { toast('Type a name first!'); return; }
  snapshot();
  const g = geom(d.cup);
  d.print = { text, style: printStyle, y: Math.round(g.top + (g.bot - g.top) * 0.42), a: -yaw };
  $('printDlg').hidden = true;
  sfx.stick();
  renderItems();
};
$('pDel').onclick = () => { snapshot(); d.print = null; $('printDlg').hidden = true; renderItems(); };
$('pClose').onclick = () => { $('printDlg').hidden = true; };

// ---------- canvas sizing & input ----------

let vx0 = 0, vy0 = 0, vw = W;

// The canvas fills the whole stage; extra room becomes background on the sides / above.
function resize() {
  const st = $('stage');
  const sw = st.clientWidth, sh = st.clientHeight;
  if (!sw || !sh) return;
  scale = sw / sh > W / H ? sh / H : sw / W;
  vw = sw / scale;
  vx0 = -(vw - W) / 2;
  vy0 = -(sh / scale - H);
  dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.style.width = `${sw}px`;
  cv.style.height = `${sh}px`;
  cv.width = Math.round(sw * dpr);
  cv.height = Math.round(sh * dpr);
  mini.width = 180 * dpr;
  mini.height = 240 * dpr;
}
new ResizeObserver(resize).observe($('stage'));

function toLogical(e: PointerEvent) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale + vx0, y: (e.clientY - r.top) / scale + vy0 };
}

function stickerScreen(s: Drink['stickers'][number]) {
  if (s.on === 'bg') return { x: s.x, y: s.y, front: true };
  const g = geom(d.cup);
  const q = s.a + yaw;
  const R = s.on === 'rim' ? g.r(g.top) : g.outer(s.y);
  const y = s.on === 'rim' ? g.top : s.y;
  return { x: CX + R * Math.sin(q), y: y + R * Math.cos(q) * P, front: Math.cos(q) > -0.1 };
}

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sfx.unlockAudio();
  cv.setPointerCapture(e.pointerId);
  const p = toLogical(e);
  px = p.x;
  lastX = p.x; lastT = performance.now();

  if (!tool) {
    spinning = true;
    yawVel = 0;
    return;
  }
  switch (tool.kind) {
    case 'pour': case 'drop': case 'stir':
      snapshot();
      holding = true;
      session = { layer: null, passed: [] };
      spawnAcc = 1;
      pouredThisHold = 0;
      if (tool.kind === 'pour') sfx.pourStart();
      break;
    case 'sticker': case 'clip': {
      if (d.stickers.length >= 80) { toast('Sticker limit reached, peel some off!'); return; }
      snapshot();
      const rot = (Math.random() - 0.5) * 0.6;
      const rimA = tool.kind === 'clip' ? hitRim(d, p.x, p.y, yaw) : null;
      const gl = hitGlass(d, p.x, p.y, yaw);
      if (rimA !== null) d.stickers.push({ k: tool.id, on: 'rim', a: rimA, x: 0, y: 0, rot: rot * 0.5, s: 1 });
      else if (gl) d.stickers.push({ k: tool.id, on: 'glass', a: gl.a, x: 0, y: gl.y, rot, s: tool.id.startsWith('t') ? 0.9 : 1 });
      else d.stickers.push({ k: tool.id, on: 'bg', a: 0, x: p.x, y: p.y, rot, s: 1 });
      sfx.stick();
      break;
    }
    case 'peel': {
      let best = -1, bd = 30 * 30;
      d.stickers.forEach((s, i) => {
        const sp = stickerScreen(s);
        if (!sp.front) return;
        const dd = (sp.x - p.x) ** 2 + (sp.y - p.y) ** 2;
        if (dd < bd) { bd = dd; best = i; }
      });
      if (best >= 0) { snapshot(); d.stickers.splice(best, 1); sfx.blip(); }
      break;
    }
  }
});

cv.addEventListener('pointermove', (e) => {
  const p = toLogical(e);
  if (spinning) {
    const now = performance.now();
    const dx = p.x - lastX;
    yaw += dx * 0.022;
    yawVel = (dx * 0.022) / Math.max(0.008, (now - lastT) / 1000);
    lastX = p.x; lastT = now;
  }
  px = p.x;
});

const endPointer = () => {
  if (holding && tool?.kind === 'pour') sfx.pourStop();
  if (holding && pouredThisHold > 0.5) updateHint();
  holding = false;
  spinning = false;
  session = { layer: null, passed: [] };
};
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);

// Spin on the result preview too.
let miniDrag = false, miniX = 0;
mini.addEventListener('pointerdown', (e) => { miniDrag = true; miniX = e.clientX; mini.setPointerCapture(e.pointerId); yawVel = 0; });
mini.addEventListener('pointermove', (e) => { if (miniDrag) { yaw += (e.clientX - miniX) * 0.03; miniX = e.clientX; } });
mini.addEventListener('pointerup', () => (miniDrag = false));

// ---------- actions ----------

$('aUndo').onclick = () => {
  const prev = history.pop();
  if (prev) { d = prev; sfx.blip(); renderItems(); } else toast('Nothing to undo');
};
$('aSpin').onclick = () => { sfx.blip(); setTool(null); };
$('aStir').onclick = () => { sfx.blip(); setTool(tool?.kind === 'stir' ? null : { kind: 'stir', id: 'spoon' }); };
$('aNew').onclick = () => {
  if (!liquidMl(d) && !d.pieces.length && !d.stickers.length) return;
  snapshot();
  const keep = { cup: d.cup, bg: d.bg };
  d = { ...newDrink(), ...keep };
  sfx.blip();
  toast('Fresh glass! (UNDO brings it back)');
  renderItems();
};
$('btnSound').onclick = () => {
  sfx.setMuted(!sfx.isMuted());
  $('btnSound').textContent = sfx.isMuted() ? '🔇' : '🔊';
};
$('btnSound').textContent = sfx.isMuted() ? '🔇' : '🔊';

// ---------- serve / result ----------

const seedOf = (dr: Drink) =>
  dr.cup + '|' + dr.layers.map((l) => l.id + Math.round(l.ml)).join(',') + '|' +
  [...taste(dr).pieces.entries()].map(([k, n]) => k + n).sort().join(',') + '|' + dr.stickers.length + dr.charms.length + dr.fx.length;

let current: { name: string; emoji: string; code: string } | null = null;
let posted = false;

$('aServe').onclick = async () => {
  const tt = taste(d);
  if (tt.empty) { toast('Pour something first! 🍵'); return; }
  setTool(null);
  const nm = drinkName(d, tt, seedOf(d));
  current = { ...nm, code: await encodeDrink(d) };
  posted = false;
  $('rName').textContent = `${nm.emoji} ${nm.name}`;
  $('rScore').textContent = `${tt.score.toFixed(1)}`;
  const f = $('rFill');
  f.style.width = `${tt.score * 10}%`;
  f.classList.toggle('bad', tt.score < 4.5);
  $('rVerdict').textContent = tt.verdict;
  const ul = $('rNotes');
  ul.innerHTML = '';
  for (const n of tt.notes.slice(0, 5)) {
    const li = document.createElement('li');
    li.textContent = `${n.delta > 0 ? '＋' : n.delta < 0 ? '－' : '·'} ${n.txt}`;
    ul.appendChild(li);
  }
  try { $<HTMLInputElement>('rNick').value = localStorage.getItem('mm_nick') ?? ''; } catch { /* ignore */ }
  $('rPost').textContent = '🏆 POST';
  $('result').hidden = false;
  sfx.fanfare();
};
$('rBack').onclick = () => { $('result').hidden = true; };

$('rCard').onclick = async () => {
  if (!current) return;
  const card = renderCard(d, taste(d), current.name, current.emoji, yaw, t);
  await saveCard(card, current.name);
};

$('rLink').onclick = async () => {
  if (!current) return;
  const url = remixUrl(current.code);
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    try { await nav.share({ url, title: current.name, text: `Remix my matcha: ${current.name} 🍵` }); return; } catch { /* fall through */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Remix link copied! 🔗');
  } catch {
    window.prompt('Copy your remix link:', url);
  }
};

$('rPost').onclick = async () => {
  if (!current || posted) return;
  const nick = cleanNick($<HTMLInputElement>('rNick').value);
  if (!nick) { toast('Pick a (nice) name first'); return; }
  try { localStorage.setItem('mm_nick', nick); } catch { /* ignore */ }
  $('rPost').textContent = '...';
  try {
    await submitEntry(nick, taste(d).score, current.code);
    posted = true;
    $('rPost').textContent = '✓ POSTED';
    toast(online ? 'Posted to today’s board! 🏆' : 'Saved to this device’s board');
  } catch {
    $('rPost').textContent = '🏆 POST';
    toast('Could not post, try again');
  }
};

// ---------- leaderboard ----------

$('btnBoard').onclick = openBoard;
$('bClose').onclick = () => { $('board').hidden = true; };

async function openBoard() {
  sfx.blip();
  $('board').hidden = false;
  $('bSub').textContent = online ? 'resets at 00:00 UTC · tap one to remix' : 'local mode: only drinks from this device';
  const ol = $('bList');
  ol.innerHTML = '<li>loading...</li>';
  try {
    const rows = await fetchToday();
    ol.innerHTML = '';
    if (!rows.length) ol.innerHTML = '<li>No drinks yet today. Be the first!</li>';
    rows.forEach((r, i) => {
      const tt = taste(r.drink);
      const nm = drinkName(r.drink, tt, seedOf(r.drink));
      const li = document.createElement('li');
      const rank = document.createElement('span');
      rank.className = 'rk';
      rank.textContent = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`;
      const name = document.createElement('span');
      name.className = 'nm';
      name.textContent = `${nm.emoji} ${nm.name}`;
      const by = document.createElement('small');
      by.textContent = `by ${r.nickname}`;
      name.appendChild(by);
      const sc = document.createElement('span');
      sc.className = 'sc';
      sc.textContent = r.score.toFixed(1);
      li.append(rank, name, sc);
      li.onclick = () => {
        snapshot();
        d = r.drink;
        $('board').hidden = true;
        toast(`Remixing ${r.nickname}'s drink!`);
        renderItems();
      };
      ol.appendChild(li);
    });
  } catch {
    ol.innerHTML = '<li>Could not load the board 😿</li>';
  }
}

// ---------- meter ----------

function updateMeter() {
  ts = taste(d);
  const f = $('fill');
  f.style.width = `${ts.empty ? 0 : ts.score * 10}%`;
  f.classList.toggle('bad', !ts.empty && ts.score < 4.5);
  $('score').textContent = ts.empty ? '-.-' : ts.score.toFixed(1);
  const top = ts.notes[0];
  $('note').textContent = ts.empty
    ? 'EMPTY CUP · pick something below'
    : `${ts.verdict} · ${top ? (top.delta > 0 ? '＋ ' : top.delta < 0 ? '－ ' : '') + top.txt : ''}`;
}

// ---------- main loop ----------

let last = performance.now();
let meterAcc = 0;
let clockAcc = 99;

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;

  const g = geom(d.cup);
  let pv: PourVis | null = null;
  const sx = px - CX;

  if (holding && tool) {
    if (tool.kind === 'pour') {
      const L = liquidById.get(tool.id)!;
      const ml = L.rate * dt;
      pour(d, tool.id, ml, sx, yaw, session);
      pouredThisHold += ml;
      wobble = 1;
      swing = Math.max(swing, 0.3);
      const fill = (liquidMl(d)) / g.capacity;
      sfx.pourUpdate(fill);
      updateHint(`+${Math.round(pouredThisHold)}ml ${L.name.toUpperCase()} · ${Math.round(Math.min(1, levels(d).total / g.capacity) * 100)}% FULL`);
      pv = { kind: 'liquid', id: tool.id, sx };
    } else if (tool.kind === 'drop') {
      const def = pieceById.get(tool.id)!;
      spawnAcc += def.rate * dt;
      while (spawnAcc >= 1) {
        spawnPiece(d, tool.id, sx, yaw);
        spawnAcc -= 1;
      }
      pv = { kind: 'piece', id: tool.id, sx };
    } else if (tool.kind === 'stir') {
      stirStep(d, dt);
      wobble = Math.max(wobble, 0.5);
      swing = 0.6;
      pv = { kind: 'stir', id: 'spoon', sx };
    }
  }

  settleOverflow(d);
  const splashes = stepPieces(d, dt, holding && tool?.kind === 'stir');
  if (splashes && now - lastPlop > 70) { sfx.plop(); lastPlop = now; }

  if (!spinning) {
    yaw += yawVel * dt;
    yawVel *= Math.exp(-2.5 * dt);
    if (!$('result').hidden && !miniDrag) yaw += 0.7 * dt;
  }
  wobble *= Math.exp(-2.5 * dt);
  swing *= Math.exp(-1.5 * dt);

  meterAcc += dt;
  if (meterAcc > 0.15) { meterAcc = 0; updateMeter(); }
  clockAcc += dt;
  if (clockAcc > 10) {
    clockAcc = 0;
    $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const s = scale * dpr;
  ctx.setTransform(s, 0, 0, s, -vx0 * s, -vy0 * s);
  setViewport(vx0, vw, vy0);
  drawScene(ctx, d, { yaw, t, wobble, pour: pv }, swing);
  setViewport(0, W, 0);

  if (!$('result').hidden) {
    const ms = (180 / W) * dpr;
    mctx.setTransform(ms, 0, 0, ms, 0, 0);
    drawScene(mctx, d, { yaw, t, wobble: 0, pour: null }, swing);
  }
  requestAnimationFrame(frame);
}

// ---------- boot ----------

async function boot() {
  renderTabs();
  renderItems();
  updateHint();
  resize();
  try {
    await Promise.race([
      Promise.all(['10px "Press Start 2P"', '20px "Rubik Bubbles"', '16px VT323'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts are cosmetic */ }
  clearStickerCache();
  document.fonts?.addEventListener?.('loadingdone', clearStickerCache);

  const m = location.hash.match(/#d=([\w-]+)/);
  if (m) {
    const rd = await decodeDrink(m[1]);
    if (rd) {
      d = rd;
      toast("Remix mode! This is a friend's drink. Make it yours ✨", 3500);
      renderItems();
    }
  }
  requestAnimationFrame((n) => { last = n; frame(n); });
}

boot();
