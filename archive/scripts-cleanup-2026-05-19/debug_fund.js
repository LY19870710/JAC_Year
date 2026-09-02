const https = require('https');
const doi = '10.26599/JAC.2025.9221180';
const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const obj = json.object || json;
      
      console.log('fundingStatements:', JSON.stringify(obj.fundingStatements, null, 2));
      console.log('\nbio:', JSON.stringify(obj.bio, null, 2));
      console.log('\nfn:', JSON.stringify(obj.fn, null, 2));
      
      // Also check if corresponding author info is in contentList or elsewhere
      if (obj.contentList) {
        for (const item of obj.contentList) {
          const s = JSON.stringify(item);
          if (s.includes('corresponding') || s.includes('Corresponding') || s.includes('*')) {
            console.log('\ncontentList item with corresponding:');
            console.log(s.substring(0, 500));
          }
        }
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
}).on('error', e => console.error('Error:', e.message));
