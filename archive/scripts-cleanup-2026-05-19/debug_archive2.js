const { chromium } = require('../sciopen_scraper/node_modules/playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 拦截所有 API 请求（更宽泛）
  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (!url.includes('google') && !url.includes('baidu') && !url.includes('linkedin')) {
      apiCalls.push({ method: req.method(), url: url.substring(0, 150) });
    }
  });
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('sciopen') && !url.includes('.js') && !url.includes('.css') && !url.includes('.png')) {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const body = await resp.text();
          console.log('JSON response from:', url.substring(0, 100));
          console.log(body.substring(0, 300));
          console.log('---');
        }
      } catch(e) {}
    }
  });

  const url = 'https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume=2025&issn=2226-4108';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // 检查右侧内容
  const rightContent = await page.evaluate(() => {
    const right = document.querySelector('.archive-main-right');
    if (!right) return 'NO .archive-main-right';
    return {
      html: right.innerHTML.substring(0, 500),
      children: Array.from(right.children).map(c => ({ tag: c.tagName, class: c.className, text: c.textContent?.trim().substring(0, 50) }))
    };
  });
  console.log('\n=== Right Panel ===');
  console.log(JSON.stringify(rightContent, null, 2));

  // 检查是否有 issue 列表
  const issueLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links
      .filter(a => a.href.includes('issueIndex') || a.href.includes('issue') || a.textContent?.includes('Issue'))
      .map(a => ({ text: a.textContent?.trim().substring(0, 50), href: a.href.substring(0, 100) }))
      .slice(0, 20);
  });
  console.log('\n=== Issue Links ===');
  issueLinks.forEach(l => console.log(JSON.stringify(l)));

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
