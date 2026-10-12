import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Tag } from "@/components/blocks";
import CATALOG from "@/data/blockCatalog.json";

export const FAMILY_COLORS = { EV: "#F0B04A", LG: "#6FCFBE", CT: "#E4E2D8", DT: "#92C9EF", ST: "#82D8A4", AG: "#B69CE8", AI: "#F2A9CB", WB: "#92C9EF", MD: "#C4B9F2", WD: "#82D8A4", FN: "#F2D06B", SK: "#D6F26E", BT: "#F09A62", OP: "#F08080", MO: "#D9D9CE" };
export const colorOf = (code) => FAMILY_COLORS[code] || "#94A3B8";

/* ---------------- catalog helpers ---------------- */

export const CATEGORY_CODE = Object.fromEntries(CATALOG.categories.map((c) => [c.id, c.code]));
export const codeForDef = (def, fallback = "MO") => CATEGORY_CODE[def?.category] || fallback;

const BY_IR = {};
CATALOG.blocks.forEach((b) => {
  if (b.ir && !BY_IR[b.ir]) BY_IR[b.ir] = b;
});
const BY_TYPE = Object.fromEntries(CATALOG.blocks.map((b) => [b.type, b]));

/** label rows (no branch slots, no advanced settings) */
export function rowsOf(def) {
  const rows = (def?.rows || []).filter((r) => !r.advanced && !r.parts.some((p) => p.k === "slot"));
  return rows.length ? rows.map((r) => r.parts) : [[{ k: "label", t: def?.label || def?.sentence || "block" }]];
}
export function partsOf(def) {
  return rowsOf(def)[0];
}

/** C-frame branches declared by a block: [{key, parts}] */
export function branchesOf(def) {
  const out = [];
  (def?.rows || []).forEach((r) => {
    const slot = r.parts.find((p) => p.k === "slot");
    if (slot) out.push({ key: slot.n, parts: r.parts.filter((p) => p.k !== "slot") });
  });
  if (!out.length && def?.type === "if") {
    out.push({ key: "then", parts: [{ k: "label", t: "then" }] }, { key: "else", parts: [{ k: "label", t: "else" }] });
  }
  return out;
}

export function isHat(def) {
  return def?.shape === "hat";
}
export function isBranch(def) {
  return branchesOf(def).length > 0;
}
/** where a block dropped onto `node` should go: hats stack under, C-blocks go into their first branch */
export function slotKeyFor(def) {
  if (isHat(def)) return "in";
  const br = branchesOf(def);
  return br.length ? br[0].key : null;
}

export function newNode(def, id) {
  const children = {};
  if (isHat(def)) children.in = [];
  branchesOf(def).forEach((b) => { children[b.key] = []; });
  return { id, def, kindCode: codeForDef(def), vals: {}, children };
}

/* ---------------- inputs on a block body ---------------- */

const shortLabel = (parts) => parts.length === 1 && parts[0].k === "label" && parts[0].t.length <= 4;

const pillWords = (parts) => parts.map((p) => p.k === "label" ? p.t : p.k === "dropdown" ? (p.o?.[0] ?? "") : (p.v ?? p.n ?? "")).filter(Boolean).join(" ").trim();

function FieldPill({ part, value, onChange, node, ctx }) {
  const v = value ?? part.v;
  if (part.k === "label") return <span className="text-[13.5px] font-semibold leading-tight break-words">{part.t}</span>;
  if (part.k === "dropdown") {
    const opts = part.o || [];
    return (
      <span className="relative inline-flex max-w-full">
        <select value={value ?? opts[0] ?? ""} onChange={(e) => onChange(e.target.value)} data-testid="block-field-dropdown"
          style={{ width: `calc(${String(value ?? opts[0] ?? "").length + 1}ch + 30px)` }}
          onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
          className="pz-in appearance-none cursor-pointer pr-6 truncate">
          {opts.map((o) => <option key={o} value={o} className="bg-ink">{o}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-snow/70">▾</span>
      </span>
    );
  }
  if (part.k === "checkbox") {
    return (
      <input type="checkbox" checked={value ?? !!part.v} onChange={(e) => onChange(e.target.checked)} data-testid="block-field-checkbox"
        onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-[#0A0F16]" />
    );
  }
  if (part.k === "slot") return null;
  const isBool = part.check && part.check.includes("Boolean");
  const text = v == null ? "" : String(v);
  const fieldKey = part.n || "value";
  return (
    <input value={text} onChange={(e) => onChange(e.target.value)} placeholder={part.n || "0"}
      data-testid={part.k === "value" ? "block-field-value" : `block-field-${part.k}`}
      draggable
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("text/plain", "move:" + node.id); e.dataTransfer.effectAllowed = "move"; }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation();
        const txt = e.dataTransfer.getData("text/plain");
        if (!txt) return;
        const idx = txt.indexOf(":");
        const kind = idx >= 0 ? txt.slice(0, idx) : txt;
        const rest = idx >= 0 ? txt.slice(idx + 1) : "";
        if (kind === "new") {
          const def = BY_TYPE[rest];
          const words = def ? pillWords(partsOf(def)) : rest;
          if (words) onChange(words);
        } else if (kind === "move" && ctx?.tree) {
          const src = findNode(ctx.tree, rest);
          const words = src ? pillWords(rowsOf(src.def).flat()) : "";
          if (words) onChange(words);
        }
      }}
      onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
      size={Math.max(2, Math.min(28, (text || part.n || "0").length))}
      className={`pz-in ${isBool ? "pz-in-bool" : ""} ${part.k === "variable" ? "!text-mint" : ""} text-center placeholder:text-fog/50`} />
  );
}

function PartsLine({ parts, node, ctx }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">
      {parts.map((p, i) => (
        <FieldPill key={i} part={p} value={node.vals[p.n || i]} node={node} ctx={ctx} onChange={(v) => setVal(ctx.tree, ctx.setTree, node.id, p.n || i, v)} />
      ))}
    </div>
  );
}

/** static preview of a block (palette) — no inputs, same body */
export function BlockPreview({ def, code, large = false }) {
  const shape = def.shape;
  const cls = shape === "hat" ? "pz-hat pz-tab" : shape === "reporter" ? "pz-reporter" : shape === "boolean" ? "pz-boolean" : shape === "terminal" ? "pz-notch" : "pz-notch pz-tab";
  // large = full canvas-size block (mobile flyout, like upstream); default = compact palette thumbnail
  const pad = large ? "px-3 py-2.5 gap-x-2 gap-y-1.5" : "px-2.5 py-1.5 gap-x-1.5 gap-y-1";
  const txt = large ? "text-[13.5px]" : "text-[12px]";
  const pill = large ? "pz-in inline-flex items-center !max-w-[150px] truncate" : "pz-in inline-flex items-center !h-[20px] !text-[10.5px] !px-2 !max-w-[90px] truncate";
  return (
    <div className="pz" style={{ "--c": colorOf(code) }}>
      <div className={`pz-body ${cls} inline-flex flex-wrap items-center ${pad} max-w-full ${shape === "boolean" ? "px-5" : ""}`}>
        <span className="pz-tag">{code}</span>
        {partsOf(def).map((p, i) => p.k === "label"
          ? <span key={i} className={`${txt} font-semibold leading-tight`}>{p.t}</span>
          : p.k === "slot" ? null
          : <span key={i} className={pill}>{p.k === "dropdown" ? `${p.o?.[0] ?? p.n} ▾` : String(p.v ?? p.n ?? "")}</span>)}
      </div>
    </div>
  );
}

/* ---------------- recursive renderer (plain functions, not components) ---------------- */

function dragProps(node, ctx) {
  return {
    draggable: true,
    onDragStart: (e) => { e.stopPropagation(); e.dataTransfer.setData("text/plain", "move:" + node.id); e.dataTransfer.effectAllowed = "move"; },
    onDragEnd: () => ctx.setOver(null),
  };
}

function dropProps(key, ctx, target) {
  return {
    onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); if (ctx.over !== key) ctx.setOver(key); },
    onDrop: (e) => { e.preventDefault(); e.stopPropagation(); ctx.setOver(null); ctx.onDrop(target, e.dataTransfer.getData("text/plain")); },
  };
}

/* touch: HTML5 drag-and-drop does not exist on phones, so a long-press picks a block up
   and the next tap (block / arm / slot / empty canvas) drops it. One finger at a time, so one timer. */
let pressTimer = null;
let pressAt = null;
let releasePending = false; // the long-press finger is still down
let swallowUntil = 0;       // ...and the click its release produces must not count as a drop
function clearPress() { if (pressTimer) clearTimeout(pressTimer); pressTimer = null; pressAt = null; }

function touchProps(node, ctx) {
  return {
    onPointerDown: (e) => {
      if (e.pointerType === "mouse" || !ctx.setPick) return;
      if (e.target.closest && e.target.closest("input,select,button,textarea")) return;
      e.stopPropagation();
      clearPress();
      pressAt = [e.clientX, e.clientY];
      pressTimer = setTimeout(() => { pressTimer = null; releasePending = true; ctx.setPick(node.id); if (navigator.vibrate) navigator.vibrate(12); }, 480);
    },
    onPointerMove: (e) => { if (pressTimer && pressAt && Math.hypot(e.clientX - pressAt[0], e.clientY - pressAt[1]) > 10) clearPress(); },
    onPointerUp: () => { clearPress(); if (releasePending) { releasePending = false; swallowUntil = Date.now() + 400; } },
    onPointerCancel: () => { clearPress(); releasePending = false; },
    onContextMenu: (e) => { if (e.nativeEvent && e.nativeEvent.pointerType !== "mouse") e.preventDefault(); },
  };
}

/** while a block is held, taps become drops */
function held(ctx, e, target) {
  if (!ctx.pick) return false;
  e.stopPropagation();
  if (Date.now() < swallowUntil) { swallowUntil = 0; return true; } // the long-press's own release click
  ctx.dropPicked(target);
  return true;
}

const isSel = (ctx, parentId, branch) => ctx.sel && ctx.sel.parentId === parentId && ctx.sel.branch === branch;

function deleteBtn(node, ctx) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); ctx.setTree(strip(ctx.tree, node.id)); }} data-testid="block-delete"
      aria-label="remove block"
      className="opacity-40 sm:opacity-0 group-hover/blk:opacity-60 hover:!opacity-100 transition-opacity text-ink shrink-0">
      <X size={13} strokeWidth={2.6} />
    </button>
  );
}

function ghost(key) {
  return (
    <div key={key} className="pz-ghost flex items-center px-3 font-mono text-[10px] mt-2.5" data-testid="blocky-snap-target">
      next block snaps here
    </div>
  );
}

/** a block that is not a C-frame (hat / statement / terminal / reporter / boolean) */
function renderSimple(node, ctx) {
  const def = node.def;
  const shape = def?.shape || "statement";
  const hat = shape === "hat";
  const cls = hat ? "pz-hat pz-tab min-w-[124px]"
    : shape === "reporter" ? "pz-reporter"
    : shape === "boolean" ? "pz-boolean px-6"
    : shape === "terminal" ? "pz-notch"
    : "pz-notch pz-tab";
  const key = `blk-${node.id}`;
  const selected = hat && isSel(ctx, node.id, "in");
  return (
    <div key={node.id} className="pz pz-pop" style={{ "--c": colorOf(node.kindCode) }} data-testid={`blocky-node-${def?.type || "block"}`}>
      <div {...dragProps(node, ctx)} {...dropProps(key, ctx, { mode: hat ? "into" : "after", node })} {...touchProps(node, ctx)}
        onClick={(e) => { if (held(ctx, e, { mode: hat ? "into" : "after", node })) return; e.stopPropagation(); if (hat) ctx.setSel(selected ? null : { parentId: node.id, branch: "in" }); }}
        data-testid={`blocky-body-${node.id}`}
        className={`pz-body ${cls} group/blk inline-flex items-start gap-2 px-3 py-2 sm:py-2.5 max-w-full cursor-grab active:cursor-grabbing ${ctx.over === key || selected ? "pz-over" : ""} ${ctx.pick === node.id ? "pz-picked" : ""}`}>
        <span className="pz-tag mt-[4px] shrink-0">{node.kindCode}</span>
        <div className="flex flex-col gap-1.5 min-w-0">
          {rowsOf(def).map((parts, i) => <PartsLine key={i} parts={parts} node={node} ctx={ctx} />)}
        </div>
        <span className="mt-[5px]">{deleteBtn(node, ctx)}</span>
      </div>
    </div>
  );
}

/** C-frame: header, one arm + inner stack per branch, mid bars between branches, foot */
function renderFrame(node, ctx) {
  const def = node.def;
  const branches = branchesOf(def);
  const headKey = `blk-${node.id}`;
  return (
    <div key={node.id} className="pz pz-pop inline-flex flex-col items-stretch" style={{ "--c": colorOf(node.kindCode) }} data-testid={`blocky-node-${def?.type || "block"}`}>
      <div {...dragProps(node, ctx)} {...dropProps(headKey, ctx, { mode: "into", node, branch: branches[0].key })} {...touchProps(node, ctx)}
        onClick={(e) => { if (held(ctx, e, { mode: "into", node, branch: branches[0].key })) return; e.stopPropagation(); ctx.setSel(isSel(ctx, node.id, branches[0].key) ? null : { parentId: node.id, branch: branches[0].key }); }}
        className={`pz-body pz-head pz-notch pz-tab pz-tab-arm group/blk flex items-start gap-2 px-3 py-2 sm:py-2.5 cursor-grab active:cursor-grabbing ${ctx.over === headKey ? "pz-over" : ""} ${ctx.pick === node.id ? "pz-picked" : ""}`}
        data-testid={`blocky-frame-head-${node.id}`}>
        <span className="pz-tag mt-[4px] shrink-0">{node.kindCode}</span>
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          {rowsOf(def).map((parts, i) => <PartsLine key={i} parts={parts} node={node} ctx={ctx} />)}
        </div>
        <span className="mt-[5px]">{deleteBtn(node, ctx)}</span>
      </div>

      {branches.map((br, i) => {
        const list = node.children[br.key] || [];
        const slotKey = `slot-${node.id}-${br.key}`;
        const selected = isSel(ctx, node.id, br.key);
        const armLabel = shortLabel(br.parts) ? br.parts[0].t : null;
        return (
          <div key={br.key} className="contents">
            {(i > 0 || (!armLabel && br.parts.length > 0)) && (
              <div className={`pz-body pz-mid pz-tab pz-tab-arm flex items-center px-3 ${armLabel || !br.parts.length ? "!min-h-[16px] py-0" : "py-1.5"}`}
                data-testid={`blocky-branch-label-${node.id}-${br.key}`}>
                {!armLabel && br.parts.length > 0 && <PartsLine parts={br.parts} node={node} ctx={ctx} />}
              </div>
            )}
            <div className="flex items-stretch min-w-0">
              <div className="pz-arm" data-testid={`blocky-arm-${node.id}-${br.key}`}
                onClick={(e) => { if (held(ctx, e, { mode: "into", node, branch: br.key })) return; e.stopPropagation(); ctx.setSel(selected ? null : { parentId: node.id, branch: br.key }); }}>
                {armLabel && (
                  <>
                    <span className="hidden sm:block font-mono text-[10.5px] font-bold text-ink/75 pl-1.5 pt-2.5">{armLabel}</span>
                    <span className="sm:hidden block font-mono text-[9px] font-bold text-ink/75 [writing-mode:vertical-rl] rotate-180 mx-auto pt-1 pb-2">{armLabel}</span>
                  </>
                )}
              </div>
              <div className={`pz-inner flex flex-col items-start ${ctx.over === slotKey ? "pz-over" : ""}`}
                {...dropProps(slotKey, ctx, { mode: "into", node, branch: br.key })}
                data-testid={`blocky-branch-${node.id}-${br.key}`}>
                {list.length ? renderStack(list, ctx) : (
                  <button type="button" data-testid={`blocky-slot-${node.id}${i ? `-${br.key}` : ""}`}
                    onClick={(e) => { if (held(ctx, e, { mode: "into", node, branch: br.key })) return; e.stopPropagation(); ctx.setSel(selected ? null : { parentId: node.id, branch: br.key }); }}
                    className={`pz-empty ml-1 px-3 font-mono text-[10px] text-left transition-colors ${selected ? "!border-mint/70 text-mint bg-mint-deep/40" : "text-fog/60 hover:text-snow"}`}>
                    {selected ? "next block snaps here" : "drop a block here"}
                  </button>
                )}
                {list.length > 0 && selected && ghost(`g-${node.id}-${br.key}`)}
              </div>
            </div>
          </div>
        );
      })}

      <div className="pz-body pz-foot pz-tab" style={{ minWidth: "calc(var(--arm) + 96px)" }} />
    </div>
  );
}

function renderNode(node, ctx) {
  return isBranch(node.def) ? renderFrame(node, ctx) : renderSimple(node, ctx);
}

/** a vertical stack of blocks that touch, so every tab sits in the next block's notch */
export function renderStack(list, ctx) {
  return list.map((n) => renderNode(n, ctx));
}

/** the whole canvas: each root node is a script (hats carry their stack beneath them) */
export function renderProgram(tree, ctx) {
  return tree.map((n) => {
    const under = isHat(n.def) ? n.children.in || [] : [];
    const selected = isHat(n.def) && isSel(ctx, n.id, "in");
    return (
      <div key={`script-${n.id}`} className="flex flex-col items-start max-w-full" data-testid="blocky-script">
        {renderNode(n, ctx)}
        {renderStack(under, ctx)}
        {selected && ghost(`g-${n.id}`)}
      </div>
    );
  });
}

/* ---------------- tree ops ---------------- */

const mapKids = (n, fn) => ({ ...n, children: Object.fromEntries(Object.entries(n.children || {}).map(([k, v]) => [k, fn(v)])) });

export function strip(nodes, id) {
  return nodes.filter((n) => n.id !== id).map((n) => mapKids(n, (v) => strip(v, id)));
}

export function setVal(nodes, setTree, id, key, value) {
  const walk = (list) => list.map((n) => (n.id === id ? { ...n, vals: { ...n.vals, [key]: value } } : mapKids(n, walk)));
  setTree(walk(nodes));
}

export function pushInto(nodes, parentId, branch, node, atStart = false) {
  if (parentId === null || parentId === undefined) return [...nodes, node];
  const walk = (list) => list.map((n) => {
    if (n.id === parentId) {
      const cur = n.children[branch] || [];
      return { ...n, children: { ...n.children, [branch]: atStart ? [node, ...cur] : [...cur, node] } };
    }
    return mapKids(n, walk);
  });
  return walk(nodes);
}

/** insert `node` right after `targetId`, in whatever list holds the target */
export function insertAfter(nodes, targetId, node) {
  const idx = nodes.findIndex((n) => n.id === targetId);
  if (idx >= 0) return [...nodes.slice(0, idx + 1), node, ...nodes.slice(idx + 1)];
  return nodes.map((n) => mapKids(n, (v) => insertAfter(v, targetId, node)));
}

export function containsNode(nodes, ancestorId, id) {
  const anc = findNode(nodes, ancestorId);
  return !!(anc && findNode([anc], id));
}

export function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    for (const list of Object.values(n.children || {})) {
      const hit = findNode(list, id);
      if (hit) return hit;
    }
  }
  return null;
}

export function countNodes(nodes) {
  return nodes.reduce((acc, n) => acc + 1 + Object.values(n.children || {}).reduce((a, l) => a + countNodes(l), 0), 0);
}

const partValue = (n, p) => {
  if (p.k === "label") return p.t;
  if (p.k === "slot" || p.k === "checkbox") return "";
  if (p.k === "dropdown") return n.vals[p.n] ?? p.o?.[0] ?? "";
  const v = n.vals[p.n] ?? p.v;
  return v == null || v === "" ? p.n || "" : String(v);
};

export function toPlainEnglish(nodes) {
  return nodes.map((n) => {
    const s = rowsOf(n.def).map((parts) => parts.map((p) => partValue(n, p)).filter(Boolean).join(" ")).join(" ");
    const kids = Object.entries(n.children || {}).filter(([, v]) => v.length);
    const kidText = kids.map(([br, list]) => `${br === "in" ? "" : br + " "}${toPlainEnglish(list)}`).join(" ");
    return kidText ? `${s} ${kidText}` : s;
  }).join("; ");
}

export function CompiledBlock({ label, value, i }) {
  return (
    <motion.div layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="blk blk-tab inline-flex items-center gap-3 px-4 py-3 self-start max-w-full" style={{ "--bc": "#E7C85F" }} data-testid={`compiled-block-${i}`}>
      <Tag k="FN" />
      <span className="font-mono text-[13px] text-yel shrink-0">{label}</span>
      <span className="font-mono text-[12px] text-snow/80 break-all line-clamp-2">{value}</span>
    </motion.div>
  );
}

/* ---------------- compiled program (from bolt) -> blocky tree ---------------- */

const OPS = { gte: "≥", lte: "≤", gt: ">", lt: "<", eq: "=", neq: "≠" };

/** human text for a nested value expression, using the catalog's own block wording */
function describeValue(v, depth = 0) {
  if (v == null) return "";
  if (typeof v !== "object") return String(v);
  if (depth > 4) return "…";
  if (v.type === "number" || v.type === "text") return String(v.value ?? "");
  if (v.type === "var") return v.var || "var";
  if (v.type === "compare") return `${describeValue(v.a, depth + 1)} ${OPS[v.op] || v.op} ${describeValue(v.b, depth + 1)}`;
  const def = BY_IR[v.type];
  if (!def) return v.type.replace(/_/g, " ");
  return partsOf(def).map((p) => {
    if (p.k === "label") return p.t;
    const raw = v[p.n];
    if (raw == null) return p.k === "dropdown" ? p.o?.[0] : p.v ?? "";
    return typeof raw === "object" ? describeValue(raw, depth + 1) : String(OPS[raw] || raw).replace(/_/g, " ");
  }).filter((x) => x !== "" && x != null).join(" ");
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_");

/** fill a catalog block's inputs from a compiled IR item */
function valsFrom(def, item) {
  const vals = {};
  (def.rows || []).forEach((r) => r.parts.forEach((p) => {
    if (!p.n || p.k === "label" || p.k === "slot") return;
    const raw = item[p.n] ?? item[p.n.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
    if (raw == null) return;
    if (p.k === "dropdown") {
      const s = slug(OPS[raw] || raw);
      const hit = (p.o || []).find((o) => slug(o) === s) || (p.o || []).find((o) => slug(o).includes(s) || s.includes(slug(o)));
      if (hit) vals[p.n] = hit;
      return;
    }
    vals[p.n] = typeof raw === "object" ? describeValue(raw) : String(raw);
  }));
  return vals;
}

let uidCounter = 5000;
function nextUid() { return ++uidCounter; }

function nodeFromItem(item, fallbackCode, fallbackLabel) {
  let def = BY_IR[item.type];
  if (item.type === "if") def = BY_TYPE[(item.else || []).length ? "control_if_else" : "control_if"];
  if (!def) {
    return {
      id: `x-${item.id || nextUid()}`, kindCode: fallbackCode,
      def: { label: fallbackLabel || item.type.replace(/_/g, " "), type: item.type, shape: fallbackCode === "EV" ? "hat" : "statement" },
      vals: {}, children: fallbackCode === "EV" ? { in: [] } : {},
    };
  }
  const node = { ...newNode(def, `n-${item.id || nextUid()}`), vals: valsFrom(def, item) };
  branchesOf(def).forEach((b) => { if (Array.isArray(item[b.key])) node.children[b.key] = mapBody(item[b.key]); });
  return node;
}

function mapBody(items) {
  return (items || []).map((a) => nodeFromItem(a, "FN", describeAction(a)));
}

export function describeAction(a) {
  if (!a || !a.type) return "do something";
  const def = BY_IR[a.type];
  if (def) return describeValue(a);
  return a.type.replace(/_/g, " ");
}

export function programToTree(program) {
  const scripts = (program?.scripts || []).map((s) => {
    const hat = nodeFromItem(s.event || { type: "event" }, "EV", `when ${(s.event?.type || "event").replace(/_/g, " ")}`);
    hat.children = { ...hat.children, in: mapBody(s.body) };
    return hat;
  });
  const loose = mapBody(program?.loose || []);
  return [...scripts, ...loose];
}

export function toBlocks(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.rules)) return data.rules.map((r, i) => ({ label: r?.op || r?.type || `rule ${i + 1}`, value: JSON.stringify(r) }));
  return Object.entries(data).filter(([, v]) => v != null).slice(0, 8)
    .map(([k, v]) => ({ label: k, value: typeof v === "string" ? v : JSON.stringify(v).slice(0, 160) }));
}
