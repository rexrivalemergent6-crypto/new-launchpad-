import { useLive, timeAgo } from "@/lib/relay";

/** Live trade pulse band — same as the main pad's top ticker, relayed live. */
export default function LiveTicker() {
  const { data } = useLive();
  const items = (data?.items || []).slice(0, 12);

  const row = (dup) =>
    (items.length ? items : [{}, {}, {}, {}]).map((t, i) => {
      const inner = (
        <>
          <span className="font-mono text-[12px] text-fog">{t.text || "waiting for live trades…"}</span>
          <span className="font-mono text-[11px] text-fog/50">{t.at ? timeAgo(t.at) : "now"}</span>
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
      {!items.length && (
        <div className="px-6 font-mono text-[12px] text-fog/60">waiting for live trades…</div>
      )}
    </div>
  );
}