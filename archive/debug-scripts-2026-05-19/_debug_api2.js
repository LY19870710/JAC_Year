const initSqlJs = require('sql.js');
const fs = require('fs');
const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
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

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('jac_articles.db'));
  
  // Get 2024 articles that DO have funding (to compare)
  const r = db.exec(`SELECT doi, funding FROM articles WHERE year=2024 AND funding IS NOT NULL AND funding != '' LIMIT 5`);
  
  if (!r.length) {
    console.log('No 2024 articles with funding found');
    db.close();
    return;
  }
  
  console.log('=== 2024 articles WITH funding (checking if API matches) ===\n');
  
  for (const row of r[0].values) {
    const doi = row[0];
    const funding = row[1];
    console.log(`DOI: ${doi}`);
    console.log(`DB funding: ${funding.substring(0, 100)}...`);
    
    const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
    try {
      const raw = await httpsGet(url);
      const json = JSON.parse(raw);
      const obj = json.object;
      console.log(`API fundingStatements: ${JSON.stringify(obj?.fundingStatements)}`);
    } catch (e) {
      console.log(`API Error: ${e.message}`);
    }
    console.log('');
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  db.close();
}

main().catch(e => console.error(e));
