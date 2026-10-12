import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import CoinCard from "@/components/CoinCard";
import { useExplore, useStocks } from "@/lib/relay";

const STOCK_RULE = "when the coin collects fees, put half into tokenized NVDA and buy my coin back with the rest";

const EASE = [0.16, 1, 0.3, 1];

const NAMES = {
  TSLA: "Tesla", NVDA: "NVIDIA", AAPL: "Apple", MSFT: "Microsoft", GOOGL: "Alphabet",
  AMZN: "Amazon", META: "Meta", NFLX: "Netflix", AMD: "AMD", MSTR: "MicroStrategy",
  COIN: "Coinbase", HOOD: "Robinhood", CRCL: "Circle", SPY: "S&P 500 ETF", QQQ: "Nasdaq 100 ETF",
};

export default function Stocks() {
  const { data } = useExplore();
  const { data: prices, isError: pricesError } = useStocks();
  const cards = (data?.cards || []).filter((c) => c.usesStocks);

  // live symbols straight from the relay (keys look like "TSLAx"); names are our labels
  const live = Object.entries(prices?.prices || {})
    .map(([k, v]) => ({ sym: k.replace(/x$/, ""), price: v }))
    .filter((s) => NAMES[s.sym]);
  const tiles = (live.length ? live : Object.keys(NAMES).map((sym) => ({ sym, price: null })))
    .sort((a, b) => a.sym.localeCompare(b.sym));

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">tokenized stocks</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          Coins that hold <span className="text-mint">the market.</span>
        </h1>
        <p className="mt-3 text-fog max-w-xl leading-relaxed">
          A coin can quote itself in PUMP rather than SOL — and its rules can spend the tip jar on
          tokenized shares. Two independent switches: use either, or both.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/builder?q=${encodeURIComponent(STOCK_RULE)}`} data-testid="stocks-deploy-button"
            className="inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#131311] font-bold px-6 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
            Launch a stock coin <ArrowUpRight size={16} />
          </Link>
          <Link to="/library?q=stock" data-testid="stocks-open-library"
            className="inline-flex items-center gap-2 rounded-xl border border-line hover:border-mint/40 font-medium px-6 py-3 transition-colors">
            Stock blocks in the library <ArrowUpRight size={16} />
          </Link>
        </div>
      </motion.div>

      <div className="mt-12" data-testid="stocks-grid">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog mb-3">
          {pricesError ? "live prices unavailable — showing the symbol list" : "live prices · relayed"}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {tiles.map((s, i) => (
            <motion.div
              key={s.sym}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3), ease: EASE }}
              className="border border-line rounded-xl bg-panel px-4 py-3.5 hover:border-yel/50 transition-colors"
              data-testid={`stock-tile-${s.sym}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-sm font-bold text-yel">{s.sym}</div>
                <div className="font-mono text-[12px] tabular text-[#161613]" data-testid={`stock-price-${s.sym}`}>
                  {s.price != null ? `$${s.price >= 100 ? Math.round(s.price) : s.price.toFixed(2)}` : "—"}
                </div>
              </div>
              <div className="text-[12px] text-fog mt-0.5 truncate">{NAMES[s.sym]}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <h2 className="mt-16 text-2xl lg:text-4xl font-bold tracking-tight">Coins stacking shares right now</h2>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="stocks-coins-grid">
        {cards.map((c, i) => (
          <CoinCard key={c.slug || i} coin={c} index={i} />
        ))}
        {cards.length === 0 && (
          <p className="text-fog font-mono text-sm">loading relayed coins…</p>
        )}
      </div>
    </div>
  );
}
