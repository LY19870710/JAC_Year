const https = require('https');
const initSqlJs = require('sql.js');
const fs = require('fs');

function fetchArticle(doi) {
  return new Promise((resolve, reject) => {
    const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.object || json);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', e => resolve(null));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const SQL = await initSqlJs();
  const data = fs.readFileSync('E:\\Claw\\JAC_Year\\jac_articles.db');
  const db = new SQL.Database(data);
  const result = db.exec('SELECT doi FROM articles LIMIT 20');
  db.close();

  const dois = result[0].values.map(r => r[0]);
  let withFunding = 0;
  let withBio = 0;
  let withFn = 0;

  for (const doi of dois) {
    const obj = await fetchArticle(doi);
    if (!obj) { console.log(`${doi}: fetch failed`); continue; }
    
    const hasFund = obj.fundingStatements && obj.fundingStatements.length > 0;
    const hasBio = obj.bio && obj.bio.length > 0;
    const hasFn = obj.fn && obj.fn.length > 0;
    
    if (hasFund) withFunding++;
    if (hasBio) withBio++;
    if (hasFn) withFn++;
    
    console.log(`${doi}: fund=${hasFund ? obj.fundingStatements.length : 0}, bio=${hasBio ? obj.bio.length : 0}, fn=${hasFn ? obj.fn.length : 0}`);
    
    await sleep(1500); // rate limit
  }

  console.log(`\n=== Summary (20 articles) ===`);
  console.log(`With funding: ${withFunding}/20`);
  console.log(`With bio: ${withBio}/20`);
  console.log(`With fn: ${withFn}/20`);
}

main();
