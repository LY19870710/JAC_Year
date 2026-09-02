const initSqlJs = require('sql.js');
const fs = require('fs');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('jac_articles.db'));
  
  const r2024 = db.exec(`SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN funding IS NOT NULL AND funding != '' THEN 1 ELSE 0 END) as has_funding
    FROM articles WHERE year=2024`);
  
  const r2025 = db.exec(`SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN funding IS NOT NULL AND funding != '' THEN 1 ELSE 0 END) as has_funding
    FROM articles WHERE year=2025`);
  
  console.log('2024:', r2024[0].values[0]);
  console.log('2025:', r2025[0].values[0]);
  
  db.close();
})();
