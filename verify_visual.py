"""
ConvectNow Frontend Automated Visual Verification (Playwright)
Validates the React + OpenLayers 10 Operational Dashboard and captures full-resolution screenshots.
"""

import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    screenshots_dir = os.path.join(frontend_dir, "screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)

    print("Building and starting Vite preview server on port 5173...")
    proc = subprocess.Popen(
        ["npm", "run", "preview", "--", "--port", "5173"],
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1920, "height": 1080})

            print("Navigating to http://localhost:5173...")
            page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=15000)
            page.wait_for_selector(".ol-viewport", timeout=10000)

            # Assert Title
            title = page.title()
            print(f"Page title: {title}")
            assert "ConvectNow" in title

            # Assert Top Operational Bar elements
            assert page.locator("text=CONVECTNOW").is_visible()
            assert page.locator("text=ACTIVE NOWCASTING").is_visible()
            assert page.locator("text=REPLAY: Inactive").is_visible()

            # Assert Hazard Bar indicators
            for hazard in ["CI", "LTG", "HAIL", "DWN", "CLD"]:
                assert page.get_by_text(hazard, exact=True).is_visible()
            print("Hazard bar elements verified!")

            # Assert Forecast Time Slider steps
            assert page.get_by_role("button", name="NOW", exact=True).is_visible()
            assert page.get_by_role("button", name="+1h", exact=True).is_visible()
            assert page.get_by_role("button", name="+6h", exact=True).is_visible()
            assert page.get_by_text("Kalman Uncertainty:").is_visible()
            print("Forecast slider elements verified!")

            # Assert OpenLayers map viewport exists
            assert page.locator(".ol-viewport").is_visible()
            print("OpenLayers Map canvas verified!")

            # Screenshot 1: Operational Dashboard
            time.sleep(1)
            screenshot_path_1 = os.path.join(screenshots_dir, "01_operational_dashboard.png")
            page.screenshot(path=screenshot_path_1, full_page=True)
            print(f"Saved: {screenshot_path_1}")

            # Click on the map to trigger ClickInspectPanel
            page.mouse.click(960, 450)
            time.sleep(1)

            # Assert Click-to-Inspect Panel
            assert page.locator("text=1 km × 1 km CELL").is_visible()
            assert page.locator("text=Radar Reflectivity:").is_visible()
            assert page.locator("text=AI CONVECTNET HAZARDS").is_visible()
            assert page.locator("text=STORM MOTION & VECTOR").is_visible()
            print("Click-to-Inspect sidebar verified!")

            # Screenshot 2: Click-to-Inspect Panel
            screenshot_path_2 = os.path.join(screenshots_dir, "02_cell_inspection_panel.png")
            page.screenshot(path=screenshot_path_2, full_page=True)
            print(f"Saved: {screenshot_path_2}")

            # Open Layer Control Drawer
            page.locator("button:has-text('LAYERS')").click()
            time.sleep(0.5)
            assert page.locator("text=OGC & OPERATIONAL LAYERS").is_visible()
            assert page.locator("text=MOSDAC DWR Radar Composite").is_visible()
            assert page.locator("text=INSAT-3DR Thermal IR").is_visible()
            assert page.locator("text=Bhuvan Hourly Lightning Strikes").is_visible()
            print("Layer Control Drawer verified!")

            # Screenshot 3: Layers Drawer
            screenshot_path_3 = os.path.join(screenshots_dir, "03_layers_control_drawer.png")
            page.screenshot(path=screenshot_path_3, full_page=True)
            print(f"Saved: {screenshot_path_3}")

            # Close Layers Drawer
            page.locator("button[title='Close Layer Controller']").click()
            time.sleep(0.5)

            # Activate Historical Event Replay Mode
            replay_btn = page.locator("button:has-text('REPLAY: Inactive')")
            replay_btn.click()
            time.sleep(1)

            # Verify Replay Mode Active
            assert page.locator("text=HISTORICAL REPLAY MODE ACTIVE:").is_visible()
            assert page.locator("text=June 16–17, 2022 Cherrapunji Extreme Cloudburst").is_visible()
            print("Historical Replay Mode verified!")

            # Screenshot 4: Replay Mode Active
            screenshot_path_4 = os.path.join(screenshots_dir, "04_historical_replay_mode.png")
            page.screenshot(path=screenshot_path_4, full_page=True)
            print(f"Saved: {screenshot_path_4}")

            browser.close()
            print("All visual and functional checks PASSED with 0 errors!")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()

if __name__ == "__main__":
    main()
