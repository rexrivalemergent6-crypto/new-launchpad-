// Templates = upstream rule sets, shown under our own branding.
// Original coin name / ticker / image are never shown: the name is "Template", the ticker is
// made up (stable per slug), and the picture is the CodePad mark.
import { cPost } from "@/lib/relay";

export const TEMPLATE_NAME = "Template";

const KIND_LABEL = {
  buyback: "buyback", burn: "burn", holders: "holders", ai: "AI", characters: "characters", stocks: "stocks",
  web: "web", posts: "posts", trades: "trades", fees: "fees", button: "button",
};

/** "Template · buyback" — flavour from the card's kinds, never the coin's name */
export function templateTitle(card) {
  const k = (card?.kinds || [])[0];
  return k ? `${TEMPLATE_NAME} · ${KIND_LABEL[k] || k}` : TEMPLATE_NAME;
}

/** deterministic made-up ticker, e.g. "TK7Q" — 4 chars, letters first, valid for pump.fun (A-Z0-9, ≤10) */
export function makeTicker(slug) {
  let h = 2166136261;
  const s = String(slug || "template");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "T" + L[h % L.length];
  h = Math.floor(h / L.length);
  for (let i = 0; i < 2; i++) { out += A[h % A.length]; h = Math.floor(h / A.length); }
  return out;
}

/** same mark as Sidebar's CodePadMark, on our ink background so it reads on any coin page */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3FE87F"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs>
<rect width="64" height="64" fill="#0A0F16"/>
<rect x="9" y="9" width="46" height="46" rx="13" fill="none" stroke="url(#g)" stroke-width="4.5"/>
<path d="M22 24l10 8-10 8" stroke="url(#g)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<circle cx="41.5" cy="23.5" r="4.2" fill="#38BDF8"/>
<rect x="33" y="39.5" width="15" height="4.6" rx="2.3" fill="url(#g)"/>
</svg>`;

/** render the logo to a 512px PNG blob (browser canvas) */
export function logoPngBlob() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 512;
      c.getContext("2d").drawImage(img, 0, 0, 512, 512);
      c.toBlob((b) => (b ? resolve(b) : reject(Error("could not draw the logo"))), "image/png");
    };
    img.onerror = () => reject(Error("could not draw the logo"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(LOGO_SVG);
  });
}

/** upload the logo the same way the upstream builder uploads a coin picture: POST /api/images (raw body) -> {url} */
export async function uploadLogo() {
  const blob = await logoPngBlob();
  const d = await cPost("images", blob, { "content-type": "image/png" });
  if (!d?.url) throw Error(d?.error || "image upload gave no url");
  return d.url;
}
