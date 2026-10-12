import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Tag } from "@/components/blocks";

export const FAMILY_COLORS = { EV: "#D9A33C", LG: "#2DD4BF", CT: "#5B8DEF", DT: "#22D3EE", ST: "#34D399", AG: "#C084FC", AI: "#F472B6", WB: "#38BDF8", MD: "#A78BFA", WD: "#4ADE80", FN: "#E7C85F", SK: "#A3E635", BT: "#FB923C", OP: "#F87171", MO: "#CBD5E1" };
export const colorOf = (code) => FAMILY_COLORS[code] || "#94A3B8";

export function partsOf(def) {
  const row = def?.rows?.find((r) => r.parts?.length) || def?.rows?.[0];
  return row?.parts || [{ k: "label", t: def?.label || def?.sentence || "block" }];
}
export function isHat(def) {
  return def?.shape === "hat" || /^when |^every |^each /.test(def?.label || "");
}
export function isBranch(def) {
  return /^if /.test(def?.label || "") || /^if /.test(def?.sentence || "");
}

function FieldPill({ part, value, onChange }) {
  if (part.k === "dropdown") {
    const opts = part.o || [];
    return (
      <select value={value ?? opts[0] ?? ""} onChange={(e) => onChange(e.target.value)} data-testid="block-field-dropdown"
        className="pill appearance-none cursor-pointer outline-none bg-raise border border-line rounded-lg px-2.5 py-1 font-mono text-[12px] text-snow/90">
        {opts.map((o) => <option key={o} value={o} className="bg-ink">{o}</option>)}
      </select>
    );
  }
  if (part.k === "value") {
    return (
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="0" data-testid="block-field-value"
        className="pill pill-num w-16 text-center outline-none bg-transparent" />
    );
  }
  return <span className="text-[14px] text-snow/90">{part.t}</span>;
}

/* flat renderer — no recursive components (babel-safe) */
export function flattenTree(nodes, depth = 0, branchOf = null, out = []) {
  nodes.forEach((n) => {
    out.push({ node: n, depth, branchOf });
    Object.entries(n.children).forEach(([br, list]) => {
      if (list.length) flattenTree(list, depth + 1, br, out);
    });
  });
  return out;
}

export function BlockRow({ node, depth, branchOf, tree, setTree, sel, setSel, onDropInto }) {
  const def = node.def;
  const color = colorOf(node.kindCode);

  const remove = () => setTree(strip(tree, node.id));
  const snap = () => setSel({ parentId: node.id, branch: isBranch(def) ? "then" : "in" });
  const snappingHere = sel && sel.parentId === node.id;

  return (
    <div style={{ marginLeft: Math.min(depth * 18, 90) }} data-testid={`blocky-node-${def?.type || "block"}`}>
      {branchOf && depth > 0 && (
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog/60 mb-1 ml-1">{branchOf}</div>
      )}
      <motion.div layout initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", "move:" + node.id); e.dataTransfer.effectAllowed = "move"; }}
        onDragOver={(e) => { if (isHat(def) || isBranch(def)) e.preventDefault(); }}
        onDrop={(e) => { if (isHat(def) || isBranch(def)) { e.preventDefault(); e.stopPropagation(); onDropInto && onDropInto(node, e.dataTransfer.getData("text/plain")); } }}
        className="blk blk-tab group inline-flex flex-wrap items-center gap-2 px-3.5 py-2.5 max-w-full cursor-grab active:cursor-grabbing" style={{ "--bc": color }}>
        <Tag k={node.kindCode} />
        {partsOf(def).map((p, i) => (
          <FieldPill key={i} part={p} value={node.vals[p.n || i]} onChange={(v) => setVal(tree, setTree, node.id, p.n || i, v)} />
        ))}
        <button onClick={remove} data-testid="block-delete" className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-fog ml-1"><X size={13} /></button>
      </motion.div>
      {(isHat(def) || isBranch(def)) && (
        <button onClick={snap}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropInto && onDropInto(node, e.dataTransfer.getData("text/plain")); }}
          data-testid={`blocky-slot-${node.id}`}
          className={`mt-1.5 ml-6 font-mono text-[10px] px-2.5 py-1.5 rounded-lg border border-dashed transition-colors ${
            snappingHere ? "border-mint/60 text-mint bg-mint-deep/40" : "border-line text-fog/70 hover:text-snow hover:border-mint/40"
          }`}>
          {isBranch(def) ? "+ drop or snap into then / else" : "+ drop or snap a block inside"}
        </button>
      )}
    </div>
  );
}

export function strip(nodes, id) {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: Object.fromEntries(Object.entries(n.children).map(([k, v]) => [k, strip(v, id)])) }));
}

export function setVal(nodes, setTree, id, key, value) {
  const walk = (list) => list.map((n) => n.id === id
    ? { ...n, vals: { ...n.vals, [key]: value } }
    : { ...n, children: Object.fromEntries(Object.entries(n.children).map(([k, v]) => [k, walk(v)])) });
  setTree(walk(nodes));
}

export function pushInto(nodes, parentId, branch, node) {
  if (parentId === null) return [...nodes, node];
  const walk = (list) => list.map((n) => {
    if (n.id === parentId) return { ...n, children: { ...n.children, [branch]: [...(n.children[branch] || []), node] } };
    return { ...n, children: Object.fromEntries(Object.entries(n.children).map(([k, v]) => [k, walk(v)])) };
  });
  return walk(nodes);
}

export function containsNode(nodes, ancestorId, id) {
  const walk = (list) => list.some((n) => n.id === ancestorId
    ? collect(n).includes(id)
    : walk(Object.values(n.children).flat()));
  const collect = (n) => [n.id, ...Object.values(n.children).flat().map((c) => collect(c)).flat()];
  return walk(nodes);
}

export function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    for (const list of Object.values(n.children)) {
      const hit = findNode(list, id);
      if (hit) return hit;
    }
  }
  return null;
}

export function countNodes(nodes) {
  return nodes.reduce((acc, n) => acc + 1 + Object.values(n.children).reduce((a, l) => a + countNodes(l), 0), 0);
}

export function toPlainEnglish(nodes) {
  return nodes.map((n) => {
    const s = partsOf(n.def).map((p) => (p.k === "dropdown" ? (n.vals[p.n] ?? p.o?.[0] ?? "") : p.k === "value" ? (n.vals[p.n] || "0") : p.t)).join(" ");
    const kids = Object.entries(n.children).filter(([, v]) => v.length);
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

/* map an upstream program (compiled by bolt) into our blocky tree */
const OPS = { gte: "≥", lte: "≤", gt: ">", lt: "<", eq: "=" };

function describeValue(v) {
  if (v == null) return "?";
  if (typeof v !== "object") return String(v);
  switch (v.type) {
    case "treasury": return `treasury ${v.asset || ""}`.trim();
    case "balance": return `wallet ${v.asset || "SOL"}`;
    case "claimable_fees": return "the pot";
    case "price_usd": return "price";
    case "market_cap": return "market cap";
    case "holders": return "holder count";
    case "volume": return "volume";
    default: return v.type ? v.type.replace(/_/g, " ") : String(v.value ?? "?");
  }
}

export function describeAction(a) {
  if (!a || !a.type) return "do something";
  switch (a.type) {
    case "sim_buy": return `buy back ${a.amount}${a.unit === "SOL" ? " SOL" : "%"} of ${a.pctOf === "claimable_fees" || !a.pctOf ? "the pot" : a.pctOf.replace(/_/g, " ")}`;
    case "sim_sell": return `sell ${a.amount}${a.unit === "SOL" ? " SOL" : "%"} of the pot`;
    case "burn": return `burn ${a.amount ?? ""}% of what it holds`;
    case "airdrop": return `airdrop to holders`;
    case "payout": return `pay a holder`;
    case "post": return `post to the feed`;
    case "ai_text": return `ask the AI to write something`;
    case "buy_stock": return `buy tokenized ${a.asset || "stock"}`;
    default: return a.type.replace(/_/g, " ");
  }
}

function mapBody(items) {
  return (items || []).map((a) => {
    if (a.type === "if") {
      return {
        id: `if-${a.id || nextUid()}`,
        kindCode: "LG",
        def: { label: `if ${describeValue(a.condition?.a)} ${OPS[a.condition?.op] || a.condition?.op || "?"} ${describeValue(a.condition?.b)} — then`, type: "if", shape: "statement" },
        vals: {},
        children: { then: mapBody(a.then), else: mapBody(a.else) },
      };
    }
    return { id: `fn-${a.id || nextUid()}`, kindCode: "FN", def: { label: describeAction(a), type: a.type }, vals: {}, children: {} };
  });
}

let uidCounter = 5000;
function nextUid() { return ++uidCounter; }

export function programToTree(program) {
  const scripts = (program?.scripts || []).map((s, i) => ({
    id: `ev-${i}-${nextUid()}`,
    kindCode: "EV",
    def: { label: `when ${(s.event?.type || "event").replace(/_/g, " ")}`, type: s.event?.type, shape: "hat" },
    vals: {},
    children: { in: mapBody(s.body) },
  }));
  const loose = (program?.loose || []).map((a) => ({
    id: `fn-${a.id || nextUid()}`, kindCode: "FN", def: { label: describeAction(a), type: a.type }, vals: {}, children: {},
  }));
  return [...scripts, ...loose];
}

export function toBlocks(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.rules)) return data.rules.map((r, i) => ({ label: r?.op || r?.type || `rule ${i + 1}`, value: JSON.stringify(r) }));
  return Object.entries(data).filter(([, v]) => v != null).slice(0, 8)
    .map(([k, v]) => ({ label: k, value: typeof v === "string" ? v : JSON.stringify(v).slice(0, 160) }));
}
