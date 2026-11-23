# Life Quest

An 8-bit daily quest for a better life, built with Next.js and [8bitcn/ui](https://www.8bitcn.com) components.

**▶ Play it live: https://life-quest.keyurib.workers.dev**

Part of my [100 Days](https://100days.keyurib.workers.dev) series of experimental projects.

- 45 lessons across 9 paths (Happiness, Adversity, Relationships, Self-Love, Passion & Growth, Productivity, Goals & Success, Simplicity, Inspiration)
- Each lesson pairs a short reflection with a small real-world quest and a reflection prompt
- A Daily Quest that is the same for everyone each day, with a bonus and a streak
- Category filtering and random discovery with no repeats until a path is exhausted
- Favourites, completed quests, XP and levels, and a journal of every lesson (saved in the browser)
- Typewriter reveal, chiptune sound effects, three palettes (Arcade, Pocket, Sunset)

| Key | Action |
| --- | --- |
| `Space` / `N` / `→` | Random lesson |
| `T` | Today's Daily Quest |
| `D` | Mark quest done |
| `F` | Favourite |
| `C` | Copy |
| `S` | Share |
| `J` | Journal |
| `M` | Mute |

## Content

All lessons live in `src/data/life-quest-content.json`, the single source of truth. `src/lib/life-quest.ts` types and indexes it; colours and icons per category are in `src/lib/category-theme.ts`.

The lessons are original reflections inspired by themes in *1,000+ Little Things Happy, Successful People Do Differently* by Marc and Angel Chernoff (2019). They are not quotations from the book.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
```

The site is a static export: the build writes plain HTML/CSS/JS to `out/`.

## Deploy on Cloudflare

The repo includes `wrangler.jsonc`, which serves `out/` as static assets.

In the Cloudflare dashboard: **Workers & Pages → Create → Import a repository**, choose this repo, then set:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Every push to `main` redeploys the site.
