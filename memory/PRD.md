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

## Full Circuit de-referencing (2026-10-12, round 3)
- Server-side brand filter: coins with "circuit" in name/ticker dropped from /api/relay/explore (26 clean cards) and every /api/relay/scoreboard list — only pad coins without other-brand naming appear.
- Burn program rebranded to CodePad: Flywheel = "the CodePad program", "Launch fees buy back and burn $CODEPAD", 6.6M $CODEPAD torched, live "AI agents on duty" counter (relayed usesAi count) — buyback + burn + AI agents paired as requested. Scoreboard/Home burn units now $CODEPAD. Zero $CIRCUIT/Circuit mentions in our copy (grep-verified).

## Everything-upstream pass (2026-10-12, round 4)
- New GET /api/relay/stocks (60s cache) relays the upstream live stock price feed; Stocks page tiles now render live prices (TSLA $379, NVDA $226 …) with graceful fallback to the symbol list if the relay hiccups.
- Confirmed every data surface is upstream-proxied: stats, explore coins, scoreboard (+brand filter), 134-block library, stock prices, coin images via /api/relay/*; Bolt compile via /api/c/compile; wallet sign-in via /api/c/auth/*; launch via /api/c/coins. Only our own paraphrased copy and recipe blueprints are static by design.

## Every page taken + blocky workshop (2026-10-12, round 5)
- Full sitemap crawled (20 URLs). New pages, all relayed: /rules (rulebook gallery, /api/relay/rules, paginated, brand-filtered), /live (trade pulse, /api/relay/live, 15s refresh), /paid (payout ledger), /stats, /docs (original handbook), /updates (ship log), /terms /risks /privacy (original copy), /brand (logo+swatches+X), /coin/:mint (coin detail from explore+rules match), /embed (standalone widget, no sidebar).
- Launch tracking: POST /api/c/coins success now records the mint in MongoDB (launches collection); GET /api/portal/launches serves it.
- Explore defaults to "Launched via CodePad" (mint matches our launches table) with an "All pad coins" toggle; honest empty state until the first portal launch.
- Blocky workshop (Builder): project bar (icon + editable name), Stocks NEW chip, Bolt & log toggle, code view toggle, Launch (amber) + Run (green, dropdown: simulate / check-with-Bolt via relay), Ask Bolt bar + suggestion chips, 13-family colored rail, relayed palette (all catalog blocks with dropdown/value field pills), snap-in container blocks (hat/if), delete, block count, plain-english line. Engine split into components/blockyKit.jsx (flat iterative renderer — babel-safe after a stack-overflow crash with recursive components).
- Verified: rules 17 cards/2 pages, live 7 items, launches 200, builder snap test passes (1 node on canvas after palette click), explore empty-state + 26 all-pad cards, mobile builder clean at 390px.

## No-password AI (2026-10-12, round 6)
- Discovered upstream GET /api/ai reports passwordRequired:false — the AI gate is off; POST /api/compile works with no credentials (verified: real sentence → full program JSON through our relay).
- Removed the AI password panel entirely from Builder.
- New programToTree() in blockyKit maps the upstream program JSON (scripts → event/body/if/condition/then/else + loose) into our nested blocky tree; Ask Bolt now renders REAL upstream programs as nested puzzle blocks (verified live: "when creator fees" → "if treasury SOL > 2 — then" → "buy back 5 SOL of the pot", 3 blocks).
- Code view shows the raw upstream program JSON when present.
