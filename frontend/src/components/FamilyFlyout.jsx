import { X as Close } from "lucide-react";
import { BlockPreview, colorOf, codeForDef } from "@/components/blockyKit";

/** Mobile block flyout: opens over the ask bar + canvas when a family is tapped (upstream behaviour).
 *  Header (family square, name, description, close), then CLICK TO ADD and full-size blocks. */
export default function FamilyFlyout({ code, fam, palette, onAdd, onClose }) {
  const c = colorOf(code);
  return (
    <div className="lg:hidden absolute top-0 bottom-0 left-[84px] right-0 z-20 nbb-flyout nbb-pop-in flex flex-col" data-testid="blocky-palette-mobile">
      <div className="nbb-flyout-head shrink-0 flex items-center gap-3 px-4 sm:px-5" style={{ background: `linear-gradient(0deg, ${c}2E, ${c}2E), #0E141D` }}
        data-testid="blocky-family-head-mobile">
        <span className="w-[46px] h-[46px] shrink-0 rounded-xl border-[3px] border-black/55 flex items-center justify-center font-mono font-extrabold text-[15px] shadow-[3px_3px_0_rgba(0,0,0,0.42)]"
          style={{ background: c, color: "#0A0F16" }}>
          {code}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-[22px] leading-tight truncate">{fam.name}</h2>
          <p className="text-[13px] text-snow/65 leading-snug line-clamp-2">{fam.desc}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="close blocks" data-testid="blocky-flyout-close"
          className="shrink-0 w-9 h-9 rounded-xl border-[3px] border-black/55 bg-[#E8EDF5] text-[#0A0F16] grid place-items-center shadow-[2px_2px_0_rgba(0,0,0,0.42)]">
          <Close size={16} strokeWidth={3} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-6 pb-10" data-lenis-prevent>
        <p className="font-mono text-[13px] font-bold tracking-[0.12em] text-snow/55 mb-1.5">CLICK TO ADD</p>
        <p className="font-mono text-[10.5px] text-snow/40 mb-5" data-testid="flyout-touch-hint">tip: long-press a block on the canvas to move it</p>
        <div className="flex flex-col items-start gap-[22px]" data-testid="palette-mobile-list">
          {palette.map((b) => (
            <div key={b.type} draggable
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", "new:" + b.type); e.dataTransfer.effectAllowed = "copy"; }}
              onDragEnd={onClose}
              onClick={() => onAdd(b)}
              data-testid={`palette-${b.type}`}
              className="cursor-pointer max-w-full active:scale-[0.98] transition-transform">
              <BlockPreview def={b} code={codeForDef(b)} large />
            </div>
          ))}
          {!palette.length && <p className="font-mono text-[12px] text-snow/50">loading…</p>}
        </div>
      </div>
    </div>
  );
}
