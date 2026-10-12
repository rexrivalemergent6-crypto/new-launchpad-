import { motion } from "framer-motion";
import { CodePadMark, Logo } from "@/components/Sidebar";
import XIcon from "@/components/XIcon";

const EASE = [0.16, 1, 0.3, 1];

const SWATCHES = [
  { name: "Ink", hex: "#0A0F16" },
  { name: "Panel", hex: "#0E141D" },
  { name: "Mint", hex: "#4ADE80" },
  { name: "Mint bright", hex: "#6EE7A0" },
  { name: "Signal blue", hex: "#5B8DEF" },
  { name: "Amber", hex: "#D9A33C" },
];

export default function Brand() {
  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">brand kit</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          Use it <span className="text-mint">loudly.</span>
        </h1>
      </motion.div>

      <div className="mt-10 grid sm:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE }}
          className="border border-line rounded-2xl bg-panel p-8 flex flex-col items-center gap-5" data-testid="brand-mark">
          <CodePadMark size={96} />
          <p className="font-mono text-[10px] text-fog">the mark — terminal prompt, cursor, underscore</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
          className="border border-line rounded-2xl bg-panel p-8 flex flex-col items-center gap-5" data-testid="brand-logo">
          <Logo />
          <p className="font-mono text-[10px] text-fog">the wordmark — Code in snow, Pad in mint</p>
        </motion.div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="brand-swatches">
        {SWATCHES.map((s, i) => (
          <motion.div key={s.hex} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3), ease: EASE }}
            className="border border-line rounded-xl overflow-hidden" data-testid={`swatch-${s.name.replace(/\s+/g, "-").toLowerCase()}`}>
            <div className="h-14" style={{ background: s.hex }} />
            <div className="px-3 py-2 bg-panel font-mono text-[10px] text-fog flex justify-between">
              <span>{s.name}</span><span>{s.hex}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 border border-line rounded-2xl bg-panel p-6 flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] text-fog">the only social account, ever:</p>
        <a href="https://x.com/usecodepad" target="_blank" rel="noopener noreferrer" data-testid="brand-x-link"
          className="inline-flex items-center gap-2 rounded-xl border border-line hover:border-mint/40 hover:text-mint text-fog font-semibold px-4 py-2.5 text-sm transition-colors">
          <XIcon size={13} /> @usecodepad
        </a>
      </div>
    </div>
  );
}
