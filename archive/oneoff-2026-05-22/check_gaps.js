const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync('jac_articles.db'));
  
  const queries = [
    ['Need abstract', 'SELECT COUNT(*) FROM articles WHERE abstract IS NULL OR abstract = ""'],
    ['Need keywords', 'SELECT COUNT(*) FROM articles WHERE keywords IS NULL OR keywords = ""'],
    ['Need received_date', 'SELECT COUNT(*) FROM articles WHERE received_date IS NULL OR received_date = ""'],
    ['Need published_date', 'SELECT COUNT(*) FROM articles WHERE published_date IS NULL OR published_date = ""'],
    ['Need accepted_date', 'SELECT COUNT(*) FROM articles WHERE accepted_date IS NULL OR accepted_date = ""'],
    ['Total articles', 'SELECT COUNT(*) FROM articles'],
  ];
  
  for (const [label, sql] of queries) {
    const r = db.exec(sql);
    console.log(label + ':', r[0]?.values?.[0]?.[0] ?? 'N/A');
  }
  
  const vols = db.exec('SELECT volume, COUNT(*) FROM articles GROUP BY volume ORDER BY volume');
  console.log('\nBy volume:');
  vols[0]?.values?.forEach(r => console.log('  Volume ' + r[0] + ': ' + r[1] + ' articles'));
  
  db.close();
}).catch(console.error);
