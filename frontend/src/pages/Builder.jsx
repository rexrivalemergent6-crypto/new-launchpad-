import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Plus, X, Sparkles, Rocket, KeyRound } from "lucide-react";
import { Tag, SelectPill, NumPill, AmtPill, TokenPill } from "@/components/blocks";
import { cPost, aiPassword, useExplore } from "@/lib/relay";
import { useWallet, signInWithWallet } from "@/lib/walletStore";

const EASE = [0.16, 1, 0.3, 1];
const CYCLES = [10, 25, 50, 75, 100];
let nextId = 100;

const STARTERS = [
  "When the pot crosses 2 SOL, stack tokenized TSLA with half and gift the rest.",
  "If the chart doubles in a day, buy back 5% of everything.",
  "Once an hour, one random holder scoops 15% of the pot.",
];

function EventRow({ onDelete }) {
  return (
    <motion.div layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: EASE }}
      className="blk blk-tab group inline-flex items-center gap-3 px-4 py-3 self-start" style={{ "--bc": "#D9A33C" }} data-testid="builder-block-event">
      <Tag k="EV" />
      <span className="text-[15px] text-snow/90">when the fee pot gets paid</span>
      {onDelete && <button onClick={onDelete} data-testid="block-delete" className="ml-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-fog"><X size={14} /></button>}
    </motion.div>
  );
}

function LogicRow({ chance, onCycle, onDelete }) {
  return (
    <motion.div layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: EASE }}
      className="blk group inline-flex items-center gap-3 px-4 py-3 self-start" style={{ "--bc": "#2DD4BF" }} data-testid="builder-block-logic">
      <Tag k="LG" />
      <span className="text-[15px] text-snow/90">on</span>
      <NumPill v={chance} onCycle={onCycle} />
      <span className="text-[15px] text-snow/90">% of runs</span>
      {onDelete && <button onClick={onDelete} data-testid="block-delete" className="ml-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-fog"><X size={14} /></button>}
    </motion.div>
  );
}

function ActionGroup({ onDelete, chance, amt, onCycleChance, onCycleAmt }) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
      className="blk blk-slot group flex flex-col gap-3 p-4 self-start w-full sm:w-auto sm:min-w-[460px] max-w-full" style={{ "--bc": "#2DD4BF" }} data-testid="builder-block-action">
      <div className="flex flex-col gap-3">
        <span className="text-[15px] text-snow/90">then</span>
        <div className="blk blk-tab inline-flex flex-wrap items-center gap-2.5 px-4 py-3" style={{ "--bc": "#E7C85F" }}>
          <Tag k="FN" />
          <span className="text-[15px] text-snow/90">send a</span>
          <SelectPill>fixed slice</SelectPill>
          <NumPill v={amt} onCycle={onCycleAmt} />
          <span className="text-[15px] text-snow/90">% of</span>
          <SelectPill accent>the pot</SelectPill>
          <span className="text-[15px] text-snow/90">in</span>
          <TokenPill t="SOL" />
          <span className="text-[15px] text-snow/90">to the</span>
          <SelectPill>top</SelectPill>
          <AmtPill v={chance} />
          <span className="text-[15px] text-snow/90">holders</span>
          {onDelete && <button onClick={onDelete} data-testid="block-delete" className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-fog"><X size={14} /></button>}
        </div>
      </div>
      <div className="text-[15px] text-snow/90 mt-1">failing that</div>
    </motion.div>
  );
}

function CompiledBlock({ label, value, i }) {
  return (
    <motion.div layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }}
      className="blk blk-tab inline-flex items-center gap-3 px-4 py-3 self-start max-w-full" style={{ "--bc": "#E7C85F" }} data-testid={`compiled-block-${i}`}>
      <Tag k="FN" />
      <span className="font-mono text-[13px] text-yel shrink-0">{label}</span>
      <span className="font-mono text-[12px] text-snow/80 break-all line-clamp-2">{value}</span>
    </motion.div>
  );
}

function toBlocks(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.rules)) {
    return data.rules.map((r, i) => ({ label: r?.op || r?.type || `rule ${i + 1}`, value: JSON.stringify(r) }));
  }
  return Object.entries(data)
    .filter(([, v]) => v != null)
    .slice(0, 8)
    .map(([k, v]) => ({ label: k, value: typeof v === "string" ? v : JSON.stringify(v).slice(0, 160) }));
}

export default function Builder() {
  const [params] = useSearchParams();
  const [blocks, setBlocks] = useState([
    { id: 1, kind: "event" },
    { id: 2, kind: "logic" },
    { id: 3, kind: "action" },
  ]);
  const [chance, setChance] = useState(50);
  const [amt, setAmt] = useState(10);
  const [sentence, setSentence] = useState(params.get("q") || "");

  const [compiling, setCompiling] = useState(false);
  const [compiled, setCompiled] = useState(null);
  const [compileError, setCompileError] = useState(null);
  const [needPassword, setNeedPassword] = useState(false);
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);

  const { data: explore } = useExplore();
  const { wallet, session } = useWallet();

  useEffect(() => {
    const q = params.get("q");
    if (q) setSentence(q);
  }, [params]);

  const paletteCount = useMemo(
    () => blocks.reduce((n, b) => n + (b.kind === "action" ? 3 : 1), 0),
    [blocks]
  );
  const compiledBlocks = useMemo(() => toBlocks(compiled), [compiled]);
  const blockCount = compiled ? Math.max(compiledBlocks.length, 1) : paletteCount;

  const cycle = (setter, val) => () => {
    const i = CYCLES.indexOf(val);
    setter(CYCLES[(i + 1) % CYCLES.length]);
  };

  const add = (kind) => setBlocks((b) => [...b, { id: nextId++, kind }]);
  const remove = (id) => setBlocks((b) => b.filter((x) => x.id !== id));

  async function askBolt() {
    if (!sentence.trim()) return;
    setCompiling(true);
    setCompileError(null);
    setNeedPassword(false);
    try {
      const data = await cPost("/compile", { prompt: sentence.trim(), coinTicker: ticker || undefined });
      setCompiled(data);
    } catch (e) {
      if (e.status === 401) setNeedPassword(true);
      setCompileError(e.message);
    } finally {
      setCompiling(false);
    }
  }

  function savePassword() {
    aiPassword.set(password.trim());
    setNeedPassword(false);
    askBolt();
  }

  async function launch() {
    setLaunching(true);
    setLaunchResult(null);
    try {
      const payload = { name: name || undefined, ticker: ticker || undefined, prompt: sentence || undefined, ...(compiled && typeof compiled === "object" ? compiled : {}) };
      const data = await cPost("/coins", payload);
      setLaunchResult({ ok: true, data });
    } catch (e) {
      setLaunchResult({ ok: false, message: e.message, data: e.data });
    } finally {
      setLaunching(false);
    }
  }

  const signedIn = wallet && session;

  const proof = useMemo(() => {
    const cards = explore?.cards || [];
    return [
      { label: "coins running AI", value: cards.filter((c) => c.usesAi).length },
      { label: "holding stocks", value: cards.filter((c) => c.usesStocks).length },
      { label: "buying themselves back", value: cards.filter((c) => (c.does || []).includes("buysback")).length },
      { label: "burning supply", value: cards.filter((c) => (c.does || []).includes("burns")).length },
    ];
  }, [explore]);

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the workshop</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.02]">
          Type it. <span className="text-mint">Or stack it.</span>
        </h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12, ease: EASE }} className="mt-8 max-w-2xl">
        <div className="flex items-center gap-2 border border-line rounded-2xl bg-panel/80 p-2 focus-within:border-mint/50 transition-colors">
          <input
            data-testid="builder-sentence-input"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askBolt()}
            placeholder="Describe your coin in one line…"
            className="flex-1 bg-transparent outline-none px-4 py-2.5 text-[15px] placeholder:text-fog/60 min-w-0"
          />
          <button data-testid="builder-ask-bolt-button" onClick={askBolt} disabled={compiling || !sentence.trim()}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-5 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)] active:scale-[0.97] disabled:opacity-40">
            <Sparkles size={16} /> {compiling ? "Bolt is thinking…" : "Ask Bolt"}
          </button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-fog">
          bolt reads your line and snaps it into blocks — the whole thing runs through coinpad's relay
        </p>
      </motion.div>

      {needPassword && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
          className="mt-5 max-w-2xl border border-yel/40 bg-yel/5 rounded-2xl p-5" data-testid="ai-password-panel">
          <p className="flex items-center gap-2 font-mono text-[12px] text-yel"><KeyRound size={14} /> the AI wants its password</p>
          <div className="mt-3 flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} data-testid="ai-password-input" type="password" placeholder="AI password"
              className="flex-1 bg-transparent border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yel/60" />
            <button onClick={savePassword} data-testid="ai-password-save" className="rounded-xl bg-yel/90 hover:bg-yel text-[#221a04] font-bold px-5 text-sm transition-colors">Save & retry</button>
          </div>
        </motion.div>
      )}

      {compileError && !needPassword && (
        <div className="mt-5 max-w-2xl border border-red-400/30 bg-red-400/5 rounded-2xl p-4 font-mono text-[12px] text-red-300" data-testid="compile-error">
          {compileError}
        </div>
      )}

      <div className="mt-10 grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        {/* canvas */}
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
          className="relative dotgrid border border-line rounded-3xl bg-[#0C1219]/80 p-6 sm:p-8 min-h-[480px] overflow-hidden" data-testid="builder-canvas">
          <div className="absolute top-5 right-5 font-mono text-lg px-5 py-2.5 rounded-xl border border-line bg-panel/90" data-testid="builder-block-count">
            {blockCount} blocks
          </div>

          <div className="mt-10 flex flex-col gap-4">
            {compiled ? (
              <>
                <EventRow />
                {compiledBlocks.map((b, i) => (
                  <CompiledBlock key={`${b.label}-${i}`} label={b.label} value={b.value} i={i} />
                ))}
                <button onClick={() => setCompiled(null)} data-testid="clear-compiled" className="self-start font-mono text-[11px] text-fog hover:text-mint transition-colors mt-2">
                  ← back to a blank canvas
                </button>
              </>
            ) : (
              <>
                {blocks.map((b) => {
                  if (b.kind === "event") return <EventRow key={b.id} onDelete={() => remove(b.id)} />;
                  if (b.kind === "logic") return <LogicRow key={b.id} chance={chance} onCycle={cycle(setChance, chance)} onDelete={() => remove(b.id)} />;
                  return <ActionGroup key={b.id} chance={chance} amt={amt} onCycleChance={cycle(setChance, chance)} onCycleAmt={cycle(setAmt, amt)} onDelete={() => remove(b.id)} />;
                })}
                {blocks.length === 0 && (
                  <p className="text-fog font-mono text-sm py-16 text-center">empty canvas — ask bolt, or grab a block from the shelf</p>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* side column — starter ideas first, then launch */}
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-4">starter ideas</p>
            <div className="space-y-2">
              {STARTERS.map((r, i) => (
                <Link key={i} data-testid={`recipe-fill-${i}`} to={`/builder?q=${encodeURIComponent(r)}`}
                  className="block text-sm text-fog hover:text-snow border border-line rounded-xl px-4 py-3 hover:border-mint/40 transition-colors leading-relaxed">
                  {r}
                </Link>
              ))}
            </div>
            <Link data-testid="builder-all-recipes" to="/recipes"
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl border border-line hover:border-mint/40 hover:text-mint text-fog font-semibold py-3 transition-colors text-sm">
              All 22 blueprints
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.36, ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6" data-testid="launch-panel">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-4">ship your coin</p>
            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} data-testid="launch-name-input" placeholder="Coin name"
                className="w-full bg-transparent border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint/50" />
              <input value={ticker} onChange={(e) => setTicker(e.target.value)} data-testid="launch-ticker-input" placeholder="Ticker (e.g. PAD)"
                className="w-full bg-transparent border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint/50 font-mono" />
            </div>

            {!signedIn && (
              <div className="mt-4 border border-yel/30 bg-yel/5 rounded-xl p-4" data-testid="launch-wallet-gate">
                <p className="font-mono text-[11px] text-yel leading-relaxed">
                  {wallet ? "one last step — sign the note in your wallet to unlock launching" : "connecting your wallet signs you in — nothing moves without your signature"}
                </p>
                <button onClick={() => signInWithWallet()} data-testid="launch-signin-button"
                  className="mt-3 w-full rounded-xl border border-yel/50 text-yel hover:bg-yel/10 font-semibold py-2.5 text-sm transition-colors">
                  {wallet ? "Sign message" : "Connect wallet"}
                </button>
              </div>
            )}

            <button onClick={launch} disabled={launching || !signedIn} data-testid="launch-button"
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)] disabled:opacity-40">
              <Rocket size={16} /> {launching ? "Launching…" : "Launch it"}
            </button>

            {launchResult && (
              <div className={`mt-4 rounded-xl p-4 font-mono text-[11px] leading-relaxed ${launchResult.ok ? "border border-mint/40 bg-mint/5 text-mint" : "border border-red-400/30 bg-red-400/5 text-red-300"}`}
                data-testid="launch-result">
                {launchResult.ok ? (
                  <>
                    launched ✓ {launchResult.data?.mint || launchResult.data?.url || JSON.stringify(launchResult.data).slice(0, 220)}
                  </>
                ) : (
                  <>relay said: {launchResult.message}{launchResult.data ? ` — ${JSON.stringify(launchResult.data).slice(0, 220)}` : ""}</>
                )}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.42, ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6" data-testid="live-proof">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-4">on the pad right now · relayed</p>
            <div className="grid grid-cols-2 gap-4">
              {proof.map((p, i) => (
                <div key={p.label}>
                  <div className="font-mono text-3xl tabular text-mint" data-testid={`proof-stat-${i}`}>{p.value}</div>
                  <div className="font-mono text-[10px] text-fog mt-1">{p.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.48, ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-4">block shelf</p>
            <div className="flex flex-col gap-2.5">
              <button data-testid="palette-add-event" onClick={() => add("event")}
                className="flex items-center justify-between border border-line rounded-xl px-4 py-3 hover:border-amberx/60 transition-colors text-left">
                <span className="text-sm"><Tag k="EV" /> <span className="ml-2">when … (event)</span></span>
                <Plus size={15} className="text-fog" />
              </button>
              <button data-testid="palette-add-logic" onClick={() => add("logic")}
                className="flex items-center justify-between border border-line rounded-xl px-4 py-3 hover:border-tealx/60 transition-colors text-left">
                <span className="text-sm"><Tag k="LG" /> <span className="ml-2">on % of runs (logic)</span></span>
                <Plus size={15} className="text-fog" />
              </button>
              <button data-testid="palette-add-action" onClick={() => add("action")}
                className="flex items-center justify-between border border-line rounded-xl px-4 py-3 hover:border-yel/60 transition-colors text-left">
                <span className="text-sm"><Tag k="FN" /> <span className="ml-2">then / failing that (action)</span></span>
                <Plus size={15} className="text-fog" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
