import { motion } from "framer-motion";
import { ArrowUpRight, Flame, Bot } from "lucide-react";
import { useOurLedger } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

export default function Flywheel() {
  const ours = useOurLedger();

  const totals = [
    { label: "Fee per launch", value: "0.05", unit: "SOL", note: "set on-chain, same for every coin" },
    { label: "Launches through CodePad", value: ours.count, unit: "", note: "each one feeds the program" },
    { label: "SOL they traded", value: ours.volumeSol ? ours.volumeSol.toFixed(2) : "0", unit: "SOL", note: "live from our coins" },
    { label: "AI starter per coin", value: "0.0022", unit: "SOL", note: "funds its AI blocks from birth" },
  ];

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the CodePad program</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.05]">
          Launch fees will buy back <span className="text-mint">and burn $CODEPAD.</span>
        </h1>
        <p className="mt-4 text-fog max-w-xl leading-relaxed">
          Every launch on CodePad pays a small fee. Once our own coin is live, the program uses
          those fees to buy $CODEPAD back on the open market and torch it — with AI agents running
          the rails around the clock. Everything lands on-chain where anyone can verify it.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        className="mt-10 border border-mint/25 rounded-3xl bg-gradient-to-br from-mint-deep/60 to-panel p-8 lg:p-12 dotgrid-fine" data-testid="flywheel-burn-card">
        <div className="flex items-center gap-3">
          <Flame size={20} className="text-mint" />
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">torched so far</p>
        </div>
        <div className="mt-4 font-mono text-5xl lg:text-7xl font-medium tabular text-snow" data-testid="flywheel-burned-total">
          0 $CODEPAD
        </div>
        <p className="mt-3 text-fog text-sm" data-testid="flywheel-burned-note">
          the counter starts the day our own coin launches — nothing has been torched yet, and no
          other token’s numbers count here. Every torch event will be public and verifiable on-chain.
        </p>
      </motion.div>

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="flywheel-totals">
        {totals.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog flex items-center gap-1.5">
              {t.label.startsWith("AI") && <Bot size={12} className="text-mint" />}
              {t.label}
            </div>
            <div className="mt-3 font-mono text-3xl tabular text-snow" data-testid={`flywheel-total-${i}`}>
              {t.value}
              {t.unit && <span className="text-sm text-fog ml-1.5">{t.unit}</span>}
            </div>
            <div className="mt-2 font-mono text-[10px] text-fog/70">{t.note}</div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}
        className="mt-14 border border-line rounded-2xl bg-panel p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <p className="text-fog max-w-md">
          {ours.count
            ? `Your launches have sent ${ours.volumeSol ? ours.volumeSol.toFixed(2) : "0"} SOL through the program so far.`
            : "Every launch feeds the program. Ship yours with a single sentence."}
        </p>
        <a href="/builder?launch=1" data-testid="flywheel-deploy-button"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#0A0F16] font-bold px-6 py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
          Deploy a coin <ArrowUpRight size={17} />
        </a>
      </motion.div>
    </div>
  );
}