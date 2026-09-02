const initSqlJs = require('sql.js');
const fs = require('fs');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('jac_articles.db'));
  
  // Get all 2024 DOIs that still need funding
  const r = db.exec(`SELECT doi FROM articles WHERE year=2024 AND (funding IS NULL OR funding = '')`);
  
  if (!r.length) {
    console.log('✅ 2024 年所有文章已有 funding');
    db.close();
    return;
  }
  
  const dois = r[0].values.map(row => row[0]);
  console.log(`📊 2024 年待抓取 funding: ${dois.length} 篇`);
  console.log('DOIs:', dois);
  
  db.close();
})();
