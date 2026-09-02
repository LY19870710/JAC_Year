// Re-process all articles with improved funding extraction
const fs = require('fs');
const https = require('https');

const DB_PATH = 'E:\\Claw\\JAC_Year\\jac_articles.db';

// ---- Improved extractPureFunding ----
function extractPureFunding(raw) {
  if (!raw || raw.trim().length < 10) return '';
  
  const paragraphs = raw.split(/(?:<\/?p>|\\n|\r?\n)+/).map(s => s.trim()).filter(Boolean);
  const results = [];
  
  const PREFIX_PATTERNS = [
    [/^this\s*work\s*was\s*financially\s*supported\s+by\s+/i, ''],
    [/^this\s*work\s*was\s+supported\s+by\s+/i, ''],
    [/^this\s*work\s*has\s*been\s+supported\s+by\s+/i, ''],
    [/^this\s*work\s*is\s+(?:also\s+)?supported\s+by\s+/i, ''],
    [/^this\s*work\s+(?:was\s+)?sponsored\s+by\s+/i, ''],
    [/^the\s*work\s+(?:conducted\s+at\s+\w+\s+)?(?:was\s+)?(?:also\s+)?supported\s+by\s+/i, ''],
    [/^the\s*work\s+was\s+supported\s+by\s+/i, ''],
    [/^this\s*study\s+was\s+supported\s+by\s+/i, ''],
    [/^this\s*study\s+(?:has\s*been\s+)?supported\s+by\s+/i, ''],
    [/^this\s*research\s+was\s+supported\s+by\s+/i, ''],
    [/^this\s*research\s+(?:has\s*been\s+)?supported\s+by\s+/i, ''],
    [/^this\s*research\s+(?:is\s+)?(?:also\s+)?sponsored\s+by\s+/i, ''],
    [/^this\s*research\s+sponsored\s+by\s+/i, ''],
    [/^this\s*project\s+was\s+supported\s+by\s+/i, ''],
    [/^this\s*project\s+(?:has\s*been\s+)?supported\s+by\s+/i, ''],
    [/^the\s+authors?\s+(?:thank|acknowledge)[^.]*?by\s+/i, ''],
    [/^we\s+(?:thank|acknowledge)[^.]*?by\s+/i, ''],
    [/^funding:\s*/i, ''],
    [/^acknowledgements?:\s*/i, ''],
    [/^also\s+/i, ''],
    [/^additionally\s+/i, ''],
    [/^furthermore\s+/i, ''],
  ];
  
  const FUND_AGENCIES = [
    'national natural science foundation', 'nsfc',
    'national key r&d program', 'key r&d program',
    'chinese academy of sciences', 'cas',
    'science and technology commission',
    'innovation program', 'postdoctoral science foundation',
    'young scholars', 'fundamental research',
    'provincial natural science foundation',
    'national research foundation',
    'us department of energy', 'doe',
    'european research council', 'erc',
    'deutsche forschungsgemeinschaft', 'dfg',
    'jsps kakenhi', 'jsps',
    'national science foundation',
  ];
  
  const SKIP_STARTWORDS = [
    'author contributions', 'conflict of interest', 'data availability',
    'supplementary', 'appendix', 'reference', 'doi:', 'copyright',
    'received:', 'accepted:', 'published:', 'corresponding author',
  ];
  
  for (const para of paragraphs) {
    let cleaned = para.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length < 15) continue;
    
    const lower = cleaned.toLowerCase();
    if (SKIP_STARTWORDS.some(w => lower.startsWith(w))) continue;
    
    let changed = true;
    while (changed) {
      changed = false;
      for (const [pat, replacement] of PREFIX_PATTERNS) {
        const before = cleaned;
        cleaned = cleaned.replace(pat, replacement).trim();
        if (cleaned !== before) { changed = true; break; }
      }
    }
    
    if (cleaned.length < 10) continue;
    cleaned = cleaned.replace(/^[\.,:\-\u2014\u2013;\s]+/, '').trim();
    cleaned = cleaned.replace(/[.;]+$/, '').trim();
    if (cleaned.length < 10) continue;
    
    const lower2 = cleaned.toLowerCase();
    if (FUND_AGENCIES.some(a => lower2.includes(a))) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      results.push(cleaned);
    }
  }
  
  return results.join('\n');
}

// ---- HTTP helpers ----
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---- Fetch funding raw ----
async function fetchFundingRaw(doi) {
  try {
    const html = await httpsGet(`https://www.sciopen.com/article/${doi}`);
    const ackMatch = html.match(/"acknowledgement"\s*:\s*"([^"]+)"/);
    if (ackMatch && ackMatch[1].length > 10) {
      return ackMatch[1]
        .replace(/\\\//g, '/')
        .replace(/\\n/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/<\/?p>/g, '');
    }
  } catch (e) { /* skip */ }
  return '';
}

// ---- Main ----
async function main() {
  const SQLMod = require('sql.js');
  const SQL = await SQLMod();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  
  // Get all articles with existing funding
  const result = db.exec('SELECT doi, funding FROM articles ORDER BY doi');
  if (!result.length || !result[0].values.length) {
    console.log('No articles found');
    return;
  }
  
  const articles = result[0].values;
  console.log(`Found ${articles.length} articles to re-process\n`);
  
  let updated = 0;
  
  for (let i = 0; i < articles.length; i++) {
    const [doi, oldFunding] = articles[i];
    console.log(`[${i + 1}/${articles.length}] ${doi}`);
    
    // Fetch fresh acknowledgement
    const rawAck = await fetchFundingRaw(doi);
    
    if (rawAck && rawAck.length > 10) {
      const newFunding = extractPureFunding(rawAck);
      if (newFunding && newFunding !== oldFunding) {
        console.log(`  BEFORE: ${(oldFunding || '(empty)').substring(0, 60)}...`);
        console.log(`  AFTER:  ${newFunding.substring(0, 60)}...`);
        db.run('UPDATE articles SET funding = ? WHERE doi = ?', [newFunding, doi]);
        const exportData = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(exportData));
        updated++;
      }
    }
    
    if (i < articles.length - 1) await sleep(1500);
  }
  
  db.close();
  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}/${articles.length}`);
}

main().catch(console.error);
