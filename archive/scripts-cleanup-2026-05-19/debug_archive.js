const { chromium } = require('../sciopen_scraper/node_modules/playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 拦截 XHR/Fetch 请求
  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('api') || url.includes('article') || url.includes('issue') || url.includes('archive')) {
      apiCalls.push({ method: req.method(), url: url.substring(0, 120) });
    }
  });

  const url = 'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=2025&issn=2226-4108';
  console.log('Loading:', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // 打印拦截到的 API 请求
  console.log('\n=== API Calls ===');
  apiCalls.forEach(c => console.log(c.method, c.url));

  // 检查页面结构
  const structure = await page.evaluate(() => {
    const info = [];
    // 找年份/issue 列表
    const leftItems = document.querySelectorAll('.archive-main-left li, .archive-main-left a, [class*="year"], [class*="issue"]');
    leftItems.forEach(el => {
      info.push({ tag: el.tagName, class: el.className, text: el.textContent?.trim().substring(0, 50), href: el.getAttribute('href') });
    });
    return info.slice(0, 20);
  });
  console.log('\n=== Left Panel Items ===');
  structure.forEach(s => console.log(JSON.stringify(s)));

  // 尝试点击第一个 issue
  const firstIssue = await page.$('.archive-main-left a, [class*="issue"] a');
  if (firstIssue) {
    console.log('\nClicking first issue...');
    await firstIssue.click();
    await page.waitForTimeout(3000);

    const afterClick = apiCalls.slice();
    console.log('\n=== API Calls after click ===');
    afterClick.forEach(c => console.log(c.method, c.url));
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
