const initSqlJs = require('sql.js');
const fs = require('fs');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('jac_articles.db'));
  
  // Check 2024 funding status more carefully
  const r2024 = db.exec(`SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN funding IS NOT NULL AND funding != '' THEN 1 ELSE 0 END) as has_funding,
    SUM(CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) as has_email,
    SUM(CASE WHEN abstract IS NOT NULL AND abstract != '' THEN 1 ELSE 0 END) as has_abstract,
    SUM(CASE WHEN keywords IS NOT NULL AND keywords != '' THEN 1 ELSE 0 END) as has_keywords,
    SUM(CASE WHEN received_date IS NOT NULL AND received_date != '' THEN 1 ELSE 0 END) as has_received,
    SUM(CASE WHEN accepted_date IS NOT NULL AND accepted_date != '' THEN 1 ELSE 0 END) as has_accepted,
    SUM(CASE WHEN published_date IS NOT NULL AND published_date != '' THEN 1 ELSE 0 END) as has_published
    FROM articles WHERE year=2024`);
  
  const r2025 = db.exec(`SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN funding IS NOT NULL AND funding != '' THEN 1 ELSE 0 END) as has_funding,
    SUM(CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) as has_email,
    SUM(CASE WHEN abstract IS NOT NULL AND abstract != '' THEN 1 ELSE 0 END) as has_abstract,
    SUM(CASE WHEN keywords IS NOT NULL AND keywords != '' THEN 1 ELSE 0 END) as has_keywords,
    SUM(CASE WHEN received_date IS NOT NULL AND received_date != '' THEN 1 ELSE 0 END) as has_received,
    SUM(CASE WHEN accepted_date IS NOT NULL AND accepted_date != '' THEN 1 ELSE 0 END) as has_accepted,
    SUM(CASE WHEN published_date IS NOT NULL AND published_date != '' THEN 1 ELSE 0 END) as has_published
    FROM articles WHERE year=2025`);
  
  console.log('=== 2024 (Volume 13) ===');
  console.log(r2024[0]);
  console.log('=== 2025 (Volume 14) ===');
  console.log(r2025[0]);
  
  db.close();
})();
