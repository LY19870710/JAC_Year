const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen to console messages
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text());
  });
  page.on('requestfailed', req => {
    console.log('FAILED:', req.url());
  });

  try {
    const resp = await page.goto(
      'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=13&issn=2226-4108',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    console.log('Status:', resp.status());

    await page.waitForTimeout(5000);

    const bodyText = await page.evaluate(() => {
      return document.body.innerText.substring(0, 3000);
    });
    console.log('\nPage text:\n', bodyText);

    const html = await page.content();
    console.log('\nPage size:', html.length);
    console.log('Has article:', html.includes('article'));
    console.log('Has doi:', html.includes('10.'));
    console.log('Has sciopen:', html.includes('sciopen'));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
