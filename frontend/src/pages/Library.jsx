import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Tag } from "@/components/blocks";

const EASE = [0.16, 1, 0.3, 1];

const FAMILIES = [
  { tag: "EV", color: "#D9A33C", name: "Events", desc: "When things happen on your coin." },
  { tag: "LG", color: "#2DD4BF", name: "Logic", desc: "Decide what happens next." },
  { tag: "CT", color: "#5B8DEF", name: "Checks", desc: "Yes-or-no questions for your ifs." },
  { tag: "AG", color: "#F472B6", name: "Agents", desc: "Characters that live in your world." },
  { tag: "AI", color: "#60A5FA", name: "AI", desc: "Names, words and decisions." },
  { tag: "MD", color: "#A78BFA", name: "Media", desc: "Pictures and cards." },
  { tag: "WB", color: "#38BDF8", name: "Web", desc: "Talk to the rest of the internet." },
  { tag: "WD", color: "#4ADE80", name: "Worlds", desc: "A place for everything to live." },
  { tag: "FN", color: "#E7C85F", name: "Money", desc: "Send, buy back, burn and airdrop from the coin's vault." },
  { tag: "BT", color: "#FB923C", name: "Bounties", desc: "Reward people for doing things." },
  { tag: "OP", color: "#F472B6", name: "Social", desc: "Post where your holders are." },
  { tag: "DT", color: "#22D3EE", name: "Data", desc: "Lists, randomness and numbers." },
  { tag: "ST", color: "#94A3B8", name: "State", desc: "Remember things between runs." },
  { tag: "MO", color: "#4ADE80", name: "Your modules", desc: "Events that arrive as webhooks, values you read, actions you send." },
];

export default function Library() {
  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the block library</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          Every block <span className="text-mint">a coin can hold.</span>
        </h1>
        <p className="mt-3 text-fog max-w-lg">
          Fourteen families of blocks snap together like parts of a circuit. Ask Chip for any of them in
          the builder.
        </p>
      </motion.div>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="library-grid">
        {FAMILIES.map((f, i) => (
          <motion.div
            key={f.tag}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.35), ease: EASE }}
            className="group border border-line rounded-2xl bg-panel p-6 hover:border-mint/35 hover:-translate-y-1 transition-all duration-300"
            data-testid={`library-card-${f.tag}`}
          >
            <div className="flex items-center justify-between">
              <Tag k={f.tag} />
              <span className="font-mono text-[10px] text-fog/60">{f.tag}</span>
            </div>
            <h3 className="mt-4 font-bold text-lg">{f.name}</h3>
            <p className="mt-1.5 text-sm text-fog leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}
        className="mt-12 border border-line rounded-2xl bg-panel p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <p className="text-fog max-w-md">Snap any of these together in the builder — one sentence, or block by block.</p>
        <Link to="/builder" data-testid="library-to-builder"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-6 py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
          Open the builder <ArrowUpRight size={17} />
        </Link>
      </motion.div>
    </div>
  );
}
