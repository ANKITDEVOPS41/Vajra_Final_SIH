const https = require('https');
https.get('https://api.rainviewer.com/public/weather-maps.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(json.radar.past[json.radar.past.length - 1].path);
  });
});
