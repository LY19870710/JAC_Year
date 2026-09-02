const https = require('https');
// Try a 2024 article that might have funding
const dois = [
  '10.26599/JAC.2024.9220997',
  '10.26599/JAC.2025.9221180',
  '10.26599/JAC.2025.9221200',
  '10.26599/JAC.2025.9221250',
];

function fetchOne(doi) {
  return new Promise((resolve) => {
    const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const obj = json.object || json;
          const str = JSON.stringify(obj);
          
          // Find all occurrences of fund/Fund/acknowledg/NSFC/supported
          const matches = [];
          const patterns = [/fund/gi, /acknowledg/gi, /NSFC/gi, /supported by/gi, /National Natural/gi, /No\.?\s*\d+/g];
          for (const pat of patterns) {
            let m;
            while ((m = pat.exec(str)) !== null) {
              const context = str.substring(Math.max(0, m.index - 60), m.index + 120);
              // Filter out JS code matches
              if (!context.includes('fundingStatements') && !context.includes('treeDataO') && !context.includes('fullTextInfo')) {
                matches.push({ pattern: m[0], context });
              }
            }
          }
          
          resolve({ doi, matches, hasFund: obj.fundingStatements?.length > 0, hasBio: obj.bio?.length > 0, hasFn: obj.fn?.length > 0 });
        } catch (e) {
          resolve({ doi, error: e.message });
        }
      });
    }).on('error', e => resolve({ doi, error: e.message }));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  for (const doi of dois) {
    const result = await fetchOne(doi);
    console.log(`\n${doi}:`);
    if (result.error) { console.log('  Error:', result.error); continue; }
    console.log(`  fundingStatements: ${result.hasFund}, bio: ${result.hasBio}, fn: ${result.hasFn}`);
    if (result.matches.length > 0) {
      console.log(`  Matches (${result.matches.length}):`);
      result.matches.forEach(m => console.log(`    [${m.pattern}] ${m.context}`));
    } else {
      console.log('  No funding-related text found');
    }
    await sleep(1500);
  }
}

main();
