import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

const LOG = [
  { v: "1.4", d: "Every page of the engine now lives here — rulebook gallery, live pulse, payouts, stats, docs, embeds and coin pages, all relayed.", when: "today" },
  { v: "1.3", d: "Discover tightened: only coins launched through CodePad appear. The blocky workshop gained the full 134-block catalog as its palette.", when: "today" },
  { v: "1.2", d: "Stocks page ticks with live tokenized-share prices. Burn program rebranded and paired with AI agents on duty.", when: "earlier this week" },
  { v: "1.1", d: "Wallet sign-in arrived: connect, sign once, launch — all through the relay. Bolt reads one line and snaps out blocks.", when: "earlier this week" },
  { v: "1.0", d: "CodePad opens: builder, explore, scoreboard, library, recipes and the loop — everything relayed, nothing to trust.", when: "launch week" },
];

export default function Updates() {
  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">what's new</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          The ship log.
        </h1>
      </motion.div>

      <div className="mt-12 space-y-4" data-testid="updates-list">
        {LOG.map((u, i) => (
          <motion.div
            key={u.v}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6 flex gap-5"
            data-testid={`update-${i}`}
          >
            <span className="font-mono text-mint text-sm shrink-0">v{u.v}</span>
            <div>
              <p className="text-[#161613] leading-relaxed">{u.d}</p>
              <p className="font-mono text-[10px] text-fog mt-2">{u.when}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
