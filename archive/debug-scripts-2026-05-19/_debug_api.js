const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/json',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  // Test a 2024 article that got funding (from earlier successful batch)
  const dois = [
    '10.26599/JAC.2024.9220830',  // got funding in earlier batch
    '10.26599/JAC.2024.9220835',  // no funding
    '10.26599/JAC.2024.9220846',  // no funding
  ];
  
  for (const doi of dois) {
    console.log(`\n=== ${doi} ===`);
    const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
    try {
      const raw = await httpsGet(url);
      const json = JSON.parse(raw);
      const obj = json.object;
      
      console.log('Keys:', Object.keys(obj || {}));
      console.log('fundingStatements:', obj?.fundingStatements);
      
      // Check notes
      if (obj?.notes && obj.notes.length > 0) {
        obj.notes.forEach((n, i) => {
          console.log(`Note[${i}]: ${n.title} - ${n.content?.substring(0, 200)}`);
        });
      }
      
      // Check bio
      if (obj?.bio && obj.bio.length > 0) {
        console.log('bio:', JSON.stringify(obj.bio).substring(0, 300));
      }
      
      // Check fn
      if (obj?.fn && obj.fn.length > 0) {
        console.log('fn:', JSON.stringify(obj.fn).substring(0, 300));
      }
      
    } catch (e) {
      console.log('Error:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
}

main().catch(e => console.error(e));
