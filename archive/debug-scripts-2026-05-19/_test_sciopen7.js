const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Track all network requests
  let apiRequests = [];
  page.on('response', resp => {
    const url = resp.url();
    if (resp.status() >= 200 && resp.status() < 300 && (
      url.includes('api') || url.includes('article') || url.includes('list') ||
      url.includes('issue') || url.includes('published') || url.includes('archive')
    )) {
      apiRequests.push({ url, status: resp.status() });
    }
  });

  try {
    await page.goto(
      'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=2024&issn=2226-4108',
      { waitUntil: 'networkidle', timeout: 30000 }
    );
    await page.waitForTimeout(5000);

    console.log('API requests made:');
    apiRequests.forEach(r => console.log(r.status, r.url.substring(0, 200)));

    // Also try the current page URL
    console.log('\nCurrent URL:', page.url());

    // Check page text
    const text = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('\nPage text:\n', text);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
