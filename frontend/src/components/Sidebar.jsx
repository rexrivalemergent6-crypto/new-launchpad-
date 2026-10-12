import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Wallet } from "lucide-react";
import { useStats } from "@/lib/relay";
import { useWallet, signInWithWallet } from "@/lib/walletStore";

export const Logo = ({ small }) => (
  <span className="inline-flex items-center gap-2.5 select-none">
    <svg width={small ? 26 : 30} height={small ? 26 : 30} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="24" y="11" width="16" height="12" rx="6" fill="#4ADE80" />
      <rect x="12" y="20" width="40" height="30" rx="9" fill="#4ADE80" />
      <circle cx="24.5" cy="35" r="3.2" fill="#0A0F16" />
      <circle cx="39.5" cy="35" r="3.2" fill="#0A0F16" />
      <rect x="27" y="42" width="10" height="3" rx="1.5" fill="#0A0F16" opacity="0.85" />
    </svg>
    <span className="font-extrabold tracking-tight" style={{ fontSize: small ? 20 : 23 }}>
      <span className="text-snow">Coin</span>
      <span className="text-mint">Pad</span>
    </span>
  </span>
);

const INTERNAL = [
  { label: "Builder", to: "/builder", tid: "nav-builder" },
  { label: "Explore", to: "/explore", tid: "nav-explore" },
  { label: "Scoreboard", to: "/scoreboard", tid: "nav-scoreboard" },
  { label: "Library", to: "/library", tid: "nav-library" },
  { label: "Recipes", to: "/recipes", tid: "nav-recipes" },
  { label: "Stocks", to: "/stocks", tid: "nav-stocks" },
  { label: "Flywheel", to: "/flywheel", tid: "nav-flywheel" },
];

function NavItems({ onPick }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-1">
      {INTERNAL.map((n) => {
        const active = pathname === n.to;
        return (
          <Link
            key={n.label}
            to={n.to}
            data-testid={n.tid}
            onClick={onPick}
            className={`px-5 py-3 rounded-xl text-[19px] transition-colors duration-200 ${
              active ? "bg-mint-deep text-mint" : "text-fog hover:text-snow hover:bg-white/5"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function RelayStatus() {
  const { isError } = useStats();
  return (
    <div className="flex items-center gap-2 px-5 font-mono text-[11px] text-fog" data-testid="relay-status">
      <span className={`w-1.5 h-1.5 rounded-full ${isError ? "bg-red-400" : "bg-mint animate-blink"}`} />
      {isError ? "relay offline" : "relay live"}
    </div>
  );
}

function WalletBox() {
  const { wallet, session, signingIn, connecting, error } = useWallet();
  const short = wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : null;

  return (
    <div className="space-y-2" data-testid="wallet-box">
      {!wallet ? (
        <button
          data-testid="connect-wallet-button"
          onClick={() => signInWithWallet()}
          disabled={signingIn || connecting}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-line bg-panel hover:border-mint/40 hover:text-mint text-fog font-semibold py-3 transition-all duration-200 disabled:opacity-50"
        >
          <Wallet size={16} />
          {signingIn || connecting ? "Signing in…" : "Connect wallet"}
        </button>
      ) : (
        <div className="w-full rounded-xl border border-mint/30 bg-mint-deep/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-mint" data-testid="wallet-address">{short}</span>
            <span className="font-mono text-[10px] text-fog" data-testid="wallet-session-state">
              {session ? "signed in" : "sign to launch"}
            </span>
          </div>
          {!session && !signingIn && (
            <button
              data-testid="sign-message-button"
              onClick={() => signInWithWallet()}
              className="mt-2 w-full rounded-lg border border-line text-fog hover:text-mint hover:border-mint/40 font-mono text-[11px] py-1.5 transition-colors"
            >
              sign message →
            </button>
          )}
          {signingIn && <p className="mt-2 font-mono text-[10px] text-fog">check your wallet…</p>}
        </div>
      )}
      {error && <p className="px-1 font-mono text-[10px] text-red-300 leading-relaxed" data-testid="wallet-error">{error}</p>}
    </div>
  );
}

function Panel({ onPick }) {
  return (
    <div className="h-full flex flex-col px-4 pb-6 pt-7 overflow-y-auto">
      <Link to="/" data-testid="nav-home" onClick={onPick} className="px-3 mb-8 shrink-0">
        <Logo />
      </Link>
      <div className="flex-1">
        <NavItems onPick={onPick} />
      </div>
      <div className="space-y-3 pt-4">
        <RelayStatus />
        <WalletBox />
        <Link
          to="/builder"
          data-testid="deploy-coin-button"
          onClick={onPick}
          className="block w-full rounded-xl bg-mint-bright hover:bg-mint text-[#062B18] text-center font-bold text-lg py-3.5 transition-all duration-200 hover:shadow-[0_0_36px_rgba(74,222,128,0.35)] active:scale-[0.98]"
        >
          Deploy a coin
        </Link>
        <p className="px-2 font-mono text-[10px] leading-relaxed text-fog/70">
          everything runs here — your wallet signs, CoinPad relays the rest
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[264px] border-r border-line bg-panel/60 z-40">
        <Panel />
      </aside>

      <header className="lg:hidden fixed top-0 inset-x-0 z-40 glass border-b border-line">
        <div className="flex items-center justify-between px-5 h-16">
          <Link to="/" data-testid="nav-home-mobile">
            <Logo small />
          </Link>
          <button
            data-testid="menu-toggle-button"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="w-11 h-11 rounded-xl border border-line bg-panel flex items-center justify-center text-snow"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 right-0 w-[300px] z-50 bg-[#0B1018] border-l border-line"
            >
              <Panel onPick={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
