const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('./jac_articles.db');
  const db = new SQL.Database(new Uint8Array(buf));

  const cols = db.exec("SELECT name FROM pragma_table_info('articles')");
  console.log('Columns:', cols[0].values.map(v => v[0]).join(', '));

  const citation = db.exec('SELECT citation FROM articles LIMIT 3');
  if (citation.length) {
    citation[0].values.forEach((row, i) => {
      console.log(`Row ${i}: citation="${(row[0] || '').substring(0, 80)}"`);
    });
  } else {
    console.log('No citation rows');
  }

  const corr = db.exec('SELECT corresponding_json FROM articles LIMIT 2');
  if (corr.length) {
    corr[0].values.forEach((row, i) => {
      console.log(`Row ${i}: corr="${(row[0] || '').substring(0, 80)}"`);
    });
  }

  db.close();
}

main();
