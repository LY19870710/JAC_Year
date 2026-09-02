const https = require('https');

const doi = '10.26599/JAC.2025.9221180';
https.get(`https://www.sciopen.com/article/${doi}`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Find the detailed author data with type field
    // Pattern: "id":"...","name":"...","email":"...","type":1/2
    const typeIdx = data.indexOf('"type":1');
    if (typeIdx === -1) { console.log('No type:1 found'); return; }
    
    // Find the start of the authors array containing this
    let searchStart = Math.max(0, typeIdx - 2000);
    let arrStart = data.lastIndexOf('[', typeIdx);
    while (arrStart > searchStart) {
      // Check if this looks like the right array
      const snippet = data.substring(arrStart, typeIdx + 50);
      if (snippet.includes('"email"') && snippet.includes('"type"')) {
        break;
      }
      arrStart = data.lastIndexOf('[', arrStart - 1);
    }
    
    // Find the end
    let depth = 0;
    let arrEnd = arrStart;
    for (let i = arrStart; i < data.length; i++) {
      if (data[i] === '[') depth++;
      if (data[i] === ']') depth--;
      if (depth === 0) { arrEnd = i + 1; break; }
    }
    
    let jsonStr = data.substring(arrStart, arrEnd);
    // Clean HTML tags from name fields
    jsonStr = jsonStr.replace(/<a[^>]*>/g, '').replace(/<\/a>/g, '');
    jsonStr = jsonStr.replace(/<sup>/g, '').replace(/<\/sup>/g, '');
    jsonStr = jsonStr.replace(/<label>/g, '').replace(/<\/label>/g, '');
    jsonStr = jsonStr.replace(/&amp;/g, '&');
    
    try {
      const authors = JSON.parse(jsonStr);
      console.log(`Authors parsed: ${authors.length}`);
      
      const corresponding = authors.filter(a => a.type === 1);
      const regular = authors.filter(a => a.type === 2);
      
      console.log(`\nCorresponding (type=1): ${corresponding.length}`);
      corresponding.forEach(a => {
        const name = (a.name || '').replace(/<[^>]*>/g, '').trim();
        console.log(`  ${name} | ${a.email || 'no email'} | id=${a.id || 'null'}`);
      });
      
      console.log(`\nRegular (type=2): ${regular.length}`);
      regular.slice(0, 5).forEach(a => {
        const name = (a.name || '').replace(/<[^>]*>/g, '').trim();
        console.log(`  ${name} | ${a.email || 'no email'}`);
      });
      if (regular.length > 5) console.log(`  ... and ${regular.length - 5} more`);
      
    } catch (e) {
      console.log('Parse error:', e.message);
      console.log('JSON (first 300):', jsonStr.substring(0, 300));
    }
  });
}).on('error', e => console.error(e.message));
