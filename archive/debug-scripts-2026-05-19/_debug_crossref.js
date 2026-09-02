const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const dois = [
    '10.26599/JAC.2024.9220831',  // has funding in DB
    '10.26599/JAC.2024.9220835',  // no funding
  ];
  
  for (const doi of dois) {
    console.log(`\n=== ${doi} ===`);
    
    // Crossref API
    const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    try {
      const raw = await httpsGet(crossrefUrl);
      const json = JSON.parse(raw);
      const msg = json.message;
      
      console.log('Crossref title:', msg.title?.[0]?.substring(0, 50));
      console.log('Crossref author-count:', msg.author?.length);
      console.log('Crossref funder:', msg.funder?.length + ' funders');
      
      if (msg.funder && msg.funder.length > 0) {
        msg.funder.slice(0, 3).forEach(f => {
          console.log(`  Funder: ${f.name || f['name-title']} (${f.DOI || 'no DOI'})`);
        });
      }
      
      console.log('Crossref clinical-trial-number:', JSON.stringify(msg['clinical-trial-number']));
      console.log('Crossref award:', JSON.stringify(msg.award));
      
    } catch (e) {
      console.log(`Crossref Error: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
}

main().catch(e => console.error(e));
