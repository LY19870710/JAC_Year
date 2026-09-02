const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, */*',
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
  // Test with an article that DOES have funding in DB
  const doi = '10.26599/JAC.2024.9220831';
  
  const ftUrl = 'https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi);
  const ft = await httpsGet(ftUrl);
  const ftJson = JSON.parse(ft.body);
  const fullTextUrl = ftJson.object?.fullTextUrl;
  
  console.log('fullTextUrl:', fullTextUrl ? fullTextUrl.substring(0, 100) + '...' : 'NONE');
  
  if (!fullTextUrl) return;
  
  const ft2 = await httpsGet(fullTextUrl);
  console.log('Status:', ft2.status, 'Length:', ft2.body.length);
  
  try {
    const json = JSON.parse(ft2.body);
    
    console.log('\n--- ALL SECTIONS ---');
    const keys = Object.keys(json).sort((a, b) => Number(a) - Number(b));
    console.log('Total sections:', keys.length);
    
    for (const key of keys) {
      const item = json[key];
      if (typeof item !== 'object' || !item) continue;
      const title = String(item.title || '').trim();
      const content = item.content || '';
      const type = item.type || '';
      
      // Clean content for display
      const cleanContent = String(content).replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      
      const hasFunding = cleanContent.includes('Foundation') && cleanContent.includes('Grant');
      const hasAck = cleanContent.toLowerCase().includes('acknowledgement');
      const hasFundKeyword = cleanContent.includes('Funding') && cleanContent.length > 100;
      const hasCN = cleanContent.includes('致谢') || cleanContent.includes('基金');
      
      console.log(`\n[${key}] title="${title}" type="${type}" content_len=${content.length}`);
      console.log(`  preview: ${cleanContent.substring(0, 120)}`);
      if (hasFunding || hasAck || hasFundKeyword || hasCN) {
        console.log(`  ★★★ KEYWORD FOUND (funding=${hasFunding} ack=${hasAck} fund=${hasFundKeyword} cn=${hasCN})`);
      }
    }
  } catch (e) {
    console.log('JSON parse error:', e.message);
  }
}

main().catch(e => console.error(e));
