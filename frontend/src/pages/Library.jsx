import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Search, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Tag, COLORS } from "@/components/blocks";
import { useLibrary } from "@/lib/relay";
import SNAPSHOT from "@/data/blockCatalog.json";

const EASE = [0.16, 1, 0.3, 1];
const KIND_ORDER = ["EVENTS", "VALUES", "ACTIONS"];
const SHAPE_NAME = {
  hat: "starts a rule",
  statement: "does something",
  terminal: "ends a rule",
  reporter: "gives a value",
  boolean: "yes / no",
};

const colorOf = (code) => COLORS[code] || "#94A3B8";

/* ---------- block label renderer: text, [fields] as pills, ( ) as slots ---------- */

function parsePartsFromLabel(label) {
  const out = [];
  const re = /\[([^\]]+)\]|\(\s*\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(label))) {
    if (m.index > last) out.push({ k: "label", t: label.slice(last, m.index).trim() });
    out.push(m[1] ? { k: "dropdown", n: m[1] } : { k: "value", n: "" });
    last = m.index + m[0].length;
  }
  if (last < label.length) out.push({ k: "label", t: label.slice(last).trim() });
  return out.filter((p) => p.k !== "label" || p.t);
}

const partText = (p) => {
  if (p.k === "label") return p.t;
  if (p.k === "dropdown") return p.o?.[0] ?? p.n;
  if (p.k === "slot" || p.k === "checkbox") return "";
  return p.v != null && p.v !== "" ? String(p.v) : p.n;
};

/** Plain sentence of the block with its default values — what we hand to Bolt. */
const sentenceOf = (b) => {
  const rows = (b.rows || []).filter((r) => !r.advanced);
  if (!rows.length) return b.sentence || b.label;
  return rows.flatMap((r) => r.parts.map(partText)).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
};

function Part({ p }) {
  const base = "max-w-[160px] truncate";
  if (p.k === "label") return <span className="text-[14px] text-snow break-words">{p.t}</span>;
  if (p.k === "slot") return null;
  if (p.k === "dropdown") {
    const v = p.o?.[0] ?? p.n;
    return (
      <span className="pill !h-[26px] !text-[12px] max-w-full" title={p.o ? p.o.join(" · ") : p.n}>
        <span className={base}>{v}</span>
        <span className="pill-caret">▾</span>
      </span>
    );
  }
  if (p.k === "number")
    return <span className="pill pill-num !h-[26px] !text-[12px]">{String(p.v ?? 0)}</span>;
  if (p.k === "checkbox")
    return <span className="pill !h-[26px] !text-[12px]">{p.v ? "☑" : "☐"}</span>;
  if (p.k === "variable")
    return <span className="pill pill-accent !h-[26px] !text-[12px]"><span className={base}>{p.v || p.n}</span> ▾</span>;
  if (p.k === "text")
    return <span className="pill !h-[26px] !text-[12px] max-w-full"><span className={base}>{p.v || p.n}</span></span>;
  // value slot ( )
  const isBool = p.check && p.check.includes("Boolean");
  return (
    <span
      className={`inline-flex items-center h-[24px] px-2.5 border border-dashed text-[11px] font-mono text-fog/80 max-w-full ${isBool ? "rounded-md rotate-0" : "rounded-full"}`}
      style={{ borderColor: "rgba(148,163,184,0.35)" }}
      title={p.n ? `input: ${p.n}` : "input"}
    >
      <span className={base}>{p.v != null && p.v !== "" ? String(p.v) : p.n || " "}</span>
    </span>
  );
}

function BlockLine({ parts }) {
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">{parts.map((p, i) => <Part key={i} p={p} />)}</div>;
}

/* ---------- one block card ---------- */

function BlockCard({ b, code, moduleName }) {
  const [open, setOpen] = useState(false);
  const c = colorOf(code);
  const rows = b.rows?.length ? b.rows : [{ advanced: false, parts: parsePartsFromLabel(b.label) }];
  const main = rows.filter((r) => !r.advanced);
  const extra = rows.filter((r) => r.advanced);
  const dropdowns = (b.rows || []).flatMap((r) => r.parts).filter((p) => p.k === "dropdown" && p.o?.length > 1);
  const hasDetail = extra.length > 0 || dropdowns.length > 0 || (b.eventOutputs && b.eventOutputs.length) || b.output;
  const slug = b.type.replace(/_/g, "-");
  const q = sentenceOf(b);

  return (
    <div
      className={`blk ${b.shape === "hat" ? "blk-tab mt-3" : ""} flex flex-col gap-3 p-4 min-w-0 hover:-translate-y-0.5 transition-transform duration-200`}
      style={{ "--bc": `${c}B3` }}
      data-testid={`library-block-${slug}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="shrink-0 mt-[3px]"><Tag k={code} /></span>
        <div className="flex flex-col gap-2 min-w-0">
          {main.map((r, i) => <BlockLine key={i} parts={r.parts} />)}
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-fog">{b.tooltip || "—"}</p>

      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">
        <span className="px-1.5 py-0.5 rounded border border-line text-fog/80">{SHAPE_NAME[b.shape] || b.kind}</span>
        {moduleName && <span className="px-1.5 py-0.5 rounded border border-line text-fog/70">{moduleName}</span>}
        {b.simulated && <span className="px-1.5 py-0.5 rounded border border-amberx/40 text-amberx/90">pretend in builder</span>}
        {b.gate && <span className="px-1.5 py-0.5 rounded border border-bluc/40 text-[#A8C4F7]">rolling out</span>}
        {b.new && <span className="px-1.5 py-0.5 rounded border border-mint/40 text-mint">new</span>}
      </div>

      {open && hasDetail && (
        <div className="border-t border-line pt-3 flex flex-col gap-2.5 text-[12px]" data-testid={`library-block-detail-${slug}`}>
          {extra.map((r, i) => (
            <div key={i} className="flex items-start gap-2 min-w-0">
              <span className="shrink-0 font-mono text-[10px] text-fog/60 mt-1 w-14">setting</span>
              <BlockLine parts={r.parts} />
            </div>
          ))}
          {dropdowns.map((d, i) => (
            <div key={`d${i}`} className="text-fog min-w-0 break-words">
              <span className="font-mono text-[10px] text-fog/60 uppercase mr-2">{d.n}</span>
              {d.o.join(" · ")}
            </div>
          ))}
          {b.eventOutputs?.length > 0 && (
            <div className="text-fog min-w-0 break-words">
              <span className="font-mono text-[10px] text-fog/60 uppercase mr-2">gives you</span>
              {b.eventOutputs.map((o) => `event ${o}`).join(" · ")}
            </div>
          )}
          {b.output && (
            <div className="text-fog">
              <span className="font-mono text-[10px] text-fog/60 uppercase mr-2">returns</span>
              {b.output.join(" / ")}
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        {hasDetail ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            data-testid={`library-block-toggle-${slug}`}
            className="inline-flex items-center gap-1 font-mono text-[11px] text-fog hover:text-snow transition-colors"
          >
            {open ? "less" : "details"} <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        ) : <span />}
        <Link
          to={`/builder?q=${encodeURIComponent(q)}`}
          data-testid={`library-ask-chip-${slug}`}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-mint hover:text-mint-bright transition-colors"
        >
          Ask Bolt for this <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}

/* ---------- grouped section ---------- */

function Section({ id, code, title, desc, meta, chips, blocks, codeFor, moduleNames, testid }) {
  const byKind = KIND_ORDER.map((k) => [k, blocks.filter((b) => b.kind === k)]).filter(([, l]) => l.length);
  return (
    <section id={id} className="scroll-mt-40 lg:scroll-mt-28" data-testid={testid}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <span className="grid place-items-center w-11 h-11 rounded-xl border font-mono text-[12px] font-bold"
          style={{ color: colorOf(code), borderColor: `${colorOf(code)}80`, background: `${colorOf(code)}14` }}>
          {code}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-[-0.02em]">
            {title} <span className="font-mono text-sm text-fog font-normal ml-1">{blocks.length} blocks</span>
          </h2>
          <p className="text-sm text-fog">{desc}</p>
        </div>
        {meta && <span className="font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded-md border border-mint/30 text-mint/90">{meta}</span>}
      </div>
      {chips?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((c) => <span key={c} className="px-2.5 py-0.5 rounded-full border border-line text-[12px] text-fog">{c}</span>)}
        </div>
      )}
      {byKind.map(([kind, list]) => (
        <div key={kind} className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog/70 mb-3">{kind} · {list.length}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {list.map((b) => <BlockCard key={b.type} b={b} code={codeFor(b)} moduleName={moduleNames[b.module]} />)}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ---------- page ---------- */

export default function Library() {
  const { data, isError, isFetching } = useLibrary();
  const cat = data?.blocks?.length ? data : SNAPSHOT;
  const live = cat.source === "live" && cat !== SNAPSHOT;

  const [view, setView] = useState("family");
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [only, setOnly] = useState("ALL");

  const catById = useMemo(() => Object.fromEntries(cat.categories.map((c) => [c.id, c])), [cat]);
  const modById = useMemo(() => Object.fromEntries(cat.modules.map((m) => [m.id, m])), [cat]);
  const moduleNames = useMemo(() => Object.fromEntries(cat.modules.map((m) => [m.id, m.name])), [cat]);
  const codeFor = (b) => catById[b.category]?.code || "MO";

  const q = query.trim().toLowerCase();
  const matches = (b) =>
    !q || `${b.label} ${b.tooltip} ${b.sentence} ${catById[b.category]?.name} ${moduleNames[b.module]}`.toLowerCase().includes(q);
  const shown = cat.blocks.filter(matches);

  const groups =
    view === "family"
      ? cat.categories.map((c) => ({
          key: c.code, id: `fam-${c.code}`, code: c.code, title: c.name, desc: c.desc, chips: c.chips,
          blocks: shown.filter((b) => b.category === c.id),
        }))
      : cat.modules.map((m) => ({
          key: m.id, id: `mod-${m.id}`, code: m.code, title: m.name, desc: m.note ? `${m.summary} ${m.note}` : m.summary,
          meta: m.real, chips: m.chips, blocks: shown.filter((b) => b.module === m.id),
        }));
  const visible = groups.filter((g) => g.blocks.length && (only === "ALL" || g.key === only));

  const switchView = (v) => { setView(v); setOnly("ALL"); };

  // keep results in view when the filter changes while scrolled deep into the list
  const gridRef = useRef(null);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 190;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "auto" });
  }, [query, only, view]);

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-10 pt-28 lg:pt-14 pb-24 overflow-x-clip" data-testid="library-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">the block library</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.2rem,5vw,4.2rem)] leading-[1.02]">
          Every block <span className="text-mint">a coin can hold.</span>
        </h1>
        <p className="mt-3 text-fog max-w-2xl">
          All {cat.total} blocks across {cat.categories.length} families — what each one does, what it asks for, and
          whether it runs for real on a launched coin. Tap <span className="text-mint">Ask Bolt</span> on any block to start a rule with it.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[11px]" data-testid="library-stats">
          <span className="px-2.5 py-1 rounded-lg border border-line bg-panel"><b className="text-snow">{cat.total}</b> <span className="text-fog">blocks</span></span>
          <span className="px-2.5 py-1 rounded-lg border border-line bg-panel"><b className="text-snow">{cat.categories.length}</b> <span className="text-fog">families</span></span>
          <span className="px-2.5 py-1 rounded-lg border border-line bg-panel"><b className="text-snow">{cat.modules.length}</b> <span className="text-fog">runtime modules</span></span>
          <span className="px-2.5 py-1 rounded-lg border border-line bg-panel inline-flex items-center gap-1.5" data-testid="library-source">
            <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-mint animate-blink" : "bg-amberx"}`} />
            <span className="text-fog">{live ? "live via relay" : isFetching ? "syncing…" : isError ? "offline copy" : "saved copy"}</span>
          </span>
        </div>
      </motion.div>

      {/* toolbar */}
      <div className="sticky top-16 lg:top-0 z-20 -mx-5 sm:-mx-6 lg:-mx-10 px-5 sm:px-6 lg:px-10 py-3 mt-8 bg-ink/90 backdrop-blur border-b border-line">
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          <label className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search blocks — burn, airdrop, AI…"
              data-testid="library-search-input"
              className="w-full h-10 pl-9 pr-9 rounded-xl bg-panel border border-line focus:border-mint/50 outline-none text-sm placeholder:text-fog/60"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} data-testid="library-search-clear"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fog hover:text-snow"><X size={15} /></button>
            )}
          </label>
          <div className="flex shrink-0 rounded-xl border border-line bg-panel p-1 text-[12px] font-semibold">
            {[["family", "Family"], ["module", "Module"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => switchView(v)} data-testid={`library-view-${v}`}
                className={`px-2.5 sm:px-3 h-8 rounded-lg transition-colors ${view === v ? "bg-mint text-[#0A0F16]" : "text-fog hover:text-snow"}`}>
                <span className="sm:hidden">{l}</span><span className="hidden sm:inline">By {l.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" data-testid="library-filter-row">
          <button type="button" onClick={() => setOnly("ALL")} data-testid="library-filter-all"
            className={`shrink-0 px-3 h-8 rounded-lg border text-[12px] font-semibold transition-colors ${only === "ALL" ? "border-mint/60 text-mint bg-mint/10" : "border-line text-fog hover:text-snow"}`}>
            All <span className="font-mono opacity-70">{shown.length}</span>
          </button>
          {groups.map((g) => (
            <button key={g.key} type="button" disabled={!g.blocks.length} onClick={() => setOnly(only === g.key ? "ALL" : g.key)}
              data-testid={`library-filter-${g.key.toLowerCase()}`}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-[12px] font-semibold transition-colors disabled:opacity-30 ${only === g.key ? "bg-raise text-snow" : "border-line text-fog hover:text-snow"}`}
              style={only === g.key ? { borderColor: colorOf(g.code) } : undefined}>
              <span className="font-mono text-[10px]" style={{ color: colorOf(g.code) }}>{g.code}</span>
              {g.title}
              <span className="font-mono opacity-60">{g.blocks.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={gridRef} className="mt-10 flex flex-col gap-14" data-testid="library-grid">
        {visible.map((g) => (
          <Section key={`${view}-${g.key}`} {...(({ key, ...rest }) => rest)(g)} groupKey={g.key} testid={`library-section-${g.key.toLowerCase()}`} codeFor={view === "family" ? codeFor : () => g.code} moduleNames={view === "family" ? moduleNames : {}} />
        ))}
        {!visible.length && (
          <div className="border border-line rounded-2xl bg-panel p-10 text-center text-fog" data-testid="library-empty">
            No block matches “{query}”. Try a different word — or{" "}
            <Link to={`/builder?q=${encodeURIComponent(query)}`} className="text-mint hover:underline" data-testid="library-empty-ask-chip">ask Bolt to build it</Link>.
          </div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}
        className="mt-16 border border-line rounded-2xl bg-panel p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <p className="text-fog max-w-md">Snap any of these together in the builder — one sentence, or block by block.</p>
        <Link to="/builder" data-testid="library-to-builder"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#0A0F16] font-bold px-6 py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
          Open the builder <ArrowUpRight size={17} />
        </Link>
      </motion.div>
    </div>
  );
}
