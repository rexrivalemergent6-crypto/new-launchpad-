import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Rocket, Play, Pencil, ChevronDown, StickyNote, Wallet, X as Close } from "lucide-react";
import { cPost, useExplore, useLibrary } from "@/lib/relay";
import { useWallet, signInWithWallet } from "@/lib/walletStore";
import { BlockPreview, colorOf, codeForDef, programToTree, countNodes, toPlainEnglish, toBlocks, renderProgram, strip, pushInto, containsNode, findNode, insertAfter } from "@/components/blockyKit";

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
  const [showLog, setShowLog] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [tree, setTree] = useState([]);
  const [sel, setSel] = useState(null);
  const [over, setOver] = useState(null);
  const [selFamily, setSelFamily] = useState("DT");

  const [sentence, setSentence] = useState(params.get("q") || "");
  const [compiling, setCompiling] = useState(false);
  const [rawProgram, setRawProgram] = useState(null);
  const [compileError, setCompileError] = useState(null);
  const [log, setLog] = useState(["relay ready — ask bolt or click to add blocks."]);

  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);
  const [showLaunch, setShowLaunch] = useState(false);

  const { wallet, session } = useWallet();
  const { data: lib } = useLibrary();

  useEffect(() => {
    const q = params.get("q");
    if (q) setSentence(q);
  }, [params]);

  const families = lib?.families || [];
  const blocks = lib?.blocks || [];
  const palette = useMemo(() => blocks.filter((b) => (b.categoryCode || b.code) === selFamily || codeForDef(b) === selFamily), [blocks, selFamily]);
  const fam = families.find((f) => f.code === selFamily) || { code: selFamily, name: selFamily, desc: "" };
  const say = (line) => setLog((l) => [...l.slice(-6), line]);

  const ctx = { tree, setTree, sel, setSel, over, setOver, onDrop: handleDrop };

  function addByType(type, target) {
    const def = blocks.find((b) => b.type === type);
    if (!def) return;
    const node = { id: `n-${nextId++}`, def, kindCode: codeForDef(def), vals: {}, children: nodeChildren(def) };
    if (!target) {
      const hats = tree.filter((n) => n.children?.in !== undefined);
      const lastHat = hats[hats.length - 1];
      if (lastHat && lastHat.id !== node.id) setTree((t) => pushInto(t, lastHat.id, "in", node));
      else setTree((t) => [...t, node]);
    } else if (target.mode === "into") {
      setTree((t) => pushInto(t, target.node.id, target.branch || "in", node));
    } else if (target.mode === "after") {
      setTree((t) => insertAfter(t, target.node.id, node));
    }
    setSel(null);
  }

  function nodeChildren(def) {
    const kids = {};
    if (def.shape === "hat") kids.in = [];
    (def.rows || []).forEach((r) => r.parts.forEach((p) => { if (p.k === "slot") kids[p.n] = []; }));
    if (def.type === "if" && !kids.then) { kids.then = []; kids.else = []; }
    return kids;
  }

  function handleDrop(target, text) {
    if (!text) return;
    const kind = text.split(":")[0];
    const val = text.split(":").slice(1).join(":");
    if (kind === "new") { addByType(val, target); return; }
    if (kind === "move") {
      const moving = findNode(tree, val);
      if (!moving || val === target.node?.id || containsNode([moving], val, target.node?.id)) return;
      if (target.mode === "into") setTree((t) => pushInto(strip(t, val), target.node.id, target.branch || "in", moving));
      else setTree((t) => insertAfter(strip(t, val), target.node.id, moving));
      say(`moved ${moving.def?.label || ""}`);
    }
  }

  function handleRootDrop(e) {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    if (!text) return;
    const kind = text.split(":")[0];
    const val = text.split(":").slice(1).join(":");
    if (kind === "new") addByType(val, null);
    else if (kind === "move") {
      const moving = findNode(tree, val);
      if (!moving) return;
      setTree((t) => [...strip(t, val), moving]);
      say("moved to a fresh stack");
    }
  }

  const blockCount = countNodes(tree);

  function runSimulate() {
    const lines = tree.length ? toPlainEnglish(tree).split("; ") : ["(empty program)"];
    lines.forEach((l, i) => say(`run ${i + 1}: ${l} → ok`));
    say("simulation done — nothing moved, no fees touched.");
    setShowLog(true);
    setRunOpen(false);
  }

  async function runCheck() {
    setCompiling(true);
    say("checking with bolt…");
    try {
      const data = await cPost("/compile", { prompt: toPlainEnglish(tree) || sentence || "do nothing", coinTicker: ticker || undefined });
      if (data.program) { setTree(programToTree(data.program)); setRawProgram(data.program); }
      say(`bolt checked it — ok`);
    } catch (e) {
      say(`bolt could not check: ${e.message}`);
    } finally {
      setCompiling(false);
      setRunOpen(false);
      setShowLog(true);
    }
  }

  async function askBolt() {
    if (!sentence.trim()) return;
    setCompiling(true);
    setCompileError(null);
    say(`bolt, build: ${sentence.trim()}`);
    try {
      const data = await cPost("/compile", { prompt: sentence.trim(), coinTicker: ticker || undefined });
      if (data.program) {
        setTree(programToTree(data.program));
        setRawProgram(data.program);
        say(`bolt built ${data.program.scripts?.length || 0} script(s) — no signup, no password`);
        if (data.explanation) say(`bolt: ${String(data.explanation).slice(0, 130)}`);
      } else {
        setRawProgram(data);
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
      const payload = { name: name || projectName, ticker: ticker || undefined, prompt: sentence || toPlainEnglish(tree) || undefined, ...(rawProgram && typeof rawProgram === "object" ? { program: rawProgram } : {}) };
      const data = await cPost("/coins", payload);
      setLaunchResult({ ok: true, data });
      say("launched — recorded by the portal");
    } catch (e) {
      setLaunchResult({ ok: false, message: e.message });
      say(`launch refused: ${e.message}`);
    } finally {
      setLaunching(false);
    }
  }

  const signedIn = wallet && session;

  return (
    <div className="nbb-page min-h-screen">
      <div className="max-w-[1400px] mx-auto lg:pl-[264px]">
        <div className="px-4 lg:px-8 pt-6 pb-3 flex flex-wrap items-center gap-3" data-testid="blocky-project-bar">
          <div className="w-12 h-12 nbb-pill flex items-center justify-center text-xl" data-testid="blocky-project-icon">☻</div>
          {editingName ? (
            <input autoFocus value={projectName} onChange={(e) => setProjectName(e.target.value)} onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)} data-testid="blocky-project-name-input"
              className="nbb-pill px-6 py-3 font-extrabold text-2xl outline-none w-64" />
          ) : (
            <button onClick={() => setEditingName(true)} data-testid="blocky-project-name"
              className="nbb-pill inline-flex items-center gap-3 px-6 py-3 font-extrabold text-2xl">
              {projectName} <Pencil size={15} className="opacity-60" /> <ChevronDown size={15} className="opacity-60" />
            </button>
          )}
        </div>

        <div className="px-4 lg:px-8 pb-3 flex flex-wrap items-center gap-3" data-testid="blocky-mode-chips">
          <button onClick={() => setSelFamily("SK")} data-testid="chip-stocks"
            className="nbb-pill inline-flex items-center gap-2.5 px-5 py-3 font-extrabold text-lg" style={{ background: "#D6F26E" }}>
            <span className="w-8 h-8 rounded-lg bg-white border-[2.5px] border-[#131311] flex items-center justify-center font-mono text-[11px] font-bold">SK</span>
            Stocks <span className="rounded-full bg-[#F2A9CB] border-[2.5px] border-[#131311] font-mono text-[10px] font-bold px-2.5 py-0.5">NEW</span>
          </button>
          <button onClick={() => setShowLog(!showLog)} data-testid="chip-log"
            className={`nbb-pill px-5 py-3 font-extrabold text-lg ${showLog ? "!bg-[#F2D06B]" : "!bg-white"}`}>
            Bolt & log
          </button>
          <button onClick={() => setShowCode(!showCode)} data-testid="chip-code"
            className={`nbb-pill px-5 py-3 font-mono font-bold text-lg ${showCode ? "!bg-[#F2D06B]" : "!bg-white"}`}>
            {"<>"}
          </button>
        </div>

        <div className="px-4 lg:px-8 pb-4 flex flex-wrap items-center gap-3" data-testid="blocky-actions">
          <button onClick={() => setShowLaunch(true)} data-testid="blocky-launch-button"
            className="nbb-pill px-8 py-3.5 font-extrabold text-xl" style={{ background: "#F0B04A" }}>
            Launch
          </button>
          <div className="relative flex">
            <button onClick={runSimulate} disabled={compiling} data-testid="blocky-run-button"
              className="nbb-pill inline-flex items-center gap-2 px-8 py-3.5 font-extrabold text-xl !rounded-r-none" style={{ background: "#7ED6A2" }}>
              <Play size={18} /> Run
            </button>
            <button onClick={() => setRunOpen(!runOpen)} data-testid="blocky-run-dropdown"
              className="nbb-pill !rounded-l-none !rounded-r-xl px-3.5 py-3.5 font-extrabold" style={{ background: "#7ED6A2", borderLeft: "3px solid #131311" }}>
              <ChevronDown size={16} />
            </button>
            {runOpen && (
              <div className="absolute z-30 mt-1 top-full w-64 nbb-pill !shadow-[5px_5px_0_#131311] overflow-hidden" data-testid="blocky-run-menu">
                <button onClick={runSimulate} data-testid="run-simulate" className="w-full text-left px-4 py-3 font-mono text-[12px] font-semibold hover:bg-[#F6F0DC] transition-colors border-b-[3px] border-[#131311]">
                  run a simulation (nothing moves)
                </button>
                <button onClick={runCheck} data-testid="run-check" className="w-full text-left px-4 py-3 font-mono text-[12px] font-semibold hover:bg-[#F6F0DC] transition-colors">
                  check with bolt
                </button>
              </div>
            )}
          </div>
          <span className="ml-auto font-mono text-[12px] font-bold text-[#161613]/70" data-testid="blocky-count">{blockCount} blocks</span>
        </div>
      </div>

      {/* workspace: rail + ask/canvas + palette */}
      <div className="border-y-[3px] border-[#131311] flex min-h-[calc(100vh-218px)]" data-testid="blocky-workspace">
        {/* family rail */}
        <div className="nbb-rail w-14 sm:w-16 shrink-0 flex flex-col items-center gap-2.5 py-4 overflow-y-auto" data-testid="blocky-rail">
          {(families.length ? families : [{ code: "EV" }, { code: "LG" }, { code: "DT" }, { code: "FN" }]).map((f) => (
            <button key={f.code} onClick={() => setSelFamily(f.code)} data-testid={`rail-${f.code}`} title={f.name}
              className={`nbb-rail-btn w-9 h-9 sm:w-11 sm:h-11 text-[10px] sm:text-[11px] shrink-0 ${selFamily === f.code ? "active" : ""}`}>
              {f.code}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* ask bolt bar */}
          <div className="px-4 sm:px-8 py-5" style={{ background: "#F6F0DC" }}>
            <div className="nbb-pill flex items-center gap-3 p-2.5 pl-6" style={{ boxShadow: "6px 6px 0 #F0B04A, 6px 6px 0 3px #131311" }}>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#161613]/60">ASK BOLT</p>
                <input
                  data-testid="builder-sentence-input"
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askBolt()}
                  placeholder="Describe it, Bolt builds it…"
                  className="w-full bg-transparent outline-none font-bold text-xl sm:text-2xl placeholder:text-[#161613]/35 min-w-0"
                />
              </div>
              <button data-testid="builder-ask-bolt-button" onClick={askBolt} disabled={compiling || !sentence.trim()}
                className="shrink-0 w-16 h-16 rounded-2xl border-[3px] border-[#131311] flex items-center justify-center text-2xl font-black transition-transform active:scale-95 disabled:opacity-50"
                style={{ background: "#F0B04A", boxShadow: "4px 4px 0 #131311" }}>
                {compiling ? <Sparkles size={22} className="animate-spin" /> : "↑"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2.5" data-testid="blocky-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} data-testid={`suggestion-${i}`} onClick={() => setSentence(s)}
                  className="nbb-pill !shadow-[3px_3px_0_#131311] px-5 py-2.5 font-semibold text-[15px]">
                  {s}
                </button>
              ))}
            </div>
            {compileError && (
              <div className="mt-3 nbb-pill p-4 font-mono text-[12px] font-semibold text-red-800" style={{ background: "#FBD7D7" }} data-testid="compile-error">
                {compileError}
              </div>
            )}
          </div>

          {/* canvas */}
          <div className="flex-1 nbb-canvas border-t-[3px] border-[#131311] px-4 sm:px-8 py-7 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}
            onDragOver={(e) => e.preventDefault()} onDrop={handleRootDrop} data-testid="blocky-canvas">
            {showCode ? (
              <pre className="font-mono text-[11.5px] font-semibold text-[#161613] whitespace-pre-wrap break-all max-w-full" data-testid="blocky-json">
                {rawProgram ? JSON.stringify(rawProgram, null, 2) : JSON.stringify(tree.map(({ def, vals }) => ({ type: def?.type, vals })), null, 2)}
              </pre>
            ) : rawProgram && !tree.length ? (
              <div className="flex flex-col gap-3 items-start">
                {toBlocks(rawProgram).map((b, i) => (
                  <div key={i} className="nbb-pill px-4 py-2.5 font-mono text-[12px] max-w-full" data-testid={`compiled-block-${i}`}>
                    <span className="font-bold mr-2">{b.label}</span>{b.value}
                  </div>
                ))}
                <button onClick={() => setRawProgram(null)} data-testid="clear-compiled" className="font-mono text-[11px] font-bold underline mt-2">
                  ← back to the canvas
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-1" data-testid="blocky-program">
                {renderProgram(tree, ctx)}
                {!tree.length && (
                  <p className="font-mono text-[13px] text-[#161613]/50 py-24 text-center w-full">
                    pick a family on the left and click to add — or ask bolt above
                  </p>
                )}
              </div>
            )}
          </div>

          {/* palette panel */}
          <div className="hidden lg:flex w-80 shrink-0 flex-col" data-testid="blocky-palette">
            <div className="nbb-family-head px-6 py-5" style={{ background: `${colorOf(selFamily)}2E` }}>
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 rounded-2xl border-[3px] border-[#131311] flex items-center justify-center font-mono font-extrabold text-base shadow-[4px_4px_0_#131311]" style={{ background: colorOf(selFamily) }}>
                  {selFamily}
                </span>
                <div>
                  <h2 className="font-extrabold text-3xl leading-none">{fam.name}</h2>
                  <p className="text-[15px] text-[#161613]/70 mt-1">{fam.desc}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: "#F6F0DC" }}>
              <p className="font-mono text-[12px] font-bold tracking-[0.14em] text-[#161613]/55 mb-4">CLICK TO ADD</p>
              <div className="flex flex-col items-start gap-5" data-testid="palette-list">
                {palette.map((b) => (
                  <div key={b.type} draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", "new:" + b.type); e.dataTransfer.effectAllowed = "copy"; }}
                    onClick={() => addByType(b.type, sel)}
                    data-testid={`palette-${b.type}`}
                    className="cursor-pointer hover:-translate-y-0.5 hover:rotate-[0.4deg] transition-transform">
                    <BlockPreview def={b} code={codeForDef(b)} />
                  </div>
                ))}
                {!palette.length && <p className="font-mono text-[12px] text-[#161613]/50">loading the catalog…</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* mobile palette strip */}
      <div className="lg:hidden border-t-[3px] border-[#131311] px-4 py-5 overflow-x-auto" style={{ background: "#F6F0DC" }} data-testid="blocky-palette-mobile">
        <div className="flex flex-col items-start gap-4">
          <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#161613]/55">{fam.name.toUpperCase()} — CLICK TO ADD</p>
          <div className="flex items-start gap-4 flex-wrap">
            {palette.map((b) => (
              <div key={b.type} draggable
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", "new:" + b.type); }}
                onClick={() => addByType(b.type, sel)}
                data-testid={`palette-${b.type}`}
                className="cursor-pointer">
                <BlockPreview def={b} code={codeForDef(b)} />
              </div>
            ))}
            {!palette.length && <p className="font-mono text-[12px] text-[#161613]/50">loading…</p>}
          </div>
        </div>
      </div>

      {/* bolt & log drawer */}
      {showLog && (
        <div className="fixed bottom-0 right-0 z-40 w-full sm:w-[420px] p-3" data-testid="bolt-log">
          <div className="nbb-pill p-4" style={{ background: "#ffffff" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#161613]/60 flex items-center gap-2">
                <StickyNote size={13} /> BOLT & LOG
              </p>
              <button onClick={() => setShowLog(false)} data-testid="bolt-log-close" className="font-bold"><Close size={16} /></button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {log.map((l, i) => <p key={i} className="font-mono text-[11px] text-[#161613]/80">› {l}</p>)}
            </div>
            {tree.length > 0 && (
              <p className="mt-2 pt-2 border-t-2 border-[#13131122] font-mono text-[10px] text-[#161613]/70 leading-relaxed" data-testid="plain-english">
                plain english: {toPlainEnglish(tree).slice(0, 200)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* launch drawer */}
      {showLaunch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" data-testid="launch-drawer">
          <div className="absolute inset-0 bg-[#131311]/45" onClick={() => setShowLaunch(false)} />
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}
            className="relative nbb-pill w-full max-w-md p-6" style={{ background: "#ffffff" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-extrabold text-2xl">Ship your coin</p>
              <button onClick={() => setShowLaunch(false)} data-testid="launch-close" className="font-bold"><Close size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} data-testid="launch-name-input" placeholder="Coin name"
                className="nbb-in w-full !h-11 !rounded-xl text-[15px]" />
              <input value={ticker} onChange={(e) => setTicker(e.target.value)} data-testid="launch-ticker-input" placeholder="Ticker (e.g. PAD)"
                className="nbb-in w-full !h-11 !rounded-xl text-[15px]" />
            </div>
            {!signedIn && (
              <div className="mt-4 rounded-xl border-[3px] border-[#131311] p-4" style={{ background: "#F2D06B" }} data-testid="launch-wallet-gate">
                <p className="font-mono text-[12px] font-bold leading-relaxed text-[#161613]">
                  {wallet ? "one last step — sign the note in your wallet" : "connecting your wallet signs you in — nothing moves without your signature"}
                </p>
                <button onClick={() => signInWithWallet()} data-testid="launch-signin-button"
                  className="mt-3 w-full nbb-pill !shadow-[3px_3px_0_#131311] font-extrabold py-2.5 text-[15px]" style={{ background: "#ffffff" }}>
                  {wallet ? "Sign message" : "Connect wallet"}
                </button>
              </div>
            )}
            <button onClick={launch} disabled={launching || !signedIn} data-testid="launch-button"
              className="mt-4 flex items-center justify-center gap-2 w-full nbb-pill font-extrabold text-lg py-3.5 disabled:opacity-50" style={{ background: "#7ED6A2" }}>
              <Rocket size={17} /> {launching ? "Launching…" : "Launch it"}
            </button>
            {launchResult && (
              <div className={`mt-4 rounded-xl border-[3px] border-[#131311] p-4 font-mono text-[11.5px] font-semibold leading-relaxed`}
                style={{ background: launchResult.ok ? "#D6F26E" : "#FBD7D7" }} data-testid="launch-result">
                {launchResult.ok
                  ? `launched ✓ ${launchResult.data?.mint || launchResult.data?.url || JSON.stringify(launchResult.data).slice(0, 200)}`
                  : `relay said: ${launchResult.message}`}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
