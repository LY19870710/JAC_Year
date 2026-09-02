const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0)', 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

async function testSemanticScholar(doi) {
  console.log('\n=== Semantic Scholar ===');
  try {
    const url = 'https://api.semanticscholar.org/graph/v1/paper/' + encodeURIComponent(doi) + '?fields=funding';
    const r = await httpsGet(url);
    const json = JSON.parse(r.body);
    console.log('Paper ID:', json.paperId);
    console.log('Funding:', JSON.stringify(json.funding));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

async function testOpenAlex(doi) {
  console.log('\n=== OpenAlex ===');
  try {
    const url = 'https://api.openalex.org/works/' + encodeURIComponent(doi);
    const r = await httpsGet(url);
    const json = JSON.parse(r.body);
    console.log('ID:', json.id);
    console.log('Title:', json.display_name?.substring(0, 60));
    console.log('Funding usd:', json.funding_list?.length ? json.funding_list.length + ' sources' : 'none');
    if (json.funding_list && json.funding_list.length) {
      for (const f of json.funding_list) {
        console.log('  -', f.organization?.name, '|', f.id);
      }
    }
    // Also check best_oa_location
    console.log('Best OA location:', json.best_oa_location?.landing_page_url);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

async function testSciOpenRelated(doi) {
  console.log('\n=== SciOpen RelatedInfo ===');
  // Try to get paper ID first
  try {
    const ftUrl = 'https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi);
    const ft = await httpsGet(ftUrl);
    const ftJson = JSON.parse(ft.body);
    const obj = ftJson.object;
    if (!obj) { console.log('No object in response'); return; }
    
    // Try RelatedInfo with different resourceId formats
    const resourceIds = [
      obj.id,
      obj.resourceId,
      obj.paperId,
    ].filter(Boolean);
    
    for (const rid of resourceIds) {
      console.log('Trying resourceId:', rid);
      const apis = [
        'https://www.sciopen.com/v2/Paper/RelatedInfo?resourceId=' + rid,
        'https://www.sciopen.com/v1/Paper/RelatedInfo?resourceId=' + rid,
        'https://www.sciopen.com/api/paper/related?paperId=' + rid,
      ];
      for (const url of apis) {
        const r = await httpsGet(url);
        console.log('  ', url.substring(0, 80));
        console.log('  ', r.status, r.body.substring(0, 200));
        if (r.body.length > 200) break;
      }
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

async function main() {
  const doi = '10.26599/JAC.2024.9220835';
  
  await testSemanticScholar(doi);
  await new Promise(r => setTimeout(r, 1000));
  
  await testOpenAlex(doi);
  await new Promise(r => setTimeout(r, 1000));
  
  await testSciOpenRelated(doi);
}

main().catch(e => console.error(e));
