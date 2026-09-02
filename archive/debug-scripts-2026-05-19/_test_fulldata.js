const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/html, */*',
        'Referer': 'https://www.sciopen.com/',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return resolve(httpsGet(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

async function main() {
  const doi = '10.26599/JAC.2024.9220831';
  
  // Step 1: full_text API
  const ftUrl = 'https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi);
  console.log('Step 1: full_text API');
  const ft = await httpsGet(ftUrl);
  const ftJson = JSON.parse(ft.body);
  const obj = ftJson.object;
  
  console.log('fundingStatements:', JSON.stringify(obj?.fundingStatements));
  console.log('fullTextUrl:', obj?.fullTextUrl);
  console.log('notes:', JSON.stringify(obj?.notes)?.substring(0, 300));
  console.log('fn:', JSON.stringify(obj?.fn)?.substring(0, 300));
  
  // Step 2: Try fullTextUrl
  if (obj?.fullTextUrl) {
    console.log('\nStep 2: Fetching fullTextUrl:', obj.fullTextUrl);
    const ft2 = await httpsGet(obj.fullTextUrl);
    console.log('fullTextUrl status:', ft2.status, 'length:', ft2.body.length);
    
    if (ft2.body.length > 100) {
      const ft2Json = JSON.parse(ft2.body);
      console.log('fullTextUrl keys:', Object.keys(ft2Json));
      console.log('contentList length:', ft2Json.contentList?.length);
      console.log('trees length:', ft2Json.trees?.length);
      
      if (ft2Json.trees) {
        for (const t of ft2Json.trees) {
          const title = t.title || '';
          const isAck = title.toLowerCase().includes('acknow') || title.includes('Funding') || title.includes('致谢');
          console.log('  ' + title + (isAck ? ' ★' : ''));
        }
      }
      
      if (ft2Json.contentList) {
        for (const item of ft2Json.contentList) {
          const type = item.type || '';
          const title = item.title || '';
          const content = item.content || '';
          const isAck = title.toLowerCase().includes('acknow') || title.includes('Funding') || title.includes('致谢');
          const hasFunding = content.includes('Foundation') || content.includes('Grant') || content.includes('funding');
          
          if (isAck || hasFunding || content.length > 200) {
            console.log(`\n  [${type}] ${title} (${content.length} chars) ${isAck ? '★' : ''} ${hasFunding ? 'FUNDING' : ''}`);
            console.log('  Preview: ' + content.substring(0, 300));
          }
        }
      }
    }
  }
  
  // Step 3: Also check a DOI that we KNOW has funding in DB
  console.log('\n\n=== Testing DOI with known funding ===');
  const doi2 = '10.26599/JAC.2024.9220833';
  const ft3 = await httpsGet('https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi2));
  const ft3Json = JSON.parse(ft3.body);
  const obj3 = ft3Json.object;
  console.log('fundingStatements:', JSON.stringify(obj3?.fundingStatements));
  console.log('fullTextUrl:', obj3?.fullTextUrl);
  
  if (obj3?.fullTextUrl) {
    const ft4 = await httpsGet(obj3.fullTextUrl);
    console.log('fullTextUrl status:', ft4.status, 'length:', ft4.body.length);
    if (ft4.body.length > 100) {
      const ft4Json = JSON.parse(ft4.body);
      for (const t of (ft4Json.trees || [])) {
        console.log('  tree: ' + t.title);
      }
    }
  }
}

main().catch(e => console.error(e));
