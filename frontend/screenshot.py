from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto('http://localhost:5174')
        time.sleep(3) # wait for three.js canvas to render and framer-motion animations
        page.screenshot(path='convectnow_3d_hud.png')
        browser.close()

run()
