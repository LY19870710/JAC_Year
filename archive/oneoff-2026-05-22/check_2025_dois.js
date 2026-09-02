const https = require('https');
const fs = require('fs');

// Load sql.js
const initSqlJs = require('sql.js');

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('E:\\Claw\\JAC_Year\\jac_articles.db'));

  // Check 2025 articles
  const rows = db.exec(`
    SELECT doi, title, volume, issue, published_date, abstract, keywords, received_date
    FROM articles
    WHERE volume = 14 OR volume = 13 AND published_date LIKE '2025%'
    ORDER BY doi
    LIMIT 10
  `);

  if (!rows.length) {
    // Try to find what volume 2025 articles have
    const volRows = db.exec(`SELECT DISTINCT volume FROM articles ORDER BY volume`);
    console.log('Available volumes:', volRows[0]?.values?.map(v => v[0]));
    
    // Check 2024 volume count
    const count2024 = db.exec(`SELECT COUNT(*) FROM articles WHERE volume = 13`);
    const count2025 = db.exec(`SELECT COUNT(*) FROM articles WHERE volume = 14`);
    console.log('2024 (v13):', count2024[0]?.values?.[0]?.[0]);
    console.log('2025 (v14):', count2025[0]?.values?.[0]?.[0]);
    
    // Sample 2025 DOIs
    const dois2025 = db.exec(`SELECT doi, published_date FROM articles ORDER BY doi DESC LIMIT 5`);
    console.log('\nLatest DOIs:');
    dois2025[0]?.values?.forEach(r => console.log(' ', r[0], r[1]));
    return;
  }

  console.log('Found articles:');
  rows[0].values.forEach(r => {
    console.log('DOI:', r[0]);
    console.log('  Title:', r[1]?.substring(0, 80));
    console.log('  Vol/Issue:', r[2], r[3]);
    console.log('  Published:', r[4]);
    console.log('  Abstract len:', r[5]?.length || 0);
    console.log('  Keywords:', r[6]?.substring(0, 80) || '(empty)');
    console.log('  Received:', r[7] || '(empty)');
    console.log('');
  });
}

main().catch(console.error);
