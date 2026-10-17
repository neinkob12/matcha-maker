# 🍵 Matcha Maker

A Y2K, pixel-phone style matcha game for the browser (phone first).

- **Hold to pour** matcha, milks, syrups and foams. Where you pour matters: the middle mixes and makes matcha clouds, the edge layers gently, and syrup aimed at the wall drizzles down the glass. Dense liquids sink, foam floats, and too much overflows onto the table.
- **Hold to drop** ice and toppings with real physics: boba sinks, ice floats, strawberries hang mid-drink, sprinkles sit on the foam.
- **Spin the glass** by swiping. Stickers, clips, drips, the straw and your **printed name** wrap around it in 3D.
- **Decorate**: die-cut stickers, text stickers, rim clips, dangling charms, straws, rims (sugar, sprinkles, choc drip, rhinestones, gold leaf), effects and backgrounds.
- **Taste-Meter**: a score from real ratios (matcha share, sweetness, bitterness, creaminess, fill level, spills, ice, foam, stirring) plus flavor pairings and clashes. Too much of anything lowers it.
- **Generated names** built from what is actually in the cup, with roast names for disasters.
- **Share**: a 9:16 card for TikTok / Stories, and a remix link that encodes the whole drink in the URL.
- **Best Matcha Today**: a daily leaderboard (Supabase). Every entry is re-scored from its recipe in the browser, so faked scores are dropped.

## Run

```sh
npm install
npm run dev
```

## Deploy (Vercel)

Import the repo in Vercel. It is detected as Vite; no config needed.

The online leaderboard already points at the `matcha-maker` Supabase project (public anon key, protected by row-level security, see `supabase/schema.sql`). To use a different project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
