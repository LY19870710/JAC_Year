const { chromium } = require('playwright');

const ARCHIVE_URL = 'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=2024&issn=2226-4108';
const JAC_ISSN = '2226-4108';
const JOURNAL_ID = '1396776045425197058';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allArticles = [];
  const seen = new Set();

  try {
    // Step 1: Get all issue links from archive page
    console.log('Step 1: Loading archive page...');
    await page.goto(ARCHIVE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const issueLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links
        .filter(a => a.href.includes('stage_page') && a.href.includes('issueIndex'))
        .map(a => {
          const m = a.href.match(/issueIndex=(\d+)/);
          return { text: a.textContent.trim(), href: a.href, issueIndex: m ? m[1] : null };
        });
    });
    console.log(`Found ${issueLinks.length} issues`);
    issueLinks.forEach(il => console.log(`  ${il.text}: ${il.issueIndex}`));

    // Step 2: For each issue, get articles
    for (let i = 0; i < issueLinks.length; i++) {
      const issue = issueLinks[i];
      console.log(`\nStep 2: Issue ${i + 1}/${issueLinks.length} - ${issue.text}`);

      try {
        await page.goto(issue.href, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);

        const articles = await page.evaluate((journalId, issn) => {
          const results = [];
          const seen = new Set();
          const links = Array.from(document.querySelectorAll('a[href*="/article/"]'));
          links.forEach(a => {
            const m = a.href.match(/10\.\d{4,}\/[^\s<>"']+/);
            if (!m) return;
            const doi = m[0];
            if (seen.has(doi)) return;
            seen.add(doi);

            // Get title
            let title = a.textContent.trim();
            if (!title) {
              // Try parent or sibling
              const parent = a.parentElement;
              title = parent ? parent.textContent.trim() : '';
            }

            // Get authors from nearby element
            let authors = '';
            const parent = a.closest('div');
            if (parent) {
              const authorEl = parent.querySelector('[class*="author"], [class*="author"]');
              if (authorEl) authors = authorEl.textContent.trim();
              // Try next sibling
              if (!authors) {
                const allDivs = Array.from(document.querySelectorAll('div'));
                for (const div of allDivs) {
                  if (div.textContent.includes(title.substring(0, 20)) && div.textContent.includes('Published')) {
                    const idx = div.textContent.indexOf(title);
                    const before = div.textContent.substring(Math.max(0, idx - 200), idx);
                    const authMatch = before.match(/([A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)*(?:\s*,\s*\[\.\.\.\]\s*,\s*[A-Z][a-z]+)*)/);
                    if (authMatch) authors = authMatch[1].trim();
                    break;
                  }
                }
              }
            }

            // Get type and date
            let type = 'Research Article';
            let publishedDate = '';
            const pageText = document.body.innerText;
            const articleText = a.closest('div') ? a.closest('div').textContent : pageText;
            if (articleText.includes('Review')) type = 'Review';
            else if (articleText.includes('Editorial')) type = 'Editorial';
            const pubMatch = articleText.match(/Published:\s*(\d+\s+\w+\s+\d{4})/);
            if (pubMatch) publishedDate = pubMatch[1];

            // Get volume/issue/page info
            let vol = '', iss = '', pp = '';
            const volMatch = articleText.match(/(\d+)\s*\(\s*(\d+)\s*\):\s*(\d+)/);
            if (volMatch) { vol = volMatch[1]; iss = volMatch[2]; pp = volMatch[3]; }

            results.push({
              doi,
              title: title.substring(0, 200),
              authors: authors.substring(0, 500),
              type,
              publishedDate,
              year: 2024,
              volume: vol,
              issue: iss,
              page: pp,
              url: a.href
            });
          });
          return results;
        }, JOURNAL_ID, JAC_ISSN);

        const newArticles = articles.filter(a => !seen.has(a.doi));
        newArticles.forEach(a => seen.add(a.doi));
        allArticles.push(...newArticles);
        console.log(`  Found ${articles.length} articles, ${newArticles.length} new`);
      } catch (e) {
        console.error(`  Error: ${e.message}`);
      }

      // Rate limit between issues
      if (i < issueLinks.length - 1) {
        await page.waitForTimeout(2000);
      }
    }

    console.log(`\nTotal articles collected: ${allArticles.length}`);

    // Save to JSON
    const fs = require('fs');
    fs.writeFileSync('E:/Claw/JAC_Year/_articles_2024_raw.json', JSON.stringify(allArticles, null, 2), 'utf8');
    console.log('Saved to _articles_2024_raw.json');

    allArticles.slice(0, 3).forEach(a => console.log(JSON.stringify(a)));
  } catch (e) {
    console.error('Fatal error:', e.message);
  } finally {
    await browser.close();
  }
})();
