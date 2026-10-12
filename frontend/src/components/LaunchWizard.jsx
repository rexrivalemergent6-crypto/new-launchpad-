import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { X as Close, Upload } from "lucide-react";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { cGet, cPost, relayImg } from "@/lib/relay";
import { signInWithWallet, signTransaction, walletStore } from "@/lib/walletStore";
import { PUMP_MINT, STOCKS, quoteBySymbol } from "@/lib/quotes";
import { uploadLogo, makeTicker } from "@/lib/templates";
import { CodePadMark } from "@/components/Sidebar";
import CATALOG from "@/data/blockCatalog.json";

const EASE = [0.16, 1, 0.3, 1];
const short = (w) => (w ? `${w.slice(0, 4)}…${w.slice(-4)}` : "");
const sol = (lam) => (lam == null || lam === "" || isNaN(Number(lam)) ? null : Number((Number(lam) / 1e9).toFixed(4)));
const kebab = (v) => String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// irs of blocks that move money (finance + stocks families) — decides the "no money rule" gate like upstream
const MONEY_IRS = new Set(CATALOG.blocks.filter((b) => ["finance", "stocks"].includes(b.category) && b.shape !== "reporter" && b.shape !== "boolean").map((b) => b.ir));
function hasMoneyRule(program) {
  let hit = false;
  const walk = (x) => {
    if (hit || !x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(walk);
    if (typeof x.type === "string" && MONEY_IRS.has(x.type)) { hit = true; return; }
    Object.values(x).forEach(walk);
  };
  walk(program);
  return hit;
}
const STEPS = ["wallet", "program", "terms", "image", "tx", "signing", "sending", "registering", "status", "live"];
const STEP_LABEL = { wallet: "wallet sign-in", program: "your blocks → program", terms: "live fee terms", image: "coin picture", tx: "building the launch transaction", signing: "your wallet signs", sending: "broadcasting", registering: "registering the coin", status: "waiting for the network…" };

function Row({ k, v, testid }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/10 last:border-0" data-testid={testid}>
      <span className="text-fog text-[13px]">{k}</span>
      <span className="text-[13px] font-semibold text-right break-all">{v}</span>
    </div>
  );
}

/**
 * Upstream's 5-step launch wizard, in the CodePad dark skin.
 * Launch body is exactly upstream's: {userWallet, mint, name, symbol, description, imageUrl, twitter?, devBuyLamports:"0",
 * slug, program, timezone, noMoneyRuleOk?, quoteMint?, creatorFeeBps?}.
 */
export default function LaunchWizard({ open, onClose, wallet, session, name, setName, ticker, setTicker, projectName, remixSlug, plainEnglish, blockCount, resolveProgram, onEditBlocks, say }) {
  const [step, setStep] = useState(1);
  const [imageUrl, setImageUrl] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [twitter, setTwitter] = useState("");
  const [tickerCount, setTickerCount] = useState(null);
  const [program, setProgram] = useState(null);
  const [programErr, setProgramErr] = useState(null);
  const [terms, setTerms] = useState(null);
  const [balance, setBalance] = useState(null);
  const [noMoneyOk, setNoMoneyOk] = useState(false);
  const [agree, setAgree] = useState(false);
  const [pricedIn, setPricedIn] = useState("SOL");
  const [stockSym, setStockSym] = useState("");
  const [stockRisk, setStockRisk] = useState(false);
  const [showStockNote, setShowStockNote] = useState(true);
  const [touched, setTouched] = useState(false);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);
  const signedIn = !!(wallet && session);
  const moneyRule = program ? hasMoneyRule(program) : true;

  // on open: default picture = CodePad mark; build the program from the user's blocks; fetch live terms + balance
  useEffect(() => {
    if (!open) return;
    setStep(1); setErr(null); setResult(null); setPhase(null); setTouched(false);
    if (!description && plainEnglish) setDescription(plainEnglish.slice(0, 280));
    if (!imageUrl) { setImgBusy(true); uploadLogo().then(setImageUrl).catch(() => {}).finally(() => setImgBusy(false)); }
    setProgramErr(null);
    resolveProgram().then(setProgram).catch((e) => { setProgram(null); setProgramErr(e.message); });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !signedIn) return;
    cGet(`chain/balance?wallet=${wallet}`).then((d) => setBalance(d?.sol ?? null)).catch(() => {});
    if (program) cPost("launch/terms", { program, ...(ticker ? { symbol: ticker } : {}) }).then(setTerms).catch((e) => say?.(`terms: ${e.message}`));
  }, [open, signedIn, program]); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkTicker(t) {
    if (!t) return setTickerCount(null);
    try { const d = await cGet(`coins/ticker?t=${encodeURIComponent(t)}`); setTickerCount(typeof d?.count === "number" ? d.count : null); } catch { setTickerCount(null); }
  }

  async function pickFile(f) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("That file isn't a picture.");
    setImgBusy(true); setErr(null);
    try {
      const d = await cPost("images", f, { "content-type": f.type });
      if (!d?.url) throw Error(d?.error || "upload failed");
      setImageUrl(d.url);
    } catch (e) { setErr(`picture: ${e.message}`); } finally { setImgBusy(false); }
  }

  const sym = (ticker || "").trim().toUpperCase();
  const nm = (name || "").trim();
  const v1 = /^https:\/\/\S+$/.test(imageUrl.trim()) ? null : "Add a picture for your coin.";
  const v2 = nm.length < 1 || nm.length > 32 ? "Give your coin a name (up to 32 characters)."
    : !/^[A-Za-z0-9]{1,10}$/.test(sym) ? "The ticker can be 1-10 letters or numbers."
    : description.length > 500 ? "The description can be up to 500 characters."
    : twitter.trim() && !/^https:\/\/(x|twitter)\.com\/\S+$/i.test(twitter.trim()) ? "Use a full X link, like https://x.com/yourcoin."
    : pricedIn === "STOCK" && !quoteBySymbol(stockSym) ? "Pick the tokenized stock your coin is priced in."
    : pricedIn === "STOCK" && !stockRisk ? "Tick the box about the stock's risks."
    : null;
  const v3 = programErr || (!program ? "Writing your rules…" : null);
  const v4 = !agree ? "Tick the box to agree." : !moneyRule && !noMoneyOk ? "Confirm you want to launch a coin with no money rule." : null;
  const blockers = { 1: v1, 2: v2, 3: v3, 4: v4 };
  const next = () => { setTouched(true); if (!blockers[step]) { setTouched(false); setStep((s) => Math.min(5, s + 1)); } };

  // live terms shape: {seedLamports, launchFee:{lamports, wallet}, aiStarterLamports, limits:{gasReserveLamports, maxSlippageBps, maxRewardRecipients, ...}}
  const fee = sol(terms?.launchFee?.lamports ?? terms?.launchFeeLamports), seed = sol(terms?.seedLamports), pump = sol(terms?.pumpCreateLamports),
    ai = sol(terms?.aiStarterLamports), lim = terms?.limits || {};
  const total = terms ? sol(terms.totalLamports ?? [terms.seedLamports, terms.launchFee?.lamports, terms.aiStarterLamports, terms.pumpCreateLamports].reduce((a, v) => a + (Number(v) || 0), 0)) : null;
  const gas = sol(lim.gasReserveLamports) ?? 0.0035, slip = lim.maxSlippageBps != null ? lim.maxSlippageBps / 100 : 3, maxPeople = lim.maxRewardRecipients ?? 50;

  async function launch() {
    setRunning(true); setErr(null); setResult(null);
    const coin = Keypair.generate();
    const mint = coin.publicKey.toBase58();
    const pid = (() => { try { const p = localStorage.getItem("cpad:project-id") || crypto.randomUUID(); localStorage.setItem("cpad:project-id", p); return p; } catch { return `pad-${Date.now()}`; } })();
    try {
      setPhase("wallet");
      let w = wallet;
      if (!w || !session) { w = await signInWithWallet(); if (!w) throw Error("Wallet sign-in was cancelled — nothing was sent."); }
      setPhase("program");
      const prog = program || (await resolveProgram());
      setPhase("terms");
      let t = terms;
      try { t = await cPost("launch/terms", { program: prog, symbol: sym }); setTerms(t); } catch (e) { say?.(`terms: ${e.message}`); }
      setPhase("image");
      const img = imageUrl.trim() || (await uploadLogo());
      setPhase("tx");
      const body = {
        userWallet: w, mint, name: nm, symbol: sym, description: description.trim(), imageUrl: img,
        ...(twitter.trim() ? { twitter: twitter.trim() } : {}),
        devBuyLamports: "0", slug: kebab(sym || nm), program: prog,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(!hasMoneyRule(prog) && noMoneyOk ? { noMoneyRuleOk: true } : {}),
        ...(pricedIn === "PUMP" ? { quoteMint: PUMP_MINT, creatorFeeBps: 0 }
          : pricedIn === "STOCK" ? { quoteMint: quoteBySymbol(stockSym)?.mint, creatorFeeBps: 0, stockQuoteRiskOk: true } : {}),
      };
      let tx;
      try { tx = await cPost(`projects/${pid}/launch`, body); } catch (e) { throw Error(`launch refused by the network: ${e.message}`); }
      if (!tx?.txBase64) throw Error(tx?.error || "the network sent no launch transaction — try again.");
      if (body.quoteMint ? tx.quoteMint !== body.quoteMint : tx.quoteMint) {
        throw Error("The pricing wasn't confirmed for this coin — pick SOL and try again, or wait a moment and retry.");
      }
      say?.(`transaction ready — slug ${tx.slug || body.slug}`);
      setPhase("signing");
      const vtx = VersionedTransaction.deserialize(Uint8Array.from(atob(tx.txBase64), (c) => c.charCodeAt(0)));
      vtx.sign([coin]);
      const signed = await signTransaction(vtx);
      const b64 = btoa(String.fromCharCode(...signed.serialize()));
      setPhase("sending");
      const slug = tx.slug || body.slug;
      const sent = await cPost(`projects/${pid}/send?mint=${mint}&slug=${encodeURIComponent(slug)}`, { tx: b64 });
      setPhase("registering");
      try { await cPost(`projects/${pid}/register`, { mint, slug, signature: sent?.signature }); } catch (e) { say?.(`register: ${e.message}`); }
      setPhase("status");
      let st = null;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        try { st = await cGet(`projects/${pid}/status`); if (st?.status && st.status !== "waiting") break; } catch { /* keep polling */ }
      }
      if (!(st?.status && ["live", "created", "locking"].includes(st.status))) throw Error(st?.status ? `verification says: ${st.status}` : "could not verify the launch yet — check My coins in a minute.");
      setResult({ mint, slug, signature: sent?.signature, status: st.status });
      setPhase("live");
      say?.(`LIVE — $${sym} ${mint.slice(0, 8)}…`);
    } catch (e) {
      setErr(e.message); setPhase("failed"); say?.(`launch stopped: ${e.message}`);
    } finally { setRunning(false); }
  }

  if (!open) return null;
  const inp = "w-full h-12 rounded-xl bg-[#16202E] border-2 border-white/10 focus:border-mint/60 outline-none px-4 text-[15px] text-snow placeholder:text-fog/50";
  const box = "rounded-2xl border-2 border-white/10 bg-[#0A0F16] p-4";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4" data-testid="launch-drawer">
      <div className="absolute inset-0 bg-black/70" onClick={() => !running && onClose()} />
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border-[3px] border-black/55 shadow-[6px_6px_0_rgba(0,0,0,0.42)] bg-[#0E141D]">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <p className="font-mono text-[12px] font-bold tracking-[0.14em] text-fog" data-testid="wizard-step-label">STEP {step} OF 5</p>
          <button onClick={() => !running && onClose()} data-testid="launch-close" className="w-9 h-9 rounded-xl border-2 border-white/15 grid place-items-center text-fog hover:text-snow"><Close size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-5" data-lenis-prevent>
          {step === 1 && (
            <div data-testid="wizard-step-1" className="space-y-4">
              <h2 className="text-[28px] font-extrabold tracking-tight">Make your coin</h2>
              {signedIn ? (
                <div className="flex items-center gap-2 rounded-full border-2 border-white/10 bg-[#0A0F16] pl-3 pr-1.5 py-1.5 w-fit" data-testid="wizard-signed-in">
                  <span className="w-2 h-2 rounded-full bg-mint" />
                  <span className="text-[13px] font-semibold">Signed in as {short(wallet)}</span>
                  <button onClick={() => walletStore.set({ session: null })} data-testid="wizard-logout" className="ml-1 rounded-full border border-white/15 px-2.5 py-0.5 text-[12px] text-fog hover:text-snow">Log out</button>
                </div>
              ) : (
                <button onClick={() => signInWithWallet().catch((e) => setErr(e.message))} data-testid="wizard-connect" className="rounded-xl bg-mint text-[#0A0F16] font-bold px-4 py-2.5 text-[14px]">Connect wallet</button>
              )}
              {showStockNote && (
                <div className="rounded-2xl border-2 border-[#A3E635]/40 bg-[#A3E635]/10 p-3.5 flex gap-3" data-testid="wizard-stock-note">
                  <p className="flex-1 text-[13.5px] font-semibold">New: this coin's fees can buy a tokenized stock. <span className="text-fog font-normal">Add the stock rule from the SK blocks.</span></p>
                  <button onClick={() => setShowStockNote(false)} className="text-fog hover:text-snow"><Close size={15} /></button>
                </div>
              )}
              <p className="text-[13px] leading-relaxed text-fog" data-testid="wizard-cost">
                {total != null
                  ? <>Launching needs about <b className="text-snow">{total} SOL</b> in your wallet{fee != null && <>: a one-time {fee} SOL launch fee to CodePad</>}{seed != null && <>, {seed} SOL to your coin's own wallet for setup and gas</>}{pump != null && <>, about {pump} SOL to pump.fun to create the coin</>}{ai ? <>, and {ai} SOL of AI starter credit for your coin</> : null}, plus pump.fun's small network fee. You can buy your coin on pump.fun as soon as it is live.</>
                  : signedIn ? "Getting the live launch costs…" : "Sign in to see the live launch costs. You see every amount again before you sign."}
                {balance != null && <> Your balance: <b className={balance < (total || 0.1) ? "text-red-300" : "text-mint"}>{balance} SOL</b>.</>}
              </p>
              <div>
                <p className="font-bold mb-2">Image</p>
                <div className="flex items-end gap-4">
                  <button onClick={() => fileRef.current?.click()} data-testid="wizard-image"
                    className="w-36 h-36 rounded-2xl border-[3px] border-dashed border-mint/50 bg-[#0A0F16] grid place-items-center overflow-hidden">
                    {imageUrl ? <img src={relayImg(imageUrl)} alt="coin" className="w-full h-full object-cover" /> : imgBusy ? <span className="font-mono text-[11px] text-fog">uploading…</span> : <CodePadMark size={64} />}
                  </button>
                  <button onClick={() => fileRef.current?.click()} data-testid="wizard-image-change" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-mint"><Upload size={14} /> change picture</button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} data-testid="wizard-image-file" />
                </div>
                <p className="mt-2 font-mono text-[11px] text-fog/70">default: the CodePad mark</p>
              </div>
            </div>
          )}
          {step === 2 && (
            <div data-testid="wizard-step-2" className="space-y-4">
              <h2 className="text-[28px] font-extrabold tracking-tight">Name it</h2>
              <label className="block"><span className="font-bold text-[14px]">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Coin" data-testid="launch-name-input" className={`${inp} mt-1.5`} /></label>
              <label className="block"><span className="font-bold text-[14px]">Ticker</span>
                <div className="relative mt-1.5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-fog">$</span>
                  <input value={ticker} onChange={(e) => { setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)); setTickerCount(null); }}
                    onBlur={(e) => checkTicker(e.target.value.trim())} placeholder={makeTicker(remixSlug || projectName)} data-testid="launch-ticker-input" className={`${inp} pl-8 font-mono uppercase`} />
                  {tickerCount !== null && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] px-2 py-0.5 rounded-md border ${tickerCount === 0 ? "text-mint border-mint/40 bg-mint/10" : "text-amber-300 border-amber-400/40 bg-amber-400/10"}`} data-testid="ticker-availability">
                      {tickerCount === 0 ? "ticker free" : `used x${tickerCount}`}
                    </span>
                  )}
                </div></label>
              <label className="block"><span className="font-bold text-[14px]">Description <span className="text-fog font-normal">(optional)</span></span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} placeholder="What is this coin about?" data-testid="wizard-description"
                  className={`${inp} h-auto py-3 mt-1.5 resize-none`} /></label>
              <label className="block"><span className="font-bold text-[14px]">Tweet or X profile <span className="text-fog font-normal">(optional)</span></span>
                <input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/yourcoin" data-testid="wizard-twitter" className={`${inp} mt-1.5`} />
                <span className="block mt-1.5 text-[12px] text-fog">Shown on pump.fun with your coin. It can't be changed after launch.</span></label>
              <div><p className="font-bold text-[14px] mb-1.5">What is your coin priced in?</p>
                <div className="inline-flex flex-wrap rounded-xl border-2 border-white/10 p-1 bg-[#0A0F16]" data-testid="wizard-quote">
                  {["SOL", "PUMP", "STOCK"].map((o) => (
                    <button key={o} type="button" onClick={() => { setPricedIn(o); setTouched(false); }} data-testid={`quote-option-${o.toLowerCase()}`}
                      className={`px-4 py-1.5 rounded-lg font-bold text-[13px] transition-colors ${pricedIn === o ? "bg-mint text-[#0A0F16]" : "text-fog hover:text-snow"}`}>
                      {o === "STOCK" ? "A tokenized stock" : o}
                    </button>
                  ))}
                </div>
                {pricedIn === "SOL" && <p className="mt-1.5 text-[12px] text-fog">People buy and sell your coin with SOL. This is how every coin on CodePad has worked so far.</p>}
                {pricedIn === "PUMP" && <p className="mt-1.5 text-[12px] text-fog">Your coin is priced in PUMP — the asset is picked from the network's own quote list, locked at launch.</p>}
                {pricedIn === "STOCK" && (
                  <div className="mt-2.5" data-testid="wizard-quote-stock">
                    <select value={stockSym} onChange={(e) => { setStockSym(e.target.value); setStockRisk(false); }} data-testid="wizard-stock-select"
                      className={`${inp} cursor-pointer`}>
                      <option value="">pick the tokenized stock…</option>
                      {STOCKS.map((st) => <option key={st.mint} value={st.symbol}>{st.name} ({st.symbol})</option>)}
                    </select>
                    {stockSym && (
                      <label className="mt-2.5 flex gap-3 items-start rounded-2xl border-2 border-amber-400/40 bg-amber-400/10 p-3.5 cursor-pointer" data-testid="wizard-stock-risk">
                        <input type="checkbox" checked={stockRisk} onChange={(e) => setStockRisk(e.target.checked)} className="mt-1 w-4 h-4 accent-[#E7C85F]" />
                        <span className="text-[13px] text-amber-100">A tokenized stock is issued by its own issuer and can be paused by them — a paused stock means this coin cannot trade. I understand the risks.</span>
                      </label>
                    )}
                  </div>
                )}</div>
            </div>
          )}
          {step === 3 && (
            <div data-testid="wizard-step-3" className="space-y-4">
              <h2 className="text-[28px] font-extrabold tracking-tight">Check the rules</h2>
              <p className="text-[14px] text-fog">Written from your blocks. This is what holders will read on your coin's page.</p>
              <div className={`${box} text-[14px] leading-relaxed whitespace-pre-wrap`} data-testid="wizard-rules">{plainEnglish || "(no blocks yet — add some on the canvas)"}</div>
              {programErr && <p className="text-[13px] text-red-300" data-testid="wizard-program-error">{programErr}</p>}
              <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-fog pt-2">WHERE THE MONEY CAN GO →</p>
            </div>
          )}
          {step === 4 && (
            <div data-testid="wizard-step-4" className="space-y-4">
              <h2 className="text-[24px] font-extrabold tracking-tight">{moneyRule ? "Where the money can go" : "This program can't move any money."}</h2>
              <div className="flex items-center justify-between text-[13px]"><span className="text-fog">{blockCount} blocks · no errors</span>
                <button onClick={() => { onClose(); onEditBlocks?.(); }} data-testid="wizard-edit-blocks" className="font-semibold text-mint">Edit blocks</button></div>
              <div className={box}>
                <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-fog mb-1">SPENDING LIMITS (FROZEN)</p>
                <Row k="Most it can spend in one go / an hour / a day" v="All the fees it has earned and not spent" />
                <Row k="Always kept for fees and gas" v={`${gas} SOL`} testid="limit-gas" />
                <Row k="Largest price slip it accepts" v={`${slip}%`} />
                <Row k="Most people it can reward at once" v={String(maxPeople)} />
                <p className="mt-2 text-[12px] text-fog leading-relaxed">These limits are written into the coin at launch and can never be raised.</p>
              </div>
              {ai ? <div className={box}><p className="font-mono text-[11px] font-bold tracking-[0.14em] text-fog mb-1">AI STARTER CREDIT</p>
                <p className="text-[13px]"><b>{ai} SOL</b> — ~200 AI calls so its AI blocks work from the first trade; paid from the coin's own fees after.</p></div> : null}
              {seed != null && <p className="text-[13px] text-fog">Launching moves <b className="text-snow">{seed} SOL</b> from your wallet to the coin's wallet for setup and gas.</p>}
              {!moneyRule && (
                <label className="flex gap-3 items-start rounded-2xl border-2 border-red-400/40 bg-red-400/10 p-3.5 cursor-pointer" data-testid="wizard-no-money">
                  <input type="checkbox" checked={noMoneyOk} onChange={(e) => setNoMoneyOk(e.target.checked)} className="mt-1 w-4 h-4 accent-red-400" />
                  <span className="text-[13px] text-red-200">This coin has no money rule. Its creator fees will only ever pay for its AI blocks. Rules can't be changed after launch. I want to launch it anyway.</span>
                </label>
              )}
              <label className="flex gap-3 items-start cursor-pointer" data-testid="wizard-agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 w-4 h-4 accent-[#63E6A9]" />
                <span className="text-[13px]">I understand these rules are locked forever once the coin launches. Nobody can change them, including me. I agree to the Terms.</span>
              </label>
            </div>
          )}
          {step === 5 && (
            <div data-testid="wizard-step-5" className="space-y-4">
              <h2 className="text-[24px] font-extrabold tracking-tight">Launch ${sym}</h2>
              <p className="text-[13.5px] text-fog">Connect the wallet that will create the coin. You'll approve one transaction that creates ${sym} and writes its rules to Solana. Real money moves on Solana mainnet.</p>
              {signedIn
                ? <div className="flex items-center gap-2 rounded-full border-2 border-mint/40 bg-mint/10 px-3 py-1.5 w-fit text-[13px] font-semibold"><span className="w-2 h-2 rounded-full bg-mint" />Wallet connected {short(wallet)}</div>
                : <button onClick={() => signInWithWallet().catch((e) => setErr(e.message))} data-testid="wizard-connect-5" className="rounded-xl bg-mint text-[#0A0F16] font-bold px-4 py-2.5 text-[14px]">Connect wallet</button>}
              <div className={box} data-testid="wizard-summary">
                <Row k="Creates" v={`${nm} · $${sym}`} testid="summary-creates" />
                <Row k="Priced in" v={pricedIn === "SOL" ? "SOL" : pricedIn === "PUMP" ? "PUMP" : `${quoteBySymbol(stockSym)?.name || stockSym} (${stockSym})`} />
                <Row k="X link" v={twitter.trim() || "none"} />
                <Row k="Website" v="Your coin's CodePad page (added automatically)" />
                <Row k="Sends" v={seed != null ? `${seed} SOL to the coin's wallet` : "setup SOL to the coin's wallet"} />
                <Row k="Pays" v={fee != null ? `${fee} SOL launch fee to CodePad` : "the launch fee to CodePad"} />
                {ai ? <Row k="AI starter" v={`${ai} SOL into the coin's wallet, for AI only`} /> : null}
                <Row k="Writes" v="the rules fingerprint to Solana" />
              </div>
              {(running || phase) && (
                <div className="font-mono text-[11px] space-y-1" data-testid="launch-steps">
                  {STEPS.slice(0, -1).map((k) => {
                    const idx = STEPS.indexOf(phase), mine = STEPS.indexOf(k), done = phase === "live" || (idx > mine && phase !== "failed");
                    return <p key={k} className={phase === k ? "text-mint" : done ? "text-snow/50" : "text-fog/50"}>{done ? "✓ " : phase === k ? "● " : "○ "}{STEP_LABEL[k]}</p>;
                  })}
                </div>
              )}
              {result && (
                <div className="rounded-2xl border-2 border-mint/50 bg-mint/10 p-4 space-y-2" data-testid="launch-result">
                  <p className="font-extrabold text-mint">${sym} is {result.status}.</p>
                  <p className="font-mono text-[11px] break-all">mint {result.mint}</p>
                  <div className="flex gap-2">
                    <Link to={`/c/${result.mint}`} className="rounded-lg bg-mint text-[#0A0F16] font-bold px-3 py-2 text-[13px]">open its page</Link>
                    {result.signature && <a href={`https://solscan.io/tx/${result.signature}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-2 text-[13px]">solscan ↗</a>}
                  </div>
                </div>
              )}
            </div>
          )}
          {(err || (touched && blockers[step])) && <p className="mt-4 text-[13px] font-semibold text-red-300" data-testid="launch-error">{err || blockers[step]}</p>}
        </div>
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t-2 border-white/10">
          <button onClick={() => { setTouched(false); setErr(null); setStep((s) => Math.max(1, s - 1)); }} disabled={step === 1 || running} data-testid="wizard-back"
            className={`h-11 px-5 rounded-xl border-2 border-white/15 font-bold text-[14px] ${step === 1 ? "invisible" : ""} disabled:opacity-40`}>Back</button>
          {step < 5 ? (
            <button onClick={next} data-testid="wizard-next" className="h-11 px-6 rounded-xl bg-mint text-[#0A0F16] font-extrabold text-[15px] border-2 border-black/55 shadow-[3px_3px_0_rgba(0,0,0,0.42)]">Next →</button>
          ) : (
            <button onClick={launch} disabled={running || !!result} data-testid="launch-button" className="h-11 px-6 rounded-xl bg-mint text-[#0A0F16] font-extrabold text-[15px] border-2 border-black/55 shadow-[3px_3px_0_rgba(0,0,0,0.42)] disabled:opacity-50">
              {running ? "launching…" : result ? "launched ✓" : "Sign & launch"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
