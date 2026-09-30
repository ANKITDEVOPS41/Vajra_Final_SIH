const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 800 });

  console.log("Navigating to Hazard GIS...");
  await page.goto('http://localhost:5180', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4000)); // let map tiles load
  await page.screenshot({ path: '1_Storm_Detection.png' });
  console.log("Saved 1_Storm_Detection.png");

  console.log("Simulating click on a storm cell...");
  await page.evaluate(() => {
    // Leaflet renders circles as SVG paths with class leaflet-interactive
    const paths = Array.from(document.querySelectorAll('path.leaflet-interactive'));
    // Usually the storm cells have a certain stroke or fill. We'll click the last one which is usually drawn on top.
    if(paths.length > 0) {
       const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
       paths[paths.length - 1].dispatchEvent(ev);
    }
  });
  await new Promise(r => setTimeout(r, 1500)); // wait for panel to open
  await page.screenshot({ path: '2_Storm_Track.png' });
  console.log("Saved 2_Storm_Track.png");

  console.log("Switching to 3x3 Airfield Twin...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('3x3 Airfield Twin'));
    if(btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  
  console.log("Simulating click on a grid sector...");
  await page.evaluate(() => {
    const paths = Array.from(document.querySelectorAll('path.leaflet-interactive'));
    // The grid cells are rectangles
    if(paths.length > 0) {
       const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
       paths[0].dispatchEvent(ev);
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: '3_Location_Intelligence.png' });
  console.log("Saved 3_Location_Intelligence.png");

  console.log("Switching to Case Replay...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Case Replay'));
    if(btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  
  console.log("Starting simulation...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const playBtn = btns.find(b => b.textContent && b.textContent.includes('Play'));
    if(playBtn) playBtn.click();
  });
  await new Promise(r => setTimeout(r, 4000)); // wait for storm to move to middle
  await page.screenshot({ path: '4_Forecast_Verification.png' });
  console.log("Saved 4_Forecast_Verification.png");

  await browser.close();
  console.log("Done!");
})();
