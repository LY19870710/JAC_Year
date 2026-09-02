const https = require('https');
const fs = require('fs');
const path = require('path');

const dbPath = 'E:\\Claw\\JAC_Year\\jac_articles.db';
const initSqlJs = require(path.join('E:\\Claw\\JAC_Year\\node_modules', 'sql.js'));

async function main() {
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuffer);
  
  const rows = db.exec("SELECT doi FROM articles ORDER BY id")[0].values;
  console.log(`Total: ${rows.length}`);
  
  let withAck = 0, withFund = 0, both = 0, checked = 0;
  
  const check = (doi) => new Promise((resolve) => {
    const apiUrl = `https://www.sciopen.com/article/full_text?doi=${doi}`;
    https.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let hasFund = false;
        try { hasFund = (JSON.parse(data).object?.fundingStatements || []).length > 0; } catch {}
        
        const pageUrl = `https://www.sciopen.com/article/${doi}`;
        https.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
          let html = '';
          res2.on('data', c => html += c);
          res2.on('end', () => {
            const m = html.match(/"acknowledgement"\s*:\s*"([^"]+)"/);
            const hasAck = m && m[1].length > 10;
            
            checked++;
            if (hasAck) withAck++;
            if (hasFund) withFund++;
            if (hasAck && hasFund) both++;
            
            if (checked % 20 === 0) console.log(`[${checked}/${rows.length}] ack=${withAck}, fund=${withFund}`);
            resolve();
          });
        }).on('error', () => resolve());
      });
    }).on('error', () => resolve());
  });
  
  for (let i = 0; i < rows.length; i++) {
    await check(rows[i][0]);
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n=== FINAL ===`);
  console.log(`With acknowledgement: ${withAck}/${rows.length} (${(withAck/rows.length*100).toFixed(1)}%)`);
  console.log(`With fundingStatements: ${withFund}/${rows.length} (${(withFund/rows.length*100).toFixed(1)}%)`);
  
  db.close();
}

main().catch(console.error);
