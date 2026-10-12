import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layers, Rocket } from "lucide-react";
import { useRules } from "@/lib/relay";
import { CodePadMark } from "@/components/Sidebar";
import { makeTicker, templateTitle } from "@/lib/templates";

const EASE = [0.16, 1, 0.3, 1];
const kebab = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// summaries are live; only the upstream "open the coin" pointer is reworded, since cards no longer link to it
const cleanSummary = (s) => String(s || "").replace(/Open the coin to read them in plain English\.?/i, "Remix it to see every block in plain English.");

export default function Rules() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useRules(page);
  const cards = data?.cards || [];

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the template gallery</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          Launch-ready <span className="text-mint">templates.</span>
        </h1>
        <p className="mt-3 text-fog max-w-lg" data-testid="rules-note">
          {data?.total ?? "···"} live rule sets, already running on real coins. Remix one and make it yours —
          or launch it as-is with a fresh name and ticker.
        </p>
      </motion.div>

      {isError && (
        <div className="mt-8 border border-red-400/30 bg-red-400/5 rounded-2xl p-6 font-mono text-sm text-red-300" data-testid="rules-error">
          relay hiccup — the feed is napping. try a refresh.
        </div>
      )}

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="rules-grid">
        {cards.map((c, i) => {
          const slug = c.slug;
          const sk = kebab(slug);
          const nBlocks = typeof c.blocks === "number" ? c.blocks : (c.blocks || []).length;
          return (
            <motion.div
              key={c.key || slug || i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.35), ease: EASE }}
              className="group border border-line rounded-2xl bg-panel p-6 hover:border-mint/35 transition-colors duration-300 flex flex-col"
              data-testid={`rule-card-${i}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 shrink-0 rounded-xl bg-ink border border-line grid place-items-center" data-testid={`rules-logo-${sk}`}>
                  <CodePadMark size={30} />
                </span>
                <div className="min-w-0">
                  <div className="font-bold truncate" data-testid={`rules-title-${sk}`}>
                    {templateTitle(c)} <span className="text-mint font-mono text-xs" data-testid={`rules-ticker-${sk}`}>${makeTicker(slug)}</span>
                  </div>
                  <div className="font-mono text-[10px] text-fog">
                    {nBlocks} blocks{c.usedBy ? ` · used by ${c.usedBy}` : ""}{c.trades ? ` · ${c.trades.toLocaleString()} trades` : ""}{c.starter ? " · starter" : ""}
                  </div>
                </div>
              </div>
              {c.kinds?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.kinds.slice(0, 5).map((k) => (
                    <span key={k} className="px-2 py-0.5 rounded-full border border-line font-mono text-[10px] text-fog">{k}</span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-sm text-fog leading-relaxed flex-1">{cleanSummary(c.summary)}</p>
              <div className="mt-5 flex gap-2.5">
                <Link to={`/builder?remix=${encodeURIComponent(slug)}`} data-testid={`rules-remix-${sk}`}
                  className="flex-1 h-[42px] rounded-xl border-2 border-line hover:border-mint/60 hover:text-mint text-snow font-bold text-[14px] inline-flex items-center justify-center gap-1.5 transition-colors">
                  <Layers size={14} /> Remix
                </Link>
                <Link to={`/builder?remix=${encodeURIComponent(slug)}&launch=1`} data-testid={`rules-launch-${sk}`}
                  className="flex-1 h-[42px] rounded-xl bg-mint-bright hover:bg-mint text-[#0A0F16] font-extrabold text-[14px] inline-flex items-center justify-center gap-1.5 border-2 border-black/55 shadow-[3px_3px_0_rgba(0,0,0,0.42)] transition-colors">
                  <Rocket size={14} /> Launch this
                </Link>
              </div>
            </motion.div>
          );
        })}
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
