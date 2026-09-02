const https = require('https');
const doi = '10.26599/JAC.2025.9221180';
const apiUrl = `https://www.sciopen.com/article/full_text?doi=${doi}`;

https.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const obj = json.object || {};
      
      console.log('=== fundingStatements ===');
      console.log(JSON.stringify(obj.fundingStatements, null, 2));
      
      console.log('\n=== contentList (first 3) ===');
      if (obj.contentList && obj.contentList.length > 0) {
        obj.contentList.slice(0, 3).forEach((item, i) => {
          console.log(`[${i}]`, item.type || item.label || Object.keys(item));
        });
      }
      
      console.log('\n=== notes ===');
      console.log(JSON.stringify(obj.notes, null, 2).substring(0, 500));
      
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on('error', e => console.error('Error:', e.message));
