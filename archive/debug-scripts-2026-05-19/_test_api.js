const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/html',
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
  
  const pageUrl = 'https://www.sciopen.com/article/' + encodeURIComponent(doi);
  console.log('Fetching article page:', pageUrl);
  const { body } = await httpsGet(pageUrl);
  console.log('HTML length:', body.length);
  
  // Find resourceId in HTML
  let paperId = null;
  const m1 = body.match(/resourceId["\s:]+["']?([0-9a-f]{32,})["']?/i);
  const m2 = body.match(/paperId["\s:]+["']?(\d{8,})["']?/i);
  const m3 = body.match(/"resourceId"\s*:\s*"([^"]+)"/);
  const m4 = body.match(/data-paperid=["']?(\d+)/i);
  const m5 = body.match(/[0-9a-f]{32,}/i);
  
  if (m1) { paperId = m1[1]; console.log('Found resourceId (32+ hex):', paperId); }
  else if (m2) { paperId = m2[1]; console.log('Found paperId (digit):', paperId); }
  else if (m3) { paperId = m3[1]; console.log('Found resourceId (json):', paperId); }
  else if (m4) { paperId = m4[1]; console.log('Found data-paperid:', paperId); }
  else if (m5) { paperId = m5[0]; console.log('Found hex ID:', paperId); }
  else { console.log('No paper ID found'); }
  
  // Check for funding/acknowledgement in HTML
  const patterns = [
    ['fundingStatements', 'fundingStatements\\s*[=:]'],
    ['acknowledgement', 'acknowledgement'],
    ['Funding section', 'Funding'],
  ];
  
  for (const [name, keyword] of patterns) {
    const idx = body.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx >= 0) {
      console.log(`\n"${name}" found at index ${idx}`);
      let snippet = body.substring(Math.max(0, idx - 50), idx + 400);
      snippet = snippet.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(snippet);
    } else {
      console.log(`"${name}": not found`);
    }
  }
  
  // Try RelatedInfo API
  if (paperId) {
    console.log('\n=== RelatedInfo API ===');
    const apis = [
      'https://www.sciopen.com/v2/Paper/RelatedInfo?resourceId=' + paperId,
      'https://www.sciopen.com/v1/Paper/RelatedInfo?resourceId=' + paperId,
    ];
    for (const url of apis) {
      try {
        const r = await httpsGet(url);
        console.log(url.substring(0, 80));
        console.log('Status:', r.status, '| Body:', r.body.substring(0, 300));
      } catch (e) {
        console.log('Error:', e.message);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Also try the full_text API and show what we get
  console.log('\n=== full_text API ===');
  const ftUrl = 'https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi);
  const ft = await httpsGet(ftUrl);
  const ftJson = JSON.parse(ft.body);
  console.log('Keys in response:', Object.keys(ftJson));
  console.log('object keys:', ftJson.object ? Object.keys(ftJson.object) : 'none');
  console.log('contentList length:', ftJson.object?.contentList?.length);
  console.log('trees length:', ftJson.object?.trees?.length);
  if (ftJson.object?.trees) {
    for (const t of ftJson.object.trees) {
      console.log('  tree:', t.title);
    }
  }
}

main().catch(e => console.error(e));
