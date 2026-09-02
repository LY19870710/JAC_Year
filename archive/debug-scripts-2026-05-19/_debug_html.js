const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
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
  // Test with a DOI that has funding in DB
  const doi = '10.26599/JAC.2024.9220831';
  const pageUrl = `https://www.sciopen.com/article/${doi}`;
  
  console.log('Fetching:', pageUrl);
  const html = await httpsGet(pageUrl);
  
  console.log('HTML length:', html.length);
  
  // Search for funding section
  const patterns = [
    /Funding[\s\S]{0,50}(?:<[^>]+>){1,3}[\s\S]{100,2000}/i,
    /<section[^>]*id=["']funding["^][\s\S]{100,2000}/i,
    /acknowledge[A-Za-z\s]{0,20}(?:<[^>]+>){0,5}(?:<p[^>]*>){1}[\s\S]{100,1000}/i,
  ];
  
  for (const p of patterns) {
    const match = html.match(p);
    if (match) {
      console.log('\nPattern matched!');
      console.log(match[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 500));
      break;
    }
  }
  
  // Try to find the "Funding" section in the page
  const fundingIdx = html.indexOf('Funding');
  if (fundingIdx >= 0) {
    console.log('\n--- Funding section found at index', fundingIdx, '---');
    console.log(html.substring(fundingIdx, fundingIdx + 2000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  } else {
    console.log('No "Funding" text found in HTML');
  }
  
  // Check page title to see if it redirected or requires login
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  console.log('Page title:', titleMatch ? titleMatch[1] : 'not found');
  
  // Check if requires login
  if (html.includes('login') || html.includes('Sign in') || html.includes('Please log in')) {
    console.log('⚠️ Page requires login/subscription');
  }
}

main().catch(e => console.error(e));
