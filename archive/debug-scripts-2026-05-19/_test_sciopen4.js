const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text());
  });

  try {
    await page.goto(
      'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=13&issn=2226-4108',
      { waitUntil: 'networkidle', timeout: 30000 }
    );

    // Wait for Vue to render
    await page.waitForTimeout(5000);

    // Click on 2024 year tab if exists
    const yearTabs = await page.$$('button, a, [class*="year"], [class*="tab"]');
    console.log('Tabs/buttons found:', yearTabs.length);

    // Try clicking the volume 2024 link
    const links2024 = await page.$$eval('a', els => els.filter(e => e.textContent.trim() === '2024' || e.textContent.trim() === '2024').map(e => ({text: e.textContent.trim(), href: e.href})));
    console.log('2024 links:', JSON.stringify(links2024));

    // Get page content after waiting
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('\nPage text:\n', bodyText);

    // Look for article elements
    const articleCount = await page.evaluate(() => {
      return document.querySelectorAll('a[href*="/article/"]').length;
    });
    console.log('\nArticle links:', articleCount);

    const articleLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/article/"]')).map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 80) })).slice(0, 10);
    });
    console.log('Article links:');
    articleLinks.forEach(a => console.log(JSON.stringify(a)));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
