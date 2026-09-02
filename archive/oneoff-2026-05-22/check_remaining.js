const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync('E:\\Claw\\JAC_Year\\jac_articles.db'));
  
  const r = db.exec(`
    SELECT doi, title, volume, issue, published_date, abstract, keywords, received_date, accepted_date
    FROM articles
    WHERE abstract IS NULL OR abstract = "" OR keywords IS NULL OR keywords = ""
    ORDER BY doi
  `);
  
  if (!r.length) {
    console.log('All articles have abstract and keywords!');
  } else {
    console.log('Articles missing abstract or keywords:');
    r[0].values.forEach(row => {
      console.log('\nDOI:', row[0]);
      console.log('  Title:', row[1]?.substring(0, 80));
      console.log('  Vol/Issue:', row[2], row[3]);
      console.log('  Published:', row[4]);
      console.log('  Abstract len:', row[5]?.length || 0);
      console.log('  Keywords:', row[6] || '(empty)');
      console.log('  Received:', row[7] || '(empty)');
      console.log('  Accepted:', row[8] || '(empty)');
    });
  }
  
  // Also check date gaps
  const r2 = db.exec(`
    SELECT doi, received_date, accepted_date, published_date 
    FROM articles 
    WHERE received_date IS NULL OR received_date = "" 
       OR accepted_date IS NULL OR accepted_date = ""
    ORDER BY doi
  `);
  if (r2.length && r2[0].values.length) {
    console.log('\n--- Articles missing dates ---');
    r2[0].values.forEach(row => {
      console.log(row[0], 'received=', row[1], 'accepted=', row[2], 'published=', row[3]);
    });
  }
  
  db.close();
}).catch(console.error);
