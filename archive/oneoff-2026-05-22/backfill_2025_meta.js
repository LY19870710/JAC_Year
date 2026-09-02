/**
 * backfill_2025_meta.js — 补全 2025 年（Volume 14）文章的元数据
 * 数据来源：sciopen.com/article/{doi} HTML 页面
 * 
 * 抓取字段：abstract, keywords, received_date, accepted_date, published_date
 * 
 * 用法：node backfill_2025_meta.js [--batch N] [--delay MS] [--dry-run]
 */

const https = require('https');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = 'E:\\Claw\\JAC_Year\\jac_articles.db';
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch'))?.split('=')[1] || '20');
const DELAY_MS = parseInt(process.argv.find(a => a.startsWith('--delay'))?.split('=')[1] || '3000');
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location || url).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// Parse sciopen HTML to extract metadata
// ============================================================
function parseSciopenHTML(html, doi) {
  const result = {
    abstract: '',
    keywords: '',
    received_date: '',
    accepted_date: '',
    published_date: ''
  };

  // 1. Main article JSON (in script tag, starts with fullTextInfo or similar)
  // Pattern: find "receivedTime" and parse the surrounding JSON
  const mainScriptMatch = html.match(/<script>([\s\S]*?)<\/script>/g);
  if (mainScriptMatch) {
    for (const script of mainScriptMatch) {
      if (script.includes('"receivedTime"') && script.includes('"abstraction"')) {
        // Extract key fields using regex
        const receivedTime = script.match(/"receivedTime"\s*:\s*"([^"]+)"/);
        const acceptedTime = script.match(/"acceptedTime"\s*:\s*"([^"]+)"/);
        const pubTime = script.match(/"pubTime"\s*:\s*"([^"]+)"/);
        const citationDate = script.match(/"citationDate"\s*:\s*"([^"]+)"/);
        
        // abstraction can span multiple lines, find it carefully
        const absMatch = script.match(/"abstraction"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        
        if (receivedTime) result.received_date = receivedTime[1].substring(0, 10);
        if (acceptedTime) result.accepted_date = acceptedTime[1].substring(0, 10);
        if (pubTime) result.published_date = pubTime[1].substring(0, 10);
        if (citationDate && !result.published_date) result.published_date = citationDate[1];
        
        if (absMatch) {
          let abs = absMatch[1];
          // Decode HTML entities
          abs = abs.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          // Decode actual HTML entities
          abs = abs.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
                   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
          result.abstract = abs;
        }
        break;
      }
    }
  }

  // 2. articleKeyword script block (separate script tag)
  for (const script of mainScriptMatch || []) {
    if (script.includes('articleKeyword') && script.includes('keywordName')) {
      const keywordMatches = script.matchAll(/"keywordName"\s*:\s*"([^"]+)"/g);
      const keywords = [...keywordMatches].map(m => m[1]);
      result.keywords = keywords.join(', ');
      break;
    }
  }

  // 3. Fallback: <meta name="keywords">
  if (!result.keywords) {
    const metaKeywords = html.match(/<meta name="keywords" content="([^"]*)"/);
    if (metaKeywords) result.keywords = metaKeywords[1];
  }

  return result;
}

// ============================================================
async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // Find articles missing metadata (Volume 14 = 2025)
  // Also check Volume 13 articles that may be missing abstract
  const result = db.exec(`
    SELECT doi FROM articles
    WHERE (abstract IS NULL OR abstract = '' OR keywords IS NULL OR keywords = '')
    ORDER BY doi
    LIMIT ${BATCH_SIZE}
  `);

  if (!result.length || !result[0]?.values?.length) {
    console.log('No articles need backfilling. All done!');
    db.close();
    return;
  }

  const dois = result[0].values.map(r => r[0]);
  console.log(`Found ${dois.length} articles needing metadata.\n`);

  let success = 0;
  let withAbstract = 0;
  let withKeywords = 0;
  let withDates = 0;

  for (let i = 0; i < dois.length; i++) {
    const doi = dois[i];
    const url = 'https://www.sciopen.com/article/' + doi;
    console.log(`[${i + 1}/${dois.length}] ${doi}`);

    try {
      const { status, data } = await httpsGet(url);
      
      if (status !== 200 || !data.includes('abstraction')) {
        console.log(`  [WARN] Failed to fetch: HTTP ${status}`);
        if (status === 404) console.log('  [INFO] Article not found on sciopen (may not be published yet)');
        await sleep(DELAY_MS);
        continue;
      }

      const meta = parseSciopenHTML(data, doi);
      
      console.log(`  abstract: ${meta.abstract ? meta.abstract.substring(0, 60) + '...' : '(empty)'}`);
      console.log(`  keywords: ${meta.keywords || '(empty)'}`);
      console.log(`  dates: received=${meta.received_date} accepted=${meta.accepted_date} published=${meta.published_date}`);

      if (!DRY_RUN) {
        const stmts = [];
        if (meta.abstract) stmts.push(`UPDATE articles SET abstract = ? WHERE doi = ?`);
        if (meta.keywords) stmts.push(`UPDATE articles SET keywords = ? WHERE doi = ?`);
        if (meta.received_date) stmts.push(`UPDATE articles SET received_date = ? WHERE doi = ?`);
        if (meta.accepted_date) stmts.push(`UPDATE articles SET accepted_date = ? WHERE doi = ?`);
        if (meta.published_date) stmts.push(`UPDATE articles SET published_date = ? WHERE doi = ?`);

        if (stmts.length > 0) {
          const params = [];
          if (meta.abstract) params.push([meta.abstract, doi]);
          if (meta.keywords) params.push([meta.keywords, doi]);
          if (meta.received_date) params.push([meta.received_date, doi]);
          if (meta.accepted_date) params.push([meta.accepted_date, doi]);
          if (meta.published_date) params.push([meta.published_date, doi]);
          
          params.forEach(p => {
            db.run(stmts[params.indexOf(p)].replace('?', '?'), p);
          });
          
          fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
        }
      }

      if (meta.abstract) withAbstract++;
      if (meta.keywords) withKeywords++;
      if (meta.received_date) withDates++;
      success++;

    } catch (e) {
      console.log(`  [ERROR] ${e.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Processed: ${success}/${dois.length}`);
  console.log(`With abstract: ${withAbstract}, keywords: ${withKeywords}, dates: ${withDates}`);
  
  if (!DRY_RUN) {
    // Quick stats
    const stats = db.exec(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN abstract IS NOT NULL AND abstract != '' THEN 1 ELSE 0 END) as with_abstract,
        SUM(CASE WHEN keywords IS NOT NULL AND keywords != '' THEN 1 ELSE 0 END) as with_keywords,
        SUM(CASE WHEN received_date IS NOT NULL AND received_date != '' THEN 1 ELSE 0 END) as with_received
      FROM articles
    `);
    if (stats[0]) {
      const row = stats[0].values[0];
      console.log(`\nOverall stats (${row[0]} articles):`);
      console.log(`  abstract: ${row[1]}, keywords: ${row[2]}, received_date: ${row[3]}`);
    }
  }

  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
