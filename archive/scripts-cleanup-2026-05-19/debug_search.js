const https = require('https');
const doi = '10.26599/JAC.2025.9221171';
const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const obj = json.object || json;
      
      // Search for 'funding' or 'acknowledg' in the entire response
      const str = JSON.stringify(obj);
      
      // Search case-insensitive for funding-related text
      const patterns = ['funding', 'Fund', 'acknowledg', 'Acknowledg', 'supported by', 'Supported by', 'National Natural Science', 'NSFC'];
      
      for (const pat of patterns) {
        let idx = 0;
        let found = 0;
        while ((idx = str.indexOf(pat, idx)) > -1 && found < 3) {
          console.log(`\n=== "${pat}" at ${idx} ===`);
          console.log(str.substring(Math.max(0, idx - 100), idx + 300));
          idx += pat.length;
          found++;
        }
      }
      
      // Also check the contentList structure
      if (obj.contentList && obj.contentList.length > 0) {
        console.log(`\ncontentList: ${obj.contentList.length} items`);
        // Check if any contentList item contains funding
        for (let i = 0; i < obj.contentList.length; i++) {
          const item = obj.contentList[i];
          const itemStr = JSON.stringify(item);
          if (itemStr.toLowerCase().includes('funding') || itemStr.toLowerCase().includes('acknowledg')) {
            console.log(`\ncontentList[${i}] contains funding/acknowledg:`);
            console.log(itemStr.substring(0, 500));
          }
        }
      }
      
      // Check the notes array
      if (obj.notes) {
        for (const n of obj.notes) {
          const nStr = JSON.stringify(n);
          if (nStr.toLowerCase().includes('fund') || nStr.toLowerCase().includes('acknowledg') || nStr.toLowerCase().includes('supported')) {
            console.log(`\nNote with funding info:`);
            console.log(nStr);
          }
        }
      }

    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
}).on('error', e => console.error('Error:', e.message));
