const db = require('better-sqlite3')('data/jac_articles.db');
const cols = db.prepare('PRAGMA table_info(articles)').all();
console.log(cols.map(c => c.name).join('\n'));
const sample = db.prepare('SELECT citation, corresponding_json FROM articles LIMIT 3').all();
console.log('\nSample citation/corresponding_json:');
sample.forEach(r => console.log(JSON.stringify({citation: r.citation, corr: r.corresponding_json})));
