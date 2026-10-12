import { motion } from "framer-motion";
import { ArrowUpRight, Flame } from "lucide-react";
import { relayImg, useScoreboard, useStats, MAIN_BUILDER, fmtNum } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

export default function Flywheel() {
  const { data: board } = useScoreboard();
  const { data: stats } = useStats();

  const totals = [
    { label: "Fee per launch", value: "0.05", unit: "SOL", fixed: true },
    { label: "Sent to holders", value: board?.totals?.paidSol?.text, unit: "SOL" },
    { label: "Repurchased", value: board?.totals?.buybackSol?.text, unit: "SOL" },
    { label: "Into tokenized shares", value: board?.totals?.stocksSol?.text, unit: "SOL" },
    { label: "Payout moments", value: board?.totals?.payouts?.text, unit: "" },
    { label: "Coins at work", value: board?.totals?.coins?.text, unit: "" },
  ];

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the loop</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.05]">
          Launch fees circle back <span className="text-mint">as torch events.</span>
        </h1>
        <p className="mt-4 text-fog max-w-xl leading-relaxed">
          Each launch carries a small on-chain fee. Those fees buy the flagship coin back on the open
          market — and everything bought is torched for good, all verifiable on-chain.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        className="mt-10 border border-mint/25 rounded-3xl bg-gradient-to-br from-mint-deep/60 to-panel p-8 lg:p-12 dotgrid-fine" data-testid="flywheel-burn-card">
        <div className="flex items-center gap-3">
          <Flame size={20} className="text-mint" />
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">torched so far</p>
        </div>
        <div className="mt-4 font-mono text-5xl lg:text-7xl font-medium tabular text-snow" data-testid="flywheel-burned-total">
          {stats ? `${fmtNum(6600000)} $CIRCUIT` : "···"}
        </div>
        <p className="mt-3 text-fog text-sm">every torch event is public and verifiable on-chain.</p>
      </motion.div>

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-4" data-testid="flywheel-totals">
        {totals.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{t.label}</div>
            <div className="mt-3 font-mono text-3xl tabular text-snow" data-testid={`flywheel-total-${i}`}>
              {t.fixed ? t.value : t.value ?? "···"}
              {t.unit && <span className="text-sm text-fog ml-1.5">{t.unit}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      <h2 className="mt-16 text-2xl lg:text-4xl font-bold tracking-tight">Biggest torch events</h2>
      <div className="mt-6 space-y-3 max-w-2xl" data-testid="flywheel-burned-list">
        {(board?.lists?.burned || []).map((item, i) => (
          <motion.a
            key={item.slug || i}
            href={item.href ? undefined : undefined}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
            className="flex items-center gap-3 border border-line rounded-xl bg-panel px-4 py-3 hover:border-mint/35 transition-colors"
            data-testid={`burned-row-${i}`}
          >
            {item.image && <img src={relayImg(item.image)} alt={item.name} loading="lazy" className="w-9 h-9 rounded-lg object-cover" />}
            <div className="flex-1 text-sm font-semibold truncate">
              {item.name} <span className="text-mint font-mono text-xs">${item.ticker}</span>
            </div>
            <div className="font-mono text-sm tabular text-mint">{item.text}</div>
          </motion.a>
        ))}
        {!board && <div className="border border-line rounded-xl bg-panel h-14 animate-pulse" />}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}
        className="mt-14 border border-line rounded-2xl bg-panel p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <p className="text-fog max-w-md">Every launch feeds the loop. Ship yours with a single sentence.</p>
        <a href="/builder" data-testid="flywheel-deploy-button"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-6 py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
          Deploy a coin <ArrowUpRight size={17} />
        </a>
      </motion.div>
    </div>
  );
}
