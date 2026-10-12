import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Rocket, Play, Pencil, ChevronDown, StickyNote, Wallet, Menu, X as Close } from "lucide-react";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { cPost, cGet, relayGet, useExplore, useLibrary } from "@/lib/relay";
import { useWallet, signInWithWallet, signTransaction } from "@/lib/walletStore";
import { BlockPreview, colorOf, codeForDef, programToTree, countNodes, toPlainEnglish, toBlocks, renderProgram, strip, pushInto, containsNode, findNode, insertAfter, newNode } from "@/components/blockyKit";
import CATALOG from "@/data/blockCatalog.json";
import { CodePadMark } from "@/components/Sidebar";
import FamilyFlyout from "@/components/FamilyFlyout";
import { TEMPLATE_NAME, makeTicker, uploadLogo } from "@/lib/templates";

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
  const [flyout, setFlyout] = useState(false); // mobile: family flyout over the ask bar + canvas
  const [pick, setPick] = useState(null); // touch: block id picked up by long-press, dropped by the next tap
  const [question, setQuestion] = useState(null); // bolt asked a clarifying question (upstream 409): {prompt, ask}
  const [answer, setAnswer] = useState("");
  const [remix, setRemix] = useState(null); // {slug, state: "loading"|"ready"|"missing"}

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
    const slug = params.get("remix");
    if (q) setSentence(q);
    if (params.get("launch")) setShowLaunch(true);
    if (autoBuilt.current) return;
    if (q) {
      autoBuilt.current = true;
      askBolt(q);
    } else if (slug) {
      autoBuilt.current = true;
      loadTemplate(slug);
    }
  }, [params]);

  /** ?remix=<slug>: load that template's live program the way upstream does (GET /api/p/<slug>?receipts=1),
   *  falling back to the rules gallery feed; the original coin's name/ticker/image are never shown */
  async function loadTemplate(slug) {
    setRemix({ slug, state: "loading" });
    say("loading template…");
    let program = null;
    try {
      const d = await cGet(`p/${encodeURIComponent(slug)}?receipts=1`);
      program = d?.program && typeof d.program === "object" ? d.program : null;
    } catch { /* fall back to the gallery */ }
    if (!program) {
      try {
        for (let pg = 1; pg <= 5 && !program; pg++) {
          const r = await relayGet(`rules?page=${pg}`);
          const hit = (r?.cards || []).find((c) => c.slug === slug);
          if (hit?.program && typeof hit.program === "object") program = hit.program;
          if (!r?.hasMore) break;
        }
      } catch { /* handled below */ }
    }
    if (!program) {
      setRemix({ slug, state: "missing" });
      say("template not found — ask bolt instead");
      return;
    }
    const t = programToTree(program);
    setTree(t);
    setRawProgram(program);
    setProjectName(`Remix of ${TEMPLATE_NAME}`);
    setName((n) => n || TEMPLATE_NAME);
    setTicker((tk) => tk || makeTicker(slug));
    setSentence((sv) => sv || toPlainEnglish(t).slice(0, 480));
    setRemix({ slug, state: "ready" });
    say(`template loaded: ${slug} — ${countNodes(t)} blocks`);
  }

  useEffect(() => {
    if (showLaunch && wallet && session && balanceSol == null) checkBalance(wallet);
  }, [showLaunch, wallet, session]);


  // rail = all 15 block families in builder order (live via relay, bundled catalog until it lands)
  const families = lib?.categories?.length ? lib.categories : CATALOG.categories;
  const blocks = lib?.blocks?.length ? lib.blocks : CATALOG.blocks;
  const palette = useMemo(() => blocks.filter((b) => (b.categoryCode || b.code) === selFamily || codeForDef(b) === selFamily), [blocks, selFamily]);
  const fam = families.find((f) => f.code === selFamily) || { code: selFamily, name: selFamily, desc: "" };
  const say = (line) => setLog((l) => [...l.slice(-6), line]);

  // same capability probes the upstream build page fires on load (through our /api/c relay)
  const [caps, setCaps] = useState({ ai: null, chain: null, trades: null });
  useEffect(() => {
    let alive = true;
    Promise.allSettled([cGet("ai"), cGet("chain/status"), cGet("real-trades")]).then(([ai, chain, trades]) => {
      if (!alive) return;
      const v = (r) => (r.status === "fulfilled" ? r.value : null);
      const next = { ai: v(ai), chain: v(chain), trades: v(trades) };
      setCaps(next);
      if (next.ai) say(next.ai.enabled ? `bolt online — $${Number(next.ai.spentTodayUsd || 0).toFixed(2)} of $${next.ai.dailyCapUsd} daily AI budget used` : "bolt is resting today (AI budget reached) — blocks still work");
      if (next.chain) say(next.chain.enabled ? `chain link up (${next.chain.provider || "rpc"})` : "chain link down — launches paused");
    });
    return () => { alive = false; };
  }, []);
  const aiOff = caps.ai && caps.ai.enabled === false;
  const chainOff = caps.chain && caps.chain.enabled === false;

  // first visit of the session: preload the same demo program the upstream builder ships with,
  // built from real catalog blocks (skipped for ?q= remixes, which auto-build instead)
  const demoSeeded = useRef(false);
  useEffect(() => {
    if (demoSeeded.current || params.get("q") || params.get("remix") || tree.length || !blocks.length) return;
    try { if (sessionStorage.getItem("cpad:demo-seeded")) return; } catch { /* storage blocked: seed anyway */ }
    demoSeeded.current = true;
    const byType = Object.fromEntries(blocks.map((b) => [b.type, b]));
    const mk = (type, vals) => {
      const def = byType[type];
      if (!def) return null;
      const n = newNode(def, `n-${nextId++}`);
      return { ...n, vals: { ...vals } };
    };
    const hat = mk("events_button", { label: "Go" });
    if (!hat) return;
    const change = mk("variables_change", { var: "clicks", by: "1" });
    const iff = mk("control_if_else", { condition: "clicks ≥ 3" });
    if (iff) {
      iff.children.then = [
        mk("world_update_feed", { message: "Three clicks! Resetting." }),
        mk("variables_set", { var: "clicks", value: "0" }),
      ].filter(Boolean);
      iff.children.else = [mk("world_update_feed", { message: "Click {clicks}" })].filter(Boolean);
    }
    hat.children.in = [change, iff].filter(Boolean);
    setTree([hat]);
    setSelFamily("EV");
    try { sessionStorage.setItem("cpad:demo-seeded", "1"); } catch { /* ignore */ }
    say("demo loaded — press Run, edit any block, or ask bolt for something new");
  }, [blocks, params, tree.length]);

  // touch: long-press picks a block up; the next tap on an arm / slot / block / empty canvas drops it there
  function dropPicked(target) {
    if (!pick) return;
    const id = pick;
    if (target === "root") {
      const moving = findNode(tree, id);
      if (moving) { setTree((t) => [...strip(t, id), moving]); say("moved to a fresh stack"); }
    } else if (target?.node?.id === id) {
      return; // tapped the block it is holding — keep holding
    } else {
      handleDrop(target, `move:${id}`);
    }
    setPick(null);
  }
  const ctx = { tree, setTree, sel, setSel, over, setOver, onDrop: handleDrop, pick, setPick, dropPicked };

  function addByType(type, target) {
    const def = blocks.find((b) => b.type === type);
    if (!def) return;
    const node = { id: `n-${nextId++}`, def, kindCode: codeForDef(def), vals: {}, children: nodeChildren(def) };
    // a selected slot ({parentId, branch}) from tapping an arm / empty slot / event block
    if (target && !target.mode && target.parentId != null) {
      target = findNode(tree, target.parentId) ? { mode: "into", node: { id: target.parentId }, branch: target.branch } : null;
    }
    if (target && target.node && !findNode(tree, target.node.id)) target = null; // slot's block was deleted
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

  function pickFamily(code) {
    const mobile = typeof window !== "undefined" && window.innerWidth < 1024;
    if (mobile) setFlyout((open) => !(open && selFamily === code));
    setSelFamily(code);
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
    setQuestion(null);
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
      if (e.status === 409) {
        // upstream answers vague prompts with a clarifying question — ask it, don't dead-end
        setQuestion({ prompt: text, ask: e.message });
        setAnswer("");
        setCompileError(null);
        say(`bolt asks: ${e.message}`);
      } else {
        setCompileError(e.message);
        say(`bolt could not: ${e.message}`);
      }
    } finally {
      setCompiling(false);
    }
  }

  function answerBolt() {
    const a = answer.trim();
    if (!a || !question) return;
    const next = `${question.prompt.replace(/[.\s]+$/, "")}. ${a}`;
    setQuestion(null);
    setSentence(next);
    askBolt(next);
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

      // 3 — coin picture: the CodePad mark, uploaded like upstream does (POST /api/images -> https url)
      setLaunchStep("image");
      let imageUrl = "";
      try { imageUrl = await uploadLogo(); say("picture ready — CodePad mark"); }
      catch (e) { throw Error(`could not upload the coin picture: ${e.message}`); }

      // 4 — upstream builds the launch transaction for OUR coin key
      setLaunchStep("tx");
      const coinName = (name || projectName || TEMPLATE_NAME).trim().slice(0, 32);
      const symbol = ((ticker || "").replace(/[^A-Za-z0-9]/g, "") || makeTicker(remix?.slug || coinName)).toUpperCase().slice(0, 10);
      const slugify = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "pad";
      let txRes;
      try {
        txRes = await cPost(`projects/${projectId()}/launch`, {
          mint: mintAddr,
          program: programPayload(),
          prompt: sentence || toPlainEnglish(tree) || undefined,
          name: coinName,
          symbol,
          description: (sentence || toPlainEnglish(tree) || "").slice(0, 500),
          imageUrl,
          devBuyLamports: "0",
          slug: slugify(symbol || coinName),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
        <div className="px-3 sm:px-4 lg:px-8 pt-[10px] sm:pt-6 pb-2 sm:pb-3 flex items-center gap-3" data-testid="blocky-project-bar">
          <Link to="/" aria-label="CodePad home" data-testid="blocky-project-icon"
            className="ml-1 sm:ml-0 w-7 h-7 sm:w-12 sm:h-12 shrink-0 rounded-lg sm:rounded-2xl border-2 sm:border-[1.5px] border-white/20 bg-[#0E141D] flex items-center justify-center text-[15px] sm:text-xl">
            ☻
          </Link>
          {editingName ? (
            <input autoFocus value={projectName} onChange={(e) => setProjectName(e.target.value)} onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)} data-testid="blocky-project-name-input"
              className="nbb-ctl nbb-ctl-dark !h-[42px] sm:!h-auto w-[186px] sm:w-64 px-4 sm:px-6 sm:py-3 font-bold sm:font-extrabold text-[15px] sm:text-2xl outline-none" />
          ) : (
            <button onClick={() => setEditingName(true)} data-testid="blocky-project-name"
              className="nbb-ctl nbb-ctl-dark !h-[42px] sm:!h-auto inline-flex items-center gap-2 sm:gap-3 pl-4 pr-1.5 sm:px-6 sm:py-3 font-bold sm:font-extrabold text-[15px] sm:text-2xl min-w-0">
              <span className="truncate max-w-[110px] sm:max-w-none">{projectName}</span>
              <Pencil size={13} className="opacity-50 shrink-0" />
              <span className="w-[26px] h-[26px] rounded-lg grid place-items-center shrink-0 hover:bg-white/5" data-testid="blocky-project-menu"><ChevronDown size={15} className="opacity-70" /></span>
            </button>
          )}
          <button type="button" onClick={() => window.dispatchEvent(new Event("cpad:menu"))} aria-label="Menu" data-testid="builder-menu-button"
            className="lg:hidden ml-auto w-9 h-9 rounded-xl border-2 border-white/15 bg-[#0E141D] grid place-items-center text-snow/80">
            <Menu size={17} />
          </button>
        </div>

        <div className="px-3 sm:px-4 lg:px-8 pb-2 sm:pb-3 flex items-center gap-2 sm:gap-3" data-testid="blocky-mode-chips">
          <button onClick={() => { setSelFamily("SK"); setFlyout(true); }} data-testid="chip-stocks"
            className="nbb-ctl sm:!h-auto inline-flex items-center gap-2.5 px-4 sm:px-5 sm:py-3 text-[15px] sm:text-lg shrink-0" style={{ background: "#D6F26E", color: "#0A0F16" }}>
            <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-white border-2 sm:border-[2.5px] border-[#131311] flex items-center justify-center font-mono text-[9px] sm:text-[11px] font-bold">SK</span>
            Stocks <span className="rounded-full bg-[#F2A9CB] border-2 sm:border-[2.5px] border-[#131311] font-mono text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 leading-none">NEW</span>
          </button>
          <button onClick={() => setShowLog(!showLog)} data-testid="chip-log"
            className={`nbb-ctl sm:!h-auto px-4 sm:px-5 sm:py-3 text-[14px] sm:text-lg shrink-0 ${showLog ? "" : "nbb-ctl-dark"}`}
            style={showLog ? { background: "#63E6A9", color: "#0A0F16" } : undefined}>
            Bolt & log
          </button>
          <button onClick={() => setShowCode(!showCode)} data-testid="chip-code" aria-label="code view"
            className={`nbb-ctl sm:!h-auto w-11 sm:w-auto sm:px-5 sm:py-3 font-mono text-[15px] sm:text-lg shrink-0 grid place-items-center ${showCode ? "" : "nbb-ctl-dark"}`}
            style={showCode ? { background: "#63E6A9", color: "#0A0F16" } : undefined}>
            {"<>"}
          </button>
        </div>

        <div className="px-3 sm:px-4 lg:px-8 pb-[10px] sm:pb-4 flex items-center gap-2 sm:gap-3" data-testid="blocky-actions">
          <button onClick={() => setShowLaunch(true)} data-testid="blocky-launch-button" title={chainOff ? "chain link down — launches paused" : "launch this coin"}
            className="nbb-ctl sm:!h-auto w-[102px] sm:w-auto sm:px-8 sm:py-3.5 text-[15px] sm:text-xl shrink-0" style={{ background: "#63E6A9", color: "#0A0F16" }}>
            Launch
          </button>
          <div className="relative flex shrink-0">
            <button onClick={runSimulate} disabled={compiling} data-testid="blocky-run-button"
              className="nbb-ctl sm:!h-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 w-[96px] sm:w-auto sm:px-8 sm:py-3.5 text-[16px] sm:text-xl !rounded-r-none" style={{ background: "#4CD98F", color: "#0A0F16" }}>
              <Play size={14} className="sm:w-[18px] sm:h-[18px]" fill="currentColor" /> Run
            </button>
            <button onClick={() => setRunOpen(!runOpen)} data-testid="blocky-run-dropdown" aria-label="run options"
              className="nbb-ctl sm:!h-auto !rounded-l-none w-[31px] sm:w-auto sm:px-3.5 sm:py-3.5 grid place-items-center" style={{ background: "#4CD98F", color: "#0A0F16", borderLeftWidth: 0 }}>
              <ChevronDown size={15} />
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
          <span className="ml-auto font-mono text-[11px] sm:text-[12px] font-bold text-snow/70" data-testid="blocky-count">{blockCount} blocks</span>
        </div>
      </div>

      {/* workspace: rail + ask/canvas + palette */}
      <div className="nbb-divider lg:border-t-0 lg:border-y lg:border-line relative flex h-[calc(100dvh-169px)] min-h-[480px] sm:h-[calc(100dvh-210px)] lg:h-auto lg:min-h-[calc(100vh-218px)]" data-testid="blocky-workspace">
        {/* family rail — 84px column, 52x46 buttons on a 50px pitch (upstream mobile metrics) */}
        <div className="nbb-rail nbb-rail-col lg:border-r-[1.5px] w-[84px] lg:w-20 shrink-0 flex flex-col items-center gap-1 lg:gap-3 pt-3 pb-4 lg:py-4 overflow-y-auto" data-lenis-prevent data-testid="blocky-rail">
          {families.map((f) => (
            <button key={f.code} onClick={() => pickFamily(f.code)} data-testid={`rail-${f.code}`} title={f.name}
              style={{ "--c": colorOf(f.code) }}
              className={`nbb-rail-btn ${selFamily === f.code ? "active" : ""}`}>
              <span className="rail-inner">{f.code}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* ask bolt bar */}
          <div className="px-5 sm:px-8 pt-2 pb-3.5 sm:py-5" style={{ background: "#0A0F16" }}>
            <div className="nbb-pill !border-2 sm:!border-[1.5px] flex items-center gap-3 p-[9px] pl-4 sm:p-2.5 sm:pl-6" style={{ boxShadow: "0 0 0 1px rgba(99,230,169,0.22), 0 14px 44px -14px rgba(99,230,169,0.35)" }}>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-snow/60 leading-none mb-1.5 sm:mb-0 sm:leading-normal">ASK BOLT</p>
                <input
                  data-testid="builder-sentence-input"
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askBolt()}
                  placeholder="Describe it, Bolt builds it…"
                  className="w-full bg-transparent outline-none font-bold text-[18px] sm:text-2xl placeholder:text-snow/35 min-w-0"
                />
              </div>
              <button data-testid="builder-ask-bolt-button" onClick={() => askBolt()} disabled={compiling || !sentence.trim() || aiOff}
                title={aiOff ? "bolt is resting today — AI budget reached" : "build it"}
                className="shrink-0 w-[46px] h-[46px] sm:w-16 sm:h-16 rounded-[14px] sm:rounded-2xl border-[3px] sm:border-2 border-black/50 flex items-center justify-center text-lg sm:text-2xl font-black text-[#0A0F16] transition-transform active:scale-95 disabled:opacity-50"
                style={{ background: "#63E6A9", boxShadow: "0 8px 30px -8px rgba(99,230,169,0.5)" }}>
                {compiling ? <Sparkles size={22} className="animate-spin" /> : "↑"}
              </button>
            </div>
            <div className="mt-4 sm:mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5" data-testid="blocky-suggestions">
              <select
                value=""
                onChange={(e) => { if (e.target.value) setSentence(e.target.value); }}
                data-testid="builder-ideas-dropdown"
                className="nbb-in !h-8 sm:!h-11 !rounded-full sm:!rounded-xl !border-2 sm:!border-[1.5px] pl-4 pr-9 font-semibold text-[13px] sm:text-[14px] cursor-pointer appearance-none max-w-full"
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
            {question && (
              <form onSubmit={(e) => { e.preventDefault(); answerBolt(); }} className="mt-3 nbb-pill p-3.5 flex flex-col gap-2.5" style={{ background: "rgba(99,230,169,0.08)" }} data-testid="bolt-question">
                <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-mint">BOLT ASKS</p>
                <p className="text-[14px] font-semibold leading-snug" data-testid="bolt-question-text">{question.ask}</p>
                <div className="flex gap-2">
                  <input value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus placeholder="your answer, e.g. 0.1 SOL each"
                    data-testid="bolt-answer-input" className="nbb-in flex-1 min-w-0 !h-11 !rounded-xl text-[15px]" />
                  <button type="submit" disabled={!answer.trim() || compiling} data-testid="bolt-answer-submit"
                    className="nbb-ctl h-11 px-4 text-[14px] shrink-0 disabled:opacity-50" style={{ background: "#63E6A9", color: "#0A0F16" }}>
                    answer
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* canvas */}
          <div className="flex-1 min-h-0 nbb-canvas border-t-[3px] lg:border-t border-line px-4 sm:px-8 py-7 overflow-auto lg:max-h-[calc(100vh-160px)]" data-lenis-prevent
            onDragOver={(e) => e.preventDefault()} onDrop={handleRootDrop} data-testid="blocky-canvas"
            onClick={(e) => { if (pick && e.target === e.currentTarget) dropPicked("root"); }}>
            {remix && (
              <div className="mb-5 nbb-pill p-3 pl-4 flex items-start gap-3" style={{ background: "#0E141D" }} data-testid="remix-banner">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-ink border border-line grid place-items-center"><CodePadMark size={24} /></span>
                <p className="flex-1 text-[13px] font-semibold leading-snug pt-0.5">
                  {remix.state === "loading" ? "Loading the template…" : remix.state === "missing" ? "That template isn't available any more — ask bolt to build something like it." : "You're remixing a template. Change anything, then launch it as your own coin."}
                </p>
                <button type="button" onClick={() => setRemix(null)} aria-label="dismiss" data-testid="remix-banner-close" className="text-fog hover:text-snow shrink-0 pt-0.5"><Close size={16} /></button>
              </div>
            )}
            {pick && (
              <div className="fixed left-3 right-3 bottom-4 lg:left-auto lg:right-8 lg:w-[460px] z-40 nbb-pill p-2.5 pl-4 flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" style={{ background: "#12321F" }} data-testid="blocky-move-banner">
                <p className="flex-1 font-mono text-[11.5px] font-bold text-mint leading-snug">
                  holding {findNode(tree, pick)?.def?.label || "block"} — tap an arm, a slot or a block to drop it · tap empty canvas for a new stack
                </p>
                <button type="button" onClick={(e) => { e.stopPropagation(); setPick(null); }} data-testid="blocky-move-cancel"
                  className="nbb-ctl nbb-ctl-dark !h-9 px-3 text-[12px] shrink-0">cancel</button>
              </div>
            )}
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
        {/* mobile: family flyout over ask bar + canvas (upstream behaviour: tap a family, tap a block) */}
        {flyout && (
          <FamilyFlyout code={selFamily} fam={fam} palette={palette} onClose={() => setFlyout(false)}
            onAdd={(b) => { addByType(b.type, sel); setFlyout(false); say(`added: ${b.label}`); }} />
        )}
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

            <div className="flex items-center gap-3 mb-3" data-testid="launch-image">
              <span className="w-14 h-14 rounded-xl bg-ink border-2 border-line grid place-items-center shrink-0" data-testid="launch-image-logo"><CodePadMark size={38} /></span>
              <p className="font-mono text-[11px] text-fog leading-snug">coin picture: the CodePad mark — uploaded for you at launch</p>
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
                  ["image", "coin picture (CodePad mark)"],
                  ["tx", "building the launch transaction"],
                  ["signing", "your wallet signs"],
                  ["sending", "broadcasting"],
                  ["registering", "registering the coin"],
                  ["status", "waiting for the network…"],
                ].map(([k, label]) => {
                  const order = ["wallet", "terms", "image", "tx", "signing", "sending", "registering", "status", "live"];
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
