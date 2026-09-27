"""Capture screenshots of the 3 new winner-tier operational features:
- v9: ClickInspectPanel with Physical XAI Attribution + CAP Button
- v10: WMO Operational Verification Scorecard Modal
- v11: ITU-T X.1303 / WMO CAP v1.2 Alert Dispatcher Modal
"""
import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:5173"
OUT = "/Users/gauravkumarnayak/Desktop/new sih/convectnow/frontend/screenshots"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})

        await page.goto(BASE, wait_until="networkidle", timeout=15000)
        await page.wait_for_timeout(2000)

        # ── 1. Cell Inspect with Physical XAI Attribution ──
        map_el = page.locator("div.ol-viewport").first
        box = await map_el.bounding_box()
        if box:
            await page.mouse.click(box["x"] + box["width"] * 0.52, box["y"] + box["height"] * 0.42)
            await page.wait_for_timeout(800)
        await page.screenshot(path=f"{OUT}/v9_xai_inspect_panel.png")
        print("✅ v9_xai_inspect_panel.png")

        # ── 2. WMO Verification Scorecard Modal ──
        verif_btn = page.locator("button[title*='Verification']").first
        await verif_btn.click()
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{OUT}/v10_wmo_verification_modal.png")
        print("✅ v10_wmo_verification_modal.png")

        # Close Verification Modal
        close_btn = page.locator("button:has-text('Close Scorecard')").first
        await close_btn.click()
        await page.wait_for_timeout(400)

        # ── 3. CAP v1.2 Alert Dispatcher Modal ──
        cap_btn = page.locator("button[title*='CAP v1.2 Warning Alert']").first
        await cap_btn.click()
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{OUT}/v11_cap_v12_dispatcher_modal.png")
        print("✅ v11_cap_v12_dispatcher_modal.png")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
