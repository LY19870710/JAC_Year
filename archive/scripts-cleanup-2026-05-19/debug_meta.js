const https = require('https');
const doi = '10.26599/JAC.2025.9221180';

// Try the main page API to get article metadata (which may include corresponding author)
const metaUrl = `https://www.sciopen.com/article/get_article_detail?doi=${encodeURIComponent(doi)}`;

https.get(metaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('get_article_detail response (first 3000):');
    console.log(data.substring(0, 3000));
  });
}).on('error', e => console.error('Error:', e.message));
