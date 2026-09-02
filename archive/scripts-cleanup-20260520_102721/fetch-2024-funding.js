/**
 * fetch-2024-funding.js — 只抓取 2024 年文章的 funding
 * node scripts/fetch-2024-funding.js [batchSize]
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const https = require('https');

const DELAY_MS = 2000;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function fetchFunding(doi) {
  const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
  try {
    const raw = await httpsGet(url);
    const json = JSON.parse(raw);
    const obj = json.object;
    if (obj?.fundingStatements && obj.fundingStatements.length > 0) {
      return obj.fundingStatements.join('\n');
    }
    return '';
  } catch (e) {
    return '';
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const batchSize = parseInt(process.argv[2]) || 20;
  
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('jac_articles.db'));
  
  // Get 2024 articles needing funding
  const r = db.exec(`SELECT id, doi, url FROM articles WHERE year=2024 AND (funding IS NULL OR funding = '')`);
  if (!r.length) {
    console.log('✅ 2024 年所有文章已有 funding');
    db.close();
    return;
  }
  
  const articles = r[0].values.map(row => ({
    id: row[0],
    doi: row[1],
    url: row[2]
  }));
  
  console.log(`\n📊 2024 年待抓取 funding: ${articles.length} 篇`);
  console.log(`⚙️  每批 ${batchSize} 篇\n`);
  
  let totalSuccess = 0;
  let batchNum = 0;
  
  while (batchNum * batchSize < articles.length) {
    batchNum++;
    const start = batchNum * batchSize - batchSize;
    const end = Math.min(start + batchSize, articles.length);
    const batch = articles.slice(start, end);
    
    console.log(`\n🔄 批次 ${batchNum}: 第 ${start + 1}-${end} 篇`);
    
    let batchSuccess = 0;
    for (let i = 0; i < batch.length; i++) {
      const article = batch[i];
      const funding = await fetchFunding(article.doi);
      
      if (funding) {
        db.run(`UPDATE articles SET funding = ? WHERE id = ?`, [funding, article.id]);
        console.log(`  ✅ ${article.doi}`);
        batchSuccess++;
        totalSuccess++;
      } else {
        console.log(`  ➖ ${article.doi}`);
      }
      
      if (i < batch.length - 1) {
        await sleep(DELAY_MS);
      }
    }
    
    console.log(`  📈 本批: ${batchSuccess}/${batch.length} 有funding | 累计: ${totalSuccess}/${articles.length}`);
    
    if (end < articles.length) {
      await sleep(3000);
    }
  }
  
  // Save
  const data = db.export();
  fs.writeFileSync('jac_articles.db', Buffer.from(data));
  
  console.log(`\n🎉 完成! 2024 年 ${totalSuccess}/${articles.length} 篇成功获取 funding`);
  
  db.close();
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
