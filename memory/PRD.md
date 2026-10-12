# CodePad — Live-Proxy Wrapper of circuitdev.fun

## Original problem statement
"Clone circuitdev.fun and make a full wrapper of it… every API call, feature and button routed through the proxy, nothing extra nothing less… just like the main website." User's final directions: restore the DARK UI (navy #0A0F16 + mint #63E6A9, like their old screenshots), nav = exactly the main site's items (nothing extra, nothing less), full coin-launch flow through the proxy, remix pops blocks into the builder, every button works, LIVE relayed data only (zero mock).

## Current state (2026-10-12, this fork)
### Theme (restored)
- Dark tokens: ink #0A0F16 bg, panel #0E141D cards, raise #131C28, line rgba(148,163,184,.14), mint #4CD98F / bright #63E6A9 / deep #12261E, fog slate, snow #E8EDF5. All ~94 hardcoded light hexes swept. `.nbb-in` dark input primitive added. `.pz-*` editor classes dark (colored block bodies + dark borders on #0C1219 canvas).
- Hero: "Describe it. Launch it. Watch it run." + "Compile my coin" (user's old wording).

### Nav (cloned 1:1 from main site)
- Sidebar EXACTLY: Builder(/builder) · Explore(/explore) · Library(/rules) · Model(/flywheel) · Handbook(/docs) · Changelog(/updates) · My coins(/coins) + Connect wallet + mint "Deploy a coin" → /builder?launch=1 (auto-opens launch drawer).
- Footer (all pages except /embed): Platform / Build with (Examples/Modules/Stocks/Rules gallery/Embed) / Handbook / Legal columns + UTC clock + X.

### Home (cloned section-by-section)
Announcement bar (dismissable) → live trade ticker (relay /api/activity, internal links) → flagship strip (first explore coin + copy mint) → hero (ask-bolt input, try-one chips, build-with-blocks/pick-blueprint links, trust chips) → live StatStrip → Just launched (internal /c/<mint> cards) → How it works (✓ checklist) → "What a coin can do" (6 power cards; click → template + "build this" → /builder?q=) → Loop teaser → "Built at birth. Runs forever." (steps + locked families + sentence input) → big CTA → global Footer.

### Launch flow (full upstream replication through /api/c/* session relay)
1. Ticker availability: GET /api/c/coins/ticker?t= (live count badge)
2. Balance: GET /api/c/chain/balance?wallet= (warn < 0.1 SOL)
3. Sign-in: Phantom signMessage → POST /api/c/auth/nonce → /api/c/auth/verify (upstream session stored server-side under cpad_sid httpOnly cookie)
4. Terms: POST /api/c/launch/terms {program, symbol?} → live lamports breakdown
5. Keypair.generate() (client, @solana/web3.js) → POST /api/c/projects/{pid}/launch {mint, program, name, symbol} → {txBase64, slug}
6. VersionedTransaction.deserialize → co-sign with coin key → provider.signTransaction → base64
7. POST /api/c/projects/{pid}/send?mint=&slug= {tx} → {signature}; POST /register {mint, slug, signature}
8. Poll GET /api/c/projects/{pid}/status → live/created/locking/failed_verification
- Backend records launches (mint/slug/signature) in Mongo launches on POST /send or /coins 200. pid = uuid in localStorage.
- Final signature step needs the user's Phantom (not testable in preview).

### Remix (fixed)
- /builder?q=<sentence> AUTO-compiles via upstream AI POST /api/c/compile → programToTree → blocks appear (Library "Ask Bolt for this", Recipes "Send to Bolt", CoinPage "Remix with Bolt" all flow here).
- Builder blockyKit: inputs draggable (drag starts anywhere on a block) + inputs accept dropped palette/value pills (fills the field's value).

### All coin links internal
- CoinCard, Scoreboard rows, Live ticker items → /c/<mint>. Explore empty CTA + footer "Quick launch" → /builder?launch=1. CoinPage "Trade" stays an upstream handoff (their swap UI) — the only external action, like wallet signing.

### Routes
/, /builder (?q= remix, ?launch=1), /explore, /c/:mint, /coins (My coins — session-relayed), /rules, /flywheel, /docs, /updates, /library (modules), /recipes, /stocks, /live, /paid, /stats, /scoreboard, /brand, /embed (standalone), /terms, /risks, /privacy.

## Testing
- Backend: /app/backend/tests/backend_test.py — 14/14 pass (relay endpoints live, launches regression, /c/* passthrough).
- Frontend: /app/test_reports/iteration_1.json — fixed: white launch-drawer input (→ dark .nbb-in), home 390px overflow (grid-cols-1). Mobile scrollWidth now 390=390.
- Zero console errors, zero external circuitdev.fun links (except CoinPage trade handoff).

## Backlog
- P1: value-pill DROP into input already fills text — next: wire reporter nodes as live references (upstream-style variable linking)
- P2: watchlist, share cards, /docs anchor sections (receipts/vault/faq/launching) as separate blocks

## Update 2026-10-12 (later rounds)
- **5-step launch wizard** (LaunchWizard.jsx, upstream-exact): Step 1 Make your coin (signed-in pill/logout, lime stock notice, live cost paragraph, image = CodePad logo auto-uploaded via POST /api/c/images, changeable) → Step 2 Name/Ticker ($ prefix, live availability)/Description/X profile/priced-in **SOL | PUMP (EcZndAERfzNhLirHwfsy44dAyPSZazjDU83pa6RApump) | any of 69 tokenized stocks** (mints decoded from upstream quote table; stock risk checkbox gates Next) → Step 3 Check the rules (plain-english of the user's blocks) → Step 4 money (spending limits FROZEN, AI starter card, no-money-rule red checkbox + terms checkbox) → Step 5 Sign & launch. Launch body exact upstream: {userWallet, mint, name, symbol, description, imageUrl, twitter?, devBuyLamports:"0", slug, program, timezone, noMoneyRuleOk?, quoteMint?, creatorFeeBps?, stockQuoteRiskOk?} + response echo validation (QUOTE_NOT_CONFIRMED). Then co-sign → wallet sign → /send?mint=&slug= → /register → /status poll. (User's real 400 "launch details aren't valid" fixed — imageUrl+description+slug+timezone+devBuy were missing.)
- **Explore = OUR ledger only** (no upstream coins, no toggle; honest empty state).
- **No upstream platform stats as ours**: Flywheel honest (0 $CODEPAD torched — counter starts with our own coin; no 6.6M), flagship strip/loop teaser/StatStrip/live ticker use our ledger only.
- **All 69 tokenized stocks** on /stocks (quotes.js table + live prices where relayed) + ledger-only "coins stacking shares".
- **Dark block skin everywhere**: rail = dark family tints + bright borders (active = solid family + glow), canvas/palette/flyout dark tints + bright family borders + light text; white oval inputs kept.
- **X link https://x.com/usecodepad in every header** (desktop sidebar top, mobile bar, builder row, menu drawer; header-x-link-* testids).
- Home hero: big mint "Pick a blueprint" button (hero-blueprint-button) above Ask Bolt — the highlight; goes to /recipes.
- Builder mobile parity: 44px controls, 84px rail, family flyout, per-session demo program (upstream-identical: events_button Go → variables_change clicks → control_if_else → world_update_feed), long-press pick-up/tap-to-drop on touch, ideas dropdown, /builder?remix=<slug>&launch=1 template loading (GET /api/p/<slug>?receipts=1 fallback to /api/relay/rules), masked "Template" cards with CodePad logo + made-up tickers on /rules.
- Test reports: iteration_1..6 all 100% (6 = header X + p/div fix).
