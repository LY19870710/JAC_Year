const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(
      'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=13&issn=2226-4108',
      { waitUntil: 'networkidle', timeout: 30000 }
    );
    await page.waitForTimeout(3000);

    const articles = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const links = document.querySelectorAll('a[href*="10."]');
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        const match = href.match(/10\.\d{4,}\/[^\s<>"']+/);
        if (!match) return;
        const doi = match[0];
        if (seen.has(doi)) return;
        seen.add(doi);
        const text = link.textContent ? link.textContent.trim() : '';
        if (text.length > 5) {
          results.push({ doi, title: text.substring(0, 80) });
        }
      });
      return results;
    });

    console.log('Found:', articles.length);
    articles.slice(0, 10).forEach(a => console.log(JSON.stringify(a)));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
