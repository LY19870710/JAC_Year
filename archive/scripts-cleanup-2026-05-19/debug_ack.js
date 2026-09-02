const https = require('https');
const doi = '10.26599/JAC.2025.9221180';
const pageUrl = `https://www.sciopen.com/article/${doi}`;

https.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Search for Acknowledgements in the HTML
    const patterns = [
      /acknowledgement/gi,
      /acknowledgment/gi,
      /funding/gi,
      /grant/gi,
      /supported by/gi,
    ];
    
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(data)) !== null) {
        console.log(`\n=== ${m[0]} at ${m.index} ===`);
        const start = Math.max(0, m.index - 30);
        const end = Math.min(data.length, m.index + 300);
        console.log(data.substring(start, end));
        console.log('---');
      }
    }
  });
}).on('error', e => console.error('Error:', e.message));
