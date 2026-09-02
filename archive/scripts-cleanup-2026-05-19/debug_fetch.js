const pw = require('playwright');
(async () => {
  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage();
  const urls = [];
  
  page.on('response', r => {
    const u = r.url();
    // Filter out static assets
    if (u.endsWith('.js') || u.endsWith('.css') || u.endsWith('.png') || 
        u.endsWith('.jpg') || u.endsWith('.ico') || u.endsWith('.woff') ||
        u.endsWith('.svg') || u.endsWith('.gif') || u.endsWith('.ttf')) return;
    urls.push(u);
  });
  
  await page.goto('https://www.sciopen.com/article/10.26599/JAC.2025.9221171', 
    { waitUntil: 'networkidle', timeout: 60000 });
  
  console.log('=== Network requests ===');
  urls.forEach(u => console.log(u));
  
  // Try to find funding in page content
  const text = await page.textContent('body');
  const fundIdx = text.indexOf('Funding');
  if (fundIdx > -1) {
    // Get text content around "Funding"
    const snippet = text.substring(fundIdx, fundIdx + 1000);
    console.log('\n=== Funding text ===');
    console.log(snippet);
  }
  
  // Check for acknowledgments  
  const ackIdx = text.indexOf('cknowledg');
  if (ackIdx > -1) {
    const snippet = text.substring(ackIdx, ackIdx + 500);
    console.log('\n=== Acknowledgment ===');
    console.log(snippet);
  }
  
  await browser.close();
})();
