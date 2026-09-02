const https = require('https');
const doi = '10.26599/JAC.2025.9221180';
const pageUrl = `https://www.sciopen.com/article/${doi}`;

https.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Search for corresponding author / email in the HTML
    const patterns = [
      /corresponding[_-]?author/gi,
      /corrEmail/gi,
      /authorEmail/gi,
      /articleInfo/gi,
      /window\.__NUXT__/gi,
      /window\.__INITIAL_STATE__/gi,
      /articleDetail/gi,
    ];
    
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(data)) !== null) {
        console.log(`\n=== ${m[0]} at ${m.index} ===`);
        console.log(data.substring(Math.max(0, m.index - 50), m.index + 500));
      }
    }
    
    // Also check for email pattern in HTML
    const emailPat = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let emailMatches = new Set();
    let em;
    while ((em = emailPat.exec(data)) !== null) {
      if (!em[0].includes('sciopen.com') && !em[0].includes('baidu.com') && !em[0].includes('wqketang')) {
        emailMatches.add(em[0]);
      }
    }
    if (emailMatches.size > 0) {
      console.log('\n=== Emails found ===');
      emailMatches.forEach(e => console.log(e));
    } else {
      console.log('\nNo author emails found in HTML');
    }
  });
}).on('error', e => console.error('Error:', e.message));
