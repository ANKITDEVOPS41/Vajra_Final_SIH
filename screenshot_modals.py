import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:5173"
OUT = "/Users/gauravkumarnayak/Desktop/new sih/convectnow/frontend/screenshots"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})

        # ── 1. Load Page ──
        await page.goto(BASE, wait_until="networkidle", timeout=15000)
        await page.wait_for_timeout(2000)

        # ── 2. Click VERIFICATION button and capture modal ──
        verif_btn = page.locator("button:has-text('VERIFICATION')").first
        await verif_btn.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{OUT}/v10_wmo_verification_modal.png")
        print("✅ v10_wmo_verification_modal.png")

        # Close Verification Modal by clicking the top right X or Close button
        close_x = page.locator("button:has-text('Close Scorecard')").first
        if await close_x.count() > 0:
            await close_x.click()
        else:
            await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)

        # ── 3. Click CAP ALERT button and capture modal ──
        cap_btn = page.locator("button:has-text('CAP ALERT')").first
        await cap_btn.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{OUT}/v11_cap_v12_dispatcher_modal.png")
        print("✅ v11_cap_v12_dispatcher_modal.png")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
