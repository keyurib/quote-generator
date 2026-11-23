# Quote Quest

An 8-bit random quote generator built with Next.js and [8bitcn/ui](https://www.8bitcn.com) components.

- 45 quotes across 5 worlds (Wisdom, Courage, Code, Humor, Life), no repeats until a world is exhausted
- Typewriter reveal, pixel-art author avatars, chiptune sound effects
- XP / levels, a "Dex" of quotes seen, and a 12-slot inventory of favorites (saved in the browser)
- Copy, share, keyboard shortcuts, and three palettes (Arcade, Pocket, Sunset)

| Key | Action |
| --- | --- |
| `Space` / `N` / `→` | Next quote |
| `C` | Copy |
| `F` | Save to inventory |
| `S` | Share |
| `I` | Open inventory |
| `M` | Mute |

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
