import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Rocket } from "lucide-react";
import CoinCard from "@/components/CoinCard";
import { useExplore, useLaunches, MAIN_BUILDER } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

export default function Explore() {
  const { data, isLoading, isError } = useExplore();
  const { data: launches } = useLaunches();
  const [onlyOurs, setOnlyOurs] = useState(true);

  const cards = data?.cards || [];
  const ours = useMemo(() => {
    const mints = new Set((launches?.launches || []).map((l) => l.mint));
    return cards.filter((c) => mints.has(c.mint));
  }, [cards, launches]);

  const shown = onlyOurs ? ours : cards;
  const tagCodes = useMemo(() => {
    const set = new Set();
    shown.forEach((c) => (c.tags || []).forEach((t) => set.add(t.code)));
    return ["All", ...Array.from(set)];
  }, [shown]);
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? shown : shown.filter((c) => (c.tags || []).some((t) => t.code === filter));

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-mint animate-blink" /> relayed live
        </p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">Explore</h1>
        <p className="mt-3 text-fog max-w-lg">
          Coins launched through this portal, tracked by us — nothing else. Flip the switch to peek at the
          whole pad.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2" data-testid="explore-scope-toggle">
          {[
            { k: true, label: "Launched via CodePad", tid: "scope-ours" },
            { k: false, label: "All pad coins", tid: "scope-all" },
          ].map((s) => (
            <button
              key={s.label}
              data-testid={s.tid}
              onClick={() => { setOnlyOurs(s.k); setFilter("All"); }}
              className={`font-mono text-[11px] px-3.5 py-1.5 rounded-full border transition-colors ${
                onlyOurs === s.k ? "bg-mint-deep text-mint border-mint/40" : "text-fog border-line hover:text-snow"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {tagCodes.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2" data-testid="explore-filters">
            {tagCodes.map((t) => (
              <button
                key={t}
                data-testid={`filter-chip-${t.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => setFilter(t)}
                className={`font-mono text-[10px] px-3 py-1 rounded-full border transition-colors ${
                  filter === t ? "bg-mint-deep text-mint border-mint/40" : "text-fog border-line hover:text-snow"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {isError && (
        <div className="mt-10 border border-red-400/30 bg-red-400/5 rounded-2xl p-6 font-mono text-sm text-red-300" data-testid="explore-error">
          relay hiccup — the feed is napping. try a refresh.
        </div>
      )}

      {onlyOurs && !isLoading && ours.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          className="mt-10 border border-mint/25 rounded-3xl bg-gradient-to-br from-mint-deep/50 to-panel p-10 text-center dotgrid-fine" data-testid="explore-empty-ours">
          <Rocket size={26} className="text-mint mx-auto" />
          <h2 className="mt-4 font-extrabold text-2xl">No CodePad launches yet.</h2>
          <p className="mt-2 text-fog max-w-sm mx-auto">The first coin launched through this portal lands here, tracked by its mint. Be the one.</p>
          <a href={MAIN_BUILDER} target="_blank" rel="noopener noreferrer" data-testid="empty-ours-cta"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-6 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
            Launch the first one <ArrowRight size={16} />
          </a>
        </motion.div>
      )}

      {isLoading && (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-line rounded-2xl bg-panel h-72 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (onlyOurs ? ours.length > 0 : true) && (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="explore-grid">
          {filtered.map((c, i) => (
            <CoinCard key={c.slug || i} coin={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
