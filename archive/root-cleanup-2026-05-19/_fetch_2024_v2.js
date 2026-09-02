const { chromium } = require('playwright');
const fs = require('fs');

const JOURNAL_ID = '1396776045425197058';
const ISSN = '2226-4108';

// Hardcoded issueIndex → issue number mapping (confirmed from archive page)
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

async function scrapeIssue(page, issue) {
  const url = BASE_ISSUE_URL.replace('{{issueIndex}}', issue.issueIndex);
  console.log(`  Loading Issue ${issue.issueNum}...`);
  
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const articles = await page.evaluate(() => {
    const results = [];
    const seen = new Set();
    const articleEls = document.querySelectorAll('[class*="article"], [class*="list-item"], div[class*="item"]');
    
    // Try finding article links via DOI pattern
    const links = Array.from(document.querySelectorAll('a[href]'));
    for (const a of links) {
      const href = a.href;
      // Match DOI in URL
      const m = href.match(/(10\.\d{4,}\/[^\s<>"']+)/);
      if (!m) continue;
      const doi = m[1];
      if (seen.has(doi)) continue;
      seen.add(doi);

      // Get title — try multiple approaches
      let title = a.textContent.trim();
      if (!title || title.length < 5) {
        // Try parent's text
        const parent = a.parentElement;
        if (parent) {
          const siblings = Array.from(parent.querySelectorAll('a'));
          for (const sa of siblings) {
            const st = sa.textContent.trim();
            if (st && st.length > 10 && !st.includes('@') && st.length < 300) {
              title = st;
              break;
            }
          }
        }
      }
      if (!title || title.length < 5) title = '(title not found)';
      title = title.substring(0, 200);

      // Get type
      let type = 'Research Article';
      const parentText = a.closest('div') ? a.closest('div').textContent : '';
      if (parentText.includes('Review')) type = 'Review';
      else if (parentText.includes('Editorial')) type = 'Editorial';
      else if (parentText.includes('Feature Article')) type = 'Feature Article';

      // Get published date
      let publishedDate = '';
      const pubMatch = parentText.match(/Published:\s*(\d+\s+\w+\s+\d{4})/);
      if (pubMatch) publishedDate = pubMatch[1];

      // Get volume/issue/page
      let volume = '', issue = '', pages = '';
      const volMatch = parentText.match(/(\d{4})[\s,]+(\d+)\((\d+)\):\s*(\d+)/);
      if (volMatch) { /* year=volMatch[1], issue=volMatch[2], issue=volMatch[3], pages=volMatch[4] */ }
      const simpleMatch = parentText.match(/(\d+)\s*\(\s*(\d+)\s*\):\s*(\d+[-\d]*)/);
      if (simpleMatch) { volume = simpleMatch[1]; issue = simpleMatch[2]; pages = simpleMatch[3]; }

      // Get authors
      let authors = '';
      const authEl = a.closest('div')?.querySelector('[class*="author"], [class*="author"], span[class*="author"]');
      if (authEl) authors = authEl.textContent.trim().substring(0, 500);

      results.push({
        doi,
        title,
        authors,
        type,
        publishedDate,
        year: 2024,
        volume,
        issue,
        pages,
        url: href
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

  const allArticles = [];
  const seenDOIs = new Set();

  try {
    // Visit main page first to set cookies
    console.log('Warming up: visiting main page...');
    await page.goto('https://www.sciopen.com/journal/join_journal/journalInfo?journalId=' + JOURNAL_ID, 
      { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    for (let i = 0; i < ISSUES.length; i++) {
      const issue = ISSUES[i];
      console.log(`\n[${i+1}/${ISSUES.length}] Issue ${issue.issueNum}`);

      try {
        const articles = await scrapeIssue(page, issue);
        const newArticles = articles.filter(a => !seenDOIs.has(a.doi));
        newArticles.forEach(a => seenDOIs.add(a.doi));
        allArticles.push(...newArticles);
        console.log(`  Found ${articles.length} articles, ${newArticles.length} new (total: ${allArticles.length})`);
        
        if (articles.length > 0) {
          console.log(`  Sample: ${articles[0].doi} - ${articles[0].title.substring(0, 60)}`);
        }
      } catch (e) {
        console.error(`  Error: ${e.message}`);
      }

      if (i < ISSUES.length - 1) await page.waitForTimeout(2000);
    }

    console.log(`\n=== DONE ===`);
    console.log(`Total articles: ${allArticles.length}`);

    // Deduplicate by DOI
    const unique = [];
    const uniqueDOIs = new Set();
    for (const a of allArticles) {
      if (!uniqueDOIs.has(a.doi)) {
        uniqueDOIs.add(a.doi);
        unique.push(a);
      }
    }
    console.log(`Unique articles: ${unique.length}`);

    fs.writeFileSync('E:/Claw/JAC_Year/_articles_2024_raw.json', JSON.stringify(unique, null, 2), 'utf8');
    console.log('Saved to _articles_2024_raw.json');
    unique.slice(0, 3).forEach(a => console.log(JSON.stringify(a)));
  } catch (e) {
    console.error('Fatal:', e.message);
  } finally {
    await browser.close();
  }
})();
