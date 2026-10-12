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

export function BlockRow({ node, depth, branchOf, tree, setTree, sel, setSel }) {
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
        className="blk blk-tab group inline-flex flex-wrap items-center gap-2 px-3.5 py-2.5 max-w-full" style={{ "--bc": color }}>
        <Tag k={node.kindCode} />
        {partsOf(def).map((p, i) => (
          <FieldPill key={i} part={p} value={node.vals[p.n || i]} onChange={(v) => setVal(tree, setTree, node.id, p.n || i, v)} />
        ))}
        <button onClick={remove} data-testid="block-delete" className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-fog ml-1"><X size={13} /></button>
      </motion.div>
      {(isHat(def) || isBranch(def)) && (
        <button onClick={snap} data-testid={`blocky-slot-${node.id}`}
          className={`mt-1.5 ml-6 font-mono text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors ${
            snappingHere ? "border-mint/60 text-mint bg-mint-deep/40" : "border-line text-fog/70 hover:text-snow"
          }`}>
          {isBranch(def) ? "+ snap into then / else" : "+ snap a block inside"}
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

export function toBlocks(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.rules)) return data.rules.map((r, i) => ({ label: r?.op || r?.type || `rule ${i + 1}`, value: JSON.stringify(r) }));
  return Object.entries(data).filter(([, v]) => v != null).slice(0, 8)
    .map(([k, v]) => ({ label: k, value: typeof v === "string" ? v : JSON.stringify(v).slice(0, 160) }));
}
