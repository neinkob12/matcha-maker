// All game content: liquids, pieces, decorations, cups, backgrounds.

export type RGB = [number, number, number];

export interface Liquid {
  id: string;
  name: string;
  emoji: string;
  tab: 'matcha' | 'milk' | 'sweet' | 'foam';
  color: RGB;
  alpha: number;
  density: number; // heavier sinks below lighter layers
  rate: number; // ml per second while holding
  sweet: number; // per-ml intensity
  bitter: number;
  creamy: number;
  tags: string[];
}

export const LIQUIDS: Liquid[] = [
  // matcha + bases
  { id: 'mc', name: 'Ceremonial', emoji: '🍵', tab: 'matcha', color: [104, 160, 44], alpha: 0.93, density: 1.0, rate: 45, sweet: 0, bitter: 8, creamy: 0, tags: ['matcha'] },
  { id: 'mu', name: 'Culinary', emoji: '🌿', tab: 'matcha', color: [128, 146, 56], alpha: 0.94, density: 1.0, rate: 45, sweet: 0, bitter: 9.5, creamy: 0, tags: ['matcha'] },
  { id: 'hj', name: 'Hojicha', emoji: '🍂', tab: 'matcha', color: [140, 88, 44], alpha: 0.9, density: 1.0, rate: 45, sweet: 0.5, bitter: 4, creamy: 0, tags: ['hojicha', 'roast'] },
  { id: 'es', name: 'Espresso', emoji: '☕', tab: 'matcha', color: [58, 32, 18], alpha: 0.96, density: 1.0, rate: 35, sweet: 0, bitter: 10, creamy: 0, tags: ['coffee', 'roast'] },
  { id: 'sw', name: 'Sparkling', emoji: '🫧', tab: 'matcha', color: [226, 244, 250], alpha: 0.22, density: 0.99, rate: 60, sweet: 0, bitter: 0, creamy: 0, tags: ['fizz'] },
  { id: 'cw', name: 'Coco Water', emoji: '🥥', tab: 'matcha', color: [240, 244, 236], alpha: 0.3, density: 1.0, rate: 60, sweet: 1.5, bitter: 0, creamy: 0, tags: ['coconut'] },
  // milks
  { id: 'wm', name: 'Whole Milk', emoji: '🥛', tab: 'milk', color: [248, 245, 236], alpha: 0.97, density: 1.03, rate: 70, sweet: 1.5, bitter: 0, creamy: 7, tags: ['dairy'] },
  { id: 'om', name: 'Oat Milk', emoji: '🌾', tab: 'milk', color: [240, 228, 205], alpha: 0.96, density: 1.03, rate: 70, sweet: 2, bitter: 0, creamy: 6, tags: ['oat'] },
  { id: 'am', name: 'Almond', emoji: '🌰', tab: 'milk', color: [244, 236, 222], alpha: 0.94, density: 1.02, rate: 70, sweet: 1, bitter: 0, creamy: 4, tags: ['nutty'] },
  { id: 'cm', name: 'Coconut', emoji: '🥥', tab: 'milk', color: [252, 251, 246], alpha: 0.96, density: 1.02, rate: 70, sweet: 2, bitter: 0, creamy: 6, tags: ['coconut'] },
  { id: 'sm', name: 'Strawb Milk', emoji: '🍓', tab: 'milk', color: [246, 182, 198], alpha: 0.96, density: 1.04, rate: 70, sweet: 5, bitter: 0, creamy: 6, tags: ['strawberry', 'dairy'] },
  { id: 'um', name: 'Ube Milk', emoji: '🍠', tab: 'milk', color: [178, 146, 214], alpha: 0.96, density: 1.04, rate: 70, sweet: 4, bitter: 0, creamy: 6, tags: ['ube', 'dairy'] },
  { id: 'bm', name: 'Banana Milk', emoji: '🍌', tab: 'milk', color: [246, 228, 156], alpha: 0.96, density: 1.04, rate: 70, sweet: 5, bitter: 0, creamy: 6, tags: ['banana', 'dairy'] },
  // sweeteners
  { id: 'va', name: 'Vanilla', emoji: '🍦', tab: 'sweet', color: [238, 214, 160], alpha: 0.8, density: 1.3, rate: 22, sweet: 40, bitter: 0, creamy: 0, tags: ['vanilla'] },
  { id: 'ho', name: 'Honey', emoji: '🍯', tab: 'sweet', color: [224, 160, 30], alpha: 0.85, density: 1.4, rate: 18, sweet: 38, bitter: 0, creamy: 0, tags: ['honey'] },
  { id: 'bs', name: 'Brown Sugar', emoji: '🐯', tab: 'sweet', color: [104, 54, 20], alpha: 0.92, density: 1.35, rate: 20, sweet: 40, bitter: 0, creamy: 0, tags: ['caramel', 'roast'] },
  { id: 'la', name: 'Lavender', emoji: '💜', tab: 'sweet', color: [182, 160, 228], alpha: 0.75, density: 1.3, rate: 22, sweet: 30, bitter: 0, creamy: 0, tags: ['floral'] },
  { id: 'ro', name: 'Rose', emoji: '🌹', tab: 'sweet', color: [240, 150, 178], alpha: 0.75, density: 1.3, rate: 22, sweet: 30, bitter: 0, creamy: 0, tags: ['floral', 'rose'] },
  { id: 'wc', name: 'White Choc', emoji: '🤍', tab: 'sweet', color: [244, 234, 212], alpha: 0.95, density: 1.3, rate: 20, sweet: 35, bitter: 0, creamy: 10, tags: ['choco'] },
  { id: 'cd', name: 'Condensed', emoji: '🥫', tab: 'sweet', color: [242, 230, 196], alpha: 0.95, density: 1.35, rate: 18, sweet: 35, bitter: 0, creamy: 15, tags: ['dairy'] },
  { id: 'ca', name: 'Caramel', emoji: '🍮', tab: 'sweet', color: [196, 112, 36], alpha: 0.9, density: 1.35, rate: 18, sweet: 38, bitter: 0, creamy: 2, tags: ['caramel'] },
  { id: 'sp', name: 'Strawb Purée', emoji: '🍓', tab: 'sweet', color: [210, 40, 70], alpha: 0.95, density: 1.2, rate: 25, sweet: 15, bitter: 0, creamy: 0, tags: ['strawberry', 'fruit'] },
  { id: 'mp', name: 'Mango Purée', emoji: '🥭', tab: 'sweet', color: [250, 176, 40], alpha: 0.95, density: 1.2, rate: 25, sweet: 16, bitter: 0, creamy: 0, tags: ['mango', 'fruit'] },
  // foams
  { id: 'vf', name: 'Cold Foam', emoji: '☁️', tab: 'foam', color: [255, 252, 244], alpha: 1, density: 0.5, rate: 40, sweet: 6, bitter: 0, creamy: 10, tags: ['foam', 'vanilla'] },
  { id: 'sf', name: 'Pink Foam', emoji: '🩷', tab: 'foam', color: [255, 206, 220], alpha: 1, density: 0.5, rate: 40, sweet: 7, bitter: 0, creamy: 10, tags: ['foam', 'strawberry'] },
  { id: 'cf', name: 'Cheese Foam', emoji: '🧀', tab: 'foam', color: [255, 242, 210], alpha: 1, density: 0.5, rate: 40, sweet: 4, bitter: 0, creamy: 12, tags: ['foam', 'salty'] },
  { id: 'mf', name: 'Matcha Foam', emoji: '💚', tab: 'foam', color: [196, 222, 150], alpha: 1, density: 0.5, rate: 40, sweet: 4, bitter: 3, creamy: 10, tags: ['foam', 'matcha'] },
];

export type Buoy = 'float' | 'sink' | 'slow' | 'suspend' | 'top';

export interface PieceDef {
  id: string;
  name: string;
  emoji: string;
  tab: 'ice' | 'top';
  r: number;
  buoy: Buoy;
  disp: number; // ml displaced
  rate: number; // pieces per second
  chew: boolean;
  tags: string[];
}

export const PIECES: PieceDef[] = [
  { id: 'ic', name: 'Ice Cubes', emoji: '🧊', tab: 'ice', r: 13, buoy: 'float', disp: 18, rate: 5, chew: false, tags: ['ice'] },
  { id: 'ih', name: 'Heart Ice', emoji: '💗', tab: 'ice', r: 13, buoy: 'float', disp: 16, rate: 5, chew: false, tags: ['ice'] },
  { id: 'ir', name: 'Crushed', emoji: '❄️', tab: 'ice', r: 6, buoy: 'float', disp: 4, rate: 22, chew: false, tags: ['ice'] },
  { id: 'is', name: 'Ice Sphere', emoji: '🔮', tab: 'ice', r: 22, buoy: 'float', disp: 60, rate: 2, chew: false, tags: ['ice'] },
  { id: 'bo', name: 'Boba', emoji: '⚫', tab: 'top', r: 7, buoy: 'sink', disp: 2, rate: 14, chew: true, tags: ['boba'] },
  { id: 'pb', name: 'Popping', emoji: '🟠', tab: 'top', r: 7, buoy: 'slow', disp: 2, rate: 12, chew: true, tags: ['fruit'] },
  { id: 'cb', name: 'Crystal', emoji: '💎', tab: 'top', r: 7, buoy: 'sink', disp: 2, rate: 12, chew: true, tags: ['boba'] },
  { id: 'mo', name: 'Mochi', emoji: '🍡', tab: 'top', r: 9, buoy: 'slow', disp: 4, rate: 8, chew: true, tags: ['mochi'] },
  { id: 'rb', name: 'Red Bean', emoji: '🫘', tab: 'top', r: 5, buoy: 'sink', disp: 1, rate: 16, chew: true, tags: ['redbean'] },
  { id: 'gj', name: 'Grass Jelly', emoji: '🟫', tab: 'top', r: 8, buoy: 'slow', disp: 3, rate: 10, chew: true, tags: ['jelly'] },
  { id: 'lj', name: 'Lychee Jelly', emoji: '🤍', tab: 'top', r: 8, buoy: 'slow', disp: 3, rate: 10, chew: true, tags: ['jelly', 'fruit'] },
  { id: 'st', name: 'Strawberries', emoji: '🍓', tab: 'top', r: 11, buoy: 'suspend', disp: 6, rate: 5, chew: false, tags: ['strawberry', 'fruit'] },
  { id: 'bb', name: 'Blueberries', emoji: '🫐', tab: 'top', r: 6, buoy: 'sink', disp: 1.5, rate: 12, chew: false, tags: ['fruit'] },
  { id: 'mg', name: 'Mango Cubes', emoji: '🥭', tab: 'top', r: 8, buoy: 'slow', disp: 3, rate: 9, chew: false, tags: ['mango', 'fruit'] },
  { id: 'sk', name: 'Sprinkles', emoji: '🌈', tab: 'top', r: 3, buoy: 'top', disp: 0.2, rate: 40, chew: false, tags: ['sprinkle'] },
  { id: 'gl', name: 'Edible Glitter', emoji: '✨', tab: 'top', r: 2, buoy: 'top', disp: 0, rate: 50, chew: false, tags: ['glitter'] },
];

export interface CupDef {
  id: string;
  name: string;
  emoji: string;
  top: number; // inner rim y
  base: number; // glass base thickness
  wall: number;
  capacity: number;
  radius: (y: number, bot: number) => number;
  kind: 'glass' | 'jar' | 'plastic' | 'tumbler';
}

const rounded = (r: number, y: number, bot: number, rc: number) => {
  const d = y - (bot - rc);
  if (d <= 0) return r;
  return r - (rc - Math.sqrt(Math.max(0, rc * rc - d * d)));
};

export const CUPS: CupDef[] = [
  {
    id: 'gl', name: 'Tall Glass', emoji: '🥛', top: 150, base: 14, wall: 4, capacity: 450, kind: 'glass',
    radius: (y, bot) => rounded(64 - ((y - 150) / (bot - 150)) * 10, y, bot, 10),
  },
  {
    id: 'mj', name: 'Mason Jar', emoji: '🫙', top: 140, base: 9, wall: 5, capacity: 520, kind: 'jar',
    radius: (y, bot) => {
      let r = 70;
      if (y < 162) r = 56;
      else if (y < 184) r = 56 + 14 * Math.sin(((y - 162) / 22) * Math.PI / 2);
      return rounded(r, y, bot, 16);
    },
  },
  {
    id: 'bc', name: 'Boba Cup', emoji: '🥤', top: 158, base: 4, wall: 2, capacity: 650, kind: 'plastic',
    radius: (y, bot) => rounded(80 - ((y - 158) / (bot - 158)) * 22, y, bot, 6),
  },
  {
    id: 'tm', name: 'Glitter Tumbler', emoji: '🪩', top: 168, base: 12, wall: 8, capacity: 420, kind: 'tumbler',
    radius: (y, bot) => rounded(60, y, bot, 22),
  },
];

export interface Choice { id: string; name: string; emoji: string }

export const BGS: Choice[] = [
  { id: 'mint', name: 'Mint Grid', emoji: '🟩' },
  { id: 'leo', name: 'Pink Leopard', emoji: '🐆' },
  { id: 'holo', name: 'Holo CD', emoji: '💿' },
  { id: 'night', name: 'Starry', emoji: '🌌' },
  { id: 'check', name: 'Checker', emoji: '🏁' },
  { id: 'cloud', name: 'Cloud Sky', emoji: '☁️' },
  { id: 'myspace', name: 'MySpace', emoji: '💻' },
  { id: 'flip', name: 'Flip Phone', emoji: '📱' },
];

export const RIMS: Choice[] = [
  { id: 'none', name: 'No Rim', emoji: '⭕' },
  { id: 'sugar', name: 'Sugar Rim', emoji: '🧂' },
  { id: 'sprk', name: 'Sprinkle Rim', emoji: '🌈' },
  { id: 'choc', name: 'Choc Drip', emoji: '🍫' },
  { id: 'berry', name: 'Berry Drip', emoji: '🍓' },
  { id: 'gems', name: 'Rhinestones', emoji: '💎' },
  { id: 'gold', name: 'Gold Leaf', emoji: '🪙' },
];

export const STRAWS: Choice[] = [
  { id: 'none', name: 'No Straw', emoji: '🚫' },
  { id: 'clear', name: 'Clear', emoji: '🧪' },
  { id: 'pink', name: 'Pink', emoji: '🩷' },
  { id: 'boba', name: 'Fat Boba', emoji: '⚫' },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈' },
  { id: 'curly', name: 'Curly', emoji: '➰' },
  { id: 'pearl', name: 'Pearl', emoji: '🤍' },
  { id: 'chrome', name: 'Chrome', emoji: '🪞' },
];

export const STICKERS: string[] = [
  '💖', '⭐', '🍒', '🦋', '🎀', '💿', '📱', '💄', '💅', '👛', '🌈', '🍄', '🐰', '🐱', '👽', '💋',
  '🌸', '🫧', '🍓', '🧸', '🪩', '💎', '⚡', '🔥', '👑', '🌙', '☁️', '🎧', '📼', '💌', '🛼', '🫶',
  '✌️', '😜', '🤍', '🐸', '🍭', '🧃', '🌟', '💫', '🪐', '🐻', '🦄', '🌷', '🍑', '🐚', '👼', '🎮',
];

export const TEXT_STICKERS: { id: string; text: string; style: 'chrome' | 'bubble' | 'holo' | 'pixel' }[] = [
  { id: 't1', text: 'XOXO', style: 'bubble' },
  { id: 't2', text: 'ANGEL', style: 'chrome' },
  { id: 't3', text: 'BABE', style: 'holo' },
  { id: 't4', text: 'IT GIRL', style: 'bubble' },
  { id: 't5', text: 'SLAY', style: 'chrome' },
  { id: 't6', text: 'Y2K', style: 'holo' },
  { id: 't7', text: 'LUV U', style: 'pixel' },
  { id: 't8', text: 'DELULU', style: 'bubble' },
  { id: 't9', text: 'OMG', style: 'pixel' },
  { id: 't10', text: 'BRB', style: 'chrome' },
  { id: 't11', text: '<3', style: 'pixel' },
  { id: 't12', text: '~*CUTE*~', style: 'holo' },
  { id: 't13', text: 'MAIN CHARACTER', style: 'bubble' },
  { id: 't14', text: 'TOO COOL', style: 'chrome' },
  { id: 't15', text: 'MATCHA BABE', style: 'holo' },
  { id: 't16', text: 'NO THOUGHTS', style: 'pixel' },
];

export const CLIPS: string[] = ['🦋', '🎀', '🌼', '⭐', '💎', '🍒', '🌸', '🍓', '💖', '🐚'];

export const CHARMS: string[] = ['🐰', '🍒', '💖', '⭐', '📱', '🔑', '🐚', '🍓', '🧸', '🎲', '🌙', '🐸', '💿', '👼', '🦋', '🍄'];

export const FX: Choice[] = [
  { id: 'glitter', name: 'Glitter Rain', emoji: '✨' },
  { id: 'twinkle', name: 'Twinkles', emoji: '🌟' },
  { id: 'hearts', name: 'Chrome Hearts', emoji: '💖' },
  { id: 'bubbles', name: 'Bubbles', emoji: '🫧' },
  { id: 'flare', name: 'Lens Flare', emoji: '🔆' },
  { id: 'rainbow', name: 'Pixel Rainbow', emoji: '🌈' },
  { id: 'butter', name: 'Butterflies', emoji: '🦋' },
];

export const PRINT_STYLES: Choice[] = [
  { id: 'chrome', name: 'Chrome', emoji: '🪞' },
  { id: 'pink', name: 'Bubblegum', emoji: '🩷' },
  { id: 'gold', name: 'Gold', emoji: '🪙' },
  { id: 'black', name: 'Black Vinyl', emoji: '🖤' },
  { id: 'holo', name: 'Holo', emoji: '🌈' },
];

export const liquidById = new Map(LIQUIDS.map((l) => [l.id, l]));
export const pieceById = new Map(PIECES.map((p) => [p.id, p]));
export const cupById = new Map(CUPS.map((c) => [c.id, c]));
