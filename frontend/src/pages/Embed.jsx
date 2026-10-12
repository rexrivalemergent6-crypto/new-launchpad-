import { useParams, useSearchParams } from "react-router-dom";
import { useExplore, useRules, relayImg, fmtUsd, fmtSol, fmtNum, mainHref } from "@/lib/relay";

export default function Embed() {
  const [params] = useSearchParams();
  const { mint: mintParam } = useParams();
  const mint = mintParam || params.get("mint");
  const { data: explore } = useExplore();
  const { data: rulesData } = useRules(1);

  const card = (explore?.cards || []).find((c) => c.mint === mint || c.href?.endsWith(mint || "___"));
  const ruleSet = (rulesData?.cards || []).find((r) => r.href?.includes(mint || "___"));

  return (
    <div className="p-4" data-testid="embed-widget">
      <div className="border border-line rounded-2xl bg-panel p-5 max-w-sm">
        <div className="flex items-center gap-3">
          {card?.image && <img src={relayImg(card.image)} alt={card?.name} className="w-12 h-12 rounded-xl object-cover" />}
          <div className="min-w-0">
            <div className="font-bold truncate">{card?.name ?? "CodePad coin"} <span className="text-mint font-mono text-xs">${card?.ticker ?? "···"}</span></div>
            <div className="font-mono text-[10px] text-fog truncate">{ruleSet ? `${ruleSet.blocks?.length ?? 0} blocks live` : "relayed live"}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px] tabular">
          <div>
            <div className="text-fog/70 text-[9px] uppercase">MC</div>
            <div className="text-snow">{fmtUsd(card?.marketCapUsd)}</div>
          </div>
          <div>
            <div className="text-fog/70 text-[9px] uppercase">Vol</div>
            <div className="text-snow">{fmtSol(card?.volumeSol)}</div>
          </div>
          <div>
            <div className="text-fog/70 text-[9px] uppercase">Trades</div>
            <div className="text-snow">{fmtNum(card?.trades)}</div>
          </div>
        </div>
        <a href={mainHref(card?.href || "/explore")} target="_blank" rel="noopener noreferrer" data-testid="embed-cta"
          className="mt-4 block text-center rounded-lg bg-mint-bright hover:bg-mint text-[#062B18] font-bold text-[12px] py-2 transition-colors">
          Trade on CodePad
        </a>
      </div>
    </div>
  );
}
