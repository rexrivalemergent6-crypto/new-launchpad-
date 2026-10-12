import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import CoinCard from "@/components/CoinCard";
import { useExplore } from "@/lib/relay";

const STOCK_RULE = "when creator fees arrive, buy tokenized NVDA with 50% of them and buy my coin back with the rest";

const EASE = [0.16, 1, 0.3, 1];

const STOCKS = [
  { sym: "TSLA", name: "Tesla" }, { sym: "NVDA", name: "NVIDIA" }, { sym: "AAPL", name: "Apple" },
  { sym: "MSFT", name: "Microsoft" }, { sym: "GOOGL", name: "Alphabet" }, { sym: "AMZN", name: "Amazon" },
  { sym: "META", name: "Meta" }, { sym: "NFLX", name: "Netflix" }, { sym: "AMD", name: "AMD" },
  { sym: "MSTR", name: "MicroStrategy" }, { sym: "COIN", name: "Coinbase" }, { sym: "HOOD", name: "Robinhood" },
  { sym: "CRCL", name: "Circle" }, { sym: "SPY", name: "S&P 500 ETF" }, { sym: "QQQ", name: "Nasdaq 100 ETF" },
];

export default function Stocks() {
  const { data } = useExplore();
  const cards = (data?.cards || []).filter((c) => c.usesStocks);

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">tokenized stocks</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">
          Coins that hold <span className="text-mint">the market.</span>
        </h1>
        <p className="mt-3 text-fog max-w-xl leading-relaxed">
          Your coin can be priced in PUMP instead of SOL, and its rules can buy tokenized stocks with its
          creator fees. They are two different things, and you can use either or both.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/builder?q=${encodeURIComponent(STOCK_RULE)}`} data-testid="stocks-deploy-button"
            className="inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] font-bold px-6 py-3 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]">
            Launch a stock coin <ArrowUpRight size={16} />
          </Link>
          <Link to="/library?q=stock" data-testid="stocks-open-library"
            className="inline-flex items-center gap-2 rounded-xl border border-line hover:border-mint/40 font-medium px-6 py-3 transition-colors">
            Stock blocks in the library <ArrowUpRight size={16} />
          </Link>
        </div>
      </motion.div>

      <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="stocks-grid">
        {STOCKS.map((s, i) => (
          <motion.div
            key={s.sym}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3), ease: EASE }}
            className="border border-line rounded-xl bg-panel px-4 py-3.5 hover:border-yel/50 transition-colors"
            data-testid={`stock-tile-${s.sym}`}
          >
            <div className="font-mono text-sm font-bold text-yel">{s.sym}</div>
            <div className="text-[12px] text-fog mt-0.5 truncate">{s.name}</div>
          </motion.div>
        ))}
      </div>

      <h2 className="mt-16 text-2xl lg:text-4xl font-bold tracking-tight">Coins buying stocks with fees</h2>
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
