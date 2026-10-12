import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { relayImg, fmtUsd, fmtSol, fmtNum, timeAgo } from "@/lib/relay";

export default function CoinCard({ coin, index = 0 }) {
  const tags = coin.tags || [];
  return (
    <motion.div
      role="link"
      tabIndex={0}
      onClick={(e) => { window.location.assign(`/c/${coin.mint || coin.slug}`); }}
      style={{ cursor: "pointer" }}
      data-testid={`coin-card-${coin.ticker || coin.slug}`}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
      className="group block border border-line bg-panel rounded-2xl overflow-hidden hover:border-mint/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_-18px_rgba(74,222,128,0.25)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-raise">
        {coin.image && (
          <img
            src={relayImg(coin.image)}
            alt={coin.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />
        {coin.usesAi && (
          <span className="absolute top-3 left-3 font-mono text-[10px] px-2 py-1 rounded-md bg-bluc/15 border border-bluc/40 text-[#A8C4F7]">
            USES AI
          </span>
        )}
        {coin.usesStocks && (
          <span className="absolute top-3 right-3 font-mono text-[10px] px-2 py-1 rounded-md bg-yel/10 border border-yel/40 text-yel">
            STOCKS
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-bold text-lg text-snow truncate">
            {coin.name} <span className="text-mint font-mono text-sm">${coin.ticker}</span>
          </h3>
          <span className="font-mono text-[11px] text-fog shrink-0">{timeAgo(coin.launchedAt)}</span>
        </div>

        <p className="mt-2 text-sm text-fog leading-relaxed line-clamp-2 h-10">{coin.summary}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[12px] tabular">
          <div>
            <div className="text-fog/70 text-[10px] uppercase tracking-wider">MC</div>
            <div className="text-snow">{fmtUsd(coin.marketCapUsd)}</div>
          </div>
          <div>
            <div className="text-fog/70 text-[10px] uppercase tracking-wider">Vol</div>
            <div className="text-snow">{fmtSol(coin.volumeSol)} SOL</div>
          </div>
          <div>
            <div className="text-fog/70 text-[10px] uppercase tracking-wider">Trades</div>
            <div className="text-snow">{fmtNum(coin.trades)}</div>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t.code}
                className="font-mono text-[10px] px-2 py-0.5 rounded-md border"
                style={{
                  color: t.colour,
                  borderColor: `${t.colour}55`,
                  background: `${t.colour}12`,
                }}
              >
                {t.code}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
