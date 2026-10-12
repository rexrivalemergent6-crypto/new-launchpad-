import { useState } from "react";
import { motion } from "framer-motion";

export const COLORS = {
  EV: "#D9A33C",
  LG: "#2DD4BF",
  CT: "#5B8DEF",
  DT: "#22D3EE",
  ST: "#34D399",
  AG: "#C084FC",
  AI: "#F472B6",
  WB: "#38BDF8",
  MD: "#A78BFA",
  WD: "#4ADE80",
  FN: "#E7C85F",
  SK: "#A3E635",
  BT: "#FB923C",
  OP: "#F87171",
  MO: "#CBD5E1",
};

export const Tag = ({ k, color }) => {
  const c = color || COLORS[k] || "#94A3B8";
  return (
    <span className="badge" style={{ color: c, borderColor: c, background: `${c}14` }}>
      {k}
    </span>
  );
};

export const SelectPill = ({ children, accent }) => (
  <span className={`pill ${accent ? "pill-accent" : ""}`}>
    {children}
    <span className="pill-caret">▾</span>
  </span>
);

export const NumPill = ({ v, onCycle }) => (
  <button
    type="button"
    data-testid="block-number-pill"
    onClick={onCycle}
    className="pill pill-num cursor-pointer select-none active:scale-95 transition-transform"
  >
    {v}
  </button>
);

export const AmtPill = ({ v }) => (
  <span className="pill pill-amt">{v}</span>
);

export const TokenPill = ({ t }) => <span className="pill">{t} ▾</span>;

const spring = { type: "spring", stiffness: 260, damping: 22 };

function EventBlock({ delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay }}
      className="blk blk-tab inline-flex items-center gap-3 px-4 py-3 self-start"
      style={{ "--bc": COLORS.EV }}
    >
      <Tag k="EV" />
      <span className="text-[15px] text-snow/90">when creator fees arrive</span>
    </motion.div>
  );
}

function LogicBlock({ delay, chance, onCycle }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay }}
      className="blk inline-flex items-center gap-3 px-4 py-3 self-start"
      style={{ "--bc": COLORS.LG }}
    >
      <Tag k="LG" />
      <span className="text-[15px] text-snow/90">with</span>
      <NumPill v={chance} onCycle={onCycle} />
      <span className="text-[15px] text-snow/90">% chance</span>
    </motion.div>
  );
}

function ActionBar({ delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 34 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay }}
      className="blk blk-tab inline-flex flex-wrap items-center gap-2.5 px-4 py-3 ml-14 sm:ml-16 max-w-full"
      style={{ "--bc": COLORS.FN }}
    >
      <Tag k="FN" />
      <span className="text-[15px] text-snow/90">airdrop a</span>
      <SelectPill>fixed amount</SelectPill>
      <AmtPill v="50" />
      <span className="text-[15px] text-snow/90">% of</span>
      <SelectPill accent>event amount</SelectPill>
      <span className="text-[15px] text-snow/90">of</span>
      <TokenPill t="SOL" />
      <span className="text-[15px] text-snow/90">to</span>
      <SelectPill>all</SelectPill>
      <AmtPill v="10" />
      <span className="text-[15px] text-snow/90">holders</span>
    </motion.div>
  );
}

const CYCLES = [10, 25, 50, 75, 100];

export function RuleStack({ className = "" }) {
  const [ci, setCi] = useState(2);
  const [ci2, setCi2] = useState(2);
  const cycle = (setter, val) => () => {
    const i = CYCLES.indexOf(val);
    setter(CYCLES[(i + 1) % CYCLES.length]);
  };

  return (
    <div className={`relative flex flex-col gap-3 ${className}`} data-testid="rule-stack">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.55 }}
        className="absolute -top-12 right-0 font-mono text-lg px-5 py-2.5 rounded-xl border border-line bg-panel/90"
        data-testid="block-count-chip"
      >
        5 blocks
      </motion.div>

      <EventBlock delay={0.15} />
      <LogicBlock delay={0.3} chance={CYCLES[ci]} onCycle={cycle(setCi, CYCLES[ci])} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="blk blk-slot flex flex-col gap-3 p-4 self-start w-full sm:w-auto sm:min-w-[420px]"
        style={{ "--bc": COLORS.LG }}
      >
        <div className="flex flex-col gap-3">
          <span className="text-[15px] text-snow/90">do</span>
          <ActionBar delay={0.45} />
        </div>
        <div className="text-[15px] text-snow/90 mt-1">otherwise</div>
      </motion.div>
    </div>
  );
}

export function MiniBlock({ tag, color, children }) {
  return (
    <div className="blk inline-flex items-center gap-2.5 px-3.5 py-2.5 text-[13px]" style={{ "--bc": color }}>
      <Tag k={tag} />
      <span className="text-snow/85">{children}</span>
    </div>
  );
}
