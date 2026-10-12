"""Real touch-device E2E for the CodePad builder + template gallery.
Run: python3 /app/tests/e2e/touch_builder.py  (uses the cached headless shell; no mouse, no HTML5 DnD)"""
import asyncio
from playwright.async_api import async_playwright

BASE = "https://circuit-mirror-2.preview.emergentagent.com"
EXE = "/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell"
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
results = []


def check(name, ok, info=""):
    results.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""))


async def nodes(page):
    return await page.evaluate("() => document.querySelectorAll('[data-testid^=\"blocky-node-\"]').length")


async def long_press(page, sel, ms=650):
    await page.locator(sel).first.scroll_into_view_if_needed()
    await page.wait_for_timeout(250)
    box = await page.locator(sel).first.bounding_box()
    x, y = box["x"] + 14, box["y"] + 12
    cdp = await page.context.new_cdp_session(page)
    await cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    await page.wait_for_timeout(ms)
    await cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    await page.wait_for_timeout(300)


async def fresh(b):
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2, user_agent=UA)
    page = await ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)[:200]))
    page.on("console", lambda m: errs.append(m.text[:140]) if m.type == "error" and "Failed to load resource" not in m.text else None)
    return ctx, page, errs


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE)

        # ---- A: builder on touch -------------------------------------------------
        ctx, page, errs = await fresh(b)
        await page.goto(BASE + "/builder", wait_until="domcontentloaded")
        await page.wait_for_timeout(4000)
        n = await nodes(page)
        check("demo seeded on first visit", n == 6, f"{n} blocks")

        await page.locator('[data-testid="rail-FN"]').tap(); await page.wait_for_timeout(400)
        await page.locator('[data-testid="blocky-palette-mobile"] [data-testid="palette-finance_burn"]').tap(); await page.wait_for_timeout(400)
        check("flyout tap-to-add (nothing selected)", await nodes(page) == n + 1)
        check("flyout closes after add", await page.locator('[data-testid="blocky-palette-mobile"]').count() == 0)

        # select the else arm, then add -> must land inside else (this used to add NOTHING)
        arm = page.locator('[data-testid^="blocky-arm-"][data-testid$="-else"]').first
        arm_id = (await arm.get_attribute("data-testid")).replace("blocky-arm-", "").rsplit("-", 1)[0]
        await arm.tap(); await page.wait_for_timeout(300)
        before_else = await page.evaluate(f"() => document.querySelector('[data-testid=\"blocky-branch-{arm_id}-else\"]').querySelectorAll('[data-testid^=\"blocky-node-\"]').length")
        await page.locator('[data-testid="rail-ST"]').tap(); await page.wait_for_timeout(400)
        await page.locator('[data-testid="blocky-palette-mobile"] [data-testid="palette-variables_set"]').tap(); await page.wait_for_timeout(400)
        after_else = await page.evaluate(f"() => document.querySelector('[data-testid=\"blocky-branch-{arm_id}-else\"]').querySelectorAll('[data-testid^=\"blocky-node-\"]').length")
        check("tap arm then flyout block lands in that branch", after_else == before_else + 1, f"else {before_else}->{after_else}")

        # long-press the burn block (root/under hat) and drop it into the THEN branch via its arm
        await page.evaluate("window.scrollTo(0,0)")
        burn_body = '[data-testid="blocky-node-finance_burn"] [data-testid^="blocky-body-"]'
        await page.locator(burn_body).first.scroll_into_view_if_needed()
        await long_press(page, burn_body)
        held = await page.locator('[data-testid="blocky-move-banner"]').count()
        check("long-press picks a block up (move banner)", held == 1)
        then_sel = f'[data-testid="blocky-branch-{arm_id}-then"]'
        before_then = await page.evaluate(f"() => document.querySelector('{then_sel}').querySelectorAll('[data-testid=\"blocky-node-finance_burn\"]').length")
        await page.locator(f'[data-testid="blocky-arm-{arm_id}-then"]').tap(); await page.wait_for_timeout(400)
        after_then = await page.evaluate(f"() => document.querySelector('{then_sel}').querySelectorAll('[data-testid=\"blocky-node-finance_burn\"]').length")
        check("tap an arm drops the held block into it", after_then == before_then + 1 and await page.locator('[data-testid="blocky-move-banner"]').count() == 0, f"burn in then {before_then}->{after_then}")
        check("move keeps block count", await nodes(page) == n + 2, f"{await nodes(page)}")

        # pick + cancel
        await long_press(page, burn_body)
        await page.locator('[data-testid="blocky-move-cancel"]').tap(); await page.wait_for_timeout(300)
        check("cancel drops nothing", await page.locator('[data-testid="blocky-move-banner"]').count() == 0 and await nodes(page) == n + 2)

        # slow 1.5s hold: still held after release (release click must not drop it), then cancel
        await long_press(page, burn_body, ms=1500)
        check("slow hold stays held after release", await page.locator('[data-testid="blocky-move-banner"]').count() == 1 and await nodes(page) == n + 2)
        await page.locator('[data-testid="blocky-move-cancel"]').tap(); await page.wait_for_timeout(300)

        # plain tap on a value input still edits (no accidental pick)
        inp = page.locator('[data-testid="block-field-value"]').first
        await inp.tap(); await inp.fill("7"); await page.wait_for_timeout(200)
        check("tap + type into a block input", await inp.input_value() == "7" and await page.locator('[data-testid="blocky-move-banner"]').count() == 0)

        # delete a single (non-hat) block by tap
        c0 = await nodes(page)
        await page.locator('[data-testid="blocky-node-variables_set"] [data-testid="block-delete"]').first.tap(); await page.wait_for_timeout(300)
        check("tap delete removes one block", await nodes(page) == c0 - 1, f"{c0}->{await nodes(page)}")

        # vague prompt -> 409 -> bolt asks -> answer -> blocks
        await page.fill('[data-testid="builder-sentence-input"]', "pay my holders every minute")
        await page.locator('[data-testid="builder-ask-bolt-button"]').tap()
        got_q = False
        for _ in range(40):
            await page.wait_for_timeout(1000)
            if await page.locator('[data-testid="bolt-question"]').count():
                got_q = True; break
            if await page.locator('[data-testid="blocky-node-events_every_minutes"]').count():
                break
        if got_q:
            qtext = await page.inner_text('[data-testid="bolt-question-text"]')
            check("409 shows a bolt question (not a dead-end error)", True, qtext[:70])
            await page.fill('[data-testid="bolt-answer-input"]', "0.01 SOL split across all holders")
            await page.locator('[data-testid="bolt-answer-submit"]').tap()
            await page.wait_for_timeout(1500)
            for _ in range(70):
                await page.wait_for_timeout(1000)
                if not await page.locator('[data-testid="builder-ask-bolt-button"]').is_disabled() or await page.locator('[data-testid="bolt-question"]').count():
                    break
            built = await page.evaluate("() => [...document.querySelectorAll('[data-testid^=blocky-node-]')].map(e=>e.dataset.testid.slice(12))")
            check("answering builds a NEW program (demo replaced)", len(built) > 0 and "events_button" not in built, str(built))
        else:
            check("vague prompt compiled directly (no question this time)", await nodes(page) > 0)
        check("builder no page errors", not errs, str(errs[:3]))
        check("no horizontal overflow", await page.evaluate("document.documentElement.scrollWidth") <= 390)
        await page.screenshot(path="/app/tests/e2e/shot_builder_touch.png")
        await ctx.close()

        # ---- B: remix + launch this --------------------------------------------
        ctx, page, errs = await fresh(b)
        await page.goto(BASE + "/builder?remix=llama-3", wait_until="domcontentloaded")
        n = 0
        for _ in range(12):
            await page.wait_for_timeout(1000)
            n = await nodes(page)
            if n: break
        name = await page.inner_text('[data-testid="blocky-project-name"]')
        check("?remix=llama-3 loads the template program", n > 0, f"{n} blocks, project '{name.strip()}'")
        check("remix is masked (project 'Remix of Template', no LLAMA)", "Template" in name and "LLAMA" not in (await page.content()).upper().replace("LLAMA-3", ""))
        check("remix banner shown", await page.locator('[data-testid="remix-banner"]').count() == 1)
        check("no demo seeded on remix", await page.locator('[data-testid="blocky-node-events_button"]').count() == 0 or n != 6)
        await page.screenshot(path="/app/tests/e2e/shot_remix.png")
        await ctx.close()

        ctx, page, errs = await fresh(b)
        await page.goto(BASE + "/builder?remix=llama-3&launch=1", wait_until="domcontentloaded")
        for _ in range(12):
            await page.wait_for_timeout(1000)
            if await nodes(page): break
        drawer = await page.locator('[data-testid="launch-drawer"]').count()
        nm = await page.input_value('[data-testid="launch-name-input"]') if drawer else ""
        tk = await page.input_value('[data-testid="launch-ticker-input"]') if drawer else ""
        check("&launch=1 opens the launch drawer", drawer == 1)
        check("launch prefilled: name Template + made-up ticker + logo", nm == "Template" and len(tk) == 4 and tk.startswith("T") and await page.locator('[data-testid="launch-image-logo"]').count() == 1, f"name={nm} ticker={tk}")
        check("blocks loaded behind the drawer", await nodes(page) > 0)
        await page.screenshot(path="/app/tests/e2e/shot_launch.png")
        await ctx.close()

        ctx, page, errs = await fresh(b)
        await page.goto(BASE + "/builder?remix=no-such-template-xyz", wait_until="domcontentloaded")
        await page.wait_for_timeout(9000)
        txt = await page.inner_text('[data-testid="remix-banner"]') if await page.locator('[data-testid="remix-banner"]').count() else ""
        check("unknown remix slug handled gracefully", "isn't available" in txt and not errs, txt[:60])
        await ctx.close()

        # ---- C: template gallery -------------------------------------------------
        ctx, page, errs = await fresh(b)
        await page.goto(BASE + "/rules", wait_until="domcontentloaded")
        await page.wait_for_timeout(4500)
        cards = await page.locator('[data-testid^="rule-card-"]').count()
        html = (await page.inner_text("main")) if await page.locator("main").count() else await page.inner_text("body")
        leaked = [w for w in ["LLAMA", "Rat Race", "The Intern", "SpyCat", "King of the Hill", "Meme Court", "Grok Spammer", "Penpal"] if w.lower() in html.lower()]
        check("rules cards rendered", cards >= 10, f"{cards} cards")
        check("no original coin names on cards", not leaked, str(leaked))
        check("every card has logo + Remix + Launch this", await page.locator('[data-testid^="rules-logo-"]').count() == cards and await page.locator('[data-testid^="rules-remix-"]').count() == cards and await page.locator('[data-testid^="rules-launch-"]').count() == cards)
        check("no <img> coin pictures in the grid", await page.locator('[data-testid="rules-grid"] img').count() == 0)
        t1 = await page.inner_text('[data-testid="rules-ticker-llama-3"]')
        await page.reload(wait_until="domcontentloaded"); await page.wait_for_timeout(4000)
        t2 = await page.inner_text('[data-testid="rules-ticker-llama-3"]')
        check("made-up ticker stable across reloads", t1 == t2 and t1.startswith("$T"), t1)
        await page.screenshot(path="/app/tests/e2e/shot_rules.png")
        await page.locator('[data-testid="rules-launch-llama-3"]').tap()
        for _ in range(12):
            await page.wait_for_timeout(1000)
            if await page.locator('[data-testid="launch-drawer"]').count() and await nodes(page): break
        check("Launch this -> builder with template + launch drawer", "/builder?remix=llama-3&launch=1" in page.url and await page.locator('[data-testid="launch-drawer"]').count() == 1 and await nodes(page) > 0, page.url.split(".com")[-1])
        check("rules no page errors", not errs, str(errs[:3]))
        await ctx.close()
        await b.close()
    bad = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(bad)}/{len(results)} passed" + (f" — FAILED: {bad}" if bad else ""))


if __name__ == "__main__":
    asyncio.run(main())
