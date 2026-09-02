const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(
      'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=13&issn=2226-4108',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    // Scroll to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const articles = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const links = document.querySelectorAll('a[href*="10."]');
      console.log('Total links with 10.:', links.length);
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        const match = href.match(/10\.\d{4,}\/[^\s<>"']+/);
        if (!match) return;
        const doi = match[0];
        if (seen.has(doi)) return;
        seen.add(doi);
        const text = link.textContent ? link.textContent.trim() : '';
        if (text.length > 5) {
          results.push({ doi, title: text.substring(0, 100) });
        }
      });
      return results;
    });

    console.log('Found:', articles.length);
    articles.slice(0, 15).forEach(a => console.log(JSON.stringify(a)));

    // Also dump all links for debugging
    const allLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links.filter(a => a.href.includes('10.')).map(a => a.href).slice(0, 20);
    });
    console.log('\nDOI links found:');
    allLinks.forEach(l => console.log(l));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
