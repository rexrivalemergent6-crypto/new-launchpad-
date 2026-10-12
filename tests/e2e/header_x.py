"""X link in the header on every page. Run: python3 /app/tests/e2e/header_x.py"""
import asyncio
from playwright.async_api import async_playwright
BASE = "https://circuit-mirror-2.preview.emergentagent.com"
EXE = "/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell"
CASES = [((1440, 900), "/", "header-x-link-desktop", "nav-home"), ((1440, 900), "/builder", "header-x-link-desktop", "nav-home"),
         ((1440, 900), "/explore", "header-x-link-desktop", "nav-home"), ((390, 844), "/", "header-x-link-mobile", "nav-home-mobile"),
         ((390, 844), "/explore", "header-x-link-mobile", "nav-home-mobile"), ((390, 844), "/builder", "header-x-link-builder", "blocky-project-icon")]
async def main():
    ok_all = True
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE)
        for (w, h), path, tid, logo in CASES:
            page = await b.new_page(viewport={"width": w, "height": h})
            errs = []
            page.on("pageerror", lambda e: errs.append(str(e)[:120]))
            page.on("console", lambda m: errs.append(m.text[:120]) if m.type == "error" and "Failed to load resource" not in m.text else None)
            await page.goto(BASE + path, wait_until="domcontentloaded"); await page.wait_for_timeout(3000)
            x = page.locator(f'[data-testid="{tid}"]')
            vis = await x.count() == 1 and await x.is_visible()
            xb = await x.bounding_box() if vis else None
            lb = await page.locator(f'[data-testid="{logo}"]').first.bounding_box()
            same_row = bool(xb and lb and abs((xb["y"] + xb["height"] / 2) - (lb["y"] + lb["height"] / 2)) < 14 and xb["y"] < 80)
            href, tgt = (await x.get_attribute("href"), await x.get_attribute("target")) if vis else (None, None)
            sw = await page.evaluate("document.documentElement.scrollWidth")
            ok = vis and same_row and href == "https://x.com/usecodepad" and tgt == "_blank" and sw <= w and not errs
            ok_all &= ok
            print(("PASS" if ok else "FAIL"), f"{w}px {path:9} {tid:24} visible={vis} box={[round(v) for v in xb.values()] if xb else None} same-row-as-logo={same_row} href={href} target={tgt} scrollWidth={sw} errors={errs[:2]}")
            await page.screenshot(path=f"/app/tests/e2e/shot_x_{w}{path.replace('/', '_') or '_home'}.png", clip={"x": 0, "y": 0, "width": w, "height": 140})
            await page.close()
        await b.close()
    print("ALL PASS" if ok_all else "SOME FAILED")
asyncio.run(main())
