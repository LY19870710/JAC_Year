const https = require('https');
const doi = '10.26599/JAC.2025.9221180';
const pageUrl = `https://www.sciopen.com/article/${doi}`;

https.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Find article object in HTML
    const articleMatch = data.match(/article\s*[:=]\s*(\{[\s\S]*?\})\s*[,\n}]/);
    if (articleMatch) {
      try {
        // Try to extract the acknowledgement field
        const ackMatch = data.match(/"acknowledgement"\s*:\s*"([^"]+)"/);
        if (ackMatch) {
          console.log('=== acknowledgement (from HTML) ===');
          // Unescape the string
          const ack = ackMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
          console.log(ack.substring(0, 800));
        } else {
          // Try another pattern
          const ackMatch2 = data.match(/'acknowledgement'\s*:\s*'([^']+)'/);
          if (ackMatch2) {
            console.log('=== acknowledgement (single quote) ===');
            console.log(ackMatch2[1].substring(0, 800));
          } else {
            console.log('No acknowledgement found in HTML');
            // Try to find it in window.__NUXT__ or similar
            const nuxtMatch = data.match(/window\.__NUXT__\s*=\s*(\{[\s\S]{0,5000}?)\s*;/);
            if (nuxtMatch) {
              console.log('\n=== window.__NUXT__ snippet ===');
              console.log(nuxtMatch[1].substring(0, 1000));
            }
          }
        }
      } catch (e) {
        console.error('Error:', e.message);
      }
    } else {
      console.log('No article object found');
    }
  });
}).on('error', e => console.error('Error:', e.message));
