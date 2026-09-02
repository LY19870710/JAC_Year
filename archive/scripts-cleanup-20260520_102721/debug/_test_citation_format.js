const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
    const SQL = await initSqlJs();
    const dbPath = 'E:/Claw/JAC_Year/jac_articles.db';
    const db = new SQL.Database(fs.readFileSync(dbPath));
    
    // 测试作者缩写函数
    const testAbbreviate = (name) => {
        const tokens = name.trim().split(/\s+/);
        if (tokens.length < 2) return name;
        const lastName = tokens[tokens.length - 1];
        const initials = tokens.slice(0, -1).map(t => t[0].toUpperCase()).join('');
        return `${lastName} ${initials}`;
    };
    
    console.log('=== 测试作者缩写 ===\n');
    console.log('Haowei Lu ->', testAbbreviate('Haowei Lu'));
    console.log('Zhenghua Hu ->', testAbbreviate('Zhenghua Hu'));
    console.log('Seonhwa Park ->', testAbbreviate('Seonhwa Park'));
    console.log('Gyeongbok Yang ->', testAbbreviate('Gyeongbok Yang'));
    console.log('Yuho Min ->', testAbbreviate('Yuho Min'));
    
    // 测试完整 citation 格式
    const rows = db.exec('SELECT authors, title, year, volume, issue, doi FROM articles LIMIT 3');
    
    console.log('\n=== 新 Citation 格式 ===\n');
    
    rows[0].values.forEach((row, i) => {
        const [authors, title, year, vol, iss, doi] = row;
        const parts = authors.split(',').map(p => p.trim()).filter(Boolean);
        const abbreviatedParts = parts.map(testAbbreviate);
        
        let authorStr;
        if (abbreviatedParts.length > 3) {
            authorStr = abbreviatedParts.slice(0, 3).join(', ') + ', et al';
        } else {
            authorStr = abbreviatedParts.join(', ');
        }
        
        const url = doi.startsWith('10.') ? `https://doi.org/${doi}` : '';
        const artNum = doi.replace(/^10\.26599\/JAC\.\d{4}\.?/, '').replace(/^\d+\(/, '').replace(/\)$/, '');
        const volPart = vol ? (iss ? `, ${vol}(${iss}): ${artNum}` : `, ${vol}: ${artNum}`) : '';
        
        const citation = `${authorStr}. ${title}. Journal of Advanced Ceramics, ${year}${volPart}. ${url}`;
        
        console.log(`\n--- 文章 ${i+1} ---`);
        console.log(citation);
    });
}

main();
