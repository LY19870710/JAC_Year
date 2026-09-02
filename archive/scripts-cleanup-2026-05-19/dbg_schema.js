const initSqlJs = require('E:/Claw/JAC_Year/node_modules/sql.js');
const fs = require('fs');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('E:/Claw/JAC_Year/jac_articles.db'));
  
  const schema = db.exec("SELECT sql FROM sqlite_master WHERE name='articles'");
  console.log("Schema:", JSON.stringify(schema, null, 2));
  
  // Test exact queries
  const tests = [
    {name: "year='2025'", q: "SELECT COUNT(*) FROM articles WHERE year = '2025'"},
    {name: "year=2025", q: "SELECT COUNT(*) FROM articles WHERE year = 2025"},
    {name: "type='Research Article'", q: "SELECT COUNT(*) FROM articles WHERE type = 'Research Article'"},
    {name: "both str", q: "SELECT COUNT(*) FROM articles WHERE year = '2025' AND type = 'Research Article'"},
    {name: "both num", q: "SELECT COUNT(*) FROM articles WHERE year = 2025 AND type = 'Research Article'"},
  ];
  
  for (const t of tests) {
    const r = db.exec(t.q);
    console.log(t.name + ": " + JSON.stringify(r));
  }
  
  db.close();
  process.exit(0);
})();
