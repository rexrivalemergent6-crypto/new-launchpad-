import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import Marquee from "@/components/Marquee";
import StatStrip from "@/components/StatStrip";
import CoinCard from "@/components/CoinCard";
import { RuleStack, MiniBlock } from "@/components/blocks";
import { useExplore, useScoreboard, MAIN_BUILDER, mainHref } from "@/lib/relay";

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
  "When fees arrive, buy Nvidia with half and airdrop the rest to holders.",
  "When market cap crosses $100k, burn 10% of the tokens the coin holds.",
  "Send 20% of fees to a random holder every hour.",
];

const MODULES = [
  { tag: "FN", color: "#E7C85F", title: "Buy back", body: "Use part of the fees to buy the coin back." },
  { tag: "FN", color: "#E7C85F", title: "Burn", body: "Destroy tokens the coin holds, for good." },
  { tag: "FN", color: "#E7C85F", title: "Airdrop to holders", body: "Send SOL or the coin to all holders, or to the top ones." },
  { tag: "FN", color: "#E7C85F", title: "Pay a random holder", body: "One recent buyer or one holder, picked at random." },
  { tag: "FN", color: "#E7C85F", title: "Hold tokenized stocks", body: "Fees can buy NVDA, TSLA, SPY and more." },
  { tag: "EV", color: "#D9A33C", title: "React to price or cap", body: "Run a rule when the price moves or market cap crosses a level." },
];

const STEPS = [
  { n: "1", title: "Say it", body: "One sentence, in your own words." },
  { n: "2", title: "See it", body: "It becomes blocks you can read and change." },
  { n: "3", title: "Launch it", body: "The coin goes live on pump.fun and follows the rules by itself." },
];

export default function Home() {
  const [sentence, setSentence] = useState("");
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yCanvas = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const yGlow = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const { data: explore } = useExplore();
  const { data: board } = useScoreboard();
  const coins = (explore?.cards || []).slice(0, 5);

  const build = () => window.open(MAIN_BUILDER, "_blank", "noopener");

  return (
    <div>
      {/* ============ HERO ============ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden dotgrid-fine" data-testid="hero">
        <motion.div style={{ y: yGlow }} className="absolute -top-40 right-[-10%] w-[640px] h-[640px] rounded-full bg-mint/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-ink to-transparent pointer-events-none" />

        <div className="relative w-full max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-16 pb-16 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">
          <div className="min-w-0 max-w-full overflow-hidden">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
              className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-fog border border-line rounded-full px-4 py-2 bg-panel/70"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-mint animate-blink" />
              a portal for circuit coins
            </motion.p>

            <h1 className="mt-7 font-extrabold tracking-[-0.035em] leading-[0.98] text-[clamp(2.6rem,7.5vw,6.4rem)]" data-testid="hero-title">
              {maskLine("One sentence.", 0.15)}
              {maskLine(<span className="text-mint">Your coin.</span>, 0.3)}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
              className="mt-6 text-fog text-lg leading-relaxed max-w-full"
            >
              Say what your coin should do. Chip turns it into blocks, and the coin follows them by
              itself, using its own creator fees.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.62, ease: EASE }}
              className="mt-8 max-w-full"
            >
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
                  className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-5 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)] active:scale-[0.97]"
                >
                  Build it <ArrowRight size={17} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 min-w-0 max-w-lg">
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
          </motion.div>
        </div>
      </section>

      <Marquee />

      {/* ============ LIVE STATS ============ */}
      <section className="max-w-[1240px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">Live · since launch</p>
            <h2 className="mt-3 text-3xl lg:text-5xl font-bold tracking-tight">Everything here is relayed.</h2>
          </div>
          <span className="hidden sm:block font-mono text-[11px] text-fog">updates straight from circuitdev.fun</span>
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
              >
                <span className="font-mono text-mint text-sm">0{s.n}</span>
                <h3 className="mt-4 text-2xl font-bold">{s.title}</h3>
                <p className="mt-3 text-fog leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-10">
            <MiniBlock tag="EV" color="#D9A33C">“When fees arrive, buy Nvidia with half and airdrop the rest to holders.”</MiniBlock>
          </div>
        </div>
      </section>

      {/* ============ MODULES ============ */}
      <section className="max-w-[1240px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
        <div className="flex items-end justify-between gap-6 mb-10">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">What a coin can do</h2>
          <Link to="/library" data-testid="see-all-library" className="group hidden sm:inline-flex items-center gap-1.5 text-mint font-medium">
            See all blocks <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.55, delay: Math.min(i * 0.06, 0.3), ease: EASE }}
              className="group border border-line rounded-2xl bg-panel p-7 hover:border-mint/35 hover:-translate-y-1 transition-all duration-300"
              data-testid={`module-card-${i}`}
            >
              <MiniBlock tag={m.tag} color={m.color}>{m.title}</MiniBlock>
              <p className="mt-4 text-fog leading-relaxed">{m.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ SCOREBOARD TEASER ============ */}
      <section className="border-t border-line bg-panel/40">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">The circuit flywheel</p>
          <h2 className="mt-3 text-3xl lg:text-5xl font-bold tracking-tight max-w-2xl">
            Launch fees buy back and burn Circuit.
          </h2>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5" data-testid="scoreboard-teaser">
            {[
              { label: "Paid out to holders", value: board?.totals?.paidSol?.text, unit: "SOL" },
              { label: "Tokens burned", value: board?.totals?.burnedTokens?.text, unit: "$CIRCUIT" },
              { label: "Bought back", value: board?.totals?.buybackSol?.text, unit: "SOL" },
            ].map((t, i) => (
              <div key={t.label} className="border border-line rounded-2xl bg-ink p-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{t.label}</div>
                <div className="mt-3 font-mono text-4xl tabular text-mint" data-testid={`flywheel-stat-${i}`}>
                  {t.value ?? "···"} <span className="text-base text-fog">{t.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/scoreboard" data-testid="scoreboard-link" className="group mt-8 inline-flex items-center gap-1.5 text-mint font-medium">
            See what coins have done <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ============ BIG CTA + FOOTER ============ */}
      <footer className="relative overflow-hidden">
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
              className="inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold text-lg px-8 py-4 transition-all duration-200 hover:shadow-[0_0_40px_rgba(74,222,128,0.4)] active:scale-[0.97]"
            >
              Build it <ArrowRight size={18} />
            </button>
            <button
              data-testid="footer-blocks-button"
              onClick={() => window.open(mainHref("/build?template=blank"), "_blank", "noopener")}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel hover:border-mint/40 font-medium text-lg px-8 py-4 transition-colors"
            >
              Build with blocks <ArrowUpRight size={18} />
            </button>
          </div>

          <div className="mt-20 pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <p className="font-mono text-[11px] text-fog/80 max-w-md leading-relaxed">
              CoinPad is an independent portal. Every launch, wallet signature and payout happens on
              circuit.dev — all data shown here is relayed live.
            </p>
            <div className="flex items-center gap-5 font-mono text-[11px] text-fog">
              <a href={mainHref("/explore")} target="_blank" rel="noopener noreferrer" className="hover:text-mint transition-colors">main site ↗</a>
              <span>relay: <span className="text-mint">live</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
