const initSqlJs = require('sql.js');
const fs = require('fs');
const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/json',
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
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('jac_articles.db'));
  
  // Check: what was the funding data that was saved previously?
  // Maybe it was saved from the original scrape
  const r = db.exec(`SELECT doi, funding FROM articles WHERE year=2024 AND funding IS NOT NULL AND funding != '' LIMIT 3`);
  
  if (!r.length) {
    console.log('No articles with funding');
    db.close();
    return;
  }
  
  // Try fetching full HTML instead of JSON
  for (const row of r[0].values) {
    const doi = row[0];
    const dbFunding = row[1];
    
    console.log(`\n=== ${doi} ===`);
    console.log(`DB (${dbFunding.length} chars): ${dbFunding.substring(0, 200)}`);
    
    // Try the article page instead of full_text API
    const pageUrl = `https://www.sciopen.com/article/${doi}`;
    try {
      const html = await httpsGet(pageUrl);
      
      // Look for funding keywords in HTML
      const patterns = [
        /funding.*?[:\-]([^<]{50,500})/i,
        /acknowledgment[^<]{0,200}(?:National|Foundation|grant)[^<]{50,500}/i,
        /<p[^>]*>(?:This work|This study|This paper)[^<]{0,300}(?:National|Foundation|supported)[^<]{50,500}/i,
      ];
      
      let found = false;
      for (const p of patterns) {
        const match = html.match(p);
        if (match) {
          console.log(`Pattern match: ${match[0].substring(0, 200)}`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        // Check if page requires login
        if (html.includes('login') || html.includes('sign in') || html.includes('subscription')) {
          console.log('Page requires login');
        } else {
          console.log('No funding found in HTML');
          // Show snippet around "funding"
          const idx = html.toLowerCase().indexOf('funding');
          if (idx >= 0) {
            console.log(`Context: ${html.substring(Math.max(0, idx-50), idx+200)}`);
          }
        }
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  db.close();
}

main().catch(e => console.error(e));
