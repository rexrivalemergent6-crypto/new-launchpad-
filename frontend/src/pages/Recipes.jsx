import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useExplore, MAIN_BUILDER, mainHref } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

const RECIPES = [
  { title: "Hourly lucky holder", s: "Every hour, one random holder is paid a tenth of the fees the coin is holding. Under 0.01 SOL, nothing is sent.", kind: "Any coin" },
  { title: "Fees to holders", s: "Every time fees arrive, the coin airdrops all the fees it holds to its holders, more to those who hold more.", kind: "Any coin" },
  { title: "Buy Back and Burn", s: "Every time fees arrive, the coin buys itself back with half of them and burns what it bought.", kind: "SOL coins only" },
  { title: "Save up, burn at $50k", s: "It buys itself back with half its fees, then burns everything it saved each time its market cap passes $50,000.", kind: "SOL coins only" },
  { title: "Dip Buyer", s: "When its price drops 20% inside 10 minutes, the coin buys itself back with 0.05 SOL of its fees.", kind: "SOL coins only" },
  { title: "Half into SPY", s: "Every time fees arrive, the coin buys tokenized SPY stock with half of them.", kind: "SOL coins only" },
  { title: "Biggest buyer bonus", s: "Every time fees arrive, a fifth of them goes to the biggest buyer of the last hour.", kind: "Any coin" },
  { title: "Half burned, half to holders", s: "Every time fees arrive, half is airdropped to holders and the other half buys the coin back and burns it.", kind: "SOL coins only" },
  { title: "Living Crew", s: "Every 10 SOL of volume, a new AI character is born, buys a little of the coin and joins its world.", kind: "SOL coins only" },
  { title: "Daily top 10", s: "Every day at noon, your time, the top 10 holders split half the fees the coin holds, if it holds 0.01 SOL or more.", kind: "Any coin" },
  { title: "Hourly payday", s: "Every hour, a quarter of the fees the coin holds is airdropped to all holders, if it holds 0.01 SOL or more.", kind: "Any coin" },
  { title: "Burn on buys", s: "It buys itself back with all its fees, then burns 5% of what it saved on every buy of 0.1 SOL or more.", kind: "SOL coins only" },
  { title: "Dip buy back", s: "When its price drops 10% inside 10 minutes, the coin buys itself back with a quarter of the fees it holds.", kind: "SOL coins only" },
  { title: "Milestone airdrop", s: "Each time its market cap passes $100,000, half the fees the coin holds are airdropped to all holders.", kind: "Any coin" },
  { title: "Random holder payout", s: "Every 6 hours, a random holder gets paid a quarter of the fees the coin holds, if it holds 0.01 SOL or more.", kind: "Any coin" },
  { title: "Fees to Nvidia", s: "Every time fees arrive, the coin buys tokenized NVDA stock with all of them.", kind: "SOL coins only" },
  { title: "Top holders bonus", s: "Every time fees arrive, half is airdropped to all holders and the other half is split by the top 5 holders.", kind: "Any coin" },
  { title: "Daily letter", s: "Each morning an AI writes a short note, posts it to the feed and emails it to you, and fees go to holders.", kind: "Any coin" },
  { title: "Streak counter", s: "It counts buys in a row on a public tile, back to zero on a sell, and airdrops the fees that arrive to holders.", kind: "Any coin" },
  { title: "Slow burn", s: "Every 10 minutes, while it holds 0.02 SOL of fees or more, it buys itself back with 0.01 SOL and burns that.", kind: "SOL coins only" },
  { title: "Pump party", s: "When its price climbs 20% inside an hour, half the fees the coin holds are airdropped to all holders.", kind: "Any coin" },
  { title: "Nasdaq and holders", s: "Every time fees arrive, half is airdropped to holders and the other half buys tokenized QQQ stock.", kind: "SOL coins only" },
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
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">pick a recipe</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          {RECIPES.length} ways <span className="text-mint">to run a coin.</span>
        </h1>
        <p className="mt-3 text-fog max-w-lg">
          Every recipe from the main site, in our words. Open one in the real builder — your coin launches
          on pump.fun with the rules locked on Solana.
        </p>
      </motion.div>

      <div className="mt-8 flex flex-wrap gap-2" data-testid="recipe-filters">
        {["All", "Any coin", "SOL coins only"].map((k) => (
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
          const liveMatch = live.find((c) => c.name && r.title && c.name.toLowerCase().replace(/\s+/g, "-") === r.title.toLowerCase().replace(/\s+/g, "-"));
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
                  r.kind === "Any coin" ? "text-tealx border-tealx/40 bg-tealx/10" : "text-bluc border-bluc/40 bg-bluc/10"
                }`}>
                  {r.kind}
                </span>
                {liveMatch && <span className="font-mono text-[10px] text-mint">live on circuit</span>}
              </div>
              <h3 className="mt-4 font-bold text-lg">{r.title}</h3>
              <p className="mt-2 text-sm text-fog leading-relaxed flex-1">“{r.s}”</p>
              <a
                href={liveMatch?.remix ? mainHref(liveMatch.remix) : MAIN_BUILDER}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`recipe-open-${i}`}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-line hover:border-mint/50 hover:text-mint text-snow font-semibold py-2.5 text-sm transition-all duration-200"
              >
                Open in builder <ArrowUpRight size={15} />
              </a>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
