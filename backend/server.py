import os
import time
import json
import uuid
import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

import library_catalog

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPSTREAM = os.environ['UPSTREAM_BASE_URL'].rstrip('/')
_mongo = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = _mongo[os.environ['DB_NAME']]

app = FastAPI(title="CodePad Relay")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("relay")

_shared: httpx.AsyncClient | None = None


def client() -> httpx.AsyncClient:
    global _shared
    if _shared is None:
        _shared = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers={"User-Agent": "Mozilla/5.0 (CoinPad relay)"},
            follow_redirects=True,
        )
    return _shared


_CACHE: dict = {}


def cache_get(key: str, ttl: int):
    hit = _CACHE.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    return None


def cache_set(key: str, value, ttl: int):
    _CACHE[key] = (time.time() + ttl, value)


TTL_JSON = 20
TTL_IMG = 300

# sid -> httpx.Cookies holding the upstream circuit.dev session
SESSIONS: dict = {}


async def upstream(path: str, params: dict | None = None) -> httpx.Response:
    url = f"{UPSTREAM}/{path}"
    return await client().get(url, params=params)


def json_response(r: httpx.Response) -> Response:
    return Response(content=r.content, media_type=r.headers.get("content-type", "application/json"),
                    status_code=r.status_code)


@api_router.get("/health")
async def health():
    try:
        r = await upstream("api/stats")
        return {"ok": True, "upstream": UPSTREAM, "upstreamStatus": r.status_code}
    except Exception as e:
        return {"ok": False, "upstream": UPSTREAM, "error": str(e)}


# ---------------- public data relay (cached) ----------------

@api_router.get("/relay/stats")
async def relay_stats():
    cached = cache_get("stats", TTL_JSON)
    if cached:
        return Response(content=cached[0], media_type="application/json")
    r = await upstream("api/stats")
    cache_set("stats", (r.content,), TTL_JSON)
    return json_response(r)


OFFICIAL_MINT_PREFIX = "EcZndA"


def is_pad_coin(card: dict) -> bool:
    """Only coins actually launched through the pad — no platform entries, no other-brand coins."""
    if not card.get("mint"):
        return False
    if str(card.get("mint", "")).startswith(OFFICIAL_MINT_PREFIX):
        return False
    slug = str(card.get("slug", "")).lower()
    if slug in ("circuit", "circuit-coin", "official"):
        return False
    blob = f"{card.get('name', '')} {card.get('ticker', '')}".lower()
    if "circuit" in blob:
        return False
    return bool(card.get("state"))


def brand_clean_list(items: list) -> list:
    out = []
    for it in items or []:
        blob = f"{it.get('name', '')} {it.get('ticker', '')}".lower()
        if "circuit" in blob:
            continue
        out.append(it)
    return out


@api_router.get("/relay/explore")
async def relay_explore(request: Request):
    params = dict(request.query_params)
    key = "explore:" + str(sorted(params.items()))
    cached = cache_get(key, TTL_JSON)
    if cached:
        return Response(content=cached[0], media_type="application/json")
    r = await upstream("api/explore", params)
    if r.status_code == 200:
        try:
            data = r.json()
            data["cards"] = [c for c in data.get("cards", []) if is_pad_coin(c)]
            content = json.dumps(data).encode()
        except Exception:
            content = r.content
    else:
        content = r.content
    cache_set(key, (content,), TTL_JSON)
    return Response(content=content, media_type="application/json", status_code=r.status_code)
@api_router.get("/relay/stocks")
async def relay_stocks():
    cached = cache_get("stocks", 60)
    if cached:
        return Response(content=cached[0], media_type="application/json")
    r = await upstream("api/stocks/prices")
    cache_set("stocks", (r.content,), 60)
    return json_response(r)


@api_router.get("/portal/launches")
async def portal_launches():
    items = []
    async for doc in db.launches.find().sort("at", -1).limit(200):
        items.append({"mint": doc.get("mint"), "url": doc.get("url"), "at": doc.get("at")})
    return {"launches": items, "count": len(items)}


@api_router.get("/relay/rules")
async def relay_rules(request: Request):
    params = dict(request.query_params)
    r = await upstream("api/rules", params)
    content = r.content
    if r.status_code == 200:
        try:
            data = r.json()
            data["cards"] = brand_clean_list(data.get("cards", []))
            content = json.dumps(data).encode()
        except Exception:
            pass
    return Response(content=content, media_type="application/json", status_code=r.status_code)


@api_router.get("/relay/live")
async def relay_live():
    cached = cache_get("live", 10)
    if cached:
        return Response(content=cached[0], media_type="application/json")
    r = await upstream("api/activity")
    cache_set("live", (r.content,), 10)
    return json_response(r)


@api_router.get("/relay/scoreboard")
async def relay_scoreboard():
    cached = cache_get("scoreboard", TTL_JSON)
    if cached:
        return Response(content=cached[0], media_type="application/json")
    r = await upstream("api/scoreboard")
    content = r.content
    if r.status_code == 200:
        try:
            data = r.json()
            if isinstance(data.get("lists"), dict):
                data["lists"] = {k: brand_clean_list(v) for k, v in data["lists"].items()}
                content = json.dumps(data).encode()
        except Exception:
            pass
    cache_set("scoreboard", (content,), TTL_JSON)
    return Response(content=content, media_type="application/json", status_code=r.status_code)


@api_router.get("/relay/img/{image_id}")
async def relay_img(image_id: str):
    key = f"img:{image_id}"
    cached = cache_get(key, TTL_IMG)
    if cached:
        return Response(content=cached[0], media_type=cached[1],
                        headers={"Cache-Control": "public, max-age=300"})
    r = await upstream(f"api/img/{image_id}")
    if r.status_code != 200:
        return Response(content=r.content, media_type=r.headers.get("content-type", "text/plain"),
                        status_code=r.status_code)
    ctype = r.headers.get("content-type", "image/jpeg")
    cache_set(key, (r.content, ctype), TTL_IMG)
    return Response(content=r.content, media_type=ctype,
                    headers={"Cache-Control": "public, max-age=300"})


TTL_LIBRARY = 600
_LIBRARY_LAST_LIVE: dict = {}


@api_router.get("/relay/library")
async def relay_library():
    """Every block in the Circuit block library: live from upstream /modules, merged
    onto a verbatim snapshot of the builder's block spec (fallback if upstream is down)."""
    cached = cache_get("library", TTL_LIBRARY)
    if cached:
        return cached
    live = None
    try:
        r = await upstream("modules")
        if r.status_code == 200:
            live = library_catalog.parse_modules_html(r.text)
    except Exception as e:
        logger.warning(f"library live fetch/parse failed: {e}")
    if live is None and _LIBRARY_LAST_LIVE.get("v"):
        live = _LIBRARY_LAST_LIVE["v"]
    elif live is not None:
        _LIBRARY_LAST_LIVE["v"] = live
    catalog = library_catalog.build_catalog(live)
    catalog["fetchedAt"] = int(time.time() * 1000)
    cache_set("library", catalog, TTL_LIBRARY if live else 60)
    return catalog


@api_router.get("/relay/{path:path}")
async def relay_generic(path: str, request: Request):
    params = dict(request.query_params)
    r = await upstream(path, params)
    return json_response(r)


# ---------------- session relay (full wrapper) ----------------
# The browser talks only to us. We keep the upstream circuit.dev session
# server-side, mapped to our own httpOnly cpad_sid cookie.

def our_sid(request: Request) -> str | None:
    return request.cookies.get("cpad_sid")


def jar_for(sid: str | None) -> httpx.Cookies | None:
    if not sid:
        return None
    return SESSIONS.get(sid)


def absorb_cookies(jar: httpx.Cookies, r: httpx.Response):
    try:
        jar.extract_cookies(r)
    except Exception as e:
        logger.warning(f"cookie absorb failed: {e}")


def with_sid_cookie(resp: Response, sid: str) -> Response:
    resp.set_cookie("cpad_sid", sid, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30)
    return resp


@api_router.post("/c/auth/nonce")
async def c_nonce(request: Request):
    body = await request.body()
    r = await client().post(f"{UPSTREAM}/api/auth/nonce", content=body,
                            headers={"content-type": "application/json"})
    return json_response(r)


@api_router.post("/c/auth/verify")
async def c_verify(request: Request):
    body = await request.body()
    sid = our_sid(request) or str(uuid.uuid4())
    jar = SESSIONS.get(sid) or httpx.Cookies()
    r = await client().post(f"{UPSTREAM}/api/auth/verify", content=body,
                            headers={"content-type": "application/json"}, cookies=jar)
    if r.status_code == 200:
        absorb_cookies(jar, r)
        SESSIONS[sid] = jar
        logger.info(f"upstream session stored for sid={sid[:8]}…")
    resp = json_response(r)
    return with_sid_cookie(resp, sid)


@api_router.api_route("/c/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def c_relay(path: str, request: Request):
    sid = our_sid(request)
    jar = jar_for(sid)
    body = await request.body()
    headers = {"content-type": request.headers.get("content-type", "application/json")}
    if request.headers.get("x-circuit-password"):
        headers["x-circuit-password"] = request.headers["x-circuit-password"]

    r = await client().request(
        request.method,
        f"{UPSTREAM}/api/{path}",
        content=body if request.method != "GET" else None,
        headers=headers,
        params=dict(request.query_params),
        cookies=jar,
    )
    if sid and jar is not None:
        absorb_cookies(jar, r)

    if path == "coins" and request.method == "POST" and r.status_code == 200:
        try:
            payload = r.json()
            await db.launches.insert_one({
                "mint": payload.get("mint") or payload.get("address") or payload.get("url"),
                "url": payload.get("url"),
                "raw": json.dumps(payload)[:2000],
                "at": time.time() * 1000,
            })
            logger.info("launch recorded through CodePad portal")
        except Exception as e:
            logger.warning(f"launch record failed: {e}")

    if r.status_code == 401 and path not in ("auth/me",):
        return Response(
            content=b'{"error":"Sign in with your wallet first (connect wallet in the sidebar)."}',
            media_type="application/json", status_code=401)

    resp = json_response(r)
    if sid:
        with_sid_cookie(resp, sid)
    return resp


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    if _shared is not None:
        await _shared.aclose()
