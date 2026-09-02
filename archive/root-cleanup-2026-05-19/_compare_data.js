const initSqlJs = require('sql.js');
const fs = require('fs');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('jac_articles.db'));
  
  const r2024 = db.exec(`SELECT id, year, title, authors, funding, citation, email, abstract, keywords, received_date, accepted_date, published_date 
    FROM articles WHERE year=2024 LIMIT 2`);
  
  const r2025 = db.exec(`SELECT id, year, title, authors, funding, citation, email, abstract, keywords, received_date, accepted_date, published_date 
    FROM articles WHERE year=2025 LIMIT 2`);
  
  [r2024, r2025].forEach((r, yi) => {
    const year = yi === 0 ? 2024 : 2025;
    console.log(`\n=== ${year} 年 ===`);
    r[0].values.forEach(row => {
      const cols = r[0].columns;
      cols.forEach((c, i) => {
        const val = row[i];
        let display;
        if (val === null || val === undefined) display = 'NULL';
        else if (typeof val === 'string') display = val.substring(0, 100) + (val.length > 100 ? '...' : '');
        else display = String(val);
        console.log(`  ${c}: ${display}`);
      });
      console.log('---');
    });
  });
  
  db.close();
})();
