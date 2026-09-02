const https = require('https');

const doi = process.argv[2] || '10.26599/JAC.2025.9221171';
const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const obj = json.object || json;
      
      // fundingStatements
      if (obj.fundingStatements && obj.fundingStatements.length > 0) {
        console.log('=== FUNDING STATEMENTS ===');
        obj.fundingStatements.forEach((f, i) => {
          console.log(`[${i}]`, JSON.stringify(f, null, 2));
        });
      } else {
        console.log('fundingStatements: empty');
      }
      
      // bio (author info, may contain corresponding author email)
      if (obj.bio && obj.bio.length > 0) {
        console.log('\n=== BIO ===');
        obj.bio.forEach((b, i) => {
          console.log(`[${i}]`, JSON.stringify(b, null, 2));
        });
      } else {
        console.log('bio: empty');
      }

      // fn (footnotes - corresponding author info often here)
      if (obj.fn && obj.fn.length > 0) {
        console.log('\n=== FN (footnotes) ===');
        obj.fn.forEach((f, i) => {
          console.log(`[${i}]`, JSON.stringify(f, null, 2));
        });
      } else {
        console.log('fn: empty');
      }

      // notes (may have acknowledgments)
      if (obj.notes && obj.notes.length > 0) {
        console.log('\n=== NOTES ===');
        obj.notes.forEach((n, i) => {
          console.log(`[${i}]`, JSON.stringify(n, null, 2));
        });
      } else {
        console.log('notes: empty');
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
}).on('error', e => console.error('Error:', e.message));
