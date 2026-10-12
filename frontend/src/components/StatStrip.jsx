import { useOurLedger, fmtNum } from "@/lib/relay";

export default function StatStrip() {
  // CodePad's own ledger only — no upstream platform totals, no upstream flagship coin
  const o = useOurLedger();
  const isLoading = o.isLoading, isError = false;
  const stats = [
    { label: "Launched via CodePad", value: o.count, fmt: (v) => fmtNum(v || 0) },
    { label: "SOL they traded", value: o.volumeSol, fmt: (v) => fmtNum(v || 0) },
    { label: "Their trades", value: o.trades, fmt: (v) => fmtNum(v || 0) },
    { label: "Live on pump.fun", value: o.live, fmt: (v) => fmtNum(v || 0) },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-2xl overflow-hidden bg-panel/60" data-testid="stat-strip">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`p-6 lg:p-8 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t lg:border-t-0 border-line" : ""} ${i === 2 ? "lg:border-l" : ""}`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isError ? "bg-red-400" : "bg-mint animate-blink"}`} />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{s.label}</span>
          </div>
          <div className="mt-3 font-mono text-3xl lg:text-4xl font-medium tabular text-snow" data-testid={`stat-${i}`}>
            {isLoading ? <span className="text-fog/50">···</span> : s.fmt(s.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
