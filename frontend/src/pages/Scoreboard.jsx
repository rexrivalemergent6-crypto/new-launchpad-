import { motion } from "framer-motion";
import { relayImg, useScoreboard, mainHref } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

const TOTALS = [
  { key: "paidSol", label: "Paid to holders", unit: "SOL" },
  { key: "burnedTokens", label: "Supply torched", unit: "$CODEPAD" },
  { key: "buybackSol", label: "Bought back", unit: "SOL" },
  { key: "stocksSol", label: "In tokenized stocks", unit: "SOL" },
  { key: "payouts", label: "Payout events", unit: "" },
  { key: "coins", label: "Coins doing things", unit: "" },
];

const LISTS = [
  { key: "paid", title: "Top payouts" },
  { key: "burned", title: "Most burned" },
  { key: "boughtBack", title: "Top buybacks" },
  { key: "payouts", title: "Payout events" },
];

function ListRow({ item, i }) {
  return (
    <motion.a
      href={mainHref(item.href)}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
      className="flex items-center gap-3 border border-line rounded-xl bg-panel px-4 py-3 hover:border-mint/35 hover:-translate-y-0.5 transition-all duration-200"
      data-testid={`scoreboard-row-${i}`}
    >
      {item.image && (
        <img src={relayImg(item.image)} alt={item.name} loading="lazy" className="w-9 h-9 rounded-lg object-cover shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">
          {item.name} <span className="text-mint font-mono text-xs">${item.ticker}</span>
        </div>
      </div>
      <div className="font-mono text-sm tabular text-[#161613] shrink-0">{item.text}</div>
    </motion.a>
  );
}

export default function Scoreboard() {
  const { data, isLoading, isError } = useScoreboard();

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-mint animate-blink" /> relayed live
        </p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">Scoreboard</h1>
        <p className="mt-3 text-fog max-w-lg">The receipts — every payout, burn and buyback the coins' rules have made with their own fees.</p>
      </motion.div>

      {isError && (
        <div className="mt-8 border border-red-400/30 bg-red-400/5 rounded-2xl p-6 font-mono text-sm text-red-300" data-testid="scoreboard-error">
          relay hiccup — the feed is napping. try a refresh.
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-4" data-testid="scoreboard-totals">
        {TOTALS.map((t, i) => (
          <motion.div
            key={t.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{t.label}</div>
            <div className="mt-3 font-mono text-3xl lg:text-4xl tabular text-mint" data-testid={`total-${t.key}`}>
              {isLoading ? "···" : (data?.totals?.[t.key]?.text ?? "—")}
              {data?.totals?.[t.key]?.text && t.unit && <span className="text-sm text-fog ml-1.5">{t.unit}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 grid md:grid-cols-2 gap-8">
        {LISTS.map((l) => (
          <div key={l.key}>
            <h2 className="font-bold text-xl mb-4">{l.title}</h2>
            <div className="space-y-3" data-testid={`list-${l.key}`}>
              {(data?.lists?.[l.key] || []).map((item, i) => (
                <ListRow key={item.slug || i} item={item} i={i} />
              ))}
              {!data && <div className="border border-line rounded-xl bg-panel h-14 animate-pulse" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
