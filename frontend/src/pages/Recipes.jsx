import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useExplore } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

const RECIPES = [
  { title: "Lucky hour", s: "Each hour a random holder wins a tenth of whatever fees the vault is holding; below 0.01 SOL it skips.", kind: "any coin" },
  { title: "All fees home", s: "Whenever fees land, the whole jar splits among holders, weighted by how much each one holds.", kind: "any coin" },
  { title: "Repurchase & torch", s: "On every fee drop, half the money buys the coin back and everything bought gets destroyed.", kind: "SOL coins only" },
  { title: "Vault torch at 50k", s: "It stockpiles half its fees and, each time market cap clears $50,000, incinerates the whole pile.", kind: "SOL coins only" },
  { title: "Dip rescue", s: "If price sinks 20% within ten minutes, 0.05 SOL from fees goes straight into buying the coin back.", kind: "SOL coins only" },
  { title: "SPY split", s: "Half of every fee that lands is swapped into tokenized S&P 500 shares.", kind: "SOL coins only" },
  { title: "Whale of the hour", s: "Every hour, the biggest buyer of that hour collects a fifth of the fee pool.", kind: "any coin" },
  { title: "Split the pot", s: "Incoming fees divide down the middle: one half rains on holders, the other half buys back and burns.", kind: "SOL coins only" },
  { title: "Cast grows", s: "For every 10 SOL traded, a fresh AI character is minted into the world with a small bag of the coin.", kind: "SOL coins only" },
  { title: "Noon ten", s: "At noon each day the ten biggest holders divide half the vault, if it holds at least 0.01 SOL.", kind: "any coin" },
  { title: "Clockwork pay", s: "Every sixty minutes a quarter of the fee jar sprays out to all holders, provided it holds 0.01 SOL or more.", kind: "any coin" },
  { title: "Torch on taps", s: "All fees buy the coin back, and every buy of 0.1 SOL or more lights up 5% of the pile.", kind: "SOL coins only" },
  { title: "Soft-landing bid", s: "When price slips 10% in ten minutes, a quarter of the held fees buys the dip on its own coin.", kind: "SOL coins only" },
  { title: "100k celebration", s: "Each time market cap passes $100,000, half the vault showers onto holders.", kind: "any coin" },
  { title: "Six-hour raffle", s: "Every six hours one drawn holder pockets a quarter of the fee vault, 0.01 SOL minimum.", kind: "any coin" },
  { title: "Silicon stash", s: "Every fee that arrives buys tokenized NVIDIA stock — the whole lot.", kind: "SOL coins only" },
  { title: "Big five split", s: "Each fee landing divides in two: half spreads across all holders, half goes to the top five.", kind: "any coin" },
  { title: "Morning note", s: "An AI pens a short post each morning and mails it to you, while the day's fees flow to holders.", kind: "any coin" },
  { title: "Buy streak", s: "A public tile counts consecutive buys and resets on any sell, while arriving fees still flow to holders.", kind: "any coin" },
  { title: "Drip torch", s: "Every ten minutes, if the vault holds 0.02 SOL or more, 0.01 SOL buys the coin back and burns it.", kind: "SOL coins only" },
  { title: "Green candle party", s: "When price jumps 20% inside an hour, half the fee jar drops on all holders.", kind: "any coin" },
  { title: "Tech split", s: "Each fee landing splits: half airdrops to holders, half buys tokenized Nasdaq-100.", kind: "SOL coins only" },
];

export default function Recipes() {
  const [kind, setKind] = useState("All");
  const { data } = useExplore();
  const live = data?.cards || [];

  const shown = useMemo(
    () => (kind === "All" ? RECIPES : RECIPES.filter((r) => r.kind === kind)),
    [kind]
  );

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">starter blueprints</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          22 blueprints <span className="text-mint">for your coin.</span>
        </h1>
        <p className="mt-3 text-fog max-w-lg">
          Proven rule-setups written our way. Send one straight to Chip in the builder and your coin goes
          live on pump.fun with the rules frozen on Solana.
        </p>
      </motion.div>

      <div className="mt-8 flex flex-wrap gap-2" data-testid="recipe-filters">
        {["All", "any coin", "SOL coins only"].map((k) => (
          <button
            key={k}
            data-testid={`recipe-filter-${k.replace(/\s+/g, "-").toLowerCase()}`}
            onClick={() => setKind(k)}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded-full border transition-colors ${
              kind === k ? "bg-mint-deep text-mint border-mint/40" : "text-fog border-line hover:text-snow"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="recipes-grid">
        {shown.map((r, i) => {
          const liveMatch = live.find((c) => c.name && c.name.toLowerCase().replace(/\s+/g, "-") === r.title.toLowerCase().replace(/\s+/g, "-"));
          return (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.35), ease: EASE }}
              className="group border border-line rounded-2xl bg-panel p-6 hover:border-mint/35 hover:-translate-y-1 transition-all duration-300 flex flex-col"
              data-testid={`recipe-card-${i}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-mono text-[10px] px-2 py-1 rounded-md border ${
                  r.kind === "any coin" ? "text-tealx border-tealx/40 bg-tealx/10" : "text-bluc border-bluc/40 bg-bluc/10"
                }`}>
                  {r.kind}
                </span>
                {liveMatch && <span className="font-mono text-[10px] text-mint">running live</span>}
              </div>
              <h3 className="mt-4 font-bold text-lg">{r.title}</h3>
              <p className="mt-2 text-sm text-fog leading-relaxed flex-1">“{r.s}”</p>
              <Link
                to={`/builder?q=${encodeURIComponent(r.s)}`}
                data-testid={`recipe-open-${i}`}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-line hover:border-mint/50 hover:text-mint text-snow font-semibold py-2.5 text-sm transition-all duration-200"
              >
                Send to Chip
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
