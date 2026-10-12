import os
import time
import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Request, Response
from starlette.middleware.cors import CORSMiddleware
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPSTREAM = os.environ['UPSTREAM_BASE_URL'].rstrip('/')

app = FastAPI(title="CoinPad Relay")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("relay")

_shared: httpx.AsyncClient | None = None


def client() -> httpx.AsyncClient:
    global _shared
    if _shared is None:
        _shared = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0),
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


async def upstream(path: str, params: dict | None = None) -> httpx.Response:
    url = f"{UPSTREAM}/{path}"
    return await client().get(url, params=params)


@api_router.get("/health")
async def health():
    try:
        r = await upstream("api/stats")
        return {"ok": True, "upstream": UPSTREAM, "upstreamStatus": r.status_code}
    except Exception as e:
        return {"ok": False, "upstream": UPSTREAM, "error": str(e)}


@api_router.get("/relay/stats")
async def relay_stats():
    cached = cache_get("stats", TTL_JSON)
    if cached:
        return Response(content=cached[0], media_type="application/json")
    r = await upstream("api/stats")
    cache_set("stats", (r.content,), TTL_JSON)
    return Response(content=r.content, media_type="application/json", status_code=r.status_code)


@api_router.get("/relay/explore")
async def relay_explore(request: Request):
    params = dict(request.query_params)
    key = "explore:" + str(sorted(params.items()))
    cached = cache_get(key, TTL_JSON)
    if cached:
        return Response(content=cached[0], media_type="application/json")
    r = await upstream("api/explore", params)
    cache_set(key, (r.content,), TTL_JSON)
    return Response(content=r.content, media_type="application/json", status_code=r.status_code)


@api_router.get("/relay/scoreboard")
async def relay_scoreboard():
    cached = cache_get("scoreboard", TTL_JSON)
    if cached:
        return Response(content=cached[0], media_type="application/json")
    r = await upstream("api/scoreboard")
    cache_set("scoreboard", (r.content,), TTL_JSON)
    return Response(content=r.content, media_type="application/json", status_code=r.status_code)


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


@api_router.get("/relay/{path:path}")
async def relay_generic(path: str, request: Request):
    params = dict(request.query_params)
    r = await upstream(path, params)
    return Response(content=r.content, media_type=r.headers.get("content-type", "application/json"),
                    status_code=r.status_code)


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
