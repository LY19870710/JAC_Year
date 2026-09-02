const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
    const SQL = await initSqlJs();
    const db = new SQL.Database(fs.readFileSync('E:/Claw/JAC_Year/jac_articles.db'));
    
    const rows = db.exec('SELECT authors FROM articles LIMIT 3');
    
    console.log('=== authors 字段格式 ===\n');
    rows[0].values.forEach((row, i) => {
        console.log(`文章 ${i+1}: ${row[0]}`);
    });
}

main();
