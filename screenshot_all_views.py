"""ConvectNow — Full UI Screenshot Suite (Playwright)

Captures 8 views of the dashboard for SIH Grand Finals audit.
"""
import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:5173"
OUT = "/Users/gauravkumarnayak/Desktop/new sih/convectnow/frontend/screenshots"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})

        # ── VIEW 1: Main Dashboard (default state) ──────────────────
        await page.goto(BASE, wait_until="networkidle", timeout=15000)
        await page.wait_for_timeout(3000)  # let map tiles & WMS load
        await page.screenshot(path=f"{OUT}/v1_main_dashboard.png", full_page=False)
        print("✅ v1_main_dashboard.png")

        # ── VIEW 2: Click-to-Inspect Panel ──────────────────────────
        # Click near Sohra DWR to open cell inspect
        map_el = page.locator("div.ol-viewport").first
        box = await map_el.bounding_box()
        if box:
            await page.mouse.click(box["x"] + box["width"] * 0.52, box["y"] + box["height"] * 0.42)
            await page.wait_for_timeout(800)
        await page.screenshot(path=f"{OUT}/v2_cell_inspect.png", full_page=False)
        print("✅ v2_cell_inspect.png")

        # ── VIEW 3: Layer Control Drawer ────────────────────────────
        layers_btn = page.locator("button", has_text="LAYERS").first
        await layers_btn.click()
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{OUT}/v3_layer_drawer.png", full_page=False)
        print("✅ v3_layer_drawer.png")

        # Close layers drawer
        close_btns = page.locator("button[title='Close Layer Controller']")
        if await close_btns.count() > 0:
            await close_btns.first.click()
            await page.wait_for_timeout(300)

        # Close inspect panel if open
        close_inspect = page.locator("button[title='Close Inspector']")
        if await close_inspect.count() > 0:
            await close_inspect.first.click()
            await page.wait_for_timeout(300)

        # ── VIEW 4: Forecast +30min ─────────────────────────────────
        btn_30m = page.locator("button", has_text="+30m").first
        if await btn_30m.count() > 0:
            await btn_30m.click()
            await page.wait_for_timeout(600)
        await page.screenshot(path=f"{OUT}/v4_forecast_30min.png", full_page=False)
        print("✅ v4_forecast_30min.png")

        # ── VIEW 5: Forecast +3h ────────────────────────────────────
        btn_3h = page.locator("button", has_text="+3h").first
        if await btn_3h.count() > 0:
            await btn_3h.click()
            await page.wait_for_timeout(600)
        await page.screenshot(path=f"{OUT}/v5_forecast_3hr.png", full_page=False)
        print("✅ v5_forecast_3hr.png")

        # ── VIEW 6: Replay Mode Active ──────────────────────────────
        replay_btn = page.locator("button", has_text="REPLAY").first
        await replay_btn.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{OUT}/v6_replay_active.png", full_page=False)
        print("✅ v6_replay_active.png")

        # ── VIEW 7: Replay + Cell Inspect ───────────────────────────
        if box:
            await page.mouse.click(box["x"] + box["width"] * 0.52, box["y"] + box["height"] * 0.42)
            await page.wait_for_timeout(800)
        await page.screenshot(path=f"{OUT}/v7_replay_inspect.png", full_page=False)
        print("✅ v7_replay_inspect.png")

        # Step through replay to last step for dramatic hazard values
        close_inspect2 = page.locator("button[title='Close Inspector']")
        if await close_inspect2.count() > 0:
            await close_inspect2.first.click()

        # Click the last replay step (T+120m)
        replay_last = page.locator("button", has_text="T+120m")
        if await replay_last.count() > 0:
            await replay_last.first.click()
            await page.wait_for_timeout(600)

        # ── VIEW 8: Replay climax (peak hazard) ────────────────────
        await page.screenshot(path=f"{OUT}/v8_replay_climax.png", full_page=False)
        print("✅ v8_replay_climax.png")

        # Exit replay
        replay_btn2 = page.locator("button", has_text="REPLAY").first
        await replay_btn2.click()
        await page.wait_for_timeout(500)

        await browser.close()
        print("\n🎯 All 8 views captured successfully!")


if __name__ == "__main__":
    asyncio.run(main())
