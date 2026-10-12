import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Layers } from "lucide-react";
import CoinCard from "@/components/CoinCard";
import { useExplore, useRules, relayImg, fmtUsd, fmtSol, fmtNum, timeAgo, mainHref } from "@/lib/relay";

const EASE = [0.16, 1, 0.3, 1];

export default function CoinPage() {
  const { mint } = useParams();
  const { data: explore, isLoading } = useExplore();
  const { data: rulesData } = useRules(1);

  const card = (explore?.cards || []).find((c) => c.mint === mint || c.href?.endsWith(mint));
  const ruleSet = (rulesData?.cards || []).find((r) => r.href?.includes(mint));

  if (isLoading) {
    return <div className="max-w-[900px] mx-auto px-6 pt-32"><div className="border border-line rounded-2xl bg-panel h-72 animate-pulse" /></div>;
  }

  if (!card) {
    return (
      <div className="max-w-[900px] mx-auto px-6 lg:px-10 pt-32 pb-24 text-center">
        <p className="font-mono text-mint text-sm">coin not on the pad feed</p>
        <h1 className="mt-4 font-extrabold text-3xl">{mint?.slice(0, 8)}…{mint?.slice(-4)}</h1>
        <p className="mt-3 text-fog">This mint isn't in the relayed feed right now. It may be a fresh launch — check back in a minute.</p>
        <Link to="/explore" data-testid="coin-back" className="mt-6 inline-flex items-center gap-2 text-mint font-medium">
          <ArrowLeft size={15} /> back to explore
        </Link>
      </div>
    );
  }

  const stats = [
    { l: "Market cap", v: fmtUsd(card.marketCapUsd) },
    { l: "Volume", v: `${fmtSol(card.volumeSol)} SOL` },
    { l: "Trades", v: fmtNum(card.trades) },
    { l: "Launched", v: timeAgo(card.launchedAt) },
  ];

  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <Link to="/explore" data-testid="coin-back" className="inline-flex items-center gap-2 font-mono text-[11px] text-fog hover:text-mint transition-colors">
        <ArrowLeft size={14} /> explore
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="mt-6 flex flex-col sm:flex-row gap-6 items-start">
        {card.image && <img src={relayImg(card.image)} alt={card.name} className="w-28 h-28 rounded-2xl object-cover border border-line" />}
        <div className="min-w-0">
          <h1 className="font-extrabold tracking-[-0.03em] text-4xl">
            {card.name} <span className="text-mint font-mono text-xl">${card.ticker}</span>
          </h1>
          <p className="mt-2 text-fog leading-relaxed">{card.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(card.tags || []).map((t) => (
              <span key={t.code} className="font-mono text-[10px] px-2 py-0.5 rounded-md border"
                style={{ color: t.colour, borderColor: `${t.colour}55`, background: `${t.colour}12` }}>
                {t.code}
              </span>
            ))}
            {card.usesAi && <span className="font-mono text-[10px] px-2 py-0.5 rounded-md border border-bluc/40 text-bluc bg-bluc/10">USES AI</span>}
            {card.usesStocks && <span className="font-mono text-[10px] px-2 py-0.5 rounded-md border border-yel/40 text-yel bg-yel/10">STOCKS</span>}
          </div>
        </div>
      </motion.div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="coin-stats">
        {stats.map((s, i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 + i * 0.05, ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fog">{s.l}</div>
            <div className="mt-2 font-mono text-xl tabular text-[#161613]">{s.v}</div>
          </motion.div>
        ))}
      </div>

      {ruleSet && (
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE }}
          className="mt-8 border border-line rounded-2xl bg-panel p-6" data-testid="coin-rules">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-3 flex items-center gap-2">
            <Layers size={13} className="text-mint" /> its program · {(ruleSet.blocks || []).length} blocks
          </p>
          <p className="text-fog text-sm leading-relaxed">{ruleSet.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(ruleSet.tags || []).map((t) => (
              <span key={t.code} className="font-mono text-[10px] px-2 py-0.5 rounded-md border" style={{ color: t.colour, borderColor: `${t.colour}55` }}>
                {t.code}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {card.recentTrades?.length > 0 && (
        <div className="mt-8" data-testid="coin-trades">
          <h2 className="font-bold text-xl mb-3">Recent trades</h2>
          <div className="space-y-2">
            {card.recentTrades.map((t, i) => (
              <div key={i} className="flex items-center justify-between border border-line rounded-xl bg-panel px-4 py-2.5 font-mono text-[12px]">
                <span className={t.side === "buy" ? "text-mint" : "text-red-300"}>{t.side}</span>
                <span className="text-fog">{fmtSol(t.sol)} SOL</span>
                <span className="text-fog/70">{timeAgo(t.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to={`/builder?q=${encodeURIComponent(card.summary || "")}`} data-testid="coin-remix"
          className="inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#131311] font-bold px-6 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
          Remix with Bolt <Layers size={15} />
        </Link>
        <a href={mainHref(card.href)} target="_blank" rel="noopener noreferrer" data-testid="coin-trade"
          className="inline-flex items-center gap-2 rounded-xl border border-line hover:border-mint/40 font-medium px-6 py-3 transition-colors">
          Trade this coin
        </a>
      </div>
    </div>
  );
}
