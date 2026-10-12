import { useLive, useLaunches, timeAgo } from "@/lib/relay";

/** Live trade pulse — ONLY trades on coins launched through CodePad (our ledger), never the upstream pad's coins. */
export default function LiveTicker() {
  const { data } = useLive();
  const { data: launches } = useLaunches();
  const ours = new Set((launches?.launches || []).map((l) => String(l.mint).toLowerCase()));
  const items = (data?.items || []).filter((t) => ours.has(String(t.href || "").split("/c/")[1]?.toLowerCase())).slice(0, 12);
  const idle = "no trades on CodePad coins yet — launch one and its trades stream here";

  const row = (dup) =>
    (items.length ? items : [{}, {}]).map((t, i) => {
      const inner = (
        <>
          <span className="font-mono text-[12px] text-fog">{t.text || idle}</span>
          <span className="font-mono text-[11px] text-fog/50">{t.at ? timeAgo(t.at) : ""}</span>
        </>
      );
      const cls = "inline-flex items-center gap-2.5 pr-10 shrink-0";
      const dot = <span className="w-1 h-1 rounded-full bg-mint/60 shrink-0" />;
      return t.href ? (
        <a key={`${dup}-${i}`} href={t.href} className={`${cls} hover:text-mint transition-colors`} data-testid={`ticker-item-${dup}-${i}`}>
          {inner}{dot}
        </a>
      ) : (
        <span key={`${dup}-${i}`} className={cls}>{inner}{dot}</span>
      );
    });

  return (
    <div className="border-b border-line py-3.5 overflow-hidden bg-panel/40" data-testid="live-ticker">
      <div className="fade-x flex w-max animate-marquee">
        <div className="flex">{row("a")}</div>
        <div className="flex" aria-hidden="true">{row("b")}</div>
      </div>
    </div>
  );
}