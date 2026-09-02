const initSqlJs = require('sql.js');
const fs = require('fs');
async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('E:/Claw/JAC_Year/jac_articles.db'));
  const total = db.exec('SELECT COUNT(*) FROM articles')[0].values[0][0];
  const withFunding = db.exec("SELECT COUNT(*) FROM articles WHERE funding IS NOT NULL AND funding != ''")[0].values[0][0];
  const year24 = db.exec('SELECT COUNT(*) FROM articles WHERE year=2024')[0].values[0][0];
  const year24fund = db.exec("SELECT COUNT(*) FROM articles WHERE year=2024 AND funding IS NOT NULL AND funding != ''")[0].values[0][0];
  const year25 = db.exec('SELECT COUNT(*) FROM articles WHERE year=2025')[0].values[0][0];
  const year25fund = db.exec("SELECT COUNT(*) FROM articles WHERE year=2025 AND funding IS NOT NULL AND funding != ''")[0].values[0][0];
  console.log('Total:', total, '| With funding:', withFunding);
  console.log('2024:', year24, 'articles,', year24fund, 'have funding');
  console.log('2025:', year25, 'articles,', year25fund, 'have funding');
  db.close();
}
main();
