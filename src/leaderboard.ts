import { decodeDrink } from './share';
import { taste } from './taste';
import { Drink } from './state';

// Public client credentials; row-level security only allows reading and posting to today's board.
const SB_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://rbxflwfkfqliqfjyclpg.supabase.co';
const SB_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGZsd2ZrZnFsaXFmanljbHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNjUzNTIsImV4cCI6MjEwNzc0MTM1Mn0.xyJ-4ZX3QCISVBcT3UeDh02omFDlFiLUHudyv3qmLAA';
export const online = !!(SB_URL && SB_KEY);

export interface Entry { nickname: string; score: number; recipe: string; created_at: string }
export interface Ranked extends Entry { drink: Drink }

// Leaderboard day is UTC so everyone shares the same "today".
export const today = () => new Date().toISOString().slice(0, 10);

const BAD = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'retard', 'whore', 'slut', 'rape', 'hitler', 'nazi', 'kys', 'hure', 'fotze', 'wichs', 'schlampe', 'neger', 'penis', 'dick', 'cock', 'pussy', 'porn', 'sex'];

export function cleanNick(raw: string): string | null {
  const n = raw.normalize('NFKC').replace(/[^\p{L}\p{N} _.\-♡★~]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!n) return null;
  const flat = n.toLowerCase().replace(/[^a-z]/g, '').replace(/0/g, 'o');
  if (BAD.some((w) => flat.includes(w))) return null;
  return n;
}

const LOCAL_KEY = 'mm_board_v1';
const readLocal = (): (Entry & { day: string })[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]');
  } catch {
    return [];
  }
};

async function headers() {
  return { apikey: SB_KEY!, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
}

export async function fetchToday(): Promise<Ranked[]> {
  let rows: Entry[] = [];
  if (online) {
    const q = `${SB_URL}/rest/v1/entries?select=nickname,score,recipe,created_at&day=eq.${today()}&order=score.desc,created_at.asc&limit=150`;
    const res = await fetch(q, { headers: await headers() });
    if (!res.ok) throw new Error(`leaderboard ${res.status}`);
    rows = await res.json();
  } else {
    rows = readLocal().filter((e) => e.day === today()).sort((a, b) => b.score - a.score);
  }
  // Re-score every recipe locally; entries whose claimed score doesn't match are dropped.
  const out: Ranked[] = [];
  for (const e of rows) {
    const drink = await decodeDrink(e.recipe);
    if (!drink) continue;
    if (Math.abs(taste(drink).score - e.score) > 0.05) continue;
    out.push({ ...e, drink });
    if (out.length >= 50) break;
  }
  return out;
}

export async function submitEntry(nickname: string, score: number, recipe: string) {
  if (online) {
    const res = await fetch(`${SB_URL}/rest/v1/entries`, {
      method: 'POST',
      headers: { ...(await headers()), Prefer: 'return=minimal' },
      body: JSON.stringify({ nickname, score, recipe }),
    });
    if (!res.ok) throw new Error(`submit ${res.status}`);
    return;
  }
  const all = readLocal().filter((e) => e.day === today());
  all.push({ nickname, score, recipe, created_at: new Date().toISOString(), day: today() });
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(-100)));
  } catch {
    /* storage full or blocked */
  }
}
