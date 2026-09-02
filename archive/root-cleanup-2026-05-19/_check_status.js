const initSqlJs = require('sql.js');
const fs = require('fs');
const https = require('https');

const DB_PATH = 'E:/Claw/JAC_Year/jac_articles.db';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  
  // Get a sample with and without funding from 2024
  const r = db.exec(`
    SELECT id, doi, funding FROM articles 
    WHERE year = 2024 AND id IN (1141, 1147, 1155, 1175, 1177, 1200, 1220)
    ORDER BY id
  `);
  
  if (!r.length) { db.close(); return; }
  
  console.log('=== 2024 Articles DB Status ===');
  for (const row of r[0].values) {
    const f = row[2] || '';
    console.log(`${row[0]} | ${row[1]} | funding_len=${f.length}`);
    if (f.length > 0) console.log(`  Preview: ${f.substring(0, 100)}`);
  }
  
  // Also check: what's the highest id for 2024 articles without funding?
  const r2 = db.exec(`SELECT COUNT(*) FROM articles WHERE year=2024 AND (funding IS NULL OR funding = '')`);
  const r3 = db.exec(`SELECT COUNT(*) FROM articles WHERE year=2024 AND funding IS NOT NULL AND funding != ''`);
  console.log(`\n2024: ${r3[0].values[0][0]} have funding, ${r2[0].values[0][0]} without`);
  
  const r4 = db.exec(`SELECT COUNT(*) FROM articles WHERE year=2025 AND (funding IS NULL OR funding = '')`);
  const r5 = db.exec(`SELECT COUNT(*) FROM articles WHERE year=2025 AND funding IS NOT NULL AND funding != ''`);
  console.log(`2025: ${r5[0].values[0][0]} have funding, ${r4[0].values[0][0]} without`);
  
  // Now test: does SciOpen full_text return acknowledgment for 2025 articles?
  console.log('\n=== Testing 2025 article ===');
  const r6 = db.exec(`SELECT id, doi FROM articles WHERE year=2025 AND (funding IS NULL OR funding = '') LIMIT 2`);
  if (r6.length) {
    for (const row of r6[0].values) {
      const doi = row[1];
      console.log(`\nTesting: ${doi}`);
      
      const ftUrl = 'https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi);
      try {
        const ftBody = await httpsGet(ftUrl);
        const ftJson = JSON.parse(ftBody);
        const fullTextUrl = ftJson.object?.fullTextUrl;
        console.log('fullTextUrl available:', !!fullTextUrl);
        
        if (fullTextUrl) {
          const ft2Body = await httpsGet(fullTextUrl);
          const json = JSON.parse(ft2Body);
          
          // List all section titles
          const keys = Object.keys(json).sort((a, b) => Number(a) - Number(b));
          console.log('Sections:', keys.length);
          for (const key of keys) {
            const item = json[key];
            if (typeof item === 'object' && item) {
              const title = String(item.title || '').trim();
              const content = String(item.content || '').length;
              const hasAck = title.toLowerCase().includes('acknow') || title.includes('funding') || title.includes('致谢');
              console.log(`  [${key}] "${title}" (${content} chars) ${hasAck ? '★' : ''}`);
            }
          }
        }
      } catch (e) {
        console.log('Error:', e.message);
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  
  db.close();
}

main().catch(e => console.error(e));
