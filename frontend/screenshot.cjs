const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  page.on('requestfailed', request => console.log('FAILED REQUEST:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'debug_map.png', fullPage: true });
  await browser.close();
})();
