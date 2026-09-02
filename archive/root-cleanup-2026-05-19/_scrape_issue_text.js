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

async function parseIssuePage(page, issue) {
  const url = BASE_ISSUE_URL.replace('{{issueIndex}}', issue.issueIndex);
  console.log(`  Issue ${issue.issueNum}...`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const pageText = document.body.innerText;
    
    // Find all article blocks — each contains DOI, title, authors, type, date, vol/issue/page
    // Pattern: DOI links are the anchor for each article
    const articleBlocks = [];
    
    // Method: find all DOI links and walk DOM to get surrounding info
    const dois = Array.from(document.querySelectorAll('a[href*="/article/10."]'));
    
    for (const a of dois) {
      const href = a.href;
      const m = href.match(/(10\.\d{4,}\/[^\s<>"']+)/);
      if (!m) continue;
      const doi = m[1];
      
      // Get title from link text
      let title = a.textContent.trim();
      if (!title || title.length < 5) title = '(no title in link)';
      
      // Walk up to get article container
      let container = a.closest('div[class*="item"], div[class*="article"], div[class*="list"], li, tr');
      if (!container) container = a.parentElement?.parentElement;
      const block = container ? container.textContent : '';
      
      // Get type
      let type = 'Research Article';
      if (block.includes('Review')) type = 'Review';
      else if (block.includes('Editorial')) type = 'Editorial';
      else if (block.includes('Feature Article')) type = 'Feature Article';
      
      // Get published date
      let publishedDate = '';
      const pubMatch = block.match(/Published:\s*(\d+\s+\w+\s+\d{4})/);
      if (pubMatch) publishedDate = pubMatch[1];
      
      // Get volume/issue/pages
      let volume = '', issue = '', pages = '';
      // Format: 2024, 13(12): 1891-1918
      const volMatch = block.match(/(\d{4})[\s,]+(\d+)\((\d+)\):\s*(\d+[–-]\d+)/);
      if (volMatch) { volume = volMatch[2]; issue = volMatch[3]; pages = volMatch[4]; }
      
      // Get authors — look for name pattern near the title
      let authors = '';
      // Try to find author names: "Xiang Li, Chen Hu, Qiang Liu, [...], Jiang Li"
      const authMatch = block.match(/([A-Z][a-z]+(?:\s[A-Z]\.?)?(?:\s*,\s*[A-Z][a-z]+(?:\s[A-Z]\.?)?)*(?:\s*,\s*\[\.\.\.\]\s*,?\s*[A-Z][a-z]+(?:\s[A-Z]\.?)?)*)\s*(?:Published|PP\.|Pages?)/);
      if (authMatch) authors = authMatch[1].trim();
      
      articleBlocks.push({
        doi,
        title: title.substring(0, 300),
        authors: authors.substring(0, 500),
        type,
        publishedDate,
        year: 2024,
        volume,
        issue,
        pages,
        url: href
      });
    }
    return articleBlocks;
  });
  
  return data;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Load existing DOIs for deduplication
  const existingData = JSON.parse(fs.readFileSync('E:/Claw/JAC_Year/_existing_dois.json', 'utf8'));
  const existingDOIs = new Set(existingData);
  console.log(`Existing DOIs in DB: ${existingDOIs.size}`);

  const allArticles = [];
  const seen = new Set();

  try {
    // Warm up
    await page.goto('https://www.sciopen.com/journal/join_journal/journalInfo?journalId=' + JOURNAL_ID,
      { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    for (let i = 0; i < ISSUES.length; i++) {
      const issue = ISSUES[i];
      try {
        const articles = await parseIssuePage(page, issue);
        const newOnes = articles.filter(a => !seen.has(a.doi) && !existingDOIs.has(a.doi));
        newOnes.forEach(a => seen.add(a.doi));
        allArticles.push(...newOnes);
        console.log(`  Issue ${issue.issueNum}: found ${articles.length}, new ${newOnes.length} (total: ${allArticles.length})`);
        if (articles.length > 0) {
          console.log(`  Sample: ${articles[0].doi} | ${articles[0].title.substring(0, 60)} | ${articles[0].authors.substring(0, 40)}`);
        }
      } catch (e) {
        console.error(`  Error Issue ${issue.issueNum}: ${e.message}`);
      }
      if (i < ISSUES.length - 1) await page.waitForTimeout(1500);
    }

    console.log(`\n=== DONE: ${allArticles.length} new articles ===`);
    
    // Save
    fs.writeFileSync('E:/Claw/JAC_Year/_articles_2024_new.json', JSON.stringify(allArticles, null, 2), 'utf8');
    console.log('Saved to _articles_2024_new.json');
    
    allArticles.slice(0, 3).forEach(a => console.log(JSON.stringify(a)));
  } finally {
    await browser.close();
  }
})();
