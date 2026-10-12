import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Layers } from "lucide-react";
import { relayImg, useRules } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

export default function Rules() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useRules(page);
  const cards = data?.cards || [];

  const ruleSentences = useMemo(() => new Map(cards.map((c) => [c.href, c.summary])), [cards]);

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the rulebook gallery</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          Every rule set, <span className="text-mint">in the open.</span>
        </h1>
        <p className="mt-3 text-fog max-w-lg">
          {data?.total ?? "···"} programs running on real coins. Open one to see its blocks, or send it to
          Bolt to remix it into your own launch.
        </p>
      </motion.div>

      {isError && (
        <div className="mt-8 border border-red-400/30 bg-red-400/5 rounded-2xl p-6 font-mono text-sm text-red-300" data-testid="rules-error">
          relay hiccup — the feed is napping. try a refresh.
        </div>
      )}

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="rules-grid">
        {cards.map((c, i) => (
          <motion.div
            key={c.key || i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.35), ease: EASE }}
            className="group border border-line rounded-2xl bg-panel p-6 hover:border-mint/35 hover:-translate-y-1 transition-all duration-300 flex flex-col"
            data-testid={`rule-card-${i}`}
          >
            <div className="flex items-center gap-3">
              {c.image && <img src={relayImg(c.image)} alt={c.name} loading="lazy" className="w-10 h-10 rounded-lg object-cover" />}
              <div className="min-w-0">
                <div className="font-bold truncate">{c.name} <span className="text-mint font-mono text-xs">${c.ticker}</span></div>
                <div className="font-mono text-[10px] text-fog">{c.usedBy ? `${c.usedBy} blocks` : `${(c.blocks || []).length} blocks`} {c.starter ? "· starter" : ""}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-fog leading-relaxed flex-1">{c.summary}</p>
            <div className="mt-4 flex gap-2">
              <Link to={`/coin${c.href?.replace("/c", "") || ""}`} data-testid={`rule-open-${i}`}
                className="flex-1 text-center rounded-lg border border-line hover:border-mint/40 hover:text-mint text-fog font-mono text-[11px] py-2 transition-colors">
                open coin
              </Link>
              <Link to={`/builder?q=${encodeURIComponent(ruleSentences.get(c.href) || c.summary || "")}`} data-testid={`rule-remix-${i}`}
                className="flex-1 text-center rounded-lg bg-mint-bright hover:bg-mint text-[#0A0F16] font-bold font-mono text-[11px] py-2 transition-colors inline-flex items-center justify-center gap-1.5">
                <Layers size={12} /> remix
              </Link>
            </div>
          </motion.div>
        ))}
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-line rounded-2xl bg-panel h-52 animate-pulse" />
        ))}
      </div>

      {data?.pages > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          {Array.from({ length: Math.min(data.pages, 5) }).map((_, i) => (
            <button
              key={i}
              data-testid={`rules-page-${i + 1}`}
              onClick={() => setPage(i + 1)}
              className={`font-mono text-[11px] px-3.5 py-1.5 rounded-full border transition-colors ${
                page === i + 1 ? "bg-mint-deep text-mint border-mint/40" : "text-fog border-line hover:text-snow"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
