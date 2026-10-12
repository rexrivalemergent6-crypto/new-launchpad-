import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Rocket, Play, Pencil, ChevronDown, StickyNote, Wallet, X as Close } from "lucide-react";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { cPost, cGet, useExplore, useLibrary } from "@/lib/relay";
import { useWallet, signInWithWallet, signTransaction } from "@/lib/walletStore";
import { BlockPreview, colorOf, codeForDef, programToTree, countNodes, toPlainEnglish, toBlocks, renderProgram, strip, pushInto, containsNode, findNode, insertAfter } from "@/components/blockyKit";

const EASE = [0.16, 1, 0.3, 1];
let nextId = 1000;

const IDEAS = [
  "tip the day's biggest buyer 10% of the pot",
  "burn a little supply on every buy over 0.1 SOL",
  "make a mascot for every 100 holders",
  "when the pot crosses 2 SOL, stack tokenized TSLA with half and gift the rest",
  "if the chart doubles in a day, buy back 5% of everything",
  "once an hour, one random holder scoops 15% of the pot",
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
  const [launchStep, setLaunchStep] = useState(null);
  const [terms, setTerms] = useState(null);
  const [tickerCount, setTickerCount] = useState(null);
  const [balanceSol, setBalanceSol] = useState(null);
  const [launchErr, setLaunchErr] = useState(null);
  const pidRef = useRef(null);
  const autoBuilt = useRef(false);

  const { wallet, session } = useWallet();
  const { data: lib } = useLibrary();

  useEffect(() => {
    const q = params.get("q");
    if (q) setSentence(q);
    if (params.get("launch")) setShowLaunch(true);
    if (q && !autoBuilt.current) {
      autoBuilt.current = true;
      askBolt(q);
    }
  }, [params]);

  useEffect(() => {
    if (showLaunch && wallet && session && balanceSol == null) checkBalance(wallet);
  }, [showLaunch, wallet, session]);

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

  async function askBolt(preset) {
    const text = (preset != null ? preset : sentence).trim();
    if (!text) return;
    setCompiling(true);
    setCompileError(null);
    say(`bolt, build: ${text}`);
    try {
      const data = await cPost("/compile", { prompt: text, coinTicker: ticker || undefined });
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

  const lam = (n) => (n == null || n === "" ? "—" : `${(Number(n) / 1e9).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")} SOL`);

  function projectId() {
    if (pidRef.current) return pidRef.current;
    try {
      pidRef.current = localStorage.getItem("cpad:project-id") || crypto.randomUUID();
      localStorage.setItem("cpad:project-id", pidRef.current);
    } catch { pidRef.current = `pad-${Date.now()}`; }
    return pidRef.current;
  }

  async function checkTicker(t) {
    if (!t) { setTickerCount(null); return; }
    try {
      const d = await cGet(`coins/ticker?t=${encodeURIComponent(t)}`);
      setTickerCount(typeof d?.count === "number" ? d.count : null);
    } catch { setTickerCount(null); }
  }

  async function checkBalance(w) {
    if (!w) return;
    try {
      const d = await cGet(`chain/balance?wallet=${w}`);
      setBalanceSol(d?.sol ?? null);
    } catch { setBalanceSol(null); }
  }

  const programPayload = () => (rawProgram && typeof rawProgram === "object" ? rawProgram : { scripts: [], ...(tree.length ? { loose: [] } : {}) });

  async function launch() {
    setLaunching(true);
    setLaunchErr(null);
    setLaunchResult(null);
    const mint = Keypair.generate();
    const mintAddr = mint.publicKey.toBase58();
    try {
      // 1 — wallet session (upstream signs us in through the relay)
      setLaunchStep("wallet");
      let w = wallet;
      if (!w || !session) {
        w = await signInWithWallet();
        if (!w) throw Error("Wallet sign-in was cancelled — nothing was sent.");
      }
      say(`wallet in: ${w.slice(0, 4)}…${w.slice(-4)}`);

      // 2 — live fee terms from upstream
      setLaunchStep("terms");
      try {
        const t = await cPost("launch/terms", { program: programPayload(), ...(ticker ? { symbol: ticker } : {}) });
        setTerms(t);
        say(`terms in — launch fee ${lam(t?.launchFeeLamports ?? t?.totalLamports)}`);
      } catch (e) { say(`terms: ${e.message} (launch continues)`); }

      // 3 — upstream builds the launch transaction for OUR coin key
      setLaunchStep("tx");
      let txRes;
      try {
        txRes = await cPost(`projects/${projectId()}/launch`, {
          mint: mintAddr,
          program: programPayload(),
          prompt: sentence || toPlainEnglish(tree) || undefined,
          name: name || projectName,
          symbol: ticker || undefined,
        });
      } catch (e) { throw Error(`launch refused by the network: ${e.message}`); }
      if (!txRes?.txBase64) throw Error(txRes?.error || "the network sent no launch transaction — try again.");
      say(`transaction ready${txRes.slug ? ` — slug ${txRes.slug}` : ""}`);

      // 4 — the coin key co-signs, then YOUR wallet signs in Phantom
      setLaunchStep("signing");
      const vtx = VersionedTransaction.deserialize(Uint8Array.from(atob(txRes.txBase64), (c) => c.charCodeAt(0)));
      vtx.sign([mint]);
      const signed = await signTransaction(vtx);
      const b64 = btoa(String.fromCharCode(...signed.serialize()));
      say("signed by your wallet ✓");

      // 5 — relay broadcasts it
      setLaunchStep("sending");
      const sent = await cPost(`projects/${projectId()}/send?mint=${mintAddr}&slug=${encodeURIComponent(txRes.slug || "")}`, { tx: b64 });
      say(`broadcast — ${sent?.signature ? `sig ${String(sent.signature).slice(0, 12)}…` : "on chain"}`);

      // 6 — register the coin on the pad
      setLaunchStep("registering");
      try { await cPost(`projects/${projectId()}/register`, { mint: mintAddr, slug: txRes.slug, signature: sent?.signature }); } catch (e) { say(`register: ${e.message}`); }

      // 7 — watch it go live
      setLaunchStep("status");
      let st = null;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        try {
          st = await cGet(`projects/${projectId()}/status`);
          if (st?.status && st.status !== "waiting") break;
        } catch {}
      }
      const okSt = st?.status && ["live", "created", "locking"].includes(st.status);
      if (!okSt) throw Error(st?.status ? `verification says: ${st.status}` : "could not verify the launch — check the log later.");
      setLaunchResult({ ok: true, mint: mintAddr, slug: txRes?.slug, signature: sent?.signature, status: st.status });
      setLaunchStep("live");
      say(`LIVE — mint ${mintAddr.slice(0, 8)}… recorded by the portal`);
    } catch (e) {
      setLaunchErr(e.message);
      setLaunchStep("failed");
      setLaunchResult({ ok: false, message: e.message });
      say(`launch stopped: ${e.message}`);
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
            className="nbb-pill inline-flex items-center gap-2.5 px-5 py-3 font-extrabold text-lg" style={{ background: "#D6F26E", color: "#0A0F16" }}>
            <span className="w-8 h-8 rounded-lg bg-white border-[2.5px] border-[#131311] flex items-center justify-center font-mono text-[11px] font-bold">SK</span>
            Stocks <span className="rounded-full bg-[#F2A9CB] border-[2.5px] border-[#131311] font-mono text-[10px] font-bold px-2.5 py-0.5">NEW</span>
          </button>
          <button onClick={() => setShowLog(!showLog)} data-testid="chip-log"
            className={`nbb-pill px-5 py-3 font-extrabold text-lg ${showLog ? "!bg-[#63E6A9] !text-[#0A0F16]" : "!bg-[#0E141D]"}`}>
            Bolt & log
          </button>
          <button onClick={() => setShowCode(!showCode)} data-testid="chip-code"
            className={`nbb-pill px-5 py-3 font-mono font-bold text-lg ${showCode ? "!bg-[#63E6A9] !text-[#0A0F16]" : "!bg-[#0E141D]"}`}>
            {"<>"}
          </button>
        </div>

        <div className="px-4 lg:px-8 pb-4 flex flex-wrap items-center gap-3" data-testid="blocky-actions">
          <button onClick={() => setShowLaunch(true)} data-testid="blocky-launch-button"
            className="nbb-pill px-8 py-3.5 font-extrabold text-xl" style={{ background: "#63E6A9", color: "#0A0F16" }}>
            Launch
          </button>
          <div className="relative flex">
            <button onClick={runSimulate} disabled={compiling} data-testid="blocky-run-button"
              className="nbb-pill inline-flex items-center gap-2 px-8 py-3.5 font-extrabold text-xl !rounded-r-none" style={{ background: "#4CD98F", color: "#0A0F16" }}>
              <Play size={18} /> Run
            </button>
            <button onClick={() => setRunOpen(!runOpen)} data-testid="blocky-run-dropdown"
              className="nbb-pill !rounded-l-none !rounded-r-xl px-3.5 py-3.5 font-extrabold" style={{ background: "#4CD98F", color: "#0A0F16", borderLeft: "3px solid rgba(0,0,0,0.55)" }}>
              <ChevronDown size={16} />
            </button>
            {runOpen && (
              <div className="absolute z-30 mt-1 top-full w-64 nbb-pill overflow-hidden" data-testid="blocky-run-menu">
                <button onClick={runSimulate} data-testid="run-simulate" className="w-full text-left px-4 py-3 font-mono text-[12px] font-semibold hover:bg-white/5 transition-colors border-b border-white/10">
                  run a simulation (nothing moves)
                </button>
                <button onClick={runCheck} data-testid="run-check" className="w-full text-left px-4 py-3 font-mono text-[12px] font-semibold hover:bg-white/5 transition-colors">
                  check with bolt
                </button>
              </div>
            )}
          </div>
          <span className="ml-auto font-mono text-[12px] font-bold text-snow/70" data-testid="blocky-count">{blockCount} blocks</span>
        </div>
      </div>

      {/* workspace: rail + ask/canvas + palette */}
      <div className="border-y border-line flex min-h-[calc(100vh-218px)]" data-testid="blocky-workspace">
        {/* family rail */}
        <div className="nbb-rail w-14 sm:w-16 shrink-0 flex flex-col items-center gap-2.5 py-4 overflow-y-auto" data-testid="blocky-rail">
          {(families.length ? families : [{ code: "EV" }, { code: "LG" }, { code: "DT" }, { code: "FN" }]).map((f) => (
            <button key={f.code} onClick={() => setSelFamily(f.code)} data-testid={`rail-${f.code}`} title={f.name}
              style={{ "--c": colorOf(f.code) }}
              className={`nbb-rail-btn w-9 h-9 sm:w-11 sm:h-11 text-[10px] sm:text-[11px] shrink-0 ${selFamily === f.code ? "active" : ""}`}>
              {f.code}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* ask bolt bar */}
          <div className="px-4 sm:px-8 py-5" style={{ background: "#0A0F16" }}>
            <div className="nbb-pill flex items-center gap-3 p-2.5 pl-6" style={{ boxShadow: "0 0 0 1px rgba(99,230,169,0.22), 0 14px 44px -14px rgba(99,230,169,0.35)" }}>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-snow/60">ASK BOLT</p>
                <input
                  data-testid="builder-sentence-input"
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askBolt()}
                  placeholder="Describe it, Bolt builds it…"
                  className="w-full bg-transparent outline-none font-bold text-xl sm:text-2xl placeholder:text-snow/35 min-w-0"
                />
              </div>
              <button data-testid="builder-ask-bolt-button" onClick={askBolt} disabled={compiling || !sentence.trim()}
                className="shrink-0 w-16 h-16 rounded-2xl border-2 border-black/50 flex items-center justify-center text-2xl font-black text-[#0A0F16] transition-transform active:scale-95 disabled:opacity-50"
                style={{ background: "#63E6A9", boxShadow: "0 8px 30px -8px rgba(99,230,169,0.5)" }}>
                {compiling ? <Sparkles size={22} className="animate-spin" /> : "↑"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5" data-testid="blocky-suggestions">
              <select
                value=""
                onChange={(e) => { if (e.target.value) setSentence(e.target.value); }}
                data-testid="builder-ideas-dropdown"
                className="nbb-in !h-11 !rounded-xl pl-4 pr-9 font-semibold text-[14px] cursor-pointer appearance-none max-w-full"
                style={{ backgroundImage: "linear-gradient(45deg, transparent 50%, #63E6A9 50%), linear-gradient(135deg, #63E6A9 50%, transparent 50%)", backgroundPosition: "calc(100% - 18px) 55%, calc(100% - 13px) 55%", backgroundSize: "5px 5px", backgroundRepeat: "no-repeat" }}
              >
                <option value="">try an idea</option>
                {IDEAS.map((s, i) => <option key={i} value={s}>{s}</option>)}
              </select>
            </div>
            {compileError && (
              <div className="mt-3 nbb-pill p-4 font-mono text-[12px] font-semibold text-red-300" style={{ background: "rgba(248,113,113,0.12)" }} data-testid="compile-error">
                {compileError}
              </div>
            )}
          </div>

          {/* canvas */}
          <div className="flex-1 nbb-canvas border-t border-line px-4 sm:px-8 py-7 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}
            onDragOver={(e) => e.preventDefault()} onDrop={handleRootDrop} data-testid="blocky-canvas">
            {showCode ? (
              <pre className="font-mono text-[11.5px] font-semibold text-snow whitespace-pre-wrap break-all max-w-full" data-testid="blocky-json">
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
                  <p className="font-mono text-[13px] text-snow/50 py-24 text-center w-full">
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
                <span className="w-14 h-14 rounded-2xl border-[3px] border-[#131311] flex items-center justify-center font-mono font-extrabold text-base shadow-[3px_3px_0_rgba(0,0,0,0.35)]" style={{ background: colorOf(selFamily), color: "#0A0F16" }}>
                  {selFamily}
                </span>
                <div>
                  <h2 className="font-extrabold text-3xl leading-none">{fam.name}</h2>
                  <p className="text-[15px] text-snow/70 mt-1">{fam.desc}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: "#0A0F16" }}>
              <p className="font-mono text-[12px] font-bold tracking-[0.14em] text-snow/55 mb-4">CLICK TO ADD</p>
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
                {!palette.length && <p className="font-mono text-[12px] text-snow/50">loading the catalog…</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* mobile palette strip */}
      <div className="lg:hidden border-t border-line px-4 py-5 overflow-x-auto" style={{ background: "#0A0F16" }} data-testid="blocky-palette-mobile">
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-3.5 w-full" data-testid="blocky-family-head-mobile">
            <span className="w-12 h-12 rounded-xl border-2 border-black/50 flex items-center justify-center font-mono font-extrabold text-sm shadow-[3px_3px_0_rgba(0,0,0,0.35)]"
              style={{ background: colorOf(selFamily), color: "#0A0F16" }}>
              {selFamily}
            </span>
            <div className="min-w-0">
              <h2 className="font-extrabold text-2xl leading-none">{fam.name}</h2>
              <p className="text-[13px] text-fog mt-1">{fam.desc}</p>
            </div>
          </div>
          <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-snow/55">{fam.name.toUpperCase()} — CLICK TO ADD</p>
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
            {!palette.length && <p className="font-mono text-[12px] text-snow/50">loading…</p>}
          </div>
        </div>
      </div>

      {/* bolt & log drawer */}
      {showLog && (
        <div className="fixed bottom-0 right-0 z-40 w-full sm:w-[420px] p-3" data-testid="bolt-log">
          <div className="nbb-pill p-4" style={{ background: "#0E141D" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-snow/60 flex items-center gap-2">
                <StickyNote size={13} /> BOLT & LOG
              </p>
              <button onClick={() => setShowLog(false)} data-testid="bolt-log-close" className="font-bold"><Close size={16} /></button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {log.map((l, i) => <p key={i} className="font-mono text-[11px] text-snow/80">› {l}</p>)}
            </div>
            {tree.length > 0 && (
              <p className="mt-2 pt-2 border-t border-white/10 font-mono text-[10px] text-snow/70 leading-relaxed" data-testid="plain-english">
                plain english: {toPlainEnglish(tree).slice(0, 200)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* launch drawer — full upstream flow through the relay */}
      {showLaunch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" data-testid="launch-drawer">
          <div className="absolute inset-0 bg-black/70" onClick={() => !launching && setShowLaunch(false)} />
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}
            className="relative nbb-pill w-full max-w-md p-6 max-h-[92vh] overflow-y-auto" style={{ background: "#0E141D" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-extrabold text-2xl">Ship your coin</p>
              <button onClick={() => !launching && setShowLaunch(false)} data-testid="launch-close" className="font-bold text-fog hover:text-snow"><Close size={18} /></button>
            </div>

            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} onBlur={(e) => checkTicker(e.target.value.trim())} data-testid="launch-name-input" placeholder="Coin name"
                className="nbb-in w-full !h-11 !rounded-xl text-[15px]" />
              <div className="relative">
                <input value={ticker} onChange={(e) => { setTicker(e.target.value.toUpperCase()); setTickerCount(null); }}
                  onBlur={(e) => checkTicker(e.target.value.trim())} data-testid="launch-ticker-input" placeholder="TICKER (optional)"
                  className="nbb-in w-full !h-11 !rounded-xl text-[15px] font-mono uppercase" />
                {tickerCount !== null && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] px-2 py-0.5 rounded-md border ${tickerCount === 0 ? "text-mint border-mint/40 bg-mint/10" : "text-amber-300 border-amber-400/40 bg-amber-400/10"}`} data-testid="ticker-availability">
                    {tickerCount === 0 ? "ticker free" : `used x${tickerCount}`}
                  </span>
                )}
              </div>
            </div>

            {wallet && (
              <p className="mt-3 font-mono text-[11px] text-fog" data-testid="launch-balance">
                wallet {wallet.slice(0, 4)}…{wallet.slice(-4)} · balance <b className={balanceSol != null && balanceSol < 0.1 ? "text-red-300" : "text-mint"}>{balanceSol != null ? `${balanceSol} SOL` : "…"}</b>
                {balanceSol != null && balanceSol < 0.1 && " — the launch fee is paid in SOL, top up first"}
              </p>
            )}

            {terms && (
              <div className="mt-4 rounded-xl border border-line bg-white/[0.03] p-4 font-mono text-[11px] space-y-1" data-testid="launch-terms">
                <p className="uppercase tracking-[0.18em] text-fog mb-2">launch terms · live from the network</p>
                {terms.launchFeeLamports != null && <p className="flex justify-between text-snow/90"><span>launch fee</span><span>{lam(terms.launchFeeLamports)}</span></p>}
                {terms.seedLamports != null && <p className="flex justify-between text-snow/90"><span>seed</span><span>{lam(terms.seedLamports)}</span></p>}
                {terms.pumpCreateLamports != null && <p className="flex justify-between text-snow/90"><span>coin account</span><span>{lam(terms.pumpCreateLamports)}</span></p>}
                {terms.totalLamports != null && <p className="flex justify-between font-bold text-mint pt-1 border-t border-white/10"><span>total</span><span>{lam(terms.totalLamports)}</span></p>}
              </div>
            )}

            {!signedIn ? (
              <div className="mt-4 rounded-xl border border-mint/30 bg-mint/10 p-4" data-testid="launch-wallet-gate">
                <p className="font-mono text-[12px] font-bold leading-relaxed text-snow/90">
                  {wallet ? "one last step — sign the note in your wallet" : "connecting your wallet signs you in — nothing moves without your signature"}
                </p>
                <button onClick={() => signInWithWallet().then((w) => w && checkBalance(w))} data-testid="launch-signin-button"
                  className="mt-3 w-full nbb-pill font-extrabold py-2.5 text-[15px] hover:border-mint/40 transition-colors">
                  {wallet ? "Sign message" : "Connect wallet"}
                </button>
              </div>
            ) : (
              <p className="mt-4 font-mono text-[11px] text-mint" data-testid="launch-signed-in">signed in — your wallet signs, the relay does the rest</p>
            )}

            {launchStep && (
              <div className="mt-4 font-mono text-[11px] space-y-1" data-testid="launch-steps">
                {[
                  ["wallet", "wallet sign-in"],
                  ["terms", "live fee terms"],
                  ["tx", "building the launch transaction"],
                  ["signing", "your wallet signs"],
                  ["sending", "broadcasting"],
                  ["registering", "registering the coin"],
                  ["status", "waiting for the network…"],
                ].map(([k, label]) => {
                  const order = ["wallet", "terms", "tx", "signing", "sending", "registering", "status", "live"];
                  const idx = order.indexOf(launchStep);
                  const mine = order.indexOf(k);
                  const done = launchStep === "live" || idx > mine;
                  return (
                    <p key={k} className={`flex items-center gap-2 ${launchStep === k && launchStep !== "live" ? "text-mint" : done ? "text-snow/50" : "text-fog/50"}`}>
                      {launchStep === k && launchStep !== "live" ? <span className="w-1.5 h-1.5 rounded-full bg-mint animate-blink" /> : done ? <span className="text-mint">✓</span> : <span className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                      {label}
                    </p>
                  );
                })}
              </div>
            )}

            <button onClick={launch} disabled={launching || !signedIn} data-testid="launch-button"
              className="mt-4 flex items-center justify-center gap-2 w-full nbb-pill font-extrabold text-lg py-3.5 disabled:opacity-50 transition-colors"
              style={{ background: "#63E6A9", color: "#0A0F16" }}>
              <Rocket size={17} /> {launching ? "Launching…" : "Launch it"}
            </button>

            {launchErr && (
              <div className="mt-4 rounded-xl border border-red-400/40 p-4 font-mono text-[11.5px] font-semibold leading-relaxed text-red-300"
                style={{ background: "rgba(248,113,113,0.12)" }} data-testid="launch-error">
                {launchErr}
              </div>
            )}
            {launchResult?.ok && (
              <div className="mt-4 rounded-xl border border-mint/40 p-4 font-mono text-[11.5px] font-semibold leading-relaxed" style={{ background: "#12261E" }} data-testid="launch-result">
                <p className="text-mint font-bold">launched — status: {launchResult.status}</p>
                <p className="mt-1 text-snow/80 break-all">mint {launchResult.mint}</p>
                {launchResult.signature && <p className="mt-1 text-snow/60 break-all">sig {String(launchResult.signature).slice(0, 24)}…</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/c/${launchResult.mint}`} data-testid="launch-result-coin" className="px-3 py-1.5 rounded-lg bg-mint text-[#0A0F16] font-bold">open its page</Link>
                  <a href={`https://solscan.io/token/${launchResult.mint}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg border border-line text-snow/80 hover:text-mint transition-colors">solscan ↗</a>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
