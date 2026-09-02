/**
 * 邮箱抓取脚本 - v0.3.2 (改进版)
 * 从每篇文章详情页提取作者邮箱
 */
import { chromium } from 'playwright';
import { DatabaseManager } from '../src/database';

async function fetchEmails() {
  const db = new DatabaseManager();
  await db.init();
  
  const articles = db.getArticlesWithoutEmail();
  console.log(`需要抓取邮箱的文章: ${articles.length} 篇`);
  
  if (articles.length === 0) {
    console.log('所有文章已有邮箱');
    db.close();
    return;
  }
  
  const browser = await chromium.launch({ headless: true });
  
  let success = 0;
  let failed = 0;
  let retries = 0;
  const maxRetries = 3;
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    let page = null;
    
    try {
      console.log(`[${i+1}/${articles.length}] 抓取: ${article.doi}`);
      
      page = await browser.newPage();
      
      await page.goto(article.url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      // 点击 "Show Author Information" 按钮
      try {
        const authorBtn = await page.$('button:has-text("Author")');
        if (authorBtn) {
          await authorBtn.click();
          await page.waitForTimeout(500);
        }
      } catch (e) {
        // 可能没有这个按钮
      }
      
      const email = await page.evaluate(() => {
        // 查找 mailto: 链接
        const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
        if (mailtoLinks.length > 0) {
          return (mailtoLinks[0] as HTMLAnchorElement).href.replace('mailto:', '');
        }
        
        // 在页面文本中查找邮箱
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const pageText = document.body.innerText;
        const emails = pageText.match(emailRegex);
        
        if (emails && emails.length > 0) {
          const validEmails = emails.filter(e => 
            !e.includes('springer') && !e.includes('elsevier') && 
            !e.includes('wiley') && !e.includes('sciopen') &&
            !e.includes('editorial') && !e.includes('submission') &&
            !e.includes('contact') && !e.includes('info@') &&
            !e.includes('support') && !e.includes('composite')
          );
          return validEmails[0] || emails[0];
        }
        return '';
      });
      
      if (email) {
        db.updateEmail(article.doi, email);
        console.log(`  ✅ ${email}`);
        success++;
      } else {
        console.log(`  ⚠️ 未找到`);
        failed++;
      }
      
    } catch (err: any) {
      console.log(`  ❌ ${err.message}`);
      failed++;
    } finally {
      if (page) await page.close();
    }
    
    // 每10篇休息
    if ((i + 1) % 10 === 0) {
      console.log(`\n已处理 ${i+1} 篇，休息 3 秒...\n`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  await browser.close();
  db.close();
  
  console.log(`\n✅ 完成: 成功 ${success}, 失败 ${failed}`);
}

// CLI
if (require.main === module) {
  fetchEmails().catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
}

export { fetchEmails };
