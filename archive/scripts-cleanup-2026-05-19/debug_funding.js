const fs = require('fs');

// Direct DB check via raw binary
const buf = fs.readFileSync('E:/Claw/JAC_Year/jac_articles.db');
console.log('DB file size:', buf.length);

// Parse SQLite header manually
console.log('Magic:', buf.slice(0, 16).toString('ascii'));

// API check via http
const http = require('http');
const url = 'http://localhost:3000/api/export?format=json&limit=2';
http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const d = JSON.parse(data);
      console.log('\nAPI total:', d.total);
      d.articles.slice(0, 2).forEach(a => {
        const keys = Object.keys(a);
        console.log('Keys:', keys);
        console.log('  Funding:', JSON.stringify(a['资助信息'] || a.funding || 'MISSING').slice(0, 80));
      });
    } catch(e) {
      console.log('JSON parse error:', e.message);
      console.log('Response:', data.slice(0, 200));
    }
  });
}).on('error', e => console.log('API error:', e.message));