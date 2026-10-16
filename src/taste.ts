import { liquidById, pieceById } from './data';
import { geom } from './geom';
import { dispMl, Drink } from './state';

export interface Note { txt: string; delta: number }

export interface Taste {
  score: number;
  verdict: string;
  notes: Note[];
  flags: Set<string>;
  empty: boolean;
  sweet: number;
  bitter: number;
  creamy: number;
  matchaShare: number;
  ml: Map<string, number>;
  pieces: Map<string, number>;
  tags: Set<string>;
  fill: number;
}

const PAIRS: [string, string, number, string][] = [
  ['matcha', 'strawberry', 0.7, 'Strawberry x matcha = iconic duo'],
  ['matcha', 'coconut', 0.4, 'Coconut + matcha, tropical queen'],
  ['matcha', 'honey', 0.4, 'Honey rounds out the grassiness'],
  ['matcha', 'oat', 0.3, 'Oat milk + matcha, a classic'],
  ['matcha', 'vanilla', 0.3, 'Vanilla softens the bitterness'],
  ['matcha', 'choco', 0.4, 'White choc + matcha = dessert'],
  ['matcha', 'floral', 0.2, 'Floral notes, very fancy'],
  ['matcha', 'mango', 0.4, 'Mango matcha, summer in a cup'],
  ['matcha', 'coffee', 0.2, 'Dirty matcha, for the brave'],
  ['matcha', 'ube', 0.3, 'Ube + matcha, the purple-green moment'],
  ['matcha', 'redbean', 0.4, 'Red bean + matcha, very Kyoto'],
  ['matcha', 'mochi', 0.3, 'Mochi + matcha, made for each other'],
  ['ube', 'coconut', 0.5, 'Ube + coconut, perfect match'],
  ['hojicha', 'caramel', 0.6, 'Hojicha + caramel, cozy season'],
  ['hojicha', 'oat', 0.3, 'Hojicha oat latte, cozy'],
  ['hojicha', 'honey', 0.3, 'Hojicha + honey, toasty sweet'],
  ['strawberry', 'vanilla', 0.2, 'Strawberries & cream vibes'],
  ['coffee', 'strawberry', -0.9, 'Espresso + strawberry... why'],
  ['coffee', 'fizz', -0.8, 'Fizzy espresso is a choice'],
  ['coffee', 'mango', -0.7, 'Mango + espresso do not get along'],
  ['floral', 'caramel', -0.6, 'Floral + caramel clash'],
  ['floral', 'coconut', -0.3, 'Lavender + coconut is confusing'],
  ['salty', 'fruit', -0.4, 'Cheese foam + fruit, mixed signals'],
  ['banana', 'floral', -0.5, 'Banana + flowers, no'],
  ['mango', 'choco', -0.4, 'Mango + white choc is a lot'],
  ['banana', 'coffee', -0.3, 'Banana espresso, hmm'],
  ['rose', 'ube', -0.3, 'Rose + ube, too perfume-y'],
];

const VERDICTS: [number, string][] = [
  [9.5, 'PERFECTION'],
  [8.5, 'SLAY'],
  [7.5, 'SO GOOD'],
  [6.5, 'SOLID'],
  [5.5, 'MID'],
  [4.5, 'HMMM'],
  [3, 'QUESTIONABLE'],
  [1.5, 'CRIME'],
  [0, 'CALL 911'],
];

export function verdictFor(score: number) {
  return VERDICTS.find(([min]) => score >= min)![1];
}

export function taste(d: Drink): Taste {
  const ml = new Map<string, number>();
  for (const l of d.layers) ml.set(l.id, (ml.get(l.id) ?? 0) + l.ml);
  const pieces = new Map<string, number>();
  for (const p of d.pieces) if (p.inCup) pieces.set(p.k, (pieces.get(p.k) ?? 0) + 1);

  const V = [...ml.values()].reduce((a, b) => a + b, 0);
  const g = geom(d.cup);
  const disp = dispMl(d);
  const fill = (V + disp) / g.capacity;

  const tags = new Set<string>();
  for (const [id, v] of ml) if (v > 5) liquidById.get(id)!.tags.forEach((t) => tags.add(t));
  for (const [id, n] of pieces) if (n >= 2) pieceById.get(id)!.tags.forEach((t) => tags.add(t));

  const notes: Note[] = [];
  const flags = new Set<string>();
  const note = (txt: string, delta: number, flag?: string) => {
    notes.push({ txt, delta });
    if (flag) flags.add(flag);
  };

  const base: Taste = {
    score: 0, verdict: 'EMPTY CUP', notes, flags, empty: true,
    sweet: 0, bitter: 0, creamy: 0, matchaShare: 0, ml, pieces, tags, fill,
  };
  if (V < 5) {
    if (pieces.size) note('Just toppings? Add some liquid', 0, 'empty');
    return base;
  }

  let S = 0, B = 0, C = 0;
  for (const [id, v] of ml) {
    const L = liquidById.get(id)!;
    S += L.sweet * v; B += L.bitter * v; C += L.creamy * v;
  }
  S /= V; B /= V; C /= V;
  const get = (id: string) => ml.get(id) ?? 0;
  const matcha = get('mc') + get('mu') + get('mf') * 0.3;
  const tea = matcha + get('hj');
  const share = tea / V;
  const pb = B - 0.22 * S - 0.12 * C;
  const milk = get('wm') + get('om') + get('am') + get('cm') + get('sm') + get('um') + get('bm');
  const foam = get('vf') + get('sf') + get('cf') + get('mf');
  const sweeteners = ['va', 'ho', 'bs', 'la', 'ro', 'wc', 'cd', 'ca', 'sp', 'mp'];
  const syrupMl = sweeteners.reduce((s, id) => s + get(id), 0);
  const nSyrups = sweeteners.filter((id) => get(id) > 5).length;

  let score = 5.8;
  const add = (txt: string, delta: number, flag?: string) => {
    score += delta;
    note(txt, delta, flag);
  };

  // Matcha presence
  if (tea < 1) add('No matcha?? This is a matcha game 🚨', -4, 'nomatcha');
  else if (share < 0.07) add('Barely any matcha, basically milk', -1.5, 'weak');
  else if (share >= 0.1 && share <= 0.38) add('Great matcha ratio', 1.2);
  else if (share > 0.6 && milk < 10) {
    if (V < 160) add('Straight matcha, purist energy', 0.3);
    else add("That's a LOT of straight matcha", -0.6);
  }

  // Bitterness
  if (pb > 3.2) add('Way too bitter', -Math.min(3, (pb - 3.2) * 0.9), 'bitter');
  else if (tea >= 1 && pb > -1.5 && pb < 1.8) add('Bitterness balanced', 0.8);

  // Sweetness
  if (S > 9) add('Sugar overload', -Math.min(4.5, (S - 6) * 0.45), 'sweet');
  else if (S > 6) add('A bit too sweet', -0.6 * (S - 6) / 3 - 0.3, 'sweetish');
  else if (S >= 1.8) add('Perfect sweetness', 0.8);
  else if (S < 1 && C > 2) add('Kinda flat, needs a touch of sweet', -0.3);

  // Fill level
  if (fill < 0.3) add('Half-empty cup energy', -Math.min(2.4, (0.3 - fill) * 8), 'empty');
  else if (fill >= 0.75) add('Nicely filled', 0.3);

  // Spills
  if (d.spilled > 25) add(`You spilled ${Math.round(d.spilled)}ml 💦`, -Math.min(1.5, d.spilled / 200), 'spill');

  // Syrup chaos
  if (nSyrups >= 3) add('Too many syrups fighting', -(nSyrups - 2) * 0.7, 'chaos');

  // Fizz rules
  if (get('sw') > 20 && milk > 40) add('Sparkling + milk = curdle vibes', -2, 'curdle');
  else if (get('sw') > 40 && matcha > 20 && milk < 10) add('Matcha tonic, chef’s kiss', 0.8);

  // Pairings
  for (const [a, b, delta, txt] of PAIRS) if (tags.has(a) && tags.has(b)) add(txt, delta);

  // Toppings
  let chew = 0, sprinkles = 0, ice = 0;
  for (const [id, n] of pieces) {
    const def = pieceById.get(id)!;
    if (def.chew) chew += n;
    if (id === 'sk') sprinkles += n;
    if (def.tab === 'ice') ice += n * def.disp;
  }
  if (chew > 45) add(`Jaw workout: ${chew} chewy bits`, -Math.min(2.5, (chew - 45) * 0.04), 'jaw');
  else if (chew >= 8) add('Nice chewy toppings', 0.4);
  if (sprinkles > 20 && foam < 15) add('Soggy sprinkles (put them on foam)', -0.3);

  // Ice
  const iceShare = ice / (V + disp);
  if (iceShare > 0.55) add("It's basically just ice", -1.2, 'ice');
  else if (iceShare > 0.1 && iceShare < 0.4) add('Perfectly iced', 0.3);

  // Foam
  if (foam > 0.45 * V) add('More foam than drink', -0.8, 'foamy');
  else if (foam >= 20) add('Cloud-level foam', 0.3);

  // Stirring
  if (syrupMl > 15) {
    if (d.stir > 0.6) add('Well stirred, syrup dissolved', 0.3);
    else if (d.stir < 0.2) add('Syrup sitting at the bottom (stir it!)', -0.2);
  }

  score = Math.max(0, Math.min(10, score));
  if (flags.has('nomatcha')) score = Math.min(score, 3.5);
  score = Math.round(score * 10) / 10;
  notes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    ...base, score, verdict: verdictFor(score), empty: false,
    sweet: S, bitter: pb, creamy: C, matchaShare: share,
  };
}
