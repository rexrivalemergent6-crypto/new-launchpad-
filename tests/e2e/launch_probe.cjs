// Proves upstream accepts our launch body — WITHOUT moving money (we never sign or send the returned tx).
// Run: cd /app/frontend && node /app/tests/e2e/launch_probe.cjs
const { Keypair } = require("@solana/web3.js");
const crypto = require("crypto");
const edSign = (msg, secretKey) => crypto.sign(null, Buffer.from(msg), crypto.createPrivateKey({
  key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.from(secretKey.slice(0, 32))]), format: "der", type: "pkcs8" }));

const API = "https://circuit-mirror-2.preview.emergentagent.com/api";
let cookie = "";
async function call(method, path, body) {
  const r = await fetch(API + path, {
    method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = r.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  let data; const t = await r.text(); try { data = JSON.parse(t); } catch { data = t.slice(0, 200); }
  return { status: r.status, data };
}
const kebab = (v) => String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

(async () => {
  const user = Keypair.generate();
  const wallet = user.publicKey.toBase58();
  const n = await call("POST", "/c/auth/nonce", { wallet });
  const sig = edSign(new TextEncoder().encode(n.data.message), user.secretKey);
  const v = await call("POST", "/c/auth/verify", { wallet, signature: Buffer.from(sig).toString("base64") });
  console.log("sign-in:", n.status, v.status, "| me:", (await call("GET", "/c/auth/me")).status);

  const comp = await call("POST", "/c/compile", { prompt: "when creator fees arrive, buy back my coin with 50% of them and burn it" });
  const program = comp.data.program;
  console.log("compile:", comp.status, program ? `program with ${program.scripts?.length} script(s)` : JSON.stringify(comp.data).slice(0, 160));

  const terms = await call("POST", "/c/launch/terms", { program, symbol: "ZZQ9" });
  console.log("terms:", terms.status, JSON.stringify(terms.data)); process.exit(0);

  const img = await fetch(API + "/c/images", { method: "POST", headers: { "content-type": "image/png", cookie }, body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
  const imageUrl = (await img.json()).url;
  console.log("image:", img.status, imageUrl);

  const pid = "probe-" + Date.now();
  const mintA = Keypair.generate().publicKey.toBase58();
  const old = await call("POST", `/c/projects/${pid}/launch`, { mint: mintA, program, prompt: "x", name: "Pad Test", symbol: "ZZQ9" });
  console.log("\nOLD body (v1)  ->", old.status, JSON.stringify(old.data).slice(0, 200));

  const mint = Keypair.generate().publicKey.toBase58();
  const body = {
    userWallet: wallet, mint, name: "Pad Test", symbol: "ZZQ9", description: "probe — never signed", imageUrl,
    devBuyLamports: "0", slug: kebab("ZZQ9"), program, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  const now = await call("POST", `/c/projects/${pid}-b/launch`, body);
  const d = now.data || {};
  console.log("NEW body (exact upstream) ->", now.status, d.txBase64 ? `txBase64 ${d.txBase64.length} chars, slug=${d.slug}, keys=${Object.keys(d).join(",")}` : JSON.stringify(d).slice(0, 300));
  console.log("(transaction NOT signed or sent — no money moved)");
})();
