import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, X, Sparkles, Rocket, KeyRound, Play, Code2, StickyNote, Pencil, ChevronDown, Layers, Bot } from "lucide-react";
import { cPost, aiPassword, useExplore, useLibrary } from "@/lib/relay";
import { useWallet, signInWithWallet } from "@/lib/walletStore";
import { renderProgram, BlockPreview, newNode, isHat, isBranch, branchesOf, slotKeyFor, codeForDef, pushInto, insertAfter, strip, containsNode, findNode, countNodes, toPlainEnglish, toBlocks, CompiledBlock, colorOf, programToTree } from "@/components/blockyKit";
import CATALOG from "@/data/blockCatalog.json";

const EASE = [0.16, 1, 0.3, 1];
let nextId = 1000;

const SUGGESTIONS = [
  "tip the day's biggest buyer 10% of the pot",
  "burn a little supply on every buy over 0.1 SOL",
  "make a mascot for every 100 holders",
];

export default function Builder() {
  const [params] = useSearchParams();
  const [projectName, setProjectName] = useState("my first pad");
  const [editingName, setEditingName] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showLog, setShowLog] = useState(true);
  const [runOpen, setRunOpen] = useState(false);
  const [tree, setTree] = useState([]);
  const [sel, setSel] = useState(null);
  const [over, setOver] = useState(null);
  const [selFamily, setSelFamily] = useState("EV");

  const [sentence, setSentence] = useState(params.get("q") || "");
  const [compiling, setCompiling] = useState(false);
  const [compiled, setCompiled] = useState(null);
  const [rawProgram, setRawProgram] = useState(null);
  const [compileError, setCompileError] = useState(null);
  const [log, setLog] = useState(["CodePad relay ready — ask bolt or snap blocks."]);

  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);

  const { data: explore } = useExplore();
  const { wallet, session } = useWallet();
  const { data: lib } = useLibrary();

  useEffect(() => {
    const q = params.get("q");
    if (q) setSentence(q);
  }, [params]);

  // live catalog through the relay, saved copy as fallback; family = the block's category code
  const families = lib?.categories?.length ? lib.categories : CATALOG.categories;
  const blocks = lib?.blocks?.length ? lib.blocks : CATALOG.blocks;
  const palette = useMemo(() => blocks.filter((b) => codeForDef(b) === selFamily), [blocks, selFamily]);

  const say = (line) => setLog((l) => [...l.slice(-5), line]);

  const makeNode = (def) => newNode(def, nextId++);

  /** where palette clicks go: the selected slot, else under the last hat on the canvas, else the root */
  const defaultTarget = (t) => {
    const last = t[t.length - 1];
    return last && isHat(last.def) ? { parentId: last.id, branch: "in" } : { parentId: null, branch: null };
  };

  const placeNew = (def, target) => {
    const node = makeNode(def);
    setTree((t) => {
      if (isHat(def)) return [...t, node];
      if (target.mode === "after") return insertAfter(t, target.node.id, node);
      if (target.mode === "root") return [...t, node];
      if (target.mode === "into") return pushInto(t, target.node.id, target.branch || slotKeyFor(target.node.def), node, isHat(target.node.def) || target.atStart);
      const tg = target.parentId !== undefined ? target : defaultTarget(t);
      return pushInto(t, tg.parentId, tg.branch, node);
    });
    if (isBranch(def)) setSel({ parentId: node.id, branch: branchesOf(def)[0].key });
    else if (isHat(def)) setSel(null);
    return node;
  };

  const addFromPalette = (def) => {
    placeNew(def, sel ? { parentId: sel.parentId, branch: sel.branch } : {});
    say(`snapped: ${def.label}`);
  };

  /** drop from the palette ("new:<type>") or a moved block ("move:<id>") onto a target */
  const handleDrop = (target, text) => {
    if (!text) return;
    const kind = text.split(":")[0];
    const val = text.split(":").slice(1).join(":");
    if (kind === "new") {
      const def = blocks.find((b) => b.type === val);
      if (!def) return;
      placeNew(def, target);
      say(target.node ? `snapped ${def.label} ${target.mode === "after" ? "under" : "into"}: ${target.node.def?.label || ""}` : `placed: ${def.label}`);
    } else if (kind === "move") {
      const moving = findNode(tree, val) || findNode(tree, Number(val));
      if (!moving) return;
      const mid = moving.id;
      if (target.node && (mid === target.node.id || containsNode(tree, mid, target.node.id))) return;
      setTree((t) => {
        const rest = strip(t, mid);
        if (!target.node || isHat(moving.def)) return [...rest, moving];
        if (target.mode === "after") return insertAfter(rest, target.node.id, moving);
        return pushInto(rest, target.node.id, target.branch || slotKeyFor(target.node.def), moving, isHat(target.node.def));
      });
      say(target.node ? `moved into: ${target.node.def?.label || ""}` : "moved to the top level");
    }
  };

  const handleRootDrop = (e) => {
    e.preventDefault();
    setOver(null);
    handleDrop({ mode: "root" }, e.dataTransfer.getData("text/plain"));
  };

  const ctx = { tree, setTree, sel, setSel, over, setOver, onDrop: handleDrop };

  const blockCount = compiled ? toBlocks(compiled).length : countNodes(tree);

  function runSimulate() {
    const lines = tree.length ? toPlainEnglish(tree).split("; ") : ["(empty program)"];
    lines.forEach((l, i) => say(`run step ${i + 1}: ${l} → ok`));
    say("simulation finished — nothing moved, no fees touched.");
    setRunOpen(false);
  }

  async function runCheck() {
    setCompiling(true);
    say("checking program with bolt…");
    try {
      const data = await cPost("/compile", { prompt: toPlainEnglish(tree) || sentence || "do nothing", coinTicker: ticker || undefined });
      say(`bolt checked it — ${toBlocks(data).length} blocks recognized`);
      setCompiled(data);
    } catch (e) {
      say(`bolt could not check: ${e.message}`);
    } finally {
      setCompiling(false);
      setRunOpen(false);
    }
  }

  async function askBolt() {
    if (!sentence.trim()) return;
    setCompiling(true);
    setCompileError(null);
    say(`bolt, compile: ${sentence.trim()}`);
    try {
      const data = await cPost("/compile", { prompt: sentence.trim(), coinTicker: ticker || undefined });
      if (data.program) {
        setTree(programToTree(data.program));
        setRawProgram(data.program);
        setCompiled(null);
        say(`bolt built ${data.program.scripts?.length || 0} script(s) — no password, no signup`);
        if (data.explanation) say(`bolt explains: ${String(data.explanation).slice(0, 120)}`);
      } else {
        setCompiled(data);
        say(`bolt answered — ${toBlocks(data).length} blocks`);
      }
    } catch (e) {
      setCompileError(e.message);
      say(`bolt could not: ${e.message}`);
    } finally {
      setCompiling(false);
    }
  }

  async function launch() {
    setLaunching(true);
    setLaunchResult(null);
    try {
      const payload = { name: name || undefined, ticker: ticker || undefined, prompt: sentence || toPlainEnglish(tree) || undefined, ...(compiled && typeof compiled === "object" ? compiled : {}) };
      const data = await cPost("/coins", payload);
      setLaunchResult({ ok: true, data });
      say("launched — recorded by the portal");
    } catch (e) {
      setLaunchResult({ ok: false, message: e.message, data: e.data });
      say(`launch refused: ${e.message}`);
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
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-24 lg:pt-8 pb-24">
      {/* project bar */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-wrap items-center gap-3" data-testid="blocky-project-bar">
        <div className="w-11 h-11 rounded-xl border border-line bg-panel flex items-center justify-center text-lg" data-testid="blocky-project-icon">☻</div>
        {editingName ? (
          <input autoFocus value={projectName} onChange={(e) => setProjectName(e.target.value)} onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)} data-testid="blocky-project-name-input"
            className="bg-transparent border border-mint/50 rounded-xl px-4 py-2.5 font-bold text-lg outline-none w-56" />
        ) : (
          <button onClick={() => setEditingName(true)} data-testid="blocky-project-name"
            className="inline-flex items-center gap-2 bg-transparent border border-line rounded-xl px-4 py-2.5 font-bold text-lg hover:border-mint/40 transition-colors">
            {projectName} <Pencil size={13} className="text-fog" /> <ChevronDown size={13} className="text-fog" />
          </button>
        )}
      </motion.div>

      {/* mode chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="blocky-mode-chips">
        <button onClick={() => setSelFamily("SK")} data-testid="chip-stocks"
          className="inline-flex items-center gap-2 rounded-xl bg-lime-300 text-[#1a2405] font-bold px-4 py-2.5 hover:brightness-110 transition-all">
          <span className="w-6 h-6 rounded-lg bg-white/60 flex items-center justify-center font-mono text-[10px]">SK</span>
          Stocks <span className="rounded-md bg-pink-300 text-pink-950 font-mono text-[9px] px-1.5 py-0.5">NEW</span>
        </button>
        <button onClick={() => setShowLog(!showLog)} data-testid="chip-log"
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold text-sm transition-colors ${showLog ? "border-mint/50 text-mint bg-mint-deep/40" : "border-line text-fog hover:text-snow"}`}>
          <StickyNote size={14} /> Bolt & log
        </button>
        <button onClick={() => setShowCode(!showCode)} data-testid="chip-code"
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-sm transition-colors ${showCode ? "border-mint/50 text-mint bg-mint-deep/40" : "border-line text-fog hover:text-snow"}`}>
          {"</>"}
        </button>
      </div>

      {/* launch + run */}
      <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="blocky-actions">
        <button onClick={launch} disabled={launching || !signedIn} data-testid="blocky-launch-button"
          className="inline-flex items-center gap-2 rounded-xl bg-amberx hover:brightness-110 text-[#241703] font-bold px-6 py-3 transition-all disabled:opacity-40">
          <Rocket size={16} /> Launch
        </button>
        <div className="relative">
          <button onClick={runSimulate} disabled={compiling} data-testid="blocky-run-button"
            className="inline-flex items-center gap-2 rounded-l-xl bg-mint-dim hover:bg-mint text-[#04170c] font-bold px-6 py-3 transition-all disabled:opacity-40">
            <Play size={15} /> Run
          </button>
          <button onClick={() => setRunOpen(!runOpen)} data-testid="blocky-run-dropdown"
            className="inline-flex items-center rounded-r-xl bg-mint-dim hover:bg-mint text-[#04170c] px-3 py-3 border-l border-black/20 transition-all">
            <ChevronDown size={14} />
          </button>
          {runOpen && (
            <div className="absolute z-20 mt-1 w-60 border border-line rounded-xl bg-panel overflow-hidden" data-testid="blocky-run-menu">
              <button onClick={runSimulate} data-testid="run-simulate" className="w-full text-left px-4 py-2.5 font-mono text-[12px] text-fog hover:text-mint hover:bg-white/5 transition-colors">
                run a simulation (nothing moves)
              </button>
              <button onClick={runCheck} data-testid="run-check" className="w-full text-left px-4 py-2.5 font-mono text-[12px] text-fog hover:text-mint hover:bg-white/5 transition-colors border-t border-line">
                check with bolt (relay)
              </button>
            </div>
          )}
        </div>
        <span className="ml-auto font-mono text-[11px] text-fog" data-testid="blocky-count">{blockCount} blocks</span>
      </div>

      {/* ask bolt */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease: EASE }} className="mt-3">
        <div className="flex items-center gap-2 border border-line rounded-2xl bg-panel/80 p-2 focus-within:border-mint/50 transition-colors">
          <input
            data-testid="builder-sentence-input"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askBolt()}
            placeholder="Describe it, Bolt builds it…"
            className="flex-1 bg-transparent outline-none px-4 py-2.5 text-[15px] placeholder:text-fog/60 min-w-0"
          />
          <button data-testid="builder-ask-bolt-button" onClick={askBolt} disabled={compiling || !sentence.trim()}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-5 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)] active:scale-[0.97] disabled:opacity-40">
            <Sparkles size={16} /> {compiling ? "Bolt is thinking…" : "Ask Bolt"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="blocky-suggestions">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} data-testid={`suggestion-${i}`} onClick={() => setSentence(s)}
              className="font-mono text-[11px] text-fog border border-line rounded-full px-3.5 py-1.5 hover:text-mint hover:border-mint/40 transition-colors">
              {s}
            </button>
          ))}
        </div>
      </motion.div>

      {compileError && (
        <div className="mt-4 border border-red-400/30 bg-red-400/5 rounded-2xl p-4 font-mono text-[12px] text-red-300" data-testid="compile-error">
          {compileError}
        </div>
      )}

      {/* workspace */}
      <div className="mt-4 border border-line rounded-3xl bg-[#0C1219] overflow-hidden dotgrid" data-testid="blocky-workspace">
        <div className="flex flex-col md:flex-row md:h-[70vh] md:min-h-[560px]">
          <div className="flex flex-1 min-w-0 h-[62vh] min-h-[420px] md:h-auto">
          <div className="w-14 shrink-0 border-r border-line bg-panel/70 flex flex-col items-center gap-1.5 py-3 overflow-y-auto" data-testid="blocky-rail">
            {(families.length ? families : [{ code: "EV" }, { code: "LG" }, { code: "FN" }]).map((f) => (
              <button key={f.code} onClick={() => setSelFamily(f.code)} data-testid={`rail-${f.code}`} title={f.name}
                className={`w-10 h-10 rounded-xl border font-mono text-[10px] font-bold transition-all shrink-0 ${selFamily === f.code ? "text-ink scale-105" : "text-snow/80 hover:scale-105"}`}
                style={{ background: selFamily === f.code ? colorOf(f.code) : "transparent", borderColor: colorOf(f.code) }}>
                {f.code}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 sm:p-7 min-w-0 overflow-auto" data-testid="blocky-canvas-scroll">
            {showCode ? (
              <pre className="font-mono text-[11px] text-mint/90 whitespace-pre-wrap break-all" data-testid="blocky-json">
                {rawProgram ? JSON.stringify(rawProgram, null, 2) : JSON.stringify(tree.map(({ def, vals }) => ({ type: def?.type, vals })), null, 2)}
              </pre>
            ) : compiled ? (
              <div className="flex flex-col gap-3">
                {toBlocks(compiled).map((b, i) => <CompiledBlock key={`${b.label}-${i}`} label={b.label} value={b.value} i={i} />)}
                <button onClick={() => setCompiled(null)} data-testid="clear-compiled" className="self-start font-mono text-[11px] text-fog hover:text-mint transition-colors mt-2">
                  ← back to the workspace
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-7 min-h-[420px] pb-10" data-testid="blocky-canvas"
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setOver(null); }}
                onClick={() => setSel(null)}
                onDrop={handleRootDrop}>
                {renderProgram(tree, ctx)}
                {!tree.length && (
                  <p className="text-fog font-mono text-sm py-20 text-center">pick a family on the rail and snap your first block — or ask bolt above</p>
                )}
              </div>
            )}
          </div>
          </div>

          <div className="flex w-full md:w-72 shrink-0 border-t md:border-t-0 md:border-l border-line bg-panel flex-col p-4 max-h-[320px] md:max-h-none overflow-y-auto" data-testid="blocky-palette">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-1 flex items-center gap-2">
              <Layers size={12} className="text-mint" /> {selFamily} blocks · relayed
            </p>
            <p className="font-mono text-[9.5px] text-fog/60 mb-4">
              {sel ? "tap a block — it snaps into the glowing slot" : "tap to snap under your event · or drag onto a block"}
            </p>
            <div className="flex flex-col gap-4">
              {palette.map((b) => (
                <button key={b.type} type="button" onClick={() => addFromPalette(b)} draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", "new:" + b.type); e.dataTransfer.effectAllowed = "copy"; }}
                  onDragEnd={() => setOver(null)}
                  data-testid={`palette-${b.type}`} title={b.tooltip}
                  className="group w-full text-left cursor-grab active:cursor-grabbing hover:brightness-110 transition-[filter]">
                  <BlockPreview def={b} code={codeForDef(b)} />
                  <div className="font-mono text-[9px] text-fog/70 mt-2 line-clamp-1 group-hover:text-fog">{b.tooltip}</div>
                </button>
              ))}
              {!palette.length && <p className="font-mono text-[11px] text-fog/60">loading the catalog…</p>}
            </div>
          </div>
        </div>
      </div>

      {/* lower deck */}
      <div className="mt-5 grid lg:grid-cols-3 gap-5 items-start">
        {showLog && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-5" data-testid="bolt-log">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-3 flex items-center gap-2"><StickyNote size={12} className="text-mint" /> bolt & log</p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {log.map((l, i) => <p key={i} className="font-mono text-[11px] text-fog">› {l}</p>)}
            </div>
            {tree.length > 0 && (
              <p className="mt-3 pt-3 border-t border-line font-mono text-[10px] text-fog leading-relaxed" data-testid="plain-english">
                plain english: {toPlainEnglish(tree).slice(0, 220)}
              </p>
            )}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          className="border border-line rounded-2xl bg-panel p-5" data-testid="launch-panel">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-3 flex items-center gap-2"><Bot size={12} className="text-mint" /> ship your coin</p>
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} data-testid="launch-name-input" placeholder="Coin name"
              className="w-full bg-transparent border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint/50" />
            <input value={ticker} onChange={(e) => setTicker(e.target.value)} data-testid="launch-ticker-input" placeholder="Ticker (e.g. PAD)"
              className="w-full bg-transparent border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint/50 font-mono" />
          </div>
          {!signedIn && (
            <div className="mt-3 border border-yel/30 bg-yel/5 rounded-xl p-3" data-testid="launch-wallet-gate">
              <p className="font-mono text-[11px] text-yel leading-relaxed">
                {wallet ? "one last step — sign the note in your wallet" : "connecting your wallet signs you in — nothing moves without your signature"}
              </p>
              <button onClick={() => signInWithWallet()} data-testid="launch-signin-button"
                className="mt-2 w-full rounded-lg border border-yel/50 text-yel hover:bg-yel/10 font-semibold py-2 text-[12px] transition-colors">
                {wallet ? "Sign message" : "Connect wallet"}
              </button>
            </div>
          )}
          <button onClick={launch} disabled={launching || !signedIn} data-testid="launch-button"
            className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)] disabled:opacity-40">
            <Rocket size={15} /> {launching ? "Launching…" : "Launch it"}
          </button>
          {launchResult && (
            <div className={`mt-3 rounded-xl p-3 font-mono text-[11px] leading-relaxed ${launchResult.ok ? "border border-mint/40 bg-mint/5 text-mint" : "border border-red-400/30 bg-red-400/5 text-red-300"}`} data-testid="launch-result">
              {launchResult.ok
                ? `launched ✓ ${launchResult.data?.mint || launchResult.data?.url || JSON.stringify(launchResult.data).slice(0, 200)}`
                : `relay said: ${launchResult.message}`}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
          className="border border-line rounded-2xl bg-panel p-5" data-testid="live-proof">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-3">on the pad right now · relayed</p>
          <div className="grid grid-cols-2 gap-3">
            {proof.map((p, i) => (
              <div key={p.label}>
                <div className="font-mono text-2xl tabular text-mint" data-testid={`proof-stat-${i}`}>{p.value}</div>
                <div className="font-mono text-[9px] text-fog mt-1">{p.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-line space-y-2">
            {[
              { label: "the rulebook gallery", to: "/rules", tid: "side-rules" },
              { label: "live trades", to: "/live", tid: "side-live" },
              { label: "every payout", to: "/paid", tid: "side-paid" },
            ].map((l) => (
              <Link key={l.to} to={l.to} data-testid={l.tid} className="flex items-center justify-between font-mono text-[11px] text-fog hover:text-mint transition-colors">
                {l.label} <ArrowUpRight size={11} />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
