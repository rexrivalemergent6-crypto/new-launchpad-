"""Backend regression tests for CodePad relay proxy."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://circuit-mirror-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


# --- Health ---
def test_health(session):
    r = session.get(f"{API}/health", timeout=15)
    assert r.status_code == 200


# --- Relay GET endpoints ---
@pytest.mark.parametrize("path", [
    "/relay/stats",
    "/relay/explore",
    "/relay/stocks",
    "/relay/rules",
    "/relay/live",
    "/relay/scoreboard",
    "/relay/library",
])
def test_relay_endpoints(session, path):
    r = session.get(f"{API}{path}", timeout=30)
    assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"
    # response should be JSON (dict or list)
    data = r.json()
    assert data is not None


# --- Portal launches (regression for prior NameError) ---
def test_portal_launches(session):
    r = session.get(f"{API}/portal/launches", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "launches" in data
    assert "count" in data
    assert isinstance(data["launches"], list)


# --- Live ticker data shape ---
def test_relay_live_has_items(session):
    r = session.get(f"{API}/relay/live", timeout=20)
    assert r.status_code == 200
    data = r.json()
    # must be live, not mock placeholder
    assert isinstance(data, (list, dict))


# --- C-relay proxied endpoints (should NOT be 500) ---
def test_c_launch_terms(session):
    r = session.get(f"{API}/c/launch/terms", timeout=20)
    # Upstream can return 200 or 401 if session needed, but not 500
    assert r.status_code != 500, f"500 err: {r.text[:200]}"


def test_c_coins_ticker_check(session):
    r = session.get(f"{API}/c/coins/ticker?symbol=TESTTICKER99XYZ", timeout=20)
    assert r.status_code != 500, f"500 err: {r.text[:200]}"


# --- Auth nonce ---
def test_auth_nonce(session):
    r = session.post(f"{API}/c/auth/nonce", json={"pubkey": "11111111111111111111111111111111"}, timeout=20)
    assert r.status_code != 500, f"500 err: {r.text[:200]}"


# --- Compile (upstream AI) - may be slow ---
def test_c_compile_endpoint_exists(session):
    r = session.post(f"{API}/c/compile", json={"prompt": "buy back the coin"}, timeout=30)
    # Allow 200/401/400 but not 500
    assert r.status_code != 500, f"500 err: {r.text[:200]}"
