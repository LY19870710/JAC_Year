const initSqlJs = require('E:/Claw/JAC_Year/node_modules/sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('E:/Claw/JAC_Year/jac_articles.db'));
  
  const filters = { year: 2025, type: 'Research Article' };
  const limit = 10000;
  
  const sql = `
    SELECT year, title, authors, affiliations, institutions, doi, type, url, category, funding, corresponding_json
    FROM articles WHERE 1=1
  `;
  const params = [];
  const condSQL = [];
  
  if (filters.year) { condSQL.push('year = ?'); params.push(filters.year); }
  if (filters.type) { condSQL.push('type = ?'); params.push(filters.type); }
  
  let fullSql = sql;
  if (condSQL.length) fullSql += ' AND ' + condSQL.join(' AND ');
  fullSql += ' ORDER BY year DESC, doi DESC LIMIT ?';
  params.push(limit);
  
  console.log("SQL:", fullSql);
  console.log("Params:", JSON.stringify(params));
  
  const result = db.exec(fullSql, params);
  console.log("Result:", JSON.stringify(result));
  console.log("Row count:", result.length ? result[0].values.length : 0);
  
  // Try with explicit string year
  const params2 = ['2025', 'Research Article', 10000];
  const r2 = db.exec(fullSql, params2);
  console.log("With string year:", r2.length ? r2[0].values.length : 0);
  
  // Try without params (hardcoded)
  const r3 = db.exec("SELECT COUNT(*) FROM articles WHERE year = 2025 AND type = 'Research Article'");
  console.log("Hardcoded:", JSON.stringify(r3));
  
  db.close();
  process.exit(0);
}

main();
