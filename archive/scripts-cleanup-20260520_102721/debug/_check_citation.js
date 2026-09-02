const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
    const SQL = await initSqlJs();
    const db = new SQL.Database(fs.readFileSync('E:/Claw/JAC_Year/jac_articles.db'));
    
    const rows = db.exec('SELECT title, citation FROM articles LIMIT 5');
    
    console.log('=== 当前数据库中的 Citation 格式 ===\n');
    rows[0].values.forEach((row, i) => {
        console.log(`\n--- 文章 ${i+1} ---`);
        console.log('Title:', row[0]);
        console.log('Citation:', row[1]);
    });
}

main();
