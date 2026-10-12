import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAIN = process.env.REACT_APP_MAIN_SITE_URL;

export const MAIN_BUILDER = `${MAIN}/build?template=blank`;
export const MAIN_START = `${MAIN}/start`;
export const mainHref = (p) => `${MAIN}${p}`;

export const relayImg = (url) => {
    if (!url) return null;
    const hash = url.split("/api/img/")[1];
    return hash ? `${API}/relay/img/${hash}` : url;
};

const get = (p) => axios.get(`${API}/relay/${p}`).then((r) => r.data);
export const relayGet = get;

export const useStats = () =>
    useQuery({ queryKey: ["stats"], queryFn: () => get("stats"), refetchInterval: 45_000 });

export const useExplore = () =>
    useQuery({ queryKey: ["explore"], queryFn: () => get("explore"), refetchInterval: 60_000 });

export const useScoreboard = () =>
    useQuery({ queryKey: ["scoreboard"], queryFn: () => get("scoreboard"), refetchInterval: 60_000 });

export const useStocks = () =>
    useQuery({ queryKey: ["stocks"], queryFn: () => get("stocks"), refetchInterval: 60_000 });

export const useRules = (page = 1) =>
    useQuery({ queryKey: ["rules", page], queryFn: () => get(`rules?page=${page}`) });

export const useLive = () =>
    useQuery({ queryKey: ["live"], queryFn: () => get("live"), refetchInterval: 15_000 });

export const useLaunches = () =>
    useQuery({ queryKey: ["launches"], queryFn: () => axios.get(`${API}/portal/launches`).then((r) => r.data), refetchInterval: 30_000 });

/** Full Circuit block library, relayed + parsed by our backend (/api/relay/library). */
export const useLibrary = () =>
    useQuery({ queryKey: ["library"], queryFn: () => get("library"), staleTime: 10 * 60_000, retry: 1 });

/* ---- session relay (full wrapper: all actions go through our backend) ---- */

export const aiPassword = {
    get: () => {
        try { return localStorage.getItem("circuit:ai-password") ?? ""; } catch { return ""; }
    },
    set: (v) => {
        try { localStorage.setItem("circuit:ai-password", v); } catch {}
    },
};

const c = axios.create({ baseURL: `${API}/c`, withCredentials: true });

export const cGet = (p) => c.get(p).then((r) => r.data).catch((e) => { throw e; });

export const cPost = (p, body, extraHeaders = {}) =>
    c.post(p, body, { headers: { "x-circuit-password": aiPassword.get(), ...extraHeaders } })
        .then((r) => r.data)
        .catch((e) => {
            const err = new Error(e?.response?.data?.error || e?.message || "relay error");
            err.status = e?.response?.status;
            err.data = e?.response?.data;
            throw err;
        });

export const fmtUsd = (n) => {
    if (n == null) return "—";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${Math.round(n)}`;
};

export const fmtNum = (n) => {
    if (n == null) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
    return `${Math.round(n)}`;
};

export const fmtSol = (n) => (n == null ? "—" : `${n >= 100 ? Math.round(n) : n.toFixed(2)}`.replace(/\.00$/, ""));

export const timeAgo = (ts) => {
    const s = Math.max(1, (Date.now() - ts) / 1000);
    if (s < 60) return `${Math.floor(s)}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
};

/** CodePad's OWN numbers: coins launched through our portal (ledger) joined with their live explore cards.
 *  Never upstream's platform totals or its flagship coin — zeros are honest until our first launch. */
export const useOurLedger = () => {
    const { data: launches, isLoading: l1 } = useLaunches();
    const { data: explore, isLoading: l2 } = useExplore();
    const ledger = launches?.launches || [];
    const byMint = new Map((explore?.cards || []).map((c) => [String(c.mint || "").toLowerCase(), c]));
    const coins = ledger.map((l) => ({ ...l, card: byMint.get(String(l.mint).toLowerCase()) || null }));
    const newest = [...coins].sort((a, b) => (b.at || 0) - (a.at || 0))[0] || null;
    return {
        isLoading: l1 || l2,
        count: ledger.length,
        coins,
        newest,
        volumeSol: coins.reduce((s, c) => s + (Number(c.card?.volumeSol) || 0), 0),
        trades: coins.reduce((s, c) => s + (Number(c.card?.trades) || 0), 0),
        live: coins.filter((c) => c.card).length,
    };
};
