const { chromium } = require('playwright');

const JOURNAL_ID = '1396776045425197058';
const ISSN = '2226-4108';
const ISSUE_URL = `https://www.sciopen.com/journal/join_journal/stage_page?stage=5&id=${JOURNAL_ID}&issueIndex=1751885172235108354&issn=${ISSN}`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(ISSUE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Get the raw text content
  const text = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT (first 5000 chars) ===');
  console.log(text.substring(0, 5000));
  console.log('===');

  // Analyze DOI links - find parent structure
  const analysis = await page.evaluate(() => {
    const dois = Array.from(document.querySelectorAll('a[href*="/article/10."]'));
    const results = [];
    for (let i = 0; i < Math.min(3, dois.length); i++) {
      const a = dois[i];
      const parent = a.parentElement;
      const grandparent = parent?.parentElement;
      const great = grandparent?.parentElement;
      results.push({
        doi: a.href.match(/(10\.\d{4,}\/[^\s<>"']+)/)?.[1] || a.href,
        linkText: a.textContent.trim().substring(0, 80),
        parentTag: parent?.tagName,
        parentClass: parent?.className?.substring(0, 80),
        grandparentTag: grandparent?.tagName,
        grandparentClass: grandparent?.className?.substring(0, 80),
        greatTag: great?.tagName,
        greatClass: great?.className?.substring(0, 80),
      });
    }
    return results;
  });
  console.log('\n=== DOM STRUCTURE ===');
  analysis.forEach((r, i) => {
    console.log(`\nArticle ${i+1}:`);
    console.log(`  DOI: ${r.doi}`);
    console.log(`  Link text: "${r.linkText}"`);
    console.log(`  Parent: <${r.parentTag}> class="${r.parentClass}"`);
    console.log(`  Grandparent: <${r.grandparentTag}> class="${r.grandparentClass}"`);
    console.log(`  Great: <${r.greatTag}> class="${r.greatClass}"`);
  });

  await browser.close();
})();
