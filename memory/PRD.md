# CodePad — Relay Portal for Circuit (circuitdev.fun)

## Brand (2026-10-12)
- Renamed CoinPad → **CodePad** ("Code" white + "Pad" green), per user request + reference logo.
- Logo mark: neon gradient (green→cyan) rounded-square with terminal chevron, dot and underscore — recreated as SVG in Sidebar (CodePadMark) and /public/favicon.svg; favicon + tab title "CodePad — One line in. A coin out." updated in index.html.
- Social: X only — https://x.com/usecodepad (sidebar + footer + mobile bar, XIcon component). No other social links anywhere.

## Original problem statement
"i want to clone https://circuitdev.fun/ and make a wrapper of this basically" → refined via Q&A into: a thin wrapper/portal — "strip their backend and crawl and use apis so no need to hike anything just relay to them… make sure everything is proxy backend api and we are just a portal all functions through the mainsite relay." Later: design per Jesse Pollak reference screenshots (dark navy-black + mint green, CodePad-style two-tone logo, sidebar nav, blocky builder canvas), blocky builder page, smooth on mobile + PC, all tokens/stocks/AI/buy-back data turned through the upstream API proxy, wallet connect handed off to the main site's Solana mainnet flow, all build templates/recipes copied and matched with our UI.

## Architecture
- Frontend: React (CRA) + Tailwind + framer-motion + lenis, sidebar app shell (CoinPad logo, nav pills, Connect wallet + Deploy a coin hand-off buttons)
- Backend: FastAPI relay proxy (httpx) — no own DB logic for core data
  - GET /api/relay/stats, /api/relay/explore, /api/relay/scoreboard (20s cache)
  - GET /api/relay/img/{hash} (300s cache, cache-control)
  - GET /api/relay/{path:path} generic passthrough with query params
  - GET /api/health (upstream status)
- Env: backend UPSTREAM_BASE_URL=https://circuitdev.fun; frontend REACT_APP_MAIN_SITE_URL=https://circuitdev.fun, REACT_APP_BACKEND_URL (preview host)
- Upstream facts: /api/stats, /api/explore, /api/scoreboard, /api/img/* are public 200; /api/coins is 401 (auth) → all launching/wallet signing stays on main site; portal deep-links to /build?template=blank, /start, /modules, /pair, /flywheel

## Pages (all verified 2026-10-12)
- / — kinetic hero (masked line reveal, parallax block canvas, RuleStack with EV/LG/FN puzzle blocks + "5 blocks" chip), sentence input → main builder, try-one chips, marquee, relayed stat strip, just launched (relayed), how-it-works, modules, flywheel teaser, big CTA
- /builder — blocky canvas: dot grid, add event/logic/action blocks, cycle % chips, delete blocks, "N blocks" counter, relayed live-proof stats (AI/stocks/buyback/burn counts), recipes, deploy hand-off
- /explore — relayed coin grid, tag filters, deploy CTA
- /scoreboard — relayed totals + 4 leaderboards (paid/burned/boughtBack/payouts)
- /library — 14 block families copied from main site
- /recipes — all 22 recipes copied verbatim, kind filters, remix/build hand-off
- /stocks — tokenized stocks list (15), relayed live coins using stocks
- /flywheel — 0.05 SOL launch fee, 6.6M $CIRCUIT burned, relayed totals + burned list

## Bugs fixed
- blocks.jsx missing React import (blank home) — fixed
- 390px hero clipped by truncate chips forcing 512px grid track — fixed (wrap + min-w-0)

## Backlog
- P1: relayed coin detail pages (/c/<mint>) in our UI; live trade-pulse feed
- P2: watchlist (localStorage), share cards, auto-refresh ticker band

## Copy originality pass (2026-10-12)
- AI character renamed Chip → Bolt across every surface (Ask Bolt, Bolt is thinking…, Send to Bolt, library "Ask Bolt for this"); decorative canvas label reworded. Relayed block-catalog labels stay verbatim — that is live product data, not copy.

## De-similarity sweep (round 2, 2026-10-12)
- Zero borrowed vocabulary in our voice: no pump.fun/Solana brand lines, no "creator fees" phrase, no matching placeholders/buttons. New marquee claims ("Blocks that run themselves…"), new canvas story ("when the fee pot gets paid" → "send a fixed slice of the pot… to the top holders", "then"/"failing that"), placeholder "Describe your coin in one line…", buttons "Make it"/"Ship your coin", error copy without the upstream domain, "Flagship coin cap" stat label, fully reworded Stocks + Flywheel pages. Grep sweep over pages+components: clean.
- Relayed live data (coin names/summaries, block catalog labels, tickers like $CIRCUIT) remains verbatim — that is the feed itself.
- blocks.jsx keeps the full 15-family COLORS map + Tag color prop (Library depends on it), with only the decorative stack reworded.
- All static copy rewritten in our own voice: tagline "One line in. A coin out.", all section headings, how-it-works steps, module blurbs, family descriptions, stocks/flywheel/explore/scoreboard texts, footer.
- All 22 recipes paraphrased (original titles + sentences, same rule meanings); hero chips + builder starter ideas are original examples.
- Templates relocated: block-powers section moved above the coins grid on Home; starter-ideas panel moved to the top of the Builder side column.
- Live relayed data (coin names, stats, block catalog) is upstream data and stays verbatim — that's the feed itself, not copied copy.
- Discover/Explore feed is server-filtered: only coins launched through the pad (mint + state present), official platform coin and non-launcher entries hard-filtered in relay_explore.
- Library page: full 134-block catalog restored (live /api/relay/library + offline snapshot fallback), search, family/module views, per-block "Ask Chip" prefill.
