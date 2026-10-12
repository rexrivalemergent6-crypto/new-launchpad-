import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, ArrowRight, Lock, X as Close, Check } from "lucide-react";
import LiveTicker from "@/components/LiveTicker";
import XIcon from "@/components/XIcon";
import StatStrip from "@/components/StatStrip";
import CoinCard from "@/components/CoinCard";
import { RuleStack, MiniBlock } from "@/components/blocks";
import { useExplore, useScoreboard, relayImg, fmtUsd, fmtSol } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

const maskLine = (children, delay) => (
  <span className="mask-line">
    <motion.span
      initial={{ y: "112%" }}
      animate={{ y: 0 }}
      transition={{ duration: 1, delay, ease: EASE }}
    >
      {children}
    </motion.span>
  </span>
);

const TRY_ONE = [
  "When the pot crosses 2 SOL, stack tokenized TSLA with half and gift the rest.",
  "If the chart doubles in a day, buy back 5% of everything.",
  "Once an hour, one random holder scoops 15% of the pot.",
];

const TRUST = [
  "launches live on Solana",
  "rules locked at birth",
  "runs on its own fees",
  "new: tokenized stocks",
];

/* the six powers, each with a template you can send straight to the builder */
const POWERS = [
  { tag: "FN", title: "Buy back", body: "Use part of the fees to buy the coin back.", template: "When fees land, spend half of them buying the coin back." },
  { tag: "FN", title: "Burn", body: "Destroy tokens the coin holds, for good.", template: "On every buy over 0.1 SOL, burn 1% of the tokens the coin holds." },
  { tag: "FN", title: "Airdrop to holders", body: "Send SOL or the coin to all holders, or to the top ones.", template: "Every hour, split 10% of the fee pot across all holders." },
  { tag: "FN", title: "Pay a random buyer or holder", body: "One recent buyer or one holder, picked at random.", template: "Once an hour, one random holder scoops 15% of the pot." },
  { tag: "FN", title: "Hold tokenized stocks", body: "Fees can buy NVDA, TSLA, SPY and more.", template: "Half of every fee that lands stacks tokenized NVDA." },
  { tag: "EV", title: "React to price or market cap", body: "Run a rule when the price moves or the market cap crosses a level.", template: "If market cap crosses $100k, burn 10% of the tokens the coin holds." },
];

const STEPS = [
  { n: "1", title: "Say it", body: "One sentence, in your own words. No forms, no code." },
  { n: "2", title: "See it", body: "It snaps into blocks you can read and change." },
  { n: "3", title: "Launch it", body: "Live on Solana — the coin follows its rules on its own.", checks: ["the coin goes live", "creator fees arrive", "the rules run by themselves", "holders get paid"] },
];

const BUILD_STEPS = [
  { k: "1", label: "name & ticker" },
  { k: "2", label: "read the fee split" },
  { k: "3", label: "sign once" },
  { k: "4", label: "your coin → live" },
];

export default function Home() {
  const [sentence, setSentence] = useState("");
  const [birthSentence, setBirthSentence] = useState("");
  const [notice, setNotice] = useState(true);
  const [openPower, setOpenPower] = useState(null);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yCanvas = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const { data: explore } = useExplore();
  const { data: board } = useScoreboard();
  const coins = (explore?.cards || []).slice(0, 6);
  const flagship = (explore?.cards || [])[0];

  const build = () => {
    window.location.assign(`/builder?q=${encodeURIComponent(sentence || "")}`);
  };

  return (
    <div>
      {/* ============ ANNOUNCEMENT BAR ============ */}
      {notice && (
        <div className="border-b border-line bg-mint-deep/60" data-testid="announcement-bar">
          <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-2.5 flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] text-fog">
              <span className="text-mint font-bold mr-2">new</span> launch cost, shown up front before you sign
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/updates" data-testid="announcement-link" className="font-mono text-[11px] text-mint hover:underline">see the changelog</Link>
              <button onClick={() => setNotice(false)} data-testid="announcement-dismiss" aria-label="dismiss" className="text-fog hover:text-snow transition-colors"><Close size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ============ LIVE TRADE TICKER ============ */}
      <LiveTicker />

      {/* ============ FLAGSHIP STRIP ============ */}
      <div className="border-b border-line bg-panel/60" data-testid="flagship-strip">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
          {flagship ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                {flagship.image && <img src={relayImg(flagship.image)} alt={flagship.name} className="w-9 h-9 rounded-lg object-cover border border-line" />}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{flagship.name} <span className="font-mono text-xs text-mint">${flagship.ticker}</span></p>
                  <p className="font-mono text-[10px] text-fog/70">flagship on the pad</p>
                </div>
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(flagship.mint || "")}
                data-testid="flagship-copy-mint"
                className="font-mono text-[11px] text-fog hover:text-mint transition-colors"
                title="copy the mint"
              >
                {(flagship.mint || "").slice(0, 6)}…{(flagship.mint || "").slice(-4)} · copy
              </button>
              <div className="font-mono text-[11px] text-fog">
                market cap <b className="text-snow">{fmtUsd(flagship.marketCapUsd)}</b>
                <span className="mx-3 text-fog/40">|</span>
                volume <b className="text-snow">{fmtSol(flagship.volumeSol)} SOL</b>
              </div>
              <a href={`/c/${flagship.mint}`} data-testid="flagship-open" className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-mint hover:underline">
                open <ArrowUpRight size={13} />
              </a>
            </>
          ) : (
            <p className="font-mono text-[11px] text-fog/60">flagship coin loading…</p>
          )}
        </div>
      </div>

      {/* ============ HERO ============ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden dotgrid-fine" data-testid="hero">
        <motion.div style={{ y: yCanvas }} className="absolute -top-40 right-[-10%] w-[640px] h-[640px] rounded-full bg-mint/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-ink to-transparent pointer-events-none" />

        <div className="relative w-full max-w-[1240px] mx-auto px-6 lg:px-10 pt-16 pb-16 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">
          <div className="min-w-0 max-w-full overflow-hidden">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
              className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-mint"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-mint animate-blink" />
              self-executing tokens
            </motion.p>

            <h1 className="mt-7 font-extrabold tracking-[-0.035em] leading-[0.98] text-[clamp(2.6rem,7.5vw,6.4rem)]" data-testid="hero-title">
              {maskLine("Describe it.", 0.15)}
              {maskLine("Launch it.", 0.3)}
              {maskLine(<span className="text-mint">Watch it run.</span>, 0.45)}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
              className="mt-6 text-fog text-lg leading-relaxed max-w-full"
            >
              One sentence in, a deployed Solana token out. CodePad compiles your rules into
              blocks the chain executes forever — payouts, burns, buybacks — financed by the
              fees it earns. Rehearse on pretend money first, launch when it feels right.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.62, ease: EASE }}
              className="mt-8 max-w-full"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog/70 mb-2">ask bolt</p>
              <div className="flex items-center gap-2 border border-line rounded-2xl bg-panel/80 p-2 focus-within:border-mint/50 transition-colors max-w-lg">
                <input
                  data-testid="hero-sentence-input"
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && build()}
                  placeholder="What should your coin do?"
                  className="flex-1 bg-transparent outline-none px-4 py-2.5 text-[15px] placeholder:text-fog/60 min-w-0"
                />
                <button
                  data-testid="hero-build-button"
                  onClick={build}
                  className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#0A0F16] font-bold px-5 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)] active:scale-[0.97]"
                >
                  Compile my coin <ArrowRight size={17} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 min-w-0 max-w-lg">
                <span className="font-mono text-[11px] text-fog/70 py-1.5">try one</span>
                {TRY_ONE.map((t, i) => (
                  <button
                    key={i}
                    data-testid={`try-one-chip-${i}`}
                    onClick={() => setSentence(t)}
                    className="font-mono text-[11px] text-fog border border-line rounded-full px-3.5 py-1.5 hover:text-mint hover:border-mint/40 transition-colors text-left min-w-0"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                <span className="text-fog">Rather snap it together yourself?</span>
                <a href="/builder" data-testid="hero-blocks-link" className="inline-flex items-center gap-1 text-mint font-medium hover:underline">
                  Build with blocks <ArrowUpRight size={14} />
                </a>
                <a href="/recipes" data-testid="hero-recipes-link" className="inline-flex items-center gap-1 text-mint font-medium hover:underline">
                  Pick a blueprint <ArrowUpRight size={14} />
                </a>
              </div>
            </motion.div>
          </div>

          <motion.div style={{ y: yCanvas }} className="relative min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 40, rotate: 1.5 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 1.1, delay: 0.35, ease: EASE }}
              className="relative dotgrid border border-line rounded-3xl bg-[#0C1219]/80 p-6 sm:p-8 pt-24 sm:pt-28 overflow-hidden max-w-full"
              data-testid="hero-canvas"
            >
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-mint/10 blur-[90px] rounded-full pointer-events-none" />
              <RuleStack />
            </motion.div>
            <div className="mt-5 flex flex-wrap gap-2" data-testid="trust-chips">
              {TRUST.map((t, i) => (
                <span key={t} className={`font-mono text-[10.5px] px-3 py-1.5 rounded-full border ${i === 3 ? "border-mint/40 text-mint bg-mint/10" : "border-line text-fog"}`}>
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ LIVE STATS ============ */}
      <section className="max-w-[1240px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">live · since day one</p>
            <h2 className="mt-3 text-3xl lg:text-5xl font-bold tracking-tight">Fed straight by the relay.</h2>
          </div>
          <span className="hidden sm:block font-mono text-[11px] text-fog">nothing here is stale — numbers stream in</span>
        </div>
        <StatStrip />
      </section>

      {/* ============ JUST LAUNCHED ============ */}
      <section className="max-w-[1240px] mx-auto px-6 lg:px-10 pb-20 lg:pb-28">
        <div className="flex items-end justify-between gap-6 mb-8">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">Just launched</h2>
          <Link to="/explore" data-testid="see-all-explore" className="group inline-flex items-center gap-1.5 text-mint font-medium">
            See all <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="just-launched-grid">
          {coins.map((c, i) => (
            <CoinCard key={c.slug || i} coin={c} index={i} />
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="border-y border-line bg-panel/40">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">How it works</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                className="border border-line rounded-2xl bg-ink p-8 hover:border-mint/30 transition-colors"
                data-testid={`how-step-${i}`}
              >
                <span className="font-mono text-mint text-sm">0{s.n}</span>
                <h3 className="mt-4 text-2xl font-bold">{s.title}</h3>
                <p className="mt-3 text-fog leading-relaxed">{s.body}</p>
                {s.checks && (
                  <div className="mt-5 space-y-2">
                    {s.checks.map((c) => (
                      <p key={c} className="flex items-center gap-2 font-mono text-[12px] text-fog">
                        <span className="w-4 h-4 rounded-full bg-mint/15 text-mint flex items-center justify-center"><Check size={10} /></span>
                        {c}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHAT A COIN CAN DO ============ */}
      <section className="max-w-[1240px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
        <div className="flex items-end justify-between gap-6 mb-10">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">What a coin can do</h2>
          <Link to="/library" data-testid="see-all-library" className="group hidden sm:inline-flex items-center gap-1.5 text-mint font-medium">
            See all blocks <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {POWERS.map((m, i) => {
            const open = openPower === i;
            return (
              <motion.button
                key={m.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, delay: Math.min(i * 0.06, 0.3), ease: EASE }}
                onClick={() => setOpenPower(open ? null : i)}
                className={`text-left border rounded-2xl p-7 transition-all duration-300 ${open ? "border-mint/50 bg-panel" : "border-line bg-panel hover:border-mint/35 hover:-translate-y-1"}`}
                data-testid={`power-card-${i}`}
              >
                <MiniBlock tag={m.tag} color="#E7C85F">{m.title}</MiniBlock>
                <p className="mt-4 text-fog leading-relaxed">{m.body}</p>
                {open && (
                  <div className="mt-4 rounded-xl border border-mint/30 bg-mint/10 p-4" data-testid={`power-template-${i}`}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog/70">template</p>
                    <p className="mt-1.5 text-sm text-snow/90 leading-relaxed">“{m.template}”</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-mint font-bold">
                      build this <ArrowRight size={13} />
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ============ LOOP TEASER ============ */}
      <section className="border-t border-line bg-panel/40">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the loop that never stops</p>
          <h2 className="mt-3 text-3xl lg:text-5xl font-bold tracking-tight max-w-2xl">
            Launch fees loop back as burns.
          </h2>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5" data-testid="scoreboard-teaser">
            {[
              { label: "Sent to holders", value: board?.totals?.paidSol?.text, unit: "SOL" },
              { label: "Supply torched", value: board?.totals?.burnedTokens?.text, unit: "$CODEPAD" },
              { label: "Repurchased", value: board?.totals?.buybackSol?.text, unit: "SOL" },
            ].map((t, i) => (
              <div key={t.label} className="border border-line rounded-2xl bg-ink p-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{t.label}</div>
                <div className="mt-3 font-mono text-4xl tabular text-mint" data-testid={`flywheel-stat-${i}`}>
                  {t.value ?? "···"} <span className="text-base text-fog">{t.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/flywheel" data-testid="scoreboard-link" className="group mt-8 inline-flex items-center gap-1.5 text-mint font-medium">
            See the full loop <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ============ BUILT AT BIRTH ============ */}
      <section className="max-w-[1240px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              Built at birth. <span className="text-mint">Runs forever.</span>
            </h2>
            <p className="mt-4 text-fog leading-relaxed max-w-md">
              You set the rules once and launch with one wallet signature. The coin is created on
              Solana, its rules are fingerprinted at birth, and they can never change after.
            </p>
            <div className="mt-8 space-y-3" data-testid="launch-steps-visual">
              {BUILD_STEPS.map((s) => (
                <div key={s.k} className="flex items-center gap-4 border border-line rounded-xl bg-panel px-5 py-3.5">
                  <span className="font-mono text-[11px] text-mint w-5">{s.k}</span>
                  <span className="text-sm text-snow/90">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 border border-line rounded-2xl bg-panel p-6" data-testid="locked-forever">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog/70 mb-3">locked forever</p>
              <div className="flex flex-wrap gap-2.5">
                {["events", "logic", "actions", "state"].map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5 font-mono text-[12px] text-fog border border-line rounded-lg px-3 py-1.5">
                    <Lock size={11} className="text-mint" /> {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-line rounded-3xl bg-panel p-8 lg:p-10" data-testid="birth-cta">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog/70">your coin</p>
            <h3 className="mt-3 font-extrabold tracking-[-0.02em] text-3xl leading-tight">
              One sentence. <span className="text-mint">Your coin.</span>
            </h3>
            <div className="mt-6 flex items-center gap-2 border border-line rounded-2xl bg-ink p-2 focus-within:border-mint/50 transition-colors">
              <input
                data-testid="birth-sentence-input"
                value={birthSentence}
                onChange={(e) => setBirthSentence(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && window.location.assign(`/builder?q=${encodeURIComponent(birthSentence || "")}`)}
                placeholder="+ type your first sentence"
                className="flex-1 bg-transparent outline-none px-4 py-2.5 text-[15px] placeholder:text-fog/50 min-w-0"
              />
              <button
                data-testid="birth-build-button"
                onClick={() => window.location.assign(`/builder?q=${encodeURIComponent(birthSentence || "")}`)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#0A0F16] font-bold px-5 py-3 transition-all active:scale-[0.97]"
              >
                Build it <ArrowRight size={16} />
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px]">
              {["launches live", "locked at birth", "runs on its own fees"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-fog border border-line rounded-full px-3 py-1.5">
                  <Check size={11} className="text-mint" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ BIG CTA ============ */}
      <section className="border-t border-line relative overflow-hidden">
        <div className="absolute inset-0 dotgrid-fine opacity-60 pointer-events-none" />
        <div className="relative max-w-[1240px] mx-auto px-6 lg:px-10 py-24 lg:py-36 text-center">
          <h2 className="font-extrabold tracking-[-0.03em] leading-[1.02] text-[clamp(2.4rem,6vw,5rem)]" data-testid="footer-cta">
            One sentence.
            <br />
            <span className="text-mint">Your coin.</span>
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              data-testid="footer-build-button"
              onClick={build}
              className="inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#0A0F16] font-bold text-lg px-8 py-4 transition-all duration-200 hover:shadow-[0_0_40px_rgba(74,222,128,0.4)] active:scale-[0.97]"
            >
              Build it <ArrowRight size={18} />
            </button>
            <button
              data-testid="footer-blocks-button"
              onClick={() => window.location.assign("/builder")}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel hover:border-mint/40 font-medium text-lg px-8 py-4 transition-colors"
            >
              Build with blocks <ArrowUpRight size={18} />
            </button>
          </div>

          <div className="mt-20 flex items-center justify-center gap-5 font-mono text-[11px] text-fog">
            <Link to="/library" className="hover:text-mint transition-colors">all 134 blocks</Link>
            <a href="https://x.com/usecodepad" target="_blank" rel="noopener noreferrer" data-testid="footer-x-link" className="hover:text-mint transition-colors inline-flex items-center gap-1.5">
              <XIcon size={12} /> CodePad ↗
            </a>
            <span>relay: <span className="text-mint">live</span></span>
          </div>
        </div>
      </section>
    </div>
  );
}