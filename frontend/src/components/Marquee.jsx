const ITEMS = [
  "Blocks that run themselves",
  "Fees feed the loop",
  "Stocks, burns, airdrops — on autopilot",
  "Built once. Locked forever.",
  "One line in. A coin out.",
];

export default function Marquee() {
  const row = (dup) =>
    ITEMS.map((t, i) => (
      <span key={`${dup}-${i}`} className="inline-flex items-center gap-8 pr-8">
        <span className="font-mono text-[13px] uppercase tracking-[0.22em] text-fog">{t}</span>
        <svg width="9" height="9" viewBox="0 0 10 10" className="text-mint shrink-0">
          <path d="M5 0l1.4 3.6L10 5 6.4 6.4 5 10 3.6 6.4 0 5l3.6-1.4z" fill="currentColor" />
        </svg>
      </span>
    ));

  return (
    <div className="border-y border-line py-5 overflow-hidden" data-testid="marquee">
      <div className="fade-x flex w-max animate-marquee">
        <div className="flex">{row("a")}</div>
        <div className="flex" aria-hidden="true">{row("b")}</div>
      </div>
    </div>
  );
}
