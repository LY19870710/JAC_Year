const { chromium } = require('playwright');
const fs = require('fs');

const JOURNAL_ID = '1396776045425197058';
const ISSN = '2226-4108';

const ISSUES = [
  { issueNum: 1,  issueIndex: '1751885172235108354' },
  { issueNum: 2,  issueIndex: '1765924458496335874' },
  { issueNum: 3,  issueIndex: '1772466586479312898' },
  { issueNum: 4,  issueIndex: '1785118233575636993' },
  { issueNum: 5,  issueIndex: '1793820721728299010' },
  { issueNum: 6,  issueIndex: '1806852178126127106' },
  { issueNum: 7,  issueIndex: '1815938258511069185' },
  { issueNum: 8,  issueIndex: '1829411708798083074' },
  { issueNum: 9,  issueIndex: '1838769304889827330' },
  { issueNum: 10, issueIndex: '1851875266085261314' },
  { issueNum: 11, issueIndex: '1860861320310034433' },
  { issueNum: 12, issueIndex: '1872819595108773890' },
];

const BASE_ISSUE_URL = `https://www.sciopen.com/journal/join_journal/stage_page?stage=5&id=${JOURNAL_ID}&issueIndex={{issueIndex}}&issn=${ISSN}`;

async function parseIssue(page, issue) {
  const url = BASE_ISSUE_URL.replace('{{issueIndex}}', issue.issueIndex);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const articles = await page.evaluate(() => {
    const results = [];
    const items = document.querySelectorAll('div.v4-article-list-item');

    for (const item of items) {
      // Title — from the <a> inside v4-article-title
      const titleLink = item.querySelector('.v4-article-title a[href*="/article/"]');
      if (!titleLink) continue;
      const title = titleLink.textContent.trim();
      const url = titleLink.href;

      // DOI from URL
      const m = url.match(/(10\.\d{4,}\/[^\s<>"']+)/);
      if (!m) continue;
      const doi = m[1];

      // Full block text for extracting other fields
      const block = item.textContent;

      // Type
      let type = 'Research Article';
      if (block.includes('Review')) type = 'Review';
      else if (block.includes('Feature Article')) type = 'Feature Article';
      else if (block.includes('Editorial')) type = 'Editorial';
      else if (block.includes('Letter')) type = 'Letter';

      // Authors — between title and "Published" in block text
      let authors = '';
      const cleanBlock = block
        .replace(/<<\s*Fewer/gi, '')    // remove UI element
        .replace(/\n\s*\n/g, '\n');
      const pubIdx = cleanBlock.indexOf('Published');
      const titleIdx = cleanBlock.indexOf(title);
      if (pubIdx > 0 && titleIdx >= 0) {
        const titleEndIdx = titleIdx + title.length;
        let authPart = cleanBlock.substring(titleEndIdx, pubIdx)
          .replace(/\s+/g, ' ')
          .replace(/^\s*[,，]\s*/, '')
          .replace(/\s*[,，]\s*$/, '')
          .trim();
        if (authPart.length > 1 && authPart.length < 500) {
          authors = authPart;
        }
      }

      // Published date
      let publishedDate = '';
      const pubMatch = block.match(/Published:\s*(\d{1,2}\s+\w+\s+\d{4})/);
      if (pubMatch) publishedDate = pubMatch[1];

      // Volume/Issue/Pages
      let volume = '', issueNum = '', pages = '';
      const volMatch = block.match(/(\d{4})[\s,]+(\d+)\((\d+)\):\s*(\d+[–-]\d+)/);
      if (volMatch) { volume = volMatch[2]; issueNum = volMatch[3]; pages = volMatch[4]; }

      results.push({
        doi,
        title,
        authors,
        type,
        publishedDate,
        year: 2024,
        volume,
        issue: issueNum,
        pages,
        url
      });
    }
    return results;
  });
  return articles;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const existingData = JSON.parse(fs.readFileSync('E:/Claw/JAC_Year/_existing_dois.json', 'utf8'));
  const existingDOIs = new Set(existingData);
  console.log(`Existing DOIs in DB: ${existingDOIs.size}`);

  const allNew = [];
  const seen = new Set();

  // Warm up
  await page.goto('https://www.sciopen.com/journal/join_journal/journalInfo?journalId=' + JOURNAL_ID,
    { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  for (let i = 0; i < ISSUES.length; i++) {
    const issue = ISSUES[i];
    try {
      const articles = await parseIssue(page, issue);
      const newOnes = articles.filter(a => !seen.has(a.doi) && !existingDOIs.has(a.doi));
      newOnes.forEach(a => seen.add(a.doi));
      allNew.push(...newOnes);
      console.log(`Issue ${issue.issueNum}: ${articles.length} found, ${newOnes.length} new (total: ${allNew.length})`);
      if (articles.length > 0) {
        const a0 = articles[0];
        console.log(`  Sample: "${a0.title.substring(0,50)}" | ${a0.authors.substring(0,40)} | ${a0.publishedDate}`);
      }
    } catch (e) {
      console.error(`Error Issue ${issue.issueNum}: ${e.message}`);
    }
    if (i < ISSUES.length - 1) await page.waitForTimeout(1500);
  }

  console.log(`\n=== DONE: ${allNew.length} new articles ===`);
  fs.writeFileSync('E:/Claw/JAC_Year/_articles_2024_new.json', JSON.stringify(allNew, null, 2), 'utf8');
  console.log('Saved to _articles_2024_new.json');
  allNew.slice(0, 3).forEach(a => console.log(JSON.stringify(a)));

  await browser.close();
})();
