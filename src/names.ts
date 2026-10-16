import { liquidById } from './data';
import { hashStr, rng } from './geom';
import { Drink } from './state';
import { Taste } from './taste';

// Words that come from what is actually in the cup.
const FLAVOR: Record<string, string[]> = {
  wm: ['Classic', 'Milky', 'Moo Moo', 'Whole Milk', 'Creamy', 'Dairy Diva', 'Old School'],
  om: ['Oat', 'Oatly-Coded', 'Granola Girl', 'Cozy Oat', 'Oat Cloud', 'Oat-Milk Mommy', 'Farmers Market'],
  am: ['Almond', 'Nutty', 'Almond Mom', 'Marzipan', 'Pilates Almond'],
  cm: ['Coconut', 'Coco', 'Island Girl', 'Coco Loco', 'Beach Club', 'Tropical'],
  sm: ['Strawberry', 'Berry Babe', 'Pink Milk', 'Strawberry Shortcake', 'Berry Blush', 'Fraise', 'Strawberry Milkshake'],
  um: ['Ube', 'Purple Haze', 'Ube Dream', 'Violet', 'Galaxy Ube', 'Grape Soda Girl'],
  bm: ['Banana', 'Banana Split', 'Monkey Business', 'Banana Milk', 'Banana Bread', 'Minion'],
  sw: ['Sparkling', 'Fizzy', 'Bubbly', 'Spritz', 'Champagne Problems', 'Fizz Pop'],
  cw: ['Coconut Water', 'Hydration Era', 'Electrolyte', 'Spa Day'],
  va: ['Vanilla', 'Vanilla Bean', 'Vanilla Girl', 'Crème', 'Vanilla Sky', 'Soft Vanilla'],
  ho: ['Honey', 'Honeybee', 'Honey Bun', 'Golden Hour', 'Honey Glazed', 'Bee Mine'],
  bs: ['Brown Sugar', 'Tiger', 'Toffee', 'Molasses', 'Tiger Stripe', 'Caramelized'],
  la: ['Lavender', 'Lavender Haze', 'Lilac', 'Provence', 'Purple Rain', 'Lavender Fields'],
  ro: ['Rose', 'Rosé', 'Rosewater', 'Petal', 'Rose Garden', 'Bouquet'],
  wc: ['White Choc', 'Cocoa Butter', 'Choco Cloud', 'Truffle', 'Ganache'],
  cd: ['Condensed Milk', 'Sweet Cream', 'Dulce', 'Thai-Style', 'Milky Way'],
  ca: ['Caramel', 'Salted Caramel', 'Butterscotch', 'Caramel Drizzle', 'Dulce de Leche'],
  sp: ['Strawberry Jam', 'Berry Crush', 'Strawberry Patch', 'Jammy', 'Berry Swirl', 'Red Velvet'],
  mp: ['Mango', 'Mango Tango', 'Sunset', 'Mango Sticky', 'Golden Mango', 'Tropicana'],
  es: ['Dirty', 'Double Shot', 'Espresso', 'Night Shift', 'Wired', 'Overtime'],
  hj: ['Roasted', 'Toasty', 'Campfire', 'Autumn', 'Smoky'],
  vf: ['Cloud', 'Cold Foam', 'Whipped', 'Fluffy', 'Marshmallow'],
  sf: ['Pink Cloud', 'Cotton Candy', 'Strawberry Cloud', 'Blush Foam'],
  cf: ['Cheesecake', 'Salty Cream', 'Cheese Cloud', 'Salted Cream'],
  mf: ['Double Matcha', 'Green Cloud', 'Matcha Cloud', 'Moss Foam'],
};

const TOPPING: Record<string, string[]> = {
  bo: ['Bubble', 'Pearl', 'Boba', 'Tapioca', 'Bubble Bath'],
  pb: ['Popping', "Poppin'", 'Bursting', 'Pop Rocks', 'Juicy'],
  cb: ['Crystal', 'Diamond', 'Glass', 'Crystal Ball', 'Iced Out'],
  mo: ['Mochi', 'Squishy', 'Mochi Mochi', 'Squish', 'Marshmallowy'],
  rb: ['Red Bean', 'Azuki', 'Kyoto', 'Bean Queen'],
  gj: ['Grass Jelly', 'Jelly', 'Wobbly', 'Jiggly'],
  lj: ['Lychee', 'Lychee Jelly', 'Jelly Bean', 'Wiggly'],
  st: ['Fresh Berry', 'Berry Picked', 'Strawberry Field', 'Farm Fresh'],
  bb: ['Blueberry', 'Blue Moon', 'Berry Blue', 'Blueberry Muffin'],
  mg: ['Mango Chunk', 'Tropical Chunk', 'Sunny'],
  sk: ['Sprinkle', 'Confetti', 'Funfetti', 'Birthday', 'Party'],
  gl: ['Glitter', 'Sparkly', 'Shimmer', 'Disco', 'Holographic'],
  ic: ['Iced', 'On The Rocks', 'Frosty', 'Chilled'],
  ih: ['Heart-Eyes', 'Lovesick', 'Crush', 'Sweetheart'],
  ir: ['Slushy', 'Crushed', 'Frozen', 'Snowcone'],
  is: ['Luxe', 'Whiskey-Glass', 'Bougie', 'Big Ice Energy'],
};

const VIBE = [
  'Y2K', 'Pop Princess', 'Flip Phone', 'Low-Rise', 'Butterfly Clip', 'Lip Gloss', 'Dial-Up', 'MySpace',
  'Tamagotchi', 'Glitter Gel', 'Angel', 'Dollhouse', 'It-Girl', 'Coquette', 'Clean Girl', 'Main Character',
  'That Girl', 'Pilates Princess', 'Hot Girl Walk', 'Soft Launch', 'Hard Launch', 'Delulu', 'Certified',
  'Rizz', 'No Thoughts', 'Velour Tracksuit', 'Frosted', 'Mall Rat', 'Disco', 'Rhinestone', 'Pixel',
  'Gameboy', 'iPod Nano', 'Razr', 'Bedroom Pop', 'Cyber', 'Kawaii', 'Sanrio-Coded', 'Fairycore',
  'Mermaidcore', 'Balletcore', 'Barbiecore', 'Girl Dinner', 'Brat', 'Bimbo Summer', 'Lover Girl',
  'Situationship', 'Bestie', 'Slay', 'Iconic', 'Lowkey', 'Highkey', 'Unhinged', 'Feral',
];
const VIBE_DECO = ['Bedazzled', 'Maximalist', 'Extra', 'Bejeweled', 'Sticker Bomb', 'Decked-Out', 'Blinged-Out', 'Rhinestone Cowgirl'];
const VIBE_HIGH = ['Iconic', 'Legendary', 'Five-Star', 'Award-Winning', 'Perfect', 'Hall of Fame', 'Chef’s Kiss', 'Elite'];
const SUFFIX = ['Era', 'Moment', 'Core', 'Energy', 'Situation', 'Dream', 'Fantasy', 'Supreme', 'Deluxe', 'XOXO', '4 Life', '2000', '™', 'Deluxe Edition', 'Remix', 'Special', '(Taylor’s Version)', 'Forever', 'Club', 'Party'];

const ROAST: Record<string, string[]> = {
  nomatcha: ['Matcha-less Milk Moment', 'Where’s The Matcha Latte', 'Identity Crisis Milk', 'Matcha (Allegedly)', 'Not A Matcha Latte', 'Missing Matcha Report', 'Fraud Latte', 'Catfish Matcha'],
  sweet: ['Sugar Crash Speedrun', 'Dentist’s Nightmare', 'Cavity Cloud', 'Pure Syrup Situation', 'Diabetes Any% Latte', 'Insulin Spike Supreme', 'Sugar Rush Hour', 'Syrup With A Hint Of Drink'],
  bitter: ['Lawn Clippings Espresso', 'Swamp Water Supreme', 'Grass Smoothie Of Regret', 'Pond Scum Deluxe', 'Bitter Ex Latte', 'Shrek’s Bathwater', 'Mowed Lawn Shot', 'Photosynthesis Punishment'],
  spill: ['Flood Warning Latte', 'Spill Era', 'Puddle Princess', 'Tsunami Matcha', 'Clean Up Aisle 5', 'Wet Floor Sign'],
  jaw: ['Jaw Workout', 'Boba Avalanche', 'Chewing Simulator', 'Topping Landslide', 'Dentures Destroyer', 'Is This Soup?'],
  empty: ['Air Matcha Lite', 'Vibes Only (Empty)', 'Half-Cup Hypothesis', 'Invisible Latte', 'Shrinkflation Special', 'Sample Size'],
  curdle: ['Curdle Catastrophe', 'Fizzy Milk Felony', 'Lab Accident Latte', 'Science Fair Project', 'Cottage Cheese Soda'],
  chaos: ['Flavor Chaos Theory', 'Everything Bagel Latte', 'Syrup Tornado', 'Group Chat Argument', 'Kitchen Sink Special'],
  ice: ['Literally Just Ice', 'Ice Ice Baby', 'Glacier With A Splash', 'Antarctica Latte'],
  foamy: ['Bubble Bath Latte', 'Foam Party', 'All Foam No Drink', 'Cloud With A Rumor Of Tea'],
};

const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

const EMOJI_BY: Record<string, string> = {
  sm: '🍓', sp: '🍓', st: '🍓', um: '🍠', bm: '🍌', cm: '🥥', cw: '🥥', mp: '🥭', mg: '🥭', ho: '🍯', la: '💜', ro: '🌹',
  bs: '🐯', ca: '🍮', es: '☕', sw: '🫧', vf: '☁️', sf: '🩷', cf: '🧀', bo: '🧋', mo: '🍡', sk: '🌈', gl: '✨', wc: '🤍',
};

export function drinkName(d: Drink, ts: Taste, seedStr: string): { name: string; emoji: string } {
  const r = rng(hashStr(seedStr));
  if (ts.empty) return { name: 'Empty Cup (Ambitious)', emoji: '🫥' };

  // Low scores get roasted for their worst problem.
  if (ts.score < 4.5) {
    const order = ['nomatcha', 'curdle', 'sweet', 'bitter', 'empty', 'jaw', 'chaos', 'ice', 'foamy', 'spill'];
    const f = order.find((k) => ts.flags.has(k));
    if (f) return { name: pick(r, ROAST[f]), emoji: '💀' };
  }

  // Ingredients ranked by how much they define the drink.
  const flavors = [...ts.ml.entries()]
    .filter(([id, v]) => v > 5 && id !== 'mc' && id !== 'mu' && FLAVOR[id])
    .map(([id, v]) => [id, v * (liquidById.get(id)!.tab === 'sweet' ? 6 : 1)] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const tops = [...ts.pieces.entries()].filter(([id, n]) => n >= 2 && TOPPING[id]).sort((a, b) => b[1] - a[1]);

  const get = (id: string) => ts.ml.get(id) ?? 0;
  const tea = get('mc') + get('mu');
  let core = tea > 0 ? 'Matcha' : get('hj') > 0 ? 'Hojicha' : 'Mystery';
  if (get('hj') > tea && tea > 0) core = 'Hoji-Matcha';
  if (get('es') > 10 && tea > 0) core = pick(r, ['Dirty Matcha', 'Matcha', 'Dirty Matcha']);

  const milk = ['wm', 'om', 'am', 'cm', 'sm', 'um', 'bm'].some((id) => get(id) > 20);
  const foam = ['vf', 'sf', 'cf', 'mf'].some((id) => get(id) > 10);
  const boba = (ts.pieces.get('bo') ?? 0) + (ts.pieces.get('pb') ?? 0) + (ts.pieces.get('cb') ?? 0) > 5;
  const formats: string[] = [];
  if (get('sw') > 30 && !milk) formats.push('Tonic', 'Spritz', 'Fizz', 'Soda');
  if (milk) formats.push('Latte', 'Latte', 'Milk', 'Au Lait');
  if (foam) formats.push('Cloud', 'Float', 'Cream Top');
  if (boba) formats.push('Boba', 'Bubble Tea', 'Milk Tea');
  if (!formats.length) formats.push('Shot', 'Brew', 'Elixir', 'Potion');
  const format = pick(r, formats);

  const deco = d.stickers.length + d.charms.length + d.fx.length + (d.rim !== 'none' ? 1 : 0);
  const vibe = ts.score >= 9 && r() < 0.5 ? pick(r, VIBE_HIGH) : deco >= 6 && r() < 0.5 ? pick(r, VIBE_DECO) : pick(r, VIBE);
  const fl = flavors.length ? pick(r, FLAVOR[flavors[0][0]]) : '';
  const fl2 = flavors.length > 1 ? pick(r, FLAVOR[flavors[1][0]]) : '';
  const tp = tops.length ? pick(r, TOPPING[tops[0][0]]) : '';

  const options: string[] = [];
  if (fl) options.push(`${vibe} ${fl} ${core} ${format}`, `${fl} ${core} ${format}`, `${fl} ${format} ${pick(r, SUFFIX)}`);
  if (fl && fl2 && fl !== fl2) options.push(`${fl} ${fl2} ${core}`, `${fl2} ${fl} ${format}`);
  if (fl && tp) options.push(`${fl} ${tp} ${core}`, `${tp} ${fl} ${format}`);
  if (tp) options.push(`${vibe} ${tp} ${core} ${format}`, `${tp} ${core} ${pick(r, SUFFIX)}`);
  options.push(`The ${vibe} ${core}`, `${vibe} ${core} ${format}`, `${core} ${format} ${pick(r, SUFFIX)}`);

  // Prefer names that fit on a card.
  const fitting = options.filter((n) => n.length <= 34);
  let name = pick(r, fitting.length ? fitting : options);
  name = name.replace(/\b(\w+) \1\b/gi, '$1').replace(/\s+/g, ' ').trim();

  const emoji = EMOJI_BY[flavors[0]?.[0] ?? ''] ?? EMOJI_BY[tops[0]?.[0] ?? ''] ?? '🍵';
  return { name, emoji };
}
