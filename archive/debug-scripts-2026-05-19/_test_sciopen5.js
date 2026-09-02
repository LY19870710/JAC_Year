const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // First go to the journal main archive page
    await page.goto(
      'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=13&issn=2226-4108',
      { waitUntil: 'networkidle', timeout: 30000 }
    );
    await page.waitForTimeout(3000);

    // Find and click the 2024 tab
    const clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find(a => a.textContent.trim() === '2024' && a.href.includes('volume=2024'));
      if (link) {
        link.click();
        return true;
      }
      return false;
    });
    console.log('Clicked 2024 tab:', clicked);
    await page.waitForTimeout(5000);

    // Check article count now
    const articleLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/article/"]')).map(a => ({
        href: a.href,
        text: a.textContent.trim().substring(0, 100)
      }));
    });
    console.log('Article links found:', articleLinks.length);
    articleLinks.slice(0, 5).forEach(a => console.log(JSON.stringify(a)));

    // Also check all links with DOI pattern
    const doiLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const dois = links.filter(a => a.href.match(/10\.\d{4,}/)).map(a => a.href);
      return [...new Set(dois)];
    });
    console.log('\nDOI links:', doiLinks.length);
    dois.slice(0, 5).forEach(l => console.log(l));

    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('\nPage text:\n', bodyText);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
