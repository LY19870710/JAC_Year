// Count how many articles have non-empty fundingStatements
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
  
  // Get ALL 204 articles
  const result = db.exec("SELECT doi FROM articles ORDER BY RANDOM()");
  db.close();
  
  const dois = result[0].values.map(r => r[0]);
  console.log(`Testing ${dois.length} articles for funding...`);
  
  let withFund = 0;
  let errors = 0;
  
  for (let i = 0; i < dois.length; i++) {
    const doi = dois[i];
    try {
      const raw = await httpsGet(`https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`);
      const json = JSON.parse(raw);
      const obj = json.object || {};
      const hasFund = obj.fundingStatements && obj.fundingStatements.length > 0;
      if (hasFund) {
        withFund++;
        console.log(`[${i+1}/${dois.length}] ✓ ${doi}: ${obj.fundingStatements.length} funding statements`);
      } else if ((i+1) % 20 === 0) {
        console.log(`[${i+1}/${dois.length}] ... ${withFund} with funding so far`);
      }
    } catch (e) {
      errors++;
      if (errors <= 3) console.log(`[${i+1}] ERROR ${doi}: ${e.message}`);
    }
    await sleep(1500);
  }
  
  console.log(`\n=== Final: ${withFund}/${dois.length} articles have funding (${errors} errors) ===`);
}

main();
