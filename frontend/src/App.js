import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import "@/App.css";
import Sidebar from "@/components/Sidebar";
import Home from "@/pages/Home";
import Builder from "@/pages/Builder";
import Explore from "@/pages/Explore";
import Scoreboard from "@/pages/Scoreboard";
import Library from "@/pages/Library";
import Recipes from "@/pages/Recipes";
import Stocks from "@/pages/Stocks";
import Flywheel from "@/pages/Flywheel";
import Rules from "@/pages/Rules";
import Live from "@/pages/Live";
import Paid from "@/pages/Paid";
import Stats from "@/pages/Stats";
import Docs from "@/pages/Docs";
import Updates from "@/pages/Updates";
import { Terms, Risks, Privacy } from "@/pages/Legal";
import Brand from "@/pages/Brand";
import CoinPage from "@/pages/CoinPage";
import Embed from "@/pages/Embed";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md border border-line rounded-2xl p-8 bg-panel">
            <p className="font-mono text-mint text-sm">something snapped</p>
            <p className="mt-2 text-fog">{this.state.error?.message || "unknown error"}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.4 });
    window.__lenis = lenis;
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-ink text-snow">
      <BrowserRouter>
        <ScrollToTop />
        <ErrorBoundary>
          <Sidebar />
          <main className="lg:pl-[264px]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/builder" element={<Builder />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/scoreboard" element={<Scoreboard />} />
              <Route path="/library" element={<Library />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/stocks" element={<Stocks />} />
              <Route path="/flywheel" element={<Flywheel />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/live" element={<Live />} />
              <Route path="/paid" element={<Paid />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/updates" element={<Updates />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/risks" element={<Risks />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/brand" element={<Brand />} />
              <Route path="/coin/:mint" element={<CoinPage />} />
              <Route path="/embed" element={<Embed />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
        </ErrorBoundary>
      </BrowserRouter>
    </div>
  );
}

export default App;
