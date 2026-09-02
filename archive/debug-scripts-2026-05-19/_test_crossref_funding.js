const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JACResearchBot/1.0)',
        'Accept': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

async function testCrossref(doi) {
  const url = 'https://api.crossref.org/works/' + encodeURIComponent(doi);
  try {
    const r = await httpsGet(url);
    const json = JSON.parse(r.body);
    const msg = json.message || {};
    
    console.log('DOI:', doi);
    console.log('Title:', (msg.title || [])[0]?.substring(0, 60));
    console.log('Author count:', msg.author?.length);
    console.log('Funder count:', msg['assertion-group']?.length || msg.funder?.length || 0);
    console.log('Award count:', msg.award?.length || 0);
    
    // Print all assertions/groups
    if (msg['assertion-group'] && msg['assertion-group'].length) {
      console.log('\nAssertion groups:');
      for (const g of msg['assertion-group']) {
        console.log(`  Group: ${g.name}`);
        for (const a of (g['assertion'] || [])) {
          console.log(`    - ${a.name}: ${a.value}`);
        }
      }
    }
    
    // Awards
    if (msg.award && msg.award.length) {
      console.log('\nAwards:');
      for (const a of msg.award) {
        console.log(' ', JSON.stringify(a));
      }
    }
    
    // Funders
    if (msg.funder && msg.funder.length) {
      console.log('\nFunders:');
      for (const f of msg.funder) {
        console.log(`  ${f.name || f['name-title']} (DOI: ${f.DOI || 'N/A'})`);
      }
    }
    
    // Container title (journal)
    console.log('\nJournal:', msg['container-title']?.[0]);
    console.log('Volume:', msg.volume, 'Issue:', msg.issue, 'Page:', msg.page);
    
  } catch (e) {
    console.log('Error:', e.message);
  }
}

async function main() {
  // Test a few DOIs from 2024 (some with funding, some without)
  const dois = [
    '10.26599/JAC.2024.9220831',  // has funding in DB
    '10.26599/JAC.2024.9220833',  // has funding in DB  
    '10.26599/JAC.2024.9220835',  // no funding in DB
    '10.26599/JAC.2024.9220846',  // no funding in DB
  ];
  
  for (let i = 0; i < dois.length; i++) {
    await testCrossref(dois[i]);
    if (i < dois.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('\n---\n');
  }
}

main().catch(e => console.error(e));
