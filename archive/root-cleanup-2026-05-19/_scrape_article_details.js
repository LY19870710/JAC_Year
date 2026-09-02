const { chromium } = require('playwright');
const fs = require('fs');

const JOURNAL_ID = '1396776045425197058';
const ISSN = '2226-4108';

// Load the raw articles (just DOIs/URLs)
const raw = JSON.parse(fs.readFileSync('E:/Claw/JAC_Year/_articles_2024_raw.json', 'utf8'));
console.log(`Loaded ${raw.length} raw articles`);

// Check which DOIs are already in DB
const existingData = JSON.parse(fs.readFileSync('E:/Claw/JAC_Year/_existing_dois.json', 'utf8'));
const existingDOIs = new Set(existingData);
console.log(`Existing DOIs in DB: ${existingDOIs.size}`);

const toScrape = raw.filter(a => !existingDOIs.has(a.doi));
console.log(`Need to scrape: ${toScrape.length}`);

if (toScrape.length === 0) {
  console.log('All articles already in DB, nothing to do.');
  process.exit(0);
}

// Scrape article details one by one
async function scrapeArticle(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  return await page.evaluate(() => {
    const result = {
      title: '',
      authors: '',
      publishedDate: '',
      receivedDate: '',
      acceptedDate: '',
      volume: '',
      issue: '',
      pages: '',
      abstract: '',
      doi: '',
      url: window.location.href
    };

    // DOI
    const doiEl = document.querySelector('[class*="doi"], [class*="DOI"], a[href*="doi.org"]');
    if (doiEl) {
      const href = doiEl.href || doiEl.textContent;
      const m = href.match(/(10\.\d{4,}\/[^\s<>"']+)/);
      if (m) result.doi = m[1];
    }
    if (!result.doi) {
      const m = window.location.href.match(/(10\.\d{4,}\/[^\s<>"']+)/);
      if (m) result.doi = m[1];
    }

    // Title
    const titleEl = document.querySelector('[class*="title"], h1, h2[class*="title"]');
    if (titleEl) result.title = titleEl.textContent.trim();

    // Authors
    const authorEls = document.querySelectorAll('[class*="author"] a, [class*="author-name"], [class*="author_name"]');
    if (authorEls.length) {
      result.authors = Array.from(authorEls).map(a => a.textContent.trim()).filter(t => t && t.length < 100).join(', ');
    }

    // Dates
    const pageText = document.body.innerText;
    const pubMatch = pageText.match(/Published:\s*(\d+\s+\w+\s+\d{4})/);
    if (pubMatch) result.publishedDate = pubMatch[1];
    const recMatch = pageText.match(/Received:\s*(\d+\s+\w+\s+\d{4})/);
    if (recMatch) result.receivedDate = recMatch[1];
    const accMatch = pageText.match(/Accepted:\s*(\d+\s+\w+\s+\d{4})/);
    if (accMatch) result.acceptedDate = accMatch[1];

    // Volume/Issue/Pages
    const volMatch = pageText.match(/Vol(?:ume)?[\s.]*(\d+)[\s,]+(?:Issue|No)[\s.]*(\d+)[\s:]+(?:PP?|Pages?)[\s.]*(\d+[–-]\d+)/i);
    if (volMatch) { result.volume = volMatch[1]; result.issue = volMatch[2]; result.pages = volMatch[3]; }
    else {
      const simpleMatch = pageText.match(/(\d{4})[\s,]+(\d+)\((\d+)\):\s*(\d+[–-]\d+)/);
      if (simpleMatch) { result.volume = simpleMatch[2]; result.issue = simpleMatch[3]; result.pages = simpleMatch[4]; }
    }

    // Abstract
    const absEl = document.querySelector('[class*="abstract"], section[class*="abstract"], [id*="abstract"]');
    if (absEl) {
      let text = absEl.textContent.trim();
      text = text.replace(/^Abstract\s*/i, '');
      result.abstract = text.substring(0, 2000);
    }

    return result;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];
  const errors = [];

  for (let i = 0; i < toScrape.length; i++) {
    const article = toScrape[i];
    console.log(`[${i+1}/${toScrape.length}] ${article.doi}`);

    try {
      const details = await scrapeArticle(page, article.url);
      results.push(details);
      if (i % 20 === 0 || i === toScrape.length - 1) {
        fs.writeFileSync('E:/Claw/JAC_Year/_articles_2024_details_partial.json', JSON.stringify(results, null, 2), 'utf8');
        console.log(`  Saved partial: ${results.length} articles`);
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      errors.push({ doi: article.doi, url: article.url, error: e.message });
    }

    // Rate limit
    if (i < toScrape.length - 1) await page.waitForTimeout(1500);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Scraped: ${results.length}, Errors: ${errors.length}`);

  fs.writeFileSync('E:/Claw/JAC_Year/_articles_2024_details.json', JSON.stringify(results, null, 2), 'utf8');
  if (errors.length) {
    fs.writeFileSync('E:/Claw/JAC_Year/_scrape_errors.json', JSON.stringify(errors, null, 2), 'utf8');
  }
  console.log('Saved to _articles_2024_details.json');

  results.slice(0, 2).forEach(a => console.log(JSON.stringify(a)));

  await browser.close();
})();
