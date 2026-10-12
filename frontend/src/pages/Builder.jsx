import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Plus, X, ArrowRight } from "lucide-react";
import { Tag, SelectPill, NumPill, AmtPill, TokenPill } from "@/components/blocks";
import { useExplore, MAIN_BUILDER, MAIN_START } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];
const CYCLES = [10, 25, 50, 75, 100];
let nextId = 100;

const RECIPES = [
  "When fees arrive, buy Nvidia with half and airdrop the rest to holders.",
  "When market cap crosses $100k, burn 10% of the tokens the coin holds.",
  "Send 20% of fees to a random holder every hour.",
];

function EventRow({ onDelete }) {
  return (
    <motion.div layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: EASE }}
      className="blk blk-tab group inline-flex items-center gap-3 px-4 py-3 self-start" style={{ "--bc": "#D9A33C" }} data-testid="builder-block-event">
      <Tag k="EV" />
      <span className="text-[15px] text-snow/90">when creator fees arrive</span>
      {onDelete && <button onClick={onDelete} data-testid="block-delete" className="ml-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-fog"><X size={14} /></button>}
    </motion.div>
  );
}

function LogicRow({ chance, onCycle, onDelete }) {
  return (
    <motion.div layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: EASE }}
      className="blk group inline-flex items-center gap-3 px-4 py-3 self-start" style={{ "--bc": "#2DD4BF" }} data-testid="builder-block-logic">
      <Tag k="LG" />
      <span className="text-[15px] text-snow/90">with</span>
      <NumPill v={chance} onCycle={onCycle} />
      <span className="text-[15px] text-snow/90">% chance</span>
      {onDelete && <button onClick={onDelete} data-testid="block-delete" className="ml-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-fog"><X size={14} /></button>}
    </motion.div>
  );
}

function ActionGroup({ onDelete, chance, amt, onCycleChance, onCycleAmt }) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
      className="blk blk-slot group flex flex-col gap-3 p-4 self-start w-full sm:w-auto sm:min-w-[460px] max-w-full" style={{ "--bc": "#2DD4BF" }} data-testid="builder-block-action">
      <div className="flex flex-col gap-3">
        <span className="text-[15px] text-snow/90">do</span>
        <div className="blk blk-tab inline-flex flex-wrap items-center gap-2.5 px-4 py-3" style={{ "--bc": "#E7C85F" }}>
          <Tag k="FN" />
          <span className="text-[15px] text-snow/90">airdrop a</span>
          <SelectPill>fixed amount</SelectPill>
          <NumPill v={amt} onCycle={onCycleAmt} />
          <span className="text-[15px] text-snow/90">% of</span>
          <SelectPill accent>event amount</SelectPill>
          <span className="text-[15px] text-snow/90">of</span>
          <TokenPill t="SOL" />
          <span className="text-[15px] text-snow/90">to</span>
          <SelectPill>all</SelectPill>
          <AmtPill v={chance} />
          <span className="text-[15px] text-snow/90">holders</span>
          {onDelete && <button onClick={onDelete} data-testid="block-delete" className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-fog"><X size={14} /></button>}
        </div>
      </div>
      <div className="text-[15px] text-snow/90 mt-1">otherwise</div>
    </motion.div>
  );
}

export default function Builder() {
  const [blocks, setBlocks] = useState([
    { id: 1, kind: "event" },
    { id: 2, kind: "logic" },
    { id: 3, kind: "action" },
  ]);
  const [chance, setChance] = useState(50);
  const [amt, setAmt] = useState(10);
  const [sentence, setSentence] = useState("");
  const { data: explore } = useExplore();

  const count = useMemo(
    () => blocks.reduce((n, b) => n + (b.kind === "action" ? 3 : 1), 0),
    [blocks]
  );

  const cycle = (setter, val) => () => {
    const i = CYCLES.indexOf(val);
    setter(CYCLES[(i + 1) % CYCLES.length]);
  };

  const add = (kind) => setBlocks((b) => [...b, { id: nextId++, kind }]);
  const remove = (id) => setBlocks((b) => b.filter((x) => x.id !== id));

  const proof = useMemo(() => {
    const cards = explore?.cards || [];
    return [
      { label: "coins using AI", value: cards.filter((c) => c.usesAi).length },
      { label: "holding tokenized stocks", value: cards.filter((c) => c.usesStocks).length },
      { label: "that buy back", value: cards.filter((c) => (c.does || []).includes("buysback")).length },
      { label: "that burn", value: cards.filter((c) => (c.does || []).includes("burns")).length },
    ];
  }, [explore]);

  const build = () => window.open(MAIN_BUILDER, "_blank", "noopener");

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the builder</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.02]">
          Say it. <span className="text-mint">Or snap it.</span>
        </h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12, ease: EASE }} className="mt-8 max-w-2xl">
        <div className="flex items-center gap-2 border border-line rounded-2xl bg-panel/80 p-2 focus-within:border-mint/50 transition-colors">
          <input
            data-testid="builder-sentence-input"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && build()}
            placeholder="What should your coin do?"
            className="flex-1 bg-transparent outline-none px-4 py-2.5 text-[15px] placeholder:text-fog/60 min-w-0"
          />
          <button data-testid="builder-build-button" onClick={build}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-5 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)] active:scale-[0.97]">
            Build it <ArrowRight size={17} />
          </button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-fog">
          the real build & deploy runs on <a className="text-mint hover:underline" href={MAIN_BUILDER} target="_blank" rel="noopener noreferrer">circuitdev.fun ↗</a> — this canvas is a live preview of how your sentence becomes blocks
        </p>
      </motion.div>

      <div className="mt-10 grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        {/* canvas */}
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
          className="relative dotgrid border border-line rounded-3xl bg-[#0C1219]/80 p-6 sm:p-8 min-h-[480px] overflow-hidden" data-testid="builder-canvas">
          <div className="absolute top-5 right-5 font-mono text-lg px-5 py-2.5 rounded-xl border border-line bg-panel/90" data-testid="builder-block-count">
            {count} blocks
          </div>

          <div className="mt-10 flex flex-col gap-4">
            {blocks.map((b) => {
              if (b.kind === "event") return <EventRow key={b.id} onDelete={() => remove(b.id)} />;
              if (b.kind === "logic") return <LogicRow key={b.id} chance={chance} onCycle={cycle(setChance, chance)} onDelete={() => remove(b.id)} />;
              return <ActionGroup key={b.id} chance={chance} amt={amt} onCycleChance={cycle(setChance, chance)} onCycleAmt={cycle(setAmt, amt)} onDelete={() => remove(b.id)} />;
            })}
            {blocks.length === 0 && (
              <p className="text-fog font-mono text-sm py-16 text-center">empty canvas — snap a block from the palette</p>
            )}
          </div>
        </motion.div>

        {/* side column */}
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-4">block palette</p>
            <div className="flex flex-col gap-2.5">
              <button data-testid="palette-add-event" onClick={() => add("event")}
                className="flex items-center justify-between border border-line rounded-xl px-4 py-3 hover:border-amberx/60 transition-colors text-left">
                <span className="text-sm"><Tag k="EV" /> <span className="ml-2">when … (event)</span></span>
                <Plus size={15} className="text-fog" />
              </button>
              <button data-testid="palette-add-logic" onClick={() => add("logic")}
                className="flex items-center justify-between border border-line rounded-xl px-4 py-3 hover:border-tealx/60 transition-colors text-left">
                <span className="text-sm"><Tag k="LG" /> <span className="ml-2">with % chance (logic)</span></span>
                <Plus size={15} className="text-fog" />
              </button>
              <button data-testid="palette-add-action" onClick={() => add("action")}
                className="flex items-center justify-between border border-line rounded-xl px-4 py-3 hover:border-yel/60 transition-colors text-left">
                <span className="text-sm"><Tag k="FN" /> <span className="ml-2">do / otherwise (action)</span></span>
                <Plus size={15} className="text-fog" />
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.38, ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6" data-testid="live-proof">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-4">on circuit right now · relayed</p>
            <div className="grid grid-cols-2 gap-4">
              {proof.map((p, i) => (
                <div key={p.label}>
                  <div className="font-mono text-3xl tabular text-mint" data-testid={`proof-stat-${i}`}>{p.value}</div>
                  <div className="font-mono text-[10px] text-fog mt-1">{p.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.46, ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-4">recipes</p>
            <div className="space-y-2">
              {RECIPES.map((r, i) => (
                <a key={i} data-testid={`recipe-${i}`} href={MAIN_START} target="_blank" rel="noopener noreferrer"
                  className="block text-sm text-fog hover:text-snow border border-line rounded-xl px-4 py-3 hover:border-mint/40 transition-colors leading-relaxed">
                  {r}
                </a>
              ))}
            </div>
            <a data-testid="builder-open-main" href={MAIN_BUILDER} target="_blank" rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 w-full rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
              Deploy a coin <ArrowUpRight size={17} />
            </a>
            <a data-testid="builder-all-recipes" href="/recipes"
              className="mt-2 flex items-center justify-center gap-2 w-full rounded-xl border border-line hover:border-mint/40 hover:text-mint text-fog font-semibold py-3 transition-colors text-sm">
              All 22 recipes
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
