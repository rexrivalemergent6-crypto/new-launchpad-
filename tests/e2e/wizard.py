"""Walk the 5-step launch wizard on a phone viewport (no wallet: stops at the Sign & launch gate).
Run: python3 /app/tests/e2e/wizard.py"""
import asyncio
from playwright.async_api import async_playwright

BASE = "https://circuit-mirror-2.preview.emergentagent.com"
EXE = "/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell"
res = []


def check(n, ok, info=""):
    res.append(ok); print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info else ""))


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE)
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
        page = await ctx.new_page()
        errs, calls = [], []
        page.on("pageerror", lambda e: errs.append(str(e)[:200]))
        page.on("console", lambda m: errs.append(m.text[:150]) if m.type == "error" and "Failed to load resource" not in m.text else None)
        page.on("request", lambda r: calls.append(f"{r.method} {r.url.split('.com')[1][:60]}") if "/api/c/" in r.url else None)
        await page.goto(BASE + "/builder", wait_until="domcontentloaded")
        await page.wait_for_timeout(3500)
        await page.locator('[data-testid="blocky-launch-button"]').tap()
        await page.wait_for_timeout(500)
        check("wizard opens on step 1", await page.locator('[data-testid="wizard-step-1"]').count() == 1, await page.inner_text('[data-testid="wizard-step-label"]'))
        check("Back hidden on step 1", not await page.locator('[data-testid="wizard-back"]').is_visible())
        for _ in range(20):
            await page.wait_for_timeout(500)
            if await page.locator('[data-testid="wizard-image"] img').count(): break
        src = await page.locator('[data-testid="wizard-image"] img').get_attribute("src") if await page.locator('[data-testid="wizard-image"] img').count() else None
        check("default picture = uploaded CodePad mark (via our relay)", bool(src) and "circuitdev" not in src, src)
        await page.locator('[data-testid="wizard-next"]').tap(); await page.wait_for_timeout(300)
        check("step 2 renders", await page.locator('[data-testid="wizard-step-2"]').count() == 1)
        await page.fill('[data-testid="launch-name-input"]', "")
        await page.locator('[data-testid="wizard-next"]').tap(); await page.wait_for_timeout(200)
        check("validation blocks Next (no name)", await page.locator('[data-testid="wizard-step-2"]').count() == 1 and await page.locator('[data-testid="launch-error"]').count() == 1, await page.inner_text('[data-testid="launch-error"]'))
        await page.fill('[data-testid="launch-name-input"]', "Pad Test")
        await page.fill('[data-testid="launch-ticker-input"]', "zzq9")
        await page.locator('[data-testid="wizard-description"]').tap()
        await page.wait_for_timeout(1500)
        check("ticker uppercased + availability badge", (await page.input_value('[data-testid="launch-ticker-input"]')) == "ZZQ9" and await page.locator('[data-testid="ticker-availability"]').count() == 1,
              (await page.inner_text('[data-testid="ticker-availability"]')) if await page.locator('[data-testid="ticker-availability"]').count() else "no badge")
        await page.fill('[data-testid="wizard-twitter"]', "not a link")
        await page.locator('[data-testid="wizard-next"]').tap(); await page.wait_for_timeout(200)
        check("bad X link blocked", await page.locator('[data-testid="wizard-step-2"]').count() == 1)
        await page.fill('[data-testid="wizard-twitter"]', "")
        await page.locator('[data-testid="wizard-next"]').tap(); await page.wait_for_timeout(300)
        check("step 3 shows rules from the user's blocks", await page.locator('[data-testid="wizard-step-3"]').count() == 1 and "clicks" in (await page.inner_text('[data-testid="wizard-rules"]')))
        for _ in range(60):
            await page.wait_for_timeout(1000)
            if await page.locator('[data-testid="wizard-program-error"]').count(): break
            await page.locator('[data-testid="wizard-next"]').tap(); await page.wait_for_timeout(200)
            if await page.locator('[data-testid="wizard-step-4"]').count(): break
        perr = await page.inner_text('[data-testid="wizard-program-error"]') if await page.locator('[data-testid="wizard-program-error"]').count() else ""
        check("blocks compiled into a program -> step 4", await page.locator('[data-testid="wizard-step-4"]').count() == 1, perr or "ok")
        if await page.locator('[data-testid="wizard-step-4"]').count():
            await page.locator('[data-testid="wizard-next"]').tap(); await page.wait_for_timeout(200)
            check("step 4 gate: Next blocked until agree", await page.locator('[data-testid="wizard-step-4"]').count() == 1)
            nomoney = await page.locator('[data-testid="wizard-no-money"]').count()
            print("   demo program has money rule:", not nomoney)
            if nomoney: await page.locator('[data-testid="wizard-no-money"] input').check()
            await page.locator('[data-testid="wizard-agree"] input').check()
            await page.locator('[data-testid="wizard-next"]').tap(); await page.wait_for_timeout(300)
            check("step 5 summary filled", await page.locator('[data-testid="wizard-step-5"]').count() == 1 and "Pad Test · $ZZQ9" in await page.inner_text('[data-testid="summary-creates"]'))
            check("Sign & launch button present", await page.inner_text('[data-testid="launch-button"]') == "Sign & launch")
        await page.screenshot(path="/app/tests/e2e/shot_wizard5.png")
        sw = await page.evaluate("document.documentElement.scrollWidth")
        check("no horizontal overflow", sw <= 390, sw)
        check("zero console/page errors", not errs, str(errs[:3]))
        print("   /api/c calls:", sorted(set(calls)))
        await b.close()
    print(f"\n{sum(res)}/{len(res)} passed")


asyncio.run(main())
