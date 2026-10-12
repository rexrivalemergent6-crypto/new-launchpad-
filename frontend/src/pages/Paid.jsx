import { motion } from "framer-motion";
import { relayImg, useScoreboard } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

function Row({ item, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
      className="flex items-center gap-3 border border-line rounded-xl bg-panel px-4 py-3"
      data-testid={`paid-row-${i}`}
    >
      {item.image && <img src={relayImg(item.image)} alt={item.name} loading="lazy" className="w-9 h-9 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1 text-sm font-semibold truncate">
        {item.name} <span className="text-mint font-mono text-xs">${item.ticker}</span>
      </div>
      <div className="font-mono text-sm tabular text-mint">{item.text}</div>
    </motion.div>
  );
}

export default function Paid() {
  const { data, isLoading } = useScoreboard();
  const paid = data?.lists?.paid || [];
  const payouts = data?.lists?.payouts || [];

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">money on the record</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          Every payout, <span className="text-mint">public.</span>
        </h1>
        <p className="mt-3 text-fog max-w-lg">
          {data?.totals?.paidSol?.text ?? "···"} SOL has reached holders so far, across{" "}
          {data?.totals?.payouts?.text ?? "···"} payout moments. Nothing here is a promise — it already happened.
        </p>
      </motion.div>

      <div className="mt-10 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-bold text-xl mb-4">Top payers</h2>
          <div className="space-y-3" data-testid="paid-list">
            {paid.map((item, i) => <Row key={item.slug || i} item={item} i={i} />)}
            {isLoading && <div className="border border-line rounded-xl bg-panel h-14 animate-pulse" />}
          </div>
        </div>
        <div>
          <h2 className="font-bold text-xl mb-4">Latest payout moments</h2>
          <div className="space-y-3" data-testid="payouts-list">
            {payouts.map((item, i) => <Row key={item.slug || i} item={item} i={i} />)}
            {isLoading && <div className="border border-line rounded-xl bg-panel h-14 animate-pulse" />}
          </div>
        </div>
      </div>
    </div>
  );
}
