import { Link } from "react-router-dom";
import XIcon from "@/components/XIcon";

const COLS = [
  {
    title: "Platform",
    items: [
      ["Builder", "/builder"],
      ["Quick launch", "/builder?launch=1"],
      ["Explore", "/explore"],
      ["Live", "/live"],
      ["Scoreboard", "/scoreboard"],
      ["Stats", "/stats"],
      ["Payout log", "/paid"],
      ["Model", "/flywheel"],
      ["Changelog", "/updates"],
      ["My coins", "/coins"],
      ["Brand", "/brand"],
    ],
  },
  {
    title: "Build with",
    items: [
      ["Examples", "/recipes"],
      ["Modules", "/library"],
      ["Buy stocks with fees", "/stocks"],
      ["Rules gallery", "/rules"],
      ["Embed", "/embed"],
    ],
  },
  {
    title: "Handbook",
    items: [
      ["Receipts", "/docs"],
      ["The vault", "/docs"],
      ["FAQ", "/docs"],
      ["Launching", "/docs"],
    ],
  },
  {
    title: "Legal",
    items: [
      ["Terms", "/terms"],
      ["Risks", "/risks"],
      ["Privacy", "/privacy"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-panel/40" data-testid="site-footer">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {COLS.map((c) => (
            <div key={c.title}>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog/70 mb-4">{c.title}</p>
              <div className="flex flex-col gap-2.5">
                {c.items.map(([label, to]) => (
                  <Link key={label + to} to={to} className="text-sm text-fog hover:text-mint transition-colors w-fit" data-testid={`footer-link-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[11px] text-fog/80">
            © 2026 CodePad — a launchpad where you program your coin with blocks. Money in the builder is pretend; on a launched coin the rules run for real, with its own fees. Nothing here is financial advice.
          </p>
          <div className="flex items-center gap-4 font-mono text-[11px] text-fog">
            <span className="tabular" data-testid="footer-utc-clock">{new Date().toISOString().slice(11, 19)} UTC</span>
            <a href="https://x.com/usecodepad" target="_blank" rel="noopener noreferrer" data-testid="footer-x-link" className="hover:text-mint transition-colors inline-flex items-center gap-1.5">
              <XIcon size={12} /> CodePad ↗
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}