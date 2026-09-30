const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(2000);
  
  // Click the 4th tab "3x3 Airfield Twin"
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const tab = tabs.find(t => t.textContent.includes('3x3 Airfield Twin'));
    if (tab) tab.click();
  });
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tactical_tab.png' });
  await browser.close();
})();
