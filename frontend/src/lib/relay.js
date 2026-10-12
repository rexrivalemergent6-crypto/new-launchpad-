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

export const useStats = () =>
    useQuery({ queryKey: ["stats"], queryFn: () => get("stats"), refetchInterval: 45_000 });

export const useExplore = () =>
    useQuery({ queryKey: ["explore"], queryFn: () => get("explore"), refetchInterval: 60_000 });

export const useScoreboard = () =>
    useQuery({ queryKey: ["scoreboard"], queryFn: () => get("scoreboard"), refetchInterval: 60_000 });

export const fmtUsd = (n) => {
    if (n == null) return "—";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${Math.round(n)}`;
};

export const fmtNum = (n) => {
    if (n == null) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
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
