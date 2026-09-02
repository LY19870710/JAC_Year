const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Track network requests
  let apiRequests = [];
  page.on('response', resp => {
    if (resp.url().includes('api') || resp.url().includes('article') || resp.url().includes('list')) {
      apiRequests.push({ url: resp.url(), status: resp.status() });
    }
  });

  try {
    await page.goto(
      'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=13&issn=2226-4108',
      { waitUntil: 'networkidle', timeout: 30000 }
    );
    await page.waitForTimeout(3000);

    // Click 2024 tab
    const clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find(a => a.textContent.trim() === '2024' && a.href.includes('volume=2024'));
      if (link) { link.click(); return true; }
      return false;
    });
    console.log('Clicked 2024:', clicked);

    // Wait for network to settle after click
    await page.waitForTimeout(8000);
    await page.waitForLoadState('networkidle');

    // Count articles now
    const count = await page.evaluate(() => document.querySelectorAll('a[href*="/article/"]').length);
    console.log('Article links:', count);

    const articles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/article/"]')).map(a => ({
        href: a.href,
        text: a.textContent.trim().substring(0, 100)
      }));
    });
    articles.slice(0, 5).forEach(a => console.log(JSON.stringify(a)));

    // Check API requests
    console.log('\nAPI requests made:');
    apiRequests.slice(0, 10).forEach(r => console.log(r.status, r.url.substring(0, 150)));

    // Get page text
    const text = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('\nPage text:\n', text);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
