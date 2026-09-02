const https = require('https');
const doi = '10.26599/JAC.2025.9221180';
const apiUrl = `https://www.sciopen.com/article/full_text?doi=${doi}`;

https.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('=== Top-level keys ===');
      console.log(Object.keys(json));
      
      if (json.article) {
        console.log('\n=== article keys ===');
        console.log(Object.keys(json.article));
        if (json.article.acknowledgement) {
          console.log('\n=== acknowledgement ===');
          console.log(json.article.acknowledgement);
        }
      }
      
      if (json.fullTextInfo) {
        console.log('\n=== fullTextInfo keys ===');
        console.log(Object.keys(json.fullTextInfo));
        if (json.fullTextInfo.fundingStatements) {
          console.log('\n=== fundingStatements ===');
          console.log(json.fullTextInfo.fundingStatements);
        }
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw (first 1000):', data.substring(0, 1000));
    }
  });
}).on('error', e => console.error('Error:', e.message));
