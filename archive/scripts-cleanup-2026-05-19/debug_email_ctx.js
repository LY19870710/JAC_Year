const https = require('https');
const doi = '10.26599/JAC.2025.9221180'; // known to have funding

https.get(`https://www.sciopen.com/article/${doi}`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Find email context - look for corresponding author markers near emails
    const emailPat = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let m;
    while ((m = emailPat.exec(data)) !== null) {
      const email = m[0];
      if (email.includes('sciopen.com') || email.includes('baidu.com') || email.includes('wqketang')) continue;
      const start = Math.max(0, m.index - 200);
      const end = Math.min(data.length, m.index + email.length + 200);
      const context = data.substring(start, end);
      console.log(`\n=== ${email} ===`);
      console.log(context.replace(/</g, '\n<'));
      console.log('---');
    }
  });
}).on('error', e => console.error(e.message));
