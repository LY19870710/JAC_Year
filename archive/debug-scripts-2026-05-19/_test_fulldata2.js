const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html, */*',
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
  
  // Get fullTextUrl
  const ftUrl = 'https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi);
  const ft = await httpsGet(ftUrl);
  const ftJson = JSON.parse(ft.body);
  const fullTextUrl = ftJson.object?.fullTextUrl;
  
  if (!fullTextUrl) {
    console.log('No fullTextUrl');
    return;
  }
  
  console.log('Fetching fullTextUrl...');
  const ft2 = await httpsGet(fullTextUrl);
  console.log('fullTextUrl status:', ft2.status, 'length:', ft2.body.length);
  
  // Parse as JSON
  try {
    const ft2Json = JSON.parse(ft2.body);
    console.log('\nJSON keys:', Object.keys(ft2Json));
    
    // It has numeric keys like '0', '1', '2'...
    for (const key of Object.keys(ft2Json).sort((a, b) => Number(a) - Number(b))) {
      const item = ft2Json[key];
      if (typeof item === 'object') {
        console.log(`\n[${key}] type=${item.type}, title="${item.title || ''}"`);
        if (item.content) {
          const preview = String(item.content).substring(0, 150).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`  content(${item.content.length} chars): ${preview}...`);
          
          // Check for funding keywords
          const content = String(item.content);
          const hasFunding = content.includes('Foundation') || content.includes('Grant') || 
                             content.includes('funding') || content.includes('Acknowledgement') ||
                             content.includes('致谢') || content.includes('基金');
          if (hasFunding) {
            console.log('  ★★★ FUNDING/ACK FOUND! ★★★');
            // Extract the full text without HTML tags
            const cleanText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            console.log('  Clean text:', cleanText.substring(0, 500));
          }
        }
      } else {
        console.log(`[${key}]: ${String(item).substring(0, 100)}`);
      }
    }
  } catch (e) {
    // Not JSON, try as HTML
    console.log('Not JSON, treating as HTML');
    const html = ft2.body;
    const ackIdx = html.toLowerCase().indexOf('acknowledgement');
    const fundingIdx = html.toLowerCase().indexOf('funding');
    const chinAck = html.indexOf('致谢');
    const chinFund = html.indexOf('基金');
    
    console.log('acknowledgement:', ackIdx);
    console.log('funding:', fundingIdx);
    console.log('致谢:', chinAck);
    console.log('基金:', chinFund);
    
    // Show context around funding
    if (fundingIdx >= 0) {
      const ctx = html.substring(Math.max(0, fundingIdx - 200), fundingIdx + 500);
      console.log('\nContext around "funding":');
      console.log(ctx.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    }
  }
}

main().catch(e => console.error(e));
