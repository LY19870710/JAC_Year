const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let apiRequests = [];
  page.on('response', resp => {
    const url = resp.url();
    const status = resp.status();
    if (status >= 200 && status < 300) {
      apiRequests.push({ url, status });
    }
  });

  try {
    // Go directly to Issue 12 page
    await page.goto(
      'https://www.sciopen.com/journal/join_journal/stage_page?stage=5&id=1396776045425197058&issueIndex=1872819595108773890&issn=2226-4108',
      { waitUntil: 'networkidle', timeout: 30000 }
    );
    await page.waitForTimeout(5000);

    // Count article links
    const articles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/article/"]')).map(a => ({
        href: a.href,
        text: a.textContent.trim().substring(0, 100)
      }));
    });
    console.log('Article links found:', articles.length);
    articles.slice(0, 10).forEach(a => console.log(JSON.stringify(a)));

    // Also try DOI pattern
    const dois = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const results = [];
      const seen = new Set();
      links.forEach(a => {
        const m = a.href.match(/10\.\d{4,}\/[^\s<>"']+/);
        if (m && !seen.has(m[0])) {
          seen.add(m[0]);
          results.push({ doi: m[0], text: a.textContent.trim().substring(0, 100) });
        }
      });
      return results;
    });
    console.log('\nDOI links:', dois.length);
    dois.slice(0, 5).forEach(d => console.log(JSON.stringify(d)));

    // Check API requests
    console.log('\nAll API requests:');
    apiRequests.forEach(r => console.log(r.status, r.url.substring(0, 200)));

    const text = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('\nPage text:\n', text);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
