import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { cGet } from "@/lib/relay";
import { useWallet, signInWithWallet } from "@/lib/walletStore";
import { useQuery } from "@tanstack/react-query";

const EASE = [0.16, 1, 0.3, 1];

export default function MyCoins() {
  const { wallet, session, signingIn } = useWallet();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-coins", wallet],
    enabled: !!wallet && !!session,
    queryFn: () => cGet("coins"),
    refetchInterval: 45_000,
  });

  const coins = Array.isArray(data?.coins) ? data.coins : Array.isArray(data) ? data : (data?.cards || []);

  if (!wallet || !session) {
    return (
      <div className="max-w-[900px] mx-auto px-6 lg:px-10 pt-28 lg:pt-24 pb-24 text-center" data-testid="my-coins-page">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">my coins</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.2rem,5vw,3.8rem)]">Coins you launched.</h1>
        <p className="mt-3 text-fog max-w-md mx-auto">
          Connect the wallet you launch from and every coin it shipped through CodePad shows up here, live.
        </p>
        <button
          onClick={() => signInWithWallet()}
          disabled={signingIn}
          data-testid="my-coins-connect"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#0A0F16] font-bold px-7 py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(74,222,128,0.35)] disabled:opacity-50"
        >
          <Wallet size={17} /> {signingIn ? "Signing in…" : "Connect wallet"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24" data-testid="my-coins-page">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">my coins</p>
      <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.2rem,5vw,3.8rem)]">
        Coins you launched.
      </h1>
      <p className="mt-3 text-fog">
        Live from the pad for <span className="font-mono text-snow/90">{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>
      </p>

      {isLoading && (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => <div key={i} className="border border-line rounded-2xl bg-panel h-48 animate-pulse" />)}
        </div>
      )}

      {isError && (
        <div className="mt-10 border border-line rounded-2xl bg-panel p-8 text-fog" data-testid="my-coins-error">
          The pad didn’t answer for this wallet — it may not have launched anything yet.
        </div>
      )}

      {!isLoading && !coins.length && (
        <div className="mt-10 border border-line rounded-2xl bg-panel p-10 text-center" data-testid="my-coins-empty">
          <p className="text-fog">Nothing launched from this wallet yet.</p>
          <Link to="/builder?launch=1" data-testid="my-coins-first-launch" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-mint-bright hover:bg-mint text-[#0A0F16] font-bold px-6 py-3 transition-all">
            Launch your first coin
          </Link>
        </div>
      )}

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="my-coins-grid">
        {coins.map((c, i) => {
          const mint = c.mint || c.address || (c.url || "").split("/c/")[1];
          return (
            <motion.div key={mint || i} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
              className="border border-line rounded-2xl bg-panel p-6 hover:border-mint/35 transition-colors">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-lg truncate">{c.name || c.slug || "coin"}</h3>
                {c.ticker && <span className="font-mono text-sm text-mint">${c.ticker}</span>}
              </div>
              {c.summary && <p className="mt-2 text-sm text-fog line-clamp-2">{c.summary}</p>}
              {mint && (
                <Link to={`/c/${mint}`} data-testid={`my-coin-open-${i}`} className="mt-4 inline-flex text-sm text-mint hover:underline">
                  open its page →
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}