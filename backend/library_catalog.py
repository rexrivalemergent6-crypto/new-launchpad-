"""Block library catalog for the CoinPad relay.

Live source: upstream /modules page (server-rendered HTML: every runtime module card
lists every block with its label and tooltip). Static source: data/block_catalog.json,
a verbatim snapshot of the upstream builder's ALL_BLOCKS spec (category, shape,
fields, dropdown options, tooltips). Live data is merged onto the snapshot so new or
changed upstream blocks show up without a redeploy, and the page still works if the
upstream is unreachable.
"""
import html as _html
import json
import re
from pathlib import Path

SNAPSHOT_PATH = Path(__file__).parent / "data" / "block_catalog.json"

MODULE_IDS = {
    "core": "core", "solana": "solana", "ai": "ai", "browser": "browser", "website": "website",
    "finance": "finance", "bounties": "bounties", "social": "social", "your modules": "custom",
}
# where a brand-new live block goes if the snapshot has never seen it
MODULE_DEFAULT_CATEGORY = {
    "core": "control", "solana": "events", "ai": "ai", "browser": "web", "website": "world",
    "finance": "finance", "bounties": "bounties", "social": "output", "custom": "modules",
}

_SNAPSHOT = None


def snapshot() -> dict:
    global _SNAPSHOT
    if _SNAPSHOT is None:
        _SNAPSHOT = json.loads(SNAPSHOT_PATH.read_text())
    return _SNAPSHOT


def _text(fragment: str) -> str:
    fragment = re.sub(r"<!--.*?-->", "", fragment, flags=re.S)
    return _html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def _cards(section: str) -> list[str]:
    parts = section.split('<div class="tb-card')
    return parts[1:]


def _card_head(card: str):
    code = re.search(r'font-extrabold shadow-\[[^\]]*\]" style="[^"]*?background:(#[0-9A-Fa-f]{3,8})[^"]*">([^<]+)</span>', card)
    name = re.search(r'tracking-\[-0\.02em\]">(.*?)</div>', card, flags=re.S)
    desc = re.search(r'font-semibold text-mute">(.*?)</div>', card, flags=re.S)
    return (
        _text(code.group(2)) if code else "",
        code.group(1) if code else None,
        _text(name.group(1)) if name else "",
        _text(desc.group(1)) if desc else "",
    )


def parse_modules_html(page: str) -> dict:
    """Parse upstream /modules HTML into families + runtime modules with blocks."""
    out = {"families": [], "modules": []}
    i_fam = page.find("Anything can become a block.")
    i_sug = page.find("Suggest a block")
    i_real = page.find("Every module, and how it runs.")
    i_create = page.find("Create a module", i_real if i_real > 0 else 0)
    if i_fam < 0 or i_real < 0:
        raise ValueError("modules page layout changed")

    for card in _cards(page[i_fam:i_sug if i_sug > i_fam else i_real]):
        code, colour, name, desc = _card_head(card)
        chips = [_text(c) for c in re.findall(r'<span class="whitespace-nowrap rounded-full[^"]*">(.*?)</span>', card, flags=re.S)]
        if code and name:
            out["families"].append({"code": code, "colour": colour, "name": name, "desc": desc, "chips": chips})

    for card in _cards(page[i_real:i_create if i_create > i_real else len(page)]):
        code, colour, name, desc = _card_head(card)
        if not name:
            continue
        spans = re.findall(r'<span class="rounded-full border-2 ([^"]*)">(.*?)</span>', card, flags=re.S)
        real, chips = "", []
        for cls, inner in spans:
            if "text-[11px]" in cls:
                real = _text(inner)
            else:
                chips.append(_text(inner))
        note = re.search(r'<p class="m-0 px-\[22px\] pb-4[^"]*">(.*?)</p>', card, flags=re.S)
        sections = []
        for head, ul in re.findall(r'<p class="mb-1\.5[^"]*">(.*?)</p><ul[^>]*>(.*?)</ul>', card, flags=re.S):
            kind = _text(head).split("·")[0].strip()
            blocks = [{"label": _text(lbl), "tooltip": _html.unescape(tt)}
                      for tt, lbl in re.findall(r'<li[^>]*title="([^"]*)"[^>]*>(.*?)</li>', ul, flags=re.S)]
            sections.append({"kind": kind, "blocks": blocks})
        out["modules"].append({
            "id": MODULE_IDS.get(name.lower(), name.lower().replace(" ", "_")),
            "code": code, "colour": colour, "name": name, "summary": desc, "real": real,
            "chips": chips, "note": _text(note.group(1)) if note else "", "sections": sections,
        })
    if not out["modules"]:
        raise ValueError("no module cards found")
    return out


SNAPSHOT_FAMILIES = [
    {"code": "EV", "name": "Events", "desc": "When things happen on your coin.", "chips": ["trades", "volume", "holders", "time"]},
    {"code": "LG", "name": "Logic", "desc": "Decide what happens next.", "chips": ["if", "repeat", "wait", "chance"]},
    {"code": "CT", "name": "Checks", "desc": "Yes-or-no questions for your ifs.", "chips": ["compare", "and / or", "chance"]},
    {"code": "AG", "name": "Agents", "desc": "Characters that live in your world.", "chips": ["create", "memory", "tools"]},
    {"code": "AI", "name": "AI", "desc": "Names, words and decisions.", "chips": ["ask", "write", "decide"]},
    {"code": "MD", "name": "Media", "desc": "Pictures and cards.", "chips": ["image", "card", "avatar"]},
    {"code": "WB", "name": "Web", "desc": "Talk to the rest of the internet.", "chips": ["search", "pages", "API"]},
    {"code": "WD", "name": "Worlds", "desc": "A place for everything to live.", "chips": ["feed", "counters", "entities"]},
    {"code": "FN", "name": "Money", "desc": "Send, buy back, burn and airdrop from the coin's vault.", "chips": ["send", "buy back", "airdrop"]},
    {"code": "BT", "name": "Bounties", "desc": "Reward people for doing things.", "chips": ["create", "judge", "pay"]},
    {"code": "OP", "name": "Social", "desc": "Post where your holders are.", "chips": ["post", "webhook", "email"]},
    {"code": "DT", "name": "Data", "desc": "Lists, randomness and numbers.", "chips": ["random", "lists", "math"]},
    {"code": "ST", "name": "State", "desc": "Remember things between runs.", "chips": ["set", "change", "read"]},
    {"code": "MO", "name": "Your modules", "desc": "Modules you declare: events that arrive as webhooks, values you read, actions you send. No code.", "chips": []},
]

SNAPSHOT_MODULES = [
    {"id": "core", "code": "EV", "name": "Core", "summary": "Control flow, logic, maths, lists and variables. The language itself.", "real": "Real: part of the interpreter", "note": ""},
    {"id": "solana", "code": "EV", "name": "Solana", "summary": "Token events (trades, volume, holders, fees) and wallet reads.", "real": "Real on a launched coin · pretend in the builder", "note": "Real trades, holders and fees on a launched coin. In the builder the Buy, Sell and +10 SOL buttons make pretend events."},
    {"id": "ai", "code": "EV", "name": "AI", "summary": "Agents, ask/choose/classify/summarize, identities, generated text and images.", "real": "Real on a launched coin · pretend in the builder", "note": "Paid from the coin's own fees; a coin with no AI credit skips AI. Images need this site's image service."},
    {"id": "browser", "code": "WB", "name": "Browser", "summary": "Web search, opening pages, extracting text, following links, HTTP.", "real": "Real on a launched coin · pretend in the builder", "note": "Pages and HTTP calls are real on live coins, through a safe fetcher that only reaches public websites. Search needs this site's search service; a live coin never gets made-up results."},
    {"id": "website", "code": "EV", "name": "Website", "summary": "Project world: entities, collections, feed, counters, site state and events.", "real": "Real: state kept in this project", "note": ""},
    {"id": "finance", "code": "FN", "name": "Finance", "summary": "The coin's money: send, buy back, sell, burn, airdrop to holders, and named tallies.", "real": "Real on a launched coin · pretend in the builder", "note": "Real on a launched coin: its own vault does it, inside limits that grow with the fees it has earned. Pretend in the builder."},
    {"id": "bounties", "code": "EV", "name": "Bounties", "summary": "Bounties, submissions, AI review, approval and rewards.", "real": "Real: state kept in this project", "note": "Rewards are real payments from the coin's fees on a launched coin and are pretend in the builder. Anyone can send an entry on the coin's page."},
    {"id": "social", "code": "OP", "name": "Social", "summary": "Webhooks in and out, posts to X / Discord / Telegram, email.", "real": "Real on a launched coin · pretend in the builder", "note": "Webhooks in and out are real on a live coin. Posts to X, Discord and Telegram, and email, are sent for real once what they need is set up under Connections; a coin can't launch without it. Pretend in the builder."},
    {"id": "custom", "code": "MO", "name": "Your modules", "summary": "Modules you declare: events that arrive as webhooks, values you read, actions you send. No code.", "real": "Real: declared by you, no code", "note": "Run through the safe web fetcher on live coins and pretend in the builder. Saved inside the coin's rules, so a locked coin never changes."},
]

_KIND = {"hat": "EVENTS", "statement": "ACTIONS", "terminal": "ACTIONS", "reporter": "VALUES", "boolean": "VALUES"}


def build_catalog(live: dict | None) -> dict:
    snap = snapshot()
    blocks = [dict(b) for b in snap["blocks"]]
    for b in blocks:
        b["kind"] = _KIND.get(b["shape"], "ACTIONS")
        b["live"] = False

    modules = [dict(m) for m in SNAPSHOT_MODULES]
    families = [dict(f) for f in SNAPSHOT_FAMILIES]
    added = 0
    if live:
        families = live["families"] or families
        modules = []
        by_key: dict = {}
        for b in blocks:
            by_key.setdefault((b["module"], b["label"]), []).append(b)
        for m in live["modules"]:
            modules.append({k: m[k] for k in ("id", "code", "colour", "name", "summary", "real", "note", "chips")})
            for sec in m["sections"]:
                for lb in sec["blocks"]:
                    cands = by_key.get((m["id"], lb["label"]), [])
                    hit = next((c for c in cands if c["tooltip"] == lb["tooltip"] and not c["live"]), None) \
                        or next((c for c in cands if not c["live"]), None)
                    if hit:
                        hit["tooltip"] = lb["tooltip"] or hit["tooltip"]
                        hit["live"] = True
                    else:
                        added += 1
                        blocks.append({
                            "type": f"live_{m['id']}_{added}", "ir": None,
                            "category": MODULE_DEFAULT_CATEGORY.get(m["id"], "modules"),
                            "module": m["id"], "shape": {"EVENTS": "hat", "VALUES": "reporter"}.get(sec["kind"], "statement"),
                            "kind": sec["kind"], "label": lb["label"],
                            "sentence": re.sub(r"\s+", " ", re.sub(r"\[([^\]]+)\]|\(\s*\)", lambda x: x.group(1) or "", lb["label"])).strip(),
                            "rows": [], "tooltip": lb["tooltip"], "simulated": False, "gate": None,
                            "output": None, "eventOutputs": None, "live": True, "new": True,
                        })
    fam_by_code = {f["code"]: f for f in families}
    categories = []
    for c in snap["categories"]:
        n = sum(1 for b in blocks if b["category"] == c["id"])
        f = fam_by_code.get(c["code"], {})
        categories.append({**c, "desc": f.get("desc") or c["blurb"], "chips": f.get("chips", []), "count": n})
    for m in modules:
        m["count"] = sum(1 for b in blocks if b["module"] == m["id"])
    return {
        "source": "live" if live else "snapshot",
        "total": len(blocks),
        "newFromUpstream": added,
        "categories": categories,
        "families": families,
        "modules": modules,
        "blocks": blocks,
    }
