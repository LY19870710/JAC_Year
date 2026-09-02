const { chromium } = require('playwright');

const JOURNAL_ID = '1396776045425197058';
const ISSUE_URL = `https://www.sciopen.com/journal/join_journal/stage_page?stage=5&id=${JOURNAL_ID}&issueIndex=1751885172235108354&issn=2226-4108`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(ISSUE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const articles = await page.evaluate(() => {
    const results = [];
    const items = document.querySelectorAll('div.v4-article-list-item');
    for (const item of items) {
      const titleLink = item.querySelector('.v4-article-title a[href*="/article/"]');
      if (!titleLink) continue;
      const block = item.textContent;
      
      // Print raw block text for first article
      if (results.length === 0) {
        results.push({ raw: block.substring(0, 500) });
      }
      
      // Try various author extraction patterns
      let authors = '';
      
      // Pattern 1: text between title and "Published"
      const titleEnd = block.indexOf('Published');
      const titleStart = block.indexOf('Research Article') + 'Research Article | Open Access'.length;
      if (titleEnd > 0 && titleStart >= 0) {
        authors = block.substring(titleStart, titleEnd).trim();
      }
      
      results.push({ 
        title: titleLink.textContent.trim().substring(0, 40),
        authors: authors.substring(0, 100),
        type: block.includes('Review') ? 'Review' : 'Research'
      });
    }
    return results;
  });

  articles.forEach((a, i) => {
    if (a.raw) console.log(`=== RAW BLOCK ===\n${a.raw}\n=== END RAW ===\n`);
    console.log(`[${i}] ${a.title} | "${a.authors}" | ${a.type}`);
  });

  await browser.close();
})();
