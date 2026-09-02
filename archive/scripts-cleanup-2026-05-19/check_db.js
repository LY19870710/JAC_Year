const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  
  // Find the db file
  const possiblePaths = [
    './jac_articles.db',
    './data/jac_articles.db'
  ];
  
  let dbPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) { dbPath = p; break; }
  }
  
  if (!dbPath) {
    console.log('No db file found at:', possiblePaths);
    process.exit(1);
  }
  
  const buf = fs.readFileSync(dbPath);
  db.run(buf);
  
  // Get columns
  const cols = db.exec('PRAGMA table_info(articles)');
  console.log('Columns:', cols[0].values.map(v => v[1]).join(', '));
  
  // Check if citation exists
  const hasCitation = db.exec("SELECT name FROM pragma_table_info('articles') WHERE name='citation'");
  console.log('Has citation column:', hasCitation.length > 0 && hasCitation[0].values.length > 0);
  
  // Sample data
  const sample = db.exec('SELECT citation, corresponding_json FROM articles LIMIT 2');
  if (sample.length) {
    console.log('\nSample rows:');
    sample[0].values.forEach(row => {
      console.log('citation:', row[0] ? row[0].substring(0, 80) : '(null)');
      console.log('corr_json:', row[1] ? row[1].substring(0, 80) : '(null)');
    });
  }
}

main();
