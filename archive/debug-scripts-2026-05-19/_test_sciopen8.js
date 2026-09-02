const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let apiRequests = [];
  page.on('response', resp => {
    const url = resp.url();
    if (resp.status() >= 200 && resp.status() < 300) {
      apiRequests.push({ url, status: resp.status() });
    }
  });

  try {
    // Navigate to 2024 archive
    await page.goto(
      'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=2024&issn=2226-4108',
      { waitUntil: 'networkidle', timeout: 30000 }
    );
    await page.waitForTimeout(5000);

    // Get all links that might be issue links
    const issueLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links
        .filter(a => a.href.includes('volume=13') || a.href.includes('issue=') || (a.href.includes('sciopen.com') && a.textContent.trim().match(/Issue \d+/)))
        .map(a => ({ text: a.textContent.trim(), href: a.href }))
        .slice(0, 20);
    });
    console.log('Issue links:');
    issueLinks.forEach(l => console.log(JSON.stringify(l)));

    // Find and click Issue 12 (December)
    const issue12Clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      // Look for the issue 12 link
      const link = links.find(a => 
        a.href.includes('volume=13') && a.href.includes('issue=12') ||
        (a.textContent.includes('Issue 12') && a.href.includes('volume'))
      );
      if (link) { link.click(); return link.href; }
      return null;
    });
    console.log('\nClicked issue 12:', issue12Clicked);

    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle');

    // Check article links now
    const articles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/article/"]')).map(a => ({
        href: a.href,
        text: a.textContent.trim().substring(0, 100)
      }));
    });
    console.log('\nArticle links:', articles.length);
    articles.slice(0, 5).forEach(a => console.log(JSON.stringify(a)));

    // Also check API requests after click
    const newReqs = apiRequests.filter(r => 
      r.url.includes('article') || r.url.includes('list') || r.url.includes('published') || r.url.includes('issue')
    );
    console.log('\nRelevant API requests:');
    newReqs.forEach(r => console.log(r.status, r.url.substring(0, 200)));

    // Get page text
    const text = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('\nPage text:\n', text);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
