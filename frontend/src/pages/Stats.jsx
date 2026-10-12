import { motion } from "framer-motion";
import StatStrip from "@/components/StatStrip";
import { useScoreboard } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

export default function Stats() {
  const { data: board } = useScoreboard();

  const rows = [
    { label: "Sent to holders", value: board?.totals?.paidSol?.text, unit: "SOL" },
    { label: "Supply torched", value: board?.totals?.burnedTokens?.text, unit: "$CODEPAD" },
    { label: "Repurchased", value: board?.totals?.buybackSol?.text, unit: "SOL" },
    { label: "Into tokenized shares", value: board?.totals?.stocksSol?.text, unit: "SOL" },
    { label: "Payout moments", value: board?.totals?.payouts?.text, unit: "" },
    { label: "Coins at work", value: board?.totals?.coins?.text, unit: "" },
  ];

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the numbers</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          All of it, <span className="text-mint">out loud.</span>
        </h1>
      </motion.div>

      <div className="mt-10">
        <StatStrip />
      </div>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-4" data-testid="stats-grid">
        {rows.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{t.label}</div>
            <div className="mt-3 font-mono text-3xl tabular text-mint" data-testid={`stats-total-${i}`}>
              {t.value ?? "···"} {t.unit && <span className="text-sm text-fog ml-1.5">{t.unit}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
