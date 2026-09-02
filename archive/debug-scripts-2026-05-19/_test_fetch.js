// Quick test: fetch funding for a few known DOIs
const initSqlJs = require('sql.js');
const fs = require('fs');
const https = require('https');

const DB_PATH = 'E:/Claw/JAC_Year/jac_articles.db';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, */*',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return resolve(httpsGet(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

function extractFunding(body) {
  try {
    const json = JSON.parse(body);
    for (const key of Object.keys(json).sort((a, b) => Number(a) - Number(b))) {
      const item = json[key];
      if (typeof item !== 'object' || !item) continue;
      const title = String(item.title || '').toLowerCase();
      const content = String(item.content || '');
      
      if (title.includes('acknowledgement') || title.includes('funding') ||
          title.includes('致谢') || title.includes('基金')) {
        const clean = content.replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        return clean;
      }
    }
    
    // Check all sections for funding keywords
    for (const key of Object.keys(json).sort((a, b) => Number(a) - Number(b))) {
      const item = json[key];
      if (typeof item !== 'object' || !item) continue;
      const content = String(item.content || '');
      if (content.length < 100) continue;
      const clean = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      
      if ((clean.includes('Foundation') && clean.includes('Grant')) ||
          clean.includes('Acknowledgement') || clean.includes('Funding Statement') ||
          clean.includes('Supported by') || clean.includes('financed by')) {
        return clean;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function fetchFunding(doi) {
  const ftUrl = 'https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi);
  const ft = await httpsGet(ftUrl);
  const ftJson = JSON.parse(ft.body);
  const fullTextUrl = ftJson.object?.fullTextUrl;
  
  if (!fullTextUrl) return null;
  
  const ft2 = await httpsGet(fullTextUrl);
  return extractFunding(ft2.body);
}

async function main() {
  // Get 3 articles without funding from 2024
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  
  const r = db.exec(
    `SELECT id, doi, title FROM articles 
     WHERE (funding IS NULL OR funding = '') AND year = 2024
     ORDER BY id ASC LIMIT 5`
  );
  
  if (!r.length) {
    console.log('No articles without funding');
    db.close();
    return;
  }
  
  const articles = r[0].values.map(row => ({ id: row[0], doi: row[1], title: row[2] }));
  console.log('Testing', articles.length, 'articles:\n');
  
  for (const article of articles) {
    console.log(`${article.id} | ${article.doi}`);
    console.log(`  Title: ${article.title}`);
    
    const funding = await fetchFunding(article.doi);
    
    if (funding) {
      console.log(`  Funding (${funding.length} chars): ${funding.substring(0, 200)}...`);
      // Save it
      const stmt = db.prepare('UPDATE articles SET funding = ? WHERE id = ?');
      stmt.bind([funding, article.id]);
      stmt.step();
      stmt.free();
      console.log('  [SAVED]');
    } else {
      console.log('  No funding found');
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  
  // Final count
  const withFunding = db.exec("SELECT COUNT(*) FROM articles WHERE funding IS NOT NULL AND funding != ''")[0].values[0][0];
  console.log(`\nTotal with funding: ${withFunding}/378`);
  
  db.close();
}

main().catch(e => console.error(e));
