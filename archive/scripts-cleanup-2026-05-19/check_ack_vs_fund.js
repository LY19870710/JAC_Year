const https = require('https');
const fs = require('fs');
const path = require('path');

// Load database
const dbPath = 'E:\\Claw\\JAC_Year\\jac_articles.db';
const initSqlJs = require(path.join('E:\\Claw\\JAC_Year\\node_modules', 'sql.js'));

async function main() {
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuffer);
  
  const rows = db.exec("SELECT doi FROM articles ORDER BY id")[0].values;
  console.log(`Total articles: ${rows.length}`);
  
  let withAck = 0;
  let withFund = 0;
  let both = 0;
  let checked = 0;
  
  const checkArticle = (doi) => new Promise((resolve) => {
    // Check full_text API for fundingStatements
    const apiUrl = `https://www.sciopen.com/article/full_text?doi=${doi}`;
    
    https.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let hasFund = false;
        try {
          const json = JSON.parse(data);
          const fs = json.object?.fundingStatements || [];
          hasFund = fs.length > 0;
        } catch (e) {}
        
        // Check HTML page for acknowledgement
        const pageUrl = `https://www.sciopen.com/article/${doi}`;
        https.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
          let html = '';
          res2.on('data', chunk => html += chunk);
          res2.on('end', () => {
            const ackMatch = html.match(/"acknowledgement"\s*:\s*"([^"]+)"/);
            const hasAck = ackMatch && ackMatch[1].length > 10;
            
            checked++;
            if (hasAck) withAck++;
            if (hasFund) withFund++;
            if (hasAck && hasFund) both++;
            
            if (checked % 10 === 0) {
              console.log(`[${checked}/${rows.length}] ack=${withAck}, fund=${withFund}, both=${both}`);
            }
            resolve();
          });
        }).on('error', () => resolve());
      });
    }).on('error', () => resolve());
  });
  
  // Check first 50 articles
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    await checkArticle(rows[i][0]);
    await new Promise(r => setTimeout(r, 800)); // Rate limit
  }
  
  console.log(`\n=== Final (50 checked) ===`);
  console.log(`With acknowledgement: ${withAck}`);
  console.log(`With fundingStatements: ${withFund}`);
  console.log(`Both: ${both}`);
  
  db.close();
}

main().catch(console.error);
