const https = require('https');

const doi = process.argv[2] || '10.26599/JAC.2025.9221171';
const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      // Print structure keys
      console.log('Top keys:', Object.keys(json));
      
      // Look for funding
      if (json.funding) {
        console.log('\n=== FUNDING (top level) ===');
        console.log(JSON.stringify(json.funding, null, 2));
      }
      if (json.data?.funding) {
        console.log('\n=== FUNDING (data.funding) ===');
        console.log(JSON.stringify(json.data.funding, null, 2));
      }
      if (json.result?.funding) {
        console.log('\n=== FUNDING (result.funding) ===');
        console.log(JSON.stringify(json.result.funding, null, 2));
      }
      
      // Check fullTextInfo
      if (json.fullTextInfo) {
        console.log('\n=== fullTextInfo keys ===');
        console.log(Object.keys(json.fullTextInfo));
        if (json.fullTextInfo.funding) {
          console.log('\n=== FUNDING (fullTextInfo) ===');
          console.log(JSON.stringify(json.fullTextInfo.funding, null, 2));
        }
      }
      
      // If nested, print first 3000 chars
      const str = JSON.stringify(json);
      const fundIdx = str.indexOf('funding');
      if (fundIdx > -1 && !json.funding && !json.data?.funding && !json.result?.funding && !json.fullTextInfo?.funding) {
        console.log('\n=== funding found in string at', fundIdx, '===');
        console.log(str.substring(Math.max(0, fundIdx - 50), fundIdx + 500));
      }
      
      // Check for corresponding author info
      const corrIdx = str.indexOf('corresponding');
      if (corrIdx > -1) {
        console.log('\n=== corresponding found at', corrIdx, '===');
        console.log(str.substring(Math.max(0, corrIdx - 50), corrIdx + 500));
      }

      // Also check bio for corresponding author email
      const bioIdx = str.indexOf('"bio"');
      if (bioIdx > -1) {
        console.log('\n=== bio at', bioIdx, '===');
        console.log(str.substring(bioIdx, bioIdx + 800));
      }

    } catch (e) {
      console.log('Parse error:', e.message);
      console.log('Raw (first 2000):', data.substring(0, 2000));
    }
  });
}).on('error', e => console.error('Error:', e.message));
