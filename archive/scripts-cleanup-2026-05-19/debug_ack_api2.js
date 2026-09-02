const https = require('https');
const doi = '10.26599/JAC.2025.9221180';
const apiUrl = `https://www.sciopen.com/article/full_text?doi=${doi}`;

https.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('=== object keys ===');
      const obj = json.object || {};
      console.log(Object.keys(obj));
      
      // Check for acknowledgement
      if (obj.acknowledgement) {
        console.log('\n=== acknowledgement (from object) ===');
        console.log(obj.acknowledgement.substring(0, 500));
      }
      
      // Check fullTextInfo
      if (obj.fullTextInfo) {
        console.log('\n=== fullTextInfo keys ===');
        console.log(Object.keys(obj.fullTextInfo));
        if (obj.fullTextInfo.fundingStatements) {
          console.log('\n=== fundingStatements ===');
          console.log(obj.fullTextInfo.fundingStatements);
        }
      }
      
      // Check article
      if (obj.article) {
        console.log('\n=== article keys ===');
        console.log(Object.keys(obj.article));
        if (obj.article.acknowledgement) {
          console.log('\n=== acknowledgement (from article) ===');
          console.log(obj.article.acknowledgement.substring(0, 500));
        }
      }
      
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw (first 500):', data.substring(0, 500));
    }
  });
}).on('error', e => console.error('Error:', e.message));
