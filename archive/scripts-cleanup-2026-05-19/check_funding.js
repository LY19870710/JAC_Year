const fs = require('fs');
const initSqlJs = require('./node_modules/sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync('E:\\Claw\\JAC_Year\\jac_articles.db'));
  
  const total = db.exec('SELECT COUNT(*) FROM articles')[0].values[0][0];
  const withFunding = db.exec('SELECT COUNT(*) FROM articles WHERE funding IS NOT NULL AND funding != ""')[0].values[0][0];
  const withCorr = db.exec('SELECT COUNT(*) FROM articles WHERE corresponding_json IS NOT NULL AND corresponding_json != "" AND corresponding_json != "[]"')[0].values[0][0];
  
  // Sample some funding data
  const sample = db.exec("SELECT doi, LENGTH(funding) as len FROM articles WHERE funding IS NOT NULL AND funding != '' ORDER BY LENGTH(funding) DESC LIMIT 5");
  
  console.log(`=== JAC_Year Funding Fetch Complete ===`);
  console.log(`Total articles: ${total}`);
  console.log(`With funding: ${withFunding} (${(withFunding/total*100).toFixed(1)}%)`);
  console.log(`With corresponding_json: ${withCorr} (${(withCorr/total*100).toFixed(1)}%)`);
  
  if (sample.length && sample[0].values.length) {
    console.log('\n=== Top 5 funding lengths ===');
    sample[0].values.forEach(row => {
      console.log(`  ${row[0]}: ${row[1]} chars`);
    });
  }
  
  // Check what kind of data we have
  const sampleFunding = db.exec("SELECT funding FROM articles WHERE funding IS NOT NULL AND funding != '' LIMIT 3");
  if (sampleFunding.length && sampleFunding[0].values.length) {
    console.log('\n=== Sample funding (first 300 chars) ===');
    sampleFunding[0].values.forEach((row, i) => {
      console.log(`[${i+1}] ${row[0].substring(0, 300)}...`);
    });
  }
  
  db.close();
}).catch(console.error);