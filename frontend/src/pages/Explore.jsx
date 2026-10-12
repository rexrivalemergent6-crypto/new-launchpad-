import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import CoinCard from "@/components/CoinCard";
import { useExplore } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

export default function Explore() {
  const { data, isLoading, isError } = useExplore();
  const [filter, setFilter] = useState("All");

  const cards = data?.cards || [];
  const tagCodes = useMemo(() => {
    const set = new Set();
    cards.forEach((c) => (c.tags || []).forEach((t) => set.add(t.code)));
    return ["All", ...Array.from(set)];
  }, [cards]);

  const shown = filter === "All" ? cards : cards.filter((c) => (c.tags || []).some((t) => t.code === filter));

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-mint animate-blink" /> relayed live
        </p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">Explore</h1>
        <p className="mt-3 text-fog max-w-lg">
          Every coin off the pad, streamed in through the relay. Filter what you like, then jump straight
          into the builder — no detours.
        </p>
        <a
          href="/builder"
          data-testid="explore-deploy-button"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-6 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]"
        >
          Deploy a coin <ArrowRight size={16} />
        </a>
      </motion.div>

      <div className="mt-8 flex flex-wrap gap-2" data-testid="explore-filters">
        {tagCodes.map((t) => (
          <button
            key={t}
            data-testid={`filter-chip-${t.replace(/\s+/g, "-").toLowerCase()}`}
            onClick={() => setFilter(t)}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded-full border transition-colors ${
              filter === t ? "bg-mint-deep text-mint border-mint/40" : "text-fog border-line hover:text-snow"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-line rounded-2xl bg-panel h-72 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="mt-10 border border-red-400/30 bg-red-400/5 rounded-2xl p-6 font-mono text-sm text-red-300" data-testid="explore-error">
          relay hiccup — the feed is napping. try a refresh.
        </div>
      )}

      {!isLoading && (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="explore-grid">
          {shown.map((c, i) => (
            <CoinCard key={c.slug || i} coin={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
