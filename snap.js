const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 700, height: 400 });
  await page.goto('file://' + process.cwd() + '/mockup.html');
  await page.screenshot({ path: 'style_reference.png' });
  await browser.close();
})();
