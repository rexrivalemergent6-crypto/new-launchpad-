import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1];

const SECTIONS = [
  {
    t: "The idea in one breath",
    b: "A coin on CodePad carries a small program made of blocks. You describe the program in a sentence, Bolt translates it into those blocks, and once you launch, the coin executes them forever — paid from the fees it earns itself.",
  },
  {
    t: "Where the money sits",
    b: "Every coin has its own vault on-chain. Fees that buyers pay land in that vault — nothing is pooled with other coins and nothing is held by you or by us personally.",
  },
  {
    t: "How a run works",
    b: "The program wakes on its triggers — a trade, a passing price level, the clock. It walks its blocks top to bottom, moves only what its rules allow from the vault, then writes a receipt anyone can check.",
  },
  {
    t: "Limits keep coins honest",
    b: "A coin can only spend what it has earned. Vaults start empty, and spending is capped by earnings — a hot launch does not create solvency, it only fills the jar faster.",
  },
  {
    t: "Receipts, not promises",
    b: "Each run leaves an on-chain receipt: what the rule saw, what it did, what it cost. You never have to trust a dashboard — you can verify the chain itself.",
  },
  {
    t: "Frozen after launch",
    b: "Rules are fingerprinted at launch and locked. You can launch a new coin with new rules, but a live coin cannot be edited by anyone, including us.",
  },
  {
    t: "Plain english first",
    b: "Every block set is readable as a normal sentence, so holders always know what a coin does without reading bytecode.",
  },
  {
    t: "If the rails ever nap",
    b: "Block execution depends on the automation rails; if they pause, runs pause and resume later — vaults stay untouched on-chain and nothing is lost.",
  },
  {
    t: "What launching costs",
    b: "A small flat launch fee per coin plus the network's own costs. Fees from launches feed the CodePad program: buybacks, burns, and the AI agents that keep coins running.",
  },
  {
    t: "AI credit",
    b: "Blocks that think (names, words, decisions) consume a small AI credit per run so a chatty coin can't drain its own vault.",
  },
];

export default function Docs() {
  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the handbook</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          How CodePad <span className="text-mint">works.</span>
        </h1>
        <p className="mt-3 text-fog max-w-lg">
          Ten short truths about blocks, vaults, receipts and locked rules. Read once, launch forever.
        </p>
      </motion.div>

      <div className="mt-12 space-y-4" data-testid="docs-sections">
        {SECTIONS.map((s, i) => (
          <motion.div
            key={s.t}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.3), ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-7 hover:border-mint/30 transition-colors"
            data-testid={`docs-section-${i}`}
          >
            <h2 className="font-bold text-xl flex items-center gap-3">
              <span className="font-mono text-mint text-xs">{String(i + 1).padStart(2, "0")}</span> {s.t}
            </h2>
            <p className="mt-2.5 text-fog leading-relaxed">{s.b}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 border border-line rounded-2xl bg-panel p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <p className="text-fog">Enough reading — one sentence and Bolt does the rest.</p>
        <Link to="/builder" data-testid="docs-to-builder"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-6 py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
          Open the builder <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
