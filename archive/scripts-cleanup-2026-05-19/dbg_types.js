const initSqlJs = require('E:/Claw/JAC_Year/node_modules/sql.js');
const fs = require('fs');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('E:/Claw/JAC_Year/jac_articles.db'));

  // Check types
  const types = db.exec("SELECT DISTINCT type FROM articles");
  console.log("Types:", JSON.stringify(types));

  // Check years
  const years = db.exec("SELECT DISTINCT year FROM articles");
  console.log("Years:", JSON.stringify(years));

  // Check type+year counts
  const grouped = db.exec("SELECT type, year, COUNT(*) as cnt FROM articles GROUP BY type, year");
  console.log("Grouped:", JSON.stringify(grouped));

  // Try the query with year=2025, type=Article
  const q1 = db.exec("SELECT COUNT(*) FROM articles WHERE year = '2025' AND type = 'Article'");
  console.log("Count year=2025, type=Article:", JSON.stringify(q1));

  // Try with numeric year
  const q2 = db.exec("SELECT COUNT(*) FROM articles WHERE year = 2025 AND type = 'Article'");
  console.log("Count year=2025(numeric), type=Article:", JSON.stringify(q2));

  // Try with % wildcards
  const q3 = db.exec("SELECT COUNT(*) FROM articles WHERE year LIKE '%2025%' AND type LIKE '%Article%'");
  console.log("Count LIKE 2025 Article:", JSON.stringify(q3));

  // Check first few rows
  const sample = db.exec("SELECT year, type, title FROM articles LIMIT 5");
  console.log("Sample rows:", JSON.stringify(sample));

  db.close();
  process.exit(0);
})();
