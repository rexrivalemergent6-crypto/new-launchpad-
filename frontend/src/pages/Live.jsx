import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLive, timeAgo } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

const KIND_STYLE = {
  buy: "text-mint border-mint/40 bg-mint/10",
  sell: "text-red-300 border-red-400/40 bg-red-400/10",
};

export default function Live() {
  const { data, refetch, isFetching } = useLive();
  const items = data?.items || [];

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-mint animate-blink" /> the pulse
        </p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">Live trades</h1>
        <p className="mt-3 text-fog max-w-lg">
          Every buy and sell on pad coins as it happens. Refreshes itself — just watch.
        </p>
        <button onClick={() => refetch()} data-testid="live-refresh" disabled={isFetching}
          className="mt-4 font-mono text-[11px] text-fog border border-line rounded-full px-3.5 py-1.5 hover:text-mint hover:border-mint/40 transition-colors disabled:opacity-40">
          {isFetching ? "refreshing…" : "refresh now"}
        </button>
      </motion.div>

      <div className="mt-8 space-y-2 max-w-3xl" data-testid="live-feed">
        {items.map((t, i) => (
          <motion.div
            key={t.id || i}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3), ease: EASE }}
          >
            <Link
              to={`/coin${t.href?.replace("/c", "") || ""}`}
              data-testid={`live-row-${i}`}
              className="flex items-center justify-between gap-3 border border-line rounded-xl bg-panel px-4 py-3 hover:border-mint/35 transition-colors"
            >
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-md border ${KIND_STYLE[t.kind] || "text-fog border-line"}`}>
                {t.kind}
              </span>
              <span className="flex-1 text-sm text-snow/85 truncate px-2">{t.text}</span>
              <span className="font-mono text-[10px] text-fog shrink-0">{timeAgo(t.at)}</span>
            </Link>
          </motion.div>
        ))}
        {!items.length && <p className="text-fog font-mono text-sm py-10 text-center">waiting for the first trade…</p>}
      </div>
    </div>
  );
}
