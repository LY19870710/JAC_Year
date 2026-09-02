// Quick test: check 2025 articles for funding availability
const https = require('https');
const initSqlJs = require('sql.js');
const fs = require('fs');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const SQL = await initSqlJs();
  const data = fs.readFileSync('E:\\Claw\\JAC_Year\\jac_articles.db');
  const db = new SQL.Database(data);
  
  // Get 10 2025 articles
  const result = db.exec("SELECT doi, title FROM articles WHERE year = 2025 ORDER BY doi DESC LIMIT 10");
  db.close();
  
  const dois = result[0].values;
  let withFund = 0, withEmail = 0;
  
  for (const [doi, title] of dois) {
    // Check funding
    const raw = await httpsGet(`https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`);
    try {
      const json = JSON.parse(raw);
      const obj = json.object || {};
      const hasFund = obj.fundingStatements && obj.fundingStatements.length > 0;
      if (hasFund) withFund++;
      
      // Get emails from HTML
      const html = await httpsGet(`https://www.sciopen.com/article/${doi}`);
      const emailPat = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const exclude = ['sciopen.com', 'baidu.com', 'wqketang', 'google', 'linkedin', 'trendmd', 'altmetric', 'izhixue.cn'];
      const emails = new Set();
      let m;
      while ((m = emailPat.exec(html)) !== null) {
        const e = m[0].toLowerCase();
        if (!exclude.some(x => e.includes(x))) emails.add(e);
      }
      if (emails.size > 0) withEmail++;
      
      const shortTitle = String(title).substring(0, 40);
      console.log(`${doi} | fund=${hasFund ? obj.fundingStatements.length : 0} | emails=${emails.size} | ${shortTitle}`);
      if (hasFund) {
        console.log(`  Funding: ${obj.fundingStatements[0].substring(0, 100)}...`);
      }
      if (emails.size > 0) {
        console.log(`  Emails: ${[...emails].join(', ')}`);
      }
    } catch (e) {
      console.log(`${doi} | ERROR: ${e.message}`);
    }
    await sleep(2000);
  }
  
  console.log(`\n=== 2025 articles (10 tested) ===`);
  console.log(`With funding: ${withFund}/10`);
  console.log(`With email: ${withEmail}/10`);
}

main();
