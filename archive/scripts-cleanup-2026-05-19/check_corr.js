const initSqlJs = require('sql.js');
const fs = require('fs');
(async()=>{
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('./jac_articles.db');
  const db = new SQL.Database(new Uint8Array(buf));
  const r = db.exec('SELECT corresponding_author, corresponding_authors, corresponding_json FROM articles LIMIT 3');
  r[0].values.forEach((row,i) => {
    console.log(i+': corr_author="' + row[0] + '" corr_authors="' + row[1] + '" json="' + (row[2]||'').substring(0,100) + '"');
  });
  db.close();
})();
