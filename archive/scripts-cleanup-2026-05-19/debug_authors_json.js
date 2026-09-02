const https = require('https');

const doi = '10.26599/JAC.2025.9221180';
https.get(`https://www.sciopen.com/article/${doi}`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Find the JSON author data - look for the pattern with "type":1 (corresponding author)
    // The data is in a <script> tag or inline JS
    const authorsMatch = data.match(/"authors"\s*:\s*(\[[\s\S]*?\])\s*,\s*"companys"/);
    if (authorsMatch) {
      try {
        // Clean up HTML entities
        let jsonStr = authorsMatch[1]
          .replace(/<\/?a[^>]*>/g, '')
          .replace(/<sup>/g, '')
          .replace(/<\/sup>/g, '')
          .replace(/<label>/g, '')
          .replace(/<\/label>/g, '')
          .replace(/\\n/g, '')
          .replace(/&amp;/g, '&');
        
        const authors = JSON.parse(jsonStr);
        console.log(`Authors: ${authors.length}`);
        
        const corresponding = authors.filter(a => a.type === 1);
        const regular = authors.filter(a => a.type === 2);
        
        console.log(`\nCorresponding authors (type=1): ${corresponding.length}`);
        corresponding.forEach(a => {
          const name = a.name.replace(/<[^>]*>/g, '').trim();
          console.log(`  ${name} (${a.email || 'no email'})`);
        });
        
        console.log(`\nRegular authors (type=2): ${regular.length}`);
        regular.forEach(a => {
          const name = a.name.replace(/<[^>]*>/g, '').trim();
          console.log(`  ${name} (${a.email || 'no email'})`);
        });
        
      } catch (e) {
        console.log('JSON parse error:', e.message);
        console.log('Raw (first 500):', authorsMatch[1].substring(0, 500));
      }
    } else {
      console.log('No authors JSON found');
      // Try alternative pattern
      const idx = data.indexOf('"type":1');
      if (idx > -1) {
        console.log('type:1 found at', idx);
        console.log(data.substring(Math.max(0, idx - 300), idx + 200));
      }
    }
  });
}).on('error', e => console.error(e.message));
