import { useSyncExternalStore } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

let state = {
    wallet: null,
    session: null,
    signingIn: false,
    connecting: false,
    error: null,
    checked: false,
};

const subs = new Set();

export const walletStore = {
    get: () => state,
    set: (patch) => {
        state = { ...state, ...patch };
        subs.forEach((f) => f());
    },
    subscribe: (f) => {
        subs.add(f);
        return () => subs.delete(f);
    },
};

export const useWallet = () => useSyncExternalStore(walletStore.subscribe, walletStore.get);

export const getProvider = () =>
    (window.phantom && window.phantom.solana) || window.solana || null;

export async function connectWallet() {
    const p = getProvider();
    if (!p) {
        walletStore.set({ error: "No Solana wallet found — install Phantom (phantom.com) and reload." });
        return null;
    }
    walletStore.set({ connecting: true, error: null });
    try {
        const res = await p.connect();
        const wallet = (res && res.publicKey ? res.publicKey : p.publicKey)?.toString();
        walletStore.set({ provider: p, wallet, connecting: false });
        return wallet;
    } catch (e) {
        walletStore.set({ connecting: false, error: e?.message || "Wallet connect was rejected." });
        return null;
    }
}

const toB64 = (bytes) => {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
};

export async function signInWithWallet() {
    try {
        let wallet = walletStore.get().wallet;
        if (!wallet) {
            wallet = await connectWallet();
            if (!wallet) return null;
        }
        const provider = walletStore.get().provider;
        walletStore.set({ signingIn: true, error: null });

        const nonceRes = await axios.post(`${API}/c/auth/nonce`, { wallet });
        const message = nonceRes.data?.message;
        if (!message) throw Error("Could not get a sign-in message from the relay.");

        const encoded = new TextEncoder().encode(message);
        const out = await provider.signMessage(encoded, "utf8");
        const sig = out instanceof Uint8Array ? out : out.signature;

        await axios.post(`${API}/c/auth/verify`, { wallet, signature: toB64(sig) }, { withCredentials: true });
        await refreshMe();
        walletStore.set({ signingIn: false });
        return wallet;
    } catch (e) {
        walletStore.set({ signingIn: false, error: e?.response?.data?.error || e?.message || "Sign-in failed." });
        return null;
    }
}

export async function refreshMe() {
    try {
        const r = await axios.get(`${API}/c/auth/me`, { withCredentials: true });
        walletStore.set({ session: r.status === 200 ? r.data : null, checked: true });
    } catch {
        walletStore.set({ session: null, checked: true });
    }
}

/** Ask the connected Phantom to sign a Solana VersionedTransaction. */
export async function signTransaction(tx) {
    const p = getProvider();
    if (!p || !p.signTransaction) throw Error("No wallet that can sign transactions — install Phantom (phantom.com) and reload.");
    let wallet = walletStore.get().wallet;
    if (!wallet) wallet = await connectWallet();
    if (!wallet) throw Error("Connect your wallet first.");
    return p.signTransaction(tx);
}
